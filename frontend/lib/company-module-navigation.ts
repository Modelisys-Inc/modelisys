export const COMPANY_MODULE_IDS = ["diagnostic", "planification", "pilotage"] as const

export type CompanyModuleId = (typeof COMPANY_MODULE_IDS)[number]

export function isCompanyModuleId(value: string): value is CompanyModuleId {
  return (COMPANY_MODULE_IDS as readonly string[]).includes(value)
}

export type CompanyModule = {
  id: CompanyModuleId
  label: string
  href: string
  phaseLabel: string
  description: string
}

export const COMPANY_MODULES: CompanyModule[] = [
  {
    id: "diagnostic",
    label: "Diagnostic",
    href: "/modules/diagnostic",
    phaseLabel: "Phase 1",
    description:
      "Mesurez votre point de départ : valeur actuelle, risques et leviers — la base de toute la trajectoire.",
  },
  {
    id: "planification",
    label: "Planification",
    href: "/modules/planification",
    phaseLabel: "Phase 2",
    description:
      "Clarifiez votre vision, modélisez vos décisions et projetez l'impact sur la performance et la trésorerie.",
  },
  {
    id: "pilotage",
    label: "Pilotage",
    href: "/modules/pilotage",
    phaseLabel: "Phase 3",
    description:
      "Analysez les écarts réel vs passé vs prévu, documentez leurs causes et recalibrez le plan en continu.",
  },
]

export const companyDashboardNavItem = {
  label: "Tableau de bord",
  href: "/tableau-de-bord",
} as const

export const companyModuleNavItems = COMPANY_MODULES.map(({ label, href }) => ({ label, href }))

/** Entrées du menu Rapport (header) — sans Planification. */
export const COMPANY_REPORT_NAV_ITEMS = COMPANY_MODULES.filter(
  (module) => module.id !== "planification",
).map(({ label, href }) => ({ label, href }))

export const COMPANY_REPORT_OVERVIEW_HREF = COMPANY_REPORT_NAV_ITEMS[0]?.href ?? "/modules/diagnostic"

export function appendReportNavHref(
  href: string,
  opts?: { companyId?: string | null },
): string {
  if (!opts?.companyId) return href
  const sep = href.includes("?") ? "&" : "?"
  return `${href}${sep}companyId=${encodeURIComponent(opts.companyId)}`
}

export function isReportNavPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  return COMPANY_REPORT_NAV_ITEMS.some((item) => pathname.startsWith(item.href.split("?")[0]!))
}

export function isReportNavLinkActive(
  pathname: string | null | undefined,
  item: { href: string },
): boolean {
  if (!pathname) return false
  return pathname.startsWith(item.href.split("?")[0]!)
}
