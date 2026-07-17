import { useEffect, useMemo, useState } from 'react'
import { LockKeyhole, Sparkles, Trophy } from 'lucide-react'
import { ACHIEVEMENTS, getUnlockedAchievements, resetAchievements, type AchievementId } from '../lib/achievements'
import { useLanguage } from '../lib/i18n'

export function AchievementsSection() {
  const [unlocked, setUnlocked] = useState<AchievementId[]>(() => getUnlockedAchievements())
  const { language, text } = useLanguage()

  useEffect(() => {
    const refresh = () => setUnlocked(getUnlockedAchievements())
    window.addEventListener('nya:achievement', refresh)
    window.addEventListener('nya:achievement-reset', refresh)
    window.addEventListener('storage', refresh)
    return () => { window.removeEventListener('nya:achievement', refresh); window.removeEventListener('nya:achievement-reset', refresh); window.removeEventListener('storage', refresh) }
  }, [])

  const unlockedSet = useMemo(() => new Set(unlocked), [unlocked])
  const progress = Math.round((unlocked.length / ACHIEVEMENTS.length) * 100)

  return (
    <section className="achievements-section section-shell">
      <div className="section-heading achievement-heading">
        <div><p className="eyebrow"><Trophy size={15} />{text('Secret collection', 'Geheime Sammlung')}</p><h2>{text('Corner achievements', 'Erfolge in der Lernecke')}</h2><p>{text('Every visitor has their own collection in this browser. The hints are intentionally a little mysterious.', 'Die Sammlung wird nur in deinem Browser gespeichert. Die Hinweise verraten absichtlich nicht sofort alles.')}</p></div>
        <div className="achievement-progress"><span><strong>{unlocked.length}</strong> / {ACHIEVEMENTS.length} {text('found', 'gefunden')}</span><div><i style={{ width: `${progress}%` }} /></div><button type="button" onClick={resetAchievements}>{text('Reset my collection', 'Meine Sammlung zurücksetzen')}</button></div>
      </div>
      <div className="achievement-grid">
        {ACHIEVEMENTS.map((achievement) => {
          const found = unlockedSet.has(achievement.id)
          return <article key={achievement.id} className={found ? 'is-unlocked' : 'is-locked'}>
            <span>{found ? achievement.icon : <LockKeyhole size={17} />}</span>
            <div><small>{found ? text('Achievement found', 'Erfolg gefunden') : text('Still hidden', 'Noch versteckt')}</small><strong>{found ? (language === 'de' ? achievement.titleDe : achievement.title) : text('Locked achievement', 'Noch gesperrt')}</strong><p>{found ? text('This secret now belongs in your collection ♡', 'Dieses Geheimnis gehört jetzt zu deiner Sammlung ♡') : (language === 'de' ? achievement.hintDe : achievement.hint)}</p></div>
            {found && <Sparkles size={15} />}
          </article>
        })}
      </div>
    </section>
  )
}
