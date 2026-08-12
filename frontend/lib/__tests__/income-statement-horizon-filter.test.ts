import { describe, it, expect } from "vitest"
import {
  filterIncomeStatementDetailRowsForHorizon,
  filterIncomeStatementSummaryRowsForHorizon,
} from "@/lib/income-statement-horizon-filter"
import { rowHasNonZeroAmountsForHorizon } from "@/lib/income-statement-horizon-visibility"
import { isShowInDetail } from "@/lib/income-statement-structure-utils"

describe("rowHasNonZeroAmountsForHorizon", () => {
  it("détecte un montant en vue annuelle 5 ans mais pas au mois courant", () => {
    expect(rowHasNonZeroAmountsForHorizon({ current: 0 }, "current")).toBe(false)
    expect(
      rowHasNonZeroAmountsForHorizon({ trendValues: [0, 0, 500, 0, 0, 0] }, "years")
    ).toBe(true)
  })
})

describe("filterIncomeStatementSummaryRowsForHorizon", () => {
  const structure = [
    { label: "Frais d'exploitation", linkCode: "EXP", defineMapping: true },
    { label: "Autres dépenses (produits)", isSection: true, isBold: true },
    { label: "AUT poste", linkCode: "AUT.1", defineMapping: true, indent: true },
  ]

  it("masque AUT au mois courant mais l’affiche en vue annuelle si un montant existe", () => {
    const rows = [
      { label: "Frais d'exploitation", current: 100, prior: 0, hasLiaisonCode: true },
      { label: "Autres dépenses (produits)", current: 0, prior: 0, isSection: true },
      { label: "AUT poste", current: 0, prior: 0, hasLiaisonCode: true, indent: true },
    ]

    const current = filterIncomeStatementSummaryRowsForHorizon(rows, structure, "current")
    expect(current.map((r) => r.label)).toEqual(["Frais d'exploitation"])

    const years = filterIncomeStatementSummaryRowsForHorizon(
      [
        ...rows.slice(0, 2),
        {
          ...rows[2]!,
          trendValues: [0, 0, 0, 0, 0, 120],
        },
      ],
      structure,
      "years"
    )
    expect(years.map((r) => r.label)).toContain("AUT poste")
  })

  it("exclut les codes de liaison chart-only absents des Paramètres Sommaire", () => {
    const rows = [
      { label: "BAIIA", current: 1000, prior: 900, isResult: true, trendValues: [1000, 900] },
      {
        label: "REV-A.1",
        current: 100,
        prior: 90,
        hasLiaisonCode: true,
        trendValues: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 5, 1],
      },
      {
        label: "REV-A.2",
        current: 50,
        prior: 40,
        hasLiaisonCode: true,
        trendValues: [50, 40, 30, 20, 10, 5, 4, 3, 2, 1, 1, 1],
      },
    ]
    const sommaireStructure = [{ label: "BAIIA", isResult: true, isBold: true, formula: "EBIT+AMO" }]

    const months = filterIncomeStatementSummaryRowsForHorizon(
      rows,
      sommaireStructure,
      "12months",
    )
    expect(months.map((r) => r.label)).toEqual(["BAIIA"])
    expect(months.map((r) => r.label)).not.toContain("REV-A.1")
  })
})

describe("filterIncomeStatementDetailRowsForHorizon", () => {
  it("retire tout le bloc d’annexe EXP sans montant pour l’horizon", () => {
    const structure = [
      {
        label: "Frais d'exploitation",
        linkCode: "EXP",
        annexLetter: "B",
        defineMapping: true,
        showInDetail: true,
      },
      {
        label: "EXP.1",
        detailOnly: true,
        linkCode: "EXP.1",
        annexLetter: "B",
        defineMapping: true,
      },
    ]
    const rows = [
      {
        label: "Annexe B — Frais d'exploitation",
        statementLabel: "Frais d'exploitation",
        annexLetter: "B",
        isAnnexTitle: true,
        current: 0,
        prior: 0,
        rowId: "EXP",
      },
      {
        label: "EXP.1",
        statementLabel: "EXP.1",
        annexLetter: "B",
        current: 0,
        prior: 0,
        rowId: "EXP.1",
      },
    ]

    const filtered = filterIncomeStatementDetailRowsForHorizon(rows, structure, "current")
    expect(filtered).toHaveLength(0)
  })

  it("conserve le titre d’annexe quand les sous-lignes ont des montants", () => {
    const structure = [
      {
        label: "Frais d'exploitation",
        linkCode: "EXP",
        annexLetter: "B",
        defineMapping: true,
        showInDetail: true,
      },
      {
        label: "EXP.1",
        detailOnly: true,
        linkCode: "EXP.1",
        annexLetter: "B",
        defineMapping: true,
      },
    ]
    const rows = [
      {
        label: "Annexe B — Frais d'exploitation",
        statementLabel: "Frais d'exploitation",
        annexLetter: "B",
        isAnnexTitle: true,
        current: 0,
        prior: 0,
        rowId: "EXP",
      },
      {
        label: "EXP.1",
        statementLabel: "EXP.1",
        annexLetter: "B",
        current: 150,
        prior: 0,
        rowId: "EXP.1",
      },
    ]

    const filtered = filterIncomeStatementDetailRowsForHorizon(rows, structure, "current")
    expect(filtered.some((r) => r.isAnnexTitle)).toBe(true)
    expect(filtered.some((r) => r.statementLabel === "EXP.1")).toBe(true)
  })
})

describe("isShowInDetail orphan detailOnly", () => {
  it("retourne false si le poste sommaire de l’annexe est absent", () => {
    const structure = [
      {
        label: "EXP.1",
        detailOnly: true,
        linkCode: "EXP.1",
        annexLetter: "B",
        defineMapping: true,
      },
    ]
    expect(isShowInDetail(structure[0]!, structure)).toBe(false)
  })
})
