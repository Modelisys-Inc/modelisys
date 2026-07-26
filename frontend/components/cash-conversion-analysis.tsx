"use client"

import { useMemo, type ReactNode } from "react"
import { Company } from "@/components/entity-selector"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { getRowAmounts, getPeriodLabels, aggregateToYears, findRow } from "@/lib/series-utils"
import { LayoutList } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  dashboardCardAccentClass,
  dashboardCardBodyMutedClass,
  dashboardCardFrameStaticClass,
  dashboardCardHeaderBarClass,
  dashboardCardHeaderIconBoxClass,
  dashboardCardRingClass,
  dashboardCardTitleClass,
} from "@/lib/dashboard-card-style"

interface CashConversionAnalysisProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "12months" | "24months" | "years"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  fiscalYear?: number
  /** Mois calendaire (1–12) de la date de référence — borne la série (pas de mois futurs). */
  referenceMonth?: number
}

/** Try multiple label variants to find a row. */
function findRowMulti(rows: import("@/lib/api").SeriesRow[], ...labels: string[]) {
  for (const label of labels) {
    const found = findRow(rows, label)
    if (found) return found
  }
  return undefined
}

export function CashConversionAnalysis({
  period,
  view,
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  fiscalYear,
  referenceMonth,
}: CashConversionAnalysisProps) {
  // Fetch balance-sheet and income-statement series data
  const resolvedYear = fiscalYear ?? new Date().getFullYear()
  const resolvedMonth = referenceMonth ?? new Date().getMonth() + 1
  const isMultiPeriod = view === "12months" || view === "24months" || view === "years"
  const monthsNeeded = view === "24months" ? 24 : view === "years" ? 60 : 12

  const { rows: bsRows, periods: bsPeriods, loading: bsLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "balance-sheet",
    fiscalYear: resolvedYear,
    month: resolvedMonth,
    months: monthsNeeded,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: !!companyId,
  })

  const { rows: isRows, periods: isPeriods, loading: isLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "income-statement",
    fiscalYear: resolvedYear,
    month: resolvedMonth,
    months: monthsNeeded,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: !!companyId,
  })

  const loading = bsLoading || isLoading

  // Build data from API rows
  const data = useMemo(() => {
    // Locate relevant rows in balance sheet
    const receivablesRow = findRowMulti(bsRows, "comptes clients", "clients", "accounts receivable", "receivables")
    const inventoryRow = findRowMulti(bsRows, "stocks", "inventaire", "inventory")
    const payablesRow = findRowMulti(bsRows, "comptes fournisseurs", "fournisseurs", "accounts payable", "payables")

    // Locate relevant rows in income statement
    const revenueRow = findRowMulti(isRows, "total revenus", "revenus", "revenue", "ventes", "chiffre d'affaires")
    const cogsRow = findRowMulti(isRows, "coût des ventes", "total coût", "coût des marchandises", "cost of sales", "cogs")

    // Use balance sheet periods as reference (both should match)
    const periods = bsPeriods

    if (periods.length === 0) {
      return {
        receivables: 0, priorReceivables: 0,
        inventory: 0, priorInventory: 0,
        payables: 0, priorPayables: 0,
        revenue: 0, priorRevenue: 0,
        cogs: 0, priorCogs: 0,
        trendValues: undefined as Array<{ receivables: number; inventory: number; payables: number; revenue: number; cogs: number }> | undefined,
        periodLabels: [] as string[],
      }
    }

    const receivablesAmounts = receivablesRow ? getRowAmounts(receivablesRow, periods) : periods.map(() => 0)
    const inventoryAmounts = inventoryRow ? getRowAmounts(inventoryRow, periods) : periods.map(() => 0)
    const payablesAmounts = payablesRow ? getRowAmounts(payablesRow, periods) : periods.map(() => 0)

    // Income statement amounts - use isPeriods since they come from a different hook
    const isPeriodsToUse = isPeriods.length > 0 ? isPeriods : periods
    const revenueAmountsRaw = revenueRow ? getRowAmounts(revenueRow, isPeriodsToUse) : isPeriodsToUse.map(() => 0)
    const cogsAmountsRaw = cogsRow ? getRowAmounts(cogsRow, isPeriodsToUse) : isPeriodsToUse.map(() => 0)

    // For yearly view, aggregate monthly amounts
    if (view === "years") {
      const recAgg = aggregateToYears(receivablesAmounts, periods)
      const invAgg = aggregateToYears(inventoryAmounts, periods)
      const payAgg = aggregateToYears(payablesAmounts, periods)
      const revAgg = aggregateToYears(revenueAmountsRaw, isPeriodsToUse)
      const cogsAgg = aggregateToYears(cogsAmountsRaw, isPeriodsToUse)

      const trendValues = recAgg.amounts.map((_, i) => ({
        receivables: Math.abs(recAgg.amounts[i]),
        inventory: Math.abs(invAgg.amounts[i]),
        payables: Math.abs(payAgg.amounts[i]),
        revenue: Math.abs(revAgg.amounts[i]),
        cogs: Math.abs(cogsAgg.amounts[i]),
      }))

      const last = trendValues.length - 1
      const prior = Math.max(0, last - 1)

      return {
        receivables: last >= 0 ? trendValues[last].receivables : 0,
        priorReceivables: prior >= 0 && last > 0 ? trendValues[prior].receivables : 0,
        inventory: last >= 0 ? trendValues[last].inventory : 0,
        priorInventory: prior >= 0 && last > 0 ? trendValues[prior].inventory : 0,
        payables: last >= 0 ? trendValues[last].payables : 0,
        priorPayables: prior >= 0 && last > 0 ? trendValues[prior].payables : 0,
        revenue: last >= 0 ? trendValues[last].revenue : 0,
        priorRevenue: prior >= 0 && last > 0 ? trendValues[prior].revenue : 0,
        cogs: last >= 0 ? trendValues[last].cogs : 0,
        priorCogs: prior >= 0 && last > 0 ? trendValues[prior].cogs : 0,
        trendValues,
        periodLabels: recAgg.labels,
      }
    }

    // For monthly views (12months, 24months, or current)
    const trendValues = receivablesAmounts.map((_, i) => ({
      receivables: Math.abs(receivablesAmounts[i]),
      inventory: Math.abs(inventoryAmounts[i]),
      payables: Math.abs(payablesAmounts[i]),
      revenue: Math.abs(revenueAmountsRaw[i] || 0),
      cogs: Math.abs(cogsAmountsRaw[i] || 0),
    }))

    const last = trendValues.length - 1
    const prior = Math.max(0, last - 1)

    return {
      receivables: last >= 0 ? trendValues[last].receivables : 0,
      priorReceivables: prior >= 0 && last > 0 ? trendValues[prior].receivables : 0,
      inventory: last >= 0 ? trendValues[last].inventory : 0,
      priorInventory: prior >= 0 && last > 0 ? trendValues[prior].inventory : 0,
      payables: last >= 0 ? trendValues[last].payables : 0,
      priorPayables: prior >= 0 && last > 0 ? trendValues[prior].payables : 0,
      revenue: last >= 0 ? trendValues[last].revenue : 0,
      priorRevenue: prior >= 0 && last > 0 ? trendValues[prior].revenue : 0,
      cogs: last >= 0 ? trendValues[last].cogs : 0,
      priorCogs: prior >= 0 && last > 0 ? trendValues[prior].cogs : 0,
      trendValues: isMultiPeriod ? trendValues : undefined,
      periodLabels: getPeriodLabels(periods),
    }
  }, [bsRows, bsPeriods, isRows, isPeriods, view, isMultiPeriod])

  // Number of trend columns to render
  const trendCount = data.trendValues?.length ?? 0

  // Helper to get days in period
  const getDaysInPeriod = (): number => {
    if (view === "years") return 365
    // For monthly-based views, use 30 days per period
    return 30
  }

  // Helper to get COGS, falling back to 60% of revenue if no COGS row found
  const getCogs = (revenue: number, cogsValue: number): number => {
    return cogsValue > 0 ? cogsValue : revenue * 0.6
  }

  // Calculate Days Sales Outstanding (DSO) - Délai de couvrement des clients
  const calculateDSO = (isPrior: boolean, trendIndex?: number): number => {
    if (trendIndex !== undefined && data.trendValues) {
      const receivables = data.trendValues[trendIndex]?.receivables || 0
      const revenue = data.trendValues[trendIndex]?.revenue || 0
      if (revenue === 0) return 0
      const days = getDaysInPeriod()
      return (receivables / revenue) * days
    }
    const receivables = isPrior ? data.priorReceivables : data.receivables
    const revenue = isPrior ? data.priorRevenue : data.revenue
    if (revenue === 0) return 0
    const days = getDaysInPeriod()
    return (receivables / revenue) * days
  }

  // Calculate Days Inventory Outstanding (DIO) - Délai de rotation des stocks
  const calculateDIO = (isPrior: boolean, trendIndex?: number): number => {
    if (trendIndex !== undefined && data.trendValues) {
      const inventory = data.trendValues[trendIndex]?.inventory || 0
      const revenue = data.trendValues[trendIndex]?.revenue || 0
      const cogsValue = data.trendValues[trendIndex]?.cogs || 0
      const cogs = getCogs(revenue, cogsValue)
      if (cogs === 0) return 0
      const days = getDaysInPeriod()
      return (inventory / cogs) * days
    }
    const inventory = isPrior ? data.priorInventory : data.inventory
    const revenue = isPrior ? data.priorRevenue : data.revenue
    const cogsValue = isPrior ? data.priorCogs : data.cogs
    const cogs = getCogs(revenue, cogsValue)
    if (cogs === 0) return 0
    const days = getDaysInPeriod()
    return (inventory / cogs) * days
  }

  // Calculate Days Payable Outstanding (DPO) - Délai de paiement des fournisseurs
  const calculateDPO = (isPrior: boolean, trendIndex?: number): number => {
    if (trendIndex !== undefined && data.trendValues) {
      const payables = data.trendValues[trendIndex]?.payables || 0
      const revenue = data.trendValues[trendIndex]?.revenue || 0
      const cogsValue = data.trendValues[trendIndex]?.cogs || 0
      const cogs = getCogs(revenue, cogsValue)
      if (cogs === 0) return 0
      const days = getDaysInPeriod()
      return (payables / cogs) * days
    }
    const payables = isPrior ? data.priorPayables : data.payables
    const revenue = isPrior ? data.priorRevenue : data.revenue
    const cogsValue = isPrior ? data.priorCogs : data.cogs
    const cogs = getCogs(revenue, cogsValue)
    if (cogs === 0) return 0
    const days = getDaysInPeriod()
    return (payables / cogs) * days
  }

  // Calculate Cash Conversion Cycle (CCC) - Cycle de conversion de l'encaisse
  const calculateCCC = (isPrior: boolean, trendIndex?: number): number => {
    const dso = calculateDSO(isPrior, trendIndex)
    const dio = calculateDIO(isPrior, trendIndex)
    const dpo = calculateDPO(isPrior, trendIndex)
    return dso + dio - dpo
  }

  // Period labels from real data
  const periodLabels = data.periodLabels

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

  const cardShell = (body: ReactNode, showMeta = false) => (
    <div className={cn("mb-6", dashboardCardFrameStaticClass)}>
      <div className={dashboardCardRingClass} aria-hidden />
      <div className={cn("px-6 py-5 sm:px-7", dashboardCardHeaderBarClass)}>
        <div className="flex min-w-0 items-start gap-4">
          <div className={dashboardCardHeaderIconBoxClass}>
            <LayoutList className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={cn("text-xl leading-tight", dashboardCardTitleClass)}>
              Analyse de la conversion de l&apos;encaisse
            </h3>
            {showMeta && (
              <div className={cn("mt-1 flex flex-wrap items-center gap-3 text-sm", dashboardCardBodyMutedClass)}>
                <span className="font-medium text-[#2A2F3A]">{getHorizonText()}</span>
                <span className="text-slate-400">•</span>
                {subDivisionId && divisionId && companyId ? (
                  <>
                    <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                    <span className="text-slate-400">•</span>
                    <span>{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name || "Division"}</span>
                    <span className="text-slate-400">•</span>
                    <span className={cn("font-semibold", dashboardCardAccentClass)}>
                      {companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.subDivisions.find((sd) => sd.id === subDivisionId)?.name || "Sous-division"}
                    </span>
                  </>
                ) : divisionId && companyId ? (
                  <>
                    <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                    <span className="text-slate-400">•</span>
                    <span className={cn("font-semibold", dashboardCardAccentClass)}>
                      {companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name || "Division"}
                    </span>
                  </>
                ) : companyId ? (
                  <span className={cn("font-semibold", dashboardCardAccentClass)}>
                    {companies.find((c) => c.id === companyId)?.name || "Société sélectionnée"}
                  </span>
                ) : (
                  <span className="truncate">Toutes les sociétés</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {body}
    </div>
  )

  // Loading state
  if (loading) {
    return cardShell(
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#E0742D]" />
      </div>,
    )
  }

  // No company selected
  if (!companyId) {
    return cardShell(
      <div className="flex h-48 items-center justify-center text-slate-500">
        Sélectionnez une société
      </div>,
    )
  }

  // No data available
  if (bsRows.length === 0 && isRows.length === 0) {
    return cardShell(
      <div className="flex h-48 items-center justify-center text-slate-500">
        Aucune donnée disponible
      </div>,
    )
  }

  return cardShell(
    <div className="overflow-x-auto">
        <table className="w-full [&_th]:sticky [&_th]:top-0 [&_th]:z-10">
          <thead>
            <tr className="border-b-2 border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100/50">
              <th className="w-2/5 px-6 py-4 text-left text-sm font-semibold text-[#2A2F3A]">Métrique</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-[#2A2F3A]">Moyenne</th>
              {view === "current" && (
                <>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-[#2A2F3A]">Courant</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-[#2A2F3A]">Passé</th>
                </>
              )}
              {(view === "12months" || view === "24months" || view === "years") && (
                <>
                  {periodLabels.map((label, idx) => (
                    <th key={idx} className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold text-[#2A2F3A]">
                      {label}
                    </th>
                  ))}
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {/* DSO - Délai de couvrement des clients */}
            <tr className="border-b border-slate-100 transition-colors hover:bg-[#E0742D]/[0.04]">
              <td className="px-6 py-3.5 text-slate-900">Délai de couvrement des clients</td>
              
              {/* Colonne Moyenne */}
              {view === "current" && (() => {
                const dsoCurrent = calculateDSO(false)
                const dsoPrior = calculateDSO(true)
                const average = (dsoCurrent + dsoPrior) / 2
                return (
                  <td className="bg-gradient-to-b from-slate-50 to-slate-100/50 px-6 py-3.5 text-right font-mono text-sm font-semibold text-slate-800">
                    {average.toFixed(1)} j
                  </td>
                )
              })()}
              {isMultiPeriod && (() => {
                const values = Array.from({ length: trendCount }).map((_, idx) => calculateDSO(false, idx))
                const average = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
                return (
                  <td className="bg-gradient-to-b from-slate-50 to-slate-100/50 px-6 py-3.5 text-right font-mono text-sm font-semibold text-slate-800">
                    {average.toFixed(1)} j
                  </td>
                )
              })()}

              {/* Colonnes de données */}
              {view === "current" && (
                <>
                  <td className="px-6 py-3.5 text-right font-mono text-sm text-slate-900">
                    {calculateDSO(false).toFixed(1)} j
                  </td>
                  <td className="px-6 py-3.5 text-right font-mono text-sm text-slate-900">
                    {calculateDSO(true).toFixed(1)} j
                  </td>
                </>
              )}

              {isMultiPeriod && (
                <>
                  {Array.from({ length: trendCount }).map((_, idx) => {
                    const dso = calculateDSO(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right font-mono text-sm text-slate-900">
                        {dso.toFixed(1)} j
                      </td>
                    )
                  })}
                </>
              )}
            </tr>
            
            {/* DIO - Délai de rotation des stocks */}
            <tr className="border-b border-slate-100 transition-colors hover:bg-blue-50/30">
              <td className="px-6 py-3.5 text-slate-900">Délai de rotation des stocks</td>
              
              {/* Colonne Moyenne */}
              {view === "current" && (() => {
                const dioCurrent = calculateDIO(false)
                const dioPrior = calculateDIO(true)
                const average = (dioCurrent + dioPrior) / 2
                return (
                  <td className="bg-gradient-to-b from-slate-50 to-slate-100/50 px-6 py-3.5 text-right font-mono text-sm font-semibold text-slate-800">
                    {average.toFixed(1)} j
                  </td>
                )
              })()}
              {isMultiPeriod && (() => {
                const values = Array.from({ length: trendCount }).map((_, idx) => calculateDIO(false, idx))
                const average = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
                return (
                  <td className="bg-gradient-to-b from-slate-50 to-slate-100/50 px-6 py-3.5 text-right font-mono text-sm font-semibold text-slate-800">
                    {average.toFixed(1)} j
                  </td>
                )
              })()}

              {/* Colonnes de données */}
              {view === "current" && (
                <>
                  <td className="px-6 py-3.5 text-right font-mono text-sm text-slate-900">
                    {calculateDIO(false).toFixed(1)} j
                  </td>
                  <td className="px-6 py-3.5 text-right font-mono text-sm text-slate-900">
                    {calculateDIO(true).toFixed(1)} j
                  </td>
                </>
              )}

              {isMultiPeriod && (
                <>
                  {Array.from({ length: trendCount }).map((_, idx) => {
                    const dio = calculateDIO(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right font-mono text-sm text-slate-900">
                        {dio.toFixed(1)} j
                      </td>
                    )
                  })}
                </>
              )}
            </tr>
            
            {/* DPO - Délai de paiement des fournisseurs */}
            <tr className="border-b border-slate-100 transition-colors hover:bg-purple-50/30">
              <td className="px-6 py-3.5 text-slate-900">Délai de paiement des fournisseurs</td>
              
              {/* Colonne Moyenne */}
              {view === "current" && (() => {
                const dpoCurrent = calculateDPO(false)
                const dpoPrior = calculateDPO(true)
                const average = (dpoCurrent + dpoPrior) / 2
                return (
                  <td className="bg-gradient-to-b from-slate-50 to-slate-100/50 px-6 py-3.5 text-right font-mono text-sm font-semibold text-slate-800">
                    {average.toFixed(1)} j
                  </td>
                )
              })()}
              {isMultiPeriod && (() => {
                const values = Array.from({ length: trendCount }).map((_, idx) => calculateDPO(false, idx))
                const average = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
                return (
                  <td className="bg-gradient-to-b from-slate-50 to-slate-100/50 px-6 py-3.5 text-right font-mono text-sm font-semibold text-slate-800">
                    {average.toFixed(1)} j
                  </td>
                )
              })()}

              {/* Colonnes de données */}
              {view === "current" && (
                <>
                  <td className="px-6 py-3.5 text-right font-mono text-sm text-slate-900">
                    {calculateDPO(false).toFixed(1)} j
                  </td>
                  <td className="px-6 py-3.5 text-right font-mono text-sm text-slate-900">
                    {calculateDPO(true).toFixed(1)} j
                  </td>
                </>
              )}

              {isMultiPeriod && (
                <>
                  {Array.from({ length: trendCount }).map((_, idx) => {
                    const dpo = calculateDPO(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right font-mono text-sm text-slate-900">
                        {dpo.toFixed(1)} j
                      </td>
                    )
                  })}
                </>
              )}
            </tr>
            
            {/* CCC - Cycle de conversion de l'encaisse */}
            <tr className="border-b border-slate-100 transition-colors hover:bg-amber-50/30">
              <td className="px-6 py-3.5 text-slate-900">Cycle de conversion de l&apos;encaisse</td>
              
              {/* Colonne Moyenne */}
              {view === "current" && (() => {
                const cccCurrent = calculateCCC(false)
                const cccPrior = calculateCCC(true)
                const average = (cccCurrent + cccPrior) / 2
                return (
                  <td className="bg-gradient-to-b from-slate-50 to-slate-100/50 px-6 py-3.5 text-right font-mono text-sm font-semibold text-slate-800">
                    {average.toFixed(1)} j
                  </td>
                )
              })()}
              {isMultiPeriod && (() => {
                const values = Array.from({ length: trendCount }).map((_, idx) => calculateCCC(false, idx))
                const average = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
                return (
                  <td className="bg-gradient-to-b from-slate-50 to-slate-100/50 px-6 py-3.5 text-right font-mono text-sm font-semibold text-slate-800">
                    {average.toFixed(1)} j
                  </td>
                )
              })()}

              {/* Colonnes de données */}
              {view === "current" && (
                <>
                  <td className="px-6 py-3.5 text-right font-mono text-sm text-slate-900">
                    {calculateCCC(false).toFixed(1)} j
                  </td>
                  <td className="px-6 py-3.5 text-right font-mono text-sm text-slate-900">
                    {calculateCCC(true).toFixed(1)} j
                  </td>
                </>
              )}

              {isMultiPeriod && (
                <>
                  {Array.from({ length: trendCount }).map((_, idx) => {
                    const ccc = calculateCCC(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right font-mono text-sm text-slate-900">
                        {ccc.toFixed(1)} j
                      </td>
                    )
                  })}
                </>
              )}
            </tr>
          </tbody>
        </table>
      </div>,
    true,
  )
}

