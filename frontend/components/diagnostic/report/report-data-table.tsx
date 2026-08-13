import type { ReactNode } from "react"
import { hideEmptyYears } from "@/lib/report-hide-empty-years"

export interface DataTableColumn<T> {
  key: string
  header: string
  align?: "left" | "right"
  highlight?: boolean
  render: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  getRowKey: (row: T) => string
  /** Colonne année à mettre en évidence (ex. 2026) */
  highlightColumn?: string
  /** Masquer les colonnes année entièrement à zéro */
  hideEmptyYears?: boolean
  yearColumns?: { key: string; year: number; getValue: (row: T) => number | null }[]
  emptyMessage?: string
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  highlightColumn,
  hideEmptyYears: shouldHideEmptyYears = false,
  yearColumns,
  emptyMessage = "Données non disponibles pour cette période",
}: DataTableProps<T>) {
  if (!rows.length) {
    return <p className="report-empty-state">{emptyMessage}</p>
  }

  let visibleYearCols = yearColumns ?? []
  if (shouldHideEmptyYears && yearColumns?.length) {
    const years = yearColumns.map((c) => c.year)
    const pseudoRows = rows.map((row) => ({
      values: yearColumns.map((c) => c.getValue(row)),
    }))
    const filtered = hideEmptyYears(years, pseudoRows)
    visibleYearCols = yearColumns.filter((c) => filtered.years.includes(c.year))
  }

  return (
    <div className="report-data-table-wrap report-avoid-break">
      <table className="report-data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`report-data-th ${col.align === "right" ? "report-data-th-right" : ""} ${col.highlight ? "report-data-th-highlight" : ""}`}
              >
                {col.header}
              </th>
            ))}
            {visibleYearCols.map((yc) => (
              <th
                key={yc.key}
                className={`report-data-th report-data-th-right ${String(yc.year) === highlightColumn || yc.key === highlightColumn ? "report-data-th-highlight" : ""}`}
              >
                {yc.year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={getRowKey(row)}
              className={rowIndex % 2 === 0 ? "report-data-row-even" : "report-data-row-odd"}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`report-data-td ${col.align === "right" ? "report-data-td-right" : ""}`}
                >
                  {col.render(row)}
                </td>
              ))}
              {visibleYearCols.map((yc) => (
                <td
                  key={yc.key}
                  className={`report-data-td report-data-td-right tabular-nums ${
                    String(yc.year) === highlightColumn || yc.key === highlightColumn
                      ? "report-data-td-highlight"
                      : ""
                  }`}
                >
                  {yc.getValue(row) != null
                    ? yc.getValue(row)!.toLocaleString("fr-CA", { maximumFractionDigits: 0 })
                    : "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
