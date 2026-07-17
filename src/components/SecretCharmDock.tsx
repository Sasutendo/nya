import { showEasterEgg, unlockAchievement, unlockEggAchievement, type AchievementId } from '../lib/achievements'
import { useLanguage } from '../lib/i18n'

const charms: Array<{ glyph: string; kind: string; achievement?: AchievementId; en: string; de: string }> = [
  { glyph: '♡', kind: 'nya', achievement: 'first_visit', en: 'a tiny welcome heart', de: 'ein kleines Willkommensherz' },
  { glyph: '猫', kind: 'yuuki', achievement: 'nya_whisper', en: 'Yuuki’s little cat-name spell', de: 'Yuukis kleiner Katzen-Namenszauber' },
  { glyph: '○', kind: 'osu', en: 'a suspicious rhythm circle', de: 'ein verdächtiger Rhythmuskreis' },
  { glyph: '+', kind: 'care', en: 'a pocket-sized care cross', de: 'ein winziges Pflegekreuz' },
  { glyph: '☾', kind: 'sasu', en: 'a moonlit charm', de: 'ein Anhänger im Mondlicht' },
  { glyph: '</>', kind: 'code', en: 'a little code spell', de: 'ein kleiner Coding-Zauber' },
  { glyph: 'あ', kind: 'polyglot', en: 'three languages in one heart', de: 'drei Sprachen in einem Herz' },
  { glyph: '🍓', kind: 'strawberry', en: 'a shy strawberry', de: 'eine schüchterne Erdbeere' },
  { glyph: '✦', kind: 'space', en: 'a quiet star', de: 'ein leiser Stern' },
  { glyph: '▣', kind: 'block', en: 'a cozy little block', de: 'ein gemütlicher kleiner Block' },
  { glyph: '♫', kind: 'music', en: 'one more song', de: 'noch ein Lied' },
  { glyph: '⚧', kind: 'pride', en: 'a soft pride bloom', de: 'ein sanftes Pride-Leuchten' },
  { glyph: '◇', kind: 'vr', en: 'a portal to another world', de: 'ein Portal in eine andere Welt' },
  { glyph: '☕', kind: 'coffee', en: 'a warm drink checkpoint', de: 'ein warmer Getränke-Checkpoint' },
  { glyph: 'ฅ', kind: 'cat', en: 'the eepy study cat', de: 'die müde Lernkatze' },
  { glyph: '✎', kind: 'coffee', achievement: 'desk_curator', en: 'the sticky-note curator', de: 'die Kuratorin der Klebezettel' },
  { glyph: '♛', kind: 'princess', en: 'the eepy princess crown', de: 'die Krone der müden Prinzessin' },
  { glyph: '✿', kind: 'anime', en: 'an opening-sequence flower', de: 'eine Blume aus dem Anime-Opening' },
]

export function SecretCharmDock() {
  const { language, text } = useLanguage()

  function activate(charm: typeof charms[number]) {
    if (charm.achievement) unlockAchievement(charm.achievement)
    else unlockEggAchievement(charm.kind)
    showEasterEgg(charm.kind)
  }

  return <div className="secret-charm-dock" aria-label={text('Yuuki’s tiny secret charm collection', 'Yuukis kleine geheime Anhängersammlung')}>
    <small>{text('tiny charm shelf', 'kleines Anhängerregal')}</small>
    <div>{charms.map((charm) => <button key={charm.kind} type="button" onClick={() => activate(charm)} title={language === 'de' ? charm.de : charm.en} aria-label={language === 'de' ? charm.de : charm.en}>{charm.glyph}</button>)}</div>
  </div>
}
