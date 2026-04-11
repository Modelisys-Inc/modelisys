/**
 * Styles des cartes « Accès rapide » du tableau de bord — réutilisés sur les états financiers.
 */
export const dashboardCardFrameClass =
  "relative overflow-hidden rounded-[28px] border-2 border-slate-700 bg-gradient-to-br from-white to-slate-50 shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-slate-900/[0.07]"

/** Carte non interactive (pas d’ombre au survol du conteneur). */
export const dashboardCardFrameStaticClass =
  "relative overflow-hidden rounded-[28px] border-2 border-slate-700 bg-gradient-to-br from-white to-slate-50 shadow-sm"

export const dashboardCardRingClass =
  "pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-[#E0742D]/[0.12]"

export const dashboardCardTitleClass = "font-semibold tracking-tight text-[#2A2F3A]"
export const dashboardCardBodyMutedClass = "text-[#5C5F66]"
export const dashboardCardAccentClass = "text-[#E0742D]"
export const dashboardCardAccentBarClass = "rounded-full bg-[#E0742D]"
/** Bandeau d’en-tête — aligné sur la carte « Performance financière » (income-statement-chart). */
export const dashboardCardHeaderBarClass = "relative border-b border-slate-200 bg-white/90"
/** Bloc icône à gauche du titre (même gabarit que Performance financière). */
export const dashboardCardHeaderIconBoxClass =
  "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100"

/** Bouton « Paramètres » (entrée édition structure) — cartes Sommaire / Détail. */
export const dashboardCardStructureSettingsButtonClass =
  "h-9 shrink-0 gap-2 rounded-xl border-2 border-slate-700/70 bg-white px-3.5 text-sm font-semibold text-[#2A2F3A] shadow-sm transition-all hover:border-[#E0742D]/55 hover:bg-slate-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E0742D]/30 focus-visible:ring-offset-2"
