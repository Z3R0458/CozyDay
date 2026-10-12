alter table public.tasks
add column if not exists reminder_preset_minutes integer;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disabled_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_count integer not null default 0
);

create table if not exists public.task_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'processing', 'sent', 'failed', 'cancelled')),
  attempts integer not null default 0,
  claimed_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id)
);

create table if not exists public.push_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  reminder_id uuid references public.task_reminders(id) on delete set null,
  subscription_id uuid references public.push_subscriptions(id) on delete set null,
  status text not null check (status in ('sent', 'failed', 'removed')),
  http_status integer,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id) where enabled = true;
create index if not exists task_reminders_due_idx on public.task_reminders(status, scheduled_at);
create index if not exists task_reminders_user_idx on public.task_reminders(user_id, scheduled_at);
create index if not exists push_delivery_logs_reminder_idx on public.push_delivery_logs(reminder_id, created_at desc);

alter table public.push_subscriptions enable row level security;
alter table public.task_reminders enable row level security;
alter table public.push_delivery_logs enable row level security;

drop policy if exists "push subscriptions are private" on public.push_subscriptions;
create policy "push subscriptions are private"
on public.push_subscriptions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "task reminders are private" on public.task_reminders;
create policy "task reminders are private"
on public.task_reminders for select
using (auth.uid() = user_id);

drop policy if exists "delivery logs are private" on public.push_delivery_logs;
create policy "delivery logs are private"
on public.push_delivery_logs for select
using (auth.uid() = user_id);

drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at before update on public.push_subscriptions for each row execute function public.set_updated_at();

drop trigger if exists task_reminders_set_updated_at on public.task_reminders;
create trigger task_reminders_set_updated_at before update on public.task_reminders for each row execute function public.set_updated_at();

create or replace function public.sync_task_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.reminder_at is null or new.status = 'Completed' then
    update public.task_reminders
      set status = 'cancelled', updated_at = now()
      where task_id = new.id and status in ('scheduled', 'processing', 'failed');
    return new;
  end if;

  insert into public.task_reminders (user_id, task_id, scheduled_at, status, attempts, claimed_at, sent_at, last_error)
  values (new.user_id, new.id, new.reminder_at, 'scheduled', 0, null, null, null)
  on conflict (task_id) do update
    set scheduled_at = excluded.scheduled_at,
        user_id = excluded.user_id,
        status = 'scheduled',
        attempts = 0,
        claimed_at = null,
        sent_at = null,
        last_error = null,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists tasks_sync_reminder on public.tasks;
create trigger tasks_sync_reminder
after insert or update of reminder_at, status on public.tasks
for each row execute function public.sync_task_reminder();

create or replace function public.claim_due_task_reminders(batch_size integer default 50)
returns table (
  reminder_id uuid,
  user_id uuid,
  task_id uuid,
  task_title text,
  scheduled_at timestamptz,
  attempts integer
)
language sql
security definer
set search_path = public
as $$
  with due as (
    select r.id
    from public.task_reminders r
    join public.tasks t on t.id = r.task_id
    where r.status in ('scheduled', 'failed')
      and r.scheduled_at <= now()
      and r.attempts < 5
      and t.status <> 'Completed'
    order by r.scheduled_at asc
    limit batch_size
    for update skip locked
  ),
  claimed as (
    update public.task_reminders r
      set status = 'processing',
          claimed_at = now(),
          attempts = r.attempts + 1,
          updated_at = now()
      from due
      where r.id = due.id
      returning r.id, r.user_id, r.task_id, r.scheduled_at, r.attempts
  )
  select c.id as reminder_id,
         c.user_id,
         c.task_id,
         t.title as task_title,
         c.scheduled_at,
         c.attempts
  from claimed c
  join public.tasks t on t.id = c.task_id;
$$;

insert into public.task_reminders (user_id, task_id, scheduled_at, status)
select user_id, id, reminder_at, 'scheduled'
from public.tasks
where reminder_at is not null and status <> 'Completed'
on conflict (task_id) do update
  set scheduled_at = excluded.scheduled_at,
      status = 'scheduled',
      updated_at = now();
