"use client"

import { useState } from "react"
import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronRight, ChevronDown, StickyNote } from "lucide-react"
import { NoteModal } from "@/components/note-modal"
import { getNoteByRowId } from "@/lib/notes-storage"

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
    if (comparisonType === "lastMonth") {
      // For "lastMonth", use the base prior value
      return basePrior
    } else if (comparisonType === "pastMonth") {
      // For "pastMonth", use a slightly different value
      return Math.round(basePrior * 0.92)
    } else if (comparisonType === "budget" && selectedBudgetId) {
      // For "budget", use a budget value (typically higher than actual)
      return Math.round(basePrior * 1.15)
    }
    return basePrior
  }

  // Helper function to get balance accounts for a given account type
  const getBalanceAccounts = (accountId: string, current: number, prior: number): BalanceAccount[] => {
    switch (accountId) {
      case "land_buildings":
        return [
          { accountNumber: "1500", accountName: "Terrains", amount: Math.round(current * 0.4), priorAmount: Math.round(prior * 0.4), proportion: 0.4 },
          { accountNumber: "1510", accountName: "Constructions", amount: Math.round(current * 0.6), priorAmount: Math.round(prior * 0.6), proportion: 0.6 },
        ]
      case "equipment":
        return [
          { accountNumber: "1520", accountName: "Machinerie", amount: Math.round(current * 0.5), priorAmount: Math.round(prior * 0.5), proportion: 0.5 },
          { accountNumber: "1530", accountName: "Équipement informatique", amount: Math.round(current * 0.3), priorAmount: Math.round(prior * 0.3), proportion: 0.3 },
          { accountNumber: "1540", accountName: "Mobilier et installations", amount: Math.round(current * 0.2), priorAmount: Math.round(prior * 0.2), proportion: 0.2 },
        ]
      case "vehicles":
        return [
          { accountNumber: "1550", accountName: "Véhicules de service", amount: Math.round(current * 0.7), priorAmount: Math.round(prior * 0.7), proportion: 0.7 },
          { accountNumber: "1560", accountName: "Véhicules de livraison", amount: Math.round(current * 0.3), priorAmount: Math.round(prior * 0.3), proportion: 0.3 },
        ]
      case "other_fixed":
        return [
          { accountNumber: "1570", accountName: "Outillage", amount: Math.round(current * 0.6), priorAmount: Math.round(prior * 0.6), proportion: 0.6 },
          { accountNumber: "1580", accountName: "Autres équipements", amount: Math.round(current * 0.4), priorAmount: Math.round(prior * 0.4), proportion: 0.4 },
        ]
      case "patents":
        return [
          { accountNumber: "1600", accountName: "Brevets", amount: Math.round(current * 0.6), priorAmount: Math.round(prior * 0.6), proportion: 0.6 },
          { accountNumber: "1610", accountName: "Licences", amount: Math.round(current * 0.4), priorAmount: Math.round(prior * 0.4), proportion: 0.4 },
        ]
      case "software":
        return [
          { accountNumber: "1620", accountName: "Logiciels achetés", amount: Math.round(current * 0.5), priorAmount: Math.round(prior * 0.5), proportion: 0.5 },
          { accountNumber: "1630", accountName: "Développement interne", amount: Math.round(current * 0.5), priorAmount: Math.round(prior * 0.5), proportion: 0.5 },
        ]
      case "goodwill":
        return [
          { accountNumber: "1640", accountName: "Fonds commercial", amount: current, priorAmount: prior, proportion: 1.0 },
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
    const currentFixedAssets = 960000
    const priorFixedAssets = 900000
    const currentIntangibleAssets = 300000
    const priorIntangibleAssets = 276000
    const currentOtherNonCurrent = 180000
    const priorOtherNonCurrent = 144000
    const totalNonCurrentAssets = currentFixedAssets + currentIntangibleAssets + currentOtherNonCurrent
    const priorTotalNonCurrentAssets = priorFixedAssets + priorIntangibleAssets + priorOtherNonCurrent

    return [
      { label: "IMMOBILISATIONS CORPORELLES", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Terrains et constructions", current: 450000, prior: 420000, indent: true, trendValues: generateTrend(450000, 0.015), accountId: "land_buildings", rowId: "land_buildings", balanceAccounts: getBalanceAccounts("land_buildings", 450000, 420000) },
      { label: "Matériel et équipement", current: 350000, prior: 330000, indent: true, trendValues: generateTrend(350000, 0.025), accountId: "equipment", rowId: "equipment", balanceAccounts: getBalanceAccounts("equipment", 350000, 330000) },
      { label: "Véhicules", current: 100000, prior: 95000, indent: true, trendValues: generateTrend(100000, 0.02), accountId: "vehicles", rowId: "vehicles", balanceAccounts: getBalanceAccounts("vehicles", 100000, 95000) },
      { label: "Autres immobilisations corporelles", current: 60000, prior: 55000, indent: true, trendValues: generateTrend(60000, 0.02), accountId: "other_fixed", rowId: "other_fixed", balanceAccounts: getBalanceAccounts("other_fixed", 60000, 55000) },
      { label: "Total Immobilisations corporelles", current: currentFixedAssets, prior: priorFixedAssets, isBold: true, isSubtotal: true, trendValues: generateTrend(currentFixedAssets, 0.02), accountId: "fixed_assets" },
      { label: "", current: 0, prior: 0 },
      { label: "IMMOBILISATIONS INCORPORELLES", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Brevets et licences", current: 150000, prior: 138000, indent: true, trendValues: generateTrend(150000, 0.03), accountId: "patents", rowId: "patents", balanceAccounts: getBalanceAccounts("patents", 150000, 138000) },
      { label: "Logiciels et développement", current: 100000, prior: 92000, indent: true, trendValues: generateTrend(100000, 0.035), accountId: "software", rowId: "software", balanceAccounts: getBalanceAccounts("software", 100000, 92000) },
      { label: "Fonds commercial", current: 50000, prior: 46000, indent: true, trendValues: generateTrend(50000, 0.025), accountId: "goodwill", rowId: "goodwill", balanceAccounts: getBalanceAccounts("goodwill", 50000, 46000) },
      { label: "Total Immobilisations incorporelles", current: currentIntangibleAssets, prior: priorIntangibleAssets, isBold: true, isSubtotal: true, trendValues: generateTrend(currentIntangibleAssets, 0.03), accountId: "intangible_assets" },
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
    const currentFixedAssets = 960000
    const priorFixedAssets = 900000
    const currentIntangibleAssets = 300000
    const priorIntangibleAssets = 276000
    const currentOtherNonCurrent = 180000
    const priorOtherNonCurrent = 144000
    const totalNonCurrentAssets = currentFixedAssets + currentIntangibleAssets + currentOtherNonCurrent
    const priorTotalNonCurrentAssets = priorFixedAssets + priorIntangibleAssets + priorOtherNonCurrent

    return [
      { label: "IMMOBILISATIONS CORPORELLES", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Terrains et constructions", current: 450000, prior: 420000, indent: true, trendValues: generateTrend(450000, 0.015), accountId: "land_buildings", rowId: "land_buildings", balanceAccounts: getBalanceAccounts("land_buildings", 450000, 420000) },
      { label: "Matériel et équipement", current: 350000, prior: 330000, indent: true, trendValues: generateTrend(350000, 0.025), accountId: "equipment", rowId: "equipment", balanceAccounts: getBalanceAccounts("equipment", 350000, 330000) },
      { label: "Véhicules", current: 100000, prior: 95000, indent: true, trendValues: generateTrend(100000, 0.02), accountId: "vehicles", rowId: "vehicles", balanceAccounts: getBalanceAccounts("vehicles", 100000, 95000) },
      { label: "Autres immobilisations corporelles", current: 60000, prior: 55000, indent: true, trendValues: generateTrend(60000, 0.02), accountId: "other_fixed", rowId: "other_fixed", balanceAccounts: getBalanceAccounts("other_fixed", 60000, 55000) },
      { label: "Total Immobilisations corporelles", current: currentFixedAssets, prior: priorFixedAssets, isBold: true, isSubtotal: true, trendValues: generateTrend(currentFixedAssets, 0.02), accountId: "fixed_assets" },
      { label: "", current: 0, prior: 0 },
      { label: "IMMOBILISATIONS INCORPORELLES", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Brevets et licences", current: 150000, prior: 138000, indent: true, trendValues: generateTrend(150000, 0.03), accountId: "patents", rowId: "patents", balanceAccounts: getBalanceAccounts("patents", 150000, 138000) },
      { label: "Logiciels et développement", current: 100000, prior: 92000, indent: true, trendValues: generateTrend(100000, 0.035), accountId: "software", rowId: "software", balanceAccounts: getBalanceAccounts("software", 100000, 92000) },
      { label: "Fonds commercial", current: 50000, prior: 46000, indent: true, trendValues: generateTrend(50000, 0.025), accountId: "goodwill", rowId: "goodwill", balanceAccounts: getBalanceAccounts("goodwill", 50000, 46000) },
      { label: "Total Immobilisations incorporelles", current: currentIntangibleAssets, prior: priorIntangibleAssets, isBold: true, isSubtotal: true, trendValues: generateTrend(currentIntangibleAssets, 0.03), accountId: "intangible_assets" },
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
    const currentFixedAssets = 2880000
    const priorFixedAssets = 2700000
    const currentIntangibleAssets = 900000
    const priorIntangibleAssets = 828000
    const currentOtherNonCurrent = 540000
    const priorOtherNonCurrent = 432000
    const totalNonCurrentAssets = currentFixedAssets + currentIntangibleAssets + currentOtherNonCurrent
    const priorTotalNonCurrentAssets = priorFixedAssets + priorIntangibleAssets + priorOtherNonCurrent

    return [
      { label: "IMMOBILISATIONS CORPORELLES", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Terrains et constructions", current: 1350000, prior: 1260000, indent: true, trendValues: generateTrend(1350000, 0.02), accountId: "land_buildings" },
      { label: "Matériel et équipement", current: 1050000, prior: 990000, indent: true, trendValues: generateTrend(1050000, 0.03), accountId: "equipment" },
      { label: "Véhicules", current: 300000, prior: 285000, indent: true, trendValues: generateTrend(300000, 0.025), accountId: "vehicles" },
      { label: "Autres immobilisations corporelles", current: 180000, prior: 165000, indent: true, trendValues: generateTrend(180000, 0.025), accountId: "other_fixed" },
      { label: "Total Immobilisations corporelles", current: currentFixedAssets, prior: priorFixedAssets, isBold: true, isSubtotal: true, trendValues: generateTrend(currentFixedAssets, 0.025), accountId: "fixed_assets" },
      { label: "", current: 0, prior: 0 },
      { label: "IMMOBILISATIONS INCORPORELLES", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Brevets et licences", current: 450000, prior: 414000, indent: true, trendValues: generateTrend(450000, 0.035), accountId: "patents" },
      { label: "Logiciels et développement", current: 300000, prior: 276000, indent: true, trendValues: generateTrend(300000, 0.04), accountId: "software" },
      { label: "Fonds commercial", current: 150000, prior: 138000, indent: true, trendValues: generateTrend(150000, 0.03), accountId: "goodwill" },
      { label: "Total Immobilisations incorporelles", current: currentIntangibleAssets, prior: priorIntangibleAssets, isBold: true, isSubtotal: true, trendValues: generateTrend(currentIntangibleAssets, 0.035), accountId: "intangible_assets" },
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
    const currentFixedAssets = 11520000
    const priorFixedAssets = 10800000
    const currentIntangibleAssets = 3600000
    const priorIntangibleAssets = 3312000
    const currentOtherNonCurrent = 2160000
    const priorOtherNonCurrent = 1728000
    const totalNonCurrentAssets = currentFixedAssets + currentIntangibleAssets + currentOtherNonCurrent
    const priorTotalNonCurrentAssets = priorFixedAssets + priorIntangibleAssets + priorOtherNonCurrent

    return [
      { label: "IMMOBILISATIONS CORPORELLES", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Terrains et constructions", current: 5400000, prior: 5040000, indent: true, trendValues: generateTrend(5400000, 0.035), accountId: "land_buildings" },
      { label: "Matériel et équipement", current: 4200000, prior: 3960000, indent: true, trendValues: generateTrend(4200000, 0.045), accountId: "equipment" },
      { label: "Véhicules", current: 1200000, prior: 1140000, indent: true, trendValues: generateTrend(1200000, 0.04), accountId: "vehicles" },
      { label: "Autres immobilisations corporelles", current: 720000, prior: 660000, indent: true, trendValues: generateTrend(720000, 0.04), accountId: "other_fixed" },
      { label: "Total Immobilisations corporelles", current: currentFixedAssets, prior: priorFixedAssets, isBold: true, isSubtotal: true, trendValues: generateTrend(currentFixedAssets, 0.04), accountId: "fixed_assets" },
      { label: "", current: 0, prior: 0 },
      { label: "IMMOBILISATIONS INCORPORELLES", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Brevets et licences", current: 1800000, prior: 1656000, indent: true, trendValues: generateTrend(1800000, 0.05), accountId: "patents" },
      { label: "Logiciels et développement", current: 1200000, prior: 1104000, indent: true, trendValues: generateTrend(1200000, 0.055), accountId: "software" },
      { label: "Fonds commercial", current: 600000, prior: 552000, indent: true, trendValues: generateTrend(600000, 0.045), accountId: "goodwill" },
      { label: "Total Immobilisations incorporelles", current: currentIntangibleAssets, prior: priorIntangibleAssets, isBold: true, isSubtotal: true, trendValues: generateTrend(currentIntangibleAssets, 0.05), accountId: "intangible_assets" },
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
      const currentFixedAssets = 960000
      const priorFixedAssets = 900000
      const currentIntangibleAssets = 300000
      const priorIntangibleAssets = 276000
      const currentOtherNonCurrent = 180000
      const priorOtherNonCurrent = 144000
      const totalNonCurrentAssets = currentFixedAssets + currentIntangibleAssets + currentOtherNonCurrent
      const priorTotalNonCurrentAssets = priorFixedAssets + priorIntangibleAssets + priorOtherNonCurrent

      return [
        { label: "IMMOBILISATIONS CORPORELLES", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Terrains et constructions", current: 450000, prior: 420000, indent: true, accountId: "land_buildings", rowId: "land_buildings", balanceAccounts: getBalanceAccounts("land_buildings", 450000, 420000) },
        { label: "Matériel et équipement", current: 350000, prior: 330000, indent: true, accountId: "equipment", rowId: "equipment", balanceAccounts: getBalanceAccounts("equipment", 350000, 330000) },
        { label: "Véhicules", current: 100000, prior: 95000, indent: true, accountId: "vehicles", rowId: "vehicles", balanceAccounts: getBalanceAccounts("vehicles", 100000, 95000) },
        { label: "Autres immobilisations corporelles", current: 60000, prior: 55000, indent: true, accountId: "other_fixed", rowId: "other_fixed", balanceAccounts: getBalanceAccounts("other_fixed", 60000, 55000) },
        { label: "Total Immobilisations corporelles", current: currentFixedAssets, prior: priorFixedAssets, isBold: true, isSubtotal: true, accountId: "fixed_assets" },
        { label: "", current: 0, prior: 0 },
        { label: "IMMOBILISATIONS INCORPORELLES", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Brevets et licences", current: 150000, prior: 138000, indent: true, accountId: "patents", rowId: "patents", balanceAccounts: getBalanceAccounts("patents", 150000, 138000) },
        { label: "Logiciels et développement", current: 100000, prior: 92000, indent: true, accountId: "software", rowId: "software", balanceAccounts: getBalanceAccounts("software", 100000, 92000) },
        { label: "Fonds commercial", current: 50000, prior: 46000, indent: true, accountId: "goodwill", rowId: "goodwill", balanceAccounts: getBalanceAccounts("goodwill", 50000, 46000) },
        { label: "Total Immobilisations incorporelles", current: currentIntangibleAssets, prior: priorIntangibleAssets, isBold: true, isSubtotal: true, accountId: "intangible_assets" },
      ]
    } else if (period === "quarterly") {
      const currentRevenue = 825000
      const priorRevenue = 716000
      const currentFixedAssets = 2880000
      const priorFixedAssets = 2700000
      const currentIntangibleAssets = 900000
      const priorIntangibleAssets = 828000
      const currentOtherNonCurrent = 540000
      const priorOtherNonCurrent = 432000
      const totalNonCurrentAssets = currentFixedAssets + currentIntangibleAssets + currentOtherNonCurrent
      const priorTotalNonCurrentAssets = priorFixedAssets + priorIntangibleAssets + priorOtherNonCurrent

      return [
        { label: "IMMOBILISATIONS CORPORELLES", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Terrains et constructions", current: 1350000, prior: 1260000, indent: true, accountId: "land_buildings" },
        { label: "Matériel et équipement", current: 1050000, prior: 990000, indent: true, accountId: "equipment" },
        { label: "Véhicules", current: 300000, prior: 285000, indent: true, accountId: "vehicles" },
        { label: "Autres immobilisations corporelles", current: 180000, prior: 165000, indent: true, accountId: "other_fixed" },
        { label: "Total Immobilisations corporelles", current: currentFixedAssets, prior: priorFixedAssets, isBold: true, isSubtotal: true, accountId: "fixed_assets" },
        { label: "", current: 0, prior: 0 },
        { label: "IMMOBILISATIONS INCORPORELLES", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Brevets et licences", current: 450000, prior: 414000, indent: true, accountId: "patents" },
        { label: "Logiciels et développement", current: 300000, prior: 276000, indent: true, accountId: "software" },
        { label: "Fonds commercial", current: 150000, prior: 138000, indent: true, accountId: "goodwill" },
        { label: "Total Immobilisations incorporelles", current: currentIntangibleAssets, prior: priorIntangibleAssets, isBold: true, isSubtotal: true, accountId: "intangible_assets" },
      ]
    } else {
      const currentRevenue = 3300000
      const priorRevenue = 2864000
      const currentFixedAssets = 11520000
      const priorFixedAssets = 10800000
      const currentIntangibleAssets = 3600000
      const priorIntangibleAssets = 3312000
      const currentOtherNonCurrent = 2160000
      const priorOtherNonCurrent = 1728000
      const totalNonCurrentAssets = currentFixedAssets + currentIntangibleAssets + currentOtherNonCurrent
      const priorTotalNonCurrentAssets = priorFixedAssets + priorIntangibleAssets + priorOtherNonCurrent

      return [
        { label: "IMMOBILISATIONS CORPORELLES", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Terrains et constructions", current: 5400000, prior: 5040000, indent: true, accountId: "land_buildings" },
        { label: "Matériel et équipement", current: 4200000, prior: 3960000, indent: true, accountId: "equipment" },
        { label: "Véhicules", current: 1200000, prior: 1140000, indent: true, accountId: "vehicles" },
        { label: "Autres immobilisations corporelles", current: 720000, prior: 660000, indent: true, accountId: "other_fixed" },
        { label: "Total Immobilisations corporelles", current: currentFixedAssets, prior: priorFixedAssets, isBold: true, isSubtotal: true, accountId: "fixed_assets" },
        { label: "", current: 0, prior: 0 },
        { label: "IMMOBILISATIONS INCORPORELLES", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Brevets et licences", current: 1800000, prior: 1656000, indent: true, accountId: "patents" },
        { label: "Logiciels et développement", current: 1200000, prior: 1104000, indent: true, accountId: "software" },
        { label: "Fonds commercial", current: 600000, prior: 552000, indent: true, accountId: "goodwill" },
        { label: "Total Immobilisations incorporelles", current: currentIntangibleAssets, prior: priorIntangibleAssets, isBold: true, isSubtotal: true, accountId: "intangible_assets" },
      ]
    }
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
      // Book value mode: apply depreciation factor (typically 0.7-0.9)
      const transformed = rows.map((row) => {
        if (row.isSection || row.label === "" || !row.accountId) {
          return row // Keep sections and spacers as is
        }
        
        // Apply depreciation factor (varies by asset type)
        let depreciationFactor = 0.8 // Default
        if (row.accountId === "land_buildings") {
          depreciationFactor = 0.85 // Land/buildings depreciate slower
        } else if (row.accountId === "equipment" || row.accountId === "vehicles") {
          depreciationFactor = 0.65 // Equipment/vehicles depreciate faster
        } else if (row.accountId === "intangible_assets" || row.accountId === "patents" || row.accountId === "software") {
          depreciationFactor = 0.75 // Intangibles depreciate moderately
        } else if (row.accountId === "goodwill") {
          depreciationFactor = 0.9 // Goodwill depreciates very slowly
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

  // Helper function to calculate depreciation (typically 5-10% of fixed assets per year)
  const calculateDepreciation = (isPrior: boolean, trendIndex?: number): number => {
    const totalAssets = calculateTotalFixedAssets(isPrior, trendIndex)
    // Assume 8% annual depreciation rate
    return totalAssets * 0.08
  }

  // Helper function to calculate EBITDA (BAIIA)
  // Estimate as 20% of revenue (typical margin)
  const calculateEBITDA = (isPrior: boolean, trendIndex?: number): number => {
    const revenue = trendIndex !== undefined && totalRevenueRow?.trendValues
      ? totalRevenueRow.trendValues[trendIndex] || totalRevenueCurrent
      : (isPrior ? totalRevenuePrior : totalRevenueCurrent)
    return revenue * 0.20 // 20% EBITDA margin
  }

  // Helper function to calculate Operating Cash Flow (Flux de trésorerie reliés aux opérations)
  // OCF = EBITDA - Depreciation - Taxes + Working Capital Changes
  // Simplified: OCF = EBITDA - Depreciation (assuming no taxes and no WC changes for simplicity)
  const calculateOperatingCashFlow = (isPrior: boolean, trendIndex?: number): number => {
    const ebitda = calculateEBITDA(isPrior, trendIndex)
    const depreciation = calculateDepreciation(isPrior, trendIndex)
    // Simplified calculation
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
                  {getMonthLabels(12).map((label, idx) => (
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
                </>
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

