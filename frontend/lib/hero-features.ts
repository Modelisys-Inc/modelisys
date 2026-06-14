import { getApprochePhaseHref, type ApprochePhaseId } from "@/lib/approche-navigation"

/**
 * Libellés de la carte « Notre approche » du hero (ordre d’affichage).
 * Alignés sur les trois phases de l’approche Modelisys (`landing-client-journey-section`).
 */
export const HERO_FEATURE_LABELS = ["Diagnostic", "Planification", "Pilotage"] as const

export type HeroFeatureLabel = (typeof HERO_FEATURE_LABELS)[number]

/** Correspondance hero → identifiant de phase sur la landing. */
export const HERO_FEATURE_PHASE_BY_LABEL: Record<HeroFeatureLabel, ApprochePhaseId> = {
  Diagnostic: "diagnostic",
  Planification: "planification",
  Pilotage: "pilotage",
}

export const heroFeatureFooterLinks = HERO_FEATURE_LABELS.map((label) => ({
  title: label,
  href: getApprochePhaseHref(HERO_FEATURE_PHASE_BY_LABEL[label]),
}))
