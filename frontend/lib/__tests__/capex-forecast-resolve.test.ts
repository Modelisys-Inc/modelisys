import { describe, expect, it } from "vitest"
import {
  buildCapexAssetYearStates,
  buildCapexBookValueTrend,
  buildCapexConfigTrend,
  computeCapexDepreciationExpense,
  linkCodeDescendsFrom,
  normalizeCapexOpeningBalances,
  resolveCapexAdditionsForYear,
  resolveCapexDrivenBilanProjectedAmount,
  resolveCapexRowValue,
  type CapexAdjustment,
} from "../capex-forecast-resolve"

const adj = (
  partial: Partial<CapexAdjustment> & Pick<CapexAdjustment, "id" | "rowId" | "yearIndex" | "type" | "value">,
): CapexAdjustment => ({
  note: "",
  ...partial,
})

describe("linkCodeDescendsFrom", () => {
  it("detects ALT-B children only", () => {
    expect(linkCodeDescendsFrom("ALT-B.1", "ALT-B")).toBe(true)
    expect(linkCodeDescendsFrom("ALT-B-2", "ALT-B")).toBe(true)
    expect(linkCodeDescendsFrom("ALT-C.1", "ALT-B")).toBe(false)
    expect(linkCodeDescendsFrom("ALT-B", "ALT-B")).toBe(false)
  })
})

describe("normalizeCapexOpeningBalances", () => {
  it("derives accumulated depreciation from cost − book", () => {
    expect(normalizeCapexOpeningBalances({ openingCost: 100_000, openingBookValue: 60_000 })).toEqual({
      cost: 100_000,
      accumulatedDepreciation: 40_000,
      bookValue: 60_000,
    })
  })

  it("falls back to book as cost when cost mapping is missing", () => {
    expect(normalizeCapexOpeningBalances({ openingCost: 0, openingBookValue: 80_000 })).toEqual({
      cost: 80_000,
      accumulatedDepreciation: 0,
      bookValue: 80_000,
    })
  })
})

describe("computeCapexDepreciationExpense", () => {
  it("applies linear on cost capped by book", () => {
    expect(
      computeCapexDepreciationExpense({
        cost: 100_000,
        bookValueBeforeDepreciation: 60_000,
        ratePercent: 10,
        method: "linear",
      }),
    ).toBe(10_000)
  })

  it("applies declining on book value", () => {
    expect(
      computeCapexDepreciationExpense({
        cost: 100_000,
        bookValueBeforeDepreciation: 60_000,
        ratePercent: 20,
        method: "declining",
      }),
    ).toBe(12_000)
  })

  it("returns 0 when rate is 0", () => {
    expect(
      computeCapexDepreciationExpense({
        cost: 100_000,
        bookValueBeforeDepreciation: 60_000,
        ratePercent: 0,
        method: "linear",
      }),
    ).toBe(0)
  })
})

describe("resolveCapexAdditionsForYear / resolveCapexRowValue", () => {
  it("returns 0 for projected years without adjustments", () => {
    expect(resolveCapexAdditionsForYear("ALT-B.1", 1, 0, 500_000, {}, [0, 1_000_000])).toBe(0)
    expect(resolveCapexRowValue("ALT-B.1", 1, 0, 500_000, {}, [0, 1_000_000])).toBe(0)
    expect(resolveCapexRowValue("ALT-B.1", 0, 500_000, 500_000, {}, [])).toBe(500_000)
  })

  it("sums amount adjustments for a projected year", () => {
    const adjustments = {
      "ALT-B.1-1": [
        adj({ id: "a", rowId: "ALT-B.1", yearIndex: 1, type: "amount", value: 80_000 }),
        adj({ id: "b", rowId: "ALT-B.1", yearIndex: 1, type: "amount", value: 20_000 }),
      ],
    }
    expect(resolveCapexAdditionsForYear("ALT-B.1", 1, 0, 500_000, adjustments, [])).toBe(100_000)
  })
})

describe("buildCapexAssetYearStates / book value trend", () => {
  it("depreciates book value with no adjustments (linear)", () => {
    const states = buildCapexAssetYearStates({
      rowId: "ALT-B.2",
      configYearCount: 3,
      openingCost: 100_000,
      openingBookValue: 80_000,
      adjustments: {},
      ratePercent: 10,
      method: "linear",
    })
    expect(states[0]).toMatchObject({
      cost: 100_000,
      accumulatedDepreciation: 20_000,
      bookValue: 80_000,
      additions: 0,
      depreciationExpense: 0,
    })
    // Year 1: cost 100k, dep 10k, accum 30k, book 70k
    expect(states[1]).toMatchObject({
      cost: 100_000,
      accumulatedDepreciation: 30_000,
      bookValue: 70_000,
      additions: 0,
      depreciationExpense: 10_000,
    })
    expect(states[2]?.bookValue).toBe(60_000)
  })

  it("adds adjustment to cost then depreciates", () => {
    const adjustments = {
      "ALT-B.2-1": [adj({ id: "a", rowId: "ALT-B.2", yearIndex: 1, type: "amount", value: 50_000 })],
    }
    const trend = buildCapexBookValueTrend({
      rowId: "ALT-B.2",
      configYearCount: 3,
      openingCost: 100_000,
      openingBookValue: 80_000,
      adjustments,
      ratePercent: 10,
      method: "linear",
    })
    // Y0: 80k
    // Y1: cost 150k, book before dep 130k, dep 15k, book 115k
    // Y2: cost 150k, dep 15k, book 100k
    expect(trend).toEqual([80_000, 115_000, 100_000])
  })

  it("keeps book flat when rate is 0 (Terrains) and adds Capex", () => {
    const adjustments = {
      "ALT-B.1-1": [adj({ id: "a", rowId: "ALT-B.1", yearIndex: 1, type: "amount", value: 400_000 })],
    }
    expect(
      buildCapexBookValueTrend({
        rowId: "ALT-B.1",
        configYearCount: 3,
        openingCost: 0,
        openingBookValue: 0,
        adjustments,
        ratePercent: 0,
        method: "linear",
      }),
    ).toEqual([0, 400_000, 400_000])
  })
})

describe("resolveCapexDrivenBilanProjectedAmount", () => {
  it("uses own Capex adjustment as book value (rate 0)", () => {
    const adjustments = {
      "ALT-C.1-1": [adj({ id: "a", rowId: "ALT-C.1", yearIndex: 1, type: "amount", value: 75_000 })],
    }
    expect(
      resolveCapexDrivenBilanProjectedAmount({
        rowId: "ALT-C.1",
        linkCode: "ALT-C.1",
        configYearIndex: 1,
        configYearCount: 3,
        actualBase: 0,
        adjustments,
        depreciationRates: { "ALT-C.1": 0 },
        peerRows: [],
      }),
    ).toBe(75_000)
  })

  it("rolls child Capex into parent when parent has no own hyp", () => {
    const adjustments = {
      "ALT-B.1-1": [adj({ id: "a", rowId: "ALT-B.1", yearIndex: 1, type: "amount", value: 40_000 })],
      "ALT-B.2-1": [adj({ id: "b", rowId: "ALT-B.2", yearIndex: 1, type: "amount", value: 60_000 })],
    }
    expect(
      resolveCapexDrivenBilanProjectedAmount({
        rowId: "ALT-B",
        linkCode: "ALT-B",
        configYearIndex: 1,
        configYearCount: 3,
        actualBase: 500_000,
        adjustments,
        depreciationRates: { "ALT-B.1": 0, "ALT-B.2": 0 },
        peerRows: [
          { rowId: "ALT-B.1", linkCode: "ALT-B.1", actualBase: 0 },
          { rowId: "ALT-B.2", linkCode: "ALT-B.2", actualBase: 0 },
        ],
      }),
    ).toBe(100_000)
  })

  it("rolls UUID-keyed Terrains Capex into ALT-B parent via stored linkCode", () => {
    const adjustments = {
      "detail-terrains-uuid-1": [
        adj({
          id: "a",
          rowId: "detail-terrains-uuid",
          yearIndex: 1,
          type: "amount",
          value: 400_000,
          linkCode: "ALT-B.1",
        }),
      ],
    }
    expect(
      resolveCapexDrivenBilanProjectedAmount({
        rowId: "immoc-parent",
        linkCode: "ALT-B",
        configYearIndex: 1,
        configYearCount: 3,
        actualBase: 1_000_000,
        adjustments,
        depreciationRates: { "detail-terrains-uuid": 0 },
        peerRows: [],
      }),
    ).toBe(400_000)
  })

  it("rolls UUID-keyed Capex into parent via peer linkCode when adj has no linkCode", () => {
    const adjustments = {
      "detail-terrains-uuid-1": [
        adj({
          id: "a",
          rowId: "detail-terrains-uuid",
          yearIndex: 1,
          type: "amount",
          value: 400_000,
        }),
      ],
    }
    expect(
      resolveCapexDrivenBilanProjectedAmount({
        rowId: "ALT-B",
        linkCode: "ALT-B",
        configYearIndex: 1,
        configYearCount: 3,
        actualBase: 1_000_000,
        adjustments,
        depreciationRates: { "detail-terrains-uuid": 0 },
        peerRows: [
          {
            rowId: "detail-terrains-uuid",
            linkCode: "ALT-B.1",
            actualBase: 200_000,
            label: "Terrains",
          },
        ],
      }),
    ).toBe(600_000)
  })

  it("projects depreciated book value when nothing is adjusted", () => {
    expect(
      resolveCapexDrivenBilanProjectedAmount({
        rowId: "ALT-D",
        linkCode: "ALT-D",
        configYearIndex: 1,
        configYearCount: 3,
        actualBase: 10_000,
        actualCostBase: 10_000,
        label: "Actifs incorporels",
        adjustments: {},
        depreciationRates: { "ALT-D": 10 },
        depreciationMethods: { "ALT-D": "linear" },
        peerRows: [],
      }),
    ).toBe(9_000)
  })
})

describe("buildCapexConfigTrend", () => {
  it("keeps actual base on year 0 and Capex additions after", () => {
    const adjustments = {
      "ALT-B-1": [adj({ id: "a", rowId: "ALT-B", yearIndex: 1, type: "amount", value: 50_000 })],
    }
    expect(buildCapexConfigTrend("ALT-B", 3, 200_000, adjustments, [])).toEqual([
      200_000, 50_000, 0,
    ])
  })
})
