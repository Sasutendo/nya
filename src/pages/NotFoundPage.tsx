import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../lib/i18n'

export function NotFoundPage() {
  const { text } = useLanguage()
  return (
    <div className="not-found section-shell">
      <span>404</span>
      <h1>{text('This page wandered off.', 'Diese Seite ist davongelaufen.')}</h1>
      <p>{text('The work you are looking for may have moved, or it may still be a private draft.', 'Die gesuchte Arbeit wurde vielleicht verschoben oder ist noch ein privater Entwurf.')}</p>
      <Link to="/" className="button button-primary"><ArrowLeft size={17} />{text('Back home', 'Zur Startseite')}</Link>
    </div>
  )
}
