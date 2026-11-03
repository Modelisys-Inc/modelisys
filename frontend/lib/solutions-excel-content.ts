export const EXCEL_PROBLEMS = [
  {
    title: "Multiples fichiers à gérer",
    body: "Des données dispersées dans plusieurs fichiers, difficiles à consolider.",
  },
  {
    title: "Tâches répétitives",
    body: "Des heures consacrées à copier, coller et modifier les mêmes données.",
  },
  {
    title: "Manque de visibilité",
    body: "Des rapports qui ne permettent pas de comprendre rapidement la performance.",
  },
  {
    title: "Suivi opérationnel complexe",
    body: "Difficulté à suivre les projets, les stocks, les coûts et les commandes.",
  },
  {
    title: "Consolidation manuelle",
    body: "Des informations qui proviennent de plusieurs divisions ou entités.",
  },
  {
    title: "Outils inadaptés",
    body: "Des fichiers existants qui ne répondent plus aux besoins de l’entreprise.",
  },
] as const

export const EXCEL_SOLUTIONS = [
  {
    id: "automatisation",
    number: "01",
    title: "Automatisation Excel",
    lead: "Le fichier refait le chemin que votre équipe répète chaque mois.",
    body: "Importer une balance, nettoyer des colonnes, recopier des opérations, puis mettre en forme le rapport : ces gestes sont déjà connus. L’automatisation les prend en charge. Plusieurs classeurs peuvent alimenter un seul suivi. Les macros et le VBA interviennent là où le même traitement revient, mois après mois, et où une erreur de copier-coller coûte du temps.",
    points: [
      "Automatisation de rapports",
      "Importation et traitement de données",
      "Consolidation de plusieurs fichiers",
      "Automatisation de tâches répétitives",
      "Macros et programmation VBA",
    ],
  },
  {
    id: "tableaux-de-bord",
    number: "02",
    title: "Tableaux de bord et analyse",
    lead: "Une lecture du mois, sans reconstruire le fichier.",
    body: "Le tableau de bord rend visibles les indicateurs, les ventes, les marges et les écarts. On y suit une division, un département ou une ligne d’affaires, puis, quand l’entreprise a plusieurs sociétés, chaque entité, le consolidé, les éliminations intercompagnies et les taux de change. Le reporting mensuel part de cette lecture, déjà prête pour la direction.",
    points: [
      "Indicateurs de performance",
      "Reporting financier mensuel",
      "Résultats par division, département ou ligne d’affaires",
      "Résultats par entité, consolidés, avec éliminations intercompagnies",
      "Prise en compte des taux de change",
    ],
  },
  {
    id: "outils-de-gestion",
    number: "03",
    title: "Outils de gestion personnalisés",
    lead: "Le prix, le stock ou le projet se calculent avec vos règles.",
    body: "Une soumission, un chantier, une commande ou un coût de revient n’entrent pas toujours dans un état financier. L’outil reprend vos propres règles — matériaux, heures, taux, frais — et montre la marge avant l’envoi. Le même principe sert à suivre les stocks, les commandes et la rentabilité de chaque projet, puis à voir où les coûts s’écartent.",
    points: [
      "Soumissions",
      "Gestion de projets",
      "Suivi des stocks et des commandes",
      "Calcul des coûts de revient",
      "Suivi de la rentabilité par projet",
    ],
  },
  {
    id: "modelisation",
    number: "04",
    title: "Modélisation financière",
    lead: "Une hypothèse change, la trajectoire se recalcule.",
    body: "Le modèle relie le budget, les prévisions et les décisions de financement. On y compare des scénarios et on voit l’effet sur le résultat, la trésorerie et la rentabilité. Il sert à préparer un exercice, à tester une embauche ou un investissement, et à garder une trajectoire que la direction peut revoir quand les hypothèses bougent.",
    points: [
      "Budgets et prévisions",
      "Projections de trésorerie",
      "Scénarios financiers",
      "Modèles de rentabilité",
      "Analyse de financement",
    ],
  },
] as const

export const EXCEL_STEPS = [
  {
    number: "01",
    title: "Compréhension des besoins",
    body: "Nous analysons vos processus actuels, vos fichiers et les objectifs recherchés.",
  },
  {
    number: "02",
    title: "Conception de la solution",
    body: "Nous définissons la structure de l’outil, les fonctionnalités et les automatisations nécessaires.",
  },
  {
    number: "03",
    title: "Développement et validation",
    body: "Nous développons la solution et effectuons les tests avec vos données et vos processus.",
  },
  {
    number: "04",
    title: "Livraison et accompagnement",
    body: "Nous vous remettons un outil documenté, avec formation et support selon vos besoins.",
  },
] as const

export const EXCEL_REASONS = [
  {
    title: "Une compréhension financière et opérationnelle",
    body: "Les fichiers sont conçus à partir des enjeux financiers, opérationnels et décisionnels d’une PME : lire un résultat, un écart ou une marge, puis s’en servir pour décider.",
  },
  {
    title: "Des solutions adaptées à votre réalité",
    body: "Chaque entreprise a ses processus. L’outil est bâti à partir de vos fichiers, de vos divisions et de votre façon de travailler.",
  },
  {
    title: "Une approche axée sur les résultats",
    body: "Chaque solution vise à réduire les manipulations, améliorer la qualité de l’information et faciliter la prise de décision.",
  },
] as const

export const EXCEL_FAQ = [
  {
    question: "Est-ce que vous pouvez modifier un fichier Excel existant ?",
    answer: [
      "Oui. Beaucoup de mandats partent du classeur que votre équipe utilise déjà, avec ses onglets, ses formules, ses sources et ses contraintes.",
      "On conserve ce qui fonctionne et on restructure ce qui ralentit le travail : imports manuels, mises en forme répétées, feuilles qui ne se parlent plus. Le fichier reste le vôtre. Votre équipe continue de l’ouvrir, avec moins de manipulations.",
    ],
  },
  {
    question: "Est-ce que vous développez des macros et des automatisations VBA ?",
    answer: [
      "Oui, lorsque le même traitement revient : importer une balance, nettoyer des colonnes, consolider des fichiers, mettre en forme le rapport.",
      "La macro ou le VBA prend ces gestes en charge là où un copier-coller coûte du temps ou introduit des erreurs. Quand un lien entre feuilles ou un tableau suffit, on s’arrête là. L’automatisation suit le processus, elle n’est pas ajoutée par défaut.",
    ],
  },
  {
    question: "Pouvez-vous connecter plusieurs fichiers Excel ?",
    answer: [
      "Oui. Les données peuvent venir de plusieurs classeurs — ventes, opérations, paie, filiales — puis être traitées dans un seul outil de consolidation ou de rapport.",
      "L’import est prévu pour se refaire au mois suivant, sans recopier les feuilles à la main. Le résultat peut alimenter un tableau de bord, un reporting mensuel ou un suivi par division.",
    ],
  },
  {
    question: "Est-ce que les outils peuvent être adaptés à plusieurs divisions ?",
    answer: [
      "Oui. Un même modèle peut suivre des divisions, des départements ou des lignes d’affaires, puis des entités : résultats individuels, consolidé, éliminations intercompagnies et taux de change.",
      "La lecture reste celle de la direction : un chiffre par entité, et le consolidé une fois les opérations internes retirées. Le modèle est adapté à votre structure.",
    ],
  },
  {
    question: "Est-ce que vous offrez du support après la livraison ?",
    answer: [
      "Oui. La livraison comprend un outil documenté et une formation, pour que votre équipe puisse produire le rapport sans nous.",
      "Le support ensuite est défini avec le mandat : questions au démarrage, ajustements quand un processus change, ou un suivi plus régulier. L’étendue est précisée avant le début des travaux. Chaque mandat est sur devis.",
    ],
  },
  {
    question: "Combien coûte le développement d’un outil personnalisé ?",
    answer: [
      "Chaque mandat est sur devis. Le montant dépend de la complexité, des fonctionnalités demandées, du nombre de fichiers ou d’entités, et du temps de développement.",
      "Reprendre un classeur existant et construire un modèle de consolidation multi-entités ne représentent pas le même travail. Nous regardons d’abord le fichier, le processus et le résultat attendu, puis nous vous remettons une proposition.",
    ],
  },
] as const

export const EXCEL_MARQUEE_ITEMS = [
  "Automatisation de rapports et de tâches répétitives",
  "Importation, traitement et consolidation de plusieurs fichiers",
  "Tableaux de bord et indicateurs de performance",
  "Reporting financier mensuel",
  "Résultats par division, département ou ligne d’affaires",
  "Résultats par entité, consolidés, avec éliminations intercompagnies",
  "Prise en compte des taux de change",
  "Soumissions, stocks, commandes et coûts de revient",
  "Suivi de la rentabilité par projet",
  "Budgets, prévisions et scénarios financiers",
  "Chaque mandat est sur devis",
] as const

export const EXCEL_PAGE_NAV = [
  { id: "situations", label: "Situations" },
  { id: "automatisation", label: "Automatisation" },
  { id: "tableaux-de-bord", label: "Tableaux de bord" },
  { id: "outils-de-gestion", label: "Outils de gestion" },
  { id: "modelisation", label: "Modélisation" },
  { id: "mandat", label: "Mandat" },
  { id: "pourquoi", label: "Pourquoi" },
  { id: "questions", label: "Questions" },
] as const
