"use client"

import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"

interface BalanceSheetSummaryProps {
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

export function BalanceSheetSummary({
  period,
  view,
  columnMode = "variations",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  title,
}: BalanceSheetSummaryProps) {
  // Helper function to generate trend data for 12 months
  const get12MonthsData = (): SummaryRow[] => {
    const baseCurrentAssets = 850000
    const baseNonCurrentAssets = 1200000
    const baseTotalAssets = 2050000
    const baseCurrentLiabilities = 450000
    const baseNonCurrentLiabilities = 600000
    const baseTotalLiabilities = 1050000
    const baseEquity = 1000000

    // Generate 12 months with slight variations showing growth trend
    const generateTrend = (base: number, growthRate: number = 0.02) => {
      return Array.from({ length: 12 }, (_, i) => {
        const monthIndex = 11 - i // Reverse order (oldest to newest)
        return Math.round(base * (1 + growthRate * monthIndex) * (0.95 + Math.random() * 0.1))
      })
    }

    return [
      { label: "actifs", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "actifs courants", current: baseCurrentAssets, prior: 750000, isBold: true, isSection: true, indent: true, trendValues: generateTrend(baseCurrentAssets, 0.025) },
      { label: "actifs non courants", current: baseNonCurrentAssets, prior: 1100000, isBold: true, isSection: true, indent: true, trendValues: generateTrend(baseNonCurrentAssets, 0.02) },
      { label: "total des actifs", current: baseTotalAssets, prior: 1850000, isBold: true, isResult: true, trendValues: generateTrend(baseTotalAssets, 0.022) },
      { label: "", current: 0, prior: 0 },
      { label: "passifs", current: 0, prior: 0, isSection: true },
      { label: "passifs courants", current: baseCurrentLiabilities, prior: 420000, isBold: true, indent: true, trendValues: generateTrend(baseCurrentLiabilities, 0.018) },
      { label: "passifs non courants", current: baseNonCurrentLiabilities, prior: 580000, isBold: true, indent: true, trendValues: generateTrend(baseNonCurrentLiabilities, 0.02) },
      { label: "total des passifs", current: baseTotalLiabilities, prior: 1000000, isBold: true, trendValues: generateTrend(baseTotalLiabilities, 0.019) },
      { label: "", current: 0, prior: 0 },
      { label: "capitaux propres", current: baseEquity, prior: 850000, isBold: true, isResult: true, trendValues: generateTrend(baseEquity, 0.025) },
      { label: "total passifs et capitaux propres", current: baseTotalAssets, prior: 1850000, isBold: true, isResult: true, trendValues: generateTrend(baseTotalAssets, 0.022) },
    ]
  }

  // Helper function to generate trend data for quarters
  const getQuartersData = (): SummaryRow[] => {
    const baseCurrentAssets = 2550000
    const baseNonCurrentAssets = 3600000
    const baseTotalAssets = 6150000
    const baseCurrentLiabilities = 1350000
    const baseNonCurrentLiabilities = 1800000
    const baseTotalLiabilities = 3150000
    const baseEquity = 3000000

    const generateTrend = (base: number, growthRate: number = 0.03) => {
      return Array.from({ length: 5 }, (_, i) => {
        const quarterIndex = 4 - i
        return Math.round(base * (1 + growthRate * quarterIndex) * (0.97 + Math.random() * 0.06))
      })
    }

    return [
      { label: "actifs", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "actifs courants", current: baseCurrentAssets, prior: 2250000, isBold: true, isSection: true, indent: true, trendValues: generateTrend(baseCurrentAssets, 0.04) },
      { label: "actifs non courants", current: baseNonCurrentAssets, prior: 3300000, isBold: true, isSection: true, indent: true, trendValues: generateTrend(baseNonCurrentAssets, 0.03) },
      { label: "total des actifs", current: baseTotalAssets, prior: 5550000, isBold: true, isResult: true, trendValues: generateTrend(baseTotalAssets, 0.035) },
      { label: "", current: 0, prior: 0 },
      { label: "passifs", current: 0, prior: 0, isSection: true },
      { label: "passifs courants", current: baseCurrentLiabilities, prior: 1260000, isBold: true, indent: true, trendValues: generateTrend(baseCurrentLiabilities, 0.025) },
      { label: "passifs non courants", current: baseNonCurrentLiabilities, prior: 1740000, isBold: true, indent: true, trendValues: generateTrend(baseNonCurrentLiabilities, 0.03) },
      { label: "total des passifs", current: baseTotalLiabilities, prior: 3000000, isBold: true, trendValues: generateTrend(baseTotalLiabilities, 0.027) },
      { label: "", current: 0, prior: 0 },
      { label: "capitaux propres", current: baseEquity, prior: 2550000, isBold: true, isResult: true, trendValues: generateTrend(baseEquity, 0.045) },
      { label: "total passifs et capitaux propres", current: baseTotalAssets, prior: 5550000, isBold: true, isResult: true, trendValues: generateTrend(baseTotalAssets, 0.035) },
    ]
  }

  // Helper function to generate trend data for years
  const getYearsData = (): SummaryRow[] => {
    const baseCurrentAssets = 10200000
    const baseNonCurrentAssets = 14400000
    const baseTotalAssets = 24600000
    const baseCurrentLiabilities = 5400000
    const baseNonCurrentLiabilities = 7200000
    const baseTotalLiabilities = 12600000
    const baseEquity = 12000000

    const generateTrend = (base: number, growthRate: number = 0.05) => {
      return Array.from({ length: 6 }, (_, i) => {
        const yearIndex = 5 - i
        return Math.round(base * (1 + growthRate * yearIndex) * (0.95 + Math.random() * 0.1))
      })
    }

    return [
      { label: "actifs", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "actifs courants", current: baseCurrentAssets, prior: 9000000, isBold: true, isSection: true, indent: true, trendValues: generateTrend(baseCurrentAssets, 0.06) },
      { label: "actifs non courants", current: baseNonCurrentAssets, prior: 13200000, isBold: true, isSection: true, indent: true, trendValues: generateTrend(baseNonCurrentAssets, 0.05) },
      { label: "total des actifs", current: baseTotalAssets, prior: 22200000, isBold: true, isResult: true, trendValues: generateTrend(baseTotalAssets, 0.055) },
      { label: "", current: 0, prior: 0 },
      { label: "passifs", current: 0, prior: 0, isSection: true },
      { label: "passifs courants", current: baseCurrentLiabilities, prior: 5040000, isBold: true, indent: true, trendValues: generateTrend(baseCurrentLiabilities, 0.04) },
      { label: "passifs non courants", current: baseNonCurrentLiabilities, prior: 6960000, isBold: true, indent: true, trendValues: generateTrend(baseNonCurrentLiabilities, 0.05) },
      { label: "total des passifs", current: baseTotalLiabilities, prior: 12000000, isBold: true, trendValues: generateTrend(baseTotalLiabilities, 0.045) },
      { label: "", current: 0, prior: 0 },
      { label: "capitaux propres", current: baseEquity, prior: 10200000, isBold: true, isResult: true, trendValues: generateTrend(baseEquity, 0.065) },
      { label: "total passifs et capitaux propres", current: baseTotalAssets, prior: 22200000, isBold: true, isResult: true, trendValues: generateTrend(baseTotalAssets, 0.055) },
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
        { label: "actifs", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "actifs courants", current: 850000, prior: 750000, isBold: true, isSection: true, indent: true },
        { label: "actifs non courants", current: 1200000, prior: 1100000, isBold: true, isSection: true, indent: true },
        { label: "total des actifs", current: 2050000, prior: 1850000, isBold: true, isResult: true },
        { label: "", current: 0, prior: 0 },
        { label: "passifs", current: 0, prior: 0, isSection: true },
        { label: "passifs courants", current: 450000, prior: 420000, isBold: true, indent: true },
        { label: "passifs non courants", current: 600000, prior: 580000, isBold: true, indent: true },
        { label: "total des passifs", current: 1050000, prior: 1000000, isBold: true },
        { label: "", current: 0, prior: 0 },
        { label: "capitaux propres", current: 1000000, prior: 850000, isBold: true, isResult: true },
        { label: "total passifs et capitaux propres", current: 2050000, prior: 1850000, isBold: true, isResult: true },
      ]
    } else if (period === "quarterly") {
      return [
        { label: "actifs", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "actifs courants", current: 2550000, prior: 2250000, isBold: true, isSection: true, indent: true },
        { label: "actifs non courants", current: 3600000, prior: 3300000, isBold: true, isSection: true, indent: true },
        { label: "total des actifs", current: 6150000, prior: 5550000, isBold: true, isResult: true },
        { label: "", current: 0, prior: 0 },
        { label: "passifs", current: 0, prior: 0, isSection: true },
        { label: "passifs courants", current: 1350000, prior: 1260000, isBold: true, indent: true },
        { label: "passifs non courants", current: 1800000, prior: 1740000, isBold: true, indent: true },
        { label: "total des passifs", current: 3150000, prior: 3000000, isBold: true },
        { label: "", current: 0, prior: 0 },
        { label: "capitaux propres", current: 3000000, prior: 2550000, isBold: true, isResult: true },
        { label: "total passifs et capitaux propres", current: 6150000, prior: 5550000, isBold: true, isResult: true },
      ]
    } else {
      return [
        { label: "actifs", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "actifs courants", current: 10200000, prior: 9000000, isBold: true, isSection: true, indent: true },
        { label: "actifs non courants", current: 14400000, prior: 13200000, isBold: true, isSection: true, indent: true },
        { label: "total des actifs", current: 24600000, prior: 22200000, isBold: true, isResult: true },
        { label: "", current: 0, prior: 0 },
        { label: "passifs", current: 0, prior: 0, isSection: true },
        { label: "passifs courants", current: 5400000, prior: 5040000, isBold: true, indent: true },
        { label: "passifs non courants", current: 7200000, prior: 6960000, isBold: true, indent: true },
        { label: "total des passifs", current: 12600000, prior: 12000000, isBold: true },
        { label: "", current: 0, prior: 0 },
        { label: "capitaux propres", current: 12000000, prior: 10200000, isBold: true, isResult: true },
        { label: "total passifs et capitaux propres", current: 24600000, prior: 22200000, isBold: true, isResult: true },
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
      "actifs",
      "total des actifs",
      "passifs",
      "total des passifs",
      "capitaux propres",
      "total passifs et capitaux propres"
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
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Passé</th>
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
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">YTD 2024</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">YTD 2023</th>
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
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => {
              const variation = row.current && row.prior ? calculateVariation(row.current, row.prior) : null
              const variationAmount = row.current && row.prior ? row.current - row.prior : 0
              const isBoldRow = shouldBeBold(row.label, row)
              const displayLabel = row.label ? capitalizeFirst(row.label) : ""
              const isSpacer = row.label === ""
              const sectionExceptions = ["actifs courants", "actifs non courants"]
              const isSectionException = sectionExceptions.includes(row.label.toLowerCase())
              const shouldHideAmounts =
                isSpacer || (!isSectionException && !!row.isSection) || row.label.toLowerCase() === "actifs" || row.label.toLowerCase() === "passifs"
              
              // Check if next row is a key result line
              const nextRow = idx < data.length - 1 ? data[idx + 1] : null
              const nextRowLabel = nextRow?.label?.toLowerCase() || ""
              const nextRowIsKeyResult = nextRow && (
                (nextRow.isResult && nextRowLabel !== "capitaux propres") || 
                nextRowLabel === "total des passifs"
              )

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
                            {row.current !== 0 ? `${getTotalAssetsPercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.prior !== 0 ? `${getTotalAssetsPercentage(row.prior, true).toFixed(1)}%` : "-"}
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
                      <td className={`px-6 py-3 text-right font-semibold ${isBoldRow ? "font-bold" : ""} ${shouldHideAmounts ? "text-white" : ""}`}>
                        {row.current !== 0 ? formatCurrency(row.current) : "-"}
                      </td>
                      <td className={`px-6 py-3 text-right font-semibold ${isBoldRow ? "font-bold text-slate-500" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
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
                          <td className={`px-6 py-3 text-right font-semibold ${isBoldRow ? "font-bold" : ""} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.current !== 0 ? `${getTotalAssetsPercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right font-semibold ${isBoldRow ? "font-bold text-slate-500" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.prior !== 0 ? `${getTotalAssetsPercentage(row.prior, true).toFixed(1)}%` : "-"}
                          </td>
                        </>
                      )}
                    </>
                  )}

                  {view === "ytd" && (
                    <>
                      <td className={`px-6 py-3 text-right font-semibold ${isBoldRow ? "font-bold" : ""} ${shouldHideAmounts ? "text-white" : ""}`}>
                        {row.current !== 0 ? formatCurrency(row.current) : "-"}
                      </td>
                      <td className={`px-6 py-3 text-right font-semibold ${isBoldRow ? "font-bold text-slate-500" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
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
                          <td className={`px-6 py-3 text-right font-semibold ${isBoldRow ? "font-bold" : ""} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.current !== 0 ? `${getTotalAssetsPercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right font-semibold ${isBoldRow ? "font-bold text-slate-500" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.prior !== 0 ? `${getTotalAssetsPercentage(row.prior, true).toFixed(1)}%` : "-"}
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
                          className={`px-4 py-3 text-right font-semibold ${isBoldRow ? "font-bold" : ""} ${shouldHideAmounts ? "text-white" : ""}`}
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
                          className={`px-4 py-3 text-right font-semibold ${isBoldRow ? "font-bold" : ""} ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {value !== 0 ? formatCurrency(value) : "-"}
                        </td>
                      ))}
                    </>
                  )}
                  {view === "years" && row.trendValues && (
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
                  {/* Empty cells for spacer rows in trend views */}
                  {(view === "12months" || view === "quarters" || view === "years") && !row.trendValues && (
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

