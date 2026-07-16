import { useEffect, useMemo, useState } from 'react'
import { BrainCircuit, Check, ChevronRight, Clock3, Pause, Play, RefreshCw, Sparkles } from 'lucide-react'
import { unlockAchievement } from '../lib/achievements'
import { useLanguage } from '../lib/i18n'

const prompts = [
  { en: 'Explain one concept as if you were teaching it to a sleepy study cat.', de: 'Erkläre ein Thema so, als würdest du es einer müden Lernkatze beibringen.' },
  { en: 'Write three things you remember before opening your notes.', de: 'Schreibe drei Dinge auf, an die du dich erinnerst, bevor du deine Notizen öffnest.' },
  { en: 'Choose one nursing skill and describe its purpose in one clear sentence.', de: 'Wähle eine Pflegekompetenz und beschreibe ihren Zweck in einem klaren Satz.' },
  { en: 'Turn today’s hardest idea into one tiny flashcard question.', de: 'Mach aus der schwierigsten Idee von heute eine kleine Karteikartenfrage.' },
  { en: 'Name one thing that went well and one gentle next step.', de: 'Nenne eine Sache, die gut lief, und einen sanften nächsten Schritt.' },
  { en: 'What would future Yuuki be happy you revised for ten minutes today?', de: 'Worüber würde sich die zukünftige Yuuki freuen, wenn du es heute zehn Minuten wiederholst?' },
]

interface ReflectionDraft { win: string; learned: string; next: string }
const EMPTY_REFLECTION: ReflectionDraft = { win: '', learned: '', next: '' }

export function HomeStudyCorner() {
  const { language, text } = useLanguage()
  const [promptIndex, setPromptIndex] = useState(() => Math.floor(Math.random() * prompts.length))
  const [minutes, setMinutes] = useState(15)
  const [seconds, setSeconds] = useState(15 * 60)
  const [running, setRunning] = useState(false)
  const [timerNote, setTimerNote] = useState<'idle' | 'reset' | 'done'>('idle')
  const [reflection, setReflection] = useState<ReflectionDraft>(EMPTY_REFLECTION)
  const [saved, setSaved] = useState(false)
  const storageKey = `nya-gentle-reflection:${new Date().toISOString().slice(0, 10)}`

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) setReflection(JSON.parse(stored) as ReflectionDraft)
    } catch { /* Start with a fresh reflection. */ }
  }, [storageKey])

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1_000)
    return () => window.clearInterval(timer)
  }, [running])

  useEffect(() => {
    if (seconds !== 0) return
    setRunning(false)
    setTimerNote('done')
    setSeconds(minutes * 60)
    unlockAchievement('focus_round')
    window.dispatchEvent(new CustomEvent('nya:surprise', { detail: 'care' }))
  }, [minutes, seconds])

  const clock = useMemo(() => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`, [seconds])

  function chooseMinutes(value: number) {
    setMinutes(value); setSeconds(value * 60); setRunning(false); setTimerNote(value === 5 ? 'reset' : 'idle')
  }

  function saveReflection(event: React.FormEvent) {
    event.preventDefault()
    try { localStorage.setItem(storageKey, JSON.stringify(reflection)) } catch { /* Keep it for this visit. */ }
    setSaved(true)
    unlockAchievement('tiny_reflection')
    window.setTimeout(() => setSaved(false), 2_200)
  }

  return (
    <section className="home-study-corner section-shell">
      <div className="section-heading">
        <div><p className="eyebrow"><BrainCircuit size={15} />{text('Study corner', 'Lernecke')}</p><h2>{text('Useful things, right where you need them', 'Nützliche Dinge genau dort, wo du sie brauchst')}</h2><p>{text('These quick tools stay in this browser. Private owner notes and reflections are never shown publicly.', 'Diese kleinen Werkzeuge bleiben in diesem Browser. Private Owner-Notizen und Reflexionen werden niemals öffentlich gezeigt.')}</p></div>
      </div>
      <div className="home-study-grid">
        <article className="home-focus-card">
          <div className="home-tool-title"><span><Clock3 size={18} /></span><div><small>{text('Quick focus', 'Schneller Fokus')}</small><strong>{text('A tiny timer', 'Ein kleiner Timer')}</strong></div></div>
          <div className="home-timer-modes">{[5, 15, 25].map((value) => <button key={value} type="button" className={minutes === value ? 'is-active' : ''} onClick={() => chooseMinutes(value)}>{value} min</button>)}</div>
          <strong className={running ? 'home-clock is-running' : 'home-clock'}>{clock}</strong>
          <p>{timerNote === 'done' ? text('Focus round complete — tiny win collected ✦', 'Fokusrunde geschafft — kleiner Erfolg gesammelt ✦') : timerNote === 'reset' ? text('A soft reset counts as part of studying.', 'Eine sanfte Pause gehört zum Lernen dazu.') : text('One small task. No pressure, just progress.', 'Eine kleine Aufgabe. Kein Druck, nur Fortschritt.')}</p>
          <div><button type="button" className="button button-primary" onClick={() => setRunning((value) => !value)}>{running ? <Pause size={16} /> : <Play size={16} />}{running ? text('Pause', 'Pause') : text('Start', 'Start')}</button><button type="button" className="button button-secondary" onClick={() => { setRunning(false); setSeconds(minutes * 60) }}><RefreshCw size={15} />{text('Reset', 'Zurücksetzen')}</button></div>
        </article>

        <article className="home-prompt-card">
          <div className="home-tool-title"><span><Sparkles size={18} /></span><div><small>{text('Active recall', 'Aktives Erinnern')}</small><strong>{text('Draw a study prompt', 'Lernimpuls ziehen')}</strong></div></div>
          <blockquote>“{prompts[promptIndex][language]}”</blockquote>
          <button type="button" onClick={() => setPromptIndex((index) => (index + 1 + Math.floor(Math.random() * (prompts.length - 1))) % prompts.length)}><RefreshCw size={15} />{text('Draw another prompt', 'Anderen Impuls ziehen')}</button>
          <i aria-hidden="true">✦</i><i aria-hidden="true">♡</i>
        </article>

        <article className="home-reflection-card">
          <div className="home-tool-title"><span><Check size={18} /></span><div><small>{text('Private to this browser', 'Privat in diesem Browser')}</small><strong>{text('Gentle reflection', 'Sanfte Reflexion')}</strong></div></div>
          <form onSubmit={saveReflection}>
            <label>{text('One win', 'Ein Erfolg')}<input value={reflection.win} onChange={(event) => setReflection((current) => ({ ...current, win: event.target.value }))} placeholder={text('Something that went well…', 'Etwas, das gut lief…')} /></label>
            <label>{text('What I learned', 'Was ich gelernt habe')}<input value={reflection.learned} onChange={(event) => setReflection((current) => ({ ...current, learned: event.target.value }))} placeholder={text('One useful thought…', 'Ein hilfreicher Gedanke…')} /></label>
            <label>{text('Next tiny step', 'Nächster kleiner Schritt')}<input value={reflection.next} onChange={(event) => setReflection((current) => ({ ...current, next: event.target.value }))} placeholder={text('Keep it manageable…', 'Machbar halten…')} /></label>
            <button type="submit" className="button button-primary">{saved ? <Check size={16} /> : <ChevronRight size={16} />}{saved ? text('Saved privately', 'Privat gespeichert') : text('Save reflection', 'Reflexion speichern')}</button>
          </form>
        </article>
      </div>
    </section>
  )
}
