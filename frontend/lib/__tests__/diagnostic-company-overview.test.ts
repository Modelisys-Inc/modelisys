import { describe, expect, it } from "vitest"
import {
  createDefaultCompanyOverview,
  saveCompanyOverview,
  removeCompanyOverview,
} from "@/lib/diagnostic-company-overview"

describe("diagnostic-company-overview", () => {
  const diagnosticId = "test-diag-001"
  const companyName = "ManuFAC Inc."

  it("creates a default overview with editable sections", () => {
    const overview = createDefaultCompanyOverview(diagnosticId, companyName)
    expect(overview.generalInfo.sector).toBe("")
    expect(overview.history.length).toBeGreaterThan(0)
    expect(overview.participatingShareholders.length).toBeGreaterThan(0)
    expect(overview.votingShareholders.length).toBeGreaterThan(0)
    expect(overview.history[0]?.id).toBe("co-default-history")
  })

  it("save returns normalized overview payload", () => {
    const initial = createDefaultCompanyOverview(diagnosticId, companyName)
    initial.generalInfo.sector = "Fabrication métallique"
    const saved = saveCompanyOverview(initial)
    expect(saved.generalInfo.sector).toBe("Fabrication métallique")
    expect(saved.updatedAt.length).toBeGreaterThan(0)
    removeCompanyOverview(diagnosticId)
  })
})
