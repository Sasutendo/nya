import { useEffect, useState } from 'react'
import { BookOpen, FileText, FolderKanban, LockKeyhole, Menu, Moon, Presentation, Sun, X } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSite, useTheme } from '../App'
import { classes } from '../lib/format'

const navigation = [
  { to: '/library', label: 'Library', icon: BookOpen },
  { to: '/presentations', label: 'Presentations', icon: Presentation },
  { to: '/notes', label: 'Notes', icon: FileText },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
]

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const { settings } = useSite()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => setMenuOpen(false), [location.pathname])

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="brand" aria-label={`${settings.siteTitle} home`}>
            <span className="brand-mark" aria-hidden="true">N</span>
            <span className="brand-copy">
              <strong>{settings.siteTitle}</strong>
              <small>by {settings.ownerName}</small>
            </span>
          </Link>

          <div className="header-actions">
            <button type="button" className="icon-button theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              type="button"
              className="icon-button mobile-menu-button"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>

          <nav className={classes('main-navigation', menuOpen && 'is-open')} aria-label="Main navigation">
            {navigation.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => classes('nav-link', isActive && 'is-active')}>
                <Icon size={17} aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
            <NavLink to="/studio" className={({ isActive }) => classes('nav-link studio-nav-link', isActive && 'is-active')}>
              <LockKeyhole size={15} aria-hidden="true" />
              <span>Owner studio</span>
            </NavLink>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <span className="footer-mark" aria-hidden="true">N</span>
            <p><strong>{settings.siteTitle}</strong><br />{settings.footerNote}</p>
          </div>
          <p className="footer-meta">© {new Date().getFullYear()} {settings.ownerName} · Public to read, private to edit.</p>
        </div>
      </footer>
    </div>
  )
}
