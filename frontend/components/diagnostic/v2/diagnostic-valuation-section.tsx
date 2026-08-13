"use client"

import { Info } from "lucide-react"
import type { DiagnosticValuation } from "@/lib/api"
import { formatMoney, formatMultiple } from "@/components/diagnostic/diagnostic-format"
import { useCountUpOnVisible } from "@/components/diagnostic/v2/use-count-up"

interface ValuationMethod {
  label: string
  low: number
  high: number
  primary?: boolean
}

interface DiagnosticValuationSectionProps {
  valuation: DiagnosticValuation
  notes: string[]
  currency: string
  /**
   * Approches complémentaires (multiple de CA, flux actualisés, transactions
   * comparables). ⚠️ ABSENTES de l'API actuelle — voir api-gaps.md, point 6.
   * Sans elles, le graphique n'affiche que la fourchette par multiple d'EBITDA.
   */
  additionalMethods?: ValuationMethod[]
  /**
   * Passage VE → capitaux propres. ⚠️ `net_debt` et `cash` ABSENTS de l'API.
   */
  equityBridge?: { label: string; value: number; emphasis?: boolean }[]
}

/**
 * Valorisation en « football field » : une barre par approche, la bande verte
 * marquant la zone de recoupement et le trait vertical le consensus.
 *
 * Remplace les trois cartes VE basse / moyenne / haute : une fourchette se lit
 * sur un axe, pas dans trois encadrés côte à côte.
 */
export function DiagnosticValuationSection({
  valuation,
  notes,
  currency,
  additionalMethods = [],
  equityBridge,
}: DiagnosticValuationSectionProps) {
  const { ref, t } = useCountUpOnVisible<HTMLDivElement>(700)

  const methods: ValuationMethod[] = [
    {
      label: "Multiple d'EBITDA",
      low: valuation.enterprise_value_low,
      high: valuation.enterprise_value_high,
      primary: true,
    },
    ...additionalMethods,
  ]

  const lo = Math.min(...methods.map((m) => m.low))
  const hi = Math.max(...methods.map((m) => m.high))
  const pad = (hi - lo) * 0.18 || 1
  const axisLo = lo - pad
  const axisHi = hi + pad

  const VB_W = 660
  const LEFT = 150
  const RIGHT = 630
  const fx = (v: number) => LEFT + ((v - axisLo) / (axisHi - axisLo)) * (RIGHT - LEFT)

  // Zone de recoupement : intersection de toutes les fourchettes.
  const overlapLow = Math.max(...methods.map((m) => m.low))
  const overlapHigh = Math.min(...methods.map((m) => m.high))
  const hasOverlap = overlapHigh > overlapLow

  const ticks = Array.from({ length: 6 }, (_, i) => axisLo + ((axisHi - axisLo) / 5) * i)
  const rowHeight = 42
  const chartHeight = 46 + methods.length * rowHeight

  return (
    <div ref={ref} className="grid gap-0 xl:grid-cols-[1.5fr_1fr]">
      <div className="px-5 py-4 xl:border-r xl:border-slate-200">
        <svg viewBox={`0 0 ${VB_W} ${chartHeight}`} className="block h-auto w-full overflow-visible">
          {hasOverlap && (
            <rect
              x={fx(overlapLow)}
              y={10}
              width={fx(overlapHigh) - fx(overlapLow)}
              height={chartHeight - 60}
              fill="rgba(52,211,153,.07)"
            />
          )}

          {ticks.map((v, i) => (
            <g key={i}>
              <line x1={fx(v)} x2={fx(v)} y1={10} y2={chartHeight - 50} stroke="#e2e8f0" />
              <text
                x={fx(v)}
                y={chartHeight - 32}
                textAnchor="middle"
                fontSize={10}
                fontFamily="ui-monospace,Menlo,monospace"
                fill="#94a3b8"
              >
                {formatMoney(v, currency)}
              </text>
            </g>
          ))}

          {methods.map((m, i) => {
            const y = 26 + i * rowHeight
            return (
              <g key={m.label}>
                <text x={0} y={y + 13} fontSize={11} fontWeight={500} fill="#64748b">
                  {m.label}
                </text>
                <rect
                  x={fx(m.low)}
                  y={y}
                  width={(fx(m.high) - fx(m.low)) * t}
                  height={18}
                  rx={9}
                  fill={m.primary ? "rgba(52,211,153,.5)" : "#cbd5e1"}
                />
                <text
                  x={fx(m.low) - 7}
                  y={y + 13}
                  textAnchor="end"
                  fontSize={10}
                  fontFamily="ui-monospace,Menlo,monospace"
                  fill="#94a3b8"
                >
                  {formatMoney(m.low, currency)}
                </text>
                <text
                  x={fx(m.high) + 7}
                  y={y + 13}
                  fontSize={10}
                  fontFamily="ui-monospace,Menlo,monospace"
                  fill="#94a3b8"
                >
                  {formatMoney(m.high, currency)}
                </text>
              </g>
            )
          })}

          <line
            x1={fx(valuation.enterprise_value_mid)}
            x2={fx(valuation.enterprise_value_mid)}
            y1={6}
            y2={chartHeight - 46}
            stroke="#34D399"
            strokeWidth={2}
          />
          <text
            x={fx(valuation.enterprise_value_mid)}
            y={chartHeight - 10}
            textAnchor="middle"
            fontSize={11}
            fontWeight={600}
            fontFamily="ui-monospace,Menlo,monospace"
            fill="#34D399"
          >
            consensus {formatMoney(valuation.enterprise_value_mid, currency)}
          </text>
        </svg>
      </div>

      <div className="flex flex-col gap-0.5 px-5 py-4">
        <div className="grid grid-cols-2 gap-2.5 pb-3">
          <div className="rounded-[9px] border border-slate-200 bg-slate-50/80 px-3 py-2.5">
            <div className="text-[9px] font-semibold uppercase tracking-[.1em] text-slate-400">
              EBITDA normalisé
            </div>
            <div className="mt-1 font-mono text-[15px] font-semibold text-[#2A2F3A] tabular-nums">
              {formatMoney(valuation.normalized_ebitda, currency)}
            </div>
          </div>
          <div className="rounded-[9px] border border-slate-200 bg-slate-50/80 px-3 py-2.5">
            <div className="text-[9px] font-semibold uppercase tracking-[.1em] text-slate-400">
              Fourchette de multiples
            </div>
            <div className="mt-1 font-mono text-[15px] font-semibold text-[#2A2F3A] tabular-nums">
              {formatMultiple(valuation.multiple_low)} – {formatMultiple(valuation.multiple_high)}
            </div>
          </div>
        </div>

        {equityBridge
          ? equityBridge.map((row, i) => (
              <div
                key={i}
                className={[
                  "flex items-baseline justify-between gap-3 py-2.5",
                  i === equityBridge.length - 1
                    ? "mt-1 border-t border-[rgba(52,211,153,.3)]"
                    : "border-b border-slate-200",
                ].join(" ")}
              >
                <span
                  className={row.emphasis ? "text-[12.5px] font-semibold text-[#2A2F3A]" : "text-xs text-slate-500"}
                >
                  {row.label}
                </span>
                <span
                  className={
                    row.emphasis
                      ? "font-mono text-sm font-semibold text-[#34D399] tabular-nums"
                      : "font-mono text-xs font-medium text-slate-500 tabular-nums"
                  }
                >
                  {formatMoney(row.value, currency)}
                </span>
              </div>
            ))
          : (
              <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 py-2.5">
                <span className="text-xs text-slate-500">Capitaux propres comptables</span>
                <span className="font-mono text-xs font-medium text-slate-500 tabular-nums">
                  {formatMoney(valuation.book_equity, currency)}
                </span>
              </div>
            )}

        {valuation.rationale.length > 0 && (
          <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-4">
            {valuation.rationale.map((item, i) => (
              <li key={i} className="text-[11px] leading-relaxed text-slate-500">
                {item}
              </li>
            ))}
          </ul>
        )}

        {notes.length > 0 && (
          <div
            data-testid="valuation-notes"
            className="mt-3 flex gap-2.5 rounded-[9px] border border-slate-200 bg-slate-50/80 px-3 py-2.5"
          >
            <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-slate-400" aria-hidden />
            <div className="flex flex-col gap-1 text-[10.5px] leading-relaxed text-slate-400">
              {notes.map((n, i) => (
                <p key={i}>{n}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
