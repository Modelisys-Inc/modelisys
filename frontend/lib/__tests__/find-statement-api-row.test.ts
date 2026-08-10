import { describe, it, expect } from "vitest"
import { findStatementApiRowForStructureRow } from "@/lib/income-statement-structure-utils"

describe("findStatementApiRowForStructureRow", () => {
  it("trouve une sous-ligne annexe imbriquée dans detailRows", () => {
    const apiRows = [
      {
        id: "ACT-C",
        label: "Comptes clients",
        current: 1250,
        detailRows: [
          { id: "ACT-C.1", label: "Comptes clients", current: 1000 },
          { id: "ACT-C.2", label: "Comptes clients - Apprenté", current: 250 },
        ],
      },
    ]
    const used = new Set<number>()
    const usedNested = new Set<string>()
    const structRow = {
      linkCode: "ACT-C.2",
      label: "Comptes clients - Apprenté",
      detailOnly: true,
    }
    const match = findStatementApiRowForStructureRow(structRow, apiRows, used, usedNested)
    expect(match?.id).toBe("ACT-C.2")
    expect(match?.current).toBe(250)
  })

  it("préfère une correspondance de premier niveau", () => {
    const apiRows = [
      { id: "ACT-C.2", label: "Comptes clients - Apprenté", current: 250 },
    ]
    const match = findStatementApiRowForStructureRow(
      { linkCode: "ACT-C.2" },
      apiRows,
      new Set(),
      new Set(),
    )
    expect(match?.current).toBe(250)
  })

  it("n’associe pas PLT-A à ACT-C.5 quand les libellés sont identiques", () => {
    const apiRows = [
      {
        id: "act-c5-uuid",
        linkCode: "ACT-C.5",
        label: "Dépôts",
        current: 5000,
        detailRows: [{ id: "1280", label: "1280 — Compte dépôt", current: 5000 }],
      },
      {
        id: "plt-a-uuid",
        linkCode: "PLT-A",
        label: "Passifs à court terme",
        current: 0,
        detailRows: [],
      },
    ]
    const used = new Set<number>()
    const usedNested = new Set<string>()

    const pltMatch = findStatementApiRowForStructureRow(
      { id: "plt-a-uuid", linkCode: "PLT-A", label: "Dépôts" },
      apiRows,
      used,
      usedNested,
    )
    expect(pltMatch?.linkCode).toBe("PLT-A")
    expect(pltMatch?.detailRows).toHaveLength(0)

    const actMatch = findStatementApiRowForStructureRow(
      { id: "act-c5-uuid", linkCode: "ACT-C.5", label: "Dépôts" },
      apiRows,
      used,
      usedNested,
    )
    expect(actMatch?.linkCode).toBe("ACT-C.5")
    expect(actMatch?.detailRows).toHaveLength(1)
  })
})
