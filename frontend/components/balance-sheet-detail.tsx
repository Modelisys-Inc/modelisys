"use client"

import { Fragment, useCallback, useMemo, useRef, useState, useEffect } from "react"
import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import type { FinancialStatementRow } from "@/lib/api"
import {
  getFinancialStatementSeries,
  getStatementStructure,
  listForecastConfigs,
  upsertForecastConfig,
  type FinancialStatementSeriesParams,
} from "@/lib/api"
import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { generateId } from "@/lib/seeded-random"
import {
  BILAN_FORECAST_CONFIG_TYPE,
  BILAN_HYPOTHESIS_TITLE,
  buildActRevenuePercentHistory,
  buildComptesClientsHistory,
  buildCrediteursHistory,
  buildForecastEndingCashTrend,
  buildStocksHistory,
  comptesClientsAmountFromDriver,
  crediteursAmountFromDriver,
  isCapexDrivenBilanRow,
  isComptesClientsBilanRow,
  isCrediteursApparentesBilanRow,
  isCrediteursLikeBilanRow,
  isDecouvertBilanRow,
  isEncaisseBilanRow,
  isExternalForecastDrivenBilanRow,
  isFinancingDrivenBilanRow,
  isHypothesisBilanSubtotalRow,
  isOtherActBilanRow,
  isHypothesisBilanSectionHeaderRow,
  isStocksBilanRow,
  isTreasuryEndingCashDrivenBilanRow,
  parseBilanAdjustments,
  resolveBilanAdjustedValue,
  resolveComptesClientsProjectedValue,
  resolveCrediteursProjectedValue,
  resolveOtherActProjectedValue,
  resolveStocksProjectedValue,
  resolveTreasuryLineFromEndingCash,
  recomputeBilanHypothesisSubtotalTrends,
  revenueForComptesClientsYear,
  stocksAmountFromDriver,
  type ActRevenuePercentHistoryYear,
  type BilanAdjustment,
  type BilanAdjustmentType,
  type ComptesClientsHistoryYear,
  type CrediteursHistoryYear,
  type StocksHistoryYear,
} from "@/lib/bilan-forecast-utils"
import { IncomeStatementStructureStudioCols } from "@/components/income-statement-structure-studio-cols"
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
import { useProjectedRevenueYearTotals } from "@/hooks/use-projected-revenue-year-totals"
import { useProjectedCmvYearTotals } from "@/hooks/use-projected-cmv-year-totals"
import { useCapexForecastForBilan } from "@/hooks/use-capex-forecast-for-bilan"
import { useDebtForecastForBilan } from "@/hooks/use-debt-forecast-for-bilan"
import { useBalanceSheetStructureEdit } from "@/hooks/use-income-statement-structure-edit"
import { useStandardLinkCodesFlat } from "@/hooks/use-standard-link-codes"
import {
  buildStandardLinkCodeLabelMap,
  isCapexProjectionLinkCode,
} from "@/lib/standard-link-code-utils"
import type { CapexBilanPeerRow } from "@/lib/capex-forecast-resolve"
import {
  collectDistinctLinkCodesFromStructure,
  mapLinkCodesToOwnerLabel,
  detailLineLabelForDisplay,
  findStatementApiRowForStructureRow,
  findStructureRowForStatementLine,
  getStructureRowGlobalIndex,
  listAnnexOptionsForDetailSubLineModal,
  listStructureRowsForDetailDisplay,
  listStructureRowsForPresentationDisplay,
  indentForSummaryRow,
  isCodeMappingEnabled,
  isShowInDetail,
  isStructureRowDetailOnly,
  isStructureRowInDetailAnnexEditor,
  isSummaryAnnexRowLockedInDetailEdit,
  isTruthySeparatorAbove,
  normLabel,
  normalizeAnnexLetter,
  syncDetailSubLinesFromStandard,
} from "@/lib/income-statement-structure-utils"
import { filterBalanceSheetDetailRowsForHorizon } from "@/lib/balance-sheet-horizon-filter"
import type { IncomeStatementHorizonView } from "@/lib/income-statement-horizon-visibility"
import {
  getPeriodLabels,
  reverseSeriesOrderForDisplay,
  findRow,
  findSeriesRowOrDetail,
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
import { PERFORMANCE_CHART_YEAR_COUNT } from "@/lib/performance-chart-series"
import { monthTrendFromReference, yearTrendFromReference } from "@/lib/series-reference-columns"
import {
  type ForecastActualLayout,
  balanceSheetFiscalYearEndAmountsByYear,
  forecastActualColumnCount,
  forecastBalanceSheetYearTrend,
  forecastDisplayToConfigYearIndex,
  forecastDisplayYearCount,
  forecastYearLabelsForLayout,
  incomeStatementFiscalYearTotalsByYear,
  isForecastProjectedDisplayColumn,
  lastCompletedFiscalYearEnd,
  lastTwoCompletedFiscalYearEnds,
  resolveForecastActualLayout,
} from "@/lib/pro-forma-forecast-columns"
import {
  balanceSheetQuarterTrendForBasis,
  balanceSheetYearTrendForBasis,
  statementQuarterLabelsForBasis,
  statementYearLabelsForBasis,
  STATEMENT_QUARTER_COUNT,
  type StatementPeriodBasis,
} from "@/lib/income-statement-period-basis"
import { parseFiscalYearEndMonth } from "@/lib/capex-year-reference"
import { isBalanceSheetValidationStructureRow } from "@/lib/balance-sheet-validation"
import {
  buildNetCashByPeriodKey,
  isCashFlowNetVariationStructureRow,
  periodKey,
} from "@/lib/cash-flow-treasury-rows"
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

function formatComptesClientsHistoryNumber(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return value.toLocaleString("fr-CA", { maximumFractionDigits: 1, minimumFractionDigits: 0 })
}

function averageHistoryMetric(
  history: Array<
    ComptesClientsHistoryYear | StocksHistoryYear | CrediteursHistoryYear | ActRevenuePercentHistoryYear
  >,
  key: "collectionDays" | "revenuePercent" | "inventoryDays" | "paymentDays",
): number | null {
  const values = history
    .map((row) => {
      if (key === "inventoryDays") return "inventoryDays" in row ? row.inventoryDays : null
      if (key === "paymentDays") return "paymentDays" in row ? row.paymentDays : null
      if (key === "collectionDays") return "collectionDays" in row ? row.collectionDays : null
      return row.revenuePercent
    })
    .filter((value): value is number => value != null && Number.isFinite(value))
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function lastHistoryDriverValue(
  history: ComptesClientsHistoryYear[],
  type: "collectionDays" | "revenuePercent",
): number {
  const last = history[history.length - 1]
  const raw = type === "revenuePercent" ? last?.revenuePercent : last?.collectionDays
  return raw != null && Number.isFinite(raw) ? raw : 0
}

function lastStocksHistoryDriverValue(
  history: StocksHistoryYear[],
  type: "inventoryDays" | "revenuePercent",
): number {
  const last = history[history.length - 1]
  const raw = type === "revenuePercent" ? last?.revenuePercent : last?.inventoryDays
  return raw != null && Number.isFinite(raw) ? raw : 0
}

function lastCrediteursHistoryDriverValue(
  history: CrediteursHistoryYear[],
  type: "paymentDays" | "revenuePercent",
): number {
  const last = history[history.length - 1]
  const raw = type === "revenuePercent" ? last?.revenuePercent : last?.paymentDays
  return raw != null && Number.isFinite(raw) ? raw : 0
}

function lastActRevenuePercentHistoryValue(history: ActRevenuePercentHistoryYear[]): number {
  const last = history[history.length - 1]
  const raw = last?.revenuePercent
  return raw != null && Number.isFinite(raw) ? raw : 0
}

/** Code de liaison effectif d’une ligne (poste mappé) — jamais le 1er code d’une somme. */
function structureRowEffectiveLinkCode(sr: Record<string, unknown>): string {
  return String(sr.linkCode ?? "").trim()
}

function findCmvSeriesRow(rows: SeriesRow[]): SeriesRow | undefined {
  return (
    findRow(rows, "CMV") ||
    findRow(rows, "cout des produits vendus") ||
    findRow(rows, "coût des produits vendus") ||
    findRow(rows, "couts des produits vendus") ||
    findRow(rows, "coûts des produits vendus") ||
    rows.find((r) => {
      const id = String(r.id ?? "").toUpperCase()
      return id === "CMV" || id.startsWith("CMV.")
    })
  )
}

interface BalanceSheetDetailProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years"
  columnMode?: "variationAmount" | "variationPercent" | "comparison"
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
  /** Pro Forma Bilan : N-1 (solde de clôture) + YTD si la date de référence n’est pas une FYE. */
  forecastActualLayout?: ForecastActualLayout
  /** Annuel / trimestriel : Courant (même mois / T3M) ou Exercice (FYE / trimestres fiscaux). */
  periodBasis?: StatementPeriodBasis
  projectionId?: string | null
}

interface BalanceAccount {
  accountNumber: string
  accountName: string
  amount: number
  priorAmount?: number
  // For trend views, store the proportion of the parent row's amount
  proportion?: number
  trendValues?: number[]
}

interface DetailRow {
  label: string
  current: number
  prior: number
  indent?: boolean
  isBold?: boolean
  isSubtotal?: boolean
  isSection?: boolean
  /** Trait au-dessus (Paramètres Sommaire), comme le Bilan Sommaire. */
  separatorAbove?: boolean
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
  /** Code de liaison structure (ACT-D.1, …) — distinct du rowId série parfois UUID. */
  linkCode?: string
  /** Pour identifier la ligne d’état associée (utile pour les annexes). */
  statementLabel?: string
  /** Lettre d’annexe (structure), pour regrouper et afficher les sections Annexe. */
  annexLetter?: string
  hasLiaisonCode?: boolean
  /** Aligné Bilan Sommaire : formule ± refs ou liaison somme de codes. */
  formula?: string[]
  liaisonMode?: string
  liaisonSumCodes?: string[]
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
  forecastActualLayout = "single-prior-year",
  periodBasis = "current",
  projectionId = null,
}: BalanceSheetDetailProps) {
  const isHypothesisSection = title === BILAN_HYPOTHESIS_TITLE
  const isForecastSection = title === "Bilan pro forma" || isHypothesisSection
  const fiscalYearEndMonth = parseFiscalYearEndMonth(
    companies.find((c) => c.id === companyId)?.fiscalYearEnd ?? "12-31",
  )
  const forecastActualLayoutEffective = resolveForecastActualLayout(
    forecastActualLayout,
    refMonth,
    fiscalYearEndMonth,
  )
  const forecastActualCols = forecastActualColumnCount(forecastActualLayoutEffective)
  const forecastYearColumnCount = forecastDisplayYearCount(projectionYears, forecastActualLayoutEffective)
  const isForecastHistoricalColumn = (idx: number) => isForecastSection && idx < forecastActualCols

  useNotesCache(companyId ?? null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [bilanAdjustments, setBilanAdjustments] = useState<Record<string, BilanAdjustment[]>>({})
  const [hypothesisRowId, setHypothesisRowId] = useState<string | null>(null)
  const [hypothesisYearIndex, setHypothesisYearIndex] = useState<number>(1)
  // After layout resolves (N-1 + YTD), default open target = 1re année projetée.
  const [hypothesisRowLabel, setHypothesisRowLabel] = useState("")
  const [hypothesisLinkCode, setHypothesisLinkCode] = useState<string | null>(null)
  const [draftType, setDraftType] = useState<BilanAdjustmentType>("amount")
  const [draftValue, setDraftValue] = useState(0)
  const [draftRecurring, setDraftRecurring] = useState(false)
  const [draftNote, setDraftNote] = useState("")
  const [draftAdjustmentId, setDraftAdjustmentId] = useState<string | null>(null)
  const [bilanConfigLoaded, setBilanConfigLoaded] = useState(false)
  const bilanSaveRef = useRef<ReturnType<typeof setTimeout>>()
  const [statementStructure, setStatementStructure] = useState<Record<string, unknown>[] | null>(null)
  const [cashFlowStructure, setCashFlowStructure] = useState<Record<string, unknown>[] | null>(null)
  const [structureEditMode, setStructureEditMode] = useState(false)
  const [lineAnalysis, setLineAnalysis] = useState<BalanceSheetLineAnalysisSnapshot | null>(null)
  const [notesUpdated, setNotesUpdated] = useState(0) // Force re-render when notes change
  const analysisCardRef = useRef<HTMLElement | null>(null)
  const analysisRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})

  // Determine what we're comparing (needed early for Paramètres button availability).
  // Projections (pro forma / hypothèses) reuse columnMode="comparison" to show amounts,
  // not entity-vs-entity columns — skip that fetch path there.
  const isCompanyComparison = !isForecastSection && columnMode === "comparison" && !companyId
  const isDivisionComparison = !isForecastSection && columnMode === "comparison" && !!companyId && !divisionId
  const isSubDivisionComparison =
    !isForecastSection && columnMode === "comparison" && !!companyId && !!divisionId && !subDivisionId
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

  useEffect(() => {
    if (!companyId || !isHypothesisSection) {
      setCashFlowStructure(null)
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        const data = await getStatementStructure(companyId, "cash-flow-detail")
        if (!cancelled) setCashFlowStructure((data.structure ?? []) as Record<string, unknown>[])
      } catch (e) {
        console.error("Error loading cash-flow structure for Encaisse:", e)
        if (!cancelled) setCashFlowStructure([])
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [companyId, isHypothesisSection])

  useEffect(() => {
    if (!companyId || !isHypothesisSection) {
      setBilanAdjustments({})
      setBilanConfigLoaded(false)
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        const configs = await listForecastConfigs(companyId, {
          config_type: BILAN_FORECAST_CONFIG_TYPE,
          projection_id: projectionId ?? undefined,
        })
        if (cancelled) return
        const data = configs[0]?.data as Record<string, unknown> | undefined
        setBilanAdjustments(parseBilanAdjustments(data?.adjustments))
        setBilanConfigLoaded(true)
      } catch (err) {
        console.error("Error loading bilan forecast config:", err)
        if (!cancelled) {
          setBilanAdjustments({})
          setBilanConfigLoaded(true)
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [companyId, isHypothesisSection, projectionId])

  useEffect(() => {
    if (!companyId || !isHypothesisSection || !bilanConfigLoaded) return
    clearTimeout(bilanSaveRef.current)
    bilanSaveRef.current = setTimeout(async () => {
      try {
        await upsertForecastConfig(companyId, {
          config_type: BILAN_FORECAST_CONFIG_TYPE,
          data: { adjustments: bilanAdjustments },
          projection_id: projectionId ?? undefined,
        })
      } catch (err) {
        console.error("Error saving bilan forecast config:", err)
      }
    }, 500)
    return () => clearTimeout(bilanSaveRef.current)
  }, [bilanAdjustments, bilanConfigLoaded, companyId, isHypothesisSection, projectionId])

  const closeBilanHypothesisPanel = () => {
    setHypothesisRowId(null)
    setHypothesisLinkCode(null)
    setDraftAdjustmentId(null)
  }

  const openBilanHypothesisPanel = (
    rowId: string,
    yearIndex: number,
    rowLabel: string,
    linkCode?: string | null,
    opts?: {
      isSection?: boolean
      isSubtotal?: boolean
      hasLiaisonCode?: boolean
    },
  ) => {
    if (isTreasuryEndingCashDrivenBilanRow({ rowId, linkCode, label: rowLabel })) return
    if (isExternalForecastDrivenBilanRow({ rowId, linkCode })) return
    if (opts?.isSubtotal) return
    if (
      isHypothesisBilanSectionHeaderRow({
        label: rowLabel,
        isSection: opts?.isSection,
        isSubtotal: opts?.isSubtotal,
        hasLiaisonCode: opts?.hasLiaisonCode,
        linkCode,
      })
    ) {
      return
    }
    if (
      isHypothesisBilanSubtotalRow({
        label: rowLabel,
        isSection: opts?.isSection,
        hasLiaisonCode: opts?.hasLiaisonCode,
        linkCode,
      })
    ) {
      return
    }
    const existing = (bilanAdjustments[rowId] ?? []).find((a) => a.yearIndex === yearIndex)
    setHypothesisRowId(rowId)
    setHypothesisYearIndex(yearIndex)
    setHypothesisRowLabel(rowLabel)
    setHypothesisLinkCode(linkCode ?? null)
    setDraftAdjustmentId(existing?.id ?? null)
    if (isComptesClientsBilanRow({ rowId, linkCode, label: rowLabel })) {
      const driver =
        existing?.type === "revenuePercent" || existing?.type === "collectionDays"
          ? existing.type
          : "collectionDays"
      setDraftType(driver)
      setDraftValue(existing?.value ?? 0)
    } else if (isStocksBilanRow({ rowId, linkCode, label: rowLabel })) {
      const driver =
        existing?.type === "revenuePercent" || existing?.type === "inventoryDays"
          ? existing.type
          : "inventoryDays"
      setDraftType(driver)
      setDraftValue(existing?.value ?? 0)
    } else if (isCrediteursLikeBilanRow({ rowId, linkCode, label: rowLabel })) {
      const driver =
        existing?.type === "revenuePercent" || existing?.type === "paymentDays"
          ? existing.type
          : "paymentDays"
      setDraftType(driver)
      setDraftValue(existing?.value ?? 0)
    } else if (isOtherActBilanRow({ rowId, linkCode, label: rowLabel })) {
      const driver = existing?.type === "revenuePercent" ? "revenuePercent" : "amount"
      setDraftType(driver)
      setDraftValue(existing?.value ?? 0)
    } else {
      setDraftType("amount")
      setDraftValue(existing?.value ?? 0)
    }
    setDraftRecurring(existing?.isRecurring ?? false)
    setDraftNote(existing?.note ?? "")
  }

  const saveBilanHypothesis = () => {
    if (!hypothesisRowId) return
    const id = draftAdjustmentId ?? generateId("bilan")
    const isClients = isComptesClientsBilanRow({
      rowId: hypothesisRowId,
      linkCode: hypothesisLinkCode,
      label: hypothesisRowLabel,
    })
    const isStocks = isStocksBilanRow({
      rowId: hypothesisRowId,
      linkCode: hypothesisLinkCode,
      label: hypothesisRowLabel,
    })
    const isCrediteurs = isCrediteursLikeBilanRow({
      rowId: hypothesisRowId,
      linkCode: hypothesisLinkCode,
      label: hypothesisRowLabel,
    })
    const isOtherAct = isOtherActBilanRow({
      rowId: hypothesisRowId,
      linkCode: hypothesisLinkCode,
      label: hypothesisRowLabel,
    })
    const nextAdj: BilanAdjustment = {
      id,
      rowId: hypothesisRowId,
      yearIndex: hypothesisYearIndex,
      type: isClients
        ? draftType === "revenuePercent"
          ? "revenuePercent"
          : "collectionDays"
        : isStocks
          ? draftType === "revenuePercent"
            ? "revenuePercent"
            : "inventoryDays"
          : isCrediteurs
            ? draftType === "revenuePercent"
              ? "revenuePercent"
              : "paymentDays"
            : isOtherAct
              ? draftType === "revenuePercent"
                ? "revenuePercent"
                : "amount"
              : "amount",
      value: draftValue,
      isRecurring: draftRecurring,
      note: draftNote,
    }
    setBilanAdjustments((prev) => {
      const list = (prev[hypothesisRowId] ?? []).filter((a) => a.yearIndex !== hypothesisYearIndex)
      const keepDriver =
        isClients ||
        isStocks ||
        isCrediteurs ||
        (isOtherAct && nextAdj.type === "revenuePercent")
      const keep =
        !keepDriver && draftValue === 0 && !draftNote.trim() ? list : [...list, nextAdj]
      return { ...prev, [hypothesisRowId]: keep }
    })
    closeBilanHypothesisPanel()
  }

  const deleteBilanHypothesis = () => {
    if (!hypothesisRowId) return
    setBilanAdjustments((prev) => ({
      ...prev,
      [hypothesisRowId]: (prev[hypothesisRowId] ?? []).filter((a) => a.yearIndex !== hypothesisYearIndex),
    }))
    closeBilanHypothesisPanel()
  }

  const canInlineStructureEdit = !!showBalanceSheetStructureSettings && !!companyId && !isComparisonMode
  const structEdit = useBalanceSheetStructureEdit(companyId ?? null, structureEditMode && canInlineStructureEdit)
  const { codes: standardLinkCodes } = useStandardLinkCodesFlat(false, undefined, !!companyId)

  /** Structure affichée : Sommaire pour l’hypothèse ; Détail (+ sous-lignes standard) sinon. */
  const displayStructure = useMemo((): Record<string, unknown>[] | null => {
    if (statementStructure === null) return null
    if (isHypothesisSection) {
      return statementStructure.filter((r) => !isBalanceSheetValidationStructureRow(r))
    }
    if (standardLinkCodes.length === 0) return statementStructure
    return syncDetailSubLinesFromStandard(statementStructure, standardLinkCodes)
  }, [statementStructure, standardLinkCodes, isHypothesisSection])

  /** Structure Capex (sous-lignes ALT injectées) pour relier hyp. Terrains → parent ALT-B. */
  const capexAlignedStructure = useMemo((): Record<string, unknown>[] | null => {
    if (statementStructure === null) return null
    const base = statementStructure.filter((r) => !isBalanceSheetValidationStructureRow(r))
    if (standardLinkCodes.length === 0) return base
    return syncDetailSubLinesFromStandard(base, standardLinkCodes)
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
      .map((r, i) =>
        isStructureRowInDetailAnnexEditor(r as Record<string, unknown>, structEdit.structure, i)
          ? i
          : -1,
      )
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

  const { rows: cashFlowSeriesRows, periods: cashFlowPeriods } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "cash-flow-detail",
    fiscalYear: currentYear,
    month: refMonth,
    months: monthsNeeded,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: isHypothesisSection && !!companyId,
    structureVersion,
  })

  const { rows: incomeStatementSeriesRows, periods: incomeStatementPeriods } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "income-statement",
    fiscalYear: currentYear,
    month: refMonth,
    months: monthsNeeded,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: isHypothesisSection && !!companyId,
    structureVersion,
  })

  const buildComptesClientsHistoryForRow = useCallback(
    (rowId?: string | null): ComptesClientsHistoryYear[] => {
      // N-1 / N-2 = soldes de clôture d’exercice (même date que la colonne N-1 du tableau).
      const [n2, n1] = lastTwoCompletedFiscalYearEnds(refMonth, refYear, fiscalYearEndMonth)
      const lastActualYear = n1.year
      const ends = [n2, n1]
      let arByYear: Record<number, number> = {}
      let revenueByYear: Record<number, number> = {}
      const arRow =
        (rowId ? findSeriesRowOrDetail(seriesRows, rowId) : undefined) ??
        findRow(seriesRows, "ACT-C") ??
        findRow(seriesRows, "comptes clients")
      if (arRow && periods.length) {
        arByYear = balanceSheetFiscalYearEndAmountsByYear(arRow, periods, ends)
      }
      const revRow =
        findRow(incomeStatementSeriesRows, "REV") || findRow(incomeStatementSeriesRows, "revenus")
      if (revRow && incomeStatementPeriods.length) {
        revenueByYear = incomeStatementFiscalYearTotalsByYear(
          revRow,
          incomeStatementPeriods,
          ends,
          fiscalYearEndMonth,
        )
      }
      return buildComptesClientsHistory({ lastActualYear, arByYear, revenueByYear })
    },
    [
      fiscalYearEndMonth,
      incomeStatementPeriods,
      incomeStatementSeriesRows,
      periods,
      refMonth,
      refYear,
      seriesRows,
    ],
  )

  const buildStocksHistoryForRow = useCallback(
    (rowId?: string | null): StocksHistoryYear[] => {
      const [n2, n1] = lastTwoCompletedFiscalYearEnds(refMonth, refYear, fiscalYearEndMonth)
      const lastActualYear = n1.year
      const ends = [n2, n1]
      let stocksByYear: Record<number, number> = {}
      let cmvByYear: Record<number, number> = {}
      let revenueByYear: Record<number, number> = {}
      const stocksRow =
        (rowId ? findSeriesRowOrDetail(seriesRows, rowId) : undefined) ??
        findRow(seriesRows, "ACT-F") ??
        findRow(seriesRows, "stocks")
      if (stocksRow && periods.length) {
        stocksByYear = balanceSheetFiscalYearEndAmountsByYear(stocksRow, periods, ends)
      }
      const cmvRow = findCmvSeriesRow(incomeStatementSeriesRows)
      if (cmvRow && incomeStatementPeriods.length) {
        cmvByYear = incomeStatementFiscalYearTotalsByYear(
          cmvRow,
          incomeStatementPeriods,
          ends,
          fiscalYearEndMonth,
        )
      }
      const revRow =
        findRow(incomeStatementSeriesRows, "REV") || findRow(incomeStatementSeriesRows, "revenus")
      if (revRow && incomeStatementPeriods.length) {
        revenueByYear = incomeStatementFiscalYearTotalsByYear(
          revRow,
          incomeStatementPeriods,
          ends,
          fiscalYearEndMonth,
        )
      }
      return buildStocksHistory({ lastActualYear, stocksByYear, cmvByYear, revenueByYear })
    },
    [
      fiscalYearEndMonth,
      incomeStatementPeriods,
      incomeStatementSeriesRows,
      periods,
      refMonth,
      refYear,
      seriesRows,
    ],
  )

  const comptesClientsHistory = useMemo(
    () => buildComptesClientsHistoryForRow(hypothesisRowId),
    [buildComptesClientsHistoryForRow, hypothesisRowId],
  )

  const stocksHistory = useMemo(
    () => buildStocksHistoryForRow(hypothesisRowId),
    [buildStocksHistoryForRow, hypothesisRowId],
  )

  const buildCrediteursHistoryForRow = useCallback(
    (rowId?: string | null, linkCode?: string | null, label?: string | null): CrediteursHistoryYear[] => {
      const [n2, n1] = lastTwoCompletedFiscalYearEnds(refMonth, refYear, fiscalYearEndMonth)
      const lastActualYear = n1.year
      const ends = [n2, n1]
      let apByYear: Record<number, number> = {}
      let cmvByYear: Record<number, number> = {}
      let revenueByYear: Record<number, number> = {}
      const isApparentes = isCrediteursApparentesBilanRow({ rowId, linkCode, label })
      const apRow =
        (rowId ? findSeriesRowOrDetail(seriesRows, rowId) : undefined) ??
        (isApparentes
          ? findRow(seriesRows, "PCT-D") ??
            findRow(seriesRows, "apparent") ??
            findRow(seriesRows, "créditeurs - apparentés") ??
            findRow(seriesRows, "crediteurs - apparentes")
          : findRow(seriesRows, "PCT-C") ??
            findRow(seriesRows, "crediteurs") ??
            findRow(seriesRows, "créditeurs") ??
            findRow(seriesRows, "comptes fournisseurs") ??
            findRow(seriesRows, "fournisseurs"))
      if (apRow && periods.length) {
        apByYear = balanceSheetFiscalYearEndAmountsByYear(apRow, periods, ends)
      }
      const cmvRow = findCmvSeriesRow(incomeStatementSeriesRows)
      if (cmvRow && incomeStatementPeriods.length) {
        cmvByYear = incomeStatementFiscalYearTotalsByYear(
          cmvRow,
          incomeStatementPeriods,
          ends,
          fiscalYearEndMonth,
        )
      }
      const revRow =
        findRow(incomeStatementSeriesRows, "REV") || findRow(incomeStatementSeriesRows, "revenus")
      if (revRow && incomeStatementPeriods.length) {
        revenueByYear = incomeStatementFiscalYearTotalsByYear(
          revRow,
          incomeStatementPeriods,
          ends,
          fiscalYearEndMonth,
        )
      }
      return buildCrediteursHistory({ lastActualYear, apByYear, cmvByYear, revenueByYear })
    },
    [
      fiscalYearEndMonth,
      incomeStatementPeriods,
      incomeStatementSeriesRows,
      periods,
      refMonth,
      refYear,
      seriesRows,
    ],
  )

  const crediteursHistory = useMemo(
    () => buildCrediteursHistoryForRow(hypothesisRowId, hypothesisLinkCode, hypothesisRowLabel),
    [buildCrediteursHistoryForRow, hypothesisLinkCode, hypothesisRowId, hypothesisRowLabel],
  )

  const buildOtherActHistoryForRow = useCallback(
    (rowId?: string | null): ActRevenuePercentHistoryYear[] => {
      if (!rowId) return []
      const [n2, n1] = lastTwoCompletedFiscalYearEnds(refMonth, refYear, fiscalYearEndMonth)
      const lastActualYear = n1.year
      const ends = [n2, n1]
      let amountByYear: Record<number, number> = {}
      let revenueByYear: Record<number, number> = {}
      const actRow = findSeriesRowOrDetail(seriesRows, rowId) ?? findRow(seriesRows, rowId)
      if (actRow && periods.length) {
        amountByYear = balanceSheetFiscalYearEndAmountsByYear(actRow, periods, ends)
      }
      const revRow =
        findRow(incomeStatementSeriesRows, "REV") || findRow(incomeStatementSeriesRows, "revenus")
      if (revRow && incomeStatementPeriods.length) {
        revenueByYear = incomeStatementFiscalYearTotalsByYear(
          revRow,
          incomeStatementPeriods,
          ends,
          fiscalYearEndMonth,
        )
      }
      return buildActRevenuePercentHistory({ lastActualYear, amountByYear, revenueByYear })
    },
    [
      fiscalYearEndMonth,
      incomeStatementPeriods,
      incomeStatementSeriesRows,
      periods,
      refMonth,
      refYear,
      seriesRows,
    ],
  )

  const otherActHistory = useMemo(
    () => buildOtherActHistoryForRow(hypothesisRowId),
    [buildOtherActHistoryForRow, hypothesisRowId],
  )

  const lastActualRevenue = useMemo(() => {
    const revRow =
      findRow(incomeStatementSeriesRows, "REV") || findRow(incomeStatementSeriesRows, "revenus")
    if (!revRow || !incomeStatementPeriods.length) return 0
    const n1 = lastCompletedFiscalYearEnd(refMonth, refYear, fiscalYearEndMonth)
    return (
      incomeStatementFiscalYearTotalsByYear(
        revRow,
        incomeStatementPeriods,
        [n1],
        fiscalYearEndMonth,
      )[n1.year] ?? 0
    )
  }, [fiscalYearEndMonth, incomeStatementPeriods, incomeStatementSeriesRows, refMonth, refYear])

  /** CMV du dernier exercice complet — base du délai de rotation tant qu’il n’y a pas d’hyp. dépenses CMV. */
  const lastActualCmv = useMemo(() => {
    const cmvRow = findCmvSeriesRow(incomeStatementSeriesRows)
    if (!cmvRow || !incomeStatementPeriods.length) return 0
    const n1 = lastCompletedFiscalYearEnd(refMonth, refYear, fiscalYearEndMonth)
    return (
      incomeStatementFiscalYearTotalsByYear(
        cmvRow,
        incomeStatementPeriods,
        [n1],
        fiscalYearEndMonth,
      )[n1.year] ?? 0
    )
  }, [fiscalYearEndMonth, incomeStatementPeriods, incomeStatementSeriesRows, refMonth, refYear])

  /** Même année de départ que Hypothèses Revenus (1re année projetée = forecastBaseYear). */
  const revenueProjectionRefYear = forecastBaseYear ?? refYear + 1

  const { totals: projectedRevenueYearTotals } = useProjectedRevenueYearTotals({
    companyId,
    projectionId,
    projectionYears,
    fiscalYear: revenueProjectionRefYear,
    divisionId,
    subDivisionId,
    enabled: isHypothesisSection && !!companyId,
    forecastActualLayout: forecastActualLayoutEffective,
    refMonth,
    fiscalYearEndMonth,
  })

  const { totals: projectedCmvYearTotals } = useProjectedCmvYearTotals({
    companyId,
    projectionId,
    projectionYears,
    fiscalYear: revenueProjectionRefYear,
    divisionId,
    subDivisionId,
    enabled: isHypothesisSection && !!companyId,
    forecastActualLayout: forecastActualLayoutEffective,
    refMonth,
    fiscalYearEndMonth,
    lastActualCmv,
    lastActualRevenue,
  })

  const { resolveProjectedAmount: resolveCapexBilanProjectedAmount } = useCapexForecastForBilan({
    companyId,
    projectionId,
    projectionYears,
    fiscalYear: revenueProjectionRefYear,
    divisionId,
    subDivisionId,
    enabled: isHypothesisSection && !!companyId,
    forecastActualLayout: forecastActualLayoutEffective,
    refMonth,
    fiscalYearEndMonth,
  })

  const { resolveProjectedAmount: resolveFinancingBilanProjectedAmount } = useDebtForecastForBilan({
    companyId,
    projectionId,
    enabled: isHypothesisSection && !!companyId,
  })

  const capexPeerRows = useMemo((): CapexBilanPeerRow[] => {
    if (!isHypothesisSection || !seriesRows.length || !periods.length) {
      return []
    }
    const structureForPeers = capexAlignedStructure ?? displayStructure ?? statementStructure
    if (!structureForPeers?.length) return []
    const peers: CapexBilanPeerRow[] = []
    for (const sr of structureForPeers) {
      const linkCode = structureRowEffectiveLinkCode(sr)
      const rowId = String(sr.id ?? linkCode ?? "").trim()
      if (!rowId) continue
      if (!isCapexProjectionLinkCode(linkCode) && !isCapexProjectionLinkCode(rowId)) continue
      const seriesRow =
        findSeriesRowOrDetail(seriesRows, rowId) ??
        (linkCode ? findRow(seriesRows, linkCode) : undefined)
      let actualBase = 0
      if (seriesRow) {
        const trend = forecastBalanceSheetYearTrend(
          forecastActualLayoutEffective,
          seriesRow,
          periods as SeriesPeriod[],
          refMonth,
          refYear,
          fiscalYearEndMonth,
          projectionYears,
        )
        actualBase = trend[Math.max(0, forecastActualCols - 1)] ?? trend[0] ?? 0
      }
      peers.push({ rowId, linkCode: linkCode || rowId, actualBase })
    }
    return peers
  }, [
    capexAlignedStructure,
    displayStructure,
    fiscalYearEndMonth,
    forecastActualCols,
    forecastActualLayoutEffective,
    isHypothesisSection,
    periods,
    projectionYears,
    refMonth,
    refYear,
    seriesRows,
    statementStructure,
  ])

  /**
   * CA pour comptes clients / stocks % REV : colonnes bilan = index d’affichage,
   * totaux Hypothèses Revenus = index config.
   */
  const getComptesClientsRevenue = useCallback(
    (displayYearIndex: number) => {
      const cfg = forecastDisplayToConfigYearIndex(displayYearIndex, forecastActualCols)
      if (cfg == null) return lastActualRevenue
      return revenueForComptesClientsYear(cfg, projectedRevenueYearTotals, lastActualRevenue)
    },
    [forecastActualCols, lastActualRevenue, projectedRevenueYearTotals],
  )

  /** CMV projeté (Hyp. Dépenses) pour délai stocks / créditeurs ; sans hyp. → 0 $ (jamais inventé). */
  const getStocksCmv = useCallback(
    (displayYearIndex: number) => {
      const cfg = forecastDisplayToConfigYearIndex(displayYearIndex, forecastActualCols)
      if (cfg == null) return lastActualCmv
      if (cfg <= 0) {
        const base = projectedCmvYearTotals?.[0]
        return typeof base === "number" && Number.isFinite(base) ? base : lastActualCmv
      }
      const projected = projectedCmvYearTotals?.[cfg]
      return typeof projected === "number" && Number.isFinite(projected) ? projected : 0
    },
    [forecastActualCols, lastActualCmv, projectedCmvYearTotals],
  )

  useEffect(() => {
    if (!hypothesisRowId || draftAdjustmentId) return
    if (
      isComptesClientsBilanRow({
        rowId: hypothesisRowId,
        linkCode: hypothesisLinkCode,
        label: hypothesisRowLabel,
      })
    ) {
      const driver = draftType === "revenuePercent" ? "revenuePercent" : "collectionDays"
      const next = lastHistoryDriverValue(comptesClientsHistory, driver)
      if (next === 0) return
      setDraftValue((prev) => (prev === 0 ? next : prev))
      return
    }
    if (
      isStocksBilanRow({
        rowId: hypothesisRowId,
        linkCode: hypothesisLinkCode,
        label: hypothesisRowLabel,
      })
    ) {
      const driver = draftType === "revenuePercent" ? "revenuePercent" : "inventoryDays"
      const next = lastStocksHistoryDriverValue(stocksHistory, driver)
      if (next === 0) return
      setDraftValue((prev) => (prev === 0 ? next : prev))
      return
    }
    if (
      isCrediteursLikeBilanRow({
        rowId: hypothesisRowId,
        linkCode: hypothesisLinkCode,
        label: hypothesisRowLabel,
      })
    ) {
      const driver = draftType === "revenuePercent" ? "revenuePercent" : "paymentDays"
      const next = lastCrediteursHistoryDriverValue(crediteursHistory, driver)
      if (next === 0) return
      setDraftValue((prev) => (prev === 0 ? next : prev))
      return
    }
    if (
      !isOtherActBilanRow({
        rowId: hypothesisRowId,
        linkCode: hypothesisLinkCode,
        label: hypothesisRowLabel,
      })
    ) {
      return
    }
    if (draftType !== "revenuePercent") return
    const next = lastActRevenuePercentHistoryValue(otherActHistory)
    if (next === 0) return
    setDraftValue((prev) => (prev === 0 ? next : prev))
  }, [
    comptesClientsHistory,
    crediteursHistory,
    draftAdjustmentId,
    draftType,
    hypothesisLinkCode,
    hypothesisRowId,
    hypothesisRowLabel,
    otherActHistory,
    stocksHistory,
  ])

  const endingCashTrend = useMemo(() => {
    if (!isHypothesisSection) return undefined
    const variationByYear = Array.from({ length: forecastYearColumnCount }, () => 0)
    if (cashFlowStructure?.length && cashFlowSeriesRows.length && cashFlowPeriods.length) {
      const variationSr = cashFlowStructure.find(isCashFlowNetVariationStructureRow)
      if (variationSr) {
        const used = new Set<number>()
        const usedNested = new Set<string>()
        const variationRow = findStatementApiRowForStructureRow(
          variationSr,
          cashFlowSeriesRows,
          used,
          usedNested,
        )
        if (variationRow) {
          variationByYear[0] = yearTrendFromReference(variationRow, cashFlowPeriods, refYear, 1)[0] || 0
        }
      }
    }
    const netByPeriod = seriesRows.length ? buildNetCashByPeriodKey(seriesRows) : new Map<string, number>()
    const beginningActual =
      netByPeriod.get(periodKey(refYear - 1, refMonth)) ?? netByPeriod.get(periodKey(refYear, refMonth)) ?? 0
    return buildForecastEndingCashTrend(beginningActual, variationByYear)
  }, [
    isHypothesisSection,
    forecastYearColumnCount,
    cashFlowStructure,
    cashFlowSeriesRows,
    cashFlowPeriods,
    seriesRows,
    refYear,
    refMonth,
  ])

  const getBilanDisplayValue = (
    rowId: string | undefined,
    trend: number[] | undefined,
    yearIndex: number,
    fallback: number,
    rowLabel?: string,
    linkCode?: string | null,
    opts?: { isSubtotal?: boolean },
  ) => {
    if (!trend) return fallback
    if (!isHypothesisSection || !rowId) return trend[yearIndex] ?? fallback
    // N-1 / YTD : soldes série (comme le Bilan Sommaire), pas les drivers projetés.
    if (!isForecastProjectedDisplayColumn(yearIndex, forecastActualCols)) {
      return trend[yearIndex] ?? fallback
    }
    // Capex / Financement avant sous-totaux (feuilles souvent absentes du Sommaire).
    if (isCapexDrivenBilanRow({ rowId, linkCode })) {
      const cfg = forecastDisplayToConfigYearIndex(yearIndex, forecastActualCols)
      if (cfg == null) return trend[yearIndex] ?? fallback
      return resolveCapexBilanProjectedAmount(
        rowId,
        linkCode,
        cfg,
        trend[Math.max(0, forecastActualCols - 1)] ?? trend[0] ?? fallback,
        capexPeerRows,
      )
    }
    if (isFinancingDrivenBilanRow({ rowId, linkCode })) {
      const cfg = forecastDisplayToConfigYearIndex(yearIndex, forecastActualCols)
      if (cfg == null) return trend[yearIndex] ?? fallback
      return resolveFinancingBilanProjectedAmount(
        rowId,
        linkCode,
        cfg,
        trend[Math.max(0, forecastActualCols - 1)] ?? trend[0] ?? fallback,
      )
    }
    // Sous-totaux : montant déjà recalculé (somme liaison / formule / postes).
    if (opts?.isSubtotal) return trend[yearIndex] ?? fallback
    if (isTreasuryEndingCashDrivenBilanRow({ rowId, linkCode, label: rowLabel })) {
      return resolveTreasuryLineFromEndingCash(
        trend[0] ?? fallback,
        endingCashTrend,
        yearIndex,
      )
    }
    if (isComptesClientsBilanRow({ rowId, linkCode, label: rowLabel })) {
      return resolveComptesClientsProjectedValue(
        trend,
        yearIndex,
        bilanAdjustments[rowId] ?? [],
        getComptesClientsRevenue(yearIndex),
      )
    }
    if (isStocksBilanRow({ rowId, linkCode, label: rowLabel })) {
      return resolveStocksProjectedValue(
        trend,
        yearIndex,
        bilanAdjustments[rowId] ?? [],
        getStocksCmv(yearIndex),
        getComptesClientsRevenue(yearIndex),
      )
    }
    if (isCrediteursLikeBilanRow({ rowId, linkCode, label: rowLabel })) {
      return resolveCrediteursProjectedValue(
        trend,
        yearIndex,
        bilanAdjustments[rowId] ?? [],
        getStocksCmv(yearIndex),
        getComptesClientsRevenue(yearIndex),
      )
    }
    if (isOtherActBilanRow({ rowId, linkCode, label: rowLabel })) {
      return resolveOtherActProjectedValue(
        trend,
        yearIndex,
        bilanAdjustments[rowId] ?? [],
        getComptesClientsRevenue(yearIndex),
      )
    }
    return resolveBilanAdjustedValue(trend, yearIndex, bilanAdjustments[rowId] ?? [])
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

  const openOrToggleLineAnalysis = useCallback((snapshot: BalanceSheetLineAnalysisSnapshot) => {
    setLineAnalysis((prev) => (prev?.rowId === snapshot.rowId ? null : snapshot))
  }, [])

  const listDisplayedStructureRows = (structure: Record<string, unknown>[]) =>
    isHypothesisSection
      ? listStructureRowsForPresentationDisplay(structure)
      : listStructureRowsForDetailDisplay(structure)

  const mapStructureRowToDetailRow = (
    sr: Record<string, unknown>,
    row: FinancialStatementRow | undefined
  ): DetailRow => {
    if (isHypothesisSection) {
      const flaggedSection = row?.isSection ?? sr.isSection === true
      const isResult = row?.isResult ?? sr.isResult === true
      const isBold = row?.isBold ?? sr.isBold === true
      const hasFormula = Array.isArray(sr.formula) && sr.formula.length > 0
      const label = String(sr.label ?? row?.label ?? "")
      const linkCode = structureRowEffectiveLinkCode(sr) || undefined
      const hasLiaisonCode = row?.hasLiaisonCode ?? structureRowHasLiaisonCode(sr)
      const liaisonMode = String(sr.liaisonMode ?? "").trim() || undefined
      const liaisonSumCodes = Array.isArray(sr.liaisonSumCodes)
        ? sr.liaisonSumCodes.map((c) => String(c ?? "").trim()).filter(Boolean)
        : undefined
      const formula = hasFormula
        ? (sr.formula as unknown[]).map((c) => String(c ?? "").trim()).filter(Boolean)
        : undefined
      const isSubtotal =
        isHypothesisBilanSubtotalRow({
          label,
          isSection: flaggedSection,
          isResult,
          isBold,
          hasFormula,
          hasLiaisonCode,
          linkCode,
        }) ||
        (liaisonMode === "sum" && (liaisonSumCodes?.length ?? 0) > 0) ||
        (formula?.length ?? 0) > 0
      const isSection =
        flaggedSection ||
        isHypothesisBilanSectionHeaderRow({
          label,
          isSection: flaggedSection,
          isSubtotal,
          hasLiaisonCode,
          linkCode,
        })
      return {
        label,
        statementLabel: row?.label ?? String(sr.linkCode ?? sr.label ?? ""),
        current: row?.current ?? 0,
        prior: row?.prior ?? 0,
        indent: indentForSummaryRow({
          isBold,
          isSection,
          isResult,
          indent: typeof sr.indent === "boolean" ? sr.indent : row?.indent,
        }),
        isBold,
        isSubtotal,
        isSection,
        separatorAbove: isTruthySeparatorAbove(sr.separatorAbove ?? row?.separatorAbove),
        rowId: row?.id ?? String(sr.linkCode ?? sr.id ?? ""),
        linkCode,
        hasLiaisonCode,
        formula,
        liaisonMode,
        liaisonSumCodes,
      }
    }
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
      linkCode: structureRowEffectiveLinkCode(sr) || undefined,
      hasLiaisonCode: row?.hasLiaisonCode ?? structureRowHasLiaisonCode(sr),
    })
  }

  const mapBackendRowsDefinedOnly = (apiRows: FinancialStatementRow[], structure: Record<string, unknown>[]): DetailRow[] => {
    const used = new Set<number>()
    const usedNested = new Set<string>()
    const displayedRows = listDisplayedStructureRows(structure)
    const fromStructure = displayedRows.map((sr) => {
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
    const lastAmount = trend[0] || 0
    const priorAmount = trend.length >= 2 ? trend[1] || 0 : 0
    if (isHypothesisSection) {
      const flaggedSection = row?.isSection ?? sr.isSection === true
      const isResult = row?.isResult ?? sr.isResult === true
      const isBold = row?.isBold ?? sr.isBold === true
      const hasFormula = Array.isArray(sr.formula) && sr.formula.length > 0
      const label = String(sr.label ?? row?.label ?? "")
      const linkCode = structureRowEffectiveLinkCode(sr) || undefined
      const hasLiaisonCode = row?.hasLiaisonCode ?? structureRowHasLiaisonCode(sr)
      const liaisonMode = String(sr.liaisonMode ?? "").trim() || undefined
      const liaisonSumCodes = Array.isArray(sr.liaisonSumCodes)
        ? sr.liaisonSumCodes.map((c) => String(c ?? "").trim()).filter(Boolean)
        : undefined
      const formula = hasFormula
        ? (sr.formula as unknown[]).map((c) => String(c ?? "").trim()).filter(Boolean)
        : undefined
      const isSubtotal =
        isHypothesisBilanSubtotalRow({
          label,
          isSection: flaggedSection,
          isResult,
          isBold,
          hasFormula,
          hasLiaisonCode,
          linkCode,
        }) ||
        (liaisonMode === "sum" && (liaisonSumCodes?.length ?? 0) > 0) ||
        (formula?.length ?? 0) > 0
      const isSection =
        flaggedSection ||
        isHypothesisBilanSectionHeaderRow({
          label,
          isSection: flaggedSection,
          isSubtotal,
          hasLiaisonCode,
          linkCode,
        })
      return {
        label,
        statementLabel: row?.label ?? String(sr.linkCode ?? sr.label ?? ""),
        current: lastAmount,
        prior: priorAmount,
        isBold,
        isSection,
        isSubtotal,
        separatorAbove: isTruthySeparatorAbove(sr.separatorAbove ?? row?.separatorAbove),
        indent: indentForSummaryRow({
          isBold,
          isSection,
          isResult,
          indent: typeof sr.indent === "boolean" ? sr.indent : row?.indent,
        }),
        trendValues: isSection ? undefined : trend,
        rowId: row?.id ?? String(sr.linkCode ?? sr.id ?? ""),
        linkCode,
        hasLiaisonCode,
        formula,
        liaisonMode,
        liaisonSumCodes,
      }
    }
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
      linkCode: structureRowEffectiveLinkCode(sr) || undefined,
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
    const displayedRows = listDisplayedStructureRows(structure)
    return displayedRows.map((sr) => {
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
    const emptyTrendLength = balanceSheetQuarterTrendForBasis(
      seriesRows[0],
      periods as SeriesPeriod[],
      refMonth,
      refYear,
      periodBasis,
      fiscalYearEndMonth,
      STATEMENT_QUARTER_COUNT,
    ).length
    return mapSeriesRowsDefinedOnly(
      seriesRows,
      displayStructure,
      (row) =>
        balanceSheetQuarterTrendForBasis(
          row,
          periods as SeriesPeriod[],
          refMonth,
          refYear,
          periodBasis,
          fiscalYearEndMonth,
          STATEMENT_QUARTER_COUNT,
        ),
      emptyTrendLength
    )
  }

  const getSeriesYearRows = (): DetailRow[] => {
    if (!displayStructure) return []
    if (isForecastSection && forecastUseSeriesActuals) {
      const buildYearTrend = (row: SeriesRow) => {
        if (!seriesRows.length || !periods.length) {
          return Array.from({ length: forecastYearColumnCount }, () => 0)
        }
        return forecastBalanceSheetYearTrend(
          forecastActualLayout,
          row,
          periods as SeriesPeriod[],
          refMonth,
          refYear,
          fiscalYearEndMonth,
          projectionYears,
        )
      }
      return mapSeriesRowsDefinedOnly(seriesRows, displayStructure, buildYearTrend, forecastYearColumnCount)
    }
    if (!seriesRows.length || !periods.length) return []
    return mapSeriesRowsDefinedOnly(
      seriesRows,
      displayStructure,
      (row) =>
        balanceSheetYearTrendForBasis(
          row,
          periods as SeriesPeriod[],
          refMonth,
          refYear,
          periodBasis,
          fiscalYearEndMonth,
          PERFORMANCE_CHART_YEAR_COUNT,
        ),
      balanceSheetYearTrendForBasis(
        seriesRows[0],
        periods as SeriesPeriod[],
        refMonth,
        refYear,
        periodBasis,
        fiscalYearEndMonth,
        PERFORMANCE_CHART_YEAR_COUNT,
      ).length,
    )
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

  if (isHypothesisSection) {
    data = recomputeBilanHypothesisSubtotalTrends(data, (row, yearIndex) =>
      getBilanDisplayValue(
        row.rowId,
        row.trendValues,
        yearIndex,
        row.trendValues?.[yearIndex] ?? 0,
        row.label,
        row.linkCode,
        { isSubtotal: row.isSubtotal },
      ),
    )
  }

  const shouldHideZeroDetailRows =
    !isStructureStudio &&
    !isHypothesisSection &&
    (title === "Détail" || title === "Bilan pro forma") &&
    !!(displayStructure?.length ?? statementStructure?.length)
  if (shouldHideZeroDetailRows) {
    data = filterBalanceSheetDetailRowsForHorizon(
      data,
      displayStructure ?? statementStructure ?? [],
      view as IncomeStatementHorizonView
    )
  }

  if (!isStructureStudio && !isHypothesisSection) {
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
      setEntityDataLoading(false)
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
      setEntityDataLoading(false)
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
    else if (view === "years") parts.push("5 dernières années")

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
    return statementQuarterLabelsForBasis(
      refMonth,
      refYear,
      periodBasis,
      fiscalYearEndMonth,
      STATEMENT_QUARTER_COUNT,
    )
  }

  // Helper function to generate year labels from series data or fallback
  const getYearLabels = (): string[] => {
    if (isForecastSection) {
      const baseYear = forecastBaseYear ?? refYear ?? new Date().getFullYear()
      return forecastYearLabelsForLayout(
        forecastActualLayoutEffective,
        baseYear,
        projectionYears,
        refMonth,
        refYear,
        fiscalYearEndMonth,
      )
    }
    return statementYearLabelsForBasis(
      refMonth,
      refYear,
      periodBasis,
      fiscalYearEndMonth,
      PERFORMANCE_CHART_YEAR_COUNT,
    )
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
        columnMode === "variationAmount" || columnMode === "variationPercent" ? 1 : 0
      detailTableColumnCount = 3 + extra
    }
  } else if (view === "12months") detailTableColumnCount = 1 + getMonthLabels().length
  else if (view === "quarters") detailTableColumnCount = 1 + getQuarterLabels().length
  else if (view === "years") detailTableColumnCount = 1 + getYearLabels().length

  const awaitingBalanceSheetStructure =
    !!companyId && statementStructure === null && (!isForecastSection || isHypothesisSection)

  const isDataLoading =
    awaitingBalanceSheetStructure ||
    loading ||
    (isMultiPeriod && seriesLoading && !isHypothesisSection) ||
    entityDataLoading

  if (isDataLoading) {
    return (
      <div className={cn("w-full", dashboardCardFrameStaticClass)}>
        <div className={dashboardCardRingClass} aria-hidden />
        <div className="relative">
          <div className={cn("px-6 py-5 sm:px-7", dashboardCardHeaderBarClass)}>
            <h2 className={cn("text-xl leading-tight", dashboardCardTitleClass)}>{title}</h2>
          </div>
          <div className="px-8 py-16 text-center">
            <div className="animate-pulse space-y-4">
              <div className="mx-auto h-4 w-1/3 rounded bg-slate-200"></div>
              <div className="mx-auto h-4 w-2/3 rounded bg-slate-200"></div>
              <div className="mx-auto h-4 w-1/2 rounded bg-slate-200"></div>
            </div>
            <p className={cn("mt-4 text-sm", dashboardCardBodyMutedClass)}>Chargement des données...</p>
          </div>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className={cn("w-full", dashboardCardFrameStaticClass)}>
        <div className={dashboardCardRingClass} aria-hidden />
        <div className="relative">
          <div className={cn("px-6 py-5 sm:px-7", dashboardCardHeaderBarClass)}>
            <h2 className={cn("text-xl leading-tight", dashboardCardTitleClass)}>{title}</h2>
          </div>
          <div className="px-8 py-16 text-center">
            <p className={cn("text-sm", dashboardCardBodyMutedClass)}>
              Aucune donnée disponible. Veuillez importer une balance de vérification et configurer la structure des états financiers.
            </p>
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
                  ) : null}
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
                  ) : null}
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
                        isForecastHistoricalColumn(idx) ? "bg-slate-50" : ""
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
              const isSectionHeaderRow = isHypothesisBilanSectionHeaderRow({
                label: row.label,
                isSection: row.isSection,
                isSubtotal: row.isSubtotal,
                hasLiaisonCode: row.hasLiaisonCode,
                linkCode: row.linkCode,
              })
              const shouldHideAmounts =
                isSpacer ||
                isSectionHeaderRow ||
                !!row.isAnnexPlaceholder ||
                !!row.isAnnexTitle
              const isEncaisseRow =
                !row.isSubtotal &&
                isEncaisseBilanRow({
                  rowId: row.rowId,
                  linkCode: row.linkCode,
                  label: row.label,
                })
              const isDecouvertRow =
                !row.isSubtotal &&
                isDecouvertBilanRow({
                  rowId: row.rowId,
                  linkCode: row.linkCode,
                  label: row.label,
                })
              const isTreasuryEndingCashRow = isEncaisseRow || isDecouvertRow
              const isCapexDrivenRow = isCapexDrivenBilanRow({
                rowId: row.rowId,
                linkCode: row.linkCode,
              })
              const isFinancingDrivenRow = isFinancingDrivenBilanRow({
                rowId: row.rowId,
                linkCode: row.linkCode,
              })
              const isExternalForecastDrivenRow = isCapexDrivenRow || isFinancingDrivenRow
              /** Hors Paramètres : libellé sous-total masqué (blanc) mais chiffres en noir. */
              const annexSubtotalDarkNumbers = !!row.isAnnexSubtotal
              const displayLabel = row.isSection ? capitalizeFirst(row.label) : row.label
              /** Séparateur : sous-total (Détail) ou separatorAbove (Sommaire). */
              const isSubtotalRow = !!row.isSubtotal || !!row.isAnnexSubtotal
              const showSeparatorAbove =
                isSubtotalRow || isTruthySeparatorAbove(row.separatorAbove)
              
              // Expansion GL : tout poste mappé avec ≥1 compte GL
              const matchedStructureRow =
                displayStructure && row.rowId
                  ? findStructureRowForStatementLine(
                      row.rowId,
                      row.statementLabel ?? row.label,
                      displayStructure
                    )
                  : undefined
              const canExpand =
                !disableRowInteractions &&
                !isHypothesisSection &&
                balanceSheetDetailCanExpandGlAccounts(
                  matchedStructureRow,
                  standardLinkCodes,
                  row,
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

              if (isHypothesisSection && hypothesisRowId && row.rowId !== hypothesisRowId) {
                return null
              }

              const isHypothesisSelected = isHypothesisSection && hypothesisRowId === row.rowId
              const isComptesClientsPanel = isComptesClientsBilanRow({
                rowId: row.rowId,
                linkCode: row.linkCode,
                label: row.label,
              })
              const isStocksPanel = isStocksBilanRow({
                rowId: row.rowId,
                linkCode: row.linkCode,
                label: row.label,
              })
              const isCrediteursPanel = isCrediteursLikeBilanRow({
                rowId: row.rowId,
                linkCode: row.linkCode,
                label: row.label,
              })
              const isOtherActPanel = isOtherActBilanRow({
                rowId: row.rowId,
                linkCode: row.linkCode,
                label: row.label,
              })
              const ccDriver = draftType === "revenuePercent" ? "revenuePercent" : "collectionDays"
              const stocksDriver =
                draftType === "revenuePercent" ? "revenuePercent" : "inventoryDays"
              const crediteursDriver =
                draftType === "revenuePercent" ? "revenuePercent" : "paymentDays"
              const otherActDriver = draftType === "revenuePercent" ? "revenuePercent" : "amount"
              const ccProjectedAmount = comptesClientsAmountFromDriver({
                type: ccDriver,
                value: draftValue,
                revenue: getComptesClientsRevenue(hypothesisYearIndex),
              })
              const stocksProjectedAmount = stocksAmountFromDriver({
                type: stocksDriver,
                value: draftValue,
                baseAmount:
                  stocksDriver === "inventoryDays"
                    ? getStocksCmv(hypothesisYearIndex)
                    : getComptesClientsRevenue(hypothesisYearIndex),
              })
              const crediteursProjectedAmount = crediteursAmountFromDriver({
                type: crediteursDriver,
                value: draftValue,
                baseAmount:
                  crediteursDriver === "paymentDays"
                    ? getStocksCmv(hypothesisYearIndex)
                    : getComptesClientsRevenue(hypothesisYearIndex),
              })
              const otherActProjectedAmount = comptesClientsAmountFromDriver({
                type: "revenuePercent",
                value: draftValue,
                revenue: getComptesClientsRevenue(hypothesisYearIndex),
              })
              const ccSelectedYearRevenue = getComptesClientsRevenue(hypothesisYearIndex)
              const stocksSelectedYearCmv = getStocksCmv(hypothesisYearIndex)
              const stocksSelectedYearRevenue = getComptesClientsRevenue(hypothesisYearIndex)
              const crediteursSelectedYearCmv = getStocksCmv(hypothesisYearIndex)
              const crediteursSelectedYearRevenue = getComptesClientsRevenue(hypothesisYearIndex)
              const otherActSelectedYearRevenue = getComptesClientsRevenue(hypothesisYearIndex)
              const ccSelectedYearLabel = getYearLabels()[hypothesisYearIndex]
              const ccLastHistoryYear = comptesClientsHistory[comptesClientsHistory.length - 1]
              const stocksLastHistoryYear = stocksHistory[stocksHistory.length - 1]
              const crediteursLastHistoryYear = crediteursHistory[crediteursHistory.length - 1]
              const otherActLastHistoryYear = otherActHistory[otherActHistory.length - 1]
              const ccAverageDays = averageHistoryMetric(comptesClientsHistory, "collectionDays")
              const ccAveragePercent = averageHistoryMetric(comptesClientsHistory, "revenuePercent")
              const stocksAverageDays = averageHistoryMetric(stocksHistory, "inventoryDays")
              const stocksAveragePercent = averageHistoryMetric(stocksHistory, "revenuePercent")
              const crediteursAverageDays = averageHistoryMetric(crediteursHistory, "paymentDays")
              const crediteursAveragePercent = averageHistoryMetric(crediteursHistory, "revenuePercent")
              const otherActAveragePercent = averageHistoryMetric(otherActHistory, "revenuePercent")
              const isDriverPanel =
                isComptesClientsPanel ||
                isStocksPanel ||
                isCrediteursPanel ||
                (isOtherActPanel && otherActDriver === "revenuePercent")

              return (
                <Fragment key={idx}>
                  {showSeparatorAbove && (
                    <tr aria-hidden data-testid="balance-sheet-detail-subtotal-separator">
                      <td
                        colSpan={detailTableColumnCount}
                        className={cn(
                          "border-0 p-0 align-top leading-none",
                          isSubtotalRow
                            ? "border-t-2 border-t-slate-900"
                            : "border-t border-t-slate-600",
                        )}
                      />
                    </tr>
                  )}
                  <tr
                    ref={row.rowId ? (el) => { analysisRowRefs.current[row.rowId!] = el } : undefined}
                    className={cn(
                    row.label === "" ? "h-2" : "",
                    "hover:[&>td]:bg-slate-50/90 hover:[&>td:first-child]:bg-slate-50/90",
                    canExpand && "cursor-pointer",
                    isHypothesisSelected && "bg-blue-50/35 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.28)]"
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
                            {isHypothesisSection && isTreasuryEndingCashRow && (
                              <span className="text-[11px] font-medium text-slate-400">
                                Trésorerie à la fin
                              </span>
                            )}
                            {isHypothesisSection && isCapexDrivenRow && (
                              <span className="text-[11px] font-medium text-slate-400">
                                Capex (Hypothèse Capex)
                              </span>
                            )}
                            {isHypothesisSection && isFinancingDrivenRow && (
                              <span className="text-[11px] font-medium text-slate-400">
                                Financement (Hypothèse Financement)
                              </span>
                            )}
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
                      ) : null}
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
                      ) : null}
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
                          {columnMode === "variationAmount" || columnMode === "variationPercent"
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
                          {columnMode === "variationAmount" || columnMode === "variationPercent"
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
                        const displayValue = getBilanDisplayValue(
                          row.rowId,
                          row.trendValues,
                          valueIdx,
                          value,
                          row.label,
                          row.linkCode,
                          { isSubtotal: row.isSubtotal },
                        )
                        const canAdjust =
                          isHypothesisSection &&
                          !!row.rowId &&
                          !shouldHideAmounts &&
                          !isSectionHeaderRow &&
                          !row.isSubtotal &&
                          isForecastProjectedDisplayColumn(valueIdx, forecastActualCols) &&
                          !isTreasuryEndingCashRow &&
                          !isExternalForecastDrivenRow
                        const formattedHypothesisAmount =
                          displayValue !== 0 ? formatCurrency(displayValue) : ""
                        return (
                          <td
                            key={valueIdx}
                            className={cn(
                              "px-4 py-3 text-right",
                              row.isBold && !isExpanded ? "font-semibold font-bold" : "font-normal text-slate-600",
                              shouldHideAmounts ? "text-white" : "",
                              annexSubtotalDarkNumbers ? "text-slate-900" : "",
                              isForecastHistoricalColumn(valueIdx) ? "bg-slate-50" : "",
                              canAdjust && "cursor-pointer hover:bg-slate-50/90",
                              isHypothesisSelected &&
                                hypothesisYearIndex === valueIdx &&
                                "z-[1] bg-blue-50/50 shadow-[inset_0_0_0_2px_rgb(59,130,246)]",
                            )}
                            onClick={(e) => {
                              if (!canAdjust || !row.rowId) return
                              e.stopPropagation()
                              openBilanHypothesisPanel(
                                row.rowId,
                                valueIdx,
                                displayLabel,
                                row.linkCode,
                                {
                                  isSection: row.isSection,
                                  isSubtotal: row.isSubtotal,
                                  hasLiaisonCode: row.hasLiaisonCode,
                                },
                              )
                            }}
                          >
                            {columnMode === "variationAmount" || columnMode === "variationPercent"
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
                                : isHypothesisSection
                                  ? shouldHideAmounts
                                    ? ""
                                    : formattedHypothesisAmount
                                  : displayValue !== 0
                                    ? formatCurrency(displayValue)
                                    : "-"}
                          </td>
                        )
                      })}
                    </>
                  )}
                  {/* Empty cells for spacer rows in trend views */}
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
                                : PERFORMANCE_CHART_YEAR_COUNT,
                      }).map((_, idx) => (
                          <td 
                            key={idx} 
                            className={cn(
                              "px-4 py-3 text-right font-semibold",
                              isHypothesisSection ? "text-transparent" : "text-white",
                              annexSubtotalDarkNumbers ? "text-slate-900" : "",
                              isForecastSection && view === "years" && isForecastHistoricalColumn(idx) ? "bg-slate-50" : ""
                            )}
                          >
                            {isHypothesisSection ? "" : "-"}
                          </td>
                      ))}
                    </>
                  )}
                </tr>
                  {isHypothesisSection && isHypothesisSelected && hypothesisRowId ? (
                    <tr className="border-b-2 border-blue-200/90 bg-slate-50/95">
                      <td colSpan={detailTableColumnCount} className="min-w-0 p-0 align-top">
                        <div className="min-w-0 max-w-full overflow-x-auto px-3 py-3 sm:px-5 sm:py-4">
                          <div className="min-w-0 max-w-full">
                            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                  Hypothèse
                                </p>
                                <h3 className="mt-3 text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl">
                                  {hypothesisRowLabel}
                                </h3>
                                <p className="mt-3 text-xs font-medium leading-relaxed text-blue-800">
                                  Année sélectionnée ·{" "}
                                  <span className="font-semibold text-blue-900">
                                    {getYearLabels()[hypothesisYearIndex] ?? hypothesisYearIndex}
                                  </span>
                                </p>
                              </div>
                              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-9 border-slate-200 text-xs font-medium text-slate-800 hover:bg-slate-50"
                                  onClick={saveBilanHypothesis}
                                >
                                  Enregistrer l&apos;ajustement
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="shrink-0 border-blue-200/90 text-xs font-medium text-blue-900 hover:bg-blue-50/90"
                                  onClick={closeBilanHypothesisPanel}
                                >
                                  Fermer
                                </Button>
                              </div>
                            </div>
                            <div
                              className={cn(
                                "mt-6 space-y-5",
                                !isDriverPanel &&
                                  "rounded-2xl border border-slate-200/90 bg-white/85 p-4 shadow-sm sm:p-5",
                              )}
                            >
                              {isComptesClientsPanel ? (
                                <>
                                  <div>
                                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                      Méthode
                                    </p>
                                    <Tabs
                                      value={ccDriver}
                                      onValueChange={(value) => {
                                        const next =
                                          value === "revenuePercent" ? "revenuePercent" : "collectionDays"
                                        setDraftType(next)
                                        setDraftValue(lastHistoryDriverValue(comptesClientsHistory, next))
                                      }}
                                    >
                                      <TabsList className="flex h-auto w-full max-w-xl flex-wrap gap-1 rounded-lg border border-slate-200/90 bg-slate-100/80 p-0.5 sm:inline-flex sm:w-fit">
                                        <TabsTrigger
                                          value="collectionDays"
                                          className="h-8 flex-1 rounded-md px-3 py-1 text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#2A2F3A] data-[state=active]:shadow-sm sm:flex-initial"
                                        >
                                          Délai de collection des clients
                                        </TabsTrigger>
                                        <TabsTrigger
                                          value="revenuePercent"
                                          className="h-8 flex-1 rounded-md px-3 py-1 text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#2A2F3A] data-[state=active]:shadow-sm sm:flex-initial"
                                        >
                                          % des revenus
                                        </TabsTrigger>
                                      </TabsList>
                                    </Tabs>
                                  </div>

                                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                    <div className="border-b border-slate-200 px-4 py-2.5 sm:px-5">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                        Exercices réels
                                      </p>
                                    </div>
                                    <table className="w-full min-w-[28rem] border-collapse text-sm">
                                      <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50/80">
                                          <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:px-5">
                                            Indicateur
                                          </th>
                                          {comptesClientsHistory.map((yearRow) => (
                                            <th
                                              key={yearRow.year}
                                              className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:px-5"
                                            >
                                              {yearRow.year}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(
                                          [
                                            {
                                              key: "collectionDays" as const,
                                              label: "Délai de collection des clients",
                                              unit: "jours",
                                            },
                                            {
                                              key: "revenuePercent" as const,
                                              label: "% des revenus",
                                              unit: "%",
                                            },
                                          ] as const
                                        ).map((metric) => {
                                          const selected = ccDriver === metric.key
                                          return (
                                            <tr
                                              key={metric.key}
                                              className={cn(
                                                "border-b border-slate-100",
                                                selected && "bg-[#E0742D]/[0.04]",
                                              )}
                                            >
                                              <th
                                                scope="row"
                                                className={cn(
                                                  "px-4 py-2.5 text-left font-medium sm:px-5",
                                                  selected ? "text-[#2A2F3A]" : "text-slate-600",
                                                )}
                                              >
                                                <span className="flex items-center gap-2">
                                                  {selected ? (
                                                    <span
                                                      className="h-4 w-0.5 shrink-0 rounded-full bg-[#E0742D]"
                                                      aria-hidden
                                                    />
                                                  ) : (
                                                    <span className="w-0.5 shrink-0" aria-hidden />
                                                  )}
                                                  {metric.label}
                                                </span>
                                              </th>
                                              {comptesClientsHistory.map((yearRow) => (
                                                <td
                                                  key={`${metric.key}-${yearRow.year}`}
                                                  data-testid={`cc-history-${metric.key}-${yearRow.year}`}
                                                  className={cn(
                                                    "px-4 py-2.5 text-right tabular-nums sm:px-5",
                                                    selected
                                                      ? "font-semibold text-[#2A2F3A]"
                                                      : "text-slate-700",
                                                  )}
                                                >
                                                  {formatComptesClientsHistoryNumber(
                                                    metric.key === "collectionDays"
                                                      ? yearRow.collectionDays
                                                      : yearRow.revenuePercent,
                                                  )}
                                                  <span className="ml-1 text-[11px] font-normal text-slate-400">
                                                    {metric.unit}
                                                  </span>
                                                </td>
                                              ))}
                                            </tr>
                                          )
                                        })}
                                        <tr className="border-b border-slate-100">
                                          <th
                                            scope="row"
                                            className="px-4 py-2.5 text-left font-medium text-slate-600 sm:px-5"
                                          >
                                            <span className="pl-2.5">Comptes clients</span>
                                          </th>
                                          {comptesClientsHistory.map((yearRow) => (
                                            <td
                                              key={`ar-${yearRow.year}`}
                                              className="px-4 py-2.5 text-right tabular-nums text-slate-700 sm:px-5"
                                            >
                                              {yearRow.ar ? formatCurrency(yearRow.ar) : "—"}
                                            </td>
                                          ))}
                                        </tr>
                                        <tr>
                                          <th
                                            scope="row"
                                            className="px-4 py-2.5 text-left font-medium text-slate-600 sm:px-5"
                                          >
                                            <span className="pl-2.5">Revenus</span>
                                          </th>
                                          {comptesClientsHistory.map((yearRow) => (
                                            <td
                                              key={`rev-${yearRow.year}`}
                                              className="px-4 py-2.5 text-right tabular-nums text-slate-700 sm:px-5"
                                            >
                                              {yearRow.revenue ? formatCurrency(yearRow.revenue) : "—"}
                                            </td>
                                          ))}
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>

                                  <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start">
                                    <div>
                                      <Label
                                        htmlFor="bilan-adj-value"
                                        className="mb-2 block text-sm font-medium text-slate-700"
                                      >
                                        {ccDriver === "revenuePercent"
                                          ? "% des revenus"
                                          : "Délai de collection (jours)"}
                                      </Label>
                                      <div className="relative">
                                        <Input
                                          id="bilan-adj-value"
                                          type="number"
                                          step={0.1}
                                          min={0}
                                          value={draftValue}
                                          onChange={(e) => setDraftValue(parseFloat(e.target.value) || 0)}
                                          className="h-11 pr-16 tabular-nums"
                                        />
                                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">
                                          {ccDriver === "revenuePercent" ? "%" : "jours"}
                                        </span>
                                      </div>
                                      <p className="mt-2 text-xs leading-relaxed text-slate-500">
                                        {ccLastHistoryYear
                                          ? `${ccLastHistoryYear.year} : ${formatComptesClientsHistoryNumber(
                                              ccDriver === "revenuePercent"
                                                ? ccLastHistoryYear.revenuePercent
                                                : ccLastHistoryYear.collectionDays,
                                            )} ${ccDriver === "revenuePercent" ? "%" : "jours"}`
                                          : null}
                                        {ccDriver === "revenuePercent" && ccAveragePercent != null
                                          ? ` · Moyenne 2 ans : ${formatComptesClientsHistoryNumber(ccAveragePercent)} %`
                                          : null}
                                        {ccDriver === "collectionDays" && ccAverageDays != null
                                          ? ` · Moyenne 2 ans : ${formatComptesClientsHistoryNumber(ccAverageDays)} jours`
                                          : null}
                                      </p>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 sm:px-5">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                        Comptes clients projetés
                                      </p>
                                      <p
                                        className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-[#2A2F3A]"
                                        data-testid="bilan-cc-projected-amount"
                                      >
                                        {ccSelectedYearRevenue ? formatCurrency(ccProjectedAmount) : "—"}
                                      </p>
                                      <p className="mt-2 text-xs leading-relaxed text-slate-500">
                                        {ccDriver === "revenuePercent"
                                          ? "CA × % des revenus"
                                          : "CA × délai / 365"}
                                        {ccSelectedYearLabel
                                          ? ` · CA ${isForecastProjectedDisplayColumn(hypothesisYearIndex, forecastActualCols) ? "projeté" : "réel"} : ${ccSelectedYearLabel} (${formatCurrency(ccSelectedYearRevenue)})`
                                          : " · CA projeté de l'année"}
                                      </p>
                                    </div>
                                  </div>
                                </>
                              ) : isStocksPanel ? (
                                <>
                                  <div>
                                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                      Méthode
                                    </p>
                                    <Tabs
                                      value={stocksDriver}
                                      onValueChange={(value) => {
                                        const next =
                                          value === "revenuePercent" ? "revenuePercent" : "inventoryDays"
                                        setDraftType(next)
                                        setDraftValue(lastStocksHistoryDriverValue(stocksHistory, next))
                                      }}
                                    >
                                      <TabsList className="flex h-auto w-full max-w-xl flex-wrap gap-1 rounded-lg border border-slate-200/90 bg-slate-100/80 p-0.5 sm:inline-flex sm:w-fit">
                                        <TabsTrigger
                                          value="inventoryDays"
                                          className="h-8 flex-1 rounded-md px-3 py-1 text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#2A2F3A] data-[state=active]:shadow-sm sm:flex-initial"
                                        >
                                          Délai de rotation des stocks
                                        </TabsTrigger>
                                        <TabsTrigger
                                          value="revenuePercent"
                                          className="h-8 flex-1 rounded-md px-3 py-1 text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#2A2F3A] data-[state=active]:shadow-sm sm:flex-initial"
                                        >
                                          Stocks en % des revenus
                                        </TabsTrigger>
                                      </TabsList>
                                    </Tabs>
                                  </div>

                                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                    <div className="border-b border-slate-200 px-4 py-2.5 sm:px-5">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                        Exercices réels
                                      </p>
                                    </div>
                                    <table className="w-full min-w-[28rem] border-collapse text-sm">
                                      <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50/80">
                                          <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:px-5">
                                            Indicateur
                                          </th>
                                          {stocksHistory.map((yearRow) => (
                                            <th
                                              key={yearRow.year}
                                              className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:px-5"
                                            >
                                              {yearRow.year}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(
                                          [
                                            {
                                              key: "inventoryDays" as const,
                                              label: "Délai de rotation des stocks",
                                              unit: "jours",
                                            },
                                            {
                                              key: "revenuePercent" as const,
                                              label: "Stocks en % des revenus",
                                              unit: "%",
                                            },
                                          ] as const
                                        ).map((metric) => {
                                          const selected = stocksDriver === metric.key
                                          return (
                                            <tr
                                              key={metric.key}
                                              className={cn(
                                                "border-b border-slate-100",
                                                selected && "bg-[#E0742D]/[0.04]",
                                              )}
                                            >
                                              <th
                                                scope="row"
                                                className={cn(
                                                  "px-4 py-2.5 text-left font-medium sm:px-5",
                                                  selected ? "text-[#2A2F3A]" : "text-slate-600",
                                                )}
                                              >
                                                <span className="flex items-center gap-2">
                                                  {selected ? (
                                                    <span
                                                      className="h-4 w-0.5 shrink-0 rounded-full bg-[#E0742D]"
                                                      aria-hidden
                                                    />
                                                  ) : (
                                                    <span className="w-0.5 shrink-0" aria-hidden />
                                                  )}
                                                  {metric.label}
                                                </span>
                                              </th>
                                              {stocksHistory.map((yearRow) => (
                                                <td
                                                  key={`${metric.key}-${yearRow.year}`}
                                                  data-testid={`stocks-history-${metric.key}-${yearRow.year}`}
                                                  className={cn(
                                                    "px-4 py-2.5 text-right tabular-nums sm:px-5",
                                                    selected
                                                      ? "font-semibold text-[#2A2F3A]"
                                                      : "text-slate-700",
                                                  )}
                                                >
                                                  {formatComptesClientsHistoryNumber(
                                                    metric.key === "inventoryDays"
                                                      ? yearRow.inventoryDays
                                                      : yearRow.revenuePercent,
                                                  )}
                                                  <span className="ml-1 text-[11px] font-normal text-slate-400">
                                                    {metric.unit}
                                                  </span>
                                                </td>
                                              ))}
                                            </tr>
                                          )
                                        })}
                                        <tr className="border-b border-slate-100">
                                          <th
                                            scope="row"
                                            className="px-4 py-2.5 text-left font-medium text-slate-600 sm:px-5"
                                          >
                                            <span className="pl-2.5">Stocks</span>
                                          </th>
                                          {stocksHistory.map((yearRow) => (
                                            <td
                                              key={`st-${yearRow.year}`}
                                              className="px-4 py-2.5 text-right tabular-nums text-slate-700 sm:px-5"
                                            >
                                              {yearRow.stocks ? formatCurrency(yearRow.stocks) : "—"}
                                            </td>
                                          ))}
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                          <th
                                            scope="row"
                                            className="px-4 py-2.5 text-left font-medium text-slate-600 sm:px-5"
                                          >
                                            <span className="pl-2.5">CMV</span>
                                          </th>
                                          {stocksHistory.map((yearRow) => (
                                            <td
                                              key={`cmv-${yearRow.year}`}
                                              className="px-4 py-2.5 text-right tabular-nums text-slate-700 sm:px-5"
                                            >
                                              {yearRow.cmv ? formatCurrency(yearRow.cmv) : "—"}
                                            </td>
                                          ))}
                                        </tr>
                                        <tr>
                                          <th
                                            scope="row"
                                            className="px-4 py-2.5 text-left font-medium text-slate-600 sm:px-5"
                                          >
                                            <span className="pl-2.5">Revenus</span>
                                          </th>
                                          {stocksHistory.map((yearRow) => (
                                            <td
                                              key={`rev-${yearRow.year}`}
                                              className="px-4 py-2.5 text-right tabular-nums text-slate-700 sm:px-5"
                                            >
                                              {yearRow.revenue ? formatCurrency(yearRow.revenue) : "—"}
                                            </td>
                                          ))}
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>

                                  <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start">
                                    <div>
                                      <Label
                                        htmlFor="bilan-adj-value"
                                        className="mb-2 block text-sm font-medium text-slate-700"
                                      >
                                        {stocksDriver === "revenuePercent"
                                          ? "Stocks en % des revenus"
                                          : "Délai de rotation (jours)"}
                                      </Label>
                                      <div className="relative">
                                        <Input
                                          id="bilan-adj-value"
                                          type="number"
                                          step={0.1}
                                          min={0}
                                          value={draftValue}
                                          onChange={(e) => setDraftValue(parseFloat(e.target.value) || 0)}
                                          className="h-11 pr-16 tabular-nums"
                                        />
                                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">
                                          {stocksDriver === "revenuePercent" ? "%" : "jours"}
                                        </span>
                                      </div>
                                      <p className="mt-2 text-xs leading-relaxed text-slate-500">
                                        {stocksLastHistoryYear
                                          ? `${stocksLastHistoryYear.year} : ${formatComptesClientsHistoryNumber(
                                              stocksDriver === "revenuePercent"
                                                ? stocksLastHistoryYear.revenuePercent
                                                : stocksLastHistoryYear.inventoryDays,
                                            )} ${stocksDriver === "revenuePercent" ? "%" : "jours"}`
                                          : null}
                                        {stocksDriver === "revenuePercent" && stocksAveragePercent != null
                                          ? ` · Moyenne 2 ans : ${formatComptesClientsHistoryNumber(stocksAveragePercent)} %`
                                          : null}
                                        {stocksDriver === "inventoryDays" && stocksAverageDays != null
                                          ? ` · Moyenne 2 ans : ${formatComptesClientsHistoryNumber(stocksAverageDays)} jours`
                                          : null}
                                      </p>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 sm:px-5">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                        Stocks projetés
                                      </p>
                                      <p
                                        className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-[#2A2F3A]"
                                        data-testid="bilan-stocks-projected-amount"
                                      >
                                        {(stocksDriver === "inventoryDays"
                                          ? stocksSelectedYearCmv
                                          : stocksSelectedYearRevenue)
                                          ? formatCurrency(stocksProjectedAmount)
                                          : "—"}
                                      </p>
                                      <p className="mt-2 text-xs leading-relaxed text-slate-500">
                                        {stocksDriver === "revenuePercent"
                                          ? "CA × % des revenus"
                                          : "CMV × délai / 365"}
                                        {ccSelectedYearLabel
                                          ? stocksDriver === "inventoryDays"
                                            ? ` · CMV projeté : ${formatCurrency(stocksSelectedYearCmv)}`
                                            : ` · CA ${isForecastProjectedDisplayColumn(hypothesisYearIndex, forecastActualCols) ? "projeté" : "réel"} : ${ccSelectedYearLabel} (${formatCurrency(stocksSelectedYearRevenue)})`
                                          : stocksDriver === "inventoryDays"
                                            ? " · CMV de l'année"
                                            : " · CA projeté de l'année"}
                                      </p>
                                    </div>
                                  </div>
                                </>
                              ) : isCrediteursPanel ? (
                                <>
                                  <div>
                                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                      Méthode
                                    </p>
                                    <Tabs
                                      value={crediteursDriver}
                                      onValueChange={(value) => {
                                        const next =
                                          value === "revenuePercent" ? "revenuePercent" : "paymentDays"
                                        setDraftType(next)
                                        setDraftValue(lastCrediteursHistoryDriverValue(crediteursHistory, next))
                                      }}
                                    >
                                      <TabsList className="flex h-auto w-full max-w-xl flex-wrap gap-1 rounded-lg border border-slate-200/90 bg-slate-100/80 p-0.5 sm:inline-flex sm:w-fit">
                                        <TabsTrigger
                                          value="paymentDays"
                                          className="h-8 flex-1 rounded-md px-3 py-1 text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#2A2F3A] data-[state=active]:shadow-sm sm:flex-initial"
                                        >
                                          Délai de paiement des créditeurs
                                        </TabsTrigger>
                                        <TabsTrigger
                                          value="revenuePercent"
                                          className="h-8 flex-1 rounded-md px-3 py-1 text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#2A2F3A] data-[state=active]:shadow-sm sm:flex-initial"
                                        >
                                          % des revenus
                                        </TabsTrigger>
                                      </TabsList>
                                    </Tabs>
                                  </div>

                                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                    <div className="border-b border-slate-200 px-4 py-2.5 sm:px-5">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                        Exercices réels
                                      </p>
                                    </div>
                                    <table className="w-full min-w-[28rem] border-collapse text-sm">
                                      <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50/80">
                                          <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:px-5">
                                            Indicateur
                                          </th>
                                          {crediteursHistory.map((yearRow) => (
                                            <th
                                              key={yearRow.year}
                                              className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:px-5"
                                            >
                                              {yearRow.year}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(
                                          [
                                            {
                                              key: "paymentDays" as const,
                                              label: "Délai de paiement des créditeurs",
                                              unit: "jours",
                                            },
                                            {
                                              key: "revenuePercent" as const,
                                              label: "% des revenus",
                                              unit: "%",
                                            },
                                          ] as const
                                        ).map((metric) => {
                                          const selected = crediteursDriver === metric.key
                                          return (
                                            <tr
                                              key={metric.key}
                                              className={cn(
                                                "border-b border-slate-100",
                                                selected && "bg-[#E0742D]/[0.04]",
                                              )}
                                            >
                                              <th
                                                scope="row"
                                                className={cn(
                                                  "px-4 py-2.5 text-left font-medium sm:px-5",
                                                  selected ? "text-[#2A2F3A]" : "text-slate-600",
                                                )}
                                              >
                                                <span className="flex items-center gap-2">
                                                  {selected ? (
                                                    <span
                                                      className="h-4 w-0.5 shrink-0 rounded-full bg-[#E0742D]"
                                                      aria-hidden
                                                    />
                                                  ) : (
                                                    <span className="w-0.5 shrink-0" aria-hidden />
                                                  )}
                                                  {metric.label}
                                                </span>
                                              </th>
                                              {crediteursHistory.map((yearRow) => (
                                                <td
                                                  key={`${metric.key}-${yearRow.year}`}
                                                  data-testid={`crediteurs-history-${metric.key}-${yearRow.year}`}
                                                  className={cn(
                                                    "px-4 py-2.5 text-right tabular-nums sm:px-5",
                                                    selected
                                                      ? "font-semibold text-[#2A2F3A]"
                                                      : "text-slate-700",
                                                  )}
                                                >
                                                  {formatComptesClientsHistoryNumber(
                                                    metric.key === "paymentDays"
                                                      ? yearRow.paymentDays
                                                      : yearRow.revenuePercent,
                                                  )}
                                                  <span className="ml-1 text-[11px] font-normal text-slate-400">
                                                    {metric.unit}
                                                  </span>
                                                </td>
                                              ))}
                                            </tr>
                                          )
                                        })}
                                        <tr className="border-b border-slate-100">
                                          <th
                                            scope="row"
                                            className="px-4 py-2.5 text-left font-medium text-slate-600 sm:px-5"
                                          >
                                            <span className="pl-2.5">Créditeurs</span>
                                          </th>
                                          {crediteursHistory.map((yearRow) => (
                                            <td
                                              key={`ap-${yearRow.year}`}
                                              className="px-4 py-2.5 text-right tabular-nums text-slate-700 sm:px-5"
                                            >
                                              {yearRow.ap ? formatCurrency(yearRow.ap) : "—"}
                                            </td>
                                          ))}
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                          <th
                                            scope="row"
                                            className="px-4 py-2.5 text-left font-medium text-slate-600 sm:px-5"
                                          >
                                            <span className="pl-2.5">CMV</span>
                                          </th>
                                          {crediteursHistory.map((yearRow) => (
                                            <td
                                              key={`cmv-${yearRow.year}`}
                                              className="px-4 py-2.5 text-right tabular-nums text-slate-700 sm:px-5"
                                            >
                                              {yearRow.cmv ? formatCurrency(yearRow.cmv) : "—"}
                                            </td>
                                          ))}
                                        </tr>
                                        <tr>
                                          <th
                                            scope="row"
                                            className="px-4 py-2.5 text-left font-medium text-slate-600 sm:px-5"
                                          >
                                            <span className="pl-2.5">Revenus</span>
                                          </th>
                                          {crediteursHistory.map((yearRow) => (
                                            <td
                                              key={`rev-${yearRow.year}`}
                                              className="px-4 py-2.5 text-right tabular-nums text-slate-700 sm:px-5"
                                            >
                                              {yearRow.revenue ? formatCurrency(yearRow.revenue) : "—"}
                                            </td>
                                          ))}
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>

                                  <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start">
                                    <div>
                                      <Label
                                        htmlFor="bilan-adj-value"
                                        className="mb-2 block text-sm font-medium text-slate-700"
                                      >
                                        {crediteursDriver === "revenuePercent"
                                          ? "% des revenus"
                                          : "Délai de paiement (jours)"}
                                      </Label>
                                      <div className="relative">
                                        <Input
                                          id="bilan-adj-value"
                                          type="number"
                                          step={0.1}
                                          min={0}
                                          value={draftValue}
                                          onChange={(e) => setDraftValue(parseFloat(e.target.value) || 0)}
                                          className="h-11 pr-16 tabular-nums"
                                        />
                                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">
                                          {crediteursDriver === "revenuePercent" ? "%" : "jours"}
                                        </span>
                                      </div>
                                      <p className="mt-2 text-xs leading-relaxed text-slate-500">
                                        {crediteursLastHistoryYear
                                          ? `${crediteursLastHistoryYear.year} : ${formatComptesClientsHistoryNumber(
                                              crediteursDriver === "revenuePercent"
                                                ? crediteursLastHistoryYear.revenuePercent
                                                : crediteursLastHistoryYear.paymentDays,
                                            )} ${crediteursDriver === "revenuePercent" ? "%" : "jours"}`
                                          : null}
                                        {crediteursDriver === "revenuePercent" &&
                                        crediteursAveragePercent != null
                                          ? ` · Moyenne 2 ans : ${formatComptesClientsHistoryNumber(crediteursAveragePercent)} %`
                                          : null}
                                        {crediteursDriver === "paymentDays" &&
                                        crediteursAverageDays != null
                                          ? ` · Moyenne 2 ans : ${formatComptesClientsHistoryNumber(crediteursAverageDays)} jours`
                                          : null}
                                      </p>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 sm:px-5">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                        Créditeurs projetés
                                      </p>
                                      <p
                                        className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-[#2A2F3A]"
                                        data-testid="bilan-crediteurs-projected-amount"
                                      >
                                        {(crediteursDriver === "paymentDays"
                                          ? crediteursSelectedYearCmv
                                          : crediteursSelectedYearRevenue)
                                          ? formatCurrency(crediteursProjectedAmount)
                                          : "—"}
                                      </p>
                                      <p className="mt-2 text-xs leading-relaxed text-slate-500">
                                        {crediteursDriver === "revenuePercent"
                                          ? "CA × % des revenus"
                                          : "CMV × délai / 365"}
                                        {ccSelectedYearLabel
                                          ? crediteursDriver === "paymentDays"
                                            ? ` · CMV projeté : ${formatCurrency(crediteursSelectedYearCmv)}`
                                            : ` · CA ${isForecastProjectedDisplayColumn(hypothesisYearIndex, forecastActualCols) ? "projeté" : "réel"} : ${ccSelectedYearLabel} (${formatCurrency(crediteursSelectedYearRevenue)})`
                                          : crediteursDriver === "paymentDays"
                                            ? " · CMV de l'année"
                                            : " · CA projeté de l'année"}
                                      </p>
                                    </div>
                                  </div>
                                </>
                              ) : isOtherActPanel ? (
                                <>
                                  <div>
                                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                      Méthode
                                    </p>
                                    <Tabs
                                      value={otherActDriver}
                                      onValueChange={(value) => {
                                        const next =
                                          value === "revenuePercent" ? "revenuePercent" : "amount"
                                        setDraftType(next)
                                        if (next === "revenuePercent") {
                                          setDraftValue(lastActRevenuePercentHistoryValue(otherActHistory))
                                        } else {
                                          setDraftValue(0)
                                        }
                                      }}
                                    >
                                      <TabsList className="flex h-auto w-full max-w-xl flex-wrap gap-1 rounded-lg border border-slate-200/90 bg-slate-100/80 p-0.5 sm:inline-flex sm:w-fit">
                                        <TabsTrigger
                                          value="amount"
                                          className="h-8 flex-1 rounded-md px-3 py-1 text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#2A2F3A] data-[state=active]:shadow-sm sm:flex-initial"
                                        >
                                          Montant ($)
                                        </TabsTrigger>
                                        <TabsTrigger
                                          value="revenuePercent"
                                          className="h-8 flex-1 rounded-md px-3 py-1 text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#2A2F3A] data-[state=active]:shadow-sm sm:flex-initial"
                                        >
                                          % des revenus
                                        </TabsTrigger>
                                      </TabsList>
                                    </Tabs>
                                  </div>

                                  {otherActDriver === "revenuePercent" ? (
                                    <>
                                      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                        <div className="border-b border-slate-200 px-4 py-2.5 sm:px-5">
                                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                            Exercices réels
                                          </p>
                                        </div>
                                        <table className="w-full min-w-[28rem] border-collapse text-sm">
                                          <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50/80">
                                              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:px-5">
                                                Indicateur
                                              </th>
                                              {otherActHistory.map((yearRow) => (
                                                <th
                                                  key={yearRow.year}
                                                  className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:px-5"
                                                >
                                                  {yearRow.year}
                                                </th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr className="border-b border-slate-100 bg-[#E0742D]/[0.04]">
                                              <th
                                                scope="row"
                                                className="px-4 py-2.5 text-left font-medium text-[#2A2F3A] sm:px-5"
                                              >
                                                <span className="flex items-center gap-2">
                                                  <span
                                                    className="h-4 w-0.5 shrink-0 rounded-full bg-[#E0742D]"
                                                    aria-hidden
                                                  />
                                                  % des revenus
                                                </span>
                                              </th>
                                              {otherActHistory.map((yearRow) => (
                                                <td
                                                  key={`pct-${yearRow.year}`}
                                                  data-testid={`act-history-revenuePercent-${yearRow.year}`}
                                                  className="px-4 py-2.5 text-right font-semibold tabular-nums text-[#2A2F3A] sm:px-5"
                                                >
                                                  {formatComptesClientsHistoryNumber(yearRow.revenuePercent)}
                                                  <span className="ml-1 text-[11px] font-normal text-slate-400">
                                                    %
                                                  </span>
                                                </td>
                                              ))}
                                            </tr>
                                            <tr className="border-b border-slate-100">
                                              <th
                                                scope="row"
                                                className="px-4 py-2.5 text-left font-medium text-slate-600 sm:px-5"
                                              >
                                                <span className="pl-2.5">{hypothesisRowLabel || "Poste"}</span>
                                              </th>
                                              {otherActHistory.map((yearRow) => (
                                                <td
                                                  key={`amt-${yearRow.year}`}
                                                  className="px-4 py-2.5 text-right tabular-nums text-slate-700 sm:px-5"
                                                >
                                                  {yearRow.amount ? formatCurrency(yearRow.amount) : "—"}
                                                </td>
                                              ))}
                                            </tr>
                                            <tr>
                                              <th
                                                scope="row"
                                                className="px-4 py-2.5 text-left font-medium text-slate-600 sm:px-5"
                                              >
                                                <span className="pl-2.5">Revenus</span>
                                              </th>
                                              {otherActHistory.map((yearRow) => (
                                                <td
                                                  key={`rev-${yearRow.year}`}
                                                  className="px-4 py-2.5 text-right tabular-nums text-slate-700 sm:px-5"
                                                >
                                                  {yearRow.revenue ? formatCurrency(yearRow.revenue) : "—"}
                                                </td>
                                              ))}
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>

                                      <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start">
                                        <div>
                                          <Label
                                            htmlFor="bilan-adj-value"
                                            className="mb-2 block text-sm font-medium text-slate-700"
                                          >
                                            % des revenus
                                          </Label>
                                          <div className="relative">
                                            <Input
                                              id="bilan-adj-value"
                                              type="number"
                                              step={0.1}
                                              min={0}
                                              value={draftValue}
                                              onChange={(e) =>
                                                setDraftValue(parseFloat(e.target.value) || 0)
                                              }
                                              className="h-11 pr-16 tabular-nums"
                                            />
                                            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">
                                              %
                                            </span>
                                          </div>
                                          <p className="mt-2 text-xs leading-relaxed text-slate-500">
                                            {otherActLastHistoryYear
                                              ? `${otherActLastHistoryYear.year} : ${formatComptesClientsHistoryNumber(
                                                  otherActLastHistoryYear.revenuePercent,
                                                )} %`
                                              : null}
                                            {otherActAveragePercent != null
                                              ? ` · Moyenne 2 ans : ${formatComptesClientsHistoryNumber(otherActAveragePercent)} %`
                                              : null}
                                          </p>
                                        </div>
                                        <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 sm:px-5">
                                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                            Montant projeté
                                          </p>
                                          <p
                                            className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-[#2A2F3A]"
                                            data-testid="bilan-act-projected-amount"
                                          >
                                            {otherActSelectedYearRevenue
                                              ? formatCurrency(otherActProjectedAmount)
                                              : "—"}
                                          </p>
                                          <p className="mt-2 text-xs leading-relaxed text-slate-500">
                                            CA × % des revenus
                                            {ccSelectedYearLabel
                                              ? ` · CA ${isForecastProjectedDisplayColumn(hypothesisYearIndex, forecastActualCols) ? "projeté" : "réel"} : ${ccSelectedYearLabel} (${formatCurrency(otherActSelectedYearRevenue)})`
                                              : " · CA projeté de l'année"}
                                          </p>
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <div>
                                      <Label
                                        htmlFor="bilan-adj-value"
                                        className="mb-2 block text-sm font-medium text-slate-700"
                                      >
                                        Montant ($)
                                      </Label>
                                      <Input
                                        id="bilan-adj-value"
                                        type="number"
                                        step={1}
                                        value={draftValue}
                                        onChange={(e) => setDraftValue(parseFloat(e.target.value) || 0)}
                                      />
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div>
                                  <Label htmlFor="bilan-adj-value" className="mb-2 block text-sm font-medium text-slate-700">
                                    Montant ($)
                                  </Label>
                                  <Input
                                    id="bilan-adj-value"
                                    type="number"
                                    step={1}
                                    value={draftValue}
                                    onChange={(e) => setDraftValue(parseFloat(e.target.value) || 0)}
                                  />
                                </div>
                              )}
                              <label className="flex items-start gap-2 text-sm text-slate-700">
                                <Checkbox
                                  checked={draftRecurring}
                                  onCheckedChange={(v) => setDraftRecurring(v === true)}
                                  className="mt-0.5"
                                  data-testid="bilan-adj-recurring"
                                />
                                <span>
                                  {isComptesClientsPanel
                                    ? ccDriver === "revenuePercent"
                                      ? "Appliquer le % des revenus aux années suivantes"
                                      : "Appliquer le délai de collection aux années suivantes"
                                    : isStocksPanel
                                      ? stocksDriver === "revenuePercent"
                                        ? "Appliquer le % des revenus aux années suivantes"
                                        : "Appliquer le délai de rotation aux années suivantes"
                                      : isCrediteursPanel
                                        ? crediteursDriver === "revenuePercent"
                                          ? "Appliquer le % des revenus aux années suivantes"
                                          : "Appliquer le délai de paiement aux années suivantes"
                                        : isOtherActPanel
                                          ? otherActDriver === "revenuePercent"
                                            ? "Appliquer le % des revenus aux années suivantes"
                                            : "Appliquer aux années suivantes"
                                          : "Appliquer aux années suivantes"}
                                  {isComptesClientsPanel ? (
                                    <span className="mt-1 block text-xs font-normal leading-relaxed text-slate-500">
                                      Le délai ou le % est reporté. Le solde de chaque année suit le CA
                                      projeté de cette année.
                                    </span>
                                  ) : isStocksPanel ? (
                                    <span className="mt-1 block text-xs font-normal leading-relaxed text-slate-500">
                                      {stocksDriver === "inventoryDays"
                                        ? "Le délai est reporté. Le solde suit le CMV projeté de chaque année."
                                        : "Le % est reporté. Le solde de chaque année suit le CA projeté de cette année."}
                                    </span>
                                  ) : isCrediteursPanel ? (
                                    <span className="mt-1 block text-xs font-normal leading-relaxed text-slate-500">
                                      {crediteursDriver === "paymentDays"
                                        ? "Le délai est reporté. Le solde suit le CMV projeté de chaque année."
                                        : "Le % est reporté. Le solde de chaque année suit le CA projeté de cette année."}
                                    </span>
                                  ) : isOtherActPanel && otherActDriver === "revenuePercent" ? (
                                    <span className="mt-1 block text-xs font-normal leading-relaxed text-slate-500">
                                      Le % est reporté. Le solde de chaque année suit le CA projeté de
                                      cette année.
                                    </span>
                                  ) : null}
                                </span>
                              </label>
                              <div>
                                <Label htmlFor="bilan-adj-note" className="mb-2 block text-sm font-medium text-slate-700">
                                  Note explicative
                                </Label>
                                <Input
                                  id="bilan-adj-note"
                                  value={draftNote}
                                  onChange={(e) => setDraftNote(e.target.value)}
                                  placeholder="Optionnel"
                                />
                              </div>
                              {draftAdjustmentId ? (
                                <div className="flex justify-end border-t border-slate-200/70 pt-4">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 text-xs text-red-700 hover:bg-red-50"
                                    onClick={deleteBilanHypothesis}
                                  >
                                    Supprimer l&apos;ajustement
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
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
                                ) : null}
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
                                ) : null}
                              </>
                            )}
                            
                            {(view === "12months" || view === "quarters" || view === "years") && row.trendValues && (
                              <>
                                {row.trendValues.map((rowTrendValue, valueIdx) => {
                                  const accountTrendValue =
                                    account.trendValues != null &&
                                    account.trendValues[valueIdx] !== undefined
                                      ? account.trendValues[valueIdx]!
                                      : account.proportion !== undefined
                                        ? Math.round(rowTrendValue * account.proportion)
                                        : 0

                                  return (
                                    <td
                                      key={valueIdx}
                                      className={cn(
                                        "px-4 py-2 text-right font-normal text-sm text-slate-700",
                                        isForecastSection && view === "years" && isForecastHistoricalColumn(valueIdx) ? "bg-slate-50" : ""
                                      )}
                                    >
                                      {accountTrendValue !== 0 ? formatCurrency(accountTrendValue) : "-"}
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
                                          : PERFORMANCE_CHART_YEAR_COUNT,
                                }).map((_, emptyIdx) => (
                                    <td 
                                      key={emptyIdx} 
                                      className={cn(
                                        "px-4 py-2 text-right font-normal text-sm text-slate-400",
                                        isForecastSection && view === "years" && isForecastHistoricalColumn(emptyIdx) ? "bg-slate-50" : ""
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
          analysisRowRefs={analysisRowRefs}
          onNotesUpdated={() => setNotesUpdated((n) => n + 1)}
          cardRef={analysisCardRef}
        />
      )}
      </div>
    </div>
  )
}

