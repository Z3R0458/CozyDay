import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Moon, Send } from 'lucide-react'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import { Field, inputClass } from '../components/common/Field'
import StatusMessage from '../components/common/StatusMessage'
import CloudPuppy from '../components/mascot/CloudPuppy'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const { user, signIn, signUp, resetPassword, authError, isConfigured } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', displayName: '' })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      if (mode === 'reset') {
        await resetPassword(form.email)
        setMessage('Password reset email sent if the account exists.')
      } else if (mode === 'signup') {
        await signUp(form.email, form.password, form.displayName)
        setMessage('Check your email if confirmation is enabled, then come back for a cozy session.')
      } else {
        await signIn(form.email, form.password)
      }
    } catch {
      setMessage('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="grid w-full max-w-5xl gap-8 overflow-hidden p-0 md:grid-cols-[1fr_1.1fr]">
        <section className="cloud-pattern grid content-center gap-6 bg-mist p-8 text-center">
          <div className="mx-auto flex items-center gap-2 text-3xl font-black text-navy">
            <Moon className="text-sky" />
            CozyDay
          </div>
          <CloudPuppy className="w-36" />
          <p className="mx-auto max-w-sm text-sm font-bold leading-6 text-slate">
            A private baby-blue planner for tasks, notes, reminders, and seven-day photo moments.
          </p>
        </section>
        <form onSubmit={submit} className="grid gap-5 p-6 sm:p-8">
          <div>
            <h1 className="text-3xl font-black text-navy">{mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset password' : 'Welcome back'}</h1>
            <p className="mt-2 text-sm font-bold text-slate">
              {isConfigured ? 'Your records are protected by Supabase Auth and RLS.' : 'Demo mode is active until Supabase env vars are configured.'}
            </p>
          </div>
          <StatusMessage type={authError ? 'error' : 'success'}>{authError || message}</StatusMessage>
          {mode === 'signup' && (
            <Field label="Display name">
              <input className={inputClass} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
            </Field>
          )}
          <Field label="Email">
            <input className={inputClass} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          {mode !== 'reset' && (
            <Field label="Password">
              <input className={inputClass} type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
          )}
          <Button type="submit" disabled={busy}>
            <Send size={18} /> {busy ? 'Working...' : mode === 'signup' ? 'Sign up' : mode === 'reset' ? 'Send reset email' : 'Log in'}
          </Button>
          <div className="flex flex-wrap gap-2 text-sm font-extrabold">
            <button type="button" className="text-navy underline" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>
              {mode === 'signup' ? 'I already have an account' : 'Create account'}
            </button>
            <button type="button" className="text-navy underline" onClick={() => setMode(mode === 'reset' ? 'login' : 'reset')}>
              {mode === 'reset' ? 'Back to login' : 'Forgot password?'}
            </button>
          </div>
        </form>
      </Card>
    </main>
  )
}
