import { isSupabaseConfigured, supabase } from '../lib/supabase'

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export function pushSupportStatus() {
  if (!window.isSecureContext) return 'Web Push requires HTTPS or localhost. Use HTTPS for phone and tablet testing.'
  if (!('serviceWorker' in navigator)) return 'Service workers are not supported in this browser.'
  if (!('PushManager' in window)) return 'Web Push is not supported in this browser.'
  if (!('Notification' in window)) return 'Notifications are not supported in this browser.'
  if (!vapidPublicKey) return 'Missing VITE_VAPID_PUBLIC_KEY.'
  if (!isSupabaseConfigured) return 'Supabase must be configured before push subscriptions can be saved.'
  return ''
}

async function getRegistration() {
  return navigator.serviceWorker.register('/sw.js')
}

export async function getPushStatus() {
  const unsupportedReason = pushSupportStatus()
  const permission = 'Notification' in window ? Notification.permission : 'unsupported'
  if (unsupportedReason) return { supported: false, permission, subscribed: false, unsupportedReason }

  const registration = await getRegistration()
  const subscription = await registration.pushManager.getSubscription()
  const { count } = await supabase
    .from('push_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('enabled', true)

  return {
    supported: true,
    permission,
    subscribed: Boolean(subscription),
    deviceCount: count || 0,
    endpoint: subscription?.endpoint || '',
  }
}

export async function enablePushNotifications() {
  const unsupportedReason = pushSupportStatus()
  if (unsupportedReason) throw new Error(unsupportedReason)

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission was not granted.')

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in to enable push notifications.')

  const registration = await getRegistration()
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  })
  const json = subscription.toJSON()

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent,
      enabled: true,
      disabled_at: null,
    },
    { onConflict: 'endpoint' },
  )
  if (error) throw error

  return getPushStatus()
}

export async function disablePushNotifications() {
  const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration('/sw.js') : null
  const subscription = registration ? await registration.pushManager.getSubscription() : null
  if (subscription && isSupabaseConfigured) {
    await supabase
      .from('push_subscriptions')
      .update({ enabled: false, disabled_at: new Date().toISOString() })
      .eq('endpoint', subscription.endpoint)
    await subscription.unsubscribe()
  }
  return getPushStatus()
}

export async function showTestNotification() {
  const unsupportedReason = pushSupportStatus()
  if (unsupportedReason) throw new Error(unsupportedReason)
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission was not granted.')
  const registration = await getRegistration()
  await registration.showNotification('CozyDay test notification', {
    body: 'If you can see this, this device can display CozyDay notifications.',
    tag: 'cozyday-test',
    data: { url: '/reminders' },
  })
}
