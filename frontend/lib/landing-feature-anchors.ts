/** Slugs & titres alignés sur la section Fonctionnalités de la landing (`/landing#features`). */
export const LANDING_FEATURE_ANCHORS = [
  { slug: "consolidation-financiere", title: "Consolidation financière avancée" },
  { slug: "fonds-de-roulement-capex", title: "Analyse du fonds de roulement et des capex" },
  { slug: "previsions-budgets", title: "Prévisions financières et budgets" },
  { slug: "analyse-financiere-approfondie", title: "Analyse financière approfondie" },
  { slug: "valorisation-diagnostic", title: "Valorisation et diagnostic d'entreprise" },
  { slug: "documentation-comptable", title: "Documentation comptable structurée" },
  { slug: "notes-analyse-variations", title: "Notes d'analyse et variations" },
  { slug: "portail-collaboratif", title: "Portail collaboratif sécurisé" },
] as const

export const landingFeatureFooterLinks = LANDING_FEATURE_ANCHORS.map((a) => ({
  title: a.title,
  href: `/landing#${a.slug}`,
}))
