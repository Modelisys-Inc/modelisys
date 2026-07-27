"use client"

import type { CompanyDiagnostic } from "@/lib/api"
import {
  formatMoney,
  formatPercent,
  formatRatio,
} from "@/components/diagnostic/diagnostic-format"

interface DiagnosticKpiCardsProps {
  diagnostic: CompanyDiagnostic
}

interface KpiCard {
  label: string
  value: string
  hint?: string
}

/** Rangée de cartes KPI : lecture en quelques secondes de la santé de la société. */
export function DiagnosticKpiCards({ diagnostic }: DiagnosticKpiCardsProps) {
  const { summary, currency } = diagnostic

  const cards: KpiCard[] = [
    {
      label: "Chiffre d'affaires",
      value: formatMoney(summary.latest_revenue, currency),
      hint: `Exercice ${summary.latest_fiscal_year}`,
    },
    {
      label: "EBITDA",
      value: formatMoney(summary.latest_ebitda, currency),
      hint: `Marge : ${formatPercent(summary.latest_ebitda_margin_pct)}`,
    },
    {
      label: "Bénéfice net",
      value: formatMoney(summary.latest_net_income, currency),
      hint: `Marge : ${formatPercent(summary.latest_net_margin_pct)}`,
    },
    {
      label: "Ratio de liquidité",
      value: formatRatio(summary.current_ratio),
      hint: `Liquidité relative : ${formatRatio(summary.quick_ratio)}`,
    },
    {
      label: "Dette / Capitaux propres",
      value: formatRatio(summary.debt_to_equity),
      hint: "Levier financier",
    },
    {
      label: "Capex",
      value: formatMoney(summary.capex_latest, currency),
      hint: `${formatPercent(summary.capex_revenue_pct)} du CA`,
    },
    {
      label: "Valeur d'entreprise indicative",
      value: formatMoney(summary.indicative_enterprise_value_mid, currency),
      hint: "Point médian de la fourchette",
    },
  ]

  return (
    <div
      data-testid="kpi-cards"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"
    >
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm"
        >
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {card.label}
          </div>
          <div className="mt-1 truncate text-lg font-semibold text-slate-900" title={card.value}>
            {card.value}
          </div>
          {card.hint && <div className="mt-0.5 text-xs text-slate-500">{card.hint}</div>}
        </div>
      ))}
    </div>
  )
}
