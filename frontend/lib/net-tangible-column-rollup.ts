import { linkCodeMatchesLiaisonSumCode } from "@/lib/bilan-forecast-utils"
import { normalizeLiaisonMode } from "@/lib/income-statement-structure-utils"

export type NetTangibleColumnAmounts = {
  adjustments: number
  debts: number
  assets: number
}

export type NetTangibleRollupRow = {
  label: string
  rowId?: string
  linkCode?: string
  isSection?: boolean
  isResult?: boolean
  indent?: boolean
  formula?: string[]
  liaisonMode?: string
  liaisonSumCodes?: string[]
}

const ZERO: NetTangibleColumnAmounts = { adjustments: 0, debts: 0, assets: 0 }

function parseFormulaRefs(formula: string[]): Array<{ sign: 1 | -1; ref: string }> {
  const out: Array<{ sign: 1 | -1; ref: string }> = []
  for (const raw of formula) {
    const token = String(raw ?? "").trim()
    if (!token) continue
    if (token.startsWith("+")) out.push({ sign: 1, ref: token.slice(1).trim() })
    else if (token.startsWith("-")) out.push({ sign: -1, ref: token.slice(1).trim() })
    else out.push({ sign: 1, ref: token })
  }
  return out
}

function normalizeFormula(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t ?? "").trim()).filter(Boolean)
  }
  if (typeof raw === "string" && raw.trim()) return [raw.trim()]
  return []
}

/** True when the row should show rolled-up VCA columns (not leaf edits). */
export function isNetTangibleRollupRow(row: NetTangibleRollupRow): boolean {
  if (row.isResult) return true
  if (normalizeFormula(row.formula).length > 0) return true
  const mode = String(row.liaisonMode ?? "").trim().toLowerCase()
  if (mode === "sum" || mode === "difference") return true
  if ((row.liaisonSumCodes ?? []).some((c) => String(c ?? "").trim())) return true
  return false
}

function addAmounts(
  a: NetTangibleColumnAmounts,
  b: NetTangibleColumnAmounts,
  sign: 1 | -1 = 1,
): NetTangibleColumnAmounts {
  return {
    adjustments: a.adjustments + sign * b.adjustments,
    debts: a.debts + sign * b.debts,
    assets: a.assets + sign * b.assets,
  }
}

function findAmountsByRef(
  rows: Array<NetTangibleRollupRow & { amounts: NetTangibleColumnAmounts }>,
  ref: string,
): NetTangibleColumnAmounts {
  const needle = String(ref ?? "").trim()
  if (!needle) return ZERO
  const needleLower = needle.toLowerCase()
  const match = rows.find((row) => {
    const id = String(row.rowId ?? "").trim()
    const code = String(row.linkCode ?? "").trim()
    const label = String(row.label ?? "").trim()
    return (
      id === needle ||
      code === needle ||
      label === needle ||
      id.toLowerCase() === needleLower ||
      code.toLowerCase() === needleLower ||
      label.toLowerCase() === needleLower
    )
  })
  return match?.amounts ?? ZERO
}

/**
 * Résout Ajustements / Dettes / Actifs pour chaque poste :
 * feuilles = valeurs enregistrées ; sous-totaux = somme (formule / liaison sum / repli positionnel),
 * comme le Bilan Sommaire / Hypothèses Bilan.
 *
 * `treatAsLeafRowIds` : conserver la valeur enregistrée (ex. ALT-B/C/D JVM Capex)
 * au lieu d’écraser par le rollup des enfants d’annexe absents du Sommaire.
 */
export function resolveNetTangibleColumnRollups(
  rows: NetTangibleRollupRow[],
  valuesByRowId: Record<string, NetTangibleColumnAmounts>,
  options?: { treatAsLeafRowIds?: ReadonlySet<string> },
): Record<string, NetTangibleColumnAmounts> {
  const treatAsLeaf = options?.treatAsLeafRowIds
  const working = rows.map((row) => {
    const leaf =
      row.rowId && valuesByRowId[row.rowId]
        ? { ...valuesByRowId[row.rowId]! }
        : { ...ZERO }
    const forceLeaf = !!(row.rowId && treatAsLeaf?.has(row.rowId))
    return {
      ...row,
      formula: normalizeFormula(row.formula),
      liaisonSumCodes: (row.liaisonSumCodes ?? [])
        .map((c) => String(c ?? "").trim())
        .filter(Boolean),
      amounts: leaf,
      isRollup: forceLeaf ? false : isNetTangibleRollupRow(row),
    }
  })

  for (let i = 0; i < working.length; i++) {
    const row = working[i]!
    if (!row.isRollup) continue
    if (row.isSection) continue

    const hasFormula = row.formula.length > 0
    const sumCodes = row.liaisonMode === "sum" || row.liaisonSumCodes.length > 0 ? row.liaisonSumCodes : []
    const isDifference = String(row.liaisonMode ?? "").toLowerCase() === "difference"

    let total = { ...ZERO }
    let wrote = false

    if (hasFormula) {
      for (const { sign, ref } of parseFormulaRefs(row.formula)) {
        total = addAmounts(total, findAmountsByRef(working, ref), sign)
      }
      wrote = true
    } else if (sumCodes.length > 0) {
      for (const part of working) {
        if (part === row) continue
        if (part.isSection) continue
        // Comme le bilan : sommer les feuilles qui matchent, pas les sous-totaux.
        if (part.isRollup) continue
        if (!String(part.label ?? "").trim()) continue
        if (!sumCodes.some((code) => linkCodeMatchesLiaisonSumCode(part.linkCode, code))) {
          continue
        }
        total = addAmounts(total, part.amounts, isDifference ? -1 : 1)
        wrote = true
      }
    } else {
      const leaves: typeof working = []
      for (let j = i - 1; j >= 0; j--) {
        const prev = working[j]!
        if (prev.isRollup) break
        if (prev.isSection && !prev.indent) break
        if (prev.isSection && prev.indent) continue
        if (!String(prev.label ?? "").trim()) continue
        leaves.unshift(prev)
      }
      let parts = leaves
      if (parts.length === 0) {
        const childTotals: typeof working = []
        let sawIndentedSection = false
        for (let j = i - 1; j >= 0; j--) {
          const prev = working[j]!
          if (prev.isSection && !prev.indent) break
          if (prev.isSection && prev.indent) {
            sawIndentedSection = true
            continue
          }
          if (!String(prev.label ?? "").trim()) continue
          if (prev.isRollup) childTotals.unshift(prev)
        }
        if (sawIndentedSection) parts = childTotals
      }
      if (parts.length > 0) {
        total = parts.reduce((sum, part) => addAmounts(sum, part.amounts), { ...ZERO })
        wrote = true
      }
    }

    if (wrote) row.amounts = total
  }

  const out: Record<string, NetTangibleColumnAmounts> = {}
  for (const row of working) {
    if (!row.rowId) continue
    out[row.rowId] = { ...row.amounts }
  }
  return out
}

/** Construit une ligne de rollup à partir d’une ligne sommaire + structure. */
export function netTangibleRollupRowFromStructure(
  row: {
    label: string
    rowId?: string
    isSection?: boolean
    isResult?: boolean
    indent?: boolean
  },
  structRow: Record<string, unknown> | null | undefined,
): NetTangibleRollupRow {
  const formula = normalizeFormula(structRow?.formula)
  const liaisonMode =
    structRow != null
      ? normalizeLiaisonMode(structRow)
      : undefined
  const liaisonSumCodes = Array.isArray(structRow?.liaisonSumCodes)
    ? (structRow!.liaisonSumCodes as unknown[]).map((c) => String(c ?? "").trim()).filter(Boolean)
    : undefined
  return {
    label: row.label,
    rowId: row.rowId,
    linkCode: structRow ? String(structRow.linkCode ?? "").trim() || undefined : undefined,
    isSection: row.isSection,
    isResult: row.isResult,
    indent: row.indent,
    formula: formula.length > 0 ? formula : undefined,
    liaisonMode,
    liaisonSumCodes,
  }
}

/** VCA = valeur comptable + ajustements ; ACN = VCA − Dettes − Actifs. */
export function netTangibleDerivedAmount(
  bookCurrent: number,
  amounts: NetTangibleColumnAmounts | undefined,
  field: "vca" | "acn",
): number {
  const adjustments = amounts?.adjustments ?? 0
  const debts = amounts?.debts ?? 0
  const assets = amounts?.assets ?? 0
  const vca = bookCurrent + adjustments
  return field === "vca" ? vca : vca - debts - assets
}
