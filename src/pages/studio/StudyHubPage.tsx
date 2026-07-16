import { useEffect, useState } from 'react'
import {
  BrainCircuit, Check, ChevronLeft, ChevronRight, CircleDot, Clock3, Layers3, LoaderCircle,
  Pause, Play, Plus, RefreshCw, RotateCcw, Sparkles, Stethoscope, Trash2,
} from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { EmptyState, ErrorNotice, LoadingState } from '../../components/Feedback'
import { adminApi } from '../../lib/api'
import { newId } from '../../lib/format'
import { unlockAchievement } from '../../lib/achievements'
import type { NursingSkill, NursingSkillStatus, StudyCard, StudyHubData, StudyReflection } from '../../types'
import { StudioNav, useStudioSession } from './StudioPages'

const EMPTY_DATA: StudyHubData = { cards: [], skills: [], reflections: [] }
const timerModes = [
  { id: 'focus', label: 'Focus', minutes: 25 },
  { id: 'reset', label: 'Soft reset', minutes: 5 },
  { id: 'deep', label: 'Deep study', minutes: 50 },
] as const
type TimerMode = typeof timerModes[number]['id']

const skillStatusCopy: Record<NursingSkillStatus, { label: string; next: NursingSkillStatus }> = {
  learning: { label: 'Learning', next: 'practising' },
  practising: { label: 'Practising', next: 'confident' },
  confident: { label: 'Confident', next: 'learning' },
}

function today(): string { return new Date().toISOString().slice(0, 10) }

export function StudyHubPage() {
  const session = useStudioSession()
  const [data, setData] = useState<StudyHubData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [timerMode, setTimerMode] = useState<TimerMode>('focus')
  const timerMinutes = timerModes.find((mode) => mode.id === timerMode)?.minutes || 25
  const [seconds, setSeconds] = useState(timerMinutes * 60)
  const [timerRunning, setTimerRunning] = useState(false)
  const [focusRounds, setFocusRounds] = useState(0)
  const [timerMessage, setTimerMessage] = useState('Pick one small goal before pressing start.')

  const [cardIndex, setCardIndex] = useState(0)
  const [cardFlipped, setCardFlipped] = useState(false)
  const [cardQuestion, setCardQuestion] = useState('')
  const [cardAnswer, setCardAnswer] = useState('')
  const [cardCategory, setCardCategory] = useState('General')

  const [skillTitle, setSkillTitle] = useState('')
  const [skillCategory, setSkillCategory] = useState('Core care')
  const [skillNotes, setSkillNotes] = useState('')

  const [reflectionDate, setReflectionDate] = useState(today())
  const [reflectionWin, setReflectionWin] = useState('')
  const [reflectionLearned, setReflectionLearned] = useState('')
  const [reflectionRevisit, setReflectionRevisit] = useState('')

  useEffect(() => {
    if (!session?.authenticated) return
    adminApi.studyHub().then(setData).catch((reason) => setError(reason.message)).finally(() => setLoading(false))
  }, [session])

  useEffect(() => {
    if (!timerRunning) return
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1_000)
    return () => window.clearInterval(timer)
  }, [timerRunning])

  useEffect(() => {
    if (seconds !== 0) return
    setTimerRunning(false)
    setFocusRounds((rounds) => rounds + 1)
    unlockAchievement('focus_round')
    setTimerMessage(timerMode === 'reset' ? 'Soft reset complete — welcome back ♡' : 'Focus round complete — tiny win collected ✦')
    setSeconds(timerMinutes * 60)
    window.dispatchEvent(new CustomEvent('nya:surprise', { detail: 'care' }))
  }, [seconds, timerMinutes, timerMode])

  const currentCard = data.cards.length ? data.cards[cardIndex % data.cards.length] : undefined
  const confidentSkills = data.skills.filter((skill) => skill.status === 'confident').length
  const skillProgress = data.skills.length ? Math.round((confidentSkills / data.skills.length) * 100) : 0
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  function chooseTimerMode(mode: typeof timerModes[number]) {
    setTimerMode(mode.id)
    setSeconds(mode.minutes * 60)
    setTimerRunning(false)
    setTimerMessage(mode.id === 'reset' ? 'Breathe, stretch, hydrate. This pause counts.' : 'Pick one small goal before pressing start.')
  }

  async function addCard(event: React.FormEvent) {
    event.preventDefault()
    if (!cardQuestion.trim() || !cardAnswer.trim()) return
    const time = new Date().toISOString()
    const card: StudyCard = { id: newId('card'), question: cardQuestion.trim(), answer: cardAnswer.trim(), category: cardCategory.trim() || 'General', createdAt: time, updatedAt: time }
    try {
      const result = await adminApi.saveStudyCard(card, true)
      setData((current) => ({ ...current, cards: [result.card, ...current.cards] }))
      setCardQuestion(''); setCardAnswer(''); setCardIndex(0); setCardFlipped(false)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The card could not be saved.') }
  }

  async function removeCard(card: StudyCard) {
    if (!window.confirm('Delete this flashcard?')) return
    try {
      await adminApi.removeStudyCard(card.id)
      setData((current) => ({ ...current, cards: current.cards.filter((candidate) => candidate.id !== card.id) }))
      setCardIndex(0); setCardFlipped(false)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The card could not be deleted.') }
  }

  function moveCard(direction: number) {
    if (!data.cards.length) return
    setCardIndex((index) => (index + direction + data.cards.length) % data.cards.length)
    setCardFlipped(false)
  }

  async function addSkill(event: React.FormEvent) {
    event.preventDefault()
    if (!skillTitle.trim()) return
    const time = new Date().toISOString()
    const skill: NursingSkill = { id: newId('skill'), title: skillTitle.trim(), category: skillCategory.trim() || 'General', status: 'learning', notes: skillNotes.trim(), createdAt: time, updatedAt: time }
    try {
      const result = await adminApi.saveNursingSkill(skill, true)
      setData((current) => ({ ...current, skills: [result.skill, ...current.skills] }))
      setSkillTitle(''); setSkillNotes('')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The skill could not be saved.') }
  }

  async function advanceSkill(skill: NursingSkill) {
    const updated = { ...skill, status: skillStatusCopy[skill.status].next, updatedAt: new Date().toISOString() }
    try {
      const result = await adminApi.saveNursingSkill(updated)
      setData((current) => ({ ...current, skills: current.skills.map((candidate) => candidate.id === skill.id ? result.skill : candidate) }))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The skill could not be updated.') }
  }

  async function removeSkill(skill: NursingSkill) {
    if (!window.confirm(`Remove “${skill.title}” from the tracker?`)) return
    try {
      await adminApi.removeNursingSkill(skill.id)
      setData((current) => ({ ...current, skills: current.skills.filter((candidate) => candidate.id !== skill.id) }))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The skill could not be removed.') }
  }

  async function addReflection(event: React.FormEvent) {
    event.preventDefault()
    if (!reflectionWin.trim() && !reflectionLearned.trim() && !reflectionRevisit.trim()) return
    const time = new Date().toISOString()
    const reflection: StudyReflection = { id: newId('reflection'), date: reflectionDate, win: reflectionWin.trim(), learned: reflectionLearned.trim(), revisit: reflectionRevisit.trim(), createdAt: time, updatedAt: time }
    try {
      const result = await adminApi.saveReflection(reflection, true)
      setData((current) => ({ ...current, reflections: [result.reflection, ...current.reflections] }))
      setReflectionWin(''); setReflectionLearned(''); setReflectionRevisit('')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The reflection could not be saved.') }
  }

  async function removeReflection(reflection: StudyReflection) {
    if (!window.confirm('Delete this reflection?')) return
    try {
      await adminApi.removeReflection(reflection.id)
      setData((current) => ({ ...current, reflections: current.reflections.filter((candidate) => candidate.id !== reflection.id) }))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The reflection could not be deleted.') }
  }

  if (session === undefined || (session?.authenticated && loading)) return <div className="page-shell section-shell"><LoadingState label="Opening the study hub…" /></div>
  if (!session?.authenticated) return <Navigate to="/studio/login" state={{ from: '/studio/study-hub' }} replace />

  return (
    <div className="study-hub-page page-shell section-shell">
      <header className="studio-header">
        <div><p className="eyebrow"><BrainCircuit size={14} />Private study tools</p><h1>Study hub</h1><p>Active recall, nursing skills, focus rounds and gentle reflection in one cozy place.</p></div>
        <StudioNav />
      </header>

      {error && <ErrorNotice message={error} />}

      <section className="study-overview" aria-label="Study progress">
        <div><Layers3 size={18} /><span><strong>{data.cards.length}</strong><small>flashcards</small></span></div>
        <div><Stethoscope size={18} /><span><strong>{confidentSkills}/{data.skills.length}</strong><small>skills confident</small></span></div>
        <div><Sparkles size={18} /><span><strong>{focusRounds}</strong><small>focus rounds today</small></span></div>
        <div><BrainCircuit size={18} /><span><strong>{data.reflections.length}</strong><small>reflections saved</small></span></div>
      </section>

      <div className="study-hub-grid">
        <section className="study-tool-card focus-tool">
          <div className="study-tool-heading"><span><Clock3 size={19} /></span><div><p className="eyebrow">Focus corner</p><h2>Cozy timer</h2></div></div>
          <div className="timer-modes">{timerModes.map((mode) => <button key={mode.id} type="button" className={timerMode === mode.id ? 'is-active' : ''} onClick={() => chooseTimerMode(mode)}>{mode.label}<small>{mode.minutes} min</small></button>)}</div>
          <div className={`focus-clock${timerRunning ? ' is-running' : ''}`}><strong>{clock}</strong><span>{timerMessage}</span></div>
          <div className="timer-actions"><button type="button" className="button button-primary" onClick={() => setTimerRunning((running) => !running)}>{timerRunning ? <Pause size={17} /> : <Play size={17} />}{timerRunning ? 'Pause' : 'Start focus'}</button><button type="button" className="button button-secondary" onClick={() => { setTimerRunning(false); setSeconds(timerMinutes * 60) }}><RotateCcw size={16} />Reset</button></div>
        </section>

        <section className="study-tool-card flashcard-tool">
          <div className="study-tool-heading"><span><Layers3 size={19} /></span><div><p className="eyebrow">Active recall</p><h2>Flashcards</h2></div></div>
          {currentCard ? <>
            <button type="button" className={`study-flashcard${cardFlipped ? ' is-flipped' : ''}`} onClick={() => setCardFlipped((flipped) => !flipped)} aria-label={cardFlipped ? 'Show question' : 'Show answer'}>
              <small>{currentCard.category} · {cardFlipped ? 'Answer' : 'Question'}</small><strong>{cardFlipped ? currentCard.answer : currentCard.question}</strong><span>Tap to flip</span>
            </button>
            <div className="flashcard-controls"><button type="button" onClick={() => moveCard(-1)} aria-label="Previous card"><ChevronLeft size={18} /></button><span>{cardIndex % data.cards.length + 1} / {data.cards.length}</span><button type="button" onClick={() => moveCard(1)} aria-label="Next card"><ChevronRight size={18} /></button><button type="button" onClick={() => { setCardIndex(Math.floor(Math.random() * data.cards.length)); setCardFlipped(false) }}><RefreshCw size={16} />Shuffle</button><button type="button" onClick={() => removeCard(currentCard)} aria-label="Delete current card"><Trash2 size={16} /></button></div>
          </> : <EmptyState title="No flashcards yet" message="Add the first question below." />}
          <details className="study-composer"><summary><Plus size={16} />Add a flashcard</summary><form onSubmit={addCard}><label>Question<textarea rows={2} value={cardQuestion} onChange={(event) => setCardQuestion(event.target.value)} required /></label><label>Answer<textarea rows={3} value={cardAnswer} onChange={(event) => setCardAnswer(event.target.value)} required /></label><label>Category<input value={cardCategory} onChange={(event) => setCardCategory(event.target.value)} /></label><button className="button button-primary" type="submit"><Plus size={16} />Save card</button></form></details>
        </section>

        <section className="study-tool-card skills-tool">
          <div className="study-tool-heading"><span><Stethoscope size={19} /></span><div><p className="eyebrow">Practice tracker</p><h2>Nursing skills</h2></div><strong className="skill-percentage">{skillProgress}%</strong></div>
          <div className="skill-progress"><i style={{ width: `${skillProgress}%` }} /></div>
          <form className="skill-quick-form" onSubmit={addSkill}><input value={skillTitle} onChange={(event) => setSkillTitle(event.target.value)} placeholder="Add a skill to practise…" required /><input value={skillCategory} onChange={(event) => setSkillCategory(event.target.value)} placeholder="Category" /><textarea rows={2} value={skillNotes} onChange={(event) => setSkillNotes(event.target.value)} placeholder="Optional practice note" /><button className="button button-secondary" type="submit"><Plus size={16} />Track skill</button></form>
          <div className="nursing-skill-list">{data.skills.map((skill) => <article key={skill.id} className={`skill-status-${skill.status}`}><span><CircleDot size={16} /></span><div><small>{skill.category}</small><strong>{skill.title}</strong>{skill.notes && <p>{skill.notes}</p>}</div><button type="button" className="skill-status-button" onClick={() => advanceSkill(skill)} title="Tap to move to the next stage">{skillStatusCopy[skill.status].label}</button><button type="button" className="icon-button" onClick={() => removeSkill(skill)} aria-label={`Remove ${skill.title}`}><Trash2 size={15} /></button></article>)}</div>
        </section>

        <section className="study-tool-card reflection-tool">
          <div className="study-tool-heading"><span><Sparkles size={19} /></span><div><p className="eyebrow">Gentle debrief</p><h2>Daily reflection</h2></div></div>
          <form className="reflection-form" onSubmit={addReflection}><label>Date<input type="date" value={reflectionDate} onChange={(event) => setReflectionDate(event.target.value)} required /></label><label>One win<textarea rows={2} value={reflectionWin} onChange={(event) => setReflectionWin(event.target.value)} placeholder="Something that went well…" /></label><label>What I learned<textarea rows={2} value={reflectionLearned} onChange={(event) => setReflectionLearned(event.target.value)} placeholder="A concept, skill or insight…" /></label><label>Revisit next<textarea rows={2} value={reflectionRevisit} onChange={(event) => setReflectionRevisit(event.target.value)} placeholder="One gentle next step…" /></label><button className="button button-primary" type="submit"><Check size={16} />Save reflection</button></form>
          <div className="reflection-list">{data.reflections.slice(0, 4).map((reflection) => <article key={reflection.id}><div><time dateTime={reflection.date}>{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${reflection.date}T12:00:00`))}</time><button type="button" onClick={() => removeReflection(reflection)} aria-label="Delete reflection"><Trash2 size={14} /></button></div>{reflection.win && <p><strong>Win</strong>{reflection.win}</p>}{reflection.learned && <p><strong>Learned</strong>{reflection.learned}</p>}{reflection.revisit && <p><strong>Next</strong>{reflection.revisit}</p>}</article>)}</div>
        </section>
      </div>
      <p className="study-safety-note"><Stethoscope size={15} />Study aids support your training, but clinical decisions should always follow current school, placement and professional guidance.</p>
    </div>
  )
}
