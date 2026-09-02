import { createContext, useContext, useState } from 'react'
import { createSession, deleteSession, getUser, register as apiRegister } from './api'

const AuthContext = createContext(null)

const CONFLICT_GROUPS = [
  ['p1', 'x', 'p2'],
  ['total_over', 'total_under'],
  ['handicap_home', 'handicap_away'],
]

export function checkConflict(a, b) {
  return CONFLICT_GROUPS.some(g => g.includes(a) && g.includes(b))
}

export function getOutcomeGroup(outcome) {
  if (['p1','x','p2'].includes(outcome)) return 'основной исход'
  if (['total_over','total_under'].includes(outcome)) return 'тотал'
  if (['handicap_home','handicap_away'].includes(outcome)) return 'фора'
  return outcome
}

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
        return next
      }

      const alreadyBet = betsHistory.some(bet =>
        bet.status === 'pending' &&
        bet.items.some(item =>
          item.match.id === match.id && item.outcome === outcome
        )
      )
      if (alreadyBet) {

        next[key] = {
          match, outcome,
          odd: match.odds?.[outcome] ?? null,
          conflict: false,
          conflictWith: null,
          alreadyBet: true,
        }
        return next
      }

      const existingKeys = Object.keys(next).filter(k => k.startsWith(`${match.id}_`))
      let conflict = false
      let conflictWith = null
      for (const ek of existingKeys) {
        const eo = ek.replace(`${match.id}_`, '')
        if (checkConflict(eo, outcome)) {
          conflict = true
          conflictWith = eo
          break
        }
      }
      next[key] = {
        match, outcome,
        odd: match.odds?.[outcome] ?? null,
        conflict, conflictWith,
        alreadyBet: false,
      }
      return next
    })
  }

  const removeFromCoupon = (key) =>
    setCoupon(prev => { const n = { ...prev }; delete n[key]; return n })

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