import { describe, it, expect } from "vitest"
import {
  filterBalanceSheetDetailRowsForHorizon,
  filterBalanceSheetSummaryRowsForHorizon,
} from "@/lib/balance-sheet-horizon-filter"

describe("filterBalanceSheetSummaryRowsForHorizon", () => {
  const structure = [
    { label: "Actif à court terme", linkCode: "ACT", defineMapping: true, isSection: true },
    { label: "Trésorerie", linkCode: "ACT-A.1", defineMapping: true, indent: true },
  ]

  it("masque un poste sans montant au mois courant mais l’affiche en vue annuelle", () => {
    const rows = [
      { label: "Actif à court terme", current: 1000, prior: 0, isSection: true, hasLiaisonCode: true },
      { label: "Trésorerie", current: 0, prior: 0, hasLiaisonCode: true, indent: true },
    ]

    const current = filterBalanceSheetSummaryRowsForHorizon(rows, structure, "current")
    expect(current.map((r) => r.label)).toEqual(["Actif à court terme"])

    const years = filterBalanceSheetSummaryRowsForHorizon(
      [
        ...rows.slice(0, 1),
        {
          ...rows[1]!,
          trendValues: [0, 0, 0, 0, 0, 250],
        },
      ],
      structure,
      "years"
    )
    expect(years.map((r) => r.label)).toContain("Trésorerie")
  })
})

describe("filterBalanceSheetDetailRowsForHorizon", () => {
  it("retire tout le bloc d’annexe sans montant pour l’horizon", () => {
    const structure = [
      {
        label: "Actif à court terme",
        linkCode: "ACT",
        annexLetter: "A",
        defineMapping: true,
        showInDetail: true,
      },
      {
        label: "ACT-A.1",
        detailOnly: true,
        linkCode: "ACT-A.1",
        annexLetter: "A",
        defineMapping: true,
      },
    ]
    const rows = [
      {
        label: "Annexe A — Actif à court terme",
        statementLabel: "Actif à court terme",
        annexLetter: "A",
        isAnnexTitle: true,
        current: 0,
        prior: 0,
        rowId: "ACT",
      },
      {
        label: "ACT-A.1",
        statementLabel: "ACT-A.1",
        annexLetter: "A",
        current: 0,
        prior: 0,
        rowId: "ACT-A.1",
      },
    ]

    const filtered = filterBalanceSheetDetailRowsForHorizon(rows, structure, "current")
    expect(filtered).toHaveLength(0)
  })

  it("masque les sous-lignes à zéro mais conserve celles avec montant", () => {
    const structure = [
      {
        label: "Comptes clients",
        linkCode: "ACT-C",
        annexLetter: "1",
        defineMapping: true,
        showInDetail: true,
      },
      {
        label: "ACT-C.1",
        detailOnly: true,
        linkCode: "ACT-C.1",
        annexLetter: "1",
        defineMapping: true,
      },
      {
        label: "ACT-C.2",
        detailOnly: true,
        linkCode: "ACT-C.2",
        annexLetter: "1",
        defineMapping: true,
      },
    ]
    const rows = [
      {
        label: "Annexe 1 — Comptes clients",
        statementLabel: "Comptes clients",
        annexLetter: "1",
        isAnnexTitle: true,
        current: 0,
        prior: 0,
        rowId: "ACT-C",
      },
      {
        label: "ACT-C.1",
        statementLabel: "ACT-C.1",
        annexLetter: "1",
        current: 0,
        prior: 0,
        rowId: "ACT-C.1",
      },
      {
        label: "ACT-C.2",
        statementLabel: "ACT-C.2",
        annexLetter: "1",
        current: 250,
        prior: 200,
        rowId: "ACT-C.2",
      },
    ]

    const filtered = filterBalanceSheetDetailRowsForHorizon(rows, structure, "current")
    expect(filtered.map((r) => r.statementLabel)).toEqual([
      "Comptes clients",
      "ACT-C.2",
    ])
  })

  it("masque un poste Détail à 0 $ sur toutes les années affichées", () => {
    const structure = [
      { label: "Encaisse", linkCode: "ACT-A.1", defineMapping: true },
      { label: "Placements inactifs", linkCode: "ACT-A.2", defineMapping: true },
      { label: "Total des actifs", isResult: true },
    ]
    const rows = [
      {
        label: "Encaisse",
        statementLabel: "Encaisse",
        rowId: "ACT-A.1",
        trendValues: [120, 100, 80, 0, 0, 0, 0],
      },
      {
        label: "Placements inactifs",
        statementLabel: "Placements inactifs",
        rowId: "ACT-A.2",
        trendValues: [0, 0, 0, 0, 0, 0, 0],
      },
      {
        label: "Total des actifs",
        statementLabel: "Total des actifs",
        isResult: true,
        trendValues: [120, 100, 80, 0, 0, 0, 0],
      },
    ]

    const filtered = filterBalanceSheetDetailRowsForHorizon(rows, structure, "years")
    expect(filtered.map((r) => r.label)).toEqual(["Encaisse", "Total des actifs"])
  })

  it("retire l’annexe sans showInDetail et sans montant", () => {
    const structure = [
      {
        label: "Actif à court terme",
        linkCode: "ACT",
        annexLetter: "A",
        defineMapping: true,
        showInDetail: false,
      },
    ]
    const rows = [
      {
        label: "Annexe A — Actif à court terme",
        statementLabel: "Actif à court terme",
        annexLetter: "A",
        isAnnexTitle: true,
        current: 0,
        prior: 0,
        rowId: "ACT",
      },
    ]

    const filtered = filterBalanceSheetDetailRowsForHorizon(rows, structure, "current")
    expect(filtered).toHaveLength(0)
  })

  it("conserve le titre d’annexe quand un sous-poste a un montant", () => {
    const structure = [
      {
        label: "Actif à court terme",
        linkCode: "ACT",
        annexLetter: "A",
        defineMapping: true,
        showInDetail: true,
      },
      {
        label: "ACT-A.1",
        detailOnly: true,
        linkCode: "ACT-A.1",
        annexLetter: "A",
        defineMapping: true,
      },
    ]
    const rows = [
      {
        label: "Annexe A — Actif à court terme",
        statementLabel: "Actif à court terme",
        annexLetter: "A",
        isAnnexTitle: true,
        current: 0,
        prior: 0,
        rowId: "ACT",
      },
      {
        label: "ACT-A.1",
        statementLabel: "ACT-A.1",
        annexLetter: "A",
        current: 500,
        prior: 400,
        rowId: "ACT-A.1",
      },
    ]

    const filtered = filterBalanceSheetDetailRowsForHorizon(rows, structure, "current")
    expect(filtered.map((r) => r.label)).toEqual([
      "Annexe A — Actif à court terme",
      "ACT-A.1",
    ])
  })
})
