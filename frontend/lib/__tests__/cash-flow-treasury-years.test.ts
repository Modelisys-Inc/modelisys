import { describe, expect, it } from "vitest"
import type { SeriesPeriod } from "@/lib/api"
import {
  buildBeginningCashTrendForReferenceMonthYears,
  buildEndingBookTrendForReferenceMonthYears,
  buildBeginningCashTrendForReferenceQuarterMonths,
  buildEndingBookTrendForReferenceQuarterMonths,
} from "@/lib/cash-flow-treasury-rows"

function makeDecemberPeriods(): SeriesPeriod[] {
  const out: SeriesPeriod[] = []
  for (const year of [2024, 2025, 2026]) {
    for (let month = 1; month <= 12; month++) {
      const abbrevs = [
        "Jan",
        "Fév",
        "Mar",
        "Avr",
        "Mai",
        "Jun",
        "Jul",
        "Aoû",
        "Sep",
        "Oct",
        "Nov",
        "Déc",
      ] as const
      out.push({
        fiscalYear: year,
        fiscalMonth: month,
        label: `${abbrevs[month - 1]} ${year}`,
      })
    }
  }
  return out
}

describe("cash-flow treasury years horizon", () => {
  it("uses prior-year same month for beginning cash", () => {
    const periods = makeDecemberPeriods()
    const netByPeriod = new Map<string, number>([
      ["2025-12", 1000],
      ["2026-12", 2000],
    ])
    const beginning = buildBeginningCashTrendForReferenceMonthYears(netByPeriod, periods, {
      refMonth: 12,
      refYear: 2026,
      count: 2,
    })
    const ending = buildEndingBookTrendForReferenceMonthYears(netByPeriod, periods, {
      refMonth: 12,
      refYear: 2026,
      count: 2,
    })
    expect(beginning).toEqual([1000, 0])
    expect(ending).toEqual([2000, 1000])
  })
})

describe("cash-flow treasury quarters horizon", () => {
  it("uses prior-quarter end month for beginning cash", () => {
    const periods = makeDecemberPeriods()
    const netByPeriod = new Map<string, number>([
      ["2026-12", 2000],
      ["2026-9", 1500],
      ["2026-6", 1200],
    ])
    const beginning = buildBeginningCashTrendForReferenceQuarterMonths(netByPeriod, periods, {
      refMonth: 12,
      refYear: 2026,
      count: 2,
    })
    const ending = buildEndingBookTrendForReferenceQuarterMonths(netByPeriod, periods, {
      refMonth: 12,
      refYear: 2026,
      count: 2,
    })
    expect(ending).toEqual([2000, 1500])
    expect(beginning).toEqual([1500, 1200])
  })

  it("for mid-quarter November, columns are Nov then Sep (not Aug)", () => {
    const periods = makeDecemberPeriods()
    const netByPeriod = new Map<string, number>([
      ["2026-11", 1800],
      ["2026-9", 1500],
      ["2026-6", 1200],
    ])
    const ending = buildEndingBookTrendForReferenceQuarterMonths(netByPeriod, periods, {
      refMonth: 11,
      refYear: 2026,
      count: 2,
    })
    const beginning = buildBeginningCashTrendForReferenceQuarterMonths(netByPeriod, periods, {
      refMonth: 11,
      refYear: 2026,
      count: 2,
    })
    expect(ending).toEqual([1800, 1500])
    // Début Nov = fin Sep ; début Sep = fin Jun
    expect(beginning).toEqual([1500, 1200])
  })

  it("Annuel Exercice : clôture puis FYE, début = FYE précédent", () => {
    const periods = makeDecemberPeriods()
    const netByPeriod = new Map<string, number>([
      ["2026-8", 1800],
      ["2025-12", 1500],
      ["2024-12", 1200],
    ])
    const opts = {
      refMonth: 8,
      refYear: 2026,
      count: 3,
      periodBasis: "fiscal" as const,
      fiscalYearEndMonth: 12,
    }
    expect(buildEndingBookTrendForReferenceMonthYears(netByPeriod, periods, opts)).toEqual([
      1800, 1500, 1200,
    ])
    expect(buildBeginningCashTrendForReferenceMonthYears(netByPeriod, periods, opts)).toEqual([
      1500, 1200, 0,
    ])
  })

  it("Trimestriel Courant : colonnes tous les 3 mois, début = T−3", () => {
    const periods = makeDecemberPeriods()
    const netByPeriod = new Map<string, number>([
      ["2026-8", 1800],
      ["2026-5", 1500],
      ["2026-2", 1200],
    ])
    const opts = {
      refMonth: 8,
      refYear: 2026,
      count: 2,
      periodBasis: "current" as const,
      fiscalYearEndMonth: 12,
    }
    expect(buildEndingBookTrendForReferenceQuarterMonths(netByPeriod, periods, opts)).toEqual([
      1800, 1500,
    ])
    expect(buildBeginningCashTrendForReferenceQuarterMonths(netByPeriod, periods, opts)).toEqual([
      1500, 1200,
    ])
  })
})
