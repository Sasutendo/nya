import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Expand, FileText, Minimize, Printer, X } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { EmptyState, LoadingState } from '../components/Feedback'
import { SlideCanvas } from '../components/SlideCanvas'
import { getPublicItem, recordView } from '../lib/api'
import type { ContentItem } from '../types'

export function PresentationPage() {
  const { slug = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = Number(searchParams.get('slide') || '1') - 1
  const [item, setItem] = useState<ContentItem | null | undefined>(undefined)
  const [index, setIndex] = useState(Math.max(0, requested))
  const [notesOpen, setNotesOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement))
  const touchStart = useRef<number | null>(null)

  useEffect(() => {
    getPublicItem(slug).then((result) => {
      setItem(result)
      if (result) recordView(slug).then((viewCount) => { if (viewCount !== null) setItem((current) => current ? { ...current, viewCount } : current) })
    })
  }, [slug])

  const slides = item?.content.kind === 'presentation' ? item.content.slides : []
  const go = useCallback((next: number) => {
    if (!slides.length) return
    const safe = Math.max(0, Math.min(slides.length - 1, next))
    setIndex(safe)
    setSearchParams(safe ? { slide: String(safe + 1) } : {}, { replace: true })
  }, [setSearchParams, slides.length])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'VIDEO', 'AUDIO'].includes(target.tagName)) return
      if (['ArrowRight', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); go(index + 1) }
      if (['ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); go(index - 1) }
      if (event.key === 'Home') go(0)
      if (event.key === 'End') go(slides.length - 1)
      if (event.key.toLowerCase() === 'f') toggleFullscreen()
      if (event.key.toLowerCase() === 'n') setNotesOpen((open) => !open)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, index, slides.length])

  useEffect(() => {
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreen)
    return () => document.removeEventListener('fullscreenchange', onFullscreen)
  }, [])

  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  }

  if (item === undefined) return <div className="presentation-feedback"><LoadingState label="Preparing the deck…" /></div>
  if (!item || item.content.kind !== 'presentation') return <div className="presentation-feedback"><EmptyState title="Presentation not found" message="This deck may still be private or may have moved." /><Link to="/presentations" className="button button-primary">Browse presentations</Link></div>

  const slide = slides[index]
  const hasSpeakerNotes = slides.some((entry) => Boolean(entry.speakerNotes))

  return (
    <main
      className="presentation-player"
      onTouchStart={(event) => { touchStart.current = event.changedTouches[0].clientX }}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return
        const distance = event.changedTouches[0].clientX - touchStart.current
        if (Math.abs(distance) > 55) go(index + (distance < 0 ? 1 : -1))
        touchStart.current = null
      }}
    >
      <header className="player-header">
        <Link to={`/item/${item.slug}`} className="player-close" aria-label="Close presentation"><X size={20} /><span>Close</span></Link>
        <div className="player-title"><strong>{item.title}</strong><small>{index + 1} of {slides.length}</small></div>
        <div className="player-tools">
          {hasSpeakerNotes && <button type="button" onClick={() => setNotesOpen((open) => !open)} className={notesOpen ? 'is-active' : ''} aria-label="Toggle speaker notes"><FileText size={18} /><span>Notes</span></button>}
          <button type="button" onClick={() => window.print()} aria-label="Print presentation"><Printer size={18} /><span>Print</span></button>
          <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'}>{fullscreen ? <Minimize size={18} /> : <Expand size={18} />}<span>{fullscreen ? 'Exit' : 'Full screen'}</span></button>
        </div>
      </header>

      <div className="player-stage">
        <button type="button" className="player-arrow previous" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous slide"><ChevronLeft /></button>
        <SlideCanvas key={slide.id} slide={slide} className="active-slide" />
        <button type="button" className="player-arrow next" onClick={() => go(index + 1)} disabled={index === slides.length - 1} aria-label="Next slide"><ChevronRight /></button>
      </div>

      <footer className="player-footer">
        <div className="player-progress"><span style={{ width: `${((index + 1) / slides.length) * 100}%` }} /></div>
        <button type="button" onClick={() => go(index - 1)} disabled={index === 0}><ChevronLeft size={18} />Previous</button>
        <div className="slide-dots" aria-label="Choose a slide">
          {slides.map((entry, dotIndex) => <button key={entry.id} type="button" className={dotIndex === index ? 'is-active' : ''} onClick={() => go(dotIndex)} aria-label={`Go to slide ${dotIndex + 1}`} />)}
        </div>
        <button type="button" onClick={() => go(index + 1)} disabled={index === slides.length - 1}>Next<ChevronRight size={18} /></button>
      </footer>

      {notesOpen && hasSpeakerNotes && (
        <aside className="speaker-notes">
          <div><span>Speaker notes · slide {index + 1}</span><button type="button" onClick={() => setNotesOpen(false)} aria-label="Close notes"><X size={17} /></button></div>
          <p>{slide.speakerNotes || 'No speaker notes for this slide.'}</p>
        </aside>
      )}

      <div className="print-deck" aria-hidden="true">
        {slides.map((printSlide) => <SlideCanvas key={printSlide.id} slide={printSlide} labelled={false} />)}
      </div>
    </main>
  )
}
