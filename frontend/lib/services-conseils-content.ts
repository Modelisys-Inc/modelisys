/**
 * Contenu marketing — page Mandats ponctuels.
 * Trois interventions ciblées + un cas illustratif propre à chacune
 * (Situation → Intervention → Résultat).
 */

export const SERVICES_CONSEILS_LINE_IDS = [
  "diagnostic",
  "projections",
  "valorisation",
] as const

export type ServicesConseilsLineId = (typeof SERVICES_CONSEILS_LINE_IDS)[number]

/** Cas illustratif d’une seule ligne de service — pas une mini étude de cas complète. */
export type ServicesConseilsCase = {
  profile: string
  title: string
  situation: string
  intervention: string
  result: string
  figures: readonly { label: string; value: string }[]
}

export type ServicesConseilsLine = {
  id: ServicesConseilsLineId
  number: string
  title: string
  lead: string
  body: string
  examples?: readonly string[]
  caseStudy: ServicesConseilsCase
}

export const SERVICES_CONSEILS_PAGE = {
  eyebrow: "Mandats ponctuels",
  title: "Une question précise. Une analyse solide.",
  intro:
    "Diagnostic, projections ou valorisation : Modelisys intervient le temps de répondre, sans engagement récurrent. Vous obtenez une lecture claire — puis vous décidez de la suite.",
} as const

export const SERVICES_CONSEILS_LINES: readonly ServicesConseilsLine[] = [
  {
    id: "diagnostic",
    number: "01",
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
    caseStudy: {
      profile: "Cabinet de services · 2 divisions",
      title: "Un diagnostic pour voir ce que les totaux masquaient",
      situation:
        "Le dirigeant voyait une entreprise « rentable » à 12 % de marge consolidée. Pourtant la trésorerie restait tendue et il ne savait pas quelle activité tirait réellement la performance.",
      intervention:
        "Le diagnostic a découpé la performance par division, réalloué les frais partagés et isolé les leviers de marge, de liquidité et de concentration client — sans projection ni mandat de suivi.",
      result:
        "Il a découvert que le conseil tournait à 18 % tandis que la technique affichait −4 %, avec 320 000 $ de frais mal alloués. Une lecture claire pour décider où agir — avant toute autre intervention.",
      figures: [
        { label: "Marge consolidée", value: "12 %" },
        { label: "Conseil", value: "18 %" },
        { label: "Technique", value: "−4 %" },
      ],
    },
  },
  {
    id: "projections",
    number: "02",
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
    caseStudy: {
      profile: "Manufacturière · décision d’acquisition",
      title: "Une projection pour décider avant d’acheter",
      situation:
        "Le dirigeant envisageait d’acquérir un concurrent et de fermer une division déficitaire. La question n’était plus « est-ce une bonne idée ? » mais « quel impact sur le cash, le financement et la valeur ? ».",
      intervention:
        "Modelisys a modélisé sur 24 mois les scénarios avec et sans acquisition, avec et sans fermeture : compte de résultat, FDR, capex et besoin de financement mois par mois.",
      result:
        "Il a vu qu’il faudrait 850 000 $ au moment de l’achat, et que la fermeture libérait 180 000 $ de trésorerie. La décision a été prise sur des chiffres — pas sur un ressenti.",
      figures: [
        { label: "Horizon", value: "24 mois" },
        { label: "Financement", value: "850 k$" },
        { label: "Cash libéré", value: "180 k$" },
      ],
    },
  },
  {
    id: "valorisation",
    number: "03",
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
    caseStudy: {
      profile: "Groupe familial · 4 sociétés",
      title: "Une valorisation pour aligner la famille sur une même lecture",
      situation:
        "Les actionnaires discutaient succession et éventuelle cession d’une filiale, mais chacun avait sa propre idée de « ce que vaut le groupe » — sans base commune ni facteurs de valeur partagés.",
      intervention:
        "L’analyse de valorisation a consolidé les quatre entités, normalisé le BAIIA, isolé les intercos et documenté les facteurs qui faisaient monter ou baisser la valeur de chaque société.",
      result:
        "Le groupe a été lu à 12 M$ — dont une filiale à −200 000 $/an. La famille a enfin pu parler de cession, de redressement ou de maintien avec les mêmes repères de valeur.",
      figures: [
        { label: "Valeur groupe", value: "12 M$" },
        { label: "Filiale faible", value: "−200 k$/an" },
        { label: "Intercos", value: "1,8 M$" },
      ],
    },
  },
]

export const SERVICES_CONSEILS_LINES_ORDER = SERVICES_CONSEILS_LINE_IDS
