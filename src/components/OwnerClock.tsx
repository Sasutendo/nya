import { useEffect, useMemo, useState } from 'react'
import { Clock3 } from 'lucide-react'
import { useLanguage } from '../lib/i18n'

export function OwnerClock({ detailed = false }: { detailed?: boolean }) {
  const { language, text } = useLanguage()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  const time = useMemo(() => new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin', hour: 'numeric', minute: '2-digit', second: detailed ? '2-digit' : undefined,
    hour12: true,
  }).format(now), [detailed, now])
  const date = useMemo(() => new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-GB', {
    timeZone: 'Europe/Berlin', weekday: 'short', day: 'numeric', month: 'short',
  }).format(now), [language, now])

  return (
    <div className={`owner-clock${detailed ? ' is-detailed' : ''}`} aria-label={`${text("Owner's local time", 'Lokale Zeit der Ownerin')}: ${time}`}>
      <span><Clock3 size={15} /></span>
      <div><strong>{time}</strong>{detailed && <small>{date}</small>}</div>
    </div>
  )
}
