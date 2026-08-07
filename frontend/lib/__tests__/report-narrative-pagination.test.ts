import { describe, expect, it } from "vitest"
import type { ContributiveMarginEvolutionTable } from "@/lib/revenue-contributive-margin-evolution"
import {
  chartPartsForAnalysis,
  estimateEvolutionTableWeight,
  estimateParagraphWeight,
  isTextLecturePage,
  lecturePageCountFromPacked,
  packNarrativeParagraphs,
  packPilotageMarginByRevenueLecturePages,
  packPilotagePerformanceLecturePages,
  packPilotageRevenueAnalysisLecturePages,
  packRevenueSourceLecturePages,
  PERFORMANCE_WINDOW_PAGE_GROUP,
  REVENUE_SOURCES_PER_LECTURE_PAGE,
} from "@/lib/report-narrative-pagination"

function smallEvolutionTable(metricCount = 2): ContributiveMarginEvolutionTable {
  return {
    sourceId: "test",
    sourceLabel: "Test",
    periods: ["2026", "2025", "2024", "2023", "2022"],
    metrics: Array.from({ length: metricCount }, (_, index) => ({
      id: `m${index}`,
      label: `Ligne ${index}`,
      format: "currency" as const,
      values: [1, 2, 3, 4, 5],
    })),
  }
}

describe("report-narrative-pagination", () => {
  it("packs short lecture sections on the same page", () => {
    const paragraphs = [
      { heading: "FDR / Revenus", body: "Court paragraphe sur le ratio.", statsLine: "Min. : 23 %" },
      { heading: "FdRHC / Revenus", body: "Autre paragraphe court.", statsLine: "Min. : 12 %" },
      { heading: "Structure en % des revenus", body: "Texte un peu plus long ".repeat(20) },
    ]
    const pages = packNarrativeParagraphs(paragraphs)
    expect(pages.length).toBeLessThan(paragraphs.length)
    expect(pages[0]?.length).toBeGreaterThan(1)
  })

  it("packs several small financial-position blocks on one page", () => {
    const paragraphs = [
      { heading: "Passif à long terme", body: "Texte court sur le passif LT." },
      { heading: "Capitaux propres", body: "Texte court sur les capitaux propres." },
      { heading: "Actif à court terme", body: "Texte court sur l'actif CT." },
    ]
    const tableWeight = () => estimateEvolutionTableWeight(smallEvolutionTable())

    const pages = packNarrativeParagraphs(paragraphs, tableWeight)
    expect(pages.length).toBeLessThanOrEqual(2)
    expect(pages.flat().length).toBe(3)
    expect(Math.max(...pages.map((page) => page.length))).toBeGreaterThanOrEqual(2)
  })

  it("ignores collapsed detail rows when estimating table height", () => {
    const collapsed = estimateEvolutionTableWeight(smallEvolutionTable(2))
    const withDetails = estimateEvolutionTableWeight({
      ...smallEvolutionTable(2),
      metrics: [
        {
          id: "m0",
          label: "Montant",
          format: "currency",
          values: [1, 2, 3],
          detailRows: Array.from({ length: 12 }, (_, index) => ({
            id: `d${index}`,
            label: `Detail ${index}`,
            values: [1, 2, 3],
            detailRows: [{ id: `g${index}`, label: "GL", values: [1, 2, 3] }],
          })),
        },
        {
          id: "m1",
          label: "Part du total",
          format: "percent",
          values: [10, 20, 30],
        },
      ],
    })
    expect(withDetails).toBe(collapsed)
  })

  it("starts a new page before very large table blocks", () => {
    const paragraphs = [
      { heading: "Actifs", body: "Résumé des actifs." },
      { heading: "Passifs", body: "Résumé des passifs." },
    ]
    const pages = packNarrativeParagraphs(paragraphs, (paragraph) =>
      paragraph.heading === "Passifs" ? 13 : 0,
    )
    expect(pages).toHaveLength(2)
    expect(pages[0]?.map((p) => p.heading)).toEqual(["Actifs"])
  })

  it("weights table blocks higher than text-only blocks", () => {
    const textOnly = estimateParagraphWeight({ heading: "A", body: "x" })
    const withTable = estimateParagraphWeight(
      { heading: "B", body: "x" },
      estimateEvolutionTableWeight(smallEvolutionTable()),
    )
    expect(withTable).toBeGreaterThan(textOnly)
  })

  it("adds a standalone table page for margin-by-revenue", () => {
    expect(lecturePageCountFromPacked(3, { hasStandaloneTable: true })).toBe(4)
    expect(isTextLecturePage(3, 3, true)).toBe(false)
    expect(isTextLecturePage(3, 2, true)).toBe(true)
  })

  it("splits expenses into bridge and breakeven chart parts", () => {
    expect(chartPartsForAnalysis("expenses")).toEqual(["main", "breakeven"])
    expect(chartPartsForAnalysis("performance")).toEqual(["main"])
  })

  it("packs two revenue sources per lecture page", () => {
    const paragraphs = [
      { heading: "Produits", body: "Analyse produits." },
      { heading: "Services", body: "Analyse services." },
      { heading: "Location", body: "Analyse location." },
      { heading: "Autre", body: "Analyse autre." },
      { heading: "Export", body: "Analyse export." },
    ]
    const pages = packRevenueSourceLecturePages(paragraphs)
    expect(pages).toHaveLength(3)
    expect(pages[0]?.map((paragraph) => paragraph.heading)).toEqual(["Produits", "Services"])
    expect(pages[1]?.map((paragraph) => paragraph.heading)).toEqual(["Location", "Autre"])
    expect(pages[2]?.map((paragraph) => paragraph.heading)).toEqual(["Export"])
    expect(REVENUE_SOURCES_PER_LECTURE_PAGE).toBe(2)
  })

  it("pilotage performance : une page par indicateur (Revenus, CM, BAIIA)", () => {
    const paragraphs = [
      { heading: "Revenus", body: "Actuelle.", divisionBlockId: "pilotage-revenue" },
      { heading: "Revenus", body: "YTD.", divisionBlockId: "pilotage-revenue", subsection: "YTD" },
      { heading: "Contribution marginale", body: "Actuelle.", divisionBlockId: "pilotage-contributive-margin" },
      { heading: "BAIIA", body: "Actuelle.", divisionBlockId: "pilotage-ebita" },
    ]
    const pages = packPilotagePerformanceLecturePages(paragraphs)
    expect(pages).toHaveLength(3)
    expect(pages[0]?.map((p) => p.divisionBlockId)).toEqual(["pilotage-revenue", "pilotage-revenue"])
    expect(pages[1]?.[0]?.divisionBlockId).toBe("pilotage-contributive-margin")
    expect(pages[2]?.[0]?.divisionBlockId).toBe("pilotage-ebita")
  })

  it("pilotage analyse revenus : une page par source avec toutes les sous-sections", () => {
    const paragraphs = [
      { heading: "Électroniques", body: "Actuelle.", divisionBlockId: "revenue-source-0-electroniques" },
      { heading: "Électroniques", body: "YTD.", divisionBlockId: "revenue-source-0-electroniques", subsection: "YTD" },
      { heading: "Électroniques", body: "TTM.", divisionBlockId: "revenue-source-0-electroniques", subsection: "TTM" },
      { heading: "Électroniques", body: "Saison.", divisionBlockId: "revenue-source-0-electroniques", subsection: "Saisonnalité" },
      { heading: "Services", body: "Actuelle.", divisionBlockId: "revenue-source-1-services" },
    ]
    const pages = packPilotageRevenueAnalysisLecturePages(paragraphs)
    expect(pages).toHaveLength(2)
    expect(pages[0]).toHaveLength(4)
    expect(pages[1]).toHaveLength(1)
  })

  it("pilotage marge par revenus : une page par sous-section", () => {
    const paragraphs = [
      { heading: "Marge contributive — Électroniques", body: "Actuelle.", subsection: "Performance actuelle" },
      { heading: "Marge contributive — Électroniques", body: "YTD.", subsection: "Performance de l'exercice (YTD)" },
      { heading: "Marge contributive — Électroniques", body: "TTM.", subsection: "Tendance des 12 derniers mois" },
    ]
    const pages = packPilotageMarginByRevenueLecturePages(paragraphs)
    expect(pages).toHaveLength(3)
    expect(pages.every((page) => page.length === 1)).toBe(true)
  })

  it("garde Revenus, contribution marginale et BAIIA sur une même page", () => {
    const longBody = "Analyse détaillée. ".repeat(40)
    const paragraphs = [
      {
        heading: "Revenus",
        body: longBody,
        statsLine: "TCAC : +8 %",
        narrativePageGroup: PERFORMANCE_WINDOW_PAGE_GROUP,
      },
      {
        heading: "Contribution marginale",
        body: longBody,
        statsLine: "Moyenne : 42 %",
        narrativePageGroup: PERFORMANCE_WINDOW_PAGE_GROUP,
      },
      {
        heading: "BAIIA",
        body: longBody,
        secondaryBody: "Comparativement au chiffre d'affaires, le TCAC du BAIIA progresse.",
        statsLine: "TCAC : +6 %",
        narrativePageGroup: PERFORMANCE_WINDOW_PAGE_GROUP,
      },
    ]

    const pages = packNarrativeParagraphs(paragraphs)
    expect(pages).toHaveLength(1)
    expect(pages[0]?.map((paragraph) => paragraph.heading)).toEqual([
      "Revenus",
      "Contribution marginale",
      "BAIIA",
    ])
  })
})
