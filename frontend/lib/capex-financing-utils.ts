import { generateId } from "@/lib/seeded-random"
import { listForecastConfigs, upsertForecastConfig } from "@/lib/api"
import {
  calculateLoanYearAmortization,
  calculatePreviewMonthlyPayment,
  type LoanYearAmortization,
} from "@/lib/debt-amortization-utils"
import type {
  DebtForecastLoan,
  DebtMoratoriumScope,
  DebtRepaymentMode,
} from "@/lib/debt-forecast-types"

export type { LoanYearAmortization }

export type CapexFinancingMode = "cash" | "financed" | "mixed"

export interface CapexProjectDate {
  year: number
  month: number
}

export interface CapexDebtParams {
  interestRate: number
  termMonths: number
  repaymentMode: DebtRepaymentMode
  firstPaymentDate: CapexProjectDate
  /** Paiement résiduel (option de « Intérêts seulement »). */
  balloonAmount?: number
  balloonPaymentDate?: CapexProjectDate
  /** Mois sans paiement (à compter de firstPaymentDate). */
  moratoriumMonths?: number
  /**
   * Portée du moratoire (Capital et intérêts).
   * Intérêts seulement : toujours les intérêts (ignoré).
   */
  moratoriumScope?: DebtMoratoriumScope
}

export interface CapexFinancingConfig {
  projectName: string
  totalAmount: number
  serviceDate: CapexProjectDate
  mode: CapexFinancingMode
  /** Mise de fonds (mode mixte). */
  downPayment?: number
  /** Montant emprunté (financement / mixte). */
  financedAmount?: number
  debt?: CapexDebtParams
  /** ID du prêt lié dans debt-forecast. */
  linkedLoanId?: string
}

export function adjustmentYearIndexToCalendarYear(
  adjustmentYearIndex: number,
  forecastBaseYear: number,
): number {
  if (adjustmentYearIndex <= 0) return forecastBaseYear - 1
  return forecastBaseYear + adjustmentYearIndex - 1
}

export function createDefaultCapexFinancing(
  projectName = "",
  totalAmount = 0,
  forecastBaseYear?: number,
  adjustmentYearIndex = 1,
): CapexFinancingConfig {
  const year = adjustmentYearIndexToCalendarYear(
    adjustmentYearIndex,
    forecastBaseYear ?? new Date().getFullYear() + 1,
  )
  return {
    projectName,
    totalAmount,
    serviceDate: { year, month: 1 },
    mode: "cash",
  }
}

export function parseCapexFinancingFromStorage(raw: unknown): CapexFinancingConfig | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const mode = o.mode
  if (mode !== "cash" && mode !== "financed" && mode !== "mixed") return null
  const serviceDate = parseProjectDate(o.serviceDate)
  if (!serviceDate) return null
  const debt = parseDebtParams(o.debt)
  return {
    projectName: typeof o.projectName === "string" ? o.projectName : "",
    totalAmount: typeof o.totalAmount === "number" ? o.totalAmount : 0,
    serviceDate,
    mode,
    downPayment: typeof o.downPayment === "number" ? o.downPayment : undefined,
    financedAmount: typeof o.financedAmount === "number" ? o.financedAmount : undefined,
    debt: debt ?? undefined,
    linkedLoanId: typeof o.linkedLoanId === "string" ? o.linkedLoanId : undefined,
  }
}

function parseProjectDate(raw: unknown): CapexProjectDate | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const year = typeof o.year === "number" ? o.year : null
  const month = typeof o.month === "number" ? o.month : null
  if (year == null || month == null || month < 1 || month > 12) return null
  return { year, month }
}

function parseDebtParams(raw: unknown): CapexDebtParams | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const firstPaymentDate = parseProjectDate(o.firstPaymentDate)
  if (!firstPaymentDate) return null
  const legacyBalloonMode = o.repaymentMode === "interest_only_balloon" || o.repaymentMode === "balloon"
  const repaymentMode = parseRepaymentMode(o.repaymentMode)
  const balloonPaymentDate = parseProjectDate(o.balloonPaymentDate)
  const balloonAmount = typeof o.balloonAmount === "number" ? o.balloonAmount : undefined
  const moratoriumMonths =
    typeof o.moratoriumMonths === "number" ? Math.max(0, Math.round(o.moratoriumMonths)) : 0
  return {
    interestRate: typeof o.interestRate === "number" ? o.interestRate : 5,
    termMonths: typeof o.termMonths === "number" ? o.termMonths : 60,
    repaymentMode,
    firstPaymentDate,
    balloonAmount,
    balloonPaymentDate:
      balloonPaymentDate ?? (legacyBalloonMode ? { ...firstPaymentDate } : undefined),
    moratoriumMonths,
    moratoriumScope: parseMoratoriumScope(o.moratoriumScope),
  }
}

function parseMoratoriumScope(raw: unknown): DebtMoratoriumScope {
  if (raw === "interest" || raw === "capital" || raw === "both") return raw
  return "both"
}

function parseRepaymentMode(raw: unknown): DebtRepaymentMode {
  // Legacy : intérêts + résiduel → intérêts seulement (champs balloon conservés).
  if (raw === "interest_only_balloon" || raw === "balloon") return "interest_only"
  if (
    raw === "capital_and_interest" ||
    raw === "constant_payment" ||
    raw === "constant_principal"
  ) {
    return "capital_and_interest"
  }
  return "interest_only"
}

/** Mois 0-based depuis janvier de la première année projetée. */
export function projectDateToStartMonth(
  date: CapexProjectDate,
  forecastBaseYear: number,
): number {
  return (date.year - forecastBaseYear) * 12 + (date.month - 1)
}

export function startMonthToProjectDate(
  startMonth: number,
  forecastBaseYear: number,
): CapexProjectDate {
  const year = forecastBaseYear + Math.floor(startMonth / 12)
  const month = (startMonth % 12) + 1
  return { year, month }
}

export function loanToCapexDebtParams(
  loan: Pick<
    DebtForecastLoan,
    | "interestRate"
    | "remainingPayments"
    | "startMonth"
    | "repaymentMode"
    | "balloonAmount"
    | "balloonMonth"
    | "moratoriumMonths"
    | "moratoriumScope"
  >,
  forecastBaseYear: number,
): CapexDebtParams {
  const repaymentMode =
    loan.repaymentMode === "capital_and_interest" ? "capital_and_interest" : "interest_only"
  return {
    interestRate: loan.interestRate,
    termMonths: loan.remainingPayments,
    repaymentMode,
    firstPaymentDate: startMonthToProjectDate(loan.startMonth ?? 0, forecastBaseYear),
    balloonAmount: loan.balloonAmount,
    balloonPaymentDate:
      loan.balloonMonth != null
        ? startMonthToProjectDate(loan.balloonMonth, forecastBaseYear)
        : undefined,
    moratoriumMonths: loan.moratoriumMonths ?? 0,
    moratoriumScope:
      loan.moratoriumScope ?? (repaymentMode === "capital_and_interest" ? "both" : "interest"),
  }
}

export function applyCapexDebtParamsToLoan(
  loan: DebtForecastLoan,
  debt: CapexDebtParams,
  forecastBaseYear: number,
): DebtForecastLoan {
  const repaymentMode =
    debt.repaymentMode === "capital_and_interest" ? "capital_and_interest" : "interest_only"
  return {
    ...loan,
    interestRate: debt.interestRate,
    remainingPayments: debt.termMonths,
    startMonth: projectDateToStartMonth(debt.firstPaymentDate, forecastBaseYear),
    repaymentMode,
    balloonAmount: debt.balloonAmount,
    balloonMonth: debt.balloonPaymentDate
      ? projectDateToStartMonth(debt.balloonPaymentDate, forecastBaseYear)
      : undefined,
    moratoriumMonths: debt.moratoriumMonths ?? 0,
    moratoriumScope: repaymentMode === "capital_and_interest" ? (debt.moratoriumScope ?? "both") : "interest",
  }
}

export function computeFinancedAmount(config: CapexFinancingConfig): number {
  if (config.mode === "cash") return 0
  if (config.mode === "financed") return config.totalAmount
  const down = config.downPayment ?? 0
  return Math.max(0, config.totalAmount - down)
}

export function computeCashDisbursementAmount(config: CapexFinancingConfig): number {
  if (config.mode === "cash") return config.totalAmount
  if (config.mode === "mixed") return config.downPayment ?? 0
  return 0
}

export function normalizeCapexFinancing(
  draft: CapexFinancingConfig,
  forecastBaseYear: number,
): CapexFinancingConfig {
  const totalAmount = Math.max(0, draft.totalAmount)
  const mode = draft.mode
  let downPayment = draft.downPayment
  let financedAmount = draft.financedAmount
  let debt = draft.debt

  if (mode === "cash") {
    downPayment = undefined
    financedAmount = undefined
    debt = undefined
  } else if (mode === "financed") {
    downPayment = undefined
    financedAmount = totalAmount
    if (financedAmount > 0 && !debt) {
      debt = defaultDebtParams(draft.serviceDate)
    }
  } else {
    downPayment = Math.min(Math.max(0, downPayment ?? 0), totalAmount)
    financedAmount = Math.max(0, totalAmount - downPayment)
    if (financedAmount > 0 && !debt) {
      debt = defaultDebtParams(draft.serviceDate)
    }
    if (financedAmount === 0) debt = undefined
  }

  return {
    ...draft,
    projectName: draft.projectName.trim(),
    totalAmount,
    downPayment,
    financedAmount,
    debt,
  }
}

function defaultDebtParams(serviceDate: CapexProjectDate): CapexDebtParams {
  return {
    interestRate: 5,
    termMonths: 60,
    repaymentMode: "interest_only",
    firstPaymentDate: { ...serviceDate },
    balloonAmount: undefined,
    balloonPaymentDate: undefined,
    moratoriumMonths: 0,
    moratoriumScope: "both",
  }
}

export function debtHasResidualPayment(debt: CapexDebtParams): boolean {
  return (debt.balloonAmount ?? 0) > 0 && debt.balloonPaymentDate != null
}

export function capexFinancingSaveOk(config: CapexFinancingConfig): boolean {
  if (!config.projectName.trim()) return false
  if (config.totalAmount <= 0) return false
  if (config.mode === "mixed") {
    const down = config.downPayment ?? 0
    if (down < 0 || down > config.totalAmount) return false
  }
  const financed = computeFinancedAmount(config)
  if (financed > 0) {
    const debt = config.debt
    if (!debt) return false
    if (debt.interestRate < 0 || debt.termMonths <= 0) return false
    if ((debt.moratoriumMonths ?? 0) < 0) return false
    if (debtHasResidualPayment(debt) || debt.repaymentMode === "interest_only_balloon") {
      if ((debt.balloonAmount ?? 0) <= 0) return false
      if (!debt.balloonPaymentDate) return false
    }
  }
  return true
}

export function calendarYearToLoanYearIndex(calendarYear: number, forecastBaseYear: number): number {
  return calendarYear - forecastBaseYear
}

export function computeCapexDebtPaymentPreview(
  config: CapexFinancingConfig,
  forecastBaseYear: number,
  calendarYear: number,
): {
  loanYearIndex: number
  yearData: LoanYearAmortization | null
  monthlyPayment: number
  repaymentMode: DebtRepaymentMode
} | null {
  const loan = buildDebtLoanFromCapexFinancing(config, "", forecastBaseYear)
  if (!loan) return null
  const loanYearIndex = calendarYearToLoanYearIndex(calendarYear, forecastBaseYear)
  const yearData = calculateLoanYearAmortization(loan, loanYearIndex)
  const monthlyPayment = calculatePreviewMonthlyPayment(loan)
  return {
    loanYearIndex,
    yearData,
    monthlyPayment,
    repaymentMode: loan.repaymentMode ?? "interest_only",
  }
}

export function buildDebtLoanFromCapexFinancing(
  config: CapexFinancingConfig,
  capexKey: string,
  forecastBaseYear: number,
  existingLoanId?: string,
): DebtForecastLoan | null {
  const financed = computeFinancedAmount(config)
  if (financed <= 0 || !config.debt) return null

  const startMonth = projectDateToStartMonth(config.debt.firstPaymentDate, forecastBaseYear)

  const hasBalloon =
    debtHasResidualPayment(config.debt) || config.debt.repaymentMode === "interest_only_balloon"
  const balloonMonth =
    hasBalloon && config.debt.balloonPaymentDate
      ? projectDateToStartMonth(config.debt.balloonPaymentDate, forecastBaseYear)
      : undefined

  return {
    id: existingLoanId ?? generateId(),
    name: config.projectName.trim() || "Projet Capex",
    principal: financed,
    interestRate: config.debt.interestRate,
    remainingPayments: config.debt.termMonths,
    startMonth,
    repaymentMode:
      config.debt.repaymentMode === "interest_only_balloon"
        ? "interest_only"
        : config.debt.repaymentMode,
    balloonAmount: hasBalloon ? config.debt.balloonAmount : undefined,
    balloonMonth,
    moratoriumMonths: Math.max(0, Math.round(config.debt.moratoriumMonths ?? 0)),
    moratoriumScope:
      config.debt.repaymentMode === "capital_and_interest"
        ? (config.debt.moratoriumScope ?? "both")
        : "interest",
    sourceCapexKey: capexKey,
    sourceType: "capex",
  }
}

/** Fusionne ou retire le prêt lié dans debt-forecast. */
export async function syncCapexFinancingToDebtForecast(opts: {
  companyId: string
  projectionId?: string | null
  capexKey: string
  financing: CapexFinancingConfig
  forecastBaseYear: number
}): Promise<CapexFinancingConfig> {
  const { companyId, projectionId, capexKey, financing, forecastBaseYear } = opts
  const normalized = normalizeCapexFinancing(financing, forecastBaseYear)
  const financed = computeFinancedAmount(normalized)

  const configs = await listForecastConfigs(companyId, {
    config_type: "debt-forecast",
    projection_id: projectionId ?? undefined,
  })

  let loans: DebtForecastLoan[] = []
  if (configs.length > 0 && Array.isArray((configs[0].data as Record<string, unknown>).loans)) {
    loans = (configs[0].data as { loans: DebtForecastLoan[] }).loans.map((l) => ({
      ...l,
      startMonth: l.startMonth ?? 0,
    }))
  }

  const existingIdx = loans.findIndex(
    (l) => l.id === normalized.linkedLoanId || l.sourceCapexKey === capexKey,
  )

  if (financed <= 0 || !normalized.debt) {
    if (existingIdx >= 0) {
      loans = loans.filter((_, i) => i !== existingIdx)
    }
    await upsertForecastConfig(companyId, {
      config_type: "debt-forecast",
      data: { loans },
      projection_id: projectionId ?? undefined,
    })
    return { ...normalized, linkedLoanId: undefined }
  }

  const loan = buildDebtLoanFromCapexFinancing(
    normalized,
    capexKey,
    forecastBaseYear,
    existingIdx >= 0 ? loans[existingIdx]?.id : normalized.linkedLoanId,
  )
  if (!loan) return normalized

  if (existingIdx >= 0) {
    loans = loans.map((l, i) => (i === existingIdx ? loan : l))
  } else {
    loans = [...loans, loan]
  }

  await upsertForecastConfig(companyId, {
    config_type: "debt-forecast",
    data: { loans },
    projection_id: projectionId ?? undefined,
  })

  return { ...normalized, linkedLoanId: loan.id }
}
