import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import Coupon from './Coupon'
import { sports, events } from '../data.js'

const OUTCOME_LABELS = { p1: 'П1', x: 'X', p2: 'П2' }
const NAV_SPORTS = sports.slice(0, 7)

export default function Body({ onAuthOpen }) {
  const { user, coupon, toggleOdd } = useAuth()
  const [activeSport, setActiveSport] = useState('football')
  const [isChatOpen, setIsChatOpen] = useState(false)

  const currentEvents = events[activeSport] || []

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

          {Object.keys(grouped).length > 0 ? (
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
                      <button className="match-card__odd match-card__odd--more">
                        <span className="match-card__odd-label">Ещё</span>
                        <span className="match-card__odd-value">+ 200</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div className="empty-events">Нет событий</div>
          )}
        </div>

        <div className="right-side">
          <Coupon onAuthOpen={onAuthOpen} />
          <a href="#" className="support-btn" aria-label="Поддержка"
            onClick={e => { e.preventDefault(); setIsChatOpen(!isChatOpen) }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </a>
        </div>

        {isChatOpen && (
          <div className="chat-up">
            <div className="chat-header">
              <span>Написать в поддержку</span>
              <button className="close-btn" onClick={() => setIsChatOpen(false)}>✕</button>
            </div>
            <div className="chat-body">
              <textarea placeholder="Введите ваше сообщение..." rows="4"></textarea>
              <button className="send-btn">Отправить</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}