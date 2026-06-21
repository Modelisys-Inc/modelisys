"use client"

import { Fragment, useState, useEffect, useMemo } from "react"
import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import {
  getFinancialStatementSeries,
  listForecastConfigs,
  getStatementStructure,
  type FinancialStatementSeriesParams,
  type FinancialStatementRow,
} from "@/lib/api"
import { HORIZON_LABEL } from "@/lib/financial-statement-horizon-labels"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { reverseSeriesOrderForDisplay } from "@/lib/series-utils"
import {
  monthShortLabelsFromReference,
  monthTrendFromReference,
  quarterLabelsFromReference,
  quarterTrendFromReference,
  yearLabelsFromReference,
  yearTrendFromReference,
} from "@/lib/series-reference-columns"
import { useIncomeStatementStructureEdit } from "@/hooks/use-income-statement-structure-edit"
import { useIncomeStatementParentLinkCodes } from "@/hooks/use-income-statement-parent-link-codes"
import {
  TOTAL_CHARGES_LABEL,
  collectDistinctLinkCodesFromStructure,
  mapLinkCodesToOwnerLabel,
  findStructureRowForStatementLine,
  seriesRowBelongsToRevenueAnnexDetail,
  extractGroupePrefixFromCompositeLinkCode,
  isAnnexLetterInputEditable,
  isCodeMappingEnabled,
  isOmittedIncomeStatementSummaryRowLabel,
  isShowInDetail,
  isStructureRowDetailOnly,
  isStructureRowEmptyLabel,
  isStructureRowHidden,
  normLabel,
  normalizeAnnexLetter,
  normalizeLiaisonMode,
} from "@/lib/income-statement-structure-utils"
import { IncomeStatementLiaisonCell } from "@/components/income-statement-liaison-cell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  AlignLeft,
  ArrowLeft,
  BookMarked,
  Eye,
  EyeOff,
  Hash,
  IndentIncrease,
  LayoutList,
  Link2,
  Loader2,
  PanelTop,
  Pencil,
  Plus,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react"
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
import {
  calendarQuarterFromMonth,
  formatCalendarMonthYear,
  formatPriorCalendarMonth,
  formatQuarterShortLabel,
  formatSameMonthPriorYear,
  priorCalendarQuarter,
} from "@/lib/financial-period-labels"

interface IncomeStatementSummaryProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years" | "24months"
  columnMode?: "variationAmount" | "variationPercent" | "percentage" | "comparison"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  title?: string
  projectionYears?: 3 | 4 | 5
  /** Force forecast behavior (used in projections). */
  forceForecastSection?: boolean
  /** Base year used for forecast year headers (used in projections). */
  forecastBaseYear?: number
  /** In projections: use actuals for (baseYear-1) from series, keep projected years at 0. */
  forecastUseSeriesActuals?: boolean
  /** Projections: link Sommaire Pro Forma to Hypothèses (forecast config). */
  projectionId?: string | null
  comparisonType?: "lastMonth" | "pastMonth" | "budget"
  selectedBudgetId?: string | null
  selectedBudgetName?: string | null
  fiscalYear?: number
  /** Mois calendaire (1–12) de la date de référence — pour les en-têtes « Avril 2025 », etc. */
  referenceMonth?: number
  rows?: FinancialStatementRow[]
  loading?: boolean
  showIncomeStatementStructureSettings?: boolean
  /** Synchronise les séries API après sauvegarde de la structure (avec la page parente). */
  structureVersion?: number
  onIncomeStatementStructureSaved?: () => void
}

interface SummaryRow {
  label: string
  current: number
  prior: number
  isBold?: boolean
  isSection?: boolean
  isResult?: boolean
  isNetIncome?: boolean
  isEBITA?: boolean
  isMargin?: boolean // For margin percentage rows
  indent?: boolean
  /** Ligne de séparation au-dessus (structure / API). */
  separatorAbove?: boolean
  // For trend views (12months, quarters, years)
  trendValues?: number[]
}

function isTruthySeparatorAbove(raw: unknown): boolean {
  return raw === true || raw === "true" || raw === 1
}

/** Indentation sommaire : valeur explicite (structure / API) sinon règle legacy. */
function indentForSummaryRow(
  row: Pick<SummaryRow, "isBold" | "isSection" | "isResult"> & { indent?: boolean }
): boolean {
  if (typeof row.indent === "boolean") return row.indent
  return !row.isBold && !row.isSection && !row.isResult
}

export function IncomeStatementSummary({
  period,
  view,
  columnMode = "variationAmount",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  title,
  projectionYears = 5,
  forceForecastSection = false,
  forecastBaseYear,
  forecastUseSeriesActuals = false,
  projectionId = null,
  comparisonType = "lastMonth",
  selectedBudgetId = null,
  selectedBudgetName = null,
  fiscalYear,
  referenceMonth,
  rows: backendRows = [],
  loading = false,
  showIncomeStatementStructureSettings = false,
  structureVersion = 0,
  onIncomeStatementStructureSaved,
}: IncomeStatementSummaryProps) {
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
  /** Sommaire sans aucun poste « ancrable » : modale limitée à l’écran Présentation (pas d’étape Emplacement). */
  const [addPostPresentationOnly, setAddPostPresentationOnly] = useState(false)
  const [addPostPlacement, setAddPostPlacement] = useState<"above" | "below">("above")
  const [editingPostGlobalIdx, setEditingPostGlobalIdx] = useState<number | null>(null)
  // Projections use an explicit flag; income-statement keeps header reference date behavior.
  const isForecastSection = forceForecastSection

  const [forecastRevenueValues, setForecastRevenueValues] = useState<Record<string, number>>({})
  const [forecastRevenueAdjustments, setForecastRevenueAdjustments] = useState<
    Record<string, Array<{ id: string; type: "amount" | "growthPercent" | "growthAmount"; value: number; note?: string }>>
  >({})
  const [forecastStructure, setForecastStructure] = useState<Record<string, unknown>[] | null>(null)

  useEffect(() => {
    if (!isForecastSection || !companyId || !projectionId) return
    let cancelled = false

    const load = async () => {
      try {
        const [cfgs, struct] = await Promise.all([
          listForecastConfigs(companyId, { config_type: "income-statement-detail", projection_id: projectionId }),
          getStatementStructure(companyId, "income-statement"),
        ])
        if (cancelled) return
        const data = (cfgs[0]?.data ?? {}) as Record<string, unknown>
        const rv = (data.revenueValues ?? {}) as Record<string, number>
        const ra = (data.revenueAdjustments ?? {}) as Record<string, unknown>

        const parsedAdjustments: Record<
          string,
          Array<{ id: string; type: "amount" | "growthPercent" | "growthAmount"; value: number; note?: string }>
        > = {}
        if (ra && typeof ra === "object" && !Array.isArray(ra)) {
          for (const [k, v] of Object.entries(ra)) {
            if (Array.isArray(v)) {
              parsedAdjustments[k] = v as typeof parsedAdjustments[string]
            } else if (v && typeof v === "object") {
              parsedAdjustments[k] = [v as typeof parsedAdjustments[string][number]]
            }
          }
        }

        setForecastRevenueValues(rv ?? {})
        setForecastRevenueAdjustments(parsedAdjustments)
        setForecastStructure(struct?.structure ?? [])
      } catch {
        if (!cancelled) {
          setForecastRevenueValues({})
          setForecastRevenueAdjustments({})
          setForecastStructure([])
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [companyId, isForecastSection, projectionId])

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

  // Determine months needed for series API based on view
  const isMultiPeriodView = view === "12months" || view === "24months" || view === "quarters" || view === "years"
  const seriesMonthsNeeded = view === "24months" ? 24 : view === "years" ? 72 : view === "quarters" ? 15 : 12

  // Fetch multi-period series data from API
  const { rows: seriesRows, periods: seriesPeriods, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "income-statement",
    fiscalYear: fiscalYear || new Date().getFullYear(),
    months: seriesMonthsNeeded,
    divisionId: divisionId || undefined,
    subDivisionId: subDivisionId || undefined,
    enabled: isMultiPeriodView && (!isForecastSection || forecastUseSeriesActuals),
    structureVersion,
  })

  const isCompanyComparison = columnMode === "comparison" && !companyId
  const isDivisionComparison = columnMode === "comparison" && companyId && !divisionId
  const isSubDivisionComparison = columnMode === "comparison" && companyId && divisionId && !subDivisionId
  const isComparisonMode = isCompanyComparison || isDivisionComparison || isSubDivisionComparison

  const canInlineStructureEdit =
    showIncomeStatementStructureSettings && !!companyId && !isComparisonMode
  const structEdit = useIncomeStatementStructureEdit(
    companyId ?? null,
    structureEditMode && canInlineStructureEdit
  )
  const { codes: incomeParentLinkCodes, labels: incomeParentLinkLabels } =
    useIncomeStatementParentLinkCodes(structureEditMode && canInlineStructureEdit)

  const refMonth = referenceMonth ?? new Date().getMonth() + 1
  const refYear = fiscalYear ?? new Date().getFullYear()

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
  
  // Map backend FinancialStatementRow[] to internal SummaryRow[]
  const mapBackendRows = (apiRows: FinancialStatementRow[]): SummaryRow[] => {
    return apiRows
      .filter(
        (row) =>
          !row.detailOnly && !isOmittedIncomeStatementSummaryRowLabel(row.label)
      )
      .map((row) => ({
        label: row.label,
        current: row.current,
        prior: row.prior,
        isBold: row.isBold,
        isSection: row.isSection,
        isResult: row.isResult,
        isNetIncome: row.label.toLowerCase().includes("bénéfice net") && row.isResult,
        isEBITA: row.label.toLowerCase() === "baiia",
        indent: indentForSummaryRow(row),
        separatorAbove: isTruthySeparatorAbove(row.separatorAbove),
      }))
  }

  // Helper function to capitalize first letter
  const capitalizeFirst = (str: string): string => {
    if (!str) return str
    // Special case: BAIIA should be all uppercase
    if (str.toLowerCase() === "baiia") return "BAIIA"
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  // Helper function to check if label should be bold
  const shouldBeBold = (label: string, row: SummaryRow): boolean => {
    const boldLabels = [
      "revenus",
      "bénéfice brut",
      "charges d'exploitation",
      "bénéfice avant impôts",
      "total des charges",
      "bénéfice net",
      "baiia"
    ]
    return (
      boldLabels.includes(label.toLowerCase()) ||
      !!row.isResult ||
      !!row.isNetIncome ||
      !!row.isEBITA ||
      !!row.isBold
    )
  }

  // Build data: use series API for multi-period views, backend rows for single-period
  const buildSeriesData = (): SummaryRow[] => {
    if (!seriesRows.length || !seriesPeriods.length) return []
    return seriesRows
      .filter(
        (row) =>
          !row.detailOnly && !isOmittedIncomeStatementSummaryRowLabel(row.label)
      )
      .map((row) => {
      let trendValues: number[]
      if (view === "quarters") {
        trendValues = quarterTrendFromReference(row, seriesPeriods, refMonth, refYear, 5)
      } else if (view === "years") {
        if (isForecastSection && forecastUseSeriesActuals) {
          const baseYear = forecastBaseYear ?? (refYear + 1)
          const actualYear = baseYear - 1
          const actual = yearTrendFromReference(row, seriesPeriods, actualYear, 1)[0] || 0
          trendValues = [actual, ...Array.from({ length: projectionYears }, () => 0)]
        } else {
          trendValues = yearTrendFromReference(row, seriesPeriods, refYear, 6)
        }
      } else if (view === "24months") {
        trendValues = monthTrendFromReference(row, seriesPeriods, refMonth, refYear, 24)
      } else {
        trendValues = monthTrendFromReference(row, seriesPeriods, refMonth, refYear, 12)
      }
      const lastAmount = trendValues[0] || 0
      const priorAmount = trendValues.length >= 2 ? trendValues[1] || 0 : 0
      return {
        label: row.label,
        current: lastAmount,
        prior: priorAmount,
        isBold: row.isBold || row.isResult,
        isSection: row.isSection,
        isResult: row.isResult,
        isNetIncome: row.label.toLowerCase().includes("bénéfice net") && row.isResult,
        isEBITA: row.label.toLowerCase() === "baiia",
        indent: indentForSummaryRow({
          isBold: row.isBold || row.isResult,
          isSection: row.isSection,
          isResult: row.isResult,
          indent: row.indent,
        }),
        separatorAbove: isTruthySeparatorAbove(row.separatorAbove),
        trendValues,
      }
    })
  }

  const data = useMemo(() => {
    if (isMultiPeriodView && (!isForecastSection || (forecastUseSeriesActuals && view === "years"))) return buildSeriesData()
    return mapBackendRows(backendRows)
  }, [
    isMultiPeriodView,
    isForecastSection,
    forecastUseSeriesActuals,
    forecastBaseYear,
    projectionYears,
    backendRows,
    seriesRows,
    seriesPeriods,
    view,
    refMonth,
    refYear,
  ])

  const proFormaRevenueTotals = useMemo(() => {
    if (!isForecastSection || !forecastUseSeriesActuals) return null
    if (view !== "years") return null
    if (!forecastBaseYear) return null
    if (!forecastStructure || forecastStructure.length === 0) return null

    // Eligible series rows = the same annex/detail scope as Hypothèses Revenus, keyed by seriesRow.id (rowId in detail).
    const eligibleSeries = seriesRows.filter((sr) =>
      seriesRowBelongsToRevenueAnnexDetail(sr, forecastStructure)
    )
    if (eligibleSeries.length === 0) return null

    const baseYear = forecastBaseYear
    const actualYear = baseYear - 1

    const yearCount = projectionYears + 1
    const rowActuals = new Map<string, number>()
    for (const sr of eligibleSeries) {
      const actual = yearTrendFromReference(sr, seriesPeriods, actualYear, 1)[0] || 0
      rowActuals.set(sr.id, actual)
    }

    const getLatestAdjustment = (rowId: string, yearIdx: number) => {
      const key = `${rowId}-${yearIdx}`
      const arr = forecastRevenueAdjustments[key]
      if (!arr || arr.length === 0) return null
      return arr[arr.length - 1]!
    }

    const memo = new Map<string, number>()
    const computeRowValue = (rowId: string, yearIdx: number): number => {
      const mkey = `${rowId}-${yearIdx}`
      const cached = memo.get(mkey)
      if (cached !== undefined) return cached

      const directKey = `${rowId}-${yearIdx}`
      if (forecastRevenueValues[directKey] !== undefined) {
        const v = Number(forecastRevenueValues[directKey] ?? 0)
        memo.set(mkey, v)
        return v
      }

      const adj = getLatestAdjustment(rowId, yearIdx)
      const baseDefault = yearIdx === 0 ? (rowActuals.get(rowId) ?? 0) : 0
      let v = baseDefault

      if (adj) {
        if (adj.type === "amount") {
          v = Number(adj.value ?? 0)
        } else {
          const prev = yearIdx > 0 ? computeRowValue(rowId, yearIdx - 1) : baseDefault
          if (adj.type === "growthPercent") {
            v = Math.round(prev * (1 + Number(adj.value ?? 0) / 100))
          } else if (adj.type === "growthAmount") {
            v = prev + Number(adj.value ?? 0)
          }
        }
      }

      memo.set(mkey, v)
      return v
    }

    return Array.from({ length: yearCount }, (_, yearIdx) =>
      eligibleSeries.reduce((sum, sr) => sum + computeRowValue(sr.id, yearIdx), 0)
    )
  }, [
    forecastBaseYear,
    forecastRevenueAdjustments,
    forecastRevenueValues,
    forecastStructure,
    forecastUseSeriesActuals,
    isForecastSection,
    projectionYears,
    seriesPeriods,
    seriesRows,
    seriesRowBelongsToRevenueAnnexDetail,
    view,
  ])

  const dataWithProFormaRevenue = useMemo(() => {
    if (!proFormaRevenueTotals) return data
    return data.map((r) => {
      if (normLabel(String(r.label ?? "")) !== "revenus") return r
      // Ne pas modifier l'année réelle (index 0). Remplacer uniquement les années projetées (index >= 1).
      const baseTrend = Array.isArray(r.trendValues) ? r.trendValues : proFormaRevenueTotals
      const trendValues = baseTrend.map((v, idx) =>
        idx === 0 ? (v ?? 0) : (proFormaRevenueTotals[idx] ?? 0)
      )
      return {
        ...r,
        current: trendValues[0] ?? 0,
        prior: trendValues[1] ?? 0,
        trendValues,
      }
    })
  }, [data, proFormaRevenueTotals])

  const displayData = dataWithProFormaRevenue
  // Note: formulas may update only projected years (keep real year intact).

  const displayDataWithUniversalFormulas = useMemo(() => {
    // Apply universal structure formulas (liaison codes) in forecast mode for projected years only.
    if (!isForecastSection || view !== "years") return displayData
    if (!forecastStructure || forecastStructure.length === 0) return displayData
    if (!seriesRows.length || !seriesPeriods.length) return displayData

    // Build quick lookup for series rows by linkCode (exact match) and by id (fallback).
    const byLinkCode = new Map<string, Array<(typeof seriesRows)[number]>>()
    const byGroupPrefix = new Map<string, Array<(typeof seriesRows)[number]>>()
    for (const sr of seriesRows) {
      const code = String((sr as { linkCode?: string }).linkCode ?? "").trim()
      if (!code) continue
      const arr = byLinkCode.get(code) ?? []
      arr.push(sr)
      byLinkCode.set(code, arr)

      const prefix = extractGroupePrefixFromCompositeLinkCode(code)
      if (prefix) {
        const parr = byGroupPrefix.get(prefix) ?? []
        parr.push(sr)
        byGroupPrefix.set(prefix, parr)
      }
    }

    const baseYear = forecastBaseYear ?? (refYear + 1)
    const actualYear = baseYear - 1
    const yearCount = projectionYears + 1

    // Default actuals for year 0.
    const rowActuals = new Map<string, number>()
    for (const sr of seriesRows) {
      rowActuals.set(sr.id, yearTrendFromReference(sr, seriesPeriods, actualYear, 1)[0] || 0)
    }

    const memo = new Map<string, number>()
    const getLatestAdjustment = (rowId: string, yearIdx: number) => {
      const key = `${rowId}-${yearIdx}`
      const arr = forecastRevenueAdjustments[key]
      if (!arr || arr.length === 0) return null
      return arr[arr.length - 1]!
    }

    const computeRowValue = (rowId: string, yearIdx: number): number => {
      const mkey = `${rowId}-${yearIdx}`
      const cached = memo.get(mkey)
      if (cached !== undefined) return cached

      const directKey = `${rowId}-${yearIdx}`
      if (forecastRevenueValues[directKey] !== undefined) {
        const v = Number(forecastRevenueValues[directKey] ?? 0)
        memo.set(mkey, v)
        return v
      }

      const baseDefault = yearIdx === 0 ? (rowActuals.get(rowId) ?? 0) : 0
      let v = baseDefault
      const adj = getLatestAdjustment(rowId, yearIdx)
      if (adj) {
        if (adj.type === "amount") {
          v = Number(adj.value ?? 0)
        } else {
          const prev = yearIdx > 0 ? computeRowValue(rowId, yearIdx - 1) : baseDefault
          if (adj.type === "growthPercent") v = Math.round(prev * (1 + Number(adj.value ?? 0) / 100))
          else if (adj.type === "growthAmount") v = prev + Number(adj.value ?? 0)
        }
      }

      memo.set(mkey, v)
      return v
    }

    const codeValue = (code: string, yearIdx: number): number => {
      const t = code.trim()
      if (!t) return 0
      const srs = byLinkCode.get(t) ?? []
      if (srs.length > 0) {
        return srs.reduce((sum, sr) => sum + computeRowValue(sr.id, yearIdx), 0)
      }
      // Group code: numeric-only codes (ex. "20") match all rows whose linkCode prefix is that group.
      if (/^\d+$/.test(t)) {
        const groupRows = byGroupPrefix.get(t) ?? []
        if (groupRows.length > 0) {
          return groupRows.reduce((sum, sr) => sum + computeRowValue(sr.id, yearIdx), 0)
        }
      }
      // Fallback: allow matching by id (rare but keeps behavior consistent).
      const sr = seriesRows.find((x) => x.id === t)
      return sr ? computeRowValue(sr.id, yearIdx) : 0
    }

    // Build formula values by label norm (structure label).
    const computedByLabelNorm = new Map<string, number[]>()
    for (const r of forecastStructure) {
      if (isStructureRowEmptyLabel(r) || isStructureRowHidden(r)) continue
      if (!isCodeMappingEnabled(r)) continue
      const mode = normalizeLiaisonMode(r)
      if (mode === "na") continue

      const codesSingle = String(r.linkCode ?? "").trim()
      const sumCodes = (mode === "sum" ? (Array.isArray(r.liaisonSumCodes) ? r.liaisonSumCodes : []) : []) as unknown[]
      const numCodes = (mode === "difference" ? (Array.isArray(r.liaisonNumeratorCodes) ? r.liaisonNumeratorCodes : []) : []) as unknown[]
      const denCodes = (mode === "difference" ? (Array.isArray(r.liaisonDenominatorCodes) ? r.liaisonDenominatorCodes : []) : []) as unknown[]

      const normalizeList = (xs: unknown[]) =>
        xs.map((x) => String(x ?? "").trim()).filter(Boolean)

      const sums = Array.from({ length: yearCount }, (_, yearIdx) => {
        if (yearIdx === 0) return 0 // keep real year intact downstream
        if (mode === "single") return codeValue(codesSingle, yearIdx)
        if (mode === "sum") return normalizeList(sumCodes).reduce((a, c) => a + codeValue(c, yearIdx), 0)
        // difference
        const nsum = normalizeList(numCodes).reduce((a, c) => a + codeValue(c, yearIdx), 0)
        const dsum = normalizeList(denCodes).reduce((a, c) => a + codeValue(c, yearIdx), 0)
        return nsum - dsum
      })
      computedByLabelNorm.set(normLabel(String(r.label ?? "")), sums)
    }

    // Merge into displayData (projected years only).
    const out = displayData.map((row) => {
      // Revenus already comes from Hypothèses Revenus totals; don't override with a structure formula.
      if (normLabel(String(row.label ?? "")) === "revenus") return row
      const computed = computedByLabelNorm.get(normLabel(String(row.label ?? "")))
      if (!computed) return row
      const baseTrend = Array.isArray(row.trendValues) ? row.trendValues : computed
      const merged = baseTrend.map((v, idx) => (idx === 0 ? (v ?? 0) : (computed[idx] ?? 0)))
      return {
        ...row,
        current: merged[0] ?? row.current,
        prior: merged[1] ?? row.prior,
        trendValues: merged,
      }
    })

    return out
  }, [
    displayData,
    forecastBaseYear,
    forecastRevenueAdjustments,
    forecastRevenueValues,
    forecastStructure,
    isForecastSection,
    projectionYears,
    refYear,
    seriesPeriods,
    seriesRows,
    view,
  ])

  /** Postes du sommaire (libellé non vide) pour placer une ligne vide au-dessus. */
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
      const currentYear = fiscalYear || new Date().getFullYear()

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
            "income-statement",
            params
          )

          if (!cancelled && response.rows) {
            const mapped: SummaryRow[] = response.rows
              .filter(
                (row) =>
                  !row.detailOnly && !isOmittedIncomeStatementSummaryRowLabel(row.label)
              )
              .map((row) => {
              const amounts = Object.entries(row.amounts)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([, v]) => v)
              const lastAmount = amounts[amounts.length - 1] || 0
              const priorAmount = amounts.length >= 2 ? amounts[amounts.length - 2] || 0 : 0
              return {
                label: row.label,
                current: lastAmount,
                prior: priorAmount,
                isBold: row.isBold,
                isSection: row.isSection,
                isResult: row.isResult,
                isNetIncome: row.label.toLowerCase().includes("bénéfice net") && row.isResult,
                isEBITA: row.label.toLowerCase() === "baiia",
                indent: indentForSummaryRow({
                  isBold: row.isBold || row.isResult,
                  isSection: row.isSection,
                  isResult: row.isResult,
                  indent: row.indent,
                }),
                separatorAbove: isTruthySeparatorAbove(row.separatorAbove),
              }
              })
            results[entity.id] = mapped
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
    fiscalYear,
    structureVersion,
  ])

  // Ligne « Revenus » (poste, pas en-tête de section « REVENUS » si les deux matchent)
  const revenueRow =
    data.find((row) => row.label.toLowerCase() === "revenus" && !row.isSection) ??
    data.find((row) => row.label.toLowerCase() === "revenus")
  const revenueCurrent = revenueRow?.current || 1
  const revenuePrior = revenueRow?.prior || 1
  const revenueTrendValues = revenueRow?.trendValues ?? []

  // Helper function to calculate percentage of revenue
  const getRevenuePercentage = (value: number, isPrior: boolean): number => {
    const revenue = isPrior ? revenuePrior : revenueCurrent
    if (revenue === 0) return 0
    return (value / revenue) * 100
  }

  const getTrendRevenuePercentage = (value: number, valueIdx: number): number => {
    const revenue = revenueTrendValues[valueIdx] ?? 0
    if (revenue === 0) return 0
    return (value / revenue) * 100
  }

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
    else if (view === "24months") parts.push("24 derniers mois")
    else if (view === "quarters") parts.push("5 derniers trimestres")
    else if (view === "years") {
      if (isForecastSection) {
        parts.push("6 prochaines années")
      } else {
        parts.push("6 dernières années")
      }
    }

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
    } else if (columnMode === "percentage") {
      parts.push("• % des revenus")
    } else {
      parts.push("• Variations")
    }

    return parts.join(" • ")
  }

  // Helper function to generate month labels (12 or 24 months)
  const getMonthLabels = (monthsCount: number = 12): string[] => {
    if (seriesPeriods.length > 0 && !isForecastSection) {
      return monthShortLabelsFromReference(refMonth, refYear, monthsCount)
    }
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
    const currentDate = new Date()
    const labels: string[] = []
    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      labels.push(`${months[date.getMonth()]} ${date.getFullYear()}`)
    }
    return reverseSeriesOrderForDisplay(labels)
  }

  // Helper function to generate quarter labels (5 quarters)
  const getQuarterLabels = (): string[] => {
    if (seriesPeriods.length > 0 && !isForecastSection) {
      return quarterLabelsFromReference(refMonth, refYear, 5)
    }
    const currentDate = new Date()
    const labels: string[] = []
    for (let i = 4; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i * 3, 1)
      const quarter = Math.floor(date.getMonth() / 3) + 1
      labels.push(`T${quarter} ${date.getFullYear()}`)
    }
    return reverseSeriesOrderForDisplay(labels)
  }

  // Helper function to generate year labels (projectionYears + 1 for forecast sections)
  const getYearLabels = (): string[] => {
    if (seriesPeriods.length > 0 && !isForecastSection) {
      return yearLabelsFromReference(refYear, 6)
    }
    const labels: string[] = []
    if (isForecastSection) {
      const baseYear = forecastBaseYear ?? refYear ?? new Date().getFullYear()
      // Libellé = année civile seule ; données = réel pour (baseYear - 1) lorsque la référence de projection est baseYear.
      labels.push(`${baseYear - 1}`)
      for (let i = 0; i < projectionYears; i++) {
        labels.push(`${baseYear + i}`)
      }
    } else {
      const currentYear = new Date().getFullYear()
      for (let i = 5; i >= 0; i--) {
        labels.push(`${currentYear - i}`)
      }
    }
    return isForecastSection ? labels : reverseSeriesOrderForDisplay(labels)
  }

  // Helper function to get horizon text
  const getHorizonText = (): string => {
    if (view === "comparison" && (period === "monthly" || period === "quarterly" || period === "annual")) {
      return getCurrentColumnLabel()
    }
    if (view === "ytd") return "YTD"
    if (view === "ddm" && (period === "monthly" || period === "quarterly" || period === "annual")) {
      return getCurrentColumnLabel()
    }
    if (view === "ddm") return "DDM"
    if (view === "12months") return HORIZON_LABEL.mensuel
    if (view === "24months") return "24 mois"
    if (view === "quarters") return HORIZON_LABEL.trimestriel2Ans
    if (view === "years") return HORIZON_LABEL.annuel5Ans
    return HORIZON_LABEL.moisActuel
  }

  const trendLen = dataWithProFormaRevenue.find((r) => r.trendValues != null)?.trendValues?.length ?? 0
  const showStructureCols =
    structureEditMode && canInlineStructureEdit && !structEdit.loading
  const effectiveData = displayDataWithUniversalFormulas

  const tableRowCount = showStructureCols
    ? structEdit.summaryStructureDisplayIndices.length
    : effectiveData.length

  /** Doit correspondre au nombre de `<th>` du thead — sinon une ligne `colSpan` invalide casse `table-fixed`. */
  const summaryTableColumnCount = useMemo(() => {
    if (showStructureCols) return 8
    if (view === "current") return 2
    if (view === "comparison" || view === "ddm" || view === "ytd") {
      if (isComparisonMode) return 1 + entitiesToCompare.length
      const extra =
        columnMode === "percentage" ? 2 : columnMode === "variationAmount" || columnMode === "variationPercent" ? 1 : 0
      return 3 + extra
    }
    if (view === "12months") return 1 + getMonthLabels(12).length
    if (view === "24months") return 1 + getMonthLabels(24).length
    if (view === "quarters") return 1 + getQuarterLabels().length
    if (view === "years") return 1 + getYearLabels().length
    return 2
  }, [
    showStructureCols,
    view,
    isComparisonMode,
    columnMode,
    entitiesToCompare,
    seriesPeriods,
    isForecastSection,
    projectionYears,
    refMonth,
    refYear,
  ])

  const padSummaryRow = (structRow: Record<string, unknown>): SummaryRow => {
    const structIsBold = typeof structRow.isBold === "boolean" ? structRow.isBold : false
    return {
      label: String(structRow.label ?? ""),
      current: 0,
      prior: 0,
      isBold: structIsBold,
      isSection: false,
      isResult: false,
      isNetIncome: false,
      isEBITA: false,
      isMargin: false,
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

  /** En édition structure : aligner sur `data` par libellé (le sommaire exclut les lignes detailOnly). */
  const summaryRowForStructureIndex = (structRow: Record<string, unknown>): SummaryRow => {
    const sl = normLabel(String(structRow.label ?? ""))
    const found = effectiveData.find((r) => normLabel(r.label) === sl)
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

  if (loading || (seriesLoading && isMultiPeriodView && !isForecastSection) || entityDataLoading) {
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

  if (effectiveData.length === 0) {
    // Projections: still show the years header/columns even before data is available.
    if (isForecastSection && view === "years") {
      const yearLabels = getYearLabels()
      return (
        <div className={cn("w-full", dashboardCardFrameStaticClass)}>
          <div className={dashboardCardRingClass} aria-hidden />
          <div className="relative w-full min-w-0">
            <div className={cn("px-6 py-5 sm:px-7", dashboardCardHeaderBarClass)}>
              <div className="flex items-center gap-4">
                <div className={dashboardCardHeaderIconBoxClass}>
                  <LayoutList className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
                </div>
                <h2 className={cn("text-xl leading-tight", dashboardCardTitleClass)}>{title || "Sommaire"}</h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] table-fixed border-t border-slate-200/80">
                <thead>
                  <tr className="bg-white">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Poste</th>
                    {yearLabels.map((lab) => (
                      <th key={lab} className="px-6 py-4 text-right text-sm font-semibold text-slate-900">
                        {lab}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td
                      colSpan={1 + yearLabels.length}
                      className="px-6 py-10 text-center text-sm text-slate-600"
                    >
                      Aucune donnée disponible pour cette projection (vous pouvez tout de même voir l’horizon).
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className={cn("w-full", dashboardCardFrameStaticClass)}>
        <div className={dashboardCardRingClass} aria-hidden />
        <div className="relative px-8 py-16 text-center">
          <p className={cn("text-sm", dashboardCardBodyMutedClass)}>
            Aucune donnée disponible. Veuillez importer une balance de vérification et configurer la structure des états
            financiers.
          </p>
        </div>
      </div>
    )
  }

  const isStructureStudio = structureEditMode && canInlineStructureEdit

  return (
    <div className={cn("w-full", dashboardCardFrameStaticClass)}>
      <div className={dashboardCardRingClass} aria-hidden />
      <div className="relative w-full min-w-0">
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
                    setStructureEditMode(false)
                  }}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl bg-[#2A2F3A] px-4 font-semibold text-[#E6D6C3] shadow-sm transition hover:bg-[#353b47] disabled:opacity-60"
                  disabled={structEdit.saving || structEdit.loading || !companyId}
                  onClick={async () => {
                    const ok = await structEdit.save()
                    if (ok) {
                      onIncomeStatementStructureSaved?.()
                      structEdit.discard()
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
        <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50/90 px-6 py-3.5 text-sm text-[#2A2F3A] sm:px-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <Loader2 className={cn("h-4 w-4 animate-spin", dashboardCardAccentClass)} />
          </div>
          <span className="font-medium">Chargement de la structure…</span>
        </div>
      )}
      {structureEditMode && canInlineStructureEdit && structEdit.error && (
        <div className="border-b border-red-200/80 bg-gradient-to-r from-red-50 to-white px-6 py-3 text-sm font-medium text-red-800 sm:px-8">
          {structEdit.error}
        </div>
      )}
      {/* Table */}
      <div
        className={cn(
          "min-w-0 overflow-x-auto",
          isStructureStudio ? "bg-gradient-to-b from-white to-slate-50/50" : "bg-white"
        )}
      >
        <table
          className={cn(
            "w-full min-w-full",
            showStructureCols && "table-fixed",
            isStructureStudio ? "border-separate border-spacing-0" : "border-collapse"
          )}
        >
            {showStructureCols && (
              <colgroup>
                <col className="min-w-0" />
                <col style={{ width: "7rem" }} />
                <col style={{ width: "7rem" }} />
                <col style={{ width: "7rem" }} />
                <col style={{ width: "7rem" }} />
                <col style={{ width: "7rem" }} />
                <col style={{ width: "7rem" }} />
                <col style={{ width: "5.5rem" }} />
              </colgroup>
            )}
            <thead>
              <tr
                className={cn(
                  "border-b",
                  showStructureCols
                    ? "border-slate-200 bg-gradient-to-r from-slate-50 via-slate-100/40 to-slate-50"
                    : "border-b-2 border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100/80"
                )}
              >
                <th
                  className={cn(
                    "px-6 py-4 text-left text-sm font-semibold text-slate-900",
                    !showStructureCols &&
                      (view === "12months"
                        ? "min-w-[20rem] sm:min-w-[24rem] lg:min-w-[30rem]"
                        : "w-2/5"),
                    showStructureCols && "min-w-0 pl-4 pr-3"
                  )}
                >
                  {showStructureCols ? (
                    <span className="flex items-center gap-2">
                      <span className="rounded-lg bg-white/80 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 ring-1 ring-slate-200/80">
                        Libellé
                      </span>
                      <span className="font-semibold text-slate-800">Poste</span>
                    </span>
                  ) : (
                    "Poste"
                  )}
                </th>
                {showStructureCols && (
                  <>
                    <th className="box-border w-[7rem] px-2 py-4 text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex cursor-help flex-col items-center gap-1.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
                              <PanelTop className="h-4 w-4 text-slate-700" />
                            </span>
                            <span className="text-[11px] font-semibold leading-tight text-slate-800">
                              Séparation
                            </span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[240px] text-balance">
                          Affiche une ligne de séparation au-dessus de cette ligne au sommaire.
                        </TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="box-border w-[7rem] px-2 py-4 text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex cursor-help flex-col items-center gap-1.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-300/80">
                              <EyeOff className="h-4 w-4 text-slate-600" />
                            </span>
                            <span className="text-[11px] font-semibold leading-tight text-slate-800">
                              Masquer
                            </span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[240px] text-balance">
                          Masque la ligne au sommaire et au détail. Désactive Code et Annexe pour cette ligne.
                        </TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="box-border w-[7rem] px-2 py-4 text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex cursor-help flex-col items-center gap-1.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                              <Hash className="h-4 w-4 text-[#E0742D]" />
                            </span>
                            <span className="text-[11px] font-semibold leading-tight text-slate-800">Code</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[220px] text-balance">
                          Active la modification du code de liaison et de la lettre d’annexe. Indisponible si la ligne est
                          masquée.
                        </TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="box-border w-[7rem] px-2 py-4 text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex cursor-help flex-col items-center gap-1.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
                              <Link2 className="h-4 w-4 text-slate-600" />
                            </span>
                            <span className="text-[11px] font-semibold leading-tight text-slate-800">Liaison</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[240px] text-balance">
                          Liaison : n/a, code unique, somme de codes (addition) ou différence (numérateur −
                          dénominateur) lorsque « Code » est coché.
                        </TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="box-border w-[7rem] px-2 py-4 text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex cursor-help flex-col items-center gap-1.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                              <Eye className="h-4 w-4 text-sky-600" />
                            </span>
                            <span className="text-[11px] font-semibold leading-tight text-slate-800">Annexe</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[220px] text-balance">
                          Affiche cette ligne au détail (avec liaison et lettre). Nécessite « Code » et une ligne visible.
                        </TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="box-border w-[7rem] px-2 py-4 text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex cursor-help flex-col items-center gap-1.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
                              <BookMarked className="h-4 w-4 text-slate-600" />
                            </span>
                            <span className="text-[11px] font-semibold leading-tight text-slate-800">Lettre</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[220px] text-balance">
                          Lettre d’annexe (ex. A, B) pour le détail et les exports.
                        </TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900 min-w-[5.5rem]">
                      Actions
                    </th>
                  </>
                )}
              {!showStructureCols && view === "current" && (
                <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Montant</th>
              )}
              {!showStructureCols && view === "comparison" && !isComparisonMode && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{getCurrentColumnLabel()}</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{getComparisonLabel()}</th>
                  {columnMode === "variationPercent" ? (
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation %</th>
                  ) : columnMode === "variationAmount" ? (
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation $</th>
                  ) : columnMode === "percentage" ? (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des revenus</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des revenus</th>
                    </>
                  ) : null}
                </>
              )}
              {!showStructureCols && view === "comparison" && isComparisonMode && (
                <>
                  {entitiesToCompare.map((entity) => (
                    <th key={entity.id} className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">
                      {entity.name}
                    </th>
                  ))}
                </>
              )}
              {!showStructureCols && view === "ddm" && !isComparisonMode && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{getCurrentColumnLabel()}</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{getComparisonLabel()}</th>
                  {columnMode === "variationPercent" ? (
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation %</th>
                  ) : columnMode === "variationAmount" ? (
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation $</th>
                  ) : columnMode === "percentage" ? (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des revenus</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des revenus</th>
                    </>
                  ) : null}
                </>
              )}
              {!showStructureCols && view === "ddm" && isComparisonMode && (
                <>
                  {entitiesToCompare.map((entity) => (
                    <th key={entity.id} className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">
                      {entity.name}
                    </th>
                  ))}
                </>
              )}
              {!showStructureCols && view === "ytd" && !isComparisonMode && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">YTD {fiscalYear}</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">YTD {(fiscalYear ?? new Date().getFullYear()) - 1}</th>
                  {columnMode === "variationPercent" ? (
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation %</th>
                  ) : columnMode === "variationAmount" ? (
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation $</th>
                  ) : columnMode === "percentage" ? (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des revenus</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des revenus</th>
                    </>
                  ) : null}
                </>
              )}
              {!showStructureCols && view === "ytd" && isComparisonMode && (
                <>
                  {entitiesToCompare.map((entity) => (
                    <th key={entity.id} className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">
                      {entity.name}
                    </th>
                  ))}
                </>
              )}
              {!showStructureCols && view === "12months" && (
                <>
                  {getMonthLabels().map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {!showStructureCols && view === "24months" && (
                <>
                  {getMonthLabels(24).map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {!showStructureCols && view === "quarters" && (
                <>
                  {getQuarterLabels().map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {!showStructureCols && view === "years" && (
                <>
                  {getYearLabels().map((label, idx) => (
                    <th
                      key={idx}
                      className={cn(
                        "px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap",
                        isForecastSection && idx === 0 ? "bg-slate-50" : ""
                      )}
                    >
                      {label}
                    </th>
                  ))}
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {showStructureCols && tableRowCount === 0 && (
              <tr>
                <td
                  colSpan={summaryTableColumnCount}
                  className="px-6 py-10 text-center text-sm text-slate-500"
                >
                  Aucun poste dans la structure. Utilisez « Ajouter un poste » ou « Ajouter un espace » pour
                  commencer.
                </td>
              </tr>
            )}
            {Array.from({ length: tableRowCount }, (_, idx) => {
              const globalIdx = showStructureCols ? structEdit.summaryStructureDisplayIndices[idx]! : -1
              const structRow = showStructureCols ? structEdit.structure[globalIdx]! : null
              const row = showStructureCols
                ? summaryRowForStructureIndex(structRow!)
                : effectiveData[idx]!
              const variation = row.current && row.prior ? calculateVariation(row.current, row.prior) : null
              const variationAmount = row.current && row.prior ? row.current - row.prior : 0
              const isBoldRow = shouldBeBold(row.label, row)
              const displayLabel = row.label ? capitalizeFirst(row.label) : ""
              const isSpacer = row.label === ""
              const sectionExceptions = ["revenus", "coût des produits vendus"]
              const isSectionException = sectionExceptions.includes(row.label.toLowerCase())
              const shouldHideAmounts =
                isSpacer || (!isSectionException && !!row.isSection) || row.label.toLowerCase() === "charges d'exploitation"
              
              // Ligne suivante pour styles (montants / isResult) : aligner sur la structure en édition
              const nextRow =
                idx < tableRowCount - 1
                  ? showStructureCols
                    ? summaryRowForStructureIndex(
                        structEdit.structure[structEdit.summaryStructureDisplayIndices[idx + 1]!]!
                      )
                    : effectiveData[idx + 1]!
                  : null
              const nextRowLabel = nextRow?.label?.toLowerCase() || ""
              const nextLabelNorm =
                idx < tableRowCount - 1
                  ? normLabel(
                      showStructureCols
                        ? String(
                            structEdit.structure[structEdit.summaryStructureDisplayIndices[idx + 1]!]?.label ??
                              ""
                          )
                        : String(effectiveData[idx + 1]?.label ?? "")
                    )
                  : ""
              /** Bordure épaisse sous la ligne courante si la ligne suivante est un « résultat » clé — pas avant Total des charges / Bénéfice brut (séparation manuelle). */
              const nextRowIsKeyResult =
                nextLabelNorm !== normLabel(TOTAL_CHARGES_LABEL) &&
                nextLabelNorm !== normLabel("bénéfice brut") &&
                !!nextRow &&
                ((nextRow.isResult && nextRowLabel !== "bénéfice avant impôts") || nextRow.isNetIncome)
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

              return (
                <Fragment key={idx}>
                  {showSeparatorAbove && (
                    <tr aria-hidden>
                      <td
                        colSpan={summaryTableColumnCount}
                        className="border-0 p-0 align-top leading-none border-t border-t-slate-600"
                      />
                    </tr>
                  )}
                  <tr
                    className={cn(
                      "border-b transition-colors duration-150",
                      row.label === "" ? "h-2 border-b border-b-slate-200" : "",
                      nextRowIsKeyResult
                        ? "border-b-2 border-b-slate-900"
                        : showStructureCols
                          ? "border-b border-b-slate-200/80"
                          : "border-b border-b-slate-200",
                      showStructureCols && row.label !== "" && "hover:bg-slate-100/70",
                      showStructureCols && idx % 2 === 1 && row.label !== "" && "bg-slate-50/50",
                      !showStructureCols && row.label !== "" && "hover:bg-slate-50/90"
                    )}
                  >
                  <td
                    className={cn(
                      "py-3 align-middle",
                      showStructureCols
                        ? "min-w-0 px-3 pl-4"
                        : view === "12months"
                          ? "min-w-[20rem] sm:min-w-[24rem] lg:min-w-[30rem] px-6"
                          : "min-w-0 px-6",
                      isBoldRow ? "font-bold text-slate-900" : "text-slate-700",
                      row.indent ? "pl-12" : "",
                      row.isMargin ? "italic" : "",
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
                      displayLabel
                    )}
                  </td>
                  {showStructureCols && structRow && (
                    <>
                      <td className="box-border w-[7rem] px-2 py-2.5 align-middle text-center">
                        {isStructureRowEmptyLabel(structRow) ? (
                          <span className="text-sm text-slate-300">—</span>
                        ) : (
                          <div className="flex justify-center">
                            <label
                              className={cn(
                                "flex cursor-pointer items-center justify-center rounded-xl p-1.5 transition-colors",
                                isStructureRowHidden(structRow)
                                  ? "cursor-not-allowed opacity-40"
                                  : "cursor-pointer",
                                !isStructureRowHidden(structRow) &&
                                  showSeparatorAbove &&
                                  "bg-slate-800/90 ring-2 ring-slate-900/40",
                                !isStructureRowHidden(structRow) &&
                                  !showSeparatorAbove &&
                                  "bg-slate-100/60 hover:bg-slate-200/60"
                              )}
                            >
                              <Checkbox
                                checked={showSeparatorAbove}
                                disabled={isStructureRowHidden(structRow)}
                                onCheckedChange={(v) => {
                                  if (isStructureRowHidden(structRow)) return
                                  structEdit.updateRow(globalIdx, { separatorAbove: v === true })
                                }}
                                aria-label="Séparation : trait au-dessus"
                                className="border-slate-300 data-[state=checked]:border-slate-900 data-[state=checked]:bg-slate-900"
                              />
                            </label>
                          </div>
                        )}
                      </td>
                      <td className="box-border w-[7rem] px-2 py-2.5 align-middle text-center">
                        <div className="flex justify-center">
                          <label
                            className={cn(
                              "flex cursor-pointer items-center justify-center rounded-xl p-1.5 transition-colors",
                              isStructureRowHidden(structRow)
                                ? "bg-slate-200/80 ring-2 ring-slate-400/35"
                                : "bg-slate-100/60 hover:bg-slate-200/60"
                            )}
                          >
                            <Checkbox
                              checked={isStructureRowHidden(structRow)}
                              onCheckedChange={(v) => {
                                if (v === true) {
                                  structEdit.updateRow(globalIdx, {
                                    hidden: true,
                                    defineMapping: false,
                                    showInDetail: false,
                                    linkCode: undefined,
                                    annexLetter: undefined,
                                    posteNature: undefined,
                                    liaisonMode: undefined,
                                    liaisonSumCodes: undefined,
                                    liaisonNumeratorCodes: undefined,
                                    liaisonDenominatorCodes: undefined,
                                    separatorAbove: undefined,
                                  })
                                } else {
                                  structEdit.updateRow(globalIdx, { hidden: false })
                                }
                              }}
                              aria-label="Masquer la ligne au sommaire"
                              className="border-slate-300 data-[state=checked]:border-slate-700 data-[state=checked]:bg-slate-700"
                            />
                          </label>
                        </div>
                      </td>
                      <td className="box-border w-[7rem] px-2 py-2.5 align-middle text-center">
                        {isStructureRowEmptyLabel(structRow) ? (
                          <span className="text-sm text-slate-300">—</span>
                        ) : (
                          <div className="flex justify-center">
                            <label
                              className={cn(
                                "flex items-center justify-center rounded-xl p-1.5 transition-colors",
                                isStructureRowHidden(structRow)
                                  ? "cursor-not-allowed opacity-40"
                                  : "cursor-pointer",
                                !isStructureRowHidden(structRow) &&
                                  isCodeMappingEnabled(structRow) &&
                                  "bg-orange-50/90 ring-2 ring-[#E0742D]/35",
                                !isStructureRowHidden(structRow) &&
                                  !isCodeMappingEnabled(structRow) &&
                                  "bg-slate-100/60 hover:bg-slate-200/60"
                              )}
                            >
                              <Checkbox
                                checked={isCodeMappingEnabled(structRow)}
                                disabled={isStructureRowHidden(structRow)}
                                onCheckedChange={(v) => {
                                  if (isStructureRowHidden(structRow)) return
                                  if (v === true) {
                                    structEdit.updateRow(globalIdx, {
                                      defineMapping: true,
                                      ...(normalizeLiaisonMode(structRow) === "na"
                                        ? { liaisonMode: "single" }
                                        : {}),
                                    })
                                  } else {
                                    structEdit.updateRow(globalIdx, {
                                      defineMapping: false,
                                      showInDetail: false,
                                      linkCode: undefined,
                                      annexLetter: undefined,
                                      posteNature: undefined,
                                      liaisonMode: undefined,
                                      liaisonSumCodes: undefined,
                                      liaisonNumeratorCodes: undefined,
                                      liaisonDenominatorCodes: undefined,
                                    })
                                  }
                                }}
                                aria-label="Code : liaison et lettre modifiables"
                                className="border-slate-300 data-[state=checked]:border-[#E0742D] data-[state=checked]:bg-[#E0742D]"
                              />
                            </label>
                          </div>
                        )}
                      </td>
                      <td className="box-border min-w-[8.5rem] max-w-[10rem] px-2 py-2.5 align-middle">
                        {isCodeMappingEnabled(structRow) && !isStructureRowHidden(structRow) ? (
                          <IncomeStatementLiaisonCell
                            structRow={structRow}
                            rowIndex={globalIdx}
                            allLinkCodes={allLiaisonCodes}
                            linkCodeLabels={linkCodeLabels}
                            singleModeLinkCodes={incomeParentLinkCodes}
                            singleModeLinkCodeLabels={incomeParentLinkLabels}
                            updateRow={structEdit.updateRow}
                          />
                        ) : (
                          <span className="block truncate rounded-lg bg-slate-100/50 px-1.5 py-2 text-center text-sm text-slate-300">
                            —
                          </span>
                        )}
                      </td>
                      <td className="box-border w-[7rem] px-2 py-2.5 align-middle text-center">
                        {isStructureRowEmptyLabel(structRow) ? (
                          <span className="text-sm text-slate-300">—</span>
                        ) : (
                          <div className="flex justify-center">
                            <label
                              className={cn(
                                "flex items-center justify-center rounded-xl p-1.5 transition-colors",
                                isStructureRowHidden(structRow) || !isCodeMappingEnabled(structRow)
                                  ? "cursor-not-allowed opacity-40"
                                  : "cursor-pointer",
                                !isStructureRowHidden(structRow) &&
                                  isCodeMappingEnabled(structRow) &&
                                  isShowInDetail(structRow) &&
                                  "bg-sky-50/90 ring-2 ring-sky-400/40",
                                !isStructureRowHidden(structRow) &&
                                  isCodeMappingEnabled(structRow) &&
                                  !isShowInDetail(structRow) &&
                                  "bg-slate-100/60 hover:bg-slate-200/60"
                              )}
                            >
                              <Checkbox
                                checked={isShowInDetail(structRow)}
                                disabled={
                                  isStructureRowHidden(structRow) || !isCodeMappingEnabled(structRow)
                                }
                                onCheckedChange={(v) => {
                                  if (isStructureRowHidden(structRow) || !isCodeMappingEnabled(structRow)) return
                                  structEdit.setShowInDetail(globalIdx, v === true)
                                }}
                                aria-label="Annexe : afficher au détail"
                                className="border-slate-300 data-[state=checked]:border-sky-600 data-[state=checked]:bg-sky-600"
                              />
                            </label>
                          </div>
                        )}
                      </td>
                      <td className="box-border w-[7rem] min-w-0 px-2 py-2.5 align-middle">
                        {isCodeMappingEnabled(structRow) && !isStructureRowHidden(structRow) ? (
                          <Input
                            value={String(structRow.annexLetter ?? "")}
                            disabled={!isAnnexLetterInputEditable(structRow)}
                            onChange={(e) =>
                              structEdit.updateRow(globalIdx, {
                                annexLetter: normalizeAnnexLetter(e.target.value) || undefined,
                              })
                            }
                            placeholder="A"
                            title={
                              !isAnnexLetterInputEditable(structRow)
                                ? "Activez « Annexe » pour saisir une lettre (inutile pour addition / soustraction)."
                                : undefined
                            }
                            className={cn(
                              "h-9 w-full min-w-0 rounded-xl border-slate-200/90 px-2 text-center text-xs font-bold uppercase tracking-widest shadow-sm focus-visible:border-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500/25",
                              isAnnexLetterInputEditable(structRow)
                                ? "bg-white"
                                : "cursor-not-allowed bg-slate-100/80 text-slate-400"
                            )}
                            maxLength={8}
                          />
                        ) : (
                          <span className="block truncate rounded-lg bg-slate-100/50 px-1.5 py-2 text-center text-sm text-slate-300">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center align-middle">
                        <div className="flex items-center justify-center gap-0.5">
                          {!isStructureRowEmptyLabel(structRow) ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-[#E0742D]"
                              title="Modifier le poste (niveau, gras)"
                              onClick={() => beginEditPostPresentation(globalIdx)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {structEdit.canRemoveRowAt(globalIdx) ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                              title="Supprimer la ligne"
                              onClick={() => structEdit.removeStructureRowAt(globalIdx)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </>
                  )}

                  {!showStructureCols && view === "current" && (
                    <td className={`px-6 py-3 text-right ${row.isMargin ? "italic" : (isBoldRow ? "font-semibold font-bold" : "text-slate-500")} ${shouldHideAmounts ? "text-white" : ""}`}>
                      {row.isMargin 
                        ? (row.current !== 0 ? `${row.current.toFixed(1)}%` : "-")
                        : (row.current !== 0 ? formatCurrency(row.current) : "-")
                      }
                    </td>
                  )}

                  {!showStructureCols && view === "comparison" && !isComparisonMode && (
                    <>
                      <td className={`px-6 py-3 text-right ${row.isMargin ? "italic" : (isBoldRow ? "font-semibold font-bold" : "text-slate-500")} ${shouldHideAmounts ? "text-white" : ""}`}>
                        {row.isMargin 
                          ? (row.current !== 0 ? `${row.current.toFixed(1)}%` : "-")
                          : (row.current !== 0 ? formatCurrency(row.current) : "-")
                        }
                      </td>
                      <td className={`px-6 py-3 text-right ${row.isMargin ? "italic text-slate-600" : (isBoldRow ? "font-semibold font-bold text-slate-600" : "text-slate-500")} ${shouldHideAmounts ? "text-white" : ""}`}>
                        {row.isMargin 
                          ? (row.prior !== 0 ? `${row.prior.toFixed(1)}%` : "-")
                          : (row.prior !== 0 ? formatCurrency(row.prior) : "-")
                        }
                      </td>
                      {columnMode === "variationPercent" ? (
                        <td
                          className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold " : ""}${
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
                      ) : columnMode === "percentage" ? (
                        <>
                          <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.current !== 0 ? `${getRevenuePercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.prior !== 0 ? `${getRevenuePercentage(row.prior, true).toFixed(1)}%` : "-"}
                          </td>
                        </>
                      ) : null}
                    </>
                  )}
                  {!showStructureCols && view === "comparison" && isComparisonMode && (
                    <>
                      {entitiesToCompare.map((entity) => {
                        const entityRows = entityDataMap[entity.id] || []
                        const entityRow = entityRows.find(r => r.label === row.label) || row
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
                  {!showStructureCols && view === "ddm" && !isComparisonMode && (
                    <>
                      <td className={`px-6 py-3 text-right ${row.isMargin ? "italic" : (isBoldRow ? "font-semibold font-bold" : "text-slate-500")} ${shouldHideAmounts ? "text-white" : ""}`}>
                        {row.isMargin 
                          ? (row.current !== 0 ? `${row.current.toFixed(1)}%` : "-")
                          : (row.current !== 0 ? formatCurrency(row.current) : "-")
                        }
                      </td>
                      <td className={`px-6 py-3 text-right ${row.isMargin ? "italic text-slate-600" : (isBoldRow ? "font-semibold font-bold text-slate-600" : "text-slate-500")} ${shouldHideAmounts ? "text-white" : ""}`}>
                        {row.isMargin 
                          ? (row.prior !== 0 ? `${row.prior.toFixed(1)}%` : "-")
                          : (row.prior !== 0 ? formatCurrency(row.prior) : "-")
                        }
                      </td>
                      {columnMode === "variationPercent" ? (
                        <td
                          className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold " : ""}${
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
                      ) : columnMode === "percentage" ? (
                        <>
                          <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.current !== 0 ? `${getRevenuePercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.prior !== 0 ? `${getRevenuePercentage(row.prior, true).toFixed(1)}%` : "-"}
                          </td>
                        </>
                      ) : null}
                    </>
                  )}
                  {!showStructureCols && view === "ddm" && isComparisonMode && (
                    <>
                      {entitiesToCompare.map((entity) => {
                        const entityRows = entityDataMap[entity.id] || []
                        const entityRow = entityRows.find(r => r.label === row.label) || row
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

                  {!showStructureCols && view === "ytd" && !isComparisonMode && (
                    <>
                      <td className={`px-6 py-3 text-right ${row.isMargin ? "italic" : (isBoldRow ? "font-semibold font-bold" : "text-slate-500")} ${shouldHideAmounts ? "text-white" : ""}`}>
                        {row.isMargin 
                          ? (row.current !== 0 ? `${row.current.toFixed(1)}%` : "-")
                          : (row.current !== 0 ? formatCurrency(row.current) : "-")
                        }
                      </td>
                      <td className={`px-6 py-3 text-right ${row.isMargin ? "italic text-slate-600" : (isBoldRow ? "font-semibold font-bold text-slate-600" : "text-slate-500")} ${shouldHideAmounts ? "text-white" : ""}`}>
                        {row.isMargin 
                          ? (row.prior !== 0 ? `${row.prior.toFixed(1)}%` : "-")
                          : (row.prior !== 0 ? formatCurrency(row.prior) : "-")
                        }
                      </td>
                      {columnMode === "variationPercent" ? (
                        <td
                          className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold " : ""}${
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
                      ) : columnMode === "percentage" ? (
                        <>
                          <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.current !== 0 ? `${getRevenuePercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.prior !== 0 ? `${getRevenuePercentage(row.prior, true).toFixed(1)}%` : "-"}
                          </td>
                        </>
                      ) : null}
                    </>
                  )}
                  {!showStructureCols && view === "ytd" && isComparisonMode && (
                    <>
                      {entitiesToCompare.map((entity) => {
                        const entityRows = entityDataMap[entity.id] || []
                        const entityRow = entityRows.find(r => r.label === row.label) || row
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

                  {/* Trend Views - 12 months, quarters, years */}
                  {!showStructureCols && view === "12months" && row.trendValues && (
                    <>
                      {row.trendValues.map((value, valueIdx) => (
                        <td
                          key={valueIdx}
                          className={`px-4 py-3 text-right ${row.isMargin ? "italic" : (isBoldRow ? "font-semibold font-bold" : "text-slate-500")} ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {columnMode === "percentage"
                            ? row.isMargin
                              ? (value !== 0 ? `${value.toFixed(1)}%` : "-")
                              : (value !== 0 ? `${getTrendRevenuePercentage(value, valueIdx).toFixed(1)}%` : "-")
                            : columnMode === "variationAmount" || columnMode === "variationPercent"
                              ? (() => {
                                  const trendVariation = getTrendVariation(row.trendValues ?? [], valueIdx)
                                  const trendVariationAmount = getTrendVariationAmount(row.trendValues ?? [], valueIdx)
                                  if (row.isMargin) {
                                    return trendVariationAmount !== null ? `${trendVariationAmount >= 0 ? "+" : ""}${trendVariationAmount.toFixed(1)} pts` : "-"
                                  }
                                  if (columnMode === "variationPercent") {
                                    return trendVariation !== null ? `${trendVariation >= 0 ? "+" : ""}${trendVariation.toFixed(1)}%` : "-"
                                  }
                                  return trendVariationAmount !== null
                                    ? `${trendVariationAmount >= 0 ? "+" : ""}${formatCurrency(trendVariationAmount)}`
                                    : "-"
                                })()
                              : row.isMargin
                                ? (value !== 0 ? `${value.toFixed(1)}%` : "-")
                                : (value !== 0 ? formatCurrency(value) : "-")
                          }
                        </td>
                      ))}
                    </>
                  )}
                  {!showStructureCols && view === "quarters" && row.trendValues && (
                    <>
                      {row.trendValues.map((value, valueIdx) => (
                        <td
                          key={valueIdx}
                          className={`px-4 py-3 text-right ${row.isMargin ? "italic" : (isBoldRow ? "font-semibold font-bold" : "text-slate-500")} ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {columnMode === "percentage"
                            ? row.isMargin
                              ? (value !== 0 ? `${value.toFixed(1)}%` : "-")
                              : (value !== 0 ? `${getTrendRevenuePercentage(value, valueIdx).toFixed(1)}%` : "-")
                            : columnMode === "variationAmount" || columnMode === "variationPercent"
                              ? (() => {
                                  const trendVariation = getTrendVariation(row.trendValues ?? [], valueIdx)
                                  const trendVariationAmount = getTrendVariationAmount(row.trendValues ?? [], valueIdx)
                                  if (row.isMargin) {
                                    return trendVariationAmount !== null ? `${trendVariationAmount >= 0 ? "+" : ""}${trendVariationAmount.toFixed(1)} pts` : "-"
                                  }
                                  if (columnMode === "variationPercent") {
                                    return trendVariation !== null ? `${trendVariation >= 0 ? "+" : ""}${trendVariation.toFixed(1)}%` : "-"
                                  }
                                  return trendVariationAmount !== null
                                    ? `${trendVariationAmount >= 0 ? "+" : ""}${formatCurrency(trendVariationAmount)}`
                                    : "-"
                                })()
                              : row.isMargin
                                ? (value !== 0 ? `${value.toFixed(1)}%` : "-")
                                : (value !== 0 ? formatCurrency(value) : "-")
                          }
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
                            "px-4 py-3 text-right",
                            row.isMargin ? "italic" : (isBoldRow ? "font-semibold font-bold" : ""),
                            shouldHideAmounts ? "text-white" : "",
                            isForecastSection && valueIdx === 0 ? "bg-slate-50" : ""
                          )}
                        >
                          {columnMode === "percentage"
                            ? row.isMargin
                              ? (value !== 0 ? `${value.toFixed(1)}%` : "-")
                              : (value !== 0 ? `${getTrendRevenuePercentage(value, valueIdx).toFixed(1)}%` : "-")
                            : columnMode === "variationAmount" || columnMode === "variationPercent"
                              ? (() => {
                                  const trendVariation = getTrendVariation(row.trendValues ?? [], valueIdx)
                                  const trendVariationAmount = getTrendVariationAmount(row.trendValues ?? [], valueIdx)
                                  if (row.isMargin) {
                                    return trendVariationAmount !== null ? `${trendVariationAmount >= 0 ? "+" : ""}${trendVariationAmount.toFixed(1)} pts` : "-"
                                  }
                                  if (columnMode === "variationPercent") {
                                    return trendVariation !== null ? `${trendVariation >= 0 ? "+" : ""}${trendVariation.toFixed(1)}%` : "-"
                                  }
                                  return trendVariationAmount !== null
                                    ? `${trendVariationAmount >= 0 ? "+" : ""}${formatCurrency(trendVariationAmount)}`
                                    : "-"
                                })()
                              : row.isMargin
                                ? (value !== 0 ? `${value.toFixed(1)}%` : "-")
                                : (value !== 0 ? formatCurrency(value) : "-")
                          }
                        </td>
                      ))}
                    </>
                  )}
                  {view === "24months" && row.trendValues && (
                    <>
                      {row.trendValues.map((value, valueIdx) => (
                        <td
                          key={valueIdx}
                          className={`px-4 py-3 text-right text-sm ${row.isMargin ? "italic" : (isBoldRow ? "font-semibold font-bold" : "text-slate-500")} ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {row.isMargin 
                            ? (value !== 0 ? `${value.toFixed(1)}%` : "-")
                            : (value !== 0 ? formatCurrency(value) : "-")
                          }
                        </td>
                      ))}
                    </>
                  )}
                  {/* Empty cells for spacer rows in trend views */}
                  {!showStructureCols &&
                    (view === "12months" || view === "24months" || view === "quarters" || view === "years") &&
                    !row.trendValues && (
                    <>
                      {Array.from({ length: view === "12months" ? 12 : view === "24months" ? 24 : view === "quarters" ? 5 : (isForecastSection && view === "years" ? projectionYears + 1 : 6) }).map((_, idx) => (
                        <td 
                          key={idx} 
                          className={cn(
                            "px-4 py-3 text-right text-sm text-slate-400",
                            isForecastSection && view === "years" && idx === 0 ? "bg-slate-50" : ""
                          )}
                        >
                          -
                        </td>
                      ))}
                    </>
                  )}
                </tr>
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div className="border-t border-slate-200 bg-slate-50/80 px-8 py-4">
        <p className={cn("text-xs", dashboardCardBodyMutedClass)}>
          Note: BAIIA = Bénéfice avant intérêts, impôts et amortissement
        </p>
      </div>

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
                    htmlFor="space-placement-above"
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-2xl border px-4 py-3.5 transition sm:px-5 sm:py-4",
                      addSpacePlacement === "above"
                        ? "border-[#E0742D]/45 bg-orange-50/50 shadow-sm ring-2 ring-[#E0742D]/20"
                        : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/90"
                    )}
                  >
                    <RadioGroupItem value="above" id="space-placement-above" className="mt-0.5 shrink-0" />
                    <span className="min-w-0 leading-snug">
                      <span className="block text-[15px] font-semibold text-[#2A2F3A]">Au-dessus</span>
                      <span className={cn("mt-0.5 block text-[13px]", dashboardCardBodyMutedClass)}>
                        Ligne vide placée avant le poste choisi.
                      </span>
                    </span>
                  </Label>
                  <Label
                    htmlFor="space-placement-below"
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-2xl border px-4 py-3.5 transition sm:px-5 sm:py-4",
                      addSpacePlacement === "below"
                        ? "border-[#E0742D]/45 bg-orange-50/50 shadow-sm ring-2 ring-[#E0742D]/20"
                        : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/90"
                    )}
                  >
                    <RadioGroupItem value="below" id="space-placement-below" className="mt-0.5 shrink-0" />
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
          {/* En-tête aligné sur la carte Paramètres (barre d’accent, badge, titres) */}
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
              <DialogDescription
                className={cn("text-sm leading-relaxed", dashboardCardBodyMutedClass)}
              >
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
                        htmlFor="post-placement-above"
                        className={cn(
                          "flex cursor-pointer gap-3 rounded-2xl border px-4 py-3.5 transition sm:px-5 sm:py-4",
                          addPostPlacement === "above"
                            ? "border-[#E0742D]/45 bg-orange-50/50 shadow-sm ring-2 ring-[#E0742D]/20"
                            : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/90"
                        )}
                      >
                        <RadioGroupItem value="above" id="post-placement-above" className="mt-0.5 shrink-0" />
                        <span className="min-w-0 leading-snug">
                          <span className="block text-[15px] font-semibold text-[#2A2F3A]">Au-dessus</span>
                          <span className={cn("mt-0.5 block text-[13px]", dashboardCardBodyMutedClass)}>
                            Le nouveau poste est placé avant le poste choisi.
                          </span>
                        </span>
                      </Label>
                      <Label
                        htmlFor="post-placement-below"
                        className={cn(
                          "flex cursor-pointer gap-3 rounded-2xl border px-4 py-3.5 transition sm:px-5 sm:py-4",
                          addPostPlacement === "below"
                            ? "border-[#E0742D]/45 bg-orange-50/50 shadow-sm ring-2 ring-[#E0742D]/20"
                            : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/90"
                        )}
                      >
                        <RadioGroupItem value="below" id="post-placement-below" className="mt-0.5 shrink-0" />
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

                  {/* Choix principal / secondaire */}
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
                        htmlFor="post-kind-primary"
                        className={cn(
                          "flex cursor-pointer gap-4 rounded-2xl border px-4 py-4 transition sm:px-5 sm:py-[1.125rem]",
                          addPostRank === "primary"
                            ? "border-[#E0742D]/45 bg-orange-50/50 shadow-sm ring-2 ring-[#E0742D]/20"
                            : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/90"
                        )}
                      >
                        <RadioGroupItem
                          value="primary"
                          id="post-kind-primary"
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
                        htmlFor="post-kind-secondary"
                        className={cn(
                          "flex cursor-pointer gap-4 rounded-2xl border px-4 py-4 transition sm:px-5 sm:py-[1.125rem]",
                          addPostRank === "secondary"
                            ? "border-[#E0742D]/45 bg-orange-50/50 shadow-sm ring-2 ring-[#E0742D]/20"
                            : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/90"
                        )}
                      >
                        <RadioGroupItem
                          value="secondary"
                          id="post-kind-secondary"
                          className="mt-1.5 shrink-0 sm:mt-2"
                        />
                        <span className="flex min-w-0 flex-1 items-start gap-4">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200/80">
                            <IndentIncrease className="h-[1.125rem] w-[1.125rem] text-slate-600" />
                          </span>
                          <span className="min-w-0 space-y-1.5 pt-0.5 leading-snug">
                            <span className="block text-[15px] font-semibold text-[#2A2F3A]">Poste secondaire</span>
                            <span className={cn("block text-[13px] leading-relaxed", dashboardCardBodyMutedClass)}>
                              Décalé vers la droite (ex. frais de vente, frais financiers)
                            </span>
                          </span>
                        </span>
                      </Label>
                    </RadioGroup>
                  </section>

                  {/* Option gras */}
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
