import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Expand, FileText, Minimize, Printer, X } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { EmptyState, LoadingState } from '../components/Feedback'
import { SlideCanvas } from '../components/SlideCanvas'
import { getPublicItem, recordView } from '../lib/api'
import type { ContentItem } from '../types'
import { useLanguage } from '../lib/i18n'

export function PresentationPage() {
  const { text } = useLanguage()
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

  if (item === undefined) return <div className="presentation-feedback"><LoadingState label={text('Preparing the deck…', 'Präsentation wird vorbereitet…')} /></div>
  if (!item || item.content.kind !== 'presentation') return <div className="presentation-feedback"><EmptyState title={text('Presentation not found', 'Präsentation nicht gefunden')} message={text('This deck may still be private or may have moved.', 'Diese Präsentation ist vielleicht noch privat oder wurde verschoben.')} /><Link to="/presentations" className="button button-primary">{text('Browse presentations', 'Präsentationen ansehen')}</Link></div>

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
        <Link to={`/item/${item.slug}`} className="player-close" aria-label={text('Close presentation', 'Präsentation schließen')}><X size={20} /><span>{text('Close', 'Schließen')}</span></Link>
        <div className="player-title"><strong>{item.title}</strong><small>{index + 1} {text('of', 'von')} {slides.length}</small></div>
        <div className="player-tools">
          {hasSpeakerNotes && <button type="button" onClick={() => setNotesOpen((open) => !open)} className={notesOpen ? 'is-active' : ''} aria-label={text('Toggle speaker notes', 'Sprechernotizen umschalten')}><FileText size={18} /><span>{text('Notes', 'Notizen')}</span></button>}
          <button type="button" onClick={() => window.print()} aria-label={text('Print presentation', 'Präsentation drucken')}><Printer size={18} /><span>{text('Print', 'Drucken')}</span></button>
          <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? text('Exit full screen', 'Vollbild verlassen') : text('Enter full screen', 'Vollbild öffnen')}>{fullscreen ? <Minimize size={18} /> : <Expand size={18} />}<span>{fullscreen ? text('Exit', 'Beenden') : text('Full screen', 'Vollbild')}</span></button>
        </div>
      </header>

      <div className="player-stage">
        <button type="button" className="player-arrow previous" onClick={() => go(index - 1)} disabled={index === 0} aria-label={text('Previous slide', 'Vorherige Folie')}><ChevronLeft /></button>
        <SlideCanvas key={slide.id} slide={slide} className="active-slide" />
        <button type="button" className="player-arrow next" onClick={() => go(index + 1)} disabled={index === slides.length - 1} aria-label={text('Next slide', 'Nächste Folie')}><ChevronRight /></button>
      </div>

      <footer className="player-footer">
        <div className="player-progress"><span style={{ width: `${((index + 1) / slides.length) * 100}%` }} /></div>
        <button type="button" onClick={() => go(index - 1)} disabled={index === 0}><ChevronLeft size={18} />{text('Previous', 'Zurück')}</button>
        <div className="slide-dots" aria-label={text('Choose a slide', 'Folie auswählen')}>
          {slides.map((entry, dotIndex) => <button key={entry.id} type="button" className={dotIndex === index ? 'is-active' : ''} onClick={() => go(dotIndex)} aria-label={`${text('Go to slide', 'Gehe zu Folie')} ${dotIndex + 1}`} />)}
        </div>
        <button type="button" onClick={() => go(index + 1)} disabled={index === slides.length - 1}>{text('Next', 'Weiter')}<ChevronRight size={18} /></button>
      </footer>

      {notesOpen && hasSpeakerNotes && (
        <aside className="speaker-notes">
          <div><span>{text('Speaker notes · slide', 'Sprechernotizen · Folie')} {index + 1}</span><button type="button" onClick={() => setNotesOpen(false)} aria-label={text('Close notes', 'Notizen schließen')}><X size={17} /></button></div>
          <p>{slide.speakerNotes || text('No speaker notes for this slide.', 'Keine Sprechernotizen für diese Folie.')}</p>
        </aside>
      )}

      <div className="print-deck" aria-hidden="true">
        {slides.map((printSlide) => <SlideCanvas key={printSlide.id} slide={printSlide} labelled={false} />)}
      </div>
    </main>
  )
}
