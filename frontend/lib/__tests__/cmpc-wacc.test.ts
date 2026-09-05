import { describe, expect, it } from "vitest"
import {
  annuityPresentValue,
  assessDebtBaiiaLeverage,
  cmpcWaccRange,
  computeCmpcWacc,
  computeDebtCapacity,
  computeRepaymentCapacity,
  DEFAULT_CMPC_DEBT_CAPACITY,
  DEFAULT_CMPC_INPUTS,
  DEFAULT_CMPC_REPAYMENT_CAPACITY,
  formatCmpcPct,
  parseBaiiaAdjustedRange,
  parseCharacteristicCashFlowRange,
  parseCmpcWaccConfig,
  roundCmpcToNearest,
} from "@/lib/cmpc-wacc"

describe("cmpc-wacc", () => {
  it("computes CAPM equity cost, after-tax debt, and WACC for defaults", () => {
    const r = computeCmpcWacc(DEFAULT_CMPC_INPUTS)
    // Ke = 3.3 + 1.1×5.5 + 3.5 + 2.0 = 14.85
    expect(r.costOfEquity).toBeCloseTo(14.85, 5)
    // Kd pretax = 3.3 + 3.0 = 6.3; after tax = 6.3 × (1 − 0.265)
    expect(r.preTaxCostOfDebt).toBeCloseTo(6.3, 5)
    expect(r.afterTaxCostOfDebt).toBeCloseTo(4.6305, 5)
    expect(r.weightEquity).toBeCloseTo(0.6, 5)
    expect(r.weightDebt).toBeCloseTo(0.4, 5)
    // WACC = 0.6×14.85 + 0.4×4.6305 = 10.7622
    expect(r.wacc).toBeCloseTo(10.7622, 4)
  })

  it("rounds retained CMPC to the nearest 0.25%", () => {
    expect(roundCmpcToNearest(10.7622, 0.25)).toBe(10.75)
    const range = cmpcWaccRange(10.7622)
    expect(range.retained).toBe(10.75)
    expect(range.low).toBe(10.25)
    expect(range.high).toBe(11.25)
    expect(formatCmpcPct(range.retained)).toBe("10.75 %")
  })

  it("parses persisted ForecastConfig payloads with fallbacks", () => {
    const parsed = parseCmpcWaccConfig({
      inputs: { riskFreeRate: 4, taxRate: "30", equityValue: 1_000_000 },
      meta: { subject: "ManuFAC", valuationDate: "31 décembre 2026" },
      equityNotes: { riskFreeRate: "Source Banque du Canada" },
      sources: { riskFreeRate: "Courbe des taux Canada — 10 ans." },
      debtCapacity: { debtBaiiaEmpirical: 2.0, debtBaiiaAi: 2.25 },
      debtCapacityNotes: { debtBaiiaComparables: "Peers secteur manufacturier" },
    })
    expect(parsed.inputs.riskFreeRate).toBe(4)
    expect(parsed.inputs.taxRate).toBe(30)
    expect(parsed.inputs.equityValue).toBe(1_000_000)
    expect(parsed.inputs.beta).toBe(DEFAULT_CMPC_INPUTS.beta)
    expect(parsed.meta.subject).toBe("ManuFAC")
    expect(parsed.meta.valuationDate).toBe("31 décembre 2026")
    expect(parsed.meta.currency).toContain("CAD")
    expect(parsed.equityNotes.riskFreeRate).toBe("Source Banque du Canada")
    expect(parsed.equityNotes.beta).toContain("comparables")
    expect(parsed.sources.riskFreeRate).toBe("Courbe des taux Canada — 10 ans.")
    expect(parsed.sources.taxRate).toContain("provincial")
    expect(parsed.debtCapacity.debtBaiiaEmpirical).toBe(2)
    expect(parsed.debtCapacity.debtBaiiaAi).toBe(2.25)
    expect(parsed.debtCapacity.debtBaiiaComparables).toBe(
      DEFAULT_CMPC_DEBT_CAPACITY.debtBaiiaComparables,
    )
    expect(parsed.debtCapacityNotes.debtBaiiaComparables).toBe("Peers secteur manufacturier")
  })

  it("parses BAIIA ajusté range from ebitda-multiple-config", () => {
    expect(parseBaiiaAdjustedRange(null)).toBeNull()
    expect(parseBaiiaAdjustedRange({})).toBeNull()
    expect(
      parseBaiiaAdjustedRange({ lowEBITDARange: 800_000, highEBITDARange: 1_200_000 }),
    ).toEqual({ low: 800_000, high: 1_200_000, mid: 1_000_000 })
  })

  it("computes debt capacity = multiple × BAIIA for each source", () => {
    const capacity = computeDebtCapacity(
      { low: 800_000, high: 1_200_000, mid: 1_000_000 },
      {
        debtBaiiaEmpirical: 3,
        debtBaiiaAi: 2.5,
        debtBaiiaComparables: 2,
        debtBaiiaRetained: 2.75,
      },
    )
    expect(capacity.empirical).toEqual({ low: 2_400_000, high: 3_600_000, mid: 3_000_000 })
    expect(capacity.ai).toEqual({ low: 2_000_000, high: 3_000_000, mid: 2_500_000 })
    expect(capacity.comparables).toEqual({ low: 1_600_000, high: 2_400_000, mid: 2_000_000 })
  })

  it("computes annuity present value like Excel VA / PV", () => {
    // VA(6 %, 5, 100_000) ≈ 421_236.38
    expect(annuityPresentValue(6, 5, 100_000)).toBeCloseTo(421_236.38, 1)
    expect(annuityPresentValue(0, 5, 100_000)).toBe(500_000)
    expect(annuityPresentValue(6, 0, 100_000)).toBe(0)
  })

  it("parses characteristic cash flow range from ebitda-multiple-config", () => {
    expect(parseCharacteristicCashFlowRange(null)).toBeNull()
    expect(
      parseCharacteristicCashFlowRange({
        characteristicCashFlowLow: 400_000,
        characteristicCashFlowHigh: 600_000,
      }),
    ).toEqual({ low: 400_000, high: 600_000, mid: 500_000 })
  })

  it("computes repayment capacity = VA(taux, durée, flux) and Dette/BAIIA", () => {
    const result = computeRepaymentCapacity(
      { low: 400_000, high: 600_000, mid: 500_000 },
      { low: 800_000, high: 1_200_000, mid: 1_000_000 },
      { annualInterestRate: 6, durationYears: 5 },
    )
    expect(result.maxDebt.low).toBeCloseTo(annuityPresentValue(6, 5, 400_000), 1)
    expect(result.maxDebt.high).toBeCloseTo(annuityPresentValue(6, 5, 600_000), 1)
    expect(result.debtBaiia.low).toBeCloseTo(result.maxDebt.low / 800_000, 5)
    expect(result.debtBaiia.high).toBeCloseTo(result.maxDebt.high / 1_200_000, 5)
    expect(DEFAULT_CMPC_REPAYMENT_CAPACITY.annualInterestRate).toBe(6)
    expect(DEFAULT_CMPC_REPAYMENT_CAPACITY.durationYears).toBe(5)
  })

  it("assesses retained Debt/BAIIA vs capacity max (ok / within / over)", () => {
    const capacity = { low: 2.5, high: 3.5 }
    expect(assessDebtBaiiaLeverage(2.0, capacity)).toBe("ok")
    expect(assessDebtBaiiaLeverage(2.5, capacity)).toBe("ok")
    expect(assessDebtBaiiaLeverage(3.0, capacity)).toBe("within")
    expect(assessDebtBaiiaLeverage(3.5, capacity)).toBe("within")
    expect(assessDebtBaiiaLeverage(4.0, capacity)).toBe("over")
    expect(DEFAULT_CMPC_DEBT_CAPACITY.debtBaiiaRetained).toBe(2.75)
  })
})
