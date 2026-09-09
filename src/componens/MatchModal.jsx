import { useAuth, checkConflict, getOutcomeGroup, getMatchStatus } from '../AuthContext'

// How many outcomes the "Ещё" button on a match card actually reveals,
// beyond the p1/x/p2 already shown there — mirrors the hasTotal/hasHandicap
// gating below so the number on the card matches what the modal opens to.
export function getExtraMarketsCount(match) {
  const extra = match.extra || {}
  const isCyber = match.sport_slug === 'cybersport'
  const hasTotal = extra.odd_total_over != null && extra.odd_total_under != null
  const hasHandicap = extra.odd_handicap_home != null && extra.odd_handicap_away != null
  if (isCyber) return hasTotal && hasHandicap ? 4 : 0
  return (hasTotal ? 2 : 0) + (hasHandicap ? 2 : 0)
}

export default function MatchModal({ match, onClose, onAuthOpen }) {
  const { user, coupon, toggleOdd } = useAuth()
  const matchStatus = getMatchStatus(match)
  const bettingClosed = matchStatus !== 'upcoming'

  const isActive = (key) => !!coupon[`${match.id}_${key}`]
  const isConflicting = (key) => {
    const existing = Object.keys(coupon)
      .filter(k => k.startsWith(`${match.id}_`))
      .map(k => k.replace(`${match.id}_`, ''))
    return existing.some(e => e !== key && checkConflict(e, key))
  }
  const handleClick = (key, odd) => {
    if (bettingClosed) return
    if (!user) { onClose(); onAuthOpen(); return }
    toggleOdd({ ...match, odds: { ...match.odds, [key]: odd } }, key)
  }
  const extra = match.extra || {}
  const p1 = match.odds?.p1 || 2
  const p2 = match.odds?.p2 || 2
  const totalVal = extra.total_value ?? 2.5
  const handicapVal = extra.handicap_value ?? 1.0
  const isCyber = match.sport_slug === 'cybersport'
  // Demo (non-DB) matches never accept real bets, so they keep illustrative
  // fallback numbers; matches loaded from the DB only offer markets the
  // backend actually priced — otherwise the bet would always be rejected
  // server-side with "outcome is not available".
  const hasTotal = extra.odd_total_over != null && extra.odd_total_under != null
  const hasHandicap = extra.odd_handicap_home != null && extra.odd_handicap_away != null
  const groups = [
    { group: 'Основной исход', outcomes: [
      match.odds?.p1 ? { key:'p1', label:`Победа ${match.home}`, odd: match.odds.p1 } : null,
      match.odds?.x  ? { key:'x',  label:'Ничья', odd: match.odds.x } : null,
      match.odds?.p2 ? { key:'p2', label:`Победа ${match.away}`, odd: match.odds.p2 } : null,
    ].filter(Boolean) },
    isCyber && hasTotal && hasHandicap ? { group:'Карты', outcomes: [
      { key:'total_over',    label:'Больше 2.5 карт',          odd: extra.odd_total_over    ?? +((p2)*1.2).toFixed(2) },
      { key:'total_under',   label:'Меньше 2.5 карт',          odd: extra.odd_total_under   ?? +((p1)*0.8).toFixed(2) },
      { key:'handicap_home', label:`${match.home} +1.5 карты`, odd: extra.odd_handicap_home ?? +((p1)*0.75).toFixed(2) },
      { key:'handicap_away', label:`${match.away} +1.5 карты`, odd: extra.odd_handicap_away ?? +((p2)*0.75).toFixed(2) },
    ]} : (!isCyber && hasTotal ? { group:`Тотал (${totalVal})`, outcomes: [
      { key:'total_over',  label:`Больше ${totalVal}`, odd: extra.odd_total_over  ?? +((p2)*1.1).toFixed(2) },
      { key:'total_under', label:`Меньше ${totalVal}`, odd: extra.odd_total_under ?? +((p1)*0.9).toFixed(2) },
    ]} : null),
    !isCyber && hasHandicap ? { group:`Фора (${handicapVal})`, outcomes: [
      { key:'handicap_home', label:`${match.home} (+${handicapVal})`, odd: extra.odd_handicap_home ?? +((p1)*1.3).toFixed(2) },
      { key:'handicap_away', label:`${match.away} (-${handicapVal})`, odd: extra.odd_handicap_away ?? +((p2)*1.3).toFixed(2) },
    ]} : null,
  ].filter(Boolean)
  const selectedCount = groups.flatMap(g => g.outcomes).filter(o => isActive(o.key)).length

  return (
    <div className="match-modal-overlay" onClick={onClose}>
      <div className="match-modal" onClick={e => e.stopPropagation()}>
        <div className="match-modal__header">
          <div className="match-modal__teams">
            <div className="match-modal__team">{match.home}</div>
            <div className="match-modal__vs">vs</div>
            <div className="match-modal__team match-modal__team--right">{match.away}</div>
          </div>
          <div className="match-modal__meta">
            <span className="match-modal__league">{match.league}</span>
            <span className="match-modal__time">{match.time}</span>
            {matchStatus === 'live' && <span className="match-modal__live">🔴 Матч уже идёт</span>}
            {matchStatus === 'finished' && <span className="match-modal__live">Матч завершён</span>}
            {selectedCount > 0 && <span className="match-modal__selected">✓ Выбрано: {selectedCount}</span>}
          </div>
          <button className="match-modal__close" onClick={onClose}>✕</button>
        </div>
       
        {bettingClosed && (
          <div className="match-modal__warn">
            ⚠️ {matchStatus === 'live' ? 'Событие уже началось — ставки закрыты' : 'Событие завершено — ставки закрыты'}
          </div>
        )}
        <div className="match-modal__stream">
          <span className="match-modal__stream-icon">📺</span>
          <div className="match-modal__stream-info">
            <div className="match-modal__stream-title">Прямая трансляция</div>
            <div className="match-modal__stream-sub">Доступна для Premium-пользователей</div>
          </div>
          <button className="match-modal__stream-btn" disabled>Смотреть</button>
        </div>
        <div className="match-modal__hint">💡 Выбирай исходы из разных групп — они объединятся в экспресс</div>
        <div className="match-modal__body">
          {groups.map(g => (
            <div key={g.group} className="match-modal__group">
              <div className="match-modal__group-title">{g.group}</div>
              <div className="match-modal__group-odds">
                {g.outcomes.map(o => {
                  const active = isActive(o.key)
                  const conflicting = !active && isConflicting(o.key)
                  return (
                    <button key={o.key}
                      className={`match-modal__odd ${active ? 'match-modal__odd--active' : ''} ${conflicting ? 'match-modal__odd--conflict' : ''}`}
                      onClick={() => handleClick(o.key, o.odd)}
                      disabled={bettingClosed}
                      title={conflicting ? `Несовместимо с выбранным ${getOutcomeGroup(o.key)}` : ''}
                    >
                      <span className="match-modal__odd-label">
                        {o.label}{conflicting && <span> 🚫</span>}
                      </span>
                      <span className="match-modal__odd-value">{o.odd}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        {selectedCount > 0 && (
          <div className="match-modal__footer">
            <button className="match-modal__add-btn" onClick={onClose}>Добавить в купон ({selectedCount}) →</button>
          </div>
        )}
      </div>
    </div>
  )
}
