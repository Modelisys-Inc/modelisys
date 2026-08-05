import { describe, it, expect } from "vitest"
import {
  buildExpensesOnlyPerformanceNarrative,
  buildIncomePerformanceNarrative,
  buildMarginByRevenueOnlyPerformanceNarrative,
  buildContributiveMarginByRevenueNarrative,
  buildRevenueOnlyPerformanceNarrative,
  buildSeasonalityParagraph,
  computeCagr,
  isAnnualExercisePresent,
  mapDynamicChartToExpenseSeriesNarratives,
  mapDynamicChartToMarginByRevenueSeriesNarratives,
  mapDynamicChartToRevenueSeriesNarratives,
  parseChartMonthPeriod,
  type PerformanceNarrativePoint,
  type RevenueSeriesNarrativeSlice,
} from "@/lib/income-performance-narrative"
import type { BuiltSeriesMeta, DynamicChartPoint } from "@/lib/performance-chart-series"
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

describe("mapDynamicChartToRevenueSeriesNarratives", () => {
  it("produit une tranche par histogramme monétaire", () => {
    const points: DynamicChartPoint[] = [
      { period: "2025", v_a: 100, v_b: 40, v_c: 10 },
      { period: "2024", v_a: 90, v_b: 35, v_c: 8 },
    ]
    const meta: BuiltSeriesMeta[] = [
      {
        id: "a",
        dataKey: "v_a",
        kind: "bar",
        label: "Ventes",
        color: "#3b82f6",
        yAxis: "left",
        valueFormat: "currency",
        showOnChart: true,
        showInSidePanel: true,
      },
      {
        id: "b",
        dataKey: "v_b",
        kind: "bar",
        label: "Services",
        color: "#10b981",
        yAxis: "left",
        valueFormat: "currency",
        showOnChart: true,
        showInSidePanel: true,
      },
      {
        id: "c",
        dataKey: "v_c",
        kind: "line",
        label: "Tendance",
        color: "#f59e0b",
        yAxis: "right",
        valueFormat: "ratio",
        showOnChart: true,
        showInSidePanel: false,
      },
    ]

    const slices = mapDynamicChartToRevenueSeriesNarratives(points, meta)
    expect(slices).toHaveLength(2)
    expect(slices.map((s) => s.heading)).toEqual(["Ventes", "Services"])
    expect(slices[0]!.points[0]!.revenue).toBe(100)
    expect(slices[1]!.points[0]!.revenue).toBe(40)
  })
})

function revenueSlice(label: string, points: PerformanceNarrativePoint[]): RevenueSeriesNarrativeSlice {
  return {
    heading: label,
    metricLabel: label === "Revenus" ? "le chiffre d'affaires" : `les ${label.toLowerCase()}`,
    points,
  }
}

describe("buildMarginByRevenueOnlyPerformanceNarrative", () => {
  it("retourne un paragraphe par série de marge affichée", () => {
    const data = sampleAnnualData().map((p) => ({
      ...p,
      revenue: 1,
      grossProfit: 0,
      grossMarginPercent: p.grossMarginPercent,
    }))
    const result = buildMarginByRevenueOnlyPerformanceNarrative(
      [
        { heading: "Marge produits", metricLabel: "la marge de produits", points: data },
        {
          heading: "Marge services",
          metricLabel: "la marge de services",
          points: data.map((p) => ({ ...p, grossMarginPercent: p.grossMarginPercent - 5 })),
        },
      ],
      "years",
    )
    expect(result?.paragraphs).toHaveLength(2)
    expect(result?.paragraphs[0]!.heading).toBe("Marge produits")
    expect(result?.paragraphs[1]!.heading).toBe("Marge services")
  })
})

describe("mapDynamicChartToMarginByRevenueSeriesNarratives", () => {
  it("produit une tranche par série au format ratio", () => {
    const points: DynamicChartPoint[] = [
      { period: "2025", v_m1: 38, v_m2: 42 },
      { period: "2024", v_m1: 36, v_m2: 40 },
    ]
    const meta: BuiltSeriesMeta[] = [
      {
        id: "m1",
        dataKey: "v_m1",
        kind: "line",
        label: "Marge produits",
        color: "#f59e0b",
        yAxis: "right",
        valueFormat: "ratio",
        showOnChart: true,
        showInSidePanel: true,
      },
      {
        id: "m2",
        dataKey: "v_m2",
        kind: "line",
        label: "Marge services",
        color: "#8b5cf6",
        yAxis: "right",
        valueFormat: "ratio",
        showOnChart: true,
        showInSidePanel: true,
      },
    ]
    const slices = mapDynamicChartToMarginByRevenueSeriesNarratives(points, meta)
    expect(slices).toHaveLength(2)
    expect(slices[0]!.points[0]!.grossMarginPercent).toBe(38)
  })
})

describe("buildRevenueOnlyPerformanceNarrative", () => {
  it("retourne un seul paragraphe Revenus en vue annuelle", () => {
    const result = buildRevenueOnlyPerformanceNarrative([revenueSlice("Revenus", sampleAnnualData())], "years")
    expect(result?.mode).toBe("annual")
    if (result?.mode !== "annual") return
    expect(result.paragraphs).toHaveLength(1)
    expect(result.paragraphs[0]!.heading).toBe("Revenus")
    expect(result.paragraphs[0]!.section).toBe("revenue-performance")
    expect(result.title).toBe("Lecture de la performance")
  })

  it("retourne un paragraphe par source de revenus configurée", () => {
    const data = sampleAnnualData()
    const result = buildRevenueOnlyPerformanceNarrative(
      [
        revenueSlice("Ventes produits", data),
        revenueSlice("Services", data.map((p) => ({ ...p, revenue: p.revenue * 0.4 }))),
        revenueSlice("Location", data.map((p) => ({ ...p, revenue: p.revenue * 0.1 }))),
        revenueSlice("Autres", data.map((p) => ({ ...p, revenue: p.revenue * 0.05 }))),
      ],
      "years",
    )
    expect(result?.paragraphs).toHaveLength(4)
    expect(result?.paragraphs.map((p) => p.heading)).toEqual([
      "Ventes produits",
      "Services",
      "Location",
      "Autres",
    ])
  })

  it("inclut la saisonnalité en vue mensuelle 24 mois", () => {
    const data = sampleMonthly24Data()
    const result = buildRevenueOnlyPerformanceNarrative([revenueSlice("Revenus", data)], "24months")
    expect(result?.mode).toBe("monthly")
    if (result?.mode !== "monthly") return
    expect(result.paragraphs).toHaveLength(1)
    expect(result.paragraphs[0]!.seasonalityBody).toContain("saisonnalité")
  })

  it("ajoute la pondération et la structure du CA pour plusieurs sources", () => {
    const data = sampleAnnualData()
    const result = buildRevenueOnlyPerformanceNarrative(
      [
        revenueSlice("Ventes produits", data),
        revenueSlice("Services", data.map((p) => ({ ...p, revenue: p.revenue * 0.35 }))),
      ],
      "years",
    )
    expect(result?.paragraphs[0]!.body).toContain("% du total")
    expect(result?.paragraphs.some((p) => p.heading === "Structure du chiffre d'affaires")).toBe(false)
  })

  it("ne génère pas de paragraphe de marge contributive", () => {
    const data = sampleAnnualData()
    const result = buildRevenueOnlyPerformanceNarrative(
      [
        {
          heading: "Produits",
          metricLabel: "les produits",
          points: data,
          variableCostMapped: false,
        },
      ],
      "years",
    )
    expect(result?.paragraphs.some((p) => p.section === "contributive-margin")).toBe(false)
  })
})

describe("buildContributiveMarginByRevenueNarrative", () => {
  it("utilise le titre Lecture de la contribution marginale par revenus", () => {
    const data = sampleAnnualData().map((p) => ({
      ...p,
      variableCost: p.revenue * 0.4,
      grossProfit: p.revenue * 0.6,
      grossMarginPercent: 60,
    }))
    const result = buildContributiveMarginByRevenueNarrative(
      [
        {
          heading: "Produits",
          metricLabel: "les produits",
          points: data,
          variableCostMapped: true,
          variableCostAccountCount: 2,
        },
      ],
      "years",
    )
    expect(result?.title).toBe("Lecture de la contribution marginale par revenus")
    expect(result?.paragraphs.some((p) => p.section === "contributive-margin")).toBe(true)
    expect(result?.paragraphs[0]!.heading).toBe("Marge contributive — Produits")
  })

  it("signale l'absence de mapping comptable", () => {
    const result = buildContributiveMarginByRevenueNarrative(
      [
        {
          heading: "Produits",
          metricLabel: "les produits",
          points: sampleAnnualData(),
          variableCostMapped: false,
        },
      ],
      "years",
    )
    expect(result?.paragraphs[0]!.body).toContain("mapping comptable")
  })
})

describe("buildExpensesOnlyPerformanceNarrative", () => {
  it("retourne un seul paragraphe Dépenses en vue annuelle", () => {
    const result = buildExpensesOnlyPerformanceNarrative([revenueSlice("Dépenses", sampleAnnualData())], "years")
    expect(result?.mode).toBe("annual")
    if (result?.mode !== "annual") return
    expect(result.paragraphs).toHaveLength(1)
    expect(result.paragraphs[0]!.heading).toBe("Dépenses")
    expect(result.title).toBe("Lecture de la performance")
  })

  it("retourne un paragraphe par série de dépenses configurée", () => {
    const data = sampleAnnualData()
    const result = buildExpensesOnlyPerformanceNarrative(
      [
        revenueSlice("Salaires", data),
        revenueSlice("Marketing", data.map((p) => ({ ...p, revenue: p.revenue * 0.15 }))),
      ],
      "years",
    )
    expect(result?.paragraphs).toHaveLength(2)
    expect(result?.paragraphs.map((p) => p.heading)).toEqual(["Salaires", "Marketing"])
  })
})

describe("mapDynamicChartToExpenseSeriesNarratives", () => {
  it("mappe les barres monétaires visibles", () => {
    const points: DynamicChartPoint[] = [{ period: "2025", exp: 500_000 }]
    const meta: BuiltSeriesMeta[] = [
      {
        id: "exp",
        dataKey: "exp",
        label: "Charges d'exploitation",
        kind: "bar",
        valueFormat: "currency",
        showOnChart: true,
        showInSidePanel: true,
      },
    ]
    const slices = mapDynamicChartToExpenseSeriesNarratives(points, meta)
    expect(slices).toHaveLength(1)
    expect(slices[0]!.heading).toBe("Charges d'exploitation")
    expect(slices[0]!.metricLabel).toBe("les dépenses de charges d'exploitation")
    expect(slices[0]!.points[0]!.revenue).toBe(500_000)
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
