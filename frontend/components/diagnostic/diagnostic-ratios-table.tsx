"use client"

import type { DiagnosticTrendYear } from "@/lib/api"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatPercent,
  formatRatio,
} from "@/components/diagnostic/diagnostic-format"

interface DiagnosticRatiosTableProps {
  trends: DiagnosticTrendYear[]
}

interface RatioRow {
  label: string
  render: (year: DiagnosticTrendYear) => string
}

const RATIO_ROWS: RatioRow[] = [
  { label: "Ratio de liquidité", render: (y) => formatRatio(y.current_ratio) },
  { label: "Ratio de liquidité relative", render: (y) => formatRatio(y.quick_ratio) },
  { label: "Dette / Capitaux propres", render: (y) => formatRatio(y.debt_to_equity) },
  { label: "Rotation de l'actif", render: (y) => formatRatio(y.asset_turnover) },
  { label: "Couverture des intérêts", render: (y) => formatRatio(y.interest_coverage, 1) },
  { label: "Marge brute", render: (y) => formatPercent(y.gross_margin_pct) },
  { label: "Marge EBITDA", render: (y) => formatPercent(y.ebitda_margin_pct) },
  { label: "Marge nette", render: (y) => formatPercent(y.net_margin_pct) },
]

/** Ratios financiers sur 5 ans : lignes = ratios, colonnes = exercices. */
export function DiagnosticRatiosTable({ trends }: DiagnosticRatiosTableProps) {
  if (trends.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        Aucune donnée disponible pour calculer les ratios.
      </p>
    )
  }

  const years = [...trends].sort((a, b) => a.fiscal_year - b.fiscal_year)

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Ratio</TableHead>
            {years.map((y) => (
              <TableHead key={y.fiscal_year} className="text-right">
                {y.fiscal_year}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {RATIO_ROWS.map((row) => (
            <TableRow key={row.label}>
              <TableCell className="font-medium text-slate-900">{row.label}</TableCell>
              {years.map((y) => (
                <TableCell
                  key={`${row.label}-${y.fiscal_year}`}
                  className="text-right font-mono text-sm"
                >
                  {row.render(y)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
