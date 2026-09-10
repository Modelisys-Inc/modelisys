import { describe, expect, it } from "vitest"
import {
  annexGroupShouldShowSubtotal,
  listAnnexDetailSeriesIdsForOwner,
  omitAnnexTitleRowsWithoutAmountPosts,
  resolveDetailAnnexMeta,
  uniqueStatementRowsByStructureIndex,
} from "@/lib/income-statement-annex-detail"

const structure: Record<string, unknown>[] = [
  {
    id: "rev-a",
    label: "Revenus annexés",
    annexLetter: "A",
    detailOnly: false,
    defineMapping: true,
    showInDetail: true,
    linkCode: "REV",
  },
  {
    id: "rev-a-1",
    label: "Ventes détail",
    annexLetter: "A",
    detailOnly: true,
    defineMapping: true,
    showInDetail: true,
    linkCode: "REV-A.1",
  },
  {
    id: "rev-solo",
    label: "Poste seul",
    annexLetter: "B",
    detailOnly: false,
    defineMapping: true,
    showInDetail: true,
    linkCode: "AUT",
  },
]

describe("listAnnexDetailSeriesIdsForOwner", () => {
  it("lists detailOnly posts under an annex owner (Sous-total Annexe)", () => {
    expect(
      listAnnexDetailSeriesIdsForOwner(
        { id: "rev-a", label: "Revenus annexés" },
        [
          { id: "rev-a", label: "Revenus annexés" },
          { id: "rev-a-1", label: "Ventes détail" },
        ],
        structure,
      ),
    ).toEqual(["rev-a-1"])
  })

  it("returns empty when the owner has no detailOnly children", () => {
    expect(
      listAnnexDetailSeriesIdsForOwner(
        { id: "rev-solo", label: "Poste seul" },
        [{ id: "rev-solo", label: "Poste seul" }],
        structure,
      ),
    ).toEqual([])
  })

  it("includes Capex amort detailOnly posts (ADM.20) in annex owner rollup", () => {
    const withAmort: Record<string, unknown>[] = [
      {
        id: "adm",
        label: "Frais d'administration",
        annexLetter: "D",
        detailOnly: false,
        defineMapping: true,
        showInDetail: true,
        linkCode: "ADM",
      },
      {
        id: "ADM.1",
        label: "Salaires admin",
        annexLetter: "D",
        detailOnly: true,
        defineMapping: true,
        showInDetail: true,
        linkCode: "ADM.1",
      },
      {
        id: "ADM.20",
        label: "Amortissement - Immobilisations corporelles",
        annexLetter: "D",
        detailOnly: true,
        defineMapping: true,
        showInDetail: true,
        linkCode: "ADM.20",
      },
      {
        id: "IMP.1",
        label: "Exigibles",
        annexLetter: "D",
        detailOnly: true,
        defineMapping: true,
        showInDetail: true,
        linkCode: "IMP.1",
      },
    ]
    expect(
      listAnnexDetailSeriesIdsForOwner(
        { id: "adm", label: "Frais d'administration" },
        [
          { id: "adm", label: "Frais d'administration" },
          { id: "ADM.1", label: "Salaires admin" },
          { id: "ADM.20", label: "Amortissement - Immobilisations corporelles" },
          { id: "IMP.1", label: "Exigibles" },
        ],
        withAmort,
      ),
    ).toEqual(["ADM.1", "ADM.20"])
  })
})

describe("resolveDetailAnnexMeta", () => {
  it("reprend la lettre structure sur une sous-ligne série sans annexLetter", () => {
    const peers = [
      { id: "rev-a", label: "Revenus annexés", annexLetter: "A" },
      { id: "rev-a-1", label: "Ventes détail" },
    ]
    const child = resolveDetailAnnexMeta(peers[1]!, structure, peers)
    expect(child.sub).toBe(true)
    expect(child.annexLetter).toBe("A")
    expect(child.isAnnexTitle).toBe(false)
  })

  it("marque le poste sommaire comme titre seulement s’il a des sous-lignes", () => {
    const peers = [
      { id: "rev-a", label: "Revenus annexés", annexLetter: "A" },
      { id: "rev-a-1", label: "Ventes détail" },
    ]
    const title = resolveDetailAnnexMeta(peers[0]!, structure, peers)
    expect(title.sub).toBe(false)
    expect(title.isAnnexTitle).toBe(true)
    expect(title.annexLetter).toBe("A")
  })

  it("ne transforme pas un poste Annexe sans sous-lignes en titre (évite sous-total doublon)", () => {
    const peers = [{ id: "rev-solo", label: "Poste seul", annexLetter: "B" }]
    const solo = resolveDetailAnnexMeta(peers[0]!, structure, peers)
    expect(solo.isAnnexTitle).toBe(false)
    expect(solo.annexLetter).toBe("B")
  })

  it("rattache une sous-ligne sans lettre au poste sommaire contigu (Annexe B)", () => {
    const cmv = [
      {
        id: "cmv",
        label: "Coûts des produits vendus",
        annexLetter: "B",
        detailOnly: false,
      },
      {
        id: "CMV.2",
        label: "Achats",
        annexLetter: "",
        detailOnly: true,
      },
    ]
    const peers = [
      { id: "cmv", label: "Coûts des produits vendus", annexLetter: "B" },
      { id: "CMV.2", label: "Achats" },
    ]
    const child = resolveDetailAnnexMeta(peers[1]!, cmv, peers)
    expect(child.annexLetter).toBe("B")
    expect(child.sub).toBe(true)
    const title = resolveDetailAnnexMeta(peers[0]!, cmv, peers)
    expect(title.isAnnexTitle).toBe(true)
  })
})

describe("annexGroupShouldShowSubtotal", () => {
  it("affiche le sous-total pour titre + lignes", () => {
    expect(annexGroupShouldShowSubtotal([{ isAnnexTitle: true }, {}])).toBe(true)
  })

  it("n’affiche pas de sous-total pour une seule ligne sans titre", () => {
    expect(annexGroupShouldShowSubtotal([{}])).toBe(false)
  })

  it("n’affiche pas de sous-total pour un titre isolé", () => {
    expect(annexGroupShouldShowSubtotal([{ isAnnexTitle: true }])).toBe(false)
  })
})

describe("omitAnnexTitleRowsWithoutAmountPosts", () => {
  it("retire un titre d’annexe sans poste", () => {
    const rows = [
      { isAnnexTitle: true, annexLetter: "B", label: "Annexe B" },
      { annexLetter: "C", label: "Salaires" },
    ]
    expect(omitAnnexTitleRowsWithoutAmountPosts(rows)).toEqual([
      { annexLetter: "C", label: "Salaires" },
    ])
  })
})

describe("uniqueStatementRowsByStructureIndex", () => {
  it("garde une seule ligne série par poste structure (uuid prioritaire)", () => {
    const rows = [
      { id: "CMV.3", label: "Achats" },
      { id: "achats-uuid", label: "Achats" },
    ]
    const struct = [
      { id: "achats-uuid", label: "Achats", linkCode: "CMV.3", detailOnly: true },
    ]
    const unique = uniqueStatementRowsByStructureIndex(rows, struct)
    expect(unique).toHaveLength(1)
    expect(unique[0]!.id).toBe("achats-uuid")
  })
})
