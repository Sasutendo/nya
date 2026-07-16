import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, FileText, FolderKanban, Presentation, Search, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useSite } from '../App'
import { ContentCard } from '../components/ContentCard'
import { SlideCanvas } from '../components/SlideCanvas'
import { getPublicItems } from '../lib/api'
import type { ContentItem } from '../types'

export function HomePage() {
  const { settings } = useSite()
  const [items, setItems] = useState<ContentItem[]>([])
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    getPublicItems().then(setItems)
  }, [])

  const featured = useMemo(() => items.filter((item) => item.featured).slice(0, 3), [items])
  const previewDeck = items.find((item) => item.content.kind === 'presentation')
  const firstSlide = previewDeck?.content.kind === 'presentation' ? previewDeck.content.slides[0] : undefined

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
