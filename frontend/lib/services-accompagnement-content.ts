/**
 * Contenu marketing — page Accompagnement financier.
 * Les volets de l'accompagnement : les livres alimentent le contrôle, le
 * contrôle rend la performance lisible, la performance éclaire les projections,
 * les projections portent la valorisation, et la modélisation Excel traduit
 * une décision — pour le rendement et la valeur.
 */

export type ServicesAccompagnementOffering = {
  id: string
  number: string
  title: string
  lead: string
  body: string
  feeds: string
  examples: readonly string[]
}

export type ServicesAccompagnementCase = {
  id: string
  tabLabel: string
  profile: string
  title: string
  situation: string
  intervention: string
  result: string
  figures: readonly { label: string; value: string }[]
}

export const SERVICES_ACCOMPAGNEMENT_PAGE = {
  eyebrow: "Accompagnement financier",
  title: "Un accompagnement financier innovant",
  intro:
    "Un accompagnement tourné vers l’optimisation du rendement et l’augmentation de la valeur de l’entreprise — sans recruter un directeur financier à temps plein. Les livres alimentent le contrôle, le contrôle rend la performance lisible, la performance éclaire les projections, et les projections portent la valorisation.",
  allowsLead:
    "Chaque volet peut se prendre seul. Les livres alimentent le contrôle, la performance éclaire les projections, et la modélisation Excel traduit une décision — pour le rendement et la valeur.",
} as const

export const SERVICES_ACCOMPAGNEMENT_OFFERINGS: readonly ServicesAccompagnementOffering[] = [
  {
    id: "tenue",
    number: "01",
    title: "Tenue de livres",
    lead: "Des livres à jour, au rythme de l’entreprise.",
    body: "Sans clôture fiable, le contrôle, la revue et les projections restent des opinions. L’accompagnement pose d’abord une tenue de livres régulière — pour que chaque décision parte des mêmes chiffres.",
    feeds: "Alimente le contrôle financier : on ne contrôle que ce qui est saisi, rapproché et clos.",
    examples: [
      "Clôture mensuelle",
      "Rapprochements bancaires et de comptes",
      "États financiers à jour",
      "Suivi des comptes clients et fournisseurs",
    ],
  },
  {
    id: "controle",
    number: "02",
    title: "Contrôle financier",
    lead: "S’assurer que les chiffres sont justes — et que les écarts apparaissent à temps.",
    body: "Le contrôle s’appuie sur les livres : encaisse, seuils, revue des comptes, cohérence des clôtures. C’est ce qui transforme une tenue en information de gestion, avant d’ouvrir la revue de performance.",
    feeds: "Rend la revue de performance possible : on lit des écarts réels, pas des approximations.",
    examples: [
      "Suivi de l’encaisse et des décaissements",
      "Seuils d’alerte",
      "Revue des comptes et des écarts",
      "Cohérence de la clôture",
    ],
  },
  {
    id: "performance",
    number: "03",
    title: "Revue de la performance",
    lead: "Lire ce qui se passe, chaque mois ou chaque trimestre.",
    body: "Une fois les chiffres contrôlés, la revue isole les leviers : marges, activités, liquidité, frais. Elle dit ce qui crée de la valeur — et ce qui la détruit — pour que les projections partent d’un réel compris.",
    feeds: "Éclaire les projections : le plan se calibre sur ce que la revue a réellement vu.",
    examples: [
      "Résultats vs période précédente",
      "Marges par activité ou division",
      "Leviers de rentabilité et de liquidité",
      "Écarts vs période et vs plan",
    ],
  },
  {
    id: "projections",
    number: "04",
    title: "Projections financières",
    lead: "Comparer le réel au plan avant que l’écart ne devienne une crise.",
    body: "Les projections reprennent la revue : scénarios, trésorerie, investissements, financement. Chaque mois, le réel vient du contrôle et de la performance — puis le plan est recalibré.",
    feeds: "Porte la valorisation : la valeur projetée et le rendement cible ne valent que si le plan est vivant.",
    examples: [
      "Réel vs plan",
      "Scénarios de croissance ou de tension",
      "Trésorerie projetée",
      "Besoins de financement et d’investissement",
    ],
  },
  {
    id: "valorisation",
    number: "05",
    title: "Valorisation",
    lead: "Relier la performance et le plan à la valeur — et au rendement visé.",
    body: "La valorisation à des fins de gestion traduit livres, contrôle, revue et projections en valeur actuelle, valeur projetée et rendement cible. L’objectif de valeur revient ensuite informer ce qu’il faut clôturer, contrôler et revoir le mois suivant.",
    feeds: "Ferme la boucle : le rendement cible dicte les seuils, les leviers et les ajustements du plan.",
    examples: [
      "Valeur à des fins de gestion",
      "Projection de la valeur",
      "Rendement cible",
      "Fourchette de valeur pour le suivi interne",
    ],
  },
  {
    id: "modelisation",
    number: "06",
    title: "Modélisation financière",
    lead: "Développer des modèles Excel adaptés à votre réalité.",
    body: "Quand un suivi a besoin d’un modèle — tableau de bord, scénario, coût ou simulation — l’accompagnement développe un Excel que votre équipe peut faire vivre avec le mois.",
    feeds: "Prolonge les autres volets : le modèle reprend les chiffres validés et les traduit en impact.",
    examples: [
      "Modèles Excel sur mesure",
      "Scénarios et simulations",
      "Tableaux de bord de gestion",
      "Impact d’une décision sur le cash, le résultat et la valeur",
    ],
  },
]

export const SERVICES_ACCOMPAGNEMENT_STEPS = [
  {
    title: "Cadrage",
    body: "On fixe le rythme de clôture, les contrôles, les indicateurs de performance et l’objectif de valeur que l’accompagnement doit éclairer.",
  },
  {
    title: "Revue récurrente",
    body: "Chaque mois ou chaque trimestre, la même chaîne : livres → contrôle → performance → réel vs plan → valeur projetée.",
  },
  {
    title: "Ajustement",
    body: "Dès qu’un écart apparaît, les projections et la trajectoire de valeur sont recalibrées — avant que la clôture annuelle ne le révèle trop tard.",
  },
] as const

export const SERVICES_ACCOMPAGNEMENT_CASES: readonly ServicesAccompagnementCase[] = [
  {
    id: "tenue",
    tabLabel: "Tenue de livres",
    profile: "Commerce de gros · clôture irrégulière",
    title: "Remettre les livres à l’heure pour décider sur des chiffres",
    situation:
      "La clôture prenait six à huit semaines. L’encaisse surprenait le dirigeant, les rapprochements étaient partiels et aucune revue de performance n’était fiable — les totaux arrivaient trop tard pour agir.",
    intervention:
      "L’accompagnement a d’abord posé une tenue mensuelle, des rapprochements et un contrôle d’encaisse. Une fois les livres clos à temps, le contrôle a pu ouvrir une première revue de performance.",
    result:
      "La clôture est passée à 12 jours. Un écart d’encaisse de 180 000 $ — invisible jusque-là — est apparu dès le deuxième mois. Le dirigeant a enfin pu lire la performance sur des chiffres à jour.",
    figures: [
      { label: "Clôture", value: "12 j" },
      { label: "Écart encaisse", value: "180 k$" },
      { label: "Rythme", value: "Mensuel" },
    ],
  },
  {
    id: "performance",
    tabLabel: "Performance",
    profile: "Cabinet de services · 3 équipes",
    title: "Une revue mensuelle pour voir quelle équipe crée vraiment la valeur",
    situation:
      "Le consolidé affichait 11 % de marge. Le dirigeant pensait que tout le cabinet « tenait ». Sans revue par équipe, il ne voyait pas que le soutien opérationnel creusait ce que l’implémentation générait.",
    intervention:
      "Livres et contrôle en place, la revue mensuelle a découpé la performance par équipe, réalloué 410 000 $ de frais partagés et suivi les leviers de marge — puis alimenté les projections par activité.",
    result:
      "L’implémentation tournait à 21 %, le soutien à −9 %. La projection a été recalibrée sur les deux équipes rentables. La valorisation interne a cessé de traiter le cabinet comme un seul bloc.",
    figures: [
      { label: "Consolidé", value: "11 %" },
      { label: "Implémentation", value: "21 %" },
      { label: "Soutien", value: "−9 %" },
    ],
  },
  {
    id: "projections",
    tabLabel: "Projections",
    profile: "Entreprise cyclique · suivi mensuel",
    title: "Un accompagnement pour corriger avant la crise de cash",
    situation:
      "L’entreprise avait déjà un bon diagnostic et un plan. Ce qui manquait : un rythme pour comparer le réel au plan chaque mois, avant que le creux de cycle ne force une décision dans l’urgence.",
    intervention:
      "L’accompagnement mensuel a enchaîné contrôle d’encaisse, revue de performance et écarts vs projection. Dès qu’un signal apparaissait, le plan et les actions étaient revus avec le dirigeant.",
    result:
      "Quand les matières ont grimpé de 12 % vs plan, l’écart de cash a été visible immédiatement. Capex reporté, DSO resserré, marge de crédit négociée — avant que le creux ne devienne une crise.",
    figures: [
      { label: "Rythme", value: "Mensuel" },
      { label: "Seuil cash", value: "600 k$" },
      { label: "Écart matières", value: "+12 %" },
    ],
  },
  {
    id: "valorisation",
    tabLabel: "Valorisation",
    profile: "Manufacturière familiale · objectif 3 ans",
    title: "Relier chaque écart mensuel au rendement cible",
    situation:
      "La famille connaissait une valeur de gestion d’environ 6,4 M$. Elle visait 9 M$ et un rendement de 14 % — sans lien entre les résultats du mois et cette trajectoire.",
    intervention:
      "Chaque revue a mis à jour la performance, puis les projections, puis la valeur projetée vs le rendement cible. Les seuils d’alerte du contrôle ont été calés sur l’écart à cette trajectoire.",
    result:
      "Au huitième mois, l’écart à la cible valait −0,4 M$. Pricing sur deux contrats et capex reporté : la valeur projetée est revenue dans le corridor vers 9 M$. Le rendement n’était plus une intention — il avait un suivi.",
    figures: [
      { label: "Valeur", value: "6,4 M$" },
      { label: "Cible", value: "9 M$" },
      { label: "Rendement", value: "14 %" },
    ],
  },
]
