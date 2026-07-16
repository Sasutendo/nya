import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, CalendarDays, FileText, FolderKanban, Heart, Presentation, Search, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useSite } from '../App'
import { BerlinClock } from '../components/BerlinClock'
import { ContentCard } from '../components/ContentCard'
import { SlideCanvas } from '../components/SlideCanvas'
import { getPublicEvents, getPublicItems } from '../lib/api'
import type { CalendarEvent, ContentItem } from '../types'

export function HomePage() {
  const { settings } = useSite()
  const [items, setItems] = useState<ContentItem[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([getPublicItems(), getPublicEvents()]).then(([content, calendar]) => { setItems(content); setEvents(calendar) })
  }, [])

  const featured = useMemo(() => items.filter((item) => item.featured).slice(0, 3), [items])
  const previewDeck = items.find((item) => item.content.kind === 'presentation')
  const firstSlide = previewDeck?.content.kind === 'presentation' ? previewDeck.content.slides[0] : undefined
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = events.filter((event) => (event.endDate || event.date) >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3)

  function submitSearch(event: React.FormEvent) {
    event.preventDefault()
    const value = query.trim()
    navigate(value ? `/library?q=${encodeURIComponent(value)}` : '/library')
  }

  return (
    <>
      <section className="hero section-shell">
        <div className="hero-copy">
          <p className="eyebrow"><span /><Sparkles size={15} />{settings.eyebrow}</p>
          <h1>{settings.tagline}</h1>
          <p className="hero-intro">{settings.introduction}</p>
          <form className="hero-search" onSubmit={submitSearch} role="search">
            <Search size={20} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search notes, presentations and projects"
              aria-label="Search the learning library"
            />
            <button type="submit">Search</button>
          </form>
          <div className="profile-presence">
            <div className="profile-avatar-wrap"><img src={settings.profileImage} alt={settings.profileImageAlt} /><span aria-hidden="true" /></div>
            <div className="profile-presence-copy"><small>Currently learning with</small><strong>{settings.ownerName}</strong><span>Pflegefachkraft journey · Berlin</span></div>
            <BerlinClock detailed />
          </div>
          <div className="hero-note">
            <span className="status-dot" />
            <span>{settings.trainingLabel}</span>
          </div>
        </div>

        <div className="hero-preview" aria-label="Featured presentation preview">
          <div className="preview-window-bar">
            <span /><span /><span />
            <small>Presentation preview</small>
          </div>
          {firstSlide && <SlideCanvas slide={firstSlide} labelled={false} />}
          <div className="preview-window-footer">
            <span>{previewDeck?.title}</span>
            {previewDeck && <Link to={`/present/${previewDeck.slug}`}>Open deck <ArrowRight size={15} /></Link>}
          </div>
        </div>
        <div className="hero-stickers" aria-hidden="true">
          <span className="site-sticker sticker-heart">♡</span>
          <span className="site-sticker sticker-study">study mode</span>
          <span className="site-sticker sticker-spark">✦</span>
        </div>
      </section>

      <section className="quick-links section-shell" aria-label="Browse by content type">
        <Link to="/presentations" className="quick-link quick-presentation">
          <span><Presentation size={21} /></span>
          <div><strong>Presentations</strong><small>Full-screen slide decks</small></div>
          <ArrowRight size={18} />
        </Link>
        <Link to="/notes" className="quick-link quick-note">
          <span><FileText size={21} /></span>
          <div><strong>Study notes</strong><small>Clear, searchable revision</small></div>
          <ArrowRight size={18} />
        </Link>
        <Link to="/projects" className="quick-link quick-project">
          <span><FolderKanban size={21} /></span>
          <div><strong>Projects</strong><small>Process, results and reflection</small></div>
          <ArrowRight size={18} />
        </Link>
        <Link to="/calendar" className="quick-link quick-calendar">
          <span><CalendarDays size={21} /></span>
          <div><strong>Calendar</strong><small>Milestones and upcoming dates</small></div>
          <ArrowRight size={18} />
        </Link>
      </section>

      <section className="desk-section section-shell">
        <div className="section-heading desk-heading">
          <div><p className="eyebrow"><Heart size={15} />On the study desk</p><h2>Plans, progress and little reminders</h2></div>
          <Link to="/calendar" className="text-link">Open calendar <ArrowRight size={16} /></Link>
        </div>
        <div className="desk-grid">
          <div className="home-agenda">
            <div className="home-agenda-title"><span><CalendarDays size={19} /></span><div><strong>Coming up</strong><small>Public milestones and important dates</small></div></div>
            {upcoming.length ? <div>{upcoming.map((event) => {
              const date = new Date(`${event.date}T12:00:00`)
              return <Link to="/calendar" key={event.id} className={`home-agenda-item category-${event.category}`}><time><strong>{date.getDate()}</strong><span>{new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(date)}</span></time><div><strong>{event.title}</strong><small>{event.time || 'All day'} · {event.category}</small></div><ArrowRight size={16} /></Link>
            })}</div> : <p className="home-agenda-empty">The calendar is clear for now.</p>}
          </div>
          <div className="home-sticky-wall" aria-label="Learning reminders">
            <article className="home-sticky colour-pink tilt-1"><span className="sticky-tape" /><small>Current chapter</small><p>{settings.trainingLabel}</p></article>
            <article className="home-sticky colour-yellow tilt-2"><span className="sticky-tape" /><small>Gentle reminder</small><p>Learning does not need to look perfect to count.</p></article>
            <article className="home-sticky colour-lilac tilt-0"><span className="sticky-tape" /><small>On the desk</small><p>{items.length ? `${items.length} pieces collected so far ♡` : 'A fresh page, ready for the first idea.'}</p></article>
          </div>
        </div>
      </section>

      <section className="section-shell content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><BookOpen size={15} />From the library</p>
            <h2>Featured work</h2>
          </div>
          <Link to="/library" className="text-link">Browse everything <ArrowRight size={16} /></Link>
        </div>
        <div className="content-grid">
          {(featured.length ? featured : items.slice(0, 3)).map((item) => <ContentCard key={item.id} item={item} />)}
        </div>
      </section>

      <section className="manifesto-section">
        <div className="section-shell manifesto-inner">
          <p className="manifesto-index">01 — Purpose</p>
          <blockquote>“A learning portfolio should make progress feel visible, not overwhelming.”</blockquote>
          <p>This space is designed to stay useful from the first school module to the final practical placement.</p>
        </div>
      </section>
    </>
  )
}
