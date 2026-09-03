import { useState, useMemo } from 'react'
import { useAuth, getMatchStatus } from '../AuthContext'
import MatchModal, { getExtraMarketsCount } from './MatchModal'

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
                    <div className="match-card__time">
                      {getMatchStatus(m) === 'live' && <span className="match-card__live">🔴 LIVE</span>}
                      {getMatchStatus(m) === 'finished' ? 'Завершён' : m.time}
                    </div>
                  </div>
                  <div className="match-card__odds">
                    {['p1','x','p2'].map(outcome => m.odds?.[outcome] ? (
                      <button key={outcome}
                        className={`match-card__odd ${isActive(m.id, outcome) ? 'match-card__odd--active' : ''}`}
                        onClick={() => handleOddClick(m, outcome)}
                        disabled={getMatchStatus(m) !== 'upcoming'}
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
                        {selectedInMatch(m.id) > 0 ? `✓ ${selectedInMatch(m.id)}` : `+ ${getExtraMarketsCount(m)}`}
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