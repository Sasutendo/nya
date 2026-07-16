export type ItemType = 'presentation' | 'note' | 'project'
export type ItemStatus = 'draft' | 'published'
export type SlideLayout = 'title' | 'statement' | 'split' | 'list' | 'quote' | 'image'
export type SlideTone = 'sage' | 'ocean' | 'clay' | 'plum' | 'paper'
export type MediaKind = 'image' | 'video' | 'audio' | 'document' | 'file'

export interface MediaAsset {
  id: string
  name: string
  url: string
  kind: MediaKind
  mimeType: string
  size: number
}

export interface PresentationSlide {
  id: string
  layout: SlideLayout
  tone: SlideTone
  eyebrow?: string
  title: string
  body?: string
  points?: string[]
  imageUrl?: string
  imageAlt?: string
  videoUrl?: string
  caption?: string
  speakerNotes?: string
}

export interface PresentationContent {
  kind: 'presentation'
  slides: PresentationSlide[]
}

export interface NoteContent {
  kind: 'note'
  body: string
}

export interface ProjectLink {
  label: string
  url: string
}

export interface ProjectContent {
  kind: 'project'
  body: string
  goals: string[]
  outcome?: string
  links?: ProjectLink[]
}

export type ItemContent = PresentationContent | NoteContent | ProjectContent

export interface ContentItem {
  id: string
  type: ItemType
  slug: string
  title: string
  excerpt: string
  category: string
  tags: string[]
  status: ItemStatus
  featured: boolean
  coverImage?: string
  assets: MediaAsset[]
  content: ItemContent
  viewCount: number
  slideCount?: number
  readingMinutes?: number
  createdAt: string
  updatedAt: string
  publishedAt?: string
}

export interface SiteSettings {
  siteTitle: string
  ownerName: string
  eyebrow: string
  tagline: string
  introduction: string
  trainingLabel: string
  footerNote: string
}

export interface ItemFilters {
  type?: ItemType
  query?: string
  category?: string
}

export interface ApiErrorShape {
  error: string
}

export interface SessionState {
  authenticated: boolean
  email?: string
  setupRequired?: boolean
}
