import type { CalendarEvent, PlannerTask, ShiftTemplate, StickyNote } from '../types'

function dateFromNow(days: number): string {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const now = new Date().toISOString()

export const DEMO_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: 'demo_event_welcome', title: 'Prepare the learning portfolio',
    description: 'Set up the first subjects, folders and goals for the start of training.',
    date: dateFromNow(4), time: '16:00', category: 'milestone', colour: '#d37f9c', visibility: 'public', createdAt: now, updatedAt: now,
  },
  {
    id: 'demo_event_training', title: 'Training begins',
    description: 'The first chapter of the nursing training journey.',
    date: dateFromNow(15), category: 'school', colour: '#cfa8f5', visibility: 'public', createdAt: now, updatedAt: now,
  },
  {
    id: 'demo_event_review', title: 'Weekly review and planning',
    description: 'Review notes, tidy the library and plan the next week.',
    date: dateFromNow(9), time: '18:00', category: 'personal', colour: '#8ab69c', visibility: 'private', createdAt: now, updatedAt: now,
  },
]

export const DEMO_SHIFT_TEMPLATES: ShiftTemplate[] = [
  { id: 'shift_school', title: 'Schule', shortLabel: 'S', description: '', startTime: '07:30', category: 'school', colour: '#cfa8f5', visibility: 'private', createdAt: now, updatedAt: now },
  { id: 'shift_early', title: 'Frühschicht', shortLabel: 'F', description: '', startTime: '06:00', endTime: '14:00', category: 'early_shift', colour: '#e79ac3', visibility: 'private', createdAt: now, updatedAt: now },
  { id: 'shift_late', title: 'Spätschicht', shortLabel: 'S', description: '', startTime: '13:30', endTime: '21:30', category: 'late_shift', colour: '#e99a68', visibility: 'private', createdAt: now, updatedAt: now },
  { id: 'shift_night', title: 'Nachtdienst', shortLabel: 'N', description: '', startTime: '21:00', endTime: '06:30', category: 'night_shift', colour: '#7483c1', visibility: 'private', createdAt: now, updatedAt: now },
  { id: 'shift_free', title: 'Frei', shortLabel: 'F', description: '', category: 'free', colour: '#e51f68', visibility: 'private', createdAt: now, updatedAt: now },
  { id: 'shift_vacation', title: 'Urlaub', shortLabel: 'U', description: '', category: 'vacation', colour: '#b9dda1', visibility: 'private', createdAt: now, updatedAt: now },
  { id: 'shift_sick', title: 'Krank', shortLabel: 'K', description: '', category: 'sick', colour: '#d96f73', visibility: 'private', createdAt: now, updatedAt: now },
]

export const DEMO_STICKY_NOTES: StickyNote[] = [
  { id: 'demo_sticky_1', text: 'Keep notes simple enough to revise on the train ♡', colour: 'pink', createdAt: now, updatedAt: now },
  { id: 'demo_sticky_2', text: 'Add the first school timetable when it arrives.', colour: 'yellow', createdAt: now, updatedAt: now },
  { id: 'demo_sticky_3', text: 'Progress counts, even when it feels small.', colour: 'sage', createdAt: now, updatedAt: now },
]

export const DEMO_TASKS: PlannerTask[] = [
  { id: 'demo_task_1', title: 'Choose the first learning categories', dueDate: dateFromNow(3), priority: 'normal', completed: false, createdAt: now, updatedAt: now },
  { id: 'demo_task_2', title: 'Create a welcome presentation', dueDate: dateFromNow(6), priority: 'high', completed: false, createdAt: now, updatedAt: now },
]
