"use client"

import { useState, useEffect, Fragment } from "react"
import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import type { FinancialStatementDetailRow, FinancialStatementRow, SeriesDetailRow, SeriesRow } from "@/lib/api"
import { getFinancialStatementSeries, getStatementStructure, type FinancialStatementSeriesParams } from "@/lib/api"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import {
  aggregateToQuarters,
  aggregateToYears,
  getPeriodLabels,
  getRowAmounts,
  reverseSeriesOrderForDisplay,
} from "@/lib/series-utils"
import { yearTrendFromReference } from "@/lib/series-reference-columns"
import { getHorizonModeLabel } from "@/lib/financial-statement-horizon-labels"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ListTree, Settings, Sparkles } from "lucide-react"
import { StatementStructureStudio } from "@/components/statement-structure-studio"
import {
  detailLineLabelForDisplay,
  findStatementApiRowForStructureRow,
  indentForSummaryRow,
  isCodeMappingEnabled,
  isStructureRowEmptyLabel,
  isTruthySeparatorAbove,
  listStructureRowsForPresentationDisplay,
} from "@/lib/income-statement-structure-utils"
import {
  dashboardCardBodyMutedClass,
  dashboardCardAccentClass,
  dashboardCardFrameStaticClass,
  dashboardCardHeaderBarClass,
  dashboardCardHeaderIconBoxClass,
  dashboardCardRingClass,
  dashboardCardStructureSettingsButtonClass,
  dashboardCardTitleClass,
} from "@/lib/dashboard-card-style"

interface CashFlowDetailProps {
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
  showCashFlowStructureSettings?: boolean
  structureVersion?: number
  onCashFlowStructureSaved?: () => void
  refMonth?: number
  refYear?: number
  showDetailStructureSettings?: boolean
  detailStructureVersion?: number
  onDetailStructureSaved?: () => void
  projectionYears?: 3 | 4 | 5
  forecastBaseYear?: number
  forecastUseSeriesActuals?: boolean
}

interface DetailRow {
  label: string
  current: number
  prior: number
  indent?: boolean
  isBold?: boolean
  isSubtotal?: boolean
  isSection?: boolean
  separatorAbove?: boolean
  annexLetter?: string
  rowId?: string
  isDetailAccount?: boolean
  hasLiaisonCode?: boolean
  // For trend views (12months, quarters, years)
  trendValues?: number[]
}

export function CashFlowDetail({
  period,
  view,
  columnMode = "variations",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  title = "Détail",
  comparisonType = "lastMonth",
  selectedBudgetName = null,
  refMonth,
  refYear,
  fiscalYear,
  rows: backendRows = [],
  loading = false,
  showCashFlowStructureSettings = false,
  structureVersion = 0,
  onCashFlowStructureSaved,
  showDetailStructureSettings,
  detailStructureVersion = 0,
  onDetailStructureSaved,
  projectionYears = 5,
  forecastBaseYear,
  forecastUseSeriesActuals = false,
}: CashFlowDetailProps) {
  const isForecastSection = title?.endsWith("pro forma") ?? false
  const forecastYearColumnCount = projectionYears + 1
  const effectiveRefMonth = refMonth ?? new Date().getMonth() + 1
  const effectiveRefYear = refYear ?? fiscalYear ?? new Date().getFullYear()

  const effectiveShowStructureSettings = showDetailStructureSettings ?? showCashFlowStructureSettings
  const effectiveStructureVersion = detailStructureVersion || structureVersion
  const handleStructureSaved = onDetailStructureSaved ?? onCashFlowStructureSaved
  const [statementStructure, setStatementStructure] = useState<Record<string, unknown>[] | null>(null)
  const [structureLoading, setStructureLoading] = useState(false)

  useEffect(() => {
    if (!companyId) {
      setStatementStructure(null)
      setStructureLoading(false)
      return
    }
    let cancelled = false
    setStructureLoading(true)
    getStatementStructure(companyId, "cash-flow-detail")
      .then((data) => {
        if (!cancelled) setStatementStructure(data.structure as Record<string, unknown>[])
      })
      .catch(() => {
        if (!cancelled) setStatementStructure(null)
      })
      .finally(() => {
        if (!cancelled) setStructureLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [companyId, effectiveStructureVersion])

  // Series data for multi-period views
  const isMultiPeriod = view === "12months" || view === "quarters" || view === "years"
  const currentYear = fiscalYear || new Date().getFullYear()
  const monthsNeeded = view === "years" ? 60 : 12

  const { rows: seriesRows, periods, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "cash-flow",
    fiscalYear: currentYear,
    month: effectiveRefMonth,
    months: monthsNeeded,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: isMultiPeriod && (!isForecastSection || forecastUseSeriesActuals),
  })


  const structureRowToDetailRow = (
    sr: Record<string, unknown>,
    row: FinancialStatementRow | undefined,
    trendValues?: number[]
  ): DetailRow => {
    if (isStructureRowEmptyLabel(sr)) {
      return {
        label: "",
        current: 0,
        prior: 0,
        isBold: false,
        isSubtotal: false,
        isSection: false,
        separatorAbove: isTruthySeparatorAbove(sr.separatorAbove),
        rowId: String(sr.id ?? ""),
        hasLiaisonCode: false,
      }
    }
    const label = detailLineLabelForDisplay(sr, row?.label ?? "")
    const isBold = typeof sr.isBold === "boolean" ? sr.isBold : !!row?.isBold
    const isSection = typeof sr.isSection === "boolean" ? sr.isSection : !!row?.isSection
    const isResult = typeof sr.isResult === "boolean" ? sr.isResult : !!row?.isResult
    const hasLiaisonCode = row?.hasLiaisonCode ?? isCodeMappingEnabled(sr)
    return {
      label,
      current: row?.current ?? (trendValues ? trendValues[0] || 0 : 0),
      prior: row?.prior ?? (trendValues && trendValues.length >= 2 ? trendValues[1] || 0 : 0),
      indent: indentForSummaryRow({
        isBold: !!isBold,
        isSection: !!isSection,
        isResult: !!isResult,
        indent: typeof sr.indent === "boolean" ? sr.indent : row?.indent,
      }),
      isBold,
      isSubtotal: isResult,
      isSection,
      separatorAbove: isTruthySeparatorAbove(sr.separatorAbove),
      annexLetter: row?.annexLetter,
      rowId: row?.id ?? String(sr.id ?? sr.linkCode ?? ""),
      hasLiaisonCode,
      trendValues: isSection ? undefined : trendValues,
    }
  }

  const mapRowsFromDetailStructure = (
    apiRows: FinancialStatementRow[],
    trendByRowId?: Map<string, number[]>
  ): DetailRow[] => {
    if (!statementStructure?.length) return []
    const displayRows = listStructureRowsForPresentationDisplay(statementStructure)
    return displayRows.flatMap((sr) => {
      const row = findStatementApiRowForStructureRow(apiRows, sr)
      const trendValues = row?.id && trendByRowId ? trendByRowId.get(row.id) : undefined
      const base = structureRowToDetailRow(sr, row, trendValues)
      return [base, ...mapAccountDetailRows(row?.detailRows)]
    })
  }


  const mapAccountDetailRows = (detailRows: FinancialStatementDetailRow[] | undefined): DetailRow[] =>
    (detailRows ?? []).map((dr) => ({
      label: dr.label,
      current: dr.current ?? 0,
      prior: dr.prior ?? 0,
      indent: true,
      isBold: false,
      isSubtotal: false,
      isSection: false,
      rowId: dr.id,
      isDetailAccount: true,
    }))

  const mapSeriesAccountDetailRows = (detailRows: SeriesDetailRow[] | undefined): DetailRow[] =>
    (detailRows ?? []).map((dr) => {
      const pseudoRow: SeriesRow = {
        id: dr.id,
        label: dr.label,
        isBold: false,
        isSection: false,
        isResult: false,
        amounts: dr.amounts,
        detailRows: [],
      }
      const rawAmounts = periods.map((p) => dr.amounts[`${p.fiscalYear}-${p.fiscalMonth}`] || 0)
      let values: number[]
      if (view === "quarters") {
        values = reverseSeriesOrderForDisplay(aggregateToQuarters(rawAmounts, periods).amounts)
      } else if (view === "years") {
        if (isForecastSection && forecastUseSeriesActuals) {
          const actual = yearTrendFromReference(pseudoRow, periods, effectiveRefYear, 1)[0] || 0
          values = [actual, ...Array.from({ length: projectionYears }, () => 0)]
        } else {
          values = reverseSeriesOrderForDisplay(aggregateToYears(rawAmounts, periods).amounts)
        }
      } else {
        values = reverseSeriesOrderForDisplay(rawAmounts)
      }
      return {
        label: dr.label,
        current: values[0] || 0,
        prior: values.length >= 2 ? values[1] || 0 : 0,
        indent: true,
        isBold: false,
        isSubtotal: false,
        isSection: false,
        rowId: dr.id,
        isDetailAccount: true,
        trendValues: values,
      }
    })

  const buildSeriesTrendValues = (row: SeriesRow, rawAmounts: ReturnType<typeof getRowAmounts>): number[] => {
    if (view === "quarters") {
      return reverseSeriesOrderForDisplay(aggregateToQuarters(rawAmounts, periods).amounts)
    }
    if (view === "years") {
      if (isForecastSection && forecastUseSeriesActuals) {
        const actual = yearTrendFromReference(row, periods, effectiveRefYear, 1)[0] || 0
        return [actual, ...Array.from({ length: projectionYears }, () => 0)]
      }
      return reverseSeriesOrderForDisplay(aggregateToYears(rawAmounts, periods).amounts)
    }
    return reverseSeriesOrderForDisplay(rawAmounts)
  }

  // Map backend FinancialStatementRow[] to internal DetailRow[]
  const mapBackendRows = (apiRows: FinancialStatementRow[]): DetailRow[] => {
    if (statementStructure?.length) {
      return mapRowsFromDetailStructure(apiRows)
    }
    return apiRows.flatMap((row) => {
      const base: DetailRow = {
        label: row.label,
        current: row.current ?? 0,
        prior: row.prior ?? 0,
        indent: !row.isBold && !row.isSection && !row.isResult,
        isBold: row.isBold,
        isSubtotal: row.isResult,
        isSection: row.isSection,
        separatorAbove: isTruthySeparatorAbove(row.separatorAbove),
        annexLetter: row.annexLetter,
        rowId: row.id,
      }
      return [base, ...mapAccountDetailRows(row.detailRows)]
    })
  }

  // Build multi-period rows from series API data
  const getMultiPeriodData = (): DetailRow[] => {
    if (statementStructure?.length) {
      if (!seriesRows.length || !periods.length) {
        return mapRowsFromDetailStructure([])
      }
      const trendByRowId = new Map<string, number[]>()
      for (const row of seriesRows) {
        const rawAmounts = getRowAmounts(row, periods)
        if (row.id) trendByRowId.set(row.id, buildSeriesTrendValues(row, rawAmounts))
      }
      return mapRowsFromDetailStructure(seriesRows as unknown as FinancialStatementRow[], trendByRowId)
    }

    if (!seriesRows.length || !periods.length) return []

    return seriesRows.flatMap((row) => {
      const rawAmounts = getRowAmounts(row, periods)
      const values = buildSeriesTrendValues(row, rawAmounts)
      const base: DetailRow = {
        label: row.label,
        current: values[0] || 0,
        prior: values.length >= 2 ? values[1] || 0 : 0,
        indent: !row.isBold && !row.isSection && !row.isResult,
        isBold: row.isBold,
        isSubtotal: row.isResult,
        isSection: row.isSection,
        separatorAbove: isTruthySeparatorAbove((row as { separatorAbove?: unknown }).separatorAbove),
        annexLetter: row.annexLetter,
        rowId: row.id,
        trendValues: row.isSection ? undefined : values,
      }
      return [base, ...mapSeriesAccountDetailRows(row.detailRows)]
    })
  }

  const getDetailData = (): DetailRow[] => {
    if (isMultiPeriod) {
      return getMultiPeriodData()
    }
    if (statementStructure?.length) {
      return mapRowsFromDetailStructure(backendRows)
    }
    if (backendRows.length > 0) {
      return mapBackendRows(backendRows)
    }
    return []
  }

  // Helper function to capitalize first letter
  const capitalizeFirst = (str: string): string => {
    if (!str) return str
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  const data = getDetailData()
  
  // Determine what we're comparing
  const isCompanyComparison = columnMode === "comparison" && !companyId
  const isDivisionComparison = columnMode === "comparison" && companyId && !divisionId
  const isSubDivisionComparison = columnMode === "comparison" && companyId && divisionId && !subDivisionId
  const isComparisonMode = isCompanyComparison || isDivisionComparison || isSubDivisionComparison
  
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
  const [entityDataMap, setEntityDataMap] = useState<Record<string, DetailRow[]>>({})
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
      const results: Record<string, DetailRow[]> = {}

      for (const entity of entities) {
        try {
          const params: FinancialStatementSeriesParams = {
            fiscal_year: currentYear,
            months: 12,
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
            "cash-flow",
            params
          )

          if (!cancelled && response.rows) {
            const mapped: DetailRow[] = response.rows.map((row) => {
              const amounts = Object.entries(row.amounts)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([, v]) => v)
              const lastAmount = amounts[amounts.length - 1] || 0
              const priorAmount = amounts.length >= 2 ? amounts[amounts.length - 2] || 0 : 0
              return {
                label: row.label,
                current: lastAmount,
                prior: priorAmount,
                indent: !row.isBold && !row.isSection && !row.isResult,
                isBold: row.isBold,
                isSubtotal: row.isResult,
                isSection: row.isSection,
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
  }, [isComparisonMode, companies, companyId, divisionId, isCompanyComparison, isDivisionComparison, isSubDivisionComparison, currentYear])

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

  // Find total cash flow value for percentage calculations
  const totalCashFlowRow = data.find(
    (row) =>
      (row.label.toLowerCase().includes("flux net") || row.label.toLowerCase().includes("variation nette")) &&
      row.isSubtotal
  )
  const totalCashFlowCurrent = totalCashFlowRow?.current || 1
  const totalCashFlowPrior = totalCashFlowRow?.prior || 1

  // Helper function to calculate percentage of total cash flow
  const getTotalCashFlowPercentage = (value: number, isPrior: boolean): number => {
    const totalCashFlow = isPrior ? totalCashFlowPrior : totalCashFlowCurrent
    if (totalCashFlow === 0) return 0
    return (value / Math.abs(totalCashFlow)) * 100
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
    if (isForecastSection) {
      const baseYear = forecastBaseYear ?? effectiveRefYear ?? new Date().getFullYear()
      const labels: string[] = [`${baseYear - 1}`]
      for (let i = 0; i < projectionYears; i++) {
        labels.push(`${baseYear + i}`)
      }
      return labels
    }
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

  const [structureEditMode, setStructureEditMode] = useState(false)
  const canInlineStructureEdit = effectiveShowStructureSettings && !!companyId && !isComparisonMode
  const isStructureStudio = structureEditMode && canInlineStructureEdit && !!companyId

  const renderCardHeader = () => (
    <div className={cn("px-6 py-5 sm:px-7", dashboardCardHeaderBarClass)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className={dashboardCardHeaderIconBoxClass}>
            <ListTree className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h2 className={cn("text-xl leading-tight", dashboardCardTitleClass)}>{title}</h2>
              {isStructureStudio && (
                <Badge
                  variant="secondary"
                  className="border border-slate-200 bg-slate-100 font-medium text-[#2A2F3A] shadow-none"
                >
                  <Sparkles className="h-3 w-3 text-[#E0742D]" />
                  Édition structure</Badge>
              )}
            </div>
            {isStructureStudio ? (
              <p className={cn("text-sm leading-relaxed", dashboardCardBodyMutedClass)}>
                Ajustez les libellés. <span className="font-medium text-[#2A2F3A]">Masquer</span> retire la ligne du détail. <span className="font-medium text-[#2A2F3A]">Code</span> active la colonne liaison ; <span className="font-medium text-[#2A2F3A]">Liaison</span> définit le code ou la formule. Enregistrez pour appliquer partout.
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
                    {companies.find((c) => c.id === companyId)?.name || "Société"}
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
      </div>
    </div>
  )
  let detailTableColumnCount = 2
  if (view === "current") detailTableColumnCount = 2
  else if (view === "comparison" || view === "ddm" || view === "ytd") {
    if (isComparisonMode) detailTableColumnCount = 1 + entitiesToCompare.length
    else if (columnMode === "percentage") detailTableColumnCount = 4
    else if (columnMode === "variations") detailTableColumnCount = 5
    else detailTableColumnCount = 3
  } else if (view === "12months") detailTableColumnCount = 1 + getMonthLabels().length
  else if (view === "quarters") detailTableColumnCount = 1 + getQuarterLabels().length
  else if (view === "years") detailTableColumnCount = 1 + getYearLabels().length

  if (loading || structureLoading || (isMultiPeriod && seriesLoading) || entityDataLoading) {
    return (
      <div className={cn("w-full", dashboardCardFrameStaticClass)}>
        <div className={dashboardCardRingClass} aria-hidden />
        <div className="relative px-8 py-16 text-center">
          <div className="animate-pulse space-y-4">
            <div className="mx-auto h-4 w-1/3 rounded bg-slate-200" />
            <div className="mx-auto h-4 w-2/3 rounded bg-slate-200" />
            <div className="mx-auto h-4 w-1/2 rounded bg-slate-200" />
          </div>
          <p className={cn("mt-4 text-sm", dashboardCardBodyMutedClass)}>Chargement des données...</p>
        </div>
      </div>
    )
  }

  if (data.length === 0 && !isStructureStudio) {
    return (
      <div className={cn("w-full", dashboardCardFrameStaticClass)}>
        <div className={dashboardCardRingClass} aria-hidden />
        <div className="relative w-full min-w-0">
          {renderCardHeader()}
          <div className="px-8 py-16 text-center">
            <p className={cn("text-sm", dashboardCardBodyMutedClass)}>
              Aucune donnée disponible. Ouvrez <span className="font-medium text-[#2A2F3A]">Paramètres</span> pour configurer la structure du détail, ou importez une balance de vérification.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("w-full", dashboardCardFrameStaticClass)}>
      <div className={dashboardCardRingClass} aria-hidden />
      <div className="relative w-full min-w-0">
        {renderCardHeader()}

        {isStructureStudio ? (
          <StatementStructureStudio
            embedded
            companyId={companyId!}
            statementType="cash-flow-detail"
            hideAnnexColumns
            onSaved={handleStructureSaved}
            onClose={() => setStructureEditMode(false)}
          />
        ) : (
          <>
            <div className="min-w-0 overflow-x-auto bg-white">
              <table className="w-full min-w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100/80">
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 w-2/5 whitespace-nowrap">Poste</th>
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
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des flux totaux</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des flux totaux</th>
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
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des flux totaux</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des flux totaux</th>
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
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des flux totaux</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des flux totaux</th>
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
            {data.map((row, idx) => {
              const variation = row.current && row.prior ? calculateVariation(row.current, row.prior) : null
              const variationAmount = row.current && row.prior ? row.current - row.prior : 0
              const displayLabel = row.label
              const isSpacer = row.label === ""
              const shouldHideAmounts =
                isSpacer || !!row.isSection || row.hasLiaisonCode === false
              const showSeparatorAbove = isTruthySeparatorAbove(row.separatorAbove)
              const isBoldRow = !!row.isBold

              return (
                <Fragment key={`${row.label}-${idx}`}>
                  {showSeparatorAbove && (
                    <tr aria-hidden>
                      <td
                        colSpan={detailTableColumnCount}
                        className="border-0 p-0 align-top leading-none border-t border-t-slate-600"
                      />
                    </tr>
                  )}
                  <tr
                    className={cn(
                      "border-b",
                      isSpacer ? "h-2 border-b border-b-slate-200" : "border-b border-b-slate-200",
                      !isSpacer && "hover:bg-slate-50/90"
                    )}
                  >
                  <td
                    className={cn(
                      "px-6 py-3 whitespace-nowrap",
                      isBoldRow ? "font-bold text-slate-900" : "text-slate-700",
                      row.indent ? "pl-12" : ""
                    )}
                  >
                    {displayLabel}
                  </td>

                  {view === "current" && (
                    <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                      {row.current !== 0 ? formatCurrency(row.current) : "-"}
                    </td>
                  )}

                  {view === "comparison" && !isComparisonMode && (
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
                            {row.current !== 0 ? `${getTotalCashFlowPercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.prior !== 0 ? `${getTotalCashFlowPercentage(row.prior, true).toFixed(1)}%` : "-"}
                          </td>
                        </>
                      ) : null}
                    </>
                  )}
                  {view === "comparison" && isComparisonMode && (
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
                  {view === "ddm" && (
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
                            {row.current !== 0 ? `${getTotalCashFlowPercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.prior !== 0 ? `${getTotalCashFlowPercentage(row.prior, true).toFixed(1)}%` : "-"}
                          </td>
                        </>
                      )}
                    </>
                  )}

                  {view === "ytd" && (
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
                            {row.current !== 0 ? `${getTotalCashFlowPercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.prior !== 0 ? `${getTotalCashFlowPercentage(row.prior, true).toFixed(1)}%` : "-"}
                          </td>
                        </>
                      )}
                    </>
                  )}

                  {/* Trend Views - 12 months, quarters, years */}
                  {view === "12months" && row.trendValues && (
                    <>
                      {row.trendValues.map((value, valueIdx) => (
                        <td
                          key={valueIdx}
                          className={`px-4 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {value !== 0 ? formatCurrency(value) : "-"}
                        </td>
                      ))}
                    </>
                  )}
                  {view === "quarters" && row.trendValues && (
                    <>
                      {row.trendValues.map((value, valueIdx) => (
                        <td
                          key={valueIdx}
                          className={`px-4 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {value !== 0 ? formatCurrency(value) : "-"}
                        </td>
                      ))}
                    </>
                  )}
                  {view === "years" && row.trendValues && (
                    <>
                      {row.trendValues.map((value, valueIdx) => (
                          <td
                            key={valueIdx}
                            className={cn(
                              "px-4 py-3 text-right",
                              isBoldRow ? "font-semibold font-bold" : "text-slate-500",
                              shouldHideAmounts ? "text-white" : "",
                              isForecastSection && valueIdx === 0 ? "bg-slate-50" : ""
                            )}
                          >
                            {value !== 0 ? formatCurrency(value) : "-"}
                          </td>
                      ))}
                    </>
                  )}
                  {/* Empty cells for spacer rows in trend views */}
                  {(view === "12months" || view === "quarters" || view === "years") && !row.trendValues && (
                    <>
                      {Array.from({
                        length:
                          view === "12months" ? 12 : view === "quarters" ? 5 : isForecastSection ? forecastYearColumnCount : 6,
                      }).map((_, idx) => (
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
                </Fragment>
              )
            })}
          </tbody>
        </table>
            </div>

            <div className="border-t border-slate-200 bg-slate-50/90 px-6 py-4 sm:px-7">
              <p className={cn("text-xs", dashboardCardBodyMutedClass)}>
                Note: Les données affichées sont à titre informatif. Consulter les états financiers audités pour les
                montants officiels.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
