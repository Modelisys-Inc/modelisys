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
  structureHasRevenuePosteNatureRow,
  findStructureRowForStatementLine,
  isStructureRowDetailOnly,
  isCodeMappingEnabled,
  isShowInDetail,
  ensureSeriesRowsForAnnexDetailScope,
  structureRowBelongsToRevenueAnnexDetail,
  resolveStructureAnnexLetter,
  normLabel,
  syncDetailSubLinesFromStandard,
} from "@/lib/income-statement-structure-utils"
import { uniqueStatementRowsByStructureIndex } from "@/lib/income-statement-annex-detail"
import { useStandardLinkCodesFlat } from "@/hooks/use-standard-link-codes"
import {
  forecastActualColumnCount,
  forecastGrowthPreviousConfigYearIndex,
  nMinusOneAndYtdActuals,
  type ForecastActualLayout,
} from "@/lib/pro-forma-forecast-columns"

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
  // baseValue = réel (année 0) seulement — ne pas reporter le CA réel sur les années projetées.
  if (yearIndex === 0 && baseValue !== undefined) return baseValue
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
  opts?: {
    /** Colonnes réelles affichées (2 = N-1 + YTD) — growth de l’an 1 sur N-1. */
    actualColumnCount?: number
    /** Montant exercice complet N-1 (hors config) pour growthPercent / growthAmount. */
    nMinusOneActual?: number
  },
): number {
  let calculatedValue = getStoredRevenueBase(revenueValues, rowId, yearIndex, defaultValue, baseValue)
  const adjustments = getRevenueAdjustmentsForKey(revenueAdjustments, rowId, yearIndex)
  if (adjustments.length === 0) return calculatedValue

  const adjustment = adjustments[adjustments.length - 1]!
  if (adjustment.type === "amount" || adjustment.type === "custom") {
    return Math.round(adjustment.value)
  }

  const actualCols = opts?.actualColumnCount ?? 1
  const growthPrev = forecastGrowthPreviousConfigYearIndex(yearIndex, actualCols)
  let previousValue = calculatedValue
  if (growthPrev === "nMinusOne") {
    previousValue = opts?.nMinusOneActual ?? 0
  } else if (growthPrev != null) {
    const prevDefault = defaultTrendValues?.[growthPrev] ?? defaultValue
    previousValue =
      resolveRowValue != null
        ? resolveRowValue(rowId, growthPrev, prevDefault)
        : prevDefault
  }

  if (adjustment.type === "growthPercent") {
    return Math.round(previousValue * (1 + adjustment.value / 100))
  }
  if (adjustment.type === "growthAmount") {
    return previousValue + adjustment.value
  }
  return calculatedValue
}

type RevenueHypothesisSeriesRow = {
  id: string
  label: string
  isSection?: boolean
  isResult?: boolean
  amounts?: Record<string, number>
}

function isMappedDetailSeriesRow(
  row: { id: string; label: string },
  structure: Record<string, unknown>[],
): boolean {
  const sr = findStructureRowForStatementLine(row.id, row.label, structure)
  return sr !== undefined && isShowInDetail(sr, structure) && isCodeMappingEnabled(sr)
}

function findTotalRevenueSeriesId(
  seriesRows: RevenueHypothesisSeriesRow[],
  structure: Record<string, unknown>[],
): string | undefined {
  const sorted = uniqueStatementRowsByStructureIndex(
    seriesRows.filter((row) => isMappedDetailSeriesRow(row, structure)),
    structure,
  )
  const revenueSeries =
    sorted.find((r) => normLabel(r.label) === "revenus" && !r.isSection) ??
    sorted.find((r) => normLabel(r.label) === "revenus") ??
    sorted.find((r) => normLabel(r.label) === "total revenus" && !r.isSection) ??
    sorted.find(
      (r) =>
        r.isResult &&
        normLabel(r.label).includes("revenu") &&
        (normLabel(r.label).includes("total") || normLabel(r.label).includes("totaux")),
    )
  return revenueSeries && !revenueSeries.isSection ? revenueSeries.id : undefined
}

/**
 * Postes dont les clés Hypothèses Revenus (`rowId-yearIndex`) sont présentes
 * dans revenueAdjustments / revenueValues — repli si la structure n’a pas encore
 * de nature « Revenus » / annexe complète.
 */
export function listRevenueHypothesisPostIdsFromConfigKeys(
  seriesRows: { id: string }[],
  revenueAdjustments: Record<string, unknown>,
  revenueValues: Record<string, number>,
): string[] {
  const keyed = new Set<string>()
  for (const key of Object.keys(revenueAdjustments)) {
    const m = /^(.*)-(\d+)$/.exec(key)
    if (m?.[1]) keyed.add(m[1])
  }
  for (const key of Object.keys(revenueValues)) {
    const m = /^(.*)-(\d+)$/.exec(key)
    if (m?.[1]) keyed.add(m[1])
  }
  if (keyed.size === 0) return []
  const ids: string[] = []
  const seen = new Set<string>()
  for (const sr of seriesRows) {
    if (!sr.id || seen.has(sr.id) || !keyed.has(sr.id)) continue
    seen.add(sr.id)
    ids.push(sr.id)
  }
  return ids
}

/** Mêmes postes que le total CA d’Hypothèses Revenus (feuilles d’annexe, pas les totaux parents). */
export function listRevenueHypothesisPostIds(
  seriesRows: RevenueHypothesisSeriesRow[],
  structure: Record<string, unknown>[],
): string[] {
  if (!structure.length) return []
  if (structureHasRevenuePosteNatureRow(structure)) {
    let rows = seriesRows
      .filter((sr) => isMappedDetailSeriesRow(sr, structure))
      .filter((sr) => seriesRowBelongsToRevenueAnnexDetail(sr, structure))
    rows = uniqueStatementRowsByStructureIndex(
      ensureSeriesRowsForAnnexDetailScope(
        rows,
        structure,
        structureRowBelongsToRevenueAnnexDetail,
        (structRow) => {
          const id =
            String(structRow.id ?? structRow.linkCode ?? "").trim() ||
            String(structRow.label ?? "").trim()
          const letter = resolveStructureAnnexLetter(structRow, structure)
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
      if (!sr.id || seen.has(sr.id)) continue
      seen.add(sr.id)
      ids.push(sr.id)
    }
    if (ids.length > 0) return ids
  }
  const totalId = findTotalRevenueSeriesId(seriesRows, structure)
  return totalId ? [totalId] : []
}

export function computeProjectedRevenueYearTotalsFromSeries(
  seriesRows: SeriesRow[],
  periods: SeriesPeriod[],
  structure: Record<string, unknown>[],
  projectionYears: number,
  revenueValues: Record<string, number>,
  revenueAdjustments: Record<string, StoredRevenueAdjustment[]>,
  opts?: {
    forecastActualLayout?: ForecastActualLayout
    refMonth?: number
    refYear?: number
    fiscalYearEndMonth?: number
  },
): number[] | null {
  if (!seriesRows.length || !periods.length || !structure.length) return null

  const numYears = projectionYears + 1
  const postIds = listRevenueHypothesisPostIds(seriesRows, structure)
  if (postIds.length === 0) return null

  const actualColumnCount = forecastActualColumnCount(opts?.forecastActualLayout ?? "single-prior-year")
  const refMonth = opts?.refMonth ?? 12
  const refYear = opts?.refYear ?? new Date().getFullYear()
  const fiscalYearEndMonth = opts?.fiscalYearEndMonth ?? 12

  const seriesById = new Map(seriesRows.map((sr) => [sr.id, sr]))
  const defaultTrendByRow = new Map<string, number[]>()
  const nMinusOneByRow = new Map<string, number>()
  for (const id of postIds) {
    const sr = seriesById.get(id)
    let baseAmount = 0
    if (sr) {
      const rawAmounts = getRowAmounts(sr, periods)
      const { amounts: yearlyAmounts } = aggregateToYears(rawAmounts, periods)
      baseAmount = yearlyAmounts.length > 0 ? yearlyAmounts[yearlyAmounts.length - 1] : 0
      if (actualColumnCount > 1) {
        nMinusOneByRow.set(
          id,
          nMinusOneAndYtdActuals(sr, periods, refMonth, refYear, fiscalYearEndMonth).nMinusOne,
        )
      }
    }
    // Aligné Hypothèses Revenus : années projetées à 0$ sans hypothèse (pas de +5 % implicite).
    defaultTrendByRow.set(
      id,
      Array.from({ length: numYears }, (_, yearIndex) => (yearIndex === 0 ? baseAmount : 0)),
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
      {
        actualColumnCount,
        nMinusOneActual: nMinusOneByRow.get(rowId),
      },
    )
  }

  return Array.from({ length: numYears }, (_, yearIndex) =>
    postIds.reduce((acc, id) => {
      const trend = defaultTrendByRow.get(id)!
      const raw = trend[yearIndex] ?? 0
      return acc + resolveRowValue(id, yearIndex, raw)
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
  forecastActualLayout?: ForecastActualLayout
  refMonth?: number
  fiscalYearEndMonth?: number
}): { totals: number[] | null; loading: boolean } {
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
  const effectiveRefMonth = refMonth ?? 12
  const { rows: seriesRows, periods, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "income-statement",
    fiscalYear: effectiveFiscalYear,
    month: effectiveRefMonth,
    months: 72,
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
      {
        forecastActualLayout,
        refMonth: effectiveRefMonth,
        refYear: effectiveFiscalYear,
        fiscalYearEndMonth,
      },
    )
  }, [
    displayStructure,
    seriesRows,
    periods,
    projectionYears,
    revenueValues,
    revenueAdjustments,
    forecastActualLayout,
    effectiveRefMonth,
    effectiveFiscalYear,
    fiscalYearEndMonth,
  ])

  return {
    totals,
    loading: configLoading || seriesLoading,
  }
}
