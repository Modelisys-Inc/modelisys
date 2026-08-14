import {
  findStructureRowForStatementLine,
  getStructureRowGlobalIndex,
  isStructureRowDetailOnly,
  normalizeAnnexLetter,
  resolveStructureAnnexLetter,
} from "@/lib/income-statement-structure-utils"

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
