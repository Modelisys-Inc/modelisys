import { useEffect, useMemo, useState } from "react"
import { getStatementStructure, listForecastConfigs, listStandardLinkCodesFlat } from "@/lib/api"
import { useProjectedRevenueYearTotals } from "@/hooks/use-projected-revenue-year-totals"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import type { ForecastActualLayout } from "@/lib/pro-forma-forecast-columns"
import {
  forecastBalanceSheetYearTrend,
  forecastProjectionOpeningFromActuals,
  resolveForecastActualLayout,
} from "@/lib/pro-forma-forecast-columns"
import {
  CAPEX_FORECAST_CONFIG_TYPE,
  parseCapexForecastConfig,
  resolveCapexDrivenBilanProjectedAmount,
  resolveCapexDrivenDepreciationExpense,
  type CapexAdjustment,
  type CapexBilanPeerRow,
  type CapexDepreciationMethod,
} from "@/lib/capex-forecast-resolve"
import { isCapexProjectionLinkCode } from "@/lib/standard-link-code-utils"
import {
  listStructureRowsForCapexDetailDisplay,
  syncDetailSubLinesFromStandard,
} from "@/lib/income-statement-structure-utils"
import { findRow, findSeriesRowOrDetail } from "@/lib/series-utils"
import type { SeriesPeriod, StandardLinkCode } from "@/lib/api"

function structureRowEffectiveLinkCode(sr: Record<string, unknown>): string {
  return String(sr.linkCode ?? "").trim()
}

/**
 * Même identité de poste que Hypothèses Capex (`mapStructureRowsToBalanceSheetDetailRows`) :
 * id série API en priorité, sinon linkCode / id structure.
 */
function resolveCapexPeerIdentity(
  sr: Record<string, unknown>,
  bookRows: { id: string; label: string; amounts?: Record<string, number>; detailRows?: unknown[] }[],
): { rowId: string; linkCode: string; label: string } | null {
  const linkCode = structureRowEffectiveLinkCode(sr)
  const structId = String(sr.id ?? "").trim()
  if (!isCapexProjectionLinkCode(linkCode) && !isCapexProjectionLinkCode(structId)) {
    return null
  }
  const seriesRow =
    (structId ? findSeriesRowOrDetail(bookRows, structId) : undefined) ??
    (linkCode ? findRow(bookRows, linkCode) : undefined) ??
    (linkCode ? findSeriesRowOrDetail(bookRows, linkCode) : undefined)
  const rowId =
    String(seriesRow?.id ?? "").trim() ||
    linkCode ||
    structId
  if (!rowId) return null
  return {
    rowId,
    linkCode: linkCode || rowId,
    label: String(sr.label ?? seriesRow?.label ?? "").trim(),
  }
}

export function useCapexForecastForBilan(opts: {
  companyId?: string | null
  projectionId?: string | null
  projectionYears: number
  fiscalYear?: number
  divisionId?: string | null
  subDivisionId?: string | null
  enabled?: boolean
  forecastActualLayout?: ForecastActualLayout
  refMonth?: number
  fiscalYearEndMonth?: number
}): {
  adjustments: Record<string, CapexAdjustment[]>
  depreciationRates: Record<string, number>
  depreciationMethods: Record<string, CapexDepreciationMethod>
  amortizationLinkCodes: Record<string, string>
  costByRowId: Record<string, number>
  peerRows: CapexBilanPeerRow[]
  projectedRevenueYearTotals: number[] | null
  configYearCount: number
  resolveProjectedAmount: (
    rowId: string,
    linkCode: string | null | undefined,
    configYearIndex: number,
    actualBase: number,
    peerRows: CapexBilanPeerRow[],
    opts?: { actualCostBase?: number; label?: string },
  ) => number
  resolveDepreciationExpense: (
    isLinkCode: string | null | undefined,
    configYearIndex: number,
  ) => number
  loading: boolean
} {
  const {
    companyId,
    projectionId,
    projectionYears,
    fiscalYear,
    divisionId,
    subDivisionId,
    enabled = true,
    forecastActualLayout = "single-prior-year",
    refMonth,
    fiscalYearEndMonth = 12,
  } = opts

  const [adjustments, setAdjustments] = useState<Record<string, CapexAdjustment[]>>({})
  const [depreciationRates, setDepreciationRates] = useState<Record<string, number>>({})
  const [depreciationMethods, setDepreciationMethods] = useState<
    Record<string, CapexDepreciationMethod>
  >({})
  const [amortizationLinkCodes, setAmortizationLinkCodes] = useState<Record<string, string>>({})
  const [configLoading, setConfigLoading] = useState(false)
  const [bsStructure, setBsStructure] = useState<Record<string, unknown>[]>([])
  const [standardLinkCodes, setStandardLinkCodes] = useState<StandardLinkCode[]>([])

  const { totals: projectedRevenueYearTotals, loading: revenueLoading } =
    useProjectedRevenueYearTotals({
      companyId,
      projectionId,
      projectionYears,
      fiscalYear,
      divisionId,
      subDivisionId,
      enabled,
      forecastActualLayout,
      refMonth,
      fiscalYearEndMonth,
    })

  const effectiveRefMonth = refMonth ?? 12
  const effectiveFiscalYear = fiscalYear ?? new Date().getFullYear()

  const { rows: costRows, periods: costPeriods, loading: costLoading } =
    useFinancialStatementSeries({
      companyId: companyId || null,
      statementType: "balance-sheet",
      fiscalYear: effectiveFiscalYear,
      month: effectiveRefMonth,
      months: 72,
      divisionId: divisionId || null,
      subDivisionId: subDivisionId || null,
      enabled: enabled && !!companyId,
      altAssetCostOnly: true,
    })

  const { rows: bookRows, periods: bookPeriods, loading: bookLoading } =
    useFinancialStatementSeries({
      companyId: companyId || null,
      statementType: "balance-sheet",
      fiscalYear: effectiveFiscalYear,
      month: effectiveRefMonth,
      months: 72,
      divisionId: divisionId || null,
      subDivisionId: subDivisionId || null,
      enabled: enabled && !!companyId,
    })

  const forecastActualLayoutEffective = resolveForecastActualLayout(
    forecastActualLayout,
    effectiveRefMonth,
    fiscalYearEndMonth,
  )

  const costByRowId = useMemo(() => {
    const out: Record<string, number> = {}
    if (!costRows.length || !costPeriods.length) return out
    for (const row of costRows) {
      const trend = forecastBalanceSheetYearTrend(
        forecastActualLayoutEffective,
        row,
        costPeriods,
        effectiveRefMonth,
        effectiveFiscalYear,
        fiscalYearEndMonth,
        projectionYears,
      )
      const opening = forecastProjectionOpeningFromActuals(trend, 0)
      if (row.id) out[row.id] = opening
      const lc = String((row as { linkCode?: string }).linkCode ?? "").trim()
      if (lc) out[lc] = opening
    }
    return out
  }, [
    costPeriods,
    costRows,
    effectiveFiscalYear,
    effectiveRefMonth,
    fiscalYearEndMonth,
    forecastActualLayoutEffective,
    projectionYears,
  ])

  useEffect(() => {
    if (!enabled || !companyId) {
      setBsStructure([])
      return
    }
    let cancelled = false
    getStatementStructure(companyId, "balance-sheet")
      .then((res) => {
        if (cancelled) return
        const raw = Array.isArray(res?.structure) ? res.structure : []
        setBsStructure(raw as Record<string, unknown>[])
      })
      .catch(() => {
        if (!cancelled) setBsStructure([])
      })
    return () => {
      cancelled = true
    }
  }, [companyId, enabled])

  useEffect(() => {
    if (!enabled || !companyId) {
      setStandardLinkCodes([])
      return
    }
    let cancelled = false
    listStandardLinkCodesFlat()
      .then((codes) => {
        if (!cancelled) setStandardLinkCodes(Array.isArray(codes) ? codes : [])
      })
      .catch(() => {
        if (!cancelled) setStandardLinkCodes([])
      })
    return () => {
      cancelled = true
    }
  }, [companyId, enabled])

  /** Même structure affichée que Hypothèses Capex (sous-lignes ALT-B.1… injectées). */
  const capexAlignedStructure = useMemo(() => {
    if (!bsStructure.length) return []
    if (!standardLinkCodes.length) return bsStructure
    return syncDetailSubLinesFromStandard(bsStructure, standardLinkCodes)
  }, [bsStructure, standardLinkCodes])

  useEffect(() => {
    if (!enabled || !companyId) {
      setAdjustments({})
      setDepreciationRates({})
      setDepreciationMethods({})
      setAmortizationLinkCodes({})
      setConfigLoading(false)
      return
    }
    let cancelled = false
    setConfigLoading(true)
    listForecastConfigs(companyId, {
      config_type: CAPEX_FORECAST_CONFIG_TYPE,
      projection_id: projectionId ?? undefined,
    })
      .then((cfgs) => {
        if (cancelled) return
        const parsed = parseCapexForecastConfig(cfgs[0]?.data ?? {})
        setAdjustments(parsed.capexAdjustments)
        setDepreciationRates(parsed.depreciationRates)
        setDepreciationMethods(parsed.depreciationMethods)
        setAmortizationLinkCodes(parsed.amortizationLinkCodes)
      })
      .catch(() => {
        if (!cancelled) {
          setAdjustments({})
          setDepreciationRates({})
          setDepreciationMethods({})
          setAmortizationLinkCodes({})
        }
      })
      .finally(() => {
        if (!cancelled) setConfigLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [companyId, enabled, projectionId])

  const configYearCount = projectionYears + 1

  const peerRows = useMemo((): CapexBilanPeerRow[] => {
    if (!capexAlignedStructure.length) return []
    const detailRows = listStructureRowsForCapexDetailDisplay(capexAlignedStructure)
    const peers: CapexBilanPeerRow[] = []
    const seen = new Set<string>()

    for (const sr of detailRows) {
      const identity = resolveCapexPeerIdentity(sr, bookRows)
      if (!identity) continue
      if (seen.has(identity.rowId)) continue
      seen.add(identity.rowId)

      const seriesRow =
        bookRows.length > 0
          ? findSeriesRowOrDetail(bookRows, identity.rowId) ?? findRow(bookRows, identity.linkCode)
          : undefined
      let actualBase = 0
      if (seriesRow && bookPeriods.length > 0) {
        const trend = forecastBalanceSheetYearTrend(
          forecastActualLayoutEffective,
          seriesRow,
          bookPeriods as SeriesPeriod[],
          effectiveRefMonth,
          effectiveFiscalYear,
          fiscalYearEndMonth,
          projectionYears,
        )
        actualBase = forecastProjectionOpeningFromActuals(trend, 0)
      }
      peers.push({
        rowId: identity.rowId,
        linkCode: identity.linkCode,
        actualBase,
        actualCostBase:
          costByRowId[identity.rowId] ??
          costByRowId[identity.linkCode] ??
          actualBase,
        label: identity.label || undefined,
      })
    }
    return peers
  }, [
    bookPeriods,
    bookRows,
    capexAlignedStructure,
    costByRowId,
    effectiveFiscalYear,
    effectiveRefMonth,
    fiscalYearEndMonth,
    forecastActualLayoutEffective,
    projectionYears,
  ])

  const resolveProjectedAmount = useMemo(() => {
    return (
      rowId: string,
      linkCode: string | null | undefined,
      configYearIndex: number,
      actualBase: number,
      resolvePeerRows: CapexBilanPeerRow[],
      resolveOpts?: { actualCostBase?: number; label?: string },
    ) => {
      const peersWithCost = resolvePeerRows.map((p) => ({
        ...p,
        actualCostBase: p.actualCostBase ?? costByRowId[p.rowId] ?? p.actualBase,
      }))
      return resolveCapexDrivenBilanProjectedAmount({
        rowId,
        linkCode,
        configYearIndex,
        configYearCount,
        actualBase,
        actualCostBase:
          resolveOpts?.actualCostBase ?? costByRowId[rowId] ?? actualBase,
        label: resolveOpts?.label,
        adjustments,
        depreciationRates,
        depreciationMethods,
        projectedRevenueYearTotals,
        peerRows: peersWithCost,
      })
    }
  }, [
    adjustments,
    configYearCount,
    costByRowId,
    depreciationMethods,
    depreciationRates,
    projectedRevenueYearTotals,
  ])

  const resolveDepreciationExpense = useMemo(() => {
    return (isLinkCode: string | null | undefined, configYearIndex: number) =>
      resolveCapexDrivenDepreciationExpense({
        isLinkCode,
        configYearIndex,
        configYearCount,
        adjustments,
        depreciationRates,
        depreciationMethods,
        amortizationLinkCodes,
        projectedRevenueYearTotals,
        peerRows,
      })
  }, [
    adjustments,
    amortizationLinkCodes,
    configYearCount,
    depreciationMethods,
    depreciationRates,
    peerRows,
    projectedRevenueYearTotals,
  ])

  return {
    adjustments,
    depreciationRates,
    depreciationMethods,
    amortizationLinkCodes,
    costByRowId,
    peerRows,
    projectedRevenueYearTotals,
    configYearCount,
    resolveProjectedAmount,
    resolveDepreciationExpense,
    loading: configLoading || revenueLoading || costLoading || bookLoading,
  }
}
