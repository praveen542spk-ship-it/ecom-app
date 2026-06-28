/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()
const API_URL = 'http://localhost:5000'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('aura_user')) || null)
  const [token, setToken] = useState(localStorage.getItem('aura_token') || null)
  const [loading, setLoading] = useState(!!localStorage.getItem('aura_token'))

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('aura_token')
    localStorage.removeItem('aura_user')
  }

  useEffect(() => {
    // Validate session on initial load if token exists
    const savedToken = localStorage.getItem('aura_token')
    if (savedToken) {
      fetch(`${API_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${savedToken}` }
      })
        .then(res => {
          if (res.ok) return res.json()
          throw new Error('Session expired')
        })
        .then(data => {
          setUser(data.user)
          localStorage.setItem('aura_user', JSON.stringify(data.user))
        })
        .catch(() => {
          logout()
        })
        .finally(() => setLoading(false))
    }
  }, [])

  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('aura_token', data.token)
    localStorage.setItem('aura_user', JSON.stringify(data.user))
    return data.user
  }

  const register = async (name, email, password) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Registration failed')

    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('aura_token', data.token)
    localStorage.setItem('aura_user', JSON.stringify(data.user))
    return data.user
  }

  // Get authenticated headers helper
  const getAuthHeaders = () => {
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Update user profile helper
  const updateUser = async (updatedFields) => {
    const updatedUser = { ...user, ...updatedFields }
    setUser(updatedUser)
    localStorage.setItem('aura_user', JSON.stringify(updatedUser))

    if (token) {
      try {
        const res = await fetch(`${API_URL}/api/auth/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(updatedFields)
        })
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
          localStorage.setItem('aura_user', JSON.stringify(data.user))
        }
      } catch (err) {
        console.error('Failed to sync profile update with server:', err)
      }
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      updateUser,
      getAuthHeaders,
      isAuthenticated: !!token
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
export { API_URL }
