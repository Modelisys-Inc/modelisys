/**
 * Jetons visuels du rapport Diagnostic (thème clair, aligné sur les pages
 * financial-statements et analysis).
 *
 * Réutilise l'ADN Modelisys : #2A2F3A (texte principal), #E0742D (accent orange),
 * surfaces blanches / slate-50, bordures slate-200.
 */

export const DIAG = {
  /** Fond de page du rapport. */
  bg: "#f8fafc",
  /** Fond des cartes de section. */
  card: "#ffffff",
  /** Fond du tiroir de détail. */
  drawer: "#ffffff",
  /** Bandeau supérieur — identique au header applicatif existant. */
  chrome: "#2A2F3A",

  /** Bordure des cartes. */
  hairline: "#e2e8f0",

  text: "#2A2F3A",
  textMuted: "#64748b",
  textFaint: "#94a3b8",

  /** Couleurs de grille / axes SVG. */
  gridLine: "#e2e8f0",
  axisText: "#94a3b8",
  chartLabel: "#2A2F3A",

  accent: "#E0742D",
  positive: "#059669",
  positiveDeep: "#047857",
  positiveLight: "#10b981",
  warning: "#d97706",
  negative: "#dc2626",
  neutralLine: "#64748b",
} as const

/** Classes Tailwind réutilisées pour les cartes de section. */
export const CARD_CLASS =
  "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"

/** Fond de page du rapport. */
export const PAGE_CLASS = "min-h-screen bg-slate-50"

/** Bandeau héro du portail / rapport (fond ardoise Modelisys). */
export const PORTAL_HERO_CLASS =
  "relative w-full overflow-hidden border-b border-[#1F2430] bg-[#2A2F3A]"

export const PORTAL_HERO_TITLE_CLASS =
  "text-2xl font-semibold tracking-tight text-[#E6D6C3] sm:text-3xl"

export const PORTAL_HERO_SUBTITLE_CLASS = "text-sm text-[#C9B8A5]/90 sm:text-base"

export const PORTAL_HERO_META_CLASS = "text-sm text-[#C9B8A5]/75"

/** Sous-carte (stat, encadré) à l'intérieur d'une section. */
export const SUBCARD_CLASS =
  "rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5"

/** Police chiffrée : toutes les valeurs numériques du rapport sont monospacées. */
export const MONO_CLASS = "font-mono tabular-nums"

export type SignalTone = "ok" | "watch" | "risk"

export function signalColor(tone: SignalTone): string {
  if (tone === "risk") return DIAG.negative
  if (tone === "watch") return DIAG.warning
  return DIAG.positive
}

/** Classes du bandeau « Signal » attaché à un graphique. */
export function signalClass(tone: SignalTone): string {
  if (tone === "risk")
    return "rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[11px] leading-relaxed text-red-900"
  if (tone === "watch")
    return "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-900"
  return "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[11px] leading-relaxed text-emerald-900"
}
