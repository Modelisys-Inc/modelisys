import { describe, expect, it } from "vitest"
import {
  collectAnnexChildExpandRows,
  collectGlExpandChildren,
  filterExpandChildrenForHorizon,
  mapGlAccountsToExpandChildren,
  resolveSummaryExpandMode,
  summaryExpandModeAllowsExpand,
  summaryRowUsesAnnexExpand,
  structureRowHasFormulaLiaison,
} from "@/lib/balance-sheet-summary-expand"

describe("summaryRowUsesAnnexExpand", () => {
  it("uses explicit showInDetail when present", () => {
    expect(
      summaryRowUsesAnnexExpand({ label: "Clients", showInDetail: true, annexLetter: "A" }),
    ).toBe(true)
    expect(
      summaryRowUsesAnnexExpand({ label: "Clients", showInDetail: false, annexLetter: "A" }),
    ).toBe(false)
  })

  it("does not treat code-mapping alone as annex for expand", () => {
    expect(
      summaryRowUsesAnnexExpand({
        label: "Clients",
        defineMapping: true,
        linkCode: "ACT-A",
        liaisonMode: "sum",
      }),
    ).toBe(false)
  })

  it("falls back to API flags when structure is missing", () => {
    expect(summaryRowUsesAnnexExpand(null, { showInDetail: true })).toBe(true)
    expect(summaryRowUsesAnnexExpand(null, { showInDetail: false, annexLetter: "A" })).toBe(false)
    expect(summaryRowUsesAnnexExpand(null, { annexLetter: "A" })).toBe(true)
  })
})

describe("collectAnnexChildExpandRows", () => {
  const structure = [
    {
      label: "Comptes clients",
      linkCode: "ACT-A",
      annexLetter: "A",
      showInDetail: true,
    },
    {
      label: "Clients courants",
      linkCode: "ACT-A.1",
      detailOnly: true,
      annexLetter: "A",
      showInDetail: true,
    },
    {
      label: "Clients douteux",
      linkCode: "ACT-A.2",
      detailOnly: true,
      annexLetter: "A",
      showInDetail: true,
    },
  ]

  it("returns detailOnly siblings with amounts from API rows", () => {
    const children = collectAnnexChildExpandRows({
      parentStructRow: structure[0]!,
      structure,
      apiRows: [
        { id: "ACT-A", label: "Comptes clients", current: 1000, prior: 900 },
        { id: "ACT-A.1", label: "Clients courants", current: 700, prior: 600, detailOnly: true },
        { id: "ACT-A.2", label: "Clients douteux", current: 300, prior: 300, detailOnly: true },
      ],
    })
    expect(children.map((c) => c.code)).toEqual(["ACT-A.1", "ACT-A.2"])
    expect(children[0]?.amount).toBe(700)
    expect(children[1]?.priorAmount).toBe(300)
  })

  it("inclut CAP-C.1 comme enfant d’expansion sous CAP-C", () => {
    const capStructure = [
      {
        label: "Bénéfices non répartis",
        linkCode: "CAP-C",
        annexLetter: "C",
        showInDetail: true,
      },
      {
        label: "Bénéfice net",
        linkCode: "CAP-C.1",
        detailOnly: true,
        annexLetter: "C",
        showInDetail: true,
        isComputedNetIncome: true,
      },
      {
        label: "Dividendes",
        linkCode: "CAP-C.2",
        detailOnly: true,
        annexLetter: "C",
        showInDetail: true,
      },
    ]
    const children = collectAnnexChildExpandRows({
      parentStructRow: capStructure[0]!,
      structure: capStructure,
      apiRows: [
        { id: "CAP-C.1", label: "Bénéfice net", current: 100, prior: 90, detailOnly: true },
        { id: "CAP-C.2", label: "Dividendes", current: 20, prior: 10, detailOnly: true },
      ],
    })
    expect(children.map((c) => c.code)).toEqual(["CAP-C.1", "CAP-C.2"])
  })

  it("conserve CAP-C.1 dans les enfants même à zéro", () => {
    const filtered = filterExpandChildrenForHorizon(
      [
        { code: "CAP-C.1", label: "Bénéfice net", amount: 0, priorAmount: 0 },
        { code: "CAP-C.2", label: "Dividendes", amount: 0, priorAmount: 0 },
      ],
      "current",
    )
    expect(filtered.map((c) => c.code)).toEqual(["CAP-C.1"])
  })

  it("does not use parent GL detailRows", () => {
    const children = collectAnnexChildExpandRows({
      parentStructRow: structure[0]!,
      structure,
      apiRows: [{ id: "ACT-A", label: "Comptes clients", current: 1000, prior: 900 }],
    })
    expect(children).toHaveLength(2)
    expect(children.every((c) => c.code.startsWith("ACT-A."))).toBe(true)
  })
})

describe("collectGlExpandChildren", () => {
  it("injecte CAP-C.1 sous CAP-C pour que la somme GL = total plié", () => {
    const children = collectGlExpandChildren({
      parentStructRow: { label: "Bénéfices non répartis", linkCode: "CAP-C" },
      balanceAccounts: [
        { accountNumber: "3100", accountName: "BNR début", amount: 300, priorAmount: 200 },
      ],
      apiRows: [
        { id: "CAP-C", label: "Bénéfices non répartis", linkCode: "CAP-C", current: 1500, prior: 1000 },
        { id: "CAP-C.1", label: "Bénéfice net", linkCode: "CAP-C.1", current: 1200, prior: 800 },
      ],
    })
    expect(children.map((c) => c.code)).toEqual(["CAP-C.1", "3100"])
    expect(children.reduce((s, c) => s + c.amount, 0)).toBe(1500)
  })

  it("n’injecte pas CAP-C.1 hors parent CAP-C", () => {
    const children = collectGlExpandChildren({
      parentStructRow: { label: "Encaisse", linkCode: "ACT-C.1" },
      balanceAccounts: [
        { accountNumber: "1000", accountName: "Banque", amount: 50, priorAmount: 40 },
      ],
      apiRows: [
        { id: "CAP-C.1", label: "Bénéfice net", linkCode: "CAP-C.1", current: 1200, prior: 800 },
      ],
    })
    expect(children.map((c) => c.code)).toEqual(["1000"])
  })
})

describe("resolveSummaryExpandMode", () => {
  it("expands GL when annex is off and accounts exist (including a single GL)", () => {
    expect(
      resolveSummaryExpandMode({
        showStructureCols: false,
        isSpacer: false,
        rowId: "ACT-B",
        usesAnnex: false,
        glCount: 1,
        annexChildCount: 0,
      }),
    ).toBe("gl")
  })

  it("expands annex children when annex is on", () => {
    expect(
      resolveSummaryExpandMode({
        showStructureCols: false,
        isSpacer: false,
        rowId: "ACT-A",
        usesAnnex: true,
        glCount: 5,
        annexChildCount: 2,
      }),
    ).toBe("annex")
  })

  it("never expands annex mode into GLs when children are missing", () => {
    expect(
      resolveSummaryExpandMode({
        showStructureCols: false,
        isSpacer: false,
        rowId: "ACT-A",
        usesAnnex: true,
        glCount: 5,
        annexChildCount: 0,
      }),
    ).toBe("none")
  })

  it("blocks expand in structure studio and on spacers", () => {
    expect(
      resolveSummaryExpandMode({
        showStructureCols: true,
        isSpacer: false,
        rowId: "ACT-B",
        usesAnnex: false,
        glCount: 2,
        annexChildCount: 0,
      }),
    ).toBe("none")
    expect(
      resolveSummaryExpandMode({
        showStructureCols: false,
        isSpacer: true,
        rowId: "x",
        usesAnnex: false,
        glCount: 2,
        annexChildCount: 0,
      }),
    ).toBe("none")
  })

  it("blocks expand on subtotals (isResult) and section headers", () => {
    expect(
      resolveSummaryExpandMode({
        showStructureCols: false,
        isSpacer: false,
        rowId: "TOTAL-ACT",
        usesAnnex: false,
        glCount: 4,
        annexChildCount: 0,
        isResult: true,
      }),
    ).toBe("none")
    expect(
      resolveSummaryExpandMode({
        showStructureCols: false,
        isSpacer: false,
        rowId: "ACT-SEC",
        usesAnnex: true,
        glCount: 0,
        annexChildCount: 3,
        isSection: true,
      }),
    ).toBe("none")
  })

  it("blocks expand when liaison is a formula (addition / soustraction / formula[])", () => {
    expect(
      resolveSummaryExpandMode({
        showStructureCols: false,
        isSpacer: false,
        rowId: "SUM-1",
        usesAnnex: false,
        glCount: 3,
        annexChildCount: 0,
        hasFormulaLiaison: true,
      }),
    ).toBe("none")
    expect(
      resolveSummaryExpandMode({
        showStructureCols: false,
        isSpacer: false,
        rowId: "ANNEX-SUM",
        usesAnnex: true,
        glCount: 0,
        annexChildCount: 2,
        hasFormulaLiaison: true,
      }),
    ).toBe("none")
  })
})

describe("structureRowHasFormulaLiaison", () => {
  it("detects formula field and sum/difference modes", () => {
    expect(structureRowHasFormulaLiaison({ formula: ["+ACT-A", "+ACT-B"] })).toBe(true)
    expect(structureRowHasFormulaLiaison({ liaisonMode: "sum", liaisonSumCodes: ["ACT-A"] })).toBe(
      true,
    )
    expect(
      structureRowHasFormulaLiaison({
        liaisonMode: "difference",
        liaisonNumeratorCodes: ["ACT-A"],
        liaisonDenominatorCodes: ["PASS-A"],
      }),
    ).toBe(true)
    expect(structureRowHasFormulaLiaison({ liaisonMode: "single", linkCode: "ACT-A" })).toBe(false)
    expect(structureRowHasFormulaLiaison(null)).toBe(false)
  })
})

describe("filterExpandChildrenForHorizon", () => {
  it("keeps only non-zero GL children for comparison horizon", () => {
    const filtered = filterExpandChildrenForHorizon(
      [
        { code: "1000", label: "Caisse", amount: 100, priorAmount: 0 },
        { code: "1010", label: "Banque", amount: 0, priorAmount: 0 },
        { code: "1020", label: "Dépôt", amount: 0, priorAmount: 50 },
      ],
      "comparison",
    )
    expect(filtered.map((c) => c.code)).toEqual(["1000", "1020"])
  })

  it("hides zero annex link-code children for the horizon", () => {
    const filtered = filterExpandChildrenForHorizon(
      [
        { code: "ACT-C.1", label: "Comptes clients", amount: 596980, priorAmount: 724552 },
        { code: "ACT-C.2", label: "Apprenté", amount: 0, priorAmount: 0 },
        { code: "ACT-C.3", label: "Provision", amount: -8955, priorAmount: -10868 },
        { code: "ACT-C.4", label: "Intérêts", amount: 0, priorAmount: 0 },
        { code: "ACT-C.5", label: "Dépôts", amount: 20000, priorAmount: 20000 },
        { code: "ACT-C.6", label: "Retenues", amount: 0, priorAmount: 0 },
        { code: "ACT-C.7", label: "Taxes", amount: 7515, priorAmount: 9528 },
      ],
      "comparison",
    )
    expect(filtered.map((c) => c.code)).toEqual([
      "ACT-C.1",
      "ACT-C.3",
      "ACT-C.5",
      "ACT-C.7",
    ])
  })

  it("uses trend values for multi-period horizons", () => {
    const filtered = filterExpandChildrenForHorizon(
      [
        { code: "A", label: "A", amount: 0, priorAmount: 0, trendValues: [0, 0, 10] },
        { code: "B", label: "B", amount: 0, priorAmount: 0, trendValues: [0, 0, 0] },
      ],
      "12months",
    )
    expect(filtered.map((c) => c.code)).toEqual(["A"])
  })
})

describe("mapGlAccountsToExpandChildren", () => {
  it("maps GL accounts for non-annex expand", () => {
    expect(
      mapGlAccountsToExpandChildren([
        { accountNumber: "1100", accountName: "Caisse", amount: 50, priorAmount: 40 },
      ]),
    ).toEqual([
      { code: "1100", label: "Caisse", amount: 50, priorAmount: 40 },
    ])
  })
})

describe("summaryExpandModeAllowsExpand", () => {
  it("allows gl and annex only", () => {
    expect(summaryExpandModeAllowsExpand("gl")).toBe(true)
    expect(summaryExpandModeAllowsExpand("annex")).toBe(true)
    expect(summaryExpandModeAllowsExpand("none")).toBe(false)
  })
})
