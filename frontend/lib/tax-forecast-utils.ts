export const TAX_FORECAST_CONFIG_TYPE = "tax-forecast"
export const TAX_FORECAST_TITLE = "Estimation des Impôts"
export const DEFAULT_TAX_RATE = 26

export function parseTaxRate(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return DEFAULT_TAX_RATE
  return Math.min(100, Math.max(0, raw))
}
