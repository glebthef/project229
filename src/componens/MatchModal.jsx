import { useAuth } from '../AuthContext'

const OUTCOME_LABELS = { p1: 'П1', x: 'X', p2: 'П2' }

function generateExtraOdds(match) {
  const { p1, x, p2 } = match.odds
  return [
    {
      group: 'Основное время',
      outcomes: [
        { key: 'p1', label: 'Победа П1', odd: p1 },
        x ? { key: 'x', label: 'Ничья', odd: x } : null,
        { key: 'p2', label: 'Победа П2', odd: p2 },
      ].filter(Boolean),
    },
    p1 && p2 ? {
      group: 'Двойной шанс',
      outcomes: [
        { key: 'p1', label: 'П1 или Ничья', odd: +(p1 * 0.6).toFixed(2) },
        { key: 'x',  label: 'П1 или П2',   odd: +(Math.min(p1, p2) * 0.5).toFixed(2) },
        { key: 'p2', label: 'П2 или Ничья', odd: +(p2 * 0.6).toFixed(2) },
      ],
    } : null,
    {
      group: 'Тотал',
      outcomes: [
        { key: 'p1', label: 'Тотал больше 2.5', odd: +(p2 * 1.1).toFixed(2) },
        { key: 'p2', label: 'Тотал меньше 2.5', odd: +(p1 * 0.9).toFixed(2) },
        { key: 'p1', label: 'Тотал больше 3.5', odd: +(p2 * 1.4).toFixed(2) },
        { key: 'p2', label: 'Тотал меньше 3.5', odd: +(p1 * 0.7).toFixed(2) },
      ],
    },
    {
      group: 'Фора',
      outcomes: [
        { key: 'p1', label: `${match.home} -1`,  odd: +(p1 * 1.5).toFixed(2) },
        { key: 'p2', label: `${match.away} +1`,  odd: +(p2 * 0.8).toFixed(2) },
        { key: 'p1', label: `${match.home} +1`,  odd: +(p1 * 0.7).toFixed(2) },
        { key: 'p2', label: `${match.away} -1`,  odd: +(p2 * 1.5).toFixed(2) },
      ],
    },
  ].filter(Boolean)
}

export default function MatchModal({ match, onClose, onAuthOpen }) {
  const { user, coupon, toggleOdd } = useAuth()

  const handleOddClick = (outcome, odd) => {
    if (!user) { onClose(); onAuthOpen(); return }

    toggleOdd({ ...match, odds: { ...match.odds, [outcome]: odd } }, outcome)
  }

  const isActive = (outcome) => !!coupon[`${match.id}_${outcome}`]

  const extraOdds = generateExtraOdds(match)

  return (
    <div className="match-modal-overlay" onClick={onClose}>
      <div className="match-modal" onClick={e => e.stopPropagation()}>

        {/* Шапка */}
        <div className="match-modal__header">
          <div className="match-modal__teams">
            <div className="match-modal__team">{match.home}</div>
            <div className="match-modal__vs">vs</div>
            <div className="match-modal__team">{match.away}</div>
          </div>
          <div className="match-modal__meta">
            <span className="match-modal__league">{match.league}</span>
            <span className="match-modal__time">{match.time}</span>
          </div>
          <button className="match-modal__close" onClick={onClose}>✕</button>
        </div>

        {/* Трансляция */}
        <div className="match-modal__stream">
          <div className="match-modal__stream-icon">📺</div>
          <div className="match-modal__stream-text">
            <div className="match-modal__stream-title">Прямая трансляция</div>
            <div className="match-modal__stream-sub">Доступна для Premium-пользователей</div>
          </div>
          <button className="match-modal__stream-btn" disabled>Смотреть</button>
        </div>

        {/* Расширенные исходы */}
        <div className="match-modal__body">
          {extraOdds.map(group => (
            <div key={group.group} className="match-modal__group">
              <div className="match-modal__group-title">{group.group}</div>
              <div className="match-modal__group-odds">
                {group.outcomes.map((o, i) => (
                  <button
                    key={i}
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