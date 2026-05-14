/**
 * Référence unique pour les codes de liaison (structures CR + bilan) :
 * utilisé par la page « Codes de liaison » et le mapping comptable.
 */

import {
  collectDistinctLinkCodesFromStructure,
  LINK_CODE_PROVENANCE_BILAN,
  LINK_CODE_PROVENANCE_RESULTATS,
  mapLinkCodesToDetailLabels,
  mapLinkCodesToDtCt,
  mapLinkCodesToGroupeLinkCodes,
  mapLinkCodesToSummaryLabels,
} from "@/lib/income-statement-structure-utils"

export type LinkCodeTableRow = {
  code: string
  provenance: string
  labelDetail: string
  labelSummary: string
}

function isUsableLabel(v: string | undefined): boolean {
  return v !== undefined && v !== "" && v !== "—"
}

/** Pour chaque code : valeur structure CR si disponible, sinon bilan. */
function mergeStringMapsPreferIncome(
  incomeMap: Map<string, string>,
  balanceMap: Map<string, string>
): Map<string, string> {
  const out = new Map<string, string>()
  const keys = new Set([...incomeMap.keys(), ...balanceMap.keys()])
  for (const k of keys) {
    const isV = incomeMap.get(k)
    const bsV = balanceMap.get(k)
    const v = isUsableLabel(isV) ? isV! : isUsableLabel(bsV) ? bsV! : (isV ?? bsV ?? "")
    if (v !== "" && v !== "—") out.set(k, v)
  }
  return out
}

function mergeDtCtMaps(
  incomeMap: Map<string, "DT" | "CT">,
  balanceMap: Map<string, "DT" | "CT">
): Map<string, "DT" | "CT"> {
  const out = new Map<string, "DT" | "CT">()
  const keys = new Set([...incomeMap.keys(), ...balanceMap.keys()])
  for (const k of keys) {
    const v = incomeMap.get(k) ?? balanceMap.get(k)
    if (v) out.set(k, v)
  }
  return out
}

export type LinkCodeReferenceMaps = {
  incomeStatementCodes: Set<string>
  balanceSheetCodes: Set<string>
  summaryEfByLinkCode: Map<string, string>
  detailEfByLinkCode: Map<string, string>
  groupeByLinkCode: Map<string, string>
  dtCtByLinkCode: Map<string, "DT" | "CT">
}

/**
 * Cartes code → libellés / groupe / DT·CT à partir des structures compte de résultat et bilan
 * (même logique sous-jacente que la page Codes de liaison ; fusion : priorité au CR puis bilan).
 */
export function buildLinkCodeReferenceFromStructures(
  incomeStructure: Record<string, unknown>[],
  balanceSheetStructure: Record<string, unknown>[]
): LinkCodeReferenceMaps {
  const isStruct = incomeStructure ?? []
  const bsStruct = balanceSheetStructure ?? []

  const summaryIs = isStruct.length ? mapLinkCodesToSummaryLabels(isStruct) : new Map<string, string>()
  const summaryBs = bsStruct.length ? mapLinkCodesToSummaryLabels(bsStruct) : new Map<string, string>()
  const detailIs = isStruct.length
    ? mapLinkCodesToDetailLabels(isStruct, { includeAnnexPrefix: false })
    : new Map<string, string>()
  const detailBs = bsStruct.length
    ? mapLinkCodesToDetailLabels(bsStruct, { includeAnnexPrefix: false })
    : new Map<string, string>()
  const groupeIs = isStruct.length ? mapLinkCodesToGroupeLinkCodes(isStruct) : new Map<string, string>()
  const groupeBs = bsStruct.length ? mapLinkCodesToGroupeLinkCodes(bsStruct) : new Map<string, string>()
  const dtIs = isStruct.length ? mapLinkCodesToDtCt(isStruct) : new Map<string, "DT" | "CT">()
  const dtBs = bsStruct.length ? mapLinkCodesToDtCt(bsStruct) : new Map<string, "DT" | "CT">()

  const incomeStatementCodes = isStruct.length
    ? new Set(collectDistinctLinkCodesFromStructure(isStruct))
    : new Set<string>()
  const balanceSheetCodes = bsStruct.length
    ? new Set(collectDistinctLinkCodesFromStructure(bsStruct))
    : new Set<string>()

  return {
    incomeStatementCodes,
    balanceSheetCodes,
    summaryEfByLinkCode: mergeStringMapsPreferIncome(summaryIs, summaryBs),
    detailEfByLinkCode: mergeStringMapsPreferIncome(detailIs, detailBs),
    groupeByLinkCode: mergeStringMapsPreferIncome(groupeIs, groupeBs),
    dtCtByLinkCode: mergeDtCtMaps(dtIs, dtBs),
  }
}

/**
 * Libellé colonne « Type » (mapping) : aligné sur les codes présents dans chaque structure.
 */
export function provenanceLabelFromLinkCodes(
  linkCode: string | undefined,
  incomeCodes: Set<string>,
  balanceSheetCodes: Set<string>
): string {
  const lc = linkCode?.trim()
  if (!lc) return "0"
  const inIs = incomeCodes.has(lc)
  const inBs = balanceSheetCodes.has(lc)
  if (inIs && inBs) return `${LINK_CODE_PROVENANCE_RESULTATS} · ${LINK_CODE_PROVENANCE_BILAN}`
  if (inIs) return LINK_CODE_PROVENANCE_RESULTATS
  if (inBs) return LINK_CODE_PROVENANCE_BILAN
  return "0"
}

/** Lignes du tableau de la page Codes de liaison (une ligne par couple code × provenance). */
export function buildLinkCodeTableRows(
  incomeStructure: Record<string, unknown>[] | null | undefined,
  balanceSheetStructure: Record<string, unknown>[] | null | undefined
): LinkCodeTableRow[] {
  const is = incomeStructure ?? []
  const bs = balanceSheetStructure ?? []
  const out: LinkCodeTableRow[] = []

  const pushFromStructure = (structure: Record<string, unknown>[], provenance: string) => {
    if (!structure.length) return
    const codes = collectDistinctLinkCodesFromStructure(structure)
    const labelsDetail = mapLinkCodesToDetailLabels(structure, { includeAnnexPrefix: false })
    const labelsSummary = mapLinkCodesToSummaryLabels(structure)
    for (const code of codes) {
      out.push({
        code,
        provenance,
        labelDetail: labelsDetail.get(code) ?? "—",
        labelSummary: labelsSummary.get(code) ?? "—",
      })
    }
  }

  if (is.length) pushFromStructure(is, LINK_CODE_PROVENANCE_RESULTATS)
  if (bs.length) pushFromStructure(bs, LINK_CODE_PROVENANCE_BILAN)

  out.sort((a, b) => {
    const c = a.code.localeCompare(b.code, "fr", { numeric: true })
    if (c !== 0) return c
    return a.provenance.localeCompare(b.provenance, "fr")
  })
  return out
}
