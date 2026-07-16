import { describe, expect, it } from 'vitest'
import { normaliseTags, slugify } from './format'

describe('format helpers', () => {
  it('creates safe slugs', () => {
    expect(slugify('Pressure Ulcer — Prevention!')).toBe('pressure-ulcer-prevention')
  })

  it('normalises duplicate tags', () => {
    expect(normaliseTags('Care, Skills, Care,  ')).toEqual(['Care', 'Skills'])
  })
})
