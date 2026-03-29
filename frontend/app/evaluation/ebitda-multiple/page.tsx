"use client"

import { useState, useEffect, useMemo } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector } from "@/components/entity-selector"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Calculator, DollarSign, BarChart3, Building2, Info, Plus, Minus, Filter, TrendingUp, AlertTriangle, Settings } from "lucide-react"
import { formatCurrency } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCompanies } from "@/hooks/use-companies"
import { listEbitdaNotes, upsertEbitdaNote, getIncomeStatement, listCompanies, listForecastConfigs, upsertForecastConfig, type Company as ApiCompany } from "@/lib/api"
import { generateId } from "@/lib/seeded-random"

const evaluationNav = [
  { label: "Modèle d'affaires", href: "/evaluation/business-model" },
  { label: "Multiple du BAIIA", href: "/evaluation/ebitda-multiple" },
  { label: "Actif Corporel Net", href: "/evaluation/net-tangible-assets" },
  { label: "DCF", href: "/evaluation/dcf" },
  { label: "CCF", href: "/evaluation/ccf" },
  { label: "VCA", href: "/evaluation/vca" },
]

interface Adjustment {
  id: string
  name: string
  amounts: { [year: number]: number } // Montant par année
}

interface EBITDAYear {
  year: number
  ebitda: number
  adjustedEBITDA: number
  weight: number
  isRepresentative: boolean
}

export default function EBITDAMultiplePage() {
  const { companies } = useCompanies()
  const pathname = usePathname()
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState<boolean>(false)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [divisionId, setDivisionId] = useState<string | null>(null)
  const [subDivisionId, setSubDivisionId] = useState<string | null>(null)
  
  // Auto-select first company
  useEffect(() => {
    if (!companyId && companies.length > 0) {
      setCompanyId(companies[0].id)
    }
  }, [companies, companyId])

  // Check if disclaimer was accepted in session storage
  useEffect(() => {
    const accepted = localStorage.getItem("ebitda-multiple-disclaimer-accepted")
    if (accepted === "true") {
      setHasAcceptedDisclaimer(true)
    }
  }, [])

  const handleAcceptDisclaimer = () => {
    localStorage.setItem("ebitda-multiple-disclaimer-accepted", "true")
    setHasAcceptedDisclaimer(true)
  }
  
  // Revenue map: fiscal_year -> revenue amount (populated from API)
  const [revenueByYear, setRevenueByYear] = useState<Record<number, number>>({})

  // Loading state for income statement data
  const [incomeDataLoading, setIncomeDataLoading] = useState(false)

  // Store raw API companies to access fiscal_year_end
  const [apiCompanies, setApiCompanies] = useState<ApiCompany[]>([])
  useEffect(() => {
    listCompanies().then(setApiCompanies).catch(() => {})
  }, [])

  // Compute the last complete fiscal year based on the selected company's fiscal year end
  const lastCompleteFY = useMemo(() => {
    const now = new Date()
    const curMonth = now.getMonth() + 1
    const curYear = now.getFullYear()
    if (!companyId) return curYear
    const company = apiCompanies.find(c => c.id === companyId)
    const fyEnd = company?.fiscal_year_end || "12-31"
    const fyEndMonth = parseInt(fyEnd.split("-")[0], 10) || 12
    const currentFY = curMonth <= fyEndMonth ? curYear : curYear + 1
    return currentFY - 1
  }, [companyId, apiCompanies])

  // Initialize with 5 years of data - values start at 0 and are populated from API
  const [years, setYears] = useState<EBITDAYear[]>(() => {
    const yr = new Date().getFullYear()
    return [
      { year: yr - 4, ebitda: 0, adjustedEBITDA: 0, weight: 0, isRepresentative: false },
      { year: yr - 3, ebitda: 0, adjustedEBITDA: 0, weight: 0, isRepresentative: false },
      { year: yr - 2, ebitda: 0, adjustedEBITDA: 0, weight: 0, isRepresentative: false },
      { year: yr - 1, ebitda: 0, adjustedEBITDA: 0, weight: 0.25, isRepresentative: true },
      { year: yr, ebitda: 0, adjustedEBITDA: 0, weight: 0.3, isRepresentative: true },
    ]
  })

  // Fetch income statement data for all 5 years when company changes
  useEffect(() => {
    if (!companyId) {
      setRevenueByYear({})
      setYears(prev => prev.map(y => ({ ...y, ebitda: 0, adjustedEBITDA: 0 })))
      return
    }

    let cancelled = false
    setIncomeDataLoading(true)

    const fiscalYears = [lastCompleteFY - 4, lastCompleteFY - 3, lastCompleteFY - 2, lastCompleteFY - 1, lastCompleteFY]
    const promises = fiscalYears.map(fy =>
      getIncomeStatement(companyId, {
        fiscal_year: fy,
        period: "annual",
        ...(divisionId ? { division_id: divisionId } : {}),
        ...(subDivisionId ? { sub_division_id: subDivisionId } : {}),
      }).catch(() => null)
    )

    Promise.all(promises).then(results => {
      if (cancelled) return

      const newRevenueByYear: Record<number, number> = {}
      const ebitdaByYear: Record<number, number> = {}

      results.forEach((res, idx) => {
        const fy = fiscalYears[idx]
        if (!res || !res.rows) {
          newRevenueByYear[fy] = 0
          ebitdaByYear[fy] = 0
          return
        }

        // Find Revenue row (typically labeled "Revenus" or first result row)
        const revenueRow = res.rows.find(r =>
          r.label.toLowerCase().includes("revenu") && r.isResult
        ) || res.rows.find(r => r.label.toLowerCase().includes("revenu"))
        newRevenueByYear[fy] = revenueRow ? revenueRow.current : 0

        // Find EBITDA/BAIIA row
        const ebitdaRow = res.rows.find(r =>
          (r.label.toLowerCase().includes("baiia") || r.label.toLowerCase().includes("ebitda")) && r.isResult
        ) || res.rows.find(r =>
          r.label.toLowerCase().includes("baiia") || r.label.toLowerCase().includes("ebitda")
        )
        ebitdaByYear[fy] = ebitdaRow ? ebitdaRow.current : 0
      })

      setRevenueByYear(newRevenueByYear)
      // Update years with correct FY labels and EBITDA data, preserving user-set weights
      setYears(prev => fiscalYears.map((fy, i) => {
        const existing = prev.find(y => y.year === fy)
        return {
          year: fy,
          ebitda: ebitdaByYear[fy] || 0,
          adjustedEBITDA: ebitdaByYear[fy] || 0,
          weight: existing?.weight ?? (i >= 3 ? (i === 3 ? 0.25 : 0.3) : 0),
          isRepresentative: existing?.isRepresentative ?? (i >= 3),
        }
      }))
      setIncomeDataLoading(false)
    })

    return () => { cancelled = true }
  }, [companyId, divisionId, subDivisionId, lastCompleteFY])

  // Helper to get revenue for a given year
  const getRevenueForYear = (year: number): number => {
    return revenueByYear[year] || 0
  }

  // Adjustments shared across all years
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [configLoaded, setConfigLoaded] = useState(false)

  // Track which input is being edited (for formatting purposes)
  const [editingInput, setEditingInput] = useState<string | null>(null)

  // Weight modal state
  const [weightModalOpen, setWeightModalOpen] = useState(false)
  const [editingWeightIndex, setEditingWeightIndex] = useState<number | null>(null)
  const [weightModalValue, setWeightModalValue] = useState<number>(0)
  const [weightNote, setWeightNote] = useState<string>("")
  
  // Weight notes storage: key = year -> note
  const [weightNotes, setWeightNotes] = useState<Record<number, string>>({})

  // Adjustment modal state
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false)
  const [editingAdjustmentId, setEditingAdjustmentId] = useState<string | null>(null)
  const [editingAdjustmentYear, setEditingAdjustmentYear] = useState<number | null>(null) // null = edit all, number = edit specific year
  const [adjustmentModalName, setAdjustmentModalName] = useState<string>("")
  const [adjustmentModalAmounts, setAdjustmentModalAmounts] = useState<Record<number, number>>({})
  const [adjustmentNote, setAdjustmentNote] = useState<string>("")
  
  // Adjustment notes storage: key = adjustmentId -> year -> note
  const [adjustmentNotes, setAdjustmentNotes] = useState<Record<string, Record<number, string>>>({})

  const [lowMultiple, setLowMultiple] = useState<number>(4.5)
  const [highMultiple, setHighMultiple] = useState<number>(6.5)

  // BAIIA Range modal states
  const [ebitdaRangeModalOpen, setEbitdaRangeModalOpen] = useState(false)
  const [editingEbitdaRangeType, setEditingEbitdaRangeType] = useState<"low" | "high" | null>(null)
  const [ebitdaRangeModalValue, setEbitdaRangeModalValue] = useState<number>(0)
  const [ebitdaRangeNote, setEbitdaRangeNote] = useState<string>("")
  
  // BAIIA Range notes storage: key = "low" | "high" -> note
  const [ebitdaRangeNotes, setEbitdaRangeNotes] = useState<Record<"low" | "high", string>>({} as Record<"low" | "high", string>)

  // Multiple modal states
  const [multipleModalOpen, setMultipleModalOpen] = useState(false)
  const [editingMultipleType, setEditingMultipleType] = useState<"low" | "high" | null>(null)
  const [multipleModalValue, setMultipleModalValue] = useState<number>(0)
  const [multipleNote, setMultipleNote] = useState<string>("")
  
  // Multiple notes storage: key = "low" | "high" -> note
  const [multipleNotes, setMultipleNotes] = useState<Record<"low" | "high", string>>({} as Record<"low" | "high", string>)

  // Calculate total adjustments for a specific year
  const getTotalAdjustmentsForYear = (year: number): number => {
    return adjustments.reduce((sum, adj) => sum + (adj.amounts[year] || 0), 0)
  }

  // Recalculate adjusted EBITDA for all years when adjustments change
  useEffect(() => {
    const newYears = years.map((year) => {
      const totalAdjustments = getTotalAdjustmentsForYear(year.year)
      return {
        ...year,
        adjustedEBITDA: year.ebitda + totalAdjustments,
      }
    })
    setYears(newYears)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjustments])

  // Add a new adjustment row
  const addAdjustment = () => {
    const newAdjustment: Adjustment = {
      id: generateId("adj"),
      name: `Ajustement ${adjustments.length + 1}`,
      amounts: {},
    }
    // Initialize amounts to 0 for all years
    years.forEach((year) => {
      newAdjustment.amounts[year.year] = 0
    })
    setAdjustments([...adjustments, newAdjustment])
  }

  // Remove an adjustment row
  const removeAdjustment = (adjustmentId: string) => {
    setAdjustments(adjustments.filter((adj) => adj.id !== adjustmentId))
    setAdjustmentNotes((prev) => {
      const newNotes = { ...prev }
      delete newNotes[adjustmentId]
      return newNotes
    })
    // Persist updated notes to backend
    if (companyId) {
      const updatedNotes = { ...adjustmentNotes }
      delete updatedNotes[adjustmentId]
      upsertEbitdaNote(companyId, {
        note_type: "adjustment",
        data: updatedNotes as Record<string, unknown>,
        division_id: divisionId,
        sub_division_id: subDivisionId,
      }).catch(console.error)
    }
  }

  // Open adjustment modal
  const openAdjustmentModal = (adjustmentId: string, year?: number) => {
    const adjustment = adjustments.find((adj) => adj.id === adjustmentId)
    if (!adjustment) return
    
    setEditingAdjustmentId(adjustmentId)
    setEditingAdjustmentYear(year || null)
    setAdjustmentModalName(adjustment.name)
    
    if (year !== undefined) {
      // Editing specific year - only show that year's amount
      setAdjustmentModalAmounts({ [year]: adjustment.amounts[year] || 0 })
      setAdjustmentNote(adjustmentNotes[adjustmentId]?.[year] || "")
    } else {
      // Editing name only - initialize all amounts but don't show them
      const amounts: Record<number, number> = {}
      years.forEach((y) => {
        amounts[y.year] = adjustment.amounts[y.year] || 0
      })
      setAdjustmentModalAmounts(amounts)
      setAdjustmentNote("")
    }
    
    setAdjustmentModalOpen(true)
  }

  // Save adjustment and note
  const saveAdjustmentAndNote = () => {
    if (!editingAdjustmentId) return
    
    // Update adjustment name (always, even if editing a year)
    updateAdjustmentName(editingAdjustmentId, adjustmentModalName)
    
    if (editingAdjustmentYear !== null) {
      // Editing specific year - update only that year's amount
      const year = editingAdjustmentYear
      updateAdjustmentAmount(editingAdjustmentId, year, adjustmentModalAmounts[year] || 0)
      
      // Update note for this specific year
      const updatedAdjNotes = { ...adjustmentNotes }
      if (!updatedAdjNotes[editingAdjustmentId]) {
        updatedAdjNotes[editingAdjustmentId] = {}
      }
      updatedAdjNotes[editingAdjustmentId][year] = adjustmentNote
      setAdjustmentNotes(updatedAdjNotes)

      // Persist to backend
      if (companyId) {
        upsertEbitdaNote(companyId, {
          note_type: "adjustment",
          data: updatedAdjNotes as Record<string, unknown>,
          division_id: divisionId,
          sub_division_id: subDivisionId,
        }).catch(console.error)
      }
    } else {
      // Editing name only - no amount or note changes
    }
    
    // Close modal
    setAdjustmentModalOpen(false)
    setEditingAdjustmentId(null)
    setEditingAdjustmentYear(null)
    setAdjustmentModalName("")
    setAdjustmentModalAmounts({})
    setAdjustmentNote("")
  }

  // Load adjustments + weights from ForecastConfig when entity changes
  useEffect(() => {
    if (!companyId) {
      setConfigLoaded(true)
      return
    }
    let cancelled = false

    listForecastConfigs(companyId, {
      config_type: "ebitda-multiple-config",
      ...(divisionId ? { division_id: divisionId } : {}),
      ...(subDivisionId ? { sub_division_id: subDivisionId } : {}),
    })
      .then((configs) => {
        if (cancelled) return
        if (configs.length > 0) {
          const d = configs[0].data as Record<string, unknown>
          if (Array.isArray(d.adjustments)) setAdjustments(d.adjustments as Adjustment[])
          if (typeof d.lowMultiple === "number") setLowMultiple(d.lowMultiple)
          if (typeof d.highMultiple === "number") setHighMultiple(d.highMultiple)
          if (Array.isArray(d.weights)) {
            setYears(prev => prev.map((y, i) => ({
              ...y,
              weight: (d.weights as number[])[i] ?? y.weight,
              isRepresentative: (d.isRepresentative as boolean[])?.[i] ?? y.isRepresentative,
            })))
          }
        }
        setConfigLoaded(true)
      })
      .catch(() => setConfigLoaded(true))

    return () => { cancelled = true }
  }, [companyId, divisionId, subDivisionId])

  // Debounced auto-save of adjustments + weights
  useEffect(() => {
    if (!configLoaded || !companyId) return
    const timer = setTimeout(() => {
      upsertForecastConfig(companyId, {
        config_type: "ebitda-multiple-config",
        data: {
          adjustments,
          lowMultiple,
          highMultiple,
          weights: years.map(y => y.weight),
          isRepresentative: years.map(y => y.isRepresentative),
        } as Record<string, unknown>,
        ...(divisionId ? { division_id: divisionId } : {}),
        ...(subDivisionId ? { sub_division_id: subDivisionId } : {}),
      }).catch(console.error)
    }, 800)
    return () => clearTimeout(timer)
  }, [adjustments, lowMultiple, highMultiple, years, companyId, divisionId, subDivisionId, configLoaded])

  // Load all EBITDA notes from backend when entity changes
  useEffect(() => {
    if (!companyId) return
    let cancelled = false

    listEbitdaNotes(companyId, {
      division_id: divisionId || undefined,
      sub_division_id: subDivisionId || undefined,
    })
      .then((notes) => {
        if (cancelled) return
        for (const note of notes) {
          const d = note.data as Record<string, unknown>
          if (note.note_type === "adjustment") {
            const converted: Record<string, Record<number, string>> = {}
            for (const [key, value] of Object.entries(d)) {
              if (typeof value === "object" && value !== null) {
                converted[key] = value as Record<number, string>
              }
            }
            setAdjustmentNotes(converted)
          } else if (note.note_type === "weight") {
            setWeightNotes(d as Record<number, string>)
          } else if (note.note_type === "range") {
            setEbitdaRangeNotes(d as Record<"low" | "high", string>)
          } else if (note.note_type === "multiple") {
            setMultipleNotes(d as Record<"low" | "high", string>)
          }
        }
      })
      .catch((err) => {
        if (!cancelled) console.error("Error loading EBITDA notes:", err)
      })

    return () => { cancelled = true }
  }, [companyId, divisionId, subDivisionId])

  // Update adjustment name
  const updateAdjustmentName = (adjustmentId: string, name: string) => {
    const newAdjustments = adjustments.map((adj) =>
      adj.id === adjustmentId ? { ...adj, name } : adj
    )
    setAdjustments(newAdjustments)
  }

  // Update adjustment amount for a specific year
  const updateAdjustmentAmount = (adjustmentId: string, year: number, amount: number) => {
    setAdjustments(
      adjustments.map((adj) =>
        adj.id === adjustmentId
          ? { ...adj, amounts: { ...adj.amounts, [year]: amount } }
          : adj
      )
    )
  }

  // Update weight
  const updateWeight = (index: number, weight: number) => {
    const newYears = [...years]
    newYears[index].weight = weight
    setYears(newYears)
  }

  // Open weight modal
  const openWeightModal = (index: number) => {
    setEditingWeightIndex(index)
    // Convert decimal (0-1) to percentage (0-100) for display
    setWeightModalValue(years[index].weight * 100)
    setWeightNote(weightNotes[years[index].year] || "")
    setWeightModalOpen(true)
  }

  // Save weight and note
  const saveWeightAndNote = () => {
    if (editingWeightIndex === null) return
    
    // Convert percentage (0-100) to decimal (0-1) for storage
    const weightDecimal = weightModalValue / 100
    // Update weight
    updateWeight(editingWeightIndex, weightDecimal)
    
    // Update note
    const year = years[editingWeightIndex].year
    const updatedWeightNotes = { ...weightNotes, [year]: weightNote }
    setWeightNotes(updatedWeightNotes)

    // Persist to backend
    if (companyId) {
      upsertEbitdaNote(companyId, {
        note_type: "weight",
        data: updatedWeightNotes as Record<string, unknown>,
        division_id: divisionId,
        sub_division_id: subDivisionId,
      }).catch(console.error)
    }
    
    // Close modal
    setWeightModalOpen(false)
    setEditingWeightIndex(null)
    setWeightModalValue(0)
    setWeightNote("")
  }

  // Weight notes are loaded from backend in the combined loader above

  // Open BAIIA Range modal
  const openEbitdaRangeModal = (type: "low" | "high") => {
    setEditingEbitdaRangeType(type)
    const value = type === "low" ? lowEBITDARange : highEBITDARange
    setEbitdaRangeModalValue(value)
    setEbitdaRangeNote(ebitdaRangeNotes[type] || "")
    setEbitdaRangeModalOpen(true)
  }

  // Save BAIIA Range and note
  const saveEbitdaRangeAndNote = () => {
    if (editingEbitdaRangeType === null) return
    
    // Update value
    if (editingEbitdaRangeType === "low") {
      setLowEBITDARange(ebitdaRangeModalValue)
    } else {
      setHighEBITDARange(ebitdaRangeModalValue)
    }
    
    // Update note and persist to backend
    const updatedRangeNotes = { ...ebitdaRangeNotes, [editingEbitdaRangeType]: ebitdaRangeNote }
    setEbitdaRangeNotes(updatedRangeNotes)

    if (companyId) {
      upsertEbitdaNote(companyId, {
        note_type: "range",
        data: updatedRangeNotes as Record<string, unknown>,
        division_id: divisionId,
        sub_division_id: subDivisionId,
      }).catch(console.error)
    }
    
    // Close modal
    setEbitdaRangeModalOpen(false)
    setEditingEbitdaRangeType(null)
    setEbitdaRangeModalValue(0)
    setEbitdaRangeNote("")
  }

  // Range notes are loaded from backend in the combined loader above

  // Open Multiple modal
  const openMultipleModal = (type: "low" | "high") => {
    setEditingMultipleType(type)
    const value = type === "low" ? lowMultiple : highMultiple
    setMultipleModalValue(value)
    setMultipleNote(multipleNotes[type] || "")
    setMultipleModalOpen(true)
  }

  // Save Multiple and note
  const saveMultipleAndNote = () => {
    if (editingMultipleType === null) return
    
    // Update value
    if (editingMultipleType === "low") {
      setLowMultiple(multipleModalValue)
    } else {
      setHighMultiple(multipleModalValue)
    }
    
    // Update note and persist to backend
    const updatedMultipleNotes = { ...multipleNotes, [editingMultipleType]: multipleNote }
    setMultipleNotes(updatedMultipleNotes)

    if (companyId) {
      upsertEbitdaNote(companyId, {
        note_type: "multiple",
        data: updatedMultipleNotes as Record<string, unknown>,
        division_id: divisionId,
        sub_division_id: subDivisionId,
      }).catch(console.error)
    }
    
    // Close modal
    setMultipleModalOpen(false)
    setEditingMultipleType(null)
    setMultipleModalValue(0)
    setMultipleNote("")
  }

  // Multiple notes are loaded from the backend via the listEbitdaNotes effect above

  // Calculate weighted average of representative years (years with weight > 0)
  const representativeYears = years.filter((y) => y.weight > 0)
  const totalWeight = representativeYears.reduce((sum, y) => sum + y.weight, 0)
  const weightedAverageEBITDA =
    totalWeight > 0
      ? representativeYears.reduce((sum, y) => sum + y.adjustedEBITDA * y.weight, 0) / totalWeight
      : 0

  // Calculate 5-year average (all years)
  const average5Years = years.reduce((sum, y) => sum + y.adjustedEBITDA, 0) / years.length

  // Calculate 3-year average (last 3 years)
  const last3Years = years.slice(-3)
  const average3Years = last3Years.reduce((sum, y) => sum + y.adjustedEBITDA, 0) / last3Years.length

  // State for BAIIA range selection
  const [lowEBITDARange, setLowEBITDARange] = useState<number>(() => {
    const initial = weightedAverageEBITDA || (years.reduce((sum, y) => sum + y.adjustedEBITDA, 0) / years.length)
    return initial * 0.9
  })
  const [highEBITDARange, setHighEBITDARange] = useState<number>(() => {
    const initial = weightedAverageEBITDA || (years.reduce((sum, y) => sum + y.adjustedEBITDA, 0) / years.length)
    return initial * 1.1
  })

  // Update range when weighted average changes
  useEffect(() => {
    if (weightedAverageEBITDA > 0) {
      setLowEBITDARange(weightedAverageEBITDA * 0.9)
      setHighEBITDARange(weightedAverageEBITDA * 1.1)
    }
  }, [weightedAverageEBITDA])

  // Generate chart data for enterprise value vs multiple
  const generateEnterpriseValueChartData = () => {
    const data = []
    const minMultiple = Math.max(0, lowMultiple - 1)
    const maxMultiple = highMultiple + 1
    const step = 0.1
    
    for (let mult = minMultiple; mult <= maxMultiple; mult += step) {
      const avgEBITDA = (lowEBITDARange + highEBITDARange) / 2
      const ev = avgEBITDA * mult
      data.push({
        multiple: parseFloat(mult.toFixed(1)),
        enterpriseValue: ev,
        lowEV: lowEBITDARange * mult,
        highEV: highEBITDARange * mult,
      })
    }
    return data
  }

  const enterpriseValueChartData = generateEnterpriseValueChartData()

  // Show disclaimer if not accepted
  if (!hasAcceptedDisclaimer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white flex items-center justify-center p-6">
        <Card className="max-w-3xl w-full border-2 border-amber-200 shadow-xl">
          <CardContent className="p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 rounded-full bg-amber-100 flex-shrink-0">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Avertissement important</h2>
                <p className="text-sm text-slate-600">Veuillez lire attentivement les informations suivantes avant de continuer</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                <p className="text-sm font-semibold text-amber-900 mb-2">Avis de non-responsabilité</p>
                <p className="text-sm text-amber-800 leading-relaxed">
                  Le processus de détermination de la valeur d'entreprise présenté dans cette section est <strong>uniquement à des fins de consultation</strong> et ne représente en aucun cas un rapport d'évaluation d'entreprise conforme aux normes professionnelles établies par l'Institut canadien des évaluateurs d'entreprises (ICÉÉ) et les normes CBV (Chartered Business Valuator).
                </p>
              </div>

              <div className="space-y-3 text-sm text-slate-700">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0"></div>
                  <p>
                    Les calculs et estimations fournis sont basés sur des données et hypothèses que vous avez saisies et peuvent ne pas refléter la valeur réelle de votre entreprise.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0"></div>
                  <p>
                    Cette fonctionnalité ne constitue pas un avis professionnel en matière d'évaluation d'entreprise et ne doit pas être utilisée comme seule base pour prendre des décisions financières importantes.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0"></div>
                  <p>
                    Pour obtenir une évaluation d'entreprise conforme aux normes professionnelles, vous devez consulter un évaluateur d'entreprises certifié (CBV) ou un professionnel qualifié.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0"></div>
                  <p>
                    Les résultats présentés sont fournis "tels quels" sans garantie d'exactitude, d'exhaustivité ou de pertinence pour votre situation particulière.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-6">
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>Note :</strong> En continuant, vous reconnaissez avoir lu et compris cet avertissement et acceptez que les informations fournies sont à des fins de consultation uniquement et ne remplacent pas un avis professionnel en matière d'évaluation d'entreprise.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Retour
              </Button>
              <Button
                onClick={handleAcceptDisclaimer}
                className="bg-slate-900 hover:bg-slate-800 text-white px-8"
              >
                J'ai compris, continuer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />
      
      {/* Dark Header Section */}
      <div className="w-full bg-slate-900 pt-15 pb-40">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="flex items-start gap-3 mb-8">
            <div className="w-2"></div>
            <div className="flex-1">
              <h2 className="text-4xl font-normal text-white mb-2 tracking-tight">Multiple du BAIIA</h2>
              <p className="text-base text-slate-300 mb-6">
                Analysez le BAIIA ajusté sur 5 exercices et évaluez votre entreprise avec la méthode des multiples
              </p>
              <p className="text-base text-slate-300 mb-6 leading-relaxed max-w-4xl">
                Analysez votre BAIIA ajusté sur les 5 derniers exercices, effectuez les ajustements nécessaires et déterminez 
                la valeur d'entreprise en appliquant des multiples de marché. Utilisez cette méthode d'évaluation pour estimer 
                la valeur de votre entreprise basée sur les performances financières ajustées.
              </p>
              {/* Navigation Menu - Style like income-statement page */}
              <div className="flex items-end gap-8 mb-2">
                {evaluationNav.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="relative pb-4 border-b border-slate-600/30"
                    >
                      <span
                        className={`text-sm font-normal transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        {item.label}
                      </span>
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 z-10"></div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="mb-6 p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Filter Icon */}
              <div className="flex items-center gap-2 text-slate-300">
                <Filter className="w-4 h-4" />
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-slate-700" />

              {/* Entity Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300 whitespace-nowrap">Entité:</span>
                <EntitySelector
                  companies={companies}
                  selectedCompanyId={companyId}
                  selectedDivisionId={divisionId}
                  selectedSubDivisionId={subDivisionId}
                  onCompanyChange={setCompanyId}
                  onDivisionChange={setDivisionId}
                  onSubDivisionChange={setSubDivisionId}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Overlapping section */}
      <div className="relative -mt-32 mb-12">
        <div className="max-w-[1920px] mx-auto px-6">

        <div className="space-y-6">
          {/* Main Section - EBITDA Analysis */}
          <div className="space-y-6">
            {/* Historical EBITDA Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden mb-6">
              {/* Header */}
              <div className="bg-white px-8 py-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">
                        Analyse du BAIIA - 5 derniers exercices
                      </h2>
                      <p className="text-sm text-slate-600">
                        Analysez le BAIIA sur 5 exercices et effectuez les ajustements nécessaires
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={addAdjustment}
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Ajouter un ajustement
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto bg-white">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm w-2/5">Métrique</th>
                      {years.map((year) => (
                        <th
                          key={year.year}
                          className={cn(
                            "px-4 py-4 text-center font-semibold text-slate-900 text-sm",
                          )}
                        >
                          {year.year}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Revenus Row - Read Only */}
                    <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>Revenus</span>
                            <span className="text-xs font-normal text-slate-500">(États des résultats)</span>
                          </div>
                        </td>
                        {years.map((year) => (
                          <td
                            key={`revenue-${year.year}`}
                            className={cn(
                              "px-4 py-3 text-center",
                            )}
                          >
                            <span className="font-semibold text-slate-900 text-sm">
                              {formatCurrency(getRevenueForYear(year.year))}
                            </span>
                          </td>
                        ))}
                      </tr>

                      {/* Empty Row */}
                      <tr className="border-b border-slate-200">
                        <td className="px-6 py-2"></td>
                        {years.map((year) => (
                          <td key={`empty-${year.year}`} className="px-4 py-2"></td>
                        ))}
                      </tr>

                      {/* BAIIA Row - Read Only */}
                      <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>BAIIA</span>
                            <span className="text-xs font-normal text-slate-500">(États des résultats)</span>
                          </div>
                        </td>
                        {years.map((year) => (
                          <td
                            key={`ebitda-${year.year}`}
                            className={cn(
                              "px-4 py-3 text-center",
                            )}
                          >
                            <span className="font-semibold text-slate-900 text-sm">
                              {formatCurrency(year.ebitda)}
                            </span>
                          </td>
                        ))}
                      </tr>

                      {/* +/- Ajustements - Visual separator row */}
                      <tr className="border-b border-slate-200">
                        <td className="px-6 py-3 text-slate-600 italic">
                          +/- Ajustements
                        </td>
                        {years.map((year) => (
                          <td key={`adjustments-label-${year.year}`} className="px-4 py-3"></td>
                        ))}
                      </tr>

                      {/* Adjustment Rows - One row per adjustment */}
                      {adjustments.map((adjustment) => {
                        return (
                          <tr key={adjustment.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-3 text-slate-900">
                              <div className="flex items-center gap-2">
                                <span>{adjustment.name || "Ajustement"}</span>
                                <button
                                  onClick={() => openAdjustmentModal(adjustment.id)}
                                  className="p-1 rounded hover:bg-slate-200 transition-colors"
                                  title="Modifier le nom de l'ajustement"
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                            {years.map((year) => {
                              const yearHasNote = adjustmentNotes[adjustment.id]?.[year.year] && adjustmentNotes[adjustment.id][year.year].trim().length > 0
                              return (
                                <td
                                  key={`adj-${adjustment.id}-${year.year}`}
                                  className={cn(
                                    "px-4 py-3 text-center",
                                  )}
                                >
                                  <div className="flex items-center gap-2 justify-center">
                                    <span className="text-sm text-slate-900">
                                      {formatCurrency(adjustment.amounts[year.year] || 0)}
                                    </span>
                                    <button
                                      onClick={() => openAdjustmentModal(adjustment.id, year.year)}
                                      className={cn(
                                        "p-1 rounded hover:bg-slate-200 transition-colors relative",
                                        yearHasNote && "text-blue-600"
                                      )}
                                      title={yearHasNote ? `Modifier le montant pour ${year.year} et la note` : `Modifier le montant pour ${year.year} et ajouter une note`}
                                    >
                                      <Settings className="w-3.5 h-3.5" />
                                      {yearHasNote && (
                                        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                          !
                                        </span>
                                      )}
                                    </button>
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}


                      {/* BAIIA ajusté Row */}
                      <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-semibold text-slate-900">BAIIA ajusté</td>
                        {years.map((year) => (
                          <td
                            key={`adjusted-${year.year}`}
                            className={cn(
                              "px-4 py-3 text-center",
                            )}
                          >
                            <span className="font-semibold text-slate-900 text-sm">
                              {formatCurrency(year.adjustedEBITDA)}
                            </span>
                          </td>
                        ))}
                      </tr>

                      {/* BAIIA ajusté en % des revenus Row */}
                      <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 text-slate-600 italic">
                          BAIIA ajusté en % des revenus
                        </td>
                        {years.map((year) => {
                          const revenue = getRevenueForYear(year.year)
                          const marginPercent = revenue > 0 ? (year.adjustedEBITDA / revenue) * 100 : 0
                          return (
                            <td
                              key={`margin-${year.year}`}
                              className={cn(
                                "px-4 py-3 text-center"
                              )}
                            >
                              <span className="text-slate-900 text-sm">
                                {marginPercent.toFixed(1)}%
                              </span>
                            </td>
                          )
                        })}
                      </tr>

                      {/* Pondération Row */}
                      <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-semibold text-slate-900">Pondération</td>
                        {years.map((year, index) => {
                          const hasNote = weightNotes[year.year] && weightNotes[year.year].trim().length > 0
                          return (
                            <td
                              key={`weight-${year.year}`}
                              className={cn(
                                "px-4 py-3 text-center",
                              )}
                            >
                              <div className="flex items-center gap-2 justify-center">
                                <span className="text-sm font-semibold text-slate-900">
                                  {(year.weight * 100).toFixed(0)}%
                                </span>
                                <button
                                  onClick={() => openWeightModal(index)}
                                  className={cn(
                                    "p-1 rounded hover:bg-slate-200 transition-colors relative",
                                    hasNote && "text-blue-600"
                                  )}
                                  title={hasNote ? "Modifier la pondération et la note" : "Modifier la pondération et ajouter une note"}
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                  {hasNote && (
                                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                      !
                                    </span>
                                  )}
                                </button>
                              </div>
                            </td>
                          )
                        })}
                      </tr>

                    </tbody>
                  </table>
                </div>

                {totalWeight !== 1 && representativeYears.length > 0 && (
                  <div className="p-6">
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-amber-800">
                          <p className="font-semibold mb-1">Pondération totale: {(totalWeight * 100).toFixed(0)}%</p>
                          <p>
                            La somme des pondérations des années représentatives devrait être égale à 100%. Ajustez les pondérations pour normaliser.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Dark Section between cards */}
      <div className="w-full bg-slate-900 pt-12 pb-40">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="flex items-start gap-3">
            <div className="w-2 flex-shrink-0"></div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h3 className="text-2xl font-normal text-white mb-3">Détermination de la fourchette du BAIIA</h3>
                  <p className="text-base text-slate-300 leading-relaxed max-w-4xl">
                    Analysez les différentes moyennes et définissez votre fourchette de BAIIA ajusté pour déterminer la valeur d'entreprise avec la méthode des multiples.
                  </p>
                </div>
                <div className="flex items-center gap-4 ml-8">
                  <div className="text-right">
                    <div className="text-sm text-slate-400 mb-1">BAIIA moyen</div>
                    <div className="text-3xl font-semibold text-white">{formatCurrency((lowEBITDARange + highEBITDARange) / 2)}</div>
                  </div>
                </div>
              </div>
              
              {/* Top 3 Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                  <div className="text-xs text-slate-400 mb-1">Moyenne pondérée</div>
                  <div className="text-lg font-semibold text-white mb-1">BAIIA ajusté</div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-500">{formatCurrency(weightedAverageEBITDA)}</span>
                    <span className="text-xs text-slate-400">pondérée</span>
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                  <div className="text-xs text-slate-400 mb-1">Moyenne 3 ans</div>
                  <div className="text-lg font-semibold text-white mb-1">BAIIA ajusté</div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-500">{formatCurrency(average3Years)}</span>
                    <span className="text-xs text-slate-400">3 dernières années</span>
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                  <div className="text-xs text-slate-400 mb-1">Moyenne 5 ans</div>
                  <div className="text-lg font-semibold text-white mb-1">BAIIA ajusté</div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-500">{formatCurrency(average5Years)}</span>
                    <span className="text-xs text-slate-400">5 dernières années</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BAIIA Range Determination Card - Overlaps dark section */}
      <div className="relative -mt-40 mb-12">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
              {/* Header */}
              <div className="bg-white px-8 py-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">
                        Détermination de la fourchette du BAIIA
                      </h2>
                      <p className="text-sm text-slate-600">
                        Analysez les différentes moyennes et définissez votre fourchette de BAIIA ajusté
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">

                {/* Fourchette du BAIIA ajusté */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-slate-300">
                        <th className="text-left py-4 px-4 text-sm font-semibold text-slate-900 min-w-[180px]">Métrique</th>
                        <th className="text-center py-4 px-4 text-sm font-semibold text-slate-900 min-w-[160px]">Bas</th>
                        <th className="text-center py-4 px-4 text-sm font-semibold text-slate-900 min-w-[160px]">Haut</th>
                        <th className="text-center py-4 px-4 text-sm font-semibold text-slate-900 min-w-[160px]">Moyen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* BAIIA ajusté sélectionné */}
                      <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-4 font-semibold text-slate-900">BAIIA ajusté sélectionné</td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <span className="text-sm font-semibold text-slate-900">
                              {formatCurrency(lowEBITDARange)}
                            </span>
                            <button
                              onClick={() => openEbitdaRangeModal("low")}
                              className={cn(
                                "p-1 rounded hover:bg-slate-200 transition-colors relative",
                                ebitdaRangeNotes["low"] && ebitdaRangeNotes["low"].trim().length > 0 && "text-blue-600"
                              )}
                              title={ebitdaRangeNotes["low"] && ebitdaRangeNotes["low"].trim().length > 0 ? "Modifier la fourchette basse et la note" : "Modifier la fourchette basse et ajouter une note"}
                            >
                              <Settings className="w-3.5 h-3.5" />
                              {ebitdaRangeNotes["low"] && ebitdaRangeNotes["low"].trim().length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                  !
                                </span>
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <span className="text-sm font-semibold text-slate-900">
                              {formatCurrency(highEBITDARange)}
                            </span>
                            <button
                              onClick={() => openEbitdaRangeModal("high")}
                              className={cn(
                                "p-1 rounded hover:bg-slate-200 transition-colors relative",
                                ebitdaRangeNotes["high"] && ebitdaRangeNotes["high"].trim().length > 0 && "text-blue-600"
                              )}
                              title={ebitdaRangeNotes["high"] && ebitdaRangeNotes["high"].trim().length > 0 ? "Modifier la fourchette haute et la note" : "Modifier la fourchette haute et ajouter une note"}
                            >
                              <Settings className="w-3.5 h-3.5" />
                              {ebitdaRangeNotes["high"] && ebitdaRangeNotes["high"].trim().length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                  !
                                </span>
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="font-semibold text-slate-900 text-sm">
                            {formatCurrency((lowEBITDARange + highEBITDARange) / 2)}
                          </span>
                        </td>
                      </tr>

                      {/* Multiple */}
                      <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-4 font-semibold text-slate-900">Multiple</td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <span className="text-sm font-semibold text-slate-900">
                              {lowMultiple.toFixed(1)}x
                            </span>
                            <button
                              onClick={() => openMultipleModal("low")}
                              className={cn(
                                "p-1 rounded hover:bg-slate-200 transition-colors relative",
                                multipleNotes["low"] && multipleNotes["low"].trim().length > 0 && "text-blue-600"
                              )}
                              title={multipleNotes["low"] && multipleNotes["low"].trim().length > 0 ? "Modifier le multiple bas et la note" : "Modifier le multiple bas et ajouter une note"}
                            >
                              <Settings className="w-3.5 h-3.5" />
                              {multipleNotes["low"] && multipleNotes["low"].trim().length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                  !
                                </span>
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <span className="text-sm font-semibold text-slate-900">
                              {highMultiple.toFixed(1)}x
                            </span>
                            <button
                              onClick={() => openMultipleModal("high")}
                              className={cn(
                                "p-1 rounded hover:bg-slate-200 transition-colors relative",
                                multipleNotes["high"] && multipleNotes["high"].trim().length > 0 && "text-blue-600"
                              )}
                              title={multipleNotes["high"] && multipleNotes["high"].trim().length > 0 ? "Modifier le multiple haut et la note" : "Modifier le multiple haut et ajouter une note"}
                            >
                              <Settings className="w-3.5 h-3.5" />
                              {multipleNotes["high"] && multipleNotes["high"].trim().length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                  !
                                </span>
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="font-semibold text-slate-900 text-sm">
                            {((lowMultiple + highMultiple) / 2).toFixed(2)}x
                          </span>
                        </td>
                      </tr>

                      {/* Valeur d'entreprise */}
                      <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-4 font-semibold text-slate-900">Valeur d'entreprise</td>
                        <td className="py-4 px-4 text-center">
                          <span className="font-semibold text-slate-900 text-sm">
                            {formatCurrency(lowEBITDARange * lowMultiple)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="font-semibold text-slate-900 text-sm">
                            {formatCurrency(highEBITDARange * highMultiple)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="font-semibold text-slate-900 text-sm">
                            {formatCurrency((lowEBITDARange * lowMultiple + highEBITDARange * highMultiple) / 2)}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Graphique d'évolution de la valeur d'entreprise */}
                <div className="bg-white rounded-lg p-6 border border-slate-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-slate-800">
                      <DollarSign className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Évolution de la valeur d'entreprise</h3>
                      <p className="text-xs text-slate-500">Visualisation de la valeur d'entreprise selon le multiple appliqué</p>
                    </div>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={enterpriseValueChartData}>
                        <defs>
                          <linearGradient id="colorEnterpriseValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#475569" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#475569" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="multiple" 
                          stroke="#64748b"
                        />
                        <YAxis 
                          stroke="#64748b"
                          tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1e293b",
                            border: "1px solid #334155",
                            borderRadius: "8px",
                            color: "#f1f5f9",
                            fontSize: "12px",
                          }}
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label) => `Multiple: ${label}x`}
                        />
                        <Area
                          type="monotone"
                          dataKey="lowEV"
                          stroke="#94a3b8"
                          strokeWidth={2}
                          fillOpacity={0}
                          name="Fourchette basse"
                          strokeDasharray="5 5"
                        />
                        <Area
                          type="monotone"
                          dataKey="highEV"
                          stroke="#94a3b8"
                          strokeWidth={2}
                          fillOpacity={0}
                          name="Fourchette haute"
                          strokeDasharray="5 5"
                        />
                        <Area
                          type="monotone"
                          dataKey="enterpriseValue"
                          stroke="#475569"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorEnterpriseValue)"
                          name="Valeur moyenne"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Légende des points clés */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-slate-600"></div>
                      <span className="text-xs text-slate-600">Valeur moyenne: <span className="font-semibold text-slate-900">{formatCurrency((lowEBITDARange * (lowMultiple + highMultiple) / 2 + highEBITDARange * (lowMultiple + highMultiple) / 2) / 2)}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-slate-400 border-2 border-dashed"></div>
                      <span className="text-xs text-slate-600">Fourchette: <span className="font-semibold text-slate-900">{formatCurrency(lowEBITDARange * lowMultiple)}</span> - <span className="font-semibold text-slate-900">{formatCurrency(highEBITDARange * highMultiple)}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-slate-800"></div>
                      <span className="text-xs text-slate-600">Multiple: <span className="font-semibold text-slate-900">{lowMultiple.toFixed(1)}x</span> - <span className="font-semibold text-slate-900">{highMultiple.toFixed(1)}x</span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weight Modal */}
      <Dialog open={weightModalOpen} onOpenChange={setWeightModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Modifier la pondération {editingWeightIndex !== null && years[editingWeightIndex] ? `- ${years[editingWeightIndex].year}` : ""}
            </DialogTitle>
            <DialogDescription>
              Modifiez la pondération et ajoutez une note pour expliquer votre choix.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Weight Input */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                Pondération
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={weightModalValue}
                  onChange={(e) => setWeightModalValue(Math.max(0, Math.min(100, Number(e.target.value))))}
                  className="w-32 text-center font-mono border-slate-300 focus:border-slate-500"
                />
                <span className="text-sm text-slate-600">
                  %
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                La pondération doit être entre 0 et 100%. La somme des pondérations des années représentatives devrait être égale à 100%.
              </p>
            </div>

            {/* Note Input */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                Note
              </label>
              <Textarea
                value={weightNote}
                onChange={(e) => setWeightNote(e.target.value)}
                placeholder="Ajoutez une note pour expliquer pourquoi cette année a cette pondération..."
                className="min-h-[100px] border-slate-300 focus:border-slate-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Documentez votre raisonnement pour cette pondération.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setWeightModalOpen(false)
                setEditingWeightIndex(null)
                setWeightModalValue(0)
                setWeightNote("")
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={saveWeightAndNote}
              disabled={weightModalValue < 0 || weightModalValue > 100}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjustment Modal */}
      <Dialog open={adjustmentModalOpen} onOpenChange={setAdjustmentModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Modifier l'ajustement {editingAdjustmentYear !== null ? `- ${editingAdjustmentYear}` : ""}
            </DialogTitle>
            <DialogDescription>
              {editingAdjustmentYear !== null
                ? `Modifiez le montant pour l'année ${editingAdjustmentYear} et ajoutez une note.`
                : "Modifiez le nom de l'ajustement."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Adjustment Name Input - Always visible */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                Nom de l'ajustement
              </label>
              <Input
                type="text"
                value={adjustmentModalName}
                onChange={(e) => setAdjustmentModalName(e.target.value)}
                placeholder="Nom de l'ajustement"
                className="border-slate-300 focus:border-slate-500"
              />
            </div>

            {/* Amount and Note - Only shown when editing a specific year */}
            {editingAdjustmentYear !== null && (
              <>
                {/* Amount for specific year */}
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">
                    Montant pour {editingAdjustmentYear}
                  </label>
                  <Input
                    type="text"
                    value={
                      editingInput === `modal-${editingAdjustmentId}-${editingAdjustmentYear}`
                        ? (adjustmentModalAmounts[editingAdjustmentYear] || 0).toString()
                        : adjustmentModalAmounts[editingAdjustmentYear] || adjustmentModalAmounts[editingAdjustmentYear] === 0
                        ? formatCurrency(adjustmentModalAmounts[editingAdjustmentYear])
                        : ""
                    }
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/[^\d-]/g, "")
                      const numValue = rawValue === "" || rawValue === "-" ? 0 : Number(rawValue)
                      setAdjustmentModalAmounts((prev) => ({
                        ...prev,
                        [editingAdjustmentYear]: numValue,
                      }))
                    }}
                    onFocus={(e) => {
                      setEditingInput(`modal-${editingAdjustmentId}-${editingAdjustmentYear}`)
                      const value = adjustmentModalAmounts[editingAdjustmentYear] || 0
                      e.target.value = value.toString()
                    }}
                    onBlur={() => {
                      setEditingInput(null)
                    }}
                    className="w-full text-center font-mono border-slate-300 focus:border-slate-500"
                    placeholder="$0"
                  />
                </div>

                {/* Note Input - Only for specific year */}
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">
                    Note pour {editingAdjustmentYear}
                  </label>
                  <Textarea
                    value={adjustmentNote}
                    onChange={(e) => setAdjustmentNote(e.target.value)}
                    placeholder={`Ajoutez une note pour expliquer cet ajustement pour ${editingAdjustmentYear}...`}
                    className="min-h-[100px] border-slate-300 focus:border-slate-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Documentez votre raisonnement pour cet ajustement pour cette année.
                  </p>
                </div>
              </>
            )}

          </div>

          <DialogFooter className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => {
                if (editingAdjustmentId) {
                  removeAdjustment(editingAdjustmentId)
                }
                setAdjustmentModalOpen(false)
                setEditingAdjustmentId(null)
                setEditingAdjustmentYear(null)
                setAdjustmentModalName("")
                setAdjustmentModalAmounts({})
                setAdjustmentNote("")
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Minus className="w-4 h-4 mr-2" />
              Supprimer
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setAdjustmentModalOpen(false)
                  setEditingAdjustmentId(null)
                  setEditingAdjustmentYear(null)
                  setAdjustmentModalName("")
                  setAdjustmentModalAmounts({})
                  setAdjustmentNote("")
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={saveAdjustmentAndNote}
                disabled={!adjustmentModalName.trim()}
              >
                Enregistrer
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BAIIA Range Modal */}
      <Dialog open={ebitdaRangeModalOpen} onOpenChange={setEbitdaRangeModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Modifier la fourchette {editingEbitdaRangeType === "low" ? "basse" : "haute"} du BAIIA ajusté
            </DialogTitle>
            <DialogDescription>
              Modifiez la valeur de la fourchette {editingEbitdaRangeType === "low" ? "basse" : "haute"} et ajoutez une note pour expliquer votre choix.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Value Input */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                Fourchette {editingEbitdaRangeType === "low" ? "basse" : "haute"}
              </label>
              <Input
                type="text"
                value={
                  editingInput === `ebitda-range-${editingEbitdaRangeType}`
                    ? ebitdaRangeModalValue.toString()
                    : formatCurrency(ebitdaRangeModalValue)
                }
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/[^\d-]/g, "")
                  const numValue = rawValue === "" || rawValue === "-" ? 0 : Number(rawValue)
                  setEbitdaRangeModalValue(numValue)
                }}
                onFocus={(e) => {
                  setEditingInput(`ebitda-range-${editingEbitdaRangeType}`)
                  e.target.value = ebitdaRangeModalValue.toString()
                }}
                onBlur={() => {
                  setEditingInput(null)
                }}
                className="w-full text-center font-mono border-slate-300 focus:border-slate-500"
                placeholder="$0"
              />
              <p className="text-xs text-slate-500 mt-1">
                Définissez la fourchette {editingEbitdaRangeType === "low" ? "basse" : "haute"} du BAIIA ajusté.
              </p>
            </div>

            {/* Note Input */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                Note
              </label>
              <Textarea
                value={ebitdaRangeNote}
                onChange={(e) => setEbitdaRangeNote(e.target.value)}
                placeholder={`Ajoutez une note pour expliquer pourquoi vous avez choisi cette fourchette ${editingEbitdaRangeType === "low" ? "basse" : "haute"}...`}
                className="min-h-[100px] border-slate-300 focus:border-slate-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Documentez votre raisonnement pour cette fourchette.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEbitdaRangeModalOpen(false)
                setEditingEbitdaRangeType(null)
                setEbitdaRangeModalValue(0)
                setEbitdaRangeNote("")
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={saveEbitdaRangeAndNote}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Multiple Modal */}
      <Dialog open={multipleModalOpen} onOpenChange={setMultipleModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Modifier le multiple {editingMultipleType === "low" ? "bas" : "haut"}
            </DialogTitle>
            <DialogDescription>
              Modifiez la valeur du multiple {editingMultipleType === "low" ? "bas" : "haut"} et ajoutez une note pour expliquer votre choix.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Value Input */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                Multiple {editingMultipleType === "low" ? "bas" : "haut"}
              </label>
              <Input
                type="number"
                step="0.1"
                value={multipleModalValue}
                onChange={(e) => {
                  const numValue = e.target.value === "" ? 0 : Number(e.target.value)
                  setMultipleModalValue(numValue)
                }}
                className="w-full text-center font-mono border-slate-300 focus:border-slate-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Définissez le multiple {editingMultipleType === "low" ? "bas" : "haut"} de valorisation.
              </p>
            </div>

            {/* Note Input */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                Note
              </label>
              <Textarea
                value={multipleNote}
                onChange={(e) => setMultipleNote(e.target.value)}
                placeholder={`Ajoutez une note pour expliquer pourquoi vous avez choisi ce multiple ${editingMultipleType === "low" ? "bas" : "haut"}...`}
                className="min-h-[100px] border-slate-300 focus:border-slate-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Documentez votre raisonnement pour ce multiple.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMultipleModalOpen(false)
                setEditingMultipleType(null)
                setMultipleModalValue(0)
                setMultipleNote("")
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={saveMultipleAndNote}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
