"use client"

import { useState, useEffect } from "react"
import { getMe, type UserInfo } from "@/lib/api"

export function useUser() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  return { user, loading }
}
