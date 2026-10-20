import type { MetadataRoute } from "next"

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://modelisys.com"

const MARKETING_PATHS = [
  "/",
  "/a-propos",
  "/services",
  "/services/accompagnement-financier",
  "/services/licences",
  "/services/developpement-sur-mesure",
  "/contact",
  "/blog",
  "/ressources",
  "/ressources/lecture-de-la-valeur",
  "/ressources/revenus",
  "/ressources/contribution-marginale",
  "/ressources/seuil-de-rentabilite",
  "/ressources/flux-de-tresorerie",
  "/ressources/fonds-de-roulement",
  "/ressources/croissance",
  "/ressources/excel-101",
  "/ressources/baiia-ajuste",
  "/ressources/multiple-de-valorisation",
  "/ressources/valeur-comptable-ajustee",
  "/ressources/budget-projections",
  "/blog/importance-reporting-financier",
  "/blog/importance-budget",
  "/blog/importance-valorisation",
  "/blog/import-balance-verification-qualite-donnees",
  "/blog/mapping-comptable-codes-de-liaison",
  "/blog/ia-technologie-pilotage-entreprise",
  "/privacy",
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return MARKETING_PATHS.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1.0 : path.startsWith("/blog/") ? 0.6 : 0.8,
  }))
}
