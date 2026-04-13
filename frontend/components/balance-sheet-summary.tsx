"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import type { FinancialStatementRow } from "@/lib/api"
import { getFinancialStatementSeries, type FinancialStatementSeriesParams } from "@/lib/api"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { useBalanceSheetStructureEdit } from "@/hooks/use-income-statement-structure-edit"
import {
  aggregateToQuarters,
  aggregateToYears,
  getPeriodLabels,
  getRowAmounts,
  reverseSeriesOrderForDisplay,
} from "@/lib/series-utils"
import { getHorizonModeLabel } from "@/lib/financial-statement-horizon-labels"
import {
  collectDistinctLinkCodesFromStructure,
  isStructureRowDetailOnly,
  isStructureRowEmptyLabel,
  normLabel,
} from "@/lib/income-statement-structure-utils"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  StatementSummaryStructureColgroup,
  StatementSummaryStructureRowCells,
  StatementSummaryStructureThead,
} from "@/components/statement-summary-structure-shared"
import {
  AlignLeft,
  ArrowLeft,
  IndentIncrease,
  LayoutList,
  Loader2,
  PanelTop,
  Plus,
  Settings,
  Sparkles,
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

interface BalanceSheetSummaryProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years"
  columnMode?: "variations" | "percentage" | "comparison"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  title?: string
  comparisonType?: "lastMonth" | "pastMonth" | "budget"
  selectedBudgetId?: string | null
  selectedBudgetName?: string | null
  fiscalYear?: number
  rows?: FinancialStatementRow[]
  loading?: boolean
  showBalanceSheetStructureSettings?: boolean
  structureVersion?: number
  onBalanceSheetStructureSaved?: () => void
}

interface SummaryRow {
  label: string
  current: number
  prior: number
  isBold?: boolean
  isSection?: boolean
  isResult?: boolean
  indent?: boolean
  /** Ligne de séparation au-dessus (structure / API). */
  separatorAbove?: boolean
  // For trend views (12months, quarters, years)
  trendValues?: number[]
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

export function BalanceSheetSummary({
  period,
  view,
  columnMode = "variations",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  title,
  comparisonType = "lastMonth",
  selectedBudgetId = null,
  selectedBudgetName = null,
  fiscalYear,
  rows: backendRows = [],
  loading = false,
  showBalanceSheetStructureSettings = false,
  structureVersion = 0,
  onBalanceSheetStructureSaved,
}: BalanceSheetSummaryProps) {
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
  const monthsNeeded = view === "years" ? 60 : 12

  const { rows: seriesRows, periods, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "balance-sheet",
    fiscalYear: currentYear,
    months: monthsNeeded,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: isMultiPeriod,
    structureVersion,
  })

  // Helper function to get comparison label
  const getComparisonLabel = (): string => {
    if (view !== "comparison" && view !== "ytd" && view !== "ddm") return "Passé"
    if (comparisonType === "lastMonth") {
      if (view === "ytd") return "YTD dernier"
      if (view === "ddm") return "DDM dernier"
      if (period === "monthly") return "Mois dernier"
      if (period === "quarterly") return "Trimestre dernier"
      return "Année dernière"
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

  // Map backend FinancialStatementRow[] to internal SummaryRow[]
  const mapBackendRows = (apiRows: FinancialStatementRow[]): SummaryRow[] => {
    return apiRows.map((row) => ({
      label: row.label,
      current: row.current,
      prior: row.prior,
      isBold: row.isBold,
      isSection: row.isSection,
      isResult: row.isResult,
      indent: indentForSummaryRow({
        isBold: !!row.isBold,
        isSection: !!row.isSection,
        isResult: !!row.isResult,
        indent: (row as { indent?: boolean }).indent,
      }),
      separatorAbove: isTruthySeparatorAbove((row as { separatorAbove?: unknown }).separatorAbove),
    }))
  }

  // Helper function to capitalize first letter
  const capitalizeFirst = (str: string): string => {
    if (!str) return str
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  // Helper function to check if label should be bold
  const shouldBeBold = (label: string, row: SummaryRow): boolean => {
    const boldLabels = [
      "actifs",
      "total des actifs",
      "passifs",
      "total des passifs",
      "capitaux propres",
      "total passifs et capitaux propres"
    ]
    return boldLabels.includes(label.toLowerCase()) || !!row.isResult
  }

  // Build multi-period rows from series API data
  const getMultiPeriodData = (): SummaryRow[] => {
    if (!seriesRows.length || !periods.length) return []

    return seriesRows.map(row => {
      const rawAmounts = getRowAmounts(row, periods)

      let values: number[]
      if (view === "quarters") {
        values = reverseSeriesOrderForDisplay(aggregateToQuarters(rawAmounts, periods).amounts)
      } else if (view === "years") {
        values = reverseSeriesOrderForDisplay(aggregateToYears(rawAmounts, periods).amounts)
      } else {
        values = reverseSeriesOrderForDisplay(rawAmounts)
      }

      return {
        label: row.label,
        current: values[0] || 0,
        prior: values.length >= 2 ? values[1] || 0 : 0,
        isBold: row.isBold,
        isSection: row.isSection,
        isResult: row.isResult,
        indent: indentForSummaryRow({
          isBold: !!row.isBold,
          isSection: !!row.isSection,
          isResult: !!row.isResult,
          indent: (row as { indent?: boolean }).indent,
        }),
        separatorAbove: isTruthySeparatorAbove((row as { separatorAbove?: unknown }).separatorAbove),
        trendValues: row.isSection ? undefined : values,
      }
    })
  }

  const data = isMultiPeriod ? getMultiPeriodData() : (backendRows.length > 0 ? mapBackendRows(backendRows) : [])

  // Determine what we're comparing
  const isCompanyComparison = columnMode === "comparison" && !companyId
  const isDivisionComparison = columnMode === "comparison" && companyId && !divisionId
  const isSubDivisionComparison = columnMode === "comparison" && companyId && divisionId && !subDivisionId
  const isComparisonMode = isCompanyComparison || isDivisionComparison || isSubDivisionComparison

  const canInlineStructureEdit =
    showBalanceSheetStructureSettings && !!companyId && !isComparisonMode
  const structEdit = useBalanceSheetStructureEdit(
    companyId ?? null,
    structureEditMode && canInlineStructureEdit
  )

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
            const mapped: SummaryRow[] = response.rows.map((row) => {
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
                indent: indentForSummaryRow({
                  isBold: !!row.isBold,
                  isSection: !!row.isSection,
                  isResult: !!row.isResult,
                  indent: (row as { indent?: boolean }).indent,
                }),
                separatorAbove: isTruthySeparatorAbove((row as { separatorAbove?: unknown }).separatorAbove),
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
    currentYear,
    structureVersion,
  ])

  // Find total assets value for percentage calculations
  const totalAssetsRow = data.find((row) => row.label.toLowerCase() === "total des actifs")
  const totalAssetsCurrent = totalAssetsRow?.current || 1
  const totalAssetsPrior = totalAssetsRow?.prior || 1

  // Helper function to calculate percentage of total assets
  const getTotalAssetsPercentage = (value: number, isPrior: boolean): number => {
    const totalAssets = isPrior ? totalAssetsPrior : totalAssetsCurrent
    if (totalAssets === 0) return 0
    return (value / totalAssets) * 100
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
    else if (view === "years") parts.push("6 dernières années")

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
      parts.push("• % des actifs totaux")
    } else {
      parts.push("• Variations")
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
    if (periods.length > 0 && seriesRows.length > 0) {
      const rawAmounts = getRowAmounts(seriesRows[0], periods)
      return reverseSeriesOrderForDisplay(aggregateToQuarters(rawAmounts, periods).labels)
    }
    const cd = new Date()
    const labels: string[] = []
    for (let i = 4; i >= 0; i--) {
      const date = new Date(cd.getFullYear(), cd.getMonth() - i * 3, 1)
      const quarter = Math.floor(date.getMonth() / 3) + 1
      labels.push(`T${quarter} ${date.getFullYear()}`)
    }
    return reverseSeriesOrderForDisplay(labels)
  }

  // Helper function to generate year labels from series data or fallback
  const getYearLabels = (): string[] => {
    if (periods.length > 0 && seriesRows.length > 0) {
      const rawAmounts = getRowAmounts(seriesRows[0], periods)
      return reverseSeriesOrderForDisplay(aggregateToYears(rawAmounts, periods).labels)
    }
    const cy = new Date().getFullYear()
    const labels: string[] = []
    for (let i = 5; i >= 0; i--) {
      labels.push(`${cy - i}`)
    }
    return reverseSeriesOrderForDisplay(labels)
  }

  const getHorizonText = (): string => getHorizonModeLabel(view, period)

  const trendLen = data.find((r) => r.trendValues != null)?.trendValues?.length ?? 0
  const showStructureCols =
    structureEditMode && canInlineStructureEdit && !structEdit.loading
  const tableRowCount = showStructureCols
    ? structEdit.summaryStructureDisplayIndices.length
    : data.length

  let summaryTableColumnCount = 2
  if (showStructureCols) summaryTableColumnCount = 8
  else if (view === "current") summaryTableColumnCount = 2
  else if (view === "comparison" || view === "ddm" || view === "ytd") {
    if (isComparisonMode) summaryTableColumnCount = 1 + entitiesToCompare.length
    else {
      const extra = columnMode === "variations" || columnMode === "percentage" ? 2 : 0
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

  if (data.length === 0) {
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
          {showStructureCols && <StatementSummaryStructureColgroup />}
          <thead>
            <tr
              className={cn(
                "border-b",
                showStructureCols
                  ? "border-slate-200 bg-gradient-to-r from-slate-50 via-slate-100/40 to-slate-50"
                  : "border-b-2 border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100/80"
              )}
            >
              {showStructureCols && <StatementSummaryStructureThead />}
              {!showStructureCols && (
                <>
              <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm w-2/5">Poste</th>
              {view === "current" && (
                <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Montant</th>
              )}
              {view === "comparison" && !isComparisonMode && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Courant</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{getComparisonLabel()}</th>
                  {columnMode === "variations" ? (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation %</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation $</th>
                    </>
                  ) : columnMode === "percentage" ? (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des actifs totaux</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des actifs totaux</th>
                    </>
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
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Courant</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{getComparisonLabel()}</th>
                  {columnMode === "variations" ? (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation %</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation $</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des actifs totaux</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des actifs totaux</th>
                    </>
                  )}
                </>
              )}
              {view === "ytd" && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">YTD {fiscalYear}</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">YTD {(fiscalYear ?? new Date().getFullYear()) - 1}</th>
                  {columnMode === "variations" ? (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation %</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation $</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des actifs totaux</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des actifs totaux</th>
                    </>
                  )}
                </>
              )}
              {view === "12months" && (
                <>
                  {getMonthLabels().map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {view === "quarters" && (
                <>
                  {getQuarterLabels().map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {view === "years" && (
                <>
                  {getYearLabels().map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
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
                  Aucun poste dans la structure. Utilisez « Ajouter un poste » ou « Ajouter un espace » pour commencer.
                </td>
              </tr>
            )}
            {Array.from({ length: tableRowCount }, (_, idx) => {
              const globalIdx = showStructureCols ? structEdit.summaryStructureDisplayIndices[idx]! : -1
              const structRow = showStructureCols ? structEdit.structure[globalIdx]! : null
              const row = showStructureCols ? summaryRowForStructureIndex(structRow!) : data[idx]!
              const variation = row.current && row.prior ? calculateVariation(row.current, row.prior) : null
              const variationAmount = row.current && row.prior ? row.current - row.prior : 0
              const isBoldRow = shouldBeBold(row.label, row)
              const displayLabel = row.label ? capitalizeFirst(row.label) : ""
              const isSpacer = row.label === ""
              const sectionExceptions = ["actifs courants", "actifs non courants"]
              const isSectionException = sectionExceptions.includes(row.label.toLowerCase())
              const shouldHideAmounts =
                isSpacer || (!isSectionException && !!row.isSection) || row.label.toLowerCase() === "actifs" || row.label.toLowerCase() === "passifs"

              const nextRow =
                idx < tableRowCount - 1
                  ? showStructureCols
                    ? summaryRowForStructureIndex(
                        structEdit.structure[structEdit.summaryStructureDisplayIndices[idx + 1]!]!
                      )
                    : data[idx + 1]!
                  : null
              const nextRowLabel = nextRow?.label?.toLowerCase() || ""
              const nextRowIsKeyResult =
                nextRow &&
                ((nextRow.isResult && nextRowLabel !== "capitaux propres") || nextRowLabel === "total des passifs")
              const rawSeparator =
                showStructureCols && structRow ? structRow.separatorAbove : row.separatorAbove
              const showSeparatorAbove = isTruthySeparatorAbove(rawSeparator)

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
                      "border-b",
                      row.label === "" ? "h-2 border-b border-b-slate-200" : "",
                      nextRowIsKeyResult ? "border-b-2 border-b-slate-900" : "border-b border-b-slate-200",
                      showStructureCols && row.label !== "" && "hover:bg-slate-100/70",
                      showStructureCols && idx % 2 === 1 && row.label !== "" && "bg-slate-50/50",
                      !showStructureCols && row.label !== "" && "hover:bg-slate-50/90"
                    )}
                  >
                  <td
                    className={cn(
                      "py-3",
                      showStructureCols ? "min-w-0 px-3 pl-4" : "px-6",
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
                          onChange={(e) => structEdit.updateRow(globalIdx, { label: e.target.value })}
                          className={cn(
                            "h-9 w-full max-w-full rounded-xl border-slate-200/90 bg-white text-sm shadow-sm transition-shadow focus-visible:border-[#E0742D]/50 focus-visible:ring-2 focus-visible:ring-[#E0742D]/20",
                            isBoldRow ? "font-semibold" : "font-normal"
                          )}
                        />
                      )
                    ) : (
                      displayLabel
                    )}
                  </td>
                  {showStructureCols && structRow && (
                    <StatementSummaryStructureRowCells
                      structRow={structRow}
                      globalIdx={globalIdx}
                      structEdit={structEdit}
                      allLiaisonCodes={allLiaisonCodes}
                      showSeparatorAbove={showSeparatorAbove}
                      onEditPresentation={beginEditPostPresentation}
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
                      {columnMode === "variations" ? (
                        <>
                          <td
                            className={`px-6 py-3 text-right font-semibold ${
                              variation && variation >= 0 ? "text-emerald-600" : "text-red-600"
                            } ${shouldHideAmounts ? "text-white" : ""}`}
                          >
                            {variation !== null && row.current !== 0
                              ? `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%`
                              : "-"}
                          </td>
                          <td
                            className={`px-6 py-3 text-right font-semibold ${
                              variationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                            } ${shouldHideAmounts ? "text-white" : ""}`}
                          >
                            {row.current !== 0
                              ? `${variationAmount >= 0 ? "+" : ""}${formatCurrency(variationAmount)}`
                              : "-"}
                          </td>
                        </>
                      ) : columnMode === "percentage" ? (
                        <>
                          <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.current !== 0 ? `${getTotalAssetsPercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.prior !== 0 ? `${getTotalAssetsPercentage(row.prior, true).toFixed(1)}%` : "-"}
                          </td>
                        </>
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
                      {columnMode === "variations" ? (
                        <>
                          <td
                            className={`px-6 py-3 text-right font-semibold ${
                              variation && variation >= 0 ? "text-emerald-600" : "text-red-600"
                            } ${shouldHideAmounts ? "text-white" : ""}`}
                          >
                            {variation !== null && row.current !== 0
                              ? `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%`
                              : "-"}
                          </td>
                          <td
                            className={`px-6 py-3 text-right font-semibold ${
                              variationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                            } ${shouldHideAmounts ? "text-white" : ""}`}
                          >
                            {row.current !== 0
                              ? `${variationAmount >= 0 ? "+" : ""}${formatCurrency(variationAmount)}`
                              : "-"}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.current !== 0 ? `${getTotalAssetsPercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.prior !== 0 ? `${getTotalAssetsPercentage(row.prior, true).toFixed(1)}%` : "-"}
                          </td>
                        </>
                      )}
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
                      {columnMode === "variations" ? (
                        <>
                          <td
                            className={`px-6 py-3 text-right font-semibold ${
                              variation && variation >= 0 ? "text-emerald-600" : "text-red-600"
                            } ${shouldHideAmounts ? "text-white" : ""}`}
                          >
                            {variation !== null && row.current !== 0
                              ? `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%`
                              : "-"}
                          </td>
                          <td
                            className={`px-6 py-3 text-right font-semibold ${
                              variationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                            } ${shouldHideAmounts ? "text-white" : ""}`}
                          >
                            {row.current !== 0
                              ? `${variationAmount >= 0 ? "+" : ""}${formatCurrency(variationAmount)}`
                              : "-"}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.current !== 0 ? `${getTotalAssetsPercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.prior !== 0 ? `${getTotalAssetsPercentage(row.prior, true).toFixed(1)}%` : "-"}
                          </td>
                        </>
                      )}
                    </>
                  )}
                  {!showStructureCols && view === "12months" && row.trendValues && (
                    <>
                      {row.trendValues.map((value, valueIdx) => (
                        <td
                          key={valueIdx}
                          className={`px-4 py-3 text-right font-semibold ${isBoldRow ? "font-bold" : ""} ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {value !== 0 ? formatCurrency(value) : "-"}
                        </td>
                      ))}
                    </>
                  )}
                  {!showStructureCols && view === "quarters" && row.trendValues && (
                    <>
                      {row.trendValues.map((value, valueIdx) => (
                        <td
                          key={valueIdx}
                          className={`px-4 py-3 text-right font-semibold ${isBoldRow ? "font-bold" : ""} ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {value !== 0 ? formatCurrency(value) : "-"}
                        </td>
                      ))}
                    </>
                  )}
                  {!showStructureCols && view === "years" && row.trendValues && (
                    <>
                      {row.trendValues.map((value, valueIdx) => {
                        const isForecastSection = title === "Bilan pro forma"
                        return (
                          <td
                            key={valueIdx}
                            className={cn(
                              "px-4 py-3 text-right font-semibold",
                              isBoldRow ? "font-bold" : "",
                              shouldHideAmounts ? "text-white" : "",
                              isForecastSection && valueIdx === 0 && !shouldHideAmounts ? "bg-slate-50" : ""
                            )}
                          >
                            {value !== 0 ? formatCurrency(value) : "-"}
                          </td>
                        )
                      })}
                    </>
                  )}
                  {!showStructureCols &&
                    (view === "12months" || view === "quarters" || view === "years") &&
                    !row.trendValues && (
                    <>
                      {Array.from({ length: view === "12months" ? 12 : view === "quarters" ? 5 : 6 }).map((_, idx) => {
                        const isForecastSection = title === "Bilan pro forma"
                        return (
                          <td
                            key={idx}
                            className={cn(
                              "px-4 py-3 text-right font-semibold text-white",
                              isForecastSection && view === "years" && idx === 0 ? "bg-slate-50" : ""
                            )}
                          >
                            -
                          </td>
                        )
                      })}
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
      <div className="border-t border-slate-200 bg-slate-50/90 px-6 py-4 sm:px-7">
        <p className={cn("text-xs", dashboardCardBodyMutedClass)}>
          Note: Les données affichées sont à titre informatif. Consulter les états financiers audités pour les montants officiels.
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

