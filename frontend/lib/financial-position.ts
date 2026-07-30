import type { AccountMappingData, SeriesPeriod, SeriesRow } from "@/lib/api"
import {
  FINANCIAL_POSITION_SERIES_ID_TO_FAMILY,
} from "@/lib/financial-position-config"
import { balanceSheetFamilyForSectionLabel } from "@/lib/balance-sheet-mapping-rollup"
import {
  findStatementApiRowForStructureRow,
  listStructureRowsForPresentationDisplay,
} from "@/lib/income-statement-structure-utils"
import {
  buildSyntheticSeriesRow,
  computeMetricSeries,
  findSeriesRowByCode,
  isChartMetricSpecConfigured,
} from "@/lib/performance-chart-series"
import type { StatementChartConfig, StatementChartSeries } from "@/lib/statement-chart-config"
import {
  balanceSheetYearTrendFromReference,
  monthShortLabelsFromReference,
  monthTrendFromReference,
  yearLabelsFromReference,
} from "@/lib/series-reference-columns"
import {
  PERFORMANCE_CHART_MONTH_COUNT_24,
  PERFORMANCE_CHART_YEAR_COUNT,
} from "@/lib/performance-chart-series"

const DATA_EPSILON = 1e-6
const NET_INCOME_LINK_CODE = "CAP-C.1"

export const BALANCE_POSITION_FAMILIES = ["ACT", "ALT", "PCT", "PLT", "CAP"] as const
export type BalancePositionFamily = (typeof BALANCE_POSITION_FAMILIES)[number]

export const BALANCE_POSITION_FAMILY_LABELS: Record<BalancePositionFamily, string> = {
  ACT: "Actif à court terme",
  ALT: "Actif à long terme",
  PCT: "Passif à court terme",
  PLT: "Passif à long terme",
  CAP: "Capitaux propres",
}

export type FinancialPositionPoint = {
  period: string
  act: number
  alt: number
  pct: number
  plt: number
  cap: number
  totalAssets: number
  totalLiabilitiesEquity: number
}

export type FinancialPositionResult = {
  points: FinancialPositionPoint[]
  mappedAccountCount: number
}

function flattenSeriesRowsDeep(rows: SeriesRow[]): SeriesRow[] {
  const out: SeriesRow[] = []
  const walk = (list: SeriesRow[]) => {
    for (const row of list) {
      out.push(row)
      for (const detail of row.detailRows ?? []) {
        walk([
          {
            id: detail.id,
            label: detail.label,
            isBold: false,
            isSection: false,
            isResult: false,
            amounts: detail.amounts,
            detailRows: [],
          },
        ])
      }
    }
  }
  walk(rows)
  return out
}

function structureRowBalanceFamily(
  structureRow: Record<string, unknown>,
): BalancePositionFamily | null {
  const linkCode = String(structureRow.linkCode ?? "").trim().toUpperCase()
  if (BALANCE_POSITION_FAMILIES.includes(linkCode as BalancePositionFamily)) {
    return linkCode as BalancePositionFamily
  }
  const family = balanceSheetFamilyForSectionLabel(String(structureRow.label ?? ""))
  if (family && BALANCE_POSITION_FAMILIES.includes(family as BalancePositionFamily)) {
    return family as BalancePositionFamily
  }
  return null
}

function findFamilySeriesRowsByStructure(
  structure: Record<string, unknown>[],
  seriesRows: SeriesRow[],
): Map<BalancePositionFamily, SeriesRow> {
  const map = new Map<BalancePositionFamily, SeriesRow>()
  const used = new Set<number>()
  const usedNested = new Set<string>()
  const presentationRows = listStructureRowsForPresentationDisplay(structure)

  for (const structureRow of presentationRows) {
    const linkCode = String(structureRow.linkCode ?? "").trim().toUpperCase()
    if (!BALANCE_POSITION_FAMILIES.includes(linkCode as BalancePositionFamily)) continue
    if (map.has(linkCode as BalancePositionFamily)) continue
    const row = findStatementApiRowForStructureRow(structureRow, seriesRows, used, usedNested)
    if (!row) continue
    map.set(linkCode as BalancePositionFamily, row)
  }

  for (const structureRow of presentationRows) {
    const family = structureRowBalanceFamily(structureRow)
    if (!family || map.has(family)) continue
    const row = findStatementApiRowForStructureRow(structureRow, seriesRows, used, usedNested)
    if (!row) continue
    map.set(family, row)
  }

  return map
}

function findFamilySeriesRowFromFlatRows(
  rows: SeriesRow[],
  family: BalancePositionFamily,
): SeriesRow | undefined {
  const byCode = findSeriesRowByCode(rows, family)
  if (byCode) return byCode

  const byLabel = findSeriesRowByCode(rows, BALANCE_POSITION_FAMILY_LABELS[family])
  if (byLabel) return byLabel

  for (const row of flattenSeriesRowsDeep(rows)) {
    if (row.linkCode?.trim().toUpperCase() === family) return row
    const rowFamily = balanceSheetFamilyForSectionLabel(row.label)
    if (rowFamily === family) return row
  }

  return undefined
}

/** Ligne série bilan alignée sur le Sommaire (agrégat famille + CAP-C.1 côté serveur). */
export function findFamilySeriesRow(
  rows: SeriesRow[],
  family: BalancePositionFamily,
  structure?: Record<string, unknown>[],
): SeriesRow | undefined {
  if (structure?.length) {
    const fromStructure = findFamilySeriesRowsByStructure(structure, rows).get(family)
    if (fromStructure) return fromStructure
  }

  return findFamilySeriesRowFromFlatRows(rows, family)
}

function seriesRowsForChartSpec(
  spec: StatementChartSeries["spec"],
  rows: SeriesRow[],
): SeriesRow[] {
  if (spec.type === "single") {
    const code = spec.code.trim()
    if (!code) return []
    const row = findSeriesRowByCode(rows, code)
    return row ? [row] : []
  }
  if (spec.type === "sum") {
    return spec.codes
      .map((code) => findSeriesRowByCode(rows, code.trim()))
      .filter((row): row is SeriesRow => row !== undefined)
  }
  return []
}

/** Lignes série utilisées pour ventiler un poste (config graphique ou Sommaire). */
export function resolveFamilyBreakdownSourceRows(
  family: BalancePositionFamily,
  rows: SeriesRow[],
  structure: Record<string, unknown>[] | undefined,
  chartConfig: StatementChartConfig | undefined,
): SeriesRow[] {
  const configuredSeries = chartConfig?.series.find(
    (s) => FINANCIAL_POSITION_SERIES_ID_TO_FAMILY[s.id] === family,
  )
  if (configuredSeries && isChartMetricSpecConfigured(configuredSeries.spec)) {
    const fromConfig = seriesRowsForChartSpec(configuredSeries.spec, rows)
    if (fromConfig.length) return fromConfig
  }

  const familyRow = findFamilySeriesRow(rows, family, structure)
  return familyRow ? [familyRow] : []
}

function familyTrendFromSeriesRow(
  row: SeriesRow | undefined,
  periods: SeriesPeriod[],
  view: string,
  refMonth: number,
  refYear: number,
): number[] | null {
  if (!row || !periods.length) return null
  if (view === "years") {
    return balanceSheetYearTrendFromReference(
      row,
      periods,
      refMonth,
      refYear,
      PERFORMANCE_CHART_YEAR_COUNT,
    )
  }
  if (view === "24months") {
    return monthTrendFromReference(
      row,
      periods,
      refMonth,
      refYear,
      PERFORMANCE_CHART_MONTH_COUNT_24,
    )
  }
  return null
}

function trendFromChartSeries(
  series: StatementChartSeries,
  rows: SeriesRow[],
  periods: SeriesPeriod[],
  view: string,
  refMonth: number,
  refYear: number,
): number[] | null {
  if (!isChartMetricSpecConfigured(series.spec)) return null
  const vals = computeMetricSeries(series.spec, rows, periods)
  if (!vals || vals.length !== periods.length) return null
  const synthetic = buildSyntheticSeriesRow(periods, vals)
  if (view === "years") {
    return balanceSheetYearTrendFromReference(
      synthetic,
      periods,
      refMonth,
      refYear,
      PERFORMANCE_CHART_YEAR_COUNT,
    )
  }
  if (view === "24months") {
    return monthTrendFromReference(
      synthetic,
      periods,
      refMonth,
      refYear,
      PERFORMANCE_CHART_MONTH_COUNT_24,
    )
  }
  return null
}

function resolveFamilyTrend(
  family: BalancePositionFamily,
  chartConfig: StatementChartConfig | undefined,
  rows: SeriesRow[],
  periods: SeriesPeriod[],
  structure: Record<string, unknown>[] | undefined,
  view: string,
  refMonth: number,
  refYear: number,
): number[] | null {
  const configuredSeries = chartConfig?.series.find(
    (s) => FINANCIAL_POSITION_SERIES_ID_TO_FAMILY[s.id] === family,
  )
  if (configuredSeries && isChartMetricSpecConfigured(configuredSeries.spec)) {
    const fromConfig = trendFromChartSeries(
      configuredSeries,
      rows,
      periods,
      view,
      refMonth,
      refYear,
    )
    if (fromConfig) return fromConfig
  }

  return familyTrendFromSeriesRow(findFamilySeriesRow(rows, family, structure), periods, view, refMonth, refYear)
}

function addSeries(a: number[] | null, b: number[] | null): number[] | null {
  if (!a && !b) return null
  const len = Math.max(a?.length ?? 0, b?.length ?? 0)
  if (!len) return null
  return Array.from({ length: len }, (_, i) => (a?.[i] ?? 0) + (b?.[i] ?? 0))
}

function periodLabelsForView(view: string, refMonth: number, refYear: number, pointCount: number): string[] {
  if (view === "years") return yearLabelsFromReference(refYear, pointCount)
  if (view === "24months") return monthShortLabelsFromReference(refMonth, refYear, pointCount)
  return []
}

function countMappedBalanceAccounts(rows: SeriesRow[], structure?: Record<string, unknown>[]): number {
  const accountIds = new Set<string>()
  for (const family of BALANCE_POSITION_FAMILIES) {
    const familyRow = findFamilySeriesRow(rows, family, structure)
    for (const detail of familyRow?.detailRows ?? []) {
      if (detail.id?.trim()) accountIds.add(detail.id.trim())
    }
  }
  return accountIds.size
}

export function buildFinancialPositionResult(params: {
  rows: SeriesRow[]
  periods: SeriesPeriod[]
  mappings?: AccountMappingData[]
  structure?: Record<string, unknown>[]
  chartConfig?: StatementChartConfig
  view: string
  refMonth: number
  refYear: number
}): FinancialPositionResult | null {
  const { rows, periods, structure, chartConfig, view, refMonth, refYear } = params
  if (!rows.length || !periods.length) return null

  const capC1Row = findSeriesRowByCode(rows, NET_INCOME_LINK_CODE)

  const familyTrends = Object.fromEntries(
    BALANCE_POSITION_FAMILIES.map((family) => {
      let trend = resolveFamilyTrend(
        family,
        chartConfig,
        rows,
        periods,
        structure,
        view,
        refMonth,
        refYear,
      )

      if (family === "CAP" && capC1Row) {
        const capSeries = chartConfig?.series.find((s) => s.id === "fp-cap")
        const capUsesConfiguredCode = Boolean(
          capSeries && isChartMetricSpecConfigured(capSeries.spec),
        )
        const capAlreadyIncludesC1 =
          findFamilySeriesRow(rows, "CAP", structure)?.detailRows?.some(
            (detail) => detail.id.trim().toUpperCase() === NET_INCOME_LINK_CODE,
          ) ?? false
        if (!capUsesConfiguredCode && !capAlreadyIncludesC1) {
          trend = addSeries(
            trend,
            familyTrendFromSeriesRow(capC1Row, periods, view, refMonth, refYear),
          )
        }
      }

      return [family, trend]
    }),
  ) as Record<BalancePositionFamily, number[] | null>

  const pointCount = Math.max(
    ...BALANCE_POSITION_FAMILIES.map((f) => familyTrends[f]?.length ?? 0),
    0,
  )
  if (!pointCount) {
    return { points: [], mappedAccountCount: countMappedBalanceAccounts(rows, structure) }
  }

  const labels = periodLabelsForView(view, refMonth, refYear, pointCount)
  const points: FinancialPositionPoint[] = []

  for (let i = 0; i < pointCount; i++) {
    const act = familyTrends.ACT?.[i] ?? 0
    const alt = familyTrends.ALT?.[i] ?? 0
    const pct = familyTrends.PCT?.[i] ?? 0
    const plt = familyTrends.PLT?.[i] ?? 0
    const cap = familyTrends.CAP?.[i] ?? 0
    points.push({
      period: labels[i] ?? `P${i + 1}`,
      act,
      alt,
      pct,
      plt,
      cap,
      totalAssets: act + alt,
      totalLiabilitiesEquity: pct + plt + cap,
    })
  }

  const hasData = points.some(
    (point) =>
      Math.abs(point.act) > DATA_EPSILON ||
      Math.abs(point.alt) > DATA_EPSILON ||
      Math.abs(point.pct) > DATA_EPSILON ||
      Math.abs(point.plt) > DATA_EPSILON ||
      Math.abs(point.cap) > DATA_EPSILON,
  )
  if (!hasData) {
    return { points: [], mappedAccountCount: countMappedBalanceAccounts(rows, structure) }
  }

  return {
    points,
    mappedAccountCount: countMappedBalanceAccounts(rows, structure),
  }
}

export function familyHeading(family: BalancePositionFamily): string {
  return BALANCE_POSITION_FAMILY_LABELS[family]
}

export function parseFamilyFromHeading(heading: string): BalancePositionFamily | null {
  for (const family of BALANCE_POSITION_FAMILIES) {
    if (heading === BALANCE_POSITION_FAMILY_LABELS[family]) return family
  }
  return null
}

export function ratioPct(numerator: number, denominator: number): number | null {
  if (Math.abs(denominator) < DATA_EPSILON) return null
  return (numerator / denominator) * 100
}
