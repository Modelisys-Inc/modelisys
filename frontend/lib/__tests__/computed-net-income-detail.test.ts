import { describe, it, expect } from "vitest"
import {
  isComputedNetIncomeStructureRow,
  listStructureRowsForDetailDisplay,
  listStructureRowsForPresentationDisplay,
  listStructureRowsForSummaryDisplay,
} from "@/lib/income-statement-structure-utils"
import { filterBalanceSheetDetailRowsForHorizon } from "@/lib/balance-sheet-horizon-filter"

describe("CAP-C.1 affichage bilan", () => {
  const structure = [
    { label: "Groupe CAP-C", linkCode: "CAP-C", isSection: true, defineMapping: true, showInDetail: true },
    {
      label: "Bénéfice net calculé",
      linkCode: "CAP-C.1",
      defineMapping: false,
      showInDetail: true,
      isComputedNetIncome: true,
      indent: true,
    },
    {
      label: "Dividendes",
      linkCode: "CAP-C.2",
      defineMapping: true,
      showInDetail: true,
      indent: true,
    },
  ]

  it("n’affiche pas CAP-C.1 en ligne plate au Sommaire", () => {
    expect(isComputedNetIncomeStructureRow(structure[1]!)).toBe(true)
    expect(listStructureRowsForPresentationDisplay(structure).map((r) => r.linkCode)).toEqual([
      "CAP-C",
      "CAP-C.2",
    ])
    expect(listStructureRowsForSummaryDisplay(structure).map((r) => r.linkCode)).toEqual([
      "CAP-C",
      "CAP-C.2",
    ])
  })

  it("n’affiche pas CAP-C.1 comme poste détail autonome", () => {
    const detail = listStructureRowsForDetailDisplay(structure)
    expect(detail.map((r) => r.linkCode)).toEqual(["CAP-C", "CAP-C.2"])
  })

  it("reste disponible pour le filtre horizon détail via rowId (enfant annexe)", () => {
    const rows = [
      {
        label: "Bénéfice net calculé",
        statementLabel: "Bénéfice net calculé",
        current: 0,
        prior: 0,
        rowId: "CAP-C.1",
      },
    ]
    const filtered = filterBalanceSheetDetailRowsForHorizon(
      rows,
      [structure[1]!],
      "current",
    )
    expect(filtered).toHaveLength(1)
  })
})
