"use client"

import { useMemo } from "react"
import { useStandardLinkCodesFlat } from "@/hooks/use-standard-link-codes"
import {
  cashFlowDetailLinkCodeOptions,
  cashFlowLinkCodeOptions,
  isCashFlowFamily,
} from "@/lib/standard-link-code-utils"

/** Codes Trésorerie pour liaison (sommaire ou détail). */
export function useCashFlowCategoryLinkCodes(enabled: boolean, detailMode = false) {
  const { codes: allCodes, loading } = useStandardLinkCodesFlat(false, undefined, enabled)

  const options = useMemo(() => {
    if (detailMode) {
      return cashFlowDetailLinkCodeOptions(allCodes)
    }
    const cfCodes = allCodes.filter((c) => isCashFlowFamily(c.family))
    return cashFlowLinkCodeOptions(cfCodes)
  }, [allCodes, detailMode])

  if (!enabled) {
    return { codes: [] as string[], labels: new Map<string, string>(), loading: false }
  }

  return { ...options, loading }
}
