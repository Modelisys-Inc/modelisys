import type { ApprochePhaseId } from "@/lib/approche-navigation"

/** Phases affichées dans la carte hero « Trajectoire de performance ». */
export const HERO_PERFORMANCE_PHASES = ["Diagnostic", "Planification", "Pilotage"] as const

export type HeroPerformancePhase = (typeof HERO_PERFORMANCE_PHASES)[number]

export type HeroPerformancePhaseContent = {
  step: string
  trajectory: number
  panelTitle: string
  panelSubtitle: string
  approchePhaseId: ApprochePhaseId
}

export const HERO_PERFORMANCE_PHASE_CONTENT: Record<HeroPerformancePhase, HeroPerformancePhaseContent> = {
  Diagnostic: {
    step: "01",
    trajectory: 22,
    panelTitle: "Tableau de bord diagnostic",
    panelSubtitle: "Revenus, rentabilité et marges — par groupe, sociétés ou divisions.",
    approchePhaseId: "diagnostic",
  },
  Planification: {
    step: "02",
    trajectory: 55,
    panelTitle: "Tableau de bord planification",
    panelSubtitle: "Projections de revenus, dépenses, fonds de roulement, capex, dette et valeur.",
    approchePhaseId: "planification",
  },
  Pilotage: {
    step: "03",
    trajectory: 88,
    panelTitle: "Suivi de performance",
    panelSubtitle:
      "Comparez le réel au prévu et au passé — analysez les écarts et documentez ce qui explique les variations.",
    approchePhaseId: "pilotage",
  },
}
