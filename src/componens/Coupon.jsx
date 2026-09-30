import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth, getMatchStatus } from '../AuthContext'
import { createSingleBet, createExpressBet, getUserBets } from '../api'
import BetLegs from './BetLegs'

const OUTCOME_LABELS = {
  p1: 'П1', x: 'X', p2: 'П2',
  total_over: 'Тотал >',
  total_under: 'Тотал <',
  handicap_home: 'Фора 1',
  handicap_away: 'Фора 2',
}

const QUICK_AMOUNTS = [50, 100, 200, 500]
const MIN_STAKE = 10
const MAX_STAKE = 100000

const STATUS_MAP = {
  pending:   { icon: '⏳', label: 'Ожидание', color: '#aaa' },
  won:       { icon: '✅', label: 'Выиграл',  color: '#4caf50' },
  lost:      { icon: '❌', label: 'Проиграл', color: '#e05555' },
  refund:    { icon: '↩️', label: 'Возврат',  color: '#aaa' },
  cancelled: { icon: '🚫', label: 'Отменена', color: '#aaa' },
}

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

const money = (v) => Number(v).toLocaleString('ru-RU', { maximumFractionDigits: 2 })

const betDate = (bet) => new Date(bet.created_at).toLocaleString('ru-RU', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
})

function betTitle(bet) {
  if (bet.type !== 'express') return 'Ординар'
  const played = bet.legs.filter(l => l.status !== 'pending').length
  const progress = bet.status === 'pending' ? ` · сыграло ${played} из ${bet.legs.length}` : ''
  return `Экспресс · ${bet.legs.length} соб.${progress}`
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

  const rawItems = Object.values(coupon).map(item => {
    const liveMatch = eventsById[item.match.id]
    const stale = !!liveMatch && getMatchStatus(liveMatch) !== 'upcoming'
    const fresh = liveOdd(liveMatch, item.outcome)
    const oddChanged = fresh != null && Number(fresh) !== Number(item.odd)
    return { ...item, odd: fresh ?? item.odd, oldOdd: oddChanged ? item.odd : null, stale }
  })
  const mode = rawItems.length > 1 ? betType : 'single'
  const perMatch = rawItems.reduce((acc, i) => ({ ...acc, [i.match.id]: (acc[i.match.id] || 0) + 1 }), {})
  const items = rawItems.map(i => ({
    ...i,
    sameEvent: mode === 'express' && !i.conflict && perMatch[i.match.id] > 1,
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

  const historySignature = useRef(null)

  const syncHistory = async (showTab = true) => {
    if (!user) return
    if (showTab) setTab('history')
    try {
      const bets = await getUserBets(user.id, user.secret)
      const signature = bets.map(b => `${b.id}:${b.status}:${b.legs.map(l => l.status).join(',')}`).join('|')
      const changed = historySignature.current !== null && historySignature.current !== signature
      historySignature.current = signature
      setBetsHistory(bets)
      if (changed) {
        await refreshBalance()
        if (onEventsUpdate) onEventsUpdate()
      }
    } catch (e) {
      console.error('Sync error:', e)
    }
  }

  useEffect(() => {
    historySignature.current = null
    if (user) syncHistory(false)
  }, [user?.id])

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
      if (mode === 'single') {
        for (const item of validItems) {
          await createSingleBet(
            user.id, user.secret,
            item.match.id, item.outcome, stakeNum, item.odd,
          )
        }
      } else {
        const legs = validItems.map(item => ({
          event_id: item.match.id,
          outcome: item.outcome,
          expected_odd: item.odd,
        }))
        await createExpressBet(user.id, user.secret, legs, stakeNum)
      }

      clearCoupon()
      setStake('')
      setTab('history')
      setHistoryTab('pending')
    } catch (e) {
      console.error('Bet error:', e)
      setBetError(e.message || 'Ошибка при размещении ставки')
      if (onEventsUpdate) onEventsUpdate()
    } finally {
      await syncHistory(false)
      await refreshBalance()
      setBetLoading(false)
    }
  }

  const getBetStatusLabel = () => {
    if (betLoading) return 'Размещение...'
    if (hasConflicts) return 'Устрани конфликты'
    if (hasAlreadyBet) return 'Удали повторные ставки'
    if (hasStale) return 'Удали неактуальные события'
    if (hasSameEvent) return 'Экспресс: только разные матчи'
    if (validItems.length === 0) return 'Добавь события'
    if (mode === 'single' && validItems.length > 1)
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
                className={`coupon__type-tab ${mode === 'single' ? 'coupon__type-tab--active' : ''}`}
                onClick={() => setBetType('single')}
              >Ординар</button>
              <button
                className={`coupon__type-tab ${mode === 'express' ? 'coupon__type-tab--active' : ''}`}
                onClick={() => setBetType('express')}
                disabled={items.length < 2}
                title={items.length < 2 ? 'Экспресс — от двух событий' : undefined}
              >Экспресс</button>
            </div>
          )}

     
          {items.length > 1 && mode === 'single' && !hasIssues && (
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
                {!hasIssues && mode === 'express' && (
                  <span className="coupon__total-odd-small">{totalOdd.toFixed(2)}</span>
                )}
              </div>
            </div>
          )}

          {items.length > 0 && (
            <div className="coupon__footer">
              {payout && mode === 'express' && (
                <div className="coupon__payout">
                  <span>Выигрыш</span>
                  <span className="coupon__payout-value">{payout} ₽</span>
                </div>
              )}
              {payout && mode === 'single' && validItems.length > 0 && (
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
                        <span className="coupon__history-type">{betTitle(bet)}</span>
                        <span className="coupon__history-date">{betDate(bet)}</span>
                      </div>
                      <BetLegs legs={bet.legs} />
                      <div className="coupon__history-footer">
                        <span>Ставка: <strong>{money(bet.amount)} ₽</strong></span>
                        <span>Выигрыш: <strong className="coupon__payout-value">{money(bet.potential_payout)} ₽</strong></span>
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
                          <span className="coupon__history-type">{betTitle(bet)}</span>
                          <span style={{ color: s.color, fontWeight: 600 }}>{s.icon} {s.label}</span>
                        </div>
                        <BetLegs legs={bet.legs} />
                        <div className="coupon__history-footer">
                          <span>Ставка: <strong>{money(bet.amount)} ₽</strong></span>
                          <span style={{ color: s.color, fontWeight: 700 }}>
                            {bet.status === 'won'
                              ? `+${money(bet.actual_payout)} ₽`
                              : bet.status === 'lost' ? `-${money(bet.amount)} ₽` : `↩ ${money(bet.amount)} ₽`}
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
