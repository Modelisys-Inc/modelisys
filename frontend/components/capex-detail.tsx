"use client"

import { Fragment, useState, useEffect } from "react"
import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronRight, ChevronDown, StickyNote } from "lucide-react"
import { NoteModal } from "@/components/note-modal"
import { getNoteByRowId, useNotesCache } from "@/lib/notes-storage"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { getRowAmounts, getPeriodLabels, aggregateToQuarters, aggregateToYears } from "@/lib/series-utils"
import { listForecastConfigs } from "@/lib/api"

type ComparisonType = "lastMonth" | "pastMonth" | "budget"

interface CapexDetailProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "12months" | "24months" | "years"
  columnMode?: "variations" | "percentage" | "comparison"
  displayMode?: "cost" | "book_value" | "capex"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  comparisonType?: ComparisonType
  selectedBudgetId?: string | null
  selectedBudgetName?: string | null
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

export function CapexDetail({
  period,
  view,
  columnMode = "variations",
  displayMode = "cost",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  comparisonType = "lastMonth",
  selectedBudgetId = null,
  selectedBudgetName = null,
}: CapexDetailProps) {
  useNotesCache(companyId ?? null)
  // State to track expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  // State for note modal
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [selectedRowLabel, setSelectedRowLabel] = useState<string>("")
  const [selectedRowFinancialData, setSelectedRowFinancialData] = useState<{
    currentAmount?: number | null
    priorAmount?: number | null
    variationPercent?: number | null
    variationAmount?: number | null
  }>({})
  const [notesUpdated, setNotesUpdated] = useState(0) // Force re-render when notes change
  // Depreciation factors loaded from forecast_configs (for book_value mode)
  const [depreciationFactors, setDepreciationFactors] = useState<Record<string, number>>({})

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
  
  // Helper function to check if notes are allowed for this view and display mode
  const isNoteAllowed = (): boolean => {
    return view === "current" && displayMode === "capex"
  }

  // Helper function to get comparison label
  const getComparisonLabel = (): string => {
    if (comparisonType === "lastMonth") {
      if (period === "monthly") return "Mois dernier"
      if (period === "quarterly") return "Trimestre dernier"
      return "Année dernière"
    }
    if (comparisonType === "pastMonth") {
      if (period === "monthly") return "Mois passé"
      if (period === "quarterly") return "Trimestre passé"
      return "Année passée"
    }
    if (comparisonType === "budget") {
      if (selectedBudgetName) {
        return `Budget ${selectedBudgetName}`
      }
      if (period === "monthly") return "Mois budgeté"
      if (period === "quarterly") return "Trimestre budgeté"
      return "Année budgetée"
    }
    return "Passé"
  }

  // Helper function to get comparison prior value based on comparisonType
  const getComparisonPriorValue = (basePrior: number): number => {
    // Prior values already come correctly from the API based on the comparison type
    return basePrior
  }

  // Fetch series data for multi-period views
  const currentYear = new Date().getFullYear()
  const isMultiPeriod = view === "12months" || view === "24months" || view === "years"
  const monthsNeeded = view === "24months" ? 24 : view === "years" ? 60 : 12

  const { rows: seriesRows, periods, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "balance-sheet",
    fiscalYear: currentYear,
    months: monthsNeeded,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: isMultiPeriod,
  })

  // Fetch income statement series for real depreciation and EBITDA data
  const { rows: isSeriesRows, periods: isPeriods } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "income-statement",
    fiscalYear: currentYear,
    months: monthsNeeded > 12 ? monthsNeeded : 12,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: true,
  })

  // Load depreciation factors from forecast_configs on mount
  useEffect(() => {
    if (!companyId) return
    let cancelled = false

    const loadFactors = async () => {
      try {
        const configs = await listForecastConfigs(companyId, { config_type: "capex-depreciation" })
        if (!cancelled && configs.length > 0) {
          const data = configs[0].data as Record<string, unknown>
          if (data.factors) {
            setDepreciationFactors(data.factors as Record<string, number>)
          }
        }
      } catch (err) {
        console.error("Error loading capex depreciation config:", err)
      }
    }

    loadFactors()
    return () => { cancelled = true }
  }, [companyId])

  // Convert series data into DetailRow[] format for multi-period views
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
        rowId: sr.detailRows.length > 0 ? sr.id : undefined,
        balanceAccounts: sr.detailRows.length > 0 ? sr.detailRows.map((dr) => {
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

      // Mark subtotal rows
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

  // Helper function to transform data based on display mode
  const transformDataForDisplayMode = (rows: DetailRow[]): DetailRow[] => {
    if (displayMode === "cost") {
      // Cost mode: keep values as is
      return rows
    } else if (displayMode === "book_value") {
      // Book value mode: apply depreciation factor from config or computed from data
      const transformed = rows.map((row) => {
        if (row.isSection || row.label === "" || !row.accountId) {
          return row // Keep sections and spacers as is
        }

        // Determine depreciation factor: stored config > computed from sub-rows > default 0.8
        let depreciationFactor = 0.8
        if (row.accountId && depreciationFactors[row.accountId] !== undefined) {
          depreciationFactor = depreciationFactors[row.accountId]
        } else if (row.balanceAccounts && row.balanceAccounts.length > 0) {
          // Try to compute from accumulated depreciation sub-rows
          const depAccounts = row.balanceAccounts.filter((a) =>
            a.accountName.toLowerCase().includes("amortissement") ||
            a.accountName.toLowerCase().includes("dépréciation") ||
            a.accountName.toLowerCase().includes("depreciation")
          )
          if (depAccounts.length > 0 && row.current !== 0) {
            const totalDepreciation = depAccounts.reduce((sum, a) => sum + Math.abs(a.amount), 0)
            const grossAmount = Math.abs(row.current) + totalDepreciation
            if (grossAmount > 0) {
              depreciationFactor = Math.abs(row.current) / grossAmount
            }
          }
        }

        return {
          ...row,
          current: Math.round(row.current * depreciationFactor),
          prior: Math.round(row.prior * depreciationFactor),
          trendValues: row.trendValues?.map((val) => Math.round(val * depreciationFactor)),
        }
      })
      
      // Recalculate totals for book value mode
      return transformed.map((row) => {
        if (row.isSubtotal && row.accountId) {
          // Find all rows with the same parent account type
          const accountType = row.accountId.includes("fixed_assets") ? "fixed" : "intangible"
          const childRows = transformed.filter((r) => {
            if (!r.accountId || r.isSubtotal) return false
            if (accountType === "fixed") {
              return ["land_buildings", "equipment", "vehicles", "other_fixed"].includes(r.accountId)
            } else {
              return ["patents", "software", "goodwill"].includes(r.accountId)
            }
          })
          
          const currentTotal = childRows.reduce((sum, r) => sum + r.current, 0)
          const priorTotal = childRows.reduce((sum, r) => sum + r.prior, 0)
          const trendTotals = row.trendValues?.map((_, idx) => 
            childRows.reduce((sum, r) => sum + (r.trendValues?.[idx] || 0), 0)
          )
          
          return {
            ...row,
            current: currentTotal,
            prior: priorTotal,
            trendValues: trendTotals,
          }
        }
        return row
      })
    } else {
      // Capex mode: show variations (current - prior)
      const transformed = rows.map((row) => {
        if (row.isSection || row.label === "" || !row.accountId) {
          return row // Keep sections and spacers as is
        }
        
        return {
          ...row,
          current: row.current - row.prior,
          prior: 0, // In capex mode, prior is not shown
          trendValues: row.trendValues?.map((val, idx) => {
            if (idx === 0) return val - row.prior
            return val - (row.trendValues?.[idx - 1] || row.prior)
          }),
        }
      })
      
      // Recalculate totals for capex mode (sum of variations)
      return transformed.map((row) => {
        if (row.isSubtotal && row.accountId) {
          // Find all rows with the same parent account type
          const accountType = row.accountId.includes("fixed_assets") ? "fixed" : "intangible"
          const childRows = transformed.filter((r) => {
            if (!r.accountId || r.isSubtotal) return false
            if (accountType === "fixed") {
              return ["land_buildings", "equipment", "vehicles", "other_fixed"].includes(r.accountId)
            } else {
              return ["patents", "software", "goodwill"].includes(r.accountId)
            }
          })
          
          const currentTotal = childRows.reduce((sum, r) => sum + r.current, 0)
          const trendTotals = row.trendValues?.map((_, idx) => 
            childRows.reduce((sum, r) => sum + (r.trendValues?.[idx] || 0), 0)
          )
          
          return {
            ...row,
            current: currentTotal,
            prior: 0,
            trendValues: trendTotals,
          }
        }
        return row
      })
    }
  }

  const rawData = getDetailData()
  const data = transformDataForDisplayMode(rawData)
  
  // Helper function to calculate average for a row in capex mode
  const calculateAverageForRow = (row: DetailRow): number => {
    if (displayMode !== "capex" || !row.accountId || row.isSection || row.label === "") {
      return 0
    }
    
    // Find the original row data (before transformation)
    const originalRow = rawData.find((r) => r.accountId === row.accountId)
    if (!originalRow) return 0
    
    if (view === "current") {
      // For current view, average is the variation itself (current - prior)
      return originalRow.current - originalRow.prior
    } else if (view === "12months" && originalRow.trendValues) {
      // Calculate average of all variations
      const variations = originalRow.trendValues.map((val, idx) => {
        if (idx === 0) return val - originalRow.prior
        return val - (originalRow.trendValues?.[idx - 1] || originalRow.prior)
      })
      return variations.reduce((sum, val) => sum + val, 0) / variations.length
    } else if (view === "24months" && originalRow.trendValues) {
      // Calculate average of all variations
      const variations = originalRow.trendValues.map((val, idx) => {
        if (idx === 0) return val - originalRow.prior
        return val - (originalRow.trendValues?.[idx - 1] || originalRow.prior)
      })
      return variations.reduce((sum, val) => sum + val, 0) / variations.length
    } else if (view === "years" && originalRow.trendValues) {
      // Calculate average of all variations
      const variations = originalRow.trendValues.map((val, idx) => {
        if (idx === 0) return val - originalRow.prior
        return val - (originalRow.trendValues?.[idx - 1] || originalRow.prior)
      })
      return variations.reduce((sum, val) => sum + val, 0) / variations.length
    }
    
    return 0
  }
  
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
  
  // Find total fixed assets value for percentage calculations (sum of corporelles and incorporelles)
  const totalCorporellesRow = data.find((row) => row.label.toLowerCase().includes("total immobilisations corporelles") && row.isSubtotal)
  const totalIncorporellesRow = data.find((row) => row.label.toLowerCase().includes("total immobilisations incorporelles") && row.isSubtotal)
  const totalFixedAssetsCurrent = (totalCorporellesRow?.current || 0) + (totalIncorporellesRow?.current || 0) || 1
  const totalFixedAssetsPrior = (totalCorporellesRow?.prior || 0) + (totalIncorporellesRow?.prior || 0) || 1

  // Find total revenue value for percentage calculations
  const totalRevenueRow = data.find((row) => row.label.toLowerCase().includes("revenus totaux") && row.isSubtotal)
  const totalRevenueCurrent = totalRevenueRow?.current || 1
  const totalRevenuePrior = totalRevenueRow?.prior || 1

  // Calculate total fixed assets
  const calculateTotalFixedAssets = (isPrior: boolean, trendIndex?: number): number => {
    let totalAssets = 0
    
    data.forEach((row) => {
      if (!row.accountId) return // Skip rows without accountId (sections, totals, etc.)
      
      const value = trendIndex !== undefined && row.trendValues
        ? (row.trendValues[trendIndex] || 0)
        : (isPrior ? row.prior : row.current)
      
      totalAssets += value
    })
    
    return totalAssets
  }

  // Helper function to calculate percentage of total fixed assets
  const getTotalFixedAssetsPercentage = (value: number, isPrior: boolean): number => {
    const totalAssets = isPrior ? totalFixedAssetsPrior : totalFixedAssetsCurrent
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

  // Helper function to get revenue for a period
  const getRevenueForPeriod = (trendIndex?: number): number => {
    if (trendIndex !== undefined && totalRevenueRow?.trendValues) {
      return totalRevenueRow.trendValues[trendIndex] || totalRevenueCurrent
    }
    return totalRevenueCurrent
  }

  // Helper function to calculate depreciation from real income statement data
  const calculateDepreciation = (isPrior: boolean, trendIndex?: number): number => {
    // Find amortization/depreciation row in income statement
    const depRow = isSeriesRows.find((r) =>
      r.label.toLowerCase().includes("amortissement") ||
      r.label.toLowerCase().includes("dépréciation") ||
      r.label.toLowerCase().includes("depreciation")
    )
    if (depRow && isPeriods.length > 0) {
      const amounts = getRowAmounts(depRow, isPeriods)
      if (trendIndex !== undefined && amounts[trendIndex] !== undefined) {
        return Math.abs(amounts[trendIndex])
      }
      // For current/prior: use last or second-to-last period
      if (isPrior && amounts.length > 1) return Math.abs(amounts[amounts.length - 2])
      if (amounts.length > 0) return Math.abs(amounts[amounts.length - 1])
    }
    // Fallback: estimate from total fixed assets at 8%
    const totalAssets = calculateTotalFixedAssets(isPrior, trendIndex)
    return totalAssets * 0.08
  }

  // Helper function to calculate EBITDA (BAIIA) from real income statement data
  const calculateEBITDA = (isPrior: boolean, trendIndex?: number): number => {
    // Find EBITDA/BAIIA row in income statement
    const ebitdaRow = isSeriesRows.find((r) =>
      r.label.toLowerCase().includes("baiia") ||
      r.label.toLowerCase().includes("ebitda")
    )
    if (ebitdaRow && isPeriods.length > 0) {
      const amounts = getRowAmounts(ebitdaRow, isPeriods)
      if (trendIndex !== undefined && amounts[trendIndex] !== undefined) {
        return amounts[trendIndex]
      }
      if (isPrior && amounts.length > 1) return amounts[amounts.length - 2]
      if (amounts.length > 0) return amounts[amounts.length - 1]
    }
    // Fallback: estimate as 20% of revenue
    const revenue = trendIndex !== undefined && totalRevenueRow?.trendValues
      ? totalRevenueRow.trendValues[trendIndex] || totalRevenueCurrent
      : (isPrior ? totalRevenuePrior : totalRevenueCurrent)
    return revenue * 0.20
  }

  // Helper function to calculate Operating Cash Flow (Flux de trésorerie reliés aux opérations)
  // OCF = EBITDA - Depreciation
  const calculateOperatingCashFlow = (isPrior: boolean, trendIndex?: number): number => {
    const ebitda = calculateEBITDA(isPrior, trendIndex)
    const depreciation = calculateDepreciation(isPrior, trendIndex)
    return ebitda - depreciation
  }

  // Helper function to get value for a specific asset category
  const getAssetValue = (accountId: string, isPrior: boolean, trendIndex?: number): number => {
    const row = data.find((r) => r.accountId === accountId)
    if (!row) return 0
    
    if (trendIndex !== undefined && row.trendValues) {
      return row.trendValues[trendIndex] || 0
    }
    return isPrior ? row.prior : row.current
  }

  // Helper function to calculate Capex for a specific asset category or total
  const calculateCapexForAsset = (accountId: string | "total", isPrior: boolean, trendIndex?: number): number => {
    if (accountId === "total") {
      // Use existing calculateCapex for total
      return calculateCapex(isPrior, trendIndex)
    }
    
    // Calculate Capex for specific asset category
    if (displayMode === "capex") {
      // In capex mode, the data is already transformed to show variations
      return getAssetValue(accountId, isPrior, trendIndex)
    } else {
      // Calculate variation: current - prior
      if (trendIndex !== undefined) {
        // For trend views, calculate variation from previous period
        const current = getAssetValue(accountId, false, trendIndex)
        const prior = trendIndex > 0 
          ? getAssetValue(accountId, false, trendIndex - 1)
          : getAssetValue(accountId, true)
        return current - prior
      } else {
        // For current view, calculate variation from prior period
        const current = getAssetValue(accountId, false)
        const prior = getAssetValue(accountId, true)
        return current - prior
      }
    }
  }

  // Helper function to calculate Capex (variation in fixed assets)
  const calculateCapex = (isPrior: boolean, trendIndex?: number): number => {
    if (displayMode === "capex") {
      // In capex mode, the data is already transformed to show variations
      return calculateTotalFixedAssets(isPrior, trendIndex)
    } else {
      // Calculate variation: current - prior
      if (trendIndex !== undefined) {
        // For trend views, calculate variation from previous period
        const current = calculateTotalFixedAssets(false, trendIndex)
        const prior = trendIndex > 0 
          ? calculateTotalFixedAssets(false, trendIndex - 1)
          : calculateTotalFixedAssets(true)
        return current - prior
      } else {
        // For current view, calculate variation from prior period
        const current = calculateTotalFixedAssets(false)
        const prior = calculateTotalFixedAssets(true)
        return current - prior
      }
    }
  }

  // Helper function to get display mode label
  const getDisplayModeLabel = (): string => {
    if (displayMode === "cost") {
      return "Coût"
    } else if (displayMode === "book_value") {
      return "Valeur comptable"
    } else {
      return "Capex (Variations)"
    }
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

    // Display mode
    if (displayMode === "cost") {
      parts.push("• Coût")
    } else if (displayMode === "book_value") {
      parts.push("• Valeur comptable")
    } else {
      parts.push("• Capex (Variations)")
    }

    // Column mode
    if (columnMode === "comparison") {
      // Already handled above
    } else if (columnMode === "percentage") {
      parts.push("• % des immobilisations totales")
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
    <div className="w-full bg-white">
      {/* Header */}
      <div className="bg-white px-8 py-5 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">Détail des immobilisations - {getDisplayModeLabel()}</h2>
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

      {/* Loading state */}
      {isMultiPeriod && seriesLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-white">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm w-2/5">Compte</th>
              {displayMode === "capex" && (
                <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Moyenne</th>
              )}
              {view === "current" && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Courant</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{getComparisonLabel()}</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation %</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation $</th>
                </>
              )}
              {view === "12months" && (
                <>
                  {(getSeriesData() ? getSeriesPeriodLabels() : getMonthLabels(12)).map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {view === "24months" && (
                <>
                  {(getSeriesData() ? getSeriesPeriodLabels() : getMonthLabels(24)).map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {view === "years" && (
                <>
                  {(getSeriesData() ? getSeriesPeriodLabels() : getYearLabels()).map((label, idx) => (
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
              // Apply comparison type logic to prior value
              const adjustedPrior = view === "current" ? getComparisonPriorValue(row.prior) : row.prior
              const variation = row.current && adjustedPrior ? calculateVariation(row.current, adjustedPrior) : null
              const variationAmount = row.current && adjustedPrior ? row.current - adjustedPrior : 0
              const isSpacer = row.label === ""
              const shouldHideAmounts = isSpacer || !!row.isSection
              const displayLabel = row.isSection ? capitalizeFirst(row.label) : row.label
              
              // Check if next row is a subtotal to add dark border above it
              const nextRowIsSubtotal = idx < data.length - 1 && data[idx + 1].isSubtotal
              const nextRowIsResult = idx < data.length - 1 && data[idx + 1].isResult
              
              // Check if this row can be expanded and if it's expanded
              const canExpand = !!row.rowId && !!row.balanceAccounts && row.balanceAccounts.length > 0
              const isExpanded = row.rowId ? expandedRows.has(row.rowId) : false
              
              // Check if this row has a note
              const hasNote = row.rowId
                ? getNoteByRowId(row.rowId, "capex", period, view, companyId, divisionId, subDivisionId) !== null
                : false

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
                    className={cn(
                      "px-6 py-3",
                      row.isBold ? "font-bold text-slate-900" : "text-slate-700",
                      row.indent ? "pl-12" : ""
                    )}
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
                      {row.rowId && isNoteAllowed() && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedRowId(row.rowId!)
                            setSelectedRowLabel(displayLabel)
                            // Capture financial data
                            setSelectedRowFinancialData({
                              currentAmount: row.current !== 0 ? row.current : null,
                              priorAmount: row.prior !== 0 ? row.prior : null,
                              variationPercent: variation,
                              variationAmount: variationAmount !== 0 ? variationAmount : null,
                            })
                            setNoteModalOpen(true)
                          }}
                          className={cn(
                            "flex-shrink-0 p-1.5 rounded-md transition-colors",
                            hasNote
                              ? "text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                              : "text-slate-400 hover:bg-slate-100 hover:text-slate-500"
                          )}
                          title={hasNote ? "Voir/Modifier la note" : "Ajouter une note"}
                        >
                          <StickyNote className={cn("w-4 h-4", hasNote && "fill-current")} />
                        </button>
                      )}
                    </div>
                    </td>
                    {/* Colonne Moyenne - Only for capex mode */}
                    {displayMode === "capex" && (
                      <>
                        {row.accountId && !row.isSection && row.label !== "" ? (
                          <td className={`px-6 py-3 text-right font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50`}>
                            {(() => {
                              const average = calculateAverageForRow(row)
                              return average !== 0 ? formatCurrency(average) : "-"
                            })()}
                          </td>
                        ) : (
                          <td className="px-6 py-3 text-right text-slate-400 bg-gradient-to-b from-slate-50 to-slate-100/50">
                            -
                          </td>
                        )}
                      </>
                    )}

                  {view === "current" && (
                    <>
                    <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""} ${row.isResult ? "text-emerald-600 font-bold" : ""}`}>
                      {row.current !== 0 ? formatCurrency(row.current) : "-"}
                    </td>
                      <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""} ${row.isResult ? "text-emerald-600 font-bold" : ""}`}>
                        {adjustedPrior !== 0 ? formatCurrency(adjustedPrior) : "-"}
                      </td>
                      <td
                        className={`px-6 py-3 text-right ${row.isBold ? "font-semibold " : ""}${
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
                  )}

                  {/* Trend Views - 12 months, 24 months, years */}
                  {view === "12months" && row.trendValues && (
                    <>
                      {row.trendValues.map((value, valueIdx) => (
                      <td
                          key={valueIdx}
                          className={`px-4 py-3 text-right text-sm ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""} ${row.isResult ? "text-emerald-600 font-bold" : ""}`}
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
                          className={`px-4 py-3 text-right text-sm ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""} ${row.isResult ? "text-emerald-600 font-bold" : ""}`}
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
                          className={`px-4 py-3 text-right text-sm ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""} ${row.isResult ? "text-emerald-600 font-bold" : ""}`}
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
                        <td key={idx} className={`px-4 py-3 text-right text-sm ${shouldHideAmounts ? "text-white" : "text-slate-400"}`}>
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
                            
                            {/* Colonne Moyenne - Only for capex mode */}
                            {displayMode === "capex" && (
                              <td className="px-6 py-2 text-right font-semibold text-sm text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                                {(() => {
                                  const average = (account.amount + (account.priorAmount || 0)) / 2
                                  return average !== 0 ? formatCurrency(average) : "-"
                                })()}
                              </td>
                            )}
                            
                            {view === "current" && (
                              <>
                                <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                  {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                                </td>
                                <td className="px-6 py-2 text-right font-semibold text-sm text-slate-500">
                                  {(() => {
                                    const adjustedAccountPrior = account.priorAmount !== undefined 
                                      ? getComparisonPriorValue(account.priorAmount) 
                                      : undefined
                                    return adjustedAccountPrior !== undefined && adjustedAccountPrior !== 0 
                                      ? formatCurrency(adjustedAccountPrior) 
                                      : "-"
                                  })()}
                                </td>
                                {(() => {
                                  const adjustedAccountPrior = account.priorAmount !== undefined 
                                    ? getComparisonPriorValue(account.priorAmount) 
                                    : undefined
                                  const accountVariation = adjustedAccountPrior !== undefined && account.amount && adjustedAccountPrior
                                    ? calculateVariation(account.amount, adjustedAccountPrior)
                                    : null
                                  const accountVariationAmount = adjustedAccountPrior !== undefined && account.amount && adjustedAccountPrior
                                    ? account.amount - adjustedAccountPrior
                                    : 0
                                  return (
                                    <>
                                      <td
                                        className={`px-6 py-2 text-right font-semibold text-sm ${
                                          accountVariation && accountVariation >= 0 ? "text-emerald-600" : "text-red-600"
                                        }`}
                                      >
                                        {accountVariation !== null && account.amount !== 0
                                          ? `${accountVariation >= 0 ? "+" : ""}${accountVariation.toFixed(1)}%`
                                          : "-"}
                                      </td>
                                      <td
                                        className={`px-6 py-2 text-right font-semibold text-sm ${
                                          accountVariationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                                        }`}
                                      >
                                        {account.amount !== 0
                                          ? `${accountVariationAmount >= 0 ? "+" : ""}${formatCurrency(accountVariationAmount)}`
                                          : "-"}
                                      </td>
                                    </>
                                  )
                                })()}
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
            {/* Capex Summary Sections */}
            {(() => {
              // Calculate total fixed assets
              const totalFixedAssetsCurrent = calculateTotalFixedAssets(false)
              const totalFixedAssetsPrior = calculateTotalFixedAssets(true)
              
              // Calculate percentages
              const fixedAssetsPercentageCurrent = getRevenuePercentage(totalFixedAssetsCurrent, false)
              const fixedAssetsPercentagePrior = getRevenuePercentage(totalFixedAssetsPrior, true)
              
              // Calculate number of columns for colspan
              const getColumnCount = (): number => {
                if (view === "current") return 4 // Compte + Moyenne + Courant + Passé
                if (view === "12months") return 14 // Compte + Moyenne + 12 mois
                if (view === "24months") return 26 // Compte + Moyenne + 24 mois
                if (view === "years") return 8 // Compte + Moyenne + 6 années
                return 4
              }
              
              return (
                <>
                </>
              )
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
            <span className="font-medium text-slate-700">Note:</span>{" "}
            {displayMode === "capex" ? (
              <>
                Les Capex (variations) représentent la variation du coût d'une période à l'autre. 
                Cette variation correspond à la différence entre le coût des immobilisations de la période courante et celui de la période précédente, 
                reflétant ainsi les investissements en capital réalisés au cours de la période.
              </>
            ) : (
              <>
                Les immobilisations représentent les actifs non courants de l'entreprise. 
                Utilisez les cases à cocher pour exclure des comptes du calcul des immobilisations totales. 
                Les données affichées sont à titre informatif.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Note Modal */}
      {selectedRowId && (() => {
        const selectedCompany = companyId ? companies.find((c) => c.id === companyId) : null
        const selectedDivision = companyId && divisionId ? selectedCompany?.divisions.find((d) => d.id === divisionId) : null
        const selectedSubDivision = companyId && divisionId && subDivisionId ? selectedDivision?.subDivisions.find((sd) => sd.id === subDivisionId) : null
        
        return (
          <NoteModal
            isOpen={noteModalOpen}
            onClose={() => {
              setNoteModalOpen(false)
              setSelectedRowId(null)
              setSelectedRowLabel("")
            }}
            rowId={selectedRowId}
            rowLabel={selectedRowLabel}
            page="capex"
            period={period}
            view={view}
            companyId={companyId}
            companyName={selectedCompany?.name || null}
            divisionId={divisionId}
            divisionName={selectedDivision?.name || null}
            subDivisionId={subDivisionId}
            subDivisionName={selectedSubDivision?.name || null}
            currentAmount={selectedRowFinancialData.currentAmount}
            priorAmount={selectedRowFinancialData.priorAmount}
            variationPercent={selectedRowFinancialData.variationPercent}
            variationAmount={selectedRowFinancialData.variationAmount}
            onSave={() => setNotesUpdated((prev) => prev + 1)}
          />
        )
      })()}
    </div>
  )
}

