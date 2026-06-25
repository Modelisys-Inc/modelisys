import type { ApprochePhaseId } from "@/lib/approche-navigation"
import { APPROCHE_PHASE_MARKETING_CONTENT } from "@/lib/approche-phase-marketing-content"

/** Phases affichées dans la carte hero « Trajectoire de performance ». */
export const HERO_PERFORMANCE_PHASES = ["Diagnostic", "Planification", "Pilotage"] as const

export type HeroPerformancePhase = (typeof HERO_PERFORMANCE_PHASES)[number]

const HERO_PERFORMANCE_PHASE_BY_APPROCHE_ID: Record<ApprochePhaseId, HeroPerformancePhase> = {
  diagnostic: "Diagnostic",
  planification: "Planification",
  pilotage: "Pilotage",
}

export function heroPerformancePhaseFromApprocheId(phaseId: ApprochePhaseId): HeroPerformancePhase {
  return HERO_PERFORMANCE_PHASE_BY_APPROCHE_ID[phaseId]
}

export type HeroPerformancePhaseContent = {
  step: string
  trajectory: number
  progressStartLabel: string
  progressEndLabel: string
  panelTitle: string
  panelSubtitle: string
  listLabel: string
  items: readonly string[]
  approchePhaseId: ApprochePhaseId
}

const HERO_PHASE_PROGRESS_LABELS: Record<HeroPerformancePhase, { start: string; end: string }> = {
  Diagnostic: { start: "Situation actuelle", end: "Diagnostic posé" },
  Planification: { start: "Aujourd'hui", end: "Objectif" },
  Pilotage: { start: "Prévu", end: "Réel" },
}

function toHeroContent(
  phase: HeroPerformancePhase,
  step: string,
  trajectory: number,
  approchePhaseId: ApprochePhaseId,
): HeroPerformancePhaseContent {
  const content = APPROCHE_PHASE_MARKETING_CONTENT[approchePhaseId]
  const progress = HERO_PHASE_PROGRESS_LABELS[phase]
  return {
    step,
    trajectory,
    progressStartLabel: progress.start,
    progressEndLabel: progress.end,
    approchePhaseId,
    panelTitle: content.phaseTitle,
    panelSubtitle: content.description ?? "",
    listLabel: content.listLabel,
    items: content.items,
  }
}

export const HERO_PERFORMANCE_PHASE_CONTENT: Record<HeroPerformancePhase, HeroPerformancePhaseContent> = {
  Diagnostic: toHeroContent("Diagnostic", "01", 22, "diagnostic"),
  Planification: toHeroContent("Planification", "02", 55, "planification"),
  Pilotage: toHeroContent("Pilotage", "03", 88, "pilotage"),
}
