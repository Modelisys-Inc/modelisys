/**
 * Libellés affichés pour le sélecteur Horizon et les sous-titres (cartes, tableaux).
 * Les valeurs internes (courant, 12mois, …) restent inchangées.
 */
export const HORIZON_LABEL = {
  moisActuel: "Mois actuel",
  trimestreActuel: "Trimestre actuel",
  mensuel: "Mensuel",
  trimestriel2Ans: "Trimestriel - 2 ans",
  annuel5Ans: "Annuel - 5 ans",
  ytd: "YTD",
  ddm: "DDM",
  courant: "Courant",
  exercice: "Exercice",
} as const

/**
 * Libellé court du mode d’horizon (sous-titre graphique, en-têtes), aligné sur le sélecteur.
 */
export function getHorizonModeLabel(
  view: string,
  period: "monthly" | "quarterly" | "annual",
): string {
  if (view === "current") return HORIZON_LABEL.moisActuel
  if (view === "24months") return "24 mois"
  if (view === "comparison" && period === "monthly") return HORIZON_LABEL.moisActuel
  if (view === "comparison" && period === "quarterly") return HORIZON_LABEL.trimestreActuel
  if (view === "comparison" && period === "annual") return "Annuel"
  if (view === "ytd") return HORIZON_LABEL.ytd
  if (view === "ddm") return HORIZON_LABEL.ddm
  if (view === "12months") return HORIZON_LABEL.mensuel
  if (view === "quarters") return HORIZON_LABEL.trimestriel2Ans
  if (view === "years") return HORIZON_LABEL.annuel5Ans
  return HORIZON_LABEL.moisActuel
}
