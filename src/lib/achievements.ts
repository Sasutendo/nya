export type AchievementId =
  | 'first_visit' | 'desk_curator' | 'nya_whisper' | 'rhythm_combo' | 'code_care'
  | 'care_heart' | 'moonlit_path' | 'study_cat' | 'coffee_break' | 'dark_dream'
  | 'tiny_reflection' | 'focus_round' | 'princess_mode' | 'classic_code'
  | 'polyglot_heart' | 'strawberry_patch' | 'star_gazer' | 'block_builder'
  | 'music_loop' | 'pride_bloom' | 'vr_portal'

export interface AchievementDefinition {
  id: AchievementId
  icon: string
  title: string
  hint: string
  titleDe: string
  hintDe: string
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: 'first_visit', icon: '♡', title: 'Welcome, wanderer', hint: 'A floating heart waits near the beginning of the corner.', titleDe: 'Willkommen, Wanderer', hintDe: 'Am Anfang der Lernecke schwebt ein kleines Herz.' },
  { id: 'desk_curator', icon: '✎', title: 'Desk curator', hint: 'Refresh the little desk notes a few times.', titleDe: 'Schreibtisch-Kuratorin', hintDe: 'Misch die kleinen Notizen auf dem Lerntisch ein paarmal neu.' },
  { id: 'nya_whisper', icon: '✦', title: 'Nya whisper', hint: 'The tiny profile in the header likes attention.', titleDe: 'Nya-Flüstern', hintDe: 'Das kleine Profilbild im Kopfbereich freut sich über Aufmerksamkeit.' },
  { id: 'rhythm_combo', icon: '○', title: 'Perfect combo', hint: 'There is a suspicious combo sticker near the first slide.', titleDe: 'Perfekte Combo', hintDe: 'Neben der ersten Folie klebt eine verdächtige Combo.' },
  { id: 'code_care', icon: '</>', title: 'Code & care', hint: 'The copyright line contains a little developer secret.', titleDe: 'Code & Pflege', hintDe: 'In der Copyright-Zeile steckt ein kleines Entwicklergeheimnis.' },
  { id: 'care_heart', icon: '+', title: 'Care heart', hint: 'A tiny medical cross is hiding near the presentation preview.', titleDe: 'Pflegeherz', hintDe: 'Neben der Präsentationsvorschau versteckt sich ein kleines Pflegekreuz.' },
  { id: 'moonlit_path', icon: '☾', title: 'Moonlit path', hint: 'A page ribbon may open after three gentle taps.', titleDe: 'Pfad im Mondlicht', hintDe: 'Ein Seitenbändchen öffnet sich vielleicht nach drei sanften Klicks.' },
  { id: 'study_cat', icon: 'ฅ', title: 'Study cat', hint: 'A tiny animal is hiding around every page.', titleDe: 'Lernkatze', hintDe: 'Auf jeder Seite versteckt sich ein kleines Tier.' },
  { id: 'coffee_break', icon: '☕', title: 'Warm checkpoint', hint: 'The note shuffle eventually asks for a drink break.', titleDe: 'Warmer Checkpoint', hintDe: 'Beim Notizen-Mischen wird irgendwann eine Getränkepause fällig.' },
  { id: 'dark_dream', icon: '●', title: 'Dark dream', hint: 'Let the corner rest in its darker colours.', titleDe: 'Dunkler Traum', hintDe: 'Lass die Ecke in dunkleren Farben ruhen.' },
  { id: 'tiny_reflection', icon: '✎', title: 'A look back', hint: 'Open one of Yuuki’s published reflection highlights.', titleDe: 'Ein Blick zurück', hintDe: 'Lies einen Rückblick aus Yuukis Projekten.' },
  { id: 'focus_round', icon: '◷', title: 'End of the deck', hint: 'Stay with a presentation until its final slide.', titleDe: 'Ende der Präsentation', hintDe: 'Bleib bei einer Präsentation bis zur letzten Folie.' },
  { id: 'princess_mode', icon: '♛', title: 'Do not wake the princess', hint: 'The larger profile picture knows who wears the crown.', titleDe: 'Weck die Prinzessin nicht', hintDe: 'Das große Profilbild weiß, wem die Krone gehört.' },
  { id: 'classic_code', icon: '↑', title: 'Old-school secret', hint: 'A famous sequence begins up, up, down, down…', titleDe: 'Oldschool-Geheimnis', hintDe: 'Eine berühmte Folge beginnt hoch, hoch, runter, runter …' },
  { id: 'polyglot_heart', icon: 'あ', title: 'Three-language heart', hint: 'DE, EN and 日本語 all fit in this corner.', titleDe: 'Herz in drei Sprachen', hintDe: 'DE, EN und 日本語 passen alle in diese Lernecke.' },
  { id: 'strawberry_patch', icon: '🍓', title: 'Strawberry patch', hint: 'One tiny berry is hiding among the footer charms.', titleDe: 'Erdbeerbeet', hintDe: 'Zwischen den Anhängern unten versteckt sich eine kleine Erdbeere.' },
  { id: 'star_gazer', icon: '✦', title: 'Quiet stargazer', hint: 'Find a little star for calm late-night thoughts.', titleDe: 'Leise Sternenguckerin', hintDe: 'Finde einen kleinen Stern für ruhige Gedanken spät in der Nacht.' },
  { id: 'block_builder', icon: '▣', title: 'Cozy block builder', hint: 'A square charm remembers creative survival worlds.', titleDe: 'Gemütliche Blockbauerin', hintDe: 'Ein eckiger Anhänger erinnert an kreative Blockwelten.' },
  { id: 'music_loop', icon: '♫', title: 'Always one more song', hint: 'The footer has its own tiny soundtrack.', titleDe: 'Noch ein Lied', hintDe: 'Unten auf der Seite wartet ein kleiner Soundtrack.' },
  { id: 'pride_bloom', icon: '⚧', title: 'Bloom as yourself', hint: 'A soft blue, pink and white glow belongs here.', titleDe: 'Blüh so, wie du bist', hintDe: 'Ein sanftes Leuchten in Blau, Rosa und Weiß gehört hierher.' },
  { id: 'vr_portal', icon: '◇', title: 'Portal hopping', hint: 'A diamond-shaped charm opens a social VR portal.', titleDe: 'Portalhüpferin', hintDe: 'Ein rautenförmiger Anhänger öffnet ein Social-VR-Portal.' },
]

// Versioned so this release starts with a clean collection while the interaction system is tested.
const STORAGE_KEY = 'nya-achievements-v3'

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
    polyglot: 'polyglot_heart', strawberry: 'strawberry_patch', space: 'star_gazer', block: 'block_builder',
    music: 'music_loop', pride: 'pride_bloom', vr: 'vr_portal',
  }[kind] as AchievementId | undefined
}

export function resetAchievements(): void {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* The in-memory view can still refresh. */ }
  window.dispatchEvent(new CustomEvent('nya:achievement-reset'))
}

export function unlockEggAchievement(kind: string): boolean {
  const achievement = achievementForEgg(kind)
  return achievement ? unlockAchievement(achievement) : false
}

export function showEasterEgg(kind: string): void {
  window.dispatchEvent(new CustomEvent('nya:surprise', { detail: { kind } }))
}
