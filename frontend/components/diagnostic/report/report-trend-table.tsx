import type { CompanyDiagnostic } from "@/lib/api"
import {
  buildChapterTrendTable,
  formatTrendCell,
} from "@/lib/diagnostic-report-trend-table"

interface ReportTrendTableProps {
  diagnostic: CompanyDiagnostic
  chapterId: string
}

/** Tableau détaillé avec lignes alternées, année courante en évidence, variation et TCAC */
export function ReportTrendTable({ diagnostic, chapterId }: ReportTrendTableProps) {
  const { years, rows } = buildChapterTrendTable(diagnostic, chapterId)
  if (!years.length || !rows.length) {
    return (
      <p className="text-sm text-slate-500">Données historiques insuffisantes pour ce tableau.</p>
    )
  }

  const latestYear = years[years.length - 1]
  const currency = diagnostic.currency

  return (
    <div className="report-trend-table-wrap report-avoid-break">
      <p className="report-label">Tableau détaillé</p>
      <table className="report-trend-table">
        <thead>
          <tr>
            <th className="report-trend-th report-trend-th-label">Indicateur</th>
            {years.map((year) => (
              <th
                key={year}
                className={`report-trend-th report-trend-th-year ${year === latestYear ? "report-trend-th-current" : ""}`}
              >
                {year}
              </th>
            ))}
            <th className="report-trend-th report-trend-th-var">Var. N/N-1</th>
            <th className="report-trend-th report-trend-th-cagr">TCAC 5 ans</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={row.label}
              className={rowIndex % 2 === 0 ? "report-trend-row-even" : "report-trend-row-odd"}
            >
              <td className="report-trend-td report-trend-td-label">{row.label}</td>
              {row.values.map((value, i) => {
                const year = years[i]
                return (
                  <td
                    key={`${row.label}-${year}`}
                    className={`report-trend-td report-trend-td-value font-mono tabular-nums ${year === latestYear ? "report-trend-td-current" : ""}`}
                  >
                    {formatTrendCell(value, row.format, currency)}
                  </td>
                )
              })}
              <td
                className={`report-trend-td report-trend-td-var font-mono tabular-nums ${
                  row.yoyPct != null && row.yoyPct >= 0 ? "report-tone-positive" : row.yoyPct != null && row.yoyPct < 0 ? "report-tone-risk" : ""
                }`}
              >
                {row.yoyPct != null ? `${row.yoyPct >= 0 ? "+" : ""}${row.yoyPct.toLocaleString("fr-CA", { maximumFractionDigits: 1 })} %` : "—"}
              </td>
              <td className="report-trend-td report-trend-td-cagr font-mono tabular-nums">
                {row.cagr5y != null ? `${row.cagr5y.toLocaleString("fr-CA", { maximumFractionDigits: 1 })} %` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
