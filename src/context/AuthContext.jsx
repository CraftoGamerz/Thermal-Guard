import { createContext, useContext, useState, useCallback } from 'react'
import { validateLogin } from '../data/managers'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [manager, setManager] = useState(() => {
    try {
      const saved = sessionStorage.getItem('tg_manager')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  const login = useCallback((state, district, email, password) => {
    const m = validateLogin(state, district, email, password)
    if (m) {
      setManager(m)
      sessionStorage.setItem('tg_manager', JSON.stringify(m))
      return { success: true, manager: m }
    }
    return { success: false, error: 'Invalid credentials. Please check your state, district, email and password.' }
  }, [])

  const logout = useCallback(() => {
    setManager(null)
    sessionStorage.removeItem('tg_manager')
  }, [])

  return (
    <AuthContext.Provider value={{ manager, login, logout, isAuthenticated: !!manager }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext
