import { apiFetch } from "./api"

const SEVEN_DAYS = 7 * 24 * 60 * 60

function setSessionCookie() {
  document.cookie = `has_session=1; path=/; max-age=${SEVEN_DAYS}; SameSite=Lax`
}

function clearSessionCookie() {
  document.cookie = "has_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface UserResponse {
  id: string
  email: string
  full_name: string
  is_active: boolean
  is_superadmin?: boolean
  created_at: string
}

export interface OrganizationResponse {
  id: string
  name: string
  slug: string
  role: string
}

export interface MeResponse {
  user: UserResponse
  organizations: OrganizationResponse[]
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const data = await apiFetch<TokenResponse>("/api/auth/login", {
    method: "POST",
    body: { email, password },
  })
  localStorage.setItem("access_token", data.access_token)
  localStorage.setItem("refresh_token", data.refresh_token)
  setSessionCookie()
  return data
}

export async function register(
  email: string,
  password: string,
  fullName: string,
  organizationName: string,
): Promise<TokenResponse> {
  const data = await apiFetch<TokenResponse>("/api/auth/register", {
    method: "POST",
    body: { email, password, full_name: fullName, organization_name: organizationName },
  })
  localStorage.setItem("access_token", data.access_token)
  localStorage.setItem("refresh_token", data.refresh_token)
  setSessionCookie()
  return data
}

export async function getMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>("/api/auth/me")
}

export function logout() {
  localStorage.removeItem("access_token")
  localStorage.removeItem("refresh_token")
  clearSessionCookie()
}

export function hasToken(): boolean {
  if (typeof window === "undefined") return false
  return !!localStorage.getItem("access_token")
}
