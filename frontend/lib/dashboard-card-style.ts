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
export const dashboardCardHeaderBarClass = "border-b border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90"
