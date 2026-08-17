import { describe, it, expect } from "vitest"
import {
  buildForecastEndingCashTrend,
  isEncaisseBilanRow,
  parseBilanAdjustments,
  resolveBilanAdjustedValue,
  resolveEncaisseFromEndingCash,
  type BilanAdjustment,
} from "../bilan-forecast-utils"

const adj = (partial: Partial<BilanAdjustment> & Pick<BilanAdjustment, "id" | "yearIndex">): BilanAdjustment => ({
  rowId: "r1",
  type: "amount",
  value: 0,
  isRecurring: false,
  note: "",
  ...partial,
})

describe("isEncaisseBilanRow", () => {
  it("matches ACT-A.1 and the Encaisse label", () => {
    expect(isEncaisseBilanRow({ linkCode: "ACT-A.1" })).toBe(true)
    expect(isEncaisseBilanRow({ rowId: "ACT-A.1" })).toBe(true)
    expect(isEncaisseBilanRow({ label: "Encaisse" })).toBe(true)
    expect(isEncaisseBilanRow({ linkCode: "ACT-A", label: "Trésorerie" })).toBe(false)
    expect(isEncaisseBilanRow({ label: "Clients" })).toBe(false)
  })
})

describe("resolveBilanAdjustedValue", () => {
  const trend = [100, 100, 100, 100]

  it("leaves the reference year unchanged", () => {
    expect(
      resolveBilanAdjustedValue(trend, 0, [adj({ id: "a", yearIndex: 1, value: 50 })]),
    ).toBe(100)
  })

  it("adds a one-shot amount on the target year only", () => {
    const list = [adj({ id: "a", yearIndex: 1, value: 40 })]
    expect(resolveBilanAdjustedValue(trend, 1, list)).toBe(140)
    expect(resolveBilanAdjustedValue(trend, 2, list)).toBe(100)
  })

  it("carries a recurring amount to later years", () => {
    const list = [adj({ id: "a", yearIndex: 1, value: 25, isRecurring: true })]
    expect(resolveBilanAdjustedValue(trend, 1, list)).toBe(125)
    expect(resolveBilanAdjustedValue(trend, 2, list)).toBe(125)
  })
})

describe("resolveEncaisseFromEndingCash", () => {
  it("keeps the actual Encaisse on the reference year", () => {
    expect(resolveEncaisseFromEndingCash(120, [80, 90, 100], 0)).toBe(120)
  })

  it("applies the ending-cash delta to Encaisse on projected years", () => {
    expect(resolveEncaisseFromEndingCash(120, [80, 90, 70], 1)).toBe(130)
    expect(resolveEncaisseFromEndingCash(120, [80, 90, 70], 2)).toBe(110)
  })

  it("falls back to actual Encaisse when ending cash is missing", () => {
    expect(resolveEncaisseFromEndingCash(120, undefined, 1)).toBe(120)
    expect(resolveEncaisseFromEndingCash(120, [], 1)).toBe(120)
  })
})

describe("buildForecastEndingCashTrend", () => {
  it("rolls beginning cash plus yearly variation", () => {
    expect(buildForecastEndingCashTrend(100, [10, 5, -20])).toEqual([110, 115, 95])
  })
})

describe("parseBilanAdjustments", () => {
  it("returns an empty map for invalid input", () => {
    expect(parseBilanAdjustments(null)).toEqual({})
    expect(parseBilanAdjustments("nope")).toEqual({})
  })

  it("stores legacy percentage rows as amount adjustments", () => {
    const parsed = parseBilanAdjustments({
      r1: [{ id: "a", yearIndex: 1, type: "percentage", value: 15 }],
    })
    expect(parsed.r1?.[0]?.type).toBe("amount")
    expect(parsed.r1?.[0]?.value).toBe(15)
  })
})
