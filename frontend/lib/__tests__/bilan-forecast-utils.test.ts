import { describe, it, expect } from "vitest"
import {
  buildComptesClientsHistory,
  buildForecastEndingCashTrend,
  comptesClientsAmountFromDriver,
  isComptesClientsBilanRow,
  isEncaisseBilanRow,
  parseBilanAdjustments,
  resolveBilanAdjustedValue,
  resolveComptesClientsProjectedValue,
  resolveEncaisseFromEndingCash,
  revenueForComptesClientsYear,
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

describe("isComptesClientsBilanRow", () => {
  it("matches ACT-B and Comptes clients", () => {
    expect(isComptesClientsBilanRow({ linkCode: "ACT-B" })).toBe(true)
    expect(isComptesClientsBilanRow({ rowId: "ACT-B.1" })).toBe(true)
    expect(isComptesClientsBilanRow({ label: "Comptes clients" })).toBe(true)
    expect(isComptesClientsBilanRow({ label: "Fournisseurs" })).toBe(false)
    expect(isComptesClientsBilanRow({ linkCode: "ACT-A.1", label: "Encaisse" })).toBe(false)
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

describe("comptes clients drivers", () => {
  it("builds history for the last two fiscal years", () => {
    const history = buildComptesClientsHistory({
      lastActualYear: 2025,
      arByYear: { 2024: 120_000, 2025: 150_000 },
      revenueByYear: { 2024: 1_200_000, 2025: 1_500_000 },
    })
    expect(history.map((row) => row.year)).toEqual([2024, 2025])
    expect(history[0]?.revenuePercent).toBe(10)
    expect(history[0]?.collectionDays).toBe(36.5)
    expect(history[1]?.revenuePercent).toBe(10)
  })

  it("converts a collection delay into an AR amount", () => {
    expect(comptesClientsAmountFromDriver({ type: "collectionDays", value: 36.5, revenue: 1_200_000 })).toBe(
      120_000,
    )
    expect(comptesClientsAmountFromDriver({ type: "revenuePercent", value: 10, revenue: 1_500_000 })).toBe(
      150_000,
    )
  })

  it("projects AR from the selected driver", () => {
    const trend = [120_000, 0, 0]
    const list = [adj({ id: "a", yearIndex: 1, type: "revenuePercent", value: 12 })]
    expect(resolveComptesClientsProjectedValue(trend, 0, list, 1_000_000)).toBe(120_000)
    expect(resolveComptesClientsProjectedValue(trend, 1, list, 1_000_000)).toBe(120_000)
  })

  it("applies a recurring delay to later years using each year's revenue", () => {
    const trend = [120_000, 0, 0]
    const list = [adj({ id: "a", yearIndex: 1, type: "collectionDays", value: 36.5, isRecurring: true })]
    expect(resolveComptesClientsProjectedValue(trend, 1, list, 1_200_000)).toBe(120_000)
    expect(resolveComptesClientsProjectedValue(trend, 2, list, 2_400_000)).toBe(240_000)
  })

  it("uses projected revenue for later years and falls back to last actual", () => {
    expect(revenueForComptesClientsYear(0, [10_000_000, 11_000_000], 1_200_000)).toBe(10_000_000)
    expect(revenueForComptesClientsYear(1, [10_000_000, 11_000_000], 1_200_000)).toBe(11_000_000)
    expect(revenueForComptesClientsYear(-1, [10_000_000], 1_200_000)).toBe(1_200_000)
    expect(revenueForComptesClientsYear(1, null, 1_200_000)).toBe(1_200_000)
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

  it("keeps collection-day drivers", () => {
    const parsed = parseBilanAdjustments({
      r1: [{ id: "a", yearIndex: 1, type: "collectionDays", value: 42 }],
    })
    expect(parsed.r1?.[0]?.type).toBe("collectionDays")
    expect(parsed.r1?.[0]?.value).toBe(42)
  })

  it("stores legacy percentage rows as amount adjustments", () => {
    const parsed = parseBilanAdjustments({
      r1: [{ id: "a", yearIndex: 1, type: "percentage", value: 15 }],
    })
    expect(parsed.r1?.[0]?.type).toBe("amount")
    expect(parsed.r1?.[0]?.value).toBe(15)
  })
})
