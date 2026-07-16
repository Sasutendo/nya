import { useEffect, useState } from 'react'

type EggKind = 'nya' | 'osu' | 'code' | 'care' | 'sasu' | 'cat' | 'coffee'

const eggs: Record<EggKind, { icon: string; label: string; messages: string[]; particles: string[] }> = {
  nya: { icon: '♡', label: 'Secret corner note', messages: ['Tiny win unlocked — keep going, Yuuki ♡', 'Nya says: one small step still counts. ✦'], particles: ['♡', '✦', '+'] },
  osu: { icon: '○', label: 'Hidden combo', messages: ['100× study combo — accuracy looking adorable.', 'No miss: one more flashcard cleared ✦'], particles: ['○', '◌', '✦'] },
  code: { icon: '</>', label: 'Coder brain online', messages: ['Care heart + coder brain = powerful troubleshooting.', 'Tiny bug fixed. Tiny concept learned. Same satisfying feeling.'], particles: ['{ }', '✦', '01'] },
  care: { icon: '+', label: 'Nursing buff', messages: ['Gentle hands, sharp mind, kind heart.', 'Rest is part of the care plan too — especially yours.'], particles: ['+', '♡', '✦'] },
  sasu: { icon: '☾', label: 'Dark-fantasy study spell', messages: ['Focus spell cast: +10 calm, +10 curiosity.', 'Sasu found a moonlit shortcut back to the notes.'], particles: ['☾', '✧', '✦'] },
  cat: { icon: 'ฅ', label: 'Study cat discovered', messages: ['The study cat inspected the notes. They are officially cozy.', 'Curiosity is a clinical skill. The cat agrees.'], particles: ['ฅ', '♡', '✦'] },
  coffee: { icon: '☕', label: 'Coffee checkpoint', messages: ['Coffee acquired. Remember the water side quest too.', 'Warm drink, calm desk, one manageable task.'], particles: ['☕', '♡', '✧'] },
}

const triggers = Object.keys(eggs) as EggKind[]

export function EasterEggs({ ownerName }: { ownerName: string }) {
  const [surprise, setSurprise] = useState<{ key: number; kind: EggKind } | null>(null)

  useEffect(() => {
    let typed = ''
    const reveal = (event?: Event) => {
      const requested = event instanceof CustomEvent ? event.detail : undefined
      const kind = triggers.includes(requested as EggKind) ? requested as EggKind : 'nya'
      setSurprise({ key: Date.now(), kind })
    }
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName || '')) return
      typed = `${typed}${event.key.toLowerCase()}`.slice(-8)
      const match = triggers.find((trigger) => typed.endsWith(trigger))
      if (match) { typed = ''; setSurprise({ key: Date.now(), kind: match }) }
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
    const timer = window.setTimeout(() => setSurprise(null), 4_200)
    return () => window.clearTimeout(timer)
  }, [surprise])

  if (!surprise) return null
  const egg = eggs[surprise.kind]
  const message = egg.messages[surprise.key % egg.messages.length].replace('Yuuki', ownerName)
  const sparkles = Array.from({ length: 12 }, (_, index) => egg.particles[index % egg.particles.length])

  return (
    <div className={`easter-egg-layer egg-${surprise.kind}`} aria-live="polite">
      <div className="easter-sparkles" aria-hidden="true">{sparkles.map((sparkle, index) => <i key={`${surprise.key}-${index}`}>{sparkle}</i>)}</div>
      <div className="easter-toast"><span>{egg.icon}</span><div><small>{egg.label}</small><strong>{message}</strong></div></div>
    </div>
  )
}
