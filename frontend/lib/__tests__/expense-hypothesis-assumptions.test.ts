import { describe, expect, it } from "vitest"
import {
  buildExpenseHypothesisAssumptionRows,
  formatExpenseAssumptionAdjustment,
} from "@/lib/expense-hypothesis-assumptions"
import { createDefaultForecastSeasonalityMonthPercents } from "@/lib/forecast-seasonality-utils"

describe("expense-hypothesis-assumptions", () => {
  it("formats adjustment types", () => {
    expect(
      formatExpenseAssumptionAdjustment({ id: "a", type: "percentage", percentage: 38 }),
    ).toBe("38,0 % des revenus")
    expect(
      formatExpenseAssumptionAdjustment({ id: "a", type: "inflation", inflationRate: 2 }),
    ).toBe("Inflation +2,0 %")
    expect(
      formatExpenseAssumptionAdjustment({
        id: "a",
        type: "amount",
        amount: 5000,
        isRecurring: true,
      }),
    ).toMatch(/\(récurrent\)/)
  })

  it("builds rows for projected years with expense adjustments", () => {
    const rows = buildExpenseHypothesisAssumptionRows({
      expenseAdjustments: {
        "exp-1-1": [
          {
            id: "a",
            type: "inflation",
            inflationRate: 3,
            note: "Hausse salaires",
            seasonalityMonthPercents: createDefaultForecastSeasonalityMonthPercents(),
          },
        ],
        "exp-1-0": [{ id: "skip", type: "amount", amount: 1 }],
      },
      labelsByRowId: { "exp-1": "Achats" },
      forecastBaseYear: 2026,
      projectionYears: 3,
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      poste: "Achats",
      yearLabel: "2026",
      ajustement: "Inflation +3,0 %",
      saisonnalite: "Uniforme",
      note: "Hausse salaires",
    })
  })
})
