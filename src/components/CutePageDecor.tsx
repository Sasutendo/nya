import { useLocation } from 'react-router-dom'
import { unlockAchievement } from '../lib/achievements'
import { useLanguage } from '../lib/i18n'

function routeMessage(path: string): { en: string; de: string; doodle: string } {
  if (path.startsWith('/studio')) return { en: 'private cozy zone', de: 'private Wohlfühlzone', doodle: '✎' }
  if (path.startsWith('/calendar')) return { en: 'one day at a time', de: 'Tag für Tag', doodle: '♡' }
  if (path.startsWith('/presentations')) return { en: 'show & tell magic', de: 'Präsentationszauber', doodle: '✦' }
  if (path.startsWith('/notes')) return { en: 'tiny brain treasures', de: 'kleine Wissensschätze', doodle: '☕' }
  if (path.startsWith('/projects')) return { en: 'made with care', de: 'mit Sorgfalt gemacht', doodle: '✧' }
  if (path.startsWith('/library') || path.startsWith('/item')) return { en: 'little archive', de: 'kleines Archiv', doodle: '⌘' }
  return { en: 'welcome home', de: 'willkommen zuhause', doodle: '♡' }
}

export function CutePageDecor() {
  const location = useLocation()
  const { language, text } = useLanguage()
  const detail = routeMessage(location.pathname)

  function findCat() {
    unlockAchievement('study_cat')
    window.dispatchEvent(new CustomEvent('nya:surprise', { detail: 'cat' }))
  }

  return <div className="cute-page-decor" aria-label={text('Decorative corner details', 'Dekorative Details der Ecke')}>
    <span className="page-doodle page-doodle-one" aria-hidden="true">{detail.doodle}</span>
    <span className="page-doodle page-doodle-two" aria-hidden="true">✦</span>
    <span className="page-ribbon" aria-hidden="true">{detail[language]}</span>
    <button type="button" className="corner-cat" onClick={findCat} aria-label={text('A tiny hidden study cat', 'Eine kleine versteckte Lernkatze')} title="pspsps…">ฅ^•ﻌ•^ฅ</button>
  </div>
}
