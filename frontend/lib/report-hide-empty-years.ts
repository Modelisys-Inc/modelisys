import { filterEmptyHorizonLabels } from "@/lib/horizon-column-visibility"

/** Retire les années où toutes les lignes sont nulles ou ~0. */
export function hideEmptyYears<T extends { values: (number | null)[] }>(
  years: number[],
  rows: T[],
): { years: number[]; rows: T[] } {
  const filtered = filterEmptyHorizonLabels(years, rows)
  return { years: filtered.labels, rows: filtered.rows as T[] }
}
