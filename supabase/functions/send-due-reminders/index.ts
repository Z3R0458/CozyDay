import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const adminToken = Deno.env.get('REMINDER_CRON_TOKEN')
const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173'
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || `mailto:admin@${new URL(siteUrl).hostname}`
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

type ClaimedReminder = {
  reminder_id: string
  user_id: string
  task_id: string
  task_title: string
  scheduled_at: string
  attempts: number
}

async function markReminder(reminderId: string, status: 'sent' | 'failed', error?: string) {
  const payload =
    status === 'sent'
      ? { status, sent_at: new Date().toISOString(), last_error: null }
      : { status, last_error: error?.slice(0, 500) || 'Delivery failed' }
  await supabase.from('task_reminders').update(payload).eq('id', reminderId)
}

async function logDelivery(input: {
  reminder: ClaimedReminder
  subscriptionId: string
  status: 'sent' | 'failed' | 'removed'
  httpStatus?: number
  error?: string
}) {
  await supabase.from('push_delivery_logs').insert({
    user_id: input.reminder.user_id,
    task_id: input.reminder.task_id,
    reminder_id: input.reminder.reminder_id,
    subscription_id: input.subscriptionId,
    status: input.status,
    http_status: input.httpStatus,
    error: input.error?.slice(0, 500),
  })
}

Deno.serve(async (request) => {
  if (adminToken && request.headers.get('x-reminder-token') !== adminToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { data: reminders, error: claimError } = await supabase.rpc('claim_due_task_reminders', { batch_size: 50 })
  if (claimError) {
    return new Response(JSON.stringify({ error: claimError.message }), { status: 500 })
  }

  const results = []

  for (const reminder of (reminders || []) as ClaimedReminder[]) {
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', reminder.user_id)
      .eq('enabled', true)

    if (subscriptionError) {
      await markReminder(reminder.reminder_id, 'failed', subscriptionError.message)
      results.push({ reminder_id: reminder.reminder_id, ok: false, error: subscriptionError.message })
      continue
    }

    if (!subscriptions?.length) {
      await markReminder(reminder.reminder_id, 'failed', 'No active push subscriptions')
      results.push({ reminder_id: reminder.reminder_id, ok: false, error: 'No active subscriptions' })
      continue
    }

    let sentCount = 0
    const payload = JSON.stringify({
      title: 'CozyDay reminder',
      body: reminder.task_title,
      taskId: reminder.task_id,
      url: `${siteUrl.replace(/\/$/, '')}/tasks?task=${reminder.task_id}`,
      scheduledAt: reminder.scheduled_at,
    })

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload,
        )
        sentCount += 1
        await supabase
          .from('push_subscriptions')
          .update({ last_success_at: new Date().toISOString(), failure_count: 0 })
          .eq('id', subscription.id)
        await logDelivery({ reminder, subscriptionId: subscription.id, status: 'sent' })
      } catch (error) {
        const statusCode = error?.statusCode || error?.status
        const message = error?.body || error?.message || 'Push delivery failed'
        const invalid = statusCode === 404 || statusCode === 410
        await supabase
          .from('push_subscriptions')
          .update({
            enabled: invalid ? false : true,
            disabled_at: invalid ? new Date().toISOString() : null,
            last_failure_at: new Date().toISOString(),
            failure_count: invalid ? 99 : 1,
          })
          .eq('id', subscription.id)
        await logDelivery({
          reminder,
          subscriptionId: subscription.id,
          status: invalid ? 'removed' : 'failed',
          httpStatus: statusCode,
          error: message,
        })
      }
    }

    if (sentCount > 0) {
      await markReminder(reminder.reminder_id, 'sent')
      results.push({ reminder_id: reminder.reminder_id, ok: true, sent: sentCount })
    } else {
      await markReminder(reminder.reminder_id, 'failed', 'All subscriptions failed')
      results.push({ reminder_id: reminder.reminder_id, ok: false, error: 'All subscriptions failed' })
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { 'content-type': 'application/json' },
  })
})
