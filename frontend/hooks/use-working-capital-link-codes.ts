"use client"

import { useEffect, useState } from "react"
import { listStandardLinkCodesFlat } from "@/lib/api"
import { workingCapitalLinkCodeOptions } from "@/lib/standard-link-code-utils"

/** Codes de liaison Bilan + Résultats pour le picker Paramètres fonds de roulement. */
export function useWorkingCapitalLinkCodes(enabled: boolean) {
  const [codes, setCodes] = useState<string[]>([])
  const [labels, setLabels] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setCodes([])
      setLabels(new Map())
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    listStandardLinkCodesFlat(false)
      .then((all) => {
        if (cancelled) return
        const { codes: nextCodes, labels: nextLabels } = workingCapitalLinkCodeOptions(all)
        setCodes(nextCodes)
        setLabels(nextLabels)
      })
      .catch(() => {
        if (cancelled) return
        setCodes([])
        setLabels(new Map())
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [enabled])

  return { codes, labels, loading }
}
