import { useCallback, useEffect, useRef } from 'react'
import { RotateCcw, Trash2 } from 'lucide-react'
import type { StudyCardInkPoint, StudyCardInkStroke } from '../types'

interface StudyCardInkProps {
  strokes: StudyCardInkStroke[]
  label: string
  onChange?: (strokes: StudyCardInkStroke[]) => void
}

function paint(canvas: HTMLCanvasElement, strokes: StudyCardInkStroke[]) {
  const rect = canvas.getBoundingClientRect()
  const scale = window.devicePixelRatio || 1
  const context = canvas.getContext('2d')
  if (!context || !rect.width || !rect.height) return
  context.setTransform(scale, 0, 0, scale, 0, 0)
  context.clearRect(0, 0, rect.width, rect.height)
  context.lineCap = 'round'
  context.lineJoin = 'round'
  strokes.forEach((stroke) => {
    if (!stroke.points.length) return
    context.strokeStyle = stroke.colour
    if (stroke.points.length === 1) {
      const point = stroke.points[0]
      context.beginPath()
      context.arc(point.x * rect.width, point.y * rect.height, stroke.size / 2, 0, Math.PI * 2)
      context.fillStyle = stroke.colour
      context.fill()
      return
    }
    for (let index = 1; index < stroke.points.length; index += 1) {
      const previous = stroke.points[index - 1]
      const point = stroke.points[index]
      context.beginPath()
      context.moveTo(previous.x * rect.width, previous.y * rect.height)
      context.lineTo(point.x * rect.width, point.y * rect.height)
      context.lineWidth = stroke.size * (.7 + Math.max(.15, point.pressure) * .6)
      context.stroke()
    }
  })
}

export function StudyCardInk({ strokes, label, onChange }: StudyCardInkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activeStroke = useRef<StudyCardInkStroke | null>(null)
  const editable = Boolean(onChange)

  const redraw = useCallback((next = strokes) => {
    const canvas = canvasRef.current
    if (canvas) paint(canvas, next)
  }, [strokes])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const scale = window.devicePixelRatio || 1
      const width = Math.max(1, Math.round(rect.width * scale))
      const height = Math.max(1, Math.round(rect.height * scale))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      redraw()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    return () => observer.disconnect()
  }, [redraw])

  function point(event: React.PointerEvent<HTMLCanvasElement>): StudyCardInkPoint {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
      pressure: event.pressure || .5,
    }
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!onChange || event.pointerType === 'touch' || (event.pointerType === 'mouse' && event.button !== 0)) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    activeStroke.current = { id: crypto.randomUUID(), colour: '#302128', size: 2.4, points: [point(event)] }
    redraw([...strokes, activeStroke.current])
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!activeStroke.current) return
    event.preventDefault()
    const events = event.nativeEvent.getCoalescedEvents?.() || [event.nativeEvent]
    const rect = event.currentTarget.getBoundingClientRect()
    events.forEach((sample) => activeStroke.current?.points.push({
      x: Math.max(0, Math.min(1, (sample.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (sample.clientY - rect.top) / rect.height)),
      pressure: sample.pressure || .5,
    }))
    redraw([...strokes, activeStroke.current])
  }

  function finish(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!activeStroke.current || !onChange) return
    event.preventDefault()
    const completed = activeStroke.current
    activeStroke.current = null
    onChange([...strokes, completed])
  }

  return (
    <div className={`study-card-ink${editable ? ' is-editable' : ' is-readonly'}`}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={finish}
      />
      {editable && (
        <div className="study-card-ink-actions">
          <span>Pen or mouse · fingers still scroll</span>
          <button type="button" onClick={() => onChange?.(strokes.slice(0, -1))} disabled={!strokes.length}><RotateCcw size={14} />Undo</button>
          <button type="button" onClick={() => onChange?.([])} disabled={!strokes.length}><Trash2 size={14} />Clear</button>
        </div>
      )}
    </div>
  )
}
