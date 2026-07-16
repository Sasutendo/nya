import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="not-found section-shell">
      <span>404</span>
      <h1>This page wandered off.</h1>
      <p>The work you are looking for may have moved, or it may still be a private draft.</p>
      <Link to="/" className="button button-primary"><ArrowLeft size={17} />Back home</Link>
    </div>
  )
}
