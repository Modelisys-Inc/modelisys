/**
 * Contexte budgétaire pour la lecture Performance financière (Pilotage).
 * Renseigné lorsqu'un budget prévisionnel est disponible ; sinon `null`.
 */
export type PilotageRevenueBudgetSnapshot = {
  /** Budget du mois de référence. */
  monthlyRevenue: number
  /** Budget cumulé depuis le début d'exercice jusqu'au mois de référence. */
  ytdRevenue: number
  /** Budget sur douze mois glissants (optionnel). */
  ttmRevenue?: number | null
}

export type PilotagePerformanceBudgetSnapshot = {
  revenue: PilotageRevenueBudgetSnapshot
  contributiveMargin: {
    monthlyPercent: number
    ytdPercent: number
    ttmPercent?: number | null
  }
  ebita: {
    monthlyEbita: number
    ytdEbita: number
    ttmEbita?: number | null
  }
}

export type PilotageRevenueBudgetResolverInput = {
  companyId: string
  refMonth: number
  refYear: number
  fiscalYear: number
}

/**
 * Résout les montants budgétaires pour la lecture Pilotage.
 * Retourne `null` tant qu'aucun budget n'est branché (comportement actuel).
 */
export function resolvePilotagePerformanceBudget(
  _input: PilotageRevenueBudgetResolverInput,
): PilotagePerformanceBudgetSnapshot | null {
  return null
}

/** @deprecated Utiliser `resolvePilotagePerformanceBudget`. */
export function resolvePilotageRevenueBudget(
  input: PilotageRevenueBudgetResolverInput,
): PilotageRevenueBudgetSnapshot | null {
  return resolvePilotagePerformanceBudget(input)?.revenue ?? null
}

export function hasPilotageRevenueBudget(
  budget: PilotageRevenueBudgetSnapshot | null | undefined,
): budget is PilotageRevenueBudgetSnapshot {
  return budget != null
}

export function hasPilotagePerformanceBudget(
  budget: PilotagePerformanceBudgetSnapshot | null | undefined,
): budget is PilotagePerformanceBudgetSnapshot {
  return budget != null
}
