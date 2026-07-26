"use client"

import { Fragment, useState, useEffect } from "react"
import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, ReferenceArea, ResponsiveContainer, Cell } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronRight, ChevronDown, LayoutList } from "lucide-react"
import { getFinancialStatementSeries, type FinancialStatementSeriesParams } from "@/lib/api"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { getRowAmounts, getPeriodLabels, aggregateToYears } from "@/lib/series-utils"
import {
  dashboardCardAccentClass,
  dashboardCardBodyMutedClass,
  dashboardCardFrameStaticClass,
  dashboardCardHeaderBarClass,
  dashboardCardHeaderIconBoxClass,
  dashboardCardRingClass,
  dashboardCardTitleClass,
} from "@/lib/dashboard-card-style"

interface WorkingCapitalDetailProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "12months" | "24months" | "years"
  columnMode?: "variations" | "percentage" | "comparison"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  fiscalYear?: number
  /** Mois calendaire (1–12) de la date de référence — borne la série (pas de mois futurs). */
  referenceMonth?: number
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
  fiscalYear,
  referenceMonth,
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
  
  // Fetch series data for multi-period views
  const resolvedYear = fiscalYear ?? new Date().getFullYear()
  const resolvedMonth = referenceMonth ?? new Date().getMonth() + 1
  const isMultiPeriod = view === "12months" || view === "24months" || view === "years"
  const monthsNeeded = view === "24months" ? 24 : view === "years" ? 60 : 12

  const { rows: seriesRows, periods, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "balance-sheet",
    fiscalYear: resolvedYear,
    month: resolvedMonth,
    months: monthsNeeded,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: isMultiPeriod,
  })

  // Convert series data into DetailRow[] format
  const getSeriesData = (): DetailRow[] | null => {
    if (!isMultiPeriod || seriesLoading || seriesRows.length === 0) return null

    const rows: DetailRow[] = []
    for (const sr of seriesRows) {
      const rawAmounts = getRowAmounts(sr, periods)
      let trendValues: number[]

      if (view === "years") {
        const agg = aggregateToYears(rawAmounts, periods)
        trendValues = agg.amounts
      } else {
        trendValues = rawAmounts
      }

      const detailRow: DetailRow = {
        label: sr.label,
        current: trendValues.length > 0 ? trendValues[trendValues.length - 1] : 0,
        prior: trendValues.length > 1 ? trendValues[trendValues.length - 2] : 0,
        isBold: sr.isBold,
        isSection: sr.isSection,
        isResult: sr.isResult,
        indent: !sr.isBold && !sr.isSection && !sr.isResult,
        trendValues,
        accountId: sr.id,
        rowId: (sr.detailRows?.length ?? 0) > 0 ? sr.id : undefined,
        balanceAccounts: (sr.detailRows?.length ?? 0) > 0 ? sr.detailRows!.map((dr) => {
          const drAmounts = periods.map((p) => dr.amounts[`${p.fiscalYear}-${p.fiscalMonth}`] || 0)
          return {
            accountNumber: dr.id,
            accountName: dr.label,
            amount: drAmounts.length > 0 ? drAmounts[drAmounts.length - 1] : 0,
            priorAmount: drAmounts.length > 1 ? drAmounts[drAmounts.length - 2] : 0,
            proportion: undefined,
          }
        }) : undefined,
      }

      if (sr.isBold && !sr.isSection) {
        detailRow.isSubtotal = true
        detailRow.indent = false
      }

      rows.push(detailRow)
    }
    return rows
  }

  // Get period labels for multi-period headers
  const getSeriesPeriodLabels = (): string[] => {
    if (periods.length === 0) return []
    if (view === "years") {
      const rawAmounts = seriesRows.length > 0 ? getRowAmounts(seriesRows[0], periods) : []
      const agg = aggregateToYears(rawAmounts, periods)
      return agg.labels
    }
    return getPeriodLabels(periods)
  }

  const getDetailData = (): DetailRow[] => {
    // Return real series data when available
    if (isMultiPeriod) {
      const seriesData = getSeriesData()
      if (seriesData) return seriesData
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
            fiscal_year: resolvedYear,
            month: resolvedMonth,
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
            "balance-sheet",
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
                isResult: row.isResult,
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
  }, [isComparisonMode, companies, companyId, divisionId, isCompanyComparison, isDivisionComparison, isSubDivisionComparison, resolvedYear, resolvedMonth])

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
    <div className={cn("w-full", dashboardCardFrameStaticClass)}>
      <div className={dashboardCardRingClass} aria-hidden />
      {/* Header */}
      <div className={cn("px-6 py-5 sm:px-7", dashboardCardHeaderBarClass)}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className={dashboardCardHeaderIconBoxClass}>
              <LayoutList className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className={cn("mb-1 text-xl leading-tight", dashboardCardTitleClass)}>
                {workingCapitalType === "FdRHC" ? "Composition du fonds de roulement hors caisse" : "Composition du fonds de roulement"}
              </h2>
              <div className={cn("flex flex-wrap items-center gap-3 text-sm", dashboardCardBodyMutedClass)}>
                <span className="font-medium text-[#2A2F3A]">{getHorizonText()}</span>
                <span className="text-slate-400">•</span>
                {subDivisionId && divisionId && companyId ? (
                  <>
                    <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                    <span className="text-slate-400">•</span>
                    <span>{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name || "Division"}</span>
                    <span className="text-slate-400">•</span>
                    <span className={cn("font-semibold", dashboardCardAccentClass)}>{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.subDivisions.find((sd) => sd.id === subDivisionId)?.name || "Sous-division"}</span>
                  </>
                ) : divisionId && companyId ? (
                  <>
                    <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                    <span className="text-slate-400">•</span>
                    <span className={cn("font-semibold", dashboardCardAccentClass)}>{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name || "Division"}</span>
                  </>
                ) : companyId ? (
                  <span className={cn("font-semibold", dashboardCardAccentClass)}>{companies.find((c) => c.id === companyId)?.name || "Société sélectionnée"}</span>
                ) : (
                  <span className="truncate">Toutes les sociétés</span>
                )}
              </div>
            </div>
          </div>
          <Select value={workingCapitalType} onValueChange={(value: "FDR" | "FdRHC") => setWorkingCapitalType(value)}>
            <SelectTrigger className="h-8 w-[120px] border-2 border-slate-700/70 text-xs font-semibold text-[#2A2F3A]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FDR">FDR</SelectItem>
              <SelectItem value="FdRHC">FdRHC</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading state */}
      {isMultiPeriod && seriesLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#E0742D]" />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-white">
        <table className="w-full [&_th]:sticky [&_th]:top-0 [&_th]:z-10">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="w-2/5 px-6 py-4 text-left text-sm font-semibold text-[#2A2F3A]">Compte</th>
              {view === "current" && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm w-[140px]">Courant</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm w-[140px]">Passé</th>
                </>
              )}
              {view === "12months" && (
                <>
                  {(getSeriesData() ? getSeriesPeriodLabels() : getMonthLabels(12)).map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap w-[100px]">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {view === "24months" && (
                <>
                  {(getSeriesData() ? getSeriesPeriodLabels() : getMonthLabels(24)).map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap w-[100px]">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {view === "years" && (
                <>
                  {(getSeriesData() ? getSeriesPeriodLabels() : getYearLabels()).map((label, idx) => (
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
                <Fragment key={idx}>
                  <tr className={cn(
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
                </Fragment>
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

