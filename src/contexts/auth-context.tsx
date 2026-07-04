"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"

// Refresh the token this long before it expires, so an active user never
// hits an expired-token 401 mid-work (sliding session).
const REFRESH_BUFFER_MS = 5 * 60 * 1000 // 5 minutes

type AuthUser = {
  id: number
  name: string
  email: string
  role: string | null
  projects_id: number | null
  project_name: string | null
  is_super_admin: boolean
}

type BranchInfo = {
  active_id: number | null
  active_name: string
  can_switch: boolean
}

type AuthContextType = {
  user: AuthUser | null
  branch: BranchInfo | null
  loading: boolean
  login: (phone: string, password: string, rememberMe?: boolean) => Promise<void>
  logout: () => Promise<void>
  switchBranch: (branchId: number | null) => Promise<void>
  refreshBranch: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [branch, setBranch] = useState<BranchInfo | null>(null)
  const [loading, setLoading] = useState(true)
  // ISO8601 expiry of the current token; drives the sliding-refresh timer below.
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem("sf_token")
    if (!token) {
      setLoading(false)
      return
    }
    api.get<{ user: AuthUser; branch: BranchInfo }>("/api/auth/me")
      .then(({ user, branch }) => {
        setUser(user)
        setBranch(branch)
        setExpiresAt(localStorage.getItem("sf_expires_at"))
      })
      .catch((error) => {
        // Only clear session if token is invalid (401), not for other errors (500, network, etc)
        if (error?.status === 401) {
          localStorage.removeItem("sf_token")
          localStorage.removeItem("sf_user")
          localStorage.removeItem("sf_expires_at")
          router.push("/login")
        }
        // For other errors (500, network), keep session and let user retry
      })
      .finally(() => setLoading(false))
  }, [router])

  // Exchange the current (still-valid) token for a fresh one via Sanctum's
  // /auth/refresh. On failure we stay quiet — an expired/invalid token yields a
  // 401 that api.ts already turns into a redirect to /login.
  const refreshToken = useCallback(async () => {
    try {
      const res = await api.post<{ token: string; expires_at: string }>("/api/auth/refresh")
      localStorage.setItem("sf_token", res.token)
      localStorage.setItem("sf_expires_at", res.expires_at)
      setExpiresAt(res.expires_at)
    } catch {
      // ignore — centralized 401 handling in api.ts covers the expired case
    }
  }, [])

  // Sliding session: schedule a refresh shortly before the token expires.
  // Setting expiresAt again (after a refresh) re-arms this effect.
  useEffect(() => {
    if (!user || !expiresAt) return
    const lead = new Date(expiresAt).getTime() - Date.now() - REFRESH_BUFFER_MS
    const timer = setTimeout(refreshToken, Math.max(lead, 0))
    return () => clearTimeout(timer)
  }, [user, expiresAt, refreshToken])

  // Background tabs throttle setTimeout, so also catch up on refocus: if the
  // token is inside the refresh window when the tab becomes visible, refresh now.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible" || !user || !expiresAt) return
      if (new Date(expiresAt).getTime() - Date.now() < REFRESH_BUFFER_MS) refreshToken()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [user, expiresAt, refreshToken])

  const login = useCallback(async (phone: string, password: string, rememberMe = false) => {
    const res = await api.post<{ token: string; expires_at: string; user: AuthUser; branch: BranchInfo }>("/api/auth/login", {
      phone,
      password,
      remember_me: rememberMe,
    })
    localStorage.setItem("sf_token", res.token)
    localStorage.setItem("sf_expires_at", res.expires_at)
    localStorage.setItem("sf_user", JSON.stringify(res.user))
    if (rememberMe) {
      localStorage.setItem("sf_remember", "true")
    }
    setUser(res.user)
    setBranch(res.branch)
    setExpiresAt(res.expires_at)
    router.push("/dashboard")
  }, [router])

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout")
    } finally {
      localStorage.removeItem("sf_token")
      localStorage.removeItem("sf_user")
      localStorage.removeItem("sf_expires_at")
      setUser(null)
      setBranch(null)
      setExpiresAt(null)
      router.push("/login")
    }
  }, [router])

  const switchBranch = useCallback(async (branchId: number | null) => {
    const res = await api.post<{ branch: BranchInfo }>("/api/auth/switch-branch", {
      branch_id: branchId,
    })
    setBranch(res.branch)
  }, [])

  const refreshBranch = useCallback(async () => {
    const res = await api.get<{ user: AuthUser; branch: BranchInfo }>("/api/auth/me")
    setUser(res.user)
    setBranch(res.branch)
  }, [])

  return (
    <AuthContext.Provider value={{ user, branch, loading, login, logout, switchBranch, refreshBranch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
