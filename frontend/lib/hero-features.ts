import { getApprochePhaseHref } from "@/lib/approche-navigation"
import {
  APPROCHE_PHASE_MARKETING_CONTENT,
  APPROCHE_PHASE_ORDER,
} from "@/lib/approche-phase-marketing-content"

/**
 * Liens de phase pour le menu et le pied de page — libellés Comprendre / Planifier / Exécuter.
 */
export const heroFeatureFooterLinks = APPROCHE_PHASE_ORDER.map((id) => ({
  title: APPROCHE_PHASE_MARKETING_CONTENT[id].shortTitle,
  href: getApprochePhaseHref(id),
}))
