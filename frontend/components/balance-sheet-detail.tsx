"use client"

import { Fragment, useCallback, useMemo, useRef, useState, useEffect } from "react"
import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import type { FinancialStatementRow } from "@/lib/api"
import { getFinancialStatementSeries, getStatementStructure, type FinancialStatementSeriesParams } from "@/lib/api"
import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { IncomeStatementStructureStudioCols } from "@/components/income-statement-structure-studio-cols"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, ChevronDown, ListTree, Loader2, Settings, Sparkles } from "lucide-react"
import {
  BalanceSheetLineAnalysisAside,
  BalanceSheetLineAnalysisTriggerButton,
  structureRowHasLiaisonCode,
  type BalanceSheetLineAnalysisSnapshot,
} from "@/components/balance-sheet-line-analysis"
import { getNoteByRowId, useNotesCache } from "@/lib/notes-storage"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { useBalanceSheetStructureEdit } from "@/hooks/use-income-statement-structure-edit"
import { useStandardLinkCodesFlat } from "@/hooks/use-standard-link-codes"
import { buildStandardLinkCodeLabelMap } from "@/lib/standard-link-code-utils"
import {
  collectDistinctLinkCodesFromStructure,
  mapLinkCodesToOwnerLabel,
  detailLineLabelForDisplay,
  findStatementApiRowForStructureRow,
  findStructureRowForStatementLine,
  getStructureRowGlobalIndex,
  listAnnexOptionsForDetailSubLineModal,
  listStructureRowsForDetailDisplay,
  isCodeMappingEnabled,
  isShowInDetail,
  isStructureRowDetailOnly,
  isStructureRowInDetailAnnexEditor,
  isSummaryAnnexRowLockedInDetailEdit,
  normLabel,
  normalizeAnnexLetter,
  syncDetailSubLinesFromStandard,
} from "@/lib/income-statement-structure-utils"
import { filterBalanceSheetDetailRowsForHorizon } from "@/lib/balance-sheet-horizon-filter"
import type { IncomeStatementHorizonView } from "@/lib/income-statement-horizon-visibility"
import {
  aggregateToQuarters,
  aggregateToYears,
  getPeriodLabels,
  getRowAmounts,
  reverseSeriesOrderForDisplay,
} from "@/lib/series-utils"
import {
  calendarQuarterFromMonth,
  formatCalendarMonthYear,
  formatPriorCalendarMonth,
  formatQuarterShortLabel,
  formatSameMonthPriorYear,
  priorCalendarQuarter,
} from "@/lib/financial-period-labels"
import { getHorizonModeLabel } from "@/lib/financial-statement-horizon-labels"
import {
  monthTrendFromReference,
  quarterTrendFromReference,
  yearTrendFromReference,
} from "@/lib/series-reference-columns"
import {
  insertAnnexDetailPlaceholderRows,
  zeroAmountsForAnnexTitleRow,
  balanceSheetDetailRowAllowsGlBreakdown,
  balanceSheetDetailCanExpandGlAccounts,
  balanceSheetDetailRowsLookLikeGlAccounts,
} from "@/lib/balance-sheet-detail-rows"
import {
  dashboardCardAccentClass,
  dashboardCardBodyMutedClass,
  dashboardCardFrameStaticClass,
  dashboardCardHeaderBarClass,
  dashboardCardHeaderIconBoxClass,
  dashboardCardRingClass,
  dashboardCardStructureSettingsButtonClass,
  dashboardCardTitleClass,
} from "@/lib/dashboard-card-style"

interface BalanceSheetDetailProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years"
  columnMode?: "variationAmount" | "variationPercent" | "percentage" | "comparison"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  /** Titre de la carte (défaut : Détail) — aligné sur l’état des résultats */
  title?: string
  comparisonType?: "lastMonth" | "pastMonth" | "budget"
  selectedBudgetId?: string | null
  selectedBudgetName?: string | null
  fiscalYear?: number
  /** Date de référence (URL ?refMonth=&refYear=) */
  refMonth: number
  refYear: number
  rows?: FinancialStatementRow[]
  loading?: boolean
  showBalanceSheetStructureSettings?: boolean
  structureVersion?: number
  onBalanceSheetStructureSaved?: () => void
  /** Désactive l’analyse par ligne et les notes (ex. page Projections). */
  disableRowInteractions?: boolean
  projectionYears?: 3 | 4 | 5
  forecastBaseYear?: number
  forecastUseSeriesActuals?: boolean
}

interface BalanceAccount {
  accountNumber: string
  accountName: string
  amount: number
  priorAmount?: number
  // For trend views, store the proportion of the parent row's amount
  proportion?: number
}

interface DetailRow {
  label: string
  current: number
  prior: number
  indent?: boolean
  isBold?: boolean
  isSubtotal?: boolean
  isSection?: boolean
  /** Titre d’annexe : montants masqués (le sous-total couvre). */
  isAnnexTitle?: boolean
  /** Mode Paramètres : ligne indicatif après un bloc d’annexe. */
  isAnnexPlaceholder?: boolean
  /** Mode Paramètres : sous-total injecté après un bloc d’annexe. */
  isAnnexSubtotal?: boolean
  // For trend views (12months, quarters, years)
  trendValues?: number[]
  // Balance accounts for this row
  balanceAccounts?: BalanceAccount[]
  rowId?: string // Unique ID for expansion
  /** Pour identifier la ligne d’état associée (utile pour les annexes). */
  statementLabel?: string
  /** Lettre d’annexe (structure), pour regrouper et afficher les sections Annexe. */
  annexLetter?: string
  hasLiaisonCode?: boolean
}

export function BalanceSheetDetail({
  period,
  view,
  columnMode = "variationAmount",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  title = "Détail",
  comparisonType = "lastMonth",
  selectedBudgetName = null,
  fiscalYear,
  refMonth,
  refYear,
  rows: backendRows = [],
  loading = false,
  showBalanceSheetStructureSettings = false,
  structureVersion = 0,
  onBalanceSheetStructureSaved,
  disableRowInteractions = false,
  projectionYears = 5,
  forecastBaseYear,
  forecastUseSeriesActuals = false,
}: BalanceSheetDetailProps) {
  const isForecastSection = title === "Bilan pro forma"
  const forecastYearColumnCount = projectionYears + 1

  useNotesCache(companyId ?? null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [statementStructure, setStatementStructure] = useState<Record<string, unknown>[] | null>(null)
  const [structureEditMode, setStructureEditMode] = useState(false)
  const [lineAnalysis, setLineAnalysis] = useState<BalanceSheetLineAnalysisSnapshot | null>(null)
  const [notesUpdated, setNotesUpdated] = useState(0) // Force re-render when notes change
  const analysisCardRef = useRef<HTMLElement | null>(null)
  const analysisRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})

  // Determine what we're comparing (needed early for Paramètres button availability)
  const isCompanyComparison = columnMode === "comparison" && !companyId
  const isDivisionComparison = columnMode === "comparison" && companyId && !divisionId
  const isSubDivisionComparison = columnMode === "comparison" && companyId && divisionId && !subDivisionId
  const isComparisonMode = isCompanyComparison || isDivisionComparison || isSubDivisionComparison

  useEffect(() => {
    if (!companyId) {
      setStatementStructure(null)
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        const data = await getStatementStructure(companyId, "balance-sheet")
        if (!cancelled) setStatementStructure((data.structure ?? []) as Record<string, unknown>[])
      } catch (e) {
        console.error("Error loading balance sheet structure:", e)
        if (!cancelled) setStatementStructure([])
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [companyId, structureVersion])

  const canInlineStructureEdit = !!showBalanceSheetStructureSettings && !!companyId && !isComparisonMode
  const shouldLoadStandardLinkCodes = !!companyId
  const structEdit = useBalanceSheetStructureEdit(companyId ?? null, structureEditMode && canInlineStructureEdit)
  const { codes: standardLinkCodes } = useStandardLinkCodesFlat(
    false,
    undefined,
    shouldLoadStandardLinkCodes
  )

  /** Structure affichée au Détail : sous-lignes standard alignées même hors mode Paramètres. */
  const displayStructure = useMemo((): Record<string, unknown>[] | null => {
    if (statementStructure === null) return null
    if (standardLinkCodes.length === 0) return statementStructure
    return syncDetailSubLinesFromStandard(statementStructure, standardLinkCodes)
  }, [statementStructure, standardLinkCodes])

  useEffect(() => {
    if (!structureEditMode || !canInlineStructureEdit || structEdit.loading) return
    if (standardLinkCodes.length === 0) return
    structEdit.applyDetailSubLinesFromStandard(standardLinkCodes)
  }, [
    structureEditMode,
    canInlineStructureEdit,
    structEdit.loading,
    structEdit.applyDetailSubLinesFromStandard,
    standardLinkCodes,
    structEdit.structure.length,
  ])

  const allLinkCodes = useMemo(
    () => collectDistinctLinkCodesFromStructure(structEdit.structure),
    [structEdit.structure]
  )
  const linkCodeLabels = useMemo(() => {
    if (structureEditMode && canInlineStructureEdit && standardLinkCodes.length > 0) {
      return buildStandardLinkCodeLabelMap(standardLinkCodes)
    }
    return mapLinkCodesToOwnerLabel(structEdit.structure)
  }, [structureEditMode, canInlineStructureEdit, standardLinkCodes, structEdit.structure])

  const detailAnnexOptionsForSubLineModal = useMemo(
    () => listAnnexOptionsForDetailSubLineModal(structEdit.structure),
    [structEdit.structure]
  )

  const isStructureStudio = structureEditMode && canInlineStructureEdit

  const detailAnnexEditorGlobalIndices = useMemo(() => {
    if (!isStructureStudio) return []
    return structEdit.structure
      .map((r, i) => (isStructureRowInDetailAnnexEditor(r as Record<string, unknown>) ? i : -1))
      .filter((i) => i >= 0)
  }, [isStructureStudio, structEdit.structure])

  type DetailAnnexStructureLayoutEntry =
    | { kind: "structure"; globalIdx: number }
    | { kind: "annexSubtotal"; letter: string }
    | { kind: "placeholder"; letter: string }

  const detailAnnexStructureTableLayout = useMemo((): DetailAnnexStructureLayoutEntry[] => {
    if (!isStructureStudio) return []
    const indices = detailAnnexEditorGlobalIndices
    if (indices.length === 0) return []
    const struct = structEdit.structure
    const out: DetailAnnexStructureLayoutEntry[] = []
    let i = 0
    while (i < indices.length) {
      const g0 = indices[i]!
      const letter = normalizeAnnexLetter(String((struct[g0] as Record<string, unknown>)?.annexLetter ?? ""))
      if (letter) {
        let j = i
        while (j < indices.length) {
          const gj = indices[j]!
          const l2 = normalizeAnnexLetter(String((struct[gj] as Record<string, unknown>)?.annexLetter ?? ""))
          if (l2 !== letter) break
          out.push({ kind: "structure", globalIdx: gj })
          j++
        }
        out.push({ kind: "annexSubtotal", letter })
        out.push({ kind: "placeholder", letter })
        i = j
      } else {
        out.push({ kind: "structure", globalIdx: g0 })
        i++
      }
    }
    return out
  }, [isStructureStudio, detailAnnexEditorGlobalIndices, structEdit.structure])

  const showStructureCols =
    isStructureStudio && !structEdit.loading && detailAnnexEditorGlobalIndices.length > 0

  const buildAnnexPlaceholderDetailRow = (letter: string): DetailRow => ({
    label: "—",
    statementLabel: `__annex_placeholder__${letter}`,
    current: 0,
    prior: 0,
    isAnnexPlaceholder: true,
    annexLetter: letter,
  })

  const buildAnnexSubtotalDetailRow = (letter: string): DetailRow => ({
    label: `Sous-total — Annexe ${letter}`,
    statementLabel: `__annex_subtotal__${letter}`,
    current: 0,
    prior: 0,
    isSubtotal: true,
    isAnnexSubtotal: true,
    annexLetter: letter,
  })

  const handleSaveStructure = useCallback(async () => {
    if (!canInlineStructureEdit) return
    const ok = await structEdit.save()
    if (ok) {
      onBalanceSheetStructureSaved?.()
      setStructureEditMode(false)
    }
  }, [canInlineStructureEdit, structEdit, onBalanceSheetStructureSaved])

  // Series data for multi-period views
  const isMultiPeriod = view === "12months" || view === "quarters" || view === "years"
  const currentYear = fiscalYear || new Date().getFullYear()
  const monthsNeeded = view === "years" ? 72 : view === "quarters" ? 15 : 12

  const { rows: seriesRows, periods, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "balance-sheet",
    fiscalYear: currentYear,
    month: refMonth,
    months: monthsNeeded,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: isMultiPeriod && (!isForecastSection || forecastUseSeriesActuals),
    structureVersion,
  })

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(rowId)) {
        newSet.delete(rowId)
      } else {
        newSet.add(rowId)
      }
      return newSet
    })
  }

  const openOrToggleLineAnalysis = useCallback((snapshot: BalanceSheetLineAnalysisSnapshot) => {
    setLineAnalysis((prev) => (prev?.rowId === snapshot.rowId ? null : snapshot))
  }, [])

  const mapStructureRowToDetailRow = (
    sr: Record<string, unknown>,
    row: FinancialStatementRow | undefined
  ): DetailRow => {
    const sub = isStructureRowDetailOnly(sr)
    const annexLetter = String(row?.annexLetter ?? sr.annexLetter ?? "")
    const isAnnexTitle = !sub && normalizeAnnexLetter(annexLetter) !== ""
    const allowsGl = balanceSheetDetailRowAllowsGlBreakdown(
      sr,
      standardLinkCodes,
      { isAnnexTitle, isSection: row?.isSection ?? false },
    )
    const rawDetail = row?.detailRows
    const balanceAccounts =
      allowsGl &&
      rawDetail &&
      rawDetail.length > 0 &&
      balanceSheetDetailRowsLookLikeGlAccounts(rawDetail, standardLinkCodes)
        ? rawDetail.map((dr) => ({
            accountNumber: dr.id,
            accountName: dr.label,
            amount: dr.current ?? 0,
            priorAmount: dr.prior,
          }))
        : undefined
    return zeroAmountsForAnnexTitleRow({
      label: detailLineLabelForDisplay(sr, row?.label ?? String(sr.label ?? ""), annexLetter),
      statementLabel: row?.label ?? String(sr.linkCode ?? sr.label ?? ""),
      annexLetter,
      current: row?.current ?? 0,
      prior: row?.prior ?? 0,
      indent: sub,
      isBold: sub ? false : true,
      isSubtotal: row?.isResult ?? false,
      isSection: row?.isSection ?? false,
      isAnnexTitle,
      balanceAccounts,
      rowId: row?.id ?? String(sr.linkCode ?? sr.id ?? ""),
      hasLiaisonCode: row?.hasLiaisonCode ?? structureRowHasLiaisonCode(sr),
    })
  }

  const mapBackendRowsDefinedOnly = (apiRows: FinancialStatementRow[], structure: Record<string, unknown>[]): DetailRow[] => {
    const used = new Set<number>()
    const usedNested = new Set<string>()
    const detailStructureRows = listStructureRowsForDetailDisplay(structure)
    const fromStructure = detailStructureRows.map((sr) => {
      const row = findStatementApiRowForStructureRow(sr, apiRows, used, usedNested)
      return mapStructureRowToDetailRow(sr, row)
    })

    if (fromStructure.length > 0) {
      return fromStructure
    }

    // Repli : lignes API marquées showInDetail (comme le Compte de résultat Détail).
    const defined = apiRows.filter((row) => {
      const sr = findStructureRowForStatementLine(row.id, row.label, structure)
      return sr !== undefined && isShowInDetail(sr, structure) && isCodeMappingEnabled(sr)
    })
    const sorted = [...defined].sort((a, b) => {
      const srA = findStructureRowForStatementLine(a.id, a.label, structure)!
      const srB = findStructureRowForStatementLine(b.id, b.label, structure)!
      return getStructureRowGlobalIndex(srA, structure) - getStructureRowGlobalIndex(srB, structure)
    })
    return sorted.map((row) => {
      const sr = findStructureRowForStatementLine(row.id, row.label, structure)!
      return mapStructureRowToDetailRow(sr, row)
    })
  }

  const mapSeriesRowToDetailRow = (
    sr: Record<string, unknown>,
    row: SeriesRow | undefined,
    trend: number[],
    trendFn: (row: SeriesRow) => number[],
  ): DetailRow => {
    const sub = isStructureRowDetailOnly(sr)
    const annexLetter = String(row?.annexLetter ?? sr.annexLetter ?? "")
    const isAnnexTitle = !sub && normalizeAnnexLetter(annexLetter) !== ""
    const lastAmount = trend[0] || 0
    const priorAmount = trend.length >= 2 ? trend[1] || 0 : 0
    const allowsGl = balanceSheetDetailRowAllowsGlBreakdown(
      sr,
      standardLinkCodes,
      { isAnnexTitle, isSection: row?.isSection ?? false },
    )
    const rawDetail = row?.detailRows
    const balanceAccounts =
      allowsGl &&
      rawDetail &&
      rawDetail.length > 0 &&
      balanceSheetDetailRowsLookLikeGlAccounts(rawDetail, standardLinkCodes)
        ? rawDetail.map((dr) => {
            const pseudo: SeriesRow = {
              id: dr.id,
              label: dr.label,
              isBold: false,
              isSection: false,
              isResult: false,
              amounts: dr.amounts,
              detailRows: [],
            }
            const accountTrend = trendFn(pseudo)
            return {
              accountNumber: dr.id,
              accountName: dr.label,
              amount: accountTrend[0] ?? 0,
              priorAmount: accountTrend[1],
              trendValues: accountTrend,
            }
          })
        : undefined
    return zeroAmountsForAnnexTitleRow({
      label: detailLineLabelForDisplay(sr, row?.label ?? String(sr.label ?? ""), annexLetter),
      statementLabel: row?.label ?? String(sr.linkCode ?? sr.label ?? ""),
      annexLetter,
      current: lastAmount,
      prior: priorAmount,
      isBold: !sub,
      isSection: row?.isSection ?? false,
      isSubtotal: row?.isResult ?? false,
      indent: sub,
      isAnnexTitle,
      trendValues: trend,
      balanceAccounts,
      rowId: row?.id ?? String(sr.linkCode ?? sr.id ?? ""),
      hasLiaisonCode: row?.hasLiaisonCode ?? structureRowHasLiaisonCode(sr),
    })
  }

  const mapSeriesRowsDefinedOnly = (
    rows: SeriesRow[],
    structure: Record<string, unknown>[],
    trendFn: (row: SeriesRow) => number[],
    emptyTrendLength: number
  ): DetailRow[] => {
    const used = new Set<number>()
    const usedNested = new Set<string>()
    const detailStructureRows = listStructureRowsForDetailDisplay(structure)
    return detailStructureRows.map((sr) => {
      const row = findStatementApiRowForStructureRow(sr, rows, used, usedNested)
      const trend = row ? trendFn(row) : Array(emptyTrendLength).fill(0)
      return mapSeriesRowToDetailRow(sr, row, trend, trendFn)
    })
  }

  const getSeriesDetailRows = (): DetailRow[] => {
    if (!seriesRows.length || !periods.length || !displayStructure) return []
    const emptyTrendLength = monthTrendFromReference(
      seriesRows[0],
      periods as SeriesPeriod[],
      refMonth,
      refYear,
      12
    ).length
    return mapSeriesRowsDefinedOnly(
      seriesRows,
      displayStructure,
      (row) => monthTrendFromReference(row, periods as SeriesPeriod[], refMonth, refYear, 12),
      emptyTrendLength
    )
  }

  const getSeriesQuarterRows = (): DetailRow[] => {
    if (!seriesRows.length || !periods.length || !displayStructure) return []
    const emptyTrendLength = quarterTrendFromReference(
      seriesRows[0],
      periods as SeriesPeriod[],
      refMonth,
      refYear,
      5
    ).length
    return mapSeriesRowsDefinedOnly(
      seriesRows,
      displayStructure,
      (row) => quarterTrendFromReference(row, periods as SeriesPeriod[], refMonth, refYear, 5),
      emptyTrendLength
    )
  }

  const getSeriesYearRows = (): DetailRow[] => {
    if (!seriesRows.length || !periods.length || !displayStructure) return []
    const buildYearTrend = (row: SeriesRow) => {
      if (isForecastSection && forecastUseSeriesActuals) {
        const actual = yearTrendFromReference(row, periods as SeriesPeriod[], refYear, 1)[0] || 0
        return [actual, ...Array.from({ length: projectionYears }, () => 0)]
      }
      return yearTrendFromReference(row, periods as SeriesPeriod[], refYear, 6)
    }
    const emptyTrendLength =
      isForecastSection && forecastUseSeriesActuals
        ? forecastYearColumnCount
        : yearTrendFromReference(seriesRows[0], periods as SeriesPeriod[], refYear, 6).length
    return mapSeriesRowsDefinedOnly(seriesRows, displayStructure, buildYearTrend, emptyTrendLength)
  }

  const getDetailData = (): DetailRow[] => {
    if (view === "12months") return getSeriesDetailRows()
    if (view === "quarters") return getSeriesQuarterRows()
    if (view === "years") return getSeriesYearRows()
    if (displayStructure === null) return []
    return mapBackendRowsDefinedOnly(backendRows, displayStructure)
  }

  // Helper function to capitalize first letter
  const capitalizeFirst = (str: string): string => {
    if (!str) return str
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  let data = getDetailData()

  if (title === "Détail" && !isForecastSection && (displayStructure?.length ?? statementStructure?.length)) {
    data = filterBalanceSheetDetailRowsForHorizon(
      data,
      displayStructure ?? statementStructure ?? [],
      view as IncomeStatementHorizonView
    )
  }

  if (!isStructureStudio) {
    const trendLen = data.find((r) => r.trendValues != null)?.trendValues?.length ?? 0
    data = insertAnnexDetailPlaceholderRows(data, trendLen > 0 ? trendLen : undefined)
  }

  // Get entities to compare
  let entitiesToCompare: Array<{ id: string; name: string }> = []
  if (isCompanyComparison) {
    entitiesToCompare = companies.map((c) => ({ id: c.id, name: c.name }))
  } else if (isDivisionComparison) {
    const selectedCompany = companies.find((c) => c.id === companyId)
    entitiesToCompare = selectedCompany?.divisions.map((d) => ({ id: d.id, name: d.name })) || []
  } else if (isSubDivisionComparison) {
    const selectedCompany = companies.find((c) => c.id === companyId)
    const selectedDivision = selectedCompany?.divisions.find((d) => d.id === divisionId)
    entitiesToCompare = selectedDivision?.subDivisions.map((sd) => ({ id: sd.id, name: sd.name })) || []
  }
  
  // Fetch real data for each entity in comparison mode
  const [entityDataMap, setEntityDataMap] = useState<Record<string, DetailRow[]>>({})
  const [entityDataLoading, setEntityDataLoading] = useState(false)

  useEffect(() => {
    if (!isComparisonMode) {
      setEntityDataMap(prev => Object.keys(prev).length === 0 ? prev : {})
      return
    }

    // Compute entities inside the effect to avoid unstable dependency
    let entities: Array<{ id: string; name: string }> = []
    if (isCompanyComparison) {
      entities = companies.map((c) => ({ id: c.id, name: c.name }))
    } else if (isDivisionComparison) {
      const sc = companies.find((c) => c.id === companyId)
      entities = sc?.divisions.map((d) => ({ id: d.id, name: d.name })) || []
    } else if (isSubDivisionComparison) {
      const sc = companies.find((c) => c.id === companyId)
      const sd = sc?.divisions.find((d) => d.id === divisionId)
      entities = sd?.subDivisions.map((s) => ({ id: s.id, name: s.name })) || []
    }

    if (entities.length === 0) {
      setEntityDataMap(prev => Object.keys(prev).length === 0 ? prev : {})
      return
    }

    let cancelled = false
    setEntityDataLoading(true)

    const fetchEntityData = async () => {
      const results: Record<string, DetailRow[]> = {}

      for (const entity of entities) {
        try {
          const params: FinancialStatementSeriesParams = {
            fiscal_year: currentYear,
            months: 12,
          }
          let entityCompanyId = companyId || ""

          if (isCompanyComparison) {
            entityCompanyId = entity.id
          } else if (isDivisionComparison) {
            params.division_id = entity.id
          } else if (isSubDivisionComparison) {
            params.sub_division_id = entity.id
          }

          if (!entityCompanyId) continue

          const response = await getFinancialStatementSeries(
            entityCompanyId,
            "balance-sheet",
            params
          )

          if (!cancelled && response.rows) {
            const mapped: DetailRow[] = response.rows.map((row) => {
              const amounts = Object.entries(row.amounts)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([, v]) => v)
              const lastAmount = amounts[amounts.length - 1] || 0
              const priorAmount = amounts.length >= 2 ? amounts[amounts.length - 2] || 0 : 0
              return {
                label: row.label,
                current: lastAmount,
                prior: priorAmount,
                indent: !row.isBold && !row.isSection && !row.isResult,
                isBold: row.isBold,
                isSubtotal: row.isResult,
                isSection: row.isSection,
              }
            })
            results[entity.id] = mapped
          }
        } catch (err) {
          console.error(`Error fetching data for entity ${entity.name}:`, err)
        }
      }

      if (!cancelled) {
        setEntityDataMap(results)
        setEntityDataLoading(false)
      }
    }

    fetchEntityData()
    return () => { cancelled = true }
  }, [isComparisonMode, companies, companyId, divisionId, isCompanyComparison, isDivisionComparison, isSubDivisionComparison, currentYear])

  // Find total assets value for percentage calculations
  const totalAssetsRow = data.find((row) => row.label.toLowerCase().includes("total des actifs") && row.isSubtotal)
  const totalAssetsCurrent = totalAssetsRow?.current || 1
  const totalAssetsPrior = totalAssetsRow?.prior || 1
  const totalAssetsTrendValues = totalAssetsRow?.trendValues ?? []

  // Helper function to calculate percentage of total assets
  const getTotalAssetsPercentage = (value: number, isPrior: boolean): number => {
    const totalAssets = isPrior ? totalAssetsPrior : totalAssetsCurrent
    if (totalAssets === 0) return 0
    return (value / totalAssets) * 100
  }

  const getTrendTotalAssetsPercentage = (value: number, valueIdx: number): number => {
    const totalAssets = totalAssetsTrendValues[valueIdx] ?? 0
    if (totalAssets === 0) return 0
    return (value / totalAssets) * 100
  }

  const getTrendVariation = (values: number[], valueIdx: number): number | null => {
    if (valueIdx >= values.length - 1) return null
    return calculateVariation(values[valueIdx] ?? 0, values[valueIdx + 1] ?? 0)
  }

  const getTrendVariationAmount = (values: number[], valueIdx: number): number | null => {
    if (valueIdx >= values.length - 1) return null
    return (values[valueIdx] ?? 0) - (values[valueIdx + 1] ?? 0)
  }

  // Helper function to generate descriptive text
  const getDescriptionText = (): string => {
    const parts: string[] = []

    // Horizon/Period
    if (view === "comparison" && period === "monthly") parts.push("Vue mensuelle")
    else if (view === "comparison" && period === "quarterly") parts.push("Vue trimestrielle")
    else if (view === "comparison" && period === "annual") parts.push("Vue annuelle")
    else if (view === "ytd") parts.push("Année en cours (YTD)")
    else if (view === "ddm") parts.push("Même jour du mois dernier (DDM)")
    else if (view === "12months") parts.push("12 derniers mois")
    else if (view === "quarters") parts.push("5 derniers trimestres")
    else if (view === "years") parts.push("6 dernières années")

    // Entity selection
    if (isCompanyComparison) {
      parts.push("Comparaison de toutes les sociétés")
    } else if (isDivisionComparison) {
      const selectedCompany = companies.find((c) => c.id === companyId)
      parts.push(`Comparaison des divisions de ${selectedCompany?.name || "la société"}`)
    } else if (isSubDivisionComparison) {
      const selectedCompany = companies.find((c) => c.id === companyId)
      const selectedDivision = selectedCompany?.divisions.find((d) => d.id === divisionId)
      parts.push(`Comparaison des sous-divisions de ${selectedDivision?.name || "la division"}`)
    } else if (subDivisionId) {
      const selectedCompany = companies.find((c) => c.id === companyId)
      const selectedDivision = selectedCompany?.divisions.find((d) => d.id === divisionId)
      const selectedSubDivision = selectedDivision?.subDivisions.find((sd) => sd.id === subDivisionId)
      parts.push(selectedSubDivision?.name || "Sous-division sélectionnée")
    } else if (divisionId) {
      const selectedCompany = companies.find((c) => c.id === companyId)
      const selectedDivision = selectedCompany?.divisions.find((d) => d.id === divisionId)
      parts.push(`${selectedCompany?.name || "Société"} • ${selectedDivision?.name || "Division"}`)
    } else if (companyId) {
      const selectedCompany = companies.find((c) => c.id === companyId)
      parts.push(selectedCompany?.name || "Société sélectionnée")
    } else {
      parts.push("Toutes les sociétés")
    }

    // Column mode
    if (columnMode === "comparison") {
      // Already handled above
    } else if (columnMode === "percentage") {
      parts.push("• % des actifs totaux")
    } else {
      parts.push("• Variations")
    }

    return parts.join(" • ")
  }

  // Helper function to generate month labels from series data or fallback
  const getMonthLabels = (): string[] => {
    if (periods.length > 0) return reverseSeriesOrderForDisplay(getPeriodLabels(periods))
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
    const currentDate = new Date()
    const labels: string[] = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      labels.push(`${months[date.getMonth()]} ${date.getFullYear()}`)
    }
    return reverseSeriesOrderForDisplay(labels)
  }

  // Helper function to generate quarter labels from series data or fallback
  const getQuarterLabels = (): string[] => {
    if (periods.length > 0 && seriesRows.length > 0) {
      const rawAmounts = getRowAmounts(seriesRows[0], periods)
      return reverseSeriesOrderForDisplay(aggregateToQuarters(rawAmounts, periods, "last").labels)
    }
    const currentDate = new Date()
    const labels: string[] = []
    for (let i = 4; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i * 3, 1)
      const quarter = Math.floor(date.getMonth() / 3) + 1
      labels.push(`T${quarter} ${date.getFullYear()}`)
    }
    return reverseSeriesOrderForDisplay(labels)
  }

  // Helper function to generate year labels from series data or fallback
  const getYearLabels = (): string[] => {
    if (isForecastSection) {
      const baseYear = forecastBaseYear ?? refYear ?? new Date().getFullYear()
      const labels: string[] = [`${baseYear - 1}`]
      for (let i = 0; i < projectionYears; i++) {
        labels.push(`${baseYear + i}`)
      }
      return labels
    }
    if (periods.length > 0 && seriesRows.length > 0) {
      const rawAmounts = getRowAmounts(seriesRows[0], periods)
      return reverseSeriesOrderForDisplay(aggregateToYears(rawAmounts, periods, "last").labels)
    }
    const cy = new Date().getFullYear()
    const labels: string[] = []
    for (let i = 5; i >= 0; i--) {
      labels.push(`${cy - i}`)
    }
    return reverseSeriesOrderForDisplay(labels)
  }

  // Helper function to get comparison label (daté selon la référence, comme l’état des résultats)
  const getComparisonLabel = (): string => {
    if (view !== "comparison" && view !== "ytd" && view !== "ddm") return "Passé"
    if (comparisonType === "lastMonth") {
      if (view === "ytd") return "YTD dernier"
      if (view === "ddm") return "DDM dernier"
      if (period === "monthly") return formatPriorCalendarMonth(refMonth, refYear)
      if (period === "quarterly") {
        const q = calendarQuarterFromMonth(refMonth)
        const pq = priorCalendarQuarter(q, refYear)
        return formatQuarterShortLabel(pq.quarter, pq.year)
      }
      return "Année dernière"
    }
    if (comparisonType === "pastMonth") {
      if (view === "ytd") return "YTD passé"
      if (view === "ddm") return "DDM passé"
      if (period === "monthly") return formatSameMonthPriorYear(refMonth, refYear)
      if (period === "quarterly") {
        const q = calendarQuarterFromMonth(refMonth)
        return formatQuarterShortLabel(q, refYear - 1)
      }
      return "Année passée"
    }
    if (comparisonType === "budget") {
      if (selectedBudgetName) {
        if (view === "ytd") return `Budget ${selectedBudgetName} (YTD)`
        if (view === "ddm") return `Budget ${selectedBudgetName} (DDM)`
        return `Budget ${selectedBudgetName}`
      }
      if (view === "ytd") return "YTD budgeté"
      if (view === "ddm") return "DDM budgeté"
      if (period === "monthly") return "Mois budgeté"
      if (period === "quarterly") return "Trimestre budgeté"
      return "Année budgetée"
    }
    return "Passé"
  }

  /** Colonne « Courant » : libellé daté (référence) pour comparaison / DDM. */
  const getCurrentColumnLabel = (): string => {
    if ((view === "comparison" || view === "ddm") && period === "monthly") {
      return formatCalendarMonthYear(refMonth, refYear)
    }
    if ((view === "comparison" || view === "ddm") && period === "quarterly") {
      const q = calendarQuarterFromMonth(refMonth)
      return formatQuarterShortLabel(q, refYear)
    }
    if ((view === "comparison" || view === "ddm") && period === "annual") {
      return String(refYear)
    }
    return "Courant"
  }

  const getHorizonText = (): string => getHorizonModeLabel(view, period)

  let detailTableColumnCount = 2
  if (view === "current") detailTableColumnCount = 2
  else if (view === "comparison" || view === "ddm" || view === "ytd") {
    if (isComparisonMode) detailTableColumnCount = 1 + entitiesToCompare.length
    else {
      const extra =
        columnMode === "percentage"
          ? 2
          : columnMode === "variationAmount" || columnMode === "variationPercent"
            ? 1
            : 0
      detailTableColumnCount = 3 + extra
    }
  } else if (view === "12months") detailTableColumnCount = 1 + getMonthLabels().length
  else if (view === "quarters") detailTableColumnCount = 1 + getQuarterLabels().length
  else if (view === "years") detailTableColumnCount = 1 + getYearLabels().length

  const awaitingBalanceSheetStructure =
    !isForecastSection && !!companyId && statementStructure === null

  const isDataLoading =
    awaitingBalanceSheetStructure ||
    loading ||
    (isMultiPeriod && seriesLoading) ||
    entityDataLoading

  if (isDataLoading) {
    return (
      <div className={cn("w-full", dashboardCardFrameStaticClass)}>
        <div className={dashboardCardRingClass} aria-hidden />
        <div className="relative px-8 py-16 text-center">
          <div className="animate-pulse space-y-4">
            <div className="mx-auto h-4 w-1/3 rounded bg-slate-200"></div>
            <div className="mx-auto h-4 w-2/3 rounded bg-slate-200"></div>
            <div className="mx-auto h-4 w-1/2 rounded bg-slate-200"></div>
          </div>
          <p className={cn("mt-4 text-sm", dashboardCardBodyMutedClass)}>Chargement des données...</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className={cn("w-full", dashboardCardFrameStaticClass)}>
        <div className={dashboardCardRingClass} aria-hidden />
        <div className="relative px-8 py-16 text-center">
          <p className={cn("text-sm", dashboardCardBodyMutedClass)}>
            Aucune donnée disponible. Veuillez importer une balance de vérification et configurer la structure des états financiers.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("w-full", dashboardCardFrameStaticClass)}>
      <div className={dashboardCardRingClass} aria-hidden />
      <div className="relative">
      {/* Header */}
      <div className={cn("px-6 py-5 sm:px-7", dashboardCardHeaderBarClass)}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className={dashboardCardHeaderIconBoxClass}>
              <ListTree className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h2 className={cn("text-xl leading-tight", dashboardCardTitleClass)}>{title}</h2>
                {isStructureStudio && (
                  <Badge
                    variant="secondary"
                    className="border border-slate-200 bg-slate-100 font-medium text-[#2A2F3A] shadow-none"
                  >
                    <Sparkles className="h-3 w-3 text-[#E0742D]" />
                    Édition structure
                  </Badge>
                )}
              </div>
              {isStructureStudio ? (
                <p className={cn("text-sm leading-relaxed", dashboardCardBodyMutedClass)}>
                  Les sous-lignes du détail sont synchronisées depuis le plan standard (Codes de liaison), sous
                  chaque annexe définie au Sommaire. Configurez d&apos;abord code parent et annexe au Sommaire si
                  besoin.
                </p>
              ) : (
                <div className={cn("flex flex-wrap items-center gap-3 text-sm", dashboardCardBodyMutedClass)}>
                  <span className="font-medium text-[#2A2F3A]">{getHorizonText()}</span>
                  <span className="text-slate-400">•</span>
                  {subDivisionId && divisionId && companyId ? (
                    <>
                      <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                      <span className="text-slate-400">•</span>
                      <span>{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name || "Division"}</span>
                      <span className="text-slate-400">•</span>
                      <span className={cn("font-semibold", dashboardCardAccentClass)}>
                        {companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.subDivisions.find((sd) => sd.id === subDivisionId)?.name || "Sous-division"}
                      </span>
                    </>
                  ) : divisionId && companyId ? (
                    <>
                      <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                      <span className="text-slate-400">•</span>
                      <span className={cn("font-semibold", dashboardCardAccentClass)}>
                        {companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name || "Division"}
                      </span>
                    </>
                  ) : companyId ? (
                    <span className={cn("font-semibold", dashboardCardAccentClass)}>
                      {companies.find((c) => c.id === companyId)?.name || "Société sélectionnée"}
                    </span>
                  ) : (
                    <span className="truncate">Toutes les sociétés</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:items-end">
            {canInlineStructureEdit && !structureEditMode && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={dashboardCardStructureSettingsButtonClass}
                onClick={() => setStructureEditMode(true)}
              >
                <Settings className={cn("h-4 w-4", dashboardCardAccentClass)} />
                Paramètres
              </Button>
            )}
            {canInlineStructureEdit && structureEditMode && (
              <div className="flex w-full flex-wrap items-center justify-end gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-[#5C5F66] hover:bg-slate-100"
                  disabled={structEdit.saving}
                  onClick={() => {
                    structEdit.discard()
                    setStructureEditMode(false)
                  }}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl bg-[#2A2F3A] px-4 font-semibold text-[#E6D6C3] shadow-sm transition hover:bg-[#353b47] disabled:opacity-60"
                  disabled={structEdit.saving || structEdit.loading || !companyId}
                  onClick={handleSaveStructure}
                >
                  {structEdit.saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement…
                    </>
                  ) : (
                    "Enregistrer"
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {structureEditMode && canInlineStructureEdit && structEdit.loading && (
        <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50/90 px-8 py-3.5 text-sm text-[#2A2F3A]">
          <Loader2 className={cn("h-4 w-4 animate-spin", dashboardCardAccentClass)} />
          <span className="font-medium">Chargement de la structure…</span>
        </div>
      )}
      {structureEditMode && canInlineStructureEdit && structEdit.error && (
        <div className="border-b border-red-200/80 bg-gradient-to-r from-red-50 to-white px-8 py-3 text-sm font-medium text-red-800">
          {structEdit.error}
        </div>
      )}
      {structureEditMode &&
        canInlineStructureEdit &&
        !structEdit.loading &&
        structEdit.structure.length > 0 &&
        detailAnnexOptionsForSubLineModal.length === 0 && (
          <div className="border-b border-amber-200/90 bg-gradient-to-r from-amber-50 to-amber-50/30 px-8 py-3 text-sm text-amber-950">
            Aucune annexe disponible : définissez d&apos;abord des postes avec code parent et annexe dans la vue
            Sommaire.
          </div>
        )}

      {showStructureCols ? (
        <div className="border-t border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50">
          <div className="min-w-0 w-full overflow-x-auto">
            <table className="w-full min-w-0 table-fixed border-collapse">
              <colgroup>
                <col style={{ width: "38%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "35%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "2.75rem" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-slate-100/40 to-slate-50">
                  <th className="min-w-0 px-4 py-4 text-left pl-4 pr-3">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-white/80 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 ring-1 ring-slate-200/80">
                        Annexes
                      </span>
                      <span className="text-sm font-semibold text-slate-800">Postes liés aux annexes</span>
                    </span>
                  </th>
                  <th className="box-border px-2 py-4 text-center text-[11px] font-semibold text-slate-800">
                    Masquer
                  </th>
                  <th className="box-border px-2 py-4 text-center text-[11px] font-semibold text-slate-800">
                    Code de liaison
                  </th>
                  <th className="box-border px-2 py-4 text-center text-[11px] font-semibold text-slate-800">
                    Lettre
                  </th>
                  <th className="w-11 px-0 py-4" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {detailAnnexStructureTableLayout.map((entry, idx) => {
                  if (entry.kind === "placeholder") {
                    return (
                      <tr key={`ph-${entry.letter}-${idx}`} className="border-b border-slate-100">
                        <td className="px-4 py-3 text-sm text-slate-400">—</td>
                        <td className="box-border px-2 py-3 text-center text-sm text-slate-300">—</td>
                        <td className="box-border px-2 py-3 text-center text-sm text-slate-300">—</td>
                        <td className="box-border px-2 py-3 text-center text-sm text-slate-300">—</td>
                        <td className="w-11 px-0 py-3" aria-hidden />
                      </tr>
                    )
                  }
                  if (entry.kind === "annexSubtotal") {
                    return (
                      <tr key={`st-${entry.letter}-${idx}`} className="border-b border-slate-100">
                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">{`Sous-total — Annexe ${entry.letter}`}</td>
                        <td className="box-border px-2 py-3 text-center text-sm text-slate-300">—</td>
                        <td className="box-border px-2 py-3 text-center text-sm text-slate-300">—</td>
                        <td className="box-border px-2 py-3 text-center text-sm text-slate-300">—</td>
                        <td className="w-11 px-0 py-3" aria-hidden />
                      </tr>
                    )
                  }

                  const globalIdx = entry.globalIdx
                  const structRow = structEdit.structure[globalIdx] as Record<string, unknown>
                  const label = String(structRow?.label ?? "").trim()
                  const summaryAnnexLockedInDetail = isSummaryAnnexRowLockedInDetailEdit(structRow)
                  return (
                    <tr key={String(structRow?.id ?? globalIdx)} className="border-b border-slate-100">
                      <td className="min-w-0 px-4 py-3 text-sm font-medium text-slate-800">
                        {summaryAnnexLockedInDetail || isStructureRowDetailOnly(structRow) ? (
                          <span
                            className="block rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 py-2 text-sm text-slate-800"
                            title={
                              summaryAnnexLockedInDetail
                                ? "Libellé modifiable dans la vue Sommaire (Paramètres)"
                                : "Libellé défini par le plan standard (Codes de liaison)"
                            }
                          >
                            {label}
                          </span>
                        ) : (
                          <Input
                            value={String(structRow.label ?? "")}
                            onChange={(e) => structEdit.updateRow(globalIdx, { label: e.target.value })}
                            className="h-9 w-full max-w-full rounded-xl border-slate-200/90 bg-white text-sm shadow-sm focus-visible:border-[#E0742D]/50 focus-visible:ring-2 focus-visible:ring-[#E0742D]/20"
                          />
                        )}
                      </td>
                      <IncomeStatementStructureStudioCols
                        rowIndex={globalIdx}
                        structRow={structRow}
                        allLinkCodes={allLinkCodes}
                        linkCodeLabels={linkCodeLabels}
                        updateRow={structEdit.updateRow}
                        setShowInDetail={structEdit.setShowInDetail}
                        showRemoveButton={false}
                        onRemoveRow={structEdit.removeStructureRowAt}
                        mappingColumnsReadOnly={!isStructureRowDetailOnly(structRow)}
                        annexReadOnly={isStructureRowDetailOnly(structRow)}
                        hideDefineColumn
                        hideDtCtColumn
                        readOnlyLinkCode
                      />
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Table — en-tête et colonne Compte figés au défilement (comme Sommaire) */
      <div className="min-w-0 max-h-[min(72vh,56rem)] overflow-auto overscroll-contain bg-white">
        <table className="w-full min-w-full border-separate border-spacing-0">
          <thead
            className={cn(
              "[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-slate-100",
              "[&_th]:border-b-2 [&_th]:border-slate-200",
              "[&_th:first-child]:left-0 [&_th:first-child]:z-30",
            )}
          >
            <tr>
              <th
                className={cn(
                  "px-6 py-4 text-left text-sm font-semibold text-[#2A2F3A]",
                  view === "12months" ? "min-w-[20rem] sm:min-w-[24rem] lg:min-w-[30rem]" : "w-2/5"
                )}
              >
                Compte
              </th>
              {view === "current" && (
                <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Montant</th>
              )}
              {view === "comparison" && !isComparisonMode && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{getCurrentColumnLabel()}</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{getComparisonLabel()}</th>
                  {columnMode === "variationPercent" ? (
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation %</th>
                  ) : columnMode === "variationAmount" ? (
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation $</th>
                  ) : columnMode === "percentage" ? (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des actifs totaux</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des actifs totaux</th>
                    </>
                  ) : null}
                </>
              )}
              {view === "comparison" && isComparisonMode && (
                <>
                  {entitiesToCompare.map((entity) => (
                    <th key={entity.id} className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">
                      {entity.name}
                    </th>
                  ))}
                </>
              )}
              {view === "ddm" && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{getCurrentColumnLabel()}</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{getComparisonLabel()}</th>
                  {columnMode === "variationPercent" ? (
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation %</th>
                  ) : columnMode === "variationAmount" ? (
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation $</th>
                  ) : (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des actifs totaux</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des actifs totaux</th>
                    </>
                  )}
                </>
              )}
              {view === "ytd" && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">YTD {fiscalYear}</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">YTD {(fiscalYear ?? new Date().getFullYear()) - 1}</th>
                  {columnMode === "variationPercent" ? (
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation %</th>
                  ) : columnMode === "variationAmount" ? (
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation $</th>
                  ) : (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des actifs totaux</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des actifs totaux</th>
                    </>
                  )}
                </>
              )}
              {view === "12months" && (
                <>
                  {getMonthLabels().map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {view === "quarters" && (
                <>
                  {getQuarterLabels().map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {view === "years" && (
                <>
                  {getYearLabels().map((label, idx) => (
                    <th
                      key={idx}
                      className={cn(
                        "px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap",
                        isForecastSection && idx === 0 ? "bg-slate-50" : ""
                      )}
                    >
                      {label}
                    </th>
                  ))}
                </>
              )}
            </tr>
          </thead>
          <tbody
            className={cn(
              "[&_td]:border-b [&_td]:border-slate-200",
              "[&_td:first-child]:sticky [&_td:first-child]:left-0 [&_td:first-child]:z-10",
              "[&_td:first-child]:bg-white",
            )}
          >
            {data.map((row, idx) => {
              const variation = row.current && row.prior ? calculateVariation(row.current, row.prior) : null
              const variationAmount = row.current && row.prior ? row.current - row.prior : 0
              const isSpacer = row.label === ""
              const shouldHideAmounts = isSpacer || !!row.isSection || !!row.isAnnexPlaceholder || !!row.isAnnexTitle
              /** Hors Paramètres : libellé sous-total masqué (blanc) mais chiffres en noir. */
              const annexSubtotalDarkNumbers = !!row.isAnnexSubtotal
              const displayLabel = row.isSection ? capitalizeFirst(row.label) : row.label
              /** Séparateur toujours juste au-dessus du sous-total (pas sous le poste précédent / GL). */
              const isSubtotalRow = !!row.isSubtotal || !!row.isAnnexSubtotal
              
              // Expansion GL : tout poste mappé avec ≥1 compte GL
              const matchedStructureRow =
                displayStructure && row.rowId
                  ? findStructureRowForStatementLine(
                      row.rowId,
                      row.statementLabel ?? row.label,
                      displayStructure
                    )
                  : undefined
              const canExpand = balanceSheetDetailCanExpandGlAccounts(
                matchedStructureRow,
                standardLinkCodes,
                row
              )
              const isExpanded = row.rowId ? expandedRows.has(row.rowId) : false
              /** À l’ouverture : montants en graisse normale (pas gras). */
              const amountWeightClass =
                row.isBold && !isExpanded ? "font-semibold font-bold" : "text-slate-500"
              const amountWeightClassPrior =
                row.isBold && !isExpanded
                  ? "font-semibold font-bold text-slate-600"
                  : "text-slate-500"
              
              // Check if this row has a note
              const hasNote = row.rowId
                ? getNoteByRowId(row.rowId, "balance-sheet", period, view, companyId, divisionId, subDivisionId) !== null
                : false

              return (
                <Fragment key={idx}>
                  {isSubtotalRow && (
                    <tr aria-hidden data-testid="balance-sheet-detail-subtotal-separator">
                      <td
                        colSpan={detailTableColumnCount}
                        className="border-0 p-0 align-top leading-none border-t-2 border-t-slate-900"
                      />
                    </tr>
                  )}
                  <tr
                    ref={row.rowId ? (el) => { analysisRowRefs.current[row.rowId!] = el } : undefined}
                    className={cn(
                    row.label === "" ? "h-2" : "",
                    "hover:[&>td]:bg-slate-50/90 hover:[&>td:first-child]:bg-slate-50/90",
                    canExpand && "cursor-pointer"
                  )}
                  onClick={() => canExpand && toggleRow(row.rowId!)}
                  >
                    <td
                      className={cn(
                        "px-6 py-3 whitespace-nowrap",
                        annexSubtotalDarkNumbers ? "font-bold" : "",
                        row.isBold ? "font-bold text-slate-900" : "text-slate-700",
                        row.indent ? "pl-12" : ""
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {row.isAnnexPlaceholder ? (
                          // Comme Résultats : ligne indicatif masquée hors Paramètres
                          <span className="flex-1" aria-hidden />
                        ) : row.isAnnexSubtotal ? (
                          <span
                            className={cn(
                              "flex-1 font-semibold",
                              annexSubtotalDarkNumbers ? "text-white" : "text-slate-900"
                            )}
                          >
                            {displayLabel}
                          </span>
                        ) : (
                          <>
                            {canExpand && (
                              <span className="flex-shrink-0">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-slate-500" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-slate-500" />
                                )}
                              </span>
                            )}
                            {!canExpand && row.indent && <span className="w-4"></span>}
                            <span className="flex-1 whitespace-nowrap">{displayLabel}</span>
                          </>
                        )}
                        {row.rowId &&
                          row.hasLiaisonCode &&
                          !disableRowInteractions &&
                          !row.isAnnexPlaceholder &&
                          !row.isAnnexSubtotal &&
                          !row.isAnnexTitle && (
                          <BalanceSheetLineAnalysisTriggerButton
                            isActive={
                              lineAnalysis?.rowId === row.rowId || lineAnalysis?.parentRowId === row.rowId
                            }
                            hasNote={!!hasNote}
                            onClick={(e) => {
                              e.stopPropagation()
                              openOrToggleLineAnalysis({
                                rowId: row.rowId!,
                                label: displayLabel,
                                current: row.current,
                                prior: row.prior,
                                balanceAccounts: row.balanceAccounts,
                                trendValues: row.trendValues,
                              })
                            }}
                          />
                        )}
                      </div>
                    </td>

                  {view === "current" && (
                    <td
                      className={cn(
                        "px-6 py-3 text-right",
                        amountWeightClass,
                        shouldHideAmounts ? "text-white" : "",
                        annexSubtotalDarkNumbers ? "text-slate-900" : ""
                      )}
                    >
                      {row.current !== 0 ? formatCurrency(row.current) : "-"}
                    </td>
                  )}

                  {view === "comparison" && !isComparisonMode && (
                    <>
                      <td
                        className={cn(
                          "px-6 py-3 text-right",
                          amountWeightClass,
                          shouldHideAmounts ? "text-white" : "",
                          annexSubtotalDarkNumbers ? "text-slate-900" : ""
                        )}
                      >
                        {row.current !== 0 ? formatCurrency(row.current) : "-"}
                      </td>
                      <td
                        className={cn(
                          "px-6 py-3 text-right",
                          amountWeightClassPrior,
                          shouldHideAmounts ? "text-white" : "",
                          annexSubtotalDarkNumbers ? "text-slate-900" : ""
                        )}
                      >
                        {row.prior !== 0 ? formatCurrency(row.prior) : "-"}
                      </td>
                      {columnMode === "variationPercent" ? (
                        <td
                          className={`px-6 py-3 text-right font-semibold ${
                            variation && variation >= 0 ? "text-emerald-600" : "text-red-600"
                          } ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {variation !== null && row.current !== 0
                            ? `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%`
                            : "-"}
                        </td>
                      ) : columnMode === "variationAmount" ? (
                        <td
                          className={`px-6 py-3 text-right font-semibold ${
                            variationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                          } ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {row.current !== 0
                            ? `${variationAmount >= 0 ? "+" : ""}${formatCurrency(variationAmount)}`
                            : "-"}
                        </td>
                      ) : columnMode === "percentage" ? (
                        <>
                          <td className={`px-6 py-3 text-right ${amountWeightClass} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.current !== 0 ? `${getTotalAssetsPercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${amountWeightClassPrior} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.prior !== 0 ? `${getTotalAssetsPercentage(row.prior, true).toFixed(1)}%` : "-"}
                          </td>
                        </>
                      ) : null}
                    </>
                  )}
                  {view === "comparison" && isComparisonMode && (
                    <>
                      {entitiesToCompare.map((entity) => {
                        const entityRows = entityDataMap[entity.id] || []
                        const entityRow = entityRows.find(r => r.label === row.label) || row
                        return (
                          <td
                            key={entity.id}
                            className={`px-6 py-3 text-right ${amountWeightClass} ${shouldHideAmounts ? "text-white" : ""}`}
                          >
                            {entityRow.current !== 0 ? formatCurrency(entityRow.current) : "-"}
                          </td>
                        )
                      })}
                    </>
                  )}
                  {view === "ddm" && (
                    <>
                      <td
                        className={cn(
                          "px-6 py-3 text-right",
                          amountWeightClass,
                          shouldHideAmounts ? "text-white" : "",
                          annexSubtotalDarkNumbers ? "text-slate-900" : ""
                        )}
                      >
                        {row.current !== 0 ? formatCurrency(row.current) : "-"}
                      </td>
                      <td
                        className={cn(
                          "px-6 py-3 text-right",
                          amountWeightClassPrior,
                          shouldHideAmounts ? "text-white" : "",
                          annexSubtotalDarkNumbers ? "text-slate-900" : ""
                        )}
                      >
                        {row.prior !== 0 ? formatCurrency(row.prior) : "-"}
                      </td>
                      {columnMode === "variationPercent" ? (
                        <td
                          className={`px-6 py-3 text-right font-semibold ${
                            variation && variation >= 0 ? "text-emerald-600" : "text-red-600"
                          } ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {variation !== null && row.current !== 0
                            ? `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%`
                            : "-"}
                        </td>
                      ) : columnMode === "variationAmount" ? (
                        <td
                          className={`px-6 py-3 text-right font-semibold ${
                            variationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                          } ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {row.current !== 0
                            ? `${variationAmount >= 0 ? "+" : ""}${formatCurrency(variationAmount)}`
                            : "-"}
                        </td>
                      ) : (
                        <>
                          <td className={`px-6 py-3 text-right ${amountWeightClass} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.current !== 0 ? `${getTotalAssetsPercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${amountWeightClassPrior} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.prior !== 0 ? `${getTotalAssetsPercentage(row.prior, true).toFixed(1)}%` : "-"}
                          </td>
                        </>
                      )}
                    </>
                  )}

                  {view === "ytd" && (
                    <>
                      <td
                        className={cn(
                          "px-6 py-3 text-right",
                          amountWeightClass,
                          shouldHideAmounts ? "text-white" : "",
                          annexSubtotalDarkNumbers ? "text-slate-900" : ""
                        )}
                      >
                        {row.current !== 0 ? formatCurrency(row.current) : "-"}
                      </td>
                      <td
                        className={cn(
                          "px-6 py-3 text-right",
                          amountWeightClassPrior,
                          shouldHideAmounts ? "text-white" : "",
                          annexSubtotalDarkNumbers ? "text-slate-900" : ""
                        )}
                      >
                        {row.prior !== 0 ? formatCurrency(row.prior) : "-"}
                      </td>
                      {columnMode === "variationPercent" ? (
                        <td
                          className={`px-6 py-3 text-right font-semibold ${
                            variation && variation >= 0 ? "text-emerald-600" : "text-red-600"
                          } ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {variation !== null && row.current !== 0
                            ? `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%`
                            : "-"}
                        </td>
                      ) : columnMode === "variationAmount" ? (
                        <td
                          className={`px-6 py-3 text-right font-semibold ${
                            variationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                          } ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {row.current !== 0
                            ? `${variationAmount >= 0 ? "+" : ""}${formatCurrency(variationAmount)}`
                            : "-"}
                        </td>
                      ) : (
                        <>
                          <td className={`px-6 py-3 text-right ${amountWeightClass} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.current !== 0 ? `${getTotalAssetsPercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${amountWeightClassPrior} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.prior !== 0 ? `${getTotalAssetsPercentage(row.prior, true).toFixed(1)}%` : "-"}
                          </td>
                        </>
                      )}
                    </>
                  )}

                  {/* Trend Views - 12 months, quarters, years */}
                  {view === "12months" && row.trendValues && (
                    <>
                      {row.trendValues.map((value, valueIdx) => (
                        <td
                          key={valueIdx}
                          className={cn(
                            "px-4 py-3 text-right",
                            row.isBold && !isExpanded ? "font-semibold font-bold" : "font-normal text-slate-600",
                            shouldHideAmounts ? "text-white" : "",
                            annexSubtotalDarkNumbers ? "text-slate-900" : ""
                          )}
                        >
                          {columnMode === "percentage"
                            ? (value !== 0 ? `${getTrendTotalAssetsPercentage(value, valueIdx).toFixed(1)}%` : "-")
                            : columnMode === "variationAmount" || columnMode === "variationPercent"
                              ? (() => {
                                  const trendVariation = getTrendVariation(row.trendValues ?? [], valueIdx)
                                  const trendVariationAmount = getTrendVariationAmount(row.trendValues ?? [], valueIdx)
                                  if (columnMode === "variationPercent") {
                                    return trendVariation !== null ? `${trendVariation >= 0 ? "+" : ""}${trendVariation.toFixed(1)}%` : "-"
                                  }
                                  return trendVariationAmount !== null
                                    ? `${trendVariationAmount >= 0 ? "+" : ""}${formatCurrency(trendVariationAmount)}`
                                    : "-"
                                })()
                              : (value !== 0 ? formatCurrency(value) : "-")}
                        </td>
                      ))}
                    </>
                  )}
                  {view === "quarters" && row.trendValues && (
                    <>
                      {row.trendValues.map((value, valueIdx) => (
                        <td
                          key={valueIdx}
                          className={cn(
                            "px-4 py-3 text-right",
                            row.isBold && !isExpanded ? "font-semibold font-bold" : "font-normal text-slate-600",
                            shouldHideAmounts ? "text-white" : "",
                            annexSubtotalDarkNumbers ? "text-slate-900" : ""
                          )}
                        >
                          {columnMode === "percentage"
                            ? (value !== 0 ? `${getTrendTotalAssetsPercentage(value, valueIdx).toFixed(1)}%` : "-")
                            : columnMode === "variationAmount" || columnMode === "variationPercent"
                              ? (() => {
                                  const trendVariation = getTrendVariation(row.trendValues ?? [], valueIdx)
                                  const trendVariationAmount = getTrendVariationAmount(row.trendValues ?? [], valueIdx)
                                  if (columnMode === "variationPercent") {
                                    return trendVariation !== null ? `${trendVariation >= 0 ? "+" : ""}${trendVariation.toFixed(1)}%` : "-"
                                  }
                                  return trendVariationAmount !== null
                                    ? `${trendVariationAmount >= 0 ? "+" : ""}${formatCurrency(trendVariationAmount)}`
                                    : "-"
                                })()
                              : (value !== 0 ? formatCurrency(value) : "-")}
                        </td>
                      ))}
                    </>
                  )}
                  {view === "years" && row.trendValues && (
                    <>
                      {row.trendValues.map((value, valueIdx) => (
                          <td
                            key={valueIdx}
                            className={cn(
                              "px-4 py-3 text-right",
                              row.isBold && !isExpanded ? "font-semibold font-bold" : "font-normal text-slate-600",
                              shouldHideAmounts ? "text-white" : "",
                              annexSubtotalDarkNumbers ? "text-slate-900" : "",
                              isForecastSection && valueIdx === 0 ? "bg-slate-50" : ""
                            )}
                          >
                            {columnMode === "percentage"
                              ? (value !== 0 ? `${getTrendTotalAssetsPercentage(value, valueIdx).toFixed(1)}%` : "-")
                              : columnMode === "variationAmount" || columnMode === "variationPercent"
                                ? (() => {
                                    const trendVariation = getTrendVariation(row.trendValues ?? [], valueIdx)
                                    const trendVariationAmount = getTrendVariationAmount(row.trendValues ?? [], valueIdx)
                                    if (columnMode === "variationPercent") {
                                      return trendVariation !== null ? `${trendVariation >= 0 ? "+" : ""}${trendVariation.toFixed(1)}%` : "-"
                                    }
                                    return trendVariationAmount !== null
                                      ? `${trendVariationAmount >= 0 ? "+" : ""}${formatCurrency(trendVariationAmount)}`
                                      : "-"
                                  })()
                                : (value !== 0 ? formatCurrency(value) : "-")}
                          </td>
                      ))}
                    </>
                  )}
                  {/* Empty cells for spacer rows in trend views */}
                  {(view === "12months" || view === "quarters" || view === "years") && !row.trendValues && (
                    <>
                      {Array.from({
                        length:
                          view === "12months" ? 12 : view === "quarters" ? 5 : isForecastSection ? forecastYearColumnCount : 6,
                      }).map((_, idx) => (
                          <td 
                            key={idx} 
                            className={cn(
                              "px-4 py-3 text-right font-semibold text-white",
                              annexSubtotalDarkNumbers ? "text-slate-900" : "",
                              isForecastSection && view === "years" && idx === 0 ? "bg-slate-50" : ""
                            )}
                          >
                            -
                          </td>
                      ))}
                    </>
                  )}
                </tr>
                  {/* Expanded balance accounts */}
                  {isExpanded && canExpand && row.balanceAccounts && row.balanceAccounts.length > 0 && (
                    <>
                      {row.balanceAccounts.map((account, accIdx) => {
                        const accountVariation = account.priorAmount !== undefined && account.amount && account.priorAmount
                          ? calculateVariation(account.amount, account.priorAmount)
                          : null
                        const accountVariationAmount = account.priorAmount !== undefined && account.amount && account.priorAmount
                          ? account.amount - account.priorAmount
                          : 0
                        
                        return (
                          <tr key={`${idx}-account-${accIdx}`} className="[&>td]:bg-slate-50 [&>td:first-child]:bg-slate-50">
                            <td className="px-6 py-2 text-slate-500 pl-20 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-slate-500">{account.accountNumber}</span>
                                <span className="text-sm whitespace-nowrap">{account.accountName}</span>
                              </div>
                            </td>
                            
                            {view === "current" && (
                              <td className="px-6 py-2 text-right font-normal text-sm text-slate-700">
                                {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                              </td>
                            )}
                            
                            {view === "comparison" && !isComparisonMode && (
                              <>
                                <td className="px-6 py-2 text-right font-normal text-sm text-slate-700">
                                  {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                                </td>
                                <td className="px-6 py-2 text-right font-normal text-sm text-slate-500">
                                  {account.priorAmount !== undefined && account.priorAmount !== 0 ? formatCurrency(account.priorAmount) : "-"}
                                </td>
                                {columnMode === "variationPercent" ? (
                                  <td
                                    className={`px-6 py-2 text-right font-normal text-sm ${
                                      accountVariation && accountVariation >= 0 ? "text-emerald-600" : "text-red-600"
                                    }`}
                                  >
                                    {accountVariation !== null && account.amount !== 0
                                      ? `${accountVariation >= 0 ? "+" : ""}${accountVariation.toFixed(1)}%`
                                      : "-"}
                                  </td>
                                ) : columnMode === "variationAmount" ? (
                                  <td
                                    className={`px-6 py-2 text-right font-normal text-sm ${
                                      accountVariationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                                    }`}
                                  >
                                    {account.amount !== 0
                                      ? `${accountVariationAmount >= 0 ? "+" : ""}${formatCurrency(accountVariationAmount)}`
                                      : "-"}
                                  </td>
                                ) : columnMode === "percentage" ? (
                                  <>
                                    <td className="px-6 py-2 text-right font-normal text-sm text-slate-700">
                                      {account.amount !== 0 ? `${getTotalAssetsPercentage(account.amount, false).toFixed(1)}%` : "-"}
                                    </td>
                                    <td className="px-6 py-2 text-right font-normal text-sm text-slate-500">
                                      {account.priorAmount !== undefined && account.priorAmount !== 0 ? `${getTotalAssetsPercentage(account.priorAmount, true).toFixed(1)}%` : "-"}
                                    </td>
                                  </>
                                ) : null}
                              </>
                            )}
                            
                            {view === "ddm" && (
                              <>
                                <td className="px-6 py-2 text-right font-normal text-sm text-slate-700">
                                  {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                                </td>
                                <td className="px-6 py-2 text-right font-normal text-sm text-slate-500">
                                  {account.priorAmount !== undefined && account.priorAmount !== 0 ? formatCurrency(account.priorAmount) : "-"}
                                </td>
                                {columnMode === "variationPercent" ? (
                                  <td
                                    className={`px-6 py-2 text-right font-normal text-sm ${
                                      accountVariation && accountVariation >= 0 ? "text-emerald-600" : "text-red-600"
                                    }`}
                                  >
                                    {accountVariation !== null && account.amount !== 0
                                      ? `${accountVariation >= 0 ? "+" : ""}${accountVariation.toFixed(1)}%`
                                      : "-"}
                                  </td>
                                ) : columnMode === "variationAmount" ? (
                                  <td
                                    className={`px-6 py-2 text-right font-normal text-sm ${
                                      accountVariationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                                    }`}
                                  >
                                    {account.amount !== 0
                                      ? `${accountVariationAmount >= 0 ? "+" : ""}${formatCurrency(accountVariationAmount)}`
                                      : "-"}
                                  </td>
                                ) : (
                                  <>
                                    <td className="px-6 py-2 text-right font-normal text-sm text-slate-700">
                                      {account.amount !== 0 ? `${getTotalAssetsPercentage(account.amount, false).toFixed(1)}%` : "-"}
                                    </td>
                                    <td className="px-6 py-2 text-right font-normal text-sm text-slate-500">
                                      {account.priorAmount !== undefined && account.priorAmount !== 0 ? `${getTotalAssetsPercentage(account.priorAmount, true).toFixed(1)}%` : "-"}
                                    </td>
                                  </>
                                )}
                              </>
                            )}
                            
                            {view === "ytd" && (
                              <>
                                <td className="px-6 py-2 text-right font-normal text-sm text-slate-700">
                                  {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                                </td>
                                <td className="px-6 py-2 text-right font-normal text-sm text-slate-500">
                                  {account.priorAmount !== undefined && account.priorAmount !== 0 ? formatCurrency(account.priorAmount) : "-"}
                                </td>
                                {columnMode === "variationPercent" ? (
                                  <td
                                    className={`px-6 py-2 text-right font-normal text-sm ${
                                      accountVariation && accountVariation >= 0 ? "text-emerald-600" : "text-red-600"
                                    }`}
                                  >
                                    {accountVariation !== null && account.amount !== 0
                                      ? `${accountVariation >= 0 ? "+" : ""}${accountVariation.toFixed(1)}%`
                                      : "-"}
                                  </td>
                                ) : columnMode === "variationAmount" ? (
                                  <td
                                    className={`px-6 py-2 text-right font-normal text-sm ${
                                      accountVariationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                                    }`}
                                  >
                                    {account.amount !== 0
                                      ? `${accountVariationAmount >= 0 ? "+" : ""}${formatCurrency(accountVariationAmount)}`
                                      : "-"}
                                  </td>
                                ) : (
                                  <>
                                    <td className="px-6 py-2 text-right font-normal text-sm text-slate-700">
                                      {account.amount !== 0 ? `${getTotalAssetsPercentage(account.amount, false).toFixed(1)}%` : "-"}
                                    </td>
                                    <td className="px-6 py-2 text-right font-normal text-sm text-slate-500">
                                      {account.priorAmount !== undefined && account.priorAmount !== 0 ? `${getTotalAssetsPercentage(account.priorAmount, true).toFixed(1)}%` : "-"}
                                    </td>
                                  </>
                                )}
                              </>
                            )}
                            
                            {(view === "12months" || view === "quarters" || view === "years") && row.trendValues && account.proportion !== undefined && (
                              <>
                                {row.trendValues.map((value, valueIdx) => {
                                  const accountValue = Math.round(value * account.proportion!)
                                  return (
                                    <td
                                      key={valueIdx}
                                      className={cn(
                                        "px-4 py-2 text-right font-normal text-sm text-slate-700",
                                        isForecastSection && view === "years" && valueIdx === 0 ? "bg-slate-50" : ""
                                      )}
                                    >
                                      {accountValue !== 0 ? formatCurrency(accountValue) : "-"}
                                    </td>
                                  )
                                })}
                              </>
                            )}
                            
                            {(view === "12months" || view === "quarters" || view === "years") && !row.trendValues && (
                              <>
                                {Array.from({
                                  length:
                                    view === "12months"
                                      ? 12
                                      : view === "quarters"
                                        ? 5
                                        : isForecastSection
                                          ? forecastYearColumnCount
                                          : 6,
                                }).map((_, emptyIdx) => (
                                    <td 
                                      key={emptyIdx} 
                                      className={cn(
                                        "px-4 py-2 text-right font-normal text-sm text-slate-400",
                                        isForecastSection && view === "years" && emptyIdx === 0 ? "bg-slate-50" : ""
                                      )}
                                    >
                                      -
                                    </td>
                                ))}
                              </>
                            )}
                            
                            {view === "comparison" && isComparisonMode && (
                              <>
                                {entitiesToCompare.map((entity) => {
                                  const entityRows = entityDataMap[entity.id] || []
                                  const entityRow = entityRows.find(r => r.label === row.label) || row
                                  const accountAmount = account.proportion !== undefined
                                    ? Math.round(entityRow.current * account.proportion)
                                    : account.amount
                                  return (
                                    <td
                                      key={entity.id}
                                      className="px-6 py-2 text-right font-normal text-sm text-slate-700"
                                    >
                                      {accountAmount !== 0 ? formatCurrency(accountAmount) : "-"}
                                    </td>
                                  )
                                })}
                              </>
                            )}
                          </tr>
                        )
                      })}
                    </>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* Footer note */}
      <div className="border-t border-slate-200 bg-slate-50/90 px-6 py-4 sm:px-7">
        <p className={cn("text-xs", dashboardCardBodyMutedClass)}>
          Note: Les données affichées sont à titre informatif. Consulter les états financiers audités pour les montants
          officiels.
        </p>
      </div>

      {lineAnalysis && !disableRowInteractions && (
        <BalanceSheetLineAnalysisAside
          lineAnalysis={lineAnalysis}
          setLineAnalysis={setLineAnalysis}
          data={data}
          companies={companies}
          companyId={companyId}
          divisionId={divisionId}
          subDivisionId={subDivisionId}
          period={period}
          view={view}
          columnMode={columnMode}
          comparisonType={comparisonType}
          selectedBudgetName={selectedBudgetName}
          refMonth={refMonth}
          refYear={refYear}
          fiscalYear={fiscalYear}
          structureVersion={structureVersion}
          isComparisonMode={!!isComparisonMode}
          getComparisonLabel={getComparisonLabel}
          getTotalAssetsPercentage={getTotalAssetsPercentage}
          analysisRowRefs={analysisRowRefs}
          onNotesUpdated={() => setNotesUpdated((n) => n + 1)}
          cardRef={analysisCardRef}
        />
      )}
      </div>
    </div>
  )
}

