self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: 'CozyDay reminder', body: event.data?.text() || 'A task reminder is due.' }
  }

  const title = payload.title || 'CozyDay reminder'
  const options = {
    body: payload.body || 'A task reminder is due.',
    tag: payload.taskId ? `cozyday-task-${payload.taskId}` : 'cozyday-reminder',
    renotify: false,
    data: {
      url: payload.url || '/',
      taskId: payload.taskId || null,
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      return self.clients.openWindow(targetUrl)
    }),
  )
})
