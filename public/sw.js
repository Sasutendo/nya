const VERSION = 'nya-offline-v3'
const SHELL = `${VERSION}-shell`
const RUNTIME = `${VERSION}-runtime`
const PUBLIC_DATA = `${VERSION}-public-data`
const INDEX = '/index.html'
const CORE_FILES = ['/manifest.webmanifest', '/icon.svg']

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

async function cacheStartupDocument(response) {
  if (!response.ok) throw new Error('The app shell could not be downloaded.')

  const html = await response.clone().text()
  const discovered = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => new URL(match[1], self.location.origin))
    .filter((url) => url.origin === self.location.origin && !url.pathname.startsWith('/api/'))
    .map((url) => `${url.pathname}${url.search}`)

  const downloads = await Promise.all([...new Set([...CORE_FILES, ...discovered])].map(async (path) => {
    const asset = await fetch(path, { cache: 'reload' })
    if (!asset.ok) throw new Error(`Required startup file failed: ${path}`)
    return [path, asset]
  }))

  const cache = await caches.open(SHELL)
  await Promise.all(downloads.map(([path, asset]) => cache.put(path, asset)))
  await cache.put(INDEX, response.clone())
  await cache.put('/', response.clone())
  return response
}

async function cacheStartupFiles() {
  const response = await fetch(INDEX, { cache: 'reload' })
  await cacheStartupDocument(response)
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
  const sameOrigin = url.origin === self.location.origin

  if (!sameOrigin) {
    if (!['http:', 'https:'].includes(url.protocol)) return
    const network = fetch(request).then((response) => updateCache(RUNTIME, request, response))
    event.waitUntil(network.catch(() => undefined))
    event.respondWith(caches.match(request).then((cached) => cached || network).catch(() => new Response('', { status: 504 })))
    return
  }

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
    const network = fetch(request).then(cacheStartupDocument)
    event.waitUntil(network.catch(() => undefined))
    event.respondWith(caches.match(INDEX).then((cached) => cached || network).catch(() => caches.match('/')))
    return
  }

  const network = fetch(request).then((response) => updateCache(RUNTIME, request, response))
  event.waitUntil(network.catch(() => undefined))
  event.respondWith(caches.match(request).then((cached) => cached || network).catch(() => new Response('', { status: 504 })))
})
