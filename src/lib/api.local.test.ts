import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminApi, authApi, getPublicEvents, getPublicItems, getSettings, recordView } from './api'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

describe('zero-configuration local preview', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage())
    vi.stubGlobal('sessionStorage', new MemoryStorage())
    vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Local preview must not call the API.') }))
  })

  it('loads public content, calendar and settings without an API request', async () => {
    expect((await getPublicItems()).length).toBeGreaterThan(0)
    expect((await getPublicEvents()).every((event) => event.visibility === 'public')).toBe(true)
    expect((await getSettings()).siteTitle).toBe("Nya's Learning Atelier")
    expect(fetch).not.toHaveBeenCalled()
  })

  it('creates and verifies private local owner credentials', async () => {
    const initial = await authApi.session()
    expect(initial.setupRequired).toBe(true)

    await authApi.setupLocalPassword('owner@example.com', 'a-cozy-private-passphrase')
    await authApi.logout()
    await expect(authApi.login('owner@example.com', 'wrong-password')).rejects.toThrow()
    const session = await authApi.login('owner@example.com', 'a-cozy-private-passphrase')

    expect(session.authenticated).toBe(true)
    expect(localStorage.getItem('nya-local-owner-password-v1')).not.toContain('a-cozy-private-passphrase')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('keeps private planner data entirely in the browser during local testing', async () => {
    const planner = await adminApi.planner()

    expect(planner.events.some((event) => event.visibility === 'private')).toBe(true)
    expect(planner.notes.length).toBeGreaterThan(0)
    expect(planner.tasks.length).toBeGreaterThan(0)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('counts one local view per item and browser session', async () => {
    const before = (await getPublicItemForTest()).viewCount
    expect(await recordView('welcome-to-my-learning-studio')).toBe(before + 1)
    expect(await recordView('welcome-to-my-learning-studio')).toBe(before + 1)
    expect(fetch).not.toHaveBeenCalled()
  })
})

async function getPublicItemForTest() {
  const item = (await getPublicItems()).find((entry) => entry.slug === 'welcome-to-my-learning-studio')
  if (!item) throw new Error('Starter presentation is missing.')
  return item
}
