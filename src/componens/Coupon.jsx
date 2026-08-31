import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { createBet, getUserBets } from '../api'

const OUTCOME_LABELS = {
  p1: 'П1', x: 'X', p2: 'П2',
  total_over: 'Тотал >',
  total_under: 'Тотал <',
  handicap_home: 'Фора 1',
  handicap_away: 'Фора 2',
}

const QUICK_AMOUNTS = [50, 100, 200, 500]

const STATUS_MAP = {
  pending: { icon: '⏳', label: 'Ожидание', color: '#aaa' },
  won:     { icon: '✅', label: 'Выиграл',  color: '#4caf50' },
  lost:    { icon: '❌', label: 'Проиграл', color: '#e05555' },
}

export default function Coupon({ onAuthOpen, onEventsUpdate }) {
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

  const items = Object.values(coupon)

  // Конфликтующие исходы — те у которых conflict: true
  const conflictItems = items.filter(i => i.conflict)
  const validItems = items.filter(i => !i.conflict)
  const hasConflicts = conflictItems.length > 0

  const totalOdd = validItems.reduce((acc, i) => acc * (i.odd || 1), 1)
  const stakeNum = parseFloat(stake) || 0
  const payout = stakeNum > 0 && !hasConflicts ? (stakeNum * totalOdd).toFixed(2) : null

  const pendingBets = betsHistory.filter(b => b.status === 'pending')
  const settledBets = betsHistory.filter(b => b.status !== 'pending')

  // Автосинхронизация каждые 15 сек если есть нерассчитанные
  useEffect(() => {
    if (!user || pendingBets.length === 0) return
    const interval = setInterval(() => syncHistory(false), 15000)
    return () => clearInterval(interval)
  }, [user, pendingBets.length])

  const handleBet = async () => {
    if (!user || validItems.length === 0 || stakeNum <= 0) return
    if (hasConflicts) {
      setBetError('Удали несовместимые исходы перед ставкой')
      return
    }

    const notFromDB = validItems.filter(i => !i.match.fromDB)
    if (notFromDB.length > 0) {
      setBetError('Некоторые события недоступны — только события из БД')
      return
    }

    setBetLoading(true)
    setBetError('')

    try {
      const placedBets = []
      for (const item of validItems) {
        const bet = await createBet(
          user.id, user.secret,
          item.match.id, item.outcome, stakeNum,
        )
        placedBets.push({ ...item, betId: bet.id, status: bet.status })
      }

      const newBet = {
        id: Date.now(),
        type: betType,
        items: placedBets,
        stake: stakeNum,
        totalOdd: parseFloat(totalOdd.toFixed(2)),
        payout: parseFloat((stakeNum * totalOdd).toFixed(2)),
        date: new Date().toLocaleString('ru-RU', {
          day: '2-digit', month: '2-digit',
          hour: '2-digit', minute: '2-digit',
        }),
        status: 'pending',
      }

      setBetsHistory(prev => [newBet, ...prev])
      clearCoupon()
      setStake('')
      setTab('history')
      setHistoryTab('pending')
      await refreshBalance()
    } catch (e) {
      console.error('Bet error:', e)
      setBetError(e.message || 'Ошибка при размещении ставки')
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
        const newItems = histBet.items.map(item => {
          const b = backendBets.find(bb => bb.id === item.betId)
          if (b && b.status !== item.status) { hasChanges = true; return { ...item, status: b.status } }
          return item
        })
        const statuses = newItems.map(i => i.status)
        let newStatus = histBet.status
        if (statuses.every(s => s === 'won')) newStatus = 'won'
        else if (statuses.every(s => s !== 'pending')) newStatus = 'lost'
        if (newStatus !== histBet.status) hasChanges = true
        return { ...histBet, items: newItems, status: newStatus }
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

  return (
    <div className="coupon-sidebar">
      <div className="coupon">

        {/* Шапка */}
        <div className="coupon__header">
          <div className="coupon__header-tabs">
            <button
              className={`coupon__header-tab ${tab === 'coupon' ? 'coupon__header-tab--active' : ''}`}
              onClick={() => setTab('coupon')}
            >
              Купон
              {items.length > 0 && (
                <span className={`coupon__badge ${hasConflicts ? 'coupon__badge--red' : ''}`}>
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

        {/* ===== КУПОН ===== */}
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

          {/* Предупреждение о конфликтах */}
          {hasConflicts && (
            <div className="coupon__conflict-banner">
              ⚠️ Некоторые пари несовместимы — удали выделенные красным
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
              {items.map(({ match, outcome, odd, conflict, conflictWith }) => (
                <div
                  className={`coupon__item ${conflict ? 'coupon__item--conflict' : ''}`}
                  key={`${match.id}_${outcome}`}
                >
                  <div className="coupon__item-top">
                    <div className="coupon__item-outcome-row">
                      <span className="coupon__item-sport">⚽</span>
                      <span className="coupon__item-outcome-label">
                        Исход: <strong>{OUTCOME_LABELS[outcome] || outcome}</strong>
                      </span>
                      <span className={`coupon__item-odd ${conflict ? 'coupon__item-odd--conflict' : ''}`}>
                        {odd}
                      </span>
                    </div>
                    <button
                      className="coupon__item-remove"
                      onClick={() => removeFromCoupon(`${match.id}_${outcome}`)}
                    >✕</button>
                  </div>
                  <div className="coupon__item-match">{match.home} — {match.away}</div>
                  {conflict && (
                    <div className="coupon__item-conflict-msg">
                      ⚠️ Несовместимо с исходом «{OUTCOME_LABELS[conflictWith] || conflictWith}»
                    </div>
                  )}
                </div>
              ))}

              <div className="coupon__bottom-row">
                <button className="coupon__delete-all" onClick={clearCoupon}>
                  🗑 Удалить все...
                </button>
                {!hasConflicts && (
                  <span className="coupon__total-odd-small">{totalOdd.toFixed(2)}</span>
                )}
              </div>
            </div>
          )}

          {items.length > 0 && (
            <div className="coupon__footer">
              {payout && (
                <div className="coupon__payout">
                  <span>Выигрыш</span>
                  <span className="coupon__payout-value">{payout} ₽</span>
                </div>
              )}

              <input
                className="coupon__stake-input coupon__stake-input--full"
                type="number"
                placeholder="Сумма ставки"
                value={stake}
                onChange={e => { setStake(e.target.value); setBetError('') }}
                min="0"
                disabled={hasConflicts}
              />

              {betError && <div className="auth-modal__error">{betError}</div>}

              <button
                className={`coupon__bet-btn coupon__bet-btn--full ${hasConflicts ? 'coupon__bet-btn--disabled' : ''}`}
                onClick={handleBet}
                disabled={stakeNum <= 0 || betLoading || hasConflicts}
              >
                {betLoading ? 'Размещение...' : hasConflicts ? 'Устрани конфликты' : 'Заключить'}
              </button>

              <div className="coupon__quick-amounts">
                {QUICK_AMOUNTS.map(a => (
                  <button
                    key={a}
                    className="coupon__quick-btn"
                    disabled={hasConflicts}
                    onClick={() => { setStake(String(a)); setBetError('') }}
                  >{a} ₽</button>
                ))}
              </div>
            </div>
          )}
        </>)}

        {/* ===== ИСТОРИЯ ===== */}
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
                            <span className="coupon__item-odd">{item.odd}</span>
                          </div>
                          <div className="coupon__history-match">{item.match.home} — {item.match.away}</div>
                        </div>
                      ))}
                      <div className="coupon__history-footer">
                        <span>Ставка: <strong>{bet.stake} ₽</strong></span>
                        <span>Возможный выигрыш: <strong className="coupon__payout-value">{bet.payout} ₽</strong></span>
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
                            <div className="coupon__history-match">{item.match.home} — {item.match.away}</div>
                          </div>
                        ))}
                        <div className="coupon__history-footer">
                          <span>Ставка: <strong>{bet.stake} ₽</strong></span>
                          <span style={{ color: s.color, fontWeight: 700 }}>
                            {bet.status === 'won' ? `+${bet.payout} ₽` : `-${bet.stake} ₽`}
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