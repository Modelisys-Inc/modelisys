"use client"

import { formatCurrency } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import { ChevronRight, ChevronDown, Settings, Edit2, Trash2 } from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import { listForecastConfigs, upsertForecastConfig } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { generateId } from "@/lib/seeded-random"

interface BaseSeasonalityDetailProps {
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  title?: string
  projectionMode?: "gl" | "account"
}

interface DetailRow {
  label: string
  indent?: boolean
  isBold?: boolean
  isSubtotal?: boolean
  isSection?: boolean
  rowId?: string
  balanceAccounts?: Array<{
    accountNumber: string
    accountName: string
    amount: number
    priorAmount?: number
  }>
  // Seasonal pattern for this row (12 months)
  seasonalPattern?: number[]
}

export function BaseSeasonalityDetail({
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  title = "Saisonnalité des revenus",
  projectionMode = "gl",
}: BaseSeasonalityDetailProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  
  // State for editable percentages: key = "rowId-monthIndex" or "rowId-accountNumber-monthIndex"
  const [seasonalityValues, setSeasonalityValues] = useState<Record<string, number[]>>({})

  // Interface for seasonality adjustments
  interface SeasonalityAdjustment {
    id: string // Unique ID for this adjustment
    rowId: string
    monthIndex: number
    accountNumber?: string // Optional, for balance accounts
    percentage: number // The percentage value for this month
    note: string // Explanatory note for this adjustment
  }

  // State for seasonality adjustments: key = "rowId-monthIndex" or "rowId-accountNumber-monthIndex" -> SeasonalityAdjustment[]
  const [seasonalityAdjustments, setSeasonalityAdjustments] = useState<Record<string, SeasonalityAdjustment[]>>({})
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false)
  const [editingAdjustment, setEditingAdjustment] = useState<{ rowId: string; monthIndex: number; accountNumber?: string } | null>(null)
  const [adjustmentPercentage, setAdjustmentPercentage] = useState<number>(0)
  const [adjustmentNote, setAdjustmentNote] = useState<string>("")
  const [editingAdjustmentId, setEditingAdjustmentId] = useState<string | null>(null) // ID of adjustment being edited, null if adding new

  // Debounced save to API
  const saveConfigRef = useRef<NodeJS.Timeout>()

  const saveConfig = useCallback((data: Record<string, unknown>) => {
    if (!companyId) return
    clearTimeout(saveConfigRef.current)
    saveConfigRef.current = setTimeout(async () => {
      try {
        await upsertForecastConfig(companyId, {
          config_type: "seasonality",
          data,
        })
      } catch (err) {
        console.error("Error saving seasonality config:", err)
      }
    }, 500)
  }, [companyId])

  // Load seasonality config from API on mount
  useEffect(() => {
    if (!companyId) return

    const loadConfig = async () => {
      try {
        const configs = await listForecastConfigs(companyId, { config_type: "seasonality" })
        if (configs.length > 0) {
          const data = configs[0].data as Record<string, unknown>
          if (data.seasonalityValues) setSeasonalityValues(data.seasonalityValues as typeof seasonalityValues)
          if (data.seasonalityAdjustments) {
            const adjustmentsParsed = data.seasonalityAdjustments as Record<string, unknown>
            if (adjustmentsParsed && typeof adjustmentsParsed === 'object' && !Array.isArray(adjustmentsParsed)) {
              const validatedAdjustments: Record<string, SeasonalityAdjustment[]> = {}
              for (const [key, value] of Object.entries(adjustmentsParsed)) {
                if (Array.isArray(value)) {
                  validatedAdjustments[key] = value
                } else {
                  validatedAdjustments[key] = [value as SeasonalityAdjustment]
                }
              }
              setSeasonalityAdjustments(validatedAdjustments)
            }
          }
        }
      } catch (err) {
        console.error("Error loading seasonality config:", err)
      }
    }
    loadConfig()
  }, [companyId])

  // Save seasonality values whenever they change
  useEffect(() => {
    if (Object.keys(seasonalityValues).length === 0) return
    saveConfig({ seasonalityValues, seasonalityAdjustments })
  }, [seasonalityValues, saveConfig])

  // Save seasonality adjustments whenever they change
  useEffect(() => {
    if (Object.keys(seasonalityAdjustments).length === 0) return
    saveConfig({ seasonalityValues, seasonalityAdjustments })
  }, [seasonalityAdjustments, saveConfig])

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

  // Helper function to generate balance accounts for a row
  const generateBalanceAccounts = (label: string): Array<{
    accountNumber: string
    accountName: string
    amount: number
    priorAmount?: number
  }> => {
    const accounts: Array<{
      accountNumber: string
      accountName: string
      amount: number
      priorAmount?: number
    }> = []
    
    if (label.includes("Services professionnels")) {
      accounts.push(
        { accountNumber: "4000", accountName: "Revenus de services", amount: 1200000, priorAmount: 1100000 },
        { accountNumber: "4010", accountName: "Revenus de consultation", amount: 960000, priorAmount: 820000 }
      )
    } else if (label.includes("Produits") && !label.includes("Coût")) {
      accounts.push(
        { accountNumber: "4100", accountName: "Revenus de vente de produits", amount: 840000, priorAmount: 720000 }
      )
    } else if (label.includes("Autres revenus")) {
      accounts.push(
        { accountNumber: "4200", accountName: "Revenus divers", amount: 240000, priorAmount: 200000 }
      )
    } else if (label.includes("Coût - Services")) {
      accounts.push(
        { accountNumber: "5000", accountName: "Coûts directs - Services", amount: 756000, priorAmount: 672000 },
        { accountNumber: "5010", accountName: "Sous-traitance", amount: 324000, priorAmount: 288000 }
      )
    } else if (label.includes("Coût - Produits")) {
      accounts.push(
        { accountNumber: "5100", accountName: "Coût des marchandises vendues", amount: 420000, priorAmount: 360000 }
      )
    } else if (label.includes("Salaires - Administrateurs")) {
      accounts.push(
        { accountNumber: "6000", accountName: "Salaires - Administration", amount: 480000, priorAmount: 420000 }
      )
    } else if (label.includes("Location de bureaux")) {
      accounts.push(
        { accountNumber: "6100", accountName: "Location", amount: 96000, priorAmount: 96000 }
      )
    } else if (label.includes("Fournitures de bureau")) {
      accounts.push(
        { accountNumber: "6200", accountName: "Fournitures", amount: 42000, priorAmount: 38400 }
      )
    } else if (label.includes("Services professionnels") && label.includes("Frais")) {
      accounts.push(
        { accountNumber: "6300", accountName: "Services professionnels", amount: 84000, priorAmount: 78000 }
      )
    } else if (label.includes("Salaires - Vente")) {
      accounts.push(
        { accountNumber: "7000", accountName: "Salaires - Vente", amount: 216000, priorAmount: 180000 }
      )
    } else if (label.includes("Marketing et publicité")) {
      accounts.push(
        { accountNumber: "7100", accountName: "Marketing", amount: 144000, priorAmount: 120000 }
      )
    } else if (label.includes("Commissions")) {
      accounts.push(
        { accountNumber: "7200", accountName: "Commissions", amount: 72000, priorAmount: 87600 }
      )
    }
    
    return accounts
  }

  // Seasonal patterns - same as in seasonality components
  const revenueSeasonalPattern = [0.85, 0.80, 0.90, 1.00, 1.10, 1.15, 1.20, 1.15, 1.05, 1.00, 0.95, 1.05]
  const expenseSeasonalPattern = [1.00, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20, 1.15, 1.10, 1.05, 1.00, 1.10]

  // Get seasonality adjustments for a specific row and month
  const getSeasonalityAdjustments = (rowId: string, monthIndex: number, accountNumber?: string): SeasonalityAdjustment[] => {
    const key = accountNumber ? `${rowId}-${accountNumber}-${monthIndex}` : `${rowId}-${monthIndex}`
    return seasonalityAdjustments[key] || []
  }

  // Get a specific seasonality adjustment by ID
  const getSeasonalityAdjustmentById = (id: string): SeasonalityAdjustment | null => {
    for (const adjustments of Object.values(seasonalityAdjustments)) {
      const adjustment = adjustments.find(a => a.id === id)
      if (adjustment) return adjustment
    }
    return null
  }

  // Get seasonality pattern for a row or account
  const getSeasonalityPattern = (rowId?: string, accountNumber?: string): number[] => {
    const key = accountNumber ? `${rowId}-${accountNumber}` : rowId || ""
    if (seasonalityValues[key]) {
      return seasonalityValues[key]
    }
    // Return default pattern based on row type
    if (rowId?.includes("revenue") || rowId?.includes("other-interest-earned") || rowId?.includes("other-investment-income")) {
      return revenueSeasonalPattern
    }
    return expenseSeasonalPattern
  }

  // Get the percentage value for a specific month, considering adjustments
  const getMonthPercentage = (rowId: string, monthIndex: number, accountNumber?: string): number => {
    const pattern = getSeasonalityPattern(rowId, accountNumber)
    const patternSum = pattern.reduce((sum, val) => sum + val, 0)
    const basePercentage = patternSum > 0 ? (pattern[monthIndex] / patternSum) * 100 : 0
    
    // Check if there's an adjustment for this month
    const adjustments = getSeasonalityAdjustments(rowId, monthIndex, accountNumber)
    if (adjustments.length > 0) {
      // Use the most recent adjustment (last one in the array)
      const adjustment = adjustments[adjustments.length - 1]
      return adjustment.percentage
    }
    
    return basePercentage
  }

  // Open adjustment modal
  const openAdjustmentModal = (rowId: string, monthIndex: number, accountNumber?: string, adjustmentId?: string) => {
    setEditingAdjustment({ rowId, monthIndex, accountNumber })
    if (adjustmentId) {
      // Editing existing adjustment
      const existingAdjustment = getSeasonalityAdjustmentById(adjustmentId)
      if (existingAdjustment) {
        setEditingAdjustmentId(adjustmentId)
        setAdjustmentPercentage(existingAdjustment.percentage)
        setAdjustmentNote(existingAdjustment.note || "")
      }
    } else {
      // Adding new adjustment - use current percentage as default
      const currentPercentage = getMonthPercentage(rowId, monthIndex, accountNumber)
      setEditingAdjustmentId(null)
      setAdjustmentPercentage(currentPercentage)
      setAdjustmentNote("")
    }
    setAdjustmentModalOpen(true)
  }

  // Save adjustment
  const saveAdjustment = () => {
    if (!editingAdjustment || adjustmentPercentage < 0) {
      setAdjustmentModalOpen(false)
      setEditingAdjustment(null)
      setEditingAdjustmentId(null)
      return
    }
    
    const key = editingAdjustment.accountNumber 
      ? `${editingAdjustment.rowId}-${editingAdjustment.accountNumber}-${editingAdjustment.monthIndex}`
      : `${editingAdjustment.rowId}-${editingAdjustment.monthIndex}`
    
    setSeasonalityAdjustments((prev) => {
      const existingAdjustments = prev[key] || []
      
      if (editingAdjustmentId) {
        // Update existing adjustment
        const updatedAdjustments = existingAdjustments.map(adj =>
          adj.id === editingAdjustmentId
            ? {
                ...adj,
                percentage: adjustmentPercentage,
                note: adjustmentNote
              }
            : adj
        )
        return {
          ...prev,
          [key]: updatedAdjustments
        }
      } else {
        // Add new adjustment
        const newAdjustment: SeasonalityAdjustment = {
          id: generateId(),
          rowId: editingAdjustment.rowId,
          monthIndex: editingAdjustment.monthIndex,
          accountNumber: editingAdjustment.accountNumber,
          percentage: adjustmentPercentage,
          note: adjustmentNote
        }
        return {
          ...prev,
          [key]: [...existingAdjustments, newAdjustment]
        }
      }
    })
    
    setAdjustmentModalOpen(false)
    setEditingAdjustment(null)
    setEditingAdjustmentId(null)
    setAdjustmentPercentage(0)
    setAdjustmentNote("")
  }

  // Delete adjustment
  const deleteAdjustment = (adjustmentId: string) => {
    setSeasonalityAdjustments((prev) => {
      const newAdjustments: Record<string, SeasonalityAdjustment[]> = {}
      for (const [key, adjustments] of Object.entries(prev)) {
        const filtered = adjustments.filter(adj => adj.id !== adjustmentId)
        if (filtered.length > 0) {
          newAdjustments[key] = filtered
        }
      }
      return newAdjustments
    })
  }

  // Calculate total revenue pattern by summing the three revenue lines for each month
  // Each pattern represents a seasonal factor (normalized to sum to 12)
  // The total is the sum of the three patterns for each month
  const getTotalRevenuePattern = (): number[] => {
    const servicesPattern = getSeasonalityPattern("revenue-services")
    const productsPattern = getSeasonalityPattern("revenue-products")
    const otherPattern = getSeasonalityPattern("revenue-other")
    
    // Sum the patterns for each month
    return servicesPattern.map((val, idx) => val + productsPattern[idx] + otherPattern[idx])
  }

  // Update seasonality value for a row or account (no automatic normalization)
  const updateSeasonalityValue = (rowId: string, monthIndex: number, value: number, accountNumber?: string) => {
    const key = accountNumber ? `${rowId}-${accountNumber}` : rowId
    setSeasonalityValues((prev) => {
      const currentPattern = prev[key] || getSeasonalityPattern(rowId, accountNumber)
      const newPattern = [...currentPattern]
      newPattern[monthIndex] = Math.max(0, value) // Ensure non-negative, but don't normalize
      
      // Save the pattern as-is without normalization
      return {
        ...prev,
        [key]: newPattern
      }
    })
  }

  // Generate data rows with seasonal patterns
  const getDetailData = (): DetailRow[] => {
    const rows: DetailRow[] = [
      // Revenues
      { label: "REVENUS", isBold: true, isSection: true },
      { label: "Ventes - Services professionnels", indent: true, rowId: "revenue-services", seasonalPattern: revenueSeasonalPattern },
      { label: "Ventes - Produits", indent: true, rowId: "revenue-products", seasonalPattern: revenueSeasonalPattern },
      { label: "Autres revenus", indent: true, rowId: "revenue-other", seasonalPattern: revenueSeasonalPattern },
      { label: "Total Revenus", isBold: true, isSubtotal: true, seasonalPattern: revenueSeasonalPattern },
    ]
    
    // Add balance accounts to rows that have rowId
    // Only generate balance accounts if projectionMode is "gl"
    return rows.map((row) => {
      if (row.rowId && projectionMode === "gl") {
        return {
          ...row,
          balanceAccounts: generateBalanceAccounts(row.label)
        }
      }
      return row
    })
  }

  // Helper function to capitalize first letter
  const capitalizeFirst = (str: string): string => {
    if (!str) return str
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  let data = getDetailData()
  
  // If projectionMode is "account", remove balanceAccounts from all rows
  if (projectionMode === "account") {
    data = data.map((row) => {
      if (row.balanceAccounts || 'balanceAccounts' in row) {
        const { balanceAccounts, ...rowWithoutBalanceAccounts } = row
        return rowWithoutBalanceAccounts
      }
      return row
    })
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

  const monthLabels = getMonthLabels()
  
  // Get month indices for the 12 months displayed
  const getMonthIndices = (): number[] => {
    const currentDate = new Date()
    const indices: number[] = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      indices.push(date.getMonth())
    }
    return indices
  }

  const monthIndices = getMonthIndices()

  return (
    <div className="w-full bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-8 py-5 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-1 h-12 bg-blue-400 rounded-full flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white tracking-tight mb-1">{title}</h2>
              <div className="flex items-center gap-3 text-sm text-slate-300 flex-wrap">
                <span className="font-medium">12 mois</span>
                <span className="text-slate-500">•</span>
                {subDivisionId && divisionId && companyId ? (
                  <>
                    <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                    <span className="text-slate-500">•</span>
                    <span>{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name || "Division"}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-blue-400 font-semibold">{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.subDivisions.find((sd) => sd.id === subDivisionId)?.name || "Sous-division"}</span>
                  </>
                ) : divisionId && companyId ? (
                  <>
                    <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-blue-400 font-semibold">{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name || "Division"}</span>
                  </>
                ) : companyId ? (
                  <span className="text-blue-400 font-semibold">{companies.find((c) => c.id === companyId)?.name || "Société sélectionnée"}</span>
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
              {monthLabels.map((label, idx) => (
                <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                  {label}
                </th>
              ))}
              <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm border-l border-slate-300">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => {
              const isSpacer = row.label === ""
              const shouldHideAmounts = isSpacer || !!row.isSection
              const displayLabel = row.isSection ? capitalizeFirst(row.label) : row.label
              
              // Check if next row is a subtotal to add dark border above it
              const nextRowIsSubtotal = idx < data.length - 1 && data[idx + 1].isSubtotal
              
              // Check if this row can be expanded and if it's expanded
              // Force canExpand to false if in "account" mode
              const canExpand = projectionMode === "account" 
                ? false 
                : (!!row.rowId && !!row.balanceAccounts && row.balanceAccounts.length > 0)
              const isExpanded = row.rowId ? expandedRows.has(row.rowId) : false

              // Get seasonal pattern for this row (use edited values if available)
              // For "Total Revenus", calculate it from the three revenue lines
              const isTotalRevenus = row.label === "Total Revenus"
              const pattern = isTotalRevenus 
                ? getTotalRevenuePattern()
                : (row.rowId ? getSeasonalityPattern(row.rowId) : (row.seasonalPattern || revenueSeasonalPattern))
              
              // Calculate percentages and total for this row using adjustments
              // The pattern values are stored as raw values (not normalized)
              // Convert to percentages by dividing by the sum and multiplying by 100
              // But use adjustments if available
              const patternSum = pattern.reduce((sum, val) => sum + val, 0)
              const basePercentages = patternSum > 0 
                ? pattern.map(val => (val / patternSum) * 100)
                : pattern.map(() => 0)
              
              // Use adjustments if available, otherwise use base percentages
              const normalizedPercentages = row.rowId && !isTotalRevenus
                ? monthIndices.map((monthIdx) => getMonthPercentage(row.rowId, monthIdx))
                : basePercentages
              
              const rowTotal = normalizedPercentages.reduce((sum, pct) => sum + pct, 0)

              return (
                <>
                  <tr key={idx} className={cn(
                    "border-b",
                    row.label === "" ? "h-2 border-slate-200" : "",
                    nextRowIsSubtotal ? "border-slate-900 border-b-2" : "border-slate-200",
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

                    {/* Display seasonal percentages for each month - not directly editable, use adjustments */}
                    {monthIndices.map((monthIdx, colIdx) => {
                      // Use normalized percentage that sums to 100%
                      const percentage = normalizedPercentages[monthIdx]
                      // Total Revenus should never be editable (no rowId and isTotalRevenus check)
                      const canHaveAdjustment = !shouldHideAmounts && row.rowId && !row.isSection && !isTotalRevenus
                      const adjustments = canHaveAdjustment ? getSeasonalityAdjustments(row.rowId!, monthIdx) : []
                      
                      return (
                        <td
                          key={colIdx}
                          className={cn(
                            "px-4 py-3 text-right font-mono",
                            row.isBold ? "font-bold" : "",
                            shouldHideAmounts ? "text-white" : "text-slate-700",
                            isTotalRevenus && "cursor-default"
                          )}
                        >
                          {shouldHideAmounts ? (
                            "-"
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <span>{percentage.toFixed(1)}%</span>
                              {canHaveAdjustment && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (row.rowId) {
                                      openAdjustmentModal(row.rowId, monthIdx)
                                    }
                                  }}
                                  className={cn(
                                    "p-1 rounded hover:bg-slate-200 transition-colors relative",
                                    adjustments.length > 0 && "text-blue-600"
                                  )}
                                  title={`Ajustements (${adjustments.length})`}
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                  {adjustments.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                      {adjustments.length}
                                    </span>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      )
                    })}
                    
                    {/* Total column */}
                    <td
                      className={cn(
                        "px-6 py-3 text-right font-mono border-l border-slate-300",
                        row.isBold ? "font-bold" : "",
                        shouldHideAmounts ? "text-white" : "text-slate-700",
                        Math.abs(rowTotal - 100) > 0.1 && !shouldHideAmounts && "text-red-600 font-semibold"
                      )}
                    >
                      {shouldHideAmounts ? (
                        "-"
                      ) : (
                        <span className={cn(Math.abs(rowTotal - 100) > 0.1 && "text-red-600")}>
                          {rowTotal.toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Expanded balance accounts */}
                  {canExpand && isExpanded && row.balanceAccounts && (
                    <>
                      {row.balanceAccounts.map((account, accIdx) => {
                        // Get pattern for this account (can be different from parent)
                        const accountPattern = getSeasonalityPattern(row.rowId, account.accountNumber)
                        // Calculate normalized percentages and total for account using adjustments
                        const accountPatternSum = accountPattern.reduce((sum, val) => sum + val, 0)
                        const accountBasePercentages = accountPatternSum > 0 
                          ? accountPattern.map(val => (val / accountPatternSum) * 100)
                          : accountPattern.map(() => 0)
                        
                        // Use adjustments if available, otherwise use base percentages
                        const accountNormalizedPercentages = monthIndices.map((monthIdx) => 
                          getMonthPercentage(row.rowId!, monthIdx, account.accountNumber)
                        )
                        const accountTotal = accountNormalizedPercentages.reduce((sum, pct) => sum + pct, 0)
                        
                        return (
                          <tr 
                            key={`${row.rowId}-${accIdx}`} 
                            className="border-b border-slate-200 bg-slate-50/50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <td className="px-6 py-3 text-slate-600 pl-16">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-slate-500">{account.accountNumber}</span>
                                <span>{account.accountName}</span>
                              </div>
                            </td>
                            {monthIndices.map((monthIdx, colIdx) => {
                              const percentage = accountNormalizedPercentages[monthIdx]
                              const adjustments = getSeasonalityAdjustments(row.rowId!, monthIdx, account.accountNumber)
                              
                              return (
                                <td
                                  key={colIdx}
                                  className="px-4 py-3 text-right font-mono text-slate-600"
                                >
                                  <div className="flex items-center justify-end gap-2">
                                    <span>{percentage.toFixed(1)}%</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openAdjustmentModal(row.rowId!, monthIdx, account.accountNumber)
                                      }}
                                      className={cn(
                                        "p-1 rounded hover:bg-slate-200 transition-colors relative",
                                        adjustments.length > 0 && "text-blue-600"
                                      )}
                                      title={`Ajustements (${adjustments.length})`}
                                    >
                                      <Settings className="w-3.5 h-3.5" />
                                      {adjustments.length > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                          {adjustments.length}
                                        </span>
                                      )}
                                    </button>
                                  </div>
                                </td>
                              )
                            })}
                            {/* Total column for balance account */}
                            <td
                              className={cn(
                                "px-6 py-3 text-right font-mono text-slate-600 border-l border-slate-300",
                                Math.abs(accountTotal - 100) > 0.1 && "text-red-600 font-semibold"
                              )}
                            >
                              <span className={cn(Math.abs(accountTotal - 100) > 0.1 && "text-red-600")}>
                                {accountTotal.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Adjustment Modal */}
      {editingAdjustment && (() => {
        const rowLabel = data.find(r => r.rowId === editingAdjustment.rowId)?.label || "Poste"
        const accountLabel = editingAdjustment.accountNumber 
          ? data.find(r => r.rowId === editingAdjustment.rowId)?.balanceAccounts?.find(a => a.accountNumber === editingAdjustment.accountNumber)?.accountName
          : undefined
        const monthLabel = monthLabels[monthIndices.indexOf(editingAdjustment.monthIndex)] || `Mois ${editingAdjustment.monthIndex + 1}`
        const existingAdjustments = getSeasonalityAdjustments(
          editingAdjustment.rowId, 
          editingAdjustment.monthIndex, 
          editingAdjustment.accountNumber
        )
        
        return (
          <Dialog open={adjustmentModalOpen} onOpenChange={setAdjustmentModalOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Ajustements pour {accountLabel ? `${accountLabel} (${rowLabel})` : rowLabel}
                </DialogTitle>
                <DialogDescription>
                  Mois: {monthLabel}
                </DialogDescription>
              </DialogHeader>
              
              {/* List of existing adjustments */}
              {existingAdjustments.length > 0 && (
                <div className="space-y-3 py-4 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700">Ajustements existants</h3>
                  {existingAdjustments.map((adj) => (
                    <div key={adj.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-900">
                              {adj.percentage.toFixed(1)}%
                            </span>
                          </div>
                          {adj.note && (
                            <p className="text-sm text-slate-600 mt-1">{adj.note}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openAdjustmentModal(
                              editingAdjustment.rowId, 
                              editingAdjustment.monthIndex, 
                              editingAdjustment.accountNumber,
                              adj.id
                            )}
                            className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4 text-slate-600" />
                          </button>
                          <button
                            onClick={() => deleteAdjustment(adj.id)}
                            className="p-1.5 hover:bg-red-100 rounded transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Form to add/edit adjustment */}
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">
                    {editingAdjustmentId ? "Modifier l'ajustement" : "Ajouter un ajustement"}
                  </h3>
                  {editingAdjustmentId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingAdjustmentId(null)
                        const currentPercentage = getMonthPercentage(
                          editingAdjustment.rowId, 
                          editingAdjustment.monthIndex, 
                          editingAdjustment.accountNumber
                        )
                        setAdjustmentPercentage(currentPercentage)
                        setAdjustmentNote("")
                      }}
                    >
                      Annuler
                    </Button>
                  )}
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Pourcentage de saisonnalité (%)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={adjustmentPercentage}
                    onChange={(e) => setAdjustmentPercentage(parseFloat(e.target.value) || 0)}
                    placeholder="0.0"
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Pourcentage de répartition pour ce mois (doit être entre 0 et 100)
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Note explicative
                  </label>
                  <Textarea
                    value={adjustmentNote}
                    onChange={(e) => setAdjustmentNote(e.target.value)}
                    placeholder="Ex: Période de pointe saisonnière, Promotion spéciale, etc."
                    className="w-full min-h-[80px]"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Décrivez la raison de cet ajustement
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAdjustmentModalOpen(false)
                    setEditingAdjustment(null)
                    setEditingAdjustmentId(null)
                    setAdjustmentPercentage(0)
                    setAdjustmentNote("")
                  }}
                >
                  Fermer
                </Button>
                <Button
                  onClick={saveAdjustment}
                  disabled={adjustmentPercentage < 0 || adjustmentPercentage > 100}
                >
                  {editingAdjustmentId ? "Enregistrer les modifications" : "Ajouter l'ajustement"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}
    </div>
  )
}

