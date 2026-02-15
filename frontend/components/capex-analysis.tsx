"use client"

import { useState, useMemo } from "react"
import { formatCurrency } from "@/lib/financial-utils"
import { Company } from "@/components/entity-selector"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { getRowAmounts, aggregateToYears, findRow } from "@/lib/series-utils"
import type { SeriesRow } from "@/lib/api"

interface CapexAnalysisProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "12months" | "24months" | "years"
  displayMode?: "cost" | "book_value" | "capex"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
}

/** Try multiple label variants to find a row. */
function findRowMulti(rows: SeriesRow[], ...labels: string[]): SeriesRow | undefined {
  for (const label of labels) {
    const found = findRow(rows, label)
    if (found) return found
  }
  return undefined
}

export function CapexAnalysis({
  period,
  view,
  displayMode = "cost",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
}: CapexAnalysisProps) {
  const [selectedAssetCategory, setSelectedAssetCategory] = useState<string>("total")

  // ---- Fetch real data ----
  const currentYear = new Date().getFullYear()
  const monthsNeeded = view === "24months" ? 24 : view === "years" ? 60 : 12

  const { rows: bsRows, periods: bsPeriods, loading: bsLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "balance-sheet",
    fiscalYear: currentYear,
    months: monthsNeeded,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: !!companyId,
  })

  const { rows: isRows, periods: isPeriods, loading: isLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "income-statement",
    fiscalYear: currentYear,
    months: monthsNeeded,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: !!companyId,
  })

  const loading = bsLoading || isLoading

  // ---- Locate key rows ----
  const fixedAssetsRow = useMemo(
    () => findRowMulti(bsRows, "immobilisations corporelles", "fixed assets", "actifs corporels"),
    [bsRows]
  )
  const intangibleAssetsRow = useMemo(
    () => findRowMulti(bsRows, "immobilisations incorporelles", "intangible assets", "actifs incorporels"),
    [bsRows]
  )
  const revenueRow = useMemo(
    () => findRowMulti(isRows, "revenus", "revenue", "ventes", "chiffre d'affaires"),
    [isRows]
  )
  const ebitdaRow = useMemo(
    () => findRowMulti(isRows, "baiia", "ebitda", "bénéfice avant"),
    [isRows]
  )
  const depreciationRow = useMemo(
    () => findRowMulti(isRows, "amortissement", "depreciation", "dotation aux amortissements"),
    [isRows]
  )

  // ---- Build amounts arrays ----
  // Use balance-sheet periods as the primary timeline
  const periods = bsPeriods

  const fixedAssetsAmountsRaw = useMemo(
    () => (fixedAssetsRow ? getRowAmounts(fixedAssetsRow, periods) : []),
    [fixedAssetsRow, periods]
  )
  const intangibleAssetsAmountsRaw = useMemo(
    () => (intangibleAssetsRow ? getRowAmounts(intangibleAssetsRow, periods) : []),
    [intangibleAssetsRow, periods]
  )
  const revenueAmountsRaw = useMemo(
    () => (revenueRow ? getRowAmounts(revenueRow, isPeriods) : []),
    [revenueRow, isPeriods]
  )
  const ebitdaAmountsRaw = useMemo(
    () => (ebitdaRow ? getRowAmounts(ebitdaRow, isPeriods) : []),
    [ebitdaRow, isPeriods]
  )
  const depreciationAmountsRaw = useMemo(
    () => (depreciationRow ? getRowAmounts(depreciationRow, isPeriods) : []),
    [depreciationRow, isPeriods]
  )

  // Aggregate to years if needed
  const fixedAssetsAmounts = useMemo(
    () => (view === "years" ? aggregateToYears(fixedAssetsAmountsRaw, periods).amounts : fixedAssetsAmountsRaw),
    [view, fixedAssetsAmountsRaw, periods]
  )
  const intangibleAssetsAmounts = useMemo(
    () => (view === "years" ? aggregateToYears(intangibleAssetsAmountsRaw, periods).amounts : intangibleAssetsAmountsRaw),
    [view, intangibleAssetsAmountsRaw, periods]
  )
  const revenueAmounts = useMemo(
    () => (view === "years" ? aggregateToYears(revenueAmountsRaw, isPeriods).amounts : revenueAmountsRaw),
    [view, revenueAmountsRaw, isPeriods]
  )
  const ebitdaAmounts = useMemo(
    () => (view === "years" ? aggregateToYears(ebitdaAmountsRaw, isPeriods).amounts : ebitdaAmountsRaw),
    [view, ebitdaAmountsRaw, isPeriods]
  )
  const depreciationAmounts = useMemo(
    () => (view === "years" ? aggregateToYears(depreciationAmountsRaw, isPeriods).amounts : depreciationAmountsRaw),
    [view, depreciationAmountsRaw, isPeriods]
  )

  // ---- Compute sub-row category proportions ----
  // Build dynamic proportions from the detail sub-rows of fixed and intangible asset rows
  const categoryMultipliers = useMemo(() => {
    const multipliers: Record<string, number> = {}
    const totalFixed = Math.abs(fixedAssetsAmounts.length > 0 ? fixedAssetsAmounts[fixedAssetsAmounts.length - 1] : 0)
    const totalIntangible = Math.abs(intangibleAssetsAmounts.length > 0 ? intangibleAssetsAmounts[intangibleAssetsAmounts.length - 1] : 0)
    const totalAll = totalFixed + totalIntangible

    if (totalAll === 0) return multipliers

    // Fixed assets sub-rows
    if (fixedAssetsRow && fixedAssetsRow.detailRows.length > 0) {
      fixedAssetsRow.detailRows.forEach((dr) => {
        const key = `${fixedAssetsRow.id}_${dr.id}`
        const lastPeriod = periods.length > 0 ? periods[periods.length - 1] : null
        const amount = lastPeriod ? Math.abs(dr.amounts[`${lastPeriod.fiscalYear}-${lastPeriod.fiscalMonth}`] || 0) : 0
        multipliers[key] = totalAll > 0 ? amount / totalAll : 0
      })
    }
    multipliers["fixed_assets"] = totalAll > 0 ? totalFixed / totalAll : 0

    // Intangible assets sub-rows
    if (intangibleAssetsRow && intangibleAssetsRow.detailRows.length > 0) {
      intangibleAssetsRow.detailRows.forEach((dr) => {
        const key = `${intangibleAssetsRow.id}_${dr.id}`
        const lastPeriod = periods.length > 0 ? periods[periods.length - 1] : null
        const amount = lastPeriod ? Math.abs(dr.amounts[`${lastPeriod.fiscalYear}-${lastPeriod.fiscalMonth}`] || 0) : 0
        multipliers[key] = totalAll > 0 ? amount / totalAll : 0
      })
    }
    multipliers["intangible_assets"] = totalAll > 0 ? totalIntangible / totalAll : 0

    // Legacy keys (used in dropdown) - fallback proportions when sub-rows not available
    if (!multipliers["land_buildings"]) multipliers["land_buildings"] = multipliers["fixed_assets"] * 0.47 || 0
    if (!multipliers["equipment"]) multipliers["equipment"] = multipliers["fixed_assets"] * 0.36 || 0
    if (!multipliers["vehicles"]) multipliers["vehicles"] = multipliers["fixed_assets"] * 0.10 || 0
    if (!multipliers["other_fixed"]) multipliers["other_fixed"] = multipliers["fixed_assets"] * 0.06 || 0
    if (!multipliers["patents"]) multipliers["patents"] = multipliers["intangible_assets"] * 0.50 || 0
    if (!multipliers["software"]) multipliers["software"] = multipliers["intangible_assets"] * 0.33 || 0
    if (!multipliers["goodwill"]) multipliers["goodwill"] = multipliers["intangible_assets"] * 0.17 || 0

    return multipliers
  }, [fixedAssetsRow, intangibleAssetsRow, fixedAssetsAmounts, intangibleAssetsAmounts, periods])

  // ---- Data accessors ----
  const numPeriods = fixedAssetsAmounts.length

  // Get total assets for a given period index
  const getTotalAssets = (idx: number): number => {
    const fa = idx < fixedAssetsAmounts.length ? Math.abs(fixedAssetsAmounts[idx]) : 0
    const ia = idx < intangibleAssetsAmounts.length ? Math.abs(intangibleAssetsAmounts[idx]) : 0
    return fa + ia
  }

  // Get value for a specific asset category
  const getValueForAsset = (accountId: string | "total", idx: number): number => {
    const totalAssets = getTotalAssets(idx)
    if (accountId === "total") return totalAssets
    const multiplier = categoryMultipliers[accountId] || 1
    return totalAssets * multiplier
  }

  // Calculate Capex (variation in fixed assets between consecutive periods)
  const calculateCapex = (idx: number): number => {
    if (displayMode === "capex") {
      return getValueForAsset(selectedAssetCategory, idx)
    }
    const current = getValueForAsset(selectedAssetCategory, idx)
    const prior = idx > 0 ? getValueForAsset(selectedAssetCategory, idx - 1) : 0
    return current - prior
  }

  // Calculate Depreciation
  const calculateDepreciation = (idx: number): number => {
    // Use real depreciation data if available
    if (depreciationAmounts.length > 0 && idx < depreciationAmounts.length) {
      return Math.abs(depreciationAmounts[idx])
    }
    // Fallback: estimate 8% annual depreciation
    const assetValue = getValueForAsset(selectedAssetCategory, idx)
    const annualRate = 0.08
    if (period === "monthly") return assetValue * (annualRate / 12)
    if (period === "quarterly") return assetValue * (annualRate / 4)
    return assetValue * annualRate
  }

  // Get Revenue
  const getRevenue = (idx: number): number => {
    if (idx < revenueAmounts.length) return Math.abs(revenueAmounts[idx])
    return 0
  }

  // Get EBITDA
  const getEBITDA = (idx: number): number => {
    if (idx < ebitdaAmounts.length) return Math.abs(ebitdaAmounts[idx])
    // Fallback: 20% of revenue
    return getRevenue(idx) * 0.20
  }

  // Revenue percentage
  const getRevenuePercentage = (value: number, idx: number): number => {
    const revenue = getRevenue(idx)
    if (revenue === 0) return 0
    return (value / revenue) * 100
  }

  // Operating cash flow
  const calculateOperatingCashFlow = (idx: number): number => {
    return getEBITDA(idx) - calculateDepreciation(idx)
  }

  // ---- Period index helpers ----
  // For "current" view: last index = current, second-to-last = prior
  const currentIdx = numPeriods > 0 ? numPeriods - 1 : 0
  const priorIdx = numPeriods > 1 ? numPeriods - 2 : 0

  // How many columns to render based on view
  const getColumnCount = (): number => {
    if (view === "current") return 0 // uses "Courant" / "Passe" instead
    return numPeriods
  }

  // ---- Period labels ----
  const getMonthLabels = (): string[] => {
    if (periods.length === 0) {
      // Fallback for no data
      const months = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"]
      const labels: string[] = []
      const count = view === "24months" ? 24 : 12
      const currentDate = new Date()
      for (let i = count - 1; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        labels.push(`${months[date.getMonth()]} ${date.getFullYear()}`)
      }
      return labels
    }
    // If years view, aggregate labels
    if (view === "years") {
      const dummyAmounts = fixedAssetsAmountsRaw.length > 0 ? fixedAssetsAmountsRaw : periods.map(() => 0)
      return aggregateToYears(dummyAmounts, periods).labels
    }
    return periods.map((p) => p.label)
  }

  const columnLabels = getMonthLabels()
  const columnCount = view === "current" ? 0 : columnLabels.length

  // ---- Helpers for average computation across visible columns ----
  const computeAverage = (fn: (idx: number) => number): number => {
    if (view === "current") {
      return (fn(currentIdx) + fn(priorIdx)) / 2
    }
    if (numPeriods === 0) return 0
    const values = Array.from({ length: numPeriods }, (_, idx) => fn(idx))
    return values.reduce((sum, val) => sum + val, 0) / values.length
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

  // ---- Render helpers ----
  const renderAvgCell = (fn: (idx: number) => number, isPercent = false) => {
    const avg = computeAverage(fn)
    return (
      <td className="px-6 py-3.5 text-right font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
        {isPercent ? `${avg.toFixed(1)}%` : formatCurrency(avg)}
      </td>
    )
  }

  const renderCurrentPriorCells = (fn: (idx: number) => number, isPercent = false) => (
    <>
      <td className="px-6 py-3.5 text-right text-slate-500">
        {isPercent ? `${fn(currentIdx).toFixed(1)}%` : formatCurrency(fn(currentIdx))}
      </td>
      <td className="px-6 py-3.5 text-right text-slate-500">
        {isPercent ? `${fn(priorIdx).toFixed(1)}%` : formatCurrency(fn(priorIdx))}
      </td>
    </>
  )

  const renderTrendCells = (fn: (idx: number) => number, isPercent = false) => (
    <>
      {Array.from({ length: numPeriods }).map((_, idx) => (
        <td key={idx} className="px-4 py-3.5 text-right text-sm text-slate-500">
          {isPercent ? `${fn(idx).toFixed(1)}%` : formatCurrency(fn(idx))}
        </td>
      ))}
    </>
  )

  // ---- Loading / empty states ----
  if (!companyId) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 p-12 text-center text-slate-500">
        Selectionnez une societe
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 p-12 text-center text-slate-500 animate-pulse">
        Chargement des donnees...
      </div>
    )
  }

  if (numPeriods === 0 && bsRows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 p-12 text-center text-slate-500">
        Aucune donnee disponible
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
      {/* Header */}
      <div className="bg-white px-8 py-5 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Analyse des Capex</h3>
                <Select value={selectedAssetCategory} onValueChange={setSelectedAssetCategory}>
                  <SelectTrigger className="h-7 px-2 text-xs bg-white border-slate-300 shadow-sm hover:shadow-md transition-shadow">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total">Total</SelectItem>
                    <SelectItem value="land_buildings">Terrains et constructions</SelectItem>
                    <SelectItem value="equipment">Materiel et equipement</SelectItem>
                    <SelectItem value="vehicles">Vehicules</SelectItem>
                    <SelectItem value="other_fixed">Autres immobilisations corporelles</SelectItem>
                    <SelectItem value="fixed_assets">Total Immobilisations corporelles</SelectItem>
                    <SelectItem value="patents">Brevets et licences</SelectItem>
                    <SelectItem value="software">Logiciels et developpement</SelectItem>
                    <SelectItem value="goodwill">Fonds commercial</SelectItem>
                    <SelectItem value="intangible_assets">Total Immobilisations incorporelles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-700 flex-wrap">
                <span className="font-medium">{getHorizonText()}</span>
                <span className="text-slate-400">&bull;</span>
                {subDivisionId && divisionId && companyId ? (
                  <>
                    <span>{companies.find((c) => c.id === companyId)?.name || "Societe"}</span>
                    <span className="text-slate-400">&bull;</span>
                    <span>{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name || "Division"}</span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-emerald-600 font-semibold">{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.subDivisions.find((sd) => sd.id === subDivisionId)?.name || "Sous-division"}</span>
                  </>
                ) : divisionId && companyId ? (
                  <>
                    <span>{companies.find((c) => c.id === companyId)?.name || "Societe"}</span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-emerald-600 font-semibold">{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name || "Division"}</span>
                  </>
                ) : companyId ? (
                  <span className="text-emerald-600 font-semibold">{companies.find((c) => c.id === companyId)?.name || "Societe selectionnee"}</span>
                ) : (
                  <span className="truncate">Toutes les societes</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-b from-slate-50 to-slate-100/50 border-b-2 border-slate-200">
              <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm w-2/5">Metrique</th>
              <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Moyenne</th>
              {view === "current" && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Courant</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Passe</th>
                </>
              )}
              {view !== "current" && columnLabels.map((label, idx) => (
                <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Capex */}
            <tr className="border-b border-slate-100 hover:bg-emerald-50/30 transition-colors">
              <td className="px-6 py-3.5 text-slate-900">Capex</td>
              {renderAvgCell(calculateCapex)}
              {view === "current" && renderCurrentPriorCells(calculateCapex)}
              {view !== "current" && renderTrendCells(calculateCapex)}
            </tr>

            {/* Amortissement */}
            <tr className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors">
              <td className="px-6 py-3.5 text-slate-900">Amortissement</td>
              {renderAvgCell(calculateDepreciation)}
              {view === "current" && renderCurrentPriorCells(calculateDepreciation)}
              {view !== "current" && renderTrendCells(calculateDepreciation)}
            </tr>

            {/* Capex en % des revenus */}
            <tr className="border-b border-slate-100 hover:bg-purple-50/30 transition-colors">
              <td className="px-6 py-3.5 text-slate-900">Capex / Revenus</td>
              {renderAvgCell((idx) => {
                const capex = calculateCapex(idx)
                return getRevenuePercentage(capex, idx)
              }, true)}
              {view === "current" && renderCurrentPriorCells((idx) => {
                const capex = calculateCapex(idx)
                return getRevenuePercentage(capex, idx)
              }, true)}
              {view !== "current" && renderTrendCells((idx) => {
                const capex = calculateCapex(idx)
                return getRevenuePercentage(capex, idx)
              }, true)}
            </tr>

            {/* Capex / BAIIA */}
            <tr className="border-b border-slate-100 hover:bg-amber-50/30 transition-colors">
              <td className="px-6 py-3.5 text-slate-900">Capex / BAIIA</td>
              {renderAvgCell((idx) => {
                const capex = calculateCapex(idx)
                const ebitda = getEBITDA(idx)
                return ebitda !== 0 ? (capex / ebitda) * 100 : 0
              }, true)}
              {view === "current" && renderCurrentPriorCells((idx) => {
                const capex = calculateCapex(idx)
                const ebitda = getEBITDA(idx)
                return ebitda !== 0 ? (capex / ebitda) * 100 : 0
              }, true)}
              {view !== "current" && renderTrendCells((idx) => {
                const capex = calculateCapex(idx)
                const ebitda = getEBITDA(idx)
                return ebitda !== 0 ? (capex / ebitda) * 100 : 0
              }, true)}
            </tr>

            {/* Capex / Flux de tresorerie relies aux operations */}
            <tr className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
              <td className="px-6 py-3.5 text-slate-900">Capex / Flux de tresorerie relies aux operations</td>
              {renderAvgCell((idx) => {
                const capex = calculateCapex(idx)
                const ocf = calculateOperatingCashFlow(idx)
                return ocf !== 0 ? (capex / ocf) * 100 : 0
              }, true)}
              {view === "current" && renderCurrentPriorCells((idx) => {
                const capex = calculateCapex(idx)
                const ocf = calculateOperatingCashFlow(idx)
                return ocf !== 0 ? (capex / ocf) * 100 : 0
              }, true)}
              {view !== "current" && renderTrendCells((idx) => {
                const capex = calculateCapex(idx)
                const ocf = calculateOperatingCashFlow(idx)
                return ocf !== 0 ? (capex / ocf) * 100 : 0
              }, true)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
