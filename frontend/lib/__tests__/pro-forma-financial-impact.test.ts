import { describe, expect, it } from "vitest"
import {
  buildProFormaImpactMetrics,
  buildProjectedImpactYearOptions,
  classifyCashFlowImpactSection,
  computeImpactYoY,
  extractCashFlowImpactTrends,
  firstProjectedDisplayIndex,
  pctOfRevenue,
  previousImpactDisplayIndex,
} from "@/lib/pro-forma-financial-impact"
import { forecastDisplayToConfigYearIndex } from "@/lib/pro-forma-forecast-columns"

describe("pro-forma-financial-impact", () => {
  it("computes pct of revenue with signed numerator", () => {
    expect(pctOfRevenue(40, 200)).toBe(20)
    expect(pctOfRevenue(-10, 200)).toBe(-5)
    expect(pctOfRevenue(10, 0)).toBeNull()
  })

  it("builds the ordered impact metric list", () => {
    const metrics = buildProFormaImpactMetrics(
      {
        revenue: 1_000_000,
        cmv: 400_000,
        netIncome: 120_000,
        expenseHypothesisTotal: 700_000,
        cashOperating: 80_000,
        cashInvesting: -50_000,
        cashFinancing: 20_000,
        endingCash: 150_000,
      },
      {
        revenue: 900_000,
        cmv: 360_000,
        netIncome: 100_000,
        expenseHypothesisTotal: 630_000,
        cashOperating: 70_000,
        cashInvesting: -40_000,
        cashFinancing: 15_000,
        endingCash: 130_000,
      },
    )
    expect(metrics.map((m) => m.id)).toEqual([
      "revenue",
      "grossProfit",
      "grossProfitMargin",
      "netIncome",
      "netIncomeMargin",
      "baiia",
      "baiiaMargin",
      "cashOperating",
      "cashInvesting",
      "cashFinancing",
      "endingCash",
    ])
    expect(metrics.find((m) => m.id === "grossProfit")?.value).toBe(600_000)
    expect(metrics.find((m) => m.id === "baiia")?.value).toBe(300_000)
    expect(metrics.find((m) => m.id === "grossProfitMargin")?.label).toBe("% des revenus")
    expect(metrics.find((m) => m.id === "revenue")?.yoyDelta).toBe(100_000)
    expect(metrics.find((m) => m.id === "grossProfitMargin")?.yoyDelta).toBeCloseTo(0, 5)
  })

  it("computes YoY delta and pct", () => {
    expect(computeImpactYoY(110, 100)).toEqual({ delta: 10, pct: 10 })
    expect(computeImpactYoY(50, 0)).toEqual({ delta: 50, pct: null })
  })

  it("resolves previous display index for projected years", () => {
    expect(previousImpactDisplayIndex(2, 2)).toBe(0)
    expect(previousImpactDisplayIndex(3, 2)).toBe(2)
    expect(previousImpactDisplayIndex(1, 1)).toBe(0)
  })

  it("classifies cash-flow section labels", () => {
    expect(classifyCashFlowImpactSection({ label: "Flux d'exploitation", isResult: true })).toBe(
      "operating",
    )
    expect(
      classifyCashFlowImpactSection({ label: "Activités d'investissement", isResult: true }),
    ).toBe("investing")
    expect(classifyCashFlowImpactSection({ label: "Financement", isResult: true })).toBe(
      "financing",
    )
    expect(classifyCashFlowImpactSection({ label: "Trésorerie à la fin" })).toBe("ending")
    // Titres de section : pas des totaux (évite les « — » à 0 $)
    expect(
      classifyCashFlowImpactSection({
        label: "Trésorerie - Exploitation",
        isBold: true,
        isSection: true,
      }),
    ).toBeNull()
    expect(
      classifyCashFlowImpactSection({
        label: "flux de trésorerie liés à l'exploitation",
        isBold: true,
        isSection: true,
      }),
    ).toBeNull()
    expect(classifyCashFlowImpactSection({ label: "Flux d'exploitation", isBold: true })).toBe(
      "operating",
    )
    expect(classifyCashFlowImpactSection({ linkCode: "TEX", label: "Exploitation" })).toBe(
      "operating",
    )
  })

  it("extracts section trends from built rows", () => {
    const out = extractCashFlowImpactTrends({
      displayRows: [
        { label: "Flux d'exploitation", isResult: true },
        { label: "Investissement", isResult: true },
        { label: "Financement", isResult: true },
        { label: "Trésorerie à la fin" },
      ],
      rowTrends: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
        [10, 11, 12],
      ],
      endingCashTrend: [100, 110, 120],
    })
    expect(out.operating).toEqual([1, 2, 3])
    expect(out.investing).toEqual([4, 5, 6])
    expect(out.financing).toEqual([7, 8, 9])
    expect(out.ending).toEqual([100, 110, 120])
  })

  it("ignores zero section headers and uses isResult totals underneath", () => {
    const out = extractCashFlowImpactTrends({
      displayRows: [
        { label: "Trésorerie - Exploitation", isBold: true, isSection: true },
        { label: "Bénéfice net", linkCode: "TEX-A", defineMapping: true },
        { label: "Flux d'exploitation", isResult: true, isBold: true },
        { label: "Trésorerie - Investissement", isBold: true, isSection: true },
        { label: "Acquisitions", linkCode: "TIN-A", defineMapping: true },
        { label: "Flux Investissement", isResult: true, isBold: true },
        { label: "Trésorerie - Financement", isBold: true, isSection: true },
        { label: "Emprunts", linkCode: "TFI-A", defineMapping: true },
        { label: "Flux Financement", isResult: true, isBold: true },
        { label: "Variation nette de la trésorerie", isResult: true, isBold: true },
        { label: "Trésorerie à la fin" },
      ],
      rowTrends: [
        [0, 0, 0],
        [10, 20, 30],
        [100, 200, 300],
        [0, 0, 0],
        [-5, -6, -7],
        [-50, -60, -70],
        [0, 0, 0],
        [1, 2, 3],
        [11, 22, 33],
        [61, 162, 263],
        [500, 600, 700],
      ],
      endingCashTrend: [500, 600, 700],
    })
    expect(out.operating).toEqual([100, 200, 300])
    expect(out.investing).toEqual([-50, -60, -70])
    expect(out.financing).toEqual([11, 22, 33])
    expect(out.ending).toEqual([500, 600, 700])
  })

  it("maps first projected display index after actual cols", () => {
    expect(firstProjectedDisplayIndex(2)).toBe(2)
    expect(firstProjectedDisplayIndex(1)).toBe(1)
  })

  it("lists projected year options excluding N-1 and YTD", () => {
    const labels = ["2025", "YTD 2026", "2026", "2027", "2028", "2029", "2030"]
    const options = buildProjectedImpactYearOptions(labels, 2, forecastDisplayToConfigYearIndex)
    expect(options.map((o) => o.label)).toEqual(["2026", "2027", "2028", "2029", "2030"])
    expect(options[0]).toMatchObject({ displayIndex: 2, configYearIndex: 1 })
    expect(options[4]).toMatchObject({ displayIndex: 6, configYearIndex: 5 })
  })
})
