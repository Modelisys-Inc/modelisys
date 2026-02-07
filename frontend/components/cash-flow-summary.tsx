"use client"

import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import type { FinancialStatementRow } from "@/lib/api"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { getRowAmounts, getPeriodLabels, aggregateToQuarters, aggregateToYears } from "@/lib/series-utils"

interface CashFlowSummaryProps {
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
}

interface SummaryRow {
  label: string
  current: number
  prior: number
  isBold?: boolean
  isSection?: boolean
  isResult?: boolean
  indent?: boolean
  // For trend views (12months, quarters, years)
  trendValues?: number[]
}

export function CashFlowSummary({
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
}: CashFlowSummaryProps) {
  // Series data for multi-period views
  const isMultiPeriod = view === "12months" || view === "quarters" || view === "years"
  const currentYear = fiscalYear || new Date().getFullYear()
  const monthsNeeded = view === "years" ? 60 : 12

  const { rows: seriesRows, periods, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "cash-flow",
    fiscalYear: currentYear,
    months: monthsNeeded,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: isMultiPeriod,
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
      indent: !row.isBold && !row.isSection && !row.isResult,
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
      "flux net"
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
        values = aggregateToQuarters(rawAmounts, periods).amounts
      } else if (view === "years") {
        values = aggregateToYears(rawAmounts, periods).amounts
      } else {
        values = rawAmounts
      }

      return {
        label: row.label,
        current: values[values.length - 1] || 0,
        prior: values[values.length - 2] || 0,
        isBold: row.isBold,
        isSection: row.isSection,
        isResult: row.isResult,
        indent: !row.isBold && !row.isSection && !row.isResult,
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
  
  // Generate data for each entity in comparison mode
  const getEntityData = (entityIndex: number, baseData: SummaryRow[]): SummaryRow[] => {
    // Create variation multiplier based on entity index (0.8 to 1.2 range)
    const multiplier = 0.8 + (entityIndex * 0.2)
    return baseData.map((row) => ({
      ...row,
      current: Math.round(row.current * multiplier),
      prior: Math.round(row.prior * multiplier),
      trendValues: row.trendValues?.map((val) => Math.round(val * multiplier)),
    }))
  }
  
  // Find total cash flow value for percentage calculations
  const totalCashFlowRow = data.find((row) => row.label.toLowerCase() === "flux net")
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
    if (periods.length > 0) return getPeriodLabels(periods)
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
    const cd = new Date()
    const labels: string[] = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date(cd.getFullYear(), cd.getMonth() - i, 1)
      labels.push(`${months[date.getMonth()]} ${date.getFullYear()}`)
    }
    return labels
  }

  // Helper function to generate quarter labels from series data or fallback
  const getQuarterLabels = (): string[] => {
    if (periods.length > 0 && seriesRows.length > 0) {
      const rawAmounts = getRowAmounts(seriesRows[0], periods)
      return aggregateToQuarters(rawAmounts, periods).labels
    }
    const cd = new Date()
    const labels: string[] = []
    for (let i = 4; i >= 0; i--) {
      const date = new Date(cd.getFullYear(), cd.getMonth() - i * 3, 1)
      const quarter = Math.floor(date.getMonth() / 3) + 1
      labels.push(`T${quarter} ${date.getFullYear()}`)
    }
    return labels
  }

  // Helper function to generate year labels from series data or fallback
  const getYearLabels = (): string[] => {
    if (periods.length > 0 && seriesRows.length > 0) {
      const rawAmounts = getRowAmounts(seriesRows[0], periods)
      return aggregateToYears(rawAmounts, periods).labels
    }
    const cy = new Date().getFullYear()
    const labels: string[] = []
    for (let i = 5; i >= 0; i--) {
      labels.push(`${cy - i}`)
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
    if (view === "quarters") return "Trimestres"
    if (view === "years") return "Années"
    return "Courant"
  }

  if (loading || (isMultiPeriod && seriesLoading)) {
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
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">YTD 2024</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">YTD 2023</th>
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
              const shouldHideAmounts = isSpacer || !!row.isSection
              
              // Check if next row is a key result line
              const nextRow = idx < data.length - 1 ? data[idx + 1] : null
              const nextRowLabel = nextRow?.label?.toLowerCase() || ""
              const nextRowIsKeyResult = nextRow && nextRow.isResult

              return (
                <tr key={idx} className={cn(
                  "border-b",
                  row.label === "" ? "h-2 border-slate-200" : "",
                  nextRowIsKeyResult ? "border-slate-900 border-b-2" : "border-slate-200"
                )}>
                  <td className={`px-6 py-3 ${isBoldRow ? "font-bold text-slate-900" : "text-slate-700"} ${row.indent ? "pl-12" : ""}`}>
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
                      {entitiesToCompare.map((entity, entityIdx) => {
                        const entityData = getEntityData(entityIdx, [row])[0]
                        // In comparison mode, always show currency
                        return (
                          <td
                            key={entity.id}
                            className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}
                          >
                            {entityData.current !== 0 ? formatCurrency(entityData.current) : "-"}
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
                      {row.trendValues.map((value, valueIdx) => {
                        const isForecastSection = title === "Flux de trésorerie pro forma"
                        return (
                          <td
                            key={valueIdx}
                            className={cn(
                              "px-4 py-3 text-right",
                              isBoldRow ? "font-semibold font-bold" : "text-slate-500",
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
                  {/* Empty cells for spacer rows in trend views */}
                  {(view === "12months" || view === "quarters" || view === "years") && !row.trendValues && (
                    <>
                      {Array.from({ length: view === "12months" ? 12 : view === "quarters" ? 5 : 6 }).map((_, idx) => {
                        const isForecastSection = title === "Flux de trésorerie pro forma"
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
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div className="bg-slate-50 px-8 py-4 border-t border-slate-200">
        <p className="text-xs text-slate-500">Note: Les données affichées sont à titre informatif. Consulter les états financiers audités pour les montants officiels.</p>
      </div>
    </div>
  )
}

