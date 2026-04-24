"use client"

import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import type { FinancialStatementRow, SeriesPeriod, SeriesRow } from "@/lib/api"
import { HORIZON_LABEL } from "@/lib/financial-statement-horizon-labels"
import { useIncomeStatementStructureEdit } from "@/hooks/use-income-statement-structure-edit"
import { IncomeStatementStructureStudioCols } from "@/components/income-statement-structure-studio-cols"
import { generateId } from "@/lib/seeded-random"
import { ArrowRight, CheckCircle2, ChevronLeft, ListTree, Table2, TrendingUp, X } from "lucide-react"
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from "react"
import {
  listForecastConfigs,
  upsertForecastConfig,
  getFinancialStatementSeries,
  getStatementStructure,
  type FinancialStatementSeriesParams,
} from "@/lib/api"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import {
  aggregateToYears,
  findRow,
  findSeriesRowOrDetail,
  getRowAmounts,
  getPeriodLabels,
  reverseSeriesOrderForDisplay,
} from "@/lib/series-utils"
import {
  monthShortLabelsFromReference,
  monthTrendFromReference,
  quarterLabelsFromReference,
  quarterTrendFromReference,
  yearLabelsFromReference,
  yearTrendFromReference,
} from "@/lib/series-reference-columns"
import {
  collectDistinctLinkCodesFromStructure,
  detailLineLabelForDisplay,
  findStructureRowForStatementLine,
  getStructureRowGlobalIndex,
  isCodeMappingEnabled,
  isOmittedIncomeStatementSummaryRowLabel,
  isShowInDetail,
  isStructureRowDetailOnly,
  isStructureRowInDetailAnnexEditor,
  isSummaryAnnexRowLockedInDetailEdit,
  listAnnexOptionsForDetailSubLineModal,
  normLabel,
  normalizeAnnexLetter,
} from "@/lib/income-statement-structure-utils"
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
import {
  calendarQuarterFromMonth,
  formatCalendarMonthYear,
  formatPriorCalendarMonth,
  formatQuarterShortLabel,
  formatSameMonthPriorYear,
  priorCalendarQuarter,
} from "@/lib/financial-period-labels"
import { IncomeStatementNotePanel } from "@/components/income-statement-note-panel"
import { getNoteByRowId, useNotesCache } from "@/lib/notes-storage"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { BookMarked, Settings, Plus, Edit2, Trash2, Loader2, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from "recharts"

interface IncomeStatementDetailProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years"
  columnMode?: "variationAmount" | "variationPercent" | "percentage" | "comparison"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  title?: string
  projectionYears?: 3 | 4 | 5
  projectionMode?: "gl" | "account"
  comparisonType?: "lastMonth" | "pastMonth" | "budget"
  selectedBudgetId?: string | null
  selectedBudgetName?: string | null
  fiscalYear?: number
  /** Mois calendaire (1–12) de la date de référence — pour les en-têtes « Avril 2025 », etc. */
  referenceMonth?: number
  rows?: FinancialStatementRow[]
  loading?: boolean
  projectionId?: string | null
  structureVersion?: number
  showIncomeStatementStructureSettings?: boolean
  onIncomeStatementStructureSaved?: () => void
}

interface BalanceAccount {
  accountNumber: string
  accountName: string
  amount: number
  priorAmount?: number
  // For trend views, store the proportion of the parent row's amount
  proportion?: number
  /** Montants par colonne (horizons multi-périodes), alignés sur la ligne parente */
  trendValues?: number[]
}

/** Instantané d’une ligne pour le panneau d’analyse (indépendant du scroll / re-render du tableau). */
interface LineAnalysisSnapshot {
  rowId: string
  label: string
  current: number
  prior: number
  balanceAccounts?: BalanceAccount[]
  trendValues?: number[]
  /** Si l’analyse porte sur un compte GL : id de la ligne d’état parente. */
  parentRowId?: string
}

/** Évite d'afficher le # deux fois quand le libellé API est déjà du type « 405001 — Description ». */
function accountLabelAlreadyIncludesNumber(accountNumber: string, accountName: string): boolean {
  const n = accountNumber.trim()
  const name = (accountName || "").trim()
  if (!n || !name) return false
  if (name === n) return true
  if (!name.startsWith(n)) return false
  const rest = name.slice(n.length)
  return rest === "" || /^[\s\u2014\u2013\-:]/.test(rest)
}

/** Comptes GL issus des `detailRows` de série — mêmes agrégations que la ligne parente. */
function balanceAccountsFromSeriesRowDetail(
  row: SeriesRow,
  periods: SeriesPeriod[],
  horizon: "12months" | "quarters" | "years",
  refMonth: number,
  refYear: number
): BalanceAccount[] | undefined {
  if (!row.detailRows?.length) return undefined
  return row.detailRows.map((dr) => {
    const pseudo: SeriesRow = {
      id: dr.id,
      label: dr.label,
      isBold: false,
      isSection: false,
      isResult: false,
      amounts: dr.amounts,
      detailRows: [],
    }
    const trendValues =
      horizon === "12months"
        ? monthTrendFromReference(pseudo, periods, refMonth, refYear, 12)
        : horizon === "quarters"
          ? quarterTrendFromReference(pseudo, periods, refMonth, refYear, 5)
          : yearTrendFromReference(pseudo, periods, refYear, 6)
    return {
      accountNumber: dr.id,
      accountName: dr.label,
      amount: trendValues[0] ?? 0,
      priorAmount: trendValues[1],
      trendValues,
    }
  })
}

interface DetailRow {
  label: string
  current: number
  prior: number
  indent?: boolean
  isBold?: boolean
  isSubtotal?: boolean
  isSection?: boolean
  isAnnexHeader?: boolean
  /** Lettre d’annexe (API / structure), pour regrouper et insérer les lignes indicatives. */
  annexLetter?: string
  isAnnexTitle?: boolean
  statementLabel?: string
  /** Ligne indicatif après un bloc d’annexe (hors mode Paramètres). */
  isAnnexPlaceholder?: boolean
  /** Sous-total des montants du bloc d’annexe (au-dessus de la ligne vide). */
  isAnnexSubtotal?: boolean
  // For trend views (12months, quarters, years)
  trendValues?: number[]
  // Balance accounts for this row
  balanceAccounts?: BalanceAccount[]
  rowId?: string // Unique ID for expansion
}

/** Titres d’annexe (ligne sommaire avec lettre) : pas de montants affichés — le sous-total couvre les sous-lignes. */
function zeroAmountsForAnnexTitleRow<T extends DetailRow>(row: T): T {
  if (!row.isAnnexTitle) return row
  return {
    ...row,
    current: 0,
    prior: 0,
    trendValues: row.trendValues ? row.trendValues.map(() => 0) : undefined,
  }
}

/** Lignes du tableau Paramètres : entrées structure, sous-total annexe, ligne indicatif. */
type DetailAnnexStructureLayoutEntry =
  | { kind: "structure"; globalIdx: number }
  | { kind: "annexSubtotal"; letter: string }
  | { kind: "placeholder"; letter: string }

/** Aligné sur `income-statement-summary.tsx` (Paramètres Sommaire). */
const EMPTY_STRUCTURE_LINE_LABEL = "Ligne vide — renommez ou supprimez"
const EMPTY_STRUCTURE_LINE_BADGE_CLASS =
  "inline-flex items-center rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-medium text-slate-400"

const ANNEX_DETAIL_PLACEHOLDER_LABEL = EMPTY_STRUCTURE_LINE_LABEL

function buildAnnexPlaceholderDetailRow(letter: string, trendValuesLength?: number): DetailRow {
  const pad =
    trendValuesLength && trendValuesLength > 0 ? Array(trendValuesLength).fill(0) : undefined
  return {
    label: ANNEX_DETAIL_PLACEHOLDER_LABEL,
    statementLabel: `__annex_placeholder__${letter}`,
    current: 0,
    prior: 0,
    isAnnexPlaceholder: true,
    ...(pad ? { trendValues: [...pad] } : {}),
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
    if (r.trendValues?.length) {
      trendLen = Math.max(trendLen, r.trendValues.length)
    }
  }
  if (trendLen === 0) {
    return { current, prior }
  }
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
    isBold: true,
    isSubtotal: true,
    isAnnexSubtotal: true,
    annexLetter: letter,
    ...(agg.trendValues ? { trendValues: [...agg.trendValues] } : {}),
  }
}

/** Somme des lignes « réelles » d’une annexe (hors sous-total / ligne vide déjà injectés). */
function sumAnnexGroupRowsForLetter(dataRows: DetailRow[], letter: string) {
  const L = normalizeAnnexLetter(letter)
  const groupRows = dataRows.filter(
    (r) =>
      normalizeAnnexLetter(String(r.annexLetter ?? "")) === L &&
      !r.isAnnexPlaceholder &&
      !r.isAnnexSubtotal
  )
  return sumAnnexGroupRows(groupRows)
}

/** Après chaque bloc d’annexe : sous-total, puis ligne indicatif (Paramètres). */
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

export function IncomeStatementDetail({
  period,
  view,
  columnMode = "variationAmount",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  title = "Détail",
  projectionYears = 5,
  projectionMode = "gl",
  comparisonType = "lastMonth",
  selectedBudgetId = null,
  selectedBudgetName = null,
  fiscalYear,
  referenceMonth,
  rows: backendRows = [],
  loading = false,
  projectionId,
  structureVersion = 0,
  showIncomeStatementStructureSettings = false,
  onIncomeStatementStructureSaved,
}: IncomeStatementDetailProps) {
  useNotesCache(companyId ?? null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [lineAnalysis, setLineAnalysis] = useState<LineAnalysisSnapshot | null>(null)
  const [lineAnalysisView, setLineAnalysisView] = useState<"current" | "trailing12" | "trailing5years">("current")
  const [showAllAnalysisAccounts, setShowAllAnalysisAccounts] = useState(false)
  const [analysisPanelNarrow, setAnalysisPanelNarrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches
  )
  const [notesUpdated, setNotesUpdated] = useState(0) // Force re-render when notes change
  const [showGrowthRate, setShowGrowthRate] = useState(false) // Toggle between amounts and growth rate for years view
  /** Cible le haut du panneau d’analyse (pas la colonne pleine hauteur) pour le scroll à l’ouverture. */
  const lineAnalysisPanelTopRef = useRef<HTMLDivElement | null>(null)

  const refMonth = referenceMonth ?? new Date().getMonth() + 1
  const refYear = fiscalYear ?? new Date().getFullYear()

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)")
    const sync = () => setAnalysisPanelNarrow(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  /** Quand le panneau s’ouvre, faire défiler vers le haut du panneau (la carte, pas toute la colonne étirée). */
  useEffect(() => {
    if (!lineAnalysis || analysisPanelNarrow) return
    let t1: number | undefined
    let t2: number | undefined
    const run = () => {
      lineAnalysisPanelTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      })
    }
    t1 = requestAnimationFrame(() => {
      t2 = requestAnimationFrame(run)
    })
    return () => {
      if (t1 !== undefined) cancelAnimationFrame(t1)
      if (t2 !== undefined) cancelAnimationFrame(t2)
    }
  }, [lineAnalysis, analysisPanelNarrow])

  // Helper function to get comparison label
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
  
  // State for Type/Taux modal
  const [typeRateModalOpen, setTypeRateModalOpen] = useState(false)
  const [editingTypeRateRowId, setEditingTypeRateRowId] = useState<string | null>(null)
  const [tempExpenseType, setTempExpenseType] = useState<"variable" | "fixe">("variable")
  const [tempVariableRate, setTempVariableRate] = useState<number>(0)
  const [tempSpecificInflationRate, setTempSpecificInflationRate] = useState<number | null>(null) // null means use global rate
  
  // State for editable revenue/expense values: key = "rowId-yearIndex" (e.g., "revenue-services-1" for 2026)
  const [revenueValues, setRevenueValues] = useState<Record<string, number>>({})
  const [editingCell, setEditingCell] = useState<string | null>(null) // Format: "rowId-yearIndex"
  
  // State for expense types (variable/fixe): key = "rowId" -> "variable" | "fixe"
  const [expenseTypes, setExpenseTypes] = useState<Record<string, "variable" | "fixe">>({})
  
  // State for inflation rate for fixed expenses (global default rate)
  const [inflationRate, setInflationRate] = useState<number>(2.0) // Default: 2%
  
  // State for variable rates: key = "rowId" -> rate in %
  const [variableRates, setVariableRates] = useState<Record<string, number>>({})
  
  // State for specific inflation rates per expense: key = "rowId" -> rate in %
  const [specificInflationRates, setSpecificInflationRates] = useState<Record<string, number>>({})

  // Interface for expense adjustments
  interface ExpenseAdjustment {
    id: string // Unique ID for this adjustment
    rowId: string
    yearIndex: number
    type: "amount" | "percentage" // Type of adjustment: amount in $ or percentage change
    amount?: number // Adjustment amount (for type "amount", can be positive or negative)
    percentage?: number // New percentage value (for type "percentage", e.g., 38 instead of 40)
    isRecurring: boolean // If true, adjustment continues in future years (for amount: with inflation, for percentage: keeps new rate)
    note: string // Explanatory note for this adjustment
  }

  // Interface for revenue adjustments
  interface RevenueAdjustment {
    id: string // Unique ID for this adjustment
    rowId: string
    yearIndex: number
    type: "amount" | "growthPercent" | "growthAmount" // Type of adjustment
    value: number // The adjustment value (amount, growth %, or growth $)
    note: string // Explanatory note for this adjustment
  }

  // State for expense adjustments: key = "rowId-yearIndex" -> ExpenseAdjustment[]
  const [expenseAdjustments, setExpenseAdjustments] = useState<Record<string, ExpenseAdjustment[]>>({})
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false)
  const [editingAdjustment, setEditingAdjustment] = useState<{ rowId: string; yearIndex: number } | null>(null)
  const [adjustmentType, setAdjustmentType] = useState<"amount" | "percentage">("amount")
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0)
  const [adjustmentPercentage, setAdjustmentPercentage] = useState<number>(0)
  const [adjustmentIsRecurring, setAdjustmentIsRecurring] = useState<boolean>(false)
  const [adjustmentNote, setAdjustmentNote] = useState<string>("")
  const [editingAdjustmentId, setEditingAdjustmentId] = useState<string | null>(null) // ID of adjustment being edited, null if adding new

  // State for revenue adjustments: key = "rowId-yearIndex" -> RevenueAdjustment[]
  const [revenueAdjustments, setRevenueAdjustments] = useState<Record<string, RevenueAdjustment[]>>({})
  const [revenueAdjustmentType, setRevenueAdjustmentType] = useState<"amount" | "growthPercent" | "growthAmount">("amount")
  const [revenueAdjustmentValue, setRevenueAdjustmentValue] = useState<number>(0)

  // Check if this is a forecast section (Revenus, Dépenses, or États des résultats pro forma)
  const isForecastSection = title === "Estimation des revenus annuels" || title === "Estimation des dépenses annuelles" || title === "États des résultats pro forma"

  const isCompanyComparison = columnMode === "comparison" && !companyId
  const isDivisionComparison = columnMode === "comparison" && !!companyId && !divisionId
  const isSubDivisionComparison = columnMode === "comparison" && !!companyId && !!divisionId && !subDivisionId
  const isComparisonMode = isCompanyComparison || isDivisionComparison || isSubDivisionComparison

  const [structureEditMode, setStructureEditMode] = useState(false)
  const [detailAddModalOpen, setDetailAddModalOpen] = useState(false)
  const [detailAddModalStep, setDetailAddModalStep] = useState<"pickAnnex" | "form">("pickAnnex")
  const [detailAddSelectedLetter, setDetailAddSelectedLetter] = useState<string | null>(null)
  const [detailAddFormLabel, setDetailAddFormLabel] = useState("")
  const [detailAddFormLinkCode, setDetailAddFormLinkCode] = useState("")
  const [detailAddFormDtCt, setDetailAddFormDtCt] = useState<"DT" | "CT" | "">("")
  const [detailAddFormError, setDetailAddFormError] = useState<string | null>(null)

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

  const canInlineStructureEdit =
    !!showIncomeStatementStructureSettings && !!companyId && !isComparisonMode && !isForecastSection

  const structEdit = useIncomeStatementStructureEdit(
    companyId ?? null,
    structureEditMode && canInlineStructureEdit
  )

  const allLiaisonCodes = useMemo(
    () => collectDistinctLinkCodesFromStructure(structEdit.structure),
    [structEdit.structure]
  )

  /** Annexes pour la modale « Choisir une annexe » (lettre + libellé du poste au Sommaire). */
  const detailAnnexOptionsForSubLineModal = useMemo(
    () => listAnnexOptionsForDetailSubLineModal(structEdit.structure),
    [structEdit.structure]
  )

  const detailAnnexEditorGlobalIndices = useMemo(() => {
    if (!structureEditMode || !canInlineStructureEdit) return []
    return structEdit.structure
      .map((r, i) => (isStructureRowInDetailAnnexEditor(r as Record<string, unknown>) ? i : -1))
      .filter((i) => i >= 0)
  }, [structureEditMode, canInlineStructureEdit, structEdit.structure])

  const detailAnnexStructureTableLayout = useMemo((): DetailAnnexStructureLayoutEntry[] => {
    if (!structureEditMode || !canInlineStructureEdit) return []
    const indices = detailAnnexEditorGlobalIndices
    if (indices.length === 0) return []
    if (title !== "Détail" || isForecastSection) {
      return indices.map((globalIdx) => ({ kind: "structure" as const, globalIdx }))
    }
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
  }, [structureEditMode, canInlineStructureEdit, detailAnnexEditorGlobalIndices, structEdit.structure, title, isForecastSection])

  // Determine months needed for series API based on view
  const isMultiPeriodView = view === "12months" || view === "quarters" || view === "years"
  const seriesMonthsNeeded = view === "years" ? 72 : view === "quarters" ? 15 : 12

  // Fetch multi-period series data from API
  const { rows: seriesRows, periods: seriesPeriods, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "income-statement",
    fiscalYear: fiscalYear || new Date().getFullYear(),
    months: seriesMonthsNeeded,
    divisionId: divisionId || undefined,
    subDivisionId: subDivisionId || undefined,
    enabled: isMultiPeriodView,
    structureVersion,
  })

  const { rows: analysisSeriesRows, periods: analysisPeriods, loading: analysisSeriesLoading } =
    useFinancialStatementSeries({
      companyId: companyId || null,
      statementType: "income-statement",
      fiscalYear: fiscalYear || new Date().getFullYear(),
      month: refMonth,
      months: 60,
      divisionId: divisionId || undefined,
      subDivisionId: subDivisionId || undefined,
      enabled: !!companyId && !!lineAnalysis?.rowId,
      structureVersion,
    })

  const [incomeStatementStructure, setIncomeStatementStructure] = useState<Record<
    string,
    unknown
  >[] | null>(null)

  useEffect(() => {
    if (!companyId || isForecastSection) {
      setIncomeStatementStructure(null)
      return
    }
    let cancelled = false
    getStatementStructure(companyId, "income-statement")
      .then((d) => {
        if (!cancelled) setIncomeStatementStructure(d.structure ?? [])
      })
      .catch(() => {
        if (!cancelled) setIncomeStatementStructure([])
      })
    return () => {
      cancelled = true
    }
  }, [companyId, isForecastSection, structureVersion])

  // Debounced save to API
  const saveConfigRef = useRef<NodeJS.Timeout>()

  const saveConfig = useCallback((data: Record<string, unknown>) => {
    if (!companyId || !isForecastSection) return
    clearTimeout(saveConfigRef.current)
    saveConfigRef.current = setTimeout(async () => {
      try {
        await upsertForecastConfig(companyId, {
          config_type: "income-statement-detail",
          data,
          projection_id: projectionId ?? undefined,
        })
      } catch (err) {
        console.error("Error saving income statement config:", err)
      }
    }, 500)
  }, [companyId, isForecastSection, projectionId])

  // Load forecast config from API on mount
  useEffect(() => {
    if (!companyId || !isForecastSection) return

    const loadConfig = async () => {
      try {
        const configs = await listForecastConfigs(companyId, { config_type: "income-statement-detail", projection_id: projectionId ?? undefined })
        if (configs.length > 0) {
          const data = configs[0].data as Record<string, unknown>
          if (data.revenueValues) setRevenueValues(data.revenueValues as typeof revenueValues)
          if (data.expenseTypes) setExpenseTypes(data.expenseTypes as typeof expenseTypes)
          if (data.inflationRate !== undefined) setInflationRate(data.inflationRate as number)
          if (data.variableRates) setVariableRates(data.variableRates as typeof variableRates)
          if (data.specificInflationRates) setSpecificInflationRates(data.specificInflationRates as typeof specificInflationRates)
          if (data.expenseAdjustments) {
            const adjustmentsParsed = data.expenseAdjustments as Record<string, unknown>
            if (adjustmentsParsed && typeof adjustmentsParsed === 'object' && !Array.isArray(adjustmentsParsed)) {
              const validatedAdjustments: Record<string, ExpenseAdjustment[]> = {}
              for (const [key, value] of Object.entries(adjustmentsParsed)) {
                if (Array.isArray(value)) {
                  validatedAdjustments[key] = value
                } else {
                  validatedAdjustments[key] = [value as ExpenseAdjustment]
                }
              }
              setExpenseAdjustments(validatedAdjustments)
            }
          }
          if (data.revenueAdjustments) {
            const revenueAdjustmentsParsed = data.revenueAdjustments as Record<string, unknown>
            if (revenueAdjustmentsParsed && typeof revenueAdjustmentsParsed === 'object' && !Array.isArray(revenueAdjustmentsParsed)) {
              const validatedAdjustments: Record<string, RevenueAdjustment[]> = {}
              for (const [key, value] of Object.entries(revenueAdjustmentsParsed)) {
                if (Array.isArray(value)) {
                  validatedAdjustments[key] = value
                } else {
                  validatedAdjustments[key] = [value as RevenueAdjustment]
                }
              }
              setRevenueAdjustments(validatedAdjustments)
            }
          }
        }
      } catch (err) {
        console.error("Error loading income statement config:", err)
      }
    }
    loadConfig()
  }, [companyId, isForecastSection, projectionId])

  // Helper to build the full config data bundle
  const buildConfigData = useCallback(() => ({
    revenueValues,
    expenseTypes,
    inflationRate,
    variableRates,
    specificInflationRates,
    expenseAdjustments,
    revenueAdjustments,
  }), [revenueValues, expenseTypes, inflationRate, variableRates, specificInflationRates, expenseAdjustments, revenueAdjustments])

  // Save forecast values whenever they change
  useEffect(() => {
    if (!isForecastSection || Object.keys(revenueValues).length === 0) return
    saveConfig(buildConfigData())
  }, [revenueValues, saveConfig, isForecastSection, buildConfigData])

  // Save expense types whenever they change
  useEffect(() => {
    if (title !== "Estimation des dépenses annuelles" || Object.keys(expenseTypes).length === 0) return
    saveConfig(buildConfigData())
  }, [expenseTypes, saveConfig, title, buildConfigData])

  // Save inflation rate whenever it changes
  useEffect(() => {
    if (title !== "Estimation des dépenses annuelles") return
    saveConfig(buildConfigData())
  }, [inflationRate, saveConfig, title, buildConfigData])

  // Save variable rates whenever they change
  useEffect(() => {
    if (title !== "Estimation des dépenses annuelles" || Object.keys(variableRates).length === 0) return
    saveConfig(buildConfigData())
  }, [variableRates, saveConfig, title, buildConfigData])

  // Save specific inflation rates whenever they change
  useEffect(() => {
    if (title !== "Estimation des dépenses annuelles") return
    saveConfig(buildConfigData())
  }, [specificInflationRates, saveConfig, title, buildConfigData])

  // Save expense adjustments whenever they change
  useEffect(() => {
    if (title !== "Estimation des dépenses annuelles" || Object.keys(expenseAdjustments).length === 0) return
    saveConfig(buildConfigData())
  }, [expenseAdjustments, saveConfig, title, buildConfigData])

  // Save revenue adjustments whenever they change
  useEffect(() => {
    if (title !== "Estimation des revenus annuels" || Object.keys(revenueAdjustments).length === 0) return
    saveConfig(buildConfigData())
  }, [revenueAdjustments, saveConfig, title, buildConfigData])

  // Get expense type for a row (defaults to "variable")
  const getExpenseType = (rowId: string | undefined): "variable" | "fixe" => {
    if (!rowId || title !== "Estimation des dépenses annuelles") return "variable"
    return expenseTypes[rowId] || "variable"
  }

  // Get inflation rate (returns specific rate for rowId if set, otherwise global rate)
  const getInflationRate = (rowId?: string): number => {
    if (rowId && specificInflationRates[rowId] !== undefined) {
      return specificInflationRates[rowId]
    }
    return inflationRate
  }

  // Update global inflation rate
  const updateInflationRate = (newRate: number) => {
    setInflationRate(newRate)
  }

  // Update specific inflation rate for a row
  const updateSpecificInflationRate = (rowId: string, newRate: number) => {
    setSpecificInflationRates((prev) => ({
      ...prev,
      [rowId]: newRate,
    }))
  }

  // Remove specific inflation rate for a row (revert to global)
  const removeSpecificInflationRate = (rowId: string) => {
    setSpecificInflationRates((prev) => {
      const updated = { ...prev }
      delete updated[rowId]
      return updated
    })
  }

  // Get variable rate for a row (defaults to 0 if not set)
  const getVariableRate = (rowId: string | undefined): number => {
    if (!rowId || title !== "Estimation des dépenses annuelles") return 0
    return variableRates[rowId] || 0
  }

  // Update variable rate for a row
  const updateVariableRate = (rowId: string, newRate: number) => {
    setVariableRates((prev) => ({
      ...prev,
      [rowId]: newRate,
    }))
  }

  // Get adjustments for a specific row and year
  const getAdjustments = (rowId: string, yearIndex: number): ExpenseAdjustment[] => {
    const key = `${rowId}-${yearIndex}`
    return expenseAdjustments[key] || []
  }

  // Get a specific adjustment by ID
  const getAdjustmentById = (id: string): ExpenseAdjustment | null => {
    for (const adjustments of Object.values(expenseAdjustments)) {
      const adjustment = adjustments.find(a => a.id === id)
      if (adjustment) return adjustment
    }
    return null
  }

  // Get all recurring adjustments that apply to this year (from previous years)
  const getRecurringAdjustments = (rowId: string, yearIndex: number): ExpenseAdjustment[] => {
    const recurringAdjustments: ExpenseAdjustment[] = []
    // Check all previous years for recurring adjustments
    for (let i = 1; i < yearIndex; i++) {
      const adjustments = getAdjustments(rowId, i)
      for (const adjustment of adjustments) {
        if (adjustment.isRecurring) {
          recurringAdjustments.push(adjustment)
        }
      }
    }
    return recurringAdjustments
  }

  // Get revenue adjustments for a specific row and year
  const getRevenueAdjustments = (rowId: string, yearIndex: number): RevenueAdjustment[] => {
    const key = `${rowId}-${yearIndex}`
    return revenueAdjustments[key] || []
  }

  // Get a specific revenue adjustment by ID
  const getRevenueAdjustmentById = (id: string): RevenueAdjustment | null => {
    for (const adjustments of Object.values(revenueAdjustments)) {
      const adjustment = adjustments.find(a => a.id === id)
      if (adjustment) return adjustment
    }
    return null
  }

  // Open Type/Taux modal
  const openTypeRateModal = (rowId: string) => {
    setEditingTypeRateRowId(rowId)
    setTempExpenseType(getExpenseType(rowId))
    setTempVariableRate(getVariableRate(rowId))
    // Set temp specific inflation rate (null if using global, otherwise the specific rate)
    const hasSpecificRate = specificInflationRates[rowId] !== undefined
    setTempSpecificInflationRate(hasSpecificRate ? specificInflationRates[rowId] : null)
    setTypeRateModalOpen(true)
  }

  // Save Type/Taux changes
  const saveTypeRate = () => {
    if (!editingTypeRateRowId) return
    
    // Update expense type
    updateExpenseType(editingTypeRateRowId, tempExpenseType)
    
    // Update variable rate if type is variable
    if (tempExpenseType === "variable") {
      updateVariableRate(editingTypeRateRowId, tempVariableRate)
      // Remove specific inflation rate if switching from fixe to variable
      removeSpecificInflationRate(editingTypeRateRowId)
    } else {
      // Update specific inflation rate if type is fixe
      if (tempSpecificInflationRate !== null) {
        updateSpecificInflationRate(editingTypeRateRowId, tempSpecificInflationRate)
      } else {
        // Remove specific rate to use global rate
        removeSpecificInflationRate(editingTypeRateRowId)
      }
    }
    
    // Clear edited values for years 1-5 if switching to "fixe" to allow recalculation with inflation
    if (tempExpenseType === "fixe") {
      const keysToRemove: string[] = []
      for (let yearIdx = 1; yearIdx < 6; yearIdx++) {
        const key = `${editingTypeRateRowId}-${yearIdx}`
        if (revenueValues[key] !== undefined) {
          keysToRemove.push(key)
        }
      }
      if (keysToRemove.length > 0) {
        setRevenueValues((prev) => {
          const updated = { ...prev }
          keysToRemove.forEach(key => delete updated[key])
          return updated
        })
      }
    }
    
    setTypeRateModalOpen(false)
    setEditingTypeRateRowId(null)
  }

  // Open adjustment modal (for adding a new adjustment)
  const openAdjustmentModal = (rowId: string, yearIndex: number, adjustmentId?: string) => {
    setEditingAdjustment({ rowId, yearIndex })
    if (title === "Estimation des revenus annuels") {
      // Revenue adjustments
      if (adjustmentId) {
        // Editing existing revenue adjustment
        const existingAdjustment = getRevenueAdjustmentById(adjustmentId)
        if (existingAdjustment) {
          setEditingAdjustmentId(adjustmentId)
          setRevenueAdjustmentType(existingAdjustment.type)
          setRevenueAdjustmentValue(existingAdjustment.value)
          setAdjustmentNote(existingAdjustment.note || "")
        }
      } else {
        // Adding new revenue adjustment
        setEditingAdjustmentId(null)
        setRevenueAdjustmentType("amount")
        setRevenueAdjustmentValue(0)
        setAdjustmentNote("")
      }
    } else {
      // Expense adjustments
      if (adjustmentId) {
        // Editing existing adjustment
        const existingAdjustment = getAdjustmentById(adjustmentId)
        if (existingAdjustment) {
          setEditingAdjustmentId(adjustmentId)
          setAdjustmentType(existingAdjustment.type || "amount")
          setAdjustmentAmount(existingAdjustment.amount || 0)
          setAdjustmentPercentage(existingAdjustment.percentage || 0)
          setAdjustmentIsRecurring(existingAdjustment.isRecurring)
          setAdjustmentNote(existingAdjustment.note || "")
        }
      } else {
        // Adding new adjustment
        setEditingAdjustmentId(null)
        setAdjustmentType("amount")
        setAdjustmentAmount(0)
        setAdjustmentPercentage(0)
        setAdjustmentIsRecurring(false)
        setAdjustmentNote("")
      }
    }
    setAdjustmentModalOpen(true)
  }

  // Save adjustment
  const saveAdjustment = () => {
    if (!editingAdjustment) {
      setAdjustmentModalOpen(false)
      setEditingAdjustment(null)
      setEditingAdjustmentId(null)
      return
    }
    
    const key = `${editingAdjustment.rowId}-${editingAdjustment.yearIndex}`
    
    if (title === "Estimation des revenus annuels") {
      // Revenue adjustments
      if (revenueAdjustmentValue === 0) {
        setAdjustmentModalOpen(false)
        setEditingAdjustment(null)
        setEditingAdjustmentId(null)
        return
      }
      
      setRevenueAdjustments((prev) => {
        const existingAdjustments = prev[key] || []
        
        if (editingAdjustmentId) {
          // Update existing adjustment
          const updatedAdjustments = existingAdjustments.map(adj =>
            adj.id === editingAdjustmentId
              ? {
                  ...adj,
                  type: revenueAdjustmentType,
                  value: revenueAdjustmentValue,
                  note: adjustmentNote
                }
              : adj
          )
          return {
            ...prev,
            [key]: updatedAdjustments
          }
        } else {
          // Add new adjustment
          const newAdjustment: RevenueAdjustment = {
            id: generateId(),
            rowId: editingAdjustment.rowId,
            yearIndex: editingAdjustment.yearIndex,
            type: revenueAdjustmentType,
            value: revenueAdjustmentValue,
            note: adjustmentNote
          }
          return {
            ...prev,
            [key]: [...existingAdjustments, newAdjustment]
          }
        }
      })
      
      setAdjustmentModalOpen(false)
      setEditingAdjustment(null)
      setEditingAdjustmentId(null)
      setRevenueAdjustmentType("amount")
      setRevenueAdjustmentValue(0)
      setAdjustmentNote("")
    } else {
      // Expense adjustments
      // Validate based on type
      if (adjustmentType === "amount" && adjustmentAmount === 0) {
        setAdjustmentModalOpen(false)
        setEditingAdjustment(null)
        setEditingAdjustmentId(null)
        return
      }
      if (adjustmentType === "percentage" && adjustmentPercentage === 0) {
        setAdjustmentModalOpen(false)
        setEditingAdjustment(null)
        setEditingAdjustmentId(null)
        return
      }
      
      setExpenseAdjustments((prev) => {
        const existingAdjustments = prev[key] || []
        
        if (editingAdjustmentId) {
          // Update existing adjustment
          const updatedAdjustments = existingAdjustments.map(adj =>
            adj.id === editingAdjustmentId
              ? {
                  ...adj,
                  type: adjustmentType,
                  amount: adjustmentType === "amount" ? adjustmentAmount : undefined,
                  percentage: adjustmentType === "percentage" ? adjustmentPercentage : undefined,
                  isRecurring: adjustmentIsRecurring,
                  note: adjustmentNote
                }
              : adj
          )
          return {
            ...prev,
            [key]: updatedAdjustments
          }
        } else {
          // Add new adjustment
          const newAdjustment: ExpenseAdjustment = {
            id: generateId(),
            rowId: editingAdjustment.rowId,
            yearIndex: editingAdjustment.yearIndex,
            type: adjustmentType,
            amount: adjustmentType === "amount" ? adjustmentAmount : undefined,
            percentage: adjustmentType === "percentage" ? adjustmentPercentage : undefined,
            isRecurring: adjustmentIsRecurring,
            note: adjustmentNote
          }
          return {
            ...prev,
            [key]: [...existingAdjustments, newAdjustment]
          }
        }
      })
      
      setAdjustmentModalOpen(false)
      setEditingAdjustment(null)
      setEditingAdjustmentId(null)
      setAdjustmentType("amount")
      setAdjustmentAmount(0)
      setAdjustmentPercentage(0)
      setAdjustmentIsRecurring(false)
      setAdjustmentNote("")
    }
  }

  // Delete adjustment
  const deleteAdjustment = (adjustmentId: string) => {
    if (title === "Estimation des revenus annuels") {
      // Delete revenue adjustment
      setRevenueAdjustments((prev) => {
        const newAdjustments: Record<string, RevenueAdjustment[]> = {}
        for (const [key, adjustments] of Object.entries(prev)) {
          const filtered = adjustments.filter(adj => adj.id !== adjustmentId)
          if (filtered.length > 0) {
            newAdjustments[key] = filtered
          }
        }
        return newAdjustments
      })
    } else {
      // Delete expense adjustment
      setExpenseAdjustments((prev) => {
        const newAdjustments: Record<string, ExpenseAdjustment[]> = {}
        for (const [key, adjustments] of Object.entries(prev)) {
          const filtered = adjustments.filter(adj => adj.id !== adjustmentId)
          if (filtered.length > 0) {
            newAdjustments[key] = filtered
          }
        }
        return newAdjustments
      })
    }
  }

  // Update expense type for a row
  const updateExpenseType = (rowId: string, newType: "variable" | "fixe") => {
    setExpenseTypes((prev) => ({
      ...prev,
      [rowId]: newType
    }))
  }

  // Check if notes are allowed for this view
  const isNoteAllowed = (): boolean => {
    return view === "current" || view === "comparison" || view === "ytd" || view === "ddm"
  }

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

  const openOrToggleLineAnalysis = useCallback((snapshot: LineAnalysisSnapshot) => {
    setLineAnalysis((prev) => {
      const next = prev?.rowId === snapshot.rowId ? null : snapshot
      if (next) {
        setLineAnalysisView("current")
        setShowAllAnalysisAccounts(false)
      }
      return next
    })
  }, [])

  /** Détail : postes « Annexe » (sommaire) ; sous-lignes detailOnly indentées sous l’annexe. */
  const mapBackendRowsDefinedOnly = (
    apiRows: FinancialStatementRow[],
    structure: Record<string, unknown>[]
  ): DetailRow[] => {
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

  // Convert series API data to DetailRow[] for monthly views (12months)
  const getSeriesDetailRows = (): DetailRow[] => {
    if (!seriesRows.length || !seriesPeriods.length || !incomeStatementStructure) return []
    const sorted = filterSeriesRowsDefinedOnly(seriesRows, incomeStatementStructure)
    return sorted.map((row) => {
      const trend = monthTrendFromReference(row, seriesPeriods, refMonth, refYear, 12)
      const lastAmount = trend[0] || 0
      const priorAmount = trend.length >= 2 ? trend[1] || 0 : 0
      const sr = findStructureRowForStatementLine(row.id, row.label, incomeStatementStructure)
      const sub = sr ? isStructureRowDetailOnly(sr) : false
      const isAnnexTitle = !sub && normalizeAnnexLetter(String(row.annexLetter ?? "")) !== ""
      const balanceAccounts = balanceAccountsFromSeriesRowDetail(
        row,
        seriesPeriods,
        "12months",
        refMonth,
        refYear
      )
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
        balanceAccounts,
        rowId: row.id,
      })
    })
  }

  // Convert series API data to DetailRow[] for quarterly views
  const getSeriesQuarterRows = (): DetailRow[] => {
    if (!seriesRows.length || !seriesPeriods.length || !incomeStatementStructure) return []
    const sorted = filterSeriesRowsDefinedOnly(seriesRows, incomeStatementStructure)
    return sorted.map((row) => {
      const trend = quarterTrendFromReference(row, seriesPeriods, refMonth, refYear, 5)
      const sr = findStructureRowForStatementLine(row.id, row.label, incomeStatementStructure)
      const lastAmount = trend[0] || 0
      const priorAmount = trend.length >= 2 ? trend[1] || 0 : 0
      const sub = sr ? isStructureRowDetailOnly(sr) : false
      const isAnnexTitle = !sub && normalizeAnnexLetter(String(row.annexLetter ?? "")) !== ""
      const balanceAccounts = balanceAccountsFromSeriesRowDetail(
        row,
        seriesPeriods,
        "quarters",
        refMonth,
        refYear
      )
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
        balanceAccounts,
        rowId: row.id,
      })
    })
  }

  // Convert series API data to DetailRow[] for yearly views
  const getSeriesYearRows = (): DetailRow[] => {
    if (!seriesRows.length || !seriesPeriods.length || !incomeStatementStructure) return []
    const sorted = filterSeriesRowsDefinedOnly(seriesRows, incomeStatementStructure)
    return sorted.map((row) => {
      const trend = yearTrendFromReference(row, seriesPeriods, refYear, 6)
      const sr = findStructureRowForStatementLine(row.id, row.label, incomeStatementStructure)
      const lastAmount = trend[0] || 0
      const priorAmount = trend.length >= 2 ? trend[1] || 0 : 0
      const sub = sr ? isStructureRowDetailOnly(sr) : false
      const isAnnexTitle = !sub && normalizeAnnexLetter(String(row.annexLetter ?? "")) !== ""
      const balanceAccounts = balanceAccountsFromSeriesRowDetail(
        row,
        seriesPeriods,
        "years",
        refMonth,
        refYear
      )
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
        balanceAccounts,
        rowId: row.id,
      })
    })
  }

  // Get base value (without adjustments) for a specific row and year
  const getBaseValue = (rowId: string, yearIndex: number, defaultValue: number, baseValue?: number): number => {
    const key = `${rowId}-${yearIndex}`
    // If value was manually edited, use it; otherwise use calculated default
    if (revenueValues[key] !== undefined) {
      return revenueValues[key]
    }
    
    // For fixed expenses, recalculate based on inflation if not manually edited
    if (title === "Estimation des dépenses annuelles" && getExpenseType(rowId) === "fixe" && yearIndex > 0) {
      // Get the base value (year 0) - either edited, provided, or default
      const baseKey = `${rowId}-0`
      const actualBaseValue = revenueValues[baseKey] !== undefined 
        ? revenueValues[baseKey] 
        : (baseValue !== undefined ? baseValue : defaultValue)
      // Calculate with compound inflation using the specific or global inflation rate
      const rate = getInflationRate(rowId)
      const compoundValue = actualBaseValue * Math.pow(1 + rate / 100, yearIndex)
      return Math.round(compoundValue)
    }
    
    return defaultValue
  }

  // Get forecast value for a specific row and year (uses edited values if available, applies adjustments)
  const getRevenueValue = (rowId: string | undefined, yearIndex: number, defaultValue: number, baseValue?: number): number => {
    if (!rowId || !isForecastSection) return defaultValue
    
    // Get base value (without adjustments)
    let calculatedValue = getBaseValue(rowId, yearIndex, defaultValue, baseValue)
    
    // Apply adjustments
    if (title === "Estimation des revenus annuels") {
      // Get all revenue adjustments for this year
      const adjustments = getRevenueAdjustments(rowId, yearIndex)
      if (adjustments.length > 0) {
        // Use the most recent adjustment (last one in the array)
        const adjustment = adjustments[adjustments.length - 1]
        
        if (adjustment.type === "amount") {
          // Direct amount
          calculatedValue = adjustment.value
        } else {
          // For growth types, we need the previous year's value
          const previousValue = yearIndex > 0 
            ? getRevenueValue(rowId, yearIndex - 1, defaultValue, baseValue)
            : calculatedValue
          
          if (adjustment.type === "growthPercent") {
            // Growth percentage
            calculatedValue = Math.round(previousValue * (1 + adjustment.value / 100))
          } else if (adjustment.type === "growthAmount") {
            // Growth amount in dollars
            calculatedValue = previousValue + adjustment.value
          }
        }
      }
    } else if (title === "Estimation des dépenses annuelles") {
      // Get all direct adjustments for this year
      const directAdjustments = getAdjustments(rowId, yearIndex)
      for (const adjustment of directAdjustments) {
        if (adjustment.type === "amount") {
          // Amount adjustment: add/subtract the amount
          calculatedValue = calculatedValue + (adjustment.amount || 0)
        } else if (adjustment.type === "percentage") {
          // Percentage adjustment: calculate expense as percentage of revenue
          // Get revenue for this year to calculate the expense percentage
          const revenueRow = data.find(r => 
            (r.label.toLowerCase().includes("total revenus") || 
             r.label.toLowerCase().includes("revenus totaux") ||
             (r.label.toLowerCase().includes("revenu") && r.isSubtotal)) &&
            r.trendValues && r.trendValues[yearIndex] !== undefined
          )
          if (revenueRow && revenueRow.trendValues) {
            const revenueValue = getRevenueValue(revenueRow.rowId || "", yearIndex, revenueRow.trendValues[yearIndex])
            const expenseFromPercentage = Math.round(revenueValue * (adjustment.percentage || 0) / 100)
            // Replace the calculated value with the percentage-based value
            calculatedValue = expenseFromPercentage
          }
        }
      }
      
      // Get all recurring adjustments from previous years
      const recurringAdjustments = getRecurringAdjustments(rowId, yearIndex)
      for (const adjustment of recurringAdjustments) {
        if (adjustment.type === "amount") {
          // Apply the recurring amount adjustment with inflation from the adjustment year to this year
          const rate = getInflationRate(rowId)
          const yearsDiff = yearIndex - adjustment.yearIndex
          const adjustedAmount = (adjustment.amount || 0) * Math.pow(1 + rate / 100, yearsDiff)
          calculatedValue = calculatedValue + Math.round(adjustedAmount)
        } else if (adjustment.type === "percentage") {
          // For recurring percentage adjustments, use the new percentage for all future years
          // Get revenue for this year to calculate the expense percentage
          const revenueRow = data.find(r => 
            (r.label.toLowerCase().includes("total revenus") || 
             r.label.toLowerCase().includes("revenus totaux") ||
             (r.label.toLowerCase().includes("revenu") && r.isSubtotal)) &&
            r.trendValues && r.trendValues[yearIndex] !== undefined
          )
          if (revenueRow && revenueRow.trendValues) {
            const revenueValue = getRevenueValue(revenueRow.rowId || "", yearIndex, revenueRow.trendValues[yearIndex])
            const expenseFromPercentage = Math.round(revenueValue * (adjustment.percentage || 0) / 100)
            // Replace the calculated value with the percentage-based value
            calculatedValue = expenseFromPercentage
          }
        }
      }
    }
    
    return calculatedValue
  }

  // Update forecast value for a row and year
  const updateRevenueValue = (rowId: string, yearIndex: number, newValue: number) => {
    const key = `${rowId}-${yearIndex}`
    setRevenueValues((prev) => ({
      ...prev,
      [key]: newValue
    }))
  }

  // Helper function to generate projected trend data for years using real API data
  const getYearsData = (): DetailRow[] => {
    const numYears = projectionYears + 1 // +1 for current year (projectionYears is 3, 4, or 5)
    const defaultGrowthRate = 0.05 // 5% default growth

    // Build projection trend from a base value
    const generateForecastTrend = (base: number, growthRate: number = defaultGrowthRate, rowId?: string) => {
      return Array.from({ length: numYears }, (_, i) => {
        const yearIndex = i

        // Check if this is a fixed expense and use inflation rate instead
        let effectiveGrowthRate = growthRate
        if (title === "Estimation des dépenses annuelles" && rowId && getExpenseType(rowId) === "fixe") {
          effectiveGrowthRate = 0 // Will be handled separately
        }

        // Calculate default value with compound growth
        let defaultValue: number
        if (yearIndex === 0) {
          defaultValue = base
        } else {
          // For fixed expenses with inflation, use compound inflation with year-specific rates
          if (title === "Estimation des dépenses annuelles" && rowId && getExpenseType(rowId) === "fixe") {
            const baseKey = `${rowId}-0`
            const actualBase = revenueValues[baseKey] !== undefined ? revenueValues[baseKey] : base
            const rate = getInflationRate(rowId)
            const compoundValue = actualBase * Math.pow(1 + rate / 100, yearIndex)
            defaultValue = Math.round(compoundValue)
          } else if (title === "Estimation des dépenses annuelles" && rowId && getExpenseType(rowId) === "variable") {
            // For variable expenses, calculate as percentage of revenue
            const variableRate = getVariableRate(rowId)
            if (variableRate > 0) {
              const revenueRow = data.find(r =>
                (r.label.toLowerCase().includes("total revenus") ||
                 r.label.toLowerCase().includes("revenus totaux") ||
                 (r.label.toLowerCase().includes("revenu") && r.isSubtotal)) &&
                r.trendValues && r.trendValues[yearIndex] !== undefined
              )
              if (revenueRow && revenueRow.trendValues) {
                const revenueValue = getRevenueValue(revenueRow.rowId || "", yearIndex, revenueRow.trendValues[yearIndex])
                defaultValue = Math.round(revenueValue * variableRate / 100)
              } else {
                defaultValue = Math.round(base * Math.pow(1 + effectiveGrowthRate, yearIndex))
              }
            } else {
              defaultValue = Math.round(base * Math.pow(1 + effectiveGrowthRate, yearIndex))
            }
          } else {
            defaultValue = Math.round(base * Math.pow(1 + effectiveGrowthRate, yearIndex))
          }
        }

        return rowId ? getRevenueValue(rowId, yearIndex, defaultValue, base) : defaultValue
      })
    }

    // Use real API data from series rows
    if (seriesRows.length > 0 && seriesPeriods.length > 0) {
      const rows: DetailRow[] = []

      for (const sr of seriesRows) {
        // Get real amounts and aggregate to yearly totals
        const rawAmounts = getRowAmounts(sr, seriesPeriods)
        const { amounts: yearlyAmounts } = aggregateToYears(rawAmounts, seriesPeriods)
        const baseAmount = yearlyAmounts.length > 0 ? yearlyAmounts[yearlyAmounts.length - 1] : 0
        const priorAmount = yearlyAmounts.length > 1 ? yearlyAmounts[yearlyAmounts.length - 2] : 0

        const isSection = sr.isSection
        const isResult = sr.isResult
        const isBold = sr.isBold || isResult
        const indent = !isBold && !isSection && !isResult

        // Generate projected trend: year 0 = latest real annual total, years 1+ = projected
        const rowId = sr.id
        const trendValues = isSection ? undefined : generateForecastTrend(baseAmount, defaultGrowthRate, indent ? rowId : undefined)

        rows.push({
          label: sr.label,
          current: baseAmount,
          prior: priorAmount,
          isBold,
          isSection,
          isSubtotal: isResult,
          indent,
          trendValues,
          rowId: indent ? rowId : undefined,
          balanceAccounts: (indent && projectionMode === "gl" && sr.detailRows.length > 0) ? sr.detailRows.map((dr) => {
            const drAmounts = seriesPeriods.map((p) => dr.amounts[`${p.fiscalYear}-${p.fiscalMonth}`] || 0)
            const drYearly = aggregateToYears(drAmounts, seriesPeriods)
            return {
              accountNumber: dr.id,
              accountName: dr.label,
              amount: drYearly.amounts.length > 0 ? drYearly.amounts[drYearly.amounts.length - 1] : 0,
              priorAmount: drYearly.amounts.length > 1 ? drYearly.amounts[drYearly.amounts.length - 2] : 0,
            }
          }) : undefined,
        })

        // Recalculate subtotal trend values from child rows
        if (isResult && trendValues) {
          // Find child rows (non-section, non-result rows above this result)
          const childRows: DetailRow[] = []
          for (let j = rows.length - 2; j >= 0; j--) {
            const prev = rows[j]
            if (prev.isSection) break
            if (!prev.isSubtotal && prev.indent && prev.trendValues) {
              childRows.push(prev)
            }
          }
          if (childRows.length > 0) {
            for (let y = 0; y < numYears; y++) {
              trendValues[y] = childRows.reduce((sum, cr) => sum + (cr.trendValues?.[y] || 0), 0)
            }
          }
        }
      }

      return rows
    }

    // No API data available - return empty
    return []
  }

  const getDetailData = (): DetailRow[] => {
    // Return series API data for multi-period views (non-forecast)
    if (view === "12months" && !isForecastSection) {
      return getSeriesDetailRows()
    }
    if (view === "quarters" && !isForecastSection) {
      return getSeriesQuarterRows()
    }
    if (view === "years" && !isForecastSection) {
      return getSeriesYearRows()
    }
    // Forecast sections still use getYearsData for projection logic
    if (view === "years" && isForecastSection) {
      return getYearsData()
    }
    // Use page-level API data for current/comparison/ytd/ddm views when available
    // The parent page fetches with the appropriate period parameter (monthly, quarterly, annual, ytd)
    // and comparison type, so backendRows already contain the correct data for all these views.
    if (!isForecastSection && backendRows.length > 0) {
      if (incomeStatementStructure === null) return []
      return mapBackendRowsDefinedOnly(backendRows, incomeStatementStructure)
    }
    // No data available
    return []
  }

  // Helper function to capitalize first letter
  let data = getDetailData()

  // Dénominateur « % des revenus » : **même source que le Sommaire** (`backendRows` de l’API), pas les lignes
  // du Détail (tri / filtres `showInDetail` / ordre structure). Sinon le premier poste du Détail peut être
  // une autre ligne (ex. autre montant que la ligne « Revenus » du sommaire).
  const revenueDenominator = (() => {
    if (!isForecastSection && backendRows.length > 0) {
      const isRevenusLabel = (r: FinancialStatementRow) =>
        normLabel(String(r.label ?? "")) === "revenus"
      const ligneRevenus = backendRows.find((r) => isRevenusLabel(r) && !r.isSection)
      if (ligneRevenus) {
        return { current: ligneRevenus.current ?? 0, prior: ligneRevenus.prior ?? 0 }
      }
      const anyRevenus = backendRows.find((r) => isRevenusLabel(r))
      if (anyRevenus) {
        return { current: anyRevenus.current ?? 0, prior: anyRevenus.prior ?? 0 }
      }
      const firstSummary = backendRows.find(
        (r) => !r.detailOnly && !isOmittedIncomeStatementSummaryRowLabel(r.label)
      )
      if (firstSummary) {
        return { current: firstSummary.current ?? 0, prior: firstSummary.prior ?? 0 }
      }
    }
    const fromMapped =
      data.find((row) => normLabel(String(row.statementLabel ?? "")) === "revenus") ??
      data.find((row) => normLabel(row.label) === "revenus")
    if (fromMapped) {
      return { current: fromMapped.current ?? 0, prior: fromMapped.prior ?? 0 }
    }
    return { current: 1, prior: 1 }
  })()
  const revenueCurrent = revenueDenominator.current
  const revenuePrior = revenueDenominator.prior

  /** Dénominateur par colonne pour % revenus en vues multi-périodes : même source que les montants (série API), pas seulement le libellé affiché « Revenus ». */
  const revenueTrendValues = useMemo(() => {
    if (
      isMultiPeriodView &&
      !isForecastSection &&
      seriesRows.length > 0 &&
      seriesPeriods.length > 0 &&
      incomeStatementStructure
    ) {
      const sorted = filterSeriesRowsDefinedOnly(seriesRows, incomeStatementStructure)
      const revenueSeries =
        sorted.find((r) => normLabel(r.label) === "revenus" && !r.isSection) ??
        sorted.find((r) => normLabel(r.label) === "revenus") ??
        sorted.find(
          (r) =>
            r.isResult &&
            normLabel(r.label).includes("revenu") &&
            (normLabel(r.label).includes("total") || normLabel(r.label).includes("totaux"))
        )
      if (revenueSeries) {
        if (view === "12months") {
          return monthTrendFromReference(revenueSeries, seriesPeriods, refMonth, refYear, 12)
        }
        if (view === "quarters") {
          return quarterTrendFromReference(revenueSeries, seriesPeriods, refMonth, refYear, 5)
        }
        if (view === "years") {
          return yearTrendFromReference(revenueSeries, seriesPeriods, refYear, 6)
        }
      }
    }
    const fromData =
      data.find((row) => normLabel(String(row.statementLabel ?? "")) === "revenus" && !row.isSection) ??
      data.find((row) => normLabel(String(row.statementLabel ?? "")) === "revenus") ??
      data.find((row) => normLabel(row.label) === "revenus" && !row.isSection) ??
      data.find((row) => normLabel(row.label) === "revenus")
    return fromData?.trendValues ?? []
  }, [
    isMultiPeriodView,
    isForecastSection,
    seriesRows,
    seriesPeriods,
    incomeStatementStructure,
    view,
    refMonth,
    refYear,
    filterSeriesRowsDefinedOnly,
    data,
  ])

  // Filter data to show only REVENUS section if title is "Estimation des revenus annuels"
  if (title === "Estimation des revenus annuels") {
    const revenueSectionStart = data.findIndex(row => row.label === "REVENUS")
    if (revenueSectionStart !== -1) {
      // Find "Total Revenus" and stop right after it (excluding the spacer row)
      const totalRevenusIndex = data.findIndex((row, idx) => 
        idx > revenueSectionStart && 
        row.label.toLowerCase().includes("total revenus") && 
        row.isSubtotal
      )
      if (totalRevenusIndex !== -1) {
        // Include "Total Revenus" but exclude the spacer row after it
        data = data.slice(revenueSectionStart, totalRevenusIndex + 1)
      } else {
        // Fallback: find the end of REVENUS section (next section or end of array)
        let revenueSectionEnd = data.findIndex((row, idx) => 
          idx > revenueSectionStart && 
          row.isSection && 
          row.label !== "REVENUS"
        )
        if (revenueSectionEnd === -1) {
          revenueSectionEnd = data.length
        }
        data = data.slice(revenueSectionStart, revenueSectionEnd)
      }
    }
  }
  
  // Filter data to exclude REVENUS section if title is "Estimation des dépenses annuelles"
  if (title === "Estimation des dépenses annuelles") {
    const revenueSectionStart = data.findIndex(row => row.label === "REVENUS")
    if (revenueSectionStart !== -1) {
      // Find the end of REVENUS section (next section or end of array)
      let revenueSectionEnd = data.findIndex((row, idx) => 
        idx > revenueSectionStart && 
        row.isSection && 
        row.label !== "REVENUS"
      )
      if (revenueSectionEnd === -1) {
        revenueSectionEnd = data.length
      }
      // Exclude the spacer row after Total Revenus if it exists
      if (revenueSectionEnd < data.length && data[revenueSectionEnd] && data[revenueSectionEnd].label === "") {
        revenueSectionEnd++
      }
      // Remove the REVENUS section (from start to end, including spacer)
      data = [...data.slice(0, revenueSectionStart), ...data.slice(revenueSectionEnd)]
    }
  }
  
  // If projectionMode is "account", remove balanceAccounts from all rows in forecast sections
  // This must be done AFTER all filtering operations
  const isForecastSectionForBalanceAccounts = title === "Estimation des revenus annuels" || title === "Estimation des dépenses annuelles" || title === "Estimation des Capex annuels" || title === "États des résultats pro forma"
  if (projectionMode === "account" && isForecastSectionForBalanceAccounts) {
    data = data.map((row) => {
      // Always remove balanceAccounts in account mode for forecast sections
      if (row.balanceAccounts || 'balanceAccounts' in row) {
        const { balanceAccounts, ...rowWithoutBalanceAccounts } = row
        return rowWithoutBalanceAccounts
      }
      return row
    })
  }

  if (title === "Détail" && !isForecastSection) {
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

  const awaitingIncomeStatementStructure =
    !isForecastSection && !!companyId && incomeStatementStructure === null

  // Determine loading state early so it can be used in both empty-data and loading checks
  const isDataLoading =
    awaitingIncomeStatementStructure ||
    (seriesLoading && isMultiPeriodView) ||
    (loading && !isForecastSection && !isMultiPeriodView) ||
    entityDataLoading

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
      const year = fiscalYear || new Date().getFullYear()

      for (const entity of entities) {
        try {
          const params: FinancialStatementSeriesParams = {
            fiscal_year: year,
            months: 12,
            structure_rev: structureVersion > 0 ? structureVersion : undefined,
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
            "income-statement",
            params
          )

          if (!cancelled && response.rows && incomeStatementStructure) {
            const seriesHorizon =
              view === "12months"
                ? ("12months" as const)
                : view === "quarters"
                  ? ("quarters" as const)
                  : view === "years"
                    ? ("years" as const)
                    : null
            const periods = response.periods ?? []
            const sorted = filterSeriesRowsDefinedOnly(response.rows, incomeStatementStructure)
            const mapped: DetailRow[] = sorted.map((row) => {
              const amounts = Object.entries(row.amounts)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([, v]) => v)
              const lastAmount = amounts[amounts.length - 1] || 0
              const priorAmount = amounts.length >= 2 ? amounts[amounts.length - 2] || 0 : 0
              const sr = findStructureRowForStatementLine(row.id, row.label, incomeStatementStructure)
              const sub = sr ? isStructureRowDetailOnly(sr) : false
              const isAnnexTitle = !sub && normalizeAnnexLetter(String(row.annexLetter ?? "")) !== ""
              const balanceAccounts =
                seriesHorizon && periods.length > 0
                  ? balanceAccountsFromSeriesRowDetail(row, periods, seriesHorizon, refMonth, refYear)
                  : undefined
              return zeroAmountsForAnnexTitleRow({
                label: detailLineLabelForDisplay(sr, row.label, row.annexLetter),
                statementLabel: row.label,
                annexLetter: String(row.annexLetter ?? ""),
                current: lastAmount,
                prior: priorAmount,
                indent: sub,
                isBold: !sub,
                isSubtotal: row.isResult,
                isSection: row.isSection ?? false,
                isAnnexTitle,
                balanceAccounts,
                rowId: row.id,
              })
            })
            if (title === "Détail" && !isForecastSection) {
              const trendLen = mapped.find((r) => r.trendValues != null)?.trendValues?.length ?? 0
              results[entity.id] = insertAnnexDetailPlaceholderRows(
                mapped,
                trendLen > 0 ? trendLen : undefined
              )
            } else {
              results[entity.id] = mapped
            }
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
  }, [
    isComparisonMode,
    companies,
    companyId,
    divisionId,
    isCompanyComparison,
    isDivisionComparison,
    isSubDivisionComparison,
    fiscalYear,
    structureVersion,
    incomeStatementStructure,
    filterSeriesRowsDefinedOnly,
    title,
    view,
    refMonth,
    refYear,
  ])

  // Toujours avant tout return : sinon la vue « 12 mois » (data vide transitoire) saute ce hook.
  const isStructureStudio = structureEditMode && canInlineStructureEdit
  const showStructureCols =
    isStructureStudio && !structEdit.loading && detailAnnexEditorGlobalIndices.length > 0

  // Helper function to calculate percentage of revenue
  const getRevenuePercentage = (value: number, isPrior: boolean): number => {
    const revenue = isPrior ? revenuePrior : revenueCurrent
    if (revenue === 0) return 0
    return (value / revenue) * 100
  }

  const getTrendRevenuePercentage = (value: number, valueIdx: number): number => {
    const revenue = revenueTrendValues[valueIdx] ?? 0
    if (revenue === 0) return 0
    return (value / revenue) * 100
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
    else if (view === "years") parts.push(title === "Estimation des revenus annuels" ? "6 prochaines années" : "6 dernières années")

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
      parts.push("• % des revenus")
    } else {
      parts.push("• Variations")
    }

    return parts.join(" • ")
  }

  // Helper function to generate month labels (12 months)
  const getMonthLabels = (): string[] => {
    if (seriesPeriods.length > 0 && !isForecastSection) {
      return monthShortLabelsFromReference(refMonth, refYear, 12)
    }
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
    const currentDate = new Date()
    const labels: string[] = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      labels.push(`${months[date.getMonth()]} ${date.getFullYear()}`)
    }
    return reverseSeriesOrderForDisplay(labels)
  }

  // Helper function to generate quarter labels (5 quarters)
  const getQuarterLabels = (): string[] => {
    if (seriesPeriods.length > 0 && !isForecastSection) {
      return quarterLabelsFromReference(refMonth, refYear, 5)
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

  // Helper function to generate year labels (projectionYears + 1 for forecast sections)
  const getYearLabels = (): string[] => {
    if (seriesPeriods.length > 0 && !isForecastSection) {
      return yearLabelsFromReference(refYear, 6)
    }
    const currentYear = new Date().getFullYear()
    const labels: string[] = []
    if (isForecastSection) {
      // Generate projectionYears + 1 years starting from current year (current year + 0 to projectionYears)
      for (let i = 0; i <= projectionYears; i++) {
        labels.push(`${currentYear + i}`)
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        labels.push(`${currentYear - i}`)
      }
    }
    return isForecastSection ? labels : reverseSeriesOrderForDisplay(labels)
  }

  // Helper function to get horizon text
  const getHorizonText = (): string => {
    if (view === "comparison" && (period === "monthly" || period === "quarterly" || period === "annual")) {
      return getCurrentColumnLabel()
    }
    if (view === "ytd") return "YTD"
    if (view === "ddm" && (period === "monthly" || period === "quarterly" || period === "annual")) {
      return getCurrentColumnLabel()
    }
    if (view === "ddm") return "DDM"
    if (view === "12months") return HORIZON_LABEL.mensuel
    if ((view as string) === "24months") return "24 mois"
    if (view === "quarters") return HORIZON_LABEL.trimestriel2Ans
    if (view === "years") return HORIZON_LABEL.annuel5Ans
    return HORIZON_LABEL.moisActuel
  }

  const analysisSeriesOverview = useMemo(() => {
    if (!lineAnalysis?.rowId || !analysisSeriesRows.length || !analysisPeriods.length) return null

    const targetRow = findSeriesRowOrDetail(analysisSeriesRows, lineAnalysis.rowId)
    if (!targetRow) return null

    const rawMonthlyAmounts = getRowAmounts(targetRow, analysisPeriods)
    const rawMonthlyLabels = getPeriodLabels(analysisPeriods)

    const resolveRevenueSeries = () => {
      if (incomeStatementStructure) {
        const sorted = filterSeriesRowsDefinedOnly(analysisSeriesRows, incomeStatementStructure)
        const revenueSeries =
          sorted.find((r) => normLabel(r.label) === "revenus" && !r.isSection) ??
          sorted.find((r) => normLabel(r.label) === "revenus") ??
          sorted.find(
            (r) =>
              r.isResult &&
              normLabel(r.label).includes("revenu") &&
              (normLabel(r.label).includes("total") || normLabel(r.label).includes("totaux"))
          )
        if (revenueSeries) return revenueSeries
      }
      return findRow(analysisSeriesRows, "revenus")
    }

    const revenueRow = resolveRevenueSeries()
    const rawRevenueAmounts = revenueRow ? getRowAmounts(revenueRow, analysisPeriods) : rawMonthlyLabels.map(() => 0)

    const monthlySeries = rawMonthlyLabels.map((label, idx) => {
      const amount = rawMonthlyAmounts[idx] ?? 0
      const rev = rawRevenueAmounts[idx] ?? 0
      const pctRevenue = Math.abs(rev) < 1e-9 ? 0 : (amount / rev) * 100
      return {
        period: label,
        amount,
        amountPos: Math.max(0, amount),
        amountNeg: Math.min(0, amount),
        pctRevenue,
      }
    })

    const trailing12 = monthlySeries.slice(-12)
    const trailing12Average =
      trailing12.length > 0
        ? trailing12.reduce((sum, point) => sum + point.amount, 0) / trailing12.length
        : 0
    const trailing12AveragePctRevenue =
      trailing12.length > 0
        ? trailing12.reduce((sum, point) => sum + point.pctRevenue, 0) / trailing12.length
        : 0

    const yearlyAgg = aggregateToYears(rawMonthlyAmounts, analysisPeriods)
    const yearlyRevenueAgg = aggregateToYears(rawRevenueAmounts, analysisPeriods)
    const yearlySeries = yearlyAgg.labels.map((label, idx) => {
      const amount = yearlyAgg.amounts[idx] ?? 0
      const rev = yearlyRevenueAgg.amounts[idx] ?? 0
      const pctRevenue = Math.abs(rev) < 1e-9 ? 0 : (amount / rev) * 100
      return {
        period: label,
        amount,
        amountPos: Math.max(0, amount),
        amountNeg: Math.min(0, amount),
        pctRevenue,
      }
    })
    const trailing5Years = yearlySeries.slice(-5)
    const trailing5YearsAverage =
      trailing5Years.length > 0
        ? trailing5Years.reduce((sum, point) => sum + point.amount, 0) / trailing5Years.length
        : 0
    const trailing5YearsAveragePctRevenue =
      trailing5Years.length > 0
        ? trailing5Years.reduce((sum, point) => sum + point.pctRevenue, 0) / trailing5Years.length
        : 0

    return {
      trailing12,
      trailing12Average,
      trailing12AveragePctRevenue,
      trailing5Years,
      trailing5YearsAverage,
      trailing5YearsAveragePctRevenue,
    }
  }, [
    analysisPeriods,
    analysisSeriesRows,
    lineAnalysis?.rowId,
    incomeStatementStructure,
    filterSeriesRowsDefinedOnly,
  ])

  /** Lecture « Mois actuel » : toujours mois de référence, M-1 et même mois N-1 (séries), indépendamment de la vue tableau. */
  const analysisMonthReading = useMemo(() => {
    if (isForecastSection) return null
    if (!lineAnalysis?.rowId || !analysisSeriesRows.length || !analysisPeriods.length) return null
    const targetRow = findSeriesRowOrDetail(analysisSeriesRows, lineAnalysis.rowId)
    if (!targetRow) return null

    const lineTrend = monthTrendFromReference(targetRow, analysisPeriods, refMonth, refYear, 13)
    const current = lineTrend[0] ?? 0
    const lastMonth = lineTrend[1] ?? 0
    const priorYearMonth = lineTrend[12] ?? 0

    const resolveRevenueSeries = () => {
      if (incomeStatementStructure) {
        const sorted = filterSeriesRowsDefinedOnly(analysisSeriesRows, incomeStatementStructure)
        const revenueSeries =
          sorted.find((r) => normLabel(r.label) === "revenus" && !r.isSection) ??
          sorted.find((r) => normLabel(r.label) === "revenus") ??
          sorted.find(
            (r) =>
              r.isResult &&
              normLabel(r.label).includes("revenu") &&
              (normLabel(r.label).includes("total") || normLabel(r.label).includes("totaux"))
          )
        if (revenueSeries) return revenueSeries
      }
      return findRow(analysisSeriesRows, "revenus")
    }

    const revenueRow = resolveRevenueSeries()
    const revenueTrend = revenueRow
      ? monthTrendFromReference(revenueRow, analysisPeriods, refMonth, refYear, 13)
      : []

    const pctOfRevenue = (amount: number, idx: number) => {
      const den = revenueTrend[idx] ?? 0
      if (Math.abs(den) < 1e-9) return 0
      return (amount / den) * 100
    }

    return {
      current,
      lastMonth,
      priorYearMonth,
      pctCurrent: pctOfRevenue(current, 0),
      pctLastMonth: pctOfRevenue(lastMonth, 1),
      pctPriorYearMonth: pctOfRevenue(priorYearMonth, 12),
      vsLastMonthPct: calculateVariation(current, lastMonth),
      vsLastMonthDollar: current - lastMonth,
      vsPriorYearPct: calculateVariation(current, priorYearMonth),
      vsPriorYearDollar: current - priorYearMonth,
    }
  }, [
    isForecastSection,
    lineAnalysis?.rowId,
    analysisSeriesRows,
    analysisPeriods,
    refMonth,
    refYear,
    incomeStatementStructure,
    filterSeriesRowsDefinedOnly,
  ])

  // Show "no data" state when data is empty and not loading
  if (data.length === 0 && !isDataLoading && !isForecastSection) {
    return (
      <div className={cn("w-full", dashboardCardFrameStaticClass)}>
        <div className={dashboardCardRingClass} aria-hidden />
        <div className="relative">
          <div className={cn("px-6 py-5 sm:px-7", dashboardCardHeaderBarClass)}>
            <div className="flex items-center gap-4">
              <div className={dashboardCardHeaderIconBoxClass}>
                <ListTree className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
              </div>
              <h2 className={cn("text-xl leading-tight", dashboardCardTitleClass)}>{title}</h2>
            </div>
          </div>
          <div className="px-8 py-16 text-center">
            <p className={cn("text-sm", dashboardCardBodyMutedClass)}>Aucune donnée disponible pour cette période.</p>
          </div>
        </div>
      </div>
    )
  }

  const trendLenForPad = data.find((r) => r.trendValues != null)?.trendValues?.length ?? 0

  const padDetailRowForStructure = (structRow: Record<string, unknown>): DetailRow => {
    const sub = isStructureRowDetailOnly(structRow)
    return {
      label: String(structRow.label ?? ""),
      statementLabel: String(structRow.label ?? ""),
      current: 0,
      prior: 0,
      indent: sub,
      isBold: sub ? false : true,
      isSubtotal: false,
      isSection: false,
      isAnnexTitle:
        !sub &&
        isStructureRowInDetailAnnexEditor(structRow) &&
        normalizeAnnexLetter(String(structRow.annexLetter ?? "")) !== "",
      trendValues: trendLenForPad > 0 ? Array(trendLenForPad).fill(0) : undefined,
      rowId: String(structRow.id ?? "").trim() || undefined,
    }
  }

  const detailFinancialRowForStructure = (structRow: Record<string, unknown>): DetailRow => {
    const sl = normLabel(String(structRow.label ?? ""))
    const matches = (r: DetailRow) => {
      if (r.statementLabel && normLabel(r.statementLabel) === sl) return true
      if (normLabel(r.label) === sl) return true
      const stripped = r.label.replace(/^Annexe\s+[A-Z0-9]+\s*[—–-]\s*/i, "").trim()
      return normLabel(stripped) === sl
    }
    const found = data.find(matches)
    if (found) return found
    return padDetailRowForStructure(structRow)
  }

  const structureStudioLabelBold = (structRow: Record<string, unknown>, displayRow: DetailRow): boolean => {
    const lab = normLabel(String(structRow.label ?? ""))
    const boldLabels = [
      "revenus",
      "bénéfice brut",
      "charges d'exploitation",
      "bénéfice avant impôts",
      "total des charges",
      "bénéfice net",
      "baiia",
    ]
    return (
      boldLabels.includes(lab) ||
      !!displayRow.isSubtotal ||
      (lab.includes("bénéfice net") && !!displayRow.isSubtotal) ||
      lab === "baiia"
    )
  }

  const detailTableRowCount = showStructureCols ? detailAnnexStructureTableLayout.length : data.length

  // Show loading state when fetching data
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

  /** Bloc synthèse + ventilation (+ astuce), utilisé dans la carte unifiée. */
  const renderLineAnalysisBody = () => {
    if (!lineAnalysis) return null
    const ctx = lineAnalysis
    const variation =
      ctx.current != null && ctx.prior != null ? calculateVariation(ctx.current, ctx.prior) : null
    const variationAmount = ctx.current - ctx.prior
    const accountsSorted = [...(ctx.balanceAccounts ?? [])].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    const visibleAccounts = showAllAnalysisAccounts ? accountsSorted : accountsSorted.slice(0, 4)
    const parentPostRow =
      ctx.parentRowId != null ? data.find((r) => r.rowId === ctx.parentRowId) : null
    const lineDenomBase =
      parentPostRow != null ? parentPostRow.current ?? 0 : ctx.current
    const lineDenom = Math.abs(lineDenomBase) > 1e-9 ? Math.abs(lineDenomBase) : 1
    const showComparisonAmounts =
      (view === "comparison" || view === "ytd" || view === "ddm") && !showStructureCols

    const monthReading = analysisMonthReading
    const fmtDeltaPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`
    const fmtDeltaUsd = (v: number) => `${v >= 0 ? "+" : ""}${formatCurrency(v)}`

    return (
      <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Lecture du poste</p>
            <span className="mx-4 h-px flex-1 bg-slate-200/90" aria-hidden />
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Vue affichée</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  Choisissez la lecture que vous voulez afficher pour ce poste.
                </p>
              </div>
              <Select
                value={lineAnalysisView}
                onValueChange={(value: "current" | "trailing12" | "trailing5years") => setLineAnalysisView(value)}
              >
                <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white px-3 text-left text-sm shadow-sm sm:w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="current" className="rounded-lg">Mois actuel</SelectItem>
                  <SelectItem value="trailing12" className="rounded-lg">12 derniers mois</SelectItem>
                  <SelectItem value="trailing5years" className="rounded-lg">5 derniers exercices</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {lineAnalysisView === "current" ? (
              !isForecastSection && analysisSeriesLoading ? (
                <div className="mt-4 flex min-h-[100px] items-center justify-center rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/80 text-sm text-slate-500">
                  Chargement de l&apos;analyse mensuelle...
                </div>
              ) : !isForecastSection && monthReading ? (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-3 shadow-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Mois actuel</p>
                      <p className="mt-0.5 text-xs text-slate-500">{formatCalendarMonthYear(refMonth, refYear)}</p>
                      <p className="mt-2 text-lg font-semibold tabular-nums tracking-tight text-[#2A2F3A]">
                        {formatCurrency(monthReading.current)}
                      </p>
                      <p className="mt-1 text-xs tabular-nums text-slate-600">{monthReading.pctCurrent.toFixed(1)}% des revenus</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-3 shadow-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Mois dernier</p>
                      <p className="mt-0.5 text-xs text-slate-500">{formatPriorCalendarMonth(refMonth, refYear)}</p>
                      <p className="mt-2 text-lg font-semibold tabular-nums tracking-tight text-[#2A2F3A]">
                        {formatCurrency(monthReading.lastMonth)}
                      </p>
                      <p className="mt-1 text-xs tabular-nums text-slate-600">{monthReading.pctLastMonth.toFixed(1)}% des revenus</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-3 shadow-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Mois passé</p>
                      <p className="mt-0.5 text-xs text-slate-500">{formatSameMonthPriorYear(refMonth, refYear)}</p>
                      <p className="mt-2 text-lg font-semibold tabular-nums tracking-tight text-[#2A2F3A]">
                        {formatCurrency(monthReading.priorYearMonth)}
                      </p>
                      <p className="mt-1 text-xs tabular-nums text-slate-600">{monthReading.pctPriorYearMonth.toFixed(1)}% des revenus</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Mois actuel vs mois dernier
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">Variation $</p>
                          <p
                            className={cn(
                              "mt-0.5 text-base font-semibold tabular-nums",
                              monthReading.vsLastMonthDollar >= 0 ? "text-emerald-600" : "text-red-600"
                            )}
                          >
                            {fmtDeltaUsd(monthReading.vsLastMonthDollar)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">Variation %</p>
                          <p
                            className={cn(
                              "mt-0.5 text-base font-semibold tabular-nums",
                              monthReading.vsLastMonthPct >= 0 ? "text-emerald-600" : "text-red-600"
                            )}
                          >
                            {fmtDeltaPct(monthReading.vsLastMonthPct)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Mois actuel vs mois passé
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">Variation $</p>
                          <p
                            className={cn(
                              "mt-0.5 text-base font-semibold tabular-nums",
                              monthReading.vsPriorYearDollar >= 0 ? "text-emerald-600" : "text-red-600"
                            )}
                          >
                            {fmtDeltaUsd(monthReading.vsPriorYearDollar)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">Variation %</p>
                          <p
                            className={cn(
                              "mt-0.5 text-base font-semibold tabular-nums",
                              monthReading.vsPriorYearPct >= 0 ? "text-emerald-600" : "text-red-600"
                            )}
                          >
                            {fmtDeltaPct(monthReading.vsPriorYearPct)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {view === "current" ? "Montant" : getHorizonText()}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-[#2A2F3A]">
                      {ctx.current !== 0 ? formatCurrency(ctx.current) : "—"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {showComparisonAmounts ? getComparisonLabel() : "Référence"}
                    </p>
                    <p className="mt-2 text-lg font-semibold tabular-nums tracking-tight text-slate-700">
                      {showComparisonAmounts ? (ctx.prior !== 0 ? formatCurrency(ctx.prior) : "—") : formatCalendarMonthYear(refMonth, refYear)}
                    </p>
                  </div>

                  {columnMode === "variations" && showComparisonAmounts ? (
                    <>
                      <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Variation %</p>
                        <p className={cn("mt-2 text-lg font-semibold tabular-nums", variation != null && variation >= 0 ? "text-emerald-600" : "text-red-600")}>
                          {variation != null && ctx.current !== 0 ? `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%` : "—"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Variation $</p>
                        <p className={cn("mt-2 text-lg font-semibold tabular-nums", variationAmount >= 0 ? "text-emerald-600" : "text-red-600")}>
                          {ctx.current !== 0 ? `${variationAmount >= 0 ? "+" : ""}${formatCurrency(variationAmount)}` : "—"}
                        </p>
                      </div>
                    </>
                  ) : null}

                  {columnMode === "percentage" && showComparisonAmounts ? (
                    <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm sm:col-span-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">% des revenus</p>
                      <p className="mt-2 text-lg font-semibold tabular-nums text-slate-800">
                        {ctx.current !== 0 ? `${getRevenuePercentage(ctx.current, false).toFixed(1)}%` : "—"}
                      </p>
                    </div>
                  ) : null}
                </div>
              )
            ) : null}

            {lineAnalysisView === "trailing12" ? (
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">12 derniers mois</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">Evolution mensuelle du poste et moyenne glissante sur 12 mois.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Moyenne 12 mois</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-[#2A2F3A]">
                      {analysisSeriesOverview ? formatCurrency(analysisSeriesOverview.trailing12Average) : "—"}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold tabular-nums text-slate-600">
                      {analysisSeriesOverview
                        ? `${analysisSeriesOverview.trailing12AveragePctRevenue.toFixed(1)} % des revenus`
                        : "—"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-52">
                  {analysisSeriesLoading ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">Chargement de l&apos;historique...</div>
                  ) : analysisSeriesOverview?.trailing12.length ? (
                    <ChartContainer
                      config={{
                        amount: { label: "Montant", color: "#E0742D" },
                        pctRevenue: { label: "% revenus", color: "#2563eb" },
                        average: { label: "Moyenne 12 mois", color: "#94a3b8" },
                      }}
                      className="h-full w-full"
                    >
                      <ComposedChart
                        accessibilityLayer
                        data={analysisSeriesOverview.trailing12}
                        margin={{ top: 10, right: 12, left: 8, bottom: 0 }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                        <YAxis
                          yAxisId="left"
                          orientation="left"
                          width={44}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => {
                            const n = Number(v)
                            if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`
                            if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}k`
                            return String(Math.round(n))
                          }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          width={36}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value, name) => {
                                const n = Number(value ?? 0)
                                if (name === "pctRevenue") return [`${n.toFixed(1)}%`, "% des revenus"]
                                if (name === "amountPos" || name === "amountNeg") {
                                  return [formatCurrency(n), name === "amountPos" ? "Montant (≥ 0)" : "Montant (< 0)"]
                                }
                                return [formatCurrency(n), String(name)]
                              }}
                            />
                          }
                        />
                        <ReferenceLine
                          yAxisId="left"
                          y={analysisSeriesOverview.trailing12Average}
                          stroke="#94a3b8"
                          strokeDasharray="4 4"
                        />
                        <ReferenceLine
                          yAxisId="right"
                          y={analysisSeriesOverview.trailing12AveragePctRevenue}
                          stroke="#64748b"
                          strokeDasharray="3 3"
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="amountPos"
                          name="amountPos"
                          stackId="stack"
                          fill="var(--color-amount)"
                          radius={[0, 0, 0, 0]}
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="amountNeg"
                          name="amountNeg"
                          stackId="stack"
                          fill="#c2410c"
                          radius={[4, 4, 0, 0]}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="pctRevenue"
                          name="pctRevenue"
                          stroke="var(--color-pctRevenue)"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      </ComposedChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">Aucune donnée historique disponible.</div>
                  )}
                </div>
              </div>
            ) : null}

            {lineAnalysisView === "trailing5years" ? (
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">5 derniers exercices</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">Vue d&apos;ensemble annuelle du poste avec la moyenne des 5 derniers exercices.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Moyenne 5 exercices</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-[#2A2F3A]">
                      {analysisSeriesOverview ? formatCurrency(analysisSeriesOverview.trailing5YearsAverage) : "—"}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold tabular-nums text-slate-600">
                      {analysisSeriesOverview
                        ? `${analysisSeriesOverview.trailing5YearsAveragePctRevenue.toFixed(1)} % des revenus`
                        : "—"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-52">
                  {analysisSeriesLoading ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">Chargement de l&apos;historique...</div>
                  ) : analysisSeriesOverview?.trailing5Years.length ? (
                    <ChartContainer
                      config={{
                        amount: { label: "Montant", color: "#2A2F3A" },
                        pctRevenue: { label: "% revenus", color: "#2563eb" },
                        average: { label: "Moyenne 5 exercices", color: "#E0742D" },
                      }}
                      className="h-full w-full"
                    >
                      <ComposedChart
                        accessibilityLayer
                        data={analysisSeriesOverview.trailing5Years}
                        margin={{ top: 10, right: 12, left: 8, bottom: 0 }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis
                          yAxisId="left"
                          orientation="left"
                          width={44}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => {
                            const n = Number(v)
                            if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`
                            if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}k`
                            return String(Math.round(n))
                          }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          width={36}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value, name) => {
                                const n = Number(value ?? 0)
                                if (name === "pctRevenue") return [`${n.toFixed(1)}%`, "% des revenus"]
                                if (name === "amountPos" || name === "amountNeg") {
                                  return [formatCurrency(n), name === "amountPos" ? "Montant (≥ 0)" : "Montant (< 0)"]
                                }
                                return [formatCurrency(n), String(name)]
                              }}
                            />
                          }
                        />
                        <ReferenceLine
                          yAxisId="left"
                          y={analysisSeriesOverview.trailing5YearsAverage}
                          stroke="#94a3b8"
                          strokeDasharray="4 4"
                        />
                        <ReferenceLine
                          yAxisId="right"
                          y={analysisSeriesOverview.trailing5YearsAveragePctRevenue}
                          stroke="#64748b"
                          strokeDasharray="3 3"
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="amountPos"
                          name="amountPos"
                          stackId="stack"
                          fill="var(--color-amount)"
                          radius={[0, 0, 0, 0]}
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="amountNeg"
                          name="amountNeg"
                          stackId="stack"
                          fill="#c2410c"
                          radius={[4, 4, 0, 0]}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="pctRevenue"
                          name="pctRevenue"
                          stroke="var(--color-pctRevenue)"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      </ComposedChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">Aucune donnée historique disponible.</div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <p className="mt-6 text-sm italic leading-relaxed text-[#E0742D]">
            « Une meilleure lecture du poste, de sa variation et de sa ventilation GL pour expliquer clairement ce qui bouge dans le compte de résultat. »
          </p>
        </div>

        <div className="hidden lg:col-span-1 lg:block">
          <div className="mx-auto h-full w-px bg-gradient-to-b from-transparent via-slate-200/90 to-transparent" />
        </div>

        <div className="lg:col-span-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Ventilation du grand livre
            </p>
            <span className="mx-4 h-px flex-1 bg-slate-200/90" aria-hidden />
          </div>

          {accountsSorted.length > 0 ? (
            <ul className="mt-5 space-y-4">
              {visibleAccounts.map((acc, i) => {
                const line =
                  accountLabelAlreadyIncludesNumber(acc.accountNumber, acc.accountName)
                    ? acc.accountName.trim()
                    : `${acc.accountNumber} — ${acc.accountName}`
                const pct = (Math.abs(acc.amount) / lineDenom) * 100
                const glSelected = !!ctx.parentRowId && ctx.rowId === acc.accountNumber
                return (
                  <li key={`${acc.accountNumber}-${i}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setLineAnalysis((prev) => {
                          if (!prev) return prev
                          if (prev.parentRowId && prev.rowId === acc.accountNumber) {
                            const parentRow = data.find((r) => r.rowId === prev.parentRowId)
                            if (!parentRow?.rowId) return prev
                            return {
                              rowId: parentRow.rowId,
                              label: parentRow.label,
                              current: parentRow.current,
                              prior: parentRow.prior,
                              balanceAccounts: parentRow.balanceAccounts,
                              trendValues: parentRow.trendValues,
                            }
                          }
                          return {
                            rowId: acc.accountNumber,
                            label: line,
                            current: acc.amount,
                            prior: acc.priorAmount ?? 0,
                            balanceAccounts: prev.balanceAccounts,
                            trendValues: acc.trendValues,
                            parentRowId: prev.parentRowId ?? prev.rowId,
                          }
                        })
                        setLineAnalysisView("current")
                      }}
                      title="Afficher la lecture analytique de ce compte"
                      aria-pressed={glSelected}
                      className={cn(
                        "w-full rounded-2xl border bg-white/90 px-4 py-3 text-left shadow-sm transition-colors",
                        glSelected
                          ? "border-[#E0742D]/55 ring-2 ring-[#E0742D]/35"
                          : "border-slate-200/90 hover:border-slate-300/90 hover:bg-slate-50/80"
                      )}
                    >
                      <div className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#E0742D]" strokeWidth={2} />
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between gap-3">
                            <p className="min-w-0 flex-1 text-sm leading-relaxed text-[#5C5F66]">{line}</p>
                            <span className="shrink-0 text-sm font-semibold tabular-nums text-[#2A2F3A]">
                              {acc.amount !== 0 ? formatCurrency(acc.amount) : "—"}
                            </span>
                          </div>
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200/70">
                            <div className="h-full rounded-full bg-[#E0742D] transition-[width] duration-300" style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                            {pct.toFixed(0)} % du montant du poste (valeur absolue)
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-5 text-sm text-slate-500">
              Aucun compte GL disponible pour cette ligne.
            </div>
          )}

          {accountsSorted.length > 4 ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowAllAnalysisAccounts((prev) => !prev)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#5C5F66] transition hover:text-[#2A2F3A]"
              >
                {showAllAnalysisAccounts ? "Voir moins" : "Voir plus"}
                <ArrowRight className={cn("h-4 w-4 text-[#E0742D] transition-transform", showAllAnalysisAccounts && "rotate-90")} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  /** Carte unique : en-tête commun + bloc synthèse / ventilation + notes (même ligne). */
  const renderUnifiedAnalysisNoteCard = (opts?: { hideCloseButton?: boolean }) => {
    if (!lineAnalysis) return null
    const ctx = lineAnalysis
    const vPct =
      ctx.current != null && ctx.prior != null ? calculateVariation(ctx.current, ctx.prior) : null
    const vAmt = ctx.current - ctx.prior
    const selectedCompany = companyId ? companies.find((c) => c.id === companyId) : null
    const selectedDivision =
      companyId && divisionId ? selectedCompany?.divisions.find((d) => d.id === divisionId) : null
    const selectedSubDivision =
      companyId && divisionId && subDivisionId
        ? selectedDivision?.subDivisions.find((sd) => sd.id === subDivisionId)
        : null
    const contextBits = [
      selectedCompany?.name,
      selectedDivision?.name,
      selectedSubDivision?.name,
      formatCalendarMonthYear(refMonth, refYear),
    ].filter(Boolean)

    const goBackUnified = () => {
      const el = document.getElementById(`income-statement-detail-row-${ctx.parentRowId ?? ctx.rowId}`)
      const scroll = () => el?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      if (analysisPanelNarrow) {
        setLineAnalysis(null)
        window.setTimeout(scroll, 220)
      } else {
        scroll()
      }
    }

    return (
      <div className="relative overflow-hidden rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-slate-50 via-white to-slate-50/70 p-5 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] sm:p-7">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_45%_at_50%_-10%,rgba(224,116,45,0.08),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_50%_at_100%_55%,rgba(148,163,184,0.12),transparent_65%)]" />
          <div className="absolute right-6 top-6 hidden select-none text-[92px] font-semibold leading-none tracking-tight text-[#2A2F3A]/[0.04] lg:block">
            analyse<span className="text-[#E0742D]/20">.</span>
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={goBackUnified}
                className="mb-3 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#2A2F3A]"
              >
                <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Retour au poste
              </button>
              <div className="mt-5 flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Situation</p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#2A2F3A] sm:text-3xl">
                    {ctx.label}
                  </h3>
                  <p className="mt-3 max-w-3xl text-sm font-semibold text-[#E0742D] sm:text-base">
                    Lecture analytique du poste du compte de resultat
                  </p>
                  {contextBits.length > 0 ? (
                    <p className="mt-4 text-xs leading-relaxed text-slate-500">{contextBits.join(" • ")}</p>
                  ) : null}
                </div>
              </div>

              <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-slate-300/50 to-transparent" />
            </div>
            {!opts?.hideCloseButton && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full border border-slate-200/90 bg-white/85 text-slate-500 shadow-sm hover:bg-white hover:text-slate-800"
                onClick={() => setLineAnalysis(null)}
                aria-label="Fermer le panneau"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {renderLineAnalysisBody()}

          <div className="mt-10 border-t border-slate-200/80 pt-4">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-[#5C5F66]">
              Documenter l'analyse, expliquer les ecarts et joindre les pieces justificatives
              <ArrowRight className="h-4 w-4 text-[#E0742D]" />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200/90 bg-white/85 p-4 shadow-sm sm:p-5">
            <IncomeStatementNotePanel
              key={ctx.rowId}
              rowId={ctx.rowId}
              rowLabel={ctx.label}
              page="income-statement"
              period={period}
              view={view}
              companyId={companyId}
              companyName={selectedCompany?.name ?? null}
              divisionId={divisionId}
              divisionName={selectedDivision?.name ?? null}
              subDivisionId={subDivisionId}
              subDivisionName={selectedSubDivision?.name ?? null}
              currentAmount={ctx.current !== 0 ? ctx.current : null}
              priorAmount={ctx.prior !== 0 ? ctx.prior : null}
              variationPercent={vPct}
              variationAmount={vAmt !== 0 ? vAmt : null}
              referenceMonth={refMonth}
              referenceYear={refYear}
              onSaved={() => setNotesUpdated((n) => n + 1)}
              isNarrow={analysisPanelNarrow}
              embedded
            />
          </div>
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
                  Ajoutez des sous-lignes par annexe (comme sous Charges d&apos;exploitation). Elles n&apos;apparaissent
                  qu&apos;ici, pas au Sommaire. Configurez d&apos;abord annexes et liaisons au Sommaire si besoin.
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
                  onClick={async () => {
                    const ok = await structEdit.save()
                    if (ok) {
                      onIncomeStatementStructureSaved?.()
                      structEdit.discard()
                      setStructureEditMode(false)
                    }
                  }}
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
            {isForecastSection && view === "years" && title !== "États des résultats pro forma" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGrowthRate(!showGrowthRate)}
                className={cn(
                  "h-8 border border-slate-600 bg-[#2A2F3A] px-3 text-xs text-[#E6D6C3] hover:bg-[#353b47] hover:text-white",
                  showGrowthRate && "bg-[#353b47]"
                )}
              >
                <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
                {showGrowthRate
                  ? "Montants"
                  : title === "Estimation des revenus annuels"
                    ? "Croissance"
                    : "% des revenus"}
              </Button>
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
                        const opt = detailAnnexOptionsForSubLineModal.find(
                          (o) => o.letter === detailAddSelectedLetter
                        )
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
                      placeholder="Ex. 4010"
                      className="rounded-xl border-slate-200 font-mono text-sm"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="detail-add-dtct" className="text-sm font-medium text-[#2A2F3A]">
                      DT / CT
                    </Label>
                    <Select
                      value={detailAddFormDtCt || undefined}
                      onValueChange={(v) => setDetailAddFormDtCt(v as "DT" | "CT")}
                    >
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


      {/* Table + panneaux latéraux (analyse, notes) — défilement horizontal si les deux cartes ne tiennent pas */}
      <div className="flex flex-col border-t border-slate-200/80 lg:flex-row lg:items-stretch">
        <div
          className={cn(
            "min-w-0 flex-1 overflow-x-auto",
            isStructureStudio ? "bg-gradient-to-b from-white to-slate-50/50" : "bg-white"
          )}
        >
        <table className={cn("w-full", showStructureCols && "table-fixed")}>
          {showStructureCols && (
            <colgroup>
              <col />
              <col style={{ width: "7rem" }} />
              <col style={{ width: "7rem" }} />
              <col style={{ width: "7rem" }} />
              <col style={{ width: "7rem" }} />
              <col style={{ width: "2.75rem" }} />
            </colgroup>
          )}
          <thead>
            <tr
              className={cn(
                "border-b-2",
                showStructureCols
                  ? "border-slate-200 bg-gradient-to-r from-slate-50 via-slate-100/40 to-slate-50"
                  : "border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100/80"
              )}
            >
              <th
                className={cn(
                  "px-6 py-4 text-left text-sm font-semibold text-[#2A2F3A]",
                  !showStructureCols &&
                    (view === "12months"
                      ? "min-w-[20rem] sm:min-w-[24rem] lg:min-w-[30rem]"
                      : "w-2/5"),
                  showStructureCols && "min-w-0 pl-4 pr-3"
                )}
              >
                {showStructureCols ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-white/80 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 ring-1 ring-slate-200/80">
                      Annexes
                    </span>
                    <span className="font-semibold text-slate-800">Postes liés aux annexes</span>
                  </span>
                ) : (
                  "Compte"
                )}
              </th>
              {showStructureCols && (
                <>
                  <th className="box-border w-[7rem] px-2 py-4 text-center text-[11px] font-semibold text-slate-800">
                    Masquer
                  </th>
                  <th className="box-border w-[7rem] px-2 py-4 text-center text-[11px] font-semibold text-slate-800">
                    Liaison
                  </th>
                  <th className="box-border w-[7rem] px-2 py-4 text-center text-[11px] font-semibold text-slate-800">
                    DT/CT
                  </th>
                  <th className="box-border w-[7rem] px-2 py-4 text-center text-[11px] font-semibold text-slate-800">
                    Lettre
                  </th>
                  <th className="w-11 px-0 py-4" aria-hidden />
                </>
              )}
              {!showStructureCols && view === "current" && (
                <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Montant</th>
              )}
              {!showStructureCols && view === "comparison" && !isComparisonMode && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{getCurrentColumnLabel()}</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{getComparisonLabel()}</th>
                  {columnMode === "variationPercent" ? (
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation %</th>
                  ) : columnMode === "variationAmount" ? (
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation $</th>
                  ) : columnMode === "percentage" ? (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des revenus</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des revenus</th>
                    </>
                  ) : null}
                </>
              )}
              {!showStructureCols && view === "comparison" && isComparisonMode && (
                <>
                  {entitiesToCompare.map((entity) => (
                    <th key={entity.id} className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">
                      {entity.name}
                    </th>
                  ))}
                </>
              )}
              {!showStructureCols && view === "ddm" && !isComparisonMode && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{getCurrentColumnLabel()}</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{getComparisonLabel()}</th>
                  {columnMode === "variationPercent" ? (
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation %</th>
                  ) : columnMode === "variationAmount" ? (
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation $</th>
                  ) : columnMode === "percentage" ? (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des revenus</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des revenus</th>
                    </>
                  ) : null}
                </>
              )}
              {!showStructureCols && view === "ddm" && isComparisonMode && (
                <>
                  {entitiesToCompare.map((entity) => (
                    <th key={entity.id} className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">
                      {entity.name}
                    </th>
                  ))}
                </>
              )}
              {!showStructureCols && view === "ytd" && !isComparisonMode && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">YTD {fiscalYear}</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">YTD {(fiscalYear ?? new Date().getFullYear()) - 1}</th>
                  {columnMode === "variationPercent" ? (
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation %</th>
                  ) : columnMode === "variationAmount" ? (
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation $</th>
                  ) : columnMode === "percentage" ? (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des revenus</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">% des revenus</th>
                    </>
                  ) : null}
                </>
              )}
              {!showStructureCols && view === "ytd" && isComparisonMode && (
                <>
                  {entitiesToCompare.map((entity) => (
                    <th key={entity.id} className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">
                      {entity.name}
                    </th>
                  ))}
                </>
              )}
              {!showStructureCols && view === "12months" && (
                <>
                  {getMonthLabels().map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {!showStructureCols && view === "quarters" && (
                <>
                  {getQuarterLabels().map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {!showStructureCols && view === "years" && (
                <>
                  {/* Type column for Dépenses section */}
                  {title === "Estimation des dépenses annuelles" && (
                    <th className="px-4 py-4 text-center font-semibold text-slate-900 text-sm whitespace-nowrap">
                      Type
                    </th>
                  )}
                  {/* New column between Type and years for Dépenses section */}
                  {title === "Estimation des dépenses annuelles" && (
                    <th className="px-4 py-4 text-center font-semibold text-slate-900 text-sm whitespace-nowrap">
                      Taux
                    </th>
                  )}
                  {getYearLabels().map((label, idx) => (
                    <th 
                      key={idx} 
                      className={cn(
                        "px-4 py-4 text-right font-semibold text-sm whitespace-nowrap",
                        isForecastSection && idx === 0 
                          ? "bg-slate-50 text-slate-900" 
                          : "text-slate-900"
                      )}
                    >
                      {label}
                    </th>
                  ))}
                </>
              )}
            </tr>
            {/* Inflation rate row for Dépenses section */}
            {!showStructureCols && title === "Estimation des dépenses annuelles" && view === "years" && (
              <tr className="bg-slate-50 border-b border-slate-200">
                {/* Label cell */}
                <th className="px-6 py-2 text-left">
                  <span className="text-xs font-medium text-slate-700">Taux d'inflation pour les dépenses fixes:</span>
                </th>
                {/* Empty cell for "Type" column */}
                <th className="px-4 py-2"></th>
                {/* Inflation rate input in "Taux" column */}
                <th className="px-4 py-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={inflationRate}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0
                        updateInflationRate(value)
                      }}
                      className="w-20 h-7 text-xs text-right font-semibold px-2 py-1"
                      placeholder="2.0"
                    />
                    <span className="text-xs text-slate-600">%</span>
                  </div>
                </th>
                {/* Empty cells for year columns */}
                {getYearLabels().map((_, idx) => (
                  <th key={idx} className="px-4 py-2"></th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {Array.from({ length: detailTableRowCount }, (_, idx) => {
              const layoutEntry = showStructureCols ? detailAnnexStructureTableLayout[idx] : undefined
              const globalIdx =
                showStructureCols && layoutEntry?.kind === "structure" ? layoutEntry.globalIdx : -1
              const structRow =
                showStructureCols && layoutEntry?.kind === "structure"
                  ? structEdit.structure[globalIdx]!
                  : null
              const summaryAnnexLockedInDetail =
                structRow != null && isSummaryAnnexRowLockedInDetailEdit(structRow)
              const row = showStructureCols
                ? layoutEntry?.kind === "placeholder"
                  ? buildAnnexPlaceholderDetailRow(layoutEntry.letter, trendLenForPad)
                  : layoutEntry?.kind === "annexSubtotal"
                    ? buildAnnexSubtotalDetailRow(
                        layoutEntry.letter,
                        sumAnnexGroupRowsForLetter(data, layoutEntry.letter)
                      )
                    : layoutEntry?.kind === "structure"
                      ? detailFinancialRowForStructure(structEdit.structure[layoutEntry.globalIdx]!)
                      : data[idx]!
                : data[idx]!
              const variation = row.current && row.prior ? calculateVariation(row.current, row.prior) : null
              const variationAmount = row.current && row.prior ? row.current - row.prior : 0
              const isSpacer = row.label === "" && !row.isAnnexPlaceholder
              const shouldHideAmounts =
                isSpacer || !!row.isSection || !!row.isAnnexPlaceholder || !!row.isAnnexTitle
              /** Hors Paramètres : libellé sous-total masqué (blanc) mais chiffres en noir. */
              const annexSubtotalDarkNumbers = row.isAnnexSubtotal && !showStructureCols
              const displayLabel = row.label

              const isBoldForStyle =
                showStructureCols && structRow && !row.isAnnexPlaceholder && !row.isAnnexSubtotal
                  ? structureStudioLabelBold(structRow, row)
                  : !!row.isBold

              const nextLayoutEntry =
                showStructureCols && idx + 1 < detailAnnexStructureTableLayout.length
                  ? detailAnnexStructureTableLayout[idx + 1]
                  : undefined
              // Check if next row is a subtotal to add dark border above it
              const nextRowIsSubtotal =
                idx < detailTableRowCount - 1 &&
                (showStructureCols
                  ? nextLayoutEntry?.kind === "annexSubtotal"
                    ? true
                    : nextLayoutEntry?.kind === "structure"
                      ? detailFinancialRowForStructure(structEdit.structure[nextLayoutEntry.globalIdx]!)
                          .isSubtotal
                      : false
                  : data[idx + 1]!.isSubtotal)
              
              // Check if this row can be expanded and if it's expanded
              // If projectionMode is "account", disable expansion for forecast sections (revenus, dépenses, capex, états des résultats pro forma)
              const isForecastSectionForExpansion = title === "Estimation des revenus annuels" || title === "Estimation des dépenses annuelles" || title === "Estimation des Capex annuels" || title === "États des résultats pro forma"
              // Pas d’icône / expansion sur titres de section, titres d’annexe, en-têtes annexe, etc.
              const isGlBreakdownExcludedRow =
                isSpacer ||
                !!row.isAnnexPlaceholder ||
                !!row.isAnnexSubtotal ||
                !!row.isAnnexTitle ||
                !!row.isSection ||
                !!row.isAnnexHeader
              // Force canExpand to false if in "account" mode for forecast sections - this is the primary check
              const canExpand =
                showStructureCols
                  ? false
                  : (projectionMode === "account" && isForecastSectionForExpansion)
                    ? false
                    : !!row.rowId &&
                      !!row.balanceAccounts &&
                      Array.isArray(row.balanceAccounts) &&
                      row.balanceAccounts.length > 0 &&
                      !isGlBreakdownExcludedRow
              const isExpanded = row.rowId ? expandedRows.has(row.rowId) : false
              
              // Check if this row has a note
              const hasNote = row.rowId
                ? getNoteByRowId(row.rowId, "income-statement", period, view, companyId, divisionId, subDivisionId) !== null
                : false

              const detailRowListKey = row.rowId
                ? `${row.rowId}-${idx}`
                : row.statementLabel && (row.isAnnexPlaceholder || row.isAnnexSubtotal)
                  ? `${row.statementLabel}-${idx}`
                  : `detail-row-${idx}`

              /** Survol en mode Paramètres (pas de zébrage : fond uniforme). */
              const detailParamRowHover =
                row.label !== "" ||
                row.isAnnexPlaceholder ||
                (layoutEntry?.kind === "structure" &&
                  structRow != null &&
                  String(structRow.label ?? "").trim() === "")

              return (
                <Fragment key={detailRowListKey}>
                  <tr
                    id={row.rowId ? `income-statement-detail-row-${row.rowId}` : undefined}
                    className={cn(
                      "border-b transition-colors duration-150",
                      showStructureCols
                        ? cn(
                            nextRowIsSubtotal
                              ? "border-b-2 border-b-slate-900"
                              : "border-b border-b-slate-200/80",
                            detailParamRowHover && "hover:bg-slate-100/70",
                            row.isAnnexHeader && "bg-amber-50/90",
                            annexSubtotalDarkNumbers && "bg-white"
                          )
                        : cn(
                            row.label === "" && !row.isAnnexPlaceholder ? "h-2 border-slate-200" : "",
                            row.isAnnexPlaceholder && "bg-white",
                            annexSubtotalDarkNumbers && "bg-white",
                            nextRowIsSubtotal ? "border-slate-900 border-b-2" : "border-slate-200",
                            row.isAnnexHeader && "bg-amber-50/90",
                            !isSpacer &&
                              (row.isAnnexHeader
                                ? "hover:bg-amber-100/85"
                                : "hover:bg-slate-50/90")
                          )
                    )}
                  >
                    <td
                      className={cn(
                        "px-6 py-3",
                        showStructureCols
                          ? "py-3.5 pl-4 pr-3"
                          : view === "12months"
                            ? "min-w-[20rem] sm:min-w-[24rem] lg:min-w-[30rem]"
                            : "",
                        row.isAnnexPlaceholder && !showStructureCols && "py-2",
                        annexSubtotalDarkNumbers
                          ? "font-bold"
                          : isBoldForStyle
                            ? "font-bold text-slate-900"
                            : "text-slate-700",
                        row.indent ? "pl-12" : ""
                      )}
                    >
                      <div className="flex min-w-0 w-full items-center gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                        {row.isAnnexPlaceholder ? (
                          showStructureCols ? (
                            <span className={EMPTY_STRUCTURE_LINE_BADGE_CLASS}>{row.label}</span>
                          ) : null
                        ) : row.isAnnexSubtotal ? (
                          showStructureCols ? (
                            <span
                              className="flex-1 block min-h-[1.125rem]"
                              aria-hidden
                            />
                          ) : (
                            <span
                              className={cn(
                                "flex-1 font-semibold",
                                annexSubtotalDarkNumbers ? "text-white" : "text-slate-900"
                              )}
                            >
                              {row.label}
                            </span>
                          )
                        ) : showStructureCols && structRow ? (
                          String(structRow.label ?? "").trim() === "" ? (
                            <span className={EMPTY_STRUCTURE_LINE_BADGE_CLASS}>{EMPTY_STRUCTURE_LINE_LABEL}</span>
                          ) : summaryAnnexLockedInDetail ? (
                            <span
                              className="flex-1 rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 py-2 text-sm text-slate-800"
                              title="Libellé modifiable dans la vue Sommaire (Paramètres)"
                            >
                              {String(structRow.label ?? "")}
                            </span>
                          ) : (
                            <Input
                              value={String(structRow.label ?? "")}
                              onChange={(e) => structEdit.updateRow(globalIdx, { label: e.target.value })}
                              className="h-9 w-full max-w-full rounded-xl border-slate-200/90 bg-white text-sm shadow-sm focus-visible:border-[#E0742D]/50 focus-visible:ring-2 focus-visible:ring-[#E0742D]/20"
                            />
                          )
                        ) : (
                          <span
                            className={cn(
                              "flex-1",
                              canExpand &&
                                row.rowId &&
                                "cursor-pointer rounded-sm outline-offset-2 hover:bg-slate-100/90"
                            )}
                            onClick={canExpand && row.rowId ? () => toggleRow(row.rowId!) : undefined}
                            onKeyDown={
                              canExpand && row.rowId
                                ? (e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault()
                                      toggleRow(row.rowId!)
                                    }
                                  }
                                : undefined
                            }
                            role={canExpand && row.rowId ? "button" : undefined}
                            tabIndex={canExpand && row.rowId ? 0 : undefined}
                            aria-expanded={canExpand && row.rowId ? isExpanded : undefined}
                          >
                            {displayLabel}
                          </span>
                        )}
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                        {/* Même largeur que le bouton pour aligner les libellés sur toutes les lignes */}
                        <div className="flex h-8 w-9 shrink-0 items-center justify-center">
                          {canExpand || (row.rowId && isNoteAllowed() && !showStructureCols) ? (
                            <button
                              type="button"
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
                              className={cn(
                                "relative rounded-md p-1.5 text-[#E0742D] transition-colors ring-1 ring-[#E0742D]/25 hover:bg-orange-50 hover:ring-[#E0742D]/50",
                                (lineAnalysis?.rowId === row.rowId || lineAnalysis?.parentRowId === row.rowId) &&
                                  "bg-[#E0742D]/10 ring-[#E0742D]/45"
                              )}
                              aria-pressed={
                                lineAnalysis?.rowId === row.rowId || lineAnalysis?.parentRowId === row.rowId
                              }
                              title={
                                lineAnalysis?.rowId === row.rowId || lineAnalysis?.parentRowId === row.rowId
                                  ? "Fermer le panneau (analyse & note)"
                                  : hasNote
                                    ? "Analyse, ventilation et note enregistrée (panneau à droite)"
                                    : "Ouvrir l’analyse et les notes (panneau à droite)"
                              }
                            >
                              <Table2 className="h-4 w-4 shrink-0" aria-hidden />
                              {hasNote && (
                                <span
                                  className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-sky-500 ring-2 ring-white"
                                  aria-hidden
                                />
                              )}
                            </button>
                          ) : null}
                        </div>
                        </div>
                      </div>
                    </td>

                  {showStructureCols && row.isAnnexPlaceholder && (
                    <>
                      <td className="box-border w-[7rem] px-2 py-2.5 align-middle text-center">
                        <span className="text-sm text-slate-300">—</span>
                      </td>
                      <td className="box-border w-[7rem] min-w-0 px-2 py-2.5 align-middle">
                        <span className="text-sm text-slate-300">—</span>
                      </td>
                      <td className="box-border w-[7rem] min-w-0 px-2 py-2.5 align-middle">
                        <span className="text-sm text-slate-300">—</span>
                      </td>
                      <td className="box-border w-[7rem] min-w-0 px-2 py-2.5 align-middle">
                        <span className="text-sm text-slate-300">—</span>
                      </td>
                      <td className="box-border w-11 px-0 py-2.5 align-middle" />
                    </>
                  )}
                  {showStructureCols && row.isAnnexSubtotal && (
                    <>
                      <td className="box-border w-[7rem] px-2 py-2.5 align-middle text-center">
                        <span className="text-sm text-slate-300">—</span>
                      </td>
                      <td className="box-border w-[7rem] min-w-0 px-2 py-2.5 align-middle">
                        <span className="text-sm text-slate-300">—</span>
                      </td>
                      <td className="box-border w-[7rem] min-w-0 px-2 py-2.5 align-middle">
                        <span className="text-sm text-slate-300">—</span>
                      </td>
                      <td className="box-border w-[7rem] min-w-0 px-2 py-2.5 align-middle">
                        <span className="text-sm text-slate-300">—</span>
                      </td>
                      <td className="box-border w-11 px-0 py-2.5 align-middle" />
                    </>
                  )}
                  {showStructureCols && structRow && !row.isAnnexPlaceholder && !row.isAnnexSubtotal && (
                    <IncomeStatementStructureStudioCols
                      rowIndex={globalIdx}
                      structRow={structRow}
                      allLinkCodes={allLiaisonCodes}
                      updateRow={structEdit.updateRow}
                      showRemoveButton={
                        structEdit.canRemoveRowAt(globalIdx) && !summaryAnnexLockedInDetail
                      }
                      onRemoveRow={structEdit.removeStructureRowAt}
                      mappingColumnsReadOnly={!isStructureRowDetailOnly(structRow)}
                      annexReadOnly={isStructureRowDetailOnly(structRow)}
                      hideDefineColumn
                    />
                  )}

                  {!showStructureCols && view === "current" && (
                    <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}>
                      {row.current !== 0 ? formatCurrency(row.current) : "-"}
                    </td>
                  )}

                  {!showStructureCols && view === "comparison" && !isComparisonMode && (
                    <>
                      <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}>
                        {row.current !== 0 ? formatCurrency(row.current) : "-"}
                      </td>
                      <td
                        className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}
                      >
                        {row.prior !== 0 ? formatCurrency(row.prior) : "-"}
                      </td>
                      {columnMode === "variationPercent" ? (
                        <td
                          className={`px-6 py-3 text-right ${row.isBold ? "font-semibold " : ""}${
                            variation && variation >= 0 ? "text-emerald-600" : "text-red-600"
                          } ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}
                        >
                          {variation !== null && row.current !== 0
                            ? `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%`
                            : "-"}
                        </td>
                      ) : columnMode === "variationAmount" ? (
                        <td
                          className={`px-6 py-3 text-right font-semibold ${
                            variationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                          } ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}
                        >
                          {row.current !== 0
                            ? `${variationAmount >= 0 ? "+" : ""}${formatCurrency(variationAmount)}`
                            : "-"}
                        </td>
                      ) : columnMode === "percentage" ? (
                        <>
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}>
                            {row.current !== 0 ? `${getRevenuePercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}>
                            {row.prior !== 0 ? `${getRevenuePercentage(row.prior, true).toFixed(1)}%` : "-"}
                          </td>
                        </>
                      ) : null}
                    </>
                  )}
                  {!showStructureCols && view === "comparison" && isComparisonMode && (
                    <>
                      {entitiesToCompare.map((entity) => {
                        const entityRows = entityDataMap[entity.id] || []
                        const entityRow =
                          entityRows.find(
                            (r) =>
                              (row.statementLabel && r.statementLabel === row.statementLabel) ||
                              r.label === row.label
                          ) || row
                        return (
                          <td
                            key={entity.id}
                            className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}
                          >
                            {entityRow.current !== 0 ? formatCurrency(entityRow.current) : "-"}
                          </td>
                        )
                      })}
                    </>
                  )}
                  {!showStructureCols && view === "ddm" && !isComparisonMode && (
                    <>
                      <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}>
                        {row.current !== 0 ? formatCurrency(row.current) : "-"}
                      </td>
                      <td
                        className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}
                      >
                        {row.prior !== 0 ? formatCurrency(row.prior) : "-"}
                      </td>
                      {columnMode === "variationPercent" ? (
                        <td
                          className={`px-6 py-3 text-right ${row.isBold ? "font-semibold " : ""}${
                            variation && variation >= 0 ? "text-emerald-600" : "text-red-600"
                          } ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}
                        >
                          {variation !== null && row.current !== 0
                            ? `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%`
                            : "-"}
                        </td>
                      ) : columnMode === "variationAmount" ? (
                        <td
                          className={`px-6 py-3 text-right font-semibold ${
                            variationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                          } ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}
                        >
                          {row.current !== 0
                            ? `${variationAmount >= 0 ? "+" : ""}${formatCurrency(variationAmount)}`
                            : "-"}
                        </td>
                      ) : columnMode === "percentage" ? (
                        <>
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}>
                            {row.current !== 0 ? `${getRevenuePercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}>
                            {row.prior !== 0 ? `${getRevenuePercentage(row.prior, true).toFixed(1)}%` : "-"}
                          </td>
                        </>
                      ) : null}
                    </>
                  )}
                  {!showStructureCols && view === "ddm" && isComparisonMode && (
                    <>
                      {entitiesToCompare.map((entity) => {
                        const entityRows = entityDataMap[entity.id] || []
                        const entityRow =
                          entityRows.find(
                            (r) =>
                              (row.statementLabel && r.statementLabel === row.statementLabel) ||
                              r.label === row.label
                          ) || row
                        return (
                          <td
                            key={entity.id}
                            className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}
                          >
                            {entityRow.current !== 0 ? formatCurrency(entityRow.current) : "-"}
                          </td>
                        )
                      })}
                    </>
                  )}

                  {!showStructureCols && view === "ytd" && !isComparisonMode && (
                    <>
                      <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}>
                        {row.current !== 0 ? formatCurrency(row.current) : "-"}
                      </td>
                      <td
                        className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}
                      >
                        {row.prior !== 0 ? formatCurrency(row.prior) : "-"}
                      </td>
                      {columnMode === "variations" ? (
                        <>
                          <td
                            className={`px-6 py-3 text-right ${row.isBold ? "font-semibold " : ""}${
                              variation && variation >= 0 ? "text-emerald-600" : "text-red-600"
                            } ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}
                          >
                            {variation !== null && row.current !== 0
                              ? `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%`
                              : "-"}
                          </td>
                          <td
                            className={`px-6 py-3 text-right font-semibold ${
                              variationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                            } ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}
                          >
                            {row.current !== 0
                              ? `${variationAmount >= 0 ? "+" : ""}${formatCurrency(variationAmount)}`
                              : "-"}
                          </td>
                        </>
                      ) : columnMode === "percentage" ? (
                        <>
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}>
                            {row.current !== 0 ? `${getRevenuePercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold text-slate-600" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}>
                            {row.prior !== 0 ? `${getRevenuePercentage(row.prior, true).toFixed(1)}%` : "-"}
                          </td>
                        </>
                      ) : null}
                    </>
                  )}
                  {!showStructureCols && view === "ytd" && isComparisonMode && (
                    <>
                      {entitiesToCompare.map((entity) => {
                        const entityRows = entityDataMap[entity.id] || []
                        const entityRow =
                          entityRows.find(
                            (r) =>
                              (row.statementLabel && r.statementLabel === row.statementLabel) ||
                              r.label === row.label
                          ) || row
                        return (
                          <td
                            key={entity.id}
                            className={`px-6 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}
                          >
                            {entityRow.current !== 0 ? formatCurrency(entityRow.current) : "-"}
                          </td>
                        )
                      })}
                    </>
                  )}

                  {/* Trend Views - 12 months, quarters, years */}
                  {!showStructureCols && view === "12months" && row.trendValues && (
                    <>
                      {row.trendValues.map((value, valueIdx) => (
                        <td
                          key={valueIdx}
                          className={`px-4 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}
                        >
                          {columnMode === "percentage"
                            ? (value !== 0 ? `${getTrendRevenuePercentage(value, valueIdx).toFixed(1)}%` : "-")
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
                  {!showStructureCols && view === "quarters" && row.trendValues && (
                    <>
                      {row.trendValues.map((value, valueIdx) => (
                        <td
                          key={valueIdx}
                          className={`px-4 py-3 text-right ${row.isBold ? "font-semibold font-bold" : "text-slate-500"} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}
                        >
                          {columnMode === "percentage"
                            ? (value !== 0 ? `${getTrendRevenuePercentage(value, valueIdx).toFixed(1)}%` : "-")
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
                  {!showStructureCols && view === "years" && row.trendValues && (
                    <>
                      {/* Type cell for Dépenses section */}
                      {title === "Estimation des dépenses annuelles" && (
                        <td className="px-4 py-3 text-center">
                          {shouldHideAmounts ? (
                            "-"
                          ) : row.rowId ? (
                            <div className="flex items-center justify-center gap-2">
                              <span className={cn(
                                "text-xs font-medium px-2 py-1 rounded",
                                getExpenseType(row.rowId) === "variable" 
                                  ? "text-blue-600 bg-blue-50" 
                                  : "text-purple-600 bg-purple-50"
                              )}>
                                {getExpenseType(row.rowId) === "variable" ? "Variable" : "Fixe"}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (row.rowId) {
                                    openTypeRateModal(row.rowId)
                                  }
                                }}
                                className="p-1 rounded hover:bg-slate-200 transition-colors"
                                title="Modifier le Type et le Taux"
                              >
                                <Settings className="w-3.5 h-3.5 text-slate-600" />
                              </button>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                      )}
                      {/* Taux column cell for Dépenses section */}
                      {title === "Estimation des dépenses annuelles" && view === "years" && (
                        <td className="px-4 py-3 text-center text-slate-700">
                          {row.rowId && !shouldHideAmounts ? (
                            <div className="flex items-center justify-center">
                              {getExpenseType(row.rowId) === "variable" ? (
                                <span className="text-blue-600 font-medium">
                                  {getVariableRate(row.rowId) !== 0 ? `${getVariableRate(row.rowId).toFixed(1)}%` : "-"}
                                </span>
                              ) : (
                                <span className="text-purple-600 font-medium">
                                  {getInflationRate(row.rowId).toFixed(1)}%
                                </span>
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                      )}
                      {row.trendValues.map((value, valueIdx) => {
                        // Get the actual value (edited or default) for forecast sections
                        const actualValue = isForecastSection && row.rowId 
                          ? getRevenueValue(row.rowId, valueIdx, value)
                          : value
                        
                        // Check if this cell is editable (forecast section, not first year, has rowId)
                        // For "Estimation des dépenses annuelles", "Estimation des revenus annuels", and "États des résultats pro forma", cells are not directly editable (only via adjustments)
                        const isEditable = isForecastSection && valueIdx > 0 && row.rowId && !shouldHideAmounts && title !== "Estimation des dépenses annuelles" && title !== "Estimation des revenus annuels" && title !== "États des résultats pro forma"
                        const cellKey = row.rowId ? `${row.rowId}-${valueIdx}` : null
                        const isEditing = isEditable && editingCell === cellKey
                        
                        // Get previous value for growth calculation
                        const previousValue = valueIdx > 0 && row.trendValues 
                          ? (isForecastSection && row.rowId 
                              ? getRevenueValue(row.rowId, valueIdx - 1, row.trendValues[valueIdx - 1])
                              : row.trendValues[valueIdx - 1])
                          : null
                        
                        // Calculate growth rate if showGrowthRate is true and not first year
                        let displayValue: string | number = actualValue
                        let growthRate: number | null = null
                        if (showGrowthRate && isForecastSection && valueIdx > 0 && previousValue !== null) {
                          if (previousValue !== 0) {
                            growthRate = calculateVariation(actualValue, previousValue)
                            displayValue = growthRate !== null ? `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(1)}%` : "-"
                          } else {
                            displayValue = "-"
                          }
                        } else if (showGrowthRate && isForecastSection && valueIdx === 0) {
                          displayValue = "-" // No growth rate for first year
                        }
                        
                        return (
                          <td
                            key={valueIdx}
                            className={cn(
                              "px-4 py-3 text-right",
                              row.isBold ? "font-semibold font-bold" : "text-slate-500",
                              shouldHideAmounts ? "text-white" : "",
                              isForecastSection && valueIdx === 0 && !shouldHideAmounts ? "bg-slate-50" : "",
                              isEditable && !isEditing && "hover:bg-slate-50 cursor-pointer",
                              showGrowthRate && isForecastSection && valueIdx > 0 && !shouldHideAmounts && typeof displayValue === "string" && displayValue.includes("%") && title === "Estimation des revenus annuels" ? "text-slate-900" : "",
                              showGrowthRate && isForecastSection && valueIdx > 0 && !shouldHideAmounts && typeof displayValue === "string" && displayValue.includes("%") && growthRate !== null && growthRate >= 0 && title !== "Estimation des revenus annuels" ? "text-emerald-600 font-semibold" : "",
                              showGrowthRate && isForecastSection && valueIdx > 0 && !shouldHideAmounts && typeof displayValue === "string" && displayValue.includes("%") && growthRate !== null && growthRate < 0 && title !== "Estimation des revenus annuels" ? "text-red-600 font-semibold" : "",
                              annexSubtotalDarkNumbers && "text-slate-900"
                            )}
                            onClick={() => {
                              // Only allow editing if not in "Estimation des dépenses annuelles" or "États des résultats pro forma"
                              if (isEditable && !isEditing && title !== "Estimation des dépenses annuelles" && title !== "États des résultats pro forma") {
                                setEditingCell(cellKey!)
                              }
                            }}
                          >
                            {shouldHideAmounts ? (
                              "-"
                            ) : isEditable && isEditing ? (
                              <Input
                                type="text"
                                value={showGrowthRate && previousValue !== null && previousValue !== 0
                                  ? (growthRate !== null ? `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(1)}` : "")
                                  : actualValue.toString()}
                                onChange={(e) => {
                                  const inputValue = e.target.value
                                  if (showGrowthRate && previousValue !== null && previousValue !== 0) {
                                    // Editing growth rate percentage
                                    const cleanValue = inputValue.replace(/[^\d.-]/g, "")
                                    const growthPercent = parseFloat(cleanValue) || 0
                                    // Calculate new amount: previousValue * (1 + growthPercent/100)
                                    const newAmount = Math.round(previousValue * (1 + growthPercent / 100))
                                    if (row.rowId) {
                                      updateRevenueValue(row.rowId, valueIdx, newAmount)
                                    }
                                  } else {
                                    // Editing amount
                                    const cleanValue = inputValue.replace(/[^\d-]/g, "")
                                    const newAmount = cleanValue === "" || cleanValue === "-" ? 0 : parseInt(cleanValue, 10)
                                    if (row.rowId) {
                                      updateRevenueValue(row.rowId, valueIdx, newAmount)
                                    }
                                  }
                                }}
                                onBlur={() => setEditingCell(null)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === "Escape") {
                                    setEditingCell(null)
                                  }
                                }}
                                className="w-24 text-right font-semibold text-sm"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <div>
                                  {showGrowthRate && isForecastSection
                                    ? displayValue
                                    : !isForecastSection && columnMode === "percentage"
                                      ? (actualValue !== 0 ? `${getTrendRevenuePercentage(actualValue, valueIdx).toFixed(1)}%` : "-")
                                      : !isForecastSection && columnMode === "variations"
                                        ? (() => {
                                            const trendVariation = getTrendVariation(row.trendValues ?? [], valueIdx)
                                            const trendVariationAmount = getTrendVariationAmount(row.trendValues ?? [], valueIdx)
                                            return (
                                              <div className="space-y-0.5">
                                                <div>{trendVariation !== null ? `${trendVariation >= 0 ? "+" : ""}${trendVariation.toFixed(1)}%` : "-"}</div>
                                                <div className="text-[11px] font-medium">
                                                  {trendVariationAmount !== null ? `${trendVariationAmount >= 0 ? "+" : ""}${formatCurrency(trendVariationAmount)}` : "-"}
                                                </div>
                                              </div>
                                            )
                                          })()
                                        : (actualValue !== 0 ? formatCurrency(actualValue) : "-")}
                                </div>
                                {((title === "Estimation des dépenses annuelles" || title === "Estimation des revenus annuels") && valueIdx > 0 && row.rowId && !shouldHideAmounts) && (
                                  // Only show adjustment button for account-level rows if projectionMode is "account"
                                  // Only show adjustment button for GL-level rows if projectionMode is "gl"
                                  // For now, we only show adjustments for account-level rows (balance accounts will be handled separately)
                                  projectionMode === "account" && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (row.rowId) {
                                          openAdjustmentModal(row.rowId, valueIdx)
                                        }
                                      }}
                                      className={cn(
                                        "p-1 rounded hover:bg-slate-200 transition-colors relative",
                                        title === "Estimation des dépenses annuelles" 
                                          ? (getAdjustments(row.rowId || "", valueIdx).length > 0 && "text-blue-600")
                                          : (getRevenueAdjustments(row.rowId || "", valueIdx).length > 0 && "text-blue-600")
                                      )}
                                      title={title === "Estimation des dépenses annuelles"
                                        ? `Ajustements (${getAdjustments(row.rowId || "", valueIdx).length})`
                                        : `Ajustements (${getRevenueAdjustments(row.rowId || "", valueIdx).length})`}
                                    >
                                      <Settings className="w-3.5 h-3.5" />
                                      {title === "Estimation des dépenses annuelles" 
                                        ? (getAdjustments(row.rowId || "", valueIdx).length > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                              {getAdjustments(row.rowId || "", valueIdx).length}
                                            </span>
                                          ))
                                        : (getRevenueAdjustments(row.rowId || "", valueIdx).length > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                              {getRevenueAdjustments(row.rowId || "", valueIdx).length}
                                            </span>
                                          ))}
                                    </button>
                                  )
                                )}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </>
                  )}
                  {/* Empty cells for spacer rows in trend views */}
                  {(view === "12months" || view === "quarters" || view === "years") && !row.trendValues && (
                    <>
                      {/* Empty type cell for Dépenses section */}
                      {title === "Estimation des dépenses annuelles" && view === "years" && (
                        <td className="px-4 py-3 text-center text-white">-</td>
                      )}
                      {/* Empty new column cell for Dépenses section */}
                      {title === "Estimation des dépenses annuelles" && view === "years" && (
                        <td className="px-4 py-3 text-center text-white">-</td>
                      )}
                      {Array.from({ length: view === "12months" ? 12 : view === "quarters" ? 5 : (isForecastSection && view === "years" ? projectionYears + 1 : 6) }).map((_, idx) => (
                        <td 
                          key={idx} 
                          className={cn(
                            "px-4 py-3 text-right font-semibold text-white",
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
                          <tr
                            key={`${idx}-account-${accIdx}`}
                            className="border-b border-slate-200 bg-slate-50 transition-colors duration-150 hover:bg-slate-100/80"
                          >
                            <td className="px-6 py-2 text-slate-600 pl-20">
                              {accountLabelAlreadyIncludesNumber(account.accountNumber, account.accountName) ? (
                                <span className="text-sm">{account.accountName.trim() || account.accountNumber}</span>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-semibold text-slate-500">{account.accountNumber}</span>
                                  <span className="text-sm">{account.accountName}</span>
                                </div>
                              )}
                            </td>
                            
                            {view === "comparison" && !isComparisonMode && (
                              <>
                                <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                  {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                                </td>
                                <td className="px-6 py-2 text-right text-sm text-slate-500">
                                  {account.priorAmount !== undefined && account.priorAmount !== 0 ? formatCurrency(account.priorAmount) : "-"}
                                </td>
                      {columnMode === "variationPercent" ? (
                        <td
                          className={`px-6 py-2 text-right font-semibold text-sm font-semibold ${
                            accountVariation && accountVariation >= 0 ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {accountVariation !== null && account.amount !== 0
                            ? `${accountVariation >= 0 ? "+" : ""}${accountVariation.toFixed(1)}%`
                            : "-"}
                        </td>
                      ) : columnMode === "variationAmount" ? (
                        <td
                          className={`px-6 py-2 text-right font-semibold text-sm font-semibold ${
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
                            {account.amount !== 0 ? `${getRevenuePercentage(account.amount, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className="px-6 py-2 text-right font-semibold text-sm text-slate-600">
                            {account.priorAmount !== undefined && account.priorAmount !== 0 ? `${getRevenuePercentage(account.priorAmount, true).toFixed(1)}%` : "-"}
                          </td>
                        </>
                      ) : null}
                              </>
                            )}
                            
                            {view === "current" && (
                              <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                              </td>
                            )}
                            
                            {view === "ytd" && !isComparisonMode && (
                              <>
                                <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                  {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                                </td>
                                <td className="px-6 py-2 text-right text-sm text-slate-500">
                                  {account.priorAmount !== undefined && account.priorAmount !== 0 ? formatCurrency(account.priorAmount) : "-"}
                                </td>
                                {columnMode === "variationPercent" ? (
                                  <td className={`px-6 py-2 text-right font-semibold text-sm font-semibold ${
                                    accountVariation && accountVariation >= 0 ? "text-emerald-600" : "text-red-600"
                                  }`}>
                                    {accountVariation !== null && account.amount !== 0
                                      ? `${accountVariation >= 0 ? "+" : ""}${accountVariation.toFixed(1)}%`
                                      : "-"}
                                  </td>
                                ) : columnMode === "variationAmount" ? (
                                  <td className={`px-6 py-2 text-right font-semibold text-sm font-semibold ${
                                    accountVariationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                                  }`}>
                                    {account.amount !== 0
                                      ? `${accountVariationAmount >= 0 ? "+" : ""}${formatCurrency(accountVariationAmount)}`
                                      : "-"}
                                  </td>
                                ) : columnMode === "percentage" ? (
                                  <>
                                    <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                      {account.amount !== 0 ? `${getRevenuePercentage(account.amount, false).toFixed(1)}%` : "-"}
                                    </td>
                                    <td className="px-6 py-2 text-right font-semibold text-sm text-slate-600">
                                      {account.priorAmount !== undefined && account.priorAmount !== 0 ? `${getRevenuePercentage(account.priorAmount, true).toFixed(1)}%` : "-"}
                                    </td>
                                  </>
                                ) : null}
                              </>
                            )}
                            
                            {view === "ddm" && !isComparisonMode && (
                              <>
                                <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                  {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                                </td>
                                <td className="px-6 py-2 text-right text-sm text-slate-500">
                                  {account.priorAmount !== undefined && account.priorAmount !== 0 ? formatCurrency(account.priorAmount) : "-"}
                                </td>
                                {columnMode === "variationPercent" ? (
                                  <td className={`px-6 py-2 text-right font-semibold text-sm font-semibold ${
                                    accountVariation && accountVariation >= 0 ? "text-emerald-600" : "text-red-600"
                                  }`}>
                                    {accountVariation !== null && account.amount !== 0
                                      ? `${accountVariation >= 0 ? "+" : ""}${accountVariation.toFixed(1)}%`
                                      : "-"}
                                  </td>
                                ) : columnMode === "variationAmount" ? (
                                  <td className={`px-6 py-2 text-right font-semibold text-sm font-semibold ${
                                    accountVariationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                                  }`}>
                                    {account.amount !== 0
                                      ? `${accountVariationAmount >= 0 ? "+" : ""}${formatCurrency(accountVariationAmount)}`
                                      : "-"}
                                  </td>
                                ) : columnMode === "percentage" ? (
                                  <>
                                    <td className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                      {account.amount !== 0 ? `${getRevenuePercentage(account.amount, false).toFixed(1)}%` : "-"}
                                    </td>
                                    <td className="px-6 py-2 text-right font-semibold text-sm text-slate-600">
                                      {account.priorAmount !== undefined && account.priorAmount !== 0 ? `${getRevenuePercentage(account.priorAmount, true).toFixed(1)}%` : "-"}
                                    </td>
                                  </>
                                ) : null}
                              </>
                            )}
                            
                            {/* Trend views - 12months, quarters, years */}
                            {view === "12months" && row.trendValues && (
                              <>
                                {row.trendValues.map((rowTrendValue, valueIdx) => {
                                  const accountTrendValue =
                                    account.trendValues != null &&
                                    account.trendValues[valueIdx] !== undefined
                                      ? account.trendValues[valueIdx]!
                                      : account.proportion !== undefined
                                        ? Math.round(rowTrendValue * account.proportion)
                                        : rowTrendValue

                                  return (
                                    <td key={valueIdx} className="px-4 py-2 text-right font-semibold text-sm text-slate-700">
                                      {columnMode === "percentage"
                                        ? (accountTrendValue !== 0 ? `${getTrendRevenuePercentage(accountTrendValue, valueIdx).toFixed(1)}%` : "-")
                                        : columnMode === "variations"
                                          ? (() => {
                                              const trendVariation = getTrendVariation(account.trendValues ?? row.trendValues ?? [], valueIdx)
                                              const trendVariationAmount = getTrendVariationAmount(account.trendValues ?? row.trendValues ?? [], valueIdx)
                                              return (
                                                <div className="space-y-0.5">
                                                  <div>{trendVariation !== null ? `${trendVariation >= 0 ? "+" : ""}${trendVariation.toFixed(1)}%` : "-"}</div>
                                                  <div className="text-[11px] font-medium">
                                                    {trendVariationAmount !== null ? `${trendVariationAmount >= 0 ? "+" : ""}${formatCurrency(trendVariationAmount)}` : "-"}
                                                  </div>
                                                </div>
                                              )
                                            })()
                                          : (accountTrendValue !== 0 ? formatCurrency(accountTrendValue) : "-")}
                                    </td>
                                  )
                                })}
                              </>
                            )}
                            
                            {view === "quarters" && row.trendValues && (
                              <>
                                {row.trendValues.map((rowTrendValue, valueIdx) => {
                                  const accountTrendValue =
                                    account.trendValues != null &&
                                    account.trendValues[valueIdx] !== undefined
                                      ? account.trendValues[valueIdx]!
                                      : account.proportion !== undefined
                                        ? Math.round(rowTrendValue * account.proportion)
                                        : rowTrendValue

                                  return (
                                    <td key={valueIdx} className="px-4 py-2 text-right font-semibold text-sm text-slate-700">
                                      {columnMode === "percentage"
                                        ? (accountTrendValue !== 0 ? `${getTrendRevenuePercentage(accountTrendValue, valueIdx).toFixed(1)}%` : "-")
                                        : columnMode === "variations"
                                          ? (() => {
                                              const trendVariation = getTrendVariation(account.trendValues ?? row.trendValues ?? [], valueIdx)
                                              const trendVariationAmount = getTrendVariationAmount(account.trendValues ?? row.trendValues ?? [], valueIdx)
                                              return (
                                                <div className="space-y-0.5">
                                                  <div>{trendVariation !== null ? `${trendVariation >= 0 ? "+" : ""}${trendVariation.toFixed(1)}%` : "-"}</div>
                                                  <div className="text-[11px] font-medium">
                                                    {trendVariationAmount !== null ? `${trendVariationAmount >= 0 ? "+" : ""}${formatCurrency(trendVariationAmount)}` : "-"}
                                                  </div>
                                                </div>
                                              )
                                            })()
                                          : (accountTrendValue !== 0 ? formatCurrency(accountTrendValue) : "-")}
                                    </td>
                                  )
                                })}
                              </>
                            )}
                            
                            {view === "years" && row.trendValues && (
                              <>
                                {/* Type cell for balance accounts in Dépenses section */}
                                {title === "Estimation des dépenses annuelles" && (
                                  <td className="px-4 py-2 text-center text-slate-700">
                                    {row.rowId ? (
                                      <span className={cn(
                                        "text-xs font-medium px-2 py-0.5 rounded",
                                        getExpenseType(row.rowId) === "variable" 
                                          ? "text-blue-600 bg-blue-50" 
                                          : "text-purple-600 bg-purple-50"
                                      )}>
                                        {getExpenseType(row.rowId) === "variable" ? "Variable" : "Fixe"}
                                      </span>
                                    ) : (
                                      "-"
                                    )}
                                  </td>
                                )}
                                {/* Taux column cell for balance accounts in Dépenses section */}
                                {title === "Estimation des dépenses annuelles" && (
                                  <td className="px-4 py-2 text-center text-slate-700">
                                    {row.rowId ? (
                                      getExpenseType(row.rowId) === "variable" ? (
                                        <span className="text-blue-600 font-medium text-xs">
                                          {getVariableRate(row.rowId) !== 0 ? `${getVariableRate(row.rowId).toFixed(1)}%` : "-"}
                                        </span>
                                      ) : (
                                        <span className="text-purple-600 font-medium text-xs">
                                          {getInflationRate(row.rowId).toFixed(1)}%
                                        </span>
                                      )
                                    ) : (
                                      "-"
                                    )}
                                  </td>
                                )}
                                {row.trendValues.map((rowTrendValue, valueIdx) => {
                                  // Get the actual row value (edited or default) for forecast sections
                                  const actualRowValue = isForecastSection && row.rowId 
                                    ? getRevenueValue(row.rowId, valueIdx, rowTrendValue)
                                    : rowTrendValue
                                  
                                  const accountTrendValue =
                                    account.trendValues != null &&
                                    account.trendValues[valueIdx] !== undefined
                                      ? account.trendValues[valueIdx]!
                                      : account.proportion !== undefined
                                        ? Math.round(actualRowValue * account.proportion)
                                        : actualRowValue
                                  
                                  // Get previous value for growth calculation
                                  const previousRowValue = valueIdx > 0 && row.trendValues
                                    ? (isForecastSection && row.rowId
                                        ? getRevenueValue(row.rowId, valueIdx - 1, row.trendValues[valueIdx - 1])
                                        : row.trendValues[valueIdx - 1])
                                    : null
                                  
                                  // Calculate growth rate if showGrowthRate is true and not first year
                                  let displayValue: string | number = accountTrendValue
                                  let growthRate: number | null = null
                                  if (showGrowthRate && isForecastSection && valueIdx > 0 && previousRowValue !== null) {
                                    const previousAccountValue =
                                      account.trendValues != null &&
                                      valueIdx > 0 &&
                                      account.trendValues[valueIdx - 1] !== undefined
                                        ? account.trendValues[valueIdx - 1]!
                                        : account.proportion !== undefined
                                          ? Math.round(previousRowValue * account.proportion)
                                          : previousRowValue
                                    if (previousAccountValue !== 0) {
                                      growthRate = calculateVariation(accountTrendValue, previousAccountValue)
                                      displayValue = growthRate !== null ? `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(1)}%` : "-"
                                    } else {
                                      displayValue = "-"
                                    }
                                  } else if (showGrowthRate && isForecastSection && valueIdx === 0) {
                                    displayValue = "-" // No growth rate for first year
                                  }
                                  
                                  return (
                                    <td 
                                      key={valueIdx} 
                                      className={cn(
                                        "px-4 py-2 text-right font-semibold text-sm",
                                        isForecastSection && valueIdx === 0 ? "bg-slate-50 text-slate-700" : "text-slate-700",
                                        showGrowthRate && isForecastSection && valueIdx > 0 && typeof displayValue === "string" && displayValue.includes("%") && title === "Estimation des revenus annuels" ? "text-slate-900" : "",
                                        showGrowthRate && isForecastSection && valueIdx > 0 && typeof displayValue === "string" && displayValue.includes("%") && growthRate !== null && growthRate >= 0 && title !== "Estimation des revenus annuels" ? "text-emerald-600 font-semibold" : "",
                                        showGrowthRate && isForecastSection && valueIdx > 0 && typeof displayValue === "string" && displayValue.includes("%") && growthRate !== null && growthRate < 0 && title !== "Estimation des revenus annuels" ? "text-red-600 font-semibold" : ""
                                      )}
                                    >
                                      {showGrowthRate && isForecastSection
                                        ? displayValue
                                        : !isForecastSection && columnMode === "percentage"
                                          ? (accountTrendValue !== 0 ? `${getTrendRevenuePercentage(accountTrendValue, valueIdx).toFixed(1)}%` : "-")
                                          : !isForecastSection && columnMode === "variations"
                                            ? (() => {
                                                const trendVariation = getTrendVariation(account.trendValues ?? row.trendValues ?? [], valueIdx)
                                                const trendVariationAmount = getTrendVariationAmount(account.trendValues ?? row.trendValues ?? [], valueIdx)
                                                return (
                                                  <div className="space-y-0.5">
                                                    <div>{trendVariation !== null ? `${trendVariation >= 0 ? "+" : ""}${trendVariation.toFixed(1)}%` : "-"}</div>
                                                    <div className="text-[11px] font-medium">
                                                      {trendVariationAmount !== null ? `${trendVariationAmount >= 0 ? "+" : ""}${formatCurrency(trendVariationAmount)}` : "-"}
                                                    </div>
                                                  </div>
                                                )
                                              })()
                                            : (accountTrendValue !== 0 ? formatCurrency(accountTrendValue) : "-")}
                                    </td>
                                  )
                                })}
                              </>
                            )}
                            
                            {/* Empty cells for comparison mode views */}
                            {((view === "comparison" && isComparisonMode) || (view === "ytd" && isComparisonMode) || (view === "ddm" && isComparisonMode)) && (
                              <>
                                {Array.from({ length: isComparisonMode ? entitiesToCompare.length : 2 }).map((_, cellIdx) => (
                                  <td key={cellIdx} className="px-6 py-2 text-right font-semibold text-sm text-slate-700">
                                    {view === "comparison" && isComparisonMode ? formatCurrency(account.amount) : "-"}
                                  </td>
                                ))}
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

      </div>

      <Sheet
        open={analysisPanelNarrow && lineAnalysis != null}
        onOpenChange={(open) => {
          if (!open) setLineAnalysis(null)
        }}
      >
        <SheetContent side="right" className="flex w-full max-w-md flex-col gap-0 overflow-y-auto border-slate-200 p-6 sm:max-w-lg">
          {lineAnalysis && <div className="min-w-0">{renderUnifiedAnalysisNoteCard({ hideCloseButton: true })}</div>}
        </SheetContent>
      </Sheet>

      {/* Footer note */}
      <div className="border-t border-slate-200 bg-slate-50/80 px-8 py-4">
        <p className={cn("text-xs", dashboardCardBodyMutedClass)}>
          Note: Les données affichées sont à titre informatif. Consulter les états financiers audités pour les montants
          officiels.
        </p>
      </div>

      {lineAnalysis && !analysisPanelNarrow && (
        <aside
          aria-label="Analyse et note du poste"
          className="border-t border-slate-200 bg-gradient-to-b from-slate-50 via-white to-slate-50/60 px-5 py-6 sm:px-6 sm:py-7"
        >
          <div
            ref={lineAnalysisPanelTopRef}
            className="min-w-0 scroll-mt-4"
          >
            {renderUnifiedAnalysisNoteCard()}
          </div>
        </aside>
      )}

      {/* Type/Taux Modal */}
      {title === "Estimation des dépenses annuelles" && editingTypeRateRowId && (() => {
        const rowLabel = editingTypeRateRowId ? (data.find(r => r.rowId === editingTypeRateRowId)?.label || "Poste") : "Poste"
        
        return (
          <Dialog 
            open={typeRateModalOpen} 
            onOpenChange={(open) => {
              if (!open) {
                // Reset temp values to current values when closing
                if (editingTypeRateRowId) {
                  setTempExpenseType(getExpenseType(editingTypeRateRowId))
                  setTempVariableRate(getVariableRate(editingTypeRateRowId))
                  const hasSpecificRate = specificInflationRates[editingTypeRateRowId] !== undefined
                  setTempSpecificInflationRate(hasSpecificRate ? specificInflationRates[editingTypeRateRowId] : null)
                }
                setEditingTypeRateRowId(null)
              }
              setTypeRateModalOpen(open)
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Configuration Type et Taux</DialogTitle>
                <DialogDescription>
                  {rowLabel}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Type de dépense
                  </label>
                  <Select
                    value={tempExpenseType}
                    onValueChange={(value: "variable" | "fixe") => setTempExpenseType(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="variable">Variable</SelectItem>
                      <SelectItem value="fixe">Fixe</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    {tempExpenseType === "variable" 
                      ? "Les dépenses variables sont calculées en pourcentage des revenus"
                      : "Les dépenses fixes évoluent selon un taux d'inflation (spécifique ou global)"}
                  </p>
                </div>
                
                {tempExpenseType === "variable" && (
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Dépenses en % des revenus
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={tempVariableRate}
                      onChange={(e) => setTempVariableRate(parseFloat(e.target.value) || 0)}
                      placeholder="0.0"
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Pourcentage des revenus que représentent ces dépenses variables
                    </p>
                  </div>
                )}
                
                {tempExpenseType === "fixe" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Taux d'inflation pour cette dépense
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          value={tempSpecificInflationRate !== null ? tempSpecificInflationRate : inflationRate}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0
                            setTempSpecificInflationRate(value)
                          }}
                          className="w-full"
                        />
                        <span className="text-sm text-slate-600">%</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {tempSpecificInflationRate !== null && tempSpecificInflationRate !== inflationRate
                          ? `Taux spécifique: ${tempSpecificInflationRate.toFixed(1)}% (Taux global: ${inflationRate.toFixed(1)}%)`
                          : `Utilise le taux global: ${inflationRate.toFixed(1)}%`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTempSpecificInflationRate(null)
                        }}
                        disabled={tempSpecificInflationRate === null}
                        className="text-xs"
                      >
                        Utiliser le taux global
                      </Button>
                      <span className="text-xs text-slate-500">
                        Taux global: {inflationRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Reset temp values to current values
                    if (editingTypeRateRowId) {
                      setTempExpenseType(getExpenseType(editingTypeRateRowId))
                      setTempVariableRate(getVariableRate(editingTypeRateRowId))
                      const hasSpecificRate = specificInflationRates[editingTypeRateRowId] !== undefined
                      setTempSpecificInflationRate(hasSpecificRate ? specificInflationRates[editingTypeRateRowId] : null)
                    }
                    setTypeRateModalOpen(false)
                    setEditingTypeRateRowId(null)
                  }}
                >
                  Annuler
                </Button>
                <Button
                  onClick={saveTypeRate}
                >
                  Enregistrer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}

      {/* Adjustment Modal */}
      {(title === "Estimation des dépenses annuelles" || title === "Estimation des revenus annuels") && editingAdjustment && (() => {
        const rowLabel = editingAdjustment.rowId ? (data.find(r => r.rowId === editingAdjustment.rowId)?.label || "Poste") : "Poste"
        const yearLabels = getYearLabels()
        const yearIndex = editingAdjustment.yearIndex >= 0 && editingAdjustment.yearIndex < yearLabels.length 
          ? editingAdjustment.yearIndex 
          : 0
        const yearLabel = yearLabels[yearIndex] || `${yearIndex}`
        const existingAdjustments = title === "Estimation des revenus annuels"
          ? getRevenueAdjustments(editingAdjustment.rowId, editingAdjustment.yearIndex)
          : getAdjustments(editingAdjustment.rowId, editingAdjustment.yearIndex)
        
        return (
          <Dialog open={adjustmentModalOpen} onOpenChange={setAdjustmentModalOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Ajustements pour {rowLabel}</DialogTitle>
                <DialogDescription>
                  Année: {yearLabel}
                </DialogDescription>
              </DialogHeader>
              
              {/* List of existing adjustments */}
              {existingAdjustments.length > 0 && (
                <div className="space-y-3 py-4 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700">Ajustements existants</h3>
                  {existingAdjustments.map((adj) => {
                    if (title === "Estimation des revenus annuels") {
                      const revenueAdj = adj as RevenueAdjustment
                      return (
                        <div key={revenueAdj.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-slate-900">
                                  {revenueAdj.type === "amount" 
                                    ? formatCurrency(revenueAdj.value)
                                    : revenueAdj.type === "growthPercent"
                                    ? `${revenueAdj.value >= 0 ? "+" : ""}${revenueAdj.value.toFixed(1)}%`
                                    : formatCurrency(revenueAdj.value)}
                                </span>
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded",
                                  revenueAdj.type === "amount" ? "bg-blue-100 text-blue-700"
                                  : revenueAdj.type === "growthPercent" ? "bg-green-100 text-green-700"
                                  : "bg-purple-100 text-purple-700"
                                )}>
                                  {revenueAdj.type === "amount" ? "Montant annuel"
                                  : revenueAdj.type === "growthPercent" ? "Croissance %"
                                  : "Croissance $"}
                                </span>
                              </div>
                              {revenueAdj.note && (
                                <p className="text-sm text-slate-600 mt-1">{revenueAdj.note}</p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => openAdjustmentModal(editingAdjustment.rowId, editingAdjustment.yearIndex, revenueAdj.id)}
                                className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                                title="Modifier"
                              >
                                <Edit2 className="w-4 h-4 text-slate-600" />
                              </button>
                              <button
                                onClick={() => deleteAdjustment(revenueAdj.id)}
                                className="p-1.5 hover:bg-red-100 rounded transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    } else {
                      const expenseAdj = adj as ExpenseAdjustment
                      return (
                        <div key={expenseAdj.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-slate-900">
                                  {expenseAdj.type === "amount" 
                                    ? formatCurrency(expenseAdj.amount || 0)
                                    : `${expenseAdj.percentage?.toFixed(1)}%`}
                                </span>
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded",
                                  expenseAdj.type === "amount" 
                                    ? (expenseAdj.isRecurring ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700")
                                    : (expenseAdj.isRecurring ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700")
                                )}>
                                  {expenseAdj.type === "amount" 
                                    ? (expenseAdj.isRecurring ? "Récurrent" : "Non récurrent")
                                    : (expenseAdj.isRecurring ? "Récurrent" : "Non récurrent")}
                                </span>
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded",
                                  expenseAdj.type === "amount" ? "bg-slate-100 text-slate-700" : "bg-indigo-100 text-indigo-700"
                                )}>
                                  {expenseAdj.type === "amount" ? "Montant ($)" : "Pourcentage (%)"}
                                </span>
                              </div>
                              {expenseAdj.note && (
                                <p className="text-sm text-slate-600 mt-1">{expenseAdj.note}</p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => openAdjustmentModal(editingAdjustment.rowId, editingAdjustment.yearIndex, expenseAdj.id)}
                                className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                                title="Modifier"
                              >
                                <Edit2 className="w-4 h-4 text-slate-600" />
                              </button>
                              <button
                                onClick={() => deleteAdjustment(expenseAdj.id)}
                                className="p-1.5 hover:bg-red-100 rounded transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    }
                  })}
                </div>
              )}
              
              {/* Form to add/edit adjustment */}
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">
                    {editingAdjustmentId ? "Modifier l'ajustement" : "Ajouter un ajustement"}
                  </h3>
                  {editingAdjustmentId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingAdjustmentId(null)
                        if (title === "Estimation des revenus annuels") {
                          setRevenueAdjustmentType("amount")
                          setRevenueAdjustmentValue(0)
                        } else {
                          setAdjustmentType("amount")
                          setAdjustmentAmount(0)
                          setAdjustmentPercentage(0)
                          setAdjustmentIsRecurring(false)
                        }
                        setAdjustmentNote("")
                      }}
                    >
                      Annuler
                    </Button>
                  )}
                </div>
                
                {title === "Estimation des revenus annuels" ? (
                  <>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Type d'ajustement
                      </label>
                      <Select
                        value={revenueAdjustmentType}
                        onValueChange={(value: "amount" | "growthPercent" | "growthAmount") => setRevenueAdjustmentType(value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amount">Montant annuel</SelectItem>
                          <SelectItem value="growthPercent">Croissance en %</SelectItem>
                          <SelectItem value="growthAmount">Croissance en $</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        {revenueAdjustmentType === "amount" 
                          ? "Montant annuel ($)"
                          : revenueAdjustmentType === "growthPercent"
                          ? "Croissance (%)"
                          : "Croissance ($)"}
                      </label>
                      <Input
                        type="number"
                        value={revenueAdjustmentValue}
                        onChange={(e) => setRevenueAdjustmentValue(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        {revenueAdjustmentType === "amount"
                          ? "Montant annuel souhaité pour cette année"
                          : revenueAdjustmentType === "growthPercent"
                          ? "Pourcentage de croissance par rapport à l'année précédente"
                          : "Montant de croissance en dollars par rapport à l'année précédente"}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Check if this is a variable expense to show percentage option */}
                    {editingAdjustment && getExpenseType(editingAdjustment.rowId) === "variable" && (
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Type d'ajustement
                        </label>
                        <Select
                          value={adjustmentType}
                          onValueChange={(value: "amount" | "percentage") => {
                            setAdjustmentType(value)
                            if (value === "amount") {
                              setAdjustmentAmount(0)
                            } else {
                              setAdjustmentPercentage(0)
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="amount">Montant ($)</SelectItem>
                            <SelectItem value="percentage">Pourcentage des revenus (%)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500 mt-1">
                          {adjustmentType === "amount"
                            ? "Ajustement en montant (positif pour augmenter, négatif pour diminuer)"
                            : "Modifier le pourcentage de la dépense par rapport aux revenus (ex: 40% → 38%)"}
                        </p>
                      </div>
                    )}
                    
                    {adjustmentType === "amount" ? (
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Montant de l'ajustement ($)
                        </label>
                        <Input
                          type="number"
                          value={adjustmentAmount}
                          onChange={(e) => setAdjustmentAmount(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Montant positif pour augmenter, négatif pour diminuer
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Nouveau pourcentage des revenus (%)
                        </label>
                        <Input
                          type="number"
                          step="0.1"
                          value={adjustmentPercentage}
                          onChange={(e) => setAdjustmentPercentage(parseFloat(e.target.value) || 0)}
                          placeholder="0.0"
                          className="w-full"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Nouveau pourcentage que représentent ces dépenses par rapport aux revenus (ex: 38 pour 38%)
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Type d'ajustement
                      </label>
                      <Select
                        value={adjustmentIsRecurring ? "recurring" : "non-recurring"}
                        onValueChange={(value) => setAdjustmentIsRecurring(value === "recurring")}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recurring">Récurrent</SelectItem>
                          <SelectItem value="non-recurring">Non récurrent</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500 mt-1">
                        {adjustmentType === "amount" 
                          ? (adjustmentIsRecurring 
                              ? "L'ajustement continuera dans les années suivantes avec l'inflation"
                              : "L'ajustement s'appliquera uniquement à cette année")
                          : (adjustmentIsRecurring
                              ? "Le nouveau pourcentage sera utilisé pour toutes les années suivantes"
                              : "Le nouveau pourcentage s'appliquera uniquement à cette année, puis retour au taux initial")}
                      </p>
                    </div>
                  </>
                )}
                
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Note explicative
                  </label>
                  <Textarea
                    value={adjustmentNote}
                    onChange={(e) => setAdjustmentNote(e.target.value)}
                    placeholder={title === "Estimation des revenus annuels"
                      ? "Ex: Nouveau contrat client majeur, Expansion dans un nouveau marché, etc."
                      : "Ex: Déménagement vers un bureau plus grand, Location d'entrepôt temporaire, etc."}
                    className="w-full min-h-[80px]"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Décrivez la raison de cet ajustement
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAdjustmentModalOpen(false)
                    setEditingAdjustment(null)
                    setEditingAdjustmentId(null)
                    if (title === "Estimation des revenus annuels") {
                      setRevenueAdjustmentType("amount")
                      setRevenueAdjustmentValue(0)
                    } else {
                      setAdjustmentType("amount")
                      setAdjustmentAmount(0)
                      setAdjustmentPercentage(0)
                      setAdjustmentIsRecurring(false)
                    }
                    setAdjustmentNote("")
                  }}
                >
                  Fermer
                </Button>
                <Button
                  onClick={saveAdjustment}
                  disabled={title === "Estimation des revenus annuels" 
                    ? revenueAdjustmentValue === 0
                    : (adjustmentType === "amount" ? adjustmentAmount === 0 : adjustmentPercentage === 0)}
                >
                  {editingAdjustmentId ? "Enregistrer les modifications" : "Ajouter l'ajustement"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}
      </div>
    </div>
  )
}
