/** Structure du compte de résultats (API) — lignes flexibles */

export const CHARGES_SECTION_LABEL = "charges d'exploitation"
export const TOTAL_CHARGES_LABEL = "total des charges"

/** Provenance pour les codes issus de la structure compte de résultat (Income statement). */
export const LINK_CODE_PROVENANCE_RESULTATS = "Résultats"

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

export function newChargeRow(options?: { indent?: boolean; isBold?: boolean }): Record<string, unknown> {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? `charge-${crypto.randomUUID()}`
      : `charge-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  return {
    label: "Nouvelle charge",
    indent: options?.indent ?? true,
    isBold: options?.isBold ?? false,
    hidden: false,
    separatorAbove: false,
    defineMapping: false,
    showInDetail: true,
    linkCode: "",
    annexLetter: "",
    id,
  }
}

/** Ligne structure sans libellé (espacement) — pas de case « Annexe » */
export function isStructureRowEmptyLabel(row: Record<string, unknown>): boolean {
  return String(row.label ?? "").trim() === ""
}

/** Ligne d’espacement vide entre les postes (Sommaire). */
export function newEmptySpacerSummaryRow(): Record<string, unknown> {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? `spacer-${crypto.randomUUID()}`
      : `spacer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  return {
    id,
    label: "",
    hidden: false,
  }
}

/** Ligne masquée au sommaire / détail (champ structure `hidden`). */
export function isStructureRowHidden(row: Record<string, unknown>): boolean {
  return row.hidden === true
}

/**
 * Case « Code » : liaison + lettre modifiables (defineMapping ou données existantes).
 */
export function isCodeMappingEnabled(row: Record<string, unknown>): boolean {
  if (isStructureRowEmptyLabel(row)) return false
  if (isStructureRowHidden(row)) return false
  if (row.defineMapping === false) return false
  if (row.defineMapping === true) return true
  const hasLink = String(row.linkCode ?? "").trim() !== ""
  const hasAnnex = String(row.annexLetter ?? "").trim() !== ""
  return hasLink || hasAnnex
}

/** @deprecated utiliser isCodeMappingEnabled — alias conservé pour les imports existants */
export function isDefineMappingChecked(row: Record<string, unknown>): boolean {
  return isCodeMappingEnabled(row)
}

/**
 * Case « Annexe » (affichage au Détail). Si absent (données anciennes), même comportement
 * qu’avant : visible au détail lorsque le code de liaison est actif.
 */
export function isShowInDetail(row: Record<string, unknown>): boolean {
  if (isStructureRowEmptyLabel(row)) return false
  if (isStructureRowHidden(row)) return false
  if (isStructureRowDetailOnly(row)) return true
  if (row.showInDetail === false) return false
  if (row.showInDetail === true) return true
  return isCodeMappingEnabled(row)
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

/**
 * Position globale de la ligne dans le tableau structure (ordre Paramètres / API).
 * Utilisé pour afficher le Détail dans le même ordre que la configuration.
 */
export function getStructureRowGlobalIndex(
  row: Record<string, unknown>,
  structure: Record<string, unknown>[]
): number {
  const id = String(row.id ?? "").trim()
  if (id) {
    const byId = structure.findIndex((s) => String((s as Record<string, unknown>).id ?? "").trim() === id)
    if (byId >= 0) return byId
  }
  const lbl = normLabel(String(row.label ?? ""))
  const byLabel = structure.findIndex(
    (s) => normLabel(String((s as Record<string, unknown>).label ?? "")) === lbl
  )
  return byLabel >= 0 ? byLabel : Number.MAX_SAFE_INTEGER
}

/** Libellé unique pour le détail : « Annexe X — Poste » ou seulement le poste. */
export function formatDetailLabelWithAnnex(lineLabel: string, annexLetter?: string | null): string {
  const ann = annexLetter?.trim().toUpperCase()
  if (ann) return `Annexe ${ann} — ${lineLabel}`
  return lineLabel
}

/**
 * Libellé affiché au Détail (hors édition paramètres) : reprend le texte saisi dans la
 * structure pour préserver casse et ponctuation (ex. « Produits - CS-SS »).
 */
export function detailLineLabelForDisplay(
  structureRow: Record<string, unknown> | undefined,
  apiLineLabel: string,
  annexLetter?: string | null
): string {
  const raw = structureRow ? String(structureRow.label ?? "").trim() : ""
  const base = raw || apiLineLabel
  if (structureRow && isStructureRowDetailOnly(structureRow)) {
    return base
  }
  return formatDetailLabelWithAnnex(base, annexLetter)
}

/** Ligne réservée au tableau Détail (sous-catégorie d’annexe), absente du Sommaire. */
export function isStructureRowDetailOnly(row: Record<string, unknown>): boolean {
  return row.detailOnly === true
}

export function newDetailSubLineRow(annexLetter: string): Record<string, unknown> {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? `detail-${crypto.randomUUID()}`
      : `detail-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const letter = normalizeAnnexLetter(annexLetter)
  return {
    id,
    label: "Nouvelle ligne",
    detailOnly: true,
    hidden: false,
    defineMapping: true,
    showInDetail: true,
    linkCode: "",
    annexLetter: letter,
    indent: true,
  }
}

/** Dernière ligne de structure portant cette annexe (parcours global — préférer findStructureInsertIndexAfterAnnexContiguousBlock pour le Détail). */
export function findLastStructureIndexForAnnexLetter(
  structure: Record<string, unknown>[],
  letter: string
): number {
  const target = normalizeAnnexLetter(letter)
  let last = -1
  for (let i = 0; i < structure.length; i++) {
    if (normalizeAnnexLetter(String(structure[i]?.annexLetter ?? "")) === target) last = i
  }
  return last
}

/**
 * Dernier indice du bloc contigu pour cette lettre d’annexe, en partant de la ligne sommaire
 * (non `detailOnly`). Les sous-lignes Détail doivent rester juste sous ce bloc, sans être
 * poussées après d’autres postes du sommaire intercalés.
 */
export function findStructureInsertIndexAfterAnnexContiguousBlock(
  structure: Record<string, unknown>[],
  letter: string
): number {
  const target = normalizeAnnexLetter(letter)
  if (!target) return -1

  let anchor = -1
  for (let i = 0; i < structure.length; i++) {
    const r = structure[i]!
    if (isStructureRowDetailOnly(r)) continue
    if (normalizeAnnexLetter(String(r.annexLetter ?? "")) === target) {
      anchor = i
      break
    }
  }
  if (anchor < 0) {
    for (let i = 0; i < structure.length; i++) {
      const r = structure[i]!
      if (normalizeAnnexLetter(String(r.annexLetter ?? "")) === target) {
        anchor = i
        break
      }
    }
  }
  if (anchor < 0) return -1

  let last = anchor
  for (let i = anchor + 1; i < structure.length; i++) {
    const r = structure[i]!
    if (normalizeAnnexLetter(String(r.annexLetter ?? "")) === target) last = i
    else break
  }
  return last
}

/** Lettres d’annexe disponibles pour ajouter une sous-ligne (postes « Annexe » au sommaire, hors detailOnly). */
export function listAnnexLettersForDetailSubLines(structure: Record<string, unknown>[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const row of structure) {
    if (isStructureRowEmptyLabel(row)) continue
    if (isStructureRowDetailOnly(row)) continue
    if (!isCodeMappingEnabled(row)) continue
    const a = normalizeAnnexLetter(String(row.annexLetter ?? ""))
    if (!a) continue
    if (seen.has(a)) continue
    seen.add(a)
    out.push(a)
  }
  out.sort((x, y) => compareAnnexLetters(x, y))
  return out
}

/** Même périmètre que `listAnnexLettersForDetailSubLines`, avec le libellé du poste sommaire pour l’UI. */
export function listAnnexOptionsForDetailSubLineModal(
  structure: Record<string, unknown>[]
): { letter: string; title: string }[] {
  const seen = new Set<string>()
  const out: { letter: string; title: string }[] = []
  for (const row of structure) {
    if (isStructureRowEmptyLabel(row)) continue
    if (isStructureRowDetailOnly(row)) continue
    if (!isCodeMappingEnabled(row)) continue
    const a = normalizeAnnexLetter(String(row.annexLetter ?? ""))
    if (!a) continue
    if (seen.has(a)) continue
    seen.add(a)
    const raw = String(row.label ?? "").trim()
    out.push({ letter: a, title: raw || `Annexe ${a}` })
  }
  out.sort((x, y) => compareAnnexLetters(x.letter, y.letter))
  return out
}

/** Modes de la colonne Liaison (Sommaire / structure). */
export type LiaisonMode = "na" | "single" | "sum" | "difference"

export function normalizeCodeList(val: unknown): string[] {
  if (val == null) return []
  if (Array.isArray(val)) {
    const out: string[] = []
    for (const x of val) {
      const s = String(x ?? "").trim()
      if (s) out.push(s)
    }
    return out
  }
  const s = String(val).trim()
  return s ? [s] : []
}

export function normalizeLiaisonMode(row: Record<string, unknown>): LiaisonMode {
  const raw = row.liaisonMode
  if (typeof raw === "string" && raw.trim()) {
    const m = raw.trim().toLowerCase()
    if (m === "na" || m === "n/a" || m === "none") return "na"
    if (m === "single" || m === "unique" || m === "code") return "single"
    if (m === "sum" || m === "addition" || m === "add") return "sum"
    if (m === "difference" || m === "subtraction" || m === "subtract") return "difference"
  }
  if (String(row.linkCode ?? "").trim()) return "single"
  if (normalizeCodeList(row.liaisonSumCodes).length) return "sum"
  const n = normalizeCodeList(row.liaisonNumeratorCodes)
  const d = normalizeCodeList(row.liaisonDenominatorCodes)
  if (n.length || d.length) return "difference"
  return "na"
}

/** Tous les codes de liaison utilisés dans la structure (pour listes à cocher). */
export function collectDistinctLinkCodesFromStructure(
  structure: Record<string, unknown>[]
): string[] {
  const seen = new Set<string>()
  for (const row of structure) {
    if (isStructureRowEmptyLabel(row)) continue
    const add = (s: string) => {
      const t = s.trim()
      if (t) seen.add(t)
    }
    add(String(row.linkCode ?? ""))
    for (const c of normalizeCodeList(row.liaisonSumCodes)) add(c)
    for (const c of normalizeCodeList(row.liaisonNumeratorCodes)) add(c)
    for (const c of normalizeCodeList(row.liaisonDenominatorCodes)) add(c)
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b, "fr", { numeric: true }))
}

/**
 * Champ « Lettre » : saisie uniquement si la case Annexe est activée (`showInDetail === true`),
 * et interdite pour les liaisons en addition ou soustraction. Les sous-lignes détail (`detailOnly`)
 * restent éditables pour la lettre (hors lecture seule parent).
 */
export function isAnnexLetterInputEditable(row: Record<string, unknown>): boolean {
  if (isStructureRowEmptyLabel(row)) return false
  if (isStructureRowHidden(row)) return false
  if (!isCodeMappingEnabled(row)) return false
  const m = normalizeLiaisonMode(row)
  if (m === "sum" || m === "difference") return false
  if (isStructureRowDetailOnly(row)) return true
  return row.showInDetail === true
}

export function formatLiaisonCellHint(row: Record<string, unknown>): string {
  const mode = normalizeLiaisonMode(row)
  if (mode === "na") return "n/a"
  if (mode === "single") {
    const c = String(row.linkCode ?? "").trim()
    return c || "…"
  }
  if (mode === "sum") {
    const n = normalizeCodeList(row.liaisonSumCodes).length
    return n ? `Σ ${n} code${n > 1 ? "s" : ""}` : "Σ …"
  }
  const nn = normalizeCodeList(row.liaisonNumeratorCodes).length
  const nd = normalizeCodeList(row.liaisonDenominatorCodes).length
  if (nn || nd) return `N${nn} − D${nd}`
  return "N − D …"
}

/** Ligne affichée dans la grille Paramètres du Détail (titres d’annexe + sous-lignes detailOnly). */
export function isStructureRowInDetailAnnexEditor(row: Record<string, unknown>): boolean {
  if (isStructureRowEmptyLabel(row)) return false
  if (isStructureRowDetailOnly(row)) return true
  return (
    isShowInDetail(row) &&
    isCodeMappingEnabled(row) &&
    normalizeAnnexLetter(String(row.annexLetter ?? "")) !== ""
  )
}

/**
 * Annexe activée au Sommaire (case « Annexe » cochée + lettre) : le libellé du titre et la ligne
 * ne se modifient pas depuis les Paramètres du Détail (uniquement au Sommaire). Les sous-lignes
 * `detailOnly` ajoutées au Détail restent modifiables.
 */
export function isSummaryAnnexRowLockedInDetailEdit(row: Record<string, unknown>): boolean {
  if (isStructureRowDetailOnly(row)) return false
  if (isStructureRowEmptyLabel(row)) return false
  if (row.showInDetail !== true) return false
  return normalizeAnnexLetter(String(row.annexLetter ?? "")) !== ""
}

/** Retire les libellés obsolètes (ex. Produits A) — aligné sur le backend. */
export function stripObsoleteIncomeStatementStructureRows(
  structure: Record<string, unknown>[]
): Record<string, unknown>[] {
  const rows = cloneStructure(structure)

  const isObsoleteLabel = (label: string): boolean => {
    const n = normLabel(label)
    if (n === "produits a" || n === "produit a") return true
    if (n.startsWith("produit") && n.endsWith(" a") && n.length <= 12) return true
    return false
  }

  const stripBlock = (block: Record<string, unknown>[]): Record<string, unknown>[] => {
    const res: Record<string, unknown>[] = []
    for (const row of block) {
      if (isObsoleteLabel(String(row.label ?? ""))) continue
      const next: Record<string, unknown> = { ...row }
      for (const key of ["children", "detailRows"] as const) {
        const ch = next[key] as Record<string, unknown>[] | undefined
        if (Array.isArray(ch) && ch.length) next[key] = stripBlock(ch)
      }
      res.push(next)
    }
    return res
  }

  return stripBlock(rows)
}

export function isOmittedIncomeStatementSummaryRowLabel(label: string): boolean {
  return isObsoleteLabelSummary(normLabel(label))
}

function isObsoleteLabelSummary(n: string): boolean {
  if (n === "produits a" || n === "produit a") return true
  if (n.startsWith("produit") && n.endsWith(" a")) return true
  return false
}

/**
 * Associe chaque code de liaison utilisé dans la vue Détail du compte de résultat
 * au libellé du poste. Par défaut, préfixe « Annexe X — » si applicable ; désactiver avec
 * `{ includeAnnexPrefix: false }` pour n’afficher que le libellé de ligne brut.
 */
export function mapLinkCodesToDetailLabels(
  structure: Record<string, unknown>[],
  options?: { includeAnnexPrefix?: boolean }
): Map<string, string> {
  const includeAnnexPrefix = options?.includeAnnexPrefix !== false
  const map = new Map<string, string>()
  for (const row of structure) {
    if (isStructureRowEmptyLabel(row)) continue
    if (!isShowInDetail(row)) continue
    const rawLabel = String(row.label ?? "").trim()
    if (!rawLabel) continue
    const label = includeAnnexPrefix
      ? formatDetailLabelWithAnnex(rawLabel, String(row.annexLetter ?? ""))
      : rawLabel

    const mode = normalizeLiaisonMode(row)
    const add = (code: string) => {
      const t = code.trim()
      if (!t) return
      if (!map.has(t)) map.set(t, label)
    }

    if (mode === "single") {
      add(String(row.linkCode ?? ""))
    } else if (mode === "sum") {
      for (const c of normalizeCodeList(row.liaisonSumCodes)) add(c)
    } else if (mode === "difference") {
      for (const c of normalizeCodeList(row.liaisonNumeratorCodes)) add(c)
      for (const c of normalizeCodeList(row.liaisonDenominatorCodes)) add(c)
    }
  }
  return map
}

/**
 * Pour chaque lettre d’annexe, libellé de la ligne **Sommaire** (non `detailOnly`) qui porte cette lettre
 * (ex. A → « Revenus »).
 */
export function mapAnnexLetterToSummaryLabel(
  structure: Record<string, unknown>[]
): Map<string, string> {
  const map = new Map<string, string>()
  for (const row of structure) {
    if (isStructureRowEmptyLabel(row)) continue
    if (isStructureRowDetailOnly(row)) continue
    const a = normalizeAnnexLetter(String(row.annexLetter ?? ""))
    if (!a) continue
    const raw = String(row.label ?? "").trim()
    if (!raw) continue
    if (!map.has(a)) map.set(a, raw)
  }
  return map
}

function summaryLabelForLinkedRow(
  row: Record<string, unknown>,
  annexToSummary: Map<string, string>
): string {
  const letter = normalizeAnnexLetter(String(row.annexLetter ?? ""))
  if (letter) {
    const s = annexToSummary.get(letter)
    if (s) return s
  }
  if (!isStructureRowDetailOnly(row)) {
    const raw = String(row.label ?? "").trim()
    if (raw) return raw
  }
  return "—"
}

/**
 * Libellé affiché au **Sommaire** pour chaque code de liaison (même périmètre que `mapLinkCodesToDetailLabels`).
 * Avec annexe : libellé du poste sommaire pour cette lettre. Sans annexe : libellé de la ligne elle-même si elle est au sommaire.
 */
export function mapLinkCodesToSummaryLabels(
  structure: Record<string, unknown>[]
): Map<string, string> {
  const annexToSummary = mapAnnexLetterToSummaryLabel(structure)
  const map = new Map<string, string>()

  const addCode = (code: string, row: Record<string, unknown>) => {
    const t = code.trim()
    if (!t || map.has(t)) return
    map.set(t, summaryLabelForLinkedRow(row, annexToSummary))
  }

  for (const row of structure) {
    if (isStructureRowEmptyLabel(row)) continue
    if (!isShowInDetail(row)) continue

    const mode = normalizeLiaisonMode(row)
    if (mode === "single") {
      addCode(String(row.linkCode ?? ""), row)
    } else if (mode === "sum") {
      for (const c of normalizeCodeList(row.liaisonSumCodes)) addCode(c, row)
    } else if (mode === "difference") {
      for (const c of normalizeCodeList(row.liaisonNumeratorCodes)) addCode(c, row)
      for (const c of normalizeCodeList(row.liaisonDenominatorCodes)) addCode(c, row)
    }
  }
  return map
}

/** Code de liaison « Groupe » au sommaire : uniquement des chiffres (ex. 20, 32). */
function isGroupOnlyLinkCode(linkCode: string): boolean {
  return /^\d+$/.test(linkCode.trim())
}

/**
 * Préfixe numérique initial d’un code de liaison (ex. 20.1 → 20, 32A.1 → 32).
 */
export function extractGroupePrefixFromCompositeLinkCode(linkCode: string): string | undefined {
  const t = linkCode.trim()
  if (!t) return undefined
  const m = t.match(/^(\d+)/)
  return m ? m[1] : undefined
}

/**
 * Pour chaque lettre d’annexe, code de liaison du **Groupe** (ligne sommaire dont le code est
 * uniquement numérique) actif au moment où l’annexe apparaît dans la structure.
 */
export function mapAnnexLetterToGroupeLinkCode(
  structure: Record<string, unknown>[]
): Map<string, string> {
  let currentGroupe: string | undefined
  const annexToGroupe = new Map<string, string>()

  for (const row of structure) {
    if (isStructureRowEmptyLabel(row)) continue
    if (isStructureRowHidden(row)) continue

    if (!isStructureRowDetailOnly(row)) {
      const mode = normalizeLiaisonMode(row)
      if (mode === "single") {
        const lc = String(row.linkCode ?? "").trim()
        if (isGroupOnlyLinkCode(lc)) currentGroupe = lc
      }
      const letter = normalizeAnnexLetter(String(row.annexLetter ?? ""))
      if (letter && currentGroupe && !annexToGroupe.has(letter)) {
        annexToGroupe.set(letter, currentGroupe)
      }
    } else {
      const letter = normalizeAnnexLetter(String(row.annexLetter ?? ""))
      if (letter && currentGroupe && !annexToGroupe.has(letter)) {
        annexToGroupe.set(letter, currentGroupe)
      }
    }
  }

  return annexToGroupe
}

function groupeForStructureRowAndCode(
  row: Record<string, unknown>,
  code: string,
  annexToGroupe: Map<string, string>
): string | undefined {
  const letter = normalizeAnnexLetter(String(row.annexLetter ?? ""))
  if (letter) {
    const g = annexToGroupe.get(letter)
    if (g) return g
  }
  const mode = normalizeLiaisonMode(row)
  if (mode === "single") {
    const lc = String(row.linkCode ?? "").trim()
    if (isGroupOnlyLinkCode(lc)) return lc
    return extractGroupePrefixFromCompositeLinkCode(lc)
  }
  return extractGroupePrefixFromCompositeLinkCode(code)
}

/**
 * Pour chaque code de liaison du périmètre Détail (même clés que `mapLinkCodesToDetailLabels`),
 * le code de liaison du **Groupe** (ex. 20 pour 20.1 rattaché à l’annexe A du groupe 20).
 */
export function mapLinkCodesToGroupeLinkCodes(
  structure: Record<string, unknown>[]
): Map<string, string> {
  const annexToGroupe = mapAnnexLetterToGroupeLinkCode(structure)
  const map = new Map<string, string>()

  const addCode = (code: string, row: Record<string, unknown>) => {
    const t = code.trim()
    if (!t || map.has(t)) return
    const g = groupeForStructureRowAndCode(row, t, annexToGroupe)
    if (g) map.set(t, g)
  }

  for (const row of structure) {
    if (isStructureRowEmptyLabel(row)) continue
    if (!isShowInDetail(row)) continue

    const mode = normalizeLiaisonMode(row)
    if (mode === "single") {
      addCode(String(row.linkCode ?? ""), row)
    } else if (mode === "sum") {
      for (const c of normalizeCodeList(row.liaisonSumCodes)) addCode(c, row)
    } else if (mode === "difference") {
      for (const c of normalizeCodeList(row.liaisonNumeratorCodes)) addCode(c, row)
      for (const c of normalizeCodeList(row.liaisonDenominatorCodes)) addCode(c, row)
    }
  }
  return map
}

/**
 * Affichage du Groupe pour le mapping comptable : priorité à la structure, sinon préfixe numérique du code.
 */
export function groupeDisplayForAccountLinkCode(
  linkCode: string | undefined,
  groupeByLinkCode: Map<string, string>
): string {
  const lc = linkCode?.trim()
  if (!lc) return "—"
  const fromStructure = groupeByLinkCode.get(lc)
  if (fromStructure) return fromStructure
  const fallback = extractGroupePrefixFromCompositeLinkCode(lc)
  return fallback ?? "—"
}
