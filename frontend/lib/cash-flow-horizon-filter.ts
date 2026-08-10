import { isCashFlowFormulaAggregationRow } from "@/lib/cash-flow-detail-settings"
import {
  isCashFlowFixedTreasuryStructureRow,
  isCashFlowNetVariationStructureRow,
} from "@/lib/cash-flow-treasury-rows"
import {
  type IncomeStatementHorizonView,
  rowHasNonZeroAmountsForHorizon,
  type HorizonDisplayAmounts,
} from "@/lib/income-statement-horizon-visibility"
import { isCodeMappingEnabled } from "@/lib/income-statement-structure-utils"

const EPSILON = 1e-9

function isEffectivelyZero(n: number | undefined | null): boolean {
  return !Number.isFinite(Number(n)) || Math.abs(Number(n)) < EPSILON
}

export interface CashFlowDetailRowForHorizonFilter {
  label: string
  current?: number
  prior?: number
  trendValues?: number[]
  isSection?: boolean
  isSubtotal?: boolean
  hasLiaisonCode?: boolean
  rowId?: string
  balanceAccounts?: Array<{
    amount?: number
    priorAmount?: number
    trendValues?: number[]
  }>
}

function detailRowAmounts(row: CashFlowDetailRowForHorizonFilter): HorizonDisplayAmounts {
  return {
    current: row.current ?? 0,
    prior: row.prior ?? 0,
    trendValues: row.trendValues,
  }
}

/** Lignes toujours visibles (intercalaires, totaux, trésorerie fixe, formules). */
export function isStructuralCashFlowRowAlwaysVisible(
  row: CashFlowDetailRowForHorizonFilter,
  structRow?: Record<string, unknown>,
): boolean {
  if (!String(row.label ?? "").trim()) return true
  if (row.isSection) return true
  if (row.isSubtotal) return true
  if (structRow && isCashFlowFixedTreasuryStructureRow(structRow)) return true
  if (structRow && isCashFlowNetVariationStructureRow(structRow)) return true
  if (structRow && isCashFlowFormulaAggregationRow(structRow)) return true
  return false
}

function rowQualifiesForHorizonHiding(
  row: CashFlowDetailRowForHorizonFilter,
  structRow: Record<string, unknown> | undefined,
): boolean {
  if (isStructuralCashFlowRowAlwaysVisible(row, structRow)) return false
  if (row.hasLiaisonCode) return true
  if (structRow && String(structRow.linkCode ?? "").trim()) return true
  if (structRow && isCodeMappingEnabled(structRow)) return true
  return false
}

function balanceAccountsHaveNonZeroAmounts(
  accounts: CashFlowDetailRowForHorizonFilter["balanceAccounts"],
  view: IncomeStatementHorizonView,
): boolean {
  if (!accounts?.length) return false
  for (const account of accounts) {
    if (view === "12months" || view === "24months" || view === "quarters" || view === "years") {
      if (account.trendValues?.some((value) => !isEffectivelyZero(value))) return true
      continue
    }
    if (view === "comparison" || view === "ytd" || view === "ddm") {
      if (!isEffectivelyZero(account.amount) || !isEffectivelyZero(account.priorAmount)) return true
      continue
    }
    if (!isEffectivelyZero(account.amount)) return true
  }
  return false
}

export function shouldKeepCashFlowDetailRowForHorizon(
  row: CashFlowDetailRowForHorizonFilter,
  structRow: Record<string, unknown> | undefined,
  view: IncomeStatementHorizonView,
): boolean {
  if (!rowQualifiesForHorizonHiding(row, structRow)) return true
  if (balanceAccountsHaveNonZeroAmounts(row.balanceAccounts, view)) return true
  return rowHasNonZeroAmountsForHorizon(detailRowAmounts(row), view)
}

/**
 * Filtre Détail trésorerie : masque les postes liaison à 0 $ sans comptes GL pour l’horizon affiché.
 * Conserve l’alignement avec la structure Paramètres (même ordre, indices parallèles).
 */
export function filterCashFlowDetailRowsWithStructureForHorizon<
  T extends CashFlowDetailRowForHorizonFilter,
>(
  rows: T[],
  presentationStructure: Record<string, unknown>[],
  view: IncomeStatementHorizonView,
): { rows: T[]; presentationStructure: Record<string, unknown>[] } {
  if (!presentationStructure.length) {
    return { rows, presentationStructure }
  }

  const keptRows: T[] = []
  const keptStructure: Record<string, unknown>[] = []
  const len = Math.min(rows.length, presentationStructure.length)

  for (let i = 0; i < len; i++) {
    const row = rows[i]!
    const structRow = presentationStructure[i]!
    if (shouldKeepCashFlowDetailRowForHorizon(row, structRow, view)) {
      keptRows.push(row)
      keptStructure.push(structRow)
    }
  }

  for (let i = len; i < rows.length; i++) {
    keptRows.push(rows[i]!)
  }

  return { rows: keptRows, presentationStructure: keptStructure }
}
