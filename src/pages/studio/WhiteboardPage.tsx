import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight, Bold, Check, Circle, Download, Eraser, Eye, EyeOff, FilePlus2, FileUp, Highlighter, ImagePlus, Italic, Link2, LoaderCircle, Maximize2, Minus, MousePointer2, PenLine,
  Plus, Redo2, RotateCcw, Save, Search, Sparkles, Square, StickyNote, TextCursorInput, Trash2, Underline, Undo2, X, ZoomIn, ZoomOut,
} from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { ErrorNotice, LoadingState } from '../../components/Feedback'
import { adminApi } from '../../lib/api'
import { newId } from '../../lib/format'
import type { WhiteboardBackground, WhiteboardBoard, WhiteboardPageData, WhiteboardPoint, WhiteboardStroke, WhiteboardTool } from '../../types'
import { StudioNav, useStudioSession } from './StudioPages'

const BOARD_WIDTH = 1240
const BOARD_HEIGHT = 1754
const colours = ['#253a35', '#ffffff', '#bd5d87', '#ed8fba', '#9164a0', '#477f91', '#62a6c0', '#5d8b6b', '#89b989', '#d28155', '#d54f68', '#f0c44f', '#8b6b55', '#68707d']
const imageCache = new Map<string, HTMLImageElement>()

function prepareBoardForSave(board: WhiteboardBoard): WhiteboardBoard {
  return {
    ...board,
    pages: board.pages.map((page) => ({
      ...page,
      strokes: page.strokes.map((stroke) => {
        if (!['pen', 'highlighter', 'eraser'].includes(stroke.tool) || stroke.points.length < 3) return stroke
        const kept = [stroke.points[0]]
        for (let index = 1; index < stroke.points.length - 1; index += 1) {
          const point = stroke.points[index]
          const previous = kept[kept.length - 1]
          if (Math.hypot(point.x - previous.x, point.y - previous.y) >= 1.25) kept.push(point)
        }
        kept.push(stroke.points[stroke.points.length - 1])
        const points = kept.map((point) => ({ x: Math.round(point.x * 10) / 10, y: Math.round(point.y * 10) / 10, pressure: Math.round(point.pressure * 100) / 100 }))
        return { ...stroke, points }
      }),
    })),
  }
}

function drawStroke(context: CanvasRenderingContext2D, stroke: WhiteboardStroke) {
  if (!stroke.points.length) return
  context.save()
  if (stroke.tool === 'image' && stroke.imageUrl) {
    let image = imageCache.get(stroke.imageUrl)
    if (!image) {
      image = new Image()
      image.onerror = () => imageCache.delete(stroke.imageUrl!)
      image.src = stroke.imageUrl
      imageCache.set(stroke.imageUrl, image)
    }
    if (image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
      try { context.drawImage(image, stroke.points[0].x, stroke.points[0].y, stroke.width || 420, stroke.height || 300) } catch { imageCache.delete(stroke.imageUrl) }
    }
    if (stroke.text) { context.fillStyle = stroke.colour; context.font = `${stroke.bold ? '700 ' : ''}${stroke.fontSize || 26}px Inter, system-ui, sans-serif`; context.fillText(stroke.text, stroke.points[0].x, stroke.points[0].y + (stroke.height || 300) + 12) } context.restore(); return
  }
  if (stroke.tool === 'text' || stroke.tool === 'note' || stroke.tool === 'link') {
    const families = { handwritten: '"Segoe Print", "Comic Sans MS", cursive', sans: 'Inter, system-ui, sans-serif', serif: 'Georgia, serif', mono: 'ui-monospace, monospace' }
    if (stroke.tool === 'note' || stroke.tool === 'link') { context.fillStyle = stroke.tool === 'link' ? '#f7e7f0' : stroke.noteColour || '#fff0a9'; context.shadowColor = 'rgba(72,45,58,.18)'; context.shadowBlur = 18; context.fillRect(stroke.points[0].x, stroke.points[0].y, stroke.width || 300, stroke.height || 220); context.shadowBlur = 0 }
    context.fillStyle = stroke.colour; context.globalAlpha = 1; context.textBaseline = 'top'; context.font = `${stroke.italic ? 'italic ' : ''}${stroke.bold ? '700 ' : ''}${stroke.fontSize || 36}px ${families[stroke.fontFamily || 'handwritten']}`
    const inset = stroke.tool === 'note' || stroke.tool === 'link' ? 24 : 0; const lines = (stroke.text || '').split('\n'); lines.forEach((line, index) => { const x = stroke.points[0].x + inset; const y = stroke.points[0].y + inset + index * (stroke.fontSize || 36) * 1.25; context.fillText(line, x, y); if (stroke.underline) { context.lineWidth = Math.max(1, (stroke.fontSize || 36) / 18); context.beginPath(); context.moveTo(x, y + (stroke.fontSize || 36) * 1.08); context.lineTo(x + context.measureText(line).width, y + (stroke.fontSize || 36) * 1.08); context.strokeStyle = stroke.colour; context.stroke() } })
    context.restore(); return
  }
  if ((stroke.tool === 'arrow' || stroke.tool === 'line') && stroke.points.length > 1) {
    const start = stroke.points[0]; const end = stroke.points[stroke.points.length - 1]; const angle = Math.atan2(end.y - start.y, end.x - start.x); const head = Math.max(18, stroke.size * 4)
    context.strokeStyle = stroke.colour; context.lineWidth = stroke.size; context.lineCap = 'round'; context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke(); if (stroke.tool === 'arrow') { context.beginPath(); context.moveTo(end.x, end.y); context.lineTo(end.x - head * Math.cos(angle - Math.PI / 6), end.y - head * Math.sin(angle - Math.PI / 6)); context.moveTo(end.x, end.y); context.lineTo(end.x - head * Math.cos(angle + Math.PI / 6), end.y - head * Math.sin(angle + Math.PI / 6)); context.stroke() } context.restore(); return
  }
  if ((stroke.tool === 'circle' || stroke.tool === 'rectangle') && stroke.points.length > 1) {
    const start = stroke.points[0]; const end = stroke.points[stroke.points.length - 1]
    const left = Math.min(start.x, end.x); const top = Math.min(start.y, end.y); const width = Math.abs(end.x - start.x); const height = Math.abs(end.y - start.y)
    context.strokeStyle = stroke.colour; context.lineWidth = stroke.size; context.lineCap = 'round'; context.beginPath()
    if (stroke.tool === 'circle') context.ellipse(left + width / 2, top + height / 2, Math.max(1, width / 2), Math.max(1, height / 2), 0, 0, Math.PI * 2)
    else context.rect(left, top, width, height)
    context.stroke(); context.restore(); return
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
  const imageInputRef = useRef<HTMLInputElement>(null)
  const pageInputRef = useRef<HTMLInputElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeStroke = useRef<WhiteboardStroke | null>(null)
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve())
  const pendingSaves = useRef(new Map<string, WhiteboardBoard>())
  const saveTimer = useRef<number | undefined>(undefined)
  const saveVersion = useRef(0)
  const [boards, setBoards] = useState<WhiteboardBoard[]>([])
  const boardsRef = useRef<WhiteboardBoard[]>([])
  const [activeId, setActiveId] = useState('')
  const [activePageId, setActivePageId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [tool, setTool] = useState<WhiteboardTool>('pen')
  const [colour, setColour] = useState('#000000')
  const [size, setSize] = useState(2)
  const [zoom, setZoom] = useState(70)
  const [stylusOnly, setStylusOnly] = useState(true)
  const [paperTextScale, setPaperTextScale] = useState(1)
  const [fontFamily, setFontFamily] = useState<NonNullable<WhiteboardStroke['fontFamily']>>('handwritten')
  const [fontSize, setFontSize] = useState(38)
  const [underline, setUnderline] = useState(false)
  const [bold, setBold] = useState(false)
  const [italic, setItalic] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<'board' | 'page' | null>(null)
  const [fitPage, setFitPage] = useState(true)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [editor, setEditor] = useState<{ kind: 'text' | 'note'; point: WhiteboardPoint; value: string } | null>(null)
  const drag = useRef<{ id: string; start: WhiteboardPoint; original: WhiteboardPoint[] } | null>(null)
  const touchPoints = useRef(new Map<number, { x: number; y: number }>())
  const pinchDistance = useRef(0)
  const panGesture = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const [past, setPast] = useState<WhiteboardStroke[][]>([])
  const [future, setFuture] = useState<WhiteboardStroke[][]>([])
  const [draggedBoardId, setDraggedBoardId] = useState('')
  const [boardQuery, setBoardQuery] = useState('')
  const board = useMemo(() => boards.find((candidate) => candidate.id === activeId), [activeId, boards])
  const page = useMemo(() => board?.pages.find((candidate) => candidate.id === activePageId) || board?.pages[0], [activePageId, board])
  const visibleBoards = useMemo(() => { const query = boardQuery.trim().toLowerCase(); return !query ? boards : boards.filter((candidate) => `${candidate.title} ${candidate.pages.map((item) => `${item.name} ${item.strokes.map((stroke) => stroke.text || '').join(' ')}`).join(' ')}`.toLowerCase().includes(query)) }, [boardQuery, boards])
  const paperFactor = (page?.paperSize === 'a3' ? 1.414 : page?.paperSize === 'letter' ? .97 : 1) * ((page?.pageScale || 100) / 100)
  const displayWidth = (page?.orientation === 'landscape' ? BOARD_HEIGHT : BOARD_WIDTH) * paperFactor * zoom / 100
  const displayHeight = (page?.orientation === 'landscape' ? BOARD_WIDTH : BOARD_HEIGHT) * paperFactor * zoom / 100

  useEffect(() => { boardsRef.current = boards }, [boards])

  useEffect(() => {
    const savedOffline = () => setSaveState('unsaved')
    const sync = () => { setSaveState('saving'); adminApi.syncWhiteboards().then(() => { setSaveState('saved'); setError('') }).catch((reason) => { setSaveState('unsaved'); setError(reason instanceof Error ? reason.message : 'Offline pages could not sync yet.') }) }
    window.addEventListener('nya-offline-save', savedOffline)
    window.addEventListener('online', sync)
    return () => { window.removeEventListener('nya-offline-save', savedOffline); window.removeEventListener('online', sync) }
  }, [])

  useEffect(() => {
    if (!session?.authenticated) return
    adminApi.whiteboards().then(async ({ boards: loaded }) => {
      if (loaded.length) { setBoards(loaded); setActiveId(loaded[0].id); setActivePageId(loaded[0].pages[0]?.id || ''); return }
      const time = new Date().toISOString()
      const firstPage: WhiteboardPageData = { id: newId('page'), name: 'Page 1', background: 'grid', paperSize: 'a3', pageScale: 100, orientation: 'portrait', rulingSize: 20, accentColour: '#bd5d87', coverStyle: 'blossom', strokes: [] }
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
    const repaint = () => { context.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT); page.strokes.forEach((stroke) => drawStroke(context, stroke)) }
    repaint()
    const pendingImages = page.strokes.map((stroke) => stroke.imageUrl ? imageCache.get(stroke.imageUrl) : undefined).filter((image): image is HTMLImageElement => Boolean(image && !image.complete))
    pendingImages.forEach((image) => image.addEventListener('load', repaint, { once: true }))
    const selected = page.strokes.find((stroke) => stroke.id === selectedId)
    if (selected?.points[0]) { const width = selected.width || Math.max(120, (selected.text?.length || 1) * (selected.fontSize || selected.size || 36) * .55); const height = selected.height || Math.max(60, (selected.text?.split('\n').length || 1) * (selected.fontSize || selected.size || 36) * 1.3); context.save(); context.strokeStyle = '#bd5d87'; context.lineWidth = 3; context.setLineDash([12, 8]); context.strokeRect(selected.points[0].x - 8, selected.points[0].y - 8, width + 16, height + 16); context.restore() }
    const animation = page.strokes.some((stroke) => stroke.tool === 'image' && stroke.imageUrl?.toLowerCase().includes('.gif')) ? window.setInterval(repaint, 80) : 0
    return () => { if (animation) window.clearInterval(animation); pendingImages.forEach((image) => image.removeEventListener('load', repaint)) }
  }, [page, selectedId])

  useEffect(() => {
    const paper = paperRef.current
    if (!paper) return
    const updateScale = () => setPaperTextScale(paper.getBoundingClientRect().height / BOARD_HEIGHT)
    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(paper)
    return () => observer.disconnect()
  }, [page?.id, page?.orientation, page?.paperSize, page?.pageScale, zoom, fitPage])

  const saveBoard = useCallback((next: WhiteboardBoard) => {
    const version = ++saveVersion.current
    pendingSaves.current.set(next.id, next)
    setSaveState('saving')
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      const batch = [...pendingSaves.current.values()]
      pendingSaves.current.clear()
      saveQueue.current = saveQueue.current.catch(() => undefined).then(async () => {
        for (const candidate of batch) await adminApi.saveWhiteboard(prepareBoardForSave(candidate))
      }).then(() => {
        if (version === saveVersion.current && pendingSaves.current.size === 0) { setSaveState(navigator.onLine ? 'saved' : 'unsaved'); setError('') }
      }).catch((reason) => {
        batch.forEach((candidate) => { if (!pendingSaves.current.has(candidate.id)) pendingSaves.current.set(candidate.id, candidate) })
        if (version === saveVersion.current) setSaveState('unsaved')
        setError(reason instanceof Error ? reason.message : 'The board could not be saved.')
      })
    }, 550)
    return saveQueue.current
  }, [])

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>): WhiteboardPoint {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: Math.max(0, Math.min(BOARD_WIDTH, (event.clientX - rect.left) * BOARD_WIDTH / rect.width)), y: Math.max(0, Math.min(BOARD_HEIGHT, (event.clientY - rect.top) * BOARD_HEIGHT / rect.height)), pressure: event.pressure || .5 }
  }

  function beginStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!board || !page || (stylusOnly && event.pointerType !== 'pen' && event.pointerType !== 'touch')) return
    if (event.pointerType === 'touch') {
      event.currentTarget.setPointerCapture(event.pointerId); touchPoints.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (stylusOnly && touchPoints.current.size === 1) { setFitPage(false); const scroll = scrollRef.current; panGesture.current = scroll ? { x: event.clientX, y: event.clientY, left: scroll.scrollLeft, top: scroll.scrollTop } : null; return }
      if (touchPoints.current.size === 2) { const [a, b] = [...touchPoints.current.values()]; pinchDistance.current = Math.hypot(a.x - b.x, a.y - b.y); panGesture.current = null; return }
      if (stylusOnly) return
    }
    const point = pointFromEvent(event)
    if (tool === 'text' || tool === 'note') { setEditor({ kind: tool, point, value: '' }); setSelectedId(''); return }
    if (tool === 'select') {
      const hit = [...page.strokes].reverse().find((stroke) => {
        if (!stroke.points[0] || stroke.tool === 'eraser') return false
        if (['text', 'note', 'link', 'image'].includes(stroke.tool)) { const width = stroke.width || Math.max(120, (stroke.text?.length || 1) * (stroke.fontSize || 36) * .55); const height = stroke.height || Math.max(stroke.fontSize || 36, (stroke.text?.split('\n').length || 1) * (stroke.fontSize || 36) * 1.25); return point.x >= stroke.points[0].x - 12 && point.x <= stroke.points[0].x + width + 12 && point.y >= stroke.points[0].y - 12 && point.y <= stroke.points[0].y + height + 12 }
        const xs = stroke.points.map((item) => item.x); const ys = stroke.points.map((item) => item.y); const padding = Math.max(18, stroke.size * 2)
        return point.x >= Math.min(...xs) - padding && point.x <= Math.max(...xs) + padding && point.y >= Math.min(...ys) - padding && point.y <= Math.max(...ys) + padding
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
    if (event.pointerType === 'touch' && touchPoints.current.has(event.pointerId)) {
      touchPoints.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (touchPoints.current.size === 2) { const [a, b] = [...touchPoints.current.values()]; const distance = Math.hypot(a.x - b.x, a.y - b.y); if (pinchDistance.current > 0 && Math.abs(distance - pinchDistance.current) > 2) { setFitPage(false); setZoom((value) => Math.round(Math.max(25, Math.min(200, value * distance / pinchDistance.current)))); pinchDistance.current = distance } return }
      if (stylusOnly && panGesture.current && scrollRef.current) { scrollRef.current.scrollLeft = panGesture.current.left - (event.clientX - panGesture.current.x); scrollRef.current.scrollTop = panGesture.current.top - (event.clientY - panGesture.current.y); return }
      if (stylusOnly) return
    }
    if (drag.current && page) { const point = pointFromEvent(event); const dx = point.x - drag.current.start.x; const dy = point.y - drag.current.start.y; updatePage({ strokes: page.strokes.map((stroke) => stroke.id === drag.current?.id ? { ...stroke, points: drag.current.original.map((item) => ({ ...item, x: item.x + dx, y: item.y + dy })) } : stroke) }); return }
    const stroke = activeStroke.current
    if (!stroke || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    const point = pointFromEvent(event); const previous = stroke.points[stroke.points.length - 1]
    if (['line', 'arrow', 'circle', 'rectangle'].includes(stroke.tool)) {
      stroke.points = [stroke.points[0], point]
      const context = event.currentTarget.getContext('2d'); if (context && page) { context.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT); page.strokes.forEach((saved) => drawStroke(context, saved)); drawStroke(context, stroke) }
      return
    }
    stroke.points.push(point)
    const context = event.currentTarget.getContext('2d'); if (context) drawStroke(context, { ...stroke, points: [previous, point] })
  }

  function finishStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    touchPoints.current.delete(event.pointerId); if (event.pointerType === 'touch' && event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); if (touchPoints.current.size < 2) pinchDistance.current = 0; if (!touchPoints.current.size) panGesture.current = null; else if (stylusOnly && touchPoints.current.size === 1 && scrollRef.current) { const remaining = [...touchPoints.current.values()][0]; panGesture.current = { x: remaining.x, y: remaining.y, left: scrollRef.current.scrollLeft, top: scrollRef.current.scrollTop } }
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
    const stroke: WhiteboardStroke = { id: newId(editor.kind), tool: editor.kind, colour, size: fontSize, fontSize, fontFamily, underline, bold, italic, text: editor.value.trim(), points: [editor.point], ...(editor.kind === 'note' ? { width: 320, height: 230, noteColour: '#fff0a9' } : {}) }
    setPast((history) => [...history.slice(-49), page.strokes]); setFuture([]); updatePage({ strokes: [...page.strokes, stroke] }); setEditor(null); setSelectedId(stroke.id); setTool('select')
  }

  function updateSelected(patch: Partial<WhiteboardStroke>) { if (!page || !selectedId) return; updatePage({ strokes: page.strokes.map((stroke) => stroke.id === selectedId ? { ...stroke, ...patch } : stroke) }) }
  function deleteSelected() { if (!page || !selectedId) return; setPast((history) => [...history.slice(-49), page.strokes]); updatePage({ strokes: page.strokes.filter((stroke) => stroke.id !== selectedId) }); setSelectedId('') }
  function linkSelected() { const selected = page?.strokes.find((item) => item.id === selectedId); if (!selected) return; const url = window.prompt('Paste the link for this text or object:', selected.url || ''); if (url !== null) updateSelected({ url: url.trim() }) }
  function captionSelected() { const selected = page?.strokes.find((item) => item.id === selectedId); if (!selected) return; const text = window.prompt(selected.tool === 'image' ? 'Image caption:' : 'Edit text:', selected.text || ''); if (text !== null) updateSelected({ text: text.trim(), fontSize: selected.fontSize || 26 }) }

  function reorderBoards(targetId: string) {
    if (!draggedBoardId || draggedBoardId === targetId) return
    const reordered = [...boards]; const from = reordered.findIndex((item) => item.id === draggedBoardId); const to = reordered.findIndex((item) => item.id === targetId); if (from < 0 || to < 0) return
    const [moved] = reordered.splice(from, 1); reordered.splice(to, 0, moved)
    const numbered = reordered.map((item, index) => ({ ...item, sortOrder: index })); setBoards(numbered); setDraggedBoardId(''); numbered.forEach((item) => { void saveBoard(item) })
  }
  function dropOnBoard(event: React.DragEvent<HTMLButtonElement>, targetId: string) {
    event.preventDefault(); const rawPage = event.dataTransfer.getData('application/x-nya-page')
    if (!rawPage) { reorderBoards(targetId); return }
    try { const reference = JSON.parse(rawPage) as { boardId: string; pageId: string }; if (reference.boardId === targetId) return; const source = boards.find((item) => item.id === reference.boardId); const target = boards.find((item) => item.id === targetId); const movedPage = source?.pages.find((item) => item.id === reference.pageId); if (!source || !target || !movedPage || source.pages.length < 2) { setError('A notebook must keep at least one page. Add another page before moving this one.'); return } const nextSource = { ...source, pages: source.pages.filter((item) => item.id !== movedPage.id) }; const nextTarget = { ...target, pages: [...target.pages, movedPage] }; setBoards((current) => current.map((item) => item.id === source.id ? nextSource : item.id === target.id ? nextTarget : item)); void saveBoard(nextSource); void saveBoard(nextTarget) } catch { setError('That page could not be moved.') }
  }

  function addLink() {
    if (!page) return
    const url = window.prompt('Paste a website, presentation, or notebook link:')?.trim(); if (!url) return
    const text = window.prompt('What should the link card say?', 'Open resource')?.trim() || 'Open resource'
    const stroke: WhiteboardStroke = { id: newId('link'), tool: 'link', colour, size: 30, fontSize: 30, fontFamily, underline: true, text: `↗ ${text}`, url, width: 390, height: 120, points: [{ x: 100, y: 100, pressure: .5 }] }
    setPast((history) => [...history.slice(-49), page.strokes]); updatePage({ strokes: [...page.strokes, stroke] }); setSelectedId(stroke.id); setTool('select')
  }

  async function importImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file || !page) return
    setUploadingImage(true)
    try { const { asset } = await adminApi.upload(file); const stroke: WhiteboardStroke = { id: newId('image'), tool: 'image', colour: '#253a35', size: 1, imageUrl: asset.url, width: 480, height: 340, points: [{ x: 100, y: 100, pressure: .5 }] }; updatePage({ strokes: [...page.strokes, stroke] }); setSelectedId(stroke.id); setTool('select') } catch (reason) { setError(reason instanceof Error ? reason.message : 'The image could not be imported.') } finally { setUploadingImage(false); event.target.value = '' }
  }

  async function dropOnPage(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault(); if (!page || !board) return
    const rect = paperRef.current?.getBoundingClientRect(); const point = rect ? { x: Math.max(0, Math.min(BOARD_WIDTH - 80, (event.clientX - rect.left) * BOARD_WIDTH / rect.width)), y: Math.max(0, Math.min(BOARD_HEIGHT - 80, (event.clientY - rect.top) * BOARD_HEIGHT / rect.height)), pressure: .5 } : { x: 120, y: 120, pressure: .5 }
    const file = [...event.dataTransfer.files].find((item) => item.type.startsWith('image/'))
    if (file) { setUploadingImage(true); try { const { asset } = await adminApi.upload(file); const stroke: WhiteboardStroke = { id: newId('image'), tool: 'image', colour: '#253a35', size: 1, imageUrl: asset.url, text: file.name.replace(/\.[^.]+$/, ''), width: 480, height: 340, points: [point] }; updatePage({ strokes: [...page.strokes, stroke] }); setSelectedId(stroke.id); setTool('select') } catch (reason) { setError(reason instanceof Error ? reason.message : 'The image could not be imported.') } finally { setUploadingImage(false) }; return }
    const raw = event.dataTransfer.getData('application/x-nya-page') || event.dataTransfer.getData('application/x-nya-board'); if (!raw) return
    try { const reference = JSON.parse(raw) as { boardId: string; pageId?: string; title: string }; const url = `/notebooks?board=${encodeURIComponent(reference.boardId)}${reference.pageId ? `&page=${encodeURIComponent(reference.pageId)}` : ''}`; const stroke: WhiteboardStroke = { id: newId('link'), tool: 'link', colour, size: 28, fontSize: 28, fontFamily, bold: true, underline: false, text: `↗ ${reference.title}`, url, width: 430, height: 120, points: [point] }; updatePage({ strokes: [...page.strokes, stroke] }); setSelectedId(stroke.id); setTool('select') } catch { setError('That notebook reference could not be added.') }
  }

  function changeStrokes(strokes: WhiteboardStroke[], nextPast: WhiteboardStroke[][], nextFuture: WhiteboardStroke[][]) {
    if (!board || !page) return
    const next = { ...board, pages: board.pages.map((candidate) => candidate.id === page.id ? { ...candidate, strokes } : candidate), updatedAt: new Date().toISOString() }
    setPast(nextPast); setFuture(nextFuture); setBoards((current) => current.map((candidate) => candidate.id === board.id ? next : candidate)); void saveBoard(next)
  }

  function undo() { if (page && past.length) changeStrokes(past[past.length - 1], past.slice(0, -1), [page.strokes, ...future].slice(0, 50)) }
  function redo() { if (page && future.length) changeStrokes(future[0], [...past, page.strokes].slice(-50), future.slice(1)) }

  async function addBoard() {
    const time = new Date().toISOString(); const firstPage: WhiteboardPageData = { id: newId('page'), name: 'Page 1', background: 'grid', paperSize: 'a3', pageScale: 100, orientation: 'portrait', rulingSize: 20, accentColour: '#bd5d87', coverStyle: 'blossom', strokes: [] }; const next: WhiteboardBoard = { id: newId('board'), title: `Study notebook ${boards.length + 1}`, pages: [firstPage], published: false, sortOrder: boards.length, createdAt: time, updatedAt: time }
    try { const result = await adminApi.saveWhiteboard(next, true); setBoards((current) => [result.board, ...current]); setActiveId(result.board.id); setActivePageId(result.board.pages[0].id); setPast([]); setFuture([]) } catch (reason) { setError(reason instanceof Error ? reason.message : 'The board could not be created.') }
  }

  async function deleteBoard() {
    if (!board) return
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
    const nextPage: WhiteboardPageData = { id: newId('page'), name: `Page ${board.pages.length + 1}`, background: page?.background || 'grid', paperSize: page?.paperSize || 'a3', pageScale: page?.pageScale || 100, orientation: page?.orientation || 'portrait', rulingSize: page?.rulingSize || 20, accentColour: board.pages[0]?.accentColour || '#bd5d87', strokes: [] }
    const next = { ...board, pages: [...board.pages, nextPage], updatedAt: new Date().toISOString() }
    setBoards((current) => current.map((candidate) => candidate.id === board.id ? next : candidate)); setActivePageId(nextPage.id); setPast([]); setFuture([]); void saveBoard(next)
  }

  function deletePage() {
    if (!board || !page || board.pages.length === 1) return
    const pages = board.pages.filter((candidate) => candidate.id !== page.id); const next = { ...board, pages, updatedAt: new Date().toISOString() }
    setBoards((current) => current.map((candidate) => candidate.id === board.id ? next : candidate)); setActivePageId(pages[0].id); setPast([]); setFuture([]); void saveBoard(next)
  }

  function turnPage(direction: number) { if (!board || !page) return; const index = board.pages.findIndex((item) => item.id === page.id); const next = index + direction; if (next >= 0 && next < board.pages.length) { setActivePageId(board.pages[next].id); setSelectedId(''); setPast([]); setFuture([]) } }

  function exportPng() {
    if (!board || !page) return
    const output = document.createElement('canvas'); output.width = BOARD_WIDTH; output.height = BOARD_HEIGHT
    const context = output.getContext('2d'); if (!context) return
    paintBackground(context, page.background); page.strokes.forEach((stroke) => drawStroke(context, stroke))
    const link = document.createElement('a'); link.download = `${board.title}-${page.name}`.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.png'; link.href = output.toDataURL('image/png'); link.click()
  }

  function exportPageFile() {
    if (!board || !page) return
    const blob = new Blob([JSON.stringify({ format: 'nya-page-v1', page }, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.download = `${board.title}-${page.name}`.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.nya-page.json'
    link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href)
  }

  async function importPageFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !board) return
    try {
      let imported: WhiteboardPageData
      if (file.type.startsWith('image/')) {
        setUploadingImage(true)
        const previewUrl = URL.createObjectURL(file)
        imported = { id: newId('page'), name: file.name.replace(/\.[^.]+$/, '') || 'Imported page', background: 'plain', paperSize: 'a3', pageScale: 100, orientation: 'portrait', rulingSize: 20, accentColour: board.pages[0]?.accentColour || '#bd5d87', strokes: [{ id: newId('image'), tool: 'image', colour: '#000000', size: 1, points: [{ x: 40, y: 40, pressure: .5 }], imageUrl: previewUrl, width: 1160, height: 1640 }] }
        const optimistic = { ...board, pages: [...board.pages, imported], updatedAt: new Date().toISOString() }
        boardsRef.current = boardsRef.current.map((candidate) => candidate.id === board.id ? optimistic : candidate)
        setBoards(boardsRef.current); setActivePageId(imported.id); setPast([]); setFuture([]); setError('')
        const { asset } = await adminApi.upload(file)
        imageCache.delete(previewUrl); URL.revokeObjectURL(previewUrl)
        const latest = boardsRef.current.find((candidate) => candidate.id === board.id) || optimistic
        const next = { ...latest, pages: latest.pages.map((candidate) => candidate.id === imported.id ? { ...candidate, strokes: candidate.strokes.map((stroke) => stroke.imageUrl === previewUrl ? { ...stroke, imageUrl: asset.url } : stroke) } : candidate), updatedAt: new Date().toISOString() }
        boardsRef.current = boardsRef.current.map((candidate) => candidate.id === board.id ? next : candidate)
        setBoards(boardsRef.current); void saveBoard(next)
        return
      } else {
        const payload = JSON.parse(await file.text()) as { format?: string; page?: WhiteboardPageData } | WhiteboardPageData
        const candidate = 'page' in payload && payload.page ? payload.page : payload as WhiteboardPageData
        if (!candidate || !Array.isArray(candidate.strokes) || !['plain', 'grid', 'lined', 'dots', 'margin', 'cornell', 'checklist'].includes(candidate.background)) throw new Error('This is not a valid Nya notebook page file.')
        imported = { ...candidate, id: newId('page'), name: `${candidate.name || 'Imported page'} (imported)`, strokes: candidate.strokes.map((stroke) => ({ ...stroke, id: newId(stroke.tool) })) }
      }
      const next = { ...board, pages: [...board.pages, imported], updatedAt: new Date().toISOString() }
      setBoards((current) => current.map((candidate) => candidate.id === board.id ? next : candidate)); setActivePageId(imported.id); setPast([]); setFuture([]); setError(''); void saveBoard(next)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The page could not be imported.')
    } finally { setUploadingImage(false) }
  }

  if (session === undefined || (session?.authenticated && loading)) return <div className="page-shell section-shell"><LoadingState label="Opening the whiteboard…" /></div>
  if (!session?.authenticated) return <Navigate to="/studio/login" state={{ from: '/studio/whiteboard' }} replace />

  return <div className="whiteboard-page page-shell section-shell">
    <header className="studio-header"><div><p className="eyebrow"><Sparkles size={14} />Private study canvas</p><h1>Whiteboard</h1><p>Write, sketch and highlight school notes with your tablet pen. Boards stay private and save to your owner account.</p></div><StudioNav /></header>
    {error && <ErrorNotice message={error} />}
    <div className="whiteboard-layout">
      <aside className="whiteboard-sidebar">
        <div><strong style={{ color: board?.pages[0]?.accentColour || '#bd5d87' }}>My boards</strong><button type="button" onClick={addBoard}><Plus size={15} />New</button></div>
        <label className="whiteboard-board-search"><Search size={15} /><input value={boardQuery} onChange={(event) => setBoardQuery(event.target.value)} placeholder="Search my notebooks…" /></label>
        <nav>{visibleBoards.map((candidate) => <button key={candidate.id} type="button" draggable className={`${candidate.id === activeId ? 'is-active' : ''} ${candidate.id === draggedBoardId ? 'is-dragging' : ''} cover-${candidate.pages[0]?.coverStyle || 'blossom'}`} style={{ '--board-accent': candidate.pages[0]?.accentColour || '#bd5d87' } as React.CSSProperties} onDragStart={(event) => { setDraggedBoardId(candidate.id); event.dataTransfer.setData('application/x-nya-board', JSON.stringify({ boardId: candidate.id, title: candidate.title })) }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropOnBoard(event, candidate.id)} onDragEnd={() => setDraggedBoardId('')} onClick={() => { setActiveId(candidate.id); setActivePageId(candidate.pages[0]?.id || ''); setPast([]); setFuture([]) }}><span className="board-drag-grip" aria-hidden="true">⠿</span><span>{candidate.title}<small>{candidate.pages.length} pages · {candidate.pages.reduce((total, item) => total + item.strokes.length, 0)} marks</small></span></button>)}</nav>
      </aside>
      {board && page && <section className="whiteboard-workspace">
        <div className="whiteboard-topbar">
          <input value={board.title} onChange={(event) => setBoards((current) => current.map((candidate) => candidate.id === board.id ? { ...candidate, title: event.target.value } : candidate))} onBlur={() => updateBoard({ title: board.title.trim() || 'Untitled board' })} aria-label="Board title" />
          <input className="whiteboard-page-name" value={page.name} onChange={(event) => setBoards((current) => current.map((candidate) => candidate.id === board.id ? { ...candidate, pages: candidate.pages.map((item) => item.id === page.id ? { ...item, name: event.target.value } : item) } : candidate))} onBlur={() => updatePage({ name: page.name.trim() || 'Untitled page' })} aria-label="Current page name" />
          <label className="board-colour-picker" title="Board colour"><input type="color" value={board.pages[0]?.accentColour || '#bd5d87'} onChange={(event) => { const accentColour = event.target.value; updateBoard({ pages: board.pages.map((item) => ({ ...item, accentColour })) }) }} /></label>
          <select className="board-cover-select" value={board.pages[0]?.coverStyle || 'blossom'} onChange={(event) => { const coverStyle = event.target.value as WhiteboardPageData['coverStyle']; updateBoard({ pages: board.pages.map((item) => ({ ...item, coverStyle })) }) }} aria-label="Notebook cover"><option value="blossom">🌸 Blossom cover</option><option value="clinical">✚ Clinical cover</option><option value="night">✦ Night study cover</option><option value="strawberry">🍓 Strawberry cover</option><option value="sakura">🌸 Sakura sky</option><option value="space">🌙 Cozy space</option><option value="cat">🐾 Sleepy cat</option><option value="minimal">Minimal cover</option></select>
          <span className={`whiteboard-save-state is-${saveState}`}>{saveState === 'saving' ? <LoaderCircle className="spin" size={14} /> : <Save size={14} />}{saveState === 'saved' ? 'Saved' : saveState === 'saving' ? 'Saving…' : navigator.onLine ? 'Not saved' : 'Saved offline'}</span>
          <button type="button" className={board.published ? 'publish-board-button is-published' : 'publish-board-button'} onClick={() => updateBoard({ published: !board.published })}>{board.published ? <Eye size={16} /> : <EyeOff size={16} />}{board.published ? 'Public' : 'Private'}</button>
          <button type="button" onClick={exportPng}><Download size={16} />PNG</button><button type="button" className="danger" onClick={() => setConfirmDelete('board')}><Trash2 size={16} /></button>
        </div>
        <div className="whiteboard-pages"><div>{board.pages.map((candidate, index) => <button key={candidate.id} type="button" draggable className={candidate.id === page.id ? 'is-active' : ''} onDragStart={(event) => event.dataTransfer.setData('application/x-nya-page', JSON.stringify({ boardId: board.id, pageId: candidate.id, title: `${board.title} — ${candidate.name}` }))} onClick={() => { setActivePageId(candidate.id); setPast([]); setFuture([]) }}>{index + 1}<span>{candidate.name}</span></button>)}</div><button type="button" onClick={addPage}><FilePlus2 size={15} />Add page</button><button type="button" onClick={() => pageInputRef.current?.click()} disabled={uploadingImage}><FileUp size={15} />Import</button><input ref={pageInputRef} hidden type="file" accept="application/json,.json,image/*" onChange={importPageFile} /><button type="button" onClick={exportPageFile} title="Export this page as a reusable file"><Download size={15} />Page file</button><button type="button" onClick={() => setConfirmDelete('page')} disabled={board.pages.length === 1} aria-label="Delete current page"><Trash2 size={15} /></button></div>
        <div className="whiteboard-toolbar" role="toolbar" aria-label="Drawing tools">
          <div className="tool-group">{([['select', MousePointer2, 'Select / move'], ['pen', PenLine, 'Pen'], ['highlighter', Highlighter, 'Highlighter'], ['eraser', Eraser, 'Eraser'], ['line', Minus, 'Line'], ['arrow', ArrowUpRight, 'Arrow'], ['circle', Circle, 'Circle'], ['rectangle', Square, 'Rectangle'], ['text', TextCursorInput, 'Text'], ['note', StickyNote, 'Note']] as const).map(([id, Icon, label]) => <button key={id} type="button" className={tool === id ? 'is-active' : ''} onClick={() => { setTool(id); setEditor(null) }} title={label}><Icon size={18} /><span>{label}</span></button>)}<button type="button" onClick={addLink} title="Add a website, board or presentation link"><Link2 size={18} /><span>Link</span></button><button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage} title="Import image"><ImagePlus size={18} /><span>{uploadingImage ? 'Uploading…' : 'Image'}</span></button><input ref={imageInputRef} hidden type="file" accept="image/*" onChange={importImage} /></div>
          <div className="colour-palette">{colours.map((value) => <button key={value} type="button" className={colour === value ? 'is-active' : ''} style={{ '--pen-colour': value } as React.CSSProperties} onClick={() => { setColour(value); if (tool === 'eraser') setTool('pen') }} aria-label={`Use ${value}`} />)}<label className="custom-pen-colour" title="Custom colour"><input type="color" value={colour} onChange={(event) => setColour(event.target.value)} /></label></div>
          <label className="stroke-size" title="Brush size in pixels"><Minus size={13} /><input type="range" min="0.5" max="80" step="0.5" value={size} onChange={(event) => setSize(Number(event.target.value))} aria-label="Brush size slider" /><input className="precise-number" type="number" min="0.5" max="80" step="0.5" value={size} onChange={(event) => setSize(Math.max(.5, Math.min(80, Number(event.target.value) || .5)))} aria-label="Exact brush size" /><span>px</span><Plus size={13} /></label>
          <div className="tool-group history-tools"><button type="button" onClick={undo} disabled={!past.length} title="Undo"><Undo2 size={18} /></button><button type="button" onClick={redo} disabled={!future.length} title="Redo"><Redo2 size={18} /></button></div>
          {tool === 'text' && <><select value={fontFamily} onChange={(event) => setFontFamily(event.target.value as typeof fontFamily)} aria-label="Text style"><option value="handwritten">Handwritten</option><option value="sans">Clean sans</option><option value="serif">Classic serif</option><option value="mono">Monospace</option></select><label className="font-size-control">Text <input type="number" min="10" max="160" value={fontSize} onChange={(event) => setFontSize(Math.max(10, Math.min(160, Number(event.target.value))))} /></label><button type="button" className={bold ? 'format-button is-active' : 'format-button'} onClick={() => setBold((value) => !value)} title="Bold"><Bold size={16} /></button><button type="button" className={italic ? 'format-button is-active' : 'format-button'} onClick={() => setItalic((value) => !value)} title="Italic"><Italic size={16} /></button><button type="button" className={underline ? 'format-button is-active' : 'format-button'} onClick={() => setUnderline((value) => !value)} title="Underline"><Underline size={16} /></button></>}
          {selectedId && <div className="whiteboard-selection-panel"><span>Selected</span><label>Size <input type="range" min="10" max="800" value={page.strokes.find((item) => item.id === selectedId)?.width || page.strokes.find((item) => item.id === selectedId)?.fontSize || page.strokes.find((item) => item.id === selectedId)?.size || 36} onChange={(event) => { const selected = page.strokes.find((item) => item.id === selectedId); const value = Number(event.target.value); updateSelected(selected?.tool === 'image' || selected?.tool === 'note' || selected?.tool === 'link' ? { width: value, height: Math.max(60, value * .7) } : selected?.tool === 'text' ? { fontSize: Math.min(160, value) } : { size: Math.min(100, value) }) }} /></label><button type="button" onClick={captionSelected} title="Edit text or image caption"><TextCursorInput size={15} /></button><button type="button" onClick={() => updateSelected({ bold: !page.strokes.find((item) => item.id === selectedId)?.bold })} title="Bold"><Bold size={15} /></button><button type="button" onClick={() => updateSelected({ italic: !page.strokes.find((item) => item.id === selectedId)?.italic })} title="Italic"><Italic size={15} /></button><button type="button" onClick={() => updateSelected({ underline: !page.strokes.find((item) => item.id === selectedId)?.underline })} title="Underline"><Underline size={15} /></button><button type="button" onClick={linkSelected} title="Add link"><Link2 size={15} /></button><button type="button" onClick={deleteSelected} title="Delete selected object"><Trash2 size={15} /></button></div>}
          <select value={page.background} onChange={(event) => updatePage({ background: event.target.value as WhiteboardBackground })} aria-label="Paper background"><option value="plain">Plain paper</option><option value="grid">Squared paper</option><option value="lined">Ruled paper</option><option value="dots">Dot paper</option><option value="margin">Ruled + margin</option><option value="cornell">Cornell notes</option><option value="checklist">Checklist</option></select>
          <select value={page.paperSize || 'a3'} onChange={(event) => updatePage({ paperSize: event.target.value as WhiteboardPageData['paperSize'] })} aria-label="Paper size"><option value="a4">A4</option><option value="a3">A3 large</option><option value="letter">Letter</option></select>
          <label className="ruling-size">Page size <input type="range" min="50" max="250" step="1" value={page.pageScale || 100} onChange={(event) => updatePage({ pageScale: Number(event.target.value) })} aria-label="Page size slider" /><input className="precise-number" type="number" min="50" max="250" step="1" value={page.pageScale || 100} onChange={(event) => updatePage({ pageScale: Math.max(50, Math.min(250, Number(event.target.value) || 100)) })} aria-label="Exact page size" /><span>%</span></label>
          <select value={page.orientation || 'portrait'} onChange={(event) => updatePage({ orientation: event.target.value as WhiteboardPageData['orientation'] })} aria-label="Paper orientation"><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select>
          <label className="ruling-size">Spacing <input type="range" min="10" max="140" step="1" value={page.rulingSize || 20} onChange={(event) => updatePage({ rulingSize: Number(event.target.value) })} aria-label="Paper line spacing slider" /><input className="precise-number" type="number" min="10" max="140" step="1" value={page.rulingSize || 20} onChange={(event) => updatePage({ rulingSize: Math.max(10, Math.min(140, Number(event.target.value) || 10)) })} aria-label="Exact paper line spacing" /><span>px</span></label>
          <label className="stylus-toggle"><input type="checkbox" checked={stylusOnly} onChange={(event) => setStylusOnly(event.target.checked)} /><MousePointer2 size={15} />Stylus only</label>
          <div className="zoom-control"><button type="button" className={fitPage ? 'is-active' : ''} onClick={() => setFitPage((value) => !value)} title="Fit the complete page"><Maximize2 size={16} /></button><button type="button" onClick={() => { setFitPage(false); setZoom((value) => Math.max(25, value - 1)) }} title="Zoom out 1%"><ZoomOut size={16} /></button><input type="range" min="25" max="200" step="1" value={zoom} onChange={(event) => { setFitPage(false); setZoom(Number(event.target.value)) }} aria-label="Page zoom slider" /><input className="precise-number" type="number" min="25" max="200" step="1" value={zoom} onChange={(event) => { setFitPage(false); setZoom(Math.max(25, Math.min(200, Number(event.target.value) || 25))) }} aria-label="Exact page zoom" /><span>%</span><button type="button" onClick={() => { setFitPage(false); setZoom((value) => Math.min(200, value + 1)) }} title="Zoom in 1%"><ZoomIn size={16} /></button></div>
        </div>
        <div ref={scrollRef} className={`whiteboard-scroll ${fitPage ? 'is-fit' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={dropOnPage} onTouchStart={(event) => { if (tool === 'select' && event.touches.length === 1) swipeStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY } }} onTouchEnd={(event) => { if (!swipeStart.current || !event.changedTouches[0]) return; const dx = event.changedTouches[0].clientX - swipeStart.current.x; const dy = event.changedTouches[0].clientY - swipeStart.current.y; if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.4) turnPage(dx < 0 ? 1 : -1); swipeStart.current = null }}><div ref={paperRef} className={`whiteboard-paper size-${page.paperSize || 'a4'} orientation-${page.orientation || 'portrait'} background-${page.background}`} style={{ width: `${displayWidth}px`, height: `${displayHeight}px`, '--ruling': `${page.rulingSize || 20}px` } as React.CSSProperties}><canvas ref={canvasRef} width={BOARD_WIDTH} height={BOARD_HEIGHT} onPointerDown={beginStroke} onPointerMove={continueStroke} onPointerUp={finishStroke} onPointerCancel={finishStroke} />{editor && <><textarea autoFocus className={`whiteboard-inline-editor ${editor.kind === 'note' ? 'is-note' : ''}`} style={{ left: `${editor.point.x / BOARD_WIDTH * 100}%`, top: `${editor.point.y / BOARD_HEIGHT * 100}%`, fontFamily: fontFamily === 'handwritten' ? '"Segoe Print", cursive' : fontFamily, fontSize: `${fontSize * paperTextScale}px` }} value={editor.value} onChange={(event) => setEditor({ ...editor, value: event.target.value })} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') commitEditor(); if (event.key === 'Escape') setEditor(null) }} placeholder={editor.kind === 'note' ? 'Write a little note…' : 'Type directly on the page…'} /><div className="whiteboard-inline-actions" style={{ left: `${editor.point.x / BOARD_WIDTH * 100}%`, top: `${editor.point.y / BOARD_HEIGHT * 100}%` }}><button type="button" onClick={commitEditor}><Check size={14} />Place</button><button type="button" onClick={() => setEditor(null)}><X size={14} /></button></div></>}</div></div>
        <p className="whiteboard-tip"><RotateCcw size={14} />With <strong>Stylus only</strong>, draw with the pen, drag the paper in any direction with one finger, and pinch with two fingers to zoom.</p>
      </section>}
      {confirmDelete && <div className="whiteboard-dialog-backdrop" role="presentation" onMouseDown={() => setConfirmDelete(null)}><section className="whiteboard-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title" onMouseDown={(event) => event.stopPropagation()}><h2 id="delete-dialog-title">Delete {confirmDelete === 'board' ? 'notebook' : 'page'}?</h2><p>{confirmDelete === 'board' ? `“${board?.title}” and all its pages will be permanently removed.` : `“${page?.name}” will be permanently removed.`}</p><div><button type="button" onClick={() => setConfirmDelete(null)}>Keep it</button><button type="button" className="danger" onClick={() => { const action = confirmDelete; setConfirmDelete(null); if (action === 'board') void deleteBoard(); else deletePage() }}><Trash2 size={15} />Delete</button></div></section></div>}
    </div>
  </div>
}
