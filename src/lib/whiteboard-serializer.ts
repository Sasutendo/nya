import type { WhiteboardBoard } from '../types'

type PendingTask = {
  resolve: (body: string) => void
  reject: (reason: Error) => void
}

let worker: Worker | undefined
let nextTaskId = 0
const pendingTasks = new Map<number, PendingTask>()

function getSerializerWorker(): Worker | undefined {
  if (typeof Worker === 'undefined') return undefined
  if (worker) return worker

  worker = new Worker(new URL('./whiteboard-serializer.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (event: MessageEvent<{ id: number; body?: string; error?: string }>) => {
    const task = pendingTasks.get(event.data.id)
    if (!task) return
    pendingTasks.delete(event.data.id)
    if (event.data.body !== undefined) task.resolve(event.data.body)
    else task.reject(new Error(event.data.error || 'The notebook could not be prepared.'))
  }
  worker.onerror = () => {
    pendingTasks.forEach(({ reject }) => reject(new Error('The notebook save worker stopped.')))
    pendingTasks.clear()
    worker?.terminate()
    worker = undefined
  }
  return worker
}

export function serialiseWhiteboard(board: WhiteboardBoard): Promise<string> {
  const serializerWorker = getSerializerWorker()
  if (!serializerWorker) return Promise.resolve(JSON.stringify(board))

  return new Promise((resolve, reject) => {
    const id = ++nextTaskId
    pendingTasks.set(id, { resolve, reject })
    serializerWorker.postMessage({ id, board })
  })
}
