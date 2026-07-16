import type { StickyNoteColour } from '../types'

export interface CuteNote {
  label: string
  text: string
  colour: StickyNoteColour
}

export const CUTE_STICKY_NOTES: CuteNote[] = [
  { label: 'Tiny win', text: 'Tiny progress is still progress. Keep the combo going ♡', colour: 'pink' },
  { label: 'Future nurse', text: 'Gentle hands, a sharp mind and a kind heart make a lovely team.', colour: 'peach' },
  { label: 'Care note', text: 'Rest, water and food belong in the care plan too — including yours.', colour: 'yellow' },
  { label: 'Study spell', text: 'Read it, explain it, practise it, then let your brain breathe.', colour: 'lilac' },
  { label: 'Nursing mode', text: 'One skill at a time. Your future patients will be glad you kept going.', colour: 'sage' },
  { label: 'Cozy quest', text: 'Finish one focused chapter, then claim a tiny gaming break.', colour: 'pink' },
  { label: 'Anatomy quest', text: 'Name it, locate it, explain its job — anatomy combo complete ✦', colour: 'yellow' },
  { label: 'Nya reminder', text: 'You do not have to learn everything today. Just learn the next thing.', colour: 'lilac' },
  { label: 'Practice note', text: 'Slow is smooth. Smooth becomes safe. Safe care always comes first.', colour: 'sage' },
  { label: 'Soft reset', text: 'Coffee, stretch, deep breath, continue. No dramatic boss fight required.', colour: 'peach' },
  { label: 'Coder brain', text: 'Care heart + coder brain = excellent troubleshooting energy.', colour: 'pink' },
  { label: 'After placement', text: 'What went well? What felt hard? What will future Yuuki try next?', colour: 'lilac' },
  { label: 'Pocket check', text: 'Pen, watch, water, notes, courage — ready for the next shift.', colour: 'yellow' },
  { label: 'Clinical clue', text: 'Observe first, ask clearly, document carefully, never be afraid to check.', colour: 'sage' },
  { label: 'Eepy wisdom', text: 'A rested brain remembers more. Being eepy is valid; plan the pause.', colour: 'peach' },
  { label: 'Cat-approved', text: 'Curiosity is a nursing skill. Keep asking why, little study cat.', colour: 'pink' },
]

export function notesForCycle(cycle: number, amount = 3): CuteNote[] {
  return Array.from({ length: amount }, (_, index) => CUTE_STICKY_NOTES[(cycle + index * 5) % CUTE_STICKY_NOTES.length])
}
