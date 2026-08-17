import type { AccountMappingData, TrialBalanceAccount, TrialBalanceData } from "@/lib/api"
import { formatCalendarMonthYear } from "./financial-period-labels"
import type { DebtForecastLoan } from "./debt-forecast-types"
import { isMappingLiabilityTermLinkCode } from "./standard-link-code-utils"

const MONTH_NAMES_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
] as const

export type DebtOpeningReferencePeriod = {
  fiscalYear: number
  month: number
}

/** Période de balance d'ouverture alignée sur le Pro Forma (date de référence de la projection). */
export function resolveDebtOpeningReferencePeriod(opts: {
  projectionHorizon?: "annual" | "monthly"
  forecastBaseYear: number
  referenceMonth?: number | null
}): DebtOpeningReferencePeriod {
  const { projectionHorizon = "annual", forecastBaseYear, referenceMonth } = opts

  if (projectionHorizon === "monthly") {
    const month = referenceMonth ?? 1
    if (month === 1) {
      return { fiscalYear: forecastBaseYear - 1, month: 12 }
    }
    return { fiscalYear: forecastBaseYear, month: month - 1 }
  }

  return { fiscalYear: forecastBaseYear - 1, month: 12 }
}

export function formatDebtOpeningReferenceLabel(period: DebtOpeningReferencePeriod): string {
  return formatCalendarMonthYear(period.month, period.fiscalYear)
}

export function trialBalanceAmountAtMonth(
  account: TrialBalanceAccount | undefined,
  month: number,
): number {
  if (!account || month < 1 || month > 12) return 0
  const frenchKey = MONTH_NAMES_FR[month - 1]
  const amounts = account.monthly_amounts
  const raw = amounts[frenchKey] ?? amounts[String(month)] ?? 0
  return typeof raw === "number" && Number.isFinite(raw) ? raw : 0
}

export type PltMappingDebtSkipReason = "zero_balance" | "no_tb_row"

export type PltMappingDebtSkip = {
  accountNumber: string
  description: string
  linkCode: string
  reason: PltMappingDebtSkipReason
}

export type BuildDebtLoansFromPltMappingsResult = {
  loans: DebtForecastLoan[]
  skipped: PltMappingDebtSkip[]
}

function loanNameFromMapping(mapping: AccountMappingData): string {
  const num = mapping.account_number.trim()
  const desc = mapping.description.trim()
  if (num && desc) return `${num} — ${desc}`
  return desc || num || "Emprunt"
}

export function buildDebtLoansFromPltMappings(opts: {
  mappings: AccountMappingData[]
  trialBalance: TrialBalanceData
  referencePeriod: DebtOpeningReferencePeriod
}): BuildDebtLoansFromPltMappingsResult {
  const { mappings, trialBalance, referencePeriod } = opts
  const tbByAccount = new Map(trialBalance.accounts.map((a) => [a.account_number, a]))
  const loans: DebtForecastLoan[] = []
  const skipped: PltMappingDebtSkip[] = []

  for (const mapping of mappings) {
    const linkCode = mapping.link_code?.trim() ?? ""
    if (!isMappingLiabilityTermLinkCode(linkCode)) continue

    const baseSkip = {
      accountNumber: mapping.account_number,
      description: mapping.description,
      linkCode,
    }

    const tbRow = tbByAccount.get(mapping.account_number)
    if (!tbRow) {
      skipped.push({ ...baseSkip, reason: "no_tb_row" })
      continue
    }

    const rawBalance = trialBalanceAmountAtMonth(tbRow, referencePeriod.month)
    const principal = Math.abs(rawBalance)
    if (principal < 0.01) {
      skipped.push({ ...baseSkip, reason: "zero_balance" })
      continue
    }

    loans.push({
      id: `plt-mapping-${mapping.id}`,
      name: loanNameFromMapping(mapping),
      principal,
      interestRate: 0,
      remainingPayments: 0,
      startMonth: 0,
      repaymentMode: "capital_and_interest",
      sourceType: "mapping",
      sourceMappingId: mapping.id,
      sourceAccountNumber: mapping.account_number,
      sourceLinkCode: linkCode,
      referenceFiscalYear: referencePeriod.fiscalYear,
      referenceMonth: referencePeriod.month,
      hypothesisDefined: false,
    })
  }

  loans.sort((a, b) =>
    (a.sourceAccountNumber ?? a.name).localeCompare(b.sourceAccountNumber ?? b.name, "fr", {
      numeric: true,
    }),
  )

  return { loans, skipped }
}

/** Conserve les emprunts Capex / manuels ; synchronise les emprunts issus du mapping PLT. */
export function mergeDebtForecastLoans(
  existing: DebtForecastLoan[],
  mappingLoans: DebtForecastLoan[],
): DebtForecastLoan[] {
  const existingMappingBySourceId = new Map(
    existing.filter((l) => l.sourceMappingId).map((l) => [l.sourceMappingId!, l]),
  )

  const preserved = existing.filter(
    (l) => l.sourceType === "capex" || (!l.sourceMappingId && l.sourceType !== "mapping"),
  )

  const mergedMapping = mappingLoans.map((fresh) => {
    const prev = existingMappingBySourceId.get(fresh.sourceMappingId!)
    if (!prev) return fresh
    return {
      ...fresh,
      id: prev.id,
      name: prev.name,
      startMonth: prev.startMonth,
      repaymentMode: prev.repaymentMode ?? fresh.repaymentMode,
      interestRate: prev.interestRate,
      remainingPayments: prev.remainingPayments,
      paymentAmount: prev.paymentAmount,
      balloonAmount: prev.balloonAmount,
      balloonMonth: prev.balloonMonth,
      moratoriumMonths: prev.moratoriumMonths,
      moratoriumScope: prev.moratoriumScope,
      hypothesisDefined: prev.hypothesisDefined ?? prev.remainingPayments >= 1,
    }
  })

  return [...preserved, ...mergedMapping]
}

export function pltMappingDebtSkipLabel(reason: PltMappingDebtSkipReason): string {
  switch (reason) {
    case "zero_balance":
      return "solde nul à la date de référence"
    case "no_tb_row":
      return "absent de la balance de vérification"
  }
}
