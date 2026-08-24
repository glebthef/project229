import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import DepositModal from './DepositModal'

export default function Header({ isLight, onToggle, onAuthOpen }) {
  const { user, logout, refreshBalance } = useAuth()
  const [depositOpen, setDepositOpen] = useState(false)

  // Обновляем баланс из БД при каждом входе
  useEffect(() => {
    if (user) refreshBalance()
  }, [user?.id])

  return (
    <>
      <header className="header">
        <div className="leftside">
          <Link to="/" className="logo">PrimeBet</Link>
        </div>

        <div className="rightside">
          <label className="toggle-label">
            <input type="checkbox" className="checkbox" checked={isLight} onChange={onToggle} />
            <span className="icon moon">☾</span>
            <span className="icon sun">☀</span>
            <span className="circle"></span>
          </label>

          {user ? (
            <>
              <div className="header-balance" onClick={() => setDepositOpen(true)}>
                <span className="header-balance__amount">
                  {(user.balance || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
                </span>
                <button className="header-balance__deposit">+</button>
              </div>
              <span className="header-username">👤 {user.login}</span>
              <button className="hbtn btn-sign" onClick={logout}>Выйти</button>
            </>
          ) : (
            <>
              <button className="hbtn btn-sign" onClick={onAuthOpen}>Войти</button>
              <button className="hbtn btn-auth" onClick={onAuthOpen}>Регистрация</button>
            </>
          )}
        </div>
      </header>

      {depositOpen && <DepositModal onClose={() => setDepositOpen(false)} />}
    </>
  )
}