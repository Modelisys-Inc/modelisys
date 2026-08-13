"use client"

import type { CompanyDiagnostic } from "@/lib/api"
import {
  formatCompactMoney,
  formatMoney,
  formatPercent,
  formatRatio,
} from "@/components/diagnostic/diagnostic-format"
import { useCountUp } from "@/components/diagnostic/v2/use-count-up"
import type { DrillDownRequest } from "@/components/diagnostic/v2/types"

interface KpiDefinition {
  key: string
  label: string
  value: number
  format: (v: number) => string
  /** Série 5 ans pour la sparkline et le tiroir de détail. */
  series: { year: number; value: number }[]
  hint: string
  /** true si une hausse est favorable. */
  higherIsBetter: boolean
}

interface DiagnosticKpiStripProps {
  diagnostic: CompanyDiagnostic
  onDrillDown: (req: DrillDownRequest) => void
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const points = values
    .map((v, i) => `${(i * (72 / (values.length - 1))).toFixed(1)},${(22 - ((v - min) / range) * 20).toFixed(1)}`)
    .join(" ")

  return (
    <svg viewBox="0 0 72 24" preserveAspectRatio="none" className="h-[22px] w-[72px] flex-none opacity-90">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Bandeau de 7 cartes KPI, chacune avec sparkline 5 ans, variation vs N-1
 * et ouverture du tiroir de détail au clic.
 *
 * Remplace `diagnostic-kpi-cards.tsx`.
 */
export function DiagnosticKpiStrip({ diagnostic, onDrillDown }: DiagnosticKpiStripProps) {
  const t = useCountUp(900)
  const { summary, currency } = diagnostic
  const years = [...diagnostic.trends].sort((a, b) => a.fiscal_year - b.fiscal_year)
  const latest = years[years.length - 1]
  const previous = years.length > 1 ? years[years.length - 2] : null

  const seriesOf = (pick: (y: (typeof years)[number]) => number | null) =>
    years.map((y) => ({ year: y.fiscal_year, value: pick(y) ?? 0 }))

  const money = (v: number) => formatMoney(v, currency)

  const kpis: KpiDefinition[] = [
    {
      key: "revenue",
      label: "Chiffre d'affaires",
      value: summary.latest_revenue,
      format: money,
      series: seriesOf((y) => y.revenue),
      hint: `TCAC 5 ans ${formatPercent(summary.revenue_cagr_5y)}`,
      higherIsBetter: true,
    },
    {
      key: "ebitda",
      label: "EBITDA",
      value: summary.latest_ebitda,
      format: money,
      series: seriesOf((y) => y.ebitda),
      hint: `Marge ${formatPercent(summary.latest_ebitda_margin_pct)}`,
      higherIsBetter: true,
    },
    {
      key: "net_income",
      label: "Bénéfice net",
      value: summary.latest_net_income,
      format: money,
      series: seriesOf((y) => y.net_income),
      hint: `Marge ${formatPercent(summary.latest_net_margin_pct)}`,
      higherIsBetter: true,
    },
    {
      key: "gross_margin",
      label: "Marge brute",
      value: summary.latest_gross_margin_pct ?? 0,
      format: (v) => formatPercent(v),
      series: seriesOf((y) => y.gross_margin_pct),
      hint: "Après coût des ventes",
      higherIsBetter: true,
    },
    {
      key: "debt_to_equity",
      label: "Dette / capitaux propres",
      value: summary.debt_to_equity ?? 0,
      format: (v) => formatRatio(v),
      series: seriesOf((y) => y.debt_to_equity),
      hint: "Levier financier",
      higherIsBetter: false,
    },
    {
      key: "current_ratio",
      label: "Ratio de liquidité",
      value: summary.current_ratio ?? 0,
      format: (v) => formatRatio(v),
      series: seriesOf((y) => y.current_ratio),
      hint: `Liquidité relative ${formatRatio(summary.quick_ratio)}`,
      higherIsBetter: true,
    },
    {
      key: "enterprise_value",
      label: "Valeur d'entreprise",
      value: summary.indicative_enterprise_value_mid,
      format: (v) => formatCompactMoney(v, currency),
      series: years.map((y) => ({
        year: y.fiscal_year,
        // Approximation : EBITDA × multiple médian retenu par la valorisation.
        value: y.ebitda * ((diagnostic.valuation.multiple_low + diagnostic.valuation.multiple_high) / 2),
      })),
      hint: "Point médian de la fourchette",
      higherIsBetter: true,
    },
  ]

  return (
    <div
      data-testid="kpi-cards"
      className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 md:grid-cols-4 xl:grid-cols-7"
    >
      {kpis.map((k) => {
        const prevValue = k.series.length > 1 ? k.series[k.series.length - 2].value : null
        const deltaPct =
          prevValue && prevValue !== 0 ? ((k.value - prevValue) / Math.abs(prevValue)) * 100 : null
        const good = deltaPct === null ? true : k.higherIsBetter ? deltaPct >= 0 : deltaPct <= 0
        const color = good ? "#34D399" : "#F16A5C"

        return (
          <button
            key={k.key}
            type="button"
            onClick={() =>
              onDrillDown({
                kicker: "Indicateur",
                title: k.label,
                subtitle: `Exercice ${latest?.fiscal_year ?? ""}`,
                stats: [
                  { label: "Valeur", value: k.format(k.value), tone: "neutral" },
                  {
                    label: "Variation vs N-1",
                    value: deltaPct === null ? "—" : `${deltaPct >= 0 ? "+" : "−"}${formatPercent(Math.abs(deltaPct))}`,
                    tone: good ? "positive" : "negative",
                  },
                ],
                series: k.series.map((s) => ({ label: String(s.year), value: s.value })),
                formatValue: k.format,
              })
            }
            className="flex min-w-0 cursor-pointer flex-col gap-1.5 bg-white px-3.5 pb-[11px] pt-[13px] text-left transition-colors hover:bg-slate-50"
          >
            <span className="text-[9.5px] font-semibold uppercase leading-tight tracking-[.1em] text-slate-400">
              {k.label}
            </span>
            <span className="truncate font-mono text-[19px] font-semibold leading-tight tracking-[-.02em] text-[#2A2F3A] tabular-nums">
              {k.format(k.value * t)}
            </span>
            <span className="flex items-end justify-between gap-2">
              <span className="text-[10.5px] font-medium leading-tight" style={{ color }}>
                {deltaPct === null
                  ? "—"
                  : `${deltaPct >= 0 ? "▲" : "▼"} ${formatPercent(Math.abs(deltaPct))} vs ${previous?.fiscal_year ?? ""}`}
              </span>
              <Sparkline values={k.series.map((s) => s.value)} color={color} />
            </span>
            <span className="text-[10px] leading-tight text-slate-400">{k.hint}</span>
          </button>
        )
      })}
    </div>
  )
}
