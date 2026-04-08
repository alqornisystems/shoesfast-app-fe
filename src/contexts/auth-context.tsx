"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"

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
      })
      .catch((error) => {
        // Only clear session if token is invalid (401), not for other errors (500, network, etc)
        if (error?.status === 401) {
          localStorage.removeItem("sf_token")
          localStorage.removeItem("sf_user")
          router.push("/login")
        }
        // For other errors (500, network), keep session and let user retry
      })
      .finally(() => setLoading(false))
  }, [router])

  const login = useCallback(async (phone: string, password: string, rememberMe = false) => {
    const res = await api.post<{ token: string; user: AuthUser; branch: BranchInfo }>("/api/auth/login", {
      phone,
      password,
      remember_me: rememberMe,
    })
    localStorage.setItem("sf_token", res.token)
    localStorage.setItem("sf_user", JSON.stringify(res.user))
    if (rememberMe) {
      localStorage.setItem("sf_remember", "true")
    }
    setUser(res.user)
    setBranch(res.branch)
    router.push("/dashboard")
  }, [router])

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout")
    } finally {
      localStorage.removeItem("sf_token")
      localStorage.removeItem("sf_user")
      setUser(null)
      setBranch(null)
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
