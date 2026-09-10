import type { SeriesPeriod, SeriesRow, StandardLinkCode } from "@/lib/api"
import {
  isCodeMappingEnabled,
  isStructureRowEmptyLabel,
  isStructureRowHidden,
  isTruthySeparatorAbove,
  normalizeCodeList,
  normalizeLiaisonFactor,
  normalizeLiaisonMode,
  type LiaisonMode,
} from "@/lib/income-statement-structure-utils"
import {
  deriveLinkCodeFamily,
  getDetailSubLineCodesFromStandardLinkCode,
  isBalanceSheetFamily,
  isIncomeStatementFamily,
} from "@/lib/standard-link-code-utils"
import { getRowAmounts } from "@/lib/series-utils"

const FORMULA_MODES: ReadonlySet<LiaisonMode> = new Set([
  "sum",
  "difference",
  "product",
  "quotient",
])

/** Mois additionnels à charger pour les séries Résultat (TTM = 12 mois glissants). */
export const WORKING_CAPITAL_IS_TTM_LOOKBACK_MONTHS = 11

const OPERAND_AMOUNT_EPSILON = 1e-6

/** Montant d’un code de liaison dans une série (bilan ou CDR) pour un mois donné. */
export function seriesAmountForLinkCode(
  code: string,
  rows: SeriesRow[],
  periods: SeriesPeriod[],
  periodIndex: number,
): number {
  const target = code.trim()
  if (!target || periods.length === 0) return 0
  const idx = Math.max(0, Math.min(periodIndex, periods.length - 1))
  let total = 0
  for (const row of rows) {
    const lc = String(row.linkCode || "").trim()
    const id = String(row.id || "").trim()
    if (lc === target || id === target) {
      const amounts = getRowAmounts(row, periods)
      total += amounts[idx] || 0
    }
  }
  return total
}

/** Somme des montants sur la fenêtre [end−11, end] (12 derniers mois, ou moins si historique insuffisant). */
export function seriesTrailingTwelveMonthSum(
  amounts: number[],
  endIndex: number,
): number {
  if (amounts.length === 0) return 0
  const end = Math.max(0, Math.min(endIndex, amounts.length - 1))
  const start = Math.max(0, end - 11)
  let total = 0
  for (let i = start; i <= end; i++) total += amounts[i] || 0
  return total
}

/** TTM d’un code de liaison Résultat à la date de fin `endPeriodIndex`. */
export function seriesTrailingTwelveMonthAmountForLinkCode(
  code: string,
  rows: SeriesRow[],
  periods: SeriesPeriod[],
  endPeriodIndex: number,
): number {
  const target = code.trim()
  if (!target || periods.length === 0) return 0
  const end = Math.max(0, Math.min(endPeriodIndex, periods.length - 1))
  const start = Math.max(0, end - 11)
  let total = 0
  for (let i = start; i <= end; i++) {
    total += seriesAmountForLinkCode(code, rows, periods, i)
  }
  return total
}

/**
 * Aligne un index de période (ex. bilan affiché) sur une autre série (ex. CDR plus longue pour le TTM).
 */
export function alignSeriesPeriodIndex(
  targetPeriods: SeriesPeriod[],
  sourcePeriods: SeriesPeriod[],
  sourceIndex: number,
): number {
  if (targetPeriods.length === 0) return 0
  if (sourcePeriods.length === 0) {
    return Math.max(0, Math.min(sourceIndex, targetPeriods.length - 1))
  }
  const clamped = Math.max(0, Math.min(sourceIndex, sourcePeriods.length - 1))
  const src = sourcePeriods[clamped]
  if (!src) return Math.max(0, targetPeriods.length - 1)
  const found = targetPeriods.findIndex(
    (p) => p.fiscalYear === src.fiscalYear && p.fiscalMonth === src.fiscalMonth,
  )
  if (found >= 0) return found
  const fromEnd = sourcePeriods.length - 1 - clamped
  return Math.max(0, targetPeriods.length - 1 - fromEnd)
}

/**
 * Identifiant sous lequel une ligne WC publiée son résultat pour d’autres formules.
 * Lignes formules → libellé (ex. « FDR ») ; mode code unique → linkCode.
 */
export function workingCapitalRowRefCode(row: Record<string, unknown>): string | null {
  if (!isCodeMappingEnabled(row) || isStructureRowHidden(row) || isStructureRowEmptyLabel(row)) {
    return null
  }
  const mode = normalizeLiaisonMode(row)
  if (mode === "na" || FORMULA_MODES.has(mode)) {
    const label = String(row.label ?? "").trim()
    return label || null
  }
  const lc = String(row.linkCode ?? "").trim()
  return lc || null
}

/**
 * Codes publiés par les lignes de la structure WC / Capex / Ratios / Capitalisation
 * (sélectionnables ailleurs dans une formule).
 */
export function collectWorkingCapitalFormulaRefCodes(
  structure: Record<string, unknown>[],
  excludeRef?: string | null,
): { codes: string[]; labels: Map<string, string> } {
  const labels = new Map<string, string>()
  const exclude = (excludeRef ?? "").trim()
  for (const row of structure) {
    const ref = workingCapitalRowRefCode(row)
    if (!ref || labels.has(ref)) continue
    if (exclude && ref === exclude) continue
    labels.set(ref, String(row.label ?? ref).trim() || ref)
  }
  const codes = Array.from(labels.keys()).sort((a, b) =>
    a.localeCompare(b, "fr", { numeric: true }),
  )
  return { codes, labels }
}

function findWorkingCapitalRefRow(
  structure: Record<string, unknown>[],
  code: string,
): Record<string, unknown> | null {
  const target = code.trim()
  if (!target) return null
  for (const row of structure) {
    const ref = workingCapitalRowRefCode(row)
    if (ref === target) return row
  }
  return null
}

export type WorkingCapitalOperandRole = "term" | "numerator" | "denominator"

/** Code inclus dans une ligne WC (pour ouvrir/fermer le détail des opérandes). */
export interface WorkingCapitalIncludedOperand {
  code: string
  role: WorkingCapitalOperandRole
  /** Prefixe d’affichage : +, −, ×, ÷, ou vide (code unique). */
  sign: string
}

/**
 * Codes inclus dans la liaison d’une ligne WC (ordre d’affichage pour le détail ouvert).
 * Vide si mode n/a ou aucun code configuré.
 */
export function collectWorkingCapitalIncludedOperands(
  row: Record<string, unknown>,
): WorkingCapitalIncludedOperand[] {
  if (!isCodeMappingEnabled(row)) return []
  const mode = normalizeLiaisonMode(row)
  if (mode === "na") return []

  if (mode === "single") {
    const code = String(row.linkCode || "").trim()
    return code ? [{ code, role: "term", sign: "" }] : []
  }
  if (mode === "sum") {
    return normalizeCodeList(row.liaisonSumCodes).map((code) => ({
      code,
      role: "term" as const,
      sign: "+",
    }))
  }
  if (mode === "product") {
    return normalizeCodeList(row.liaisonSumCodes).map((code) => ({
      code,
      role: "term" as const,
      sign: "×",
    }))
  }
  if (mode === "difference" || mode === "quotient") {
    const nums = normalizeCodeList(row.liaisonNumeratorCodes).map((code) => ({
      code,
      role: "numerator" as const,
      sign: mode === "difference" ? "+" : "",
    }))
    const dens = normalizeCodeList(row.liaisonDenominatorCodes).map((code) => ({
      code,
      role: "denominator" as const,
      sign: mode === "quotient" ? "÷" : "−",
    }))
    return [...nums, ...dens]
  }
  return []
}

function seriesRowLinkCode(row: SeriesRow): string {
  const linkCode = String(row.linkCode ?? "").trim()
  const id = String(row.id ?? "").trim()
  return linkCode || id
}

function findSeriesRowForOperandCode(
  code: string,
  bsRows: SeriesRow[],
  isRows: SeriesRow[],
): SeriesRow | undefined {
  const target = code.trim()
  if (!target) return undefined
  for (const row of [...bsRows, ...isRows]) {
    if (seriesRowLinkCode(row) === target) return row
  }
  return undefined
}

function looksLikeLinkSubCode(id: string, parentCode: string): boolean {
  const trimmed = id.trim()
  if (!trimmed) return false
  if (trimmed.startsWith(`${parentCode}.`)) return true
  return /^[A-Z]{2,}([.-][A-Z0-9]+)+$/i.test(trimmed)
}

/** Sous-codes d'un parent (detailRows imbriqués, lignes série ALT-B → ALT-B.1, …, ou plan comptable). */
export function collectChildLinkCodesForOperand(
  parentCode: string,
  bsRows: SeriesRow[],
  isRows: SeriesRow[],
  standardLinkCodes: StandardLinkCode[] = [],
): string[] {
  const parent = parentCode.trim()
  if (!parent) return []

  const parentRow = findSeriesRowForOperandCode(parent, bsRows, isRows)
  if (parentRow?.detailRows?.length) {
    const fromDetail = parentRow.detailRows
      .map((detail) => String(detail.id ?? "").trim())
      .filter((id) => looksLikeLinkSubCode(id, parent))
    if (fromDetail.length) return fromDetail
  }

  const prefix = `${parent}.`
  const fromSeries = [...bsRows, ...isRows]
    .map(seriesRowLinkCode)
    .filter((code) => code.startsWith(prefix))
  if (fromSeries.length) {
    return [...new Set(fromSeries)].sort()
  }

  if (standardLinkCodes.length > 0) {
    return getDetailSubLineCodesFromStandardLinkCode(parent, standardLinkCodes).map((c) => c.code)
  }

  return []
}

/** Déplie un code parent vers ses sous-codes quand ils existent ; sinon conserve le code. */
export function expandWorkingCapitalOperandCode(
  code: string,
  bsRows: SeriesRow[],
  isRows: SeriesRow[],
  standardLinkCodes: StandardLinkCode[] = [],
): string[] {
  const children = collectChildLinkCodesForOperand(code, bsRows, isRows, standardLinkCodes)
  return children.length ? children : [code.trim()]
}

function rollupBalanceSheetOperandAmount(
  code: string,
  bsRows: SeriesRow[],
  isRows: SeriesRow[],
  bsPeriods: SeriesPeriod[],
  periodIndex: number,
): number {
  const direct = seriesAmountForLinkCode(code, bsRows, bsPeriods, periodIndex)
  if (Math.abs(direct) > OPERAND_AMOUNT_EPSILON) return direct

  const children = collectChildLinkCodesForOperand(code, bsRows, isRows)
  if (!children.length) return direct

  return children.reduce(
    (sum, childCode) =>
      sum + seriesAmountForLinkCode(childCode, bsRows, bsPeriods, periodIndex),
    0,
  )
}

function rollupIncomeStatementOperandAmount(
  code: string,
  bsRows: SeriesRow[],
  isRows: SeriesRow[],
  isPeriods: SeriesPeriod[],
  isPeriodIndex: number,
): number {
  const direct = seriesTrailingTwelveMonthAmountForLinkCode(code, isRows, isPeriods, isPeriodIndex)
  if (Math.abs(direct) > OPERAND_AMOUNT_EPSILON) return direct

  const children = collectChildLinkCodesForOperand(code, bsRows, isRows)
  if (!children.length) return direct

  return children.reduce(
    (sum, childCode) =>
      sum + seriesTrailingTwelveMonthAmountForLinkCode(childCode, isRows, isPeriods, isPeriodIndex),
    0,
  )
}

export type WorkingCapitalOperandDisplayContext = {
  bsRows: SeriesRow[]
  isRows: SeriesRow[]
  standardLinkCodes?: StandardLinkCode[]
}

/**
 * Comme {@link collectWorkingCapitalIncludedOperands}, mais déplie les codes parents
 * (ex. ALT-B → ALT-B.1, ALT-B.2) pour l'affichage du détail dans les tableaux Capex / FDR.
 */
export function collectWorkingCapitalIncludedOperandsForDisplay(
  row: Record<string, unknown>,
  context?: WorkingCapitalOperandDisplayContext,
): WorkingCapitalIncludedOperand[] {
  const base = collectWorkingCapitalIncludedOperands(row)
  if (!context) return base

  const { bsRows, isRows, standardLinkCodes = [] } = context
  return base.flatMap((operand) => {
    const expanded = expandWorkingCapitalOperandCode(
      operand.code,
      bsRows,
      isRows,
      standardLinkCodes,
    )
    return expanded.map((childCode) => ({ ...operand, code: childCode }))
  })
}

/**
 * Montant d’un opérande (code bilan / CDR / ref formule WC) à un index de période bilan.
 */
export function resolveWorkingCapitalOperandAmount(
  code: string,
  bsRows: SeriesRow[],
  isRows: SeriesRow[],
  bsPeriods: SeriesPeriod[],
  isPeriods: SeriesPeriod[],
  periodIndex: number,
  structure: Record<string, unknown>[] = [],
  visiting: Set<string> = new Set(),
): number {
  const target = code.trim()
  if (!target) return 0

  // Évite la boucle code unique → ligne structure → même code (retourne 0) ; on lit la série.
  if (structure.length > 0 && !visiting.has(target)) {
    const refRow = findWorkingCapitalRefRow(structure, target)
    if (refRow) {
      const nested = resolveWorkingCapitalStructureAmount(
        refRow,
        bsRows,
        isRows,
        bsPeriods,
        isPeriods,
        periodIndex,
        structure,
        visiting,
      )
      if (nested !== null && Math.abs(nested) > OPERAND_AMOUNT_EPSILON) return nested
    }
  }

  const family = deriveLinkCodeFamily(target)
  const isIdx = alignSeriesPeriodIndex(isPeriods, bsPeriods, periodIndex)

  if (isIncomeStatementFamily(family)) {
    return rollupIncomeStatementOperandAmount(target, bsRows, isRows, isPeriods, isIdx)
  }
  if (isBalanceSheetFamily(family)) {
    return rollupBalanceSheetOperandAmount(target, bsRows, isRows, bsPeriods, periodIndex)
  }

  const fromBs = rollupBalanceSheetOperandAmount(target, bsRows, isRows, bsPeriods, periodIndex)
  const fromIs = rollupIncomeStatementOperandAmount(target, bsRows, isRows, isPeriods, isIdx)
  if (fromBs !== 0 && fromIs !== 0) return fromBs + fromIs
  return fromBs !== 0 ? fromBs : fromIs
}

/** Libellé d’affichage d’un code inclus (série, ref formule, ou le code lui-même). */
export function workingCapitalOperandDisplayLabel(
  code: string,
  bsRows: SeriesRow[],
  isRows: SeriesRow[],
  structure: Record<string, unknown>[] = [],
): string {
  const target = code.trim()
  if (!target) return ""
  for (const row of [...bsRows, ...isRows]) {
    const lc = String(row.linkCode || "").trim()
    const id = String(row.id || "").trim()
    if (lc === target || id === target) {
      const label = String(row.label || "").trim()
      if (label) return label
    }
  }
  const refRow = findWorkingCapitalRefRow(structure, target)
  if (refRow) {
    const label = String(refRow.label ?? "").trim()
    if (label) return label
  }
  return target
}

/**
 * Résout le montant d’une ligne WC.
 * Codes Bilan = solde à la date de référence ; codes Résultat = 12 derniers mois (TTM)
 * se terminant à cette date — indépendamment de l’horizon d’affichage.
 */
export function resolveWorkingCapitalStructureAmount(
  row: Record<string, unknown>,
  bsRows: SeriesRow[],
  isRows: SeriesRow[],
  bsPeriods: SeriesPeriod[],
  isPeriods: SeriesPeriod[],
  periodIndex: number,
  structure: Record<string, unknown>[] = [],
  visiting: Set<string> = new Set(),
): number | null {
  if (!isCodeMappingEnabled(row)) return null
  const mode = normalizeLiaisonMode(row)
  if (mode === "na") return null

  const selfRef = workingCapitalRowRefCode(row)
  if (selfRef) {
    if (visiting.has(selfRef)) return 0
    visiting = new Set(visiting)
    visiting.add(selfRef)
  }

  const amountFor = (code: string): number =>
    resolveWorkingCapitalOperandAmount(
      code,
      bsRows,
      isRows,
      bsPeriods,
      isPeriods,
      periodIndex,
      structure,
      visiting,
    )

  if (mode === "single") {
    const code = String(row.linkCode || "").trim()
    if (!code) return null
    return amountFor(code)
  }
  if (mode === "sum") {
    const codes = normalizeCodeList(row.liaisonSumCodes)
    if (codes.length === 0) return null
    return codes.reduce((sum, c) => sum + amountFor(c), 0)
  }
  if (mode === "product") {
    const codes = normalizeCodeList(row.liaisonSumCodes)
    if (codes.length === 0) return null
    return codes.reduce((prod, c) => prod * amountFor(c), 1)
  }
  if (mode === "difference") {
    const nums = normalizeCodeList(row.liaisonNumeratorCodes)
    const dens = normalizeCodeList(row.liaisonDenominatorCodes)
    if (nums.length === 0 && dens.length === 0) return null
    const n = nums.reduce((sum, c) => sum + amountFor(c), 0)
    const d = dens.reduce((sum, c) => sum + amountFor(c), 0)
    return n - d
  }
  if (mode === "quotient") {
    const nums = normalizeCodeList(row.liaisonNumeratorCodes)
    const dens = normalizeCodeList(row.liaisonDenominatorCodes)
    if (nums.length === 0 && dens.length === 0) return null
    const n = nums.reduce((sum, c) => sum + amountFor(c), 0)
    const d = dens.reduce((sum, c) => sum + amountFor(c), 0)
    if (d === 0) return 0
    return (n / d) * normalizeLiaisonFactor(row.liaisonFactor)
  }
  return null
}

export function workingCapitalStructureDisplayRows(
  structure: Record<string, unknown>[],
): Record<string, unknown>[] {
  return structure.filter(
    (r) => !isStructureRowEmptyLabel(r) && !isStructureRowHidden(r) && !r.detailOnly,
  )
}

/** Lignes hors Paramètres, dans l’ordre structure (séparateurs + espaces inclus). */
export type WorkingCapitalViewRow =
  | { kind: "separator"; key: string }
  | { kind: "spacer"; key: string }
  | { kind: "metric"; key: string; row: Record<string, unknown>; index: number }

export function workingCapitalStructureViewRows(
  structure: Record<string, unknown>[],
): WorkingCapitalViewRow[] {
  const out: WorkingCapitalViewRow[] = []
  structure.forEach((row, index) => {
    if (isStructureRowHidden(row) || row.detailOnly) return
    const keyBase = String(row.id ?? `row-${index}`)
    if (isTruthySeparatorAbove(row.separatorAbove)) {
      out.push({ kind: "separator", key: `sep-${keyBase}` })
    }
    if (isStructureRowEmptyLabel(row)) {
      out.push({ kind: "spacer", key: `space-${keyBase}` })
      return
    }
    out.push({ kind: "metric", key: `metric-${keyBase}`, row, index })
  })
  return out
}

/** Format d’affichage hors Paramètres : $ | Nombre | % | Jours. */
export type WorkingCapitalDisplayFormat = "currency" | "number" | "percent" | "days"

export function normalizeWorkingCapitalDisplayFormat(
  raw: unknown,
): WorkingCapitalDisplayFormat | null {
  if (raw == null) return null
  const m = String(raw).trim().toLowerCase()
  if (!m) return null
  if (m === "currency" || m === "money" || m === "$" || m === "dollar" || m === "dollars") {
    return "currency"
  }
  if (
    m === "number" ||
    m === "nombre" ||
    m === "ratio" ||
    m === "num" ||
    m === "n"
  ) {
    return "number"
  }
  if (m === "percent" || m === "percentage" || m === "%" || m === "pct" || m === "pourcent") {
    return "percent"
  }
  if (m === "days" || m === "day" || m === "jours" || m === "jour" || m === "j") {
    return "days"
  }
  return null
}

/** Défaut si non renseigné : devise. */
export function resolveWorkingCapitalDisplayFormat(
  row: Record<string, unknown>,
): WorkingCapitalDisplayFormat {
  return normalizeWorkingCapitalDisplayFormat(row.displayFormat) ?? "currency"
}
