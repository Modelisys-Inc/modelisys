/** Structure du compte de résultats (API) — lignes flexibles */

export const CHARGES_SECTION_LABEL = "charges d'exploitation"
export const TOTAL_CHARGES_LABEL = "total des charges"

export function normLabel(s: string): string {
  return s.trim().toLowerCase()
}

export function findChargeLineRange(structure: Record<string, unknown>[]): {
  start: number
  end: number
} | null {
  let sectionIdx = -1
  let totalIdx = -1
  for (let i = 0; i < structure.length; i++) {
    const lab = normLabel(String(structure[i]?.label ?? ""))
    if (lab === normLabel(CHARGES_SECTION_LABEL)) sectionIdx = i
    if (lab === normLabel(TOTAL_CHARGES_LABEL)) totalIdx = i
  }
  if (sectionIdx === -1 || totalIdx === -1 || totalIdx <= sectionIdx + 1) return null
  return { start: sectionIdx + 1, end: totalIdx }
}

export function compareAnnexLetters(a?: string, b?: string): number {
  const ax = (a ?? "\uFFFF").trim().toUpperCase()
  const bx = (b ?? "\uFFFF").trim().toUpperCase()
  if (ax === bx) return 0
  if (!a && b) return 1
  if (a && !b) return -1
  return ax.localeCompare(bx, "fr", { numeric: true })
}

export function normalizeAnnexLetter(raw: string): string {
  return raw.trim().toUpperCase().slice(0, 8)
}

export function cloneStructure(s: Record<string, unknown>[]): Record<string, unknown>[] {
  return JSON.parse(JSON.stringify(s)) as Record<string, unknown>[]
}

export function newChargeRow(): Record<string, unknown> {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? `charge-${crypto.randomUUID()}`
      : `charge-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  return {
    label: "Nouvelle charge",
    indent: true,
    hidden: false,
    defineMapping: false,
    linkCode: "",
    annexLetter: "",
    id,
  }
}

/** Ligne structure sans libellé (espacement) — pas de case « Définir » */
export function isStructureRowEmptyLabel(row: Record<string, unknown>): boolean {
  return String(row.label ?? "").trim() === ""
}

/** Ligne masquée au sommaire / détail (champ structure `hidden`). */
export function isStructureRowHidden(row: Record<string, unknown>): boolean {
  return row.hidden === true
}

/**
 * Case « Définir » cochée : explicitement true, ou données existantes (liaison / annexe),
 * sauf si explicitement désactivée (false).
 */
export function isDefineMappingChecked(row: Record<string, unknown>): boolean {
  if (isStructureRowEmptyLabel(row)) return false
  if (isStructureRowHidden(row)) return false
  if (row.defineMapping === false) return false
  if (row.defineMapping === true) return true
  const hasLink = String(row.linkCode ?? "").trim() !== ""
  const hasAnnex = String(row.annexLetter ?? "").trim() !== ""
  return hasLink || hasAnnex
}

/** Associe une ligne d’état (id / code liaison / libellé) à une entrée de structure sauvegardée. */
export function findStructureRowForStatementLine(
  statementLineId: string,
  statementLineLabel: string,
  structure: Record<string, unknown>[]
): Record<string, unknown> | undefined {
  const idNorm = String(statementLineId ?? "").trim()
  if (idNorm) {
    const byId = structure.find((s) => {
      const r = s as Record<string, unknown>
      const id = String(r.id ?? "").trim()
      const link = String(r.linkCode ?? "").trim()
      return id === idNorm || link === idNorm
    })
    if (byId) return byId as Record<string, unknown>
  }
  const lbl = normLabel(statementLineLabel)
  if (!lbl) return undefined
  return structure.find(
    (s) => normLabel(String((s as Record<string, unknown>).label ?? "")) === lbl
  ) as Record<string, unknown> | undefined
}

/** Libellé unique pour le détail : « Annexe X — Poste » ou seulement le poste. */
export function formatDetailLabelWithAnnex(lineLabel: string, annexLetter?: string | null): string {
  const ann = annexLetter?.trim().toUpperCase()
  if (ann) return `Annexe ${ann} — ${lineLabel}`
  return lineLabel
}
