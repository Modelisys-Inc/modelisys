export type ServiceId = "mandats" | "accompagnement" | "licence" | "developpement"

export type ServiceOffering = {
  title: string
  body: string
}

export type ServiceMarketingContent = {
  id: ServiceId
  number: string
  label: string
  tagline: string
  intro: string
  /** Phrase avant la liste (ex. « Selon vos besoins… » / « Nous pouvons notamment : »). */
  listLead?: string
  /** Blocs intitulés (mandats ponctuels). */
  offerings?: readonly ServiceOffering[]
  /** Liste à puces (Licence, Développement). */
  bullets?: readonly string[]
  /** Paragraphes après la liste. */
  afterList?: readonly string[]
  idealFor: string
}

export const SERVICE_MARKETING_ORDER: ServiceId[] = [
  "mandats",
  "accompagnement",
  "licence",
  "developpement",
]

export const SERVICE_LABELS: Record<ServiceId, string> = {
  mandats: "Mandats ponctuels",
  accompagnement: "Accompagnement financier",
  licence: "Licence",
  developpement: "Développement",
}

/** Anciens hash / identifiants marketing → services actuels. */
const LEGACY_SERVICE_ALIASES: Record<string, ServiceId> = {
  conseils: "mandats",
  "services-conseils": "mandats",
}

export const SERVICE_MARKETING_CONTENT: Record<ServiceId, ServiceMarketingContent> = {
  mandats: {
    id: "mandats",
    number: "01",
    label: "Mandats ponctuels",
    tagline: "Une question précise. Une analyse solide.",
    intro:
      "Diagnostic, projections ou valorisation — des interventions ciblées pour répondre à une question, sans engagement récurrent.",
    listLead: "Les mandats ponctuels peuvent prendre la forme de :",
    offerings: [
      {
        title: "Diagnostic de l’entreprise",
        body: "Une lecture claire de la performance, de la rentabilité, de la trésorerie, des risques et des leviers qui influencent la valeur — pour fixer un point de départ objectif.",
      },
      {
        title: "Projections financières",
        body: "Scénarios, prévisions et analyse d’impact sur les mois et années à venir : investissements, croissance, financement et trajectoire de valeur.",
      },
      {
        title: "Valorisation",
        body: "Analyse de la valeur à des fins de gestion : établir un repère, projeter son évolution, fixer un rendement cible et identifier les facteurs qui peuvent contribuer à l’atteindre.",
      },
    ],
    idealFor:
      "les dirigeants qui ont une question précise et ont besoin d’une analyse ponctuelle avant de décider.",
  },
  accompagnement: {
    id: "accompagnement",
    number: "02",
    label: "Accompagnement financier",
    tagline: "Un partenaire financier à temps partiel",
    intro:
      "Tenue, contrôle, performance, projections et valorisation — un partenaire dans le temps, sans recruter un directeur financier à temps plein.",
    listLead: "L’accompagnement financier relie notamment :",
    offerings: [
      {
        title: "Tenue de livres",
        body: "Clôture et états à jour — le point de départ de tout le reste.",
      },
      {
        title: "Contrôle financier",
        body: "Encaisse, seuils et revue des comptes, pour que les écarts apparaissent à temps.",
      },
      {
        title: "Revue de la performance",
        body: "Lecture mensuelle ou trimestrielle des leviers qui influencent la rentabilité et la valeur.",
      },
      {
        title: "Projections financières",
        body: "Comparaison du réel au plan, anticipation du cash et recalibrage des scénarios.",
      },
      {
        title: "Valorisation",
        body: "Valeur actuelle, valeur projetée et rendement cible — calés sur le même rythme.",
      },
    ],
    idealFor:
      "les entreprises qui ont besoin d’un partenaire financier récurrent, sans internaliser une fonction à temps plein.",
  },
  licence: {
    id: "licence",
    number: "03",
    label: "Licence",
    tagline: "Le moteur Excel Modelisys",
    intro:
      "Une infrastructure financière structurée permettant à votre équipe de réaliser ses analyses, projections, valorisation et suivis dans Excel.",
    listLead:
      "Le moteur est configuré selon la réalité financière de votre entreprise et peut notamment permettre de :",
    bullets: [
      "structurer et analyser les données financières ;",
      "suivre la performance historique et actuelle ;",
      "produire des analyses financières ;",
      "construire et mettre à jour des projections ;",
      "analyser la rentabilité, la trésorerie et la structure financière ;",
      "suivre certains indicateurs et leviers de création de valeur ;",
      "produire les analyses nécessaires à votre gestion.",
    ],
    afterList: [
      "Vous demeurez autonome dans l’utilisation du moteur, avec une formation technique permettant à votre équipe de comprendre son fonctionnement et de l’intégrer à ses processus.",
      "La licence est renouvelée annuellement et demeure adaptée à la configuration de votre entreprise.",
    ],
    idealFor:
      "les entreprises qui disposent des ressources nécessaires à l’interne et souhaitent bénéficier d’un moteur financier structuré sans externaliser leur gestion.",
  },
  developpement: {
    id: "developpement",
    number: "04",
    label: "Développement sur mesure",
    tagline: "Votre réalité ne correspond pas à un modèle standard ?",
    intro:
      "Quand le modèle standard ne suffit pas : on adapte un fichier existant, on en crée un, ou on étend le moteur Modelisys — dans Excel, selon votre réalité.",
    listLead: "Trois façons d’intervenir :",
    bullets: [
      "adapter un fichier Excel existant — le rendre fiable sans changer d’outil ;",
      "développer un nouveau modèle selon votre structure, vos données et vos analyses ;",
      "étendre le moteur Modelisys d’une analyse ou d’un rapport que le standard ne porte pas.",
    ],
    afterList: [
      "Le développement part d’un classeur existant, d’un besoin précis ou du moteur déjà en place. Le livrable reste un Excel que l’équipe peut faire vivre.",
    ],
    idealFor:
      "les entreprises dont le besoin ne rentre pas dans un modèle standard — fichier critique à sécuriser, modèle à créer, ou extension du moteur Modelisys.",
  },
}

export function getServiceHash(id: ServiceId): string {
  return `service-${id}`
}

export function parseServiceIdFromHash(hash: string): ServiceId | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash
  if (!raw.startsWith("service-")) return null
  const id = raw.slice("service-".length)
  if ((SERVICE_MARKETING_ORDER as string[]).includes(id)) return id as ServiceId
  return LEGACY_SERVICE_ALIASES[id] ?? null
}
