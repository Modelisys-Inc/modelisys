import {
  deriveLinkCodeFamily,
  isCapexProjectionLinkCode,
} from "@/lib/standard-link-code-utils"
import {
  isCodeMappingEnabled,
  listStructureRowsForCashFlowSummary,
  normalizeCodeList,
  normalizeLiaisonFactor,
  normalizeLiaisonMode,
} from "@/lib/income-statement-structure-utils"
import {
  alignSeriesPeriodIndex,
  collectWorkingCapitalIncludedOperandsForDisplay,
  normalizeWorkingCapitalDisplayFormat,
  seriesAmountForLinkCode,
  seriesTrailingTwelveMonthSum,
  type WorkingCapitalIncludedOperand,
  type WorkingCapitalOperandDisplayContext,
} from "@/lib/working-capital-structure-utils"
import { getRowAmounts } from "@/lib/series-utils"
import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import { yearPeriodIndicesFromReference } from "@/lib/series-reference-columns"
import {
  capexYearPeriodIndicesFromReference,
  parseFiscalYearEndMonth,
} from "@/lib/capex-year-reference"

export { parseFiscalYearEndMonth }

export const CAPEX_SETTINGS_ROW_ID = "__capex_settings__"

export type CapexCostDisplayMode = "actual" | "variation"

export type ResolveCapexOperandAmount = (code: string, periodIndex: number) => number

export function isCapexSettingsStructureRow(row: Record<string, unknown>): boolean {
  return String(row.id ?? "") === CAPEX_SETTINGS_ROW_ID
}

/** @deprecated Ancien réglage global — conservé pour la rétrocompatibilité. */
export function readCapexCostDisplayMode(
  structure: Record<string, unknown>[],
): CapexCostDisplayMode {
  const row = structure.find(isCapexSettingsStructureRow)
  const raw = String(row?.capexCostDisplayMode ?? "actual").trim()
  return raw === "variation" ? "variation" : "actual"
}

/** Codes de liaison où le mode Réel / Variation s'applique (numérateur, pas le dénominateur). */
export function collectCapexCostApplicableCodes(row: Record<string, unknown>): string[] {
  const liaisonMode = normalizeLiaisonMode(row)
  if (liaisonMode === "na") return []

  if (liaisonMode === "single") {
    const code = String(row.linkCode ?? "").trim()
    return code ? [code] : []
  }
  if (liaisonMode === "sum" || liaisonMode === "product") {
    return normalizeCodeList(row.liaisonSumCodes)
  }
  if (liaisonMode === "difference" || liaisonMode === "quotient") {
    return normalizeCodeList(row.liaisonNumeratorCodes)
  }
  return []
}

/** Affiche le sélecteur Coût ALT (Paramètres) : case Code cochée et codes ALT pertinents ou liaison à configurer. */
export function structureRowShowsCapexCostDisplaySelector(row: Record<string, unknown>): boolean {
  if (isCapexAutoComputedRow(row)) return false
  if (row.defineMapping !== true) return false
  const applicable = collectCapexCostApplicableCodes(row)
  if (applicable.length === 0) return true
  return applicable.some(isCapexProjectionLinkCode)
}

export function structureRowConfigUsesCapexCostCodes(row: Record<string, unknown>): boolean {
  return collectCapexCostApplicableCodes(row).some(isCapexProjectionLinkCode)
}

export function readRowCapexCostDisplayMode(
  row: Record<string, unknown>,
  structure?: Record<string, unknown>[],
): CapexCostDisplayMode {
  const raw = String(row.capexCostDisplayMode ?? "").trim()
  if (raw === "variation" || raw === "actual") return raw
  if (structure) return readCapexCostDisplayMode(structure)
  return "actual"
}

export type CapexDisplayView = "current" | "12months" | "24months" | "years"

/** Index de la période précédente pour une variation (mois N−1 ou même mois année−1 en vue années). */
export function priorPeriodIndexForCapexVariation(
  indices: number[],
  displayIdx: number,
  periodIndex: number,
  view: CapexDisplayView,
): number {
  if (view === "years") {
    return displayIdx > 0 ? (indices[displayIdx - 1] ?? -1) : -1
  }
  return periodIndex > 0 ? periodIndex - 1 : -1
}

/** Montant d’un opérande ALT à une période : réel ou variation (réel N − réel N−1). */
export function capexOperandAmountAtPeriod(
  code: string,
  periodIndex: number,
  mode: CapexCostDisplayMode,
  resolveActual: ResolveCapexOperandAmount,
  priorPeriodIndex?: number,
): number {
  const actual = resolveActual(code, periodIndex)
  if (mode !== "variation" || !isCapexProjectionLinkCode(code)) return actual
  if (priorPeriodIndex == null || priorPeriodIndex < 0) return 0
  return actual - resolveActual(code, priorPeriodIndex)
}

/**
 * Montant structure Capex à une période bilan.
 * En variation, chaque code ALT contribue par (réel N − réel N−1) avant la formule.
 */
export function resolveCapexStructureAmountAtPeriod(
  row: Record<string, unknown>,
  periodIndex: number,
  mode: CapexCostDisplayMode,
  resolveActual: ResolveCapexOperandAmount,
  priorPeriodIndex?: number,
): number | null {
  if (!isCodeMappingEnabled(row)) return null
  const liaisonMode = normalizeLiaisonMode(row)
  if (liaisonMode === "na") return null

  const usesAltVariation =
    mode === "variation" && structureRowConfigUsesCapexCostCodes(row)

  const amountFor = (code: string): number => {
    if (!usesAltVariation) return resolveActual(code, periodIndex)
    return capexOperandAmountAtPeriod(code, periodIndex, mode, resolveActual, priorPeriodIndex)
  }

  if (liaisonMode === "single") {
    const code = String(row.linkCode || "").trim()
    if (!code) return null
    return amountFor(code)
  }
  if (liaisonMode === "sum") {
    const codes = normalizeCodeList(row.liaisonSumCodes)
    if (codes.length === 0) return null
    return codes.reduce((sum, code) => sum + amountFor(code), 0)
  }
  if (liaisonMode === "product") {
    const codes = normalizeCodeList(row.liaisonSumCodes)
    if (codes.length === 0) return null
    return codes.reduce((prod, code) => prod * amountFor(code), 1)
  }
  if (liaisonMode === "difference") {
    const nums = normalizeCodeList(row.liaisonNumeratorCodes)
    const dens = normalizeCodeList(row.liaisonDenominatorCodes)
    if (nums.length === 0 && dens.length === 0) return null
    const n = nums.reduce((sum, code) => sum + amountFor(code), 0)
    const d = dens.reduce((sum, code) => sum + amountFor(code), 0)
    return n - d
  }
  if (liaisonMode === "quotient") {
    const nums = normalizeCodeList(row.liaisonNumeratorCodes)
    const dens = normalizeCodeList(row.liaisonDenominatorCodes)
    if (nums.length === 0 && dens.length === 0) return null
    const n = nums.reduce((sum, code) => sum + amountFor(code), 0)
    const d = dens.reduce((sum, code) => sum + amountFor(code), 0)
    if (d === 0) return 0
    return (n / d) * normalizeLiaisonFactor(row.liaisonFactor)
  }
  return null
}

export function buildCapexOperandDisplayValues(
  code: string,
  mode: CapexCostDisplayMode,
  view: CapexDisplayView,
  trendCount: number,
  periodCount: number,
  resolveActual: ResolveCapexOperandAmount,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  fiscalYearEndMonth?: number,
): number[] {
  const indices = pickCapexDisplayIndices(
    periodCount,
    view,
    trendCount,
    periods,
    refMonth,
    refYear,
    fiscalYearEndMonth,
  )
  return indices.map((periodIndex, displayIdx) => {
    if (periodIndex < 0) return 0
    const priorIndex = priorPeriodIndexForCapexVariation(indices, displayIdx, periodIndex, view)
    return capexOperandAmountAtPeriod(code, periodIndex, mode, resolveActual, priorIndex)
  })
}

export function buildCapexRowDisplayValues(
  row: Record<string, unknown>,
  mode: CapexCostDisplayMode,
  view: CapexDisplayView,
  trendCount: number,
  periodCount: number,
  resolveOperandActual: ResolveCapexOperandAmount,
  resolveCapexStructureAtPeriod: (
    row: Record<string, unknown>,
    periodIndex: number,
    priorPeriodIndex?: number,
  ) => number,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  fiscalYearEndMonth?: number,
): number[] {
  const usesCapexCost = structureRowConfigUsesCapexCostCodes(row)
  const effectiveMode = usesCapexCost ? mode : "actual"
  const indices = pickCapexDisplayIndices(
    periodCount,
    view,
    trendCount,
    periods,
    refMonth,
    refYear,
    fiscalYearEndMonth,
  )
  return indices.map((periodIndex, displayIdx) => {
    if (periodIndex < 0) return 0
    if (effectiveMode === "actual") {
      return resolveCapexStructureAtPeriod(row, periodIndex)
    }
    const priorIndex = priorPeriodIndexForCapexVariation(indices, displayIdx, periodIndex, view)
    return resolveCapexStructureAtPeriod(row, periodIndex, priorIndex)
  })
}

/** Convertit une série de soldes (par index de période bilan) en affichage Réel ou Variation. */
export function applyCapexCostDisplayMode(
  periodValues: number[],
  mode: CapexCostDisplayMode,
): number[] {
  if (mode === "actual") return periodValues
  return periodValues.map((value, index) =>
    index === 0 ? 0 : value - (periodValues[index - 1] ?? 0),
  )
}

export function capexCostDisplayModeLabel(mode: CapexCostDisplayMode): string {
  return mode === "variation" ? "Variation (N − N−1)" : "Réel"
}

export function structureRowUsesCapexCostCodes(
  row: Record<string, unknown>,
  context?: WorkingCapitalOperandDisplayContext,
): boolean {
  if (structureRowConfigUsesCapexCostCodes(row)) return true
  if (!context) return false
  const operands = collectWorkingCapitalIncludedOperandsForDisplay(row, context)
  return operands.some((op) => isCapexProjectionLinkCode(op.code))
}

export function operandUsesCapexCostDisplay(operand: WorkingCapitalIncludedOperand): boolean {
  if (operand.role === "denominator") return false
  return isCapexProjectionLinkCode(operand.code)
}

export function pickCapexDisplayIndices(
  periodCount: number,
  view: "current" | "12months" | "24months" | "years",
  trendCount: number,
  periods?: SeriesPeriod[],
  refMonth?: number,
  refYear?: number,
  fiscalYearEndMonth?: number,
): number[] {
  if (periodCount <= 0) return []
  if (view === "current") {
    if (periodCount === 1) return [0]
    return [periodCount - 1, periodCount - 2]
  }
  if (
    view === "years" &&
    periods &&
    periods.length > 0 &&
    refMonth != null &&
    refMonth >= 1 &&
    refMonth <= 12 &&
    refYear != null
  ) {
    const count = Math.max(1, trendCount || 6)
    if (fiscalYearEndMonth != null) {
      return capexYearPeriodIndicesFromReference(
        periods,
        refMonth,
        refYear,
        fiscalYearEndMonth,
        count,
      )
    }
    return yearPeriodIndicesFromReference(periods, refMonth, refYear, count)
  }
  const count = Math.max(1, Math.min(trendCount || periodCount, periodCount))
  const start = Math.max(0, periodCount - count)
  return Array.from({ length: count }, (_, offset) => start + offset)
}

export function pickCapexDisplayValues(
  periodValues: number[],
  mode: CapexCostDisplayMode,
  view: "current" | "12months" | "24months" | "years",
  trendCount: number,
): number[] {
  const transformed = applyCapexCostDisplayMode(periodValues, mode)
  return pickCapexDisplayIndices(periodValues.length, view, trendCount).map(
    (index) => transformed[index] ?? 0,
  )
}

function normalizeCapexMetricLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/** Poste « Capex » (numérateur des ratios), pas « Capex / … ». */
export function isCapexHeadlineRow(row: Record<string, unknown>): boolean {
  return normalizeCapexMetricLabel(String(row.label ?? "")) === "capex"
}

export function isCapexBaiiaRatioRow(row: Record<string, unknown>): boolean {
  return normalizeCapexMetricLabel(String(row.label ?? "")) === "capex / baiia"
}

function isOperatingCashFlowLabel(key: string): boolean {
  if (!key.includes("flux de tresorerie")) return false
  return key.includes("exploitation") || key.includes("operation")
}

export function isCapexOperatingCashFlowRatioRow(row: Record<string, unknown>): boolean {
  const key = normalizeCapexMetricLabel(String(row.label ?? ""))
  return key.startsWith("capex / ") && isOperatingCashFlowLabel(key)
}

/** Poste BAIIA (montant), distinct du ratio « Capex / BAIIA ». */
export function isCapexBaiiaMetricRow(row: Record<string, unknown>): boolean {
  const key = normalizeCapexMetricLabel(String(row.label ?? ""))
  return key === "baiia" || key === "ebitda"
}

/** Poste flux d’exploitation (montant), distinct du ratio « Capex / Flux… ». */
export function isCapexOperatingCashFlowMetricRow(row: Record<string, unknown>): boolean {
  const key = normalizeCapexMetricLabel(String(row.label ?? ""))
  if (key.startsWith("capex / ")) return false
  return isOperatingCashFlowLabel(key)
}

/** Ratios Capex calculés automatiquement (liaison verrouillée, comme BAIIA). */
export function isCapexAutoRatioRow(row: Record<string, unknown>): boolean {
  return isCapexBaiiaRatioRow(row) || isCapexOperatingCashFlowRatioRow(row)
}

export function isCapexAutoMetricRow(row: Record<string, unknown>): boolean {
  return isCapexBaiiaMetricRow(row) || isCapexOperatingCashFlowMetricRow(row)
}

export function isCapexAutoComputedRow(row: Record<string, unknown>): boolean {
  return isCapexAutoRatioRow(row) || isCapexAutoMetricRow(row)
}

export const CAPEX_BAIIA_RATIO_LIAISON_LABEL = "Capex / (REV − CV − CF)"
export const CAPEX_OCF_RATIO_LIAISON_LABEL = "Capex / Exploitation"
export const CAPEX_BAIIA_METRIC_LIAISON_LABEL = "REV − CV − CF"
export const CAPEX_OCF_METRIC_LIAISON_LABEL = "Exploitation"

export function capexAutoRatioLiaisonLabel(row: Record<string, unknown>): string {
  if (isCapexBaiiaRatioRow(row)) return CAPEX_BAIIA_RATIO_LIAISON_LABEL
  if (isCapexOperatingCashFlowRatioRow(row)) return CAPEX_OCF_RATIO_LIAISON_LABEL
  if (isCapexBaiiaMetricRow(row)) return CAPEX_BAIIA_METRIC_LIAISON_LABEL
  if (isCapexOperatingCashFlowMetricRow(row)) return CAPEX_OCF_METRIC_LIAISON_LABEL
  return ""
}

export function normalizeCapexAutoRatioRow(row: Record<string, unknown>): Record<string, unknown> {
  if (!isCapexAutoComputedRow(row)) return row
  return {
    ...row,
    defineMapping: false,
    displayFormat: isCapexAutoRatioRow(row) ? "percent" : "currency",
    linkCode: undefined,
    formula: undefined,
    liaisonMode: undefined,
    liaisonSumCodes: undefined,
    liaisonNumeratorCodes: undefined,
    liaisonDenominatorCodes: undefined,
    capexCostDisplayMode: undefined,
  }
}

export function normalizeCapexStructure(
  structure: Record<string, unknown>[],
): Record<string, unknown>[] {
  return structure.map((row) => normalizeCapexAutoRatioRow(row))
}

export function findBaiiaSeriesRow(rows: SeriesRow[]): SeriesRow | undefined {
  const exact = rows.find((row) => row.label.trim().toLowerCase() === "baiia")
  if (exact) return exact
  return rows.find((row) => {
    const label = row.label.trim().toLowerCase()
    return label === "ebitda" || label.includes("baiia")
  })
}

/** BAIIA opérationnel (série Résultats) en TTM à la date bilan — même convention que REV. */
export function baiiaTtmAtBalancePeriod(
  isRows: SeriesRow[],
  isPeriods: SeriesPeriod[],
  bsPeriods: SeriesPeriod[],
  bsPeriodIndex: number,
): number {
  const row = findBaiiaSeriesRow(isRows)
  if (!row || isPeriods.length === 0) return 0
  const amounts = getRowAmounts(row, isPeriods)
  const isIdx = alignSeriesPeriodIndex(isPeriods, bsPeriods, bsPeriodIndex)
  return seriesTrailingTwelveMonthSum(amounts, isIdx)
}

function preferLeafLinkCodes(codes: string[]): string[] {
  const unique = [...new Set(codes.filter(Boolean))]
  return unique.filter(
    (code) =>
      !unique.some(
        (other) =>
          other !== code && (other.startsWith(`${code}-`) || other.startsWith(`${code}.`)),
      ),
  )
}

function texLinkCodesFromCandidates(
  rows: { linkCode?: string; id?: string; isSection?: boolean; isResult?: boolean }[],
): string[] {
  const texRows = rows.filter((row) => {
    if (row.isSection) return false
    const code = String(row.linkCode ?? row.id ?? "").trim()
    return deriveLinkCodeFamily(code) === "TEX"
  })
  const resultRows = texRows.filter((row) => row.isResult === true)
  const source = resultRows.length > 0 ? resultRows : texRows
  return preferLeafLinkCodes(
    source.map((row) => String(row.linkCode ?? row.id ?? "").trim()),
  )
}

/** Codes TEX du Sommaire trésorerie (annexe) ; à défaut, toutes les lignes TEX de la série. */
export function collectOperatingCashFlowLinkCodes(
  cfStructure: Record<string, unknown>[],
  cfRows: SeriesRow[],
): string[] {
  const fromSummary = texLinkCodesFromCandidates(
    listStructureRowsForCashFlowSummary(cfStructure).map((row) => ({
      linkCode: String(row.linkCode ?? "").trim() || undefined,
      id: String(row.id ?? "").trim() || undefined,
      isSection: row.isSection === true,
      isResult: row.isResult === true,
    })),
  )
  if (fromSummary.length) return fromSummary
  return texLinkCodesFromCandidates(
    cfRows.map((row) => ({
      linkCode: row.linkCode,
      id: row.id,
      isSection: row.isSection,
      isResult: row.isResult,
    })),
  )
}

/** Flux d’exploitation (Sommaire trésorerie) en TTM à la date bilan. */
export function operatingCashFlowTtmAtBalancePeriod(
  cfRows: SeriesRow[],
  cfPeriods: SeriesPeriod[],
  cfStructure: Record<string, unknown>[],
  bsPeriods: SeriesPeriod[],
  bsPeriodIndex: number,
): number {
  if (cfPeriods.length === 0) return 0
  const codes = collectOperatingCashFlowLinkCodes(cfStructure, cfRows)
  if (!codes.length) return 0
  const cfIdx = alignSeriesPeriodIndex(cfPeriods, bsPeriods, bsPeriodIndex)
  const monthly = cfPeriods.map((_, index) =>
    codes.reduce(
      (sum, code) => sum + seriesAmountForLinkCode(code, cfRows, cfPeriods, index),
      0,
    ),
  )
  return seriesTrailingTwelveMonthSum(monthly, cfIdx)
}

export function capexRatioPercent(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return (numerator / denominator) * 100
}

/** Ratio « Capex / Revenus » ou « Capex / Chiffre d'affaires » — référence du numérateur auto. */
export function isCapexRevenueRatioRow(row: Record<string, unknown>): boolean {
  const key = normalizeCapexMetricLabel(String(row.label ?? ""))
  if (key === "capex / revenus") return true
  return key.startsWith("capex / chiffre")
}

export function pickCapexRevenueRatioRow(
  structure: Record<string, unknown>[],
): Record<string, unknown> | undefined {
  return structure.find((row) => isCapexRevenueRatioRow(row) && isCodeMappingEnabled(row))
}

/**
 * Montant Capex affiché (numérateur des ratios auto), même principe que Capex / Revenus :
 * poste « Capex », ou lignes ALT en Variation — jamais le stock Réel des immobilisations.
 */
export function isCapexNumeratorSourceRow(
  row: Record<string, unknown>,
  structure?: Record<string, unknown>[],
): boolean {
  if (isCapexAutoComputedRow(row)) return false
  if (isCapexRevenueRatioRow(row)) return false
  if (normalizeLiaisonMode(row) === "quotient") return false
  if (normalizeWorkingCapitalDisplayFormat(row.displayFormat) === "percent") return false
  const key = normalizeCapexMetricLabel(String(row.label ?? ""))
  if (key.startsWith("capex / ")) return false
  if (isCapexHeadlineRow(row)) return true
  if (!structureRowConfigUsesCapexCostCodes(row)) return false
  return readRowCapexCostDisplayMode(row, structure) === "variation"
}

/** Valeurs alignées sur les colonnes Capex (snapshots annuels = mois réf. / clôture). */
export function buildCapexAlignedPeriodValues(
  view: CapexDisplayView,
  trendCount: number,
  periodCount: number,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  fiscalYearEndMonth: number | undefined,
  valueAtPeriodIndex: (
    periodIndex: number,
    displayIdx: number,
    indices: number[],
  ) => number,
): number[] {
  const indices = pickCapexDisplayIndices(
    periodCount,
    view,
    trendCount,
    periods,
    refMonth,
    refYear,
    fiscalYearEndMonth,
  )
  return indices.map((periodIndex, displayIdx) =>
    periodIndex < 0 ? 0 : valueAtPeriodIndex(periodIndex, displayIdx, indices),
  )
}

export function sumCapexDisplaySeries(seriesList: number[][]): number[] {
  if (!seriesList.length) return []
  const length = Math.max(...seriesList.map((series) => series.length), 0)
  return Array.from({ length }, (_, index) =>
    seriesList.reduce((sum, series) => sum + (series[index] ?? 0), 0),
  )
}

export function capexSeriesValueAt(
  series: number[] | null | undefined,
  view: CapexDisplayView,
  isPrior: boolean,
  trendIndex?: number,
): number | null {
  if (!series?.length) return null
  if (view === "current") return isPrior ? (series[1] ?? 0) : (series[0] ?? 0)
  return series[trendIndex ?? 0] ?? 0
}
