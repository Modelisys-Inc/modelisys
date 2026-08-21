import { describe, expect, it } from "vitest"
import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import {
  computeProjectedRevenueRowValue,
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
    expect(totals?.[1]).toBe(0)
    expect(totals?.[2]).toBe(0)
  })

  it("applies stored revenue hypotheses on projected years only", () => {
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
    const periods = monthlyPeriods(2024, 2026)
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
      {
        "REV.1-1": [{ id: "a", type: "amount", value: 5_000_000 }],
      },
    )
    expect(totals?.[0]).toBe(1_200_000)
    expect(totals?.[1]).toBe(5_000_000)
    expect(totals?.[2]).toBe(0)
  })
})

describe("computeProjectedRevenueRowValue growth base", () => {
  it("applies first-year growth to N-1 when YTD columns are present", () => {
    const rowId = "REV.1"
    // 10% growth on N-1 = 1_000_000 → 1_100_000 (not on YTD 300_000)
    const value = computeProjectedRevenueRowValue(
      rowId,
      1,
      0,
      {},
      {
        [`${rowId}-1`]: [{ id: "a", type: "growthPercent", value: 10 }],
      },
      undefined,
      [300_000, 0],
      undefined,
      { actualColumnCount: 2, nMinusOneActual: 1_000_000 },
    )
    expect(value).toBe(1_100_000)
  })

  it("chains later years from the prior projected year", () => {
    const rowId = "REV.1"
    const resolve = (id: string, yearIndex: number, defaultValue: number) =>
      computeProjectedRevenueRowValue(
        id,
        yearIndex,
        defaultValue,
        {},
        {
          [`${rowId}-1`]: [{ id: "a", type: "growthPercent", value: 10 }],
          [`${rowId}-2`]: [{ id: "b", type: "growthPercent", value: 10 }],
        },
        undefined,
        [300_000, 0, 0],
        resolve,
        { actualColumnCount: 2, nMinusOneActual: 1_000_000 },
      )
    expect(resolve(rowId, 2, 0)).toBe(1_210_000)
  })
})
