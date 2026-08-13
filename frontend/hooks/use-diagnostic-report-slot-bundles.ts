"use client"

import { useMemo } from "react"
import type { DiagnosticReportView } from "@/components/diagnostic/v2/diagnostic-nav-rail"
import { useStatementChartSlots } from "@/hooks/use-statement-chart-slots"
import type { ChartSlot, StatementType } from "@/lib/statement-chart-config"

export interface DiagnosticReportSlotBundle {
  slots: ChartSlot[]
  activeSlot: ChartSlot | null
  loading: boolean
  error: string | null
}

function pickActiveSlot(slots: ChartSlot[]): ChartSlot | null {
  return slots.find((s) => s.chartInstanceId === "default") ?? slots[0] ?? null
}

function toBundle(
  slots: ChartSlot[],
  loading: boolean,
  error: string | null,
): DiagnosticReportSlotBundle {
  return { slots, activeSlot: pickActiveSlot(slots), loading, error }
}

function slotTypeForReportView(reportView: DiagnosticReportView): StatementType | null {
  if (reportView === "working-capital" || reportView === "capex") return null
  if (reportView === "revenue" || reportView === "margin-by-revenue") return "diagnostic-revenue"
  if (reportView === "expenses" || reportView === "expenses-by-division") return "diagnostic-expenses"
  if (reportView === "financial-position") return "diagnostic-financial-position"
  return "income-statement"
}

/** Charge une fois chaque type de slot nécessaire au rapport imprimé (évite 12+ requêtes parallèles). */
export function useDiagnosticReportSlotBundles(companyId: string): {
  bundleForView: (reportView: DiagnosticReportView) => DiagnosticReportSlotBundle | null
  anyLoading: boolean
} {
  const income = useStatementChartSlots(companyId, "income-statement")
  const revenue = useStatementChartSlots(companyId, "diagnostic-revenue")
  const expenses = useStatementChartSlots(companyId, "diagnostic-expenses")
  const financial = useStatementChartSlots(companyId, "diagnostic-financial-position")

  const bundles = useMemo(
    () => ({
      "income-statement": toBundle(income.slots, income.loading, income.error),
      "diagnostic-revenue": toBundle(revenue.slots, revenue.loading, revenue.error),
      "diagnostic-expenses": toBundle(expenses.slots, expenses.loading, expenses.error),
      "diagnostic-financial-position": toBundle(financial.slots, financial.loading, financial.error),
    }),
    [
      income.slots,
      income.loading,
      income.error,
      revenue.slots,
      revenue.loading,
      revenue.error,
      expenses.slots,
      expenses.loading,
      expenses.error,
      financial.slots,
      financial.loading,
      financial.error,
    ],
  )

  const bundleForView = useMemo(
    () => (reportView: DiagnosticReportView) => {
      const type = slotTypeForReportView(reportView)
      if (!type) return null
      return bundles[type]
    },
    [bundles],
  )

  const anyLoading = income.loading || revenue.loading || expenses.loading || financial.loading

  return { bundleForView, anyLoading }
}
