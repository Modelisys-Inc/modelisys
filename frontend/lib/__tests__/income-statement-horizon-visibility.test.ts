import { describe, it, expect } from "vitest"
import { rowHasNonZeroAmountsForHorizon } from "@/lib/income-statement-horizon-visibility"

describe("rowHasNonZeroAmountsForHorizon comparison", () => {
  it("considère non vide si courant ou passé a un montant", () => {
    expect(rowHasNonZeroAmountsForHorizon({ current: 0, prior: 50 }, "comparison")).toBe(true)
    expect(rowHasNonZeroAmountsForHorizon({ current: 0, prior: 0 }, "comparison")).toBe(false)
  })
})
