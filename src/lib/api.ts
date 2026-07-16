import { DEFAULT_SETTINGS, DEMO_ITEMS } from './demo-data'
import type { ContentItem, ItemFilters, MediaAsset, SessionState, SiteSettings } from '../types'

const LOCAL_ITEMS_KEY = 'nya-local-items-v1'
const LOCAL_SETTINGS_KEY = 'nya-local-settings-v1'
const LOCAL_SESSION_KEY = 'nya-local-owner-session-v1'
const LOCAL_PASSWORD_KEY = 'nya-local-owner-password-v1'
const LOCAL_EMAIL_KEY = 'nya-local-owner-email-v1'
const LOCAL_DEMO = import.meta.env.DEV && import.meta.env.VITE_USE_API !== 'true'

class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'Something went wrong.' })) as { error?: string }
    throw new ApiError(payload.error || 'Something went wrong.', response.status)
  }

  return response.json() as Promise<T>
}

function readLocalItems(): ContentItem[] {
  try {
    const saved = localStorage.getItem(LOCAL_ITEMS_KEY)
    if (saved) return JSON.parse(saved) as ContentItem[]
  } catch { /* Start again with safe demo data. */ }
  const starter = structuredClone(DEMO_ITEMS)
  localStorage.setItem(LOCAL_ITEMS_KEY, JSON.stringify(starter))
  return starter
}

function encodeBytes(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeBytes(value: string): Uint8Array {
  const normal = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normal.padEnd(Math.ceil(normal.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

async function deriveLocalPassword(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const saltBuffer = new Uint8Array(salt).buffer
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBuffer, iterations: 180_000 }, key, 256)
  return encodeBytes(new Uint8Array(bits))
}

async function setLocalCredentials(email: string, password: string) {
  const normalEmail = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalEmail)) throw new ApiError('Enter a valid owner email address.', 400)
  if (password.length < 12) throw new ApiError('Choose a password with at least 12 characters.', 400)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await deriveLocalPassword(password, salt)
  localStorage.setItem(LOCAL_EMAIL_KEY, normalEmail)
  localStorage.setItem(LOCAL_PASSWORD_KEY, JSON.stringify({ salt: encodeBytes(salt), hash }))
  localStorage.setItem(LOCAL_SESSION_KEY, 'true')
}

async function verifyLocalPassword(password: string): Promise<boolean> {
  try {
    const record = JSON.parse(localStorage.getItem(LOCAL_PASSWORD_KEY) || '') as { salt: string; hash: string }
    const actual = await deriveLocalPassword(password, decodeBytes(record.salt))
    if (actual.length !== record.hash.length) return false
    let difference = 0
    for (let index = 0; index < actual.length; index += 1) difference |= actual.charCodeAt(index) ^ record.hash.charCodeAt(index)
    return difference === 0
  } catch { return false }
}

function writeLocalItems(items: ContentItem[]) {
  try {
    localStorage.setItem(LOCAL_ITEMS_KEY, JSON.stringify(items))
  } catch {
    throw new ApiError('Local browser storage is full. Remove a large test upload or use a smaller file.', 507)
  }
}

function readLocalSettings(): SiteSettings {
  try {
    const saved = localStorage.getItem(LOCAL_SETTINGS_KEY)
    return saved ? JSON.parse(saved) as SiteSettings : DEFAULT_SETTINGS
  } catch { return DEFAULT_SETTINGS }
}

function localFileAsset(file: File): Promise<MediaAsset> {
  if (file.size > 2.5 * 1024 * 1024) {
    throw new ApiError('Local preview uploads can be up to 2.5 MB. The configured production site supports files up to 100 MB.', 413)
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new ApiError('The local file could not be read.', 400))
    reader.onload = () => {
      const mime = file.type || 'application/octet-stream'
      const kind: MediaAsset['kind'] = mime.startsWith('image/') ? 'image'
        : mime.startsWith('video/') ? 'video'
          : mime.startsWith('audio/') ? 'audio'
            : mime === 'application/pdf' || mime.startsWith('text/') || mime.includes('document') || mime.includes('sheet') || mime.includes('presentation') ? 'document'
              : 'file'
      resolve({ id: `local_${crypto.randomUUID()}`, name: file.name, url: String(reader.result), kind, mimeType: mime, size: file.size })
    }
    reader.readAsDataURL(file)
  })
}

export async function getPublicItems(filters: ItemFilters = {}): Promise<ContentItem[]> {
  const params = new URLSearchParams()
  if (filters.type) params.set('type', filters.type)
  if (filters.query) params.set('q', filters.query)
  if (filters.category) params.set('category', filters.category)

  if (LOCAL_DEMO) {
    return readLocalItems().filter((item) => item.status === 'published').filter((item) => {
      const matchesType = !filters.type || item.type === filters.type
      const query = filters.query?.toLowerCase()
      const matchesQuery = !query || [item.title, item.excerpt, item.category, ...item.tags].join(' ').toLowerCase().includes(query)
      return matchesType && matchesQuery
    })
  }

  try {
    const result = await request<{ items: ContentItem[] }>(`/api/public/items?${params}`)
    return result.items
  } catch {
    return DEMO_ITEMS.filter((item) => {
      const matchesType = !filters.type || item.type === filters.type
      const query = filters.query?.toLowerCase()
      const matchesQuery = !query || [item.title, item.excerpt, item.category, ...item.tags].join(' ').toLowerCase().includes(query)
      return matchesType && matchesQuery
    })
  }
}

export async function getPublicItem(slug: string): Promise<ContentItem | null> {
  if (LOCAL_DEMO) return readLocalItems().filter((item) => item.status === 'published').find((item) => item.slug === slug) || null
  try {
    const result = await request<{ item: ContentItem }>(`/api/public/items/${encodeURIComponent(slug)}`)
    return result.item
  } catch {
    return DEMO_ITEMS.find((item) => item.slug === slug) || null
  }
}

export async function getSettings(): Promise<SiteSettings> {
  if (LOCAL_DEMO) return readLocalSettings()
  try {
    const result = await request<{ settings: SiteSettings }>('/api/public/settings')
    return result.settings
  } catch {
    return DEFAULT_SETTINGS
  }
}

export const authApi = {
  session: async (): Promise<SessionState> => {
    if (LOCAL_DEMO) {
      const setupRequired = !localStorage.getItem(LOCAL_PASSWORD_KEY) || !localStorage.getItem(LOCAL_EMAIL_KEY)
      return {
        authenticated: !setupRequired && localStorage.getItem(LOCAL_SESSION_KEY) === 'true',
        email: localStorage.getItem(LOCAL_EMAIL_KEY) || undefined,
        setupRequired,
      }
    }
    return request<SessionState>('/api/auth/session')
  },
  login: async (email: string, password: string): Promise<SessionState> => {
    if (LOCAL_DEMO) {
      const savedEmail = localStorage.getItem(LOCAL_EMAIL_KEY)
      if (!savedEmail || email.trim().toLowerCase() !== savedEmail) throw new ApiError('The email or password is incorrect.', 401)
      if (!localStorage.getItem(LOCAL_PASSWORD_KEY)) throw new ApiError('Create your local password first.', 400)
      if (!await verifyLocalPassword(password)) throw new ApiError('The email or password is incorrect.', 401)
      localStorage.setItem(LOCAL_SESSION_KEY, 'true')
      return { authenticated: true, email: savedEmail, setupRequired: false }
    }
    return request<SessionState>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  },
  setupLocalPassword: async (email: string, password: string): Promise<SessionState> => {
    if (!LOCAL_DEMO) throw new ApiError('Local password setup is not available on the published site.', 404)
    await setLocalCredentials(email, password)
    return { authenticated: true, email: email.trim().toLowerCase(), setupRequired: false }
  },
  logout: async (): Promise<{ ok: true }> => {
    if (LOCAL_DEMO) {
      localStorage.removeItem(LOCAL_SESSION_KEY)
      return { ok: true }
    }
    return request<{ ok: true }>('/api/auth/logout', { method: 'POST', body: '{}' })
  },
}

export const adminApi = {
  items: async (): Promise<{ items: ContentItem[] }> => {
    if (LOCAL_DEMO) return { items: readLocalItems() }
    return request<{ items: ContentItem[] }>('/api/admin/items')
  },
  create: async (item: ContentItem): Promise<{ item: ContentItem }> => {
    if (LOCAL_DEMO) {
      const items = readLocalItems()
      if (items.some((candidate) => candidate.slug === item.slug)) throw new ApiError('That URL slug is already in use.', 409)
      const saved = { ...item, updatedAt: new Date().toISOString(), publishedAt: item.status === 'published' ? new Date().toISOString() : undefined }
      writeLocalItems([saved, ...items])
      return { item: saved }
    }
    return request<{ item: ContentItem }>('/api/admin/items', { method: 'POST', body: JSON.stringify(item) })
  },
  update: async (item: ContentItem): Promise<{ item: ContentItem }> => {
    if (LOCAL_DEMO) {
      const items = readLocalItems()
      if (items.some((candidate) => candidate.id !== item.id && candidate.slug === item.slug)) throw new ApiError('That URL slug is already in use.', 409)
      const saved = { ...item, updatedAt: new Date().toISOString(), publishedAt: item.status === 'published' ? (item.publishedAt || new Date().toISOString()) : undefined }
      writeLocalItems(items.map((candidate) => candidate.id === item.id ? saved : candidate))
      return { item: saved }
    }
    return request<{ item: ContentItem }>(`/api/admin/items/${item.id}`, { method: 'PUT', body: JSON.stringify(item) })
  },
  remove: async (id: string): Promise<{ ok: true }> => {
    if (LOCAL_DEMO) {
      writeLocalItems(readLocalItems().filter((item) => item.id !== id))
      return { ok: true }
    }
    return request<{ ok: true }>(`/api/admin/items/${id}`, { method: 'DELETE' })
  },
  settings: async (settings: SiteSettings): Promise<{ settings: SiteSettings }> => {
    if (LOCAL_DEMO) {
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings))
      return { settings }
    }
    return request<{ settings: SiteSettings }>('/api/admin/settings', { method: 'PUT', body: JSON.stringify(settings) })
  },
  upload: async (file: File): Promise<{ asset: MediaAsset }> => {
    if (LOCAL_DEMO) return { asset: await localFileAsset(file) }
    try {
      const response = await fetch('/api/admin/upload', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name) },
        body: file,
      })
      const payload = await response.json() as { asset?: MediaAsset; error?: string }
      if (!response.ok || !payload.asset) throw new ApiError(payload.error || 'The file could not be uploaded.', response.status)
      return { asset: payload.asset }
    } catch (reason) { throw reason }
  },
}

export { ApiError }
