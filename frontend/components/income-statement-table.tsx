"use client"

import { formatCurrency, calculateVariation } from "@/lib/financial-utils"

interface IncomeStatementTableProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "comparison" | "ytd"
}

export function IncomeStatementTable({ period, view }: IncomeStatementTableProps) {
  // Sample data structure for different periods
  const getIncomeStatementData = () => {
    if (period === "monthly") {
      return {
        title: "État des résultats - Mensuel (Novembre 2024)",
        columns: ["Poste", "Courant", "Variation %", "Variation $"],
        data: [
          { label: "PRODUITS D'EXPLOITATION", value: 0, indent: true },
          { label: "Ventes de services", current: 250000, prior: 220000 },
          { label: "Autres revenus", current: 25000, prior: 22000 },
          { label: "Total des produits", current: 275000, prior: 242000, isBold: true },
          { label: "", value: 0 },
          { label: "DÉPENSES D'EXPLOITATION", value: 0, indent: true },
          { label: "Salaires et avantages sociaux", current: 95000, prior: 85000 },
          { label: "Location de bureaux", current: 15000, prior: 15000 },
          { label: "Dépenses de bureau", current: 8000, prior: 7500 },
          { label: "Marketing et publicité", current: 12000, prior: 10000 },
          { label: "Professionnels et consultants", current: 18000, prior: 16000 },
          { label: "Amortissement", current: 5000, prior: 5000 },
          { label: "Autres dépenses", current: 6500, prior: 6000 },
          { label: "Total des dépenses", current: 159500, prior: 144500, isBold: true },
          { label: "", value: 0 },
          { label: "RÉSULTAT D'EXPLOITATION", current: 115500, prior: 97500, isBold: true, isResult: true },
          { label: "", value: 0 },
          { label: "AUTRES REVENUS", value: 0, indent: true },
          { label: "Intérêts gagnés", current: 2000, prior: 1500 },
          { label: "Revenus de placement", current: 3500, prior: 2800 },
          { label: "Total des autres revenus", current: 5500, prior: 4300, isBold: true },
          { label: "", value: 0 },
          { label: "AUTRES CHARGES", value: 0, indent: true },
          { label: "Intérêts débiteurs", current: 2000, prior: 2200 },
          { label: "Total des autres charges", current: 2000, prior: 2200, isBold: true },
          { label: "", value: 0 },
          { label: "RÉSULTAT AVANT IMPÔTS", current: 119000, prior: 99600, isBold: true, isResult: true },
          { label: "", value: 0 },
          { label: "Impôts sur le résultat (26%)", current: 30940, prior: 25896 },
          { label: "", value: 0 },
          { label: "RÉSULTAT NET", current: 88060, prior: 73704, isBold: true, isResult: true, isNetIncome: true },
        ],
      }
    } else if (period === "quarterly") {
      return {
        title: "État des résultats - Trimestriel (Q4 2024)",
        columns: ["Poste", "Q4 2024", "Q4 2023", "Variation %", "Variation $"],
        data: [
          { label: "PRODUITS D'EXPLOITATION", value: 0, indent: true },
          { label: "Ventes de services", current: 750000, prior: 650000 },
          { label: "Autres revenus", current: 75000, prior: 66000 },
          { label: "Total des produits", current: 825000, prior: 716000, isBold: true },
          { label: "", value: 0 },
          { label: "DÉPENSES D'EXPLOITATION", value: 0, indent: true },
          { label: "Salaires et avantages sociaux", current: 280000, prior: 250000 },
          { label: "Location de bureaux", current: 45000, prior: 45000 },
          { label: "Dépenses de bureau", current: 24000, prior: 22500 },
          { label: "Marketing et publicité", current: 36000, prior: 30000 },
          { label: "Professionnels et consultants", current: 54000, prior: 48000 },
          { label: "Amortissement", current: 15000, prior: 15000 },
          { label: "Autres dépenses", current: 19500, prior: 18000 },
          { label: "Total des dépenses", current: 473500, prior: 428500, isBold: true },
          { label: "", value: 0 },
          { label: "RÉSULTAT D'EXPLOITATION", current: 351500, prior: 287500, isBold: true, isResult: true },
          { label: "", value: 0 },
          { label: "AUTRES REVENUS", value: 0, indent: true },
          { label: "Intérêts gagnés", current: 6000, prior: 4500 },
          { label: "Revenus de placement", current: 10500, prior: 8400 },
          { label: "Total des autres revenus", current: 16500, prior: 12900, isBold: true },
          { label: "", value: 0 },
          { label: "AUTRES CHARGES", value: 0, indent: true },
          { label: "Intérêts débiteurs", current: 6000, prior: 6600 },
          { label: "Total des autres charges", current: 6000, prior: 6600, isBold: true },
          { label: "", value: 0 },
          { label: "RÉSULTAT AVANT IMPÔTS", current: 362000, prior: 293800, isBold: true, isResult: true },
          { label: "", value: 0 },
          { label: "Impôts sur le résultat (26%)", current: 94120, prior: 76388 },
          { label: "", value: 0 },
          { label: "RÉSULTAT NET", current: 267880, prior: 217412, isBold: true, isResult: true, isNetIncome: true },
        ],
      }
    } else {
      return {
        title: "État des résultats - Annuel (2024)",
        columns: ["Poste", "2024", "2023", "Variation %", "Variation $"],
        data: [
          { label: "PRODUITS D'EXPLOITATION", value: 0, indent: true },
          { label: "Ventes de services", current: 3000000, prior: 2600000 },
          { label: "Autres revenus", current: 300000, prior: 264000 },
          { label: "Total des produits", current: 3300000, prior: 2864000, isBold: true },
          { label: "", value: 0 },
          { label: "DÉPENSES D'EXPLOITATION", value: 0, indent: true },
          { label: "Salaires et avantages sociaux", current: 1120000, prior: 1000000 },
          { label: "Location de bureaux", current: 180000, prior: 180000 },
          { label: "Dépenses de bureau", current: 96000, prior: 90000 },
          { label: "Marketing et publicité", current: 144000, prior: 120000 },
          { label: "Professionnels et consultants", current: 216000, prior: 192000 },
          { label: "Amortissement", current: 60000, prior: 60000 },
          { label: "Autres dépenses", current: 78000, prior: 72000 },
          { label: "Total des dépenses", current: 1894000, prior: 1714000, isBold: true },
          { label: "", value: 0 },
          { label: "RÉSULTAT D'EXPLOITATION", current: 1406000, prior: 1150000, isBold: true, isResult: true },
          { label: "", value: 0 },
          { label: "AUTRES REVENUS", value: 0, indent: true },
          { label: "Intérêts gagnés", current: 24000, prior: 18000 },
          { label: "Revenus de placement", current: 42000, prior: 33600 },
          { label: "Total des autres revenus", current: 66000, prior: 51600, isBold: true },
          { label: "", value: 0 },
          { label: "AUTRES CHARGES", value: 0, indent: true },
          { label: "Intérêts débiteurs", current: 24000, prior: 26400 },
          { label: "Total des autres charges", current: 24000, prior: 26400, isBold: true },
          { label: "", value: 0 },
          { label: "RÉSULTAT AVANT IMPÔTS", current: 1448000, prior: 1175200, isBold: true, isResult: true },
          { label: "", value: 0 },
          { label: "Impôts sur le résultat (26%)", current: 376480, prior: 305552 },
          { label: "", value: 0 },
          { label: "RÉSULTAT NET", current: 1071520, prior: 869648, isBold: true, isResult: true, isNetIncome: true },
        ],
      }
    }
  }

  const statementData = getIncomeStatementData()

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
