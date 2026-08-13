import { describe, it, expect } from "vitest"
import type { SeriesPeriod } from "@/lib/api"
import {
  findPeriodIndexForCalendarMonth,
  yearPeriodIndicesFromReference,
  sliceAmountsAtReferenceMonthYears,
  referenceMonthYearLabelsFromReference,
  referenceQuarterMonthLabelsFromReference,
  flowYearTrendFromReference,
  flowYearSnapshotTrendFromReference,
  flowQuarterSnapshotTrendFromReference,
  flowQuarterTrendFromReference,
  balanceSheetYearTrendFromReference,
  yearLabelsFromReference,
  yearTrendFromReference,
} from "../series-reference-columns"
import { pickCapexDisplayIndices } from "../capex-analysis-settings"
import { PERFORMANCE_CHART_YEAR_COUNT } from "../performance-chart-series"
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

  it("defaults annual horizon helpers to 5 years (Annuel - 5 ans)", () => {
    expect(yearLabelsFromReference(2026)).toEqual(["2026", "2025", "2024", "2023", "2022"])
    expect(yearLabelsFromReference(2026)).toHaveLength(PERFORMANCE_CHART_YEAR_COUNT)
    expect(referenceMonthYearLabelsFromReference(8, 2026)).toHaveLength(PERFORMANCE_CHART_YEAR_COUNT)
    const row = {
      id: "rev",
      label: "revenus",
      amounts: Object.fromEntries(
        periods.map((p) => [`${p.fiscalYear}-${p.fiscalMonth}`, 1]),
      ),
    }
    expect(yearTrendFromReference(row, periods, 2026)).toHaveLength(PERFORMANCE_CHART_YEAR_COUNT)
  })

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

  it("pickCapexDisplayIndices uses fiscal year end for prior years when provided", () => {
    const indices = pickCapexDisplayIndices(periods.length, "years", 6, periods, 8, 2026, 12)
    expect(periods[indices[indices.length - 1]!]?.label).toBe("Août 2026")
    expect(periods[indices[indices.length - 2]!]?.label).toBe("Décembre 2025")
    expect(periods[indices[0]!]?.label).toBe("Décembre 2021")
  })

  it("builds reference month year labels", () => {
    expect(referenceMonthYearLabelsFromReference(12, 2026, 6)).toEqual([
      "Déc 2026",
      "Déc 2025",
      "Déc 2024",
      "Déc 2023",
      "Déc 2022",
      "Déc 2021",
    ])
  })

  it("picks balance sheet snapshot at reference month for each year", () => {
    const shortPeriods: SeriesPeriod[] = []
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
        shortPeriods.push({
          fiscalYear: year,
          fiscalMonth: month,
          label: `${abbrevs[month - 1]} ${year}`,
        })
      }
    }
    const amounts: Record<string, number> = {}
    for (const p of shortPeriods) {
      amounts[`${p.fiscalYear}-${p.fiscalMonth}`] = p.fiscalMonth === 12 ? p.fiscalYear * 100 : 1
    }
    const row = {
      id: "r1",
      label: "Test",
      isBold: false,
      isSection: false,
      isResult: false,
      amounts,
      detailRows: [],
    }
    expect(balanceSheetYearTrendFromReference(row, shortPeriods, 12, 2026, 3)).toEqual([
      202600,
      202500,
      202400,
    ])
  })

  it("picks cash-flow snapshot vs TTM at reference month for each year", () => {
    const shortPeriods: SeriesPeriod[] = []
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
        shortPeriods.push({
          fiscalYear: year,
          fiscalMonth: month,
          label: `${abbrevs[month - 1]} ${year}`,
        })
      }
    }
    const amounts: Record<string, number> = {}
    for (const p of shortPeriods) {
      amounts[`${p.fiscalYear}-${p.fiscalMonth}`] = p.fiscalYear === 2026 ? 10 : 5
    }
    const row = {
      id: "r1",
      label: "Test",
      isBold: false,
      isSection: false,
      isResult: false,
      amounts,
      detailRows: [],
    }
    expect(flowYearSnapshotTrendFromReference(row, shortPeriods, 12, 2026, 3)).toEqual([10, 5, 5])
    expect(flowYearTrendFromReference(row, shortPeriods, 12, 2026, 2)).toEqual([120, 60])
  })

  it("builds reference quarter month labels from December (quarter ends)", () => {
    expect(referenceQuarterMonthLabelsFromReference(12, 2026, 5)).toEqual([
      "Déc 2026",
      "Sep 2026",
      "Jun 2026",
      "Mar 2026",
      "Déc 2025",
    ])
  })

  it("builds reference quarter month labels from mid-quarter November", () => {
    expect(referenceQuarterMonthLabelsFromReference(11, 2026, 5)).toEqual([
      "Nov 2026",
      "Sep 2026",
      "Jun 2026",
      "Mar 2026",
      "Déc 2025",
    ])
  })

  it("picks cash-flow quarter snapshot vs quarter sum from reference month", () => {
    const shortPeriods: SeriesPeriod[] = []
    for (const year of [2025, 2026]) {
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
        shortPeriods.push({
          fiscalYear: year,
          fiscalMonth: month,
          label: `${abbrevs[month - 1]} ${year}`,
        })
      }
    }
    const amounts: Record<string, number> = {}
    for (const p of shortPeriods) {
      amounts[`${p.fiscalYear}-${p.fiscalMonth}`] = p.fiscalMonth
    }
    const row = {
      id: "r1",
      label: "Test",
      isBold: false,
      isSection: false,
      isResult: false,
      amounts,
      detailRows: [],
    }
    expect(flowQuarterSnapshotTrendFromReference(row, shortPeriods, 12, 2026, 3)).toEqual([
      12,
      9,
      6,
    ])
    // Q4 2026 = Oct+Nov+Déc = 10+11+12 = 33
    expect(flowQuarterTrendFromReference(row, shortPeriods, 12, 2026, 2)).toEqual([33, 24])

    expect(flowQuarterSnapshotTrendFromReference(row, shortPeriods, 11, 2026, 3)).toEqual([
      11,
      9,
      6,
    ])
    // T4 partiel Nov = Oct+Nov = 21 ; T3 = Jul+Aoû+Sep = 24
    expect(flowQuarterTrendFromReference(row, shortPeriods, 11, 2026, 2)).toEqual([21, 24])
  })

  it("sums fiscal quarter months for non-December year end (August)", () => {
    const shortPeriods: SeriesPeriod[] = []
    for (const year of [2025, 2026]) {
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
        shortPeriods.push({
          fiscalYear: year,
          fiscalMonth: month,
          label: `${abbrevs[month - 1]} ${year}`,
        })
      }
    }
    const amounts: Record<string, number> = {}
    for (const p of shortPeriods) {
      amounts[`${p.fiscalYear}-${p.fiscalMonth}`] = p.fiscalMonth
    }
    const row = {
      id: "r1",
      label: "Test",
      isBold: false,
      isSection: false,
      isResult: false,
      amounts,
      detailRows: [],
    }
    // FYE août : colonne Aoû 2026 = Jun+Jul+Aoû = 6+7+8 = 21 (pas Jul–Sep = 24)
    expect(flowQuarterTrendFromReference(row, shortPeriods, 8, 2026, 2, 8)).toEqual([21, 12])
  })
})
