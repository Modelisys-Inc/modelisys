"use client"

import { useEffect, useState } from "react"
import { listStandardLinkCodesFlat } from "@/lib/api"
import { balanceSheetParentLinkCodeOptions } from "@/lib/standard-link-code-utils"

/** Standard parent link codes for balance-sheet single-mode pickers (excludes Compte de résultat). */
export function useBalanceSheetParentLinkCodes(enabled: boolean) {
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
        const { codes: nextCodes, labels: nextLabels } = balanceSheetParentLinkCodeOptions(all)
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
