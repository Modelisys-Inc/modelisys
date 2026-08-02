import { isCapexProjectionLinkCode } from "@/lib/standard-link-code-utils"
import {
  isCodeMappingEnabled,
  normalizeCodeList,
  normalizeLiaisonFactor,
  normalizeLiaisonMode,
} from "@/lib/income-statement-structure-utils"
import {
  collectWorkingCapitalIncludedOperandsForDisplay,
  type WorkingCapitalIncludedOperand,
  type WorkingCapitalOperandDisplayContext,
} from "@/lib/working-capital-structure-utils"
import type { SeriesPeriod } from "@/lib/api"
import { yearPeriodIndicesFromReference } from "@/lib/series-reference-columns"

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

function collectStructureRowConfiguredCodes(row: Record<string, unknown>): string[] {
  const codes: string[] = []
  const linkCode = String(row.linkCode ?? "").trim()
  if (linkCode) codes.push(linkCode)
  for (const key of ["liaisonSumCodes", "liaisonNumeratorCodes", "liaisonDenominatorCodes"] as const) {
    const raw = row[key]
    if (!Array.isArray(raw)) continue
    for (const code of raw) {
      const trimmed = String(code ?? "").trim()
      if (trimmed) codes.push(trimmed)
    }
  }
  return codes
}

export function structureRowConfigUsesCapexCostCodes(row: Record<string, unknown>): boolean {
  return collectStructureRowConfiguredCodes(row).some(isCapexProjectionLinkCode)
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
): number[] {
  const indices = pickCapexDisplayIndices(
    periodCount,
    view,
    trendCount,
    periods,
    refMonth,
    refYear,
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
  resolveStructureAtPeriod: (row: Record<string, unknown>, periodIndex: number) => number,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
): number[] {
  const effectiveMode = structureRowConfigUsesCapexCostCodes(row) ? mode : "actual"
  const indices = pickCapexDisplayIndices(
    periodCount,
    view,
    trendCount,
    periods,
    refMonth,
    refYear,
  )
  return indices.map((periodIndex, displayIdx) => {
    if (periodIndex < 0) return 0
    if (effectiveMode === "actual") {
      return resolveStructureAtPeriod(row, periodIndex)
    }
    const priorIndex = priorPeriodIndexForCapexVariation(indices, displayIdx, periodIndex, view)
    if (priorIndex < 0) return 0
    return resolveStructureAtPeriod(row, periodIndex) - resolveStructureAtPeriod(row, priorIndex)
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
  return isCapexProjectionLinkCode(operand.code)
}

export function pickCapexDisplayIndices(
  periodCount: number,
  view: "current" | "12months" | "24months" | "years",
  trendCount: number,
  periods?: SeriesPeriod[],
  refMonth?: number,
  refYear?: number,
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
