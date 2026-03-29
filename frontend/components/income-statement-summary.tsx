"use client"

import { useState, useEffect } from "react"
import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import type { FinancialStatementRow } from "@/lib/api"
import { getFinancialStatementSeries, type FinancialStatementSeriesParams } from "@/lib/api"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { getRowAmounts, getPeriodLabels, aggregateToQuarters, aggregateToYears } from "@/lib/series-utils"

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
}: IncomeStatementSummaryProps) {
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
    return seriesRows.map((row) => {
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
  }, [isComparisonMode, companies, companyId, divisionId, isCompanyComparison, isDivisionComparison, isSubDivisionComparison, fiscalYear])

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

  if (loading || (seriesLoading && isMultiPeriodView && !isForecastSection) || entityDataLoading) {
    return (
      <div className="w-full bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
        <div className="px-8 py-16 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/3 mx-auto"></div>
            <div className="h-4 bg-slate-200 rounded w-2/3 mx-auto"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto"></div>
          </div>
          <p className="text-sm text-slate-500 mt-4">Chargement des données...</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="w-full bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
        <div className="px-8 py-16 text-center">
          <p className="text-sm text-slate-500">Aucune donnée disponible. Veuillez importer une balance de vérification et configurer la structure des états financiers.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
      {/* Header */}
      <div className="bg-white px-8 py-5 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">{title || "Sommaire"}</h2>
              <div className="flex items-center gap-3 text-sm text-slate-700 flex-wrap">
                <span className="font-medium">{getHorizonText()}</span>
                <span className="text-slate-400">•</span>
                {subDivisionId && divisionId && companyId ? (
                  <>
                    <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                    <span className="text-slate-400">•</span>
                    <span>{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name || "Division"}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-emerald-600 font-semibold">{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.subDivisions.find((sd) => sd.id === subDivisionId)?.name || "Sous-division"}</span>
                  </>
                ) : divisionId && companyId ? (
                  <>
                    <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-emerald-600 font-semibold">{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name || "Division"}</span>
                  </>
                ) : companyId ? (
                  <span className="text-emerald-600 font-semibold">{companies.find((c) => c.id === companyId)?.name || "Société sélectionnée"}</span>
                ) : (
                  <span className="truncate">Toutes les sociétés</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
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
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des revenus</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des revenus</th>
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
              {view === "ddm" && !isComparisonMode && (
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
              {view === "ddm" && isComparisonMode && (
                <>
                  {entitiesToCompare.map((entity) => (
                    <th key={entity.id} className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">
                      {entity.name}
                    </th>
                  ))}
                </>
              )}
              {view === "ytd" && !isComparisonMode && (
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
              {view === "ytd" && isComparisonMode && (
                <>
                  {entitiesToCompare.map((entity) => (
                    <th key={entity.id} className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">
                      {entity.name}
                    </th>
                  ))}
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
              {view === "24months" && (
                <>
                  {getMonthLabels(24).map((label, idx) => (
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
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => {
              const variation = row.current && row.prior ? calculateVariation(row.current, row.prior) : null
              const variationAmount = row.current && row.prior ? row.current - row.prior : 0
              const isBoldRow = shouldBeBold(row.label, row)
              const displayLabel = row.label ? capitalizeFirst(row.label) : ""
              const isSpacer = row.label === ""
              const sectionExceptions = ["revenus", "coût des produits vendus"]
              const isSectionException = sectionExceptions.includes(row.label.toLowerCase())
              const shouldHideAmounts =
                isSpacer || (!isSectionException && !!row.isSection) || row.label.toLowerCase() === "charges d'exploitation"
              
              // Check if next row is a key result line (Bénéfice brut, Total des charges, Bénéfice net)
              // But NOT "Bénéfice avant impôts"
              const nextRow = idx < data.length - 1 ? data[idx + 1] : null
              const nextRowLabel = nextRow?.label?.toLowerCase() || ""
              const nextRowIsKeyResult = nextRow && (
                (nextRow.isResult && nextRowLabel !== "bénéfice avant impôts") || 
                nextRow.isNetIncome || 
                nextRowLabel === "total des charges"
              )

              return (
                <tr key={idx} className={cn(
                  "border-b",
                  row.label === "" ? "h-2 border-slate-200" : "",
                  nextRowIsKeyResult ? "border-slate-900 border-b-2" : "border-slate-200"
                )}>
                  <td className={`px-6 py-3 ${isBoldRow ? "font-bold text-slate-900" : "text-slate-700"} ${row.indent ? "pl-12" : ""} ${row.isMargin ? "italic" : ""}`}>
                    {displayLabel}
                  </td>

                  {view === "current" && (
                    <td className={`px-6 py-3 text-right ${row.isMargin ? "italic" : (isBoldRow ? "font-semibold font-bold" : "text-slate-500")} ${shouldHideAmounts ? "text-white" : ""}`}>
                      {row.isMargin 
                        ? (row.current !== 0 ? `${row.current.toFixed(1)}%` : "-")
                        : (row.current !== 0 ? formatCurrency(row.current) : "-")
                      }
                    </td>
                  )}

                  {view === "comparison" && !isComparisonMode && (
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
                  {view === "ddm" && !isComparisonMode && (
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
                  {view === "ddm" && isComparisonMode && (
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

                  {view === "ytd" && !isComparisonMode && (
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
                  {view === "ytd" && isComparisonMode && (
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
                  {view === "12months" && row.trendValues && (
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
                  {view === "quarters" && row.trendValues && (
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
                  {view === "years" && row.trendValues && (
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
                  {(view === "12months" || view === "24months" || view === "quarters" || view === "years") && !row.trendValues && (
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
      <div className="bg-slate-50 px-8 py-4 border-t border-slate-200">
        <p className="text-xs text-slate-600">Note: BAIIA = Bénéfice avant intérêts, impôts et amortissement</p>
      </div>
    </div>
  )
}
