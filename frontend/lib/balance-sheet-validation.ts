/**
 * Validation du bilan : Total actif − Total passifs et capitaux propres
 * (formule editable via Paramètres Sommaire).
 */

export const BALANCE_SHEET_VALIDATION_ROW_ID = "validation"

export type ValidationFormulaTerm = {
  sign: 1 | -1
  refId: string
}

export type BalanceSheetAmountRow = {
  label: string
  current?: number
  prior?: number
  trendValues?: number[]
}

export function normalizeBalanceSheetLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
}

/** Section « Actifs » / « Actif » (en-tête, au-dessus de laquelle on injecte Validation). */
export function isBalanceSheetAssetsSectionLabel(label: string): boolean {
  const lab = normalizeBalanceSheetLabel(label)
  return lab === "actifs" || lab === "actif"
}

/** Sous-totaux de section (ACT/ALT/court terme…) — pas le grand total du bilan. */
function isPartialBalanceSheetAssetsTotalLabel(lab: string): boolean {
  if (/\b(court|long|courants?)\b/.test(lab)) return true
  if (lab.includes("immobilis")) return true
  // « Total ACT » (après normalisation) — distinct de « … actif … »
  if (/\bact\b/.test(lab) && !lab.includes("actif")) return true
  return false
}

/** Rang : 2 = grand total exact, 1 = autre total d’actif global, -1 = non. */
function balanceSheetTotalAssetsLabelRank(label: string): number {
  const lab = normalizeBalanceSheetLabel(label)
  if (!lab) return -1
  if (lab === "total des actifs" || lab === "total de l actif" || lab === "total actif") {
    return 2
  }
  if (!(lab.includes("total") && lab.includes("actif") && !lab.includes("passif"))) return -1
  if (isPartialBalanceSheetAssetsTotalLabel(lab)) return -1
  return 1
}

export function isBalanceSheetTotalAssetsLabel(label: string): boolean {
  return balanceSheetTotalAssetsLabelRank(label) >= 1
}

export function isBalanceSheetTotalLiabilitiesEquityLabel(label: string): boolean {
  const lab = normalizeBalanceSheetLabel(label)
  if (!lab) return false
  if (
    lab === "total passifs et capitaux propres" ||
    lab === "total du passif et des capitaux propres" ||
    lab === "total passif et capitaux propres"
  ) {
    return true
  }
  if (!(lab.includes("total") && lab.includes("passif") && lab.includes("capitaux"))) return false
  // Exclure d’éventuels totaux partiels (« … court terme », etc.)
  if (/\b(court|long|courants?)\b/.test(lab)) return false
  return true
}

export function isBalanceSheetValidationStructureRow(row: Record<string, unknown>): boolean {
  if (row.isValidation === true) return true
  const id = String(row.id ?? "").trim()
  if (id === BALANCE_SHEET_VALIDATION_ROW_ID) return true
  return normalizeBalanceSheetLabel(String(row.label ?? "")) === "validation"
}

/**
 * Grand total d’actif : préfère « Total de l'actif » / « Total des actifs »
 * au dernier match, jamais un sous-total de section (court terme, Total ACT…).
 */
export function findBalanceSheetTotalAssetsRow<T extends BalanceSheetAmountRow>(
  rows: T[],
): T | undefined {
  let best: T | undefined
  let bestRank = -1
  for (const row of rows) {
    const rank = balanceSheetTotalAssetsLabelRank(row.label)
    if (rank < 0) continue
    // Rang supérieur, ou même rang plus bas dans le tableau (grand total en dernier).
    if (rank > bestRank || rank === bestRank) {
      best = row
      bestRank = rank
    }
  }
  return best
}

export function findBalanceSheetTotalLiabilitiesEquityRow<T extends BalanceSheetAmountRow>(
  rows: T[],
): T | undefined {
  let found: T | undefined
  for (const row of rows) {
    if (isBalanceSheetTotalLiabilitiesEquityLabel(row.label)) found = row
  }
  return found
}

/** Écart = Total actif − Total passifs et capitaux propres. */
export function balanceSheetValidationEcart(
  assets: number | undefined,
  liabilitiesEquity: number | undefined,
): number | null {
  if (assets === undefined || liabilitiesEquity === undefined) return null
  return assets - liabilitiesEquity
}

export function isBalanceSheetBalanced(ecart: number | null | undefined, tolerance = 1): boolean {
  if (ecart === null || ecart === undefined) return true
  return Math.abs(ecart) < tolerance
}

/** Identifiant stable pour une ligne de structure (référence de formule). */
export function balanceSheetStructureRowRefId(
  row: Record<string, unknown>,
  index: number,
): string {
  const existing = String(row.id ?? "").trim()
  if (existing) return existing
  const lab = normalizeBalanceSheetLabel(String(row.label ?? ""))
  if (lab) {
    const slug = lab
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64)
    if (slug) return slug
  }
  return `row-${index}`
}

export function parseValidationFormula(raw: unknown): ValidationFormulaTerm[] {
  if (!Array.isArray(raw)) return []
  const terms: ValidationFormulaTerm[] = []
  for (const item of raw) {
    const t = String(item ?? "").trim()
    if (!t) continue
    const sign: 1 | -1 = t.startsWith("-") ? -1 : 1
    const refId = t.replace(/^[+-]/, "").trim()
    if (!refId) continue
    terms.push({ sign, refId })
  }
  return terms
}

export function serializeValidationFormula(terms: ValidationFormulaTerm[]): string[] {
  return terms
    .filter((t) => t.refId.trim())
    .map((t) => `${t.sign === -1 ? "-" : "+"}${t.refId.trim()}`)
}

/** Formule par défaut : +Total actif − Total passifs et capitaux propres. */
export function defaultBalanceSheetValidationFormula(
  structure: Record<string, unknown>[],
): string[] {
  const amountRows = structure.map((row, index) => ({
    label: String(row.label ?? ""),
    _index: index,
    _skip: isBalanceSheetValidationStructureRow(row),
  }))
  const assets = findBalanceSheetTotalAssetsRow(
    amountRows.filter((r) => !r._skip),
  )
  const liabilities = findBalanceSheetTotalLiabilitiesEquityRow(
    amountRows.filter((r) => !r._skip),
  )
  const terms: string[] = []
  if (assets) {
    terms.push(`+${balanceSheetStructureRowRefId(structure[assets._index]!, assets._index)}`)
  }
  if (liabilities) {
    terms.push(
      `-${balanceSheetStructureRowRefId(structure[liabilities._index]!, liabilities._index)}`,
    )
  }
  return terms
}

/**
 * Garantit une ligne Validation dans la structure (ids stables + formule par défaut).
 * Retourne la même référence si aucun changement.
 */
export function ensureBalanceSheetValidationStructure(
  structure: Record<string, unknown>[],
): Record<string, unknown>[] {
  let changed = false
  const withIds = structure.map((row, index) => {
    if (isBalanceSheetValidationStructureRow(row)) return row
    const id = String(row.id ?? "").trim()
    if (id) return row
    changed = true
    return { ...row, id: balanceSheetStructureRowRefId(row, index) }
  })

  const existingIdx = withIds.findIndex(isBalanceSheetValidationStructureRow)
  const defaultFormula = defaultBalanceSheetValidationFormula(withIds)

  if (existingIdx >= 0) {
    const row = withIds[existingIdx]!
    const formula = parseValidationFormula(row.formula)
    const patch: Record<string, unknown> = {
      ...row,
      id: BALANCE_SHEET_VALIDATION_ROW_ID,
      label: String(row.label ?? "").trim() || "Validation",
      isValidation: true,
      isResult: true,
      isBold: true,
    }
    if (formula.length === 0 && defaultFormula.length > 0) {
      patch.formula = defaultFormula
      changed = true
    }
    if (
      row.id !== BALANCE_SHEET_VALIDATION_ROW_ID ||
      row.isValidation !== true ||
      (formula.length === 0 && defaultFormula.length > 0)
    ) {
      changed = true
      const next = [...withIds]
      next[existingIdx] = patch
      return next
    }
    return changed ? withIds : structure
  }

  return [
    {
      id: BALANCE_SHEET_VALIDATION_ROW_ID,
      label: "Validation",
      isValidation: true,
      isResult: true,
      isBold: true,
      formula: defaultFormula,
    },
    ...withIds,
  ]
}

export function findBalanceSheetValidationStructureRow(
  structure: Record<string, unknown>[],
): { row: Record<string, unknown>; index: number } | null {
  const index = structure.findIndex(isBalanceSheetValidationStructureRow)
  if (index < 0) return null
  return { row: structure[index]!, index }
}

export type ValidationAmountLookup = Map<
  string,
  { current: number; prior: number; trendValues?: number[] }
>

/** Index id structure → montants sommaire (appariement par id puis par libellé). */
export function buildBalanceSheetValidationAmountLookup(
  structure: Record<string, unknown>[],
  amountRows: BalanceSheetAmountRow[],
): ValidationAmountLookup {
  const byLabel = new Map<string, BalanceSheetAmountRow>()
  for (const r of amountRows) {
    byLabel.set(normalizeBalanceSheetLabel(r.label), r)
  }
  const map: ValidationAmountLookup = new Map()
  structure.forEach((row, index) => {
    if (isBalanceSheetValidationStructureRow(row)) return
    const id = balanceSheetStructureRowRefId(row, index)
    const label = normalizeBalanceSheetLabel(String(row.label ?? ""))
    const match = byLabel.get(label)
    if (!match) return
    map.set(id, {
      current: match.current ?? 0,
      prior: match.prior ?? 0,
      trendValues: match.trendValues,
    })
  })
  return map
}

export function evaluateValidationFormulaCurrent(
  formula: unknown,
  lookup: ValidationAmountLookup,
): number | null {
  const terms = parseValidationFormula(formula)
  if (terms.length === 0) return null
  let total = 0
  for (const term of terms) {
    const amt = lookup.get(term.refId)
    if (!amt) continue
    total += term.sign * amt.current
  }
  return total
}

export function evaluateValidationFormulaPrior(
  formula: unknown,
  lookup: ValidationAmountLookup,
): number | null {
  const terms = parseValidationFormula(formula)
  if (terms.length === 0) return null
  let total = 0
  for (const term of terms) {
    const amt = lookup.get(term.refId)
    if (!amt) continue
    total += term.sign * amt.prior
  }
  return total
}

export function evaluateValidationFormulaTrend(
  formula: unknown,
  lookup: ValidationAmountLookup,
): number[] {
  const terms = parseValidationFormula(formula)
  if (terms.length === 0) return []
  let len = 0
  for (const term of terms) {
    const n = lookup.get(term.refId)?.trendValues?.length ?? 0
    if (n > len) len = n
  }
  if (len === 0) return []
  return Array.from({ length: len }, (_, i) => {
    let total = 0
    for (const term of terms) {
      const series = lookup.get(term.refId)?.trendValues
      total += term.sign * (series?.[i] ?? 0)
    }
    return total
  })
}

/** Libellé d’affichage pour une réf. de formule. */
export function validationFormulaTermLabel(
  structure: Record<string, unknown>[],
  refId: string,
): string {
  const idx = structure.findIndex((r, i) => balanceSheetStructureRowRefId(r, i) === refId)
  if (idx < 0) return refId
  const label = String(structure[idx]?.label ?? "").trim()
  return label || refId
}
