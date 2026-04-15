"use client"

import { useCallback, useEffect, useState } from "react"
import {
  disconnectQbo,
  getQboAuthorizeUrl,
  getQboConnectionStatus,
  type QboConnectionStatus,
} from "@/lib/api"

export function useQuickBooksConnection(companyId: string) {
  const [status, setStatus] = useState<QboConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setStatus(await getQboConnectionStatus(companyId))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load connection")
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const connect = useCallback(async () => {
    const url = await getQboAuthorizeUrl(companyId)
    window.location.href = url
  }, [companyId])

  const disconnect = useCallback(async () => {
    await disconnectQbo(companyId)
    await refresh()
  }, [companyId, refresh])

  return { status, loading, error, refresh, connect, disconnect }
}
