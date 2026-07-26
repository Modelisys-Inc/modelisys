/** Types partagés entre le module Dette et le financement Capex. */

export type DebtRepaymentMode =
  | "interest_only"
  | "capital_and_interest"
  | "interest_only_balloon"

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
  /** Montant du paiement résiduel (mode interest_only_balloon). */
  balloonAmount?: number
  /** Mois du paiement résiduel (0-based, aligné sur startMonth). */
  balloonMonth?: number
  /** Clé capex source `${rowId}-${yearIndex}` si créé depuis un projet Capex. */
  sourceCapexKey?: string
  /** ID du mapping comptable source (passif PLT). */
  sourceMappingId?: string
  sourceAccountNumber?: string
  sourceLinkCode?: string
  referenceFiscalYear?: number
  referenceMonth?: number
  sourceType?: "capex" | "manual" | "mapping"
}

export const DEBT_REPAYMENT_MODE_LABELS: Record<DebtRepaymentMode, string> = {
  interest_only: "Intérêts seulement",
  capital_and_interest: "Capital et intérêt",
  interest_only_balloon: "Intérêts seulement avec paiement résiduel",
}

export const CAPEX_DEBT_REPAYMENT_MODES: DebtRepaymentMode[] = [
  "interest_only",
  "capital_and_interest",
  "interest_only_balloon",
]
