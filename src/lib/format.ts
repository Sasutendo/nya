import type { ContentItem, ItemType } from '../types'

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function formatDate(value?: string, long = false): string {
  if (!value) return 'Not published'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: long ? 'long' : 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function itemTypeLabel(type: ItemType, plural = false): string {
  const labels: Record<ItemType, [string, string]> = {
    presentation: ['Presentation', 'Presentations'],
    note: ['Note', 'Notes'],
    project: ['Project', 'Projects'],
  }
  return labels[type][plural ? 1 : 0]
}

export function readingTime(item: ContentItem): string {
  if (item.content.kind === 'presentation') {
    const minutes = Math.max(1, Math.round((item.slideCount || item.content.slides.length) * 0.75))
    return `${minutes} min presentation`
  }

  if (item.readingMinutes) return `${item.readingMinutes} min read`
  const words = item.content.body.trim().split(/\s+/).filter(Boolean).length
  return `${Math.max(1, Math.ceil(words / 210))} min read`
}

export function normaliseTags(value: string): string[] {
  return [...new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))].slice(0, 12)
}

export function newId(prefix = 'item'): string {
  return `${prefix}_${crypto.randomUUID()}`
}

export function classes(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}
