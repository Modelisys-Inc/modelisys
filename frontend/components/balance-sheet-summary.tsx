"use client"

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import type { FinancialStatementRow, StandardLinkCode } from "@/lib/api"
import { getFinancialStatementSeries, getStatementStructure, listStandardLinkCodesFlat, type FinancialStatementSeriesParams } from "@/lib/api"
import type { SeriesRow } from "@/lib/api"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { useBalanceSheetStructureEdit } from "@/hooks/use-income-statement-structure-edit"
import { useBalanceSheetParentLinkCodes } from "@/hooks/use-balance-sheet-parent-link-codes"
import {
  aggregateToYears,
  findSeriesRowOrDetail,
  getPeriodLabels,
  getRowAmounts,
  reverseSeriesOrderForDisplay,
} from "@/lib/series-utils"
import { monthTrendFromReference } from "@/lib/series-reference-columns"
import {
  balanceSheetQuarterTrendForBasis,
  balanceSheetYearTrendForBasis,
  statementQuarterLabelsForBasis,
  statementYearLabelsForBasis,
  STATEMENT_QUARTER_COUNT,
  type StatementPeriodBasis,
} from "@/lib/income-statement-period-basis"
import { parseFiscalYearEndMonth } from "@/lib/capex-year-reference"
import {
  filterBalanceSheetSummaryRowsForHorizon,
} from "@/lib/balance-sheet-horizon-filter"
import {
  balanceSheetValidationEcart,
  buildBalanceSheetValidationAmountLookup,
  defaultBalanceSheetValidationFormula,
  ensureBalanceSheetValidationStructure,
  evaluateValidationFormulaCurrent,
  evaluateValidationFormulaPrior,
  evaluateValidationFormulaTrend,
  findBalanceSheetTotalAssetsRow,
  findBalanceSheetTotalLiabilitiesEquityRow,
  findBalanceSheetValidationStructureRow,
  isBalanceSheetAssetsSectionLabel,
  isBalanceSheetBalanced,
  isBalanceSheetValidationStructureRow,
} from "@/lib/balance-sheet-validation"
import type { IncomeStatementHorizonView } from "@/lib/income-statement-horizon-visibility"
import {
  calendarQuarterFromMonth,
  formatCalendarMonthYear,
  formatPriorCalendarMonth,
  formatQuarterShortLabel,
  formatSameMonthPriorYear,
  priorCalendarQuarter,
} from "@/lib/financial-period-labels"
import { getHorizonModeLabel } from "@/lib/financial-statement-horizon-labels"
import { PERFORMANCE_CHART_YEAR_COUNT } from "@/lib/performance-chart-series"
import {
  collectDistinctLinkCodesFromStructure,
  findStatementApiRowForStructureRow,
  listStructureRowsForPresentationDisplay,
  mapLinkCodesToOwnerLabel,
  isCodeMappingEnabled,
  isStructureRowDetailOnly,
  isStructureRowEmptyLabel,
  normalizeLiaisonMode,
  normLabel,
} from "@/lib/income-statement-structure-utils"
import {
  collectAnnexChildExpandRows,
  collectAnnexChildExpandRowsFromSeries,
  collectGlExpandChildren,
  collectGlExpandChildrenFromSeries,
  filterExpandChildrenForHorizon,
  findSummaryStructureRow,
  resolveSummaryExpandMode,
  summaryExpandModeAllowsExpand,
  summaryRowUsesAnnexExpand,
  structureRowHasFormulaLiaison,
  type SummaryExpandChild,
} from "@/lib/balance-sheet-summary-expand"
import { BalanceSheetLineAnalysisTriggerButton } from "@/components/balance-sheet-line-analysis"
import { BalanceSheetValidationFormulaEditor } from "@/components/balance-sheet-validation-formula-editor"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { IncomeStatementNotePanel } from "@/components/income-statement-note-panel"
import { Separator } from "@/components/ui/separator"
import { getNoteByRowId, useNotesCache } from "@/lib/notes-storage"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  StatementSummaryStructureColgroup,
  StatementSummaryStructureRowCells,
  StatementSummaryStructureThead,
} from "@/components/statement-summary-structure-shared"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  AlertTriangle,
  AlignLeft,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  IndentIncrease,
  LayoutList,
  Loader2,
  PanelTop,
  Plus,
  Settings,
  Sparkles,
  X,
} from "lucide-react"
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from "recharts"
import {
  dashboardCardAccentBarClass,
  dashboardCardAccentClass,
  dashboardCardBodyMutedClass,
  dashboardCardFrameStaticClass,
  dashboardCardHeaderBarClass,
  dashboardCardHeaderIconBoxClass,
  dashboardCardRingClass,
  dashboardCardStructureSettingsButtonClass,
  dashboardCardTitleClass,
} from "@/lib/dashboard-card-style"

interface BalanceSheetSummaryProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years"
  columnMode?: "variationAmount" | "variationPercent" | "comparison"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  title?: string
  comparisonType?: "lastMonth" | "pastMonth" | "budget"
  selectedBudgetId?: string | null
  selectedBudgetName?: string | null
  fiscalYear?: number
  /** Date de référence (URL ?refMonth=&refYear=) */
  refMonth: number
  refYear: number
  rows?: FinancialStatementRow[]
  loading?: boolean
  showBalanceSheetStructureSettings?: boolean
  /** Affiche un avertissement si Total des actifs ≠ Total passifs et capitaux propres (page Bilan uniquement). */
  showBalanceWarning?: boolean
  structureVersion?: number
  onBalanceSheetStructureSaved?: () => void
  /** Désactive l’analyse par ligne et les notes (ex. page Projections). */
  disableRowInteractions?: boolean
  projectionYears?: 3 | 4 | 5
  /** Année de référence de la projection (ex. 2026 → colonnes 2025, 2026, 2027…). */
  forecastBaseYear?: number
  /** En projections : réel pour (baseYear - 1) depuis les séries, années projetées à 0. */
  forecastUseSeriesActuals?: boolean
  /** Annuel / trimestriel : Courant (même mois / T3M) ou Exercice (FYE / trimestres fiscaux). */
  periodBasis?: StatementPeriodBasis
}

interface SummaryRow {
  label: string
  current: number
  prior: number
  isBold?: boolean
  isSection?: boolean
  isResult?: boolean
  indent?: boolean
  rowId?: string
  annexLetter?: string
  showInDetail?: boolean
  balanceAccounts?: Array<{
    accountNumber: string
    accountName: string
    amount: number
    priorAmount?: number
    trendValues?: number[]
  }>
  /** Ligne de séparation au-dessus (structure / API). */
  separatorAbove?: boolean
  hasLiaisonCode?: boolean
  // For trend views (12months, quarters, years)
  trendValues?: number[]
}

interface LineAnalysisSnapshot {
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
  /** Si l’analyse porte sur un compte GL : id de la ligne d’état parente. */
  parentRowId?: string
}

function isTruthySeparatorAbove(raw: unknown): boolean {
  return raw === true || raw === "true" || raw === 1
}

function indentForSummaryRow(
  row: Pick<SummaryRow, "isBold" | "isSection" | "isResult"> & { indent?: boolean }
): boolean {
  if (typeof row.indent === "boolean") return row.indent
  return !row.isBold && !row.isSection && !row.isResult
}

function structureRowHasLiaisonCode(row: Record<string, unknown> | null | undefined): boolean {
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

export function BalanceSheetSummary({
  period,
  view,
  columnMode = "variationAmount",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  title,
  comparisonType = "lastMonth",
  selectedBudgetId = null,
  selectedBudgetName = null,
  fiscalYear,
  refMonth,
  refYear,
  rows: backendRows = [],
  loading = false,
  showBalanceSheetStructureSettings = false,
  showBalanceWarning = false,
  structureVersion = 0,
  onBalanceSheetStructureSaved,
  disableRowInteractions = false,
  projectionYears = 5,
  forecastBaseYear,
  forecastUseSeriesActuals = false,
  periodBasis = "current",
}: BalanceSheetSummaryProps) {
  const isForecastSection = title === "Bilan pro forma"
  const forecastYearColumnCount = projectionYears + 1
  const fiscalYearEndMonth = parseFiscalYearEndMonth(
    companies.find((c) => c.id === companyId)?.fiscalYearEnd ?? "12-31",
  )

  useNotesCache(companyId ?? null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [lineAnalysis, setLineAnalysis] = useState<LineAnalysisSnapshot | null>(null)
  const [lineAnalysisView, setLineAnalysisView] = useState<"current" | "trailing12" | "trailing5years">("current")
  const [showAllAnalysisAccounts, setShowAllAnalysisAccounts] = useState(false)
  const [notesUpdated, setNotesUpdated] = useState(0)
  const analysisCardRef = useRef<HTMLElement | null>(null)
  const analysisRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})
  const [structureEditMode, setStructureEditMode] = useState(false)
  const [addSpaceDialogOpen, setAddSpaceDialogOpen] = useState(false)
  const [addSpacePlacement, setAddSpacePlacement] = useState<"above" | "below">("above")
  const [addSpaceTargetIdx, setAddSpaceTargetIdx] = useState<number | null>(null)
  const [addPostDialogOpen, setAddPostDialogOpen] = useState(false)
  const [addPostStep, setAddPostStep] = useState<"anchor" | "kind">("anchor")
  const [addPostAnchorIdx, setAddPostAnchorIdx] = useState<number | null>(null)
  const [addPostRefLabel, setAddPostRefLabel] = useState("")
  const [addPostRank, setAddPostRank] = useState<"primary" | "secondary">("secondary")
  const [addPostBold, setAddPostBold] = useState(false)
  const [addPostPresentationOnly, setAddPostPresentationOnly] = useState(false)
  const [addPostPlacement, setAddPostPlacement] = useState<"above" | "below">("above")
  /** Modale « Présentation » en modification d’un poste existant (gras / principal · secondaire). */
  const [editingPostGlobalIdx, setEditingPostGlobalIdx] = useState<number | null>(null)

  const resetAddPostDialog = () => {
    setAddPostStep("anchor")
    setAddPostAnchorIdx(null)
    setAddPostRefLabel("")
    setAddPostRank("secondary")
    setAddPostBold(false)
    setAddPostPresentationOnly(false)
    setAddPostPlacement("above")
    setEditingPostGlobalIdx(null)
  }

  const resetAddSpaceDialog = () => {
    setAddSpacePlacement("above")
    setAddSpaceTargetIdx(null)
  }

  // Series data for multi-period views
  const isMultiPeriod = view === "12months" || view === "quarters" || view === "years"
  const currentYear = fiscalYear || new Date().getFullYear()
  const monthsNeeded = view === "years" ? 72 : view === "quarters" ? 15 : 12

  const { rows: seriesRows, periods, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "balance-sheet",
    fiscalYear: currentYear,
    month: refMonth,
    months: monthsNeeded,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: isMultiPeriod && (!isForecastSection || forecastUseSeriesActuals),
    structureVersion,
  })

  const { rows: analysisSeriesRows, periods: analysisPeriods, loading: analysisSeriesLoading } =
    useFinancialStatementSeries({
      companyId: companyId || null,
      statementType: "balance-sheet",
      fiscalYear: currentYear,
      month: refMonth,
      months: 60,
      divisionId: divisionId || null,
      subDivisionId: subDivisionId || null,
      enabled: !!companyId && !!lineAnalysis?.rowId,
      structureVersion,
    })

  // Helper function to get comparison label
  const getComparisonLabel = (): string => {
    if (view !== "comparison" && view !== "ytd" && view !== "ddm") return "Passé"
    if (comparisonType === "lastMonth") {
      if (view === "ytd") return "YTD dernier"
      if (view === "ddm") return "DDM dernier"
      if (period === "monthly") return formatPriorCalendarMonth(refMonth, refYear)
      if (period === "quarterly") {
        const q = calendarQuarterFromMonth(refMonth)
        const pq = priorCalendarQuarter(q, refYear)
        return formatQuarterShortLabel(pq.quarter, pq.year)
      }
      return "Année dernière"
    }
    if (comparisonType === "pastMonth") {
      if (view === "ytd") return "YTD passé"
      if (view === "ddm") return "DDM passé"
      if (period === "monthly") return formatSameMonthPriorYear(refMonth, refYear)
      if (period === "quarterly") {
        const q = calendarQuarterFromMonth(refMonth)
        return formatQuarterShortLabel(q, refYear - 1)
      }
      return "Année passée"
    }
    if (comparisonType === "budget") {
      if (selectedBudgetName) {
        if (view === "ytd") return `Budget ${selectedBudgetName} (YTD)`
        if (view === "ddm") return `Budget ${selectedBudgetName} (DDM)`
        return `Budget ${selectedBudgetName}`
      }
      if (view === "ytd") return "YTD budgeté"
      if (view === "ddm") return "DDM budgeté"
      if (period === "monthly") return "Mois budgeté"
      if (period === "quarterly") return "Trimestre budgeté"
      return "Année budgetée"
    }
    return "Passé"
  }

  /** Colonne « Courant » : libellé daté (référence) pour comparaison / DDM. */
  const getCurrentColumnLabel = (): string => {
    if ((view === "comparison" || view === "ddm") && period === "monthly") {
      return formatCalendarMonthYear(refMonth, refYear)
    }
    if ((view === "comparison" || view === "ddm") && period === "quarterly") {
      const q = calendarQuarterFromMonth(refMonth)
      return formatQuarterShortLabel(q, refYear)
    }
    if ((view === "comparison" || view === "ddm") && period === "annual") {
      return String(refYear)
    }
    return "Courant"
  }

  const [statementStructure, setStatementStructure] = useState<Record<string, unknown>[] | null>(null)

  useEffect(() => {
    if (!companyId) {
      setStatementStructure(null)
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        const data = await getStatementStructure(companyId, "balance-sheet")
        if (!cancelled) setStatementStructure((data.structure ?? []) as Record<string, unknown>[])
      } catch (e) {
        console.error("Error loading balance sheet structure:", e)
        if (!cancelled) setStatementStructure([])
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [companyId, structureVersion])

  // Map backend FinancialStatementRow[] to internal SummaryRow[]
  const mapStructureRowToSummaryRow = (
    sr: Record<string, unknown>,
    row: FinancialStatementRow | undefined
  ): SummaryRow => {
    const structIsBold = sr.isBold === true
    const structIndent = typeof sr.indent === "boolean" ? sr.indent : undefined
    return {
      label: String(sr.label ?? ""),
      current: row?.current ?? 0,
      prior: row?.prior ?? 0,
      isBold: row?.isBold ?? structIsBold,
      isSection: row?.isSection ?? sr.isSection === true,
      isResult: row?.isResult ?? sr.isResult === true,
      indent: indentForSummaryRow({
        isBold: !!(row?.isBold ?? structIsBold),
        isSection: !!(row?.isSection ?? sr.isSection),
        isResult: !!(row?.isResult ?? sr.isResult),
        indent: structIndent ?? (row as { indent?: boolean } | undefined)?.indent,
      }),
      rowId: row?.id ?? String(sr.id ?? sr.linkCode ?? ""),
      annexLetter: row?.annexLetter ?? String(sr.annexLetter ?? ""),
      showInDetail:
        typeof sr.showInDetail === "boolean"
          ? sr.showInDetail
          : typeof row?.showInDetail === "boolean"
            ? row.showInDetail
            : undefined,
      balanceAccounts:
        row?.detailRows?.map((dr) => ({
          accountNumber: dr.id,
          accountName: dr.label,
          amount: dr.current ?? 0,
          priorAmount: dr.prior ?? 0,
        })) ?? [],
      separatorAbove: isTruthySeparatorAbove(sr.separatorAbove ?? row?.separatorAbove),
      hasLiaisonCode: row?.hasLiaisonCode ?? structureRowHasLiaisonCode(sr),
    }
  }

  const mapBackendRowsFromStructure = (
    apiRows: FinancialStatementRow[],
    structure: Record<string, unknown>[]
  ): SummaryRow[] => {
    const used = new Set<number>()
    const usedNested = new Set<string>()
    return listStructureRowsForPresentationDisplay(structure).map((sr) => {
      const row = findStatementApiRowForStructureRow(sr, apiRows, used, usedNested)
      return mapStructureRowToSummaryRow(sr, row)
    })
  }

  const mapBackendRowsFallback = (apiRows: FinancialStatementRow[]): SummaryRow[] => {
    return apiRows
      .filter((row) => !row.detailOnly)
      .map((row) => mapStructureRowToSummaryRow({ label: row.label }, row))
  }

  const mapSeriesStructureRowToSummaryRow = (
    sr: Record<string, unknown>,
    row: SeriesRow | undefined,
    trendValues: number[]
  ): SummaryRow => {
    const structIsBold = sr.isBold === true
    const structIndent = typeof sr.indent === "boolean" ? sr.indent : undefined
    const lastAmount = trendValues[0] || 0
    const priorAmount = trendValues.length >= 2 ? trendValues[1] || 0 : 0
    return {
      label: String(sr.label ?? ""),
      current: lastAmount,
      prior: priorAmount,
      isBold: row?.isBold ?? structIsBold,
      isSection: row?.isSection ?? sr.isSection === true,
      isResult: row?.isResult ?? sr.isResult === true,
      rowId: row?.id ?? String(sr.id ?? sr.linkCode ?? ""),
      annexLetter: row?.annexLetter ?? String(sr.annexLetter ?? ""),
      showInDetail:
        typeof sr.showInDetail === "boolean"
          ? sr.showInDetail
          : typeof row?.showInDetail === "boolean"
            ? row.showInDetail
            : undefined,
      balanceAccounts:
        row?.detailRows?.map((dr) => {
          const detailSeriesRow: SeriesRow = {
            id: dr.id,
            label: dr.label,
            isBold: false,
            isSection: false,
            isResult: false,
            amounts: dr.amounts,
            detailRows: [],
          }
          const detailValues =
            view === "quarters"
              ? balanceSheetQuarterTrendForBasis(
                  detailSeriesRow,
                  periods,
                  refMonth,
                  refYear,
                  periodBasis,
                  fiscalYearEndMonth,
                  STATEMENT_QUARTER_COUNT,
                )
              : view === "years"
                ? balanceSheetYearTrendForBasis(
                    detailSeriesRow,
                    periods,
                    refMonth,
                    refYear,
                    periodBasis,
                    fiscalYearEndMonth,
                    PERFORMANCE_CHART_YEAR_COUNT,
                  )
                : monthTrendFromReference(detailSeriesRow, periods, refMonth, refYear, 12)
          return {
            accountNumber: dr.id,
            accountName: dr.label,
            amount: detailValues[0] || 0,
            priorAmount: detailValues.length >= 2 ? detailValues[1] || 0 : 0,
            trendValues: detailValues,
          }
        }) ?? [],
      indent: indentForSummaryRow({
        isBold: !!(row?.isBold ?? structIsBold),
        isSection: !!(row?.isSection ?? sr.isSection),
        isResult: !!(row?.isResult ?? sr.isResult),
        indent: structIndent ?? row?.indent,
      }),
      separatorAbove: isTruthySeparatorAbove(sr.separatorAbove ?? row?.separatorAbove),
      hasLiaisonCode: row?.hasLiaisonCode ?? structureRowHasLiaisonCode(sr),
      trendValues: row?.isSection ? undefined : trendValues,
    }
  }

  const mapSeriesRowsFromStructure = (
    rows: SeriesRow[],
    structure: Record<string, unknown>[]
  ): SummaryRow[] => {
    const used = new Set<number>()
    const usedNested = new Set<string>()
    const buildYearTrendValues = (row: SeriesRow) => {
      if (isForecastSection && forecastUseSeriesActuals) {
        const actual =
          balanceSheetYearTrendForBasis(
            row,
            periods,
            refMonth,
            refYear,
            periodBasis,
            fiscalYearEndMonth,
            1,
          )[0] || 0
        return [actual, ...Array.from({ length: projectionYears }, () => 0)]
      }
      return balanceSheetYearTrendForBasis(
        row,
        periods,
        refMonth,
        refYear,
        periodBasis,
        fiscalYearEndMonth,
        PERFORMANCE_CHART_YEAR_COUNT,
      )
    }
    return listStructureRowsForPresentationDisplay(structure).map((sr) => {
      const row = findStatementApiRowForStructureRow(sr, rows, used, usedNested)
      const trend =
        row && view === "quarters"
          ? balanceSheetQuarterTrendForBasis(
              row,
              periods,
              refMonth,
              refYear,
              periodBasis,
              fiscalYearEndMonth,
              STATEMENT_QUARTER_COUNT,
            )
          : row && view === "years"
            ? buildYearTrendValues(row)
            : row
              ? monthTrendFromReference(row, periods, refMonth, refYear, 12)
              : []
      return mapSeriesStructureRowToSummaryRow(sr, row, trend)
    })
  }

  // Helper function to capitalize first letter
  const capitalizeFirst = (str: string): string => {
    if (!str) return str
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      return next
    })
  }

  const openOrToggleLineAnalysis = useCallback((snapshot: LineAnalysisSnapshot) => {
    setLineAnalysis((prev) => {
      const next = prev?.rowId === snapshot.rowId ? null : snapshot
      if (next) {
        setLineAnalysisView("current")
        setShowAllAnalysisAccounts(false)
      }
      return next
    })
  }, [])

  const scrollToAnalysisCard = useCallback(() => {
    window.requestAnimationFrame(() => {
      analysisCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [])

  const scrollBackToAnalysisRow = useCallback(() => {
    const rowId = lineAnalysis?.parentRowId ?? lineAnalysis?.rowId
    if (!rowId) return
    const target = analysisRowRefs.current[rowId]
    if (!target) return
    target.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [lineAnalysis?.rowId, lineAnalysis?.parentRowId])

  useEffect(() => {
    if (!lineAnalysis) return
    scrollToAnalysisCard()
  }, [lineAnalysis, scrollToAnalysisCard])

  // Determine what we're comparing
  const isCompanyComparison = columnMode === "comparison" && !companyId
  const isDivisionComparison = columnMode === "comparison" && companyId && !divisionId
  const isSubDivisionComparison = columnMode === "comparison" && companyId && divisionId && !subDivisionId
  const isComparisonMode = isCompanyComparison || isDivisionComparison || isSubDivisionComparison

  const canInlineStructureEdit =
    showBalanceSheetStructureSettings && !!companyId && !isComparisonMode
  const structEdit = useBalanceSheetStructureEdit(companyId ?? null, canInlineStructureEdit)
  const [standardCodesForFilter, setStandardCodesForFilter] = useState<StandardLinkCode[]>([])
  useEffect(() => {
    if (!companyId) {
      setStandardCodesForFilter([])
      return
    }
    let cancelled = false
    listStandardLinkCodesFlat(false)
      .then((codes) => {
        if (!cancelled) setStandardCodesForFilter(codes)
      })
      .catch(() => {
        if (!cancelled) setStandardCodesForFilter([])
      })
    return () => {
      cancelled = true
    }
  }, [companyId, structureVersion])
  const { codes: balanceParentLinkCodes, labels: balanceParentLinkLabels } =
    useBalanceSheetParentLinkCodes(structureEditMode && canInlineStructureEdit)

  useEffect(() => {
    if (!structureEditMode || !canInlineStructureEdit) return
    if (structEdit.loading) return
    const ensured = ensureBalanceSheetValidationStructure(structEdit.structure)
    if (ensured !== structEdit.structure) {
      structEdit.setStructure(ensured)
    }
  }, [
    structureEditMode,
    canInlineStructureEdit,
    structEdit.loading,
    structEdit.structure,
    structEdit.setStructure,
  ])

  const fullStructure = useMemo(
    () => statementStructure ?? structEdit.structure,
    [statementStructure, structEdit.structure]
  )

  const presentationStructure = useMemo(
    () => fullStructure.filter((r) => !isBalanceSheetValidationStructureRow(r)),
    [fullStructure]
  )

  const data = useMemo(() => {
    if (presentationStructure.length > 0) {
      if (isMultiPeriod && seriesRows.length && periods.length) {
        return mapSeriesRowsFromStructure(seriesRows, presentationStructure)
      }
      if (backendRows.length > 0) {
        return mapBackendRowsFromStructure(backendRows, presentationStructure)
      }
      return []
    }
    if (isMultiPeriod && seriesRows.length && periods.length) {
      return seriesRows
        .filter((row) => !row.detailOnly)
        .map((row) => {
          const trend =
            view === "quarters"
              ? balanceSheetQuarterTrendForBasis(
                  row,
                  periods,
                  refMonth,
                  refYear,
                  periodBasis,
                  fiscalYearEndMonth,
                  STATEMENT_QUARTER_COUNT,
                )
              : view === "years"
                ? balanceSheetYearTrendForBasis(
                    row,
                    periods,
                    refMonth,
                    refYear,
                    periodBasis,
                    fiscalYearEndMonth,
                    PERFORMANCE_CHART_YEAR_COUNT,
                  )
                : monthTrendFromReference(row, periods, refMonth, refYear, 12)
          return mapSeriesStructureRowToSummaryRow({ label: row.label }, row, trend)
        })
    }
    if (backendRows.length > 0) return mapBackendRowsFallback(backendRows)
    return []
  }, [
    presentationStructure,
    isMultiPeriod,
    seriesRows,
    periods,
    backendRows,
    view,
    refMonth,
    refYear,
    periodBasis,
    fiscalYearEndMonth,
    isForecastSection,
    forecastUseSeriesActuals,
    projectionYears,
  ])

  const horizonView = view as IncomeStatementHorizonView
  const showStructureColsEarly =
    structureEditMode && canInlineStructureEdit && !structEdit.loading
  const visibleData = useMemo(() => {
    if (showStructureColsEarly || !presentationStructure.length) return data
    return filterBalanceSheetSummaryRowsForHorizon(
      data,
      presentationStructure,
      horizonView,
      standardCodesForFilter
    )
  }, [showStructureColsEarly, presentationStructure, data, horizonView, standardCodesForFilter])

  const spacerTargetPosts = useMemo(() => {
    const s = structEdit.structure
    if (!s.length) return []
    const out: { globalIdx: number; label: string }[] = []
    for (let i = 0; i < s.length; i++) {
      const r = s[i]!
      if (isStructureRowDetailOnly(r)) continue
      if (isStructureRowEmptyLabel(r)) continue
      const label = String(r.label ?? "").trim()
      out.push({ globalIdx: i, label: label || `Poste ${i + 1}` })
    }
    return out
  }, [structEdit.structure])

  const allLiaisonCodes = useMemo(
    () => collectDistinctLinkCodesFromStructure(structEdit.structure),
    [structEdit.structure]
  )
  const linkCodeLabels = useMemo(
    () => mapLinkCodesToOwnerLabel(structEdit.structure),
    [structEdit.structure]
  )

  const beginEditPostPresentation = (globalIdx: number) => {
    const r = structEdit.structure[globalIdx]
    if (!r || isStructureRowEmptyLabel(r)) return
    setEditingPostGlobalIdx(globalIdx)
    setAddPostRank(typeof r.indent === "boolean" && r.indent ? "secondary" : "primary")
    setAddPostBold(r.isBold === true)
    setAddPostStep("kind")
    setAddPostPresentationOnly(false)
    setAddPostDialogOpen(true)
  }

  // Get entities to compare
  let entitiesToCompare: Array<{ id: string; name: string }> = []
  if (isCompanyComparison) {
    entitiesToCompare = companies.map((c) => ({ id: c.id, name: c.name }))
  } else if (isDivisionComparison) {
    const selectedCompany = companies.find((c) => c.id === companyId)
    entitiesToCompare = selectedCompany?.divisions.map((d) => ({ id: d.id, name: d.name })) || []
  } else if (isSubDivisionComparison) {
    const selectedCompany = companies.find((c) => c.id === companyId)
    const selectedDivision = selectedCompany?.divisions.find((d) => d.id === divisionId)
    entitiesToCompare = selectedDivision?.subDivisions.map((sd) => ({ id: sd.id, name: sd.name })) || []
  }
  
  // Fetch real data for each entity in comparison mode
  const [entityDataMap, setEntityDataMap] = useState<Record<string, SummaryRow[]>>({})
  const [entityDataLoading, setEntityDataLoading] = useState(false)

  useEffect(() => {
    if (!isComparisonMode) {
      setEntityDataMap(prev => Object.keys(prev).length === 0 ? prev : {})
      return
    }

    // Compute entities inside the effect to avoid unstable dependency
    let entities: Array<{ id: string; name: string }> = []
    if (isCompanyComparison) {
      entities = companies.map((c) => ({ id: c.id, name: c.name }))
    } else if (isDivisionComparison) {
      const sc = companies.find((c) => c.id === companyId)
      entities = sc?.divisions.map((d) => ({ id: d.id, name: d.name })) || []
    } else if (isSubDivisionComparison) {
      const sc = companies.find((c) => c.id === companyId)
      const sd = sc?.divisions.find((d) => d.id === divisionId)
      entities = sd?.subDivisions.map((s) => ({ id: s.id, name: s.name })) || []
    }

    if (entities.length === 0) {
      setEntityDataMap(prev => Object.keys(prev).length === 0 ? prev : {})
      return
    }

    let cancelled = false
    setEntityDataLoading(true)

    const fetchEntityData = async () => {
      const results: Record<string, SummaryRow[]> = {}

      for (const entity of entities) {
        try {
          const params: FinancialStatementSeriesParams = {
            fiscal_year: currentYear,
            months: 12,
            structure_rev: structureVersion > 0 ? structureVersion : undefined,
          }
          let entityCompanyId = companyId || ""

          if (isCompanyComparison) {
            entityCompanyId = entity.id
          } else if (isDivisionComparison) {
            params.division_id = entity.id
          } else if (isSubDivisionComparison) {
            params.sub_division_id = entity.id
          }

          if (!entityCompanyId) continue

          const response = await getFinancialStatementSeries(
            entityCompanyId,
            "balance-sheet",
            params
          )

          if (!cancelled && response.rows) {
            if (presentationStructure.length > 0) {
              results[entity.id] = mapSeriesRowsFromStructure(response.rows, presentationStructure)
            } else {
              results[entity.id] = response.rows
                .filter((row) => !row.detailOnly)
                .map((row) => {
                  const amounts = Object.entries(row.amounts)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([, v]) => v)
                  const lastAmount = amounts[amounts.length - 1] || 0
                  const priorAmount = amounts.length >= 2 ? amounts[amounts.length - 2] || 0 : 0
                  return mapSeriesStructureRowToSummaryRow(
                    { label: row.label },
                    row,
                    [lastAmount, priorAmount]
                  )
                })
            }
          }
        } catch (err) {
          console.error(`Error fetching data for entity ${entity.name}:`, err)
        }
      }

      if (!cancelled) {
        setEntityDataMap(results)
        setEntityDataLoading(false)
      }
    }

    fetchEntityData()
    return () => { cancelled = true }
  }, [
    isComparisonMode,
    companies,
    companyId,
    divisionId,
    isCompanyComparison,
    isDivisionComparison,
    isSubDivisionComparison,
    currentYear,
    structureVersion,
    presentationStructure,
  ])

  // Find total assets for balance validation (formule Paramètres ou défaut Total actif − Total passifs+CP).
  const totalAssetsRow = findBalanceSheetTotalAssetsRow(data)
  const liabilitiesEquityRow = findBalanceSheetTotalLiabilitiesEquityRow(data)
  const validationStructureMeta = useMemo(() => {
    const ensured = ensureBalanceSheetValidationStructure(fullStructure)
    return findBalanceSheetValidationStructureRow(ensured)
  }, [fullStructure])
  const validationFormula =
    validationStructureMeta?.row.formula ??
    defaultBalanceSheetValidationFormula(fullStructure)
  const validationLookup = useMemo(
    () => buildBalanceSheetValidationAmountLookup(fullStructure, data),
    [fullStructure, data],
  )
  const balanceEcart =
    evaluateValidationFormulaCurrent(validationFormula, validationLookup) ??
    balanceSheetValidationEcart(totalAssetsRow?.current, liabilitiesEquityRow?.current)
  const balancePriorEcart =
    evaluateValidationFormulaPrior(validationFormula, validationLookup) ??
    balanceSheetValidationEcart(totalAssetsRow?.prior, liabilitiesEquityRow?.prior)
  const showBalanceMismatch =
    showBalanceWarning && balanceEcart !== null && !isBalanceSheetBalanced(balanceEcart)

  const balanceTrendEcarts: number[] = (() => {
    const fromFormula = evaluateValidationFormulaTrend(validationFormula, validationLookup)
    if (fromFormula.length > 0) return fromFormula
    if (totalAssetsRow?.trendValues && liabilitiesEquityRow?.trendValues) {
      const a = totalAssetsRow.trendValues as number[]
      const l = liabilitiesEquityRow.trendValues as number[]
      const n = Math.min(a.length, l.length)
      return Array.from({ length: n }, (_, i) => (a[i] ?? 0) - (l[i] ?? 0))
    }
    return []
  })()

  const getTrendVariation = (values: number[], valueIdx: number): number | null => {
    if (valueIdx >= values.length - 1) return null
    return calculateVariation(values[valueIdx] ?? 0, values[valueIdx + 1] ?? 0)
  }

  const getTrendVariationAmount = (values: number[], valueIdx: number): number | null => {
    if (valueIdx >= values.length - 1) return null
    return (values[valueIdx] ?? 0) - (values[valueIdx + 1] ?? 0)
  }

  // Helper function to generate descriptive text
  const getDescriptionText = (): string => {
    const parts: string[] = []

    // Horizon/Period
    if (view === "comparison" && period === "monthly") parts.push("Vue mensuelle")
    else if (view === "comparison" && period === "quarterly") parts.push("Vue trimestrielle")
    else if (view === "comparison" && period === "annual") parts.push("Vue annuelle")
    else if (view === "ytd") parts.push("Année en cours (YTD)")
    else if (view === "ddm") parts.push("Même jour du mois dernier (DDM)")
    else if (view === "12months") parts.push("12 derniers mois")
    else if (view === "quarters") parts.push("5 derniers trimestres")
    else if (view === "years") parts.push("5 dernières années")

    // Entity selection
    if (isCompanyComparison) {
      parts.push("Comparaison de toutes les sociétés")
    } else if (isDivisionComparison) {
      const selectedCompany = companies.find((c) => c.id === companyId)
      parts.push(`Comparaison des divisions de ${selectedCompany?.name || "la société"}`)
    } else if (isSubDivisionComparison) {
      const selectedCompany = companies.find((c) => c.id === companyId)
      const selectedDivision = selectedCompany?.divisions.find((d) => d.id === divisionId)
      parts.push(`Comparaison des sous-divisions de ${selectedDivision?.name || "la division"}`)
    } else if (subDivisionId) {
      const selectedCompany = companies.find((c) => c.id === companyId)
      const selectedDivision = selectedCompany?.divisions.find((d) => d.id === divisionId)
      const selectedSubDivision = selectedDivision?.subDivisions.find((sd) => sd.id === subDivisionId)
      parts.push(selectedSubDivision?.name || "Sous-division sélectionnée")
    } else if (divisionId) {
      const selectedCompany = companies.find((c) => c.id === companyId)
      const selectedDivision = selectedCompany?.divisions.find((d) => d.id === divisionId)
      parts.push(`${selectedCompany?.name || "Société"} • ${selectedDivision?.name || "Division"}`)
    } else if (companyId) {
      const selectedCompany = companies.find((c) => c.id === companyId)
      parts.push(selectedCompany?.name || "Société sélectionnée")
    } else {
      parts.push("Toutes les sociétés")
    }

    // Column mode
    if (columnMode === "comparison") {
      // Already handled above
    } else if (columnMode === "variationPercent") {
      parts.push("• Variation %")
    } else if (columnMode === "variationAmount") {
      parts.push("• Variation $")
    }

    return parts.join(" • ")
  }

  // Helper function to generate month labels from series data or fallback
  const getMonthLabels = (): string[] => {
    if (periods.length > 0) return reverseSeriesOrderForDisplay(getPeriodLabels(periods))
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
    const cd = new Date()
    const labels: string[] = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date(cd.getFullYear(), cd.getMonth() - i, 1)
      labels.push(`${months[date.getMonth()]} ${date.getFullYear()}`)
    }
    return reverseSeriesOrderForDisplay(labels)
  }

  // Helper function to generate quarter labels from series data or fallback
  const getQuarterLabels = (): string[] => {
    return statementQuarterLabelsForBasis(
      refMonth,
      refYear,
      periodBasis,
      fiscalYearEndMonth,
      STATEMENT_QUARTER_COUNT,
    )
  }

  // Helper function to generate year labels from series data or fallback
  const getYearLabels = (): string[] => {
    if (isForecastSection) {
      const baseYear = forecastBaseYear ?? refYear ?? new Date().getFullYear()
      const labels: string[] = [`${baseYear - 1}`]
      for (let i = 0; i < projectionYears; i++) {
        labels.push(`${baseYear + i}`)
      }
      return labels
    }
    return statementYearLabelsForBasis(
      refMonth,
      refYear,
      periodBasis,
      fiscalYearEndMonth,
      PERFORMANCE_CHART_YEAR_COUNT,
    )
  }

  const getHorizonText = (): string => getHorizonModeLabel(view, period)

  const analysisSeriesOverview = useMemo(() => {
    if (!lineAnalysis?.rowId || !analysisSeriesRows.length || !analysisPeriods.length) return null

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
  }, [analysisPeriods, analysisSeriesRows, lineAnalysis?.rowId])

  /** Lecture « Mois actuel » : mois de référence, M-1 et même mois N-1 (séries), indépendamment de la vue tableau. */
  const analysisMonthReading = useMemo(() => {
    if (!lineAnalysis?.rowId || !analysisSeriesRows.length || !analysisPeriods.length) return null
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
  }, [lineAnalysis?.rowId, analysisSeriesRows, analysisPeriods, refMonth, refYear])

  const renderLineAnalysisBody = () => {
    if (!lineAnalysis) return null
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

  const renderUnifiedAnalysisNoteCard = () => {
    if (!lineAnalysis) return null
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
              Documenter l'analyse, expliquer les écarts et joindre les pièces justificatives
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
              onSaved={() => setNotesUpdated((n) => n + 1)}
              isNarrow={false}
              embedded
            />
          </div>
        </div>
      </div>
    )
  }

  const trendLen = data.find((r) => r.trendValues != null)?.trendValues?.length ?? 0
  const showStructureCols =
    structureEditMode && canInlineStructureEdit && !structEdit.loading
  const showValidationRow =
    showBalanceWarning &&
    !showStructureCols &&
    balanceEcart !== null
  const tableRowCount = showStructureCols
    ? structEdit.summaryStructureDisplayIndices.length
    : visibleData.length

  let summaryTableColumnCount = 2
  if (showStructureCols) summaryTableColumnCount = 8
  else if (view === "current") summaryTableColumnCount = 2
  else if (view === "comparison" || view === "ddm" || view === "ytd") {
    if (isComparisonMode) summaryTableColumnCount = 1 + entitiesToCompare.length
    else {
      const extra =
        columnMode === "variationAmount" || columnMode === "variationPercent" ? 1 : 0
      summaryTableColumnCount = 3 + extra
    }
  } else if (view === "12months") summaryTableColumnCount = 1 + getMonthLabels().length
  else if (view === "quarters") summaryTableColumnCount = 1 + getQuarterLabels().length
  else if (view === "years") summaryTableColumnCount = 1 + getYearLabels().length

  const padSummaryRow = (structRow: Record<string, unknown>): SummaryRow => {
    const structIsBold = typeof structRow.isBold === "boolean" ? structRow.isBold : false
    return {
      label: String(structRow.label ?? ""),
      current: 0,
      prior: 0,
      isBold: structIsBold,
      isSection: !!structRow.isSection,
      isResult: !!structRow.isResult,
      indent: indentForSummaryRow({
        isBold: structIsBold,
        isSection: !!structRow.isSection,
        isResult: !!structRow.isResult,
        indent: typeof structRow.indent === "boolean" ? structRow.indent : undefined,
      }),
      separatorAbove: isTruthySeparatorAbove(structRow.separatorAbove),
      trendValues: trendLen > 0 ? Array(trendLen).fill(0) : undefined,
    }
  }

  const summaryRowForStructureIndex = (structRow: Record<string, unknown>): SummaryRow => {
    const sl = normLabel(String(structRow.label ?? ""))
    const found = data.find((r) => normLabel(r.label) === sl)
    const padded = padSummaryRow(structRow)
    if (!found) return padded
    const mergedIsBold =
      typeof structRow.isBold === "boolean" ? structRow.isBold : !!found.isBold
    return {
      ...found,
      isBold: mergedIsBold,
      indent: indentForSummaryRow({
        isBold: mergedIsBold,
        isSection: found.isSection,
        isResult: found.isResult,
        indent:
          typeof structRow.indent === "boolean"
            ? structRow.indent
            : typeof found.indent === "boolean"
              ? found.indent
              : undefined,
      }),
      separatorAbove:
        structRow.separatorAbove !== undefined && structRow.separatorAbove !== null
          ? isTruthySeparatorAbove(structRow.separatorAbove)
          : !!found.separatorAbove,
    }
  }

  if (loading || (isMultiPeriod && seriesLoading) || entityDataLoading) {
    return (
      <div className={cn("w-full", dashboardCardFrameStaticClass)}>
        <div className={dashboardCardRingClass} aria-hidden />
        <div className="relative px-8 py-16 text-center">
          <div className="animate-pulse space-y-4">
            <div className="mx-auto h-4 w-1/3 rounded bg-slate-200"></div>
            <div className="mx-auto h-4 w-2/3 rounded bg-slate-200"></div>
            <div className="mx-auto h-4 w-1/2 rounded bg-slate-200"></div>
          </div>
          <p className={cn("mt-4 text-sm", dashboardCardBodyMutedClass)}>Chargement des données...</p>
        </div>
      </div>
    )
  }

  if (visibleData.length === 0) {
    return (
      <div className={cn("w-full", dashboardCardFrameStaticClass)}>
        <div className={dashboardCardRingClass} aria-hidden />
        <div className="relative px-8 py-16 text-center">
          <p className={cn("text-sm", dashboardCardBodyMutedClass)}>
            Aucune donnée disponible. Veuillez importer une balance de vérification et configurer la structure des états financiers.
          </p>
        </div>
      </div>
    )
  }

  const isStructureStudio = structureEditMode && canInlineStructureEdit

  const renderValidationEcartCell = (ecart: number | null | undefined, key?: string | number) => {
    if (ecart === null || ecart === undefined) {
      return (
        <td key={key} className="px-6 py-2.5 text-right text-sm text-slate-400">
          —
        </td>
      )
    }
    const balanced = isBalanceSheetBalanced(ecart)
    return (
      <td
        key={key}
        className={cn(
          "px-6 py-2.5 text-right text-sm font-semibold tabular-nums",
          balanced ? "text-emerald-700" : "text-amber-700",
        )}
        title={
          balanced
            ? "Bilan équilibré"
            : `Le bilan ne balance pas (écart ${formatCurrency(ecart)})`
        }
      >
        {formatCurrency(ecart)}
      </td>
    )
  }

  return (
    <div className={cn("w-full", dashboardCardFrameStaticClass)}>
      <div className={dashboardCardRingClass} aria-hidden />
      <div className="relative w-full min-w-0">
      {showBalanceMismatch && balanceEcart !== null && (
        <div
          role="alert"
          className="flex items-start gap-2.5 border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900 sm:px-7"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <p className="leading-snug">
            <span className="font-semibold">Le bilan n’est pas équilibré.</span>{" "}
            La ligne Validation affiche un écart de {formatCurrency(Math.abs(balanceEcart))} (formule
            Paramètres : Total actif − Total passifs et capitaux propres, ou votre formule
            personnalisée).
          </p>
        </div>
      )}
      {/* Header */}
      <div className={cn("px-6 py-5 sm:px-7", dashboardCardHeaderBarClass)}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className={dashboardCardHeaderIconBoxClass}>
              <LayoutList className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h2 className={cn("text-xl leading-tight", dashboardCardTitleClass)}>{title || "Sommaire"}</h2>
                {isStructureStudio && (
                  <Badge
                    variant="secondary"
                    className="border border-slate-200 bg-slate-100 font-medium text-[#2A2F3A] shadow-none"
                  >
                    <Sparkles className="h-3 w-3 text-[#E0742D]" />
                    Édition structure
                  </Badge>
                )}
              </div>
              {isStructureStudio ? (
                <p className={cn("text-sm leading-relaxed", dashboardCardBodyMutedClass)}>
                  Ajustez les libellés. <span className="font-medium text-[#2A2F3A]">Masquer</span> retire la ligne du
                  sommaire et du détail (les totaux restent cohérents).{" "}
                  <span className="font-medium text-[#2A2F3A]">Code</span> active la colonne liaison ;{" "}
                  <span className="font-medium text-[#2A2F3A]">Liaison</span> définit le code ou la formule ;{" "}
                  <span className="font-medium text-[#2A2F3A]">Annexe</span> l’affichage au détail ;{" "}
                  <span className="font-medium text-[#2A2F3A]">Lettre</span> pour l’annexe. Enregistrez pour appliquer
                  partout.
                </p>
              ) : (
                <div className={cn("flex flex-wrap items-center gap-3 text-sm", dashboardCardBodyMutedClass)}>
                  <span className="font-medium text-[#2A2F3A]">{getHorizonText()}</span>
                  <span className="text-slate-400">•</span>
                  {subDivisionId && divisionId && companyId ? (
                    <>
                      <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                      <span className="text-slate-400">•</span>
                      <span>
                        {companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name ||
                          "Division"}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className={cn("font-semibold", dashboardCardAccentClass)}>
                        {companies
                          .find((c) => c.id === companyId)
                          ?.divisions.find((d) => d.id === divisionId)
                          ?.subDivisions.find((sd) => sd.id === subDivisionId)?.name || "Sous-division"}
                      </span>
                    </>
                  ) : divisionId && companyId ? (
                    <>
                      <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                      <span className="text-slate-400">•</span>
                      <span className={cn("font-semibold", dashboardCardAccentClass)}>
                        {companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name ||
                          "Division"}
                      </span>
                    </>
                  ) : companyId ? (
                    <span className={cn("font-semibold", dashboardCardAccentClass)}>
                      {companies.find((c) => c.id === companyId)?.name || "Société sélectionnée"}
                    </span>
                  ) : (
                    <span className="truncate">Toutes les sociétés</span>
                  )}
                </div>
              )}
            </div>
          </div>
          {canInlineStructureEdit && !structureEditMode && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={dashboardCardStructureSettingsButtonClass}
              onClick={() => setStructureEditMode(true)}
            >
              <Settings className={cn("h-4 w-4", dashboardCardAccentClass)} />
              Paramètres
            </Button>
          )}
          {canInlineStructureEdit && structureEditMode && (
            <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:items-end">
              <div className="flex w-full flex-wrap items-center justify-end gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 rounded-xl text-[#2A2F3A] hover:bg-slate-100"
                  disabled={structEdit.loading}
                  title="Insérer une ligne vide au-dessus ou en dessous d’un poste du sommaire"
                  onClick={() => {
                    if (spacerTargetPosts.length === 0) {
                      structEdit.insertEmptySpacerAbove(0)
                    } else {
                      const first = spacerTargetPosts[0]!
                      setAddSpaceTargetIdx(first.globalIdx)
                      setAddSpacePlacement("above")
                      setAddSpaceDialogOpen(true)
                    }
                  }}
                >
                  <PanelTop className={cn("h-4 w-4", dashboardCardAccentClass)} />
                  Ajouter un espace
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 rounded-xl text-[#2A2F3A] hover:bg-slate-100"
                  disabled={structEdit.loading}
                  title="Choisir au-dessus de quel poste insérer le nouveau poste"
                  onClick={() => {
                    resetAddPostDialog()
                    if (spacerTargetPosts.length === 0) {
                      setAddPostAnchorIdx(0)
                      setAddPostRefLabel("Début du sommaire")
                      setAddPostStep("kind")
                      setAddPostPresentationOnly(true)
                    } else {
                      const first = spacerTargetPosts[0]!
                      setAddPostAnchorIdx(first.globalIdx)
                      setAddPostRefLabel(first.label)
                      setAddPostStep("anchor")
                      setAddPostPresentationOnly(false)
                    }
                    setAddPostDialogOpen(true)
                  }}
                >
                  <Plus className={cn("h-4 w-4", dashboardCardAccentClass)} />
                  Ajouter un poste
                </Button>
                <Separator orientation="vertical" className="hidden h-7 sm:block" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-[#5C5F66] hover:bg-slate-100"
                  disabled={structEdit.saving}
                  onClick={() => {
                    structEdit.discard()
                    void structEdit.reload()
                    setStructureEditMode(false)
                  }}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl bg-[#E0742D] px-4 font-semibold text-white shadow-sm hover:bg-[#c96526] disabled:opacity-60"
                  disabled={structEdit.saving || structEdit.loading || !companyId}
                  onClick={async () => {
                    const ok = await structEdit.save()
                    if (ok) {
                      onBalanceSheetStructureSaved?.()
                      structEdit.discard()
                      void structEdit.reload()
                      setStructureEditMode(false)
                    }
                  }}
                >
                  {structEdit.saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement…
                    </>
                  ) : (
                    "Enregistrer"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {structureEditMode && canInlineStructureEdit && structEdit.loading && (
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-3 text-center text-sm text-slate-600 sm:px-7">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin text-[#E0742D]" />
          Chargement de la structure…
        </div>
      )}
      {structureEditMode && canInlineStructureEdit && structEdit.error && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-center text-sm text-red-700 sm:px-7">
          {structEdit.error}
        </div>
      )}
      {showStructureCols && !structEdit.loading && (() => {
          const meta = findBalanceSheetValidationStructureRow(structEdit.structure)
          if (!meta) return null
          return (
            <BalanceSheetValidationFormulaEditor
              structure={structEdit.structure}
              validationIndex={meta.index}
              onChangeFormula={(formula) =>
                structEdit.updateRow(meta.index, { formula, isValidation: true, isResult: true })
              }
            />
          )
        })()}

      {/* Table — en-tête et colonne Poste figés au défilement */}
      <div
        className={cn(
          "min-w-0 max-h-[min(72vh,56rem)] overflow-auto overscroll-contain",
          isStructureStudio ? "bg-gradient-to-b from-white to-slate-50/50" : "bg-white"
        )}
      >
        <table
          className={cn(
            "w-full min-w-full border-separate border-spacing-0",
            showStructureCols && "table-fixed",
          )}
        >
          {showStructureCols && <StatementSummaryStructureColgroup />}
          <thead
            className={cn(
              "[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-slate-100",
              "[&_th]:border-b [&_th]:border-slate-200",
              !showStructureCols && "[&_th]:border-b-2",
              "[&_th:first-child]:left-0 [&_th:first-child]:z-30",
            )}
          >
            <tr>
              {showStructureCols && <StatementSummaryStructureThead />}
              {!showStructureCols && (
                <>
              <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm w-2/5 whitespace-nowrap">Poste</th>
              {view === "current" && (
                <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Montant</th>
              )}
              {view === "comparison" && !isComparisonMode && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{getCurrentColumnLabel()}</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{getComparisonLabel()}</th>
                  {columnMode === "variationPercent" ? (
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation %</th>
                  ) : columnMode === "variationAmount" ? (
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation $</th>
                  ) : null}
                </>
              )}
              {view === "comparison" && isComparisonMode && (
                <>
                  {entitiesToCompare.map((entity) => (
                    <th key={entity.id} className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">
                      {entity.name}
                    </th>
                  ))}
                </>
              )}
              {view === "ddm" && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{getCurrentColumnLabel()}</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{getComparisonLabel()}</th>
                  {columnMode === "variationPercent" ? (
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation %</th>
                  ) : columnMode === "variationAmount" ? (
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation $</th>
                  ) : null}
                </>
              )}
              {view === "ytd" && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">YTD {fiscalYear}</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">YTD {(fiscalYear ?? new Date().getFullYear()) - 1}</th>
                  {columnMode === "variationPercent" ? (
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation %</th>
                  ) : columnMode === "variationAmount" ? (
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation $</th>
                  ) : null}
                </>
              )}
              {view === "12months" && (
                <>
                  {getMonthLabels().map((label, idx) => (
                    <th key={idx} className="px-6 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {view === "quarters" && (
                <>
                  {getQuarterLabels().map((label, idx) => (
                    <th key={idx} className="px-6 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {view === "years" && (
                <>
                  {getYearLabels().map((label, idx) => (
                    <th
                      key={idx}
                      className={cn(
                        "px-6 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap",
                        isForecastSection && idx === 0 ? "bg-slate-50" : ""
                      )}
                    >
                      {label}
                    </th>
                  ))}
                </>
              )}
                </>
              )}
            </tr>
          </thead>
          <tbody
            className={cn(
              // border-separate: bordures + fonds sur les td (le bg des tr est ignoré)
              "[&_td]:border-b [&_td]:border-slate-200",
              "[&_td:first-child]:sticky [&_td:first-child]:left-0 [&_td:first-child]:z-10",
              "[&_td:first-child]:bg-white",
            )}
          >
            {showStructureCols && tableRowCount === 0 && (
              <tr>
                <td
                  colSpan={summaryTableColumnCount}
                  className="px-6 py-10 text-center text-sm text-slate-500"
                >
                  Aucun poste dans la structure. Utilisez « Ajouter un poste » ou « Ajouter un espace » pour commencer.
                </td>
              </tr>
            )}
            {Array.from({ length: tableRowCount }, (_, idx) => {
              const globalIdx = showStructureCols ? structEdit.summaryStructureDisplayIndices[idx]! : -1
              const structRowFromStudio = showStructureCols ? structEdit.structure[globalIdx]! : null
              const row = showStructureCols
                ? summaryRowForStructureIndex(structRowFromStudio!)
                : visibleData[idx]!
              const structRow =
                structRowFromStudio ??
                findSummaryStructureRow(row.rowId, row.label, presentationStructure) ??
                (structEdit.structure.length > 0
                  ? findSummaryStructureRow(row.rowId, row.label, structEdit.structure)
                  : undefined) ??
                null
              const variation = row.current && row.prior ? calculateVariation(row.current, row.prior) : null
              const variationAmount = row.current && row.prior ? row.current - row.prior : 0
              const isBoldRow = !!row.isBold
              const displayLabel = row.label ? capitalizeFirst(row.label) : ""
              const isSpacer = row.label === ""
              const matchedStructureRow =
                structRow ??
                structEdit.structure.find((candidate) => normLabel(String(candidate.label ?? "")) === normLabel(row.label))
              const hasStructureMetadata = !!structRow || structEdit.structure.length > 0
              const hasLiaisonCode =
                hasStructureMetadata
                  ? !!matchedStructureRow && structureRowHasLiaisonCode(matchedStructureRow)
                  : row.hasLiaisonCode !== undefined
                    ? row.hasLiaisonCode
                    : true
              const sectionExceptions = ["actifs courants", "actifs non courants"]
              const isSectionException = sectionExceptions.includes(row.label.toLowerCase())
              const shouldHideAmounts =
                isSpacer ||
                !hasLiaisonCode ||
                (!isSectionException && !!row.isSection) ||
                row.label.toLowerCase() === "actifs" ||
                row.label.toLowerCase() === "passifs"

              const rawSeparator =
                showStructureCols && structRow ? structRow.separatorAbove : row.separatorAbove
              const showSeparatorAbove = isTruthySeparatorAbove(rawSeparator)
              const liaisonMode = structRow ? normalizeLiaisonMode(structRow) : "na"
              const isLabelLockedBySingleLinkCode =
                !!structRow &&
                isCodeMappingEnabled(structRow) &&
                !!String(structRow.linkCode ?? "").trim() &&
                liaisonMode !== "sum" &&
                liaisonMode !== "difference"
              const usesAnnexExpand = summaryRowUsesAnnexExpand(structRow, {
                showInDetail: row.showInDetail,
                annexLetter: row.annexLetter,
              })
              const structureForExpand =
                presentationStructure.length > 0 ? presentationStructure : structEdit.structure
              const parentStructForExpand: Record<string, unknown> | null =
                structRow ??
                (usesAnnexExpand
                  ? {
                      label: row.label,
                      linkCode: row.rowId,
                      id: row.rowId,
                      annexLetter: row.annexLetter,
                      showInDetail: true,
                    }
                  : null)
              const annexExpandChildren: SummaryExpandChild[] = filterExpandChildrenForHorizon(
                (() => {
                  if (!usesAnnexExpand || !parentStructForExpand) return []
                  if (isMultiPeriod && seriesRows.length > 0) {
                    return collectAnnexChildExpandRowsFromSeries({
                      parentStructRow: parentStructForExpand,
                      structure: structureForExpand,
                      seriesRows,
                      standardCodes: standardCodesForFilter,
                      buildTrendValues: (seriesRow) => {
                        if (view === "quarters") {
                          return balanceSheetQuarterTrendForBasis(
                            seriesRow,
                            periods,
                            refMonth,
                            refYear,
                            periodBasis,
                            fiscalYearEndMonth,
                            STATEMENT_QUARTER_COUNT,
                          )
                        }
                        if (view === "years") {
                          if (isForecastSection && forecastUseSeriesActuals) {
                            const actual =
                              balanceSheetYearTrendForBasis(
                                seriesRow,
                                periods,
                                refMonth,
                                refYear,
                                periodBasis,
                                fiscalYearEndMonth,
                                1,
                              )[0] || 0
                            return [actual, ...Array.from({ length: projectionYears }, () => 0)]
                          }
                          return balanceSheetYearTrendForBasis(
                            seriesRow,
                            periods,
                            refMonth,
                            refYear,
                            periodBasis,
                            fiscalYearEndMonth,
                            PERFORMANCE_CHART_YEAR_COUNT,
                          )
                        }
                        return monthTrendFromReference(seriesRow, periods, refMonth, refYear, 12)
                      },
                    })
                  }
                  return collectAnnexChildExpandRows({
                    parentStructRow: parentStructForExpand,
                    structure: structureForExpand,
                    apiRows: backendRows,
                    standardCodes: standardCodesForFilter,
                  })
                })(),
                horizonView,
              )
              const glExpandChildren = filterExpandChildrenForHorizon(
                isMultiPeriod && seriesRows.length > 0
                  ? collectGlExpandChildrenFromSeries({
                      parentStructRow: parentStructForExpand ?? structRow,
                      parentRowId: row.rowId,
                      balanceAccounts: row.balanceAccounts,
                      seriesRows,
                      buildTrendValues: (seriesRow) => {
                        if (view === "quarters") {
                          return balanceSheetQuarterTrendForBasis(
                            seriesRow,
                            periods,
                            refMonth,
                            refYear,
                            periodBasis,
                            fiscalYearEndMonth,
                            STATEMENT_QUARTER_COUNT,
                          )
                        }
                        if (view === "years") {
                          if (isForecastSection && forecastUseSeriesActuals) {
                            const actual =
                              balanceSheetYearTrendForBasis(
                                seriesRow,
                                periods,
                                refMonth,
                                refYear,
                                periodBasis,
                                fiscalYearEndMonth,
                                1,
                              )[0] || 0
                            return [actual, ...Array.from({ length: projectionYears }, () => 0)]
                          }
                          return balanceSheetYearTrendForBasis(
                            seriesRow,
                            periods,
                            refMonth,
                            refYear,
                            periodBasis,
                            fiscalYearEndMonth,
                            PERFORMANCE_CHART_YEAR_COUNT,
                          )
                        }
                        return monthTrendFromReference(seriesRow, periods, refMonth, refYear, 12)
                      },
                    })
                  : collectGlExpandChildren({
                      parentStructRow: parentStructForExpand ?? structRow,
                      parentRowId: row.rowId,
                      balanceAccounts: row.balanceAccounts,
                      apiRows: backendRows,
                    }),
                horizonView,
              )
              const expandMode = resolveSummaryExpandMode({
                showStructureCols,
                isSpacer,
                rowId: row.rowId,
                usesAnnex: usesAnnexExpand,
                glCount: glExpandChildren.length,
                annexChildCount: annexExpandChildren.length,
                isResult: !!row.isResult,
                isSection: !!row.isSection,
                hasFormulaLiaison: structureRowHasFormulaLiaison(structRow),
              })
              const canExpand = summaryExpandModeAllowsExpand(expandMode)
              const expandChildren =
                expandMode === "annex"
                  ? annexExpandChildren
                  : expandMode === "gl"
                    ? glExpandChildren
                    : []
              const isExpanded = row.rowId ? expandedRows.has(row.rowId) : false
              const hasNote = row.rowId
                ? getNoteByRowId(row.rowId, "balance-sheet", period, view, companyId, divisionId, subDivisionId) !== null
                : false

              return (
                <Fragment key={idx}>
                  {showValidationRow && isBalanceSheetAssetsSectionLabel(row.label) && (
                    <tr
                      data-testid="balance-sheet-validation-row"
                      className="[&_td]:border-slate-300 [&>td]:bg-slate-50 [&>td:first-child]:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-6 py-2.5 text-sm font-semibold text-slate-800">
                        Validation
                      </td>
                      {view === "current" && renderValidationEcartCell(balanceEcart)}
                      {view === "comparison" && !isComparisonMode && (
                        <>
                          {renderValidationEcartCell(balanceEcart)}
                          {renderValidationEcartCell(balancePriorEcart)}
                          {columnMode === "variationPercent" || columnMode === "variationAmount" ? (
                            <td className="px-6 py-2.5 text-right text-sm text-slate-400">—</td>
                          ) : null}
                        </>
                      )}
                      {view === "comparison" && isComparisonMode && (
                        <>
                          {entitiesToCompare.map((entity) => {
                            const entityRows = entityDataMap[entity.id] || []
                            const assets = findBalanceSheetTotalAssetsRow(entityRows)
                            const le = findBalanceSheetTotalLiabilitiesEquityRow(entityRows)
                            const ecart = balanceSheetValidationEcart(assets?.current, le?.current)
                            return renderValidationEcartCell(ecart, entity.id)
                          })}
                        </>
                      )}
                      {(view === "ddm" || view === "ytd") && (
                        <>
                          {renderValidationEcartCell(balanceEcart)}
                          {renderValidationEcartCell(balancePriorEcart)}
                          {columnMode === "variationPercent" || columnMode === "variationAmount" ? (
                            <td className="px-6 py-2.5 text-right text-sm text-slate-400">—</td>
                          ) : null}
                        </>
                      )}
                      {(view === "12months" || view === "quarters" || view === "years") && (
                        <>
                          {(balanceTrendEcarts.length > 0
                            ? balanceTrendEcarts
                            : Array.from({
                                length:
                                  view === "12months"
                                    ? 12
                                    : view === "quarters"
                                      ? 5
                                      : isForecastSection
                                        ? forecastYearColumnCount
                                        : PERFORMANCE_CHART_YEAR_COUNT,
                              }).map(() => null)
                          ).map((ecart, colIdx) =>
                            renderValidationEcartCell(ecart, colIdx),
                          )}
                        </>
                      )}
                    </tr>
                  )}
                  {showSeparatorAbove && (
                    <tr aria-hidden>
                      <td
                        colSpan={summaryTableColumnCount}
                        className="border-0 p-0 align-top leading-none border-t border-t-slate-600"
                      />
                    </tr>
                  )}
                    <tr
                    ref={!showStructureCols && row.rowId ? (el) => { analysisRowRefs.current[row.rowId!] = el } : undefined}
                    data-testid={
                      canExpand
                        ? expandMode === "annex"
                          ? "balance-sheet-summary-expand-annex"
                          : "balance-sheet-summary-expand-gl"
                        : undefined
                    }
                    data-row-id={row.rowId}
                    className={cn(
                      row.label === "" ? "h-2" : "",
                      // Fond au hover sur toutes les cellules (y compris espaces vides + colonne sticky)
                      "hover:[&>td]:bg-slate-50/90 hover:[&>td:first-child]:bg-slate-50/90",
                      showStructureCols &&
                        row.label !== "" &&
                        "hover:[&>td]:bg-slate-100/70 hover:[&>td:first-child]:bg-slate-100/70",
                      showStructureCols &&
                        idx % 2 === 1 &&
                        row.label !== "" &&
                        "[&>td]:bg-slate-50/50 [&>td:first-child]:bg-slate-50",
                      !showStructureCols && canExpand && "cursor-pointer"
                    )}
                    onClick={
                      !showStructureCols && canExpand && row.rowId
                        ? () => toggleRow(row.rowId!)
                        : undefined
                    }
                  >
                  <td
                    className={cn(
                      "py-3",
                      showStructureCols ? "min-w-0 px-3 pl-4" : "px-6",
                      "whitespace-nowrap",
                      isBoldRow ? "font-bold text-slate-900" : "text-slate-700",
                      row.indent ? "pl-12" : "",
                      showStructureCols && structRow && row.label !== "" && "py-3.5"
                    )}
                  >
                    {showStructureCols && structRow ? (
                      String(structRow.label ?? "").trim() === "" ? (
                        <span className="inline-flex items-center rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-medium text-slate-400">
                          Ligne vide — renommez ou supprimez
                        </span>
                      ) : (
                        <Input
                          value={String(structRow.label ?? "")}
                          disabled={isLabelLockedBySingleLinkCode}
                          readOnly={isLabelLockedBySingleLinkCode}
                          onChange={(e) => structEdit.updateRow(globalIdx, { label: e.target.value })}
                          title={
                            isLabelLockedBySingleLinkCode
                              ? "Libellé défini par le code de liaison sélectionné."
                              : undefined
                          }
                          className={cn(
                            "h-9 w-full max-w-full rounded-xl border-slate-200/90 bg-white text-sm shadow-sm transition-shadow focus-visible:border-[#E0742D]/50 focus-visible:ring-2 focus-visible:ring-[#E0742D]/20",
                            isBoldRow ? "font-semibold" : "font-normal",
                            isLabelLockedBySingleLinkCode &&
                              "cursor-not-allowed bg-slate-50 text-slate-700 opacity-100"
                          )}
                        />
                      )
                    ) : (
                      <div className="flex items-center gap-2">
                        {canExpand && (
                          <span className="flex-shrink-0">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-slate-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-500" />
                            )}
                          </span>
                        )}
                        {!canExpand && row.indent && <span className="w-4" />}
                        <span className="flex-1 whitespace-nowrap">{displayLabel}</span>
                        {row.rowId && hasLiaisonCode && !disableRowInteractions ? (
                          <BalanceSheetLineAnalysisTriggerButton
                            isActive={
                              lineAnalysis?.rowId === row.rowId || lineAnalysis?.parentRowId === row.rowId
                            }
                            hasNote={!!hasNote}
                            onClick={(e) => {
                              e.stopPropagation()
                              openOrToggleLineAnalysis({
                                rowId: row.rowId!,
                                label: displayLabel,
                                current: row.current,
                                prior: row.prior,
                                balanceAccounts: row.balanceAccounts,
                                trendValues: row.trendValues,
                              })
                            }}
                          />
                        ) : null}
                      </div>
                    )}
                  </td>
                  {showStructureCols && structRow && (
                    <StatementSummaryStructureRowCells
                      structRow={structRow}
                      globalIdx={globalIdx}
                      structEdit={structEdit}
                      allLiaisonCodes={allLiaisonCodes}
                      linkCodeLabels={linkCodeLabels}
                      singleModeLinkCodes={balanceParentLinkCodes}
                      singleModeLinkCodeLabels={balanceParentLinkLabels}
                      showSeparatorAbove={showSeparatorAbove}
                      onEditPresentation={beginEditPostPresentation}
                      annexIdentifierAutoAssigned
                    />
                  )}

                  {!showStructureCols && view === "current" && (
                    <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                      {row.current !== 0 ? formatCurrency(row.current) : "-"}
                    </td>
                  )}

                  {!showStructureCols && view === "comparison" && !isComparisonMode && (
                    <>
                      <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                        {row.current !== 0 ? formatCurrency(row.current) : "-"}
                      </td>
                      <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                        {row.prior !== 0 ? formatCurrency(row.prior) : "-"}
                      </td>
                      {columnMode === "variationPercent" ? (
                        <td
                          className={`px-6 py-3 text-right font-semibold ${
                            variation && variation >= 0 ? "text-emerald-600" : "text-red-600"
                          } ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {variation !== null && row.current !== 0
                            ? `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%`
                            : "-"}
                        </td>
                      ) : columnMode === "variationAmount" ? (
                        <td
                          className={`px-6 py-3 text-right font-semibold ${
                            variationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                          } ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {row.current !== 0
                            ? `${variationAmount >= 0 ? "+" : ""}${formatCurrency(variationAmount)}`
                            : "-"}
                        </td>
                      ) : null}
                    </>
                  )}
                  {!showStructureCols && view === "comparison" && isComparisonMode && (
                    <>
                      {entitiesToCompare.map((entity) => {
                        const entityRows = entityDataMap[entity.id] || []
                        const entityRow = entityRows.find((r) => r.label === row.label) || row
                        return (
                          <td
                            key={entity.id}
                            className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}
                          >
                            {entityRow.current !== 0 ? formatCurrency(entityRow.current) : "-"}
                          </td>
                        )
                      })}
                    </>
                  )}
                  {!showStructureCols && view === "ddm" && (
                    <>
                      <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                        {row.current !== 0 ? formatCurrency(row.current) : "-"}
                      </td>
                      <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                        {row.prior !== 0 ? formatCurrency(row.prior) : "-"}
                      </td>
                      {columnMode === "variationPercent" ? (
                        <td
                          className={`px-6 py-3 text-right font-semibold ${
                            variation && variation >= 0 ? "text-emerald-600" : "text-red-600"
                          } ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {variation !== null && row.current !== 0
                            ? `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%`
                            : "-"}
                        </td>
                      ) : columnMode === "variationAmount" ? (
                        <td
                          className={`px-6 py-3 text-right font-semibold ${
                            variationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                          } ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {row.current !== 0
                            ? `${variationAmount >= 0 ? "+" : ""}${formatCurrency(variationAmount)}`
                            : "-"}
                        </td>
                      ) : null}
                    </>
                  )}
                  {!showStructureCols && view === "ytd" && (
                    <>
                      <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                        {row.current !== 0 ? formatCurrency(row.current) : "-"}
                      </td>
                      <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                        {row.prior !== 0 ? formatCurrency(row.prior) : "-"}
                      </td>
                      {columnMode === "variationPercent" ? (
                        <td
                          className={`px-6 py-3 text-right font-semibold ${
                            variation && variation >= 0 ? "text-emerald-600" : "text-red-600"
                          } ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {variation !== null && row.current !== 0
                            ? `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%`
                            : "-"}
                        </td>
                      ) : columnMode === "variationAmount" ? (
                        <td
                          className={`px-6 py-3 text-right font-semibold ${
                            variationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                          } ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {row.current !== 0
                            ? `${variationAmount >= 0 ? "+" : ""}${formatCurrency(variationAmount)}`
                            : "-"}
                        </td>
                      ) : null}
                    </>
                  )}
                  {!showStructureCols && view === "12months" && row.trendValues && (
                    <>
                      {row.trendValues.map((value, valueIdx) => (
                        <td
                          key={valueIdx}
                          className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {columnMode === "variationAmount" || columnMode === "variationPercent"
                              ? (() => {
                                  const trendVariation = getTrendVariation(row.trendValues ?? [], valueIdx)
                                  const trendVariationAmount = getTrendVariationAmount(row.trendValues ?? [], valueIdx)
                                  if (columnMode === "variationPercent") {
                                    return trendVariation !== null ? `${trendVariation >= 0 ? "+" : ""}${trendVariation.toFixed(1)}%` : "-"
                                  }
                                  return trendVariationAmount !== null
                                    ? `${trendVariationAmount >= 0 ? "+" : ""}${formatCurrency(trendVariationAmount)}`
                                    : "-"
                                })()
                              : (value !== 0 ? formatCurrency(value) : "-")}
                        </td>
                      ))}
                    </>
                  )}
                  {!showStructureCols && view === "quarters" && row.trendValues && (
                    <>
                      {row.trendValues.map((value, valueIdx) => (
                        <td
                          key={valueIdx}
                          className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {columnMode === "variationAmount" || columnMode === "variationPercent"
                              ? (() => {
                                  const trendVariation = getTrendVariation(row.trendValues ?? [], valueIdx)
                                  const trendVariationAmount = getTrendVariationAmount(row.trendValues ?? [], valueIdx)
                                  if (columnMode === "variationPercent") {
                                    return trendVariation !== null ? `${trendVariation >= 0 ? "+" : ""}${trendVariation.toFixed(1)}%` : "-"
                                  }
                                  return trendVariationAmount !== null
                                    ? `${trendVariationAmount >= 0 ? "+" : ""}${formatCurrency(trendVariationAmount)}`
                                    : "-"
                                })()
                              : (value !== 0 ? formatCurrency(value) : "-")}
                        </td>
                      ))}
                    </>
                  )}
                  {!showStructureCols && view === "years" && row.trendValues && (
                    <>
                      {row.trendValues.map((value, valueIdx) => (
                          <td
                            key={valueIdx}
                            className={cn(
                              "px-6 py-3 text-right",
                              isBoldRow ? "font-semibold font-bold" : "text-slate-500",
                              shouldHideAmounts ? "text-white" : "",
                              isForecastSection && valueIdx === 0 ? "bg-slate-50" : ""
                            )}
                          >
                            {columnMode === "variationAmount" || columnMode === "variationPercent"
                                ? (() => {
                                    const trendVariation = getTrendVariation(row.trendValues ?? [], valueIdx)
                                    const trendVariationAmount = getTrendVariationAmount(row.trendValues ?? [], valueIdx)
                                    if (columnMode === "variationPercent") {
                                      return trendVariation !== null ? `${trendVariation >= 0 ? "+" : ""}${trendVariation.toFixed(1)}%` : "-"
                                    }
                                    return trendVariationAmount !== null
                                      ? `${trendVariationAmount >= 0 ? "+" : ""}${formatCurrency(trendVariationAmount)}`
                                      : "-"
                                  })()
                                : (value !== 0 ? formatCurrency(value) : "-")}
                          </td>
                      ))}
                    </>
                  )}
                  {!showStructureCols &&
                    (view === "12months" || view === "quarters" || view === "years") &&
                    !row.trendValues && (
                    <>
                      {Array.from({
                        length:
                          view === "12months"
                            ? 12
                            : view === "quarters"
                              ? 5
                              : isForecastSection
                                ? forecastYearColumnCount
                                : PERFORMANCE_CHART_YEAR_COUNT,
                      }).map((_, idx) => (
                          <td
                            key={idx}
                            className={cn(
                              "px-6 py-3 text-right font-semibold text-white",
                              isForecastSection && view === "years" && idx === 0 ? "bg-slate-50" : ""
                            )}
                          >
                            -
                          </td>
                      ))}
                    </>
                  )}
                </tr>
                {canExpand && isExpanded && expandChildren.length > 0 &&
                  expandChildren.map((child, accIdx) => {
                  const accountVariation =
                    child.priorAmount !== undefined && child.amount && child.priorAmount
                      ? calculateVariation(child.amount, child.priorAmount)
                      : null
                  const accountVariationAmount =
                    child.priorAmount !== undefined && child.amount && child.priorAmount
                      ? child.amount - child.priorAmount
                      : 0
                  const showCodeAndLabelSeparately =
                    expandMode === "annex" ||
                    !accountLabelAlreadyIncludesNumber(child.code, child.label)

                  return (
                    <tr
                      key={`${idx}-expand-${accIdx}`}
                      data-testid={
                        expandMode === "annex"
                          ? "balance-sheet-summary-annex-child"
                          : "balance-sheet-summary-gl-child"
                      }
                      className="[&>td]:bg-slate-50 [&>td:first-child]:bg-slate-50"
                    >
                      <td className="px-6 py-2 text-slate-500 pl-20 whitespace-nowrap">
                        {showCodeAndLabelSeparately ? (
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-slate-500">{child.code}</span>
                            <span className="text-sm whitespace-nowrap">{child.label}</span>
                          </div>
                        ) : (
                          <span className="text-sm whitespace-nowrap">
                            {child.label.trim() || child.code}
                          </span>
                        )}
                      </td>
                      {view === "current" && (
                        <td className="px-6 py-2 text-right text-sm font-normal text-slate-700">
                          {child.amount !== 0 ? formatCurrency(child.amount) : "-"}
                        </td>
                      )}
                      {view === "comparison" && !isComparisonMode && (
                        <>
                          <td className="px-6 py-2 text-right text-sm font-normal text-slate-700">
                            {child.amount !== 0 ? formatCurrency(child.amount) : "-"}
                          </td>
                          <td className="px-6 py-2 text-right text-sm font-normal text-slate-500">
                            {child.priorAmount !== undefined && child.priorAmount !== 0
                              ? formatCurrency(child.priorAmount)
                              : "-"}
                          </td>
                          {columnMode === "variationPercent" ? (
                            <td
                              className={`px-6 py-2 text-right text-sm font-normal ${
                                accountVariation && accountVariation >= 0 ? "text-emerald-600" : "text-red-600"
                              }`}
                            >
                              {accountVariation !== null && child.amount !== 0
                                ? `${accountVariation >= 0 ? "+" : ""}${accountVariation.toFixed(1)}%`
                                : "-"}
                            </td>
                          ) : columnMode === "variationAmount" ? (
                            <td
                              className={`px-6 py-2 text-right text-sm font-normal ${
                                accountVariationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                              }`}
                            >
                              {child.amount !== 0
                                ? `${accountVariationAmount >= 0 ? "+" : ""}${formatCurrency(accountVariationAmount)}`
                                : "-"}
                            </td>
                          ) : null}
                        </>
                      )}
                      {view === "comparison" && isComparisonMode && (
                        entitiesToCompare.map((entity) => (
                          <td key={entity.id} className="px-6 py-2 text-right text-sm font-normal text-slate-400">
                            -
                          </td>
                        ))
                      )}
                      {(view === "12months" || view === "quarters" || view === "years") && (
                        (child.trendValues && child.trendValues.length > 0
                          ? child.trendValues
                          : Array.from({
                              length:
                                view === "12months"
                                  ? 12
                                  : view === "quarters"
                                    ? 5
                                    : isForecastSection
                                      ? forecastYearColumnCount
                                      : PERFORMANCE_CHART_YEAR_COUNT,
                            }).map(() => 0)
                        ).map((value, cellIdx) => (
                          <td
                            key={cellIdx}
                            className={cn(
                              "px-6 py-2 text-right text-sm font-normal text-slate-700",
                              isForecastSection && view === "years" && cellIdx === 0 ? "bg-slate-50" : ""
                            )}
                          >
                            {value !== 0 ? formatCurrency(value) : "-"}
                          </td>
                        ))
                      )}
                    </tr>
                  )
                })}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div className="border-t border-slate-200 bg-slate-50/90 px-6 py-4 sm:px-7">
        <p className={cn("text-xs", dashboardCardBodyMutedClass)}>
          Note: Les données affichées sont à titre informatif. Consulter les états financiers audités pour les montants officiels.
        </p>
      </div>

      {lineAnalysis && !disableRowInteractions && (
        <aside
          ref={analysisCardRef}
          className="border-t border-slate-200 bg-gradient-to-b from-slate-50 via-white to-slate-50/60 px-5 py-6 sm:px-6 sm:py-7"
        >
          <div className="min-w-0">{renderUnifiedAnalysisNoteCard()}</div>
        </aside>
      )}

      <Dialog
        open={addSpaceDialogOpen}
        onOpenChange={(open) => {
          setAddSpaceDialogOpen(open)
          if (!open) resetAddSpaceDialog()
        }}
      >
        <DialogContent
          showCloseButton
          className="top-[max(0.75rem,env(safe-area-inset-top))] flex max-h-[calc(100dvh-1.5rem)] w-[min(100%,calc(100vw-1rem))] max-w-2xl translate-y-0 flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl shadow-slate-900/10 sm:max-w-2xl"
        >
          <div className="flex shrink-0 items-start gap-3 border-b border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
            <div className={cn("mt-0.5 h-11 w-1.5 shrink-0", dashboardCardAccentBarClass)} />
            <DialogHeader className="min-w-0 flex-1 gap-0 space-y-2 text-left sm:text-left">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className={cn("text-lg", dashboardCardTitleClass)}>Ajouter un espace</DialogTitle>
                <Badge
                  variant="secondary"
                  className="border border-slate-200 bg-slate-100/90 font-medium text-[#2A2F3A] shadow-none"
                >
                  <Sparkles className="h-3 w-3 text-[#E0742D]" />
                  Sommaire
                </Badge>
              </div>
              <DialogDescription className={cn("text-sm leading-relaxed", dashboardCardBodyMutedClass)}>
                Indiquez si la ligne vide est insérée{" "}
                <span className="font-medium text-[#2A2F3A]">au-dessus</span> ou{" "}
                <span className="font-medium text-[#2A2F3A]">en dessous</span> d’un poste du sommaire, puis choisissez ce
                poste.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-7">
              <section className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Position</p>
                <RadioGroup
                  value={addSpacePlacement}
                  onValueChange={(v) => setAddSpacePlacement(v as "above" | "below")}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                >
                  <Label
                    htmlFor="bs-space-placement-above"
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-2xl border px-4 py-3.5 transition sm:px-5 sm:py-4",
                      addSpacePlacement === "above"
                        ? "border-[#E0742D]/45 bg-orange-50/50 shadow-sm ring-2 ring-[#E0742D]/20"
                        : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/90"
                    )}
                  >
                    <RadioGroupItem value="above" id="bs-space-placement-above" className="mt-0.5 shrink-0" />
                    <span className="min-w-0 leading-snug">
                      <span className="block text-[15px] font-semibold text-[#2A2F3A]">Au-dessus</span>
                      <span className={cn("mt-0.5 block text-[13px]", dashboardCardBodyMutedClass)}>
                        Ligne vide placée avant le poste choisi.
                      </span>
                    </span>
                  </Label>
                  <Label
                    htmlFor="bs-space-placement-below"
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-2xl border px-4 py-3.5 transition sm:px-5 sm:py-4",
                      addSpacePlacement === "below"
                        ? "border-[#E0742D]/45 bg-orange-50/50 shadow-sm ring-2 ring-[#E0742D]/20"
                        : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/90"
                    )}
                  >
                    <RadioGroupItem value="below" id="bs-space-placement-below" className="mt-0.5 shrink-0" />
                    <span className="min-w-0 leading-snug">
                      <span className="block text-[15px] font-semibold text-[#2A2F3A]">En dessous</span>
                      <span className={cn("mt-0.5 block text-[13px]", dashboardCardBodyMutedClass)}>
                        Ligne vide placée après le poste choisi.
                      </span>
                    </span>
                  </Label>
                </RadioGroup>
              </section>
              <section className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Poste de référence</p>
                <Select
                  value={addSpaceTargetIdx !== null ? String(addSpaceTargetIdx) : undefined}
                  onValueChange={(v) => {
                    const idx = Number.parseInt(v, 10)
                    if (Number.isNaN(idx)) return
                    setAddSpaceTargetIdx(idx)
                  }}
                >
                  <SelectTrigger
                    size="default"
                    className="h-11 w-full max-w-none rounded-xl border-slate-200 bg-white px-4 text-left text-[#2A2F3A] shadow-sm"
                  >
                    <SelectValue placeholder="Choisir un poste du sommaire" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    {spacerTargetPosts.map(({ globalIdx, label }) => (
                      <SelectItem key={globalIdx} value={String(globalIdx)} className="rounded-lg">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </section>
            </div>
          </div>
          <DialogFooter className="shrink-0 gap-3 border-t border-slate-200/90 bg-slate-50/80 px-5 py-4 sm:justify-end sm:px-6">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl border-slate-300 bg-white text-[#2A2F3A] hover:bg-slate-50"
              onClick={() => setAddSpaceDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-xl bg-[#2A2F3A] px-4 font-semibold text-[#E6D6C3] shadow-sm transition hover:bg-[#353b47] disabled:opacity-60"
              disabled={addSpaceTargetIdx === null}
              onClick={() => {
                if (addSpaceTargetIdx === null) return
                if (addSpacePlacement === "above") {
                  structEdit.insertEmptySpacerAbove(addSpaceTargetIdx)
                } else {
                  structEdit.insertEmptySpacerBelow(addSpaceTargetIdx)
                }
                setAddSpaceDialogOpen(false)
                resetAddSpaceDialog()
              }}
            >
              Insérer l&apos;espace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addPostDialogOpen}
        onOpenChange={(open) => {
          setAddPostDialogOpen(open)
          if (!open) resetAddPostDialog()
        }}
      >
        <DialogContent
          showCloseButton
          className="top-[max(0.75rem,env(safe-area-inset-top))] flex max-h-[calc(100dvh-1.5rem)] w-[min(100%,calc(100vw-1rem))] max-w-2xl translate-y-0 flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl shadow-slate-900/10 sm:max-w-2xl"
        >
          <div className="flex shrink-0 items-start gap-3 border-b border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
            <div className={cn("mt-0.5 h-11 w-1.5 shrink-0", dashboardCardAccentBarClass)} />
            <DialogHeader className="min-w-0 flex-1 gap-0 space-y-2 text-left sm:text-left">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className={cn("text-lg", dashboardCardTitleClass)}>
                  {editingPostGlobalIdx !== null
                    ? "Modifier le poste"
                    : addPostStep === "anchor"
                      ? "Ajouter un poste"
                      : "Présentation du poste"}
                </DialogTitle>
                {editingPostGlobalIdx !== null ? (
                  <Badge
                    variant="secondary"
                    className="border border-slate-200 bg-slate-100/90 font-medium text-[#2A2F3A] shadow-none"
                  >
                    <Sparkles className="h-3 w-3 text-[#E0742D]" />
                    Modification
                  </Badge>
                ) : (
                  !addPostPresentationOnly && (
                    <Badge
                      variant="secondary"
                      className="border border-slate-200 bg-slate-100/90 font-medium text-[#2A2F3A] shadow-none"
                    >
                      <Sparkles className="h-3 w-3 text-[#E0742D]" />
                      {addPostStep === "anchor" ? "Étape 1 · Emplacement" : "Étape 2 · Style"}
                    </Badge>
                  )
                )}
              </div>
              <DialogDescription className={cn("text-sm leading-relaxed", dashboardCardBodyMutedClass)}>
                {addPostStep === "anchor" ? (
                  <>
                    Choisissez d’abord si le poste est inséré{" "}
                    <span className="font-medium text-[#2A2F3A]">au-dessus</span> ou{" "}
                    <span className="font-medium text-[#2A2F3A]">en dessous</span>, puis le poste de référence dans la
                    liste.
                  </>
                ) : editingPostGlobalIdx !== null ? (
                  <>
                    Ajustez le niveau au sommaire et la typographie pour «{" "}
                    <span className="font-medium text-[#2A2F3A]">
                      {String(structEdit.structure[editingPostGlobalIdx]?.label ?? "").trim() || "—"}
                    </span>
                    ».
                  </>
                ) : addPostPresentationOnly ? (
                  <>Définissez le niveau et la typographie du poste au sommaire.</>
                ) : (
                  <>
                    Le poste sera inséré{" "}
                    {addPostPlacement === "above" ? "au-dessus" : "en dessous"} de «{" "}
                    <span className="font-medium text-[#2A2F3A]">{addPostRefLabel}</span> ». Définissez son niveau au
                    sommaire.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
          </div>

          {addPostStep === "anchor" ? (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">
                <div className="flex flex-col gap-7">
                  <section className="space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Position</p>
                    <RadioGroup
                      value={addPostPlacement}
                      onValueChange={(v) => setAddPostPlacement(v as "above" | "below")}
                      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                    >
                      <Label
                        htmlFor="bs-post-placement-above"
                        className={cn(
                          "flex cursor-pointer gap-3 rounded-2xl border px-4 py-3.5 transition sm:px-5 sm:py-4",
                          addPostPlacement === "above"
                            ? "border-[#E0742D]/45 bg-orange-50/50 shadow-sm ring-2 ring-[#E0742D]/20"
                            : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/90"
                        )}
                      >
                        <RadioGroupItem value="above" id="bs-post-placement-above" className="mt-0.5 shrink-0" />
                        <span className="min-w-0 leading-snug">
                          <span className="block text-[15px] font-semibold text-[#2A2F3A]">Au-dessus</span>
                          <span className={cn("mt-0.5 block text-[13px]", dashboardCardBodyMutedClass)}>
                            Le nouveau poste est placé avant le poste choisi.
                          </span>
                        </span>
                      </Label>
                      <Label
                        htmlFor="bs-post-placement-below"
                        className={cn(
                          "flex cursor-pointer gap-3 rounded-2xl border px-4 py-3.5 transition sm:px-5 sm:py-4",
                          addPostPlacement === "below"
                            ? "border-[#E0742D]/45 bg-orange-50/50 shadow-sm ring-2 ring-[#E0742D]/20"
                            : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/90"
                        )}
                      >
                        <RadioGroupItem value="below" id="bs-post-placement-below" className="mt-0.5 shrink-0" />
                        <span className="min-w-0 leading-snug">
                          <span className="block text-[15px] font-semibold text-[#2A2F3A]">En dessous</span>
                          <span className={cn("mt-0.5 block text-[13px]", dashboardCardBodyMutedClass)}>
                            Le nouveau poste est placé après le poste choisi.
                          </span>
                        </span>
                      </Label>
                    </RadioGroup>
                  </section>
                  <section className="space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Poste de référence</p>
                    <Select
                      value={addPostAnchorIdx !== null ? String(addPostAnchorIdx) : undefined}
                      onValueChange={(v) => {
                        const idx = Number.parseInt(v, 10)
                        if (Number.isNaN(idx)) return
                        const p = spacerTargetPosts.find((x) => x.globalIdx === idx)
                        setAddPostAnchorIdx(idx)
                        if (p) setAddPostRefLabel(p.label)
                      }}
                    >
                      <SelectTrigger
                        size="default"
                        className="h-11 w-full max-w-none rounded-xl border-slate-200 bg-white px-4 text-left text-[#2A2F3A] shadow-sm"
                      >
                        <SelectValue placeholder="Choisir un poste du sommaire" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        {spacerTargetPosts.map(({ globalIdx, label }) => (
                          <SelectItem key={globalIdx} value={String(globalIdx)} className="rounded-lg">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </section>
                </div>
              </div>
              <DialogFooter className="shrink-0 gap-3 border-t border-slate-200/90 bg-slate-50/80 px-5 py-4 sm:justify-end sm:px-6">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-slate-300 bg-white text-[#2A2F3A] hover:bg-slate-50"
                  onClick={() => setAddPostDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl bg-[#2A2F3A] px-4 font-semibold text-[#E6D6C3] shadow-sm transition hover:bg-[#353b47] disabled:opacity-60"
                  disabled={addPostAnchorIdx === null}
                  onClick={() => {
                    if (addPostAnchorIdx === null) return
                    setAddPostStep("kind")
                  }}
                >
                  Continuer
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">
                <div className="flex flex-col gap-7 sm:gap-8">
                  {!addPostPresentationOnly && (
                    <section className="space-y-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Poste de référence
                      </p>
                      <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-r from-slate-50/90 to-white px-4 py-3.5 shadow-sm sm:px-5 sm:py-4">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <span className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 ring-1 ring-slate-200/80">
                            {addPostPlacement === "above" ? "Inséré au-dessus de" : "Inséré en dessous de"}
                          </span>
                          <span className="min-w-0 flex-1 text-base font-semibold leading-snug text-[#2A2F3A]">
                            {addPostRefLabel}
                          </span>
                        </div>
                      </div>
                    </section>
                  )}

                  <section className="space-y-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Niveau au sommaire
                    </p>
                    <RadioGroup
                      value={addPostRank}
                      onValueChange={(v) => setAddPostRank(v as "primary" | "secondary")}
                      className="flex flex-col gap-4"
                    >
                      <Label
                        htmlFor="bs-post-kind-primary"
                        className={cn(
                          "flex cursor-pointer gap-4 rounded-2xl border px-4 py-4 transition sm:px-5 sm:py-[1.125rem]",
                          addPostRank === "primary"
                            ? "border-[#E0742D]/45 bg-orange-50/50 shadow-sm ring-2 ring-[#E0742D]/20"
                            : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/90"
                        )}
                      >
                        <RadioGroupItem
                          value="primary"
                          id="bs-post-kind-primary"
                          className="mt-1.5 shrink-0 sm:mt-2"
                        />
                        <span className="flex min-w-0 flex-1 items-start gap-4">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200/80">
                            <AlignLeft className="h-[1.125rem] w-[1.125rem] text-slate-600" />
                          </span>
                          <span className="min-w-0 space-y-1.5 pt-0.5 leading-snug">
                            <span className="block text-[15px] font-semibold text-[#2A2F3A]">Poste principal</span>
                            <span className={cn("block text-[13px] leading-relaxed", dashboardCardBodyMutedClass)}>
                              Aligné à gauche, sans décalage (titres de section, totaux, etc.)
                            </span>
                          </span>
                        </span>
                      </Label>
                      <Label
                        htmlFor="bs-post-kind-secondary"
                        className={cn(
                          "flex cursor-pointer gap-4 rounded-2xl border px-4 py-4 transition sm:px-5 sm:py-[1.125rem]",
                          addPostRank === "secondary"
                            ? "border-[#E0742D]/45 bg-orange-50/50 shadow-sm ring-2 ring-[#E0742D]/20"
                            : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/90"
                        )}
                      >
                        <RadioGroupItem
                          value="secondary"
                          id="bs-post-kind-secondary"
                          className="mt-1.5 shrink-0 sm:mt-2"
                        />
                        <span className="flex min-w-0 flex-1 items-start gap-4">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200/80">
                            <IndentIncrease className="h-[1.125rem] w-[1.125rem] text-slate-600" />
                          </span>
                          <span className="min-w-0 space-y-1.5 pt-0.5 leading-snug">
                            <span className="block text-[15px] font-semibold text-[#2A2F3A]">Poste secondaire</span>
                            <span className={cn("block text-[13px] leading-relaxed", dashboardCardBodyMutedClass)}>
                              Décalé vers la droite (ex. actifs courants, passifs courants)
                            </span>
                          </span>
                        </span>
                      </Label>
                    </RadioGroup>
                  </section>

                  <section className="space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Typographie</p>
                    <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/90 p-4 shadow-sm sm:p-5">
                      <label className="flex cursor-pointer items-start gap-4">
                        <Checkbox
                          checked={addPostBold}
                          onCheckedChange={(v) => setAddPostBold(v === true)}
                          className="mt-0.5 shrink-0 border-slate-300 data-[state=checked]:border-[#2A2F3A] data-[state=checked]:bg-[#2A2F3A]"
                        />
                        <span className="min-w-0 space-y-1.5 text-[#2A2F3A]">
                          <span className="block text-[15px] font-semibold">Mettre en gras</span>
                          <span className={cn("block text-[13px] leading-relaxed", dashboardCardBodyMutedClass)}>
                            Libellé en gras au sommaire une fois la structure enregistrée.
                          </span>
                        </span>
                      </label>
                    </div>
                  </section>
                </div>
              </div>

              <DialogFooter
                className={cn(
                  "shrink-0 gap-3 border-t border-slate-200/90 bg-slate-50/80 px-5 py-4 sm:px-6",
                  !addPostPresentationOnly && editingPostGlobalIdx === null ? "sm:justify-between" : "sm:justify-end"
                )}
              >
                {!addPostPresentationOnly && editingPostGlobalIdx === null && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 rounded-xl text-[#5C5F66] hover:bg-slate-100"
                    onClick={() => setAddPostStep("anchor")}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Retour
                  </Button>
                )}
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-slate-300 bg-white text-[#2A2F3A] hover:bg-slate-50"
                    onClick={() => setAddPostDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-xl bg-[#2A2F3A] px-4 font-semibold text-[#E6D6C3] shadow-sm transition hover:bg-[#353b47] disabled:opacity-60"
                    disabled={editingPostGlobalIdx === null && addPostAnchorIdx === null}
                    onClick={() => {
                      if (editingPostGlobalIdx !== null) {
                        structEdit.updateRow(editingPostGlobalIdx, {
                          indent: addPostRank === "secondary",
                          isBold: addPostBold,
                        })
                        setAddPostDialogOpen(false)
                        resetAddPostDialog()
                        return
                      }
                      if (addPostAnchorIdx === null) return
                      const opts = {
                        indent: addPostRank === "secondary",
                        isBold: addPostBold,
                      }
                      if (addPostPresentationOnly) {
                        structEdit.insertPostAbove(0, opts)
                      } else if (addPostPlacement === "above") {
                        structEdit.insertPostAbove(addPostAnchorIdx, opts)
                      } else {
                        structEdit.insertPostBelow(addPostAnchorIdx, opts)
                      }
                      setAddPostDialogOpen(false)
                      resetAddPostDialog()
                    }}
                  >
                    {editingPostGlobalIdx !== null ? "Enregistrer" : "Ajouter le poste"}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}

