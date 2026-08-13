import { describe, it, expect } from "vitest"
import {
  renumberAnnexesByAppearance,
  newChargeRow,
  isAnnexLetterInputEditable,
  listAnnexLettersForDetailSubLines,
  listAnnexOptionsForDetailSubLineModal,
  syncIncomeStatementDetailSubLinesFromStandard,
  buildLinkCodeLabelsForChartPicker,
  buildMergedChartPickerLinkData,
  isBaiiaStructureRow,
  normalizeBaiiaStructureRow,
  stripObsoleteIncomeStatementStructureRows,
  isShowInDetail,
  isStructureRowInDetailAnnexEditor,
  findSummaryAnnexOwnerRow,
} from "../income-statement-structure-utils"
import type { StandardLinkCode } from "@/lib/api"

type Row = Record<string, unknown>

describe("renumberAnnexesByAppearance — letters (Résultats)", () => {
  it("numbers annexes by appearance order, not by existing identifier", () => {
    const s: Row[] = [
      { label: "Revenus", showInDetail: true, annexLetter: "Z" },
      { label: "Charges", showInDetail: true, defineMapping: true, annexLetter: "" },
    ]
    const out = renumberAnnexesByAppearance(s, "letter")
    // The stale "Z" appears first → becomes "A"; the blank one → "B".
    expect(out[0]!.annexLetter).toBe("A")
    expect(out[1]!.annexLetter).toBe("B")
  })

  it("assigns the first id from a blank, freshly-toggled row (showInDetail:true, annexLetter:'')", () => {
    const s: Row[] = [{ label: "Revenus", showInDetail: true, defineMapping: true, annexLetter: "" }]
    const out = renumberAnnexesByAppearance(s, "letter")
    expect(out[0]!.annexLetter).toBe("A")
  })

  it("makes an earlier-positioned annexe win over a later one regardless of prior letters", () => {
    // Row 0 enabled-but-blank (appears first), row 1 already lettered "A".
    const s: Row[] = [
      { label: "Revenus", showInDetail: true, defineMapping: true, annexLetter: "" },
      { label: "Autres", showInDetail: true, annexLetter: "A" },
    ]
    const out = renumberAnnexesByAppearance(s, "letter")
    expect(out[0]!.annexLetter).toBe("A")
    expect(out[1]!.annexLetter).toBe("B")
  })

  it("propagates the block id to contiguous detailOnly sub-lines", () => {
    const s: Row[] = [
      { label: "Revenus", showInDetail: true, defineMapping: true, annexLetter: "" },
      { label: "Sous-ligne", detailOnly: true, annexLetter: "OLD" },
      { label: "Charges", showInDetail: true, defineMapping: true, annexLetter: "" },
    ]
    const out = renumberAnnexesByAppearance(s, "letter")
    expect(out[0]!.annexLetter).toBe("A")
    expect(out[1]!.annexLetter).toBe("A") // inherits its parent block
    expect(out[2]!.annexLetter).toBe("B")
  })

  it("keeps hidden detailOnly inside the annex block so following lines keep the letter", () => {
    const s: Row[] = [
      { label: "Coûts des produits vendus", showInDetail: true, defineMapping: true, annexLetter: "B" },
      { label: "Stocks au début", detailOnly: true, hidden: true, annexLetter: "B" },
      { label: "Achats", detailOnly: true, annexLetter: "" },
    ]
    const out = renumberAnnexesByAppearance(s, "letter")
    expect(out[0]!.annexLetter).toBe("A")
    expect(out[1]!.annexLetter).toBe("A")
    expect(out[2]!.annexLetter).toBe("A")
  })

  it("splits legacy non-contiguous rows sharing an id into separate annexes", () => {
    const s: Row[] = [
      { label: "A1", showInDetail: true, annexLetter: "A" },
      { label: "mid", showInDetail: false },
      { label: "A2", showInDetail: true, annexLetter: "A" },
    ]
    const out = renumberAnnexesByAppearance(s, "letter")
    expect(out[0]!.annexLetter).toBe("A")
    expect(out[2]!.annexLetter).toBe("B")
  })

  it("clears the stale letter on an orphan detailOnly row (no contiguous parent block)", () => {
    const s: Row[] = [
      { label: "Orpheline", detailOnly: true, annexLetter: "B" },
      { label: "Revenus", showInDetail: true, defineMapping: true, annexLetter: "" },
    ]
    const out = renumberAnnexesByAppearance(s, "letter")
    expect(out[0]!.annexLetter).toBeUndefined()
    expect(out[1]!.annexLetter).toBe("A")
  })

  it("does not consume ids for empty, hidden, or unchecked rows", () => {
    const s: Row[] = [
      { label: "" }, // spacer
      { label: "Masquée", hidden: true, showInDetail: true, annexLetter: "X" },
      { label: "Non-annexe", showInDetail: false },
      { label: "Real", showInDetail: true, defineMapping: true, annexLetter: "" },
    ]
    const out = renumberAnnexesByAppearance(s, "letter")
    expect(out[1]!.annexLetter).toBeUndefined()
    expect(out[3]!.annexLetter).toBe("A") // first id goes to the only real annexe
  })

  it("skips a showInDetail:true row that is not code-mapping-enabled (no id, no gap)", () => {
    // A row toggled on but without a mapping (e.g. defineMapping:false from imported
    // data) is invisible in the Détail / sub-line pickers; it must not consume an id,
    // otherwise the visible numbering would skip a letter.
    const s: Row[] = [
      { label: "Vrai", showInDetail: true, defineMapping: true, annexLetter: "" },
      { label: "Fantôme", showInDetail: true, defineMapping: false, annexLetter: "" },
      { label: "Vrai2", showInDetail: true, defineMapping: true, annexLetter: "" },
    ]
    const out = renumberAnnexesByAppearance(s, "letter")
    expect(out[0]!.annexLetter).toBe("A")
    expect(out[1]!.annexLetter).toBe("") // phantom untouched, no id
    expect(out[2]!.annexLetter).toBe("B") // no gap — phantom consumed nothing
  })

  it("is a no-op on an empty structure", () => {
    expect(renumberAnnexesByAppearance([], "letter")).toEqual([])
  })

  it("does not mutate the input structure", () => {
    const s: Row[] = [{ label: "Revenus", showInDetail: true, annexLetter: "Z" }]
    const out = renumberAnnexesByAppearance(s, "letter")
    expect(s[0]!.annexLetter).toBe("Z") // original untouched
    expect(out[0]!.annexLetter).toBe("A")
  })
})

describe("renumberAnnexesByAppearance — numbers (Bilan)", () => {
  it("uses sequential numbers in appearance order", () => {
    const s: Row[] = [
      { label: "Encaisse", showInDetail: true, annexLetter: "5" },
      { label: "Clients", showInDetail: true, defineMapping: true, annexLetter: "" },
    ]
    const out = renumberAnnexesByAppearance(s, "number")
    expect(out[0]!.annexLetter).toBe("1")
    expect(out[1]!.annexLetter).toBe("2")
  })
})

describe("newChargeRow", () => {
  it("does not default to an annexe (no annexe by default)", () => {
    const r = newChargeRow()
    expect(r.showInDetail).toBe(false)
    expect(r.annexLetter).toBe("")
  })
})

describe("isAnnexLetterInputEditable", () => {
  it("is read-only for an enabled annexe summary row", () => {
    expect(
      isAnnexLetterInputEditable({
        label: "Revenus",
        showInDetail: true,
        annexLetter: "A",
        defineMapping: true,
      }),
    ).toBe(false)
  })

  it("is read-only for a detailOnly sub-line", () => {
    expect(
      isAnnexLetterInputEditable({ label: "Sous", detailOnly: true, annexLetter: "A" }),
    ).toBe(false)
  })
})

describe("detail annex option ordering", () => {
  it("keeps annex letters in structure appearance order", () => {
    const s: Row[] = [
      { label: "Clients", defineMapping: true, showInDetail: true, annexLetter: "2" },
      { label: "Stocks", defineMapping: true, showInDetail: true, annexLetter: "1" },
      { label: "Sous-ligne", detailOnly: true, defineMapping: true, showInDetail: true, annexLetter: "1" },
    ]

    expect(listAnnexLettersForDetailSubLines(s)).toEqual(["2", "1"])
  })

  it("keeps annex modal options in structure appearance order", () => {
    const s: Row[] = [
      { label: "Autres revenus", defineMapping: true, showInDetail: true, annexLetter: "B" },
      { label: "Produits financiers", defineMapping: true, showInDetail: true, annexLetter: "A" },
    ]

    expect(listAnnexOptionsForDetailSubLineModal(s)).toEqual([
      { letter: "B", title: "Autres revenus" },
      { letter: "A", title: "Produits financiers" },
    ])
  })
})

describe("syncIncomeStatementDetailSubLinesFromStandard", () => {
  const revChart: StandardLinkCode[] = [
    {
      code: "REV-A",
      family: "REV",
      parent_code: null,
      is_leaf: false,
      label_sub_account: "Produits électroniques",
      label_account: null,
      sort_order: 1,
      is_active: true,
      attached_link_codes: [],
    },
    {
      code: "REV-A.1",
      family: "REV",
      parent_code: "REV-A",
      is_leaf: true,
      label_sub_account: "Capteurs",
      label_account: null,
      sort_order: 2,
      is_active: true,
      attached_link_codes: [],
    },
    {
      code: "CMV",
      family: "CMV",
      parent_code: null,
      is_leaf: false,
      label_sub_account: "CMV",
      label_account: null,
      sort_order: 1,
      is_active: true,
      attached_link_codes: [],
    },
    {
      code: "CMV.1",
      family: "CMV",
      parent_code: "CMV",
      is_leaf: true,
      label_sub_account: "Stocks au début",
      label_account: null,
      sort_order: 2,
      is_active: true,
      attached_link_codes: [],
    },
  ]

  it("materializes REV detail sub-lines as grouping parents when summary uses REV", () => {
    const structure: Row[] = [
      {
        label: "Revenus",
        defineMapping: true,
        showInDetail: true,
        annexLetter: "A",
        linkCode: "REV",
        liaisonMode: "single",
      },
      { label: "" },
    ]
    const out = syncIncomeStatementDetailSubLinesFromStandard(structure, revChart)
    const detailRows = out.filter((r) => r.detailOnly)
    expect(detailRows.map((r) => r.linkCode)).toEqual(["REV-A"])
    expect(detailRows[0]!.liaisonMode).toBe("sum")
    expect(detailRows[0]!.liaisonSumCodes).toEqual(["REV-A.1"])
  })

  it("does not duplicate CMV leaves when some detailOnly lost their annex letter", () => {
    const structure: Row[] = [
      {
        id: "owner",
        label: "Coûts des produits vendus",
        defineMapping: true,
        showInDetail: true,
        annexLetter: "B",
        linkCode: "CMV",
        liaisonMode: "single",
      },
      {
        id: "hidden-stock",
        label: "Stocks au début",
        detailOnly: true,
        hidden: true,
        annexLetter: "B",
        linkCode: "CMV.1",
      },
      {
        id: "achats-uuid",
        label: "Achats",
        detailOnly: true,
        annexLetter: "",
        linkCode: "CMV.1",
      },
    ]
    const out = syncIncomeStatementDetailSubLinesFromStandard(structure, revChart)
    const cmvLeaves = out.filter((r) => r.detailOnly)
    expect(cmvLeaves).toHaveLength(1)
    expect(cmvLeaves[0]!.linkCode).toBe("CMV.1")
    expect(cmvLeaves[0]!.annexLetter).toBe("B")
  })

  it("syncs ADM onto the visible ADM owner, not the hidden EXP that shares letter C", () => {
    const chart: StandardLinkCode[] = [
      ...revChart,
      {
        code: "EXP",
        family: "EXP",
        parent_code: null,
        is_leaf: false,
        label_sub_account: "Exploitation",
        label_account: null,
        sort_order: 10,
        is_active: true,
        attached_link_codes: [],
      },
      {
        code: "EXP.1",
        family: "EXP",
        parent_code: "EXP",
        is_leaf: true,
        label_sub_account: "Salaires EXP",
        label_account: null,
        sort_order: 11,
        is_active: true,
        attached_link_codes: [],
      },
      {
        code: "ADM",
        family: "ADM",
        parent_code: null,
        is_leaf: false,
        label_sub_account: "Administration",
        label_account: null,
        sort_order: 20,
        is_active: true,
        attached_link_codes: [],
      },
      {
        code: "ADM.12",
        family: "ADM",
        parent_code: "ADM",
        is_leaf: true,
        label_sub_account: "Honoraires professionnels",
        label_account: null,
        sort_order: 21,
        is_active: true,
        attached_link_codes: [],
      },
    ]
    const structure: Row[] = [
      {
        id: "exp",
        label: "Frais d'exploitation",
        hidden: true,
        showInDetail: false,
        defineMapping: false,
        annexLetter: "C",
        linkCode: "EXP",
      },
      {
        id: "exp1",
        label: "Salaires EXP",
        detailOnly: true,
        hidden: true,
        annexLetter: "C",
        linkCode: "EXP.1",
      },
      {
        id: "adm",
        label: "Frais d'administration",
        defineMapping: true,
        showInDetail: true,
        annexLetter: "C",
        linkCode: "ADM",
      },
      {
        id: "hon",
        label: "Honoraires professionnels",
        detailOnly: true,
        annexLetter: "",
        linkCode: "ADM.12",
      },
    ]
    const out = syncIncomeStatementDetailSubLinesFromStandard(structure, chart)
    expect(out[0]!.id).toBe("exp")
    expect(out[1]!.id).toBe("exp1")
    const admIdx = out.findIndex((r) => r.id === "adm")
    expect(admIdx).toBeGreaterThan(1)
    const admLeaves = out.filter((r) => r.linkCode === "ADM.12")
    expect(admLeaves).toHaveLength(1)
    expect(out[admIdx + 1]!.linkCode).toBe("ADM.12")
    expect(out[admIdx + 1]!.annexLetter).toBe("C")
    expect(isShowInDetail(out[admIdx + 1]!, out)).toBe(true)
    expect(findSummaryAnnexOwnerRow(out, "C")?.id).toBe("adm")
    expect(isStructureRowInDetailAnnexEditor(out[1]!, out, 1)).toBe(false)
    expect(isStructureRowInDetailAnnexEditor(out[admIdx + 1]!, out, admIdx + 1)).toBe(true)
  })
})

describe("buildLinkCodeLabelsForChartPicker", () => {
  it("libellère les parents REV-A / REV-B (mode somme) via structure et charte standard", () => {
    const structure: Row[] = [
      {
        label: "Revenus",
        defineMapping: true,
        showInDetail: true,
        annexLetter: "A",
        linkCode: "REV",
        liaisonMode: "single",
      },
      {
        label: "Produits électroniques",
        detailOnly: true,
        annexLetter: "A",
        linkCode: "REV-A",
        liaisonMode: "sum",
        liaisonSumCodes: ["REV-A.1"],
      },
      {
        label: "Services",
        detailOnly: true,
        annexLetter: "A",
        linkCode: "REV-B",
        liaisonMode: "sum",
        liaisonSumCodes: ["REV-B.1"],
      },
    ]
    const standardLabels = new Map<string, string>([
      ["REV-A", "Produits électroniques (MO)"],
      ["REV-B", "Services (MO)"],
      ["REV-A.1", "Capteurs"],
    ])

    const labels = buildLinkCodeLabelsForChartPicker(structure, standardLabels)

    expect(labels.get("REV-A")).toBe("Produits électroniques")
    expect(labels.get("REV-B")).toBe("Services")
    expect(labels.get("REV-A.1")).toBe("Produits électroniques")
    expect(labels.get("REV")).toBe("Revenus")
  })

  it("ne propage pas le libellé d'un poste N−D vers les codes référencés", () => {
    const structure: Row[] = [
      {
        label: "Ventes nettes",
        defineMapping: true,
        linkCode: "REV.1",
        liaisonMode: "single",
      },
      {
        label: "Bénéfice net",
        defineMapping: true,
        linkCode: "BN",
        liaisonMode: "difference",
        liaisonNumeratorCodes: ["REV.1", "REV.2"],
        liaisonDenominatorCodes: ["CHG.1"],
      },
    ]
    const labels = buildLinkCodeLabelsForChartPicker(structure)
    expect(labels.get("REV.1")).toBe("Ventes nettes")
    expect(labels.get("BN")).toBe("Bénéfice net")
    expect(labels.get("REV.2")).toBeUndefined()
  })
})

describe("buildMergedChartPickerLinkData", () => {
  it("fusionne CR et bilan en priorisant les libellés du compte de résultat", () => {
    const income: Row[] = [
      {
        label: "Ventes",
        defineMapping: true,
        linkCode: "REV.1",
        liaisonMode: "single",
      },
    ]
    const balance: Row[] = [
      {
        label: "Bénéfice net",
        defineMapping: true,
        linkCode: "CAP",
        liaisonMode: "difference",
        liaisonNumeratorCodes: ["REV.1"],
        liaisonDenominatorCodes: ["ACT"],
      },
      {
        label: "Actif court terme",
        defineMapping: true,
        linkCode: "ACT",
        liaisonMode: "single",
      },
    ]
    const merged = buildMergedChartPickerLinkData([income, balance])
    expect(merged.codes).toContain("REV.1")
    expect(merged.codes).toContain("ACT")
    expect(merged.labels.get("REV.1")).toBe("Ventes")
    expect(merged.labels.get("ACT")).toBe("Actif court terme")
  })
})

describe("BAIIA — calcul automatique (sans Code / Liaison)", () => {
  it("detects BAIIA by isEBITA or label", () => {
    expect(isBaiiaStructureRow({ label: "BAIIA", isEBITA: true })).toBe(true)
    expect(isBaiiaStructureRow({ label: "baiia" })).toBe(true)
    expect(isBaiiaStructureRow({ label: "Bénéfice net" })).toBe(false)
  })

  it("strips Code, Liaison and Annexe on normalize", () => {
    const out = normalizeBaiiaStructureRow({
      label: "BAIIA",
      defineMapping: true,
      formula: "NI - D9",
      linkCode: "X",
      liaisonMode: "difference",
      liaisonNumeratorCodes: ["NI"],
      liaisonDenominatorCodes: ["D9"],
      showInDetail: true,
      annexLetter: "A",
      posteNature: "revenus",
      separatorAbove: true,
    })
    expect(out.isEBITA).toBe(true)
    expect(out.defineMapping).toBe(false)
    expect(out.showInDetail).toBe(false)
    expect(out.formula).toBeUndefined()
    expect(out.linkCode).toBeUndefined()
    expect(out.liaisonMode).toBeUndefined()
    expect(out.annexLetter).toBeUndefined()
    expect(out.separatorAbove).toBe(true)
  })

  it("stripObsolete normalizes BAIIA rows in structure", () => {
    const out = stripObsoleteIncomeStatementStructureRows([
      {
        label: "BAIIA",
        isEBITA: true,
        defineMapping: true,
        formula: "NI - D9",
        annexLetter: "A",
      },
    ])
    expect(out).toHaveLength(1)
    expect(out[0]!.defineMapping).toBe(false)
    expect(out[0]!.formula).toBeUndefined()
    expect(out[0]!.annexLetter).toBeUndefined()
  })
})
