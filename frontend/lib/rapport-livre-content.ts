export const RAPPORT_FAQ = [
  {
    question: "Qu’est-ce que ce rapport ?",
    answer: [
      "C’est un exemple de diagnostic financier et de planification remis à la direction. L’entreprise présentée, Entreprise Inc., est illustrative.",
      "Chaque chapitre s’ouvre sur une page du rapport. La note à côté explique ce que la page représente, et la discussion qu’on en aurait eue avec les dirigeants.",
    ],
  },
  {
    question: "Que couvre le diagnostic ?",
    answer: [
      "Le diagnostic porte sur la performance financière, les enjeux et les occasions d’amélioration, la trésorerie et le fonds de roulement, des projections et des scénarios, une analyse illustrative de prix, puis des recommandations et des priorités d’action.",
      "Dans l’exemple, ces sujets se lisent en sept chapitres : sommaire, aperçu de la Société, performance, situation financière, trajectoire, valorisation et plan d’action.",
    ],
  },
  {
    question: "Le prix illustratif est-il un prix de vente ?",
    answer: [
      "Non. L’analyse de prix est illustrative. Elle donne un ordre de grandeur pour en discuter avec les actionnaires. Elle n’est ni une offre, ni un prix de transaction.",
      "Dans l’exemple d’Entreprise Inc., la fourchette retenue pour les actions va de 2,7 à 4,3 M$.",
    ],
  },
  {
    question: "Combien coûte le diagnostic ?",
    answer: [
      "Le diagnostic financier et la planification commencent à 3 500 $.",
      "Ce mandat est distinct de l’accompagnement financier fractionnaire, qui commence à 750 $ par mois. L’implantation initiale et le diagnostic de démarrage ne sont pas inclus dans ce forfait.",
    ],
  },
  {
    question: "Que se passe-t-il une fois le diagnostic remis ?",
    answer: [
      "Le rapport se termine sur un plan d’action : les enjeux, les priorités et les décisions attendues de la direction.",
      "La suite peut être un accompagnement financier fractionnaire, avec un suivi périodique de la performance, de la trésorerie et de la valeur. Ce suivi fait l’objet d’un mandat distinct, adapté à la structure et à la complexité de l’entreprise.",
    ],
  },
] as const

export const RAPPORT_MARQUEE_ITEMS = [
  "Sommaire exécutif",
  "Performance par division",
  "Trésorerie et fonds de roulement",
  "Trajectoire et projections",
  "Analyse illustrative de prix",
  "Plan d’action",
  "Une lecture avec la direction",
  "De la performance à la décision",
] as const

export type ReportLeaf = {
  page: number
  title: string
  explanation: string
  discussion: string
}

export type ReportChapter = {
  id: string
  index: string
  label: string
  leaves: readonly ReportLeaf[]
}

export const REPORT_CHAPTERS: readonly ReportChapter[] = [
  {
    id: "sommaire",
    index: "01",
    label: "Sommaire exécutif",
    leaves: [
      {
        page: 6,
        title: "Sommaire exécutif",
        explanation:
          "Cette page tient le rapport en une vue. Cinq repères résument l’exercice 2025 : des revenus de 2 979 k$, un BAIIA de 670 k$, un bénéfice net de 538 k$, une encaisse de 1 291 k$ et un prix illustratif des actions de 2,7 à 4,3 M$. Le tableau de bord, en dessous, montre que la progression vient de loin : la marge de BAIIA passe de 0,8 % en 2021 à 22,5 %.",
        discussion:
          "Nous nous sommes arrêtés d’abord sur cette marge, pas sur le chiffre d’affaires. La direction et nous y avons lu la même chose : la croissance compte, mais c’est sa conversion en résultat qui change la lecture de l’entreprise. Le « mot de la direction », laissé en réserve sur la page, reste l’endroit où le dirigeant pose le contexte de l’exercice dans ses propres mots.",
      },
      {
        page: 7,
        title: "Sommaire exécutif, suite",
        explanation:
          "La suite répartit le résultat et ouvre la suite du rapport. Software produit 70,6 % des revenus avec une marge de BAIIA de 28,2 %. Conseil, à 7,2 %, dilue la marge consolidée. Le scénario retenu ralentit ensuite la croissance à 5 % par année jusqu’en 2028, contre un taux composé de 17,5 % depuis 2021. Trois priorités ferment la page : l’encaisse excédentaire de 1,08 M$, la prudence du plan, et la dépendance envers Software.",
        discussion:
          "La discussion a porté sur ces trois priorités, pas sur le détail des colonnes. La direction ne veut pas laisser l’excédent sans affectation. Elle assume aussi un plan plus lent que l’historique, et elle reconnaît que Software reste le point à surveiller. Nous avons convenu d’y revenir dans le plan d’action, plutôt que de trancher dès le sommaire.",
      },
    ],
  },
  {
    id: "apercu",
    index: "02",
    label: "Aperçu de la Société",
    leaves: [
      {
        page: 9,
        title: "Aperçu de la Société",
        explanation:
          "Avant les graphiques, cette page situe l’entreprise. Entreprise Inc. est une société technologique québécoise, constituée en 2020, avec deux divisions : une plateforme Software vendue par abonnement, et une division Conseil. Environ 35 % des revenus sont récurrents, les abonnements annuels sont facturés d’avance, et aucun client ne dépasse 10 % des revenus.",
        discussion:
          "Nous avons relu avec la direction la part récurrente et la facturation d’avance. C’est elle qui explique, plus loin, une partie du fonds de roulement favorable. La direction a confirmé que le portrait de la clientèle n’a pas bougé : des PME, surtout au Québec, sans concentration majeure. Le cadre était posé. Nous pouvions passer aux risques.",
      },
      {
        page: 10,
        title: "Modèle d’affaires et risques",
        explanation:
          "Le modèle est ensuite relu comme un profil de risques. Deux sujets sont cotés élevés : la concentration des clients, puis la durée et la récurrence des contrats. La concentration sectorielle et la dépendance envers les personnes clés sont modérées. La géographie, la saisonnalité, les fournisseurs et le recrutement restent faibles.",
        discussion:
          "La direction a nuancé le mot « élevé ». Aucun client ne pèse plus de 10 %, mais les contrats sont encore trop courts pour sécuriser la récurrence. Nous n’avons pas corrigé la cote. Nous en avons fait un objectif du plan d’action : allonger les contrats et suivre les clients importants, plutôt que de laisser le constat sur cette page.",
      },
    ],
  },
  {
    id: "performance",
    index: "03",
    label: "Performance financière",
    leaves: [
      {
        page: 13,
        title: "Performance financière",
        explanation:
          "Les revenus passent d’environ 1,6 M$ en 2021 à 3,0 M$ en 2025. La marge de contribution atteint 52,5 %, et la marge de BAIIA 22,5 %. En 2025, la croissance des revenus est de 17,6 %, et environ 51 % des revenus additionnels se convertissent en BAIIA. Le volume augmente, et la rentabilité augmente plus vite.",
        discussion:
          "La direction voulait savoir d’où venait la hausse de marge : le prix, le mix, ou les coûts. Nous avons retenu l’hypothèse du rapport, une meilleure maîtrise des coûts variables et un mix plus favorable, à confirmer sur le prochain exercice. Le message gardé en sortie de rencontre : la croissance se voit enfin dans le résultat, pas seulement dans le chiffre d’affaires.",
      },
      {
        page: 18,
        title: "Seuil de rentabilité",
        explanation:
          "Le seuil de rentabilité s’établit à 1 728 k$ en 2025, soit 58 % des revenus, contre 99,5 % en 2021. La marge de sécurité atteint 1 251 k$, soit 42 % des revenus : en 2021, elle n’était que de 8 k$. Le seuil a progressé de 11 % depuis 2021, pendant que les revenus progressaient de 91 %.",
        discussion:
          "La direction a vu tout de suite l’écart entre les deux courbes. Le point mort monte, mais beaucoup moins vite que l’activité. Avec un bénéfice opérationnel de 657 k$, les revenus pourraient reculer d’environ 42 % avant d’atteindre le seuil. Nous avons retenu cela comme une capacité d’absorption, pas comme une raison de relâcher le suivi des coûts fixes.",
      },
      {
        page: 19,
        title: "Rentabilité des divisions",
        explanation:
          "La marge de contribution est presque la même, 52 % pour Software et 53 % pour Conseil. Le bénéfice opérationnel, lui, ne l’est pas. Software dégage 594 k$, soit une marge de 28 %. Conseil s’arrête à 63 k$, soit 7 %. L’écart est de 21 points.",
        discussion:
          "La question de la direction a été directe : est-ce que Conseil vaut sa croissance ? La contribution est saine. Les coûts de la division absorbent presque toute la marge. Nous n’avons pas conclu qu’il fallait ralentir Conseil. Nous avons inscrit la tarification et les mandats peu rentables au plan d’action.",
      },
      {
        page: 22,
        title: "Revenus de Software",
        explanation:
          "Software réalise 2 103 k$ de revenus. Les abonnements SaaS en font la moitié : 1 048 k$, en hausse de 20 % sur 2024. Le développement sur mesure pèse 444 k$ (21 %), l’implantation 312 k$ (15 %) et le support technique 299 k$ (14 %). Les quatre lignes progressent.",
        discussion:
          "Nous nous sommes arrêtés sur la part d’abonnement. La direction y voit la récurrence qui stabilise la division, et elle ne veut pas que le sur-mesure prenne le pas. Le constat retenu : Software croît sur toutes ses lignes, mais c’est le SaaS qui porte la moitié du chiffre et le caractère prévisible du revenu.",
      },
      {
        page: 23,
        title: "Structure de coûts de Software",
        explanation:
          "Les coûts variables de Software tombent à 48 % des revenus, contre 56 % en 2021. Les coûts fixes représentent 24 %, contre 32 %. La contribution marginale atteint 1 101 k$, et le bénéfice opérationnel 594 k$, soit une marge de 28,2 %, en hausse de 4 points sur 2024.",
        discussion:
          "La direction voulait savoir si la marge venait d’un simple effet de volume. Le rapport montre les deux : les coûts variables pèsent moins lourd, et les coûts fixes sont mieux absorbés. Nous avons noté que les autres dépenses sont comptabilisées au niveau commun : le bénéfice de la division est donc aussi son BAIIA. La lecture reste celle d’une division qui convertit sa croissance.",
      },
      {
        page: 29,
        title: "Revenus de Conseil",
        explanation:
          "Conseil réalise 875 k$ de revenus. Le conseil stratégique en représente 375 k$, soit 43 %, en hausse de 25 %. Le conseil opérationnel suit à 235 k$ (27 %), l’accompagnement à 171 k$ (20 %) et l’audit ou le diagnostic à 94 k$ (11 %). Toutes les lignes croissent, la stratégique plus vite que les autres.",
        discussion:
          "La direction est à l’aise avec cette répartition : le stratégique tire la division, sans qu’une seule offre fasse tout le chiffre. Nous avons quand même relié cette page à la suivante. Croître de 25 % sur le stratégique ne dit pas encore si la division garde une marge une fois ses coûts couverts.",
      },
      {
        page: 30,
        title: "Structure de coûts de Conseil",
        explanation:
          "Les coûts variables de Conseil représentent 47 % des revenus, contre 62 % en 2021. Les coûts fixes restent lourds : 401 k$, soit 46 % des revenus, contre 70 % en 2021. La contribution passe de 156 k$ à 464 k$. Le bénéfice opérationnel, négatif de 133 k$ en 2021, atteint 63 k$ en 2025, soit une marge de 7,2 %.",
        discussion:
          "C’est la page qui a clarifié le débat sur Conseil. La contribution est devenue saine, et la division est enfin bénéficiaire. La marge de 7,2 % reste mince parce que les coûts fixes absorbent encore près de la moitié des revenus. La direction a reconnu qu’il ne suffit pas d’ajouter des mandats : la tarification et le choix des missions doivent laisser passer du résultat.",
      },
    ],
  },
  {
    id: "situation",
    index: "04",
    label: "Situation financière",
    leaves: [
      {
        page: 35,
        title: "Situation financière",
        explanation:
          "L’actif passe de 385 k$ en 2021 à 1 633 k$ en 2025. Les capitaux propres atteignent 1 318 k$, et l’encaisse représente environ 79 % de l’actif. La dette portant intérêt est nulle depuis 2023. La trésorerie nette, environ 1,3 M$, représente près de 1,9 fois le BAIIA.",
        discussion:
          "La dette à zéro a d’abord rassuré. La question est venue ensuite : une entreprise sans dette, avec autant d’encaisse, est-elle trop prudente ? Nous n’avons pas répondu à sa place. Le bilan montre une structure solide. L’usage de cet excédent appartient au plan d’affectation, plus loin dans le rapport.",
      },
      {
        page: 36,
        title: "Fonds de roulement",
        explanation:
          "Le fonds de roulement atteint 1 198 k$, mais il est surtout fait d’encaisse. Une fois l’encaisse retirée, il reste 125 k$, soit 4,2 % des revenus. Les clients paient en 24 jours, les fournisseurs en 15, et le cycle de conversion dure 8,9 jours. Les produits reportés, 209 k$, financent une partie de ce cycle.",
        discussion:
          "Nous avons insisté sur la distinction, parce que le graphique peut tromper. Le fonds de roulement « abondant » n’est pas un besoin d’exploitation qui enfle avec les ventes. La direction a retenu que la croissance mobilise peu de liquidités, et que les abonnements facturés d’avance jouent en sa faveur.",
      },
      {
        page: 40,
        title: "Encaisse et flux de trésorerie",
        explanation:
          "Les flux d’exploitation passent de 27 k$ en 2021 à 584 k$ en 2025, soit 87 % du BAIIA. Les investissements restent modestes, et le flux de trésorerie disponible atteint 536 k$. L’encaisse de fin d’exercice, 1 291 k$, couvre 6,7 mois de charges. Aucun dividende significatif n’a été versé sur la période.",
        discussion:
          "C’est ici que la rencontre est devenue concrète. La direction voit l’excédent. Nous avons cadré trois usages, sans en choisir un : réinvestir, distribuer, ou constituer une réserve. Le rapport établit la capacité. La décision revient au conseil.",
      },
    ],
  },
  {
    id: "trajectoire",
    index: "05",
    label: "Trajectoire financière",
    leaves: [
      {
        page: 42,
        title: "Croissance et rentabilité",
        explanation:
          "Le scénario de la direction mène les revenus de 2 979 k$ en 2025 à 3 448 k$ en 2028, soit environ 5 % par année, après 17,6 % en 2025. La marge de BAIIA irait de 22,5 % à 24,4 %, et le BAIIA atteindrait 840 k$. Le seuil de rentabilité projeté reste autour de 1,9 M$, bien en dessous des revenus.",
        discussion:
          "La direction a assumé le ralentissement. Le 5 % n’est pas une ambition commerciale : c’est un plan prudent. Nous avons vérifié que les marges continuent de s’améliorer même à ce rythme, et que le seuil de rentabilité ne se rapproche pas des revenus. À ce stade, le risque d’exploitation est faible.",
      },
      {
        page: 43,
        title: "Trésorerie projetée",
        explanation:
          "De 2026 à 2028, les flux d’exploitation projetés totalisent environ 2,0 M$. L’encaisse passerait de 1,3 M$ à 2,8 M$, soit 88 % de l’actif. La dette demeure nulle. Les flux de financement projetés sont négatifs : le modèle laisse voir une capacité de distribution, sans la décider.",
        discussion:
          "En voyant 88 % de l’actif en encaisse, la direction a dit que le plan ne pouvait pas se terminer sur une courbe qui monte sans affectation. Nous avons noté la capacité, puis nous l’avons renvoyée au premier enjeu du plan d’action : une politique écrite, pas une impression.",
      },
      {
        page: 44,
        title: "Priorités et sensibilités",
        explanation:
          "En 2028, Software produirait encore 725 k$ de bénéfice opérationnel, soit 88 % du total des divisions. Conseil progresserait plus vite, jusqu’à 102 k$. Une baisse de 10 % des revenus réduirait le bénéfice opérationnel de 164 k$ en 2026 : il demeurerait à 546 k$. Le capex prévu sur trois ans est de 169 k$.",
        discussion:
          "Le test de sensibilité a rassuré : le modèle reste bénéficiaire si les revenus fléchissent. Nous avons refusé d’en faire une raison de ne rien changer. Le rendement des 169 k$ d’investissements doit être suivi, et l’excédent projeté ne peut pas rester un solde de fin de page.",
      },
    ],
  },
  {
    id: "valorisation",
    index: "06",
    label: "Valorisation",
    leaves: [
      {
        page: 46,
        title: "Valeur d’entreprise illustrative",
        explanation:
          "L’analyse illustrative place le prix des actions entre 2,7 et 4,3 M$, pour une moyenne de 3,5 M$. Le BAIIA représentatif retenu se situe entre 525 et 650 k$, et les multiples de BAIIA vont de 3,5x à 5,0x. L’approche par les actifs, à 1,3 M$, constitue le plancher. Si les projections sont atteintes et que les multiples restent constants, le prix illustratif passerait à 4,6 M$ en 2026, 5,5 M$ en 2027 et 6,3 M$ en 2028.",
        discussion:
          "Nous avons pris le temps de le dire clairement : cette fourchette n’est ni une offre, ni un prix de transaction. La direction voulait un ordre de grandeur pour en parler avec les actionnaires. Nous avons gardé 3,5 M$ comme point de conversation, et 1,3 M$ comme rappel du plancher. Elle a ensuite demandé ce que vaudrait l’entreprise si le plan se réalisait. À multiples constants, le rapport mène le prix illustratif à 6,3 M$ en 2028, avec une création de valeur avant distributions de 29,6 % en 2026, 27,0 % en 2027 et 38,0 % en 2028. Nous avons tenu le « si » : ces prix ne sont pas promis. Ils décrivent le même cadre, une fois les projections atteintes.",
      },
      {
        page: 49,
        title: "Analyse de la situation financière",
        explanation:
          "Le bilan ajusté laisse la valeur comptable des actions à 1,32 M$. Les ajustements nets sont négligeables. Les actifs excédentaires nets atteignent 1 079 k$, soit 81,9 % de cette valeur : surtout l’encaisse de 1 291 k$, nette des produits reportés de 209 k$. L’actif net d’exploitation, 239 k$, ne représente que 18,1 %. La dette portant intérêt est nulle.",
        discussion:
          "La direction a vu tout de suite où se trouve le bilan. La valeur par les actifs ne vient pas de l’exploitation : elle vient de l’encaisse. Nous avons relié ce 1,32 M$ au plancher de la page précédente. Le reste de la fourchette, jusqu’à 4,3 M$, repose sur la capacité bénéficiaire, pas sur ce que le bilan détient.",
      },
    ],
  },
  {
    id: "plan",
    index: "07",
    label: "Plan d’action",
    leaves: [
      {
        page: 51,
        title: "Plan d’action",
        explanation:
          "Le scénario 2026 vise 3,13 M$ de revenus, une marge de BAIIA de 23,1 % et 581 k$ de flux de trésorerie disponible. Six enjeux structurent l’année : l’affectation de l’encaisse excédentaire de 1,08 M$, l’ambition de croissance, la diversification hors Software, la rentabilité de Conseil, la récurrence des contrats et le personnel clé.",
        discussion:
          "Nous avons parcouru le tableau ligne par ligne. La direction a accepté que l’encaisse et le rythme de croissance soient les deux enjeux élevés du premier trimestre. Elle a aussi reconnu que la marge de Conseil, à 7,2 %, ne peut pas rester le point faible sans une revue de la tarification et des mandats.",
      },
      {
        page: 52,
        title: "Feuille de route et suivi",
        explanation:
          "La feuille de route étale les six actions sur 2026. Plusieurs indicateurs sont déjà au-dessus de la cible, dont la croissance, le délai de recouvrement et l’autonomie de trésorerie. La marge de BAIIA, la marge de Conseil et les frais d’administration restent à surveiller. Quatre décisions sont attendues, avec une prochaine revue au 30 avril 2026.",
        discussion:
          "La rencontre s’est terminée sur les décisions, pas sur les graphiques. Approuver une politique d’encaisse, le budget et le plan d’investissement, la révision des mandats de Conseil, puis le plan de rétention. La direction a retenu la date du 30 avril : le rapport ne sert que s’il est rouvert avec les résultats du premier trimestre.",
      },
    ],
  },
]
