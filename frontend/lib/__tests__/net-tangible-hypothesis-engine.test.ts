import { describe, expect, it } from "vitest"
import {
  computeNetTangibleBuildup,
  dollarAmountToLeafInput,
  leafInputToDollarAmount,
  materialityHint,
} from "@/lib/net-tangible-hypothesis-engine"

describe("net-tangible-hypothesis-engine", () => {
  it("buildup VC → VCA → ACN", () => {
    expect(
      computeNetTangibleBuildup({
        vc: 100_000,
        adjustments: 20_000,
        debts: 5_000,
        assets: 3_000,
      }),
    ).toEqual({
      vc: 100_000,
      adjustments: 20_000,
      vca: 120_000,
      debts: 5_000,
      assets: 3_000,
      acn: 112_000,
    })
  })

  it("converts percent-vc and fair-value modes", () => {
    expect(
      leafInputToDollarAmount({ mode: "percent-vc", input: 10, bookValue: 200_000 }),
    ).toBe(20_000)
    expect(
      leafInputToDollarAmount({ mode: "fair-value", input: 250_000, bookValue: 200_000 }),
    ).toBe(50_000)
    expect(
      dollarAmountToLeafInput({ mode: "fair-value", dollar: 50_000, bookValue: 200_000 }),
    ).toBe(250_000)
  })

  it("flags material gaps vs VC", () => {
    expect(materialityHint(4_000, 100_000)).toBeNull()
    expect(materialityHint(6_000, 100_000)).toMatch(/6\.0 %/)
  })
})
