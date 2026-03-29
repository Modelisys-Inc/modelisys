/**
 * Libellés de la carte « Fonctionnalités » du hero (ordre d’affichage).
 * Ancres : ids dans `features-section` (`/#slug` depuis la landing).
 */
export const HERO_FEATURE_LABELS = [
  "Consolidation",
  "Reporting financier",
  "Analyse financière",
  "Projections",
  "Valorisation",
  "Documentation",
  "Collaboration",
] as const

export type HeroFeatureLabel = (typeof HERO_FEATURE_LABELS)[number]

/** Correspondance thématique hero → bloc détaillé sur /#features. */
export const HERO_FEATURE_ANCHOR_BY_LABEL: Record<HeroFeatureLabel, string> = {
  Consolidation: "consolidation-financiere",
  "Reporting financier": "fonds-de-roulement-capex",
  "Analyse financière": "analyse-financiere-approfondie",
  Projections: "previsions-budgets",
  Valorisation: "valorisation-diagnostic",
  Documentation: "documentation-comptable",
  Collaboration: "portail-collaboratif",
}

export const heroFeatureFooterLinks = HERO_FEATURE_LABELS.map((label) => ({
  title: label,
  href: `/#${HERO_FEATURE_ANCHOR_BY_LABEL[label]}`,
}))
