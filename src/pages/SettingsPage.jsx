import { useState } from 'react'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import { Field, inputClass } from '../components/common/Field'
import StatusMessage from '../components/common/StatusMessage'
import { useAuth } from '../hooks/useAuth'
import { useCozyData } from '../hooks/useCozyData'

export default function SettingsPage() {
  const { user, signOut, isConfigured } = useAuth()
  const data = useCozyData()
  const [profile, setProfile] = useState(data.profile || { display_name: '' })
  const [message, setMessage] = useState('')

  const save = async (event) => {
    event.preventDefault()
    await data.saveProfile(profile)
    setMessage('Settings saved.')
  }

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-3xl font-black">Settings</h1>
        <p className="text-sm font-bold text-slate">Account, notification, theme, and image retention information.</p>
      </div>
      <Card as="form" onSubmit={save} className="grid gap-4">
        <StatusMessage type="success">{message}</StatusMessage>
        <Field label="Email"><input className={inputClass} value={user?.email || ''} disabled /></Field>
        <Field label="Display name"><input className={inputClass} value={profile.display_name || ''} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} /></Field>
        <Field label="Theme"><select className={inputClass} disabled><option>Baby blue and navy</option></select></Field>
        <label className="flex min-h-11 items-center gap-2 font-extrabold">
          <input type="checkbox" checked={data.notificationPreferences?.browser_notifications || false} onChange={(e) => data.savePreferences({ ...(data.notificationPreferences || {}), browser_notifications: e.target.checked, enabled: e.target.checked })} />
          Browser notifications while app is open
        </label>
        <p className="rounded-2xl bg-butter/70 p-3 text-sm font-extrabold text-navy">
          Images are private and expire after 7 days by default. A scheduled Supabase Edge Function must be deployed to delete expired Storage objects when the app is closed.
        </p>
        {!isConfigured && <StatusMessage>Supabase is not configured, so this browser is using local demo storage.</StatusMessage>}
        <div className="flex flex-wrap gap-2"><Button type="submit">Save settings</Button><Button variant="secondary" onClick={signOut}>Logout</Button></div>
      </Card>
    </div>
  )
}
