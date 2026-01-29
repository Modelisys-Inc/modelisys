"use client"

import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"

interface CashFlowSummaryProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years"
  columnMode?: "variations" | "percentage" | "comparison"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  title?: string
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
}: CashFlowSummaryProps) {
  // Helper function to generate trend data for 12 months
  const get12MonthsData = (): SummaryRow[] => {
    const baseOperating = 450000
    const baseInvesting = -125000
    const baseFinancing = -50000
    const baseNetCashFlow = baseOperating + baseInvesting + baseFinancing

    // Generate 12 months with slight variations showing growth trend
    const generateTrend = (base: number, growthRate: number = 0.02) => {
      return Array.from({ length: 12 }, (_, i) => {
        const monthIndex = 11 - i // Reverse order (oldest to newest)
        return Math.round(base * (1 + growthRate * monthIndex) * (0.95 + Math.random() * 0.1))
      })
    }

    return [
      { label: "flux opérationnels", current: baseOperating, prior: 420000, indent: true, trendValues: generateTrend(baseOperating, 0.025) },
      { label: "flux d'investissement", current: baseInvesting, prior: -150000, indent: true, trendValues: generateTrend(baseInvesting, 0.02) },
      { label: "flux de financement", current: baseFinancing, prior: -30000, indent: true, trendValues: generateTrend(baseFinancing, 0.018) },
      { label: "flux net", current: baseNetCashFlow, prior: 240000, isBold: true, isResult: true, trendValues: generateTrend(baseNetCashFlow, 0.022) },
    ]
  }

  // Helper function to generate trend data for quarters
  const getQuartersData = (): SummaryRow[] => {
    const baseOperating = 1350000
    const baseInvesting = -375000
    const baseFinancing = -150000
    const baseNetCashFlow = baseOperating + baseInvesting + baseFinancing

    const generateTrend = (base: number, growthRate: number = 0.03) => {
      return Array.from({ length: 5 }, (_, i) => {
        const quarterIndex = 4 - i
        return Math.round(base * (1 + growthRate * quarterIndex) * (0.97 + Math.random() * 0.06))
      })
    }

    return [
      { label: "flux opérationnels", current: baseOperating, prior: 1260000, indent: true, trendValues: generateTrend(baseOperating, 0.04) },
      { label: "flux d'investissement", current: baseInvesting, prior: -450000, indent: true, trendValues: generateTrend(baseInvesting, 0.03) },
      { label: "flux de financement", current: baseFinancing, prior: -90000, indent: true, trendValues: generateTrend(baseFinancing, 0.025) },
      { label: "flux net", current: baseNetCashFlow, prior: 720000, isBold: true, isResult: true, trendValues: generateTrend(baseNetCashFlow, 0.035) },
    ]
  }

  // Helper function to generate trend data for years
  const getYearsData = (): SummaryRow[] => {
    const baseOperating = 5400000
    const baseInvesting = -1500000
    const baseFinancing = -600000
    const baseNetCashFlow = baseOperating + baseInvesting + baseFinancing

    const generateTrend = (base: number, growthRate: number = 0.05) => {
      return Array.from({ length: 6 }, (_, i) => {
        const yearIndex = 5 - i
        return Math.round(base * (1 + growthRate * yearIndex) * (0.95 + Math.random() * 0.1))
      })
    }

    return [
      { label: "flux opérationnels", current: baseOperating, prior: 5040000, indent: true, trendValues: generateTrend(baseOperating, 0.06) },
      { label: "flux d'investissement", current: baseInvesting, prior: -1800000, indent: true, trendValues: generateTrend(baseInvesting, 0.05) },
      { label: "flux de financement", current: baseFinancing, prior: -360000, indent: true, trendValues: generateTrend(baseFinancing, 0.04) },
      { label: "flux net", current: baseNetCashFlow, prior: 2880000, isBold: true, isResult: true, trendValues: generateTrend(baseNetCashFlow, 0.055) },
    ]
  }

  const getSummaryData = (): SummaryRow[] => {
    // Return trend data for trend views
    if (view === "12months") {
      return get12MonthsData()
    }
    if (view === "quarters") {
      return getQuartersData()
    }
    if (view === "years") {
      return getYearsData()
    }
    if (period === "monthly") {
      return [
        { label: "flux opérationnels", current: 450000, prior: 420000, indent: true },
        { label: "flux d'investissement", current: -125000, prior: -150000, indent: true },
        { label: "flux de financement", current: -50000, prior: -30000, indent: true },
        { label: "flux net", current: 275000, prior: 240000, isBold: true, isResult: true },
      ]
    } else if (period === "quarterly") {
      return [
        { label: "flux opérationnels", current: 1350000, prior: 1260000, indent: true },
        { label: "flux d'investissement", current: -375000, prior: -450000, indent: true },
        { label: "flux de financement", current: -150000, prior: -90000, indent: true },
        { label: "flux net", current: 825000, prior: 720000, isBold: true, isResult: true },
      ]
    } else {
      return [
        { label: "flux opérationnels", current: 5400000, prior: 5040000, indent: true },
        { label: "flux d'investissement", current: -1500000, prior: -1800000, indent: true },
        { label: "flux de financement", current: -600000, prior: -360000, indent: true },
        { label: "flux net", current: 3300000, prior: 2880000, isBold: true, isResult: true },
      ]
    }
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

  const data = getSummaryData()
  
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

  // Helper function to generate month labels (12 months)
  const getMonthLabels = (): string[] => {
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
    const currentDate = new Date()
    const labels: string[] = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      labels.push(`${months[date.getMonth()]} ${date.getFullYear()}`)
    }
    return labels
  }

  // Helper function to generate quarter labels (5 quarters)
  const getQuarterLabels = (): string[] => {
    const currentDate = new Date()
    const labels: string[] = []
    for (let i = 4; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i * 3, 1)
      const quarter = Math.floor(date.getMonth() / 3) + 1
      labels.push(`T${quarter} ${date.getFullYear()}`)
    }
    return labels
  }

  // Helper function to generate year labels (6 years)
  const getYearLabels = (): string[] => {
    const currentYear = new Date().getFullYear()
    const labels: string[] = []
    for (let i = 5; i >= 0; i--) {
      labels.push(`${currentYear - i}`)
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

  return (
    <div className="w-full bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
      {/* Header */}
      <div className="bg-white px-8 py-5 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">Sommaire</h2>
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
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Passé</th>
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
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Passé</th>
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

