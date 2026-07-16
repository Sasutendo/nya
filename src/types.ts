export type ItemType = 'presentation' | 'note' | 'project'
export type ItemStatus = 'draft' | 'published'
export type SlideLayout = 'title' | 'statement' | 'split' | 'list' | 'quote' | 'image'
export type SlideTone = 'sage' | 'ocean' | 'clay' | 'plum' | 'paper'
export type SlideAnimation = 'none' | 'fade' | 'rise' | 'pop' | 'drift'
export type MediaKind = 'image' | 'video' | 'audio' | 'document' | 'file'
export type CalendarEventCategory = 'school' | 'placement' | 'assignment' | 'exam' | 'milestone' | 'personal'
export type EventVisibility = 'public' | 'private'
export type StickyNoteColour = 'pink' | 'peach' | 'yellow' | 'sage' | 'lilac'
export type TaskPriority = 'low' | 'normal' | 'high'
export type NursingSkillStatus = 'learning' | 'practising' | 'confident'

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
  animation?: SlideAnimation
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
  profileImage: string
  profileImageAlt: string
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

export interface CalendarEvent {
  id: string
  title: string
  description: string
  date: string
  endDate?: string
  time?: string
  category: CalendarEventCategory
  visibility: EventVisibility
  relatedItemSlug?: string
  createdAt: string
  updatedAt: string
}

export interface StickyNote {
  id: string
  text: string
  colour: StickyNoteColour
  createdAt: string
  updatedAt: string
}

export interface PlannerTask {
  id: string
  title: string
  dueDate?: string
  priority: TaskPriority
  completed: boolean
  createdAt: string
  updatedAt: string
}

export interface PlannerData {
  events: CalendarEvent[]
  notes: StickyNote[]
  tasks: PlannerTask[]
}

export interface StudyCard {
  id: string
  question: string
  answer: string
  category: string
  createdAt: string
  updatedAt: string
}

export interface NursingSkill {
  id: string
  title: string
  category: string
  status: NursingSkillStatus
  notes: string
  createdAt: string
  updatedAt: string
}

export interface StudyReflection {
  id: string
  date: string
  win: string
  learned: string
  revisit: string
  createdAt: string
  updatedAt: string
}

export interface StudyHubData {
  cards: StudyCard[]
  skills: NursingSkill[]
  reflections: StudyReflection[]
}
