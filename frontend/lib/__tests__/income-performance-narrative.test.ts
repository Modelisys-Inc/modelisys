import { describe, it, expect } from "vitest"
import {
  buildIncomePerformanceNarrative,
  buildSeasonalityParagraph,
  computeCagr,
  isAnnualExercisePresent,
  parseChartMonthPeriod,
  type PerformanceNarrativePoint,
} from "@/lib/income-performance-narrative"
import { monthShortLabelsFromReference } from "@/lib/series-reference-columns"

function sampleAnnualData(): PerformanceNarrativePoint[] {
  return [
    { period: "2025", revenue: 1_200_000, grossProfit: 480_000, ebita: 220_000, grossMarginPercent: 40 },
    { period: "2024", revenue: 1_100_000, grossProfit: 418_000, ebita: 200_000, grossMarginPercent: 38 },
    { period: "2023", revenue: 1_000_000, grossProfit: 360_000, ebita: 180_000, grossMarginPercent: 36 },
    { period: "2022", revenue: 950_000, grossProfit: 323_000, ebita: 160_000, grossMarginPercent: 34 },
    { period: "2021", revenue: 900_000, grossProfit: 288_000, ebita: 140_000, grossMarginPercent: 32 },
  ]
}

/** Facteur saisonnier par mois calendaire (1 = janvier … 12 = décembre). */
const SEASONAL_REVENUE_FACTOR: Record<number, number> = {
  1: 0.8,
  2: 0.85,
  3: 0.9,
  4: 0.95,
  5: 1.0,
  6: 1.05,
  7: 1.1,
  8: 1.05,
  9: 1.0,
  10: 0.95,
  11: 0.9,
  12: 1.2,
}

function sampleMonthly24Data(refMonth = 12, refYear = 2025): PerformanceNarrativePoint[] {
  const labels = monthShortLabelsFromReference(refMonth, refYear, 24)
  return labels.map((period) => {
    const meta = parseChartMonthPeriod(period)!
    const factor = SEASONAL_REVENUE_FACTOR[meta.month] ?? 1
    const revenue = 100_000 * factor
    return {
      period,
      revenue,
      grossProfit: revenue * 0.38,
      ebita: revenue * 0.15,
      grossMarginPercent: 38,
    }
  })
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

describe("buildIncomePerformanceNarrative — vue mensuelle (24 mois)", () => {
  it("retourne une analyse fenêtre identique à l'annuel", () => {
    const data = sampleMonthly24Data()
    const result = buildIncomePerformanceNarrative(data, "24months")
    expect(result?.mode).toBe("monthly")
    if (result?.mode !== "monthly") return
    expect(result.paragraphs).toHaveLength(3)
    expect(result.paragraphs[0]!.body).toContain("fourchette basse")
    expect(result.paragraphs[0]!.body).toContain("TCAC")
    expect(result.paragraphs[2]!.secondaryBody).toContain("chiffre d'affaires")
  })

  it("ajoute un paragraphe saisonnalité pour chaque section", () => {
    const data = sampleMonthly24Data()
    const result = buildIncomePerformanceNarrative(data, "24months")
    expect(result?.mode).toBe("monthly")
    if (result?.mode !== "monthly") return

    for (const paragraph of result.paragraphs) {
      expect(paragraph.seasonalityBody).toBeTruthy()
      expect(paragraph.seasonalityBody).toContain("saisonnalité")
      expect(paragraph.seasonalityBody).toContain("pic récurrent")
      expect(paragraph.seasonalityBody).toContain("creux")
    }

    expect(result.paragraphs[0]!.seasonalityBody).toContain("décembre")
    expect(result.paragraphs[0]!.seasonalityBody).toContain("janvier")
    expect(result.paragraphs[0]!.seasonalityBody).toContain("comparaison homologue")
  })
})

describe("buildSeasonalityParagraph", () => {
  it("parse les libellés de mois du graphique", () => {
    expect(parseChartMonthPeriod("Déc 2025")).toEqual({ month: 12, year: 2025 })
    expect(parseChartMonthPeriod("Jan 2024")).toEqual({ month: 1, year: 2024 })
    expect(parseChartMonthPeriod("2025/12")).toBeNull()
  })

  it("détecte pic et creux saisonniers sur 24 mois", () => {
    const data = sampleMonthly24Data()
    const periods = data.map((d) => d.period)
    const values = data.map((d) => d.revenue)
    const text = buildSeasonalityParagraph(periods, values, "currency", "les revenus")
    expect(text).toBeTruthy()
    expect(text).toContain("décembre")
    expect(text).toContain("janvier")
    expect(text).toContain("24 derniers mois")
  })
})

describe("buildIncomePerformanceNarrative — vue mensuelle séquentielle (12 mois IS)", () => {
  it("conserve le mode séquentiel", () => {
    const data = sampleAnnualData().slice(0, 2)
    const result = buildIncomePerformanceNarrative(data, "12months")
    expect(result?.mode).toBe("sequential")
    if (result?.mode === "sequential") {
      expect(result.paragraphs).toHaveLength(3)
    }
  })
})
