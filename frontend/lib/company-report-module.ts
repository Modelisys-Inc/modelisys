import type { CompanyModuleId } from "@/lib/company-module-navigation"
import type { ChartHorizonToggleValue } from "@/components/statement-chart"
import { HORIZON_LABEL } from "@/lib/financial-statement-horizon-labels"
import {
  DIAGNOSTIC_PRINT_ANALYSES,
  type ReportPrintAnalysis,
} from "@/lib/diagnostic-report-chapters"

/** Modules disposant du rapport interactif complet (portail + analyse + PDF). */
export const COMPANY_REPORT_MODULE_IDS = ["diagnostic", "pilotage"] as const

export type CompanyReportModuleId = (typeof COMPANY_REPORT_MODULE_IDS)[number]

export function isCompanyReportModuleId(value: string): value is CompanyReportModuleId {
  return (COMPANY_REPORT_MODULE_IDS as readonly string[]).includes(value)
}

export type CompanyReportModuleConfig = {
  id: CompanyReportModuleId
  label: string
  phaseLabel: string
  description: string
  basePath: string
  storageKey: string
  reportIdParam: string
  listTitle: string
  listSubtitle: string
  portalHeroTitle: string
  portalHeroDescription: string
  portalHeroLockedHint: (companyName: string) => string
  portalHeroDefaultHint: string
  newReportLabel: string
  emptyListTitle: string
  emptyListDescriptionLocked: (companyName: string) => string
  emptyListDescriptionDefault: string
  heroBackLabel: string
  reportTitlePrefix: string
  loadingHeroTitle: string
  printPreviewTitle: string
  pdfFilenamePrefix: string
  notFoundMessage: string
  notFoundBackLabel: string
  missingIdMessage: string
  createDialogTitle: string
  createDialogDescription: string
}

export const COMPANY_REPORT_MODULES: Record<CompanyReportModuleId, CompanyReportModuleConfig> = {
  diagnostic: {
    id: "diagnostic",
    label: "Diagnostic",
    phaseLabel: "Phase 1",
    description:
      "Mesurez votre point de départ : valeur actuelle, risques et leviers — la base de toute la trajectoire.",
    basePath: "/modules/diagnostic",
    storageKey: "modelisys-diagnostic-registry",
    reportIdParam: "diagnosticId",
    listTitle: "Mes diagnostics",
    listSubtitle: "Créez un rapport ou rouvrez un diagnostic déjà généré.",
    portalHeroTitle: "Diagnostic",
    portalHeroDescription: "Créez et consultez vos rapports de diagnostic d'entreprise.",
    portalHeroLockedHint: (companyName) =>
      `Créez un diagnostic ou sélectionnez un rapport existant pour ${companyName}.`,
    portalHeroDefaultHint:
      "Créez un rapport ou sélectionnez un diagnostic existant pour continuer l'analyse.",
    newReportLabel: "Nouveau diagnostic",
    emptyListTitle: "Aucun diagnostic créé",
    emptyListDescriptionLocked: (companyName) =>
      `Lancez votre premier rapport de diagnostic pour ${companyName}.`,
    emptyListDescriptionDefault:
      "Lancez votre premier rapport de diagnostic pour une société de votre espace.",
    heroBackLabel: "Mes diagnostics",
    reportTitlePrefix: "Diagnostic de",
    loadingHeroTitle: "Chargement du diagnostic…",
    printPreviewTitle: "Aperçu du rapport diagnostic",
    pdfFilenamePrefix: "Diagnostic",
    notFoundMessage: "Ce diagnostic est introuvable ou a été supprimé.",
    notFoundBackLabel: "Retour aux diagnostics",
    missingIdMessage: "Identifiant de diagnostic manquant.",
    createDialogTitle: "Nouveau diagnostic",
    createDialogDescription:
      "Choisissez la société et la date de référence du rapport. Les données sont recalculées à l'ouverture.",
  },
  pilotage: {
    id: "pilotage",
    label: "Pilotage",
    phaseLabel: "Phase 3",
    description:
      "Analysez les écarts réel vs passé vs prévu, documentez leurs causes et recalibrez le plan en continu.",
    basePath: "/modules/pilotage",
    storageKey: "modelisys-pilotage-registry",
    reportIdParam: "pilotageId",
    listTitle: "Mes rapports de pilotage",
    listSubtitle: "Créez un rapport ou rouvrez une analyse de pilotage déjà générée.",
    portalHeroTitle: "Pilotage",
    portalHeroDescription:
      "Créez et consultez vos rapports de pilotage — même analyse financière que le diagnostic.",
    portalHeroLockedHint: (companyName) =>
      `Créez un rapport de pilotage ou sélectionnez une analyse existante pour ${companyName}.`,
    portalHeroDefaultHint:
      "Créez un rapport ou sélectionnez une analyse de pilotage existante pour continuer le suivi.",
    newReportLabel: "Nouveau rapport de pilotage",
    emptyListTitle: "Aucun rapport de pilotage créé",
    emptyListDescriptionLocked: (companyName) =>
      `Lancez votre premier rapport de pilotage pour ${companyName}.`,
    emptyListDescriptionDefault:
      "Lancez votre premier rapport de pilotage pour une société de votre espace.",
    heroBackLabel: "Mes rapports de pilotage",
    reportTitlePrefix: "Pilotage de",
    loadingHeroTitle: "Chargement du pilotage…",
    printPreviewTitle: "Aperçu du rapport de pilotage",
    pdfFilenamePrefix: "Rapport-performance",
    notFoundMessage: "Ce rapport de pilotage est introuvable ou a été supprimé.",
    notFoundBackLabel: "Retour au pilotage",
    missingIdMessage: "Identifiant de rapport de pilotage manquant.",
    createDialogTitle: "Nouveau rapport de pilotage",
    createDialogDescription:
      "Choisissez la société et la date de référence. L'analyse reprend l'ensemble des vues du diagnostic.",
  },
}

export function getCompanyReportModule(moduleId: CompanyReportModuleId): CompanyReportModuleConfig {
  return COMPANY_REPORT_MODULES[moduleId]
}

/** Vues du rapport interactif masquées pour certains modules (ex. pilotage sans aperçu). */
const COMPANY_REPORT_EXCLUDED_VIEW_IDS: Record<CompanyReportModuleId, readonly string[]> = {
  diagnostic: [],
  pilotage: ["company-overview", "financial-position"],
}

export function companyReportExcludedViewIds(moduleId: CompanyReportModuleId): readonly string[] {
  return COMPANY_REPORT_EXCLUDED_VIEW_IDS[moduleId]
}

export function companyReportIncludesView(
  moduleId: CompanyReportModuleId,
  viewId: string,
): boolean {
  return !companyReportExcludedViewIds(moduleId).includes(viewId)
}

/** Analyses imprimées (intro + graphique + lecture) selon le module. */
export function companyReportPrintAnalyses(
  moduleId: CompanyReportModuleId,
): ReportPrintAnalysis[] {
  const excluded = new Set(companyReportExcludedViewIds(moduleId))
  return DIAGNOSTIC_PRINT_ANALYSES.filter((analysis) => !excluded.has(analysis.viewId))
}

export function companyReportIncludesCompanyOverview(moduleId: CompanyReportModuleId): boolean {
  return !companyReportExcludedViewIds(moduleId).includes("company-overview")
}

export type CompanyReportChartHorizonConfig = {
  defaultHorizon: ChartHorizonToggleValue
  allowedHorizons: ChartHorizonToggleValue[]
}

const COMPANY_REPORT_CHART_HORIZON: Record<CompanyReportModuleId, CompanyReportChartHorizonConfig> = {
  diagnostic: {
    defaultHorizon: "years",
    allowedHorizons: ["years", "12months"],
  },
  pilotage: {
    defaultHorizon: "12months",
    allowedHorizons: ["12months"],
  },
}

export function getCompanyReportChartHorizon(
  moduleId: CompanyReportModuleId,
): CompanyReportChartHorizonConfig {
  return COMPANY_REPORT_CHART_HORIZON[moduleId]
}

/** Numéro de section d'analyse dans le PDF (01 = première analyse si pas d'aperçu). */
export function companyReportAnalysisNumberOffset(moduleId: CompanyReportModuleId): number {
  return companyReportIncludesCompanyOverview(moduleId) ? 2 : 1
}

/** Fenêtre mensuelle du graphique Performance financière (mois de référence inclus). */
export function getCompanyReportPerformanceMonthlyCount(moduleId: CompanyReportModuleId): number {
  return moduleId === "pilotage" ? 13 : 12
}

/** Comparaison du panneau latéral Performance financière (valeur de référence vs base). */
export function getCompanyReportPerformanceSidePanelComparison(
  moduleId: CompanyReportModuleId,
  monthlyPointCount: number,
): { priorIndex: number; useComparisonPeriodLabel: boolean } {
  if (moduleId === "pilotage") {
    return {
      priorIndex: monthlyPointCount - 1,
      useComparisonPeriodLabel: true,
    }
  }
  return { priorIndex: 1, useComparisonPeriodLabel: false }
}

/** Fenêtre mensuelle du graphique Analyse des revenus (mois de référence inclus). */
export function getCompanyReportRevenueAnalysisMonthlyCount(
  _moduleId: CompanyReportModuleId,
): number {
  return 13
}

/** Comparaison du panneau latéral Analyse des revenus (référence vs même mois N-1). */
export function getCompanyReportRevenueAnalysisSidePanelComparison(
  monthlyPointCount: number,
): { priorIndex: number; useComparisonPeriodLabel: boolean } {
  return {
    priorIndex: monthlyPointCount - 1,
    useComparisonPeriodLabel: true,
  }
}

export function formatPerformanceSidePanelComparisonLabel(
  comparison: { useComparisonPeriodLabel: boolean },
  priorPeriodLabel: string | undefined,
): string {
  if (comparison.useComparisonPeriodLabel && priorPeriodLabel?.trim()) {
    return `vs ${priorPeriodLabel.trim()}`
  }
  return "vs période précédente"
}

/** Libellé d'horizon affiché sous Performance financière (Pilotage = Mensuel, pas « 24 mois »). */
export function getCompanyReportPerformanceHorizonLabel(
  moduleId: CompanyReportModuleId,
): string | null {
  if (moduleId === "pilotage") return HORIZON_LABEL.mensuel
  return null
}

/** Libellé d'horizon affiché sous Analyse des revenus (Mensuel, pas « 24 mois »). */
export function getCompanyReportRevenueAnalysisHorizonLabel(
  _moduleId: CompanyReportModuleId,
): string {
  return HORIZON_LABEL.mensuel
}

/**
 * Points du graphique Analyse des revenus — ordre chronologique (plus ancien → plus récent)
 * pour le pilotage ; les séries API restent ancrées au mois de référence en index 0.
 */
export function plotRevenueAnalysisChartPoints<T extends { period: string }>(
  points: T[],
  moduleId: CompanyReportModuleId,
): T[] {
  if (moduleId === "pilotage" && points.length > 1) {
    return [...points].reverse()
  }
  return points
}

export type RevenueAnalysisChartXAxisConfig = {
  interval: 0
  angle: number
  textAnchor: "end"
  height: number
  tick: { fill: string; fontSize: number }
  bottomMargin: number
}

/** Axe X du graphique Analyse des revenus (pilotage) : tous les mois, lisibles en diagonale. */
export function getCompanyReportRevenueAnalysisChartXAxis(
  moduleId: CompanyReportModuleId,
): RevenueAnalysisChartXAxisConfig | null {
  if (moduleId !== "pilotage") return null
  return {
    interval: 0,
    angle: -45,
    textAnchor: "end",
    height: 52,
    tick: { fill: "#64748b", fontSize: 11 },
    bottomMargin: 44,
  }
}

/** Sous-titre de la lecture Performance financière (Pilotage). */
export function getCompanyReportPerformanceNarrativeSubtitle(
  moduleId: CompanyReportModuleId,
): string | null {
  if (moduleId === "pilotage") {
    return "Analyse mensuelle — lecture financière à la date de référence"
  }
  return null
}

export function companyReportModuleFromCompanyModule(
  moduleId: CompanyModuleId,
): CompanyReportModuleId | null {
  if (isCompanyReportModuleId(moduleId)) return moduleId
  return null
}

export function companyReportDetailPath(
  module: CompanyReportModuleConfig,
  reportId: string,
  companyId?: string | null,
): string {
  const params = new URLSearchParams()
  if (companyId) params.set("companyId", companyId)
  const qs = params.toString()
  return `${module.basePath}/${reportId}${qs ? `?${qs}` : ""}`
}

export function companyReportPortalPath(
  module: CompanyReportModuleConfig,
  companyId?: string | null,
): string {
  if (!companyId) return module.basePath
  return `${module.basePath}?companyId=${companyId}`
}
