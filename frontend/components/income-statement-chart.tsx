"use client"

import { useState, useMemo, useEffect } from "react"
import { formatCurrency } from "@/lib/financial-utils"
import { Company } from "@/components/entity-selector"
import { ChartContainer, ChartTooltip, ChartLegend } from "@/components/ui/chart"
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { TrendingUp, TrendingDown, ChevronDown, FileText, Settings, Trash2 } from "lucide-react"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { cn } from "@/lib/utils"
import {
  dashboardCardFrameClass,
  dashboardCardRingClass,
  dashboardCardStructureSettingsButtonClass,
} from "@/lib/dashboard-card-style"
import { getHorizonModeLabel } from "@/lib/financial-statement-horizon-labels"
import {
  buildIncomePerformanceNarrative,
  mapDynamicChartToNarrativePoints,
} from "@/lib/income-performance-narrative"
import {
  DEFAULT_PERFORMANCE_CHART_CONFIG,
  DEFAULT_PERFORMANCE_CHART_CARD_TITLE,
  loadPerformanceChartConfig,
  type ChartValueFormat,
  type PerformanceChartConfigV2,
} from "@/lib/performance-chart-config"
import {
  buildPerformanceChartData,
  performanceChartSeriesMonthsNeeded,
  type DynamicChartPoint,
} from "@/lib/performance-chart-series"
import { PerformanceChartSettingsDialog } from "@/components/performance-chart-settings-dialog"

export interface IncomeStatementChartDataPoint {
  period: string
  revenue: number
  cogs: number
  grossProfit: number
  ebita: number
  grossMarginPercent: number
}

interface IncomeStatementChartProps {
  period: "monthly" | "quarterly" | "annual"
  view: "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  comparisonType?: "lastMonth" | "pastMonth" | "budget"
  selectedBudgetId?: string | null
  selectedBudgetName?: string | null
  fiscalYear?: number
  referenceMonth?: number
  chartData?: IncomeStatementChartDataPoint[]
  loading?: boolean
  structureVersion?: number
  /** Config locale par graphique (plusieurs cartes sur le tableau de bord). */
  chartInstanceId?: string
  /** Affichage discret « n / N » lorsqu’il y a plusieurs graphiques. */
  chartSlotNumber?: number
  chartSlotCount?: number
  /** Tableau de bord : retirer ce graphique (slots additionnels uniquement). */
  onRemoveChart?: () => void
}

type ChartViewType = "revenue_ebita_margin" | "cogs_grossprofit_margin"

function PerformanceChartRemoveButton({ onRemove }: { onRemove: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 text-slate-400 hover:bg-red-50 hover:text-red-700"
          aria-label="Retirer ce graphique du tableau de bord"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-slate-200 sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-slate-900">Supprimer ce graphique&nbsp;?</AlertDialogTitle>
          <AlertDialogDescription className="text-left text-slate-600">
            Vous allez retirer ce graphique du tableau de bord. La configuration enregistrée sur cet appareil (séries,
            titre, couleurs) pour cette société sera supprimée définitivement. Une suppression par inadvertance peut
            provoquer une erreur ou un comportement inattendu&nbsp;: confirmez seulement si c’est bien ce que vous voulez
            faire. Vous pourrez ajouter un nouveau graphique ensuite.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel className="rounded-full border-slate-200">Annuler</AlertDialogCancel>
          <AlertDialogAction
            className="rounded-full bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600"
            onClick={onRemove}
          >
            Supprimer le graphique
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

const dashboardStyleCard = cn(dashboardCardFrameClass, "z-10 transition-all duration-500 ease-out")
const dashboardStyleCardAccent = dashboardCardRingClass

function isLegacyPoint(row: unknown): row is IncomeStatementChartDataPoint {
  if (!row || typeof row !== "object") return false
  const r = row as Record<string, unknown>
  return (
    typeof r.period === "string" &&
    typeof r.revenue === "number" &&
    typeof r.ebita === "number" &&
    typeof r.grossMarginPercent === "number"
  )
}

function formatSeriesValue(v: number, fmt: ChartValueFormat): string {
  if (fmt === "ratio") return `${v.toFixed(1)}%`
  return formatCurrency(v)
}

type PerformanceNarrativeResult = NonNullable<ReturnType<typeof buildIncomePerformanceNarrative>>

function IncomePerformanceNarrativeSection({ narrative }: { narrative: PerformanceNarrativeResult }) {
  return (
    <div className="w-full border-t border-slate-200 bg-gradient-to-b from-slate-50/80 to-white px-6 pb-8 pt-10 sm:px-7 sm:pb-9 sm:pt-12">
      <div className="flex w-full max-w-none items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white shadow-sm">
          <FileText className="h-4 w-4 text-slate-600" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0 w-full flex-1">
          <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">{narrative.title}</h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Synthèse factuelle à partir des séries affichées (variations séquentielles et lecture de fenêtre).
          </p>
          <div className="mt-5 space-y-5">
            {narrative.paragraphs.map((p) => (
              <div key={p.heading}>
                <p className="text-sm font-semibold text-[#2A2F3A]">{p.heading}</p>
                <p className="mt-2 text-sm leading-relaxed text-[#5C5F66] text-pretty">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function IncomeStatementChart({
  period,
  view,
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  comparisonType = "lastMonth",
  selectedBudgetId = null,
  selectedBudgetName = null,
  fiscalYear,
  referenceMonth,
  chartData,
  loading = false,
  structureVersion = 0,
  chartInstanceId = "default",
  chartSlotNumber,
  chartSlotCount,
  onRemoveChart,
}: IncomeStatementChartProps) {
  const [selectedChartView, setSelectedChartView] = useState<ChartViewType>("revenue_ebita_margin")
  const [showRevenue, setShowRevenue] = useState(true)
  const [showEBITA, setShowEBITA] = useState(true)
  const [showGrossMargin, setShowGrossMargin] = useState(true)
  const [perfConfig, setPerfConfig] = useState<PerformanceChartConfigV2>(DEFAULT_PERFORMANCE_CHART_CONFIG)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [visibleSeriesIds, setVisibleSeriesIds] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(DEFAULT_PERFORMANCE_CHART_CONFIG.series.map((s) => [s.id, s.showOnChart]))
  )

  const refMonth = referenceMonth ?? new Date().getMonth() + 1
  const refYear = fiscalYear ?? new Date().getFullYear()

  const seriesMonthsNeeded = performanceChartSeriesMonthsNeeded(view)
  const { rows: seriesRows, periods: seriesPeriods, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "income-statement",
    fiscalYear: fiscalYear || new Date().getFullYear(),
    months: seriesMonthsNeeded,
    divisionId: divisionId || undefined,
    subDivisionId: subDivisionId || undefined,
    enabled: !chartData,
    structureVersion,
  })

  useEffect(() => {
    const cfg = loadPerformanceChartConfig(companyId ?? null, chartInstanceId)
    setPerfConfig(cfg)
    setVisibleSeriesIds(Object.fromEntries(cfg.series.map((s) => [s.id, s.showOnChart])))
  }, [companyId, chartInstanceId])

  const dynamicBuild = useMemo(() => {
    if (chartData || !seriesRows.length || !seriesPeriods.length) return null
    return buildPerformanceChartData(perfConfig, seriesRows, seriesPeriods, view, refMonth, refYear)
  }, [chartData, seriesRows, seriesPeriods, view, refMonth, refYear, perfConfig])

  const dynamicPoints = dynamicBuild?.points ?? null
  const seriesMeta = dynamicBuild?.series ?? []

  const effectiveChartData: IncomeStatementChartDataPoint[] | DynamicChartPoint[] | null =
    chartData ?? dynamicPoints
  const effectiveLoading = loading || (seriesLoading && !chartData)

  const legacyFirst = effectiveChartData?.[0]
  const isLegacyData = !!legacyFirst && isLegacyPoint(legacyFirst)

  const performanceNarrative = useMemo(() => {
    if (!isLegacyData || !effectiveChartData?.length) return null
    return buildIncomePerformanceNarrative(effectiveChartData as IncomeStatementChartDataPoint[], view)
  }, [isLegacyData, effectiveChartData, view])

  const dynamicPerformanceNarrative = useMemo(() => {
    if (isLegacyData || !dynamicPoints?.length || !seriesMeta.length) return null
    const mapped = mapDynamicChartToNarrativePoints(dynamicPoints, seriesMeta)
    if (!mapped) return null
    return buildIncomePerformanceNarrative(mapped, view)
  }, [isLegacyData, dynamicPoints, seriesMeta, view])

  const settingsDialog = (
    <PerformanceChartSettingsDialog
      open={settingsOpen}
      onOpenChange={setSettingsOpen}
      companyId={companyId}
      chartInstanceId={chartInstanceId}
      onSaved={() => {
        if (!companyId) return
        const cfg = loadPerformanceChartConfig(companyId, chartInstanceId)
        setPerfConfig(cfg)
        setVisibleSeriesIds(Object.fromEntries(cfg.series.map((s) => [s.id, s.showOnChart])))
      }}
    />
  )

  const slotBadge =
    chartSlotCount != null && chartSlotCount > 1 && chartSlotNumber != null ? (
      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-500">
        {chartSlotNumber}/{chartSlotCount}
      </span>
    ) : null

  const getHorizonText = (): string => getHorizonModeLabel(view, period)

  const getComparisonLabel = (): string => {
    if (comparisonType === "lastMonth") {
      if (view === "ytd") return "YTD précédent"
      if (view === "ddm") return "DDM précédent"
      if (period === "monthly") return "Mois précédent"
      if (period === "quarterly") return "Trimestre précédent"
      return "Année précédente"
    }
    if (comparisonType === "pastMonth") {
      if (view === "ytd") return "YTD passé"
      if (view === "ddm") return "DDM passé"
      if (period === "monthly") return "Mois passé"
      if (period === "quarterly") return "Trimestre passé"
      return "Année passée"
    }
    if (comparisonType === "budget") {
      if (selectedBudgetName) {
        if (view === "ytd") return `Budget ${selectedBudgetName} (YTD)`
        if (view === "ddm") return `Budget ${selectedBudgetName} (DDM)`
        if (period === "monthly") return `Budget ${selectedBudgetName}`
        if (period === "quarterly") return `Budget ${selectedBudgetName} (Trimestre)`
        return `Budget ${selectedBudgetName} (Année)`
      }
      if (view === "ytd") return "YTD budgeté"
      if (view === "ddm") return "DDM budgeté"
      if (period === "monthly") return "Mois budgeté"
      if (period === "quarterly") return "Trimestre budgeté"
      return "Année budgetée"
    }
    return "Mois précédent"
  }

  const getBaseTitle = (): string => {
    if (view === "comparison") {
      const comparisonLabel = getComparisonLabel()
      switch (selectedChartView) {
        case "revenue_ebita_margin":
          return "Performance financière"
        case "cogs_grossprofit_margin":
          return `CMV, Bénéfice Brut et Marge brute - Mois courant vs ${comparisonLabel}`
        default:
          return "Performance financière"
      }
    }
    switch (selectedChartView) {
      case "revenue_ebita_margin":
        return "Performance financière"
      case "cogs_grossprofit_margin":
        return "CMV, Bénéfice Brut et Marge brute"
      default:
        return "Performance financière"
    }
  }

  const storedChartTitle = perfConfig.chartTitle.trim()
  const cardTitle =
    storedChartTitle && storedChartTitle !== DEFAULT_PERFORMANCE_CHART_CARD_TITLE
      ? storedChartTitle
      : isLegacyData
        ? getBaseTitle()
        : DEFAULT_PERFORMANCE_CHART_CARD_TITLE

  const legacyChartConfig = useMemo(() => {
    const labels = {
      revenue: perfConfig.series[0]?.label ?? "Revenus",
      grossProfit: perfConfig.series.find((_, i) => i === 1)?.label ?? "Bénéfice brut",
      ebita: perfConfig.series.find((s) => s.label.toLowerCase().includes("baii"))?.label ?? "BAIIA",
      grossMargin: perfConfig.series.find((s) => s.kind === "line")?.label ?? "Marge brute (%)",
    }
    return {
      revenue: { label: labels.revenue, color: "#3b82f6" },
      cogs: { label: "CMV", color: "#ef4444" },
      grossProfit: { label: labels.grossProfit, color: "#10b981" },
      ebita: { label: labels.ebita, color: "#10b981" },
      grossMarginPercent: { label: labels.grossMargin, color: "#f59e0b" },
    }
  }, [perfConfig.series])

  const dynamicChartConfig = useMemo(() => {
    const c: Record<string, { label: string; color: string }> = {}
    for (const m of seriesMeta) {
      c[m.dataKey] = { label: m.label, color: m.color }
    }
    return c
  }, [seriesMeta])

  const needRightAxis = useMemo(() => {
    if (isLegacyData) return true
    return seriesMeta.some((m) => m.yAxis === "right" && visibleSeriesIds[m.id] !== false)
  }, [isLegacyData, seriesMeta, visibleSeriesIds])

  if (effectiveLoading) {
    return (
      <>
        <div className={`mb-6 flex h-64 items-center justify-center ${dashboardStyleCard}`}>
          <div className={dashboardStyleCardAccent} aria-hidden />
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E0742D]" />
        </div>
        {settingsDialog}
      </>
    )
  }

  if (!effectiveChartData || effectiveChartData.length === 0) {
    return (
      <>
        <div className={`mb-6 flex min-h-64 flex-col items-center justify-center gap-3 px-4 py-8 ${dashboardStyleCard}`}>
          <div className={dashboardStyleCardAccent} aria-hidden />
          <p className="relative text-center text-sm text-[#5C5F66]">Aucune donnée disponible pour ce graphique.</p>
          {companyId && !chartData ? (
            <p className="max-w-md text-center text-xs text-slate-500">
              Vérifiez les séries et liaisons dans Paramètres. Les codes doivent correspondre à des lignes présentes
              dans les séries.
            </p>
          ) : null}
          {companyId && !chartData ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                className={dashboardCardStructureSettingsButtonClass}
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="h-4 w-4" aria-hidden />
                Paramètres du graphique
              </Button>
              {onRemoveChart ? <PerformanceChartRemoveButton onRemove={onRemoveChart} /> : null}
            </div>
          ) : onRemoveChart ? (
            <PerformanceChartRemoveButton onRemove={onRemoveChart} />
          ) : null}
        </div>
        {settingsDialog}
      </>
    )
  }

  /* ---------- Rendu dynamique (séries API + config v2) ---------- */
  if (!isLegacyData && dynamicPoints && seriesMeta.length) {
    const setVis = (id: string, v: boolean) => setVisibleSeriesIds((prev) => ({ ...prev, [id]: v }))
    const sideSeries = seriesMeta.filter((m) => m.showInSidePanel)

    return (
      <>
        <div className={`group mb-6 ${dashboardStyleCard}`}>
          <div className={dashboardStyleCardAccent} aria-hidden />
          <div className="relative border-b border-slate-200 bg-white/90 px-6 py-5 sm:px-7">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                  <TrendingUp className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="mb-1 flex flex-wrap items-center text-xl font-semibold leading-tight tracking-tight text-[#2A2F3A] text-balance">
                    {cardTitle}
                    {slotBadge}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[#5C5F66]">
                    <span className="font-medium text-slate-700">{getHorizonText()}</span>
                    <span className="text-slate-300">•</span>
                    {companyId ? (
                      <span className="font-semibold text-[#2A2F3A]">
                        {companies.find((c) => c.id === companyId)?.name || "Société sélectionnée"}
                      </span>
                    ) : (
                      <span className="truncate">Toutes les sociétés</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex min-w-0 max-w-full shrink flex-wrap items-center justify-end gap-3">
                <div className="flex min-w-0 max-w-[min(100%,28rem)] flex-wrap items-center justify-end gap-x-4 gap-y-2">
                  {seriesMeta.map((m) => (
                    <label key={m.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={visibleSeriesIds[m.id] !== false}
                        onChange={(e) => setVis(m.id, e.target.checked)}
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-500 focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="truncate">{m.label}</span>
                    </label>
                  ))}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {companyId && !chartData ? (
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(dashboardCardStructureSettingsButtonClass, "shrink-0")}
                      onClick={() => setSettingsOpen(true)}
                      aria-label={`Paramètres du graphique ${cardTitle}`}
                    >
                      <Settings className="h-4 w-4" aria-hidden />
                      <span className="hidden sm:inline">Paramètres</span>
                    </Button>
                  ) : null}
                  {onRemoveChart ? <PerformanceChartRemoveButton onRemove={onRemoveChart} /> : null}
                </div>
              </div>
            </div>
          </div>

          <div className="relative bg-white">
            <div className="px-6 py-6 sm:px-7">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                <div className="lg:col-span-1 space-y-3">
                  {sideSeries.map((m, blockIdx) => {
                    const key = m.dataKey
                    const vals = dynamicPoints.map((p) => (p as Record<string, number>)[key] ?? 0)
                    const last = vals[0] ?? 0
                    const prior = vals.length > 1 ? vals[1]! : undefined
                    const variationPct =
                      prior !== undefined && Math.abs(prior) > 1e-9
                        ? ((last - prior) / Math.abs(prior)) * 100
                        : 0
                    const isPositive = prior === undefined || last - prior >= 0
                    const primary =
                      m.valueFormat === "currency"
                        ? formatCurrency(last)
                        : formatSeriesValue(last, m.valueFormat)
                    return (
                      <div key={m.id} className={blockIdx > 0 ? "border-t border-slate-200 pt-3" : "pb-1"}>
                        <div className="mb-1 text-xs font-medium text-[#5C5F66]">{m.label}</div>
                        <div className="mb-1.5 text-xl font-semibold text-[#2A2F3A]">{primary}</div>
                        {prior !== undefined ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            {isPositive ? (
                              <TrendingUp className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-600" />
                            )}
                            <span
                              className={`font-medium ${isPositive ? "text-emerald-600" : "text-red-600"}`}
                            >
                              {variationPct >= 0 ? "+" : ""}
                              {variationPct.toFixed(1)}%
                            </span>
                            <span className="text-slate-500">vs période précédente</span>
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>

                <div className="lg:col-span-4">
                  <ChartContainer config={dynamicChartConfig} className="h-[400px] w-full">
                    <ComposedChart data={dynamicPoints} margin={{ top: 20, right: 50, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="period"
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        tickLine={{ stroke: "#cbd5e1" }}
                        axisLine={{ stroke: "#cbd5e1" }}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        tickLine={{ stroke: "#cbd5e1" }}
                        axisLine={{ stroke: "#cbd5e1" }}
                        tickFormatter={(value) => formatCurrency(value)}
                      />
                      {needRightAxis ? (
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fill: "#64748b", fontSize: 12 }}
                          tickLine={{ stroke: "#cbd5e1" }}
                          axisLine={{ stroke: "#cbd5e1" }}
                          tickFormatter={(value) => {
                            const right = seriesMeta.filter((s) => s.yAxis === "right")
                            if (right.some((s) => s.valueFormat === "currency")) {
                              return formatCurrency(value)
                            }
                            return `${value.toFixed(1)}%`
                          }}
                        />
                      ) : null}
                      <ChartTooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          return (
                            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                              <p className="mb-2 text-sm font-semibold text-slate-900">{payload[0]?.payload?.period}</p>
                              {payload.map((entry, index) => {
                                const meta = seriesMeta.find((x) => x.dataKey === entry.dataKey)
                                const fmt = meta?.valueFormat ?? "currency"
                                const val = entry.value as number
                                const text =
                                  fmt === "currency" ? formatCurrency(val) : formatSeriesValue(val, fmt)
                                return (
                                  <div key={index} className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                    <span className="text-sm text-slate-600">{entry.name}:</span>
                                    <span className="text-sm font-bold text-slate-900">{text}</span>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        }}
                      />
                      <ChartLegend
                        content={({ payload }) => (
                          <div className="mt-4 flex flex-wrap justify-center gap-6">
                            {payload?.map((entry, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-sm text-slate-600">{entry.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      />
                      {seriesMeta.map((m) => {
                        if (visibleSeriesIds[m.id] === false) return null
                        if (m.kind === "bar") {
                          return (
                            <Bar
                              key={`bar-${m.id}`}
                              yAxisId={m.yAxis}
                              dataKey={m.dataKey}
                              name={m.label}
                              fill={m.color}
                              radius={[4, 4, 0, 0]}
                              opacity={0.85}
                            />
                          )
                        }
                        return (
                          <Line
                            key={`line-${m.id}`}
                            yAxisId={m.yAxis}
                            type="monotone"
                            dataKey={m.dataKey}
                            name={m.label}
                            stroke={m.color}
                            strokeWidth={3}
                            dot={{ fill: m.color, r: 5 }}
                            activeDot={{ r: 7 }}
                          />
                        )
                      })}
                      <ReferenceLine yAxisId="left" y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
                    </ComposedChart>
                  </ChartContainer>
                </div>
              </div>
            </div>
          </div>
          {dynamicPerformanceNarrative ? <IncomePerformanceNarrativeSection narrative={dynamicPerformanceNarrative} /> : null}
        </div>
        {settingsDialog}
      </>
    )
  }

  /* ---------- Rendu legacy (prop chartData ou shape classique) ---------- */
  const dataLegacy = effectiveChartData as IncomeStatementChartDataPoint[]

  return (
    <>
      <div className={`group mb-6 ${dashboardStyleCard}`}>
        <div className={dashboardStyleCardAccent} aria-hidden />
        <div className="relative border-b border-slate-200 bg-white/90 px-6 py-5 sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                <TrendingUp className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <Select
                  value={selectedChartView}
                  onValueChange={(value) => setSelectedChartView(value as ChartViewType)}
                >
                  <SelectTrigger className="mb-1 inline-flex h-auto w-auto items-center gap-2 border-0 bg-transparent p-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 [&>svg:last-child]:hidden">
                    <h3 className="flex flex-wrap items-center gap-2 text-xl font-semibold leading-tight tracking-tight text-[#2A2F3A] text-balance">
                      {cardTitle}
                      {slotBadge}
                    </h3>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue_ebita_margin">Performance financière</SelectItem>
                    <SelectItem value="cogs_grossprofit_margin">CMV, Bénéfice Brut et Marge brute</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap items-center gap-3 text-sm text-[#5C5F66]">
                  <span className="font-medium text-slate-700">{getHorizonText()}</span>
                  <span className="text-slate-300">•</span>
                  {subDivisionId && divisionId && companyId ? (
                    <>
                      <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                      <span className="text-slate-300">•</span>
                      <span>
                        {companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name ||
                          "Division"}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="font-semibold text-[#2A2F3A]">
                        {companies
                          .find((c) => c.id === companyId)
                          ?.divisions.find((d) => d.id === divisionId)
                          ?.subDivisions.find((sd) => sd.id === subDivisionId)?.name || "Sous-division"}
                      </span>
                    </>
                  ) : divisionId && companyId ? (
                    <>
                      <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                      <span className="text-slate-300">•</span>
                      <span className="font-semibold text-[#2A2F3A]">
                        {companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name ||
                          "Division"}
                      </span>
                    </>
                  ) : companyId ? (
                    <span className="font-semibold text-[#2A2F3A]">
                      {companies.find((c) => c.id === companyId)?.name || "Société sélectionnée"}
                    </span>
                  ) : (
                    <span className="truncate">Toutes les sociétés</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex min-w-0 max-w-full shrink flex-wrap items-center justify-end gap-3">
              {selectedChartView === "revenue_ebita_margin" && (
                <div className="flex max-w-full flex-wrap items-center justify-end gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`toggle-revenue-${chartInstanceId}`}
                      checked={showRevenue}
                      onChange={(e) => setShowRevenue(e.target.checked)}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-500 focus:ring-2 focus:ring-emerald-500"
                    />
                    <label htmlFor={`toggle-revenue-${chartInstanceId}`} className="cursor-pointer text-sm text-slate-700">
                      {legacyChartConfig.revenue.label}
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`toggle-ebita-${chartInstanceId}`}
                      checked={showEBITA}
                      onChange={(e) => setShowEBITA(e.target.checked)}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-500 focus:ring-2 focus:ring-emerald-500"
                    />
                    <label htmlFor={`toggle-ebita-${chartInstanceId}`} className="cursor-pointer text-sm text-slate-700">
                      {legacyChartConfig.ebita.label}
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`toggle-margin-${chartInstanceId}`}
                      checked={showGrossMargin}
                      onChange={(e) => setShowGrossMargin(e.target.checked)}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-500 focus:ring-2 focus:ring-emerald-500"
                    />
                    <label htmlFor={`toggle-margin-${chartInstanceId}`} className="cursor-pointer text-sm text-slate-700">
                      {legacyChartConfig.grossMarginPercent.label}
                    </label>
                  </div>
                </div>
              )}
              <div className="flex shrink-0 items-center gap-1">
                {companyId && !chartData ? (
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(dashboardCardStructureSettingsButtonClass, "shrink-0")}
                    onClick={() => setSettingsOpen(true)}
                    aria-label={`Paramètres du graphique ${cardTitle}`}
                  >
                    <Settings className="h-4 w-4" aria-hidden />
                    <span className="hidden sm:inline">Paramètres</span>
                  </Button>
                ) : null}
                {onRemoveChart ? <PerformanceChartRemoveButton onRemove={onRemoveChart} /> : null}
              </div>
            </div>
          </div>
        </div>

        <div className="relative bg-white">
          <div className="px-6 py-6 sm:px-7">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <div className="lg:col-span-1">
                <div className="pb-3">
                  <div className="mb-1 text-xs font-medium text-[#5C5F66]">
                    {legacyChartConfig.revenue.label} totaux
                  </div>
                  <div className="mb-1.5 text-xl font-semibold text-[#2A2F3A]">
                    {formatCurrency(dataLegacy.reduce((sum, d) => sum + (d.revenue || 0), 0))}
                  </div>
                  {(() => {
                    const recent = dataLegacy[0]!
                    const prior = dataLegacy.length > 1 ? dataLegacy[1] : undefined
                    const revenuePrevious = (recent as { revenuePrevious?: number }).revenuePrevious
                    const variation =
                      revenuePrevious !== undefined && revenuePrevious !== null
                        ? recent.revenue - revenuePrevious
                        : prior !== undefined
                          ? recent.revenue - prior.revenue
                          : 0
                    const variationPercent =
                      revenuePrevious !== undefined && revenuePrevious !== null && revenuePrevious > 0
                        ? ((recent.revenue - revenuePrevious) / revenuePrevious) * 100
                        : prior !== undefined && prior.revenue > 0
                          ? ((recent.revenue - prior.revenue) / prior.revenue) * 100
                          : 0
                    const isPositive = variation >= 0
                    return (
                      <div className="flex items-center gap-1.5 text-xs">
                        {isPositive ? (
                          <TrendingUp className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-600" />
                        )}
                        <span className={`font-medium ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                          {isPositive ? "+" : ""}
                          {variationPercent.toFixed(1)}%
                        </span>
                        <span className="text-slate-500">vs période précédente</span>
                      </div>
                    )
                  })()}
                </div>

                <div className="my-3 border-b border-slate-200" />

                <div className="pb-3">
                  <div className="mb-1 text-xs font-medium text-slate-500">{legacyChartConfig.ebita.label} moyen</div>
                  <div className="mb-1.5 text-xl font-semibold text-slate-900">
                    {formatCurrency(
                      dataLegacy.reduce((sum, d) => sum + (d.ebita || 0), 0) / dataLegacy.length
                    )}
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-500">
                      {(
                        (dataLegacy.reduce((sum, d) => sum + (d.ebita || 0), 0) /
                          dataLegacy.length /
                          (dataLegacy.reduce((sum, d) => sum + (d.revenue || 0), 0) / dataLegacy.length)) *
                        100
                      ).toFixed(0)}
                      % des {legacyChartConfig.revenue.label.toLowerCase()}
                    </span>
                  </div>
                </div>

                <div className="my-3 border-b border-slate-200" />

                <div>
                  <div className="mb-1 text-xs font-medium text-[#5C5F66]">{legacyChartConfig.grossProfit.label}</div>
                  <div className="mb-1.5 text-xl font-semibold text-[#2A2F3A]">
                    {formatCurrency(
                      dataLegacy.reduce((sum, d) => sum + (d.grossProfit || 0), 0) / dataLegacy.length
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {(
                      dataLegacy.reduce((sum, d) => sum + (d.grossMarginPercent || 0), 0) / dataLegacy.length
                    ).toFixed(0)}
                    % des {legacyChartConfig.revenue.label.toLowerCase()}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4">
                <ChartContainer config={legacyChartConfig} className="h-[400px] w-full">
                  <ComposedChart data={dataLegacy} margin={{ top: 20, right: 50, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="period"
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      tickLine={{ stroke: "#cbd5e1" }}
                      axisLine={{ stroke: "#cbd5e1" }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      tickLine={{ stroke: "#cbd5e1" }}
                      axisLine={{ stroke: "#cbd5e1" }}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    {(selectedChartView === "revenue_ebita_margin" ||
                      selectedChartView === "cogs_grossprofit_margin") && (
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        tickLine={{ stroke: "#cbd5e1" }}
                        axisLine={{ stroke: "#cbd5e1" }}
                        tickFormatter={(value) => `${value.toFixed(1)}%`}
                      />
                    )}
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                              <p className="mb-2 text-sm font-semibold text-slate-900">{payload[0].payload.period}</p>
                              {payload.map((entry, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                  <span className="text-sm text-slate-600">{entry.name}:</span>
                                  <span className="text-sm font-bold text-slate-900">
                                    {entry.dataKey === "grossMarginPercent"
                                      ? `${(entry.value as number).toFixed(1)}%`
                                      : formatCurrency(entry.value as number)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <ChartLegend
                      content={({ payload }) => (
                        <div className="mt-4 flex justify-center gap-6">
                          {payload?.map((entry, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                              <span className="text-sm text-slate-600">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    />
                    {selectedChartView === "revenue_ebita_margin" && showRevenue && (
                      <Bar
                        yAxisId="left"
                        dataKey="revenue"
                        fill={legacyChartConfig.revenue.color}
                        radius={[4, 4, 0, 0]}
                        opacity={0.8}
                        name={legacyChartConfig.revenue.label}
                      />
                    )}
                    {selectedChartView === "revenue_ebita_margin" && showEBITA && (
                      <Bar
                        yAxisId="left"
                        dataKey="ebita"
                        fill={legacyChartConfig.ebita.color}
                        radius={[4, 4, 0, 0]}
                        opacity={0.8}
                        name={legacyChartConfig.ebita.label}
                      />
                    )}
                    {selectedChartView === "revenue_ebita_margin" && showGrossMargin && (
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="grossMarginPercent"
                        stroke={legacyChartConfig.grossMarginPercent.color}
                        strokeWidth={3}
                        dot={{ fill: legacyChartConfig.grossMarginPercent.color, r: 5 }}
                        activeDot={{ r: 7 }}
                        name={legacyChartConfig.grossMarginPercent.label}
                      />
                    )}
                    {selectedChartView === "cogs_grossprofit_margin" && (
                      <Bar
                        yAxisId="left"
                        dataKey="cogs"
                        fill={legacyChartConfig.cogs.color}
                        radius={[0, 0, 0, 0]}
                        opacity={0.8}
                        name={legacyChartConfig.cogs.label}
                        stackId="revenue"
                      />
                    )}
                    {selectedChartView === "cogs_grossprofit_margin" && (
                      <Bar
                        yAxisId="left"
                        dataKey="grossProfit"
                        fill={legacyChartConfig.grossProfit.color}
                        radius={[4, 4, 0, 0]}
                        opacity={0.8}
                        name={legacyChartConfig.grossProfit.label}
                        stackId="revenue"
                      />
                    )}
                    {selectedChartView === "cogs_grossprofit_margin" && (
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="grossMarginPercent"
                        stroke={legacyChartConfig.grossMarginPercent.color}
                        strokeWidth={3}
                        dot={{ fill: legacyChartConfig.grossMarginPercent.color, r: 5 }}
                        activeDot={{ r: 7 }}
                        name={legacyChartConfig.grossMarginPercent.label}
                      />
                    )}
                    <ReferenceLine yAxisId="left" y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
                  </ComposedChart>
                </ChartContainer>
              </div>
            </div>
          </div>
        </div>

        {selectedChartView === "revenue_ebita_margin" && performanceNarrative ? (
          <IncomePerformanceNarrativeSection narrative={performanceNarrative} />
        ) : null}
      </div>
      {settingsDialog}
    </>
  )
}
