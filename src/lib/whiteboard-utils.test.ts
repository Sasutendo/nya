import { describe, expect, it } from 'vitest'
import { flattenWhiteboardTree, mergeWhiteboardChanges, selectedWhiteboardText, strokeBounds, strokesInsideLasso } from './whiteboard-utils'
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

  it('copies only text from the selected marks in page order', () => {
    const textStroke: WhiteboardStroke = { ...stroke('text', 10, 10), tool: 'text', text: 'First note' }
    const linkStroke: WhiteboardStroke = { ...stroke('link', 20, 20), tool: 'link', text: 'Study link' }
    expect(selectedWhiteboardText([textStroke, stroke('drawing', 30, 30), linkStroke], ['text', 'drawing', 'link'])).toBe('First note\n\nStudy link')
  })

  it('hides descendants when a board is collapsed', () => {
    const board = (id: string, parentId?: string): WhiteboardBoard => ({ id, parentId, title: id, pages: [{ id: `${id}-page`, name: 'One', background: 'grid', strokes: [] }], published: false, createdAt: '', updatedAt: '' })
    const tree = flattenWhiteboardTree([board('root'), board('child', 'root'), board('grandchild', 'child')], new Set(['root']))
    expect(tree.map(({ board: candidate }) => candidate.id)).toEqual(['root'])
    expect(tree[0]).toMatchObject({ hasChildren: true, collapsed: true })
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

  it('keeps the newest custom cover art during a conflict merge', () => {
    const base: WhiteboardBoard = { id: 'board', title: 'Notes', pages: [{ id: 'page', name: 'One', background: 'grid', strokes: [] }], published: false, revision: 2, createdAt: '2026-08-26T08:00:00.000Z', updatedAt: '2026-08-26T08:00:00.000Z' }
    const merged = mergeWhiteboardChanges({ ...base, coverImage: 'https://example.com/new.png', updatedAt: '2026-08-26T09:00:00.000Z' }, { ...base, coverImage: 'https://example.com/old.png' })
    expect(merged.coverImage).toBe('https://example.com/new.png')
  })
})
