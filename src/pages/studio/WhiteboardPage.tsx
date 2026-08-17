import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight, Check, Download, Eraser, Eye, EyeOff, FilePlus2, Grid3X3, Highlighter, LoaderCircle, Minus, MousePointer2, PenLine,
  Plus, Redo2, RotateCcw, Save, Sparkles, StickyNote, TextCursorInput, Trash2, Undo2, X, ZoomIn, ZoomOut,
} from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { ErrorNotice, LoadingState } from '../../components/Feedback'
import { adminApi } from '../../lib/api'
import { newId } from '../../lib/format'
import type { WhiteboardBackground, WhiteboardBoard, WhiteboardPageData, WhiteboardPoint, WhiteboardStroke, WhiteboardTool } from '../../types'
import { StudioNav, useStudioSession } from './StudioPages'

const BOARD_WIDTH = 1240
const BOARD_HEIGHT = 1754
const colours = ['#253a35', '#bd5d87', '#9164a0', '#477f91', '#5d8b6b', '#d28155', '#d54f68', '#f0c44f']

function drawStroke(context: CanvasRenderingContext2D, stroke: WhiteboardStroke) {
  if (!stroke.points.length) return
  context.save()
  if (stroke.tool === 'text' || stroke.tool === 'note') {
    const families = { handwritten: '"Segoe Print", "Comic Sans MS", cursive', sans: 'Inter, system-ui, sans-serif', serif: 'Georgia, serif', mono: 'ui-monospace, monospace' }
    if (stroke.tool === 'note') { context.fillStyle = stroke.noteColour || '#fff0a9'; context.shadowColor = 'rgba(72,45,58,.18)'; context.shadowBlur = 18; context.fillRect(stroke.points[0].x, stroke.points[0].y, stroke.width || 300, stroke.height || 220); context.shadowBlur = 0 }
    context.fillStyle = stroke.colour; context.globalAlpha = 1; context.textBaseline = 'top'; context.font = `${stroke.fontSize || 36}px ${families[stroke.fontFamily || 'handwritten']}`
    const inset = stroke.tool === 'note' ? 24 : 0; const lines = (stroke.text || '').split('\n'); lines.forEach((line, index) => context.fillText(line, stroke.points[0].x + inset, stroke.points[0].y + inset + index * (stroke.fontSize || 36) * 1.25))
    context.restore(); return
  }
  if (stroke.tool === 'arrow' && stroke.points.length > 1) {
    const start = stroke.points[0]; const end = stroke.points[stroke.points.length - 1]; const angle = Math.atan2(end.y - start.y, end.x - start.x); const head = Math.max(18, stroke.size * 4)
    context.strokeStyle = stroke.colour; context.lineWidth = stroke.size; context.lineCap = 'round'; context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke(); context.beginPath(); context.moveTo(end.x, end.y); context.lineTo(end.x - head * Math.cos(angle - Math.PI / 6), end.y - head * Math.sin(angle - Math.PI / 6)); context.moveTo(end.x, end.y); context.lineTo(end.x - head * Math.cos(angle + Math.PI / 6), end.y - head * Math.sin(angle + Math.PI / 6)); context.stroke(); context.restore(); return
  }
  context.lineCap = 'round'; context.lineJoin = 'round'
  context.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
  context.globalAlpha = stroke.tool === 'highlighter' ? .24 : 1
  context.strokeStyle = stroke.colour
  const points = stroke.points
  if (points.length === 1) {
    context.beginPath(); context.arc(points[0].x, points[0].y, Math.max(1, stroke.size * .5), 0, Math.PI * 2); context.fillStyle = stroke.tool === 'eraser' ? '#000' : stroke.colour; context.fill()
  } else {
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1]; const current = points[index]
      context.lineWidth = stroke.size * (.65 + ((previous.pressure + current.pressure) / 2) * .5)
      context.beginPath(); context.moveTo(previous.x, previous.y); context.lineTo(current.x, current.y); context.stroke()
    }
  }
  context.restore()
}

function paintBackground(context: CanvasRenderingContext2D, background: WhiteboardBackground) {
  context.save(); context.fillStyle = '#fffdf9'; context.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT)
  context.strokeStyle = background === 'lined' ? 'rgba(112,143,165,.22)' : 'rgba(142,111,132,.16)'; context.fillStyle = 'rgba(142,111,132,.2)'; context.lineWidth = 1
  if (background === 'grid') for (let x = 0; x <= BOARD_WIDTH; x += 40) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, BOARD_HEIGHT); context.stroke() }
  if (background === 'grid' || background === 'lined') for (let y = 0; y <= BOARD_HEIGHT; y += 40) { context.beginPath(); context.moveTo(0, y); context.lineTo(BOARD_WIDTH, y); context.stroke() }
  if (background === 'dots') for (let y = 20; y < BOARD_HEIGHT; y += 40) for (let x = 20; x < BOARD_WIDTH; x += 40) { context.beginPath(); context.arc(x, y, 1.5, 0, Math.PI * 2); context.fill() }
  context.restore()
}

export function WhiteboardPage() {
  const session = useStudioSession()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activeStroke = useRef<WhiteboardStroke | null>(null)
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve())
  const saveVersion = useRef(0)
  const [boards, setBoards] = useState<WhiteboardBoard[]>([])
  const [activeId, setActiveId] = useState('')
  const [activePageId, setActivePageId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [tool, setTool] = useState<WhiteboardTool>('pen')
  const [colour, setColour] = useState(colours[0])
  const [size, setSize] = useState(7)
  const [zoom, setZoom] = useState(70)
  const [stylusOnly, setStylusOnly] = useState(false)
  const [fontFamily, setFontFamily] = useState<NonNullable<WhiteboardStroke['fontFamily']>>('handwritten')
  const [fontSize, setFontSize] = useState(38)
  const [selectedId, setSelectedId] = useState('')
  const [editor, setEditor] = useState<{ kind: 'text' | 'note'; point: WhiteboardPoint; value: string } | null>(null)
  const drag = useRef<{ id: string; start: WhiteboardPoint; original: WhiteboardPoint[] } | null>(null)
  const [past, setPast] = useState<WhiteboardStroke[][]>([])
  const [future, setFuture] = useState<WhiteboardStroke[][]>([])
  const board = useMemo(() => boards.find((candidate) => candidate.id === activeId), [activeId, boards])
  const page = useMemo(() => board?.pages.find((candidate) => candidate.id === activePageId) || board?.pages[0], [activePageId, board])

  useEffect(() => {
    if (!session?.authenticated) return
    adminApi.whiteboards().then(async ({ boards: loaded }) => {
      if (loaded.length) { setBoards(loaded); setActiveId(loaded[0].id); setActivePageId(loaded[0].pages[0]?.id || ''); return }
      const time = new Date().toISOString()
      const firstPage: WhiteboardPageData = { id: newId('page'), name: 'Page 1', background: 'grid', strokes: [] }
      const starter: WhiteboardBoard = { id: newId('board'), title: 'My first study notebook', pages: [firstPage], published: false, createdAt: time, updatedAt: time }
      const result = await adminApi.saveWhiteboard(starter, true)
      setBoards([result.board]); setActiveId(result.board.id); setActivePageId(result.board.pages[0].id)
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'The whiteboards could not be opened.')).finally(() => setLoading(false))
  }, [session])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !page) return
    const context = canvas.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT)
    page.strokes.forEach((stroke) => drawStroke(context, stroke))
  }, [page])

  const saveBoard = useCallback((next: WhiteboardBoard) => {
    const version = ++saveVersion.current
    setSaveState('saving')
    saveQueue.current = saveQueue.current.catch(() => undefined).then(() => adminApi.saveWhiteboard(next)).then(() => {
      if (version === saveVersion.current) setSaveState('saved')
    }).catch((reason) => {
      if (version === saveVersion.current) setSaveState('unsaved')
      setError(reason instanceof Error ? reason.message : 'The board could not be saved.')
    })
    return saveQueue.current
  }, [])

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>): WhiteboardPoint {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: Math.max(0, Math.min(BOARD_WIDTH, (event.clientX - rect.left) * BOARD_WIDTH / rect.width)), y: Math.max(0, Math.min(BOARD_HEIGHT, (event.clientY - rect.top) * BOARD_HEIGHT / rect.height)), pressure: event.pressure || .5 }
  }

  function beginStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!board || !page || (stylusOnly && event.pointerType !== 'pen')) return
    const point = pointFromEvent(event)
    if (tool === 'text' || tool === 'note') { setEditor({ kind: tool, point, value: '' }); setSelectedId(''); return }
    if (tool === 'select') {
      const hit = [...page.strokes].reverse().find((stroke) => {
        if (!['text', 'note'].includes(stroke.tool) || !stroke.points[0]) return false
        const width = stroke.tool === 'note' ? stroke.width || 300 : Math.max(120, (stroke.text?.length || 1) * (stroke.fontSize || 36) * .55)
        const height = stroke.tool === 'note' ? stroke.height || 220 : Math.max(stroke.fontSize || 36, (stroke.text?.split('\n').length || 1) * (stroke.fontSize || 36) * 1.25)
        return point.x >= stroke.points[0].x && point.x <= stroke.points[0].x + width && point.y >= stroke.points[0].y && point.y <= stroke.points[0].y + height
      })
      setSelectedId(hit?.id || '')
      if (hit) { event.currentTarget.setPointerCapture(event.pointerId); drag.current = { id: hit.id, start: point, original: hit.points.map((item) => ({ ...item })) }; setPast((history) => [...history.slice(-49), page.strokes]); setFuture([]) }
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    const stroke: WhiteboardStroke = { id: newId('stroke'), tool, colour, size: tool === 'highlighter' ? Math.max(18, size * 3.2) : tool === 'eraser' ? Math.max(18, size * 2.5) : size, points: [point] }
    activeStroke.current = stroke
    const context = event.currentTarget.getContext('2d'); if (context) drawStroke(context, stroke)
  }

  function continueStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (drag.current && page) { const point = pointFromEvent(event); const dx = point.x - drag.current.start.x; const dy = point.y - drag.current.start.y; updatePage({ strokes: page.strokes.map((stroke) => stroke.id === drag.current?.id ? { ...stroke, points: drag.current.original.map((item) => ({ ...item, x: item.x + dx, y: item.y + dy })) } : stroke) }); return }
    const stroke = activeStroke.current
    if (!stroke || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    const point = pointFromEvent(event); const previous = stroke.points[stroke.points.length - 1]; stroke.points.push(point)
    const context = event.currentTarget.getContext('2d'); if (context) drawStroke(context, { ...stroke, points: [previous, point] })
  }

  function finishStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (drag.current) { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); drag.current = null; return }
    const stroke = activeStroke.current
    if (!stroke || !board || !page) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    activeStroke.current = null
    setPast((history) => [...history.slice(-49), page.strokes]); setFuture([])
    const next = { ...board, pages: board.pages.map((candidate) => candidate.id === page.id ? { ...candidate, strokes: [...candidate.strokes, stroke] } : candidate), updatedAt: new Date().toISOString() }
    setBoards((current) => current.map((candidate) => candidate.id === board.id ? next : candidate)); void saveBoard(next)
  }

  function commitEditor() {
    if (!editor || !page || !editor.value.trim()) { setEditor(null); return }
    const stroke: WhiteboardStroke = { id: newId(editor.kind), tool: editor.kind, colour, size: fontSize, fontSize, fontFamily, text: editor.value.trim(), points: [editor.point], ...(editor.kind === 'note' ? { width: 320, height: 230, noteColour: '#fff0a9' } : {}) }
    setPast((history) => [...history.slice(-49), page.strokes]); setFuture([]); updatePage({ strokes: [...page.strokes, stroke] }); setEditor(null); setSelectedId(stroke.id); setTool('select')
  }

  function updateSelected(patch: Partial<WhiteboardStroke>) { if (!page || !selectedId) return; updatePage({ strokes: page.strokes.map((stroke) => stroke.id === selectedId ? { ...stroke, ...patch } : stroke) }) }
  function deleteSelected() { if (!page || !selectedId) return; setPast((history) => [...history.slice(-49), page.strokes]); updatePage({ strokes: page.strokes.filter((stroke) => stroke.id !== selectedId) }); setSelectedId('') }

  function changeStrokes(strokes: WhiteboardStroke[], nextPast: WhiteboardStroke[][], nextFuture: WhiteboardStroke[][]) {
    if (!board || !page) return
    const next = { ...board, pages: board.pages.map((candidate) => candidate.id === page.id ? { ...candidate, strokes } : candidate), updatedAt: new Date().toISOString() }
    setPast(nextPast); setFuture(nextFuture); setBoards((current) => current.map((candidate) => candidate.id === board.id ? next : candidate)); void saveBoard(next)
  }

  function undo() { if (page && past.length) changeStrokes(past[past.length - 1], past.slice(0, -1), [page.strokes, ...future].slice(0, 50)) }
  function redo() { if (page && future.length) changeStrokes(future[0], [...past, page.strokes].slice(-50), future.slice(1)) }

  async function addBoard() {
    const time = new Date().toISOString(); const firstPage: WhiteboardPageData = { id: newId('page'), name: 'Page 1', background: 'grid', strokes: [] }; const next: WhiteboardBoard = { id: newId('board'), title: `Study notebook ${boards.length + 1}`, pages: [firstPage], published: false, createdAt: time, updatedAt: time }
    try { const result = await adminApi.saveWhiteboard(next, true); setBoards((current) => [result.board, ...current]); setActiveId(result.board.id); setActivePageId(result.board.pages[0].id); setPast([]); setFuture([]) } catch (reason) { setError(reason instanceof Error ? reason.message : 'The board could not be created.') }
  }

  async function deleteBoard() {
    if (!board || !window.confirm(`Delete “${board.title}”? This cannot be undone.`)) return
    try { await adminApi.removeWhiteboard(board.id); const remaining = boards.filter((candidate) => candidate.id !== board.id); setBoards(remaining); setActiveId(remaining[0]?.id || ''); setActivePageId(remaining[0]?.pages[0]?.id || ''); if (!remaining.length) await addBoard() } catch (reason) { setError(reason instanceof Error ? reason.message : 'The board could not be deleted.') }
  }

  function updateBoard(patch: Partial<WhiteboardBoard>) {
    if (!board) return
    const next = { ...board, ...patch, updatedAt: new Date().toISOString() }
    setBoards((current) => current.map((candidate) => candidate.id === board.id ? next : candidate)); void saveBoard(next)
  }

  function updatePage(patch: Partial<WhiteboardPageData>) {
    if (!board || !page) return
    const next = { ...board, pages: board.pages.map((candidate) => candidate.id === page.id ? { ...candidate, ...patch } : candidate), updatedAt: new Date().toISOString() }
    setBoards((current) => current.map((candidate) => candidate.id === board.id ? next : candidate)); void saveBoard(next)
  }

  function addPage() {
    if (!board) return
    const nextPage: WhiteboardPageData = { id: newId('page'), name: `Page ${board.pages.length + 1}`, background: page?.background || 'grid', strokes: [] }
    const next = { ...board, pages: [...board.pages, nextPage], updatedAt: new Date().toISOString() }
    setBoards((current) => current.map((candidate) => candidate.id === board.id ? next : candidate)); setActivePageId(nextPage.id); setPast([]); setFuture([]); void saveBoard(next)
  }

  function deletePage() {
    if (!board || !page || board.pages.length === 1 || !window.confirm(`Delete ${page.name}?`)) return
    const pages = board.pages.filter((candidate) => candidate.id !== page.id); const next = { ...board, pages, updatedAt: new Date().toISOString() }
    setBoards((current) => current.map((candidate) => candidate.id === board.id ? next : candidate)); setActivePageId(pages[0].id); setPast([]); setFuture([]); void saveBoard(next)
  }

  function exportPng() {
    if (!board || !page) return
    const output = document.createElement('canvas'); output.width = BOARD_WIDTH; output.height = BOARD_HEIGHT
    const context = output.getContext('2d'); if (!context) return
    paintBackground(context, page.background); page.strokes.forEach((stroke) => drawStroke(context, stroke))
    const link = document.createElement('a'); link.download = `${board.title}-${page.name}`.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.png'; link.href = output.toDataURL('image/png'); link.click()
  }

  if (session === undefined || (session?.authenticated && loading)) return <div className="page-shell section-shell"><LoadingState label="Opening the whiteboard…" /></div>
  if (!session?.authenticated) return <Navigate to="/studio/login" state={{ from: '/studio/whiteboard' }} replace />

  return <div className="whiteboard-page page-shell section-shell">
    <header className="studio-header"><div><p className="eyebrow"><Sparkles size={14} />Private study canvas</p><h1>Whiteboard</h1><p>Write, sketch and highlight school notes with your tablet pen. Boards stay private and save to your owner account.</p></div><StudioNav /></header>
    {error && <ErrorNotice message={error} />}
    <div className="whiteboard-layout">
      <aside className="whiteboard-sidebar">
        <div><strong>My boards</strong><button type="button" onClick={addBoard}><Plus size={15} />New</button></div>
        <nav>{boards.map((candidate) => <button key={candidate.id} type="button" className={candidate.id === activeId ? 'is-active' : ''} onClick={() => { setActiveId(candidate.id); setActivePageId(candidate.pages[0]?.id || ''); setPast([]); setFuture([]) }}><Grid3X3 size={15} /><span>{candidate.title}<small>{candidate.pages.length} pages · {candidate.pages.reduce((total, item) => total + item.strokes.length, 0)} marks</small></span></button>)}</nav>
      </aside>
      {board && page && <section className="whiteboard-workspace">
        <div className="whiteboard-topbar">
          <input value={board.title} onChange={(event) => setBoards((current) => current.map((candidate) => candidate.id === board.id ? { ...candidate, title: event.target.value } : candidate))} onBlur={() => updateBoard({ title: board.title.trim() || 'Untitled board' })} aria-label="Board title" />
          <input className="whiteboard-page-name" value={page.name} onChange={(event) => setBoards((current) => current.map((candidate) => candidate.id === board.id ? { ...candidate, pages: candidate.pages.map((item) => item.id === page.id ? { ...item, name: event.target.value } : item) } : candidate))} onBlur={() => updatePage({ name: page.name.trim() || 'Untitled page' })} aria-label="Current page name" />
          <span className={`whiteboard-save-state is-${saveState}`}>{saveState === 'saving' ? <LoaderCircle className="spin" size={14} /> : <Save size={14} />}{saveState === 'saved' ? 'Saved' : saveState === 'saving' ? 'Saving…' : 'Not saved'}</span>
          <button type="button" className={board.published ? 'publish-board-button is-published' : 'publish-board-button'} onClick={() => updateBoard({ published: !board.published })}>{board.published ? <Eye size={16} /> : <EyeOff size={16} />}{board.published ? 'Public' : 'Private'}</button>
          <button type="button" onClick={exportPng}><Download size={16} />PNG</button><button type="button" className="danger" onClick={deleteBoard}><Trash2 size={16} /></button>
        </div>
        <div className="whiteboard-pages"><div>{board.pages.map((candidate, index) => <button key={candidate.id} type="button" className={candidate.id === page.id ? 'is-active' : ''} onClick={() => { setActivePageId(candidate.id); setPast([]); setFuture([]) }}>{index + 1}<span>{candidate.name}</span></button>)}</div><button type="button" onClick={addPage}><FilePlus2 size={15} />Add page</button><button type="button" onClick={deletePage} disabled={board.pages.length === 1} aria-label="Delete current page"><Trash2 size={15} /></button></div>
        <div className="whiteboard-toolbar" role="toolbar" aria-label="Drawing tools">
          <div className="tool-group">{([['select', MousePointer2, 'Move'], ['pen', PenLine, 'Pen'], ['highlighter', Highlighter, 'Highlighter'], ['eraser', Eraser, 'Eraser'], ['arrow', ArrowUpRight, 'Arrow'], ['text', TextCursorInput, 'Text'], ['note', StickyNote, 'Note']] as const).map(([id, Icon, label]) => <button key={id} type="button" className={tool === id ? 'is-active' : ''} onClick={() => { setTool(id); setEditor(null) }} title={label}><Icon size={18} /><span>{label}</span></button>)}</div>
          <div className="colour-palette">{colours.map((value) => <button key={value} type="button" className={colour === value ? 'is-active' : ''} style={{ '--pen-colour': value } as React.CSSProperties} onClick={() => { setColour(value); if (tool === 'eraser') setTool('pen') }} aria-label={`Use ${value}`} />)}</div>
          <label className="stroke-size"><Minus size={13} /><input type="range" min="2" max="32" value={size} onChange={(event) => setSize(Number(event.target.value))} aria-label="Stroke size" /><Plus size={13} /></label>
          <div className="tool-group history-tools"><button type="button" onClick={undo} disabled={!past.length} title="Undo"><Undo2 size={18} /></button><button type="button" onClick={redo} disabled={!future.length} title="Redo"><Redo2 size={18} /></button></div>
          {tool === 'text' && <><select value={fontFamily} onChange={(event) => setFontFamily(event.target.value as typeof fontFamily)} aria-label="Text style"><option value="handwritten">Handwritten</option><option value="sans">Clean sans</option><option value="serif">Classic serif</option><option value="mono">Monospace</option></select><label className="font-size-control">Text <input type="number" min="10" max="160" value={fontSize} onChange={(event) => setFontSize(Math.max(10, Math.min(160, Number(event.target.value))))} /></label></>}
          {selectedId && <div className="whiteboard-selection-panel"><span>Selected</span><button type="button" onClick={() => updateSelected({ fontSize: Math.max(10, (page.strokes.find((item) => item.id === selectedId)?.fontSize || 36) - 4) })} title="Shrink text"><Minus size={15} /></button><button type="button" onClick={() => updateSelected({ fontSize: Math.min(160, (page.strokes.find((item) => item.id === selectedId)?.fontSize || 36) + 4) })} title="Grow text"><Plus size={15} /></button><button type="button" onClick={deleteSelected} title="Delete selected object"><Trash2 size={15} /></button></div>}
          <select value={page.background} onChange={(event) => updatePage({ background: event.target.value as WhiteboardBackground })} aria-label="Paper background"><option value="plain">Plain paper</option><option value="grid">Squared paper</option><option value="lined">Ruled paper</option><option value="dots">Dot paper</option><option value="margin">Ruled + margin</option><option value="cornell">Cornell notes</option><option value="checklist">Checklist</option></select>
          <label className="stylus-toggle"><input type="checkbox" checked={stylusOnly} onChange={(event) => setStylusOnly(event.target.checked)} /><MousePointer2 size={15} />Stylus only</label>
          <div className="zoom-control"><button type="button" onClick={() => setZoom((value) => Math.max(40, value - 10))}><ZoomOut size={16} /></button><span>{zoom}%</span><button type="button" onClick={() => setZoom((value) => Math.min(150, value + 10))}><ZoomIn size={16} /></button></div>
        </div>
        <div className="whiteboard-scroll"><div className={`whiteboard-paper background-${page.background}`} style={{ width: `${zoom / 100 * BOARD_WIDTH}px`, height: `${zoom / 100 * BOARD_HEIGHT}px` }}><canvas ref={canvasRef} width={BOARD_WIDTH} height={BOARD_HEIGHT} onPointerDown={beginStroke} onPointerMove={continueStroke} onPointerUp={finishStroke} onPointerCancel={finishStroke} />{editor && <><textarea autoFocus className={`whiteboard-inline-editor ${editor.kind === 'note' ? 'is-note' : ''}`} style={{ left: `${editor.point.x / BOARD_WIDTH * 100}%`, top: `${editor.point.y / BOARD_HEIGHT * 100}%`, fontFamily: fontFamily === 'handwritten' ? '"Segoe Print", cursive' : fontFamily, fontSize: `${fontSize * zoom / 100}px` }} value={editor.value} onChange={(event) => setEditor({ ...editor, value: event.target.value })} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') commitEditor(); if (event.key === 'Escape') setEditor(null) }} placeholder={editor.kind === 'note' ? 'Write a little note…' : 'Type directly on the page…'} /><div className="whiteboard-inline-actions" style={{ left: `${editor.point.x / BOARD_WIDTH * 100}%`, top: `${editor.point.y / BOARD_HEIGHT * 100}%` }}><button type="button" onClick={commitEditor}><Check size={14} />Place</button><button type="button" onClick={() => setEditor(null)}><X size={14} /></button></div></>}</div></div>
        <p className="whiteboard-tip"><RotateCcw size={14} />Tip: turn on <strong>Stylus only</strong> before resting your hand on the tablet. Finger scrolling still works around the paper.</p>
      </section>}
    </div>
  </div>
}
