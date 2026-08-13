/** Types partagés par les composants du rapport Diagnostic v2. */

export type DrillDownTone = "neutral" | "positive" | "negative"

export interface DrillDownStat {
  label: string
  value: string
  tone?: DrillDownTone
}

export interface DrillDownRequest {
  /** Sur-titre orange (« Division », « Indicateur », « Produit / service »…). */
  kicker: string
  title: string
  subtitle?: string
  stats: DrillDownStat[]
  /** Série historique affichée en barres dans le tiroir. */
  series: { label: string; value: number }[]
  formatValue: (v: number) => string
  /** Puces « Lecture » — 2 à 3 phrases d'interprétation. */
  notes?: string[]
  /** Lien vers la page d'analyse détaillée correspondante. */
  detailHref?: string
}
