import { describe, expect, it } from "vitest"
import {
  emptyHorizonColumnMask,
  filterLabeledHorizonPoints,
  pickHorizonColumns,
} from "@/lib/horizon-column-visibility"

describe("emptyHorizonColumnMask", () => {
  it("drops columns where every series is zero", () => {
    const mask = emptyHorizonColumnMask(5, [
      [0, 0, 100, 0, 0],
      [0, 0, 50, 0, 0],
    ])
    expect(mask).toEqual([false, false, true, false, false])
  })

  it("keeps a column when any series has data", () => {
    const mask = emptyHorizonColumnMask(3, [
      [0, 10, 0],
      [0, 0, 0],
    ])
    expect(mask).toEqual([false, true, false])
  })
})

describe("filterLabeledHorizonPoints", () => {
  it("filters annual chart points without data", () => {
    const points = [
      { period: "2026", revenue: 0, ebitda: 0 },
      { period: "2025", revenue: 0, ebitda: 0 },
      { period: "2024", revenue: 1_200_000, ebitda: 180_000 },
      { period: "2023", revenue: 0, ebitda: 0 },
      { period: "2022", revenue: 0, ebitda: 0 },
    ]

    const filtered = filterLabeledHorizonPoints(points, ["revenue", "ebitda"])
    expect(filtered.map((point) => point.period)).toEqual(["2024"])
  })

  it("returns the original array when only one point remains or fewer", () => {
    const single = [{ period: "2026", value: 0 }]
    expect(filterLabeledHorizonPoints(single, ["value"])).toEqual(single)
  })
})

describe("pickHorizonColumns", () => {
  it("keeps aligned labels and values", () => {
    expect(pickHorizonColumns(["2026", "2025", "2024"], [false, true, false])).toEqual(["2025"])
  })
})
