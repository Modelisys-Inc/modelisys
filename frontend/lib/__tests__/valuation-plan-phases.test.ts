import { describe, expect, it } from "vitest"
import {
  getValuationPlanStepStatus,
  normalizeCompletedPlanSteps,
  normalizeValuationPlanStepId,
  resolveActiveValuationPlanPhaseId,
  valuationPlanOverallProgressPercent,
  valuationPlanPhaseLabels,
  valuationPlanProgressPercent,
  valuationPlanStepCounter,
} from "@/lib/valuation-plan-phases"

describe("valuation-plan-phases", () => {
  it("lists phases in the expected order", () => {
    expect(valuationPlanPhaseLabels()).toBe(
      "Aperçu de l'entreprise → Modèle d'affaires → Valeur comptable ajustée → BAIIA ajusté → Multiplicateur → Capitalisation → Actualisation",
    )
  })

  it("maps legacy ebitda-multiple step id to multiplicateur", () => {
    expect(normalizeValuationPlanStepId("ebitda-multiple")).toBe("multiplicateur")
    expect(normalizeCompletedPlanSteps(["ebitda-multiple", "business-model"])).toEqual([
      "business-model",
      "multiplicateur",
    ])
  })

  it("resolves the first incomplete phase as active", () => {
    expect(resolveActiveValuationPlanPhaseId([])).toBe("company-overview")
    expect(resolveActiveValuationPlanPhaseId(["company-overview"])).toBe("business-model")
    expect(
      resolveActiveValuationPlanPhaseId([
        "company-overview",
        "business-model",
        "net-tangible-assets",
        "adjusted-ebitda",
        "capitalisation",
        "multiplicateur",
        "dcf",
      ]),
    ).toBe("dcf")
  })

  it("assigns step status for completed, in progress and pending", () => {
    expect(getValuationPlanStepStatus("company-overview", ["company-overview"])).toBe("completed")
    expect(getValuationPlanStepStatus("business-model", ["company-overview"])).toBe("in_progress")
    expect(getValuationPlanStepStatus("dcf", ["company-overview"])).toBe("pending")
    expect(
      getValuationPlanStepStatus("dcf", [
        "company-overview",
        "business-model",
        "net-tangible-assets",
        "adjusted-ebitda",
        "capitalisation",
        "multiplicateur",
        "dcf",
      ]),
    ).toBe("completed")
  })

  it("computes overall progress", () => {
    expect(valuationPlanOverallProgressPercent([])).toBe(0)
    expect(valuationPlanOverallProgressPercent(["company-overview"])).toBe(14)
    expect(
      valuationPlanOverallProgressPercent([
        "company-overview",
        "business-model",
        "net-tangible-assets",
        "adjusted-ebitda",
        "capitalisation",
        "multiplicateur",
        "dcf",
      ]),
    ).toBe(100)
    expect(valuationPlanStepCounter([], "company-overview")).toBe("01/07")
    expect(valuationPlanProgressPercent([], "adjusted-ebitda")).toBe(50)
    expect(valuationPlanProgressPercent([], "capitalisation")).toBe(64)
    expect(valuationPlanProgressPercent([], "multiplicateur")).toBe(78)
  })
})
