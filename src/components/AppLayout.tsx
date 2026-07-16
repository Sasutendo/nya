import { useEffect, useState } from 'react'
import { BookOpen, CalendarDays, FileText, FolderKanban, Languages, LockKeyhole, Menu, Moon, Presentation, Sun, X } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSite, useTheme } from '../App'
import { classes } from '../lib/format'
import { EasterEggs } from './EasterEggs'
import { CutePageDecor } from './CutePageDecor'
import { OwnerClock } from './OwnerClock'
import { unlockAchievement } from '../lib/achievements'
import { useLanguage } from '../lib/i18n'

const footerEggs = ['nya', 'osu', 'code', 'care', 'sasu', 'cat', 'coffee'] as const

function openRandomEasterEgg() {
  unlockAchievement('secret_button')
  const kind = footerEggs[Math.floor(Math.random() * footerEggs.length)]
  window.dispatchEvent(new CustomEvent('nya:surprise', { detail: kind }))
}

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const { settings } = useSite()
  const { theme, toggleTheme } = useTheme()
  const { language, toggleLanguage, text } = useLanguage()
  const navigation = [
    { to: '/library', label: text('Library', 'Bibliothek'), icon: BookOpen },
    { to: '/presentations', label: text('Presentations', 'Präsentationen'), icon: Presentation },
    { to: '/notes', label: text('Notes', 'Notizen'), icon: FileText },
    { to: '/projects', label: text('Projects', 'Projekte'), icon: FolderKanban },
    { to: '/calendar', label: text('Calendar', 'Kalender'), icon: CalendarDays },
  ]

  useEffect(() => setMenuOpen(false), [location.pathname])

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="brand" aria-label={`${settings.siteTitle} home`}>
            <span className="brand-avatar" aria-hidden="true"><img src={settings.profileImage} alt="" /></span>
            <span className="brand-copy">
              <strong>{settings.siteTitle}</strong>
              <small>by {settings.ownerName}</small>
            </span>
          </Link>

          <div className="header-actions">
            <OwnerClock />
            <button type="button" className="language-toggle" onClick={toggleLanguage} aria-label={text('Switch website to German', 'Webseite auf Englisch umstellen')} title={text('Switch to German', 'Zu Englisch wechseln')}>
              <Languages size={16} /><strong>{language.toUpperCase()}</strong><span>{language === 'de' ? 'EN' : 'DE'}</span>
            </button>
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

          <nav className={classes('main-navigation', menuOpen && 'is-open')} aria-label={text('Main navigation', 'Hauptnavigation')}>
            {navigation.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => classes('nav-link', isActive && 'is-active')}>
                <Icon size={17} aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
            <NavLink to="/studio" className={({ isActive }) => classes('nav-link studio-nav-link', isActive && 'is-active')}>
              <LockKeyhole size={15} aria-hidden="true" />
              <span>{text('Owner studio', 'Owner-Studio')}</span>
            </NavLink>
          </nav>
        </div>
      </header>

      <CutePageDecor />

      <main id="main-content">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <button type="button" className="footer-mark easter-trigger" onClick={openRandomEasterEgg} aria-label={text('Open a tiny corner surprise', 'Eine kleine Überraschung öffnen')} title={text('There might be a tiny surprise here', 'Hier könnte eine kleine Überraschung sein')}>N</button>
            <p><strong>{settings.siteTitle}</strong><br />{settings.footerNote}</p>
          </div>
          <p className="footer-meta">© {new Date().getFullYear()} {settings.ownerName} · {text('Public to read, private to edit.', 'Öffentlich zum Lesen, privat zum Bearbeiten.')}</p>
        </div>
      </footer>
      <EasterEggs ownerName={settings.ownerName} />
    </div>
  )
}
