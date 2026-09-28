import type { WhiteboardBoard } from '../types'

type Pending = { resolve: (body: string) => void; reject: (reason: Error) => void }

let worker: Worker | undefined
let nextId = 0
const pending = new Map<number, Pending>()

function serializer(): Worker | undefined {
  if (typeof Worker === 'undefined') return undefined
  if (worker) return worker
  worker = new Worker(new URL('./whiteboard-serializer.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (event: MessageEvent<{ id: number; body?: string; error?: string }>) => {
    const task = pending.get(event.data.id)
    if (!task) return
    pending.delete(event.data.id)
    if (event.data.body !== undefined) task.resolve(event.data.body)
    else task.reject(new Error(event.data.error || 'The notebook could not be prepared.'))
  }
  worker.onerror = () => {
    pending.forEach(({ reject }) => reject(new Error('The notebook save worker stopped.')))
    pending.clear()
    worker?.terminate()
    worker = undefined
  }
  return worker
}

export function serialiseWhiteboard(board: WhiteboardBoard): Promise<string> {
  const backgroundWorker = serializer()
  if (!backgroundWorker) return Promise.resolve(JSON.stringify(board))
  return new Promise((resolve, reject) => {
    const id = ++nextId
    pending.set(id, { resolve, reject })
    backgroundWorker.postMessage({ id, board })
  })
}

