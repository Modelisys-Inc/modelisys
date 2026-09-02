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
  resolveCapexDrivenDepreciationExpense,
  resolveCapexDrivenDepreciationExpenseMonthly,
  rollupCapexParentTrendsFromLeafRows,
  capexLeafChildrenOfParent,
  isCapexDrivenAmortizationIsLinkCode,
  capexAssetRootsForAmortIsLinkCode,
  capexAmortIsLinkCodeOptionsForAsset,
  resolveCapexRowValue,
  sumCapexAdditionsForAssetRoot,
  uniqueCapexAssetRootFromAttachedCodes,
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

describe("sumCapexAdditionsForAssetRoot / uniqueCapexAssetRootFromAttachedCodes", () => {
  it("resolves a single Capex family from attached CF codes", () => {
    expect(uniqueCapexAssetRootFromAttachedCodes(["ALT-B.1", "ALT-B.2"])).toBe("ALT-B")
    expect(uniqueCapexAssetRootFromAttachedCodes(["ALT-C"])).toBe("ALT-C")
    expect(uniqueCapexAssetRootFromAttachedCodes(["ALT-D.1"])).toBe("ALT-D")
    expect(uniqueCapexAssetRootFromAttachedCodes(["ALT-B", "ALT-C"])).toBeNull()
    expect(uniqueCapexAssetRootFromAttachedCodes(["ACT-C"])).toBeNull()
  })

  it("sums Capex hypothesis adjustments for an ALT family", () => {
    const adjustments = {
      "ALT-B.1-1": [adj({ id: "a", rowId: "ALT-B.1", yearIndex: 1, type: "amount", value: 40_000 })],
      "ALT-B.2-1": [adj({ id: "b", rowId: "ALT-B.2", yearIndex: 1, type: "amount", value: 60_000 })],
      "ALT-C.1-1": [adj({ id: "c", rowId: "ALT-C.1", yearIndex: 1, type: "amount", value: 99_000 })],
    }
    const peerRows = [
      { rowId: "ALT-B.1", linkCode: "ALT-B.1", actualBase: 0 },
      { rowId: "ALT-B.2", linkCode: "ALT-B.2", actualBase: 0 },
      { rowId: "ALT-C.1", linkCode: "ALT-C.1", actualBase: 0 },
    ]
    expect(
      sumCapexAdditionsForAssetRoot({
        root: "ALT-B",
        configYearIndex: 1,
        peerRows,
        adjustments,
      }),
    ).toBe(100_000)
    expect(
      sumCapexAdditionsForAssetRoot({
        root: "ALT-C",
        configYearIndex: 1,
        peerRows,
        adjustments,
      }),
    ).toBe(99_000)
    expect(
      sumCapexAdditionsForAssetRoot({
        root: "ALT-B",
        configYearIndex: 0,
        peerRows,
        adjustments,
      }),
    ).toBe(0)
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
  it("depreciates book value with no adjustments (linear, monthly engine)", () => {
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
    // Mensuel linéaire sans ajout : somme = taux × coût (= amort. annuel classique)
    expect(states[1]?.depreciationExpense).toBe(10_000)
    expect(states[1]?.bookValue).toBe(70_000)
    expect(states[1]?.cost).toBe(100_000)
    expect(states[2]?.bookValue).toBe(60_000)
  })

  it("adds mid-year adjustment then depreciates monthly (matches sommaire)", () => {
    const peaked = Array(12).fill(0)
    peaked[5] = 100 // juin = 100 % de l’ajout
    const adjustments = {
      "ALT-B.2-1": [
        adj({
          id: "a",
          rowId: "ALT-B.2",
          yearIndex: 1,
          type: "amount",
          value: 50_000,
          seasonalityMonthPercents: peaked,
        }),
      ],
    }
    const states = buildCapexAssetYearStates({
      rowId: "ALT-B.2",
      configYearCount: 2,
      openingCost: 100_000,
      openingBookValue: 80_000,
      adjustments,
      ratePercent: 10,
      method: "linear",
    })
    // Dotation ≠ 15k (ancien : 10% × 150k une fois) — plus basse car ajout en juin seulement
    expect(states[1]?.cost).toBe(150_000)
    expect(states[1]?.additions).toBe(50_000)
    expect(states[1]?.depreciationExpense).toBeLessThan(15_000)
    expect(states[1]?.depreciationExpense).toBeGreaterThan(9_996) // > année sans ajout
    expect(states[1]?.bookValue).toBe(150_000 - states[1]!.accumulatedDepreciation)
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

  it("includes unadjusted sibling leaves in parent rollup (not only hyps)", () => {
    const adjustments = {
      "ALT-B.1-1": [adj({ id: "a", rowId: "ALT-B.1", yearIndex: 1, type: "amount", value: 40_000 })],
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
          { rowId: "ALT-B.1", linkCode: "ALT-B.1", actualBase: 100_000 },
          { rowId: "ALT-B.2", linkCode: "ALT-B.2", actualBase: 200_000 },
        ],
      }),
    ).toBe(340_000) // (100k+40k) + 200k
  })

  it("rollupCapexParentTrendsFromLeafRows sums leaf VNC onto parent", () => {
    const rows = [
      {
        rowId: "ALT-B",
        linkCode: "ALT-B",
        trendValues: [1_000_000, 920_000],
        current: 1_000_000,
        prior: 920_000,
      },
      {
        rowId: "ALT-B.1",
        linkCode: "ALT-B.1",
        trendValues: [100_000, 140_000],
        current: 100_000,
        prior: 140_000,
      },
      {
        rowId: "ALT-B.2",
        linkCode: "ALT-B.2",
        trendValues: [200_000, 200_000],
        current: 200_000,
        prior: 200_000,
      },
    ]
    expect(capexLeafChildrenOfParent(rows, rows[0]!)).toHaveLength(2)
    const out = rollupCapexParentTrendsFromLeafRows(rows)
    expect(out[0]?.trendValues).toEqual([300_000, 340_000])
    expect(out[1]?.trendValues).toEqual([100_000, 140_000])
  })

  it("rollupCapexParentTrendsFromLeafRows builds parent trends when parent seed is empty", () => {
    const rows = [
      {
        rowId: "ALT-B",
        linkCode: "ALT-B",
        trendValues: [0, 0, 0],
        current: 0,
        prior: 0,
      },
      {
        rowId: "ALT-B.1",
        linkCode: "ALT-B.1",
        trendValues: [100_000, 90_000, 80_000],
        current: 100_000,
        prior: 90_000,
      },
      {
        rowId: "ALT-B.2",
        linkCode: "ALT-B.2",
        trendValues: [50_000, 40_000, 30_000],
        current: 50_000,
        prior: 40_000,
      },
    ]
    const out = rollupCapexParentTrendsFromLeafRows(rows)
    expect(out[0]?.trendValues).toEqual([150_000, 130_000, 110_000])
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

describe("capex amort → income statement mapping", () => {
  it("maps corporelles / loués codes to ALT-B + ALT-C and incorporels to ALT-D", () => {
    expect(isCapexDrivenAmortizationIsLinkCode("ADM.20")).toBe(true)
    expect(isCapexDrivenAmortizationIsLinkCode("EXP.21")).toBe(true)
    expect(isCapexDrivenAmortizationIsLinkCode("EXP.1")).toBe(false)
    expect(capexAssetRootsForAmortIsLinkCode("CMV.11")).toEqual(["ALT-B", "ALT-C"])
    expect(capexAssetRootsForAmortIsLinkCode("ADM.21")).toEqual(["ALT-D"])
  })

  it("filters picker options by Capex asset family", () => {
    expect(capexAmortIsLinkCodeOptionsForAsset("ALT-B.2")).toEqual(["CMV.11", "EXP.20", "ADM.20"])
    expect(capexAmortIsLinkCodeOptionsForAsset("ALT-C.1")).toEqual(["CMV.11", "EXP.20", "ADM.20"])
    expect(capexAmortIsLinkCodeOptionsForAsset("ALT-D")).toEqual(["EXP.21", "ADM.21"])
  })
})

describe("resolveCapexDrivenDepreciationExpense", () => {
  it("sums period depreciation only for Capex rows assigned to that IS code", () => {
    expect(
      resolveCapexDrivenDepreciationExpense({
        isLinkCode: "ADM.20",
        configYearIndex: 1,
        configYearCount: 3,
        adjustments: {},
        depreciationRates: { "ALT-B.2": 10, "ALT-B.3": 20 },
        depreciationMethods: { "ALT-B.2": "linear", "ALT-B.3": "linear" },
        amortizationLinkCodes: {
          "ALT-B.2": "ADM.20",
          "ALT-B.3": "EXP.20",
        },
        peerRows: [
          {
            rowId: "ALT-B",
            linkCode: "ALT-B",
            actualBase: 150_000,
            actualCostBase: 150_000,
            label: "Immobilisations corporelles",
          },
          {
            rowId: "ALT-B.2",
            linkCode: "ALT-B.2",
            actualBase: 100_000,
            actualCostBase: 100_000,
            label: "Bâtisses",
          },
          {
            rowId: "ALT-B.3",
            linkCode: "ALT-B.3",
            actualBase: 50_000,
            actualCostBase: 50_000,
            label: "Équipement",
          },
        ],
      }),
    ).toBe(10_000) // only ALT-B.2 → ADM.20
  })

  it("includes ALT-C leaf when its selected code matches", () => {
    expect(
      resolveCapexDrivenDepreciationExpense({
        isLinkCode: "EXP.20",
        configYearIndex: 1,
        configYearCount: 3,
        adjustments: {},
        depreciationRates: { "ALT-C.1": 10 },
        depreciationMethods: { "ALT-C.1": "linear" },
        amortizationLinkCodes: { "ALT-C.1": "EXP.20" },
        peerRows: [
          {
            rowId: "ALT-C.1",
            linkCode: "ALT-C.1",
            actualBase: 80_000,
            actualCostBase: 80_000,
            label: "Équipement loué",
          },
        ],
      }),
    ).toBe(8_000)
  })

  it("maps ALT-D depreciation to selected EXP.21", () => {
    expect(
      resolveCapexDrivenDepreciationExpense({
        isLinkCode: "EXP.21",
        configYearIndex: 1,
        configYearCount: 3,
        adjustments: {},
        depreciationRates: { "ALT-D": 10 },
        depreciationMethods: { "ALT-D": "linear" },
        amortizationLinkCodes: { "ALT-D": "EXP.21" },
        peerRows: [
          {
            rowId: "ALT-D",
            linkCode: "ALT-D",
            actualBase: 40_000,
            actualCostBase: 40_000,
            label: "Actifs incorporels",
          },
        ],
      }),
    ).toBe(4_000)
  })

  it("returns 0 when no Capex row selected that IS code", () => {
    expect(
      resolveCapexDrivenDepreciationExpense({
        isLinkCode: "ADM.20",
        configYearIndex: 1,
        configYearCount: 3,
        adjustments: {},
        depreciationRates: { "ALT-B.2": 10 },
        amortizationLinkCodes: {},
        peerRows: [
          {
            rowId: "ALT-B.2",
            linkCode: "ALT-B.2",
            actualBase: 100_000,
            actualCostBase: 100_000,
          },
        ],
      }),
    ).toBe(0)
  })

  it("resolves when Capex saved under series UUID and peer keyed the same", () => {
    expect(
      resolveCapexDrivenDepreciationExpense({
        isLinkCode: "ADM.20",
        configYearIndex: 1,
        configYearCount: 3,
        adjustments: {},
        depreciationRates: { "uuid-batisses": 10 },
        depreciationMethods: { "uuid-batisses": "linear" },
        amortizationLinkCodes: { "uuid-batisses": "ADM.20", "ALT-B.2": "ADM.20" },
        peerRows: [
          {
            rowId: "uuid-batisses",
            linkCode: "ALT-B.2",
            actualBase: 100_000,
            actualCostBase: 100_000,
            label: "Bâtisses",
          },
        ],
      }),
    ).toBe(10_000)
  })

  it("resolves when Capex saved only under linkCode alias", () => {
    expect(
      resolveCapexDrivenDepreciationExpense({
        isLinkCode: "ADM.20",
        configYearIndex: 1,
        configYearCount: 3,
        adjustments: {},
        depreciationRates: { "ALT-B.2": 10 },
        depreciationMethods: { "ALT-B.2": "linear" },
        amortizationLinkCodes: { "ALT-B.2": "ADM.20" },
        peerRows: [
          {
            rowId: "uuid-batisses",
            linkCode: "ALT-B.2",
            actualBase: 100_000,
            actualCostBase: 100_000,
            label: "Bâtisses",
          },
        ],
      }),
    ).toBe(10_000)
  })

  it("monthly depreciation sums to annual and is flat without mid-year additions", () => {
    const params = {
      isLinkCode: "ADM.20",
      configYearIndex: 1,
      configYearCount: 3,
      adjustments: {} as Record<string, CapexAdjustment[]>,
      depreciationRates: { "ALT-B.2": 10 },
      depreciationMethods: { "ALT-B.2": "linear" as const },
      amortizationLinkCodes: { "ALT-B.2": "ADM.20" },
      peerRows: [
        {
          rowId: "ALT-B.2",
          linkCode: "ALT-B.2",
          actualBase: 100_000,
          actualCostBase: 100_000,
          label: "Bâtisses",
        },
      ],
    }
    const months = resolveCapexDrivenDepreciationExpenseMonthly(params)
    expect(months).toHaveLength(12)
    expect(months.reduce((a, b) => a + b, 0)).toBe(
      resolveCapexDrivenDepreciationExpense(params),
    )
    expect(months.reduce((a, b) => a + b, 0)).toBe(10_000)
    // Répartition des cents : 833 ou 834, pas de saisonnalité d’ajout
    expect(Math.max(...months) - Math.min(...months)).toBeLessThanOrEqual(1)
  })

  it("monthly depreciation rises after a mid-year Capex addition (Sommaire curve)", () => {
    const peaked = Array(12).fill(0)
    peaked[5] = 100 // juin
    const params = {
      isLinkCode: "ADM.20",
      configYearIndex: 1,
      configYearCount: 2,
      adjustments: {
        "ALT-B.2-1": [
          adj({
            id: "a",
            rowId: "ALT-B.2",
            yearIndex: 1,
            type: "amount" as const,
            value: 50_000,
            seasonalityMonthPercents: peaked,
          }),
        ],
      },
      depreciationRates: { "ALT-B.2": 10 },
      depreciationMethods: { "ALT-B.2": "linear" as const },
      amortizationLinkCodes: { "ALT-B.2": "ADM.20" },
      peerRows: [
        {
          rowId: "ALT-B.2",
          linkCode: "ALT-B.2",
          actualBase: 80_000,
          actualCostBase: 100_000,
          label: "Bâtisses",
        },
      ],
    }
    const months = resolveCapexDrivenDepreciationExpenseMonthly(params)
    expect(months.reduce((a, b) => a + b, 0)).toBe(
      resolveCapexDrivenDepreciationExpense(params),
    )
    // Jan–mai : coût 100k ; juin–déc : coût 150k → dotation plus haute après l’ajout
    expect(months[5]!).toBeGreaterThan(months[0]!)
    expect(months[11]!).toBe(months[5]!)
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
