/** Pagination lecture rapport — regroupe les blocs courts sur une même page A4 paysage. */

import type { ContributiveMarginEvolutionTable } from "@/lib/revenue-contributive-margin-evolution"

/** Regroupe Revenus + contribution marginale + BAIIA sur une même page de lecture. */
export const PERFORMANCE_WINDOW_PAGE_GROUP = "performance-window"

/** Nombre de sources de revenus par page lecture (section Analyse des revenus). */
export const REVENUE_SOURCES_PER_LECTURE_PAGE = 2

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
  narrativePageGroup?: string
  showIndicatorTable?: boolean
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

function clusterNarrativeParagraphs<T extends NarrativeParagraphLike>(paragraphs: T[]): T[][] {
  const clusters: T[][] = []

  for (const paragraph of paragraphs) {
    const group = paragraph.narrativePageGroup
    const last = clusters[clusters.length - 1]
    if (group && last?.[0]?.narrativePageGroup === group) {
      last.push(paragraph)
      continue
    }
    clusters.push([paragraph])
  }

  return clusters
}

function paragraphWeight<T extends NarrativeParagraphLike & { showIndicatorTable?: boolean }>(
  paragraph: T,
  getTableWeight: (paragraph: T) => number,
): number {
  return estimateParagraphWeight(
    paragraph,
    paragraph.showIndicatorTable === false ? 0 : getTableWeight(paragraph),
  )
}

function clusterWeight<T extends NarrativeParagraphLike & { showIndicatorTable?: boolean }>(
  cluster: T[],
  getTableWeight: (paragraph: T) => number,
): number {
  return cluster.reduce((sum, paragraph) => sum + paragraphWeight(paragraph, getTableWeight), 0)
}

function firstPageCapacityForCluster<T extends NarrativeParagraphLike>(
  cluster: T[],
  firstPageMaxUnits: number,
  maxUnits: number,
): number {
  if (cluster[0]?.narrativePageGroup === PERFORMANCE_WINDOW_PAGE_GROUP) {
    return maxUnits
  }
  return firstPageMaxUnits
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

export function packNarrativeParagraphs<T extends NarrativeParagraphLike & { showIndicatorTable?: boolean }>(
  paragraphs: T[] | undefined,
  getTableWeight: (paragraph: T) => number = () => 0,
  maxUnits: number = LECTURE_PAGE_CAPACITY_UNITS,
  firstPageMaxUnits: number = LECTURE_FIRST_PAGE_CAPACITY_UNITS,
): T[][] {
  if (!paragraphs?.length) return []

  const hasPageGroups = paragraphs.some((paragraph) => paragraph.narrativePageGroup)
  if (!hasPageGroups) {
    return packParagraphsIntoPages(
      paragraphs,
      (paragraph) => paragraphWeight(paragraph, getTableWeight),
      maxUnits,
      firstPageMaxUnits,
    )
  }

  const clusters = clusterNarrativeParagraphs(paragraphs)
  const pages: T[][] = []
  let current: T[] = []
  let currentWeight = 0

  for (const cluster of clusters) {
    const weight = clusterWeight(cluster, getTableWeight)
    const limit =
      pages.length === 0 && current.length === 0
        ? firstPageCapacityForCluster(cluster, firstPageMaxUnits, maxUnits)
        : maxUnits

    if (current.length > 0 && currentWeight + weight > limit) {
      pages.push(current)
      current = []
      currentWeight = 0
    }

    current.push(...cluster)
    currentWeight += weight
  }

  if (current.length) pages.push(current)
  return pages
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

/** Regroupe les paragraphes d'un même bloc division (ex. une source de revenus pilotage). */
export function packPilotageDivisionBlockPages<T extends NarrativeParagraphLike & { divisionBlockId?: string }>(
  paragraphs: T[] | undefined,
): T[][] {
  if (!paragraphs?.length) return []

  const pages: T[][] = []
  let current: T[] = []
  let currentBlockId: string | undefined

  for (const paragraph of paragraphs) {
    const blockId = paragraph.divisionBlockId ?? paragraph.heading
    if (current.length > 0 && blockId !== currentBlockId) {
      pages.push(current)
      current = []
    }
    current.push(paragraph)
    currentBlockId = blockId
  }

  if (current.length) pages.push(current)
  return pages
}

/** Performance financière pilotage — Revenus, contribution marginale et BAIIA chacun sur une page. */
export function packPilotagePerformanceLecturePages<T extends NarrativeParagraphLike & { divisionBlockId?: string }>(
  paragraphs: T[] | undefined,
): T[][] {
  return packPilotageDivisionBlockPages(paragraphs)
}

/** Analyse des revenus pilotage — toutes les sous-sections d'une source sur la même page. */
export function packPilotageRevenueAnalysisLecturePages<
  T extends NarrativeParagraphLike & { divisionBlockId?: string },
>(paragraphs: T[] | undefined): T[][] {
  return packPilotageDivisionBlockPages(paragraphs)
}

/** Dépenses pilotage — coûts variables et fixes, chacun avec actuelle / YTD / TTM sur une page. */
export function packPilotageExpensesLecturePages<T extends NarrativeParagraphLike & { divisionBlockId?: string }>(
  paragraphs: T[] | undefined,
): T[][] {
  return packPilotageDivisionBlockPages(paragraphs)
}

/** Marge par revenus pilotage — une sous-section (actuelle / YTD / TTM) par page. */
export function packPilotageMarginByRevenueLecturePages<T extends NarrativeParagraphLike>(
  paragraphs: T[] | undefined,
): T[][] {
  if (!paragraphs?.length) return []
  return paragraphs.map((paragraph) => [paragraph])
}

/** Regroupe les sources de revenus par paires pour la lecture rapport. */
export function packRevenueSourceLecturePages<T>(
  paragraphs: T[] | undefined,
  perPage: number = REVENUE_SOURCES_PER_LECTURE_PAGE,
): T[][] {
  if (!paragraphs?.length || perPage < 1) return []
  const pages: T[][] = []
  for (let index = 0; index < paragraphs.length; index += perPage) {
    pages.push(paragraphs.slice(index, index + perPage))
  }
  return pages
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
