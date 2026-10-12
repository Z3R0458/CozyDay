create extension if not exists "pgcrypto";

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) <= 80),
  color text not null default '#E7F5FF',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  title text not null check (char_length(title) <= 220),
  description text,
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High', 'Urgent')),
  status text not null default 'Not Started' check (status in ('Not Started', 'In Progress', 'Completed')),
  start_at timestamptz,
  due_at timestamptz,
  reminder_at timestamptz,
  reminder_preset_minutes integer,
  recurrence_rule text,
  checklist jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  check (start_at is null or due_at is null or start_at <= due_at)
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  title text,
  body text,
  tags text[] not null default '{}',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (coalesce(char_length(title), 0) > 0 or coalesce(char_length(body), 0) > 0)
);

create table public.moments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  storage_path text not null unique,
  caption text,
  uploaded_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  deleted_at timestamptz,
  cleanup_attempts integer not null default 0,
  cleanup_error text
);

create table public.image_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  storage_path text not null unique,
  caption text,
  uploaded_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  deleted_at timestamptz,
  cleanup_attempts integer not null default 0,
  cleanup_error text
);

create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  browser_notifications boolean not null default false,
  reminder_minutes integer not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index categories_user_idx on public.categories(user_id);
create index tasks_user_due_idx on public.tasks(user_id, due_at);
create index tasks_user_status_idx on public.tasks(user_id, status);
create index notes_user_updated_idx on public.notes(user_id, updated_at desc);
create index moments_cleanup_idx on public.moments(expires_at) where deleted_at is null;
create index attachments_cleanup_idx on public.image_attachments(expires_at) where deleted_at is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger notes_set_updated_at before update on public.notes for each row execute function public.set_updated_at();
create trigger notification_preferences_set_updated_at before update on public.notification_preferences for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tasks enable row level security;
alter table public.notes enable row level security;
alter table public.moments enable row level security;
alter table public.image_attachments enable row level security;
alter table public.notification_preferences enable row level security;

create policy "profiles are private" on public.profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories are private" on public.categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tasks are private" on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes are private" on public.notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "moments are private" on public.moments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "attachments are private" on public.image_attachments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notification preferences are private" on public.notification_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cozyday-private-images', 'cozyday-private-images', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 8388608, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "users can read own image objects"
on storage.objects for select
using (bucket_id = 'cozyday-private-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users can upload own image objects"
on storage.objects for insert
with check (
  bucket_id = 'cozyday-private-images'
  and auth.uid()::text = (storage.foldername(name))[1]
  and lower((storage.extension(name))) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy "users can delete own image objects"
on storage.objects for delete
using (bucket_id = 'cozyday-private-images' and auth.uid()::text = (storage.foldername(name))[1]);
