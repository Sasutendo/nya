import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminApi, authApi, getPublicEvents, getPublicItems, getPublicStudyCards, getPublicWhiteboards, getSettings, recordView } from './api'

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
    expect((await getSettings()).siteTitle).toBe("Nya Yuuki's Learning Corner")
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
    expect(planner.templates.length).toBeGreaterThan(0)
    expect(planner.notes.length).toBeGreaterThan(0)
    expect(planner.tasks.length).toBeGreaterThan(0)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('creates and reuses a saved shift without a network request', async () => {
    const now = new Date().toISOString()
    const template = {
      id: 'test_early_shift', title: 'Frühschicht', shortLabel: 'F', description: 'Station 2',
      startTime: '06:00', endTime: '14:00', category: 'early_shift' as const,
      colour: '#e79ac3', visibility: 'private' as const, createdAt: now, updatedAt: now,
    }
    await adminApi.saveShiftTemplate(template, true)
    const savedTemplate = (await adminApi.planner()).templates.find((entry) => entry.id === template.id)
    expect(savedTemplate?.endTime).toBe('14:00')

    const event = {
      id: 'test_early_shift_day', title: template.title, description: template.description,
      date: '2026-10-05', time: template.startTime, endTime: template.endTime,
      category: template.category, colour: template.colour, templateId: template.id,
      visibility: template.visibility, createdAt: now, updatedAt: now,
    }
    await adminApi.saveEvent(event, true)
    expect((await adminApi.planner()).events.find((entry) => entry.id === event.id)?.templateId).toBe(template.id)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('saves flashcards, nursing skills and reflections locally without exposing them publicly', async () => {
    const hub = await adminApi.studyHub()
    expect(hub.cards.length).toBeGreaterThan(0)
    expect(hub.skills.length).toBeGreaterThan(0)

    const time = new Date().toISOString()
    const card = { id: 'test_card', question: 'What matters first?', answer: 'Safe, person-centred care.', category: 'Care', createdAt: time, updatedAt: time }
    const skill = { id: 'test_skill', title: 'Structured handover', category: 'Communication', status: 'learning' as const, notes: 'Practise aloud.', createdAt: time, updatedAt: time }
    const reflection = { id: 'test_reflection', date: time.slice(0, 10), win: 'Made one card.', learned: 'Active recall works.', revisit: 'Try it again tomorrow.', createdAt: time, updatedAt: time }

    await adminApi.saveStudyCard(card, true)
    await adminApi.saveNursingSkill(skill, true)
    await adminApi.saveReflection(reflection, true)
    const saved = await adminApi.studyHub()

    expect(saved.cards.some((entry) => entry.id === card.id)).toBe(true)
    expect((await getPublicStudyCards()).some((entry) => entry.id === card.id)).toBe(false)
    expect(saved.skills.some((entry) => entry.id === skill.id)).toBe(true)
    expect(saved.reflections.some((entry) => entry.id === reflection.id)).toBe(true)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('publishes typed or handwritten flashcards for the public learning page', async () => {
    const time = new Date().toISOString()
    const card = {
      id: 'published_ink_card', question: '', answer: 'Radius', category: 'Anatomy', published: true,
      questionInk: [{ id: 'ink_1', colour: '#302128', size: 2.4, points: [{ x: .1, y: .2, pressure: .5 }, { x: .8, y: .7, pressure: .7 }] }],
      answerInk: [], createdAt: time, updatedAt: time,
    }
    await adminApi.saveStudyCard(card, true)
    const published = await getPublicStudyCards()

    expect(published.find((entry) => entry.id === card.id)?.questionInk).toHaveLength(1)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('creates, updates and removes private local whiteboards without an API request', async () => {
    const time = new Date().toISOString()
    const board = { id: 'board_test', title: 'Anatomy notes', pages: [{ id: 'page_test', name: 'Page 1', background: 'grid' as const, strokes: [{ id: 'stroke_test', tool: 'highlighter' as const, colour: '#f0c44f', size: 22, points: [{ x: 20, y: 30, pressure: .5 }, { x: 90, y: 30, pressure: .7 }] }] }], published: false, createdAt: time, updatedAt: time }
    await adminApi.saveWhiteboard(board, true)
    expect((await adminApi.whiteboards()).boards[0].title).toBe('Anatomy notes')
    expect(await getPublicWhiteboards()).toEqual([])
    await adminApi.saveWhiteboard({ ...board, title: 'Anatomy exam notes', published: true })
    expect((await adminApi.whiteboards()).boards[0].title).toBe('Anatomy exam notes')
    expect((await getPublicWhiteboards())[0].title).toBe('Anatomy exam notes')
    await adminApi.removeWhiteboard(board.id)
    expect((await adminApi.whiteboards()).boards).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('counts one local view per item and browser session', async () => {
    const before = (await getPublicItemForTest()).viewCount
    expect(await recordView('welcome-to-my-learning-studio')).toBe(before + 1)
    expect(await recordView('welcome-to-my-learning-studio')).toBe(before + 1)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('persists shared site and profile settings without an API request', async () => {
    const settings = await getSettings()
    await adminApi.settings({ ...settings, siteTitle: "Nya Yuuki's Test Corner", profileImageAlt: 'Animated owner profile' })
    const saved = await getSettings()

    expect(saved.siteTitle).toBe("Nya Yuuki's Test Corner")
    expect(saved.profileImageAlt).toBe('Animated owner profile')
    expect(fetch).not.toHaveBeenCalled()
  })
})

async function getPublicItemForTest() {
  const item = (await getPublicItems()).find((entry) => entry.slug === 'welcome-to-my-learning-studio')
  if (!item) throw new Error('Starter presentation is missing.')
  return item
}
