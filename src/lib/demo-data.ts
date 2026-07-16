import type { ContentItem, SiteSettings } from '../types'

const now = new Date().toISOString()

export const DEFAULT_SETTINGS: SiteSettings = {
  siteTitle: 'Nya Learning Studio',
  ownerName: 'Yuuki',
  eyebrow: 'Nursing training · learning archive',
  tagline: 'Learn with care. Share with clarity.',
  introduction:
    'A growing collection of presentations, study notes and practical projects from my journey to becoming a qualified nurse.',
  trainingLabel: 'General nursing training · Starting August',
  footerNote: 'Built as a calm place for useful knowledge.',
}

export const DEMO_ITEMS: ContentItem[] = [
  {
    id: 'demo_presentation',
    type: 'presentation',
    slug: 'welcome-to-my-learning-studio',
    title: 'Welcome to my learning studio',
    excerpt: 'A short tour of how presentations, notes and projects live together in this archive.',
    category: 'Orientation',
    tags: ['Welcome', 'Portfolio'],
    status: 'published',
    featured: true,
    assets: [],
    content: {
      kind: 'presentation',
      slides: [
        {
          id: 'slide_1',
          layout: 'title',
          tone: 'sage',
          eyebrow: 'Nya Learning Studio',
          title: 'Learning, documented with care.',
          body: 'Presentations, notes and projects from my nursing training — organised in one calm, public archive.',
        },
        {
          id: 'slide_2',
          layout: 'list',
          tone: 'paper',
          eyebrow: 'What you will find here',
          title: 'One home for every kind of work',
          points: [
            'Focused study notes for quick revision',
            'Full-screen presentations for school and practice',
            'Projects that show the process as well as the result',
          ],
        },
        {
          id: 'slide_3',
          layout: 'quote',
          tone: 'clay',
          title: 'Knowledge becomes more useful when it is clear enough to share.',
          body: 'This studio will grow with every module, placement and new skill.',
        },
        {
          id: 'slide_4',
          layout: 'statement',
          tone: 'ocean',
          eyebrow: 'The beginning',
          title: 'Training starts in August.',
          body: 'The archive starts now — ready for everything that comes next.',
        },
      ],
    },
    viewCount: 24,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  },
  {
    id: 'demo_note',
    type: 'note',
    slug: 'how-i-structure-study-notes',
    title: 'How I structure study notes',
    excerpt: 'A simple note format built for understanding first and revision later.',
    category: 'Study methods',
    tags: ['Learning', 'Organisation'],
    status: 'published',
    featured: false,
    assets: [],
    content: {
      kind: 'note',
      body: `## Start with the purpose\n\nBefore writing details, I add one sentence that answers: **What should I understand after reading this?**\n\n## Keep one clear hierarchy\n\n- Main concept\n- Important details\n- Example from practice\n- Questions to revisit\n\n## End with a quick check\n\nI finish every note with three small questions. If I can answer them without looking, the note has done its job.\n\n> This is starter content. The owner studio lets me replace it with real training notes whenever I am ready.`,
    },
    viewCount: 13,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  },
  {
    id: 'demo_project',
    type: 'project',
    slug: 'my-training-portfolio',
    title: 'My training portfolio',
    excerpt: 'The long-term project behind this website: making progress visible without making learning feel cluttered.',
    category: 'Portfolio',
    tags: ['Planning', 'Reflection'],
    status: 'published',
    featured: true,
    assets: [],
    content: {
      kind: 'project',
      body: `## Why this exists\n\nNursing training creates a lot of valuable work: classroom presentations, placement reflections, practical preparation and revision notes. This project gives all of it a permanent, organised home.\n\n## The approach\n\nEach piece can begin as a private draft. When it is ready, it can be published to the public library with one change. The public site stays clean while the private studio keeps the full working process.`,
      goals: [
        'Keep school work easy to find on phone and computer',
        'Present finished work in a professional way',
        'Build a useful record of progress throughout training',
      ],
      outcome: 'A living portfolio that grows with every part of the training.',
    },
    viewCount: 9,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  },
]
