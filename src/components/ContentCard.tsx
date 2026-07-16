import { ArrowUpRight, Eye, FileText, FolderKanban, Presentation } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDate, itemTypeLabel, readingTime } from '../lib/format'
import type { ContentItem } from '../types'

const icons = {
  presentation: Presentation,
  note: FileText,
  project: FolderKanban,
}

export function ContentCard({ item, compact = false }: { item: ContentItem; compact?: boolean }) {
  const Icon = icons[item.type]
  return (
    <article className={`content-card type-${item.type}${compact ? ' is-compact' : ''}`}>
      <Link to={`/item/${item.slug}`} className="content-card-link" aria-label={`Open ${item.title}`}>
        <div className="card-visual">
          {item.coverImage ? (
            <img src={item.coverImage} alt="" loading="lazy" />
          ) : (
            <>
              <span className="visual-orbit visual-orbit-one" />
              <span className="visual-orbit visual-orbit-two" />
              <Icon size={compact ? 27 : 38} strokeWidth={1.5} aria-hidden="true" />
            </>
          )}
          <span className="type-pill"><Icon size={13} />{itemTypeLabel(item.type)}</span>
        </div>
        <div className="card-content">
          <div className="card-kicker">
            <span>{item.category}</span>
            <span aria-hidden="true">·</span>
            <span>{readingTime(item)}</span>
          </div>
          <h3>{item.title}</h3>
          {!compact && <p>{item.excerpt}</p>}
          <div className="card-footer">
            <time dateTime={item.publishedAt || item.updatedAt}>{formatDate(item.publishedAt || item.updatedAt)}</time>
            <span className="card-views"><Eye size={13} />{item.viewCount.toLocaleString('en-GB')}</span>
            <span className="read-link">View <ArrowUpRight size={15} aria-hidden="true" /></span>
          </div>
        </div>
      </Link>
    </article>
  )
}
