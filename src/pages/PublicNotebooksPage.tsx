import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, NotebookTabs, Sparkles } from 'lucide-react'
import { EmptyState, LoadingState } from '../components/Feedback'
import { getPublicWhiteboards } from '../lib/api'
import { useLanguage } from '../lib/i18n'
import type { WhiteboardBoard, WhiteboardStroke } from '../types'

const WIDTH = 1240
const HEIGHT = 1754

function drawStroke(context: CanvasRenderingContext2D, stroke: WhiteboardStroke) {
  if (!stroke.points.length) return
  context.save()
  if (stroke.tool === 'text' || stroke.tool === 'note') {
    const families = { handwritten: '"Segoe Print", "Comic Sans MS", cursive', sans: 'Inter, system-ui, sans-serif', serif: 'Georgia, serif', mono: 'ui-monospace, monospace' }
    if (stroke.tool === 'note') { context.fillStyle = stroke.noteColour || '#fff0a9'; context.shadowColor = 'rgba(72,45,58,.18)'; context.shadowBlur = 18; context.fillRect(stroke.points[0].x, stroke.points[0].y, stroke.width || 300, stroke.height || 220); context.shadowBlur = 0 }
    context.fillStyle = stroke.colour; context.textBaseline = 'top'; context.font = `${stroke.fontSize || 36}px ${families[stroke.fontFamily || 'handwritten']}`
    const inset = stroke.tool === 'note' ? 24 : 0; (stroke.text || '').split('\n').forEach((line, index) => context.fillText(line, stroke.points[0].x + inset, stroke.points[0].y + inset + index * (stroke.fontSize || 36) * 1.25))
    context.restore(); return
  }
  if (stroke.tool === 'arrow' && stroke.points.length > 1) { const start = stroke.points[0]; const end = stroke.points[stroke.points.length - 1]; const angle = Math.atan2(end.y - start.y, end.x - start.x); const head = Math.max(18, stroke.size * 4); context.strokeStyle = stroke.colour; context.lineWidth = stroke.size; context.lineCap = 'round'; context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke(); context.beginPath(); context.moveTo(end.x, end.y); context.lineTo(end.x - head * Math.cos(angle - Math.PI / 6), end.y - head * Math.sin(angle - Math.PI / 6)); context.moveTo(end.x, end.y); context.lineTo(end.x - head * Math.cos(angle + Math.PI / 6), end.y - head * Math.sin(angle + Math.PI / 6)); context.stroke(); context.restore(); return }
  context.lineCap = 'round'; context.lineJoin = 'round'; context.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over'; context.globalAlpha = stroke.tool === 'highlighter' ? .24 : 1; context.strokeStyle = stroke.colour
  if (stroke.points.length === 1) { const point = stroke.points[0]; context.beginPath(); context.arc(point.x, point.y, Math.max(1, stroke.size * .5), 0, Math.PI * 2); context.fillStyle = stroke.colour; context.fill() }
  else for (let index = 1; index < stroke.points.length; index += 1) { const previous = stroke.points[index - 1]; const current = stroke.points[index]; context.lineWidth = stroke.size * (.65 + ((previous.pressure + current.pressure) / 2) * .5); context.beginPath(); context.moveTo(previous.x, previous.y); context.lineTo(current.x, current.y); context.stroke() }
  context.restore()
}

export function PublicNotebooksPage() {
  const { text } = useLanguage()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [boards, setBoards] = useState<WhiteboardBoard[]>([])
  const [boardId, setBoardId] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const board = useMemo(() => boards.find((candidate) => candidate.id === boardId) || boards[0], [boardId, boards])
  const page = board?.pages[pageIndex]

  useEffect(() => { getPublicWhiteboards().then((result) => { setBoards(result); setBoardId(result[0]?.id || '') }).finally(() => setLoading(false)) }, [])
  useEffect(() => {
    const context = canvasRef.current?.getContext('2d'); if (!context || !page) return
    context.clearRect(0, 0, WIDTH, HEIGHT); page.strokes.forEach((stroke) => drawStroke(context, stroke))
  }, [page])

  function openBoard(id: string) { setBoardId(id); setPageIndex(0) }
  function movePage(direction: number) { if (board) setPageIndex((current) => (current + direction + board.pages.length) % board.pages.length) }

  return <div className="public-notebooks-page page-shell section-shell">
    <header className="page-header"><p className="eyebrow"><Sparkles size={15} />{text("Yuuki's study pages", 'Yuukis Lernseiten')}</p><h1>{text('Published notebooks', 'Veröffentlichte Lernhefte')}</h1><p>{text('A read-only look through handwritten notes, highlighted topics and finished school pages.', 'Ein schreibgeschützter Einblick in handschriftliche Notizen, markierte Themen und fertige Schulseiten.')}</p></header>
    {loading ? <LoadingState label={text('Opening the notebooks…', 'Lernhefte werden geöffnet…')} /> : !boards.length ? <EmptyState title={text('No published notebooks yet', 'Noch keine veröffentlichten Lernhefte')} message={text('Finished pages will appear here when Yuuki chooses to publish them.', 'Fertige Seiten erscheinen hier, sobald Yuuki sie veröffentlicht.')} /> : <div className="public-notebook-layout">
      <aside><strong>{text('Notebook shelf', 'Lernheft-Regal')}</strong>{boards.map((candidate) => <button type="button" key={candidate.id} className={candidate.id === board?.id ? 'is-active' : ''} onClick={() => openBoard(candidate.id)}><NotebookTabs size={18} /><span>{candidate.title}<small>{candidate.pages.length} {candidate.pages.length === 1 ? text('page', 'Seite') : text('pages', 'Seiten')}</small></span></button>)}</aside>
      {board && page && <section className="public-notebook-viewer">
        <div className="public-notebook-heading"><div><small><Eye size={13} />{text('Read only', 'Schreibgeschützt')}</small><h2>{board.title}</h2><p>{page.name}</p></div><span>{pageIndex + 1} / {board.pages.length}</span></div>
        <div className="public-a4-stage"><div className={`public-a4-paper background-${page.background}`}><canvas ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label={`${board.title}, ${page.name}`} /></div></div>
        <div className="public-page-controls"><button type="button" onClick={() => movePage(-1)} disabled={board.pages.length < 2}><ChevronLeft size={17} />{text('Previous', 'Zurück')}</button><div>{board.pages.map((candidate, index) => <button key={candidate.id} type="button" className={index === pageIndex ? 'is-active' : ''} onClick={() => setPageIndex(index)} aria-label={`${text('Open', 'Öffne')} ${candidate.name}`}>{index + 1}</button>)}</div><button type="button" onClick={() => movePage(1)} disabled={board.pages.length < 2}>{text('Next', 'Weiter')}<ChevronRight size={17} /></button></div>
      </section>}
    </div>}
  </div>
}
