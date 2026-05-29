export default function RightPanel({ title, data }) {
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
                    <button className="odd">П1 {m.odds?.p1}</button>
                    <button className="odd">X {m.odds?.x || '-'}</button>
                    <button className="odd">П2 {m.odds?.p2}</button>
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
//next ks   /      роут