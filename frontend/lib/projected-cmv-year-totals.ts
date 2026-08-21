import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import {
  collectLinkCodesFromStructureRow,
  ensureSeriesRowsForAnnexDetailScope,
  findStructureRowForStatementLine,
  isCodeMappingEnabled,
  isExcludedProjectionComputedExpenseLinkCode,
  isShowInDetail,
  isStructureRowDetailOnly,
  seriesRowBelongsToDepensesAnnexDetail,
  structureRowBelongsToDepensesAnnexDetail,
  syncDetailSubLinesFromStandard,
  resolveStructureAnnexLetter,
} from "@/lib/income-statement-structure-utils"
import { uniqueStatementRowsByStructureIndex } from "@/lib/income-statement-annex-detail"
import {
  forecastActualColumnCount,
  forecastGrowthPreviousConfigYearIndex,
  nMinusOneAndYtdActuals,
  type ForecastActualLayout,
} from "@/lib/pro-forma-forecast-columns"
import { aggregateToYears, getRowAmounts } from "@/lib/series-utils"

export type StoredExpenseType = "variable" | "fixe"

export type StoredExpenseAdjustment = {
  id: string
  type: "amount" | "percentage" | "inflation"
  amount?: number
  isRecurring?: boolean
  yearIndex?: number
}

export type CmvHypothesisSeriesRow = {
  id: string
  label: string
  isSection?: boolean
  amounts?: Record<string, number>
}

/** Famille CMV (hors codes exclus des hyp. dépenses, ex. CMV.11). */
export function isCmvFamilyLinkCode(code: string | null | undefined): boolean {
  const normalized = String(code ?? "")
    .trim()
    .toUpperCase()
  if (!normalized) return false
  if (isExcludedProjectionComputedExpenseLinkCode(normalized)) return false
  return (
    normalized === "CMV" ||
    normalized.startsWith("CMV.") ||
    normalized.startsWith("CMV-")
  )
}

function structureRowIsCmvFamily(structRow: Record<string, unknown>): boolean {
  return collectLinkCodesFromStructureRow(structRow).some(isCmvFamilyLinkCode)
}

function isMappedDetailSeriesRow(
  row: CmvHypothesisSeriesRow,
  structure: Record<string, unknown>[],
): boolean {
  const sr = findStructureRowForStatementLine(row.id, row.label, structure)
  return sr !== undefined && isShowInDetail(sr, structure) && isCodeMappingEnabled(sr)
}

/** Postes CMV des Hypothèses Dépenses (feuilles d’annexe, pas CMV.11). */
export function listCmvHypothesisPostIds(
  seriesRows: CmvHypothesisSeriesRow[],
  structure: Record<string, unknown>[],
): string[] {
  if (!structure.length) return []
  let rows = seriesRows
    .filter((sr) => isMappedDetailSeriesRow(sr, structure))
    .filter((sr) => seriesRowBelongsToDepensesAnnexDetail(sr, structure))
  rows = uniqueStatementRowsByStructureIndex(
    ensureSeriesRowsForAnnexDetailScope(
      rows,
      structure,
      structureRowBelongsToDepensesAnnexDetail,
      (structRow) => {
        const id =
          String(structRow.id ?? structRow.linkCode ?? "").trim() ||
          String(structRow.label ?? "").trim()
        resolveStructureAnnexLetter(structRow, structure)
        return {
          id,
          label: String(structRow.label ?? "").trim() || id,
          isSection: Boolean(structRow.isSection),
          amounts: {},
        }
      },
    ),
    structure,
  )
  const ids: string[] = []
  const seen = new Set<string>()
  for (const sr of rows) {
    if (sr.isSection) continue
    const structRow = findStructureRowForStatementLine(sr.id, sr.label, structure)
    if (!structRow) continue
    if (!isStructureRowDetailOnly(structRow)) continue
    if (!structureRowIsCmvFamily(structRow)) continue
    if (!sr.id || seen.has(sr.id)) continue
    seen.add(sr.id)
    ids.push(sr.id)
  }
  return ids
}

function parseExpenseAdjustments(raw: unknown): Record<string, StoredExpenseAdjustment[]> {
  const out: Record<string, StoredExpenseAdjustment[]> = {}
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue
    out[key] = value
      .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      .map((item) => ({
        id: typeof item.id === "string" ? item.id : key,
        type:
          item.type === "percentage" || item.type === "inflation" || item.type === "amount"
            ? item.type
            : "amount",
        amount: typeof item.amount === "number" && Number.isFinite(item.amount) ? item.amount : 0,
        isRecurring: item.isRecurring === true,
        yearIndex: typeof item.yearIndex === "number" ? item.yearIndex : undefined,
      }))
  }
  return out
}

export function parseExpenseForecastConfig(data: Record<string, unknown>): {
  revenueValues: Record<string, number>
  expenseTypes: Record<string, StoredExpenseType>
  variableRates: Record<string, number>
  inflationRate: number
  specificInflationRates: Record<string, number>
  expenseAdjustments: Record<string, StoredExpenseAdjustment[]>
} {
  const expenseTypesRaw = (data.expenseTypes as Record<string, unknown>) ?? {}
  const expenseTypes: Record<string, StoredExpenseType> = {}
  for (const [k, v] of Object.entries(expenseTypesRaw)) {
    expenseTypes[k] = v === "fixe" ? "fixe" : "variable"
  }
  const variableRatesRaw = (data.variableRates as Record<string, unknown>) ?? {}
  const variableRates: Record<string, number> = {}
  for (const [k, v] of Object.entries(variableRatesRaw)) {
    if (typeof v === "number" && Number.isFinite(v)) variableRates[k] = v
  }
  const specificRaw = (data.specificInflationRates as Record<string, unknown>) ?? {}
  const specificInflationRates: Record<string, number> = {}
  for (const [k, v] of Object.entries(specificRaw)) {
    if (typeof v === "number" && Number.isFinite(v)) specificInflationRates[k] = v
  }
  return {
    revenueValues: (data.revenueValues as Record<string, number>) ?? {},
    expenseTypes,
    variableRates,
    inflationRate:
      typeof data.inflationRate === "number" && Number.isFinite(data.inflationRate)
        ? data.inflationRate
        : 2,
    specificInflationRates,
    expenseAdjustments: parseExpenseAdjustments(data.expenseAdjustments),
  }
}

function expenseTypeFor(
  rowId: string,
  expenseTypes: Record<string, StoredExpenseType>,
): StoredExpenseType {
  return expenseTypes[rowId] ?? "variable"
}

function inflationFor(
  rowId: string,
  inflationRate: number,
  specificInflationRates: Record<string, number>,
): number {
  const specific = specificInflationRates[rowId]
  return typeof specific === "number" && Number.isFinite(specific) ? specific : inflationRate
}

function amountAdjustmentsForYear(
  rowId: string,
  yearIndex: number,
  expenseAdjustments: Record<string, StoredExpenseAdjustment[]>,
  expenseType: StoredExpenseType,
): number {
  let extra = 0
  const direct = expenseAdjustments[`${rowId}-${yearIndex}`] ?? []
  for (const adj of direct) {
    if (adj.type === "amount") extra += adj.amount ?? 0
  }
  if (expenseType === "fixe") {
    for (let i = 1; i < yearIndex; i++) {
      for (const adj of expenseAdjustments[`${rowId}-${i}`] ?? []) {
        if (adj.type !== "amount" || !adj.isRecurring) continue
        extra += adj.amount ?? 0
      }
    }
  }
  return extra
}

/**
 * Montant CMV projeté d’un poste (aligné Hypothèses Dépenses, version annuelle simplifiée) :
 * variable = % × CA projeté ; fixe = inflation composée depuis N-1 / année 0.
 */
export function computeProjectedCmvRowValue(
  rowId: string,
  yearIndex: number,
  baseAmount: number,
  projectedRevenue: number,
  opts: {
    expenseTypes: Record<string, StoredExpenseType>
    variableRates: Record<string, number>
    inflationRate: number
    specificInflationRates: Record<string, number>
    revenueValues: Record<string, number>
    expenseAdjustments: Record<string, StoredExpenseAdjustment[]>
    actualColumnCount?: number
    nMinusOneActual?: number
  },
): number {
  const expenseType = expenseTypeFor(rowId, opts.expenseTypes)
  const key = `${rowId}-${yearIndex}`
  if (opts.revenueValues[key] !== undefined) {
    const stored = opts.revenueValues[key]!
    const phantomZeroFixe = expenseType === "fixe" && yearIndex > 0 && stored === 0
    if (!phantomZeroFixe) {
      return stored + amountAdjustmentsForYear(rowId, yearIndex, opts.expenseAdjustments, expenseType)
    }
  }

  if (yearIndex <= 0) {
    return opts.revenueValues[`${rowId}-0`] ?? baseAmount
  }

  let calculated = 0
  if (expenseType === "variable") {
    const rate = opts.variableRates[rowId] ?? 0
    calculated = Math.round(projectedRevenue * (rate / 100))
  } else {
    const actualCols = opts.actualColumnCount ?? 1
    const growthPrev = forecastGrowthPreviousConfigYearIndex(yearIndex, actualCols)
    let previous = baseAmount
    if (growthPrev === "nMinusOne") {
      previous = opts.nMinusOneActual ?? baseAmount
    } else if (typeof growthPrev === "number" && growthPrev >= 0) {
      previous = computeProjectedCmvRowValue(
        rowId,
        growthPrev,
        baseAmount,
        projectedRevenue,
        opts,
      )
    } else {
      previous = opts.revenueValues[`${rowId}-0`] ?? baseAmount
    }
    const rate = inflationFor(rowId, opts.inflationRate, opts.specificInflationRates)
    calculated = Math.round(previous * (1 + rate / 100))
  }

  calculated += amountAdjustmentsForYear(rowId, yearIndex, opts.expenseAdjustments, expenseType)
  return calculated
}

/**
 * Totaux CMV projetés par index config (0 = réel / base, 1+ = projeté).
 * Sans hypothèse de dépense CMV pour une année projetée → 0 $ (jamais d’invention
 * à partir du CMV N-1 ou du CA).
 */
export function computeProjectedCmvYearTotalsFromSeries(
  seriesRows: SeriesRow[],
  periods: SeriesPeriod[],
  structure: Record<string, unknown>[],
  projectionYears: number,
  config: ReturnType<typeof parseExpenseForecastConfig>,
  projectedRevenueYearTotals: number[] | null | undefined,
  lastActualCmv: number,
  lastActualRevenue: number,
  opts?: {
    forecastActualLayout?: ForecastActualLayout
    refMonth?: number
    refYear?: number
    fiscalYearEndMonth?: number
  },
): number[] {
  const numYears = projectionYears + 1
  const actualColumnCount = forecastActualColumnCount(opts?.forecastActualLayout ?? "single-prior-year")
  const refMonth = opts?.refMonth ?? 12
  const refYear = opts?.refYear ?? new Date().getFullYear()
  const fiscalYearEndMonth = opts?.fiscalYearEndMonth ?? 12

  const zerosWithActualBase = (): number[] =>
    Array.from({ length: numYears }, (_, yearIndex) => (yearIndex <= 0 ? lastActualCmv : 0))

  if (!seriesRows.length || !periods.length || !structure.length) return zerosWithActualBase()

  const postIds = listCmvHypothesisPostIds(seriesRows, structure)
  if (postIds.length === 0) return zerosWithActualBase()

  const seriesById = new Map(seriesRows.map((sr) => [sr.id, sr]))
  const baseByRow = new Map<string, number>()
  const nMinusOneByRow = new Map<string, number>()
  for (const id of postIds) {
    const sr = seriesById.get(id)
    let baseAmount = 0
    if (sr) {
      const rawAmounts = getRowAmounts(sr, periods)
      const { amounts: yearlyAmounts } = aggregateToYears(rawAmounts, periods)
      baseAmount = yearlyAmounts.length > 0 ? yearlyAmounts[yearlyAmounts.length - 1]! : 0
      if (actualColumnCount > 1) {
        nMinusOneByRow.set(
          id,
          nMinusOneAndYtdActuals(sr, periods, refMonth, refYear, fiscalYearEndMonth).nMinusOne,
        )
      }
    }
    baseByRow.set(id, baseAmount)
  }

  return Array.from({ length: numYears }, (_, yearIndex) => {
    if (yearIndex <= 0) {
      // Année réelle / base : solde série CMV (ou lastActual), pas 0.
      const fromPosts = postIds.reduce((acc, id) => {
        const projectedRevenue =
          projectedRevenueYearTotals?.[yearIndex] ?? lastActualRevenue
        return (
          acc +
          computeProjectedCmvRowValue(id, yearIndex, baseByRow.get(id) ?? 0, projectedRevenue, {
            expenseTypes: config.expenseTypes,
            variableRates: config.variableRates,
            inflationRate: config.inflationRate,
            specificInflationRates: config.specificInflationRates,
            revenueValues: config.revenueValues,
            expenseAdjustments: config.expenseAdjustments,
            actualColumnCount,
            nMinusOneActual: nMinusOneByRow.get(id),
          })
        )
      }, 0)
      return fromPosts !== 0 ? fromPosts : lastActualCmv
    }

    const projectedRevenue = projectedRevenueYearTotals?.[yearIndex] ?? 0
    return postIds.reduce((acc, id) => {
      return (
        acc +
        computeProjectedCmvRowValue(id, yearIndex, baseByRow.get(id) ?? 0, projectedRevenue, {
          expenseTypes: config.expenseTypes,
          variableRates: config.variableRates,
          inflationRate: config.inflationRate,
          specificInflationRates: config.specificInflationRates,
          revenueValues: config.revenueValues,
          expenseAdjustments: config.expenseAdjustments,
          actualColumnCount,
          nMinusOneActual: nMinusOneByRow.get(id),
        })
      )
    }, 0)
  })
}

export function prepareCmvDisplayStructure(
  structure: Record<string, unknown>[] | null,
  standardLinkCodes: Parameters<typeof syncDetailSubLinesFromStandard>[1],
): Record<string, unknown>[] | null {
  if (structure === null) return null
  if (!standardLinkCodes.length) return structure
  return syncDetailSubLinesFromStandard(structure, standardLinkCodes)
}
