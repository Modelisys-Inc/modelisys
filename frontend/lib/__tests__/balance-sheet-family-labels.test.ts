import { describe, expect, it } from "vitest"
import { balanceSheetFamilyForSectionLabel } from "@/lib/balance-sheet-mapping-rollup"

describe("balanceSheetFamilyForSectionLabel", () => {
  it("reconnaît les libellés du template standard et du défaut", () => {
    expect(balanceSheetFamilyForSectionLabel("Actif à court terme")).toBe("ACT")
    expect(balanceSheetFamilyForSectionLabel("actifs courants")).toBe("ACT")
    expect(balanceSheetFamilyForSectionLabel("Actifs non courants")).toBe("ALT")
    expect(balanceSheetFamilyForSectionLabel("Passifs courants")).toBe("PCT")
    expect(balanceSheetFamilyForSectionLabel("Passifs non courants")).toBe("PLT")
    expect(balanceSheetFamilyForSectionLabel("Capitaux propres")).toBe("CAP")
  })

  it("ignore les en-têtes parents Actif / Passif", () => {
    expect(balanceSheetFamilyForSectionLabel("Actif")).toBeNull()
    expect(balanceSheetFamilyForSectionLabel("Actifs")).toBeNull()
    expect(balanceSheetFamilyForSectionLabel("Passif")).toBeNull()
    expect(balanceSheetFamilyForSectionLabel("Passifs")).toBeNull()
  })
})
