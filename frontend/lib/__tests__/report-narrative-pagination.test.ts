import { describe, expect, it } from "vitest"
import type { ContributiveMarginEvolutionTable } from "@/lib/revenue-contributive-margin-evolution"
import {
  chartPartsForAnalysis,
  estimateEvolutionTableWeight,
  estimateParagraphWeight,
  isTextLecturePage,
  lecturePageCountFromPacked,
  packNarrativeParagraphs,
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
    const pages = packNarrativeParagraphs(paragraphs, (heading) =>
      heading === "Passifs" ? 13 : 0,
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
})
