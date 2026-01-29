"use client"

import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"

interface CashFlowDetailProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years"
  columnMode?: "variations" | "percentage" | "comparison"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  title?: string
}

interface DetailRow {
  label: string
  current: number
  prior: number
  indent?: boolean
  isBold?: boolean
  isSubtotal?: boolean
  isSection?: boolean
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
  title,
}: CashFlowDetailProps) {
  // Helper function to generate trend data for 12 months
  const get12MonthsData = (): DetailRow[] => {
    const generateTrend = (base: number, growthRate: number = 0.02) => {
      return Array.from({ length: 12 }, (_, i) => {
        const monthIndex = 11 - i
        return Math.round(base * (1 + growthRate * monthIndex) * (0.95 + Math.random() * 0.1))
      })
    }

    return [
      { label: "FLUX OPÉRATIONNELS", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Bénéfice net", current: 380000, prior: 350000, indent: true, trendValues: generateTrend(380000, 0.025) },
      { label: "Amortissement", current: 120000, prior: 110000, indent: true, trendValues: generateTrend(120000, 0.02) },
      { label: "Variation des éléments hors trésorerie", current: 0, prior: 0, isSection: true },
      { label: "Variation des comptes clients", current: -50000, prior: -40000, indent: true, trendValues: generateTrend(-50000, 0.02) },
      { label: "Variation des stocks", current: -20000, prior: -15000, indent: true, trendValues: generateTrend(-20000, 0.02) },
      { label: "Variation des comptes fournisseurs", current: 20000, prior: 15000, indent: true, trendValues: generateTrend(20000, 0.02) },
      { label: "Variation des autres actifs courants", current: -10000, prior: -8000, indent: true, trendValues: generateTrend(-10000, 0.02) },
      { label: "Variation des autres passifs courants", current: 10000, prior: 8000, indent: true, trendValues: generateTrend(10000, 0.02) },
      { label: "Total Flux opérationnels", current: 450000, prior: 420000, isBold: true, isSubtotal: true, trendValues: generateTrend(450000, 0.025) },
      { label: "", current: 0, prior: 0 },
      { label: "FLUX D'INVESTISSEMENT", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Achat d'immobilisations", current: -150000, prior: -180000, indent: true, trendValues: generateTrend(-150000, 0.02) },
      { label: "Vente d'immobilisations", current: 25000, prior: 30000, indent: true, trendValues: generateTrend(25000, 0) },
      { label: "Total Flux d'investissement", current: -125000, prior: -150000, isBold: true, isSubtotal: true, trendValues: generateTrend(-125000, 0.02) },
      { label: "", current: 0, prior: 0 },
      { label: "FLUX DE FINANCEMENT", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Emprunts", current: 100000, prior: 80000, indent: true, trendValues: generateTrend(100000, 0.02) },
      { label: "Remboursements", current: -150000, prior: -110000, indent: true, trendValues: generateTrend(-150000, 0.02) },
      { label: "Total Flux de financement", current: -50000, prior: -30000, isBold: true, isSubtotal: true, trendValues: generateTrend(-50000, 0.018) },
      { label: "", current: 0, prior: 0 },
      { label: "Flux de trésorerie au début", current: 850000, prior: 800000, isBold: true, isSubtotal: true, trendValues: generateTrend(850000, 0.02) },
      { label: "Variation de trésorerie", current: 275000, prior: 240000, isSubtotal: true, trendValues: generateTrend(275000, 0.022) },
      { label: "Flux de trésorerie à la fin", current: 1125000, prior: 1040000, isBold: true, isSubtotal: true, trendValues: generateTrend(1125000, 0.022) },
    ]
  }

  // Helper function to generate trend data for quarters
  const getQuartersData = (): DetailRow[] => {
    const generateTrend = (base: number, growthRate: number = 0.03) => {
      return Array.from({ length: 5 }, (_, i) => {
        const quarterIndex = 4 - i
        return Math.round(base * (1 + growthRate * quarterIndex) * (0.97 + Math.random() * 0.06))
      })
    }

    return [
      { label: "FLUX OPÉRATIONNELS", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Bénéfice net", current: 1140000, prior: 1050000, indent: true, trendValues: generateTrend(1140000, 0.04) },
      { label: "Amortissement", current: 360000, prior: 330000, indent: true, trendValues: generateTrend(360000, 0.03) },
      { label: "Variation des éléments hors trésorerie", current: 0, prior: 0, isSection: true },
      { label: "Variation des comptes clients", current: -150000, prior: -120000, indent: true, trendValues: generateTrend(-150000, 0.03) },
      { label: "Variation des stocks", current: -60000, prior: -45000, indent: true, trendValues: generateTrend(-60000, 0.03) },
      { label: "Variation des comptes fournisseurs", current: 60000, prior: 45000, indent: true, trendValues: generateTrend(60000, 0.03) },
      { label: "Variation des autres actifs courants", current: -30000, prior: -24000, indent: true, trendValues: generateTrend(-30000, 0.03) },
      { label: "Variation des autres passifs courants", current: 30000, prior: 24000, indent: true, trendValues: generateTrend(30000, 0.03) },
      { label: "Total Flux opérationnels", current: 1350000, prior: 1260000, isBold: true, isSubtotal: true, trendValues: generateTrend(1350000, 0.04) },
      { label: "", current: 0, prior: 0 },
      { label: "FLUX D'INVESTISSEMENT", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Achat d'immobilisations", current: -450000, prior: -540000, indent: true, trendValues: generateTrend(-450000, 0.03) },
      { label: "Vente d'immobilisations", current: 75000, prior: 90000, indent: true, trendValues: generateTrend(75000, 0) },
      { label: "Total Flux d'investissement", current: -375000, prior: -450000, isBold: true, isSubtotal: true, trendValues: generateTrend(-375000, 0.03) },
      { label: "", current: 0, prior: 0 },
      { label: "FLUX DE FINANCEMENT", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Emprunts", current: 300000, prior: 240000, indent: true, trendValues: generateTrend(300000, 0.025) },
      { label: "Remboursements", current: -450000, prior: -330000, indent: true, trendValues: generateTrend(-450000, 0.025) },
      { label: "Total Flux de financement", current: -150000, prior: -90000, isBold: true, isSubtotal: true, trendValues: generateTrend(-150000, 0.025) },
      { label: "", current: 0, prior: 0 },
      { label: "Flux de trésorerie au début", current: 2550000, prior: 2400000, isBold: true, isSubtotal: true, trendValues: generateTrend(2550000, 0.03) },
      { label: "Variation de trésorerie", current: 825000, prior: 720000, isSubtotal: true, trendValues: generateTrend(825000, 0.035) },
      { label: "Flux de trésorerie à la fin", current: 3375000, prior: 3120000, isBold: true, isSubtotal: true, trendValues: generateTrend(3375000, 0.035) },
    ]
  }

  // Helper function to generate trend data for years
  const getYearsData = (): DetailRow[] => {
    const generateTrend = (base: number, growthRate: number = 0.05) => {
      return Array.from({ length: 6 }, (_, i) => {
        const yearIndex = 5 - i
        return Math.round(base * (1 + growthRate * yearIndex) * (0.95 + Math.random() * 0.1))
      })
    }

    return [
      { label: "FLUX OPÉRATIONNELS", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Bénéfice net", current: 4560000, prior: 4200000, indent: true, trendValues: generateTrend(4560000, 0.06) },
      { label: "Amortissement", current: 1440000, prior: 1320000, indent: true, trendValues: generateTrend(1440000, 0.05) },
      { label: "Variation des éléments hors trésorerie", current: 0, prior: 0, isSection: true },
      { label: "Variation des comptes clients", current: -600000, prior: -480000, indent: true, trendValues: generateTrend(-600000, 0.05) },
      { label: "Variation des stocks", current: -240000, prior: -180000, indent: true, trendValues: generateTrend(-240000, 0.05) },
      { label: "Variation des comptes fournisseurs", current: 240000, prior: 180000, indent: true, trendValues: generateTrend(240000, 0.05) },
      { label: "Variation des autres actifs courants", current: -120000, prior: -96000, indent: true, trendValues: generateTrend(-120000, 0.05) },
      { label: "Variation des autres passifs courants", current: 120000, prior: 96000, indent: true, trendValues: generateTrend(120000, 0.05) },
      { label: "Total Flux opérationnels", current: 5400000, prior: 5040000, isBold: true, isSubtotal: true, trendValues: generateTrend(5400000, 0.06) },
      { label: "", current: 0, prior: 0 },
      { label: "FLUX D'INVESTISSEMENT", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Achat d'immobilisations", current: -1800000, prior: -2160000, indent: true, trendValues: generateTrend(-1800000, 0.05) },
      { label: "Vente d'immobilisations", current: 300000, prior: 360000, indent: true, trendValues: generateTrend(300000, 0) },
      { label: "Total Flux d'investissement", current: -1500000, prior: -1800000, isBold: true, isSubtotal: true, trendValues: generateTrend(-1500000, 0.05) },
      { label: "", current: 0, prior: 0 },
      { label: "FLUX DE FINANCEMENT", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Emprunts", current: 1200000, prior: 960000, indent: true, trendValues: generateTrend(1200000, 0.04) },
      { label: "Remboursements", current: -1800000, prior: -1320000, indent: true, trendValues: generateTrend(-1800000, 0.04) },
      { label: "Total Flux de financement", current: -600000, prior: -360000, isBold: true, isSubtotal: true, trendValues: generateTrend(-600000, 0.04) },
      { label: "", current: 0, prior: 0 },
      { label: "Flux de trésorerie au début", current: 10200000, prior: 9600000, isBold: true, isSubtotal: true, trendValues: generateTrend(10200000, 0.05) },
      { label: "Variation de trésorerie", current: 3300000, prior: 2880000, isSubtotal: true, trendValues: generateTrend(3300000, 0.055) },
      { label: "Flux de trésorerie à la fin", current: 13500000, prior: 12480000, isBold: true, isSubtotal: true, trendValues: generateTrend(13500000, 0.055) },
    ]
  }

  const getDetailData = (): DetailRow[] => {
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
        // Operating Cash Flow
        { label: "FLUX OPÉRATIONNELS", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Bénéfice net", current: 380000, prior: 350000, indent: true },
        { label: "Amortissement", current: 120000, prior: 110000, indent: true },
        { label: "Variation des éléments hors trésorerie", current: 0, prior: 0, isSection: true },
        { label: "Variation des comptes clients", current: -50000, prior: -40000, indent: true },
        { label: "Variation des stocks", current: -20000, prior: -15000, indent: true },
        { label: "Variation des comptes fournisseurs", current: 20000, prior: 15000, indent: true },
        { label: "Variation des autres actifs courants", current: -10000, prior: -8000, indent: true },
        { label: "Variation des autres passifs courants", current: 10000, prior: 8000, indent: true },
        { label: "Total Flux opérationnels", current: 450000, prior: 420000, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        // Investing Cash Flow
        { label: "FLUX D'INVESTISSEMENT", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Achat d'immobilisations", current: -150000, prior: -180000, indent: true },
        { label: "Vente d'immobilisations", current: 25000, prior: 30000, indent: true },
        { label: "Total Flux d'investissement", current: -125000, prior: -150000, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        // Financing Cash Flow
        { label: "FLUX DE FINANCEMENT", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Emprunts", current: 100000, prior: 80000, indent: true },
        { label: "Remboursements", current: -150000, prior: -110000, indent: true },
        { label: "Total Flux de financement", current: -50000, prior: -30000, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        // Flux de trésorerie au début
        { label: "Flux de trésorerie au début", current: 850000, prior: 800000, isBold: true, isSubtotal: true },
        // Variation de trésorerie
        { label: "Variation de trésorerie", current: 275000, prior: 240000, isSubtotal: true },
        { label: "Flux de trésorerie à la fin", current: 1125000, prior: 1040000, isBold: true, isSubtotal: true },
      ]
    } else if (period === "quarterly") {
      return [
        // Operating Cash Flow
        { label: "FLUX OPÉRATIONNELS", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Bénéfice net", current: 1140000, prior: 1050000, indent: true },
        { label: "Amortissement", current: 360000, prior: 330000, indent: true },
        { label: "Variation des éléments hors trésorerie", current: 0, prior: 0, isSection: true },
        { label: "Variation des comptes clients", current: -150000, prior: -120000, indent: true },
        { label: "Variation des stocks", current: -60000, prior: -45000, indent: true },
        { label: "Variation des comptes fournisseurs", current: 60000, prior: 45000, indent: true },
        { label: "Variation des autres actifs courants", current: -30000, prior: -24000, indent: true },
        { label: "Variation des autres passifs courants", current: 30000, prior: 24000, indent: true },
        { label: "Total Flux opérationnels", current: 1350000, prior: 1260000, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        // Investing Cash Flow
        { label: "FLUX D'INVESTISSEMENT", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Achat d'immobilisations", current: -450000, prior: -540000, indent: true },
        { label: "Vente d'immobilisations", current: 75000, prior: 90000, indent: true },
        { label: "Total Flux d'investissement", current: -375000, prior: -450000, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        // Financing Cash Flow
        { label: "FLUX DE FINANCEMENT", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Emprunts", current: 300000, prior: 240000, indent: true },
        { label: "Remboursements", current: -450000, prior: -330000, indent: true },
        { label: "Total Flux de financement", current: -150000, prior: -90000, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        // Flux de trésorerie au début
        { label: "Flux de trésorerie au début", current: 2550000, prior: 2400000, isBold: true, isSubtotal: true },
        // Variation de trésorerie
        { label: "Variation de trésorerie", current: 825000, prior: 720000, isSubtotal: true },
        { label: "Flux de trésorerie à la fin", current: 3375000, prior: 3120000, isBold: true, isSubtotal: true },
      ]
    } else {
      return [
        // Operating Cash Flow
        { label: "FLUX OPÉRATIONNELS", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Bénéfice net", current: 4560000, prior: 4200000, indent: true },
        { label: "Amortissement", current: 1440000, prior: 1320000, indent: true },
        { label: "Variation des éléments hors trésorerie", current: 0, prior: 0, isSection: true },
        { label: "Variation des comptes clients", current: -600000, prior: -480000, indent: true },
        { label: "Variation des stocks", current: -240000, prior: -180000, indent: true },
        { label: "Variation des comptes fournisseurs", current: 240000, prior: 180000, indent: true },
        { label: "Variation des autres actifs courants", current: -120000, prior: -96000, indent: true },
        { label: "Variation des autres passifs courants", current: 120000, prior: 96000, indent: true },
        { label: "Total Flux opérationnels", current: 5400000, prior: 5040000, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        // Investing Cash Flow
        { label: "FLUX D'INVESTISSEMENT", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Achat d'immobilisations", current: -1800000, prior: -2160000, indent: true },
        { label: "Vente d'immobilisations", current: 300000, prior: 360000, indent: true },
        { label: "Total Flux d'investissement", current: -1500000, prior: -1800000, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        // Financing Cash Flow
        { label: "FLUX DE FINANCEMENT", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Emprunts", current: 1200000, prior: 960000, indent: true },
        { label: "Remboursements", current: -1800000, prior: -1320000, indent: true },
        { label: "Total Flux de financement", current: -600000, prior: -360000, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        // Flux de trésorerie au début
        { label: "Flux de trésorerie au début", current: 10200000, prior: 9600000, isBold: true, isSubtotal: true },
        // Variation de trésorerie
        { label: "Variation de trésorerie", current: 3300000, prior: 2880000, isSubtotal: true },
        { label: "Flux de trésorerie à la fin", current: 13500000, prior: 12480000, isBold: true, isSubtotal: true },
      ]
    }
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
  
  // Generate data for each entity in comparison mode
  const getEntityData = (entityIndex: number, baseData: DetailRow[]): DetailRow[] => {
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
  const totalCashFlowRow = data.find((row) => row.label.toLowerCase().includes("flux net") && row.isSubtotal)
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
              <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">Détail</h2>
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
              <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm w-2/5">Compte</th>
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
              const isSpacer = row.label === ""
              const shouldHideAmounts = isSpacer || !!row.isSection
              const displayLabel = row.isSection ? capitalizeFirst(row.label) : row.label
              
              // Check if next row is a subtotal to add dark border above it
              // Exclude "Variation de trésorerie" from getting a thick border above it
              const nextRow = idx < data.length - 1 ? data[idx + 1] : null
              const nextRowIsSubtotal = nextRow && nextRow.isSubtotal && nextRow.label?.toLowerCase() !== "variation de trésorerie"

              return (
                <tr key={idx} className={cn(
                  "border-b",
                  row.label === "" ? "h-1 border-slate-200" : "",
                  nextRowIsSubtotal ? "border-slate-900 border-b-2" : "border-slate-200"
                )}>
                  <td
                    className={`px-6 py-3 ${row.isBold ? "font-bold text-slate-900" : "text-slate-700"} ${row.indent ? "pl-12" : ""}`}
                  >
                    {displayLabel}
                  </td>

                  {view === "current" && (
                    <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                      {row.current !== 0 ? formatCurrency(row.current) : "-"}
                    </td>
                  )}

                  {view === "comparison" && !isComparisonMode && (
                    <>
                      <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                        {row.current !== 0 ? formatCurrency(row.current) : "-"}
                      </td>
                      <td
                        className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}
                      >
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
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.current !== 0 ? `${getTotalCashFlowPercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
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
                            className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}
                          >
                            {entityData.current !== 0 ? formatCurrency(entityData.current) : "-"}
                          </td>
                        )
                      })}
                    </>
                  )}
                  {view === "ddm" && (
                    <>
                      <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                        {row.current !== 0 ? formatCurrency(row.current) : "-"}
                      </td>
                      <td
                        className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}
                      >
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
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.current !== 0 ? `${getTotalCashFlowPercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.prior !== 0 ? `${getTotalCashFlowPercentage(row.prior, true).toFixed(1)}%` : "-"}
                          </td>
                        </>
                      )}
                    </>
                  )}

                  {view === "ytd" && (
                    <>
                      <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                        {row.current !== 0 ? formatCurrency(row.current) : "-"}
                      </td>
                      <td
                        className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}
                      >
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
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.current !== 0 ? `${getTotalCashFlowPercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
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
                          className={`px-4 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}
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
                          className={`px-4 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}
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
                              row.isBold ? "font-semibold font-bold" : "text-slate-500",
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
        <p className="text-xs text-slate-500">
          Note: Les données affichées sont à titre informatif. Consulter les états financiers audités pour les montants
          officiels.
        </p>
      </div>
    </div>
  )
}

