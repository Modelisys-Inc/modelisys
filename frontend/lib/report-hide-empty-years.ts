/** Retire les années où toutes les lignes sont nulles ou ~0. */
export function hideEmptyYears<T extends { values: (number | null)[] }>(
  years: number[],
  rows: T[],
): { years: number[]; rows: T[] } {
  if (!years.length) return { years, rows }

  const keepIndices = years.map((_, i) =>
    rows.some((row) => {
      const v = row.values[i]
      return v != null && Number.isFinite(v) && Math.abs(v) > 1e-6
    }),
  )

  const filteredYears = years.filter((_, i) => keepIndices[i])
  const filteredRows = rows.map((row) => ({
    ...row,
    values: row.values.filter((_, i) => keepIndices[i]),
  }))

  return { years: filteredYears, rows: filteredRows }
}
