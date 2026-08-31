import { useState, useMemo } from 'react'
import { useAuth, checkConflict, getOutcomeGroup } from '../AuthContext'

// ===== МОДАЛКА — одинаковая с Body.jsx =====
function MatchModal({ match, onClose, onAuthOpen }) {
  const { user, coupon, toggleOdd } = useAuth()
  const isActive = (key) => !!coupon[`${match.id}_${key}`]
  const isConflicting = (key) => {
    const existing = Object.keys(coupon)
      .filter(k => k.startsWith(`${match.id}_`))
      .map(k => k.replace(`${match.id}_`, ''))
    return existing.some(e => e !== key && checkConflict(e, key))
  }
  const handleClick = (key, odd) => {
    if (!user) { onClose(); onAuthOpen(); return }
    toggleOdd({ ...match, odds: { ...match.odds, [key]: odd } }, key)
  }
  const extra = match.extra || {}
  const p1 = match.odds?.p1 || 2
  const p2 = match.odds?.p2 || 2
  const totalVal = extra.total_value ?? 2.5
  const handicapVal = extra.handicap_value ?? 1.0
  const isCyber = match.sport_slug === 'cybersport'
  const groups = [
    { group: 'Основной исход', outcomes: [
      match.odds?.p1 ? { key:'p1', label:`Победа ${match.home}`, odd: match.odds.p1 } : null,
      match.odds?.x  ? { key:'x',  label:'Ничья', odd: match.odds.x } : null,
      match.odds?.p2 ? { key:'p2', label:`Победа ${match.away}`, odd: match.odds.p2 } : null,
    ].filter(Boolean) },
    isCyber ? { group:'Карты', outcomes: [
      { key:'total_over',    label:'Больше 2.5 карт',          odd: extra.odd_total_over    ?? +((p2)*1.2).toFixed(2) },
      { key:'total_under',   label:'Меньше 2.5 карт',          odd: extra.odd_total_under   ?? +((p1)*0.8).toFixed(2) },
      { key:'handicap_home', label:`${match.home} +1.5 карты`, odd: extra.odd_handicap_home ?? +((p1)*0.75).toFixed(2) },
      { key:'handicap_away', label:`${match.away} +1.5 карты`, odd: extra.odd_handicap_away ?? +((p2)*0.75).toFixed(2) },
    ]} : { group:`Тотал (${totalVal})`, outcomes: [
      { key:'total_over',  label:`Больше ${totalVal}`, odd: extra.odd_total_over  ?? +((p2)*1.1).toFixed(2) },
      { key:'total_under', label:`Меньше ${totalVal}`, odd: extra.odd_total_under ?? +((p1)*0.9).toFixed(2) },
    ]},
    !isCyber ? { group:`Фора (${handicapVal})`, outcomes: [
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
            {selectedCount > 0 && <span className="match-modal__selected">✓ Выбрано: {selectedCount}</span>}
          </div>
          <button className="match-modal__close" onClick={onClose}>✕</button>
        </div>
        {!match.fromDB && <div className="match-modal__warn">⚠️ Демо-событие. Ставки работают только для событий из БД.</div>}
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

// ===== RIGHT PANEL =====
export default function RightPanel({ title, data, loading, onAuthOpen }) {
  const { user, coupon, toggleOdd } = useAuth()
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('time')

  const handleOddClick = (match, outcome) => {
    if (!user) { onAuthOpen(); return }
    toggleOdd(match, outcome)
  }

  const isActive = (matchId, outcome) => !!coupon[`${matchId}_${outcome}`]
  const selectedInMatch = (matchId) =>
    Object.keys(coupon).filter(k => k.startsWith(`${matchId}_`)).length

  const filteredData = useMemo(() => {
    let result = [...data]
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(m =>
        m.home.toLowerCase().includes(q) ||
        m.away.toLowerCase().includes(q) ||
        m.league.toLowerCase().includes(q)
      )
    }
    if (sortBy === 'odds_asc') result.sort((a, b) => (a.odds?.p1 ?? 99) - (b.odds?.p1 ?? 99))
    else if (sortBy === 'odds_desc') result.sort((a, b) => (b.odds?.p1 ?? 0) - (a.odds?.p1 ?? 0))
    return result
  }, [data, search, sortBy])

  const grouped = filteredData.reduce((acc, match) => {
    if (!acc[match.league]) acc[match.league] = []
    acc[match.league].push(match)
    return acc
  }, {})

  return (
    <main className="right-panel">
      <div className="sport-header">
        <h1 className="sport-title">{title}</h1>
      </div>

      <div className="events-toolbar">
        <div className="events-search">
          <span className="events-search__icon">🔍</span>
          <input className="events-search__input" type="text"
            placeholder="Поиск команды или лиги..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="events-search__clear" onClick={() => setSearch('')}>✕</button>}
        </div>
        <div className="events-sort">
          {[
            { key:'time',      label:'По времени' },
            { key:'odds_asc',  label:'Коэф ↑' },
            { key:'odds_desc', label:'Коэф ↓' },
          ].map(s => (
            <button key={s.key}
              className={`events-sort__btn ${sortBy === s.key ? 'events-sort__btn--active' : ''}`}
              onClick={() => setSortBy(s.key)}>{s.label}</button>
          ))}
        </div>
      </div>

      <div className="events-container">
        {loading && <div className="empty">Загрузка...</div>}
        {!loading && search && filteredData.length === 0 && (
          <div className="empty">Ничего не найдено по запросу «{search}»</div>
        )}
        {!loading && Object.keys(grouped).length > 0 ? (
          Object.entries(grouped).map(([league, matches]) => (
            <div key={league} className="league-group">
              <div className="league-header-row">
                <span className="league-icon">🏆</span>
                <span className="league-title">{league}</span>
                <span className="league-count">{matches.length}</span>
              </div>
              {matches.map(m => (
                <div className="match-card" key={m.id}>
                  <div className="match-card__teams">
                    <div className="match-card__team"><span className="match-card__team-name">{m.home}</span></div>
                    <div className="match-card__team"><span className="match-card__team-name">{m.away}</span></div>
                    <div className="match-card__time">{m.time}</div>
                  </div>
                  <div className="match-card__odds">
                    {['p1','x','p2'].map(outcome => m.odds?.[outcome] ? (
                      <button key={outcome}
                        className={`match-card__odd ${isActive(m.id, outcome) ? 'match-card__odd--active' : ''}`}
                        onClick={() => handleOddClick(m, outcome)}
                      >
                        <span className="match-card__odd-label">{{ p1:'П1', x:'X', p2:'П2' }[outcome]}</span>
                        <span className="match-card__odd-value">{m.odds[outcome]}</span>
                      </button>
                    ) : null)}
                    <button
                      className={`match-card__odd match-card__odd--more ${selectedInMatch(m.id) > 0 ? 'match-card__odd--has-selected' : ''}`}
                      onClick={() => setSelectedMatch(m)}
                    >
                      <span className="match-card__odd-label">Ещё</span>
                      <span className="match-card__odd-value">
                        {selectedInMatch(m.id) > 0 ? `✓ ${selectedInMatch(m.id)}` : '+ 12'}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))
        ) : (!loading && !search && <div className="empty">Нет событий</div>)}
      </div>

      {selectedMatch && (
        <MatchModal match={selectedMatch} onClose={() => setSelectedMatch(null)} onAuthOpen={onAuthOpen} />
      )}
    </main>
  )
}