import { describe, expect, it } from "vitest"
import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import {
  averageRatioValues,
  computeRatios,
  filterEmptyRatioPoints,
  findFallbackRatioRow,
  formatRatioValue,
  pickRatioDisplayPoints,
  ratioDisplayPointsForTable,
  type RatioDataPoint,
} from "@/lib/financial-ratios"

function row(id: string, label: string, amounts: Record<string, number>): SeriesRow {
  return {
    id,
    label,
    isBold: false,
    isSection: false,
    isResult: false,
    amounts,
    detailRows: [],
  }
}

function emptyPoint(period: string, overrides: Partial<RatioDataPoint> = {}): RatioDataPoint {
  return {
    period,
    currentRatio: null,
    quickRatio: null,
    grossMargin: null,
    netMargin: null,
    ebitdaMargin: null,
    debtToEquity: null,
    interestCoverage: null,
    ...overrides,
  }
}

describe("computeRatios", () => {
  it("computes liquidity, profitability and leverage from IS + BS rows", () => {
    const periods: SeriesPeriod[] = [{ fiscalYear: 2026, fiscalMonth: 7, label: "Juillet 2026" }]
    const isRows: SeriesRow[] = [
      row("rev", "Revenus", { "2026-7": 1000 }),
      row("gp", "Bénéfice brut", { "2026-7": 400 }),
      row("ni", "Bénéfice net", { "2026-7": 100 }),
      row("ebitda", "BAIIA", { "2026-7": 200 }),
      row("int", "Charges financières", { "2026-7": 50 }),
    ]
    const bsRows: SeriesRow[] = [
      row("ca", "Actif courant", { "2026-7": 200 }),
      row("cl", "Passif courant", { "2026-7": 100 }),
      row("inv", "Stocks", { "2026-7": 50 }),
      row("tl", "Total du passif", { "2026-7": 300 }),
      row("eq", "Capitaux propres", { "2026-7": 150 }),
    ]

    const [point] = computeRatios(isRows, bsRows, periods)
    expect(point?.currentRatio).toBeCloseTo(2, 10)
    expect(point?.quickRatio).toBeCloseTo(1.5, 10)
    expect(point?.grossMargin).toBeCloseTo(40, 10)
    expect(point?.netMargin).toBeCloseTo(10, 10)
    expect(point?.ebitdaMargin).toBeCloseTo(20, 10)
    expect(point?.debtToEquity).toBeCloseTo(2, 10)
    expect(point?.interestCoverage).toBeCloseTo(4, 10)
  })
})

describe("pickRatioDisplayPoints", () => {
  const periods: SeriesPeriod[] = [
    { fiscalYear: 2026, fiscalMonth: 5, label: "Mai 2026" },
    { fiscalYear: 2026, fiscalMonth: 6, label: "Juin 2026" },
    { fiscalYear: 2026, fiscalMonth: 7, label: "Juillet 2026" },
  ]
  const points: RatioDataPoint[] = periods.map((p, idx) =>
    emptyPoint(p.label, { currentRatio: idx + 1 }),
  )

  it("current = date de référence puis période précédente", () => {
    const picked = pickRatioDisplayPoints(points, periods, "current", 7, 2026, 12)
    expect(picked.map((p) => p.period)).toEqual(["Juillet 2026", "Juin 2026"])
    expect(picked.map((p) => p.currentRatio)).toEqual([3, 2])
  })

  it("12 months keeps chronological order for the chart", () => {
    const picked = pickRatioDisplayPoints(points, periods, "12months", 7, 2026, 12)
    expect(picked.map((p) => p.period)).toEqual(["Mai 2026", "Juin 2026", "Juillet 2026"])
  })

  it("table display reverses multi-period horizons (newest left)", () => {
    const picked = pickRatioDisplayPoints(points, periods, "12months", 7, 2026, 12)
    expect(ratioDisplayPointsForTable(picked).map((p) => p.period)).toEqual([
      "Juillet 2026",
      "Juin 2026",
      "Mai 2026",
    ])
  })
})

describe("filterEmptyRatioPoints", () => {
  it("drops padded empty years and keeps years with data", () => {
    const points = [
      emptyPoint("Jul 2021"),
      emptyPoint("Jul 2022"),
      emptyPoint("Jul 2023", { currentRatio: 1.2 }),
      emptyPoint("Jul 2024", { currentRatio: 1.4 }),
      emptyPoint("Déc 2025"),
      emptyPoint("Jul 2026", { currentRatio: 1.6 }),
    ]
    const filtered = filterEmptyRatioPoints(points)
    expect(filtered.map((p) => p.period)).toEqual(["Jul 2023", "Jul 2024", "Jul 2026"])
  })
})

describe("averageRatioValues", () => {
  it("averages visible cells including real zeros, ignoring nulls", () => {
    expect(averageRatioValues([2, 4, null])).toBeCloseTo(3, 10)
    expect(averageRatioValues([0, 6])).toBeCloseTo(3, 10)
    expect(averageRatioValues([null, null])).toBeNull()
  })
})

describe("findFallbackRatioRow", () => {
  it("matches historical ratio labels ignoring case and accents", () => {
    expect(findFallbackRatioRow("Ratio de liquidité générale")?.key).toBe("currentRatio")
    expect(findFallbackRatioRow("marge baiia")?.format).toBe("percentage")
    expect(findFallbackRatioRow("Poste libre")).toBeUndefined()
  })
})

describe("formatRatioValue", () => {
  it("formats ratio and percentage cells", () => {
    expect(formatRatioValue(2.5, "ratio")).toBe("2.50x")
    expect(formatRatioValue(36.66, "percentage")).toBe("36.7%")
    expect(formatRatioValue(null, "ratio")).toBe("\u2014")
  })
})
