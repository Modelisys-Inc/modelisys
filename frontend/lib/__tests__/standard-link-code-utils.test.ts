import { describe, it, expect } from "vitest"
import type { StandardLinkCode } from "@/lib/api"
import {
  capexLinkCodeOptions,
  filterAssignableMappingLinkCodes,
  getDetailSubLineCodesFromStandardLinkCode,
  workingCapitalLinkCodeOptions,
  getLeafDescendantsOfStandardLinkCode,
  detailSubLineLiaisonFromStandardTarget,
  isMappingLiabilityTermLinkCode,
  isMappingRestrictedLinkCode,
  mappingParentCodeFromLinkCode,
  sanitizeMappingLiabilityTermFields,
  showsMappingCostTypeOptions,
  showsMappingLiabilityTermOptions,
  showsMappingAltAssetTypeOptions,
  mappingAltAssetTypeLabel,
  sanitizeMappingAltAssetFields,
  isMappingAltAssetTypeUnset,
  resolveLinkCodeDtCt,
  linkCodeDtCtDisplay,
  defaultDtCtForFamily,
  linkCodeDtCtSignMultiplier,
} from "../standard-link-code-utils"

function code(
  partial: Pick<StandardLinkCode, "code" | "family" | "is_leaf"> &
    Partial<StandardLinkCode>,
): StandardLinkCode {
  return {
    parent_code: null,
    label_account: null,
    label_sub_account: partial.code,
    sort_order: 0,
    is_active: true,
    attached_link_codes: [],
    ...partial,
  }
}

describe("getLeafDescendantsOfStandardLinkCode", () => {
  const chart: StandardLinkCode[] = [
    code({ code: "CMV", family: "CMV", is_leaf: false }),
    code({ code: "CMV.1", family: "CMV", parent_code: "CMV", is_leaf: true }),
    code({ code: "CMV.2", family: "CMV", parent_code: "CMV", is_leaf: true }),
    code({ code: "REV-A", family: "REV", is_leaf: false }),
    code({ code: "REV-A.1", family: "REV", parent_code: "REV-A", is_leaf: true }),
    code({ code: "REV-A.2", family: "REV", parent_code: "REV-A", is_leaf: true }),
    code({ code: "REV-B", family: "REV", is_leaf: false }),
    code({ code: "REV-B.1", family: "REV", parent_code: "REV-B", is_leaf: true }),
  ]

  it("walks descendants when the parent code exists (CMV)", () => {
    const leaves = getLeafDescendantsOfStandardLinkCode("CMV", chart)
    expect(leaves.map((c) => c.code)).toEqual(["CMV.1", "CMV.2"])
  })

  it("walks descendants for a mid-tree parent (REV-A)", () => {
    const leaves = getLeafDescendantsOfStandardLinkCode("REV-A", chart)
    expect(leaves.map((c) => c.code)).toEqual(["REV-A.1", "REV-A.2"])
  })

  it("falls back to all family leaves when parent is a family anchor without a node (ACT)", () => {
    const actChart = [
      code({ code: "ACT-A", family: "ACT", is_leaf: false }),
      code({ code: "ACT-A.1", family: "ACT", parent_code: "ACT-A", is_leaf: true }),
    ]
    const leaves = getLeafDescendantsOfStandardLinkCode("ACT", actChart)
    expect(leaves.map((c) => c.code)).toEqual(["ACT-A.1"])
  })

  it("returns REV grouping parents for family anchor REV", () => {
    const targets = getDetailSubLineCodesFromStandardLinkCode("REV", chart)
    expect(targets.map((c) => c.code)).toEqual(["REV-A", "REV-B"])
  })

  it("rolls up parent targets via sum of descendant leaves", () => {
    const parent = chart.find((c) => c.code === "REV-A")!
    expect(detailSubLineLiaisonFromStandardTarget(parent, chart)).toEqual({
      linkCode: "REV-A",
      liaisonMode: "sum",
      liaisonSumCodes: ["REV-A.1", "REV-A.2"],
    })
  })
})

describe("mappingParentCodeFromLinkCode", () => {
  const lookup = new Map(
    [
      code({ code: "ACT-A", family: "ACT", is_leaf: false }),
      code({ code: "ACT-A.1", family: "ACT", parent_code: "ACT-A", is_leaf: true }),
      code({ code: "REV-A", family: "REV", is_leaf: false }),
    ].map((c) => [c.code, c]),
  )

  it("returns parent code from chart row", () => {
    expect(mappingParentCodeFromLinkCode("ACT-A.1", lookup)).toBe("ACT-A")
  })

  it("returns em dash when code has no parent", () => {
    expect(mappingParentCodeFromLinkCode("REV-A", lookup)).toBe("—")
  })

  it("returns em dash when link code is missing or unknown", () => {
    expect(mappingParentCodeFromLinkCode(undefined, lookup)).toBe("—")
    expect(mappingParentCodeFromLinkCode("UNKNOWN", lookup)).toBe("—")
  })
})

describe("mapping restrictions", () => {
  const chart: StandardLinkCode[] = [
    code({ code: "CMV.1", family: "CMV", is_leaf: true }),
    code({ code: "CMV.11", family: "CMV", is_leaf: true }),
    code({ code: "EXP.20", family: "EXP", is_leaf: true }),
    code({ code: "ADM.21", family: "ADM", is_leaf: true }),
    code({ code: "AUT.1", family: "AUT", is_leaf: true }),
    code({ code: "FIN.1", family: "FIN", is_leaf: true }),
  ]
  const lookup = new Map(chart.map((c) => [c.code, c]))

  it("flags restricted codes and AUT family", () => {
    expect(isMappingRestrictedLinkCode("CMV.11", lookup)).toBe(true)
    expect(isMappingRestrictedLinkCode("EXP.20", lookup)).toBe(true)
    expect(isMappingRestrictedLinkCode("ADM.21", lookup)).toBe(true)
    expect(isMappingRestrictedLinkCode("AUT.1", lookup)).toBe(true)
    expect(isMappingRestrictedLinkCode("CMV.1", lookup)).toBe(false)
  })

  it("excludes restricted codes from assignable mapping picker", () => {
    const assignable = filterAssignableMappingLinkCodes(chart)
    expect(assignable.map((c) => c.code)).toEqual(["CMV.1", "FIN.1"])
  })
})

describe("showsMappingCostTypeOptions", () => {
  const lookup = new Map<string, StandardLinkCode>([
    ["CMV.1", code({ code: "CMV.1", family: "CMV", is_leaf: true })],
    ["CMV.11", code({ code: "CMV.11", family: "CMV", is_leaf: true })],
    ["EXP.20", code({ code: "EXP.20", family: "EXP", is_leaf: true })],
    ["AUT.1", code({ code: "AUT.1", family: "AUT", is_leaf: true })],
    ["REV-A.1", code({ code: "REV-A.1", family: "REV", is_leaf: true })],
    ["IMP.1", code({ code: "IMP.1", family: "IMP", is_leaf: true })],
    ["FIN.1", code({ code: "FIN.1", family: "FIN", is_leaf: true })],
    ["FIN.2", code({ code: "FIN.2", family: "FIN", is_leaf: true })],
  ])

  it("allows CMV.1 and FIN.1", () => {
    expect(showsMappingCostTypeOptions("CMV.1", lookup)).toBe(true)
    expect(showsMappingCostTypeOptions("FIN.1", lookup)).toBe(true)
  })

  it("excludes REV, IMP, restricted codes, AUT, and other FIN codes", () => {
    expect(showsMappingCostTypeOptions("REV-A.1", lookup)).toBe(false)
    expect(showsMappingCostTypeOptions("IMP.1", lookup)).toBe(false)
    expect(showsMappingCostTypeOptions("FIN.2", lookup)).toBe(false)
    expect(showsMappingCostTypeOptions("CMV.11", lookup)).toBe(false)
    expect(showsMappingCostTypeOptions("EXP.20", lookup)).toBe(false)
    expect(showsMappingCostTypeOptions("AUT.1", lookup)).toBe(false)
  })
})

describe("mapping liability term options", () => {
  it("matches PLT-B/G/C/D roots and descendants", () => {
    expect(isMappingLiabilityTermLinkCode("PLT-B")).toBe(true)
    expect(isMappingLiabilityTermLinkCode("PLT-B.1")).toBe(true)
    expect(isMappingLiabilityTermLinkCode("PLT-G.2")).toBe(true)
    expect(isMappingLiabilityTermLinkCode("PLT-C.1")).toBe(true)
    expect(isMappingLiabilityTermLinkCode("PLT-D.3")).toBe(true)
    expect(isMappingLiabilityTermLinkCode("PLT-A.1")).toBe(false)
    expect(isMappingLiabilityTermLinkCode("ACT-A.1")).toBe(false)
  })

  it("shows options only for eligible codes and clears fields on sanitize", () => {
    expect(showsMappingLiabilityTermOptions("PLT-B.1")).toBe(true)
    expect(showsMappingLiabilityTermOptions("CMV.1")).toBe(false)

    expect(
      sanitizeMappingLiabilityTermFields({
        linkCode: "PLT-B.1",
        liabilityRemainingYears: 5,
        liabilityInterestRate: 4.5,
      }),
    ).toEqual({
      linkCode: "PLT-B.1",
      liabilityRemainingYears: 5,
      liabilityInterestRate: 4.5,
    })

    expect(
      sanitizeMappingLiabilityTermFields({
        linkCode: "CMV.1",
        liabilityRemainingYears: 5,
        liabilityInterestRate: 4.5,
      }),
    ).toEqual({
      linkCode: "CMV.1",
      liabilityRemainingYears: undefined,
      liabilityInterestRate: undefined,
    })
  })
})

describe("mapping alt asset type options", () => {
  it("matches ALT-B/C/D roots and descendants", () => {
    expect(showsMappingAltAssetTypeOptions("ALT-B")).toBe(true)
    expect(showsMappingAltAssetTypeOptions("ALT-B.1")).toBe(true)
    expect(showsMappingAltAssetTypeOptions("ALT-C.2")).toBe(true)
    expect(showsMappingAltAssetTypeOptions("ALT-D.3")).toBe(true)
    expect(showsMappingAltAssetTypeOptions("ALT-A.1")).toBe(false)
    expect(showsMappingAltAssetTypeOptions("CMV.1")).toBe(false)
  })

  it("labels cost vs accumulated and detects unset", () => {
    expect(
      mappingAltAssetTypeLabel({
        linkCode: "ALT-B.1",
        altAssetCost: true,
        altAccumulatedAmortization: false,
      }),
    ).toBe("cost")
    expect(
      mappingAltAssetTypeLabel({
        linkCode: "ALT-C.1",
        altAssetCost: false,
        altAccumulatedAmortization: true,
      }),
    ).toBe("accumulated")
    expect(
      isMappingAltAssetTypeUnset({
        linkCode: "ALT-D.1",
        altAssetCost: false,
        altAccumulatedAmortization: false,
      }),
    ).toBe(true)
  })

  it("clears alt fields when link code is not capex projection", () => {
    expect(
      sanitizeMappingAltAssetFields({
        linkCode: "CMV.1",
        altAssetCost: true,
        altAccumulatedAmortization: false,
      }),
    ).toEqual({
      linkCode: "CMV.1",
      altAssetCost: false,
      altAccumulatedAmortization: false,
    })
  })
})

describe("resolveLinkCodeDtCt", () => {
  it("applies family defaults for bilan and compte de résultat", () => {
    expect(resolveLinkCodeDtCt(code({ code: "ACT-A.1", family: "ACT", is_leaf: true }))).toBe("DT")
    expect(resolveLinkCodeDtCt(code({ code: "ALT-B.1", family: "ALT", is_leaf: true }))).toBe("DT")
    expect(resolveLinkCodeDtCt(code({ code: "PCT-A.1", family: "PCT", is_leaf: true }))).toBe("CT")
    expect(resolveLinkCodeDtCt(code({ code: "PLT-B.1", family: "PLT", is_leaf: true }))).toBe("CT")
    expect(resolveLinkCodeDtCt(code({ code: "CAP-A", family: "CAP", is_leaf: false }))).toBe("CT")
    expect(resolveLinkCodeDtCt(code({ code: "REV-A.1", family: "REV", is_leaf: true }))).toBe("CT")
    expect(resolveLinkCodeDtCt(code({ code: "CMV.1", family: "CMV", is_leaf: true }))).toBe("DT")
    expect(resolveLinkCodeDtCt(code({ code: "EXP.1", family: "EXP", is_leaf: true }))).toBe("DT")
    expect(resolveLinkCodeDtCt(code({ code: "ADM.1", family: "ADM", is_leaf: true }))).toBe("DT")
    expect(resolveLinkCodeDtCt(code({ code: "VNT.1", family: "VNT", is_leaf: true }))).toBe("DT")
    expect(resolveLinkCodeDtCt(code({ code: "AUT.1", family: "AUT", is_leaf: true }))).toBe("DT")
    expect(resolveLinkCodeDtCt(code({ code: "IMP.1", family: "IMP", is_leaf: true }))).toBe("DT")
  })

  it("returns undefined for trésorerie families", () => {
    expect(defaultDtCtForFamily("TEX")).toBeUndefined()
    expect(linkCodeDtCtDisplay(code({ code: "TEX-1", family: "TEX", is_leaf: false }))).toBe("—")
  })

  it("returns sign multiplier for CT families", () => {
    expect(linkCodeDtCtSignMultiplier("REV-A.1")).toBe(-1)
    expect(linkCodeDtCtSignMultiplier("PCT-A.1")).toBe(-1)
    expect(linkCodeDtCtSignMultiplier("ACT-A.1")).toBe(1)
    expect(linkCodeDtCtSignMultiplier("EXP.1")).toBe(1)
  })
})

describe("capexLinkCodeOptions", () => {
  const chart: StandardLinkCode[] = [
    code({ code: "ALT-B", family: "ALT", is_leaf: true }),
    code({ code: "CMV", family: "CMV", is_leaf: false }),
    code({
      code: "CMV.1",
      family: "CMV",
      parent_code: "CMV",
      is_leaf: true,
      label_sub_account: "Achats",
    }),
    code({ code: "TEX-A", family: "TEX", is_leaf: true }),
  ]

  it("includes Compte de résultat leaves such as CMV.1, unlike FDR parents-only", () => {
    const wc = workingCapitalLinkCodeOptions(chart)
    expect(wc.codes).toContain("CMV")
    expect(wc.codes).not.toContain("CMV.1")
    expect(wc.codes).not.toContain("ALT-B")

    const capex = capexLinkCodeOptions(chart)
    expect(capex.codes).toContain("CMV")
    expect(capex.codes).toContain("CMV.1")
    expect(capex.codes).toContain("ALT-B")
    expect(capex.codes).toContain("REV")
    expect(capex.codes).not.toContain("TEX-A")
    expect(capex.labels.get("CMV.1")).toBe("Achats")
  })
})
