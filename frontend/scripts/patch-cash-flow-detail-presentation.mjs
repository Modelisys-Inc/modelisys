import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const detailPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../components/cash-flow-detail.tsx")
let detail = fs.readFileSync(detailPath, "utf8").replace(/\r\n/g, "\n")

if (!detail.includes("detailLineLabelForDisplay")) {
  detail = detail.replace(
    `  findStatementApiRowForStructureRow,
  indentForSummaryRow,
  isTruthySeparatorAbove,
  listStructureRowsForPresentationDisplay,
} from "@/lib/income-statement-structure-utils"`,
    `  detailLineLabelForDisplay,
  findStatementApiRowForStructureRow,
  indentForSummaryRow,
  isCodeMappingEnabled,
  isStructureRowEmptyLabel,
  isTruthySeparatorAbove,
  listStructureRowsForPresentationDisplay,
} from "@/lib/income-statement-structure-utils"`
  )
}

detail = detail.replace(
  `  isDetailAccount?: boolean
  // For trend views`,
  `  isDetailAccount?: boolean
  hasLiaisonCode?: boolean
  // For trend views`
)

const oldStructureRowToDetailRow = `  const structureRowToDetailRow = (
    sr: Record<string, unknown>,
    row: FinancialStatementRow | undefined,
    trendValues?: number[]
  ): DetailRow => {
    const label = String(sr.label ?? row?.label ?? "")
    const isBold = typeof sr.isBold === "boolean" ? sr.isBold : !!row?.isBold
    const isSection = typeof sr.isSection === "boolean" ? sr.isSection : !!row?.isSection
    const isResult = typeof sr.isResult === "boolean" ? sr.isResult : !!row?.isResult
    return {
      label,
      current: row?.current ?? (trendValues ? trendValues[0] || 0 : 0),
      prior: row?.prior ?? (trendValues && trendValues.length >= 2 ? trendValues[1] || 0 : 0),
      indent: indentForSummaryRow({
        isBold: !!isBold,
        isSection: !!isSection,
        isResult: !!isResult,
        indent: typeof sr.indent === "boolean" ? sr.indent : row?.indent,
      }),
      isBold,
      isSubtotal: isResult,
      isSection,
      separatorAbove: isTruthySeparatorAbove(sr.separatorAbove ?? row?.separatorAbove),
      annexLetter: row?.annexLetter,
      rowId: row?.id ?? String(sr.id ?? sr.linkCode ?? ""),
      trendValues: isSection ? undefined : trendValues,
    }
  }`

const newStructureRowToDetailRow = `  const structureRowToDetailRow = (
    sr: Record<string, unknown>,
    row: FinancialStatementRow | undefined,
    trendValues?: number[]
  ): DetailRow => {
    if (isStructureRowEmptyLabel(sr)) {
      return {
        label: "",
        current: 0,
        prior: 0,
        isBold: false,
        isSubtotal: false,
        isSection: false,
        separatorAbove: isTruthySeparatorAbove(sr.separatorAbove),
        rowId: String(sr.id ?? ""),
        hasLiaisonCode: false,
      }
    }
    const label = detailLineLabelForDisplay(sr, row?.label ?? "")
    const isBold = typeof sr.isBold === "boolean" ? sr.isBold : !!row?.isBold
    const isSection = typeof sr.isSection === "boolean" ? sr.isSection : !!row?.isSection
    const isResult = typeof sr.isResult === "boolean" ? sr.isResult : !!row?.isResult
    const hasLiaisonCode = row?.hasLiaisonCode ?? isCodeMappingEnabled(sr)
    return {
      label,
      current: row?.current ?? (trendValues ? trendValues[0] || 0 : 0),
      prior: row?.prior ?? (trendValues && trendValues.length >= 2 ? trendValues[1] || 0 : 0),
      indent: indentForSummaryRow({
        isBold: !!isBold,
        isSection: !!isSection,
        isResult: !!isResult,
        indent: typeof sr.indent === "boolean" ? sr.indent : row?.indent,
      }),
      isBold,
      isSubtotal: isResult,
      isSection,
      separatorAbove: isTruthySeparatorAbove(sr.separatorAbove ?? row?.separatorAbove),
      annexLetter: row?.annexLetter,
      rowId: row?.id ?? String(sr.id ?? sr.linkCode ?? ""),
      hasLiaisonCode,
      trendValues: isSection ? undefined : trendValues,
    }
  }`

if (!detail.includes(oldStructureRowToDetailRow)) {
  throw new Error("structureRowToDetailRow block not found")
}
detail = detail.replace(oldStructureRowToDetailRow, newStructureRowToDetailRow)

detail = detail.replace(
  `    const displayRows = listStructureRowsForPresentationDisplay(statementStructure)
    return displayRows.flatMap((sr) => {
      const row = findStatementApiRowForStructureRow(apiRows, sr)`,
  `    const displayRows = listStructureRowsForPresentationDisplay(statementStructure)
    const used = new Set<number>()
    return displayRows.flatMap((sr) => {
      if (isStructureRowEmptyLabel(sr)) {
        return [structureRowToDetailRow(sr, undefined)]
      }
      const row = findStatementApiRowForStructureRow(sr, apiRows, used)`
)

detail = detail.replace(
  `              const displayLabel = row.isDetailAccount ? row.label : row.isSection ? capitalizeFirst(row.label) : row.label
              const isSpacer = row.label === ""
              const shouldHideAmounts = isSpacer || !!row.isSection`,
  `              const displayLabel = row.label
              const isSpacer = row.label === ""
              const shouldHideAmounts =
                isSpacer || !!row.isSection || row.hasLiaisonCode === false`
)

detail = detail.replace(
  `  const getDetailData = (): DetailRow[] => {
    if (isMultiPeriod) {
      return getMultiPeriodData()
    }
    if (backendRows.length > 0) {
      return mapBackendRows(backendRows)
    }
    return []
  }`,
  `  const getDetailData = (): DetailRow[] => {
    if (isMultiPeriod) {
      return getMultiPeriodData()
    }
    if (statementStructure?.length || backendRows.length > 0) {
      return mapBackendRows(backendRows)
    }
    return []
  }`
)

detail = detail.replace(
  `  const getMultiPeriodData = (): DetailRow[] => {
    if (!seriesRows.length || !periods.length) return []

    if (statementStructure?.length) {`,
  `  const getMultiPeriodData = (): DetailRow[] => {
    if (statementStructure?.length) {
      if (!seriesRows.length || !periods.length) {
        return mapRowsFromDetailStructure([])
      }`
)

detail = detail.replace(
  `      return mapRowsFromDetailStructure(seriesRows as unknown as FinancialStatementRow[], trendByRowId)
    }

    return seriesRows.flatMap((row) => {`,
  `      return mapRowsFromDetailStructure(seriesRows as unknown as FinancialStatementRow[], trendByRowId)
    }

    if (!seriesRows.length || !periods.length) return []

    return seriesRows.flatMap((row) => {`
)

fs.writeFileSync(detailPath, detail, "utf8")
const bad = (detail.match(/Param\?tres|D\?tail|DÃ©tail/g) || []).length
if (bad > 0) throw new Error("encoding corruption detected")
console.log("presentation patch ok")
