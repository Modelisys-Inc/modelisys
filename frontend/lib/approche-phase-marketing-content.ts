import type { ApprochePhaseId } from "@/lib/approche-navigation"

export type ApprochePhaseMarketingContent = {
  phaseNumber: string
  shortTitle: string
  phaseTitle: string
  tagline: string
  whatItDoes: string
  whyItMatters: string
  /** Résumé court — hero / cartes compactes */
  description?: string
  listLabel: string
  items: readonly string[]
}

export const APPROCHE_PHASE_MARKETING_CONTENT: Record<ApprochePhaseId, ApprochePhaseMarketingContent> = {
  diagnostic: {
    phaseNumber: "01",
    shortTitle: "Diagnostic",
    phaseTitle: "Phase 1 — Diagnostic",
    tagline: "Mesurer où vous en êtes réellement",
    whatItDoes:
      "Le diagnostic consolide vos états financiers, quantifie la performance et situe la valeur de l'entreprise sur une base objective — revenus, marges, fonds de roulement, investissements et risques.",
    whyItMatters:
      "Sans photo claire du présent, chaque décision repose sur des intuitions. Le diagnostic fixe un point de départ commun pour la direction, les conseillers et les actionnaires — la référence à partir de laquelle tout le reste se construit.",
    description: "Comprenez votre performance actuelle et les leviers qui font bouger la valeur.",
    listLabel: "Ce que vous obtenez",
    items: [
      "Analyse des revenus, des dépenses et de la rentabilité",
      "Ratios financiers, fonds de roulement et investissements",
      "Vue multi-entités, par division, produit, client ou fournisseur",
      "Identification des risques, opportunités et leviers de croissance",
      "Valorisation indicative et cartographie des risques",
    ],
  },
  planification: {
    phaseNumber: "02",
    shortTitle: "Planification",
    phaseTitle: "Phase 2 — Planification",
    tagline: "Définir où vous voulez aller",
    whatItDoes:
      "La planification transforme votre ambition en scénarios chiffrés — projections, investissements, financement et impact sur la valeur — pour comparer les chemins possibles avant de vous engager.",
    whyItMatters:
      "Une vision sans modèle reste une intention. La planification aligne les priorités, anticipe les besoins de liquidité et mesure l'effet de chaque initiative sur la trajectoire de valeur.",
    description: "Vision, scénarios et trajectoire vers l'objectif de valeur.",
    listLabel: "Ce que vous obtenez",
    items: [
      "Objectifs et priorités stratégiques formalisés",
      "Scénarios de croissance sur 1 à 5 ans",
      "Planification des revenus, dépenses et rentabilité",
      "Investissements, fonds de roulement et financement",
      "Projection des flux de trésorerie et mesure d'impact",
    ],
  },
  pilotage: {
    phaseNumber: "03",
    shortTitle: "Pilotage",
    phaseTitle: "Phase 3 — Pilotage",
    tagline: "Suivre l'écart jusqu'à l'objectif",
    whatItDoes:
      "Le pilotage confronte le réel au prévu, quantifie les écarts et documente les ajustements — hypothèses, trajectoire de valeur et trésorerie mises à jour en continu.",
    whyItMatters:
      "Les plans dérapent : marché, coûts, timing. Le pilotage transforme le modèle en boussole vivante pour corriger le cap avant que l'écart ne devienne irréversible.",
    description: "Suivi des écarts, ajustements et maintien de la trajectoire.",
    listLabel: "Ce que vous obtenez",
    items: [
      "Comparaison résultats vs objectifs et prévisions",
      "Analyse des écarts et documentation des actions",
      "Mesure de l'impact des décisions sur la performance",
      "Ajustement des hypothèses et scénarios en temps réel",
      "Maintien de l'entreprise sur la bonne trajectoire",
    ],
  },
}

export const APPROCHE_PHASE_ORDER: ApprochePhaseId[] = ["diagnostic", "planification", "pilotage"]

export type ApprochePhaseAccent = {
  dot: string
  ring: string
  gradient: string
  glow: string
  label: string
}

export const APPROCHE_PHASE_ACCENTS: Record<ApprochePhaseId, ApprochePhaseAccent> = {
  diagnostic: {
    dot: "bg-[#E0742D]",
    ring: "ring-[#E0742D]/35",
    gradient: "from-white via-white to-[#FFF7ED]/40",
    glow: "bg-[#E0742D]/8",
    label: "text-[#9A4A1A]",
  },
  planification: {
    dot: "bg-[#5B8DEF]",
    ring: "ring-[#5B8DEF]/35",
    gradient: "from-white via-white to-[#EFF6FF]/40",
    glow: "bg-[#5B8DEF]/8",
    label: "text-[#3B6FD4]",
  },
  pilotage: {
    dot: "bg-[#4A9B73]",
    ring: "ring-[#4A9B73]/35",
    gradient: "from-white via-white to-[#ECFDF5]/40",
    glow: "bg-[#4A9B73]/8",
    label: "text-[#2F7A58]",
  },
}
