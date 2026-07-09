import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })

  // Купон живёт здесь — общий для всех страниц
  const [coupon, setCoupon] = useState({})
  const [stake, setStake] = useState('')
  const [betsHistory, setBetsHistory] = useState(() => {
    const saved = localStorage.getItem('betsHistory')
    return saved ? JSON.parse(saved) : []
  })

  const login = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('user')
    setUser(null)
    setCoupon({})
    setStake('')
    setBetsHistory([])
    localStorage.removeItem('betsHistory')
  }

  const updateBalance = (amount) => {
    setUser(prev => {
      const updated = { ...prev, balance: (prev.balance || 0) + amount }
      localStorage.setItem('user', JSON.stringify(updated))
      return updated
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

  const removeFromCoupon = (key) => {
    setCoupon(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  const clearCoupon = () => setCoupon({})

  return (
    <AuthContext.Provider value={{
      user, login, logout, updateBalance,
      coupon, stake, setStake, toggleOdd, removeFromCoupon, clearCoupon,
      betsHistory,
      setBetsHistory: (updater) => {
        setBetsHistory(prev => {
          const next = typeof updater === 'function' ? updater(prev) : updater
          localStorage.setItem('betsHistory', JSON.stringify(next))
          return next
        })
      },
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}