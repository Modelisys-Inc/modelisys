import { normLabel } from "@/lib/income-statement-structure-utils"

const EPSILON = 1e-9

export type IncomeStatementHorizonView =
  | "current"
  | "comparison"
  | "ytd"
  | "ddm"
  | "12months"
  | "24months"
  | "quarters"
  | "years"

export interface HorizonDisplayAmounts {
  current?: number
  prior?: number
  trendValues?: number[]
}

function isEffectivelyZero(n: number | undefined | null): boolean {
  return !Number.isFinite(Number(n)) || Math.abs(Number(n)) < EPSILON
}

/** Au moins un montant non nul pour l’horizon affiché (ex. mois courant vs 5 ans annuels). */
export function rowHasNonZeroAmountsForHorizon(
  amounts: HorizonDisplayAmounts,
  view: IncomeStatementHorizonView,
): boolean {
  if (view === "12months" || view === "24months" || view === "quarters" || view === "years") {
    const tv = amounts.trendValues ?? []
    if (tv.length === 0) return false
    return tv.some((v) => !isEffectivelyZero(v))
  }
  if (view === "comparison" || view === "ytd" || view === "ddm") {
    return !isEffectivelyZero(amounts.current) || !isEffectivelyZero(amounts.prior)
  }
  return !isEffectivelyZero(amounts.current)
}

/** Lignes de structure toujours visibles (totaux / intercalaires), indépendamment des montants. */
export function isStructuralIncomeStatementRowAlwaysVisible(
  label: string,
  opts?: { isResult?: boolean; hasFormula?: boolean },
): boolean {
  if (!String(label ?? "").trim()) return true
  if (opts?.isResult) return true
  if (opts?.hasFormula) return true
  const lab = normLabel(label)
  return lab === "charges d'exploitation" || lab === "total des charges"
}

export function amountsForHorizonFromTrendMap(
  amounts: Record<string, number> | undefined,
  periodKeys: string[],
): HorizonDisplayAmounts {
  if (!amounts || periodKeys.length === 0) {
    return { trendValues: [] }
  }
  const trendValues = periodKeys.map((k) => amounts[k] ?? 0)
  return {
    current: trendValues[0] ?? 0,
    prior: trendValues[1] ?? 0,
    trendValues,
  }
}
