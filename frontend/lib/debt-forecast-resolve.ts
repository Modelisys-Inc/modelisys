/**
 * Résolution des soldes Hypothèses Financement → Estimation du Bilan annuel.
 * Sans emprunt défini pour le code → 0 $ en année projetée.
 */

import { calculateLoanYearAmortization } from "@/lib/debt-amortization-utils"
import {
  isDebtHypothesisDefined,
  type DebtForecastLoan,
} from "@/lib/debt-forecast-types"
import { isFinancingBilanLinkCode } from "@/lib/standard-link-code-utils"

export const DEBT_FORECAST_CONFIG_TYPE = "debt-forecast"

export function parseDebtForecastLoans(data: unknown): DebtForecastLoan[] {
  if (!data || typeof data !== "object" || Array.isArray(data)) return []
  const raw = (data as { loans?: unknown }).loans
  if (!Array.isArray(raw)) return []
  return raw.filter((loan): loan is DebtForecastLoan => !!loan && typeof loan === "object")
}

function normalizeLinkCode(code: string | null | undefined): string {
  return String(code ?? "").trim().toUpperCase()
}

/** Emprunt rattaché au poste bilan (même code ou parent/feuille). */
export function debtLoanMatchesBilanLinkCode(
  sourceLinkCode: string | null | undefined,
  bilanLinkCode: string | null | undefined,
): boolean {
  const src = normalizeLinkCode(sourceLinkCode)
  const code = normalizeLinkCode(bilanLinkCode)
  if (!src || !code) return false
  return src === code || src.startsWith(`${code}.`) || code.startsWith(`${src}.`)
}

/**
 * configYearIndex Capex/bilan : 0 = réel, 1+ = projeté.
 * Amortissement dette : 0 = 1re année projetée → amortYear = configYearIndex - 1.
 */
export function debtAmortYearIndexFromBilanConfigYear(configYearIndex: number): number | null {
  if (configYearIndex <= 0) return null
  return configYearIndex - 1
}

/**
 * Solde de fin d’exercice projeté pour un poste Financement.
 * Somme des `endingBalance` des emprunts définis dont `sourceLinkCode` matche.
 */
export function resolveFinancingDrivenBilanProjectedAmount(params: {
  linkCode?: string | null
  rowId?: string | null
  configYearIndex: number
  actualBase: number
  loans: DebtForecastLoan[]
}): number {
  const { linkCode, rowId, configYearIndex, actualBase, loans } = params
  if (configYearIndex <= 0) return actualBase

  const bilanCode = normalizeLinkCode(linkCode) || normalizeLinkCode(rowId)
  if (!bilanCode || !isFinancingBilanLinkCode(bilanCode)) return 0

  const amortYear = debtAmortYearIndexFromBilanConfigYear(configYearIndex)
  if (amortYear == null) return actualBase

  let sum = 0
  let any = false
  for (const loan of loans) {
    if (!isDebtHypothesisDefined(loan)) continue
    if (!debtLoanMatchesBilanLinkCode(loan.sourceLinkCode, bilanCode)) continue
    const year = calculateLoanYearAmortization(loan, amortYear)
    if (!year) continue
    sum += year.endingBalance
    any = true
  }
  return any ? sum : 0
}
