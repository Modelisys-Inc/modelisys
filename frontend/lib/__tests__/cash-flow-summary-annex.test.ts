import { describe, expect, it } from "vitest"
import {
  isCashFlowSummaryOnlySpacer,
  isShowInSummary,
  listStructureRowsForCashFlowSummary,
  listStructureRowsForCashFlowSummaryPresentation,
  listStructureRowsForPresentationDisplay,
  newEmptySpacerCashFlowSummaryRow,
  resolveCashFlowSummaryRowPresentation,
} from "@/lib/income-statement-structure-utils"

describe("cash-flow summary annex (showInSummary)", () => {
  it("is false by default and true when explicitly checked", () => {
    expect(isShowInSummary({ label: "Exploitation" })).toBe(false)
    expect(isShowInSummary({ label: "Exploitation", showInSummary: false })).toBe(false)
    expect(isShowInSummary({ label: "Exploitation", showInSummary: true })).toBe(true)
    expect(isShowInSummary({ label: "", showInSummary: true })).toBe(false)
    expect(isShowInSummary({ label: "X", hidden: true, showInSummary: true })).toBe(false)
  })

  it("lists only annexed non-empty detail rows in structure order", () => {
    const structure = [
      { id: "1", label: "Section", isSection: true },
      { id: "2", label: "Flux exploitation", showInSummary: true, linkCode: "TEX-A" },
      { id: "3", label: "" },
      { id: "4", label: "Flux investissement", showInSummary: false, linkCode: "TIN-A" },
      { id: "5", label: "Variation nette", showInSummary: true, isResult: true },
    ]
    expect(listStructureRowsForCashFlowSummary(structure).map((r) => r.id)).toEqual(["2", "5"])
  })

  it("includes summaryOnly spacers between annexes for presentation", () => {
    const spacer = { ...newEmptySpacerCashFlowSummaryRow(), id: "sp1" }
    const structure = [
      { id: "2", label: "Flux exploitation", showInSummary: true },
      spacer,
      { id: "3", label: "" },
      { id: "5", label: "Variation nette", showInSummary: true },
    ]
    expect(listStructureRowsForCashFlowSummaryPresentation(structure).map((r) => r.id)).toEqual([
      "2",
      "sp1",
      "5",
    ])
    expect(listStructureRowsForPresentationDisplay(structure).map((r) => r.id)).toEqual([
      "2",
      "3",
      "5",
    ])
    expect(isCashFlowSummaryOnlySpacer(spacer)).toBe(true)
    expect(isCashFlowSummaryOnlySpacer({ id: "3", label: "" })).toBe(false)
  })

  it("resolves summary presentation overlay without changing detail defaults", () => {
    const row = {
      label: "Flux",
      isBold: true,
      indent: false,
      separatorAbove: true,
      summaryIsBold: false,
      summaryIndent: true,
      summarySeparatorAbove: false,
    }
    expect(resolveCashFlowSummaryRowPresentation(row)).toEqual({
      isBold: false,
      indent: true,
      separatorAbove: false,
    })
    expect(resolveCashFlowSummaryRowPresentation({ label: "Flux", isBold: true })).toEqual({
      isBold: true,
      indent: false,
      separatorAbove: false,
    })
  })
})
