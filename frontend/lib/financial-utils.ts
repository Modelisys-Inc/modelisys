export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function calculateVariation(current: number, prior: number): number {
  if (prior === 0) return 0
  return ((current - prior) / prior) * 100
}

/** Part d’un montant dans le chiffre d’affaires (valeur absolue), ex. « 12.4% ». */
export function formatShareOfRevenuePct(
  amount: number,
  revenue: number | null | undefined,
  options?: { omitPercentSign?: boolean },
): string {
  if (revenue == null || !Number.isFinite(revenue) || Math.abs(revenue) < 1e-9) return "-"
  if (!Number.isFinite(amount) || amount === 0) return "-"
  const value = ((Math.abs(amount) / Math.abs(revenue)) * 100).toFixed(1)
  return options?.omitPercentSign ? value : `${value}%`
}

/**
 * Compact monetary formatter for narrow table cells.
 * 12345.67 -> "12.3k"; -4500 -> "(4.5k)"; 12 -> "12.00"; 0 -> "—".
 */
export function formatCompactAmount(value: number): string {
  if (value === 0) return "—"
  const abs = Math.abs(value)
  const formatted =
    abs >= 1_000_000
      ? `${(abs / 1_000_000).toFixed(1)}m`
      : abs >= 1_000
      ? `${(abs / 1_000).toFixed(1)}k`
      : abs.toFixed(2)
  return value < 0 ? `(${formatted})` : formatted
}
