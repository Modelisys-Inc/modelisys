"use client"

import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import type { FinancialStatementRow } from "@/lib/api"
import { generateId } from "@/lib/seeded-random"
import { ChevronRight, ChevronDown, StickyNote, TrendingUp } from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import { listForecastConfigs, upsertForecastConfig } from "@/lib/api"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { getRowAmounts, getPeriodLabels, aggregateToQuarters, aggregateToYears } from "@/lib/series-utils"
import { NoteModal } from "@/components/note-modal"
import { getNoteByRowId } from "@/lib/notes-storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Settings, Plus, Edit2, Trash2 } from "lucide-react"

interface IncomeStatementDetailProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years"
  columnMode?: "variations" | "percentage" | "comparison"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  title?: string
  projectionYears?: 3 | 4 | 5
  projectionMode?: "gl" | "account"
  comparisonType?: "lastMonth" | "pastMonth" | "budget"
  selectedBudgetId?: string | null
  selectedBudgetName?: string | null
  fiscalYear?: number
  rows?: FinancialStatementRow[]
  loading?: boolean
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
  // For trend views (12months, quarters, years)
  trendValues?: number[]
  // Balance accounts for this row
  balanceAccounts?: BalanceAccount[]
  rowId?: string // Unique ID for expansion
}

export function IncomeStatementDetail({
  period,
  view,
  columnMode = "variations",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  title = "Détail",
  projectionYears = 5,
  projectionMode = "gl",
  comparisonType = "lastMonth",
  selectedBudgetId = null,
  selectedBudgetName = null,
  fiscalYear,
  rows: backendRows = [],
  loading = false,
}: IncomeStatementDetailProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
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
  const [showGrowthRate, setShowGrowthRate] = useState(false) // Toggle between amounts and growth rate for years view
  
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
  
  // State for Type/Taux modal
  const [typeRateModalOpen, setTypeRateModalOpen] = useState(false)
  const [editingTypeRateRowId, setEditingTypeRateRowId] = useState<string | null>(null)
  const [tempExpenseType, setTempExpenseType] = useState<"variable" | "fixe">("variable")
  const [tempVariableRate, setTempVariableRate] = useState<number>(0)
  const [tempSpecificInflationRate, setTempSpecificInflationRate] = useState<number | null>(null) // null means use global rate
  
  // State for editable revenue/expense values: key = "rowId-yearIndex" (e.g., "revenue-services-1" for 2026)
  const [revenueValues, setRevenueValues] = useState<Record<string, number>>({})
  const [editingCell, setEditingCell] = useState<string | null>(null) // Format: "rowId-yearIndex"
  
  // State for expense types (variable/fixe): key = "rowId" -> "variable" | "fixe"
  const [expenseTypes, setExpenseTypes] = useState<Record<string, "variable" | "fixe">>({})
  
  // State for inflation rate for fixed expenses (global default rate)
  const [inflationRate, setInflationRate] = useState<number>(2.0) // Default: 2%
  
  // State for variable rates: key = "rowId" -> rate in %
  const [variableRates, setVariableRates] = useState<Record<string, number>>({})
  
  // State for specific inflation rates per expense: key = "rowId" -> rate in %
  const [specificInflationRates, setSpecificInflationRates] = useState<Record<string, number>>({})

  // Interface for expense adjustments
  interface ExpenseAdjustment {
    id: string // Unique ID for this adjustment
    rowId: string
    yearIndex: number
    type: "amount" | "percentage" // Type of adjustment: amount in $ or percentage change
    amount?: number // Adjustment amount (for type "amount", can be positive or negative)
    percentage?: number // New percentage value (for type "percentage", e.g., 38 instead of 40)
    isRecurring: boolean // If true, adjustment continues in future years (for amount: with inflation, for percentage: keeps new rate)
    note: string // Explanatory note for this adjustment
  }

  // Interface for revenue adjustments
  interface RevenueAdjustment {
    id: string // Unique ID for this adjustment
    rowId: string
    yearIndex: number
    type: "amount" | "growthPercent" | "growthAmount" // Type of adjustment
    value: number // The adjustment value (amount, growth %, or growth $)
    note: string // Explanatory note for this adjustment
  }

  // State for expense adjustments: key = "rowId-yearIndex" -> ExpenseAdjustment[]
  const [expenseAdjustments, setExpenseAdjustments] = useState<Record<string, ExpenseAdjustment[]>>({})
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false)
  const [editingAdjustment, setEditingAdjustment] = useState<{ rowId: string; yearIndex: number } | null>(null)
  const [adjustmentType, setAdjustmentType] = useState<"amount" | "percentage">("amount")
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0)
  const [adjustmentPercentage, setAdjustmentPercentage] = useState<number>(0)
  const [adjustmentIsRecurring, setAdjustmentIsRecurring] = useState<boolean>(false)
  const [adjustmentNote, setAdjustmentNote] = useState<string>("")
  const [editingAdjustmentId, setEditingAdjustmentId] = useState<string | null>(null) // ID of adjustment being edited, null if adding new

  // State for revenue adjustments: key = "rowId-yearIndex" -> RevenueAdjustment[]
  const [revenueAdjustments, setRevenueAdjustments] = useState<Record<string, RevenueAdjustment[]>>({})
  const [revenueAdjustmentType, setRevenueAdjustmentType] = useState<"amount" | "growthPercent" | "growthAmount">("amount")
  const [revenueAdjustmentValue, setRevenueAdjustmentValue] = useState<number>(0)

  // Check if this is a forecast section (Revenus, Dépenses, or États des résultats pro forma)
  const isForecastSection = title === "Estimation des revenus annuels" || title === "Estimation des dépenses annuelles" || title === "États des résultats pro forma"

  // Determine months needed for series API based on view
  const isMultiPeriodView = view === "12months" || view === "quarters" || view === "years"
  const seriesMonthsNeeded = view === "years" ? 72 : view === "quarters" ? 15 : 12

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

  // Debounced save to API
  const saveConfigRef = useRef<NodeJS.Timeout>()

  const saveConfig = useCallback((data: Record<string, unknown>) => {
    if (!companyId || !isForecastSection) return
    clearTimeout(saveConfigRef.current)
    saveConfigRef.current = setTimeout(async () => {
      try {
        await upsertForecastConfig(companyId, {
          config_type: "income-statement-detail",
          data,
        })
      } catch (err) {
        console.error("Error saving income statement config:", err)
      }
    }, 500)
  }, [companyId, isForecastSection])

  // Load forecast config from API on mount
  useEffect(() => {
    if (!companyId || !isForecastSection) return

    const loadConfig = async () => {
      try {
        const configs = await listForecastConfigs(companyId, { config_type: "income-statement-detail" })
        if (configs.length > 0) {
          const data = configs[0].data as Record<string, unknown>
          if (data.revenueValues) setRevenueValues(data.revenueValues as typeof revenueValues)
          if (data.expenseTypes) setExpenseTypes(data.expenseTypes as typeof expenseTypes)
          if (data.inflationRate !== undefined) setInflationRate(data.inflationRate as number)
          if (data.variableRates) setVariableRates(data.variableRates as typeof variableRates)
          if (data.specificInflationRates) setSpecificInflationRates(data.specificInflationRates as typeof specificInflationRates)
          if (data.expenseAdjustments) {
            const adjustmentsParsed = data.expenseAdjustments as Record<string, unknown>
            if (adjustmentsParsed && typeof adjustmentsParsed === 'object' && !Array.isArray(adjustmentsParsed)) {
              const validatedAdjustments: Record<string, ExpenseAdjustment[]> = {}
              for (const [key, value] of Object.entries(adjustmentsParsed)) {
                if (Array.isArray(value)) {
                  validatedAdjustments[key] = value
                } else {
                  validatedAdjustments[key] = [value as ExpenseAdjustment]
                }
              }
              setExpenseAdjustments(validatedAdjustments)
            }
          }
          if (data.revenueAdjustments) {
            const revenueAdjustmentsParsed = data.revenueAdjustments as Record<string, unknown>
            if (revenueAdjustmentsParsed && typeof revenueAdjustmentsParsed === 'object' && !Array.isArray(revenueAdjustmentsParsed)) {
              const validatedAdjustments: Record<string, RevenueAdjustment[]> = {}
              for (const [key, value] of Object.entries(revenueAdjustmentsParsed)) {
                if (Array.isArray(value)) {
                  validatedAdjustments[key] = value
                } else {
                  validatedAdjustments[key] = [value as RevenueAdjustment]
                }
              }
              setRevenueAdjustments(validatedAdjustments)
            }
          }
        }
      } catch (err) {
        console.error("Error loading income statement config:", err)
      }
    }
    loadConfig()
  }, [companyId, isForecastSection])

  // Helper to build the full config data bundle
  const buildConfigData = useCallback(() => ({
    revenueValues,
    expenseTypes,
    inflationRate,
    variableRates,
    specificInflationRates,
    expenseAdjustments,
    revenueAdjustments,
  }), [revenueValues, expenseTypes, inflationRate, variableRates, specificInflationRates, expenseAdjustments, revenueAdjustments])

  // Save forecast values whenever they change
  useEffect(() => {
    if (!isForecastSection || Object.keys(revenueValues).length === 0) return
    saveConfig(buildConfigData())
  }, [revenueValues, saveConfig, isForecastSection, buildConfigData])

  // Save expense types whenever they change
  useEffect(() => {
    if (title !== "Estimation des dépenses annuelles" || Object.keys(expenseTypes).length === 0) return
    saveConfig(buildConfigData())
  }, [expenseTypes, saveConfig, title, buildConfigData])

  // Save inflation rate whenever it changes
  useEffect(() => {
    if (title !== "Estimation des dépenses annuelles") return
    saveConfig(buildConfigData())
  }, [inflationRate, saveConfig, title, buildConfigData])

  // Save variable rates whenever they change
  useEffect(() => {
    if (title !== "Estimation des dépenses annuelles" || Object.keys(variableRates).length === 0) return
    saveConfig(buildConfigData())
  }, [variableRates, saveConfig, title, buildConfigData])

  // Save specific inflation rates whenever they change
  useEffect(() => {
    if (title !== "Estimation des dépenses annuelles") return
    saveConfig(buildConfigData())
  }, [specificInflationRates, saveConfig, title, buildConfigData])

  // Save expense adjustments whenever they change
  useEffect(() => {
    if (title !== "Estimation des dépenses annuelles" || Object.keys(expenseAdjustments).length === 0) return
    saveConfig(buildConfigData())
  }, [expenseAdjustments, saveConfig, title, buildConfigData])

  // Save revenue adjustments whenever they change
  useEffect(() => {
    if (title !== "Estimation des revenus annuels" || Object.keys(revenueAdjustments).length === 0) return
    saveConfig(buildConfigData())
  }, [revenueAdjustments, saveConfig, title, buildConfigData])

  // Get expense type for a row (defaults to "variable")
  const getExpenseType = (rowId: string | undefined): "variable" | "fixe" => {
    if (!rowId || title !== "Estimation des dépenses annuelles") return "variable"
    return expenseTypes[rowId] || "variable"
  }

  // Get inflation rate (returns specific rate for rowId if set, otherwise global rate)
  const getInflationRate = (rowId?: string): number => {
    if (rowId && specificInflationRates[rowId] !== undefined) {
      return specificInflationRates[rowId]
    }
    return inflationRate
  }

  // Update global inflation rate
  const updateInflationRate = (newRate: number) => {
    setInflationRate(newRate)
  }

  // Update specific inflation rate for a row
  const updateSpecificInflationRate = (rowId: string, newRate: number) => {
    setSpecificInflationRates((prev) => ({
      ...prev,
      [rowId]: newRate,
    }))
  }

  // Remove specific inflation rate for a row (revert to global)
  const removeSpecificInflationRate = (rowId: string) => {
    setSpecificInflationRates((prev) => {
      const updated = { ...prev }
      delete updated[rowId]
      return updated
    })
  }

  // Get variable rate for a row (defaults to 0 if not set)
  const getVariableRate = (rowId: string | undefined): number => {
    if (!rowId || title !== "Estimation des dépenses annuelles") return 0
    return variableRates[rowId] || 0
  }

  // Update variable rate for a row
  const updateVariableRate = (rowId: string, newRate: number) => {
    setVariableRates((prev) => ({
      ...prev,
      [rowId]: newRate,
    }))
  }

  // Get adjustments for a specific row and year
  const getAdjustments = (rowId: string, yearIndex: number): ExpenseAdjustment[] => {
    const key = `${rowId}-${yearIndex}`
    return expenseAdjustments[key] || []
  }

  // Get a specific adjustment by ID
  const getAdjustmentById = (id: string): ExpenseAdjustment | null => {
    for (const adjustments of Object.values(expenseAdjustments)) {
      const adjustment = adjustments.find(a => a.id === id)
      if (adjustment) return adjustment
    }
    return null
  }

  // Get all recurring adjustments that apply to this year (from previous years)
  const getRecurringAdjustments = (rowId: string, yearIndex: number): ExpenseAdjustment[] => {
    const recurringAdjustments: ExpenseAdjustment[] = []
    // Check all previous years for recurring adjustments
    for (let i = 1; i < yearIndex; i++) {
      const adjustments = getAdjustments(rowId, i)
      for (const adjustment of adjustments) {
        if (adjustment.isRecurring) {
          recurringAdjustments.push(adjustment)
        }
      }
    }
    return recurringAdjustments
  }

  // Get revenue adjustments for a specific row and year
  const getRevenueAdjustments = (rowId: string, yearIndex: number): RevenueAdjustment[] => {
    const key = `${rowId}-${yearIndex}`
    return revenueAdjustments[key] || []
  }

  // Get a specific revenue adjustment by ID
  const getRevenueAdjustmentById = (id: string): RevenueAdjustment | null => {
    for (const adjustments of Object.values(revenueAdjustments)) {
      const adjustment = adjustments.find(a => a.id === id)
      if (adjustment) return adjustment
    }
    return null
  }

  // Open Type/Taux modal
  const openTypeRateModal = (rowId: string) => {
    setEditingTypeRateRowId(rowId)
    setTempExpenseType(getExpenseType(rowId))
    setTempVariableRate(getVariableRate(rowId))
    // Set temp specific inflation rate (null if using global, otherwise the specific rate)
    const hasSpecificRate = specificInflationRates[rowId] !== undefined
    setTempSpecificInflationRate(hasSpecificRate ? specificInflationRates[rowId] : null)
    setTypeRateModalOpen(true)
  }

  // Save Type/Taux changes
  const saveTypeRate = () => {
    if (!editingTypeRateRowId) return
    
    // Update expense type
    updateExpenseType(editingTypeRateRowId, tempExpenseType)
    
    // Update variable rate if type is variable
    if (tempExpenseType === "variable") {
      updateVariableRate(editingTypeRateRowId, tempVariableRate)
      // Remove specific inflation rate if switching from fixe to variable
      removeSpecificInflationRate(editingTypeRateRowId)
    } else {
      // Update specific inflation rate if type is fixe
      if (tempSpecificInflationRate !== null) {
        updateSpecificInflationRate(editingTypeRateRowId, tempSpecificInflationRate)
      } else {
        // Remove specific rate to use global rate
        removeSpecificInflationRate(editingTypeRateRowId)
      }
    }
    
    // Clear edited values for years 1-5 if switching to "fixe" to allow recalculation with inflation
    if (tempExpenseType === "fixe") {
      const keysToRemove: string[] = []
      for (let yearIdx = 1; yearIdx < 6; yearIdx++) {
        const key = `${editingTypeRateRowId}-${yearIdx}`
        if (revenueValues[key] !== undefined) {
          keysToRemove.push(key)
        }
      }
      if (keysToRemove.length > 0) {
        setRevenueValues((prev) => {
          const updated = { ...prev }
          keysToRemove.forEach(key => delete updated[key])
          return updated
        })
      }
    }
    
    setTypeRateModalOpen(false)
    setEditingTypeRateRowId(null)
  }

  // Open adjustment modal (for adding a new adjustment)
  const openAdjustmentModal = (rowId: string, yearIndex: number, adjustmentId?: string) => {
    setEditingAdjustment({ rowId, yearIndex })
    if (title === "Estimation des revenus annuels") {
      // Revenue adjustments
      if (adjustmentId) {
        // Editing existing revenue adjustment
        const existingAdjustment = getRevenueAdjustmentById(adjustmentId)
        if (existingAdjustment) {
          setEditingAdjustmentId(adjustmentId)
          setRevenueAdjustmentType(existingAdjustment.type)
          setRevenueAdjustmentValue(existingAdjustment.value)
          setAdjustmentNote(existingAdjustment.note || "")
        }
      } else {
        // Adding new revenue adjustment
        setEditingAdjustmentId(null)
        setRevenueAdjustmentType("amount")
        setRevenueAdjustmentValue(0)
        setAdjustmentNote("")
      }
    } else {
      // Expense adjustments
      if (adjustmentId) {
        // Editing existing adjustment
        const existingAdjustment = getAdjustmentById(adjustmentId)
        if (existingAdjustment) {
          setEditingAdjustmentId(adjustmentId)
          setAdjustmentType(existingAdjustment.type || "amount")
          setAdjustmentAmount(existingAdjustment.amount || 0)
          setAdjustmentPercentage(existingAdjustment.percentage || 0)
          setAdjustmentIsRecurring(existingAdjustment.isRecurring)
          setAdjustmentNote(existingAdjustment.note || "")
        }
      } else {
        // Adding new adjustment
        setEditingAdjustmentId(null)
        setAdjustmentType("amount")
        setAdjustmentAmount(0)
        setAdjustmentPercentage(0)
        setAdjustmentIsRecurring(false)
        setAdjustmentNote("")
      }
    }
    setAdjustmentModalOpen(true)
  }

  // Save adjustment
  const saveAdjustment = () => {
    if (!editingAdjustment) {
      setAdjustmentModalOpen(false)
      setEditingAdjustment(null)
      setEditingAdjustmentId(null)
      return
    }
    
    const key = `${editingAdjustment.rowId}-${editingAdjustment.yearIndex}`
    
    if (title === "Estimation des revenus annuels") {
      // Revenue adjustments
      if (revenueAdjustmentValue === 0) {
        setAdjustmentModalOpen(false)
        setEditingAdjustment(null)
        setEditingAdjustmentId(null)
        return
      }
      
      setRevenueAdjustments((prev) => {
        const existingAdjustments = prev[key] || []
        
        if (editingAdjustmentId) {
          // Update existing adjustment
          const updatedAdjustments = existingAdjustments.map(adj =>
            adj.id === editingAdjustmentId
              ? {
                  ...adj,
                  type: revenueAdjustmentType,
                  value: revenueAdjustmentValue,
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
          const newAdjustment: RevenueAdjustment = {
            id: generateId(),
            rowId: editingAdjustment.rowId,
            yearIndex: editingAdjustment.yearIndex,
            type: revenueAdjustmentType,
            value: revenueAdjustmentValue,
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
      setRevenueAdjustmentType("amount")
      setRevenueAdjustmentValue(0)
      setAdjustmentNote("")
    } else {
      // Expense adjustments
      // Validate based on type
      if (adjustmentType === "amount" && adjustmentAmount === 0) {
        setAdjustmentModalOpen(false)
        setEditingAdjustment(null)
        setEditingAdjustmentId(null)
        return
      }
      if (adjustmentType === "percentage" && adjustmentPercentage === 0) {
        setAdjustmentModalOpen(false)
        setEditingAdjustment(null)
        setEditingAdjustmentId(null)
        return
      }
      
      setExpenseAdjustments((prev) => {
        const existingAdjustments = prev[key] || []
        
        if (editingAdjustmentId) {
          // Update existing adjustment
          const updatedAdjustments = existingAdjustments.map(adj =>
            adj.id === editingAdjustmentId
              ? {
                  ...adj,
                  type: adjustmentType,
                  amount: adjustmentType === "amount" ? adjustmentAmount : undefined,
                  percentage: adjustmentType === "percentage" ? adjustmentPercentage : undefined,
                  isRecurring: adjustmentIsRecurring,
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
          const newAdjustment: ExpenseAdjustment = {
            id: generateId(),
            rowId: editingAdjustment.rowId,
            yearIndex: editingAdjustment.yearIndex,
            type: adjustmentType,
            amount: adjustmentType === "amount" ? adjustmentAmount : undefined,
            percentage: adjustmentType === "percentage" ? adjustmentPercentage : undefined,
            isRecurring: adjustmentIsRecurring,
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
      setAdjustmentType("amount")
      setAdjustmentAmount(0)
      setAdjustmentPercentage(0)
      setAdjustmentIsRecurring(false)
      setAdjustmentNote("")
    }
  }

  // Delete adjustment
  const deleteAdjustment = (adjustmentId: string) => {
    if (title === "Estimation des revenus annuels") {
      // Delete revenue adjustment
      setRevenueAdjustments((prev) => {
        const newAdjustments: Record<string, RevenueAdjustment[]> = {}
        for (const [key, adjustments] of Object.entries(prev)) {
          const filtered = adjustments.filter(adj => adj.id !== adjustmentId)
          if (filtered.length > 0) {
            newAdjustments[key] = filtered
          }
        }
        return newAdjustments
      })
    } else {
      // Delete expense adjustment
      setExpenseAdjustments((prev) => {
        const newAdjustments: Record<string, ExpenseAdjustment[]> = {}
        for (const [key, adjustments] of Object.entries(prev)) {
          const filtered = adjustments.filter(adj => adj.id !== adjustmentId)
          if (filtered.length > 0) {
            newAdjustments[key] = filtered
          }
        }
        return newAdjustments
      })
    }
  }

  // Update expense type for a row
  const updateExpenseType = (rowId: string, newType: "variable" | "fixe") => {
    setExpenseTypes((prev) => ({
      ...prev,
      [rowId]: newType
    }))
  }

  // Check if notes are allowed for this view
  const isNoteAllowed = (): boolean => {
    return view === "current" || view === "comparison" || view === "ytd" || view === "ddm"
  }

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
  const generateBalanceAccounts = (label: string, current: number, prior: number): BalanceAccount[] => {
    // Generate sample balance accounts based on the row label
    const accounts: BalanceAccount[] = []
    
    if (label.includes("Services professionnels")) {
      accounts.push(
        { accountNumber: "4000", accountName: "Revenus de services", amount: Math.round(current * 0.6), priorAmount: Math.round(prior * 0.6), proportion: 0.6 },
        { accountNumber: "4010", accountName: "Revenus de consultation", amount: Math.round(current * 0.4), priorAmount: Math.round(prior * 0.4), proportion: 0.4 }
      )
    } else if (label.includes("Produits") && !label.includes("Coût")) {
      accounts.push(
        { accountNumber: "4100", accountName: "Revenus de vente de produits", amount: current, priorAmount: prior, proportion: 1.0 }
      )
    } else if (label.includes("Autres revenus")) {
      accounts.push(
        { accountNumber: "4200", accountName: "Revenus divers", amount: current, priorAmount: prior, proportion: 1.0 }
      )
    } else if (label.includes("Coût - Services")) {
      accounts.push(
        { accountNumber: "5000", accountName: "Coûts directs - Services", amount: Math.round(current * 0.7), priorAmount: Math.round(prior * 0.7), proportion: 0.7 },
        { accountNumber: "5010", accountName: "Sous-traitance", amount: Math.round(current * 0.3), priorAmount: Math.round(prior * 0.3), proportion: 0.3 }
      )
    } else if (label.includes("Coût - Produits")) {
      accounts.push(
        { accountNumber: "5100", accountName: "Coût des marchandises vendues", amount: current, priorAmount: prior, proportion: 1.0 }
      )
    } else if (label.includes("Salaires - Administrateurs")) {
      accounts.push(
        { accountNumber: "6000", accountName: "Salaires - Direction", amount: Math.round(current * 0.5), priorAmount: Math.round(prior * 0.5), proportion: 0.5 },
        { accountNumber: "6010", accountName: "Salaires - Administration", amount: Math.round(current * 0.5), priorAmount: Math.round(prior * 0.5), proportion: 0.5 }
      )
    } else if (label.includes("Location de bureaux")) {
      accounts.push(
        { accountNumber: "6100", accountName: "Loyer - Bureaux", amount: current, priorAmount: prior, proportion: 1.0 }
      )
    } else if (label.includes("Fournitures de bureau")) {
      accounts.push(
        { accountNumber: "6200", accountName: "Fournitures de bureau", amount: current, priorAmount: prior, proportion: 1.0 }
      )
    } else if (label.includes("Services professionnels") && label.includes("FRAIS")) {
      accounts.push(
        { accountNumber: "6300", accountName: "Services professionnels", amount: current, priorAmount: prior, proportion: 1.0 }
      )
    } else if (label.includes("Salaires - Vente")) {
      accounts.push(
        { accountNumber: "7000", accountName: "Salaires - Équipe de vente", amount: current, priorAmount: prior, proportion: 1.0 }
      )
    } else if (label.includes("Marketing")) {
      accounts.push(
        { accountNumber: "7100", accountName: "Publicité", amount: Math.round(current * 0.6), priorAmount: Math.round(prior * 0.6), proportion: 0.6 },
        { accountNumber: "7110", accountName: "Marketing digital", amount: Math.round(current * 0.4), priorAmount: Math.round(prior * 0.4), proportion: 0.4 }
      )
    } else if (label.includes("Commissions")) {
      accounts.push(
        { accountNumber: "7200", accountName: "Commissions de vente", amount: current, priorAmount: prior, proportion: 1.0 }
      )
    } else if (label.includes("Intérêts gagnés")) {
      accounts.push(
        { accountNumber: "8000", accountName: "Intérêts sur placements", amount: Math.abs(current), priorAmount: Math.abs(prior), proportion: 1.0 }
      )
    } else if (label.includes("Revenus de placement")) {
      accounts.push(
        { accountNumber: "8010", accountName: "Revenus de placements financiers", amount: Math.abs(current), priorAmount: Math.abs(prior), proportion: 1.0 }
      )
    } else if (label.includes("Intérêts débiteurs")) {
      accounts.push(
        { accountNumber: "8100", accountName: "Intérêts sur emprunts", amount: current, priorAmount: prior, proportion: 1.0 }
      )
    }
    
    return accounts
  }
  // Map backend FinancialStatementRow[] to internal DetailRow[] (for current/comparison views)
  const mapBackendRows = (apiRows: FinancialStatementRow[]): DetailRow[] => {
    const result: DetailRow[] = []
    const slugify = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    for (const row of apiRows) {
      // Push the section/result header row
      result.push({
        label: row.label,
        current: row.isSection ? 0 : (row.current ?? 0),
        prior: row.isSection ? 0 : (row.prior ?? 0),
        indent: false,
        isBold: row.isBold || row.isResult,
        isSubtotal: row.isResult,
        isSection: row.isSection,
      })

      // Flatten children as indented rows
      if (row.detailRows && row.detailRows.length > 0) {
        for (const dr of row.detailRows) {
          result.push({
            label: dr.label,
            current: dr.current ?? 0,
            prior: dr.prior ?? 0,
            indent: true,
            rowId: slugify(dr.label),
          })
        }
        // Add subtotal for section rows
        if (row.isSection) {
          result.push({
            label: `Total ${row.label}`,
            current: row.current ?? 0,
            prior: row.prior ?? 0,
            isBold: true,
            isSubtotal: true,
          })
          // Add spacer row
          result.push({ label: "", current: 0, prior: 0 })
        }
      }
    }
    return result
  }

  // Convert series API data to DetailRow[] for monthly views (12months)
  const getSeriesDetailRows = (): DetailRow[] => {
    if (!seriesRows.length || !seriesPeriods.length) return []
    return seriesRows.map((row) => {
      const amounts = getRowAmounts(row, seriesPeriods)
      const lastAmount = amounts[amounts.length - 1] || 0
      const priorAmount = amounts.length >= 2 ? amounts[amounts.length - 2] || 0 : 0
      return {
        label: row.label,
        current: lastAmount,
        prior: priorAmount,
        isBold: row.isBold || row.isResult,
        isSection: row.isSection,
        isSubtotal: row.isResult,
        indent: !row.isBold && !row.isSection && !row.isResult,
        trendValues: amounts,
        rowId: row.id,
      }
    })
  }

  // Convert series API data to DetailRow[] for quarterly views
  const getSeriesQuarterRows = (): DetailRow[] => {
    if (!seriesRows.length || !seriesPeriods.length) return []
    return seriesRows.map((row) => {
      const amounts = getRowAmounts(row, seriesPeriods)
      const { amounts: qAmounts } = aggregateToQuarters(amounts, seriesPeriods)
      const lastAmount = qAmounts[qAmounts.length - 1] || 0
      const priorAmount = qAmounts.length >= 2 ? qAmounts[qAmounts.length - 2] || 0 : 0
      return {
        label: row.label,
        current: lastAmount,
        prior: priorAmount,
        isBold: row.isBold || row.isResult,
        isSection: row.isSection,
        isSubtotal: row.isResult,
        indent: !row.isBold && !row.isSection && !row.isResult,
        trendValues: qAmounts,
        rowId: row.id,
      }
    })
  }

  // Convert series API data to DetailRow[] for yearly views
  const getSeriesYearRows = (): DetailRow[] => {
    if (!seriesRows.length || !seriesPeriods.length) return []
    return seriesRows.map((row) => {
      const amounts = getRowAmounts(row, seriesPeriods)
      const { amounts: yAmounts } = aggregateToYears(amounts, seriesPeriods)
      const lastAmount = yAmounts[yAmounts.length - 1] || 0
      const priorAmount = yAmounts.length >= 2 ? yAmounts[yAmounts.length - 2] || 0 : 0
      return {
        label: row.label,
        current: lastAmount,
        prior: priorAmount,
        isBold: row.isBold || row.isResult,
        isSection: row.isSection,
        isSubtotal: row.isResult,
        indent: !row.isBold && !row.isSection && !row.isResult,
        trendValues: yAmounts,
        rowId: row.id,
      }
    })
  }

  // Get base value (without adjustments) for a specific row and year
  const getBaseValue = (rowId: string, yearIndex: number, defaultValue: number, baseValue?: number): number => {
    const key = `${rowId}-${yearIndex}`
    // If value was manually edited, use it; otherwise use calculated default
    if (revenueValues[key] !== undefined) {
      return revenueValues[key]
    }
    
    // For fixed expenses, recalculate based on inflation if not manually edited
    if (title === "Estimation des dépenses annuelles" && getExpenseType(rowId) === "fixe" && yearIndex > 0) {
      // Get the base value (year 0) - either edited, provided, or default
      const baseKey = `${rowId}-0`
      const actualBaseValue = revenueValues[baseKey] !== undefined 
        ? revenueValues[baseKey] 
        : (baseValue !== undefined ? baseValue : defaultValue)
      // Calculate with compound inflation using the specific or global inflation rate
      const rate = getInflationRate(rowId)
      const compoundValue = actualBaseValue * Math.pow(1 + rate / 100, yearIndex)
      return Math.round(compoundValue)
    }
    
    return defaultValue
  }

  // Get forecast value for a specific row and year (uses edited values if available, applies adjustments)
  const getRevenueValue = (rowId: string | undefined, yearIndex: number, defaultValue: number, baseValue?: number): number => {
    if (!rowId || !isForecastSection) return defaultValue
    
    // Get base value (without adjustments)
    let calculatedValue = getBaseValue(rowId, yearIndex, defaultValue, baseValue)
    
    // Apply adjustments
    if (title === "Estimation des revenus annuels") {
      // Get all revenue adjustments for this year
      const adjustments = getRevenueAdjustments(rowId, yearIndex)
      if (adjustments.length > 0) {
        // Use the most recent adjustment (last one in the array)
        const adjustment = adjustments[adjustments.length - 1]
        
        if (adjustment.type === "amount") {
          // Direct amount
          calculatedValue = adjustment.value
        } else {
          // For growth types, we need the previous year's value
          const previousValue = yearIndex > 0 
            ? getRevenueValue(rowId, yearIndex - 1, defaultValue, baseValue)
            : calculatedValue
          
          if (adjustment.type === "growthPercent") {
            // Growth percentage
            calculatedValue = Math.round(previousValue * (1 + adjustment.value / 100))
          } else if (adjustment.type === "growthAmount") {
            // Growth amount in dollars
            calculatedValue = previousValue + adjustment.value
          }
        }
      }
    } else if (title === "Estimation des dépenses annuelles") {
      // Get all direct adjustments for this year
      const directAdjustments = getAdjustments(rowId, yearIndex)
      for (const adjustment of directAdjustments) {
        if (adjustment.type === "amount") {
          // Amount adjustment: add/subtract the amount
          calculatedValue = calculatedValue + (adjustment.amount || 0)
        } else if (adjustment.type === "percentage") {
          // Percentage adjustment: calculate expense as percentage of revenue
          // Get revenue for this year to calculate the expense percentage
          const revenueRow = data.find(r => 
            (r.label.toLowerCase().includes("total revenus") || 
             r.label.toLowerCase().includes("revenus totaux") ||
             (r.label.toLowerCase().includes("revenu") && r.isSubtotal)) &&
            r.trendValues && r.trendValues[yearIndex] !== undefined
          )
          if (revenueRow && revenueRow.trendValues) {
            const revenueValue = getRevenueValue(revenueRow.rowId || "", yearIndex, revenueRow.trendValues[yearIndex])
            const expenseFromPercentage = Math.round(revenueValue * (adjustment.percentage || 0) / 100)
            // Replace the calculated value with the percentage-based value
            calculatedValue = expenseFromPercentage
          }
        }
      }
      
      // Get all recurring adjustments from previous years
      const recurringAdjustments = getRecurringAdjustments(rowId, yearIndex)
      for (const adjustment of recurringAdjustments) {
        if (adjustment.type === "amount") {
          // Apply the recurring amount adjustment with inflation from the adjustment year to this year
          const rate = getInflationRate(rowId)
          const yearsDiff = yearIndex - adjustment.yearIndex
          const adjustedAmount = (adjustment.amount || 0) * Math.pow(1 + rate / 100, yearsDiff)
          calculatedValue = calculatedValue + Math.round(adjustedAmount)
        } else if (adjustment.type === "percentage") {
          // For recurring percentage adjustments, use the new percentage for all future years
          // Get revenue for this year to calculate the expense percentage
          const revenueRow = data.find(r => 
            (r.label.toLowerCase().includes("total revenus") || 
             r.label.toLowerCase().includes("revenus totaux") ||
             (r.label.toLowerCase().includes("revenu") && r.isSubtotal)) &&
            r.trendValues && r.trendValues[yearIndex] !== undefined
          )
          if (revenueRow && revenueRow.trendValues) {
            const revenueValue = getRevenueValue(revenueRow.rowId || "", yearIndex, revenueRow.trendValues[yearIndex])
            const expenseFromPercentage = Math.round(revenueValue * (adjustment.percentage || 0) / 100)
            // Replace the calculated value with the percentage-based value
            calculatedValue = expenseFromPercentage
          }
        }
      }
    }
    
    return calculatedValue
  }

  // Update forecast value for a row and year
  const updateRevenueValue = (rowId: string, yearIndex: number, newValue: number) => {
    const key = `${rowId}-${yearIndex}`
    setRevenueValues((prev) => ({
      ...prev,
      [key]: newValue
    }))
  }

  // Helper function to generate trend data for years (6 years for "Revenus", 6 years otherwise)
  const getYearsData = (): DetailRow[] => {
    const numYears = projectionYears + 1 // +1 for current year (projectionYears is 3, 4, or 5)
    const generateTrend = (base: number, growthRate: number = 0.05, rowId?: string) => {
      return Array.from({ length: numYears }, (_, i) => {
        if (isForecastSection) {
          // For forecast sections (Revenus or Dépenses), generate future years (years 0 to 5, starting from current year)
          const yearIndex = i
          
          // Check if this is a fixed expense and use inflation rate instead
          let effectiveGrowthRate = growthRate
          if (title === "Estimation des dépenses annuelles" && rowId && getExpenseType(rowId) === "fixe") {
            // Use inflation rate for fixed expenses (will be calculated per year)
            effectiveGrowthRate = 0 // Will be handled separately
          }
          
          // Calculate default value with compound growth
          let defaultValue: number
          if (yearIndex === 0) {
            defaultValue = base
          } else {
            // For fixed expenses with inflation, use compound inflation with year-specific rates
            if (title === "Estimation des dépenses annuelles" && rowId && getExpenseType(rowId) === "fixe") {
              // Get base value (year 0) - check if edited first
              const baseKey = `${rowId}-0`
              const actualBase = revenueValues[baseKey] !== undefined ? revenueValues[baseKey] : base
              // Calculate with compound inflation using the specific or global rate
              const rate = getInflationRate(rowId)
              const compoundValue = actualBase * Math.pow(1 + rate / 100, yearIndex)
              defaultValue = Math.round(compoundValue)
            } else if (title === "Estimation des dépenses annuelles" && rowId && getExpenseType(rowId) === "variable") {
              // For variable expenses, calculate as percentage of revenue
              const variableRate = getVariableRate(rowId)
              if (variableRate > 0) {
                // Find revenue row
                const revenueRow = data.find(r => 
                  (r.label.toLowerCase().includes("total revenus") || 
                   r.label.toLowerCase().includes("revenus totaux") ||
                   (r.label.toLowerCase().includes("revenu") && r.isSubtotal)) &&
                  r.trendValues && r.trendValues[yearIndex] !== undefined
                )
                if (revenueRow && revenueRow.trendValues) {
                  const revenueValue = getRevenueValue(revenueRow.rowId || "", yearIndex, revenueRow.trendValues[yearIndex])
                  defaultValue = Math.round(revenueValue * variableRate / 100)
                } else {
                  // Fallback to compound growth if revenue not found
                  defaultValue = Math.round(base * Math.pow(1 + effectiveGrowthRate, yearIndex))
                }
              } else {
                // No variable rate set, use compound growth
                defaultValue = Math.round(base * Math.pow(1 + effectiveGrowthRate, yearIndex))
              }
            } else {
              // Compound growth: base * (1 + rate) ^ yearIndex
              defaultValue = Math.round(base * Math.pow(1 + effectiveGrowthRate, yearIndex))
            }
          }

          // Use edited value if available, otherwise use default
          return rowId ? getRevenueValue(rowId, yearIndex, defaultValue, base) : defaultValue
        } else {
          // For other views, generate past years
          const yearIndex = (numYears - 1) - i
          return Math.round(base * (1 + growthRate * yearIndex))
        }
      })
    }

    const rows: DetailRow[] = [
      // Revenues
      { label: "REVENUS", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Ventes - Services professionnels", current: 2160000, prior: 1920000, indent: true, trendValues: generateTrend(2160000, 0.06, "revenue-services"), rowId: "revenue-services" },
      { label: "Ventes - Produits", current: 840000, prior: 720000, indent: true, trendValues: generateTrend(840000, 0.05, "revenue-products"), rowId: "revenue-products" },
      { label: "Autres revenus", current: 300000, prior: 224000, indent: true, trendValues: generateTrend(300000, 0.06, "revenue-other"), rowId: "revenue-other" },
      { label: "Total Revenus", current: 3300000, prior: 2864000, isBold: true, isSubtotal: true, trendValues: generateTrend(3300000, 0.06) },
      { label: "", current: 0, prior: 0 },

      // COGS
      { label: "COÛT DES PRODUITS VENDUS", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Coût - Services", current: 1080000, prior: 960000, indent: true, trendValues: generateTrend(1080000, 0.05), rowId: "cogs-services" },
      { label: "Coût - Produits", current: 420000, prior: 360000, indent: true, trendValues: generateTrend(420000, 0.045), rowId: "cogs-products" },
      { label: "Total COGS", current: 1500000, prior: 1320000, isBold: true, isSubtotal: true, trendValues: generateTrend(1500000, 0.05) },
      { label: "", current: 0, prior: 0 },

      // Admin expenses
      { label: "FRAIS D'ADMINISTRATION", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Salaires - Administrateurs", current: 480000, prior: 420000, indent: true, trendValues: generateTrend(480000, 0.03), rowId: "admin-salaries" },
      { label: "Location de bureaux", current: 96000, prior: 96000, indent: true, trendValues: generateTrend(96000, 0), rowId: "admin-rent" },
      { label: "Fournitures de bureau", current: 42000, prior: 38400, indent: true, trendValues: generateTrend(42000, 0.02), rowId: "admin-supplies" },
      { label: "Services professionnels", current: 84000, prior: 78000, indent: true, trendValues: generateTrend(84000, 0.025), rowId: "admin-prof-services" },
      { label: "Total Frais d'administration", current: 702000, prior: 632400, isBold: true, isSubtotal: true, trendValues: generateTrend(702000, 0.03) },
      { label: "", current: 0, prior: 0 },

      // Sales expenses
      { label: "FRAIS DE VENTE", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Salaires - Vente", current: 216000, prior: 180000, indent: true, trendValues: generateTrend(216000, 0.04), rowId: "sales-salaries" },
      { label: "Marketing et publicité", current: 144000, prior: 120000, indent: true, trendValues: generateTrend(144000, 0.045), rowId: "sales-marketing" },
      { label: "Commissions", current: 72000, prior: 87600, indent: true, trendValues: generateTrend(72000, -0.01), rowId: "sales-commissions" },
      { label: "Total Frais de vente", current: 432000, prior: 387600, isBold: true, isSubtotal: true, trendValues: generateTrend(432000, 0.04) },
      { label: "", current: 0, prior: 0 },

      // Other expenses/revenues
      { label: "AUTRES DÉPENSES (REVENUS)", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Intérêts gagnés", current: -24000, prior: -24000, indent: true, trendValues: generateTrend(-24000, 0), rowId: "other-interest-earned" },
      { label: "Revenus de placement", current: -18000, prior: -18000, indent: true, trendValues: generateTrend(-18000, 0), rowId: "other-investment-income" },
      { label: "Intérêts débiteurs", current: 12000, prior: 12000, indent: true, trendValues: generateTrend(12000, 0), rowId: "other-interest-expense" },
      { label: "Total Autres dépenses (revenus)", current: -42000, prior: -42000, isBold: true, isSubtotal: true, trendValues: generateTrend(-42000, 0) },
    ]
    
    // Add balance accounts to rows that have rowId
    // Only generate balance accounts if projectionMode is "gl" or if it's not a forecast section
    const isForecastSectionForBalanceAccounts = title === "Estimation des revenus annuels" || title === "Estimation des dépenses annuelles" || title === "Estimation des Capex annuels" || title === "États des résultats pro forma"
    return rows.map((row) => {
      if (row.rowId && (projectionMode === "gl" || !isForecastSectionForBalanceAccounts)) {
        return {
          ...row,
          balanceAccounts: generateBalanceAccounts(row.label, row.current, row.prior)
        }
      }
      return row
    })
  }

  const getDetailData = (): DetailRow[] => {
    // Return series API data for multi-period views (non-forecast)
    if (view === "12months" && !isForecastSection) {
      return getSeriesDetailRows()
    }
    if (view === "quarters" && !isForecastSection) {
      return getSeriesQuarterRows()
    }
    if (view === "years" && !isForecastSection) {
      return getSeriesYearRows()
    }
    // Forecast sections still use getYearsData for projection logic
    if (view === "years" && isForecastSection) {
      return getYearsData()
    }
    // Use page-level API data for current/comparison/ytd/ddm views when available
    // The parent page fetches with the appropriate period parameter (monthly, quarterly, annual, ytd)
    // and comparison type, so backendRows already contain the correct data for all these views.
    if (!isForecastSection && backendRows.length > 0) {
      return mapBackendRows(backendRows)
    }
    // No data available
    return []
  }

  // Helper function to capitalize first letter
  const capitalizeFirst = (str: string): string => {
    if (!str) return str
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  let data = getDetailData()
  
  // Find revenue value for percentage calculations BEFORE filtering data
  // (look for "Total Revenus" with isSubtotal)
  const revenueRow = data.find((row) => row.label.toLowerCase().includes("total revenus") && row.isSubtotal)
  const revenueCurrent = revenueRow?.current || 1
  const revenuePrior = revenueRow?.prior || 1
  
  // Filter data to show only REVENUS section if title is "Estimation des revenus annuels"
  if (title === "Estimation des revenus annuels") {
    const revenueSectionStart = data.findIndex(row => row.label === "REVENUS")
    if (revenueSectionStart !== -1) {
      // Find "Total Revenus" and stop right after it (excluding the spacer row)
      const totalRevenusIndex = data.findIndex((row, idx) => 
        idx > revenueSectionStart && 
        row.label.toLowerCase().includes("total revenus") && 
        row.isSubtotal
      )
      if (totalRevenusIndex !== -1) {
        // Include "Total Revenus" but exclude the spacer row after it
        data = data.slice(revenueSectionStart, totalRevenusIndex + 1)
      } else {
        // Fallback: find the end of REVENUS section (next section or end of array)
        let revenueSectionEnd = data.findIndex((row, idx) => 
          idx > revenueSectionStart && 
          row.isSection && 
          row.label !== "REVENUS"
        )
        if (revenueSectionEnd === -1) {
          revenueSectionEnd = data.length
        }
        data = data.slice(revenueSectionStart, revenueSectionEnd)
      }
    }
  }
  
  // Filter data to exclude REVENUS section if title is "Estimation des dépenses annuelles"
  if (title === "Estimation des dépenses annuelles") {
    const revenueSectionStart = data.findIndex(row => row.label === "REVENUS")
    if (revenueSectionStart !== -1) {
      // Find the end of REVENUS section (next section or end of array)
      let revenueSectionEnd = data.findIndex((row, idx) => 
        idx > revenueSectionStart && 
        row.isSection && 
        row.label !== "REVENUS"
      )
      if (revenueSectionEnd === -1) {
        revenueSectionEnd = data.length
      }
      // Exclude the spacer row after Total Revenus if it exists
      if (revenueSectionEnd < data.length && data[revenueSectionEnd] && data[revenueSectionEnd].label === "") {
        revenueSectionEnd++
      }
      // Remove the REVENUS section (from start to end, including spacer)
      data = [...data.slice(0, revenueSectionStart), ...data.slice(revenueSectionEnd)]
    }
  }
  
  // If projectionMode is "account", remove balanceAccounts from all rows in forecast sections
  // This must be done AFTER all filtering operations
  const isForecastSectionForBalanceAccounts = title === "Estimation des revenus annuels" || title === "Estimation des dépenses annuelles" || title === "Estimation des Capex annuels" || title === "États des résultats pro forma"
  if (projectionMode === "account" && isForecastSectionForBalanceAccounts) {
    data = data.map((row) => {
      // Always remove balanceAccounts in account mode for forecast sections
      if (row.balanceAccounts || 'balanceAccounts' in row) {
        const { balanceAccounts, ...rowWithoutBalanceAccounts } = row
        return rowWithoutBalanceAccounts
      }
      return row
    })
  }
  
  // Determine loading state early so it can be used in both empty-data and loading checks
  const isDataLoading = (seriesLoading && isMultiPeriodView && !isForecastSection) || (loading && !isForecastSection && !isMultiPeriodView)

  // Show "no data" state when data is empty and not loading
  if (data.length === 0 && !isDataLoading && !isForecastSection) {
    return (
      <div className="w-full bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
        <div className="bg-white px-8 py-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">{title}</h2>
          </div>
        </div>
        <div className="px-8 py-16 text-center">
          <p className="text-sm text-slate-500">Aucune donnée disponible pour cette période.</p>
        </div>
      </div>
    )
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
    else if (view === "quarters") parts.push("5 derniers trimestres")
    else if (view === "years") parts.push(title === "Estimation des revenus annuels" ? "6 prochaines années" : "6 dernières années")

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

  // Helper function to generate month labels (12 months)
  const getMonthLabels = (): string[] => {
    if (seriesPeriods.length > 0 && !isForecastSection) {
      return getPeriodLabels(seriesPeriods)
    }
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
      // Generate projectionYears + 1 years starting from current year (current year + 0 to projectionYears)
      for (let i = 0; i <= projectionYears; i++) {
        labels.push(`${currentYear + i}`)
      }
    } else {
      // Generate 6 past years (unchanged for historical data)
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

  // Show loading state when fetching data
  if (isDataLoading) {
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

  return (
    <div className="w-full bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
      {/* Header */}
      <div className="bg-white px-8 py-5 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">{title}</h2>
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
          {/* Toggle button for growth rate - only show for forecast sections with years view, but not for "États des résultats pro forma" */}
          {isForecastSection && view === "years" && title !== "États des résultats pro forma" && (
            <div className="flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGrowthRate(!showGrowthRate)}
                className={cn(
                  "h-8 text-xs px-3 text-white hover:bg-white hover:text-slate-900 border border-slate-600",
                  showGrowthRate && "bg-slate-700"
                )}
              >
                <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                {showGrowthRate 
                  ? "Montants" 
                  : (title === "Estimation des revenus annuels" ? "Croissance" : "% des revenus")}
              </Button>
            </div>
          )}
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
                  {/* Type column for Dépenses section */}
                  {title === "Estimation des dépenses annuelles" && (
                    <th className="px-4 py-4 text-center font-semibold text-slate-900 text-sm whitespace-nowrap">
                      Type
                    </th>
                  )}
                  {/* New column between Type and years for Dépenses section */}
                  {title === "Estimation des dépenses annuelles" && (
                    <th className="px-4 py-4 text-center font-semibold text-slate-900 text-sm whitespace-nowrap">
                      Taux
                    </th>
                  )}
                  {getYearLabels().map((label, idx) => (
                    <th 
                      key={idx} 
                      className={cn(
                        "px-4 py-4 text-right font-semibold text-sm whitespace-nowrap",
                        isForecastSection && idx === 0 
                          ? "bg-slate-50 text-slate-900" 
                          : "text-slate-900"
                      )}
                    >
                      {label}
                    </th>
                  ))}
                </>
              )}
            </tr>
            {/* Inflation rate row for Dépenses section */}
            {title === "Estimation des dépenses annuelles" && view === "years" && (
              <tr className="bg-slate-50 border-b border-slate-200">
                {/* Label cell */}
                <th className="px-6 py-2 text-left">
                  <span className="text-xs font-medium text-slate-700">Taux d'inflation pour les dépenses fixes:</span>
                </th>
                {/* Empty cell for "Type" column */}
                <th className="px-4 py-2"></th>
                {/* Inflation rate input in "Taux" column */}
                <th className="px-4 py-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={inflationRate}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0
                        updateInflationRate(value)
                      }}
                      className="w-20 h-7 text-xs text-right font-semibold px-2 py-1"
                      placeholder="2.0"
                    />
                    <span className="text-xs text-slate-600">%</span>
                  </div>
                </th>
                {/* Empty cells for year columns */}
                {getYearLabels().map((_, idx) => (
                  <th key={idx} className="px-4 py-2"></th>
                ))}
              </tr>
            )}
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
              
              // Check if this row can be expanded and if it's expanded
              // If projectionMode is "account", disable expansion for forecast sections (revenus, dépenses, capex, états des résultats pro forma)
              const isForecastSectionForExpansion = title === "Estimation des revenus annuels" || title === "Estimation des dépenses annuelles" || title === "Estimation des Capex annuels" || title === "États des résultats pro forma"
              // Force canExpand to false if in "account" mode for forecast sections - this is the primary check
              const canExpand = (projectionMode === "account" && isForecastSectionForExpansion) 
                ? false 
                : (!!row.rowId && !!row.balanceAccounts && Array.isArray(row.balanceAccounts) && row.balanceAccounts.length > 0)
              const isExpanded = row.rowId ? expandedRows.has(row.rowId) : false
              
              // Check if this row has a note
              const hasNote = row.rowId
                ? getNoteByRowId(row.rowId, "income-statement", period, view, companyId, divisionId, subDivisionId) !== null
                : false

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
                                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            )}
                            title={hasNote ? "Voir/Modifier la note" : "Ajouter une note"}
                          >
                            <StickyNote className={cn("w-4 h-4", hasNote && "fill-current")} />
                          </button>
                        )}
                      </div>
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
                      ) : columnMode === "percentage" ? (
                        <>
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.current !== 0 ? `${getRevenuePercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
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
                        const entityRevenue = getEntityData(entityIdx, [revenueRow || { current: 1, prior: 1, label: "", isSubtotal: false }])[0]
                        const entityRevenueValue = entityRevenue?.current || 1
                        // In comparison mode, always show currency (percentage mode is handled separately)
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
                  {view === "ddm" && !isComparisonMode && (
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
                      ) : columnMode === "percentage" ? (
                        <>
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.current !== 0 ? `${getRevenuePercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
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
                            className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}
                          >
                            {entityData.current !== 0 ? formatCurrency(entityData.current) : "-"}
                          </td>
                        )
                      })}
                    </>
                  )}

                  {view === "ytd" && !isComparisonMode && (
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
                      ) : columnMode === "percentage" ? (
                        <>
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.current !== 0 ? `${getRevenuePercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
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
                            className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}
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
                      {/* Type cell for Dépenses section */}
                      {title === "Estimation des dépenses annuelles" && (
                        <td className="px-4 py-3 text-center">
                          {shouldHideAmounts ? (
                            "-"
                          ) : row.rowId ? (
                            <div className="flex items-center justify-center gap-2">
                              <span className={cn(
                                "text-xs font-medium px-2 py-1 rounded",
                                getExpenseType(row.rowId) === "variable" 
                                  ? "text-blue-600 bg-blue-50" 
                                  : "text-purple-600 bg-purple-50"
                              )}>
                                {getExpenseType(row.rowId) === "variable" ? "Variable" : "Fixe"}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (row.rowId) {
                                    openTypeRateModal(row.rowId)
                                  }
                                }}
                                className="p-1 rounded hover:bg-slate-200 transition-colors"
                                title="Modifier le Type et le Taux"
                              >
                                <Settings className="w-3.5 h-3.5 text-slate-600" />
                              </button>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                      )}
                      {/* Taux column cell for Dépenses section */}
                      {title === "Estimation des dépenses annuelles" && view === "years" && (
                        <td className="px-4 py-3 text-center text-slate-700">
                          {row.rowId && !shouldHideAmounts ? (
                            <div className="flex items-center justify-center">
                              {getExpenseType(row.rowId) === "variable" ? (
                                <span className="text-blue-600 font-medium">
                                  {getVariableRate(row.rowId) !== 0 ? `${getVariableRate(row.rowId).toFixed(1)}%` : "-"}
                                </span>
                              ) : (
                                <span className="text-purple-600 font-medium">
                                  {getInflationRate(row.rowId).toFixed(1)}%
                                </span>
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                      )}
                      {row.trendValues.map((value, valueIdx) => {
                        // Get the actual value (edited or default) for forecast sections
                        const actualValue = isForecastSection && row.rowId 
                          ? getRevenueValue(row.rowId, valueIdx, value)
                          : value
                        
                        // Check if this cell is editable (forecast section, not first year, has rowId)
                        // For "Estimation des dépenses annuelles", "Estimation des revenus annuels", and "États des résultats pro forma", cells are not directly editable (only via adjustments)
                        const isEditable = isForecastSection && valueIdx > 0 && row.rowId && !shouldHideAmounts && title !== "Estimation des dépenses annuelles" && title !== "Estimation des revenus annuels" && title !== "États des résultats pro forma"
                        const cellKey = row.rowId ? `${row.rowId}-${valueIdx}` : null
                        const isEditing = isEditable && editingCell === cellKey
                        
                        // Get previous value for growth calculation
                        const previousValue = valueIdx > 0 && row.trendValues 
                          ? (isForecastSection && row.rowId 
                              ? getRevenueValue(row.rowId, valueIdx - 1, row.trendValues[valueIdx - 1])
                              : row.trendValues[valueIdx - 1])
                          : null
                        
                        // Calculate growth rate if showGrowthRate is true and not first year
                        let displayValue: string | number = actualValue
                        let growthRate: number | null = null
                        if (showGrowthRate && isForecastSection && valueIdx > 0 && previousValue !== null) {
                          if (previousValue !== 0) {
                            growthRate = calculateVariation(actualValue, previousValue)
                            displayValue = growthRate !== null ? `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(1)}%` : "-"
                          } else {
                            displayValue = "-"
                          }
                        } else if (showGrowthRate && isForecastSection && valueIdx === 0) {
                          displayValue = "-" // No growth rate for first year
                        }
                        
                        return (
                          <td
                            key={valueIdx}
                            className={cn(
                              "px-4 py-3 text-right",
                              row.isBold ? "font-semibold font-bold" : "text-slate-500",
                              shouldHideAmounts ? "text-white" : "",
                              isForecastSection && valueIdx === 0 && !shouldHideAmounts ? "bg-slate-50" : "",
                              isEditable && !isEditing && "hover:bg-slate-50 cursor-pointer",
                              showGrowthRate && isForecastSection && valueIdx > 0 && !shouldHideAmounts && typeof displayValue === "string" && displayValue.includes("%") && title === "Estimation des revenus annuels" ? "text-slate-900" : "",
                              showGrowthRate && isForecastSection && valueIdx > 0 && !shouldHideAmounts && typeof displayValue === "string" && displayValue.includes("%") && growthRate !== null && growthRate >= 0 && title !== "Estimation des revenus annuels" ? "text-emerald-600 font-semibold" : "",
                              showGrowthRate && isForecastSection && valueIdx > 0 && !shouldHideAmounts && typeof displayValue === "string" && displayValue.includes("%") && growthRate !== null && growthRate < 0 && title !== "Estimation des revenus annuels" ? "text-red-600 font-semibold" : ""
                            )}
                            onClick={() => {
                              // Only allow editing if not in "Estimation des dépenses annuelles" or "États des résultats pro forma"
                              if (isEditable && !isEditing && title !== "Estimation des dépenses annuelles" && title !== "États des résultats pro forma") {
                                setEditingCell(cellKey!)
                              }
                            }}
                          >
                            {shouldHideAmounts ? (
                              "-"
                            ) : isEditable && isEditing ? (
                              <Input
                                type="text"
                                value={showGrowthRate && previousValue !== null && previousValue !== 0
                                  ? (growthRate !== null ? `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(1)}` : "")
                                  : actualValue.toString()}
                                onChange={(e) => {
                                  const inputValue = e.target.value
                                  if (showGrowthRate && previousValue !== null && previousValue !== 0) {
                                    // Editing growth rate percentage
                                    const cleanValue = inputValue.replace(/[^\d.-]/g, "")
                                    const growthPercent = parseFloat(cleanValue) || 0
                                    // Calculate new amount: previousValue * (1 + growthPercent/100)
                                    const newAmount = Math.round(previousValue * (1 + growthPercent / 100))
                                    if (row.rowId) {
                                      updateRevenueValue(row.rowId, valueIdx, newAmount)
                                    }
                                  } else {
                                    // Editing amount
                                    const cleanValue = inputValue.replace(/[^\d-]/g, "")
                                    const newAmount = cleanValue === "" || cleanValue === "-" ? 0 : parseInt(cleanValue, 10)
                                    if (row.rowId) {
                                      updateRevenueValue(row.rowId, valueIdx, newAmount)
                                    }
                                  }
                                }}
                                onBlur={() => setEditingCell(null)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === "Escape") {
                                    setEditingCell(null)
                                  }
                                }}
                                className="w-24 text-right font-semibold text-sm"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <span>
                                  {showGrowthRate && isForecastSection 
                                    ? displayValue 
                                    : (actualValue !== 0 ? formatCurrency(actualValue) : "-")}
                                </span>
                                {((title === "Estimation des dépenses annuelles" || title === "Estimation des revenus annuels") && valueIdx > 0 && row.rowId && !shouldHideAmounts) && (
                                  // Only show adjustment button for account-level rows if projectionMode is "account"
                                  // Only show adjustment button for GL-level rows if projectionMode is "gl"
                                  // For now, we only show adjustments for account-level rows (balance accounts will be handled separately)
                                  projectionMode === "account" && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (row.rowId) {
                                          openAdjustmentModal(row.rowId, valueIdx)
                                        }
                                      }}
                                      className={cn(
                                        "p-1 rounded hover:bg-slate-200 transition-colors relative",
                                        title === "Estimation des dépenses annuelles" 
                                          ? (getAdjustments(row.rowId || "", valueIdx).length > 0 && "text-blue-600")
                                          : (getRevenueAdjustments(row.rowId || "", valueIdx).length > 0 && "text-blue-600")
                                      )}
                                      title={title === "Estimation des dépenses annuelles"
                                        ? `Ajustements (${getAdjustments(row.rowId || "", valueIdx).length})`
                                        : `Ajustements (${getRevenueAdjustments(row.rowId || "", valueIdx).length})`}
                                    >
                                      <Settings className="w-3.5 h-3.5" />
                                      {title === "Estimation des dépenses annuelles" 
                                        ? (getAdjustments(row.rowId || "", valueIdx).length > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                              {getAdjustments(row.rowId || "", valueIdx).length}
                                            </span>
                                          ))
                                        : (getRevenueAdjustments(row.rowId || "", valueIdx).length > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                              {getRevenueAdjustments(row.rowId || "", valueIdx).length}
                                            </span>
                                          ))}
                                    </button>
                                  )
                                )}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </>
                  )}
                  {/* Empty cells for spacer rows in trend views */}
                  {(view === "12months" || view === "quarters" || view === "years") && !row.trendValues && (
                    <>
                      {/* Empty type cell for Dépenses section */}
                      {title === "Estimation des dépenses annuelles" && view === "years" && (
                        <td className="px-4 py-3 text-center text-white">-</td>
                      )}
                      {/* Empty new column cell for Dépenses section */}
                      {title === "Estimation des dépenses annuelles" && view === "years" && (
                        <td className="px-4 py-3 text-center text-white">-</td>
                      )}
                      {Array.from({ length: view === "12months" ? 12 : view === "quarters" ? 5 : (isForecastSection && view === "years" ? projectionYears + 1 : 6) }).map((_, idx) => (
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
                        
                        return (
                          <tr key={`${idx}-account-${accIdx}`} className="bg-slate-50 border-b border-slate-200">
                            <td className="px-6 py-2 text-slate-600 pl-20">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-slate-500">{account.accountNumber}</span>
                                <span className="text-sm">{account.accountName}</span>
                              </div>
                            </td>
                            
                            {view === "comparison" && !isComparisonMode && (
                              <>
                                <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                  {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                                </td>
                                <td className="px-6 py-2 text-right text-sm text-slate-500">
                                  {account.priorAmount !== undefined && account.priorAmount !== 0 ? formatCurrency(account.priorAmount) : "-"}
                                </td>
                                {columnMode === "variations" ? (
                                  <>
                                    <td className={`px-6 py-2 text-right font-semibold text-sm font-semibold ${
                                      accountVariation && accountVariation >= 0 ? "text-emerald-600" : "text-red-600"
                                    }`}>
                                      {accountVariation !== null && account.amount !== 0
                                        ? `${accountVariation >= 0 ? "+" : ""}${accountVariation.toFixed(1)}%`
                                        : "-"}
                                    </td>
                                    <td className={`px-6 py-2 text-right font-semibold text-sm font-semibold ${
                                      accountVariationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                                    }`}>
                                      {account.amount !== 0
                                        ? `${accountVariationAmount >= 0 ? "+" : ""}${formatCurrency(accountVariationAmount)}`
                                        : "-"}
                                    </td>
                                  </>
                                ) : columnMode === "percentage" ? (
                                  <>
                                    <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                      {account.amount !== 0 ? `${getRevenuePercentage(account.amount, false).toFixed(1)}%` : "-"}
                                    </td>
                                    <td className="px-6 py-2 text-right font-semibold text-sm text-slate-600">
                                      {account.priorAmount !== undefined && account.priorAmount !== 0 ? `${getRevenuePercentage(account.priorAmount, true).toFixed(1)}%` : "-"}
                                    </td>
                                  </>
                                ) : null}
                              </>
                            )}
                            
                            {view === "current" && (
                              <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                              </td>
                            )}
                            
                            {view === "ytd" && !isComparisonMode && (
                              <>
                                <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                  {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                                </td>
                                <td className="px-6 py-2 text-right text-sm text-slate-500">
                                  {account.priorAmount !== undefined && account.priorAmount !== 0 ? formatCurrency(account.priorAmount) : "-"}
                                </td>
                                {columnMode === "variations" ? (
                                  <>
                                    <td className={`px-6 py-2 text-right font-semibold text-sm font-semibold ${
                                      accountVariation && accountVariation >= 0 ? "text-emerald-600" : "text-red-600"
                                    }`}>
                                      {accountVariation !== null && account.amount !== 0
                                        ? `${accountVariation >= 0 ? "+" : ""}${accountVariation.toFixed(1)}%`
                                        : "-"}
                                    </td>
                                    <td className={`px-6 py-2 text-right font-semibold text-sm font-semibold ${
                                      accountVariationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                                    }`}>
                                      {account.amount !== 0
                                        ? `${accountVariationAmount >= 0 ? "+" : ""}${formatCurrency(accountVariationAmount)}`
                                        : "-"}
                                    </td>
                                  </>
                                ) : columnMode === "percentage" ? (
                                  <>
                                    <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                      {account.amount !== 0 ? `${getRevenuePercentage(account.amount, false).toFixed(1)}%` : "-"}
                                    </td>
                                    <td className="px-6 py-2 text-right font-semibold text-sm text-slate-600">
                                      {account.priorAmount !== undefined && account.priorAmount !== 0 ? `${getRevenuePercentage(account.priorAmount, true).toFixed(1)}%` : "-"}
                                    </td>
                                  </>
                                ) : null}
                              </>
                            )}
                            
                            {view === "ddm" && !isComparisonMode && (
                              <>
                                <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                  {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                                </td>
                                <td className="px-6 py-2 text-right text-sm text-slate-500">
                                  {account.priorAmount !== undefined && account.priorAmount !== 0 ? formatCurrency(account.priorAmount) : "-"}
                                </td>
                                {columnMode === "variations" ? (
                                  <>
                                    <td className={`px-6 py-2 text-right font-semibold text-sm font-semibold ${
                                      accountVariation && accountVariation >= 0 ? "text-emerald-600" : "text-red-600"
                                    }`}>
                                      {accountVariation !== null && account.amount !== 0
                                        ? `${accountVariation >= 0 ? "+" : ""}${accountVariation.toFixed(1)}%`
                                        : "-"}
                                    </td>
                                    <td className={`px-6 py-2 text-right font-semibold text-sm font-semibold ${
                                      accountVariationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                                    }`}>
                                      {account.amount !== 0
                                        ? `${accountVariationAmount >= 0 ? "+" : ""}${formatCurrency(accountVariationAmount)}`
                                        : "-"}
                                    </td>
                                  </>
                                ) : columnMode === "percentage" ? (
                                  <>
                                    <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                      {account.amount !== 0 ? `${getRevenuePercentage(account.amount, false).toFixed(1)}%` : "-"}
                                    </td>
                                    <td className="px-6 py-2 text-right font-semibold text-sm text-slate-600">
                                      {account.priorAmount !== undefined && account.priorAmount !== 0 ? `${getRevenuePercentage(account.priorAmount, true).toFixed(1)}%` : "-"}
                                    </td>
                                  </>
                                ) : null}
                              </>
                            )}
                            
                            {/* Trend views - 12months, quarters, years */}
                            {view === "12months" && row.trendValues && (
                              <>
                                {row.trendValues.map((rowTrendValue, valueIdx) => {
                                  // Calculate account amount based on proportion
                                  const accountTrendValue = account.proportion !== undefined
                                    ? Math.round(rowTrendValue * account.proportion)
                                    : rowTrendValue
                                  
                                  return (
                                    <td key={valueIdx} className="px-4 py-2 text-right font-semibold text-sm text-slate-700">
                                      {accountTrendValue !== 0 ? formatCurrency(accountTrendValue) : "-"}
                                    </td>
                                  )
                                })}
                              </>
                            )}
                            
                            {view === "quarters" && row.trendValues && (
                              <>
                                {row.trendValues.map((rowTrendValue, valueIdx) => {
                                  // Calculate account amount based on proportion
                                  const accountTrendValue = account.proportion !== undefined
                                    ? Math.round(rowTrendValue * account.proportion)
                                    : rowTrendValue
                                  
                                  return (
                                    <td key={valueIdx} className="px-4 py-2 text-right font-semibold text-sm text-slate-700">
                                      {accountTrendValue !== 0 ? formatCurrency(accountTrendValue) : "-"}
                                    </td>
                                  )
                                })}
                              </>
                            )}
                            
                            {view === "years" && row.trendValues && (
                              <>
                                {/* Type cell for balance accounts in Dépenses section */}
                                {title === "Estimation des dépenses annuelles" && (
                                  <td className="px-4 py-2 text-center text-slate-700">
                                    {row.rowId ? (
                                      <span className={cn(
                                        "text-xs font-medium px-2 py-0.5 rounded",
                                        getExpenseType(row.rowId) === "variable" 
                                          ? "text-blue-600 bg-blue-50" 
                                          : "text-purple-600 bg-purple-50"
                                      )}>
                                        {getExpenseType(row.rowId) === "variable" ? "Variable" : "Fixe"}
                                      </span>
                                    ) : (
                                      "-"
                                    )}
                                  </td>
                                )}
                                {/* Taux column cell for balance accounts in Dépenses section */}
                                {title === "Estimation des dépenses annuelles" && (
                                  <td className="px-4 py-2 text-center text-slate-700">
                                    {row.rowId ? (
                                      getExpenseType(row.rowId) === "variable" ? (
                                        <span className="text-blue-600 font-medium text-xs">
                                          {getVariableRate(row.rowId) !== 0 ? `${getVariableRate(row.rowId).toFixed(1)}%` : "-"}
                                        </span>
                                      ) : (
                                        <span className="text-purple-600 font-medium text-xs">
                                          {getInflationRate(row.rowId).toFixed(1)}%
                                        </span>
                                      )
                                    ) : (
                                      "-"
                                    )}
                                  </td>
                                )}
                                {row.trendValues.map((rowTrendValue, valueIdx) => {
                                  // Get the actual row value (edited or default) for forecast sections
                                  const actualRowValue = isForecastSection && row.rowId 
                                    ? getRevenueValue(row.rowId, valueIdx, rowTrendValue)
                                    : rowTrendValue
                                  
                                  // Calculate account amount based on proportion
                                  const accountTrendValue = account.proportion !== undefined
                                    ? Math.round(actualRowValue * account.proportion)
                                    : actualRowValue
                                  
                                  // Get previous value for growth calculation
                                  const previousRowValue = valueIdx > 0 && row.trendValues
                                    ? (isForecastSection && row.rowId
                                        ? getRevenueValue(row.rowId, valueIdx - 1, row.trendValues[valueIdx - 1])
                                        : row.trendValues[valueIdx - 1])
                                    : null
                                  
                                  // Calculate growth rate if showGrowthRate is true and not first year
                                  let displayValue: string | number = accountTrendValue
                                  let growthRate: number | null = null
                                  if (showGrowthRate && isForecastSection && valueIdx > 0 && previousRowValue !== null) {
                                    const previousAccountValue = account.proportion !== undefined
                                      ? Math.round(previousRowValue * account.proportion)
                                      : previousRowValue
                                    if (previousAccountValue !== 0) {
                                      growthRate = calculateVariation(accountTrendValue, previousAccountValue)
                                      displayValue = growthRate !== null ? `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(1)}%` : "-"
                                    } else {
                                      displayValue = "-"
                                    }
                                  } else if (showGrowthRate && isForecastSection && valueIdx === 0) {
                                    displayValue = "-" // No growth rate for first year
                                  }
                                  
                                  return (
                                    <td 
                                      key={valueIdx} 
                                      className={cn(
                                        "px-4 py-2 text-right font-semibold text-sm",
                                        isForecastSection && valueIdx === 0 ? "bg-slate-50 text-slate-700" : "text-slate-700",
                                        showGrowthRate && isForecastSection && valueIdx > 0 && typeof displayValue === "string" && displayValue.includes("%") && title === "Estimation des revenus annuels" ? "text-slate-900" : "",
                                        showGrowthRate && isForecastSection && valueIdx > 0 && typeof displayValue === "string" && displayValue.includes("%") && growthRate !== null && growthRate >= 0 && title !== "Estimation des revenus annuels" ? "text-emerald-600 font-semibold" : "",
                                        showGrowthRate && isForecastSection && valueIdx > 0 && typeof displayValue === "string" && displayValue.includes("%") && growthRate !== null && growthRate < 0 && title !== "Estimation des revenus annuels" ? "text-red-600 font-semibold" : ""
                                      )}
                                    >
                                      {showGrowthRate && isForecastSection ? displayValue : (accountTrendValue !== 0 ? formatCurrency(accountTrendValue) : "-")}
                                    </td>
                                  )
                                })}
                              </>
                            )}
                            
                            {/* Empty cells for comparison mode views */}
                            {((view === "comparison" && isComparisonMode) || (view === "ytd" && isComparisonMode) || (view === "ddm" && isComparisonMode)) && (
                              <>
                                {Array.from({ length: isComparisonMode ? entitiesToCompare.length : 2 }).map((_, cellIdx) => (
                                  <td key={cellIdx} className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                    {view === "comparison" && isComparisonMode ? formatCurrency(account.amount) : "-"}
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
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div className="bg-slate-50 px-8 py-4 border-t border-slate-200">
        <p className="text-xs text-slate-600">
          Note: Les données affichées sont à titre informatif. Consulter les états financiers audités pour les montants
          officiels.
        </p>
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
            page="income-statement"
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

      {/* Type/Taux Modal */}
      {title === "Estimation des dépenses annuelles" && editingTypeRateRowId && (() => {
        const rowLabel = editingTypeRateRowId ? (data.find(r => r.rowId === editingTypeRateRowId)?.label || "Poste") : "Poste"
        
        return (
          <Dialog 
            open={typeRateModalOpen} 
            onOpenChange={(open) => {
              if (!open) {
                // Reset temp values to current values when closing
                if (editingTypeRateRowId) {
                  setTempExpenseType(getExpenseType(editingTypeRateRowId))
                  setTempVariableRate(getVariableRate(editingTypeRateRowId))
                  const hasSpecificRate = specificInflationRates[editingTypeRateRowId] !== undefined
                  setTempSpecificInflationRate(hasSpecificRate ? specificInflationRates[editingTypeRateRowId] : null)
                }
                setEditingTypeRateRowId(null)
              }
              setTypeRateModalOpen(open)
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Configuration Type et Taux</DialogTitle>
                <DialogDescription>
                  {rowLabel}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Type de dépense
                  </label>
                  <Select
                    value={tempExpenseType}
                    onValueChange={(value: "variable" | "fixe") => setTempExpenseType(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="variable">Variable</SelectItem>
                      <SelectItem value="fixe">Fixe</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    {tempExpenseType === "variable" 
                      ? "Les dépenses variables sont calculées en pourcentage des revenus"
                      : "Les dépenses fixes évoluent selon un taux d'inflation (spécifique ou global)"}
                  </p>
                </div>
                
                {tempExpenseType === "variable" && (
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Dépenses en % des revenus
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={tempVariableRate}
                      onChange={(e) => setTempVariableRate(parseFloat(e.target.value) || 0)}
                      placeholder="0.0"
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Pourcentage des revenus que représentent ces dépenses variables
                    </p>
                  </div>
                )}
                
                {tempExpenseType === "fixe" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Taux d'inflation pour cette dépense
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          value={tempSpecificInflationRate !== null ? tempSpecificInflationRate : inflationRate}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0
                            setTempSpecificInflationRate(value)
                          }}
                          className="w-full"
                        />
                        <span className="text-sm text-slate-600">%</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {tempSpecificInflationRate !== null && tempSpecificInflationRate !== inflationRate
                          ? `Taux spécifique: ${tempSpecificInflationRate.toFixed(1)}% (Taux global: ${inflationRate.toFixed(1)}%)`
                          : `Utilise le taux global: ${inflationRate.toFixed(1)}%`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTempSpecificInflationRate(null)
                        }}
                        disabled={tempSpecificInflationRate === null}
                        className="text-xs"
                      >
                        Utiliser le taux global
                      </Button>
                      <span className="text-xs text-slate-500">
                        Taux global: {inflationRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Reset temp values to current values
                    if (editingTypeRateRowId) {
                      setTempExpenseType(getExpenseType(editingTypeRateRowId))
                      setTempVariableRate(getVariableRate(editingTypeRateRowId))
                      const hasSpecificRate = specificInflationRates[editingTypeRateRowId] !== undefined
                      setTempSpecificInflationRate(hasSpecificRate ? specificInflationRates[editingTypeRateRowId] : null)
                    }
                    setTypeRateModalOpen(false)
                    setEditingTypeRateRowId(null)
                  }}
                >
                  Annuler
                </Button>
                <Button
                  onClick={saveTypeRate}
                >
                  Enregistrer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}

      {/* Adjustment Modal */}
      {(title === "Estimation des dépenses annuelles" || title === "Estimation des revenus annuels") && editingAdjustment && (() => {
        const rowLabel = editingAdjustment.rowId ? (data.find(r => r.rowId === editingAdjustment.rowId)?.label || "Poste") : "Poste"
        const yearLabels = getYearLabels()
        const yearIndex = editingAdjustment.yearIndex >= 0 && editingAdjustment.yearIndex < yearLabels.length 
          ? editingAdjustment.yearIndex 
          : 0
        const yearLabel = yearLabels[yearIndex] || `${yearIndex}`
        const existingAdjustments = title === "Estimation des revenus annuels"
          ? getRevenueAdjustments(editingAdjustment.rowId, editingAdjustment.yearIndex)
          : getAdjustments(editingAdjustment.rowId, editingAdjustment.yearIndex)
        
        return (
          <Dialog open={adjustmentModalOpen} onOpenChange={setAdjustmentModalOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Ajustements pour {rowLabel}</DialogTitle>
                <DialogDescription>
                  Année: {yearLabel}
                </DialogDescription>
              </DialogHeader>
              
              {/* List of existing adjustments */}
              {existingAdjustments.length > 0 && (
                <div className="space-y-3 py-4 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700">Ajustements existants</h3>
                  {existingAdjustments.map((adj) => {
                    if (title === "Estimation des revenus annuels") {
                      const revenueAdj = adj as RevenueAdjustment
                      return (
                        <div key={revenueAdj.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-slate-900">
                                  {revenueAdj.type === "amount" 
                                    ? formatCurrency(revenueAdj.value)
                                    : revenueAdj.type === "growthPercent"
                                    ? `${revenueAdj.value >= 0 ? "+" : ""}${revenueAdj.value.toFixed(1)}%`
                                    : formatCurrency(revenueAdj.value)}
                                </span>
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded",
                                  revenueAdj.type === "amount" ? "bg-blue-100 text-blue-700"
                                  : revenueAdj.type === "growthPercent" ? "bg-green-100 text-green-700"
                                  : "bg-purple-100 text-purple-700"
                                )}>
                                  {revenueAdj.type === "amount" ? "Montant annuel"
                                  : revenueAdj.type === "growthPercent" ? "Croissance %"
                                  : "Croissance $"}
                                </span>
                              </div>
                              {revenueAdj.note && (
                                <p className="text-sm text-slate-600 mt-1">{revenueAdj.note}</p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => openAdjustmentModal(editingAdjustment.rowId, editingAdjustment.yearIndex, revenueAdj.id)}
                                className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                                title="Modifier"
                              >
                                <Edit2 className="w-4 h-4 text-slate-600" />
                              </button>
                              <button
                                onClick={() => deleteAdjustment(revenueAdj.id)}
                                className="p-1.5 hover:bg-red-100 rounded transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    } else {
                      const expenseAdj = adj as ExpenseAdjustment
                      return (
                        <div key={expenseAdj.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-slate-900">
                                  {expenseAdj.type === "amount" 
                                    ? formatCurrency(expenseAdj.amount || 0)
                                    : `${expenseAdj.percentage?.toFixed(1)}%`}
                                </span>
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded",
                                  expenseAdj.type === "amount" 
                                    ? (expenseAdj.isRecurring ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700")
                                    : (expenseAdj.isRecurring ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700")
                                )}>
                                  {expenseAdj.type === "amount" 
                                    ? (expenseAdj.isRecurring ? "Récurrent" : "Non récurrent")
                                    : (expenseAdj.isRecurring ? "Récurrent" : "Non récurrent")}
                                </span>
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded",
                                  expenseAdj.type === "amount" ? "bg-slate-100 text-slate-700" : "bg-indigo-100 text-indigo-700"
                                )}>
                                  {expenseAdj.type === "amount" ? "Montant ($)" : "Pourcentage (%)"}
                                </span>
                              </div>
                              {expenseAdj.note && (
                                <p className="text-sm text-slate-600 mt-1">{expenseAdj.note}</p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => openAdjustmentModal(editingAdjustment.rowId, editingAdjustment.yearIndex, expenseAdj.id)}
                                className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                                title="Modifier"
                              >
                                <Edit2 className="w-4 h-4 text-slate-600" />
                              </button>
                              <button
                                onClick={() => deleteAdjustment(expenseAdj.id)}
                                className="p-1.5 hover:bg-red-100 rounded transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    }
                  })}
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
                        if (title === "Estimation des revenus annuels") {
                          setRevenueAdjustmentType("amount")
                          setRevenueAdjustmentValue(0)
                        } else {
                          setAdjustmentType("amount")
                          setAdjustmentAmount(0)
                          setAdjustmentPercentage(0)
                          setAdjustmentIsRecurring(false)
                        }
                        setAdjustmentNote("")
                      }}
                    >
                      Annuler
                    </Button>
                  )}
                </div>
                
                {title === "Estimation des revenus annuels" ? (
                  <>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Type d'ajustement
                      </label>
                      <Select
                        value={revenueAdjustmentType}
                        onValueChange={(value: "amount" | "growthPercent" | "growthAmount") => setRevenueAdjustmentType(value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amount">Montant annuel</SelectItem>
                          <SelectItem value="growthPercent">Croissance en %</SelectItem>
                          <SelectItem value="growthAmount">Croissance en $</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        {revenueAdjustmentType === "amount" 
                          ? "Montant annuel ($)"
                          : revenueAdjustmentType === "growthPercent"
                          ? "Croissance (%)"
                          : "Croissance ($)"}
                      </label>
                      <Input
                        type="number"
                        value={revenueAdjustmentValue}
                        onChange={(e) => setRevenueAdjustmentValue(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        {revenueAdjustmentType === "amount"
                          ? "Montant annuel souhaité pour cette année"
                          : revenueAdjustmentType === "growthPercent"
                          ? "Pourcentage de croissance par rapport à l'année précédente"
                          : "Montant de croissance en dollars par rapport à l'année précédente"}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Check if this is a variable expense to show percentage option */}
                    {editingAdjustment && getExpenseType(editingAdjustment.rowId) === "variable" && (
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Type d'ajustement
                        </label>
                        <Select
                          value={adjustmentType}
                          onValueChange={(value: "amount" | "percentage") => {
                            setAdjustmentType(value)
                            if (value === "amount") {
                              setAdjustmentAmount(0)
                            } else {
                              setAdjustmentPercentage(0)
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="amount">Montant ($)</SelectItem>
                            <SelectItem value="percentage">Pourcentage des revenus (%)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500 mt-1">
                          {adjustmentType === "amount"
                            ? "Ajustement en montant (positif pour augmenter, négatif pour diminuer)"
                            : "Modifier le pourcentage de la dépense par rapport aux revenus (ex: 40% → 38%)"}
                        </p>
                      </div>
                    )}
                    
                    {adjustmentType === "amount" ? (
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Montant de l'ajustement ($)
                        </label>
                        <Input
                          type="number"
                          value={adjustmentAmount}
                          onChange={(e) => setAdjustmentAmount(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Montant positif pour augmenter, négatif pour diminuer
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Nouveau pourcentage des revenus (%)
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
                          Nouveau pourcentage que représentent ces dépenses par rapport aux revenus (ex: 38 pour 38%)
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Type d'ajustement
                      </label>
                      <Select
                        value={adjustmentIsRecurring ? "recurring" : "non-recurring"}
                        onValueChange={(value) => setAdjustmentIsRecurring(value === "recurring")}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recurring">Récurrent</SelectItem>
                          <SelectItem value="non-recurring">Non récurrent</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500 mt-1">
                        {adjustmentType === "amount" 
                          ? (adjustmentIsRecurring 
                              ? "L'ajustement continuera dans les années suivantes avec l'inflation"
                              : "L'ajustement s'appliquera uniquement à cette année")
                          : (adjustmentIsRecurring
                              ? "Le nouveau pourcentage sera utilisé pour toutes les années suivantes"
                              : "Le nouveau pourcentage s'appliquera uniquement à cette année, puis retour au taux initial")}
                      </p>
                    </div>
                  </>
                )}
                
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Note explicative
                  </label>
                  <Textarea
                    value={adjustmentNote}
                    onChange={(e) => setAdjustmentNote(e.target.value)}
                    placeholder={title === "Estimation des revenus annuels"
                      ? "Ex: Nouveau contrat client majeur, Expansion dans un nouveau marché, etc."
                      : "Ex: Déménagement vers un bureau plus grand, Location d'entrepôt temporaire, etc."}
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
                    if (title === "Estimation des revenus annuels") {
                      setRevenueAdjustmentType("amount")
                      setRevenueAdjustmentValue(0)
                    } else {
                      setAdjustmentType("amount")
                      setAdjustmentAmount(0)
                      setAdjustmentPercentage(0)
                      setAdjustmentIsRecurring(false)
                    }
                    setAdjustmentNote("")
                  }}
                >
                  Fermer
                </Button>
                <Button
                  onClick={saveAdjustment}
                  disabled={title === "Estimation des revenus annuels" 
                    ? revenueAdjustmentValue === 0
                    : (adjustmentType === "amount" ? adjustmentAmount === 0 : adjustmentPercentage === 0)}
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
