import type { MouseEvent } from "react"
import { getLandingNavOffset } from "@/lib/approche-navigation"

export const FEATURE_SECTION_ID = "problem-solution" as const

export const FEATURE_CATEGORY_IDS = [
  "valorisation",
  "projections",
  "analyse",
  "reporting",
  "documentation",
] as const

export type FeatureCategoryId = (typeof FEATURE_CATEGORY_IDS)[number]

export const FEATURE_CATEGORY_LABELS: Record<FeatureCategoryId, string> = {
  valorisation: "Valorisation",
  projections: "Projections",
  analyse: "Analyse",
  reporting: "Reporting",
  documentation: "Documentation",
}

export function isFeatureCategoryId(value: string): value is FeatureCategoryId {
  return (FEATURE_CATEGORY_IDS as readonly string[]).includes(value)
}

export function getFeatureCategoryHash(categoryId: FeatureCategoryId): string {
  return `feature-${categoryId}`
}

export function getFeatureCategoryHref(categoryId: FeatureCategoryId): string {
  return `/#${getFeatureCategoryHash(categoryId)}`
}

export function parseFeatureCategoryFromHash(hash: string): FeatureCategoryId | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash
  if (!raw.startsWith("feature-")) return null
  const categoryId = raw.slice("feature-".length)
  return isFeatureCategoryId(categoryId) ? categoryId : null
}

export const FEATURE_CATEGORY_NAVIGATE_EVENT = "feature-category-navigate" as const

export function dispatchFeatureCategoryNavigate(categoryId: FeatureCategoryId) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(FEATURE_CATEGORY_NAVIGATE_EVENT, { detail: { categoryId } }))
}

export function scrollToFeatureSection(options?: { behavior?: ScrollBehavior }) {
  if (typeof window === "undefined") return

  const behavior = options?.behavior ?? "smooth"
  const run = () => {
    const el = document.getElementById(FEATURE_SECTION_ID)
    if (!el) return

    const offset = getLandingNavOffset()
    const top = el.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top: Math.max(0, top), behavior })
  }

  requestAnimationFrame(() => requestAnimationFrame(run))
}

export function scrollToFeatureCategory(
  categoryId: FeatureCategoryId,
  options?: { behavior?: ScrollBehavior },
) {
  if (typeof window === "undefined") return

  const behavior = options?.behavior ?? "smooth"
  const run = () => {
    const el = document.getElementById(getFeatureCategoryHash(categoryId))
    if (!el) {
      scrollToFeatureSection({ behavior })
      return
    }

    const offset = getLandingNavOffset()
    const top = el.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top: Math.max(0, top), behavior })
  }

  requestAnimationFrame(() => requestAnimationFrame(run))
}

export function navigateToFeatureCategory(
  categoryId: FeatureCategoryId,
  options?: { behavior?: ScrollBehavior },
) {
  if (typeof window === "undefined") return

  const hash = getFeatureCategoryHash(categoryId)
  if (window.location.hash !== `#${hash}`) {
    window.history.pushState(null, "", `/#${hash}`)
  }

  dispatchFeatureCategoryNavigate(categoryId)
  scrollToFeatureCategory(categoryId, { behavior: options?.behavior ?? "smooth" })
}

export const featureCategoryNavLinks = FEATURE_CATEGORY_IDS.map((id) => ({
  title: FEATURE_CATEGORY_LABELS[id],
  href: getFeatureCategoryHref(id),
}))

/** Sur `/`, intercepte les liens vers une catégorie ou la section fonctionnalités. */
export function handleFeatureLandingLink(e: MouseEvent<HTMLAnchorElement>, href: string): boolean {
  if (typeof window === "undefined") return false
  if (!href.startsWith("/#")) return false
  if (window.location.pathname !== "/") return false

  const hash = href.slice(2)
  const categoryId = parseFeatureCategoryFromHash(`#${hash}`)

  if (categoryId) {
    e.preventDefault()
    navigateToFeatureCategory(categoryId)
    return true
  }

  if (hash === FEATURE_SECTION_ID) {
    e.preventDefault()
    scrollToFeatureSection()
    if (window.location.hash !== `#${hash}`) {
      window.history.pushState(null, "", `/#${hash}`)
    }
    return true
  }

  return false
}
