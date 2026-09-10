import type { FeatureCategoryId } from "@/lib/feature-category-navigation"

export type FeatureCategoryMarketingContent = {
  id: FeatureCategoryId
  number: string
  label: string
  tagline: string
  /** Ce que la catégorie permet de faire. */
  whatItDoes: string
  /** Pourquoi c’est important pour la valeur / le rendement. */
  whyForValue: string
  /** Pourquoi cela existe dans Modelisys (rôle distinct de l’approche). */
  whyInModelisys: string
}

/**
 * Contenu marketing — section Fonctionnalités.
 * L’approche = le parcours (diagnostic → planification → pilotage).
 * Les fonctionnalités = les outils qui servent ce parcours, à tout moment.
 */
export const FEATURE_CATEGORY_MARKETING_CONTENT: Record<
  FeatureCategoryId,
  FeatureCategoryMarketingContent
> = {
  valorisation: {
    id: "valorisation",
    number: "01",
    label: "Valorisation",
    tagline: "Rendre le prix de l’entreprise lisible et défendable",
    whatItDoes:
      "Structurer une lecture de la valeur d’entreprise — BAIIA représentatif, multiples, ajustements, fourchette — et fixer un objectif de valeur chiffré que direction, CPA et partenaires peuvent partager.",
    whyForValue:
      "Sans repère de valeur, le rendement actionnaire reste abstrait : on ne sait ni d’où l’on part, ni ce qu’une décision fera monter ou baisser. La valorisation ancre le prix dont dépend votre rendement.",
    whyInModelisys:
      "Modelisys place la valorisation au centre du produit, pas en annexe Excel : c’est le chiffre que la hero met en avant, que le rendement décompose, et que l’approche diagnostique puis suit dans le temps.",
  },
  projections: {
    id: "projections",
    number: "02",
    label: "Projections",
    tagline: "Traduire les décisions en trajectoire chiffrée",
    whatItDoes:
      "Modéliser revenus, dépenses, fonds de roulement, capex, financement et trésorerie sur plusieurs années — puis comparer des scénarios avant de vous engager.",
    whyForValue:
      "La valeur future n’est pas une intention : elle dépend de flux, de marges et de liquidité. Les projections montrent si le rendement visé est finançable et réaliste — ou s’il reste une ambition sans modèle.",
    whyInModelisys:
      "Elles outillent la phase de planification de l’approche : là où le diagnostic a photographié le présent, les projections testent les chemins vers demain sans quitter la même base de données.",
  },
  analyse: {
    id: "analyse",
    number: "03",
    label: "Analyse",
    tagline: "Voir où la performance crée — ou détruit — de la valeur",
    whatItDoes:
      "Décortiquer la rentabilité, les ratios, le fonds de roulement et la contribution par division, produit ou client, à partir d’états à jour.",
    whyForValue:
      "Deux entreprises au même BAIIA ne valent pas pareil si le mix, le BFR ou le risque divergent. L’analyse révèle les leviers (croissance, marge, cash, capital, risque) qui font vraiment bouger le prix.",
    whyInModelisys:
      "Elle alimente le diagnostic et le pilotage : les mêmes leviers que la hero met en relation, lus en profondeur pour décider quoi corriger — pas seulement pour produire un tableau de plus.",
  },
  reporting: {
    id: "reporting",
    number: "04",
    label: "Reporting",
    tagline: "Confronter le réel au plan, mois après mois",
    whatItDoes:
      "Consolider les états, synchroniser la comptabilité et comparer le réel au passé, au scénario et à la trajectoire de valeur — y compris en multi-entités.",
    whyForValue:
      "Le rendement se construit dans le temps. Sans reporting fiable, l’écart entre prévu et réalisé reste invisible jusqu’à ce qu’il soit trop tard pour protéger la valeur ou la trésorerie.",
    whyInModelisys:
      "C’est l’outil du pilotage dans l’approche : la boucle qui transforme le modèle en boussole vivante, alignée sur le même fil que la valorisation et les projections.",
  },
  documentation: {
    id: "documentation",
    number: "05",
    label: "Documentation",
    tagline: "Rendre chaque chiffre traçable et partageable",
    whatItDoes:
      "Annoter les écarts, rattacher les pièces aux comptes, journaliser les modifications et collaborer avec comptable, banque ou expert en évaluation.",
    whyForValue:
      "Une valeur n’est crédible que si elle est défendable. Notes, preuves et historique transforment une estimation en conversation sérieuse avec un prêteur, un acheteur ou un CPA.",
    whyInModelisys:
      "Sans documentation, les autres modules restent fragiles hors de votre écran. Ici, la gouvernance suit le parcours — pour que la valeur et le rendement tiennent face à un regard externe.",
  },
}

export const FEATURE_CATEGORY_MARKETING_ORDER: FeatureCategoryId[] = [
  "valorisation",
  "projections",
  "analyse",
  "reporting",
  "documentation",
]
