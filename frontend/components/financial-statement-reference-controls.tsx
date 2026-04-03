"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type FinancialStatementReferenceControlsProps = {
  selectedMonth: number
  selectedYear: number
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
  /** `header` = bandeau logo, sans boîte, aligné sur la nav (texte #C9B8A5). */
  variant?: "panel" | "header"
}

const triggerBase =
  "shrink-0 border-0 bg-transparent shadow-none font-medium transition-colors data-[placeholder]:text-inherit [&_[data-slot=select-value]]:overflow-visible [&_[data-slot=select-value]]:line-clamp-none focus-visible:border-0 focus-visible:ring-1 focus-visible:ring-[#E0742D]/45 focus-visible:ring-offset-0 [&_svg]:shrink-0 [&_svg]:pointer-events-none"

/** Style ancienne zone « Référence » dans le hero (si réutilisé ailleurs). */
const panelYearClass = cn(
  triggerBase,
  "h-7 min-w-[6rem] w-[6rem] text-sm text-slate-200 hover:bg-white/5 hover:text-slate-100 dark:hover:bg-white/5",
)

const panelMonthClass = cn(
  triggerBase,
  "h-7 min-w-[10.25rem] w-[10.25rem] sm:min-w-[10.5rem] sm:w-[10.5rem] text-sm text-slate-200 hover:bg-white/5 hover:text-slate-100 dark:hover:bg-white/5",
)

const headerTriggerClass = cn(
  triggerBase,
  "h-6 max-w-[9rem] px-1.5 text-xs text-[#C9B8A5] hover:bg-white/5 hover:text-[#E6D6C3] [&_svg]:size-3 [&_svg]:opacity-70 [&_svg]:text-[#C9B8A5]",
)

const headerYearClass = cn(headerTriggerClass, "w-[3.25rem] min-w-[3.25rem] max-w-[3.5rem] tabular-nums")

export function FinancialStatementReferenceControls({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  variant = "panel",
}: FinancialStatementReferenceControlsProps) {
  const currentDate = new Date()
  const isHeader = variant === "header"

  if (isHeader) {
    return (
      <div className="flex min-w-0 max-w-full items-center gap-1.5 sm:gap-2">
        <span className="hidden shrink-0 text-xs font-medium leading-none text-[#C9B8A5]/90 sm:inline">
          Date de référence
        </span>
        <span className="hidden shrink-0 text-[#C9B8A5]/40 sm:inline" aria-hidden>
          ·
        </span>
        <Select value={selectedMonth.toString()} onValueChange={(value) => onMonthChange(parseInt(value, 10))}>
          <SelectTrigger size="sm" className={headerTriggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Janvier</SelectItem>
            <SelectItem value="2">Février</SelectItem>
            <SelectItem value="3">Mars</SelectItem>
            <SelectItem value="4">Avril</SelectItem>
            <SelectItem value="5">Mai</SelectItem>
            <SelectItem value="6">Juin</SelectItem>
            <SelectItem value="7">Juillet</SelectItem>
            <SelectItem value="8">Août</SelectItem>
            <SelectItem value="9">Septembre</SelectItem>
            <SelectItem value="10">Octobre</SelectItem>
            <SelectItem value="11">Novembre</SelectItem>
            <SelectItem value="12">Décembre</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedYear.toString()} onValueChange={(value) => onYearChange(parseInt(value, 10))}>
          <SelectTrigger size="sm" className={headerYearClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 15 }, (_, i) => {
              const year = currentDate.getFullYear() - 5 + i
              return (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <>
      <span className="whitespace-nowrap text-sm font-medium text-slate-200">Date de référence :</span>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Select value={selectedYear.toString()} onValueChange={(value) => onYearChange(parseInt(value, 10))}>
          <SelectTrigger className={panelYearClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 15 }, (_, i) => {
              const year = currentDate.getFullYear() - 5 + i
              return (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        <Select value={selectedMonth.toString()} onValueChange={(value) => onMonthChange(parseInt(value, 10))}>
          <SelectTrigger className={panelMonthClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Janvier</SelectItem>
            <SelectItem value="2">Février</SelectItem>
            <SelectItem value="3">Mars</SelectItem>
            <SelectItem value="4">Avril</SelectItem>
            <SelectItem value="5">Mai</SelectItem>
            <SelectItem value="6">Juin</SelectItem>
            <SelectItem value="7">Juillet</SelectItem>
            <SelectItem value="8">Août</SelectItem>
            <SelectItem value="9">Septembre</SelectItem>
            <SelectItem value="10">Octobre</SelectItem>
            <SelectItem value="11">Novembre</SelectItem>
            <SelectItem value="12">Décembre</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  )
}
