export type ServicesPagePillarId = "mandats" | "accompagnement" | "licence" | "developpement"

export type ServicesPageOffering = {
  title: string
  lead: string
  body: string
  examples?: readonly string[]
}

export type ServicesPageCase = {
  id?: string
  tabLabel?: string
  profile?: string
  title: string
  situation?: string
  intervention?: string
  problem?: string
  analysis?: string
  result?: string
  body?: string
  allowed?: string
  figures?: readonly { label: string; value: string }[]
}

export type ServicesPagePillar = {
  id: ServicesPagePillarId
  number: string
  label: string
  tagline: string
  intro: string
  /** Second paragraphe — distingue cette offre des autres (ex. licence vs sur-mesure). */
  afterIntro?: string
  idealFor?: string
  offeringsLead?: string
  offerings?: readonly ServicesPageOffering[]
  whenHeading?: string
  whenItems?: readonly string[]
  structureItems?: readonly string[]
  steps?: readonly { title: string; body: string }[]
  categories?: readonly { title: string; body: string }[]
  cases: readonly ServicesPageCase[]
}

export const SERVICES_PAGE_INTRO = {
  eyebrow: "Services",
  title:
    "Des services financiers conçus pour comprendre votre entreprise, planifier vos décisions et agir sur les leviers qui influencent sa performance et sa valeur.",
  body: null,
} as const

export const SERVICES_PAGE_PILLARS: readonly ServicesPagePillar[] = [
  {
    id: "mandats",
    number: "01",
    label: "Mandats ponctuels",
    tagline: "Une question précise. Une analyse solide.",
    intro:
      "Diagnostic, projections ou valorisation : Modelisys intervient le temps de répondre à une question, sans engagement récurrent.",
    offerings: [
      {
        title: "Diagnostic",
        lead: "Comprendre ce qui se passe réellement dans l’entreprise.",
        body: "Analyse de la performance, de la rentabilité, de la trésorerie, de la structure financière et des principaux leviers de création de valeur.",
        examples: [
          "Diagnostic financier annuel",
          "Analyse de performance",
          "Analyse des marges",
          "Analyse de la structure financière",
          "Analyse des principaux leviers de création de valeur",
        ],
      },
      {
        title: "Projections",
        lead: "Comprendre ce qui pourrait arriver avant de prendre une décision.",
        body: "Modélisation de différents scénarios pour mesurer l’impact financier des décisions et des changements prévus.",
        examples: [
          "Projection financière 12 à 36 mois",
          "Scénarios de croissance",
          "Plan d’investissement",
          "Analyse d’une embauche",
          "Acquisition d’équipement",
          "Acquisition d’entreprise",
          "Besoins de financement",
        ],
      },
      {
        title: "Valorisation",
        lead: "Comprendre la valeur actuelle, sa projection et le rendement visé.",
        body: "Analyse de la valeur à des fins de gestion : établir un repère, projeter son évolution, fixer un rendement cible et identifier les facteurs qui peuvent contribuer à l’atteindre.",
        examples: [
          "Établir une valeur à des fins de gestion",
          "Analyse des principaux risques du modèle d’affaires",
          "Identification des facteurs de création de valeur",
          "Valeur comptable ajustée",
          "Projection de la valeur",
          "Rendement cible",
          "Fourchette de valeur pour le suivi interne",
        ],
      },
    ],
    cases: [],
  },
  {
    id: "accompagnement",
    number: "02",
    label: "Accompagnement financier",
    tagline: "Un partenaire financier à temps partiel",
    intro:
      "Un relais senior, au rythme de l’entreprise — sans recruter un directeur financier à temps plein. Les livres alimentent le contrôle, le contrôle rend la performance lisible, la performance éclaire les projections, et les projections portent la valorisation.",
    offerings: [
      {
        title: "Tenue de livres",
        lead: "Des livres à jour, au rythme de l’entreprise.",
        body: "Sans clôture fiable, le reste reste une opinion. L’accompagnement pose d’abord une tenue régulière.",
        examples: [
          "Clôture mensuelle",
          "Rapprochements bancaires et de comptes",
          "États financiers à jour",
        ],
      },
      {
        title: "Contrôle financier",
        lead: "S’assurer que les chiffres sont justes — et que les écarts apparaissent à temps.",
        body: "Le contrôle s’appuie sur les livres : encaisse, seuils, revue des comptes. Il rend la performance lisible.",
        examples: [
          "Suivi de l’encaisse et des décaissements",
          "Seuils d’alerte",
          "Revue des comptes et des écarts",
        ],
      },
      {
        title: "Revue de la performance",
        lead: "Lire ce qui se passe, chaque mois ou chaque trimestre.",
        body: "Une fois les chiffres contrôlés, la revue isole les leviers — puis alimente les projections.",
        examples: [
          "Résultats vs période précédente",
          "Marges par activité ou division",
          "Leviers de rentabilité et de liquidité",
        ],
      },
      {
        title: "Projections financières",
        lead: "Comparer le réel au plan avant que l’écart ne devienne une crise.",
        body: "Le réel vient du contrôle et de la revue. Le plan est recalibré — et porte la valorisation.",
        examples: [
          "Réel vs plan",
          "Trésorerie projetée",
          "Besoins de financement et d’investissement",
        ],
      },
      {
        title: "Valorisation",
        lead: "Relier la performance et le plan à la valeur — et au rendement visé.",
        body: "Valeur actuelle, valeur projetée et rendement cible. L’objectif revient informer le mois suivant.",
        examples: [
          "Valeur à des fins de gestion",
          "Projection de la valeur",
          "Rendement cible",
        ],
      },
    ],
    cases: [],
  },
  {
    id: "licence",
    number: "03",
    label: "Licence",
    tagline: "Le moteur Excel Modelisys",
    intro:
      "Une infrastructure financière structurée permettant à votre équipe de réaliser ses analyses, projections, valorisation et suivis dans Excel.",
    structureItems: [
      "Données financières",
      "États financiers",
      "Performance",
      "Structure financière",
      "Trésorerie",
      "Fonds de roulement",
      "Projections",
      "Analyses par division",
      "Indicateurs financiers",
      "Valorisation / création de valeur",
      "Rapports de gestion",
    ],
    steps: [
      {
        title: "Implantation",
        body: "Configuration du moteur selon la structure financière de l’entreprise.",
      },
      {
        title: "Formation",
        body: "Formation technique de l’équipe.",
      },
      {
        title: "Utilisation",
        body: "L’équipe utilise le moteur dans ses processus financiers.",
      },
      {
        title: "Renouvellement et évolution",
        body: "La licence est renouvelée annuellement et le moteur peut évoluer selon les besoins.",
      },
    ],
    cases: [
      {
        id: "multi-entites",
        tabLabel: "Multi-entités",
        profile: "Groupe · 6 sociétés",
        title: "Groupe de 6 entités",
        situation:
          "Six sociétés, six classeurs Excel. La direction n’avait pas de consolidation fiable : chaque entité suivait sa propre structure, et le groupe se recomposait à la main à chaque trimestre.",
        intervention:
          "Modelisys a configuré les moteurs Entity et Consolidated selon le plan comptable du groupe — sans remplacer Excel. L’équipe a été formée à alimenter chaque entité, puis à lire la consolidation.",
        result:
          "Chaque société a sa propre lecture. Le groupe se consolide dans le même moteur. L’équipe interne produit le suivi — plus de recopie entre fichiers.",
        figures: [
          { label: "Entités", value: "6" },
          { label: "Moteurs", value: "Entity + Consol" },
          { label: "Outil", value: "Excel" },
        ],
      },
      {
        id: "autonomie",
        tabLabel: "Autonomie",
        profile: "Manufacturière · équipe finance",
        title: "L’équipe reprend le rythme mensuel",
        situation:
          "La performance et les projections arrivaient une fois par trimestre, souvent d’un fichier externe. Entre deux livraisons, la direction pilotait sans mise à jour — et sans autonomie.",
        intervention:
          "La licence a posé le moteur (données, états, projections) et formé l’équipe à la clôture mensuelle. Le même fichier sert ensuite à comparer le réel au plan.",
        result:
          "L’équipe met à jour le moteur en deux jours après la clôture. Performance et projections sont disponibles le mois même — sans attendre un intervenant externe.",
        figures: [
          { label: "Rythme", value: "Mensuel" },
          { label: "Mise à jour", value: "2 jours" },
          { label: "Équipe", value: "Interne" },
        ],
      },
      {
        id: "valorisation",
        tabLabel: "Valorisation",
        profile: "PME de services · direction",
        title: "Relier le moteur à la valeur, chaque mois",
        situation:
          "Une valorisation avait été livrée une fois, en PDF. Elle n’était plus branchée sur les chiffres du mois. Le rendement cible restait une intention, déconnectée du moteur de gestion.",
        intervention:
          "Le moteur a été configuré pour enchaîner performance, projections et valorisation à des fins de gestion. L’équipe met à jour les données ; la valeur projetée et le rendement se recalculent.",
        result:
          "La valeur de gestion (4,8 M$) et la cible (6,5 M$) vivent dans le même Excel que les états. Quand le mois change, la trajectoire de valeur change avec lui.",
        figures: [
          { label: "Valeur", value: "4,8 M$" },
          { label: "Cible", value: "6,5 M$" },
          { label: "MAJ", value: "Mensuelle" },
        ],
      },
    ],
  },
  {
    id: "developpement",
    number: "04",
    label: "Développement sur mesure",
    tagline: "Votre réalité ne correspond pas à un modèle standard ?",
    intro:
      "Quand le modèle standard ne couvre pas votre structure, vos données ou l’analyse dont vous avez besoin, nous construisons ou adaptons le fichier — dans Excel, branché sur votre réalité.",
    afterIntro:
      "La licence pose le moteur standard Modelisys, prêt à l’emploi. Le développement commence ailleurs : un classeur que l’équipe utilise déjà, un besoin que ce moteur ne porte pas, ou une analyse trop spécifique pour un modèle générique.",
    idealFor:
      "les entreprises dont le besoin ne rentre pas dans un modèle standard — fichier critique à sécuriser, modèle à créer, ou extension du moteur Modelisys.",
    whenHeading: "Quand le sur-mesure s’impose",
    whenItems: [
      "Un classeur Excel critique que personne n’ose modifier",
      "Un processus mensuel encore fait à la main — copier-coller, consolidations",
      "Plusieurs sociétés ou divisions sans consolidation fiable",
      "Une analyse par contrat, client ou projet que le moteur standard ne porte pas",
      "Un rapport pour le conseil, le financement ou un partenaire",
      "Un pont entre vos fichiers sources et la lecture de gestion",
    ],
    offeringsLead:
      "Trois façons d’intervenir — selon que vous partez d’un fichier existant, d’un besoin encore sans modèle, ou du moteur Modelisys.",
    offerings: [
      {
        title: "Adapter",
        lead: "Partir de ce que l’équipe utilise déjà.",
        body: "Un fichier Excel manuel, fragile ou trop personnel devient un modèle structuré — mêmes réflexes, moins de risque. On ne change pas l’outil : on le rend fiable et réutilisable.",
        examples: [
          "Stabiliser un classeur existant",
          "Automatiser des copier-coller et des consolidations manuelles",
          "Relier les onglets et les sources",
          "Documenter les hypothèses et les contrôles",
        ],
      },
      {
        title: "Développer",
        lead: "Créer un modèle qui n’existe pas encore.",
        body: "Nouveau modèle selon votre structure, vos données, vos processus et les analyses que vous voulez produire. Le livrable reste un Excel que l’équipe peut faire vivre.",
        examples: [
          "Modèle financier multi-entités ou multi-divisions",
          "Consolidation de groupe",
          "Budget, projections et suivi réel vs plan",
          "Rapport de gestion récurrent",
        ],
      },
      {
        title: "Étendre",
        lead: "Ajouter ce que le moteur standard ne fait pas.",
        body: "Une analyse ou un rapport sur mesure, branché sur le moteur Modelisys ou sur le fichier déjà en place. L’extension répond à une question précise — sans tout reconstruire.",
        examples: [
          "Analyse par contrat, client ou projet",
          "Rapport pour le conseil ou le financement",
          "Indicateur métier spécifique",
          "Pont vers un fichier ou une source existante",
        ],
      },
    ],
    steps: [
      {
        title: "Cadrage",
        body: "On fixe le besoin, les données disponibles, le livrable et qui fera vivre le modèle après la remise.",
      },
      {
        title: "Construction",
        body: "Le modèle est construit ou adapté par itérations — structure, calculs, contrôles — jusqu’à ce qu’il reproduise votre réalité.",
      },
      {
        title: "Transfert",
        body: "Formation et documentation : l’équipe reprend le fichier. Le développement n’est pas un classeur que seul l’auteur comprend.",
      },
    ],
    cases: [
      {
        id: "automatiser",
        tabLabel: "Automatiser",
        profile: "Distributeur · processus mensuel",
        title: "Automatisation d’un processus financier existant",
        situation:
          "Chaque mois, l’équipe recopiait des extraits dans un classeur de 40 onglets. Une formule cassée retardait la clôture ; personne n’osait toucher au fichier du fondateur.",
        intervention:
          "Le classeur a été repris tel quel : sources reliées, contrôles ajoutés, consolidations automatisées. L’équipe a gardé Excel et ses habitudes — plus les copier-coller.",
        result:
          "La mise à jour mensuelle est passée de deux jours à une demi-journée. Le même fichier produit le suivi, sans dépendre d’une seule personne.",
        figures: [
          { label: "Avant", value: "2 jours" },
          { label: "Après", value: "0,5 j" },
          { label: "Outil", value: "Excel" },
        ],
      },
      {
        id: "multi-entites",
        tabLabel: "Multi-entités",
        profile: "Groupe · 4 sociétés, 2 divisions",
        title: "Modèle financier multi-entités",
        situation:
          "Quatre sociétés et deux divisions, chacune dans son fichier. La consolidation du groupe prenait une semaine et restait contestée : les structures ne s’alignaient pas.",
        intervention:
          "Un modèle unique a été développé : lecture par société, par division, puis consolidation. Les règles d’élimination et les clés de répartition sont dans le fichier, pas dans un courriel.",
        result:
          "Le groupe se lit en une structure. Chaque entité garde sa vue ; la direction a enfin un consolidé reproductible d’un mois à l’autre.",
        figures: [
          { label: "Sociétés", value: "4" },
          { label: "Divisions", value: "2" },
          { label: "Consolidation", value: "1 modèle" },
        ],
      },
      {
        id: "analyse",
        tabLabel: "Analyse",
        profile: "Services · rentabilité par mandat",
        title: "Développement d’une analyse spécifique",
        situation:
          "Les états montraient une marge consolidée saine. La direction voulait la rentabilité par mandat — le moteur standard ne portait pas ce découpage.",
        intervention:
          "Une analyse sur mesure a été branchée sur la structure existante : revenus et coûts par mandat, frais partagés, contribution. Le rapport se met à jour avec la clôture.",
        result:
          "Trois mandats « rentables » affichaient une contribution négative une fois les frais alloués. Le rapport mensuel sert maintenant à décider quels mandats garder, renégocier ou quitter.",
        figures: [
          { label: "Mandats", value: "18" },
          { label: "Découverte", value: "3 à perte" },
          { label: "Rythme", value: "Mensuel" },
        ],
      },
    ],
  },
]

export const SERVICES_PAGE_CLOSING = {
  title: "Une intervention adaptée à votre situation",
  body: "Vous n’avez pas nécessairement besoin d’un accompagnement permanent. Parfois, une question précise nécessite simplement une analyse solide. Parfois, l’entreprise a besoin d’un partenaire financier dans le temps. Modelisys intervient au niveau dont votre entreprise a réellement besoin.",
  choices: [
    {
      id: "mandats" as const,
      label: "Mandats ponctuels",
      detail: "Diagnostic · Projections · Valorisation",
    },
    {
      id: "accompagnement" as const,
      label: "Accompagnement financier",
      detail: "Tenue · Contrôle · Performance · Projections · Valorisation",
    },
    {
      id: "licence" as const,
      label: "Licence",
      detail: "Moteur Excel Modelisys · Formation · Autonomie",
    },
    {
      id: "developpement" as const,
      label: "Développement sur mesure",
      detail: "Adapter · Développer · Étendre",
    },
  ],
} as const

/** Chemins dédiés sous `/services/…` (landing « Découvrir », sitemap, liens croisés). */
export const SERVICES_PAGE_SLUGS: Record<ServicesPagePillarId, string> = {
  mandats: "mandats-ponctuels",
  accompagnement: "accompagnement-financier",
  licence: "licences",
  developpement: "developpement-sur-mesure",
}

const LEGACY_SLUGS: Record<string, ServicesPagePillarId> = {
  "services-conseils": "mandats",
}

export function getServicePagePath(id: ServicesPagePillarId): string {
  return `/services/${SERVICES_PAGE_SLUGS[id]}`
}

export function getServicesPillarBySlug(slug: string): ServicesPagePillar | null {
  const fromLegacy = LEGACY_SLUGS[slug]
  if (fromLegacy) {
    return SERVICES_PAGE_PILLARS.find((p) => p.id === fromLegacy) ?? null
  }
  const entry = (Object.entries(SERVICES_PAGE_SLUGS) as [ServicesPagePillarId, string][]).find(
    ([, s]) => s === slug,
  )
  if (!entry) return null
  return SERVICES_PAGE_PILLARS.find((p) => p.id === entry[0]) ?? null
}

export function getAllServicePageSlugs(): string[] {
  return [...Object.values(SERVICES_PAGE_SLUGS), ...Object.keys(LEGACY_SLUGS)]
}
