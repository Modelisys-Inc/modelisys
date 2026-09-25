"use client"

import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import { ChevronRight, ChevronDown, StickyNote, CircleDot, Edit2, Trash2, HardHat } from "lucide-react"
import { generateId } from "@/lib/seeded-random"
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from "react"
import { listForecastConfigs, upsertForecastConfig, getStatementStructure } from "@/lib/api"
import { NoteModal } from "@/components/note-modal"
import { getNoteByRowId, useNotesCache } from "@/lib/notes-storage"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { getRowAmounts, aggregateToYears } from "@/lib/series-utils"
import {
  listStructureRowsForCapexDetailDisplay,
  syncDetailSubLinesFromStandard,
} from "@/lib/income-statement-structure-utils"
import { useStandardLinkCodesFlat } from "@/hooks/use-standard-link-codes"
import {
  insertAnnexDetailPlaceholderRows,
  mapStructureRowsToBalanceSheetDetailRows,
  type BalanceSheetDetailRow,
} from "@/lib/balance-sheet-detail-rows"
import { structureRowHasLiaisonCode } from "@/components/balance-sheet-line-analysis"
import {
  dashboardCardBodyMutedClass,
  dashboardCardAccentClass,
  dashboardCardFrameStaticClass,
  dashboardCardHeaderBarClass,
  dashboardCardHeaderIconBoxClass,
  dashboardCardRingClass,
  dashboardCardTitleClass,
} from "@/lib/dashboard-card-style"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { CapexFinancingEditor } from "@/components/capex-financing-editor"
import { ForecastHypothesisSummaryChart } from "@/components/forecast-hypothesis-summary-chart"
import {
  attachCapexAssetMonthlyTracking,
  computeHypothesisSummaryMoneyPoints,
  type HypothesisYearSummaryInput,
} from "@/lib/forecast-hypothesis-summary-utils"
import {
  createDefaultAdvancedBuckets as createDefaultForecastCollectionBuckets,
} from "@/lib/forecast-collection-cash-utils"
import {
  createDefaultForecastSeasonalityMonthPercents,
  normalizeForecastSeasonalityMonthPercents,
  parseSeasonalityMonthPercentsFromStorage,
} from "@/lib/forecast-seasonality-utils"
import { useProjectedRevenueYearTotals } from "@/hooks/use-projected-revenue-year-totals"
import { parseFiscalYearEndMonth } from "@/lib/capex-year-reference"
import {
  type ForecastActualLayout,
  forecastActualColumnCount,
  forecastBalanceSheetActualPrefixValues,
  forecastConfigToDisplayYearIndex,
  forecastDisplayToConfigYearIndex,
  forecastDisplayYearCount,
  forecastProjectionOpeningFromActuals,
  forecastTrendFromActualPrefix,
  forecastYearLabelsForLayout,
  isForecastProjectedDisplayColumn,
  mergeConfigYearsOntoForecastDisplay,
  resolveForecastActualLayout,
} from "@/lib/pro-forma-forecast-columns"
import {
  capexFinancingSaveOk,
  computeCashDisbursementAmount,
  createDefaultCapexFinancing,
  normalizeCapexFinancing,
  parseCapexFinancingFromStorage,
  resolveCapexAssetLinkCodeForDebt,
  syncCapexFinancingToDebtForecast,
  adjustmentYearIndexToCalendarYear,
  type CapexFinancingConfig,
} from "@/lib/capex-financing-utils"
import {
  buildCapexAssetYearStates,
  capexAmortIsLinkCodeOptionsForAsset,
  capexLeafChildrenOfParent,
  CAPEX_AMORT_IS_LINK_CODE_LABELS,
  isCapexHypothesisGrowthAdjustment,
  resolveCapexAdditionsForYear,
  resolveCapexDepreciationMethod,
  resolveCapexDepreciationRate,
  rollupCapexParentTrendsFromLeafRows,
  type CapexAssetYearState,
  type CapexDepreciationMethod,
} from "@/lib/capex-forecast-resolve"

export const CAPEX_HYPOTHESIS_RATE_YEAR_INDEX = -1

/** Mode d’affichage des montants annuels (Hypothèses Capex). */
export type CapexAmountViewMode = "bookValue" | "adjustments" | "depreciation"

type CapexAdjustmentType = "amount" | "growthPercent" | "growthAmount" | "percentRevenue"

interface CapexForecastDetailProps {
  period?: "monthly" | "quarterly" | "annual"
  view?: "current" | "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years"
  columnMode?: "variations" | "percentage" | "comparison"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  title?: string
  /** Rapport VCA : sans carte / en-tête (titre porté par la section). */
  embedInReport?: boolean
  hideHeaderIcon?: boolean
  projectionYears?: 3 | 4 | 5
  projectionMode?: "gl" | "account"
  projectionId?: string | null
  fiscalYear?: number
  forecastBaseYear?: number
  refMonth?: number
  forecastUseSeriesActuals?: boolean
  forecastActualLayout?: ForecastActualLayout
}

interface DetailRow extends BalanceSheetDetailRow {}

export function CapexForecastDetail({
  period = "monthly",
  view = "current",
  columnMode = "variations",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  title = "Estimation des Capex annuels",
  embedInReport = false,
  hideHeaderIcon = false,
  projectionYears = 5,
  projectionMode = "gl",
  projectionId,
  fiscalYear,
  forecastBaseYear,
  refMonth,
  forecastUseSeriesActuals = false,
  forecastActualLayout = "nMinusOne-and-ytd",
}: CapexForecastDetailProps) {
  useNotesCache(companyId ?? null)
  const [balanceSheetStructure, setBalanceSheetStructure] = useState<Record<string, unknown>[] | null>(null)
  const [structureLoading, setStructureLoading] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [selectedRowLabel, setSelectedRowLabel] = useState<string>("")
  const [selectedRowFinancialData, setSelectedRowFinancialData] = useState<{
    currentAmount?: number | null
    priorAmount?: number | null
    variationPercent?: number | null
    variationAmount?: number | null
  }>({})
  const [notesUpdated, setNotesUpdated] = useState(0)
  const [showGrowthRate, setShowGrowthRate] = useState(false)
  const [capexAmountViewMode, setCapexAmountViewMode] = useState<CapexAmountViewMode>("bookValue")
  
  // State for editable capex values: key = "rowId-yearIndex" (kept for backward compatibility but not used for direct editing)
  const [capexValues, setCapexValues] = useState<Record<string, number>>({})
  
  // Interface for capex adjustments
  interface CapexAdjustment {
    id: string
    rowId: string
    yearIndex: number
    type: CapexAdjustmentType
    value: number
    note: string
    linkCode?: string
    seasonalityMonthPercents?: number[]
    /** @deprecated Ancien décaissement à délais ; le financement vit dans `capexFinancing`. */
    disbursementCash?: unknown
    capexFinancing?: CapexFinancingConfig
    hypothesisMetaOnly?: boolean
  }

  const [capexAdjustments, setCapexAdjustments] = useState<Record<string, CapexAdjustment[]>>({})
  const [capexHypothesisPanelOpen, setCapexHypothesisPanelOpen] = useState(false)
  const [capexHypothesisMode, setCapexHypothesisMode] = useState<"rate" | "adjustment">("adjustment")
  const [editingAdjustment, setEditingAdjustment] = useState<{ rowId: string; yearIndex: number } | null>(null)
  const [adjustmentType, setAdjustmentType] = useState<CapexAdjustmentType>("amount")
  const [adjustmentValue, setAdjustmentValue] = useState<number>(0)
  const [adjustmentNote, setAdjustmentNote] = useState<string>("")
  const [editingAdjustmentId, setEditingAdjustmentId] = useState<string | null>(null)

  const [depreciationRates, setDepreciationRates] = useState<Record<string, number>>({})
  const [depreciationMethods, setDepreciationMethods] = useState<Record<string, CapexDepreciationMethod>>({})
  const [amortizationLinkCodes, setAmortizationLinkCodes] = useState<Record<string, string>>({})
  const [draftDepreciationMethod, setDraftDepreciationMethod] = useState<CapexDepreciationMethod>("linear")
  const [draftDepreciationRate, setDraftDepreciationRate] = useState<number>(0)
  const [capexHypothesisEditorTab, setCapexHypothesisEditorTab] = useState<
    "sommaire" | "taux" | "ajustement"
  >("ajustement")
  const [replicateCapexAdjustmentToFollowingYears, setReplicateCapexAdjustmentToFollowingYears] =
    useState(false)
  const [capexDisbursementSeasonalityMonthPercents, setCapexDisbursementSeasonalityMonthPercents] =
    useState<number[]>(() => createDefaultForecastSeasonalityMonthPercents())
  const [capexFinancingDraft, setCapexFinancingDraft] = useState<CapexFinancingConfig>(() =>
    createDefaultCapexFinancing("", 0, forecastBaseYear ?? new Date().getFullYear() + 1),
  )
  const [capexFinancingSaving, setCapexFinancingSaving] = useState(false)
  const [capexSummarySeriesVisible, setCapexSummarySeriesVisible] = useState({
    primary: true,
    cashFlow: true,
    cost: true,
    bookValue: true,
    depreciation: true,
  })
  const pendingCapexAdjustmentIdRef = useRef<string | null>(null)
  const capexHypothesisDraftLoadKeyRef = useRef<string | null>(null)
  /** Charge taux/méthode une fois par poste à l’ouverture (pas seulement onglet Taux). */
  const capexDepDraftRowKeyRef = useRef<string | null>(null)

  const isForecastSection = title === "Estimation des Capex annuels"

  const effectiveFiscalYear = fiscalYear ?? new Date().getFullYear()
  const effectiveForecastBaseYear = forecastBaseYear ?? effectiveFiscalYear + 1
  const effectiveRefMonth = refMonth ?? new Date().getMonth() + 1
  const fiscalYearEndMonth = parseFiscalYearEndMonth(
    companies.find((c) => c.id === companyId)?.fiscalYearEnd ?? "12-31",
  )
  const forecastActualLayoutEffective = resolveForecastActualLayout(
    forecastActualLayout,
    effectiveRefMonth,
    fiscalYearEndMonth,
  )
  const forecastActualCols = forecastActualColumnCount(forecastActualLayoutEffective)
  const forecastYearCount = forecastDisplayYearCount(projectionYears, forecastActualLayoutEffective)
  const forecastConfigYearCount = projectionYears + 1
  const isForecastHistoricalColumn = (idx: number) => isForecastSection && idx < forecastActualCols
  const isForecastProjectedColumn = (idx: number) =>
    isForecastSection && isForecastProjectedDisplayColumn(idx, forecastActualCols)

  useEffect(() => {
    if (!companyId || !isForecastSection) {
      setBalanceSheetStructure(null)
      setStructureLoading(false)
      return
    }
    let cancelled = false
    setStructureLoading(true)
    getStatementStructure(companyId, "balance-sheet")
      .then((res) => {
        if (!cancelled) {
          setBalanceSheetStructure(Array.isArray(res.structure) ? res.structure : [])
          setStructureLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBalanceSheetStructure([])
          setStructureLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [companyId, isForecastSection])

  const { codes: standardLinkCodes, loading: standardLinkCodesLoading } = useStandardLinkCodesFlat(
    false,
    undefined,
    !!companyId && isForecastSection,
  )

  /** Structure alignée sur Bilan Détail : sous-lignes standard (ALT-B.1, etc.) injectées depuis le plan. */
  const displayStructure = useMemo((): Record<string, unknown>[] | null => {
    if (balanceSheetStructure === null) return null
    if (standardLinkCodes.length === 0) return balanceSheetStructure
    return syncDetailSubLinesFromStandard(balanceSheetStructure, standardLinkCodes)
  }, [balanceSheetStructure, standardLinkCodes])

  const { totals: projectedRevenueYearTotals } = useProjectedRevenueYearTotals({
    companyId,
    projectionId,
    projectionYears,
    fiscalYear: effectiveFiscalYear,
    divisionId,
    subDivisionId,
    enabled: isForecastSection && !!companyId,
    forecastActualLayout: forecastActualLayoutEffective,
    refMonth: effectiveRefMonth,
    fiscalYearEndMonth,
  })

  const { rows: bsRows, periods: bsPeriods, loading: bsLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "balance-sheet",
    fiscalYear: effectiveFiscalYear,
    month: effectiveRefMonth,
    months: 72,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: !!companyId,
  })

  /** Série Coût seul (mapping alt_asset_cost) pour le rollforward VNC. */
  const { rows: bsCostRows, periods: bsCostPeriods } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "balance-sheet",
    fiscalYear: effectiveFiscalYear,
    month: effectiveRefMonth,
    months: 72,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: !!companyId && isForecastSection,
    altAssetCostOnly: true,
  })

  // Build Capex rows from balance-sheet structure (same presentation as Bilan Détail)
  const baseData = useMemo((): DetailRow[] | null => {
    if (isForecastSection && displayStructure === null) return null

    const structure = displayStructure ?? []
    const detailStructureRows = listStructureRowsForCapexDetailDisplay(structure)
    if (detailStructureRows.length === 0) return []

    return mapStructureRowsToBalanceSheetDetailRows(detailStructureRows, bsRows, bsPeriods, {
      emptyTrendLength: forecastYearCount,
      plainAnnexTitles: true,
      structureRowHasLiaisonCode,
      buildBalanceAccounts: (sr, periods) => {
        if (!sr.detailRows?.length || periods.length === 0) return undefined
        return sr.detailRows.map((dr) => {
          const drAmounts = periods.map((p) => dr.amounts?.[`${p.fiscalYear}-${p.fiscalMonth}`] || 0)
          const drYearly = aggregateToYears(drAmounts, periods, "last")
          return {
            accountNumber: dr.id,
            accountName: dr.label,
            amount: drYearly.amounts.length > 0 ? drYearly.amounts[drYearly.amounts.length - 1] : 0,
            priorAmount: drYearly.amounts.length > 1 ? drYearly.amounts[drYearly.amounts.length - 2] : 0,
          }
        })
      },
    })
  }, [bsRows, bsPeriods, displayStructure, isForecastSection, projectionYears, forecastYearCount])

  // Debounced save to API
  const saveConfigRef = useRef<NodeJS.Timeout>()

  const saveConfig = useCallback((data: Record<string, unknown>) => {
    if (!companyId || !isForecastSection) return
    clearTimeout(saveConfigRef.current)
    saveConfigRef.current = setTimeout(async () => {
      try {
        await upsertForecastConfig(companyId, {
          config_type: "capex-forecast",
          data,
          projection_id: projectionId ?? undefined,
        })
      } catch (err) {
        console.error("Error saving capex forecast config:", err)
      }
    }, 500)
  }, [companyId, isForecastSection, projectionId])

  // Load capex forecast config from API on mount
  useEffect(() => {
    if (!companyId || !isForecastSection) return

    const loadConfig = async () => {
      try {
        const configs = await listForecastConfigs(companyId, { config_type: "capex-forecast", projection_id: projectionId ?? undefined })
        if (configs.length > 0) {
          const data = configs[0].data as Record<string, unknown>
          if (data.capexValues) setCapexValues(data.capexValues as typeof capexValues)
          if (data.depreciationRates) setDepreciationRates(data.depreciationRates as typeof depreciationRates)
          if (data.depreciationMethods) {
            setDepreciationMethods(data.depreciationMethods as typeof depreciationMethods)
          }
          if (data.amortizationLinkCodes) {
            setAmortizationLinkCodes(data.amortizationLinkCodes as typeof amortizationLinkCodes)
          }
          if (data.capexAdjustments) setCapexAdjustments(data.capexAdjustments as typeof capexAdjustments)
        }
      } catch (err) {
        console.error("Error loading capex forecast config:", err)
      }
    }
    loadConfig()
  }, [companyId, isForecastSection, projectionId])

  /** Enrichit les hyp. existantes avec linkCode (rollup Estimation du Bilan). */
  useEffect(() => {
    if (!isForecastSection || !baseData?.length) return
    setCapexAdjustments((prev) => {
      let changed = false
      const next: typeof prev = {}
      for (const [key, list] of Object.entries(prev)) {
        next[key] = list.map((adj) => {
          if (adj.linkCode?.trim()) return adj
          const linkCode = resolveCapexAssetLinkCodeForDebt(adj.rowId, {
            rowLinkCode: baseData.find((r) => r.rowId === adj.rowId)?.linkCode,
            structureRows: displayStructure,
          })
          if (!linkCode) return adj
          changed = true
          return { ...adj, linkCode }
        })
      }
      return changed ? next : prev
    })
  }, [baseData, displayStructure, isForecastSection])

  /** Ré-attache les prêts Capex financés à PLT-C/D (anciens sans sourceLinkCode). */
  const debtCapexRepairKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (!isForecastSection || !companyId || !projectionId || !baseData?.length) return
    const financedEntries: Array<{
      capexKey: string
      financing: CapexFinancingConfig
      assetLinkCode: string
    }> = []
    for (const list of Object.values(capexAdjustments)) {
      for (const adj of list) {
        const financing = parseCapexFinancingFromStorage(adj.capexFinancing)
        if (!financing || financing.mode === "cash") continue
        const assetLinkCode = resolveCapexAssetLinkCodeForDebt(adj.rowId, {
          rowLinkCode: adj.linkCode ?? baseData.find((r) => r.rowId === adj.rowId)?.linkCode,
          structureRows: displayStructure,
        })
        if (!assetLinkCode) continue
        financedEntries.push({
          capexKey: `${adj.rowId}-${adj.yearIndex}:${adj.id}`,
          financing,
          assetLinkCode,
        })
      }
    }
    if (financedEntries.length === 0) return
    const repairKey = `${projectionId}:${financedEntries
      .map((e) => `${e.capexKey}:${e.assetLinkCode}`)
      .sort()
      .join("|")}`
    if (debtCapexRepairKeyRef.current === repairKey) return

    let cancelled = false
    ;(async () => {
      const updates: Record<string, CapexFinancingConfig> = {}
      for (const entry of financedEntries) {
        if (cancelled) return
        try {
          const synced = await syncCapexFinancingToDebtForecast({
            companyId,
            projectionId,
            capexKey: entry.capexKey,
            financing: entry.financing,
            forecastBaseYear: effectiveForecastBaseYear,
            assetLinkCode: entry.assetLinkCode,
          })
          updates[entry.capexKey] = synced
        } catch (err) {
          console.error("Error repairing capex financing → debt:", err)
        }
      }
      if (cancelled) return
      debtCapexRepairKeyRef.current = repairKey
      if (Object.keys(updates).length === 0) return
      setCapexAdjustments((prev) => {
        let changed = false
        const next: typeof prev = {}
        for (const [key, list] of Object.entries(prev)) {
          next[key] = list.map((adj) => {
            const capexKey = `${adj.rowId}-${adj.yearIndex}:${adj.id}`
            const synced = updates[capexKey]
            if (!synced) return adj
            if (
              adj.capexFinancing &&
              typeof adj.capexFinancing === "object" &&
              (adj.capexFinancing as CapexFinancingConfig).linkedLoanId === synced.linkedLoanId &&
              adj.linkCode
            ) {
              return adj
            }
            changed = true
            return {
              ...adj,
              linkCode:
                resolveCapexAssetLinkCodeForDebt(adj.rowId, {
                  rowLinkCode: adj.linkCode,
                  structureRows: displayStructure,
                }) ?? adj.linkCode,
              capexFinancing: synced,
            }
          })
        }
        return changed ? next : prev
      })
    })()
    return () => {
      cancelled = true
    }
  }, [
    baseData,
    capexAdjustments,
    companyId,
    displayStructure,
    effectiveForecastBaseYear,
    isForecastSection,
    projectionId,
  ])

  useEffect(() => {
    if (!isForecastSection) return
    if (
      Object.keys(capexValues).length === 0 &&
      Object.keys(depreciationRates).length === 0 &&
      Object.keys(depreciationMethods).length === 0 &&
      Object.keys(amortizationLinkCodes).length === 0 &&
      Object.keys(capexAdjustments).length === 0
    ) {
      return
    }
    saveConfig({
      capexValues,
      depreciationRates,
      depreciationMethods,
      amortizationLinkCodes,
      capexAdjustments,
    })
  }, [
    capexValues,
    depreciationRates,
    depreciationMethods,
    amortizationLinkCodes,
    capexAdjustments,
    saveConfig,
    isForecastSection,
  ])

  useEffect(() => {
    setCapexHypothesisPanelOpen(false)
    setEditingAdjustment(null)
    setExpandedRows(new Set())
  }, [companyId, divisionId, subDivisionId])

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

  // Get adjustments for a specific row and year
  const getAdjustments = (rowId: string, yearIndex: number): CapexAdjustment[] => {
    const key = `${rowId}-${yearIndex}`
    return capexAdjustments[key] || []
  }

  const isCapexHypothesisMetaOnly = (adj: CapexAdjustment): boolean => {
    if (adj.hypothesisMetaOnly) return true
    if (
      (adj.seasonalityMonthPercents != null ||
        adj.disbursementCash != null ||
        adj.capexFinancing != null) &&
      adj.value === 0 &&
      !adj.note?.trim()
    ) {
      return true
    }
    return false
  }

  const loadCapexFinancingDraftForAdjustment = (
    adj: CapexAdjustment | null | undefined,
    rowId: string,
    yearIndex: number,
    rowLabel = "",
    draftAmount = 0,
  ) => {
    const parsedFinancing = adj?.capexFinancing
      ? parseCapexFinancingFromStorage(adj.capexFinancing) ??
        (adj.capexFinancing as CapexFinancingConfig)
      : null
    const calendarYear = adjustmentYearIndexToCalendarYear(yearIndex, effectiveForecastBaseYear)
    const base =
      parsedFinancing ?? createDefaultCapexFinancing(rowLabel, 0, effectiveForecastBaseYear, yearIndex)
    const amount =
      draftAmount > 0
        ? draftAmount
        : adj && isCapexHypothesisGrowthAdjustment(adj)
          ? Math.max(0, Number(adj.value) || 0)
          : 0
    setCapexFinancingDraft({
      ...base,
      projectName: parsedFinancing?.projectName?.trim() ? parsedFinancing.projectName : rowLabel,
      totalAmount: amount > 0 ? amount : base.totalAmount,
      serviceDate: { year: calendarYear, month: base.serviceDate.month },
      debt: base.debt
        ? {
            ...base.debt,
            firstPaymentDate: {
              year: calendarYear,
              month: base.debt.firstPaymentDate.month,
            },
          }
        : undefined,
    })
    setCapexDisbursementSeasonalityMonthPercents(
      adj?.seasonalityMonthPercents != null
        ? parseSeasonalityMonthPercentsFromStorage(adj)
        : createDefaultForecastSeasonalityMonthPercents(),
    )
  }

  const getAdjustmentById = (id: string): CapexAdjustment | null => {
    for (const adjustments of Object.values(capexAdjustments)) {
      const adjustment = adjustments.find(a => a.id === id)
      if (adjustment) return adjustment
    }
    return null
  }

  const getDepreciationRate = (rowId: string | undefined, label: string): number => {
    if (!rowId) return 0
    return resolveCapexDepreciationRate(rowId, label, depreciationRates)
  }

  const getDepreciationMethod = (rowId: string | undefined): CapexDepreciationMethod => {
    if (!rowId) return "linear"
    return resolveCapexDepreciationMethod(rowId, depreciationMethods)
  }

  const getAmortizationLinkCode = (rowId: string | undefined): string => {
    if (!rowId) return ""
    return String(amortizationLinkCodes[rowId] ?? "").trim()
  }

  const setAmortizationLinkCodeForRow = (
    rowId: string,
    code: string,
    assetLinkCode?: string | null,
  ) => {
    setAmortizationLinkCodes((prev) => {
      const next = { ...prev }
      const trimmed = code.trim()
      const alias = String(assetLinkCode ?? "").trim()
      if (!trimmed) {
        delete next[rowId]
        if (alias && alias !== rowId) delete next[alias]
      } else {
        next[rowId] = trimmed
        // Clé stable par code de liaison (résolution Pro Forma même si rowId = UUID série).
        if (alias && alias !== rowId) next[alias] = trimmed
      }
      return next
    })
  }

  const renderAmortizationLinkCodeCell = (
    rowId: string | undefined,
    assetLinkCode: string | null | undefined,
  ) => {
    if (!rowId) return null
    const options = capexAmortIsLinkCodeOptionsForAsset(assetLinkCode)
    const value = getAmortizationLinkCode(rowId) || getAmortizationLinkCode(assetLinkCode ?? undefined)
    return (
      <Select
        value={value || "__none__"}
        onValueChange={(v) =>
          setAmortizationLinkCodeForRow(rowId, v === "__none__" ? "" : v, assetLinkCode)
        }
      >
        <SelectTrigger
          data-testid={`capex-amort-code-${rowId}`}
          className="h-8 w-full min-w-[5.5rem] border-slate-200 bg-white text-xs font-medium text-slate-800"
          onClick={(e) => e.stopPropagation()}
        >
          <SelectValue placeholder="—">{value || null}</SelectValue>
        </SelectTrigger>
        <SelectContent onClick={(e) => e.stopPropagation()}>
          <SelectItem value="__none__" className="text-xs text-slate-500">
            —
          </SelectItem>
          {options.map((code) => (
            <SelectItem key={code} value={code} className="text-xs">
              <span className="font-medium">{code}</span>
              <span className="ml-1.5 text-slate-500">
                {CAPEX_AMORT_IS_LINK_CODE_LABELS[code] ?? ""}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  const renderDepreciationRateCell = (rowId: string | undefined, label: string) => {
    if (!rowId) return null
    const rate = getDepreciationRate(rowId, label)
    const method = getDepreciationMethod(rowId)
    const methodLabel = method === "declining" ? "Dégressif" : "Linéaire"
    return (
      <span
        className={cn(
          "font-medium",
          method === "declining" ? "text-blue-600" : "text-purple-600",
        )}
      >
        {methodLabel} {rate.toFixed(1)}%
      </span>
    )
  }

  const closeCapexHypothesisPanel = () => {
    setCapexHypothesisPanelOpen(false)
    setEditingAdjustment(null)
    setEditingAdjustmentId(null)
    setAdjustmentType("amount")
    setAdjustmentValue(0)
    setAdjustmentNote("")
    setCapexHypothesisEditorTab("ajustement")
    setReplicateCapexAdjustmentToFollowingYears(false)
    setCapexDisbursementSeasonalityMonthPercents(createDefaultForecastSeasonalityMonthPercents())
    setCapexFinancingDraft(createDefaultCapexFinancing("", 0, effectiveForecastBaseYear))
    pendingCapexAdjustmentIdRef.current = null
    capexHypothesisDraftLoadKeyRef.current = null
    capexDepDraftRowKeyRef.current = null
  }

  const resetCapexAdjustmentDraftForm = (rowId: string, yearIndex: number, rowLabel = "") => {
    setEditingAdjustmentId(null)
    setAdjustmentType("amount")
    setAdjustmentValue(0)
    setAdjustmentNote("")
    loadCapexFinancingDraftForAdjustment(null, rowId, yearIndex, rowLabel, 0)
  }

  const loadCapexAdjustmentDraft = (rowId: string, yearIndex: number, adjustmentId?: string) => {
    const rowLabel = baseData?.find((r) => r.rowId === rowId)?.label ?? ""
    if (adjustmentId) {
      const existingAdjustment = getAdjustmentById(adjustmentId)
      if (existingAdjustment) {
        setEditingAdjustmentId(adjustmentId)
        setAdjustmentType(existingAdjustment.type)
        setAdjustmentValue(existingAdjustment.value)
        setAdjustmentNote(existingAdjustment.note || "")
        loadCapexFinancingDraftForAdjustment(
          existingAdjustment,
          rowId,
          yearIndex,
          rowLabel,
          existingAdjustment.value,
        )
        return
      }
    }

    setEditingAdjustmentId(null)
    setAdjustmentType("amount")
    setAdjustmentValue(0)
    setAdjustmentNote("")
    loadCapexFinancingDraftForAdjustment(null, rowId, yearIndex, rowLabel, 0)
  }

  const ensureCapexProjectedYearIndex = (yearIndex: number): number =>
    yearIndex >= 0 ? yearIndex : 1

  const openCapexHypothesisPanel = (
    rowId: string,
    yearIndex: number,
    mode: "rate" | "adjustment",
    _rowLabel = "",
    adjustmentId?: string,
  ) => {
    capexHypothesisDraftLoadKeyRef.current = null
    pendingCapexAdjustmentIdRef.current = adjustmentId ?? null
    setCapexHypothesisMode(mode)
    setCapexHypothesisEditorTab(mode === "rate" ? "taux" : "ajustement")
    setReplicateCapexAdjustmentToFollowingYears(false)
    const resolvedYearIndex =
      mode === "adjustment" ? ensureCapexProjectedYearIndex(yearIndex) : yearIndex
    setEditingAdjustment({ rowId, yearIndex: resolvedYearIndex })
    setCapexHypothesisPanelOpen(true)
  }

  const handleCapexHypothesisTabChange = (value: string) => {
    const tab = value === "sommaire" ? "sommaire" : value === "taux" ? "taux" : "ajustement"
    setCapexHypothesisEditorTab(tab)
    if (!editingAdjustment) return

    if (tab === "taux") {
      setCapexHypothesisMode("rate")
      return
    }

    const resolvedYearIndex = ensureCapexProjectedYearIndex(editingAdjustment.yearIndex)
    if (resolvedYearIndex !== editingAdjustment.yearIndex) {
      setEditingAdjustment({ rowId: editingAdjustment.rowId, yearIndex: resolvedYearIndex })
    }
    setCapexHypothesisMode("adjustment")
  }

  useEffect(() => {
    if (!capexHypothesisPanelOpen || !editingAdjustment) return

    const rowId = editingAdjustment.rowId
    const yearIndex = ensureCapexProjectedYearIndex(editingAdjustment.yearIndex)
    const rowLabelForLoad = baseData?.find((r) => r.rowId === rowId)?.label || ""

    // Taux / méthode : toujours hydrater le brouillon à l’ouverture du poste
    // (sinon Sommaire utilise draftDepreciationRate=0 → amortissement 0 $).
    const depKey = `dep:${rowId}`
    if (capexDepDraftRowKeyRef.current !== depKey) {
      capexDepDraftRowKeyRef.current = depKey
      setDraftDepreciationMethod(getDepreciationMethod(rowId))
      setDraftDepreciationRate(getDepreciationRate(rowId, rowLabelForLoad))
    }

    if (capexHypothesisMode === "rate" || capexHypothesisEditorTab === "taux") {
      const loadKey = `taux:${rowId}`
      if (capexHypothesisDraftLoadKeyRef.current === loadKey) return
      capexHypothesisDraftLoadKeyRef.current = loadKey
      setEditingAdjustmentId(null)
      return
    }

    const pendingAdjId = pendingCapexAdjustmentIdRef.current
    const loadKey = `${capexHypothesisEditorTab}:${rowId}:${yearIndex}:${pendingAdjId ?? editingAdjustmentId ?? "new"}:${rowLabelForLoad}`
    if (capexHypothesisDraftLoadKeyRef.current === loadKey) return
    capexHypothesisDraftLoadKeyRef.current = loadKey

    pendingCapexAdjustmentIdRef.current = null

    if (capexHypothesisEditorTab === "ajustement") {
      loadCapexAdjustmentDraft(rowId, yearIndex, pendingAdjId ?? undefined)
    }
  }, [
    baseData,
    capexAdjustments,
    capexHypothesisEditorTab,
    capexHypothesisMode,
    capexHypothesisPanelOpen,
    editingAdjustment,
  ])

  const saveDepreciationHypothesis = () => {
    if (!editingAdjustment?.rowId) return
    const rowId = editingAdjustment.rowId
    const linkCode = baseData?.find((r) => r.rowId === rowId)?.linkCode?.trim()
    const nextRates = { ...depreciationRates, [rowId]: draftDepreciationRate }
    const nextMethods = { ...depreciationMethods, [rowId]: draftDepreciationMethod }
    if (linkCode && linkCode !== rowId) {
      nextRates[linkCode] = draftDepreciationRate
      nextMethods[linkCode] = draftDepreciationMethod
    }
    setDepreciationRates(nextRates)
    setDepreciationMethods(nextMethods)
    closeCapexHypothesisPanel()
  }

  const resolveSingleCapexAdjustmentAmount = (
    adjustment: CapexAdjustment,
    yearIndex: number,
    defaultValue: number,
    baseValue: number,
    builtTrend?: number[],
    rowId?: string,
  ): number => {
    if (adjustment.type === "amount") {
      return Math.round(adjustment.value)
    }
    if (adjustment.type === "percentRevenue") {
      const revenueTotal = projectedRevenueYearTotals?.[yearIndex] ?? 0
      return Math.round(revenueTotal * (adjustment.value / 100))
    }
    const prevDefault =
      yearIndex > 0 ? (builtTrend?.[yearIndex - 1] ?? (yearIndex === 1 ? baseValue : 0)) : defaultValue
    const previousValue =
      yearIndex > 0 && rowId
        ? resolveCapexAdditionsForYear(
            rowId,
            yearIndex - 1,
            prevDefault,
            baseValue,
            capexAdjustments as Parameters<typeof resolveCapexAdditionsForYear>[4],
            projectedRevenueYearTotals,
            builtTrend,
          )
        : defaultValue
    if (adjustment.type === "growthPercent") {
      return Math.round(previousValue * (1 + adjustment.value / 100))
    }
    if (adjustment.type === "growthAmount") {
      return Math.round(previousValue + adjustment.value)
    }
    return 0
  }

  const getOpeningCostForRow = (rowId: string, openingBook: number): number => {
    const costSeriesRow = bsCostRows.find((r) => r.id === rowId)
    if (!costSeriesRow) return openingBook
    const periods = bsCostPeriods.length > 0 ? bsCostPeriods : bsPeriods
    if (periods.length === 0) return openingBook
    const prefix = forecastBalanceSheetActualPrefixValues(
      forecastActualLayoutEffective,
      costSeriesRow,
      periods,
      effectiveRefMonth,
      effectiveFiscalYear,
      fiscalYearEndMonth,
    )
    return forecastProjectionOpeningFromActuals(prefix, openingBook)
  }

  const buildRowAssetStates = (
    rowId: string,
    label: string,
    openingBook: number,
    additionsOverrides?: Record<number, number>,
  ): CapexAssetYearState[] => {
    return buildCapexAssetYearStates({
      rowId,
      configYearCount: forecastConfigYearCount,
      openingCost: getOpeningCostForRow(rowId, openingBook),
      openingBookValue: openingBook,
      // Local CapexAdjustment is a superset of the resolve type.
      adjustments: capexAdjustments as Parameters<typeof buildCapexAssetYearStates>[0]["adjustments"],
      ratePercent: getDepreciationRate(rowId, label),
      method: getDepreciationMethod(rowId),
      projectedRevenueYearTotals,
      additionsOverrides,
    })
  }

  /** Ajouts Capex (hausse du Coût) — financement / sommaire décaissements. */
  const getCapexAdditionsValue = (
    rowId: string | undefined,
    yearIndex: number,
    baseValue = 0,
    builtTrend?: number[],
  ): number => {
    if (!rowId || !isForecastSection) return 0
    return resolveCapexAdditionsForYear(
      rowId,
      yearIndex,
      0,
      baseValue,
      capexAdjustments as Parameters<typeof resolveCapexAdditionsForYear>[4],
      projectedRevenueYearTotals,
      builtTrend,
    )
  }

  /** Valeur comptable projetée (Coût − Amort. cumulé). */
  const getCapexBookValue = (
    rowId: string | undefined,
    yearIndex: number,
    openingBook: number,
    label = "",
    additionsOverrides?: Record<number, number>,
  ): number => {
    if (!rowId || !isForecastSection) return openingBook
    const states = buildRowAssetStates(rowId, label, openingBook, additionsOverrides)
    return states[yearIndex]?.bookValue ?? openingBook
  }

  /** Dotation de l’exercice (amortissement de période). */
  const getCapexDepreciationExpense = (
    rowId: string | undefined,
    yearIndex: number,
    openingBook: number,
    label = "",
  ): number => {
    if (!rowId || !isForecastSection) return 0
    const states = buildRowAssetStates(rowId, label, openingBook)
    return states[yearIndex]?.depreciationExpense ?? 0
  }

  const displayedCapexAmount = (
    rowId: string | undefined,
    displayIndex: number,
    defaultValue: number,
    trend?: number[],
    label = "",
  ): number => {
    if (!rowId || !isForecastSection) return defaultValue
    const cfg = forecastDisplayToConfigYearIndex(displayIndex, forecastActualCols)
    // N-1 (null) et YTD / réel (cfg 0) : montants série, pas le moteur Capex.
    if (cfg == null || cfg <= 0) return defaultValue
    // Ouverture moteur = N-1 (display[0]), pas le YTD (config[0] après slice).
    const openingBook = forecastProjectionOpeningFromActuals(trend, defaultValue)
    return getCapexBookValue(rowId, cfg, openingBook, label)
  }

  /**
   * Montant cellule selon le mode (ajouts / dotation), y compris total parent / sous-total annexe.
   * `null` → afficher « - ».
   */
  const resolveCapexModeCellAmount = (
    row: DetailRow,
    allRows: DetailRow[],
    displayIndex: number,
    mode: CapexAmountViewMode,
  ): number | null => {
    if (mode === "bookValue") return null
    if (!isForecastProjectedColumn(displayIndex)) return null
    const cfg = forecastDisplayToConfigYearIndex(displayIndex, forecastActualCols)
    if (cfg == null) return null

    let targets: DetailRow[]
    if (row.isAnnexSubtotal) {
      const letter = String(row.annexLetter ?? "").trim().toUpperCase()
      targets = letter
        ? allRows.filter(
            (peer) =>
              !!peer.rowId &&
              !peer.isAnnexTitle &&
              !peer.isAnnexSubtotal &&
              !peer.isAnnexPlaceholder &&
              !peer.isSection &&
              String(peer.annexLetter ?? "").trim().toUpperCase() === letter,
          )
        : []
    } else {
      const leaves = capexLeafChildrenOfParent(allRows, row)
      targets =
        leaves.length > 0
          ? leaves
          : row.rowId
            ? [row]
            : []
    }

    let sum = 0
    let any = false
    for (const target of targets) {
      if (!target.rowId) continue
      if (mode === "adjustments") {
        const add = getCapexAdditionsValue(target.rowId, cfg)
        if (add !== 0) any = true
        sum += add
        continue
      }
      // depreciation — ouverture = N-1 (trend[0]), pas le YTD après slice config
      const openingBook = forecastProjectionOpeningFromActuals(
        target.trendValues,
        target.current ?? 0,
      )
      const dep = getCapexDepreciationExpense(
        target.rowId,
        cfg,
        openingBook,
        target.label ?? "",
      )
      if (dep !== 0) any = true
      sum += dep
    }
    return any || sum !== 0 ? sum : null
  }

  const saveAdjustment = async () => {
    if (!editingAdjustment || capexHypothesisEditorTab !== "ajustement") return
    if (adjustmentValue === 0) {
      closeCapexHypothesisPanel()
      return
    }

    const { rowId } = editingAdjustment
    const yearIndex = ensureCapexProjectedYearIndex(editingAdjustment.yearIndex)
    const key = `${rowId}-${yearIndex}`
    const savedId = editingAdjustmentId ?? generateId()
    const capexKey = `${key}:${savedId}`
    const rowLabel = baseData?.find((r) => r.rowId === rowId)?.label ?? ""
    const resolvedAdjustmentAmount =
      adjustmentType === "percentRevenue"
        ? Math.round((projectedRevenueYearTotals?.[yearIndex] ?? 0) * (adjustmentValue / 100))
        : Math.round(adjustmentValue)

    let financingSaved = normalizeCapexFinancing(
      {
        ...capexFinancingDraft,
        projectName: capexFinancingDraft.projectName.trim() || rowLabel,
        totalAmount: resolvedAdjustmentAmount,
        serviceDate: {
          year: adjustmentYearIndexToCalendarYear(yearIndex, effectiveForecastBaseYear),
          month: 1,
        },
      },
      effectiveForecastBaseYear,
    )

    const seasonalitySaved =
      financingSaved.mode === "financed"
        ? createDefaultForecastSeasonalityMonthPercents()
        : normalizeForecastSeasonalityMonthPercents(capexDisbursementSeasonalityMonthPercents)

    if (
      financingSaved.mode !== "financed" &&
      seasonalitySaved.reduce((a, b) => a + b, 0) !== 100
    ) {
      return
    }
    if (!capexFinancingSaveOk(financingSaved)) return

    setCapexFinancingSaving(true)
    try {
      const assetLinkCode = resolveCapexAssetLinkCodeForDebt(rowId, {
        rowLinkCode: baseData?.find((r) => r.rowId === rowId)?.linkCode,
        structureRows: displayStructure,
      })

      const financingByYear: Record<number, CapexFinancingConfig> = {}
      const adjustmentIdByYear: Record<number, string> = { [yearIndex]: savedId }

      if (projectionId && companyId) {
        try {
          financingSaved = await syncCapexFinancingToDebtForecast({
            companyId,
            projectionId,
            capexKey,
            financing: financingSaved,
            forecastBaseYear: effectiveForecastBaseYear,
            assetLinkCode,
          })
          financingByYear[yearIndex] = financingSaved

          if (replicateCapexAdjustmentToFollowingYears) {
            const yearLabelsLen = projectionYears + 1
            for (let y = yearIndex + 1; y < yearLabelsLen; y++) {
              const yId = generateId()
              adjustmentIdByYear[y] = yId
              const yKey = `${rowId}-${y}:${yId}`
              const calendarYear = adjustmentYearIndexToCalendarYear(y, effectiveForecastBaseYear)
              let yFinancing = normalizeCapexFinancing(
                {
                  ...financingSaved,
                  linkedLoanId: undefined,
                  serviceDate: { year: calendarYear, month: 1 },
                  debt: financingSaved.debt
                    ? {
                        ...financingSaved.debt,
                        firstPaymentDate: {
                          year: Math.max(
                            calendarYear,
                            financingSaved.debt.firstPaymentDate.year,
                          ),
                          month: financingSaved.debt.firstPaymentDate.month,
                        },
                        balloonPaymentDate: financingSaved.debt.balloonPaymentDate
                          ? {
                              year: Math.max(
                                calendarYear,
                                financingSaved.debt.balloonPaymentDate.year,
                              ),
                              month: financingSaved.debt.balloonPaymentDate.month,
                            }
                          : undefined,
                      }
                    : undefined,
                },
                effectiveForecastBaseYear,
              )
              yFinancing = await syncCapexFinancingToDebtForecast({
                companyId,
                projectionId,
                capexKey: yKey,
                financing: yFinancing,
                forecastBaseYear: effectiveForecastBaseYear,
                assetLinkCode,
              })
              financingByYear[y] = yFinancing
            }
          }
        } catch (err) {
          console.error("Error syncing capex financing to debt:", err)
          financingByYear[yearIndex] = financingSaved
        }
      } else {
        financingByYear[yearIndex] = financingSaved
      }

      setCapexAdjustments((prev) => {
        const next = { ...prev }
        const yearLabelsLen = projectionYears + 1

        const buildAdj = (y: number, id: string): CapexAdjustment => ({
          id,
          rowId,
          yearIndex: y,
          type: adjustmentType,
          value: adjustmentValue,
          note: adjustmentNote,
          linkCode: assetLinkCode,
          seasonalityMonthPercents: seasonalitySaved,
          capexFinancing: financingByYear[y] ?? financingSaved,
          hypothesisMetaOnly: false,
        })

        const currentList = (prev[key] || []).filter(
          (a) => a.id === savedId || isCapexHypothesisGrowthAdjustment(a),
        )
        const withoutSaved = currentList.filter((a) => a.id !== savedId)
        next[key] = [...withoutSaved, buildAdj(yearIndex, savedId)]

        if (replicateCapexAdjustmentToFollowingYears && yearIndex < yearLabelsLen - 1) {
          for (let y = yearIndex + 1; y < yearLabelsLen; y++) {
            next[`${rowId}-${y}`] = [buildAdj(y, adjustmentIdByYear[y] ?? generateId())]
          }
        }

        return next
      })

      setCapexFinancingDraft(financingByYear[yearIndex] ?? financingSaved)
      setReplicateCapexAdjustmentToFollowingYears(false)
      closeCapexHypothesisPanel()
    } finally {
      setCapexFinancingSaving(false)
    }
  }

  const deleteAdjustment = (adjustmentId: string) => {
    let removed: CapexAdjustment | undefined
    for (const list of Object.values(capexAdjustments)) {
      const found = list.find((adj) => adj.id === adjustmentId)
      if (found) {
        removed = found
        break
      }
    }

    if (removed && projectionId && companyId) {
      const financing =
        parseCapexFinancingFromStorage(removed.capexFinancing) ??
        (removed.capexFinancing as CapexFinancingConfig | undefined)
      if (financing && (financing.linkedLoanId || financing.mode !== "cash")) {
        const capexKey = `${removed.rowId}-${removed.yearIndex}:${removed.id}`
        void syncCapexFinancingToDebtForecast({
          companyId,
          projectionId,
          capexKey,
          financing: {
            ...financing,
            mode: "cash",
            totalAmount: 0,
            downPayment: undefined,
            financedAmount: undefined,
            debt: undefined,
          },
          forecastBaseYear: effectiveForecastBaseYear,
          assetLinkCode: resolveCapexAssetLinkCodeForDebt(removed.rowId, {
            rowLinkCode: removed.linkCode,
            structureRows: displayStructure,
          }),
        }).catch((err) => {
          console.error("Error removing capex financing from debt:", err)
        })
      }
    }

    setCapexAdjustments((prev) => {
      const updated = { ...prev }
      for (const key in updated) {
        updated[key] = updated[key].filter((adj) => adj.id !== adjustmentId)
        if (updated[key].length === 0) delete updated[key]
      }
      return updated
    })
  }

  const formatAdjustmentTypeLabel = (type: CapexAdjustmentType): string => {
    switch (type) {
      case "amount":
        return "Montant annuel"
      case "growthPercent":
        return "Croissance en %"
      case "growthAmount":
        return "Croissance en $"
      case "percentRevenue":
        return "% des revenus"
      default:
        return type
    }
  }

  const getCapexAdjustmentTypeBadgeClass = (type: CapexAdjustmentType): string => {
    switch (type) {
      case "amount":
        return "bg-slate-100 text-slate-700"
      case "growthPercent":
        return "bg-emerald-100 text-emerald-700"
      case "growthAmount":
        return "bg-blue-100 text-blue-700"
      case "percentRevenue":
        return "bg-indigo-100 text-indigo-700"
      default:
        return "bg-slate-100 text-slate-700"
    }
  }

  // Helper function to generate trend data for years (projectionYears + 1)
  const getYearsData = (): DetailRow[] => {
    if (!baseData || baseData.length === 0) return []

    const numYears = forecastConfigYearCount
    const withTrends = baseData.map((row) => {
      if (
        row.isSection ||
        row.label === "" ||
        row.isAnnexTitle ||
        row.isAnnexPlaceholder ||
        row.isAnnexSubtotal
      ) {
        return { ...row, trendValues: undefined }
      }

      const base = row.current
      const rowId = row.rowId
      const seriesRow = rowId ? bsRows.find((r) => r.id === rowId) : undefined
      const prefix =
        seriesRow && forecastUseSeriesActuals
          ? forecastBalanceSheetActualPrefixValues(
              forecastActualLayoutEffective,
              seriesRow,
              bsPeriods,
              effectiveRefMonth,
              effectiveFiscalYear,
              fiscalYearEndMonth,
            )
          : [base]
      const displayBase = forecastTrendFromActualPrefix(prefix, projectionYears)
      // Ouverture projetée = N-1 (prefix[0]), jamais le YTD partiel.
      const actualBase = forecastProjectionOpeningFromActuals(prefix, base)

      const configTrend = rowId
        ? buildRowAssetStates(rowId, row.label, actualBase).map((s) => s.bookValue)
        : Array.from({ length: numYears }, (_, yearIndex) =>
            yearIndex === 0 ? actualBase : 0,
          )

      return {
        ...row,
        trendValues: mergeConfigYearsOntoForecastDisplay(
          displayBase,
          configTrend,
          forecastActualCols,
        ),
      }
    })

    return insertAnnexDetailPlaceholderRows(
      rollupCapexParentTrendsFromLeafRows(withTrends),
      forecastYearCount,
    )
  }

  const getDetailData = (): DetailRow[] => {
    const effectiveView = isForecastSection ? "years" : view

    if (effectiveView === "years") {
      return getYearsData()
    }

    // For other views, use real data from API if available
    if (baseData && baseData.length > 0) {
      return baseData
    }

    // Fallback: empty array when no data
    return []
  }

  const capitalizeFirst = (str: string): string => {
    if (!str) return str
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  const effectiveView = isForecastSection ? "years" : view
  const effectivePeriod = isForecastSection ? "annual" : period

  let data = getDetailData()

  const capexHypothesisInlineActive =
    isForecastSection && capexHypothesisPanelOpen && editingAdjustment != null
  const capexHypothesisAnchorIdx =
    capexHypothesisInlineActive && editingAdjustment?.rowId
      ? data.findIndex((r) => r.rowId === editingAdjustment.rowId)
      : -1
  const yearColumnCount = forecastYearCount
  /** Sticky scroll carte — hors rapport ; le rapport garde un scroll horizontal dédié. */
  const forecastTableStickyScroll =
    isForecastSection && effectiveView === "years" && !embedInReport
  /** Rapport VCA : style léger + scroll gauche/droite (Code / Taux / années). */
  const embedYearsFitTable =
    embedInReport && isForecastSection && effectiveView === "years"
  const forecastTableColumnCount =
    effectiveView === "years"
      ? (isForecastSection ? 3 : 1) + yearColumnCount
      : 1

  const renderCapexHypothesisPanel = (embedded = false) => {
    if (!capexHypothesisPanelOpen || !editingAdjustment) return null

    const rowLabel =
      data.find((r) => r.rowId === editingAdjustment.rowId)?.label || "Poste"
    const yearLabels = getYearLabels()
    const adjustmentYearIndex = ensureCapexProjectedYearIndex(editingAdjustment.yearIndex)
    const yearLabel =
      yearLabels[forecastConfigToDisplayYearIndex(adjustmentYearIndex, forecastActualCols)] ||
      `${adjustmentYearIndex}`
    const existingAdjustments = getAdjustments(editingAdjustment.rowId, adjustmentYearIndex).filter(
      isCapexHypothesisGrowthAdjustment,
    )
    const canReplicateToFollowingYears = adjustmentYearIndex < forecastConfigYearCount - 1
    const followingYearsLabel = yearLabels
      .slice(forecastConfigToDisplayYearIndex(adjustmentYearIndex, forecastActualCols) + 1)
      .join(", ")
    const capexDisbursementCalendarSaveOk =
      capexFinancingDraft.mode === "financed" ||
      capexDisbursementSeasonalityMonthPercents.reduce((a, b) => a + b, 0) === 100
    /** Montant de l’ajustement en cours (chaque ajustement a son propre décaissement). */
    const capexAdjustmentAnnual =
      adjustmentType === "percentRevenue"
        ? Math.round((projectedRevenueYearTotals?.[adjustmentYearIndex] ?? 0) * (adjustmentValue / 100))
        : Math.round(adjustmentValue)
    const adjustmentCalendarYear = adjustmentYearIndexToCalendarYear(
      adjustmentYearIndex,
      effectiveForecastBaseYear,
    )
    const capexFinancingEffective = {
      ...capexFinancingDraft,
      projectName: capexFinancingDraft.projectName.trim() || rowLabel,
      totalAmount: capexAdjustmentAnnual,
    }
    const capexFinancingDraftSaveOk = capexFinancingSaveOk(capexFinancingEffective)
    const capexAjustementSaveOk =
      adjustmentValue !== 0 && capexFinancingDraftSaveOk && capexDisbursementCalendarSaveOk
    const revenueHintYear =
      adjustmentType === "percentRevenue" && adjustmentYearIndex >= 0
        ? projectedRevenueYearTotals?.[adjustmentYearIndex]
        : null
    const capexAjustementSaveDisabled = !capexAjustementSaveOk || capexFinancingSaving

    const buildYearSummaryFromAdjustments = (
      yearIdx: number,
      annualResolved: number,
      list: CapexAdjustment[],
      draftOverride?: {
        id: string | null
        amount: number
        financing: CapexFinancingConfig
        seasonality: number[]
      },
    ): HypothesisYearSummaryInput => {
      const growth = list.filter(isCapexHypothesisGrowthAdjustment)
      const pieces: { cash: number; seasonality: number[] }[] = []

      if (growth.length === 0 && draftOverride && draftOverride.amount > 0) {
        pieces.push({
          cash: computeCashDisbursementAmount({
            ...draftOverride.financing,
            totalAmount: draftOverride.amount,
          }),
          seasonality: draftOverride.seasonality,
        })
      } else {
        for (const adj of growth) {
          const isDraft = draftOverride != null && adj.id === draftOverride.id
          const amount = isDraft
            ? draftOverride.amount
            : resolveSingleCapexAdjustmentAmount(adj, yearIdx, annualResolved, annualResolved)
          if (amount <= 0) continue
          const financing = isDraft
            ? { ...draftOverride.financing, totalAmount: amount }
            : adj.capexFinancing
              ? {
                  ...(parseCapexFinancingFromStorage(adj.capexFinancing) ??
                    (adj.capexFinancing as CapexFinancingConfig)),
                  totalAmount: amount,
                }
              : createDefaultCapexFinancing("", amount, effectiveForecastBaseYear)
          const seasonality = isDraft
            ? draftOverride.seasonality
            : adj.seasonalityMonthPercents != null
              ? parseSeasonalityMonthPercentsFromStorage(adj)
              : createDefaultForecastSeasonalityMonthPercents()
          pieces.push({
            cash: computeCashDisbursementAmount(financing),
            seasonality,
          })
        }
        if (
          draftOverride &&
          draftOverride.id == null &&
          draftOverride.amount > 0 &&
          !growth.some((a) => a.id === editingAdjustmentId)
        ) {
          pieces.push({
            cash: computeCashDisbursementAmount({
              ...draftOverride.financing,
              totalAmount: draftOverride.amount,
            }),
            seasonality: draftOverride.seasonality,
          })
        }
      }

      const cashFlowAnnual = pieces.reduce((s, p) => s + p.cash, 0)
      let seasonalityMonthPercents = createDefaultForecastSeasonalityMonthPercents()
      if (pieces.length === 1) {
        seasonalityMonthPercents = normalizeForecastSeasonalityMonthPercents(pieces[0]!.seasonality)
      } else if (pieces.length > 1 && cashFlowAnnual > 0) {
        const weighted = Array.from({ length: 12 }, () => 0)
        for (const p of pieces) {
          const norm = normalizeForecastSeasonalityMonthPercents(p.seasonality)
          for (let m = 0; m < 12; m++) {
            weighted[m]! += (norm[m]! / 100) * p.cash
          }
        }
        seasonalityMonthPercents = normalizeForecastSeasonalityMonthPercents(
          weighted.map((w) => (w / cashFlowAnnual) * 100),
        )
      }

      return {
        annual: annualResolved,
        cashFlowAnnual,
        seasonalityMonthPercents,
        cashFlowSeasonalityMonthPercents: seasonalityMonthPercents,
        cashFlowBySeasonalityDirect: true,
        badDebtPercent: 0,
        buckets: createDefaultForecastCollectionBuckets(0),
      }
    }

    const summaryRowForCapexDraft = data.find((r) => r.rowId === editingAdjustment.rowId)
    const summaryTrendForCapexDraft = summaryRowForCapexDraft?.trendValues
    const capexSummaryReady =
      !!summaryRowForCapexDraft?.rowId && Array.isArray(summaryTrendForCapexDraft)
    const draftSummaryOverride = {
      id: editingAdjustmentId,
      amount: capexAdjustmentAnnual,
      financing: capexFinancingDraft,
      seasonality: normalizeForecastSeasonalityMonthPercents(capexDisbursementSeasonalityMonthPercents),
    }
    const capexSummaryYearsParams: HypothesisYearSummaryInput[] = []
    if (capexSummaryReady) {
      const rowIdD = summaryRowForCapexDraft!.rowId!
      const trend = summaryTrendForCapexDraft!
      for (let y = 0; y <= adjustmentYearIndex; y++) {
        const isDraftYear = y === adjustmentYearIndex
        const savedList = getAdjustments(rowIdD, y)
        const annualResolved = getCapexAdditionsValue(
          rowIdD,
          y,
          trend[0] ?? 0,
          trend,
        )
        const draftAnnual =
          isDraftYear && editingAdjustmentId
            ? (() => {
                const others = savedList
                  .filter(isCapexHypothesisGrowthAdjustment)
                  .filter((a) => a.id !== editingAdjustmentId)
                const othersSum = others.reduce(
                  (s, a) =>
                    s + resolveSingleCapexAdjustmentAmount(a, y, annualResolved, annualResolved),
                  0,
                )
                return othersSum + capexAdjustmentAnnual
              })()
            : isDraftYear && !editingAdjustmentId && capexAdjustmentAnnual > 0
              ? annualResolved + capexAdjustmentAnnual
              : annualResolved
        capexSummaryYearsParams.push(
          buildYearSummaryFromAdjustments(
            y,
            draftAnnual,
            savedList,
            isDraftYear ? draftSummaryOverride : undefined,
          ),
        )
      }
    }
    const firstProjectedYearIndexForCapexSummary = 1
    const capexSummaryMoneyPointsBase =
      capexSummaryReady && capexSummaryYearsParams.length === adjustmentYearIndex + 1
        ? computeHypothesisSummaryMoneyPoints(
            capexSummaryYearsParams,
            adjustmentYearIndex,
            firstProjectedYearIndexForCapexSummary,
          )
        : []
    const openingBookForSummary = (() => {
      const seriesRow = bsRows.find((r) => r.id === editingAdjustment.rowId)
      if (!seriesRow || !forecastUseSeriesActuals) {
        return data.find((r) => r.rowId === editingAdjustment.rowId)?.current ?? 0
      }
      const prefix = forecastBalanceSheetActualPrefixValues(
        forecastActualLayoutEffective,
        seriesRow,
        bsPeriods,
        effectiveRefMonth,
        effectiveFiscalYear,
        fiscalYearEndMonth,
      )
      return forecastProjectionOpeningFromActuals(prefix, 0)
    })()
    const draftAdditionsOverrideForSummary: Record<number, number> = {
      [adjustmentYearIndex]: (() => {
        const others = existingAdjustments
          .filter((a) => a.id !== editingAdjustmentId)
          .reduce(
            (s, a) =>
              s +
              resolveSingleCapexAdjustmentAmount(
                a,
                adjustmentYearIndex,
                0,
                openingBookForSummary,
                undefined,
                editingAdjustment.rowId,
              ),
            0,
          )
        return others + Math.max(0, capexAdjustmentAnnual)
      })(),
    }
    const assetStatesForSummary = capexSummaryReady
      ? buildRowAssetStates(
          editingAdjustment.rowId,
          rowLabel,
          openingBookForSummary,
          draftAdditionsOverrideForSummary,
        )
      : []
    const prevStateForSummary =
      adjustmentYearIndex > 0 ? assetStatesForSummary[adjustmentYearIndex - 1] : undefined
    const openingCostForMonth =
      prevStateForSummary?.cost ??
      getOpeningCostForRow(editingAdjustment.rowId, openingBookForSummary)
    const openingBookForMonth = prevStateForSummary?.bookValue ?? openingBookForSummary
    const savedRate = getDepreciationRate(editingAdjustment.rowId, rowLabel)
    const savedMethod = getDepreciationMethod(editingAdjustment.rowId)
    // draftDepreciationRate reste à 0 tant que l’onglet Taux n’a pas hydraté le brouillon —
    // toujours retomber sur le taux enregistré / défaut du poste.
    const effectiveSummaryRate = draftDepreciationRate || savedRate
    const effectiveSummaryMethod =
      capexDepDraftRowKeyRef.current === `dep:${editingAdjustment.rowId}`
        ? draftDepreciationMethod
        : savedMethod
    const capexSummaryMoneyPoints =
      capexSummaryMoneyPointsBase.length > 0
        ? attachCapexAssetMonthlyTracking(capexSummaryMoneyPointsBase, {
            openingCost: Math.max(0, openingCostForMonth),
            openingBookValue: Math.max(0, openingBookForMonth),
            ratePercent: effectiveSummaryRate,
            method: effectiveSummaryMethod,
          })
        : []
    const capexSummarySeries = [
      { key: "primary" as const, label: "Capex", color: "#475569", lineName: "Capex" },
      { key: "cashFlow" as const, label: "Décaissements", color: "#059669", lineName: "Décaissement" },
      {
        key: "cost" as const,
        label: "Coût",
        color: "#64748b",
        lineName: "Coût",
        inChart: false,
      },
      {
        key: "bookValue" as const,
        label: "Valeur comptable",
        color: "#0f766e",
        lineName: "Valeur comptable",
        inChart: false,
      },
      {
        key: "depreciation" as const,
        label: "Amortissement",
        color: "#7c3aed",
        lineName: "Amortissement",
        inChart: false,
      },
    ] as const
    const capexSummaryAnnualForYear =
      capexSummaryYearsParams[adjustmentYearIndex]?.annual ?? 0

    return (
      <div
        className={cn(
          embedded ? "w-full min-w-0 max-w-full overflow-x-auto overflow-y-visible" : "flex min-h-0 flex-1 flex-col",
          "min-w-0 max-w-full",
        )}
      >
        <Tabs
          value={capexHypothesisEditorTab}
          onValueChange={handleCapexHypothesisTabChange}
          className={cn("flex min-h-0 min-w-0 max-w-full flex-col gap-6", embedded ? "" : "min-h-0 flex-1")}
        >
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Hypothèse</p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl">{rowLabel}</h3>
              <p className="mt-3 text-xs font-medium leading-relaxed text-blue-800">
                {capexHypothesisEditorTab === "taux" ? (
                  <>
                    Paramètre <span className="text-blue-600/50" aria-hidden>·</span>{" "}
                    <span className="font-semibold text-blue-900">Taux d&apos;amortissement</span>
                  </>
                ) : (
                  <>
                    Année sélectionnée <span className="text-blue-600/50" aria-hidden>·</span>{" "}
                    <span className="font-semibold text-blue-900">{yearLabel}</span>
                  </>
                )}
              </p>
              <TabsList className="mt-3 flex w-full max-w-lg flex-wrap gap-1 rounded-lg border border-slate-200/90 bg-slate-100/80 p-0.5 sm:inline-flex sm:w-fit sm:max-w-none">
                <TabsTrigger
                  value="sommaire"
                  className="h-8 flex-1 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#2A2F3A] data-[state=active]:shadow-sm sm:flex-initial sm:px-3"
                >
                  Sommaire
                </TabsTrigger>
                <TabsTrigger
                  value="taux"
                  className="h-8 flex-1 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#2A2F3A] data-[state=active]:shadow-sm sm:flex-initial sm:px-3"
                >
                  Taux
                </TabsTrigger>
                <TabsTrigger
                  value="ajustement"
                  className="h-8 flex-1 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#2A2F3A] data-[state=active]:shadow-sm sm:flex-initial sm:px-3"
                >
                  Ajustement
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {capexHypothesisEditorTab === "ajustement" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 border-slate-200 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:border-slate-200 disabled:text-slate-400"
                  onClick={() => void saveAdjustment()}
                  disabled={capexAjustementSaveDisabled}
                >
                  {capexFinancingSaving
                    ? "Enregistrement…"
                    : editingAdjustmentId
                      ? "Enregistrer"
                      : "Enregistrer l'ajustement"}
                </Button>
              ) : capexHypothesisEditorTab === "taux" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 border-slate-200 text-xs font-medium text-slate-800 hover:bg-slate-50"
                  onClick={saveDepreciationHypothesis}
                >
                  Enregistrer le taux
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 border-blue-200/90 text-xs font-medium text-blue-900 hover:bg-blue-50/90"
                onClick={closeCapexHypothesisPanel}
              >
                Fermer
              </Button>
            </div>
          </div>

          <TabsContent
            value="sommaire"
            className="mt-0 flex min-h-0 min-w-0 max-w-full flex-1 flex-col outline-none focus-visible:ring-0"
          >
            <div
              className={cn(
                "pr-0.5",
                embedded && "min-w-0 max-w-full",
                !embedded && "min-h-0 flex-1 overflow-y-auto",
              )}
            >
              <div className="min-w-0 space-y-3 rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
                <span className="font-medium text-slate-800">
                  Sommaire du capex et des décaissements mensuellement
                </span>
                {!capexSummaryReady ? (
                  <p className="rounded-md border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-900">
                    Données de projection indisponibles pour ce poste.
                  </p>
                ) : capexSummaryAnnualForYear === 0 ? (
                  <p className="rounded-md border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-900">
                    Aucun montant capex projeté pour {yearLabel}. Définissez un ajustement dans
                    l&apos;onglet Ajustement pour visualiser le sommaire.
                  </p>
                ) : capexSummaryMoneyPoints.length === 0 ? null : (
                  <ForecastHypothesisSummaryChart
                    points={capexSummaryMoneyPoints}
                    series={capexSummarySeries}
                    visible={capexSummarySeriesVisible}
                    onToggleVisible={(key) =>
                      setCapexSummarySeriesVisible((s) => ({ ...s, [key]: !s[key] }))
                    }
                    formatValue={formatCurrency}
                    chartAriaLabel="Sommaire capex et décaissements par mois"
                  />
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="taux"
            className="mt-0 min-h-0 min-w-0 max-w-full flex-1 outline-none focus-visible:ring-0"
          >
            <div className={cn("mt-2 pr-0.5", embedded && "min-w-0 max-w-full", !embedded && "min-h-0 flex-1 overflow-y-auto")}>
              <p className="mb-4 text-xs leading-relaxed text-slate-600">
                Le taux d&apos;amortissement sert de base à la projection des immobilisations. Choisissez la méthode
                et le taux applicables à ce poste — comme le menu{" "}
                <span className="font-medium text-slate-800">Type et Taux</span> pour les dépenses.
              </p>
              <div className="min-w-0 max-w-xl rounded-2xl border border-slate-200/90 bg-white/85 p-4 shadow-sm sm:p-5">
                <div className="space-y-4">
                  <div className="border-b border-slate-200/70 pb-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Taux d&apos;amortissement
                    </h3>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Méthode</label>
                    <Select
                      value={draftDepreciationMethod}
                      onValueChange={(value: CapexDepreciationMethod) => setDraftDepreciationMethod(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="declining">% Dégressif</SelectItem>
                        <SelectItem value="linear">% Linéaire</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-slate-500">
                      {draftDepreciationMethod === "declining"
                        ? "Amortissement dégressif appliqué sur la valeur nette comptable."
                        : "Amortissement linéaire réparti uniformément sur la durée de vie."}
                    </p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Taux (%)</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        value={draftDepreciationRate}
                        onChange={(e) => setDraftDepreciationRate(parseFloat(e.target.value) || 0)}
                        className="w-full"
                      />
                      <span className="text-sm text-slate-600">%</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Taux enregistré :{" "}
                      {renderDepreciationRateCell(editingAdjustment.rowId, rowLabel)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="ajustement"
            className="mt-0 min-h-0 min-w-0 max-w-full flex-1 outline-none focus-visible:ring-0"
          >
            <div className={cn("mt-2 pr-0.5", embedded && "min-w-0 max-w-full", !embedded && "min-h-0 flex-1 overflow-y-auto")}>
              <p className="mb-4 text-xs leading-relaxed text-slate-600">
                L&apos;ajustement augmente le <span className="font-medium text-slate-800">Coût</span>{" "}
                (mapping comptable). La dotation suit le taux du poste et augmente l&apos;
                <span className="font-medium text-slate-800">Amortissement cumulé</span> — la cellule
                projetée affiche la valeur comptable. Chaque ajustement inclut aussi son financement et
                son calendrier de décaissement.
              </p>
              {(() => {
                const openingBook =
                  (() => {
                    const seriesRow = bsRows.find((r) => r.id === editingAdjustment.rowId)
                    if (!seriesRow || !forecastUseSeriesActuals) {
                      return data.find((r) => r.rowId === editingAdjustment.rowId)?.current ?? 0
                    }
                    const prefix = forecastBalanceSheetActualPrefixValues(
                      forecastActualLayoutEffective,
                      seriesRow,
                      bsPeriods,
                      effectiveRefMonth,
                      effectiveFiscalYear,
                      fiscalYearEndMonth,
                    )
                    return forecastProjectionOpeningFromActuals(prefix, 0)
                  })()
                const draftAdditionsOverride: Record<number, number> = {
                  [adjustmentYearIndex]: (() => {
                    const others = existingAdjustments
                      .filter((a) => a.id !== editingAdjustmentId)
                      .reduce(
                        (s, a) =>
                          s +
                          resolveSingleCapexAdjustmentAmount(
                            a,
                            adjustmentYearIndex,
                            0,
                            openingBook,
                            undefined,
                            editingAdjustment.rowId,
                          ),
                        0,
                      )
                    return others + Math.max(0, capexAdjustmentAnnual)
                  })(),
                }
                const assetStates = buildRowAssetStates(
                  editingAdjustment.rowId,
                  rowLabel,
                  openingBook,
                  draftAdditionsOverride,
                )
                const yearState = assetStates[adjustmentYearIndex]
                const prevState = assetStates[Math.max(0, adjustmentYearIndex - 1)]
                if (!yearState) return null
                return (
                  <div
                    data-testid="capex-asset-rollforward-table"
                    className="mb-4 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/85 shadow-sm"
                  >
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/90">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Poste
                          </th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {yearLabel}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="[&_td]:border-b [&_td]:border-slate-100">
                        <tr>
                          <td className="px-4 py-2 text-slate-600">Coût (ouverture)</td>
                          <td className="px-4 py-2 text-right tabular-nums text-slate-700">
                            {formatCurrency(prevState?.cost ?? yearState.cost - yearState.additions)}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 text-slate-600">+ Ajustement (ajout au coût)</td>
                          <td className="px-4 py-2 text-right tabular-nums text-slate-700">
                            {yearState.additions !== 0
                              ? formatCurrency(yearState.additions)
                              : "—"}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-medium text-slate-800">Coût</td>
                          <td className="px-4 py-2 text-right tabular-nums font-medium text-slate-900">
                            {formatCurrency(yearState.cost)}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 text-slate-600">
                            Amortissement cumulé (ouverture)
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-slate-700">
                            {formatCurrency(
                              prevState?.accumulatedDepreciation ??
                                yearState.accumulatedDepreciation - yearState.depreciationExpense,
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 text-slate-600">+ Dotation de l&apos;exercice</td>
                          <td className="px-4 py-2 text-right tabular-nums text-slate-700">
                            {yearState.depreciationExpense !== 0
                              ? formatCurrency(yearState.depreciationExpense)
                              : "—"}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-medium text-slate-800">
                            Amortissement cumulé
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums font-medium text-slate-900">
                            {formatCurrency(yearState.accumulatedDepreciation)}
                          </td>
                        </tr>
                        <tr className="bg-slate-50/60">
                          <td className="px-4 py-2.5 font-semibold text-slate-900">
                            Valeur comptable
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-slate-900">
                            {formatCurrency(yearState.bookValue)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )
              })()}
              {canReplicateToFollowingYears ? (
                <div className="mb-4 flex min-w-0 items-start gap-2.5">
                  <Checkbox
                    id="capex-hypothesis-replicate"
                    checked={replicateCapexAdjustmentToFollowingYears}
                    onCheckedChange={(v) => setReplicateCapexAdjustmentToFollowingYears(v === true)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <Label
                      htmlFor="capex-hypothesis-replicate"
                      className="cursor-pointer text-xs font-medium leading-snug text-slate-800"
                    >
                      Appliquer le même ajustement aux années suivantes
                    </Label>
                    <p className="text-[11px] leading-relaxed text-slate-500">
                      Les années {followingYearsLabel} reprendront le même type, montant, note, financement et
                      calendrier de décaissement que {yearLabel}.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mb-4 text-xs text-slate-400">Aucune année projetée après {yearLabel}.</p>
              )}
              <div className={cn("flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-6", embedded && "min-w-0 max-w-full")}>
                <div className="min-w-0 flex-1 space-y-6">
                  <div className="rounded-2xl border border-slate-200/90 bg-white/85 p-4 shadow-sm sm:p-5">
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
                              pendingCapexAdjustmentIdRef.current = null
                              capexHypothesisDraftLoadKeyRef.current = null
                              resetCapexAdjustmentDraftForm(
                                editingAdjustment.rowId,
                                adjustmentYearIndex,
                                rowLabel,
                              )
                              setCapexHypothesisEditorTab("ajustement")
                            }}
                          >
                            Annuler
                          </Button>
                        ) : null}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Type d&apos;ajustement</label>
                        <Select
                          value={adjustmentType}
                          onValueChange={(value: CapexAdjustmentType) => {
                            setAdjustmentType(value)
                            setAdjustmentValue(0)
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="amount">Montant annuel</SelectItem>
                            <SelectItem value="growthPercent">Croissance en %</SelectItem>
                            <SelectItem value="growthAmount">Croissance en $</SelectItem>
                            <SelectItem value="percentRevenue">% des revenus</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="mt-1 text-xs text-slate-500">
                          {adjustmentType === "amount"
                            ? "Montant annuel cible pour cette année."
                            : adjustmentType === "growthPercent"
                              ? "Croissance en pourcentage par rapport à l'année précédente."
                              : adjustmentType === "growthAmount"
                                ? "Croissance en dollars par rapport à l'année précédente."
                                : "Pourcentage des revenus totaux projetés (REV) pour cette année."}
                        </p>
                        {adjustmentType === "percentRevenue" ? (
                          <p className="mt-2 text-xs text-slate-500">
                            Basé sur le sous-total de l&apos;estimation des revenus annuels
                            {revenueHintYear != null
                              ? ` : ${formatCurrency(revenueHintYear)} pour ${yearLabel}.`
                              : "."}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          {adjustmentType === "amount" || adjustmentType === "growthAmount"
                            ? "Montant ($)"
                            : "Valeur (%)"}
                        </label>
                        <Input
                          type="number"
                          step={adjustmentType === "amount" || adjustmentType === "growthAmount" ? "1" : "0.1"}
                          value={adjustmentValue}
                          onChange={(e) => setAdjustmentValue(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          {adjustmentType === "amount"
                            ? "Montant positif pour augmenter le capex projeté pour cette année."
                            : adjustmentType === "growthPercent"
                              ? "Ex. : 5 pour une croissance de 5 %."
                              : adjustmentType === "growthAmount"
                                ? "Montant en dollars ajouté à l'année précédente."
                                : "Ex. : 2 pour 2 % des revenus totaux projetés."}
                        </p>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Note explicative</label>
                        <Textarea
                          value={adjustmentNote}
                          onChange={(e) => setAdjustmentNote(e.target.value)}
                          placeholder="Ex.: achat d'équipement, expansion, etc."
                          className="min-h-[80px] w-full"
                        />
                        <p className="mt-1 text-xs text-slate-500">Décrivez la raison de cet ajustement</p>
                      </div>

                      <CapexFinancingEditor
                        embedded={embedded}
                        forecastBaseYear={effectiveForecastBaseYear}
                        projectionYears={projectionYears}
                        config={capexFinancingDraft}
                        adjustmentAmount={capexAdjustmentAnnual}
                        adjustmentCalendarYear={adjustmentCalendarYear}
                        onChange={setCapexFinancingDraft}
                        disbursementSeasonalityMonthPercents={capexDisbursementSeasonalityMonthPercents}
                        onDisbursementSeasonalityChange={setCapexDisbursementSeasonalityMonthPercents}
                        canReplicateCalendar={canReplicateToFollowingYears}
                        replicateCalendar={false}
                        onReplicateCalendarChange={() => {}}
                        hideReplicateCalendar
                        followingYearsLabel={followingYearsLabel}
                        yearLabel={yearLabel}
                        linkedLoanId={capexFinancingDraft.linkedLoanId}
                      />
                    </div>
                  </div>
                </div>

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
                        const modeLabel =
                          adj.capexFinancing?.mode === "financed"
                            ? "Financement"
                            : adj.capexFinancing?.mode === "mixed"
                              ? "Mixte"
                              : adj.capexFinancing
                                ? "Comptant"
                                : null
                        return (
                          <div key={adj.id} className="rounded-lg border border-slate-200 bg-white p-4">
                            <div className="mb-2 flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-slate-900">
                                    {adj.type === "amount" || adj.type === "growthAmount"
                                      ? formatCurrency(adj.value)
                                      : `${adj.value.toFixed(1)}%`}
                                  </span>
                                  <span
                                    className={cn(
                                      "rounded px-2 py-0.5 text-xs",
                                      getCapexAdjustmentTypeBadgeClass(adj.type),
                                    )}
                                  >
                                    {formatAdjustmentTypeLabel(adj.type)}
                                  </span>
                                  {modeLabel ? (
                                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">
                                      {modeLabel}
                                    </span>
                                  ) : null}
                                </div>
                                {adj.note ? <p className="mt-1 text-sm text-slate-600">{adj.note}</p> : null}
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openCapexHypothesisPanel(
                                      editingAdjustment.rowId,
                                      adjustmentYearIndex,
                                      "adjustment",
                                      rowLabel,
                                      adj.id,
                                    )
                                  }
                                  className="rounded p-1.5 transition-colors hover:bg-slate-200"
                                  title="Modifier"
                                >
                                  <Edit2 className="h-4 w-4 text-slate-600" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteAdjustment(adj.id)}
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
        </Tabs>
      </div>
    )
  }

  const isCompanyComparison = columnMode === "comparison" && !companyId
  const isDivisionComparison = columnMode === "comparison" && companyId && !divisionId
  const isSubDivisionComparison = columnMode === "comparison" && companyId && divisionId && !subDivisionId
  const isComparisonMode = isCompanyComparison || isDivisionComparison || isSubDivisionComparison

  const getYearLabels = (): string[] => {
    if (isForecastSection) {
      const baseYear = forecastBaseYear ?? effectiveFiscalYear + 1
      return forecastYearLabelsForLayout(
        forecastActualLayoutEffective,
        baseYear,
        projectionYears,
        effectiveRefMonth,
        effectiveFiscalYear,
        fiscalYearEndMonth,
      )
    }
    const currentYear = new Date().getFullYear()
    const labels: string[] = []
    for (let i = 5; i >= 0; i--) {
      labels.push(`${currentYear - i}`)
    }
    return labels
  }

  const getHorizonText = (): string => {
    if (isForecastSection) return `Annuel — ${projectionYears} ans`
    if (effectiveView === "years") return "Années"
    if (effectiveView === "comparison" && effectivePeriod === "monthly") return "Courant"
    if (effectiveView === "comparison" && effectivePeriod === "quarterly") return "Trimestriel"
    if (effectiveView === "comparison" && effectivePeriod === "annual") return "Annuel"
    if (effectiveView === "ytd") return "YTD"
    if (effectiveView === "ddm") return "DDM"
    if (effectiveView === "12months") return "12 mois"
    if (effectiveView === "quarters") return "Trimestres"
    return "Courant"
  }

  const isDataLoading =
    bsLoading || (isForecastSection && (structureLoading || standardLinkCodesLoading))

  const amountViewModeToggle =
    isForecastSection ? (
      <div
        className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm"
        role="group"
        aria-label="Mode d'affichage des montants Capex"
      >
        {(
          [
            { mode: "bookValue" as const, label: "Valeur comptable", testId: "capex-view-book" },
            { mode: "adjustments" as const, label: "Ajustements", testId: "capex-view-adjustments" },
            { mode: "depreciation" as const, label: "Amortissement", testId: "capex-view-depreciation" },
          ] as const
        ).map(({ mode, label, testId }) => (
          <Button
            key={mode}
            type="button"
            variant="ghost"
            size="sm"
            data-testid={testId}
            onClick={() => setCapexAmountViewMode(mode)}
            className={cn(
              "h-8 gap-1 rounded-md px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              capexAmountViewMode === mode &&
                (mode === "adjustments"
                  ? "bg-blue-50 text-blue-900 hover:bg-blue-50 hover:text-blue-900"
                  : mode === "depreciation"
                    ? "bg-violet-50 text-violet-900 hover:bg-violet-50 hover:text-violet-900"
                    : "bg-slate-100 text-slate-900 hover:bg-slate-100 hover:text-slate-900"),
            )}
          >
            {mode === "adjustments" ? <CircleDot className="h-3.5 w-3.5" /> : null}
            {label}
          </Button>
        ))}
      </div>
    ) : null

  return (
    <div className={cn("w-full", !embedInReport && dashboardCardFrameStaticClass)}>
      {!embedInReport ? <div className={dashboardCardRingClass} aria-hidden /> : null}
      <div className="relative w-full min-w-0">
        {!embedInReport ? (
          <div className={cn("px-6 py-5 sm:px-7", dashboardCardHeaderBarClass)}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                {!hideHeaderIcon ? (
                  <div className={dashboardCardHeaderIconBoxClass}>
                    <HardHat className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <h2 className={cn("text-xl leading-tight", dashboardCardTitleClass)}>{title}</h2>
                  <div className={cn("mt-1 flex flex-wrap items-center gap-3 text-sm", dashboardCardBodyMutedClass)}>
                    <span className="font-medium text-[#2A2F3A]">{getHorizonText()}</span>
                    <span className="text-slate-400">•</span>
                    {subDivisionId && divisionId && companyId ? (
                      <>
                        <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                        <span className="text-slate-400">•</span>
                        <span>
                          {companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name ||
                            "Division"}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className={cn("font-semibold", dashboardCardAccentClass)}>
                          {companies
                            .find((c) => c.id === companyId)
                            ?.divisions.find((d) => d.id === divisionId)
                            ?.subDivisions.find((sd) => sd.id === subDivisionId)?.name || "Sous-division"}
                        </span>
                      </>
                    ) : divisionId && companyId ? (
                      <>
                        <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                        <span className="text-slate-400">•</span>
                        <span className={cn("font-semibold", dashboardCardAccentClass)}>
                          {companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name ||
                            "Division"}
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
                </div>
              </div>
              {amountViewModeToggle}
            </div>
          </div>
        ) : amountViewModeToggle ? (
          <div className="mb-3 flex justify-end">{amountViewModeToggle}</div>
        ) : null}

      {/* Loading state */}
      {isDataLoading && (
        <div className="flex items-center justify-center px-8 py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E0742D]" />
        </div>
      )}

      {/* Empty state */}
      {!isDataLoading && !companyId && (
        <div className="flex flex-col items-center justify-center px-8 py-16 text-slate-500">
          <p className={cn("text-sm", dashboardCardBodyMutedClass)}>Veuillez sélectionner une société pour afficher les données.</p>
        </div>
      )}

      {!isDataLoading && companyId && data.length === 0 && (
        <div className="flex flex-col items-center justify-center px-8 py-16 text-slate-500">
          <p className={cn("text-sm", dashboardCardBodyMutedClass)}>
            Aucun poste Capex (ALT-B, ALT-C, ALT-D) configuré dans la structure du bilan.
          </p>
        </div>
      )}

      {/* Table — sticky en carte ; flush style VCA en rapport embarqué */}
      <div
        data-testid={
          forecastTableStickyScroll
            ? "capex-forecast-table-scroll"
            : embedYearsFitTable
              ? "capex-forecast-table-report"
              : undefined
        }
        className={cn(
          "min-w-0",
          embedYearsFitTable
            ? "overflow-x-auto overscroll-x-contain bg-transparent [scrollbar-width:thin]"
            : cn(
                "bg-white",
                forecastTableStickyScroll
                  ? "max-h-[min(72vh,56rem)] overflow-auto overscroll-contain"
                  : "overflow-x-auto",
              ),
          (isDataLoading || !companyId || data.length === 0) && "hidden",
        )}
      >
        <table
          className={cn(
            "w-full",
            // Rapport : largeur naturelle + scroll horizontal (Code / Taux / années).
            embedYearsFitTable && "min-w-max border-separate border-spacing-0",
            forecastTableStickyScroll && "min-w-full border-separate border-spacing-0",
          )}
        >
          {embedYearsFitTable ? (
            <colgroup key="embed-years-scroll">
              <col style={{ width: "16rem" }} />
              <col style={{ width: "5.5rem" }} />
              <col style={{ width: "5rem" }} />
              {getYearLabels().map((_, i) => (
                <col key={`year-${i}`} style={{ width: "8.5rem" }} />
              ))}
            </colgroup>
          ) : null}
          <thead
            className={cn(
              embedYearsFitTable && [
                "[&_th]:border-b [&_th]:border-slate-200 [&_th]:bg-white",
                "[&_th:first-child]:sticky [&_th:first-child]:left-0 [&_th:first-child]:z-30",
              ],
              forecastTableStickyScroll && [
                "[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-slate-50",
                "[&_th]:border-b-2 [&_th]:border-slate-200",
                "[&_th:first-child]:left-0 [&_th:first-child]:z-30",
              ],
            )}
          >
            <tr>
              <th
                className={cn(
                  embedYearsFitTable
                    ? "min-w-[16rem] py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                    : "min-w-[20rem] px-6 py-4 text-left text-sm font-semibold text-slate-900",
                )}
              >
                {embedYearsFitTable ? "Poste" : "Compte"}
              </th>
              {effectiveView === "years" && isForecastSection && (
                <>
                  <th
                    className={cn(
                      embedYearsFitTable
                        ? "min-w-[5.5rem] px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap text-slate-500"
                        : "min-w-[7.5rem] px-3 py-4 text-center text-sm font-semibold whitespace-nowrap text-slate-900",
                    )}
                  >
                    Code
                  </th>
                  <th
                    className={cn(
                      embedYearsFitTable
                        ? "min-w-[5rem] px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap text-slate-500"
                        : "min-w-[6.5rem] px-4 py-4 text-center text-sm font-semibold whitespace-nowrap text-slate-900",
                    )}
                  >
                    Taux
                  </th>
                </>
              )}
              {effectiveView === "years" && (
                <>
                  {getYearLabels().map((label, idx) => (
                    <th
                      key={idx}
                      className={cn(
                        embedYearsFitTable
                          ? "min-w-[8.5rem] px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap text-slate-500"
                          : "min-w-[8rem] px-4 py-4 text-right text-sm font-semibold whitespace-nowrap",
                        isForecastHistoricalColumn(idx)
                          ? embedYearsFitTable
                            ? "!bg-slate-50 text-slate-400"
                            : "bg-slate-50 text-slate-400"
                          : embedYearsFitTable
                            ? ""
                            : "text-slate-900",
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
              embedYearsFitTable && [
                "[&_td]:border-t [&_td]:border-slate-200",
                "[&_td:first-child]:sticky [&_td:first-child]:left-0 [&_td:first-child]:z-10",
                "[&_td:first-child]:bg-white",
              ],
              forecastTableStickyScroll && [
                "[&_td]:border-b [&_td]:border-solid [&_td]:border-slate-200",
                "[&_td:first-child]:sticky [&_td:first-child]:left-0 [&_td:first-child]:z-10",
                "[&_td:first-child]:bg-white",
              ],
            )}
          >
            {data.map((row, idx) => {
              if (
                capexHypothesisInlineActive &&
                capexHypothesisAnchorIdx >= 0 &&
                idx !== capexHypothesisAnchorIdx
              ) {
                return null
              }

              const isSpacer = row.label === ""
              const shouldHideAmounts =
                isSpacer || !!row.isSection || !!row.isAnnexPlaceholder || !!row.isAnnexTitle
              const hideCapexCodeRateCells = shouldHideAmounts || !!row.isAnnexSubtotal
              const annexSubtotalDarkNumbers = !!row.isAnnexSubtotal
              const isSubtotalRow = !!row.isSubtotal || !!row.isAnnexSubtotal
              const displayLabel = row.isSection ? capitalizeFirst(row.label) : row.label
              const annexSubtotalLetter = row.isAnnexSubtotal
                ? String(row.annexLetter ?? "").trim().toUpperCase()
                : ""
              const nextRowIsSubtotal = idx < data.length - 1 && data[idx + 1].isSubtotal
              const isForecastSectionForExpansion = title === "Estimation des Capex annuels"
              const canExpand =
                !!row.rowId &&
                !!row.balanceAccounts &&
                row.balanceAccounts.length > 0 &&
                (projectionMode === "gl" || !isForecastSectionForExpansion)
              const isExpanded = row.rowId ? expandedRows.has(row.rowId) : false
              const hasNote = row.rowId
                ? getNoteByRowId(row.rowId, "capex", effectivePeriod, effectiveView, companyId, divisionId, subDivisionId) !== null
                : false

              const isCapexProjectionCell =
                isForecastSection &&
                !!row.rowId &&
                !shouldHideAmounts &&
                !row.isAnnexPlaceholder &&
                !row.isAnnexSubtotal &&
                !row.isAnnexTitle
              const isCapexHypothesisSelected =
                capexHypothesisPanelOpen &&
                editingAdjustment?.rowId === row.rowId &&
                capexHypothesisMode === "adjustment" &&
                editingAdjustment?.yearIndex >= 0

              return (
                <Fragment key={idx}>
                  {(forecastTableStickyScroll || embedYearsFitTable) && isSubtotalRow && (
                    <tr aria-hidden data-testid="capex-forecast-subtotal-separator">
                      <td
                        colSpan={forecastTableColumnCount}
                        className={cn(
                          "border-0 p-0 align-top leading-none border-t-2",
                          embedYearsFitTable ? "border-t-[#2A2F3A]" : "border-t-slate-900",
                        )}
                      />
                    </tr>
                  )}
                  <tr
                    className={cn(
                      !forecastTableStickyScroll && !embedYearsFitTable && "border-b transition-colors duration-150",
                      (forecastTableStickyScroll || embedYearsFitTable) && "transition-colors duration-150",
                      capexHypothesisInlineActive &&
                        capexHypothesisAnchorIdx >= 0 &&
                        idx === capexHypothesisAnchorIdx &&
                        capexHypothesisMode === "adjustment" &&
                        (forecastTableStickyScroll || embedYearsFitTable
                          ? "shadow-[inset_0_0_0_1px_rgba(59,130,246,0.28)] [&>td]:bg-blue-50/35 [&>td:first-child]:bg-blue-50/35"
                          : "bg-blue-50/35 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.28)]"),
                      capexHypothesisInlineActive &&
                        capexHypothesisAnchorIdx >= 0 &&
                        idx === capexHypothesisAnchorIdx &&
                        capexHypothesisMode === "rate" &&
                        (forecastTableStickyScroll || embedYearsFitTable
                          ? "shadow-[inset_0_0_0_1px_rgba(224,116,45,0.28)] [&>td]:bg-orange-50/35 [&>td:first-child]:bg-orange-50/35"
                          : "bg-orange-50/35 shadow-[inset_0_0_0_1px_rgba(224,116,45,0.28)]"),
                      row.label === ""
                        ? forecastTableStickyScroll || embedYearsFitTable
                          ? "[&>td]:h-2"
                          : "h-2 border-slate-200"
                        : "",
                      embedYearsFitTable
                        ? cn(
                            row.isAnnexHeader && "[&>td]:bg-amber-50/50",
                            !isSpacer &&
                              (row.isAnnexHeader
                                ? "hover:[&>td]:bg-amber-50/80"
                                : "hover:[&>td]:bg-slate-50/60"),
                          )
                        : forecastTableStickyScroll
                          ? cn(
                              annexSubtotalDarkNumbers &&
                                "[&>td:first-child]:bg-white [&>td:nth-child(2)]:bg-white [&>td:nth-child(3)]:bg-white",
                              row.isAnnexHeader && "[&>td]:bg-amber-50/90 [&>td:first-child]:bg-amber-50/90",
                              !isSpacer &&
                                (row.isAnnexHeader
                                  ? "hover:[&>td]:bg-amber-100/85 hover:[&>td:first-child]:bg-amber-100/85"
                                  : "hover:[&>td]:bg-slate-50/90 hover:[&>td:first-child]:bg-slate-50/90"),
                            )
                          : cn(
                              annexSubtotalDarkNumbers && "bg-white",
                              nextRowIsSubtotal ? "border-slate-900 border-b-2" : "border-slate-200",
                              row.isAnnexHeader && "bg-amber-50/90",
                              !isSpacer &&
                                (row.isAnnexHeader ? "hover:bg-amber-100/85" : "hover:bg-slate-50/90"),
                            ),
                      canExpand && "cursor-pointer",
                    )}
                    onClick={() => canExpand && toggleRow(row.rowId!)}
                  >
                    <td
                      className={cn(
                        embedYearsFitTable
                          ? "min-w-[16rem] py-2 pr-3 text-sm text-[#2A2F3A]"
                          : "min-w-[20rem] px-6 py-3",
                        annexSubtotalDarkNumbers ? "font-bold" : "",
                        row.isBold || row.isSubtotal
                          ? embedYearsFitTable
                            ? "font-semibold"
                            : "font-bold text-slate-900"
                          : embedYearsFitTable
                            ? "font-normal"
                            : "text-slate-700",
                        row.indent ? (embedYearsFitTable ? "pl-6" : "pl-12") : "",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {row.isAnnexPlaceholder ? (
                          <span className="flex-1" aria-hidden />
                        ) : row.isAnnexSubtotal ? (
                          <span
                            className="flex-1"
                            aria-label={displayLabel}
                            data-testid={
                              annexSubtotalLetter
                                ? `capex-annex-subtotal-${annexSubtotalLetter}`
                                : "capex-annex-subtotal"
                            }
                          />
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
                            <span className="flex-1">{displayLabel}</span>
                          </>
                        )}
                        {row.rowId && isNoteAllowed() && !row.isAnnexPlaceholder && !row.isAnnexSubtotal && !row.isAnnexTitle && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedRowId(row.rowId!)
                              setSelectedRowLabel(displayLabel)
                              setSelectedRowFinancialData({
                                currentAmount: row.current !== 0 ? row.current : null,
                                priorAmount: row.prior !== 0 ? row.prior : null,
                              })
                              setNoteModalOpen(true)
                            }}
                            className={cn(
                              "flex-shrink-0 p-1.5 rounded-md transition-colors",
                              hasNote
                                ? "text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            )}
                            title={hasNote ? "Voir/Modifier la note" : "Ajouter une note"}
                          >
                            <StickyNote className={cn("w-4 h-4", hasNote && "fill-current")} />
                          </button>
                        )}
                      </div>
                    </td>

                    {effectiveView === "years" && isForecastSection && (
                      <>
                        <td
                          className={cn(
                            embedYearsFitTable
                              ? "min-w-[5.5rem] px-2 py-2 text-center text-[11px] text-[#2A2F3A]"
                              : "min-w-[7.5rem] px-3 py-3 text-center text-slate-700",
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {hideCapexCodeRateCells ? (
                            "-"
                          ) : row.rowId ? (
                            renderAmortizationLinkCodeCell(row.rowId, row.linkCode)
                          ) : (
                            "-"
                          )}
                        </td>
                        <td
                          className={cn(
                            embedYearsFitTable
                              ? "min-w-[5rem] px-2 py-2 text-center text-[11px] text-[#2A2F3A]"
                              : "min-w-[6.5rem] px-4 py-3 text-center text-slate-700",
                            row.rowId && !hideCapexCodeRateCells && "cursor-pointer hover:bg-slate-50/90",
                            capexHypothesisPanelOpen &&
                              editingAdjustment?.rowId === row.rowId &&
                              capexHypothesisMode === "rate" &&
                              (embedYearsFitTable
                                ? "z-[1] bg-[#E0742D]/10 shadow-[inset_0_0_0_1.5px_#E0742D]"
                                : "z-[1] bg-orange-50/50 shadow-[inset_0_0_0_2px_rgb(224,116,45)]"),
                          )}
                          onClick={() => {
                            if (row.rowId && !hideCapexCodeRateCells) {
                              openCapexHypothesisPanel(
                                row.rowId,
                                CAPEX_HYPOTHESIS_RATE_YEAR_INDEX,
                                "rate",
                                displayLabel,
                              )
                            }
                          }}
                        >
                          {hideCapexCodeRateCells ? (
                            "-"
                          ) : row.rowId ? (
                            renderDepreciationRateCell(row.rowId, displayLabel)
                          ) : (
                            "-"
                          )}
                        </td>
                      </>
                    )}

                    {effectiveView === "years" && row.trendValues && (
                      <>
                        {row.trendValues.map((value, valueIdx) => {
                          const leafChildren = capexLeafChildrenOfParent(data, row)
                          const actualValue =
                            isForecastSection && row.rowId && leafChildren.length === 0
                              ? displayedCapexAmount(
                                  row.rowId,
                                  valueIdx,
                                  value,
                                  row.trendValues,
                                  displayLabel,
                                )
                              : value
                          
                          const canHaveAdjustment =
                            isCapexProjectionCell && isForecastProjectedColumn(valueIdx)
                          const cellConfigYear = forecastDisplayToConfigYearIndex(
                            valueIdx,
                            forecastActualCols,
                          )
                          const hasSavedAdjustment =
                            canHaveAdjustment &&
                            cellConfigYear != null &&
                            (leafChildren.length > 0
                              ? leafChildren.some(
                                  (leaf) =>
                                    !!leaf.rowId &&
                                    getAdjustments(leaf.rowId, cellConfigYear).some(
                                      isCapexHypothesisGrowthAdjustment,
                                    ),
                                )
                              : !!row.rowId &&
                                getAdjustments(row.rowId, cellConfigYear).some(
                                  isCapexHypothesisGrowthAdjustment,
                                ))
                          const modeCellAmount =
                            isForecastSection && capexAmountViewMode !== "bookValue"
                              ? resolveCapexModeCellAmount(
                                  row,
                                  data,
                                  valueIdx,
                                  capexAmountViewMode,
                                )
                              : null
                          const savedAddition =
                            hasSavedAdjustment && cellConfigYear != null
                              ? (resolveCapexModeCellAmount(
                                  row,
                                  data,
                                  valueIdx,
                                  "adjustments",
                                ) ?? 0)
                              : 0
                          const isCellSelected =
                            isCapexHypothesisSelected &&
                            forecastConfigToDisplayYearIndex(
                              editingAdjustment?.yearIndex ?? -1,
                              forecastActualCols,
                            ) === valueIdx
                          
                          const previousValue = valueIdx > 0 && row.trendValues 
                            ? (isForecastSection && row.rowId 
                                ? displayedCapexAmount(
                                    row.rowId,
                                    valueIdx - 1,
                                    row.trendValues[valueIdx - 1],
                                    row.trendValues,
                                    displayLabel,
                                  )
                                : row.trendValues[valueIdx - 1])
                            : null
                          
                          let displayValue: string | number = actualValue
                          let growthRate: number | null = null
                          if (
                            isForecastSection &&
                            (capexAmountViewMode === "adjustments" ||
                              capexAmountViewMode === "depreciation")
                          ) {
                            displayValue =
                              modeCellAmount != null && modeCellAmount !== 0
                                ? formatCurrency(modeCellAmount)
                                : "-"
                          } else if (showGrowthRate && isForecastSection && valueIdx > 0 && previousValue !== null) {
                            if (previousValue !== 0) {
                              growthRate = calculateVariation(actualValue, previousValue)
                              displayValue = growthRate !== null ? `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(1)}%` : "-"
                            } else {
                              displayValue = "-"
                            }
                          } else if (showGrowthRate && isForecastSection && isForecastHistoricalColumn(valueIdx)) {
                            displayValue = "-"
                          }
                          
                          return (
                            <td
                              key={valueIdx}
                              className={cn(
                                embedYearsFitTable
                                  ? cn(
                                      "min-w-[8.5rem] px-2 py-2 text-right font-mono text-[11px] whitespace-nowrap tabular-nums text-[#2A2F3A]",
                                      (row.isBold || row.isSubtotal) && "font-semibold",
                                    )
                                  : cn(
                                      "min-w-[8rem] px-4 py-3 text-right",
                                      row.isBold ? "font-semibold font-bold" : "text-slate-500",
                                    ),
                                shouldHideAmounts ? "text-transparent" : "",
                                isForecastHistoricalColumn(valueIdx)
                                  ? "bg-slate-50 text-slate-400"
                                  : "",
                                canHaveAdjustment &&
                                  (embedYearsFitTable
                                    ? "cursor-pointer hover:bg-slate-50/60"
                                    : "cursor-pointer hover:bg-slate-50/90"),
                                isCellSelected &&
                                  (embedYearsFitTable
                                    ? "z-[1] bg-blue-50/40 shadow-[inset_0_0_0_1.5px_rgb(59,130,246)]"
                                    : "z-[1] bg-blue-50/50 shadow-[inset_0_0_0_2px_rgb(59,130,246)]"),
                                annexSubtotalDarkNumbers && "text-slate-900",
                                showGrowthRate && isForecastSection && valueIdx > 0 && !shouldHideAmounts && typeof displayValue === "string" && displayValue.includes("%") && growthRate !== null && growthRate >= 0 ? "text-emerald-600 font-semibold" : "",
                                showGrowthRate && isForecastSection && valueIdx > 0 && !shouldHideAmounts && typeof displayValue === "string" && displayValue.includes("%") && growthRate !== null && growthRate < 0 ? "text-red-600 font-semibold" : ""
                              )}
                              title={
                                hasSavedAdjustment
                                  ? `Ajustement : ${formatCurrency(savedAddition)} ajouté au coût`
                                  : undefined
                              }
                              data-capex-adjusted={hasSavedAdjustment ? "true" : undefined}
                              onClick={() => {
                                if (canHaveAdjustment && row.rowId) {
                                  const cfg = forecastDisplayToConfigYearIndex(valueIdx, forecastActualCols)
                                  if (cfg != null) {
                                    openCapexHypothesisPanel(
                                      row.rowId,
                                      cfg,
                                      "adjustment",
                                      displayLabel,
                                    )
                                  }
                                }
                              }}
                            >
                              {shouldHideAmounts ? (
                                "-"
                              ) : (
                                <span className="inline-flex items-center justify-end gap-1.5">
                                  {hasSavedAdjustment && capexAmountViewMode !== "depreciation" ? (
                                    <span
                                      data-testid="capex-adjustment-marker"
                                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500"
                                      aria-label="Ajustement"
                                    />
                                  ) : null}
                                  <span>
                                    {isForecastSection &&
                                    (capexAmountViewMode === "adjustments" ||
                                      capexAmountViewMode === "depreciation")
                                      ? displayValue
                                      : showGrowthRate && isForecastSection
                                        ? displayValue
                                        : actualValue !== 0
                                          ? formatCurrency(actualValue)
                                          : "-"}
                                  </span>
                                </span>
                              )}
                            </td>
                          )
                        })}
                      </>
                    )}
                    {effectiveView === "years" && !row.trendValues && (
                      <>
                        {Array.from({ length: isForecastSection && effectiveView === "years" ? forecastYearCount : 6 }).map((_, idx) => (
                          <td 
                            key={idx} 
                            className={cn(
                              "min-w-[8rem] px-4 py-3 text-right text-transparent",
                              isForecastHistoricalColumn(idx) ? "bg-slate-50" : ""
                            )}
                          >
                            -
                          </td>
                        ))}
                      </>
                    )}
                  </tr>
                  {capexHypothesisInlineActive &&
                    capexHypothesisAnchorIdx === idx &&
                    capexHypothesisAnchorIdx >= 0 &&
                    editingAdjustment && (
                      <tr
                        key={`capex-hypothesis-inline-${editingAdjustment.rowId}-${editingAdjustment.yearIndex}`}
                        className={cn(
                          forecastTableStickyScroll
                            ? "[&>td]:border-b-2 [&>td]:border-blue-200/90 [&>td]:bg-slate-50/95"
                            : "border-b-2 border-blue-200/90 bg-slate-50/95",
                        )}
                      >
                        <td
                          colSpan={forecastTableColumnCount}
                          className="min-w-0 p-0 align-top"
                        >
                          <div className="min-w-0 max-w-full overflow-x-auto px-3 py-3 sm:px-5 sm:py-4">
                            {renderCapexHypothesisPanel(true)}
                          </div>
                        </td>
                      </tr>
                    )}
                  {/* Expanded balance accounts */}
                  {canExpand && isExpanded && row.balanceAccounts && row.balanceAccounts.length > 0 && (
                    <>
                      {row.balanceAccounts.map((account, accIdx) => (
                        <tr
                          key={`${idx}-account-${accIdx}`}
                          className={cn(
                            forecastTableStickyScroll
                              ? "[&>td]:bg-slate-50"
                              : "bg-slate-50 border-b border-slate-200",
                          )}
                        >
                          <td
                            className={cn(
                              "px-6 py-2 text-slate-600 pl-20",
                              forecastTableStickyScroll && "bg-slate-50",
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono text-slate-500">{account.accountNumber}</span>
                              <span className="text-sm">{account.accountName}</span>
                            </div>
                          </td>
                          {/* Depreciation Rate Column for balance accounts - NO gray background */}
                          {effectiveView === "years" && isForecastSection && (
                            <td className="min-w-[6.5rem] px-4 py-2 text-center text-slate-700 text-sm">-</td>
                          )}
                          {effectiveView === "years" && (
                            <>
                              {row.trendValues && row.trendValues.map((_, valueIdx) => {
                                const glConfigYear = forecastDisplayToConfigYearIndex(
                                  valueIdx,
                                  forecastActualCols,
                                )
                                const glHasAdjustment =
                                  isForecastSection &&
                                  !!row.rowId &&
                                  isForecastProjectedColumn(valueIdx) &&
                                  glConfigYear != null &&
                                  getAdjustments(row.rowId, glConfigYear).some(
                                    isCapexHypothesisGrowthAdjustment,
                                  )
                                const glAddition =
                                  glHasAdjustment && row.rowId && glConfigYear != null
                                    ? getCapexAdditionsValue(row.rowId, glConfigYear)
                                    : 0
                                const accountValue = account.proportion
                                  ? capexAmountViewMode === "adjustments" && isForecastSection
                                    ? glHasAdjustment
                                      ? glAddition * account.proportion
                                      : 0
                                    : capexAmountViewMode === "depreciation" && isForecastSection
                                      ? 0
                                      : isForecastSection && row.rowId
                                      ? displayedCapexAmount(
                                          row.rowId,
                                          valueIdx,
                                          row.trendValues![valueIdx],
                                          row.trendValues,
                                          displayLabel,
                                        ) * account.proportion
                                      : row.trendValues![valueIdx] * account.proportion
                                  : 0

                                const previousValue = valueIdx > 0 && row.trendValues
                                  ? (isForecastSection && row.rowId
                                      ? displayedCapexAmount(
                                          row.rowId,
                                          valueIdx - 1,
                                          row.trendValues[valueIdx - 1],
                                          row.trendValues,
                                          displayLabel,
                                        ) * (account.proportion || 1)
                                      : row.trendValues[valueIdx - 1] * (account.proportion || 1))
                                  : null

                                let displayValue: string | number = accountValue
                                let growthRate: number | null = null
                                if (
                                  isForecastSection &&
                                  (capexAmountViewMode === "adjustments" ||
                                    capexAmountViewMode === "depreciation")
                                ) {
                                  displayValue =
                                    capexAmountViewMode === "adjustments" &&
                                    glHasAdjustment &&
                                    accountValue !== 0
                                      ? formatCurrency(Math.round(accountValue))
                                      : "-"
                                } else if (showGrowthRate && isForecastSection && valueIdx > 0 && previousValue !== null) {
                                  if (previousValue !== 0) {
                                    growthRate = calculateVariation(accountValue, previousValue)
                                    displayValue = growthRate !== null ? `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(1)}%` : "-"
                                  } else {
                                    displayValue = "-"
                                  }
                                } else if (showGrowthRate && isForecastSection && isForecastHistoricalColumn(valueIdx)) {
                                  displayValue = "-"
                                }
                                
                                return (
                                  <td
                                    key={valueIdx}
                                    className={cn(
                                      "min-w-[8rem] px-4 py-2 text-right text-sm font-semibold",
                                      isForecastHistoricalColumn(valueIdx) ? "bg-slate-50 text-slate-700" : "text-slate-700",
                                      showGrowthRate && isForecastSection && valueIdx > 0 && typeof displayValue === "string" && displayValue.includes("%") && growthRate !== null && growthRate >= 0 ? "text-emerald-600 font-semibold" : "",
                                      showGrowthRate && isForecastSection && valueIdx > 0 && typeof displayValue === "string" && displayValue.includes("%") && growthRate !== null && growthRate < 0 ? "text-red-600 font-semibold" : ""
                                    )}
                                  >
                                    {isForecastSection &&
                                    (capexAmountViewMode === "adjustments" ||
                                      capexAmountViewMode === "depreciation")
                                      ? displayValue
                                      : showGrowthRate && isForecastSection
                                        ? displayValue
                                        : (accountValue !== 0 ? formatCurrency(Math.round(accountValue)) : "-")}
                                  </td>
                                )
                              })}
                              {!row.trendValues && (
                                <>
                                  {isForecastSection && (
                                    <td className="min-w-[6.5rem] px-4 py-2 text-center text-slate-700 text-sm">-</td>
                                  )}
                                  {Array.from({ length: isForecastSection && effectiveView === "years" ? forecastYearCount : 6 }).map((_, idx) => (
                                    <td 
                                      key={idx} 
                                      className={cn(
                                        "min-w-[8rem] px-4 py-2 text-right text-sm text-white",
                                        isForecastHistoricalColumn(idx) ? "bg-slate-50" : ""
                                      )}
                                    >
                                      -
                                    </td>
                                  ))}
                                </>
                              )}
                            </>
                          )}
                        </tr>
                      ))}
                    </>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Note Modal */}
      <NoteModal
        isOpen={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        rowId={selectedRowId || ""}
        rowLabel={selectedRowLabel}
        page="capex"
        period={effectivePeriod}
        view={effectiveView}
        companyId={companyId}
        divisionId={divisionId}
        subDivisionId={subDivisionId}
        currentAmount={selectedRowFinancialData.currentAmount}
        priorAmount={selectedRowFinancialData.priorAmount}
        onSave={() => {
          setNotesUpdated((prev) => prev + 1)
        }}
      />

      </div>
    </div>
  )
}

