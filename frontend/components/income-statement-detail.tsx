"use client"

import { formatCurrency, calculateVariation, formatShareOfRevenuePct } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import type { FinancialStatementRow, SeriesPeriod, SeriesRow } from "@/lib/api"
import { HORIZON_LABEL } from "@/lib/financial-statement-horizon-labels"
import { useIncomeStatementStructureEdit } from "@/hooks/use-income-statement-structure-edit"
import { useStandardLinkCodesFlat } from "@/hooks/use-standard-link-codes"
import { balanceSheetDetailRowsLookLikeGlAccounts } from "@/lib/balance-sheet-detail-rows"
import { formatGlAccountDisplayLabel } from "@/lib/gl-account-display-label"
import { buildStandardLinkCodeLabelMap } from "@/lib/standard-link-code-utils"
import { IncomeStatementStructureStudioCols } from "@/components/income-statement-structure-studio-cols"
import { generateId } from "@/lib/seeded-random"
import type {
  RevenueCustomDraftRow,
  RevenueCustomGrowthSnapshot,
  RevenueCustomYoYGrowthMode,
} from "@/lib/revenue-custom-formula"
import {
  appendRevenueCustomFormulaOperator,
  buildRevenueCustomGrowthSnapshot,
  collectConsecutiveCustomGrowthChain,
  createSaaSRevenueCustomStarter,
  escapeRegExp,
  evaluateRevenueCustomGrowth,
  formatDraftNumberForInput,
  parseDraftNumericInput,
  resolveCustomGrowthVariablesFromChain,
  revenueCustomBracketRef,
  revenueCustomFormulaPlaceholder,
} from "@/lib/revenue-custom-formula"
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListTree,
  Table2,
  TrendingUp,
  X,
} from "lucide-react"
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
  yearLabelsFromReference,
  yearTrendFromReference,
  buildAmountsByCalendarMonth,
} from "@/lib/series-reference-columns"
import {
  type ForecastActualLayout,
  forecastActualColumnCount,
  forecastConfigToDisplayYearIndex,
  forecastDisplayToConfigYearIndex,
  forecastDisplayTrendToConfigTrend,
  forecastDisplayYearCount,
  forecastActualPrefixValues,
  forecastGrowthBaseDisplayIndex,
  forecastGrowthPreviousConfigYearIndex,
  forecastTrendFromActualPrefix,
  forecastYearLabelsForLayout,
  isForecastProjectedDisplayColumn,
  nMinusOneAndYtdActuals,
  resolveForecastActualLayout,
} from "@/lib/pro-forma-forecast-columns"
import { PERFORMANCE_CHART_YEAR_COUNT } from "@/lib/performance-chart-series"
import { parseFiscalYearEndMonth } from "@/lib/capex-year-reference"
import {
  INCOME_STATEMENT_QUARTER_COUNT,
  incomeStatementQuarterLabelsForBasis,
  incomeStatementQuarterTrendForBasis,
  incomeStatementYearLabelsForBasis,
  incomeStatementYearTrendForBasis,
  type IncomeStatementPeriodBasis,
} from "@/lib/income-statement-period-basis"
import {
  collectDistinctLinkCodesFromStructure,
  mapLinkCodesToOwnerLabel,
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
  structureHasRevenuePosteNatureRow,
  structureHasDepensesPosteNatureRow,
  seriesRowBelongsToRevenueAnnexDetail,
  seriesRowBelongsToDepensesAnnexDetail,
  seriesRowUsesExcludedProjectionExpenseLinkCode,
  seriesRowBelongsToImpotsAnnexDetail,
  structureRowBelongsToRevenueAnnexDetail,
  structureRowBelongsToDepensesAnnexDetail,
  structureRowBelongsToImpotsAnnexDetail,
  ensureSeriesRowsForAnnexDetailScope,
  resolveStructureAnnexLetter,
} from "@/lib/income-statement-structure-utils"
import { filterIncomeStatementDetailRowsForHorizon } from "@/lib/income-statement-horizon-filter"
import { listRevenueHypothesisPostIdsFromConfigKeys } from "@/hooks/use-projected-revenue-year-totals"
import {
  annexGroupShouldShowSubtotal,
  omitAnnexTitleRowsWithoutAmountPosts,
  resolveDetailAnnexMeta,
  uniqueStatementRowsByStructureIndex,
} from "@/lib/income-statement-annex-detail"
import type { IncomeStatementHorizonView } from "@/lib/income-statement-horizon-visibility"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { BookMarked, Settings, Plus, Edit2, Trash2, Loader2, Sparkles, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ForecastSeasonalityEditor } from "@/components/forecast-seasonality-editor"
import type { ForecastSeasonalityOverlayLine } from "@/components/forecast-seasonality-editor"
import {
  actualYearsSeasonalityFromCalendarMap,
  averageSeasonalityMonthPercents,
  createDefaultForecastSeasonalityMonthPercents,
  FORECAST_SEASONALITY_ACTUAL_YEAR_COLORS,
  FORECAST_SEASONALITY_AXIS_LABELS,
  FORECAST_SEASONALITY_REVENUE_OVERLAY_BLUE,
  FORECAST_SEASONALITY_WITH_ADJUSTMENT_COLOR,
  lastTwoActualCalendarYears,
  monthPercentsFromMonthlyAmounts,
  normalizeForecastSeasonalityMonthPercents,
  parseSeasonalityMonthPercentsFromStorage as parseForecastSeasonalityFromStorage,
  weightedSeasonalityMonthPercents,
} from "@/lib/forecast-seasonality-utils"
import {
  buildCollectionCashForSave as buildForecastCollectionCashForSave,
  createDefaultAdvancedBuckets as createDefaultForecastCollectionBuckets,
  normalizeAdvancedBuckets as normalizeForecastCollectionBuckets,
  parseCollectionCashFromStorage,
  type ForecastCollectionCash,
} from "@/lib/forecast-collection-cash-utils"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

interface IncomeStatementDetailProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years"
  columnMode?: "variationAmount" | "variationPercent" | "percentage" | "comparison"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  title?: string
  /** Projections: hide the header icon box. */
  hideHeaderIcon?: boolean
  /** Projections: disable opening/closing rows and the analysis panel. */
  disableRowInteractions?: boolean
  /** Projections: force forecast behavior even if title is generic ("Détail"). */
  forceForecastSection?: boolean
  /** Projections: base year (e.g. 2026). */
  forecastBaseYear?: number
  /** Projections: use actuals for (baseYear-1), keep projected years at 0. */
  forecastUseSeriesActuals?: boolean
  /** Pro Forma Résultats : N-1 (exercice complet) + YTD de la date de référence, puis années projetées. */
  forecastActualLayout?: ForecastActualLayout
  projectionYears?: 3 | 4 | 5
  projectionMode?: "gl" | "account"
  comparisonType?: "lastMonth" | "pastMonth" | "budget"
  periodBasis?: IncomeStatementPeriodBasis
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

/** Comptes GL issus des `detailRows` de série — mêmes agrégations que la ligne parente. */
function balanceAccountsFromSeriesRowDetail(
  row: SeriesRow,
  periods: SeriesPeriod[],
  horizon: "12months" | "quarters" | "years",
  refMonth: number,
  refYear: number,
  periodBasis: IncomeStatementPeriodBasis = "current",
  fiscalYearEndMonth = 12,
  useCalendarYearTotals = false,
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
          ? incomeStatementQuarterTrendForBasis(
              pseudo,
              periods,
              refMonth,
              refYear,
              periodBasis,
              fiscalYearEndMonth,
              INCOME_STATEMENT_QUARTER_COUNT,
            )
          : useCalendarYearTotals
            ? yearTrendFromReference(pseudo, periods, refYear, PERFORMANCE_CHART_YEAR_COUNT + 1)
            : incomeStatementYearTrendForBasis(
                pseudo,
                periods,
                refMonth,
                refYear,
                periodBasis,
                fiscalYearEndMonth,
                PERFORMANCE_CHART_YEAR_COUNT + 1,
              )
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

/** Après chaque bloc d’annexe : sous-total, puis ligne indicatif (Paramètres / Détail). */
function insertAnnexDetailPlaceholderRows(
  rows: DetailRow[],
  trendValuesLength?: number,
  options?: { includeIndicatifAfterAnnex?: boolean }
): DetailRow[] {
  const includeIndicatif = options?.includeIndicatifAfterAnnex !== false
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
      if (annexGroupShouldShowSubtotal(groupRows)) {
        const agg = sumAnnexGroupRows(groupRows)
        out.push(buildAnnexSubtotalDetailRow(letter, agg))
        if (includeIndicatif) {
          out.push(buildAnnexPlaceholderDetailRow(letter, trendValuesLength))
        }
      }
      i = j
    } else {
      out.push(rows[i])
      i++
    }
  }
  return out
}

type RevenueCollectionMode = "simple" | "advanced"

type RevenueCollectionBucket = {
  delayDays: number
  percent: number
  /** Ligne ajoutée par l’utilisateur (supprimable). Les 5 premières lignes sont toujours 0 / 30 / 60 / 90 / 120 j. */
  custom?: boolean
}

type RevenueCollectionCash = {
  mode: RevenueCollectionMode
  dsoDays: number
  badDebtPercent: number
  advancedBuckets?: RevenueCollectionBucket[]
}

const STANDARD_REVENUE_COLLECTION_DELAYS = [0, 30, 60, 90, 120] as const

const DEFAULT_REVENUE_COLLECTION_CASH: RevenueCollectionCash = {
  mode: "advanced",
  dsoDays: 45,
  badDebtPercent: 0,
}

function clampRoundBadDebt(p: number): number {
  return Math.max(0, Math.min(100, Math.round(Number(p) || 0)))
}

function clampDsoDays(d: number): number {
  return Math.max(0, Math.min(365, Math.round(Number(d) || 0)))
}

function weightedEncashableCollectionDelayDays(buckets: RevenueCollectionBucket[]): number {
  const sum = buckets.reduce((a, b) => a + Math.max(0, Math.round(b.percent || 0)), 0)
  if (sum <= 0) return 0
  const raw =
    buckets.reduce(
      (acc, b) => acc + Math.max(0, Math.round(b.percent || 0)) * Math.max(0, Math.round(b.delayDays || 0)),
      0
    ) / sum
  return Math.round(raw * 10) / 10
}

function simpleCashToAdvancedBuckets(dsoDays: number, badDebtPercent: number): RevenueCollectionBucket[] {
  const bd = clampRoundBadDebt(badDebtPercent)
  const enc = Math.max(0, 100 - bd)
  const d = clampDsoDays(dsoDays)
  const std = [...STANDARD_REVENUE_COLLECTION_DELAYS]
  if (enc <= 0) return createDefaultAdvancedBuckets(bd)
  const idx = std.indexOf(d as (typeof STANDARD_REVENUE_COLLECTION_DELAYS)[number])
  if (idx >= 0) {
    return normalizeAdvancedBuckets(
      std.map((delayDays, i) => ({
        delayDays,
        percent: i === idx ? enc : 0,
        custom: false as const,
      })),
      bd
    )
  }
  return normalizeAdvancedBuckets(
    [
      ...std.map((delayDays) => ({ delayDays, percent: 0, custom: false as const })),
      { delayDays: d, percent: enc, custom: true as const },
    ],
    bd
  )
}

function createDefaultAdvancedBuckets(badDebtPercent: number): RevenueCollectionBucket[] {
  const bd = clampRoundBadDebt(badDebtPercent)
  const target = 100 - bd
  const n = STANDARD_REVENUE_COLLECTION_DELAYS.length
  const base = Math.floor(target / n)
  const rest = target - base * n
  return STANDARD_REVENUE_COLLECTION_DELAYS.map((delayDays, i) => ({
    delayDays,
    percent: base + (i < rest ? 1 : 0),
    custom: false,
  }))
}

function normalizeAdvancedBuckets(
  buckets: RevenueCollectionBucket[],
  badDebtPercent: number
): RevenueCollectionBucket[] {
  const bd = clampRoundBadDebt(badDebtPercent)
  const target = 100 - bd
  if (buckets.length === 0) return createDefaultAdvancedBuckets(bd)
  const safe = buckets.map((b) => ({
    delayDays: Math.max(0, Math.min(720, Math.round(Number(b.delayDays) || 0))),
    percent: Math.max(0, Math.round(Number(b.percent) || 0)),
    custom: b.custom === true,
  }))
  let sum = safe.reduce((a, b) => a + b.percent, 0)
  if (sum <= 0) {
    return createDefaultAdvancedBuckets(bd)
  }
  const rounded = safe.map((b) => ({
    ...b,
    percent: Math.round((b.percent / sum) * target),
  }))
  let diff = target - rounded.reduce((a, b) => a + b.percent, 0)
  const out = rounded.map((b) => ({ ...b }))
  const n = out.length
  let guard = 0
  while (diff !== 0 && guard < 400 && n > 0) {
    const i = guard % n
    if (diff > 0) {
      out[i] = { ...out[i]!, percent: out[i]!.percent + 1 }
      diff--
    } else if (diff < 0 && out[i]!.percent > 0) {
      out[i] = { ...out[i]!, percent: out[i]!.percent - 1 }
      diff++
    }
    guard++
  }
  return out
}

function coerceAdvancedBucketsForUi(
  raw: RevenueCollectionBucket[] | undefined,
  badDebtPercent: number
): RevenueCollectionBucket[] {
  if (!raw || raw.length === 0) return createDefaultAdvancedBuckets(badDebtPercent)
  const std = [...STANDARD_REVENUE_COLLECTION_DELAYS]
  const head = raw.slice(0, 5)
  const standardRows: RevenueCollectionBucket[] = std.map((delayDays, i) => ({
    delayDays,
    percent: head[i] ? Math.max(0, Math.round(Number(head[i]!.percent) || 0)) : 0,
    custom: false,
  }))
  const extra: RevenueCollectionBucket[] = raw.slice(5).map((b) => ({
    delayDays: Math.max(0, Math.min(720, Math.round(Number(b.delayDays) || 0))),
    percent: Math.max(0, Math.round(Number(b.percent) || 0)),
    custom: true,
  }))
  return normalizeAdvancedBuckets([...standardRows, ...extra], badDebtPercent)
}

function labelForRevenueDelayDays(days: number): string {
  if (days === 0) return "Immédiat"
  if (days === 30) return "30 jours"
  if (days === 60) return "60 jours"
  if (days === 90) return "90 jours"
  if (days === 120) return "120 jours"
  return `${days} j`
}

function migrateLegacyScheduleToBuckets(
  rows: { offsetMonths: number; percent: number }[],
  badDebtPercent: number
): RevenueCollectionBucket[] {
  const std = [...STANDARD_REVENUE_COLLECTION_DELAYS]
  const sums = new Map<number, number>()
  for (const r of rows) {
    const d = Math.min(720, Math.max(0, Math.round(Number(r.offsetMonths) || 0) * 30))
    sums.set(d, (sums.get(d) ?? 0) + (Math.max(0, Number(r.percent)) || 0))
  }
  const standardRows: RevenueCollectionBucket[] = std.map((delayDays) => ({
    delayDays,
    percent: sums.get(delayDays) ?? 0,
    custom: false,
  }))
  for (const d of std) {
    sums.delete(d)
  }
  const extra: RevenueCollectionBucket[] = []
  for (const [delayDays, percent] of sums) {
    if (percent > 0) {
      extra.push({ delayDays, percent, custom: true })
    }
  }
  return normalizeAdvancedBuckets([...standardRows, ...extra], badDebtPercent)
}

/** Lit `collectionCash` ou migre `collectionSchedule` / `collectionPercents`. */
function parseRevenueCollectionCashFromStorage(adj: {
  collectionCash?: unknown
  collectionSchedule?: unknown
  collectionPercents?: unknown
}): RevenueCollectionCash {
  const raw = adj.collectionCash
  if (raw && typeof raw === "object" && raw !== null && "mode" in raw) {
    const c = raw as Record<string, unknown>
    const storedMode = c.mode === "advanced" ? "advanced" : "simple"
    const badDebtPercent = 0
    const dsoDaysStored = clampDsoDays(Number(c.dsoDays))
    const bucketsRaw = c.advancedBuckets

    let advancedBuckets: RevenueCollectionBucket[]
    if (storedMode === "advanced") {
      if (Array.isArray(bucketsRaw) && bucketsRaw.length > 0) {
        const parsed = (bucketsRaw as { delayDays?: unknown; percent?: unknown; custom?: unknown }[]).map(
          (b) => ({
            delayDays: Number(b.delayDays) || 0,
            percent: Number(b.percent) || 0,
            custom: b.custom === true,
          })
        )
        advancedBuckets = coerceAdvancedBucketsForUi(parsed, badDebtPercent)
      } else {
        advancedBuckets = createDefaultAdvancedBuckets(badDebtPercent)
      }
    } else {
      advancedBuckets = simpleCashToAdvancedBuckets(dsoDaysStored, badDebtPercent)
    }
    const weighted = weightedEncashableCollectionDelayDays(advancedBuckets)
    return {
      mode: "advanced",
      dsoDays: clampDsoDays(Math.round(weighted)),
      badDebtPercent,
      advancedBuckets,
    }
  }

  const bd = 0
  const sched = adj.collectionSchedule
  if (
    Array.isArray(sched) &&
    sched.length > 0 &&
    typeof sched[0] === "object" &&
    sched[0] !== null &&
    "percent" in (sched[0] as object)
  ) {
    const rows = (sched as { offsetMonths?: unknown; percent?: unknown }[]).map((r) => ({
      offsetMonths: Number(r.offsetMonths) || 0,
      percent: Number(r.percent) || 0,
    }))
    const adv = migrateLegacyScheduleToBuckets(rows, bd)
    return {
      mode: "advanced",
      dsoDays: clampDsoDays(Math.round(weightedEncashableCollectionDelayDays(adv))),
      badDebtPercent: bd,
      advancedBuckets: adv,
    }
  }
  const legacy = adj.collectionPercents
  if (Array.isArray(legacy) && legacy.length > 0 && typeof legacy[0] === "number") {
    const rows = (legacy as number[]).map((p, i) => ({
      offsetMonths: i,
      percent: Number(p) || 0,
    }))
    const adv = migrateLegacyScheduleToBuckets(rows, bd)
    return {
      mode: "advanced",
      dsoDays: clampDsoDays(Math.round(weightedEncashableCollectionDelayDays(adv))),
      badDebtPercent: bd,
      advancedBuckets: adv,
    }
  }
  const defBuckets = createDefaultAdvancedBuckets(DEFAULT_REVENUE_COLLECTION_CASH.badDebtPercent)
  return {
    mode: "advanced",
    dsoDays: clampDsoDays(Math.round(weightedEncashableCollectionDelayDays(defBuckets))),
    badDebtPercent: DEFAULT_REVENUE_COLLECTION_CASH.badDebtPercent,
    advancedBuckets: defBuckets,
  }
}

function createDefaultRevenueSeasonalityMonthPercents(): number[] {
  const n = 12
  const base = Math.floor(100 / n)
  let rest = 100 - base * n
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0))
}

/** Répartit le revenu annuel sur 12 mois selon les % de saisonnalité (somme des poids = 1 si total > 0). */
function distributeAnnualRevenueBySeasonality(annual: number, monthPercentsRaw: number[]): number[] {
  const pct =
    monthPercentsRaw.length >= 12
      ? monthPercentsRaw.slice(0, 12)
      : [...monthPercentsRaw, ...Array(12 - monthPercentsRaw.length).fill(0)]
  const safe = pct.map((p) => Math.max(0, Number(p) || 0))
  const total = safe.reduce((a, b) => a + b, 0)
  const weights = total > 0 ? safe.map((p) => p / total) : Array(12).fill(1 / 12)
  const floats = weights.map((w) => annual * w)
  const out = floats.map((x) => Math.floor(x))
  let diff = Math.round(annual) - out.reduce((a, b) => a + b, 0)
  let guard = 0
  while (diff !== 0 && guard < 5000) {
    let best = 0
    let bestFrac = -Infinity
    for (let m = 0; m < 12; m++) {
      const frac = floats[m]! - out[m]!
      if (frac > bestFrac) {
        bestFrac = frac
        best = m
      }
    }
    if (diff > 0) {
      out[best] = (out[best] ?? 0) + 1
      diff--
    } else {
      const m = out.findIndex((v) => v > 0)
      if (m < 0) break
      out[m] = (out[m] ?? 0) - 1
      diff++
    }
    guard++
  }
  return out
}

function normalizeRevenueSeasonalityMonthPercents(months: number[]): number[] {
  const def = createDefaultRevenueSeasonalityMonthPercents()
  const raw =
    months.length >= 12 ? months.slice(0, 12) : [...months, ...Array(12 - months.length).fill(0)]
  const safe = raw.map((p) => Math.max(0, Math.round(Number(p) || 0)))
  const sum = safe.reduce((a, b) => a + b, 0)
  if (sum <= 0) return def
  const rounded = safe.map((p) => Math.round((p / sum) * 100))
  let diff = 100 - rounded.reduce((a, b) => a + b, 0)
  const out = [...rounded]
  let guard = 0
  while (diff !== 0 && guard < 240) {
    const i = guard % 12
    if (diff > 0) {
      out[i] = (out[i] ?? 0) + 1
      diff--
    } else if ((out[i] ?? 0) > 0) {
      out[i] = (out[i] ?? 0) - 1
      diff++
    }
    guard++
  }
  return out
}

function parseSeasonalityMonthPercentsFromStorage(adj: {
  seasonalityMonthPercents?: unknown
}): number[] {
  const raw = adj.seasonalityMonthPercents
  if (!Array.isArray(raw) || raw.length !== 12) return createDefaultRevenueSeasonalityMonthPercents()
  return normalizeRevenueSeasonalityMonthPercents(raw.map((x) => Number(x)))
}

function hasStoredSeasonalityMonthPercents(adj: { seasonalityMonthPercents?: unknown } | null | undefined): boolean {
  return Array.isArray(adj?.seasonalityMonthPercents) && adj!.seasonalityMonthPercents!.length === 12
}

function buildCollectionCashForSave(state: {
  badDebtPercent?: number
  buckets: RevenueCollectionBucket[]
}): RevenueCollectionCash {
  const bd = 0
  const std = [...STANDARD_REVENUE_COLLECTION_DELAYS]
  const head = state.buckets.slice(0, 5)
  const standardRows: RevenueCollectionBucket[] = std.map((delayDays, i) => ({
    delayDays,
    percent: head[i] ? Math.max(0, Math.round(Number(head[i]!.percent) || 0)) : 0,
    custom: false,
  }))
  const extra = state.buckets.slice(5).map((b) => ({
    delayDays: Math.max(0, Math.min(720, Math.round(Number(b.delayDays) || 0))),
    percent: Math.max(0, Math.round(Number(b.percent) || 0)),
    custom: true as const,
  }))
  const advancedBuckets = normalizeAdvancedBuckets([...standardRows, ...extra], bd)
  const weighted = weightedEncashableCollectionDelayDays(advancedBuckets)
  return {
    mode: "advanced",
    dsoDays: clampDsoDays(Math.round(weighted)),
    badDebtPercent: bd,
    advancedBuckets,
  }
}

function parsePercentInput(s: string): number | null {
  const t = s.trim().replace(/\s/g, "").replace(/,/g, ".")
  if (t === "" || t === "+" || t === "-") return null
  const n = parseFloat(t)
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.min(100, n))
}

function parseDelayDaysInput(s: string): number | null {
  const t = s.trim().replace(/\s/g, "")
  if (t === "" || t === "+" || t === "-") return null
  const n = parseInt(t, 10)
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.min(720, n))
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
  hideHeaderIcon = false,
  disableRowInteractions = false,
  forceForecastSection = false,
  forecastBaseYear,
  forecastUseSeriesActuals = false,
  forecastActualLayout = "single-prior-year",
  projectionYears = 5,
  projectionMode = "gl",
  comparisonType = "lastMonth",
  periodBasis = "current",
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
  /** Scroll horizontal du tableau (vue années) — ref pour le curseur sous le tableau. */
  const detailTableHScrollRef = useRef<HTMLDivElement | null>(null)
  /** Zone tableau + panneau hypothèses dépenses : scrollIntoView à l’ouverture pour garder le panneau visible. */
  const expenseHypothesisScrollAnchorRef = useRef<HTMLDivElement | null>(null)
  const [detailTableHScrollNonce, setDetailTableHScrollNonce] = useState(0)

  const refMonth = referenceMonth ?? new Date().getMonth() + 1
  const refYear = fiscalYear ?? new Date().getFullYear()
  const fiscalYearEndMonth = parseFiscalYearEndMonth(
    companies.find((c) => c.id === companyId)?.fiscalYearEnd ?? "12-31",
  )
  const forecastActualLayoutEffective = resolveForecastActualLayout(
    forecastActualLayout,
    refMonth,
    fiscalYearEndMonth,
  )
  const forecastActualCols = forecastActualColumnCount(forecastActualLayoutEffective)
  const forecastYearCount = forecastDisplayYearCount(projectionYears, forecastActualLayoutEffective)
  const forecastConfigYearCount = projectionYears + 1

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
    type: "amount" | "percentage" | "inflation" // amount ($), % revenus (variable), ou taux d'inflation (fixe)
    amount?: number // Adjustment amount (for type "amount", can be positive or negative)
    percentage?: number // New percentage value (for type "percentage", e.g., 38 instead of 40)
    inflationRate?: number // Taux d'inflation % (for type "inflation", dépenses fixes)
    /** Décaissement : échéances (parts par délai) + part non payée. */
    disbursementCash?: ForecastCollectionCash
    /** Répartition saisonnière de la dépense annuelle (12 mois, somme 100 %). */
    seasonalityMonthPercents?: number[]
    /** Ajustement $ (variable) : répartition mensuelle de ce montant (somme 100 %). */
    amountMonthPercents?: number[]
    /** Ajustement % non récurrent : mois actifs (12 booléens). */
    activeMonths?: boolean[]
    /** Ajustement % récurrent : mois de début dans l'année de création (0 = janvier). */
    startMonth?: number
    /** Enregistrement créé seulement pour saisonnalité / décaissement (pas un ajustement de croissance). */
    hypothesisMetaOnly?: boolean
    isRecurring: boolean // If true, adjustment continues in future years (for amount: with inflation, for percentage: keeps new rate)
    note: string // Explanatory note for this adjustment
  }

  const isExpenseHypothesisMetaOnly = (adj: ExpenseAdjustment): boolean => {
    if (adj.hypothesisMetaOnly) return true
    if (adj.type === "inflation") return false
    if (adj.type === "percentage" && (adj.percentage ?? 0) !== 0) return false
    if (adj.type === "amount" && (adj.amount ?? 0) !== 0) return false
    if (adj.seasonalityMonthPercents != null || adj.disbursementCash != null) return true
    if (adj.type === "amount" && (adj.amount ?? 0) === 0 && !adj.note?.trim()) return true
    return false
  }

  const isExpenseHypothesisGrowthAdjustment = (adj: ExpenseAdjustment): boolean =>
    !isExpenseHypothesisMetaOnly(adj)

  const applySeasonalityToExpenseAdjustmentList = (
    list: ExpenseAdjustment[],
    rowId: string,
    yearIndex: number,
    seasonality: number[],
    createIfEmpty: boolean
  ): ExpenseAdjustment[] => {
    if (list.length > 0) {
      return list.map((a) => ({ ...a, seasonalityMonthPercents: seasonality }))
    }
    if (!createIfEmpty) return []
    return [
      {
        id: generateId(),
        rowId,
        yearIndex,
        type: "amount",
        amount: 0,
        isRecurring: false,
        note: "",
        seasonalityMonthPercents: seasonality,
        hypothesisMetaOnly: true,
      },
    ]
  }

  const applyDisbursementToExpenseAdjustmentList = (
    list: ExpenseAdjustment[],
    rowId: string,
    yearIndex: number,
    cash: ForecastCollectionCash,
    createIfEmpty: boolean
  ): ExpenseAdjustment[] => {
    if (list.length > 0) {
      return list.map((a) => ({ ...a, disbursementCash: cash }))
    }
    if (!createIfEmpty) return []
    return [
      {
        id: generateId(),
        rowId,
        yearIndex,
        type: "amount",
        amount: 0,
        isRecurring: false,
        note: "",
        disbursementCash: cash,
        hypothesisMetaOnly: true,
      },
    ]
  }

  // Interface for revenue adjustments
  interface RevenueAdjustment {
    id: string // Unique ID for this adjustment
    rowId: string
    yearIndex: number
    type: "amount" | "growthPercent" | "growthAmount" | "custom" // Type of adjustment
    value: number // Montant annuel résultant, % croissance, $ croissance, ou résultat de la formule custom
    /** Présent si type === "custom" : variables + formule (références {{id}}). */
    customGrowth?: RevenueCustomGrowthSnapshot
    note: string // Explanatory note for this adjustment
    /** Encaissement : échéances (parts par délai) (`collectionCash`). */
    collectionCash?: RevenueCollectionCash
    /** @deprecated Migré vers `collectionCash` à l’enregistrement. */
    collectionSchedule?: { offsetMonths: number; percent: number }[]
    /** @deprecated Migré vers `collectionCash` à l’enregistrement. */
    collectionPercents?: number[]
    /** Répartition saisonnière du revenu annuel (12 mois, somme 100 %). */
    seasonalityMonthPercents?: number[]
  }

  // State for expense adjustments: key = "rowId-yearIndex" -> ExpenseAdjustment[]
  const [expenseAdjustments, setExpenseAdjustments] = useState<Record<string, ExpenseAdjustment[]>>({})
  const [editingAdjustment, setEditingAdjustment] = useState<{ rowId: string; yearIndex: number } | null>(null)
  const [adjustmentType, setAdjustmentType] = useState<"amount" | "percentage" | "inflation">("amount")
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0)
  const [adjustmentPercentage, setAdjustmentPercentage] = useState<number>(0)
  const [adjustmentInflationRate, setAdjustmentInflationRate] = useState<number>(2.0)
  const [adjustmentIsRecurring, setAdjustmentIsRecurring] = useState<boolean>(false)
  /** Répartition mensuelle d’un ajustement $ (dépenses variables). */
  const [adjustmentAmountMonthPercents, setAdjustmentAmountMonthPercents] = useState<number[]>(() =>
    createDefaultForecastSeasonalityMonthPercents()
  )
  /** Mois actifs pour un ajustement % non récurrent. */
  const [adjustmentActiveMonths, setAdjustmentActiveMonths] = useState<boolean[]>(() =>
    Array.from({ length: 12 }, () => true)
  )
  /** Mois de début (0–11) pour un ajustement % récurrent. */
  const [adjustmentStartMonth, setAdjustmentStartMonth] = useState(0)
  const [adjustmentNote, setAdjustmentNote] = useState<string>("")
  const [editingAdjustmentId, setEditingAdjustmentId] = useState<string | null>(null) // ID of adjustment being edited, null if adding new

  // State for revenue adjustments: key = "rowId-yearIndex" -> au plus un RevenueAdjustment
  const [revenueAdjustments, setRevenueAdjustments] = useState<Record<string, RevenueAdjustment[]>>({})
  const [revenueAdjustmentType, setRevenueAdjustmentType] = useState<
    "amount" | "growthPercent" | "growthAmount" | "custom"
  >("amount")
  const [revenueAdjustmentValue, setRevenueAdjustmentValue] = useState<number>(0)
  /** Chaîne du champ nombre (négatifs, 0, décimales ; évite de perdre le « - » pendant la saisie). */
  const [revenueAdjustmentValueInput, setRevenueAdjustmentValueInput] = useState<string>("0")
  /** Brouillon formule personnalisée (onglet Croissance). */
  const [revenueCustomDraftRows, setRevenueCustomDraftRows] = useState<RevenueCustomDraftRow[]>([])
  const [revenueCustomFormula, setRevenueCustomFormula] = useState("")
  /** Hypothèses revenus : panneau latéral (remplace la modal pour les ajustements). */
  const [revenueHypothesisPanelOpen, setRevenueHypothesisPanelOpen] = useState(false)
  /** Hypothèses dépenses : même principe que les revenus (panneau latéral au clic sur une cellule). */
  const [expenseHypothesisPanelOpen, setExpenseHypothesisPanelOpen] = useState(false)
  const [expenseHypothesisEditorTab, setExpenseHypothesisEditorTab] = useState<
    "ajustement" | "saisonnalite"
  >("ajustement")
  const [expenseDisbursementBadDebtPercent, setExpenseDisbursementBadDebtPercent] = useState(0)
  const [expenseDisbursementBuckets, setExpenseDisbursementBuckets] = useState(() =>
    createDefaultForecastCollectionBuckets(0)
  )
  const [expenseCustomDelayDrafts, setExpenseCustomDelayDrafts] = useState<Record<number, string>>({})
  const [replicateExpenseDisbursementToFollowingYears, setReplicateExpenseDisbursementToFollowingYears] =
    useState(false)
  const [expenseSeasonalityMonthPercents, setExpenseSeasonalityMonthPercents] = useState<number[]>(() =>
    createDefaultForecastSeasonalityMonthPercents()
  )
  /** Dépenses fixes : appliquer la moyenne des exercices réels dès que la série API est prête. */
  const [expenseSeasonalityAwaitingActuals, setExpenseSeasonalityAwaitingActuals] = useState(false)
  const [replicateExpenseSeasonalityToFollowingYears, setReplicateExpenseSeasonalityToFollowingYears] =
    useState(false)
  /** À l'enregistrement, copier le même type / valeur / note sur les années projetées suivantes (même poste). */
  const [replicateRevenueAdjustmentToFollowingYears, setReplicateRevenueAdjustmentToFollowingYears] =
    useState(false)
  /** À l'enregistrement, copier uniquement la répartition d'encaissement sur les hypothèses déjà présentes pour les années suivantes. */
  const [replicateRevenueEncashmentToFollowingYears, setReplicateRevenueEncashmentToFollowingYears] =
    useState(false)
  /** À l'enregistrement, copier uniquement la saisonnalité (12 mois %) sur les hypothèses déjà présentes pour les années suivantes. */
  const [replicateRevenueSeasonalityToFollowingYears, setReplicateRevenueSeasonalityToFollowingYears] =
    useState(false)
  /** Confirmation avant suppression d’un ajustement revenus (hypothèse). */
  const [revenueHypothesisDeleteConfirmOpen, setRevenueHypothesisDeleteConfirmOpen] = useState(false)
  /** Hypothèse revenus : échéances d’encaissement. */
  const [revenueCollectionBuckets, setRevenueCollectionBuckets] = useState<RevenueCollectionBucket[]>(() =>
    createDefaultAdvancedBuckets(0)
  )
  /** Saisie des jours (lignes ajoutées) : brouillon jusqu’au blur pour éviter le retri à chaque caractère. */
  const [revenueCustomDelayDrafts, setRevenueCustomDelayDrafts] = useState<Record<number, string>>({})
  /** Onglet du panneau hypothèse revenus : croissance ou saisonnalité. */
  const [revenueHypothesisEditorTab, setRevenueHypothesisEditorTab] = useState<
    "croissance" | "saisonnalite"
  >("croissance")
  const [revenueSeasonalityMonthPercents, setRevenueSeasonalityMonthPercents] = useState<number[]>(() =>
    createDefaultRevenueSeasonalityMonthPercents()
  )
  /** Appliquer la moyenne réelle une fois les séries des 2 exercices chargées. */
  const [revenueSeasonalityAwaitingActuals, setRevenueSeasonalityAwaitingActuals] = useState(false)
  const [hypothesisSaveAck, setHypothesisSaveAck] = useState(false)
  const hypothesisSaveAckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Check if this is a forecast section (Revenus, Dépenses, or États des résultats pro forma)
  const isForecastSection =
    forceForecastSection ||
    title === "Estimation des revenus annuels" ||
    title === "Estimation des dépenses annuelles" ||
    title === "États des résultats pro forma"
  const isProFormaResultsTitle = title === "États des résultats pro forma"
  /** Moteur Hypothèses Dépenses (types, taux, CA lié) — aussi sur Résultats Pro Forma. */
  const appliesExpenseHypothesisEngine =
    title === "Estimation des dépenses annuelles" || isProFormaResultsTitle
  const isForecastHistoricalColumn = (idx: number) =>
    (forceForecastSection || isForecastSection) && idx < forecastActualCols
  const isForecastProjectedColumn = (idx: number) =>
    isForecastProjectedDisplayColumn(idx, forecastActualCols)

  /** Revenus projetés (série complète) quand le tableau des dépenses n’inclut pas la ligne revenus (périmètre annexes Dépenses). */
  const expenseRevenueForecastFallbackRef = useRef<{
    trend: number[]
    rowId: string
    nMinusOne?: number
  } | null>(null)

  const isCompanyComparison = columnMode === "comparison" && !companyId
  const isDivisionComparison = columnMode === "comparison" && !!companyId && !divisionId
  const isSubDivisionComparison = columnMode === "comparison" && !!companyId && !!divisionId && !subDivisionId
  const isComparisonMode = isCompanyComparison || isDivisionComparison || isSubDivisionComparison

  const [structureEditMode, setStructureEditMode] = useState(false)

  const canInlineStructureEdit =
    !!showIncomeStatementStructureSettings && !!companyId && !isComparisonMode && !isForecastSection

  const structEdit = useIncomeStatementStructureEdit(
    companyId ?? null,
    structureEditMode && canInlineStructureEdit
  )

  const { codes: standardLinkCodes } = useStandardLinkCodesFlat(
    false,
    undefined,
    structureEditMode && canInlineStructureEdit
  )

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

  const allLiaisonCodes = useMemo(
    () => collectDistinctLinkCodesFromStructure(structEdit.structure),
    [structEdit.structure]
  )
  const linkCodeLabels = useMemo(() => {
    if (structureEditMode && canInlineStructureEdit && standardLinkCodes.length > 0) {
      return buildStandardLinkCodeLabelMap(standardLinkCodes)
    }
    return mapLinkCodesToOwnerLabel(structEdit.structure)
  }, [structureEditMode, canInlineStructureEdit, standardLinkCodes, structEdit.structure])

  /** Annexes pour la modale « Choisir une annexe » (lettre + libellé du poste au Sommaire). */
  const detailAnnexOptionsForSubLineModal = useMemo(
    () => listAnnexOptionsForDetailSubLineModal(structEdit.structure),
    [structEdit.structure]
  )

  const detailAnnexEditorGlobalIndices = useMemo(() => {
    if (!structureEditMode || !canInlineStructureEdit) return []
    return structEdit.structure
      .map((r, i) =>
        isStructureRowInDetailAnnexEditor(r as Record<string, unknown>, structEdit.structure, i)
          ? i
          : -1,
      )
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
  const seriesMonthsNeeded = view === "years" ? 72 : view === "quarters" ? 18 : 12

  // Fetch multi-period series data from API
  const { rows: seriesRows, periods: seriesPeriods, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "income-statement",
    fiscalYear: fiscalYear || new Date().getFullYear(),
    month: refMonth,
    months: seriesMonthsNeeded,
    divisionId: divisionId || undefined,
    subDivisionId: subDivisionId || undefined,
    enabled: isMultiPeriodView,
    structureVersion,
  })

  const revenueSeasonalityProjectionStartYear = forecastBaseYear ?? new Date().getFullYear()
  const revenueActualSeasonalityYears = lastTwoActualCalendarYears(revenueSeasonalityProjectionStartYear)
  const { rows: revenueActualSeasonalityRows, periods: revenueActualSeasonalityPeriods } =
    useFinancialStatementSeries({
      companyId: companyId || null,
      statementType: "income-statement",
      fiscalYear: revenueActualSeasonalityYears[1],
      month: 12,
      months: 36,
      divisionId: divisionId || undefined,
      subDivisionId: subDivisionId || undefined,
      enabled:
        (title === "Estimation des revenus annuels" || title === "Estimation des dépenses annuelles") &&
        !!companyId,
      structureVersion,
    })

  const resolveRevenueActualSeasonality = (rowId: string | undefined) => {
    const years = revenueActualSeasonalityYears
    const empty = years.map((year) => ({
      year,
      percents: Array.from({ length: 12 }, () => 0),
      hasData: false,
    }))
    const rows = revenueActualSeasonalityRows.length > 0 ? revenueActualSeasonalityRows : seriesRows
    const periods =
      revenueActualSeasonalityPeriods.length > 0 ? revenueActualSeasonalityPeriods : seriesPeriods
    if (!rowId || rows.length === 0 || periods.length === 0) {
      return { years: empty, averagePercents: createDefaultForecastSeasonalityMonthPercents() }
    }
    const row = findSeriesRowOrDetail(rows, rowId)
    if (!row) {
      return { years: empty, averagePercents: createDefaultForecastSeasonalityMonthPercents() }
    }
    const map = buildAmountsByCalendarMonth(row, periods)
    const actual = actualYearsSeasonalityFromCalendarMap(map, [...years])
    return { years: actual, averagePercents: averageSeasonalityMonthPercents(actual) }
  }

  useEffect(() => {
    if (!revenueSeasonalityAwaitingActuals || !editingAdjustment?.rowId) return
    const rowsReady = revenueActualSeasonalityRows.length > 0 || seriesRows.length > 0
    if (!rowsReady) return
    setRevenueSeasonalityMonthPercents(
      resolveRevenueActualSeasonality(editingAdjustment.rowId).averagePercents
    )
    setRevenueSeasonalityAwaitingActuals(false)
  }, [
    revenueSeasonalityAwaitingActuals,
    editingAdjustment?.rowId,
    revenueActualSeasonalityRows,
    revenueActualSeasonalityPeriods,
    seriesRows,
    seriesPeriods,
  ])

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
    if (!companyId) {
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
  }, [companyId, structureVersion])

  // Debounced save to API
  const saveConfigRef = useRef<NodeJS.Timeout>()
  /** Évite d’écraser la config API avec des états vides avant la fin du chargement initial. */
  const [incomeStatementConfigHydrated, setIncomeStatementConfigHydrated] = useState(false)

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

  const persistIncomeStatementConfig = useCallback(
    (data: Record<string, unknown>) => {
      if (!incomeStatementConfigHydrated) return
      saveConfig(data)
    },
    [incomeStatementConfigHydrated, saveConfig]
  )

  // Load forecast config from API on mount
  useEffect(() => {
    if (!companyId || !isForecastSection) {
      setIncomeStatementConfigHydrated(false)
      return
    }

    setIncomeStatementConfigHydrated(false)
    let cancelled = false

    const loadConfig = async () => {
      try {
        const configs = await listForecastConfigs(companyId, { config_type: "income-statement-detail", projection_id: projectionId ?? undefined })
        if (cancelled) return
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
                  const arr = value as RevenueAdjustment[]
                  /* Un seul ajustement par clé (poste + année) : conserver le dernier si données anciennes. */
                  validatedAdjustments[key] =
                    arr.length === 0 ? [] : [arr[arr.length - 1] as RevenueAdjustment]
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
      } finally {
        if (!cancelled) setIncomeStatementConfigHydrated(true)
      }
    }
    loadConfig()
    return () => {
      cancelled = true
    }
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
    persistIncomeStatementConfig(buildConfigData())
  }, [revenueValues, persistIncomeStatementConfig, isForecastSection, buildConfigData])

  // Save expense types whenever they change
  useEffect(() => {
    if (title !== "Estimation des dépenses annuelles" || Object.keys(expenseTypes).length === 0) return
    persistIncomeStatementConfig(buildConfigData())
  }, [expenseTypes, persistIncomeStatementConfig, title, buildConfigData])

  // Save inflation rate whenever it changes
  useEffect(() => {
    if (title !== "Estimation des dépenses annuelles") return
    persistIncomeStatementConfig(buildConfigData())
  }, [inflationRate, persistIncomeStatementConfig, title, buildConfigData])

  // Save variable rates whenever they change
  useEffect(() => {
    if (title !== "Estimation des dépenses annuelles" || Object.keys(variableRates).length === 0) return
    persistIncomeStatementConfig(buildConfigData())
  }, [variableRates, persistIncomeStatementConfig, title, buildConfigData])

  // Save specific inflation rates whenever they change
  useEffect(() => {
    if (title !== "Estimation des dépenses annuelles") return
    persistIncomeStatementConfig(buildConfigData())
  }, [specificInflationRates, persistIncomeStatementConfig, title, buildConfigData])

  // Save expense adjustments whenever they change
  useEffect(() => {
    if (title !== "Estimation des dépenses annuelles" || Object.keys(expenseAdjustments).length === 0) return
    persistIncomeStatementConfig(buildConfigData())
  }, [expenseAdjustments, persistIncomeStatementConfig, title, buildConfigData])

  // Save revenue adjustments whenever they change
  useEffect(() => {
    if (title !== "Estimation des revenus annuels" || Object.keys(revenueAdjustments).length === 0) return
    persistIncomeStatementConfig(buildConfigData())
  }, [revenueAdjustments, persistIncomeStatementConfig, title, buildConfigData])

  // Get expense type for a row (defaults to "variable")
  const getExpenseType = (rowId: string | undefined): "variable" | "fixe" => {
    if (!rowId || !appliesExpenseHypothesisEngine) return "variable"
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
    // Réappliquer le profil inflation par défaut sur toutes les dépenses fixes : retirer les surcharges de cellules projetées.
    if (title === "Estimation des dépenses annuelles") {
      setRevenueValues((prev) => {
        const updated = { ...prev }
        for (const [rid, t] of Object.entries(expenseTypes)) {
          if (t !== "fixe") continue
          for (let y = 1; y <= projectionYears; y++) {
            delete updated[`${rid}-${y}`]
          }
        }
        return updated
      })
    }
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

  const clearFixedExpenseProjectedYearOverrides = (rowId: string) => {
    setRevenueValues((prev) => {
      const updated = { ...prev }
      for (let y = 1; y <= projectionYears; y++) {
        delete updated[`${rowId}-${y}`]
      }
      return updated
    })
  }

  const initExpenseHypothesisInflationFields = (rowId: string) => {
    setAdjustmentInflationRate(getInflationRate(rowId))
  }

  const loadExpenseDisbursementFields = (rowId: string, yearIndex: number) => {
    const adjs = getAdjustments(rowId, yearIndex)
    const withDisb = adjs.find((a) => a.disbursementCash != null)
    const cash = withDisb
      ? parseCollectionCashFromStorage({ disbursementCash: withDisb.disbursementCash })
      : parseCollectionCashFromStorage({})
    setExpenseDisbursementBadDebtPercent(0)
    let buckets =
      cash.advancedBuckets?.length
        ? cash.advancedBuckets.map((b) => ({ ...b }))
        : createDefaultForecastCollectionBuckets(0)
    const payableSum = buckets.reduce((a, b) => a + b.percent, 0)
    if (cash.badDebtPercent > 0 && payableSum > 0 && payableSum < 100) {
      const factor = 100 / payableSum
      buckets = buckets.map((b) => ({ ...b, percent: Math.round(b.percent * factor) }))
    }
    setExpenseDisbursementBuckets(normalizeForecastCollectionBuckets(buckets, 0))
  }

  const applyExpenseDisbursementToYear = (
    rowId: string,
    yearIndex: number,
    cash: ForecastCollectionCash,
    replicate: boolean
  ) => {
    const yearLabelsLen = forecastConfigYearCount
    setExpenseAdjustments((prev) => {
      const next: Record<string, ExpenseAdjustment[]> = { ...prev }
      const key0 = `${rowId}-${yearIndex}`
      next[key0] = applyDisbursementToExpenseAdjustmentList(
        prev[key0] || [],
        rowId,
        yearIndex,
        cash,
        true
      )

      if (replicate && yearIndex < yearLabelsLen - 1) {
        for (let y = yearIndex + 1; y < yearLabelsLen; y++) {
          const keyY = `${rowId}-${y}`
          const arr = next[keyY] ?? prev[keyY] ?? []
          next[keyY] = applyDisbursementToExpenseAdjustmentList(arr, rowId, y, cash, true)
        }
      }
      return next
    })
  }

  const loadExpenseSeasonalityFields = (rowId: string, yearIndex: number) => {
    const adjs = getAdjustments(rowId, yearIndex)
    const withSeason = adjs.find((a) => a.seasonalityMonthPercents != null)
    if (withSeason) {
      setExpenseSeasonalityMonthPercents(parseForecastSeasonalityFromStorage(withSeason))
      setExpenseSeasonalityAwaitingActuals(false)
      return
    }
    if (getExpenseType(rowId) === "fixe") {
      setExpenseSeasonalityMonthPercents(resolveRevenueActualSeasonality(rowId).averagePercents)
      setExpenseSeasonalityAwaitingActuals(true)
      return
    }
    // Variable : par défaut = saisonnalité des revenus totaux (mix pondéré Hypothèse revenus).
    const linked = getLinkedRevenueSeasonalityForVariableExpense(rowId, yearIndex)
    setExpenseSeasonalityMonthPercents(
      linked?.monthPercents ?? createDefaultForecastSeasonalityMonthPercents()
    )
    setExpenseSeasonalityAwaitingActuals(true)
  }

  const applyExpenseSeasonalityToYear = (
    rowId: string,
    yearIndex: number,
    seasonality: number[],
    replicate: boolean
  ) => {
    const yearLabelsLen = forecastConfigYearCount
    setExpenseAdjustments((prev) => {
      const next: Record<string, ExpenseAdjustment[]> = { ...prev }
      const key0 = `${rowId}-${yearIndex}`
      next[key0] = applySeasonalityToExpenseAdjustmentList(
        prev[key0] || [],
        rowId,
        yearIndex,
        seasonality,
        true
      )

      if (replicate && yearIndex < yearLabelsLen - 1) {
        for (let y = yearIndex + 1; y < yearLabelsLen; y++) {
          const keyY = `${rowId}-${y}`
          const arr = next[keyY] ?? prev[keyY] ?? []
          next[keyY] = applySeasonalityToExpenseAdjustmentList(arr, rowId, y, seasonality, true)
        }
      }
      return next
    })
  }

  /** Taux d'inflation de fond (Type/Taux), hors ajustement hypothèse mensuel. */
  const getFixedExpenseDefaultInflationRate = (rowId: string): number => getInflationRate(rowId)

  /**
   * Taux d'inflation effectif par mois (défaut + ajustements inflation non récurrents / récurrents).
   */
  const getFixedExpenseInflationRateForMonth = (
    rowId: string,
    yearIndex: number,
    monthIdx: number
  ): number => {
    const defaultRate = getFixedExpenseDefaultInflationRate(rowId)
    if (yearIndex < 1) return defaultRate

    const thisYear = getAdjustments(rowId, yearIndex).filter(isExpenseHypothesisGrowthAdjustment)
    for (const adj of thisYear) {
      if (adj.type !== "inflation" || adj.inflationRate === undefined) continue
      if (adj.isRecurring) {
        if (monthIdx >= (adj.startMonth ?? 0)) return adj.inflationRate
      } else {
        const months = adj.activeMonths
        if (!months || months.length !== 12 || months[monthIdx]) return adj.inflationRate
      }
    }
    for (const adj of getRecurringAdjustments(rowId, yearIndex).filter(
      isExpenseHypothesisGrowthAdjustment
    )) {
      if (adj.type === "inflation" && adj.inflationRate !== undefined) return adj.inflationRate
    }
    return defaultRate
  }

  /** Saisonnalité stockée pour un poste/année (fond), sinon défaut uniforme. */
  const getExpenseStoredSeasonalityPercents = (
    rowId: string,
    yearIndex: number
  ): number[] => {
    const list = getAdjustments(rowId, yearIndex)
    const withSeason = list.find((a) => a.seasonalityMonthPercents?.length === 12)
    if (withSeason?.seasonalityMonthPercents) {
      return normalizeForecastSeasonalityMonthPercents(withSeason.seasonalityMonthPercents)
    }
    if (yearIndex > 0) {
      const prev = getAdjustments(rowId, yearIndex - 1).find(
        (a) => a.seasonalityMonthPercents?.length === 12
      )
      if (prev?.seasonalityMonthPercents) {
        return normalizeForecastSeasonalityMonthPercents(prev.seasonalityMonthPercents)
      }
    }
    return createDefaultForecastSeasonalityMonthPercents()
  }

  /** Taux d'inflation « annuel » (affichage / repli) — premier mois où un ajustement s'applique, sinon défaut. */
  const getInflationRateForFixedExpenseYear = (rowId: string, yearIndex: number): number => {
    if (yearIndex < 1) return getFixedExpenseDefaultInflationRate(rowId)
    for (let m = 0; m < 12; m++) {
      const r = getFixedExpenseInflationRateForMonth(rowId, yearIndex, m)
      if (r !== getFixedExpenseDefaultInflationRate(rowId)) return r
    }
    return getFixedExpenseDefaultInflationRate(rowId)
  }

  /** Exercice fiscal complet clos (N-1) — base inflation / croissance quand une colonne YTD est affichée. */
  const nMinusOneActualForSeriesRow = (rowId: string): number => {
    const sr = seriesRows.find((s) => s.id === rowId)
    if (!sr || !seriesPeriods.length || forecastActualCols <= 1) return 0
    return nMinusOneAndYtdActuals(sr, seriesPeriods, refMonth, refYear, fiscalYearEndMonth).nMinusOne
  }

  /** Année précédente (config) ou N-1 pour inflation / saisonnalité des dépenses fixes. */
  const fixedExpensePreviousYearAmount = (
    rowId: string,
    yearIndex: number,
    baseAmount: number,
  ): { amount: number; seasonalityYearIndex: number } | null => {
    const growthPrev = forecastGrowthPreviousConfigYearIndex(yearIndex, forecastActualCols)
    if (growthPrev == null) return null
    if (growthPrev === "nMinusOne") {
      return {
        amount: nMinusOneActualForSeriesRow(rowId),
        seasonalityYearIndex: 0,
      }
    }
    return {
      amount: computeFixedExpenseYearValue(rowId, growthPrev, baseAmount),
      seasonalityYearIndex: growthPrev,
    }
  }

  const computeFixedExpenseYearValue = (rowId: string, yearIndex: number, baseAmount: number): number => {
    if (yearIndex <= 0) {
      const baseKey = `${rowId}-0`
      return revenueValues[baseKey] !== undefined ? revenueValues[baseKey]! : baseAmount
    }
    const previous = fixedExpensePreviousYearAmount(rowId, yearIndex, baseAmount)
    if (!previous) return baseAmount
    const prev = previous.amount
    const seasonality = getExpenseStoredSeasonalityPercents(rowId, previous.seasonalityYearIndex)
    const prevMonthly = distributeAnnualRevenueBySeasonality(Math.abs(prev), seasonality)
    let sum = 0
    for (let m = 0; m < 12; m++) {
      const rate = getFixedExpenseInflationRateForMonth(rowId, yearIndex, m)
      sum += (prevMonthly[m] ?? 0) * (1 + rate / 100)
    }
    return Math.round(sum) * (prev < 0 ? -1 : 1)
  }

  // Get variable rate for a row (defaults to 0 if not set)
  const getVariableRate = (rowId: string | undefined): number => {
    if (!rowId || !appliesExpenseHypothesisEngine) return 0
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

  /** Montants $ d’ajustement répartis sur 12 mois (directs + récurrents antérieurs pour les fixes). */
  const getExpenseAmountAdjustmentMonthlyAmounts = (
    rowId: string,
    yearIndex: number,
    fallbackSeasonality: number[]
  ): number[] => {
    const out = Array.from({ length: 12 }, () => 0)
    const addAmount = (amount: number, pcts: number[]) => {
      if (amount === 0) return
      const monthly = distributeAnnualRevenueBySeasonality(amount, pcts)
      for (let m = 0; m < 12; m++) {
        out[m] = (out[m] ?? 0) + (monthly[m] ?? 0)
      }
    }
    /** Poids mensuels : non récurrent = répartition saisie ; récurrent année 0 = à partir du mois de début ; années suivantes = fond. */
    const resolvePctsForYear = (adj: ExpenseAdjustment, forYearIndex: number): number[] => {
      if (adj.isRecurring) {
        if (forYearIndex === adj.yearIndex) {
          const start = Math.min(11, Math.max(0, adj.startMonth ?? 0))
          return Array.from({ length: 12 }, (_, m) => (m >= start ? 1 : 0))
        }
        return fallbackSeasonality
      }
      if (adj.amountMonthPercents?.length === 12) return adj.amountMonthPercents
      return fallbackSeasonality
    }

    const growth = getAdjustments(rowId, yearIndex).filter(isExpenseHypothesisGrowthAdjustment)
    for (const adj of growth) {
      if (adj.type !== "amount") continue
      addAmount(adj.amount || 0, resolvePctsForYear(adj, yearIndex))
    }
    // Dépenses fixes : montants récurrents des années antérieures (avec inflation).
    if (getExpenseType(rowId) === "fixe") {
      for (const adj of getRecurringAdjustments(rowId, yearIndex).filter(
        isExpenseHypothesisGrowthAdjustment
      )) {
        if (adj.type !== "amount") continue
        const rate = getInflationRate(rowId)
        const yearsDiff = yearIndex - adj.yearIndex
        const inflated = Math.round((adj.amount || 0) * Math.pow(1 + rate / 100, yearsDiff))
        addAmount(inflated, resolvePctsForYear(adj, yearIndex))
      }
    }
    return out
  }

  /** Taux % revenus effectif par mois (Type/Taux + ajustements % directs / récurrents). */
  const getVariableExpenseRateForMonth = (
    rowId: string,
    yearIndex: number,
    monthIdx: number
  ): number => {
    const typeRate = getVariableRate(rowId)
    const directAdjustments = getAdjustments(rowId, yearIndex).filter(isExpenseHypothesisGrowthAdjustment)
    const recurringAdjustments = getRecurringAdjustments(rowId, yearIndex).filter(
      isExpenseHypothesisGrowthAdjustment
    )
    let rate = typeRate
    for (const adj of recurringAdjustments) {
      if (adj.type === "percentage") rate = adj.percentage ?? rate
    }
    for (const adj of directAdjustments) {
      if (adj.type !== "percentage") continue
      if (adj.isRecurring) {
        if (monthIdx >= (adj.startMonth ?? 0)) rate = adj.percentage ?? rate
      } else {
        const months = adj.activeMonths
        if (!months || months.length !== 12 || months[monthIdx]) {
          rate = adj.percentage ?? rate
        }
      }
    }
    return rate
  }

  const hasExpenseGrowthAdjustments = (rowId: string, yearIndex: number): boolean =>
    getAdjustments(rowId, yearIndex)
      .filter(isExpenseHypothesisGrowthAdjustment)
      .some(
        (a) =>
          (a.type === "amount" && (a.amount || 0) !== 0) ||
          (a.type === "percentage" && (a.percentage || 0) !== 0) ||
          (a.type === "inflation" && a.inflationRate !== undefined)
      )

  /**
   * Ventilation mensuelle pour l’onglet Saisonnalité (dépenses variables) :
   * Dépenses = fond (taux Type/Taux × CA, forme saisonnalité de fond) ;
   * Avec ajustement = CA mensuel × taux effectif (% mois) + montants $ ;
   * Ajustement = écart.
   */
  const getVariableExpenseSeasonalityMonthlyRows = (
    rowId: string,
    yearIndex: number,
    fondSeasonality: number[]
  ): {
    depenses: number[]
    ajustement: number[]
    avecAjustement: number[]
  } | null => {
    const revenueValue = variableExpenseRevenueAmount(yearIndex)
    if (revenueValue == null) return null
    const typeRate = getVariableRate(rowId)
    const revSeason =
      getLinkedRevenueSeasonalityForVariableExpense(rowId, yearIndex)?.monthPercents ??
      createDefaultForecastSeasonalityMonthPercents()
    const revMonthly = distributeAnnualRevenueBySeasonality(revenueValue, revSeason)
    const baseAnnual = Math.round(
      revMonthly.reduce((sum, rev) => sum + (rev * typeRate) / 100, 0)
    )
    const depenses = distributeAnnualRevenueBySeasonality(baseAnnual, fondSeasonality)
    const withPctFloats = revMonthly.map(
      (rev, m) => (rev * getVariableExpenseRateForMonth(rowId, yearIndex, m)) / 100
    )
    const withPctAnnual = Math.round(withPctFloats.reduce((a, b) => a + b, 0))
    const withPctMonthly = distributeAnnualRevenueBySeasonality(
      withPctAnnual,
      withPctFloats.map((v) => Math.max(0, v))
    )
    const withPctSafe =
      withPctAnnual === 0
        ? Array.from({ length: 12 }, () => 0)
        : withPctMonthly
    const amountMonthly = getExpenseAmountAdjustmentMonthlyAmounts(
      rowId,
      yearIndex,
      fondSeasonality
    )
    const avecAjustement = withPctSafe.map((v, i) => v + (amountMonthly[i] ?? 0))
    const ajustement = avecAjustement.map((v, i) => v - (depenses[i] ?? 0))
    return { depenses, ajustement, avecAjustement }
  }

  /**
   * Ventilation mensuelle Saisonnalité (dépenses fixes) :
   * Dépenses = année N−1 × taux Type/Taux (fond) ;
   * Avec = année N−1 × taux inflation effectif par mois + montants $.
   */
  const getFixedExpenseSeasonalityMonthlyRows = (
    rowId: string,
    yearIndex: number,
    fondSeasonality: number[],
    baseAmount: number
  ): {
    depenses: number[]
    ajustement: number[]
    avecAjustement: number[]
  } | null => {
    if (yearIndex < 1) return null
    const previous = fixedExpensePreviousYearAmount(rowId, yearIndex, baseAmount)
    if (!previous) return null
    const prev = previous.amount
    const prevAbs = Math.abs(prev)
    const prevSeasonality = getExpenseStoredSeasonalityPercents(rowId, previous.seasonalityYearIndex)
    const prevMonthly = distributeAnnualRevenueBySeasonality(prevAbs, prevSeasonality)
    const defaultRate = getFixedExpenseDefaultInflationRate(rowId)
    const depensesFloats = prevMonthly.map((v) => v * (1 + defaultRate / 100))
    const depensesAnnual = Math.round(depensesFloats.reduce((a, b) => a + b, 0))
    const depenses = distributeAnnualRevenueBySeasonality(depensesAnnual, fondSeasonality)
    const withInflationFloats = prevMonthly.map(
      (v, m) => v * (1 + getFixedExpenseInflationRateForMonth(rowId, yearIndex, m) / 100)
    )
    const withInflationAnnual = Math.round(withInflationFloats.reduce((a, b) => a + b, 0))
    const withInflationMonthly =
      withInflationAnnual === 0
        ? Array.from({ length: 12 }, () => 0)
        : distributeAnnualRevenueBySeasonality(
            withInflationAnnual,
            withInflationFloats.map((v) => Math.max(0, v))
          )
    const amountMonthly = getExpenseAmountAdjustmentMonthlyAmounts(
      rowId,
      yearIndex,
      fondSeasonality
    )
    const avecAjustement = withInflationMonthly.map((v, i) => v + (amountMonthly[i] ?? 0))
    const ajustement = avecAjustement.map((v, i) => v - (depenses[i] ?? 0))
    return { depenses, ajustement, avecAjustement }
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
    if (disableRowInteractions) return
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

    const rowId = editingTypeRateRowId
    const priorType = getExpenseType(rowId)

    // Update expense type
    updateExpenseType(rowId, tempExpenseType)
    
    // Update variable rate if type is variable
    if (tempExpenseType === "variable") {
      updateVariableRate(editingTypeRateRowId, tempVariableRate)
      // Remove specific inflation rate if switching from fixe to variable
      removeSpecificInflationRate(editingTypeRateRowId)
    } else {
      // Update specific inflation rate if type is fixe
      if (tempSpecificInflationRate !== null) {
        updateSpecificInflationRate(rowId, tempSpecificInflationRate)
      } else {
        // Remove specific rate to use global rate
        removeSpecificInflationRate(rowId)
      }
    }
    
    // Dépenses fixes : recalcul par défaut base × (1 + inflation)^année — retirer surcharges années projetées et hypothèses si passage variable → fixe.
    if (tempExpenseType === "fixe") {
      setRevenueValues((prev) => {
        const updated = { ...prev }
        for (let y = 1; y <= projectionYears; y++) {
          delete updated[`${rowId}-${y}`]
        }
        return updated
      })
      if (priorType === "variable") {
        setExpenseAdjustments((prev) => {
          const prefix = `${rowId}-`
          const next = { ...prev }
          let touched = false
          for (const k of Object.keys(next)) {
            if (k.startsWith(prefix)) {
              delete next[k]
              touched = true
            }
          }
          return touched ? next : prev
        })
      }
    }
    
    setTypeRateModalOpen(false)
    setEditingTypeRateRowId(null)
  }

  // Open adjustment modal (for adding a new adjustment)
  const openAdjustmentModal = (rowId: string, yearIndex: number, adjustmentId?: string) => {
    setRevenueHypothesisDeleteConfirmOpen(false)
    setEditingAdjustment({ rowId, yearIndex })
    setReplicateRevenueAdjustmentToFollowingYears(false)
    if (title === "Estimation des revenus annuels") {
      // Revenue adjustments
      if (adjustmentId) {
        // Editing existing revenue adjustment
        const existingAdjustment = getRevenueAdjustmentById(adjustmentId)
        if (existingAdjustment) {
          setEditingAdjustmentId(adjustmentId)
          setRevenueAdjustmentType(existingAdjustment.type)
          setRevenueHypothesisValueFromNumber(existingAdjustment.value, existingAdjustment.type)
          setAdjustmentNote(existingAdjustment.note || "")
          const cash = parseRevenueCollectionCashFromStorage(existingAdjustment)
          setRevenueCollectionBuckets(
            cash.advancedBuckets?.length
              ? cash.advancedBuckets
              : createDefaultAdvancedBuckets(0)
          )
          setRevenueSeasonalityMonthPercents(
            hasStoredSeasonalityMonthPercents(existingAdjustment)
              ? parseSeasonalityMonthPercentsFromStorage(existingAdjustment)
              : resolveRevenueActualSeasonality(rowId).averagePercents
          )
          setRevenueSeasonalityAwaitingActuals(!hasStoredSeasonalityMonthPercents(existingAdjustment))
          if (existingAdjustment.type === "custom" && existingAdjustment.customGrowth?.variables?.length) {
            const cg = existingAdjustment.customGrowth
            setRevenueCustomDraftRows(
              cg.variables.map((v) => {
                const yoy = v.yearOverYear
                return {
                  id: v.id,
                  label: v.label,
                  kind: v.kind,
                  valueInput: yoy
                    ? ""
                    : v.kind === "currency"
                      ? formatDraftNumberForInput(v.value)
                      : String(v.value),
                  yoyGrowthMode: yoy?.mode ?? "percent",
                  yoyGrowthValueInput: yoy !== undefined ? String(yoy.delta) : undefined,
                }
              })
            )
            setRevenueCustomFormula(cg.formula)
          } else {
            setRevenueCustomDraftRows([])
            setRevenueCustomFormula("")
          }
        }
      } else {
        // Un seul ajustement par année : ouvrir en modification si un ajustement existe déjà.
        const existingRevenue = getRevenueAdjustments(rowId, yearIndex)
        if (existingRevenue.length > 0) {
          const only = existingRevenue[existingRevenue.length - 1]!
          setEditingAdjustmentId(only.id)
          setRevenueAdjustmentType(only.type)
          setRevenueHypothesisValueFromNumber(only.value, only.type)
          setAdjustmentNote(only.note || "")
          const cash = parseRevenueCollectionCashFromStorage(only)
          setRevenueCollectionBuckets(
            cash.advancedBuckets?.length
              ? cash.advancedBuckets
              : createDefaultAdvancedBuckets(0)
          )
          setRevenueSeasonalityMonthPercents(
            hasStoredSeasonalityMonthPercents(only)
              ? parseSeasonalityMonthPercentsFromStorage(only)
              : resolveRevenueActualSeasonality(rowId).averagePercents
          )
          setRevenueSeasonalityAwaitingActuals(!hasStoredSeasonalityMonthPercents(only))
          if (only.type === "custom" && only.customGrowth?.variables?.length) {
            const cg = only.customGrowth
            setRevenueCustomDraftRows(
              cg.variables.map((v) => {
                const yoy = v.yearOverYear
                return {
                  id: v.id,
                  label: v.label,
                  kind: v.kind,
                  valueInput: yoy
                    ? ""
                    : v.kind === "currency"
                      ? formatDraftNumberForInput(v.value)
                      : String(v.value),
                  yoyGrowthMode: yoy?.mode ?? "percent",
                  yoyGrowthValueInput: yoy !== undefined ? String(yoy.delta) : undefined,
                }
              })
            )
            setRevenueCustomFormula(cg.formula)
          } else {
            setRevenueCustomDraftRows([])
            setRevenueCustomFormula("")
          }
        } else {
          setEditingAdjustmentId(null)
          setRevenueAdjustmentType("amount")
          setRevenueHypothesisValueFromNumber(0, "amount")
          setRevenueCustomDraftRows([])
          setRevenueCustomFormula("")
          setAdjustmentNote("")
          setRevenueCollectionBuckets(createDefaultAdvancedBuckets(0))
          setRevenueSeasonalityMonthPercents(resolveRevenueActualSeasonality(rowId).averagePercents)
          setRevenueSeasonalityAwaitingActuals(true)
        }
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
          if (existingAdjustment.type === "inflation") {
            setAdjustmentInflationRate(existingAdjustment.inflationRate ?? getInflationRate(rowId))
          } else {
            initExpenseHypothesisInflationFields(rowId)
          }
          setAdjustmentIsRecurring(
            existingAdjustment.type === "amount" && getExpenseType(rowId) === "variable"
              ? false
              : existingAdjustment.isRecurring
          )
          setAdjustmentAmountMonthPercents(
            existingAdjustment.amountMonthPercents?.length === 12
              ? normalizeForecastSeasonalityMonthPercents(existingAdjustment.amountMonthPercents)
              : createDefaultForecastSeasonalityMonthPercents()
          )
          setAdjustmentActiveMonths(
            Array.isArray(existingAdjustment.activeMonths) && existingAdjustment.activeMonths.length === 12
              ? existingAdjustment.activeMonths.map((v) => v === true)
              : Array.from({ length: 12 }, () => true)
          )
          setAdjustmentStartMonth(
            typeof existingAdjustment.startMonth === "number" &&
              existingAdjustment.startMonth >= 0 &&
              existingAdjustment.startMonth <= 11
              ? existingAdjustment.startMonth
              : 0
          )
          setAdjustmentNote(existingAdjustment.note || "")
        }
      } else {
        // Adding new adjustment
        setEditingAdjustmentId(null)
        setAdjustmentType("amount")
        setAdjustmentAmount(0)
        setAdjustmentPercentage(0)
        setAdjustmentIsRecurring(false)
        setAdjustmentAmountMonthPercents(createDefaultForecastSeasonalityMonthPercents())
        setAdjustmentActiveMonths(Array.from({ length: 12 }, () => true))
        setAdjustmentStartMonth(0)
        setAdjustmentNote("")
        initExpenseHypothesisInflationFields(rowId)
      }
      loadExpenseDisbursementFields(rowId, yearIndex)
      loadExpenseSeasonalityFields(rowId, yearIndex)
      setReplicateExpenseDisbursementToFollowingYears(false)
      setReplicateExpenseSeasonalityToFollowingYears(false)
    }
    if (title === "Estimation des revenus annuels") {
      setLineAnalysis(null)
      setRevenueHypothesisPanelOpen(true)
    } else if (title === "Estimation des dépenses annuelles") {
      setLineAnalysis(null)
      setExpenseHypothesisPanelOpen(true)
    }
  }

  const closeRevenueHypothesisPanel = useCallback(() => {
    setRevenueHypothesisDeleteConfirmOpen(false)
    setRevenueHypothesisPanelOpen(false)
    setEditingAdjustment(null)
    setEditingAdjustmentId(null)
    setRevenueAdjustmentType("amount")
    setRevenueAdjustmentValue(0)
    setRevenueAdjustmentValueInput("0")
    setRevenueCustomDraftRows([])
    setRevenueCustomFormula("")
    setAdjustmentNote("")
    setReplicateRevenueAdjustmentToFollowingYears(false)
    setReplicateRevenueEncashmentToFollowingYears(false)
    setRevenueCollectionBuckets(createDefaultAdvancedBuckets(0))
    setRevenueSeasonalityMonthPercents(createDefaultRevenueSeasonalityMonthPercents())
    setRevenueSeasonalityAwaitingActuals(false)
  }, [])

  const returnToRevenueHypothesisRow = useCallback(() => {
    const rowId = editingAdjustment?.rowId
    closeRevenueHypothesisPanel()
    if (!rowId) return
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(`income-statement-detail-row-${rowId}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        })
      })
    })
  }, [editingAdjustment, closeRevenueHypothesisPanel])

  const closeExpenseHypothesisPanel = useCallback(() => {
    setExpenseHypothesisPanelOpen(false)
    setEditingAdjustment(null)
    setEditingAdjustmentId(null)
    setAdjustmentType("amount")
    setAdjustmentAmount(0)
    setAdjustmentPercentage(0)
    setAdjustmentInflationRate(2.0)
    setAdjustmentIsRecurring(false)
    setAdjustmentAmountMonthPercents(createDefaultForecastSeasonalityMonthPercents())
    setAdjustmentActiveMonths(Array.from({ length: 12 }, () => true))
    setAdjustmentStartMonth(0)
    setAdjustmentNote("")
    setExpenseHypothesisEditorTab("ajustement")
    setReplicateExpenseDisbursementToFollowingYears(false)
    setExpenseDisbursementBadDebtPercent(0)
    setExpenseDisbursementBuckets(createDefaultForecastCollectionBuckets(0))
    setExpenseCustomDelayDrafts({})
    setExpenseSeasonalityMonthPercents(createDefaultForecastSeasonalityMonthPercents())
    setExpenseSeasonalityAwaitingActuals(false)
    setReplicateExpenseSeasonalityToFollowingYears(false)
  }, [])

  const returnToExpenseHypothesisRow = useCallback(() => {
    const rowId = editingAdjustment?.rowId
    closeExpenseHypothesisPanel()
    if (!rowId) return
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(`income-statement-detail-row-${rowId}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        })
      })
    })
  }, [editingAdjustment, closeExpenseHypothesisPanel])

  /** Ouverture panneau hypothèses dépenses : faire défiler jusqu’à la ligne du poste (panneau inline sous la ligne). */
  useEffect(() => {
    if (title !== "Estimation des dépenses annuelles") return
    if (!expenseHypothesisPanelOpen || !editingAdjustment?.rowId) return
    let t1: number | undefined
    let t2: number | undefined
    const run = () => {
      document.getElementById(`income-statement-detail-row-${editingAdjustment.rowId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
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
  }, [title, expenseHypothesisPanelOpen, editingAdjustment?.rowId, editingAdjustment?.yearIndex])

  /** Ouverture panneau hypothèses revenus : défilement vers la ligne du poste (panneau inline sous la ligne). */
  useEffect(() => {
    if (title !== "Estimation des revenus annuels") return
    if (!revenueHypothesisPanelOpen || !editingAdjustment?.rowId) return
    let t1: number | undefined
    let t2: number | undefined
    const run = () => {
      document.getElementById(`income-statement-detail-row-${editingAdjustment.rowId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
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
  }, [title, revenueHypothesisPanelOpen, editingAdjustment?.rowId, editingAdjustment?.yearIndex])

  useEffect(() => {
    setRevenueCustomDelayDrafts({})
  }, [revenueHypothesisPanelOpen, editingAdjustment?.rowId, editingAdjustment?.yearIndex])

  /** Réinitialiser l’onglet seulement à l’ouverture du panneau ou au changement de poste — pas au changement d’année (comparaison rapide). */
  useEffect(() => {
    setRevenueHypothesisEditorTab("croissance")
  }, [revenueHypothesisPanelOpen, editingAdjustment?.rowId])

  useEffect(() => {
    setExpenseHypothesisEditorTab("ajustement")
  }, [expenseHypothesisPanelOpen, editingAdjustment?.rowId])

  useEffect(() => {
    setHypothesisSaveAck(false)
    if (hypothesisSaveAckTimeoutRef.current) {
      clearTimeout(hypothesisSaveAckTimeoutRef.current)
      hypothesisSaveAckTimeoutRef.current = null
    }
  }, [
    revenueHypothesisPanelOpen,
    expenseHypothesisPanelOpen,
    editingAdjustment?.rowId,
    editingAdjustment?.yearIndex,
  ])

  useEffect(() => {
    return () => {
      if (hypothesisSaveAckTimeoutRef.current) clearTimeout(hypothesisSaveAckTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    setExpenseCustomDelayDrafts({})
  }, [expenseHypothesisPanelOpen, editingAdjustment?.rowId, editingAdjustment?.yearIndex])

  useEffect(() => {
    if (title !== "Estimation des revenus annuels") {
      setRevenueHypothesisPanelOpen(false)
      setRevenueHypothesisDeleteConfirmOpen(false)
    }
    if (title !== "Estimation des dépenses annuelles") {
      setExpenseHypothesisPanelOpen(false)
    }
  }, [title])

  /** Retire espaces, espaces insécables et séparateurs de milliers pour parser un nombre. */
  const stripRevenueHypothesisNumberGrouping = (s: string) =>
    s
      .trim()
      .replace(/\s/g, "")
      .replace(/\u202f/g, "")
      .replace(/\u00a0/g, "")
      .replace(/,/g, ".")

  /** Affichage lisible : milliers séparés par un espace (montant $ et croissance $). Le % reste sans groupement. */
  const formatRevenueHypothesisValueForInput = (
    n: number,
    type: "amount" | "growthPercent" | "growthAmount" | "custom"
  ): string => {
    if (!Number.isFinite(n)) return "0"
    if (type === "growthPercent") {
      return String(n)
    }
    const sign = n < 0 ? "-" : ""
    const abs = Math.abs(Math.round(n))
    const digits = String(abs)
    const parts: string[] = []
    for (let i = digits.length; i > 0; i -= 3) {
      parts.unshift(digits.slice(Math.max(0, i - 3), i))
    }
    return sign + parts.join(" ")
  }

  /** Chaîne vide → 0 ; « - » / « + » seuls → saisie incomplète (null). */
  const parseRevenueHypothesisValueInput = (s: string): number | null => {
    const t = stripRevenueHypothesisNumberGrouping(s)
    if (t === "") return 0
    if (t === "+" || t === "-") return null
    const n = parseFloat(t)
    return Number.isFinite(n) ? n : null
  }

  const setRevenueHypothesisValueFromNumber = (
    n: number,
    forType?: "amount" | "growthPercent" | "growthAmount" | "custom"
  ) => {
    setRevenueAdjustmentValue(n)
    const t = forType ?? revenueAdjustmentType
    setRevenueAdjustmentValueInput(
      Number.isFinite(n) ? formatRevenueHypothesisValueForInput(n, t) : "0"
    )
  }

  // Save adjustment
  const flashHypothesisSaveAck = () => {
    setHypothesisSaveAck(true)
    if (hypothesisSaveAckTimeoutRef.current) clearTimeout(hypothesisSaveAckTimeoutRef.current)
    hypothesisSaveAckTimeoutRef.current = setTimeout(() => {
      setHypothesisSaveAck(false)
      hypothesisSaveAckTimeoutRef.current = null
    }, 2800)
  }

  const hypothesisSaveAckMessage = hypothesisSaveAck ? (
    <p
      role="status"
      aria-live="polite"
      data-testid="hypothesis-save-ack"
      className="flex items-center gap-1.5 text-xs font-medium text-emerald-800"
    >
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Modifications enregistrées
    </p>
  ) : null

  const saveAdjustment = () => {
    if (!editingAdjustment) {
      setRevenueHypothesisDeleteConfirmOpen(false)
      setRevenueHypothesisPanelOpen(false)
      setExpenseHypothesisPanelOpen(false)
      setEditingAdjustment(null)
      setEditingAdjustmentId(null)
      return
    }
    
    const key = `${editingAdjustment.rowId}-${editingAdjustment.yearIndex}`

    if (title === "Estimation des revenus annuels") {
      const rowId = editingAdjustment.rowId
      const y0 = editingAdjustment.yearIndex
      let parsedRevenue: number
      let customSnapshot: RevenueCustomGrowthSnapshot | undefined

      if (revenueAdjustmentType === "custom") {
        const yPrev = y0 - 1
        let built:
          | { ok: true; snapshot: RevenueCustomGrowthSnapshot; result: number }
          | { ok: false; error: string }
        if (yPrev >= 0) {
          const prevList = revenueAdjustments[`${rowId}-${yPrev}`]
          const prevSole = prevList?.[prevList.length - 1]
          if (prevSole?.type === "custom" && prevSole.customGrowth?.variables?.length) {
            const chain = collectConsecutiveCustomGrowthChain(rowId, yPrev, (rid, y) => {
              const arr = revenueAdjustments[`${rid}-${y}`]
              return arr?.[arr.length - 1]
            })
            const resolvedPrev = resolveCustomGrowthVariablesFromChain(chain)
            const prevMap = new Map(resolvedPrev.map((v) => [v.id, v.value]))
            built = buildRevenueCustomGrowthSnapshot(revenueCustomDraftRows, revenueCustomFormula, {
              mode: "yoy",
              previousEffectiveValuesById: prevMap,
            })
          } else {
            built = buildRevenueCustomGrowthSnapshot(revenueCustomDraftRows, revenueCustomFormula, {
              mode: "direct",
            })
          }
        } else {
          built = buildRevenueCustomGrowthSnapshot(revenueCustomDraftRows, revenueCustomFormula, {
            mode: "direct",
          })
        }
        if (!built.ok) {
          return
        }
        parsedRevenue = Math.round(built.result)
        customSnapshot = built.snapshot
      } else {
        const parsed = parseRevenueHypothesisValueInput(revenueAdjustmentValueInput)
        if (parsed === null) {
          return
        }
        parsedRevenue = parsed
        customSnapshot = undefined
      }

      const newIdWhenReplacing = !editingAdjustmentId ? generateId() : null
      const yearLabelsLen = forecastConfigYearCount
      const shouldReplicate =
        replicateRevenueAdjustmentToFollowingYears && y0 < yearLabelsLen - 1
      const shouldReplicateEncashmentOnly =
        !shouldReplicate &&
        replicateRevenueEncashmentToFollowingYears &&
        y0 < yearLabelsLen - 1
      const shouldReplicateSeasonalityOnly =
        !shouldReplicate &&
        !shouldReplicateEncashmentOnly &&
        replicateRevenueSeasonalityToFollowingYears &&
        y0 < yearLabelsLen - 1

      const cashSaved = buildCollectionCashForSave({
        buckets: revenueCollectionBuckets,
      })
      const seasonalitySaved = normalizeRevenueSeasonalityMonthPercents(revenueSeasonalityMonthPercents)

      setRevenueAdjustments((prev) => {
        const next: Record<string, RevenueAdjustment[]> = { ...prev }
        const key0 = `${rowId}-${y0}`

        const buildAdj = (y: number, id: string): RevenueAdjustment => ({
          id,
          rowId,
          yearIndex: y,
          type: revenueAdjustmentType,
          value: parsedRevenue,
          customGrowth: revenueAdjustmentType === "custom" ? customSnapshot : undefined,
          note: adjustmentNote,
          collectionCash: cashSaved,
          seasonalityMonthPercents: seasonalitySaved,
        })

        const existing0 = prev[key0] || []

        if (editingAdjustmentId) {
          const updated0 = existing0.map((adj) => {
            if (adj.id !== editingAdjustmentId) return adj
            const { collectionPercents: _p, collectionSchedule: _s, collectionCash: _c, ...rest } =
              adj as RevenueAdjustment & {
                collectionPercents?: number[]
                collectionSchedule?: { offsetMonths: number; percent: number }[]
                collectionCash?: RevenueCollectionCash
              }
            return {
              ...rest,
              type: revenueAdjustmentType,
              value: parsedRevenue,
              customGrowth: revenueAdjustmentType === "custom" ? customSnapshot : undefined,
              note: adjustmentNote,
              collectionCash: cashSaved,
              seasonalityMonthPercents: seasonalitySaved,
            }
          })
          const sole = updated0.find((a) => a.id === editingAdjustmentId)
          next[key0] = sole ? [sole] : []
        } else {
          next[key0] = [buildAdj(y0, newIdWhenReplacing!)]
        }

        if (shouldReplicate) {
          if (revenueAdjustmentType === "custom" && customSnapshot) {
            let layerVars = customSnapshot.variables
            for (let y = y0 + 1; y < yearLabelsLen; y++) {
              const derivedVars = layerVars.map((pv) => ({
                id: pv.id,
                label: pv.label,
                kind: pv.kind,
                value: pv.value,
                yearOverYear: { mode: "percent" as const, delta: 0 },
              }))
              const snapY: RevenueCustomGrowthSnapshot = {
                formula: customSnapshot.formula,
                variables: derivedVars,
              }
              const evY = evaluateRevenueCustomGrowth(snapY.formula, derivedVars)
              const valY = evY.ok ? Math.round(evY.result) : 0
              next[`${rowId}-${y}`] = [
                {
                  id: generateId(),
                  rowId,
                  yearIndex: y,
                  type: "custom",
                  value: valY,
                  customGrowth: snapY,
                  note: adjustmentNote,
                  collectionCash: cashSaved,
                  seasonalityMonthPercents: seasonalitySaved,
                },
              ]
              layerVars = derivedVars
            }
          } else {
            for (let y = y0 + 1; y < yearLabelsLen; y++) {
              next[`${rowId}-${y}`] = [buildAdj(y, generateId())]
            }
          }
        } else if (shouldReplicateEncashmentOnly) {
          for (let y = y0 + 1; y < yearLabelsLen; y++) {
            const keyY = `${rowId}-${y}`
            const arr = next[keyY]
            const sole = arr?.[arr.length - 1]
            if (sole) {
              const { collectionPercents: _p, collectionSchedule: _s, collectionCash: _c, ...rest } =
                sole as RevenueAdjustment & {
                  collectionPercents?: number[]
                  collectionSchedule?: { offsetMonths: number; percent: number }[]
                  collectionCash?: RevenueCollectionCash
                }
              next[keyY] = [{ ...rest, collectionCash: cashSaved }]
            }
          }
        } else if (shouldReplicateSeasonalityOnly) {
          for (let y = y0 + 1; y < yearLabelsLen; y++) {
            const keyY = `${rowId}-${y}`
            const arr = next[keyY]
            const sole = arr?.[arr.length - 1]
            if (sole) {
              next[keyY] = [{ ...sole, seasonalityMonthPercents: seasonalitySaved }]
            }
          }
        }

        return next
      })

      if (newIdWhenReplacing) {
        setEditingAdjustmentId(newIdWhenReplacing)
      }
      setRevenueAdjustmentValue(parsedRevenue)
      setRevenueAdjustmentValueInput(
        formatRevenueHypothesisValueForInput(
          parsedRevenue,
          revenueAdjustmentType === "custom" ? "amount" : revenueAdjustmentType
        )
      )
      setRevenueCollectionBuckets(
        cashSaved.advancedBuckets?.length
          ? cashSaved.advancedBuckets
          : createDefaultAdvancedBuckets(0)
      )
      setRevenueSeasonalityMonthPercents(seasonalitySaved)
      setReplicateRevenueAdjustmentToFollowingYears(false)
      setReplicateRevenueEncashmentToFollowingYears(false)
      setReplicateRevenueSeasonalityToFollowingYears(false)
      flashHypothesisSaveAck()
    } else {
      // Expense adjustments
      const expenseRowId = editingAdjustment.rowId
      const yearIdx = editingAdjustment.yearIndex
      const isFixe = getExpenseType(expenseRowId) === "fixe"
      const disbursementSaved = buildForecastCollectionCashForSave({
        badDebtPercent: 0,
        buckets: expenseDisbursementBuckets,
        preRevenueNeed: { enabled: false, advanceDays: 30 },
      })
      const seasonalitySaved = normalizeForecastSeasonalityMonthPercents(expenseSeasonalityMonthPercents)
      const canReplicateDisbursement = yearIdx < forecastConfigYearCount - 1
      const saveSeasonalityOnly =
        expenseHypothesisEditorTab === "saisonnalite" &&
        adjustmentType !== "inflation" &&
        adjustmentType === "amount" &&
        adjustmentAmount === 0 &&
        adjustmentPercentage === 0
      if (!saveSeasonalityOnly) {
        if (adjustmentType === "amount" && adjustmentAmount === 0) {
          setExpenseHypothesisPanelOpen(false)
          setEditingAdjustment(null)
          setEditingAdjustmentId(null)
          return
        }
        if (adjustmentType === "percentage" && adjustmentPercentage === 0) {
          setExpenseHypothesisPanelOpen(false)
          setEditingAdjustment(null)
          setEditingAdjustmentId(null)
          return
        }
        if (adjustmentType === "inflation" && isFixe) {
          clearFixedExpenseProjectedYearOverrides(expenseRowId)
        }
      }

      if (!saveSeasonalityOnly) {
      setExpenseAdjustments((prev) => {
        const existingAdjustments = (prev[key] || []).filter((a) => !isExpenseHypothesisMetaOnly(a))

        const patchFromForm = (adj: ExpenseAdjustment): ExpenseAdjustment => {
          if (adjustmentType === "inflation" && isFixe) {
            return {
              ...adj,
              type: "inflation",
              amount: undefined,
              percentage: undefined,
              inflationRate: adjustmentInflationRate,
              isRecurring: adjustmentIsRecurring,
              note: adjustmentNote,
              disbursementCash: disbursementSaved,
              seasonalityMonthPercents: seasonalitySaved,
              amountMonthPercents: undefined,
              activeMonths: !adjustmentIsRecurring ? adjustmentActiveMonths : undefined,
              startMonth: adjustmentIsRecurring ? adjustmentStartMonth : undefined,
            }
          }
          const isVariableRow = getExpenseType(expenseRowId) === "variable"
          const isFixedRow = getExpenseType(expenseRowId) === "fixe"
          const patched = {
            ...adj,
            type: adjustmentType,
            amount: adjustmentType === "amount" ? adjustmentAmount : undefined,
            percentage: adjustmentType === "percentage" ? adjustmentPercentage : undefined,
            inflationRate: undefined,
            isRecurring:
              adjustmentType === "amount" && isVariableRow ? false : adjustmentIsRecurring,
            note: adjustmentNote,
            disbursementCash: disbursementSaved,
            seasonalityMonthPercents: seasonalitySaved,
            amountMonthPercents:
              adjustmentType === "amount" && !(isFixedRow && adjustmentIsRecurring)
                ? normalizeForecastSeasonalityMonthPercents(adjustmentAmountMonthPercents)
                : undefined,
            activeMonths:
              adjustmentType === "percentage" && !adjustmentIsRecurring
                ? adjustmentActiveMonths
                : undefined,
            startMonth:
              (adjustmentType === "percentage" && adjustmentIsRecurring) ||
              (adjustmentType === "amount" && isFixedRow && adjustmentIsRecurring)
                ? adjustmentStartMonth
                : undefined,
          }
          return patched
        }

        if (editingAdjustmentId) {
          const updatedAdjustments = existingAdjustments.map((adj) =>
            adj.id === editingAdjustmentId ? patchFromForm(adj) : adj
          )
          return {
            ...prev,
            [key]: updatedAdjustments,
          }
        }

        const newAdjustment: ExpenseAdjustment = {
          ...patchFromForm({
            id: "",
            rowId: editingAdjustment.rowId,
            yearIndex: editingAdjustment.yearIndex,
            type: adjustmentType,
            isRecurring: adjustmentIsRecurring,
            note: adjustmentNote,
          }),
          id: generateId(),
        }
        return {
          ...prev,
          [key]: [...existingAdjustments, newAdjustment],
        }
      })
      }

      applyExpenseDisbursementToYear(
        expenseRowId,
        yearIdx,
        disbursementSaved,
        replicateExpenseDisbursementToFollowingYears && canReplicateDisbursement
      )
      applyExpenseSeasonalityToYear(
        expenseRowId,
        yearIdx,
        seasonalitySaved,
        replicateExpenseSeasonalityToFollowingYears && canReplicateDisbursement
      )

      setExpenseSeasonalityMonthPercents(seasonalitySaved)
      setReplicateExpenseDisbursementToFollowingYears(false)
      setReplicateExpenseSeasonalityToFollowingYears(false)
      setEditingAdjustmentId(null)
      setAdjustmentType("amount")
      setAdjustmentAmount(0)
      setAdjustmentPercentage(0)
      initExpenseHypothesisInflationFields(expenseRowId)
      setAdjustmentIsRecurring(false)
      setAdjustmentAmountMonthPercents(createDefaultForecastSeasonalityMonthPercents())
      setAdjustmentActiveMonths(Array.from({ length: 12 }, () => true))
      setAdjustmentStartMonth(0)
      setAdjustmentNote("")
      flashHypothesisSaveAck()
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
    if (disableRowInteractions) return
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
    if (disableRowInteractions) return
    setRevenueHypothesisDeleteConfirmOpen(false)
    setRevenueHypothesisPanelOpen(false)
    setExpenseHypothesisPanelOpen(false)
    setLineAnalysis((prev) => {
      const next = prev?.rowId === snapshot.rowId ? null : snapshot
      if (next) {
        setLineAnalysisView("current")
        setShowAllAnalysisAccounts(false)
      }
      return next
    })
  }, [disableRowInteractions])

  /** Détail : postes « Annexe » (sommaire) ; sous-lignes detailOnly indentées sous l’annexe. */
  const mapBackendRowsDefinedOnly = (
    apiRows: FinancialStatementRow[],
    structure: Record<string, unknown>[]
  ): DetailRow[] => {
    const defined = apiRows.filter((row) => {
      const sr = findStructureRowForStatementLine(row.id, row.label, structure)
      return sr !== undefined && isShowInDetail(sr, structure) && isCodeMappingEnabled(sr)
    })
    const sorted = uniqueStatementRowsByStructureIndex(defined, structure)
    return sorted.map((row) => {
      const { structRow: sr, sub, annexLetter, isAnnexTitle } = resolveDetailAnnexMeta(
        row,
        structure,
        sorted,
      )
      const rawDetail = row.detailRows
      const balanceAccounts =
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
        label: detailLineLabelForDisplay(sr, row.label, annexLetter || undefined),
        statementLabel: row.label,
        annexLetter,
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
      return sr !== undefined && isShowInDetail(sr, structure) && isCodeMappingEnabled(sr)
    })
    return uniqueStatementRowsByStructureIndex(defined, structure)
  }, [])

  // Convert series API data to DetailRow[] for monthly views (12months)
  const getSeriesDetailRows = (): DetailRow[] => {
    if (!seriesRows.length || !seriesPeriods.length || !incomeStatementStructure) return []
    const sorted = filterSeriesRowsDefinedOnly(seriesRows, incomeStatementStructure)
    return sorted.map((row) => {
      const trend = monthTrendFromReference(row, seriesPeriods, refMonth, refYear, 12)
      const lastAmount = trend[0] || 0
      const priorAmount = trend.length >= 2 ? trend[1] || 0 : 0
      const { structRow: sr, sub, annexLetter, isAnnexTitle } = resolveDetailAnnexMeta(
        row,
        incomeStatementStructure,
        sorted,
      )
      const balanceAccountsRaw = balanceAccountsFromSeriesRowDetail(
        row,
        seriesPeriods,
        "12months",
        refMonth,
        refYear
      )
      const balanceAccounts =
        balanceAccountsRaw &&
        balanceSheetDetailRowsLookLikeGlAccounts(
          balanceAccountsRaw.map((a) => ({ id: a.accountNumber })),
          standardLinkCodes,
        )
          ? balanceAccountsRaw
          : undefined
      return zeroAmountsForAnnexTitleRow({
        label: detailLineLabelForDisplay(sr, row.label, annexLetter || undefined),
        statementLabel: row.label,
        annexLetter,
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
      const trend = incomeStatementQuarterTrendForBasis(
        row,
        seriesPeriods,
        refMonth,
        refYear,
        periodBasis,
        fiscalYearEndMonth,
        INCOME_STATEMENT_QUARTER_COUNT,
      )
      const lastAmount = trend[0] || 0
      const priorAmount = trend.length >= 2 ? trend[1] || 0 : 0
      const { structRow: sr, sub, annexLetter, isAnnexTitle } = resolveDetailAnnexMeta(
        row,
        incomeStatementStructure,
        sorted,
      )
      const balanceAccountsRaw = balanceAccountsFromSeriesRowDetail(
        row,
        seriesPeriods,
        "quarters",
        refMonth,
        refYear,
        periodBasis,
        fiscalYearEndMonth,
      )
      const balanceAccounts =
        balanceAccountsRaw &&
        balanceSheetDetailRowsLookLikeGlAccounts(
          balanceAccountsRaw.map((a) => ({ id: a.accountNumber })),
          standardLinkCodes,
        )
          ? balanceAccountsRaw
          : undefined
      return zeroAmountsForAnnexTitleRow({
        label: detailLineLabelForDisplay(sr, row.label, annexLetter || undefined),
        statementLabel: row.label,
        annexLetter,
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
      const trend = forceForecastSection && forecastUseSeriesActuals
        ? (() => {
            const baseYear = forecastBaseYear ?? new Date().getFullYear()
            const prefix = forecastActualPrefixValues(
              forecastActualLayoutEffective,
              row,
              seriesPeriods,
              refMonth,
              refYear,
              fiscalYearEndMonth,
              baseYear,
            )
            return forecastTrendFromActualPrefix(prefix, projectionYears)
          })()
        : incomeStatementYearTrendForBasis(
            row,
            seriesPeriods,
            refMonth,
            refYear,
            periodBasis,
            fiscalYearEndMonth,
            PERFORMANCE_CHART_YEAR_COUNT + 1,
          )
      const lastAmount = trend[0] || 0
      const priorAmount = trend.length >= 2 ? trend[1] || 0 : 0
      const { structRow: sr, sub, annexLetter, isAnnexTitle } = resolveDetailAnnexMeta(
        row,
        incomeStatementStructure,
        sorted,
      )
      const balanceAccountsRaw = balanceAccountsFromSeriesRowDetail(
        row,
        seriesPeriods,
        "years",
        refMonth,
        refYear,
        periodBasis,
        fiscalYearEndMonth,
        forceForecastSection,
      )
      const balanceAccounts =
        balanceAccountsRaw &&
        balanceSheetDetailRowsLookLikeGlAccounts(
          balanceAccountsRaw.map((a) => ({ id: a.accountNumber })),
          standardLinkCodes,
        )
          ? balanceAccountsRaw
          : undefined
      return zeroAmountsForAnnexTitleRow({
        label: detailLineLabelForDisplay(sr, row.label, annexLetter || undefined),
        statementLabel: row.label,
        annexLetter,
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

  /** Postes détail des Hypothèses revenus (même périmètre que la colonne CA / ligne Revenus). */
  const listRevenueHypothesisPostIds = (): string[] => {
    if (!incomeStatementStructure?.length) {
      return listRevenueHypothesisPostIdsFromConfigKeys(seriesRows, revenueAdjustments, revenueValues)
    }
    if (structureHasRevenuePosteNatureRow(incomeStatementStructure)) {
      let rows = filterSeriesRowsDefinedOnly(seriesRows, incomeStatementStructure).filter((sr) =>
        seriesRowBelongsToRevenueAnnexDetail(sr, incomeStatementStructure)
      )
      rows = uniqueStatementRowsByStructureIndex(
        ensureSeriesRowsForAnnexDetailScope(
          rows,
          incomeStatementStructure,
          structureRowBelongsToRevenueAnnexDetail,
          (structRow) => {
            const id =
              String(structRow.id ?? structRow.linkCode ?? "").trim() ||
              String(structRow.label ?? "").trim()
            const letter = resolveStructureAnnexLetter(structRow, incomeStatementStructure)
            return {
              id,
              label: String(structRow.label ?? "").trim() || id,
              linkCode: String(structRow.linkCode ?? "").trim() || undefined,
              isBold: Boolean(structRow.isBold),
              isSection: Boolean(structRow.isSection),
              isResult: Boolean(structRow.isResult),
              amounts: {},
              detailRows: [],
              annexLetter: letter || undefined,
              detailOnly: isStructureRowDetailOnly(structRow) || undefined,
            }
          },
        ),
        incomeStatementStructure,
      )
      const ids: string[] = []
      const seen = new Set<string>()
      for (const sr of rows) {
        if (sr.isSection) continue
        const structRow = findStructureRowForStatementLine(sr.id, sr.label, incomeStatementStructure)
        if (!structRow) continue
        if (!isStructureRowDetailOnly(structRow)) continue
        if (!sr.id || seen.has(sr.id)) continue
        seen.add(sr.id)
        ids.push(sr.id)
      }
      if (ids.length > 0) return ids
    }
    const fromConfig = listRevenueHypothesisPostIdsFromConfigKeys(
      seriesRows,
      revenueAdjustments,
      revenueValues,
    )
    if (fromConfig.length > 0) return fromConfig
    const sorted = filterSeriesRowsDefinedOnly(seriesRows, incomeStatementStructure)
    const revenueSeries =
      sorted.find((r) => normLabel(r.label) === "revenus" && !r.isSection) ??
      sorted.find((r) => normLabel(r.label) === "revenus") ??
      sorted.find((r) => normLabel(r.label) === "total revenus" && !r.isSection) ??
      sorted.find(
        (r) =>
          r.isResult &&
          normLabel(r.label).includes("revenu") &&
          (normLabel(r.label).includes("total") || normLabel(r.label).includes("totaux"))
      )
    return revenueSeries && !revenueSeries.isSection ? [revenueSeries.id] : []
  }

  const projectedAmountForRevenueHypothesisPost = (revenueRowId: string, yearIndex: number): number => {
    const trend = buildSeriesRevenueDefaultTrend(revenueRowId)
    return Math.abs(
      getProjectedRevenueRowValue(
        revenueRowId,
        yearIndex,
        trend[yearIndex] ?? 0,
        trend[0] ?? 0,
        trend
      )
    )
  }

  /** Saisonnalité d’un poste revenus pour l’année : stockée, sinon moyenne des exercices réels (comme Hypothèse revenus). */
  const seasonalityForRevenueHypothesisPost = (revenueRowId: string, yearIndex: number): number[] => {
    const list = getRevenueAdjustments(revenueRowId, yearIndex)
    const sole = list[list.length - 1]
    if (sole && hasStoredSeasonalityMonthPercents(sole)) {
      return parseForecastSeasonalityFromStorage(sole)
    }
    return resolveRevenueActualSeasonality(revenueRowId).averagePercents
  }

  /** Base revenus pour le % d'une dépense variable : toujours le total projeté (Hypothèse revenus). */
  const resolveVariableExpenseRevenueSource = (
    yearIndex: number
  ): { revenueRowId: string; defaultValue: number; baseAmount: number; projectedAmount?: number } | null => {
    if (!appliesExpenseHypothesisEngine) return null
    const defaultGrowthRate = 0.05

    const fromSeriesId = (revenueSeriesId: string) => {
      const sr = seriesRows.find((s) => s.id === revenueSeriesId)
      if (!sr) return null
      const rawAmounts = getRowAmounts(sr, seriesPeriods)
      const { amounts: yearlyAmounts } = aggregateToYears(rawAmounts, seriesPeriods)
      const baseAmount = yearlyAmounts.length > 0 ? yearlyAmounts[yearlyAmounts.length - 1] : 0
      const defaultValue =
        yearIndex === 0 ? baseAmount : Math.round(baseAmount * Math.pow(1 + defaultGrowthRate, yearIndex))
      return { revenueRowId: sr.id, defaultValue, baseAmount }
    }

    const fb = expenseRevenueForecastFallbackRef.current
    if (fb) {
      return {
        revenueRowId: fb.rowId,
        defaultValue: fb.trend[yearIndex] ?? 0,
        baseAmount: fb.trend[0] ?? 0,
        projectedAmount: fb.trend[yearIndex] ?? 0,
      }
    }

    const postIds = listRevenueHypothesisPostIds()
    if (postIds.length > 0) {
      const amount = postIds.reduce(
        (sum, id) => sum + projectedAmountForRevenueHypothesisPost(id, yearIndex),
        0
      )
      return {
        revenueRowId: postIds[0]!,
        defaultValue: amount,
        baseAmount: postIds.reduce(
          (sum, id) => sum + projectedAmountForRevenueHypothesisPost(id, 0),
          0
        ),
        projectedAmount: amount,
      }
    }

    if (!incomeStatementStructure?.length) return null
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
    if (revenueSeries && !revenueSeries.isSection) {
      return fromSeriesId(revenueSeries.id)
    }
    return null
  }

  /**
   * Saisonnalité des revenus totaux pour l’année projetée =
   * Σ (CA_poste × saisonnalité_poste) sur les postes d’Hypothèse revenus, renormalisé à 100 %.
   */
  const getLinkedRevenueSeasonalityForVariableExpense = (
    expenseRowId: string,
    yearIndex: number
  ): { revenueRowId: string; monthPercents: number[]; linkLabel: string } | null => {
    if (getExpenseType(expenseRowId) !== "variable") return null
    const postIds = listRevenueHypothesisPostIds()
    if (postIds.length === 0) {
      const source = resolveVariableExpenseRevenueSource(yearIndex)
      if (!source) return null
      return {
        revenueRowId: source.revenueRowId,
        monthPercents: seasonalityForRevenueHypothesisPost(source.revenueRowId, yearIndex),
        linkLabel: "Revenus totaux",
      }
    }
    const contributions = postIds.map((id) => ({
      weight: projectedAmountForRevenueHypothesisPost(id, yearIndex),
      monthPercents: seasonalityForRevenueHypothesisPost(id, yearIndex),
    }))
    const monthPercents = weightedSeasonalityMonthPercents(contributions)
    return {
      revenueRowId: postIds[0]!,
      monthPercents,
      linkLabel: "Revenus totaux",
    }
  }

  /** Dépenses sans saisonnalité stockée : fixe → moyenne des exercices réels ; variable → revenus totaux. */
  useEffect(() => {
    if (!expenseSeasonalityAwaitingActuals || !editingAdjustment?.rowId) return
    const rowId = editingAdjustment.rowId
    const yearIndex = editingAdjustment.yearIndex
    const rowsReady = revenueActualSeasonalityRows.length > 0 || seriesRows.length > 0
    if (!rowsReady) return
    const expenseType = expenseTypes[rowId] || "variable"
    if (expenseType === "fixe") {
      setExpenseSeasonalityMonthPercents(resolveRevenueActualSeasonality(rowId).averagePercents)
      setExpenseSeasonalityAwaitingActuals(false)
      return
    }
    const linked = getLinkedRevenueSeasonalityForVariableExpense(rowId, yearIndex)
    if (linked) {
      setExpenseSeasonalityMonthPercents(linked.monthPercents)
    }
    setExpenseSeasonalityAwaitingActuals(false)
  }, [
    expenseSeasonalityAwaitingActuals,
    editingAdjustment?.rowId,
    editingAdjustment?.yearIndex,
    expenseTypes,
    revenueActualSeasonalityRows,
    revenueActualSeasonalityPeriods,
    seriesRows,
    seriesPeriods,
    revenueAdjustments,
    revenueValues,
  ])

  // Get base value (without adjustments) for a specific row and year
  const getBaseValue = (rowId: string, yearIndex: number, defaultValue: number, baseValue?: number): number => {
    const key = `${rowId}-${yearIndex}`
    // If value was manually edited, use it; otherwise use calculated default
    // Anciennes configs pouvaient enregistrer 0 sur les années projetées : pour les fixes, recalculer plutôt que d’afficher 0$
    if (revenueValues[key] !== undefined) {
      const phantomZeroFixe =
        appliesExpenseHypothesisEngine &&
        getExpenseType(rowId) === "fixe" &&
        yearIndex > 0 &&
        revenueValues[key] === 0
      if (!phantomZeroFixe) {
        return revenueValues[key]!
      }
    }
    
    // For fixed expenses, recalculate based on inflation if not manually edited
    if (appliesExpenseHypothesisEngine && getExpenseType(rowId) === "fixe" && yearIndex > 0) {
      // Get the base value (year 0) - either edited, provided, or default
      const baseKey = `${rowId}-0`
      const actualBase =
        revenueValues[baseKey] !== undefined
          ? revenueValues[baseKey]!
          : baseValue !== undefined
            ? baseValue
            : defaultValue
      return computeFixedExpenseYearValue(rowId, yearIndex, actualBase)
    }
    
    return defaultValue
  }

  /** Tendance par défaut (5 %/an) d’un poste de revenus de la série — sert de base aux hypothèses revenus. */
  const buildSeriesRevenueDefaultTrend = (revenueSeriesId: string): number[] => {
    const numYears = projectionYears + 1
    const defaultGrowthRate = 0.05
    const sr = seriesRows.find((s) => s.id === revenueSeriesId)
    if (!sr || !seriesPeriods.length) {
      return Array.from({ length: numYears }, () => 0)
    }
    const rawAmounts = getRowAmounts(sr, seriesPeriods)
    const { amounts: yearlyAmounts } = aggregateToYears(rawAmounts, seriesPeriods)
    const baseAmount = yearlyAmounts.length > 0 ? yearlyAmounts[yearlyAmounts.length - 1] : 0
    return Array.from({ length: numYears }, (_, yearIndex) =>
      yearIndex === 0
        ? baseAmount
        : Math.round(baseAmount * Math.pow(1 + defaultGrowthRate, yearIndex))
    )
  }

  /**
   * Revenu projeté d’un poste (hypothèses de « Estimation des revenus annuels »),
   * utilisable depuis la page dépenses pour lier % → montant variable.
   */
  const getProjectedRevenueRowValue = (
    revenueRowId: string,
    yearIndex: number,
    defaultValue: number,
    baseValue?: number,
    defaultTrendValues?: number[]
  ): number => {
    if (!isForecastSection) return defaultValue

    let calculatedValue = getBaseValue(revenueRowId, yearIndex, defaultValue, baseValue)
    const adjustments = getRevenueAdjustments(revenueRowId, yearIndex)
    if (adjustments.length === 0) return calculatedValue

    const adjustment = adjustments[adjustments.length - 1]!

    if (adjustment.type === "amount" || adjustment.type === "custom") {
      if (adjustment.type === "custom" && adjustment.customGrowth?.variables?.length) {
        const chain = collectConsecutiveCustomGrowthChain(revenueRowId, yearIndex, (rid, y) => {
          const list = getRevenueAdjustments(rid, y)
          return list[list.length - 1]
        })
        if (chain.length > 0) {
          const resolved = resolveCustomGrowthVariablesFromChain(chain)
          const ev = evaluateRevenueCustomGrowth(adjustment.customGrowth.formula, resolved)
          calculatedValue = ev.ok ? Math.round(ev.result) : Math.round(adjustment.value)
        } else {
          calculatedValue = Math.round(adjustment.value)
        }
      } else {
        calculatedValue = adjustment.value
      }
    } else {
      const growthPrev = forecastGrowthPreviousConfigYearIndex(yearIndex, forecastActualCols)
      let previousValue = calculatedValue
      if (growthPrev === "nMinusOne") {
        previousValue = nMinusOneActualForSeriesRow(revenueRowId)
      } else if (growthPrev != null) {
        const prevDefault = defaultTrendValues?.[growthPrev] ?? defaultValue
        previousValue = getProjectedRevenueRowValue(
          revenueRowId,
          growthPrev,
          prevDefault,
          baseValue,
          defaultTrendValues
        )
      }

      if (adjustment.type === "growthPercent") {
        calculatedValue = Math.round(previousValue * (1 + adjustment.value / 100))
      } else if (adjustment.type === "growthAmount") {
        calculatedValue = previousValue + adjustment.value
      }
    }

    return calculatedValue
  }

  /** Base affichée / calculée pour growth % et $ (N-1 si 1re année projetée + YTD). */
  const revenueGrowthPreviousProjectedAmount = (
    rowId: string,
    yearIndex: number,
    configTrend?: number[],
  ): number => {
    const growthPrev = forecastGrowthPreviousConfigYearIndex(yearIndex, forecastActualCols)
    if (growthPrev === "nMinusOne") return nMinusOneActualForSeriesRow(rowId)
    if (growthPrev == null) return 0
    const prevDefault = configTrend?.[growthPrev] ?? 0
    return getRevenueValue(rowId, growthPrev, prevDefault, undefined, configTrend)
  }

  const projectedRevenueForVariableExpenseLink = (
    revenueRowId: string,
    yearIndex: number,
    src: { defaultValue: number; baseAmount: number }
  ): number => {
    const revTrend = buildSeriesRevenueDefaultTrend(revenueRowId)
    return getProjectedRevenueRowValue(
      revenueRowId,
      yearIndex,
      revTrend[yearIndex] ?? src.defaultValue,
      src.baseAmount,
      revTrend
    )
  }

  const variableExpenseRevenueAmount = (yearIndex: number): number | null => {
    const src = resolveVariableExpenseRevenueSource(yearIndex)
    if (!src) return null
    if (src.projectedAmount != null) return src.projectedAmount
    return projectedRevenueForVariableExpenseLink(src.revenueRowId, yearIndex, src)
  }

  // Get forecast value for a specific row and year (uses edited values if available, applies adjustments).
  // `defaultTrendValues` lets growth adjustments use the proper (yearIndex-1) default instead of reusing the current year.
  const getRevenueValue = (
    rowId: string | undefined,
    yearIndex: number,
    defaultValue: number,
    baseValue?: number,
    defaultTrendValues?: number[]
  ): number => {
    if (!rowId || !isForecastSection) return defaultValue

    const seriesRowForId = seriesRows.find((r) => r.id === rowId)
    const hasRevenueConfigKeys =
      Object.keys(revenueAdjustments).some((k) => k.startsWith(`${rowId}-`)) ||
      Object.keys(revenueValues).some((k) => k.startsWith(`${rowId}-`))
    const hasExpenseConfigKeys =
      expenseTypes[rowId] != null ||
      variableRates[rowId] != null ||
      Object.keys(expenseAdjustments).some((k) => k.startsWith(`${rowId}-`))
    const isRevenueHypothesisRow =
      title === "Estimation des revenus annuels" ||
      (isProFormaResultsTitle &&
        ((!!incomeStatementStructure?.length &&
          !!seriesRowForId &&
          seriesRowBelongsToRevenueAnnexDetail(seriesRowForId, incomeStatementStructure)) ||
          hasRevenueConfigKeys))
    const isExpenseHypothesisRow =
      title === "Estimation des dépenses annuelles" ||
      (isProFormaResultsTitle &&
        ((!!incomeStatementStructure?.length &&
          !!seriesRowForId &&
          seriesRowBelongsToDepensesAnnexDetail(seriesRowForId, incomeStatementStructure)) ||
          hasExpenseConfigKeys))

    // Dépenses fixes : la base année 0 doit servir au composé — sinon baseValue manquant utilisait le mauvais défaut (même année)
    const effectiveBase =
      isExpenseHypothesisRow &&
      baseValue === undefined &&
      defaultTrendValues &&
      defaultTrendValues.length > 0
        ? defaultTrendValues[0]
        : baseValue

    if (isRevenueHypothesisRow) {
      return getProjectedRevenueRowValue(
        rowId,
        yearIndex,
        defaultValue,
        effectiveBase,
        defaultTrendValues
      )
    }

    let calculatedValue = getBaseValue(rowId, yearIndex, defaultValue, effectiveBase)

    if (isExpenseHypothesisRow) {
      const expenseIsVariable = getExpenseType(rowId) === "variable"
      const directAdjustments = getAdjustments(rowId, yearIndex).filter(isExpenseHypothesisGrowthAdjustment)
      const recurringAdjustments = getRecurringAdjustments(rowId, yearIndex).filter(
        isExpenseHypothesisGrowthAdjustment
      )

      if (expenseIsVariable && yearIndex > 0) {
        const revenueValue = variableExpenseRevenueAmount(yearIndex)
        const revSeason =
          getLinkedRevenueSeasonalityForVariableExpense(rowId, yearIndex)?.monthPercents ??
          createDefaultForecastSeasonalityMonthPercents()
        const revMonthly =
          revenueValue != null
            ? distributeAnnualRevenueBySeasonality(revenueValue, revSeason)
            : Array.from({ length: 12 }, () => 0)

        if (revenueValue != null) {
          let fromRates = 0
          for (let m = 0; m < 12; m++) {
            fromRates +=
              ((revMonthly[m] ?? 0) * getVariableExpenseRateForMonth(rowId, yearIndex, m)) / 100
          }
          calculatedValue = Math.round(fromRates)
        }

        // Montants $ non récurrents (coexistent avec les % ci-dessus).
        for (const adjustment of directAdjustments) {
          if (adjustment.type !== "amount") continue
          const amount = adjustment.amount || 0
          const months = adjustment.amountMonthPercents
          if (months?.length === 12) {
            const share = months.reduce((a, b) => a + Math.max(0, b), 0)
            calculatedValue += share === 0 ? 0 : Math.round(amount * (share / 100))
          } else {
            calculatedValue += amount
          }
        }
        // Pas de $ récurrent sur variable : la dépense suit déjà les revenus.
      } else {
        // Dépenses fixes (ou année 0) : ajouts en $ uniquement (base déjà via getBaseValue / inflation).
        for (const adjustment of directAdjustments) {
          if (adjustment.type === "amount") {
            calculatedValue = calculatedValue + (adjustment.amount || 0)
          }
        }
        for (const adjustment of recurringAdjustments) {
          if (adjustment.type === "amount") {
            const rate = getInflationRate(rowId)
            const yearsDiff = yearIndex - adjustment.yearIndex
            const adjustedAmount = (adjustment.amount || 0) * Math.pow(1 + rate / 100, yearsDiff)
            calculatedValue = calculatedValue + Math.round(adjustedAmount)
          }
        }
      }
    }

    return calculatedValue
  }

  const displayedHypothesisAmount = (
    rowId: string | undefined,
    displayIndex: number,
    defaultValue: number,
    trend?: number[],
  ): number => {
    if (!rowId || !isForecastSection) return defaultValue
    const cfg = forecastDisplayToConfigYearIndex(displayIndex, forecastActualCols)
    if (cfg == null) return defaultValue
    const configTrend = trend
      ? forecastDisplayTrendToConfigTrend(trend, forecastActualCols)
      : undefined
    return getRevenueValue(
      rowId,
      cfg,
      configTrend?.[cfg] ?? defaultValue,
      undefined,
      configTrend,
    )
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
        if (
          (title === "Estimation des dépenses annuelles" || isProFormaResultsTitle) &&
          rowId &&
          getExpenseType(rowId) === "fixe"
        ) {
          effectiveGrowthRate = 0 // Will be handled separately
        }

        // Calculate default value with compound growth
        let defaultValue: number
        if (yearIndex === 0) {
          defaultValue = base
        } else {
          // For fixed expenses with inflation, use compound inflation with year-specific rates
          if (
            (title === "Estimation des dépenses annuelles" || isProFormaResultsTitle) &&
            rowId &&
            getExpenseType(rowId) === "fixe"
          ) {
            defaultValue = computeFixedExpenseYearValue(rowId, yearIndex, base)
          } else if (
            (title === "Estimation des dépenses annuelles" || isProFormaResultsTitle) &&
            rowId &&
            getExpenseType(rowId) === "variable"
          ) {
            const variableRate = getVariableRate(rowId)
            if (variableRate > 0) {
              const revenueValue = variableExpenseRevenueAmount(yearIndex)
              if (revenueValue != null) {
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

      const useRevenueDetailScope =
        title === "Estimation des revenus annuels" &&
        !!incomeStatementStructure &&
        incomeStatementStructure.length > 0 &&
        structureHasRevenuePosteNatureRow(incomeStatementStructure)
      const useExpenseDetailScope =
        title === "Estimation des dépenses annuelles" &&
        !!incomeStatementStructure &&
        incomeStatementStructure.length > 0 &&
        structureHasDepensesPosteNatureRow(incomeStatementStructure)
      /** Même structure d’annexes / sous-totaux que États des résultats → Détail. */
      const useProFormaDetailAnnexShape =
        isProFormaResultsTitle &&
        !!incomeStatementStructure &&
        incomeStatementStructure.length > 0
      const belongsToAnnexScope = useRevenueDetailScope
        ? seriesRowBelongsToRevenueAnnexDetail
        : useExpenseDetailScope
          ? seriesRowBelongsToDepensesAnnexDetail
          : null
      let seriesForForecast = belongsToAnnexScope
        ? filterSeriesRowsDefinedOnly(seriesRows, incomeStatementStructure).filter((sr) =>
            belongsToAnnexScope(sr, incomeStatementStructure)
          )
        : useProFormaDetailAnnexShape
          ? filterSeriesRowsDefinedOnly(seriesRows, incomeStatementStructure)
          : seriesRows

      if ((useRevenueDetailScope || useExpenseDetailScope || useProFormaDetailAnnexShape) && incomeStatementStructure) {
        const belongsStruct = useExpenseDetailScope
          ? structureRowBelongsToDepensesAnnexDetail
          : useRevenueDetailScope
            ? structureRowBelongsToRevenueAnnexDetail
            : (structRow: Record<string, unknown>, structure: Record<string, unknown>[]) =>
                isShowInDetail(structRow, structure) &&
                isCodeMappingEnabled(structRow) &&
                // Impôts : Hypothèses Impôts au Sommaire — pas d’annexe Exigibles au Détail Pro Forma.
                !structureRowBelongsToImpotsAnnexDetail(structRow, structure)
        seriesForForecast = uniqueStatementRowsByStructureIndex(
          ensureSeriesRowsForAnnexDetailScope(
            seriesForForecast,
            incomeStatementStructure,
            belongsStruct,
            (structRow) => {
              const id =
                String(structRow.id ?? structRow.linkCode ?? "").trim() ||
                String(structRow.label ?? "").trim()
              const letter = resolveStructureAnnexLetter(structRow, incomeStatementStructure)
              return {
                id,
                label: String(structRow.label ?? "").trim() || id,
                linkCode: String(structRow.linkCode ?? "").trim() || undefined,
                isBold: Boolean(structRow.isBold),
                isSection: Boolean(structRow.isSection),
                isResult: Boolean(structRow.isResult),
                amounts: {},
                detailRows: [],
                annexLetter: letter || undefined,
                detailOnly: isStructureRowDetailOnly(structRow) || undefined,
              }
            },
          ),
          incomeStatementStructure,
        )
      }

      const seriesForForecastFiltered =
        title === "Estimation des dépenses annuelles" && incomeStatementStructure?.length
          ? seriesForForecast.filter(
              (sr) => !seriesRowUsesExcludedProjectionExpenseLinkCode(sr, incomeStatementStructure)
            )
          : useProFormaDetailAnnexShape && incomeStatementStructure?.length
            ? seriesForForecast.filter(
                (sr) => !seriesRowBelongsToImpotsAnnexDetail(sr, incomeStatementStructure)
              )
            : seriesForForecast

      const collectRevenueTrendForVariableExpense = (): { trend: number[]; rowId: string } | null => {
        if (!incomeStatementStructure || incomeStatementStructure.length === 0) return null
        const numYears = projectionYears + 1
        const postIds = listRevenueHypothesisPostIds()
        if (postIds.length > 0) {
          const trend = Array.from({ length: numYears }, (_, yearIndex) =>
            Math.round(
              postIds.reduce(
                (sum, id) => sum + projectedAmountForRevenueHypothesisPost(id, yearIndex),
                0
              )
            )
          )
          let nMinusOne: number | undefined
          if (forecastActualCols > 1 && seriesPeriods.length > 0) {
            const baseYear = forecastBaseYear ?? new Date().getFullYear()
            nMinusOne = Math.round(
              postIds.reduce((sum, id) => {
                const sr = seriesRows.find((row) => row.id === id)
                if (!sr) return sum
                const prefix = forecastActualPrefixValues(
                  forecastActualLayoutEffective,
                  sr,
                  seriesPeriods,
                  refMonth,
                  refYear,
                  fiscalYearEndMonth,
                  baseYear,
                )
                return sum + (prefix[0] ?? 0)
              }, 0),
            )
          }
          return { trend, rowId: postIds[0]!, nMinusOne }
        }
        const sorted = filterSeriesRowsDefinedOnly(seriesRows, incomeStatementStructure)
        const revenueSeries =
          sorted.find((r) => normLabel(r.label) === "revenus" && !r.isSection) ??
          sorted.find((r) => normLabel(r.label) === "revenus") ??
          sorted.find((r) => normLabel(r.label) === "total revenus" && !r.isSection) ??
          sorted.find(
            (r) =>
              r.isResult &&
              normLabel(r.label).includes("revenu") &&
              (normLabel(r.label).includes("total") || normLabel(r.label).includes("totaux"))
          )
        if (!revenueSeries || revenueSeries.isSection) return null
        const rawAmounts = getRowAmounts(revenueSeries, seriesPeriods)
        const { amounts: yearlyAmounts } = aggregateToYears(rawAmounts, seriesPeriods)
        const rowId = revenueSeries.id
        const actualYear = (forecastBaseYear ?? new Date().getFullYear()) - 1
        const year0 =
          forceForecastSection && forecastUseSeriesActuals
            ? yearTrendFromReference(revenueSeries, seriesPeriods, actualYear, 1)[0] || 0
            : yearlyAmounts.length > 0
              ? yearlyAmounts[yearlyAmounts.length - 1]
              : 0
        const defaultTrend = Array.from({ length: numYears }, (_, yearIndex) =>
          yearIndex === 0 ? year0 : Math.round(year0 * Math.pow(1.05, yearIndex))
        )
        const trend = defaultTrend.map((def, yearIndex) =>
          getProjectedRevenueRowValue(rowId, yearIndex, def, year0, defaultTrend)
        )
        return { trend, rowId }
      }

      if (useExpenseDetailScope || isProFormaResultsTitle) {
        expenseRevenueForecastFallbackRef.current = collectRevenueTrendForVariableExpense()
      } else {
        expenseRevenueForecastFallbackRef.current = null
      }

      const useAnnexDetailRowShape =
        useRevenueDetailScope || useExpenseDetailScope || useProFormaDetailAnnexShape

      for (const sr of seriesForForecastFiltered) {
        // Get real amounts and aggregate to yearly totals
        const rawAmounts = getRowAmounts(sr, seriesPeriods)
        const { amounts: yearlyAmounts } = aggregateToYears(rawAmounts, seriesPeriods)
        const baseAmount = yearlyAmounts.length > 0 ? yearlyAmounts[yearlyAmounts.length - 1] : 0
        const priorAmount = yearlyAmounts.length > 1 ? yearlyAmounts[yearlyAmounts.length - 2] : 0

        const isSection = sr.isSection
        const isResult = sr.isResult
        const rowId = sr.id

        const { structRow, sub, annexLetter: resolvedAnnexLetter, isAnnexTitle } =
          useAnnexDetailRowShape && incomeStatementStructure
            ? resolveDetailAnnexMeta(sr, incomeStatementStructure, seriesForForecastFiltered)
            : {
                structRow: undefined,
                sub: false,
                annexLetter: String(sr.annexLetter ?? "").trim(),
                isAnnexTitle: false,
              }

        const isBold =
          useAnnexDetailRowShape && structRow ? !sub : sr.isBold || isResult
        const indent =
          useAnnexDetailRowShape && structRow ? sub : !isBold && !isSection && !isResult

        /** Dépenses fixes : `rowId` requis pour base × (1 + inflation)^année (les lignes en gras n’étaient pas `indent` → inflation ignorée). */
        const forecastRowIdForTrend =
          (title === "Estimation des dépenses annuelles" || isProFormaResultsTitle) &&
          !isSection &&
          !isAnnexTitle
            ? rowId
            : useAnnexDetailRowShape && structRow
              ? sub
                ? rowId
                : undefined
              : indent
                ? rowId
                : undefined

        // Generate projected trend values
        let trendValues =
          isSection
            ? undefined
            : (forceForecastSection && forecastUseSeriesActuals)
              ? (() => {
                  const baseYear = forecastBaseYear ?? new Date().getFullYear()
                  const prefix = forecastActualPrefixValues(
                    forecastActualLayoutEffective,
                    sr,
                    seriesPeriods,
                    refMonth,
                    refYear,
                    fiscalYearEndMonth,
                    baseYear,
                  )
                  if (isResult) return forecastTrendFromActualPrefix(prefix.map(() => 0), projectionYears)
                  return forecastTrendFromActualPrefix(prefix, projectionYears)
                })()
              : generateForecastTrend(baseAmount, defaultGrowthRate, forecastRowIdForTrend)

        // Pro forma / hyp. : matérialiser les montants projetés dans trendValues (sinon totaux / résultats restent à 0).
        if (
          trendValues &&
          forecastRowIdForTrend &&
          !isSection &&
          !isResult &&
          (isProFormaResultsTitle ||
            title === "Estimation des revenus annuels" ||
            title === "Estimation des dépenses annuelles")
        ) {
          const configTrend = forecastDisplayTrendToConfigTrend(trendValues, forecastActualCols)
          trendValues = trendValues.map((raw, displayIdx) => {
            const cfg = forecastDisplayToConfigYearIndex(displayIdx, forecastActualCols)
            if (cfg == null) return raw
            return getRevenueValue(
              forecastRowIdForTrend,
              cfg,
              configTrend[cfg] ?? raw,
              undefined,
              configTrend,
            )
          })
        }

        let balanceAccounts: BalanceAccount[] | undefined
        if (projectionMode === "gl" && (sr.detailRows?.length ?? 0) > 0) {
          if (useAnnexDetailRowShape && structRow) {
            balanceAccounts = balanceAccountsFromSeriesRowDetail(
              sr,
              seriesPeriods,
              "years",
              refMonth,
              refYear,
              periodBasis,
              fiscalYearEndMonth,
              true,
            )
          } else if (indent) {
            balanceAccounts = sr.detailRows.map((dr) => {
              const drAmounts = seriesPeriods.map((p) => dr.amounts[`${p.fiscalYear}-${p.fiscalMonth}`] || 0)
              const drYearly = aggregateToYears(drAmounts, seriesPeriods)
              return {
                accountNumber: dr.id,
                accountName: dr.label,
                amount: drYearly.amounts.length > 0 ? drYearly.amounts[drYearly.amounts.length - 1] : 0,
                priorAmount: drYearly.amounts.length > 1 ? drYearly.amounts[drYearly.amounts.length - 2] : 0,
              }
            })
          }
        }

        const detailPayload: DetailRow = {
          label:
            useAnnexDetailRowShape && structRow
              ? detailLineLabelForDisplay(structRow, sr.label, resolvedAnnexLetter || undefined)
              : sr.label,
          current: baseAmount,
          prior: priorAmount,
          isBold,
          isSection,
          isSubtotal: isResult,
          indent,
          trendValues,
          rowId:
            title === "Estimation des dépenses annuelles"
              ? forecastRowIdForTrend
              : useAnnexDetailRowShape && structRow
                ? rowId
                : isProFormaResultsTitle
                  ? forecastRowIdForTrend
                  : indent
                    ? rowId
                    : undefined,
          balanceAccounts,
          ...(useAnnexDetailRowShape && structRow
            ? {
                statementLabel: sr.label,
                annexLetter: resolvedAnnexLetter,
                isAnnexTitle,
              }
            : {}),
        }

        rows.push(
          useAnnexDetailRowShape && structRow ? zeroAmountsForAnnexTitleRow(detailPayload) : detailPayload
        )

        // Recalculate subtotal trend values from child rows (pas Pro Forma : annexes + formules IS Détail).
        if (isResult && trendValues && !isProFormaResultsTitle) {
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
            // Trend values in forecast mode are projectionYears + 1.
            const len = trendValues.length
            for (let y = 0; y < len; y++) {
              trendValues[y] = childRows.reduce((sum, cr) => sum + (cr.trendValues?.[y] || 0), 0)
            }
          }
        }
      }

      if (useAnnexDetailRowShape) {
        const withoutEmptyTitles = omitAnnexTitleRowsWithoutAmountPosts(rows)
        const trendLen =
          withoutEmptyTitles.find((r) => r.trendValues != null)?.trendValues?.length ?? 0
        return insertAnnexDetailPlaceholderRows(
          withoutEmptyTitles,
          trendLen > 0 ? trendLen : undefined,
          {
            // Pro Forma = même Détail IS (sous-total + ligne vide) ; Hyp. Revenus/Dépenses sans indicatif.
            includeIndicatifAfterAnnex: isProFormaResultsTitle,
          },
        )
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
  if (!(view === "years" && isForecastSection)) {
    expenseRevenueForecastFallbackRef.current = null
  }

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
          return incomeStatementQuarterTrendForBasis(
            revenueSeries,
            seriesPeriods,
            refMonth,
            refYear,
            periodBasis,
            fiscalYearEndMonth,
            INCOME_STATEMENT_QUARTER_COUNT,
          )
        }
        if (view === "years") {
          return incomeStatementYearTrendForBasis(
            revenueSeries,
            seriesPeriods,
            refMonth,
            refYear,
            periodBasis,
            fiscalYearEndMonth,
            PERFORMANCE_CHART_YEAR_COUNT + 1,
          )
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
    periodBasis,
    fiscalYearEndMonth,
    filterSeriesRowsDefinedOnly,
    data,
  ])

  // Filter data to show only REVENUS section if title is "Estimation des revenus annuels"
  // (comportement historique) — sauf si au moins un poste a la nature « Revenus » (alors périmètre = annexes Détail).
  const revenueUsesPosteNatureFilter =
    title === "Estimation des revenus annuels" &&
    !!incomeStatementStructure &&
    incomeStatementStructure.length > 0 &&
    structureHasRevenuePosteNatureRow(incomeStatementStructure)

  if (title === "Estimation des revenus annuels" && !revenueUsesPosteNatureFilter) {
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

  if (title === "Détail" && !isForecastSection && incomeStatementStructure?.length) {
    data = filterIncomeStatementDetailRowsForHorizon(
      data,
      incomeStatementStructure,
      view as IncomeStatementHorizonView
    )
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
              const { structRow: sr, sub, annexLetter, isAnnexTitle } = resolveDetailAnnexMeta(
                row,
                incomeStatementStructure,
                sorted,
              )
              const balanceAccounts =
                seriesHorizon && periods.length > 0
                  ? balanceAccountsFromSeriesRowDetail(
                      row,
                      periods,
                      seriesHorizon,
                      refMonth,
                      refYear,
                      periodBasis,
                      fiscalYearEndMonth,
                    )
                  : undefined
              return zeroAmountsForAnnexTitleRow({
                label: detailLineLabelForDisplay(sr, row.label, annexLetter || undefined),
                statementLabel: row.label,
                annexLetter,
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

  /** Vue « années » : slider horizontal (Radix) pour faire défiler le tableau sans réduire les colonnes. */
  const tableUsesHorizontalSlider = view === "years" && !showStructureCols

  /** Hypothèses revenus : panneau pleine largeur sous la ligne du poste (plus d’aside à droite). */
  const revenueHypothesisInlineActive =
    title === "Estimation des revenus annuels" &&
    view === "years" &&
    !showStructureCols &&
    editingAdjustment != null &&
    revenueHypothesisPanelOpen

  const revenueHypothesisAnchorIdx =
    revenueHypothesisInlineActive && editingAdjustment?.rowId
      ? data.findIndex((r) => r.rowId === editingAdjustment.rowId)
      : -1

  /** Hypothèses dépenses : panneau pleine largeur sous la ligne du poste (plus d’aside à droite). */
  const expenseHypothesisInlineActive =
    title === "Estimation des dépenses annuelles" &&
    view === "years" &&
    !showStructureCols &&
    projectionMode === "account" &&
    editingAdjustment != null &&
    expenseHypothesisPanelOpen

  const expenseHypothesisAnchorIdx =
    expenseHypothesisInlineActive && editingAdjustment?.rowId
      ? data.findIndex((r) => r.rowId === editingAdjustment.rowId)
      : -1

  const hypothesisDesktopAsideOpen = false

  /** Vue années + hypothèse inline : le panneau ne doit pas gonfler le tableau (sinon `w-max` / `min-w-max` suivent le max-content). */
  const forecastHypothesisTableWidthLock =
    tableUsesHorizontalSlider && (revenueHypothesisInlineActive || expenseHypothesisInlineActive)

  useEffect(() => {
    if (!tableUsesHorizontalSlider) return
    const el = detailTableHScrollRef.current
    if (!el) return
    const sync = () => setDetailTableHScrollNonce((n) => n + 1)
    el.addEventListener("scroll", sync, { passive: true })
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    sync()
    return () => {
      el.removeEventListener("scroll", sync)
      ro.disconnect()
    }
  }, [
    tableUsesHorizontalSlider,
    showStructureCols,
    hypothesisDesktopAsideOpen,
    data.length,
    title,
    view,
    projectionYears,
  ])

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

  const showYearPctCa =
    (title === "Estimation des dépenses annuelles" || title === "Estimation des revenus annuels") &&
    view === "years" &&
    !showStructureCols
  const yearGroupStartClass = (yearIdx: number) =>
    showYearPctCa && yearIdx > 0 ? "border-l border-slate-300" : undefined
  const yearPctCaHeaderTestId =
    title === "Estimation des dépenses annuelles" ? "expense-year-pct-ca-header" : "revenue-year-pct-ca-header"
  const yearPctCaCellTestId =
    title === "Estimation des dépenses annuelles" ? "expense-year-pct-ca" : "revenue-year-pct-ca"
  const yearGroupStartTestId =
    title === "Estimation des dépenses annuelles" ? "expense-year-group-start" : "revenue-year-group-start"

  /** CA de la colonne année : réel N-1 puis hypothèses Revenus (même source que les dépenses variables). */
  const getExpenseCaForYearIndex = (yearIndex: number): number | null => {
    if (title !== "Estimation des dépenses annuelles" || view !== "years" || showStructureCols) return null
    const fb = expenseRevenueForecastFallbackRef.current
    const value = fb?.trend[yearIndex]
    if (value === undefined || !Number.isFinite(value) || Math.abs(value) < 1e-9) return null
    return value
  }

  const getTrendVariation = (values: number[], valueIdx: number): number | null => {
    if (valueIdx >= values.length - 1) return null
    return calculateVariation(values[valueIdx] ?? 0, values[valueIdx + 1] ?? 0)
  }

  const getTrendVariationAmount = (values: number[], valueIdx: number): number | null => {
    if (valueIdx >= values.length - 1) return null
    return (values[valueIdx] ?? 0) - (values[valueIdx + 1] ?? 0)
  }

  const isTrendVariationMode =
    columnMode === "variationAmount" || columnMode === "variationPercent"

  const renderTrendVariationText = (values: number[], valueIdx: number): string => {
    if (columnMode === "variationPercent") {
      const trendVariation = getTrendVariation(values, valueIdx)
      return trendVariation !== null
        ? `${trendVariation >= 0 ? "+" : ""}${trendVariation.toFixed(1)}%`
        : "-"
    }
    const trendVariationAmount = getTrendVariationAmount(values, valueIdx)
    return trendVariationAmount !== null
      ? `${trendVariationAmount >= 0 ? "+" : ""}${formatCurrency(trendVariationAmount)}`
      : "-"
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
    else if (view === "years") parts.push(title === "Estimation des revenus annuels" ? `${projectionYears + 1} prochaines années` : `${PERFORMANCE_CHART_YEAR_COUNT} dernières années`)

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
      return incomeStatementQuarterLabelsForBasis(
        refMonth,
        refYear,
        periodBasis,
        fiscalYearEndMonth,
        INCOME_STATEMENT_QUARTER_COUNT,
      )
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
    if (forceForecastSection) {
      const baseYear = forecastBaseYear ?? new Date().getFullYear()
      return forecastYearLabelsForLayout(
        forecastActualLayoutEffective,
        baseYear,
        projectionYears,
        refMonth,
        refYear,
        fiscalYearEndMonth,
      )
    }
    if (seriesPeriods.length > 0 && !isForecastSection) {
      return incomeStatementYearLabelsForBasis(
        refMonth,
        refYear,
        periodBasis,
        fiscalYearEndMonth,
        PERFORMANCE_CHART_YEAR_COUNT,
      )
    }
    const labels: string[] = []
    if (isForecastSection) {
      const currentYear = new Date().getFullYear()
      // Generate projectionYears + 1 years starting from current year (current year + 0 to projectionYears)
      for (let i = 0; i <= projectionYears; i++) {
        labels.push(`${currentYear + i}`)
      }
    } else {
      const currentYear = new Date().getFullYear()
      for (let i = PERFORMANCE_CHART_YEAR_COUNT - 1; i >= 0; i--) {
        labels.push(`${currentYear - i}`)
      }
    }
    return isForecastSection ? labels : reverseSeriesOrderForDisplay(labels)
  }

  let detailTableColumnCount = 2
  if (showStructureCols) detailTableColumnCount = 5
  else if (view === "current") detailTableColumnCount = 2
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
  }   else if (view === "12months") detailTableColumnCount = 1 + getMonthLabels().length
  else if (view === "quarters") detailTableColumnCount = 1 + getQuarterLabels().length
  else if (view === "years") {
    const nYears = getYearLabels().length
    detailTableColumnCount =
      title === "Estimation des dépenses annuelles"
        ? 3 + nYears * (showYearPctCa ? 2 : 1)
        : title === "Estimation des revenus annuels"
          ? 1 + nYears * (showYearPctCa ? 2 : 1)
          : 1 + nYears
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

  const trendLenForPad = data.find((r) => r.trendValues != null)?.trendValues?.length ?? 0
  const revenueHeaderYearTotals = useMemo(() => {
    if (title !== "Estimation des revenus annuels") return null
    if (view !== "years") return null
    if (showStructureCols) return null

    const posts = data.filter(
      (r) =>
        !!r.rowId &&
        !!r.indent &&
        !r.isSection &&
        !r.isAnnexPlaceholder &&
        !r.isAnnexTitle &&
        Array.isArray(r.trendValues) &&
        r.trendValues.length > 0
    )
    if (posts.length === 0) return null

    const len = posts[0]!.trendValues!.length
    return Array.from({ length: len }, (_, j) =>
      posts.reduce((acc, r) => {
        const raw = r.trendValues?.[j] ?? 0
        const v = isForecastSection && r.rowId ? displayedHypothesisAmount(r.rowId, j, raw, r.trendValues) : raw
        return acc + (v ?? 0)
      }, 0)
    )
  }, [data, displayedHypothesisAmount, isForecastSection, showStructureCols, title, view])

  const getHypothesisCaForYearIndex = (yearIndex: number): number | null => {
    if (title === "Estimation des dépenses annuelles" || isProFormaResultsTitle) {
      const cfg = forecastDisplayToConfigYearIndex(yearIndex, forecastActualCols)
      if (cfg == null) {
        const n1 = expenseRevenueForecastFallbackRef.current?.nMinusOne
        if (n1 === undefined || !Number.isFinite(n1) || Math.abs(n1) < 1e-9) return null
        return n1
      }
      return getExpenseCaForYearIndex(cfg)
    }
    if (title !== "Estimation des revenus annuels") return null
    const value = revenueHeaderYearTotals?.[yearIndex]
    if (value === undefined || !Number.isFinite(value) || Math.abs(value) < 1e-9) return null
    return value
  }

  /** Sous-totaux annexe (hypothèses revenus) : somme des montants affichés (`getRevenueValue`) par lettre — aligné sur la ligne « Revenus » / Pro forma, pas sur les tendances brutes injectées. */
  const revenueAnnexForecastYearTotalsByLetter = useMemo(() => {
    if (title !== "Estimation des revenus annuels") return null
    if (!isForecastSection || view !== "years") return null
    if (showStructureCols) return null

    const posts = data.filter(
      (r) =>
        !!r.rowId &&
        !!r.indent &&
        !r.isSection &&
        !r.isAnnexPlaceholder &&
        !r.isAnnexTitle &&
        !r.isAnnexSubtotal &&
        Array.isArray(r.trendValues) &&
        r.trendValues.length > 0
    )
    if (posts.length === 0) return null

    const len = posts[0]!.trendValues!.length
    const letters = new Set<string>()
    for (const r of data) {
      const L = normalizeAnnexLetter(String(r.annexLetter ?? ""))
      if (L) letters.add(L)
    }
    const out = new Map<string, number[]>()
    for (const L of letters) {
      const perLetter = posts.filter(
        (r) => normalizeAnnexLetter(String(r.annexLetter ?? "")) === L
      )
      if (perLetter.length === 0) continue
      out.set(
        L,
        Array.from({ length: len }, (_, j) =>
          perLetter.reduce((acc, r) => {
            const raw = r.trendValues?.[j] ?? 0
            const v = displayedHypothesisAmount(r.rowId!, j, raw, r.trendValues)
            return acc + (v ?? 0)
          }, 0)
        )
      )
    }
    return out.size > 0 ? out : null
  }, [data, displayedHypothesisAmount, isForecastSection, showStructureCols, title, view])

  /** Sous-totaux annexe (hypothèses dépenses) : somme des montants affichés (`getRevenueValue`) par lettre — aligné sur les postes projetés, pas sur les tendances brutes. */
  const expenseAnnexForecastYearTotalsByLetter = useMemo(() => {
    if (title !== "Estimation des dépenses annuelles") return null
    if (!isForecastSection || view !== "years") return null
    if (showStructureCols) return null

    const posts = data.filter(
      (r) =>
        !!r.rowId &&
        !!r.indent &&
        !r.isSection &&
        !r.isAnnexPlaceholder &&
        !r.isAnnexTitle &&
        !r.isAnnexSubtotal &&
        Array.isArray(r.trendValues) &&
        r.trendValues.length > 0
    )
    if (posts.length === 0) return null

    const len = posts[0]!.trendValues!.length
    const letters = new Set<string>()
    for (const r of data) {
      const L = normalizeAnnexLetter(String(r.annexLetter ?? ""))
      if (L) letters.add(L)
    }
    const out = new Map<string, number[]>()
    for (const L of letters) {
      const perLetter = posts.filter(
        (r) => normalizeAnnexLetter(String(r.annexLetter ?? "")) === L
      )
      if (perLetter.length === 0) continue
      out.set(
        L,
        Array.from({ length: len }, (_, j) =>
          perLetter.reduce((acc, r) => {
            const raw = r.trendValues?.[j] ?? 0
            const v = displayedHypothesisAmount(r.rowId!, j, raw, r.trendValues)
            return acc + (v ?? 0)
          }, 0)
        )
      )
    }
    return out.size > 0 ? out : null
  }, [data, displayedHypothesisAmount, isForecastSection, showStructureCols, title, view])

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

  // Show "no data" state when data is empty and not loading
  if (data.length === 0 && !isForecastSection) {
    return (
      <div className={cn("w-full", dashboardCardFrameStaticClass)}>
        <div className={dashboardCardRingClass} aria-hidden />
        <div className="relative">
          <div className={cn("px-6 py-5 sm:px-7", dashboardCardHeaderBarClass)}>
            <div className="flex items-center gap-4">
              {!hideHeaderIcon && (
                <div className={dashboardCardHeaderIconBoxClass}>
                  <ListTree className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
                </div>
              )}
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

                  {isTrendVariationMode && showComparisonAmounts ? (
                    columnMode === "variationPercent" ? (
                      <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Variation %</p>
                        <p className={cn("mt-2 text-lg font-semibold tabular-nums", variation != null && variation >= 0 ? "text-emerald-600" : "text-red-600")}>
                          {variation != null && ctx.current !== 0 ? `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%` : "—"}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Variation $</p>
                        <p className={cn("mt-2 text-lg font-semibold tabular-nums", variationAmount >= 0 ? "text-emerald-600" : "text-red-600")}>
                          {ctx.current !== 0 ? `${variationAmount >= 0 ? "+" : ""}${formatCurrency(variationAmount)}` : "—"}
                        </p>
                      </div>
                    )
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
                const line = formatGlAccountDisplayLabel(acc.accountNumber, acc.accountName)
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

  /**
   * Au changement de type d’hypothèse : remplir le champ avec la valeur équivalente au scénario
   * déjà projeté (montant annuel $, croissance % ou variation $ vs année précédente).
   */
  const syncRevenueHypothesisValueForDisplayType = (
    newType: "amount" | "growthPercent" | "growthAmount" | "custom",
    ctx: { rowId: string; yearIndex: number }
  ) => {
    if (title !== "Estimation des revenus annuels") return
    if (newType === "custom") return
    const row = data.find((r) => r.rowId === ctx.rowId)
    const trend = row?.trendValues
    if (!row?.rowId || !Array.isArray(trend) || trend.length === 0) return

    const y = ctx.yearIndex
    const configTrend = forecastDisplayTrendToConfigTrend(trend, forecastActualCols)
    if (y < 0 || y >= configTrend.length) return

    const defY = configTrend[y] ?? 0
    const currentProjected = getRevenueValue(row.rowId, y, defY, undefined, configTrend)

    if (newType === "amount") {
      setRevenueHypothesisValueFromNumber(Math.round(currentProjected), newType)
      return
    }

    if (y <= 0) {
      setRevenueHypothesisValueFromNumber(0, newType)
      return
    }

    const prevProjected = revenueGrowthPreviousProjectedAmount(row.rowId, y, configTrend)

    if (newType === "growthPercent") {
      const pct = calculateVariation(currentProjected, prevProjected)
      setRevenueHypothesisValueFromNumber(Math.round(pct * 10) / 10, newType)
      return
    }

    setRevenueHypothesisValueFromNumber(Math.round(currentProjected - prevProjected), newType)
  }

  const renderRevenueHypothesisPanel = (embedded = false) => {
    if (title !== "Estimation des revenus annuels" || !editingAdjustment || !revenueHypothesisPanelOpen) return null
    const rowLabel = editingAdjustment.rowId
      ? data.find((r) => r.rowId === editingAdjustment.rowId)?.label || "Poste"
      : "Poste"
    const yearLabels = getYearLabels()
    const yearIndex = editingAdjustment.yearIndex
    const yearLabel =
      yearLabels[forecastConfigToDisplayYearIndex(yearIndex, forecastActualCols)] || `${yearIndex}`
    const existingAdjustments = getRevenueAdjustments(editingAdjustment.rowId, editingAdjustment.yearIndex)
    const canReplicateToFollowingYears = yearIndex < forecastConfigYearCount - 1
    const followingYearsLabel = yearLabels
      .slice(forecastConfigToDisplayYearIndex(yearIndex, forecastActualCols) + 1)
      .join(", ")
    const customYoYRevenueTable =
      revenueAdjustmentType === "custom" &&
      yearIndex > 0 &&
      (() => {
        const pa = getRevenueAdjustments(editingAdjustment.rowId, yearIndex - 1)
        const p = pa[pa.length - 1]
        return p?.type === "custom" && !!p.customGrowth?.variables?.length
      })()
    const prevYearEffectiveValueByIdForCustomPanel = ((): Map<string, number> => {
      if (!customYoYRevenueTable) return new Map()
      const chain = collectConsecutiveCustomGrowthChain(
        editingAdjustment.rowId,
        yearIndex - 1,
        (rid, y) => {
          const arr = getRevenueAdjustments(rid, y)
          return arr?.[arr.length - 1]
        }
      )
      const resolved = resolveCustomGrowthVariablesFromChain(chain)
      return new Map(resolved.map((v) => [v.id, v.value]))
    })()
    const prevYearLabelForCustomYoY =
      customYoYRevenueTable && yearIndex > 0 ? yearLabels[yearIndex - 1] ?? `${yearIndex - 1}` : ""
    const formatCustomVarBaselineDisplay = (n: number, kind: RevenueCustomDraftRow["kind"]): string => {
      if (!Number.isFinite(n)) return "—"
      if (kind === "currency") return formatDraftNumberForInput(Math.round(n))
      if (kind === "percent") return `${n} %`
      return String(n)
    }
    const computeCustomYoYRowResolvedValue = (
      base: number,
      mode: RevenueCustomYoYGrowthMode | undefined,
      deltaInput: string | undefined
    ): number | null => {
      const g = parseDraftNumericInput(deltaInput ?? "0")
      if (g === null) return null
      const m = mode ?? "percent"
      if (m === "percent") return base * (1 + g / 100)
      return base + g
    }
    const revenueActualSeasonality = resolveRevenueActualSeasonality(editingAdjustment.rowId)
    const revenueSeasonalityOverlayLines = revenueActualSeasonality.years.map((y, i) => ({
      key: String(y.year),
      label: String(y.year),
      monthPercents: y.percents,
      color: FORECAST_SEASONALITY_ACTUAL_YEAR_COLORS[i] ?? FORECAST_SEASONALITY_ACTUAL_YEAR_COLORS[0],
      dashed: true,
    }))
    const actualYearLabels = revenueActualSeasonality.years.map((y) => String(y.year))
    const revenueSeasonalityApplyPresets = [
      ...revenueActualSeasonality.years.map((y) => ({
        key: String(y.year),
        label: `Saisonnalité ${y.year}`,
        monthPercents: y.percents,
        disabled: !y.hasData,
      })),
      {
        key: "average",
        label:
          actualYearLabels.length === 2
            ? `Saisonnalité moyenne (${actualYearLabels[0]}/${actualYearLabels[1]})`
            : "Saisonnalité moyenne",
        monthPercents: revenueActualSeasonality.averagePercents,
        disabled: !revenueActualSeasonality.years.some((y) => y.hasData),
      },
    ]

    const draftParsedForSummary = parseRevenueHypothesisValueInput(revenueAdjustmentValueInput)
    const draftCustomBuiltForSummary =
      revenueAdjustmentType === "custom"
        ? buildRevenueCustomGrowthSnapshot(
            revenueCustomDraftRows,
            revenueCustomFormula,
            customYoYRevenueTable
              ? {
                  mode: "yoy",
                  previousEffectiveValuesById: prevYearEffectiveValueByIdForCustomPanel,
                }
              : { mode: "direct" }
          )
        : null
    const draftSummaryNumericOk =
      revenueAdjustmentType === "custom"
        ? draftCustomBuiltForSummary?.ok === true
        : draftParsedForSummary !== null

    const summaryRowForDraft = data.find((r) => r.rowId === editingAdjustment.rowId)
    const summaryTrendForDraft = summaryRowForDraft?.trendValues
      ? forecastDisplayTrendToConfigTrend(summaryRowForDraft.trendValues, forecastActualCols)
      : undefined
    let draftAnnualRevenueForSummary = 0
    if (draftSummaryNumericOk && summaryRowForDraft?.rowId && Array.isArray(summaryTrendForDraft)) {
      const yD = editingAdjustment.yearIndex
      const rowIdD = summaryRowForDraft.rowId
      if (revenueAdjustmentType === "custom" && draftCustomBuiltForSummary?.ok) {
        draftAnnualRevenueForSummary = Math.round(draftCustomBuiltForSummary.result)
      } else if (revenueAdjustmentType === "amount") {
        draftAnnualRevenueForSummary = Math.round(draftParsedForSummary ?? 0)
      } else if (revenueAdjustmentType === "growthPercent") {
        const prevProjected = revenueGrowthPreviousProjectedAmount(rowIdD, yD, summaryTrendForDraft)
        draftAnnualRevenueForSummary = Math.round(prevProjected * (1 + (draftParsedForSummary ?? 0) / 100))
      } else {
        const prevProjected = revenueGrowthPreviousProjectedAmount(rowIdD, yD, summaryTrendForDraft)
        draftAnnualRevenueForSummary = Math.round(prevProjected + (draftParsedForSummary ?? 0))
      }
    }
    const revenueMonthlyAmounts = draftSummaryNumericOk
      ? distributeAnnualRevenueBySeasonality(
          draftAnnualRevenueForSummary,
          normalizeRevenueSeasonalityMonthPercents(revenueSeasonalityMonthPercents)
        )
      : null

    return (
      <>
      <div
        className={cn(
          embedded ? "w-full min-w-0 max-w-full overflow-x-auto overflow-y-visible" : "flex min-h-0 flex-1 flex-col",
          "min-w-0 max-w-full"
        )}
      >
          <Tabs
            value={revenueHypothesisEditorTab}
            onValueChange={(v) =>
              setRevenueHypothesisEditorTab(v === "saisonnalite" ? "saisonnalite" : "croissance")
            }
            className={cn(
              "flex min-h-0 min-w-0 max-w-full flex-col gap-0",
              embedded ? "" : "min-h-0 flex-1"
            )}
          >
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Hypothèse</p>
                <h3 className="mt-3 text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl">{rowLabel}</h3>
                <p className="mt-3 text-xs font-medium leading-relaxed text-[#E0742D]">
                  Année sélectionnée <span className="text-[#E0742D]/50" aria-hidden>·</span>{" "}
                  <span className="font-semibold text-[#E0742D]">{yearLabel}</span>
                </p>
                <TabsList className="mt-3 flex w-full max-w-lg flex-wrap gap-1 rounded-lg border border-slate-200/90 bg-slate-100/80 p-0.5 sm:inline-flex sm:w-fit sm:max-w-none">
                  <TabsTrigger
                    value="croissance"
                    className="h-8 flex-1 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#2A2F3A] data-[state=active]:shadow-sm sm:flex-initial sm:px-3"
                  >
                    Croissance
                  </TabsTrigger>
                  <TabsTrigger
                    value="saisonnalite"
                    className="h-8 flex-1 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#2A2F3A] data-[state=active]:shadow-sm sm:flex-initial sm:px-3"
                  >
                    Saisonnalité
                  </TabsTrigger>
                </TabsList>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {hypothesisSaveAckMessage}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 border-slate-200 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent"
                  onClick={saveAdjustment}
                  disabled={!draftSummaryNumericOk}
                >
                  {editingAdjustmentId
                    ? "Enregistrer"
                    : existingAdjustments.length > 0
                      ? "Remplacer l'ajustement"
                      : "Enregistrer l'ajustement"}
                </Button>
                {existingAdjustments.length > 0 && editingAdjustmentId ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 border-red-200/90 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setRevenueHypothesisDeleteConfirmOpen(true)}
                  >
                    Supprimer
                  </Button>
                ) : null}
                {(!analysisPanelNarrow || embedded) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 border-[#E0742D]/35 text-xs font-medium text-[#8f4810] hover:bg-orange-50/90"
                    onClick={returnToRevenueHypothesisRow}
                  >
                    Fermer
                  </Button>
                )}
              </div>
            </div>

            <div
              className={cn(
                "mt-5 flex min-h-0 min-w-0 flex-1 flex-col pr-0.5",
                embedded && "max-w-full",
                !embedded && "overflow-y-auto"
              )}
            >
              <TabsContent
                value="croissance"
                className="mt-0 min-h-0 min-w-0 max-w-full shrink-0 outline-none focus-visible:ring-0"
              >
                <div className={cn(embedded && "min-w-0 max-w-full")}>
                  {canReplicateToFollowingYears ? (
                    <div className="mb-3 flex min-w-0 items-start gap-2.5">
                      <Checkbox
                        id="revenue-hypothesis-replicate"
                        checked={replicateRevenueAdjustmentToFollowingYears}
                        onCheckedChange={(v) => {
                          const on = v === true
                          setReplicateRevenueAdjustmentToFollowingYears(on)
                          if (on) {
                            setReplicateRevenueEncashmentToFollowingYears(false)
                            setReplicateRevenueSeasonalityToFollowingYears(false)
                          }
                        }}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <Label
                          htmlFor="revenue-hypothesis-replicate"
                          className="cursor-pointer text-xs font-medium leading-snug text-slate-800"
                        >
                          Appliquer le même ajustement aux années suivantes
                        </Label>
                        <p className="text-[11px] leading-relaxed text-slate-500">
                          Les années {followingYearsLabel} reprendront le même type, la même valeur (ou la même
                          configuration Custom) et la même note que {yearLabel}.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mb-3 text-xs text-slate-400">Aucune année projetée après {yearLabel}.</p>
                  )}
                  <div
                    className={cn(
                      "rounded-lg border border-slate-200 bg-white p-4 sm:p-5",
                      embedded && "min-w-0 w-full max-w-full"
                    )}
                  >
                  <p className="mb-5 text-sm font-medium text-slate-900">
                    {editingAdjustmentId
                      ? "Modifier l'ajustement"
                      : existingAdjustments.length > 0
                        ? "Remplacer l'ajustement"
                        : "Définir l'ajustement"}
                  </p>

                  <div
                    className={cn(
                      "grid min-w-0 max-w-full grid-cols-1 gap-8 lg:grid-cols-3 lg:items-start",
                      embedded ? "w-full" : ""
                    )}
                  >
                    {/* Colonne 1 : type et montant (ou rappel Custom) */}
                    <div className="flex min-w-0 flex-col gap-4 lg:col-span-1">
                      <div className="w-full">
                        <label htmlFor="revenue-adj-type" className="mb-1.5 block text-xs font-medium text-slate-600">
                          Type d&apos;ajustement
                        </label>
                        <Select
                          value={revenueAdjustmentType}
                          onValueChange={(
                            value: "amount" | "growthPercent" | "growthAmount" | "custom"
                          ) => {
                            setRevenueAdjustmentType(value)
                            if (value === "custom" && editingAdjustment) {
                              const row = data.find((r) => r.rowId === editingAdjustment.rowId)
                              const trend = row?.trendValues
                                ? forecastDisplayTrendToConfigTrend(row.trendValues, forecastActualCols)
                                : undefined
                              const y = editingAdjustment.yearIndex
                              if (row?.rowId && Array.isArray(trend) && y >= 0 && y < trend.length) {
                                const defY = trend[y] ?? 0
                                const currentProjected = getRevenueValue(
                                  row.rowId,
                                  y,
                                  defY,
                                  undefined,
                                  trend
                                )
                                const id1 = generateId("rv")
                                setRevenueCustomDraftRows([
                                  {
                                    id: id1,
                                    label: "Montant de référence",
                                    kind: "currency",
                                    valueInput: formatDraftNumberForInput(Math.round(currentProjected)),
                                  },
                                ])
                                setRevenueCustomFormula(revenueCustomBracketRef("Montant de référence"))
                              } else {
                                const id1 = generateId("rv")
                                setRevenueCustomDraftRows([
                                  { id: id1, label: "", kind: "number", valueInput: "0" },
                                ])
                                setRevenueCustomFormula("")
                              }
                            }
                            if (value !== "custom") {
                              setRevenueCustomDraftRows([])
                              setRevenueCustomFormula("")
                            }
                            if (editingAdjustment && value !== "custom") {
                              syncRevenueHypothesisValueForDisplayType(value, editingAdjustment)
                            }
                          }}
                        >
                          <SelectTrigger
                            id="revenue-adj-type"
                            className="h-10 w-full rounded-md border-slate-200 bg-white"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="amount">Montant annuel</SelectItem>
                            <SelectItem value="growthPercent">Croissance en %</SelectItem>
                            <SelectItem value="growthAmount">Croissance en $</SelectItem>
                            <SelectItem value="custom">Custom (variables + formule)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {revenueAdjustmentType === "custom" ? (
                        <div className="w-full space-y-1.5">
                          <p className="text-xs font-medium text-slate-700">Custom</p>
                          <p className="text-[11px] leading-relaxed text-slate-500">
                            Le montant annuel pour {yearLabel} est calculé à partir des variables et de la formule
                            définies sous la grille.
                          </p>
                        </div>
                      ) : (
                        <div className="w-full">
                          <label
                            htmlFor="revenue-adj-value"
                            className="mb-1.5 block text-xs font-medium text-slate-600"
                          >
                            {revenueAdjustmentType === "amount"
                              ? "Montant annuel ($)"
                              : revenueAdjustmentType === "growthPercent"
                                ? "Croissance (%)"
                                : "Croissance ($)"}
                          </label>
                          <Input
                            id="revenue-adj-value"
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            value={revenueAdjustmentValueInput}
                            onChange={(e) => {
                              const s = e.target.value
                              setRevenueAdjustmentValueInput(s)
                              const p = parseRevenueHypothesisValueInput(s)
                              if (p !== null) setRevenueAdjustmentValue(p)
                            }}
                            onBlur={() => {
                              if (revenueAdjustmentType === "growthPercent") return
                              const p = parseRevenueHypothesisValueInput(revenueAdjustmentValueInput)
                              if (p !== null) {
                                setRevenueAdjustmentValue(p)
                                setRevenueAdjustmentValueInput(
                                  formatRevenueHypothesisValueForInput(p, revenueAdjustmentType)
                                )
                              }
                            }}
                            placeholder="0"
                            className="h-10 w-full rounded-md border-slate-200 bg-white tabular-nums"
                          />
                          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                            {revenueAdjustmentType === "amount"
                              ? "Montant annuel souhaité pour cette année"
                              : revenueAdjustmentType === "growthPercent"
                                ? forecastActualCols > 1 && yearIndex === 1
                                  ? "Taux de croissance appliqué par rapport au dernier exercice complet (N-1), pas au YTD."
                                  : "Taux de croissance appliqué par rapport à l'année précédente."
                                : forecastActualCols > 1 && yearIndex === 1
                                  ? "Variation en dollars par rapport au dernier exercice complet (N-1), pas au YTD."
                                  : "Variation en dollars par rapport au montant de l'année précédente."}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Note : colonnes 2–3 */}
                    <div
                      className={cn(
                        "flex min-h-0 min-w-0 flex-col gap-1.5 border-t border-slate-100 pt-6 lg:col-span-2 lg:border-t-0 lg:border-l lg:border-slate-100 lg:pt-0 lg:pl-8",
                        embedded && "w-full min-w-0"
                      )}
                    >
                      <label htmlFor="revenue-adj-note" className="mb-0 block text-xs font-medium text-slate-600">
                        Note explicative
                      </label>
                      <Textarea
                        id="revenue-adj-note"
                        value={adjustmentNote}
                        onChange={(e) => setAdjustmentNote(e.target.value)}
                        placeholder="Ex. nouveau contrat, expansion marché..."
                        className="min-h-[10rem] w-full flex-1 resize-y rounded-md border border-slate-200 bg-white text-sm lg:min-h-[12rem]"
                      />
                      <p className="text-[11px] text-slate-500">Optionnel, pour la traçabilité.</p>
                    </div>
                  </div>

                  {revenueAdjustmentType === "custom" ? (
                    <div className="mt-8 flex min-w-0 flex-col gap-4 border-t border-slate-200 pt-6">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-medium text-slate-700">Variables et formule</p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              disabled={customYoYRevenueTable}
                              title={
                                customYoYRevenueTable
                                  ? "Non disponible : reprenez la structure depuis l’année précédente ou créez une hypothèse custom sur une année sans chaîne YoY."
                                  : undefined
                              }
                              onClick={() => {
                                const starter = createSaaSRevenueCustomStarter(() => generateId("rv"))
                                setRevenueCustomDraftRows(starter.rows)
                                setRevenueCustomFormula(starter.formula)
                              }}
                            >
                              Exemple SaaS
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => {
                                const id = generateId("rv")
                                setRevenueCustomDraftRows((rows) => [
                                  ...rows,
                                  customYoYRevenueTable
                                    ? {
                                        id,
                                        label: "",
                                        kind: "number",
                                        valueInput: "",
                                        yoyGrowthMode: "percent",
                                        yoyGrowthValueInput: "0",
                                      }
                                    : { id, label: "", kind: "number", valueInput: "0" },
                                ])
                              }}
                            >
                              <Plus className="mr-1 h-3.5 w-3.5" />
                              Ligne
                            </Button>
                          </div>
                        </div>
                        {customYoYRevenueTable ? (
                          <p className="text-[11px] leading-snug text-slate-500">
                            {`« Valeur (${prevYearLabelForCustomYoY}) » est la base résolue (lecture seule). Dans « Croissance », choisissez % ou nombre et saisissez la variation ; « Valeur (${yearLabel}) » affiche le résultat ligne par ligne (même formule que l’enregistrement).`}
                          </p>
                        ) : null}

                        <div className="overflow-x-auto rounded-md border border-slate-200">
                          <table
                            className={`w-full text-left text-sm ${customYoYRevenueTable ? "min-w-[860px]" : "min-w-[520px]"}`}
                          >
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50/80">
                                <th className="px-3 py-2 text-xs font-medium text-slate-600">Libellé</th>
                                <th className="w-[120px] px-2 py-2 text-xs font-medium text-slate-600">Type</th>
                                <th
                                  className={`px-2 py-2 text-xs font-medium text-slate-600 ${customYoYRevenueTable ? "w-[140px]" : "w-[140px]"}`}
                                >
                                  {customYoYRevenueTable
                                    ? `Valeur (${prevYearLabelForCustomYoY})`
                                    : "Valeur"}
                                </th>
                                {customYoYRevenueTable ? (
                                  <>
                                    <th className="min-w-[220px] px-2 py-2 text-xs font-medium text-slate-600">
                                      Croissance
                                    </th>
                                    <th className="w-[140px] px-2 py-2 text-xs font-medium text-slate-600">
                                      Valeur ({yearLabel})
                                    </th>
                                  </>
                                ) : null}
                                <th className="w-[200px] px-2 py-2 text-xs font-medium text-slate-600">Réf.</th>
                                <th className="w-[100px] px-2 py-2 text-right text-xs font-medium text-slate-600">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {revenueCustomDraftRows.map((row) => (
                                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                                  <td className="px-2 py-1.5 align-middle">
                                    <Input
                                      value={row.label}
                                      onChange={(e) => {
                                        const nextLabel = e.target.value
                                        const prevLabel = row.label
                                        if (prevLabel.trim()) {
                                          const oldRef = revenueCustomBracketRef(prevLabel)
                                          const newRef = revenueCustomBracketRef(nextLabel)
                                          if (oldRef !== newRef) {
                                            setRevenueCustomFormula((f) =>
                                              f.replace(new RegExp(escapeRegExp(oldRef), "g"), newRef)
                                            )
                                          }
                                        }
                                        setRevenueCustomDraftRows((rows) =>
                                          rows.map((r) => (r.id === row.id ? { ...r, label: nextLabel } : r))
                                        )
                                      }}
                                      placeholder="ex. Nouveaux clients"
                                      className="h-9 border-slate-200 text-sm"
                                    />
                                  </td>
                                  <td className="px-2 py-1.5 align-middle">
                                    <Select
                                      value={row.kind}
                                      onValueChange={(k: "number" | "percent" | "currency") => {
                                        setRevenueCustomDraftRows((rows) =>
                                          rows.map((r) => (r.id === row.id ? { ...r, kind: k } : r))
                                        )
                                      }}
                                    >
                                      <SelectTrigger className="h-9 border-slate-200 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="number">Nombre</SelectItem>
                                        <SelectItem value="percent">%</SelectItem>
                                        <SelectItem value="currency">$ (montant)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="px-2 py-1.5 align-middle">
                                    {customYoYRevenueTable ? (
                                      <div
                                        className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-2 text-xs tabular-nums text-slate-800"
                                        title={`Base résolue pour ${prevYearLabelForCustomYoY}`}
                                      >
                                        {formatCustomVarBaselineDisplay(
                                          prevYearEffectiveValueByIdForCustomPanel.get(row.id) ?? 0,
                                          row.kind
                                        )}
                                      </div>
                                    ) : (
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        value={row.valueInput}
                                        onChange={(e) => {
                                          const v = e.target.value
                                          setRevenueCustomDraftRows((rows) =>
                                            rows.map((r) => (r.id === row.id ? { ...r, valueInput: v } : r))
                                          )
                                        }}
                                        onBlur={() => {
                                          if (row.kind !== "currency") return
                                          const p = parseRevenueHypothesisValueInput(row.valueInput)
                                          if (p !== null) {
                                            setRevenueCustomDraftRows((rows) =>
                                              rows.map((r) =>
                                                r.id === row.id
                                                  ? {
                                                      ...r,
                                                      valueInput: formatRevenueHypothesisValueForInput(
                                                        p,
                                                        "amount"
                                                      ),
                                                    }
                                                  : r
                                              )
                                            )
                                          }
                                        }}
                                        className="h-9 border-slate-200 tabular-nums"
                                      />
                                    )}
                                  </td>
                                  {customYoYRevenueTable ? (
                                    <>
                                      <td className="px-2 py-1.5 align-middle">
                                        <div className="flex min-w-0 items-center gap-1.5">
                                          <Select
                                            value={row.yoyGrowthMode ?? "percent"}
                                            onValueChange={(k: RevenueCustomYoYGrowthMode) => {
                                              setRevenueCustomDraftRows((rows) =>
                                                rows.map((r) =>
                                                  r.id === row.id ? { ...r, yoyGrowthMode: k } : r
                                                )
                                              )
                                            }}
                                          >
                                            <SelectTrigger className="h-9 w-[5.5rem] shrink-0 border-slate-200 text-xs">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="percent">%</SelectItem>
                                              <SelectItem value="amount">Nombre</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <Input
                                            type="text"
                                            inputMode="decimal"
                                            value={row.yoyGrowthValueInput ?? "0"}
                                            onChange={(e) => {
                                              const v = e.target.value
                                              setRevenueCustomDraftRows((rows) =>
                                                rows.map((r) =>
                                                  r.id === row.id ? { ...r, yoyGrowthValueInput: v } : r
                                                )
                                              )
                                            }}
                                            onBlur={() => {
                                              if (row.kind !== "currency") return
                                              if ((row.yoyGrowthMode ?? "percent") !== "amount") return
                                              const p = parseRevenueHypothesisValueInput(
                                                row.yoyGrowthValueInput ?? "0"
                                              )
                                              if (p !== null) {
                                                setRevenueCustomDraftRows((rows) =>
                                                  rows.map((r) =>
                                                    r.id === row.id
                                                      ? {
                                                          ...r,
                                                          yoyGrowthValueInput:
                                                            formatRevenueHypothesisValueForInput(p, "amount"),
                                                        }
                                                      : r
                                                  )
                                                )
                                              }
                                            }}
                                            className="h-9 min-w-0 flex-1 border-slate-200 tabular-nums"
                                            placeholder={
                                              (row.yoyGrowthMode ?? "percent") === "percent"
                                                ? "ex. 3"
                                                : "ex. 100"
                                            }
                                            title={
                                              (row.yoyGrowthMode ?? "percent") === "percent"
                                                ? "Pourcentage appliqué à la base"
                                                : "Montant ajouté à la base"
                                            }
                                          />
                                        </div>
                                      </td>
                                      <td className="px-2 py-1.5 align-middle">
                                        {(() => {
                                          const base =
                                            prevYearEffectiveValueByIdForCustomPanel.get(row.id) ?? 0
                                          const resolved = computeCustomYoYRowResolvedValue(
                                            base,
                                            row.yoyGrowthMode,
                                            row.yoyGrowthValueInput
                                          )
                                          return (
                                            <div
                                              className="flex h-9 items-center rounded-md border border-emerald-200/80 bg-emerald-50/60 px-2 text-xs tabular-nums text-slate-900"
                                              title={`Après croissance (${yearLabel})`}
                                            >
                                              {resolved !== null && Number.isFinite(resolved)
                                                ? formatCustomVarBaselineDisplay(resolved, row.kind)
                                                : "—"}
                                            </div>
                                          )
                                        })()}
                                      </td>
                                    </>
                                  ) : null}
                                  <td className="px-2 py-1.5 align-middle">
                                    <code className="block truncate rounded bg-slate-100 px-2 py-1.5 text-[11px] text-slate-700">
                                      {revenueCustomBracketRef(row.label)}
                                    </code>
                                  </td>
                                  <td className="px-2 py-1.5 align-middle text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 text-xs text-slate-600"
                                        title="Insérer dans la formule"
                                        onClick={() => {
                                          const token = revenueCustomBracketRef(row.label)
                                          setRevenueCustomFormula((f) =>
                                            f + (f.length > 0 && !/[+\-*/(]$/.test(f.trimEnd()) ? " " : "") + token
                                          )
                                        }}
                                      >
                                        Insérer
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 text-slate-500 hover:text-red-600"
                                        title="Supprimer la ligne"
                                        disabled={revenueCustomDraftRows.length <= 1}
                                        onClick={() => {
                                          const bracketRef = revenueCustomBracketRef(row.label)
                                          const legacyRef = revenueCustomFormulaPlaceholder(row.id)
                                          setRevenueCustomDraftRows((rows) =>
                                            rows.filter((r) => r.id !== row.id)
                                          )
                                          setRevenueCustomFormula((f) => {
                                            let next = f.replace(
                                              new RegExp(escapeRegExp(bracketRef), "g"),
                                              ""
                                            )
                                            next = next.replace(
                                              new RegExp(escapeRegExp(legacyRef), "g"),
                                              ""
                                            )
                                            return next
                                          })
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-slate-600">Ajouter :</span>
                            {(
                              [
                                { op: "+" as const, label: "Addition" },
                                { op: "-" as const, label: "Soustraction" },
                                { op: "*" as const, label: "Multiplication" },
                                { op: "/" as const, label: "Division" },
                              ] as const
                            ).map(({ op, label }) => (
                              <Button
                                key={op}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 shrink-0 text-xs"
                                onClick={() =>
                                  setRevenueCustomFormula((f) =>
                                    appendRevenueCustomFormulaOperator(f, op)
                                  )
                                }
                              >
                                {label}
                              </Button>
                            ))}
                          </div>
                          <label
                            htmlFor="revenue-custom-formula"
                            className="block text-xs font-medium text-slate-600"
                          >
                            Formule
                          </label>
                          <Textarea
                            id="revenue-custom-formula"
                            value={revenueCustomFormula}
                            onChange={(e) => setRevenueCustomFormula(e.target.value)}
                            placeholder="[Nouveaux clients] * [Prix moyen] ..."
                            className="min-h-[5rem] w-full resize-y rounded-md border border-slate-200 bg-white font-mono text-sm"
                            spellCheck={false}
                          />
                          {draftCustomBuiltForSummary && !draftCustomBuiltForSummary.ok ? (
                            <p className="text-[11px] text-red-600">{draftCustomBuiltForSummary.error}</p>
                          ) : draftCustomBuiltForSummary?.ok ? (
                            <p className="text-[11px] text-slate-600">
                              Revenu projeté pour {yearLabel} selon la formule :{" "}
                              <span className="font-semibold text-slate-900">
                                {formatCurrency(Math.round(draftCustomBuiltForSummary.result))}
                              </span>
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-500">
                              Utilisez <span className="font-medium">Insérer</span> pour coller une variable (
                              <code className="text-[11px]">[Libellé]</code>), puis les boutons ci-dessus pour les
                              opérateurs. Les lignes en type <span className="font-medium">%</span> sont traitées
                              comme une fraction (valeur / 100) dans le calcul. Parenthèses autorisées dans la zone
                              formule.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null}
                </div>
              </div>
              </TabsContent>
              <TabsContent
                value="saisonnalite"
                className="mt-0 min-h-0 min-w-0 max-w-full flex-1 outline-none focus-visible:ring-0"
              >
                <ForecastSeasonalityEditor
                  key={`rev-season-${editingAdjustment.rowId}-${yearIndex}`}
                  variant="revenu"
                  embedded={embedded}
                  yearLabel={yearLabel}
                  followingYearsLabel={followingYearsLabel}
                  canReplicateToFollowingYears={canReplicateToFollowingYears}
                  replicateToFollowingYears={replicateRevenueSeasonalityToFollowingYears}
                  onReplicateChange={(on) => {
                    setReplicateRevenueSeasonalityToFollowingYears(on)
                    if (on) {
                      setReplicateRevenueAdjustmentToFollowingYears(false)
                      setReplicateRevenueEncashmentToFollowingYears(false)
                    }
                  }}
                  replicateCheckboxId="revenue-hypothesis-replicate-seasonality"
                  monthPercents={revenueSeasonalityMonthPercents}
                  onMonthPercentsChange={(next) => {
                    setRevenueSeasonalityAwaitingActuals(false)
                    setRevenueSeasonalityMonthPercents(next)
                  }}
                  overlayLines={revenueSeasonalityOverlayLines}
                  applySeasonalityPresets={revenueSeasonalityApplyPresets}
                  monthlyAmountRow={{
                    label: "Revenus",
                    values: revenueMonthlyAmounts,
                    formatValue: formatCurrency,
                    unavailableHint:
                      "Complétez ou validez la valeur dans l'onglet Croissance pour afficher les revenus mensuels.",
                  }}
                />
              </TabsContent>
            </div>
          </Tabs>
      </div>
      <AlertDialog open={revenueHypothesisDeleteConfirmOpen} onOpenChange={setRevenueHypothesisDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l&apos;ajustement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer définitivement l&apos;hypothèse de revenus pour l&apos;année{" "}
              <span className="font-semibold text-foreground">{yearLabel}</span>. Cette action ne peut pas être annulée.
              Confirmez seulement si vous souhaitez vraiment continuer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600"
              onClick={() => {
                const id = editingAdjustmentId
                if (!id) return
                deleteAdjustment(id)
                setEditingAdjustmentId(null)
                setRevenueAdjustmentType("amount")
                setRevenueAdjustmentValue(0)
                setRevenueAdjustmentValueInput("0")
                setRevenueCustomDraftRows([])
                setRevenueCustomFormula("")
                setRevenueCollectionBuckets(createDefaultAdvancedBuckets(0))
                setRevenueSeasonalityMonthPercents(createDefaultRevenueSeasonalityMonthPercents())
                setAdjustmentNote("")
                setRevenueHypothesisDeleteConfirmOpen(false)
              }}
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
    )
  }

  const renderExpenseHypothesisPanel = (embedded = false) => {
    if (title !== "Estimation des dépenses annuelles" || !editingAdjustment || !expenseHypothesisPanelOpen) return null
    const rowLabel = editingAdjustment.rowId
      ? data.find((r) => r.rowId === editingAdjustment.rowId)?.label || "Poste"
      : "Poste"
    const yearLabels = getYearLabels()
    const yearIndex = editingAdjustment.yearIndex
    const yearLabel =
      yearLabels[forecastConfigToDisplayYearIndex(yearIndex, forecastActualCols)] || `${yearIndex}`
    const existingAdjustments = getAdjustments(editingAdjustment.rowId, editingAdjustment.yearIndex).filter(
      isExpenseHypothesisGrowthAdjustment
    )
    const canReplicateToFollowingYears = yearIndex < forecastConfigYearCount - 1
    const followingYearsLabel = yearLabels
      .slice(forecastConfigToDisplayYearIndex(yearIndex, forecastActualCols) + 1)
      .join(", ")
    const expenseSeasonalityTotal = expenseSeasonalityMonthPercents.reduce((a, b) => a + b, 0)
    const expenseSeasonalitySaveOk = expenseSeasonalityTotal === 100
    const expenseAjustementSaveDisabled =
      adjustmentType === "amount"
        ? adjustmentAmount === 0 ||
          (editingAdjustment &&
            !(
              getExpenseType(editingAdjustment.rowId) === "fixe" && adjustmentIsRecurring
            ) &&
            adjustmentAmountMonthPercents.reduce((a, b) => a + b, 0) !== 100)
        : adjustmentType === "percentage"
          ? adjustmentPercentage === 0 ||
            (editingAdjustment &&
              getExpenseType(editingAdjustment.rowId) === "variable" &&
              !adjustmentIsRecurring &&
              !adjustmentActiveMonths.some(Boolean))
          : adjustmentType === "inflation"
            ? editingAdjustment &&
              getExpenseType(editingAdjustment.rowId) === "fixe" &&
              !adjustmentIsRecurring &&
              !adjustmentActiveMonths.some(Boolean)
            : false
    const expenseRowId = editingAdjustment.rowId
    const isVariableExpense = getExpenseType(expenseRowId) === "variable"
    const isFixedExpense = getExpenseType(expenseRowId) === "fixe"
    const linkedRevenueSeasonality = isVariableExpense
      ? getLinkedRevenueSeasonalityForVariableExpense(expenseRowId, yearIndex)
      : null
    const expenseActualSeasonality = isFixedExpense
      ? resolveRevenueActualSeasonality(expenseRowId)
      : null
    const expenseActualYearLabels = expenseActualSeasonality?.years.map((y) => String(y.year)) ?? []
    const expenseSeasonalityApplyPresets = expenseActualSeasonality
      ? [
          ...expenseActualSeasonality.years.map((y) => ({
            key: String(y.year),
            label: `Saisonnalité ${y.year}`,
            monthPercents: y.percents,
            disabled: !y.hasData,
          })),
          {
            key: "average",
            label:
              expenseActualYearLabels.length === 2
                ? `Saisonnalité moyenne (${expenseActualYearLabels[0]}/${expenseActualYearLabels[1]})`
                : "Saisonnalité moyenne",
            monthPercents: expenseActualSeasonality.averagePercents,
            disabled: !expenseActualSeasonality.years.some((y) => y.hasData),
          },
        ]
      : undefined
    const summaryRowForExpenseDraft = data.find((r) => r.rowId === editingAdjustment.rowId)
    const summaryTrendForExpenseDraft = summaryRowForExpenseDraft?.trendValues
      ? forecastDisplayTrendToConfigTrend(summaryRowForExpenseDraft.trendValues, forecastActualCols)
      : undefined
    const baseSeasonalityPercents = normalizeForecastSeasonalityMonthPercents(
      expenseSeasonalityMonthPercents
    )
    const hasGrowthAdjustments = hasExpenseGrowthAdjustments(expenseRowId, yearIndex)

    let expenseMonthlyAmounts: number[] | null = null
    let expenseAdjustmentMonthlyAmounts: number[] = Array.from({ length: 12 }, () => 0)
    let expenseMonthlyWithAdjustments: number[] | null = null

    if (isVariableExpense && yearIndex > 0) {
      const variableRows = getVariableExpenseSeasonalityMonthlyRows(
        expenseRowId,
        yearIndex,
        baseSeasonalityPercents
      )
      if (variableRows) {
        expenseMonthlyAmounts = variableRows.depenses
        expenseAdjustmentMonthlyAmounts = variableRows.ajustement
        expenseMonthlyWithAdjustments = variableRows.avecAjustement
      }
    } else if (isFixedExpense && yearIndex > 0) {
      const baseForFixed =
        summaryTrendForExpenseDraft?.[0] ??
        (summaryRowForExpenseDraft?.rowId
          ? getRevenueValue(
              summaryRowForExpenseDraft.rowId,
              0,
              summaryTrendForExpenseDraft?.[0] ?? 0,
              undefined,
              summaryTrendForExpenseDraft
            )
          : 0)
      const fixedRows = getFixedExpenseSeasonalityMonthlyRows(
        expenseRowId,
        yearIndex,
        baseSeasonalityPercents,
        Math.abs(baseForFixed)
      )
      if (fixedRows) {
        expenseMonthlyAmounts = fixedRows.depenses
        expenseAdjustmentMonthlyAmounts = fixedRows.ajustement
        expenseMonthlyWithAdjustments = fixedRows.avecAjustement
      }
    } else {
      const expenseAnnualWithAdjustments =
        summaryRowForExpenseDraft?.rowId && Array.isArray(summaryTrendForExpenseDraft)
          ? Math.abs(
              getRevenueValue(
                summaryRowForExpenseDraft.rowId,
                yearIndex,
                summaryTrendForExpenseDraft[yearIndex] ?? 0,
                undefined,
                summaryTrendForExpenseDraft
              )
            )
          : null
      const amountOnlyMonthly = getExpenseAmountAdjustmentMonthlyAmounts(
        expenseRowId,
        yearIndex,
        baseSeasonalityPercents
      )
      const amountAnnual = amountOnlyMonthly.reduce((a, b) => a + b, 0)
      const expenseAnnualBase =
        expenseAnnualWithAdjustments != null
          ? Math.max(0, expenseAnnualWithAdjustments - amountAnnual)
          : null
      expenseMonthlyAmounts =
        expenseAnnualBase != null
          ? distributeAnnualRevenueBySeasonality(expenseAnnualBase, baseSeasonalityPercents)
          : null
      expenseAdjustmentMonthlyAmounts = amountOnlyMonthly
      expenseMonthlyWithAdjustments =
        expenseMonthlyAmounts != null
          ? expenseMonthlyAmounts.map((v, i) => v + (amountOnlyMonthly[i] ?? 0))
          : null
    }

    const expenseSeasonalityWithAdjustmentPercents =
      expenseMonthlyWithAdjustments != null && hasGrowthAdjustments
        ? monthPercentsFromMonthlyAmounts(expenseMonthlyWithAdjustments)
        : null

    const expenseSeasonalityOverlayLines: ForecastSeasonalityOverlayLine[] = []
    if (expenseActualSeasonality) {
      for (let i = 0; i < expenseActualSeasonality.years.length; i++) {
        const y = expenseActualSeasonality.years[i]!
        expenseSeasonalityOverlayLines.push({
          key: String(y.year),
          label: String(y.year),
          monthPercents: y.percents,
          color: FORECAST_SEASONALITY_ACTUAL_YEAR_COLORS[i] ?? FORECAST_SEASONALITY_ACTUAL_YEAR_COLORS[0],
          dashed: true,
        })
      }
    }
    if (isVariableExpense && linkedRevenueSeasonality) {
      expenseSeasonalityOverlayLines.push({
        key: "revenus-totaux",
        label: linkedRevenueSeasonality.linkLabel,
        monthPercents: linkedRevenueSeasonality.monthPercents,
        color: FORECAST_SEASONALITY_REVENUE_OVERLAY_BLUE,
        dashed: true,
      })
    }
    if (expenseSeasonalityWithAdjustmentPercents) {
      expenseSeasonalityOverlayLines.push({
        key: "avec-ajustement",
        label: "Avec ajustement",
        monthPercents: expenseSeasonalityWithAdjustmentPercents,
        color: FORECAST_SEASONALITY_WITH_ADJUSTMENT_COLOR,
        dashed: false,
      })
    }

    const expenseSeasonalityAmountRows =
      hasGrowthAdjustments && expenseMonthlyAmounts && expenseMonthlyWithAdjustments
        ? [
            {
              label: "Dépenses",
              values: expenseMonthlyAmounts,
              formatValue: formatCurrency,
              testId: "forecast-seasonality-amount-row",
            },
            {
              label: "Ajustement",
              values: expenseAdjustmentMonthlyAmounts,
              formatValue: formatCurrency,
              testId: "forecast-seasonality-adjustment-row",
            },
            {
              label: "Dépenses avec ajustement",
              values: expenseMonthlyWithAdjustments,
              formatValue: formatCurrency,
              testId: "forecast-seasonality-with-adjustment-row",
            },
          ]
        : [
            {
              label: "Dépenses",
              values: expenseMonthlyAmounts,
              formatValue: formatCurrency,
              testId: "forecast-seasonality-amount-row",
            },
          ]

    return (
      <div
        className={cn(
          embedded ? "w-full min-w-0 max-w-full overflow-x-auto overflow-y-visible" : "flex min-h-0 flex-1 flex-col",
          "min-w-0 max-w-full"
        )}
      >
          <Tabs
            value={expenseHypothesisEditorTab}
            onValueChange={(v) =>
              setExpenseHypothesisEditorTab(v === "saisonnalite" ? "saisonnalite" : "ajustement")
            }
            className={cn(
              "flex min-h-0 min-w-0 max-w-full flex-col gap-6",
              embedded ? "" : "min-h-0 flex-1"
            )}
          >
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Hypothèse</p>
                <h3 className="mt-3 text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl">{rowLabel}</h3>
                <p className="mt-3 text-xs font-medium leading-relaxed text-blue-800">
                  Année sélectionnée <span className="text-blue-600/50" aria-hidden>·</span>{" "}
                  <span className="font-semibold text-blue-900">{yearLabel}</span>
                </p>
                <TabsList className="mt-3 flex w-full max-w-lg flex-wrap gap-1 rounded-lg border border-slate-200/90 bg-slate-100/80 p-0.5 sm:inline-flex sm:w-fit sm:max-w-none">
                  <TabsTrigger
                    value="ajustement"
                    className="h-8 flex-1 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#2A2F3A] data-[state=active]:shadow-sm sm:flex-initial sm:px-3"
                  >
                    Ajustement
                  </TabsTrigger>
                  <TabsTrigger
                    value="saisonnalite"
                    className="h-8 flex-1 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#2A2F3A] data-[state=active]:shadow-sm sm:flex-initial sm:px-3"
                  >
                    Saisonnalité
                  </TabsTrigger>
                </TabsList>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {hypothesisSaveAckMessage}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 border-slate-200 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:border-slate-200 disabled:text-slate-400"
                  onClick={saveAdjustment}
                  disabled={
                    expenseHypothesisEditorTab === "saisonnalite"
                      ? !expenseSeasonalitySaveOk
                      : expenseAjustementSaveDisabled
                  }
                >
                  {expenseHypothesisEditorTab === "saisonnalite"
                    ? "Enregistrer la saisonnalité"
                    : editingAdjustmentId
                      ? "Enregistrer"
                      : "Enregistrer l'ajustement"}
                </Button>
                {(!analysisPanelNarrow || embedded) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 border-blue-200/90 text-xs font-medium text-blue-900 hover:bg-blue-50/90"
                    onClick={returnToExpenseHypothesisRow}
                  >
                    Fermer
                  </Button>
                )}
              </div>
            </div>

            <TabsContent
              value="ajustement"
              className="mt-0 min-h-0 min-w-0 max-w-full flex-1 outline-none focus-visible:ring-0"
            >
            <div className={cn("mt-2 pr-0.5", embedded && "min-w-0 max-w-full", !embedded && "min-h-0 flex-1 overflow-y-auto")}>
              <p className="mb-4 text-xs leading-relaxed text-slate-600">
                La croissance de base provient du menu <span className="font-medium text-slate-800">Type et Taux</span>{" "}
                (variable, fixe, inflation). Les ajustements ci-dessous permettent de modifier ponctuellement
                l&apos;hypothèse pour une année.
              </p>
              <div className={cn("flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-6", embedded && "min-w-0 max-w-full")}>
                {/* Gauche : ajouter / modifier un ajustement */}
                <div className="min-w-0 flex-1 rounded-2xl border border-slate-200/90 bg-white/85 p-4 shadow-sm sm:p-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {editingAdjustmentId ? "Modifier l'ajustement" : "Ajouter un ajustement"}
                      </h3>
                      {editingAdjustmentId ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingAdjustmentId(null)
                            setAdjustmentType("amount")
                            setAdjustmentAmount(0)
                            setAdjustmentPercentage(0)
                            setAdjustmentIsRecurring(false)
                            setAdjustmentAmountMonthPercents(createDefaultForecastSeasonalityMonthPercents())
                            setAdjustmentActiveMonths(Array.from({ length: 12 }, () => true))
                            setAdjustmentStartMonth(0)
                            setAdjustmentNote("")
                            if (editingAdjustment?.rowId) {
                              initExpenseHypothesisInflationFields(editingAdjustment.rowId)
                            }
                          }}
                        >
                          Annuler
                        </Button>
                      ) : null}
                    </div>

                    {editingAdjustment && getExpenseType(editingAdjustment.rowId) === "variable" && (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Type d&apos;ajustement</label>
                        <Select
                          value={adjustmentType === "inflation" ? "amount" : adjustmentType}
                          onValueChange={(value: "amount" | "percentage") => {
                            setAdjustmentType(value)
                            if (value === "amount") {
                              setAdjustmentAmount(0)
                              setAdjustmentIsRecurring(false)
                              setAdjustmentAmountMonthPercents(createDefaultForecastSeasonalityMonthPercents())
                            } else {
                              setAdjustmentPercentage(0)
                              setAdjustmentActiveMonths(Array.from({ length: 12 }, () => true))
                              setAdjustmentStartMonth(0)
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
                        <p className="mt-1 text-xs text-slate-500">
                          {adjustmentType === "amount"
                            ? "Ajustement en montant (positif pour augmenter, négatif pour diminuer), réparti sur les mois"
                            : "Modifier le pourcentage de la dépense par rapport aux revenus sur certains mois (ex: 0,3 % → 0,5 %)"}
                        </p>
                      </div>
                    )}

                    {editingAdjustment && getExpenseType(editingAdjustment.rowId) === "fixe" && (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Type d&apos;ajustement</label>
                        <Select
                          value={adjustmentType === "percentage" ? "amount" : adjustmentType}
                          onValueChange={(value: "amount" | "inflation") => {
                            setAdjustmentType(value)
                            if (value === "amount") {
                              setAdjustmentAmount(0)
                              setAdjustmentIsRecurring(false)
                              setAdjustmentStartMonth(0)
                              setAdjustmentAmountMonthPercents(
                                createDefaultForecastSeasonalityMonthPercents()
                              )
                            } else {
                              initExpenseHypothesisInflationFields(editingAdjustment.rowId)
                              setAdjustmentIsRecurring(false)
                              setAdjustmentActiveMonths(Array.from({ length: 12 }, () => true))
                              setAdjustmentStartMonth(0)
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="amount">Montant ($)</SelectItem>
                            <SelectItem value="inflation">Taux d&apos;inflation (%)</SelectItem>
                          </SelectContent>
                        </Select>
                          <p className="mt-1 text-xs text-slate-500">
                            {adjustmentType === "inflation"
                              ? "Définir un taux d'inflation pour cette année (récurrent ou ponctuel)"
                              : "Ajustement en montant (positif pour augmenter, négatif pour diminuer), réparti sur les mois"}
                          </p>
                      </div>
                    )}

                    {adjustmentType === "inflation" &&
                    editingAdjustment &&
                    getExpenseType(editingAdjustment.rowId) === "fixe" ? (
                      <div className="space-y-3">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Taux d&apos;inflation pour ce poste
                          </label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.1"
                              value={adjustmentInflationRate}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0
                                setAdjustmentInflationRate(value)
                              }}
                              className="w-full"
                            />
                            <span className="text-sm text-slate-600">%</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            Taux actuel du poste (défaut) : {getInflationRate(editingAdjustment.rowId).toFixed(1)} % —
                            taux global du tableau : {inflationRate.toFixed(1)} %
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setAdjustmentInflationRate(inflationRate)}
                            className="text-xs"
                          >
                            Reprendre le taux global ({inflationRate.toFixed(1)} %)
                          </Button>
                        </div>
                      </div>
                    ) : adjustmentType === "amount" ? (
                      <div className="space-y-4">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Montant de l&apos;ajustement ($)
                          </label>
                          <Input
                            type="number"
                            value={adjustmentAmount}
                            onChange={(e) => setAdjustmentAmount(parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full"
                          />
                          <p className="mt-1 text-xs text-slate-500">
                            Montant positif pour augmenter, négatif pour diminuer
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">
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
                          <p className="mt-1 text-xs text-slate-500">
                            Pourcentage appliqué aux revenus totaux sur les mois choisis (le taux Type/Taux reste
                            ailleurs)
                          </p>
                        </div>
                      </div>
                    )}

                    {!(
                      editingAdjustment &&
                      getExpenseType(editingAdjustment.rowId) === "variable" &&
                      adjustmentType === "amount"
                    ) ? (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Récurrence</label>
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
                      <p className="mt-1 text-xs text-slate-500">
                        {adjustmentType === "inflation"
                          ? adjustmentIsRecurring
                            ? "Ce taux s'applique à partir du mois choisi, puis aux années projetées suivantes"
                            : "Ce taux s'applique uniquement aux mois sélectionnés de cette année (les autres gardent le taux Type/Taux)"
                          : adjustmentType === "amount"
                            ? adjustmentIsRecurring
                              ? "Le montant s'applique à partir du mois choisi, puis aux années suivantes (avec inflation)"
                              : "Le montant s'applique uniquement à cette année ; répartissez-le sur les mois ci-dessous"
                            : adjustmentIsRecurring
                              ? "Le nouveau pourcentage s'applique à partir du mois choisi, puis aux années suivantes"
                              : "Le nouveau pourcentage s'applique uniquement aux mois sélectionnés de cette année"}
                      </p>
                    </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Ajustement en $ non récurrent : répartissez le montant sur les mois ci-dessous (somme 100 %).
                      </p>
                    )}

                    {editingAdjustment &&
                    adjustmentType === "amount" &&
                    (getExpenseType(editingAdjustment.rowId) === "variable" ||
                      !adjustmentIsRecurring) ? (
                      <div data-testid="expense-amount-month-distribution">
                        <ForecastSeasonalityEditor
                          compact
                          allowZeroMonthPercents
                          variant="depense"
                          embedded
                          yearLabel={yearLabel}
                          followingYearsLabel=""
                          canReplicateToFollowingYears={false}
                          replicateToFollowingYears={false}
                          onReplicateChange={() => {}}
                          replicateCheckboxId="expense-amount-adj-replicate"
                          monthPercents={adjustmentAmountMonthPercents}
                          onMonthPercentsChange={setAdjustmentAmountMonthPercents}
                        />
                      </div>
                    ) : null}

                    {editingAdjustment &&
                    ((getExpenseType(editingAdjustment.rowId) === "variable" &&
                      adjustmentType === "percentage") ||
                      (getExpenseType(editingAdjustment.rowId) === "fixe" &&
                        adjustmentType === "amount" &&
                        adjustmentIsRecurring) ||
                      (getExpenseType(editingAdjustment.rowId) === "fixe" &&
                        adjustmentType === "inflation")) ? (
                      (adjustmentType === "percentage" || adjustmentType === "inflation") &&
                      !adjustmentIsRecurring ? (
                        <div
                          data-testid={
                            adjustmentType === "inflation"
                              ? "fixed-inflation-active-months"
                              : "variable-pct-active-months"
                          }
                          className="space-y-2"
                        >
                          <label className="block text-sm font-medium text-slate-700">
                            Mois concernés ({yearLabel})
                          </label>
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                            {FORECAST_SEASONALITY_AXIS_LABELS.map((label, idx) => {
                              const id = `adj-active-month-${idx}`
                              return (
                                <div key={label} className="flex items-center gap-2">
                                  <Checkbox
                                    id={id}
                                    checked={adjustmentActiveMonths[idx] === true}
                                    onCheckedChange={(v) => {
                                      setAdjustmentActiveMonths((prev) => {
                                        const next = [...prev]
                                        next[idx] = v === true
                                        return next
                                      })
                                    }}
                                  />
                                  <Label htmlFor={id} className="cursor-pointer text-xs font-medium text-slate-700">
                                    {label}
                                  </Label>
                                </div>
                              )
                            })}
                          </div>
                          <p className="text-xs text-slate-500">
                            {adjustmentType === "inflation"
                              ? "Sur ces mois, le taux d'inflation de l'ajustement remplace le taux Type/Taux ; les autres mois gardent le taux de fond."
                              : "Sur ces mois, le nouveau % remplace le taux Type/Taux ; les autres mois gardent le taux de base."}
                          </p>
                        </div>
                      ) : (
                        <div
                          data-testid={
                            adjustmentType === "amount"
                              ? "fixed-amount-start-month"
                              : adjustmentType === "inflation"
                                ? "fixed-inflation-start-month"
                                : "variable-pct-start-month"
                          }
                        >
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Mois de début ({yearLabel})
                          </label>
                          <Select
                            value={String(adjustmentStartMonth)}
                            onValueChange={(v) => setAdjustmentStartMonth(Number(v))}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FORECAST_SEASONALITY_AXIS_LABELS.map((label, idx) => (
                                <SelectItem key={label} value={String(idx)}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="mt-1 text-xs text-slate-500">
                            {adjustmentType === "amount"
                              ? "À partir de ce mois (inclus) jusqu'à la fin de l'année, puis les années projetées suivantes (avec inflation)."
                              : adjustmentType === "inflation"
                                ? "À partir de ce mois (inclus), ce taux remplace le taux Type/Taux jusqu'à la fin de l'année, puis les années projetées suivantes."
                                : "À partir de ce mois (inclus) jusqu'à la fin de l'année, puis les années projetées suivantes."}
                          </p>
                        </div>
                      )
                    ) : null}

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Note explicative</label>
                      <Textarea
                        value={adjustmentNote}
                        onChange={(e) => setAdjustmentNote(e.target.value)}
                        placeholder="Ex: Déménagement vers un bureau plus grand, Location d'entrepôt temporaire, etc."
                        className="min-h-[80px] w-full"
                      />
                      <p className="mt-1 text-xs text-slate-500">Décrivez la raison de cet ajustement</p>
                    </div>
                  </div>

                </div>

                {/* Droite : ajustements existants */}
                <div className="min-w-0 flex-1 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 shadow-sm sm:p-5">
                  <h3 className="border-b border-slate-200/70 pb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Ajustements existants
                  </h3>
                  {existingAdjustments.length === 0 ? (
                    <p className="mt-4 text-sm leading-relaxed text-slate-500">
                      Aucun ajustement pour cette année.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {existingAdjustments.map((adj) => {
                        const expenseAdj = adj as ExpenseAdjustment
                        return (
                          <div key={expenseAdj.id} className="rounded-lg border border-slate-200 bg-white p-4">
                            <div className="mb-2 flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-slate-900">
                                    {expenseAdj.type === "amount"
                                      ? formatCurrency(expenseAdj.amount || 0)
                                      : expenseAdj.type === "inflation"
                                        ? `${(expenseAdj.inflationRate ?? getInflationRate(expenseAdj.rowId)).toFixed(1)} % inflation`
                                        : `${expenseAdj.percentage?.toFixed(1)}%`}
                                  </span>
                                  <span
                                    className={cn(
                                      "rounded px-2 py-0.5 text-xs",
                                      expenseAdj.type === "amount"
                                        ? expenseAdj.isRecurring
                                          ? "bg-purple-100 text-purple-700"
                                          : "bg-blue-100 text-blue-700"
                                        : expenseAdj.type === "inflation"
                                          ? expenseAdj.isRecurring
                                            ? "bg-purple-100 text-purple-700"
                                            : "bg-orange-100 text-orange-700"
                                          : expenseAdj.isRecurring
                                            ? "bg-green-100 text-green-700"
                                            : "bg-orange-100 text-orange-700"
                                    )}
                                  >
                                    {expenseAdj.isRecurring ? "Récurrent" : "Non récurrent"}
                                  </span>
                                  <span
                                    className={cn(
                                      "rounded px-2 py-0.5 text-xs",
                                      expenseAdj.type === "amount"
                                        ? "bg-slate-100 text-slate-700"
                                        : expenseAdj.type === "inflation"
                                          ? "bg-purple-100 text-purple-700"
                                          : "bg-indigo-100 text-indigo-700"
                                    )}
                                  >
                                    {expenseAdj.type === "amount"
                                      ? "Montant ($)"
                                      : expenseAdj.type === "inflation"
                                        ? "Inflation (%)"
                                        : "Pourcentage (%)"}
                                  </span>
                                </div>
                                {expenseAdj.note ? (
                                  <p className="mt-1 text-sm text-slate-600">{expenseAdj.note}</p>
                                ) : null}
                                {expenseAdj.type === "amount" &&
                                !expenseAdj.isRecurring &&
                                expenseAdj.amountMonthPercents?.length === 12 ? (
                                  <p className="mt-1 text-xs text-slate-500">
                                    Répartition mensuelle définie (somme{" "}
                                    {expenseAdj.amountMonthPercents.reduce((a, b) => a + b, 0)} %)
                                  </p>
                                ) : null}
                                {expenseAdj.type === "amount" &&
                                expenseAdj.isRecurring &&
                                isFixedExpense ? (
                                  <p className="mt-1 text-xs text-slate-500">
                                    À partir de{" "}
                                    {FORECAST_SEASONALITY_AXIS_LABELS[expenseAdj.startMonth ?? 0] ?? "janv."}
                                  </p>
                                ) : null}
                                {expenseAdj.type === "inflation" && isFixedExpense ? (
                                  <p className="mt-1 text-xs text-slate-500">
                                    {expenseAdj.isRecurring
                                      ? `À partir de ${FORECAST_SEASONALITY_AXIS_LABELS[expenseAdj.startMonth ?? 0] ?? "janv."}`
                                      : (() => {
                                          const months = expenseAdj.activeMonths
                                          if (!months || months.length !== 12) return "Tous les mois"
                                          const labels = FORECAST_SEASONALITY_AXIS_LABELS.filter(
                                            (_, i) => months[i]
                                          )
                                          if (labels.length === 12) return "Tous les mois"
                                          if (labels.length === 0) return "Aucun mois"
                                          return labels.join(", ")
                                        })()}
                                  </p>
                                ) : null}
                                {isVariableExpense && expenseAdj.type === "percentage" ? (
                                  <p className="mt-1 text-xs text-slate-500">
                                    {expenseAdj.isRecurring
                                      ? `À partir de ${FORECAST_SEASONALITY_AXIS_LABELS[expenseAdj.startMonth ?? 0] ?? "Jan"}`
                                      : (() => {
                                          const months = expenseAdj.activeMonths
                                          if (!months || months.length !== 12) return "Tous les mois"
                                          const labels = FORECAST_SEASONALITY_AXIS_LABELS.filter(
                                            (_, i) => months[i]
                                          )
                                          if (labels.length === 12) return "Tous les mois"
                                          if (labels.length === 0) return "Aucun mois"
                                          return labels.join(", ")
                                        })()}
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openAdjustmentModal(
                                      editingAdjustment.rowId,
                                      editingAdjustment.yearIndex,
                                      expenseAdj.id
                                    )
                                  }
                                  className="rounded p-1.5 transition-colors hover:bg-slate-200"
                                  title="Modifier"
                                >
                                  <Edit2 className="h-4 w-4 text-slate-600" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteAdjustment(expenseAdj.id)}
                                  className="rounded p-1.5 transition-colors hover:bg-red-100"
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            </TabsContent>
            <TabsContent
              value="saisonnalite"
              className="mt-0 min-h-0 min-w-0 max-w-full flex-1 outline-none focus-visible:ring-0"
            >
              <div className={cn("pr-0.5", embedded && "min-w-0 max-w-full")}>
                <p className="mb-3 text-xs text-slate-500">
                  {isVariableExpense
                    ? hasGrowthAdjustments
                      ? "La courbe éditable est la saisonnalité de fond (sans ajustement). La courbe verte intègre les ajustements en % des revenus (mois ciblés) et en montant $. Le tableau détaille Dépenses, Ajustement et Dépenses avec ajustement."
                      : "Cette dépense variable suit les revenus totaux projetés (Hypothèse revenus). Par défaut, sa saisonnalité reprend le mix pondéré des postes de revenus pour l’année sélectionnée ; la courbe bleue rappelle cette référence."
                    : hasGrowthAdjustments
                      ? "La courbe éditable est la saisonnalité de fond de ce poste (sans ajustement). La courbe verte intègre les effets d’inflation par mois et les montants $. Le tableau détaille Dépenses, Ajustement et Dépenses avec ajustement. Les courbes en pointillés rappellent 2024 / 2025."
                      : "Poste fixe : la saisonnalité ci-dessous décrit la répartition mensuelle de ce poste (données historiques du poste). Les courbes en pointillés reprennent les exercices réels ; vous pouvez appliquer une année ou la moyenne."}
                </p>
                <ForecastSeasonalityEditor
                  key={`exp-season-${expenseRowId}-${yearIndex}`}
                  variant="depense"
                  embedded={embedded}
                  yearLabel={yearLabel}
                  followingYearsLabel={followingYearsLabel}
                  canReplicateToFollowingYears={canReplicateToFollowingYears}
                  replicateToFollowingYears={replicateExpenseSeasonalityToFollowingYears}
                  onReplicateChange={(on) => {
                    setReplicateExpenseSeasonalityToFollowingYears(on)
                    if (on) setReplicateExpenseDisbursementToFollowingYears(false)
                  }}
                  replicateCheckboxId="expense-hypothesis-replicate-seasonality"
                  monthPercents={expenseSeasonalityMonthPercents}
                  onMonthPercentsChange={(next) => {
                    setExpenseSeasonalityAwaitingActuals(false)
                    setExpenseSeasonalityMonthPercents(next)
                  }}
                  overlayLines={
                    expenseSeasonalityOverlayLines.length > 0
                      ? expenseSeasonalityOverlayLines
                      : undefined
                  }
                  projectionLegendOverride={hasGrowthAdjustments ? "Sans ajustement" : undefined}
                  linkedRevenueSeasonalityApply={
                    !isFixedExpense && linkedRevenueSeasonality
                      ? {
                          label: linkedRevenueSeasonality.linkLabel,
                          monthPercents: linkedRevenueSeasonality.monthPercents,
                        }
                      : undefined
                  }
                  applySeasonalityPresets={expenseSeasonalityApplyPresets}
                  monthlyAmountRows={
                    expenseMonthlyAmounts != null ? expenseSeasonalityAmountRows : undefined
                  }
                  monthlyAmountRow={{
                    label: "Dépenses",
                    values: expenseMonthlyAmounts,
                    formatValue: formatCurrency,
                    unavailableHint:
                      "Montants mensuels indisponibles pour ce poste (données de projection manquantes).",
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>
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
            {!hideHeaderIcon && (
              <div className={dashboardCardHeaderIconBoxClass}>
                <ListTree className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
              </div>
            )}
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
            {isForecastSection &&
              view === "years" &&
              title !== "États des résultats pro forma" &&
              title !== "Estimation des revenus annuels" &&
              title !== "Estimation des dépenses annuelles" && (
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
                {showGrowthRate ? "Montants" : "% des revenus"}
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
            Aucune annexe disponible : définissez d&apos;abord des postes avec code parent et annexe dans la vue
            Sommaire.
          </div>
        )}

      {/* Table : en-tête / colonne Compte figés ; hypothèses en ligne sous le poste. */}
      <div ref={expenseHypothesisScrollAnchorRef} className="relative border-t border-slate-200/80">
        <div className="min-w-0 w-full">
          <div
            ref={detailTableHScrollRef}
            className={cn(
              "min-w-0 w-full max-h-[min(72vh,56rem)] overflow-auto overscroll-contain",
              tableUsesHorizontalSlider && "[scrollbar-width:thin]",
              /* Réserve la largeur du panneau hypothèses (overlay) pour que le scroll horizontal s’active et que la barre / le curseur « Défilement » apparaissent. */
              hypothesisDesktopAsideOpen && "lg:pr-[min(22rem,38vw)]",
              hypothesisDesktopAsideOpen && "lg:overflow-x-scroll",
              isStructureStudio ? "bg-gradient-to-b from-white to-slate-50/50" : "bg-white"
            )}
          >
            <div
              className={cn(
                showStructureCols && "w-full min-w-0",
                tableUsesHorizontalSlider &&
                  (forecastHypothesisTableWidthLock ? "w-max min-w-full" : "w-max min-w-full")
              )}
            >
        <table
          className={cn(
            "border-separate border-spacing-0",
            showStructureCols && "w-full min-w-0 table-fixed",
            !showStructureCols && !forecastHypothesisTableWidthLock && "w-full min-w-0",
            tableUsesHorizontalSlider && !forecastHypothesisTableWidthLock && "min-w-max",
            // Largeurs col (rem) + min-w-max : le panneau n’écrase plus les colonnes année.
            forecastHypothesisTableWidthLock && "table-fixed min-w-max",
          )}
        >
          {forecastHypothesisTableWidthLock && !showStructureCols && view === "years" && (() => {
            const yearLabels = getYearLabels()
            // Largeurs fixes (rem) : avec table-fixed + %, les années sont écrasées et
            // des montants type « 3 849 675 $ » sont coupés par le cadre de sélection.
            if (title === "Estimation des dépenses annuelles") {
              return (
                <colgroup key="hypothesis-width-lock-expense">
                  <col style={{ width: "20rem" }} />
                  <col style={{ width: "6.5rem" }} />
                  <col style={{ width: "6.5rem" }} />
                  {yearLabels.flatMap((_, i) => [
                    <col key={`year-${i}`} style={{ width: "10rem" }} />,
                    <col key={`pct-ca-${i}`} style={{ width: "4.75rem" }} />,
                  ])}
                </colgroup>
              )
            }
            return (
              <colgroup key="hypothesis-width-lock-revenue">
                <col style={{ width: "20rem" }} />
                {yearLabels.flatMap((_, i) => [
                  <col key={`year-${i}`} style={{ width: "10rem" }} />,
                  <col key={`pct-ca-${i}`} style={{ width: "4.75rem" }} />,
                ])}
              </colgroup>
            )
          })()}
          {showStructureCols && (
            <colgroup>
              <col style={{ width: "38%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "35%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "2.75rem" }} />
            </colgroup>
          )}
          <thead
            className={cn(
              "[&_tr:first-child_th]:sticky [&_tr:first-child_th]:top-0 [&_tr:first-child_th]:z-20",
              "[&_th]:border-b-2 [&_th]:border-slate-200",
              "[&_tr:first-child_th:first-child]:left-0 [&_tr:first-child_th:first-child]:z-30",
              showStructureCols
                ? "[&_tr:first-child_th]:bg-gradient-to-r [&_tr:first-child_th]:from-slate-50 [&_tr:first-child_th]:via-slate-100/40 [&_tr:first-child_th]:to-slate-50"
                : "[&_tr:first-child_th]:bg-gradient-to-b [&_tr:first-child_th]:from-slate-50 [&_tr:first-child_th]:to-slate-100/80",
            )}
          >
            <tr>
              <th
                className={cn(
                  "px-6 py-4 text-left text-sm font-semibold text-[#2A2F3A]",
                  !showStructureCols &&
                    (view === "12months"
                      ? "min-w-[20rem] sm:min-w-[24rem] lg:min-w-[30rem]"
                      : view === "years"
                        ? "min-w-[20rem]"
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
                    <th className="min-w-[6.5rem] px-4 py-4 text-center text-sm font-semibold whitespace-nowrap text-slate-900">
                      Type
                    </th>
                  )}
                  {/* New column between Type and years for Dépenses section */}
                  {title === "Estimation des dépenses annuelles" && (
                    <th className="min-w-[6.5rem] px-4 py-4 text-center text-sm font-semibold whitespace-nowrap text-slate-900">
                      Taux
                    </th>
                  )}
                  {getYearLabels().map((label, idx) => (
                    <Fragment key={idx}>
                      <th 
                        className={cn(
                          "min-w-[10rem] px-4 py-4 text-right text-sm font-semibold whitespace-nowrap",
                          isForecastHistoricalColumn(idx) 
                            ? "bg-slate-50 text-slate-400" 
                            : "text-slate-900",
                          yearGroupStartClass(idx)
                        )}
                        data-testid={idx > 0 && showYearPctCa ? yearGroupStartTestId : undefined}
                      >
                        {label}
                      </th>
                      {showYearPctCa && (
                        <th
                          data-testid={yearPctCaHeaderTestId}
                          className={cn(
                            "min-w-[4.5rem] px-2 py-4 text-right text-xs font-semibold whitespace-nowrap",
                            isForecastHistoricalColumn(idx)
                              ? "bg-slate-50 text-slate-400"
                              : "text-slate-500"
                          )}
                        >
                          % CA
                        </th>
                      )}
                    </Fragment>
                  ))}
                </>
              )}
            </tr>
            {/* Inflation rate row for Dépenses section */}
            {!showStructureCols && title === "Estimation des dépenses annuelles" && view === "years" && (
              <tr className="[&_th]:bg-slate-50">
                {/* Label cell */}
                <th className="min-w-[20rem] px-6 py-2 text-left">
                  <span className="text-xs font-medium text-slate-700">Taux d'inflation pour les dépenses fixes:</span>
                </th>
                {/* Empty cell for "Type" column */}
                <th className="min-w-[6.5rem] px-4 py-2" aria-hidden />
                {/* Inflation rate input in "Taux" column */}
                <th className="min-w-[6.5rem] px-4 py-2 text-center">
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
                  <Fragment key={idx}>
                    <th className={cn("min-w-[8rem] px-4 py-2", yearGroupStartClass(idx))} aria-hidden />
                    {showYearPctCa && (
                      <th className="min-w-[4.5rem] px-2 py-2" aria-hidden />
                    )}
                  </Fragment>
                ))}
              </tr>
            )}
          </thead>
          <tbody
            className={cn(
              /* Comme Bilan Détail : bordures sur td (border-separate) + colonne Compte figée. */
              "[&_td]:border-b [&_td]:border-slate-200",
              "[&_td:first-child]:sticky [&_td:first-child]:left-0 [&_td:first-child]:z-10",
              "[&_td:first-child]:bg-white",
            )}
          >
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
              /** Panneau hypothèses ouvert : ne garder que la ligne du poste (comme revenus / dépenses). */
              const hideRowForForecastHypothesisFocus =
                !showStructureCols &&
                ((expenseHypothesisInlineActive &&
                  expenseHypothesisAnchorIdx >= 0 &&
                  idx !== expenseHypothesisAnchorIdx) ||
                  (revenueHypothesisInlineActive &&
                    revenueHypothesisAnchorIdx >= 0 &&
                    idx !== revenueHypothesisAnchorIdx))

              if (hideRowForForecastHypothesisFocus) {
                return <Fragment key={`detail-skip-hypothesis-focus-${idx}`} />
              }

              const variation = row.current && row.prior ? calculateVariation(row.current, row.prior) : null
              const variationAmount = row.current && row.prior ? row.current - row.prior : 0
              const isSpacer = row.label === "" && !row.isAnnexPlaceholder
              const shouldHideAmounts =
                isSpacer || !!row.isSection || !!row.isAnnexPlaceholder || !!row.isAnnexTitle
              const isRevenueForecast = title === "Estimation des revenus annuels"
              const isExpenseForecast = title === "Estimation des dépenses annuelles"
              const isRevenueOrExpenseHypothesis = isRevenueForecast || isExpenseForecast
              const isRevenusHeaderRow = isRevenueForecast && view === "years" && normLabel(String(row.label ?? "")) === "revenus"
              /** Hors Paramètres : libellé sous-total masqué (blanc) mais chiffres en noir (sauf année de référence). */
              const annexSubtotalDarkNumbers = row.isAnnexSubtotal && !showStructureCols
              /** Titres d’annexe / spacers : cellules numériques vides (pas « - » ni 0 $). */
              const blankHypothesisNumericCell =
                isRevenueOrExpenseHypothesis &&
                shouldHideAmounts &&
                !(isRevenusHeaderRow && revenueHeaderYearTotals)
              const displayLabel = row.label

              const isBoldForStyle =
                showStructureCols && structRow && !row.isAnnexPlaceholder && !row.isAnnexSubtotal
                  ? structureStudioLabelBold(structRow, row)
                  : !!row.isBold

              /** Sous-total : séparateur toujours au-dessus (pas sous le poste / GL), comme Bilan Détail. */
              const isSubtotalRow =
                !!row.isSubtotal ||
                !!row.isAnnexSubtotal ||
                (!!showStructureCols && layoutEntry?.kind === "annexSubtotal")

              // Check if this row can be expanded and if it's expanded
              // If projectionMode is "account", disable expansion for forecast sections (revenus, dépenses, capex, états des résultats pro forma)
              const isForecastSectionForExpansion = title === "Estimation des revenus annuels" || title === "Estimation des dépenses annuelles" || title === "Estimation des Capex annuels" || title === "États des résultats pro forma"
              // Pas d’icône / expansion sur titres de section, titres d’annexe, placeholders, etc.
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
                  : disableRowInteractions
                    ? false
                  : (projectionMode === "account" && isForecastSectionForExpansion)
                    ? false
                    : !!row.rowId &&
                      !!row.balanceAccounts &&
                      Array.isArray(row.balanceAccounts) &&
                      row.balanceAccounts.length > 0 &&
                      balanceSheetDetailRowsLookLikeGlAccounts(
                        row.balanceAccounts.map((a) => ({ id: a.accountNumber })),
                        standardLinkCodes,
                      ) &&
                      !isGlBreakdownExcludedRow
              const isExpanded = row.rowId ? expandedRows.has(row.rowId) : false
              /** À l’ouverture : montants en graisse normale (comme Bilan Détail). */
              const amountWeightClass =
                row.isBold && !isExpanded ? "font-semibold font-bold" : "text-slate-500"
              const amountWeightClassPrior =
                row.isBold && !isExpanded
                  ? "font-semibold font-bold text-slate-600"
                  : "text-slate-500"
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
                  {isSubtotalRow && (
                    <tr aria-hidden data-testid="income-statement-detail-subtotal-separator">
                      <td
                        colSpan={detailTableColumnCount}
                        className="border-0 p-0 align-top leading-none border-t-2 border-t-slate-900"
                      />
                    </tr>
                  )}
                  <tr
                    id={row.rowId ? `income-statement-detail-row-${row.rowId}` : undefined}
                    className={cn(
                      showStructureCols
                        ? cn(
                            detailParamRowHover && "hover:[&>td]:bg-slate-100/70",
                            row.isAnnexHeader && "[&>td]:bg-amber-50/90",
                            annexSubtotalDarkNumbers && "[&>td:first-child]:bg-white"
                          )
                        : cn(
                            row.label === "" && !row.isAnnexPlaceholder ? "h-2" : "",
                            row.isAnnexPlaceholder &&
                              (title === "Estimation des dépenses annuelles"
                                ? "[&>td:first-child]:bg-white [&>td:nth-child(2)]:bg-white [&>td:nth-child(3)]:bg-white"
                                : "[&>td:first-child]:bg-white"),
                            annexSubtotalDarkNumbers &&
                              (title === "Estimation des dépenses annuelles"
                                ? "[&>td:first-child]:bg-white [&>td:nth-child(2)]:bg-white [&>td:nth-child(3)]:bg-white"
                                : "[&>td:first-child]:bg-white"),
                            row.isAnnexHeader && "[&>td]:bg-amber-50/90 [&>td:first-child]:bg-amber-50/90",
                            !isSpacer &&
                              (row.isAnnexHeader
                                ? "hover:[&>td]:bg-amber-100/85 hover:[&>td:first-child]:bg-amber-100/85"
                                : "hover:[&>td]:bg-slate-50/90 hover:[&>td:first-child]:bg-slate-50/90"),
                            canExpand && row.rowId && "cursor-pointer"
                          )
                    )}
                    onClick={
                      !showStructureCols && canExpand && row.rowId
                        ? () => toggleRow(row.rowId!)
                        : undefined
                    }
                  >
                    <td
                      className={cn(
                        "px-6 py-3",
                        showStructureCols
                          ? "min-w-0 w-full py-3.5 pl-4 pr-3"
                          : view === "12months"
                            ? "min-w-[20rem] sm:min-w-[24rem] lg:min-w-[30rem]"
                            : view === "years" && !showStructureCols
                              ? "min-w-[20rem]"
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
                          ) : summaryAnnexLockedInDetail || isStructureRowDetailOnly(structRow) ? (
                            <span
                              className="flex-1 rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 py-2 text-sm text-slate-800"
                              title={
                                summaryAnnexLockedInDetail
                                  ? "Libellé modifiable dans la vue Sommaire (Paramètres)"
                                  : "Libellé défini par le plan standard (Codes de liaison)"
                              }
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
                          <>
                            {canExpand && row.rowId && (
                              <span className="flex-shrink-0" aria-hidden>
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-slate-500" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-slate-500" />
                                )}
                              </span>
                            )}
                            {!canExpand && row.indent && <span className="w-4" />}
                            <span
                              className="flex-1 whitespace-nowrap"
                              aria-expanded={canExpand && row.rowId ? isExpanded : undefined}
                            >
                              {displayLabel}
                            </span>
                          </>
                        )}
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                        {/* Même largeur que le bouton pour aligner les libellés sur toutes les lignes */}
                        <div className="flex h-8 w-9 shrink-0 items-center justify-center">
                          {!disableRowInteractions && (canExpand || (row.rowId && isNoteAllowed() && !showStructureCols)) ? (
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
                      <td className="box-border min-w-0 px-2 py-2.5 align-middle text-center">
                        <span className="text-sm text-slate-300">—</span>
                      </td>
                      <td className="box-border min-w-0 px-2 py-2.5 align-middle">
                        <span className="text-sm text-slate-300">—</span>
                      </td>
                      <td className="box-border min-w-0 px-2 py-2.5 align-middle text-center">
                        <span className="text-sm text-slate-300">—</span>
                      </td>
                      <td className="box-border w-11 px-0 py-2.5 align-middle" />
                    </>
                  )}
                  {showStructureCols && row.isAnnexSubtotal && (
                    <>
                      <td className="box-border min-w-0 px-2 py-2.5 align-middle text-center">
                        <span className="text-sm text-slate-300">—</span>
                      </td>
                      <td className="box-border min-w-0 px-2 py-2.5 align-middle">
                        <span className="text-sm text-slate-300">—</span>
                      </td>
                      <td className="box-border min-w-0 px-2 py-2.5 align-middle text-center">
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
                  )}

                  {!showStructureCols && view === "current" && (
                    <td className={`px-6 py-3 text-right ${amountWeightClass} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}>
                      {row.current !== 0 ? formatCurrency(row.current) : "-"}
                    </td>
                  )}

                  {!showStructureCols && view === "comparison" && !isComparisonMode && (
                    <>
                      <td className={`px-6 py-3 text-right ${amountWeightClass} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}>
                        {row.current !== 0 ? formatCurrency(row.current) : "-"}
                      </td>
                      <td
                        className={`px-6 py-3 text-right ${amountWeightClassPrior} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}
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
                          <td className={`px-6 py-3 text-right ${amountWeightClass} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}>
                            {row.current !== 0 ? `${getRevenuePercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${amountWeightClassPrior} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}>
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
                            className={`px-6 py-3 text-right ${amountWeightClass} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}
                          >
                            {entityRow.current !== 0 ? formatCurrency(entityRow.current) : "-"}
                          </td>
                        )
                      })}
                    </>
                  )}
                  {!showStructureCols && view === "ddm" && !isComparisonMode && (
                    <>
                      <td className={`px-6 py-3 text-right ${amountWeightClass} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}>
                        {row.current !== 0 ? formatCurrency(row.current) : "-"}
                      </td>
                      <td
                        className={`px-6 py-3 text-right ${amountWeightClassPrior} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}
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
                          <td className={`px-6 py-3 text-right ${amountWeightClass} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}>
                            {row.current !== 0 ? `${getRevenuePercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${amountWeightClassPrior} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}>
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
                            className={`px-6 py-3 text-right ${amountWeightClass} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}
                          >
                            {entityRow.current !== 0 ? formatCurrency(entityRow.current) : "-"}
                          </td>
                        )
                      })}
                    </>
                  )}

                  {!showStructureCols && view === "ytd" && !isComparisonMode && (
                    <>
                      <td className={`px-6 py-3 text-right ${amountWeightClass} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}>
                        {row.current !== 0 ? formatCurrency(row.current) : "-"}
                      </td>
                      <td
                        className={`px-6 py-3 text-right ${amountWeightClassPrior} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}
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
                          <td className={`px-6 py-3 text-right ${amountWeightClass} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}>
                            {row.current !== 0 ? `${getRevenuePercentage(row.current, false).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`px-6 py-3 text-right ${amountWeightClassPrior} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}>
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
                            className={`px-6 py-3 text-right ${amountWeightClass} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}
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
                          className={`px-4 py-3 text-right ${amountWeightClass} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}
                        >
                          {columnMode === "percentage"
                            ? (value !== 0 ? `${getTrendRevenuePercentage(value, valueIdx).toFixed(1)}%` : "-")
                            : isTrendVariationMode
                              ? renderTrendVariationText(row.trendValues ?? [], valueIdx)
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
                          className={`px-4 py-3 text-right ${amountWeightClass} ${shouldHideAmounts ? "text-white" : ""}${annexSubtotalDarkNumbers ? " text-slate-900" : ""}`}
                        >
                          {columnMode === "percentage"
                            ? (value !== 0 ? `${getTrendRevenuePercentage(value, valueIdx).toFixed(1)}%` : "-")
                            : isTrendVariationMode
                              ? renderTrendVariationText(row.trendValues ?? [], valueIdx)
                              : (value !== 0 ? formatCurrency(value) : "-")}
                        </td>
                      ))}
                    </>
                  )}
                  {!showStructureCols && view === "years" && row.trendValues && (
                    <>
                      {/* Type cell for Dépenses section */}
                      {title === "Estimation des dépenses annuelles" && (
                        <td
                          className={cn(
                            "min-w-[6.5rem] px-4 py-3 text-center",
                            row.rowId && !shouldHideAmounts && !disableRowInteractions && "cursor-pointer hover:bg-slate-50/90"
                          )}
                          onClick={() => {
                            if (!shouldHideAmounts && row.rowId && !disableRowInteractions) {
                              openTypeRateModal(row.rowId)
                            }
                          }}
                          onKeyDown={(e) => {
                            if (shouldHideAmounts || !row.rowId || disableRowInteractions) return
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              openTypeRateModal(row.rowId)
                            }
                          }}
                          role={row.rowId && !shouldHideAmounts && !disableRowInteractions ? "button" : undefined}
                          tabIndex={row.rowId && !shouldHideAmounts && !disableRowInteractions ? 0 : undefined}
                          aria-label={
                            row.rowId && !shouldHideAmounts && !disableRowInteractions
                              ? "Modifier le type et le taux pour ce poste"
                              : undefined
                          }
                        >
                          {shouldHideAmounts ? (
                            "-"
                          ) : row.rowId ? (
                            <div className="flex items-center justify-center">
                              <span
                                className={cn(
                                  "rounded px-2 py-1 text-xs font-medium",
                                  getExpenseType(row.rowId) === "variable"
                                    ? "bg-blue-50 text-blue-600"
                                    : "bg-purple-50 text-purple-600"
                                )}
                              >
                                {getExpenseType(row.rowId) === "variable" ? "Variable" : "Fixe"}
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                      )}
                      {/* Taux column cell for Dépenses section */}
                      {title === "Estimation des dépenses annuelles" && view === "years" && (
                        <td className="min-w-[6.5rem] px-4 py-3 text-center text-slate-700">
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
                      {getYearLabels().map((_, valueIdx) => {
                        const value = row.trendValues?.[valueIdx] ?? 0
                        const annexLetterNorm = normalizeAnnexLetter(String(row.annexLetter ?? ""))
                        const annexForecastTotalsForRow =
                          isForecastSection &&
                          row.isAnnexSubtotal &&
                          annexLetterNorm
                            ? (title === "Estimation des revenus annuels"
                                ? revenueAnnexForecastYearTotalsByLetter
                                : title === "Estimation des dépenses annuelles"
                                  ? expenseAnnexForecastYearTotalsByLetter
                                  : undefined
                              )?.get(annexLetterNorm)
                            : undefined
                        // Get the actual value (edited or default) for forecast sections
                        const actualValue = isForecastSection && row.rowId 
                          ? displayedHypothesisAmount(row.rowId, valueIdx, value, row.trendValues)
                          : value
                        const effectiveValue =
                          isRevenusHeaderRow && revenueHeaderYearTotals
                            ? (revenueHeaderYearTotals[valueIdx] ?? 0)
                            : annexForecastTotalsForRow
                              ? (annexForecastTotalsForRow[valueIdx] ?? 0)
                              : actualValue
                        
                        // Check if this cell is editable (forecast section, not first year, has rowId)
                        // For "Estimation des dépenses annuelles", "Estimation des revenus annuels", and "États des résultats pro forma", cells are not directly editable (only via adjustments)
                        const isEditable = isForecastSection && isForecastProjectedColumn(valueIdx) && row.rowId && !shouldHideAmounts && title !== "Estimation des dépenses annuelles" && title !== "Estimation des revenus annuels" && title !== "États des résultats pro forma"
                        const cellKey = row.rowId ? `${row.rowId}-${valueIdx}` : null
                        const isEditing = isEditable && editingCell === cellKey
                        const isRevenueProjectionCell =
                          title === "Estimation des revenus annuels" &&
                          isForecastProjectedColumn(valueIdx) &&
                          !!row.rowId &&
                          !shouldHideAmounts &&
                          !row.isAnnexTitle &&
                          !row.isAnnexSubtotal &&
                          !row.isAnnexPlaceholder
                        const isRevenueHypothesisSelected =
                          revenueHypothesisPanelOpen &&
                          editingAdjustment?.rowId === row.rowId &&
                          forecastConfigToDisplayYearIndex(
                            editingAdjustment.yearIndex,
                            forecastActualCols,
                          ) === valueIdx
                        const isExpenseProjectionCell =
                          title === "Estimation des dépenses annuelles" &&
                          isForecastProjectedColumn(valueIdx) &&
                          !!row.rowId &&
                          !shouldHideAmounts &&
                          !row.isAnnexTitle &&
                          !row.isAnnexSubtotal &&
                          !row.isAnnexPlaceholder &&
                          projectionMode === "account"
                        const isExpenseHypothesisSelected =
                          expenseHypothesisPanelOpen &&
                          editingAdjustment?.rowId === row.rowId &&
                          forecastConfigToDisplayYearIndex(
                            editingAdjustment.yearIndex,
                            forecastActualCols,
                          ) === valueIdx

                        // Get previous value for growth calculation (1re année projetée → N-1 si YTD)
                        const growthBaseDisplayIdx = forecastGrowthBaseDisplayIndex(
                          valueIdx,
                          forecastActualCols,
                        )
                        const previousValue =
                          growthBaseDisplayIdx != null && annexForecastTotalsForRow
                            ? (annexForecastTotalsForRow[growthBaseDisplayIdx] ?? 0)
                            : growthBaseDisplayIdx != null && row.trendValues
                              ? isForecastSection && row.rowId
                                ? displayedHypothesisAmount(
                                    row.rowId,
                                    growthBaseDisplayIdx,
                                    row.trendValues[growthBaseDisplayIdx],
                                    row.trendValues,
                                  )
                                : row.trendValues[growthBaseDisplayIdx]
                              : null
                        
                        // Calculate growth rate if showGrowthRate is true and not first year
                        let displayValue: string | number = effectiveValue
                        let growthRate: number | null = null
                        if (showGrowthRate && isForecastSection && growthBaseDisplayIdx != null && previousValue !== null) {
                          if (previousValue !== 0) {
                            growthRate = calculateVariation(effectiveValue, previousValue)
                            displayValue = growthRate !== null ? `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(1)}%` : "-"
                          } else {
                            displayValue = "-"
                          }
                        } else if (showGrowthRate && isForecastSection && isForecastHistoricalColumn(valueIdx)) {
                          displayValue = "-" // No growth rate for first year
                        }
                        
                        return (
                          <Fragment key={valueIdx}>
                          <td
                            className={cn(
                              "min-w-[10rem] px-3 py-3 text-right whitespace-nowrap tabular-nums",
                              amountWeightClass,
                              shouldHideAmounts && !blankHypothesisNumericCell
                                ? "text-transparent"
                                : "",
                              isForecastHistoricalColumn(valueIdx)
                                ? "bg-slate-50 text-slate-400"
                                : "",
                              yearGroupStartClass(valueIdx),
                              isEditable && !isEditing && "hover:bg-slate-50 cursor-pointer",
                              showGrowthRate && isForecastSection && valueIdx > 0 && !shouldHideAmounts && typeof displayValue === "string" && displayValue.includes("%") && title === "Estimation des revenus annuels" ? "text-slate-900" : "",
                              showGrowthRate && isForecastSection && valueIdx > 0 && !shouldHideAmounts && typeof displayValue === "string" && displayValue.includes("%") && growthRate !== null && growthRate >= 0 && title !== "Estimation des revenus annuels" ? "text-emerald-600 font-semibold" : "",
                              showGrowthRate && isForecastSection && valueIdx > 0 && !shouldHideAmounts && typeof displayValue === "string" && displayValue.includes("%") && growthRate !== null && growthRate < 0 && title !== "Estimation des revenus annuels" ? "text-red-600 font-semibold" : "",
                              annexSubtotalDarkNumbers && valueIdx > 0 && "text-slate-900",
                              blankHypothesisNumericCell && "text-transparent select-none",
                              isRevenueHypothesisSelected &&
                                "z-[1] bg-orange-50 shadow-[inset_0_0_0_2px_rgb(224,116,45)]",
                              isExpenseHypothesisSelected &&
                                "z-[1] bg-blue-50 shadow-[inset_0_0_0_2px_rgb(59,130,246)]",
                              isRevenueProjectionCell &&
                                !isEditing &&
                                !isRevenueHypothesisSelected &&
                                "cursor-pointer hover:bg-slate-50/90",
                              isExpenseProjectionCell &&
                                !isEditing &&
                                !isExpenseHypothesisSelected &&
                                "cursor-pointer hover:bg-slate-50/90",
                              (isRevenueProjectionCell || isExpenseProjectionCell) &&
                                !isEditing &&
                                "cursor-pointer"
                            )}
                            onClick={() => {
                              if (isRevenueProjectionCell && row.rowId) {
                                const cfg = forecastDisplayToConfigYearIndex(valueIdx, forecastActualCols)
                                if (cfg != null) openAdjustmentModal(row.rowId, cfg)
                                return
                              }
                              if (isExpenseProjectionCell && row.rowId) {
                                const cfg = forecastDisplayToConfigYearIndex(valueIdx, forecastActualCols)
                                if (cfg != null) openAdjustmentModal(row.rowId, cfg)
                                return
                              }
                              if (
                                isEditable &&
                                !isEditing &&
                                title !== "Estimation des dépenses annuelles" &&
                                title !== "États des résultats pro forma"
                              ) {
                                setEditingCell(cellKey!)
                              }
                            }}
                          >
                            {blankHypothesisNumericCell ? (
                              "\u00A0"
                            ) : shouldHideAmounts && !(isRevenusHeaderRow && revenueHeaderYearTotals) ? (
                              "-"
                            ) : isEditable && isEditing ? (
                              <Input
                                type="text"
                                value={showGrowthRate && previousValue !== null && previousValue !== 0
                                  ? (growthRate !== null ? `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(1)}` : "")
                                  : effectiveValue.toString()}
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
                                      : !isForecastSection && isTrendVariationMode
                                        ? renderTrendVariationText(row.trendValues ?? [], valueIdx)
                                        : (effectiveValue !== 0 ? formatCurrency(effectiveValue) : "-")}
                                </div>
                              </div>
                            )}
                          </td>
                          {showYearPctCa && (
                            <td
                              data-testid={yearPctCaCellTestId}
                              className={cn(
                                "min-w-[4.5rem] px-2 py-3 text-right text-xs tabular-nums text-slate-500",
                                amountWeightClass,
                                isForecastHistoricalColumn(valueIdx)
                                  ? "bg-slate-50 text-slate-400"
                                  : "",
                                annexSubtotalDarkNumbers && valueIdx > 0 && "text-slate-900",
                                blankHypothesisNumericCell && "text-transparent select-none"
                              )}
                            >
                              {blankHypothesisNumericCell
                                ? "\u00A0"
                                : shouldHideAmounts && !(isRevenusHeaderRow && revenueHeaderYearTotals)
                                  ? "-"
                                  : formatShareOfRevenuePct(
                                      effectiveValue,
                                      getHypothesisCaForYearIndex(valueIdx),
                                    )}
                            </td>
                          )}
                          </Fragment>
                        )
                      })}
                    </>
                  )}
                  {/* Empty cells for spacer rows in trend views */}
                  {(view === "12months" || view === "quarters" || view === "years") && !row.trendValues && (
                    <>
                      {/* Empty type cell for Dépenses section */}
                      {title === "Estimation des dépenses annuelles" && view === "years" && (
                        <td className="min-w-[6.5rem] px-4 py-3 text-center text-white">-</td>
                      )}
                      {/* Empty new column cell for Dépenses section */}
                      {title === "Estimation des dépenses annuelles" && view === "years" && (
                        <td className="min-w-[6.5rem] px-4 py-3 text-center text-white">-</td>
                      )}
                      {Array.from({ length: view === "12months" ? 12 : view === "quarters" ? INCOME_STATEMENT_QUARTER_COUNT : (isForecastSection && view === "years" ? forecastYearCount : PERFORMANCE_CHART_YEAR_COUNT) }).map((_, idx) => (
                        <Fragment key={idx}>
                        <td 
                          className={cn(
                            view === "years" && "min-w-[8rem]",
                            "px-4 py-3 text-right text-sm text-transparent",
                            (forceForecastSection || isForecastSection) && view === "years" && isForecastHistoricalColumn(idx) ? "bg-slate-50" : "",
                            view === "years" ? yearGroupStartClass(idx) : undefined
                          )}
                        >
                          -
                        </td>
                        {showYearPctCa && view === "years" && (
                          <td
                            className={cn(
                              "min-w-[4.5rem] px-2 py-3 text-right text-xs text-transparent",
                              isForecastHistoricalColumn(idx) ? "bg-slate-50" : ""
                            )}
                          >
                            -
                          </td>
                        )}
                        </Fragment>
                      ))}
                    </>
                  )}
                </tr>
                  {title === "Estimation des revenus annuels" &&
                    view === "years" &&
                    !showStructureCols &&
                    Array.isArray(row.trendValues) &&
                    row.trendValues.length > 1 &&
                    (() => {
                      const isRevenusHeader = normLabel(String(row.label ?? "")) === "revenus"
                      const isRevenuePost =
                        !shouldHideAmounts && !!row.rowId && !!row.indent
                      const annexL = normalizeAnnexLetter(String(row.annexLetter ?? ""))
                      const isAnnexSubtotalGrowthRow =
                        isForecastSection &&
                        !!row.isAnnexSubtotal &&
                        !!annexL &&
                        !!revenueAnnexForecastYearTotalsByLetter?.has(annexL)
                      if (!(isRevenusHeader || isRevenuePost || isAnnexSubtotalGrowthRow)) return null
                      return (
                        <Fragment key={`revenue-croissance-${idx}`}>
                          <tr>
                            <td
                              className={cn(
                                "min-w-[20rem] px-6 py-2 text-slate-600",
                                normLabel(String(row.label ?? "")) === "revenus" ? "pl-6" : "pl-16"
                              )}
                            >
                              <span className="sr-only">Croissance</span>
                            </td>
                            {row.trendValues.map((raw, valueIdx) => {
                              const isRevenusHeaderInner = normLabel(String(row.label ?? "")) === "revenus"
                              const annexLInner = normalizeAnnexLetter(String(row.annexLetter ?? ""))
                              const annexSubGrowthTotals =
                                row.isAnnexSubtotal && annexLInner
                                  ? revenueAnnexForecastYearTotalsByLetter?.get(annexLInner)
                                  : undefined
                              const v =
                                isRevenusHeaderInner && revenueHeaderYearTotals
                                  ? (revenueHeaderYearTotals[valueIdx] ?? 0)
                                  : annexSubGrowthTotals
                                    ? (annexSubGrowthTotals[valueIdx] ?? 0)
                                    : isForecastSection && row.rowId
                                      ? displayedHypothesisAmount(row.rowId, valueIdx, raw, row.trendValues)
                                      : raw
                              if (isForecastHistoricalColumn(valueIdx)) {
                                return (
                                  <Fragment key={valueIdx}>
                                    <td
                                      className={cn(
                                        "min-w-[8rem] px-4 py-2 text-right text-[12px] italic text-slate-400",
                                        isForecastHistoricalColumn(valueIdx)
                                          ? "bg-slate-50"
                                          : ""
                                      )}
                                    >
                                      -
                                    </td>
                                    {showYearPctCa ? (
                                      <td
                                        className={cn(
                                          "min-w-[4.5rem] px-2 py-2 text-right text-[12px] italic text-slate-400",
                                          (forceForecastSection || isForecastSection) && "bg-slate-50"
                                        )}
                                      >
                                        -
                                      </td>
                                    ) : null}
                                  </Fragment>
                                )
                              }
                              const growthBaseDisplayIdx = forecastGrowthBaseDisplayIndex(
                                valueIdx,
                                forecastActualCols,
                              )
                              if (growthBaseDisplayIdx == null) {
                                return (
                                  <Fragment key={valueIdx}>
                                    <td
                                      className={cn(
                                        "min-w-[8rem] px-4 py-2 text-right text-[12px] italic text-slate-400",
                                        yearGroupStartClass(valueIdx),
                                      )}
                                    >
                                      -
                                    </td>
                                    {showYearPctCa ? (
                                      <td className="min-w-[4.5rem] px-2 py-2 text-right text-[12px] italic text-slate-400">
                                        -
                                      </td>
                                    ) : null}
                                  </Fragment>
                                )
                              }
                              const prevRaw = row.trendValues?.[growthBaseDisplayIdx] ?? 0
                              const prev =
                                isRevenusHeaderInner && revenueHeaderYearTotals
                                  ? (revenueHeaderYearTotals[growthBaseDisplayIdx] ?? 0)
                                  : annexSubGrowthTotals
                                    ? (annexSubGrowthTotals[growthBaseDisplayIdx] ?? 0)
                                    : isForecastSection && row.rowId
                                      ? displayedHypothesisAmount(
                                          row.rowId,
                                          growthBaseDisplayIdx,
                                          prevRaw,
                                          row.trendValues
                                        )
                                      : prevRaw
                              const growth =
                                prev !== 0 ? calculateVariation(v ?? 0, prev ?? 0) : null
                              const display =
                                growth === null ? "-" : `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`
                              return (
                                <Fragment key={valueIdx}>
                                  <td
                                    className={cn(
                                      "min-w-[8rem] px-4 py-2 text-right text-[12px] italic tabular-nums",
                                      yearGroupStartClass(valueIdx),
                                      growth === null
                                        ? "text-slate-400"
                                        : growth >= 0
                                          ? "text-emerald-700"
                                          : "text-red-700"
                                    )}
                                  >
                                    {display}
                                  </td>
                                  {showYearPctCa ? (
                                    <td className="min-w-[4.5rem] px-2 py-2 text-right text-[12px] italic text-slate-400">
                                      -
                                    </td>
                                  ) : null}
                                </Fragment>
                              )
                            })}
                          </tr>
                        </Fragment>
                      )
                    })()}
                  {revenueHypothesisInlineActive &&
                    revenueHypothesisAnchorIdx === idx &&
                    revenueHypothesisAnchorIdx >= 0 &&
                    editingAdjustment && (
                      <tr
                        key={`revenue-hypothesis-inline-${editingAdjustment.rowId}-${editingAdjustment.yearIndex}`}
                        className="bg-slate-50/95"
                      >
                        <td
                          colSpan={1 + getYearLabels().length * (showYearPctCa ? 2 : 1)}
                          className="min-w-0 border-b-2 border-[#E0742D]/35 p-0 align-top"
                        >
                          <div className="min-w-0 max-w-full overflow-x-auto px-3 py-3 sm:px-5 sm:py-4">
                            {renderRevenueHypothesisPanel(true)}
                          </div>
                        </td>
                      </tr>
                    )}
                  {expenseHypothesisInlineActive &&
                    expenseHypothesisAnchorIdx === idx &&
                    expenseHypothesisAnchorIdx >= 0 &&
                    editingAdjustment && (
                      <tr
                        key={`expense-hypothesis-inline-${editingAdjustment.rowId}-${editingAdjustment.yearIndex}`}
                        className="bg-slate-50/95"
                      >
                        <td
                          colSpan={3 + getYearLabels().length * (showYearPctCa ? 2 : 1)}
                          className="min-w-0 border-b-2 border-blue-200/90 p-0 align-top"
                        >
                          <div className="min-w-0 max-w-full overflow-x-auto px-3 py-3 sm:px-5 sm:py-4">
                            {renderExpenseHypothesisPanel(true)}
                          </div>
                        </td>
                      </tr>
                    )}
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
                            className="[&>td]:bg-slate-50 [&>td:first-child]:bg-slate-50 hover:[&>td]:bg-slate-100/80"
                          >
                            <td className="px-6 py-2 text-slate-600 pl-20">
                              <span className="text-sm whitespace-nowrap">
                                {formatGlAccountDisplayLabel(account.accountNumber, account.accountName)}
                              </span>
                            </td>
                            
                            {view === "comparison" && !isComparisonMode && (
                              <>
                                <td className="px-6 py-2 text-right font-normal text-sm text-slate-700">
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
                          <td className="px-6 py-2 text-right font-normal text-sm text-slate-700">
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
                              <td className="px-6 py-2 text-right font-normal text-sm text-slate-700">
                                {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                              </td>
                            )}
                            
                            {view === "ytd" && !isComparisonMode && (
                              <>
                                <td className="px-6 py-2 text-right font-normal text-sm text-slate-700">
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
                                    <td className="px-6 py-2 text-right font-normal text-sm text-slate-700">
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
                                <td className="px-6 py-2 text-right font-normal text-sm text-slate-700">
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
                                    <td className="px-6 py-2 text-right font-normal text-sm text-slate-700">
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
                                    <td key={valueIdx} className="px-4 py-2 text-right font-normal text-sm text-slate-700">
                                      {columnMode === "percentage"
                                        ? (accountTrendValue !== 0 ? `${getTrendRevenuePercentage(accountTrendValue, valueIdx).toFixed(1)}%` : "-")
                                        : isTrendVariationMode
                                          ? renderTrendVariationText(account.trendValues ?? row.trendValues ?? [], valueIdx)
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
                                    <td key={valueIdx} className="px-4 py-2 text-right font-normal text-sm text-slate-700">
                                      {columnMode === "percentage"
                                        ? (accountTrendValue !== 0 ? `${getTrendRevenuePercentage(accountTrendValue, valueIdx).toFixed(1)}%` : "-")
                                        : isTrendVariationMode
                                          ? renderTrendVariationText(account.trendValues ?? row.trendValues ?? [], valueIdx)
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
                                {Array.from(
                                  {
                                    length: isForecastSection
                                      ? row.trendValues.length
                                      : getYearLabels().length,
                                  },
                                  (_, valueIdx) => {
                                  const rowTrendValue = row.trendValues[valueIdx] ?? 0
                                  // Get the actual row value (edited or default) for forecast sections
                                  const actualRowValue = isForecastSection && row.rowId 
                                    ? displayedHypothesisAmount(row.rowId, valueIdx, rowTrendValue, row.trendValues)
                                    : rowTrendValue
                                  
                                  const accountTrendValue =
                                    account.trendValues != null &&
                                    account.trendValues[valueIdx] !== undefined
                                      ? account.trendValues[valueIdx]!
                                      : account.proportion !== undefined
                                        ? Math.round(actualRowValue * account.proportion)
                                        : actualRowValue
                                  
                                  // Get previous value for growth calculation (1re année projetée → N-1 si YTD)
                                  const growthBaseDisplayIdx = forecastGrowthBaseDisplayIndex(
                                    valueIdx,
                                    forecastActualCols,
                                  )
                                  const previousRowValue =
                                    growthBaseDisplayIdx != null && row.trendValues
                                    ? (isForecastSection && row.rowId
                                        ? displayedHypothesisAmount(
                                            row.rowId,
                                            growthBaseDisplayIdx,
                                            row.trendValues[growthBaseDisplayIdx],
                                            row.trendValues,
                                          )
                                        : row.trendValues[growthBaseDisplayIdx])
                                    : null
                                  
                                  // Calculate growth rate if showGrowthRate is true and not first year
                                  let displayValue: string | number = accountTrendValue
                                  let growthRate: number | null = null
                                  if (showGrowthRate && isForecastSection && growthBaseDisplayIdx != null && previousRowValue !== null) {
                                    const previousAccountValue =
                                      account.trendValues != null &&
                                      account.trendValues[growthBaseDisplayIdx] !== undefined
                                        ? account.trendValues[growthBaseDisplayIdx]!
                                        : account.proportion !== undefined
                                          ? Math.round(previousRowValue * account.proportion)
                                          : previousRowValue
                                    if (previousAccountValue !== 0) {
                                      growthRate = calculateVariation(accountTrendValue, previousAccountValue)
                                      displayValue = growthRate !== null ? `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(1)}%` : "-"
                                    } else {
                                      displayValue = "-"
                                    }
                                  } else if (showGrowthRate && isForecastSection && isForecastHistoricalColumn(valueIdx)) {
                                    displayValue = "-" // No growth rate for first year
                                  }
                                  
                                  return (
                                    <Fragment key={valueIdx}>
                                    <td 
                                      className={cn(
                                        "min-w-[8rem] px-4 py-2 text-right text-sm font-semibold",
                                        isForecastHistoricalColumn(valueIdx) ? "bg-slate-50 text-slate-700" : "text-slate-700",
                                        yearGroupStartClass(valueIdx),
                                        showGrowthRate && isForecastSection && valueIdx > 0 && typeof displayValue === "string" && displayValue.includes("%") && title === "Estimation des revenus annuels" ? "text-slate-900" : "",
                                        showGrowthRate && isForecastSection && valueIdx > 0 && typeof displayValue === "string" && displayValue.includes("%") && growthRate !== null && growthRate >= 0 && title !== "Estimation des revenus annuels" ? "text-emerald-600 font-semibold" : "",
                                        showGrowthRate && isForecastSection && valueIdx > 0 && typeof displayValue === "string" && displayValue.includes("%") && growthRate !== null && growthRate < 0 && title !== "Estimation des revenus annuels" ? "text-red-600 font-semibold" : ""
                                      )}
                                    >
                                      {showGrowthRate && isForecastSection
                                        ? displayValue
                                        : !isForecastSection && columnMode === "percentage"
                                          ? (accountTrendValue !== 0 ? `${getTrendRevenuePercentage(accountTrendValue, valueIdx).toFixed(1)}%` : "-")
                                          : !isForecastSection && isTrendVariationMode
                                            ? renderTrendVariationText(account.trendValues ?? row.trendValues ?? [], valueIdx)
                                            : (accountTrendValue !== 0 ? formatCurrency(accountTrendValue) : "-")}
                                    </td>
                                    {showYearPctCa && (
                                      <td
                                        className={cn(
                                          "min-w-[4.5rem] px-2 py-2 text-right text-xs tabular-nums text-slate-500",
                                          isForecastHistoricalColumn(valueIdx) ? "bg-slate-50" : ""
                                        )}
                                      >
                                        {formatShareOfRevenuePct(
                                          accountTrendValue,
                                          getHypothesisCaForYearIndex(valueIdx),
                                        )}
                                      </td>
                                    )}
                                    </Fragment>
                                  )
                                })}
                              </>
                            )}
                            
                            {/* Empty cells for comparison mode views */}
                            {((view === "comparison" && isComparisonMode) || (view === "ytd" && isComparisonMode) || (view === "ddm" && isComparisonMode)) && (
                              <>
                                {Array.from({ length: isComparisonMode ? entitiesToCompare.length : 2 }).map((_, cellIdx) => (
                                  <td key={cellIdx} className="px-6 py-2 text-right font-normal text-sm text-slate-700">
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
          {tableUsesHorizontalSlider &&
            title !== "Estimation des dépenses annuelles" &&
            (() => {
              void detailTableHScrollNonce
              const el = detailTableHScrollRef.current
              const max = el ? Math.max(0, el.scrollWidth - el.clientWidth) : 0
              if (!el || max <= 0) return null
              return (
                <div
                  className={cn(
                    "relative z-30 flex items-center gap-3 border-t border-slate-200/90 bg-slate-50/95 px-3 py-2",
                    hypothesisDesktopAsideOpen && "lg:mr-[min(22rem,38vw)]"
                  )}
                >
                  <span className="shrink-0 text-xs font-medium text-slate-500">Défilement</span>
                  <input
                    type="range"
                    className="h-2 w-full min-w-0 cursor-pointer accent-emerald-600"
                    min={0}
                    max={max}
                    step={1}
                    value={el.scrollLeft}
                    aria-label="Défilement horizontal du tableau"
                    onChange={(e) => {
                      el.scrollLeft = Number(e.target.value)
                      setDetailTableHScrollNonce((n) => n + 1)
                    }}
                  />
                </div>
              )
            })()}
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
                      ? "Pourcentage appliqué aux revenus totaux projetés (Hypothèse revenus)."
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
                      Pourcentage des revenus totaux projetés dans Hypothèse revenus
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

      </div>
    </div>
  )
}

