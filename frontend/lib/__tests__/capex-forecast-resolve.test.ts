import { describe, expect, it } from "vitest"
import {
  buildCapexConfigTrend,
  linkCodeDescendsFrom,
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

describe("resolveCapexRowValue", () => {
  it("returns 0 for projected years without adjustments", () => {
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
    expect(resolveCapexRowValue("ALT-B.1", 1, 0, 500_000, adjustments, [])).toBe(100_000)
  })
})

describe("resolveCapexDrivenBilanProjectedAmount", () => {
  it("uses own Capex adjustment", () => {
    const adjustments = {
      "ALT-C.1-1": [adj({ id: "a", rowId: "ALT-C.1", yearIndex: 1, type: "amount", value: 75_000 })],
    }
    expect(
      resolveCapexDrivenBilanProjectedAmount({
        rowId: "ALT-C.1",
        linkCode: "ALT-C.1",
        configYearIndex: 1,
        configYearCount: 3,
        actualBase: 120_000,
        adjustments,
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
        peerRows: [
          { rowId: "ALT-B.1", linkCode: "ALT-B.1", actualBase: 200_000 },
          { rowId: "ALT-B.2", linkCode: "ALT-B.2", actualBase: 300_000 },
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
        peerRows: [
          { rowId: "detail-terrains-uuid", linkCode: "ALT-B.1", actualBase: 200_000 },
        ],
      }),
    ).toBe(400_000)
  })

  it("returns 0 when nothing is projected", () => {
    expect(
      resolveCapexDrivenBilanProjectedAmount({
        rowId: "ALT-D",
        linkCode: "ALT-D",
        configYearIndex: 1,
        configYearCount: 3,
        actualBase: 10_000,
        adjustments: {},
        peerRows: [],
      }),
    ).toBe(0)
  })
})

describe("buildCapexConfigTrend", () => {
  it("keeps actual base on year 0 and Capex amounts after", () => {
    const adjustments = {
      "ALT-B-1": [adj({ id: "a", rowId: "ALT-B", yearIndex: 1, type: "amount", value: 50_000 })],
    }
    expect(buildCapexConfigTrend("ALT-B", 3, 200_000, adjustments, [])).toEqual([
      200_000, 50_000, 0,
    ])
  })
})
