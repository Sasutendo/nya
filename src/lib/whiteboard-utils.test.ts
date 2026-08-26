import { describe, expect, it } from 'vitest'
import { mergeWhiteboardChanges, strokeBounds, strokesInsideLasso } from './whiteboard-utils'
import type { WhiteboardBoard, WhiteboardStroke } from '../types'

const stroke = (id: string, x: number, y: number, updatedAt = '2026-08-26T08:00:00.000Z'): WhiteboardStroke => ({ id, tool: 'pen', colour: '#000000', size: 2, points: [{ x, y, pressure: .5 }], updatedAt })

describe('whiteboard selection helpers', () => {
  it('calculates bounds without spreading large point arrays', () => {
    const points = Array.from({ length: 25_000 }, (_, index) => ({ x: index % 1240, y: index % 1754, pressure: .5 }))
    expect(strokeBounds({ ...stroke('dense', 0, 0), points })).toMatchObject({ left: -4, top: -4, right: 1243 })
  })

  it('selects marks whose centres are inside a lasso', () => {
    const polygon = [{ x: 0, y: 0, pressure: .5 }, { x: 200, y: 0, pressure: .5 }, { x: 200, y: 200, pressure: .5 }, { x: 0, y: 200, pressure: .5 }]
    expect(strokesInsideLasso([stroke('inside', 80, 80), stroke('outside', 400, 400)], polygon)).toEqual(['inside'])
  })
})

describe('whiteboard conflict merge', () => {
  it('keeps independent offline and remote marks while respecting tombstones', () => {
    const base = (updatedAt: string, strokes: WhiteboardStroke[]): WhiteboardBoard => ({ id: 'board', title: 'Notes', pages: [{ id: 'page', name: 'One', background: 'grid', strokes, updatedAt }], published: false, revision: 2, createdAt: updatedAt, updatedAt })
    const remote = base('2026-08-26T08:00:00.000Z', [stroke('remote', 10, 10)])
    const local = base('2026-08-26T09:00:00.000Z', [stroke('local', 20, 20, '2026-08-26T09:00:00.000Z')])
    local.pages[0].deletedStrokeIds = ['remote']
    const merged = mergeWhiteboardChanges(local, remote)
    expect(merged.pages[0].strokes.map((item) => item.id)).toEqual(['local'])
    expect(merged.revision).toBe(2)
  })
})
