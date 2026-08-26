import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Download, Eye, LoaderCircle, NotebookTabs, Sparkles } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState, LoadingState } from '../components/Feedback'
import { getPublicWhiteboards, recordWhiteboardView } from '../lib/api'
import { useLanguage } from '../lib/i18n'
import { flattenWhiteboardTree } from '../lib/whiteboard-utils'
import type { WhiteboardBoard, WhiteboardPageData, WhiteboardStroke } from '../types'

const WIDTH = 1240
const HEIGHT = 1754
const COLLAPSED_BOARDS_KEY = 'nya-collapsed-whiteboards-v1'
const fontFamilies = { handwritten: '"Segoe Print", "Comic Sans MS", cursive', sans: 'Inter, system-ui, sans-serif', serif: 'Georgia, serif', mono: 'ui-monospace, monospace' }
const imageCache = new Map<string, HTMLImageElement>()

function cacheImage(url: string): HTMLImageElement {
  let image = imageCache.get(url)
  if (image) return image
  if (imageCache.size >= 64) imageCache.delete(imageCache.keys().next().value as string)
  image = new Image(); image.crossOrigin = 'anonymous'; image.onerror = () => imageCache.delete(url); image.src = url; imageCache.set(url, image)
  return image
}

function drawStroke(context: CanvasRenderingContext2D, stroke: WhiteboardStroke) {
  if (!stroke.points.length) return
  context.save()
  if (stroke.tool === 'image' && stroke.imageUrl) { const image = cacheImage(stroke.imageUrl); if (image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) { try { context.drawImage(image, stroke.points[0].x, stroke.points[0].y, stroke.width || 420, stroke.height || 300) } catch { imageCache.delete(stroke.imageUrl) } } if (stroke.text) { context.fillStyle = stroke.colour; context.font = `${stroke.bold ? '700 ' : ''}${stroke.fontSize || 26}px Inter, system-ui, sans-serif`; context.fillText(stroke.text, stroke.points[0].x, stroke.points[0].y + (stroke.height || 300) + 12) } context.restore(); return }
  if (stroke.tool === 'text' || stroke.tool === 'note' || stroke.tool === 'link') {
    if (stroke.tool === 'note' || stroke.tool === 'link') { context.fillStyle = stroke.tool === 'link' ? '#f7e7f0' : stroke.noteColour || '#fff0a9'; context.shadowColor = 'rgba(72,45,58,.18)'; context.shadowBlur = 18; context.fillRect(stroke.points[0].x, stroke.points[0].y, stroke.width || 300, stroke.height || 220); context.shadowBlur = 0 }
    context.fillStyle = stroke.colour; context.textBaseline = 'top'; context.font = `${stroke.italic ? 'italic ' : ''}${stroke.bold ? '700 ' : ''}${stroke.fontSize || 36}px ${fontFamilies[stroke.fontFamily || 'handwritten']}`
    const inset = stroke.tool === 'note' || stroke.tool === 'link' ? 24 : 0; (stroke.text || '').split('\n').forEach((line, index) => { const x = stroke.points[0].x + inset; const y = stroke.points[0].y + inset + index * (stroke.fontSize || 36) * 1.25; context.fillText(line, x, y); if (stroke.underline) { context.beginPath(); context.moveTo(x, y + (stroke.fontSize || 36) * 1.08); context.lineTo(x + context.measureText(line).width, y + (stroke.fontSize || 36) * 1.08); context.strokeStyle = stroke.colour; context.stroke() } })
    context.restore(); return
  }
  if ((stroke.tool === 'arrow' || stroke.tool === 'line') && stroke.points.length > 1) { const start = stroke.points[0]; const end = stroke.points[stroke.points.length - 1]; const angle = Math.atan2(end.y - start.y, end.x - start.x); const head = Math.max(18, stroke.size * 4); context.strokeStyle = stroke.colour; context.lineWidth = stroke.size; context.lineCap = 'round'; context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke(); if (stroke.tool === 'arrow') { context.beginPath(); context.moveTo(end.x, end.y); context.lineTo(end.x - head * Math.cos(angle - Math.PI / 6), end.y - head * Math.sin(angle - Math.PI / 6)); context.moveTo(end.x, end.y); context.lineTo(end.x - head * Math.cos(angle + Math.PI / 6), end.y - head * Math.sin(angle + Math.PI / 6)); context.stroke() } context.restore(); return }
  if ((stroke.tool === 'circle' || stroke.tool === 'rectangle') && stroke.points.length > 1) { const start = stroke.points[0]; const end = stroke.points[stroke.points.length - 1]; const left = Math.min(start.x, end.x); const top = Math.min(start.y, end.y); const width = Math.abs(end.x - start.x); const height = Math.abs(end.y - start.y); context.strokeStyle = stroke.colour; context.lineWidth = stroke.size; context.beginPath(); if (stroke.tool === 'circle') context.ellipse(left + width / 2, top + height / 2, Math.max(1, width / 2), Math.max(1, height / 2), 0, 0, Math.PI * 2); else context.rect(left, top, width, height); context.stroke(); context.restore(); return }
  context.lineCap = 'round'; context.lineJoin = 'round'; context.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over'; context.globalAlpha = stroke.tool === 'highlighter' ? stroke.opacity ?? .3 : 1; context.strokeStyle = stroke.colour
  if (stroke.points.length === 1) { const point = stroke.points[0]; context.beginPath(); context.arc(point.x, point.y, Math.max(1, stroke.size * .5), 0, Math.PI * 2); context.fillStyle = stroke.colour; context.fill() }
  else if (stroke.tool === 'highlighter') { context.lineWidth = stroke.size; context.beginPath(); context.moveTo(stroke.points[0].x, stroke.points[0].y); for (let index = 1; index < stroke.points.length - 1; index += 1) { const current = stroke.points[index]; const next = stroke.points[index + 1]; context.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2) } context.lineTo(stroke.points[stroke.points.length - 1].x, stroke.points[stroke.points.length - 1].y); context.stroke() }
  else for (let index = 1; index < stroke.points.length; index += 1) { const previous = stroke.points[index - 1]; const current = stroke.points[index]; context.lineWidth = stroke.size * (.65 + ((previous.pressure + current.pressure) / 2) * .5); context.beginPath(); context.moveTo(previous.x, previous.y); context.lineTo(current.x, current.y); context.stroke() }
  context.restore()
}

function paintBackground(context: CanvasRenderingContext2D, page: WhiteboardPageData) {
  const ruling = Math.max(10, page.rulingSize || 20)
  context.save(); context.fillStyle = '#fffdf9'; context.fillRect(0, 0, WIDTH, HEIGHT)
  context.strokeStyle = page.background === 'lined' ? 'rgba(112,143,165,.22)' : 'rgba(142,111,132,.16)'; context.fillStyle = 'rgba(142,111,132,.2)'; context.lineWidth = 1
  if (page.background === 'grid') for (let x = 0; x <= WIDTH; x += ruling) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, HEIGHT); context.stroke() }
  if (['grid', 'lined', 'margin', 'cornell', 'checklist'].includes(page.background)) for (let y = 0; y <= HEIGHT; y += ruling) { context.beginPath(); context.moveTo(0, y); context.lineTo(WIDTH, y); context.stroke() }
  if (page.background === 'dots') for (let y = ruling; y < HEIGHT; y += ruling) for (let x = ruling; x < WIDTH; x += ruling) { context.beginPath(); context.arc(x, y, 1.5, 0, Math.PI * 2); context.fill() }
  if (page.background === 'margin') { context.strokeStyle = 'rgba(224,111,139,.42)'; context.beginPath(); context.moveTo(WIDTH * .11, 0); context.lineTo(WIDTH * .11, HEIGHT); context.stroke() }
  if (page.background === 'cornell') { context.strokeStyle = 'rgba(178,124,148,.3)'; context.beginPath(); context.moveTo(WIDTH * .28, 0); context.lineTo(WIDTH * .28, HEIGHT); context.moveTo(0, HEIGHT * .83); context.lineTo(WIDTH, HEIGHT * .83); context.stroke() }
  if (page.background === 'checklist') { context.strokeStyle = 'rgba(178,124,148,.28)'; context.beginPath(); context.moveTo(WIDTH * .09, 0); context.lineTo(WIDTH * .09, HEIGHT); context.stroke() }
  context.restore()
}

function readCollapsedBoards(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(COLLAPSED_BOARDS_KEY) || '[]') as string[]) } catch { return new Set() }
}

function safeFilename(value: string): string { return value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'notebook' }
function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character) }

async function ensurePageImages(page: WhiteboardPageData): Promise<void> {
  const urls = [...new Set(page.strokes.flatMap((stroke) => stroke.imageUrl ? [stroke.imageUrl] : []))]
  await Promise.all(urls.map((url) => new Promise<void>((resolve) => {
    const image = cacheImage(url)
    if (image.complete) { resolve(); return }
    image.addEventListener('load', () => resolve(), { once: true })
    image.addEventListener('error', () => resolve(), { once: true })
  })))
}

async function renderPageDownload(page: WhiteboardPageData): Promise<HTMLCanvasElement> {
  await ensurePageImages(page)
  const logical = document.createElement('canvas'); logical.width = WIDTH; logical.height = HEIGHT
  const context = logical.getContext('2d'); if (!context) throw new Error('This page could not be prepared for download.')
  paintBackground(context, page); page.strokes.forEach((stroke) => { try { drawStroke(context, stroke) } catch { /* Keep the remaining page downloadable. */ } })
  if (page.orientation !== 'landscape') return logical
  const landscape = document.createElement('canvas'); landscape.width = HEIGHT; landscape.height = WIDTH
  const landscapeContext = landscape.getContext('2d'); if (!landscapeContext) return logical
  landscapeContext.drawImage(logical, 0, 0, landscape.width, landscape.height)
  return landscape
}

function triggerDownload(blob: Blob, filename: string) {
  const link = document.createElement('a'); const url = URL.createObjectURL(blob)
  link.href = url; link.download = filename; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function PublicNotebooksPage() {
  const { text } = useLanguage()
  const [searchParams] = useSearchParams()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [boards, setBoards] = useState<WhiteboardBoard[]>([])
  const [boardId, setBoardId] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<'page' | 'board' | ''>('')
  const [downloadError, setDownloadError] = useState('')
  const [includeSubboards, setIncludeSubboards] = useState(true)
  const [collapsedBoardIds, setCollapsedBoardIds] = useState<Set<string>>(readCollapsedBoards)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const board = useMemo(() => boards.find((candidate) => candidate.id === boardId) || boards[0], [boardId, boards])
  const page = board?.pages[pageIndex]
  const notebookTree = useMemo(() => flattenWhiteboardTree(boards, collapsedBoardIds), [boards, collapsedBoardIds])

  useEffect(() => {
    try { localStorage.setItem(COLLAPSED_BOARDS_KEY, JSON.stringify([...collapsedBoardIds])) } catch { /* Collapsing remains available for this session. */ }
  }, [collapsedBoardIds])

  useEffect(() => { getPublicWhiteboards().then((result) => { setBoards(result); const requested = searchParams.get('board'); const selected = result.find((item) => item.id === requested) || result[0]; setBoardId(selected?.id || ''); const requestedPage = searchParams.get('page'); setPageIndex(Math.max(0, selected?.pages.findIndex((item) => item.id === requestedPage) || 0)) }).finally(() => setLoading(false)) }, [searchParams])
  useEffect(() => {
    if (!board?.id) return
    void recordWhiteboardView(board.id).then((viewCount) => {
      if (viewCount !== null) setBoards((current) => current.map((candidate) => candidate.id === board.id ? { ...candidate, viewCount } : candidate))
    })
  }, [board?.id])
  useEffect(() => {
    const context = canvasRef.current?.getContext('2d'); if (!context || !page) return
    const repaint = () => { context.clearRect(0, 0, WIDTH, HEIGHT); page.strokes.forEach((stroke) => { try { drawStroke(context, stroke) } catch { /* Keep the rest of the public page readable. */ } }) }; repaint()
    const pendingImages = page.strokes.map((stroke) => stroke.imageUrl ? imageCache.get(stroke.imageUrl) : undefined).filter((image): image is HTMLImageElement => Boolean(image && !image.complete))
    pendingImages.forEach((image) => image.addEventListener('load', repaint, { once: true }))
    const animation = page.strokes.some((stroke) => stroke.tool === 'image' && stroke.imageUrl?.toLowerCase().includes('.gif')) ? window.setInterval(() => { if (!document.hidden) repaint() }, 160) : 0
    return () => { if (animation) window.clearInterval(animation); pendingImages.forEach((image) => image.removeEventListener('load', repaint)) }
  }, [page])

  function openBoard(id: string) { setBoardId(id); setPageIndex(0) }
  function movePage(direction: number) { if (board) setPageIndex((current) => (current + direction + board.pages.length) % board.pages.length) }
  function toggleBoardCollapsed(id: string) { setCollapsedBoardIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next }) }
  async function downloadPage() {
    if (!board || !page || downloading) return
    setDownloading('page'); setDownloadError('')
    try {
      const output = await renderPageDownload(page)
      const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('This page could not be converted into an image.')
      triggerDownload(blob, `${safeFilename(board.title)}-${safeFilename(page.name)}.png`)
    } catch (reason) { setDownloadError(reason instanceof Error ? reason.message : text('The page could not be downloaded.', 'Die Seite konnte nicht heruntergeladen werden.')) }
    finally { setDownloading('') }
  }
  async function downloadBoard() {
    if (!board || downloading) return
    setDownloading('board'); setDownloadError('')
    try {
      const includedBoards = includeSubboards ? [board, ...boards.filter((candidate) => candidate.parentId === board.id)] : [board]
      const pages: string[] = []
      for (const included of includedBoards) for (const candidate of included.pages) {
        const output = await renderPageDownload(candidate)
        pages.push(`<section><h2>${escapeHtml(included.title)}</h2><figure><img src="${output.toDataURL('image/png')}" alt="${escapeHtml(candidate.name)}"><figcaption>${escapeHtml(candidate.name)}</figcaption></figure></section>`)
      }
      const documentFile = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(board.title)}</title><style>body{margin:0;padding:24px;background:#eee;color:#253a35;font:16px system-ui}h1{text-align:center}figure{max-width:1000px;margin:24px auto;break-after:page}img{display:block;width:100%;height:auto;background:#fff;box-shadow:0 8px 30px #0002}figcaption{text-align:center;margin:10px}@media print{body{padding:0;background:#fff}h1,figcaption{display:none}figure{margin:0;max-width:none}img{box-shadow:none}}</style><h1>${escapeHtml(board.title)}</h1>${pages.join('')}</html>`
      triggerDownload(new Blob([documentFile], { type: 'text/html;charset=utf-8' }), `${safeFilename(board.title)}-complete-board.html`)
    } catch (reason) { setDownloadError(reason instanceof Error ? reason.message : text('The board could not be downloaded.', 'Das Lernheft konnte nicht heruntergeladen werden.')) }
    finally { setDownloading('') }
  }

  return <div className="public-notebooks-page page-shell section-shell">
    <header className="page-header"><p className="eyebrow"><Sparkles size={15} />{text("Yuuki's study pages", 'Yuukis Lernseiten')}</p><h1>{text('Published notebooks', 'Veröffentlichte Lernhefte')}</h1><p>{text('A read-only look through handwritten notes, highlighted topics and finished school pages.', 'Ein schreibgeschützter Einblick in handschriftliche Notizen, markierte Themen und fertige Schulseiten.')}</p></header>
    {loading ? <LoadingState label={text('Opening the notebooks…', 'Lernhefte werden geöffnet…')} /> : !boards.length ? <EmptyState title={text('No published notebooks yet', 'Noch keine veröffentlichten Lernhefte')} message={text('Finished pages will appear here when Yuuki chooses to publish them.', 'Fertige Seiten erscheinen hier, sobald Yuuki sie veröffentlicht.')} /> : <div className="public-notebook-layout">
      <aside><strong>{text('Notebook shelf', 'Lernheft-Regal')}</strong>{notebookTree.map(({ board: candidate, depth, hasChildren, collapsed }) => <button type="button" key={candidate.id} className={`${candidate.id === board?.id ? 'is-active' : ''} ${depth ? 'is-subboard' : ''} cover-${candidate.pages[0]?.coverStyle || 'blossom'}`} style={{ '--public-board-depth': depth, '--cover-image': candidate.coverImage ? `url("${candidate.coverImage}")` : 'none' } as React.CSSProperties} onClick={() => openBoard(candidate.id)}>{depth ? <ChevronRight size={16} /> : <NotebookTabs size={18} />}{hasChildren && <span className="board-collapse-toggle" role="button" tabIndex={0} title={collapsed ? text('Show subboards', 'Unterboards anzeigen') : text('Hide subboards', 'Unterboards ausblenden')} aria-expanded={!collapsed} onClick={(event) => { event.stopPropagation(); toggleBoardCollapsed(candidate.id) }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); toggleBoardCollapsed(candidate.id) } }}>{collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</span>}<span className="board-label">{candidate.title}<small>{depth ? `${text('Subboard', 'Unterboard')} · ` : ''}{candidate.pages.length} {candidate.pages.length === 1 ? text('page', 'Seite') : text('pages', 'Seiten')}</small></span></button>)}</aside>
      {board && page && <section className="public-notebook-viewer">
        <div className="public-notebook-heading"><div><small><Eye size={13} />{text('Read only', 'Schreibgeschützt')} · {board.viewCount || 0} {text('views', 'Aufrufe')}</small><h2>{board.title}</h2><p>{page.name}</p></div><div className="public-download-actions"><span>{pageIndex + 1} / {board.pages.length}</span><button type="button" onClick={() => { void downloadPage() }} disabled={Boolean(downloading)}>{downloading === 'page' ? <LoaderCircle className="spin" size={15} /> : <Download size={15} />}{text('Page', 'Seite')}</button><label className="include-subboards"><input type="checkbox" checked={includeSubboards} onChange={(event) => setIncludeSubboards(event.target.checked)} />{text('Include subboards', 'Unterboards einschließen')}</label><button type="button" onClick={() => { void downloadBoard() }} disabled={Boolean(downloading)}>{downloading === 'board' ? <LoaderCircle className="spin" size={15} /> : <Download size={15} />}{text('Whole board', 'Ganzes Heft')}</button></div></div>
        {downloadError && <p className="public-download-error" role="alert">{downloadError}</p>}
        <div className="public-a4-stage" onTouchStart={(event) => { if (event.touches.length === 1) swipeStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY } }} onTouchEnd={(event) => { if (!swipeStart.current || !event.changedTouches[0]) return; const dx = event.changedTouches[0].clientX - swipeStart.current.x; if (Math.abs(dx) > 70) movePage(dx < 0 ? 1 : -1); swipeStart.current = null }}><div className={`public-a4-paper orientation-${page.orientation || 'portrait'} background-${page.background}`} style={{ '--ruling-x': `${(page.rulingSize || 20) / WIDTH * 100}%`, '--ruling-y': `${(page.rulingSize || 20) / HEIGHT * 100}%` } as React.CSSProperties}><canvas ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label={`${board.title}, ${page.name}`} />{page.strokes.filter((stroke) => stroke.url && stroke.points[0]).map((stroke) => <a key={stroke.id} className="public-board-link" href={stroke.url} target={stroke.url?.startsWith('http') ? '_blank' : undefined} rel="noreferrer" style={{ left: `${stroke.points[0].x / WIDTH * 100}%`, top: `${stroke.points[0].y / HEIGHT * 100}%`, width: `${(stroke.width || Math.max(150, (stroke.text?.length || 8) * (stroke.fontSize || 30) * .55)) / WIDTH * 100}%`, height: `${(stroke.height || (stroke.fontSize || 30) * 1.4) / HEIGHT * 100}%` }} aria-label={stroke.text || 'Open linked resource'} />)}</div></div>
        <div className="public-page-controls"><button type="button" onClick={() => movePage(-1)} disabled={board.pages.length < 2}><ChevronLeft size={17} />{text('Previous', 'Zurück')}</button><div>{board.pages.map((candidate, index) => <button key={candidate.id} type="button" className={index === pageIndex ? 'is-active' : ''} onClick={() => setPageIndex(index)} aria-label={`${text('Open', 'Öffne')} ${candidate.name}`}>{index + 1}</button>)}</div><button type="button" onClick={() => movePage(1)} disabled={board.pages.length < 2}>{text('Next', 'Weiter')}<ChevronRight size={17} /></button></div>
      </section>}
    </div>}
  </div>
}
