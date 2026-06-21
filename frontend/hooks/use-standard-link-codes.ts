"use client"

import { useCallback, useEffect, useState } from "react"
import {
  listStandardLinkCodes,
  listStandardLinkCodesFlat,
  type StandardLinkCode,
  type StandardLinkCodeFamilyGroup,
} from "@/lib/api"

/** Fetch all standard codes grouped by family (full chart view). */
export function useStandardLinkCodes(leafOnly = false) {
  const [groups, setGroups] = useState<StandardLinkCodeFamilyGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (showLoading: boolean) => {
      if (showLoading) setLoading(true)
      setError(null)
      try {
        const data = await listStandardLinkCodes(leafOnly)
        setGroups(data)
      } catch {
        setError("Impossible de charger les codes de liaison")
      } finally {
        if (showLoading) setLoading(false)
      }
    },
    [leafOnly],
  )

  useEffect(() => {
    void load(true)
  }, [load])

  const refetch = useCallback(() => load(false), [load])

  return { groups, loading, error, refetch }
}

/** Fetch standard codes as a flat list (for dropdowns/pickers). */
export function useStandardLinkCodesFlat(leafOnly = true, family?: string, enabled = true) {
  const [codes, setCodes] = useState<StandardLinkCode[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setCodes([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    listStandardLinkCodesFlat(leafOnly, family)
      .then(setCodes)
      .catch(() => setError("Impossible de charger les codes de liaison"))
      .finally(() => setLoading(false))
  }, [leafOnly, family, enabled])

  return { codes, loading, error }
}
