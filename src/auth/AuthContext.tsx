import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { getMe, login, type AuthenticatedUserResponse, type LoginRequest } from "./authApi"

type AuthContextType = {
  user: AuthenticatedUserResponse | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  loginUser: (payload: LoginRequest) => Promise<void>
  logoutUser: () => void
  refreshUser: () => Promise<void>
  applySession: (session: { token: string; user: AuthenticatedUserResponse }) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = "camelyon_token"
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000
const ACTIVITY_EVENTS = ["click", "keydown", "mousedown", "mousemove", "scroll", "touchstart"] as const

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUserResponse | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY))
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function restoreSession() {
      try {
        await refreshUser()
      } finally {
        setIsLoading(false)
      }
    }

    restoreSession()
  }, [token])

  useEffect(() => {
    if (!token) {
      return
    }

    let timeoutId = window.setTimeout(logoutUser, SESSION_IDLE_TIMEOUT_MS)

    function resetIdleTimer() {
      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(logoutUser, SESSION_IDLE_TIMEOUT_MS)
    }

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimer, { passive: true })
    })

    return () => {
      window.clearTimeout(timeoutId)
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimer)
      })
    }
  }, [token])

  async function loginUser(payload: LoginRequest) {
    const response = await login(payload)
    localStorage.setItem(TOKEN_KEY, response.token)
    setToken(response.token)
    setUser(response.user)
  }

  function logoutUser() {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }

  function applySession(session: { token: string; user: AuthenticatedUserResponse }) {
    localStorage.setItem(TOKEN_KEY, session.token)
    setToken(session.token)
    setUser(session.user)
  }

  async function refreshUser() {
    if (!token) {
      setUser(null)
      return
    }

    try {
      const me = await getMe(token)
      setUser(me)
    } catch (err) {
      console.error(err)
      localStorage.removeItem(TOKEN_KEY)
      setToken(null)
      setUser(null)
      throw err
    }
  }

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!user && !!token,
      isLoading,
      loginUser,
      logoutUser,
      refreshUser,
      applySession,
    }),
    [user, token, isLoading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider")
  }
  return context
}
