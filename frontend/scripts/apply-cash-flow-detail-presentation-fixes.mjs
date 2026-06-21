import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const detailPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../components/cash-flow-detail.tsx")
let d = fs.readFileSync(detailPath, "utf8")

if (!d.includes("detailLineLabelForDisplay")) {
  d = d.replace(
    `import {
  findStatementApiRowForStructureRow,
  indentForSummaryRow,
  isTruthySeparatorAbove,
  listStructureRowsForPresentationDisplay,
} from "@/lib/income-statement-structure-utils"`,
    `import {
  detailLineLabelForDisplay,
  findStatementApiRowForStructureRow,
  indentForSummaryRow,
  isCodeMappingEnabled,
  isStructureRowEmptyLabel,
  isTruthySeparatorAbove,
  listStructureRowsForPresentationDisplay,
} from "@/lib/income-statement-structure-utils"`
  )
}

const DETAIL_TITLE = "D\u00e9tail"

if (!d.includes("[statementStructure, setStatementStructure]")) {
  d = d.replace(
    `export function CashFlowDetail({
  period,
  view,
  columnMode = "variations",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  title,
  fiscalYear,
  rows: backendRows = [],
  loading = false,
  showCashFlowStructureSettings = false,
  structureVersion = 0,
  onCashFlowStructureSaved,
}: CashFlowDetailProps) {
  // Series data for multi-period views`,
    `export function CashFlowDetail({
  period,
  view,
  columnMode = "variations",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  title = "${DETAIL_TITLE}",
  comparisonType = "lastMonth",
  selectedBudgetName = null,
  refMonth,
  refYear,
  fiscalYear,
  rows: backendRows = [],
  loading = false,
  showCashFlowStructureSettings = false,
  structureVersion = 0,
  onCashFlowStructureSaved,
  showDetailStructureSettings,
  detailStructureVersion = 0,
  onDetailStructureSaved,
}: CashFlowDetailProps) {
  const effectiveShowStructureSettings = showDetailStructureSettings ?? showCashFlowStructureSettings
  const effectiveStructureVersion = detailStructureVersion || structureVersion
  const handleStructureSaved = onDetailStructureSaved ?? onCashFlowStructureSaved
  const [statementStructure, setStatementStructure] = useState<Record<string, unknown>[] | null>(null)
  const [structureLoading, setStructureLoading] = useState(false)

  useEffect(() => {
    if (!companyId) {
      setStatementStructure(null)
      setStructureLoading(false)
      return
    }
    let cancelled = false
    setStructureLoading(true)
    getStatementStructure(companyId, "cash-flow-detail")
      .then((data) => {
        if (!cancelled) setStatementStructure(data.structure as Record<string, unknown>[])
      })
      .catch(() => {
        if (!cancelled) setStatementStructure(null)
      })
      .finally(() => {
        if (!cancelled) setStructureLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [companyId, effectiveStructureVersion])

  // Series data for multi-period views`
  )
}

d = d.replace(
  "listStructureRowsForSummaryDisplay(statementStructure)",
  "listStructureRowsForPresentationDisplay(statementStructure)"
)

d = d.replace(/onSaved=\{onCashFlowStructureSaved\}/g, "onSaved={handleStructureSaved}")

d = d.replace(
  "separatorAbove: isTruthySeparatorAbove(sr.separatorAbove ?? row?.separatorAbove),",
  "separatorAbove: isTruthySeparatorAbove(sr.separatorAbove),"
)

d = d.replace(
  `              const showSeparatorAbove = isTruthySeparatorAbove(row.separatorAbove)

              const nextRow = idx < data.length - 1 ? data[idx + 1] : null
              const nextRowIsKeyResult = nextRow && nextRow.isSubtotal

              return (`,
  `              const showSeparatorAbove = isTruthySeparatorAbove(row.separatorAbove)
              const isBoldRow = !!row.isBold

              return (`
)

d = d.replace(
  `                      isSpacer ? "h-2 border-b border-b-slate-200" : "border-b border-b-slate-200",
                      !isSpacer && "hover:bg-slate-50/90",
                      nextRowIsKeyResult && "border-slate-900 border-b-2"
                    )}`,
  `                      isSpacer ? "h-2 border-b border-b-slate-200" : "border-b border-b-slate-200",
                      !isSpacer && "hover:bg-slate-50/90"
                    )}`
)

d = d.replace(
  `                      !isSpacer && "hover:bg-slate-50/90",
                      nextRowIsKeyResult && "border-slate-900 border-b-2"`,
  `                      !isSpacer && "hover:bg-slate-50/90"`
)

d = d.replace(
  `              const nextRow = idx < data.length - 1 ? data[idx + 1] : null
              const nextRowIsKeyResult = nextRow && nextRow.isSubtotal

`,
  ""
)

d = d.replace(
  `              const nextRow = idx < data.length - 1 ? data[idx + 1] : null
              const nextRowIsKeyResult = nextRow && nextRow.isResult

`,
  ""
)

if (!d.includes("const isBoldRow = !!row.isBold")) {
  d = d.replace(
    `              const showSeparatorAbove = isTruthySeparatorAbove(row.separatorAbove)

              return (`,
    `              const showSeparatorAbove = isTruthySeparatorAbove(row.separatorAbove)
              const isBoldRow = !!row.isBold

              return (`
  )
}

if (!d.includes("structureLoading")) {
  d = d.replace(
    "const [statementStructure, setStatementStructure] = useState<Record<string, unknown>[] | null>(null)",
    "const [statementStructure, setStatementStructure] = useState<Record<string, unknown>[] | null>(null)\n  const [structureLoading, setStructureLoading] = useState(false)"
  )
  d = d.replace(
    `    if (!companyId) {
      setStatementStructure(null)
      return
    }
    let cancelled = false
    getStatementStructure(companyId, "cash-flow-detail")`,
    `    if (!companyId) {
      setStatementStructure(null)
      setStructureLoading(false)
      return
    }
    let cancelled = false
    setStructureLoading(true)
    getStatementStructure(companyId, "cash-flow-detail")`
  )
  d = d.replace(
    `.catch(() => {
        if (!cancelled) setStatementStructure(null)
      })
    return () => {
      cancelled = true
    }
  }, [companyId, effectiveStructureVersion])`,
    `.catch(() => {
        if (!cancelled) setStatementStructure(null)
      })
      .finally(() => {
        if (!cancelled) setStructureLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [companyId, effectiveStructureVersion])`
  )
}

d = d.replace(
  "if (loading || (isMultiPeriod && seriesLoading) || entityDataLoading)",
  "if (loading || structureLoading || (isMultiPeriod && seriesLoading) || entityDataLoading)"
)

d = d.replace(
  `    if (statementStructure?.length || backendRows.length > 0) {
      return mapBackendRows(backendRows)
    }`,
  `    if (statementStructure?.length) {
      return mapRowsFromDetailStructure(backendRows)
    }
    if (backendRows.length > 0) {
      return mapBackendRows(backendRows)
    }`
)

if (!d.includes("return mapRowsFromDetailStructure([])")) {
  d = d.replace(
    `  const getMultiPeriodData = (): DetailRow[] => {
    if (!seriesRows.length || !periods.length) return []

    if (statementStructure?.length) {
      const trendByRowId = new Map<string, number[]>()`,
    `  const getMultiPeriodData = (): DetailRow[] => {
    if (statementStructure?.length) {
      if (!seriesRows.length || !periods.length) {
        return mapRowsFromDetailStructure([])
      }
      const trendByRowId = new Map<string, number[]>()`
  )
  d = d.replace(
    `      return mapRowsFromDetailStructure(seriesRows as unknown as FinancialStatementRow[], trendByRowId)
    }

    return seriesRows.flatMap((row) => {`,
    `      return mapRowsFromDetailStructure(seriesRows as unknown as FinancialStatementRow[], trendByRowId)
    }

    if (!seriesRows.length || !periods.length) return []

    return seriesRows.flatMap((row) => {`
  )
}

fs.writeFileSync(detailPath, d, "utf8")
if (d.includes("nextRowIsKeyResult")) throw new Error("separator auto-border still present")
if (!d.includes("[statementStructure, setStatementStructure]")) throw new Error("statement structure state missing")
if (!d.includes("données") && !d.includes("donn\u00e9es")) throw new Error("utf8 missing")
console.log("detail presentation fixes ok")
