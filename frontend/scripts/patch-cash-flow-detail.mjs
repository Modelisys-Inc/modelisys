import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const detailPath = path.join(__dirname, "../components/cash-flow-detail.tsx")
const summaryPath = path.join(__dirname, "../components/cash-flow-summary.tsx")

let detail = fs.readFileSync(detailPath, "utf8")
const summary = fs.readFileSync(summaryPath, "utf8")

const BULLET = "\u2022"
const DETAIL_TITLE = "D\u00e9tail"
const PARAMETRES = "Param\u00e8tres"
const EDITION = "\u00c9dition structure"
const SOCIETE = "Soci\u00e9t\u00e9"
const SOCIETE_SEL = "Soci\u00e9t\u00e9 s\u00e9lectionn\u00e9e"
const TOUTES = "Toutes les soci\u00e9t\u00e9s"
const FEV = "F\u00e9v"
const AOU = "Ao\u00fb"
const DEC = "D\u00e9c"
const DETAIL_WORD = "d\u00e9tail"
const TRESORERIE = "tr\u00e9sorerie"
const VERIF = "v\u00e9rification"
const AUDITES = "audit\u00e9s"
const DONNEES = "donn\u00e9es"

// --- imports ---
detail = detail.replace(
  `import { useState, useEffect } from "react"`,
  `import { useState, useEffect, Fragment } from "react"`
)
detail = detail.replace(
  `import { getFinancialStatementSeries, type FinancialStatementSeriesParams } from "@/lib/api"`,
  `import { getFinancialStatementSeries, getStatementStructure, type FinancialStatementSeriesParams } from "@/lib/api"`
)
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
  listStructureRowsForSummaryDisplay,
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

// --- props ---
detail = detail.replace(
  `  fiscalYear?: number
  rows?: FinancialStatementRow[]`,
  `  fiscalYear?: number
  refMonth?: number
  refYear?: number
  rows?: FinancialStatementRow[]
  loading?: boolean
  showCashFlowStructureSettings?: boolean
  structureVersion?: number
  onCashFlowStructureSaved?: () => void
  showDetailStructureSettings?: boolean
  detailStructureVersion?: number
  onDetailStructureSaved?: () => void`
)
detail = detail.replace(
  `  loading?: boolean
  showCashFlowStructureSettings?: boolean
  structureVersion?: number
  onCashFlowStructureSaved?: () => void
}
`,
  `}
`
)

detail = detail.replace(
  `  isSection?: boolean
  annexLetter?: string`,
  `  isSection?: boolean
  separatorAbove?: boolean
  annexLetter?: string`
)

// --- function params ---
detail = detail.replace(
  `  companies = [],
  title,
  fiscalYear,
  rows: backendRows = [],
  loading = false,
  showCashFlowStructureSettings = false,
  structureVersion = 0,
  onCashFlowStructureSaved,
}: CashFlowDetailProps) {
  // Series data for multi-period views`,
  `  companies = [],
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

detail = detail.replace(`    structureVersion,\n`, "")

const structureHelpers = `
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
    const displayRows = listStructureRowsForSummaryDisplay(statementStructure)
    return displayRows.flatMap((sr) => {
      const row = findStatementApiRowForStructureRow(apiRows, sr)
      const trendValues = row?.id && trendByRowId ? trendByRowId.get(row.id) : undefined
      const base = structureRowToDetailRow(sr, row, trendValues)
      return [base, ...mapAccountDetailRows(row?.detailRows)]
    })
  }
`

detail = detail.replace(
  /  const hasConfiguredDetailRows[\s\S]*?  const mapAccountDetailRows/,
  `${structureHelpers}

  const mapAccountDetailRows`
)

detail = detail.replace(
  /  const mapBackendRows = \(apiRows: FinancialStatementRow\[\]\): DetailRow\[\] => \{[\s\S]*?  \}\n\n  \/\/ Build multi-period rows/,
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
  }

  // Build multi-period rows`
)

detail = detail.replace(
  /  const getMultiPeriodData = \(\): DetailRow\[\] => \{[\s\S]*?  \}\n\n  const getDetailData/,
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
  }

  const getDetailData`
)

detail = detail.replace(
  `            structure_rev: structureVersion > 0 ? structureVersion : undefined,
`,
  ""
)
detail = detail.replace(`, structureVersion])`, `])`)

const summaryLines = summary.split(/\r?\n/)
const comparisonLabelBlock = summaryLines.slice(105, 136).join("\n")

detail = detail.replace(
  `  // Find total cash flow value for percentage calculations
  const totalCashFlowRow = data.find((row) => row.label.toLowerCase().includes("flux net") && row.isSubtotal)`,
  `${comparisonLabelBlock}

  // Find total cash flow value for percentage calculations
  const totalCashFlowRow = data.find(
    (row) =>
      (row.label.toLowerCase().includes("flux net") || row.label.toLowerCase().includes("variation nette")) &&
      row.isSubtotal
  )`
)

detail = detail.replace(
  /    const months = \[.*?\]/,
  `    const months = ["Jan", "${FEV}", "Mar", "Avr", "Mai", "Jun", "Jul", "${AOU}", "Sep", "Oct", "Nov", "${DEC}"]`
)

// Extract renderCardHeader from summary and adapt for detail
let renderCardHeader = summaryLines.slice(225, 307).join("\n")
renderCardHeader = renderCardHeader
  .replace(/LayoutList/g, "ListTree")
  .replace(/\{title \|\| "Sommaire"\}/g, "{title}")
  .replace(/showCashFlowStructureSettings/g, "effectiveShowStructureSettings")
  .replace(
    /Ajustez les libellés\.[\s\S]*?Enregistrez pour appliquer partout\./,
    `Ajustez les libell\u00e9s. <span className="font-medium text-[#2A2F3A]">Masquer</span> retire la ligne du ${DETAIL_WORD}. <span className="font-medium text-[#2A2F3A]">Code</span> active la colonne liaison ; <span className="font-medium text-[#2A2F3A]">Liaison</span> d\u00e9finit le code ou la formule. Enregistrez pour appliquer partout.`
  )

// Extract summary return tail (loading through footer)
const summaryTail = summaryLines.slice(465, 895).join("\n")
  .replace(/summaryTableColumnCount/g, "detailTableColumnCount")
  .replace(/showCashFlowStructureSettings/g, "effectiveShowStructureSettings")
  .replace(/onCashFlowStructureSaved/g, "handleStructureSaved")
  .replace(/statementType="cash-flow"/g, 'statementType="cash-flow-detail"\n            hideAnnexColumns')
  .replace(
    /Aucune donn\u00e9e disponible\. Veuillez importer une balance de v\u00e9rification et configurer la structure des\s*\n\s*\u00e9tats financiers\./,
    `Aucune donn\u00e9e disponible. Ouvrez <span className="font-medium text-[#2A2F3A]">${PARAMETRES}</span> pour configurer la structure du ${DETAIL_WORD}, ou importez une balance de ${VERIF}.`
  )
  .replace(/nextRowIsKeyResult = nextRow && nextRow\.isResult/g, "nextRowIsKeyResult = nextRow && nextRow.isSubtotal")
  .replace(
    /const displayLabel = row\.label \? capitalizeFirst\(row\.label\) : ""/,
    `const displayLabel = row.isDetailAccount ? row.label : row.isSection ? capitalizeFirst(row.label) : row.label`
  )
  .replace(
    /const hasLiaisonCode = row\.hasLiaisonCode !== undefined \? row\.hasLiaisonCode : true\n\s*const shouldHideAmounts = isSpacer \|\| !hasLiaisonCode \|\| !!row\.isSection/,
    "const shouldHideAmounts = isSpacer || !!row.isSection"
  )
  .replace(/isBoldRow/g, "isBoldRow")
  .replace(
    /const isBoldRow = !!row\.isBold\n\s*const displayLabel/,
    "const displayLabel"
  )

const newTail = `
  const getHorizonText = (): string => getHorizonModeLabel(view, period)

  const [structureEditMode, setStructureEditMode] = useState(false)
  const canInlineStructureEdit = effectiveShowStructureSettings && !!companyId && !isComparisonMode
  const isStructureStudio = structureEditMode && canInlineStructureEdit && !!companyId

${renderCardHeader}
${summaryTail}
`

detail = detail.replace(/  const getHorizonText[\s\S]*$/, newTail)

fs.writeFileSync(detailPath, detail, "utf8")
console.log("Patched", detailPath)

const bad = [...detail].filter((c) => c === "\uFFFD").length
if (bad > 0) throw new Error(`Still has ${bad} replacement chars`)
console.log("UTF-8 OK")
