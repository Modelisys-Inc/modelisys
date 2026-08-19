import { describe, expect, it } from "vitest"
import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import {
  computeProjectedRevenueYearTotalsFromSeries,
  listRevenueHypothesisPostIds,
} from "@/hooks/use-projected-revenue-year-totals"

function monthlyPeriods(fromYear: number, toYear: number): SeriesPeriod[] {
  const out: SeriesPeriod[] = []
  for (let year = fromYear; year <= toYear; year++) {
    for (let month = 1; month <= 12; month++) {
      out.push({ fiscalYear: year, fiscalMonth: month, label: `${month}/${year}` })
    }
  }
  return out
}

function monthlyAmounts(fromYear: number, toYear: number, perMonth: number): Record<string, number> {
  const amounts: Record<string, number> = {}
  for (let year = fromYear; year <= toYear; year++) {
    for (let month = 1; month <= 12; month++) {
      amounts[`${year}-${month}`] = perMonth
    }
  }
  return amounts
}

describe("listRevenueHypothesisPostIds", () => {
  it("keeps annex detail posts and skips the parent total", () => {
    const structure = [
      {
        label: "Revenus",
        linkCode: "REV",
        posteNature: "revenus",
        annexLetter: "A",
        defineMapping: true,
        showInDetail: true,
      },
      {
        label: "Ventes",
        linkCode: "REV.1",
        annexLetter: "A",
        detailOnly: true,
        defineMapping: true,
        showInDetail: true,
      },
    ]
    const rows = [
      { id: "REV", label: "Revenus" },
      { id: "REV.1", label: "Ventes" },
    ]
    expect(listRevenueHypothesisPostIds(rows, structure)).toEqual(["REV.1"])
  })
})

describe("computeProjectedRevenueYearTotalsFromSeries", () => {
  it("does not double-count parent Revenus plus annex detail", () => {
    const periods = monthlyPeriods(2024, 2026)
    const structure = [
      {
        label: "Revenus",
        linkCode: "REV",
        posteNature: "revenus",
        annexLetter: "A",
        defineMapping: true,
        showInDetail: true,
      },
      {
        label: "Ventes",
        linkCode: "REV.1",
        annexLetter: "A",
        detailOnly: true,
        defineMapping: true,
        showInDetail: true,
      },
    ]
    const rows: SeriesRow[] = [
      {
        id: "REV",
        label: "Revenus",
        isBold: true,
        isSection: false,
        isResult: true,
        amounts: monthlyAmounts(2024, 2026, 100_000),
        detailRows: [],
      },
      {
        id: "REV.1",
        label: "Ventes",
        isBold: false,
        isSection: false,
        isResult: false,
        amounts: monthlyAmounts(2024, 2026, 100_000),
        detailRows: [],
      },
    ]
    const totals = computeProjectedRevenueYearTotalsFromSeries(
      rows,
      periods,
      structure,
      2,
      {},
      {},
    )
    expect(totals?.[0]).toBe(1_200_000)
  })
})
