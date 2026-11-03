export const TARIFICATION_PATH = "/tarification"

/** Bande blanche sous la hero : pourquoi Modelisys est utile. */
export const TARIFICATION_MARQUEE_ITEMS = [
  "Une lecture financière avec la direction",
  "Sans embaucher un directeur financier à temps plein",
  "Relier les décisions à la valeur",
  "Voir ce qui crée ou détruit de la valeur",
  "Comprendre la performance et la trésorerie",
  "Un suivi adapté à la structure de l’entreprise",
  "Isoler les leviers qui comptent vraiment",
  "Des outils conçus autour de votre réalité",
  "Rendre l’information financière plus utile",
  "Des décisions plus éclairées",
] as const

export const TARIFICATION_OFFERS = [
  {
    title: "Diagnostic financier et planification",
    price: "À partir de 3 500 $",
    intro:
      "Obtenez une compréhension approfondie de votre situation financière, de vos principaux leviers de rentabilité et de vos perspectives.",
    points: [
      "Analyse de la performance financière",
      "Identification des enjeux et des occasions d’amélioration",
      "Analyse de la trésorerie et du fonds de roulement",
      "Projections et scénarios financiers selon vos besoins",
      "Analyse illustrative de prix pour votre entité",
      "Recommandations et priorités d’action",
    ],
    ideal:
      "les dirigeants qui souhaitent faire le point sur leur entreprise et définir leurs prochaines priorités.",
    note: null,
    footnote: null,
  },
  {
    title: "Accompagnement financier fractionnaire",
    price: "À partir de 750 $ par mois",
    intro:
      "Bénéficiez d’un suivi financier régulier pour comprendre vos résultats, anticiper vos besoins et prendre des décisions éclairées.",
    points: [
      "Suivi périodique de la performance financière",
      "Analyse des écarts et des indicateurs clés",
      "Suivi de la trésorerie et des projections",
      "Rencontres de suivi avec la direction",
      "Identification des leviers d’amélioration",
      "Suivi de la création de valeur",
    ],
    ideal:
      "les PME qui souhaitent bénéficier d’une expertise financière régulière sans embaucher un directeur financier à temps plein.",
    note: "L’accompagnement est adapté à la structure, aux besoins et à la complexité de votre entreprise.",
    footnote: "L’implantation initiale et le diagnostic de démarrage font l’objet d’un mandat distinct.",
  },
  {
    title: "Solutions financières sur mesure",
    price: "Sur devis",
    intro:
      "Pour les besoins qui nécessitent une approche spécifique, Modelisys conçoit et adapte des solutions financières en fonction de votre entreprise.",
    points: [
      "Modélisation et projections financières",
      "Analyse de rentabilité par division ou ligne d’affaires",
      "Consolidation et analyse multi-entités",
      "Développement et adaptation d’outils Excel",
      "Rapports de gestion personnalisés",
      "Analyses financières particulières",
    ],
    ideal:
      "les entreprises qui souhaitent approfondir une problématique ou structurer un outil de gestion adapté à leur réalité.",
    note: null,
    footnote: null,
  },
] as const
