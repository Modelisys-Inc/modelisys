import {
  findStructureRowForStatementLine,
  getStructureRowGlobalIndex,
  isCodeMappingEnabled,
  isShowInDetail,
  isStructureRowDetailOnly,
  normalizeAnnexLetter,
  resolveStructureAnnexLetter,
  structureRowUsesExcludedProjectionExpenseLinkCode,
  collectLinkCodesFromStructureRow,
} from "@/lib/income-statement-structure-utils"
import { isCapexDrivenAmortizationIsLinkCode } from "@/lib/capex-forecast-resolve"
import { isDebtDrivenInterestIsLinkCode } from "@/lib/debt-forecast-resolve"

export type AnnexSourceRow = {
  id?: string
  label: string
  annexLetter?: string | null
  isSection?: boolean
  isResult?: boolean
}

export type DetailAnnexMeta = {
  structRow: Record<string, unknown> | undefined
  sub: boolean
  annexLetter: string
  isAnnexTitle: boolean
}

/**
 * Sous-lignes `detailOnly` d’une annexe dont `owner` est le poste sommaire
 * (ex. CMV → Achats CMV.2… = contenu du Sous-total — Annexe B).
 */
export function listAnnexDetailSeriesIdsForOwner(
  owner: { id: string; label: string },
  seriesRows: { id: string; label: string }[],
  structure: Record<string, unknown>[],
): string[] {
  if (!structure.length || !owner.id) return []
  const ownerStruct = findStructureRowForStatementLine(owner.id, owner.label, structure)
  if (!ownerStruct || isStructureRowDetailOnly(ownerStruct)) return []
  const letter = normalizeAnnexLetter(resolveStructureAnnexLetter(ownerStruct, structure))
  if (!letter) return []

  const ids: string[] = []
  const seen = new Set<string>()

  const tryAdd = (id: string, label: string) => {
    const trimmedId = String(id ?? "").trim()
    if (!trimmedId || seen.has(trimmedId)) return
    const cs = findStructureRowForStatementLine(trimmedId, label, structure)
    if (!cs || !isStructureRowDetailOnly(cs)) return
    if (!isShowInDetail(cs, structure) || !isCodeMappingEnabled(cs)) return
    // Amort. Capex / intérêts Financement : exclus des hyp. Dépenses mais inclus
    // au rollup annexe Pro Forma une fois injectés.
    if (
      structureRowUsesExcludedProjectionExpenseLinkCode(cs) &&
      !collectLinkCodesFromStructureRow(cs).some(
        (code) =>
          isCapexDrivenAmortizationIsLinkCode(code) || isDebtDrivenInterestIsLinkCode(code),
      )
    ) {
      return
    }
    const childLetter = normalizeAnnexLetter(resolveStructureAnnexLetter(cs, structure))
    if (childLetter !== letter) return
    seen.add(trimmedId)
    ids.push(trimmedId)
  }

  for (const sr of seriesRows) {
    tryAdd(sr.id, sr.label)
  }
  for (const row of structure) {
    if (!isStructureRowDetailOnly(row)) continue
    const id =
      String(row.id ?? "").trim() ||
      String(row.linkCode ?? "").trim() ||
      String(row.label ?? "").trim()
    tryAdd(id, String(row.label ?? "").trim() || id)
  }
  return ids
}

/**
 * Lettre d’annexe + titre : la série n’a souvent pas `annexLetter` sur les
 * sous-lignes `detailOnly`. Sans repli structure, le bloc se coupe et un
 * sous-total vide s’insère à côté des vraies lignes (doublons visuels).
 */
export function resolveDetailAnnexMeta(
  row: AnnexSourceRow,
  structure: Record<string, unknown>[] | null | undefined,
  peerRows: AnnexSourceRow[] = [],
): DetailAnnexMeta {
  const structRow = structure?.length
    ? findStructureRowForStatementLine(String(row.id ?? ""), row.label, structure)
    : undefined
  const sub = structRow ? isStructureRowDetailOnly(structRow) : false
  const annexLetter = normalizeAnnexLetter(
    String(row.annexLetter ?? "").trim() ||
      (structRow && structure?.length ? resolveStructureAnnexLetter(structRow, structure) : ""),
  )

  let hasPeerDetailOnlySameAnnex = false
  if (structure?.length && annexLetter) {
    for (const other of peerRows) {
      if (other === row) continue
      if (other.id && row.id && other.id === row.id) continue
      const oStruct = findStructureRowForStatementLine(
        String(other.id ?? ""),
        other.label,
        structure,
      )
      if (!oStruct || !isStructureRowDetailOnly(oStruct)) continue
      const oLetter = normalizeAnnexLetter(
        String(other.annexLetter ?? "").trim() || resolveStructureAnnexLetter(oStruct, structure),
      )
      if (oLetter === annexLetter) {
        hasPeerDetailOnlySameAnnex = true
        break
      }
    }
  }

  const isAnnexTitle = !!(
    structRow &&
    !sub &&
    !row.isResult &&
    !row.isSection &&
    annexLetter !== "" &&
    hasPeerDetailOnlySameAnnex
  )

  return { structRow, sub, annexLetter, isAnnexTitle }
}

/** Sous-total + ligne vide seulement s’il y a un vrai bloc (titre + lignes, ou ≥ 2 lignes). */
export function annexGroupShouldShowSubtotal(
  group: {
    isAnnexTitle?: boolean
    isAnnexPlaceholder?: boolean
    isAnnexSubtotal?: boolean
    isSection?: boolean
  }[],
): boolean {
  const hasTitle = group.some((r) => r.isAnnexTitle)
  const amountLineCount = group.filter(
    (r) => !r.isAnnexTitle && !r.isAnnexPlaceholder && !r.isAnnexSubtotal && !r.isSection,
  ).length
  return (hasTitle && amountLineCount > 0) || amountLineCount >= 2
}

/** Titre d’annexe isolé (aucun poste) : on ne l’affiche pas. */
export function omitAnnexTitleRowsWithoutAmountPosts<
  T extends {
    isAnnexTitle?: boolean
    isAnnexPlaceholder?: boolean
    isAnnexSubtotal?: boolean
    isSection?: boolean
    annexLetter?: string
  },
>(rows: T[]): T[] {
  const lettersWithPosts = new Set<string>()
  for (const r of rows) {
    if (r.isAnnexTitle || r.isAnnexPlaceholder || r.isAnnexSubtotal || r.isSection) continue
    const letter = normalizeAnnexLetter(String(r.annexLetter ?? ""))
    if (letter) lettersWithPosts.add(letter)
  }
  return rows.filter((r) => {
    if (!r.isAnnexTitle) return true
    const letter = normalizeAnnexLetter(String(r.annexLetter ?? ""))
    return letter !== "" && lettersWithPosts.has(letter)
  })
}

/** Une ligne structure = une ligne Détail (évite série sync + ligne UUID en double). */
export function uniqueStatementRowsByStructureIndex<T extends { id?: string; label: string }>(
  rows: T[],
  structure: Record<string, unknown>[],
): T[] {
  const byIdx = new Map<number, T>()
  for (const row of rows) {
    const sr = findStructureRowForStatementLine(String(row.id ?? ""), row.label, structure)
    if (!sr) continue
    const idx = getStructureRowGlobalIndex(sr, structure)
    const prev = byIdx.get(idx)
    const structId = String(sr.id ?? "").trim()
    if (!prev || (structId && String(row.id ?? "") === structId)) {
      byIdx.set(idx, row)
    }
  }
  return [...byIdx.values()].sort((a, b) => {
    const srA = findStructureRowForStatementLine(String(a.id ?? ""), a.label, structure)!
    const srB = findStructureRowForStatementLine(String(b.id ?? ""), b.label, structure)!
    return getStructureRowGlobalIndex(srA, structure) - getStructureRowGlobalIndex(srB, structure)
  })
}
