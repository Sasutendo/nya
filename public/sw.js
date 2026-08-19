const VERSION = 'nya-offline-v2'
const SHELL = `${VERSION}-shell`
const RUNTIME = `${VERSION}-runtime`
const PUBLIC_DATA = `${VERSION}-public-data`
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg']

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

async function cacheStartupFiles() {
  const cache = await caches.open(SHELL)
  const response = await fetch('/index.html', { cache: 'reload' })
  if (!response.ok) throw new Error('The app shell could not be downloaded.')

  const html = await response.clone().text()
  await cache.put('/index.html', response.clone())
  await cache.put('/', response)

  const discovered = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => new URL(match[1], self.location.origin))
    .filter((url) => url.origin === self.location.origin && !url.pathname.startsWith('/api/'))
    .map((url) => `${url.pathname}${url.search}`)

  await Promise.allSettled([...new Set([...APP_SHELL, ...discovered])].map(async (path) => {
    const asset = await fetch(path, { cache: 'reload' })
    if (asset.ok) await cache.put(path, asset)
  }))
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheStartupFiles().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('nya-') && ![SHELL, RUNTIME, PUBLIC_DATA].includes(key)).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})

async function updateCache(cacheName, request, response) {
  if (response.ok || response.type === 'opaque') {
    const cache = await caches.open(cacheName)
    await cache.put(request, response.clone())
  }
  return response
}

async function fetchWithTimeout(request, timeout = 2_000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try { return await fetch(request, { signal: controller.signal }) }
  finally { clearTimeout(timer) }
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (url.pathname.startsWith('/api/public/')) {
    const network = fetchWithTimeout(request).then((response) => updateCache(PUBLIC_DATA, request, response))
    event.respondWith(network.catch(async () => {
      const cached = await caches.match(request)
      return cached || new Response(JSON.stringify({ error: 'This content is not available offline yet.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', 'X-Nya-Offline': 'true' },
      })
    }))
    return
  }

  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    const network = fetch(request).then((response) => updateCache(SHELL, '/index.html', response))
    event.waitUntil(network.catch(() => undefined))
    event.respondWith(caches.match('/index.html').then((cached) => cached || network).catch(() => caches.match('/')))
    return
  }

  const network = fetch(request).then((response) => updateCache(RUNTIME, request, response))
  event.waitUntil(network.catch(() => undefined))
  event.respondWith(caches.match(request).then((cached) => cached || network).catch(() => new Response('', { status: 504 })))
})
