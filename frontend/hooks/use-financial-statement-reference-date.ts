"use client"

import { startTransition, useCallback, useEffect, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

const REF_MONTH = "refMonth"
const REF_YEAR = "refYear"

export function isFinancialStatementPath(pathname: string | null): boolean {
  if (!pathname) return false
  return (
    pathname.startsWith("/financial-statements/income-statement") ||
    pathname.startsWith("/financial-statements/balance-sheet") ||
    pathname.startsWith("/financial-statements/cash-flow")
  )
}

export function getDefaultFinancialStatementRefDate() {
  const currentDate = new Date()
  return {
    month: currentDate.getMonth() + 1,
    year: currentDate.getMonth() < 3 ? currentDate.getFullYear() - 1 : currentDate.getFullYear(),
  }
}

function parseMonth(s: string | null): number | null {
  if (s == null || s === "") return null
  const n = parseInt(s, 10)
  return Number.isFinite(n) && n >= 1 && n <= 12 ? n : null
}

function parseYear(s: string | null): number | null {
  if (s == null || s === "") return null
  const n = parseInt(s, 10)
  return Number.isFinite(n) && n >= 1990 && n <= 2100 ? n : null
}

export type UseFinancialStatementReferenceDateOptions = {
  /**
   * Si `true`, ne pas écrire `refMonth` / `refYear` dans l’URL (lecture seule).
   * À utiliser sur les pages qui montent déjà `FinancialStatementReferenceControls` dans l’en-tête,
   * pour éviter deux `router.replace` concurrents au montage.
   */
  skipUrlSync?: boolean
}

/**
 * Mois / année de référence partagés entre Résultats, Bilan et Trésorerie via l’URL (?refMonth=&refYear=).
 */
export function useFinancialStatementReferenceDate(options?: UseFinancialStatementReferenceDateOptions) {
  const skipUrlSync = options?.skipUrlSync === true
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const defaults = useMemo(() => getDefaultFinancialStatementRefDate(), [])

  const selectedMonth = useMemo(() => {
    return parseMonth(searchParams.get(REF_MONTH)) ?? defaults.month
  }, [searchParams, defaults.month])

  const selectedYear = useMemo(() => {
    return parseYear(searchParams.get(REF_YEAR)) ?? defaults.year
  }, [searchParams, defaults.year])

  useEffect(() => {
    if (skipUrlSync) return
    if (!isFinancialStatementPath(pathname)) return
    if (searchParams.get(REF_MONTH) != null && searchParams.get(REF_YEAR) != null) return
    const p = new URLSearchParams(searchParams.toString())
    if (searchParams.get(REF_MONTH) == null) p.set(REF_MONTH, String(defaults.month))
    if (searchParams.get(REF_YEAR) == null) p.set(REF_YEAR, String(defaults.year))
    const nextUrl = `${pathname}?${p.toString()}`
    startTransition(() => {
      router.replace(nextUrl, { scroll: false })
    })
  }, [skipUrlSync, searchParams, pathname, router, defaults.month, defaults.year])

  const setSelectedMonth = useCallback(
    (month: number) => {
      const p = new URLSearchParams(searchParams.toString())
      p.set(REF_MONTH, String(month))
      if (p.get(REF_YEAR) == null) p.set(REF_YEAR, String(selectedYear))
      router.replace(`${pathname}?${p.toString()}`, { scroll: false })
    },
    [searchParams, pathname, router, selectedYear],
  )

  const setSelectedYear = useCallback(
    (year: number) => {
      const p = new URLSearchParams(searchParams.toString())
      p.set(REF_YEAR, String(year))
      if (p.get(REF_MONTH) == null) p.set(REF_MONTH, String(selectedMonth))
      router.replace(`${pathname}?${p.toString()}`, { scroll: false })
    },
    [searchParams, pathname, router, selectedMonth],
  )

  const setRefDate = useCallback(
    (month: number, year: number) => {
      const p = new URLSearchParams(searchParams.toString())
      p.set(REF_MONTH, String(month))
      p.set(REF_YEAR, String(year))
      router.replace(`${pathname}?${p.toString()}`, { scroll: false })
    },
    [searchParams, pathname, router],
  )

  return {
    selectedMonth,
    selectedYear,
    setSelectedMonth,
    setSelectedYear,
    setRefDate,
  }
}
