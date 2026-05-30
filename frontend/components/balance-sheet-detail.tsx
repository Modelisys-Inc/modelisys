"use client"

import { Fragment, useCallback, useMemo, useState, useEffect } from "react"
import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import type { FinancialStatementRow } from "@/lib/api"
import { getFinancialStatementSeries, getStatementStructure, type FinancialStatementSeriesParams } from "@/lib/api"
import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { IncomeStatementStructureStudioCols } from "@/components/income-statement-structure-studio-cols"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookMarked, ChevronLeft, ChevronRight, ChevronDown, ListTree, Loader2, Plus, Settings, Sparkles, StickyNote } from "lucide-react"
import { NoteModal } from "@/components/note-modal"
import { getNoteByRowId, useNotesCache } from "@/lib/notes-storage"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { useBalanceSheetStructureEdit } from "@/hooks/use-income-statement-structure-edit"
import {
  collectDistinctLinkCodesFromStructure,
  mapLinkCodesToOwnerLabel,
  detailLineLabelForDisplay,
  findStructureRowForStatementLine,
  getStructureRowGlobalIndex,
  isCodeMappingEnabled,
  isShowInDetail,
  listAnnexOptionsForDetailSubLineModal,
  isStructureRowDetailOnly,
  isStructureRowInDetailAnnexEditor,
  isSummaryAnnexRowLockedInDetailEdit,
  normLabel,
  normalizeAnnexLetter,
} from "@/lib/income-statement-structure-utils"
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
  dashboardCardAccentBarClass,
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
  /** Titre de la carte (défaut : Détail) — aligné sur l’état des résultats */
  title?: string
  showBalanceSheetStructureSettings?: boolean
  structureVersion?: number
  onBalanceSheetStructureSaved?: () => void
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
}

function zeroAmountsForAnnexTitleRow<T extends DetailRow>(row: T): T {
  if (!row.isAnnexTitle) return row
  return {
    ...row,
    current: 0,
    prior: 0,
    trendValues: row.trendValues ? row.trendValues.map(() => 0) : undefined,
  }
}

function sumAnnexGroupRows(rows: DetailRow[]): { current: number; prior: number; trendValues?: number[] } {
  let current = 0
  let prior = 0
  let trendLen = 0
  for (const r of rows) {
    if (r.isAnnexTitle) continue
    current += r.current ?? 0
    prior += r.prior ?? 0
    if (r.trendValues?.length) trendLen = Math.max(trendLen, r.trendValues.length)
  }
  if (trendLen === 0) return { current, prior }
  const trendValues = Array(trendLen).fill(0)
  for (const r of rows) {
    if (r.isAnnexTitle) continue
    if (!r.trendValues?.length) continue
    for (let k = 0; k < r.trendValues.length; k++) {
      trendValues[k] = (trendValues[k] ?? 0) + (r.trendValues[k] ?? 0)
    }
  }
  return { current, prior, trendValues }
}

function buildAnnexSubtotalDetailRow(
  letter: string,
  agg: { current: number; prior: number; trendValues?: number[] }
): DetailRow {
  return {
    label: `Sous-total — Annexe ${letter}`,
    statementLabel: `__annex_subtotal__${letter}`,
    current: agg.current,
    prior: agg.prior,
    // Aligné sur la présentation Résultats: le sous-total ne force pas le gras.
    isBold: false,
    isSubtotal: true,
    isAnnexSubtotal: true,
    annexLetter: letter,
    ...(agg.trendValues ? { trendValues: [...agg.trendValues] } : {}),
  }
}

function buildAnnexPlaceholderDetailRow(letter: string, trendValuesLength?: number): DetailRow {
  const pad = trendValuesLength && trendValuesLength > 0 ? Array(trendValuesLength).fill(0) : undefined
  return {
    label: "Ligne vide — renommez ou supprimez",
    statementLabel: `__annex_placeholder__${letter}`,
    current: 0,
    prior: 0,
    isAnnexPlaceholder: true,
    annexLetter: letter,
    ...(pad ? { trendValues: [...pad] } : {}),
  }
}

function insertAnnexDetailPlaceholderRows(rows: DetailRow[], trendValuesLength?: number): DetailRow[] {
  const out: DetailRow[] = []
  let i = 0
  while (i < rows.length) {
    const letter = normalizeAnnexLetter(String(rows[i].annexLetter ?? ""))
    if (letter) {
      let j = i
      const groupRows: DetailRow[] = []
      while (j < rows.length && normalizeAnnexLetter(String(rows[j].annexLetter ?? "")) === letter) {
        groupRows.push(rows[j])
        out.push(rows[j])
        j++
      }
      const agg = sumAnnexGroupRows(groupRows)
      out.push(buildAnnexSubtotalDetailRow(letter, agg))
      out.push(buildAnnexPlaceholderDetailRow(letter, trendValuesLength))
      i = j
    } else {
      out.push(rows[i])
      i++
    }
  }
  return out
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
}: BalanceSheetDetailProps) {
  useNotesCache(companyId ?? null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [statementStructure, setStatementStructure] = useState<Record<string, unknown>[] | null>(null)
  const [structureEditMode, setStructureEditMode] = useState(false)
  const [detailAddModalOpen, setDetailAddModalOpen] = useState(false)
  const [detailAddModalStep, setDetailAddModalStep] = useState<"pickAnnex" | "form">("pickAnnex")
  const [detailAddSelectedLetter, setDetailAddSelectedLetter] = useState<string | null>(null)
  const [detailAddFormLabel, setDetailAddFormLabel] = useState("")
  const [detailAddFormLinkCode, setDetailAddFormLinkCode] = useState("")
  const [detailAddFormDtCt, setDetailAddFormDtCt] = useState<"DT" | "CT" | "">("")
  const [detailAddFormError, setDetailAddFormError] = useState<string | null>(null)
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [selectedRowLabel, setSelectedRowLabel] = useState<string>("")
  const [selectedRowFinancialData, setSelectedRowFinancialData] = useState<{
    currentAmount?: number | null
    priorAmount?: number | null
    variationPercent?: number | null
    variationAmount?: number | null
  }>({})
  const [notesUpdated, setNotesUpdated] = useState(0) // Force re-render when notes change

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
  const structEdit = useBalanceSheetStructureEdit(companyId ?? null, structureEditMode && canInlineStructureEdit)
  const allLinkCodes = useMemo(
    () => collectDistinctLinkCodesFromStructure(structEdit.structure),
    [structEdit.structure]
  )
  const linkCodeLabels = useMemo(
    () => mapLinkCodesToOwnerLabel(structEdit.structure),
    [structEdit.structure]
  )

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

  const resetDetailAddModal = useCallback(() => {
    setDetailAddModalStep("pickAnnex")
    setDetailAddSelectedLetter(null)
    setDetailAddFormLabel("")
    setDetailAddFormLinkCode("")
    setDetailAddFormDtCt("")
    setDetailAddFormError(null)
  }, [])

  const handleDetailAddModalOpenChange = useCallback(
    (open: boolean) => {
      setDetailAddModalOpen(open)
      if (!open) resetDetailAddModal()
    },
    [resetDetailAddModal]
  )

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
    enabled: isMultiPeriod,
  })

  const filterSeriesRowsDefinedOnly = useCallback((rows: SeriesRow[], structure: Record<string, unknown>[]) => {
    const defined = rows.filter((row) => {
      const sr = findStructureRowForStatementLine(row.id, row.label, structure)
      return sr !== undefined && isShowInDetail(sr) && isCodeMappingEnabled(sr)
    })
    return [...defined].sort((a, b) => {
      const srA = findStructureRowForStatementLine(a.id, a.label, structure)!
      const srB = findStructureRowForStatementLine(b.id, b.label, structure)!
      return getStructureRowGlobalIndex(srA, structure) - getStructureRowGlobalIndex(srB, structure)
    })
  }, [])

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

  // Helper function to check if notes are allowed for this view
  const isNoteAllowed = (): boolean => {
    return view === "current" || view === "comparison" || view === "ytd" || view === "ddm"
  }

  const mapBackendRowsDefinedOnly = (apiRows: FinancialStatementRow[], structure: Record<string, unknown>[]): DetailRow[] => {
    const defined = apiRows.filter((row) => {
      const sr = findStructureRowForStatementLine(row.id, row.label, structure)
      return sr !== undefined && isShowInDetail(sr) && isCodeMappingEnabled(sr)
    })
    const sorted = [...defined].sort((a, b) => {
      const srA = findStructureRowForStatementLine(a.id, a.label, structure)!
      const srB = findStructureRowForStatementLine(b.id, b.label, structure)!
      return getStructureRowGlobalIndex(srA, structure) - getStructureRowGlobalIndex(srB, structure)
    })
    return sorted.map((row) => {
      const sr = findStructureRowForStatementLine(row.id, row.label, structure)!
      const sub = isStructureRowDetailOnly(sr)
      const isAnnexTitle = !sub && normalizeAnnexLetter(String(row.annexLetter ?? "")) !== ""
      const balanceAccounts =
        row.detailRows && row.detailRows.length > 0
          ? row.detailRows.map((dr) => ({
              accountNumber: dr.id,
              accountName: dr.label,
              amount: dr.current ?? 0,
              priorAmount: dr.prior,
            }))
          : undefined
      return zeroAmountsForAnnexTitleRow({
        label: detailLineLabelForDisplay(sr, row.label, row.annexLetter),
        statementLabel: row.label,
        annexLetter: String(row.annexLetter ?? ""),
        current: row.current ?? 0,
        prior: row.prior ?? 0,
        indent: sub,
        isBold: sub ? false : true,
        isSubtotal: row.isResult,
        isSection: row.isSection ?? false,
        isAnnexTitle,
        balanceAccounts,
        rowId: row.id,
      })
    })
  }

  const getSeriesDetailRows = (): DetailRow[] => {
    if (!seriesRows.length || !periods.length || !statementStructure) return []
    const sorted = filterSeriesRowsDefinedOnly(seriesRows, statementStructure)
    return sorted.map((row) => {
      const trend = monthTrendFromReference(row, periods as SeriesPeriod[], refMonth, refYear, 12)
      const lastAmount = trend[0] || 0
      const priorAmount = trend.length >= 2 ? trend[1] || 0 : 0
      const sr = findStructureRowForStatementLine(row.id, row.label, statementStructure)
      const sub = sr ? isStructureRowDetailOnly(sr) : false
      const isAnnexTitle = !sub && normalizeAnnexLetter(String(row.annexLetter ?? "")) !== ""
      return zeroAmountsForAnnexTitleRow({
        label: detailLineLabelForDisplay(sr, row.label, row.annexLetter),
        statementLabel: row.label,
        annexLetter: String(row.annexLetter ?? ""),
        current: lastAmount,
        prior: priorAmount,
        isBold: !sub,
        isSection: row.isSection ?? false,
        isSubtotal: row.isResult,
        indent: sub,
        isAnnexTitle,
        trendValues: trend,
        rowId: row.id,
      })
    })
  }

  const getSeriesQuarterRows = (): DetailRow[] => {
    if (!seriesRows.length || !periods.length || !statementStructure) return []
    const sorted = filterSeriesRowsDefinedOnly(seriesRows, statementStructure)
    return sorted.map((row) => {
      const trend = quarterTrendFromReference(row, periods as SeriesPeriod[], refMonth, refYear, 5)
      const lastAmount = trend[0] || 0
      const priorAmount = trend.length >= 2 ? trend[1] || 0 : 0
      const sr = findStructureRowForStatementLine(row.id, row.label, statementStructure)
      const sub = sr ? isStructureRowDetailOnly(sr) : false
      const isAnnexTitle = !sub && normalizeAnnexLetter(String(row.annexLetter ?? "")) !== ""
      return zeroAmountsForAnnexTitleRow({
        label: detailLineLabelForDisplay(sr, row.label, row.annexLetter),
        statementLabel: row.label,
        annexLetter: String(row.annexLetter ?? ""),
        current: lastAmount,
        prior: priorAmount,
        isBold: !sub,
        isSection: row.isSection ?? false,
        isSubtotal: row.isResult,
        indent: sub,
        isAnnexTitle,
        trendValues: trend,
        rowId: row.id,
      })
    })
  }

  const getSeriesYearRows = (): DetailRow[] => {
    if (!seriesRows.length || !periods.length || !statementStructure) return []
    const sorted = filterSeriesRowsDefinedOnly(seriesRows, statementStructure)
    return sorted.map((row) => {
      const trend = yearTrendFromReference(row, periods as SeriesPeriod[], refYear, 6)
      const lastAmount = trend[0] || 0
      const priorAmount = trend.length >= 2 ? trend[1] || 0 : 0
      const sr = findStructureRowForStatementLine(row.id, row.label, statementStructure)
      const sub = sr ? isStructureRowDetailOnly(sr) : false
      const isAnnexTitle = !sub && normalizeAnnexLetter(String(row.annexLetter ?? "")) !== ""
      return zeroAmountsForAnnexTitleRow({
        label: detailLineLabelForDisplay(sr, row.label, row.annexLetter),
        statementLabel: row.label,
        annexLetter: String(row.annexLetter ?? ""),
        current: lastAmount,
        prior: priorAmount,
        isBold: !sub,
        isSection: row.isSection ?? false,
        isSubtotal: row.isResult,
        indent: sub,
        isAnnexTitle,
        trendValues: trend,
        rowId: row.id,
      })
    })
  }

  const getDetailData = (): DetailRow[] => {
    if (view === "12months") return getSeriesDetailRows()
    if (view === "quarters") return getSeriesQuarterRows()
    if (view === "years") return getSeriesYearRows()
    if (backendRows.length > 0) {
      if (statementStructure === null) return []
      if (statementStructure && statementStructure.length > 0) {
        return mapBackendRowsDefinedOnly(backendRows, statementStructure)
      }
      return []
    }
    return []
  }

  // Helper function to capitalize first letter
  const capitalizeFirst = (str: string): string => {
    if (!str) return str
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  let data = getDetailData()

  if (title === "Détail") {
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

  if (loading || (isMultiPeriod && seriesLoading) || entityDataLoading) {
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
                  Ajoutez des sous-lignes par annexe. Elles n&apos;apparaissent qu&apos;ici, pas au Sommaire.
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
                  className="gap-1.5 rounded-xl text-[#2A2F3A] hover:bg-slate-100"
                  disabled={structEdit.loading || detailAnnexOptionsForSubLineModal.length === 0}
                  onClick={() => {
                    resetDetailAddModal()
                    setDetailAddModalOpen(true)
                  }}
                >
                  <Plus className={cn("h-4 w-4", dashboardCardAccentClass)} />
                  Ajouter un poste
                </Button>
                <Separator orientation="vertical" className="hidden h-7 sm:block" />
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
            Aucune annexe disponible : définissez d&apos;abord des postes avec liaison et annexe dans la vue Sommaire.
          </div>
        )}

      <Dialog open={detailAddModalOpen} onOpenChange={handleDetailAddModalOpenChange}>
        <DialogContent
          showCloseButton
          className="top-[max(0.75rem,env(safe-area-inset-top))] flex max-h-[calc(100dvh-1.5rem)] w-[min(100%,calc(100vw-1rem))] max-w-2xl translate-y-0 flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl shadow-slate-900/10 sm:max-w-2xl"
        >
          {detailAddModalStep === "pickAnnex" ? (
            <>
              <div className="flex shrink-0 items-start gap-3 border-b border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
                <div className={cn("mt-0.5 h-11 w-1.5 shrink-0", dashboardCardAccentBarClass)} />
                <DialogHeader className="min-w-0 flex-1 gap-0 space-y-2 text-left sm:text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <DialogTitle className={cn("text-lg", dashboardCardTitleClass)}>Choisir une annexe</DialogTitle>
                    <Badge
                      variant="secondary"
                      className="border border-slate-200 bg-slate-100/90 font-medium text-[#2A2F3A] shadow-none"
                    >
                      <Sparkles className="h-3 w-3 text-[#E0742D]" />
                      Détail
                    </Badge>
                  </div>
                  <DialogDescription className={cn("text-sm leading-relaxed", dashboardCardBodyMutedClass)}>
                    Sélectionnez l&apos;annexe sous laquelle le nouveau poste sera inséré comme{" "}
                    <span className="font-medium text-[#2A2F3A]">sous-catégorie</span>, puis renseignez son libellé et sa
                    liaison à l&apos;étape suivante.
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Annexes disponibles</p>
                <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-1.5 shadow-inner shadow-slate-900/[0.03]">
                  {detailAnnexOptionsForSubLineModal.map(({ letter, title }) => (
                    <button
                      key={letter}
                      type="button"
                      className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-left transition hover:border-slate-200/90 hover:bg-white hover:shadow-sm"
                      onClick={() => {
                        setDetailAddSelectedLetter(letter)
                        setDetailAddFormLabel("")
                        setDetailAddFormLinkCode("")
                        setDetailAddFormDtCt("")
                        setDetailAddFormError(null)
                        setDetailAddModalStep("form")
                      }}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80 transition group-hover:bg-[#E0742D]/[0.08] group-hover:ring-[#E0742D]/30">
                        <BookMarked className="h-4 w-4 text-[#E0742D]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Annexe
                        </span>
                        <span className="mt-0.5 block truncate text-sm font-semibold leading-snug text-[#2A2F3A]">
                          {title}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                {detailAnnexOptionsForSubLineModal.length === 0 && (
                  <p className={cn("mt-4 text-center text-sm", dashboardCardBodyMutedClass)}>
                    Aucune annexe : configurez d&apos;abord des postes avec liaison et annexe dans le Sommaire.
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex shrink-0 items-start gap-3 border-b border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
                <div className={cn("mt-0.5 h-11 w-1.5 shrink-0", dashboardCardAccentBarClass)} />
                <DialogHeader className="min-w-0 flex-1 gap-0 space-y-2 text-left sm:text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <DialogTitle className={cn("text-lg", dashboardCardTitleClass)}>Nouveau poste</DialogTitle>
                    <Badge
                      variant="secondary"
                      className="border border-slate-200 bg-slate-100/90 font-medium text-[#2A2F3A] shadow-none"
                    >
                      <Sparkles className="h-3 w-3 text-[#E0742D]" />
                      Détail
                    </Badge>
                  </div>
                  <DialogDescription className={cn("text-sm leading-relaxed", dashboardCardBodyMutedClass)}>
                    {detailAddSelectedLetter &&
                      (() => {
                        const opt = detailAnnexOptionsForSubLineModal.find((o) => o.letter === detailAddSelectedLetter)
                        return (
                          <>
                            Sous-catégorie pour l&apos;annexe{" "}
                            <span className="font-semibold text-[#2A2F3A]">
                              {detailAddSelectedLetter}
                              {opt?.title ? ` — ${opt.title}` : ""}
                            </span>
                            . Les montants suivront le DT/CT choisi.
                          </>
                        )
                      })()}
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="detail-add-label" className="text-sm font-medium text-[#2A2F3A]">
                      Nom du poste
                    </Label>
                    <Input
                      id="detail-add-label"
                      value={detailAddFormLabel}
                      onChange={(e) => setDetailAddFormLabel(e.target.value)}
                      placeholder="Ex. Honoraires professionnels"
                      className="rounded-xl border-slate-200"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="detail-add-link" className="text-sm font-medium text-[#2A2F3A]">
                      Code de liaison
                    </Label>
                    <Input
                      id="detail-add-link"
                      value={detailAddFormLinkCode}
                      onChange={(e) => setDetailAddFormLinkCode(e.target.value)}
                      placeholder="Ex. 1010"
                      className="rounded-xl border-slate-200 font-mono text-sm"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="detail-add-dtct" className="text-sm font-medium text-[#2A2F3A]">
                      DT / CT
                    </Label>
                    <Select value={detailAddFormDtCt || undefined} onValueChange={(v) => setDetailAddFormDtCt(v as "DT" | "CT")}>
                      <SelectTrigger
                        id="detail-add-dtct"
                        className="h-10 w-full rounded-xl border-slate-200 text-sm font-semibold uppercase"
                      >
                        <SelectValue placeholder="Choisir DT ou CT" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DT">DT</SelectItem>
                        <SelectItem value="CT">CT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {detailAddFormError && (
                    <p className="text-sm font-medium text-red-700" role="alert">
                      {detailAddFormError}
                    </p>
                  )}
                </div>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl border-slate-200"
                    onClick={() => {
                      setDetailAddModalStep("pickAnnex")
                      setDetailAddFormError(null)
                    }}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Retour
                  </Button>
                  <Button
                    type="button"
                    className="rounded-xl bg-[#2A2F3A] font-semibold text-[#E6D6C3] hover:bg-[#353b47]"
                    onClick={() => {
                      const label = detailAddFormLabel.trim()
                      const linkCode = detailAddFormLinkCode.trim()
                      if (!label) {
                        setDetailAddFormError("Indiquez le nom du poste.")
                        return
                      }
                      if (!linkCode) {
                        setDetailAddFormError("Indiquez le code de liaison.")
                        return
                      }
                      if (detailAddFormDtCt !== "DT" && detailAddFormDtCt !== "CT") {
                        setDetailAddFormError("Choisissez DT ou CT.")
                        return
                      }
                      if (!detailAddSelectedLetter) {
                        setDetailAddFormError("Annexe introuvable. Recommencez.")
                        return
                      }
                      structEdit.addDetailSubLine(detailAddSelectedLetter, {
                        label,
                        linkCode,
                        dtCt: detailAddFormDtCt,
                      })
                      setDetailAddModalOpen(false)
                    }}
                  >
                    Enregistrer
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {showStructureCols ? (
        <div className="border-t border-slate-200 bg-white">
          <div className="px-6 py-4 sm:px-7">
            <p className={cn("text-sm", dashboardCardBodyMutedClass)}>
              Paramètres du détail du bilan. Activez les annexes et configurez les codes de liaison.
            </p>
          </div>
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Annexes — postes liés aux annexes
                  </th>
                  <th className="box-border w-[7rem] px-2 py-3 text-center text-[11px] font-semibold text-slate-800">Masquer</th>
                  <th className="box-border w-[7rem] px-2 py-3 text-center text-[11px] font-semibold text-slate-800">Liaison</th>
                  <th className="box-border w-[7rem] px-2 py-3 text-center text-[11px] font-semibold text-slate-800">DT/CT</th>
                  <th className="box-border w-[7rem] px-2 py-3 text-center text-[11px] font-semibold text-slate-800">Lettre</th>
                  <th className="w-11 px-0 py-3" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {detailAnnexStructureTableLayout.map((entry, idx) => {
                  if (entry.kind === "placeholder") {
                    return (
                      <tr key={`ph-${entry.letter}-${idx}`} className="border-b border-slate-100">
                        <td className="px-4 py-3 text-sm text-slate-400">—</td>
                        <td className="box-border w-[7rem] px-2 py-3 text-center text-sm text-slate-300">—</td>
                        <td className="box-border w-[7rem] px-2 py-3 text-center text-sm text-slate-300">—</td>
                        <td className="box-border w-[7rem] px-2 py-3 text-center text-sm text-slate-300">—</td>
                        <td className="box-border w-[7rem] px-2 py-3 text-center text-sm text-slate-300">—</td>
                        <td className="w-11 px-0 py-3" aria-hidden />
                      </tr>
                    )
                  }
                  if (entry.kind === "annexSubtotal") {
                    return (
                      <tr key={`st-${entry.letter}-${idx}`} className="border-b border-slate-100">
                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">{`Sous-total — Annexe ${entry.letter}`}</td>
                        <td className="box-border w-[7rem] px-2 py-3 text-center text-sm text-slate-300">—</td>
                        <td className="box-border w-[7rem] px-2 py-3 text-center text-sm text-slate-300">—</td>
                        <td className="box-border w-[7rem] px-2 py-3 text-center text-sm text-slate-300">—</td>
                        <td className="box-border w-[7rem] px-2 py-3 text-center text-sm text-slate-300">—</td>
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
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">
                        {summaryAnnexLockedInDetail ? (
                          <span
                            className="block rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 py-2 text-sm text-slate-800"
                            title="Libellé modifiable dans la vue Sommaire (Paramètres)"
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
                        showRemoveButton={structEdit.canRemoveRowAt(globalIdx) && !summaryAnnexLockedInDetail}
                        onRemoveRow={structEdit.removeStructureRowAt}
                        mappingColumnsReadOnly={!isStructureRowDetailOnly(structRow)}
                        annexReadOnly={isStructureRowDetailOnly(structRow)}
                        hideDefineColumn={false}
                      />
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Table */
      <div className="min-w-0 overflow-x-auto bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100/80">
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
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => {
              const variation = row.current && row.prior ? calculateVariation(row.current, row.prior) : null
              const variationAmount = row.current && row.prior ? row.current - row.prior : 0
              const isSpacer = row.label === ""
              const shouldHideAmounts = isSpacer || !!row.isSection || !!row.isAnnexPlaceholder || !!row.isAnnexTitle
              /** Hors Paramètres : libellé sous-total masqué (blanc) mais chiffres en noir. */
              const annexSubtotalDarkNumbers = !!row.isAnnexSubtotal
              const displayLabel = row.isSection ? capitalizeFirst(row.label) : row.label
              
              // Check if next row is a subtotal to add dark border above it
              const nextRowIsSubtotal = idx < data.length - 1 && data[idx + 1].isSubtotal
              
              // Check if this row can be expanded and if it's expanded
              const canExpand = !!row.rowId && !!row.balanceAccounts && row.balanceAccounts.length > 0
              const isExpanded = row.rowId ? expandedRows.has(row.rowId) : false
              
              // Check if this row has a note
              const hasNote = row.rowId
                ? getNoteByRowId(row.rowId, "balance-sheet", period, view, companyId, divisionId, subDivisionId) !== null
                : false

              return (
                <Fragment key={idx}>
                  <tr className={cn(
                    "border-b",
                    row.label === "" ? "h-2 border-slate-200" : "",
                    nextRowIsSubtotal ? "border-slate-900 border-b-2" : "border-slate-200",
                    canExpand && "hover:bg-slate-50 cursor-pointer"
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
                        {row.rowId && isNoteAllowed() && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedRowId(row.rowId!)
                              setSelectedRowLabel(displayLabel)
                              // Capture financial data
                              setSelectedRowFinancialData({
                                currentAmount: row.current !== 0 ? row.current : null,
                                priorAmount: row.prior !== 0 ? row.prior : null,
                                variationPercent: variation,
                                variationAmount: variationAmount !== 0 ? variationAmount : null,
                              })
                              setNoteModalOpen(true)
                            }}
                            className={cn(
                              "flex-shrink-0 p-1.5 rounded-md transition-colors",
                              hasNote
                                ? "text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                                : "text-slate-400 hover:bg-slate-100 hover:text-slate-500"
                            )}
                            title={hasNote ? "Voir/Modifier la note" : "Ajouter une note"}
                          >
                            <StickyNote className={cn("w-4 h-4", hasNote && "fill-current")} />
                          </button>
                        )}
                      </div>
                    </td>

                  {view === "current" && (
                    <td
                      className={cn(
                        "px-6 py-3 text-right",
                        row.isBold ? "font-semibold font-bold" : "text-slate-500",
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
                          row.isBold ? "font-semibold font-bold" : "text-slate-500",
                          shouldHideAmounts ? "text-white" : "",
                          annexSubtotalDarkNumbers ? "text-slate-900" : ""
                        )}
                      >
                        {row.current !== 0 ? formatCurrency(row.current) : "-"}
                      </td>
                      <td
                        className={cn(
                          "px-6 py-3 text-right",
                          row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500",
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
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.current !== 0 ? `${getTotalAssetsPercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
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
                            className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}
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
                          row.isBold ? "font-semibold font-bold" : "text-slate-500",
                          shouldHideAmounts ? "text-white" : "",
                          annexSubtotalDarkNumbers ? "text-slate-900" : ""
                        )}
                      >
                        {row.current !== 0 ? formatCurrency(row.current) : "-"}
                      </td>
                      <td
                        className={cn(
                          "px-6 py-3 text-right",
                          row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500",
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
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.current !== 0 ? `${getTotalAssetsPercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
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
                          row.isBold ? "font-semibold font-bold" : "text-slate-500",
                          shouldHideAmounts ? "text-white" : "",
                          annexSubtotalDarkNumbers ? "text-slate-900" : ""
                        )}
                      >
                        {row.current !== 0 ? formatCurrency(row.current) : "-"}
                      </td>
                      <td
                        className={cn(
                          "px-6 py-3 text-right",
                          row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500",
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
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
                            {row.current !== 0 ? `${getTotalAssetsPercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}`}>
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
                            "px-4 py-3 text-right font-semibold",
                            row.isBold ? "font-bold" : "",
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
                            "px-4 py-3 text-right font-semibold",
                            row.isBold ? "font-bold" : "",
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
                      {row.trendValues.map((value, valueIdx) => {
                        const isForecastSection = title === "Bilan pro forma"
                        return (
                          <td
                            key={valueIdx}
                            className={cn(
                              "px-4 py-3 text-right font-semibold",
                              row.isBold ? "font-bold" : "",
                              shouldHideAmounts ? "text-white" : "",
                              annexSubtotalDarkNumbers ? "text-slate-900" : "",
                              isForecastSection && valueIdx === 0 && !shouldHideAmounts ? "bg-slate-50" : ""
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
                        )
                      })}
                    </>
                  )}
                  {/* Empty cells for spacer rows in trend views */}
                  {(view === "12months" || view === "quarters" || view === "years") && !row.trendValues && (
                    <>
                      {Array.from({ length: view === "12months" ? 12 : view === "quarters" ? 5 : 6 }).map((_, idx) => {
                        const isForecastSection = title === "Bilan pro forma"
                        return (
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
                        )
                      })}
                    </>
                  )}
                </tr>
                  {/* Expanded balance accounts */}
                  {isExpanded && row.balanceAccounts && row.balanceAccounts.length > 0 && (
                    <>
                      {row.balanceAccounts.map((account, accIdx) => {
                        const accountVariation = account.priorAmount !== undefined && account.amount && account.priorAmount
                          ? calculateVariation(account.amount, account.priorAmount)
                          : null
                        const accountVariationAmount = account.priorAmount !== undefined && account.amount && account.priorAmount
                          ? account.amount - account.priorAmount
                          : 0
                        
                        return (
                          <tr key={`${idx}-account-${accIdx}`} className="bg-slate-50 border-b border-slate-200">
                            <td className="px-6 py-2 text-slate-500 pl-20 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-slate-500">{account.accountNumber}</span>
                                <span className="text-sm whitespace-nowrap">{account.accountName}</span>
                              </div>
                            </td>
                            
                            {view === "current" && (
                              <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                              </td>
                            )}
                            
                            {view === "comparison" && !isComparisonMode && (
                              <>
                                <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                  {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                                </td>
                                <td className="px-6 py-2 text-right font-semibold text-sm text-slate-500">
                                  {account.priorAmount !== undefined && account.priorAmount !== 0 ? formatCurrency(account.priorAmount) : "-"}
                                </td>
                                {columnMode === "variationPercent" ? (
                                  <td
                                    className={`px-6 py-2 text-right font-semibold text-sm ${
                                      accountVariation && accountVariation >= 0 ? "text-emerald-600" : "text-red-600"
                                    }`}
                                  >
                                    {accountVariation !== null && account.amount !== 0
                                      ? `${accountVariation >= 0 ? "+" : ""}${accountVariation.toFixed(1)}%`
                                      : "-"}
                                  </td>
                                ) : columnMode === "variationAmount" ? (
                                  <td
                                    className={`px-6 py-2 text-right font-semibold text-sm ${
                                      accountVariationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                                    }`}
                                  >
                                    {account.amount !== 0
                                      ? `${accountVariationAmount >= 0 ? "+" : ""}${formatCurrency(accountVariationAmount)}`
                                      : "-"}
                                  </td>
                                ) : columnMode === "percentage" ? (
                                  <>
                                    <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                      {account.amount !== 0 ? `${getTotalAssetsPercentage(account.amount, false).toFixed(1)}%` : "-"}
                                    </td>
                                    <td className="px-6 py-2 text-right font-semibold text-sm text-slate-500">
                                      {account.priorAmount !== undefined && account.priorAmount !== 0 ? `${getTotalAssetsPercentage(account.priorAmount, true).toFixed(1)}%` : "-"}
                                    </td>
                                  </>
                                ) : null}
                              </>
                            )}
                            
                            {view === "ddm" && (
                              <>
                                <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                  {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                                </td>
                                <td className="px-6 py-2 text-right font-semibold text-sm text-slate-500">
                                  {account.priorAmount !== undefined && account.priorAmount !== 0 ? formatCurrency(account.priorAmount) : "-"}
                                </td>
                                {columnMode === "variationPercent" ? (
                                  <td
                                    className={`px-6 py-2 text-right font-semibold text-sm ${
                                      accountVariation && accountVariation >= 0 ? "text-emerald-600" : "text-red-600"
                                    }`}
                                  >
                                    {accountVariation !== null && account.amount !== 0
                                      ? `${accountVariation >= 0 ? "+" : ""}${accountVariation.toFixed(1)}%`
                                      : "-"}
                                  </td>
                                ) : columnMode === "variationAmount" ? (
                                  <td
                                    className={`px-6 py-2 text-right font-semibold text-sm ${
                                      accountVariationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                                    }`}
                                  >
                                    {account.amount !== 0
                                      ? `${accountVariationAmount >= 0 ? "+" : ""}${formatCurrency(accountVariationAmount)}`
                                      : "-"}
                                  </td>
                                ) : (
                                  <>
                                    <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                      {account.amount !== 0 ? `${getTotalAssetsPercentage(account.amount, false).toFixed(1)}%` : "-"}
                                    </td>
                                    <td className="px-6 py-2 text-right font-semibold text-sm text-slate-500">
                                      {account.priorAmount !== undefined && account.priorAmount !== 0 ? `${getTotalAssetsPercentage(account.priorAmount, true).toFixed(1)}%` : "-"}
                                    </td>
                                  </>
                                )}
                              </>
                            )}
                            
                            {view === "ytd" && (
                              <>
                                <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                  {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                                </td>
                                <td className="px-6 py-2 text-right font-semibold text-sm text-slate-500">
                                  {account.priorAmount !== undefined && account.priorAmount !== 0 ? formatCurrency(account.priorAmount) : "-"}
                                </td>
                                {columnMode === "variationPercent" ? (
                                  <td
                                    className={`px-6 py-2 text-right font-semibold text-sm ${
                                      accountVariation && accountVariation >= 0 ? "text-emerald-600" : "text-red-600"
                                    }`}
                                  >
                                    {accountVariation !== null && account.amount !== 0
                                      ? `${accountVariation >= 0 ? "+" : ""}${accountVariation.toFixed(1)}%`
                                      : "-"}
                                  </td>
                                ) : columnMode === "variationAmount" ? (
                                  <td
                                    className={`px-6 py-2 text-right font-semibold text-sm ${
                                      accountVariationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                                    }`}
                                  >
                                    {account.amount !== 0
                                      ? `${accountVariationAmount >= 0 ? "+" : ""}${formatCurrency(accountVariationAmount)}`
                                      : "-"}
                                  </td>
                                ) : (
                                  <>
                                    <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                      {account.amount !== 0 ? `${getTotalAssetsPercentage(account.amount, false).toFixed(1)}%` : "-"}
                                    </td>
                                    <td className="px-6 py-2 text-right font-semibold text-sm text-slate-500">
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
                                  const isForecastSection = title === "Bilan pro forma"
                                  return (
                                    <td
                                      key={valueIdx}
                                      className={cn(
                                        "px-4 py-2 text-right font-semibold text-sm text-slate-700",
                                        isForecastSection && valueIdx === 0 ? "bg-slate-50" : ""
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
                                {Array.from({ length: view === "12months" ? 12 : view === "quarters" ? 5 : 6 }).map((_, emptyIdx) => {
                                  const isForecastSection = title === "Bilan pro forma"
                                  return (
                                    <td 
                                      key={emptyIdx} 
                                      className={cn(
                                        "px-4 py-2 text-right font-semibold text-sm text-slate-400",
                                        isForecastSection && view === "years" && emptyIdx === 0 ? "bg-slate-50" : ""
                                      )}
                                    >
                                      -
                                    </td>
                                  )
                                })}
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
                                      className="px-6 py-2 text-right font-semibold text-sm text-slate-700"
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

      {/* Note Modal */}
      {selectedRowId && (() => {
        const selectedCompany = companyId ? companies.find((c) => c.id === companyId) : null
        const selectedDivision = companyId && divisionId ? selectedCompany?.divisions.find((d) => d.id === divisionId) : null
        const selectedSubDivision = companyId && divisionId && subDivisionId ? selectedDivision?.subDivisions.find((sd) => sd.id === subDivisionId) : null
        
        return (
          <NoteModal
            isOpen={noteModalOpen}
            onClose={() => {
              setNoteModalOpen(false)
              setSelectedRowId(null)
              setSelectedRowLabel("")
            }}
            rowId={selectedRowId}
            rowLabel={selectedRowLabel}
            page="balance-sheet"
            period={period}
            view={view}
            companyId={companyId}
            companyName={selectedCompany?.name || null}
            divisionId={divisionId}
            divisionName={selectedDivision?.name || null}
            subDivisionId={subDivisionId}
            subDivisionName={selectedSubDivision?.name || null}
            currentAmount={selectedRowFinancialData.currentAmount}
            priorAmount={selectedRowFinancialData.priorAmount}
            variationPercent={selectedRowFinancialData.variationPercent}
            variationAmount={selectedRowFinancialData.variationAmount}
            onSave={() => setNotesUpdated((prev) => prev + 1)}
          />
        )
      })()}
      </div>
    </div>
  )
}

