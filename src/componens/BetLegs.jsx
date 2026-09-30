
const OUTCOME_LABELS = {
  p1: 'П1', x: 'X', p2: 'П2',
  total_over: 'Тотал больше', total_under: 'Тотал меньше',
  handicap_home: 'Фора 1', handicap_away: 'Фора 2',
}

function signed(n) {
  return `${n >= 0 ? '+' : ''}${n}`
}

function outcomeLabel(leg) {
  const base = OUTCOME_LABELS[leg.outcome] || leg.outcome
  if (leg.line_value == null) return base
  const line = Number(leg.line_value)
  if (leg.outcome === 'handicap_home') return `${base} (${signed(line)})`
  if (leg.outcome === 'handicap_away') return `${base} (${signed(-line)})`
  return `${base} ${line}`
}

function score(event) {
  return event && event.home_score != null ? ` · ${event.home_score}:${event.away_score ?? 0}` : ''
}

function formatStart(iso) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function legState(leg) {
  const event = leg.event
  switch (leg.status) {
    case 'won':
      return { icon: '✅', text: `Выиграл${score(event)}`, tone: 'won' }
    case 'lost':
      return { icon: '❌', text: `Проиграл${score(event)}`, tone: 'lost' }
    case 'refund':
      return {
        icon: '↩️',
        text: event && !event.is_active ? 'Матч отменён — возврат' : `Возврат${score(event)}`,
        tone: 'muted',
      }
    case 'cancelled':
      return { icon: '🚫', text: 'Отменена', tone: 'muted' }
  }
  if (event && event.status !== 'finished' && new Date(event.starts_at) <= new Date()) {
    return { icon: '🔴', text: `Идёт${score(event)}`, tone: 'live' }
  }
  return { icon: '🕒', text: event ? `Начало ${formatStart(event.starts_at)}` : 'Ожидает', tone: 'wait' }
}

export default function BetLegs({ legs }) {
  return (
    <div className="bet-legs">
      {legs.map(leg => {
        const state = legState(leg)
        return (
          <div key={leg.id} className={`bet-leg bet-leg--${state.tone}`}>
            <span className="bet-leg__icon">{state.icon}</span>
            <div className="bet-leg__info">
              <div className="bet-leg__match">
                {leg.event ? `${leg.event.home} — ${leg.event.away}` : `Событие #${leg.event_id}`}
              </div>
              <div className="bet-leg__meta">
                {outcomeLabel(leg)} · <span className="bet-leg__state">{state.text}</span>
              </div>
            </div>
            <span className="bet-leg__odd">{Number(leg.odd).toFixed(2)}</span>
          </div>
        )
      })}
    </div>
  )
}
