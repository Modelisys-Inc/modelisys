/**
 * Résolution des soldes Hypothèses Financement → Estimation du Bilan annuel.
 * Sans emprunt défini pour le code → 0 $ en année projetée.
 *
 * PCT-H / PCT-I : capital + intérêts des 12 prochains mois (amortYear + 1).
 * PLT-C / PLT-D : solde de fin d'exercice − capital des 12 prochains mois
 * (les intérêts ne réduisent pas le principal — sinon soldes LT négatifs).
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
 * PCT-H/I sont alimentés par les emprunts mappés sur PLT-C/D (pas de prêts PCT-*).
 * Retourne le code LT utilisé pour matcher les emprunts.
 */
export function financingBilanLoanMatchCode(bilanLinkCode: string): string | null {
  const code = normalizeLinkCode(bilanLinkCode)
  if (!code) return null
  if (code === "PCT-H" || code.startsWith("PCT-H.")) {
    return code === "PCT-H" ? "PLT-C" : code.replace(/^PCT-H/, "PLT-C")
  }
  if (code === "PCT-I" || code.startsWith("PCT-I.")) {
    return code === "PCT-I" ? "PLT-D" : code.replace(/^PCT-I/, "PLT-D")
  }
  if (code === "PLT-C" || code.startsWith("PLT-C.")) return code
  if (code === "PLT-D" || code.startsWith("PLT-D.")) return code
  return null
}

export function isFinancingBilanCurrentPortionCode(bilanLinkCode: string): boolean {
  const code = normalizeLinkCode(bilanLinkCode)
  return (
    code === "PCT-H" ||
    code.startsWith("PCT-H.") ||
    code === "PCT-I" ||
    code.startsWith("PCT-I.")
  )
}

/**
 * configYearIndex Capex/bilan : 0 = réel, 1+ = projeté.
 * Amortissement dette : 0 = 1re année projetée → amortYear = configYearIndex - 1.
 */
export function debtAmortYearIndexFromBilanConfigYear(configYearIndex: number): number | null {
  if (configYearIndex <= 0) return null
  return configYearIndex - 1
}

function loanNext12MonthsAmortization(loan: DebtForecastLoan, amortYear: number) {
  return calculateLoanYearAmortization(loan, amortYear + 1)
}

function loanNext12MonthsPayment(loan: DebtForecastLoan, amortYear: number): number {
  return loanNext12MonthsAmortization(loan, amortYear)?.totalPayment ?? 0
}

function loanNext12MonthsPrincipal(loan: DebtForecastLoan, amortYear: number): number {
  return loanNext12MonthsAmortization(loan, amortYear)?.principalPayment ?? 0
}

/**
 * Solde projeté pour un poste Financement (PCT-H/I ou PLT-C/D).
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

  const loanMatchCode = financingBilanLoanMatchCode(bilanCode)
  if (!loanMatchCode) return 0

  const amortYear = debtAmortYearIndexFromBilanConfigYear(configYearIndex)
  if (amortYear == null) return actualBase

  const isCurrentPortion = isFinancingBilanCurrentPortionCode(bilanCode)

  let sum = 0
  let any = false
  for (const loan of loans) {
    if (!isDebtHypothesisDefined(loan)) continue
    if (!debtLoanMatchesBilanLinkCode(loan.sourceLinkCode, loanMatchCode)) continue
    const year = calculateLoanYearAmortization(loan, amortYear)
    if (!year) continue

    if (isCurrentPortion) {
      sum += loanNext12MonthsPayment(loan, amortYear)
    } else {
      // Portion LT = principal restant après l’échéance des 12 mois — jamais négatif.
      sum += Math.max(0, year.endingBalance - loanNext12MonthsPrincipal(loan, amortYear))
    }
    any = true
  }
  return any ? sum : 0
}
