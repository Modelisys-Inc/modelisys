import { describe, expect, it } from "vitest"
import {
  applyProFormaVariationFromBilanBalances,
  applyProFormaCapexAdditionsToTrend,
  buildProFormaDividendPaymentTrend,
  buildProjectedIsDrivenConfigTrend,
  carryForwardBilanBalancesWithoutProjection,
  isCashFlowDividendPaymentRow,
  isCashFlowIsDrivenActualRow,
  isCashFlowNetIncomeRow,
  mergeProjectedAmountsOntoDisplayTrend,
  mergeSeriesSnapshotsIntoBilanBalanceTrend,
  preserveForecastActualColumnsFromBase,
  priorDisplayIndexForProFormaCashFlowVariation,
  sumProjectedIsAmountsForAttachedCodes,
  taxExigibleNetBalanceTrend,
} from "../pro-forma-cash-flow-inject"

describe("isCashFlowNetIncomeRow", () => {
  it("matches CAP-C.1 attachment or bénéfice net label", () => {
    expect(isCashFlowNetIncomeRow({ attachedLinkCodes: ["CAP-C.1"] })).toBe(true)
    expect(isCashFlowNetIncomeRow({ label: "Bénéfice net" })).toBe(true)
    expect(isCashFlowNetIncomeRow({ label: "Amortissement", attachedLinkCodes: ["CMV.11"] })).toBe(
      false,
    )
  })
})

describe("isCashFlowDividendPaymentRow", () => {
  it("matches CAP-C.2 or versement de dividendes", () => {
    expect(isCashFlowDividendPaymentRow({ attachedLinkCodes: ["CAP-C.2"] })).toBe(true)
    expect(isCashFlowDividendPaymentRow({ linkCode: "CAP-C.2" })).toBe(true)
    expect(isCashFlowDividendPaymentRow({ label: "Versement de dividendes" })).toBe(true)
    expect(isCashFlowDividendPaymentRow({ label: "Bénéfice net" })).toBe(false)
  })
})

describe("buildProFormaDividendPaymentTrend", () => {
  it("writes −dividends on projected years only", () => {
    expect(
      buildProFormaDividendPaymentTrend({
        baseTrend: [10, 20, 0, 0],
        forecastActualCols: 2,
        displayYearCount: 4,
        dividendsForDisplayYear: (i) => (i === 2 ? 50_000 : i === 3 ? 25_000 : 0),
      }),
    ).toEqual([10, 20, -50_000, -25_000])
  })
})

describe("isCashFlowIsDrivenActualRow", () => {
  it("flags amort and AUT attachments in actual mode", () => {
    expect(
      isCashFlowIsDrivenActualRow({
        calcMode: "actual",
        attachedLinkCodes: ["EXP.20"],
      }),
    ).toBe(true)
    expect(
      isCashFlowIsDrivenActualRow({
        calcMode: "variation_nn1",
        attachedLinkCodes: ["ACT-C"],
      }),
    ).toBe(false)
  })
})

describe("sumProjectedIsAmountsForAttachedCodes", () => {
  it("sums amort + interest + NI for attached codes", () => {
    const sum = sumProjectedIsAmountsForAttachedCodes({
      attachedLinkCodes: ["CAP-C.1", "EXP.20", "FIN.3"],
      configYearIndex: 1,
      netIncomeByConfigYear: [0, 100_000],
      resolveDepreciationExpense: (code, y) => (code === "EXP.20" && y === 1 ? 12_000 : 0),
      resolveInterestExpense: (code, y) => (code === "FIN.3" && y === 1 ? 3_000 : 0),
    })
    expect(sum).toBe(115_000)
  })
})

describe("mergeProjectedAmountsOntoDisplayTrend", () => {
  it("keeps N-1/YTD and writes projected config years", () => {
    expect(mergeProjectedAmountsOntoDisplayTrend([10, 20, 0, 0], [0, 50, 60], 2)).toEqual([
      10, 20, 50, 60,
    ])
  })
})

describe("buildProjectedIsDrivenConfigTrend", () => {
  it("forces net income on BN rows", () => {
    expect(
      buildProjectedIsDrivenConfigTrend({
        projectionYears: 2,
        attachedLinkCodes: [],
        netIncomeByConfigYear: [0, 80_000, 90_000],
        resolveDepreciationExpense: () => 0,
        resolveInterestExpense: () => 0,
        forceNetIncome: true,
      }),
    ).toEqual([0, 80_000, 90_000])
  })
})

describe("applyProFormaVariationFromBilanBalances", () => {
  it("anchors the first projected year on N-1, not YTD", () => {
    // display: N-1=1000, YTD=1100, 2026=500, 2027=0
    const balances = [1000, 1100, 500, 0]
    expect(priorDisplayIndexForProFormaCashFlowVariation(0, 2)).toBeNull()
    expect(priorDisplayIndexForProFormaCashFlowVariation(1, 2)).toBe(0)
    expect(priorDisplayIndexForProFormaCashFlowVariation(2, 2)).toBe(0)
    expect(priorDisplayIndexForProFormaCashFlowVariation(3, 2)).toBe(2)

    expect(
      applyProFormaVariationFromBilanBalances({
        mode: "variation_nn1",
        bilanBalanceByDisplayYear: balances,
        forecastActualCols: 2,
      }),
    ).toEqual([
      1000, // N-1 column (no prior)
      100, // YTD − N-1
      -500, // 2026 − N-1 (not YTD)
      -500, // 2027 − 2026
    ])
  })

  it("chains later projected years on the previous projected balance", () => {
    // 1 colonne réelle : [N-1, 2026, 2027, 2028, 2029]
    expect(
      applyProFormaVariationFromBilanBalances({
        mode: "variation_nn1",
        bilanBalanceByDisplayYear: [200, 200, 800, 800, 100],
        forecastActualCols: 1,
      }),
    ).toEqual([200, 0, 600, 0, -700])
  })
})

describe("carryForwardBilanBalancesWithoutProjection", () => {
  it("carries N-1 into projected years without drivers so CF variation is 0", () => {
    expect(
      carryForwardBilanBalancesWithoutProjection({
        balances: [3_000_000, 3_000_000, 0, 0],
        forecastActualCols: 2,
        yearHasExplicitProjection: [false, false, false, false],
      }),
    ).toEqual([3_000_000, 3_000_000, 3_000_000, 3_000_000])

    expect(
      applyProFormaVariationFromBilanBalances({
        mode: "variation_nn1",
        bilanBalanceByDisplayYear: [3_000_000, 3_000_000, 3_000_000, 3_000_000],
        forecastActualCols: 2,
      }),
    ).toEqual([3_000_000, 0, 0, 0])
  })

  it("applies after series merge when BS projected pads were 0", () => {
    const afterMerge = mergeSeriesSnapshotsIntoBilanBalanceTrend({
      bilanBalanceByDisplayYear: [0, 0, 0, 0],
      amountByCalendarMonth: new Map([
        ["2025-12", 3_000_000],
        ["2026-3", 3_000_000],
      ]),
      trendLabels: ["2025", "YTD 2026", "2026", "2027"],
      forecastActualCols: 2,
      fiscalYearEndMonth: 12,
      forecastRefMonth: 3,
    })
    expect(afterMerge).toEqual([3_000_000, 3_000_000, 0, 0])
    const carried = carryForwardBilanBalancesWithoutProjection({
      balances: afterMerge,
      forecastActualCols: 2,
      yearHasExplicitProjection: [false, false, false, false],
    })
    expect(carried).toEqual([3_000_000, 3_000_000, 3_000_000, 3_000_000])
    expect(
      applyProFormaVariationFromBilanBalances({
        mode: "variation_nn1",
        bilanBalanceByDisplayYear: carried,
        forecastActualCols: 2,
      }),
    ).toEqual([3_000_000, 0, 0, 0])
  })

  it("keeps explicit projected balances and carries them forward afterward", () => {
    expect(
      carryForwardBilanBalancesWithoutProjection({
        balances: [100, 100, 500, 0],
        forecastActualCols: 2,
        yearHasExplicitProjection: [false, false, true, false],
      }),
    ).toEqual([100, 100, 500, 500])
  })
})

describe("mergeSeriesSnapshotsIntoBilanBalanceTrend", () => {
  it("fills empty actual columns from the CF series without overwriting a known BS stock", () => {
    const amountByCalendarMonth = new Map([
      ["2025-12", 3_000_000],
      ["2026-3", 3_100_000],
    ])
    expect(
      mergeSeriesSnapshotsIntoBilanBalanceTrend({
        bilanBalanceByDisplayYear: [3_000_000, 0, 0, 0],
        amountByCalendarMonth,
        trendLabels: ["2025", "YTD 2026", "2026", "2027"],
        forecastActualCols: 2,
        fiscalYearEndMonth: 12,
        forecastRefMonth: 3,
      }),
    ).toEqual([3_000_000, 3_100_000, 0, 0])

    expect(
      mergeSeriesSnapshotsIntoBilanBalanceTrend({
        bilanBalanceByDisplayYear: [2_900_000, 0, 0, 0],
        amountByCalendarMonth,
        trendLabels: ["2025", "YTD 2026", "2026", "2027"],
        forecastActualCols: 2,
        fiscalYearEndMonth: 12,
        forecastRefMonth: 3,
      }),
    ).toEqual([2_900_000, 3_100_000, 0, 0])
  })
})

describe("preserveForecastActualColumnsFromBase", () => {
  it("keeps CF Detail N-1/YTD and only overrides projected years", () => {
    expect(
      preserveForecastActualColumnsFromBase({
        baseTrend: [1_200, 30, 0, 0],
        overrideTrend: [999, 888, -200_000, -50_000],
        forecastActualCols: 2,
      }),
    ).toEqual([1_200, 30, -200_000, -50_000])
  })
})

describe("applyProFormaCapexAdditionsToTrend", () => {
  it("writes signed Capex additions on projected years only", () => {
    expect(
      applyProFormaCapexAdditionsToTrend({
        baseTrend: [-50_000, -10_000, 0, 0],
        forecastActualCols: 2,
        mode: "variation_n1n",
        additionsByConfigYear: [0, 200_000, 75_000],
      }),
    ).toEqual([-50_000, -10_000, -200_000, -75_000])

    expect(
      applyProFormaCapexAdditionsToTrend({
        baseTrend: [0, 0, 0],
        forecastActualCols: 1,
        mode: "variation_nn1",
        additionsByConfigYear: [0, 40_000, 10_000],
      }),
    ).toEqual([0, 40_000, 10_000])
  })
})

describe("taxExigibleNetBalanceTrend", () => {
  it("nets liability minus asset for CF tax variation", () => {
    expect(
      taxExigibleNetBalanceTrend({
        assetBalances: [100, 0, 50],
        liabilityBalances: [500, 200, 0],
      }),
    ).toEqual([400, 200, -50])

    expect(
      applyProFormaVariationFromBilanBalances({
        mode: "variation_nn1",
        bilanBalanceByDisplayYear: [400, 400, 200, 200],
        forecastActualCols: 2,
      }),
    ).toEqual([400, 0, -200, 0])
  })
})
