import { useState } from 'react'
import { useAuth } from '../AuthContext'

function isAdult(dateStr) {
  if (!dateStr) return false
  const birth = new Date(dateStr)
  const today = new Date()
  const age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  return (m < 0 || (m === 0 && today.getDate() < birth.getDate())) ? age - 1 >= 18 : age >= 18
}

export default function AuthModal({ onClose }) {
  const { login, register, loading } = useAuth()
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({
    login: '', password: '', confirm: '',
    birthdate: '', agree18: false, agreeRules: false,
  })
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
    setError('')
  }

  const handleSubmit = async () => {
    if (!form.login.trim() || !form.password.trim()) { setError('Заполните все поля'); return }
    if (tab === 'register') {
      if (form.password !== form.confirm) { setError('Пароли не совпадают'); return }
      if (!form.birthdate) { setError('Укажите дату рождения'); return }
      if (!isAdult(form.birthdate)) { setError('Регистрация доступна только лицам от 18 лет'); return }
      if (!form.agree18) { setError('Подтвердите, что вам исполнилось 18 лет'); return }
      if (!form.agreeRules) { setError('Необходимо принять правила сервиса'); return }
    }
    try {
      if (tab === 'register') await register(form.login, form.password)
      else await login(form.login, form.password)
      onClose()
    } catch (e) {
      setError(e.message || 'Ошибка')
    }
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <button className="auth-modal__close" onClick={onClose}>✕</button>
        <div className="auth-modal__logo">PrimeBet</div>
        <div className="auth-modal__tabs">
          <button className={`auth-modal__tab ${tab === 'login' ? 'auth-modal__tab--active' : ''}`}
            onClick={() => { setTab('login'); setError('') }}>Войти</button>
          <button className={`auth-modal__tab ${tab === 'register' ? 'auth-modal__tab--active' : ''}`}
            onClick={() => { setTab('register'); setError('') }}>Регистрация</button>
        </div>
        <div className="auth-modal__fields">
          <input className="auth-modal__input" type="text" name="login"
            placeholder="Логин" value={form.login} onChange={handleChange} />
          <input className="auth-modal__input" type="password" name="password"
            placeholder="Пароль" value={form.password} onChange={handleChange} />
          {tab === 'register' && (<>
            <input className="auth-modal__input" type="password" name="confirm"
              placeholder="Повторите пароль" value={form.confirm} onChange={handleChange} />
            <div className="auth-modal__field-group">
              <label className="auth-modal__field-label">Дата рождения</label>
              <input className="auth-modal__input" type="date" name="birthdate"
                value={form.birthdate} onChange={handleChange}
                max={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="auth-modal__age-block">
              <div className="auth-modal__age-icon">🔞</div>
              <div className="auth-modal__age-text">Ставки разрешены только лицам старше 18 лет.</div>
            </div>
            <label className="auth-modal__checkbox-row">
              <input type="checkbox" name="agree18" checked={form.agree18} onChange={handleChange} />
              <span>Мне исполнилось <strong>18 лет</strong></span>
            </label>
            <label className="auth-modal__checkbox-row">
              <input type="checkbox" name="agreeRules" checked={form.agreeRules} onChange={handleChange} />
              <span>Я принимаю <a href="#" className="auth-modal__link">правила сервиса</a></span>
            </label>
          </>)}
        </div>
        {error && <div className="auth-modal__error">{error}</div>}
        <button className="auth-modal__submit" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Загрузка...' : tab === 'login' ? 'Войти' : 'Зарегистрироваться'}
        </button>
        <div className="auth-modal__switch">
          {tab === 'login'
            ? <>Нет аккаунта? <span onClick={() => setTab('register')}>Зарегистрироваться</span></>
            : <>Уже есть аккаунт? <span onClick={() => setTab('login')}>Войти</span></>}
        </div>
      </div>
    </div>
  )
}