import { describe, it, expect } from "vitest"
import {
  renumberAnnexesByAppearance,
  newChargeRow,
  isAnnexLetterInputEditable,
} from "../income-statement-structure-utils"

type Row = Record<string, unknown>

describe("renumberAnnexesByAppearance — letters (Résultats)", () => {
  it("numbers annexes by appearance order, not by existing identifier", () => {
    const s: Row[] = [
      { label: "Revenus", showInDetail: true, annexLetter: "Z" },
      { label: "Charges", showInDetail: true, annexLetter: "" },
    ]
    const out = renumberAnnexesByAppearance(s, "letter")
    // The stale "Z" appears first → becomes "A"; the blank one → "B".
    expect(out[0]!.annexLetter).toBe("A")
    expect(out[1]!.annexLetter).toBe("B")
  })

  it("assigns the first id from a blank, freshly-toggled row (showInDetail:true, annexLetter:'')", () => {
    const s: Row[] = [{ label: "Revenus", showInDetail: true, annexLetter: "" }]
    const out = renumberAnnexesByAppearance(s, "letter")
    expect(out[0]!.annexLetter).toBe("A")
  })

  it("makes an earlier-positioned annexe win over a later one regardless of prior letters", () => {
    // Row 0 enabled-but-blank (appears first), row 1 already lettered "A".
    const s: Row[] = [
      { label: "Revenus", showInDetail: true, annexLetter: "" },
      { label: "Autres", showInDetail: true, annexLetter: "A" },
    ]
    const out = renumberAnnexesByAppearance(s, "letter")
    expect(out[0]!.annexLetter).toBe("A")
    expect(out[1]!.annexLetter).toBe("B")
  })

  it("propagates the block id to contiguous detailOnly sub-lines", () => {
    const s: Row[] = [
      { label: "Revenus", showInDetail: true, annexLetter: "" },
      { label: "Sous-ligne", detailOnly: true, annexLetter: "OLD" },
      { label: "Charges", showInDetail: true, annexLetter: "" },
    ]
    const out = renumberAnnexesByAppearance(s, "letter")
    expect(out[0]!.annexLetter).toBe("A")
    expect(out[1]!.annexLetter).toBe("A") // inherits its parent block
    expect(out[2]!.annexLetter).toBe("B")
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
      { label: "Revenus", showInDetail: true, annexLetter: "" },
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
      { label: "Real", showInDetail: true, annexLetter: "" },
    ]
    const out = renumberAnnexesByAppearance(s, "letter")
    expect(out[3]!.annexLetter).toBe("A") // first id goes to the only real annexe
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
      { label: "Clients", showInDetail: true, annexLetter: "" },
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
