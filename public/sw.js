const VERSION = 'nya-offline-v1'
const SHELL = `${VERSION}-shell`
const RUNTIME = `${VERSION}-runtime`
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('nya-') && ![SHELL, RUNTIME].includes(key)).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone(); caches.open(RUNTIME).then((cache) => cache.put('/', copy)); return response
    }).catch(async () => (await caches.match(request)) || (await caches.match('/')) || (await caches.match('/index.html'))))
    return
  }

  event.respondWith(caches.match(request).then((cached) => {
    const network = fetch(request).then((response) => {
      if (response.ok || response.type === 'opaque') caches.open(RUNTIME).then((cache) => cache.put(request, response.clone()))
      return response
    }).catch(() => cached)
    return cached || network
  }))
})
