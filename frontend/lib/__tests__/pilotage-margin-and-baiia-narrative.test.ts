import { describe, expect, it } from "vitest"
import { EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL } from "@/lib/expense-bridge-chart-theme"
import {
  buildPilotageMarginAndBaiiaParagraphs,
  decomposeBaiiaChange,
} from "@/lib/pilotage-margin-and-baiia-narrative"
import type { MonthlyExpenseBridgePoint } from "@/lib/pilotage-revenue-metrics"

function monthPoint(
  month: number,
  year: number,
  revenue: number,
  variableCosts: number,
  fixedCosts: number,
): MonthlyExpenseBridgePoint {
  const abbrevs = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"] as const
  return {
    period: `${abbrevs[month - 1]} ${year}`,
    month,
    year,
    revenue,
    variableCosts,
    fixedCosts,
  }
}

function buildSeries(): MonthlyExpenseBridgePoint[] {
  const points: MonthlyExpenseBridgePoint[] = []
  for (let index = 0; index < 24; index += 1) {
    const month = ((8 - index) % 12) + (index > 8 ? 0 : 1)
    const normalizedMonth = month <= 0 ? month + 12 : month
    const year = normalizedMonth > 8 && index >= 12 ? 2025 : 2026
    points.push(monthPoint(normalizedMonth, year, 1_000_000, 400_000, 250_000))
  }
  return points
}

describe("decomposeBaiiaChange", () => {
  it("répartit la variation du BAIIA entre contribution marginale et coûts fixes", () => {
    const prior = { revenue: 1_000_000, variableCosts: 400_000, fixedCosts: 250_000 }
    const current = { revenue: 1_050_000, variableCosts: 416_000, fixedCosts: 260_000 }

    const bridge = decomposeBaiiaChange(current, prior)

    expect(bridge.baiiaPrior).toBe(350_000)
    expect(bridge.baiiaCurrent).toBe(374_000)
    expect(bridge.baiiaDelta).toBe(24_000)
    expect(bridge.contributiveMarginDelta).toBe(34_000)
    expect(bridge.fixedCostDelta).toBe(10_000)
    expect(bridge.fixedCostImpactOnBaiia).toBe(-10_000)
    expect(bridge.revenueGrowthPct).toBeCloseTo(5, 1)
    expect(bridge.fixedCostGrowthPct).toBeCloseTo(4, 1)
  })
})

describe("buildPilotageMarginAndBaiiaParagraphs", () => {
  it("suit le modèle en trois phrases pour la performance actuelle", () => {
    const series = buildSeries()
    const ref = series[0]!
    const yoy = series[12]!

    ref.revenue = 1_193_000
    ref.variableCosts = 477_200
    ref.fixedCosts = 261_344
    yoy.revenue = 1_000_000
    yoy.variableCosts = 400_000
    yoy.fixedCosts = 254_000

    const current = buildPilotageMarginAndBaiiaParagraphs(series, "12-31").find(
      (paragraph) => paragraph.subsection === "Performance actuelle",
    )

    expect(current?.body).toContain(`${EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL} progresse de`)
    expect(current?.body).toContain("par rapport à")
    expect(current?.body).toContain("soit une hausse de")
    expect(current?.body).toContain(
      "Cette hausse s'explique par le fait que la contribution marginale est demeurée relativement stable",
    )
    expect(current?.body).toContain("les coûts fixes ont seulement augmenté de")
    expect(current?.body).toContain(
      "Ainsi, la hausse du BAIIA s'explique par le maintien de la contribution marginale et du fait que les revenus ont augmenté plus rapidement que les coûts fixes",
    )
    expect(current?.body).toContain("vs")
  })

  it("mentionne une contribution marginale en amélioration quand le taux progresse", () => {
    const series = buildSeries()
    const ref = series[0]!
    const yoy = series[12]!

    ref.revenue = 1_120_000
    ref.variableCosts = 448_000
    ref.fixedCosts = 250_000
    yoy.revenue = 1_000_000
    yoy.variableCosts = 500_000
    yoy.fixedCosts = 250_000

    const current = buildPilotageMarginAndBaiiaParagraphs(series, "12-31").find(
      (paragraph) => paragraph.subsection === "Performance actuelle",
    )

    expect(current?.body).toContain("la contribution marginale s'est améliorée")
    expect(current?.body).toContain("l'amélioration de la contribution marginale")
  })

  it("explique une baisse du BAIIA liée au recul de la contribution marginale", () => {
    const series = buildSeries()
    const ref = series[0]!
    const yoy = series[12]!

    ref.revenue = 1_020_000
    ref.variableCosts = 620_000
    ref.fixedCosts = 250_000
    yoy.revenue = 1_000_000
    yoy.variableCosts = 500_000
    yoy.fixedCosts = 250_000

    const bridge = decomposeBaiiaChange(
      { revenue: ref.revenue, variableCosts: ref.variableCosts, fixedCosts: ref.fixedCosts },
      { revenue: yoy.revenue, variableCosts: yoy.variableCosts, fixedCosts: yoy.fixedCosts },
    )
    expect(bridge.baiiaDelta).toBeLessThan(0)

    const current = buildPilotageMarginAndBaiiaParagraphs(series, "12-31").find(
      (paragraph) => paragraph.subsection === "Performance actuelle",
    )

    expect(current?.body).toContain("recule de")
    expect(current?.body).toContain("Cette baisse s'explique par le fait que")
    expect(current?.body).toContain("la contribution marginale a reculé")
    expect(current?.body).toContain("Ainsi, la baisse du BAIIA s'explique par")
  })

  it("couvre YTD et TTM avec la même structure", () => {
    const paragraphs = buildPilotageMarginAndBaiiaParagraphs(buildSeries(), "12-31")
    expect(paragraphs.map((paragraph) => paragraph.subsection)).toEqual([
      "Performance actuelle",
      "Performance de l'exercice (YTD)",
      "Tendance des 12 derniers mois",
    ])
    expect(paragraphs[1]?.body).toContain("Depuis le début de l'exercice")
    expect(paragraphs[1]?.body).toContain("s'explique par le fait que")
    expect(paragraphs[2]?.body).toContain("douze derniers mois glissants")
    expect(paragraphs[2]?.body).toMatch(/(Ainsi,|est stable par rapport)/)
  })
})
