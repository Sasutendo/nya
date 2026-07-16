interface Env {
  DB: D1Database
  MEDIA: R2Bucket
  ASSETS: Fetcher
  ADMIN_EMAIL: string
  ADMIN_PASSWORD_HASH: string
  SESSION_SECRET: string
}

interface ItemRow {
  id: string
  type: 'presentation' | 'note' | 'project'
  slug: string
  title: string
  excerpt: string
  category: string
  tags_json: string
  status: 'draft' | 'published'
  featured: number
  cover_image: string
  assets_json: string
  content_json: string
  view_count: number
  created_at: string
  updated_at: string
  published_at: string | null
}

interface MediaAsset {
  id: string
  name: string
  url: string
  kind: 'image' | 'video' | 'audio' | 'document' | 'file'
  mimeType: string
  size: number
}

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024
const SESSION_SECONDS = 7 * 24 * 60 * 60
const encoder = new TextEncoder()

function json(data: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders },
  })
}

function error(message: string, status = 400): Response {
  return json({ error: message }, status)
}

function parseJson<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T } catch { return fallback }
}

function mapItem(row: ItemRow, includePrivate = false, summary = false) {
  const content = structuredClone(parseJson<Record<string, unknown>>(row.content_json, {}))
  const kind = content.kind
  const slides = kind === 'presentation' && Array.isArray(content.slides) ? content.slides as Array<Record<string, unknown>> : []
  const body = typeof content.body === 'string' ? content.body : ''
  const slideCount = slides.length
  const readingMinutes = kind === 'note' || kind === 'project'
    ? Math.max(1, Math.ceil(body.trim().split(/\s+/).filter(Boolean).length / 210))
    : undefined
  if (!includePrivate) slides.forEach((slide) => { delete slide.speakerNotes })
  if (summary) {
    if (slides.length) content.slides = slides.slice(0, 1)
    if (kind === 'note') content.body = ''
    if (kind === 'project') { content.body = ''; content.goals = []; content.outcome = '' }
  }
  return {
    id: row.id,
    type: row.type,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    tags: parseJson<string[]>(row.tags_json, []),
    status: row.status,
    featured: Boolean(row.featured),
    coverImage: row.cover_image || '',
    assets: parseJson<MediaAsset[]>(row.assets_json || '[]', []),
    content,
    viewCount: row.view_count,
    slideCount,
    readingMinutes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at || undefined,
  }
}

function base64Url(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromHex(value: string): Uint8Array {
  if (!/^[a-f0-9]+$/i.test(value) || value.length % 2) return new Uint8Array()
  return new Uint8Array(value.match(/.{2}/g)!.map((byte) => Number.parseInt(byte, 16)))
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return base64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))))
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return difference === 0
}

async function makeSession(email: string, secret: string): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS
  const payload = base64Url(encoder.encode(`${email}|${expires}`))
  return `${payload}.${await hmac(payload, secret)}`
}

async function verifySession(request: Request, env: Env): Promise<string | null> {
  const cookie = request.headers.get('Cookie') || ''
  const token = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('nya_session='))?.slice(12)
  if (!token) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature || !constantTimeEqual(signature, await hmac(payload, env.SESSION_SECRET))) return null
  try {
    const normal = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normal.padEnd(Math.ceil(normal.length / 4) * 4, '=')
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(padded), (character) => character.charCodeAt(0)))
    const [email, expires] = decoded.split('|')
    if (email !== env.ADMIN_EMAIL || Number(expires) <= Math.floor(Date.now() / 1000)) return null
    return email
  } catch { return null }
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [iterationValue, saltHex, expectedHex] = stored.split(':')
  const iterations = Number(iterationValue)
  if (!iterations || iterations < 100_000 || !saltHex || !expectedHex) return false
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations }, key, expectedHex.length * 4)
  const actual = [...new Uint8Array(bits)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return constantTimeEqual(actual, expectedHex.toLowerCase())
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin')
  return !origin || origin === new URL(request.url).origin
}

async function requireAdmin(request: Request, env: Env): Promise<Response | string> {
  if (!isSameOrigin(request)) return error('Cross-site requests are not allowed.', 403)
  const email = await verifySession(request, env)
  return email || error('Please sign in to continue.', 401)
}

async function fingerprint(request: Request): Promise<string> {
  const value = request.headers.get('CF-Connecting-IP') || 'local'
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return [...new Uint8Array(hash)].slice(0, 12).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function parseBody(request: Request): Promise<Record<string, unknown> | null> {
  try { return await request.json() as Record<string, unknown> } catch { return null }
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function safeMediaUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  if (value.startsWith('/api/media/')) return value
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? value.slice(0, 2000) : ''
  } catch { return '' }
}

function validateItem(input: Record<string, unknown>): { item?: Record<string, unknown>; message?: string } {
  const type = input.type
  const status = input.status
  const title = cleanText(input.title, 160)
  const slug = cleanText(input.slug, 90).toLowerCase()
  if (!['presentation', 'note', 'project'].includes(String(type))) return { message: 'Choose a valid content type.' }
  if (!['draft', 'published'].includes(String(status))) return { message: 'Choose a valid publication status.' }
  if (!title) return { message: 'A title is required.' }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { message: 'The URL slug can contain lowercase letters, numbers and single hyphens.' }

  const content = input.content && typeof input.content === 'object' ? structuredClone(input.content as Record<string, unknown>) : null
  if (!content || content.kind !== type) return { message: 'The content does not match its type.' }
  if (JSON.stringify(content).length > 1_000_000) return { message: 'The written content is too large.' }

  if (content.kind === 'presentation') {
    if (!Array.isArray(content.slides) || content.slides.length < 1 || content.slides.length > 200) return { message: 'A presentation needs between 1 and 200 slides.' }
    content.slides = (content.slides as Array<Record<string, unknown>>).map((slide) => ({
      ...slide,
      id: cleanText(slide.id, 100),
      title: cleanText(slide.title, 300),
      body: cleanText(slide.body, 3000),
      eyebrow: cleanText(slide.eyebrow, 160),
      imageUrl: safeMediaUrl(slide.imageUrl),
      videoUrl: safeMediaUrl(slide.videoUrl),
      imageAlt: cleanText(slide.imageAlt, 300),
      caption: cleanText(slide.caption, 300),
      speakerNotes: cleanText(slide.speakerNotes, 5000),
      points: Array.isArray(slide.points) ? slide.points.map((point) => cleanText(point, 500)).filter(Boolean).slice(0, 30) : [],
    }))
  }

  const assets = Array.isArray(input.assets) ? (input.assets as Array<Record<string, unknown>>).map((asset) => ({
    id: cleanText(asset.id, 300),
    name: cleanText(asset.name, 240),
    url: safeMediaUrl(asset.url),
    kind: ['image', 'video', 'audio', 'document', 'file'].includes(String(asset.kind)) ? asset.kind : 'file',
    mimeType: cleanText(asset.mimeType, 150),
    size: Math.max(0, Number(asset.size) || 0),
  })).filter((asset) => asset.url).slice(0, 100) : []

  return { item: {
    id: cleanText(input.id, 100) || crypto.randomUUID(), type, status, title, slug,
    excerpt: cleanText(input.excerpt, 400), category: cleanText(input.category, 100) || 'General',
    tags: Array.isArray(input.tags) ? input.tags.map((tag) => cleanText(tag, 50)).filter(Boolean).slice(0, 12) : [],
    featured: Boolean(input.featured), coverImage: safeMediaUrl(input.coverImage), assets, content,
    createdAt: cleanText(input.createdAt, 40) || new Date().toISOString(),
    publishedAt: cleanText(input.publishedAt, 40),
  } }
}

async function publicItems(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const query = url.searchParams.get('q')?.slice(0, 100)
  const category = url.searchParams.get('category')?.slice(0, 100)
  const conditions = ["status = 'published'"]
  const values: unknown[] = []
  if (type && ['presentation', 'note', 'project'].includes(type)) { conditions.push('type = ?'); values.push(type) }
  if (category) { conditions.push('category = ?'); values.push(category) }
  if (query) {
    conditions.push("(title LIKE ? OR excerpt LIKE ? OR category LIKE ? OR tags_json LIKE ?)")
    const like = `%${query.replace(/[\\%_]/g, '\\$&')}%`
    values.push(like, like, like, like)
  }
  const result = await env.DB.prepare(`SELECT * FROM content_items WHERE ${conditions.join(' AND ')} ORDER BY featured DESC, COALESCE(published_at, updated_at) DESC`).bind(...values).all<ItemRow>()
  return json({ items: (result.results || []).map((row) => mapItem(row, false, true)) }, 200, { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' })
}

async function publicItem(request: Request, slug: string, env: Env, context: ExecutionContext): Promise<Response> {
  const row = await env.DB.prepare("SELECT * FROM content_items WHERE slug = ? AND status = 'published'").bind(slug).first<ItemRow>()
  if (!row) return error('This published item could not be found.', 404)
  context.waitUntil(env.DB.prepare('UPDATE content_items SET view_count = view_count + 1 WHERE id = ?').bind(row.id).run())
  row.view_count += 1
  const owner = Boolean(await verifySession(request, env))
  return json({ item: mapItem(row, owner) }, 200, { 'Cache-Control': owner ? 'private, no-store' : 'public, max-age=30, stale-while-revalidate=120' })
}

async function login(request: Request, env: Env): Promise<Response> {
  if (!isSameOrigin(request)) return error('Cross-site requests are not allowed.', 403)
  const key = await fingerprint(request)
  await env.DB.prepare("DELETE FROM login_attempts WHERE attempted_at < datetime('now', '-15 minutes')").run()
  const attempts = await env.DB.prepare("SELECT COUNT(*) AS count FROM login_attempts WHERE fingerprint = ? AND attempted_at >= datetime('now', '-15 minutes')").bind(key).first<{ count: number }>()
  if ((attempts?.count || 0) >= 8) return error('Too many attempts. Please wait 15 minutes and try again.', 429)

  const body = await parseBody(request)
  const email = cleanText(body?.email, 320).toLowerCase()
  const password = typeof body?.password === 'string' ? body.password : ''
  const valid = email === env.ADMIN_EMAIL.toLowerCase() && await verifyPassword(password, env.ADMIN_PASSWORD_HASH)
  if (!valid) {
    await env.DB.prepare('INSERT INTO login_attempts (fingerprint) VALUES (?)').bind(key).run()
    return error('The email or password is incorrect.', 401)
  }

  await env.DB.prepare('DELETE FROM login_attempts WHERE fingerprint = ?').bind(key).run()
  const token = await makeSession(env.ADMIN_EMAIL, env.SESSION_SECRET)
  return json({ authenticated: true, email: env.ADMIN_EMAIL }, 200, {
    'Set-Cookie': `nya_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`,
  })
}

async function listAdminItems(env: Env): Promise<Response> {
  const result = await env.DB.prepare('SELECT * FROM content_items ORDER BY updated_at DESC').all<ItemRow>()
  return json({ items: (result.results || []).map((row) => mapItem(row, true)) })
}

async function saveItem(request: Request, env: Env, existingId?: string): Promise<Response> {
  const body = await parseBody(request)
  if (!body) return error('The request body is not valid JSON.')
  const validation = validateItem(body)
  if (!validation.item) return error(validation.message || 'The item is invalid.')
  const item = validation.item
  const now = new Date().toISOString()
  const publishedAt = item.status === 'published' ? (item.publishedAt || now) : null

  try {
    if (existingId) {
      const result = await env.DB.prepare(`UPDATE content_items SET type=?, slug=?, title=?, excerpt=?, category=?, tags_json=?, status=?, featured=?, cover_image=?, assets_json=?, content_json=?, updated_at=?, published_at=? WHERE id=?`).bind(
        item.type, item.slug, item.title, item.excerpt, item.category, JSON.stringify(item.tags), item.status,
        item.featured ? 1 : 0, item.coverImage, JSON.stringify(item.assets), JSON.stringify(item.content), now, publishedAt, existingId,
      ).run()
      if (!result.meta.changes) return error('This item could not be found.', 404)
    } else {
      await env.DB.prepare(`INSERT INTO content_items (id,type,slug,title,excerpt,category,tags_json,status,featured,cover_image,assets_json,content_json,created_at,updated_at,published_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
        item.id, item.type, item.slug, item.title, item.excerpt, item.category, JSON.stringify(item.tags), item.status,
        item.featured ? 1 : 0, item.coverImage, JSON.stringify(item.assets), JSON.stringify(item.content), item.createdAt, now, publishedAt,
      ).run()
    }
  } catch (reason) {
    if (String(reason).includes('UNIQUE')) return error('That URL slug is already in use. Choose another one.', 409)
    throw reason
  }

  const row = await env.DB.prepare('SELECT * FROM content_items WHERE id = ?').bind(existingId || item.id).first<ItemRow>()
  return json({ item: mapItem(row!, true) }, existingId ? 200 : 201)
}

function fileKind(mime: string): MediaAsset['kind'] {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime === 'application/pdf' || mime.includes('document') || mime.includes('sheet') || mime.includes('presentation') || mime.startsWith('text/')) return 'document'
  return 'file'
}

function safeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._ -]/g, '').replace(/\s+/g, '-').slice(0, 120) || 'upload'
}

function uploadAllowed(name: string, mime: string): boolean {
  const blocked = ['.exe', '.dll', '.bat', '.cmd', '.com', '.msi', '.sh', '.apk', '.dmg', '.html', '.htm', '.js', '.svg']
  if (blocked.some((extension) => name.toLowerCase().endsWith(extension))) return false
  if (['text/html', 'image/svg+xml', 'application/javascript', 'text/javascript'].includes(mime)) return false
  return true
}

async function uploadMedia(request: Request, env: Env): Promise<Response> {
  if (!request.body) return error('Choose a file to upload.')
  const contentLength = Number(request.headers.get('Content-Length') || 0)
  if (contentLength > MAX_UPLOAD_BYTES) return error('Files can be up to 100 MB.', 413)
  const rawName = request.headers.get('X-File-Name') || 'upload'
  let decodedName = 'upload'
  try { decodedName = decodeURIComponent(rawName) } catch { decodedName = rawName }
  const name = safeFileName(decodedName)
  const mime = cleanText(request.headers.get('Content-Type'), 150) || 'application/octet-stream'
  if (!uploadAllowed(name, mime)) return error('This file type is blocked for security. Use a common image, video, audio, document or archive format.', 415)

  const date = new Date()
  const key = `uploads/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}-${name}`
  const kind = fileKind(mime)
  await env.MEDIA.put(key, request.body, { httpMetadata: { contentType: mime }, customMetadata: { originalName: name, kind } })
  const object = await env.MEDIA.head(key)
  const asset: MediaAsset = { id: key, name, url: `/api/media/${key}`, kind, mimeType: mime, size: object?.size || contentLength }
  return json({ asset }, 201)
}

async function serveMedia(request: Request, key: string, env: Env): Promise<Response> {
  const object = await env.MEDIA.get(key, { range: request.headers })
  if (!object) return error('File not found.', 404)
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('ETag', object.httpEtag)
  headers.set('Accept-Ranges', 'bytes')
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  headers.set('X-Content-Type-Options', 'nosniff')
  const name = object.customMetadata?.originalName || key.split('/').pop() || 'file'
  const kind = object.customMetadata?.kind || fileKind(headers.get('Content-Type') || '')
  headers.set('Content-Disposition', `${['image', 'video', 'audio', 'document'].includes(kind) ? 'inline' : 'attachment'}; filename="${name.replace(/"/g, '')}"`)
  if (object.range) {
    const range = object.range
    const length = 'suffix' in range ? Math.min(range.suffix, object.size) : (range.length ?? object.size - (range.offset ?? 0))
    const offset = 'suffix' in range ? object.size - length : (range.offset ?? 0)
    headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${object.size}`)
    headers.set('Content-Length', String(length))
    return new Response(object.body, { status: 206, headers })
  }
  headers.set('Content-Length', String(object.size))
  return new Response(object.body, { headers })
}

async function router(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname

  if (!path.startsWith('/api/')) return env.ASSETS.fetch(request)
  if (request.method === 'GET' && path === '/api/health') return json({ ok: true })
  if (request.method === 'GET' && path === '/api/public/items') return publicItems(request, env)
  if (request.method === 'GET' && path.startsWith('/api/public/items/')) return publicItem(request, decodeURIComponent(path.slice('/api/public/items/'.length)), env, context)
  if (request.method === 'GET' && path === '/api/public/settings') {
    const row = await env.DB.prepare("SELECT value_json FROM site_settings WHERE key = 'site'").first<{ value_json: string }>()
    return json({ settings: parseJson(row?.value_json || '{}', {}) }, 200, { 'Cache-Control': 'public, max-age=60' })
  }
  if (request.method === 'GET' && path.startsWith('/api/media/')) return serveMedia(request, decodeURIComponent(path.slice('/api/media/'.length)), env)
  if (request.method === 'POST' && path === '/api/auth/login') return login(request, env)
  if (request.method === 'POST' && path === '/api/auth/logout') return json({ ok: true }, 200, { 'Set-Cookie': 'nya_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0' })
  if (request.method === 'GET' && path === '/api/auth/session') {
    const email = await verifySession(request, env)
    return json(email ? { authenticated: true, email } : { authenticated: false })
  }

  if (path.startsWith('/api/admin/')) {
    const admin = await requireAdmin(request, env)
    if (admin instanceof Response) return admin
    if (request.method === 'GET' && path === '/api/admin/items') return listAdminItems(env)
    if (request.method === 'POST' && path === '/api/admin/items') return saveItem(request, env)
    if (path.startsWith('/api/admin/items/')) {
      const id = decodeURIComponent(path.slice('/api/admin/items/'.length))
      if (request.method === 'PUT') return saveItem(request, env, id)
      if (request.method === 'DELETE') {
        const result = await env.DB.prepare('DELETE FROM content_items WHERE id = ?').bind(id).run()
        return result.meta.changes ? json({ ok: true }) : error('This item could not be found.', 404)
      }
    }
    if (request.method === 'PUT' && path === '/api/admin/settings') {
      const settings = await parseBody(request)
      if (!settings) return error('The settings are not valid JSON.')
      const safe = {
        siteTitle: cleanText(settings.siteTitle, 100), ownerName: cleanText(settings.ownerName, 100),
        eyebrow: cleanText(settings.eyebrow, 160), tagline: cleanText(settings.tagline, 180),
        introduction: cleanText(settings.introduction, 700), trainingLabel: cleanText(settings.trainingLabel, 180),
        footerNote: cleanText(settings.footerNote, 180),
      }
      await env.DB.prepare("INSERT INTO site_settings (key,value_json,updated_at) VALUES ('site',?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at").bind(JSON.stringify(safe), new Date().toISOString()).run()
      return json({ settings: safe })
    }
    if (request.method === 'POST' && path === '/api/admin/upload') return uploadMedia(request, env)
  }

  return error('API route not found.', 404)
}

export default {
  async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    try {
      return await router(request, env, context)
    } catch (reason) {
      console.error(reason)
      return error('The server could not complete this request.', 500)
    }
  },
}
