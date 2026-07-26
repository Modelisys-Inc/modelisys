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
})
