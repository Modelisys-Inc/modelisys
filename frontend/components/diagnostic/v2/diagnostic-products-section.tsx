"use client"

import type { DiagnosticProductPerformance } from "@/lib/api"
import { formatMoney, formatPercent } from "@/components/diagnostic/diagnostic-format"
import { useCountUpOnVisible } from "@/components/diagnostic/v2/use-count-up"
import type { DrillDownRequest } from "@/components/diagnostic/v2/types"

interface DiagnosticProductsSectionProps {
  products: DiagnosticProductPerformance[]
  currency: string
  onDrillDown: (req: DrillDownRequest) => void
}

/**
 * Mix de revenus par produit : barre proportionnelle au CA, colorée selon le
 * signe de la marge. Une ligne rouge saute aux yeux — c'est tout l'intérêt
 * par rapport au tableau actuel.
 */
export function DiagnosticProductsSection({
  products,
  currency,
  onDrillDown,
}: DiagnosticProductsSectionProps) {
  const { ref, t } = useCountUpOnVisible<HTMLDivElement>(700)

  if (products.length === 0) {
    return (
      <p
        data-testid="products-empty-state"
        className="py-10 text-center text-sm text-slate-500"
      >
        Aucun produit ou service configuré pour cette société.
      </p>
    )
  }

  const sorted = [...products].sort((a, b) => b.revenue - a.revenue)
  const maxRevenue = Math.max(...sorted.map((p) => p.revenue)) || 1

  return (
    <div ref={ref} className="flex flex-col gap-2 px-[18px] py-3.5">
      {sorted.map((p) => {
        const margin = p.ebitda_margin_pct ?? 0
        const negative = margin < 0
        return (
          <button
            key={p.product_name}
            type="button"
            onClick={() =>
              onDrillDown({
                kicker: "Produit / service",
                title: p.product_name,
                subtitle: `${formatMoney(p.revenue, currency)} de revenus`,
                stats: [
                  { label: "Revenus", value: formatMoney(p.revenue, currency) },
                  { label: "Marge brute", value: formatPercent(p.gross_margin_pct) },
                  {
                    label: "Marge EBITDA",
                    value: formatPercent(p.ebitda_margin_pct),
                    tone: negative ? "negative" : "positive",
                  },
                  { label: "Part du CA", value: formatPercent(p.revenue_share_pct) },
                ],
                series: [
                  { label: "Revenus", value: p.revenue },
                  { label: "Marge brute", value: p.gross_profit },
                  { label: "EBITDA", value: p.ebitda },
                ],
                formatValue: (v) => formatMoney(v, currency),
                notes: negative
                  ? ["Ligne déficitaire : le prix ne couvre pas le coût complet alloué."]
                  : undefined,
                detailHref: "/analysis/product-margin",
              })
            }
            className="grid grid-cols-[158px_1fr_84px_64px] items-center gap-2.5 text-left transition-opacity hover:opacity-80"
          >
            <span className="truncate text-[11.5px] font-medium leading-tight text-[#2A2F3A]">
              {p.product_name}
            </span>
            <span className="relative block h-4 overflow-hidden rounded bg-slate-100">
              <span
                className="absolute inset-y-0 left-0 rounded"
                style={{
                  width: `${(p.revenue / maxRevenue) * 100 * t}%`,
                  background: negative
                    ? "linear-gradient(90deg,#8E3A31,#F16A5C)"
                    : "linear-gradient(90deg,#0F8F68,#3FE0A8)",
                }}
              />
            </span>
            <span className="text-right font-mono text-[11px] font-medium text-slate-500 tabular-nums">
              {formatMoney(p.revenue, currency)}
            </span>
            <span
              className="text-right font-mono text-[11px] font-semibold tabular-nums"
              style={{ color: negative ? "#dc2626" : margin > 20 ? "#059669" : "#64748b" }}
            >
              {formatPercent(margin)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
