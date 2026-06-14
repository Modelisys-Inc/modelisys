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
