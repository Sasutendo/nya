import { DEFAULT_SETTINGS, DEMO_ITEMS } from './demo-data'
import { DEMO_CALENDAR_EVENTS, DEMO_STICKY_NOTES, DEMO_TASKS } from './demo-planner'
import { DEMO_NURSING_SKILLS, DEMO_STUDY_CARDS, DEMO_STUDY_REFLECTIONS } from './demo-study'
import type { CalendarEvent, ContentItem, ItemFilters, MediaAsset, NursingSkill, PlannerData, PlannerTask, SessionState, SiteSettings, StickyNote, StudyCard, StudyHubData, StudyReflection } from '../types'

const LOCAL_ITEMS_KEY = 'nya-local-items-v1'
const LOCAL_SETTINGS_KEY = 'nya-local-settings-v1'
const LOCAL_SESSION_KEY = 'nya-local-owner-session-v1'
const LOCAL_PASSWORD_KEY = 'nya-local-owner-password-v1'
const LOCAL_EMAIL_KEY = 'nya-local-owner-email-v1'
const LOCAL_EVENTS_KEY = 'nya-local-calendar-v1'
const LOCAL_NOTES_KEY = 'nya-local-stickies-v1'
const LOCAL_TASKS_KEY = 'nya-local-tasks-v1'
const LOCAL_STUDY_CARDS_KEY = 'nya-local-study-cards-v1'
const LOCAL_NURSING_SKILLS_KEY = 'nya-local-nursing-skills-v1'
const LOCAL_REFLECTIONS_KEY = 'nya-local-reflections-v1'
const LOCAL_VIEW_PREFIX = 'nya-local-viewed-v1:'
const SETTINGS_CHANNEL = 'nya-settings-sync-v1'
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
    if (saved) {
      const items = JSON.parse(saved) as ContentItem[]
      const migrated = items.map((item) => {
        if (item.id !== 'demo_presentation' || item.content.kind !== 'presentation') return item
        const slides = item.content.slides.map((slide, index) => index === 0 && ['Nya Learning Studio', "Nya's Learning Atelier"].includes(slide.eyebrow || '') ? { ...slide, eyebrow: "Nya Yuuki's Learning Corner" } : slide)
        const title = ['Welcome to my learning studio', 'Welcome to my learning atelier'].includes(item.title) ? 'Welcome to my learning corner' : item.title
        return { ...item, title, content: { ...item.content, slides } }
      })
      if (JSON.stringify(migrated) !== saved) localStorage.setItem(LOCAL_ITEMS_KEY, JSON.stringify(migrated))
      return migrated
    }
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

function normaliseSettings(settings: Partial<SiteSettings>): SiteSettings {
  const parsed = { ...DEFAULT_SETTINGS, ...settings }
  if (parsed.siteTitle === 'Nya Learning Studio' || parsed.siteTitle === "Nya's Learning Atelier") parsed.siteTitle = DEFAULT_SETTINGS.siteTitle
  if (parsed.eyebrow === 'Nursing training · Berlin learning journal') parsed.eyebrow = DEFAULT_SETTINGS.eyebrow
  if (/pflegefachkraft/i.test(parsed.trainingLabel)) parsed.trainingLabel = DEFAULT_SETTINGS.trainingLabel
  return parsed
}

function readLocalSettings(): SiteSettings {
  try {
    const saved = localStorage.getItem(LOCAL_SETTINGS_KEY)
    if (!saved) return DEFAULT_SETTINGS
    return normaliseSettings(JSON.parse(saved) as Partial<SiteSettings>)
  } catch { return DEFAULT_SETTINGS }
}

function readLocalCollection<T>(key: string, starter: T[]): T[] {
  try {
    const saved = localStorage.getItem(key)
    if (saved) return JSON.parse(saved) as T[]
  } catch { /* Restore the safe starter data below. */ }
  const initial = structuredClone(starter)
  localStorage.setItem(key, JSON.stringify(initial))
  return initial
}

function writeLocalCollection<T>(key: string, values: T[]) {
  try { localStorage.setItem(key, JSON.stringify(values)) }
  catch { throw new ApiError('Local browser storage is full. Remove a large test upload or older planner entry.', 507) }
}

const readLocalEvents = () => readLocalCollection(LOCAL_EVENTS_KEY, DEMO_CALENDAR_EVENTS)
const readLocalNotes = () => readLocalCollection(LOCAL_NOTES_KEY, DEMO_STICKY_NOTES)
const readLocalTasks = () => readLocalCollection(LOCAL_TASKS_KEY, DEMO_TASKS)
const readLocalStudyCards = () => readLocalCollection(LOCAL_STUDY_CARDS_KEY, DEMO_STUDY_CARDS)
const readLocalNursingSkills = () => readLocalCollection(LOCAL_NURSING_SKILLS_KEY, DEMO_NURSING_SKILLS)
const readLocalReflections = () => readLocalCollection(LOCAL_REFLECTIONS_KEY, DEMO_STUDY_REFLECTIONS)

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

function viewIdFor(slug: string): string {
  const key = `${LOCAL_VIEW_PREFIX}${slug}`
  try {
    const saved = sessionStorage.getItem(key)
    if (saved) return saved
    const created = crypto.randomUUID()
    sessionStorage.setItem(key, created)
    return created
  } catch { return crypto.randomUUID() }
}

export async function recordView(slug: string): Promise<number | null> {
  const viewId = viewIdFor(slug)
  if (LOCAL_DEMO) {
    const countedKey = `${LOCAL_VIEW_PREFIX}counted:${slug}`
    const items = readLocalItems()
    const current = items.find((item) => item.slug === slug && item.status === 'published')
    if (!current) return null
    try {
      if (sessionStorage.getItem(countedKey)) return current.viewCount
      sessionStorage.setItem(countedKey, viewId)
    } catch { /* Count this visit when session storage is unavailable. */ }
    const updated = { ...current, viewCount: current.viewCount + 1 }
    writeLocalItems(items.map((item) => item.id === updated.id ? updated : item))
    return updated.viewCount
  }
  try {
    const result = await request<{ viewCount: number }>(`/api/public/items/${encodeURIComponent(slug)}/view`, { method: 'POST', body: JSON.stringify({ viewId }) })
    return result.viewCount
  } catch { return null }
}

export async function getSettings(): Promise<SiteSettings> {
  if (LOCAL_DEMO) return readLocalSettings()
  try {
    const result = await request<{ settings: SiteSettings }>('/api/public/settings')
    return normaliseSettings(result.settings)
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function watchSettings(onSettings: (settings: SiteSettings) => void): () => void {
  let stopped = false
  const deliver = (settings: Partial<SiteSettings>) => { if (!stopped) onSettings(normaliseSettings(settings)) }

  if (LOCAL_DEMO) {
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(SETTINGS_CHANNEL) : null
    const onMessage = (event: MessageEvent<Partial<SiteSettings>>) => deliver(event.data)
    const onStorage = (event: StorageEvent) => {
      if (event.key !== LOCAL_SETTINGS_KEY || !event.newValue) return
      try { deliver(JSON.parse(event.newValue) as Partial<SiteSettings>) } catch { /* Ignore incomplete writes. */ }
    }
    channel?.addEventListener('message', onMessage)
    window.addEventListener('storage', onStorage)
    return () => {
      stopped = true
      channel?.removeEventListener('message', onMessage)
      channel?.close()
      window.removeEventListener('storage', onStorage)
    }
  }

  let socket: WebSocket | null = null
  let reconnectTimer: number | undefined
  const refresh = () => getSettings().then(deliver).catch(() => undefined)
  const connect = () => {
    if (stopped) return
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    socket = new WebSocket(`${protocol}//${window.location.host}/api/public/settings/live`)
    socket.addEventListener('message', (event) => {
      try { deliver(JSON.parse(String(event.data)) as Partial<SiteSettings>) } catch { /* Keep the last valid settings. */ }
    })
    socket.addEventListener('close', () => {
      if (!stopped) reconnectTimer = window.setTimeout(connect, 1_500)
    })
    socket.addEventListener('error', () => socket?.close())
  }
  connect()
  const pollTimer = window.setInterval(refresh, 30_000)
  const onVisibility = () => { if (document.visibilityState === 'visible') refresh() }
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    stopped = true
    if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer)
    window.clearInterval(pollTimer)
    document.removeEventListener('visibilitychange', onVisibility)
    socket?.close()
  }
}

export async function getPublicEvents(from?: string, to?: string): Promise<CalendarEvent[]> {
  if (LOCAL_DEMO) {
    return readLocalEvents().filter((event) => event.visibility === 'public' && (!from || event.date >= from) && (!to || event.date <= to))
  }
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  try {
    const result = await request<{ events: CalendarEvent[] }>(`/api/public/calendar?${params}`)
    return result.events
  } catch { return [] }
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
      const saved = normaliseSettings(settings)
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(saved))
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(SETTINGS_CHANNEL)
        channel.postMessage(saved)
        channel.close()
      }
      return { settings: saved }
    }
    return request<{ settings: SiteSettings }>('/api/admin/settings', { method: 'PUT', body: JSON.stringify(settings) })
  },
  planner: async (): Promise<PlannerData> => {
    if (LOCAL_DEMO) return { events: readLocalEvents(), notes: readLocalNotes(), tasks: readLocalTasks() }
    return request<PlannerData>('/api/admin/planner')
  },
  saveEvent: async (event: CalendarEvent, create = false): Promise<{ event: CalendarEvent }> => {
    if (LOCAL_DEMO) {
      const events = readLocalEvents()
      const exists = events.some((candidate) => candidate.id === event.id)
      const saved = { ...event, updatedAt: new Date().toISOString() }
      writeLocalCollection(LOCAL_EVENTS_KEY, exists ? events.map((candidate) => candidate.id === event.id ? saved : candidate) : [...events, saved])
      return { event: saved }
    }
    return request<{ event: CalendarEvent }>(`/api/admin/calendar${create ? '' : `/${event.id}`}`, { method: create ? 'POST' : 'PUT', body: JSON.stringify(event) })
  },
  removeEvent: async (id: string): Promise<{ ok: true }> => {
    if (LOCAL_DEMO) { writeLocalCollection(LOCAL_EVENTS_KEY, readLocalEvents().filter((event) => event.id !== id)); return { ok: true } }
    return request<{ ok: true }>(`/api/admin/calendar/${id}`, { method: 'DELETE' })
  },
  saveSticky: async (note: StickyNote, create = false): Promise<{ note: StickyNote }> => {
    if (LOCAL_DEMO) {
      const notes = readLocalNotes()
      const exists = notes.some((candidate) => candidate.id === note.id)
      const saved = { ...note, updatedAt: new Date().toISOString() }
      writeLocalCollection(LOCAL_NOTES_KEY, exists ? notes.map((candidate) => candidate.id === note.id ? saved : candidate) : [saved, ...notes])
      return { note: saved }
    }
    return request<{ note: StickyNote }>(`/api/admin/sticky-notes${create ? '' : `/${note.id}`}`, { method: create ? 'POST' : 'PUT', body: JSON.stringify(note) })
  },
  removeSticky: async (id: string): Promise<{ ok: true }> => {
    if (LOCAL_DEMO) { writeLocalCollection(LOCAL_NOTES_KEY, readLocalNotes().filter((note) => note.id !== id)); return { ok: true } }
    return request<{ ok: true }>(`/api/admin/sticky-notes/${id}`, { method: 'DELETE' })
  },
  saveTask: async (task: PlannerTask, create = false): Promise<{ task: PlannerTask }> => {
    if (LOCAL_DEMO) {
      const tasks = readLocalTasks()
      const exists = tasks.some((candidate) => candidate.id === task.id)
      const saved = { ...task, updatedAt: new Date().toISOString() }
      writeLocalCollection(LOCAL_TASKS_KEY, exists ? tasks.map((candidate) => candidate.id === task.id ? saved : candidate) : [saved, ...tasks])
      return { task: saved }
    }
    return request<{ task: PlannerTask }>(`/api/admin/tasks${create ? '' : `/${task.id}`}`, { method: create ? 'POST' : 'PUT', body: JSON.stringify(task) })
  },
  removeTask: async (id: string): Promise<{ ok: true }> => {
    if (LOCAL_DEMO) { writeLocalCollection(LOCAL_TASKS_KEY, readLocalTasks().filter((task) => task.id !== id)); return { ok: true } }
    return request<{ ok: true }>(`/api/admin/tasks/${id}`, { method: 'DELETE' })
  },
  studyHub: async (): Promise<StudyHubData> => {
    if (LOCAL_DEMO) return { cards: readLocalStudyCards(), skills: readLocalNursingSkills(), reflections: readLocalReflections() }
    return request<StudyHubData>('/api/admin/study-hub')
  },
  saveStudyCard: async (card: StudyCard, create = false): Promise<{ card: StudyCard }> => {
    if (LOCAL_DEMO) {
      const cards = readLocalStudyCards()
      const exists = cards.some((candidate) => candidate.id === card.id)
      const saved = { ...card, updatedAt: new Date().toISOString() }
      writeLocalCollection(LOCAL_STUDY_CARDS_KEY, exists ? cards.map((candidate) => candidate.id === card.id ? saved : candidate) : [saved, ...cards])
      return { card: saved }
    }
    return request<{ card: StudyCard }>(`/api/admin/study-cards${create ? '' : `/${card.id}`}`, { method: create ? 'POST' : 'PUT', body: JSON.stringify(card) })
  },
  removeStudyCard: async (id: string): Promise<{ ok: true }> => {
    if (LOCAL_DEMO) { writeLocalCollection(LOCAL_STUDY_CARDS_KEY, readLocalStudyCards().filter((card) => card.id !== id)); return { ok: true } }
    return request<{ ok: true }>(`/api/admin/study-cards/${id}`, { method: 'DELETE' })
  },
  saveNursingSkill: async (skill: NursingSkill, create = false): Promise<{ skill: NursingSkill }> => {
    if (LOCAL_DEMO) {
      const skills = readLocalNursingSkills()
      const exists = skills.some((candidate) => candidate.id === skill.id)
      const saved = { ...skill, updatedAt: new Date().toISOString() }
      writeLocalCollection(LOCAL_NURSING_SKILLS_KEY, exists ? skills.map((candidate) => candidate.id === skill.id ? saved : candidate) : [saved, ...skills])
      return { skill: saved }
    }
    return request<{ skill: NursingSkill }>(`/api/admin/nursing-skills${create ? '' : `/${skill.id}`}`, { method: create ? 'POST' : 'PUT', body: JSON.stringify(skill) })
  },
  removeNursingSkill: async (id: string): Promise<{ ok: true }> => {
    if (LOCAL_DEMO) { writeLocalCollection(LOCAL_NURSING_SKILLS_KEY, readLocalNursingSkills().filter((skill) => skill.id !== id)); return { ok: true } }
    return request<{ ok: true }>(`/api/admin/nursing-skills/${id}`, { method: 'DELETE' })
  },
  saveReflection: async (reflection: StudyReflection, create = false): Promise<{ reflection: StudyReflection }> => {
    if (LOCAL_DEMO) {
      const reflections = readLocalReflections()
      const exists = reflections.some((candidate) => candidate.id === reflection.id)
      const saved = { ...reflection, updatedAt: new Date().toISOString() }
      writeLocalCollection(LOCAL_REFLECTIONS_KEY, exists ? reflections.map((candidate) => candidate.id === reflection.id ? saved : candidate) : [saved, ...reflections])
      return { reflection: saved }
    }
    return request<{ reflection: StudyReflection }>(`/api/admin/reflections${create ? '' : `/${reflection.id}`}`, { method: create ? 'POST' : 'PUT', body: JSON.stringify(reflection) })
  },
  removeReflection: async (id: string): Promise<{ ok: true }> => {
    if (LOCAL_DEMO) { writeLocalCollection(LOCAL_REFLECTIONS_KEY, readLocalReflections().filter((reflection) => reflection.id !== id)); return { ok: true } }
    return request<{ ok: true }>(`/api/admin/reflections/${id}`, { method: 'DELETE' })
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
