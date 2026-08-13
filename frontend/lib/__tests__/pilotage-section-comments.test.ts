import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  getPilotageSectionComments,
  pilotageDivisionProfitabilityCommentBlockId,
  PILOTAGE_EXPENSE_BRIDGE_COMMENT_BLOCK_ID,
  removePilotageSectionComments,
  savePilotageSectionComment,
} from "@/lib/pilotage-section-comments"

const PILOTAGE_ID = "pilotage-test-1"
const localStore = new Map<string, string>()

describe("pilotage-section-comments", () => {
  beforeEach(() => {
    localStore.clear()
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => localStore.get(key) ?? null,
      setItem: (key: string, value: string) => {
        localStore.set(key, value)
      },
      removeItem: (key: string) => {
        localStore.delete(key)
      },
      clear: () => localStore.clear(),
    })
    removePilotageSectionComments(PILOTAGE_ID)
  })

  it("sauvegarde et relit un commentaire par section", () => {
    savePilotageSectionComment(PILOTAGE_ID, "pilotage-revenue", "Note sur les revenus")
    const record = getPilotageSectionComments(PILOTAGE_ID)
    expect(record.comments["pilotage-revenue"]).toBe("Note sur les revenus")
  })

  it("supprime un commentaire vide", () => {
    savePilotageSectionComment(PILOTAGE_ID, "pilotage-ebita", "Texte")
    savePilotageSectionComment(PILOTAGE_ID, "pilotage-ebita", "   ")
    expect(getPilotageSectionComments(PILOTAGE_ID).comments["pilotage-ebita"]).toBeUndefined()
  })

  it("isole les rapports pilotage", () => {
    savePilotageSectionComment(PILOTAGE_ID, "pilotage-revenue", "A")
    savePilotageSectionComment("pilotage-test-2", "pilotage-revenue", "B")
    expect(getPilotageSectionComments(PILOTAGE_ID).comments["pilotage-revenue"]).toBe("A")
    expect(getPilotageSectionComments("pilotage-test-2").comments["pilotage-revenue"]).toBe("B")
    removePilotageSectionComments("pilotage-test-2")
  })

  it("accepte les commentaires par source de revenus et marge par revenus", () => {
    savePilotageSectionComment(PILOTAGE_ID, "revenue-source-0-electroniques", "Note revenus")
    savePilotageSectionComment(
      PILOTAGE_ID,
      "margin-by-revenue:revenue-source-0-electroniques",
      "Note marge",
    )
    const record = getPilotageSectionComments(PILOTAGE_ID)
    expect(record.comments["revenue-source-0-electroniques"]).toBe("Note revenus")
    expect(record.comments["margin-by-revenue:revenue-source-0-electroniques"]).toBe("Note marge")
  })

  it("accepte les commentaires analyse de rentabilité et rentabilité par division", () => {
    savePilotageSectionComment(
      PILOTAGE_ID,
      PILOTAGE_EXPENSE_BRIDGE_COMMENT_BLOCK_ID,
      "Note analyse",
    )
    savePilotageSectionComment(
      PILOTAGE_ID,
      pilotageDivisionProfitabilityCommentBlockId("div-est"),
      "Note division",
    )
    const record = getPilotageSectionComments(PILOTAGE_ID)
    expect(record.comments[PILOTAGE_EXPENSE_BRIDGE_COMMENT_BLOCK_ID]).toBe("Note analyse")
    expect(record.comments["division-profitability:div-est"]).toBe("Note division")
  })
})
