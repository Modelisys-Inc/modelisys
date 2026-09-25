"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getStatementStructure, listForecastConfigs } from "@/lib/api"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { useStandardLinkCodesFlat } from "@/hooks/use-standard-link-codes"
import { listExpenseHypothesisPostIds } from "@/lib/projected-cmv-year-totals"
import {
  buildExpenseHypothesisAssumptionRows,
  type ExpenseHypothesisAssumptionRow,
} from "@/lib/expense-hypothesis-assumptions"
import { syncDetailSubLinesFromStandard } from "@/lib/income-statement-structure-utils"

export function useExpenseHypothesisAssumptions(opts: {
  companyId?: string | null
  projectionId?: string | null
  projectionYears: number
  forecastBaseYear: number
  refMonth?: number
  divisionId?: string | null
  subDivisionId?: string | null
  enabled?: boolean
}): {
  rows: ExpenseHypothesisAssumptionRow[]
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

  const [expenseAdjustments, setExpenseAdjustments] = useState<unknown>({})
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
      setExpenseAdjustments({})
      setStructure(null)
      setConfigLoading(false)
      return
    }
    let cancelled = false
    setConfigLoading(true)
    Promise.all([
      listForecastConfigs(companyId, {
        config_type: "income-statement-detail",
        projection_id: projectionId ?? undefined,
      }),
      getStatementStructure(companyId, "income-statement"),
    ])
      .then(([cfgs, structRes]) => {
        if (cancelled) return
        const data = (cfgs[0]?.data ?? {}) as Record<string, unknown>
        setExpenseAdjustments(data.expenseAdjustments ?? {})
        setStructure(Array.isArray(structRes.structure) ? structRes.structure : [])
      })
      .catch(() => {
        if (!cancelled) {
          setExpenseAdjustments({})
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
    statementType: "income-statement",
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
    const postIds = listExpenseHypothesisPostIds(seriesRows, displayStructure)
    const byId = new Map(seriesRows.map((r) => [r.id, r.label]))
    for (const id of postIds) {
      labels[id] = byId.get(id) ?? id
    }
    for (const key of Object.keys((expenseAdjustments as Record<string, unknown>) ?? {})) {
      const m = /^(.*)-(\d+)$/.exec(key)
      const rowId = m?.[1]
      if (!rowId || labels[rowId]) continue
      labels[rowId] = byId.get(rowId) ?? rowId
    }
    return labels
  }, [displayStructure, seriesRows, expenseAdjustments])

  const rows = useMemo(
    () =>
      buildExpenseHypothesisAssumptionRows({
        expenseAdjustments,
        labelsByRowId,
        forecastBaseYear,
        projectionYears,
      }),
    [expenseAdjustments, labelsByRowId, forecastBaseYear, projectionYears],
  )

  const refresh = useCallback(() => setRefreshToken((n) => n + 1), [])

  return {
    rows,
    loading: configLoading || seriesLoading,
    refresh,
  }
}
