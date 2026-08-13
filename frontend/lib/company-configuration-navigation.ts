export type CompanyConfigurationLink = {
  label: string
  /** Segment après `/settings/companies/{id}` ; vide = page Information de base. */
  pathSuffix: string
}

/** Entrées du menu « Configuration » (header), pour une société sélectionnée. */
export const COMPANY_CONFIGURATION_NAV_ITEMS: CompanyConfigurationLink[] = [
  { label: "Information de base", pathSuffix: "" },
  { label: "Mapping comptable", pathSuffix: "/mapping" },
  { label: "Code de liaison", pathSuffix: "/link-codes" },
  { label: "Balance de vérification", pathSuffix: "/trial-balance" },
]

export const COMPANY_CONFIGURATION_LIST_HREF = "/settings/companies"

export function companyConfigurationHref(companyId: string, pathSuffix: string): string {
  return `/settings/companies/${companyId}${pathSuffix}`
}

export function isCompanyConfigurationPath(pathname: string | null): boolean {
  if (!pathname) return false
  return pathname === "/settings/companies" || pathname.startsWith("/settings/companies/")
}

export function isCompanyConfigurationLinkActive(
  pathname: string | null,
  companyId: string,
  pathSuffix: string,
): boolean {
  if (!pathname || !companyId) return false
  const href = companyConfigurationHref(companyId, pathSuffix)
  if (pathSuffix === "") {
    return pathname === href
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}
