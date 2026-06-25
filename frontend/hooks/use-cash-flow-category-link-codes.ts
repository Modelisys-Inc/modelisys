"use client"

import { useMemo } from "react"
import { useStandardLinkCodesFlat } from "@/hooks/use-standard-link-codes"
import {
  cashFlowLinkCodeOptions,
  isCashFlowFamily,
} from "@/lib/standard-link-code-utils"

/** Codes Trésorerie (familles TEX, TIN, TFI) pour le mode « Code unique » au sommaire Trésorerie. */
export function useCashFlowCategoryLinkCodes(enabled: boolean) {
  const { codes: allCodes, loading } = useStandardLinkCodesFlat(false, undefined, enabled)

  const options = useMemo(() => {
    const cfCodes = allCodes.filter((c) => isCashFlowFamily(c.family))
    return cashFlowLinkCodeOptions(cfCodes)
  }, [allCodes])

  if (!enabled) {
    return { codes: [] as string[], labels: new Map<string, string>(), loading: false }
  }

  return { ...options, loading }
}
