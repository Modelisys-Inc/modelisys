import { describe, it, expect } from "vitest"
import type { SeriesPeriod } from "@/lib/api"
import {
  findPeriodIndexForCalendarMonth,
  yearPeriodIndicesFromReference,
  sliceAmountsAtReferenceMonthYears,
} from "../series-reference-columns"
import { pickCapexDisplayIndices } from "../capex-analysis-settings"

function makePeriods(): SeriesPeriod[] {
  const out: SeriesPeriod[] = []
  for (let year = 2021; year <= 2026; year++) {
    for (let month = 1; month <= 12; month++) {
      const monthNames = [
        "Janvier",
        "Février",
        "Mars",
        "Avril",
        "Mai",
        "Juin",
        "Juillet",
        "Août",
        "Septembre",
        "Octobre",
        "Novembre",
        "Décembre",
      ]
      out.push({
        fiscalYear: year,
        fiscalMonth: month,
        label: `${monthNames[month - 1]} ${year}`,
      })
    }
  }
  return out
}

describe("reference month year snapshots", () => {
  const periods = makePeriods()

  it("finds August of each calendar year", () => {
    expect(findPeriodIndexForCalendarMonth(periods, 8, 2026)).toBe(
      periods.findIndex((p) => p.label === "Août 2026"),
    )
    expect(findPeriodIndexForCalendarMonth(periods, 8, 2025)).toBe(
      periods.findIndex((p) => p.label === "Août 2025"),
    )
    expect(periods[findPeriodIndexForCalendarMonth(periods, 8, 2025)!]?.label).toBe("Août 2025")
  })

  it("builds chronological year indices from reference August 2026", () => {
    const indices = yearPeriodIndicesFromReference(periods, 8, 2026, 6)
    expect(indices).toHaveLength(6)
    expect(indices.map((i) => periods[i]?.label)).toEqual([
      "Août 2021",
      "Août 2022",
      "Août 2023",
      "Août 2024",
      "Août 2025",
      "Août 2026",
    ])
  })

  it("slices amounts at reference month years", () => {
    const amounts = periods.map((_, i) => i)
    expect(sliceAmountsAtReferenceMonthYears(amounts, periods, 8, 2026, 3)).toEqual([
      periods.findIndex((p) => p.label === "Août 2024"),
      periods.findIndex((p) => p.label === "Août 2025"),
      periods.findIndex((p) => p.label === "Août 2026"),
    ])
  })

  it("pickCapexDisplayIndices uses reference month for years view", () => {
    const indices = pickCapexDisplayIndices(periods.length, "years", 6, periods, 8, 2026)
    expect(periods[indices[indices.length - 1]!]?.label).toBe("Août 2026")
    expect(periods[indices[0]!]?.label).toBe("Août 2021")
  })
})
