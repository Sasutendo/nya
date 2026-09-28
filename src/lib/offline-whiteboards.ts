import type { WhiteboardBoard } from '../types'

const DATABASE = 'nya-offline-notebooks-v1'
const BOARDS = 'boards'
const OUTBOX = 'outbox'
let databasePromise: Promise<IDBDatabase> | undefined

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(BOARDS)) database.createObjectStore(BOARDS, { keyPath: 'id' })
      if (!database.objectStoreNames.contains(OUTBOX)) database.createObjectStore(OUTBOX, { keyPath: 'id' })
    }
    request.onsuccess = () => {
      request.result.onversionchange = () => { request.result.close(); databasePromise = undefined }
      resolve(request.result)
    }
    request.onerror = () => { databasePromise = undefined; reject(request.error) }
  })
  return databasePromise
}

function transaction<T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDatabase().then((database) => new Promise<T>((resolve, reject) => {
    const request = action(database.transaction(storeName, mode).objectStore(storeName))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  }))
}

export async function cacheWhiteboards(boards: WhiteboardBoard[], replace = false): Promise<void> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction(BOARDS, 'readwrite')
    const store = tx.objectStore(BOARDS)
    if (replace) store.clear()
    boards.forEach((board) => store.put(board))
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function cachedWhiteboards(): Promise<WhiteboardBoard[]> {
  return transaction<WhiteboardBoard[]>(BOARDS, 'readonly', (store) => store.getAll())
}

export async function queueWhiteboardWrite(board: WhiteboardBoard, create: boolean): Promise<void> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction([BOARDS, OUTBOX], 'readwrite')
    tx.objectStore(BOARDS).put(board)
    tx.objectStore(OUTBOX).put({ id: board.id, board, create, delete: false })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function queueWhiteboardDelete(id: string): Promise<void> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction([BOARDS, OUTBOX], 'readwrite')
    tx.objectStore(BOARDS).delete(id)
    tx.objectStore(OUTBOX).put({ id, delete: true })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function pendingWhiteboards(): Promise<Array<{ id: string; board?: WhiteboardBoard; create?: boolean; delete?: boolean }>> {
  return transaction<Array<{ id: string; board?: WhiteboardBoard; create?: boolean; delete?: boolean }>>(OUTBOX, 'readonly', (store) => store.getAll())
}

export async function removePendingWhiteboard(id: string, expectedUpdatedAt?: string): Promise<void> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction(OUTBOX, 'readwrite')
    const store = tx.objectStore(OUTBOX)
    if (!expectedUpdatedAt) store.delete(id)
    else {
      const read = store.get(id)
      read.onsuccess = () => {
        const pending = read.result as { board?: WhiteboardBoard } | undefined
        if (pending?.board?.updatedAt === expectedUpdatedAt) store.delete(id)
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
