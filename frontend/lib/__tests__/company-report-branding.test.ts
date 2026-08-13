import { describe, expect, it } from "vitest"
import { getCompanyReportBranding } from "@/lib/company-report-branding"

describe("getCompanyReportBranding", () => {
  it("distingue diagnostic et pilotage", () => {
    expect(getCompanyReportBranding("diagnostic").reportTypeLabel).toBe(
      "Rapport de diagnostic financier",
    )
    expect(getCompanyReportBranding("pilotage").reportTypeLabel).toBe("Rapport de performance")
    expect(getCompanyReportBranding("pilotage").coverTheme).toBe("light-grid")
    expect(getCompanyReportBranding("diagnostic").coverTheme).toBe("dark")
    expect(getCompanyReportBranding("pilotage").mandateLeadDocumentLabel).toBe("rapport de performance")
  })
})
