"use client"

import { useState } from "react"
import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, ReferenceArea, ResponsiveContainer, Cell } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronRight, ChevronDown } from "lucide-react"

interface WorkingCapitalDetailProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "12months" | "24months" | "years"
  columnMode?: "variations" | "percentage" | "comparison"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
}

interface BalanceAccount {
  accountNumber: string
  accountName: string
  amount: number
  priorAmount?: number
  // For trend views, store the proportion of the parent row's amount
  proportion?: number
}

interface DetailRow {
  label: string
  current: number
  prior: number
  indent?: boolean
  isBold?: boolean
  isSubtotal?: boolean
  isSection?: boolean
  isResult?: boolean
  // For trend views (12months, quarters, years)
  trendValues?: number[]
  // Account identifier for checkbox exclusion
  accountId?: string
  // Balance accounts for this row
  balanceAccounts?: BalanceAccount[]
  rowId?: string // Unique ID for expansion
}

export function WorkingCapitalDetail({
  period,
  view,
  columnMode = "variations",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
}: WorkingCapitalDetailProps) {
  // State to track which accounts are excluded from working capital calculation (unchecked = excluded)
  const [excludedAccounts, setExcludedAccounts] = useState<Set<string>>(new Set())
  // State to track selected working capital type
  const [workingCapitalType, setWorkingCapitalType] = useState<"FDR" | "FdRHC">("FDR")
  // State to track expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  
  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(rowId)) {
        newSet.delete(rowId)
      } else {
        newSet.add(rowId)
      }
      return newSet
    })
  }
  
  // State to track if analysis section is open
  const [showAnalysis, setShowAnalysis] = useState<boolean>(false)
  // State to control Y-axis minimum value for zooming
  const [yAxisMin, setYAxisMin] = useState<number | null>(null)
  // State to track if excluded analysis section is open
  const [showExcludedAnalysis, setShowExcludedAnalysis] = useState<boolean>(false)
  // State to control Y-axis minimum value for excluded working capital graph
  const [yAxisMinExcluded, setYAxisMinExcluded] = useState<number | null>(null)
  // State to track if CCC analysis section is open
  const [showCCCAnalysis, setShowCCCAnalysis] = useState<boolean>(false)
  // State to track selected CCC metric
  const [selectedCCCMetric, setSelectedCCCMetric] = useState<"DSO" | "DIO" | "DPO" | "CCC">("DSO")
  // State to control Y-axis minimum values for CCC graphs
  const [yAxisMinDSO, setYAxisMinDSO] = useState<number | null>(null)
  const [yAxisMinDIO, setYAxisMinDIO] = useState<number | null>(null)
  const [yAxisMinDPO, setYAxisMinDPO] = useState<number | null>(null)
  const [yAxisMinCCC, setYAxisMinCCC] = useState<number | null>(null)
  
  const toggleAccountExclusion = (accountId: string) => {
    setExcludedAccounts((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(accountId)) {
        newSet.delete(accountId)
      } else {
        newSet.add(accountId)
      }
      return newSet
    })
  }
  
  // Helper function to get balance accounts for a given account type
  const getBalanceAccounts = (accountId: string, current: number, prior: number): BalanceAccount[] => {
    switch (accountId) {
      case "cash":
        return [
          { accountNumber: "1010", accountName: "Compte chèques", amount: Math.round(current * 0.6), priorAmount: Math.round(prior * 0.6), proportion: 0.6 },
          { accountNumber: "1020", accountName: "Compte épargne", amount: Math.round(current * 0.4), priorAmount: Math.round(prior * 0.4), proportion: 0.4 },
        ]
      case "receivables":
        return [
          { accountNumber: "1200", accountName: "Clients - 30 jours", amount: Math.round(current * 0.57), priorAmount: Math.round(prior * 0.57), proportion: 0.57 },
          { accountNumber: "1210", accountName: "Clients - 60 jours", amount: Math.round(current * 0.29), priorAmount: Math.round(prior * 0.29), proportion: 0.29 },
          { accountNumber: "1220", accountName: "Clients - 90 jours", amount: Math.round(current * 0.14), priorAmount: Math.round(prior * 0.14), proportion: 0.14 },
        ]
      case "inventory":
        return [
          { accountNumber: "1300", accountName: "Stock - Matières premières", amount: Math.round(current * 0.4), priorAmount: Math.round(prior * 0.4), proportion: 0.4 },
          { accountNumber: "1310", accountName: "Stock - Produits finis", amount: Math.round(current * 0.47), priorAmount: Math.round(prior * 0.47), proportion: 0.47 },
          { accountNumber: "1320", accountName: "Stock - En cours", amount: Math.round(current * 0.13), priorAmount: Math.round(prior * 0.13), proportion: 0.13 },
        ]
      case "other_assets":
        return [
          { accountNumber: "1400", accountName: "Prépayés", amount: Math.round(current * 0.53), priorAmount: Math.round(prior * 0.53), proportion: 0.53 },
          { accountNumber: "1410", accountName: "Autres créances", amount: Math.round(current * 0.47), priorAmount: Math.round(prior * 0.47), proportion: 0.47 },
        ]
      case "payables":
        return [
          { accountNumber: "2000", accountName: "Fournisseurs - 30 jours", amount: Math.round(current * 0.6), priorAmount: Math.round(prior * 0.6), proportion: 0.6 },
          { accountNumber: "2010", accountName: "Fournisseurs - 60 jours", amount: Math.round(current * 0.4), priorAmount: Math.round(prior * 0.4), proportion: 0.4 },
        ]
      case "short_term_debt":
        return [
          { accountNumber: "2100", accountName: "Emprunt bancaire", amount: Math.round(current * 0.67), priorAmount: Math.round(prior * 0.67), proportion: 0.67 },
          { accountNumber: "2110", accountName: "Ligne de crédit", amount: Math.round(current * 0.33), priorAmount: Math.round(prior * 0.33), proportion: 0.33 },
        ]
      case "other_liabilities":
        return [
          { accountNumber: "2200", accountName: "Salaires à payer", amount: Math.round(current * 0.6), priorAmount: Math.round(prior * 0.6), proportion: 0.6 },
          { accountNumber: "2210", accountName: "Impôts à payer", amount: Math.round(current * 0.4), priorAmount: Math.round(prior * 0.4), proportion: 0.4 },
        ]
      default:
        return []
    }
  }
  
  // Helper function to generate trend data for 12 months
  const get12MonthsData = (): DetailRow[] => {
    const generateTrend = (base: number, growthRate: number = 0.02) => {
      return Array.from({ length: 12 }, (_, i) => {
        const monthIndex = 11 - i
        return Math.round(base * (1 + growthRate * monthIndex) * (0.95 + Math.random() * 0.1))
      })
    }

    const currentRevenue = 275000
    const priorRevenue = 242000
    const currentAssets = 850000
    const priorAssets = 750000
    const currentLiabilities = 450000
    const priorLiabilities = 420000
    const workingCapital = currentAssets - currentLiabilities
    const priorWorkingCapital = priorAssets - priorLiabilities

    return [
      { label: "ACTIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Trésorerie et équivalents", current: 200000, prior: 180000, indent: true, trendValues: generateTrend(200000, 0.025), accountId: "cash", rowId: "cash", balanceAccounts: getBalanceAccounts("cash", 200000, 180000) },
      { label: "Comptes clients", current: 350000, prior: 300000, indent: true, trendValues: generateTrend(350000, 0.03), accountId: "receivables", rowId: "receivables", balanceAccounts: getBalanceAccounts("receivables", 350000, 300000) },
      { label: "Stocks", current: 150000, prior: 130000, indent: true, trendValues: generateTrend(150000, 0.02), accountId: "inventory", rowId: "inventory", balanceAccounts: getBalanceAccounts("inventory", 150000, 130000) },
      { label: "Autres actifs courants", current: 150000, prior: 140000, indent: true, trendValues: generateTrend(150000, 0.02), accountId: "other_assets", rowId: "other_assets", balanceAccounts: getBalanceAccounts("other_assets", 150000, 140000) },
      { label: "Total Actifs courants", current: currentAssets, prior: priorAssets, isBold: true, isSubtotal: true, trendValues: generateTrend(currentAssets, 0.025) },
      { label: "", current: 0, prior: 0 },
      { label: "PASSIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Comptes fournisseurs", current: 200000, prior: 180000, indent: true, trendValues: generateTrend(200000, 0.02), accountId: "payables", rowId: "payables", balanceAccounts: getBalanceAccounts("payables", 200000, 180000) },
      { label: "Dettes à court terme", current: 150000, prior: 140000, indent: true, trendValues: generateTrend(150000, 0.02), accountId: "short_term_debt", rowId: "short_term_debt", balanceAccounts: getBalanceAccounts("short_term_debt", 150000, 140000) },
      { label: "Autres passifs courants", current: 100000, prior: 100000, indent: true, trendValues: generateTrend(100000, 0), accountId: "other_liabilities", rowId: "other_liabilities", balanceAccounts: getBalanceAccounts("other_liabilities", 100000, 100000) },
      { label: "Total Passifs courants", current: currentLiabilities, prior: priorLiabilities, isBold: true, isSubtotal: true, trendValues: generateTrend(currentLiabilities, 0.018) },
      { label: "", current: 0, prior: 0 },
    ]
  }

  // Helper function to generate trend data for 24 months
  const get24MonthsData = (): DetailRow[] => {
    const generateTrend = (base: number, growthRate: number = 0.02) => {
      return Array.from({ length: 24 }, (_, i) => {
        const monthIndex = 23 - i
        return Math.round(base * (1 + growthRate * monthIndex) * (0.95 + Math.random() * 0.1))
      })
    }

    const currentRevenue = 275000
    const priorRevenue = 242000
    const currentAssets = 850000
    const priorAssets = 750000
    const currentLiabilities = 450000
    const priorLiabilities = 420000
    const workingCapital = currentAssets - currentLiabilities
    const priorWorkingCapital = priorAssets - priorLiabilities

    return [
      { label: "ACTIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Trésorerie et équivalents", current: 200000, prior: 180000, indent: true, trendValues: generateTrend(200000, 0.025), accountId: "cash", rowId: "cash", balanceAccounts: getBalanceAccounts("cash", 200000, 180000) },
      { label: "Comptes clients", current: 350000, prior: 300000, indent: true, trendValues: generateTrend(350000, 0.03), accountId: "receivables", rowId: "receivables", balanceAccounts: getBalanceAccounts("receivables", 350000, 300000) },
      { label: "Stocks", current: 150000, prior: 130000, indent: true, trendValues: generateTrend(150000, 0.02), accountId: "inventory", rowId: "inventory", balanceAccounts: getBalanceAccounts("inventory", 150000, 130000) },
      { label: "Autres actifs courants", current: 150000, prior: 140000, indent: true, trendValues: generateTrend(150000, 0.02), accountId: "other_assets", rowId: "other_assets", balanceAccounts: getBalanceAccounts("other_assets", 150000, 140000) },
      { label: "Total Actifs courants", current: currentAssets, prior: priorAssets, isBold: true, isSubtotal: true, trendValues: generateTrend(currentAssets, 0.025) },
      { label: "", current: 0, prior: 0 },
      { label: "PASSIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Comptes fournisseurs", current: 200000, prior: 180000, indent: true, trendValues: generateTrend(200000, 0.02), accountId: "payables", rowId: "payables", balanceAccounts: getBalanceAccounts("payables", 200000, 180000) },
      { label: "Dettes à court terme", current: 150000, prior: 140000, indent: true, trendValues: generateTrend(150000, 0.02), accountId: "short_term_debt", rowId: "short_term_debt", balanceAccounts: getBalanceAccounts("short_term_debt", 150000, 140000) },
      { label: "Autres passifs courants", current: 100000, prior: 100000, indent: true, trendValues: generateTrend(100000, 0), accountId: "other_liabilities", rowId: "other_liabilities", balanceAccounts: getBalanceAccounts("other_liabilities", 100000, 100000) },
      { label: "Total Passifs courants", current: currentLiabilities, prior: priorLiabilities, isBold: true, isSubtotal: true, trendValues: generateTrend(currentLiabilities, 0.018) },
      { label: "", current: 0, prior: 0 },
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

    const currentRevenue = 825000
    const priorRevenue = 716000
    const currentAssets = 2550000
    const priorAssets = 2250000
    const currentLiabilities = 1350000
    const priorLiabilities = 1260000
    const workingCapital = currentAssets - currentLiabilities
    const priorWorkingCapital = priorAssets - priorLiabilities

    return [
      { label: "ACTIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Trésorerie et équivalents", current: 600000, prior: 540000, indent: true, trendValues: generateTrend(600000, 0.04), accountId: "cash" },
      { label: "Comptes clients", current: 1050000, prior: 900000, indent: true, trendValues: generateTrend(1050000, 0.04), accountId: "receivables" },
      { label: "Stocks", current: 450000, prior: 390000, indent: true, trendValues: generateTrend(450000, 0.03), accountId: "inventory" },
      { label: "Autres actifs courants", current: 450000, prior: 420000, indent: true, trendValues: generateTrend(450000, 0.03), accountId: "other_assets" },
      { label: "Total Actifs courants", current: currentAssets, prior: priorAssets, isBold: true, isSubtotal: true, trendValues: generateTrend(currentAssets, 0.04) },
      { label: "", current: 0, prior: 0 },
      { label: "PASSIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Comptes fournisseurs", current: 600000, prior: 540000, indent: true, trendValues: generateTrend(600000, 0.025), accountId: "payables" },
      { label: "Dettes à court terme", current: 450000, prior: 420000, indent: true, trendValues: generateTrend(450000, 0.025), accountId: "short_term_debt" },
      { label: "Autres passifs courants", current: 300000, prior: 300000, indent: true, trendValues: generateTrend(300000, 0), accountId: "other_liabilities" },
      { label: "Total Passifs courants", current: currentLiabilities, prior: priorLiabilities, isBold: true, isSubtotal: true, trendValues: generateTrend(currentLiabilities, 0.025) },
      { label: "", current: 0, prior: 0 },
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

    const currentRevenue = 3300000
    const priorRevenue = 2864000
    const currentAssets = 10200000
    const priorAssets = 9000000
    const currentLiabilities = 5400000
    const priorLiabilities = 5040000
    const workingCapital = currentAssets - currentLiabilities
    const priorWorkingCapital = priorAssets - priorLiabilities

    return [
      { label: "ACTIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Trésorerie et équivalents", current: 2400000, prior: 2160000, indent: true, trendValues: generateTrend(2400000, 0.06), accountId: "cash", rowId: "cash", balanceAccounts: getBalanceAccounts("cash", 2400000, 2160000) },
      { label: "Comptes clients", current: 4200000, prior: 3600000, indent: true, trendValues: generateTrend(4200000, 0.06), accountId: "receivables", rowId: "receivables", balanceAccounts: getBalanceAccounts("receivables", 4200000, 3600000) },
      { label: "Stocks", current: 1800000, prior: 1560000, indent: true, trendValues: generateTrend(1800000, 0.05), accountId: "inventory", rowId: "inventory", balanceAccounts: getBalanceAccounts("inventory", 1800000, 1560000) },
      { label: "Autres actifs courants", current: 1800000, prior: 1680000, indent: true, trendValues: generateTrend(1800000, 0.05), accountId: "other_assets", rowId: "other_assets", balanceAccounts: getBalanceAccounts("other_assets", 1800000, 1680000) },
      { label: "Total Actifs courants", current: currentAssets, prior: priorAssets, isBold: true, isSubtotal: true, trendValues: generateTrend(currentAssets, 0.06) },
      { label: "", current: 0, prior: 0 },
      { label: "PASSIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Comptes fournisseurs", current: 2400000, prior: 2160000, indent: true, trendValues: generateTrend(2400000, 0.04), accountId: "payables", rowId: "payables", balanceAccounts: getBalanceAccounts("payables", 2400000, 2160000) },
      { label: "Dettes à court terme", current: 1800000, prior: 1680000, indent: true, trendValues: generateTrend(1800000, 0.04), accountId: "short_term_debt", rowId: "short_term_debt", balanceAccounts: getBalanceAccounts("short_term_debt", 1800000, 1680000) },
      { label: "Autres passifs courants", current: 1200000, prior: 1200000, indent: true, trendValues: generateTrend(1200000, 0), accountId: "other_liabilities", rowId: "other_liabilities", balanceAccounts: getBalanceAccounts("other_liabilities", 1200000, 1200000) },
      { label: "Total Passifs courants", current: currentLiabilities, prior: priorLiabilities, isBold: true, isSubtotal: true, trendValues: generateTrend(currentLiabilities, 0.04) },
      { label: "", current: 0, prior: 0 },
    ]
  }

  const getDetailData = (): DetailRow[] => {
    // Return trend data for trend views
    if (view === "12months") {
      return get12MonthsData()
    }
    if (view === "24months") {
      return get24MonthsData()
    }
    if (view === "years") {
      return getYearsData()
    }
    if (period === "monthly") {
      const currentRevenue = 275000
      const priorRevenue = 242000
      const currentAssets = 850000
      const priorAssets = 750000
      const currentLiabilities = 450000
      const priorLiabilities = 420000
      const workingCapital = currentAssets - currentLiabilities
      const priorWorkingCapital = priorAssets - priorLiabilities

      return [
        { label: "ACTIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Trésorerie et équivalents", current: 200000, prior: 180000, indent: true, accountId: "cash", rowId: "cash", balanceAccounts: getBalanceAccounts("cash", 200000, 180000) },
        { label: "Comptes clients", current: 350000, prior: 300000, indent: true, accountId: "receivables", rowId: "receivables", balanceAccounts: getBalanceAccounts("receivables", 350000, 300000) },
        { label: "Stocks", current: 150000, prior: 130000, indent: true, accountId: "inventory", rowId: "inventory", balanceAccounts: getBalanceAccounts("inventory", 150000, 130000) },
        { label: "Autres actifs courants", current: 150000, prior: 140000, indent: true, accountId: "other_assets", rowId: "other_assets", balanceAccounts: getBalanceAccounts("other_assets", 150000, 140000) },
        { label: "Total Actifs courants", current: currentAssets, prior: priorAssets, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        { label: "PASSIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Comptes fournisseurs", current: 200000, prior: 180000, indent: true, accountId: "payables", rowId: "payables", balanceAccounts: getBalanceAccounts("payables", 200000, 180000) },
        { label: "Dettes à court terme", current: 150000, prior: 140000, indent: true, accountId: "short_term_debt", rowId: "short_term_debt", balanceAccounts: getBalanceAccounts("short_term_debt", 150000, 140000) },
        { label: "Autres passifs courants", current: 100000, prior: 100000, indent: true, accountId: "other_liabilities", rowId: "other_liabilities", balanceAccounts: getBalanceAccounts("other_liabilities", 100000, 100000) },
        { label: "Total Passifs courants", current: currentLiabilities, prior: priorLiabilities, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
      ]
    } else if (period === "quarterly") {
      const currentRevenue = 825000
      const priorRevenue = 716000
      const currentAssets = 2550000
      const priorAssets = 2250000
      const currentLiabilities = 1350000
      const priorLiabilities = 1260000
      const workingCapital = currentAssets - currentLiabilities
      const priorWorkingCapital = priorAssets - priorLiabilities

      return [
        { label: "ACTIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Trésorerie et équivalents", current: 600000, prior: 540000, indent: true, accountId: "cash", rowId: "cash", balanceAccounts: getBalanceAccounts("cash", 600000, 540000) },
        { label: "Comptes clients", current: 1050000, prior: 900000, indent: true, accountId: "receivables", rowId: "receivables", balanceAccounts: getBalanceAccounts("receivables", 1050000, 900000) },
        { label: "Stocks", current: 450000, prior: 390000, indent: true, accountId: "inventory", rowId: "inventory", balanceAccounts: getBalanceAccounts("inventory", 450000, 390000) },
        { label: "Autres actifs courants", current: 450000, prior: 420000, indent: true, accountId: "other_assets", rowId: "other_assets", balanceAccounts: getBalanceAccounts("other_assets", 450000, 420000) },
        { label: "Total Actifs courants", current: currentAssets, prior: priorAssets, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        { label: "PASSIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Comptes fournisseurs", current: 600000, prior: 540000, indent: true, accountId: "payables", rowId: "payables", balanceAccounts: getBalanceAccounts("payables", 600000, 540000) },
        { label: "Dettes à court terme", current: 450000, prior: 420000, indent: true, accountId: "short_term_debt", rowId: "short_term_debt", balanceAccounts: getBalanceAccounts("short_term_debt", 450000, 420000) },
        { label: "Autres passifs courants", current: 300000, prior: 300000, indent: true, accountId: "other_liabilities", rowId: "other_liabilities", balanceAccounts: getBalanceAccounts("other_liabilities", 300000, 300000) },
        { label: "Total Passifs courants", current: currentLiabilities, prior: priorLiabilities, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
      ]
    } else {
      const currentRevenue = 3300000
      const priorRevenue = 2864000
      const currentAssets = 10200000
      const priorAssets = 9000000
      const currentLiabilities = 5400000
      const priorLiabilities = 5040000
      const workingCapital = currentAssets - currentLiabilities
      const priorWorkingCapital = priorAssets - priorLiabilities

      return [
        { label: "ACTIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Trésorerie et équivalents", current: 2400000, prior: 2160000, indent: true, accountId: "cash", rowId: "cash", balanceAccounts: getBalanceAccounts("cash", 2400000, 2160000) },
        { label: "Comptes clients", current: 4200000, prior: 3600000, indent: true, accountId: "receivables", rowId: "receivables", balanceAccounts: getBalanceAccounts("receivables", 4200000, 3600000) },
        { label: "Stocks", current: 1800000, prior: 1560000, indent: true, accountId: "inventory", rowId: "inventory", balanceAccounts: getBalanceAccounts("inventory", 1800000, 1560000) },
        { label: "Autres actifs courants", current: 1800000, prior: 1680000, indent: true, accountId: "other_assets", rowId: "other_assets", balanceAccounts: getBalanceAccounts("other_assets", 1800000, 1680000) },
        { label: "Total Actifs courants", current: currentAssets, prior: priorAssets, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        { label: "PASSIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Comptes fournisseurs", current: 2400000, prior: 2160000, indent: true, accountId: "payables", rowId: "payables", balanceAccounts: getBalanceAccounts("payables", 2400000, 2160000) },
        { label: "Dettes à court terme", current: 1800000, prior: 1680000, indent: true, accountId: "short_term_debt", rowId: "short_term_debt", balanceAccounts: getBalanceAccounts("short_term_debt", 1800000, 1680000) },
        { label: "Autres passifs courants", current: 1200000, prior: 1200000, indent: true, accountId: "other_liabilities", rowId: "other_liabilities", balanceAccounts: getBalanceAccounts("other_liabilities", 1200000, 1200000) },
        { label: "Total Passifs courants", current: currentLiabilities, prior: priorLiabilities, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
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
  
  // Find total current assets value for percentage calculations
  const totalCurrentAssetsRow = data.find((row) => row.label.toLowerCase().includes("total actifs courants") && row.isSubtotal)
  const totalCurrentAssetsCurrent = totalCurrentAssetsRow?.current || 1
  const totalCurrentAssetsPrior = totalCurrentAssetsRow?.prior || 1

  // Find total revenue value for percentage calculations
  const totalRevenueRow = data.find((row) => row.label.toLowerCase().includes("revenus totaux") && row.isSubtotal)
  
  const totalRevenueCurrent = totalRevenueRow?.current || 1
  const totalRevenuePrior = totalRevenueRow?.prior || 1

  // Calculate working capital from totals (current assets - current liabilities)
  const calculateWorkingCapital = (isPrior: boolean, trendIndex?: number): number => {
    const totalAssetsRow = data.find((row) => row.label.toLowerCase().includes("total actifs courants") && row.isSubtotal)
    const totalLiabilitiesRow = data.find((row) => row.label.toLowerCase().includes("total passifs courants") && row.isSubtotal)
    
    if (!totalAssetsRow || !totalLiabilitiesRow) return 0
    
    const assets = trendIndex !== undefined && totalAssetsRow.trendValues
      ? (totalAssetsRow.trendValues[trendIndex] || 0)
      : (isPrior ? totalAssetsRow.prior : totalAssetsRow.current)
    
    const liabilities = trendIndex !== undefined && totalLiabilitiesRow.trendValues
      ? (totalLiabilitiesRow.trendValues[trendIndex] || 0)
      : (isPrior ? totalLiabilitiesRow.prior : totalLiabilitiesRow.current)
    
    return assets - liabilities
  }

  // Helper function to calculate percentage of total current assets
  const getTotalCurrentAssetsPercentage = (value: number, isPrior: boolean): number => {
    const totalAssets = isPrior ? totalCurrentAssetsPrior : totalCurrentAssetsCurrent
    if (totalAssets === 0) return 0
    return (value / totalAssets) * 100
  }

  // Helper function to calculate percentage of revenue
  const getRevenuePercentage = (value: number, isPrior: boolean, trendIndex?: number): number => {
    let revenue = isPrior ? totalRevenuePrior : totalRevenueCurrent
    if (trendIndex !== undefined && totalRevenueRow?.trendValues) {
      revenue = totalRevenueRow.trendValues[trendIndex] || revenue
    }
    if (revenue === 0) return 0
    return (value / revenue) * 100
  }

  // Calculate working capital excluding unchecked accounts
  const calculateExcludedWorkingCapital = (isPrior: boolean, trendIndex?: number): number => {
    let includedAssets = 0
    let includedLiabilities = 0
    
    // Define which accountIds are assets
    const assetAccountIds = new Set(["cash", "receivables", "inventory", "other_assets"])
    
    data.forEach((row) => {
      if (!row.accountId) return // Skip rows without accountId (sections, totals, etc.)
      
      const isExcluded = excludedAccounts.has(row.accountId)
      if (isExcluded) return // Skip excluded accounts
      
      // Determine if this is an asset or liability based on accountId
      const isAsset = assetAccountIds.has(row.accountId)
      
      const value = trendIndex !== undefined && row.trendValues
        ? (row.trendValues[trendIndex] || 0)
        : (isPrior ? row.prior : row.current)
      
      if (isAsset) {
        includedAssets += value
      } else {
        includedLiabilities += value
      }
    })
    
    return includedAssets - includedLiabilities
  }

  // Calculate included assets and liabilities for ratio calculation
  const calculateIncludedAssetsAndLiabilities = (isPrior: boolean, trendIndex?: number): { assets: number; liabilities: number } => {
    let includedAssets = 0
    let includedLiabilities = 0
    
    // Define which accountIds are assets
    const assetAccountIds = new Set(["cash", "receivables", "inventory", "other_assets"])
    
    data.forEach((row) => {
      if (!row.accountId) return // Skip rows without accountId (sections, totals, etc.)
      
      const isExcluded = excludedAccounts.has(row.accountId)
      if (isExcluded) return // Skip excluded accounts
      
      // Determine if this is an asset or liability based on accountId
      const isAsset = assetAccountIds.has(row.accountId)
      
      const value = trendIndex !== undefined && row.trendValues
        ? (row.trendValues[trendIndex] || 0)
        : (isPrior ? row.prior : row.current)
      
      if (isAsset) {
        includedAssets += value
      } else {
        includedLiabilities += value
      }
    })
    
    return { assets: includedAssets, liabilities: includedLiabilities }
  }

  // Calculate working capital ratio (current assets / current liabilities)
  const calculateWorkingCapitalRatio = (isPrior: boolean, trendIndex?: number): number => {
    const totalAssetsRow = data.find((row) => row.label.toLowerCase().includes("total actifs courants") && row.isSubtotal)
    const totalLiabilitiesRow = data.find((row) => row.label.toLowerCase().includes("total passifs courants") && row.isSubtotal)
    
    if (!totalAssetsRow || !totalLiabilitiesRow) return 0
    
    const assets = trendIndex !== undefined && totalAssetsRow.trendValues
      ? (totalAssetsRow.trendValues[trendIndex] || 0)
      : (isPrior ? totalAssetsRow.prior : totalAssetsRow.current)
    
    const liabilities = trendIndex !== undefined && totalLiabilitiesRow.trendValues
      ? (totalLiabilitiesRow.trendValues[trendIndex] || 0)
      : (isPrior ? totalLiabilitiesRow.prior : totalLiabilitiesRow.current)
    
    if (liabilities === 0) return 0
    return assets / liabilities
  }

  // Calculate excluded working capital ratio (included assets / included liabilities)
  const calculateExcludedWorkingCapitalRatio = (isPrior: boolean, trendIndex?: number): number => {
    const { assets, liabilities } = calculateIncludedAssetsAndLiabilities(isPrior, trendIndex)
    if (liabilities === 0) return 0
    return assets / liabilities
  }

  // Helper function to get number of days based on period
  const getDaysInPeriod = (): number => {
    if (view === "12months" || view === "24months") return 30 // Monthly view
    if (view === "years") return 365 // Annual view
    // For current view, use period
    if (period === "monthly") return 30
    if (period === "quarterly") return 90
    return 365 // annual
  }

  // Calculate Days Sales Outstanding (DSO) - Délai de recouvrement des clients
  const calculateDSO = (isPrior: boolean, trendIndex?: number): number => {
    const receivablesRow = data.find((row) => row.accountId === "receivables")
    const revenueRow = data.find((row) => row.label.toLowerCase().includes("revenus totaux") && row.isSubtotal)
    
    if (!receivablesRow || !revenueRow) return 0
    
    const receivables = trendIndex !== undefined && receivablesRow.trendValues
      ? (receivablesRow.trendValues[trendIndex] || 0)
      : (isPrior ? receivablesRow.prior : receivablesRow.current)
    
    const revenue = trendIndex !== undefined && revenueRow.trendValues
      ? (revenueRow.trendValues[trendIndex] || 0)
      : (isPrior ? revenueRow.prior : revenueRow.current)
    
    if (revenue === 0) return 0
    const days = getDaysInPeriod()
    return (receivables / revenue) * days
  }

  // Calculate Days Inventory Outstanding (DIO) - Délai de rotation des stocks
  const calculateDIO = (isPrior: boolean, trendIndex?: number): number => {
    const inventoryRow = data.find((row) => row.accountId === "inventory")
    const revenueRow = data.find((row) => row.label.toLowerCase().includes("revenus totaux") && row.isSubtotal)
    
    if (!inventoryRow || !revenueRow) return 0
    
    const inventory = trendIndex !== undefined && inventoryRow.trendValues
      ? (inventoryRow.trendValues[trendIndex] || 0)
      : (isPrior ? inventoryRow.prior : inventoryRow.current)
    
    const revenue = trendIndex !== undefined && revenueRow.trendValues
      ? (revenueRow.trendValues[trendIndex] || 0)
      : (isPrior ? revenueRow.prior : revenueRow.current)
    
    // Estimate cost of goods sold as 60% of revenue (typical ratio)
    const cogs = revenue * 0.6
    
    if (cogs === 0) return 0
    const days = getDaysInPeriod()
    return (inventory / cogs) * days
  }

  // Calculate Days Payable Outstanding (DPO) - Délai de paiement des fournisseurs
  const calculateDPO = (isPrior: boolean, trendIndex?: number): number => {
    const payablesRow = data.find((row) => row.accountId === "payables")
    const revenueRow = data.find((row) => row.label.toLowerCase().includes("revenus totaux") && row.isSubtotal)
    
    if (!payablesRow || !revenueRow) return 0
    
    const payables = trendIndex !== undefined && payablesRow.trendValues
      ? (payablesRow.trendValues[trendIndex] || 0)
      : (isPrior ? payablesRow.prior : payablesRow.current)
    
    const revenue = trendIndex !== undefined && revenueRow.trendValues
      ? (revenueRow.trendValues[trendIndex] || 0)
      : (isPrior ? revenueRow.prior : revenueRow.current)
    
    // Estimate cost of goods sold as 60% of revenue (typical ratio)
    const cogs = revenue * 0.6
    
    if (cogs === 0) return 0
    const days = getDaysInPeriod()
    return (payables / cogs) * days
  }

  // Calculate Cash Conversion Cycle (CCC) - Cycle de conversion de l'encaisse
  const calculateCCC = (isPrior: boolean, trendIndex?: number): number => {
    const dso = calculateDSO(isPrior, trendIndex)
    const dio = calculateDIO(isPrior, trendIndex)
    const dpo = calculateDPO(isPrior, trendIndex)
    return dso + dio - dpo
  }

  // Helper function to generate descriptive text
  const getDescriptionText = (): string => {
    const parts: string[] = []

    // Horizon/Period
    if (view === "current") parts.push("Vue courante")
    else if (view === "12months") parts.push("12 derniers mois")
    else if (view === "24months") parts.push("24 derniers mois")
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
      parts.push("• % des actifs courants totaux")
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
    if (view === "current" && period === "monthly") return "Courant"
    if (view === "current" && period === "quarterly") return "Trimestriel"
    if (view === "current" && period === "annual") return "Annuel"
    if (view === "12months") return "12 mois"
    if (view === "24months") return "24 mois"
    if (view === "years") return "5 ans"
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
              <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">
                {workingCapitalType === "FdRHC" ? "Composition du fonds de roulement hors caisse" : "Composition du fonds de roulement"}
              </h2>
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
          <Select value={workingCapitalType} onValueChange={(value: "FDR" | "FdRHC") => setWorkingCapitalType(value)}>
            <SelectTrigger className="w-[120px] h-8 text-xs border-slate-300 text-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FDR">FDR</SelectItem>
              <SelectItem value="FdRHC">FdRHC</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm w-2/5">Compte</th>
              {view === "current" && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm w-[140px]">Courant</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm w-[140px]">Passé</th>
                </>
              )}
              {view === "12months" && (
                <>
                  {getMonthLabels(12).map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap w-[100px]">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {view === "24months" && (
                <>
                  {getMonthLabels(24).map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap w-[100px]">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {view === "years" && (
                <>
                  {getYearLabels().map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap w-[100px]">
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
              const nextRowIsSubtotal = idx < data.length - 1 && data[idx + 1].isSubtotal
              const nextRowIsResult = idx < data.length - 1 && data[idx + 1].isResult
              
              // Check if this row can be expanded and if it's expanded
              const canExpand = !!row.rowId && !!row.balanceAccounts && row.balanceAccounts.length > 0
              const isExpanded = row.rowId ? expandedRows.has(row.rowId) : false

              return (
                <>
                  <tr key={idx} className={cn(
                    "border-b",
                    row.label === "" ? "h-2 border-slate-200" : "",
                    (nextRowIsSubtotal || nextRowIsResult) ? "border-slate-900 border-b-2" : "border-slate-200",
                    canExpand && "hover:bg-slate-50 cursor-pointer"
                  )}
                  onClick={() => canExpand && toggleRow(row.rowId!)}
                  >
                    <td
                      className={`px-6 py-3 ${row.isBold ? "font-bold text-slate-900" : "text-slate-700"} ${row.indent ? "pl-12" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        {canExpand && (
                          <span className="flex-shrink-0">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-500" />
                            )}
                          </span>
                        )}
                        {!canExpand && row.indent && <span className="w-4"></span>}
                        <span className="flex-1">{displayLabel}</span>
                      </div>
                    </td>
                  {view === "current" && (
                    <>
                      <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                        {row.current !== 0 ? formatCurrency(row.current) : "-"}
                      </td>
                      <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                        {row.prior !== 0 ? formatCurrency(row.prior) : "-"}
                      </td>
                    </>
                  )}

                  {/* Trend Views - 12 months, 24 months, years */}
                  {view === "12months" && row.trendValues && (
                    <>
                      {row.trendValues.map((value, valueIdx) => (
                        <td
                          key={valueIdx}
                          className={`px-4 py-3 text-right text-sm w-[100px] ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {value !== 0 ? formatCurrency(value) : "-"}
                        </td>
                      ))}
                    </>
                  )}
                  {view === "24months" && row.trendValues && (
                    <>
                      {row.trendValues.map((value, valueIdx) => (
                        <td
                          key={valueIdx}
                          className={`px-4 py-3 text-right text-sm w-[100px] ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}
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
                          className={`px-4 py-3 text-right text-sm w-[100px] ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {value !== 0 ? formatCurrency(value) : "-"}
                        </td>
                      ))}
                    </>
                  )}
                  {/* Empty cells for spacer rows in trend views */}
                  {(view === "12months" || view === "24months" || view === "years") && !row.trendValues && (
                    <>
                      {Array.from({ length: view === "12months" ? 12 : view === "24months" ? 24 : 6 }).map((_, idx) => (
                        <td key={idx} className={`px-4 py-3 text-right font-mono text-sm w-[100px] ${shouldHideAmounts ? "text-white" : "text-slate-400"}`}>
                          -
                        </td>
                      ))}
                    </>
                  )}
                </tr>
                  {/* Expanded balance accounts */}
                  {isExpanded && row.balanceAccounts && row.balanceAccounts.length > 0 && (
                    <>
                      {row.balanceAccounts.map((account, accIdx) => {
                        const accountVariation = account.priorAmount !== undefined && account.amount && account.priorAmount
                          ? calculateVariation(account.amount, account.priorAmount)
                          : null
                        const accountVariationAmount = account.priorAmount !== undefined && account.amount && account.priorAmount
                          ? account.amount - account.priorAmount
                          : 0
                        
                        // Calculate trend values for account if parent has trend values
                        const accountTrendValues = row.trendValues && account.proportion
                          ? row.trendValues.map(val => Math.round(val * account.proportion!))
                          : undefined
                        
                        return (
                          <tr key={`${idx}-account-${accIdx}`} className="bg-slate-50 border-b border-slate-200">
                            <td className="px-6 py-2 text-slate-500 pl-20">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-slate-500">{account.accountNumber}</span>
                                <span className="text-sm">{account.accountName}</span>
                              </div>
                            </td>
                            
                            {view === "current" && (
                              <>
                                <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                  {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                                </td>
                                <td className="px-6 py-2 text-right font-semibold text-sm text-slate-500">
                                  {account.priorAmount !== undefined && account.priorAmount !== 0 ? formatCurrency(account.priorAmount) : "-"}
                                </td>
                              </>
                            )}

                            {/* Trend Views - 12 months, 24 months, years */}
                            {view === "12months" && accountTrendValues && (
                              <>
                                {accountTrendValues.map((value, valueIdx) => (
                                  <td
                                    key={valueIdx}
                                    className="px-4 py-2 text-right text-sm w-[100px] text-slate-700"
                                  >
                                    {value !== 0 ? formatCurrency(value) : "-"}
                                  </td>
                                ))}
                              </>
                            )}
                            {view === "24months" && accountTrendValues && (
                              <>
                                {accountTrendValues.map((value, valueIdx) => (
                                  <td
                                    key={valueIdx}
                                    className="px-4 py-2 text-right text-sm w-[100px] text-slate-700"
                                  >
                                    {value !== 0 ? formatCurrency(value) : "-"}
                                  </td>
                                ))}
                              </>
                            )}
                            {view === "years" && accountTrendValues && (
                              <>
                                {accountTrendValues.map((value, valueIdx) => (
                                  <td
                                    key={valueIdx}
                                    className="px-4 py-2 text-right text-sm w-[100px] text-slate-700"
                                  >
                                    {value !== 0 ? formatCurrency(value) : "-"}
                                  </td>
                                ))}
                              </>
                            )}
                            {/* Empty cells for spacer rows in trend views */}
                            {(view === "12months" || view === "24months" || view === "years") && !accountTrendValues && (
                              <>
                                {Array.from({ length: view === "12months" ? 12 : view === "24months" ? 24 : 6 }).map((_, idx) => (
                                  <td key={idx} className="px-4 py-2 text-right font-mono text-sm w-[100px] text-slate-400">
                                    -
                                  </td>
                                ))}
                              </>
                            )}
                          </tr>
                        )
                      })}
                    </>
                  )}
                </>
              )
            })}
            {/* Working Capital Sections - Removed per user request */}
            {(() => {
              return null
            })()}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 px-8 py-4 border-t border-slate-200">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 p-1.5 bg-blue-100 rounded-md">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            <span className="font-medium text-slate-700">Note:</span> Fonds de roulement = Actifs courants - Passifs courants. 
          Les données affichées sont à titre informatif.
        </p>
        </div>
      </div>
    </div>
  )
}

