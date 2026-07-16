import { beforeEach, describe, expect, it, vi } from 'vitest'
import { achievementForEgg, getUnlockedAchievements, unlockAchievement } from './achievements'
import { localizeAuthoredDefault } from './i18n'

class MemoryStorage {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

describe('visitor achievements and language defaults', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage())
    vi.stubGlobal('window', new EventTarget())
  })

  it('unlocks each achievement only once in the current browser', () => {
    expect(unlockAchievement('study_cat')).toBe(true)
    expect(unlockAchievement('study_cat')).toBe(false)
    expect(getUnlockedAchievements()).toEqual(['study_cat'])
  })

  it('maps personal easter eggs to achievements', () => {
    expect(achievementForEgg('osu')).toBe('rhythm_combo')
    expect(achievementForEgg('coffee')).toBe('coffee_break')
  })

  it('localizes only untouched default copy', () => {
    expect(localizeAuthoredDefault('Hello', 'Hello', 'Hallo', 'de')).toBe('Hallo')
    expect(localizeAuthoredDefault('My own words', 'Hello', 'Hallo', 'de')).toBe('My own words')
  })
})
