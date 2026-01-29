"use client"

import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"

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
}: IncomeStatementSummaryProps) {
  const isForecastSection = title === "États des résultats pro forma"
  
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
  
  // Helper function to generate trend data for 12 months
  const get12MonthsData = (): SummaryRow[] => {
    const baseRevenue = 275000
    const baseCOGS = 125000
    const baseGrossProfit = 150000
    const baseAdmin = 58500
    const baseSales = 36000
    const baseOther = -3500
    const baseTotalExpenses = 91000
    const baseEBT = 59000
    const baseTax = 15340
    const baseNetIncome = 43660
    const baseEBITA = 64000

    // Generate 12 months with slight variations showing growth trend
    const generateTrend = (base: number, growthRate: number = 0.02) => {
      return Array.from({ length: 12 }, (_, i) => {
        const monthIndex = 11 - i // Reverse order (oldest to newest)
        return Math.round(base * (1 + growthRate * monthIndex) * (0.95 + Math.random() * 0.1))
      })
    }

    const revenueTrend = generateTrend(baseRevenue, 0.025)
    const grossProfitTrend = generateTrend(baseGrossProfit, 0.03)
    const marginTrend = revenueTrend.map((rev, i) => {
      const gp = grossProfitTrend[i]
      return rev !== 0 ? (gp / rev) * 100 : 0
    })
    const currentMargin = (baseGrossProfit / baseRevenue) * 100
    const priorMargin = (132000 / 242000) * 100
    const netIncomeTrend = generateTrend(baseNetIncome, 0.035)
    const ebitaTrend = generateTrend(baseEBITA, 0.03)
    const netMarginTrend = revenueTrend.map((rev: number, i: number) => {
      const net = netIncomeTrend[i]
      return rev !== 0 ? (net / rev) * 100 : 0
    })
    const ebitaMarginTrend = revenueTrend.map((rev: number, i: number) => {
      const ebita = ebitaTrend[i]
      return rev !== 0 ? (ebita / rev) * 100 : 0
    })

    const rows: SummaryRow[] = [
      { label: "revenus", current: baseRevenue, prior: 242000, isBold: true, isSection: true, trendValues: revenueTrend },
      { label: "coût des produits vendus", current: baseCOGS, prior: 110000, isBold: true, isSection: true, indent: true, trendValues: generateTrend(baseCOGS, 0.02) },
      { label: "bénéfice brut", current: baseGrossProfit, prior: 132000, isBold: true, isResult: true, trendValues: grossProfitTrend },
      { label: "Marge brute", current: currentMargin, prior: priorMargin, isBold: true, isMargin: true, indent: true, trendValues: marginTrend },
    ]
    
    rows.push({ label: "", current: 0, prior: 0 })
    rows.push({ label: "charges d'exploitation", current: 0, prior: 0, isSection: true })
    rows.push({ label: "frais d'administration", current: baseAdmin, prior: 52700, isBold: true, indent: true, trendValues: generateTrend(baseAdmin, 0.015) })
    rows.push({ label: "frais de vente", current: baseSales, prior: 32300, isBold: true, indent: true, trendValues: generateTrend(baseSales, 0.02) })
    rows.push({ label: "autres dépenses (revenus)", current: baseOther, prior: -3500, isBold: true, indent: true, trendValues: generateTrend(baseOther, 0) })
    rows.push({ label: "total des charges", current: baseTotalExpenses, prior: 81500, isBold: true, trendValues: generateTrend(baseTotalExpenses, 0.018) })
    rows.push({ label: "", current: 0, prior: 0 })
    rows.push({ label: "bénéfice avant impôts", current: baseEBT, prior: 50500, isBold: true, isResult: true, trendValues: generateTrend(baseEBT, 0.035) })
    rows.push({ label: "impôts (26%)", current: baseTax, prior: 13130, isBold: true, indent: true, trendValues: generateTrend(baseTax, 0.035) })
    rows.push({ label: "bénéfice net", current: baseNetIncome, prior: 37370, isBold: true, isNetIncome: true, trendValues: netIncomeTrend })
    rows.push({ label: "Bénéfice net en % des revenus", current: (baseNetIncome / baseRevenue) * 100, prior: (37370 / 242000) * 100, isBold: true, isMargin: true, indent: true, trendValues: netMarginTrend })
    
    rows.push({ label: "", current: 0, prior: 0 })
    rows.push({ label: "BAIIA", current: baseEBITA, prior: 55500, isBold: true, isEBITA: true, trendValues: ebitaTrend })
    rows.push({ label: "BAIIA en % des revenus", current: (baseEBITA / baseRevenue) * 100, prior: (55500 / 242000) * 100, isBold: true, isMargin: true, indent: true, trendValues: ebitaMarginTrend })
    
    return rows
  }

  // Helper function to generate trend data for quarters
  const getQuartersData = (): SummaryRow[] => {
    const baseRevenue = 825000
    const baseCOGS = 375000
    const baseGrossProfit = 450000
    const baseAdmin = 175500
    const baseSales = 108000
    const baseOther = -10500
    const baseTotalExpenses = 273000
    const baseEBT = 177000
    const baseTax = 46020
    const baseNetIncome = 130980
    const baseEBITA = 192000

    const generateTrend = (base: number, growthRate: number = 0.03) => {
      return Array.from({ length: 5 }, (_, i) => {
        const quarterIndex = 4 - i
        return Math.round(base * (1 + growthRate * quarterIndex) * (0.97 + Math.random() * 0.06))
      })
    }

    const revenueTrend = generateTrend(baseRevenue, 0.04)
    const grossProfitTrend = generateTrend(baseGrossProfit, 0.05)
    const marginTrend = revenueTrend.map((rev, i) => {
      const gp = grossProfitTrend[i]
      return rev !== 0 ? (gp / rev) * 100 : 0
    })
    const currentMargin = (baseGrossProfit / baseRevenue) * 100
    const priorMargin = (386000 / 716000) * 100
    const netIncomeTrend = generateTrend(baseNetIncome, 0.06)
    const ebitaTrend = generateTrend(baseEBITA, 0.05)
    const netMarginTrend = revenueTrend.map((rev: number, i: number) => {
      const net = netIncomeTrend[i]
      return rev !== 0 ? (net / rev) * 100 : 0
    })
    const ebitaMarginTrend = revenueTrend.map((rev: number, i: number) => {
      const ebita = ebitaTrend[i]
      return rev !== 0 ? (ebita / rev) * 100 : 0
    })

    const rows: SummaryRow[] = [
      { label: "revenus", current: baseRevenue, prior: 716000, isBold: true, isSection: true, trendValues: revenueTrend },
      { label: "coût des produits vendus", current: baseCOGS, prior: 330000, isBold: true, isSection: true, indent: true, trendValues: generateTrend(baseCOGS, 0.03) },
      { label: "bénéfice brut", current: baseGrossProfit, prior: 386000, isBold: true, isResult: true, trendValues: grossProfitTrend },
      { label: "Marge brute", current: currentMargin, prior: priorMargin, isBold: true, isMargin: true, indent: true, trendValues: marginTrend },
    ]
    
    rows.push({ label: "", current: 0, prior: 0 })
    rows.push({ label: "charges d'exploitation", current: 0, prior: 0, isSection: true })
    rows.push({ label: "frais d'administration", current: baseAdmin, prior: 158100, isBold: true, indent: true, trendValues: generateTrend(baseAdmin, 0.02) })
    rows.push({ label: "frais de vente", current: baseSales, prior: 96900, isBold: true, indent: true, trendValues: generateTrend(baseSales, 0.025) })
    rows.push({ label: "autres dépenses (revenus)", current: baseOther, prior: -10500, isBold: true, indent: true, trendValues: generateTrend(baseOther, 0) })
    rows.push({ label: "total des charges", current: baseTotalExpenses, prior: 244500, isBold: true, trendValues: generateTrend(baseTotalExpenses, 0.022) })
    rows.push({ label: "", current: 0, prior: 0 })
    rows.push({ label: "bénéfice avant impôts", current: baseEBT, prior: 141500, isBold: true, isResult: true, trendValues: generateTrend(baseEBT, 0.06) })
    rows.push({ label: "impôts (26%)", current: baseTax, prior: 36790, isBold: true, indent: true, trendValues: generateTrend(baseTax, 0.06) })
    rows.push({ label: "bénéfice net", current: baseNetIncome, prior: 104710, isBold: true, isNetIncome: true, trendValues: netIncomeTrend })
    rows.push({ label: "Bénéfice net en % des revenus", current: (baseNetIncome / baseRevenue) * 100, prior: (104710 / 716000) * 100, isBold: true, isMargin: true, indent: true, trendValues: netMarginTrend })
    
    rows.push({ label: "", current: 0, prior: 0 })
    rows.push({ label: "BAIIA", current: baseEBITA, prior: 156500, isBold: true, isEBITA: true, trendValues: ebitaTrend })
    rows.push({ label: "BAIIA en % des revenus", current: (baseEBITA / baseRevenue) * 100, prior: (156500 / 716000) * 100, isBold: true, isMargin: true, indent: true, trendValues: ebitaMarginTrend })
    
    return rows
  }

  // Helper function to generate trend data for years
  const getYearsData = (): SummaryRow[] => {
    const baseRevenue = 3300000
    const baseCOGS = 1500000
    const baseGrossProfit = 1800000
    const baseAdmin = 702000
    const baseSales = 432000
    const baseOther = -42000
    const baseTotalExpenses = 1092000
    const baseEBT = 708000
    const baseTax = 184080
    const baseNetIncome = 523920
    const baseEBITA = 768000

    const generateTrend = (base: number, growthRate: number = 0.05) => {
      return Array.from({ length: projectionYears + 1 }, (_, i) => {
        if (isForecastSection) {
          // For forecast sections, generate future years (years 0 to 5, starting from current year)
          const yearIndex = i
          // Compound growth: base * (1 + rate) ^ yearIndex
          return Math.round(base * Math.pow(1 + growthRate, yearIndex) * (0.95 + Math.random() * 0.1))
        } else {
          // For other views, generate past years
          const yearIndex = 5 - i
          return Math.round(base * (1 + growthRate * yearIndex) * (0.95 + Math.random() * 0.1))
        }
      })
    }

    const revenueTrend = generateTrend(baseRevenue, 0.06)
    const grossProfitTrend = generateTrend(baseGrossProfit, 0.07)
    const marginTrend = revenueTrend.map((rev, i) => {
      const gp = grossProfitTrend[i]
      return rev !== 0 ? (gp / rev) * 100 : 0
    })
    const currentMargin = (baseGrossProfit / baseRevenue) * 100
    const priorMargin = (1544000 / 2864000) * 100
    const netIncomeTrend = generateTrend(baseNetIncome, 0.08)
    const ebitaTrend = generateTrend(baseEBITA, 0.07)
    const netMarginTrend = revenueTrend.map((rev: number, i: number) => {
      const net = netIncomeTrend[i]
      return rev !== 0 ? (net / rev) * 100 : 0
    })
    const ebitaMarginTrend = revenueTrend.map((rev: number, i: number) => {
      const ebita = ebitaTrend[i]
      return rev !== 0 ? (ebita / rev) * 100 : 0
    })

    const rows: SummaryRow[] = [
      { label: "revenus", current: baseRevenue, prior: 2864000, isBold: true, isSection: true, trendValues: revenueTrend },
      { label: "coût des produits vendus", current: baseCOGS, prior: 1320000, isBold: true, isSection: true, indent: true, trendValues: generateTrend(baseCOGS, 0.05) },
      { label: "bénéfice brut", current: baseGrossProfit, prior: 1544000, isBold: true, isResult: true, trendValues: grossProfitTrend },
      { label: "Marge brute", current: currentMargin, prior: priorMargin, isBold: true, isMargin: true, indent: true, trendValues: marginTrend },
    ]
    
    rows.push({ label: "", current: 0, prior: 0 })
    rows.push({ label: "charges d'exploitation", current: 0, prior: 0, isSection: true })
    rows.push({ label: "frais d'administration", current: baseAdmin, prior: 632400, isBold: true, indent: true, trendValues: generateTrend(baseAdmin, 0.03) })
    rows.push({ label: "frais de vente", current: baseSales, prior: 387600, isBold: true, indent: true, trendValues: generateTrend(baseSales, 0.04) })
    rows.push({ label: "autres dépenses (revenus)", current: baseOther, prior: -42000, isBold: true, indent: true, trendValues: generateTrend(baseOther, 0) })
    rows.push({ label: "total des charges", current: baseTotalExpenses, prior: 978000, isBold: true, trendValues: generateTrend(baseTotalExpenses, 0.035) })
    rows.push({ label: "", current: 0, prior: 0 })
    rows.push({ label: "bénéfice avant impôts", current: baseEBT, prior: 566000, isBold: true, isResult: true, trendValues: generateTrend(baseEBT, 0.08) })
    rows.push({ label: "impôts (26%)", current: baseTax, prior: 147160, isBold: true, indent: true, trendValues: generateTrend(baseTax, 0.08) })
    rows.push({ label: "bénéfice net", current: baseNetIncome, prior: 418840, isBold: true, isNetIncome: true, trendValues: netIncomeTrend })
    rows.push({ label: "Bénéfice net en % des revenus", current: (baseNetIncome / baseRevenue) * 100, prior: (418840 / 2864000) * 100, isBold: true, isMargin: true, indent: true, trendValues: netMarginTrend })
    
    rows.push({ label: "", current: 0, prior: 0 })
    rows.push({ label: "BAIIA", current: baseEBITA, prior: 626000, isBold: true, isEBITA: true, trendValues: ebitaTrend })
    rows.push({ label: "BAIIA en % des revenus", current: (baseEBITA / baseRevenue) * 100, prior: (626000 / 2864000) * 100, isBold: true, isMargin: true, indent: true, trendValues: ebitaMarginTrend })
    
    return rows
  }

  // Helper function to generate trend data for 24 months
  const get24MonthsData = (): SummaryRow[] => {
    const baseRevenue = 275000
    const baseCOGS = 125000
    const baseGrossProfit = 150000
    const baseAdmin = 58500
    const baseSales = 36000
    const baseOther = -3500
    const baseTotalExpenses = 91000
    const baseEBT = 59000
    const baseTax = 15340
    const baseNetIncome = 43660
    const baseEBITA = 64000

    // Generate 24 months with slight variations showing growth trend
    const generateTrend = (base: number, growthRate: number = 0.02) => {
      return Array.from({ length: 24 }, (_, i) => {
        const monthIndex = 23 - i // Reverse order (oldest to newest)
        return Math.round(base * (1 + growthRate * monthIndex) * (0.95 + Math.random() * 0.1))
      })
    }

    const revenueTrend = generateTrend(baseRevenue, 0.025)
    const grossProfitTrend = generateTrend(baseGrossProfit, 0.03)
    const marginTrend = revenueTrend.map((rev, i) => {
      const gp = grossProfitTrend[i]
      return rev !== 0 ? (gp / rev) * 100 : 0
    })
    const currentMargin = (baseGrossProfit / baseRevenue) * 100
    const priorMargin = (132000 / 242000) * 100
    const netIncomeTrend = generateTrend(baseNetIncome, 0.035)
    const ebitaTrend = generateTrend(baseEBITA, 0.03)
    const netMarginTrend = revenueTrend.map((rev: number, i: number) => {
      const net = netIncomeTrend[i]
      return rev !== 0 ? (net / rev) * 100 : 0
    })
    const ebitaMarginTrend = revenueTrend.map((rev: number, i: number) => {
      const ebita = ebitaTrend[i]
      return rev !== 0 ? (ebita / rev) * 100 : 0
    })

    const rows: SummaryRow[] = [
      { label: "revenus", current: baseRevenue, prior: 242000, isBold: true, isSection: true, trendValues: revenueTrend },
      { label: "coût des produits vendus", current: baseCOGS, prior: 110000, isBold: true, isSection: true, indent: true, trendValues: generateTrend(baseCOGS, 0.02) },
      { label: "bénéfice brut", current: baseGrossProfit, prior: 132000, isBold: true, isResult: true, trendValues: grossProfitTrend },
    ]
    
    if (isForecastSection) {
      rows.push({ label: "marge brute", current: currentMargin, prior: priorMargin, isBold: true, isMargin: true, trendValues: marginTrend })
    }
    
    rows.push({ label: "", current: 0, prior: 0 })
    rows.push({ label: "charges d'exploitation", current: 0, prior: 0, isSection: true })
    rows.push({ label: "frais d'administration", current: baseAdmin, prior: 52700, isBold: true, indent: true, trendValues: generateTrend(baseAdmin, 0.015) })
    rows.push({ label: "frais de vente", current: baseSales, prior: 32300, isBold: true, indent: true, trendValues: generateTrend(baseSales, 0.02) })
    rows.push({ label: "autres dépenses (revenus)", current: baseOther, prior: -3500, isBold: true, indent: true, trendValues: generateTrend(baseOther, 0) })
    rows.push({ label: "total des charges", current: baseTotalExpenses, prior: 81500, isBold: true, trendValues: generateTrend(baseTotalExpenses, 0.018) })
    rows.push({ label: "", current: 0, prior: 0 })
    rows.push({ label: "bénéfice avant impôts", current: baseEBT, prior: 50500, isBold: true, isResult: true, trendValues: generateTrend(baseEBT, 0.035) })
    rows.push({ label: "impôts (26%)", current: baseTax, prior: 13130, isBold: true, indent: true, trendValues: generateTrend(baseTax, 0.035) })
    rows.push({ label: "bénéfice net", current: baseNetIncome, prior: 37370, isBold: true, isNetIncome: true, trendValues: generateTrend(baseNetIncome, 0.035) })
    
    if (isForecastSection) {
      rows.push({ label: "marge nette", current: (baseNetIncome / baseRevenue) * 100, prior: (37370 / 242000) * 100, isBold: true, isMargin: true, trendValues: netMarginTrend })
    }
    
    rows.push({ label: "", current: 0, prior: 0 })
    rows.push({ label: "BAIIA", current: baseEBITA, prior: 55500, isBold: true, isEBITA: true, trendValues: ebitaTrend })
    
    if (isForecastSection) {
      rows.push({ label: "Marge BAIIA", current: (baseEBITA / baseRevenue) * 100, prior: (55500 / 242000) * 100, isBold: true, isMargin: true, trendValues: ebitaMarginTrend })
    }
    
    return rows
  }

  // Helper function to get comparison data based on comparisonType
  const getComparisonPriorValue = (basePrior: number): number => {
    if (comparisonType === "lastMonth") {
      // For "lastMonth", use the base prior value (YTD/DDM of last period)
      return basePrior
    } else if (comparisonType === "pastMonth") {
      // For "pastMonth", use a slightly different value (YTD/DDM of past period)
      return Math.round(basePrior * 0.92)
    } else if (comparisonType === "budget" && selectedBudgetId) {
      // For "budget", load budget data from localStorage
      // For now, use a budget value (typically higher than actual)
      return Math.round(basePrior * 1.15)
    }
    return basePrior
  }

  const getSummaryData = (): SummaryRow[] => {
    // Return trend data for trend views
    if (view === "12months") {
      return get12MonthsData()
    }
    if (view === "24months") {
      return get24MonthsData()
    }
    if (view === "quarters") {
      return getQuartersData()
    }
    if (view === "years") {
      return getYearsData()
    }
    // Handle YTD and DDM views
    if (view === "ytd" || view === "ddm") {
      // Base values for current YTD/DDM
      const baseRevenue = view === "ytd" ? 1650000 : 275000 // YTD is cumulative, DDM is monthly
      const baseCOGS = view === "ytd" ? 750000 : 125000
      const baseGrossProfit = baseRevenue - baseCOGS
      const baseAdmin = view === "ytd" ? 351000 : 58500
      const baseSales = view === "ytd" ? 216000 : 36000
      const baseOther = view === "ytd" ? -21000 : -3500
      const baseTotalExpenses = baseAdmin + baseSales + baseOther
      const baseEBT = view === "ytd" ? 354000 : 59000
      const baseTax = view === "ytd" ? 92040 : 15340
      const baseNetIncome = view === "ytd" ? 261960 : 43660
      const baseEBITA = view === "ytd" ? 384000 : 64000

      // Prior values (will be adjusted based on comparisonType)
      const priorRevenue = view === "ytd" ? 1452000 : 242000
      const priorCOGS = view === "ytd" ? 660000 : 110000
      const priorGrossProfit = priorRevenue - priorCOGS
      const priorAdmin = view === "ytd" ? 316200 : 52700
      const priorSales = view === "ytd" ? 193800 : 32300
      const priorOther = view === "ytd" ? -21000 : -3500
      const priorTotalExpenses = priorAdmin + priorSales + priorOther
      const priorEBT = view === "ytd" ? 303000 : 50500
      const priorTax = view === "ytd" ? 78780 : 13130
      const priorNetIncome = view === "ytd" ? 224220 : 37370
      const priorEBITA = view === "ytd" ? 333000 : 55500

      // Apply comparison type adjustment
      const adjustedPriorRevenue = getComparisonPriorValue(priorRevenue)
      const adjustedPriorCOGS = getComparisonPriorValue(priorCOGS)
      const adjustedPriorGrossProfit = adjustedPriorRevenue - adjustedPriorCOGS
      const adjustedPriorAdmin = getComparisonPriorValue(priorAdmin)
      const adjustedPriorSales = getComparisonPriorValue(priorSales)
      const adjustedPriorOther = priorOther // Usually same
      const adjustedPriorTotalExpenses = adjustedPriorAdmin + adjustedPriorSales + adjustedPriorOther
      const adjustedPriorEBT = adjustedPriorGrossProfit - adjustedPriorTotalExpenses
      const adjustedPriorTax = Math.round(adjustedPriorEBT * 0.26)
      const adjustedPriorNetIncome = adjustedPriorEBT - adjustedPriorTax
      const adjustedPriorEBITA = adjustedPriorGrossProfit - adjustedPriorTotalExpenses

      const rows: SummaryRow[] = [
        { label: "revenus", current: baseRevenue, prior: adjustedPriorRevenue, isBold: true, isSection: true },
        { label: "coût des produits vendus", current: baseCOGS, prior: adjustedPriorCOGS, isBold: true, isSection: true, indent: true },
        { label: "bénéfice brut", current: baseGrossProfit, prior: adjustedPriorGrossProfit, isBold: true, isResult: true },
      ]
      
      if (isForecastSection) {
        rows.push({ label: "marge brute", current: (baseGrossProfit / baseRevenue) * 100, prior: (adjustedPriorGrossProfit / adjustedPriorRevenue) * 100, isBold: true, isMargin: true })
      }
      
      rows.push({ label: "", current: 0, prior: 0 })
      rows.push({ label: "charges d'exploitation", current: 0, prior: 0, isSection: true })
      rows.push({ label: "frais d'administration", current: baseAdmin, prior: adjustedPriorAdmin, isBold: true, indent: true })
      rows.push({ label: "frais de vente", current: baseSales, prior: adjustedPriorSales, isBold: true, indent: true })
      rows.push({ label: "autres dépenses (revenus)", current: baseOther, prior: adjustedPriorOther, isBold: true, indent: true })
      rows.push({ label: "total des charges", current: baseTotalExpenses, prior: adjustedPriorTotalExpenses, isBold: true })
      rows.push({ label: "", current: 0, prior: 0 })
      rows.push({ label: "bénéfice avant impôts", current: baseEBT, prior: adjustedPriorEBT, isBold: true, isResult: true })
      rows.push({ label: "impôts (26%)", current: baseTax, prior: adjustedPriorTax, isBold: true, indent: true })
      rows.push({ label: "bénéfice net", current: baseNetIncome, prior: adjustedPriorNetIncome, isBold: true, isNetIncome: true })
      
      if (isForecastSection) {
        rows.push({ label: "marge nette", current: (baseNetIncome / baseRevenue) * 100, prior: (adjustedPriorNetIncome / adjustedPriorRevenue) * 100, isBold: true, isMargin: true })
      }
      
      rows.push({ label: "", current: 0, prior: 0 })
      rows.push({ label: "BAIIA", current: baseEBITA, prior: adjustedPriorEBITA, isBold: true, isEBITA: true })
      
      if (isForecastSection) {
        rows.push({ label: "Marge BAIIA", current: (baseEBITA / baseRevenue) * 100, prior: (adjustedPriorEBITA / adjustedPriorRevenue) * 100, isBold: true, isMargin: true })
      }
      
      return rows
    }
    if (period === "monthly") {
      const rows: SummaryRow[] = [
        { label: "revenus", current: 275000, prior: 242000, isBold: true, isSection: true },
        { label: "coût des produits vendus", current: 125000, prior: 110000, isBold: true, isSection: true, indent: true },
        { label: "bénéfice brut", current: 150000, prior: 132000, isBold: true, isResult: true },
      ]
      
      if (isForecastSection) {
        rows.push({ label: "marge brute", current: (150000 / 275000) * 100, prior: (132000 / 242000) * 100, isBold: true, isMargin: true })
      }
      
      rows.push({ label: "", current: 0, prior: 0 })
      rows.push({ label: "charges d'exploitation", current: 0, prior: 0, isSection: true })
      rows.push({ label: "frais d'administration", current: 58500, prior: 52700, isBold: true, indent: true })
      rows.push({ label: "frais de vente", current: 36000, prior: 32300, isBold: true, indent: true })
      rows.push({ label: "autres dépenses (revenus)", current: -3500, prior: -3500, isBold: true, indent: true })
      rows.push({ label: "total des charges", current: 91000, prior: 81500, isBold: true })
      rows.push({ label: "", current: 0, prior: 0 })
      rows.push({ label: "bénéfice avant impôts", current: 59000, prior: 50500, isBold: true, isResult: true })
      rows.push({ label: "impôts (26%)", current: 15340, prior: 13130, isBold: true, indent: true })
      rows.push({ label: "bénéfice net", current: 43660, prior: 37370, isBold: true, isNetIncome: true })
      
      if (isForecastSection) {
        rows.push({ label: "marge nette", current: (43660 / 275000) * 100, prior: (37370 / 242000) * 100, isBold: true, isMargin: true })
      }
      
      rows.push({ label: "", current: 0, prior: 0 })
      rows.push({ label: "BAIIA", current: 64000, prior: 55500, isBold: true, isEBITA: true })
      
      if (isForecastSection) {
        rows.push({ label: "Marge BAIIA", current: (64000 / 275000) * 100, prior: (55500 / 242000) * 100, isBold: true, isMargin: true })
      }
      
      return rows
    } else if (period === "quarterly") {
      const rows: SummaryRow[] = [
        { label: "revenus", current: 825000, prior: 716000, isBold: true, isSection: true },
        { label: "coût des produits vendus", current: 375000, prior: 330000, isBold: true, isSection: true, indent: true },
        { label: "bénéfice brut", current: 450000, prior: 386000, isBold: true, isResult: true },
      ]
      
      if (isForecastSection) {
        rows.push({ label: "marge brute", current: (450000 / 825000) * 100, prior: (386000 / 716000) * 100, isBold: true, isMargin: true })
      }
      
      rows.push({ label: "", current: 0, prior: 0 })
      rows.push({ label: "charges d'exploitation", current: 0, prior: 0, isSection: true })
      rows.push({ label: "frais d'administration", current: 175500, prior: 158100, isBold: true, indent: true })
      rows.push({ label: "frais de vente", current: 108000, prior: 96900, isBold: true, indent: true })
      rows.push({ label: "autres dépenses (revenus)", current: -10500, prior: -10500, isBold: true, indent: true })
      rows.push({ label: "total des charges", current: 273000, prior: 244500, isBold: true })
      rows.push({ label: "", current: 0, prior: 0 })
      rows.push({ label: "bénéfice avant impôts", current: 177000, prior: 141500, isBold: true, isResult: true })
      rows.push({ label: "impôts (26%)", current: 46020, prior: 36790, isBold: true, indent: true })
      rows.push({ label: "bénéfice net", current: 130980, prior: 104710, isBold: true, isNetIncome: true })
      
      if (isForecastSection) {
        rows.push({ label: "marge nette", current: (130980 / 825000) * 100, prior: (104710 / 716000) * 100, isBold: true, isMargin: true })
      }
      
      rows.push({ label: "", current: 0, prior: 0 })
      rows.push({ label: "BAIIA", current: 192000, prior: 156500, isBold: true, isEBITA: true })
      
      if (isForecastSection) {
        rows.push({ label: "Marge BAIIA", current: (192000 / 825000) * 100, prior: (156500 / 716000) * 100, isBold: true, isMargin: true })
      }
      
      return rows
    } else {
      const rows: SummaryRow[] = [
        { label: "revenus", current: 3300000, prior: 2864000, isBold: true, isSection: true },
        { label: "coût des produits vendus", current: 1500000, prior: 1320000, isBold: true, isSection: true, indent: true },
        { label: "bénéfice brut", current: 1800000, prior: 1544000, isBold: true, isResult: true },
      ]
      
      if (isForecastSection) {
        rows.push({ label: "marge brute", current: (1800000 / 3300000) * 100, prior: (1544000 / 2864000) * 100, isBold: true, isMargin: true })
      }
      
      rows.push({ label: "", current: 0, prior: 0 })
      rows.push({ label: "charges d'exploitation", current: 0, prior: 0, isSection: true })
      rows.push({ label: "frais d'administration", current: 702000, prior: 632400, isBold: true, indent: true })
      rows.push({ label: "frais de vente", current: 432000, prior: 387600, isBold: true, indent: true })
      rows.push({ label: "autres dépenses (revenus)", current: -42000, prior: -42000, isBold: true, indent: true })
      rows.push({ label: "total des charges", current: 1092000, prior: 978000, isBold: true })
      rows.push({ label: "", current: 0, prior: 0 })
      rows.push({ label: "bénéfice avant impôts", current: 708000, prior: 566000, isBold: true, isResult: true })
      rows.push({ label: "impôts (26%)", current: 184080, prior: 147160, isBold: true, indent: true })
      rows.push({ label: "bénéfice net", current: 523920, prior: 418840, isBold: true, isNetIncome: true })
      
      if (isForecastSection) {
        rows.push({ label: "marge nette", current: (523920 / 3300000) * 100, prior: (418840 / 2864000) * 100, isBold: true, isMargin: true })
      }
      
      rows.push({ label: "", current: 0, prior: 0 })
      rows.push({ label: "BAIIA", current: 768000, prior: 626000, isBold: true, isEBITA: true })
      
      if (isForecastSection) {
        rows.push({ label: "Marge BAIIA", current: (768000 / 3300000) * 100, prior: (626000 / 2864000) * 100, isBold: true, isMargin: true })
      }
      
      return rows
    }
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
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">YTD 2024</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">YTD 2023</th>
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
                      {entitiesToCompare.map((entity, entityIdx) => {
                        const entityData = getEntityData(entityIdx, [row])[0]
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
                      {entitiesToCompare.map((entity, entityIdx) => {
                        const entityData = getEntityData(entityIdx, [row])[0]
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
