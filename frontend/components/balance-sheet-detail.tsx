"use client"

import { useState } from "react"
import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import { ChevronRight, ChevronDown, StickyNote } from "lucide-react"
import { NoteModal } from "@/components/note-modal"
import { getNoteByRowId } from "@/lib/notes-storage"

interface BalanceSheetDetailProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years"
  columnMode?: "variations" | "percentage" | "comparison"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  title?: string
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

export function BalanceSheetDetail({
  period,
  view,
  columnMode = "variations",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  title,
}: BalanceSheetDetailProps) {
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

  // Helper function to check if notes are allowed for this view
  const isNoteAllowed = (): boolean => {
    return view === "current" || view === "comparison" || view === "ytd" || view === "ddm"
  }

  const generateBalanceAccounts = (label: string, current: number, prior: number): BalanceAccount[] => {
    // Generate sample balance accounts based on the row label
    const accounts: BalanceAccount[] = []
    
    if (label.includes("Trésorerie et équivalents")) {
      accounts.push(
        { accountNumber: "1000", accountName: "Caisse", amount: Math.round(current * 0.1), priorAmount: Math.round(prior * 0.1), proportion: 0.1 },
        { accountNumber: "1010", accountName: "Comptes bancaires", amount: Math.round(current * 0.9), priorAmount: Math.round(prior * 0.9), proportion: 0.9 }
      )
    } else if (label.includes("Comptes clients")) {
      accounts.push(
        { accountNumber: "1200", accountName: "Clients - Comptes à recevoir", amount: Math.round(current * 0.8), priorAmount: Math.round(prior * 0.8), proportion: 0.8 },
        { accountNumber: "1210", accountName: "Clients - Factures à recevoir", amount: Math.round(current * 0.2), priorAmount: Math.round(prior * 0.2), proportion: 0.2 }
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
    } else if (label.includes("Immobilisations corporelles")) {
      accounts.push(
        { accountNumber: "1500", accountName: "Terrain", amount: Math.round(current * 0.2), priorAmount: Math.round(prior * 0.2), proportion: 0.2 },
        { accountNumber: "1510", accountName: "Bâtiments", amount: Math.round(current * 0.5), priorAmount: Math.round(prior * 0.5), proportion: 0.5 },
        { accountNumber: "1520", accountName: "Équipement", amount: Math.round(current * 0.3), priorAmount: Math.round(prior * 0.3), proportion: 0.3 }
      )
    } else if (label.includes("Immobilisations incorporelles")) {
      accounts.push(
        { accountNumber: "1600", accountName: "Brevets", amount: Math.round(current * 0.4), priorAmount: Math.round(prior * 0.4), proportion: 0.4 },
        { accountNumber: "1610", accountName: "Logiciels", amount: Math.round(current * 0.6), priorAmount: Math.round(prior * 0.6), proportion: 0.6 }
      )
    } else if (label.includes("Comptes fournisseurs")) {
      accounts.push(
        { accountNumber: "2000", accountName: "Fournisseurs - Comptes à payer", amount: Math.round(current * 0.7), priorAmount: Math.round(prior * 0.7), proportion: 0.7 },
        { accountNumber: "2010", accountName: "Fournisseurs - Factures à payer", amount: Math.round(current * 0.3), priorAmount: Math.round(prior * 0.3), proportion: 0.3 }
      )
    } else if (label.includes("Dettes à court terme")) {
      accounts.push(
        { accountNumber: "2100", accountName: "Emprunts bancaires - CT", amount: Math.round(current * 0.6), priorAmount: Math.round(prior * 0.6), proportion: 0.6 },
        { accountNumber: "2110", accountName: "Dettes fiscales", amount: Math.round(current * 0.4), priorAmount: Math.round(prior * 0.4), proportion: 0.4 }
      )
    } else if (label.includes("Dettes à long terme")) {
      accounts.push(
        { accountNumber: "2200", accountName: "Emprunts bancaires - LT", amount: Math.round(current * 0.7), priorAmount: Math.round(prior * 0.7), proportion: 0.7 },
        { accountNumber: "2210", accountName: "Obligations", amount: Math.round(current * 0.3), priorAmount: Math.round(prior * 0.3), proportion: 0.3 }
      )
    } else if (label.includes("Capital social")) {
      accounts.push(
        { accountNumber: "3000", accountName: "Capital-actions ordinaires", amount: Math.round(current * 0.8), priorAmount: Math.round(prior * 0.8), proportion: 0.8 },
        { accountNumber: "3010", accountName: "Capital-actions privilégiées", amount: Math.round(current * 0.2), priorAmount: Math.round(prior * 0.2), proportion: 0.2 }
      )
    }
    
    return accounts
  }

  // Helper function to generate trend data for 12 months
  const get12MonthsData = (): DetailRow[] => {
    const generateTrend = (base: number, growthRate: number = 0.02) => {
      return Array.from({ length: 12 }, (_, i) => {
        const monthIndex = 11 - i
        return Math.round(base * (1 + growthRate * monthIndex) * (0.95 + Math.random() * 0.1))
      })
    }

    const rows: DetailRow[] = [
      { label: "ACTIFS", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "ACTIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Trésorerie et équivalents", current: 200000, prior: 180000, indent: true, trendValues: generateTrend(200000, 0.025), rowId: "cash" },
      { label: "Comptes clients", current: 350000, prior: 300000, indent: true, trendValues: generateTrend(350000, 0.03), rowId: "receivables" },
      { label: "Stocks", current: 150000, prior: 130000, indent: true, trendValues: generateTrend(150000, 0.02), rowId: "inventory" },
      { label: "Autres actifs courants", current: 150000, prior: 140000, indent: true, trendValues: generateTrend(150000, 0.02), rowId: "other-current-assets" },
      { label: "Total Actifs courants", current: 850000, prior: 750000, isBold: true, isSubtotal: true, trendValues: generateTrend(850000, 0.025) },
      { label: "", current: 0, prior: 0 },
      { label: "Immobilisations corporelles", current: 800000, prior: 750000, trendValues: generateTrend(800000, 0.02), rowId: "fixed-assets" },
      { label: "Immobilisations incorporelles", current: 250000, prior: 230000, trendValues: generateTrend(250000, 0.02), rowId: "intangible-assets" },
      { label: "Autres actifs non courants", current: 150000, prior: 120000, trendValues: generateTrend(150000, 0.025) },
      { label: "Total Actifs", current: 2050000, prior: 1850000, isBold: true, isSubtotal: true, trendValues: generateTrend(2050000, 0.022) },
      { label: "", current: 0, prior: 0 },
      { label: "PASSIFS", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "PASSIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Comptes fournisseurs", current: 200000, prior: 180000, indent: true, trendValues: generateTrend(200000, 0.02), rowId: "payables" },
      { label: "Dettes à court terme", current: 150000, prior: 140000, indent: true, trendValues: generateTrend(150000, 0.02), rowId: "short-term-debt" },
      { label: "Autres passifs courants", current: 100000, prior: 100000, indent: true, trendValues: generateTrend(100000, 0) },
      { label: "Total Passifs courants", current: 450000, prior: 420000, isBold: true, isSubtotal: true, trendValues: generateTrend(450000, 0.018) },
      { label: "", current: 0, prior: 0 },
      { label: "Dettes à long terme", current: 450000, prior: 430000, trendValues: generateTrend(450000, 0.02), rowId: "long-term-debt" },
      { label: "Autres passifs non courants", current: 150000, prior: 150000, trendValues: generateTrend(150000, 0) },
      { label: "Total Passifs", current: 1050000, prior: 1000000, isBold: true, isSubtotal: true, trendValues: generateTrend(1050000, 0.019) },
      { label: "", current: 0, prior: 0 },
      { label: "CAPITAUX PROPRES", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Capital social", current: 600000, prior: 550000, indent: true, trendValues: generateTrend(600000, 0.025), rowId: "share-capital" },
      { label: "Bénéfices non répartis", current: 400000, prior: 300000, indent: true, trendValues: generateTrend(400000, 0.03) },
      { label: "Total Capitaux propres", current: 1000000, prior: 850000, isBold: true, isSubtotal: true, trendValues: generateTrend(1000000, 0.025) },
      { label: "", current: 0, prior: 0 },
      { label: "Total passifs et capitaux propres", current: 2050000, prior: 1850000, isBold: true, isSubtotal: true, trendValues: generateTrend(2050000, 0.022) },
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

  // Helper function to generate trend data for quarters
  const getQuartersData = (): DetailRow[] => {
    const generateTrend = (base: number, growthRate: number = 0.03) => {
      return Array.from({ length: 5 }, (_, i) => {
        const quarterIndex = 4 - i
        return Math.round(base * (1 + growthRate * quarterIndex) * (0.97 + Math.random() * 0.06))
      })
    }

    const rows: DetailRow[] = [
      { label: "ACTIFS", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "ACTIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Trésorerie et équivalents", current: 600000, prior: 540000, indent: true, trendValues: generateTrend(600000, 0.04), rowId: "cash" },
      { label: "Comptes clients", current: 1050000, prior: 900000, indent: true, trendValues: generateTrend(1050000, 0.04), rowId: "receivables" },
      { label: "Stocks", current: 450000, prior: 390000, indent: true, trendValues: generateTrend(450000, 0.03), rowId: "inventory" },
      { label: "Autres actifs courants", current: 450000, prior: 420000, indent: true, trendValues: generateTrend(450000, 0.03), rowId: "other-current-assets" },
      { label: "Total Actifs courants", current: 2550000, prior: 2250000, isBold: true, isSubtotal: true, trendValues: generateTrend(2550000, 0.04) },
      { label: "", current: 0, prior: 0 },
      { label: "Immobilisations corporelles", current: 2400000, prior: 2250000, trendValues: generateTrend(2400000, 0.03), rowId: "fixed-assets" },
      { label: "Immobilisations incorporelles", current: 750000, prior: 690000, trendValues: generateTrend(750000, 0.03), rowId: "intangible-assets" },
      { label: "Autres actifs non courants", current: 450000, prior: 360000, trendValues: generateTrend(450000, 0.035) },
      { label: "Total Actifs", current: 6150000, prior: 5550000, isBold: true, isSubtotal: true, trendValues: generateTrend(6150000, 0.035) },
      { label: "", current: 0, prior: 0 },
      { label: "PASSIFS", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "PASSIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Comptes fournisseurs", current: 600000, prior: 540000, indent: true, trendValues: generateTrend(600000, 0.025), rowId: "payables" },
      { label: "Dettes à court terme", current: 450000, prior: 420000, indent: true, trendValues: generateTrend(450000, 0.025), rowId: "short-term-debt" },
      { label: "Autres passifs courants", current: 300000, prior: 300000, indent: true, trendValues: generateTrend(300000, 0) },
      { label: "Total Passifs courants", current: 1350000, prior: 1260000, isBold: true, isSubtotal: true, trendValues: generateTrend(1350000, 0.025) },
      { label: "", current: 0, prior: 0 },
      { label: "Dettes à long terme", current: 1350000, prior: 1290000, trendValues: generateTrend(1350000, 0.03), rowId: "long-term-debt" },
      { label: "Autres passifs non courants", current: 450000, prior: 450000, trendValues: generateTrend(450000, 0) },
      { label: "Total Passifs", current: 3150000, prior: 3000000, isBold: true, isSubtotal: true, trendValues: generateTrend(3150000, 0.027) },
      { label: "", current: 0, prior: 0 },
      { label: "CAPITAUX PROPRES", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Capital social", current: 1800000, prior: 1650000, indent: true, trendValues: generateTrend(1800000, 0.045), rowId: "share-capital" },
      { label: "Bénéfices non répartis", current: 1200000, prior: 900000, indent: true, trendValues: generateTrend(1200000, 0.05) },
      { label: "Total Capitaux propres", current: 3000000, prior: 2550000, isBold: true, isSubtotal: true, trendValues: generateTrend(3000000, 0.045) },
      { label: "", current: 0, prior: 0 },
      { label: "Total passifs et capitaux propres", current: 6150000, prior: 5550000, isBold: true, isSubtotal: true, trendValues: generateTrend(6150000, 0.035) },
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

  // Helper function to generate trend data for years
  const getYearsData = (): DetailRow[] => {
    const generateTrend = (base: number, growthRate: number = 0.05) => {
      return Array.from({ length: 6 }, (_, i) => {
        const yearIndex = 5 - i
        return Math.round(base * (1 + growthRate * yearIndex) * (0.95 + Math.random() * 0.1))
      })
    }

    const rows: DetailRow[] = [
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
    // Return trend data for trend views
    if (view === "12months") {
      return get12MonthsData()
    }
    if (view === "quarters") {
      return getQuartersData()
    }
    if (view === "years") {
      return getYearsData()
    }
    if (period === "monthly") {
      const rows: DetailRow[] = [
        // Assets
        { label: "ACTIFS", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "ACTIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Trésorerie et équivalents", current: 200000, prior: 180000, indent: true, rowId: "cash" },
        { label: "Comptes clients", current: 350000, prior: 300000, indent: true, rowId: "receivables" },
        { label: "Stocks", current: 150000, prior: 130000, indent: true, rowId: "inventory" },
        { label: "Autres actifs courants", current: 150000, prior: 140000, indent: true, rowId: "other-current-assets" },
        { label: "Total Actifs courants", current: 850000, prior: 750000, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        { label: "Immobilisations corporelles", current: 800000, prior: 750000, rowId: "fixed-assets" },
        { label: "Immobilisations incorporelles", current: 250000, prior: 230000, rowId: "intangible-assets" },
        { label: "Autres actifs non courants", current: 150000, prior: 120000 },
        { label: "Total Actifs", current: 2050000, prior: 1850000, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        // Liabilities
        { label: "PASSIFS", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "PASSIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Comptes fournisseurs", current: 200000, prior: 180000, indent: true, rowId: "payables" },
        { label: "Dettes à court terme", current: 150000, prior: 140000, indent: true, rowId: "short-term-debt" },
        { label: "Autres passifs courants", current: 100000, prior: 100000, indent: true },
        { label: "Total Passifs courants", current: 450000, prior: 420000, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        { label: "Dettes à long terme", current: 450000, prior: 430000, rowId: "long-term-debt" },
        { label: "Autres passifs non courants", current: 150000, prior: 150000 },
        { label: "Total Passifs", current: 1050000, prior: 1000000, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        // Equity
        { label: "CAPITAUX PROPRES", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Capital social", current: 600000, prior: 550000, indent: true, rowId: "share-capital" },
        { label: "Bénéfices non répartis", current: 400000, prior: 300000, indent: true },
        { label: "Total Capitaux propres", current: 1000000, prior: 850000, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        { label: "Total passifs et capitaux propres", current: 2050000, prior: 1850000, isBold: true, isSubtotal: true },
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
    } else if (period === "quarterly") {
      const rows: DetailRow[] = [
        // Assets
        { label: "ACTIFS", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "ACTIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Trésorerie et équivalents", current: 600000, prior: 540000, indent: true, rowId: "cash" },
        { label: "Comptes clients", current: 1050000, prior: 900000, indent: true, rowId: "receivables" },
        { label: "Stocks", current: 450000, prior: 390000, indent: true, rowId: "inventory" },
        { label: "Autres actifs courants", current: 450000, prior: 420000, indent: true, rowId: "other-current-assets" },
        { label: "Total Actifs courants", current: 2550000, prior: 2250000, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        { label: "Immobilisations corporelles", current: 2400000, prior: 2250000, rowId: "fixed-assets" },
        { label: "Immobilisations incorporelles", current: 750000, prior: 690000, rowId: "intangible-assets" },
        { label: "Autres actifs non courants", current: 450000, prior: 360000 },
        { label: "Total Actifs", current: 6150000, prior: 5550000, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        // Liabilities
        { label: "PASSIFS", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "PASSIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Comptes fournisseurs", current: 600000, prior: 540000, indent: true, rowId: "payables" },
        { label: "Dettes à court terme", current: 450000, prior: 420000, indent: true, rowId: "short-term-debt" },
        { label: "Autres passifs courants", current: 300000, prior: 300000, indent: true },
        { label: "Total Passifs courants", current: 1350000, prior: 1260000, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        { label: "Dettes à long terme", current: 1350000, prior: 1290000, rowId: "long-term-debt" },
        { label: "Autres passifs non courants", current: 450000, prior: 450000 },
        { label: "Total Passifs", current: 3150000, prior: 3000000, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        // Equity
        { label: "CAPITAUX PROPRES", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Capital social", current: 1800000, prior: 1650000, indent: true, rowId: "share-capital" },
        { label: "Bénéfices non répartis", current: 1200000, prior: 900000, indent: true },
        { label: "Total Capitaux propres", current: 3000000, prior: 2550000, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        { label: "Total passifs et capitaux propres", current: 6150000, prior: 5550000, isBold: true, isSubtotal: true },
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
    } else {
      const rows: DetailRow[] = [
        // Assets
        { label: "ACTIFS", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "ACTIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Trésorerie et équivalents", current: 2400000, prior: 2160000, indent: true, rowId: "cash" },
        { label: "Comptes clients", current: 4200000, prior: 3600000, indent: true, rowId: "receivables" },
        { label: "Stocks", current: 1800000, prior: 1560000, indent: true, rowId: "inventory" },
        { label: "Autres actifs courants", current: 1800000, prior: 1680000, indent: true, rowId: "other-current-assets" },
        { label: "Total Actifs courants", current: 10200000, prior: 9000000, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        { label: "Immobilisations corporelles", current: 9600000, prior: 9000000, rowId: "fixed-assets" },
        { label: "Immobilisations incorporelles", current: 3000000, prior: 2760000, rowId: "intangible-assets" },
        { label: "Autres actifs non courants", current: 1800000, prior: 1440000 },
        { label: "Total Actifs", current: 24600000, prior: 22200000, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        // Liabilities
        { label: "PASSIFS", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "PASSIFS COURANTS", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Comptes fournisseurs", current: 2400000, prior: 2160000, indent: true, rowId: "payables" },
        { label: "Dettes à court terme", current: 1800000, prior: 1680000, indent: true, rowId: "short-term-debt" },
        { label: "Autres passifs courants", current: 1200000, prior: 1200000, indent: true },
        { label: "Total Passifs courants", current: 5400000, prior: 5040000, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        { label: "Dettes à long terme", current: 5400000, prior: 5160000, rowId: "long-term-debt" },
        { label: "Autres passifs non courants", current: 1800000, prior: 1800000 },
        { label: "Total Passifs", current: 12600000, prior: 12000000, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        // Equity
        { label: "CAPITAUX PROPRES", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Capital social", current: 7200000, prior: 6600000, indent: true, rowId: "share-capital" },
        { label: "Bénéfices non répartis", current: 4800000, prior: 3600000, indent: true },
        { label: "Total Capitaux propres", current: 12000000, prior: 10200000, isBold: true, isSubtotal: true },
        { label: "", current: 0, prior: 0 },
        { label: "Total passifs et capitaux propres", current: 24600000, prior: 22200000, isBold: true, isSubtotal: true },
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
  
  // Find total assets value for percentage calculations
  const totalAssetsRow = data.find((row) => row.label.toLowerCase().includes("total des actifs") && row.isSubtotal)
  const totalAssetsCurrent = totalAssetsRow?.current || 1
  const totalAssetsPrior = totalAssetsRow?.prior || 1

  // Helper function to calculate percentage of total assets
  const getTotalAssetsPercentage = (value: number, isPrior: boolean): number => {
    const totalAssets = isPrior ? totalAssetsPrior : totalAssetsCurrent
    if (totalAssets === 0) return 0
    return (value / totalAssets) * 100
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
      parts.push("• % des actifs totaux")
    } else {
      parts.push("• Variations")
    }

    return parts.join(" • ")
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
    if (view === "comparison" && period === "monthly") return "Courant"
    if (view === "comparison" && period === "quarterly") return "Trimestriel"
    if (view === "comparison" && period === "annual") return "Annuel"
    if (view === "ytd") return "YTD"
    if (view === "ddm") return "DDM"
    if (view === "12months") return "12 mois"
    if (view === "quarters") return "Trimestres"
    if (view === "years") return "Années"
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
              <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">Détail</h2>
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
              {view === "current" && (
                <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Montant</th>
              )}
              {view === "comparison" && !isComparisonMode && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Courant</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Passé</th>
                  {columnMode === "variations" ? (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation %</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation $</th>
                    </>
                  ) : columnMode === "percentage" ? (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des actifs totaux</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des actifs totaux</th>
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
              {view === "ddm" && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Courant</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Passé</th>
                  {columnMode === "variations" ? (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation %</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation $</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des actifs totaux</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des actifs totaux</th>
                    </>
                  )}
                </>
              )}
              {view === "ytd" && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">YTD 2024</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">YTD 2023</th>
                  {columnMode === "variations" ? (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation %</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation $</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des actifs totaux</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des actifs totaux</th>
                    </>
                  )}
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
              const variation = row.current && row.prior ? calculateVariation(row.current, row.prior) : null
              const variationAmount = row.current && row.prior ? row.current - row.prior : 0
              const isSpacer = row.label === ""
              const shouldHideAmounts = isSpacer || !!row.isSection
              const displayLabel = row.isSection ? capitalizeFirst(row.label) : row.label
              
              // Check if next row is a subtotal to add dark border above it
              const nextRowIsSubtotal = idx < data.length - 1 && data[idx + 1].isSubtotal
              
              // Check if this row can be expanded and if it's expanded
              const canExpand = !!row.rowId && !!row.balanceAccounts && row.balanceAccounts.length > 0
              const isExpanded = row.rowId ? expandedRows.has(row.rowId) : false
              
              // Check if this row has a note
              const hasNote = row.rowId
                ? getNoteByRowId(row.rowId, "balance-sheet", period, view, companyId, divisionId, subDivisionId) !== null
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
                                : "text-slate-400 hover:bg-slate-100 hover:text-slate-500"
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
                            className={`px-6 py-3 text-right font-semibold ${
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
                            {row.current !== 0 ? `${getTotalAssetsPercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.prior !== 0 ? `${getTotalAssetsPercentage(row.prior, true).toFixed(1)}%` : "-"}
                          </td>
                        </>
                      ) : null}
                    </>
                  )}
                  {view === "comparison" && isComparisonMode && (
                    <>
                      {entitiesToCompare.map((entity, entityIdx) => {
                        const entityData = getEntityData(entityIdx, [row])[0]
                        // In comparison mode, always show currency
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
                  {view === "ddm" && (
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
                            className={`px-6 py-3 text-right font-semibold ${
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
                      ) : (
                        <>
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.current !== 0 ? `${getTotalAssetsPercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.prior !== 0 ? `${getTotalAssetsPercentage(row.prior, true).toFixed(1)}%` : "-"}
                          </td>
                        </>
                      )}
                    </>
                  )}

                  {view === "ytd" && (
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
                            className={`px-6 py-3 text-right font-semibold ${
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
                      ) : (
                        <>
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.current !== 0 ? `${getTotalAssetsPercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.prior !== 0 ? `${getTotalAssetsPercentage(row.prior, true).toFixed(1)}%` : "-"}
                          </td>
                        </>
                      )}
                    </>
                  )}

                  {/* Trend Views - 12 months, quarters, years */}
                  {view === "12months" && row.trendValues && (
                    <>
                      {row.trendValues.map((value, valueIdx) => (
                        <td
                          key={valueIdx}
                          className={`px-4 py-3 text-right font-semibold ${row.isBold ? "font-bold" : ""} ${shouldHideAmounts ? "text-white" : ""}`}
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
                          className={`px-4 py-3 text-right font-semibold ${row.isBold ? "font-bold" : ""} ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {value !== 0 ? formatCurrency(value) : "-"}
                        </td>
                      ))}
                    </>
                  )}
                  {view === "years" && row.trendValues && (
                    <>
                      {row.trendValues.map((value, valueIdx) => {
                        const isForecastSection = title === "Bilan pro forma"
                        return (
                          <td
                            key={valueIdx}
                            className={cn(
                              "px-4 py-3 text-right font-semibold",
                              row.isBold ? "font-bold" : "",
                              shouldHideAmounts ? "text-white" : "",
                              isForecastSection && valueIdx === 0 && !shouldHideAmounts ? "bg-slate-50" : ""
                            )}
                          >
                            {value !== 0 ? formatCurrency(value) : "-"}
                          </td>
                        )
                      })}
                    </>
                  )}
                  {/* Empty cells for spacer rows in trend views */}
                  {(view === "12months" || view === "quarters" || view === "years") && !row.trendValues && (
                    <>
                      {Array.from({ length: view === "12months" ? 12 : view === "quarters" ? 5 : 6 }).map((_, idx) => {
                        const isForecastSection = title === "Bilan pro forma"
                        return (
                          <td 
                            key={idx} 
                            className={cn(
                              "px-4 py-3 text-right font-semibold text-white",
                              isForecastSection && view === "years" && idx === 0 ? "bg-slate-50" : ""
                            )}
                          >
                            -
                          </td>
                        )
                      })}
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
                            <td className="px-6 py-2 text-slate-500 pl-20">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-slate-500">{account.accountNumber}</span>
                                <span className="text-sm">{account.accountName}</span>
                              </div>
                            </td>
                            
                            {view === "current" && (
                              <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                              </td>
                            )}
                            
                            {view === "comparison" && !isComparisonMode && (
                              <>
                                <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                  {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                                </td>
                                <td className="px-6 py-2 text-right font-semibold text-sm text-slate-500">
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
                                      {account.amount !== 0 ? `${getTotalAssetsPercentage(account.amount, false).toFixed(1)}%` : "-"}
                                    </td>
                                    <td className="px-6 py-2 text-right font-semibold text-sm text-slate-500">
                                      {account.priorAmount !== undefined && account.priorAmount !== 0 ? `${getTotalAssetsPercentage(account.priorAmount, true).toFixed(1)}%` : "-"}
                                    </td>
                                  </>
                                ) : null}
                              </>
                            )}
                            
                            {view === "ddm" && (
                              <>
                                <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                  {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                                </td>
                                <td className="px-6 py-2 text-right font-semibold text-sm text-slate-500">
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
                                ) : (
                                  <>
                                    <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                      {account.amount !== 0 ? `${getTotalAssetsPercentage(account.amount, false).toFixed(1)}%` : "-"}
                                    </td>
                                    <td className="px-6 py-2 text-right font-semibold text-sm text-slate-500">
                                      {account.priorAmount !== undefined && account.priorAmount !== 0 ? `${getTotalAssetsPercentage(account.priorAmount, true).toFixed(1)}%` : "-"}
                                    </td>
                                  </>
                                )}
                              </>
                            )}
                            
                            {view === "ytd" && (
                              <>
                                <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                  {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                                </td>
                                <td className="px-6 py-2 text-right font-semibold text-sm text-slate-500">
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
                                ) : (
                                  <>
                                    <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                      {account.amount !== 0 ? `${getTotalAssetsPercentage(account.amount, false).toFixed(1)}%` : "-"}
                                    </td>
                                    <td className="px-6 py-2 text-right font-semibold text-sm text-slate-500">
                                      {account.priorAmount !== undefined && account.priorAmount !== 0 ? `${getTotalAssetsPercentage(account.priorAmount, true).toFixed(1)}%` : "-"}
                                    </td>
                                  </>
                                )}
                              </>
                            )}
                            
                            {(view === "12months" || view === "quarters" || view === "years") && row.trendValues && account.proportion !== undefined && (
                              <>
                                {row.trendValues.map((value, valueIdx) => {
                                  const accountValue = Math.round(value * account.proportion!)
                                  const isForecastSection = title === "Bilan pro forma"
                                  return (
                                    <td
                                      key={valueIdx}
                                      className={cn(
                                        "px-4 py-2 text-right font-semibold text-sm text-slate-700",
                                        isForecastSection && valueIdx === 0 ? "bg-slate-50" : ""
                                      )}
                                    >
                                      {accountValue !== 0 ? formatCurrency(accountValue) : "-"}
                                    </td>
                                  )
                                })}
                              </>
                            )}
                            
                            {(view === "12months" || view === "quarters" || view === "years") && !row.trendValues && (
                              <>
                                {Array.from({ length: view === "12months" ? 12 : view === "quarters" ? 5 : 6 }).map((_, emptyIdx) => {
                                  const isForecastSection = title === "Bilan pro forma"
                                  return (
                                    <td 
                                      key={emptyIdx} 
                                      className={cn(
                                        "px-4 py-2 text-right font-semibold text-sm text-slate-400",
                                        isForecastSection && view === "years" && emptyIdx === 0 ? "bg-slate-50" : ""
                                      )}
                                    >
                                      -
                                    </td>
                                  )
                                })}
                              </>
                            )}
                            
                            {view === "comparison" && isComparisonMode && (
                              <>
                                {entitiesToCompare.map((entity, entityIdx) => {
                                  const entityData = getEntityData(entityIdx, [row])[0]
                                  const accountAmount = account.proportion !== undefined 
                                    ? Math.round(entityData.current * account.proportion)
                                    : account.amount
                                  return (
                                    <td
                                      key={entity.id}
                                      className="px-6 py-2 text-right font-semibold text-sm text-slate-700"
                                    >
                                      {accountAmount !== 0 ? formatCurrency(accountAmount) : "-"}
                                    </td>
                                  )
                                })}
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
        <p className="text-xs text-slate-500">
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
            page="balance-sheet"
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

