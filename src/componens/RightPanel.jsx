import { useAuth } from '../AuthContext'

const OUTCOME_LABELS = { p1: 'П1', x: 'X', p2: 'П2' }

export default function RightPanel({ title, data, loading, onAuthOpen }) {
  const { user, coupon, toggleOdd } = useAuth()

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
          !loading && <div className="empty">Нет событий</div>
        )}
      </div>
    </main>
  )
}