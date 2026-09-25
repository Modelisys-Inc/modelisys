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
    shortTitle: "Comprendre",
    phaseTitle: "Phase 1 — Comprendre",
    tagline: "Comprendre ce qui impacte vraiment la valeur",
    whatItDoes:
      "Nous partons de vos états financiers et de votre réalité opérationnelle pour établir une lecture claire : performance, trésorerie, structure du capital et risques. Ensemble, nous isolons ce qui crée de la valeur — et ce qui l'érode.",
    whyItMatters:
      "Sans compréhension partagée du présent, les décisions restent intuitives. Cette phase fixe un point de départ commun pour la direction, les conseillers et les actionnaires — la base sur laquelle planifier et exécuter.",
    description: "Lire la performance actuelle et les dynamiques qui façonnent la valeur.",
    listLabel: "Ce sur quoi nous travaillons",
    items: [
      "Lecture croisée des revenus, dépenses et rentabilité",
      "Fonds de roulement, investissements et liquidité",
      "Analyse par division, produit, client ou entité",
      "Identification des risques, opportunités et leviers",
      "Valorisation indicative et cartographie des enjeux",
    ],
  },
  planification: {
    phaseNumber: "02",
    shortTitle: "Planifier",
    phaseTitle: "Phase 2 — Planifier",
    tagline: "Transformer la lecture en trajectoire",
    whatItDoes:
      "À partir de cette compréhension, nous structurons avec vous les scénarios, les priorités et le plan d'action. Chaque initiative est chiffrée : impact sur la performance, la trésorerie et la valeur — avant de vous engager.",
    whyItMatters:
      "Une ambition sans modèle reste une intention. La planification aligne les décisions, anticipe les besoins de liquidité et mesure l'effet de chaque levier sur la trajectoire de valeur.",
    description: "Scénarios, priorités et plan d'action vers l'objectif de valeur.",
    listLabel: "Ce sur quoi nous travaillons",
    items: [
      "Objectifs et priorités formalisés avec la direction",
      "Scénarios de croissance et de rentabilité",
      "Projections de revenus, dépenses et trésorerie",
      "Investissements, fonds de roulement et financement",
      "Mesure d'impact sur la valeur d'entreprise",
    ],
  },
  pilotage: {
    phaseNumber: "03",
    shortTitle: "Exécuter",
    phaseTitle: "Phase 3 — Exécuter",
    tagline: "Exécuter, suivre et ajuster le cap",
    whatItDoes:
      "Nous accompagnons la mise en œuvre : suivre le réel face au prévu, quantifier les écarts et documenter les ajustements. Les hypothèses, la trajectoire de valeur et la trésorerie restent à jour — pour corriger avant que l'écart ne s'installe.",
    whyItMatters:
      "Les plans dérapent : marché, coûts, timing. L'exécution transforme le plan en discipline de suivi — une boussole vivante pour garder le cap sur le rendement et la valeur.",
    description: "Suivi des écarts, ajustements et maintien de la trajectoire.",
    listLabel: "Ce sur quoi nous travaillons",
    items: [
      "Comparaison résultats vs objectifs et prévisions",
      "Analyse des écarts et actions correctives",
      "Mesure de l'impact des décisions sur la performance",
      "Recalibrage des hypothèses et du plan",
      "Maintien de l'entreprise sur la trajectoire retenue",
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
