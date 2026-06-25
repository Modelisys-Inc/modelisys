import type { ApprochePhaseId } from "@/lib/approche-navigation"

export type ApprochePhaseMarketingContent = {
  phaseTitle: string
  description?: string
  listLabel: string
  items: readonly string[]
}

export const APPROCHE_PHASE_MARKETING_CONTENT: Record<ApprochePhaseId, ApprochePhaseMarketingContent> = {
  diagnostic: {
    phaseTitle: "Phase 1 — Diagnostic",
    listLabel: "Comprenez votre performance actuelle",
    items: [
      "Analyse des revenus, des dépenses et de la rentabilité",
      "Analyse des ratios financiers, du fonds de roulement et des investissements",
      "Analyse multi-entités ou encore par entité, division, produit, client ou fournisseur",
      "Identification des risques, opportunités et leviers de croissance",
      "Valorisation de l'entreprise et identification des risques",
    ],
  },
  planification: {
    phaseTitle: "Phase 2 — Planification",
    listLabel: "Vision et scénarios",
    items: [
      "Définition des objectifs et des priorités stratégiques",
      "Élaboration de scénarios de croissance sur 1 à 5 ans",
      "Planification des revenus, des dépenses et de la rentabilité",
      "Gestion des investissements, du fonds de roulement et du financement",
      "Projection des flux de trésorerie et des besoins futurs",
      "Mesure de l'impact des scénarios sur la performance et les objectifs",
    ],
  },
  pilotage: {
    phaseTitle: "Phase 3 — Pilotage",
    listLabel: "Suivi et ajustements",
    items: [
      "Comparez vos résultats à vos objectifs et à vos prévisions",
      "Comprenez les écarts et documentez les actions à entreprendre",
      "Mesurez l'impact de vos décisions sur la performance financière",
      "Ajustez vos hypothèses et vos scénarios en temps réel",
      "Maintenez votre entreprise sur la bonne trajectoire",
    ],
  },
}
