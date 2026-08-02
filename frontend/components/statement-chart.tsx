"use client"

import { useState, useMemo, useEffect, type ReactNode } from "react"
import { formatCurrency } from "@/lib/financial-utils"
import { Company } from "@/components/entity-selector"
import { ChartContainer, ChartTooltip, ChartLegend } from "@/components/ui/chart"
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
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
import { TrendingUp, TrendingDown, ChevronDown, Settings, Trash2 } from "lucide-react"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { useDivisionSeriesBundle } from "@/hooks/use-division-series-bundle"
import { useStandardLinkCodesFlat } from "@/hooks/use-standard-link-codes"
import { listAccountMappings, getStatementStructure, type AccountMappingData } from "@/lib/api"
import { enrichRevenueSeriesForNarrative } from "@/lib/revenue-series-narrative-enrichment"
import { buildRevenueContributiveMarginRows } from "@/lib/revenue-contributive-margin-table"
import { RevenueContributiveMarginTable } from "@/components/diagnostic/v2/revenue-contributive-margin-table"
import { RevenueContributiveMarginEvolutionTable } from "@/components/diagnostic/v2/revenue-contributive-margin-evolution-table"
import { IncomePerformanceNarrativeSection } from "@/components/diagnostic/v2/income-performance-narrative-section"
import { ExpenseContributionBridgeChart } from "@/components/diagnostic/v2/expense-contribution-bridge-chart"
import { ExpenseBreakevenChart } from "@/components/diagnostic/v2/expense-breakeven-chart"
import { buildRevenueContributiveMarginEvolutionTables } from "@/lib/revenue-contributive-margin-evolution"
import { buildExpenseContributionBridge } from "@/lib/expense-contribution-bridge"
import { computeBreakevenAnalysis } from "@/lib/expense-breakeven"
import { buildExpensesBridgeNarrative } from "@/lib/expense-bridge-narrative"
import { buildExpenseBridgeNarrativeContext } from "@/lib/expense-bridge-narrative-context"
import { buildExpenseCostBreakdownTables } from "@/lib/expense-cost-breakdown-tables"
import {
  buildDivisionProfitabilityRows,
  buildDivisionProfitabilitySlices,
} from "@/lib/division-profitability"
import { buildDivisionProfitabilityEvolutionTables } from "@/lib/division-profitability-evolution"
import { buildDivisionProfitabilityNarrative } from "@/lib/division-profitability-narrative"
import { DivisionProfitabilityTable } from "@/components/diagnostic/v2/division-profitability-table"
import { FinancialPositionChart } from "@/components/diagnostic/v2/financial-position-chart"
import { WorkingCapitalDiagnosticChart } from "@/components/diagnostic/v2/working-capital-diagnostic-chart"
import { buildFinancialPositionResult } from "@/lib/financial-position"
import { buildFinancialPositionBreakdownTables } from "@/lib/financial-position-breakdown"
import { buildFinancialPositionNarrative } from "@/lib/financial-position-narrative"
import { buildWorkingCapitalDiagnosticResult } from "@/lib/working-capital-diagnostic"
import { buildWorkingCapitalCompositionResult } from "@/lib/working-capital-composition"
import { buildWorkingCapitalDiagnosticNarrative } from "@/lib/working-capital-diagnostic-narrative"
import { WORKING_CAPITAL_IS_TTM_LOOKBACK_MONTHS } from "@/lib/working-capital-structure-utils"
import type { FinancialPositionSettingsPanel } from "@/lib/financial-position-config"
import { cn } from "@/lib/utils"
import {
  dashboardCardFrameClass,
  dashboardCardRingClass,
  dashboardCardStructureSettingsButtonClass,
} from "@/lib/dashboard-card-style"
import { CARD_CLASS } from "@/lib/diagnostic-theme"
import { getHorizonModeLabel } from "@/lib/financial-statement-horizon-labels"
import {
  buildIncomePerformanceNarrative,
  buildRevenueOnlyPerformanceNarrative,
  buildContributiveMarginByRevenueNarrative,
  mapDynamicChartToNarrativePoints,
  mapDynamicChartToRevenueSeriesNarratives,
  type PerformanceNarrativeResult,
} from "@/lib/income-performance-narrative"
import {
  defaultChartCardTitle,
  seriesStatementTypeForChart,
  type ChartSlot,
  type ChartValueFormat,
  type StatementChartConfig,
  type StatementType,
} from "@/lib/statement-chart-config"
import {
  buildPerformanceChartData,
  performanceChartSeriesMonthsNeeded,
} from "@/lib/performance-chart-series"
import { StatementChartSettingsDialog } from "@/components/statement-chart-settings-dialog"
import { HORIZON_LABEL } from "@/lib/financial-statement-horizon-labels"

export type ChartHorizonToggleValue = "years" | "12months"

export type ChartHorizonToggleProps = {
  value: ChartHorizonToggleValue
  onChange: (value: ChartHorizonToggleValue) => void
  variant?: "default" | "diagnostic"
}

export function EmbeddedHorizonToggle({
  value,
  onChange,
  variant = "default",
}: ChartHorizonToggleProps) {
  const options: { id: ChartHorizonToggleValue; label: string }[] = [
    { id: "years", label: HORIZON_LABEL.annuel5Ans },
    { id: "12months", label: HORIZON_LABEL.mensuel },
  ]
  const isDiagnostic = variant === "diagnostic"
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={cn(
          isDiagnostic
            ? "text-[9.5px] font-semibold uppercase leading-tight tracking-[.08em] text-slate-400"
            : "text-[11px] font-medium uppercase tracking-wide text-slate-500",
        )}
      >
        Horizon
      </span>
      <div
        className="flex gap-[3px] rounded-[9px] border border-slate-200 bg-slate-100 p-[3px]"
        role="group"
        aria-label="Horizon du graphique"
      >
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            aria-pressed={value === opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              "cursor-pointer rounded-md font-semibold transition-colors",
              isDiagnostic ? "px-2.5 py-1 text-[10.5px]" : "px-3 py-1.5 text-[11px]",
              value === opt.id
                ? "bg-[#E0742D] text-white"
                : "bg-transparent text-slate-500 hover:text-[#2A2F3A]",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface StatementChartProps {
  statementType: StatementType
  period: "monthly" | "quarterly" | "annual"
  view: "comparison" | "ytd" | "ddm" | "12months" | "24months" | "quarters" | "years"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  currency?: string
  comparisonType?: "lastMonth" | "pastMonth" | "budget"
  selectedBudgetId?: string | null
  selectedBudgetName?: string | null
  fiscalYear?: number
  referenceMonth?: number
  loading?: boolean
  structureVersion?: number
  /** The slot's config + version is passed in by the parent hook. */
  slot: ChartSlot
  /** Optional: shown as "n / N" when multiple slots exist. */
  chartSlotNumber?: number
  chartSlotCount?: number
  /** Slot-selector dropdown options (omit when there's only one slot). */
  chartInstanceOptions?: Array<{ id: string; label: string }>
  onChartInstanceChange?: (id: string) => void
  /** Called after a settings save so the parent can refetch slots. */
  onChartConfigSaved?: () => void
  /** Only set on additional (non-default) slots. */
  onRemoveChart?: () => void
  /** Toggle Annuel 5 ans / Mensuel intégré à l'en-tête (Diagnostic). */
  embeddedHorizon?: ChartHorizonToggleProps
  /** Contour de carte : tableau de bord IS (défaut) ou rapport Diagnostic (bordure pâle). */
  cardAppearance?: "dashboard" | "diagnostic"
  /** Portée de la lecture narrative sous le graphique. */
  narrativeScope?: "full" | "revenue-only" | "margin-by-revenue-only" | "expenses-only" | "expenses-by-division-only" | "financial-position-only" | "working-capital-only"
  /** Type de config persistée (ex. Marge par Revenus lit la config Revenus). */
  chartConfigStatementType?: StatementType
}

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
const diagnosticStyleCard = cn(CARD_CLASS, "relative z-10")

function resolveStatementChartCardClasses(appearance: "dashboard" | "diagnostic") {
  if (appearance === "diagnostic") {
    return { card: diagnosticStyleCard, showAccent: false }
  }
  return { card: dashboardStyleCard, showAccent: true }
}

function formatSeriesValue(v: number, fmt: ChartValueFormat): string {
  if (fmt === "ratio") return `${v.toFixed(1)}%`
  return formatCurrency(v)
}

export function StatementChart({
  statementType,
  period,
  view,
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  currency = "CAD",
  comparisonType: _comparisonType = "lastMonth",
  selectedBudgetId: _selectedBudgetId = null,
  selectedBudgetName: _selectedBudgetName = null,
  fiscalYear,
  referenceMonth,
  loading = false,
  structureVersion = 0,
  slot,
  chartSlotNumber,
  chartSlotCount,
  chartInstanceOptions,
  onChartInstanceChange,
  onChartConfigSaved,
  onRemoveChart,
  embeddedHorizon,
  cardAppearance = "dashboard",
  narrativeScope = "full",
  chartConfigStatementType,
}: StatementChartProps) {
  const isContributiveMarginView = narrativeScope === "margin-by-revenue-only"
  const isDivisionContributiveMarginView = narrativeScope === "expenses-by-division-only"
  const isFinancialPositionView = narrativeScope === "financial-position-only"
  const isWorkingCapitalView = narrativeScope === "working-capital-only"
  const isContributiveMarginTableView = isContributiveMarginView || isDivisionContributiveMarginView
  const isExpensesBridgeView = narrativeScope === "expenses-only"
  const needsMappingEnrichment =
    isContributiveMarginView || isExpensesBridgeView || isDivisionContributiveMarginView || isFinancialPositionView
  const configStatementType = chartConfigStatementType ?? statementType
  const { card: cardFrameClass, showAccent: showCardAccent } = resolveStatementChartCardClasses(cardAppearance)
  const seriesStatementType = seriesStatementTypeForChart(statementType)
  const perfConfig: StatementChartConfig = slot.config
  const [accountMappings, setAccountMappings] = useState<AccountMappingData[]>([])
  const [balanceSheetStructure, setBalanceSheetStructure] = useState<Record<string, unknown>[] | null>(null)
  const [workingCapitalStructure, setWorkingCapitalStructure] = useState<Record<string, unknown>[] | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [financialPositionSettingsPanel, setFinancialPositionSettingsPanel] =
    useState<FinancialPositionSettingsPanel | null>(null)
  const [visibleSeriesIds, setVisibleSeriesIds] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(slot.config.series.map((s) => [s.id, s.showOnChart])),
  )

  const refMonth = referenceMonth ?? new Date().getMonth() + 1
  const refYear = fiscalYear ?? new Date().getFullYear()
  const companyDivisions = useMemo(
    () => companies.find((c) => c.id === companyId)?.divisions ?? [],
    [companies, companyId],
  )
  const { codes: standardLinkCodes } = useStandardLinkCodesFlat(false, undefined, needsMappingEnrichment)

  const seriesMonthsNeeded = performanceChartSeriesMonthsNeeded(view)
  const wcDisplayMonths = view === "24months" ? 24 : view === "years" ? 60 : 12
  const bsMonthsForFetch = isWorkingCapitalView ? wcDisplayMonths : seriesMonthsNeeded
  const isMonthsNeeded = isWorkingCapitalView
    ? wcDisplayMonths + WORKING_CAPITAL_IS_TTM_LOOKBACK_MONTHS
    : seriesMonthsNeeded
  const { rows: seriesRows, periods: seriesPeriods, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: seriesStatementType,
    fiscalYear: fiscalYear || new Date().getFullYear(),
    month: refMonth,
    months: bsMonthsForFetch,
    divisionId: divisionId || undefined,
    subDivisionId: subDivisionId || undefined,
    enabled: !isDivisionContributiveMarginView,
    structureVersion,
  })

  const {
    rows: isSeriesRows,
    periods: isSeriesPeriods,
    loading: isSeriesLoading,
  } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "income-statement",
    fiscalYear: fiscalYear || new Date().getFullYear(),
    month: refMonth,
    months: isMonthsNeeded,
    divisionId: divisionId || undefined,
    subDivisionId: subDivisionId || undefined,
    enabled: isWorkingCapitalView && Boolean(companyId),
    structureVersion,
  })

  const {
    bundles: divisionSeriesBundles,
    loading: divisionSeriesLoading,
  } = useDivisionSeriesBundle({
    companyId: companyId || null,
    divisions: companyDivisions,
    fiscalYear: fiscalYear || new Date().getFullYear(),
    month: refMonth,
    months: seriesMonthsNeeded,
    enabled: isDivisionContributiveMarginView && Boolean(companyId) && companyDivisions.length > 0,
    structureVersion,
  })

  useEffect(() => {
    setVisibleSeriesIds(Object.fromEntries(slot.config.series.map((s) => [s.id, s.showOnChart])))
  }, [slot.chartInstanceId, slot.version])

  useEffect(() => {
    if (!companyId || !needsMappingEnrichment) {
      setAccountMappings([])
      return
    }
    let cancelled = false
    listAccountMappings(companyId)
      .then((mappings) => {
        if (!cancelled) setAccountMappings(mappings)
      })
      .catch(() => {
        if (!cancelled) setAccountMappings([])
      })
    return () => {
      cancelled = true
    }
  }, [companyId, needsMappingEnrichment, structureVersion])

  useEffect(() => {
    if (!companyId || !isFinancialPositionView) {
      setBalanceSheetStructure(null)
      return
    }
    let cancelled = false
    getStatementStructure(companyId, "balance-sheet")
      .then((data) => {
        if (!cancelled) setBalanceSheetStructure((data.structure ?? []) as Record<string, unknown>[])
      })
      .catch(() => {
        if (!cancelled) setBalanceSheetStructure([])
      })
    return () => {
      cancelled = true
    }
  }, [companyId, isFinancialPositionView, structureVersion])

  useEffect(() => {
    if (!companyId || !isWorkingCapitalView) {
      setWorkingCapitalStructure(null)
      return
    }
    let cancelled = false
    getStatementStructure(companyId, "working-capital")
      .then((data) => {
        if (!cancelled) setWorkingCapitalStructure((data.structure ?? []) as Record<string, unknown>[])
      })
      .catch(() => {
        if (!cancelled) setWorkingCapitalStructure([])
      })
    return () => {
      cancelled = true
    }
  }, [companyId, isWorkingCapitalView, structureVersion])

  const divisionProfitabilitySlices = useMemo(() => {
    if (!isDivisionContributiveMarginView || !companyDivisions.length) return null
    return buildDivisionProfitabilitySlices({
      divisions: companyDivisions,
      divisionSeries: divisionSeriesBundles,
      mappings: accountMappings,
      view,
      refMonth,
      refYear,
      standardLinkCodes,
    })
  }, [
    isDivisionContributiveMarginView,
    companyDivisions,
    divisionSeriesBundles,
    accountMappings,
    view,
    refMonth,
    refYear,
    standardLinkCodes,
  ])

  const divisionProfitabilityRows = useMemo(() => {
    if (!divisionProfitabilitySlices?.length) return null
    return buildDivisionProfitabilityRows(divisionProfitabilitySlices)
  }, [divisionProfitabilitySlices])

  const divisionProfitabilityNarrative = useMemo(() => {
    if (!isDivisionContributiveMarginView || !divisionProfitabilitySlices?.length) return null
    return buildDivisionProfitabilityNarrative(divisionProfitabilitySlices, view)
  }, [isDivisionContributiveMarginView, divisionProfitabilitySlices, view])

  const divisionProfitabilityEvolutionTables = useMemo(() => {
    if (!isDivisionContributiveMarginView || !divisionProfitabilitySlices?.length) return null
    return buildDivisionProfitabilityEvolutionTables({
      slices: divisionProfitabilitySlices,
      divisionSeries: divisionSeriesBundles,
      mappings: accountMappings,
      view,
      refMonth,
      refYear,
      standardLinkCodes,
    })
  }, [
    isDivisionContributiveMarginView,
    divisionProfitabilitySlices,
    divisionSeriesBundles,
    accountMappings,
    view,
    refMonth,
    refYear,
    standardLinkCodes,
  ])

  const financialPositionResult = useMemo(() => {
    if (!isFinancialPositionView || !seriesRows.length || !seriesPeriods.length) return null
    return buildFinancialPositionResult({
      rows: seriesRows,
      periods: seriesPeriods,
      mappings: accountMappings,
      structure: balanceSheetStructure ?? undefined,
      chartConfig: slot.config,
      view,
      refMonth,
      refYear,
    })
  }, [
    isFinancialPositionView,
    seriesRows,
    seriesPeriods,
    accountMappings,
    balanceSheetStructure,
    slot.config,
    view,
    refMonth,
    refYear,
  ])

  const financialPositionNarrative = useMemo(() => {
    if (!isFinancialPositionView || !financialPositionResult?.points.length) return null
    return buildFinancialPositionNarrative(financialPositionResult, view)
  }, [isFinancialPositionView, financialPositionResult, view])

  const financialPositionBreakdownTables = useMemo(() => {
    if (!isFinancialPositionView || !financialPositionResult?.points.length) return null
    return buildFinancialPositionBreakdownTables({
      result: financialPositionResult,
      rows: seriesRows,
      periods: seriesPeriods,
      mappings: accountMappings,
      structure: balanceSheetStructure ?? undefined,
      chartConfig: slot.config,
      view,
      refMonth,
      refYear,
      standardLinkCodes,
    })
  }, [
    isFinancialPositionView,
    financialPositionResult,
    seriesRows,
    seriesPeriods,
    accountMappings,
    balanceSheetStructure,
    slot.config,
    view,
    refMonth,
    refYear,
    standardLinkCodes,
  ])

  const workingCapitalResult = useMemo(() => {
    if (!isWorkingCapitalView || workingCapitalStructure === null) return null
    if (!seriesRows.length || !seriesPeriods.length) return null
    return buildWorkingCapitalDiagnosticResult({
      bsRows: seriesRows,
      bsPeriods: seriesPeriods,
      isRows: isSeriesRows,
      isPeriods: isSeriesPeriods,
      structure: workingCapitalStructure,
      view,
      refMonth,
      refYear,
      structureReady: true,
    })
  }, [
    isWorkingCapitalView,
    seriesRows,
    seriesPeriods,
    isSeriesRows,
    isSeriesPeriods,
    workingCapitalStructure,
    view,
    refMonth,
    refYear,
  ])

  const workingCapitalCompositionResult = useMemo(() => {
    if (!isWorkingCapitalView || workingCapitalStructure === null) return null
    if (!seriesRows.length || !seriesPeriods.length) return null
    return buildWorkingCapitalCompositionResult({
      bsRows: seriesRows,
      bsPeriods: seriesPeriods,
      isRows: isSeriesRows,
      isPeriods: isSeriesPeriods,
      structure: workingCapitalStructure,
      view,
      refMonth,
      refYear,
      structureReady: true,
    })
  }, [
    isWorkingCapitalView,
    seriesRows,
    seriesPeriods,
    isSeriesRows,
    isSeriesPeriods,
    workingCapitalStructure,
    view,
    refMonth,
    refYear,
  ])

  const workingCapitalNarrative = useMemo(() => {
    if (!isWorkingCapitalView || !workingCapitalResult?.points.length) return null
    return buildWorkingCapitalDiagnosticNarrative({
      fdrResult: workingCapitalResult,
      compositionResult: workingCapitalCompositionResult,
      view,
      bsRows: seriesRows,
      isRows: isSeriesRows,
      bsPeriods: seriesPeriods,
      isPeriods: isSeriesPeriods,
      structure: workingCapitalStructure ?? [],
      refMonth,
      refYear,
    })
  }, [
    isWorkingCapitalView,
    workingCapitalResult,
    workingCapitalCompositionResult,
    view,
    seriesRows,
    isSeriesRows,
    seriesPeriods,
    isSeriesPeriods,
    workingCapitalStructure,
    refMonth,
    refYear,
  ])

  const expenseContributionBridge = useMemo(() => {
    if (!isExpensesBridgeView || !seriesRows.length || !seriesPeriods.length) return null
    return buildExpenseContributionBridge({
      mappings: accountMappings,
      seriesRows,
      periods: seriesPeriods,
      view,
      refMonth,
      refYear,
      standardLinkCodes,
    })
  }, [
    isExpensesBridgeView,
    accountMappings,
    seriesRows,
    seriesPeriods,
    view,
    refMonth,
    refYear,
    standardLinkCodes,
  ])

  const expensesBridgeNarrativeContext = useMemo(() => {
    if (!isExpensesBridgeView || !expenseContributionBridge || !seriesRows.length || !seriesPeriods.length) {
      return null
    }
    return buildExpenseBridgeNarrativeContext({
      mappings: accountMappings,
      seriesRows,
      periods: seriesPeriods,
      view,
      refMonth,
      refYear,
      bridge: expenseContributionBridge,
      standardLinkCodes,
    })
  }, [
    isExpensesBridgeView,
    expenseContributionBridge,
    accountMappings,
    seriesRows,
    seriesPeriods,
    view,
    refMonth,
    refYear,
    standardLinkCodes,
  ])

  const expensesBridgeNarrative = useMemo(() => {
    if (!isExpensesBridgeView || !expenseContributionBridge) return null
    return buildExpensesBridgeNarrative(
      expenseContributionBridge,
      view,
      expensesBridgeNarrativeContext,
    )
  }, [isExpensesBridgeView, expenseContributionBridge, view, expensesBridgeNarrativeContext])

  const expenseCostBreakdownTables = useMemo(() => {
    if (!isExpensesBridgeView || !expenseContributionBridge || !seriesRows.length || !seriesPeriods.length) {
      return null
    }
    return buildExpenseCostBreakdownTables({
      mappings: accountMappings,
      seriesRows,
      periods: seriesPeriods,
      view,
      refMonth,
      refYear,
      bridge: expenseContributionBridge,
      standardLinkCodes,
    })
  }, [
    isExpensesBridgeView,
    expenseContributionBridge,
    accountMappings,
    seriesRows,
    seriesPeriods,
    view,
    refMonth,
    refYear,
    standardLinkCodes,
  ])

  const expensesBreakevenAnalysis = useMemo(() => {
    if (!isExpensesBridgeView || !expenseContributionBridge?.points[0]) return null
    return computeBreakevenAnalysis(expenseContributionBridge.points[0])
  }, [isExpensesBridgeView, expenseContributionBridge])

  const dynamicBuild = useMemo(() => {
    if (!seriesRows.length || !seriesPeriods.length) return null
    return buildPerformanceChartData(perfConfig, seriesRows, seriesPeriods, view, refMonth, refYear)
  }, [seriesRows, seriesPeriods, view, refMonth, refYear, perfConfig])

  const dynamicPoints = dynamicBuild?.points ?? null
  const seriesMeta = dynamicBuild?.series ?? []

  const effectiveLoading =
    loading ||
    (isDivisionContributiveMarginView
      ? divisionSeriesLoading
      : isWorkingCapitalView
        ? seriesLoading || isSeriesLoading || workingCapitalStructure === null
        : seriesLoading)

  const narrativeSeriesMeta = useMemo(
    () => seriesMeta.filter((m) => visibleSeriesIds[m.id] !== false),
    [seriesMeta, visibleSeriesIds],
  )

  const enrichedRevenueSlices = useMemo(() => {
    if (narrativeScope !== "margin-by-revenue-only" || !dynamicPoints?.length || !narrativeSeriesMeta.length) {
      return null
    }
    const slices = mapDynamicChartToRevenueSeriesNarratives(dynamicPoints, narrativeSeriesMeta)
    if (!slices.length) return null
    return enrichRevenueSeriesForNarrative({
      slices,
      seriesMeta: narrativeSeriesMeta,
      chartSeries: perfConfig.series,
      mappings: accountMappings,
      seriesRows,
      periods: seriesPeriods,
      view,
      refMonth,
      refYear,
      standardLinkCodes,
    })
  }, [
    narrativeScope,
    dynamicPoints,
    narrativeSeriesMeta,
    perfConfig.series,
    accountMappings,
    seriesRows,
    seriesPeriods,
    view,
    refMonth,
    refYear,
    standardLinkCodes,
  ])

  const contributiveMarginRows = useMemo(() => {
    if (!enrichedRevenueSlices?.length) return null
    return buildRevenueContributiveMarginRows(enrichedRevenueSlices)
  }, [enrichedRevenueSlices])

  const contributiveMarginNarrative = useMemo(() => {
    if (narrativeScope !== "margin-by-revenue-only" || !enrichedRevenueSlices?.length) return null
    return buildContributiveMarginByRevenueNarrative(enrichedRevenueSlices, view)
  }, [narrativeScope, enrichedRevenueSlices, view])

  const contributiveMarginEvolutionTables = useMemo(() => {
    if (narrativeScope !== "margin-by-revenue-only" || !enrichedRevenueSlices?.length) {
      return null
    }
    return buildRevenueContributiveMarginEvolutionTables(enrichedRevenueSlices, view)
  }, [narrativeScope, enrichedRevenueSlices, view])

  const companyCurrency = currency

  const narrative = useMemo(() => {
    const diagnosticTypes = new Set([
      "income-statement",
      "diagnostic-revenue",
      "diagnostic-margin-by-revenue",
      "diagnostic-expenses",
      "diagnostic-expenses-by-division",
    ])
    if (!diagnosticTypes.has(statementType)) return null
    if (!dynamicPoints?.length || !narrativeSeriesMeta.length) return null
    if (narrativeScope === "revenue-only") {
      const slices = mapDynamicChartToRevenueSeriesNarratives(dynamicPoints, narrativeSeriesMeta)
      if (!slices.length) return null
      return buildRevenueOnlyPerformanceNarrative(slices, view)
    }
    if (narrativeScope === "margin-by-revenue-only") {
      return null
    }
    if (narrativeScope === "expenses-only") {
      return null
    }
    const mapped = mapDynamicChartToNarrativePoints(dynamicPoints, narrativeSeriesMeta)
    if (!mapped) return null
    return buildIncomePerformanceNarrative(mapped, view)
  }, [
    statementType,
    dynamicPoints,
    narrativeSeriesMeta,
    view,
    narrativeScope,
  ])

  const settingsDialog = (
    <StatementChartSettingsDialog
      open={settingsOpen}
      onOpenChange={setSettingsOpen}
      statementType={configStatementType}
      companyId={companyId ?? ""}
      slot={slot}
      onSaved={() => {
        onChartConfigSaved?.()
      }}
    />
  )

  const financialPositionSettingsDialog = isFinancialPositionView ? (
    <StatementChartSettingsDialog
      open={financialPositionSettingsPanel !== null}
      onOpenChange={(open) => {
        if (!open) setFinancialPositionSettingsPanel(null)
      }}
      statementType={configStatementType}
      companyId={companyId ?? ""}
      slot={slot}
      financialPositionPanel={financialPositionSettingsPanel ?? undefined}
      onSaved={() => {
        onChartConfigSaved?.()
        setFinancialPositionSettingsPanel(null)
      }}
    />
  ) : null

  const slotBadge =
    chartSlotCount != null && chartSlotCount > 1 && chartSlotNumber != null ? (
      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-500">
        {chartSlotNumber}/{chartSlotCount}
      </span>
    ) : null

  const getHorizonText = (): string => getHorizonModeLabel(view, period)

  const defaultTitle = defaultChartCardTitle(statementType)
  const storedChartTitle = perfConfig.chartTitle.trim()
  const cardTitle = isContributiveMarginTableView || isFinancialPositionView || isWorkingCapitalView
    ? defaultTitle
    : storedChartTitle && storedChartTitle !== defaultTitle
      ? storedChartTitle
      : defaultTitle

  const dynamicChartConfig = useMemo(() => {
    const c: Record<string, { label: string; color: string }> = {}
    for (const m of seriesMeta) {
      c[m.dataKey] = { label: m.label, color: m.color }
    }
    return c
  }, [seriesMeta])

  const needRightAxis = useMemo(() => {
    return seriesMeta.some((m) => m.yAxis === "right" && visibleSeriesIds[m.id] !== false)
  }, [seriesMeta, visibleSeriesIds])

  /** Map series id -> stackGroup (sourced from the slot config, not the runtime meta). */
  const stackGroupById = useMemo(() => {
    const m = new Map<string, string | undefined>()
    for (const s of slot.config.series) m.set(s.id, s.stackGroup)
    return m
  }, [slot.config.series])

  if (effectiveLoading) {
    return (
      <>
        <div className={`mb-6 flex h-64 items-center justify-center ${cardFrameClass}`}>
          {showCardAccent ? <div className={dashboardStyleCardAccent} aria-hidden /> : null}
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E0742D]" />
        </div>
        {settingsDialog}
        {financialPositionSettingsDialog}
      </>
    )
  }

  if (isDivisionContributiveMarginView && !companyDivisions.length) {
    const emptyMessage =
      "Aucune division n'est définie dans la structure organisationnelle de cette société."
    const emptyHint =
      "Créez des divisions dans Paramètres → Structure organisationnelle, puis affectez les comptes du mapping comptable à chaque division."

    return (
      <>
        <div
          className={`mb-6 flex min-h-64 flex-col items-center justify-center gap-3 px-4 py-8 ${cardFrameClass}`}
          data-testid="division-contributive-margin-empty"
        >
          {showCardAccent ? <div className={dashboardStyleCardAccent} aria-hidden /> : null}
          {embeddedHorizon ? (
            <div className="relative mb-2 w-full max-w-xl border-b border-slate-100 pb-4">
              <EmbeddedHorizonToggle {...embeddedHorizon} />
            </div>
          ) : null}
          <p className="relative text-center text-sm text-[#5C5F66]">{emptyMessage}</p>
          {companyId ? <p className="max-w-md text-center text-xs text-slate-500">{emptyHint}</p> : null}
        </div>
        {settingsDialog}
        {financialPositionSettingsDialog}
      </>
    )
  }

  if (
    isFinancialPositionView &&
    (!financialPositionResult || !financialPositionResult.points.length)
  ) {
    const emptyMessage =
      "Impossible de construire la situation financière : vérifiez le mapping bilan (familles ACT, ALT, PCT, PLT, CAP)."
    const emptyHint =
      "Les comptes du bilan doivent être mappés à des codes de liaison dans Paramètres → Mapping comptable."

    return (
      <>
        <div
          className={`mb-6 flex min-h-64 flex-col items-center justify-center gap-3 px-4 py-8 ${cardFrameClass}`}
          data-testid="financial-position-no-data"
        >
          {showCardAccent ? <div className={dashboardStyleCardAccent} aria-hidden /> : null}
          {embeddedHorizon ? (
            <div className="relative mb-2 w-full max-w-xl border-b border-slate-100 pb-4">
              <EmbeddedHorizonToggle {...embeddedHorizon} />
            </div>
          ) : null}
          <p className="relative text-center text-sm text-[#5C5F66]">{emptyMessage}</p>
          {companyId ? <p className="max-w-md text-center text-xs text-slate-500">{emptyHint}</p> : null}
        </div>
        {settingsDialog}
        {financialPositionSettingsDialog}
      </>
    )
  }

  if (
    isWorkingCapitalView &&
    workingCapitalStructure !== null &&
    (!workingCapitalResult || !workingCapitalResult.points.length)
  ) {
    const emptyMessage =
      "Impossible de construire le fonds de roulement : vérifiez la structure et le mapping comptable."
    const emptyHint =
      "Les indicateurs sont calculés à partir de la structure Analyse → Fonds de roulement (FDR, DSO, DIO, DPO, CCC). Vérifiez les formules et le mapping bilan / résultat sur cette page."
    const wcHref = companyId ? `/analysis/working-capital?companyId=${companyId}` : "/analysis/working-capital"

    return (
      <>
        <div
          className={`mb-6 flex min-h-64 flex-col items-center justify-center gap-3 px-4 py-8 ${cardFrameClass}`}
          data-testid="working-capital-no-data"
        >
          {showCardAccent ? <div className={dashboardStyleCardAccent} aria-hidden /> : null}
          {embeddedHorizon ? (
            <div className="relative mb-2 w-full max-w-xl border-b border-slate-100 pb-4">
              <EmbeddedHorizonToggle {...embeddedHorizon} />
            </div>
          ) : null}
          <p className="relative text-center text-sm text-[#5C5F66]">{emptyMessage}</p>
          {companyId ? <p className="max-w-md text-center text-xs text-slate-500">{emptyHint}</p> : null}
          {companyId ? (
            <a
              href={wcHref}
              className="relative mt-1 text-sm font-medium text-[#E0742D] hover:underline"
            >
              Ouvrir Analyse → Fonds de roulement
            </a>
          ) : null}
        </div>
        {settingsDialog}
        {financialPositionSettingsDialog}
      </>
    )
  }

  if (isExpensesBridgeView) {
    if (!seriesRows.length || !seriesPeriods.length || !expenseContributionBridge?.points.length) {
      const emptyMessage =
        "Impossible de construire le pont de rentabilité : vérifiez les revenus (codes REV) et le mapping comptable."
      const emptyHint =
        "Marquez les comptes de charges comme coûts variables ou fixes dans Paramètres → Mapping comptable. Les revenus sont agrégés à partir des codes REV feuilles du plan comptable."

      return (
        <>
          <div
            className={`mb-6 flex min-h-64 flex-col items-center justify-center gap-3 px-4 py-8 ${cardFrameClass}`}
            data-testid="expense-contribution-bridge-empty"
          >
            {showCardAccent ? <div className={dashboardStyleCardAccent} aria-hidden /> : null}
            {embeddedHorizon ? (
              <div className="relative mb-2 w-full max-w-xl border-b border-slate-100 pb-4">
                <EmbeddedHorizonToggle {...embeddedHorizon} />
              </div>
            ) : null}
            <p className="relative text-center text-sm text-[#5C5F66]">{emptyMessage}</p>
            {companyId ? <p className="max-w-md text-center text-xs text-slate-500">{emptyHint}</p> : null}
          </div>
          {settingsDialog}
        {financialPositionSettingsDialog}
        </>
      )
    }
  } else if (
    !isDivisionContributiveMarginView &&
    !isFinancialPositionView &&
    !isWorkingCapitalView &&
    (!dynamicPoints || !dynamicPoints.length || !seriesMeta.length)
  ) {
    const emptyMessage = isContributiveMarginView
      ? "Aucune source de revenus configurée. Paramétrez les séries dans la vue Revenus du rapport."
      : "Aucune donnée disponible pour ce graphique."
    const emptyHint = isContributiveMarginView
      ? "Les codes de liaison (ex. REV-A) doivent correspondre aux séries définies sous Revenus."
      : "Vérifiez les séries et liaisons dans Paramètres. Les codes doivent correspondre à des lignes présentes dans les séries."
    const settingsLabel = isContributiveMarginView ? "Paramètres des revenus" : "Paramètres du graphique"

    return (
      <>
        <div
          className={`mb-6 flex min-h-64 flex-col items-center justify-center gap-3 px-4 py-8 ${cardFrameClass}`}
          data-testid={isContributiveMarginView ? "contributive-margin-empty" : undefined}
        >
          {showCardAccent ? <div className={dashboardStyleCardAccent} aria-hidden /> : null}
          {embeddedHorizon ? (
            <div className="relative mb-2 w-full max-w-xl border-b border-slate-100 pb-4">
              <EmbeddedHorizonToggle {...embeddedHorizon} />
            </div>
          ) : null}
          <p className="relative text-center text-sm text-[#5C5F66]">{emptyMessage}</p>
          {companyId ? <p className="max-w-md text-center text-xs text-slate-500">{emptyHint}</p> : null}
          {companyId ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                className={dashboardCardStructureSettingsButtonClass}
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="h-4 w-4" aria-hidden />
                {settingsLabel}
              </Button>
              {onRemoveChart && !isContributiveMarginView ? (
                <PerformanceChartRemoveButton onRemove={onRemoveChart} />
              ) : null}
            </div>
          ) : onRemoveChart && !isContributiveMarginView ? (
            <PerformanceChartRemoveButton onRemove={onRemoveChart} />
          ) : null}
        </div>
        {settingsDialog}
        {financialPositionSettingsDialog}
      </>
    )
  }

  /* ---------- Rendu dynamique (séries API + config v2) ---------- */
  const setVis = (id: string, v: boolean) => setVisibleSeriesIds((prev) => ({ ...prev, [id]: v }))
  const sideSeries = seriesMeta.filter((m) => m.showInSidePanel)

  return (
    <>
      <div
        className={`group mb-6 ${cardFrameClass}`}
        data-testid={
          isContributiveMarginView
            ? "contributive-margin-report"
            : isDivisionContributiveMarginView
              ? "division-contributive-margin-report"
              : isFinancialPositionView
                ? "financial-position-report"
                : isWorkingCapitalView
                  ? "working-capital-report"
                : isExpensesBridgeView
                  ? "expense-contribution-bridge-report"
                  : undefined
        }
      >
        {showCardAccent ? <div className={dashboardStyleCardAccent} aria-hidden /> : null}
        <div className="relative border-b border-slate-200 bg-white/90 px-6 py-5 sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                <TrendingUp className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                {chartInstanceOptions?.length && onChartInstanceChange ? (
                  <Select value={slot.chartInstanceId} onValueChange={onChartInstanceChange}>
                      <SelectTrigger className="mb-1 inline-flex h-auto w-auto max-w-full items-center gap-2 border-0 bg-transparent p-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 [&>svg:last-child]:hidden">
                        <h3 className="flex flex-wrap items-center gap-2 text-xl font-semibold leading-tight tracking-tight text-[#2A2F3A] text-balance">
                          {cardTitle}
                          {slotBadge}
                        </h3>
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                      </SelectTrigger>
                      <SelectContent>
                        {chartInstanceOptions.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <h3 className="mb-1 flex flex-wrap items-center text-xl font-semibold leading-tight tracking-tight text-[#2A2F3A] text-balance">
                      {cardTitle}
                      {slotBadge}
                    </h3>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[#5C5F66]">
                    {embeddedHorizon ? (
                      <EmbeddedHorizonToggle {...embeddedHorizon} />
                    ) : (
                      <>
                        <span className="font-medium text-slate-700">{getHorizonText()}</span>
                        <span className="text-slate-300">•</span>
                      </>
                    )}
                    {companyId ? (
                      <>
                        {embeddedHorizon ? <span className="text-slate-300">•</span> : null}
                        <span className="font-semibold text-[#2A2F3A]">
                          {companies.find((c) => c.id === companyId)?.name || "Société sélectionnée"}
                        </span>
                      </>
                    ) : (
                      <span className="truncate">Toutes les sociétés</span>
                    )}
                    {isContributiveMarginView ? (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500">Sources configurées dans Revenus</span>
                      </>
                    ) : isDivisionContributiveMarginView ? (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500">Affectations division dans le mapping comptable</span>
                      </>
                    ) : isFinancialPositionView ? (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500">Bilan consolidé (ACT, ALT, PCT, PLT, CAP)</span>
                      </>
                    ) : isWorkingCapitalView ? (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500">Structure fonds de roulement (bilan + TTM résultat)</span>
                      </>
                    ) : isExpensesBridgeView ? (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500">Mapping comptable (CV / CF)</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex min-w-0 max-w-full shrink flex-wrap items-center justify-end gap-3">
                {!isContributiveMarginTableView && !isExpensesBridgeView && !isFinancialPositionView && !isWorkingCapitalView ? (
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
                ) : null}
                <div className="flex shrink-0 items-center gap-1">
                  {companyId && !isExpensesBridgeView && !isDivisionContributiveMarginView && !isFinancialPositionView && !isWorkingCapitalView ? (
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(dashboardCardStructureSettingsButtonClass, "shrink-0")}
                      onClick={() => setSettingsOpen(true)}
                      aria-label={
                        isContributiveMarginView
                          ? "Paramètres des revenus"
                          : `Paramètres du graphique ${cardTitle}`
                      }
                    >
                      <Settings className="h-4 w-4" aria-hidden />
                      <span className="hidden sm:inline">
                        {isContributiveMarginView ? "Paramètres des revenus" : "Paramètres"}
                      </span>
                    </Button>
                  ) : null}
                  {onRemoveChart ? <PerformanceChartRemoveButton onRemove={onRemoveChart} /> : null}
                </div>
              </div>
            </div>
          </div>

          {isExpensesBridgeView && expenseContributionBridge ? (
            <ExpenseContributionBridgeChart
              points={expenseContributionBridge.points}
              currency={companyCurrency}
              variableCostAccountCount={expenseContributionBridge.mappingStatus.variableCostAccountCount}
              fixedCostAccountCount={expenseContributionBridge.mappingStatus.fixedCostAccountCount}
            />
          ) : isFinancialPositionView && financialPositionResult?.points.length ? (
            <FinancialPositionChart
              points={financialPositionResult.points}
              currency={companyCurrency}
              view={view}
              canConfigure={Boolean(companyId)}
              onOpenPanelSettings={setFinancialPositionSettingsPanel}
            />
          ) : isWorkingCapitalView && workingCapitalResult?.points.length ? (
            <WorkingCapitalDiagnosticChart
              points={workingCapitalResult.points}
              currency={companyCurrency}
            />
          ) : !isContributiveMarginTableView && !isFinancialPositionView && !isWorkingCapitalView ? (
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
                              stackId={stackGroupById.get(m.id)}
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
          ) : null}
          {expensesBridgeNarrative ? (
            <IncomePerformanceNarrativeSection
              narrative={expensesBridgeNarrative}
              renderAfterParagraph={(paragraph) => {
                const breakdown = expenseCostBreakdownTables?.get(paragraph.heading)
                if (!breakdown) return null
                return (
                  <RevenueContributiveMarginEvolutionTable
                    table={breakdown}
                    currency={companyCurrency}
                  />
                )
              }}
            />
          ) : null}
          {expensesBreakevenAnalysis ? (
            <ExpenseBreakevenChart
              analysis={expensesBreakevenAnalysis}
              currency={companyCurrency}
            />
          ) : null}
          {narrative ? <IncomePerformanceNarrativeSection narrative={narrative} /> : null}
          {isDivisionContributiveMarginView && divisionProfitabilityRows?.length ? (
            <div className="border-t border-slate-200 py-6">
              <DivisionProfitabilityTable rows={divisionProfitabilityRows} currency={companyCurrency} />
            </div>
          ) : null}
          {divisionProfitabilityNarrative ? (
            <IncomePerformanceNarrativeSection
              narrative={divisionProfitabilityNarrative}
              renderAfterParagraph={(paragraph) => {
                const evolution = divisionProfitabilityEvolutionTables?.get(paragraph.heading)
                if (!evolution) return null
                return (
                  <RevenueContributiveMarginEvolutionTable
                    table={evolution}
                    currency={companyCurrency}
                  />
                )
              }}
            />
          ) : null}
          {financialPositionNarrative ? (
            <IncomePerformanceNarrativeSection
              narrative={financialPositionNarrative}
              renderAfterParagraph={(paragraph) => {
                const breakdown = financialPositionBreakdownTables?.get(paragraph.heading)
                if (!breakdown) return null
                return (
                  <RevenueContributiveMarginEvolutionTable
                    table={breakdown}
                    currency={companyCurrency}
                  />
                )
              }}
            />
          ) : null}
          {workingCapitalNarrative ? (
            <IncomePerformanceNarrativeSection narrative={workingCapitalNarrative} />
          ) : null}
          {narrativeScope === "margin-by-revenue-only" && contributiveMarginRows?.length ? (
            <div className="border-t border-slate-200 py-6">
              <RevenueContributiveMarginTable rows={contributiveMarginRows} currency={companyCurrency} />
            </div>
          ) : null}
          {contributiveMarginNarrative ? (
            <IncomePerformanceNarrativeSection
              narrative={contributiveMarginNarrative}
              renderAfterParagraph={(paragraph) => {
                const evolution = contributiveMarginEvolutionTables?.get(paragraph.heading)
                if (!evolution) return null
                return (
                  <RevenueContributiveMarginEvolutionTable
                    table={evolution}
                    currency={companyCurrency}
                  />
                )
              }}
            />
          ) : null}
        </div>
        {settingsDialog}
        {financialPositionSettingsDialog}
      </>
    )
}
