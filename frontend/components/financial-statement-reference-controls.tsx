"use client"

import { useEffect, useLayoutEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useCompanies } from "@/hooks/use-companies"
import { useFinancialStatementReferenceDate } from "@/hooks/use-financial-statement-reference-date"
import { listTrialBalanceReferencePeriods, type TrialBalanceReferencePeriod } from "@/lib/api"

const MONTH_NAMES_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
]

function periodLabel(p: TrialBalanceReferencePeriod): string {
  return `${MONTH_NAMES_FR[p.month - 1]} ${p.fiscal_year}`
}

function periodValue(p: TrialBalanceReferencePeriod): string {
  return `${p.fiscal_year}-${p.month}`
}

function parsePeriodValue(s: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{1,2})$/.exec(s)
  if (!m) return null
  const year = parseInt(m[1], 10)
  const month = parseInt(m[2], 10)
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null
  return { year, month }
}

type FinancialStatementReferenceControlsProps = {
  /** Société ciblée (URL ou autre) ; sinon première société du workspace. */
  companyId?: string | null
  /** `header` = bandeau logo, sans boîte, aligné sur la nav (texte #C9B8A5). */
  variant?: "panel" | "header"
}

const triggerBase =
  "shrink-0 border-0 bg-transparent shadow-none font-medium transition-colors data-[placeholder]:text-inherit [&_[data-slot=select-value]]:overflow-visible [&_[data-slot=select-value]]:line-clamp-none focus-visible:border-0 focus-visible:ring-1 focus-visible:ring-[#E0742D]/45 focus-visible:ring-offset-0 [&_svg]:shrink-0 [&_svg]:pointer-events-none"

const panelMonthClass = cn(
  triggerBase,
  "h-7 min-w-[10.25rem] w-[10.25rem] sm:min-w-[10.5rem] sm:w-[10.5rem] text-sm text-slate-200 hover:bg-white/5 hover:text-slate-100 dark:hover:bg-white/5",
)

const headerTriggerClass = cn(
  triggerBase,
  "h-6 min-w-[9rem] max-w-[14rem] px-1.5 text-xs text-[#C9B8A5] hover:bg-white/5 hover:text-[#E6D6C3] [&_svg]:size-3 [&_svg]:opacity-70 [&_svg]:text-[#C9B8A5]",
)

export function FinancialStatementReferenceControls({
  companyId: companyIdProp,
  variant = "panel",
}: FinancialStatementReferenceControlsProps) {
  const { companies } = useCompanies()
  const { selectedMonth, selectedYear, setRefDate } = useFinancialStatementReferenceDate()
  const effectiveCompanyId = companyIdProp ?? companies[0]?.id ?? null

  const [periods, setPeriods] = useState<TrialBalanceReferencePeriod[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!effectiveCompanyId) {
      setPeriods([])
      return
    }
    let cancelled = false
    setLoading(true)
    listTrialBalanceReferencePeriods(effectiveCompanyId)
      .then((rows) => {
        if (!cancelled) setPeriods(rows)
      })
      .catch(() => {
        if (!cancelled) setPeriods([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [effectiveCompanyId])

  const currentValue = useMemo(() => `${selectedYear}-${selectedMonth}`, [selectedYear, selectedMonth])

  const selectValue = useMemo(() => {
    if (periods.length === 0) return undefined
    const ok = periods.some((p) => p.month === selectedMonth && p.fiscal_year === selectedYear)
    return ok ? currentValue : periodValue(periods[0])
  }, [periods, selectedMonth, selectedYear, currentValue])

  useLayoutEffect(() => {
    if (loading || periods.length === 0) return
    const ok = periods.some((p) => p.month === selectedMonth && p.fiscal_year === selectedYear)
    if (!ok) {
      const first = periods[0]
      setRefDate(first.month, first.fiscal_year)
    }
  }, [loading, periods, selectedMonth, selectedYear, setRefDate])

  const isHeader = variant === "header"

  if (isHeader) {
    return (
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5 sm:gap-2">
        <span className="hidden shrink-0 text-xs font-medium leading-none text-[#C9B8A5]/90 sm:inline">
          Date de référence
        </span>
        <span className="hidden shrink-0 text-[#C9B8A5]/40 sm:inline" aria-hidden>
          ·
        </span>
        {loading && (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#C9B8A5]/70" aria-label="Chargement" />
        )}
        {!loading && !effectiveCompanyId && (
          <span className="text-xs text-[#C9B8A5]/80">Aucune société disponible.</span>
        )}
        {!loading && effectiveCompanyId && periods.length === 0 && (
          <span className="max-w-[min(28rem,100%)] text-xs leading-snug text-[#C9B8A5]/90">
            Aucune balance importée. Importez une{" "}
            <Link
              href={`/settings/companies/${effectiveCompanyId}/trial-balance`}
              className="font-medium text-[#E6D6C3] underline underline-offset-2 hover:text-white"
            >
              balance de vérification
            </Link>{" "}
            pour sélectionner une date.
          </span>
        )}
        {!loading && effectiveCompanyId && periods.length > 0 && selectValue && (
          <Select
            value={selectValue}
            onValueChange={(v) => {
              const parsed = parsePeriodValue(v)
              if (parsed) setRefDate(parsed.month, parsed.year)
            }}
          >
            <SelectTrigger size="sm" className={headerTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={periodValue(p)} value={periodValue(p)}>
                  {periodLabel(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    )
  }

  return (
    <>
      <span className="whitespace-nowrap text-sm font-medium text-slate-200">Date de référence :</span>
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" aria-label="Chargement" />}
        {!loading && !effectiveCompanyId && (
          <span className="text-sm text-slate-400">Aucune société disponible.</span>
        )}
        {!loading && effectiveCompanyId && periods.length === 0 && (
          <span className="max-w-md text-sm text-slate-400">
            Aucune balance importée.{" "}
            <Link
              href={`/settings/companies/${effectiveCompanyId}/trial-balance`}
              className="font-medium text-slate-200 underline underline-offset-2 hover:text-white"
            >
              Importer une balance de vérification
            </Link>
          </span>
        )}
        {!loading && effectiveCompanyId && periods.length > 0 && selectValue && (
          <Select
            value={selectValue}
            onValueChange={(v) => {
              const parsed = parsePeriodValue(v)
              if (parsed) setRefDate(parsed.month, parsed.year)
            }}
          >
            <SelectTrigger className={panelMonthClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={periodValue(p)} value={periodValue(p)}>
                  {periodLabel(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </>
  )
}
