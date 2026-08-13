import { describe, expect, it } from "vitest"
import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import {
  fiscalYearStartContaining,
  monthsInFiscalYearThrough,
} from "@/lib/capex-year-reference"
import {
  fiscalYearAsOfLabelsFromReference,
  fiscalYearTrendFromReference,
  trailingQuarterMonthLabelsFromReference,
  trailingQuarterTrendFromReference,
} from "@/lib/series-reference-columns"
import {
  incomeStatementQuarterLabelsForBasis,
  incomeStatementQuarterTrendForBasis,
  incomeStatementYearLabelsForBasis,
  incomeStatementYearTrendForBasis,
} from "@/lib/income-statement-period-basis"

const ABBREVS = [
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

function makePeriods(): SeriesPeriod[] {
  const out: SeriesPeriod[] = []
  for (let year = 2022; year <= 2026; year++) {
    for (let month = 1; month <= 12; month++) {
      out.push({
        fiscalYear: year,
        fiscalMonth: month,
        label: `${ABBREVS[month - 1]} ${year}`,
      })
    }
  }
  return out
}

function makeRow(periods: SeriesPeriod[]): SeriesRow {
  return {
    id: "rev",
    label: "Revenus",
    isBold: true,
    isSection: false,
    isResult: false,
    amounts: Object.fromEntries(periods.map((p) => [`${p.fiscalYear}-${p.fiscalMonth}`, p.fiscalMonth])),
    detailRows: [],
  }
}

describe("income-statement period basis Courant / Exercice", () => {
  const periods = makePeriods()
  const row = makeRow(periods)

  it("résout le début d'exercice et le YTD fiscal", () => {
    expect(fiscalYearStartContaining(8, 2026, 12)).toEqual({ month: 1, year: 2026 })
    expect(monthsInFiscalYearThrough(8, 2026, 12).map((p) => p.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(fiscalYearStartContaining(8, 2026, 3)).toEqual({ month: 4, year: 2026 })
    expect(monthsInFiscalYearThrough(8, 2026, 3)).toEqual([
      { month: 4, year: 2026 },
      { month: 5, year: 2026 },
      { month: 6, year: 2026 },
      { month: 7, year: 2026 },
      { month: 8, year: 2026 },
    ])
    expect(fiscalYearStartContaining(3, 2026, 3)).toEqual({ month: 4, year: 2025 })
  })

  it("Annuel Exercice : Aoû 2026 YTD puis Déc des exercices clos", () => {
    expect(fiscalYearAsOfLabelsFromReference(8, 2026, 5, 12)).toEqual([
      "Aoû 2026",
      "Déc 2025",
      "Déc 2024",
      "Déc 2023",
      "Déc 2022",
    ])
    expect(incomeStatementYearLabelsForBasis(8, 2026, "fiscal", 12)).toEqual([
      "Aoû 2026",
      "Déc 2025",
      "Déc 2024",
      "Déc 2023",
      "Déc 2022",
    ])
    // YTD jan–aoû = 36 ; année pleine = 78
    expect(fiscalYearTrendFromReference(row, periods, 8, 2026, 3, 12)).toEqual([36, 78, 78])
  })

  it("Annuel Courant : même mois, TTM", () => {
    expect(incomeStatementYearLabelsForBasis(8, 2026, "current", 12)).toEqual([
      "Aoû 2026",
      "Aoû 2025",
      "Aoû 2024",
      "Aoû 2023",
      "Aoû 2022",
    ])
    // TTM aoû avec montants = n° de mois : 9+10+11+12 + 1..8 = 78
    expect(incomeStatementYearTrendForBasis(row, periods, 8, 2026, "current", 12, 3)).toEqual([
      78, 78, 78,
    ])
  })

  it("Annuel Exercice avec clôture 31 mars : Aoû 2026 puis Mar 2026…", () => {
    expect(fiscalYearAsOfLabelsFromReference(8, 2026, 3, 3)).toEqual([
      "Aoû 2026",
      "Mar 2026",
      "Mar 2025",
    ])
    expect(fiscalYearTrendFromReference(row, periods, 8, 2026, 2, 3)).toEqual([
      30, // avr–aoû
      78, // avr 2025–mar 2026
    ])
  })

  it("Trimestriel Courant : T3M tous les 3 mois", () => {
    expect(trailingQuarterMonthLabelsFromReference(8, 2026, 5)).toEqual([
      "Aoû 2026",
      "Mai 2026",
      "Fév 2026",
      "Nov 2025",
      "Aoû 2025",
    ])
    expect(incomeStatementQuarterLabelsForBasis(8, 2026, "current", 12)).toEqual([
      "Aoû 2026",
      "Mai 2026",
      "Fév 2026",
      "Nov 2025",
      "Aoû 2025",
    ])
    expect(trailingQuarterTrendFromReference(row, periods, 8, 2026, 2)).toEqual([
      21, // jun+jul+aoû
      12, // mar+avr+mai
    ])
  })

  it("Trimestriel Exercice : QTD puis fins de trimestres fiscaux", () => {
    expect(incomeStatementQuarterLabelsForBasis(8, 2026, "fiscal", 12)).toEqual([
      "Aoû 2026",
      "Jun 2026",
      "Mar 2026",
      "Déc 2025",
      "Sep 2025",
    ])
    expect(incomeStatementQuarterTrendForBasis(row, periods, 8, 2026, "fiscal", 12, 2)).toEqual([
      15, // jul+aoû (T3 partiel)
      15, // avr+mai+jun
    ])
  })
})
