import {
  detailLineLabelForDisplay,
  findStatementApiRowForStructureRow,
  isStructureRowDetailOnly,
  normalizeAnnexLetter,
  normalizeCodeList,
  normalizeLiaisonMode,
} from "@/lib/income-statement-structure-utils"
import { aggregateToYears } from "@/lib/series-utils"
import type { SeriesPeriod, StandardLinkCode } from "@/lib/api"

export interface BalanceSheetDetailBalanceAccount {
  accountNumber: string
  accountName: string
  amount: number
  priorAmount?: number
  proportion?: number
  trendValues?: number[]
}

export interface BalanceSheetDetailRow {
  label: string
  current: number
  prior: number
  indent?: boolean
  isBold?: boolean
  isSubtotal?: boolean
  isSection?: boolean
  isAnnexTitle?: boolean
  isAnnexPlaceholder?: boolean
  isAnnexSubtotal?: boolean
  trendValues?: number[]
  balanceAccounts?: BalanceSheetDetailBalanceAccount[]
  rowId?: string
  statementLabel?: string
  annexLetter?: string
  hasLiaisonCode?: boolean
}

export interface BalanceSheetDetailGlBreakdownRowShape {
  isAnnexTitle?: boolean
  isAnnexPlaceholder?: boolean
  isAnnexSubtotal?: boolean
  isSection?: boolean
  balanceAccounts?: unknown[]
}

/**
 * Vrai si les detailRows API ressemblent à des comptes GL (pas à des sous-lignes de structure).
 */
export function balanceSheetDetailRowsLookLikeGlAccounts(
  detailRows: { id?: string }[] | undefined,
  standardCodes: StandardLinkCode[],
): boolean {
  if (!detailRows?.length) return false
  const linkCodes = new Set(standardCodes.map((c) => c.code.trim()).filter(Boolean))
  return detailRows.every((dr) => {
    const id = String(dr.id ?? "").trim()
    if (!id) return false
    return !linkCodes.has(id)
  })
}

/**
 * Détail GL (expansion) : tout poste mappé hors chrome d’annexe / section.
 * Les enfants de structure imbriqués dans detailRows ne sont jamais traités comme des GL.
 */
export function balanceSheetDetailRowAllowsGlBreakdown(
  structRow: Record<string, unknown> | undefined,
  _standardCodes: StandardLinkCode[],
  row: BalanceSheetDetailGlBreakdownRowShape,
): boolean {
  if (row.isAnnexTitle || row.isAnnexPlaceholder || row.isAnnexSubtotal || row.isSection) {
    return false
  }
  if (!structRow) return false

  const mode = normalizeLiaisonMode(structRow)
  if (mode === "na") return false

  if (mode === "sum") {
    return (
      normalizeCodeList(structRow.liaisonSumCodes).length > 0 ||
      !!String(structRow.linkCode ?? "").trim()
    )
  }
  if (mode === "difference") {
    return (
      normalizeCodeList(structRow.liaisonNumeratorCodes).length > 0 ||
      normalizeCodeList(structRow.liaisonDenominatorCodes).length > 0
    )
  }
  return !!String(structRow.linkCode ?? "").trim()
}

/** Expansion GL dès qu’au moins un vrai compte GL compose le poste. */
export function balanceSheetDetailCanExpandGlAccounts(
  structRow: Record<string, unknown> | undefined,
  standardCodes: StandardLinkCode[],
  row: BalanceSheetDetailGlBreakdownRowShape & {
    balanceAccounts?: BalanceSheetDetailBalanceAccount[]
  },
): boolean {
  if (!balanceSheetDetailRowAllowsGlBreakdown(structRow, standardCodes, row)) return false
  const accounts = row.balanceAccounts ?? []
  if (accounts.length < 1) return false
  return balanceSheetDetailRowsLookLikeGlAccounts(
    accounts.map((a) => ({ id: a.accountNumber })),
    standardCodes,
  )
}

export function zeroAmountsForAnnexTitleRow<T extends BalanceSheetDetailRow>(row: T): T {
  if (!row.isAnnexTitle) return row
  return {
    ...row,
    current: 0,
    prior: 0,
    trendValues: row.trendValues ? row.trendValues.map(() => 0) : undefined,
  }
}

export function sumAnnexGroupRows(rows: BalanceSheetDetailRow[]): {
  current: number
  prior: number
  trendValues?: number[]
} {
  let current = 0
  let prior = 0
  let trendLen = 0
  for (const r of rows) {
    if (r.isAnnexTitle) continue
    current += r.current ?? 0
    prior += r.prior ?? 0
    if (r.trendValues?.length) trendLen = Math.max(trendLen, r.trendValues.length)
  }
  if (trendLen === 0) return { current, prior }
  const trendValues = Array(trendLen).fill(0)
  for (const r of rows) {
    if (r.isAnnexTitle) continue
    if (!r.trendValues?.length) continue
    for (let k = 0; k < r.trendValues.length; k++) {
      trendValues[k] = (trendValues[k] ?? 0) + (r.trendValues[k] ?? 0)
    }
  }
  return { current, prior, trendValues }
}

export function buildAnnexSubtotalDetailRow(
  letter: string,
  agg: { current: number; prior: number; trendValues?: number[] },
): BalanceSheetDetailRow {
  return {
    label: `Sous-total — Annexe ${letter}`,
    statementLabel: `__annex_subtotal__${letter}`,
    current: agg.current,
    prior: agg.prior,
    isBold: false,
    isSubtotal: true,
    isAnnexSubtotal: true,
    annexLetter: letter,
    ...(agg.trendValues ? { trendValues: [...agg.trendValues] } : {}),
  }
}

export function buildAnnexPlaceholderDetailRow(
  letter: string,
  trendValuesLength?: number,
): BalanceSheetDetailRow {
  const pad = trendValuesLength && trendValuesLength > 0 ? Array(trendValuesLength).fill(0) : undefined
  return {
    label: "Ligne vide — renommez ou supprimez",
    statementLabel: `__annex_placeholder__${letter}`,
    current: 0,
    prior: 0,
    isAnnexPlaceholder: true,
    annexLetter: letter,
    ...(pad ? { trendValues: [...pad] } : {}),
  }
}

export function insertAnnexDetailPlaceholderRows(
  rows: BalanceSheetDetailRow[],
  trendValuesLength?: number,
): BalanceSheetDetailRow[] {
  const out: BalanceSheetDetailRow[] = []
  let i = 0
  while (i < rows.length) {
    const letter = normalizeAnnexLetter(String(rows[i].annexLetter ?? ""))
    if (letter) {
      let j = i
      const groupRows: BalanceSheetDetailRow[] = []
      while (j < rows.length && normalizeAnnexLetter(String(rows[j].annexLetter ?? "")) === letter) {
        groupRows.push(rows[j])
        out.push(rows[j])
        j++
      }
      const agg = sumAnnexGroupRows(groupRows)
      out.push(buildAnnexSubtotalDetailRow(letter, agg))
      out.push(buildAnnexPlaceholderDetailRow(letter, trendValuesLength))
      i = j
    } else {
      out.push(rows[i])
      i++
    }
  }
  return out
}

type SeriesLikeRow = {
  id: string
  label: string
  linkCode?: string
  isBold?: boolean
  isSection?: boolean
  isResult?: boolean
  hasLiaisonCode?: boolean
  annexLetter?: string
  detailRows?: { id: string; label: string; amounts?: Record<string, number> }[]
  amounts?: Record<string, number>
}

export function mapStructureRowsToBalanceSheetDetailRows(
  detailStructureRows: Record<string, unknown>[],
  seriesRows: SeriesLikeRow[],
  periods: SeriesPeriod[],
  opts: {
    emptyTrendLength: number
    trendFn?: (row: SeriesLikeRow) => number[]
    structureRowHasLiaisonCode: (row: Record<string, unknown>) => boolean
    /** Capex projections : titres d’annexe sans préfixe « Annexe X — ». */
    plainAnnexTitles?: boolean
    buildBalanceAccounts?: (
      row: SeriesLikeRow,
      periods: SeriesPeriod[],
    ) => BalanceSheetDetailBalanceAccount[] | undefined
  },
): BalanceSheetDetailRow[] {
  const used = new Set<number>()
  const usedNested = new Set<string>()
  return detailStructureRows.map((sr) => {
    const row = findStatementApiRowForStructureRow(sr, seriesRows, used, usedNested)
    const sub = isStructureRowDetailOnly(sr)
    const annexLetter = String(row?.annexLetter ?? sr.annexLetter ?? "")
    const isAnnexTitle = !sub && normalizeAnnexLetter(annexLetter) !== ""

    let current = 0
    let prior = 0
    if (periods.length > 0 && row?.amounts) {
      const rawAmounts = periods.map((p) => row.amounts?.[`${p.fiscalYear}-${p.fiscalMonth}`] || 0)
      const agg = aggregateToYears(rawAmounts, periods, "last")
      current = agg.amounts.length > 0 ? agg.amounts[agg.amounts.length - 1] : 0
      prior = agg.amounts.length > 1 ? agg.amounts[agg.amounts.length - 2] : 0
    }

    const trend = row && opts.trendFn
      ? opts.trendFn(row)
      : Array(opts.emptyTrendLength).fill(0)

    const balanceAccounts =
      row && opts.buildBalanceAccounts ? opts.buildBalanceAccounts(row, periods) : undefined

    const apiOrStructLabel = row?.label ?? String(sr.label ?? "")
    const label =
      opts.plainAnnexTitles && isAnnexTitle
        ? String(sr.label ?? "").trim() || apiOrStructLabel
        : detailLineLabelForDisplay(sr, apiOrStructLabel, annexLetter)

    return zeroAmountsForAnnexTitleRow({
      label,
      statementLabel: row?.label ?? String(sr.linkCode ?? sr.label ?? ""),
      annexLetter,
      current,
      prior,
      isBold: !sub,
      isSection: row?.isSection ?? false,
      isSubtotal: row?.isResult ?? false,
      indent: sub,
      isAnnexTitle,
      trendValues: opts.trendFn ? trend : undefined,
      balanceAccounts,
      rowId: row?.id ?? String(sr.linkCode ?? sr.id ?? ""),
      hasLiaisonCode: row?.hasLiaisonCode ?? opts.structureRowHasLiaisonCode(sr),
    })
  })
}
