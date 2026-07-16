import type { CalendarEvent, PlannerTask, StickyNote } from '../types'

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
    date: dateFromNow(4), time: '16:00', category: 'milestone', visibility: 'public', createdAt: now, updatedAt: now,
  },
  {
    id: 'demo_event_training', title: 'Training begins',
    description: 'The first chapter of the nursing training journey.',
    date: dateFromNow(15), category: 'school', visibility: 'public', createdAt: now, updatedAt: now,
  },
  {
    id: 'demo_event_review', title: 'Weekly review and planning',
    description: 'Review notes, tidy the library and plan the next week.',
    date: dateFromNow(9), time: '18:00', category: 'personal', visibility: 'private', createdAt: now, updatedAt: now,
  },
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
