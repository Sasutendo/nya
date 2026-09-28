const imageCache = new Map<string, HTMLImageElement>()

function cacheLimit(): number {
  if (typeof navigator === 'undefined') return 8
  const memory = Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory || 0)
  return memory > 0 && memory <= 4 ? 4 : 8
}

export function reliableWhiteboardMediaUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin)
    if (parsed.hostname !== 'raw.githubusercontent.com') return url
    const parts = parsed.pathname.split('/').filter(Boolean)
    const publicIndex = parts.indexOf('public')
    if (publicIndex < 0 || parts[publicIndex + 1] !== 'uploads') return url
    return `/api/public/media/${parts.slice(publicIndex).map(encodeURIComponent).join('/')}`
  } catch { return url }
}

function releaseImage(url: string, image: HTMLImageElement): void {
  image.onload = null
  image.onerror = null
  image.removeAttribute('src')
  imageCache.delete(url)
}

export function cachedWhiteboardImage(url: string): HTMLImageElement {
  const resolved = reliableWhiteboardMediaUrl(url)
  const cached = imageCache.get(resolved)
  if (cached) {
    imageCache.delete(resolved)
    imageCache.set(resolved, cached)
    return cached
  }

  while (imageCache.size >= cacheLimit()) {
    const oldest = imageCache.entries().next().value as [string, HTMLImageElement] | undefined
    if (!oldest) break
    releaseImage(oldest[0], oldest[1])
  }

  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.onerror = () => releaseImage(resolved, image)
  image.src = resolved
  imageCache.set(resolved, image)
  return image
}

export function peekWhiteboardImage(url: string): HTMLImageElement | undefined {
  return imageCache.get(reliableWhiteboardMediaUrl(url))
}

export function dropWhiteboardImage(url: string): void {
  const resolved = reliableWhiteboardMediaUrl(url)
  const image = imageCache.get(resolved)
  if (image) releaseImage(resolved, image)
}

export function keepOnlyWhiteboardImages(urls: Iterable<string>): void {
  const keep = new Set([...urls].map(reliableWhiteboardMediaUrl))
  for (const [url, image] of imageCache) {
    if (!keep.has(url)) releaseImage(url, image)
  }
}

export async function optimiseWhiteboardImageUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || /(?:gif|svg)/i.test(file.type) || typeof createImageBitmap === 'undefined') return file
  let bitmap: ImageBitmap | undefined
  try {
    bitmap = await createImageBitmap(file)
    const longestSide = Math.max(bitmap.width, bitmap.height)
    if (longestSide <= 2_000 && file.size <= 2.5 * 1024 * 1024) return file
    const scale = Math.min(1, 2_000 / longestSide)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d', { alpha: true })
    if (!context) return file
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', .86))
    if (!blob || blob.size >= file.size) return file
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'notebook-image'
    return new File([blob], `${baseName}.webp`, { type: blob.type, lastModified: file.lastModified })
  } catch {
    return file
  } finally {
    bitmap?.close()
  }
}
