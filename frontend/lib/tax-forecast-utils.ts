export const TAX_FORECAST_CONFIG_TYPE = "tax-forecast"
export const TAX_FORECAST_TITLE = "Estimation des Impôts"
export const DEFAULT_TAX_RATE = 26

/** Fréquence de paiement des impôts (hypothèses). */
export const TAX_PAYMENT_FREQUENCIES = [
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
] as const

export type TaxPaymentFrequency = (typeof TAX_PAYMENT_FREQUENCIES)[number]

export const DEFAULT_TAX_PAYMENT_FREQUENCY: TaxPaymentFrequency = "annual"

export const TAX_PAYMENT_FREQUENCY_LABELS: Record<TaxPaymentFrequency, string> = {
  monthly: "Mensuel",
  quarterly: "Trimestriel",
  semiannual: "Semestriel",
  annual: "Annuel",
}

export function parseTaxRate(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return DEFAULT_TAX_RATE
  return Math.min(100, Math.max(0, raw))
}

export function parseTaxPaymentFrequency(raw: unknown): TaxPaymentFrequency {
  if (typeof raw === "string" && (TAX_PAYMENT_FREQUENCIES as readonly string[]).includes(raw)) {
    return raw as TaxPaymentFrequency
  }
  return DEFAULT_TAX_PAYMENT_FREQUENCY
}

export type TaxForecastData = {
  taxRate: number
  taxPaymentFrequency: TaxPaymentFrequency
}

export function parseTaxForecastData(raw: unknown): TaxForecastData {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  return {
    taxRate: parseTaxRate(data.taxRate),
    taxPaymentFrequency: parseTaxPaymentFrequency(data.taxPaymentFrequency),
  }
}
