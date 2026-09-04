/**
 * Indicateurs d’aperçu Valeur comptable ajusté (bandeau type Pilotage / Rapport).
 */

import { findSummaryStructureRow } from "@/lib/balance-sheet-summary-expand"
import {
  findBalanceSheetTotalAssetsRow,
  normalizeBalanceSheetLabel,
} from "@/lib/balance-sheet-validation"
import {
  netTangibleDerivedAmount,
  netTangibleRollupRowFromStructure,
  resolveNetTangibleColumnRollups,
  type NetTangibleColumnAmounts,
  type NetTangibleRollupRow,
} from "@/lib/net-tangible-column-rollup"
import {
  findBalanceSheetTotalLiabilitiesOnlyRow,
  isEquityTotalLabel,
  resolveNetTangibleActifNetVcaAcn,
} from "@/lib/net-tangible-equity-display"
import { isNetTangibleJvmCapexRootRow } from "@/lib/net-tangible-jvm-capex"

export type NetTangibleOverviewMetricId =
  | "vc"
  | "vca"
  | "acn"
  | "dettes"
  | "actifs-excedentaires"
  | "actifs-requis"
  | "fdr-representatif"

export type NetTangibleOverviewMetric = {
  id: NetTangibleOverviewMetricId
  label: string
  /** null → afficher « — » (ex. FDR pas encore saisi). */
  value: number | null
  /** Infobulle : impact sur la valeur d’entreprise / la valeur des actions. */
  hint: string
}

export type NetTangibleOverviewRow = {
  label: string
  current: number
  id?: string
  rowId?: string
  linkCode?: string
  isSection?: boolean
  isResult?: boolean
  indent?: boolean
}

/**
 * Calcule les 7 indicateurs du bandeau VCA.
 *
 * - VC / VCA / ACN : Actif net (valeur comptable, ajustée, nette)
 * - Actifs excédentaires : Total ACT − Total PCT (colonne Actifs)
 * - Actifs requis : Total ALT (colonne ACN)
 * - FDR représentatif (base) : Total actif CT − Total passif CT (colonne ACN)
 *   — le bandeau affiche ensuite le FDR ajusté via `applyNetTangibleFdrOverviewAdjustment`
 */
export function buildNetTangibleOverviewMetrics(
  rows: NetTangibleOverviewRow[],
  valuesByRowId: Record<string, NetTangibleColumnAmounts>,
  options?: {
    structure?: Record<string, unknown>[]
  },
): NetTangibleOverviewMetric[] {
  const structure = options?.structure ?? []
  const amountRows = rows.map((row) => ({
    label: row.label,
    current: row.current ?? 0,
    rowId: row.rowId ?? row.id,
  }))

  const rollupRows = rows.map((row) => {
    const rowId = row.rowId ?? row.id
    const normalizedLabel = normalizeBalanceSheetLabel(row.label)
    const structRow =
      structure.length > 0
        ? findSummaryStructureRow(rowId, row.label, structure) ??
          structure.find(
            (candidate) =>
              normalizeBalanceSheetLabel(String(candidate.label ?? "")) === normalizedLabel,
          ) ??
          null
        : null
    return netTangibleRollupRowFromStructure(
      {
        label: row.label,
        rowId,
        linkCode: row.linkCode,
        isSection: row.isSection,
        isResult: row.isResult,
        indent: row.indent,
      },
      structRow,
    )
  })

  const jvmCapexLeafIds = new Set(
    rollupRows
      .filter(
        (row) =>
          row.rowId &&
          isNetTangibleJvmCapexRootRow({
            linkCode: row.linkCode,
            rowId: row.rowId,
            label: row.label,
          }),
      )
      .map((row) => row.rowId as string),
  )

  const amountsByRowId = resolveNetTangibleColumnRollups(rollupRows, valuesByRowId, {
    treatAsLeafRowIds: jvmCapexLeafIds,
  })

  const equityRow = rows.find((r) => isEquityTotalLabel(r.label))
  const vc = equityRow?.current ?? 0

  const actifNet = resolveNetTangibleActifNetVcaAcn(amountRows, amountsByRowId)
  const vca = actifNet?.vca ?? null
  const acn = actifNet?.acn ?? null

  let dettes = 0
  for (const values of Object.values(valuesByRowId)) {
    dettes += values.debts
  }

  // --- Actifs (passifs) excédentaires : Total de l'actif − Total des passifs (colonne Actifs) ---
  const rowsWithRowId = amountRows.map((r, i) => ({
    ...r,
    label: rows[i]?.label ?? r.label,
    rowId: r.rowId,
  }))
  const totalAssetsRow = findBalanceSheetTotalAssetsRow(rowsWithRowId)
  const totalLiabilitiesRow = findBalanceSheetTotalLiabilitiesOnlyRow(rowsWithRowId)

  const actifsExcedentaires =
    totalAssetsRow?.rowId && totalLiabilitiesRow?.rowId
      ? (amountsByRowId[totalAssetsRow.rowId]?.assets ?? 0) -
        (amountsByRowId[totalLiabilitiesRow.rowId]?.assets ?? 0)
      : null

  // --- Actifs requis pour les activités : Total ALT (colonne ACN) ---
  const altFamily = resolveNetTangibleFamilyAggregate(rollupRows, amountRows, amountsByRowId, "ALT")
  const actifsRequis = altFamily
    ? netTangibleDerivedAmount(altFamily.current, altFamily.amounts, "acn")
    : null

  // --- FDR représentatif : Total actif court terme − Total passif court terme (colonne ACN) ---
  const actCtRow = findBalanceSheetShortTermTotalRow(rowsWithRowId, "actif")
  const pctCtRow = findBalanceSheetShortTermTotalRow(rowsWithRowId, "passif")

  const fdrRepresentatif =
    actCtRow?.rowId && pctCtRow?.rowId
      ? netTangibleDerivedAmount(
          actCtRow.current ?? 0,
          amountsByRowId[actCtRow.rowId],
          "acn",
        ) -
        netTangibleDerivedAmount(
          pctCtRow.current ?? 0,
          amountsByRowId[pctCtRow.rowId],
          "acn",
        )
      : null

  return [
    {
      id: "vc",
      label: "VC",
      value: vc,
      hint: "Valeur nette des actifs de l’entreprise selon ses états financiers, soit les actifs moins les passifs comptables. Elle constitue le point de départ de l’approche de la valeur comptable ajustée.",
    },
    {
      id: "vca",
      label: "VCA",
      value: vca,
      hint: "Valeur comptable après ajustement des actifs et passifs à leur valeur économique estimée. Elle vise à rapprocher la valeur comptable de la valeur réelle des éléments détenus par l’entreprise.",
    },
    {
      id: "acn",
      label: "ACN",
      value: acn,
      hint: "Valeur des actifs corporels nécessaires aux activités, après déduction des passifs qui leur sont associés. Ils représentent la base d’actifs utilisée pour générer les résultats de l’entreprise.",
    },
    {
      id: "dettes",
      label: "Dettes",
      value: dettes,
      hint: "Ensemble des obligations financières portant intérêt et autres dettes considérées dans la détermination de la valeur des capitaux propres. Elles sont déduites de la valeur des actifs lorsque l'approche l'exige.",
    },
    {
      id: "actifs-excedentaires",
      label: "Actifs (passifs) excédentaires",
      value: actifsExcedentaires,
      hint: "Actifs ou passifs qui ne sont pas nécessaires aux activités normales de l’entreprise. Leur valeur est ajoutée ou soustraite séparément afin de ne pas les confondre avec les actifs requis pour générer les résultats d’exploitation.",
    },
    {
      id: "actifs-requis",
      label: "Actifs requis pour les activités",
      value: actifsRequis,
      hint: "Actifs nécessaires au fonctionnement normal de l’entreprise et à la génération de ses résultats. Ils constituent la base opérationnelle retenue dans l’analyse de la valeur.",
    },
    {
      id: "fdr-representatif",
      label: "Fonds de roulement représentatif",
      value: fdrRepresentatif,
      hint: "Niveau de fonds de roulement considéré comme nécessaire au fonctionnement normal de l’entreprise. L’ajustement permet de tenir compte d’un niveau de fonds de roulement représentatif plutôt que simplement de la situation observée à une date donnée.",
    },
  ]
}

/**
 * Applique l’ajustement FDR représentatif au bandeau :
 * - FDR → montant ajusté
 * - ACN → ACN + écart FDR (ajustement)
 * - Actifs (passifs) excédentaires → surplus − écart FDR
 */
export function applyNetTangibleFdrOverviewAdjustment(
  metrics: NetTangibleOverviewMetric[],
  params: {
    fdrAdjustedValue: number | null
    fdrAdjustmentDollarDelta: number | null
  },
): NetTangibleOverviewMetric[] {
  const delta =
    params.fdrAdjustmentDollarDelta != null && Number.isFinite(params.fdrAdjustmentDollarDelta)
      ? params.fdrAdjustmentDollarDelta
      : 0

  return metrics.map((metric) => {
    if (metric.id === "fdr-representatif") {
      const adjusted =
        params.fdrAdjustedValue != null && Number.isFinite(params.fdrAdjustedValue)
          ? params.fdrAdjustedValue
          : metric.value
      return {
        ...metric,
        label: "FDR représentatif ajusté",
        value: adjusted,
      }
    }
    if (metric.id === "acn" && metric.value != null) {
      return {
        ...metric,
        value: metric.value + delta,
      }
    }
    if (metric.id === "actifs-excedentaires" && metric.value != null) {
      return {
        ...metric,
        value: metric.value - delta,
      }
    }
    return metric
  })
}

type NetTangibleFamilyCode = "ACT" | "PCT" | "ALT"
type NetTangibleFamilyAggregate = {
  current: number
  amounts: NetTangibleColumnAmounts
}

/** Sous-total de famille bilan (Total ACT / PCT / ALT) pour les colonnes VCA. */
function findNetTangibleFamilySubtotal(
  rollupRows: Array<NetTangibleRollupRow & { rowId?: string }>,
  amountRows: Array<{ label: string; current: number; rowId?: string }>,
  family: NetTangibleFamilyCode,
): { rowId: string; current: number } | null {
  const familyUpper = family.toUpperCase()
  const byLinkCode = rollupRows.filter(
    (row) => String(row.linkCode ?? "").trim().toUpperCase() === familyUpper,
  )
  const rollup =
    byLinkCode.find((row) => row.isResult) ??
    byLinkCode.find((row) => !row.isSection) ??
    byLinkCode[0]

  if (rollup?.rowId) {
    const amountRow = amountRows.find((row) => row.rowId === rollup.rowId)
    return { rowId: rollup.rowId, current: amountRow?.current ?? 0 }
  }

  const totalLabel = normalizeBalanceSheetLabel(`Total ${family}`)
  for (let i = amountRows.length - 1; i >= 0; i--) {
    const row = amountRows[i]!
    const rowId = row.rowId
    if (!rowId) continue
    if (normalizeBalanceSheetLabel(row.label) !== totalLabel) continue
    return { rowId, current: row.current ?? 0 }
  }

  return null
}

function addNetTangibleAmounts(
  a: NetTangibleColumnAmounts,
  b: NetTangibleColumnAmounts | undefined,
): NetTangibleColumnAmounts {
  return {
    adjustments: a.adjustments + (b?.adjustments ?? 0),
    debts: a.debts + (b?.debts ?? 0),
    assets: a.assets + (b?.assets ?? 0),
  }
}

function linkCodeBelongsToFamily(
  linkCode: string | null | undefined,
  family: NetTangibleFamilyCode,
): boolean {
  const code = String(linkCode ?? "").trim().toUpperCase()
  const anchor = family.toUpperCase()
  if (!code) return false
  return code === anchor || code.startsWith(`${anchor}-`) || code.startsWith(`${anchor}.`)
}

function resolveNetTangibleFamilyAggregate(
  rollupRows: Array<NetTangibleRollupRow & { rowId?: string }>,
  amountRows: Array<{ label: string; current: number; rowId?: string }>,
  amountsByRowId: Record<string, NetTangibleColumnAmounts>,
  family: NetTangibleFamilyCode,
): NetTangibleFamilyAggregate | null {
  const subtotal = findNetTangibleFamilySubtotal(rollupRows, amountRows, family)
  if (subtotal) {
    return {
      current: subtotal.current,
      amounts: amountsByRowId[subtotal.rowId] ?? { adjustments: 0, debts: 0, assets: 0 },
    }
  }

  // Fallback: agrège les feuilles de la famille (sans double comptage).
  const familyLeaves = rollupRows.filter((row) => {
    if (!row.rowId || row.isSection || row.isResult) return false
    return linkCodeBelongsToFamily(row.linkCode, family)
  })
  if (familyLeaves.length === 0) return null

  let current = 0
  let amounts: NetTangibleColumnAmounts = { adjustments: 0, debts: 0, assets: 0 }
  for (const row of familyLeaves) {
    const amountRow = amountRows.find((item) => item.rowId === row.rowId)
    current += amountRow?.current ?? 0
    amounts = addNetTangibleAmounts(amounts, amountsByRowId[String(row.rowId)])
  }
  return { current, amounts }
}

/**
 * Sous-total court terme du bilan : « Total de l'actif à court terme » ou
 * « Total du passif à court terme ».
 */
function findBalanceSheetShortTermTotalRow<
  T extends { label: string; current?: number; rowId?: string },
>(rows: T[], side: "actif" | "passif"): T | null {
  const sideNorm = side === "actif" ? "actif" : "passif"
  let found: T | null = null
  for (const row of rows) {
    const lab = normalizeBalanceSheetLabel(row.label)
    if (!lab.includes("total")) continue
    if (!lab.includes(sideNorm)) continue
    if (!lab.includes("court")) continue
    found = row
  }
  return found
}
