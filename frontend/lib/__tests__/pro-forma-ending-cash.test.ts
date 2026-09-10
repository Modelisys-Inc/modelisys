import { describe, expect, it } from "vitest"
import {
  computeProFormaEndingCashTrend,
  type ProFormaEndingCashProjectedApi,
} from "../pro-forma-ending-cash"

function stubProjected(cols: number, years: number): ProFormaEndingCashProjectedApi {
  const display = cols + years
  return {
    forecastActualCols: cols,
    attachedByCfCode: new Map(),
    netIncomeByConfigYear: Array.from({ length: years + 1 }, () => 0),
    resolveDepreciationExpense: () => 0,
    resolveInterestExpense: () => 0,
    bilanBalanceTrendForAttachedCodes: () => Array.from({ length: display }, () => 0),
    attachedCodesHaveExplicitProjection: () => Array.from({ length: display }, () => false),
    attachedCodesIncludeTaxExigible: () => false,
    capexAdditionsByConfigYearForAttachedCodes: () => null,
    dividendsForDisplayYear: () => 0,
  }
}

describe("computeProFormaEndingCashTrend", () => {
  it("returns a zero trend sized to display columns when structure is empty", () => {
    const trend = computeProFormaEndingCashTrend({
      structure: [],
      cfSeriesRows: [],
      cfPeriods: [],
      bsSeriesRows: [],
      trendLabels: ["2025", "YTD 2026", "2026", "2027"],
      forecastActualLayout: "nMinusOne-and-ytd",
      forecastActualCols: 2,
      projectionYears: 2,
      refMonth: 3,
      refYear: 2026,
      fiscalYearEndMonth: 12,
      forecastBaseYear: 2026,
      projected: stubProjected(2, 2),
    })
    expect(trend).toEqual([0, 0, 0, 0])
  })

  it("builds ending = beginning + variation with zero activity (fin N-1 chained)", () => {
    const structure: Record<string, unknown>[] = [
      {
        id: "var",
        label: "Variation nette de la trésorerie",
        isResult: true,
        liaisonMode: "na",
      },
      {
        id: "beg",
        label: "Trésorerie au début",
        liaisonMode: "na",
      },
      {
        id: "end",
        label: "Trésorerie à la fin",
        liaisonMode: "na",
      },
    ]
    const bsSeriesRows = [
      {
        id: "ACT-A",
        amounts: { "2025-11": 100, "2025-12": 100, "2026-3": 100 },
      },
      {
        id: "PCT-A",
        amounts: { "2025-11": 0, "2025-12": 0, "2026-3": 0 },
      },
    ]
    const cfPeriods = [
      { fiscalYear: 2025, fiscalMonth: 12, year: 2025, month: 12, label: "Déc 2025" },
      { fiscalYear: 2026, fiscalMonth: 3, year: 2026, month: 3, label: "Mar 2026" },
    ]

    const trend = computeProFormaEndingCashTrend({
      structure,
      cfSeriesRows: [],
      cfPeriods: cfPeriods as never,
      bsSeriesRows: bsSeriesRows as never,
      trendLabels: ["2025", "YTD 2026", "2026"],
      forecastActualLayout: "nMinusOne-and-ytd",
      forecastActualCols: 2,
      projectionYears: 1,
      refMonth: 3,
      refYear: 2026,
      fiscalYearEndMonth: 12,
      forecastBaseYear: 2026,
      projected: stubProjected(2, 1),
    })

    expect(trend).toHaveLength(3)
    expect(trend[2]).toBe(trend[0])
  })

  it("keeps calendar activity on projected actual lines (aligned CashFlowDetail TTM)", () => {
    // Une ligne « Réel » avec activité YTD 2026 doit alimenter la colonne projetée 2026
    // (comme applyCashFlowActualYearTTMToRow), pas rester à 0 via forecastCashFlowYearTrend.
    const structure: Record<string, unknown>[] = [
      {
        id: "tex",
        label: "Poste réel",
        linkCode: "TEX-Z",
        liaisonMode: "single",
        defineMapping: true,
        cashFlowCalcMode: "actual",
      },
      {
        id: "var",
        label: "Variation nette de la trésorerie",
        isResult: true,
        liaisonMode: "na",
      },
      { id: "beg", label: "Trésorerie au début", liaisonMode: "na" },
      { id: "end", label: "Trésorerie à la fin", liaisonMode: "na" },
    ]
    const cfPeriods = [
      { fiscalYear: 2025, fiscalMonth: 12, year: 2025, month: 12, label: "Déc 2025" },
      { fiscalYear: 2026, fiscalMonth: 1, year: 2026, month: 1, label: "Jan 2026" },
      { fiscalYear: 2026, fiscalMonth: 2, year: 2026, month: 2, label: "Fév 2026" },
      { fiscalYear: 2026, fiscalMonth: 3, year: 2026, month: 3, label: "Mar 2026" },
    ]
    const cfSeriesRows = [
      {
        id: "tex-row",
        label: "Poste réel",
        linkCode: "TEX-Z",
        amounts: {
          "2025-12": 10,
          "2026-1": 50,
          "2026-2": 30,
          "2026-3": 20,
        },
      },
    ]
    const bsSeriesRows = [
      { id: "ACT-A", amounts: { "2025-11": 1000, "2025-12": 1000, "2026-3": 1000 } },
      { id: "PCT-A", amounts: { "2025-11": 0, "2025-12": 0, "2026-3": 0 } },
    ]

    const trend = computeProFormaEndingCashTrend({
      structure,
      cfSeriesRows: cfSeriesRows as never,
      cfPeriods: cfPeriods as never,
      bsSeriesRows: bsSeriesRows as never,
      trendLabels: ["2025", "YTD 2026", "2026"],
      forecastActualLayout: "nMinusOne-and-ytd",
      forecastActualCols: 2,
      projectionYears: 1,
      refMonth: 3,
      refYear: 2026,
      fiscalYearEndMonth: 12,
      forecastBaseYear: 2026,
      projected: stubProjected(2, 1),
    })

    // Début chaîné = fin N-1 ; variation projetée inclut le YTD fiscal du poste réel.
    // Sans TTM, variation projetée serait 0 et fin 2026 = fin N-1.
    expect(trend[2]).not.toBe(trend[0])
  })
})
