import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { getUserBets, syncDeposits } from '../api'
import DepositModal from './DepositModal'
import BetLegs from './BetLegs'

const STATUS_LABELS = {
  won: '✅ Выиграл', lost: '❌ Проиграл', pending: '⏳ Ожидание',
  refund: '↩️ Возврат', cancelled: '🚫 Отменена',
}

export default function Profile() {
  const { user, logout, refreshBalance } = useAuth()
  const navigate = useNavigate()
  const [bets, setBets] = useState([])
  const [loading, setLoading] = useState(false)
  const [depositOpen, setDepositOpen] = useState(false)
  const [depositNotice, setDepositNotice] = useState('')

  useEffect(() => {
    if (!user) { navigate('/'); return }
    setLoading(true)
    getUserBets(user.id, user.secret)
      .then(data => setBets(data))
      .catch(() => setBets([]))
      .finally(() => setLoading(false))
  }, [user])

  // При каждом открытии профиля бэкенд сверяет со Stripe все незавершённые
  // платежи и зачисляет оплаченные. Так деньги придут, даже если после
  // оплаты пользователь закрыл вкладку или зашёл с другого устройства.
  // session_id в адресе значит, что он только что вернулся со страницы Stripe.
  useEffect(() => {
    if (!user) return
    const justPaid = new URLSearchParams(window.location.search).has('session_id')
    if (justPaid) window.history.replaceState(null, '', window.location.pathname)

    syncDeposits(user.id, user.secret)
      .then(({ credited, pending }) => {
        if (credited > 0) {
          setDepositNotice(`Баланс пополнен на ${credited.toLocaleString('ru-RU')} ₽`)
          refreshBalance()
        } else if (justPaid && pending > 0) {
          setDepositNotice('Платёж обрабатывается — обновите страницу через минуту')
        }
      })
      .catch(() => {})
  }, [user?.id])

  if (!user) return null

  const won  = bets.filter(b => b.status === 'won').length
  const lost = bets.filter(b => b.status === 'lost').length
  const pending = bets.filter(b => b.status === 'pending').length
  // Фактически начисленное, а не потенциальное: если часть экспресса ушла
  // в возврат, выплата меньше.
  const totalWinAmount = bets
    .filter(b => b.status === 'won')
    .reduce((acc, b) => acc + parseFloat(b.actual_payout), 0)

  return (
    <div className="profile-page">
      <div className="profile-container">

        <div className="profile-hero">
          <div className="profile-avatar">
            {user.login.charAt(0).toUpperCase()}
          </div>
          <div className="profile-hero__info">
            <h1 className="profile-hero__name">{user.login}</h1>
            <span className="profile-hero__id">ID: {user.id}</span>
          </div>
        </div>
        {depositNotice && <div className="profile-deposit-notice">{depositNotice}</div>}

        <div className="profile-stats">
          <div className="profile-stat-card profile-stat-card--balance">
            <div className="profile-stat-card__icon">💰</div>
            <div className="profile-stat-card__label">Баланс</div>
            <div className="profile-stat-card__value">
              {(user.balance || 0).toLocaleString('ru-RU', {
                minimumFractionDigits: 2, maximumFractionDigits: 2
              })} ₽
            </div>
            <button
              className="profile-stat-card__btn"
              onClick={() => setDepositOpen(true)}
            >+ Пополнить</button>
          </div>

          <div className="profile-stat-card">
            <div className="profile-stat-card__icon">🎫</div>
            <div className="profile-stat-card__label">Всего ставок</div>
            <div className="profile-stat-card__value">
              {loading ? '...' : bets.length}
            </div>
          </div>

          <div className="profile-stat-card profile-stat-card--won">
            <div className="profile-stat-card__icon">✅</div>
            <div className="profile-stat-card__label">Выиграно</div>
            <div className="profile-stat-card__value">
              {loading ? '...' : won}
            </div>
          </div>

          <div className="profile-stat-card profile-stat-card--lost">
            <div className="profile-stat-card__icon">❌</div>
            <div className="profile-stat-card__label">Проиграно</div>
            <div className="profile-stat-card__value">
              {loading ? '...' : lost}
            </div>
          </div>

          <div className="profile-stat-card">
            <div className="profile-stat-card__icon">⏳</div>
            <div className="profile-stat-card__label">Ожидают</div>
            <div className="profile-stat-card__value">
              {loading ? '...' : pending}
            </div>
          </div>

          <div className="profile-stat-card profile-stat-card--won">
            <div className="profile-stat-card__icon">📈</div>
            <div className="profile-stat-card__label">Сумма выигрышей</div>
            <div className="profile-stat-card__value">
              {loading ? '...' : `${totalWinAmount.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`}
            </div>
          </div>
        </div>
        <div className="profile-section">
          <h2 className="profile-section__title">История ставок</h2>

          {loading && <div className="profile-empty">Загрузка...</div>}

          {!loading && bets.length === 0 && (
            <div className="profile-empty">
              <div style={{ fontSize: 40, marginBottom: 8 }}>🎫</div>
              Ставок ещё нет
            </div>
          )}

          {!loading && bets.length > 0 && (
            <div className="profile-bets">
              {bets.map(bet => {
                const played = bet.legs.filter(l => l.status !== 'pending').length
                const title = bet.type === 'express'
                  ? `Экспресс · ${bet.legs.length} соб.${bet.status === 'pending' ? ` · сыграло ${played} из ${bet.legs.length}` : ''}`
                  : 'Ординар'
                return (
                  <div className="profile-bet" key={bet.id}>
                    <div className="profile-bet__head">
                      <div className="profile-bet__left">
                        <span className="profile-bet__id">#{bet.id}</span>
                        <span className="profile-bet__outcome"><strong>{title}</strong></span>
                        <span className="profile-bet__odd">× {parseFloat(bet.combined_odd).toFixed(2)}</span>
                      </div>
                      <div className="profile-bet__right">
                        <span className="profile-bet__amount">{bet.amount} ₽</span>
                        <span className={`profile-bet__status profile-bet__status--${bet.status}`}>
                          {STATUS_LABELS[bet.status] || bet.status}
                        </span>
                        {bet.status === 'won' && (
                          <span className="profile-bet__win">
                            +{parseFloat(bet.actual_payout).toFixed(2)} ₽
                          </span>
                        )}
                        {bet.status === 'refund' && (
                          <span className="profile-bet__win">
                            ↩ {parseFloat(bet.amount).toFixed(2)} ₽
                          </span>
                        )}
                      </div>
                    </div>
                    <BetLegs legs={bet.legs} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <button className="profile-logout" onClick={() => { logout(); navigate('/') }}>
          Выйти из аккаунта
        </button>

      </div>

      {depositOpen && <DepositModal onClose={() => setDepositOpen(false)} />}
    </div>
  )
}