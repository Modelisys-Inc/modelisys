import { describe, it, expect } from "vitest"
import type { SeriesPeriod } from "@/lib/api"
import {
  capexYearLabelsChronological,
  capexYearPeriodIndicesFromReference,
  endOfPriorFiscalQuarter,
  endOfPriorFiscalYear,
  monthsInFiscalQuarterContaining,
  fiscalYearStartContaining,
  monthsInFiscalQuarterThrough,
  monthsInFiscalYearThrough,
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

  it("lists calendar months in the fiscal quarter containing a reference month", () => {
    expect(monthsInFiscalQuarterContaining(8, 2026, 12)).toEqual([
      { month: 7, year: 2026 },
      { month: 8, year: 2026 },
      { month: 9, year: 2026 },
    ])
    expect(monthsInFiscalQuarterContaining(8, 2026, 8)).toEqual([
      { month: 6, year: 2026 },
      { month: 7, year: 2026 },
      { month: 8, year: 2026 },
    ])
    expect(monthsInFiscalQuarterContaining(1, 2025, 3)).toEqual([
      { month: 1, year: 2025 },
      { month: 2, year: 2025 },
      { month: 3, year: 2025 },
    ])
  })

  it("truncates the current fiscal quarter through the as-of month", () => {
    expect(monthsInFiscalQuarterThrough(11, 2026, 12)).toEqual([
      { month: 10, year: 2026 },
      { month: 11, year: 2026 },
    ])
    expect(monthsInFiscalQuarterThrough(12, 2026, 12)).toEqual([
      { month: 10, year: 2026 },
      { month: 11, year: 2026 },
      { month: 12, year: 2026 },
    ])
  })

  it("lists fiscal year months through the as-of date", () => {
    expect(fiscalYearStartContaining(8, 2026, 12)).toEqual({ month: 1, year: 2026 })
    expect(monthsInFiscalYearThrough(8, 2026, 12)).toHaveLength(8)
    expect(monthsInFiscalYearThrough(12, 2026, 12)).toHaveLength(12)
    expect(monthsInFiscalYearThrough(8, 2026, 3)).toEqual([
      { month: 4, year: 2026 },
      { month: 5, year: 2026 },
      { month: 6, year: 2026 },
      { month: 7, year: 2026 },
      { month: 8, year: 2026 },
    ])
  })

  it("resolves the end of the prior fiscal quarter", () => {
    expect(endOfPriorFiscalQuarter(11, 2026, 12)).toEqual({ month: 9, year: 2026 })
    expect(endOfPriorFiscalQuarter(12, 2026, 12)).toEqual({ month: 9, year: 2026 })
    expect(endOfPriorFiscalQuarter(8, 2026, 8)).toEqual({ month: 5, year: 2026 })
  })

  it("resolves the end of the prior fiscal year for a mid-year as-of", () => {
    expect(endOfPriorFiscalYear(8, 2026, 12)).toEqual({ month: 12, year: 2025 })
    expect(endOfPriorFiscalYear(12, 2026, 12)).toEqual({ month: 12, year: 2025 })
    expect(endOfPriorFiscalYear(8, 2026, 3)).toEqual({ month: 3, year: 2026 })
    expect(endOfPriorFiscalYear(3, 2026, 3)).toEqual({ month: 3, year: 2025 })
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
