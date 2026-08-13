import { describe, expect, it } from "vitest"
import {
  computePilotagePerformanceMetrics,
  computePilotageRevenueMetrics,
  fiscalYearStartForReference,
  type MonthlyPerformancePoint,
} from "@/lib/pilotage-revenue-metrics"
import {
  buildPilotagePerformanceParagraphs,
  buildPilotageRevenuePerformanceParagraphs,
} from "@/lib/pilotage-revenue-performance-narrative"

function monthPoint(month: number, year: number, amount: number) {
  const abbrevs = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"] as const
  return {
    period: `${abbrevs[month - 1]} ${year}`,
    month,
    year,
    amount,
  }
}

function performancePoint(
  month: number,
  year: number,
  revenue: number,
  marginRate = 0.4,
  fixedCosts = 50_000,
): MonthlyPerformancePoint {
  const contributiveMargin = revenue * marginRate
  const operatingProfit = contributiveMargin - fixedCosts
  const abbrevs = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"] as const
  return {
    period: `${abbrevs[month - 1]} ${year}`,
    month,
    year,
    revenue,
    contributiveMargin,
    contributiveMarginPercent: revenue > 0 ? marginRate * 100 : null,
    operatingProfit,
  }
}

describe("pilotage-revenue-metrics", () => {
  it("calcule YTD et TTM sur une série mensuelle", () => {
    const series = Array.from({ length: 24 }, (_, index) => {
      const month = 12 - (index % 12)
      const year = 2026 - Math.floor(index / 12)
      return monthPoint(month === 0 ? 12 : month, month === 0 ? year - 1 : year, 100_000 + index * 1_000)
    })

    const metrics = computePilotageRevenueMetrics(series, "12-31")
    expect(metrics?.reference.month).toBe(12)
    expect(metrics?.ytd?.current).toBeGreaterThan(0)
    expect(metrics?.ttm?.current).toBeGreaterThan(0)
    expect(metrics?.ttm?.prior).toBeGreaterThan(0)
  })

  it("détermine le début d'exercice calendaire", () => {
    expect(fiscalYearStartForReference(8, 2026, 12)).toEqual({ month: 1, year: 2026 })
    expect(fiscalYearStartForReference(2, 2026, 3)).toEqual({ month: 4, year: 2025 })
  })

  it("calcule revenus, marge et BAIIA sur une série de performance", () => {
    const series = Array.from({ length: 24 }, (_, index) => {
      const month = ((12 - index - 1 + 12) % 12) + 1
      const year = index < 12 ? 2026 : 2025
      return performancePoint(month, year, 1_000_000 + index * 10_000)
    })

    const bundle = computePilotagePerformanceMetrics(series, "12-31")
    expect(bundle?.revenue.reference.value).toBeGreaterThan(0)
    expect(bundle?.contributiveMargin.reference.value).toBeCloseTo(40, 0)
    expect(bundle?.ebita.reference.value).toBeGreaterThan(0)
    expect(bundle?.contributiveMargin.ytd?.current).toBeCloseTo(40, 0)
  })
})

describe("pilotage-revenue-performance-narrative", () => {
  it("produit trois paragraphes Revenus sans budget", () => {
    const series = Array.from({ length: 24 }, (_, index) =>
      monthPoint(((12 - index - 1 + 12) % 12) + 1, index < 12 ? 2026 : 2025, 1_000_000),
    )
    const metrics = computePilotageRevenueMetrics(series, "12-31")
    expect(metrics).not.toBeNull()

    const paragraphs = buildPilotageRevenuePerformanceParagraphs(metrics!, null)
    expect(paragraphs).toHaveLength(3)
    expect(paragraphs[0]?.divisionTitle).toBe("Revenus")
    expect(paragraphs[0]?.subsection).toBe("Performance actuelle")
    expect(paragraphs[0]?.body).toContain("Aucun budget prévisionnel")
    expect(paragraphs[1]?.subsection).toBe("Performance de l'exercice (YTD)")
    expect(paragraphs[2]?.subsection).toBe("Tendance des 12 derniers mois")
  })

  it("produit neuf paragraphes (3 blocs) sans budget", () => {
    const series = Array.from({ length: 24 }, (_, index) => {
      const month = ((12 - index - 1 + 12) % 12) + 1
      const year = index < 12 ? 2026 : 2025
      return performancePoint(month, year, 1_000_000)
    })
    const bundle = computePilotagePerformanceMetrics(series, "12-31")
    expect(bundle).not.toBeNull()

    const paragraphs = buildPilotagePerformanceParagraphs(bundle!, null)
    expect(paragraphs).toHaveLength(9)
    expect(paragraphs[0]?.divisionTitle).toBe("Revenus")
    expect(paragraphs[3]?.divisionTitle).toBe("Contribution marginale")
    expect(paragraphs[3]?.subsection).toBe("Performance actuelle")
    expect(paragraphs[3]?.body).toContain("contribution marginale")
    expect(paragraphs[6]?.divisionTitle).toBe("BAIIA")
    expect(paragraphs[6]?.subsection).toBe("Performance actuelle")
    expect(paragraphs[6]?.body).toContain("BAIIA")
  })

  it("mentionne le budget lorsqu'il est disponible", () => {
    const metrics = computePilotageRevenueMetrics(
      [
        monthPoint(8, 2026, 1_080_938),
        monthPoint(7, 2026, 1_086_000),
        ...Array.from({ length: 22 }, (_, i) => monthPoint(((6 - i + 12) % 12) + 1, 2026, 900_000)),
      ],
      "12-31",
    )
    expect(metrics).not.toBeNull()

    const paragraphs = buildPilotageRevenuePerformanceParagraphs(metrics!, {
      monthlyRevenue: 1_106_000,
      ytdRevenue: 10_580_000,
      ttmRevenue: 15_200_000,
    })
    expect(paragraphs[0]?.body).toContain("budget mensuel")
    expect(paragraphs[1]?.body).toContain("budget cumulatif")
  })
})
