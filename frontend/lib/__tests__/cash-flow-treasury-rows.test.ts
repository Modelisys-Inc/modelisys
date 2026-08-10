import { describe, expect, it } from "vitest"
import {
  applyCashFlowFixedTreasuryRows,
  balanceSheetAmountForLinkCodeRoot,
  beginningCashTrendFromNetCashByPeriod,
  buildNetCashByPeriodKey,
  cashFlowTreasuryValidationEcart,
  cashFlowTreasuryValidationTrendEcarts,
  comparisonAnchorMonth,
  endingBookNetCashForDisplayPeriods,
  findBalanceSheetRowByLinkCode,
  isCashFlowBeginningCashStructureRow,
  isCashFlowEndingCashStructureRow,
  isCashFlowTreasuryBalanced,
  netCashFromBalanceSheetPointRows,
  priorCalendarMonth,
} from "@/lib/cash-flow-treasury-rows"

describe("cash-flow-treasury-rows", () => {
  it("détecte les lignes trésorerie par libellé", () => {
    expect(isCashFlowBeginningCashStructureRow({ label: "Trésorerie au début" })).toBe(true)
    expect(
      isCashFlowBeginningCashStructureRow({ label: "Trésorerie au début de l'exercice" }),
    ).toBe(true)
    expect(isCashFlowEndingCashStructureRow({ label: "Trésorerie à la fin" })).toBe(true)
    expect(
      isCashFlowEndingCashStructureRow({ label: "Trésorerie à la fin de l'exercice" }),
    ).toBe(true)
    expect(isCashFlowBeginningCashStructureRow({ label: "Variation de trésorerie" })).toBe(false)
  })

  it("calcule ACT-A − PCT-A sur un point bilan", () => {
    const rows = [
      { id: "ACT-A", current: 100, prior: 80 },
      { id: "PCT-A", current: 25, prior: 20 },
    ]
    expect(netCashFromBalanceSheetPointRows(rows, "current")).toBe(75)
    expect(netCashFromBalanceSheetPointRows(rows, "prior")).toBe(60)
  })

  it("construit la tendance début = N−1 par période", () => {
    const netByPeriod = buildNetCashByPeriodKey([
      { id: "ACT-A", amounts: { "2026-7": 90, "2026-8": 100 } },
      { id: "PCT-A", amounts: { "2026-7": 10, "2026-8": 15 } },
    ])
    const trend = beginningCashTrendFromNetCashByPeriod(netByPeriod, [
      { fiscalYear: 2026, fiscalMonth: 8 },
    ])
    expect(trend).toEqual([80])
  })

  it("trouve ACT-A dans les sous-lignes du bilan", () => {
    const rows = [
      {
        id: "ACT",
        current: 0,
        detailRows: [{ id: "ACT-A", current: 50, prior: 40 }],
      },
    ]
    expect(findBalanceSheetRowByLinkCode(rows, "ACT-A")?.current).toBe(50)
  })

  it("somme les descendants ACT-A.* si le parent n'est pas mappé", () => {
    const rows = [
      { id: "ACT-A.1", current: 700, prior: 600 },
      { id: "ACT-A.2", current: 300, prior: 200 },
      { id: "PCT-A.1", current: -100, prior: -80 },
    ]
    expect(balanceSheetAmountForLinkCodeRoot(rows, "ACT-A", "current")).toBe(1000)
    expect(balanceSheetAmountForLinkCodeRoot(rows, "PCT-A", "current")).toBe(-100)
    expect(netCashFromBalanceSheetPointRows(rows, "current")).toBe(1100)
  })

  it("applique beginningTrend sans snapshot point (vue multi-périodes)", () => {
    const structure = [{ label: "Trésorerie au début" }]
    const detailRows = [{ label: "Trésorerie au début", current: 0, prior: 0 }]
    const out = applyCashFlowFixedTreasuryRows(detailRows, structure, {
      beginningTrend: [80, 90],
    })
    expect(out[0]?.trendValues).toEqual([80, 90])
    expect(out[0]?.current).toBe(0)
  })

  it("applique début fixe et fin = variation + début", () => {
    const structure = [
      { label: "Variation de trésorerie" },
      { label: "Trésorerie au début" },
      { label: "Trésorerie à la fin" },
    ]
    const detailRows = [
      { label: "Variation de trésorerie", current: 10, prior: 5 },
      { label: "Trésorerie au début", current: 0, prior: 0 },
      { label: "Trésorerie à la fin", current: 0, prior: 0 },
    ]
    const out = applyCashFlowFixedTreasuryRows(detailRows, structure, {
      beginning: { current: 80, prior: 60 },
    })
    expect(out[1]?.current).toBe(80)
    expect(out[1]?.prior).toBe(60)
    expect(out[1]?.hasLiaisonCode).toBe(true)
    expect(out[2]?.current).toBe(90)
    expect(out[2]?.prior).toBe(65)
    expect(out[2]?.hasLiaisonCode).toBe(true)
  })

  it("calcule l'écart validation fin = trésorerie fin − (ACT-A − PCT-A)", () => {
    expect(cashFlowTreasuryValidationEcart(150, 100)).toBe(50)
    expect(cashFlowTreasuryValidationEcart(100, 100)).toBe(0)
    expect(isCashFlowTreasuryBalanced(0.5)).toBe(true)
    expect(isCashFlowTreasuryBalanced(5)).toBe(false)
    expect(cashFlowTreasuryValidationTrendEcarts([150, 120], [100, 100])).toEqual([50, 20])
  })

  it("construit la tendance bilan fin = ACT-A − PCT-A du mois courant", () => {
    const netByPeriod = buildNetCashByPeriodKey([
      { id: "ACT-A.1", amounts: { "2026-7": 90, "2026-8": 100 } },
      { id: "PCT-A.1", amounts: { "2026-7": -10, "2026-8": -15 } },
    ])
    const trend = endingBookNetCashForDisplayPeriods(netByPeriod, [
      { fiscalYear: 2026, fiscalMonth: 7 },
      { fiscalYear: 2026, fiscalMonth: 8 },
    ])
    expect(trend).toEqual([100, 115])
  })

  it("résout le mois calendaire précédent et l'ancre de comparaison", () => {
    expect(priorCalendarMonth(2026, 8)).toEqual({ year: 2026, month: 7 })
    expect(priorCalendarMonth(2026, 1)).toEqual({ year: 2025, month: 12 })
    expect(comparisonAnchorMonth(2026, 8, "lastMonth")).toEqual({ year: 2026, month: 7 })
    expect(comparisonAnchorMonth(2026, 8, "budget")).toEqual({ year: 2025, month: 8 })
  })
})
