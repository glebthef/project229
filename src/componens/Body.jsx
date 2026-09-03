import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, getMatchStatus } from '../AuthContext'
import Coupon from './Coupon'
import MatchModal from './MatchModal'
import { sports, events as localEvents } from '../data.js'
import { getEvents } from '../api'
import { useChat } from '../ChatContext.jsx'

const OUTCOME_LABELS = { p1: 'П1', x: 'X', p2: 'П2' }
const NAV_SPORTS = sports.slice(0, 7)

function normalizeEvent(e) {
  return {
    id: e.id, league: e.league, home: e.home, away: e.away,
    sport_slug: e.sport_slug,
    starts_at: e.starts_at,
    time: e.starts_at ? new Date(e.starts_at).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    }) : '',
    odds: { p1: e.odd_p1 ?? null, x: e.odd_x ?? null, p2: e.odd_p2 ?? null },
    extra: {
      total_value: e.total_value, odd_total_over: e.odd_total_over,
      odd_total_under: e.odd_total_under, handicap_value: e.handicap_value,
      odd_handicap_home: e.odd_handicap_home, odd_handicap_away: e.odd_handicap_away,
    },
    status: e.status, is_active: e.is_active, fromDB: true,
  }
}

function normalizeLocal(e) { return { ...e, fromDB: false, extra: {} } }

// ===== BODY =====
export default function Body({ onAuthOpen }) {
  const { user, coupon, toggleOdd } = useAuth()
  const { toggleChat } = useChat()
  const [activeSport, setActiveSport] = useState('football')
  const [dbEvents, setDbEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState(null)

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
  const selectedInMatch = (matchId) =>
    Object.keys(coupon).filter(k => k.startsWith(`${matchId}_`)).length

  return (
    <div className="body">
      <div className="main-part">
        <div className="left-side">
          <span className="label">События</span>
          <div className="sports-nav">
            {NAV_SPORTS.map(sport => (
              <button key={sport.id}
                className={`sport-item ${activeSport === sport.id ? 'active' : ''}`}
                onClick={() => setActiveSport(sport.id)}
              >{sport.icon} {sport.name}</button>
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
                      <div className="match-card__team"><span className="match-card__team-name">{match.home}</span></div>
                      <div className="match-card__team"><span className="match-card__team-name">{match.away}</span></div>
                      <div className="match-card__time">
                        {getMatchStatus(match) === 'live' && <span className="match-card__live">🔴 LIVE</span>}
                        {getMatchStatus(match) === 'finished' ? 'Завершён' : match.time}
                      </div>
                    </div>
                    <div className="match-card__odds">
                      {['p1','x','p2'].map(outcome => match.odds?.[outcome] ? (
                        <button key={outcome}
                          className={`match-card__odd ${isActive(match.id, outcome) ? 'match-card__odd--active' : ''}`}
                          onClick={() => handleOddClick(match, outcome)}
                          disabled={getMatchStatus(match) !== 'upcoming'}
                        >
                          <span className="match-card__odd-label">{OUTCOME_LABELS[outcome]}</span>
                          <span className="match-card__odd-value">{match.odds[outcome]}</span>
                        </button>
                      ) : null)}
                      <button
                        className={`match-card__odd match-card__odd--more ${selectedInMatch(match.id) > 0 ? 'match-card__odd--has-selected' : ''}`}
                        onClick={() => setSelectedMatch(match)}
                      >
                        <span className="match-card__odd-label">Ещё</span>
                        <span className="match-card__odd-value">
                          {selectedInMatch(match.id) > 0 ? `✓ ${selectedInMatch(match.id)}` : '+ 12'}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          ) : (!loading && <div className="empty-events">Нет событий</div>)}
        </div>

        <div className="right-side">
          <Coupon onAuthOpen={onAuthOpen} onEventsUpdate={loadEvents} events={currentEvents} />
          <a href="#" className="support-btn" onClick={e => { e.preventDefault(); toggleChat() }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </a>
        </div>
      </div>

      {selectedMatch && (
        <MatchModal match={selectedMatch} onClose={() => setSelectedMatch(null)} onAuthOpen={onAuthOpen} />
      )}
    </div>
  )
}