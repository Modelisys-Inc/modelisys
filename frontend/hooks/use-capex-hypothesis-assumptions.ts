"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getStatementStructure, listForecastConfigs } from "@/lib/api"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { useStandardLinkCodesFlat } from "@/hooks/use-standard-link-codes"
import {
  CAPEX_FORECAST_CONFIG_TYPE,
  parseCapexForecastConfig,
} from "@/lib/capex-forecast-resolve"
import {
  buildCapexHypothesisAssumptionRows,
  type CapexHypothesisAssumptionRow,
} from "@/lib/capex-hypothesis-assumptions"
import {
  listStructureRowsForCapexDetailDisplay,
  syncDetailSubLinesFromStandard,
} from "@/lib/income-statement-structure-utils"
import { isCapexProjectionLinkCode } from "@/lib/standard-link-code-utils"
import { findRow, findSeriesRowOrDetail } from "@/lib/series-utils"

export function useCapexHypothesisAssumptions(opts: {
  companyId?: string | null
  projectionId?: string | null
  projectionYears: number
  forecastBaseYear: number
  refMonth?: number
  divisionId?: string | null
  subDivisionId?: string | null
  enabled?: boolean
}): {
  rows: CapexHypothesisAssumptionRow[]
  loading: boolean
  refresh: () => void
} {
  const {
    companyId,
    projectionId,
    projectionYears,
    forecastBaseYear,
    refMonth = 12,
    divisionId,
    subDivisionId,
    enabled = true,
  } = opts

  const [capexAdjustments, setCapexAdjustments] = useState<unknown>({})
  const [structure, setStructure] = useState<Record<string, unknown>[] | null>(null)
  const [configLoading, setConfigLoading] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)

  const { codes: standardLinkCodes } = useStandardLinkCodesFlat(
    false,
    undefined,
    !!companyId && enabled,
  )

  const displayStructure = useMemo(() => {
    if (structure === null) return null
    if (standardLinkCodes.length === 0) return structure
    return syncDetailSubLinesFromStandard(structure, standardLinkCodes)
  }, [structure, standardLinkCodes])

  const loadConfig = useCallback(() => {
    if (!enabled || !companyId) {
      setCapexAdjustments({})
      setStructure(null)
      setConfigLoading(false)
      return
    }
    let cancelled = false
    setConfigLoading(true)
    Promise.all([
      listForecastConfigs(companyId, {
        config_type: CAPEX_FORECAST_CONFIG_TYPE,
        projection_id: projectionId ?? undefined,
      }),
      getStatementStructure(companyId, "balance-sheet"),
    ])
      .then(([cfgs, structRes]) => {
        if (cancelled) return
        const parsed = parseCapexForecastConfig(cfgs[0]?.data ?? {})
        setCapexAdjustments(parsed.capexAdjustments)
        setStructure(Array.isArray(structRes.structure) ? structRes.structure : [])
      })
      .catch(() => {
        if (!cancelled) {
          setCapexAdjustments({})
          setStructure([])
        }
      })
      .finally(() => {
        if (!cancelled) setConfigLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [companyId, projectionId, enabled, refreshToken])

  useEffect(() => loadConfig(), [loadConfig])

  const { rows: seriesRows, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "balance-sheet",
    fiscalYear: forecastBaseYear,
    month: refMonth,
    months: 72,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: enabled && !!companyId && displayStructure !== null,
  })

  const labelsByRowId = useMemo(() => {
    const labels: Record<string, string> = {}
    if (!displayStructure) return labels
    const capexStructRows = listStructureRowsForCapexDetailDisplay(displayStructure)
    for (const sr of capexStructRows) {
      const linkCode = String(sr.linkCode ?? "").trim()
      const structId = String(sr.id ?? "").trim()
      if (!isCapexProjectionLinkCode(linkCode) && !isCapexProjectionLinkCode(structId)) continue
      const seriesRow =
        (structId ? findSeriesRowOrDetail(seriesRows, structId) : undefined) ??
        (linkCode ? findRow(seriesRows, linkCode) : undefined) ??
        (linkCode ? findSeriesRowOrDetail(seriesRows, linkCode) : undefined)
      const rowId = String(seriesRow?.id ?? "").trim() || linkCode || structId
      if (!rowId) continue
      labels[rowId] = String(sr.label ?? seriesRow?.label ?? "").trim() || rowId
    }
    for (const key of Object.keys((capexAdjustments as Record<string, unknown>) ?? {})) {
      const m = /^(.*)-(\d+)$/.exec(key)
      const rowId = m?.[1]
      if (!rowId || labels[rowId]) continue
      const seriesRow = findSeriesRowOrDetail(seriesRows, rowId) ?? findRow(seriesRows, rowId)
      labels[rowId] = String(seriesRow?.label ?? rowId)
    }
    return labels
  }, [displayStructure, seriesRows, capexAdjustments])

  const rows = useMemo(
    () =>
      buildCapexHypothesisAssumptionRows({
        capexAdjustments,
        labelsByRowId,
        forecastBaseYear,
        projectionYears,
      }),
    [capexAdjustments, labelsByRowId, forecastBaseYear, projectionYears],
  )

  const refresh = useCallback(() => setRefreshToken((n) => n + 1), [])

  return {
    rows,
    loading: configLoading || seriesLoading,
    refresh,
  }
}
