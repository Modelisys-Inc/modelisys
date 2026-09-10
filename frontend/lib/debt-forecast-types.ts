/** Types partagés entre le module Dette et le financement Capex. */

export type DebtRepaymentMode =
  | "interest_only"
  | "capital_and_interest"
  /** @deprecated Migré vers `interest_only` + champs balloon. Conservé pour lecture legacy. */
  | "interest_only_balloon"

/** Portée du moratoire (Capital et intérêts). Intérêts seulement = toujours les intérêts. */
export type DebtMoratoriumScope = "interest" | "capital" | "both"

export interface DebtForecastLoan {
  id: string
  name: string
  /** Montant emprunté (capital initial). */
  principal: number
  /** Taux d'intérêt annuel fixe (%). */
  interestRate: number
  /** Nombre de paiements mensuels restants. */
  remainingPayments: number
  paymentAmount?: number
  /** Mois de début (0 = janvier de la première année projetée). */
  startMonth: number
  repaymentMode?: DebtRepaymentMode
  /** Montant du paiement résiduel (intérêts seulement avec résiduel). */
  balloonAmount?: number
  /** Mois du paiement résiduel (0-based, aligné sur startMonth). */
  balloonMonth?: number
  /**
   * Mois de moratoire à compter de `startMonth` (inclus).
   * Pendant cette fenêtre : pas de paiement selon `moratoriumScope`.
   */
  moratoriumMonths?: number
  /**
   * Portée du moratoire.
   * - Intérêts seulement : toujours traité comme « interest ».
   * - Capital et intérêts : interest | capital | both.
   */
  moratoriumScope?: DebtMoratoriumScope
  /** Clé capex source `${rowId}-${yearIndex}` si créé depuis un projet Capex. */
  sourceCapexKey?: string
  /** ID du mapping comptable source (passif PLT). */
  sourceMappingId?: string
  sourceAccountNumber?: string
  sourceLinkCode?: string
  referenceFiscalYear?: number
  referenceMonth?: number
  sourceType?: "capex" | "manual" | "mapping"
  /**
   * Hypothèse (taux, durée, remboursement) confirmée dans Financement.
   * Les emprunts mapping sans ce flag (ni terme déjà stocké) sont à définir.
   */
  hypothesisDefined?: boolean
}

export function isDebtHypothesisDefined(
  loan: Pick<DebtForecastLoan, "sourceType" | "hypothesisDefined" | "remainingPayments">,
): boolean {
  if (loan.sourceType !== "mapping") return true
  if (loan.hypothesisDefined === true) return true
  if (loan.hypothesisDefined === false) return false
  return loan.remainingPayments >= 1
}

export const DEBT_REPAYMENT_MODE_LABELS: Record<DebtRepaymentMode, string> = {
  interest_only: "Intérêts seulement",
  capital_and_interest: "Capital et intérêt",
  interest_only_balloon: "Intérêts seulement",
}

/** Modes exposés dans l’UI Capex (le résiduel est une option de « Intérêts seulement »). */
export const CAPEX_DEBT_REPAYMENT_MODES: DebtRepaymentMode[] = [
  "interest_only",
  "capital_and_interest",
]

export const DEBT_MORATORIUM_SCOPE_LABELS: Record<DebtMoratoriumScope, string> = {
  interest: "Intérêts",
  capital: "Capital",
  both: "Capital et intérêts",
}

export const DEBT_MORATORIUM_SCOPE_HINTS: Record<DebtMoratoriumScope, string> = {
  interest: "Aucun paiement d'intérêts pendant X mois ; le capital continue d'être remboursé.",
  capital: "Aucun remboursement de capital pendant X mois ; les intérêts continuent d'être payés.",
  both: "Aucun paiement (capital ni intérêts) pendant X mois.",
}
