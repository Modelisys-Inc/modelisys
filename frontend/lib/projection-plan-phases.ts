export const PROJECTION_PLAN_PHASE_IDS = [
  "revenue",
  "expenses",
  "capex",
  "debt",
  "taxes",
  "bilan",
] as const

export type ProjectionPlanPhaseId = (typeof PROJECTION_PLAN_PHASE_IDS)[number]

export type ProjectionPlanPhase = {
  id: ProjectionPlanPhaseId
  label: string
  /** Sous-module Hypothèses sur /projections/pro-forma. */
  hypothesis: ProjectionPlanPhaseId
  step: string
  panelSubtitle: string
  listLabel: string
  items: readonly string[]
}

export const PROJECTION_PLAN_PHASES: readonly ProjectionPlanPhase[] = [
  {
    id: "revenue",
    label: "Hypothèses Revenus",
    hypothesis: "revenue",
    step: "01",
    panelSubtitle:
      "Définissez la croissance, la saisonnalité et les ajustements des revenus projetés.",
    listLabel: "Éléments clés",
    items: [
      "Croissance par poste de revenus",
      "Courbe de saisonnalité",
      "Ajustements récurrents et non récurrents",
    ],
  },
  {
    id: "expenses",
    label: "Hypothèses Dépenses",
    hypothesis: "expenses",
    step: "02",
    panelSubtitle:
      "Projetez les dépenses variables et fixes, avec inflation, saisonnalité et ajustements.",
    listLabel: "Éléments clés",
    items: [
      "Dépenses variables liées aux revenus",
      "Dépenses fixes et inflation",
      "Saisonnalité et ajustements",
    ],
  },
  {
    id: "capex",
    label: "Hypothèses Capex",
    hypothesis: "capex",
    step: "03",
    panelSubtitle:
      "Planifiez les investissements, l’amortissement et le financement des ajouts d’actifs.",
    listLabel: "Éléments clés",
    items: [
      "Ajouts d’immobilisations et VNC",
      "Dotations et codes d’amortissement",
      "Financement et décaissements",
    ],
  },
  {
    id: "debt",
    label: "Hypothèses Financement",
    hypothesis: "debt",
    step: "04",
    panelSubtitle:
      "Paramétrez les emprunts (taux, durée, calendrier) et les intérêts projetés.",
    listLabel: "Éléments clés",
    items: [
      "Emprunts mapping et Capex financés",
      "Taux, durée et mode de remboursement",
      "Calendrier des versements mensuels",
    ],
  },
  {
    id: "taxes",
    label: "Hypothèses Impôts",
    hypothesis: "taxes",
    step: "05",
    panelSubtitle:
      "Retenez le taux d’imposition et la fréquence de paiement des acomptes.",
    listLabel: "Éléments clés",
    items: [
      "Taux d’impôt projeté",
      "Fréquence de paiement",
      "Impôts exigibles au bilan",
    ],
  },
  {
    id: "bilan",
    label: "Hypothèses Bilan",
    hypothesis: "bilan",
    step: "06",
    panelSubtitle:
      "Ajustez les postes du bilan projeté (clients, stocks, créditeurs, BNR, etc.).",
    listLabel: "Éléments clés",
    items: [
      "Drivers de fonds de roulement",
      "Postes liés Capex / Financement / Impôts",
      "Validation Total actif = Passif + Capitaux",
    ],
  },
] as const

const PHASE_BY_ID = Object.fromEntries(
  PROJECTION_PLAN_PHASES.map((phase) => [phase.id, phase]),
) as Record<ProjectionPlanPhaseId, ProjectionPlanPhase>

export function normalizeCompletedProjectionPlanSteps(
  completedSteps: readonly string[] | undefined,
): ProjectionPlanPhaseId[] {
  if (!completedSteps?.length) return []
  const normalized = new Set<ProjectionPlanPhaseId>()
  for (const stepId of completedSteps) {
    if (PROJECTION_PLAN_PHASE_IDS.includes(stepId as ProjectionPlanPhaseId)) {
      normalized.add(stepId as ProjectionPlanPhaseId)
    }
  }
  return PROJECTION_PLAN_PHASE_IDS.filter((id) => normalized.has(id))
}

export function projectionPlanPhaseById(id: ProjectionPlanPhaseId): ProjectionPlanPhase {
  return PHASE_BY_ID[id]
}

export function resolveActiveProjectionPlanPhaseId(
  completedSteps: readonly ProjectionPlanPhaseId[] | undefined,
): ProjectionPlanPhaseId {
  const completed = new Set(completedSteps ?? [])
  const next = PROJECTION_PLAN_PHASE_IDS.find((id) => !completed.has(id))
  return next ?? PROJECTION_PLAN_PHASE_IDS[PROJECTION_PLAN_PHASE_IDS.length - 1]
}

export type ProjectionPlanStepStatus = "completed" | "in_progress" | "pending"

export function getProjectionPlanStepStatus(
  phaseId: ProjectionPlanPhaseId,
  completedSteps: readonly ProjectionPlanPhaseId[] | undefined,
): ProjectionPlanStepStatus {
  const completed = new Set(completedSteps ?? [])
  if (completed.has(phaseId)) return "completed"
  if (phaseId === resolveActiveProjectionPlanPhaseId(completedSteps)) return "in_progress"
  return "pending"
}

export function projectionPlanOverallProgressPercent(
  completedSteps: readonly ProjectionPlanPhaseId[] | undefined,
): number {
  const completedCount = completedSteps?.length ?? 0
  return Math.round((completedCount / PROJECTION_PLAN_PHASE_IDS.length) * 100)
}

export function projectionPlanCompletedCount(
  completedSteps: readonly ProjectionPlanPhaseId[] | undefined,
): number {
  return completedSteps?.length ?? 0
}

export type ProjectionPlanShellTab =
  | "parcours"
  | "resultats"
  | "bilan"
  | "tresorerie"
  | "sommaire"

export const PROJECTION_PLAN_SHELL_TABS: {
  id: ProjectionPlanShellTab
  label: string
}[] = [
  { id: "parcours", label: "Parcours" },
  { id: "resultats", label: "Résultats" },
  { id: "bilan", label: "Bilan" },
  { id: "tresorerie", label: "Trésorerie" },
  { id: "sommaire", label: "Sommaire" },
]
