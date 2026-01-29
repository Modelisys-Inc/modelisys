"use client"

import { useState } from "react"
import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { Company } from "@/components/entity-selector"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ChevronDown, StickyNote } from "lucide-react"
import { NoteModal } from "@/components/note-modal"
import { getNoteByRowId } from "@/lib/notes-storage"
import { cn } from "@/lib/utils"

interface ProductMarginAnalysisProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "comparison" | "ytd" | "ddm" | "12months" | "24months" | "quarters" | "years"
  columnMode: "variations" | "percentage" | "comparison"
  selectedProduct?: "total" | "product_a" | "product_b" | "service_c"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
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
  rowId?: string // Unique ID for notes
}

// Helper functions to generate data
const getProductAnalysisData = (
  period: "monthly" | "quarterly" | "annual",
  view: "current" | "12months" | "years",
  selectedProduct: "total" | "product_a" | "product_b" | "service_c" = "total"
): ProductRow[] => {
  const periodMultiplier = period === "monthly" ? 1 : period === "quarterly" ? 3 : 12
  
  // Base values for Product A
  const baseRevenueA = 120000 * periodMultiplier
  const baseRevenueA1 = 80000 * periodMultiplier // Ventes - Services
  const baseRevenueA2 = 40000 * periodMultiplier // Ventes - Produits
  const baseCostsA = 72000 * periodMultiplier
  const baseCostsA1 = 48000 * periodMultiplier // Coût - Services
  const baseCostsA2 = 24000 * periodMultiplier // Coût - Produits
  
  // Base values for Product B
  const baseRevenueB = 95000 * periodMultiplier
  const baseRevenueB1 = 60000 * periodMultiplier // Ventes - Services
  const baseRevenueB2 = 35000 * periodMultiplier // Ventes - Produits
  const baseCostsB = 66500 * periodMultiplier
  const baseCostsB1 = 42000 * periodMultiplier // Coût - Services
  const baseCostsB2 = 24500 * periodMultiplier // Coût - Produits
  
  // Base values for Service C
  const baseRevenueC = 60000 * periodMultiplier
  const baseRevenueC1 = 60000 * periodMultiplier // Ventes - Services
  const baseCostsC = 36000 * periodMultiplier
  const baseCostsC1 = 36000 * periodMultiplier // Coût - Services

  // Calculate totals (used for "total" selection)
  const totalRevenue = baseRevenueA + baseRevenueB + baseRevenueC
  const totalCosts = baseCostsA + baseCostsB + baseCostsC
  const totalGrossProfit = totalRevenue - totalCosts
  const totalGrossMargin = totalRevenue !== 0 ? (totalGrossProfit / totalRevenue) * 100 : 0

  if (view === "12months" || view === "quarters" || view === "years") {
    const count = view === "12months" ? 12 : view === "quarters" ? 5 : 6
    const growthRate = view === "years" ? 0.08 : view === "12months" ? 0.02 : 0.03
    
    const generateTrend = (base: number) => {
      return Array.from({ length: count }, (_, i) => {
        const multiplier = 1 + (i * growthRate)
        return base * multiplier
      })
    }
    
    // Calculate totals for trend views
    const totalRevenueTrend = generateTrend(totalRevenue)
    const totalCostsTrend = generateTrend(totalCosts)
    const totalGrossProfitTrend = totalRevenueTrend.map((rev, i) => rev - totalCostsTrend[i])
    
    // If "total" is selected, return only totals
    if (selectedProduct === "total") {
    return [
        { label: "Revenus totaux", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: totalRevenueTrend.map(r => ({ revenue: r, costs: 0, grossProfit: 0, grossMargin: 0 })), isBold: true, isSubtotal: true, accountId: "total_revenue" },
        { label: "Coût des produits vendus totaux", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: totalCostsTrend.map(c => ({ revenue: 0, costs: c, grossProfit: 0, grossMargin: 0 })), isBold: true, isSubtotal: true, accountId: "total_cogs" },
        { label: "Bénéfice brut totaux", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: totalGrossProfitTrend.map((gp, i) => ({ revenue: 0, costs: 0, grossProfit: gp, grossMargin: totalRevenueTrend[i] !== 0 ? (gp / totalRevenueTrend[i]) * 100 : 0 })), isBold: true, isSubtotal: true, accountId: "total_gross_profit" },
      ]
    }
    
    // Filter by selected product for trend views
    let productTrendRows: ProductRow[] = []
    
    if (selectedProduct === "product_a") {
      productTrendRows = [
        // PRODUIT A (section header removed - shown in card title)
        { label: "Revenus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, isBold: true, isSection: true, accountId: "product_a_revenue_section" },
        { label: "Ventes - Services", revenue: baseRevenueA1, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseRevenueA1).map(r => ({ revenue: r, costs: 0, grossProfit: 0, grossMargin: 0 })), indent: true, accountId: "product_a_revenue_services", rowId: "product_a_revenue_services" },
        { label: "Ventes - Produits", revenue: baseRevenueA2, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseRevenueA2).map(r => ({ revenue: r, costs: 0, grossProfit: 0, grossMargin: 0 })), indent: true, accountId: "product_a_revenue_products", rowId: "product_a_revenue_products" },
        { label: "Total Revenus", revenue: baseRevenueA, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseRevenueA).map(r => ({ revenue: r, costs: 0, grossProfit: 0, grossMargin: 0 })), isBold: true, isSubtotal: true, accountId: "product_a_revenue_total", rowId: "product_a_revenue_total" },
        { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0 },
        { label: "Coût des produits vendus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, isBold: true, isSection: true, accountId: "product_a_cogs_section" },
        { label: "Coût - Services", revenue: 0, costs: baseCostsA1, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseCostsA1).map(c => ({ revenue: 0, costs: c, grossProfit: 0, grossMargin: 0 })), indent: true, accountId: "product_a_cogs_services", rowId: "product_a_cogs_services" },
        { label: "Coût - Produits", revenue: 0, costs: baseCostsA2, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseCostsA2).map(c => ({ revenue: 0, costs: c, grossProfit: 0, grossMargin: 0 })), indent: true, accountId: "product_a_cogs_products", rowId: "product_a_cogs_products" },
        { label: "Total COGS", revenue: 0, costs: baseCostsA, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseCostsA).map(c => ({ revenue: 0, costs: c, grossProfit: 0, grossMargin: 0 })), isBold: true, isSubtotal: true, accountId: "product_a_cogs_total", rowId: "product_a_cogs_total" },
        { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0 },
        { label: "Bénéfice brut", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseRevenueA).map((r, i) => {
          const costs = generateTrend(baseCostsA)[i]
          const grossProfit = r - costs
          const grossMargin = r !== 0 ? (grossProfit / r) * 100 : 0
          return { revenue: 0, costs: 0, grossProfit, grossMargin }
        }), isBold: true, isResult: true, accountId: "product_a_gross_profit", rowId: "product_a_gross_profit" },
        { label: "Marge brute (%)", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseRevenueA).map((r, i) => {
          const costs = generateTrend(baseCostsA)[i]
          const grossProfit = r - costs
          const grossMargin = r !== 0 ? (grossProfit / r) * 100 : 0
          return { revenue: 0, costs: 0, grossProfit: 0, grossMargin }
        }), isBold: true, isResult: true, accountId: "product_a_gross_margin", rowId: "product_a_gross_margin" },
      ]
    } else if (selectedProduct === "product_b") {
      productTrendRows = [
        // PRODUIT B (section header removed - shown in card title)
        { label: "Revenus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, isBold: true, isSection: true, accountId: "product_b_revenue_section" },
        { label: "Ventes - Services", revenue: baseRevenueB1, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseRevenueB1).map(r => ({ revenue: r, costs: 0, grossProfit: 0, grossMargin: 0 })), indent: true, accountId: "product_b_revenue_services", rowId: "product_b_revenue_services" },
        { label: "Ventes - Produits", revenue: baseRevenueB2, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseRevenueB2).map(r => ({ revenue: r, costs: 0, grossProfit: 0, grossMargin: 0 })), indent: true, accountId: "product_b_revenue_products", rowId: "product_b_revenue_products" },
        { label: "Total Revenus", revenue: baseRevenueB, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseRevenueB).map(r => ({ revenue: r, costs: 0, grossProfit: 0, grossMargin: 0 })), isBold: true, isSubtotal: true, accountId: "product_b_revenue_total", rowId: "product_b_revenue_total" },
        { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0 },
        { label: "Coût des produits vendus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, isBold: true, isSection: true, accountId: "product_b_cogs_section" },
        { label: "Coût - Services", revenue: 0, costs: baseCostsB1, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseCostsB1).map(c => ({ revenue: 0, costs: c, grossProfit: 0, grossMargin: 0 })), indent: true, accountId: "product_b_cogs_services", rowId: "product_b_cogs_services" },
        { label: "Coût - Produits", revenue: 0, costs: baseCostsB2, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseCostsB2).map(c => ({ revenue: 0, costs: c, grossProfit: 0, grossMargin: 0 })), indent: true, accountId: "product_b_cogs_products", rowId: "product_b_cogs_products" },
        { label: "Total COGS", revenue: 0, costs: baseCostsB, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseCostsB).map(c => ({ revenue: 0, costs: c, grossProfit: 0, grossMargin: 0 })), isBold: true, isSubtotal: true, accountId: "product_b_cogs_total", rowId: "product_b_cogs_total" },
        { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0 },
        { label: "Bénéfice brut", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseRevenueB).map((r, i) => {
          const costs = generateTrend(baseCostsB)[i]
          const grossProfit = r - costs
          const grossMargin = r !== 0 ? (grossProfit / r) * 100 : 0
          return { revenue: 0, costs: 0, grossProfit, grossMargin }
        }), isBold: true, isResult: true, accountId: "product_b_gross_profit", rowId: "product_b_gross_profit" },
        { label: "Marge brute (%)", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseRevenueB).map((r, i) => {
          const costs = generateTrend(baseCostsB)[i]
          const grossProfit = r - costs
          const grossMargin = r !== 0 ? (grossProfit / r) * 100 : 0
          return { revenue: 0, costs: 0, grossProfit: 0, grossMargin }
        }), isBold: true, isResult: true, accountId: "product_b_gross_margin", rowId: "product_b_gross_margin" },
      ]
    } else if (selectedProduct === "service_c") {
      productTrendRows = [
        // SERVICE C (section header removed - shown in card title)
        { label: "Revenus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, isBold: true, isSection: true, accountId: "service_c_revenue_section" },
        { label: "Ventes - Services", revenue: baseRevenueC1, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseRevenueC1).map(r => ({ revenue: r, costs: 0, grossProfit: 0, grossMargin: 0 })), indent: true, accountId: "service_c_revenue_services", rowId: "service_c_revenue_services" },
        { label: "Total Revenus", revenue: baseRevenueC, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseRevenueC).map(r => ({ revenue: r, costs: 0, grossProfit: 0, grossMargin: 0 })), isBold: true, isSubtotal: true, accountId: "service_c_revenue_total", rowId: "service_c_revenue_total" },
        { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0 },
        { label: "Coût des produits vendus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, isBold: true, isSection: true, accountId: "service_c_cogs_section" },
        { label: "Coût - Services", revenue: 0, costs: baseCostsC1, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseCostsC1).map(c => ({ revenue: 0, costs: c, grossProfit: 0, grossMargin: 0 })), indent: true, accountId: "service_c_cogs_services", rowId: "service_c_cogs_services" },
        { label: "Total COGS", revenue: 0, costs: baseCostsC, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseCostsC).map(c => ({ revenue: 0, costs: c, grossProfit: 0, grossMargin: 0 })), isBold: true, isSubtotal: true, accountId: "service_c_cogs_total", rowId: "service_c_cogs_total" },
        { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0 },
        { label: "Bénéfice brut", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseRevenueC).map((r, i) => {
          const costs = generateTrend(baseCostsC)[i]
          const grossProfit = r - costs
          const grossMargin = r !== 0 ? (grossProfit / r) * 100 : 0
          return { revenue: 0, costs: 0, grossProfit, grossMargin }
        }), isBold: true, isResult: true, accountId: "service_c_gross_profit", rowId: "service_c_gross_profit" },
        { label: "Marge brute (%)", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseRevenueC).map((r, i) => {
          const costs = generateTrend(baseCostsC)[i]
          const grossProfit = r - costs
          const grossMargin = r !== 0 ? (grossProfit / r) * 100 : 0
          return { revenue: 0, costs: 0, grossProfit: 0, grossMargin }
        }), isBold: true, isResult: true, accountId: "service_c_gross_margin", rowId: "service_c_gross_margin" },
      ]
    }
    
    return productTrendRows.length > 0 ? productTrendRows : [
      // PRODUIT A
      { label: "PRODUIT A", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, isBold: true, isSection: true, accountId: "product_a_section" },
      { label: "Revenus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, isBold: true, isSection: true, accountId: "product_a_revenue_section" },
      { label: "Ventes - Services", revenue: baseRevenueA1, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseRevenueA1).map(r => ({ revenue: r, costs: 0, grossProfit: 0, grossMargin: 0 })), indent: true, accountId: "product_a_revenue_services" },
      { label: "Ventes - Produits", revenue: baseRevenueA2, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseRevenueA2).map(r => ({ revenue: r, costs: 0, grossProfit: 0, grossMargin: 0 })), indent: true, accountId: "product_a_revenue_products" },
      { label: "Total Revenus", revenue: baseRevenueA, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseRevenueA).map(r => ({ revenue: r, costs: 0, grossProfit: 0, grossMargin: 0 })), isBold: true, isSubtotal: true, accountId: "product_a_revenue_total" },
      { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0 },
      { label: "Coût des produits vendus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, isBold: true, isSection: true, accountId: "product_a_cogs_section" },
      { label: "Coût - Services", revenue: 0, costs: baseCostsA1, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseCostsA1).map(c => ({ revenue: 0, costs: c, grossProfit: 0, grossMargin: 0 })), indent: true, accountId: "product_a_cogs_services" },
      { label: "Coût - Produits", revenue: 0, costs: baseCostsA2, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseCostsA2).map(c => ({ revenue: 0, costs: c, grossProfit: 0, grossMargin: 0 })), indent: true, accountId: "product_a_cogs_products" },
      { label: "Total COGS", revenue: 0, costs: baseCostsA, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseCostsA).map(c => ({ revenue: 0, costs: c, grossProfit: 0, grossMargin: 0 })), isBold: true, isSubtotal: true, accountId: "product_a_cogs_total" },
      { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0 },
      { label: "Bénéfice brut", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseRevenueA).map((r, i) => ({ revenue: 0, costs: 0, grossProfit: r - generateTrend(baseCostsA)[i], grossMargin: 0 })), isBold: true, isResult: true, accountId: "product_a_gross_profit" },
      { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0 },
      
      // PRODUIT B
      { label: "PRODUIT B", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, isBold: true, isSection: true, accountId: "product_b_section" },
      { label: "Revenus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, isBold: true, isSection: true, accountId: "product_b_revenue_section" },
      { label: "Ventes - Services", revenue: baseRevenueB1, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseRevenueB1).map(r => ({ revenue: r, costs: 0, grossProfit: 0, grossMargin: 0 })), indent: true, accountId: "product_b_revenue_services" },
      { label: "Ventes - Produits", revenue: baseRevenueB2, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseRevenueB2).map(r => ({ revenue: r, costs: 0, grossProfit: 0, grossMargin: 0 })), indent: true, accountId: "product_b_revenue_products" },
      { label: "Total Revenus", revenue: baseRevenueB, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseRevenueB).map(r => ({ revenue: r, costs: 0, grossProfit: 0, grossMargin: 0 })), isBold: true, isSubtotal: true, accountId: "product_b_revenue_total" },
      { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0 },
      { label: "Coût des produits vendus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, isBold: true, isSection: true, accountId: "product_b_cogs_section" },
      { label: "Coût - Services", revenue: 0, costs: baseCostsB1, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseCostsB1).map(c => ({ revenue: 0, costs: c, grossProfit: 0, grossMargin: 0 })), indent: true, accountId: "product_b_cogs_services" },
      { label: "Coût - Produits", revenue: 0, costs: baseCostsB2, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseCostsB2).map(c => ({ revenue: 0, costs: c, grossProfit: 0, grossMargin: 0 })), indent: true, accountId: "product_b_cogs_products" },
      { label: "Total COGS", revenue: 0, costs: baseCostsB, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseCostsB).map(c => ({ revenue: 0, costs: c, grossProfit: 0, grossMargin: 0 })), isBold: true, isSubtotal: true, accountId: "product_b_cogs_total" },
      { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0 },
      { label: "Bénéfice brut", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseRevenueB).map((r, i) => ({ revenue: 0, costs: 0, grossProfit: r - generateTrend(baseCostsB)[i], grossMargin: 0 })), isBold: true, isResult: true, accountId: "product_b_gross_profit" },
      { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0 },
      
      // SERVICE C
      { label: "SERVICE C", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, isBold: true, isSection: true, accountId: "service_c_section" },
      { label: "Revenus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, isBold: true, isSection: true, accountId: "service_c_revenue_section" },
      { label: "Ventes - Services", revenue: baseRevenueC1, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseRevenueC1).map(r => ({ revenue: r, costs: 0, grossProfit: 0, grossMargin: 0 })), indent: true, accountId: "service_c_revenue_services" },
      { label: "Total Revenus", revenue: baseRevenueC, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseRevenueC).map(r => ({ revenue: r, costs: 0, grossProfit: 0, grossMargin: 0 })), isBold: true, isSubtotal: true, accountId: "service_c_revenue_total" },
      { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0 },
      { label: "Coût des produits vendus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, isBold: true, isSection: true, accountId: "service_c_cogs_section" },
      { label: "Coût - Services", revenue: 0, costs: baseCostsC1, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseCostsC1).map(c => ({ revenue: 0, costs: c, grossProfit: 0, grossMargin: 0 })), indent: true, accountId: "service_c_cogs_services" },
      { label: "Total COGS", revenue: 0, costs: baseCostsC, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseCostsC).map(c => ({ revenue: 0, costs: c, grossProfit: 0, grossMargin: 0 })), isBold: true, isSubtotal: true, accountId: "service_c_cogs_total" },
      { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0 },
      { label: "Bénéfice brut", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, trendValues: generateTrend(baseRevenueC).map((r, i) => ({ revenue: 0, costs: 0, grossProfit: r - generateTrend(baseCostsC)[i], grossMargin: 0 })), isBold: true, isResult: true, accountId: "service_c_gross_profit" },
    ]
  }
  
  // Current view
  const priorRevenueA = baseRevenueA * 0.92
  const priorRevenueA1 = baseRevenueA1 * 0.92
  const priorRevenueA2 = baseRevenueA2 * 0.92
  const priorCostsA = baseCostsA * 0.92
  const priorCostsA1 = baseCostsA1 * 0.92
  const priorCostsA2 = baseCostsA2 * 0.92
  
  const priorRevenueB = baseRevenueB * 0.92
  const priorRevenueB1 = baseRevenueB1 * 0.92
  const priorRevenueB2 = baseRevenueB2 * 0.92
  const priorCostsB = baseCostsB * 0.92
  const priorCostsB1 = baseCostsB1 * 0.92
  const priorCostsB2 = baseCostsB2 * 0.92
  
  const priorRevenueC = baseRevenueC * 0.92
  const priorRevenueC1 = baseRevenueC1 * 0.92
  const priorCostsC = baseCostsC * 0.92
  const priorCostsC1 = baseCostsC1 * 0.92
  
  // Calculate totals for prior period
  const totalRevenuePrior = priorRevenueA + priorRevenueB + priorRevenueC
  const totalCostsPrior = priorCostsA + priorCostsB + priorCostsC
  const totalGrossProfitPrior = totalRevenuePrior - totalCostsPrior
  const totalGrossMarginPrior = totalRevenuePrior !== 0 ? (totalGrossProfitPrior / totalRevenuePrior) * 100 : 0
  
  // If "total" is selected, return only totals
  if (selectedProduct === "total") {
  return [
      { label: "Revenus totaux", revenue: totalRevenue, costs: 0, grossProfit: totalGrossProfit, grossMargin: totalGrossMargin, revenuePrior: totalRevenuePrior, costsPrior: 0, grossProfitPrior: totalGrossProfitPrior, grossMarginPrior: totalGrossMarginPrior, isBold: true, isSubtotal: true, accountId: "total_revenue", rowId: "total_revenue" },
      { label: "Coût des produits vendus totaux", revenue: 0, costs: totalCosts, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: totalCostsPrior, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSubtotal: true, accountId: "total_cogs", rowId: "total_cogs" },
      { label: "Bénéfice brut totaux", revenue: 0, costs: 0, grossProfit: totalGrossProfit, grossMargin: totalGrossMargin, revenuePrior: 0, costsPrior: 0, grossProfitPrior: totalGrossProfitPrior, grossMarginPrior: totalGrossMarginPrior, isBold: true, isSubtotal: true, accountId: "total_gross_profit", rowId: "total_gross_profit" },
    ]
  }
  
  // Filter by selected product
  let productRows: ProductRow[] = []
  
  if (selectedProduct === "product_a") {
    productRows = [
      // PRODUIT A (section header removed - shown in card title)
      { label: "Revenus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSection: true, accountId: "product_a_revenue_section" },
      { label: "Ventes - Services", revenue: baseRevenueA1, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: priorRevenueA1, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, indent: true, accountId: "product_a_revenue_services", rowId: "product_a_revenue_services" },
      { label: "Ventes - Produits", revenue: baseRevenueA2, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: priorRevenueA2, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, indent: true, accountId: "product_a_revenue_products", rowId: "product_a_revenue_products" },
      { label: "Total Revenus", revenue: baseRevenueA, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: priorRevenueA, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSubtotal: true, accountId: "product_a_revenue_total", rowId: "product_a_revenue_total" },
      { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0 },
      { label: "Coût des produits vendus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSection: true, accountId: "product_a_cogs_section" },
      { label: "Coût - Services", revenue: 0, costs: baseCostsA1, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: priorCostsA1, grossProfitPrior: 0, grossMarginPrior: 0, indent: true, accountId: "product_a_cogs_services", rowId: "product_a_cogs_services" },
      { label: "Coût - Produits", revenue: 0, costs: baseCostsA2, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: priorCostsA2, grossProfitPrior: 0, grossMarginPrior: 0, indent: true, accountId: "product_a_cogs_products", rowId: "product_a_cogs_products" },
      { label: "Total COGS", revenue: 0, costs: baseCostsA, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: priorCostsA, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSubtotal: true, accountId: "product_a_cogs_total", rowId: "product_a_cogs_total" },
      { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0 },
      { label: "Bénéfice brut", revenue: 0, costs: 0, grossProfit: baseRevenueA - baseCostsA, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: priorRevenueA - priorCostsA, grossMarginPrior: 0, isBold: true, isResult: true, accountId: "product_a_gross_profit", rowId: "product_a_gross_profit" },
    ]
  } else if (selectedProduct === "product_b") {
    productRows = [
      // PRODUIT B (section header removed - shown in card title)
      { label: "Revenus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSection: true, accountId: "product_b_revenue_section" },
      { label: "Ventes - Services", revenue: baseRevenueB1, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: priorRevenueB1, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, indent: true, accountId: "product_b_revenue_services", rowId: "product_b_revenue_services" },
      { label: "Ventes - Produits", revenue: baseRevenueB2, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: priorRevenueB2, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, indent: true, accountId: "product_b_revenue_products", rowId: "product_b_revenue_products" },
      { label: "Total Revenus", revenue: baseRevenueB, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: priorRevenueB, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSubtotal: true, accountId: "product_b_revenue_total", rowId: "product_b_revenue_total" },
      { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0 },
      { label: "Coût des produits vendus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSection: true, accountId: "product_b_cogs_section" },
      { label: "Coût - Services", revenue: 0, costs: baseCostsB1, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: priorCostsB1, grossProfitPrior: 0, grossMarginPrior: 0, indent: true, accountId: "product_b_cogs_services", rowId: "product_b_cogs_services" },
      { label: "Coût - Produits", revenue: 0, costs: baseCostsB2, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: priorCostsB2, grossProfitPrior: 0, grossMarginPrior: 0, indent: true, accountId: "product_b_cogs_products", rowId: "product_b_cogs_products" },
      { label: "Total COGS", revenue: 0, costs: baseCostsB, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: priorCostsB, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSubtotal: true, accountId: "product_b_cogs_total", rowId: "product_b_cogs_total" },
      { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0 },
      { label: "Bénéfice brut", revenue: 0, costs: 0, grossProfit: baseRevenueB - baseCostsB, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: priorRevenueB - priorCostsB, grossMarginPrior: 0, isBold: true, isResult: true, accountId: "product_b_gross_profit", rowId: "product_b_gross_profit" },
    ]
  } else if (selectedProduct === "service_c") {
    productRows = [
      // SERVICE C (section header removed - shown in card title)
      { label: "Revenus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSection: true, accountId: "service_c_revenue_section" },
      { label: "Ventes - Services", revenue: baseRevenueC1, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: priorRevenueC1, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, indent: true, accountId: "service_c_revenue_services", rowId: "service_c_revenue_services" },
      { label: "Total Revenus", revenue: baseRevenueC, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: priorRevenueC, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSubtotal: true, accountId: "service_c_revenue_total", rowId: "service_c_revenue_total" },
      { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0 },
      { label: "Coût des produits vendus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSection: true, accountId: "service_c_cogs_section" },
      { label: "Coût - Services", revenue: 0, costs: baseCostsC1, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: priorCostsC1, grossProfitPrior: 0, grossMarginPrior: 0, indent: true, accountId: "service_c_cogs_services", rowId: "service_c_cogs_services" },
      { label: "Total COGS", revenue: 0, costs: baseCostsC, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: priorCostsC, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSubtotal: true, accountId: "service_c_cogs_total", rowId: "service_c_cogs_total" },
      { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0 },
      { label: "Bénéfice brut", revenue: 0, costs: 0, grossProfit: baseRevenueC - baseCostsC, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: priorRevenueC - priorCostsC, grossMarginPrior: 0, isBold: true, isResult: true, accountId: "service_c_gross_profit", rowId: "service_c_gross_profit" },
    ]
  }
  
  return productRows.length > 0 ? productRows : [
    // PRODUIT A
    { label: "PRODUIT A", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSection: true, accountId: "product_a_section" },
    { label: "Revenus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSection: true, accountId: "product_a_revenue_section" },
    { label: "Ventes - Services", revenue: baseRevenueA1, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: priorRevenueA1, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, indent: true, accountId: "product_a_revenue_services" },
    { label: "Ventes - Produits", revenue: baseRevenueA2, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: priorRevenueA2, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, indent: true, accountId: "product_a_revenue_products" },
    { label: "Total Revenus", revenue: baseRevenueA, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: priorRevenueA, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSubtotal: true, accountId: "product_a_revenue_total" },
    { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0 },
    { label: "Coût des produits vendus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSection: true, accountId: "product_a_cogs_section" },
    { label: "Coût - Services", revenue: 0, costs: baseCostsA1, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: priorCostsA1, grossProfitPrior: 0, grossMarginPrior: 0, indent: true, accountId: "product_a_cogs_services" },
    { label: "Coût - Produits", revenue: 0, costs: baseCostsA2, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: priorCostsA2, grossProfitPrior: 0, grossMarginPrior: 0, indent: true, accountId: "product_a_cogs_products" },
    { label: "Total COGS", revenue: 0, costs: baseCostsA, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: priorCostsA, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSubtotal: true, accountId: "product_a_cogs_total" },
    { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0 },
    { label: "Bénéfice brut", revenue: 0, costs: 0, grossProfit: baseRevenueA - baseCostsA, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: priorRevenueA - priorCostsA, grossMarginPrior: 0, isBold: true, isResult: true, accountId: "product_a_gross_profit" },
    { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0 },
    
    // PRODUIT B
    { label: "PRODUIT B", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSection: true, accountId: "product_b_section" },
    { label: "Revenus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSection: true, accountId: "product_b_revenue_section" },
    { label: "Ventes - Services", revenue: baseRevenueB1, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: priorRevenueB1, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, indent: true, accountId: "product_b_revenue_services" },
    { label: "Ventes - Produits", revenue: baseRevenueB2, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: priorRevenueB2, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, indent: true, accountId: "product_b_revenue_products" },
    { label: "Total Revenus", revenue: baseRevenueB, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: priorRevenueB, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSubtotal: true, accountId: "product_b_revenue_total" },
    { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0 },
    { label: "Coût des produits vendus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSection: true, accountId: "product_b_cogs_section" },
    { label: "Coût - Services", revenue: 0, costs: baseCostsB1, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: priorCostsB1, grossProfitPrior: 0, grossMarginPrior: 0, indent: true, accountId: "product_b_cogs_services" },
    { label: "Coût - Produits", revenue: 0, costs: baseCostsB2, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: priorCostsB2, grossProfitPrior: 0, grossMarginPrior: 0, indent: true, accountId: "product_b_cogs_products" },
    { label: "Total COGS", revenue: 0, costs: baseCostsB, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: priorCostsB, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSubtotal: true, accountId: "product_b_cogs_total" },
    { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0 },
    { label: "Bénéfice brut", revenue: 0, costs: 0, grossProfit: baseRevenueB - baseCostsB, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: priorRevenueB - priorCostsB, grossMarginPrior: 0, isBold: true, isResult: true, accountId: "product_b_gross_profit" },
    { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0 },
    
    // SERVICE C
    { label: "SERVICE C", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSection: true, accountId: "service_c_section" },
    { label: "Revenus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSection: true, accountId: "service_c_revenue_section" },
    { label: "Ventes - Services", revenue: baseRevenueC1, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: priorRevenueC1, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, indent: true, accountId: "service_c_revenue_services" },
    { label: "Total Revenus", revenue: baseRevenueC, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: priorRevenueC, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSubtotal: true, accountId: "service_c_revenue_total" },
    { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0 },
    { label: "Coût des produits vendus", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSection: true, accountId: "service_c_cogs_section" },
    { label: "Coût - Services", revenue: 0, costs: baseCostsC1, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: priorCostsC1, grossProfitPrior: 0, grossMarginPrior: 0, indent: true, accountId: "service_c_cogs_services" },
    { label: "Total COGS", revenue: 0, costs: baseCostsC, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: priorCostsC, grossProfitPrior: 0, grossMarginPrior: 0, isBold: true, isSubtotal: true, accountId: "service_c_cogs_total" },
    { label: "", revenue: 0, costs: 0, grossProfit: 0, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: 0, grossMarginPrior: 0 },
    { label: "Bénéfice brut", revenue: 0, costs: 0, grossProfit: baseRevenueC - baseCostsC, grossMargin: 0, revenuePrior: 0, costsPrior: 0, grossProfitPrior: priorRevenueC - priorCostsC, grossMarginPrior: 0, isBold: true, isResult: true, accountId: "service_c_gross_profit" },
  ]
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
}: ProductMarginAnalysisProps) {
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

  // In comparison mode, always use "total" view for row structure
  const baseProductData = columnMode === "comparison" ? getProductAnalysisData(period, view, "total") : getProductAnalysisData(period, view, selectedProduct)
  const productData = baseProductData
  
  // Get data for each product for comparison mode
  const productAData = columnMode === "comparison" ? getProductAnalysisData(period, view, "product_a") : []
  const productBData = columnMode === "comparison" ? getProductAnalysisData(period, view, "product_b") : []
  const productCData = columnMode === "comparison" ? getProductAnalysisData(period, view, "service_c") : []
  
  // Helper function to get value for a specific product and row label
  const getProductValue = (productRows: ProductRow[], label: string): number => {
    // Map labels from "total" view to individual product labels
    const labelMap: Record<string, string> = {
      "Revenus totaux": "Total Revenus",
      "Coût des produits vendus totaux": "Total COGS",
      "Bénéfice brut totaux": "Bénéfice brut",
    }
    
    // Try to find exact match first
    let row = productRows.find(r => r.label === label)
    
    // If not found, try mapped label
    if (!row && labelMap[label]) {
      row = productRows.find(r => r.label === labelMap[label])
    }
    
    // If still not found, try to find by partial match (for section headers)
    if (!row) {
      if (label === "Revenus totaux" || label === "Revenus") {
        row = productRows.find(r => r.label === "Total Revenus" || r.label === "Revenus")
      } else if (label === "Coût des produits vendus totaux" || label === "Coût des produits vendus") {
        row = productRows.find(r => r.label === "Total COGS" || r.label === "Coût des produits vendus")
      } else if (label === "Bénéfice brut totaux" || label === "Bénéfice brut") {
        row = productRows.find(r => r.label === "Bénéfice brut")
      }
    }
    
    if (!row) return 0
    
    // For current view, use prior values if available, otherwise current
    if (view === "comparison" || view === "ytd" || view === "ddm") {
      const current = row.grossProfit !== 0 ? row.grossProfit : row.revenue !== 0 ? row.revenue : row.costs !== 0 ? row.costs : 0
      return current
    }
    
    // For trend views, get the last value
    if (row.trendValues && row.trendValues.length > 0) {
      const lastTrend = row.trendValues[row.trendValues.length - 1]
      return lastTrend.grossProfit !== 0 ? lastTrend.grossProfit : lastTrend.revenue !== 0 ? lastTrend.revenue : lastTrend.costs !== 0 ? lastTrend.costs : 0
    }
    
    return 0
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

  // Calculate variation
  const calculateVariation = (current: number, prior: number): number => {
    if (prior === 0) return 0
    return ((current - prior) / prior) * 100
  }

  // Get column count based on view
  const getColumnCount = (): number => {
    if (view === "current") return 8 // Poste + Revenus + Charges + Bénéfice brut + Marge brute (Courant et Passé)
    if (view === "12months") return 14 // Poste + 12 mois
    if (view === "years") return 8 // Poste + 6 années
    return 8
  }

  // Get month labels
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

  // Get quarter labels
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

  // Get year labels
  const getYearLabels = (): string[] => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, i) => `${currentYear - 5 + i}`)
  }

  // Get product name for title
  const getProductName = (): string => {
    switch (selectedProduct) {
      case "product_a":
        return "Produit A"
      case "product_b":
        return "Produit B"
      case "service_c":
        return "Service C"
      case "total":
      default:
        return ""
    }
  }

  const productName = getProductName()
  const title = productName ? `Analyse par produit - ${productName}` : "Analyse par produit"

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

      {/* Table */}
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
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Produit A</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Produit B</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Service C</th>
                </>
              )}
              {view === "ytd" && columnMode !== "comparison" && (
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
              {view === "ytd" && columnMode === "comparison" && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Produit A</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Produit B</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Service C</th>
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
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Produit A</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Produit B</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Service C</th>
                </>
              )}
              {view === "12months" && (
                  <>
                    {getMonthLabels(12).map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">{label}</th>
                    ))}
                  </>
              )}
              {view === "quarters" && (
                <>
                  {getQuarterLabels().map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">{label}</th>
                    ))}
                  </>
              )}
              {view === "years" && (
                  <>
                    {getYearLabels().map((label, idx) => (
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
              
              // Check if next row is "Total Revenus", "Total COGS", or "Bénéfice brut"
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
                        // Get values for each product based on row label
                        const valueA = getProductValue(productAData, row.label)
                        const valueB = getProductValue(productBData, row.label)
                        const valueC = getProductValue(productCData, row.label)
                        
                        return (
                          <>
                            <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${isSpacer ? "text-white" : ""}`}>
                              {isSpacer ? "-" : (valueA !== 0 ? formatCurrency(valueA) : "-")}
                            </td>
                            <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${isSpacer ? "text-white" : ""}`}>
                              {isSpacer ? "-" : (valueB !== 0 ? formatCurrency(valueB) : "-")}
                            </td>
                            <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${isSpacer ? "text-white" : ""}`}>
                              {isSpacer ? "-" : (valueC !== 0 ? formatCurrency(valueC) : "-")}
                            </td>
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
                        // Get values for each product based on row label
                        const valueA = getProductValue(productAData, row.label)
                        const valueB = getProductValue(productBData, row.label)
                        const valueC = getProductValue(productCData, row.label)
                        
                        return (
                          <>
                            <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${isSpacer ? "text-white" : ""}`}>
                              {isSpacer ? "-" : (valueA !== 0 ? formatCurrency(valueA) : "-")}
                            </td>
                            <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${isSpacer ? "text-white" : ""}`}>
                              {isSpacer ? "-" : (valueB !== 0 ? formatCurrency(valueB) : "-")}
                            </td>
                            <td className={`px-6 py-3 text-right ${isBoldRow ? "font-semibold font-bold" : "text-slate-500"} ${isSpacer ? "text-white" : ""}`}>
                              {isSpacer ? "-" : (valueC !== 0 ? formatCurrency(valueC) : "-")}
                            </td>
                          </>
                        )
                      })()}
                    </>
                  )}
                  {(view === "12months" || view === "quarters" || view === "years") && (
                    <>
                      {row.trendValues?.map((trend, idx) => {
                        // Check if this is the "Marge brute (%)" row
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
                          {Array.from({ length: view === "12months" ? 12 : view === "quarters" ? 5 : 6 }).map((_, idx) => (
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

