import { beforeEach, describe, expect, it, vi } from 'vitest'
import { achievementForEgg, getUnlockedAchievements, resetAchievements, showEasterEgg, unlockAchievement, unlockEggAchievement } from './achievements'
import { localizeAuthoredDefault } from './i18n'

class MemoryStorage {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
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

  it('does not award achievements when an effect is only being shown', () => {
    showEasterEgg('osu')
    expect(getUnlockedAchievements()).toEqual([])
  })

  it('awards a discovered egg once even when it is triggered repeatedly', () => {
    expect(unlockEggAchievement('osu')).toBe(true)
    expect(unlockEggAchievement('osu')).toBe(false)
    expect(getUnlockedAchievements()).toEqual(['rhythm_combo'])
  })

  it('can reset the browser collection for another test run', () => {
    unlockAchievement('study_cat')
    resetAchievements()
    expect(getUnlockedAchievements()).toEqual([])
  })

  it('localizes only untouched default copy', () => {
    expect(localizeAuthoredDefault('Hello', 'Hello', 'Hallo', 'de')).toBe('Hallo')
    expect(localizeAuthoredDefault('My own words', 'Hello', 'Hallo', 'de')).toBe('My own words')
  })
})
