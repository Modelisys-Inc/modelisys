"use client"

import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import type { FinancialStatementRow } from "@/lib/api"

interface IncomeStatementTableProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "comparison" | "ytd"
  rows?: FinancialStatementRow[]
  loading?: boolean
}

export function IncomeStatementTable({ period, view, rows: backendRows = [], loading = false }: IncomeStatementTableProps) {
  // Map backend rows to table format with detail rows flattened
  const mapToTableData = () => {
    const tableRows: Array<{
      label: string
      current?: number
      prior?: number
      value?: number
      isBold?: boolean
      isResult?: boolean
      isNetIncome?: boolean
      indent?: boolean
    }> = []

    for (const row of backendRows) {
      if (row.isSection && row.current === 0 && row.prior === 0) {
        tableRows.push({ label: row.label, value: 0, indent: true })
      } else {
        tableRows.push({
          label: row.label,
          current: row.current,
          prior: row.prior,
          isBold: row.isBold,
          isResult: row.isResult,
          isNetIncome: row.label.toLowerCase().includes("résultat net") && row.isResult,
        })
      }
      // Flatten detail rows
      for (const detail of row.detailRows) {
        tableRows.push({
          label: detail.label,
          current: detail.current,
          prior: detail.prior,
          isBold: detail.isBold,
          isResult: detail.isResult,
        })
      }
    }
    return tableRows
  }

  const getTitle = () => {
    if (period === "monthly") return "État des résultats - Mensuel"
    if (period === "quarterly") return "État des résultats - Trimestriel"
    return "État des résultats - Annuel"
  }

  const getColumns = () => {
    if (view === "current") return ["Poste", "Courant"]
    return ["Poste", "Courant", "Passé", "Variation %", "Variation $"]
  }

  const tableData = mapToTableData()
  const statementData = { title: getTitle(), columns: getColumns(), data: tableData }

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-8 py-16 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/3 mx-auto"></div>
            <div className="h-4 bg-slate-200 rounded w-2/3 mx-auto"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto"></div>
          </div>
          <p className="text-sm text-slate-500 mt-4">Chargement des données...</p>
        </div>
      </div>
    )
  }

  if (tableData.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-8 py-16 text-center">
          <p className="text-sm text-slate-500">Aucune donnée disponible.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white px-8 py-6 border-b border-slate-700">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-2xl font-bold mb-1">{statementData.title}</h2>
            <p className="text-slate-300 text-sm">Tous les montants en dollars canadiens</p>
          </div>
          {view === "ytd" && (
            <div className="text-right">
              <p className="text-slate-300 text-sm mb-1">Depuis le 1er janvier 2024</p>
              <p className="text-2xl font-bold text-emerald-400">+22.3%</p>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {statementData.columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-6 py-4 text-left font-semibold text-slate-900 text-sm ${
                    idx === 0 ? "w-1/2" : "w-1/8"
                  }`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {statementData.data.map((row, idx) => {
              const variation = row.current && row.prior ? calculateVariation(row.current, row.prior) : null
              const variationAmount = row.current && row.prior ? row.current - row.prior : 0

              return (
                <tr
                  key={idx}
                  className={`border-b border-slate-200 ${
                    row.isNetIncome ? "bg-emerald-50" : row.isResult ? "bg-blue-50" : row.indent ? "bg-slate-50" : ""
                  } ${row.label === "" ? "h-2" : ""}`}
                >
                  <td
                    className={`px-6 py-3 ${
                      row.isBold ? "font-bold text-slate-900" : "text-slate-700"
                    } ${row.indent && row.label !== "" ? "text-slate-600 italic" : ""}`}
                  >
                    {row.label}
                  </td>

                  {view === "current" && (
                    <>
                      <td className={`px-6 py-3 text-right font-mono ${row.isBold ? "font-bold" : ""}`}>
                        {row.current !== undefined ? formatCurrency(row.current) : "-"}
                      </td>
                    </>
                  )}

                  {view === "comparison" && (
                    <>
                      <td className={`px-6 py-3 text-right font-mono ${row.isBold ? "font-bold" : ""}`}>
                        {row.current !== undefined ? formatCurrency(row.current) : "-"}
                      </td>
                      <td
                        className={`px-6 py-3 text-right font-mono ${row.isBold ? "font-bold text-slate-600" : "text-slate-600"}`}
                      >
                        {row.prior !== undefined ? formatCurrency(row.prior) : "-"}
                      </td>
                      <td
                        className={`px-6 py-3 text-right font-mono font-semibold ${
                          variation && variation >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {variation !== null ? `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%` : "-"}
                      </td>
                      <td
                        className={`px-6 py-3 text-right font-mono font-semibold ${
                          variationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {variationAmount !== 0
                          ? `${variationAmount >= 0 ? "+" : ""}${formatCurrency(variationAmount)}`
                          : "-"}
                      </td>
                    </>
                  )}

                  {view === "ytd" && (
                    <>
                      <td className={`px-6 py-3 text-right font-mono ${row.isBold ? "font-bold" : ""}`}>
                        {row.current !== undefined ? formatCurrency(row.current) : "-"}
                      </td>
                      <td
                        className={`px-6 py-3 text-right font-mono ${row.isBold ? "font-bold text-slate-600" : "text-slate-600"}`}
                      >
                        {row.prior !== undefined ? formatCurrency(row.prior) : "-"}
                      </td>
                      <td
                        className={`px-6 py-3 text-right font-mono font-semibold ${
                          variation && variation >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {variation !== null ? `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%` : "-"}
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div className="bg-slate-50 px-8 py-4 border-t border-slate-200">
        <p className="text-xs text-slate-600">
          Note: Les données affichées sont à titre informatif. Consulter les états financiers audités pour les montants
          officiels.
        </p>
      </div>
    </div>
  )
}
