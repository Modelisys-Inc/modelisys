import { describe, expect, it } from "vitest"
import {
  buildCapexHypothesisAssumptionRows,
  formatCapexAssumptionAdjustment,
} from "@/lib/capex-hypothesis-assumptions"
import { createDefaultForecastSeasonalityMonthPercents } from "@/lib/forecast-seasonality-utils"

describe("capex-hypothesis-assumptions", () => {
  it("formats adjustment types", () => {
    expect(
      formatCapexAssumptionAdjustment({
        id: "a",
        rowId: "r",
        yearIndex: 1,
        type: "growthPercent",
        value: 10,
      }),
    ).toBe("+10,0 %")
    expect(
      formatCapexAssumptionAdjustment({
        id: "a",
        rowId: "r",
        yearIndex: 1,
        type: "percentRevenue",
        value: 5,
      }),
    ).toBe("5,0 % des revenus")
  })

  it("builds rows for projected years", () => {
    const rows = buildCapexHypothesisAssumptionRows({
      capexAdjustments: {
        "alt-1-1": [
          {
            id: "a",
            rowId: "alt-1",
            yearIndex: 1,
            type: "amount",
            value: 100_000,
            note: "Expansion",
            seasonalityMonthPercents: createDefaultForecastSeasonalityMonthPercents(),
          },
        ],
      },
      labelsByRowId: { "alt-1": "Terrains" },
      forecastBaseYear: 2026,
      projectionYears: 3,
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      poste: "Terrains",
      yearLabel: "2026",
      saisonnalite: "Uniforme",
      note: "Expansion",
    })
  })
})
