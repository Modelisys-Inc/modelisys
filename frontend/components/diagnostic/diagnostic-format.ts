/** Aides de formatage propres au rapport Diagnostic (devise de la société, pourcentages, ratios). */

import type { CompanyReportModuleId } from "@/lib/company-report-module"
import { getCompanyReportBranding } from "@/lib/company-report-branding"

/** Montant monétaire dans la devise de la société (fr-CA, sans décimales). */
export function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("fr-CA", {
      style: "currency",
      currency: currency || "CAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return new Intl.NumberFormat("fr-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }
}

function currencySymbol(currency: string): string {
  switch (currency) {
    case "CAD":
    case "USD":
      return "$"
    case "EUR":
      return "€"
    case "GBP":
      return "£"
    default:
      return currency
  }
}

/** Montant compact pour les axes de graphiques : 1 234 567 → « 1,2 M$ », 220 000 → « 220 k$ ». */
export function formatCompactMoney(value: number, currency: string): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? "−" : ""
  const symbol = currencySymbol(currency)
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toLocaleString("fr-CA", {
      maximumFractionDigits: 1,
    })} M${symbol}`
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toLocaleString("fr-CA", {
      maximumFractionDigits: 0,
    })} k${symbol}`
  }
  return `${sign}${abs.toLocaleString("fr-CA", { maximumFractionDigits: 0 })} ${symbol}`
}

/** Pourcentage (ex. 12,3 %) — tiret cadratin si absent. */
export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—"
  return `${value.toLocaleString("fr-CA", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} %`
}

/** Ratio simple (ex. 1,85) — tiret cadratin si absent. */
export function formatRatio(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—"
  return value.toLocaleString("fr-CA", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

/** Multiple de valorisation (ex. « 4,0× »). */
export function formatMultiple(value: number): string {
  return `${value.toLocaleString("fr-CA", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}×`
}

/** Date longue en français (ex. « 26 juillet 2026 »). */
export function formatDateFr(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat("fr-CA", { dateStyle: "long" }).format(d)
}

const REFERENCE_MONTH_LABELS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const

/** Libellé calendaire pour la date de référence d'un diagnostic (ex. « juin 2025 »). */
export function formatReferencePeriod(year: number, month: number): string {
  const label = REFERENCE_MONTH_LABELS[month - 1]
  if (!label) return String(year)
  return `${label} ${year}`
}

/** Dernier jour du mois de référence (ex. « 31 décembre 2026 »). */
export function formatReferenceDateEndOfMonth(year: number, month: number): string {
  if (month < 1 || month > 12) return String(year)
  const lastDay = new Date(year, month, 0).getDate()
  const date = new Date(year, month - 1, lastDay)
  return new Intl.DateTimeFormat("fr-CA", { dateStyle: "long" }).format(date)
}

/** Sous-titre d'en-tête des sections du rapport imprimé. */
export function formatReportSectionMeta(
  companyName: string,
  year: number,
  month: number,
  currency: string,
  moduleId: CompanyReportModuleId = "diagnostic",
): string {
  const { sectionMetaLabel } = getCompanyReportBranding(moduleId)
  const label = REFERENCE_MONTH_LABELS[month - 1]
  if (!label) return `${companyName} · ${sectionMetaLabel} · ${year} · ${currency}`
  const lastDay = new Date(year, month, 0).getDate()
  const monthCapitalized = label.charAt(0).toUpperCase() + label.slice(1)
  return `${companyName} · ${sectionMetaLabel} · ${lastDay} ${monthCapitalized} ${year} · ${currency}`
}

export type LifecycleStage = "croissance" | "maturité" | "décroissance"

export function lifecycleLabel(stage: string): string {
  switch (stage) {
    case "croissance":
      return "Croissance"
    case "maturité":
      return "Maturité"
    case "décroissance":
      return "Décroissance"
    case "indéterminé":
      return "Indéterminé"
    default:
      return stage
  }
}

/** Classes Tailwind du badge de stade de vie : émeraude / ardoise / rouge. */
export function lifecycleBadgeClass(stage: string): string {
  switch (stage) {
    case "croissance":
      return "border-transparent bg-emerald-100 text-emerald-800"
    case "décroissance":
      return "border-transparent bg-red-100 text-red-800"
    default:
      return "border-transparent bg-slate-200 text-slate-700"
  }
}
