import type { AccountMappingData, SeriesPeriod, SeriesRow, StandardLinkCode } from "@/lib/api"
import type {
  RevenueSeriesNarrativeSlice,
  RevenueComponentBreakdown,
  VariableCostAccountBreakdown,
} from "@/lib/income-performance-narrative"
import {
  buildSyntheticSeriesRow,
  computeMetricSeries,
  findSeriesRowByCode,
  PERFORMANCE_CHART_MONTH_COUNT_24,
  PERFORMANCE_CHART_YEAR_COUNT,
  type BuiltSeriesMeta,
} from "@/lib/performance-chart-series"
import type { ChartMetricSpec, StatementChartSeries } from "@/lib/statement-chart-config"
import { getRowAmounts } from "@/lib/series-utils"
import {
  monthShortLabelsFromReference,
  monthTrendFromReference,
  yearLabelsFromReference,
  yearTrendFromReference,
} from "@/lib/series-reference-columns"
import {
  getDetailSubLineCodesFromStandardLinkCode,
  getLeafDescendantsOfStandardLinkCode,
  standardLinkCodeDisplayLabel,
} from "@/lib/standard-link-code-utils"

const DATA_EPSILON = 1e-6

export function extractLinkCodesFromMetricSpec(spec: ChartMetricSpec): string[] {
  if (spec.type === "single") {
    const code = spec.code.trim()
    return code ? [code] : []
  }
  if (spec.type === "sum") {
    return spec.codes.map((c) => c.trim()).filter(Boolean)
  }
  if (spec.type === "difference" || spec.type === "ratio") {
    return [...spec.numeratorCodes, ...spec.denominatorCodes].map((c) => c.trim()).filter(Boolean)
  }
  return []
}

/**
 * Étend chaque code de revenu du graphique vers ses feuilles descendantes (ex. REV-A → REV-A.1, REV-A.2).
 * Les rattachements du mapping comptable restent au niveau feuille (REV-A.1).
 */
export function resolveRevenueTargetLinkCodes(
  chartCodes: string[],
  standardLinkCodes?: StandardLinkCode[],
): Set<string> {
  const targets = new Set<string>()
  for (const raw of chartCodes) {
    const code = raw.trim()
    if (!code) continue
    targets.add(code)
    if (!standardLinkCodes?.length) continue
    for (const leaf of getLeafDescendantsOfStandardLinkCode(code, standardLinkCodes)) {
      targets.add(leaf.code)
    }
  }
  return targets
}

/** Le mapping référence un code feuille précis ; on l'associe au code graphique ou à ses descendants. */
export function revenueLinkMatchesChartCodes(
  chartCodes: string[],
  mappingRevenueCode: string,
  standardLinkCodes?: StandardLinkCode[],
): boolean {
  const mapped = mappingRevenueCode.trim()
  if (!mapped) return false

  if (standardLinkCodes?.length) {
    return resolveRevenueTargetLinkCodes(chartCodes, standardLinkCodes).has(mapped)
  }

  return chartCodes.some((chartCode) => {
    const c = chartCode.trim()
    if (!c) return false
    if (c === mapped) return true
    if (mapped.startsWith(`${c}.`)) return true
    if (c.startsWith(`${mapped}.`)) return true
    return false
  })
}

export function collectVariableCostAccountsForRevenueCodes(
  mappings: AccountMappingData[],
  chartRevenueCodes: string[],
  standardLinkCodes?: StandardLinkCode[],
): { accountNumbers: string[]; matchedRevenueLinkCodes: string[] } {
  if (!chartRevenueCodes.length) return { accountNumbers: [], matchedRevenueLinkCodes: [] }
  const accounts = new Set<string>()
  const matchedRevenueCodes = new Set<string>()
  for (const m of mappings) {
    if (!m.variable_costs || !m.variable_cost_revenue_link_code) continue
    if (
      revenueLinkMatchesChartCodes(chartRevenueCodes, m.variable_cost_revenue_link_code, standardLinkCodes)
    ) {
      accounts.add(m.account_number)
      matchedRevenueCodes.add(m.variable_cost_revenue_link_code.trim())
    }
  }
  return {
    accountNumbers: [...accounts],
    matchedRevenueLinkCodes: [...matchedRevenueCodes].sort(),
  }
}

function sumAccountDetailAmounts(
  mappingsByAccount: Map<string, AccountMappingData>,
  accountNumbers: string[],
  rows: SeriesRow[],
  periods: SeriesPeriod[],
): number[] {
  const totals = periods.map(() => 0)
  const linkCodeAttributed = new Set<string>()

  for (const accountNumber of accountNumbers) {
    const mapping = mappingsByAccount.get(accountNumber)
    let row = findSeriesRowByCode(rows, accountNumber)
    if (!row && mapping?.link_code) {
      const linkCode = mapping.link_code.trim()
      if (!linkCodeAttributed.has(linkCode)) {
        row = findSeriesRowByCode(rows, linkCode)
        if (row) linkCodeAttributed.add(linkCode)
      }
    }
    if (!row) continue
    const amounts = getRowAmounts(row, periods)
    for (let i = 0; i < periods.length; i++) {
      totals[i]! += Math.abs(amounts[i] ?? 0)
    }
  }
  return totals
}

function resolveVariableCostAccountLabel(
  accountNumber: string,
  mappingsByAccount: Map<string, AccountMappingData>,
  rows: SeriesRow[],
): string {
  const mapping = mappingsByAccount.get(accountNumber)
  const description = mapping?.description?.trim()
  if (description) return description
  const row = findSeriesRowByCode(rows, accountNumber)
  if (row?.label?.trim()) return row.label.trim()
  return accountNumber
}

function variableCostTrendForAccounts(
  mappings: AccountMappingData[],
  accountNumbers: string[],
  rows: SeriesRow[],
  periods: SeriesPeriod[],
  view: string,
  refMonth: number,
  refYear: number,
): number[] | null {
  if (!accountNumbers.length || !periods.length) return null
  const mappingsByAccount = new Map(mappings.map((m) => [m.account_number, m]))
  const monthly = sumAccountDetailAmounts(mappingsByAccount, accountNumbers, rows, periods)
  const synthetic = buildSyntheticSeriesRow(periods, monthly)
  if (view === "years") {
    return yearTrendFromReference(synthetic, periods, refYear, PERFORMANCE_CHART_YEAR_COUNT)
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

function chartPeriodLabelsForView(view: string, refMonth: number, refYear: number): string[] {
  if (view === "years") return yearLabelsFromReference(refYear, PERFORMANCE_CHART_YEAR_COUNT)
  if (view === "24months") {
    return monthShortLabelsFromReference(refMonth, refYear, PERFORMANCE_CHART_MONTH_COUNT_24)
  }
  return []
}

export type RevenueBreakdownTarget = {
  id: string
  label: string
  kind: "link-code" | "gl-account"
}

function labelForLinkCode(
  code: string,
  seriesRows: SeriesRow[],
  standardLinkCodes?: StandardLinkCode[],
): string {
  const std = standardLinkCodes?.find((c) => c.code === code)
  if (std) return standardLinkCodeDisplayLabel(std)
  const row = findSeriesRowByCode(seriesRows, code)
  if (row?.label?.trim()) return row.label.trim()
  return code
}

function glRevenueBreakdownTargets(
  code: string,
  seriesRows: SeriesRow[],
): RevenueBreakdownTarget[] {
  const row = findSeriesRowByCode(seriesRows, code)
  if (!row?.detailRows?.length) return []
  return row.detailRows.map((dr) => ({
    id: dr.id,
    label: dr.label.trim() || dr.id,
    kind: "gl-account" as const,
  }))
}

/** Sous-lignes de revenus : enfants REV du plan comptable, comptes GL ou codes sommés. */
export function resolveRevenueBreakdownTargets(
  spec: ChartMetricSpec,
  seriesRows: SeriesRow[],
  standardLinkCodes?: StandardLinkCode[],
): RevenueBreakdownTarget[] {
  if (spec.type === "difference" || spec.type === "ratio" || spec.type === "derivedMargin") {
    return []
  }

  const topCodes = extractLinkCodesFromMetricSpec(spec)
  if (!topCodes.length) return []

  const targets: RevenueBreakdownTarget[] = []
  const seen = new Set<string>()

  const pushTarget = (target: RevenueBreakdownTarget) => {
    if (seen.has(target.id)) return
    seen.add(target.id)
    targets.push(target)
  }

  for (const code of topCodes) {
    if (standardLinkCodes?.length) {
      const subLines = getDetailSubLineCodesFromStandardLinkCode(code, standardLinkCodes)
      if (subLines.length > 0) {
        for (const subLine of subLines) {
          pushTarget({
            id: subLine.code,
            label: standardLinkCodeDisplayLabel(subLine),
            kind: "link-code",
          })
        }
        continue
      }
    }

    const glLines = glRevenueBreakdownTargets(code, seriesRows)
    if (glLines.length > 0) {
      for (const line of glLines) pushTarget(line)
      continue
    }

    if (spec.type === "sum" && topCodes.length > 1) {
      pushTarget({
        id: code,
        label: labelForLinkCode(code, seriesRows, standardLinkCodes),
        kind: "link-code",
      })
    }
  }

  return targets
}

function revenueTrendForTarget(
  target: RevenueBreakdownTarget,
  seriesRows: SeriesRow[],
  periods: SeriesPeriod[],
  view: string,
  refMonth: number,
  refYear: number,
): number[] | null {
  const vals = computeMetricSeries({ type: "single", code: target.id }, seriesRows, periods)
  if (!vals || vals.length !== periods.length) return null
  const synthetic = buildSyntheticSeriesRow(periods, vals)
  if (view === "years") {
    return yearTrendFromReference(synthetic, periods, refYear, PERFORMANCE_CHART_YEAR_COUNT)
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

function buildRevenueComponentBreakdowns(
  spec: ChartMetricSpec,
  seriesRows: SeriesRow[],
  periods: SeriesPeriod[],
  view: string,
  refMonth: number,
  refYear: number,
  slicePoints: RevenueSeriesNarrativeSlice["points"],
  standardLinkCodes?: StandardLinkCode[],
): RevenueComponentBreakdown[] | undefined {
  const targets = resolveRevenueBreakdownTargets(spec, seriesRows, standardLinkCodes)
  if (targets.length === 0 || !slicePoints.length) return undefined

  const labels = chartPeriodLabelsForView(view, refMonth, refYear)
  if (!labels.length) return undefined

  const breakdowns: RevenueComponentBreakdown[] = []
  for (const target of targets) {
    const trend = revenueTrendForTarget(target, seriesRows, periods, view, refMonth, refYear)
    if (!trend || trend.length !== labels.length) continue
    const amountByPeriod = new Map(labels.map((label, i) => [label, trend[i] ?? 0]))
    breakdowns.push({
      id: target.id,
      label: target.label,
      kind: target.kind,
      amounts: slicePoints.map((point) => amountByPeriod.get(point.period) ?? 0),
    })
  }

  if (!breakdowns.length) return undefined
  return breakdowns.sort((a, b) => (b.amounts[0] ?? 0) - (a.amounts[0] ?? 0))
}

function buildVariableCostAccountBreakdowns(
  mappings: AccountMappingData[],
  accountNumbers: string[],
  seriesRows: SeriesRow[],
  periods: SeriesPeriod[],
  view: string,
  refMonth: number,
  refYear: number,
  slicePoints: RevenueSeriesNarrativeSlice["points"],
): VariableCostAccountBreakdown[] | undefined {
  if (!accountNumbers.length || !slicePoints.length) return undefined

  const labels = chartPeriodLabelsForView(view, refMonth, refYear)
  if (!labels.length) return undefined

  const mappingsByAccount = new Map(mappings.map((m) => [m.account_number, m]))
  const breakdowns: VariableCostAccountBreakdown[] = []

  for (const accountNumber of accountNumbers) {
    const trend = variableCostTrendForAccounts(
      mappings,
      [accountNumber],
      seriesRows,
      periods,
      view,
      refMonth,
      refYear,
    )
    if (!trend || trend.length !== labels.length) continue

    const costByPeriod = new Map(labels.map((label, i) => [label, trend[i] ?? 0]))
    const amounts = slicePoints.map((point) => costByPeriod.get(point.period) ?? 0)
    breakdowns.push({
      accountNumber,
      label: resolveVariableCostAccountLabel(accountNumber, mappingsByAccount, seriesRows),
      amounts,
    })
  }

  if (!breakdowns.length) return undefined

  return breakdowns.sort((a, b) => (b.amounts[0] ?? 0) - (a.amounts[0] ?? 0))
}

export type RevenueSeriesEnrichmentMeta = {
  revenueLinkCodes: string[]
  variableCostAccountNumbers: string[]
  matchedRevenueLinkCodes: string[]
  resolvedTargetLinkCodes: string[]
}

export function buildRevenueSeriesEnrichmentMeta(
  chartSeries: StatementChartSeries[],
  seriesMeta: BuiltSeriesMeta[],
  mappings: AccountMappingData[],
  standardLinkCodes?: StandardLinkCode[],
): Map<string, RevenueSeriesEnrichmentMeta> {
  const out = new Map<string, RevenueSeriesEnrichmentMeta>()
  for (const meta of seriesMeta) {
    if (meta.kind !== "bar" || meta.valueFormat !== "currency") continue
    const config = chartSeries.find((s) => s.id === meta.id)
    if (!config) continue
    const revenueLinkCodes = extractLinkCodesFromMetricSpec(config.spec)
    const { accountNumbers, matchedRevenueLinkCodes } = collectVariableCostAccountsForRevenueCodes(
      mappings,
      revenueLinkCodes,
      standardLinkCodes,
    )
    out.set(meta.id, {
      revenueLinkCodes,
      variableCostAccountNumbers: accountNumbers,
      matchedRevenueLinkCodes,
      resolvedTargetLinkCodes: [...resolveRevenueTargetLinkCodes(revenueLinkCodes, standardLinkCodes)].sort(),
    })
  }
  return out
}

export function enrichRevenueSeriesForNarrative(params: {
  slices: RevenueSeriesNarrativeSlice[]
  seriesMeta: BuiltSeriesMeta[]
  chartSeries: StatementChartSeries[]
  mappings: AccountMappingData[]
  seriesRows: SeriesRow[]
  periods: SeriesPeriod[]
  view: string
  refMonth: number
  refYear: number
  standardLinkCodes?: StandardLinkCode[]
}): RevenueSeriesNarrativeSlice[] {
  const {
    slices,
    seriesMeta,
    chartSeries,
    mappings,
    seriesRows,
    periods,
    view,
    refMonth,
    refYear,
    standardLinkCodes,
  } = params
  if (!slices.length) return slices

  const enrichmentMeta = buildRevenueSeriesEnrichmentMeta(
    chartSeries,
    seriesMeta,
    mappings,
    standardLinkCodes,
  )
  const currencyBars = seriesMeta.filter((m) => m.kind === "bar" && m.valueFormat === "currency")

  return slices.map((slice, index) => {
    const bar = currencyBars[index]
    if (!bar) return slice
    const config = chartSeries.find((s) => s.id === bar.id)
    const meta = enrichmentMeta.get(bar.id)
    const revenueComponents =
      config && slice.points.length
        ? buildRevenueComponentBreakdowns(
            config.spec,
            seriesRows,
            periods,
            view,
            refMonth,
            refYear,
            slice.points,
            standardLinkCodes,
          )
        : undefined

    const baseSlice: RevenueSeriesNarrativeSlice = {
      ...slice,
      revenueComponents,
      resolvedRevenueLinkCodes: meta?.resolvedTargetLinkCodes,
    }

    if (!meta) {
      return { ...baseSlice, variableCostMapped: false, variableCostAccountCount: 0 }
    }

    const hasVariableCostMapping = meta.matchedRevenueLinkCodes.length > 0
    if (!hasVariableCostMapping) {
      return {
        ...baseSlice,
        variableCostMapped: false,
        variableCostAccountCount: 0,
        matchedRevenueLinkCodes: [],
      }
    }

    if (!meta.variableCostAccountNumbers.length) {
      return {
        ...baseSlice,
        variableCostMapped: true,
        variableCostAccountCount: 0,
        matchedRevenueLinkCodes: meta.matchedRevenueLinkCodes,
      }
    }

    const trend = variableCostTrendForAccounts(
      mappings,
      meta.variableCostAccountNumbers,
      seriesRows,
      periods,
      view,
      refMonth,
      refYear,
    )
    const labels = chartPeriodLabelsForView(view, refMonth, refYear)
    if (!trend || trend.length !== labels.length) {
      return {
        ...baseSlice,
        variableCostMapped: true,
        variableCostAccountCount: meta.variableCostAccountNumbers.length,
        matchedRevenueLinkCodes: meta.matchedRevenueLinkCodes,
      }
    }

    const costByPeriod = new Map(labels.map((label, i) => [label, trend[i] ?? 0]))
    const points = slice.points.map((p) => {
      const variableCost = costByPeriod.get(p.period) ?? 0
      const revenue = p.revenue
      const grossProfit = revenue - variableCost
      const grossMarginPercent =
        Math.abs(revenue) > DATA_EPSILON ? (grossProfit / revenue) * 100 : 0
      return {
        ...p,
        grossProfit,
        grossMarginPercent,
        variableCost,
      }
    })
    const variableCostAccounts = buildVariableCostAccountBreakdowns(
      mappings,
      meta.variableCostAccountNumbers,
      seriesRows,
      periods,
      view,
      refMonth,
      refYear,
      points,
    )

    return {
      ...baseSlice,
      points,
      variableCostMapped: true,
      variableCostAccountCount: meta.variableCostAccountNumbers.length,
      variableCostAccounts,
      matchedRevenueLinkCodes: meta.matchedRevenueLinkCodes,
    }
  })
}
