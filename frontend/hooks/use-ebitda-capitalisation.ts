"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { Company } from "@/components/entity-selector"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import {
  listEbitdaNotes,
  listForecastConfigs,
  upsertEbitdaNote,
  upsertForecastConfig,
} from "@/lib/api"
import {
  type Adjustment,
  type AdjustmentTarget,
  type EbitdaColumn,
  type EbitdaMultipleConfigData,
  type EbitdaRangeSide,
  type EnterpriseValueSeriesPoint,
  buildEbitdaColumnSpecs,
  buildEnterpriseValueSeries,
  computeAdjustedColumns,
  computeAverageNFiscalYears,
  buildEbitdaSynthesisAverages,
  computeSeriesAmountsByColumn,
  computeWeightedAverageEBITDA,
  computeWeightedAverageRevenue,
  createColumnsFromSpecs,
  createDefaultEbitdaYears,
  EBITDA_DISCLAIMER_STORAGE_KEY,
  EBITDA_MULTIPLE_CONFIG_TYPE,
  EBITDA_SERIES_LOOKBACK_MONTHS,
  filterPopulatedEbitdaColumns,
  getTotalAdjustmentsForColumn,
  migrateAdjustmentAmountKeys,
  normalizeAdjustmentTarget,
  resolveFiscalYearEndMonth,
  seedEbitdaRangeFromAverage,
} from "@/lib/ebitda-capitalisation"
import { generateId } from "@/lib/seeded-random"

export type UseEbitdaCapitalisationArgs = {
  companyId: string | null
  companies: Company[]
  refMonth: number
  refYear: number
}

export function useEbitdaCapitalisation({
  companyId,
  companies,
  refMonth,
  refYear,
}: UseEbitdaCapitalisationArgs) {
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(false)

  useEffect(() => {
    const accepted = localStorage.getItem(EBITDA_DISCLAIMER_STORAGE_KEY)
    if (accepted === "true") {
      setHasAcceptedDisclaimer(true)
    }
  }, [])

  const acceptDisclaimer = () => {
    localStorage.setItem(EBITDA_DISCLAIMER_STORAGE_KEY, "true")
    setHasAcceptedDisclaimer(true)
  }

  const fiscalYearEndMonth = useMemo(() => {
    const company = companies.find((c) => c.id === companyId)
    return resolveFiscalYearEndMonth(company?.fiscalYearEnd)
  }, [companyId, companies])

  const columnSpecs = useMemo(
    () => buildEbitdaColumnSpecs(refMonth, refYear, fiscalYearEndMonth, 5),
    [refMonth, refYear, fiscalYearEndMonth],
  )

  const {
    rows: seriesRows,
    periods: seriesPeriods,
    loading: incomeDataLoading,
  } = useFinancialStatementSeries({
    companyId,
    statementType: "income-statement",
    fiscalYear: refYear,
    month: refMonth,
    months: EBITDA_SERIES_LOOKBACK_MONTHS,
    enabled: Boolean(companyId),
  })

  const [columns, setColumns] = useState<EbitdaColumn[]>(() => createDefaultEbitdaYears())
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [configLoaded, setConfigLoaded] = useState(false)
  const pendingWeightsRef = useRef<{
    columnIds?: string[]
    weights?: number[]
    isRepresentative?: boolean[]
  } | null>(null)

  useEffect(() => {
    const amounts = computeSeriesAmountsByColumn(
      seriesRows,
      seriesPeriods,
      columnSpecs,
      fiscalYearEndMonth,
    )
    setColumns((prev) => {
      let next = createColumnsFromSpecs(columnSpecs, amounts, prev)
      const pending = pendingWeightsRef.current
      if (pending?.weights) {
        pendingWeightsRef.current = null
        next = next.map((col, i) => {
          let weight = col.weight
          let isRepresentative = col.isRepresentative
          if (pending.columnIds?.length) {
            const idx = pending.columnIds.indexOf(col.id)
            if (idx >= 0) {
              weight = pending.weights![idx] ?? weight
              isRepresentative = pending.isRepresentative?.[idx] ?? weight > 0
            }
          } else if (i < pending.weights!.length) {
            weight = pending.weights![i] ?? weight
            isRepresentative = pending.isRepresentative?.[i] ?? weight > 0
          }
          return { ...col, weight, isRepresentative }
        })
      }
      // Évite une boucle : seriesRows `[]` / setState systématique sans changement réel.
      if (
        prev.length === next.length &&
        prev.every(
          (col, i) =>
            col.id === next[i]!.id &&
            col.label === next[i]!.label &&
            col.ebitda === next[i]!.ebitda &&
            col.revenue === next[i]!.revenue &&
            col.weight === next[i]!.weight &&
            col.isRepresentative === next[i]!.isRepresentative,
        )
      ) {
        return prev
      }
      return next
    })
  }, [seriesRows, seriesPeriods, columnSpecs, fiscalYearEndMonth])

  const [weightNote, setWeightNote] = useState("")
  /** Une note / source par ajustement (pas par cellule). */
  const [adjustmentNotes, setAdjustmentNotes] = useState<Record<string, string>>({})

  const [lowMultiple, setLowMultiple] = useState(4.5)
  const [highMultiple, setHighMultiple] = useState(6.5)

  const [ebitdaRangeNotes, setEbitdaRangeNotes] = useState<
    Record<EbitdaRangeSide, string>
  >({} as Record<EbitdaRangeSide, string>)

  const [revenueRangeNotes, setRevenueRangeNotes] = useState<
    Record<EbitdaRangeSide, string>
  >({} as Record<EbitdaRangeSide, string>)

  const [multipleNotes, setMultipleNotes] = useState<Record<EbitdaRangeSide, string>>(
    {} as Record<EbitdaRangeSide, string>,
  )

  const [lowEBITDARange, setLowEBITDARange] = useState(0)
  const [highEBITDARange, setHighEBITDARange] = useState(0)
  const [lowRevenueRange, setLowRevenueRange] = useState(0)
  const [highRevenueRange, setHighRevenueRange] = useState(0)
  const ebitdaRangeSeededRef = useRef(false)
  const revenueRangeSeededRef = useRef(false)

  const adjustedColumns = useMemo(
    () => computeAdjustedColumns(columns, adjustments),
    [columns, adjustments],
  )

  /** Affichage + synthèses : masquer les colonnes sans chiffre (évite de fausser les moyennes). */
  const displayColumns = useMemo(
    () => filterPopulatedEbitdaColumns(adjustedColumns),
    [adjustedColumns],
  )

  const representativeColumns = useMemo(
    () => displayColumns.filter((y) => y.weight > 0),
    [displayColumns],
  )
  const totalWeight = useMemo(
    () => representativeColumns.reduce((sum, y) => sum + y.weight, 0),
    [representativeColumns],
  )
  const weightedAverageEBITDA = useMemo(
    () => computeWeightedAverageEBITDA(displayColumns),
    [displayColumns],
  )
  const weightedAverageRevenue = useMemo(
    () => computeWeightedAverageRevenue(displayColumns),
    [displayColumns],
  )
  const synthesisAverages = useMemo(
    () => buildEbitdaSynthesisAverages(displayColumns),
    [displayColumns],
  )
  const average5Years = useMemo(
    () => computeAverageNFiscalYears(displayColumns, 5),
    [displayColumns],
  )
  const average3Years = useMemo(
    () => computeAverageNFiscalYears(displayColumns, 3),
    [displayColumns],
  )

  useEffect(() => {
    if (ebitdaRangeSeededRef.current) return
    if (weightedAverageEBITDA <= 0) return
    const { low, high } = seedEbitdaRangeFromAverage(weightedAverageEBITDA)
    setLowEBITDARange(low)
    setHighEBITDARange(high)
    ebitdaRangeSeededRef.current = true
  }, [weightedAverageEBITDA])

  useEffect(() => {
    if (revenueRangeSeededRef.current) return
    if (weightedAverageRevenue <= 0) return
    const { low, high } = seedEbitdaRangeFromAverage(weightedAverageRevenue)
    setLowRevenueRange(low)
    setHighRevenueRange(high)
    revenueRangeSeededRef.current = true
  }, [weightedAverageRevenue])

  const midEBITDARange = (lowEBITDARange + highEBITDARange) / 2
  const midRevenueRange = (lowRevenueRange + highRevenueRange) / 2
  const midMultiple = (lowMultiple + highMultiple) / 2
  const lowEnterpriseValue = lowEBITDARange * lowMultiple
  const highEnterpriseValue = highEBITDARange * highMultiple
  const midEnterpriseValue = (lowEnterpriseValue + highEnterpriseValue) / 2

  const enterpriseValueChartData: EnterpriseValueSeriesPoint[] = useMemo(
    () =>
      buildEnterpriseValueSeries({
        lowMultiple,
        highMultiple,
        lowEBITDARange,
        highEBITDARange,
      }),
    [lowMultiple, highMultiple, lowEBITDARange, highEBITDARange],
  )

  const addAdjustment = (target: AdjustmentTarget = "ebitda") => {
    const normalized = normalizeAdjustmentTarget(target)
    const label =
      normalized === "revenue"
        ? `Ajustement revenus ${adjustments.filter((a) => normalizeAdjustmentTarget(a.target) === "revenue").length + 1}`
        : `Ajustement BAIIA ${adjustments.filter((a) => normalizeAdjustmentTarget(a.target) === "ebitda").length + 1}`
    const newAdjustment: Adjustment = {
      id: generateId("adj"),
      name: label,
      target: normalized,
      amounts: Object.fromEntries(columns.map((c) => [c.id, 0])),
    }
    setAdjustments([...adjustments, newAdjustment])
  }

  const removeAdjustment = (adjustmentId: string) => {
    setAdjustments(adjustments.filter((adj) => adj.id !== adjustmentId))
    setAdjustmentNotes((prev) => {
      const next = { ...prev }
      delete next[adjustmentId]
      return next
    })
    if (companyId) {
      const updatedNotes = { ...adjustmentNotes }
      delete updatedNotes[adjustmentId]
      upsertEbitdaNote(companyId, {
        note_type: "adjustment",
        data: updatedNotes as Record<string, unknown>,
      }).catch(console.error)
    }
  }

  const updateAdjustmentName = (adjustmentId: string, name: string) => {
    setAdjustments(
      adjustments.map((adj) => (adj.id === adjustmentId ? { ...adj, name } : adj)),
    )
  }

  const updateAdjustmentTarget = (
    adjustmentId: string,
    target: AdjustmentTarget,
  ) => {
    setAdjustments(
      adjustments.map((adj) =>
        adj.id === adjustmentId
          ? { ...adj, target: normalizeAdjustmentTarget(target) }
          : adj,
      ),
    )
  }

  const updateAdjustmentAmount = (
    adjustmentId: string,
    columnId: string,
    amount: number,
  ) => {
    setAdjustments(
      adjustments.map((adj) =>
        adj.id === adjustmentId
          ? { ...adj, amounts: { ...adj.amounts, [columnId]: amount } }
          : adj,
      ),
    )
  }

  const updateWeightForColumn = (columnId: string, weight: number) => {
    setColumns((prev) =>
      prev.map((c) =>
        c.id === columnId ? { ...c, weight, isRepresentative: weight > 0 } : c,
      ),
    )
  }

  const noteSaveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const updateWeightNote = (note: string) => {
    setWeightNote(note)
    const key = "weight"
    if (noteSaveTimersRef.current[key]) clearTimeout(noteSaveTimersRef.current[key])
    noteSaveTimersRef.current[key] = setTimeout(() => {
      if (companyId) {
        upsertEbitdaNote(companyId, {
          note_type: "weight",
          data: { note },
        }).catch(console.error)
      }
    }, 450)
  }

  const updateAdjustmentNote = (adjustmentId: string, note: string) => {
    setAdjustmentNotes((prev) => {
      const next = { ...prev, [adjustmentId]: note }
      const key = `adj-${adjustmentId}`
      if (noteSaveTimersRef.current[key]) clearTimeout(noteSaveTimersRef.current[key])
      noteSaveTimersRef.current[key] = setTimeout(() => {
        if (companyId) {
          upsertEbitdaNote(companyId, {
            note_type: "adjustment",
            data: next as Record<string, unknown>,
          }).catch(console.error)
        }
      }, 450)
      return next
    })
  }

  const updateEbitdaRangeNote = (side: EbitdaRangeSide, note: string) => {
    setEbitdaRangeNotes((prev) => {
      const next = { ...prev, [side]: note }
      const key = "range"
      if (noteSaveTimersRef.current[key]) clearTimeout(noteSaveTimersRef.current[key])
      noteSaveTimersRef.current[key] = setTimeout(() => {
        if (companyId) {
          upsertEbitdaNote(companyId, {
            note_type: "range",
            data: next as Record<string, unknown>,
          }).catch(console.error)
        }
      }, 450)
      return next
    })
  }

  const updateRevenueRangeNote = (side: EbitdaRangeSide, note: string) => {
    setRevenueRangeNotes((prev) => {
      const next = { ...prev, [side]: note }
      const key = "revenue-range"
      if (noteSaveTimersRef.current[key]) clearTimeout(noteSaveTimersRef.current[key])
      noteSaveTimersRef.current[key] = setTimeout(() => {
        if (companyId) {
          upsertEbitdaNote(companyId, {
            note_type: "revenue-range",
            data: next as Record<string, unknown>,
          }).catch(console.error)
        }
      }, 450)
      return next
    })
  }

  const updateMultipleNote = (side: EbitdaRangeSide, note: string) => {
    setMultipleNotes((prev) => {
      const next = { ...prev, [side]: note }
      const key = "multiple"
      if (noteSaveTimersRef.current[key]) clearTimeout(noteSaveTimersRef.current[key])
      noteSaveTimersRef.current[key] = setTimeout(() => {
        if (companyId) {
          upsertEbitdaNote(companyId, {
            note_type: "multiple",
            data: next as Record<string, unknown>,
          }).catch(console.error)
        }
      }, 450)
      return next
    })
  }

  const setLowEBITDARangePersisted = (value: number) => {
    ebitdaRangeSeededRef.current = true
    setLowEBITDARange(value)
  }

  const setHighEBITDARangePersisted = (value: number) => {
    ebitdaRangeSeededRef.current = true
    setHighEBITDARange(value)
  }

  const setLowRevenueRangePersisted = (value: number) => {
    revenueRangeSeededRef.current = true
    setLowRevenueRange(value)
  }

  const setHighRevenueRangePersisted = (value: number) => {
    revenueRangeSeededRef.current = true
    setHighRevenueRange(value)
  }

  useEffect(() => {
    return () => {
      for (const timer of Object.values(noteSaveTimersRef.current)) {
        clearTimeout(timer)
      }
    }
  }, [])

  useEffect(() => {
    if (!companyId) {
      setConfigLoaded(true)
      return
    }
    let cancelled = false
    ebitdaRangeSeededRef.current = false
    revenueRangeSeededRef.current = false
    setConfigLoaded(false)

    listForecastConfigs(companyId, {
      config_type: EBITDA_MULTIPLE_CONFIG_TYPE,
    })
      .then((configs) => {
        if (cancelled) return
        if (configs.length > 0) {
          const d = configs[0].data as EbitdaMultipleConfigData
          if (Array.isArray(d.adjustments)) {
            setAdjustments(
              d.adjustments.map((adj) => ({
                ...adj,
                target: normalizeAdjustmentTarget(adj.target),
                amounts: migrateAdjustmentAmountKeys(adj.amounts),
              })),
            )
          }
          if (typeof d.lowMultiple === "number") setLowMultiple(d.lowMultiple)
          if (typeof d.highMultiple === "number") setHighMultiple(d.highMultiple)
          if (Array.isArray(d.weights)) {
            pendingWeightsRef.current = {
              columnIds: d.columnIds,
              weights: d.weights,
              isRepresentative: d.isRepresentative,
            }
          }
          if (
            typeof d.lowEBITDARange === "number" &&
            typeof d.highEBITDARange === "number"
          ) {
            setLowEBITDARange(d.lowEBITDARange)
            setHighEBITDARange(d.highEBITDARange)
            ebitdaRangeSeededRef.current = true
          }
          if (
            typeof d.lowRevenueRange === "number" &&
            typeof d.highRevenueRange === "number"
          ) {
            setLowRevenueRange(d.lowRevenueRange)
            setHighRevenueRange(d.highRevenueRange)
            revenueRangeSeededRef.current = true
          }
        }
        setConfigLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setConfigLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [companyId])

  useEffect(() => {
    if (!configLoaded || !companyId) return
    const timer = setTimeout(() => {
      const data: EbitdaMultipleConfigData = {
        adjustments,
        lowMultiple,
        highMultiple,
        columnIds: columns.map((c) => c.id),
        weights: columns.map((c) => c.weight),
        isRepresentative: columns.map((c) => c.isRepresentative),
      }
      if (ebitdaRangeSeededRef.current) {
        data.lowEBITDARange = lowEBITDARange
        data.highEBITDARange = highEBITDARange
      }
      if (revenueRangeSeededRef.current) {
        data.lowRevenueRange = lowRevenueRange
        data.highRevenueRange = highRevenueRange
      }
      upsertForecastConfig(companyId, {
        config_type: EBITDA_MULTIPLE_CONFIG_TYPE,
        data: data as Record<string, unknown>,
      }).catch(console.error)
    }, 800)
    return () => clearTimeout(timer)
  }, [
    adjustments,
    lowMultiple,
    highMultiple,
    lowEBITDARange,
    highEBITDARange,
    lowRevenueRange,
    highRevenueRange,
    columns,
    companyId,
    configLoaded,
  ])

  useEffect(() => {
    if (!companyId) return
    let cancelled = false

    listEbitdaNotes(companyId)
      .then((notes) => {
        if (cancelled) return
        for (const note of notes) {
          const d = note.data as Record<string, unknown>
          if (note.note_type === "adjustment") {
            const converted: Record<string, string> = {}
            for (const [key, value] of Object.entries(d)) {
              if (typeof value === "string") {
                converted[key] = value
              } else if (typeof value === "object" && value !== null) {
                // Legacy : notes par colonne → concaténation des textes non vides.
                const parts = Object.values(value as Record<string, string>).filter(
                  (t) => typeof t === "string" && t.trim(),
                )
                if (parts.length) converted[key] = parts.join(" · ")
              }
            }
            setAdjustmentNotes(converted)
          } else if (note.note_type === "weight") {
            if (typeof d.note === "string") {
              setWeightNote(d.note)
            } else {
              // Legacy : une note par colonne → concaténation.
              const parts = Object.values(d).filter(
                (v): v is string => typeof v === "string" && v.trim().length > 0,
              )
              if (parts.length) setWeightNote(parts.join(" · "))
            }
          } else if (note.note_type === "range") {
            setEbitdaRangeNotes(d as Record<EbitdaRangeSide, string>)
          } else if (note.note_type === "revenue-range") {
            setRevenueRangeNotes(d as Record<EbitdaRangeSide, string>)
          } else if (note.note_type === "multiple") {
            setMultipleNotes(d as Record<EbitdaRangeSide, string>)
          }
        }
      })
      .catch((err) => {
        if (!cancelled) console.error("Error loading EBITDA notes:", err)
      })

    return () => {
      cancelled = true
    }
  }, [companyId])

  return {
    companyId,
    refMonth,
    refYear,
    fiscalYearEndMonth,
    incomeDataLoading,
    configLoaded,

    hasAcceptedDisclaimer,
    acceptDisclaimer,

    columns: adjustedColumns,
    displayColumns,
    /** Alias compat UI historique. */
    years: adjustedColumns,
    displayYears: displayColumns,

    getRevenueForColumn: (columnId: string) =>
      adjustedColumns.find((c) => c.id === columnId)?.revenue ?? 0,
    getAdjustedRevenueForColumn: (columnId: string) =>
      adjustedColumns.find((c) => c.id === columnId)?.adjustedRevenue ?? 0,
    getRevenueForYear: (year: number) =>
      adjustedColumns.find((c) => c.kind === "fiscal" && c.year === year)?.revenue ??
      0,
    getTotalAdjustmentsForColumn: (
      columnId: string,
      target?: AdjustmentTarget,
    ) => getTotalAdjustmentsForColumn(adjustments, columnId, target),
    getTotalAdjustmentsForYear: (year: number) =>
      getTotalAdjustmentsForColumn(adjustments, `fy-${year}`),

    adjustments,
    addAdjustment,
    removeAdjustment,
    updateAdjustmentName,
    updateAdjustmentTarget,
    updateAdjustmentAmount,

    representativeYears: representativeColumns,
    totalWeight,
    weightedAverageEBITDA,
    weightedAverageRevenue,
    synthesisAverages,
    average3Years,
    average5Years,

    lowEBITDARange,
    highEBITDARange,
    midEBITDARange,
    setLowEBITDARange: setLowEBITDARangePersisted,
    setHighEBITDARange: setHighEBITDARangePersisted,

    lowRevenueRange,
    highRevenueRange,
    midRevenueRange,
    setLowRevenueRange: setLowRevenueRangePersisted,
    setHighRevenueRange: setHighRevenueRangePersisted,

    lowMultiple,
    highMultiple,
    midMultiple,
    setLowMultiple,
    setHighMultiple,

    lowEnterpriseValue,
    highEnterpriseValue,
    midEnterpriseValue,
    enterpriseValueChartData,

    weightNote,
    adjustmentNotes,
    ebitdaRangeNotes,
    revenueRangeNotes,
    multipleNotes,
    updateWeightForColumn,
    updateWeightForYear: (year: number, weight: number) =>
      updateWeightForColumn(`fy-${year}`, weight),
    updateWeightNote,
    updateAdjustmentNote,
    updateEbitdaRangeNote,
    updateRevenueRangeNote,
    updateMultipleNote,
  }
}

export type UseEbitdaCapitalisationReturn = ReturnType<typeof useEbitdaCapitalisation>
