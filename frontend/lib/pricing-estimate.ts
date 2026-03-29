/** Modules optionnels (prix mensuel de base, avant multiplicateurs). */
export const PRICING_ADDITIONAL_MODULES = [
  {
    id: "fonds-roulement-capex",
    label: "Analyse du Fonds de Roulement et des Capex",
    description:
      "Suivez recevables, payables, inventaire, cycles de conversion et trésorerie. Identifiez instantanément les opportunités d'optimisation à travers toute l'organisation.",
    price: 25,
  },
  {
    id: "previsions-budgets",
    label: "Prévisions Financières et Budgets",
    description:
      "Créez des budgets annuels ou des projections multi-années. Simulez des scénarios, anticipez les écarts, ajustez votre trajectoire.",
    price: 50,
  },
  {
    id: "analyse-approfondie",
    label: "Analyse Financière Approfondie",
    description:
      "Marges par produit, analyse de concentration clients et fournisseurs, saisonnalité, ratios financiers, dashboards KPI personnalisés.",
    price: 25,
  },
  {
    id: "valorisation-diagnostic",
    label: "Valorisation et Diagnostic d'Entreprise",
    description:
      "Suivez l'évolution de la valeur de votre entreprise. Identifiez les facteurs qui influencent votre valorisation, analysez les leviers de valeur et optimisez votre multiple.",
    price: 50,
  },
  {
    id: "portail-comptable",
    label: "Portail Comptable et Consultant",
    description:
      "Les PME peuvent partager l'accès à leur portail avec leur comptable ou consultant. Accès en temps réel à toutes les analyses pour un conseil optimisé.",
    price: 25,
  },
] as const

export type PricingModuleId = (typeof PRICING_ADDITIONAL_MODULES)[number]["id"]

/** Abonnement socle (hors Projections et Évaluation), avant multiplicateurs revenus / sociétés. */
export const BASE_SUBSCRIPTION_MONTHLY = 200

/** @deprecated alias — préférer BASE_SUBSCRIPTION_MONTHLY */
export const CONSOLIDATION_MODULE_MONTHLY = BASE_SUBSCRIPTION_MONTHLY

/** Frais d’implantation par société / division (ancre de la fourchette basse). */
export const IMPLEMENTATION_PER_ENTITY = 3000

/** Fourchette haute = référence × (1 + 20 %)² (milieu à +20 %, haut à +20 % de plus). */
export const PRICING_RANGE_HIGH_MULTIPLIER = 1.2 * 1.2

/** Référence → borne haute de fourchette (arrondi). */
export function pricingRangeHigh(referenceAmount: number): number {
  return Math.round(referenceAmount * PRICING_RANGE_HIGH_MULTIPLIER)
}

/**
 * Modules proposés comme options distinctes (hors socle) : prévisions / budgets et valorisation.
 * Le socle inclut toutes les autres fonctionnalités listées dans `PRICING_ADDITIONAL_MODULES`.
 */
export const DISTINCT_OPTIONAL_MODULE_IDS = ["previsions-budgets", "valorisation-diagnostic"] as const

/** Identifiants des modules inclus dans l’offre de base (tout sauf Projections et Évaluation). */
export function getBaseIncludedModuleIds(): string[] {
  const distinct = new Set<string>([...DISTINCT_OPTIONAL_MODULE_IDS])
  return PRICING_ADDITIONAL_MODULES.filter((m) => !distinct.has(m.id)).map((m) => m.id)
}

/** Liste des modules pour l’estimateur rapide (socle + options Projections / Évaluation). */
export function buildQuickCalculatorModuleIds(addProjections: boolean, addEvaluation: boolean): string[] {
  return [
    ...getBaseIncludedModuleIds(),
    ...(addProjections ? ["previsions-budgets"] : []),
    ...(addEvaluation ? ["valorisation-diagnostic"] : []),
  ]
}

export function formatCad(n: number) {
  return new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 0 }).format(n)
}

/** Taille d’une tranche de revenus (M$) pour l’ajustement d’abonnement. */
export const REVENUE_BRACKET_MILLIONS = 5

/** Supplément mensuel moyen par tranche de revenus (abonnement). */
export const REVENUE_BRACKET_MONTHLY_ADDON = 25

/**
 * Supplément mensuel d’abonnement selon les revenus : chaque tranche de 5 M$ ajoute 25 $/mois (moyenne).
 * Ex. 6 M$ → 2 tranches → +50 $/mois (avant multiplicateur sociétés).
 */
export function calculateRevenueSubscriptionAddon(revenueM: number): number {
  const tranches = Math.max(0, Math.ceil(revenueM / REVENUE_BRACKET_MILLIONS))
  return tranches * REVENUE_BRACKET_MONTHLY_ADDON
}

/** Chaque société supplémentaire : +15 % sur l’abonnement mensuel. */
export function calculateCompanyMultiplier(companies: number): number {
  if (companies <= 1) return 1.0
  return 1 + (companies - 1) * 0.15
}

function sumDistinctOptionalModulePrices(selectedModuleIds: string[]): number {
  const optional = new Set<string>([...DISTINCT_OPTIONAL_MODULE_IDS])
  return selectedModuleIds.reduce((sum, id) => {
    if (!optional.has(id)) return sum
    const m = PRICING_ADDITIONAL_MODULES.find((x) => x.id === id)
    return sum + (m?.price ?? 0)
  }, 0)
}

/** Frais d’implantation de référence : 3000 $ par société ou division. */
export function calculateIntegrationFee(companies: number): number {
  return IMPLEMENTATION_PER_ENTITY * Math.max(1, companies)
}

export type PricingEstimateInput = {
  revenueM: number
  companies: number
  selectedModuleIds: string[]
  includeConsolidationModule: boolean
}

export type PricingEstimateResult = {
  monthlyMin: number
  monthlyMax: number
  integrationMin: number
  integrationMax: number
}

export function computePricingEstimate(input: PricingEstimateInput): PricingEstimateResult {
  const distinctOptionalSum = sumDistinctOptionalModulePrices(input.selectedModuleIds)
  const basePrice = input.includeConsolidationModule ? BASE_SUBSCRIPTION_MONTHLY : 0

  if (!input.includeConsolidationModule && distinctOptionalSum === 0) {
    return { monthlyMin: 0, monthlyMax: 0, integrationMin: 0, integrationMax: 0 }
  }

  const companyMultiplier = calculateCompanyMultiplier(input.companies)
  const totalModulesPrice = basePrice + distinctOptionalSum
  const revenueAddon = calculateRevenueSubscriptionAddon(input.revenueM)
  const monthlyReference = Math.round((totalModulesPrice + revenueAddon) * companyMultiplier)
  const monthlyMin = monthlyReference
  const monthlyMax = pricingRangeHigh(monthlyReference)

  const baseIntegration = calculateIntegrationFee(input.companies)
  const integrationMin = baseIntegration
  const integrationMax = pricingRangeHigh(baseIntegration)

  return { monthlyMin, monthlyMax, integrationMin, integrationMax }
}
