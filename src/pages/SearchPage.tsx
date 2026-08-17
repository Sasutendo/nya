import { useEffect, useMemo, useState } from 'react'
import { BookOpen, ExternalLink, Globe2, NotebookTabs, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { getPublicItems, getPublicWhiteboards } from '../lib/api'
import { EmptyState, LoadingState } from '../components/Feedback'
import { useLanguage } from '../lib/i18n'
import type { ContentItem, WhiteboardBoard } from '../types'

interface WebResult { title: string; url: string; snippet: string }

export function SearchPage() {
  const { text } = useLanguage()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') || '')
  const scope = params.get('scope') === 'web' ? 'web' : 'site'
  const [items, setItems] = useState<ContentItem[]>([])
  const [boards, setBoards] = useState<WhiteboardBoard[]>([])
  const [web, setWeb] = useState<WebResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { Promise.all([getPublicItems(), getPublicWhiteboards()]).then(([content, notebooks]) => { setItems(content); setBoards(notebooks) }).finally(() => setLoading(false)) }, [])
  useEffect(() => {
    const q = params.get('q')?.trim() || ''; setQuery(q)
    if (scope !== 'web' || !q) { setWeb([]); return }
    setLoading(true); fetch(`/api/public/web-search?q=${encodeURIComponent(q)}`).then((response) => response.json()).then((payload: { results?: WebResult[] }) => setWeb(payload.results || [])).finally(() => setLoading(false))
  }, [params, scope])

  const local = useMemo(() => {
    const needle = (params.get('q') || '').trim().toLowerCase(); if (!needle) return []
    const content = items.filter((item) => [item.title, item.excerpt, item.category, ...item.tags].join(' ').toLowerCase().includes(needle)).map((item) => ({ id: item.id, title: item.title, excerpt: item.excerpt, to: `/item/${item.slug}`, kind: item.type }))
    const notebooks = boards.filter((board) => `${board.title} ${board.pages.map((page) => `${page.name} ${page.strokes.map((stroke) => stroke.text || '').join(' ')}`).join(' ')}`.toLowerCase().includes(needle)).map((board) => ({ id: board.id, title: board.title, excerpt: `${board.pages.length} notebook pages`, to: `/notebooks?board=${encodeURIComponent(board.id)}`, kind: 'notebook' }))
    return [...notebooks, ...content]
  }, [boards, items, params])

  function submit(event: React.FormEvent) { event.preventDefault(); const q = query.trim(); setParams(q ? { q, scope } : { scope }) }
  function changeScope(next: 'site' | 'web') { const q = query.trim(); setParams(q ? { q, scope: next } : { scope: next }) }

  const results = scope === 'web' ? web : local
  return <div className="page-shell section-shell search-page"><header className="page-header"><p className="eyebrow"><Search size={15} />{text('Find it quickly', 'Schnell finden')}</p><h1>{text('Search corner', 'Suchecke')}</h1><p>{text('Search Yuuki’s published notes and notebooks, or look something up online without leaving this page.', 'Durchsuche Yuukis veröffentlichte Notizen und Lernhefte oder suche online, ohne diese Seite zu verlassen.')}</p></header><form className="global-search-form" onSubmit={submit}><Search size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text('Search notes, nursing topics, presentations…', 'Notizen, Pflegethemen, Präsentationen suchen…')} autoFocus /><button type="submit">{text('Search', 'Suchen')}</button></form><div className="search-scope"><button type="button" className={scope === 'site' ? 'is-active' : ''} onClick={() => changeScope('site')}><BookOpen size={16} />{text('This website', 'Diese Website')}</button><button type="button" className={scope === 'web' ? 'is-active' : ''} onClick={() => changeScope('web')}><Globe2 size={16} />{text('The internet', 'Internet')}</button></div>{loading ? <LoadingState label={text('Searching…', 'Suche läuft…')} /> : results.length ? <div className="search-results">{scope === 'site' ? local.map((result) => <Link key={result.id} to={result.to} className="search-result"><span>{result.kind === 'notebook' ? <NotebookTabs /> : <BookOpen />}</span><div><small>{result.kind}</small><h2>{result.title}</h2><p>{result.excerpt}</p></div></Link>) : web.map((result) => <a key={result.url} href={result.url} target="_blank" rel="noreferrer" className="search-result"><span><Globe2 /></span><div><small>{new URL(result.url).hostname}</small><h2>{result.title}</h2><p>{result.snippet}</p></div><ExternalLink size={17} /></a>)}</div> : <EmptyState title={query ? text('No results yet', 'Noch keine Ergebnisse') : text('What are you looking for?', 'Wonach suchst du?')} message={query ? text('Try a shorter or more general phrase.', 'Versuche einen kürzeren oder allgemeineren Begriff.') : text('Type something above to search.', 'Gib oben einen Suchbegriff ein.')} />}</div>
}
