import type { CompanyReportModuleId } from "@/lib/company-report-module"

export type CompanyReportCoverTheme = "dark" | "light-grid"

export type CompanyReportBranding = {
  reportTypeLabel: string
  sectionMetaLabel: string
  coverDescription: string
  coverTheme: CompanyReportCoverTheme
  introTheme: CompanyReportCoverTheme
  mandateLeadDocumentLabel: string
  mandatePurposeBody: (companyName: string) => string
}

const COMPANY_REPORT_BRANDING: Record<CompanyReportModuleId, CompanyReportBranding> = {
  diagnostic: {
    reportTypeLabel: "Rapport de diagnostic financier",
    sectionMetaLabel: "Diagnostic financier",
    coverDescription:
      "Diagnostic stratégique offrant une analyse intégrée de la performance financière, de la rentabilité, de la structure financière, de la capacité de création de liquidités et de la valeur de l'entreprise.",
    coverTheme: "dark",
    introTheme: "dark",
    mandateLeadDocumentLabel: "diagnostic financier",
    mandatePurposeBody: (companyName) =>
      `Présenter un diagnostic stratégique de la situation financière de ${companyName}, en synthétisant la performance, la rentabilité, la structure financière, la capacité de création de liquidités, les investissements et une lecture indicative de la valeur de l'entreprise, à partir des données comptables disponibles à la date de référence.`,
  },
  pilotage: {
    reportTypeLabel: "Rapport de performance",
    sectionMetaLabel: "Rapport de performance",
    coverDescription:
      "Rapport de performance mensuel intégrant une analyse détaillée des revenus, de la rentabilité, du fonds de roulement, des investissements, du financement et de la trésorerie comparativement au passé et au budget.",
    coverTheme: "light-grid",
    introTheme: "light-grid",
    mandateLeadDocumentLabel: "rapport de performance",
    mandatePurposeBody: (companyName) =>
      `Présenter une lecture de pilotage de la performance de ${companyName}, structurée autour de la période courante, du cumul d'exercice (YTD) et des tendances sur douze mois, avec analyse des écarts par rapport aux périodes de comparaison et au budget lorsque celui-ci est disponible, à partir des données comptables à la date de référence.`,
  },
}

export function getCompanyReportBranding(moduleId: CompanyReportModuleId): CompanyReportBranding {
  return COMPANY_REPORT_BRANDING[moduleId]
}
