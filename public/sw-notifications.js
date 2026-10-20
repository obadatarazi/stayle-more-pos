// Imported by the generated service worker (see VitePWA `workbox.importScripts`).
// Tapping a sync notification focuses an open POS window, or opens one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const scope = self.registration.scope
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => client.url.startsWith(scope))
      if (existing) return existing.focus()
      return self.clients.openWindow(scope)
    }),
  )
})
