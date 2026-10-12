import { useCallback, useEffect, useState } from 'react'
import { Bell, BellRing, Send, ShieldCheck, ShieldX } from 'lucide-react'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import EmptyState from '../components/common/EmptyState'
import StatusMessage from '../components/common/StatusMessage'
import { useCozyData } from '../hooks/useCozyData'
import { useReminders } from '../hooks/useReminders'
import { disablePushNotifications, enablePushNotifications, getPushStatus, showTestNotification } from '../services/pushService'
import { formatDateTime } from '../utils/dates'

export default function RemindersPage() {
  const data = useCozyData()
  const preferences = data.notificationPreferences || {}
  const reminders = useReminders(data.tasks || [], preferences)
  const [pushStatus, setPushStatus] = useState({ permission: 'unknown', subscribed: false })
  const [pushMessage, setPushMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const refreshPushStatus = useCallback(async () => {
    try {
      setPushStatus(await getPushStatus())
    } catch (err) {
      setPushStatus({
        supported: false,
        permission: typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
        subscribed: false,
        unsupportedReason: err.message,
      })
    }
  }, [])

  useEffect(() => {
    refreshPushStatus()
  }, [refreshPushStatus])

  const runPushAction = async (action, successMessage) => {
    setBusy(true)
    setPushMessage('')
    try {
      const result = await action()
      if (result) setPushStatus(result)
      else await refreshPushStatus()
      setPushMessage(successMessage)
    } catch (err) {
      setPushMessage(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-3xl font-black">Reminders</h1>
        <p className="text-sm font-bold text-slate">Use in-app reminders while CozyDay is open, or enable Web Push for background delivery after Supabase Cron and VAPID secrets are configured.</p>
      </div>
      <Card className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <h2 className="text-xl font-black">In-app browser reminders</h2>
          <p className="text-sm font-bold text-slate">Permission: {reminders.permission}. These foreground reminders only run while CozyDay is open.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={reminders.requestPermission}><Bell size={18} /> Request permission</Button>
          <Button onClick={() => data.savePreferences({ ...preferences, browser_notifications: !preferences.browser_notifications, enabled: !preferences.browser_notifications })}>
            <BellRing size={18} /> {preferences.browser_notifications ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </Card>
      <Card className="grid gap-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-xl font-black">Background Web Push</h2>
            <p className="text-sm font-bold text-slate">
              Permission: {pushStatus.permission || 'unknown'} · This device: {pushStatus.subscribed ? 'subscribed' : 'not subscribed'} · Active devices: {pushStatus.deviceCount || 0}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy || !pushStatus.supported} onClick={() => runPushAction(enablePushNotifications, 'Push notifications enabled for this device.')}>
              <ShieldCheck size={18} /> Enable push
            </Button>
            <Button disabled={busy || !pushStatus.supported || !pushStatus.subscribed} variant="secondary" onClick={() => runPushAction(disablePushNotifications, 'Push notifications disabled for this device.')}>
              <ShieldX size={18} /> Disable
            </Button>
            <Button disabled={busy || !pushStatus.supported} variant="soft" onClick={() => runPushAction(showTestNotification, 'Test notification requested on this device.')}>
              <Send size={18} /> Test
            </Button>
          </div>
        </div>
        {pushStatus.unsupportedReason && <StatusMessage type="error">{pushStatus.unsupportedReason}</StatusMessage>}
        <StatusMessage type={pushMessage.includes('enabled') || pushMessage.includes('disabled') || pushMessage.includes('requested') ? 'success' : 'error'}>{pushMessage}</StatusMessage>
      </Card>
      {reminders.activeReminder && (
        <Card className="border-sky bg-mist">
          <h2 className="text-xl font-black">Reminder due</h2>
          <p className="font-bold">{reminders.activeReminder.title}</p>
          <Button className="mt-3" variant="secondary" onClick={() => reminders.setActiveReminder(null)}>Dismiss</Button>
        </Card>
      )}
      <section className="grid gap-3">
        <h2 className="text-xl font-black">Upcoming</h2>
        {reminders.upcoming.length ? reminders.upcoming.map((task) => (
          <Card key={task.id}>
            <p className="font-extrabold">{task.title}</p>
            <p className="text-sm font-bold text-slate">{formatDateTime(task.reminder_at)}</p>
          </Card>
        )) : <EmptyState title="No upcoming reminders">Set a reminder date on a task to see it here.</EmptyState>}
      </section>
      <section className="grid gap-3">
        <h2 className="text-xl font-black">Delivery status</h2>
        {(data.taskReminders || []).length ? (data.taskReminders || []).map((reminder) => (
          <Card key={reminder.id}>
            <p className="font-extrabold">{reminder.status}</p>
            <p className="text-sm font-bold text-slate">Scheduled {formatDateTime(reminder.scheduled_at)} · Attempts: {reminder.attempts}</p>
            {reminder.last_error && <p className="mt-2 text-sm font-bold text-red-600">{reminder.last_error}</p>}
          </Card>
        )) : <EmptyState title="No scheduled delivery rows">Reminder delivery rows appear after saving tasks with reminders.</EmptyState>}
      </section>
    </div>
  )
}
