import { useEffect, useMemo, useState } from "react"
import { getStatementStructure, listForecastConfigs } from "@/lib/api"
import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import {
  aggregateToYears,
  getRowAmounts,
} from "@/lib/series-utils"
import {
  seriesRowBelongsToRevenueAnnexDetail,
  syncDetailSubLinesFromStandard,
} from "@/lib/income-statement-structure-utils"
import { useStandardLinkCodesFlat } from "@/hooks/use-standard-link-codes"

export type StoredRevenueAdjustment = {
  id: string
  type: "amount" | "growthPercent" | "growthAmount" | "custom"
  value: number
  note?: string
}

function parseRevenueAdjustments(raw: unknown): Record<string, StoredRevenueAdjustment[]> {
  const out: Record<string, StoredRevenueAdjustment[]> = {}
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      out[key] = value as StoredRevenueAdjustment[]
    } else if (value && typeof value === "object") {
      out[key] = [value as StoredRevenueAdjustment]
    }
  }
  return out
}

function getRevenueAdjustmentsForKey(
  map: Record<string, StoredRevenueAdjustment[]>,
  rowId: string,
  yearIndex: number,
): StoredRevenueAdjustment[] {
  return map[`${rowId}-${yearIndex}`] ?? []
}

function getStoredRevenueBase(
  revenueValues: Record<string, number>,
  rowId: string,
  yearIndex: number,
  defaultValue: number,
  baseValue?: number,
): number {
  const key = `${rowId}-${yearIndex}`
  if (revenueValues[key] !== undefined) return revenueValues[key]!
  if (baseValue !== undefined) return baseValue
  return defaultValue
}

export function computeProjectedRevenueRowValue(
  rowId: string,
  yearIndex: number,
  defaultValue: number,
  revenueValues: Record<string, number>,
  revenueAdjustments: Record<string, StoredRevenueAdjustment[]>,
  baseValue?: number,
  defaultTrendValues?: number[],
  resolveRowValue?: (rowId: string, yearIndex: number, defaultValue: number) => number,
): number {
  let calculatedValue = getStoredRevenueBase(revenueValues, rowId, yearIndex, defaultValue, baseValue)
  const adjustments = getRevenueAdjustmentsForKey(revenueAdjustments, rowId, yearIndex)
  if (adjustments.length === 0) return calculatedValue

  const adjustment = adjustments[adjustments.length - 1]!
  if (adjustment.type === "amount" || adjustment.type === "custom") {
    return Math.round(adjustment.value)
  }

  const prevDefault = yearIndex > 0 ? (defaultTrendValues?.[yearIndex - 1] ?? defaultValue) : defaultValue
  const previousValue =
    yearIndex > 0 && resolveRowValue
      ? resolveRowValue(rowId, yearIndex - 1, prevDefault)
      : calculatedValue

  if (adjustment.type === "growthPercent") {
    return Math.round(previousValue * (1 + adjustment.value / 100))
  }
  if (adjustment.type === "growthAmount") {
    return previousValue + adjustment.value
  }
  return calculatedValue
}

export function computeProjectedRevenueYearTotalsFromSeries(
  seriesRows: SeriesRow[],
  periods: SeriesPeriod[],
  structure: Record<string, unknown>[],
  projectionYears: number,
  revenueValues: Record<string, number>,
  revenueAdjustments: Record<string, StoredRevenueAdjustment[]>,
): number[] | null {
  if (!seriesRows.length || !periods.length || !structure.length) return null

  const numYears = projectionYears + 1
  const defaultGrowthRate = 0.05

  const revenuePosts = seriesRows.filter((sr) =>
    seriesRowBelongsToRevenueAnnexDetail(sr, structure),
  )
  if (revenuePosts.length === 0) return null

  const defaultTrendByRow = new Map<string, number[]>()
  for (const sr of revenuePosts) {
    const rawAmounts = getRowAmounts(sr, periods)
    const { amounts: yearlyAmounts } = aggregateToYears(rawAmounts, periods)
    const baseAmount = yearlyAmounts.length > 0 ? yearlyAmounts[yearlyAmounts.length - 1] : 0
    defaultTrendByRow.set(
      sr.id,
      Array.from({ length: numYears }, (_, yearIndex) =>
        yearIndex === 0
          ? baseAmount
          : Math.round(baseAmount * Math.pow(1 + defaultGrowthRate, yearIndex)),
      ),
    )
  }

  const resolveRowValue = (rowId: string, yearIndex: number, defaultValue: number): number => {
    const trend = defaultTrendByRow.get(rowId)
    const def = trend?.[yearIndex] ?? defaultValue
    return computeProjectedRevenueRowValue(
      rowId,
      yearIndex,
      def,
      revenueValues,
      revenueAdjustments,
      trend?.[0],
      trend,
      resolveRowValue,
    )
  }

  return Array.from({ length: numYears }, (_, yearIndex) =>
    revenuePosts.reduce((acc, sr) => {
      const trend = defaultTrendByRow.get(sr.id)!
      const raw = trend[yearIndex] ?? 0
      return acc + resolveRowValue(sr.id, yearIndex, raw)
    }, 0),
  )
}

export function useProjectedRevenueYearTotals(opts: {
  companyId?: string | null
  projectionId?: string | null
  projectionYears: number
  fiscalYear?: number
  divisionId?: string | null
  subDivisionId?: string | null
  enabled?: boolean
}): { totals: number[] | null; loading: boolean } {
  const {
    companyId,
    projectionId,
    projectionYears,
    fiscalYear,
    divisionId,
    subDivisionId,
    enabled = true,
  } = opts

  const [revenueValues, setRevenueValues] = useState<Record<string, number>>({})
  const [revenueAdjustments, setRevenueAdjustments] = useState<
    Record<string, StoredRevenueAdjustment[]>
  >({})
  const [structure, setStructure] = useState<Record<string, unknown>[] | null>(null)
  const [configLoading, setConfigLoading] = useState(false)

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

  useEffect(() => {
    if (!enabled || !companyId) {
      setRevenueValues({})
      setRevenueAdjustments({})
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
        setRevenueValues((data.revenueValues as Record<string, number>) ?? {})
        setRevenueAdjustments(parseRevenueAdjustments(data.revenueAdjustments))
        setStructure(Array.isArray(structRes.structure) ? structRes.structure : [])
      })
      .catch(() => {
        if (!cancelled) {
          setRevenueValues({})
          setRevenueAdjustments({})
          setStructure([])
        }
      })
      .finally(() => {
        if (!cancelled) setConfigLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [companyId, projectionId, enabled])

  const effectiveFiscalYear = fiscalYear ?? new Date().getFullYear()
  const { rows: seriesRows, periods, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "income-statement",
    fiscalYear: effectiveFiscalYear,
    months: 60,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: enabled && !!companyId && displayStructure !== null,
  })

  const totals = useMemo(() => {
    if (!displayStructure) return null
    return computeProjectedRevenueYearTotalsFromSeries(
      seriesRows,
      periods,
      displayStructure,
      projectionYears,
      revenueValues,
      revenueAdjustments,
    )
  }, [
    displayStructure,
    seriesRows,
    periods,
    projectionYears,
    revenueValues,
    revenueAdjustments,
  ])

  return {
    totals,
    loading: configLoading || seriesLoading,
  }
}
