export type FinancialToolLink = {
  label: string
  href: string
  /** Préfixe pour l'état actif (défaut : href). */
  pathPrefix?: string
}

/** Entrées du menu « Outils financiers » (header). */
export const FINANCIAL_TOOLS_NAV_ITEMS: FinancialToolLink[] = [
  {
    label: "Reporting financier",
    href: "/financial-statements/income-statement",
    pathPrefix: "/financial-statements",
  },
  {
    label: "Analyse financière",
    href: "/analysis/working-capital",
    pathPrefix: "/analysis",
  },
  {
    label: "Projections",
    href: "/projections",
    pathPrefix: "/projections",
  },
  {
    label: "Valorisation",
    href: "/evaluation/business-model",
    pathPrefix: "/evaluation",
  },
  {
    label: "Documentation",
    href: "/year-end-cpa",
    pathPrefix: "/year-end-cpa",
  },
]

export const FINANCIAL_TOOLS_OVERVIEW_HREF = "/dashboard"

const FINANCIAL_TOOLS_PATH_PREFIXES = [
  "/dashboard",
  "/financial-statements",
  "/analysis",
  "/projections",
  "/evaluation",
  "/year-end-cpa",
] as const

export function isFinancialToolLinkActive(
  pathname: string | null,
  item: FinancialToolLink,
): boolean {
  if (!pathname) return false
  const prefix = item.pathPrefix ?? item.href
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function isFinancialToolsPath(pathname: string | null): boolean {
  if (!pathname) return false
  return FINANCIAL_TOOLS_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function appendCompanyIdToHref(href: string, companyId: string | null | undefined): string {
  if (!companyId) return href
  const separator = href.includes("?") ? "&" : "?"
  return `${href}${separator}companyId=${companyId}`
}

export function appendFinancialToolHref(
  href: string,
  params: {
    companyId?: string | null
    refMonth?: string | null
    refYear?: string | null
  },
): string {
  const search = new URLSearchParams()
  if (params.companyId) search.set("companyId", params.companyId)
  if (params.refMonth) search.set("refMonth", params.refMonth)
  if (params.refYear) search.set("refYear", params.refYear)
  const qs = search.toString()
  if (!qs) return href
  const separator = href.includes("?") ? "&" : "?"
  return `${href}${separator}${qs}`
}
