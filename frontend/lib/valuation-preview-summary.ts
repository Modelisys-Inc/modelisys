/**
 * Aperçu financier d'une valorisation pour le hub `/evaluation`,
 * sans charger les séries d'états financiers (sauf repli VCA).
 *
 * Les ForecastConfigs et risques métier sont **company-scoped** (pas valuationId).
 */

import {
  getBalanceSheet,
  getStatementStructure,
  listBusinessRisks,
  listForecastConfigs,
  type BusinessRiskData,
} from "@/lib/api"
import {
  computeCmpcWacc,
  parseBaiiaAdjustedRange,
  parseCharacteristicCashFlowRange,
  parseCmpcWaccConfig,
  parseRepresentativeRevenueRange,
} from "@/lib/cmpc-wacc"
import {
  computeCashFlowCapitalisation,
  deriveCharacteristicCashFlowRange,
  EBITDA_MULTIPLE_CONFIG_TYPE,
  parseVcaFdrPctOfRevenue,
} from "@/lib/ebitda-capitalisation"
import { resolveNetTangibleOverviewVca } from "@/lib/net-tangible-overview"

export const CMPC_MULTIPLICATEUR_CONFIG_TYPE = "cmpc-multiplicateur"
export const NET_TANGIBLE_FDR_ADJUSTMENT_CONFIG_TYPE = "net-tangible-fdr-adjustment"
export const NET_TANGIBLE_ASSETS_VALUES_CONFIG_TYPE = "net-tangible-assets-values"

export type ValuationPreviewSummary = {
  companyId: string
  highRiskNames: string[]
  vca: number | null
  acn: number | null
  revenueRepresentativeMid: number | null
  baiiaAdjustedMid: number | null
  cashFlowMid: number | null
  multipleRetained: number | null
  enterpriseValueMid: number | null
  goodwillMid: number | null
}

export type ValuationPreviewSources = {
  risks: BusinessRiskData[]
  ebitdaConfigData: unknown
  cmpcConfigData: unknown
  vcaFdrData: unknown
  /** VCA calculée (bilan + ajustements) si absente de `vcaFdrData`. */
  computedVca?: number | null
}

export type ValuationPreviewReference = {
  month: number
  year: number
}

export function parseVcaAcn(data: unknown): number | null {
  if (!data || typeof data !== "object") return null
  const raw = (data as Record<string, unknown>).acn
  const n = typeof raw === "number" ? raw : Number(raw)
  return Number.isFinite(n) ? n : null
}

export function parseVcaAmount(data: unknown): number | null {
  if (!data || typeof data !== "object") return null
  const raw = (data as Record<string, unknown>).vca
  const n = typeof raw === "number" ? raw : Number(raw)
  return Number.isFinite(n) ? n : null
}

function parseEconomicGrowthPct(ebitdaConfigData: unknown): number {
  if (!ebitdaConfigData || typeof ebitdaConfigData !== "object") return 0
  const raw = (ebitdaConfigData as Record<string, unknown>).cashFlowEconomicGrowth
  const n = typeof raw === "number" ? raw : Number(raw)
  return Number.isFinite(n) ? n : 0
}

export function buildValuationPreviewSummary(
  companyId: string,
  sources: ValuationPreviewSources,
): ValuationPreviewSummary {
  const highRiskNames = sources.risks
    .filter((r) => r.level === "high")
    .map((r) => r.name.trim())
    .filter(Boolean)

  const acn = parseVcaAcn(sources.vcaFdrData)
  const vca = parseVcaAmount(sources.vcaFdrData) ?? sources.computedVca ?? null
  const revenue = parseRepresentativeRevenueRange(sources.ebitdaConfigData)
  /** Colonne Moyen · ligne Revenus du tableau Fourchette retenue (Flux monétaires). */
  const revenueRepresentativeMid = revenue?.mid ?? null
  const baiia = parseBaiiaAdjustedRange(sources.ebitdaConfigData)
  /** Colonne Moyen · ligne BAIIA ajusté du même tableau. */
  const baiiaAdjustedMid = baiia?.mid ?? null

  const fdrPct = parseVcaFdrPctOfRevenue(sources.vcaFdrData)
  const cashFlow =
    parseCharacteristicCashFlowRange(sources.ebitdaConfigData) ??
    deriveCharacteristicCashFlowRange(sources.ebitdaConfigData, fdrPct)
  const cashFlowMid = cashFlow?.mid ?? null

  let multipleRetained: number | null = null
  let enterpriseValueMid: number | null = null
  let goodwillMid: number | null = null

  if (cashFlow && sources.cmpcConfigData) {
    const { inputs } = parseCmpcWaccConfig(sources.cmpcConfigData)
    const wacc = computeCmpcWacc(inputs).wacc
    const cmpcPct = wacc
    const growth = parseEconomicGrowthPct(sources.ebitdaConfigData)
    const capitalisation = computeCashFlowCapitalisation({
      cmpcPct,
      economicGrowthPct: growth,
      cashFlowLow: cashFlow.low,
      cashFlowHigh: cashFlow.high,
    })
    multipleRetained = capitalisation.multiple
    enterpriseValueMid = capitalisation.enterpriseValue?.mid ?? null
    if (enterpriseValueMid != null && acn != null) {
      goodwillMid = enterpriseValueMid - acn
    }
  }

  return {
    companyId,
    highRiskNames,
    vca,
    acn,
    revenueRepresentativeMid,
    baiiaAdjustedMid,
    cashFlowMid,
    multipleRetained,
    enterpriseValueMid,
    goodwillMid,
  }
}

async function firstConfigData(
  companyId: string,
  configType: string,
): Promise<unknown> {
  const configs = await listForecastConfigs(companyId, { config_type: configType })
  return configs[0]?.data ?? null
}

/** Même moteur que le bandeau VCA du module Valeur comptable ajustée. */
export async function computeCompanyVcaOverview(
  companyId: string,
  reference: ValuationPreviewReference,
): Promise<number | null> {
  try {
    const [bs, structureRes, valuesConfigs] = await Promise.all([
      getBalanceSheet(companyId, {
        fiscal_year: reference.year,
        month: reference.month,
        period: "monthly",
      }),
      getStatementStructure(companyId, "balance-sheet"),
      listForecastConfigs(companyId, {
        config_type: NET_TANGIBLE_ASSETS_VALUES_CONFIG_TYPE,
      }),
    ])

    const structure = (structureRes.structure as Record<string, unknown>[]) ?? []
    const savedValues = (valuesConfigs[0]?.data as Record<string, number> | undefined) ?? {}
    const rows = (bs.rows ?? []).map((row) => ({
      id: row.id,
      label: row.label,
      current: row.current,
      isSection: row.isSection,
      isResult: row.isResult,
      indent: row.indent,
    }))

    return resolveNetTangibleOverviewVca(rows, savedValues, structure)
  } catch {
    return null
  }
}

export async function fetchValuationPreviewSummary(
  companyId: string,
  reference?: ValuationPreviewReference | null,
): Promise<ValuationPreviewSummary> {
  const [risks, ebitdaConfigData, cmpcConfigData, vcaFdrData] = await Promise.all([
    listBusinessRisks(companyId).catch(() => [] as BusinessRiskData[]),
    firstConfigData(companyId, EBITDA_MULTIPLE_CONFIG_TYPE).catch(() => null),
    firstConfigData(companyId, CMPC_MULTIPLICATEUR_CONFIG_TYPE).catch(() => null),
    firstConfigData(companyId, NET_TANGIBLE_FDR_ADJUSTMENT_CONFIG_TYPE).catch(() => null),
  ])

  let computedVca: number | null = null
  if (parseVcaAmount(vcaFdrData) == null && reference?.month && reference?.year) {
    computedVca = await computeCompanyVcaOverview(companyId, reference)
  }

  return buildValuationPreviewSummary(companyId, {
    risks,
    ebitdaConfigData,
    cmpcConfigData,
    vcaFdrData,
    computedVca,
  })
}

export function emptyValuationPreviewSummary(companyId = ""): ValuationPreviewSummary {
  return {
    companyId,
    highRiskNames: [],
    vca: null,
    acn: null,
    revenueRepresentativeMid: null,
    baiiaAdjustedMid: null,
    cashFlowMid: null,
    multipleRetained: null,
    enterpriseValueMid: null,
    goodwillMid: null,
  }
}
