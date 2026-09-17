import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Layers3, RefreshCw, RotateCcw } from 'lucide-react'
import { EmptyState, ErrorNotice, LoadingState } from '../components/Feedback'
import { StudyCardInk } from '../components/StudyCardInk'
import { getPublicStudyCards } from '../lib/api'
import { useLanguage } from '../lib/i18n'
import type { StudyCard } from '../types'

export function FlashcardsPage() {
  const { text } = useLanguage()
  const [cards, setCards] = useState<StudyCard[]>([])
  const [category, setCategory] = useState('all')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getPublicStudyCards()
      .then(setCards)
      .catch((reason) => setError(reason instanceof Error ? reason.message : text('The flashcards could not be loaded.', 'Die Karteikarten konnten nicht geladen werden.')))
      .finally(() => setLoading(false))
  }, [text])

  const categories = useMemo(() => [...new Set(cards.map((card) => card.category))].sort(), [cards])
  const visible = useMemo(() => category === 'all' ? cards : cards.filter((card) => card.category === category), [cards, category])
  const card = visible.length ? visible[index % visible.length] : undefined
  const faceInk = card ? (flipped ? card.answerInk : card.questionInk) || [] : []
  const faceText = card ? (flipped ? card.answer : card.question) : ''

  function chooseCategory(next: string) {
    setCategory(next)
    setIndex(0)
    setFlipped(false)
  }

  function move(direction: number) {
    if (!visible.length) return
    setIndex((current) => (current + direction + visible.length) % visible.length)
    setFlipped(false)
  }

  return (
    <div className="page-shell section-shell flashcards-page">
      <header className="page-header flashcards-header">
        <p className="eyebrow"><Layers3 size={15} />{text('Active recall', 'Aktives Erinnern')}</p>
        <h1>{text('Flashcards', 'Karteikarten')}</h1>
        <p>{text('Choose a topic, think of the answer, then tap the card to flip it. Typed and handwritten cards work together.', 'Wähle ein Thema, überlege dir die Antwort und tippe dann auf die Karte. Getippte und handgeschriebene Karten funktionieren zusammen.')}</p>
      </header>

      {error && <ErrorNotice message={error} />}
      {loading ? <LoadingState label={text('Opening flashcards…', 'Karteikarten werden geöffnet…')} /> : cards.length ? (
        <section className="public-flashcard-study" aria-label={text('Flashcard learning mode', 'Karteikarten-Lernmodus')}>
          <div className="flashcard-category-row">
            <button type="button" className={category === 'all' ? 'is-active' : ''} onClick={() => chooseCategory('all')}>{text('All decks', 'Alle Stapel')}</button>
            {categories.map((value) => <button type="button" key={value} className={category === value ? 'is-active' : ''} onClick={() => chooseCategory(value)}>{value}</button>)}
          </div>

          {card && (
            <button type="button" className={`public-study-flashcard${flipped ? ' is-flipped' : ''}`} onClick={() => setFlipped((value) => !value)} aria-label={flipped ? text('Show front', 'Vorderseite zeigen') : text('Show answer', 'Antwort zeigen')}>
              <small>{card.category} · {flipped ? text('Back', 'Rückseite') : text('Front', 'Vorderseite')}</small>
              {faceText && <strong>{faceText}</strong>}
              {faceInk.length > 0 && <StudyCardInk strokes={faceInk} label={flipped ? text('Handwritten answer', 'Handgeschriebene Antwort') : text('Handwritten question', 'Handgeschriebene Frage')} />}
              <span><RotateCcw size={14} />{text('Tap to flip', 'Zum Umdrehen tippen')}</span>
            </button>
          )}

          <div className="public-flashcard-controls">
            <button type="button" onClick={() => move(-1)}><ChevronLeft size={18} />{text('Previous', 'Zurück')}</button>
            <strong>{index % visible.length + 1} / {visible.length}</strong>
            <button type="button" onClick={() => move(1)}>{text('Next', 'Weiter')}<ChevronRight size={18} /></button>
            <button type="button" onClick={() => { setIndex(Math.floor(Math.random() * visible.length)); setFlipped(false) }}><RefreshCw size={17} />{text('Shuffle', 'Mischen')}</button>
          </div>
        </section>
      ) : <EmptyState title={text('No public flashcards yet', 'Noch keine öffentlichen Karteikarten')} message={text('Published cards will appear here as soon as they are ready.', 'Veröffentlichte Karten erscheinen hier, sobald sie bereit sind.')} />}
    </div>
  )
}
