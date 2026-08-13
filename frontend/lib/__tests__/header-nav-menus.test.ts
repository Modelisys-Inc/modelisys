import { describe, expect, it } from "vitest"
import {
  COMPANY_CONFIGURATION_NAV_ITEMS,
  companyConfigurationHref,
  isCompanyConfigurationLinkActive,
  isCompanyConfigurationPath,
} from "@/lib/company-configuration-navigation"
import { FINANCIAL_TOOLS_NAV_ITEMS } from "@/lib/financial-tools-navigation"

describe("company configuration navigation", () => {
  it("expose les 4 entrées demandées", () => {
    expect(COMPANY_CONFIGURATION_NAV_ITEMS.map((i) => i.label)).toEqual([
      "Information de base",
      "Mapping comptable",
      "Code de liaison",
      "Balance de vérification",
    ])
  })

  it("construit les hrefs société", () => {
    const id = "11111111-1111-1111-1111-111111111111"
    expect(companyConfigurationHref(id, "")).toBe(`/settings/companies/${id}`)
    expect(companyConfigurationHref(id, "/mapping")).toBe(`/settings/companies/${id}/mapping`)
  })

  it("détecte la page active Information de base sans matcher les sous-pages", () => {
    const id = "c1"
    expect(isCompanyConfigurationLinkActive(`/settings/companies/${id}`, id, "")).toBe(true)
    expect(isCompanyConfigurationLinkActive(`/settings/companies/${id}/mapping`, id, "")).toBe(false)
    expect(isCompanyConfigurationLinkActive(`/settings/companies/${id}/mapping`, id, "/mapping")).toBe(
      true,
    )
  })

  it("détecte le préfixe Configuration", () => {
    expect(isCompanyConfigurationPath("/settings/companies")).toBe(true)
    expect(isCompanyConfigurationPath("/settings/companies/x/mapping")).toBe(true)
    expect(isCompanyConfigurationPath("/dashboard")).toBe(false)
  })
})

describe("financial tools navigation", () => {
  it("ne propose plus Scénarios", () => {
    expect(FINANCIAL_TOOLS_NAV_ITEMS.map((i) => i.label)).not.toContain("Scénarios")
    expect(FINANCIAL_TOOLS_NAV_ITEMS.map((i) => i.label)).toEqual([
      "Reporting financier",
      "Analyse financière",
      "Projections",
      "Valorisation",
      "Documentation",
    ])
  })
})
