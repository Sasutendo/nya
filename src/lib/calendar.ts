import type { CalendarEventCategory } from '../types'
import type { Language } from './i18n'

export const CALENDAR_CATEGORIES: CalendarEventCategory[] = [
  'school', 'placement', 'early_shift', 'late_shift', 'night_shift', 'free', 'vacation', 'sick',
  'training', 'lecture', 'study', 'assignment', 'exam', 'appointment', 'milestone', 'personal', 'other',
]

const labels: Record<CalendarEventCategory, [string, string]> = {
  school: ['School', 'Schule'],
  placement: ['Placement', 'Praxiseinsatz'],
  early_shift: ['Early shift', 'Frühschicht'],
  late_shift: ['Late shift', 'Spätschicht'],
  night_shift: ['Night shift', 'Nachtdienst'],
  free: ['Day off', 'Frei'],
  vacation: ['Vacation', 'Urlaub'],
  sick: ['Sick leave', 'Krank'],
  training: ['Training', 'Fortbildung'],
  lecture: ['Lecture', 'Unterricht'],
  study: ['Study time', 'Lernzeit'],
  assignment: ['Assignment', 'Aufgabe'],
  exam: ['Exam', 'Prüfung'],
  appointment: ['Appointment', 'Termin'],
  milestone: ['Milestone', 'Meilenstein'],
  personal: ['Personal', 'Persönlich'],
  other: ['Other', 'Sonstiges'],
}

export function calendarCategoryLabel(category: CalendarEventCategory, language: Language): string {
  return labels[category][language === 'de' ? 1 : 0]
}

export function validCalendarColour(value?: string): string {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : '#d37f9c'
}
