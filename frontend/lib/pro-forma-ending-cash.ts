/**
 * Builder unique des lignes CF pro forma (vue années) — partagé par CashFlowDetail
 * et Hypothèses Bilan (Encaisse / Découvert ← Trésorerie à la fin).
 */

import {
  applyProFormaVariationFromBilanBalances,
  applyProFormaCapexAdditionsToTrend,
  buildProFormaDividendPaymentTrend,
  buildProjectedIsDrivenConfigTrend,
  carryForwardBilanBalancesWithoutProjection,
  isCashFlowDividendPaymentRow,
  isCashFlowIsDrivenActualRow,
  isCashFlowNetIncomeRow,
  isCashFlowWorkingCapitalVariationRow,
  mergeProjectedAmountsOntoDisplayTrend,
  mergeSeriesSnapshotsIntoBilanBalanceTrend,
  preserveForecastActualColumnsFromBase,
  resolveAttachedLinkCodesForStructureRow,
} from "@/lib/pro-forma-cash-flow-inject"
import {
  applyCashFlowFixedTreasuryRows,
  buildBeginningCashTrendForView,
  buildNetCashByPeriodKey,
  chainProFormaBeginningCashTrend,
  isCashFlowEndingCashStructureRow,
  isCashFlowFixedTreasuryStructureRow,
  isCashFlowNetVariationStructureRow,
} from "@/lib/cash-flow-treasury-rows"
import {
  applyCashFlowActualYearTTMToRow,
  applyCashFlowCalcToPoint,
  applyCashFlowCalcToTrend,
  buildCashFlowCalcModeByCode,
  buildCashFlowTinDisplayModeByCode,
  detailRowToOperandSnapshot,
  isCashFlowFormulaAggregationRow,
  readRowCashFlowCalcMode,
  readRowCashFlowTinDisplayMode,
  reconcileCashFlowSectionTotalsFromStructure,
  reconcileDetailRowTotalsFromGlAccounts,
  resolveCashFlowFormulaTrendValuesFromProcessed,
  shouldReconcileCashFlowDetailRowFromGlAccounts,
  type CashFlowCalcMode,
  type CashFlowCalcTrendContext,
  type CashFlowDisplayAmountRow,
  type CashFlowOperandSnapshot,
  type CashFlowTinDisplayMode,
} from "@/lib/cash-flow-detail-settings"
import { structureRowHasFormulaLiaison } from "@/lib/balance-sheet-summary-expand"
import {
  detailLineLabelForDisplay,
  findStatementApiRowForStructureRow,
  isCodeMappingEnabled,
  isTruthySeparatorAbove,
  listStructureRowsForPresentationDisplay,
  normalizeLiaisonMode,
} from "@/lib/income-statement-structure-utils"
import { buildAmountsByCalendarMonth } from "@/lib/series-reference-columns"
import {
  forecastActualSnapshotDates,
  forecastCashFlowYearTrend,
  forecastDisplayYearCount,
  forecastTrendFromActualPrefix,
  type ForecastActualLayout,
} from "@/lib/pro-forma-forecast-columns"
import type { SeriesDetailRow, SeriesPeriod, SeriesRow } from "@/lib/api"

export type ProFormaEndingCashProjectedApi = {
  forecastActualCols: number
  attachedByCfCode: Map<string, string[]>
  netIncomeByConfigYear: number[] | null | undefined
  resolveDepreciationExpense: (isLinkCode: string, configYearIndex: number) => number
  resolveInterestExpense: (isLinkCode: string, configYearIndex: number) => number
  bilanBalanceTrendForAttachedCodes: (attachedLinkCodes: string[]) => number[]
  attachedCodesHaveExplicitProjection: (attachedLinkCodes: string[]) => boolean[]
  attachedCodesIncludeTaxExigible: (attachedLinkCodes: string[]) => boolean
  capexAdditionsByConfigYearForAttachedCodes: (
    attachedLinkCodes: string[],
  ) => number[] | null
  dividendsForDisplayYear: (displayYearIndex: number) => number
}

export type ProFormaCashFlowLeafRow = CashFlowDisplayAmountRow & {
  label: string
  isBold?: boolean
  isSubtotal?: boolean
  isSection?: boolean
  separatorAbove?: boolean
  rowId?: string
  hasLiaisonCode?: boolean
  balanceAccounts?: Array<{
    accountNumber: string
    accountName: string
    amount: number
    priorAmount?: number
    trendValues?: number[]
    amountByCalendarMonth?: Map<string, number>
  }>
}

function seriesDetailToGlAccounts(
  detailRows: SeriesDetailRow[] | undefined,
  periods: SeriesPeriod[],
  forecastActualLayout: ForecastActualLayout,
  refMonth: number,
  refYear: number,
  fiscalYearEndMonth: number,
  projectionYears: number,
  forecastBaseYear: number,
): ProFormaCashFlowLeafRow["balanceAccounts"] {
  if (!detailRows?.length) return undefined
  return detailRows.map((dr) => {
    const pseudoRow: SeriesRow = {
      id: dr.id,
      label: dr.label,
      isBold: false,
      isSection: false,
      isResult: false,
      amounts: dr.amounts,
      detailRows: [],
    }
    const values = forecastCashFlowYearTrend(
      forecastActualLayout,
      pseudoRow,
      periods,
      refMonth,
      refYear,
      fiscalYearEndMonth,
      projectionYears,
      forecastBaseYear,
    )
    return {
      accountNumber: dr.id,
      accountName: dr.label,
      amount: values[0] || 0,
      priorAmount: values.length >= 2 ? values[1] || 0 : 0,
      trendValues: values,
      amountByCalendarMonth: buildAmountsByCalendarMonth(pseudoRow, periods),
    }
  })
}

function applyCalcModeToLeaf(
  row: ProFormaCashFlowLeafRow,
  mode: CashFlowCalcMode,
  calcContext: CashFlowCalcTrendContext,
  amountByCalendarMonth?: Map<string, number>,
): ProFormaCashFlowLeafRow {
  if (!row.hasLiaisonCode || row.isSection) return row
  if (mode === "actual") {
    return applyCashFlowActualYearTTMToRow(row, calcContext, amountByCalendarMonth)
  }

  const balanceAccounts = row.balanceAccounts?.map((account) => {
    const accountPoint = applyCashFlowCalcToPoint(account.amount, account.priorAmount ?? 0, mode)
    const accountTrend =
      account.trendValues != null
        ? applyCashFlowCalcToTrend(
            account.trendValues,
            calcContext.trendLabels,
            mode,
            account.amountByCalendarMonth,
            calcContext.trendView,
            calcContext.comparisonAnchor,
            calcContext.fiscalYearEndMonth,
            calcContext.periodBasis,
            calcContext.forecastRefMonth,
          )
        : account.trendValues
    return {
      ...account,
      amount: accountPoint.current,
      priorAmount: accountPoint.prior,
      trendValues: accountTrend,
    }
  })

  if (balanceAccounts?.length && shouldReconcileCashFlowDetailRowFromGlAccounts(mode)) {
    return reconcileDetailRowTotalsFromGlAccounts({
      ...row,
      balanceAccounts,
    })
  }

  const point = applyCashFlowCalcToPoint(row.current, row.prior, mode)
  const trendValues =
    row.trendValues != null
      ? applyCashFlowCalcToTrend(
          row.trendValues,
          calcContext.trendLabels,
          mode,
          amountByCalendarMonth,
          calcContext.trendView,
          calcContext.comparisonAnchor,
          calcContext.fiscalYearEndMonth,
          calcContext.periodBasis,
          calcContext.forecastRefMonth,
        )
      : row.trendValues
  return {
    ...row,
    current: point.current,
    prior: point.prior,
    trendValues,
    ...(balanceAccounts ? { balanceAccounts } : {}),
  }
}

export type BuildProFormaCashFlowYearRowsParams = {
  structure: Record<string, unknown>[]
  cfSeriesRows: SeriesRow[]
  cfPeriods: SeriesPeriod[]
  /** Série TIN « Coût » (altAssetCostOnly) — même source que CashFlowDetail. */
  costSeriesRows?: SeriesRow[]
  bsSeriesRows: SeriesRow[]
  trendLabels: string[]
  forecastActualLayout: ForecastActualLayout
  forecastActualCols: number
  projectionYears: number
  refMonth: number
  refYear: number
  fiscalYearEndMonth: number
  forecastBaseYear: number
  projected: ProFormaEndingCashProjectedApi
}

/**
 * Lignes CF pro forma (années) + trend Trésorerie à la fin — source unique CF ↔ Encaisse.
 */
export function buildProFormaCashFlowYearRows(params: BuildProFormaCashFlowYearRowsParams): {
  rows: ProFormaCashFlowLeafRow[]
  displayRows: Record<string, unknown>[]
  endingCashTrend: number[]
} {
  const {
    structure,
    cfSeriesRows,
    cfPeriods,
    costSeriesRows,
    bsSeriesRows,
    trendLabels,
    forecastActualLayout,
    forecastActualCols,
    projectionYears,
    refMonth,
    refYear,
    fiscalYearEndMonth,
    forecastBaseYear,
    projected,
  } = params

  const displayYearCount = forecastDisplayYearCount(projectionYears, forecastActualLayout)
  const emptyTrend = () => Array.from({ length: displayYearCount }, () => 0)

  if (!structure.length || !trendLabels.length) {
    return { rows: [], displayRows: [], endingCashTrend: emptyTrend() }
  }

  const displayRows = listStructureRowsForPresentationDisplay(structure)
  const calcModeByCode = buildCashFlowCalcModeByCode(structure)
  const tinDisplayModeByCode = buildCashFlowTinDisplayModeByCode(structure)
  const calcContext: CashFlowCalcTrendContext = {
    trendView: "years",
    trendLabels,
    fiscalYearEndMonth,
    periodBasis: "current",
    forecastRefMonth: refMonth,
  }

  const buildTrendMap = (rows: SeriesRow[]) => {
    const map = new Map<string, number[]>()
    for (const row of rows) {
      map.set(
        String(row.id),
        forecastCashFlowYearTrend(
          forecastActualLayout,
          row,
          cfPeriods,
          refMonth,
          refYear,
          fiscalYearEndMonth,
          projectionYears,
          forecastBaseYear,
        ),
      )
    }
    return map
  }

  const seriesByRowId = new Map(cfSeriesRows.map((r) => [String(r.id), r]))
  const trendByRowId = buildTrendMap(cfSeriesRows)
  const costSeriesByRowId = costSeriesRows?.length
    ? new Map(costSeriesRows.map((r) => [String(r.id), r]))
    : undefined
  const costTrendByRowId = costSeriesRows?.length ? buildTrendMap(costSeriesRows) : undefined

  const usedIndices = new Set<number>()
  const usedNestedIds = new Set<string>()

  const pickTinApiRow = (
    sr: Record<string, unknown>,
    tinMode: CashFlowTinDisplayMode,
    bindIndices: Set<number>,
    bindNested: Set<string>,
  ): SeriesRow | undefined => {
    // Même binding que CashFlowDetail (indices partagés coût / réel).
    if (tinMode === "cost" && costSeriesRows?.length) {
      return findStatementApiRowForStructureRow(sr, costSeriesRows, bindIndices, bindNested)
    }
    return findStatementApiRowForStructureRow(sr, cfSeriesRows, bindIndices, bindNested)
  }

  const buildLeaf = (
    sr: Record<string, unknown>,
    bindIndices: Set<number> = usedIndices,
    bindNestedIds: Set<string> = usedNestedIds,
  ): ProFormaCashFlowLeafRow => {
    const code = String(sr.linkCode ?? "").trim()
    const tinMode: CashFlowTinDisplayMode =
      tinDisplayModeByCode.get(code) ?? readRowCashFlowTinDisplayMode(sr)
    const apiRow = pickTinApiRow(sr, tinMode, bindIndices, bindNestedIds)
    const seriesRow =
      apiRow?.id != null
        ? tinMode === "cost" && costSeriesByRowId
          ? costSeriesByRowId.get(String(apiRow.id))
          : seriesByRowId.get(String(apiRow.id))
        : undefined
    const trendValues =
      apiRow?.id != null
        ? tinMode === "cost" && costTrendByRowId
          ? costTrendByRowId.get(String(apiRow.id))
          : trendByRowId.get(String(apiRow.id))
        : undefined
    const calendar =
      seriesRow && cfPeriods.length
        ? buildAmountsByCalendarMonth(seriesRow, cfPeriods)
        : undefined

    const calcMode = readRowCashFlowCalcMode(sr) || calcModeByCode.get(code) || "actual"
    const attached = resolveAttachedLinkCodesForStructureRow(sr, projected.attachedByCfCode)
    const label = detailLineLabelForDisplay(sr, String(apiRow?.label ?? ""))
    const isNi = isCashFlowNetIncomeRow({
      label,
      linkCode: code,
      attachedLinkCodes: attached,
    })
    const isIsDriven = isCashFlowIsDrivenActualRow({
      label,
      attachedLinkCodes: attached,
      calcMode,
    })

    const balanceAccounts = !structureRowHasFormulaLiaison(sr)
      ? seriesDetailToGlAccounts(
          seriesRow?.detailRows,
          cfPeriods,
          forecastActualLayout,
          refMonth,
          refYear,
          fiscalYearEndMonth,
          projectionYears,
          forecastBaseYear,
        )
      : undefined

    let detail: ProFormaCashFlowLeafRow = {
      label,
      current: trendValues?.[0] ?? 0,
      prior: trendValues?.[1] ?? 0,
      trendValues,
      isBold: typeof sr.isBold === "boolean" ? sr.isBold : false,
      isSubtotal: sr.isResult === true,
      isSection: sr.isSection === true,
      separatorAbove: isTruthySeparatorAbove(sr.separatorAbove),
      rowId: String(sr.id ?? code),
      hasLiaisonCode: isCodeMappingEnabled(sr),
      balanceAccounts,
    }

    detail = applyCalcModeToLeaf(detail, calcMode, calcContext, calendar)

    if (isCashFlowWorkingCapitalVariationRow(calcMode)) {
      const balanceCodes = attached.length > 0 ? attached : code ? [code] : []
      const capexAdditions =
        projected.capexAdditionsByConfigYearForAttachedCodes(balanceCodes)
      if (capexAdditions) {
        const baseTrend =
          detail.trendValues ??
          Array.from({ length: forecastActualCols + projectionYears }, () => 0)
        const varied = applyProFormaCapexAdditionsToTrend({
          baseTrend,
          forecastActualCols,
          mode: calcMode,
          additionsByConfigYear: capexAdditions,
        })
        const merged = preserveForecastActualColumnsFromBase({
          baseTrend: detail.trendValues,
          overrideTrend: varied,
          forecastActualCols,
        })
        detail = {
          ...detail,
          trendValues: merged,
          current: merged[0] ?? detail.current,
          prior: merged[1] ?? detail.prior,
        }
      } else {
        let bilanTrend = projected.bilanBalanceTrendForAttachedCodes(balanceCodes)
        const isTaxExigible = projected.attachedCodesIncludeTaxExigible(balanceCodes)
        if (calendar && !isTaxExigible) {
          bilanTrend = mergeSeriesSnapshotsIntoBilanBalanceTrend({
            bilanBalanceByDisplayYear: bilanTrend,
            amountByCalendarMonth: calendar,
            trendLabels,
            forecastActualCols,
            fiscalYearEndMonth,
            forecastRefMonth: refMonth,
          })
        }
        if (!isTaxExigible) {
          bilanTrend = carryForwardBilanBalancesWithoutProjection({
            balances: bilanTrend,
            forecastActualCols,
            yearHasExplicitProjection:
              projected.attachedCodesHaveExplicitProjection(balanceCodes),
          })
        }
        const varied = applyProFormaVariationFromBilanBalances({
          mode: calcMode,
          bilanBalanceByDisplayYear: bilanTrend,
          forecastActualCols,
        })
        const merged = preserveForecastActualColumnsFromBase({
          baseTrend: detail.trendValues,
          overrideTrend: varied,
          forecastActualCols,
        })
        detail = {
          ...detail,
          trendValues: merged,
          current: merged[0] ?? detail.current,
          prior: merged[1] ?? detail.prior,
        }
      }
    }

    if (detail.trendValues && (isNi || isIsDriven)) {
      const configTrend = buildProjectedIsDrivenConfigTrend({
        projectionYears,
        attachedLinkCodes: attached,
        netIncomeByConfigYear: projected.netIncomeByConfigYear,
        resolveDepreciationExpense: projected.resolveDepreciationExpense,
        resolveInterestExpense: projected.resolveInterestExpense,
        forceNetIncome: isNi,
      })
      const merged = mergeProjectedAmountsOntoDisplayTrend(
        detail.trendValues,
        configTrend,
        forecastActualCols,
      )
      detail = {
        ...detail,
        trendValues: merged,
        current: merged[0] ?? detail.current,
        prior: merged[1] ?? detail.prior,
      }
    }

    if (
      isCashFlowDividendPaymentRow({
        label,
        linkCode: code,
        attachedLinkCodes: attached,
      })
    ) {
      const varied = buildProFormaDividendPaymentTrend({
        baseTrend: detail.trendValues,
        forecastActualCols,
        displayYearCount,
        dividendsForDisplayYear: projected.dividendsForDisplayYear,
      })
      const merged = preserveForecastActualColumnsFromBase({
        baseTrend: detail.trendValues,
        overrideTrend: varied,
        forecastActualCols,
      })
      detail = {
        ...detail,
        trendValues: merged,
        current: merged[0] ?? detail.current,
        prior: merged[1] ?? detail.prior,
      }
    }

    return detail
  }

  const leafRows: ProFormaCashFlowLeafRow[] = []
  for (const sr of displayRows) {
    if (isCashFlowFixedTreasuryStructureRow(sr) || isCashFlowFormulaAggregationRow(sr)) {
      leafRows.push({
        label: detailLineLabelForDisplay(sr, ""),
        current: 0,
        prior: 0,
        isBold: typeof sr.isBold === "boolean" ? sr.isBold : false,
        isSubtotal: sr.isResult === true,
        isSection: sr.isSection === true,
        separatorAbove: isTruthySeparatorAbove(sr.separatorAbove),
        rowId: String(sr.id ?? sr.linkCode ?? ""),
        hasLiaisonCode: isCashFlowFixedTreasuryStructureRow(sr)
          ? true
          : isCodeMappingEnabled(sr),
      })
      continue
    }
    leafRows.push(buildLeaf(sr))
  }

  const reconciledRows = reconcileCashFlowSectionTotalsFromStructure(leafRows, displayRows)

  const processedByCode = new Map<string, ProFormaCashFlowLeafRow>()
  for (let i = 0; i < displayRows.length; i++) {
    const sr = displayRows[i]!
    const code = String(sr.linkCode ?? "").trim()
    if (code && normalizeLiaisonMode(sr) === "single" && isCodeMappingEnabled(sr)) {
      processedByCode.set(code, reconciledRows[i]!)
    }
  }

  const resolveOperand = (code: string): CashFlowOperandSnapshot | undefined => {
    const fromStructure = processedByCode.get(code)
    if (fromStructure) return detailRowToOperandSnapshot(fromStructure)
    const structureMatch = displayRows.find(
      (sr) =>
        normalizeLiaisonMode(sr) === "single" &&
        isCodeMappingEnabled(sr) &&
        String(sr.linkCode ?? "").trim() === code,
    )
    return detailRowToOperandSnapshot(
      buildLeaf(
        structureMatch ?? {
          linkCode: code,
          liaisonMode: "single",
          defineMapping: true,
          label: code,
        },
        new Set<number>(),
        new Set<string>(),
      ),
    )
  }

  const withFormulas = displayRows.map((sr, index) => {
    if (!isCashFlowFormulaAggregationRow(sr)) return reconciledRows[index]!
    const shell = reconciledRows[index]!
    const trendValues = resolveCashFlowFormulaTrendValuesFromProcessed(
      sr,
      resolveOperand,
      calcContext,
    )
    return {
      ...shell,
      separatorAbove: isTruthySeparatorAbove(sr.separatorAbove),
      trendValues,
      current: trendValues[0] ?? 0,
      prior: trendValues[1] ?? 0,
    }
  })

  const netByPeriod = buildNetCashByPeriodKey(bsSeriesRows)
  const beginningTrendRaw = buildBeginningCashTrendForView(netByPeriod, cfPeriods, "years", {
    refMonth,
    refYear,
    columnDates: forecastActualSnapshotDates(
      forecastActualLayout,
      refMonth,
      refYear,
      fiscalYearEndMonth,
    ),
    periodBasis: "fiscal",
    fiscalYearEndMonth,
  })
  const beginningTrend = forecastTrendFromActualPrefix(
    beginningTrendRaw.slice(0, forecastActualCols),
    projectionYears,
  )

  const withTreasury = applyCashFlowFixedTreasuryRows(
    withFormulas,
    displayRows,
    { beginningTrend },
    { forecastActualCols },
  )

  let endingCashTrend = emptyTrend()
  const endingIndex = displayRows.findIndex(isCashFlowEndingCashStructureRow)
  if (endingIndex >= 0) {
    const ending = withTreasury[endingIndex]?.trendValues
    if (ending?.length) {
      endingCashTrend = Array.from({ length: displayYearCount }, (_, i) => ending[i] ?? 0)
    }
  } else {
    const variationIndex = displayRows.findIndex(isCashFlowNetVariationStructureRow)
    const variationTrend =
      variationIndex >= 0
        ? (withTreasury[variationIndex]?.trendValues ?? emptyTrend())
        : emptyTrend()
    const chainedBeginning = chainProFormaBeginningCashTrend({
      beginningTrend,
      variationTrend,
      forecastActualCols,
    })
    endingCashTrend = chainedBeginning.map((b, i) => b + (variationTrend[i] ?? 0))
  }

  return { rows: withTreasury, displayRows, endingCashTrend }
}

/** Trend « Trésorerie à la fin » — même builder que CashFlowDetail pro forma. */
export function computeProFormaEndingCashTrend(
  params: BuildProFormaCashFlowYearRowsParams,
): number[] {
  return buildProFormaCashFlowYearRows(params).endingCashTrend
}
