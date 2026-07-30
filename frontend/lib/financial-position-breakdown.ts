import type {
  AccountMappingData,
  SeriesDetailRow,
  SeriesPeriod,
  SeriesRow,
  StandardLinkCode,
} from "@/lib/api"
import {
  BALANCE_POSITION_FAMILIES,
  type BalancePositionFamily,
  type FinancialPositionResult,
  familyHeading,
  findFamilySeriesRow,
} from "@/lib/financial-position"
import { FINANCIAL_POSITION_SERIES_ID_TO_FAMILY } from "@/lib/financial-position-config"
import {
  buildSyntheticSeriesRow,
  findSeriesRowByCode,
  isChartMetricSpecConfigured,
  PERFORMANCE_CHART_MONTH_COUNT_24,
  PERFORMANCE_CHART_YEAR_COUNT,
} from "@/lib/performance-chart-series"
import type {
  ContributiveMarginEvolutionDetailRow,
  ContributiveMarginEvolutionTable,
} from "@/lib/revenue-contributive-margin-evolution"
import type { ChartMetricSpec, StatementChartConfig } from "@/lib/statement-chart-config"
import {
  deriveLinkCodeFamily,
  isBalanceSheetFamily,
  mappingDetailFromLinkCode,
  mappingParentCodeFromLinkCode,
  standardLinkCodeDisplayLabel,
  type StandardLinkCodeLookup,
} from "@/lib/standard-link-code-utils"
import { getRowAmounts } from "@/lib/series-utils"
import {
  balanceSheetYearTrendFromReference,
  monthTrendFromReference,
} from "@/lib/series-reference-columns"

const MONTHLY_EVOLUTION_COUNT = 24
const AMOUNT_EPSILON = 1e-6
const MAPPING_DERIVED_EMPTY = "—"

function buildStandardLinkCodeLookup(codes: StandardLinkCode[] | undefined): StandardLinkCodeLookup {
  return new Map((codes ?? []).map((code) => [code.code, code]))
}

function evolutionPointIndices(pointCount: number, view: string): number[] {
  const windowSize = view === "years" ? pointCount : Math.min(MONTHLY_EVOLUTION_COUNT, pointCount)
  if (windowSize <= 0) return []
  return Array.from({ length: windowSize }, (_, i) => i)
}

function detailRowToSeriesRow(detail: SeriesDetailRow): SeriesRow {
  return {
    id: detail.id,
    label: detail.label,
    isBold: false,
    isSection: false,
    isResult: false,
    amounts: detail.amounts,
    detailRows: [],
  }
}

function seriesRowBalanceTrend(
  row: SeriesRow,
  periods: SeriesPeriod[],
  view: string,
  refMonth: number,
  refYear: number,
): number[] | null {
  if (!periods.length) return null
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

function balanceDetailTrend(
  detail: SeriesDetailRow,
  periods: SeriesPeriod[],
  view: string,
  refMonth: number,
  refYear: number,
): number[] | null {
  return seriesRowBalanceTrend(detailRowToSeriesRow(detail), periods, view, refMonth, refYear)
}

function sumNullableSeries(a: (number | null)[], b: (number | null)[]): (number | null)[] {
  return a.map((value, index) => {
    const other = b[index]
    if (value === null && other === null) return null
    return (value ?? 0) + (other ?? 0)
  })
}

function resolveAccountLabel(
  accountNumber: string,
  detail: SeriesDetailRow,
  mappingsByAccount: Map<string, AccountMappingData>,
): string {
  const description = mappingsByAccount.get(accountNumber)?.description?.trim()
  if (description) return description
  if (detail.label?.trim()) return detail.label.trim()
  return accountNumber
}

function rowHasVisibleAmounts(values: (number | null)[], windowSize: number): boolean {
  return values.slice(0, windowSize).some((value) => value !== null && Math.abs(value) > AMOUNT_EPSILON)
}

function filterZeroDetailRow(
  row: ContributiveMarginEvolutionDetailRow,
  windowSize: number,
): ContributiveMarginEvolutionDetailRow | null {
  const detailRows = (row.detailRows ?? [])
    .map((child) => filterZeroDetailRow(child, windowSize))
    .filter((child): child is ContributiveMarginEvolutionDetailRow => child !== null)

  if (!rowHasVisibleAmounts(row.values, windowSize) && !detailRows.length) return null

  return {
    ...row,
    detailRows: detailRows.length ? detailRows : undefined,
  }
}

function resolveBalanceSheetPosteCode(linkCode: string, codeByCode: StandardLinkCodeLookup): string {
  const lc = linkCode.trim()
  if (!lc) return lc

  const row = codeByCode.get(lc)
  if (row) {
    if (!row.is_leaf) return lc
    const parent = row.parent_code?.trim()
    if (parent && isBalanceSheetFamily(parent)) return lc
    if (parent) return parent
    return lc
  }

  const parent = mappingParentCodeFromLinkCode(lc, codeByCode)
  if (parent !== MAPPING_DERIVED_EMPTY) return parent

  const dotMatch = lc.match(/^(.+)\.(\d+)$/)
  if (dotMatch?.[1]) return dotMatch[1]

  return lc
}

function mappingBelongsToPoste(
  linkCode: string,
  posteCode: string,
  codeByCode: StandardLinkCodeLookup,
): boolean {
  const lc = linkCode.trim()
  const poste = posteCode.trim()
  if (!lc || !poste) return false
  if (lc === poste) return true
  if (lc.startsWith(`${poste}.`) || lc.startsWith(`${poste}-`)) return true

  let current: string | undefined = lc
  const visited = new Set<string>()
  while (current && !visited.has(current)) {
    visited.add(current)
    if (current === poste) return true
    current = codeByCode.get(current)?.parent_code?.trim()
  }

  return false
}

function posteCodesForFamily(
  family: BalancePositionFamily,
  familyRow: SeriesRow | undefined,
  mappings: AccountMappingData[],
  codeByCode: StandardLinkCodeLookup,
): string[] {
  const postes = new Set<string>()

  for (const row of codeByCode.values()) {
    if (row.family !== family) continue
    if (row.parent_code?.trim() === family && !row.is_leaf) postes.add(row.code)
  }

  if (!postes.size) {
    for (const leaf of discoverFamilyLinkCodes(family, familyRow, mappings)) {
      postes.add(resolveBalanceSheetPosteCode(leaf, codeByCode))
    }
  }

  return [...postes].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }))
}

function resolveBreakdownPosteCodes(params: {
  configuredCodes: string[]
  family: BalancePositionFamily
  familyRow: SeriesRow | undefined
  mappings: AccountMappingData[]
  codeByCode: StandardLinkCodeLookup
}): string[] {
  const { configuredCodes, family, familyRow, mappings, codeByCode } = params

  if (!configuredCodes.length) {
    return posteCodesForFamily(family, familyRow, mappings, codeByCode)
  }

  const resolved = new Set<string>()
  for (const code of configuredCodes) {
    const trimmed = code.trim()
    const normalized = trimmed.toUpperCase()
    if (normalized === family || BALANCE_POSITION_FAMILIES.includes(normalized as BalancePositionFamily)) {
      for (const poste of posteCodesForFamily(family, familyRow, mappings, codeByCode)) {
        resolved.add(poste)
      }
      continue
    }

    const row = codeByCode.get(trimmed)
    if (row && !row.is_leaf) {
      resolved.add(trimmed)
      continue
    }

    resolved.add(resolveBalanceSheetPosteCode(trimmed, codeByCode))
  }

  return [...resolved].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }))
}

function resolvePosteLabel(posteCode: string, codeByCode: StandardLinkCodeLookup): string {
  const row = codeByCode.get(posteCode.trim())
  if (row) return standardLinkCodeDisplayLabel(row)
  const detail = mappingDetailFromLinkCode(posteCode, codeByCode)
  return detail !== MAPPING_DERIVED_EMPTY ? detail : posteCode
}

function findGlDetailInSeries(accountNumber: string, rows: SeriesRow[]): SeriesDetailRow | undefined {
  const topLevel = rows.find((row) => row.id === accountNumber)
  if (topLevel) {
    return { id: topLevel.id, label: topLevel.label, amounts: topLevel.amounts ?? {} }
  }

  for (const row of rows) {
    const detail = row.detailRows?.find((child) => child.id?.trim() === accountNumber)
    if (detail) return detail
  }

  return undefined
}

function extractCodesFromMetricSpec(spec: ChartMetricSpec): string[] {
  if (spec.type === "single") {
    const code = spec.code.trim()
    return code ? [code] : []
  }
  if (spec.type === "sum") {
    return [...new Set(spec.codes.map((code) => code.trim()).filter(Boolean))]
  }
  if (spec.type === "difference") {
    return [
      ...new Set(
        [...spec.numeratorCodes, ...spec.denominatorCodes].map((code) => code.trim()).filter(Boolean),
      ),
    ]
  }
  if (spec.type === "ratio") {
    return [
      ...new Set(
        [...spec.numeratorCodes, ...spec.denominatorCodes].map((code) => code.trim()).filter(Boolean),
      ),
    ]
  }
  return []
}

export function configuredLinkCodesForFamily(
  family: BalancePositionFamily,
  chartConfig: StatementChartConfig | undefined,
): string[] {
  const series = chartConfig?.series.find(
    (configured) => FINANCIAL_POSITION_SERIES_ID_TO_FAMILY[configured.id] === family,
  )
  if (!series || !isChartMetricSpecConfigured(series.spec)) return []
  return extractCodesFromMetricSpec(series.spec)
}

function collectSeriesDetailsForPoste(
  posteCode: string,
  rows: SeriesRow[],
  codeByCode: StandardLinkCodeLookup,
): SeriesDetailRow[] {
  const details: SeriesDetailRow[] = []
  const seen = new Set<string>()

  const consider = (detail: SeriesDetailRow) => {
    const id = detail.id?.trim()
    if (!id || seen.has(id)) return
    const codeRow = codeByCode.get(id)
    if (codeRow?.is_leaf && mappingBelongsToPoste(id, posteCode, codeByCode)) {
      seen.add(id)
      details.push(detail)
    }
  }

  const walk = (seriesRows: SeriesRow[]) => {
    for (const row of seriesRows) {
      for (const detail of row.detailRows ?? []) {
        consider(detail)
      }
    }
  }

  walk(rows)
  return details
}

function isGlAccountDetailId(id: string, codeByCode: StandardLinkCodeLookup): boolean {
  if (codeByCode.has(id)) return false
  return /^\d/.test(id)
}

function posteTrendFromSeries(
  posteCode: string,
  rows: SeriesRow[],
  periods: SeriesPeriod[],
  view: string,
  refMonth: number,
  refYear: number,
  windowSize: number,
  codeByCode: StandardLinkCodeLookup,
): number[] | null {
  const posteRow = findSeriesRowByCode(rows, posteCode)
  if (posteRow) {
    const trend = seriesRowBalanceTrend(posteRow, periods, view, refMonth, refYear)
    if (trend && trend.length >= windowSize) return trend
  }

  const leafDetails = collectSeriesDetailsForPoste(posteCode, rows, codeByCode)
  const leafTrends = leafDetails
    .map((detail) => balanceDetailTrend(detail, periods, view, refMonth, refYear))
    .filter((trend): trend is number[] => Boolean(trend && trend.length >= windowSize))

  if (!leafTrends.length) return null

  return leafTrends.reduce(
    (acc, trend) => sumNullableSeries(acc, trend),
    leafTrends[0]!.map(() => 0 as number | null),
  )
}

function resolveLeafLinkCodeLabel(linkCode: string, codeByCode: StandardLinkCodeLookup): string {
  const row = codeByCode.get(linkCode.trim())
  if (row) return standardLinkCodeDisplayLabel(row)
  const detail = mappingDetailFromLinkCode(linkCode, codeByCode)
  return detail !== MAPPING_DERIVED_EMPTY ? detail : linkCode
}

function leafLinkCodesUnderPoste(
  posteCode: string,
  rows: SeriesRow[],
  mappings: AccountMappingData[],
  codeByCode: StandardLinkCodeLookup,
): string[] {
  const leaves = new Set<string>()
  const poste = posteCode.trim()

  for (const row of codeByCode.values()) {
    if (row.parent_code?.trim() === poste && row.is_leaf) leaves.add(row.code)
  }

  for (const mapping of mappings) {
    const linkCode = mapping.link_code?.trim()
    if (!linkCode || linkCode === poste) continue
    if (!mappingBelongsToPoste(linkCode, poste, codeByCode)) continue
    if (resolveBalanceSheetPosteCode(linkCode, codeByCode) !== poste) continue
    leaves.add(linkCode)
  }

  for (const detail of collectSeriesDetailsForPoste(poste, rows, codeByCode)) {
    const id = detail.id?.trim()
    if (id) leaves.add(id)
  }

  return [...leaves].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }))
}

function leafLinkCodeTrendFromSeries(
  linkCode: string,
  rows: SeriesRow[],
  periods: SeriesPeriod[],
  view: string,
  refMonth: number,
  refYear: number,
  windowSize: number,
): number[] | null {
  const linkRow = findSeriesRowByCode(rows, linkCode)
  if (linkRow) {
    const trend = seriesRowBalanceTrend(linkRow, periods, view, refMonth, refYear)
    if (trend && trend.length >= windowSize) return trend
  }

  for (const row of rows) {
    const detail = row.detailRows?.find((child) => child.id?.trim() === linkCode)
    if (!detail) continue
    const trend = balanceDetailTrend(detail, periods, view, refMonth, refYear)
    if (trend && trend.length >= windowSize) return trend
  }

  return null
}

function buildGlDetailRow(params: {
  accountNumber: string
  detail: SeriesDetailRow
  mappingsByAccount: Map<string, AccountMappingData>
  periods: SeriesPeriod[]
  view: string
  refMonth: number
  refYear: number
  windowSize: number
}): ContributiveMarginEvolutionDetailRow | null {
  const { accountNumber, detail, mappingsByAccount, periods, view, refMonth, refYear, windowSize } =
    params
  const trend = balanceDetailTrend(detail, periods, view, refMonth, refYear)
  if (!trend || trend.length < windowSize) return null

  return {
    id: accountNumber,
    label: resolveAccountLabel(accountNumber, detail, mappingsByAccount),
    displayKind: "gl-account",
    values: trend.slice(0, windowSize),
  }
}

function buildGlRowsUnderLeafLinkCode(params: {
  linkCode: string
  rows: SeriesRow[]
  mappings: AccountMappingData[]
  mappingsByAccount: Map<string, AccountMappingData>
  periods: SeriesPeriod[]
  view: string
  refMonth: number
  refYear: number
  windowSize: number
  codeByCode: StandardLinkCodeLookup
}): ContributiveMarginEvolutionDetailRow[] {
  const {
    linkCode,
    rows,
    mappings,
    mappingsByAccount,
    periods,
    view,
    refMonth,
    refYear,
    windowSize,
    codeByCode,
  } = params

  const leafRow = findSeriesRowByCode(rows, linkCode)
  const glRows: ContributiveMarginEvolutionDetailRow[] = []
  const seenAccounts = new Set<string>()

  for (const detail of leafRow?.detailRows ?? []) {
    const accountNumber = detail.id?.trim()
    if (!accountNumber || seenAccounts.has(accountNumber)) continue
    if (!isGlAccountDetailId(accountNumber, codeByCode)) continue

    const glRow = buildGlDetailRow({
      accountNumber,
      detail,
      mappingsByAccount,
      periods,
      view,
      refMonth,
      refYear,
      windowSize,
    })
    if (glRow && rowHasVisibleAmounts(glRow.values, windowSize)) {
      seenAccounts.add(accountNumber)
      glRows.push(glRow)
    }
  }

  const accountNumbers = [
    ...new Set(
      mappings
        .filter((mapping) => mapping.link_code?.trim() === linkCode)
        .map((mapping) => mapping.account_number),
    ),
  ].sort()

  for (const accountNumber of accountNumbers) {
    if (seenAccounts.has(accountNumber)) continue

    const detail = findGlDetailInSeries(accountNumber, rows)
    if (detail) {
      const glRow = buildGlDetailRow({
        accountNumber,
        detail,
        mappingsByAccount,
        periods,
        view,
        refMonth,
        refYear,
        windowSize,
      })
      if (glRow && rowHasVisibleAmounts(glRow.values, windowSize)) {
        seenAccounts.add(accountNumber)
        glRows.push(glRow)
      }
      continue
    }

    const seriesRow = rows.find((row) => row.id === accountNumber)
    if (!seriesRow) continue
    const monthly = getRowAmounts(seriesRow, periods)
    const synthetic = buildSyntheticSeriesRow(periods, monthly)
    const trend = seriesRowBalanceTrend(synthetic, periods, view, refMonth, refYear)
    if (!trend || trend.length < windowSize || !rowHasVisibleAmounts(trend, windowSize)) continue
    seenAccounts.add(accountNumber)
    glRows.push({
      id: accountNumber,
      label: resolveAccountLabel(
        accountNumber,
        { id: accountNumber, label: seriesRow.label, amounts: {} },
        mappingsByAccount,
      ),
      displayKind: "gl-account",
      values: trend.slice(0, windowSize),
    })
  }

  return glRows.sort((a, b) => {
    const aLatest = a.values[0] ?? 0
    const bLatest = b.values[0] ?? 0
    return (bLatest as number) - (aLatest as number)
  })
}

function buildLeafLinkCodeDetailRow(params: {
  linkCode: string
  rows: SeriesRow[]
  mappings: AccountMappingData[]
  mappingsByAccount: Map<string, AccountMappingData>
  periods: SeriesPeriod[]
  view: string
  refMonth: number
  refYear: number
  windowSize: number
  codeByCode: StandardLinkCodeLookup
}): ContributiveMarginEvolutionDetailRow | null {
  const {
    linkCode,
    rows,
    mappings,
    mappingsByAccount,
    periods,
    view,
    refMonth,
    refYear,
    windowSize,
    codeByCode,
  } = params

  const glChildren = buildGlRowsUnderLeafLinkCode({
    linkCode,
    rows,
    mappings,
    mappingsByAccount,
    periods,
    view,
    refMonth,
    refYear,
    windowSize,
    codeByCode,
  })

  let trend = leafLinkCodeTrendFromSeries(
    linkCode,
    rows,
    periods,
    view,
    refMonth,
    refYear,
    windowSize,
  )

  if (!trend && glChildren.length) {
    trend = glChildren.reduce(
      (acc, child) => sumNullableSeries(acc, child.values),
      glChildren[0]!.values.map(() => 0 as number | null),
    )
  }

  if (!trend || trend.length < windowSize || !rowHasVisibleAmounts(trend, windowSize)) return null

  return {
    id: linkCode,
    label: resolveLeafLinkCodeLabel(linkCode, codeByCode),
    displayKind: "link-code",
    values: trend.slice(0, windowSize),
    detailRows: glChildren.length ? glChildren : undefined,
  }
}

function buildLeafLinkCodeRowsUnderPoste(params: {
  posteCode: string
  rows: SeriesRow[]
  mappings: AccountMappingData[]
  mappingsByAccount: Map<string, AccountMappingData>
  periods: SeriesPeriod[]
  view: string
  refMonth: number
  refYear: number
  windowSize: number
  codeByCode: StandardLinkCodeLookup
}): ContributiveMarginEvolutionDetailRow[] {
  const leafCodes = leafLinkCodesUnderPoste(
    params.posteCode,
    params.rows,
    params.mappings,
    params.codeByCode,
  )

  return leafCodes
    .map((linkCode) => buildLeafLinkCodeDetailRow({ ...params, linkCode }))
    .map((row) => (row ? filterZeroDetailRow(row, params.windowSize) : null))
    .filter((row): row is ContributiveMarginEvolutionDetailRow => row !== null)
    .sort((a, b) => {
      const aLatest = a.values[0] ?? 0
      const bLatest = b.values[0] ?? 0
      return (bLatest as number) - (aLatest as number)
    })
}

/** Repli : comptes GL rattachés directement au poste sans sous-code feuille. */
function buildGlRowsUnderPoste(params: {
  posteCode: string
  rows: SeriesRow[]
  mappings: AccountMappingData[]
  mappingsByAccount: Map<string, AccountMappingData>
  periods: SeriesPeriod[]
  view: string
  refMonth: number
  refYear: number
  windowSize: number
  codeByCode: StandardLinkCodeLookup
}): ContributiveMarginEvolutionDetailRow[] {
  const {
    posteCode,
    rows,
    mappings,
    mappingsByAccount,
    periods,
    view,
    refMonth,
    refYear,
    windowSize,
    codeByCode,
  } = params

  const posteRow = findSeriesRowByCode(rows, posteCode)
  const glRows: ContributiveMarginEvolutionDetailRow[] = []
  const seenAccounts = new Set<string>()

  for (const detail of posteRow?.detailRows ?? []) {
    const accountNumber = detail.id?.trim()
    if (!accountNumber || seenAccounts.has(accountNumber)) continue
    if (!isGlAccountDetailId(accountNumber, codeByCode)) continue
    const mappingCode = mappingsByAccount.get(accountNumber)?.link_code?.trim()
    if (mappingCode && !mappingBelongsToPoste(mappingCode, posteCode, codeByCode)) continue

    const glRow = buildGlDetailRow({
      accountNumber,
      detail,
      mappingsByAccount,
      periods,
      view,
      refMonth,
      refYear,
      windowSize,
    })
    if (glRow && rowHasVisibleAmounts(glRow.values, windowSize)) {
      seenAccounts.add(accountNumber)
      glRows.push(glRow)
    }
  }

  const accountNumbers = [
    ...new Set(
      mappings
        .filter((mapping) => mappingBelongsToPoste(mapping.link_code ?? "", posteCode, codeByCode))
        .map((mapping) => mapping.account_number),
    ),
  ].sort()

  for (const accountNumber of accountNumbers) {
    if (seenAccounts.has(accountNumber)) continue

    const detail = findGlDetailInSeries(accountNumber, rows)
    if (detail) {
      const glRow = buildGlDetailRow({
        accountNumber,
        detail,
        mappingsByAccount,
        periods,
        view,
        refMonth,
        refYear,
        windowSize,
      })
      if (glRow && rowHasVisibleAmounts(glRow.values, windowSize)) {
        seenAccounts.add(accountNumber)
        glRows.push(glRow)
      }
      continue
    }

    const seriesRow = rows.find((row) => row.id === accountNumber)
    if (!seriesRow) continue
    const monthly = getRowAmounts(seriesRow, periods)
    const synthetic = buildSyntheticSeriesRow(periods, monthly)
    const trend = seriesRowBalanceTrend(synthetic, periods, view, refMonth, refYear)
    if (!trend || trend.length < windowSize || !rowHasVisibleAmounts(trend, windowSize)) continue
    seenAccounts.add(accountNumber)
    glRows.push({
      id: accountNumber,
      label: resolveAccountLabel(
        accountNumber,
        { id: accountNumber, label: seriesRow.label, amounts: {} },
        mappingsByAccount,
      ),
      displayKind: "gl-account",
      values: trend.slice(0, windowSize),
    })
  }

  return glRows.sort((a, b) => {
    const aLatest = a.values[0] ?? 0
    const bLatest = b.values[0] ?? 0
    return (bLatest as number) - (aLatest as number)
  })
}

function buildPosteDetailRow(params: {
  posteCode: string
  rows: SeriesRow[]
  mappings: AccountMappingData[]
  mappingsByAccount: Map<string, AccountMappingData>
  periods: SeriesPeriod[]
  view: string
  refMonth: number
  refYear: number
  windowSize: number
  codeByCode: StandardLinkCodeLookup
}): ContributiveMarginEvolutionDetailRow | null {
  const {
    posteCode,
    rows,
    mappings,
    mappingsByAccount,
    periods,
    view,
    refMonth,
    refYear,
    windowSize,
    codeByCode,
  } = params

  let trend = posteTrendFromSeries(
    posteCode,
    rows,
    periods,
    view,
    refMonth,
    refYear,
    windowSize,
    codeByCode,
  )

  const leafChildren = buildLeafLinkCodeRowsUnderPoste({
    posteCode,
    rows,
    mappings,
    mappingsByAccount,
    periods,
    view,
    refMonth,
    refYear,
    windowSize,
    codeByCode,
  })

  const glChildren =
    leafChildren.length > 0
      ? leafChildren
      : buildGlRowsUnderPoste({
          posteCode,
          rows,
          mappings,
          mappingsByAccount,
          periods,
          view,
          refMonth,
          refYear,
          windowSize,
          codeByCode,
        })

  if (!trend && glChildren.length) {
    trend = glChildren.reduce(
      (acc, child) => sumNullableSeries(acc, child.values),
      glChildren[0]!.values.map(() => 0 as number | null),
    )
  }

  if (!trend || trend.length < windowSize || !rowHasVisibleAmounts(trend, windowSize)) return null

  const displayLabel = resolvePosteLabel(posteCode, codeByCode)

  return {
    id: posteCode,
    label: displayLabel,
    displayKind: "link-code",
    values: trend.slice(0, windowSize),
    detailRows: glChildren.length ? glChildren : undefined,
  }
}

function discoverFamilyLinkCodes(
  family: BalancePositionFamily,
  familyRow: SeriesRow | undefined,
  mappings: AccountMappingData[],
): string[] {
  const codes = new Set<string>()

  for (const detail of familyRow?.detailRows ?? []) {
    const accountNumber = detail.id?.trim()
    if (!accountNumber) continue
    const linkCode = mappings.find((mapping) => mapping.account_number === accountNumber)?.link_code?.trim()
    if (linkCode) codes.add(linkCode)
  }

  if (!codes.size) {
    for (const mapping of mappings) {
      if (deriveLinkCodeFamily(mapping.link_code ?? "") !== family) continue
      const linkCode = mapping.link_code?.trim()
      if (linkCode) codes.add(linkCode)
    }
  }

  return [...codes].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }))
}

function buildFamilyDetailRowsFromPostes(params: {
  posteCodes: string[]
  rows: SeriesRow[]
  mappings: AccountMappingData[]
  mappingsByAccount: Map<string, AccountMappingData>
  periods: SeriesPeriod[]
  view: string
  refMonth: number
  refYear: number
  windowSize: number
  codeByCode: StandardLinkCodeLookup
}): ContributiveMarginEvolutionDetailRow[] {
  const rows = params.posteCodes
    .map((posteCode) => buildPosteDetailRow({ ...params, posteCode }))
    .map((row) => (row ? filterZeroDetailRow(row, params.windowSize) : null))
    .filter((row): row is ContributiveMarginEvolutionDetailRow => row !== null)

  return rows.sort((a, b) => {
    const aLatest = a.values[0] ?? 0
    const bLatest = b.values[0] ?? 0
    return (bLatest as number) - (aLatest as number)
  })
}

export function buildFinancialPositionBreakdownTable(params: {
  result: FinancialPositionResult
  family: BalancePositionFamily
  rows: SeriesRow[]
  periods: SeriesPeriod[]
  mappings: AccountMappingData[]
  structure?: Record<string, unknown>[]
  chartConfig?: StatementChartConfig
  view: string
  refMonth: number
  refYear: number
  standardLinkCodes?: StandardLinkCode[]
}): ContributiveMarginEvolutionTable | null {
  const {
    result,
    family,
    rows,
    periods,
    mappings,
    view,
    refMonth,
    refYear,
    standardLinkCodes,
    chartConfig,
  } = params
  if (!result.points.length || !rows.length || !periods.length) return null

  const orderedIndices = evolutionPointIndices(result.points.length, view)
  if (!orderedIndices.length) return null

  const mappingsByAccount = new Map(mappings.map((mapping) => [mapping.account_number, mapping]))
  const codeByCode = buildStandardLinkCodeLookup(standardLinkCodes)

  const configuredCodes = configuredLinkCodesForFamily(family, chartConfig)
  const familyRow = findFamilySeriesRow(rows, family, params.structure)
  const posteCodes = resolveBreakdownPosteCodes({
    configuredCodes,
    family,
    familyRow,
    mappings,
    codeByCode,
  })

  const familyKey = family.toLowerCase() as "act" | "alt" | "pct" | "plt" | "cap"
  const familyValues = orderedIndices.map((index) => result.points[index]![familyKey])
  const totalAssets = orderedIndices.map((index) => result.points[index]!.totalAssets)
  const totalLe = orderedIndices.map((index) => result.points[index]!.totalLiabilitiesEquity)

  const shareDenominator = BALANCE_POSITION_FAMILIES.slice(0, 2).includes(family) ? totalAssets : totalLe

  const sharePcts = orderedIndices.map((_, col) => {
    const value = familyValues[col]
    const denom = shareDenominator[col]!
    if (value === null || Math.abs(denom) <= 1e-6) return null
    return (value / denom) * 100
  })

  const windowSize = orderedIndices.length
  const detailRows = buildFamilyDetailRowsFromPostes({
    posteCodes,
    rows,
    mappings,
    mappingsByAccount,
    periods,
    view,
    refMonth,
    refYear,
    windowSize,
    codeByCode,
  })

  const periodLabels = orderedIndices.map((index) => result.points[index]!.period)

  return {
    sourceId: family,
    sourceLabel: familyHeading(family),
    periods: periodLabels,
    metrics: [
      {
        id: familyKey,
        label: "Montant",
        format: "currency",
        values: familyValues,
        detailRows: detailRows.length ? detailRows : undefined,
      },
      {
        id: `${familyKey}-share`,
        label: "Part du total",
        format: "percent",
        values: sharePcts,
      },
    ],
  }
}

export function buildFinancialPositionBreakdownTables(params: {
  result: FinancialPositionResult
  rows: SeriesRow[]
  periods: SeriesPeriod[]
  mappings: AccountMappingData[]
  structure?: Record<string, unknown>[]
  chartConfig?: StatementChartConfig
  view: string
  refMonth: number
  refYear: number
  standardLinkCodes?: StandardLinkCode[]
}): Map<string, ContributiveMarginEvolutionTable> {
  const tables = new Map<string, ContributiveMarginEvolutionTable>()

  for (const family of BALANCE_POSITION_FAMILIES) {
    const table = buildFinancialPositionBreakdownTable({ ...params, family })
    if (table) tables.set(familyHeading(family), table)
  }

  return tables
}
