"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { login as apiLogin, logout as apiLogout, getMe, type MeResponse, type UserResponse, type OrganizationResponse } from "@/lib/auth"
import { isPublicPath } from "@/lib/public-paths"

interface AuthContextType {
  user: UserResponse | null
  organizations: OrganizationResponse[]
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [organizations, setOrganizations] = useState<OrganizationResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  /** Évite setState après démontage (Strict Mode, HMR, navigation rapide). */
  const mountedRef = useRef(true)

  const loadUser = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    if (!token) {
      if (!mountedRef.current) return
      setUser(null)
      setOrganizations([])
      setIsLoading(false)
      document.cookie = "has_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      return
    }

    try {
      const data: MeResponse = await getMe()
      if (!mountedRef.current) return
      setUser(data.user)
      setOrganizations(data.organizations)
    } catch {
      if (!mountedRef.current) return
      apiLogout()
      setUser(null)
      setOrganizations([])
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    loadUser()
    return () => {
      mountedRef.current = false
    }
  }, [loadUser])

  // Client-side route protection
  useEffect(() => {
    if (isLoading) return
    if (!user && !isPublicPath(pathname)) {
      router.replace("/login")
    }
  }, [isLoading, user, pathname, router])

  const login = useCallback(async (email: string, password: string) => {
    await apiLogin(email, password)
    // Fetch user profile — if this fails, let the error propagate
    // so the login page can display a meaningful message
    const data = await getMe()
    setUser(data.user)
    setOrganizations(data.organizations)
    setIsLoading(false)
  }, [])

  const logout = useCallback(() => {
    apiLogout()
    setUser(null)
    setOrganizations([])
    router.push("/login")
  }, [router])

  const refreshUser = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    if (!token) return
    try {
      const data: MeResponse = await getMe()
      if (!mountedRef.current) return
      setUser(data.user)
      setOrganizations(data.organizations)
    } catch {
      if (!mountedRef.current) return
      apiLogout()
      setUser(null)
      setOrganizations([])
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
