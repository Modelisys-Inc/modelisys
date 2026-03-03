"use client"

import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import { ChevronRight, ChevronDown, StickyNote, Settings, Edit2, Trash2 } from "lucide-react"
import { generateId } from "@/lib/seeded-random"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { listForecastConfigs, upsertForecastConfig } from "@/lib/api"
import { NoteModal } from "@/components/note-modal"
import { getNoteByRowId, useNotesCache } from "@/lib/notes-storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { getRowAmounts, aggregateToYears } from "@/lib/series-utils"

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
  projectionId?: string | null
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
  projectionId,
}: FDRForecastDetailProps) {
  useNotesCache(companyId ?? null)
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

  // ── Fetch balance-sheet series data ──
  const currentYear = new Date().getFullYear()
  const { rows: bsRows, periods: bsPeriods, loading: bsLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "balance-sheet",
    fiscalYear: currentYear,
    months: 60, // 5 fiscal years of monthly data
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: !!companyId,
  })

  // Debounced save to API
  const saveConfigRef = useRef<NodeJS.Timeout>()

  const saveConfig = useCallback((data: Record<string, unknown>) => {
    if (!companyId || !isForecastSection) return
    clearTimeout(saveConfigRef.current)
    saveConfigRef.current = setTimeout(async () => {
      try {
        await upsertForecastConfig(companyId, {
          config_type: "fdr-forecast",
          data,
          projection_id: projectionId ?? undefined,
        })
      } catch (err) {
        console.error("Error saving FDR forecast config:", err)
      }
    }, 500)
  }, [companyId, isForecastSection, projectionId])

  // Load FDR forecast config from API on mount
  useEffect(() => {
    if (!companyId || !isForecastSection) return

    const loadConfig = async () => {
      try {
        const configs = await listForecastConfigs(companyId, { config_type: "fdr-forecast", projection_id: projectionId ?? undefined })
        if (configs.length > 0) {
          const data = configs[0].data as Record<string, unknown>
          if (data.fdrValues) setFdrValues(data.fdrValues as typeof fdrValues)
          if (data.fdrAdjustments) {
            const adjustmentsParsed = data.fdrAdjustments as Record<string, unknown>
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
          }
          if (data.fdrTypes) setFdrTypes(data.fdrTypes as typeof fdrTypes)
        }
      } catch (err) {
        console.error("Error loading FDR forecast config:", err)
      }
    }
    loadConfig()
  }, [companyId, isForecastSection, projectionId])

  // Save FDR values whenever they change
  useEffect(() => {
    if (!isForecastSection || Object.keys(fdrValues).length === 0) return
    saveConfig({ fdrValues, fdrAdjustments, fdrTypes })
  }, [fdrValues, saveConfig, isForecastSection])

  // Save FDR adjustments whenever they change
  useEffect(() => {
    if (!isForecastSection || Object.keys(fdrAdjustments).length === 0) return
    saveConfig({ fdrValues, fdrAdjustments, fdrTypes })
  }, [fdrAdjustments, saveConfig, isForecastSection])

  // Save FDR types whenever they change
  useEffect(() => {
    if (!isForecastSection || Object.keys(fdrTypes).length === 0) return
    saveConfig({ fdrValues, fdrAdjustments, fdrTypes })
  }, [fdrTypes, saveConfig, isForecastSection])

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
          id: generateId(),
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

  // ── Derive year labels from series data ──
  const yearLabelsFromSeries = useMemo((): string[] => {
    if (bsRows.length === 0 || bsPeriods.length === 0) return []
    const rawAmounts = getRowAmounts(bsRows[0], bsPeriods)
    return aggregateToYears(rawAmounts, bsPeriods).labels
  }, [bsRows, bsPeriods])

  // Generate data for years view from real API data
  const getYearsData = (): DetailRow[] => {
    if (bsRows.length === 0 || bsPeriods.length === 0) return []

    const slugify = (label: string) =>
      label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

    // Labels that should be excluded from the FDR view (cash, fixed assets, debt, etc.)
    const excludedPatterns = [
      "trésorerie", "caisse", "encaisse",
      "immobilisations corporelles", "immobilisations incorporelles",
      "autres actifs non courants", "actifs non courants",
      "dettes à court terme", "dettes à long terme",
      "autres passifs non courants", "passifs non courants",
    ]

    const isExcluded = (label: string): boolean => {
      const lower = label.toLowerCase()
      return excludedPatterns.some((p) => lower.includes(p))
    }

    // Build all rows from API series data
    const allRows: DetailRow[] = bsRows.map((sr) => {
      const rawAmounts = getRowAmounts(sr, bsPeriods)
      const yearAgg = aggregateToYears(rawAmounts, bsPeriods)
      const values = yearAgg.amounts
      const isIndented = !sr.isBold && !sr.isSection && !sr.isResult

      return {
        label: sr.label,
        current: values[values.length - 1] || 0,
        prior: values.length >= 2 ? values[values.length - 2] : 0,
        indent: isIndented,
        isBold: sr.isBold,
        isSubtotal: sr.isResult,
        isSection: sr.isSection,
        trendValues: sr.isSection ? undefined : values,
        rowId: isIndented && sr.label ? slugify(sr.label) : undefined,
      }
    })

    // Filter out excluded rows (cash, fixed assets, debt, etc.)
    const filteredRows = allRows.filter((row) => {
      if (!row.label) return true // keep spacers
      if (isExcluded(row.label)) return false
      return true
    })

    // Add balance accounts from API detailRows for rows that have a rowId
    return filteredRows.map((row) => {
      if (row.rowId) {
        // Find original series row to get detailRows
        const sr = bsRows.find((r) => slugify(r.label) === row.rowId)
        if (sr && sr.detailRows && sr.detailRows.length > 0) {
          const balanceAccounts: BalanceAccount[] = sr.detailRows.map((dr) => {
            const drAmounts = bsPeriods.map(
              (p) => dr.amounts[`${p.fiscalYear}-${p.fiscalMonth}`] || 0
            )
            const drYear = aggregateToYears(drAmounts, bsPeriods)
            const drCurrent = drYear.amounts[drYear.amounts.length - 1] || 0
            const drPrior = drYear.amounts.length >= 2 ? drYear.amounts[drYear.amounts.length - 2] : 0
            const parentCurrent = row.current || 1
            return {
              accountNumber: dr.id || "",
              accountName: dr.label,
              amount: drCurrent,
              priorAmount: drPrior,
              proportion: parentCurrent !== 0 ? drCurrent / parentCurrent : 0,
            }
          })
          return { ...row, balanceAccounts }
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
                  {yearLabelsFromSeries.length > 0
                    ? yearLabelsFromSeries.map((label, idx) => (
                        <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm">
                          {label}
                        </th>
                      ))
                    : Array.from({ length: projectionYears + 1 }).map((_, idx) => (
                        <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm">
                          {currentYear - projectionYears + idx}
                        </th>
                      ))
                  }
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {!companyId && (
              <tr>
                <td colSpan={20} className="px-6 py-12 text-center text-slate-500">
                  Sélectionnez une société
                </td>
              </tr>
            )}
            {companyId && bsLoading && (
              <tr>
                <td colSpan={20} className="px-6 py-12 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    Chargement des données...
                  </div>
                </td>
              </tr>
            )}
            {companyId && !bsLoading && data.length === 0 && (
              <tr>
                <td colSpan={20} className="px-6 py-12 text-center text-slate-500">
                  Aucune donnée disponible. Veuillez importer une balance de vérification.
                </td>
              </tr>
            )}
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
                        {Array.from({ length: yearLabelsFromSeries.length || (projectionYears + 1) }).map((_, emptyIdx) => {
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
                              {Array.from({ length: yearLabelsFromSeries.length || (projectionYears + 1) }).map((_, emptyIdx) => {
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
        const yearLabels = yearLabelsFromSeries.length > 0
          ? yearLabelsFromSeries
          : Array.from({ length: projectionYears + 1 }, (_, i) => `${currentYear - projectionYears + i}`)
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

