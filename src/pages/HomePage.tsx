import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, CalendarDays, FileText, FolderKanban, Heart, Presentation, RefreshCw, Search, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useSite } from '../App'
import { OwnerClock } from '../components/OwnerClock'
import { AchievementsSection } from '../components/AchievementsSection'
import { ContentCard } from '../components/ContentCard'
import { HomeStudyCorner } from '../components/HomeStudyCorner'
import { SlideCanvas } from '../components/SlideCanvas'
import { getPublicEvents, getPublicItems } from '../lib/api'
import { notesForCycle } from '../lib/cute-notes'
import { unlockAchievement } from '../lib/achievements'
import { localizeAuthoredDefault, useLanguage } from '../lib/i18n'
import type { CalendarEvent, ContentItem } from '../types'

export function HomePage() {
  const { settings } = useSite()
  const { language, text } = useLanguage()
  const [items, setItems] = useState<ContentItem[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [query, setQuery] = useState('')
  const [noteCycle, setNoteCycle] = useState(() => Math.floor(Math.random() * 16))
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([getPublicItems(), getPublicEvents()]).then(([content, calendar]) => { setItems(content); setEvents(calendar) })
    unlockAchievement('first_visit')
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNoteCycle((cycle) => cycle + 1), 12_000)
    return () => window.clearInterval(timer)
  }, [])

  const featured = useMemo(() => items.filter((item) => item.featured).slice(0, 3), [items])
  const previewDeck = items.find((item) => item.content.kind === 'presentation')
  const firstSlide = previewDeck?.content.kind === 'presentation' ? previewDeck.content.slides[0] : undefined
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = events.filter((event) => (event.endDate || event.date) >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3)
  const cuteNotes = useMemo(() => notesForCycle(noteCycle), [noteCycle])
  const displayEyebrow = localizeAuthoredDefault(settings.eyebrow, 'Nursing training · personal learning journal', 'Pflegeausbildung · persönliches Lernjournal', language)
  const displayTagline = localizeAuthoredDefault(settings.tagline, 'Carefully learning. Beautifully collected.', 'Sorgfältig lernen. Schön gesammelt.', language)
  const displayIntroduction = localizeAuthoredDefault(settings.introduction, 'A growing collection of presentations, study notes and practical projects from my journey to becoming a qualified nurse.', 'Eine wachsende Sammlung aus Präsentationen, Lernnotizen und Praxisprojekten auf meinem Weg zur Pflegefachkraft.', language)
  const displayTraining = localizeAuthoredDefault(settings.trainingLabel, 'General nursing training · Starting August', 'Generalistische Pflegeausbildung · Start im August', language)

  function submitSearch(event: React.FormEvent) {
    event.preventDefault()
    const value = query.trim()
    navigate(value ? `/library?q=${encodeURIComponent(value)}` : '/library')
  }

  return (
    <>
      <section className="hero section-shell">
        <div className="hero-copy">
          <p className="eyebrow"><span /><Sparkles size={15} />{displayEyebrow}</p>
          <h1>{displayTagline}</h1>
          <p className="hero-intro">{displayIntroduction}</p>
          <form className="hero-search" onSubmit={submitSearch} role="search">
            <Search size={20} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={text('Search notes, presentations and projects', 'Notizen, Präsentationen und Projekte suchen')}
              aria-label={text('Search the learning library', 'Lernbibliothek durchsuchen')}
            />
            <button type="submit">{text('Search', 'Suchen')}</button>
          </form>
          <div className="profile-presence">
            <div className="profile-avatar-wrap"><img src={settings.profileImage} alt={settings.profileImageAlt} /><span aria-hidden="true" /></div>
            <div className="profile-presence-copy"><small>{text('Currently learning with', 'Hier lernt')}</small><strong>{settings.ownerName}</strong><span>{text('Nursing training journey in progress', 'Pflegeausbildung läuft')}</span></div>
            <OwnerClock detailed />
          </div>
          <div className="hero-note">
            <span className="status-dot" />
            <span>{displayTraining}</span>
          </div>
        </div>

        <div className="hero-preview" aria-label={text('Featured presentation preview', 'Vorschau der ausgewählten Präsentation')}>
          <div className="preview-window-bar">
            <span /><span /><span />
            <small>{text('Presentation preview', 'Präsentationsvorschau')}</small>
          </div>
          {firstSlide && <SlideCanvas slide={firstSlide} labelled={false} />}
          <div className="preview-window-footer">
            <span>{previewDeck?.title}</span>
            {previewDeck && <Link to={`/present/${previewDeck.slug}`}>{text('Open deck', 'Präsentation öffnen')} <ArrowRight size={15} /></Link>}
          </div>
        </div>
        <div className="hero-stickers" aria-hidden="true">
          <span className="site-sticker sticker-heart">♡</span>
          <span className="site-sticker sticker-study">{text('study mode', 'lernmodus')}</span>
          <span className="site-sticker sticker-spark">✦</span>
          <span className="site-sticker sticker-care">{text('tiny wins club', 'kleine-erfolge-club')}</span>
          <span className="site-sticker sticker-cross">+</span>
          <span className="site-sticker sticker-cat">ฅ^•ﻌ•^ฅ</span>
          <span className="site-sticker sticker-combo">100× combo</span>
        </div>
      </section>

      <HomeStudyCorner />

      <section className="quick-links section-shell" aria-label={text('Browse by content type', 'Nach Inhaltstyp durchsuchen')}>
        <Link to="/presentations" className="quick-link quick-presentation">
          <span><Presentation size={21} /></span>
          <div><strong>{text('Presentations', 'Präsentationen')}</strong><small>{text('Full-screen slide decks', 'Folien im Vollbild')}</small></div>
          <ArrowRight size={18} />
        </Link>
        <Link to="/notes" className="quick-link quick-note">
          <span><FileText size={21} /></span>
          <div><strong>{text('Study notes', 'Lernnotizen')}</strong><small>{text('Clear, searchable revision', 'Klar und durchsuchbar lernen')}</small></div>
          <ArrowRight size={18} />
        </Link>
        <Link to="/projects" className="quick-link quick-project">
          <span><FolderKanban size={21} /></span>
          <div><strong>{text('Projects', 'Projekte')}</strong><small>{text('Process, results and reflection', 'Prozess, Ergebnisse und Reflexion')}</small></div>
          <ArrowRight size={18} />
        </Link>
        <Link to="/calendar" className="quick-link quick-calendar">
          <span><CalendarDays size={21} /></span>
          <div><strong>{text('Calendar', 'Kalender')}</strong><small>{text('Milestones and upcoming dates', 'Meilensteine und kommende Termine')}</small></div>
          <ArrowRight size={18} />
        </Link>
      </section>

      <section className="desk-section section-shell">
        <div className="section-heading desk-heading">
          <div><p className="eyebrow"><Heart size={15} />{text('On the study desk', 'Auf dem Lerntisch')}</p><h2>{text('Plans, progress and little reminders', 'Pläne, Fortschritte und kleine Erinnerungen')}</h2></div>
          <Link to="/calendar" className="text-link">{text('Open calendar', 'Kalender öffnen')} <ArrowRight size={16} /></Link>
        </div>
        <div className="desk-grid">
          <div className="home-agenda">
            <div className="home-agenda-title"><span><CalendarDays size={19} /></span><div><strong>{text('Coming up', 'Demnächst')}</strong><small>{text('Public milestones and important dates', 'Öffentliche Meilensteine und wichtige Termine')}</small></div></div>
            {upcoming.length ? <div>{upcoming.map((event) => {
              const date = new Date(`${event.date}T12:00:00`)
              return <Link to="/calendar" key={event.id} className={`home-agenda-item category-${event.category}`}><time><strong>{date.getDate()}</strong><span>{new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(date)}</span></time><div><strong>{event.title}</strong><small>{event.time || 'All day'} · {event.category}</small></div><ArrowRight size={16} /></Link>
            })}</div> : <p className="home-agenda-empty">{text('The calendar is clear for now.', 'Der Kalender ist im Moment frei.')}</p>}
          </div>
          <div className="home-sticky-wall" aria-label={text('Learning reminders', 'Lernerinnerungen')} aria-live="polite">
            <div className="sticky-wall-toolbar"><span>{text("Yuuki's note shuffle", 'Yuukis Notiz-Mix')}</span><button type="button" onClick={() => setNoteCycle((cycle) => cycle + 3)}><RefreshCw size={14} />{text('New notes', 'Neue Notizen')}</button></div>
            <article className="home-sticky colour-pink tilt-1"><span className="sticky-tape" /><small>{text('Current chapter', 'Aktuelles Kapitel')}</small><p>{displayTraining}</p></article>
            {cuteNotes.map((note, index) => <article key={`${noteCycle}-${index}`} className={`home-sticky colour-${note.colour} tilt-${index % 3} is-rotating-note`}><span className="sticky-tape" /><small>{language === 'de' ? note.labelDe : note.label}</small><p>{language === 'de' ? note.textDe : note.text}</p></article>)}
          </div>
        </div>
      </section>

      <section className="section-shell content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><BookOpen size={15} />{text('From the library', 'Aus der Bibliothek')}</p>
            <h2>{text('Featured work', 'Ausgewählte Arbeiten')}</h2>
          </div>
          <Link to="/library" className="text-link">{text('Browse everything', 'Alles ansehen')} <ArrowRight size={16} /></Link>
        </div>
        <div className="content-grid">
          {(featured.length ? featured : items.slice(0, 3)).map((item) => <ContentCard key={item.id} item={item} />)}
        </div>
      </section>

      <section className="manifesto-section">
        <div className="section-shell manifesto-inner">
          <p className="manifesto-index">01 — {text('Purpose', 'Zweck')}</p>
          <blockquote>{text('“A learning portfolio should make progress feel visible, not overwhelming.”', '„Ein Lernportfolio soll Fortschritt sichtbar machen, ohne zu überfordern.“')}</blockquote>
          <p>{text('This space is designed to stay useful from the first school module to the final practical placement.', 'Dieser Ort soll vom ersten Schulmodul bis zum letzten Praxiseinsatz nützlich bleiben.')}</p>
        </div>
      </section>

      <AchievementsSection />
    </>
  )
}
