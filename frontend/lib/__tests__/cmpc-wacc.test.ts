import { describe, expect, it } from "vitest"
import {
  cmpcWaccRange,
  computeCmpcWacc,
  DEFAULT_CMPC_INPUTS,
  formatCmpcPct,
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
  })
})
