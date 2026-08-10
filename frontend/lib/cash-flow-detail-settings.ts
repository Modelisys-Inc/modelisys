import {
  isCodeMappingEnabled,
  isStructureRowEmptyLabel,
  normalizeCodeList,
  normalizeLiaisonMode,
} from "@/lib/income-statement-structure-utils"
import { isTinFamilyLinkCode } from "@/lib/standard-link-code-utils"
import { parseSeriesPeriodCalendarLabel } from "@/lib/series-reference-columns"

export type CashFlowCalcMode = "actual" | "variation_nn1" | "variation_n1n"

/** Réel = solde complet ; Coût = comptes marqués Coût dans le mapping (ALT-B/C/D). */
export type CashFlowTinDisplayMode = "actual" | "cost"

export type CashFlowDetailTrendView = "12months" | "quarters" | "years"

export type CashFlowOperandSnapshot = {
  current: number
  prior: number
  trendValues?: number[]
  amountByCalendarMonth?: Map<string, number>
}

export function readRowCashFlowCalcMode(row: Record<string, unknown>): CashFlowCalcMode {
  const raw = String(row.cashFlowCalcMode ?? "actual").trim()
  if (raw === "variation_nn1" || raw === "variation_n1n") return raw
  return "actual"
}

/** Code unique uniquement — les sommes / différences agrègent les opérandes déjà transformés. */
export function structureRowShowsCashFlowCalcSelector(row: Record<string, unknown>): boolean {
  if (!isCodeMappingEnabled(row)) return false
  return normalizeLiaisonMode(row) === "single"
}

export function readRowCashFlowTinDisplayMode(row: Record<string, unknown>): CashFlowTinDisplayMode {
  const raw = String(row.cashFlowTinDisplayMode ?? "actual").trim()
  return raw === "cost" ? "cost" : "actual"
}

/** Sélecteur Réel / Coût : code unique TIN uniquement. */
export function structureRowShowsCashFlowTinDisplaySelector(row: Record<string, unknown>): boolean {
  if (!structureRowShowsCashFlowCalcSelector(row)) return false
  return isTinFamilyLinkCode(String(row.linkCode ?? ""))
}

export function buildCashFlowTinDisplayModeByCode(
  structure: Record<string, unknown>[],
): Map<string, CashFlowTinDisplayMode> {
  const map = new Map<string, CashFlowTinDisplayMode>()
  for (const row of structure) {
    if (!structureRowShowsCashFlowTinDisplaySelector(row)) continue
    const code = String(row.linkCode ?? "").trim()
    if (!code) continue
    map.set(code, readRowCashFlowTinDisplayMode(row))
  }
  return map
}

export function structureUsesCashFlowTinCostMode(structure: Record<string, unknown>[]): boolean {
  for (const mode of buildCashFlowTinDisplayModeByCode(structure).values()) {
    if (mode === "cost") return true
  }
  return false
}

export function cashFlowTinDisplayModeLabel(mode: CashFlowTinDisplayMode): string {
  return mode === "cost" ? "Coût" : "Réel"
}

export function isCashFlowFormulaAggregationRow(row: Record<string, unknown>): boolean {
  const mode = normalizeLiaisonMode(row)
  return mode === "sum" || mode === "difference"
}

export function collectCashFlowOperandCodes(row: Record<string, unknown>): string[] {
  const mode = normalizeLiaisonMode(row)
  if (mode === "single") {
    const code = String(row.linkCode ?? "").trim()
    return code ? [code] : []
  }
  if (mode === "sum") return normalizeCodeList(row.liaisonSumCodes)
  if (mode === "difference") {
    return [
      ...normalizeCodeList(row.liaisonNumeratorCodes),
      ...normalizeCodeList(row.liaisonDenominatorCodes),
    ]
  }
  return []
}

/** Mode Calcul par code de liaison (lignes « code unique » seulement). */
export function buildCashFlowCalcModeByCode(
  structure: Record<string, unknown>[],
): Map<string, CashFlowCalcMode> {
  const map = new Map<string, CashFlowCalcMode>()
  for (const row of structure) {
    if (normalizeLiaisonMode(row) !== "single") continue
    if (!isCodeMappingEnabled(row)) continue
    const code = String(row.linkCode ?? "").trim()
    if (!code) continue
    map.set(code, readRowCashFlowCalcMode(row))
  }
  return map
}

function transformedOperandPoint(
  snapshot: CashFlowOperandSnapshot | undefined,
  mode: CashFlowCalcMode,
): { current: number; prior: number } {
  if (!snapshot) return { current: 0, prior: 0 }
  return applyCashFlowCalcToPoint(snapshot.current, snapshot.prior, mode)
}

function transformedOperandTrend(
  snapshot: CashFlowOperandSnapshot | undefined,
  mode: CashFlowCalcMode,
  calcContext: { trendView: CashFlowDetailTrendView; trendLabels: string[] },
): number[] {
  if (!snapshot?.trendValues?.length) {
    return calcContext.trendLabels.map(() => 0)
  }
  return applyCashFlowCalcToTrend(
    snapshot.trendValues,
    calcContext.trendLabels,
    mode,
    snapshot.amountByCalendarMonth,
    calcContext.trendView,
  )
}

export function resolveCashFlowFormulaPointAmount(
  row: Record<string, unknown>,
  calcModeByCode: Map<string, CashFlowCalcMode>,
  resolveOperand: (code: string) => CashFlowOperandSnapshot | undefined,
): { current: number; prior: number } {
  const mode = normalizeLiaisonMode(row)
  if (mode === "sum") {
    let current = 0
    let prior = 0
    for (const code of normalizeCodeList(row.liaisonSumCodes)) {
      const transformed = transformedOperandPoint(
        resolveOperand(code),
        calcModeByCode.get(code) ?? "actual",
      )
      current += transformed.current
      prior += transformed.prior
    }
    return { current, prior }
  }
  if (mode === "difference") {
    let current = 0
    let prior = 0
    for (const code of normalizeCodeList(row.liaisonNumeratorCodes)) {
      const transformed = transformedOperandPoint(
        resolveOperand(code),
        calcModeByCode.get(code) ?? "actual",
      )
      current += transformed.current
      prior += transformed.prior
    }
    for (const code of normalizeCodeList(row.liaisonDenominatorCodes)) {
      const transformed = transformedOperandPoint(
        resolveOperand(code),
        calcModeByCode.get(code) ?? "actual",
      )
      current -= transformed.current
      prior -= transformed.prior
    }
    return { current, prior }
  }
  return { current: 0, prior: 0 }
}

export function resolveCashFlowFormulaTrendValues(
  row: Record<string, unknown>,
  calcModeByCode: Map<string, CashFlowCalcMode>,
  resolveOperand: (code: string) => CashFlowOperandSnapshot | undefined,
  calcContext: { trendView: CashFlowDetailTrendView; trendLabels: string[] },
): number[] {
  const { trendLabels } = calcContext
  const mode = normalizeLiaisonMode(row)

  const addSeries = (codes: string[]): number[] =>
    trendLabels.map((_, index) =>
      codes.reduce((sum, code) => {
        const series = transformedOperandTrend(
          resolveOperand(code),
          calcModeByCode.get(code) ?? "actual",
          calcContext,
        )
        return sum + (series[index] ?? 0)
      }, 0),
    )

  if (mode === "sum") {
    return addSeries(normalizeCodeList(row.liaisonSumCodes))
  }
  if (mode === "difference") {
    const numerators = addSeries(normalizeCodeList(row.liaisonNumeratorCodes))
    const denominators = addSeries(normalizeCodeList(row.liaisonDenominatorCodes))
    return trendLabels.map((_, index) => (numerators[index] ?? 0) - (denominators[index] ?? 0))
  }
  return trendLabels.map(() => 0)
}

/** Agrège des montants déjà transformés (Réel / Coût / Calcul appliqués aux feuilles). */
export function resolveCashFlowFormulaPointAmountFromProcessed(
  row: Record<string, unknown>,
  resolveOperand: (code: string) => CashFlowOperandSnapshot | undefined,
): { current: number; prior: number } {
  const mode = normalizeLiaisonMode(row)
  if (mode === "sum") {
    let current = 0
    let prior = 0
    for (const code of normalizeCodeList(row.liaisonSumCodes)) {
      const operand = resolveOperand(code)
      current += operand?.current ?? 0
      prior += operand?.prior ?? 0
    }
    return { current, prior }
  }
  if (mode === "difference") {
    let current = 0
    let prior = 0
    for (const code of normalizeCodeList(row.liaisonNumeratorCodes)) {
      const operand = resolveOperand(code)
      current += operand?.current ?? 0
      prior += operand?.prior ?? 0
    }
    for (const code of normalizeCodeList(row.liaisonDenominatorCodes)) {
      const operand = resolveOperand(code)
      current -= operand?.current ?? 0
      prior -= operand?.prior ?? 0
    }
    return { current, prior }
  }
  return { current: 0, prior: 0 }
}

export function resolveCashFlowFormulaTrendValuesFromProcessed(
  row: Record<string, unknown>,
  resolveOperand: (code: string) => CashFlowOperandSnapshot | undefined,
  calcContext: { trendView: CashFlowDetailTrendView; trendLabels: string[] },
): number[] {
  const { trendLabels } = calcContext
  const mode = normalizeLiaisonMode(row)

  const addSeries = (codes: string[]): number[] =>
    trendLabels.map((_, index) =>
      codes.reduce((sum, code) => sum + (resolveOperand(code)?.trendValues?.[index] ?? 0), 0),
    )

  if (mode === "sum") {
    return addSeries(normalizeCodeList(row.liaisonSumCodes))
  }
  if (mode === "difference") {
    const numerators = addSeries(normalizeCodeList(row.liaisonNumeratorCodes))
    const denominators = addSeries(normalizeCodeList(row.liaisonDenominatorCodes))
    return trendLabels.map((_, index) => (numerators[index] ?? 0) - (denominators[index] ?? 0))
  }
  return trendLabels.map(() => 0)
}

export type CashFlowDisplayAmountRow = {
  current: number
  prior: number
  trendValues?: number[]
}

export function detailRowToOperandSnapshot(row: CashFlowDisplayAmountRow): CashFlowOperandSnapshot {
  return {
    current: row.current,
    prior: row.prior,
    trendValues: row.trendValues,
  }
}

export function sumCashFlowDisplayAmountRows(rows: CashFlowDisplayAmountRow[]): CashFlowDisplayAmountRow {
  const point = rows.reduce(
    (acc, row) => ({ current: acc.current + row.current, prior: acc.prior + row.prior }),
    { current: 0, prior: 0 },
  )
  const length = rows.find((row) => row.trendValues?.length)?.trendValues?.length
  if (!length) return point
  const trendValues = Array.from({ length }, (_, index) =>
    rows.reduce((sum, row) => sum + (row.trendValues?.[index] ?? 0), 0),
  )
  return { ...point, trendValues }
}

export function cashFlowSectionContributorStart(
  structureRows: Record<string, unknown>[],
  resultIndex: number,
): number {
  for (let i = resultIndex - 1; i >= 0; i--) {
    const sr = structureRows[i]!
    if (sr.isSection === true || sr.isResult === true) return i + 1
  }
  return 0
}

export function isCashFlowSectionContributorRow(sr: Record<string, unknown>): boolean {
  if (isStructureRowEmptyLabel(sr)) return false
  if (sr.isSection === true) return false
  if (sr.isResult === true) return false
  if (isCashFlowFormulaAggregationRow(sr)) return false
  return true
}

/** Totaux de section (ex. Flux Investissement) = somme des lignes affichées au-dessus.
 *  Les lignes formule (somme / différence de codes) ne sont pas écrasées.
 *  Passe séquentielle pour que la variation nette cumule des sous-totaux déjà réconciliés.
 */
export function reconcileCashFlowSectionTotalsFromStructure<T extends CashFlowDisplayAmountRow>(
  detailRows: T[],
  structureRows: Record<string, unknown>[],
): T[] {
  if (detailRows.length !== structureRows.length) return detailRows
  const out = [...detailRows]
  for (let index = 0; index < structureRows.length; index++) {
    const sr = structureRows[index]!
    if (sr.isResult !== true) continue
    if (isCashFlowFormulaAggregationRow(sr)) continue
    const start = cashFlowSectionContributorStart(structureRows, index)
    let contributors: CashFlowDisplayAmountRow[] = []
    for (let i = start; i < index; i++) {
      if (isCashFlowSectionContributorRow(structureRows[i]!)) {
        contributors.push(out[i]!)
      }
    }
    if (contributors.length === 0) {
      for (let i = 0; i < index; i++) {
        if (structureRows[i]?.isResult === true) {
          contributors.push(out[i]!)
        }
      }
    }
    out[index] = { ...out[index]!, ...sumCashFlowDisplayAmountRows(contributors) }
  }
  return out
}

export function applyCashFlowCalcToPoint(
  current: number,
  prior: number,
  mode: CashFlowCalcMode,
): { current: number; prior: number } {
  if (mode === "variation_nn1") {
    return { current: current - prior, prior: 0 }
  }
  if (mode === "variation_n1n") {
    return { current: prior - current, prior: 0 }
  }
  return { current, prior }
}

export type CashFlowGlAmountRow = {
  amount: number
  priorAmount?: number
  trendValues?: number[]
}

/** Somme ponctuelle des comptes GL (courant / comparaison). */
export function sumGlAccountPointAmounts(accounts: CashFlowGlAmountRow[]): {
  current: number
  prior: number
} {
  return accounts.reduce(
    (acc, account) => ({
      current: acc.current + account.amount,
      prior: acc.prior + (account.priorAmount ?? 0),
    }),
    { current: 0, prior: 0 },
  )
}

/** Somme des séries mensuelles / trimestrielles / annuelles des comptes GL. */
export function sumGlAccountTrendValues(accounts: CashFlowGlAmountRow[]): number[] | undefined {
  const length = accounts[0]?.trendValues?.length
  if (!length) return undefined
  return Array.from({ length }, (_, index) =>
    accounts.reduce((sum, account) => sum + (account.trendValues?.[index] ?? 0), 0),
  )
}

/** En mode Réel, le total affiché = montant API pour l'horizon (pas la somme GL). */
export function shouldReconcileCashFlowDetailRowFromGlAccounts(mode: CashFlowCalcMode): boolean {
  return mode !== "actual"
}

/** Total de ligne = somme des comptes GL affichés (après Coût / Calcul en variation). */
export function reconcileDetailRowTotalsFromGlAccounts<
  T extends {
    balanceAccounts?: CashFlowGlAmountRow[]
    current: number
    prior: number
    trendValues?: number[]
  },
>(row: T): T {
  if (!row.balanceAccounts?.length) return row
  const point = sumGlAccountPointAmounts(row.balanceAccounts)
  const trendValues = sumGlAccountTrendValues(row.balanceAccounts)
  return {
    ...row,
    current: point.current,
    prior: point.prior,
    ...(trendValues ? { trendValues } : {}),
  }
}

function parseQuarterLabel(label: string): { quarter: number; year: number } | null {
  const match = /^T(\d)\s+(\d{4})$/i.exec(label.trim())
  if (!match) return null
  const quarter = Number(match[1])
  const year = Number(match[2])
  if (!Number.isFinite(quarter) || !Number.isFinite(year) || quarter < 1 || quarter > 4) {
    return null
  }
  return { quarter, year }
}

function parseYearLabel(label: string): number | null {
  const year = Number(label.trim())
  return Number.isFinite(year) ? year : null
}

/** Libellé de la période N−1 alignée (même mois / trimestre / année civile). */
export function priorPeriodLabelForTrend(
  label: string,
  view: CashFlowDetailTrendView,
): string | null {
  if (view === "years") {
    const year = parseYearLabel(label)
    return year != null ? String(year - 1) : null
  }
  if (view === "quarters") {
    const parsed = parseQuarterLabel(label)
    return parsed ? `T${parsed.quarter} ${parsed.year - 1}` : null
  }
  const cal = parseSeriesPeriodCalendarLabel(label)
  if (!cal) return null
  return formatCalendarMonthLabel(cal.month, cal.year - 1)
}

function formatCalendarMonthLabel(month: number, year: number): string {
  const abbrs = [
    "Jan",
    "Fév",
    "Mar",
    "Avr",
    "Mai",
    "Jun",
    "Jul",
    "Aoû",
    "Sep",
    "Oct",
    "Nov",
    "Déc",
  ]
  return `${abbrs[month - 1] ?? "Mois"} ${year}`
}

function amountForTrendLabel(
  label: string,
  valuesByLabel: Map<string, number>,
  amountByCalendarMonth: Map<string, number> | undefined,
  view: CashFlowDetailTrendView,
): number {
  const fromTrend = valuesByLabel.get(label)
  if (fromTrend != null) return fromTrend
  if (!amountByCalendarMonth) return 0

  if (view === "years") {
    const year = parseYearLabel(label)
    if (year == null) return 0
    let sum = 0
    for (let month = 1; month <= 12; month++) {
      sum += amountByCalendarMonth.get(`${year}-${month}`) ?? 0
    }
    return sum
  }

  const cal = parseSeriesPeriodCalendarLabel(label)
  if (cal) {
    return amountByCalendarMonth.get(`${cal.year}-${cal.month}`) ?? 0
  }

  const quarter = parseQuarterLabel(label)
  if (quarter) {
    const startMonth = (quarter.quarter - 1) * 3 + 1
    let sum = 0
    for (let offset = 0; offset < 3; offset++) {
      sum += amountByCalendarMonth.get(`${quarter.year}-${startMonth + offset}`) ?? 0
    }
    return sum
  }

  return 0
}

export function applyCashFlowCalcToTrend(
  values: number[],
  labels: string[],
  mode: CashFlowCalcMode,
  _amountByCalendarMonth?: Map<string, number>,
  _view: CashFlowDetailTrendView = "12months",
): number[] {
  if (mode === "actual") return values

  return labels.map((label, index) => {
    const current = values[index] ?? 0
    // Même logique que Capex : N−1 = colonne précédente (mois / trimestre / année affiché).
    const prior = index + 1 < values.length ? (values[index + 1] ?? 0) : 0
    if (mode === "variation_nn1") return current - prior
    return prior - current
  })
}

export function cashFlowCalcModeLabel(mode: CashFlowCalcMode): string {
  if (mode === "variation_nn1") return "Variations N − N−1"
  if (mode === "variation_n1n") return "N−1 − N"
  return "Réel"
}
