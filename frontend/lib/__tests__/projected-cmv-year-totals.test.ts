import { describe, expect, it } from "vitest"
import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import {
  computeProjectedCmvRowValue,
  computeProjectedCmvYearTotalsFromSeries,
  isCmvFamilyLinkCode,
  listCmvHypothesisPostIds,
  parseExpenseForecastConfig,
} from "../projected-cmv-year-totals"

const periods: SeriesPeriod[] = Array.from({ length: 12 }, (_, i) => ({
  fiscalYear: 2025,
  fiscalMonth: i + 1,
  label: `${i + 1}/2025`,
}))

function makeRow(id: string, label: string, monthly: number): SeriesRow {
  return {
    id,
    label,
    amounts: Object.fromEntries(periods.map((p) => [`${p.fiscalYear}-${p.fiscalMonth}`, monthly])),
    detailRows: [],
  }
}

describe("isCmvFamilyLinkCode", () => {
  it("matches CMV leaves and excludes CMV.11", () => {
    expect(isCmvFamilyLinkCode("CMV")).toBe(true)
    expect(isCmvFamilyLinkCode("CMV.2")).toBe(true)
    expect(isCmvFamilyLinkCode("CMV-A.1")).toBe(true)
    expect(isCmvFamilyLinkCode("CMV.11")).toBe(false)
    expect(isCmvFamilyLinkCode("REV")).toBe(false)
  })
})

describe("listCmvHypothesisPostIds", () => {
  it("lists CMV detail-only expense posts", () => {
    const structure = [
      { label: "Coûts des produits vendus", linkCode: "CMV", posteNature: "depenses", isBold: true },
      {
        label: "Achats",
        id: "CMV.2",
        linkCode: "CMV.2",
        detailOnly: true,
        defineMapping: true,
        showInDetail: true,
        annexLetter: "B",
      },
      {
        label: "Amortissement",
        id: "CMV.11",
        linkCode: "CMV.11",
        detailOnly: true,
        defineMapping: true,
        showInDetail: true,
        annexLetter: "B",
      },
    ]
    const rows = [
      makeRow("CMV.2", "Achats", 100_000),
      makeRow("CMV.11", "Amortissement", 10_000),
    ]
    expect(listCmvHypothesisPostIds(rows, structure)).toEqual(["CMV.2"])
  })
})

describe("computeProjectedCmvRowValue", () => {
  it("projects variable CMV as percent of projected revenue", () => {
    const value = computeProjectedCmvRowValue("CMV.2", 1, 500_000, 2_000_000, {
      expenseTypes: { "CMV.2": "variable" },
      variableRates: { "CMV.2": 40 },
      inflationRate: 2,
      specificInflationRates: {},
      revenueValues: {},
      expenseAdjustments: {},
    })
    expect(value).toBe(800_000)
  })

  it("inflates fixed CMV from N-1 on the first projected year", () => {
    const value = computeProjectedCmvRowValue("CMV.2", 1, 500_000, 0, {
      expenseTypes: { "CMV.2": "fixe" },
      variableRates: {},
      inflationRate: 10,
      specificInflationRates: {},
      revenueValues: {},
      expenseAdjustments: {},
      actualColumnCount: 2,
      nMinusOneActual: 1_000_000,
    })
    expect(value).toBe(1_100_000)
  })
})

describe("computeProjectedCmvYearTotalsFromSeries", () => {
  it("sums variable CMV posts from projected revenue", () => {
    const structure = [
      { label: "Coûts des produits vendus", linkCode: "CMV", posteNature: "depenses", isBold: true },
      {
        label: "Achats",
        id: "CMV.2",
        linkCode: "CMV.2",
        detailOnly: true,
        defineMapping: true,
        showInDetail: true,
        annexLetter: "B",
      },
    ]
    const rows = [makeRow("CMV.2", "Achats", 100_000)]
    const config = parseExpenseForecastConfig({
      expenseTypes: { "CMV.2": "variable" },
      variableRates: { "CMV.2": 50 },
    })
    const totals = computeProjectedCmvYearTotalsFromSeries(
      rows,
      periods,
      structure,
      2,
      config,
      [1_200_000, 2_000_000, 2_400_000],
      600_000,
      1_200_000,
    )
    expect(totals[0]).toBe(1_200_000) // année 0 = série (100k×12)
    expect(totals[1]).toBe(1_000_000) // 50% × 2M
    expect(totals[2]).toBe(1_200_000) // 50% × 2.4M
  })

  it("returns 0 for projected years when no CMV hyp posts (no invented figures)", () => {
    const totals = computeProjectedCmvYearTotalsFromSeries(
      [],
      [],
      [],
      2,
      parseExpenseForecastConfig({}),
      [1_000_000, 2_000_000, 3_000_000],
      500_000,
      1_000_000,
    )
    expect(totals).toEqual([500_000, 0, 0])
  })

  it("returns 0 for projected years when CMV posts exist but rates are unset", () => {
    const structure = [
      { label: "Coûts des produits vendus", linkCode: "CMV", posteNature: "depenses", isBold: true },
      {
        label: "Achats",
        id: "CMV.2",
        linkCode: "CMV.2",
        detailOnly: true,
        defineMapping: true,
        showInDetail: true,
        annexLetter: "B",
      },
    ]
    const rows = [makeRow("CMV.2", "Achats", 100_000)]
    const totals = computeProjectedCmvYearTotalsFromSeries(
      rows,
      periods,
      structure,
      2,
      parseExpenseForecastConfig({}),
      [1_200_000, 2_000_000, 2_400_000],
      600_000,
      1_200_000,
    )
    expect(totals[0]).toBe(1_200_000)
    expect(totals[1]).toBe(0)
    expect(totals[2]).toBe(0)
  })
})
