"use client"

import type {
  DiagnosticDivisionProductPerformance,
  DiagnosticProductPerformance,
} from "@/lib/api"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PackageOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  formatMoney,
  formatPercent,
} from "@/components/diagnostic/diagnostic-format"

/** Cellule numérique alignée à droite — rouge lorsque la valeur est négative. */
function numCellClass(value: number | null | undefined): string {
  return cn(
    "text-right font-mono text-sm",
    value !== null && value !== undefined && value < 0 && "font-semibold text-red-600"
  )
}

interface DiagnosticProductsSectionProps {
  products: DiagnosticProductPerformance[]
  divisionProducts: DiagnosticDivisionProductPerformance[]
  currency: string
}

/** Revenus et marges par produits/services, avec ventilation par division si disponible. */
export function DiagnosticProductsSection({
  products,
  divisionProducts,
  currency,
}: DiagnosticProductsSectionProps) {
  if (products.length === 0) {
    return (
      <div
        data-testid="products-empty-state"
        className="flex flex-col items-center justify-center py-10 text-center"
      >
        <PackageOpen className="mb-3 h-10 w-10 text-slate-300" aria-hidden />
        <p className="text-sm text-slate-500">
          Aucun produit/service mappé — associez des produits dans le mappage des comptes.
        </p>
      </div>
    )
  }

  // Ventilation par division : regrouper les lignes produit sous chaque division.
  const byDivision = new Map<
    string,
    { division_name: string; rows: DiagnosticDivisionProductPerformance[] }
  >()
  for (const row of divisionProducts) {
    const entry = byDivision.get(row.division_id)
    if (entry) {
      entry.rows.push(row)
    } else {
      byDivision.set(row.division_id, {
        division_name: row.division_name,
        rows: [row],
      })
    }
  }

  return (
    <div className="space-y-8">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit / Service</TableHead>
              <TableHead className="text-right">Chiffre d&apos;affaires</TableHead>
              <TableHead className="text-right">Part du CA</TableHead>
              <TableHead className="text-right">Marge brute</TableHead>
              <TableHead className="text-right">EBITDA</TableHead>
              <TableHead className="text-right">Marge EBITDA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.product_name}>
                <TableCell className="font-medium text-slate-900">{p.product_name}</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatMoney(p.revenue, currency)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatPercent(p.revenue_share_pct)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatPercent(p.gross_margin_pct)}
                </TableCell>
                <TableCell className={numCellClass(p.ebitda)}>
                  {formatMoney(p.ebitda, currency)}
                </TableCell>
                <TableCell className={numCellClass(p.ebitda_margin_pct)}>
                  {formatPercent(p.ebitda_margin_pct)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {byDivision.size > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-slate-700">
            Ventilation par division
          </h3>
          <div className="space-y-5">
            {Array.from(byDivision.entries()).map(([divisionId, group]) => (
              <div key={divisionId}>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {group.division_name}
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit / Service</TableHead>
                        <TableHead className="text-right">Chiffre d&apos;affaires</TableHead>
                        <TableHead className="text-right">Marge brute</TableHead>
                        <TableHead className="text-right">EBITDA</TableHead>
                        <TableHead className="text-right">Marge EBITDA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.rows.map((row) => (
                        <TableRow key={`${divisionId}-${row.product_name}`}>
                          <TableCell className="font-medium text-slate-900">
                            {row.product_name}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatMoney(row.revenue, currency)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatPercent(row.gross_margin_pct)}
                          </TableCell>
                          <TableCell className={numCellClass(row.ebitda)}>
                            {formatMoney(row.ebitda, currency)}
                          </TableCell>
                          <TableCell className={numCellClass(row.ebitda_margin_pct)}>
                            {formatPercent(row.ebitda_margin_pct)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
