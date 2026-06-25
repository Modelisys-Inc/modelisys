import type { MetadataRoute } from "next"

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://modelisys.com"

const MARKETING_PATHS = [
  "/",
  "/a-propos",
  "/etudes-de-cas",
  "/tarification",
  "/cabinets-comptables",
  "/partenaires-financiers",
  "/partenaires-institutionnels",
  "/partenaires-capital",
  "/contact",
  "/blog",
  "/blog/importance-reporting-financier",
  "/blog/importance-budget",
  "/blog/importance-valorisation",
  "/blog/import-balance-verification-qualite-donnees",
  "/blog/mapping-comptable-codes-de-liaison",
  "/blog/ia-technologie-pilotage-entreprise",
  "/privacy",
  "/clause-de-non-responsabilite",
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
