import { useEffect, useState } from 'react'
import { unlockAchievement } from '../lib/achievements'
import { useLanguage } from '../lib/i18n'

type EggKind = 'nya' | 'osu' | 'code' | 'care' | 'sasu' | 'cat' | 'coffee' | 'princess' | 'eepy' | 'anime' | 'yuuki'

const eggs: Record<EggKind, { icon: string; label: string; labelDe: string; messages: string[]; messagesDe: string[]; particles: string[] }> = {
  nya: { icon: '♡', label: 'Secret corner note', labelDe: 'Geheime Eckennotiz', messages: ['Tiny win unlocked — keep going, Yuuki ♡', 'Nya says: one small step still counts. ✦'], messagesDe: ['Kleinen Erfolg freigeschaltet — weiter so, Yuuki ♡', 'Nya sagt: Auch ein kleiner Schritt zählt. ✦'], particles: ['♡', '✦', '+'] },
  osu: { icon: '○', label: 'Hidden combo', labelDe: 'Versteckte Combo', messages: ['100× study combo — accuracy looking adorable.', 'No miss: one more flashcard cleared ✦'], messagesDe: ['100× Lern-Combo — sauber gespielt.', 'Kein Miss: Noch eine Karteikarte geschafft ✦'], particles: ['○', '◌', '✦'] },
  code: { icon: '</>', label: 'Coder brain online', labelDe: 'Coding-Modus an', messages: ['Care heart + coder brain = powerful troubleshooting.', 'Tiny bug fixed. Tiny concept learned. Same satisfying feeling.'], messagesDe: ['Pflegeherz + Coding-Hirn = ziemlich starke Problemlösung.', 'Kleiner Bug gefixt, kleines Thema verstanden. Beides fühlt sich gut an.'], particles: ['{ }', '✦', '01'] },
  care: { icon: '+', label: 'Nursing buff', labelDe: 'Pflege-Buff', messages: ['Gentle hands, sharp mind, kind heart.', 'Rest is part of the care plan too — especially yours.'], messagesDe: ['Sanfte Hände, klarer Kopf, gutes Herz.', 'Ruhe gehört auch in den Pflegeplan — besonders in deinen.'], particles: ['+', '♡', '✦'] },
  sasu: { icon: '☾', label: 'Dark-fantasy study spell', labelDe: 'Dark-Fantasy-Lernzauber', messages: ['Focus spell cast: +10 calm, +10 curiosity.', 'Sasu found a moonlit shortcut back to the notes.'], messagesDe: ['Fokuszauber gewirkt: +10 Ruhe, +10 Neugier.', 'Sasu fand einen Weg im Mondlicht zurück zu den Notizen.'], particles: ['☾', '✧', '✦'] },
  cat: { icon: 'ฅ', label: 'Study cat discovered', labelDe: 'Lernkatze entdeckt', messages: ['The study cat inspected the notes. They are officially cozy.', 'Curiosity is a clinical skill. The cat agrees.'], messagesDe: ['Die Lernkatze hat die Notizen geprüft. Sie sind offiziell gemütlich.', 'Neugier ist eine Pflegekompetenz. Die Katze stimmt zu.'], particles: ['ฅ', '♡', '✦'] },
  coffee: { icon: '☕', label: 'Coffee checkpoint', labelDe: 'Kaffee-Checkpoint', messages: ['Coffee acquired. Remember the water side quest too.', 'Warm drink, calm desk, one manageable task.'], messagesDe: ['Kaffee erhalten. Denk auch an die Wasser-Nebenquest.', 'Warmes Getränk, ruhiger Tisch, eine machbare Aufgabe.'], particles: ['☕', '♡', '✧'] },
  princess: { icon: '♛', label: 'Princess mode', labelDe: 'Prinzessinnenmodus', messages: ['Crown equipped. Please keep the study kingdom cozy.', 'Do not wake the princess — unless there is coffee.'], messagesDe: ['Krone ausgerüstet. Bitte halte das Lernkönigreich gemütlich.', 'Weck die Prinzessin nicht — außer es gibt Kaffee.'], particles: ['♛', '♡', '✦'] },
  eepy: { icon: '☾', label: 'Eepy hours', labelDe: 'Müde Stunden', messages: ['The corner lowered its voice. A soft reset might be due.', 'Eepy mode activated: blankets strongly recommended.'], messagesDe: ['Die Ecke spricht jetzt leiser. Eine sanfte Pause wäre gut.', 'Müdemodus aktiviert: Decken werden sehr empfohlen.'], particles: ['☾', 'z', '✧'] },
  anime: { icon: '✿', label: 'Opening sequence', labelDe: 'Opening-Sequenz', messages: ['Sparkles budget increased by 200%.', 'A dramatic study montage begins now.'], messagesDe: ['Das Glitzerbudget wurde um 200 % erhöht.', 'Eine dramatische Lernmontage beginnt jetzt.'], particles: ['✿', '♡', '✦'] },
  yuuki: { icon: '♡', label: 'Name spell', labelDe: 'Namenszauber', messages: ['The corner knows its creator. Welcome home, Yuuki.', 'Yuuki mode: pink glow and tiny wins enabled.'], messagesDe: ['Die Ecke kennt ihre Erstellerin. Willkommen zuhause, Yuuki.', 'Yuuki-Modus: Rosa Leuchten und kleine Erfolge aktiviert.'], particles: ['Y', '♡', '✦'] },
}

const triggers = Object.keys(eggs) as EggKind[]

export function EasterEggs({ ownerName }: { ownerName: string }) {
  const { language } = useLanguage()
  const [surprise, setSurprise] = useState<{ key: number; kind: EggKind } | null>(null)

  useEffect(() => {
    let sequence: string[] = []
    const classic = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a']
    const reveal = (event?: Event) => {
      const detail = event instanceof CustomEvent ? event.detail as unknown : undefined
      const requested = typeof detail === 'string' ? detail : detail && typeof detail === 'object' && 'kind' in detail ? (detail as { kind?: unknown }).kind : undefined
      const kind = triggers.includes(requested as EggKind) ? requested as EggKind : 'nya'
      setSurprise({ key: Date.now(), kind })
    }
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName || '')) return
      sequence = [...sequence, event.key.toLowerCase()].slice(-classic.length)
      if (sequence.length === classic.length && sequence.every((key, index) => key === classic[index])) {
        sequence = []
        unlockAchievement('classic_code')
        setSurprise({ key: Date.now(), kind: 'princess' })
        return
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('nya:surprise', reveal)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('nya:surprise', reveal)
    }
  }, [])

  useEffect(() => {
    const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', hour12: false }).format(new Date()))
    if (hour > 5) return
    let seen = false
    try { seen = sessionStorage.getItem('nya-eepy-seen') === 'yes' } catch { /* Show once when storage is unavailable. */ }
    if (seen) return
    const timer = window.setTimeout(() => {
      try { sessionStorage.setItem('nya-eepy-seen', 'yes') } catch { /* Visual-only surprise. */ }
      setSurprise({ key: Date.now(), kind: 'eepy' })
    }, 1_400)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!surprise) return
    document.documentElement.dataset.egg = surprise.kind
    const timer = window.setTimeout(() => {
      setSurprise(null)
      if (document.documentElement.dataset.egg === surprise.kind) delete document.documentElement.dataset.egg
    }, 4_200)
    return () => {
      window.clearTimeout(timer)
      if (document.documentElement.dataset.egg === surprise.kind) delete document.documentElement.dataset.egg
    }
  }, [surprise])

  if (!surprise) return null
  const egg = eggs[surprise.kind]
  const messages = language === 'de' ? egg.messagesDe : egg.messages
  const message = messages[surprise.key % messages.length].replace('Yuuki', ownerName)
  const sparkles = Array.from({ length: 12 }, (_, index) => egg.particles[index % egg.particles.length])

  return (
    <div className={`easter-egg-layer egg-${surprise.kind}`} aria-live="polite">
      <div className="easter-sparkles" aria-hidden="true">{sparkles.map((sparkle, index) => <i key={`${surprise.key}-${index}`}>{sparkle}</i>)}</div>
      <div className="easter-toast"><span>{egg.icon}</span><div><small>{language === 'de' ? egg.labelDe : egg.label}</small><strong>{message}</strong></div></div>
    </div>
  )
}
