import { describe, expect, it } from "vitest"
import {
  buildReturnWaterfall,
  computeReturnNarrative,
  computeReturnProjection,
  formatPercentFr,
  RETURN_DRIVER_BREAKDOWN,
  returnDriverBreakdownTotal,
  returnProjectionBreakdownTotal,
} from "@/lib/landing-business-return"

describe("landing-business-return", () => {
  it("total return equals value growth plus distributions on base amount", () => {
    const n = computeReturnNarrative()
    expect(n.valueGrowthPct + n.distributionsPct).toBeCloseTo(n.totalReturnPct, 4)
  })

  it("realized waterfall add steps sum to end wealth", () => {
    const narrative = computeReturnNarrative()
    const { steps } = buildReturnWaterfall()
    const projectedIdx = steps.findIndex((s) => s.kind === "section" && s.variant === "projected")
    const realizedSteps = steps.slice(0, projectedIdx).filter((s) => s.kind !== "section")
    const start = realizedSteps.find((step) => step.kind === "anchor")!
    const adds = realizedSteps.filter((step) => step.kind === "add")
    const total = realizedSteps.find((step) => step.kind === "total")!

    const sumAdds = adds.reduce((acc, step) => acc + step.amountM, 0)
    expect(start.amountM + sumAdds).toBeCloseTo(total!.amountM, 4)
    expect(total!.amountM).toBeCloseTo(narrative.endWealthM, 4)
  })

  it("projected waterfall add steps sum to projected end wealth", () => {
    const projected = computeReturnProjection()
    const { steps } = buildReturnWaterfall()
    const projectedStartIdx = steps.findIndex((s) => s.kind === "section" && s.variant === "projected")
    const projectedSteps = steps.slice(projectedStartIdx).filter((s) => s.kind !== "section")

    const start = projectedSteps.find((step) => step.kind === "anchor")!
    const adds = projectedSteps.filter((step) => step.kind === "add")
    const total = projectedSteps.find((step) => step.kind === "total")!

    const sumAdds = adds.reduce((acc, step) => acc + step.amountM, 0)
    expect(start.amountM + sumAdds).toBeCloseTo(total!.amountM, 4)
    expect(total!.amountM).toBeCloseTo(projected.endWealthM, 4)
  })

  it("driver breakdown sums to annualized return", () => {
    const n = computeReturnNarrative()
    const p = computeReturnProjection()
    expect(returnDriverBreakdownTotal()).toBeCloseTo(n.annualizedCagrPct, 1)
    expect(returnProjectionBreakdownTotal()).toBeCloseTo(p.annualizedCagrPct, 1)
    expect(formatPercentFr(n.totalReturnPct, 0)).toBe("+134 %")
    expect(RETURN_DRIVER_BREAKDOWN).toHaveLength(5)
  })
})
