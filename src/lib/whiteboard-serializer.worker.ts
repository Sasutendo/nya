import type { WhiteboardBoard } from '../types'

function prepareBoard(board: WhiteboardBoard): WhiteboardBoard {
  return {
    ...board,
    pages: board.pages.map((page) => ({
      ...page,
      strokes: page.strokes.flatMap((stroke) => {
        if (!Array.isArray(stroke.points) || !stroke.points.length) return []
        if (!['pen', 'highlighter', 'eraser'].includes(stroke.tool) || stroke.points.length < 3) return stroke

        const kept = [stroke.points[0]]
        for (let index = 1; index < stroke.points.length - 1; index += 1) {
          const point = stroke.points[index]
          const previous = kept[kept.length - 1]
          if (Math.hypot(point.x - previous.x, point.y - previous.y) >= 1.25) kept.push(point)
        }
        kept.push(stroke.points[stroke.points.length - 1])

        return {
          ...stroke,
          points: kept.map((point) => ({
            x: Math.round(point.x * 10) / 10,
            y: Math.round(point.y * 10) / 10,
            pressure: Math.round(point.pressure * 100) / 100,
          })),
        }
      }),
    })),
  }
}

self.onmessage = (event: MessageEvent<{ id: number; board: WhiteboardBoard }>) => {
  const { id, board } = event.data
  try {
    self.postMessage({ id, body: JSON.stringify(prepareBoard(board)) })
  } catch (reason) {
    self.postMessage({
      id,
      error: reason instanceof Error ? reason.message : 'The notebook could not be prepared.',
    })
  }
}
