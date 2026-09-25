import { describe, expect, it } from "vitest"
import { formatShareOfRevenuePct } from "@/lib/financial-utils"

describe("formatShareOfRevenuePct", () => {
  it("returns the expense share of revenue as an absolute percent", () => {
    expect(formatShareOfRevenuePct(-80_000, 500_000)).toBe("16.0%")
    expect(formatShareOfRevenuePct(80_000, 500_000)).toBe("16.0%")
  })

  it("returns a dash when revenue or amount is missing", () => {
    expect(formatShareOfRevenuePct(-80_000, 0)).toBe("-")
    expect(formatShareOfRevenuePct(-80_000, null)).toBe("-")
    expect(formatShareOfRevenuePct(0, 500_000)).toBe("-")
  })

  it("can omit the percent sign for compact table columns", () => {
    expect(formatShareOfRevenuePct(80_000, 500_000, { omitPercentSign: true })).toBe("16.0")
  })
})
