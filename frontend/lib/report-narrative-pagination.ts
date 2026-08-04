/** Pagination lecture rapport — regroupe les blocs courts sur une même page A4 paysage. */

import type { ContributiveMarginEvolutionTable } from "@/lib/revenue-contributive-margin-evolution"

export type ReportNarrativeScope =
  | "full"
  | "revenue-only"
  | "margin-by-revenue-only"
  | "expenses-only"
  | "expenses-by-division-only"
  | "financial-position-only"
  | "working-capital-only"
  | "capex-only"

/**
 * Capacité d'une page lecture (unités) — zone utile sous en-tête/pied de section.
 * Calibrée pour A4 paysage avec marges 10/12/14 mm.
 */
export const LECTURE_PAGE_CAPACITY_UNITS = 10

/** Première page lecture : en-tête de section + titre narratif réduisent l'espace. */
export const LECTURE_FIRST_PAGE_CAPACITY_UNITS = 6.5

export type NarrativeParagraphLike = {
  heading: string
  body: string
  secondaryBody?: string
  seasonalityBody?: string
  statsLine?: string
}

/** Lignes visibles à l'impression (détails repliés dans les tableaux d'évolution). */
export function countEvolutionTablePrintRows(table: ContributiveMarginEvolutionTable): number {
  return 1 + table.metrics.length
}

/** Poids relatif d'un tableau d'évolution pour la pagination rapport. */
export function estimateEvolutionTableWeight(
  table: ContributiveMarginEvolutionTable | null | undefined,
): number {
  if (!table?.metrics.length) return 0
  const visibleRows = countEvolutionTablePrintRows(table)
  return Math.min(7.5, Math.max(1.75, 0.75 + visibleRows * 0.58))
}

export function evolutionTableWeightFromHeading(
  tables: Map<string, ContributiveMarginEvolutionTable> | null | undefined,
  heading: string,
): number {
  if (!tables?.has(heading)) return 0
  return estimateEvolutionTableWeight(tables.get(heading))
}

/** Estime la hauteur relative d'un bloc (paragraphe ± tableau). */
export function estimateParagraphWeight(
  paragraph: NarrativeParagraphLike,
  tableWeight = 0,
): number {
  let weight = 1.35
  const textLen =
    paragraph.body.length +
    (paragraph.secondaryBody?.length ?? 0) +
    (paragraph.seasonalityBody?.length ?? 0)

  if (textLen > 280) weight += 0.75
  if (textLen > 560) weight += 1.1
  if (textLen > 950) weight += 1.5
  if (paragraph.statsLine) weight += 0.55
  weight += tableWeight

  return weight
}

/** Regroupe les paragraphes en pages sans dépasser la capacité (blocs jamais coupés). */
export function packParagraphsIntoPages<T>(
  paragraphs: T[],
  getWeight: (paragraph: T, index: number) => number,
  maxUnits: number = LECTURE_PAGE_CAPACITY_UNITS,
  firstPageMaxUnits: number = LECTURE_FIRST_PAGE_CAPACITY_UNITS,
): T[][] {
  if (!paragraphs.length) return []

  const pages: T[][] = []
  let current: T[] = []
  let currentWeight = 0

  const pageLimit = () => (pages.length === 0 && current.length === 0 ? firstPageMaxUnits : maxUnits)

  for (let index = 0; index < paragraphs.length; index++) {
    const paragraph = paragraphs[index]!
    const weight = getWeight(paragraph, index)
    const limit = pageLimit()

    if (current.length > 0 && currentWeight + weight > limit) {
      pages.push(current)
      current = []
      currentWeight = 0
    }

    current.push(paragraph)
    currentWeight += weight
  }

  if (current.length) pages.push(current)
  return pages
}

export function packNarrativeParagraphs<T extends NarrativeParagraphLike>(
  paragraphs: T[] | undefined,
  getTableWeight: (heading: string) => number = () => 0,
  maxUnits: number = LECTURE_PAGE_CAPACITY_UNITS,
  firstPageMaxUnits: number = LECTURE_FIRST_PAGE_CAPACITY_UNITS,
): T[][] {
  if (!paragraphs?.length) return []
  return packParagraphsIntoPages(
    paragraphs,
    (p) => estimateParagraphWeight(p, getTableWeight(p.heading)),
    maxUnits,
    firstPageMaxUnits,
  )
}

export function lecturePageCountFromPacked(
  packedTextPageCount: number,
  options?: { hasStandaloneTable?: boolean },
): number {
  const tablePages = options?.hasStandaloneTable ? 1 : 0
  const total = packedTextPageCount + tablePages
  return total > 0 ? total : 1
}

export function isStandaloneTableLecturePage(
  packedTextPageCount: number,
  pageIndex: number,
  hasStandaloneTable: boolean,
): boolean {
  if (!hasStandaloneTable) return false
  return pageIndex === packedTextPageCount
}

export function isTextLecturePage(
  packedTextPageCount: number,
  pageIndex: number,
  hasStandaloneTable: boolean,
): boolean {
  if (isStandaloneTableLecturePage(packedTextPageCount, pageIndex, hasStandaloneTable)) {
    return false
  }
  return pageIndex < packedTextPageCount
}

export function paragraphsForPackedPage<T>(
  packedPages: T[][],
  pageIndex: number,
): T[] {
  return packedPages[pageIndex] ?? []
}

export type ReportPrintChartPart = "main" | "breakeven"

export function chartPartsForAnalysis(viewId: string): ReportPrintChartPart[] {
  if (viewId === "expenses") return ["main", "breakeven"]
  return ["main"]
}

export function chartPartTitleSuffix(part: ReportPrintChartPart): string {
  if (part === "breakeven") return " — Seuil de rentabilité"
  return ""
}
