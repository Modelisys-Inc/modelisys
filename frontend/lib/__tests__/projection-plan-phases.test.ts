import { describe, expect, it } from "vitest"
import {
  PROJECTION_PLAN_PHASE_IDS,
  getProjectionPlanStepStatus,
  normalizeCompletedProjectionPlanSteps,
  projectionPlanOverallProgressPercent,
  resolveActiveProjectionPlanPhaseId,
} from "@/lib/projection-plan-phases"

describe("projection-plan-phases", () => {
  it("orders six hypothesis steps", () => {
    expect(PROJECTION_PLAN_PHASE_IDS).toEqual([
      "revenue",
      "expenses",
      "capex",
      "debt",
      "taxes",
      "bilan",
    ])
  })

  it("resolves active and progress from completed steps", () => {
    expect(resolveActiveProjectionPlanPhaseId([])).toBe("revenue")
    expect(resolveActiveProjectionPlanPhaseId(["revenue", "expenses"])).toBe("capex")
    expect(getProjectionPlanStepStatus("revenue", ["revenue"])).toBe("completed")
    expect(getProjectionPlanStepStatus("expenses", ["revenue"])).toBe("in_progress")
    expect(getProjectionPlanStepStatus("capex", ["revenue"])).toBe("pending")
    expect(projectionPlanOverallProgressPercent(["revenue", "expenses", "capex"])).toBe(50)
  })

  it("normalizes completed steps and drops unknowns", () => {
    expect(
      normalizeCompletedProjectionPlanSteps(["revenue", "nope", "bilan", "revenue"]),
    ).toEqual(["revenue", "bilan"])
  })
})
