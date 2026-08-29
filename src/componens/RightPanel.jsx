import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'

const OUTCOME_LABELS = { p1: 'П1', x: 'X', p2: 'П2' }

function MatchModal({ match, onClose, onAuthOpen }) {
  const { user, coupon, toggleOdd } = useAuth()

  const isActive = (outcomeKey) => !!coupon[`${match.id}_${outcomeKey}`]

  const handleOddClick = (outcomeKey, odd) => {
    if (!user) { onClose(); onAuthOpen(); return }
    toggleOdd({ ...match, odds: { [outcomeKey]: odd } }, outcomeKey)
  }

  const { extra } = match
  const p1 = match.odds?.p1 || 2
  const p2 = match.odds?.p2 || 2

  const groups = [
    {
      group: 'Основное время',
      outcomes: [
        match.odds?.p1 ? { key: 'p1', label: 'Победа П1', odd: match.odds.p1 } : null,
        match.odds?.x  ? { key: 'x',  label: 'Ничья',     odd: match.odds.x  } : null,
        match.odds?.p2 ? { key: 'p2', label: 'Победа П2', odd: match.odds.p2 } : null,
      ].filter(Boolean),
    },
    {
      group: `Тотал (${extra?.total_value ?? 2.5})`,
      outcomes: [
        {
          key: 'total_over',
          label: `Тотал больше ${extra?.total_value ?? 2.5}`,
          odd: extra?.odd_total_over ?? +((p2) * 1.1).toFixed(2),
        },
        {
          key: 'total_under',
          label: `Тотал меньше ${extra?.total_value ?? 2.5}`,
          odd: extra?.odd_total_under ?? +((p1) * 0.9).toFixed(2),
        },
      ],
    },
    {
      group: `Фора (${extra?.handicap_value ?? 1.0})`,
      outcomes: [
        {
          key: 'handicap_home',
          label: `${match.home} (+${extra?.handicap_value ?? 1.0})`,
          odd: extra?.odd_handicap_home ?? +((p1) * 1.3).toFixed(2),
        },
        {
          key: 'handicap_away',
          label: `${match.away} (-${extra?.handicap_value ?? 1.0})`,
          odd: extra?.odd_handicap_away ?? +((p2) * 1.3).toFixed(2),
        },
      ],
    },
  ]

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
          </div>
          <button className="match-modal__close" onClick={onClose}>✕</button>
        </div>

        {!match.fromDB && (
          <div className="match-modal__warn">
            ⚠️ Демо-событие. Ставки работают только для событий из БД.
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

        <div className="match-modal__body">
          {groups.map(g => (
            <div key={g.group} className="match-modal__group">
              <div className="match-modal__group-title">{g.group}</div>
              <div className="match-modal__group-odds">
                {g.outcomes.map(o => (
                  <button
                    key={o.key}
                    className={`match-modal__odd ${isActive(o.key) ? 'match-modal__odd--active' : ''}`}
                    onClick={() => handleOddClick(o.key, o.odd)}
                  >
                    <span className="match-modal__odd-label">{o.label}</span>
                    <span className="match-modal__odd-value">{o.odd}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function RightPanel({ title, data, loading, onAuthOpen }) {
  const { user, coupon, toggleOdd } = useAuth()
  const [selectedMatch, setSelectedMatch] = useState(null)

  const handleOddClick = (match, outcome) => {
    if (!user) { onAuthOpen(); return }
    toggleOdd(match, outcome)
  }

  const isActive = (matchId, outcome) => !!coupon[`${matchId}_${outcome}`]

  const grouped = data.reduce((acc, match) => {
    if (!acc[match.league]) acc[match.league] = []
    acc[match.league].push(match)
    return acc
  }, {})

  return (
    <main className="right-panel">
      <div className="sport-header">
        <h1 className="sport-title">{title}</h1>
      </div>
      <div className="events-container">
        {loading && <div className="empty">Загрузка...</div>}

        {!loading && Object.keys(grouped).length > 0 ? (
          Object.entries(grouped).map(([league, matches]) => (
            <div key={league} className="league-group">
              <div className="league-header-row">
                <span className="league-icon">🏆</span>
                <span className="league-title">{league}</span>
              </div>
              {matches.map(m => (
                <div className="match-card" key={m.id}>
                  <div className="match-card__teams">
                    <div className="match-card__team">
                      <span className="match-card__team-name">{m.home}</span>
                    </div>
                    <div className="match-card__team">
                      <span className="match-card__team-name">{m.away}</span>
                    </div>
                    <div className="match-card__time">{m.time}</div>
                  </div>
                  <div className="match-card__odds">
                    {['p1', 'x', 'p2'].map(outcome =>
                      m.odds?.[outcome] ? (
                        <button
                          key={outcome}
                          className={`match-card__odd ${isActive(m.id, outcome) ? 'match-card__odd--active' : ''}`}
                          onClick={() => handleOddClick(m, outcome)}
                        >
                          <span className="match-card__odd-label">{OUTCOME_LABELS[outcome]}</span>
                          <span className="match-card__odd-value">{m.odds[outcome]}</span>
                        </button>
                      ) : null
                    )}
                    <button
                      className="match-card__odd match-card__odd--more"
                      onClick={() => setSelectedMatch(m)}
                    >
                      <span className="match-card__odd-label">Ещё</span>
                      <span className="match-card__odd-value">+ 12</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))
        ) : (
          !loading && <div className="empty">Нет событий</div>
        )}
      </div>

      {selectedMatch && (
        <MatchModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onAuthOpen={onAuthOpen}
        />
      )}
    </main>
  )
}