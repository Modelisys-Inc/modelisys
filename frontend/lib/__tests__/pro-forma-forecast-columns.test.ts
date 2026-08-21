import { describe, expect, it } from "vitest"
import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import {
  forecastActualColumnCount,
  forecastActualSnapshotDates,
  forecastBalanceSheetActualPrefixValues,
  forecastCashFlowYearTrend,
  forecastConfigToDisplayYearIndex,
  forecastDisplayToConfigYearIndex,
  forecastDisplayTrendToConfigTrend,
  forecastDisplayYearCount,
  forecastGrowthBaseDisplayIndex,
  forecastGrowthPreviousConfigYearIndex,
  forecastTrendFromActualPrefix,
  forecastYearLabelsForLayout,
  forecastYtdColumnNeeded,
  isForecastProjectedDisplayColumn,
  lastCompletedFiscalYearEnd,
  lastTwoCompletedFiscalYearEnds,
  balanceSheetFiscalYearEndAmountsByYear,
  incomeStatementFiscalYearTotalsByYear,
  mergeConfigYearsOntoForecastDisplay,
  nMinusOneAndYtdActuals,
  parseForecastColumnCalendarAnchor,
  resolveForecastActualLayout,
} from "@/lib/pro-forma-forecast-columns"

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
  for (let year = 2024; year <= 2026; year++) {
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

function makeRow(periods: SeriesPeriod[], monthly: (year: number, month: number) => number): SeriesRow {
  return {
    id: "rev",
    label: "Revenus",
    isBold: true,
    isSection: false,
    isResult: false,
    amounts: Object.fromEntries(
      periods.map((p) => [`${p.fiscalYear}-${p.fiscalMonth}`, monthly(p.fiscalYear, p.fiscalMonth)]),
    ),
    detailRows: [],
  }
}

describe("forecastGrowthPreviousConfigYearIndex", () => {
  it("uses N-1 for the first projected year when YTD is shown", () => {
    expect(forecastGrowthPreviousConfigYearIndex(1, 2)).toBe("nMinusOne")
    expect(forecastGrowthPreviousConfigYearIndex(2, 2)).toBe(1)
    expect(forecastGrowthPreviousConfigYearIndex(1, 1)).toBe(0)
    expect(forecastGrowthPreviousConfigYearIndex(0, 2)).toBeNull()
  })
})

describe("forecastGrowthBaseDisplayIndex", () => {
  it("points the first projected display column at N-1 when YTD is shown", () => {
    expect(forecastGrowthBaseDisplayIndex(2, 2)).toBe(0)
    expect(forecastGrowthBaseDisplayIndex(3, 2)).toBe(2)
    expect(forecastGrowthBaseDisplayIndex(1, 1)).toBe(0)
    expect(forecastGrowthBaseDisplayIndex(0, 2)).toBeNull()
  })
})

describe("forecastDisplayToConfigYearIndex for comptes clients CA", () => {
  it("maps the first projected display column to revenue config index 1 when YTD is shown", () => {
    // Display: [N-1=0, YTD=1, 2026=2, 2027=3] → config: [réel=0, 2026=1, 2027=2]
    expect(forecastDisplayToConfigYearIndex(2, 2)).toBe(1)
    expect(forecastDisplayToConfigYearIndex(3, 2)).toBe(2)
    expect(forecastDisplayToConfigYearIndex(0, 2)).toBeNull()
    expect(forecastDisplayToConfigYearIndex(1, 1)).toBe(1)
  })
})

describe("pro forma N-1 + YTD columns", () => {
  const periods = makePeriods()

  it("resolves N-1 as the last completed fiscal year-end", () => {
    expect(lastCompletedFiscalYearEnd(3, 2026, 12)).toEqual({ month: 12, year: 2025 })
    expect(lastCompletedFiscalYearEnd(12, 2026, 12)).toEqual({ month: 12, year: 2025 })
    expect(lastCompletedFiscalYearEnd(3, 2026, 3)).toEqual({ month: 3, year: 2025 })
  })

  it("lists N-2 then N-1 fiscal year-ends for hypothesis history tables", () => {
    expect(lastTwoCompletedFiscalYearEnds(8, 2026, 12)).toEqual([
      { month: 12, year: 2024 },
      { month: 12, year: 2025 },
    ])
    expect(lastTwoCompletedFiscalYearEnds(3, 2026, 3)).toEqual([
      { month: 3, year: 2024 },
      { month: 3, year: 2025 },
    ])
  })

  it("reads bilan history at FYE (not mid-year ref month) to match the N-1 column", () => {
    const periods = makePeriods()
    // Déc 2024 = 100, Aoû 2025 = 50, Déc 2025 = 200, Aoû 2026 = 75
    const row: SeriesRow = {
      id: "PCT-C",
      label: "Créditeurs",
      amounts: Object.fromEntries(
        periods.map((p) => {
          const key = `${p.fiscalYear}-${p.fiscalMonth}`
          if (p.fiscalYear === 2024 && p.fiscalMonth === 12) return [key, 100]
          if (p.fiscalYear === 2025 && p.fiscalMonth === 8) return [key, 50]
          if (p.fiscalYear === 2025 && p.fiscalMonth === 12) return [key, 200]
          if (p.fiscalYear === 2026 && p.fiscalMonth === 8) return [key, 75]
          return [key, 1]
        }),
      ),
      detailRows: [],
    }
    const ends = lastTwoCompletedFiscalYearEnds(8, 2026, 12)
    expect(balanceSheetFiscalYearEndAmountsByYear(row, periods, ends)).toEqual({
      2024: 100,
      2025: 200,
    })
    // Préfixe N-1 du tableau = même solde de clôture 2025
    expect(
      forecastBalanceSheetActualPrefixValues("nMinusOne-and-ytd", row, periods, 8, 2026, 12)[0],
    ).toBe(200)
  })

  it("sums full fiscal years for REV/CMV history (not mid-year TTM)", () => {
    const periods = makePeriods()
    const row = makeRow(periods, (year) => (year === 2024 ? 10 : year === 2025 ? 20 : 1))
    const ends = lastTwoCompletedFiscalYearEnds(8, 2026, 12)
    expect(incomeStatementFiscalYearTotalsByYear(row, periods, ends, 12)).toEqual({
      2024: 120,
      2025: 240,
    })
  })

  it("sums full prior fiscal year and YTD through the reference date (calendar FYE)", () => {
    const row = makeRow(periods, (year) => (year === 2025 ? 100 : year === 2026 ? 10 : 1))
    expect(nMinusOneAndYtdActuals(row, periods, 3, 2026, 12)).toEqual({
      nMinusOne: 1200,
      ytd: 30,
    })
  })

  it("labels N-1, YTD, then projected calendar years", () => {
    expect(
      forecastYearLabelsForLayout("nMinusOne-and-ytd", 2026, 5, 3, 2026, 12),
    ).toEqual(["2025", "YTD 2026", "2026", "2027", "2028", "2029", "2030"])
    expect(forecastYearLabelsForLayout("single-prior-year", 2026, 3, 3, 2026, 12)).toEqual([
      "2025",
      "2026",
      "2027",
      "2028",
    ])
  })

  it("keeps hypothesis year indices aligned after inserting N-1", () => {
    expect(forecastActualColumnCount("nMinusOne-and-ytd")).toBe(2)
    expect(forecastDisplayYearCount(5, "nMinusOne-and-ytd")).toBe(7)
    const display = forecastTrendFromActualPrefix([1200, 30], 3)
    expect(display).toEqual([1200, 30, 0, 0, 0])
    expect(mergeConfigYearsOntoForecastDisplay(display, [999, 111, 222, 333], 2)).toEqual([
      1200,
      30,
      111,
      222,
      333,
    ])
    expect(forecastDisplayToConfigYearIndex(0, 2)).toBeNull()
    expect(forecastDisplayToConfigYearIndex(1, 2)).toBe(0)
    expect(forecastDisplayToConfigYearIndex(2, 2)).toBe(1)
    expect(forecastConfigToDisplayYearIndex(1, 2)).toBe(2)
    expect(isForecastProjectedDisplayColumn(1, 2)).toBe(false)
    expect(isForecastProjectedDisplayColumn(2, 2)).toBe(true)
    expect(forecastDisplayTrendToConfigTrend([1200, 30, 0, 0], 2)).toEqual([30, 0, 0])
    expect(forecastDisplayToConfigYearIndex(0, 1)).toBe(0)
    expect(forecastConfigToDisplayYearIndex(1, 1)).toBe(1)
  })

  it("skips the YTD stub when the reference date is already a fiscal year-end", () => {
    expect(forecastYtdColumnNeeded(3, 12)).toBe(true)
    expect(forecastYtdColumnNeeded(12, 12)).toBe(false)
    expect(resolveForecastActualLayout("nMinusOne-and-ytd", 3, 12)).toBe("nMinusOne-and-ytd")
    expect(resolveForecastActualLayout("nMinusOne-and-ytd", 12, 12)).toBe("single-prior-year")
    expect(resolveForecastActualLayout("single-prior-year", 3, 12)).toBe("single-prior-year")
  })
})

describe("pro forma Bilan snapshots", () => {
  const periods = makePeriods()

  it("uses closing snapshots for N-1 and the reference date, not period sums", () => {
    const row = makeRow(periods, (year, month) => {
      if (year === 2025 && month === 12) return 1800
      if (year === 2026 && month === 3) return 250
      return year === 2025 ? 1000 : 40
    })
    expect(
      forecastBalanceSheetActualPrefixValues("nMinusOne-and-ytd", row, periods, 3, 2026, 12),
    ).toEqual([1800, 250])
  })

  it("keeps only the N-1 closing snapshot when the reference month is the fiscal year-end", () => {
    const row = makeRow(periods, (year, month) => {
      if (year === 2025 && month === 12) return 1800
      if (year === 2026 && month === 12) return 900
      return 10
    })
    expect(
      forecastBalanceSheetActualPrefixValues("nMinusOne-and-ytd", row, periods, 12, 2026, 12),
    ).toEqual([1800])
    expect(
      forecastYearLabelsForLayout(
        resolveForecastActualLayout("nMinusOne-and-ytd", 12, 12),
        2026,
        3,
        12,
        2026,
        12,
      ),
    ).toEqual(["2025", "2026", "2027", "2028"])
  })

  it("keeps a single snapshot at the reference date for hypothesis columns", () => {
    const row = makeRow(periods, (year, month) => (year === 2025 && month === 3 ? 777 : 1))
    expect(
      forecastBalanceSheetActualPrefixValues("single-prior-year", row, periods, 3, 2025, 12),
    ).toEqual([777])
  })
})

describe("pro forma cash-flow columns", () => {
  const periods = makePeriods()

  it("parses year-only and YTD labels to calendar anchors", () => {
    expect(parseForecastColumnCalendarAnchor("YTD 2026", 3, 12)).toEqual({ month: 3, year: 2026 })
    expect(parseForecastColumnCalendarAnchor("2025", 3, 12)).toEqual({ month: 12, year: 2025 })
  })

  it("uses fiscal YTD sums for N-1 and the stub, then pads projected years", () => {
    const row = makeRow(periods, (year) => (year === 2025 ? 100 : year === 2026 ? 10 : 1))
    expect(forecastActualSnapshotDates("nMinusOne-and-ytd", 3, 2026, 12)).toEqual([
      { month: 12, year: 2025 },
      { month: 3, year: 2026 },
    ])
    expect(
      forecastCashFlowYearTrend("nMinusOne-and-ytd", row, periods, 3, 2026, 12, 3, 2026),
    ).toEqual([1200, 30, 0, 0, 0])
  })

  it("keeps only N-1 when the reference month is the fiscal year-end", () => {
    const row = makeRow(periods, (year) => (year === 2025 ? 100 : year === 2026 ? 10 : 1))
    const layout = resolveForecastActualLayout("nMinusOne-and-ytd", 12, 12)
    expect(forecastActualSnapshotDates("nMinusOne-and-ytd", 12, 2026, 12)).toEqual([
      { month: 12, year: 2025 },
    ])
    expect(forecastCashFlowYearTrend(layout, row, periods, 12, 2026, 12, 3, 2026)).toEqual([
      1200, 0, 0, 0,
    ])
  })
})
