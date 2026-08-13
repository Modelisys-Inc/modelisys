"use client"

import { useEffect, useState } from "react"
import { listCompanyLinkCodes, listStandardLinkCodesFlat } from "@/lib/api"
import {
  allAnalysisLinkCodeOptions,
  capexLinkCodeOptions,
  standardLinkCodeDisplayLabel,
  workingCapitalLinkCodeOptions,
} from "@/lib/standard-link-code-utils"

export type AnalysisLinkCodeVariant = "working-capital" | "capex" | "ratios"

/** Codes de liaison Bilan + Résultats (FDR / Capex) ou charte complète (Ratios). */
export function useWorkingCapitalLinkCodes(
  enabled: boolean,
  variant: AnalysisLinkCodeVariant = "working-capital",
  companyId?: string | null,
) {
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

    const load = async () => {
      const all = await listStandardLinkCodesFlat(false)
      let next =
        variant === "capex"
          ? capexLinkCodeOptions(all)
          : variant === "ratios"
            ? allAnalysisLinkCodeOptions(all)
            : workingCapitalLinkCodeOptions(all)

      if (variant === "ratios" && companyId) {
        try {
          const custom = await listCompanyLinkCodes(companyId, false)
          const have = new Set(next.codes)
          const labels = new Map(next.labels)
          const codes = [...next.codes]
          for (const row of custom) {
            if (row.is_active === false) continue
            if (!have.has(row.code)) {
              codes.push(row.code)
              have.add(row.code)
            }
            if (!labels.has(row.code)) {
              labels.set(row.code, standardLinkCodeDisplayLabel(row))
            }
          }
          next = { codes, labels }
        } catch {
          // Overlay tenant-local optionnel — ne bloque pas le picker standard.
        }
      }

      return next
    }

    load()
      .then((next) => {
        if (cancelled) return
        setCodes(next.codes)
        setLabels(next.labels)
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
  }, [enabled, variant, companyId])

  return { codes, labels, loading }
}
