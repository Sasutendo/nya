import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, ChevronUp, Copy, FileText, FolderKanban, Image,
  LayoutDashboard, LoaderCircle, LockKeyhole, LogOut, MonitorPlay, Paperclip, Plus, Presentation,
  Save, Settings, Trash2, Upload, Video, X,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import remarkGfm from 'remark-gfm'
import { useSite } from '../../App'
import { EmptyState, ErrorNotice, LoadingState } from '../../components/Feedback'
import { SlideCanvas } from '../../components/SlideCanvas'
import { adminApi, authApi } from '../../lib/api'
import { formatDate, itemTypeLabel, newId, normaliseTags, slugify } from '../../lib/format'
import type {
  ContentItem, ItemContent, ItemStatus, ItemType, MediaAsset, PresentationSlide, SessionState,
  SiteSettings, SlideLayout, SlideTone,
} from '../../types'

type GuardState = SessionState | null | undefined

export function useStudioSession(): GuardState {
  const [session, setSession] = useState<GuardState>(undefined)
  useEffect(() => {
    authApi.session().then(setSession).catch(() => setSession(null))
  }, [])
  return session
}

export function StudioNav() {
  const navigate = useNavigate()
  async function logout() {
    await authApi.logout().catch(() => undefined)
    navigate('/studio/login', { replace: true })
  }

  return (
    <nav className="studio-subnav" aria-label="Owner studio navigation">
      <Link to="/studio"><LayoutDashboard size={17} />Dashboard</Link>
      <Link to="/studio/planner"><CalendarDays size={17} />Planner</Link>
      <Link to="/studio/settings"><Settings size={17} />Site settings</Link>
      <button type="button" onClick={logout}><LogOut size={17} />Sign out</button>
    </nav>
  )
}

export function StudioLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [session, setSession] = useState<GuardState>(undefined)
  const navigate = useNavigate()
  const location = useLocation()
  const setupMode = Boolean(session?.setupRequired)

  useEffect(() => {
    authApi.session().then((result) => {
      setSession(result)
      if (result.email) setEmail(result.email)
    }).catch(() => setSession(null))
  }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (setupMode) {
        if (password !== confirmPassword) throw new Error('The two passwords do not match.')
        await authApi.setupLocalPassword(email.trim(), password)
      } else {
        await authApi.login(email.trim(), password)
      }
      const destination = (location.state as { from?: string } | null)?.from || '/studio'
      navigate(destination, { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign-in failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (session?.authenticated) return <Navigate to="/studio" replace />

  return (
    <div className="studio-login page-shell section-shell">
      <div className="login-card">
        <div className="login-mark"><LockKeyhole size={25} /></div>
        <p className="eyebrow">Private workspace</p>
        <h1>Owner studio</h1>
        <p>{setupMode ? 'Create your private password for this local preview.' : 'Sign in to create, upload and publish. Visitors never see this workspace.'}</p>
        {import.meta.env.DEV && <div className="local-preview-note"><MonitorPlay size={17} /><span><strong>{setupMode ? 'First-time local setup' : 'Local preview mode'}</strong>{setupMode ? 'Your password is hashed in this browser and never added to the source code.' : 'Your test content and owner session stay only in this browser.'}</span></div>}
        {error && <ErrorNotice message={error} />}
        <form onSubmit={submit} className="form-stack">
          <label>{setupMode ? 'Create owner email' : 'Email'}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" readOnly={import.meta.env.DEV && !setupMode} required />{setupMode && <small>This remains in your browser for the local preview and is not written into the project.</small>}</label>
          <label>{setupMode ? 'Create password' : 'Password'}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={setupMode ? 'new-password' : 'current-password'} minLength={setupMode ? 12 : undefined} required /></label>
          {setupMode && <label>Confirm password<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={12} required /><small>Use at least 12 characters. A short sentence is easy to remember and hard to guess.</small></label>}
          <button className="button button-primary" type="submit" disabled={submitting}>
            {submitting ? <LoaderCircle className="spin" size={18} /> : <LockKeyhole size={17} />}{submitting ? (setupMode ? 'Creating password…' : 'Signing in…') : (setupMode ? 'Create password and enter' : 'Sign in securely')}
          </button>
        </form>
        <Link to="/" className="back-link"><ArrowLeft size={16} />Return to the public site</Link>
      </div>
    </div>
  )
}

export function StudioPage() {
  const session = useStudioSession()
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ItemType | 'all'>('all')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    adminApi.items().then((result) => setItems(result.items)).catch((reason) => setError(reason.message)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (session?.authenticated) load()
  }, [load, session])

  if (session === undefined) return <div className="page-shell section-shell"><LoadingState label="Opening your studio…" /></div>
  if (!session?.authenticated) return <Navigate to="/studio/login" state={{ from: '/studio' }} replace />

  const visible = filter === 'all' ? items : items.filter((item) => item.type === filter)
  const published = items.filter((item) => item.status === 'published').length

  async function remove(item: ContentItem) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return
    try {
      await adminApi.remove(item.id)
      setItems((current) => current.filter((candidate) => candidate.id !== item.id))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The item could not be deleted.')
    }
  }

  return (
    <div className="studio-page page-shell section-shell">
      <header className="studio-header">
        <div><p className="eyebrow"><LockKeyhole size={14} />Private owner area</p><h1>Your studio</h1><p>Create privately, then publish when the work is ready.</p></div>
        <StudioNav />
      </header>

      {error && <ErrorNotice message={error} />}

      <section className="studio-stats" aria-label="Content overview">
        <div><span>All work</span><strong>{items.length}</strong><small>presentations, notes and projects</small></div>
        <div><span>Published</span><strong>{published}</strong><small>visible in the public library</small></div>
        <div><span>Private drafts</span><strong>{items.length - published}</strong><small>only visible here</small></div>
      </section>

      <Link to="/studio/planner" className="studio-planner-banner">
        <span className="planner-banner-icon"><CalendarDays size={23} /></span>
        <div><p className="eyebrow">Your private corner</p><h2>Calendar, tasks and sticky notes</h2><small>Plan deadlines, keep quick thoughts and decide which milestones become public.</small></div>
        <span className="planner-banner-arrow">Open planner <ArrowRight size={18} /></span>
        <i className="banner-sticky sticky-one" /><i className="banner-sticky sticky-two" />
      </Link>

      <section className="create-section">
        <div><p className="eyebrow">Create something</p><h2>What are you working on?</h2></div>
        <div className="create-buttons">
          <Link to="/studio/new/presentation"><Presentation size={20} /><span><strong>Presentation</strong><small>Build a full-screen slide deck</small></span><ArrowRight size={18} /></Link>
          <Link to="/studio/new/note"><FileText size={20} /><span><strong>Study note</strong><small>Write a structured revision note</small></span><ArrowRight size={18} /></Link>
          <Link to="/studio/new/project"><FolderKanban size={20} /><span><strong>Project</strong><small>Document process and results</small></span><ArrowRight size={18} /></Link>
        </div>
      </section>

      <section className="studio-library">
        <div className="studio-library-heading">
          <div><p className="eyebrow">Your content</p><h2>All work</h2></div>
          <div className="mini-filter">
            {(['all', 'presentation', 'note', 'project'] as const).map((value) => <button key={value} type="button" className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'All' : itemTypeLabel(value)}</button>)}
          </div>
        </div>

        {loading ? <LoadingState /> : visible.length ? (
          <div className="studio-item-list">
            {visible.map((item) => (
              <article key={item.id} className="studio-item">
                <span className={`studio-type-icon type-${item.type}`}>{item.type === 'presentation' ? <Presentation /> : item.type === 'note' ? <FileText /> : <FolderKanban />}</span>
                <div className="studio-item-copy"><div><span className={`status-badge status-${item.status}`}>{item.status}</span><small>{itemTypeLabel(item.type)} · {item.category}</small></div><h3>{item.title}</h3><p>Updated {formatDate(item.updatedAt)}{item.status === 'published' ? ` · ${item.viewCount} views` : ''}</p></div>
                <div className="studio-item-actions">
                  {item.status === 'published' && <Link to={`/item/${item.slug}`} target="_blank" aria-label={`View ${item.title}`}><MonitorPlay size={18} /></Link>}
                  <Link to={`/studio/edit/${item.id}`} className="button button-secondary">Edit</Link>
                  <button type="button" onClick={() => remove(item)} aria-label={`Delete ${item.title}`}><Trash2 size={18} /></button>
                </div>
              </article>
            ))}
          </div>
        ) : <EmptyState title="No work here yet" message="Choose a type above and create your first piece." />}
      </section>
    </div>
  )
}

function makeContent(type: ItemType): ItemContent {
  if (type === 'presentation') return {
    kind: 'presentation',
    slides: [{ id: newId('slide'), layout: 'title', tone: 'sage', eyebrow: 'New presentation', title: 'Add your title', body: 'Add a clear opening sentence here.' }],
  }
  if (type === 'note') return { kind: 'note', body: '## First idea\n\nStart writing here…' }
  return { kind: 'project', body: '## About this project\n\nDescribe the process here…', goals: ['Add the first project goal'], outcome: '' }
}

function makeItem(type: ItemType): ContentItem {
  const time = new Date().toISOString()
  return {
    id: newId(type), type, slug: '', title: '', excerpt: '', category: 'General', tags: [], status: 'draft', featured: false,
    coverImage: '', assets: [], content: makeContent(type), viewCount: 0, createdAt: time, updatedAt: time,
  }
}

export function StudioEditorPage() {
  const session = useStudioSession()
  const { id, type: typeParam } = useParams()
  const navigate = useNavigate()
  const isNew = !id
  const requestedType = (['presentation', 'note', 'project'].includes(typeParam || '') ? typeParam : 'note') as ItemType
  const [item, setItem] = useState<ContentItem>(() => makeItem(requestedType))
  const [loading, setLoading] = useState(Boolean(id))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!session?.authenticated || !id) return
    adminApi.items().then(({ items }) => {
      const found = items.find((candidate) => candidate.id === id)
      if (found) setItem({ ...found, assets: found.assets || [] })
      else setError('This item could not be found.')
    }).catch((reason) => setError(reason.message)).finally(() => setLoading(false))
  }, [id, session])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const update = useCallback((patch: Partial<ContentItem>) => {
    setItem((current) => ({ ...current, ...patch }))
    setDirty(true)
    setSaved(false)
  }, [])

  const save = useCallback(async () => {
    if (!item.title.trim()) { setError('Please add a title before saving.'); return }
    const prepared = { ...item, slug: item.slug || slugify(item.title), updatedAt: new Date().toISOString() }
    setSaving(true)
    setError('')
    try {
      const result = isNew ? await adminApi.create(prepared) : await adminApi.update(prepared)
      setItem(result.item)
      setDirty(false)
      setSaved(true)
      if (isNew) navigate(`/studio/edit/${result.item.id}`, { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The work could not be saved.')
    } finally {
      setSaving(false)
    }
  }, [isNew, item, navigate])

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); save() }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [save])

  if (session === undefined || loading) return <div className="page-shell section-shell"><LoadingState label="Opening the editor…" /></div>
  if (!session?.authenticated) return <Navigate to="/studio/login" state={{ from: location.pathname }} replace />

  return (
    <div className="editor-page page-shell section-shell">
      <header className="editor-header">
        <div><Link to="/studio" className="back-link"><ArrowLeft size={16} />Back to studio</Link><p className="eyebrow">{isNew ? 'Create' : 'Edit'} {itemTypeLabel(item.type).toLowerCase()}</p><h1>{item.title || `Untitled ${itemTypeLabel(item.type).toLowerCase()}`}</h1></div>
        <div className="editor-save-group">
          {saved && <span className="saved-label"><Check size={16} />Saved</span>}
          <select value={item.status} onChange={(event) => update({ status: event.target.value as ItemStatus })} aria-label="Publication status"><option value="draft">Private draft</option><option value="published">Published</option></select>
          <button type="button" className="button button-primary" onClick={save} disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}{saving ? 'Saving…' : 'Save work'}</button>
        </div>
      </header>

      {error && <ErrorNotice message={error} />}

      <section className="editor-basics editor-panel">
        <div className="panel-heading"><div><span>01</span><h2>Details</h2></div><p>This is how the work appears in the public library.</p></div>
        <div className="form-grid">
          <label className="span-2">Title<input value={item.title} onChange={(event) => update({ title: event.target.value, slug: item.slug ? item.slug : slugify(event.target.value) })} placeholder="A clear, useful title" /></label>
          <label>Category<input value={item.category} onChange={(event) => update({ category: event.target.value })} placeholder="e.g. Anatomy" /></label>
          <label>URL slug<input value={item.slug} onChange={(event) => update({ slug: slugify(event.target.value) })} placeholder="created-from-the-title" /></label>
          <label className="span-2">Short description<textarea rows={3} value={item.excerpt} onChange={(event) => update({ excerpt: event.target.value })} placeholder="What will someone learn from this?" maxLength={240} /><small>{item.excerpt.length}/240 characters</small></label>
          <label className="span-2">Tags<input value={item.tags.join(', ')} onChange={(event) => update({ tags: normaliseTags(event.target.value) })} placeholder="Care, Anatomy, Revision" /><small>Separate tags with commas.</small></label>
          <label className="checkbox-label"><input type="checkbox" checked={item.featured} onChange={(event) => update({ featured: event.target.checked })} /><span><strong>Feature on the home page</strong><small>Highlight this work when it is published.</small></span></label>
          <MediaUpload label="Upload cover image" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" onUploaded={(asset) => update({ coverImage: asset.url })} />
          {item.coverImage && <div className="cover-preview"><img src={item.coverImage} alt="Cover preview" /><button type="button" onClick={() => update({ coverImage: '' })}><X size={16} />Remove</button></div>}
        </div>
      </section>

      <section className="editor-panel content-editor-panel">
        <div className="panel-heading"><div><span>02</span><h2>Content</h2></div><p>Build the main body of your {itemTypeLabel(item.type).toLowerCase()}.</p></div>
        {item.content.kind === 'presentation' && <SlideEditor item={item} update={update} />}
        {item.content.kind === 'note' && <MarkdownEditor value={item.content.body} onChange={(body) => update({ content: { kind: 'note', body } })} />}
        {item.content.kind === 'project' && <ProjectEditor item={item} update={update} />}
      </section>

      <section className="editor-panel attachments-editor">
        <div className="panel-heading"><div><span>03</span><h2>Files and media</h2></div><p>Add images, video, audio, PDFs, Office files or other resources for visitors.</p></div>
        <MediaUpload label="Upload a file" onUploaded={(asset) => update({ assets: [...item.assets, asset] })} />
        {item.assets.length > 0 ? (
          <div className="asset-editor-list">{item.assets.map((asset) => <div key={asset.id}><span className={`asset-kind kind-${asset.kind}`}>{asset.kind === 'image' ? <Image /> : asset.kind === 'video' ? <Video /> : <Paperclip />}</span><div><strong>{asset.name}</strong><small>{asset.mimeType}</small></div><a href={asset.url} target="_blank" rel="noreferrer">Open</a><button type="button" onClick={() => update({ assets: item.assets.filter((candidate) => candidate.id !== asset.id) })}><Trash2 size={17} /></button></div>)}</div>
        ) : <p className="inline-empty">No extra files attached yet.</p>}
      </section>

      <footer className="editor-footer"><p>{dirty ? 'You have unsaved changes.' : 'Everything is saved.'}</p><button type="button" className="button button-primary" onClick={save} disabled={saving}><Save size={17} />Save work</button></footer>
    </div>
  )
}

function MediaUpload({ label, accept, onUploaded }: { label: string; accept?: string; onUploaded: (asset: MediaAsset) => void }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const { asset } = await adminApi.upload(file)
      onUploaded(asset)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Upload failed.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  return (
    <div className="media-upload">
      <label className="button button-secondary"><input type="file" accept={accept} onChange={choose} disabled={uploading} />{uploading ? <LoaderCircle className="spin" size={17} /> : <Upload size={17} />}{uploading ? 'Uploading…' : label}</label>
      {error && <small className="field-error">{error}</small>}
    </div>
  )
}

function MarkdownEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [preview, setPreview] = useState(false)
  return (
    <div className="markdown-editor">
      <div className="editor-tabs"><button type="button" className={!preview ? 'is-active' : ''} onClick={() => setPreview(false)}>Write</button><button type="button" className={preview ? 'is-active' : ''} onClick={() => setPreview(true)}>Preview</button><span>Markdown supported</span></div>
      {preview ? <div className="markdown-body editor-markdown-preview"><ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown></div> : <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={20} placeholder="## Add a heading\n\nStart writing…" />}
    </div>
  )
}

function ProjectEditor({ item, update }: { item: ContentItem; update: (patch: Partial<ContentItem>) => void }) {
  if (item.content.kind !== 'project') return null
  const content = item.content
  return (
    <div className="project-editor">
      <MarkdownEditor value={content.body} onChange={(body) => update({ content: { ...content, body } })} />
      <div className="project-fields">
        <label>Project goals<textarea rows={5} value={content.goals.join('\n')} onChange={(event) => update({ content: { ...content, goals: event.target.value.split('\n').filter(Boolean) } })} /><small>One goal per line.</small></label>
        <label>Outcome or reflection<textarea rows={5} value={content.outcome || ''} onChange={(event) => update({ content: { ...content, outcome: event.target.value } })} placeholder="What changed, worked or was learned?" /></label>
      </div>
    </div>
  )
}

const layouts: SlideLayout[] = ['title', 'statement', 'split', 'list', 'quote', 'image']
const tones: SlideTone[] = ['sage', 'ocean', 'clay', 'plum', 'paper']

function SlideEditor({ item, update }: { item: ContentItem; update: (patch: Partial<ContentItem>) => void }) {
  const [selected, setSelected] = useState(0)
  if (item.content.kind !== 'presentation') return null
  const content = item.content
  const slides = content.slides
  const slide = slides[Math.min(selected, slides.length - 1)]

  function replaceSlide(patch: Partial<PresentationSlide>) {
    update({ content: { ...content, slides: slides.map((candidate, index) => index === selected ? { ...candidate, ...patch } : candidate) } })
  }

  function addSlide() {
    const next: PresentationSlide = { id: newId('slide'), layout: 'statement', tone: 'paper', eyebrow: '', title: 'New slide', body: '' }
    update({ content: { ...content, slides: [...slides, next] } })
    setSelected(slides.length)
  }

  function duplicateSlide() {
    const next = { ...slide, id: newId('slide'), title: `${slide.title} copy` }
    const updated = [...slides.slice(0, selected + 1), next, ...slides.slice(selected + 1)]
    update({ content: { ...content, slides: updated } })
    setSelected(selected + 1)
  }

  function removeSlide() {
    if (slides.length === 1) return
    update({ content: { ...content, slides: slides.filter((_, index) => index !== selected) } })
    setSelected(Math.max(0, selected - 1))
  }

  function move(direction: -1 | 1) {
    const target = selected + direction
    if (target < 0 || target >= slides.length) return
    const updated = [...slides]
    ;[updated[selected], updated[target]] = [updated[target], updated[selected]]
    update({ content: { ...content, slides: updated } })
    setSelected(target)
  }

  return (
    <div className="slide-editor">
      <aside className="slide-sidebar">
        <div className="slide-sidebar-heading"><strong>Slides</strong><span>{slides.length}</span></div>
        <div className="slide-sidebar-list">
          {slides.map((entry, index) => <button type="button" key={entry.id} className={selected === index ? 'is-active' : ''} onClick={() => setSelected(index)}><span>{index + 1}</span><div><strong>{entry.title || 'Untitled'}</strong><small>{entry.layout}</small></div></button>)}
        </div>
        <button type="button" className="add-slide-button" onClick={addSlide}><Plus size={17} />Add slide</button>
      </aside>

      <div className="slide-workspace">
        <div className="slide-preview-wrap"><SlideCanvas slide={slide} /></div>
        <div className="slide-toolbar">
          <button type="button" onClick={() => move(-1)} disabled={selected === 0} title="Move slide up"><ChevronUp size={17} /></button>
          <button type="button" onClick={() => move(1)} disabled={selected === slides.length - 1} title="Move slide down"><ChevronDown size={17} /></button>
          <button type="button" onClick={duplicateSlide} title="Duplicate slide"><Copy size={17} /></button>
          <button type="button" onClick={removeSlide} disabled={slides.length === 1} title="Delete slide"><Trash2 size={17} /></button>
        </div>
        <div className="slide-fields form-grid">
          <label>Layout<select value={slide.layout} onChange={(event) => replaceSlide({ layout: event.target.value as SlideLayout })}>{layouts.map((layout) => <option key={layout} value={layout}>{layout[0].toUpperCase() + layout.slice(1)}</option>)}</select></label>
          <label>Colour mood<select value={slide.tone} onChange={(event) => replaceSlide({ tone: event.target.value as SlideTone })}>{tones.map((tone) => <option key={tone} value={tone}>{tone[0].toUpperCase() + tone.slice(1)}</option>)}</select></label>
          <label className="span-2">Small heading<input value={slide.eyebrow || ''} onChange={(event) => replaceSlide({ eyebrow: event.target.value })} placeholder="Optional context" /></label>
          <label className="span-2">Slide title<textarea rows={2} value={slide.title} onChange={(event) => replaceSlide({ title: event.target.value })} /></label>
          <label className="span-2">Body text<textarea rows={4} value={slide.body || ''} onChange={(event) => replaceSlide({ body: event.target.value })} /></label>
          {(slide.layout === 'list' || slide.points?.length) && <label className="span-2">List points<textarea rows={5} value={(slide.points || []).join('\n')} onChange={(event) => replaceSlide({ points: event.target.value.split('\n').filter(Boolean) })} /><small>One point per line.</small></label>}
          <div className="slide-media-field span-2">
            <div><strong>Slide media</strong><small>Add an image, GIF or video. Video controls stay available in presentation mode.</small></div>
            <div>
              <MediaUpload label="Upload image or video" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime" onUploaded={(asset) => replaceSlide(asset.kind === 'video' ? { videoUrl: asset.url, imageUrl: '' } : { imageUrl: asset.url, videoUrl: '' })} />
              {(slide.imageUrl || slide.videoUrl) && <button type="button" className="button button-ghost" onClick={() => replaceSlide({ imageUrl: '', videoUrl: '' })}><X size={16} />Remove media</button>}
            </div>
          </div>
          {(slide.imageUrl || slide.videoUrl) && <><label>Media description<input value={slide.imageAlt || ''} onChange={(event) => replaceSlide({ imageAlt: event.target.value })} placeholder="Describe it for accessibility" /></label><label>Caption<input value={slide.caption || ''} onChange={(event) => replaceSlide({ caption: event.target.value })} /></label></>}
          <label className="span-2">Private speaker notes<textarea rows={4} value={slide.speakerNotes || ''} onChange={(event) => replaceSlide({ speakerNotes: event.target.value })} placeholder="Talking points, reminders or timing…" /><small>Shown only when Notes are opened in the player.</small></label>
        </div>
      </div>
    </div>
  )
}

export function StudioSettingsPage() {
  const session = useStudioSession()
  const { settings, setSettings } = useSite()
  const [draft, setDraft] = useState<SiteSettings>(settings)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => setDraft(settings), [settings])
  if (session === undefined) return <div className="page-shell section-shell"><LoadingState /></div>
  if (!session?.authenticated) return <Navigate to="/studio/login" state={{ from: '/studio/settings' }} replace />

  function field<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) { setDraft((current) => ({ ...current, [key]: value })) }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage('')
    try { const result = await adminApi.settings(draft); setSettings(result.settings); setMessage('Settings saved.') }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Settings could not be saved.') }
    finally { setSaving(false) }
  }

  return (
    <div className="settings-page page-shell section-shell">
      <header className="studio-header"><div><Link to="/studio" className="back-link"><ArrowLeft size={16} />Back to studio</Link><p className="eyebrow"><Settings size={15} />Site settings</p><h1>Make the studio yours</h1><p>Update the words used across the home page and footer.</p></div><StudioNav /></header>
      <form className="editor-panel settings-form" onSubmit={save}>
        <div className="form-grid">
          <label>Site title<input value={draft.siteTitle} onChange={(event) => field('siteTitle', event.target.value)} /></label>
          <label>Your public name<input value={draft.ownerName} onChange={(event) => field('ownerName', event.target.value)} /></label>
          <label className="span-2">Small heading<input value={draft.eyebrow} onChange={(event) => field('eyebrow', event.target.value)} /></label>
          <label className="span-2">Main headline<input value={draft.tagline} onChange={(event) => field('tagline', event.target.value)} /></label>
          <label className="span-2">Introduction<textarea rows={5} value={draft.introduction} onChange={(event) => field('introduction', event.target.value)} /></label>
          <label className="span-2">Training status<input value={draft.trainingLabel} onChange={(event) => field('trainingLabel', event.target.value)} /></label>
          <label className="span-2">Footer note<input value={draft.footerNote} onChange={(event) => field('footerNote', event.target.value)} /></label>
        </div>
        <div className="settings-actions">{message && <span>{message}</span>}<button type="submit" className="button button-primary" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}{saving ? 'Saving…' : 'Save settings'}</button></div>
      </form>
    </div>
  )
}
