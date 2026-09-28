import { useState, useEffect, useMemo } from 'react'
import { useAuth, getMatchStatus } from '../AuthContext'
import { createSingleBet, createExpressBet, getUserBets } from '../api'

const OUTCOME_LABELS = {
  p1: 'П1', x: 'X', p2: 'П2',
  total_over: 'Тотал >',
  total_under: 'Тотал <',
  handicap_home: 'Фора 1',
  handicap_away: 'Фора 2',
}

const QUICK_AMOUNTS = [50, 100, 200, 500]
// Те же лимиты, что и в бэкенде (schemas/bets.py) — проверяем заранее,
// чтобы показать понятную ошибку, а не ответ валидации сервера.
const MIN_STAKE = 10
const MAX_STAKE = 100000

const STATUS_MAP = {
  pending:   { icon: '⏳', label: 'Ожидание', color: '#aaa' },
  won:       { icon: '✅', label: 'Выиграл',  color: '#4caf50' },
  lost:      { icon: '❌', label: 'Проиграл', color: '#e05555' },
  refund:    { icon: '↩️', label: 'Возврат',  color: '#aaa' },
  cancelled: { icon: '🚫', label: 'Отменена', color: '#aaa' },
}

// Поле события, где лежит коэффициент дополнительного рынка.
const EXTRA_ODD_FIELD = {
  total_over: 'odd_total_over',
  total_under: 'odd_total_under',
  handicap_home: 'odd_handicap_home',
  handicap_away: 'odd_handicap_away',
}

function liveOdd(event, outcome) {
  if (!event) return null
  if (outcome in EXTRA_ODD_FIELD) return event.extra?.[EXTRA_ODD_FIELD[outcome]] ?? null
  return event.odds?.[outcome] ?? null
}

export default function Coupon({ onAuthOpen, onEventsUpdate, events = [] }) {
  const {
    user, coupon, stake, setStake,
    removeFromCoupon, clearCoupon,
    betsHistory, setBetsHistory, refreshBalance,
  } = useAuth()

  const [tab, setTab] = useState('coupon')
  const [historyTab, setHistoryTab] = useState('pending')
  const [betType, setBetType] = useState('express')
  const [betLoading, setBetLoading] = useState(false)
  const [betError, setBetError] = useState('')

  const eventsById = useMemo(
    () => Object.fromEntries(events.map(e => [e.id, e])),
    [events]
  )

  // Коэффициент берём из свежих данных события (список обновляется раз в
  // 30 секунд), а не тот, что запомнили при добавлении в купон: если админ
  // поменял линию, пользователь увидит новый коэффициент до ставки.
  const rawItems = Object.values(coupon).map(item => {
    const liveMatch = eventsById[item.match.id]
    const stale = !!liveMatch && getMatchStatus(liveMatch) !== 'upcoming'
    const fresh = liveOdd(liveMatch, item.outcome)
    const oddChanged = fresh != null && Number(fresh) !== Number(item.odd)
    return { ...item, odd: fresh ?? item.odd, oldOdd: oddChanged ? item.odd : null, stale }
  })
  // В экспресс — только исходы разных матчей: исходы одного матча связаны,
  // и перемножать их коэффициенты нельзя. Ординарами — можно.
  const perMatch = rawItems.reduce((acc, i) => ({ ...acc, [i.match.id]: (acc[i.match.id] || 0) + 1 }), {})
  const items = rawItems.map(i => ({
    ...i,
    sameEvent: betType === 'express' && !i.conflict && perMatch[i.match.id] > 1,
  }))
  const conflictItems = items.filter(i => i.conflict)
  const alreadyBetItems = items.filter(i => i.alreadyBet)
  const staleItems = items.filter(i => i.stale)
  const validItems = items.filter(i => !i.conflict && !i.alreadyBet && !i.stale && !i.sameEvent)
  const hasConflicts = conflictItems.length > 0
  const hasAlreadyBet = alreadyBetItems.length > 0
  const hasStale = staleItems.length > 0
  const hasSameEvent = items.some(i => i.sameEvent)
  const hasIssues = hasConflicts || hasAlreadyBet || hasStale || hasSameEvent

  const totalOdd = validItems.reduce((acc, i) => acc * (i.odd || 1), 1)
  const stakeNum = parseFloat(stake) || 0
  const payout = stakeNum > 0 && !hasIssues ? (stakeNum * totalOdd).toFixed(2) : null

  const pendingBets = betsHistory.filter(b => b.status === 'pending')
  const settledBets = betsHistory.filter(b => b.status !== 'pending')

  useEffect(() => {
    if (!user || pendingBets.length === 0) return
    const interval = setInterval(() => syncHistory(false), 15000)
    return () => clearInterval(interval)
  }, [user, pendingBets.length])

  const handleBet = async () => {
    if (!user || validItems.length === 0 || stakeNum <= 0) return
    if (hasIssues) {
      setBetError('Устрани проблемы в купоне перед ставкой')
      return
    }

    const notFromDB = validItems.filter(i => !i.match.fromDB)
    if (notFromDB.length > 0) {
      setBetError('Ставки доступны только на события из БД')
      return
    }
    if (stakeNum < MIN_STAKE) {
      setBetError(`Минимальная ставка — ${MIN_STAKE} ₽`)
      return
    }
    if (stakeNum > MAX_STAKE) {
      setBetError(`Максимальная ставка — ${MAX_STAKE.toLocaleString('ru-RU')} ₽`)
      return
    }

    setBetLoading(true)
    setBetError('')

    try {
      let newBetRecord

      if (betType === 'single') {
        const placedBets = []
        for (const item of validItems) {
          const bet = await createSingleBet(
            user.id, user.secret,
            item.match.id, item.outcome, stakeNum, item.odd,
          )
          const leg = bet.legs?.[0]
          placedBets.push({
            betId: bet.id,
            legId: leg?.id,
            match: item.match,
            outcome: leg?.outcome ?? item.outcome,
            odd: parseFloat(bet.combined_odd),
            status: bet.status,
          })
        }
        const now = new Date().toLocaleString('ru-RU', {
          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        })
        const newBets = placedBets.map(b => ({
          id: Date.now() + Math.random(),
          backendId: b.betId,
          type: 'single',
          items: [b],
          stake: stakeNum,
          totalOdd: b.odd,
          payout: parseFloat((stakeNum * b.odd).toFixed(2)),
          date: now,
          status: 'pending',
        }))
        setBetsHistory(prev => [...newBets, ...prev])

      } else {
      
        const legs = validItems.map(item => ({
          event_id: item.match.id,
          outcome: item.outcome,
          expected_odd: item.odd,
        }))

        const bet = await createExpressBet(user.id, user.secret, legs, stakeNum)

        newBetRecord = {
          id: Date.now(),
          backendId: bet.id,
          type: 'express',
          items: bet.legs.map((leg, i) => ({
            betId: bet.id,
            legId: leg.id,
            match: validItems[i]?.match,
            outcome: leg.outcome,
            odd: parseFloat(leg.odd),
            status: leg.status,
          })),
          stake: stakeNum,
          totalOdd: parseFloat(bet.combined_odd),
          payout: parseFloat(bet.potential_payout),
          date: new Date().toLocaleString('ru-RU', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
          }),
          status: 'pending',
        }
        setBetsHistory(prev => [newBetRecord, ...prev])
      }

      clearCoupon()
      setStake('')
      setTab('history')
      setHistoryTab('pending')
      await refreshBalance()

    } catch (e) {
      console.error('Bet error:', e)
      setBetError(e.message || 'Ошибка при размещении ставки')
      // Чаще всего причина — изменившийся коэффициент или начавшийся матч:
      // подтягиваем свежие события, чтобы купон показал актуальные данные.
      if (onEventsUpdate) onEventsUpdate()
    } finally {
      setBetLoading(false)
    }
  }

  const syncHistory = async (showTab = true) => {
    if (!user) return
    if (showTab) setTab('history')
    try {
      const backendBets = await getUserBets(user.id, user.secret)
      let hasChanges = false

      const updated = betsHistory.map(histBet => {
        const backendBet = backendBets.find(b => b.id === histBet.backendId)
        if (!backendBet) return histBet


        const newItems = histBet.items.map(item => {
          const leg = backendBet.legs?.find(l => l.id === item.legId)
          if (leg && leg.status !== item.status) {
            hasChanges = true
            return { ...item, status: leg.status }
          }
          return item
        })

        if (backendBet.status !== histBet.status) hasChanges = true

        return { ...histBet, items: newItems, status: backendBet.status }
      })

      if (hasChanges) {
        setBetsHistory(updated)
        await refreshBalance()
        if (onEventsUpdate) onEventsUpdate()
      }
    } catch (e) {
      console.error('Sync error:', e)
    }
  }

  const getBetStatusLabel = () => {
    if (betLoading) return 'Размещение...'
    if (hasConflicts) return 'Устрани конфликты'
    if (hasAlreadyBet) return 'Удали повторные ставки'
    if (hasStale) return 'Удали неактуальные события'
    if (hasSameEvent) return 'Экспресс: только разные матчи'
    if (validItems.length === 0) return 'Добавь события'
    if (betType === 'single' && validItems.length > 1)
      return `Заключить ${validItems.length} ординара`
    return 'Заключить'
  }

  return (
    <div className="coupon-sidebar">
      <div className="coupon">


        <div className="coupon__header">
          <div className="coupon__header-tabs">
            <button
              className={`coupon__header-tab ${tab === 'coupon' ? 'coupon__header-tab--active' : ''}`}
              onClick={() => setTab('coupon')}
            >
              Купон
              {items.length > 0 && (
                <span className={`coupon__badge ${hasIssues ? 'coupon__badge--red' : ''}`}>
                  {items.length}
                </span>
              )}
            </button>
            <button
              className={`coupon__header-tab ${tab === 'history' ? 'coupon__header-tab--active' : ''}`}
              onClick={() => syncHistory(true)}
            >
              История
              {pendingBets.length > 0 && (
                <span className="coupon__badge coupon__badge--red">{pendingBets.length}</span>
              )}
            </button>
          </div>
        </div>

        {tab === 'coupon' && (<>

          {items.length > 0 && (
            <div className="coupon__type-tabs">
              <button
                className={`coupon__type-tab ${betType === 'single' ? 'coupon__type-tab--active' : ''}`}
                onClick={() => setBetType('single')}
              >Ординар</button>
              <button
                className={`coupon__type-tab ${betType === 'express' ? 'coupon__type-tab--active' : ''}`}
                onClick={() => setBetType('express')}
              >Экспресс</button>
            </div>
          )}

     
          {items.length > 1 && betType === 'single' && !hasIssues && (
            <div className="coupon__hint">
              💡 Ординар: {validItems.length} ставки по {stakeNum || '...'} ₽ каждая
            </div>
          )}

 
          {hasConflicts && (
            <div className="coupon__conflict-banner">
              ⚠️ Несовместимые пари — удали выделенные красным
            </div>
          )}
          {hasAlreadyBet && (
            <div className="coupon__conflict-banner coupon__conflict-banner--orange">
              🔄 На некоторые исходы ставка уже сделана
            </div>
          )}
          {hasStale && (
            <div className="coupon__conflict-banner coupon__conflict-banner--orange">
              ⏱️ Событие уже началось или завершилось — удали его из купона
            </div>
          )}
          {hasSameEvent && (
            <div className="coupon__conflict-banner coupon__conflict-banner--orange">
              🔗 В экспресс — только исходы разных матчей. Убери лишние или выбери «Ординар»
            </div>
          )}

   
          {items.length === 0 && (
            <div className="coupon__empty">
              <div className="coupon__empty-icon">🎫</div>
              <span className="coupon__empty-text">Выберите событие</span>
              <span className="coupon__empty-sub">
                {user
                  ? 'Нажмите на коэффициент,\nчтобы добавить в купон'
                  : 'Войдите или зарегистрируйтесь,\nчтобы делать ставки'}
              </span>
              {!user && (
                <button className="coupon__auth-btn" onClick={onAuthOpen}>
                  Войти / Регистрация
                </button>
              )}
            </div>
          )}

    
          {items.length > 0 && (
            <div className="coupon__items">
              {items.map(({ match, outcome, odd, oldOdd, conflict, conflictWith, alreadyBet, stale, sameEvent }) => (
                <div
                  key={`${match.id}_${outcome}`}
                  className={`coupon__item ${conflict ? 'coupon__item--conflict' : ''} ${alreadyBet || stale || sameEvent ? 'coupon__item--already-bet' : ''}`}
                >
                  <div className="coupon__item-top">
                    <div className="coupon__item-outcome-row">
                      <span className="coupon__item-sport">⚽</span>
                      <span className="coupon__item-outcome-label">
                        Исход: <strong>{OUTCOME_LABELS[outcome] || outcome}</strong>
                      </span>
                      <span className={`coupon__item-odd ${conflict || alreadyBet || stale || sameEvent ? 'coupon__item-odd--conflict' : ''}`}>
                        {odd}
                      </span>
                    </div>
                    <button className="coupon__item-remove"
                      onClick={() => removeFromCoupon(`${match.id}_${outcome}`)}>✕</button>
                  </div>
                  <div className="coupon__item-match">{match.home} — {match.away}</div>
                  {conflict && (
                    <div className="coupon__item-conflict-msg">
                      ⚠️ Несовместимо с «{OUTCOME_LABELS[conflictWith] || conflictWith}»
                    </div>
                  )}
                  {alreadyBet && (
                    <div className="coupon__item-conflict-msg coupon__item-conflict-msg--orange">
                      🔄 Ставка уже сделана
                    </div>
                  )}
                  {stale && (
                    <div className="coupon__item-conflict-msg coupon__item-conflict-msg--orange">
                      ⏱️ Событие уже началось или завершилось
                    </div>
                  )}
                  {oldOdd != null && !stale && (
                    <div className="coupon__item-conflict-msg coupon__item-conflict-msg--orange">
                      📈 Коэффициент изменился: {oldOdd} → {odd}
                    </div>
                  )}
                  {sameEvent && (
                    <div className="coupon__item-conflict-msg coupon__item-conflict-msg--orange">
                      🔗 Исходы одного матча — только ординаром
                    </div>
                  )}
                </div>
              ))}

              <div className="coupon__bottom-row">
                <button className="coupon__delete-all" onClick={clearCoupon}>
                  🗑 Удалить все...
                </button>
                {!hasIssues && betType === 'express' && (
                  <span className="coupon__total-odd-small">{totalOdd.toFixed(2)}</span>
                )}
              </div>
            </div>
          )}

          {items.length > 0 && (
            <div className="coupon__footer">
              {payout && betType === 'express' && (
                <div className="coupon__payout">
                  <span>Выигрыш</span>
                  <span className="coupon__payout-value">{payout} ₽</span>
                </div>
              )}
              {payout && betType === 'single' && validItems.length > 0 && (
                <div className="coupon__payout">
                  <span>Выигрыш за каждую</span>
                  <span className="coupon__payout-value">
                    {validItems.map(i => (stakeNum * (i.odd || 1)).toFixed(2)).join(' / ')} ₽
                  </span>
                </div>
              )}

              <input
                className="coupon__stake-input coupon__stake-input--full"
                type="number"
                placeholder="Сумма ставки"
                value={stake}
                onChange={e => { setStake(e.target.value); setBetError('') }}
                min="0"
                disabled={hasIssues}
              />

              {betError && <div className="auth-modal__error">{betError}</div>}

              <button
                className={`coupon__bet-btn coupon__bet-btn--full ${hasIssues ? 'coupon__bet-btn--disabled' : ''}`}
                onClick={handleBet}
                disabled={stakeNum <= 0 || betLoading || hasIssues}
              >
                {getBetStatusLabel()}
              </button>

              <div className="coupon__quick-amounts">
                {QUICK_AMOUNTS.map(a => (
                  <button key={a} className="coupon__quick-btn"
                    disabled={hasIssues}
                    onClick={() => { setStake(String(a)); setBetError('') }}
                  >{a} ₽</button>
                ))}
              </div>
            </div>
          )}
        </>)}

 
        {tab === 'history' && (<>
          <div className="coupon__type-tabs">
            <button
              className={`coupon__type-tab ${historyTab === 'pending' ? 'coupon__type-tab--active' : ''}`}
              onClick={() => setHistoryTab('pending')}
            >Нерассчитанные</button>
            <button
              className={`coupon__type-tab ${historyTab === 'settled' ? 'coupon__type-tab--active' : ''}`}
              onClick={() => setHistoryTab('settled')}
            >Рассчитанные</button>
          </div>

          {historyTab === 'pending' && (
            pendingBets.length === 0
              ? <div className="coupon__empty">
                  <div className="coupon__empty-icon">⏱️</div>
                  <span className="coupon__empty-text">Нет нерассчитанных ставок</span>
                </div>
              : <div className="coupon__items">
                  {pendingBets.map(bet => (
                    <div className="coupon__history-item" key={bet.id}>
                      <div className="coupon__history-header">
                        <span className="coupon__history-type">
                          {bet.type === 'express' ? 'Экспресс' : 'Ординар'} · {bet.items.length} соб.
                        </span>
                        <span className="coupon__history-date">{bet.date}</span>
                      </div>
                      {bet.items.map((item, i) => (
                        <div key={i}>
                          <div className="coupon__history-event">
                            <span>Исход: <strong>{OUTCOME_LABELS[item.outcome] || item.outcome}</strong></span>
                            <span className={`coupon__item-odd ${item.status === 'won' ? 'coupon__item-odd--won' : item.status === 'lost' ? 'coupon__item-odd--lost' : ''}`}>
                              {item.status !== 'pending' && (STATUS_MAP[item.status]?.icon + ' ')}
                              {item.odd}
                            </span>
                          </div>
                          <div className="coupon__history-match">
                            {item.match?.home} — {item.match?.away}
                          </div>
                        </div>
                      ))}
                      <div className="coupon__history-footer">
                        <span>Ставка: <strong>{bet.stake} ₽</strong></span>
                        <span>Выигрыш: <strong className="coupon__payout-value">{bet.payout} ₽</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
          )}

          {historyTab === 'settled' && (
            settledBets.length === 0
              ? <div className="coupon__empty">
                  <div className="coupon__empty-icon">📋</div>
                  <span className="coupon__empty-text">Нет рассчитанных ставок</span>
                </div>
              : <div className="coupon__items">
                  {settledBets.map(bet => {
                    const s = STATUS_MAP[bet.status] || STATUS_MAP.pending
                    return (
                      <div className="coupon__history-item" key={bet.id}>
                        <div className="coupon__history-header">
                          <span className="coupon__history-type">
                            {bet.type === 'express' ? 'Экспресс' : 'Ординар'}
                          </span>
                          <span style={{ color: s.color, fontWeight: 600 }}>{s.icon} {s.label}</span>
                        </div>
                        {bet.items.map((item, i) => (
                          <div key={i}>
                            <div className="coupon__history-event">
                              <span>Исход: <strong>{OUTCOME_LABELS[item.outcome] || item.outcome}</strong></span>
                              <span className="coupon__item-odd">{item.odd}</span>
                            </div>
                            <div className="coupon__history-match">
                              {item.match?.home} — {item.match?.away}
                            </div>
                          </div>
                        ))}
                        <div className="coupon__history-footer">
                          <span>Ставка: <strong>{bet.stake} ₽</strong></span>
                          <span style={{ color: s.color, fontWeight: 700 }}>
                            {bet.status === 'won'
                              ? `+${bet.payout} ₽`
                              : bet.status === 'lost' ? `-${bet.stake} ₽` : `↩ ${bet.stake} ₽`}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
          )}
        </>)}

      </div>
    </div>
  )
}
