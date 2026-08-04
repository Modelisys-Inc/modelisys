import { describe, it, expect } from "vitest"
import type { SeriesPeriod } from "@/lib/api"
import {
  capexYearLabelsChronological,
  capexYearPeriodIndicesFromReference,
  parseFiscalYearEndMonth,
  sliceAmountsAtCapexReferenceYears,
} from "@/lib/capex-year-reference"

function makePeriods(): SeriesPeriod[] {
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
  const out: SeriesPeriod[] = []
  for (let year = 2021; year <= 2026; year++) {
    for (let month = 1; month <= 12; month++) {
      out.push({
        fiscalYear: year,
        fiscalMonth: month,
        label: `${monthNames[month - 1]} ${year}`,
      })
    }
  }
  return out
}

describe("capex year reference", () => {
  const periods = makePeriods()

  it("parses fiscal year end month", () => {
    expect(parseFiscalYearEndMonth("12-31")).toBe(12)
    expect(parseFiscalYearEndMonth("03-31")).toBe(3)
  })

  it("uses reference month for current year and fiscal year end for prior years", () => {
    const indices = capexYearPeriodIndicesFromReference(periods, 8, 2026, 12, 6)
    expect(indices.map((i) => periods[i]?.label)).toEqual([
      "Décembre 2021",
      "Décembre 2022",
      "Décembre 2023",
      "Décembre 2024",
      "Décembre 2025",
      "Août 2026",
    ])
  })

  it("builds matching chronological labels", () => {
    expect(capexYearLabelsChronological(8, 2026, 12, 6)).toEqual([
      "Déc 2021",
      "Déc 2022",
      "Déc 2023",
      "Déc 2024",
      "Déc 2025",
      "Aoû 2026",
    ])
  })

  it("slices amounts at capex year snapshots", () => {
    const amounts = periods.map((_, i) => i)
    const sliced = sliceAmountsAtCapexReferenceYears(amounts, periods, 8, 2026, 12, 3)
    expect(sliced).toEqual([
      periods.findIndex((p) => p.label === "Décembre 2024"),
      periods.findIndex((p) => p.label === "Décembre 2025"),
      periods.findIndex((p) => p.label === "Août 2026"),
    ])
  })
})
