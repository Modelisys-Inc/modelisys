/**
 * Affichage condensé des Capitaux propres pour Valeur comptable ajusté :
 * masque le titre de section et le détail, conserve le total renommé « Actif net ».
 * Renomme « Total des passifs et des capitaux propres » → « Total des passifs et de l'actif net ».
 * Sur VCA / ACN :
 *   Actif net = Total de l'actif − Total des passifs
 *   Total des passifs et de l'actif net = Total des passifs + Actif net
 */

import {
  findBalanceSheetTotalAssetsRow,
  isBalanceSheetTotalLiabilitiesEquityLabel,
  normalizeBalanceSheetLabel,
  type BalanceSheetAmountRow,
} from "@/lib/balance-sheet-validation"
import {
  netTangibleDerivedAmount,
  type NetTangibleColumnAmounts,
} from "@/lib/net-tangible-column-rollup"

export const NET_TANGIBLE_EQUITY_TOTAL_LABEL = "Actif net"
export const NET_TANGIBLE_LIABILITIES_AND_ACTIF_NET_LABEL = "Total des passifs et de l'actif net"

function normalizeLabel(label: string | null | undefined): string {
  return normalizeBalanceSheetLabel(label ?? "")
}

export function isEquitySectionTitleLabel(label: string | null | undefined): boolean {
  return normalizeLabel(label) === "capitaux propres"
}

export function isEquityTotalLabel(label: string | null | undefined): boolean {
  const n = normalizeLabel(label)
  return n === "total des capitaux propres" || n === "actif net"
}

/** Ligne grand total passifs + CP / actif net (libellé d’origine ou renommé VCA). */
export function isNetTangibleLiabilitiesAndActifNetLabel(
  label: string | null | undefined,
): boolean {
  if (isBalanceSheetTotalLiabilitiesEquityLabel(label ?? "")) return true
  return normalizeLabel(label) === normalizeLabel(NET_TANGIBLE_LIABILITIES_AND_ACTIF_NET_LABEL)
}

/** Grand total des passifs seulement (hors capitaux propres / totaux de section). */
export function isBalanceSheetTotalLiabilitiesOnlyLabel(label: string | null | undefined): boolean {
  const lab = normalizeLabel(label)
  if (!lab) return false
  if (lab.includes("capitaux")) return false
  if (lab.includes("actif net")) return false
  if (!(lab.includes("total") && lab.includes("passif"))) return false
  if (/\b(court|long|courants?)\b/.test(lab)) return false
  if (
    lab === "total des passifs" ||
    lab === "total du passif" ||
    lab === "total passifs" ||
    lab === "total passif"
  ) {
    return true
  }
  // Autre libellé « total … passif(s) … » sans capitaux / actif
  return !lab.includes("actif")
}

export function findBalanceSheetTotalLiabilitiesOnlyRow<T extends BalanceSheetAmountRow>(
  rows: T[],
): T | undefined {
  let found: T | undefined
  for (const row of rows) {
    if (isBalanceSheetTotalLiabilitiesOnlyLabel(row.label)) found = row
  }
  return found
}

type EquityCollapseRow = {
  label: string
}

/**
 * Dans la section Capitaux propres : retire le titre et les postes de détail,
 * conserve uniquement le total (renommé Actif net).
 * Renomme aussi le grand total passifs + CP.
 */
export function collapseEquityForNetTangibleValuation<T extends EquityCollapseRow>(
  rows: readonly T[],
): T[] {
  const out: T[] = []
  let insideEquity = false

  for (const row of rows) {
    if (isEquitySectionTitleLabel(row.label)) {
      insideEquity = true
      continue
    }

    if (isEquityTotalLabel(row.label)) {
      insideEquity = false
      out.push({ ...row, label: NET_TANGIBLE_EQUITY_TOTAL_LABEL })
      continue
    }

    if (insideEquity) {
      continue
    }

    if (isBalanceSheetTotalLiabilitiesEquityLabel(row.label)) {
      out.push({ ...row, label: NET_TANGIBLE_LIABILITIES_AND_ACTIF_NET_LABEL })
      continue
    }

    out.push(row)
  }

  return out
}

type ActifNetAmountRow = BalanceSheetAmountRow & { rowId?: string }

function amountForRow(
  row: ActifNetAmountRow,
  amountsByRowId: Record<string, NetTangibleColumnAmounts>,
  field: "vca" | "acn",
): number {
  return netTangibleDerivedAmount(
    row.current ?? 0,
    row.rowId ? amountsByRowId[row.rowId] : undefined,
    field,
  )
}

/**
 * Pour les colonnes VCA et ACN : Actif net = Total de l'actif − Total des passifs
 * (montants déjà dérivés VCA / ACN de chaque total).
 */
export function resolveNetTangibleActifNetVcaAcn(
  rows: ActifNetAmountRow[],
  amountsByRowId: Record<string, NetTangibleColumnAmounts>,
): { vca: number; acn: number } | null {
  const totalAssets = findBalanceSheetTotalAssetsRow(rows)
  const totalLiabilities = findBalanceSheetTotalLiabilitiesOnlyRow(rows)
  if (!totalAssets || !totalLiabilities) return null

  return {
    vca:
      amountForRow(totalAssets, amountsByRowId, "vca") -
      amountForRow(totalLiabilities, amountsByRowId, "vca"),
    acn:
      amountForRow(totalAssets, amountsByRowId, "acn") -
      amountForRow(totalLiabilities, amountsByRowId, "acn"),
  }
}

/**
 * Pour les colonnes VCA et ACN :
 * Total des passifs et de l'actif net = Total des passifs + Actif net
 * (= Total de l'actif sur ces colonnes).
 */
export function resolveNetTangibleLiabilitiesAndActifNetVcaAcn(
  rows: ActifNetAmountRow[],
  amountsByRowId: Record<string, NetTangibleColumnAmounts>,
): { vca: number; acn: number } | null {
  const totalLiabilities = findBalanceSheetTotalLiabilitiesOnlyRow(rows)
  const actifNet = resolveNetTangibleActifNetVcaAcn(rows, amountsByRowId)
  if (!totalLiabilities || !actifNet) return null

  return {
    vca: amountForRow(totalLiabilities, amountsByRowId, "vca") + actifNet.vca,
    acn: amountForRow(totalLiabilities, amountsByRowId, "acn") + actifNet.acn,
  }
}

/**
 * Montant VCA/ACN pour la ligne Validation : mêmes overrides qu’à l’affichage
 * (Actif net ; Total des passifs et de l’actif net).
 */
export function netTangibleValidationColumnAmount(
  row: ActifNetAmountRow,
  amountsByRowId: Record<string, NetTangibleColumnAmounts>,
  field: "vca" | "acn",
  overrides: {
    actifNet: { vca: number; acn: number } | null
    liabilitiesAndActifNet: { vca: number; acn: number } | null
  },
): number {
  if (isEquityTotalLabel(row.label) && overrides.actifNet) {
    return overrides.actifNet[field]
  }
  if (
    isBalanceSheetTotalLiabilitiesEquityLabel(row.label ?? "") &&
    overrides.liabilitiesAndActifNet
  ) {
    return overrides.liabilitiesAndActifNet[field]
  }
  return amountForRow(row, amountsByRowId, field)
}
