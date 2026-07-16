import { ArrowRight, BookOpen, FileText, FolderKanban, Presentation, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { unlockAchievement } from '../lib/achievements'
import { formatDateLocalized, itemTypeLabelLocalized } from '../lib/format'
import { useLanguage } from '../lib/i18n'
import type { ContentItem } from '../types'

const icons = { presentation: Presentation, note: FileText, project: FolderKanban }

export function StudyJourneySection({ items }: { items: ContentItem[] }) {
  const { language, text } = useLanguage()
  const recent = [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 3)
  const reflections = items.filter((item) => item.content.kind === 'project' && (item.content.outcome || item.excerpt)).slice(0, 2)
  const topics = [...new Set(items.flatMap((item) => item.tags))].slice(0, 8)
  const presentations = items.filter((item) => item.type === 'presentation').length
  const notes = items.filter((item) => item.type === 'note').length
  const projects = items.filter((item) => item.type === 'project').length

  return (
    <section className="study-journey-section section-shell">
      <div className="section-heading journey-heading">
        <div><p className="eyebrow"><BookOpen size={15} />{text('My study journey', 'Mein Lernweg')}</p><h2>{text('What I have learned and created', 'Was ich bisher gelernt und gemacht habe')}</h2><p>{text('A read-only look at my published nursing-training work. Only I can add or change anything from the private owner studio.', 'Hier zeige ich meine veröffentlichten Arbeiten aus der Pflegeausbildung. Anschauen darf sie jede Person – hinzufügen oder ändern kann nur ich.')}</p></div>
      </div>

      <div className="journey-stats" aria-label={text('Published learning overview', 'Übersicht der veröffentlichten Lerninhalte')}>
        <div><Presentation size={18} /><strong>{presentations}</strong><span>{text('presentations', 'Präsentationen')}</span></div>
        <div><FileText size={18} /><strong>{notes}</strong><span>{text('study notes', 'Lernnotizen')}</span></div>
        <div><FolderKanban size={18} /><strong>{projects}</strong><span>{text('projects', 'Projekte')}</span></div>
        <div><Sparkles size={18} /><strong>{topics.length}</strong><span>{text('topics collected', 'gesammelte Themen')}</span></div>
      </div>

      <div className="journey-grid">
        <article className="journey-latest">
          <div className="journey-card-heading"><div><small>{text('Recently added', 'Zuletzt hinzugefügt')}</small><h3>{text('Latest learning', 'Neueste Lerninhalte')}</h3></div><Link to="/library">{text('View all', 'Alle ansehen')} <ArrowRight size={15} /></Link></div>
          <div className="journey-entry-list">{recent.length ? recent.map((item) => {
            const Icon = icons[item.type]
            return <Link key={item.id} to={`/item/${item.slug}`}><span><Icon size={17} /></span><div><small>{itemTypeLabelLocalized(item.type, false, language)} · {formatDateLocalized(item.updatedAt, false, language)}</small><strong>{item.title}</strong><p>{item.excerpt}</p></div><ArrowRight size={15} /></Link>
          }) : <p className="journey-empty">{text('Published work will appear here.', 'Veröffentlichte Arbeiten erscheinen hier.')}</p>}</div>
        </article>

        <article className="journey-reflections">
          <div className="journey-card-heading"><div><small>{text('Looking back', 'Rückblick')}</small><h3>{text('Reflection highlights', 'Gedanken im Rückblick')}</h3></div><span>✎</span></div>
          {reflections.length ? <div>{reflections.map((item) => {
            const reflection = item.content.kind === 'project' ? item.content.outcome || item.excerpt : item.excerpt
            return <Link key={item.id} to={`/item/${item.slug}`} onClick={() => unlockAchievement('tiny_reflection')}><blockquote>“{reflection}”</blockquote><span>{item.title} <ArrowRight size={14} /></span></Link>
          })}</div> : <p className="journey-empty">{text('Reflection highlights will appear when a published project includes an outcome.', 'Hier erscheinen Rückblicke, sobald ich bei einem veröffentlichten Projekt ein Ergebnis eingetragen habe.')}</p>}
        </article>

        <article className="journey-topics">
          <div className="journey-card-heading"><div><small>{text('Collected along the way', 'Unterwegs gesammelt')}</small><h3>{text('Topics explored', 'Bearbeitete Themen')}</h3></div><span>✦</span></div>
          <div>{topics.length ? topics.map((topic, index) => <span key={topic} className={`topic-chip chip-${index % 4}`}>{topic}</span>) : <span className="topic-chip">{text('First topic coming soon', 'Das erste Thema kommt bald')}</span>}</div>
        </article>
      </div>
    </section>
  )
}
