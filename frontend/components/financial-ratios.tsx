"use client"

import { Fragment } from "react"
import { cn } from "@/lib/utils"
import type { SeriesRow, SeriesPeriod } from "@/lib/api"
import { findRow } from "@/lib/series-utils"

export interface RatioDataPoint {
  period: string
  currentRatio: number | null
  quickRatio: number | null
  grossMargin: number | null
  netMargin: number | null
  ebitdaMargin: number | null
  debtToEquity: number | null
  interestCoverage: number | null
}

/** Try multiple label variants to find a row. */
function findRowMulti(rows: SeriesRow[], ...labels: string[]): SeriesRow | undefined {
  for (const label of labels) {
    const found = findRow(rows, label)
    if (found) return found
  }
  return undefined
}

/** Compute financial ratios from IS and BS series data for each period. */
export function computeRatios(
  isRows: SeriesRow[],
  bsRows: SeriesRow[],
  periods: SeriesPeriod[]
): RatioDataPoint[] {
  // IS rows
  const revenueRow = findRowMulti(isRows, "revenus", "revenue", "ventes", "chiffre d'affaires")
  const grossProfitRow = findRowMulti(isRows, "bénéfice brut", "gross profit", "marge brute")
  const netIncomeRow = findRowMulti(isRows, "bénéfice net", "résultat net", "net income")
  const ebitdaRow = findRowMulti(isRows, "baiia", "ebitda", "bénéfice avant")
  const interestRow = findRowMulti(isRows, "charges financières", "frais financiers", "intérêts", "interest")

  // BS rows
  const currentAssetsRow = findRowMulti(bsRows, "actif courant", "actifs courants", "current assets")
  const currentLiabRow = findRowMulti(bsRows, "passif courant", "passifs courants", "current liabilities")
  const inventoryRow = findRowMulti(bsRows, "stocks", "inventaire", "inventory")
  const totalLiabRow = findRowMulti(bsRows, "total du passif", "passif total", "total liabilities", "passif")
  const equityRow = findRowMulti(bsRows, "capitaux propres", "avoir", "equity", "actionnaires")

  return periods.map((p) => {
    const key = `${p.fiscalYear}-${p.fiscalMonth}`

    const revenue = Math.abs(revenueRow?.amounts[key] || 0)
    const grossProfit = grossProfitRow?.amounts[key] || 0
    const netIncome = netIncomeRow?.amounts[key] || 0
    const ebitda = ebitdaRow?.amounts[key] || 0
    const interest = Math.abs(interestRow?.amounts[key] || 0)

    const currentAssets = Math.abs(currentAssetsRow?.amounts[key] || 0)
    const currentLiab = Math.abs(currentLiabRow?.amounts[key] || 0)
    const inventory = Math.abs(inventoryRow?.amounts[key] || 0)
    const totalLiab = Math.abs(totalLiabRow?.amounts[key] || 0)
    const equity = Math.abs(equityRow?.amounts[key] || 0)

    return {
      period: p.label,
      currentRatio: currentLiab !== 0 ? currentAssets / currentLiab : null,
      quickRatio: currentLiab !== 0 ? (currentAssets - inventory) / currentLiab : null,
      grossMargin: revenue !== 0 ? (grossProfit / revenue) * 100 : null,
      netMargin: revenue !== 0 ? (netIncome / revenue) * 100 : null,
      ebitdaMargin: revenue !== 0 ? (ebitda / revenue) * 100 : null,
      debtToEquity: equity !== 0 ? totalLiab / equity : null,
      interestCoverage: interest !== 0 ? ebitda / interest : null,
    }
  })
}

// --- Detail table component ---

interface RatioRowDef {
  key: keyof RatioDataPoint
  label: string
  format: "ratio" | "percentage"
  sectionLabel?: string
}

const RATIO_ROWS: RatioRowDef[] = [
  { key: "currentRatio", label: "Ratio de liquidité générale", format: "ratio", sectionLabel: "Liquidité" },
  { key: "quickRatio", label: "Ratio de liquidité immédiate", format: "ratio" },
  { key: "grossMargin", label: "Marge brute", format: "percentage", sectionLabel: "Rentabilité" },
  { key: "netMargin", label: "Marge nette", format: "percentage" },
  { key: "ebitdaMargin", label: "Marge BAIIA", format: "percentage" },
  { key: "debtToEquity", label: "Dette / Capitaux propres", format: "ratio", sectionLabel: "Levier financier" },
  { key: "interestCoverage", label: "Couverture des intérêts", format: "ratio" },
]

function formatRatioValue(value: number | null, format: "ratio" | "percentage"): string {
  if (value === null) return "\u2014"
  if (format === "percentage") return `${value.toFixed(1)}\u00A0%`
  return `${value.toFixed(2)}x`
}

function getRatioColor(value: number | null, key: string): string {
  if (value === null) return "text-slate-300"
  // Green/red coloring for profitability
  if (key === "grossMargin" || key === "netMargin" || key === "ebitdaMargin") {
    return value >= 0 ? "text-slate-900" : "text-red-600"
  }
  return "text-slate-900"
}

interface FinancialRatiosProps {
  ratioData: RatioDataPoint[]
  loading?: boolean
}

export function FinancialRatios({ ratioData, loading = false }: FinancialRatiosProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lg p-8">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      </div>
    )
  }

  if (ratioData.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lg p-8">
        <div className="flex items-center justify-center h-48">
          <p className="text-slate-400">Aucune donnée disponible</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-white px-8 py-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-emerald-500 rounded-full"></div>
          <h3 className="text-xl font-semibold text-slate-900">Détail des ratios financiers</h3>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-6 sticky left-0 bg-slate-50 z-10 min-w-[260px]">
                Ratio
              </th>
              {ratioData.map((d, i) => (
                <th
                  key={i}
                  className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-4 min-w-[100px] whitespace-nowrap"
                >
                  {d.period}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RATIO_ROWS.map((rowDef, idx) => (
              <Fragment key={rowDef.key}>
                {rowDef.sectionLabel && (
                  <tr className="bg-slate-50/50">
                    <td
                      colSpan={ratioData.length + 1}
                      className="py-2.5 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider border-t border-slate-200"
                    >
                      {rowDef.sectionLabel}
                    </td>
                  </tr>
                )}
                <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-6 pl-10 text-sm text-slate-700 sticky left-0 bg-white z-10">
                    {rowDef.label}
                  </td>
                  {ratioData.map((d, i) => {
                    const val = d[rowDef.key] as number | null
                    return (
                      <td
                        key={i}
                        className={cn(
                          "py-3 px-4 text-right text-sm font-mono",
                          getRatioColor(val, rowDef.key)
                        )}
                      >
                        {formatRatioValue(val, rowDef.format)}
                      </td>
                    )
                  })}
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
