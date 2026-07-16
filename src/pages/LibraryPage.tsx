import { useEffect, useMemo, useState } from 'react'
import { BookOpen, FileText, FolderKanban, Presentation, Search, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { ContentCard } from '../components/ContentCard'
import { EmptyState, LoadingState } from '../components/Feedback'
import { getPublicItems } from '../lib/api'
import { itemTypeLabel } from '../lib/format'
import type { ContentItem, ItemType } from '../types'

const typeOptions: Array<{ value: ItemType | 'all'; label: string; icon: typeof BookOpen }> = [
  { value: 'all', label: 'Everything', icon: BookOpen },
  { value: 'presentation', label: 'Presentations', icon: Presentation },
  { value: 'note', label: 'Notes', icon: FileText },
  { value: 'project', label: 'Projects', icon: FolderKanban },
]

export function LibraryPage({ fixedType }: { fixedType?: ItemType }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const activeType = fixedType || (searchParams.get('type') as ItemType | null) || 'all'
  const category = searchParams.get('category') || 'all'

  useEffect(() => {
    setLoading(true)
    getPublicItems().then((result) => {
      setItems(result)
      setLoading(false)
    })
  }, [])

  useEffect(() => setQuery(searchParams.get('q') || ''), [searchParams])

  const categories = useMemo(() => [...new Set(items.map((item) => item.category))].sort(), [items])
  const visible = useMemo(() => items.filter((item) => {
    const matchesType = activeType === 'all' || item.type === activeType
    const matchesCategory = category === 'all' || item.category === category
    const search = query.trim().toLowerCase()
    const matchesSearch = !search || [item.title, item.excerpt, item.category, ...item.tags].join(' ').toLowerCase().includes(search)
    return matchesType && matchesCategory && matchesSearch
  }), [activeType, category, items, query])

  const title = fixedType ? itemTypeLabel(fixedType, true) : 'Learning library'
  const description = fixedType
    ? `Browse every published ${itemTypeLabel(fixedType, true).toLowerCase()} in the studio.`
    : 'Every published presentation, study note and project — organised and searchable.'

  function setParam(key: string, value?: string) {
    const next = new URLSearchParams(searchParams)
    if (!value || value === 'all') next.delete(key)
    else next.set(key, value)
    setSearchParams(next, { replace: true })
  }

  function updateSearch(value: string) {
    setQuery(value)
    window.clearTimeout(Number(document.body.dataset.searchTimer || 0))
    const timer = window.setTimeout(() => setParam('q', value.trim() || undefined), 250)
    document.body.dataset.searchTimer = String(timer)
  }

  return (
    <div className="page-shell section-shell library-page">
      <header className="page-header">
        <p className="eyebrow"><BookOpen size={15} />Explore the archive</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>

      <section className="library-toolbar" aria-label="Library filters">
        <label className="library-search">
          <Search size={19} aria-hidden="true" />
          <span className="sr-only">Search</span>
          <input value={query} onChange={(event) => updateSearch(event.target.value)} placeholder="Search by title, topic or tag…" />
          {query && <button type="button" onClick={() => updateSearch('')} aria-label="Clear search"><X size={17} /></button>}
        </label>

        {!fixedType && (
          <div className="segmented-control" role="group" aria-label="Content type">
            {typeOptions.map(({ value, label, icon: Icon }) => (
              <button
                type="button"
                key={value}
                className={activeType === value ? 'is-active' : ''}
                onClick={() => setParam('type', value)}
              >
                <Icon size={15} />{label}
              </button>
            ))}
          </div>
        )}

        {categories.length > 1 && (
          <div className="category-row" aria-label="Categories">
            <button type="button" className={category === 'all' ? 'is-active' : ''} onClick={() => setParam('category')}>All topics</button>
            {categories.map((value) => (
              <button type="button" key={value} className={category === value ? 'is-active' : ''} onClick={() => setParam('category', value)}>{value}</button>
            ))}
          </div>
        )}
      </section>

      <div className="library-result-bar">
        <p><strong>{visible.length}</strong> {visible.length === 1 ? 'result' : 'results'}</p>
        {(query || category !== 'all' || (!fixedType && activeType !== 'all')) && (
          <button type="button" onClick={() => { setQuery(''); setSearchParams({}) }}>Reset filters</button>
        )}
      </div>

      {loading ? <LoadingState label="Opening the library…" /> : visible.length ? (
        <div className="content-grid library-grid">{visible.map((item) => <ContentCard key={item.id} item={item} />)}</div>
      ) : (
        <EmptyState title="Nothing found" message="Try a different word or reset the filters to see everything." />
      )}
    </div>
  )
}
