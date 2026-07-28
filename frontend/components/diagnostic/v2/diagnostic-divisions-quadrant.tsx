"use client"

import type { DiagnosticDivisionPerformance } from "@/lib/api"
import { formatMoney, formatPercent } from "@/components/diagnostic/diagnostic-format"
import { useCountUpOnVisible } from "@/components/diagnostic/v2/use-count-up"
import type { DrillDownRequest } from "@/components/diagnostic/v2/types"

interface DiagnosticDivisionsQuadrantProps {
  divisions: DiagnosticDivisionPerformance[]
  currency: string
  selectedDivisionId: string | null
  onSelectDivision: (id: string | null) => void
  onDrillDown: (req: DrillDownRequest) => void
}

const VB_W = 520
const VB_H = 330
const PLOT_LEFT = 62
const PLOT_RIGHT = 500
const PLOT_TOP = 14
const PLOT_BOTTOM = 280

/**
 * Rentabilité par division en quadrant croissance × marge, la taille de bulle
 * portant le poids en chiffre d'affaires — plus le tableau détaillé.
 *
 * Remplace `diagnostic-divisions-section.tsx` : le graphique en barres « part
 * du CA » dupliquait une colonne du tableau ; le quadrant, lui, répond
 * directement à « quelle division tire le groupe, laquelle le freine ».
 */
export function DiagnosticDivisionsQuadrant({
  divisions,
  currency,
  selectedDivisionId,
  onSelectDivision,
  onDrillDown,
}: DiagnosticDivisionsQuadrantProps) {
  const { ref, t } = useCountUpOnVisible<HTMLDivElement>(700)

  if (divisions.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        Aucune division configurée pour cette société.
      </p>
    )
  }

  const cagrs = divisions.map((d) => d.revenue_cagr_5y ?? 0)
  const margins = divisions.map((d) => d.ebitda_margin_pct ?? 0)
  const maxCagr = Math.max(25, ...cagrs) * 1.1
  const minCagr = Math.min(0, ...cagrs)
  const maxMargin = Math.max(25, ...margins) * 1.1
  const minMargin = Math.min(-10, ...margins)
  const maxRevenue = Math.max(...divisions.map((d) => d.revenue)) || 1

  const sx = (v: number) => PLOT_LEFT + ((v - minCagr) / (maxCagr - minCagr)) * (PLOT_RIGHT - PLOT_LEFT)
  const sy = (v: number) =>
    PLOT_BOTTOM - ((v - minMargin) / (maxMargin - minMargin)) * (PLOT_BOTTOM - PLOT_TOP)

  const median = (arr: number[]) => {
    const s = [...arr].sort((a, b) => a - b)
    return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
  }
  const medX = sx(median(cagrs))
  const medY = sy(median(margins))

  const openDivision = (d: DiagnosticDivisionPerformance) => {
    onSelectDivision(d.division_id)
    onDrillDown({
      kicker: "Division",
      title: d.division_name,
      subtitle: `${formatPercent(d.revenue_share_pct)} du chiffre d'affaires`,
      stats: [
        { label: "Chiffre d'affaires", value: formatMoney(d.revenue, currency) },
        {
          label: "EBITDA",
          value: formatMoney(d.ebitda, currency),
          tone: d.ebitda < 0 ? "negative" : "positive",
        },
        {
          label: "Marge EBITDA",
          value: formatPercent(d.ebitda_margin_pct),
          tone: (d.ebitda_margin_pct ?? 0) < 0 ? "negative" : "neutral",
        },
        { label: "TCAC 5 ans", value: formatPercent(d.revenue_cagr_5y) },
      ],
      series: [{ label: "CA", value: d.revenue }, { label: "Marge brute", value: d.gross_profit }],
      formatValue: (v) => formatMoney(v, currency),
      notes: d.profitable
        ? [
            `Marge brute de ${formatPercent(d.gross_margin_pct)}.`,
            "Division contributive : elle finance les frais de structure du groupe.",
          ]
        : [
            `Marge brute de ${formatPercent(d.gross_margin_pct)} insuffisante pour couvrir les frais alloués.`,
            "À restructurer ou à sortir : la division consomme la marge des autres.",
          ],
    })
  }

  return (
    <div ref={ref} className="grid gap-0 xl:grid-cols-[520px_1fr]">
      {/* Quadrant */}
      <div className="px-2.5 pb-2.5 pt-3.5 xl:border-r xl:border-slate-200">
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="block h-auto w-full overflow-visible">
          <rect
            x={medX}
            y={PLOT_TOP}
            width={PLOT_RIGHT - medX}
            height={medY - PLOT_TOP}
            fill="rgba(52,211,153,.05)"
          />

          {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
            const v = minCagr + (maxCagr - minCagr) * f
            return (
              <g key={`gx-${i}`}>
                <line x1={sx(v)} x2={sx(v)} y1={PLOT_TOP} y2={PLOT_BOTTOM} stroke="#e2e8f0" />
                <text
                  x={sx(v)}
                  y={296}
                  textAnchor="middle"
                  fontSize={10}
                  fontFamily="ui-monospace,Menlo,monospace"
                  fill="#94a3b8"
                >
                  {Math.round(v)} %
                </text>
              </g>
            )
          })}
          {[0, 0.33, 0.66, 1].map((f, i) => {
            const v = minMargin + (maxMargin - minMargin) * f
            return (
              <g key={`gy-${i}`}>
                <line x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={sy(v)} y2={sy(v)} stroke="#e2e8f0" />
                <text
                  x={54}
                  y={sy(v) + 4}
                  textAnchor="end"
                  fontSize={10}
                  fontFamily="ui-monospace,Menlo,monospace"
                  fill="#94a3b8"
                >
                  {Math.round(v)} %
                </text>
              </g>
            )
          })}

          <line x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={medY} y2={medY} stroke="rgba(224,116,45,.45)" strokeDasharray="4 4" />
          <line x1={medX} x2={medX} y1={PLOT_TOP} y2={PLOT_BOTTOM} stroke="rgba(224,116,45,.45)" strokeDasharray="4 4" />

          <text x={496} y={28} textAnchor="end" fontSize={9.5} letterSpacing={1.2} fill="rgba(52,211,153,.6)">
            MOTEURS
          </text>
          <text x={66} y={272} fontSize={9.5} letterSpacing={1.2} fill="rgba(241,106,92,.65)">
            À RESTRUCTURER
          </text>
          <text x={280} y={318} textAnchor="middle" fontSize={10} fill="#94a3b8">
            TCAC 5 ans du chiffre d&apos;affaires →
          </text>
          <text
            x={14}
            y={150}
            textAnchor="middle"
            transform="rotate(-90 14 150)"
            fontSize={10}
            fill="#94a3b8"
          >
            Marge EBITDA →
          </text>

          {divisions.map((d) => {
            const x = sx(d.revenue_cagr_5y ?? 0)
            const y = sy(d.ebitda_margin_pct ?? 0)
            const r = (10 + Math.sqrt(d.revenue / maxRevenue) * 26) * (0.4 + 0.6 * t)
            return (
              <g key={d.division_id} className="cursor-pointer" onClick={() => openDivision(d)}>
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={d.profitable ? "rgba(52,211,153,.22)" : "rgba(241,106,92,.24)"}
                  stroke={d.profitable ? "#34D399" : "#F16A5C"}
                  strokeWidth={selectedDivisionId === d.division_id ? 3 : 1.6}
                />
                <text
                  x={x}
                  y={y - r - 6}
                  textAnchor="middle"
                  fontSize={10.5}
                  fontWeight={600}
                  fill={d.profitable ? "#2A2F3A" : "#dc2626"}
                >
                  {d.division_name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Tableau */}
      <div className="pt-2">
        <div className="grid grid-cols-[1.3fr_.8fr_.7fr_.7fr_.8fr_.7fr] px-4 pb-2 text-[9.5px] font-semibold uppercase leading-tight tracking-[.08em] text-slate-400">
          <span>Division</span>
          <span className="text-right">CA</span>
          <span className="text-right">Part</span>
          <span className="text-right">Marge</span>
          <span className="text-right">EBITDA</span>
          <span className="text-right">TCAC</span>
        </div>

        {divisions.map((d) => (
          <button
            key={d.division_id}
            type="button"
            data-testid={`division-row-${d.division_id}`}
            data-profitable={d.profitable ? "true" : "false"}
            onClick={() => openDivision(d)}
            className={[
              "grid w-full grid-cols-[1.3fr_.8fr_.7fr_.7fr_.8fr_.7fr] items-center border-t border-slate-200 px-4 py-[9px] text-left transition-colors hover:bg-slate-50",
              selectedDivisionId === d.division_id
                ? "bg-[rgba(224,116,45,.12)]"
                : d.profitable
                  ? ""
                  : "bg-[rgba(241,106,92,.06)]",
            ].join(" ")}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="h-2 w-2 flex-none rounded-sm"
                style={{ background: d.profitable ? "#34D399" : "#F16A5C" }}
              />
              <span
                className="truncate text-xs font-medium"
                style={{ color: d.profitable ? "#2A2F3A" : "#dc2626" }}
              >
                {d.division_name}
              </span>
              {!d.profitable && (
                <span className="flex-none rounded-[5px] bg-[rgba(241,106,92,.14)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[.06em] text-[#F16A5C] shadow-[inset_0_0_0_1px_rgba(241,106,92,.3)]">
                  Déficitaire
                </span>
              )}
            </span>
            <span className="text-right font-mono text-[11.5px] font-medium text-[#2A2F3A] tabular-nums">
              {formatMoney(d.revenue, currency)}
            </span>
            <span className="text-right font-mono text-[11.5px] font-medium text-slate-500 tabular-nums">
              {formatPercent(d.revenue_share_pct)}
            </span>
            <span className="text-right font-mono text-[11.5px] font-medium text-slate-500 tabular-nums">
              {formatPercent(d.ebitda_margin_pct)}
            </span>
            <span
              className="text-right font-mono text-[11.5px] font-medium tabular-nums"
              style={{ color: d.ebitda < 0 ? "#dc2626" : "#2A2F3A" }}
            >
              {formatMoney(d.ebitda, currency)}
            </span>
            <span
              className="text-right font-mono text-[11.5px] font-medium tabular-nums"
              style={{ color: (d.revenue_cagr_5y ?? 0) > 10 ? "#059669" : "#64748b" }}
            >
              {formatPercent(d.revenue_cagr_5y)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
