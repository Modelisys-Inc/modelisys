export const VALUATION_PLAN_PHASE_IDS = [
  "company-overview",
  "business-model",
  "net-tangible-assets",
  "adjusted-ebitda",
  "capitalisation",
  "multiplicateur",
  "dcf",
] as const

export type ValuationPlanPhaseId = (typeof VALUATION_PLAN_PHASE_IDS)[number]

const LEGACY_VALUATION_PLAN_STEP_IDS: Record<string, ValuationPlanPhaseId> = {
  "ebitda-multiple": "multiplicateur",
}

export type ValuationPlanPhase = {
  id: ValuationPlanPhaseId
  label: string
  href: string
  step: string
  trajectory: number
  progressStartLabel: string
  progressEndLabel: string
  panelTitle: string
  panelSubtitle: string
  listLabel: string
  items: readonly string[]
}

export const VALUATION_PLAN_PHASES: readonly ValuationPlanPhase[] = [
  {
    id: "company-overview",
    label: "Aperçu de l'entreprise",
    href: "/evaluation/company-overview",
    step: "01",
    trajectory: 8,
    progressStartLabel: "Contexte",
    progressEndLabel: "Profil documenté",
    panelTitle: "Aperçu de l'entreprise",
    panelSubtitle:
      "Documentez le profil sectoriel, l'historique, l'actionnariat et les activités principales de l'entreprise.",
    listLabel: "Éléments clés",
    items: [
      "Informations générales et secteur d'activité",
      "Historique et structure actionnariale",
      "Équipe de direction et activités principales",
    ],
  },
  {
    id: "business-model",
    label: "Modèle d'affaires",
    href: "/evaluation/business-model",
    step: "02",
    trajectory: 22,
    progressStartLabel: "Contexte",
    progressEndLabel: "Risques couverts",
    panelTitle: "Modèle d'affaires",
    panelSubtitle:
      "Documentez les forces, faiblesses et risques opérationnels pour cadrer la valorisation.",
    listLabel: "Éléments clés",
    items: [
      "Cartographie des risques par catégorie",
      "Notes et recommandations par poste",
      "Base qualitative pour les hypothèses financières",
    ],
  },
  {
    id: "net-tangible-assets",
    label: "Valeur comptable ajustée",
    href: "/evaluation/net-tangible-assets",
    step: "03",
    trajectory: 36,
    progressStartLabel: "Bilan",
    progressEndLabel: "Ajustements posés",
    panelTitle: "Valeur comptable ajustée",
    panelSubtitle:
      "Ajustez les actifs et passifs pour estimer la valeur comptable ajustée de l'entreprise.",
    listLabel: "Éléments clés",
    items: [
      "Reprise du bilan de référence",
      "Ajustements d'actifs et de passifs",
      "Valeur indicative par valeur comptable ajustée",
    ],
  },
  {
    id: "adjusted-ebitda",
    label: "Flux monétaires",
    href: "/evaluation/adjusted-ebitda",
    step: "04",
    trajectory: 50,
    progressStartLabel: "Historique",
    progressEndLabel: "Flux retenus",
    panelTitle: "Flux monétaires",
    panelSubtitle:
      "Normalisez le BAIIA, retenez la fourchette représentative et déterminez les flux monétaires caractéristiques.",
    listLabel: "Éléments clés",
    items: [
      "Série BAIIA et ajustements",
      "Fourchette de BAIIA et de revenus",
      "Impôt, FDR et capex de maintien",
      "Flux monétaires caractéristiques",
    ],
  },
  {
    id: "capitalisation",
    label: "Multiplicateur",
    href: "/evaluation/capitalisation",
    step: "05",
    trajectory: 64,
    progressStartLabel: "Revenus",
    progressEndLabel: "Taux retenu",
    panelTitle: "Multiplicateur",
    panelSubtitle:
      "Capitalisez les revenus ou bénéfices normalisés pour estimer la valeur de l'entreprise.",
    listLabel: "Éléments clés",
    items: [
      "Revenus ou bénéfices normalisés",
      "Taux de capitalisation applicable",
      "Valeur indicative par capitalisation des revenus",
    ],
  },
  {
    id: "multiplicateur",
    label: "Capitalisation",
    href: "/evaluation/ebitda-multiple",
    step: "06",
    trajectory: 78,
    progressStartLabel: "Flux",
    progressEndLabel: "Valeur d'entreprise",
    panelTitle: "Capitalisation",
    panelSubtitle:
      "Capitalisez les flux monétaires caractéristiques (CMPC − croissance) pour estimer la valeur d'entreprise.",
    listLabel: "Éléments clés",
    items: [
      "Flux monétaires caractéristiques",
      "Multiple retenu (1 ÷ [CMPC − croissance])",
      "Fourchette indicative de valeur d'entreprise",
    ],
  },
  {
    id: "dcf",
    label: "Actualisation",
    href: "/evaluation/dcf",
    step: "07",
    trajectory: 92,
    progressStartLabel: "Prévu",
    progressEndLabel: "Valeur",
    panelTitle: "Actualisation",
    panelSubtitle:
      "Projetez les flux futurs et actualisez-les pour obtenir une valeur par actualisation des flux de trésorerie.",
    listLabel: "Éléments clés",
    items: [
      "Hypothèses de croissance et marge",
      "WACC et valeur terminale",
      "Synthèse de la valeur d'entreprise",
    ],
  },
] as const

const PHASE_BY_ID = Object.fromEntries(
  VALUATION_PLAN_PHASES.map((phase) => [phase.id, phase]),
) as Record<ValuationPlanPhaseId, ValuationPlanPhase>

export function normalizeValuationPlanStepId(stepId: string): ValuationPlanPhaseId | null {
  if (VALUATION_PLAN_PHASE_IDS.includes(stepId as ValuationPlanPhaseId)) {
    return stepId as ValuationPlanPhaseId
  }
  return LEGACY_VALUATION_PLAN_STEP_IDS[stepId] ?? null
}

export function normalizeCompletedPlanSteps(
  completedSteps: readonly string[] | undefined,
): ValuationPlanPhaseId[] {
  if (!completedSteps?.length) return []
  const normalized = new Set<ValuationPlanPhaseId>()
  for (const stepId of completedSteps) {
    const mapped = normalizeValuationPlanStepId(stepId)
    if (mapped) normalized.add(mapped)
  }
  return VALUATION_PLAN_PHASE_IDS.filter((id) => normalized.has(id))
}

export function valuationPlanPhaseById(id: ValuationPlanPhaseId): ValuationPlanPhase {
  return PHASE_BY_ID[id]
}

export function valuationPlanPhaseLabels(): string {
  return VALUATION_PLAN_PHASES.map((phase) => phase.label).join(" → ")
}

export function resolveActiveValuationPlanPhaseId(
  completedSteps: readonly ValuationPlanPhaseId[] | undefined,
): ValuationPlanPhaseId {
  const completed = new Set(completedSteps ?? [])
  const next = VALUATION_PLAN_PHASE_IDS.find((id) => !completed.has(id))
  return next ?? VALUATION_PLAN_PHASE_IDS[VALUATION_PLAN_PHASE_IDS.length - 1]
}

export type ValuationPlanStepStatus = "completed" | "in_progress" | "pending"

export function getValuationPlanStepStatus(
  phaseId: ValuationPlanPhaseId,
  completedSteps: readonly ValuationPlanPhaseId[] | undefined,
): ValuationPlanStepStatus {
  const completed = new Set(completedSteps ?? [])
  if (completed.has(phaseId)) return "completed"
  if (phaseId === resolveActiveValuationPlanPhaseId(completedSteps)) return "in_progress"
  return "pending"
}

export function valuationPlanOverallProgressPercent(
  completedSteps: readonly ValuationPlanPhaseId[] | undefined,
): number {
  const completedCount = completedSteps?.length ?? 0
  return Math.round((completedCount / VALUATION_PLAN_PHASE_IDS.length) * 100)
}

export function valuationPlanCompletedCount(
  completedSteps: readonly ValuationPlanPhaseId[] | undefined,
): number {
  return completedSteps?.length ?? 0
}

/** @deprecated Use valuationPlanOverallProgressPercent for dashboard progress */
export function valuationPlanProgressPercent(
  completedSteps: readonly ValuationPlanPhaseId[] | undefined,
  activePhaseId?: ValuationPlanPhaseId,
): number {
  const completedCount = completedSteps?.length ?? 0
  if (completedCount >= VALUATION_PLAN_PHASE_IDS.length) return 100
  const active = activePhaseId ?? resolveActiveValuationPlanPhaseId(completedSteps)
  return valuationPlanPhaseById(active).trajectory
}

/** @deprecated Dashboard uses completed count instead */
export function valuationPlanStepCounter(
  completedSteps: readonly ValuationPlanPhaseId[] | undefined,
  activePhaseId?: ValuationPlanPhaseId,
): string {
  const total = VALUATION_PLAN_PHASE_IDS.length
  if ((completedSteps?.length ?? 0) >= total) {
    return `${String(total).padStart(2, "0")}/${String(total).padStart(2, "0")}`
  }
  const active = activePhaseId ?? resolveActiveValuationPlanPhaseId(completedSteps)
  const index = VALUATION_PLAN_PHASE_IDS.indexOf(active)
  return `${String(index + 1).padStart(2, "0")}/${String(total).padStart(2, "0")}`
}
