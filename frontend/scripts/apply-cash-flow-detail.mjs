import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const detailPath = path.join(root, "components/cash-flow-detail.tsx")
const summaryPath = path.join(root, "components/cash-flow-summary.tsx")

let detail = fs.readFileSync(detailPath, "utf8").replace(/\r\n/g, "\n")
const summary = fs.readFileSync(summaryPath, "utf8").replace(/\r\n/g, "\n")
const summaryLines = summary.split("\n")

const DETAIL_TITLE = "D\u00e9tail"
const DETAIL_WORD = "d\u00e9tail"
const PARAMETRES = "Param\u00e8tres"
const FEV = "F\u00e9v"
const AOU = "Ao\u00fb"
const DEC = "D\u00e9c"
const VERIF = "v\u00e9rification"

// --- imports ---
if (!detail.includes("dashboard-card-style")) {
  detail = detail.replace(
    `import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import { StatementStructureStudio } from "@/components/statement-structure-studio"`,
    `import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ListTree, Settings, Sparkles } from "lucide-react"
import { StatementStructureStudio } from "@/components/statement-structure-studio"
import {
  findStatementApiRowForStructureRow,
  indentForSummaryRow,
  isTruthySeparatorAbove,
  listStructureRowsForPresentationDisplay,
} from "@/lib/income-statement-structure-utils"
import {
  dashboardCardBodyMutedClass,
  dashboardCardAccentClass,
  dashboardCardFrameStaticClass,
  dashboardCardHeaderBarClass,
  dashboardCardHeaderIconBoxClass,
  dashboardCardRingClass,
  dashboardCardStructureSettingsButtonClass,
  dashboardCardTitleClass,
} from "@/lib/dashboard-card-style"`
  )
}
if (!detail.includes("Fragment")) {
  detail = detail.replace(`import { useState, useEffect } from "react"`, `import { useState, useEffect, Fragment } from "react"`)
}
if (!detail.includes("getStatementStructure")) {
  detail = detail.replace(
    `import { getFinancialStatementSeries, type FinancialStatementSeriesParams } from "@/lib/api"`,
    `import { getFinancialStatementSeries, getStatementStructure, type FinancialStatementSeriesParams } from "@/lib/api"`
  )
}

// --- props ---
if (!detail.includes("showDetailStructureSettings")) {
  detail = detail.replace(
    `  onCashFlowStructureSaved?: () => void
}`,
    `  onCashFlowStructureSaved?: () => void
  refMonth?: number
  refYear?: number
  showDetailStructureSettings?: boolean
  detailStructureVersion?: number
  onDetailStructureSaved?: () => void
}`
  )
}
if (!detail.includes("separatorAbove?: boolean")) {
  detail = detail.replace(
    `  isSection?: boolean
  annexLetter?: string`,
    `  isSection?: boolean
  separatorAbove?: boolean
  annexLetter?: string`
  )
}

// --- function header ---
if (!detail.includes("effectiveShowStructureSettings")) {
  detail = detail.replace(
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

  useEffect(() => {
    if (!companyId) {
      setStatementStructure(null)
      return
    }
    let cancelled = false
    getStatementStructure(companyId, "cash-flow-detail")
      .then((data) => {
        if (!cancelled) setStatementStructure(data.structure as Record<string, unknown>[])
      })
      .catch(() => {
        if (!cancelled) setStatementStructure(null)
      })
    return () => {
      cancelled = true
    }
  }, [companyId, effectiveStructureVersion])

  // Series data for multi-period views`
  )
}

detail = detail.replace(/\n    structureVersion,\n/, "\n")

// --- structure helpers ---
if (!detail.includes("mapRowsFromDetailStructure")) {
  const helpers = `
  const structureRowToDetailRow = (
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
  }

  const mapRowsFromDetailStructure = (
    apiRows: FinancialStatementRow[],
    trendByRowId?: Map<string, number[]>
  ): DetailRow[] => {
    if (!statementStructure?.length) return []
    const displayRows = listStructureRowsForPresentationDisplay(statementStructure)
    const used = new Set<number>()
    return displayRows.flatMap((sr) => {
      if (isStructureRowEmptyLabel(sr)) {
        return [structureRowToDetailRow(sr, undefined)]
      }
      const row = findStatementApiRowForStructureRow(sr, apiRows, used)
      const trendValues = row?.id && trendByRowId ? trendByRowId.get(row.id) : undefined
      const base = structureRowToDetailRow(sr, row, trendValues)
      return [base, ...mapAccountDetailRows(row?.detailRows)]
    })
  }
`
  detail = detail.replace(
    /\n\n  const mapAccountDetailRows/,
    `${helpers}\n\n  const mapAccountDetailRows`
  )
}

function replaceBetween(source, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start)
  if (start === -1 || end === -1) throw new Error(`markers not found: ${startMarker}`)
  return source.slice(0, start) + replacement + source.slice(end)
}

if (detail.includes("hasConfiguredDetailRows")) {
  detail = detail.replace(
    /\n  const hasConfiguredDetailRows[\s\S]*?  const structureRowToDetailRow/,
    "\n\n  const structureRowToDetailRow"
  )
}

if (detail.includes("configured ? detailLabel")) {
  detail = replaceBetween(
    detail,
    "  const mapBackendRows = (apiRows: FinancialStatementRow[]): DetailRow[] => {",
    "\n\n  // Build multi-period rows from series API data",
    `  const mapBackendRows = (apiRows: FinancialStatementRow[]): DetailRow[] => {
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
  )
}

if (detail.includes("hasConfiguredSeriesDetailRows")) {
  detail = replaceBetween(
    detail,
    "  const getMultiPeriodData = (): DetailRow[] => {",
    "\n\n  const getDetailData = (): DetailRow[] => {",
    `  const getMultiPeriodData = (): DetailRow[] => {
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
  )
}

detail = detail.replace("            structure_rev: structureVersion > 0 ? structureVersion : undefined,\n", "")
detail = detail.replace(", structureVersion])", "])")

if (!detail.includes("const getComparisonLabel")) {
  const comparisonLabelBlock = summaryLines.slice(105, 136).join("\n")
  detail = detail.replace(
    "  // Find total cash flow value for percentage calculations\n  const totalCashFlowRow = data.find((row) => row.label.toLowerCase().includes(\"flux net\") && row.isSubtotal)",
    `${comparisonLabelBlock}

  // Find total cash flow value for percentage calculations
  const totalCashFlowRow = data.find(
    (row) =>
      (row.label.toLowerCase().includes("flux net") || row.label.toLowerCase().includes("variation nette")) &&
      row.isSubtotal
  )`
  )
}

detail = detail.replace(
  /    const months = \[.*?\]/,
  `    const months = ["Jan", "${FEV}", "Mar", "Avr", "Mai", "Jun", "Jul", "${AOU}", "Sep", "Oct", "Nov", "${DEC}"]`
)

// --- UI tail from summary if old UI ---
if (detail.includes("renderParametresTrigger")) {
  let renderCardHeader = summaryLines.slice(225, 307).join("\n")
  renderCardHeader = renderCardHeader
    .replace(/LayoutList/g, "ListTree")
    .replace(/\{title \|\| "Sommaire"\}/g, "{title}")
    .replace(/showCashFlowStructureSettings/g, "effectiveShowStructureSettings")
    .replace(
      /Ajustez les libellés\.[\s\S]*?Enregistrez pour appliquer partout\./,
      `Ajustez les libell\u00e9s. <span className="font-medium text-[#2A2F3A]">Masquer</span> retire la ligne du ${DETAIL_WORD}. <span className="font-medium text-[#2A2F3A]">Code</span> active la colonne liaison ; <span className="font-medium text-[#2A2F3A]">Liaison</span> d\u00e9finit le code ou la formule. Enregistrez pour appliquer partout.`
    )

  let summaryTail = summaryLines.slice(465, 895).join("\n")
  summaryTail = summaryTail
    .replace(/summaryTableColumnCount/g, "detailTableColumnCount")
    .replace(/showCashFlowStructureSettings/g, "effectiveShowStructureSettings")
    .replace(/onCashFlowStructureSaved/g, "handleStructureSaved")
    .replace(
      /statementType="cash-flow"/g,
      'statementType="cash-flow-detail"\n            hideAnnexColumns'
    )
    .replace(
      /Aucune donnée disponible\. Veuillez importer une balance de vérification et configurer la structure des\s*\n\s*états financiers\./,
      `Aucune donn\u00e9e disponible. Ouvrez <span className="font-medium text-[#2A2F3A]">${PARAMETRES}</span> pour configurer la structure du ${DETAIL_WORD}, ou importez une balance de ${VERIF}.`
    )
    .replace(/nextRowIsKeyResult = nextRow && nextRow\.isResult/g, "nextRowIsKeyResult = nextRow && nextRow.isSubtotal")
    .replace(
      /const displayLabel = row\.label \? capitalizeFirst\(row\.label\) : ""/,
      "const displayLabel = row.isDetailAccount ? row.label : row.isSection ? capitalizeFirst(row.label) : row.label"
    )
    .replace(
      /const hasLiaisonCode = row\.hasLiaisonCode !== undefined \? row\.hasLiaisonCode : true\n\s*const shouldHideAmounts = isSpacer \|\| !hasLiaisonCode \|\| !!row\.isSection/,
      "const shouldHideAmounts = isSpacer || !!row.isSection"
    )

  const newTail = `  const getHorizonText = (): string => getHorizonModeLabel(view, period)

  const [structureEditMode, setStructureEditMode] = useState(false)
  const canInlineStructureEdit = effectiveShowStructureSettings && !!companyId && !isComparisonMode
  const isStructureStudio = structureEditMode && canInlineStructureEdit && !!companyId

${renderCardHeader}
${summaryTail}
`
  detail = detail.replace(/  const getHorizonText[\s\S]*$/, newTail)
}

if (!detail.trimEnd().endsWith("}")) {
  detail = detail.trimEnd() + "\n}\n"
}

fs.writeFileSync(detailPath, detail, "utf8")

const required = [
  "effectiveShowStructureSettings",
  "getComparisonLabel",
  "dashboard-card-style",
  "cash-flow-detail",
  "hideAnnexColumns",
  "showDetailStructureSettings",
]
const missing = required.filter((s) => !detail.includes(s))
const bad = ["hasConfiguredDetailRows", "detailLabel", "structure_rev", "renderParametresTrigger", "Param?tres", "configured ? detailLabel"]
const foundBad = bad.filter((s) => detail.includes(s))
if (missing.length || foundBad.length) {
  console.error("missing:", missing, "bad:", foundBad)
  process.exit(1)
}
console.log("apply-cash-flow-detail-ok")
