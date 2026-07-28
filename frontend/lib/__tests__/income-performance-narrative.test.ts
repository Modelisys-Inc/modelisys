import { describe, it, expect } from "vitest"
import {
  buildIncomePerformanceNarrative,
  computeCagr,
  isAnnualExercisePresent,
  type PerformanceNarrativePoint,
} from "@/lib/income-performance-narrative"

function sampleAnnualData(): PerformanceNarrativePoint[] {
  return [
    { period: "2025", revenue: 1_200_000, grossProfit: 480_000, ebita: 220_000, grossMarginPercent: 40 },
    { period: "2024", revenue: 1_100_000, grossProfit: 418_000, ebita: 200_000, grossMarginPercent: 38 },
    { period: "2023", revenue: 1_000_000, grossProfit: 360_000, ebita: 180_000, grossMarginPercent: 36 },
    { period: "2022", revenue: 950_000, grossProfit: 323_000, ebita: 160_000, grossMarginPercent: 34 },
    { period: "2021", revenue: 900_000, grossProfit: 288_000, ebita: 140_000, grossMarginPercent: 32 },
  ]
}

describe("isAnnualExercisePresent", () => {
  it("exclut les exercices sans revenus", () => {
    expect(isAnnualExercisePresent({ period: "2020", revenue: 0, grossProfit: 0, ebita: 0, grossMarginPercent: 0 })).toBe(
      false,
    )
    expect(
      isAnnualExercisePresent({ period: "2021", revenue: 100, grossProfit: 0, ebita: 0, grossMarginPercent: 0 }),
    ).toBe(true)
  })
})

describe("computeCagr", () => {
  it("calcule le TCAC sur 4 intervalles", () => {
    const cagr = computeCagr(1_200_000, 900_000, 4)
    expect(cagr).not.toBeNull()
    expect(cagr!).toBeCloseTo(7.46, 1)
  })

  it("retourne null si valeurs non positives", () => {
    expect(computeCagr(-100, 50, 4)).toBeNull()
    expect(computeCagr(100, 0, 4)).toBeNull()
  })
})

describe("buildIncomePerformanceNarrative — vue annuelle", () => {
  it("retourne trois paragraphes narratifs avec repères chiffrés", () => {
    const result = buildIncomePerformanceNarrative(sampleAnnualData(), "years")
    expect(result).not.toBeNull()
    expect(result!.mode).toBe("annual")
    if (result!.mode !== "annual") return

    expect(result.paragraphs).toHaveLength(3)
    const revenue = result.paragraphs[0]!
    expect(revenue.heading).toBe("Revenus")
    expect(revenue.body).toContain("fourchette basse")
    expect(revenue.body).toContain("fourchette haute")
    expect(revenue.body).toContain("TCAC")
    expect(revenue.body).toContain("moyenne")
    expect(revenue.statsLine).toContain("Fourchette")
    expect(revenue.statsLine).toContain("TCAC")

    const baiia = result.paragraphs[2]!
    expect(baiia.heading).toBe("BAIIA")
    expect(baiia.secondaryBody).toBeTruthy()
    expect(baiia.secondaryBody).toContain("chiffre d'affaires")
    expect(baiia.secondaryBody).toContain("TCAC")
  })

  it("exclut les exercices sans données du texte et du TCAC", () => {
    const data = sampleAnnualData()
    data[4] = { period: "2021", revenue: 0, grossProfit: 0, ebita: 0, grossMarginPercent: 0 }
    const result = buildIncomePerformanceNarrative(data, "years")
    expect(result?.mode).toBe("annual")
    if (result?.mode !== "annual") return

    const revenue = result.paragraphs[0]!
    expect(revenue.body).toContain("2021 sont exclus")
    expect(revenue.body).toContain("2022 à 2025")
    expect(revenue.body).toContain("4 exercices disposant de données")
  })
})

describe("buildIncomePerformanceNarrative — vue mensuelle", () => {
  it("conserve le mode séquentiel", () => {
    const data = sampleAnnualData().slice(0, 2)
    const result = buildIncomePerformanceNarrative(data, "12months")
    expect(result?.mode).toBe("sequential")
    if (result?.mode === "sequential") {
      expect(result.paragraphs).toHaveLength(3)
    }
  })
})
