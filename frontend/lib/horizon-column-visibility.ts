/** Seuil commun pour masquer une colonne d'horizon sans donnée significative. */
export const HORIZON_EMPTY_EPSILON = 1e-6

export function horizonColumnHasData(values: (number | null | undefined)[]): boolean {
  return values.some(
    (value) => value != null && Number.isFinite(value) && Math.abs(value) > HORIZON_EMPTY_EPSILON,
  )
}

/** `true` = conserver la colonne (au moins une série non nulle). */
export function emptyHorizonColumnMask(
  columnCount: number,
  series: readonly (readonly (number | null | undefined)[])[],
): boolean[] {
  if (columnCount <= 0) return []
  return Array.from({ length: columnCount }, (_, columnIndex) =>
    series.some((row) => horizonColumnHasData([row[columnIndex] ?? null])),
  )
}

/** Moyenne des colonnes affichées (années / mois visibles), y compris les zéros réels. */
export function averageDisplayedHorizonValues(
  values: readonly (number | null | undefined)[],
): number {
  if (!values.length) return 0
  let sum = 0
  let count = 0
  for (const value of values) {
    if (value == null || !Number.isFinite(value)) continue
    sum += value
    count += 1
  }
  return count > 0 ? sum / count : 0
}

export function pickHorizonColumns<T>(items: readonly T[], mask: readonly boolean[]): T[] {
  if (!items.length || mask.length !== items.length) return [...items]
  if (mask.every(Boolean)) return [...items]
  return items.filter((_, index) => mask[index])
}

/** Filtre des points étiquetés (ex. années du graphique diagnostic). */
export function filterLabeledHorizonPoints<T extends { period: string }>(
  points: T[],
  metricKeys: readonly (keyof T)[],
): T[] {
  if (points.length <= 1 || !metricKeys.length) return points

  const mask = emptyHorizonColumnMask(
    points.length,
    metricKeys.map((key) =>
      points.map((point) => {
        const value = point[key]
        return typeof value === "number" ? value : null
      }),
    ),
  )

  return pickHorizonColumns(points, mask)
}

export function filterEmptyHorizonLabels<T extends string | number>(
  labels: readonly T[],
  rows: readonly { values: (number | null)[] }[],
): { labels: T[]; rows: { values: (number | null)[] }[] } {
  if (!labels.length) return { labels: [...labels], rows: rows.map((row) => ({ ...row })) }

  const mask = emptyHorizonColumnMask(
    labels.length,
    rows.map((row) => row.values),
  )

  if (mask.every(Boolean)) {
    return { labels: [...labels], rows: rows.map((row) => ({ ...row, values: [...row.values] })) }
  }

  return {
    labels: pickHorizonColumns(labels, mask),
    rows: rows.map((row) => ({
      ...row,
      values: pickHorizonColumns(row.values, mask),
    })),
  }
}
