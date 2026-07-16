export type AchievementId =
  | 'first_visit' | 'secret_button' | 'nya_whisper' | 'rhythm_combo' | 'code_care'
  | 'care_heart' | 'moonlit_path' | 'study_cat' | 'coffee_break' | 'dark_dream'
  | 'tiny_reflection' | 'focus_round' | 'princess_mode' | 'classic_code'

export interface AchievementDefinition {
  id: AchievementId
  icon: string
  title: string
  hint: string
  titleDe: string
  hintDe: string
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: 'first_visit', icon: '♡', title: 'Welcome, wanderer', hint: 'Find the beginning of the corner.', titleDe: 'Willkommen, Wanderer', hintDe: 'Finde den Anfang dieser Ecke.' },
  { id: 'secret_button', icon: 'N', title: 'The little N', hint: 'A footer mark is more than decoration.', titleDe: 'Das kleine N', hintDe: 'Ein Zeichen im Footer ist mehr als Dekoration.' },
  { id: 'nya_whisper', icon: '✦', title: 'Nya whisper', hint: 'Type the sound of the corner.', titleDe: 'Nya-Flüstern', hintDe: 'Tippe den Klang dieser Ecke.' },
  { id: 'rhythm_combo', icon: '○', title: 'Perfect combo', hint: 'Type the name of Yuuki’s favourite rhythm game.', titleDe: 'Perfekte Combo', hintDe: 'Tippe den Namen von Yuukis liebem Rhythmusspiel.' },
  { id: 'code_care', icon: '</>', title: 'Code & care', hint: 'Summon the coder brain with four letters.', titleDe: 'Code & Pflege', hintDe: 'Rufe das Coder-Gehirn mit vier Buchstaben.' },
  { id: 'care_heart', icon: '+', title: 'Care heart', hint: 'The reason this learning journey exists.', titleDe: 'Pflegeherz', hintDe: 'Der Grund für diese Lernreise.' },
  { id: 'moonlit_path', icon: '☾', title: 'Moonlit path', hint: 'One of Yuuki’s shorter names opens it.', titleDe: 'Pfad im Mondlicht', hintDe: 'Einer von Yuukis kürzeren Namen öffnet ihn.' },
  { id: 'study_cat', icon: 'ฅ', title: 'Study cat', hint: 'A tiny animal is hiding around every page.', titleDe: 'Lernkatze', hintDe: 'Auf jeder Seite versteckt sich ein kleines Tier.' },
  { id: 'coffee_break', icon: '☕', title: 'Warm checkpoint', hint: 'Type the coziest study drink.', titleDe: 'Warmer Checkpoint', hintDe: 'Tippe das gemütlichste Lerngetränk.' },
  { id: 'dark_dream', icon: '●', title: 'Dark dream', hint: 'Let the corner rest in its darker colours.', titleDe: 'Dunkler Traum', hintDe: 'Lass die Ecke in dunkleren Farben ruhen.' },
  { id: 'tiny_reflection', icon: '✎', title: 'Dear future me', hint: 'Save one gentle thought on the main page.', titleDe: 'Liebes zukünftiges Ich', hintDe: 'Speichere einen sanften Gedanken auf der Startseite.' },
  { id: 'focus_round', icon: '◷', title: 'Tiny focus win', hint: 'Let a focus timer reach its ending.', titleDe: 'Kleiner Fokus-Erfolg', hintDe: 'Lass einen Fokus-Timer sein Ende erreichen.' },
  { id: 'princess_mode', icon: '♛', title: 'Do not wake the princess', hint: 'Type what a crown might call its owner.', titleDe: 'Weck die Prinzessin nicht', hintDe: 'Tippe, wie eine Krone ihre Besitzerin nennen könnte.' },
  { id: 'classic_code', icon: '↑', title: 'Old-school secret', hint: 'A famous sequence begins up, up, down, down…', titleDe: 'Oldschool-Geheimnis', hintDe: 'Eine berühmte Folge beginnt hoch, hoch, runter, runter …' },
]

const STORAGE_KEY = 'nya-achievements-v1'

export function getUnlockedAchievements(): AchievementId[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as string[]
    return ACHIEVEMENTS.map((achievement) => achievement.id).filter((id) => parsed.includes(id))
  } catch { return [] }
}

export function unlockAchievement(id: AchievementId): boolean {
  const unlocked = getUnlockedAchievements()
  if (unlocked.includes(id)) return false
  const next = [...unlocked, id]
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* It still unlocks for this visit. */ }
  window.dispatchEvent(new CustomEvent('nya:achievement', { detail: { id, unlocked: next } }))
  return true
}

export function achievementForEgg(kind: string): AchievementId | undefined {
  return {
    nya: 'nya_whisper', osu: 'rhythm_combo', code: 'code_care', care: 'care_heart', sasu: 'moonlit_path',
    cat: 'study_cat', coffee: 'coffee_break', princess: 'princess_mode',
  }[kind] as AchievementId | undefined
}
