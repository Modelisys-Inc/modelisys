/**
 * Expand/collapse rules for balance-sheet summary rows:
 * - Annexe off → child rows are GL accounts (`balanceAccounts` / API detailRows)
 * - Annexe on  → child rows are link-code sub-lines (ACT-A.1, ACT-A.2, …), never GLs
 */

import type { FinancialStatementRow, SeriesRow, StandardLinkCode } from "@/lib/api"
import {
  CAP_C_CASH_FLOW_ROOT,
  getDetailSubLineCodesFromStandardLinkCode,
  isComputedNetIncomeLinkCode,
  NET_INCOME_BALANCE_LINK_CODE,
  standardLinkCodeDisplayLabel,
} from "@/lib/standard-link-code-utils"
import {
  findStructureRowForStatementLine,
  isStructureRowDetailOnly,
  isStructureRowEmptyLabel,
  normalizeAnnexLetter,
  normalizeLiaisonMode,
} from "@/lib/income-statement-structure-utils"
import {
  type IncomeStatementHorizonView,
  rowHasNonZeroAmountsForHorizon,
} from "@/lib/income-statement-horizon-visibility"

export type SummaryExpandChild = {
  code: string
  label: string
  amount: number
  priorAmount?: number
  trendValues?: number[]
}

export type SummaryExpandMode = "gl" | "annex" | "none"

function normId(v: unknown): string {
  return String(v ?? "").trim()
}

function findApiRowByCodeOrLabel<T extends { id?: string; label?: string; linkCode?: string }>(
  apiRows: T[],
  code: string,
  label: string,
): T | undefined {
  const codeNorm = normId(code)
  const labelNorm = label.trim().toLowerCase()
  if (codeNorm) {
    return apiRows.find((r) => {
      const id = normId(r.id)
      const link = normId(r.linkCode)
      return id === codeNorm || link === codeNorm
    })
  }
  if (labelNorm) {
    return apiRows.find((r) => String(r.label ?? "").trim().toLowerCase() === labelNorm)
  }
  return undefined
}

/** Whether this summary line should expand into annex link-code children (not GLs). */
export function summaryRowUsesAnnexExpand(
  structRow: Record<string, unknown> | null | undefined,
  opts?: { showInDetail?: boolean; annexLetter?: string },
): boolean {
  // Expand sommaire : uniquement si la case Annexe est explicitement cochée
  // (pas le repli « code de liaison actif » de isShowInDetail).
  if (structRow && !isStructureRowEmptyLabel(structRow)) {
    if (structRow.showInDetail === true) return true
    if (structRow.showInDetail === false) return false
    return !!normalizeAnnexLetter(String(structRow.annexLetter ?? ""))
  }
  if (opts?.showInDetail === true) return true
  if (opts?.showInDetail === false) return false
  return !!normalizeAnnexLetter(String(opts?.annexLetter ?? ""))
}

/** Resolve the structure row for a visible summary line. */
export function findSummaryStructureRow(
  rowId: string | undefined,
  label: string,
  structure: Record<string, unknown>[],
): Record<string, unknown> | undefined {
  if (!structure.length) return undefined
  return findStructureRowForStatementLine(rowId ?? "", label, structure)
}

/**
 * Collect annex child link-code rows for a parent summary line.
 * Prefers structure `detailOnly` siblings; falls back to standard chart descendants.
 */
export function collectAnnexChildExpandRows(params: {
  parentStructRow: Record<string, unknown>
  structure: Record<string, unknown>[]
  apiRows: Array<
    Pick<FinancialStatementRow, "id" | "label" | "current" | "prior" | "detailOnly"> & {
      linkCode?: string
    }
  >
  standardCodes?: StandardLinkCode[]
}): SummaryExpandChild[] {
  const { parentStructRow, structure, apiRows, standardCodes = [] } = params
  const letter = normalizeAnnexLetter(String(parentStructRow.annexLetter ?? ""))
  const parentCode = normId(parentStructRow.linkCode ?? parentStructRow.id)

  let targets: Array<{ code: string; label: string }> = []

  if (letter) {
    for (const row of structure) {
      if (!isStructureRowDetailOnly(row)) continue
      if (normalizeAnnexLetter(String(row.annexLetter ?? "")) !== letter) continue
      const code = normId(row.linkCode ?? row.id)
      if (!code) continue
      targets.push({
        code,
        label: String(row.label ?? code).trim() || code,
      })
    }
  }

  if (targets.length === 0 && parentCode && standardCodes.length > 0) {
    targets = getDetailSubLineCodesFromStandardLinkCode(parentCode, standardCodes).map((c) => ({
      code: c.code,
      label: standardLinkCodeDisplayLabel(c),
    }))
  }

  return targets.map(({ code, label }) => {
    const api = findApiRowByCodeOrLabel(apiRows, code, label)
    return {
      code,
      label: String(api?.label ?? label).trim() || code,
      amount: api?.current ?? 0,
      priorAmount: api?.prior ?? 0,
    }
  })
}

/** Map GL `balanceAccounts` into the shared expand-child shape. */
export function mapGlAccountsToExpandChildren(
  accounts: Array<{
    accountNumber: string
    accountName: string
    amount: number
    priorAmount?: number
    trendValues?: number[]
  }> = [],
): SummaryExpandChild[] {
  return accounts.map((a) => ({
    code: a.accountNumber,
    label: a.accountName,
    amount: a.amount,
    priorAmount: a.priorAmount,
    trendValues: a.trendValues,
  }))
}

/** True when this summary parent is the CAP-C rollup that already folds CAP-C.1. */
export function isCapCSummaryParent(
  parentStructRow: Record<string, unknown> | null | undefined,
  parentRowId?: string,
): boolean {
  const candidates = [
    parentStructRow?.linkCode,
    parentStructRow?.id,
    parentRowId,
  ]
  return candidates.some((c) => normId(c) === CAP_C_CASH_FLOW_ROOT)
}

/**
 * GL expand under CAP-C: prepend computed net income (CAP-C.1) so children
 * sum matches the folded parent total (backend folds CAP-C.1 into CAP-C).
 */
export function collectGlExpandChildren(params: {
  parentStructRow: Record<string, unknown> | null | undefined
  parentRowId?: string
  balanceAccounts?: Array<{
    accountNumber: string
    accountName: string
    amount: number
    priorAmount?: number
    trendValues?: number[]
  }>
  apiRows: Array<
    Pick<FinancialStatementRow, "id" | "label" | "current" | "prior"> & {
      linkCode?: string
    }
  >
}): SummaryExpandChild[] {
  const gl = mapGlAccountsToExpandChildren(params.balanceAccounts)
  if (!isCapCSummaryParent(params.parentStructRow, params.parentRowId)) return gl
  if (gl.some((c) => isComputedNetIncomeLinkCode(c.code))) return gl

  const ni = findApiRowByCodeOrLabel(
    params.apiRows,
    NET_INCOME_BALANCE_LINK_CODE,
    "Bénéfice net",
  )
  if (!ni) return gl

  return [
    {
      code: NET_INCOME_BALANCE_LINK_CODE,
      label: String(ni.label ?? "Bénéfice net").trim() || "Bénéfice net",
      amount: ni.current ?? 0,
      priorAmount: ni.prior ?? 0,
    },
    ...gl,
  ]
}

/** Series variant of {@link collectGlExpandChildren}. */
export function collectGlExpandChildrenFromSeries(params: {
  parentStructRow: Record<string, unknown> | null | undefined
  parentRowId?: string
  balanceAccounts?: Array<{
    accountNumber: string
    accountName: string
    amount: number
    priorAmount?: number
    trendValues?: number[]
  }>
  seriesRows: SeriesRow[]
  buildTrendValues: (row: SeriesRow) => number[]
}): SummaryExpandChild[] {
  const gl = mapGlAccountsToExpandChildren(params.balanceAccounts)
  if (!isCapCSummaryParent(params.parentStructRow, params.parentRowId)) return gl
  if (gl.some((c) => isComputedNetIncomeLinkCode(c.code))) return gl

  const ni = findApiRowByCodeOrLabel(
    params.seriesRows,
    NET_INCOME_BALANCE_LINK_CODE,
    "Bénéfice net",
  )
  if (!ni) return gl

  const trendValues = params.buildTrendValues(ni)
  return [
    {
      code: NET_INCOME_BALANCE_LINK_CODE,
      label: String(ni.label ?? "Bénéfice net").trim() || "Bénéfice net",
      amount: trendValues[0] ?? 0,
      priorAmount: trendValues.length >= 2 ? trendValues[1] ?? 0 : 0,
      trendValues: trendValues.length > 0 ? trendValues : undefined,
    },
    ...gl,
  ]
}

/**
 * Ne garder que les sous-lignes (GL ou codes d’annexe) avec un montant
 * non nul pour l’horizon affiché.
 * CAP-C.1 reste toujours visible sous CAP-C (même à zéro).
 */
export function filterExpandChildrenForHorizon(
  children: SummaryExpandChild[],
  view: IncomeStatementHorizonView,
): SummaryExpandChild[] {
  return children.filter(
    (child) =>
      isComputedNetIncomeLinkCode(child.code) ||
      rowHasNonZeroAmountsForHorizon(
        {
          current: child.amount,
          prior: child.priorAmount,
          trendValues: child.trendValues,
        },
        view,
      ),
  )
}

/**
 * Series variant: annex children with trend columns from matching series rows.
 */
export function collectAnnexChildExpandRowsFromSeries(params: {
  parentStructRow: Record<string, unknown>
  structure: Record<string, unknown>[]
  seriesRows: SeriesRow[]
  standardCodes?: StandardLinkCode[]
  buildTrendValues: (row: SeriesRow) => number[]
}): SummaryExpandChild[] {
  const { parentStructRow, structure, seriesRows, standardCodes = [], buildTrendValues } = params
  const letter = normalizeAnnexLetter(String(parentStructRow.annexLetter ?? ""))
  const parentCode = normId(parentStructRow.linkCode ?? parentStructRow.id)

  let targets: Array<{ code: string; label: string }> = []

  if (letter) {
    for (const row of structure) {
      if (!isStructureRowDetailOnly(row)) continue
      if (normalizeAnnexLetter(String(row.annexLetter ?? "")) !== letter) continue
      const code = normId(row.linkCode ?? row.id)
      if (!code) continue
      targets.push({
        code,
        label: String(row.label ?? code).trim() || code,
      })
    }
  }

  if (targets.length === 0 && parentCode && standardCodes.length > 0) {
    targets = getDetailSubLineCodesFromStandardLinkCode(parentCode, standardCodes).map((c) => ({
      code: c.code,
      label: standardLinkCodeDisplayLabel(c),
    }))
  }

  return targets.map(({ code, label }) => {
    const api = findApiRowByCodeOrLabel(seriesRows, code, label)
    const trendValues = api ? buildTrendValues(api) : []
    return {
      code,
      label: String(api?.label ?? label).trim() || code,
      amount: trendValues[0] ?? 0,
      priorAmount: trendValues.length >= 2 ? trendValues[1] ?? 0 : 0,
      trendValues: trendValues.length > 0 ? trendValues : undefined,
    }
  })
}

/**
 * Poste dont la liaison Paramètres est une formule :
 * - champ `formula` (totaux / validation), ou
 * - mode Addition / Soustraction (pas un code unique).
 */
export function structureRowHasFormulaLiaison(
  structRow: Record<string, unknown> | null | undefined,
): boolean {
  if (!structRow) return false
  const formula = structRow.formula
  if (Array.isArray(formula) && formula.some((t) => String(t ?? "").trim())) return true
  if (typeof formula === "string" && formula.trim()) return true
  const mode = normalizeLiaisonMode(structRow)
  return mode === "sum" || mode === "difference"
}

export function resolveSummaryExpandMode(params: {
  showStructureCols: boolean
  isSpacer: boolean
  rowId?: string
  usesAnnex: boolean
  glCount: number
  annexChildCount: number
  /** Totaux / sous-totaux : jamais ouvrables au Sommaire. */
  isResult?: boolean
  /** Titres de section : jamais ouvrables. */
  isSection?: boolean
  /** Liaison = formule (addition / soustraction / formula) : jamais ouvrable. */
  hasFormulaLiaison?: boolean
}): SummaryExpandMode {
  const {
    showStructureCols,
    isSpacer,
    rowId,
    usesAnnex,
    glCount,
    annexChildCount,
    isResult,
    isSection,
    hasFormulaLiaison,
  } = params
  if (
    showStructureCols ||
    isSpacer ||
    !rowId ||
    isResult ||
    isSection ||
    hasFormulaLiaison
  ) {
    return "none"
  }
  if (usesAnnex) return annexChildCount > 0 ? "annex" : "none"
  return glCount > 0 ? "gl" : "none"
}

export function summaryExpandModeAllowsExpand(mode: SummaryExpandMode): boolean {
  return mode === "gl" || mode === "annex"
}
