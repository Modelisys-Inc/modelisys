"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import {
  aggregateToQuarters,
  aggregateToYears,
  findSeriesRowOrDetail,
  getPeriodLabels,
  getRowAmounts,
} from "@/lib/series-utils"
import { monthTrendFromReference } from "@/lib/series-reference-columns"
import {
  formatCalendarMonthYear,
  formatPriorCalendarMonth,
  formatSameMonthPriorYear,
} from "@/lib/financial-period-labels"
import { getHorizonModeLabel } from "@/lib/financial-statement-horizon-labels"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { IncomeStatementNotePanel } from "@/components/income-statement-note-panel"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { ArrowLeft, ArrowRight, CheckCircle2, Table2, X } from "lucide-react"
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from "recharts"

export interface BalanceSheetLineAnalysisSnapshot {
  rowId: string
  label: string
  current: number
  prior: number
  balanceAccounts?: Array<{
    accountNumber: string
    accountName: string
    amount: number
    priorAmount?: number
  }>
  trendValues?: number[]
  /** Si l'analyse porte sur un compte GL : id de la ligne d'état parente. */
  parentRowId?: string
}

export interface BalanceSheetLineAnalysisDataRow {
  rowId?: string
  label: string
  current: number
  prior: number
  balanceAccounts?: Array<{
    accountNumber: string
    accountName: string
    amount: number
    priorAmount?: number
  }>
  trendValues?: number[]
}

export function structureRowHasLiaisonCode(row: Record<string, unknown> | null | undefined): boolean {
  if (!row) return false

  const linkCode = String(row.linkCode ?? "").trim()
  if (linkCode) return true

  const sumCodes = Array.isArray(row.liaisonSumCodes) ? row.liaisonSumCodes : []
  if (sumCodes.some((code) => String(code ?? "").trim())) return true

  const numeratorCodes = Array.isArray(row.liaisonNumeratorCodes) ? row.liaisonNumeratorCodes : []
  if (numeratorCodes.some((code) => String(code ?? "").trim())) return true

  const denominatorCodes = Array.isArray(row.liaisonDenominatorCodes) ? row.liaisonDenominatorCodes : []
  return denominatorCodes.some((code) => String(code ?? "").trim())
}

function accountLabelAlreadyIncludesNumber(accountNumber: string, accountName: string): boolean {
  const n = accountNumber.trim()
  const name = (accountName || "").trim()
  if (!n || !name) return false
  if (name === n) return true
  if (!name.startsWith(n)) return false
  const rest = name.slice(n.length)
  return rest === "" || /^[\s\u2014\u2013\-:]/.test(rest)
}

export function BalanceSheetLineAnalysisTriggerButton({
  isActive,
  hasNote,
  onClick,
}: {
  isActive: boolean
  hasNote: boolean
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative rounded-md p-1.5 text-[#E0742D] transition-colors ring-1 ring-[#E0742D]/25 hover:bg-orange-50 hover:ring-[#E0742D]/50",
        isActive && "bg-[#E0742D]/10 ring-[#E0742D]/45"
      )}
      aria-pressed={isActive}
      title={
        isActive
          ? "Fermer le panneau (analyse & note)"
          : hasNote
            ? "Analyse, ventilation et note enregistrée"
            : "Ouvrir l'analyse et les notes"
      }
    >
      <Table2 className="h-4 w-4 shrink-0" aria-hidden />
      {hasNote && (
        <span
          className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-sky-500 ring-2 ring-white"
          aria-hidden
        />
      )}
    </button>
  )
}

export interface BalanceSheetLineAnalysisAsideProps {
  lineAnalysis: BalanceSheetLineAnalysisSnapshot
  setLineAnalysis: React.Dispatch<React.SetStateAction<BalanceSheetLineAnalysisSnapshot | null>>
  data: BalanceSheetLineAnalysisDataRow[]
  companies: Company[]
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years"
  columnMode: "variationAmount" | "variationPercent" | "percentage" | "comparison"
  comparisonType: "lastMonth" | "pastMonth" | "budget"
  selectedBudgetName?: string | null
  refMonth: number
  refYear: number
  fiscalYear?: number
  structureVersion?: number
  isComparisonMode: boolean
  getComparisonLabel: () => string
  getTotalAssetsPercentage: (value: number, isPrior: boolean) => number
  analysisRowRefs: React.MutableRefObject<Record<string, HTMLTableRowElement | null>>
  onNotesUpdated: () => void
  cardRef?: React.Ref<HTMLElement | null>
}

export function BalanceSheetLineAnalysisAside({
  lineAnalysis,
  setLineAnalysis,
  data,
  companies,
  companyId,
  divisionId,
  subDivisionId,
  period,
  view,
  columnMode,
  comparisonType: _comparisonType,
  selectedBudgetName: _selectedBudgetName,
  refMonth,
  refYear,
  fiscalYear,
  structureVersion = 0,
  isComparisonMode,
  getComparisonLabel,
  getTotalAssetsPercentage,
  analysisRowRefs,
  onNotesUpdated,
  cardRef,
}: BalanceSheetLineAnalysisAsideProps) {
  const [lineAnalysisView, setLineAnalysisView] = useState<"current" | "trailing12" | "trailing5years">("current")
  const [showAllAnalysisAccounts, setShowAllAnalysisAccounts] = useState(false)

  const currentYear = fiscalYear || new Date().getFullYear()

  const { rows: analysisSeriesRows, periods: analysisPeriods, loading: analysisSeriesLoading } =
    useFinancialStatementSeries({
      companyId: companyId || null,
      statementType: "balance-sheet",
      fiscalYear: currentYear,
      month: refMonth,
      months: 60,
      divisionId: divisionId || null,
      subDivisionId: subDivisionId || null,
      enabled: !!companyId && !!lineAnalysis.rowId,
      structureVersion,
    })

  useEffect(() => {
    setLineAnalysisView("current")
    setShowAllAnalysisAccounts(false)
  }, [lineAnalysis.rowId])

  const scrollToAnalysisCard = useCallback(() => {
    window.requestAnimationFrame(() => {
      cardRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [cardRef])

  const scrollBackToAnalysisRow = useCallback(() => {
    const rowId = lineAnalysis.parentRowId ?? lineAnalysis.rowId
    if (!rowId) return
    const target = analysisRowRefs.current[rowId]
    if (!target) return
    target.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [analysisRowRefs, lineAnalysis.parentRowId, lineAnalysis.rowId])

  useEffect(() => {
    scrollToAnalysisCard()
  }, [lineAnalysis.rowId, scrollToAnalysisCard])

  const analysisSeriesOverview = useMemo(() => {
    if (!lineAnalysis.rowId || !analysisSeriesRows.length || !analysisPeriods.length) return null

    const targetRow = findSeriesRowOrDetail(analysisSeriesRows, lineAnalysis.rowId)
    if (!targetRow) return null

    const rawMonthlyAmounts = getRowAmounts(targetRow, analysisPeriods)
    const rawMonthlyLabels = getPeriodLabels(analysisPeriods)

    const totalAssetsRow = analysisSeriesRows.find((r) => r.label.trim().toLowerCase() === "total des actifs")
    const rawAssetsAmounts = totalAssetsRow ? getRowAmounts(totalAssetsRow, analysisPeriods) : rawMonthlyLabels.map(() => 0)

    const monthlySeries = rawMonthlyLabels.map((label, idx) => {
      const amount = rawMonthlyAmounts[idx] ?? 0
      const assets = rawAssetsAmounts[idx] ?? 0
      const pctAssets = Math.abs(assets) < 1e-9 ? 0 : (amount / assets) * 100
      return {
        period: label,
        amount,
        amountPos: Math.max(0, amount),
        amountNeg: Math.min(0, amount),
        pctAssets,
      }
    })

    const trailing12 = monthlySeries.slice(-12)
    const trailing12Average =
      trailing12.length > 0
        ? trailing12.reduce((sum, point) => sum + point.amount, 0) / trailing12.length
        : 0
    const trailing12AveragePctAssets =
      trailing12.length > 0
        ? trailing12.reduce((sum, point) => sum + point.pctAssets, 0) / trailing12.length
        : 0

    const yearlyAgg = aggregateToYears(rawMonthlyAmounts, analysisPeriods, "last")
    const yearlyAssetsAgg = aggregateToYears(rawAssetsAmounts, analysisPeriods, "last")
    const yearlySeries = yearlyAgg.labels.map((label, idx) => {
      const amount = yearlyAgg.amounts[idx] ?? 0
      const assets = yearlyAssetsAgg.amounts[idx] ?? 0
      const pctAssets = Math.abs(assets) < 1e-9 ? 0 : (amount / assets) * 100
      return {
        period: label,
        amount,
        amountPos: Math.max(0, amount),
        amountNeg: Math.min(0, amount),
        pctAssets,
      }
    })
    const trailing5Years = yearlySeries.slice(-5)
    const trailing5YearsAverage =
      trailing5Years.length > 0
        ? trailing5Years.reduce((sum, point) => sum + point.amount, 0) / trailing5Years.length
        : 0
    const trailing5YearsAveragePctAssets =
      trailing5Years.length > 0
        ? trailing5Years.reduce((sum, point) => sum + point.pctAssets, 0) / trailing5Years.length
        : 0

    return {
      trailing12,
      trailing12Average,
      trailing12AveragePctAssets,
      trailing5Years,
      trailing5YearsAverage,
      trailing5YearsAveragePctAssets,
    }
  }, [analysisPeriods, analysisSeriesRows, lineAnalysis.rowId])

  const analysisMonthReading = useMemo(() => {
    if (!lineAnalysis.rowId || !analysisSeriesRows.length || !analysisPeriods.length) return null
    const targetRow = findSeriesRowOrDetail(analysisSeriesRows, lineAnalysis.rowId)
    if (!targetRow) return null

    const lineTrend = monthTrendFromReference(targetRow, analysisPeriods, refMonth, refYear, 13)
    const current = lineTrend[0] ?? 0
    const lastMonth = lineTrend[1] ?? 0
    const priorYearMonth = lineTrend[12] ?? 0

    const totalAssetsRow = analysisSeriesRows.find((r) => r.label.trim().toLowerCase() === "total des actifs")
    const assetsTrend = totalAssetsRow
      ? monthTrendFromReference(totalAssetsRow, analysisPeriods, refMonth, refYear, 13)
      : []

    const pctOfAssets = (amount: number, idx: number) => {
      const den = assetsTrend[idx] ?? 0
      if (Math.abs(den) < 1e-9) return 0
      return (amount / den) * 100
    }

    return {
      current,
      lastMonth,
      priorYearMonth,
      pctCurrent: pctOfAssets(current, 0),
      pctLastMonth: pctOfAssets(lastMonth, 1),
      pctPriorYearMonth: pctOfAssets(priorYearMonth, 12),
      vsLastMonthPct: calculateVariation(current, lastMonth),
      vsLastMonthDollar: current - lastMonth,
      vsPriorYearPct: calculateVariation(current, priorYearMonth),
      vsPriorYearDollar: current - priorYearMonth,
    }
  }, [lineAnalysis.rowId, analysisSeriesRows, analysisPeriods, refMonth, refYear])

  const getHorizonText = (): string => getHorizonModeLabel(view, period)

  const renderLineAnalysisBody = () => {
    const ctx = lineAnalysis
    const variation =
      ctx.current != null && ctx.prior != null ? calculateVariation(ctx.current, ctx.prior) : null
    const variationAmount = ctx.current - ctx.prior
    const accountsSorted = [...(ctx.balanceAccounts ?? [])].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    const visibleAccounts = showAllAnalysisAccounts ? accountsSorted : accountsSorted.slice(0, 4)
    const parentPostRow =
      ctx.parentRowId != null ? data.find((r) => r.rowId === ctx.parentRowId) : null
    const lineDenomBase =
      parentPostRow != null ? parentPostRow.current ?? 0 : ctx.current
    const lineDenom = Math.abs(lineDenomBase) > 1e-9 ? Math.abs(lineDenomBase) : 1
    const showComparisonAmounts = view === "comparison" && !isComparisonMode

    const monthReading = analysisMonthReading
    const fmtDeltaPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`
    const fmtDeltaUsd = (v: number) => `${v >= 0 ? "+" : ""}${formatCurrency(v)}`

    return (
      <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Lecture du poste</p>
            <span className="mx-4 h-px flex-1 bg-slate-200/90" aria-hidden />
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Vue affichée</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  Choisissez la lecture que vous voulez afficher pour ce poste.
                </p>
              </div>
              <Select
                value={lineAnalysisView}
                onValueChange={(value: "current" | "trailing12" | "trailing5years") => setLineAnalysisView(value)}
              >
                <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white px-3 text-left text-sm shadow-sm sm:w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="current" className="rounded-lg">Mois actuel</SelectItem>
                  <SelectItem value="trailing12" className="rounded-lg">12 derniers mois</SelectItem>
                  <SelectItem value="trailing5years" className="rounded-lg">5 derniers exercices</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {lineAnalysisView === "current" ? (
              analysisSeriesLoading ? (
                <div className="mt-4 flex min-h-[100px] items-center justify-center rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/80 text-sm text-slate-500">
                  Chargement de l&apos;analyse mensuelle...
                </div>
              ) : monthReading ? (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-3 shadow-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Mois actuel</p>
                      <p className="mt-0.5 text-xs text-slate-500">{formatCalendarMonthYear(refMonth, refYear)}</p>
                      <p className="mt-2 text-lg font-semibold tabular-nums tracking-tight text-[#2A2F3A]">
                        {formatCurrency(monthReading.current)}
                      </p>
                      <p className="mt-1 text-xs tabular-nums text-slate-600">{monthReading.pctCurrent.toFixed(1)}% des actifs totaux</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-3 shadow-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Mois dernier</p>
                      <p className="mt-0.5 text-xs text-slate-500">{formatPriorCalendarMonth(refMonth, refYear)}</p>
                      <p className="mt-2 text-lg font-semibold tabular-nums tracking-tight text-[#2A2F3A]">
                        {formatCurrency(monthReading.lastMonth)}
                      </p>
                      <p className="mt-1 text-xs tabular-nums text-slate-600">{monthReading.pctLastMonth.toFixed(1)}% des actifs totaux</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-3 shadow-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Mois passé</p>
                      <p className="mt-0.5 text-xs text-slate-500">{formatSameMonthPriorYear(refMonth, refYear)}</p>
                      <p className="mt-2 text-lg font-semibold tabular-nums tracking-tight text-[#2A2F3A]">
                        {formatCurrency(monthReading.priorYearMonth)}
                      </p>
                      <p className="mt-1 text-xs tabular-nums text-slate-600">{monthReading.pctPriorYearMonth.toFixed(1)}% des actifs totaux</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Mois actuel vs mois dernier
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">Variation $</p>
                          <p
                            className={cn(
                              "mt-0.5 text-base font-semibold tabular-nums",
                              monthReading.vsLastMonthDollar >= 0 ? "text-emerald-600" : "text-red-600"
                            )}
                          >
                            {fmtDeltaUsd(monthReading.vsLastMonthDollar)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">Variation %</p>
                          <p
                            className={cn(
                              "mt-0.5 text-base font-semibold tabular-nums",
                              monthReading.vsLastMonthPct >= 0 ? "text-emerald-600" : "text-red-600"
                            )}
                          >
                            {fmtDeltaPct(monthReading.vsLastMonthPct)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Mois actuel vs mois passé
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">Variation $</p>
                          <p
                            className={cn(
                              "mt-0.5 text-base font-semibold tabular-nums",
                              monthReading.vsPriorYearDollar >= 0 ? "text-emerald-600" : "text-red-600"
                            )}
                          >
                            {fmtDeltaUsd(monthReading.vsPriorYearDollar)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">Variation %</p>
                          <p
                            className={cn(
                              "mt-0.5 text-base font-semibold tabular-nums",
                              monthReading.vsPriorYearPct >= 0 ? "text-emerald-600" : "text-red-600"
                            )}
                          >
                            {fmtDeltaPct(monthReading.vsPriorYearPct)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {view === "current" ? "Montant" : getHorizonText()}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-[#2A2F3A]">
                      {ctx.current !== 0 ? formatCurrency(ctx.current) : "—"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {showComparisonAmounts ? getComparisonLabel() : "Référence"}
                    </p>
                    <p className="mt-2 text-lg font-semibold tabular-nums tracking-tight text-slate-700">
                      {showComparisonAmounts
                        ? ctx.prior !== 0
                          ? formatCurrency(ctx.prior)
                          : "—"
                        : formatCalendarMonthYear(refMonth, refYear)}
                    </p>
                  </div>

                  {(columnMode === "variationPercent" || columnMode === "variationAmount") && showComparisonAmounts ? (
                    <>
                      {columnMode === "variationPercent" ? (
                        <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm sm:col-span-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Variation %</p>
                          <p
                            className={cn(
                              "mt-2 text-lg font-semibold tabular-nums",
                              variation != null && variation >= 0 ? "text-emerald-600" : "text-red-600"
                            )}
                          >
                            {variation != null && ctx.current !== 0
                              ? `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%`
                              : "—"}
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm sm:col-span-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Variation $</p>
                          <p
                            className={cn(
                              "mt-2 text-lg font-semibold tabular-nums",
                              variationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                            )}
                          >
                            {ctx.current !== 0
                              ? `${variationAmount >= 0 ? "+" : ""}${formatCurrency(variationAmount)}`
                              : "—"}
                          </p>
                        </div>
                      )}
                    </>
                  ) : null}

                  {columnMode === "percentage" && showComparisonAmounts ? (
                    <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm sm:col-span-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">% des actifs totaux</p>
                      <p className="mt-2 text-lg font-semibold tabular-nums text-slate-800">
                        {ctx.current !== 0 ? `${getTotalAssetsPercentage(ctx.current, false).toFixed(1)}%` : "—"}
                      </p>
                    </div>
                  ) : null}
                </div>
              )
            ) : null}

            {lineAnalysisView === "trailing12" ? (
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">12 derniers mois</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">
                      Evolution mensuelle du poste et moyenne glissante sur 12 mois.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Moyenne 12 mois</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-[#2A2F3A]">
                      {analysisSeriesOverview ? formatCurrency(analysisSeriesOverview.trailing12Average) : "—"}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold tabular-nums text-slate-600">
                      {analysisSeriesOverview
                        ? `${analysisSeriesOverview.trailing12AveragePctAssets.toFixed(1)} % des actifs totaux`
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 h-52">
                  {analysisSeriesLoading ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      Chargement de l&apos;historique...
                    </div>
                  ) : analysisSeriesOverview?.trailing12.length ? (
                    <ChartContainer
                      config={{
                        amount: { label: "Montant", color: "#E0742D" },
                        pctAssets: { label: "% actifs", color: "#2563eb" },
                        average: { label: "Moyenne 12 mois", color: "#94a3b8" },
                      }}
                      className="h-full w-full"
                    >
                      <ComposedChart
                        accessibilityLayer
                        data={analysisSeriesOverview.trailing12}
                        margin={{ top: 10, right: 12, left: 8, bottom: 0 }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                        <YAxis
                          yAxisId="left"
                          orientation="left"
                          width={44}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => {
                            const n = Number(v)
                            if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`
                            if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}k`
                            return String(Math.round(n))
                          }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          width={36}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value, name) => {
                                const n = Number(value ?? 0)
                                if (name === "pctAssets") return [`${n.toFixed(1)}%`, "% des actifs totaux"]
                                if (name === "amountPos" || name === "amountNeg") {
                                  return [formatCurrency(n), name === "amountPos" ? "Montant (≥ 0)" : "Montant (< 0)"]
                                }
                                return [formatCurrency(n), String(name)]
                              }}
                            />
                          }
                        />
                        <ReferenceLine
                          yAxisId="left"
                          y={analysisSeriesOverview.trailing12Average}
                          stroke="#94a3b8"
                          strokeDasharray="4 4"
                        />
                        <ReferenceLine
                          yAxisId="right"
                          y={analysisSeriesOverview.trailing12AveragePctAssets}
                          stroke="#64748b"
                          strokeDasharray="3 3"
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="amountPos"
                          name="amountPos"
                          stackId="stack"
                          fill="var(--color-amount)"
                          radius={[0, 0, 0, 0]}
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="amountNeg"
                          name="amountNeg"
                          stackId="stack"
                          fill="#c2410c"
                          radius={[4, 4, 0, 0]}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="pctAssets"
                          name="pctAssets"
                          stroke="var(--color-pctAssets)"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      </ComposedChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      Aucune donnée historique disponible.
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {lineAnalysisView === "trailing5years" ? (
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">5 derniers exercices</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">
                      Vue d&apos;ensemble annuelle du poste avec la moyenne des 5 derniers exercices.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Moyenne 5 exercices</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-[#2A2F3A]">
                      {analysisSeriesOverview ? formatCurrency(analysisSeriesOverview.trailing5YearsAverage) : "—"}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold tabular-nums text-slate-600">
                      {analysisSeriesOverview
                        ? `${analysisSeriesOverview.trailing5YearsAveragePctAssets.toFixed(1)} % des actifs totaux`
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 h-52">
                  {analysisSeriesLoading ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      Chargement de l&apos;historique...
                    </div>
                  ) : analysisSeriesOverview?.trailing5Years.length ? (
                    <ChartContainer
                      config={{
                        amount: { label: "Montant", color: "#2A2F3A" },
                        pctAssets: { label: "% actifs", color: "#2563eb" },
                        average: { label: "Moyenne 5 exercices", color: "#E0742D" },
                      }}
                      className="h-full w-full"
                    >
                      <ComposedChart
                        accessibilityLayer
                        data={analysisSeriesOverview.trailing5Years}
                        margin={{ top: 10, right: 12, left: 8, bottom: 0 }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis
                          yAxisId="left"
                          orientation="left"
                          width={44}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => {
                            const n = Number(v)
                            if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`
                            if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}k`
                            return String(Math.round(n))
                          }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          width={36}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value, name) => {
                                const n = Number(value ?? 0)
                                if (name === "pctAssets") return [`${n.toFixed(1)}%`, "% des actifs totaux"]
                                if (name === "amountPos" || name === "amountNeg") {
                                  return [formatCurrency(n), name === "amountPos" ? "Montant (≥ 0)" : "Montant (< 0)"]
                                }
                                return [formatCurrency(n), String(name)]
                              }}
                            />
                          }
                        />
                        <ReferenceLine
                          yAxisId="left"
                          y={analysisSeriesOverview.trailing5YearsAverage}
                          stroke="#94a3b8"
                          strokeDasharray="4 4"
                        />
                        <ReferenceLine
                          yAxisId="right"
                          y={analysisSeriesOverview.trailing5YearsAveragePctAssets}
                          stroke="#64748b"
                          strokeDasharray="3 3"
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="amountPos"
                          name="amountPos"
                          stackId="stack"
                          fill="var(--color-amount)"
                          radius={[0, 0, 0, 0]}
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="amountNeg"
                          name="amountNeg"
                          stackId="stack"
                          fill="#c2410c"
                          radius={[4, 4, 0, 0]}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="pctAssets"
                          name="pctAssets"
                          stroke="var(--color-pctAssets)"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      </ComposedChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      Aucune donnée historique disponible.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <p className="mt-6 text-sm italic leading-relaxed text-[#E0742D]">
            « Une meilleure lecture du poste, de sa variation et de sa ventilation GL pour expliquer clairement ce qui bouge dans le bilan. »
          </p>
        </div>

        <div className="hidden lg:col-span-1 lg:block">
          <div className="mx-auto h-full w-px bg-gradient-to-b from-transparent via-slate-200/90 to-transparent" />
        </div>

        <div className="lg:col-span-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Ventilation du grand livre
            </p>
            <span className="mx-4 h-px flex-1 bg-slate-200/90" aria-hidden />
          </div>

          {accountsSorted.length > 0 ? (
            <ul className="mt-5 space-y-4">
              {visibleAccounts.map((acc, i) => {
                const line = accountLabelAlreadyIncludesNumber(acc.accountNumber, acc.accountName)
                  ? acc.accountName.trim()
                  : `${acc.accountNumber} — ${acc.accountName}`
                const pct = (Math.abs(acc.amount) / lineDenom) * 100
                const glSelected = !!ctx.parentRowId && ctx.rowId === acc.accountNumber
                return (
                  <li key={`${acc.accountNumber}-${i}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setLineAnalysis((prev) => {
                          if (!prev) return prev
                          if (prev.parentRowId && prev.rowId === acc.accountNumber) {
                            const parentRow = data.find((r) => r.rowId === prev.parentRowId)
                            if (!parentRow?.rowId) return prev
                            return {
                              rowId: parentRow.rowId,
                              label: parentRow.label,
                              current: parentRow.current,
                              prior: parentRow.prior,
                              balanceAccounts: parentRow.balanceAccounts,
                              trendValues: parentRow.trendValues,
                            }
                          }
                          return {
                            rowId: acc.accountNumber,
                            label: line,
                            current: acc.amount,
                            prior: acc.priorAmount ?? 0,
                            balanceAccounts: prev.balanceAccounts,
                            parentRowId: prev.parentRowId ?? prev.rowId,
                          }
                        })
                        setLineAnalysisView("current")
                      }}
                      title="Afficher la lecture analytique de ce compte"
                      aria-pressed={glSelected}
                      className={cn(
                        "w-full rounded-2xl border bg-white/90 px-4 py-3 text-left shadow-sm transition-colors",
                        glSelected
                          ? "border-[#E0742D]/55 ring-2 ring-[#E0742D]/35"
                          : "border-slate-200/90 hover:border-slate-300/90 hover:bg-slate-50/80"
                      )}
                    >
                      <div className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#E0742D]" strokeWidth={2} />
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between gap-3">
                            <p className="min-w-0 flex-1 text-sm leading-relaxed text-[#5C5F66]">{line}</p>
                            <span className="shrink-0 text-sm font-semibold tabular-nums text-[#2A2F3A]">
                              {acc.amount !== 0 ? formatCurrency(acc.amount) : "—"}
                            </span>
                          </div>
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200/70">
                            <div
                              className="h-full rounded-full bg-[#E0742D] transition-[width] duration-300"
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                            {pct.toFixed(0)} % du montant du poste (valeur absolue)
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-5 text-sm text-slate-500">
              Aucun compte GL disponible pour cette ligne.
            </div>
          )}

          {accountsSorted.length > 4 ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowAllAnalysisAccounts((prev) => !prev)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#5C5F66] transition hover:text-[#2A2F3A]"
              >
                {showAllAnalysisAccounts ? "Voir moins" : "Voir plus"}
                <ArrowRight className={cn("h-4 w-4 text-[#E0742D] transition-transform", showAllAnalysisAccounts && "rotate-90")} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  const ctx = lineAnalysis
  const vPct = ctx.current != null && ctx.prior != null ? calculateVariation(ctx.current, ctx.prior) : null
  const vAmt = ctx.current - ctx.prior
  const selectedCompany = companyId ? companies.find((c) => c.id === companyId) : null
  const selectedDivision = companyId && divisionId ? selectedCompany?.divisions.find((d) => d.id === divisionId) : null
  const selectedSubDivision =
    companyId && divisionId && subDivisionId ? selectedDivision?.subDivisions.find((sd) => sd.id === subDivisionId) : null

  const contextBits = [
    selectedCompany?.name,
    selectedDivision?.name,
    selectedSubDivision?.name,
    formatCalendarMonthYear(refMonth, refYear),
  ].filter(Boolean)

  return (
    <aside
      ref={cardRef}
      className="border-t border-slate-200 bg-gradient-to-b from-slate-50 via-white to-slate-50/60 px-5 py-6 sm:px-6 sm:py-7"
    >
      <div className="min-w-0">
        <div className="relative overflow-hidden rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-slate-50 via-white to-slate-50/70 p-5 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] sm:p-7">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_45%_at_50%_-10%,rgba(224,116,45,0.08),transparent_55%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_50%_at_100%_55%,rgba(148,163,184,0.12),transparent_65%)]" />
            <div className="absolute right-6 top-6 hidden select-none text-[92px] font-semibold leading-none tracking-tight text-[#2A2F3A]/[0.04] lg:block">
              analyse<span className="text-[#E0742D]/20">.</span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={scrollBackToAnalysisRow}
                  className="mb-3 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#2A2F3A]"
                >
                  <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Retour au poste
                </button>
                <div className="mt-5 flex items-start justify-between gap-6">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Situation</p>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#2A2F3A] sm:text-3xl">
                      {ctx.label}
                    </h3>
                    <p className="mt-3 max-w-3xl text-sm font-semibold text-[#E0742D] sm:text-base">
                      Lecture analytique du poste du bilan
                    </p>
                    {contextBits.length > 0 ? (
                      <p className="mt-4 text-xs leading-relaxed text-slate-500">{contextBits.join(" • ")}</p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-slate-300/50 to-transparent" />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full border border-slate-200/90 bg-white/85 text-slate-500 shadow-sm hover:bg-white hover:text-slate-800"
                onClick={() => setLineAnalysis(null)}
                aria-label="Fermer le panneau"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {renderLineAnalysisBody()}

            <div className="mt-10 border-t border-slate-200/80 pt-4">
              <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-[#5C5F66]">
                Documenter l&apos;analyse, expliquer les écarts et joindre les pièces justificatives
                <ArrowRight className="h-4 w-4 text-[#E0742D]" />
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200/90 bg-white/85 p-4 shadow-sm sm:p-5">
              <IncomeStatementNotePanel
                key={ctx.rowId}
                rowId={ctx.rowId}
                rowLabel={ctx.label}
                page="balance-sheet"
                period={period}
                view={view}
                companyId={companyId}
                companyName={selectedCompany?.name ?? null}
                divisionId={divisionId}
                divisionName={selectedDivision?.name ?? null}
                subDivisionId={subDivisionId}
                subDivisionName={selectedSubDivision?.name ?? null}
                currentAmount={ctx.current !== 0 ? ctx.current : null}
                priorAmount={ctx.prior !== 0 ? ctx.prior : null}
                variationPercent={vPct}
                variationAmount={vAmt !== 0 ? vAmt : null}
                referenceMonth={refMonth}
                referenceYear={refYear}
                onSaved={onNotesUpdated}
                isNarrow={false}
                embedded
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
