"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { login as apiLogin, logout as apiLogout, getMe, type MeResponse, type UserResponse, type OrganizationResponse } from "@/lib/auth"

interface AuthContextType {
  user: UserResponse | null
  organizations: OrganizationResponse[]
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const PUBLIC_PATHS = [
  "/login",
  "/privacy",
  "/clause-de-non-responsabilite",
  "/blog",
  "/contact",
  "/cabinets-comptables",
  "/partenaires-financiers",
  "/partenaires-institutionnels",
  "/partenaires-capital",
]

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [organizations, setOrganizations] = useState<OrganizationResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const loadUser = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    if (!token) {
      setUser(null)
      setOrganizations([])
      setIsLoading(false)
      // Clear stale session cookie to prevent redirect loop
      document.cookie = "has_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      return
    }

    try {
      const data: MeResponse = await getMe()
      setUser(data.user)
      setOrganizations(data.organizations)
    } catch {
      // Token invalid or expired (refresh also failed)
      apiLogout()
      setUser(null)
      setOrganizations([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
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

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
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
