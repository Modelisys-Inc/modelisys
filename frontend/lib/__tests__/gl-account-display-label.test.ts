import { describe, expect, it } from "vitest"
import {
  accountLabelAlreadyIncludesNumber,
  formatGlAccountDisplayLabel,
  stripLeadingGlAccountNumber,
} from "@/lib/gl-account-display-label"

describe("formatGlAccountDisplayLabel", () => {
  it("keeps a clean number + description once", () => {
    expect(formatGlAccountDisplayLabel("2500", "Emprunt hypothécaire - Immeuble (LT)")).toBe(
      "2500 — Emprunt hypothécaire - Immeuble (LT)",
    )
  })

  it("does not duplicate when label already includes the GL number", () => {
    expect(formatGlAccountDisplayLabel("2500", "2500 — Emprunt hypothécaire - Immeuble (LT)")).toBe(
      "2500 — Emprunt hypothécaire - Immeuble (LT)",
    )
  })

  it("collapses double-prefixed labels from TB/mapping", () => {
    expect(
      formatGlAccountDisplayLabel("2500", "2500 — 2500 — Emprunt hypothécaire - Immeuble (LT)"),
    ).toBe("2500 — Emprunt hypothécaire - Immeuble (LT)")
  })
})

describe("accountLabelAlreadyIncludesNumber / stripLeadingGlAccountNumber", () => {
  it("detects prefixed labels", () => {
    expect(accountLabelAlreadyIncludesNumber("2500", "2500 — Emprunt")).toBe(true)
    expect(accountLabelAlreadyIncludesNumber("2500", "Emprunt")).toBe(false)
  })

  it("strips repeated prefixes", () => {
    expect(stripLeadingGlAccountNumber("2500", "2500 — 2500 — Emprunt")).toBe("Emprunt")
  })
})
