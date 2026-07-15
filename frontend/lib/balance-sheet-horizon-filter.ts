import type { StandardLinkCode } from "@/lib/api"
import {
  balanceSheetFamilyForSectionLabel,
  standardParentCodeForBalanceSheetSectionLabel,
} from "@/lib/balance-sheet-mapping-rollup"
import {
  type IncomeStatementHorizonView,
  rowHasNonZeroAmountsForHorizon,
  type HorizonDisplayAmounts,
} from "@/lib/income-statement-horizon-visibility"
import {
  findStructureRowForStatementLine,
  findSummaryAnnexOwnerRow,
  isCodeMappingEnabled,
  isStructureRowDetailOnly,
  isStructureRowHidden,
  normalizeAnnexLetter,
  normLabel,
} from "@/lib/income-statement-structure-utils"
import { isComputedNetIncomeLinkCode } from "@/lib/standard-link-code-utils"

export interface BalanceSheetSummaryRowForHorizonFilter {
  label: string
  current?: number
  prior?: number
  isSection?: boolean
  isResult?: boolean
  indent?: boolean
  trendValues?: number[]
  hasLiaisonCode?: boolean
  rowId?: string
  linkCode?: string
}

export interface BalanceSheetDetailRowForHorizonFilter {
  label: string
  statementLabel?: string
  current?: number
  prior?: number
  trendValues?: number[]
  annexLetter?: string
  isAnnexTitle?: boolean
  isAnnexPlaceholder?: boolean
  isAnnexSubtotal?: boolean
  rowId?: string
  balanceAccounts?: Array<{ amount?: number; priorAmount?: number }>
}

function summaryRowAmounts(row: BalanceSheetSummaryRowForHorizonFilter): HorizonDisplayAmounts {
  return {
    current: row.current ?? 0,
    prior: row.prior ?? 0,
    trendValues: row.trendValues,
  }
}

function detailRowAmounts(row: BalanceSheetDetailRowForHorizonFilter): HorizonDisplayAmounts {
  return {
    current: row.current ?? 0,
    prior: row.prior ?? 0,
    trendValues: row.trendValues,
  }
}

/** Lignes de structure toujours visibles (totaux / intercalaires bilan). */
export function isStructuralBalanceSheetRowAlwaysVisible(
  label: string,
  opts?: { isResult?: boolean; hasFormula?: boolean },
): boolean {
  if (!String(label ?? "").trim()) return true
  if (opts?.isResult) return true
  if (opts?.hasFormula) return true
  const lab = normLabel(label)
  return (
    lab === "actif" ||
    lab === "passif" ||
    lab === "capitaux propres" ||
    lab === "total actif" ||
    lab === "total passif" ||
    lab.includes("total des actifs") ||
    lab.includes("total actif") ||
    lab.includes("total passif") ||
    lab.includes("total des passifs")
  )
}

function summaryRowQualifiesForHorizonHiding(
  row: BalanceSheetSummaryRowForHorizonFilter,
  structRow: Record<string, unknown> | undefined,
  standardCodes: StandardLinkCode[],
): boolean {
  if (
    isStructuralBalanceSheetRowAlwaysVisible(row.label, {
      isResult: row.isResult,
      hasFormula: !!structRow?.formula,
    })
  ) {
    return false
  }
  // CAP-C.1 Bénéfice net calculé : toujours visible au Sommaire
  if (
    isComputedNetIncomeLinkCode(String(row.linkCode ?? row.rowId ?? "")) ||
    (structRow &&
      (structRow.isComputedNetIncome === true ||
        isComputedNetIncomeLinkCode(String(structRow.linkCode ?? ""))))
  ) {
    return false
  }
  if (row.hasLiaisonCode) return true
  if (structRow && String(structRow.linkCode ?? "").trim()) return true
  if (structRow && isCodeMappingEnabled(structRow)) return true
  if (row.isSection) {
    const family = balanceSheetFamilyForSectionLabel(row.label)
    if (family) return true
    if (standardParentCodeForBalanceSheetSectionLabel(row.label, standardCodes)) return true
  }
  if (row.indent && !row.isSection && !row.isResult) return true
  return false
}

function detailRowQualifiesForHorizonHiding(
  row: BalanceSheetDetailRowForHorizonFilter,
  structRow: Record<string, unknown> | undefined,
): boolean {
  if (row.isAnnexPlaceholder || row.isAnnexSubtotal || row.isAnnexTitle) return false
  if (
    isStructuralBalanceSheetRowAlwaysVisible(row.statementLabel ?? row.label, {
      hasFormula: !!structRow?.formula,
    })
  ) {
    return false
  }
  // CAP-C.1 Bénéfice net calculé : toujours visible au Détail
  if (
    isComputedNetIncomeLinkCode(String(row.rowId ?? "")) ||
    (structRow &&
      (structRow.isComputedNetIncome === true ||
        isComputedNetIncomeLinkCode(String(structRow.linkCode ?? ""))))
  ) {
    return false
  }
  if (structRow && isStructureRowHidden(structRow)) return true
  if (structRow && String(structRow.linkCode ?? "").trim()) return true
  if (structRow && isCodeMappingEnabled(structRow)) return true
  return !!normalizeAnnexLetter(row.annexLetter ?? "")
}

export function filterBalanceSheetSummaryRowsForHorizon<
  T extends BalanceSheetSummaryRowForHorizonFilter,
>(
  rows: T[],
  structure: Record<string, unknown>[],
  view: IncomeStatementHorizonView,
  standardCodes: StandardLinkCode[] = [],
): T[] {
  if (!structure.length) return rows

  return rows.filter((row) => {
    const structRow = findStructureRowForStatementLine("", row.label, structure)
    if (structRow && isStructureRowHidden(structRow)) return false

    if (!summaryRowQualifiesForHorizonHiding(row, structRow, standardCodes)) {
      return true
    }

    return rowHasNonZeroAmountsForHorizon(summaryRowAmounts(row), view)
  })
}

function annexLettersInDetailRows(rows: BalanceSheetDetailRowForHorizonFilter[]): string[] {
  const letters = new Set<string>()
  for (const row of rows) {
    const L = normalizeAnnexLetter(row.annexLetter ?? "")
    if (L) letters.add(L)
  }
  return [...letters]
}

function annexBlockHasNonZeroAmounts(
  letter: string,
  rows: BalanceSheetDetailRowForHorizonFilter[],
  view: IncomeStatementHorizonView,
): boolean {
  const L = normalizeAnnexLetter(letter)
  return rows.some((row) => {
    if (normalizeAnnexLetter(row.annexLetter ?? "") !== L) return false
    if (row.isAnnexPlaceholder || row.isAnnexSubtotal) return false
    if (row.balanceAccounts?.some((a) => (a.amount ?? 0) !== 0 || (a.priorAmount ?? 0) !== 0)) {
      return true
    }
    if (row.isAnnexTitle) return false
    return rowHasNonZeroAmountsForHorizon(detailRowAmounts(row), view)
  })
}

/**
 * Filtre Détail : masque les annexes / postes sans montant pour l’horizon,
 * et retire tout bloc d’annexe dont le poste sommaire est masqué ou sans chiffres.
 * Même principe que le Compte de résultat Détail.
 */
export function filterBalanceSheetDetailRowsForHorizon<
  T extends BalanceSheetDetailRowForHorizonFilter,
>(
  rows: T[],
  structure: Record<string, unknown>[],
  view: IncomeStatementHorizonView,
): T[] {
  if (!structure.length) return rows

  const hiddenAnnexLetters = new Set<string>()
  for (const letter of annexLettersInDetailRows(rows)) {
    const owner = findSummaryAnnexOwnerRow(structure, letter)
    if (owner && isStructureRowHidden(owner)) {
      hiddenAnnexLetters.add(letter)
      continue
    }
    if (!annexBlockHasNonZeroAmounts(letter, rows, view)) {
      hiddenAnnexLetters.add(letter)
    }
  }

  return rows.filter((row) => {
    const letter = normalizeAnnexLetter(row.annexLetter ?? "")
    if (letter && hiddenAnnexLetters.has(letter)) return false

    if (row.isAnnexPlaceholder || row.isAnnexSubtotal) return false

    // Titres d’annexe : montants volontairement à zéro (sous-total = somme des sous-lignes).
    if (row.isAnnexTitle) return true

    const structRow = findStructureRowForStatementLine(
      row.rowId ?? "",
      row.statementLabel ?? row.label,
      structure,
    )
    if (structRow && isStructureRowHidden(structRow)) return false

    if (!detailRowQualifiesForHorizonHiding(row, structRow)) {
      return true
    }

    return rowHasNonZeroAmountsForHorizon(detailRowAmounts(row), view)
  })
}

export function structureRowHiddenForBalanceSheetHorizonDisplay(
  structRow: Record<string, unknown>,
  structure: Record<string, unknown>[],
  amounts: HorizonDisplayAmounts,
  view: IncomeStatementHorizonView,
  standardCodes: StandardLinkCode[] = [],
): boolean {
  if (isStructureRowHidden(structRow)) return true

  const label = String(structRow.label ?? "")
  const pseudoRow: BalanceSheetSummaryRowForHorizonFilter = {
    label,
    current: amounts.current,
    prior: amounts.prior,
    trendValues: amounts.trendValues,
    isSection: structRow.isSection === true,
    isResult: structRow.isResult === true,
    indent: structRow.indent === true,
    hasLiaisonCode: isCodeMappingEnabled(structRow),
    rowId: String(structRow.linkCode ?? structRow.id ?? ""),
    linkCode: String(structRow.linkCode ?? ""),
  }

  if (!summaryRowQualifiesForHorizonHiding(pseudoRow, structRow, standardCodes)) {
    return false
  }

  if (isStructureRowDetailOnly(structRow)) {
    const letter = normalizeAnnexLetter(String(structRow.annexLetter ?? ""))
    const owner = letter ? findSummaryAnnexOwnerRow(structure, letter) : undefined
    if (owner && isStructureRowHidden(owner)) return true
    if (!owner) return true
  }

  return !rowHasNonZeroAmountsForHorizon(amounts, view)
}
