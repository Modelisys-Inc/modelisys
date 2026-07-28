/**
 * Jetons visuels du rapport Diagnostic (thème « cockpit sombre »).
 *
 * Ces valeurs proviennent de la maquette HTML `Diagnostic.dc.html`.
 * Elles réutilisent l'ADN Modelisys déjà présent dans `dashboard-header.tsx` :
 *   #2A2F3A (surface d'en-tête), #E6D6C3 (texte crème), #C9B8A5 (texte secondaire),
 *   #E0742D (accent orange).
 *
 * Le rapport est volontairement sombre : les graphiques denses se lisent mieux
 * sur fond foncé et l'écran se distingue des pages « outils » qui restent claires.
 */

export const DIAG = {
  /** Fond de page du rapport. */
  bg: "#14171D",
  /** Fond des cartes de section. */
  card: "#1A1E26",
  /** Fond du tiroir de détail. */
  drawer: "#181C24",
  /** Bandeau supérieur — identique au header applicatif existant. */
  chrome: "#2A2F3A",

  /** Bordure interne des cartes (utilisée via box-shadow inset). */
  hairline: "rgba(230,214,195,.09)",

  text: "#E6D6C3",
  textMuted: "rgba(201,184,165,.70)",
  textFaint: "rgba(201,184,165,.45)",

  accent: "#E0742D",
  positive: "#34D399",
  positiveDeep: "#0F8F68",
  positiveLight: "#3FE0A8",
  warning: "#F5B544",
  negative: "#F16A5C",
  neutralLine: "#8FA3BF",
} as const

/** Classes Tailwind réutilisées pour les cartes de section. */
export const CARD_CLASS =
  "overflow-hidden rounded-xl bg-[#1A1E26] shadow-[inset_0_0_0_1px_rgba(230,214,195,.09)]"

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
    return "rounded-lg bg-[rgba(241,106,92,.09)] px-3 py-2.5 text-[11px] leading-relaxed text-[rgba(230,214,195,.88)] shadow-[inset_0_0_0_1px_rgba(241,106,92,.26)]"
  if (tone === "watch")
    return "rounded-lg bg-[rgba(245,181,68,.09)] px-3 py-2.5 text-[11px] leading-relaxed text-[rgba(230,214,195,.88)] shadow-[inset_0_0_0_1px_rgba(245,181,68,.26)]"
  return "rounded-lg bg-[rgba(52,211,153,.09)] px-3 py-2.5 text-[11px] leading-relaxed text-[rgba(230,214,195,.88)] shadow-[inset_0_0_0_1px_rgba(52,211,153,.26)]"
}
