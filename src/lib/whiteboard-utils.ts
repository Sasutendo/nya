import type { WhiteboardBoard, WhiteboardPageData, WhiteboardPoint, WhiteboardStroke } from '../types'

export interface WhiteboardBounds { left: number; top: number; right: number; bottom: number }

function timestamp(value?: string): number {
  const parsed = value ? Date.parse(value) : 0
  return Number.isFinite(parsed) ? parsed : 0
}

export function strokeBounds(stroke: WhiteboardStroke): WhiteboardBounds | null {
  if (!stroke.points.length) return null
  let left = stroke.points[0].x
  let right = left
  let top = stroke.points[0].y
  let bottom = top
  for (let index = 1; index < stroke.points.length; index += 1) {
    const point = stroke.points[index]
    if (point.x < left) left = point.x
    if (point.x > right) right = point.x
    if (point.y < top) top = point.y
    if (point.y > bottom) bottom = point.y
  }
  if (['text', 'note', 'link', 'image'].includes(stroke.tool)) {
    const width = stroke.width || Math.max(120, (stroke.text?.length || 1) * (stroke.fontSize || stroke.size || 36) * .55)
    const height = stroke.height || Math.max(60, (stroke.text?.split('\n').length || 1) * (stroke.fontSize || stroke.size || 36) * 1.3)
    right = Math.max(right, left + width)
    bottom = Math.max(bottom, top + height)
  }
  const padding = ['text', 'note', 'link', 'image'].includes(stroke.tool) ? 8 : Math.max(4, stroke.size / 2)
  return { left: left - padding, top: top - padding, right: right + padding, bottom: bottom + padding }
}

export function pointInPolygon(point: WhiteboardPoint, polygon: WhiteboardPoint[]): boolean {
  if (polygon.length < 3) return false
  let inside = false
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
    const a = polygon[current]
    const b = polygon[previous]
    const crosses = (a.y > point.y) !== (b.y > point.y)
      && point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || Number.EPSILON) + a.x
    if (crosses) inside = !inside
  }
  return inside
}

export function strokesInsideLasso(strokes: WhiteboardStroke[], polygon: WhiteboardPoint[]): string[] {
  if (polygon.length < 3) return []
  let polygonLeft = polygon[0].x; let polygonRight = polygonLeft; let polygonTop = polygon[0].y; let polygonBottom = polygonTop
  for (let index = 1; index < polygon.length; index += 1) {
    const point = polygon[index]
    if (point.x < polygonLeft) polygonLeft = point.x
    if (point.x > polygonRight) polygonRight = point.x
    if (point.y < polygonTop) polygonTop = point.y
    if (point.y > polygonBottom) polygonBottom = point.y
  }
  return strokes.filter((stroke) => {
    if (stroke.tool === 'eraser') return false
    const bounds = strokeBounds(stroke)
    if (!bounds) return false
    if (bounds.right < polygonLeft || bounds.left > polygonRight || bounds.bottom < polygonTop || bounds.top > polygonBottom) return false
    const centre = { x: (bounds.left + bounds.right) / 2, y: (bounds.top + bounds.bottom) / 2, pressure: .5 }
    if (pointInPolygon(centre, polygon)) return true
    return stroke.points.some((point) => pointInPolygon(point, polygon))
  }).map((stroke) => stroke.id)
}

function mergePage(local: WhiteboardPageData, remote: WhiteboardPageData, localBoardTime: string, remoteBoardTime: string): WhiteboardPageData {
  const deletedStrokeIds = [...new Set([...(remote.deletedStrokeIds || []), ...(local.deletedStrokeIds || [])])]
  const deleted = new Set(deletedStrokeIds)
  const strokes = new Map<string, WhiteboardStroke>()
  remote.strokes.forEach((stroke) => strokes.set(stroke.id, stroke))
  local.strokes.forEach((stroke) => {
    const saved = strokes.get(stroke.id)
    if (!saved || timestamp(stroke.updatedAt || localBoardTime) >= timestamp(saved.updatedAt || remoteBoardTime)) strokes.set(stroke.id, stroke)
  })
  deleted.forEach((id) => strokes.delete(id))
  const localIsNewer = timestamp(local.updatedAt || localBoardTime) >= timestamp(remote.updatedAt || remoteBoardTime)
  const settings = localIsNewer ? local : remote
  return { ...settings, strokes: [...strokes.values()], deletedStrokeIds, updatedAt: localIsNewer ? local.updatedAt || localBoardTime : remote.updatedAt || remoteBoardTime }
}

export function mergeWhiteboardChanges(local: WhiteboardBoard, remote: WhiteboardBoard): WhiteboardBoard {
  const deletedPageIds = [...new Set([...(remote.deletedPageIds || []), ...(local.deletedPageIds || [])])]
  const deleted = new Set(deletedPageIds)
  const localPages = new Map(local.pages.map((page) => [page.id, page]))
  const remotePages = new Map(remote.pages.map((page) => [page.id, page]))
  const pageIds = [...new Set([...remotePages.keys(), ...localPages.keys()])]
  const pages = pageIds.flatMap((id) => {
    if (deleted.has(id)) return []
    const localPage = localPages.get(id)
    const remotePage = remotePages.get(id)
    if (localPage && remotePage) return [mergePage(localPage, remotePage, local.updatedAt, remote.updatedAt)]
    return localPage ? [localPage] : remotePage ? [remotePage] : []
  })
  const localIsNewer = timestamp(local.updatedAt) >= timestamp(remote.updatedAt)
  const settings = localIsNewer ? local : remote
  return {
    ...settings,
    id: remote.id,
    pages: pages.length ? pages : remote.pages,
    deletedPageIds,
    revision: remote.revision,
    createdAt: remote.createdAt,
    updatedAt: localIsNewer ? local.updatedAt : remote.updatedAt,
  }
}
