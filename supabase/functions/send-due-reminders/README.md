# Send Due Reminders Edge Function

This function sends real background Web Push notifications for due task reminders. It must be called by Supabase Cron or another trusted scheduler.

Required secrets:

```bash
supabase secrets set \
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  REMINDER_CRON_TOKEN=a-long-random-token \
  SITE_URL=https://your-vercel-domain.example \
  VAPID_SUBJECT=mailto:you@example.com \
  VAPID_PUBLIC_KEY=your-vapid-public-key \
  VAPID_PRIVATE_KEY=your-vapid-private-key
```

Deploy:

```bash
supabase functions deploy send-due-reminders
```

Cron example:

```sql
select cron.schedule(
  'cozyday-send-due-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://PROJECT_REF.functions.supabase.co/send-due-reminders',
    headers := jsonb_build_object('x-reminder-token', 'a-long-random-token')
  );
  $$
);
```

Do not expose `VAPID_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or `REMINDER_CRON_TOKEN` in frontend code.
