export type BlogPostCard = {
  title: string
  excerpt: string
  href: string
  readingTime: string
  dateLabel: string
  tags: string[]
}

/** Ordre d’affichage : vedette (IA), puis les trois piliers finance Modelisys. */
export const blogPosts: BlogPostCard[] = [
  {
    title: "La technologie n’est plus un avantage. C’est un standard.",
    excerpt:
      "Quand les données sont abondantes mais fragmentées, le vrai levier est la qualité des décisions. Tendances du marché, limites des outils déconnectés, et comment une plateforme intégrée relie performance et valorisation.",
    href: "/blog/ia-technologie-pilotage-entreprise",
    readingTime: "14 min",
    dateLabel: "24 avr. 2026",
    tags: ["Innovation", "Intelligence artificielle"],
  },
  {
    title: "L’importance du reporting financier",
    excerpt:
      "Des décisions plus rapides, des équipes alignées et moins de surprises : ce que change un reporting régulier, structuré et lisible — pour la direction, la finance et les partenaires.",
    href: "/blog/importance-reporting-financier",
    readingTime: "7 min",
    dateLabel: "29 janv. 2026",
    tags: ["Reporting financier"],
  },
  {
    title: "L’importance de la valorisation",
    excerpt:
      "Comprendre ce qui crée (ou détruit) de la valeur, parler le même langage avec prêteurs et investisseurs, et prioriser les leviers : la valorisation comme outil de pilotage.",
    href: "/blog/importance-valorisation",
    readingTime: "8 min",
    dateLabel: "29 janv. 2026",
    tags: ["Valorisation"],
  },
  {
    title: "L’importance d’un budget (et de son suivi)",
    excerpt:
      "Un budget n’est pas un exercice annuel : c’est un système de pilotage. Comment structurer le budget, suivre les écarts, et transformer les chiffres en actions concrètes.",
    href: "/blog/importance-budget",
    readingTime: "10 min",
    dateLabel: "29 janv. 2026",
    tags: ["Budget"],
  },
]

export const blogFeaturedPost = blogPosts[0]!
export const blogLandingSecondaryPosts = blogPosts.slice(1, 4)
