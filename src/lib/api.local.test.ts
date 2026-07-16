import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authApi, getPublicItems, getSettings } from './api'

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
    vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Local preview must not call the API.') }))
  })

  it('loads public content and settings without an API request', async () => {
    expect((await getPublicItems()).length).toBeGreaterThan(0)
    expect((await getSettings()).siteTitle).toBe('Nya Learning Studio')
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
})
