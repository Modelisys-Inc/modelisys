import type { StandardLinkCode } from "@/lib/api"
import {
  incomeStatementFamilyForSectionLabel,
  standardParentCodeForSectionLabel,
} from "@/lib/income-statement-mapping-rollup"
import {
  type IncomeStatementHorizonView,
  isStructuralIncomeStatementRowAlwaysVisible,
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
} from "@/lib/income-statement-structure-utils"

export interface SummaryRowForHorizonFilter {
  label: string
  current?: number
  prior?: number
  isSection?: boolean
  isResult?: boolean
  indent?: boolean
  trendValues?: number[]
  /** Présent sur les lignes API (`hasLiaisonCode`). */
  hasLiaisonCode?: boolean
}

export interface DetailRowForHorizonFilter {
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
}

function summaryRowAmounts(row: SummaryRowForHorizonFilter): HorizonDisplayAmounts {
  return {
    current: row.current ?? 0,
    prior: row.prior ?? 0,
    trendValues: row.trendValues,
  }
}

function detailRowAmounts(row: DetailRowForHorizonFilter): HorizonDisplayAmounts {
  return {
    current: row.current ?? 0,
    prior: row.prior ?? 0,
    trendValues: row.trendValues,
  }
}

function summaryRowQualifiesForHorizonHiding(
  row: SummaryRowForHorizonFilter,
  structRow: Record<string, unknown> | undefined,
  standardCodes: StandardLinkCode[],
): boolean {
  if (
    isStructuralIncomeStatementRowAlwaysVisible(row.label, {
      isResult: row.isResult,
      hasFormula: !!structRow?.formula,
    })
  ) {
    return false
  }
  if (row.hasLiaisonCode) return true
  if (structRow && String(structRow.linkCode ?? "").trim()) return true
  if (structRow && isCodeMappingEnabled(structRow)) return true
  if (row.isSection) {
    const family = incomeStatementFamilyForSectionLabel(row.label)
    if (family) return true
    if (standardParentCodeForSectionLabel(row.label, standardCodes)) return true
  }
  if (row.indent && !row.isSection && !row.isResult) return true
  return false
}

function detailRowQualifiesForHorizonHiding(
  row: DetailRowForHorizonFilter,
  structRow: Record<string, unknown> | undefined,
): boolean {
  if (row.isAnnexPlaceholder || row.isAnnexSubtotal || row.isAnnexTitle) return false
  if (
    isStructuralIncomeStatementRowAlwaysVisible(row.statementLabel ?? row.label, {
      hasFormula: !!structRow?.formula,
    })
  ) {
    return false
  }
  if (structRow && isStructureRowHidden(structRow)) return true
  if (structRow && String(structRow.linkCode ?? "").trim()) return true
  if (structRow && isCodeMappingEnabled(structRow)) return true
  return !!normalizeAnnexLetter(row.annexLetter ?? "")
}

/** Filtre Sommaire : masque les postes sans montant pour l’horizon sélectionné. */
export function filterIncomeStatementSummaryRowsForHorizon<
  T extends SummaryRowForHorizonFilter,
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
    if (structRow && isStructureRowDetailOnly(structRow)) return false

    // Lignes séries « supplémentaires » (ex. REV-A.1 appendus pour les graphiques) :
    // absentes des Paramètres Sommaire → ne pas les afficher dans le tableau.
    if (!structRow) {
      return isStructuralIncomeStatementRowAlwaysVisible(row.label, {
        isResult: row.isResult,
      })
    }

    if (!summaryRowQualifiesForHorizonHiding(row, structRow, standardCodes)) {
      return true
    }

    return rowHasNonZeroAmountsForHorizon(summaryRowAmounts(row), view)
  })
}

function annexLettersInDetailRows(rows: DetailRowForHorizonFilter[]): string[] {
  const letters = new Set<string>()
  for (const row of rows) {
    const L = normalizeAnnexLetter(row.annexLetter ?? "")
    if (L) letters.add(L)
  }
  return [...letters]
}

function annexBlockHasNonZeroAmounts(
  letter: string,
  rows: DetailRowForHorizonFilter[],
  view: IncomeStatementHorizonView,
): boolean {
  const L = normalizeAnnexLetter(letter)
  return rows.some((row) => {
    if (normalizeAnnexLetter(row.annexLetter ?? "") !== L) return false
    if (row.isAnnexPlaceholder || row.isAnnexSubtotal || row.isAnnexTitle) return false
    return rowHasNonZeroAmountsForHorizon(detailRowAmounts(row), view)
  })
}

/**
 * Filtre Détail : masque les annexes / postes sans montant pour l’horizon,
 * et retire tout bloc d’annexe dont le poste sommaire est masqué ou sans chiffres.
 */
export function filterIncomeStatementDetailRowsForHorizon<
  T extends DetailRowForHorizonFilter,
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

/** Indique si la case Masquer devrait être cochée (Paramètres) pour l’horizon courant. */
export function structureRowHiddenForHorizonDisplay(
  structRow: Record<string, unknown>,
  structure: Record<string, unknown>[],
  amounts: HorizonDisplayAmounts,
  view: IncomeStatementHorizonView,
  standardCodes: StandardLinkCode[] = [],
): boolean {
  if (isStructureRowHidden(structRow)) return true

  const label = String(structRow.label ?? "")
  const pseudoRow: SummaryRowForHorizonFilter = {
    label,
    current: amounts.current,
    prior: amounts.prior,
    trendValues: amounts.trendValues,
    isSection: structRow.isSection === true,
    isResult: structRow.isResult === true,
    indent: structRow.indent === true,
    hasLiaisonCode: isCodeMappingEnabled(structRow),
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
