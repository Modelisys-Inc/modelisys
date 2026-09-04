/**
 * Moteur d’hypothèse VCA — conversion de modes de saisie → montants $ persistés
 * et buildup VC → VCA → ACN pour le panneau rapport.
 */

export type NetTangibleHypothesisField = "adjustments" | "debts" | "assets"

export type NetTangibleLeafInputMode = "dollar" | "percent-vc" | "fair-value"

export type NetTangibleBuildup = {
  vc: number
  adjustments: number
  vca: number
  debts: number
  assets: number
  acn: number
}

export function computeNetTangibleBuildup(params: {
  vc: number
  adjustments: number
  debts: number
  assets: number
}): NetTangibleBuildup {
  const vc = Number.isFinite(params.vc) ? params.vc : 0
  const adjustments = Number.isFinite(params.adjustments) ? params.adjustments : 0
  const debts = Number.isFinite(params.debts) ? params.debts : 0
  const assets = Number.isFinite(params.assets) ? params.assets : 0
  const vca = vc + adjustments
  return { vc, adjustments, vca, debts, assets, acn: vca - debts - assets }
}

/** Convertit la saisie utilisateur (mode) en montant $ à persister pour le champ actif. */
export function leafInputToDollarAmount(params: {
  mode: NetTangibleLeafInputMode
  input: number
  bookValue: number
}): number {
  const input = Number.isFinite(params.input) ? params.input : 0
  const vc = Number.isFinite(params.bookValue) ? params.bookValue : 0
  if (params.mode === "percent-vc") return (vc * input) / 100
  if (params.mode === "fair-value") return input - vc
  return input
}

/** Inverse : montant $ persisté → valeur affichée selon le mode. */
export function dollarAmountToLeafInput(params: {
  mode: NetTangibleLeafInputMode
  dollar: number
  bookValue: number
}): number {
  const dollar = Number.isFinite(params.dollar) ? params.dollar : 0
  const vc = Number.isFinite(params.bookValue) ? params.bookValue : 0
  if (params.mode === "percent-vc") {
    if (Math.abs(vc) < 1e-9) return 0
    return (dollar / vc) * 100
  }
  if (params.mode === "fair-value") return vc + dollar
  return dollar
}

export function leafModeOptions(
  field: NetTangibleHypothesisField,
): { mode: NetTangibleLeafInputMode; label: string }[] {
  if (field === "adjustments") {
    return [
      { mode: "dollar", label: "Montant $" },
      { mode: "percent-vc", label: "% de la VC" },
      { mode: "fair-value", label: "Juste valeur" },
    ]
  }
  return [
    { mode: "dollar", label: "Montant $" },
    { mode: "percent-vc", label: "% de la VC" },
  ]
}

export function leafModeHint(
  field: NetTangibleHypothesisField,
  mode: NetTangibleLeafInputMode,
): string {
  if (field === "adjustments") {
    if (mode === "percent-vc") {
      return "L’ajustement est calculé comme un pourcentage de la valeur comptable de référence."
    }
    if (mode === "fair-value") {
      return "Saisissez la juste valeur marchande ; l’ajustement = JVM − valeur comptable."
    }
    return "Montant ajouté ou soustrait à la valeur comptable (signe négatif pour une baisse)."
  }
  if (field === "debts") {
    if (mode === "percent-vc") {
      return "Dettes à soustraire de l’ACN, exprimées en % de la valeur comptable."
    }
    return "Dettes (ou passifs) à soustraire pour obtenir l’actif net tangible."
  }
  if (mode === "percent-vc") {
    return "Excédent en % de la valeur comptable."
  }
  return "Excédent (actifs ou passifs) à soustraire de l’ACN."
}

export function leafInputLabel(
  field: NetTangibleHypothesisField,
  mode: NetTangibleLeafInputMode,
): string {
  if (mode === "percent-vc") return "Pourcentage de la VC"
  if (mode === "fair-value") return "Juste valeur marchande ($)"
  if (field === "adjustments") return "Ajustement ($)"
  if (field === "debts") return "Dettes ($)"
  return "Excédent ($)"
}

export function leafInputUnit(mode: NetTangibleLeafInputMode): string {
  return mode === "percent-vc" ? "%" : "$"
}

/** Alerte discrète si l’écart est matériel vs VC (≥ 5 %). */
export function materialityHint(dollarDelta: number, bookValue: number): string | null {
  const vc = Math.abs(bookValue)
  if (vc < 1e-9) return null
  const pct = (Math.abs(dollarDelta) / vc) * 100
  if (pct < 5) return null
  return `Écart matériel (${pct.toFixed(1)} % de la VC) — documentez la source dans la note.`
}
