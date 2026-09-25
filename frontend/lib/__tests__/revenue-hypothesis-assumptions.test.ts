import { describe, expect, it } from "vitest"
import {
  buildRevenueHypothesisAssumptionRows,
  formatRevenueAssumptionGrowth,
  formatRevenueAssumptionSeasonality,
  projectedYearLabel,
} from "@/lib/revenue-hypothesis-assumptions"
import { createDefaultForecastSeasonalityMonthPercents } from "@/lib/forecast-seasonality-utils"

describe("revenue-hypothesis-assumptions", () => {
  it("formats growth types", () => {
    expect(formatRevenueAssumptionGrowth({ id: "a", type: "growthPercent", value: 5 })).toBe(
      "+5,0 %",
    )
    expect(formatRevenueAssumptionGrowth({ id: "a", type: "growthPercent", value: -2.5 })).toBe(
      "-2,5 %",
    )
    expect(formatRevenueAssumptionGrowth({ id: "a", type: "custom", value: 0 })).toBe(
      "Formule personnalisée",
    )
  })

  it("formats seasonality", () => {
    expect(formatRevenueAssumptionSeasonality(undefined)).toBe("Par défaut")
    expect(formatRevenueAssumptionSeasonality(createDefaultForecastSeasonalityMonthPercents())).toBe(
      "Uniforme",
    )
    const peaked = createDefaultForecastSeasonalityMonthPercents()
    peaked[6] = 40
    expect(formatRevenueAssumptionSeasonality(peaked)).toMatch(/Personnalisée \(pic juil\.\)/)
  })

  it("maps projected year labels from config indices", () => {
    expect(projectedYearLabel(2026, 1)).toBe("2026")
    expect(projectedYearLabel(2026, 2)).toBe("2027")
  })

  it("builds one row per poste × projected year with an adjustment", () => {
    const rows = buildRevenueHypothesisAssumptionRows({
      revenueAdjustments: {
        "rev-1-1": [{ id: "a", type: "growthPercent", value: 10, note: "Pipeline" }],
        "rev-1-2": [
          {
            id: "b",
            type: "growthAmount",
            value: 5000,
            seasonalityMonthPercents: createDefaultForecastSeasonalityMonthPercents(),
          },
        ],
        "rev-1-0": [{ id: "skip", type: "growthPercent", value: 1 }],
      },
      labelsByRowId: { "rev-1": "Produits" },
      forecastBaseYear: 2026,
      projectionYears: 3,
    })
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      poste: "Produits",
      yearLabel: "2026",
      croissance: "+10,0 %",
      saisonnalite: "Par défaut",
      note: "Pipeline",
    })
    expect(rows[1]).toMatchObject({
      yearLabel: "2027",
      saisonnalite: "Uniforme",
    })
  })
})
