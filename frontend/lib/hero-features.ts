import { getApprochePhaseHref, type ApprochePhaseId } from "@/lib/approche-navigation"

/**
 * Libellés de la carte « Notre approche » du hero (ordre d’affichage).
 * Alignés sur les cinq phases de l’approche Modelisys (`landing-client-journey-section`).
 */
export const HERO_FEATURE_LABELS = [
  "Diagnostic",
  "Vision",
  "Planification",
  "Exécution",
  "Ajustement",
] as const

export type HeroFeatureLabel = (typeof HERO_FEATURE_LABELS)[number]

/** Correspondance hero → identifiant de phase sur la landing. */
export const HERO_FEATURE_PHASE_BY_LABEL: Record<HeroFeatureLabel, ApprochePhaseId> = {
  Diagnostic: "diagnostic",
  Vision: "vision",
  Planification: "planification",
  Exécution: "execution",
  Ajustement: "ajustement",
}

export const heroFeatureFooterLinks = HERO_FEATURE_LABELS.map((label) => ({
  title: label,
  href: getApprochePhaseHref(HERO_FEATURE_PHASE_BY_LABEL[label]),
}))
