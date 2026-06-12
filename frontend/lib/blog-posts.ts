export type BlogPostCard = {
  title: string
  excerpt: string
  href: string
  readingTime: string
  dateLabel: string
  tags: string[]
}

/** Ordre d’affichage : vedette (IA), puis les trois piliers alignés sur la plateforme. */
export const blogPosts: BlogPostCard[] = [
  {
    title: "La technologie n’est plus un avantage. C’est un standard.",
    excerpt:
      "Quand les données sont abondantes mais fragmentées, le levier n’est plus la technologie — c’est la qualité des décisions. Tendances du marché, limites des outils déconnectés, et comment une plateforme intégrée relie diagnostic, performance et trajectoire de valeur.",
    href: "/blog/ia-technologie-pilotage-entreprise",
    readingTime: "14 min",
    dateLabel: "24 avr. 2026",
    tags: ["Innovation", "Intelligence artificielle"],
  },
  {
    title: "L’importance du reporting financier",
    excerpt:
      "Comparer le réel au passé, au budget et au scénario : ce que change un reporting structuré pour piloter la valeur — pour la direction, la finance et les partenaires.",
    href: "/blog/importance-reporting-financier",
    readingTime: "7 min",
    dateLabel: "29 janv. 2026",
    tags: ["Reporting"],
  },
  {
    title: "L’importance de la valorisation",
    excerpt:
      "Mesurer la valeur actuelle, fixer une cible et prioriser les leviers : la valorisation comme repère de pilotage — pour dirigeants, investisseurs et partenaires financiers.",
    href: "/blog/importance-valorisation",
    readingTime: "8 min",
    dateLabel: "29 janv. 2026",
    tags: ["Valorisation"],
  },
  {
    title: "L’importance d’un budget (et de son suivi)",
    excerpt:
      "Le budget comme prolongement du scénario modélisé : structurer les repères, suivre les écarts mois après mois et traduire les résultats en impact sur la trajectoire de valeur.",
    href: "/blog/importance-budget",
    readingTime: "10 min",
    dateLabel: "29 janv. 2026",
    tags: ["Projections"],
  },
]

export const blogFeaturedPost = blogPosts[0]!
export const blogLandingSecondaryPosts = blogPosts.slice(1, 4)
