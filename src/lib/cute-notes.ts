import type { StickyNoteColour } from '../types'

export interface CuteNote {
  label: string
  text: string
  labelDe: string
  textDe: string
  colour: StickyNoteColour
}

export const CUTE_STICKY_NOTES: CuteNote[] = [
  { label: 'Tiny win', text: 'Tiny progress is still progress. Keep the combo going ♡', labelDe: 'Kleiner Erfolg', textDe: 'Auch kleiner Fortschritt ist Fortschritt. Halte die Combo am Laufen ♡', colour: 'pink' },
  { label: 'Future nurse', text: 'Gentle hands, a sharp mind and a kind heart make a lovely team.', labelDe: 'Zukünftige Pflegefachkraft', textDe: 'Sanfte Hände, ein klarer Kopf und ein gutes Herz sind ein starkes Team.', colour: 'peach' },
  { label: 'Care note', text: 'Rest, water and food belong in the care plan too — including yours.', labelDe: 'Fürsorge-Notiz', textDe: 'Ruhe, Wasser und Essen gehören auch in deinen eigenen Pflegeplan.', colour: 'yellow' },
  { label: 'Study spell', text: 'Read it, explain it, practise it, then let your brain breathe.', labelDe: 'Lernzauber', textDe: 'Lesen, erklären, üben — und dann dem Kopf eine Pause geben.', colour: 'lilac' },
  { label: 'Nursing mode', text: 'One skill at a time. Your future patients will be glad you kept going.', labelDe: 'Pflegemodus', textDe: 'Eine Fähigkeit nach der anderen. Deine zukünftigen Patient:innen werden froh sein, dass du drangeblieben bist.', colour: 'sage' },
  { label: 'Cozy quest', text: 'Finish one focused chapter, then claim a tiny gaming break.', labelDe: 'Gemütliche Quest', textDe: 'Ein Kapitel konzentriert beenden, dann eine kleine Gaming-Pause abholen.', colour: 'pink' },
  { label: 'Anatomy quest', text: 'Name it, locate it, explain its job — anatomy combo complete ✦', labelDe: 'Anatomie-Quest', textDe: 'Benennen, finden, Funktion erklären — Anatomie-Combo geschafft ✦', colour: 'yellow' },
  { label: 'Nya reminder', text: 'You do not have to learn everything today. Just learn the next thing.', labelDe: 'Nya erinnert', textDe: 'Du musst heute nicht alles lernen. Nur das Nächste.', colour: 'lilac' },
  { label: 'Practice note', text: 'Slow is smooth. Smooth becomes safe. Safe care always comes first.', labelDe: 'Praxis-Notiz', textDe: 'Langsam wird sicher. Sichere Pflege kommt immer zuerst.', colour: 'sage' },
  { label: 'Soft reset', text: 'Coffee, stretch, deep breath, continue. No dramatic boss fight required.', labelDe: 'Sanfter Neustart', textDe: 'Kaffee, strecken, tief atmen, weiter. Kein dramatischer Bosskampf nötig.', colour: 'peach' },
  { label: 'Coder brain', text: 'Care heart + coder brain = excellent troubleshooting energy.', labelDe: 'Coder-Gehirn', textDe: 'Pflegeherz + Coder-Gehirn = starke Problemlöse-Energie.', colour: 'pink' },
  { label: 'After placement', text: 'What went well? What felt hard? What will future Yuuki try next?', labelDe: 'Nach dem Einsatz', textDe: 'Was lief gut? Was war schwer? Was probiert die zukünftige Yuuki als Nächstes?', colour: 'lilac' },
  { label: 'Pocket check', text: 'Pen, watch, water, notes, courage — ready for the next shift.', labelDe: 'Taschen-Check', textDe: 'Stift, Uhr, Wasser, Notizen, Mut — bereit für den nächsten Dienst.', colour: 'yellow' },
  { label: 'Clinical clue', text: 'Observe first, ask clearly, document carefully, never be afraid to check.', labelDe: 'Praxis-Hinweis', textDe: 'Erst beobachten, klar fragen, sorgfältig dokumentieren und immer nachprüfen.', colour: 'sage' },
  { label: 'Eepy wisdom', text: 'A rested brain remembers more. Being eepy is valid; plan the pause.', labelDe: 'Müde Weisheit', textDe: 'Ein erholter Kopf merkt sich mehr. Müde sein ist okay — plane die Pause.', colour: 'peach' },
  { label: 'Cat-approved', text: 'Curiosity is a nursing skill. Keep asking why, little study cat.', labelDe: 'Von der Katze geprüft', textDe: 'Neugier ist eine Pflegekompetenz. Frag weiter nach dem Warum, kleine Lernkatze.', colour: 'pink' },
]

export function notesForCycle(cycle: number, amount = 3): CuteNote[] {
  return Array.from({ length: amount }, (_, index) => CUTE_STICKY_NOTES[(cycle + index * 5) % CUTE_STICKY_NOTES.length])
}
