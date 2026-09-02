"use client"

import { useMemo } from "react"
import { formatCurrency } from "@/lib/financial-utils"
import {
  buildLoanMonthlyPaymentSchedule,
  formatDebtAbsoluteMonthLabel,
  type AmortizableLoan,
} from "@/lib/debt-amortization-utils"
import { cn } from "@/lib/utils"

/**
 * Calendrier des versements (intérêts / capital / solde) — Hypothèses Financement.
 * Design Modelisys (slate / #2A2F3A), pas Centris.
 */
export function DebtMonthlyPaymentSchedule({
  loan,
  forecastBaseYear,
  className,
}: {
  loan: AmortizableLoan
  /** Année civile de la 1re année projetée (mois absolu 0 = janv. de cette année). */
  forecastBaseYear: number
  className?: string
}) {
  const rows = useMemo(() => buildLoanMonthlyPaymentSchedule(loan), [loan])

  if (rows.length === 0) return null

  return (
    <div className={cn("border-t border-slate-200/70 pt-4", className)} data-testid="debt-monthly-schedule">
      <h4 className="text-sm font-semibold tracking-tight text-[#2A2F3A]">
        Tableau des versements mensuels
      </h4>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        Versement (intérêts + capital), détail et solde résiduel mois par mois.
      </p>
      <div className="mt-3 max-h-64 overflow-auto overscroll-contain rounded-xl border border-slate-200/90 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-50/95 backdrop-blur-sm">
            <tr>
              <th
                scope="col"
                className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
              >
                Mois
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
              >
                Versement
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
              >
                Intérêts
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
              >
                Capital
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
              >
                Solde résiduel
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const payment = row.interest + row.principal
              return (
                <tr
                  key={row.monthIndex}
                  className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80"
                >
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-700">
                    {formatDebtAbsoluteMonthLabel(row.absoluteMonth, forecastBaseYear)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums font-medium text-slate-900">
                    {formatCurrency(payment)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-800">
                    {formatCurrency(row.interest)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-800">
                    {formatCurrency(row.principal)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-900">
                    {formatCurrency(row.endingBalance)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
