import { useAuth } from '../AuthContext'

const OUTCOME_LABELS = { p1: 'П1', x: 'X', p2: 'П2' }

export default function RightPanel({ title, data, onAuthOpen }) {
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
        {Object.keys(grouped).length > 0 ? (
          Object.entries(grouped).map(([league, matches]) => (
            <div key={league} className="league-group">
              <h3 className="league-name">{league}</h3>
              {matches.map(m => (
                <div key={m.id} className="match-row">
                  <div className="match-info">
                    <span className="teams">{m.home} — {m.away}</span>
                    <span className="time">{m.time}</span>
                  </div>
                  <div className="odds">
                    {['p1', 'x', 'p2'].map(outcome => (
                      <button
                        key={outcome}
                        className={`odd ${isActive(m.id, outcome) ? 'odd--active' : ''}`}
                        onClick={() => handleOddClick(m, outcome)}
                      >
                        {OUTCOME_LABELS[outcome]} {m.odds?.[outcome] ?? '-'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className="empty">Нет событий</div>
        )}
      </div>
    </main>
  )
}