import { createContext, useContext, useState } from 'react'
import { createSession, deleteSession, getUser, register as apiRegister } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })
  const [coupon, setCoupon] = useState({})
  const [stake, setStake] = useState('')
  const [betsHistory, setBetsHistoryState] = useState(() => {
    const saved = localStorage.getItem('betsHistory')
    return saved ? JSON.parse(saved) : []
  })
  const [loading, setLoading] = useState(false)

  const saveUser = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const register = async (loginStr, password) => {
    setLoading(true)
    try {
      await apiRegister(loginStr, password)
      await login(loginStr, password)
    } finally {
      setLoading(false)
    }
  }

  const login = async (loginStr, password) => {
    setLoading(true)
    try {
      const { user_id, secret } = await createSession(loginStr, password)
      const userData = await getUser(user_id)
      saveUser({ ...userData, secret })
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    if (user?.secret) await deleteSession(user.secret).catch(() => {})
    localStorage.removeItem('user')
    localStorage.removeItem('betsHistory')
    setUser(null)
    setCoupon({})
    setStake('')
    setBetsHistoryState([])
  }

  const refreshBalance = async () => {
    if (!user) return
    const fresh = await getUser(user.id)
    saveUser({ ...user, balance: fresh.balance })
  }

  const updateBalance = (amount) => {
    setUser(prev => {
      const updated = { ...prev, balance: (prev.balance || 0) + amount }
      localStorage.setItem('user', JSON.stringify(updated))
      return updated
    })
  }

  const setBetsHistory = (updater) => {
    setBetsHistoryState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      localStorage.setItem('betsHistory', JSON.stringify(next))
      return next
    })
  }

  const toggleOdd = (match, outcome) => {
    const key = `${match.id}_${outcome}`
    setCoupon(prev => {
      const next = { ...prev }
      if (next[key]) {
        delete next[key]
      } else {
        Object.keys(next).forEach(k => {
          if (k.startsWith(`${match.id}_`)) delete next[k]
        })
        next[key] = { match, outcome, odd: match.odds[outcome] }
      }
      return next
    })
  }

  const removeFromCoupon = (key) => setCoupon(prev => { const n = { ...prev }; delete n[key]; return n })
  const clearCoupon = () => setCoupon({})

  return (
    <AuthContext.Provider value={{
      user, loading,
      login, logout, register, updateBalance, refreshBalance,
      coupon, stake, setStake, toggleOdd, removeFromCoupon, clearCoupon,
      betsHistory, setBetsHistory,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}