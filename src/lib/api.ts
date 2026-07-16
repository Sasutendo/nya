import { DEFAULT_SETTINGS, DEMO_ITEMS } from './demo-data'
import type { ContentItem, ItemFilters, MediaAsset, SessionState, SiteSettings } from '../types'

const LOCAL_ITEMS_KEY = 'nya-local-items-v1'
const LOCAL_SETTINGS_KEY = 'nya-local-settings-v1'
const LOCAL_SESSION_KEY = 'nya-local-owner-session-v1'

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

function useLocalFallback(reason: unknown): boolean {
  return import.meta.env.DEV && (!(reason instanceof ApiError) || reason.status >= 500)
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

  try {
    const result = await request<{ items: ContentItem[] }>(`/api/public/items?${params}`)
    return result.items
  } catch {
    const source = import.meta.env.DEV ? readLocalItems().filter((item) => item.status === 'published') : DEMO_ITEMS
    return source.filter((item) => {
      const matchesType = !filters.type || item.type === filters.type
      const query = filters.query?.toLowerCase()
      const matchesQuery = !query || [item.title, item.excerpt, item.category, ...item.tags].join(' ').toLowerCase().includes(query)
      return matchesType && matchesQuery
    })
  }
}

export async function getPublicItem(slug: string): Promise<ContentItem | null> {
  try {
    const result = await request<{ item: ContentItem }>(`/api/public/items/${encodeURIComponent(slug)}`)
    return result.item
  } catch {
    const source = import.meta.env.DEV ? readLocalItems().filter((item) => item.status === 'published') : DEMO_ITEMS
    return source.find((item) => item.slug === slug) || null
  }
}

export async function getSettings(): Promise<SiteSettings> {
  try {
    const result = await request<{ settings: SiteSettings }>('/api/public/settings')
    return result.settings
  } catch {
    return import.meta.env.DEV ? readLocalSettings() : DEFAULT_SETTINGS
  }
}

export const authApi = {
  session: async (): Promise<SessionState> => {
    try { return await request<SessionState>('/api/auth/session') }
    catch (reason) {
      if (!useLocalFallback(reason)) throw reason
      return { authenticated: localStorage.getItem(LOCAL_SESSION_KEY) === 'true', email: 'local-preview@nya.test' }
    }
  },
  login: async (email: string, password: string): Promise<SessionState> => {
    try {
      return await request<SessionState>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    } catch (reason) {
      if (!useLocalFallback(reason)) throw reason
      if (!email.trim() || password.length < 4) throw new ApiError('For the local preview, enter an email and at least four password characters.', 400)
      localStorage.setItem(LOCAL_SESSION_KEY, 'true')
      return { authenticated: true, email }
    }
  },
  logout: async (): Promise<{ ok: true }> => {
    try { return await request<{ ok: true }>('/api/auth/logout', { method: 'POST', body: '{}' }) }
    catch (reason) {
      if (!useLocalFallback(reason)) throw reason
      localStorage.removeItem(LOCAL_SESSION_KEY)
      return { ok: true }
    }
  },
}

export const adminApi = {
  items: async (): Promise<{ items: ContentItem[] }> => {
    try { return await request<{ items: ContentItem[] }>('/api/admin/items') }
    catch (reason) { if (useLocalFallback(reason)) return { items: readLocalItems() }; throw reason }
  },
  create: async (item: ContentItem): Promise<{ item: ContentItem }> => {
    try { return await request<{ item: ContentItem }>('/api/admin/items', { method: 'POST', body: JSON.stringify(item) }) }
    catch (reason) {
      if (!useLocalFallback(reason)) throw reason
      const items = readLocalItems()
      if (items.some((candidate) => candidate.slug === item.slug)) throw new ApiError('That URL slug is already in use.', 409)
      const saved = { ...item, updatedAt: new Date().toISOString(), publishedAt: item.status === 'published' ? new Date().toISOString() : undefined }
      writeLocalItems([saved, ...items])
      return { item: saved }
    }
  },
  update: async (item: ContentItem): Promise<{ item: ContentItem }> => {
    try { return await request<{ item: ContentItem }>(`/api/admin/items/${item.id}`, { method: 'PUT', body: JSON.stringify(item) }) }
    catch (reason) {
      if (!useLocalFallback(reason)) throw reason
      const items = readLocalItems()
      if (items.some((candidate) => candidate.id !== item.id && candidate.slug === item.slug)) throw new ApiError('That URL slug is already in use.', 409)
      const saved = { ...item, updatedAt: new Date().toISOString(), publishedAt: item.status === 'published' ? (item.publishedAt || new Date().toISOString()) : undefined }
      writeLocalItems(items.map((candidate) => candidate.id === item.id ? saved : candidate))
      return { item: saved }
    }
  },
  remove: async (id: string): Promise<{ ok: true }> => {
    try { return await request<{ ok: true }>(`/api/admin/items/${id}`, { method: 'DELETE' }) }
    catch (reason) {
      if (!useLocalFallback(reason)) throw reason
      writeLocalItems(readLocalItems().filter((item) => item.id !== id))
      return { ok: true }
    }
  },
  settings: async (settings: SiteSettings): Promise<{ settings: SiteSettings }> => {
    try { return await request<{ settings: SiteSettings }>('/api/admin/settings', { method: 'PUT', body: JSON.stringify(settings) }) }
    catch (reason) {
      if (!useLocalFallback(reason)) throw reason
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings))
      return { settings }
    }
  },
  upload: async (file: File): Promise<{ asset: MediaAsset }> => {
    try {
      const response = await fetch('/api/admin/upload', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name) },
        body: file,
      })
      const payload = await response.json() as { asset?: MediaAsset; error?: string }
      if (!response.ok || !payload.asset) throw new ApiError(payload.error || 'The file could not be uploaded.', response.status)
      return { asset: payload.asset }
    } catch (reason) {
      if (!useLocalFallback(reason)) throw reason
      return { asset: await localFileAsset(file) }
    }
  },
}

export { ApiError }
