// Cleanup worker for visitors upgrading from an older cached release.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('nya-shell-')).map((key) => caches.delete(key)))),
    self.registration.unregister(),
    self.clients.claim(),
  ]))
})
