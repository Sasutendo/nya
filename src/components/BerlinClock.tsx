import { useEffect, useMemo, useState } from 'react'
import { Clock3, MapPin } from 'lucide-react'

export function BerlinClock({ detailed = false }: { detailed?: boolean }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  const time = useMemo(() => new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', second: detailed ? '2-digit' : undefined,
    hour12: false, timeZoneName: 'short',
  }).format(now), [detailed, now])
  const date = useMemo(() => new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin', weekday: 'short', day: 'numeric', month: 'short',
  }).format(now), [now])

  return (
    <div className={`berlin-clock${detailed ? ' is-detailed' : ''}`} aria-label={`Current time in Berlin: ${time}`}>
      <span>{detailed ? <MapPin size={15} /> : <Clock3 size={15} />}</span>
      <div><strong>{time}</strong>{detailed && <small>{date} · Berlin</small>}</div>
    </div>
  )
}
