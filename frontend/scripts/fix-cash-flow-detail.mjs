import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const detailPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../components/cash-flow-detail.tsx")
let detail = fs.readFileSync(detailPath, "utf8").replace(/\r\n/g, "\n")

const mapBackendNew = `  const mapBackendRows = (apiRows: FinancialStatementRow[]): DetailRow[] => {
    if (statementStructure?.length) {
      return mapRowsFromDetailStructure(apiRows)
    }
    return apiRows.flatMap((row) => {
      const base: DetailRow = {
        label: row.label,
        current: row.current ?? 0,
        prior: row.prior ?? 0,
        indent: !row.isBold && !row.isSection && !row.isResult,
        isBold: row.isBold,
        isSubtotal: row.isResult,
        isSection: row.isSection,
        separatorAbove: isTruthySeparatorAbove(row.separatorAbove),
        annexLetter: row.annexLetter,
        rowId: row.id,
      }
      return [base, ...mapAccountDetailRows(row.detailRows)]
    })
  }`

const getMultiNew = `  const getMultiPeriodData = (): DetailRow[] => {
    if (!seriesRows.length || !periods.length) return []

    if (statementStructure?.length) {
      const trendByRowId = new Map<string, number[]>()
      for (const row of seriesRows) {
        const rawAmounts = getRowAmounts(row, periods)
        let values: number[]
        if (view === "quarters") {
          values = reverseSeriesOrderForDisplay(aggregateToQuarters(rawAmounts, periods).amounts)
        } else if (view === "years") {
          values = reverseSeriesOrderForDisplay(aggregateToYears(rawAmounts, periods).amounts)
        } else {
          values = reverseSeriesOrderForDisplay(rawAmounts)
        }
        if (row.id) trendByRowId.set(row.id, values)
      }
      return mapRowsFromDetailStructure(seriesRows as unknown as FinancialStatementRow[], trendByRowId)
    }

    return seriesRows.flatMap((row) => {
      const rawAmounts = getRowAmounts(row, periods)
      let values: number[]
      if (view === "quarters") {
        values = reverseSeriesOrderForDisplay(aggregateToQuarters(rawAmounts, periods).amounts)
      } else if (view === "years") {
        values = reverseSeriesOrderForDisplay(aggregateToYears(rawAmounts, periods).amounts)
      } else {
        values = reverseSeriesOrderForDisplay(rawAmounts)
      }
      const base: DetailRow = {
        label: row.label,
        current: values[0] || 0,
        prior: values.length >= 2 ? values[1] || 0 : 0,
        indent: !row.isBold && !row.isSection && !row.isResult,
        isBold: row.isBold,
        isSubtotal: row.isResult,
        isSection: row.isSection,
        separatorAbove: isTruthySeparatorAbove((row as { separatorAbove?: unknown }).separatorAbove),
        annexLetter: row.annexLetter,
        rowId: row.id,
        trendValues: row.isSection ? undefined : values,
      }
      return [base, ...mapSeriesAccountDetailRows(row.detailRows)]
    })
  }`

function replaceBetween(source, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start)
  if (start === -1 || end === -1) throw new Error(`markers not found: ${startMarker}`)
  return source.slice(0, start) + replacement + source.slice(end)
}

detail = replaceBetween(
  detail,
  "  const mapBackendRows = (apiRows: FinancialStatementRow[]): DetailRow[] => {",
  "\n\n  // Build multi-period rows from series API data",
  mapBackendNew
)
detail = replaceBetween(
  detail,
  "  const getMultiPeriodData = (): DetailRow[] => {",
  "\n\n  const getDetailData = (): DetailRow[] => {",
  getMultiNew
)

detail = detail.replace(
  "            structure_rev: structureVersion > 0 ? structureVersion : undefined,\n",
  ""
)
detail = detail.replace(", structureVersion])", "])")

if (!detail.includes("separatorAbove?: boolean")) {
  detail = detail.replace(
    "  isSection?: boolean\n  annexLetter?: string",
    "  isSection?: boolean\n  separatorAbove?: boolean\n  annexLetter?: string"
  )
}

fs.writeFileSync(detailPath, detail, "utf8")

const checks = ["hasConfiguredDetailRows", "detailLabel", "structure_rev", "Param?tres", "F?v"]
const found = checks.filter((c) => detail.includes(c))
if (found.length) {
  console.error("still has:", found)
  process.exit(1)
}
console.log("fix-ok")
