"use client"

import { useEffect, useState } from "react"
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

  useEffect(() => {
    setLoading(true)
    setError(null)
    listStandardLinkCodes(leafOnly)
      .then(setGroups)
      .catch(() => setError("Impossible de charger les codes de liaison"))
      .finally(() => setLoading(false))
  }, [leafOnly])

  return { groups, loading, error }
}

/** Fetch all leaf standard codes as a flat list (for dropdowns/pickers). */
export function useStandardLinkCodesFlat(leafOnly = true, family?: string) {
  const [codes, setCodes] = useState<StandardLinkCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    listStandardLinkCodesFlat(leafOnly, family)
      .then(setCodes)
      .catch(() => setError("Impossible de charger les codes de liaison"))
      .finally(() => setLoading(false))
  }, [leafOnly, family])

  return { codes, loading, error }
}
