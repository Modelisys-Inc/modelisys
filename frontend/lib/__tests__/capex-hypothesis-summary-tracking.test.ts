import { describe, expect, it } from "vitest"
import { attachCapexAssetMonthlyTracking } from "@/lib/forecast-hypothesis-summary-utils"

describe("attachCapexAssetMonthlyTracking", () => {
  it("raises declining depreciation after a mid-year addition", () => {
    const points = Array.from({ length: 12 }, (_, i) => ({
      axisLabel: `m${i}`,
      monthName: `M${i}`,
      primary: i === 4 ? 300_000 : 0, // mai
      cashFlow: 0,
      balance: 0,
    }))
    const out = attachCapexAssetMonthlyTracking(points, {
      openingCost: 100_000,
      openingBookValue: 100_000,
      ratePercent: 20,
      method: "declining",
    })

    // Avant l’ajout : ~100k × 20%/12
    expect(out[0]?.depreciation).toBe(Math.round((100_000 * 0.2) / 12))
    expect(out[3]?.depreciation).toBeLessThan(out[0]!.depreciation! + 1)

    // Mai : ajout puis dotation sur VNC plus élevée
    expect(out[4]?.cost).toBe(out[3]!.cost! + 300_000)
    expect(out[4]?.depreciation).toBeGreaterThan(out[3]!.depreciation!)

    // Après mai : dégressif → baisse progressive, mais > niveau pré-ajout
    expect(out[5]?.depreciation).toBeGreaterThan(out[0]!.depreciation!)
    expect(out[11]?.depreciation).toBeLessThan(out[4]!.depreciation!)
    expect(out[11]?.bookValue).toBeLessThan(out[4]!.bookValue!)
  })

  it("increases book value when capex is added even before depreciation", () => {
    const points = Array.from({ length: 12 }, (_, i) => ({
      axisLabel: `m${i}`,
      monthName: `M${i}`,
      primary: i === 5 ? 50_000 : 0, // juin
      cashFlow: 0,
      balance: 0,
    }))
    const out = attachCapexAssetMonthlyTracking(points, {
      openingCost: 900_000,
      openingBookValue: 878_000,
      ratePercent: 20,
      method: "declining",
    })
    expect(out[4]?.cost).toBe(900_000)
    expect(out[4]?.bookValue).toBeLessThan(878_000) // déjà amorti jan–mai
    expect(out[5]?.cost).toBe(950_000)
    expect(out[5]?.bookValue).toBeGreaterThan(out[4]!.bookValue!)
    expect(out[5]?.depreciation).toBeGreaterThan(out[4]!.depreciation!)
    expect(out.every((p) => (p.depreciation ?? 0) > 0)).toBe(true)
  })

  it("raises linear depreciation when cost increases mid-year", () => {
    const points = Array.from({ length: 12 }, (_, i) => ({
      axisLabel: `m${i}`,
      monthName: `M${i}`,
      primary: i === 4 ? 300_000 : 0,
      cashFlow: 0,
      balance: 0,
    }))
    const out = attachCapexAssetMonthlyTracking(points, {
      openingCost: 100_000,
      openingBookValue: 100_000,
      ratePercent: 20,
      method: "linear",
    })
    const before = out[0]!.depreciation!
    const after = out[5]!.depreciation!
    expect(after).toBeGreaterThan(before)
    expect(after).toBe(Math.round(400_000 * 0.2 / 12))
  })
})
