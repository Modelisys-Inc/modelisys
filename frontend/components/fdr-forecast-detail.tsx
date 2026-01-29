"use client"

import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import { ChevronRight, ChevronDown, StickyNote, Settings, Edit2, Trash2 } from "lucide-react"
import { useState, useEffect } from "react"
import { NoteModal } from "@/components/note-modal"
import { getNoteByRowId } from "@/lib/notes-storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

interface FDRForecastDetailProps {
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
}

interface BalanceAccount {
  accountNumber: string
  accountName: string
  amount: number
  priorAmount?: number
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
  trendValues?: number[]
  balanceAccounts?: BalanceAccount[]
  rowId?: string
}

export function FDRForecastDetail({
  period,
  view,
  columnMode = "variations",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  title = "Estimation du FDR annuel",
  projectionYears = 5,
  projectionMode = "gl",
}: FDRForecastDetailProps) {
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
  const [notesUpdated, setNotesUpdated] = useState(0)
  const [showGrowthRate, setShowGrowthRate] = useState(false)
  
  // State for editable FDR values: key = "rowId-yearIndex"
  const [fdrValues, setFdrValues] = useState<Record<string, number>>({})
  
  // State for FDR types: key = "rowId" -> "percentRevenue" | "percentCost" | "manual"
  const [fdrTypes, setFdrTypes] = useState<Record<string, "percentRevenue" | "percentCost" | "manual">>({})
  
  // State for Type modal
  const [typeModalOpen, setTypeModalOpen] = useState(false)
  const [editingTypeRowId, setEditingTypeRowId] = useState<string | null>(null)
  const [tempFdrType, setTempFdrType] = useState<"percentRevenue" | "percentCost" | "manual">("manual")
  
  // Interface for FDR adjustments
  interface FDRAdjustment {
    id: string // Unique ID for this adjustment
    rowId: string
    yearIndex: number
    type: "percentRevenue" | "percentCost" | "manual" // Type of adjustment (matches FDR type)
    value: number // The adjustment value (% for percentRevenue/percentCost, $ for manual)
    note: string // Explanatory note for this adjustment
  }

  // State for FDR adjustments: key = "rowId-yearIndex" -> FDRAdjustment[]
  const [fdrAdjustments, setFdrAdjustments] = useState<Record<string, FDRAdjustment[]>>({})
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false)
  const [editingAdjustment, setEditingAdjustment] = useState<{ rowId: string; yearIndex: number } | null>(null)
  const [adjustmentType, setAdjustmentType] = useState<"percentRevenue" | "percentCost" | "manual">("manual")
  const [adjustmentValue, setAdjustmentValue] = useState<number>(0)
  const [adjustmentNote, setAdjustmentNote] = useState<string>("")
  const [editingAdjustmentId, setEditingAdjustmentId] = useState<string | null>(null) // ID of adjustment being edited, null if adding new
  
  const isForecastSection = title === "Estimation du FDR annuel"

  // Storage key for persisting forecast data
  const getStorageKey = (): string => {
    const entityKey = [companyId, divisionId, subDivisionId].filter(Boolean).join("-") || "all"
    return `modelisys_fdr_forecast_${entityKey}`
  }

  // Storage key for persisting FDR adjustments
  const getFDRAdjustmentsStorageKey = (): string => {
    const entityKey = [companyId, divisionId, subDivisionId].filter(Boolean).join("-") || "all"
    return `modelisys_fdr_adjustments_${entityKey}`
  }

  // Storage key for persisting FDR types
  const getFDRTypesStorageKey = (): string => {
    const entityKey = [companyId, divisionId, subDivisionId].filter(Boolean).join("-") || "all"
    return `modelisys_fdr_types_${entityKey}`
  }

  // Load forecast values from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined" || !isForecastSection) return
    
    try {
      const storageKey = getStorageKey()
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        setFdrValues(parsed)
      }
      
      // Load FDR adjustments
      const adjustmentsKey = getFDRAdjustmentsStorageKey()
      const adjustmentsStored = localStorage.getItem(adjustmentsKey)
      if (adjustmentsStored) {
        try {
          const adjustmentsParsed = JSON.parse(adjustmentsStored)
          if (adjustmentsParsed && typeof adjustmentsParsed === 'object' && !Array.isArray(adjustmentsParsed)) {
            const validatedAdjustments: Record<string, FDRAdjustment[]> = {}
            for (const [key, value] of Object.entries(adjustmentsParsed)) {
              if (Array.isArray(value)) {
                validatedAdjustments[key] = value
              } else {
                validatedAdjustments[key] = [value as FDRAdjustment]
              }
            }
            setFdrAdjustments(validatedAdjustments)
          }
        } catch (error) {
          console.error("Error parsing FDR adjustments:", error)
        }
      }
      
      // Load FDR types
      const typesKey = getFDRTypesStorageKey()
      const typesStored = localStorage.getItem(typesKey)
      if (typesStored) {
        try {
          const typesParsed = JSON.parse(typesStored)
          setFdrTypes(typesParsed)
        } catch (error) {
          console.error("Error parsing FDR types:", error)
        }
      }
    } catch (error) {
      console.error("Error loading FDR forecast values:", error)
    }
  }, [companyId, divisionId, subDivisionId, title, isForecastSection])

  // Save forecast values to localStorage whenever they change
  useEffect(() => {
    if (typeof window === "undefined" || !isForecastSection || Object.keys(fdrValues).length === 0) return
    
    try {
      const storageKey = getStorageKey()
      localStorage.setItem(storageKey, JSON.stringify(fdrValues))
    } catch (error) {
      console.error("Error saving FDR forecast values:", error)
    }
  }, [fdrValues, companyId, divisionId, subDivisionId, title, isForecastSection])

  // Save FDR adjustments to localStorage whenever they change
  useEffect(() => {
    if (typeof window === "undefined" || !isForecastSection || Object.keys(fdrAdjustments).length === 0) return
    
    try {
      const adjustmentsKey = getFDRAdjustmentsStorageKey()
      localStorage.setItem(adjustmentsKey, JSON.stringify(fdrAdjustments))
    } catch (error) {
      console.error("Error saving FDR adjustments:", error)
    }
  }, [fdrAdjustments, companyId, divisionId, subDivisionId, title, isForecastSection])

  // Save FDR types to localStorage whenever they change
  useEffect(() => {
    if (typeof window === "undefined" || !isForecastSection || Object.keys(fdrTypes).length === 0) return
    
    try {
      const typesKey = getFDRTypesStorageKey()
      localStorage.setItem(typesKey, JSON.stringify(fdrTypes))
    } catch (error) {
      console.error("Error saving FDR types:", error)
    }
  }, [fdrTypes, companyId, divisionId, subDivisionId, title, isForecastSection])

  // Effect to reset expanded rows when company/division/subdivision changes
  useEffect(() => {
    setExpandedRows(new Set())
  }, [companyId, divisionId, subDivisionId])

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

  // Helper function to get FDR type
  const getFDRType = (rowId: string): "percentRevenue" | "percentCost" | "manual" => {
    return fdrTypes[rowId] || "manual"
  }

  // Helper function to update FDR type
  const updateFDRType = (rowId: string, type: "percentRevenue" | "percentCost" | "manual") => {
    setFdrTypes((prev) => ({
      ...prev,
      [rowId]: type
    }))
  }

  // Open Type modal
  const openTypeModal = (rowId: string) => {
    setEditingTypeRowId(rowId)
    setTempFdrType(getFDRType(rowId))
    setTypeModalOpen(true)
  }

  // Save Type changes
  const saveType = () => {
    if (!editingTypeRowId) return
    updateFDRType(editingTypeRowId, tempFdrType)
    setTypeModalOpen(false)
    setEditingTypeRowId(null)
  }

  // Helper function to get FDR value (edited or default)
  const getFDRValue = (rowId: string, yearIndex: number, defaultValue: number): number => {
    if (!isForecastSection || !rowId) return defaultValue
    const key = `${rowId}-${yearIndex}`
    return fdrValues[key] !== undefined ? fdrValues[key] : defaultValue
  }

  // Helper function to update FDR value
  const updateFDRValue = (rowId: string, yearIndex: number, value: number) => {
    if (!isForecastSection || !rowId) return
    const key = `${rowId}-${yearIndex}`
    setFdrValues((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  // Get FDR adjustments for a specific row and year
  const getFDRAdjustments = (rowId: string, yearIndex: number): FDRAdjustment[] => {
    const key = `${rowId}-${yearIndex}`
    return fdrAdjustments[key] || []
  }

  // Get a specific FDR adjustment by ID
  const getFDRAdjustmentById = (id: string): FDRAdjustment | null => {
    for (const adjustments of Object.values(fdrAdjustments)) {
      const adjustment = adjustments.find(a => a.id === id)
      if (adjustment) return adjustment
    }
    return null
  }

  // Open adjustment modal
  const openAdjustmentModal = (rowId: string, yearIndex: number, adjustmentId?: string) => {
    setEditingAdjustment({ rowId, yearIndex })
    const fdrType = getFDRType(rowId)
    if (adjustmentId) {
      // Editing existing adjustment
      const existingAdjustment = getFDRAdjustmentById(adjustmentId)
      if (existingAdjustment) {
        setEditingAdjustmentId(adjustmentId)
        setAdjustmentType(fdrType) // Use the FDR type from the row
        setAdjustmentValue(existingAdjustment.value)
        setAdjustmentNote(existingAdjustment.note || "")
      }
    } else {
      // Adding new adjustment - use the FDR type from the row
      setEditingAdjustmentId(null)
      setAdjustmentType(fdrType)
      setAdjustmentValue(0)
      setAdjustmentNote("")
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
    
    if (adjustmentValue === 0) {
      setAdjustmentModalOpen(false)
      setEditingAdjustment(null)
      setEditingAdjustmentId(null)
      return
    }
    
    setFdrAdjustments((prev) => {
      const existingAdjustments = prev[key] || []
      
      if (editingAdjustmentId) {
        // Update existing adjustment
        const updatedAdjustments = existingAdjustments.map(adj =>
          adj.id === editingAdjustmentId
            ? {
                ...adj,
                type: adjustmentType,
                value: adjustmentValue,
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
        const newAdjustment: FDRAdjustment = {
          id: `${Date.now()}-${Math.random()}`,
          rowId: editingAdjustment.rowId,
          yearIndex: editingAdjustment.yearIndex,
          type: adjustmentType, // This will match the FDR type
          value: adjustmentValue,
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
    const defaultType = editingAdjustment ? getFDRType(editingAdjustment.rowId) : "manual"
    setAdjustmentType(defaultType)
    setAdjustmentValue(0)
    setAdjustmentNote("")
  }

  // Delete adjustment
  const deleteAdjustment = (adjustmentId: string) => {
    setFdrAdjustments((prev) => {
      const updated = { ...prev }
      for (const key in updated) {
        updated[key] = updated[key].filter(adj => adj.id !== adjustmentId)
        if (updated[key].length === 0) {
          delete updated[key]
        }
      }
      return updated
    })
  }

  // Get FDR value with adjustments applied
  const getFDRValueWithAdjustments = (rowId: string, yearIndex: number, defaultValue: number): number => {
    if (!isForecastSection || !rowId) return defaultValue
    
    // Get base value (without adjustments)
    let calculatedValue = getFDRValue(rowId, yearIndex, defaultValue)
    
    // Apply adjustments
    const adjustments = getFDRAdjustments(rowId, yearIndex)
    if (adjustments.length > 0) {
      // Use the most recent adjustment (last one in the array)
      const adjustment = adjustments[adjustments.length - 1]
      const fdrType = getFDRType(rowId)
      
      if (fdrType === "manual") {
        // Direct amount for manual type
        calculatedValue = adjustment.value
      } else if (fdrType === "percentRevenue" || fdrType === "percentCost") {
        // For percentage types, the adjustment value is the percentage
        // We need to calculate based on revenue or cost
        // For now, we'll use the adjustment value as a direct percentage
        // This will need to be calculated based on actual revenue/cost values
        calculatedValue = adjustment.value // This will be the percentage value
      }
    }
    
    return calculatedValue
  }

  // Helper function to capitalize first letter (exact copy from BalanceSheetDetail)
  const capitalizeFirst = (str: string): string => {
    if (!str) return str
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  // Helper function to generate balance accounts for a row (exact copy from BalanceSheetDetail)
  const generateBalanceAccounts = (label: string, current: number, prior: number): BalanceAccount[] => {
    const accounts: BalanceAccount[] = []
    
    if (label.includes("Comptes clients")) {
      accounts.push(
        { accountNumber: "1200", accountName: "Comptes clients - Factures à recevoir", amount: Math.round(current * 0.6), priorAmount: Math.round(prior * 0.6), proportion: 0.6 },
        { accountNumber: "1210", accountName: "Comptes clients - Notes de crédit", amount: Math.round(current * 0.4), priorAmount: Math.round(prior * 0.4), proportion: 0.4 }
      )
    } else if (label.includes("Stocks")) {
      accounts.push(
        { accountNumber: "1300", accountName: "Inventaire - Matières premières", amount: Math.round(current * 0.4), priorAmount: Math.round(prior * 0.4), proportion: 0.4 },
        { accountNumber: "1310", accountName: "Inventaire - Produits finis", amount: Math.round(current * 0.6), priorAmount: Math.round(prior * 0.6), proportion: 0.6 }
      )
    } else if (label.includes("Autres actifs courants")) {
      accounts.push(
        { accountNumber: "1400", accountName: "Prépayés", amount: Math.round(current * 0.5), priorAmount: Math.round(prior * 0.5), proportion: 0.5 },
        { accountNumber: "1410", accountName: "Autres créances", amount: Math.round(current * 0.5), priorAmount: Math.round(prior * 0.5), proportion: 0.5 }
      )
    } else if (label.includes("Comptes fournisseurs")) {
      accounts.push(
        { accountNumber: "2000", accountName: "Fournisseurs - Comptes à payer", amount: Math.round(current * 0.7), priorAmount: Math.round(prior * 0.7), proportion: 0.7 },
        { accountNumber: "2010", accountName: "Fournisseurs - Factures à payer", amount: Math.round(current * 0.3), priorAmount: Math.round(prior * 0.3), proportion: 0.3 }
      )
    } else if (label.includes("Capital social")) {
      accounts.push(
        { accountNumber: "3000", accountName: "Capital-actions ordinaires", amount: Math.round(current * 0.8), priorAmount: Math.round(prior * 0.8), proportion: 0.8 },
        { accountNumber: "3010", accountName: "Capital-actions privilégiées", amount: Math.round(current * 0.2), priorAmount: Math.round(prior * 0.2), proportion: 0.2 }
      )
    }
    
    return accounts
  }

  // Generate data for years view - Exact copy from BalanceSheetDetail.getYearsData() but filtered
  const getYearsData = (): DetailRow[] => {
    const generateTrend = (base: number, growthRate: number = 0.05) => {
      return Array.from({ length: projectionYears + 1 }, (_, i) => {
        const yearIndex = i
        return Math.round(base * (1 + growthRate * yearIndex) * (0.95 + Math.random() * 0.1))
      })
    }

    // Get all rows from balance sheet (exact copy)
    const allRows: DetailRow[] = [
      { label: "ACTIFS", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "ACTIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Trésorerie et équivalents", current: 2400000, prior: 2160000, indent: true, trendValues: generateTrend(2400000, 0.06), rowId: "cash" },
      { label: "Comptes clients", current: 4200000, prior: 3600000, indent: true, trendValues: generateTrend(4200000, 0.06), rowId: "receivables" },
      { label: "Stocks", current: 1800000, prior: 1560000, indent: true, trendValues: generateTrend(1800000, 0.05), rowId: "inventory" },
      { label: "Autres actifs courants", current: 1800000, prior: 1680000, indent: true, trendValues: generateTrend(1800000, 0.05), rowId: "other-current-assets" },
      { label: "Total Actifs courants", current: 10200000, prior: 9000000, isBold: true, isSubtotal: true, trendValues: generateTrend(10200000, 0.06) },
      { label: "", current: 0, prior: 0 },
      { label: "Immobilisations corporelles", current: 9600000, prior: 9000000, trendValues: generateTrend(9600000, 0.05), rowId: "fixed-assets" },
      { label: "Immobilisations incorporelles", current: 3000000, prior: 2760000, trendValues: generateTrend(3000000, 0.05), rowId: "intangible-assets" },
      { label: "Autres actifs non courants", current: 1800000, prior: 1440000, trendValues: generateTrend(1800000, 0.06) },
      { label: "Total Actifs", current: 24600000, prior: 22200000, isBold: true, isSubtotal: true, trendValues: generateTrend(24600000, 0.055) },
      { label: "", current: 0, prior: 0 },
      { label: "PASSIFS", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "PASSIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Comptes fournisseurs", current: 2400000, prior: 2160000, indent: true, trendValues: generateTrend(2400000, 0.04), rowId: "payables" },
      { label: "Dettes à court terme", current: 1800000, prior: 1680000, indent: true, trendValues: generateTrend(1800000, 0.04), rowId: "short-term-debt" },
      { label: "Autres passifs courants", current: 1200000, prior: 1200000, indent: true, trendValues: generateTrend(1200000, 0) },
      { label: "Total Passifs courants", current: 5400000, prior: 5040000, isBold: true, isSubtotal: true, trendValues: generateTrend(5400000, 0.04) },
      { label: "", current: 0, prior: 0 },
      { label: "Dettes à long terme", current: 5400000, prior: 5160000, trendValues: generateTrend(5400000, 0.05), rowId: "long-term-debt" },
      { label: "Autres passifs non courants", current: 1800000, prior: 1800000, trendValues: generateTrend(1800000, 0) },
      { label: "Total Passifs", current: 12600000, prior: 12000000, isBold: true, isSubtotal: true, trendValues: generateTrend(12600000, 0.045) },
      { label: "", current: 0, prior: 0 },
      { label: "CAPITAUX PROPRES", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Capital social", current: 7200000, prior: 6600000, indent: true, trendValues: generateTrend(7200000, 0.065), rowId: "share-capital" },
      { label: "Bénéfices non répartis", current: 4800000, prior: 3600000, indent: true, trendValues: generateTrend(4800000, 0.07) },
      { label: "Total Capitaux propres", current: 12000000, prior: 10200000, isBold: true, isSubtotal: true, trendValues: generateTrend(12000000, 0.065) },
      { label: "", current: 0, prior: 0 },
      { label: "Total passifs et capitaux propres", current: 24600000, prior: 22200000, isBold: true, isSubtotal: true, trendValues: generateTrend(24600000, 0.055) },
    ]
    
    // Filter out excluded items: cash, fixed assets, intangible assets, other non-current assets, short-term debt, long-term debt, other non-current liabilities
    const excludedRowIds = ["cash", "fixed-assets", "intangible-assets", "short-term-debt", "long-term-debt"]
    const excludedLabels = ["Trésorerie et équivalents", "Immobilisations corporelles", "Immobilisations incorporelles", "Autres actifs non courants", "Dettes à court terme", "Dettes à long terme", "Autres passifs non courants"]
    
    const filteredRows = allRows.filter(row => {
      if (row.rowId && excludedRowIds.includes(row.rowId)) return false
      if (excludedLabels.includes(row.label)) return false
      return true
    })
    
    // Recalculate totals after filtering
    const currentAssetsExCash = filteredRows
      .filter(r => r.rowId === "receivables" || r.rowId === "inventory" || r.rowId === "other-current-assets")
      .reduce((sum, r) => sum + (r.current || 0), 0)
    
    const currentLiabilitiesExDebt = filteredRows
      .filter(r => r.rowId === "payables" || (r.label === "Autres passifs courants" && !r.isBold))
      .reduce((sum, r) => sum + (r.current || 0), 0)
    
    // Update totals in filtered rows
    return filteredRows.map((row) => {
      // Update "Total Actifs courants" to exclude cash
      if (row.label === "Total Actifs courants") {
        return {
          ...row,
          current: currentAssetsExCash,
          prior: Math.round(currentAssetsExCash * 0.9),
          trendValues: generateTrend(currentAssetsExCash, 0.06),
          label: "Total Actifs courants (hors caisse)"
        }
      }
      // Update "Total Actifs" to exclude fixed assets
      if (row.label === "Total Actifs") {
        return {
          ...row,
          current: currentAssetsExCash,
          prior: Math.round(currentAssetsExCash * 0.9),
          trendValues: generateTrend(currentAssetsExCash, 0.055)
        }
      }
      // Update "Total Passifs courants" to exclude debt
      if (row.label === "Total Passifs courants") {
        return {
          ...row,
          current: currentLiabilitiesExDebt,
          prior: Math.round(currentLiabilitiesExDebt * 0.93),
          trendValues: generateTrend(currentLiabilitiesExDebt, 0.04)
        }
      }
      // Update "Total Passifs" to exclude long-term debt
      if (row.label === "Total Passifs") {
        return {
          ...row,
          current: currentLiabilitiesExDebt,
          prior: Math.round(currentLiabilitiesExDebt * 0.93),
          trendValues: generateTrend(currentLiabilitiesExDebt, 0.045)
        }
      }
      // Update "Total passifs et capitaux propres"
      if (row.label === "Total passifs et capitaux propres") {
        const totalEquity = filteredRows.find(r => r.label === "Total Capitaux propres")?.current || 0
        const newTotal = currentLiabilitiesExDebt + totalEquity
        return {
          ...row,
          current: newTotal,
          prior: Math.round(newTotal * 0.9),
          trendValues: generateTrend(newTotal, 0.055)
        }
      }
      return row
    }).map((row) => {
      // Add balance accounts to rows that have rowId (same as BalanceSheetDetail)
      if (row.rowId) {
        return {
          ...row,
          balanceAccounts: generateBalanceAccounts(row.label, row.current || 0, row.prior || 0)
        }
      }
      return row
    })
  }

  // Get data based on view
  const getData = (): DetailRow[] => {
    if (view === "years") {
      return getYearsData()
    }
    // For other views, return empty or basic data
    return []
  }

  const data = getData()
  const shouldHideAmounts = false

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-600 mt-1">
              Projections du fonds de roulement hors caisse (FdRHC) sur {projectionYears} ans
            </p>
          </div>
          {view === "years" && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGrowthRate(!showGrowthRate)}
                className="h-8 text-xs"
              >
                {showGrowthRate ? "Montants" : "Taux de croissance"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm w-2/5">Compte</th>
              {view === "years" && (
                <>
                  {/* Type column for FDR section */}
                  <th className="px-4 py-4 text-center font-semibold text-slate-900 text-sm whitespace-nowrap">
                    Type
                  </th>
                  {Array.from({ length: projectionYears + 1 }).map((_, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm">
                      {2021 + idx}
                    </th>
                  ))}
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => {
              const isExpanded = row.rowId ? expandedRows.has(row.rowId) : false
              const canExpand = row.balanceAccounts && row.balanceAccounts.length > 0
              const isSpacer = row.label === ""
              const displayLabel = row.isSection ? capitalizeFirst(row.label) : row.label
              
              // Check if next row is a subtotal to add dark border above it
              const nextRowIsSubtotal = idx < data.length - 1 && data[idx + 1].isSubtotal
              
              return (
                <>
                  <tr key={idx} className={cn(
                    "border-b",
                    row.label === "" ? "h-2 border-slate-200" : "",
                    nextRowIsSubtotal ? "border-slate-900 border-b-2" : "border-slate-200",
                    canExpand && "hover:bg-slate-50 cursor-pointer"
                  )}>
                    <td className={cn("px-6 py-3", row.isBold ? "font-bold text-slate-900" : "text-slate-700", row.indent && "pl-12")}>
                      <div className="flex items-center gap-2">
                        {canExpand && (
                          <button
                            onClick={() => row.rowId && toggleRow(row.rowId)}
                            className="p-0.5 hover:bg-slate-100 rounded transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-500" />
                            )}
                          </button>
                        )}
                        {!canExpand && row.indent && <span className="w-4"></span>}
                        <span className="flex-1">{displayLabel}</span>
                      </div>
                    </td>
                    {view === "years" && (
                      <>
                        {/* Type cell for FDR section */}
                        <td className="px-4 py-3 text-center">
                          {shouldHideAmounts ? (
                            "-"
                          ) : row.rowId ? (
                            <div className="flex items-center justify-center gap-2">
                              <span className={cn(
                                "text-xs font-medium px-2 py-1 rounded",
                                getFDRType(row.rowId) === "percentRevenue" 
                                  ? "text-blue-600 bg-blue-50" 
                                  : getFDRType(row.rowId) === "percentCost"
                                  ? "text-green-600 bg-green-50"
                                  : "text-purple-600 bg-purple-50"
                              )}>
                                {getFDRType(row.rowId) === "percentRevenue" ? "% Revenus" 
                                  : getFDRType(row.rowId) === "percentCost" ? "% Coût"
                                  : "$ Manuel"}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (row.rowId) {
                                    openTypeModal(row.rowId)
                                  }
                                }}
                                className="p-1 rounded hover:bg-slate-200 transition-colors"
                                title="Modifier le Type"
                              >
                                <Settings className="w-3.5 h-3.5 text-slate-600" />
                              </button>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        {row.trendValues && (
                          <>
                            {row.trendValues.map((value, valueIdx) => {
                          const actualValue = isForecastSection && row.rowId 
                            ? getFDRValueWithAdjustments(row.rowId, valueIdx, value)
                            : value
                          
                          const canHaveAdjustment = isForecastSection && valueIdx > 0 && row.rowId && !shouldHideAmounts
                          
                          // Get previous value for growth calculation
                          const previousValue = valueIdx > 0 && row.trendValues 
                            ? (isForecastSection && row.rowId 
                                ? getFDRValueWithAdjustments(row.rowId, valueIdx - 1, row.trendValues[valueIdx - 1])
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
                            displayValue = "-"
                          }
                          
                          return (
                            <td
                              key={valueIdx}
                              className={cn(
                                "px-4 py-3 text-right",
                                row.isBold ? "font-semibold font-bold" : "text-slate-500",
                                shouldHideAmounts ? "text-white" : "",
                                isForecastSection && valueIdx === 0 && !shouldHideAmounts ? "bg-slate-50" : "",
                                showGrowthRate && isForecastSection && valueIdx > 0 && !shouldHideAmounts && typeof displayValue === "string" && displayValue.includes("%") && growthRate !== null && growthRate >= 0 ? "text-emerald-600 font-semibold" : "",
                                showGrowthRate && isForecastSection && valueIdx > 0 && !shouldHideAmounts && typeof displayValue === "string" && displayValue.includes("%") && growthRate !== null && growthRate < 0 ? "text-red-600 font-semibold" : ""
                              )}
                            >
                              {shouldHideAmounts ? (
                                "-"
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  <span>
                                    {showGrowthRate && isForecastSection 
                                      ? displayValue 
                                      : (actualValue !== 0 ? formatCurrency(actualValue) : "-")}
                                  </span>
                                  {canHaveAdjustment && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (row.rowId) {
                                          openAdjustmentModal(row.rowId, valueIdx)
                                        }
                                      }}
                                      className={cn(
                                        "p-1 rounded hover:bg-slate-200 transition-colors relative",
                                        getFDRAdjustments(row.rowId || "", valueIdx).length > 0 && "text-blue-600"
                                      )}
                                      title={`Ajustements (${getFDRAdjustments(row.rowId || "", valueIdx).length})`}
                                    >
                                      <Settings className="w-3.5 h-3.5" />
                                      {getFDRAdjustments(row.rowId || "", valueIdx).length > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                          {getFDRAdjustments(row.rowId || "", valueIdx).length}
                                        </span>
                                      )}
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          )
                        })}
                          </>
                        )}
                        {!row.trendValues && (
                      <>
                        {Array.from({ length: projectionYears + 1 }).map((_, emptyIdx) => {
                          const isForecastSectionForEmpty = title === "Estimation du FDR annuel"
                          return (
                            <td 
                              key={emptyIdx} 
                              className={cn(
                                "px-4 py-3 text-right font-semibold text-white",
                                isForecastSectionForEmpty && emptyIdx === 0 ? "bg-slate-50" : ""
                              )}
                            >
                              -
                            </td>
                          )
                        })}
                        </>
                      )}
                    </>
                    )}
                  </tr>
                  {/* Expanded balance accounts */}
                  {isExpanded && row.balanceAccounts && row.balanceAccounts.length > 0 && (
                    <>
                      {row.balanceAccounts.map((account, accIdx) => (
                        <tr key={`${idx}-account-${accIdx}`} className="bg-slate-50 border-b border-slate-200">
                          <td className="px-6 py-2 text-slate-500 pl-20">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-slate-500">{account.accountNumber}</span>
                              <span className="text-sm">{account.accountName}</span>
                            </div>
                          </td>
                          {view === "years" && (
                            <>
                              {/* Empty type cell for balance accounts */}
                              <td className="px-4 py-2 text-center text-slate-400 text-sm">-</td>
                              {row.trendValues && account.proportion !== undefined && (
                            <>
                              {row.trendValues.map((value, valueIdx) => {
                                const accountValue = Math.round(value * account.proportion!)
                                const isForecastSectionForAccount = title === "Estimation du FDR annuel"
                                return (
                                  <td
                                    key={valueIdx}
                                    className={cn(
                                      "px-4 py-2 text-right font-semibold text-sm text-slate-700",
                                      isForecastSectionForAccount && valueIdx === 0 ? "bg-slate-50" : ""
                                    )}
                                  >
                                    {accountValue !== 0 ? formatCurrency(accountValue) : "-"}
                                  </td>
                                )
                              })}
                              </>
                            )}
                            {!row.trendValues && (
                            <>
                              {Array.from({ length: projectionYears + 1 }).map((_, emptyIdx) => {
                                const isForecastSectionForEmpty = title === "Estimation du FDR annuel"
                                return (
                                  <td 
                                    key={emptyIdx} 
                                    className={cn(
                                      "px-4 py-2 text-right font-semibold text-sm text-slate-400",
                                      isForecastSectionForEmpty && emptyIdx === 0 ? "bg-slate-50" : ""
                                    )}
                                  >
                                    -
                                  </td>
                              )
                            })}
                            </>
                          )}
                        </>
                      )}
                      </tr>
                      ))}
                    </>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Note Modal */}
      <NoteModal
        isOpen={noteModalOpen}
        onClose={() => {
          setNoteModalOpen(false)
          setSelectedRowId(null)
          setSelectedRowLabel("")
          setSelectedRowFinancialData({})
        }}
        rowId={selectedRowId || ""}
        rowLabel={selectedRowLabel}
        financialData={selectedRowFinancialData}
        page="fdr"
        onNoteSaved={() => {
          setNotesUpdated((prev) => prev + 1)
        }}
      />

      {/* Adjustment Modal */}
      {editingAdjustment && (() => {
        const rowLabel = editingAdjustment.rowId ? (data.find(r => r.rowId === editingAdjustment.rowId)?.label || "Poste") : "Poste"
        const yearLabels = Array.from({ length: projectionYears + 1 }, (_, i) => `${2021 + i}`)
        const yearIndex = editingAdjustment.yearIndex >= 0 && editingAdjustment.yearIndex < yearLabels.length 
          ? editingAdjustment.yearIndex 
          : 0
        const yearLabel = yearLabels[yearIndex] || `${yearIndex}`
        const existingAdjustments = getFDRAdjustments(editingAdjustment.rowId, editingAdjustment.yearIndex)
        const fdrType = editingAdjustment.rowId ? getFDRType(editingAdjustment.rowId) : "manual"
        
        // Get type label and input label based on FDR type
        const getTypeLabel = () => {
          if (fdrType === "percentRevenue") return "% Revenus"
          if (fdrType === "percentCost") return "% Coût"
          return "$ Manuel"
        }
        
        const getInputLabel = () => {
          if (fdrType === "percentRevenue") return "% revenus à inscrire"
          if (fdrType === "percentCost") return "% coût à inscrire"
          return "$ à inscrire"
        }
        
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
                  {existingAdjustments.map((adj) => (
                    <div key={adj.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-900">
                              {adj.type === "manual" 
                                ? formatCurrency(adj.value)
                                : `${adj.value.toFixed(1)}%`}
                            </span>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded",
                              adj.type === "percentRevenue" ? "bg-blue-100 text-blue-700"
                              : adj.type === "percentCost" ? "bg-green-100 text-green-700"
                              : "bg-purple-100 text-purple-700"
                            )}>
                              {adj.type === "percentRevenue" ? "% Revenus"
                              : adj.type === "percentCost" ? "% Coût"
                              : "$ Manuel"}
                            </span>
                          </div>
                          {adj.note && (
                            <p className="text-sm text-slate-600 mt-1">{adj.note}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openAdjustmentModal(editingAdjustment.rowId, editingAdjustment.yearIndex, adj.id)}
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
                        const defaultType = editingAdjustment ? getFDRType(editingAdjustment.rowId) : "manual"
                        setAdjustmentType(defaultType)
                        setAdjustmentValue(0)
                        setAdjustmentNote("")
                      }}
                    >
                      Annuler
                    </Button>
                  )}
                </div>
                
                {/* Type d'ajustement - Non modifiable, affiché selon le type FDR de la ligne */}
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Type d'ajustement
                  </label>
                  <div className={cn(
                    "px-3 py-2 rounded-md border border-slate-200 bg-slate-50",
                    fdrType === "percentRevenue" ? "text-blue-700"
                    : fdrType === "percentCost" ? "text-green-700"
                    : "text-purple-700"
                  )}>
                    <span className="text-sm font-medium">{getTypeLabel()}</span>
                    <span className="text-xs text-slate-500 ml-2">(défini dans la colonne Type)</span>
                  </div>
                </div>
                
                {/* Input pour la valeur */}
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    {getInputLabel()}
                  </label>
                  <Input
                    type="number"
                    step={fdrType === "manual" ? "1" : "0.1"}
                    value={adjustmentValue}
                    onChange={(e) => setAdjustmentValue(parseFloat(e.target.value) || 0)}
                    placeholder={fdrType === "manual" ? "0" : "0.0"}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {fdrType === "percentRevenue" 
                      ? "Pourcentage des revenus pour cette année"
                      : fdrType === "percentCost"
                      ? "Pourcentage des coûts pour cette année"
                      : "Montant fixe en dollars pour cette année"}
                  </p>
                </div>
                
                {/* Note */}
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Note (optionnel)
                  </label>
                  <Textarea
                    value={adjustmentNote}
                    onChange={(e) => setAdjustmentNote(e.target.value)}
                    placeholder="Ajouter une note explicative..."
                    className="w-full min-h-[80px]"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAdjustmentModalOpen(false)
                    setEditingAdjustment(null)
                    setEditingAdjustmentId(null)
                    const defaultType = editingAdjustment ? getFDRType(editingAdjustment.rowId) : "manual"
                    setAdjustmentType(defaultType)
                    setAdjustmentValue(0)
                    setAdjustmentNote("")
                  }}
                >
                  Annuler
                </Button>
                <Button
                  onClick={saveAdjustment}
                  disabled={adjustmentValue === 0}
                >
                  {editingAdjustmentId ? "Modifier" : "Ajouter"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      })()}

      {/* Type Modal */}
      {editingTypeRowId && (() => {
        const rowLabel = editingTypeRowId ? (data.find(r => r.rowId === editingTypeRowId)?.label || "Poste") : "Poste"
        
        return (
          <Dialog 
            open={typeModalOpen} 
            onOpenChange={(open) => {
              if (!open) {
                // Reset temp values to current values when closing
                if (editingTypeRowId) {
                  setTempFdrType(getFDRType(editingTypeRowId))
                }
                setEditingTypeRowId(null)
              }
              setTypeModalOpen(open)
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Configuration Type</DialogTitle>
                <DialogDescription>
                  {rowLabel}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Type de calcul
                  </label>
                  <Select
                    value={tempFdrType}
                    onValueChange={(value: "percentRevenue" | "percentCost" | "manual") => setTempFdrType(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentRevenue">% Revenus</SelectItem>
                      <SelectItem value="percentCost">% Coût</SelectItem>
                      <SelectItem value="manual">$ Manuel</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    {tempFdrType === "percentRevenue" 
                      ? "Le FDR est calculé en pourcentage des revenus"
                      : tempFdrType === "percentCost"
                      ? "Le FDR est calculé en pourcentage des coûts"
                      : "Le FDR est saisi manuellement"}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Reset temp values to current values
                    if (editingTypeRowId) {
                      setTempFdrType(getFDRType(editingTypeRowId))
                    }
                    setTypeModalOpen(false)
                    setEditingTypeRowId(null)
                  }}
                >
                  Annuler
                </Button>
                <Button
                  onClick={saveType}
                >
                  Enregistrer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}
    </div>
  )
}

