import { useEffect, useState } from 'react'

const sparkles = ['♡', '✦', '+', '♡', '✧', '+', '♡', '✦', '♡', '+', '✧', '♡']

export function EasterEggs({ ownerName }: { ownerName: string }) {
  const [surprise, setSurprise] = useState(0)

  useEffect(() => {
    let typed = ''
    const reveal = () => setSurprise(Date.now())
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName || '')) return
      typed = `${typed}${event.key.toLowerCase()}`.slice(-3)
      if (typed === 'nya') { typed = ''; reveal() }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('nya:surprise', reveal)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('nya:surprise', reveal)
    }
  }, [])

  useEffect(() => {
    if (!surprise) return
    const timer = window.setTimeout(() => setSurprise(0), 4_200)
    return () => window.clearTimeout(timer)
  }, [surprise])

  if (!surprise) return null
  const messages = [
    `Tiny win unlocked — keep going, ${ownerName} ♡`,
    'Care note found: rest is part of learning too.',
    'Nya says: one small step still counts. ✦',
  ]

  return (
    <div className="easter-egg-layer" aria-live="polite">
      <div className="easter-sparkles" aria-hidden="true">{sparkles.map((sparkle, index) => <i key={`${surprise}-${index}`}>{sparkle}</i>)}</div>
      <div className="easter-toast"><span>♡</span><div><small>Secret corner note</small><strong>{messages[surprise % messages.length]}</strong></div></div>
    </div>
  )
}
