import { describe, it, expect } from "vitest"
import {
  buildActRevenuePercentHistory,
  buildComptesClientsHistory,
  buildCrediteursHistory,
  buildForecastEndingCashTrend,
  buildStocksHistory,
  comptesClientsAmountFromDriver,
  crediteursAmountFromDriver,
  isCapexDrivenBilanRow,
  isComptesClientsBilanRow,
  isCrediteursApparentesBilanRow,
  isCrediteursBilanRow,
  isCrediteursLikeBilanRow,
  isDecouvertBilanRow,
  isEncaisseBilanRow,
  isFinancingDrivenBilanRow,
  isHypothesisBilanSectionHeaderRow,
  isHypothesisBilanSubtotalRow,
  isOtherActBilanRow,
  isStocksBilanRow,
  isTreasuryEndingCashDrivenBilanRow,
  parseBilanAdjustments,
  recomputeBilanHypothesisSubtotalTrends,
  resolveBilanAdjustedValue,
  resolveComptesClientsProjectedValue,
  resolveCrediteursProjectedValue,
  resolveEncaisseFromEndingCash,
  resolveOtherActProjectedValue,
  resolveStocksProjectedValue,
  resolveTreasuryLineFromEndingCash,
  revenueForComptesClientsYear,
  stocksAmountFromDriver,
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
  it("matches ACT-A.1 / ACT-A and the Encaisse label", () => {
    expect(isEncaisseBilanRow({ linkCode: "ACT-A.1" })).toBe(true)
    expect(isEncaisseBilanRow({ rowId: "ACT-A.1" })).toBe(true)
    expect(isEncaisseBilanRow({ linkCode: "ACT-A" })).toBe(true)
    expect(isEncaisseBilanRow({ label: "Encaisse" })).toBe(true)
    expect(isEncaisseBilanRow({ linkCode: "ACT-A.2" })).toBe(false)
    expect(isEncaisseBilanRow({ linkCode: "PCT-A" })).toBe(false)
    expect(isEncaisseBilanRow({ label: "Clients" })).toBe(false)
  })
})

describe("isDecouvertBilanRow / isTreasuryEndingCashDrivenBilanRow", () => {
  it("matches PCT-A and Découvert bancaire", () => {
    expect(isDecouvertBilanRow({ linkCode: "PCT-A" })).toBe(true)
    expect(isDecouvertBilanRow({ rowId: "PCT-A.1" })).toBe(true)
    expect(isDecouvertBilanRow({ label: "Découvert bancaire" })).toBe(true)
    expect(isDecouvertBilanRow({ linkCode: "PCT-C" })).toBe(false)
    expect(isTreasuryEndingCashDrivenBilanRow({ linkCode: "ACT-A.1" })).toBe(true)
    expect(isTreasuryEndingCashDrivenBilanRow({ linkCode: "PCT-A" })).toBe(true)
    expect(isTreasuryEndingCashDrivenBilanRow({ linkCode: "PCT-C" })).toBe(false)
  })
})

describe("isComptesClientsBilanRow", () => {
  it("matches ACT-C and Comptes clients", () => {
    expect(isComptesClientsBilanRow({ linkCode: "ACT-C" })).toBe(true)
    expect(isComptesClientsBilanRow({ rowId: "ACT-C.1" })).toBe(true)
    expect(isComptesClientsBilanRow({ label: "Comptes clients" })).toBe(true)
    expect(isComptesClientsBilanRow({ label: "Fournisseurs" })).toBe(false)
    expect(isComptesClientsBilanRow({ linkCode: "ACT-A.1", label: "Encaisse" })).toBe(false)
    expect(isComptesClientsBilanRow({ linkCode: "ACT-B", label: "Placements temporaires" })).toBe(false)
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

describe("isStocksBilanRow", () => {
  it("matches ACT-F and Stocks", () => {
    expect(isStocksBilanRow({ linkCode: "ACT-F" })).toBe(true)
    expect(isStocksBilanRow({ rowId: "ACT-F.1" })).toBe(true)
    expect(isStocksBilanRow({ label: "Stocks" })).toBe(true)
    expect(isStocksBilanRow({ linkCode: "ACT-C", label: "Comptes clients" })).toBe(false)
  })
})

describe("isCrediteursBilanRow", () => {
  it("matches PCT-C and Créditeurs / fournisseurs labels", () => {
    expect(isCrediteursBilanRow({ linkCode: "PCT-C" })).toBe(true)
    expect(isCrediteursBilanRow({ rowId: "PCT-C.1" })).toBe(true)
    expect(isCrediteursBilanRow({ label: "Créditeurs" })).toBe(true)
    expect(isCrediteursBilanRow({ label: "Comptes fournisseurs" })).toBe(true)
    expect(isCrediteursBilanRow({ linkCode: "PCT-A", label: "Découvert bancaire" })).toBe(false)
    expect(isCrediteursBilanRow({ label: "Créditeurs - Apparentés" })).toBe(false)
    expect(isCrediteursBilanRow({ linkCode: "PCT-D.1" })).toBe(false)
  })
})

describe("isCrediteursApparentesBilanRow / isCrediteursLikeBilanRow", () => {
  it("matches PCT-D and Apparentés labels", () => {
    expect(isCrediteursApparentesBilanRow({ linkCode: "PCT-D" })).toBe(true)
    expect(isCrediteursApparentesBilanRow({ rowId: "PCT-D.1" })).toBe(true)
    expect(isCrediteursApparentesBilanRow({ label: "Créditeurs - Apparentés" })).toBe(true)
    expect(isCrediteursApparentesBilanRow({ label: "Créditeurs" })).toBe(false)
    expect(isCrediteursLikeBilanRow({ linkCode: "PCT-C.1" })).toBe(true)
    expect(isCrediteursLikeBilanRow({ linkCode: "PCT-D.1" })).toBe(true)
  })
})

describe("isCapexDrivenBilanRow", () => {
  it("matches ALT-B / ALT-C / ALT-D immobilisations Capex", () => {
    expect(isCapexDrivenBilanRow({ linkCode: "ALT-B" })).toBe(true)
    expect(isCapexDrivenBilanRow({ linkCode: "ALT-B.1" })).toBe(true)
    expect(isCapexDrivenBilanRow({ linkCode: "ALT-C.1" })).toBe(true)
    expect(isCapexDrivenBilanRow({ linkCode: "ALT-D" })).toBe(true)
    expect(isCapexDrivenBilanRow({ linkCode: "ACT-A.1" })).toBe(false)
    expect(isCapexDrivenBilanRow({ linkCode: "ALT-A" })).toBe(false)
  })
})

describe("isFinancingDrivenBilanRow", () => {
  it("matches PCT-H/I and PLT-C/D", () => {
    expect(isFinancingDrivenBilanRow({ linkCode: "PCT-H" })).toBe(true)
    expect(isFinancingDrivenBilanRow({ linkCode: "PCT-I.1" })).toBe(true)
    expect(isFinancingDrivenBilanRow({ linkCode: "PLT-C" })).toBe(true)
    expect(isFinancingDrivenBilanRow({ linkCode: "PLT-D.1" })).toBe(true)
    expect(isFinancingDrivenBilanRow({ linkCode: "PLT-B" })).toBe(false)
    expect(isFinancingDrivenBilanRow({ linkCode: "PCT-A" })).toBe(false)
  })
})

describe("stocks drivers", () => {
  it("builds history for the last two fiscal years from CMV and REV", () => {
    const history = buildStocksHistory({
      lastActualYear: 2025,
      stocksByYear: { 2024: 120_000, 2025: 150_000 },
      cmvByYear: { 2024: 1_200_000, 2025: 1_500_000 },
      revenueByYear: { 2024: 1_200_000, 2025: 1_500_000 },
    })
    expect(history.map((row) => row.year)).toEqual([2024, 2025])
    expect(history[0]?.inventoryDays).toBe(36.5)
    expect(history[0]?.revenuePercent).toBe(10)
    expect(history[1]?.inventoryDays).toBe(36.5)
    expect(history[1]?.revenuePercent).toBe(10)
  })

  it("converts inventory days via CMV and percent via REV", () => {
    expect(stocksAmountFromDriver({ type: "inventoryDays", value: 36.5, baseAmount: 1_200_000 })).toBe(
      120_000,
    )
    expect(stocksAmountFromDriver({ type: "revenuePercent", value: 10, baseAmount: 1_500_000 })).toBe(
      150_000,
    )
  })

  it("projects stocks from inventory days using CMV", () => {
    const trend = [120_000, 0, 0]
    const list = [adj({ id: "a", yearIndex: 1, type: "inventoryDays", value: 36.5 })]
    expect(resolveStocksProjectedValue(trend, 0, list, 1_000_000, 2_000_000)).toBe(120_000)
    expect(resolveStocksProjectedValue(trend, 1, list, 1_200_000, 2_000_000)).toBe(120_000)
  })

  it("projects stocks from revenue percent using REV", () => {
    const trend = [120_000, 0, 0]
    const list = [adj({ id: "a", yearIndex: 1, type: "revenuePercent", value: 12 })]
    expect(resolveStocksProjectedValue(trend, 1, list, 1_200_000, 1_000_000)).toBe(120_000)
  })

  it("applies a recurring inventory delay to later years using the same CMV base", () => {
    const trend = [120_000, 0, 0]
    const list = [adj({ id: "a", yearIndex: 1, type: "inventoryDays", value: 36.5, isRecurring: true })]
    expect(resolveStocksProjectedValue(trend, 1, list, 1_200_000, 0)).toBe(120_000)
    expect(resolveStocksProjectedValue(trend, 2, list, 1_200_000, 0)).toBe(120_000)
  })
})

describe("crediteurs drivers", () => {
  it("builds history for the last two fiscal years from CMV and REV", () => {
    const history = buildCrediteursHistory({
      lastActualYear: 2025,
      apByYear: { 2024: 120_000, 2025: 150_000 },
      cmvByYear: { 2024: 1_200_000, 2025: 1_500_000 },
      revenueByYear: { 2024: 1_200_000, 2025: 1_500_000 },
    })
    expect(history.map((row) => row.year)).toEqual([2024, 2025])
    expect(history[0]?.paymentDays).toBe(36.5)
    expect(history[0]?.revenuePercent).toBe(10)
    expect(history[1]?.paymentDays).toBe(36.5)
    expect(history[1]?.revenuePercent).toBe(10)
  })

  it("converts payment days via CMV and percent via REV", () => {
    expect(crediteursAmountFromDriver({ type: "paymentDays", value: 36.5, baseAmount: 1_200_000 })).toBe(
      120_000,
    )
    expect(crediteursAmountFromDriver({ type: "revenuePercent", value: 10, baseAmount: 1_500_000 })).toBe(
      150_000,
    )
  })

  it("projects créditeurs from payment days using CMV", () => {
    const trend = [120_000, 0, 0]
    const list = [adj({ id: "a", yearIndex: 1, type: "paymentDays", value: 36.5 })]
    expect(resolveCrediteursProjectedValue(trend, 0, list, 1_000_000, 2_000_000)).toBe(120_000)
    expect(resolveCrediteursProjectedValue(trend, 1, list, 1_200_000, 2_000_000)).toBe(120_000)
  })

  it("projects créditeurs from revenue percent using REV", () => {
    const trend = [120_000, 0, 0]
    const list = [adj({ id: "a", yearIndex: 1, type: "revenuePercent", value: 12 })]
    expect(resolveCrediteursProjectedValue(trend, 1, list, 1_200_000, 1_000_000)).toBe(120_000)
  })

  it("applies a recurring payment delay to later years using the same CMV base", () => {
    const trend = [120_000, 0, 0]
    const list = [adj({ id: "a", yearIndex: 1, type: "paymentDays", value: 36.5, isRecurring: true })]
    expect(resolveCrediteursProjectedValue(trend, 1, list, 1_200_000, 0)).toBe(120_000)
    expect(resolveCrediteursProjectedValue(trend, 2, list, 1_200_000, 0)).toBe(120_000)
  })
})

describe("isOtherActBilanRow", () => {
  it("matches other ACT posts and excludes Encaisse, clients, stocks", () => {
    expect(isOtherActBilanRow({ linkCode: "ACT-D.1" })).toBe(true)
    expect(isOtherActBilanRow({ rowId: "ACT-A.2" })).toBe(true)
    expect(isOtherActBilanRow({ linkCode: "ACT-B" })).toBe(true)
    expect(isOtherActBilanRow({ linkCode: "ACT-B.1", label: "Placements temporaires" })).toBe(true)
    expect(isOtherActBilanRow({ linkCode: "ACT-A.1" })).toBe(false)
    expect(isOtherActBilanRow({ linkCode: "ACT-C" })).toBe(false)
    expect(isOtherActBilanRow({ linkCode: "ACT-C.1" })).toBe(false)
    expect(isOtherActBilanRow({ linkCode: "ACT-F.1" })).toBe(false)
    expect(isOtherActBilanRow({ linkCode: "ALT-B.1" })).toBe(false)
  })
})

describe("other ACT revenue-percent driver", () => {
  it("builds history from amount and REV", () => {
    const history = buildActRevenuePercentHistory({
      lastActualYear: 2025,
      amountByYear: { 2024: 120_000, 2025: 150_000 },
      revenueByYear: { 2024: 1_200_000, 2025: 1_500_000 },
    })
    expect(history.map((row) => row.year)).toEqual([2024, 2025])
    expect(history[0]?.revenuePercent).toBe(10)
    expect(history[1]?.revenuePercent).toBe(10)
  })

  it("projects from revenue percent and keeps Montant $ as a delta", () => {
    const trend = [100_000, 100_000, 100_000]
    const pct = [adj({ id: "a", yearIndex: 1, type: "revenuePercent", value: 12 })]
    expect(resolveOtherActProjectedValue(trend, 1, pct, 1_000_000)).toBe(120_000)
    const amount = [adj({ id: "a", yearIndex: 1, type: "amount", value: 25_000 })]
    expect(resolveOtherActProjectedValue(trend, 1, amount, 1_000_000)).toBe(125_000)
  })

  it("applies a recurring percent to later years using each year's revenue", () => {
    const trend = [100_000, 0, 0]
    const list = [adj({ id: "a", yearIndex: 1, type: "revenuePercent", value: 10, isRecurring: true })]
    expect(resolveOtherActProjectedValue(trend, 1, list, 1_200_000)).toBe(120_000)
    expect(resolveOtherActProjectedValue(trend, 2, list, 2_400_000)).toBe(240_000)
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

  it("resolveTreasuryLineFromEndingCash mirrors Encaisse for Découvert", () => {
    expect(resolveTreasuryLineFromEndingCash(40, [80, 90, 70], 1)).toBe(50)
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

  it("keeps collection-day, inventory-day and payment-day drivers", () => {
    const parsed = parseBilanAdjustments({
      r1: [{ id: "a", yearIndex: 1, type: "collectionDays", value: 42 }],
      r2: [{ id: "b", yearIndex: 1, type: "inventoryDays", value: 60 }],
      r3: [{ id: "c", yearIndex: 1, type: "paymentDays", value: 45 }],
    })
    expect(parsed.r1?.[0]?.type).toBe("collectionDays")
    expect(parsed.r1?.[0]?.value).toBe(42)
    expect(parsed.r2?.[0]?.type).toBe("inventoryDays")
    expect(parsed.r2?.[0]?.value).toBe(60)
    expect(parsed.r3?.[0]?.type).toBe("paymentDays")
    expect(parsed.r3?.[0]?.value).toBe(45)
  })

  it("stores legacy percentage rows as amount adjustments", () => {
    const parsed = parseBilanAdjustments({
      r1: [{ id: "a", yearIndex: 1, type: "percentage", value: 15 }],
    })
    expect(parsed.r1?.[0]?.type).toBe("amount")
    expect(parsed.r1?.[0]?.value).toBe(15)
  })
})

describe("isHypothesisBilanSectionHeaderRow", () => {
  it("flags major balance-sheet section titles without link codes", () => {
    expect(isHypothesisBilanSectionHeaderRow({ label: "Actif", isSection: true })).toBe(true)
    expect(isHypothesisBilanSectionHeaderRow({ label: "Actif court terme" })).toBe(true)
    expect(isHypothesisBilanSectionHeaderRow({ label: "Passif" })).toBe(true)
    expect(isHypothesisBilanSectionHeaderRow({ label: "Passif court terme" })).toBe(true)
    expect(isHypothesisBilanSectionHeaderRow({ label: "Capitaux propres" })).toBe(true)
    expect(isHypothesisBilanSectionHeaderRow({ label: "Encaisse", linkCode: "ACT-A.1" })).toBe(false)
    expect(isHypothesisBilanSectionHeaderRow({ label: "Total de l'actif" })).toBe(false)
    expect(
      isHypothesisBilanSectionHeaderRow({ label: "Actif d'impôts exigibles", linkCode: "ACT-H.1" }),
    ).toBe(false)
  })
})

describe("isHypothesisBilanSubtotalRow", () => {
  it("flags isResult, formulas, and Total labels without requiring bold", () => {
    expect(isHypothesisBilanSubtotalRow({ label: "Total de l'actif", isResult: true })).toBe(true)
    expect(isHypothesisBilanSubtotalRow({ label: "Total de l'actif" })).toBe(true)
    expect(isHypothesisBilanSubtotalRow({ label: "Actif", isSection: true, isBold: true })).toBe(false)
    expect(isHypothesisBilanSubtotalRow({ label: "Total du passif", isBold: true })).toBe(true)
    expect(isHypothesisBilanSubtotalRow({ label: "Encaisse", isBold: true })).toBe(false)
    expect(isHypothesisBilanSubtotalRow({ label: "Somme", hasFormula: true })).toBe(true)
  })
})

describe("recomputeBilanHypothesisSubtotalTrends", () => {
  it("sums leaf posts into a section total", () => {
    const rows = [
      { label: "Actif", isSection: true, current: 0, prior: 0 },
      {
        label: "Encaisse",
        rowId: "ACT-A.1",
        linkCode: "ACT-A.1",
        current: 100,
        prior: 90,
        trendValues: [100, 110, 0],
      },
      {
        label: "Clients",
        rowId: "ACT-C",
        linkCode: "ACT-C.1",
        current: 200,
        prior: 180,
        trendValues: [200, 220, 50],
      },
      {
        label: "Total ACT",
        isSubtotal: true,
        current: 0,
        prior: 0,
        trendValues: [0, 0, 0],
      },
    ]
    const out = recomputeBilanHypothesisSubtotalTrends(
      rows,
      (row, y) => row.trendValues?.[y] ?? 0,
    )
    expect(out[3]?.trendValues).toEqual([300, 330, 50])
  })

  it("sums ACT+ALT via liaisonSumCodes like Balance Sheet Summary", () => {
    const rows = [
      { label: "Actif", isSection: true, current: 0, prior: 0 },
      { label: "Actif court terme", isSection: true, indent: true, current: 0, prior: 0 },
      {
        label: "Encaisse",
        linkCode: "ACT-A.1",
        current: 100,
        prior: 0,
        trendValues: [100, 105, 10],
      },
      {
        label: "Stocks",
        linkCode: "ACT-F.1",
        current: 50,
        prior: 0,
        trendValues: [50, 55, 5],
      },
      {
        label: "Total de l'actif à court terme",
        isSubtotal: true,
        liaisonMode: "sum",
        liaisonSumCodes: ["ACT-A", "ACT-F"],
        current: 0,
        prior: 0,
        trendValues: [0, 0, 0],
      },
      { label: "Actif long terme", isSection: true, indent: true, current: 0, prior: 0 },
      {
        label: "Immob",
        linkCode: "ALT-B.1",
        current: 400,
        prior: 0,
        trendValues: [400, 410, 40],
      },
      {
        label: "Total de l'actif",
        isSubtotal: true,
        liaisonMode: "sum",
        liaisonSumCodes: ["ACT-A", "ACT-F", "ALT-B"],
        current: 0,
        prior: 0,
        trendValues: [0, 0, 0],
      },
    ]
    const out = recomputeBilanHypothesisSubtotalTrends(
      rows,
      (row, y) => row.trendValues?.[y] ?? 0,
    )
    expect(out[4]?.trendValues).toEqual([150, 160, 15])
    expect(out[7]?.trendValues).toEqual([550, 570, 55])
  })

  it("evaluates structure formulas for grand totals", () => {
    const rows = [
      {
        label: "Total ACT",
        rowId: "total-act",
        isSubtotal: true,
        current: 0,
        prior: 0,
        trendValues: [150, 160],
      },
      {
        label: "Total ALT",
        rowId: "total-alt",
        isSubtotal: true,
        current: 0,
        prior: 0,
        trendValues: [400, 410],
      },
      {
        label: "Total de l'actif",
        isSubtotal: true,
        formula: ["+total-act", "+total-alt"],
        current: 0,
        prior: 0,
        trendValues: [0, 0],
      },
    ]
    const out = recomputeBilanHypothesisSubtotalTrends(
      rows,
      (row, y) => row.trendValues?.[y] ?? 0,
    )
    expect(out[2]?.trendValues).toEqual([550, 570])
  })

  it("rolls section totals into Total de l'actif from already-recomputed child totals", () => {
    const rows = [
      { label: "Actif", isSection: true, current: 0, prior: 0 },
      { label: "Actif court terme", isSection: true, indent: true, current: 0, prior: 0 },
      { label: "Encaisse", current: 100, prior: 0, trendValues: [100, 10] },
      { label: "Total ACT", isSubtotal: true, current: 0, prior: 0, trendValues: [0, 0] },
      { label: "Actif long terme", isSection: true, indent: true, current: 0, prior: 0 },
      { label: "Immob", current: 400, prior: 0, trendValues: [400, 40] },
      { label: "Total ALT", isSubtotal: true, current: 0, prior: 0, trendValues: [0, 0] },
      { label: "Total de l'actif", isSubtotal: true, current: 0, prior: 0, trendValues: [0, 0] },
    ]
    const out = recomputeBilanHypothesisSubtotalTrends(
      rows,
      (row, y) => row.trendValues?.[y] ?? 0,
    )
    expect(out[3]?.trendValues).toEqual([100, 10])
    expect(out[6]?.trendValues).toEqual([400, 40])
    expect(out[7]?.trendValues).toEqual([500, 50])
  })
})
