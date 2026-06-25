import type { MouseEvent } from "react"

export const APPROCHE_SECTION_ID = "approche-modelisys" as const
/** Cible de scroll : carte « Trajectoire de performance » dans le hero. */
export const APPROCHE_SCROLL_TARGET_ID = "approche-modelisys-start" as const

const DEFAULT_LANDING_NAV_OFFSET_PX = 96

export const APPROCHE_PHASE_IDS = ["diagnostic", "planification", "pilotage"] as const

export type ApprochePhaseId = (typeof APPROCHE_PHASE_IDS)[number]

/** Anciens identifiants (5 phases) — redirigés vers les 3 phases regroupées. */
const LEGACY_PHASE_ALIASES: Record<string, ApprochePhaseId> = {
  vision: "planification",
  execution: "pilotage",
  ajustement: "pilotage",
}

export function isApprochePhaseId(value: string): value is ApprochePhaseId {
  return (APPROCHE_PHASE_IDS as readonly string[]).includes(value)
}

export function resolveApprochePhaseId(value: string): ApprochePhaseId | null {
  if (isApprochePhaseId(value)) return value
  return LEGACY_PHASE_ALIASES[value] ?? null
}

export function getApprochePhaseHash(phaseId: ApprochePhaseId): string {
  return `phase-${phaseId}`
}

export function getApprochePhaseHref(phaseId: ApprochePhaseId): string {
  return `/#${getApprochePhaseHash(phaseId)}`
}

export function parseApprochePhaseFromHash(hash: string): ApprochePhaseId | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash
  if (!raw.startsWith("phase-")) return null
  const phaseId = raw.slice("phase-".length)
  return resolveApprochePhaseId(phaseId)
}

export const APPROCHE_PHASE_NAVIGATE_EVENT = "approche-phase-navigate" as const

export function dispatchApprochePhaseNavigate(phaseId: ApprochePhaseId) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(APPROCHE_PHASE_NAVIGATE_EVENT, { detail: { phaseId } }))
}

export function getLandingNavOffset(): number {
  if (typeof window === "undefined") return DEFAULT_LANDING_NAV_OFFSET_PX
  const nav = document.querySelector("nav")
  return nav ? Math.ceil(nav.getBoundingClientRect().height) + 16 : DEFAULT_LANDING_NAV_OFFSET_PX
}

export function scrollToApprocheSection(options?: { behavior?: ScrollBehavior }) {
  if (typeof window === "undefined") return

  const behavior = options?.behavior ?? "smooth"
  const run = () => {
    const el =
      document.getElementById(APPROCHE_SCROLL_TARGET_ID) ??
      document.getElementById(APPROCHE_SECTION_ID)
    if (!el) return

    const offset = getLandingNavOffset()
    const top = el.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top: Math.max(0, top), behavior })
  }

  requestAnimationFrame(() => requestAnimationFrame(run))
}

export function navigateToApprochePhase(phaseId: ApprochePhaseId, options?: { behavior?: ScrollBehavior }) {
  if (typeof window === "undefined") return

  const hash = getApprochePhaseHash(phaseId)
  if (window.location.hash !== `#${hash}`) {
    window.history.pushState(null, "", `/#${hash}`)
  }

  dispatchApprochePhaseNavigate(phaseId)
  scrollToApprocheSection({ behavior: options?.behavior ?? "smooth" })
}

/** Sur `/`, intercepte les liens vers une phase ou la section approche. */
export function handleApprocheLandingLink(e: MouseEvent<HTMLAnchorElement>, href: string): boolean {
  if (typeof window === "undefined") return false
  if (!href.startsWith("/#")) return false
  if (window.location.pathname !== "/") return false

  const hash = href.slice(2)
  const phaseId = parseApprochePhaseFromHash(`#${hash}`)

  if (phaseId) {
    e.preventDefault()
    navigateToApprochePhase(phaseId)
    return true
  }

  if (hash === APPROCHE_SECTION_ID) {
    e.preventDefault()
    scrollToApprocheSection()
    if (window.location.hash !== `#${hash}`) {
      window.history.pushState(null, "", `/#${hash}`)
    }
    return true
  }

  return false
}
