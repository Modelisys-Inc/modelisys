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
