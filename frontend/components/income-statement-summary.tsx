"use client"

import { useState, useEffect, useMemo } from "react"
import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import type { FinancialStatementRow } from "@/lib/api"
import { getFinancialStatementSeries, type FinancialStatementSeriesParams } from "@/lib/api"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { getRowAmounts, getPeriodLabels, aggregateToQuarters, aggregateToYears } from "@/lib/series-utils"
import { useIncomeStatementStructureEdit } from "@/hooks/use-income-statement-structure-edit"
import {
  CHARGES_SECTION_LABEL,
  TOTAL_CHARGES_LABEL,
  isCodeMappingEnabled,
  isOmittedIncomeStatementSummaryRowLabel,
  isShowInDetail,
  isStructureRowDetailOnly,
  isStructureRowEmptyLabel,
  isStructureRowHidden,
  normLabel,
  normalizeAnnexLetter,
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  BookMarked,
  Eye,
  EyeOff,
  Hash,
  Link2,
  Loader2,
  PanelTop,
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
  dashboardCardRingClass,
  dashboardCardTitleClass,
} from "@/lib/dashboard-card-style"

interface IncomeStatementSummaryProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years" | "24months"
  columnMode?: "variations" | "percentage" | "comparison"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  title?: string
  projectionYears?: 3 | 4 | 5
  comparisonType?: "lastMonth" | "pastMonth" | "budget"
  selectedBudgetId?: string | null
  selectedBudgetName?: string | null
  fiscalYear?: number
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
  // For trend views (12months, quarters, years)
  trendValues?: number[]
}

export function IncomeStatementSummary({
  period,
  view,
  columnMode = "variations",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  title,
  projectionYears = 5,
  comparisonType = "lastMonth",
  selectedBudgetId = null,
  selectedBudgetName = null,
  fiscalYear,
  rows: backendRows = [],
  loading = false,
  showIncomeStatementStructureSettings = false,
  structureVersion = 0,
  onIncomeStatementStructureSaved,
}: IncomeStatementSummaryProps) {
  const [structureEditMode, setStructureEditMode] = useState(false)
  const [addSpaceDialogOpen, setAddSpaceDialogOpen] = useState(false)
  const isForecastSection = title === "États des résultats pro forma"

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
    enabled: isMultiPeriodView && !isForecastSection,
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
        indent: !row.isBold && !row.isSection && !row.isResult,
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
    return boldLabels.includes(label.toLowerCase()) || !!row.isResult || !!row.isNetIncome || !!row.isEBITA
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
      const rawAmounts = getRowAmounts(row, seriesPeriods)
      let trendValues: number[]
      if (view === "quarters") {
        const { amounts: qAmounts } = aggregateToQuarters(rawAmounts, seriesPeriods)
        trendValues = qAmounts
      } else if (view === "years") {
        const { amounts: yAmounts } = aggregateToYears(rawAmounts, seriesPeriods)
        trendValues = yAmounts
      } else {
        trendValues = rawAmounts
      }
      const lastAmount = trendValues[trendValues.length - 1] || 0
      const priorAmount = trendValues.length >= 2 ? trendValues[trendValues.length - 2] || 0 : 0
      return {
        label: row.label,
        current: lastAmount,
        prior: priorAmount,
        isBold: row.isBold || row.isResult,
        isSection: row.isSection,
        isResult: row.isResult,
        isNetIncome: row.label.toLowerCase().includes("bénéfice net") && row.isResult,
        isEBITA: row.label.toLowerCase() === "baiia",
        indent: !row.isBold && !row.isSection && !row.isResult,
        trendValues,
      }
    })
  }

  const data = isMultiPeriodView && !isForecastSection ? buildSeriesData() : mapBackendRows(backendRows)
  
  // Determine what we're comparing
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
                indent: !row.isBold && !row.isSection && !row.isResult,
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

  // Find revenue value for percentage calculations
  const revenueRow = data.find((row) => row.label.toLowerCase() === "revenus")
  const revenueCurrent = revenueRow?.current || 1
  const revenuePrior = revenueRow?.prior || 1

  // Helper function to calculate percentage of revenue
  const getRevenuePercentage = (value: number, isPrior: boolean): number => {
    const revenue = isPrior ? revenuePrior : revenueCurrent
    if (revenue === 0) return 0
    return (value / revenue) * 100
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
      return getPeriodLabels(seriesPeriods)
    }
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
    const currentDate = new Date()
    const labels: string[] = []
    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      labels.push(`${months[date.getMonth()]} ${date.getFullYear()}`)
    }
    return labels
  }

  // Helper function to generate quarter labels (5 quarters)
  const getQuarterLabels = (): string[] => {
    if (seriesPeriods.length > 0 && !isForecastSection) {
      const dummyAmounts = seriesPeriods.map(() => 0)
      const { labels } = aggregateToQuarters(dummyAmounts, seriesPeriods)
      return labels
    }
    const currentDate = new Date()
    const labels: string[] = []
    for (let i = 4; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i * 3, 1)
      const quarter = Math.floor(date.getMonth() / 3) + 1
      labels.push(`T${quarter} ${date.getFullYear()}`)
    }
    return labels
  }

  // Helper function to generate year labels (projectionYears + 1 for forecast sections)
  const getYearLabels = (): string[] => {
    if (seriesPeriods.length > 0 && !isForecastSection) {
      const dummyAmounts = seriesPeriods.map(() => 0)
      const { labels } = aggregateToYears(dummyAmounts, seriesPeriods)
      return labels
    }
    const currentYear = new Date().getFullYear()
    const labels: string[] = []
    if (isForecastSection) {
      // For forecast sections, generate projectionYears + 1 years starting from current year
      for (let i = 0; i <= projectionYears; i++) {
        labels.push(`${currentYear + i}`)
      }
    } else {
      // For other views, generate past years (unchanged for historical data)
      for (let i = 5; i >= 0; i--) {
        labels.push(`${currentYear - i}`)
      }
    }
    return labels
  }

  // Helper function to get horizon text
  const getHorizonText = (): string => {
    if (view === "comparison" && period === "monthly") return "Courant"
    if (view === "comparison" && period === "quarterly") return "Trimestriel"
    if (view === "comparison" && period === "annual") return "Annuel"
    if (view === "ytd") return "YTD"
    if (view === "ddm") return "DDM"
    if (view === "12months") return "12 mois"
    if (view === "24months") return "24 mois"
    if (view === "quarters") return "Trimestres"
    if (view === "years") return "Années"
    return "Courant"
  }

  const trendLen = data.find((r) => r.trendValues != null)?.trendValues?.length ?? 0
  const showStructureCols =
    structureEditMode &&
    canInlineStructureEdit &&
    !structEdit.loading &&
    structEdit.summaryStructureDisplayIndices.length > 0
  const tableRowCount = showStructureCols
    ? structEdit.summaryStructureDisplayIndices.length
    : data.length

  const padSummaryRow = (structRow: Record<string, unknown>): SummaryRow => ({
    label: String(structRow.label ?? ""),
    current: 0,
    prior: 0,
    isBold: false,
    isSection: false,
    isResult: false,
    isNetIncome: false,
    isEBITA: false,
    isMargin: false,
    indent: !!structRow.indent,
    trendValues: trendLen > 0 ? Array(trendLen).fill(0) : undefined,
  })

  /** En édition structure : aligner sur `data` par libellé (le sommaire exclut les lignes detailOnly). */
  const summaryRowForStructureIndex = (structRow: Record<string, unknown>): SummaryRow => {
    const sl = normLabel(String(structRow.label ?? ""))
    const found = data.find((r) => normLabel(r.label) === sl)
    if (found) return found
    return padSummaryRow(structRow)
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

  if (data.length === 0) {
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
      <div className="relative">
      {/* Header */}
      <div
        className={cn("border-b px-6 py-5 sm:px-8", dashboardCardHeaderBarClass)}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className={cn("mt-0.5 h-12 w-1.5 shrink-0", dashboardCardAccentBarClass)} />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h2 className={cn("text-xl", dashboardCardTitleClass)}>{title || "Sommaire"}</h2>
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
                  <span className="font-medium text-[#2A2F3A]">Code</span> active la liaison et la lettre ;{" "}
                  <span className="font-medium text-[#2A2F3A]">Annexe</span> contrôle l’affichage au détail — indépendant
                  l’un de l’autre. Enregistrez pour appliquer partout.
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
              className="shrink-0 gap-2 border-slate-300 bg-white text-[#2A2F3A] transition-colors hover:border-slate-500 hover:bg-slate-50"
              onClick={() => setStructureEditMode(true)}
            >
              <Settings className="h-4 w-4" />
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
                  disabled={structEdit.loading || spacerTargetPosts.length === 0}
                  title="Insérer une ligne vide au-dessus d’un poste du sommaire"
                  onClick={() => setAddSpaceDialogOpen(true)}
                >
                  <PanelTop className={cn("h-4 w-4", dashboardCardAccentClass)} />
                  Ajouter un espace
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 rounded-xl text-[#2A2F3A] hover:bg-slate-100"
                  disabled={!structEdit.chargeRange || structEdit.loading}
                  onClick={() => structEdit.addChargeLine()}
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
      {structureEditMode &&
        canInlineStructureEdit &&
        !structEdit.loading &&
        structEdit.structure.length > 0 &&
        !structEdit.chargeRange && (
          <div className="border-b border-amber-200/90 bg-gradient-to-r from-amber-50 to-amber-50/30 px-6 py-3 text-sm text-amber-950 sm:px-8">
            Structure inattendue : « {CHARGES_SECTION_LABEL} » ou « {TOTAL_CHARGES_LABEL} » introuvable.
          </div>
        )}

      {/* Table */}
      <div className={cn("overflow-x-auto", isStructureStudio ? "bg-gradient-to-b from-white to-slate-50/50" : "bg-white")}>
        <table
          className={cn(
            "w-full",
            showStructureCols && "table-fixed",
            isStructureStudio ? "border-separate border-spacing-0" : "border-collapse"
          )}
        >
            {showStructureCols && (
              <colgroup>
                <col />
                <col style={{ width: "7rem" }} />
                <col style={{ width: "7rem" }} />
                <col style={{ width: "7rem" }} />
                <col style={{ width: "7rem" }} />
                <col style={{ width: "7rem" }} />
                <col style={{ width: "2.75rem" }} />
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
                    !showStructureCols && "w-2/5",
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
                              <Link2 className="h-4 w-4 text-slate-600" />
                            </span>
                            <span className="text-[11px] font-semibold leading-tight text-slate-800">Liaison</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[220px] text-balance">
                          Code rattaché au poste lorsque « Code » est coché.
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
                    <th className="box-border w-11 px-0 py-4" aria-label="Actions" />
                  </>
                )}
              {!showStructureCols && view === "current" && (
                <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Montant</th>
              )}
              {!showStructureCols && view === "comparison" && !isComparisonMode && (
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
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Courant</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{getComparisonLabel()}</th>
                  {columnMode === "variations" ? (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation %</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation $</th>
                    </>
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
                  {columnMode === "variations" ? (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation %</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation $</th>
                    </>
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
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: tableRowCount }, (_, idx) => {
              const globalIdx = showStructureCols ? structEdit.summaryStructureDisplayIndices[idx]! : -1
              const structRow = showStructureCols ? structEdit.structure[globalIdx]! : null
              const row = showStructureCols
                ? summaryRowForStructureIndex(structRow!)
                : data[idx]!
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
                    : data[idx + 1]!
                  : null
              const nextRowLabel = nextRow?.label?.toLowerCase() || ""
              // Séparation épaisse avant « Total des charges » : libellé suivant selon la structure en
              // paramètres (sinon data[idx+1] est décalé tant que l’API n’a pas refetch).
              const nextLabelForTotalCharges =
                idx < tableRowCount - 1
                  ? normLabel(
                      showStructureCols
                        ? String(
                            structEdit.structure[structEdit.summaryStructureDisplayIndices[idx + 1]!]?.label ??
                              ""
                          )
                        : String(data[idx + 1]?.label ?? "")
                    )
                  : ""
              const separatesChargesFromTotal =
                nextLabelForTotalCharges === normLabel(TOTAL_CHARGES_LABEL)
              const nextRowIsKeyResult =
                separatesChargesFromTotal ||
                (nextRow &&
                  ((nextRow.isResult && nextRowLabel !== "bénéfice avant impôts") ||
                    nextRow.isNetIncome))

              return (
                <tr
                  key={idx}
                  className={cn(
                    "border-b transition-colors duration-150",
                    row.label === "" ? "h-2 border-slate-200" : "",
                    nextRowIsKeyResult
                      ? "border-slate-900 border-b-2"
                      : showStructureCols
                        ? "border-slate-200/80"
                        : "border-slate-200",
                    showStructureCols && row.label !== "" && "hover:bg-slate-100/70",
                    showStructureCols && idx % 2 === 1 && row.label !== "" && "bg-slate-50/50",
                    !showStructureCols && row.label !== "" && "hover:bg-slate-50/90"
                  )}
                >
                  <td
                    className={cn(
                      "min-w-0 py-3 align-middle",
                      showStructureCols ? "px-3 pl-4" : "px-6",
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
                    <>
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
                                    structEdit.updateRow(globalIdx, { defineMapping: true })
                                  } else {
                                    structEdit.updateRow(globalIdx, {
                                      defineMapping: false,
                                      showInDetail: false,
                                      linkCode: undefined,
                                      annexLetter: undefined,
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
                                  structEdit.updateRow(globalIdx, { showInDetail: v === true })
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
                            value={String(structRow.linkCode ?? "")}
                            onChange={(e) =>
                              structEdit.updateRow(globalIdx, { linkCode: e.target.value || undefined })
                            }
                            placeholder="REV"
                            className="h-9 w-full min-w-0 rounded-xl border-slate-200/90 bg-white px-2 font-mono text-xs shadow-sm focus-visible:border-[#E0742D]/50 focus-visible:ring-2 focus-visible:ring-[#E0742D]/20"
                          />
                        ) : (
                          <span className="block truncate rounded-lg bg-slate-100/50 px-1.5 py-2 text-center text-sm text-slate-300">
                            —
                          </span>
                        )}
                      </td>
                      <td className="box-border w-[7rem] min-w-0 px-2 py-2.5 align-middle">
                        {isCodeMappingEnabled(structRow) && !isStructureRowHidden(structRow) ? (
                          <Input
                            value={String(structRow.annexLetter ?? "")}
                            onChange={(e) =>
                              structEdit.updateRow(globalIdx, {
                                annexLetter: normalizeAnnexLetter(e.target.value) || undefined,
                              })
                            }
                            placeholder="A"
                            className="h-9 w-full min-w-0 rounded-xl border-slate-200/90 bg-white px-2 text-center text-xs font-bold uppercase tracking-widest shadow-sm focus-visible:border-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500/25"
                            maxLength={8}
                          />
                        ) : (
                          <span className="block truncate rounded-lg bg-slate-100/50 px-1.5 py-2 text-center text-sm text-slate-300">
                            —
                          </span>
                        )}
                      </td>
                      <td className="box-border w-11 px-0 py-2.5 align-middle">
                        {structEdit.canRemoveRowAt(globalIdx) ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl text-red-500 opacity-70 transition hover:bg-red-50 hover:text-red-600 hover:opacity-100"
                            title="Supprimer la ligne"
                            onClick={() => structEdit.removeStructureRowAt(globalIdx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
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
                      {columnMode === "variations" ? (
                        <>
                          <td
                            className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold " : ""}${
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
                      {columnMode === "variations" ? (
                        <>
                          <td
                            className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold " : ""}${
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
                      {columnMode === "variations" ? (
                        <>
                          <td
                            className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold " : ""}${
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
                          {row.isMargin 
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
                          {row.isMargin 
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
                            isForecastSection && valueIdx === 0 && !shouldHideAmounts ? "bg-slate-50" : ""
                          )}
                        >
                          {row.isMargin 
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
                            "px-4 py-3 text-right font-semibold text-white",
                            isForecastSection && view === "years" && idx === 0 ? "bg-slate-50" : ""
                          )}
                        >
                          -
                        </td>
                      ))}
                    </>
                  )}
                </tr>
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

      <Dialog open={addSpaceDialogOpen} onOpenChange={setAddSpaceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un espace</DialogTitle>
            <DialogDescription>
              Choisissez le poste du sommaire au-dessus duquel insérer une ligne vide.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(60vh,420px)] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-1">
            {spacerTargetPosts.map(({ globalIdx, label }) => (
              <button
                key={`spacer-above-${globalIdx}`}
                type="button"
                className="flex w-full rounded-lg px-3 py-2.5 text-left text-sm text-[#2A2F3A] transition hover:bg-white hover:shadow-sm"
                onClick={() => {
                  structEdit.insertEmptySpacerAbove(globalIdx)
                  setAddSpaceDialogOpen(false)
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
