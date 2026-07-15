import { describe, it, expect } from "vitest"
import {
  findStatementApiRowForStructureRow,
  listStructureRowsForPresentationDisplay,
} from "@/lib/income-statement-structure-utils"

describe("balance sheet summary structure display", () => {
  const structure = [
    { label: "Actif", isSection: true, defineMapping: true },
    {
      label: "Comptes clients",
      linkCode: "ACT-C",
      annexLetter: "1",
      defineMapping: true,
      showInDetail: true,
    },
    {
      label: "Comptes clients - Apprenté",
      linkCode: "ACT-C.2",
      detailOnly: true,
      annexLetter: "1",
      defineMapping: true,
      showInDetail: true,
    },
    { label: "Total actif", isResult: true, defineMapping: true },
  ]

  it("exclut les sous-lignes detailOnly du périmètre Sommaire", () => {
    const rows = listStructureRowsForPresentationDisplay(structure)
    expect(rows.map((r) => r.label)).toEqual([
      "Actif",
      "Comptes clients",
      "Total actif",
    ])
  })

  it("n’associe pas une ligne Sommaire à une sous-ligne detailOnly imbriquée", () => {
    const apiRows = [
      {
        id: "ACT-C",
        label: "Comptes clients",
        current: 1250,
        detailRows: [
          { id: "ACT-C.2", label: "Comptes clients - Apprenté", current: 250 },
        ],
      },
    ]
    const summaryRows = listStructureRowsForPresentationDisplay(structure)
    const comptesClients = summaryRows.find((r) => r.linkCode === "ACT-C")!
    const match = findStatementApiRowForStructureRow(comptesClients, apiRows)
    expect(match?.id).toBe("ACT-C")
    expect(match?.current).toBe(1250)
  })
})
