import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Download, Eraser, Grid3X3, Highlighter, LoaderCircle, Minus, MousePointer2, PenLine,
  Plus, Redo2, RotateCcw, Save, Sparkles, Trash2, Undo2, ZoomIn, ZoomOut,
} from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { ErrorNotice, LoadingState } from '../../components/Feedback'
import { adminApi } from '../../lib/api'
import { newId } from '../../lib/format'
import type { WhiteboardBackground, WhiteboardBoard, WhiteboardPoint, WhiteboardStroke, WhiteboardTool } from '../../types'
import { StudioNav, useStudioSession } from './StudioPages'

const BOARD_WIDTH = 1600
const BOARD_HEIGHT = 1000
const colours = ['#253a35', '#bd5d87', '#9164a0', '#477f91', '#5d8b6b', '#d28155', '#d54f68', '#f0c44f']

function drawStroke(context: CanvasRenderingContext2D, stroke: WhiteboardStroke) {
  if (!stroke.points.length) return
  context.save()
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [tool, setTool] = useState<WhiteboardTool>('pen')
  const [colour, setColour] = useState(colours[0])
  const [size, setSize] = useState(7)
  const [zoom, setZoom] = useState(70)
  const [stylusOnly, setStylusOnly] = useState(false)
  const [past, setPast] = useState<WhiteboardStroke[][]>([])
  const [future, setFuture] = useState<WhiteboardStroke[][]>([])
  const board = useMemo(() => boards.find((candidate) => candidate.id === activeId), [activeId, boards])

  useEffect(() => {
    if (!session?.authenticated) return
    adminApi.whiteboards().then(async ({ boards: loaded }) => {
      if (loaded.length) { setBoards(loaded); setActiveId(loaded[0].id); return }
      const time = new Date().toISOString()
      const starter: WhiteboardBoard = { id: newId('board'), title: 'My first study board', background: 'grid', strokes: [], createdAt: time, updatedAt: time }
      const result = await adminApi.saveWhiteboard(starter, true)
      setBoards([result.board]); setActiveId(result.board.id)
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'The whiteboards could not be opened.')).finally(() => setLoading(false))
  }, [session])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !board) return
    const context = canvas.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT)
    board.strokes.forEach((stroke) => drawStroke(context, stroke))
  }, [board])

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
    if (!board || (stylusOnly && event.pointerType !== 'pen')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const stroke: WhiteboardStroke = { id: newId('stroke'), tool, colour, size: tool === 'highlighter' ? Math.max(18, size * 3.2) : tool === 'eraser' ? Math.max(18, size * 2.5) : size, points: [pointFromEvent(event)] }
    activeStroke.current = stroke
    const context = event.currentTarget.getContext('2d'); if (context) drawStroke(context, stroke)
  }

  function continueStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    const stroke = activeStroke.current
    if (!stroke || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    const point = pointFromEvent(event); const previous = stroke.points[stroke.points.length - 1]; stroke.points.push(point)
    const context = event.currentTarget.getContext('2d'); if (context) drawStroke(context, { ...stroke, points: [previous, point] })
  }

  function finishStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    const stroke = activeStroke.current
    if (!stroke || !board) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    activeStroke.current = null
    setPast((history) => [...history.slice(-49), board.strokes]); setFuture([])
    const next = { ...board, strokes: [...board.strokes, stroke], updatedAt: new Date().toISOString() }
    setBoards((current) => current.map((candidate) => candidate.id === board.id ? next : candidate)); void saveBoard(next)
  }

  function changeStrokes(strokes: WhiteboardStroke[], nextPast: WhiteboardStroke[][], nextFuture: WhiteboardStroke[][]) {
    if (!board) return
    const next = { ...board, strokes, updatedAt: new Date().toISOString() }
    setPast(nextPast); setFuture(nextFuture); setBoards((current) => current.map((candidate) => candidate.id === board.id ? next : candidate)); void saveBoard(next)
  }

  function undo() { if (board && past.length) changeStrokes(past[past.length - 1], past.slice(0, -1), [board.strokes, ...future].slice(0, 50)) }
  function redo() { if (board && future.length) changeStrokes(future[0], [...past, board.strokes].slice(-50), future.slice(1)) }

  async function addBoard() {
    const time = new Date().toISOString(); const next: WhiteboardBoard = { id: newId('board'), title: `Study board ${boards.length + 1}`, background: 'grid', strokes: [], createdAt: time, updatedAt: time }
    try { const result = await adminApi.saveWhiteboard(next, true); setBoards((current) => [result.board, ...current]); setActiveId(result.board.id); setPast([]); setFuture([]) } catch (reason) { setError(reason instanceof Error ? reason.message : 'The board could not be created.') }
  }

  async function deleteBoard() {
    if (!board || !window.confirm(`Delete “${board.title}”? This cannot be undone.`)) return
    try { await adminApi.removeWhiteboard(board.id); const remaining = boards.filter((candidate) => candidate.id !== board.id); setBoards(remaining); setActiveId(remaining[0]?.id || ''); if (!remaining.length) await addBoard() } catch (reason) { setError(reason instanceof Error ? reason.message : 'The board could not be deleted.') }
  }

  function updateBoard(patch: Partial<WhiteboardBoard>) {
    if (!board) return
    const next = { ...board, ...patch, updatedAt: new Date().toISOString() }
    setBoards((current) => current.map((candidate) => candidate.id === board.id ? next : candidate)); void saveBoard(next)
  }

  function exportPng() {
    if (!board) return
    const output = document.createElement('canvas'); output.width = BOARD_WIDTH; output.height = BOARD_HEIGHT
    const context = output.getContext('2d'); if (!context) return
    paintBackground(context, board.background); board.strokes.forEach((stroke) => drawStroke(context, stroke))
    const link = document.createElement('a'); link.download = `${board.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'study-board'}.png`; link.href = output.toDataURL('image/png'); link.click()
  }

  if (session === undefined || (session?.authenticated && loading)) return <div className="page-shell section-shell"><LoadingState label="Opening the whiteboard…" /></div>
  if (!session?.authenticated) return <Navigate to="/studio/login" state={{ from: '/studio/whiteboard' }} replace />

  return <div className="whiteboard-page page-shell section-shell">
    <header className="studio-header"><div><p className="eyebrow"><Sparkles size={14} />Private study canvas</p><h1>Whiteboard</h1><p>Write, sketch and highlight school notes with your tablet pen. Boards stay private and save to your owner account.</p></div><StudioNav /></header>
    {error && <ErrorNotice message={error} />}
    <div className="whiteboard-layout">
      <aside className="whiteboard-sidebar">
        <div><strong>My boards</strong><button type="button" onClick={addBoard}><Plus size={15} />New</button></div>
        <nav>{boards.map((candidate) => <button key={candidate.id} type="button" className={candidate.id === activeId ? 'is-active' : ''} onClick={() => { setActiveId(candidate.id); setPast([]); setFuture([]) }}><Grid3X3 size={15} /><span>{candidate.title}<small>{candidate.strokes.length} marks</small></span></button>)}</nav>
      </aside>
      {board && <section className="whiteboard-workspace">
        <div className="whiteboard-topbar">
          <input value={board.title} onChange={(event) => setBoards((current) => current.map((candidate) => candidate.id === board.id ? { ...candidate, title: event.target.value } : candidate))} onBlur={() => updateBoard({ title: board.title.trim() || 'Untitled board' })} aria-label="Board title" />
          <span className={`whiteboard-save-state is-${saveState}`}>{saveState === 'saving' ? <LoaderCircle className="spin" size={14} /> : <Save size={14} />}{saveState === 'saved' ? 'Saved' : saveState === 'saving' ? 'Saving…' : 'Not saved'}</span>
          <button type="button" onClick={exportPng}><Download size={16} />PNG</button><button type="button" className="danger" onClick={deleteBoard}><Trash2 size={16} /></button>
        </div>
        <div className="whiteboard-toolbar" role="toolbar" aria-label="Drawing tools">
          <div className="tool-group">{([['pen', PenLine, 'Pen'], ['highlighter', Highlighter, 'Highlighter'], ['eraser', Eraser, 'Eraser']] as const).map(([id, Icon, label]) => <button key={id} type="button" className={tool === id ? 'is-active' : ''} onClick={() => setTool(id)} title={label}><Icon size={18} /><span>{label}</span></button>)}</div>
          <div className="colour-palette">{colours.map((value) => <button key={value} type="button" className={colour === value ? 'is-active' : ''} style={{ '--pen-colour': value } as React.CSSProperties} onClick={() => { setColour(value); if (tool === 'eraser') setTool('pen') }} aria-label={`Use ${value}`} />)}</div>
          <label className="stroke-size"><Minus size={13} /><input type="range" min="2" max="32" value={size} onChange={(event) => setSize(Number(event.target.value))} aria-label="Stroke size" /><Plus size={13} /></label>
          <div className="tool-group history-tools"><button type="button" onClick={undo} disabled={!past.length} title="Undo"><Undo2 size={18} /></button><button type="button" onClick={redo} disabled={!future.length} title="Redo"><Redo2 size={18} /></button></div>
          <select value={board.background} onChange={(event) => updateBoard({ background: event.target.value as WhiteboardBackground })} aria-label="Paper background"><option value="plain">Plain paper</option><option value="grid">Grid paper</option><option value="lined">Lined paper</option><option value="dots">Dot paper</option></select>
          <label className="stylus-toggle"><input type="checkbox" checked={stylusOnly} onChange={(event) => setStylusOnly(event.target.checked)} /><MousePointer2 size={15} />Stylus only</label>
          <div className="zoom-control"><button type="button" onClick={() => setZoom((value) => Math.max(40, value - 10))}><ZoomOut size={16} /></button><span>{zoom}%</span><button type="button" onClick={() => setZoom((value) => Math.min(150, value + 10))}><ZoomIn size={16} /></button></div>
        </div>
        <div className="whiteboard-scroll"><div className={`whiteboard-paper background-${board.background}`} style={{ width: `${zoom / 100 * BOARD_WIDTH}px`, height: `${zoom / 100 * BOARD_HEIGHT}px` }}><canvas ref={canvasRef} width={BOARD_WIDTH} height={BOARD_HEIGHT} onPointerDown={beginStroke} onPointerMove={continueStroke} onPointerUp={finishStroke} onPointerCancel={finishStroke} /></div></div>
        <p className="whiteboard-tip"><RotateCcw size={14} />Tip: turn on <strong>Stylus only</strong> before resting your hand on the tablet. Finger scrolling still works around the paper.</p>
      </section>}
    </div>
  </div>
}
