"use client"

import { useState, useEffect, useMemo } from "react"
import { formatCurrency } from "@/lib/financial-utils"
import { Company } from "@/components/entity-selector"
import type { SeriesRow, SeriesPeriod, AccountMappingData } from "@/lib/api"
import { listAccountMappings, listProducts } from "@/lib/api"
import { findRow } from "@/lib/series-utils"
import { getHorizonModeLabel } from "@/lib/financial-statement-horizon-labels"
import { StickyNote } from "lucide-react"
import { NoteModal } from "@/components/note-modal"
import { getNoteByRowId, useNotesCache } from "@/lib/notes-storage"
import { cn } from "@/lib/utils"

interface ProductMarginAnalysisProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "comparison" | "ytd" | "ddm" | "12months" | "24months" | "quarters" | "years"
  columnMode: "variations" | "percentage" | "comparison"
  selectedProduct?: string
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  seriesRows?: SeriesRow[]
  periods?: SeriesPeriod[]
}

interface ProductRow {
  label: string
  revenue: number
  costs: number
  grossProfit: number
  grossMargin: number
  revenuePrior?: number
  costsPrior?: number
  grossProfitPrior?: number
  grossMarginPrior?: number
  trendValues?: Array<{
    revenue: number
    costs: number
    grossProfit: number
    grossMargin: number
  }>
  isBold?: boolean
  isSection?: boolean
  isSubtotal?: boolean
  isResult?: boolean
  indent?: boolean
  accountId?: string
  rowId?: string
}

/**
 * For a given link_code, determine which product it belongs to.
 * Returns the product name if ALL accounts with this link_code share
 * the same product. Returns null if mixed or unassigned.
 */
function getProductForLinkCode(
  linkCode: string,
  mappings: AccountMappingData[]
): string | null {
  const matchingAccounts = mappings.filter(m => m.link_code === linkCode)
  if (matchingAccounts.length === 0) return null

  const products = new Set(
    matchingAccounts.map(m => m.product).filter((p): p is string => !!p)
  )
  if (products.size === 1) return Array.from(products)[0]
  return null
}

/**
 * Build per-product data from seriesRows and account mappings.
 * Groups revenue and COGS detail rows by their product assignment.
 */
function buildProductData(
  seriesRows: SeriesRow[],
  periods: SeriesPeriod[],
  mappings: AccountMappingData[],
  productNames: string[],
  view: string,
  selectedProduct: string
): ProductRow[] {
  const revenueRow = findRow(seriesRows, "revenus") || findRow(seriesRows, "revenue")
  const cogsRow = findRow(seriesRows, "coût des ventes") || findRow(seriesRows, "cost of sales")

  if (!revenueRow && !cogsRow) return []

  // Build per-product amounts for each period
  // Map: productName -> { periodKey -> { revenue, costs } }
  const productAmounts: Record<string, Record<string, { revenue: number; costs: number }>> = {}

  for (const pName of productNames) {
    productAmounts[pName] = {}
    for (const p of periods) {
      productAmounts[pName][`${p.fiscalYear}-${p.fiscalMonth}`] = { revenue: 0, costs: 0 }
    }
  }

  // Process revenue detail rows
  if (revenueRow?.detailRows) {
    for (const dr of revenueRow.detailRows) {
      const product = getProductForLinkCode(dr.id, mappings)
      if (!product || !productAmounts[product]) continue
      for (const p of periods) {
        const key = `${p.fiscalYear}-${p.fiscalMonth}`
        productAmounts[product][key].revenue += Math.abs(dr.amounts[key] || 0)
      }
    }
  } else if (revenueRow) {
    // No detail rows - try to assign the whole revenue row
    // Check if all revenue-mapped accounts share a product
    const revMappings = mappings.filter(m => m.link_code && revenueRow.id === m.link_code)
    const product = revMappings.length > 0 ? getProductForLinkCode(revenueRow.id, mappings) : null
    if (product && productAmounts[product]) {
      for (const p of periods) {
        const key = `${p.fiscalYear}-${p.fiscalMonth}`
        productAmounts[product][key].revenue += Math.abs(revenueRow.amounts[key] || 0)
      }
    }
  }

  // Process COGS detail rows
  if (cogsRow?.detailRows) {
    for (const dr of cogsRow.detailRows) {
      const product = getProductForLinkCode(dr.id, mappings)
      if (!product || !productAmounts[product]) continue
      for (const p of periods) {
        const key = `${p.fiscalYear}-${p.fiscalMonth}`
        productAmounts[product][key].costs += Math.abs(dr.amounts[key] || 0)
      }
    }
  } else if (cogsRow) {
    const product = getProductForLinkCode(cogsRow.id, mappings)
    if (product && productAmounts[product]) {
      for (const p of periods) {
        const key = `${p.fiscalYear}-${p.fiscalMonth}`
        productAmounts[product][key].costs += Math.abs(cogsRow.amounts[key] || 0)
      }
    }
  }

  // Also collect detail rows per product for individual product views
  const productDetailRevenue: Record<string, Array<{ label: string; id: string; amounts: Record<string, number> }>> = {}
  const productDetailCosts: Record<string, Array<{ label: string; id: string; amounts: Record<string, number> }>> = {}
  for (const pName of productNames) {
    productDetailRevenue[pName] = []
    productDetailCosts[pName] = []
  }

  if (revenueRow?.detailRows) {
    for (const dr of revenueRow.detailRows) {
      const product = getProductForLinkCode(dr.id, mappings)
      if (product && productDetailRevenue[product]) {
        productDetailRevenue[product].push({ label: dr.label, id: dr.id, amounts: dr.amounts })
      }
    }
  }
  if (cogsRow?.detailRows) {
    for (const dr of cogsRow.detailRows) {
      const product = getProductForLinkCode(dr.id, mappings)
      if (product && productDetailCosts[product]) {
        productDetailCosts[product].push({ label: dr.label, id: dr.id, amounts: dr.amounts })
      }
    }
  }

  const isTrend = view === "12months" || view === "24months" || view === "quarters" || view === "years"

  // Helper to build trend values for a product
  const buildTrendValues = (pName: string) => {
    return periods.map(p => {
      const key = `${p.fiscalYear}-${p.fiscalMonth}`
      const data = productAmounts[pName]?.[key] || { revenue: 0, costs: 0 }
      const grossProfit = data.revenue - data.costs
      const grossMargin = data.revenue !== 0 ? (grossProfit / data.revenue) * 100 : 0
      return { revenue: data.revenue, costs: data.costs, grossProfit, grossMargin }
    })
  }

  // Helper to get current/prior values for a product
  const getCurrentPrior = (pName: string) => {
    const lastP = periods[periods.length - 1]
    const priorP = periods.length > 1 ? periods[periods.length - 2] : null
    const lastKey = lastP ? `${lastP.fiscalYear}-${lastP.fiscalMonth}` : ""
    const priorKey = priorP ? `${priorP.fiscalYear}-${priorP.fiscalMonth}` : ""

    const data = productAmounts[pName] || {}
    const current = data[lastKey] || { revenue: 0, costs: 0 }
    const prior = priorKey ? (data[priorKey] || { revenue: 0, costs: 0 }) : { revenue: 0, costs: 0 }

    return { current, prior }
  }

  const rows: ProductRow[] = []

  if (selectedProduct === "total") {
    // TOTAL view: aggregate all products
    if (isTrend) {
      const totalTrend = periods.map(p => {
        const key = `${p.fiscalYear}-${p.fiscalMonth}`
        let totalRev = 0, totalCost = 0
        for (const pName of productNames) {
          const d = productAmounts[pName]?.[key] || { revenue: 0, costs: 0 }
          totalRev += d.revenue
          totalCost += d.costs
        }
        const gp = totalRev - totalCost
        const gm = totalRev !== 0 ? (gp / totalRev) * 100 : 0
        return { revenue: totalRev, costs: totalCost, grossProfit: gp, grossMargin: gm }
      })

      rows.push({
        label: "Revenus totaux", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0,
        trendValues: totalTrend.map(t => ({ revenue: t.revenue, costs: 0, grossProfit: 0, grossMargin: 0 })),
        isBold: true, isSubtotal: true, accountId: "total_revenue", rowId: "total_revenue",
      })
      rows.push({
        label: "Coût des produits vendus totaux", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0,
        trendValues: totalTrend.map(t => ({ revenue: 0, costs: t.costs, grossProfit: 0, grossMargin: 0 })),
        isBold: true, isSubtotal: true, accountId: "total_cogs", rowId: "total_cogs",
      })
      rows.push({
        label: "Bénéfice brut totaux", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0,
        trendValues: totalTrend.map(t => ({ revenue: 0, costs: 0, grossProfit: t.grossProfit, grossMargin: t.grossMargin })),
        isBold: true, isSubtotal: true, accountId: "total_gross_profit", rowId: "total_gross_profit",
      })
      rows.push({
        label: "Marge brute (%)", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0,
        trendValues: totalTrend.map(t => ({ revenue: 0, costs: 0, grossProfit: 0, grossMargin: t.grossMargin })),
        isBold: true, isResult: true, accountId: "total_gross_margin", rowId: "total_gross_margin",
      })
    } else {
      // Current/comparison/ytd/ddm
      let totalRev = 0, totalCost = 0, totalRevPrior = 0, totalCostPrior = 0
      for (const pName of productNames) {
        const { current, prior } = getCurrentPrior(pName)
        totalRev += current.revenue
        totalCost += current.costs
        totalRevPrior += prior.revenue
        totalCostPrior += prior.costs
      }
      const gp = totalRev - totalCost
      const gm = totalRev !== 0 ? (gp / totalRev) * 100 : 0
      const gpPrior = totalRevPrior - totalCostPrior
      const gmPrior = totalRevPrior !== 0 ? (gpPrior / totalRevPrior) * 100 : 0

      rows.push({
        label: "Revenus totaux", revenue: totalRev, costs: 0, grossProfit: 0, grossMargin: 0,
        revenuePrior: totalRevPrior, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0,
        isBold: true, isSubtotal: true, accountId: "total_revenue", rowId: "total_revenue",
      })
      rows.push({
        label: "Coût des produits vendus totaux", revenue: 0, costs: totalCost, grossProfit: 0, grossMargin: 0,
        revenuePrior: 0, costsPrior: totalCostPrior, grossProfitPrior: 0, grossMarginPrior: 0,
        isBold: true, isSubtotal: true, accountId: "total_cogs", rowId: "total_cogs",
      })
      rows.push({
        label: "Bénéfice brut totaux", revenue: 0, costs: 0, grossProfit: gp, grossMargin: gm,
        revenuePrior: 0, costsPrior: 0, grossProfitPrior: gpPrior, grossMarginPrior: gmPrior,
        isBold: true, isSubtotal: true, accountId: "total_gross_profit", rowId: "total_gross_profit",
      })
    }
  } else {
    // Individual product view
    const productName = selectedProduct
    const revDetails = productDetailRevenue[productName] || []
    const costDetails = productDetailCosts[productName] || []
    const slug = productName.toLowerCase().replace(/\s+/g, "_")

    if (isTrend) {
      // Revenue section
      rows.push({
        label: "Revenus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0,
        isBold: true, isSection: true, accountId: `${slug}_revenue_section`,
      })
      for (const dr of revDetails) {
        const trend = periods.map(p => {
          const key = `${p.fiscalYear}-${p.fiscalMonth}`
          return { revenue: Math.abs(dr.amounts[key] || 0), costs: 0, grossProfit: 0, grossMargin: 0 }
        })
        rows.push({
          label: dr.label, revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0,
          trendValues: trend, indent: true,
          accountId: `${slug}_rev_${dr.id}`, rowId: `${slug}_rev_${dr.id}`,
        })
      }
      // Total revenue
      const revTrend = buildTrendValues(productName)
      rows.push({
        label: "Total Revenus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0,
        trendValues: revTrend.map(t => ({ revenue: t.revenue, costs: 0, grossProfit: 0, grossMargin: 0 })),
        isBold: true, isSubtotal: true,
        accountId: `${slug}_revenue_total`, rowId: `${slug}_revenue_total`,
      })
      rows.push({ label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0 })

      // COGS section
      rows.push({
        label: "Coût des produits vendus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0,
        isBold: true, isSection: true, accountId: `${slug}_cogs_section`,
      })
      for (const dr of costDetails) {
        const trend = periods.map(p => {
          const key = `${p.fiscalYear}-${p.fiscalMonth}`
          return { revenue: 0, costs: Math.abs(dr.amounts[key] || 0), grossProfit: 0, grossMargin: 0 }
        })
        rows.push({
          label: dr.label, revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0,
          trendValues: trend, indent: true,
          accountId: `${slug}_cost_${dr.id}`, rowId: `${slug}_cost_${dr.id}`,
        })
      }
      // Total COGS
      rows.push({
        label: "Total COGS", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0,
        trendValues: revTrend.map(t => ({ revenue: 0, costs: t.costs, grossProfit: 0, grossMargin: 0 })),
        isBold: true, isSubtotal: true,
        accountId: `${slug}_cogs_total`, rowId: `${slug}_cogs_total`,
      })
      rows.push({ label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0 })

      // Gross profit
      rows.push({
        label: "Bénéfice brut", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0,
        trendValues: revTrend.map(t => ({ revenue: 0, costs: 0, grossProfit: t.grossProfit, grossMargin: t.grossMargin })),
        isBold: true, isResult: true,
        accountId: `${slug}_gross_profit`, rowId: `${slug}_gross_profit`,
      })
      rows.push({
        label: "Marge brute (%)", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0,
        trendValues: revTrend.map(t => ({ revenue: 0, costs: 0, grossProfit: 0, grossMargin: t.grossMargin })),
        isBold: true, isResult: true,
        accountId: `${slug}_gross_margin`, rowId: `${slug}_gross_margin`,
      })
    } else {
      // Current/comparison/ytd/ddm views
      const { current, prior } = getCurrentPrior(productName)
      const lastP = periods[periods.length - 1]
      const priorP = periods.length > 1 ? periods[periods.length - 2] : null
      const lastKey = lastP ? `${lastP.fiscalYear}-${lastP.fiscalMonth}` : ""
      const priorKey = priorP ? `${priorP.fiscalYear}-${priorP.fiscalMonth}` : ""

      // Revenue section
      rows.push({
        label: "Revenus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0,
        revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0,
        isBold: true, isSection: true, accountId: `${slug}_revenue_section`,
      })
      for (const dr of revDetails) {
        const val = Math.abs(dr.amounts[lastKey] || 0)
        const valPrior = priorKey ? Math.abs(dr.amounts[priorKey] || 0) : 0
        rows.push({
          label: dr.label, revenue: val, costs: 0, grossProfit: 0, grossMargin: 0,
          revenuePrior: valPrior, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0,
          indent: true,
          accountId: `${slug}_rev_${dr.id}`, rowId: `${slug}_rev_${dr.id}`,
        })
      }
      rows.push({
        label: "Total Revenus", revenue: current.revenue, costs: 0, grossProfit: 0, grossMargin: 0,
        revenuePrior: prior.revenue, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0,
        isBold: true, isSubtotal: true,
        accountId: `${slug}_revenue_total`, rowId: `${slug}_revenue_total`,
      })
      rows.push({
        label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0,
        revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0,
      })

      // COGS section
      rows.push({
        label: "Coût des produits vendus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0,
        revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0,
        isBold: true, isSection: true, accountId: `${slug}_cogs_section`,
      })
      for (const dr of costDetails) {
        const val = Math.abs(dr.amounts[lastKey] || 0)
        const valPrior = priorKey ? Math.abs(dr.amounts[priorKey] || 0) : 0
        rows.push({
          label: dr.label, revenue: 0, costs: val, grossProfit: 0, grossMargin: 0,
          revenuePrior: 0, costsPrior: valPrior, grossProfitPrior: 0, grossMarginPrior: 0,
          indent: true,
          accountId: `${slug}_cost_${dr.id}`, rowId: `${slug}_cost_${dr.id}`,
        })
      }
      rows.push({
        label: "Total COGS", revenue: 0, costs: current.costs, grossProfit: 0, grossMargin: 0,
        revenuePrior: 0, costsPrior: prior.costs, grossProfitPrior: 0, grossMarginPrior: 0,
        isBold: true, isSubtotal: true,
        accountId: `${slug}_cogs_total`, rowId: `${slug}_cogs_total`,
      })
      rows.push({
        label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0,
        revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0,
      })

      // Gross profit
      const gp = current.revenue - current.costs
      const gpPrior = prior.revenue - prior.costs
      rows.push({
        label: "Bénéfice brut", revenue: 0, costs: 0, grossProfit: gp, grossMargin: 0,
        revenuePrior: 0, costsPrior: 0, grossProfitPrior: gpPrior, grossMarginPrior: 0,
        isBold: true, isResult: true,
        accountId: `${slug}_gross_profit`, rowId: `${slug}_gross_profit`,
      })
    }
  }

  return rows
}

export function ProductMarginAnalysis({
  period,
  view,
  columnMode,
  selectedProduct = "total",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  seriesRows = [],
  periods: seriesPeriods = [],
}: ProductMarginAnalysisProps) {
  useNotesCache(companyId ?? null)
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

  // Fetch account mappings and products
  const [accountMappings, setAccountMappings] = useState<AccountMappingData[]>([])
  const [productNames, setProductNames] = useState<string[]>([])
  const [loadingMappings, setLoadingMappings] = useState(false)

  useEffect(() => {
    if (!companyId) {
      setAccountMappings([])
      setProductNames([])
      return
    }
    setLoadingMappings(true)
    Promise.all([
      listAccountMappings(companyId),
      listProducts(companyId),
    ])
      .then(([mappings, products]) => {
        setAccountMappings(mappings)
        const names = products.map(p => p.name).sort()
        setProductNames(names)
      })
      .catch(() => {
        setAccountMappings([])
        setProductNames([])
      })
      .finally(() => setLoadingMappings(false))
  }, [companyId])

  const hasRealData = seriesRows.length > 0 && seriesPeriods.length > 0
  const hasProducts = productNames.length > 0
  const hasProductMappings = accountMappings.some(m => !!m.product)

  // Build product data from real series + mappings
  const productData = useMemo<ProductRow[]>(() => {
    if (!hasRealData || !hasProductMappings) return []
    return buildProductData(
      seriesRows, seriesPeriods, accountMappings, productNames, view, selectedProduct
    )
  }, [hasRealData, hasProductMappings, seriesRows, seriesPeriods, accountMappings, productNames, view, selectedProduct])

  // Build per-product data for "comparison" column mode
  const productDataByName = useMemo<Record<string, ProductRow[]>>(() => {
    if (!hasRealData || !hasProductMappings || columnMode !== "comparison") return {}
    const result: Record<string, ProductRow[]> = {}
    for (const pName of productNames) {
      result[pName] = buildProductData(
        seriesRows, seriesPeriods, accountMappings, productNames, view, pName
      )
    }
    return result
  }, [hasRealData, hasProductMappings, seriesRows, seriesPeriods, accountMappings, productNames, view, columnMode])

  // Helper function to get value for a specific product and row label
  const getProductValue = (pName: string, label: string): number => {
    const pRows = productDataByName[pName] || []
    const labelMap: Record<string, string> = {
      "Revenus totaux": "Total Revenus",
      "Coût des produits vendus totaux": "Total COGS",
      "Bénéfice brut totaux": "Bénéfice brut",
    }
    let row = pRows.find(r => r.label === label)
    if (!row && labelMap[label]) {
      row = pRows.find(r => r.label === labelMap[label])
    }
    if (!row) {
      if (label.includes("Revenus")) row = pRows.find(r => r.label === "Total Revenus")
      else if (label.includes("Coût")) row = pRows.find(r => r.label === "Total COGS")
      else if (label.includes("Bénéfice")) row = pRows.find(r => r.label === "Bénéfice brut")
    }
    if (!row) return 0

    if (view === "comparison" || view === "ytd" || view === "ddm") {
      return row.grossProfit !== 0 ? row.grossProfit : row.revenue !== 0 ? row.revenue : row.costs !== 0 ? row.costs : 0
    }
    if (row.trendValues && row.trendValues.length > 0) {
      const last = row.trendValues[row.trendValues.length - 1]
      return last.grossProfit !== 0 ? last.grossProfit : last.revenue !== 0 ? last.revenue : last.costs !== 0 ? last.costs : 0
    }
    return 0
  }

  const getHorizonText = (): string => getHorizonModeLabel(view, period)

  // Calculate variation
  const calculateVariation = (current: number, prior: number): number => {
    if (prior === 0) return 0
    return ((current - prior) / prior) * 100
  }

  // Get month labels (fallback when no real data)
  const getMonthLabels = (count: number): string[] => {
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
    const labels: string[] = []
    const currentDate = new Date()
    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      labels.push(`${months[date.getMonth()]} ${date.getFullYear()}`)
    }
    return labels
  }

  // Get quarter labels (fallback)
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

  // Get year labels (fallback)
  const getYearLabels = (): string[] => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, i) => `${currentYear - 5 + i}`)
  }

  // Get product display name for title
  const getProductName = (): string => {
    if (selectedProduct === "total" || !selectedProduct) return ""
    return selectedProduct
  }

  const productName = getProductName()
  const title = productName ? `Analyse par produit - ${productName}` : "Analyse par produit"

  // Determine empty state message
  const getEmptyMessage = () => {
    if (loadingMappings) {
      return { title: "Chargement...", description: "Récupération des données produits en cours." }
    }
    if (!hasRealData) {
      return {
        title: "Aucune donnée disponible",
        description: "Importez une balance de vérification et configurez les structures d'états financiers pour voir l'analyse des marges.",
      }
    }
    if (!hasProductMappings) {
      return {
        title: "Aucun produit configuré",
        description: "Assignez des produits dans le mapping comptable pour voir l'analyse des marges par produit.",
      }
    }
    return {
      title: "Aucune donnée disponible",
      description: "Aucune donnée trouvée pour les filtres sélectionnés.",
    }
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
        </div>
      </div>

      {/* Empty state when no data */}
      {productData.length === 0 && (() => {
        const msg = getEmptyMessage()
        return (
          <div className="bg-white px-8 py-16 text-center">
            <div className="text-slate-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">{msg.title}</h3>
            <p className="text-sm text-slate-500">{msg.description}</p>
          </div>
        )
      })()}

      {/* Table */}
      {productData.length > 0 && (
      <div className="overflow-x-auto bg-white">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm w-2/5">Poste</th>
              {view === "comparison" && columnMode !== "comparison" && (
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
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des revenus</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des revenus</th>
                    </>
                  ) : null}
                </>
              )}
              {view === "comparison" && columnMode === "comparison" && (
                <>
                  {productNames.map(pName => (
                    <th key={pName} className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{pName}</th>
                  ))}
                </>
              )}
              {view === "ytd" && columnMode !== "comparison" && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">YTD courant</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">YTD précédent</th>
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
              {view === "ytd" && columnMode === "comparison" && (
                <>
                  {productNames.map(pName => (
                    <th key={pName} className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{pName}</th>
                  ))}
                </>
              )}
              {view === "ddm" && columnMode !== "comparison" && (
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
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des revenus</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des revenus</th>
                    </>
                  ) : null}
                </>
              )}
              {view === "ddm" && columnMode === "comparison" && (
                <>
                  {productNames.map(pName => (
                    <th key={pName} className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{pName}</th>
                  ))}
                </>
              )}
              {view === "12months" && (
                  <>
                    {(hasRealData ? seriesPeriods.map(p => p.label) : getMonthLabels(12)).map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">{label}</th>
                    ))}
                  </>
              )}
              {view === "24months" && hasRealData && (
                  <>
                    {seriesPeriods.map((p, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">{p.label}</th>
                    ))}
                  </>
              )}
              {view === "quarters" && (
                <>
                  {(hasRealData ? seriesPeriods.map(p => p.label) : getQuarterLabels()).map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">{label}</th>
                    ))}
                  </>
              )}
              {view === "years" && (
                  <>
                    {(hasRealData ? seriesPeriods.map(p => p.label) : getYearLabels()).map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">{label}</th>
                    ))}
                  </>
                )}
              </tr>
          </thead>
          <tbody>
            {productData.map((row, rowIndex) => {
              const isBoldRow = row.isBold || false
              const isSection = row.isSection || false
              const isSubtotal = row.isSubtotal || false
              const isSpacer = row.label === ""

              const nextRow = rowIndex < productData.length - 1 ? productData[rowIndex + 1] : null
              const nextRowIsTotal = nextRow && (
                nextRow.label === "Total Revenus" ||
                nextRow.label === "Total COGS" ||
                nextRow.label === "Bénéfice brut"
              )

              return (
                <tr
                  key={rowIndex}
                  className={`border-b ${
                    isSpacer ? "h-2 border-slate-200" : nextRowIsTotal ? "border-slate-900 border-b-2" : "border-slate-200"
                  }`}
                >
                  <td
                    className={`px-6 py-3 ${
                      isBoldRow ? "font-bold text-slate-900" : "text-slate-700"
                    } ${row.indent ? "pl-12" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex-1">{row.label}</span>
                      {row.rowId && selectedProduct !== "total" && (view === "comparison" || view === "ytd" || view === "ddm") && (() => {
                        const hasNote = getNoteByRowId(row.rowId!, "product-margin", period, view, companyId, divisionId, subDivisionId) !== null
                        const current = row.grossProfit !== 0 ? row.grossProfit : row.revenue !== 0 ? row.revenue : row.costs !== 0 ? row.costs : 0
                        const prior = row.grossProfitPrior !== undefined && row.grossProfitPrior !== 0 ? row.grossProfitPrior : row.revenuePrior !== undefined && row.revenuePrior !== 0 ? row.revenuePrior : row.costsPrior !== undefined && row.costsPrior !== 0 ? row.costsPrior : 0
                        const variation = current && prior ? calculateVariation(current, prior) : null
                        const variationAmount = current && prior ? current - prior : 0

                        return (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedRowId(row.rowId!)
                              setSelectedRowLabel(row.label)
                              setSelectedRowFinancialData({
                                currentAmount: current !== 0 ? current : null,
                                priorAmount: prior !== 0 ? prior : null,
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
                        )
                      })()}
                    </div>
                  </td>
                  {view === "comparison" && columnMode !== "comparison" && (
                    <>
                      {(() => {
                        const current = row.grossProfit !== 0 ? row.grossProfit : row.revenue !== 0 ? row.revenue : row.costs !== 0 ? row.costs : 0
                        const prior = row.grossProfitPrior !== undefined && row.grossProfitPrior !== 0 ? row.grossProfitPrior : row.revenuePrior !== undefined && row.revenuePrior !== 0 ? row.revenuePrior : row.costsPrior !== undefined && row.costsPrior !== 0 ? row.costsPrior : 0
                        const variation = current && prior ? calculateVariation(current, prior) : null
                        const variationAmount = current && prior ? current - prior : 0
                        const totalRevenue = productData.find(r => r.label === "Revenus totaux" || r.label === "Total Revenus")?.revenue || productData.find(r => r.label === "Revenus")?.revenue || 0
                        const currentPercentage = totalRevenue !== 0 ? (current / totalRevenue) * 100 : 0
                        const priorPercentage = totalRevenue !== 0 ? (prior / totalRevenue) * 100 : 0

                        return (
                          <>
                            <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${isSpacer ? "text-white" : ""}`}>
                              {isSpacer ? "-" : (current !== 0 ? formatCurrency(current) : "-")}
                            </td>
                            <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${isSpacer ? "text-white" : ""}`}>
                              {isSpacer ? "-" : (prior !== 0 ? formatCurrency(prior) : "-")}
                            </td>
                            {columnMode === "variations" && (
                              <>
                                <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${isSpacer ? "text-white" : ""}`}>
                                  {isSpacer ? "-" : (variation !== null ? `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%` : "-")}
                                </td>
                                <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${isSpacer ? "text-white" : ""}`}>
                                  {isSpacer ? "-" : (variationAmount !== 0 ? formatCurrency(variationAmount) : "-")}
                                </td>
                              </>
                            )}
                            {columnMode === "percentage" && (
                              <>
                                <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${isSpacer ? "text-white" : ""}`}>
                                  {isSpacer ? "-" : (currentPercentage !== 0 ? `${currentPercentage.toFixed(1)}%` : "-")}
                                </td>
                                <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${isSpacer ? "text-white" : ""}`}>
                                  {isSpacer ? "-" : (priorPercentage !== 0 ? `${priorPercentage.toFixed(1)}%` : "-")}
                                </td>
                              </>
                            )}
                          </>
                        )
                      })()}
                    </>
                  )}
                  {view === "comparison" && columnMode === "comparison" && (
                    <>
                      {(() => {
                        return (
                          <>
                            {productNames.map(pName => {
                              const val = getProductValue(pName, row.label)
                              return (
                                <td key={pName} className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${isSpacer ? "text-white" : ""}`}>
                                  {isSpacer ? "-" : (val !== 0 ? formatCurrency(val) : "-")}
                                </td>
                              )
                            })}
                          </>
                        )
                      })()}
                    </>
                  )}
                  {(view === "ytd" || view === "ddm") && columnMode !== "comparison" && (
                    <>
                      {(() => {
                        const current = row.grossProfit !== 0 ? row.grossProfit : row.revenue !== 0 ? row.revenue : row.costs !== 0 ? row.costs : 0
                        const prior = row.grossProfitPrior !== undefined && row.grossProfitPrior !== 0 ? row.grossProfitPrior : row.revenuePrior !== undefined && row.revenuePrior !== 0 ? row.revenuePrior : row.costsPrior !== undefined && row.costsPrior !== 0 ? row.costsPrior : 0
                        const variation = current && prior ? calculateVariation(current, prior) : null
                        const variationAmount = current && prior ? current - prior : 0
                        const totalRevenue = productData.find(r => r.label === "Revenus totaux" || r.label === "Total Revenus")?.revenue || productData.find(r => r.label === "Revenus")?.revenue || 0
                        const currentPercentage = totalRevenue !== 0 ? (current / totalRevenue) * 100 : 0
                        const priorPercentage = totalRevenue !== 0 ? (prior / totalRevenue) * 100 : 0

                        return (
                          <>
                            <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${isSpacer ? "text-white" : ""}`}>
                              {isSpacer ? "-" : (current !== 0 ? formatCurrency(current) : "-")}
                            </td>
                            <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${isSpacer ? "text-white" : ""}`}>
                              {isSpacer ? "-" : (prior !== 0 ? formatCurrency(prior) : "-")}
                            </td>
                            {columnMode === "variations" && (
                              <>
                                <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${isSpacer ? "text-white" : ""}`}>
                                  {isSpacer ? "-" : (variation !== null ? `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%` : "-")}
                                </td>
                                <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${isSpacer ? "text-white" : ""}`}>
                                  {isSpacer ? "-" : (variationAmount !== 0 ? formatCurrency(variationAmount) : "-")}
                                </td>
                              </>
                            )}
                            {columnMode === "percentage" && (
                              <>
                                <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${isSpacer ? "text-white" : ""}`}>
                                  {isSpacer ? "-" : (currentPercentage !== 0 ? `${currentPercentage.toFixed(1)}%` : "-")}
                                </td>
                                <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${isSpacer ? "text-white" : ""}`}>
                                  {isSpacer ? "-" : (priorPercentage !== 0 ? `${priorPercentage.toFixed(1)}%` : "-")}
                                </td>
                              </>
                            )}
                          </>
                        )
                      })()}
                    </>
                  )}
                  {(view === "ytd" || view === "ddm") && columnMode === "comparison" && (
                    <>
                      {(() => {
                        return (
                          <>
                            {productNames.map(pName => {
                              const val = getProductValue(pName, row.label)
                              return (
                                <td key={pName} className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${isSpacer ? "text-white" : ""}`}>
                                  {isSpacer ? "-" : (val !== 0 ? formatCurrency(val) : "-")}
                                </td>
                              )
                            })}
                          </>
                        )
                      })()}
                    </>
                  )}
                  {(view === "12months" || view === "24months" || view === "quarters" || view === "years") && (
                    <>
                      {row.trendValues?.map((trend, idx) => {
                        const isGrossMarginRow = row.label === "Marge brute (%)"

                        return (
                          <td key={idx} className={`px-4 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${isSpacer ? "text-white" : ""}`}>
                            {isSpacer ? "-" : isGrossMarginRow && trend.grossMargin !== undefined && trend.grossMargin !== 0 ? (
                              `${trend.grossMargin.toFixed(1)}%`
                            ) : (
                              trend.grossProfit !== 0 ? formatCurrency(trend.grossProfit) : trend.revenue !== 0 ? formatCurrency(trend.revenue) : trend.costs !== 0 ? formatCurrency(trend.costs) : "-"
                            )}
                          </td>
                        )
                      })}
                      {!row.trendValues && (
                        <>
                          {Array.from({ length: view === "12months" ? 12 : view === "24months" ? 24 : view === "quarters" ? 5 : 6 }).map((_, idx) => (
                            <td key={idx} className="px-4 py-3 text-right font-semibold text-white">
                              -
                            </td>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      )}

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
            page="product-margin"
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
