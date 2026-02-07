"use client"

import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import { ChevronRight, ChevronDown, StickyNote, TrendingUp } from "lucide-react"
import { seededRandom, generateId } from "@/lib/seeded-random"
import { useState, useEffect, useRef, useCallback } from "react"
import { listForecastConfigs, upsertForecastConfig } from "@/lib/api"
import { NoteModal } from "@/components/note-modal"
import { getNoteByRowId } from "@/lib/notes-storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Settings, Edit2, Trash2 } from "lucide-react"

interface CapexForecastDetailProps {
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

export function CapexForecastDetail({
  period,
  view,
  columnMode = "variations",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  title = "Estimation des Capex annuels",
  projectionYears = 5,
  projectionMode = "gl",
}: CapexForecastDetailProps) {
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
  
  // State for editable capex values: key = "rowId-yearIndex" (kept for backward compatibility but not used for direct editing)
  const [capexValues, setCapexValues] = useState<Record<string, number>>({})
  
  // Interface for capex adjustments
  interface CapexAdjustment {
    id: string // Unique ID for this adjustment
    rowId: string
    yearIndex: number
    type: "amount" | "growthPercent" | "growthAmount" // Type of adjustment
    value: number // The adjustment value (amount, growth %, or growth $)
    note: string // Explanatory note for this adjustment
  }

  // State for capex adjustments: key = "rowId-yearIndex" -> CapexAdjustment[]
  const [capexAdjustments, setCapexAdjustments] = useState<Record<string, CapexAdjustment[]>>({})
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false)
  const [editingAdjustment, setEditingAdjustment] = useState<{ rowId: string; yearIndex: number } | null>(null)
  const [adjustmentType, setAdjustmentType] = useState<"amount" | "growthPercent" | "growthAmount">("amount")
  const [adjustmentValue, setAdjustmentValue] = useState<number>(0)
  const [adjustmentNote, setAdjustmentNote] = useState<string>("")
  const [editingAdjustmentId, setEditingAdjustmentId] = useState<string | null>(null) // ID of adjustment being edited, null if adding new
  
  // State for depreciation rates: key = "rowId" -> percentage (e.g., 8.0 for 8%)
  const [depreciationRates, setDepreciationRates] = useState<Record<string, number>>({})
  const [editingDepreciationRate, setEditingDepreciationRate] = useState<string | null>(null)

  const isForecastSection = title === "Estimation des Capex annuels"

  // Debounced save to API
  const saveConfigRef = useRef<NodeJS.Timeout>()

  const saveConfig = useCallback((data: Record<string, unknown>) => {
    if (!companyId || !isForecastSection) return
    clearTimeout(saveConfigRef.current)
    saveConfigRef.current = setTimeout(async () => {
      try {
        await upsertForecastConfig(companyId, {
          config_type: "capex-forecast",
          data,
        })
      } catch (err) {
        console.error("Error saving capex forecast config:", err)
      }
    }, 500)
  }, [companyId, isForecastSection])

  // Load capex forecast config from API on mount
  useEffect(() => {
    if (!companyId || !isForecastSection) return

    const loadConfig = async () => {
      try {
        const configs = await listForecastConfigs(companyId, { config_type: "capex-forecast" })
        if (configs.length > 0) {
          const data = configs[0].data as Record<string, unknown>
          if (data.capexValues) setCapexValues(data.capexValues as typeof capexValues)
          if (data.depreciationRates) setDepreciationRates(data.depreciationRates as typeof depreciationRates)
          if (data.capexAdjustments) setCapexAdjustments(data.capexAdjustments as typeof capexAdjustments)
        }
      } catch (err) {
        console.error("Error loading capex forecast config:", err)
      }
    }
    loadConfig()
  }, [companyId, isForecastSection])

  // Save capex values whenever they change
  useEffect(() => {
    if (!isForecastSection || Object.keys(capexValues).length === 0) return
    saveConfig({ capexValues, depreciationRates, capexAdjustments })
  }, [capexValues, saveConfig, isForecastSection])

  // Save depreciation rates whenever they change
  useEffect(() => {
    if (!isForecastSection || Object.keys(depreciationRates).length === 0) return
    saveConfig({ capexValues, depreciationRates, capexAdjustments })
  }, [depreciationRates, saveConfig, isForecastSection])

  // Save capex adjustments whenever they change
  useEffect(() => {
    if (!isForecastSection || Object.keys(capexAdjustments).length === 0) return
    saveConfig({ capexValues, depreciationRates, capexAdjustments })
  }, [capexAdjustments, saveConfig, isForecastSection])

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

  // Helper function to generate balance accounts for a row
  const generateBalanceAccounts = (label: string, current: number, prior: number): BalanceAccount[] => {
    const accounts: BalanceAccount[] = []
    
    if (label.includes("Terrains et constructions")) {
      accounts.push(
        { accountNumber: "2000", accountName: "Terrains", amount: Math.round(current * 0.4), priorAmount: Math.round(prior * 0.4), proportion: 0.4 },
        { accountNumber: "2010", accountName: "Constructions", amount: Math.round(current * 0.6), priorAmount: Math.round(prior * 0.6), proportion: 0.6 }
      )
    } else if (label.includes("Matériel et équipement")) {
      accounts.push(
        { accountNumber: "2100", accountName: "Machinerie", amount: Math.round(current * 0.6), priorAmount: Math.round(prior * 0.6), proportion: 0.6 },
        { accountNumber: "2110", accountName: "Équipement informatique", amount: Math.round(current * 0.4), priorAmount: Math.round(prior * 0.4), proportion: 0.4 }
      )
    } else if (label.includes("Véhicules")) {
      accounts.push(
        { accountNumber: "2200", accountName: "Véhicules de service", amount: current, priorAmount: prior, proportion: 1.0 }
      )
    } else if (label.includes("Autres immobilisations corporelles")) {
      accounts.push(
        { accountNumber: "2300", accountName: "Mobilier et matériel", amount: current, priorAmount: prior, proportion: 1.0 }
      )
    } else if (label.includes("Brevets et licences")) {
      accounts.push(
        { accountNumber: "3000", accountName: "Brevets", amount: Math.round(current * 0.6), priorAmount: Math.round(prior * 0.6), proportion: 0.6 },
        { accountNumber: "3010", accountName: "Licences", amount: Math.round(current * 0.4), priorAmount: Math.round(prior * 0.4), proportion: 0.4 }
      )
    } else if (label.includes("Logiciels et développement")) {
      accounts.push(
        { accountNumber: "3100", accountName: "Logiciels", amount: Math.round(current * 0.5), priorAmount: Math.round(prior * 0.5), proportion: 0.5 },
        { accountNumber: "3110", accountName: "Développement interne", amount: Math.round(current * 0.5), priorAmount: Math.round(prior * 0.5), proportion: 0.5 }
      )
    } else if (label.includes("Fonds commercial")) {
      accounts.push(
        { accountNumber: "3200", accountName: "Fonds commercial", amount: current, priorAmount: prior, proportion: 1.0 }
      )
    }
    
    return accounts
  }

  // Get adjustments for a specific row and year
  const getAdjustments = (rowId: string, yearIndex: number): CapexAdjustment[] => {
    const key = `${rowId}-${yearIndex}`
    return capexAdjustments[key] || []
  }

  // Get a specific adjustment by ID
  const getAdjustmentById = (id: string): CapexAdjustment | null => {
    for (const adjustments of Object.values(capexAdjustments)) {
      const adjustment = adjustments.find(a => a.id === id)
      if (adjustment) return adjustment
    }
    return null
  }

  // Open adjustment modal
  const openAdjustmentModal = (rowId: string, yearIndex: number, adjustmentId?: string) => {
    setEditingAdjustment({ rowId, yearIndex })
    if (adjustmentId) {
      // Editing existing adjustment
      const existingAdjustment = getAdjustmentById(adjustmentId)
      if (existingAdjustment) {
        setEditingAdjustmentId(adjustmentId)
        // Force type to "amount" for Capex
        setAdjustmentType("amount")
        setAdjustmentValue(existingAdjustment.value)
        setAdjustmentNote(existingAdjustment.note || "")
      }
    } else {
      // Adding new adjustment
      setEditingAdjustmentId(null)
      setAdjustmentType("amount")
      setAdjustmentValue(0)
      setAdjustmentNote("")
    }
    setAdjustmentModalOpen(true)
  }

  // Save adjustment
  const saveAdjustment = () => {
    if (!editingAdjustment) return
    
    const { rowId, yearIndex } = editingAdjustment
    const key = `${rowId}-${yearIndex}`
    
      if (adjustmentValue === 0) {
        setAdjustmentModalOpen(false)
        setEditingAdjustment(null)
        setEditingAdjustmentId(null)
        return
      }
      
      setCapexAdjustments((prev) => {
        const existingAdjustments = prev[key] || []
        
        if (editingAdjustmentId) {
          // Update existing adjustment (always "amount" type for Capex)
          const updatedAdjustments = existingAdjustments.map(adj =>
            adj.id === editingAdjustmentId
              ? {
                  ...adj,
                  type: "amount" as const,
                  value: adjustmentValue,
                  note: adjustmentNote
                }
              : adj
          )
          return { ...prev, [key]: updatedAdjustments }
        } else {
          // Add new adjustment (always "amount" type for Capex)
          const newAdjustment: CapexAdjustment = {
            id: generateId(),
            rowId,
            yearIndex,
            type: "amount" as const,
            value: adjustmentValue,
            note: adjustmentNote
          }
          return { ...prev, [key]: [...existingAdjustments, newAdjustment] }
        }
      })
    
    setAdjustmentModalOpen(false)
    setEditingAdjustment(null)
    setEditingAdjustmentId(null)
    setAdjustmentType("amount")
    setAdjustmentValue(0)
    setAdjustmentNote("")
  }

  // Delete adjustment
  const deleteAdjustment = (adjustmentId: string) => {
    setCapexAdjustments((prev) => {
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

  // Get forecast value for a specific row and year (with adjustments applied)
  const getCapexValue = (rowId: string | undefined, yearIndex: number, defaultValue: number, baseValue?: number): number => {
    if (!rowId || !isForecastSection) return defaultValue
    
    // Calculate base value with adjustments
    let calculatedValue = defaultValue
    
    // Apply adjustments (only "amount" type for Capex)
    const adjustments = getAdjustments(rowId, yearIndex)
    if (adjustments.length > 0) {
      // Use the most recent adjustment (last one in the array)
      const adjustment = adjustments[adjustments.length - 1]
      
      // For Capex, only "amount" type is supported
      if (adjustment.type === "amount") {
        calculatedValue = adjustment.value
      }
    }
    
    return calculatedValue
  }

  // Get depreciation rate for a row (default values based on asset type)
  const getDepreciationRate = (rowId: string | undefined, label: string): number => {
    if (!rowId) return 0
    
    // If rate was manually set, use it
    if (depreciationRates[rowId] !== undefined) {
      return depreciationRates[rowId]
    }
    
    // Default rates based on asset type
    if (label.includes("Terrains")) return 0 // Land doesn't depreciate
    if (label.includes("Constructions") || label.includes("Terrains et constructions")) return 2.5 // Buildings: 2.5%
    if (label.includes("Matériel") || label.includes("équipement")) return 10 // Equipment: 10%
    if (label.includes("Véhicules")) return 20 // Vehicles: 20%
    if (label.includes("Brevets") || label.includes("licences")) return 5 // Patents: 5%
    if (label.includes("Logiciels") || label.includes("développement")) return 33.33 // Software: 33.33% (3 years)
    if (label.includes("Fonds commercial")) return 0 // Goodwill: 0% (or amortized separately)
    
    return 8 // Default: 8%
  }

  // Update depreciation rate for a row
  const updateDepreciationRate = (rowId: string, newRate: number) => {
    setDepreciationRates((prev) => ({
      ...prev,
      [rowId]: newRate
    }))
  }

  // Helper function to generate trend data for years (projectionYears + 1)
  const getYearsData = (): DetailRow[] => {
    const numYears = projectionYears + 1
    const generateTrend = (base: number, growthRate: number = 0.05, rowId?: string) => {
      return Array.from({ length: numYears }, (_, i) => {
        if (isForecastSection) {
          const yearIndex = i
          let defaultValue: number
          if (yearIndex === 0) {
            defaultValue = base
          } else {
            const previousYearValue = rowId ? getCapexValue(rowId, yearIndex - 1, base, base) : base
            defaultValue = Math.round(previousYearValue * (1 + growthRate))
          }
          // Use getCapexValue which now applies adjustments
          return rowId ? getCapexValue(rowId, yearIndex, defaultValue, base) : defaultValue
        } else {
          const yearIndex = (numYears - 1) - i
          return Math.round(base * (1 + growthRate * yearIndex) * (0.95 + seededRandom(base + i) * 0.1))
        }
      })
    }

    const rows: DetailRow[] = [
      // Immobilisations corporelles
      { label: "IMMOBILISATIONS CORPORELLES", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Terrains et constructions", current: 5400000, prior: 5040000, indent: true, trendValues: generateTrend(5400000, 0.03, "land_buildings"), rowId: "land_buildings" },
      { label: "Matériel et équipement", current: 4200000, prior: 3960000, indent: true, trendValues: generateTrend(4200000, 0.04, "equipment"), rowId: "equipment" },
      { label: "Véhicules", current: 1200000, prior: 1140000, indent: true, trendValues: generateTrend(1200000, 0.02, "vehicles"), rowId: "vehicles" },
      { label: "Autres immobilisations corporelles", current: 720000, prior: 660000, indent: true, trendValues: generateTrend(720000, 0.025, "other_fixed"), rowId: "other_fixed" },
      { label: "Total Immobilisations corporelles", current: 11520000, prior: 10800000, isBold: true, isSubtotal: true, trendValues: generateTrend(11520000, 0.03) },
      { label: "", current: 0, prior: 0 },
      
      // Immobilisations incorporelles
      { label: "IMMOBILISATIONS INCORPORELLES", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Brevets et licences", current: 1800000, prior: 1656000, indent: true, trendValues: generateTrend(1800000, 0.05, "patents"), rowId: "patents" },
      { label: "Logiciels et développement", current: 1200000, prior: 1104000, indent: true, trendValues: generateTrend(1200000, 0.06, "software"), rowId: "software" },
      { label: "Fonds commercial", current: 600000, prior: 552000, indent: true, trendValues: generateTrend(600000, 0.02, "goodwill"), rowId: "goodwill" },
      { label: "Total Immobilisations incorporelles", current: 3600000, prior: 3312000, isBold: true, isSubtotal: true, trendValues: generateTrend(3600000, 0.045) },
    ]
    
    // Add balance accounts to rows that have rowId
    return rows.map((row) => {
      if (row.rowId) {
        return {
          ...row,
          balanceAccounts: generateBalanceAccounts(row.label, row.current, row.prior)
        }
      }
      return row
    })
  }

  const getDetailData = (): DetailRow[] => {
    const effectiveView = isForecastSection ? "years" : view
    const effectivePeriod = isForecastSection ? "annual" : period
    
    if (effectiveView === "years") {
      return getYearsData()
    }
    
    // For other views, return basic data structure
    const rows: DetailRow[] = [
      { label: "IMMOBILISATIONS CORPORELLES", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Terrains et constructions", current: 5400000, prior: 5040000, indent: true, rowId: "land_buildings" },
      { label: "Matériel et équipement", current: 4200000, prior: 3960000, indent: true, rowId: "equipment" },
      { label: "Véhicules", current: 1200000, prior: 1140000, indent: true, rowId: "vehicles" },
      { label: "Autres immobilisations corporelles", current: 720000, prior: 660000, indent: true, rowId: "other_fixed" },
      { label: "Total Immobilisations corporelles", current: 11520000, prior: 10800000, isBold: true, isSubtotal: true },
      { label: "", current: 0, prior: 0 },
      { label: "IMMOBILISATIONS INCORPORELLES", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Brevets et licences", current: 1800000, prior: 1656000, indent: true, rowId: "patents" },
      { label: "Logiciels et développement", current: 1200000, prior: 1104000, indent: true, rowId: "software" },
      { label: "Fonds commercial", current: 600000, prior: 552000, indent: true, rowId: "goodwill" },
      { label: "Total Immobilisations incorporelles", current: 3600000, prior: 3312000, isBold: true, isSubtotal: true },
    ]
    
    return rows.map((row) => {
      if (row.rowId) {
        return {
          ...row,
          balanceAccounts: generateBalanceAccounts(row.label, row.current, row.prior)
        }
      }
      return row
    })
  }

  const capitalizeFirst = (str: string): string => {
    if (!str) return str
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  const effectiveView = isForecastSection ? "years" : view
  const effectivePeriod = isForecastSection ? "annual" : period

  let data = getDetailData()

  const isCompanyComparison = columnMode === "comparison" && !companyId
  const isDivisionComparison = columnMode === "comparison" && companyId && !divisionId
  const isSubDivisionComparison = columnMode === "comparison" && companyId && divisionId && !subDivisionId
  const isComparisonMode = isCompanyComparison || isDivisionComparison || isSubDivisionComparison

  const getYearLabels = (): string[] => {
    const currentYear = new Date().getFullYear()
    const labels: string[] = []
    if (isForecastSection) {
      for (let i = 0; i <= projectionYears; i++) {
        labels.push(`${currentYear + i}`)
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        labels.push(`${currentYear - i}`)
      }
    }
    return labels
  }

  const getHorizonText = (): string => {
    if (effectiveView === "years") return "Années"
    if (effectiveView === "comparison" && effectivePeriod === "monthly") return "Courant"
    if (effectiveView === "comparison" && effectivePeriod === "quarterly") return "Trimestriel"
    if (effectiveView === "comparison" && effectivePeriod === "annual") return "Annuel"
    if (effectiveView === "ytd") return "YTD"
    if (effectiveView === "ddm") return "DDM"
    if (effectiveView === "12months") return "12 mois"
    if (effectiveView === "quarters") return "Trimestres"
    return "Courant"
  }

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
                <span className="font-medium">{getHorizonText()}</span>
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
              {view === "years" && isForecastSection && (
                <th className="px-4 py-4 text-center font-semibold text-slate-900 text-sm whitespace-nowrap">
                  Taux
                </th>
              )}
              {view === "years" && (
                <>
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
          </thead>
          <tbody>
            {data.map((row, idx) => {
              const isSpacer = row.label === ""
              const shouldHideAmounts = isSpacer || !!row.isSection
              const displayLabel = row.isSection ? capitalizeFirst(row.label) : row.label
              const nextRowIsSubtotal = idx < data.length - 1 && data[idx + 1].isSubtotal
              // If projectionMode is "account", disable expansion for forecast sections
              const isForecastSectionForExpansion = title === "Estimation des Capex annuels"
              const canExpand = !!row.rowId && !!row.balanceAccounts && row.balanceAccounts.length > 0 && (projectionMode === "gl" || !isForecastSectionForExpansion)
              const isExpanded = row.rowId ? expandedRows.has(row.rowId) : false
              const hasNote = row.rowId
                ? getNoteByRowId(row.rowId, "capex", effectivePeriod, effectiveView, companyId, divisionId, subDivisionId) !== null
                : false

              return (
                <>
                  <tr 
                    key={idx} 
                    className={cn(
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
                              setSelectedRowFinancialData({
                                currentAmount: row.current !== 0 ? row.current : null,
                                priorAmount: row.prior !== 0 ? row.prior : null,
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

                    {/* Depreciation Rate Column - NO gray background */}
                    {view === "years" && isForecastSection && (
                      <td className="px-4 py-3 text-center">
                        {shouldHideAmounts ? (
                          "-"
                        ) : row.rowId ? (
                          editingDepreciationRate === row.rowId ? (
                            <Input
                              type="number"
                              step="0.1"
                              value={getDepreciationRate(row.rowId, row.label).toFixed(1)}
                              onChange={(e) => {
                                const newRate = parseFloat(e.target.value) || 0
                                if (row.rowId) {
                                  updateDepreciationRate(row.rowId, newRate)
                                }
                              }}
                              onBlur={() => setEditingDepreciationRate(null)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === "Escape") {
                                  setEditingDepreciationRate(null)
                                }
                              }}
                              className="w-20 text-center font-mono text-sm"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <button
                              onClick={() => row.rowId && setEditingDepreciationRate(row.rowId)}
                              className="px-3 py-1 rounded-md text-xs font-medium transition-colors hover:bg-slate-100 cursor-pointer"
                            >
                              {getDepreciationRate(row.rowId, row.label).toFixed(1)}%
                            </button>
                          )
                        ) : (
                          "-"
                        )}
                      </td>
                    )}

                    {view === "years" && row.trendValues && (
                      <>
                        {row.trendValues.map((value, valueIdx) => {
                          const actualValue = isForecastSection && row.rowId 
                            ? getCapexValue(row.rowId, valueIdx, value, row.trendValues?.[0])
                            : value
                          
                          // Check if this cell can have adjustments (forecast section, not first year, has rowId)
                          const canHaveAdjustment = isForecastSection && valueIdx > 0 && row.rowId && !shouldHideAmounts
                          const cellKey = row.rowId ? `${row.rowId}-${valueIdx}` : null
                          
                          const previousValue = valueIdx > 0 && row.trendValues 
                            ? (isForecastSection && row.rowId 
                                ? getCapexValue(row.rowId, valueIdx - 1, row.trendValues[valueIdx - 1], row.trendValues?.[0])
                                : row.trendValues[valueIdx - 1])
                            : null
                          
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
                                "px-4 py-3 text-right font-mono",
                                row.isBold ? "font-bold" : "",
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
                                        getAdjustments(row.rowId || "", valueIdx).length > 0 && "text-blue-600"
                                      )}
                                      title={`Ajustements (${getAdjustments(row.rowId || "", valueIdx).length})`}
                                    >
                                      <Settings className="w-3.5 h-3.5" />
                                      {getAdjustments(row.rowId || "", valueIdx).length > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                          {getAdjustments(row.rowId || "", valueIdx).length}
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
                    {view === "years" && !row.trendValues && (
                      <>
                        {Array.from({ length: isForecastSection && view === "years" ? projectionYears + 1 : 6 }).map((_, idx) => (
                          <td 
                            key={idx} 
                            className={cn(
                              "px-4 py-3 text-right font-mono text-white",
                              isForecastSection && idx === 0 ? "bg-slate-50" : ""
                            )}
                          >
                            -
                          </td>
                        ))}
                      </>
                    )}
                  </tr>
                  {/* Expanded balance accounts */}
                  {canExpand && isExpanded && row.balanceAccounts && row.balanceAccounts.length > 0 && (
                    <>
                      {row.balanceAccounts.map((account, accIdx) => (
                        <tr key={`${idx}-account-${accIdx}`} className="bg-slate-50 border-b border-slate-200">
                          <td className="px-6 py-2 text-slate-600 pl-20">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono text-slate-500">{account.accountNumber}</span>
                              <span className="text-sm">{account.accountName}</span>
                            </div>
                          </td>
                          {/* Depreciation Rate Column for balance accounts - NO gray background */}
                          {view === "years" && isForecastSection && (
                            <td className="px-4 py-2 text-center text-slate-500 text-sm">-</td>
                          )}
                          {view === "years" && (
                            <>
                              {row.trendValues && row.trendValues.map((_, valueIdx) => {
                                const accountValue = account.proportion 
                                  ? (isForecastSection && row.rowId
                                      ? getCapexValue(row.rowId, valueIdx, row.trendValues![valueIdx], row.trendValues?.[0]) * account.proportion
                                      : row.trendValues![valueIdx] * account.proportion)
                                  : 0
                                
                                const previousValue = valueIdx > 0 && row.trendValues 
                                  ? (isForecastSection && row.rowId 
                                      ? getCapexValue(row.rowId, valueIdx - 1, row.trendValues[valueIdx - 1], row.trendValues?.[0]) * (account.proportion || 1)
                                      : row.trendValues[valueIdx - 1] * (account.proportion || 1))
                                  : null
                                
                                let displayValue: string | number = accountValue
                                let growthRate: number | null = null
                                if (showGrowthRate && isForecastSection && valueIdx > 0 && previousValue !== null) {
                                  if (previousValue !== 0) {
                                    growthRate = calculateVariation(accountValue, previousValue)
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
                                      "px-4 py-2 text-right font-mono text-sm",
                                      isForecastSection && valueIdx === 0 ? "bg-slate-50 text-slate-700" : "text-slate-700",
                                      showGrowthRate && isForecastSection && valueIdx > 0 && typeof displayValue === "string" && displayValue.includes("%") && growthRate !== null && growthRate >= 0 ? "text-emerald-600 font-semibold" : "",
                                      showGrowthRate && isForecastSection && valueIdx > 0 && typeof displayValue === "string" && displayValue.includes("%") && growthRate !== null && growthRate < 0 ? "text-red-600 font-semibold" : ""
                                    )}
                                  >
                                    {showGrowthRate && isForecastSection 
                                      ? displayValue 
                                      : (accountValue !== 0 ? formatCurrency(Math.round(accountValue)) : "-")}
                                  </td>
                                )
                              })}
                              {!row.trendValues && (
                                <>
                                  {isForecastSection && (
                                    <td className="px-4 py-2 text-center text-slate-500 text-sm">-</td>
                                  )}
                                  {Array.from({ length: isForecastSection && view === "years" ? projectionYears + 1 : 6 }).map((_, idx) => (
                                    <td 
                                      key={idx} 
                                      className={cn(
                                        "px-4 py-2 text-right font-mono text-sm text-white",
                                        isForecastSection && idx === 0 ? "bg-slate-50" : ""
                                      )}
                                    >
                                      -
                                    </td>
                                  ))}
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
        open={noteModalOpen}
        onOpenChange={setNoteModalOpen}
        rowId={selectedRowId || ""}
        rowLabel={selectedRowLabel}
        page="capex"
        period={effectivePeriod}
        view={effectiveView}
        companyId={companyId}
        divisionId={divisionId}
        subDivisionId={subDivisionId}
        financialData={selectedRowFinancialData}
        onNoteSaved={() => {
          setNotesUpdated((prev) => prev + 1)
        }}
      />

      {/* Adjustment Modal */}
      {isForecastSection && editingAdjustment && (() => {
        const rowLabel = editingAdjustment.rowId ? (data.find(r => r.rowId === editingAdjustment.rowId)?.label || "Poste") : "Poste"
        const yearLabels = getYearLabels()
        const yearIndex = editingAdjustment.yearIndex >= 0 && editingAdjustment.yearIndex < yearLabels.length 
          ? editingAdjustment.yearIndex 
          : 0
        const yearLabel = yearLabels[yearIndex] || `${yearIndex}`
        const existingAdjustments = getAdjustments(editingAdjustment.rowId, editingAdjustment.yearIndex)
        
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
                    const capexAdj = adj as CapexAdjustment
                    return (
                      <div key={capexAdj.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-slate-900">
                                {formatCurrency(capexAdj.value)}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                                Montant annuel
                              </span>
                            </div>
                            {capexAdj.note && (
                              <p className="text-sm text-slate-600 mt-1">{capexAdj.note}</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => openAdjustmentModal(editingAdjustment.rowId, editingAdjustment.yearIndex, capexAdj.id)}
                              className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4 text-slate-600" />
                            </button>
                            <button
                              onClick={() => deleteAdjustment(capexAdj.id)}
                              className="p-1.5 hover:bg-red-100 rounded transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
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
                        setAdjustmentType("amount")
                        setAdjustmentValue(0)
                        setAdjustmentNote("")
                      }}
                    >
                      Annuler
                    </Button>
                  )}
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Montant annuel ($)
                  </label>
                  <Input
                    type="number"
                    value={adjustmentValue}
                    onChange={(e) => setAdjustmentValue(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Montant annuel souhaité pour cette année
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Note explicative
                  </label>
                  <Textarea
                    value={adjustmentNote}
                    onChange={(e) => setAdjustmentNote(e.target.value)}
                    placeholder="Ex: Achat d'équipement majeur, Expansion des installations, etc."
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
                    setAdjustmentType("amount")
                    setAdjustmentValue(0)
                    setAdjustmentNote("")
                  }}
                >
                  Fermer
                </Button>
                <Button
                  onClick={saveAdjustment}
                  disabled={adjustmentValue === 0}
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

