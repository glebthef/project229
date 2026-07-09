import { useState } from 'react'
import { useAuth } from '../AuthContext'

const OUTCOME_LABELS = { p1: 'П1', x: 'X', p2: 'П2' }
const QUICK_AMOUNTS = [50, 100, 200, 500]

export default function Coupon({ onAuthOpen }) {
  const { user, coupon, stake, setStake, removeFromCoupon, clearCoupon, betsHistory, setBetsHistory } = useAuth()
  const [tab, setTab] = useState('coupon') // 'coupon' | 'history'
  const [historyTab, setHistoryTab] = useState('pending') // 'pending' | 'settled'
  const [betType, setBetType] = useState('express') // 'single' | 'express'

  const items = Object.values(coupon)
  const totalOdd = items.reduce((acc, i) => acc * i.odd, 1)
  const stakeNum = parseFloat(stake) || 0
  const payout = stakeNum > 0 ? (stakeNum * totalOdd).toFixed(2) : null

  const handleBet = () => {
    if (!user || items.length === 0 || stakeNum <= 0) return

    const newBet = {
      id: Date.now(),
      type: betType,
      items: items.map(i => ({ ...i })),
      stake: stakeNum,
      totalOdd: parseFloat(totalOdd.toFixed(2)),
      payout: parseFloat((stakeNum * totalOdd).toFixed(2)),
      date: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      status: 'pending',
    }

    setBetsHistory(prev => [newBet, ...prev])
    clearCoupon()
    setStake('')
    setTab('history')
    setHistoryTab('pending')
  }

  const pendingBets = betsHistory.filter(b => b.status === 'pending')
  const settledBets = betsHistory.filter(b => b.status !== 'pending')

  return (
    <div className="coupon-sidebar">
      <div className="coupon">

        {/* Шапка — Купон / История */}
        <div className="coupon__header">
          <div className="coupon__header-tabs">
            <button
              className={`coupon__header-tab ${tab === 'coupon' ? 'coupon__header-tab--active' : ''}`}
              onClick={() => setTab('coupon')}
            >
              Купон
              {items.length > 0 && <span className="coupon__badge">{items.length}</span>}
            </button>
            <button
              className={`coupon__header-tab ${tab === 'history' ? 'coupon__header-tab--active' : ''}`}
              onClick={() => setTab('history')}
            >
              История
              {pendingBets.length > 0 && <span className="coupon__badge coupon__badge--red">{pendingBets.length}</span>}
            </button>
          </div>
        </div>

        {/* ===== ВКЛАДКА КУПОН ===== */}
        {tab === 'coupon' && (<>

          {/* Ординар / Экспресс */}
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

          {/* Пустое состояние */}
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

          {/* Список событий */}
          {items.length > 0 && (
            <div className="coupon__items">
              {items.map(({ match, outcome, odd }) => (
                <div className="coupon__item" key={`${match.id}_${outcome}`}>
                  <div className="coupon__item-top">
                    <div className="coupon__item-outcome-row">
                      <span className="coupon__item-sport">⚽</span>
                      <span className="coupon__item-outcome-label">
                        Исход: <strong>{OUTCOME_LABELS[outcome]}</strong>
                      </span>
                      <span className="coupon__item-odd">{odd}</span>
                    </div>
                    <button
                      className="coupon__item-remove"
                      onClick={() => removeFromCoupon(`${match.id}_${outcome}`)}
                    >✕</button>
                  </div>
                  <div className="coupon__item-match">{match.home} — {match.away}</div>
                </div>
              ))}

              {/* Удалить все + общий коэф */}
              <div className="coupon__bottom-row">
                <button className="coupon__delete-all" onClick={clearCoupon}>
                  🗑 Удалить все...
                </button>
                <span className="coupon__total-odd-small">
                  {totalOdd.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Футер — ввод суммы и ставка */}
          {items.length > 0 && (
            <div className="coupon__footer">

              {/* Выигрыш */}
              {payout && (
                <div className="coupon__payout">
                  <span>Выигрыш</span>
                  <span className="coupon__payout-value">{payout} ₽</span>
                </div>
              )}

              {/* Поле суммы на всю ширину */}
              <input
                className="coupon__stake-input coupon__stake-input--full"
                type="number"
                placeholder="Сумма ставки"
                value={stake}
                onChange={e => setStake(e.target.value)}
                min="0"
              />

              {/* Кнопка заключить на всю ширину */}
              <button
                className="coupon__bet-btn coupon__bet-btn--full"
                onClick={handleBet}
                disabled={stakeNum <= 0}
              >
                Заключить
              </button>

              {/* Быстрые суммы */}
              <div className="coupon__quick-amounts">
                {QUICK_AMOUNTS.map(a => (
                  <button
                    key={a}
                    className="coupon__quick-btn"
                    onClick={() => setStake(String(a))}
                  >{a} ₽</button>
                ))}
              </div>

            </div>
          )}
        </>)}

        {/* ===== ВКЛАДКА ИСТОРИЯ ===== */}
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
            pendingBets.length === 0 ? (
              <div className="coupon__empty">
                <div className="coupon__empty-icon">⏱️</div>
                <span className="coupon__empty-text">Событий пока нет</span>
              </div>
            ) : (
              <div className="coupon__items">
                {pendingBets.map(bet => (
                  <div className="coupon__history-item" key={bet.id}>
                    <div className="coupon__history-header">
                      <span className="coupon__history-type">
                        {bet.type === 'express' ? 'Экспресс' : 'Ординар'} · {bet.items.length} соб.
                      </span>
                      <span className="coupon__history-date">{bet.date}</span>
                    </div>
                    {bet.items.map((item, i) => (
                      <div className="coupon__history-event" key={i}>
                        <span className="coupon__item-outcome-label">
                          Исход: <strong>{OUTCOME_LABELS[item.outcome]}</strong>
                        </span>
                        <span className="coupon__item-odd">{item.odd}</span>
                      </div>
                    ))}
                    {bet.items.map((item, i) => (
                      <div className="coupon__history-match" key={i}>
                        {item.match.home} — {item.match.away}
                      </div>
                    ))}
                    <div className="coupon__history-footer">
                      <span>Ставка: <strong>{bet.stake} ₽</strong></span>
                      <span>Выигрыш: <strong className="coupon__payout-value">{bet.payout} ₽</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {historyTab === 'settled' && (
            settledBets.length === 0 ? (
              <div className="coupon__empty">
                <div className="coupon__empty-icon">📋</div>
                <span className="coupon__empty-text">Нет рассчитанных ставок</span>
              </div>
            ) : (
              <div className="coupon__items">
                {settledBets.map(bet => (
                  <div className="coupon__history-item" key={bet.id}>
                    <span>{bet.date} · {bet.stake} ₽</span>
                  </div>
                ))}
              </div>
            )
          )}
        </>)}

      </div>
    </div>
  )
}