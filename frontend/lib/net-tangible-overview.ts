/**
 * Indicateurs d’aperçu Valeur comptable ajusté (bandeau type Pilotage / Rapport).
 */

import { findBalanceSheetTotalAssetsRow } from "@/lib/balance-sheet-validation"
import { findSummaryStructureRow } from "@/lib/balance-sheet-summary-expand"
import {
  netTangibleDerivedAmount,
  netTangibleRollupRowFromStructure,
  resolveNetTangibleColumnRollups,
  type NetTangibleColumnAmounts,
} from "@/lib/net-tangible-column-rollup"
import {
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
  hint: string
}

export type NetTangibleOverviewRow = {
  label: string
  current: number
  id?: string
  rowId?: string
  isSection?: boolean
  isResult?: boolean
  indent?: boolean
}

/**
 * Calcule les 7 indicateurs du bandeau VCA.
 *
 * - VC / VCA / ACN : Actif net (valeur comptable, ajustée, nette)
 * - Dettes / Actifs excédentaires : totaux des colonnes homonymes
 * - Actifs requis : Total de l'actif VCA − Actifs (passifs) excédentaires
 * - FDR représentatif : réservé (null tant que non saisi)
 */
export function buildNetTangibleOverviewMetrics(
  rows: NetTangibleOverviewRow[],
  valuesByRowId: Record<string, NetTangibleColumnAmounts>,
  options?: {
    structure?: Record<string, unknown>[]
    fdrRepresentatif?: number | null
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
    const structRow =
      structure.length > 0
        ? findSummaryStructureRow(rowId, row.label, structure) ?? null
        : null
    return netTangibleRollupRowFromStructure(
      {
        label: row.label,
        rowId,
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
  let actifsExcedentaires = 0
  for (const values of Object.values(valuesByRowId)) {
    dettes += values.debts
    actifsExcedentaires += values.assets
  }

  const totalAssetsRow = findBalanceSheetTotalAssetsRow(amountRows)
  const totalAssetsRowId = totalAssetsRow?.rowId
  const totalAssetsVca = totalAssetsRow
    ? netTangibleDerivedAmount(
        totalAssetsRow.current ?? 0,
        totalAssetsRowId ? amountsByRowId[totalAssetsRowId] : undefined,
        "vca",
      )
    : null

  const actifsRequis =
    totalAssetsVca == null ? null : totalAssetsVca - actifsExcedentaires

  const fdr =
    options?.fdrRepresentatif === undefined ? null : options.fdrRepresentatif

  return [
    {
      id: "vc",
      label: "VC",
      value: vc,
      hint: "Valeur comptable — Actif net",
    },
    {
      id: "vca",
      label: "VCA",
      value: vca,
      hint: "Valeur comptable ajustée — Actif net",
    },
    {
      id: "acn",
      label: "ACN",
      value: acn,
      hint: "Actif corporel net",
    },
    {
      id: "dettes",
      label: "Dettes",
      value: dettes,
      hint: "Valeur des dettes",
    },
    {
      id: "actifs-excedentaires",
      label: "Actifs (passifs) excédentaires",
      value: actifsExcedentaires,
      hint: "Hors exploitation",
    },
    {
      id: "actifs-requis",
      label: "Actifs requis pour les activités",
      value: actifsRequis,
      hint: "Total actif VCA − Actifs excédentaires",
    },
    {
      id: "fdr-representatif",
      label: "Fonds de roulement représentatif",
      value: fdr,
      hint: "Section FDR représentatif",
    },
  ]
}
