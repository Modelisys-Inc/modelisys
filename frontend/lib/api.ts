const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown
}

class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail)
    this.name = "ApiError"
  }
}

let refreshPromise: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem("refresh_token")
  if (!refreshToken) return false

  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!res.ok) {
      // Refresh failed — clear stale tokens
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
      document.cookie = "has_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      return false
    }

    const data = await res.json()
    localStorage.setItem("access_token", data.access_token)
    localStorage.setItem("refresh_token", data.refresh_token)
    return true
  } catch {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    document.cookie = "has_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    return false
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { body, headers: customHeaders, ...rest } = options

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((customHeaders as Record<string, string>) || {}),
  }

  const accessToken = localStorage.getItem("access_token")
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`
  }

  let res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  // On 401, try refreshing the token once
  if (res.status === 401 && accessToken) {
    // Deduplicate concurrent refresh attempts — only one promise at a time
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null
      })
    }

    const refreshed = await refreshPromise

    if (refreshed) {
      const newToken = localStorage.getItem("access_token")
      headers["Authorization"] = `Bearer ${newToken}`
      res = await fetch(`${API_URL}${path}`, {
        ...rest,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })
    }
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: res.statusText }))
    throw new ApiError(res.status, data.detail || res.statusText)
  }

  return res.json() as Promise<T>
}

export { ApiError, API_URL }
