import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays, Check, ChevronLeft, ChevronRight, Circle, ClipboardCheck, Eye, EyeOff,
  LoaderCircle, LockKeyhole, Pencil, Plus, Save, Settings2, Sparkles, StickyNote as StickyNoteIcon, Trash2, X,
} from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { ErrorNotice, LoadingState } from '../../components/Feedback'
import { adminApi } from '../../lib/api'
import { CALENDAR_CATEGORIES, calendarCategoryLabel, validCalendarColour } from '../../lib/calendar'
import { newId } from '../../lib/format'
import { useLanguage } from '../../lib/i18n'
import type { CalendarEvent, CalendarEventCategory, PlannerData, PlannerTask, ShiftTemplate, StickyNote, StickyNoteColour, TaskPriority } from '../../types'
import { StudioNav, useStudioSession } from './StudioPages'

const colours: StickyNoteColour[] = ['pink', 'peach', 'yellow', 'sage', 'lilac']
const weekdays = { en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], de: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] }

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function today(): string { return isoDate(new Date()) }

function freshEvent(date = today()): CalendarEvent {
  const now = new Date().toISOString()
  return { id: newId('event'), title: '', description: '', date, time: '', endTime: '', category: 'school', visibility: 'private', colour: '#d37f9c', createdAt: now, updatedAt: now }
}

function freshTemplate(): ShiftTemplate {
  const now = new Date().toISOString()
  return { id: newId('shift'), title: '', shortLabel: '', description: '', category: 'placement', colour: '#d37f9c', visibility: 'private', createdAt: now, updatedAt: now }
}

function displayDate(value?: string): string {
  if (!value) return 'No due date'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

function eventStyle(event: Pick<CalendarEvent, 'colour'>): React.CSSProperties {
  return { '--event-colour': validCalendarColour(event.colour) } as React.CSSProperties
}

export function PlannerPage() {
  const session = useStudioSession()
  const { language, text } = useLanguage()
  const [data, setData] = useState<PlannerData>({ events: [], templates: [], notes: [], tasks: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [placingDate, setPlacingDate] = useState('')
  const [managingTemplates, setManagingTemplates] = useState(false)
  const [templateDraft, setTemplateDraft] = useState<ShiftTemplate>(freshTemplate)
  const [templateIsNew, setTemplateIsNew] = useState(true)
  const [templateDeleteId, setTemplateDeleteId] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [savingEvent, setSavingEvent] = useState(false)
  const [eventDraft, setEventDraft] = useState<CalendarEvent>(freshEvent)
  const [eventIsNew, setEventIsNew] = useState(true)
  const [eventDeleteId, setEventDeleteId] = useState('')
  const [stickyText, setStickyText] = useState('')
  const [stickyColour, setStickyColour] = useState<StickyNoteColour>('pink')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDue, setTaskDue] = useState('')
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('normal')

  useEffect(() => {
    if (!session?.authenticated) return
    adminApi.planner().then((result) => {
      setData(result)
      setSelectedTemplateId(result.templates[0]?.id || null)
    }).catch((reason) => setError(reason.message)).finally(() => setLoading(false))
  }, [session])

  const monthDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const start = new Date(first)
    start.setDate(start.getDate() - ((first.getDay() + 6) % 7))
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      return date
    })
  }, [month])
  const selectedTemplate = data.templates.find((template) => template.id === selectedTemplateId)
  const openTasks = data.tasks.filter((task) => !task.completed)
  const completedCount = data.tasks.length - openTasks.length
  const progress = data.tasks.length ? Math.round((completedCount / data.tasks.length) * 100) : 0

  if (session === undefined || loading) return <div className="page-shell section-shell"><LoadingState label="Opening your planner…" /></div>
  if (!session?.authenticated) return <Navigate to="/studio/login" state={{ from: '/studio/planner' }} replace />

  function editEvent(entry: CalendarEvent) {
    setEventDraft({ ...entry, colour: validCalendarColour(entry.colour) })
    setEventIsNew(false)
    setEventDeleteId('')
  }

  function newEventForDate(date: string) {
    setEventDraft(freshEvent(date))
    setEventIsNew(true)
    setEventDeleteId('')
  }

  async function placeTemplate(template: ShiftTemplate, date: string) {
    const existing = data.events.find((event) => event.date === date && event.templateId === template.id)
    if (existing) { editEvent(existing); return }
    const timestamp = new Date().toISOString()
    const draft: CalendarEvent = {
      id: newId('event'), title: template.title, description: template.description, date,
      time: template.startTime, endTime: template.endTime, category: template.category,
      visibility: template.visibility, colour: template.colour, templateId: template.id,
      createdAt: timestamp, updatedAt: timestamp,
    }
    setPlacingDate(date); setError('')
    try {
      const { event } = await adminApi.saveEvent(draft, true)
      setData((current) => ({ ...current, events: [...current.events, event] }))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The shift could not be placed.') }
    finally { setPlacingDate('') }
  }

  function chooseDay(date: string) {
    if (selectedTemplate) void placeTemplate(selectedTemplate, date)
    else newEventForDate(date)
  }

  async function saveEvent(event: React.FormEvent) {
    event.preventDefault()
    setSavingEvent(true); setError('')
    try {
      const { event: saved } = await adminApi.saveEvent(eventDraft, eventIsNew)
      setData((current) => ({ ...current, events: eventIsNew ? [...current.events, saved] : current.events.map((entry) => entry.id === saved.id ? saved : entry) }))
      setEventDraft(freshEvent()); setEventIsNew(true); setEventDeleteId('')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The event could not be saved.') }
    finally { setSavingEvent(false) }
  }

  async function removeEvent(id: string) {
    try {
      await adminApi.removeEvent(id)
      setData((current) => ({ ...current, events: current.events.filter((event) => event.id !== id) }))
      setEventDraft(freshEvent()); setEventIsNew(true); setEventDeleteId('')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The event could not be deleted.') }
  }

  function editTemplate(template: ShiftTemplate) {
    setTemplateDraft(template); setTemplateIsNew(false); setTemplateDeleteId(''); setManagingTemplates(true)
  }

  async function saveTemplate(event: React.FormEvent) {
    event.preventDefault()
    setSavingTemplate(true); setError('')
    try {
      const { template } = await adminApi.saveShiftTemplate(templateDraft, templateIsNew)
      setData((current) => ({ ...current, templates: templateIsNew ? [...current.templates, template] : current.templates.map((entry) => entry.id === template.id ? template : entry) }))
      setSelectedTemplateId(template.id); setTemplateDraft(freshTemplate()); setTemplateIsNew(true); setTemplateDeleteId('')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The shift template could not be saved.') }
    finally { setSavingTemplate(false) }
  }

  async function removeTemplate(id: string) {
    try {
      await adminApi.removeShiftTemplate(id)
      setData((current) => ({ ...current, templates: current.templates.filter((template) => template.id !== id) }))
      if (selectedTemplateId === id) setSelectedTemplateId(null)
      setTemplateDraft(freshTemplate()); setTemplateIsNew(true); setTemplateDeleteId('')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The shift template could not be deleted.') }
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
        <div><p className="eyebrow"><LockKeyhole size={14} />{text('Private workspace', 'Privater Arbeitsbereich')}</p><h1>{text('Shift planner', 'Dienstplan')}</h1><p>{text('Save each shift once, then tap or drag it onto every day you need.', 'Speichere jede Schicht einmal und tippe oder ziehe sie dann auf alle gewünschten Tage.')}</p></div>
        <StudioNav />
      </header>
      {error && <ErrorNotice message={error} />}

      <section className="planner-overview">
        <div><span><CalendarDays size={17} />{text('Upcoming dates', 'Kommende Termine')}</span><strong>{data.events.filter((event) => (event.endDate || event.date) >= today()).length}</strong><small>{data.events.filter((event) => event.visibility === 'public').length} {text('public', 'öffentlich')}</small></div>
        <div><span><ClipboardCheck size={17} />{text('Open tasks', 'Offene Aufgaben')}</span><strong>{openTasks.length}</strong><small>{completedCount} {text('completed', 'erledigt')}</small></div>
        <div className="planner-progress-card"><span><Sparkles size={17} />{text('Task progress', 'Aufgabenfortschritt')}</span><strong>{progress}%</strong><div><i style={{ width: `${progress}%` }} /></div></div>
      </section>

      <section className="planner-shift-board">
        <div className="owner-calendar-toolbar">
          <button type="button" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} aria-label={text('Previous month', 'Vorheriger Monat')}><ChevronLeft /></button>
          <div><small>{month.getFullYear()}</small><h2>{new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-GB', { month: 'long' }).format(month)}</h2></div>
          <div><button type="button" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>{text('Today', 'Heute')}</button><button type="button" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} aria-label={text('Next month', 'Nächster Monat')}><ChevronRight /></button></div>
        </div>

        <div className="shift-placement-help"><span>{selectedTemplate ? <><i style={{ background: selectedTemplate.colour }} />{text('Painting with', 'Ausgewählt')}: <strong>{selectedTemplate.title}</strong></> : <><Plus size={15} />{text('Custom event mode', 'Modus für eigenen Termin')}</>}</span><small>{text('Keep tapping days to place the selected shift. Tap an existing entry to edit it.', 'Tippe nacheinander auf Tage, um die ausgewählte Schicht einzutragen. Tippe einen Eintrag zum Bearbeiten an.')}</small></div>

        <div className="shift-palette" aria-label={text('Saved shift templates', 'Gespeicherte Schichten')}>
          <button type="button" className={`shift-palette-item custom-event-tile${selectedTemplateId === null ? ' is-active' : ''}`} onClick={() => setSelectedTemplateId(null)}><span><Plus size={20} /></span><strong>{text('Custom', 'Termin')}</strong><small>{text('Pick a day', 'Tag auswählen')}</small></button>
          {data.templates.map((template) => <button type="button" draggable key={template.id} className={`shift-palette-item${selectedTemplateId === template.id ? ' is-active' : ''}`} style={{ '--shift-colour': template.colour } as React.CSSProperties} onClick={() => setSelectedTemplateId(template.id)} onDragStart={(event) => { event.dataTransfer.setData('text/nya-shift-template', template.id); event.dataTransfer.effectAllowed = 'copy' }}><span>{template.shortLabel || template.title.slice(0, 1)}</span><strong>{template.title}</strong><small>{template.startTime ? `${template.startTime}${template.endTime ? `–${template.endTime}` : ''}` : text('All day', 'Ganztägig')}</small></button>)}
          <button type="button" className="shift-palette-item manage-shifts-tile" onClick={() => setManagingTemplates((open) => !open)}><span><Settings2 size={19} /></span><strong>{text('Manage', 'Bearbeiten')}</strong><small>{text('Add shift', 'Schicht anlegen')}</small></button>
        </div>

        {managingTemplates && <div className="shift-template-manager">
          <div className="shift-template-list">
            <button type="button" className={templateIsNew ? 'is-active' : ''} onClick={() => { setTemplateDraft(freshTemplate()); setTemplateIsNew(true); setTemplateDeleteId('') }}><Plus size={16} />{text('New shift', 'Neue Schicht')}</button>
            {data.templates.map((template) => <button type="button" key={template.id} className={!templateIsNew && templateDraft.id === template.id ? 'is-active' : ''} onClick={() => editTemplate(template)}><i style={{ background: template.colour }} /><span><strong>{template.title}</strong><small>{template.startTime ? `${template.startTime}${template.endTime ? `–${template.endTime}` : ''}` : text('All day', 'Ganztägig')}</small></span><Pencil size={14} /></button>)}
          </div>
          <form className="shift-template-form" onSubmit={saveTemplate}>
            <div className="planner-panel-heading"><div><Settings2 size={18} /><span><strong>{templateIsNew ? text('Create reusable shift', 'Wiederverwendbare Schicht erstellen') : text('Edit shift template', 'Schichtvorlage bearbeiten')}</strong><small>{text('Changes affect future placements, not shifts already on the calendar.', 'Änderungen gelten für neue Einträge, nicht für bereits eingetragene Schichten.')}</small></span></div></div>
            <div className="form-grid compact-form">
              <label>{text('Shift name', 'Name')}<input value={templateDraft.title} onChange={(event) => setTemplateDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Frühschicht" required /></label>
              <label>{text('Short label', 'Kurzzeichen')}<input value={templateDraft.shortLabel} maxLength={8} onChange={(event) => setTemplateDraft((current) => ({ ...current, shortLabel: event.target.value }))} placeholder="F" /></label>
              <label>{text('Starts', 'Beginn')}<input type="time" value={templateDraft.startTime || ''} onChange={(event) => setTemplateDraft((current) => ({ ...current, startTime: event.target.value || undefined }))} /></label>
              <label>{text('Ends', 'Ende')}<input type="time" value={templateDraft.endTime || ''} onChange={(event) => setTemplateDraft((current) => ({ ...current, endTime: event.target.value || undefined }))} /></label>
              <label>{text('Category', 'Kategorie')}<select value={templateDraft.category} onChange={(event) => setTemplateDraft((current) => ({ ...current, category: event.target.value as CalendarEventCategory }))}>{CALENDAR_CATEGORIES.map((category) => <option key={category} value={category}>{calendarCategoryLabel(category, language)}</option>)}</select></label>
              <label>{text('Colour', 'Farbe')}<span className="shift-colour-field"><input type="color" value={templateDraft.colour} onChange={(event) => setTemplateDraft((current) => ({ ...current, colour: event.target.value }))} /><input value={templateDraft.colour} pattern="#[0-9a-fA-F]{6}" onChange={(event) => setTemplateDraft((current) => ({ ...current, colour: event.target.value }))} /></span></label>
              <label className="span-2">{text('Default note', 'Standardnotiz')}<textarea rows={2} value={templateDraft.description} onChange={(event) => setTemplateDraft((current) => ({ ...current, description: event.target.value }))} /></label>
              <label className="visibility-choice span-2"><input type="checkbox" checked={templateDraft.visibility === 'public'} onChange={(event) => setTemplateDraft((current) => ({ ...current, visibility: event.target.checked ? 'public' : 'private' }))} /><span>{templateDraft.visibility === 'public' ? <Eye size={18} /> : <EyeOff size={18} />}<strong>{templateDraft.visibility === 'public' ? text('New placements are public', 'Neue Einträge sind öffentlich') : text('New placements stay private', 'Neue Einträge bleiben privat')}</strong></span></label>
            </div>
            <div className="shift-template-actions"><button type="submit" className="button button-primary" disabled={savingTemplate}>{savingTemplate ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}{text('Save shift', 'Schicht speichern')}</button>{!templateIsNew && (templateDeleteId === templateDraft.id ? <><button type="button" className="button danger-button" onClick={() => removeTemplate(templateDraft.id)}><Trash2 size={16} />{text('Confirm delete', 'Löschen bestätigen')}</button><button type="button" className="button button-ghost" onClick={() => setTemplateDeleteId('')}>{text('Cancel', 'Abbrechen')}</button></> : <button type="button" className="button button-ghost" onClick={() => setTemplateDeleteId(templateDraft.id)}><Trash2 size={16} />{text('Delete shift', 'Schicht löschen')}</button>)}</div>
          </form>
        </div>}

        <div className="owner-calendar-scroll">
          <div className="owner-calendar-grid owner-weekdays">{weekdays[language].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="owner-calendar-grid owner-month-grid">{monthDays.map((date) => {
            const dateValue = isoDate(date)
            const dayEvents = data.events.filter((event) => event.date <= dateValue && (event.endDate || event.date) >= dateValue)
            const outside = date.getMonth() !== month.getMonth()
            return <div key={dateValue} className={`owner-calendar-day${outside ? ' is-outside' : ''}${dateValue === today() ? ' is-today' : ''}${placingDate === dateValue ? ' is-saving' : ''}`} onDragOver={(event) => { if (event.dataTransfer.types.includes('text/nya-shift-template')) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' } }} onDrop={(event) => { event.preventDefault(); const template = data.templates.find((entry) => entry.id === event.dataTransfer.getData('text/nya-shift-template')); if (template) void placeTemplate(template, dateValue) }}>
              <button type="button" className="owner-day-target" onClick={() => chooseDay(dateValue)} aria-label={`${text('Place on', 'Eintragen am')} ${dateValue}`}><time dateTime={dateValue}>{date.getDate()}</time><Plus size={13} /></button>
              <div className="owner-day-events">{dayEvents.slice(0, 4).map((event) => <button type="button" key={event.id} className={`owner-shift-entry category-${event.category}`} style={eventStyle(event)} onClick={() => editEvent(event)} title={`${event.title}${event.time ? ` ${event.time}` : ''}`}><strong>{event.title}</strong><small>{event.time ? `${event.time}${event.endTime ? `–${event.endTime}` : ''}` : text('All day', 'Ganztägig')}</small></button>)}{dayEvents.length > 4 && <small>+{dayEvents.length - 4}</small>}</div>
            </div>
          })}</div>
        </div>
      </section>

      <div className="planner-grid">
        <section className="planner-panel event-editor-panel">
          <div className="planner-panel-heading"><div><CalendarDays size={19} /><span><strong>{eventIsNew ? text('Add a calendar entry', 'Kalendereintrag hinzufügen') : text('Edit calendar entry', 'Kalendereintrag bearbeiten')}</strong><small>{text('Use this for one-off details or to adjust a placed shift.', 'Für einzelne Termine oder um eine eingetragene Schicht anzupassen.')}</small></span></div>{!eventIsNew && <button type="button" onClick={() => { setEventDraft(freshEvent()); setEventIsNew(true); setEventDeleteId('') }}><X size={17} />{text('Close', 'Schließen')}</button>}</div>
          <form onSubmit={saveEvent} className="form-grid compact-form">
            <label className="span-2">{text('Title', 'Titel')}<input value={eventDraft.title} onChange={(event) => setEventDraft((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. First practical placement" required /></label>
            <label>{text('Date', 'Datum')}<input type="date" value={eventDraft.date} onChange={(event) => setEventDraft((current) => ({ ...current, date: event.target.value }))} required /></label>
            <label>{text('End date', 'Enddatum')}<input type="date" value={eventDraft.endDate || ''} min={eventDraft.date} onChange={(event) => setEventDraft((current) => ({ ...current, endDate: event.target.value || undefined }))} /></label>
            <label>{text('Start time', 'Beginn')}<input type="time" value={eventDraft.time || ''} onChange={(event) => setEventDraft((current) => ({ ...current, time: event.target.value || undefined }))} /></label>
            <label>{text('End time', 'Ende')}<input type="time" value={eventDraft.endTime || ''} onChange={(event) => setEventDraft((current) => ({ ...current, endTime: event.target.value || undefined }))} /></label>
            <label>{text('Category', 'Kategorie')}<select value={eventDraft.category} onChange={(event) => setEventDraft((current) => ({ ...current, category: event.target.value as CalendarEventCategory }))}>{CALENDAR_CATEGORIES.map((category) => <option key={category} value={category}>{calendarCategoryLabel(category, language)}</option>)}</select></label>
            <label>{text('Colour', 'Farbe')}<span className="shift-colour-field"><input type="color" value={validCalendarColour(eventDraft.colour)} onChange={(event) => setEventDraft((current) => ({ ...current, colour: event.target.value }))} /><input value={validCalendarColour(eventDraft.colour)} pattern="#[0-9a-fA-F]{6}" onChange={(event) => setEventDraft((current) => ({ ...current, colour: event.target.value }))} /></span></label>
            <label className="span-2">{text('Description', 'Beschreibung')}<textarea rows={3} value={eventDraft.description} onChange={(event) => setEventDraft((current) => ({ ...current, description: event.target.value }))} placeholder={text('Optional note…', 'Optionale Notiz…')} /></label>
            <label className="visibility-choice span-2"><input type="checkbox" checked={eventDraft.visibility === 'public'} onChange={(event) => setEventDraft((current) => ({ ...current, visibility: event.target.checked ? 'public' : 'private' }))} /><span>{eventDraft.visibility === 'public' ? <Eye size={18} /> : <EyeOff size={18} />}<strong>{eventDraft.visibility === 'public' ? text('Visible on the public calendar', 'Im öffentlichen Kalender sichtbar') : text('Private in your planner', 'Privat in deinem Planer')}</strong><small>{text('You can change this whenever you want.', 'Du kannst das jederzeit ändern.')}</small></span></label>
            <button type="submit" className="button button-primary span-2" disabled={savingEvent}>{savingEvent ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}{savingEvent ? text('Saving…', 'Speichern…') : eventIsNew ? text('Add to calendar', 'Eintragen') : text('Save changes', 'Änderungen speichern')}</button>
            {!eventIsNew && <div className="span-2 inline-delete-actions">{eventDeleteId === eventDraft.id ? <><span>{text('Delete this entry?', 'Diesen Eintrag löschen?')}</span><button type="button" className="danger-button" onClick={() => removeEvent(eventDraft.id)}>{text('Yes, delete', 'Ja, löschen')}</button><button type="button" onClick={() => setEventDeleteId('')}>{text('Cancel', 'Abbrechen')}</button></> : <button type="button" onClick={() => setEventDeleteId(eventDraft.id)}><Trash2 size={15} />{text('Delete entry', 'Eintrag löschen')}</button>}</div>}
          </form>
        </section>

        <section className="planner-panel tasks-panel">
          <div className="planner-panel-heading"><div><ClipboardCheck size={19} /><span><strong>{text('Tasks and deadlines', 'Aufgaben und Fristen')}</strong><small>{text('Small steps make big modules easier.', 'Kleine Schritte machen große Module leichter.')}</small></span></div></div>
          <form className="quick-task-form" onSubmit={addTask}><input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder={text('Add a task…', 'Aufgabe hinzufügen…')} aria-label="Task title" /><input type="date" value={taskDue} onChange={(event) => setTaskDue(event.target.value)} aria-label="Due date" /><select value={taskPriority} onChange={(event) => setTaskPriority(event.target.value as TaskPriority)} aria-label="Priority"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select><button type="submit" aria-label="Add task"><Plus size={18} /></button></form>
          {data.tasks.length ? <div className="task-list">{data.tasks.map((task) => <article key={task.id} className={`${task.completed ? 'is-complete' : ''} priority-${task.priority}`}><button type="button" className="task-check" onClick={() => toggleTask(task)} aria-label={task.completed ? 'Mark task incomplete' : 'Complete task'}>{task.completed ? <Check size={16} /> : <Circle size={16} />}</button><div><strong>{task.title}</strong><small>{displayDate(task.dueDate)} · {task.priority} priority</small></div><button type="button" onClick={() => removeTask(task.id)} aria-label={`Delete ${task.title}`}><Trash2 size={15} /></button></article>)}</div> : <p className="inline-empty">No tasks yet — enjoy the calm or add the next small step.</p>}
        </section>

        <section className="planner-panel stickies-panel">
          <div className="planner-panel-heading"><div><StickyNoteIcon size={19} /><span><strong>{text('Sticky-note corner', 'Notizzettel-Ecke')}</strong><small>{text('Private thoughts, reminders and tiny wins.', 'Private Gedanken, Erinnerungen und kleine Erfolge.')}</small></span></div></div>
          <form className="sticky-composer" onSubmit={addSticky}><textarea value={stickyText} onChange={(event) => setStickyText(event.target.value)} rows={3} maxLength={800} placeholder={text('Write a little reminder…', 'Schreibe eine kleine Erinnerung…')} /><div><div className="sticky-colours" aria-label="Sticky note colour">{colours.map((colour) => <button key={colour} type="button" className={`sticky-colour colour-${colour}${stickyColour === colour ? ' is-active' : ''}`} onClick={() => setStickyColour(colour)} aria-label={`${colour} sticky note`} />)}</div><button type="submit" className="button button-secondary"><Plus size={16} />{text('Pin note', 'Notiz anheften')}</button></div></form>
          {data.notes.length ? <div className="sticky-wall">{data.notes.map((note, index) => <article key={note.id} className={`sticky-note colour-${note.colour} tilt-${index % 3}`}><span className="sticky-tape" /><p>{note.text}</p><button type="button" onClick={() => removeSticky(note.id)} aria-label="Remove sticky note"><X size={15} /></button></article>)}</div> : <p className="inline-empty">Your sticky-note wall is waiting for its first thought.</p>}
        </section>
      </div>

      <div className="planner-public-link"><span><Eye size={18} /></span><div><strong>{text('Public calendar preview', 'Vorschau des öffentlichen Kalenders')}</strong><p>{text('Only entries you marked public appear there.', 'Dort erscheinen nur Einträge, die du öffentlich gemacht hast.')}</p></div><a href="/calendar" target="_blank" rel="noreferrer">{text('Open calendar', 'Kalender öffnen')} <ChevronRight size={17} /></a></div>
    </div>
  )
}
