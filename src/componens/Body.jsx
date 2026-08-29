import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import Coupon from './Coupon'
import { sports, events as localEvents } from '../data.js'
import { getEvents } from '../api'
import { useChat } from '../ChatContext.jsx'

const OUTCOME_LABELS = { p1: 'П1', x: 'X', p2: 'П2' }
const NAV_SPORTS = sports.slice(0, 7)

function normalizeEvent(e) {
  return {
    id: e.id,
    league: e.league,
    home: e.home,
    away: e.away,
    sport_slug: e.sport_slug,
    time: e.starts_at
      ? new Date(e.starts_at).toLocaleString('ru-RU', {
          day: '2-digit', month: '2-digit',
          hour: '2-digit', minute: '2-digit',
        })
      : '',
    odds: { p1: e.odd_p1 ?? null, x: e.odd_x ?? null, p2: e.odd_p2 ?? null },
    extra: {
      total_value: e.total_value,
      odd_total_over: e.odd_total_over,
      odd_total_under: e.odd_total_under,
      handicap_value: e.handicap_value,
      odd_handicap_home: e.odd_handicap_home,
      odd_handicap_away: e.odd_handicap_away,
    },
    status: e.status,
    is_active: e.is_active,
    fromDB: true,
  }
}

// Нормализуем локальные события тоже — даём им fromDB: false
function normalizeLocal(e) {
  return { ...e, fromDB: false }
}

export default function Body({ onAuthOpen }) {
  const { user, coupon, toggleOdd } = useAuth()
  const { toggleChat } = useChat()
  const [activeSport, setActiveSport] = useState('football')
  const [dbEvents, setDbEvents] = useState([])
  const [loading, setLoading] = useState(false)

  const loadEvents = useCallback(() => {
    setLoading(true)
    getEvents(activeSport)
      .then(data => setDbEvents(data.map(normalizeEvent)))
      .catch(() => setDbEvents([]))
      .finally(() => setLoading(false))
  }, [activeSport])

  useEffect(() => { loadEvents() }, [loadEvents])

  useEffect(() => {
    const interval = setInterval(loadEvents, 30000)
    return () => clearInterval(interval)
  }, [loadEvents])

  const currentEvents = dbEvents.length > 0
    ? dbEvents.filter(e => e.is_active)
    : (localEvents[activeSport] || []).map(normalizeLocal)

  const grouped = currentEvents.reduce((acc, match) => {
    if (!acc[match.league]) acc[match.league] = []
    acc[match.league].push(match)
    return acc
  }, {})

  const handleOddClick = (match, outcome) => {
    if (!user) { onAuthOpen(); return }
    toggleOdd(match, outcome)
  }

  const isActive = (matchId, outcome) => !!coupon[`${matchId}_${outcome}`]

  return (
    <div className="body">
      <div className="main-part">
        <div className="left-side">
          <span className="label">События</span>
          <div className="sports-nav">
            {NAV_SPORTS.map(sport => (
              <button
                key={sport.id}
                className={`sport-item ${activeSport === sport.id ? 'active' : ''}`}
                onClick={() => setActiveSport(sport.id)}
              >
                {sport.icon} {sport.name}
              </button>
            ))}
            <Link to="/all-sports" className="show-all-btn">Показать все →</Link>
          </div>

          {loading && <div className="empty-events">Загрузка...</div>}

          {!loading && Object.keys(grouped).length > 0 ? (
            Object.entries(grouped).map(([league, matches]) => (
              <div key={league} className="league-section">
                <div className="league-header-row">
                  <span className="league-icon">🏆</span>
                  <span className="league-title">{league}</span>
                </div>
                {matches.map(match => (
                  <div className="match-card" key={match.id}>
                    <div className="match-card__teams">
                      <div className="match-card__team">
                        <span className="match-card__team-name">{match.home}</span>
                      </div>
                      <div className="match-card__team">
                        <span className="match-card__team-name">{match.away}</span>
                      </div>
                      <div className="match-card__time">{match.time}</div>
                    </div>
                    <div className="match-card__odds">
                      {['p1', 'x', 'p2'].map(outcome =>
                        match.odds?.[outcome] ? (
                          <button
                            key={outcome}
                            className={`match-card__odd ${isActive(match.id, outcome) ? 'match-card__odd--active' : ''}`}
                            onClick={() => handleOddClick(match, outcome)}
                          >
                            <span className="match-card__odd-label">{OUTCOME_LABELS[outcome]}</span>
                            <span className="match-card__odd-value">{match.odds[outcome]}</span>
                          </button>
                        ) : null
                      )}
                      <button
                        className="match-card__odd match-card__odd--more"
                        onClick={() => {
                          // открыть модалку — передаём через state
                          document.dispatchEvent(new CustomEvent('openMatchModal', { detail: match }))
                        }}
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
            !loading && <div className="empty-events">Нет событий</div>
          )}
        </div>

        <div className="right-side">
          <Coupon onAuthOpen={onAuthOpen} onEventsUpdate={loadEvents} />
          <a href="#" className="support-btn" aria-label="Поддержка"
            onClick={e => { e.preventDefault(); toggleChat() }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </a>
        </div>
      </div>

      <MatchModalGlobal onAuthOpen={onAuthOpen} />
    </div>
  )
}

// Глобальная модалка — слушает событие openMatchModal
function MatchModalGlobal({ onAuthOpen }) {
  const [match, setMatch] = useState(null)
  useEffect(() => {
    const handler = (e) => setMatch(e.detail)
    document.addEventListener('openMatchModal', handler)
    return () => document.removeEventListener('openMatchModal', handler)
  }, [])
  if (!match) return null
  return <MatchModal match={match} onClose={() => setMatch(null)} onAuthOpen={onAuthOpen} />
}

function MatchModal({ match, onClose, onAuthOpen }) {
  const { user, coupon, toggleOdd } = useAuth()

  // Уникальный ключ для каждого исхода включает тип исхода
  const isActive = (outcomeKey) => !!coupon[`${match.id}_${outcomeKey}`]

  const handleOddClick = (outcomeKey, odd) => {
    if (!user) { onClose(); onAuthOpen(); return }
    // Передаём матч с нужным коэффициентом и уникальным outcomeKey
    const syntheticMatch = {
      ...match,
      odds: { [outcomeKey]: odd },
    }
    toggleOdd(syntheticMatch, outcomeKey)
  }

  const { extra } = match
  const p1 = match.odds.p1 || 2
  const p2 = match.odds.p2 || 2

  const groups = [
    {
      group: 'Основное время',
      outcomes: [
        match.odds.p1 ? { key: 'p1', label: 'Победа П1', odd: match.odds.p1 } : null,
        match.odds.x  ? { key: 'x',  label: 'Ничья',     odd: match.odds.x  } : null,
        match.odds.p2 ? { key: 'p2', label: 'Победа П2', odd: match.odds.p2 } : null,
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
          label: `${match.home} (${extra?.handicap_value > 0 ? '+' : ''}${extra?.handicap_value ?? 1.0})`,
          odd: extra?.odd_handicap_home ?? +((p1) * 1.3).toFixed(2),
        },
        {
          key: 'handicap_away',
          label: `${match.away} (${(-(extra?.handicap_value ?? 1.0)) > 0 ? '+' : ''}${-(extra?.handicap_value ?? 1.0)})`,
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
            ⚠️ Это демо-событие. Ставки сохраняются только для событий из БД.
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