import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Download, Eye, File, Link2, Music2, Play, Printer, Video } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Link, useParams } from 'react-router-dom'
import remarkGfm from 'remark-gfm'
import { ContentCard } from '../components/ContentCard'
import { EmptyState, LoadingState } from '../components/Feedback'
import { SlideCanvas } from '../components/SlideCanvas'
import { getPublicItem, getPublicItems, recordView } from '../lib/api'
import { formatDate, itemTypeLabel, readingTime } from '../lib/format'
import type { ContentItem } from '../types'

export function ItemPage() {
  const { slug = '' } = useParams()
  const [item, setItem] = useState<ContentItem | null | undefined>(undefined)
  const [related, setRelated] = useState<ContentItem[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getPublicItem(slug).then((result) => {
      setItem(result)
      if (result) {
        recordView(slug).then((viewCount) => { if (viewCount !== null) setItem((current) => current ? { ...current, viewCount } : current) })
        getPublicItems({ type: result.type }).then((items) => setRelated(items.filter((candidate) => candidate.id !== result.id).slice(0, 2)))
      }
    })
  }, [slug])

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  if (item === undefined) return <div className="page-shell section-shell"><LoadingState label="Opening this work…" /></div>
  if (!item) return <div className="page-shell section-shell"><EmptyState title="This page is not here" message="It may still be a private draft, or the link may have changed." /></div>

  const previewAssets = item.assets.filter((asset) => ['image', 'video', 'audio'].includes(asset.kind))

  return (
    <article className={`item-page type-${item.type}`}>
      <header className="item-hero section-shell">
        <Link to={`/${item.type === 'presentation' ? 'presentations' : `${item.type}s`}`} className="back-link"><ArrowLeft size={17} />Back to {itemTypeLabel(item.type, true).toLowerCase()}</Link>
        <div className="item-hero-grid">
          <div>
            <p className="eyebrow">{itemTypeLabel(item.type)} · {item.category}</p>
            <h1>{item.title}</h1>
            <p className="item-lead">{item.excerpt}</p>
            <div className="item-meta">
              <span><Clock3 size={15} />{readingTime(item)}</span>
              <span><Eye size={15} />{item.viewCount.toLocaleString('en-GB')} views</span>
              <span>Updated {formatDate(item.updatedAt, true)}</span>
            </div>
            <div className="tag-list">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          </div>
          <div className="item-actions">
            {item.content.kind === 'presentation' && <Link to={`/present/${item.slug}`} className="button button-primary"><Play size={17} fill="currentColor" />Start presentation</Link>}
            <button type="button" className="button button-secondary" onClick={copyLink}><Link2 size={17} />{copied ? 'Link copied' : 'Copy link'}</button>
            <button type="button" className="button button-ghost" onClick={() => window.print()}><Printer size={17} />Print / save PDF</button>
          </div>
        </div>
      </header>

      <div className="item-body section-shell">
        {item.content.kind === 'presentation' && (
          <section className="deck-overview">
            <div className="deck-featured-slide"><SlideCanvas slide={item.content.slides[0]} /></div>
            <div className="slide-index">
              {item.content.slides.map((slide, index) => (
                <Link key={slide.id} to={`/present/${item.slug}?slide=${index + 1}`} className="slide-index-card">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div><strong>{slide.title}</strong><small>{slide.layout} layout</small></div>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
            <Link to={`/present/${item.slug}`} className="button button-primary deck-start-mobile"><Play size={17} fill="currentColor" />Start presentation</Link>
          </section>
        )}

        {item.content.kind === 'note' && (
          <div className="reading-layout">
            <aside className="reading-aside"><span>Study note</span><strong>{readingTime(item)}</strong><p>Use print to keep an offline copy or save this page as a PDF.</p></aside>
            <div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content.body}</ReactMarkdown></div>
          </div>
        )}

        {item.content.kind === 'project' && (
          <div className="project-layout">
            <div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content.body}</ReactMarkdown></div>
            <aside className="project-aside">
              <p className="eyebrow">Project goals</p>
              <ul>{item.content.goals.map((goal) => <li key={goal}><CheckCircle2 size={18} />{goal}</li>)}</ul>
              {item.content.outcome && <div className="outcome-box"><small>Outcome</small><p>{item.content.outcome}</p></div>}
              {item.content.links?.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label}<ArrowRight size={15} /></a>)}
            </aside>
          </div>
        )}

        {item.assets.length > 0 && (
          <section className="attachments-section">
            <div className="section-heading"><div><p className="eyebrow">Resources</p><h2>Files and media</h2></div></div>
            {previewAssets.length > 0 && (
              <div className="media-gallery">
                {previewAssets.map((asset) => (
                  <figure key={`preview-${asset.id}`}>
                    {asset.kind === 'image' && <img src={asset.url} alt={asset.name} loading="lazy" />}
                    {asset.kind === 'video' && <video src={asset.url} controls playsInline preload="metadata" />}
                    {asset.kind === 'audio' && <div className="audio-preview"><Music2 size={23} /><audio src={asset.url} controls preload="metadata" /></div>}
                    <figcaption>{asset.name}</figcaption>
                  </figure>
                ))}
              </div>
            )}
            <div className="attachment-list">
              {item.assets.map((asset) => {
                const Icon = asset.kind === 'video' ? Video : asset.kind === 'audio' ? Music2 : File
                return (
                  <a key={asset.id} href={asset.url} target="_blank" rel="noreferrer" className="attachment-item">
                    <span><Icon size={20} /></span>
                    <div><strong>{asset.name}</strong><small>{asset.mimeType} · {formatBytes(asset.size)}</small></div>
                    <Download size={18} />
                  </a>
                )
              })}
            </div>
          </section>
        )}
      </div>

      {related.length > 0 && (
        <section className="related-section section-shell">
          <div className="section-heading"><div><p className="eyebrow">Continue exploring</p><h2>Related work</h2></div></div>
          <div className="content-grid related-grid">{related.map((candidate) => <ContentCard key={candidate.id} item={candidate} compact />)}</div>
        </section>
      )}
    </article>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
