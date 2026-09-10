import { describe, expect, it } from "vitest"
import {
  actualYearsSeasonalityFromCalendarMap,
  averageSeasonalityMonthPercents,
  lastTwoActualCalendarYears,
  seasonalityPercentsFromMonthlyAmounts,
  weightedSeasonalityMonthPercents,
} from "@/lib/forecast-seasonality-utils"

describe("lastTwoActualCalendarYears", () => {
  it("returns N-2 and N-1 for a projection start year", () => {
    expect(lastTwoActualCalendarYears(2026)).toEqual([2024, 2025])
  })
})

describe("seasonalityPercentsFromMonthlyAmounts", () => {
  it("returns zeros when the year has no activity", () => {
    expect(seasonalityPercentsFromMonthlyAmounts(Array.from({ length: 12 }, () => 0))).toEqual(
      Array.from({ length: 12 }, () => 0)
    )
  })

  it("normalizes a peaked January year to 100 %", () => {
    const percents = seasonalityPercentsFromMonthlyAmounts([
      300, 100, 100, 100, 100, 100, 50, 50, 50, 50, 100, 100,
    ])
    expect(percents.reduce((a, b) => a + b, 0)).toBe(100)
    expect(percents[0]).toBeGreaterThan(20)
  })
})

describe("averageSeasonalityMonthPercents", () => {
  it("averages each month across the two actual years", () => {
    const map = new Map<string, number>()
    for (let m = 1; m <= 12; m++) {
      map.set(`2024-${m}`, m === 1 ? 300 : 100)
      map.set(`2025-${m}`, 100)
    }
    const years = actualYearsSeasonalityFromCalendarMap(map, [2024, 2025])
    const avg = averageSeasonalityMonthPercents(years)
    expect(avg.reduce((a, b) => a + b, 0)).toBe(100)
    expect(avg[0]).toBeGreaterThan(avg[1] ?? 0)
  })

  it("ignores an empty year when averaging", () => {
    const map = new Map<string, number>([["2025-1", 1200]])
    const years = actualYearsSeasonalityFromCalendarMap(map, [2024, 2025])
    const avg = averageSeasonalityMonthPercents(years)
    expect(avg[0]).toBe(100)
  })
})

describe("weightedSeasonalityMonthPercents", () => {
  it("weights each post seasonality by its projected amount", () => {
    const uniform = Array.from({ length: 12 }, () => Math.round(100 / 12))
    // Make uniform sum to 100
    uniform[11] = 100 - uniform.slice(0, 11).reduce((a, b) => a + b, 0)
    const peaked = seasonalityPercentsFromMonthlyAmounts([400, ...Array.from({ length: 11 }, () => 100)])
    const blended = weightedSeasonalityMonthPercents([
      { weight: 1000, monthPercents: peaked },
      { weight: 1000, monthPercents: uniform },
    ])
    expect(blended.reduce((a, b) => a + b, 0)).toBe(100)
    expect(blended[0]!).toBeGreaterThan(Math.round(100 / 12))
    expect(blended[0]!).toBeLessThan(peaked[0]!)
  })

  it("matches a single contributor when only one has weight", () => {
    const peaked = seasonalityPercentsFromMonthlyAmounts([400, ...Array.from({ length: 11 }, () => 100)])
    expect(weightedSeasonalityMonthPercents([{ weight: 500, monthPercents: peaked }])).toEqual(peaked)
  })
})
