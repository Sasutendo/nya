import { useEffect, useRef, useState } from 'react'
import { BookOpen, CalendarDays, FileText, FolderKanban, Languages, LockKeyhole, Menu, Moon, Presentation, Sun, X } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSite, useTheme } from '../App'
import { classes } from '../lib/format'
import { EasterEggs } from './EasterEggs'
import { CutePageDecor } from './CutePageDecor'
import { OwnerClock } from './OwnerClock'
import { SecretCharmDock } from './SecretCharmDock'
import { showEasterEgg, unlockEggAchievement } from '../lib/achievements'
import { useLanguage } from '../lib/i18n'

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const { settings } = useSite()
  const { theme, toggleTheme } = useTheme()
  const { language, toggleLanguage, text } = useLanguage()
  const brandTaps = useRef(0)
  const footerTaps = useRef(0)
  const languageTaps = useRef(0)

  function tapBrand() {
    brandTaps.current += 1
    if (brandTaps.current === 5) {
      unlockEggAchievement('nya')
      showEasterEgg('yuuki')
    }
  }

  function tapCopyright() {
    footerTaps.current += 1
    if (footerTaps.current === 3) {
      unlockEggAchievement('code')
      showEasterEgg('code')
    }
  }

  function changeLanguage() {
    toggleLanguage()
    languageTaps.current += 1
    if (languageTaps.current === 5) showEasterEgg('anime')
  }
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
          <Link to="/" className="brand" aria-label={`${settings.siteTitle} home`} onClick={tapBrand}>
            <span className="brand-avatar" aria-hidden="true"><img src={settings.profileImage} alt="" /></span>
            <span className="brand-copy">
              <strong>{settings.siteTitle}</strong>
              <small>by {settings.ownerName}</small>
            </span>
          </Link>

          <div className="header-actions">
            <OwnerClock />
            <button type="button" className="language-toggle" onClick={changeLanguage} aria-label={text('Switch website to German', 'Webseite auf Englisch umstellen')} title={text('Switch to German', 'Zu Englisch wechseln')}>
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
            <span className="footer-mark" aria-hidden="true">N</span>
            <p><strong>{settings.siteTitle}</strong><br />{settings.footerNote}</p>
          </div>
          <button type="button" className="footer-meta footer-code-trigger" onClick={tapCopyright}>© {new Date().getFullYear()} {settings.ownerName} · {text('Public to read, private to edit.', 'Öffentlich zum Lesen, privat zum Bearbeiten.')}</button>
        </div>
        <SecretCharmDock />
      </footer>
      <EasterEggs ownerName={settings.ownerName} />
    </div>
  )
}
