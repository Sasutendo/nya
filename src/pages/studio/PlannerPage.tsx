import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, ChevronRight, Circle, ClipboardCheck, Eye, EyeOff, LoaderCircle, LockKeyhole, Plus, Sparkles, StickyNote as StickyNoteIcon, Trash2, X } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { EmptyState, ErrorNotice, LoadingState } from '../../components/Feedback'
import { adminApi } from '../../lib/api'
import { newId } from '../../lib/format'
import type { CalendarEvent, CalendarEventCategory, PlannerData, PlannerTask, StickyNote, StickyNoteColour, TaskPriority } from '../../types'
import { StudioNav, useStudioSession } from './StudioPages'

const colours: StickyNoteColour[] = ['pink', 'peach', 'yellow', 'sage', 'lilac']
const categories: CalendarEventCategory[] = ['school', 'placement', 'assignment', 'exam', 'milestone', 'personal']

function today(): string {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function freshEvent(): CalendarEvent {
  const now = new Date().toISOString()
  return { id: newId('event'), title: '', description: '', date: today(), time: '', category: 'school', visibility: 'private', createdAt: now, updatedAt: now }
}

function displayDate(value?: string): string {
  if (!value) return 'No due date'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

export function PlannerPage() {
  const session = useStudioSession()
  const [data, setData] = useState<PlannerData>({ events: [], notes: [], tasks: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingEvent, setSavingEvent] = useState(false)
  const [eventDraft, setEventDraft] = useState<CalendarEvent>(freshEvent)
  const [eventIsNew, setEventIsNew] = useState(true)
  const [stickyText, setStickyText] = useState('')
  const [stickyColour, setStickyColour] = useState<StickyNoteColour>('pink')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDue, setTaskDue] = useState('')
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('normal')

  useEffect(() => {
    if (!session?.authenticated) return
    adminApi.planner().then(setData).catch((reason) => setError(reason.message)).finally(() => setLoading(false))
  }, [session])

  const sortedEvents = useMemo(() => [...data.events].sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')), [data.events])
  const openTasks = data.tasks.filter((task) => !task.completed)
  const completedCount = data.tasks.length - openTasks.length
  const progress = data.tasks.length ? Math.round((completedCount / data.tasks.length) * 100) : 0

  if (session === undefined || loading) return <div className="page-shell section-shell"><LoadingState label="Opening your planner…" /></div>
  if (!session?.authenticated) return <Navigate to="/studio/login" state={{ from: '/studio/planner' }} replace />

  async function saveEvent(event: React.FormEvent) {
    event.preventDefault()
    setSavingEvent(true); setError('')
    try {
      const { event: saved } = await adminApi.saveEvent(eventDraft, eventIsNew)
      setData((current) => ({ ...current, events: eventIsNew ? [...current.events, saved] : current.events.map((entry) => entry.id === saved.id ? saved : entry) }))
      setEventDraft(freshEvent()); setEventIsNew(true)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The event could not be saved.') }
    finally { setSavingEvent(false) }
  }

  async function removeEvent(id: string) {
    if (!window.confirm('Delete this calendar event?')) return
    await adminApi.removeEvent(id)
    setData((current) => ({ ...current, events: current.events.filter((event) => event.id !== id) }))
    if (eventDraft.id === id) { setEventDraft(freshEvent()); setEventIsNew(true) }
  }

  async function addSticky(event: React.FormEvent) {
    event.preventDefault()
    if (!stickyText.trim()) return
    const timestamp = new Date().toISOString()
    const draft: StickyNote = { id: newId('sticky'), text: stickyText.trim(), colour: stickyColour, createdAt: timestamp, updatedAt: timestamp }
    try {
      const { note } = await adminApi.saveSticky(draft, true)
      setData((current) => ({ ...current, notes: [note, ...current.notes] })); setStickyText('')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The sticky note could not be saved.') }
  }

  async function removeSticky(id: string) {
    await adminApi.removeSticky(id)
    setData((current) => ({ ...current, notes: current.notes.filter((note) => note.id !== id) }))
  }

  async function addTask(event: React.FormEvent) {
    event.preventDefault()
    if (!taskTitle.trim()) return
    const timestamp = new Date().toISOString()
    const draft: PlannerTask = { id: newId('task'), title: taskTitle.trim(), dueDate: taskDue || undefined, priority: taskPriority, completed: false, createdAt: timestamp, updatedAt: timestamp }
    try {
      const { task } = await adminApi.saveTask(draft, true)
      setData((current) => ({ ...current, tasks: [task, ...current.tasks] })); setTaskTitle(''); setTaskDue(''); setTaskPriority('normal')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The task could not be saved.') }
  }

  async function toggleTask(task: PlannerTask) {
    const { task: saved } = await adminApi.saveTask({ ...task, completed: !task.completed })
    setData((current) => ({ ...current, tasks: current.tasks.map((entry) => entry.id === saved.id ? saved : entry) }))
  }

  async function removeTask(id: string) {
    await adminApi.removeTask(id)
    setData((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }))
  }

  return (
    <div className="planner-page page-shell section-shell">
      <header className="studio-header planner-header">
        <div><p className="eyebrow"><LockKeyhole size={14} />Private workspace</p><h1>Your cozy planner</h1><p>Keep dates, deadlines and quick thoughts together without making them public unless you choose to.</p></div>
        <StudioNav />
      </header>
      {error && <ErrorNotice message={error} />}

      <section className="planner-overview">
        <div><span><CalendarDays size={17} />Upcoming dates</span><strong>{data.events.filter((event) => (event.endDate || event.date) >= today()).length}</strong><small>{data.events.filter((event) => event.visibility === 'public').length} public</small></div>
        <div><span><ClipboardCheck size={17} />Open tasks</span><strong>{openTasks.length}</strong><small>{completedCount} completed</small></div>
        <div className="planner-progress-card"><span><Sparkles size={17} />Task progress</span><strong>{progress}%</strong><div><i style={{ width: `${progress}%` }} /></div></div>
      </section>

      <div className="planner-grid">
        <section className="planner-panel event-editor-panel">
          <div className="planner-panel-heading"><div><CalendarDays size={19} /><span><strong>{eventIsNew ? 'Add a calendar event' : 'Edit calendar event'}</strong><small>Choose exactly what visitors can see.</small></span></div>{!eventIsNew && <button type="button" onClick={() => { setEventDraft(freshEvent()); setEventIsNew(true) }}><X size={17} />Cancel edit</button>}</div>
          <form onSubmit={saveEvent} className="form-grid compact-form">
            <label className="span-2">Title<input value={eventDraft.title} onChange={(event) => setEventDraft((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. First practical placement" required /></label>
            <label>Date<input type="date" value={eventDraft.date} onChange={(event) => setEventDraft((current) => ({ ...current, date: event.target.value }))} required /></label>
            <label>End date<input type="date" value={eventDraft.endDate || ''} min={eventDraft.date} onChange={(event) => setEventDraft((current) => ({ ...current, endDate: event.target.value || undefined }))} /></label>
            <label>Time<input type="time" value={eventDraft.time || ''} onChange={(event) => setEventDraft((current) => ({ ...current, time: event.target.value || undefined }))} /></label>
            <label>Category<select value={eventDraft.category} onChange={(event) => setEventDraft((current) => ({ ...current, category: event.target.value as CalendarEventCategory }))}>{categories.map((category) => <option key={category} value={category}>{category[0].toUpperCase() + category.slice(1)}</option>)}</select></label>
            <label className="span-2">Description<textarea rows={3} value={eventDraft.description} onChange={(event) => setEventDraft((current) => ({ ...current, description: event.target.value }))} placeholder="A little context for the date…" /></label>
            <label className="visibility-choice span-2"><input type="checkbox" checked={eventDraft.visibility === 'public'} onChange={(event) => setEventDraft((current) => ({ ...current, visibility: event.target.checked ? 'public' : 'private' }))} /><span>{eventDraft.visibility === 'public' ? <Eye size={18} /> : <EyeOff size={18} />}<strong>{eventDraft.visibility === 'public' ? 'Visible on the public calendar' : 'Private in your planner'}</strong><small>You can change this whenever you want.</small></span></label>
            <button type="submit" className="button button-primary span-2" disabled={savingEvent}>{savingEvent ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />}{savingEvent ? 'Saving…' : eventIsNew ? 'Add to calendar' : 'Save event'}</button>
          </form>
        </section>

        <section className="planner-panel event-list-panel">
          <div className="planner-panel-heading"><div><CalendarDays size={19} /><span><strong>Calendar</strong><small>{data.events.length} total events</small></span></div></div>
          {sortedEvents.length ? <div className="planner-event-list">{sortedEvents.map((event) => (
            <article key={event.id} className={`planner-event category-${event.category}`}>
              <time dateTime={event.date}><strong>{new Date(`${event.date}T12:00:00`).getDate()}</strong><span>{new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(new Date(`${event.date}T12:00:00`))}</span></time>
              <div><span>{event.category} · {event.visibility === 'public' ? 'public' : 'private'}</span><h3>{event.title}</h3><small>{event.time || 'All day'}{event.endDate ? ` · until ${displayDate(event.endDate)}` : ''}</small></div>
              <div><button type="button" onClick={() => { setEventDraft(event); setEventIsNew(false) }}>Edit</button><button type="button" onClick={() => removeEvent(event.id)} aria-label={`Delete ${event.title}`}><Trash2 size={16} /></button></div>
            </article>
          ))}</div> : <EmptyState title="No dates yet" message="Add the first event with the form beside this list." />}
        </section>

        <section className="planner-panel tasks-panel">
          <div className="planner-panel-heading"><div><ClipboardCheck size={19} /><span><strong>Tasks and deadlines</strong><small>Small steps make big modules easier.</small></span></div></div>
          <form className="quick-task-form" onSubmit={addTask}>
            <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Add a task…" aria-label="Task title" />
            <input type="date" value={taskDue} onChange={(event) => setTaskDue(event.target.value)} aria-label="Due date" />
            <select value={taskPriority} onChange={(event) => setTaskPriority(event.target.value as TaskPriority)} aria-label="Priority"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select>
            <button type="submit" aria-label="Add task"><Plus size={18} /></button>
          </form>
          {data.tasks.length ? <div className="task-list">{data.tasks.map((task) => (
            <article key={task.id} className={`${task.completed ? 'is-complete' : ''} priority-${task.priority}`}>
              <button type="button" className="task-check" onClick={() => toggleTask(task)} aria-label={task.completed ? 'Mark task incomplete' : 'Complete task'}>{task.completed ? <Check size={16} /> : <Circle size={16} />}</button>
              <div><strong>{task.title}</strong><small>{displayDate(task.dueDate)} · {task.priority} priority</small></div>
              <button type="button" onClick={() => removeTask(task.id)} aria-label={`Delete ${task.title}`}><Trash2 size={15} /></button>
            </article>
          ))}</div> : <p className="inline-empty">No tasks yet — enjoy the calm or add the next small step.</p>}
        </section>

        <section className="planner-panel stickies-panel">
          <div className="planner-panel-heading"><div><StickyNoteIcon size={19} /><span><strong>Sticky-note corner</strong><small>Private thoughts, reminders and tiny wins.</small></span></div></div>
          <form className="sticky-composer" onSubmit={addSticky}>
            <textarea value={stickyText} onChange={(event) => setStickyText(event.target.value)} rows={3} maxLength={800} placeholder="Write a little reminder…" />
            <div><div className="sticky-colours" aria-label="Sticky note colour">{colours.map((colour) => <button key={colour} type="button" className={`sticky-colour colour-${colour}${stickyColour === colour ? ' is-active' : ''}`} onClick={() => setStickyColour(colour)} aria-label={`${colour} sticky note`} />)}</div><button type="submit" className="button button-secondary"><Plus size={16} />Pin note</button></div>
          </form>
          {data.notes.length ? <div className="sticky-wall">{data.notes.map((note, index) => <article key={note.id} className={`sticky-note colour-${note.colour} tilt-${index % 3}`}><span className="sticky-tape" /><p>{note.text}</p><button type="button" onClick={() => removeSticky(note.id)} aria-label="Remove sticky note"><X size={15} /></button></article>)}</div> : <p className="inline-empty">Your sticky-note wall is waiting for its first thought.</p>}
        </section>
      </div>

      <div className="planner-public-link"><span><Eye size={18} /></span><div><strong>Public calendar preview</strong><p>Check exactly what visitors can see after changing event visibility.</p></div><a href="/calendar" target="_blank" rel="noreferrer">Open calendar <ChevronRight size={17} /></a></div>
    </div>
  )
}
