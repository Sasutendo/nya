import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Download, MapPin, Printer, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState, LoadingState } from '../components/Feedback'
import { getPublicEvents } from '../lib/api'
import type { CalendarEvent, CalendarEventCategory } from '../types'
import { useLanguage, type Language } from '../lib/i18n'

const weekdays = { en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], de: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] }
const categoryLabels: Record<CalendarEventCategory, [string, string]> = {
  school: ['School', 'Schule'], placement: ['Placement', 'Praxiseinsatz'], assignment: ['Assignment', 'Aufgabe'], exam: ['Exam', 'Prüfung'], milestone: ['Milestone', 'Meilenstein'], personal: ['Personal', 'Persönlich'],
}

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseDate(value: string): Date { return new Date(`${value}T12:00:00`) }

function formatEventDate(event: CalendarEvent, language: Language): string {
  const locale = language === 'de' ? 'de-DE' : 'en-GB'
  const start = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(parseDate(event.date))
  if (!event.endDate || event.endDate === event.date) return start
  return `${start} – ${new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(parseDate(event.endDate))}`
}

function eventOnDate(event: CalendarEvent, date: string): boolean {
  return event.date <= date && (event.endDate || event.date) >= date
}

function downloadIcs(events: CalendarEvent[]) {
  const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nya Yuuki's Learning Corner//Calendar//EN", "CALSCALE:GREGORIAN"]
  events.forEach((event) => {
    const start = event.date.replaceAll('-', '')
    const endDate = parseDate(event.endDate || event.date)
    endDate.setDate(endDate.getDate() + 1)
    lines.push('BEGIN:VEVENT', `UID:${event.id}@nya-learning-studio`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`)
    if (event.time) lines.push(`DTSTART:${start}T${event.time.replace(':', '')}00`)
    else lines.push(`DTSTART;VALUE=DATE:${start}`, `DTEND;VALUE=DATE:${isoDate(endDate).replaceAll('-', '')}`)
    lines.push(`SUMMARY:${escape(event.title)}`, `DESCRIPTION:${escape(event.description)}`, `CATEGORIES:${event.category.toUpperCase()}`, 'END:VEVENT')
  })
  lines.push('END:VCALENDAR')
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'nya-learning-calendar.ics'
  link.click()
  URL.revokeObjectURL(url)
}

export function CalendarPage() {
  const { language, text } = useLanguage()
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const today = isoDate(new Date())

  useEffect(() => {
    getPublicEvents().then(setEvents).finally(() => setLoading(false))
  }, [])

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const mondayOffset = (first.getDay() + 6) % 7
    const start = new Date(first)
    start.setDate(start.getDate() - mondayOffset)
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      return date
    })
  }, [month])

  const upcoming = useMemo(() => events.filter((event) => (event.endDate || event.date) >= today).sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')).slice(0, 7), [events, today])

  function changeMonth(offset: number) { setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1)) }

  return (
    <div className="page-shell section-shell calendar-page">
      <header className="page-header calendar-header">
        <div>
          <p className="eyebrow"><CalendarDays size={15} />{text('Training calendar', 'Ausbildungskalender')}</p>
          <h1>{text('Dates worth remembering.', 'Termine, die wichtig sind.')}</h1>
          <p>{text('Public milestones, school dates and important moments from the learning journey.', 'Öffentliche Meilensteine, Schultermine und wichtige Momente der Lernreise.')}</p>
        </div>
        <div className="calendar-header-actions">
          <button type="button" className="button button-secondary" onClick={() => downloadIcs(events)} disabled={!events.length}><Download size={17} />{text('Export calendar', 'Kalender exportieren')}</button>
          <button type="button" className="button button-ghost" onClick={() => window.print()}><Printer size={17} />{text('Print', 'Drucken')}</button>
        </div>
      </header>

      {loading ? <LoadingState label={text('Opening the calendar…', 'Kalender wird geöffnet…')} /> : (
        <div className="calendar-layout">
          <section className="calendar-board" aria-label={text('Monthly calendar', 'Monatskalender')}>
            <div className="calendar-toolbar">
              <button type="button" onClick={() => changeMonth(-1)} aria-label={text('Previous month', 'Vorheriger Monat')}><ChevronLeft /></button>
              <div><p>{month.getFullYear()}</p><h2>{new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-GB', { month: 'long' }).format(month)}</h2></div>
              <div className="calendar-toolbar-actions"><button type="button" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>{text('Today', 'Heute')}</button><button type="button" onClick={() => changeMonth(1)} aria-label={text('Next month', 'Nächster Monat')}><ChevronRight /></button></div>
            </div>
            <div className="calendar-scroll">
              <div className="calendar-grid weekday-grid">{weekdays[language].map((day) => <span key={day}>{day}</span>)}</div>
              <div className="calendar-grid month-grid">
                {days.map((date) => {
                  const dateValue = isoDate(date)
                  const dayEvents = events.filter((event) => eventOnDate(event, dateValue))
                  const outside = date.getMonth() !== month.getMonth()
                  return (
                    <div key={dateValue} className={`calendar-day${outside ? ' is-outside' : ''}${dateValue === today ? ' is-today' : ''}`}>
                      <time dateTime={dateValue}>{date.getDate()}</time>
                      <div className="day-events">
                        {dayEvents.slice(0, 3).map((event) => <span key={event.id} className={`mini-event category-${event.category}`} title={event.title}>{event.time && <small>{event.time}</small>}{event.title}</span>)}
                        {dayEvents.length > 3 && <small className="more-events">+{dayEvents.length - 3} {text('more', 'weitere')}</small>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          <aside className="agenda-panel">
            <div className="agenda-heading"><div><p className="eyebrow"><Sparkles size={14} />{text('Coming up', 'Demnächst')}</p><h2>{text('Next on the journey', 'Als Nächstes auf der Reise')}</h2></div><span>{upcoming.length}</span></div>
            {upcoming.length ? <div className="agenda-list">{upcoming.map((event, index) => (
              <article key={event.id} className={`agenda-card category-${event.category}${index === 0 ? ' is-next' : ''}`}>
                <div className="agenda-date"><strong>{parseDate(event.date).getDate()}</strong><span>{new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-GB', { month: 'short' }).format(parseDate(event.date))}</span></div>
                <div><span className="agenda-category">{categoryLabels[event.category][language === 'de' ? 1 : 0]}</span><h3>{event.title}</h3><p><CalendarDays size={13} />{formatEventDate(event, language)}{event.time ? ` · ${event.time}` : ''}</p>{event.description && <small>{event.description}</small>}{event.relatedItemSlug && <Link to={`/item/${event.relatedItemSlug}`}>{text('Open related work', 'Zugehörige Arbeit öffnen')} <ArrowRight size={14} /></Link>}</div>
              </article>
            ))}</div> : <EmptyState title={text('A clear calendar', 'Ein freier Kalender')} message={text('Public dates and milestones will appear here once they are added.', 'Öffentliche Termine und Meilensteine erscheinen hier, sobald sie hinzugefügt wurden.')} />}
            <div className="calendar-privacy-note"><MapPin size={16} /><p>{text('Only events marked public are shown here. Personal deadlines can stay private in the owner planner.', 'Hier werden nur öffentlich markierte Termine angezeigt. Persönliche Fristen bleiben privat im Owner-Planer.')}</p></div>
          </aside>
        </div>
      )}
    </div>
  )
}
