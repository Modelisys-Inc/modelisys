/** Structure du compte de résultats (API) — lignes flexibles */

import type { StandardLinkCode } from "@/lib/api"
import {
  incomeStatementFamilyForSectionLabel,
  incomeStatementFamilyHasMappedAccounts,
  incomeStatementLinkCodeHasMappedAccounts,
  standardParentCodeForSectionLabel,
} from "@/lib/income-statement-mapping-rollup"
import {
  CAPEX_PROJECTION_LINK_CODE_ROOTS,
  capexProjectionParentRoot,
  compareCapexProjectionLinkCodes,
  detailSubLineLiaisonFromStandardTarget,
  getDetailSubLineCodesFromStandardLinkCode,
  isCapexProjectionLinkCode,
  isComputedNetIncomeLinkCode,
  standardLinkCodeDisplayLabel,
} from "@/lib/standard-link-code-utils"

export const CHARGES_SECTION_LABEL = "charges d'exploitation"
export const TOTAL_CHARGES_LABEL = "total des charges"

/** Provenance pour les codes issus de la structure compte de résultat (Income statement). */
export const LINK_CODE_PROVENANCE_RESULTATS = "Résultats"

/** Provenance pour les codes issus de la structure bilan (Balance sheet). */
export const LINK_CODE_PROVENANCE_BILAN = "Bilan"

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

/** Schéma d'identifiant d'annexe : lettres (Résultats) ou nombres (Bilan). */
export type AnnexScheme = "letter" | "number"

/** Décode une suite de lettres en entier bijectif base-26 (A=1 … Z=26, AA=27 …). 0 si invalide. */
function annexLettersToNumber(s: string): number {
  if (!/^[A-Z]+$/.test(s)) return 0
  let n = 0
  for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n
}

/** Encode un entier ≥ 1 en lettres bijectives base-26 (1→A, 26→Z, 27→AA …). */
function numberToAnnexLetters(n: number): string {
  let out = ""
  let x = n
  while (x > 0) {
    const rem = (x - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    x = Math.floor((x - 1) / 26)
  }
  return out
}

/**
 * Prochain identifiant d'annexe « après le plus élevé » utilisé dans la structure,
 * selon le schéma du type d'état :
 * - `number` : max des valeurs purement numériques + 1 (« 1 » si aucune).
 * - `letter` : max des valeurs alphabétiques (base-26 bijective) + 1 (« A » si aucune).
 * Les valeurs ne correspondant pas au schéma sont ignorées pour le calcul du max.
 */
export function nextAnnexIdentifier(
  structure: Record<string, unknown>[],
  scheme: AnnexScheme
): string {
  let max = 0
  for (const row of structure) {
    const v = normalizeAnnexLetter(String(row.annexLetter ?? ""))
    if (!v) continue
    if (scheme === "number") {
      if (/^\d+$/.test(v)) max = Math.max(max, parseInt(v, 10))
    } else {
      max = Math.max(max, annexLettersToNumber(v))
    }
  }
  const next = max + 1
  return scheme === "number" ? String(next) : numberToAnnexLetters(next)
}

/**
 * Réattribue les identifiants d'annexe selon **l'ordre d'apparition dans le
 * rapport** (ordre du tableau structure), et non l'ordre où les cases ont été
 * cochées. Première annexe → `A` / `1`, deuxième → `B` / `2`, etc.
 *
 * Détection d'un bloc d'annexe — une ligne sommaire (non `detailOnly`) dont
 * l'annexe est activée (`isShowInDetail`), **quel que soit son `annexLetter`
 * actuel** (qui peut être vide juste après l'activation de la case). Le bloc se
 * prolonge sur les sous-lignes `detailOnly` contiguës qui suivent ; toutes les
 * lignes du bloc reçoivent le même nouvel identifiant. Deux lignes sommaire non
 * contiguës partageant aujourd'hui un identifiant deviennent **deux** annexes
 * distinctes (un bloc contigu = une annexe). Ne mute pas l'entrée.
 */
export function renumberAnnexesByAppearance(
  structure: Record<string, unknown>[],
  scheme: AnnexScheme
): Record<string, unknown>[] {
  const next = cloneStructure(structure)
  let counter = 0
  let currentId: string | undefined

  const idForCounter = (n: number): string =>
    scheme === "number" ? String(n) : numberToAnnexLetters(n)

  for (const row of next) {
    if (isStructureRowEmptyLabel(row) || isStructureRowHidden(row)) {
      // Espacement / ligne masquée : rompt la contiguïté du bloc en cours.
      currentId = undefined
      continue
    }
    if (isStructureRowDetailOnly(row)) {
      // Sous-ligne détail : hérite de l'annexe du bloc en cours (si contiguë).
      // Orpheline (aucun bloc parent contigu, ex. données héritées d'un ancien
      // décochage sans nettoyage) : on efface la lettre périmée pour éviter qu'elle
      // ne se rattache par erreur à une annexe renumérotée différente.
      row.annexLetter = currentId ?? undefined
      continue
    }
    // Ligne sommaire : démarre un nouveau bloc si la case « Annexe » est cochée.
    // Critère strict `showInDetail === true` (et non le repli `isShowInDetail`) :
    // on n'attribue pas d'identifiant aux lignes anciennes qui ne sont visibles au
    // détail que par héritage d'un code de liaison sans case cochée.
    // Gardé aussi par `isCodeMappingEnabled` : une ligne `showInDetail:true` mais
    // sans mapping (ex. `defineMapping:false` issu de données importées) n'apparaît
    // ni dans le Détail ni dans les sélecteurs de sous-lignes ; lui attribuer un
    // identifiant créerait un « trou » de numérotation visible. Dans l'UI la case
    // « Annexe » est désactivée tant que `isCodeMappingEnabled` est faux, donc ce
    // garde n'exclut aucune annexe légitime cochée à la main.
    if (row.showInDetail === true && isCodeMappingEnabled(row)) {
      counter += 1
      currentId = idForCounter(counter)
      row.annexLetter = currentId
    } else {
      currentId = undefined
    }
  }

  return next
}

export function cloneStructure(s: Record<string, unknown>[]): Record<string, unknown>[] {
  return JSON.parse(JSON.stringify(s)) as Record<string, unknown>[]
}

/** Nature du poste au sommaire (Paramètres) — revenus vs dépenses. */
export type IncomeStatementPosteNature = "revenus" | "depenses"

export function normalizePosteNature(raw: unknown): IncomeStatementPosteNature | undefined {
  if (raw === "revenus" || raw === "depenses") return raw
  if (raw === "revenue" || raw === "expense") return raw === "revenue" ? "revenus" : "depenses"
  return undefined
}

/**
 * Le choix Revenus / Dépenses n’est possible que lorsque l’annexe est activée (case « Annexe » cochée).
 */
export function isPosteNatureChoiceApplicable(row: Record<string, unknown>): boolean {
  if (isStructureRowEmptyLabel(row) || isStructureRowHidden(row)) return false
  if (!isCodeMappingEnabled(row)) return false
  return row.showInDetail === true
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
    // Pas d'annexe par défaut : la ligne n'apparaît au Détail qu'après activation
    // explicite de la case « Annexe » (aligné sur newBalanceSheetPostRow).
    showInDetail: false,
    linkCode: "",
    annexLetter: "",
    id,
  }
}

/** Nouvelle ligne de structure pour le bilan (même champs optionnels que les charges pour liaison / annexe). */
export function newBalanceSheetPostRow(options?: { indent?: boolean; isBold?: boolean }): Record<string, unknown> {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? `bs-line-${crypto.randomUUID()}`
      : `bs-line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  return {
    label: "Nouveau poste",
    indent: options?.indent ?? true,
    isBold: options?.isBold ?? false,
    hidden: false,
    separatorAbove: false,
    defineMapping: false,
    showInDetail: false,
    linkCode: "",
    annexLetter: "",
    id,
  }
}

/** Ligne structure sans libellé (espacement) — pas de case « Annexe » */
export function isStructureRowEmptyLabel(row: Record<string, unknown>): boolean {
  return String(row.label ?? "").trim() === ""
}

/** Trait de séparation au-dessus d’un poste (structure ou API). */
export function isTruthySeparatorAbove(raw: unknown): boolean {
  return raw === true || raw === "true" || raw === 1
}

/** Indentation sommaire : valeur explicite (structure / API) sinon règle legacy. */
export function indentForSummaryRow(
  row: Pick<{ isBold?: boolean; isSection?: boolean; isResult?: boolean }, "isBold" | "isSection" | "isResult"> & {
    indent?: boolean
  }
): boolean {
  if (typeof row.indent === "boolean") return row.indent
  return !row.isBold && !row.isSection && !row.isResult
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

/** Champs à désactiver lors du masquage automatique (conserve le code de liaison pour réaffichage). */
export function autoHideIncomeStatementSummaryRowPatch(): Record<string, unknown> {
  return {
    hidden: true,
    defineMapping: false,
    showInDetail: false,
  }
}

/** Champs pour réafficher une ligne masquée automatiquement lorsque des comptes sont mappés. */
export function autoUnhideIncomeStatementSummaryRowPatch(): Record<string, unknown> {
  return { hidden: false }
}

/** Première ligne sommaire (non `detailOnly`) portant cette lettre d’annexe. */
export function findSummaryAnnexOwnerRow(
  structure: Record<string, unknown>[],
  letter: string,
): Record<string, unknown> | undefined {
  const L = normalizeAnnexLetter(letter)
  if (!L) return undefined
  for (const row of structure) {
    if (isStructureRowDetailOnly(row)) continue
    if (isStructureRowEmptyLabel(row)) continue
    if (normalizeAnnexLetter(String(row.annexLetter ?? "")) !== L) continue
    return row
  }
  return undefined
}

/** Ligne sommaire visible au Détail (hors sous-lignes `detailOnly`). */
export function isSummaryRowVisibleInDetail(row: Record<string, unknown>): boolean {
  if (isStructureRowEmptyLabel(row)) return false
  if (isStructureRowHidden(row)) return false
  if (isStructureRowDetailOnly(row)) return false
  if (row.showInDetail === false) return false
  if (row.showInDetail === true) return true
  return isCodeMappingEnabled(row)
}

function applyAutoHideIncomeStatementDetailOnlyRows(
  structure: Record<string, unknown>[],
  mappedIndex: Map<string, Set<string>>,
): { rows: Record<string, unknown>[]; changed: boolean } {
  let changed = false
  const rows = structure.map((row) => {
    if (!isStructureRowDetailOnly(row)) return row

    const letter = normalizeAnnexLetter(String(row.annexLetter ?? ""))
    const owner = letter ? findSummaryAnnexOwnerRow(structure, letter) : undefined

    if (owner && isStructureRowHidden(owner)) {
      if (!isStructureRowHidden(row)) {
        changed = true
        return { ...row, ...autoHideIncomeStatementSummaryRowPatch() }
      }
      return row
    }

    const linkCode = String(row.linkCode ?? "").trim()
    if (linkCode) {
      const hasAccounts = incomeStatementLinkCodeHasMappedAccounts(linkCode, mappedIndex)
      if (!hasAccounts && !isStructureRowHidden(row)) {
        changed = true
        return { ...row, ...autoHideIncomeStatementSummaryRowPatch() }
      }
      if (
        hasAccounts &&
        isStructureRowHidden(row) &&
        (!owner || !isStructureRowHidden(owner))
      ) {
        changed = true
        return { ...row, ...autoUnhideIncomeStatementSummaryRowPatch() }
      }
    } else if (
      owner &&
      !isStructureRowHidden(owner) &&
      isStructureRowHidden(row)
    ) {
      changed = true
      return { ...row, ...autoUnhideIncomeStatementSummaryRowPatch() }
    }

    return row
  })
  return { rows, changed }
}

/**
 * Masque (case « Masquer ») les postes sommaire sans compte GL mappé pour leur code / famille.
 * Conserve `linkCode` pour permettre le réaffichage quand le mapping est ajouté.
 */
export function applyAutoHideEmptyIncomeStatementSummaryRows(
  structure: Record<string, unknown>[],
  mappedIndex: Map<string, Set<string>>,
  standardCodes: StandardLinkCode[],
): Record<string, unknown>[] {
  let changed = false
  const next = structure.map((row) => {
    if (isStructureRowDetailOnly(row)) return row
    if (isStructureRowEmptyLabel(row)) return row
    if (row.isResult === true || row.formula) return row

    const linkCode = String(row.linkCode ?? "").trim()
    if (linkCode) {
      const hasAccounts = incomeStatementLinkCodeHasMappedAccounts(linkCode, mappedIndex)
      if (!hasAccounts && !isStructureRowHidden(row)) {
        changed = true
        return { ...row, ...autoHideIncomeStatementSummaryRowPatch() }
      }
      if (hasAccounts && isStructureRowHidden(row)) {
        changed = true
        return { ...row, ...autoUnhideIncomeStatementSummaryRowPatch() }
      }
      return row
    }

    if (row.isSection === true) {
      const family = incomeStatementFamilyForSectionLabel(String(row.label ?? ""))
      if (family) {
        const hasAccounts = incomeStatementFamilyHasMappedAccounts(family, mappedIndex)
        if (!hasAccounts && !isStructureRowHidden(row)) {
          changed = true
          return { ...row, ...autoHideIncomeStatementSummaryRowPatch() }
        }
        if (hasAccounts && isStructureRowHidden(row)) {
          changed = true
          return { ...row, ...autoUnhideIncomeStatementSummaryRowPatch() }
        }
        return row
      }

      const parentCode = standardParentCodeForSectionLabel(String(row.label ?? ""), standardCodes)
      if (parentCode) {
        const hasAccounts = incomeStatementLinkCodeHasMappedAccounts(parentCode, mappedIndex)
        if (!hasAccounts && !isStructureRowHidden(row)) {
          changed = true
          return { ...row, ...autoHideIncomeStatementSummaryRowPatch() }
        }
        if (hasAccounts && isStructureRowHidden(row)) {
          changed = true
          return { ...row, ...autoUnhideIncomeStatementSummaryRowPatch() }
        }
      }
    }

    return row
  })

  const afterSummary = changed ? next : structure
  const detailPass = applyAutoHideIncomeStatementDetailOnlyRows(afterSummary, mappedIndex)
  if (detailPass.changed) changed = true

  return changed ? detailPass.rows : structure
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
 * Les sous-lignes `detailOnly` suivent la visibilité du poste sommaire de la même annexe.
 */
export function isShowInDetail(
  row: Record<string, unknown>,
  structure?: Record<string, unknown>[],
): boolean {
  if (isStructureRowEmptyLabel(row)) return false
  if (isStructureRowHidden(row)) return false
  if (isStructureRowDetailOnly(row)) {
    if (!structure) return true
    const letter = normalizeAnnexLetter(String(row.annexLetter ?? ""))
    if (!letter) return true
    const owner = findSummaryAnnexOwnerRow(structure, letter)
    if (!owner) return false
    return isShowInDetail(owner, structure)
  }
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

function statementApiRowMatchesStructureRow(
  row: { id?: string; label?: string; linkCode?: string },
  structureRow: Record<string, unknown>,
): boolean {
  const linkCode = String(structureRow.linkCode ?? "").trim()
  const structId = String(structureRow.id ?? "").trim()
  const idNorm = String(row.id ?? "").trim()
  const rowLink = String(row.linkCode ?? "").trim()
  if (linkCode && (idNorm === linkCode || rowLink === linkCode)) return true
  if (structId && idNorm === structId) return true
  const lbl = normLabel(String(structureRow.label ?? ""))
  return !!lbl && normLabel(String(row.label ?? "")) === lbl
}

/** Associe une entrée de structure (Paramètres) à une ligne renvoyée par l’API états / séries. */
export function findStatementApiRowForStructureRow<
  T extends { id?: string; label?: string; linkCode?: string; detailRows?: T[] },
>(
  structureRow: Record<string, unknown>,
  apiRows: T[],
  usedIndices: Set<number> = new Set(),
  usedNestedIds: Set<string> = new Set(),
): T | undefined {
  for (let i = 0; i < apiRows.length; i++) {
    if (usedIndices.has(i)) continue
    const row = apiRows[i]
    if (statementApiRowMatchesStructureRow(row, structureRow)) {
      usedIndices.add(i)
      return row
    }
  }

  for (let i = 0; i < apiRows.length; i++) {
    const parent = apiRows[i]
    const children = parent.detailRows
    if (!children?.length) continue
    for (const child of children) {
      const childId = String(child.id ?? "").trim()
      if (childId && usedNestedIds.has(childId)) continue
      if (!statementApiRowMatchesStructureRow(child, structureRow)) continue
      if (childId) usedNestedIds.add(childId)
      return child
    }
  }

  return undefined
}

/** Lignes de structure à afficher au Sommaire (ou présentation détail sans annexes). */
export function listStructureRowsForSummaryDisplay(
  structure: Record<string, unknown>[],
): Record<string, unknown>[] {
  return structure.filter(
    (sr) =>
      !isStructureRowEmptyLabel(sr) &&
      !isStructureRowHidden(sr) &&
      !isStructureRowDetailOnly(sr) &&
      !isComputedNetIncomeStructureRow(sr),
  )
}

/**
 * Lignes structure hors Paramètres : ordre conservé, espaces vides inclus,
 * lignes masquées et `detailOnly` exclues.
 * CAP-C.1 (bénéfice net calculé) n’apparaît pas en ligne plate — seulement
 * comme enfant d’expansion sous CAP-C.
 */
export function listStructureRowsForPresentationDisplay(
  structure: Record<string, unknown>[],
): Record<string, unknown>[] {
  return structure.filter(
    (sr) =>
      !isStructureRowHidden(sr) &&
      !isStructureRowDetailOnly(sr) &&
      !isComputedNetIncomeStructureRow(sr),
  )
}

/** Ligne Bénéfice net calculé (CAP-C.1) — calculée, affichée sous CAP-C à l’expansion. */
export function isComputedNetIncomeStructureRow(row: Record<string, unknown>): boolean {
  if (row.isComputedNetIncome === true) return true
  return isComputedNetIncomeLinkCode(String(row.linkCode ?? row.id ?? ""))
}

/** Lignes de structure à afficher au Détail (ordre Paramètres conservé). */
export function listStructureRowsForDetailDisplay(
  structure: Record<string, unknown>[],
): Record<string, unknown>[] {
  return structure.filter(
    (sr) =>
      !isStructureRowEmptyLabel(sr) &&
      !isStructureRowHidden(sr) &&
      isShowInDetail(sr) &&
      isCodeMappingEnabled(sr) &&
      !isComputedNetIncomeStructureRow(sr),
  )
}

/** Ligne structure Bilan éligible au Détail Capex (ALT-B, ALT-C, ALT-D). */
export function structureRowBelongsToCapexDetail(row: Record<string, unknown>): boolean {
  if (isStructureRowEmptyLabel(row) || isStructureRowHidden(row)) return false
  if (!isShowInDetail(row) || !isCodeMappingEnabled(row)) return false
  return collectLinkCodesFromStructureRow(row).some(isCapexProjectionLinkCode)
}

/** Lignes structure Bilan pour « Estimation des Capex annuels » (même périmètre que Bilan Détail, filtré). */
export function listStructureRowsForCapexDetailDisplay(
  structure: Record<string, unknown>[],
): Record<string, unknown>[] {
  return listStructureRowsForDetailDisplay(structure).filter(structureRowBelongsToCapexDetail)
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

export function newDetailSubLineRow(
  annexLetter: string,
  opts?: {
    label?: string
    linkCode?: string
    dtCt?: unknown
  }
): Record<string, unknown> {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? `detail-${crypto.randomUUID()}`
      : `detail-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const letter = normalizeAnnexLetter(annexLetter)
  const label = String(opts?.label ?? "Nouvelle ligne").trim() || "Nouvelle ligne"
  const linkCode = String(opts?.linkCode ?? "").trim()
  const dt = normalizeDtCt(opts?.dtCt)
  return {
    id,
    label,
    detailOnly: true,
    hidden: false,
    defineMapping: true,
    showInDetail: true,
    linkCode,
    annexLetter: letter,
    indent: true,
    ...(dt ? { dtCt: dt } : {}),
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
  return out
}

/** Code parent (Sommaire) rattaché à une annexe via la première ligne non `detailOnly`. */
export function getSummaryAnnexParentLinkCode(
  structure: Record<string, unknown>[],
  letter: string,
): string {
  const target = normalizeAnnexLetter(letter)
  for (const row of structure) {
    if (isStructureRowDetailOnly(row)) continue
    if (isStructureRowEmptyLabel(row)) continue
    if (!isShowInDetail(row)) continue
    if (normalizeAnnexLetter(String(row.annexLetter ?? "")) !== target) continue
    return String(row.linkCode ?? "").trim()
  }
  return ""
}

/**
 * Aligne les sous-lignes Détail (`detailOnly`) sur le plan standard
 * sous le code parent de chaque annexe (Sommaire) — Compte de résultat ou Bilan.
 * REV : codes parents (REV-A, …) ; autres familles : feuilles (CMV.1, …).
 */
export function syncIncomeStatementDetailSubLinesFromStandard(
  structure: Record<string, unknown>[],
  standardCodes: StandardLinkCode[],
): Record<string, unknown>[] {
  if (standardCodes.length === 0) return structure

  let next = cloneStructure(structure)
  const letters = listAnnexLettersForDetailSubLines(next)

  for (const letter of letters) {
    const parentCode = getSummaryAnnexParentLinkCode(next, letter)
    if (!parentCode) continue

    const expectedTargets = getDetailSubLineCodesFromStandardLinkCode(parentCode, standardCodes)
    const expectedCodes = new Set(expectedTargets.map((c) => c.code))

    const existingByCode = new Map<string, Record<string, unknown>>()
    for (const row of next) {
      if (!isStructureRowDetailOnly(row)) continue
      if (normalizeAnnexLetter(String(row.annexLetter ?? "")) !== letter) continue
      const code = String(row.linkCode ?? "").trim()
      if (code && expectedCodes.has(code)) existingByCode.set(code, row)
    }

    next = next.filter(
      (row) =>
        !(
          isStructureRowDetailOnly(row) &&
          normalizeAnnexLetter(String(row.annexLetter ?? "")) === letter
        ),
    )

    let endIdx = findStructureInsertIndexAfterAnnexContiguousBlock(next, letter)
    if (endIdx < 0) continue
    while (
      endIdx + 1 < next.length &&
      normalizeAnnexLetter(String(next[endIdx + 1]?.annexLetter ?? "")) === letter
    ) {
      endIdx++
    }

    const orderedRows: Record<string, unknown>[] = []
    for (const target of expectedTargets) {
      const label = standardLinkCodeDisplayLabel(target)
      const liaison = detailSubLineLiaisonFromStandardTarget(target, standardCodes)
      const existing = existingByCode.get(target.code)
      if (existing) {
        orderedRows.push({
          ...existing,
          label,
          ...liaison,
          defineMapping: true,
          showInDetail: true,
          detailOnly: true,
          annexLetter: letter,
          indent: true,
        })
      } else {
        orderedRows.push({
          ...newDetailSubLineRow(letter, {
            label,
            linkCode: liaison.linkCode,
          }),
          ...liaison,
        })
      }
    }

    next.splice(endIdx + 1, 0, ...orderedRows)
  }

  return next
}

/** Alias explicite pour le Bilan (même logique que le compte de résultat). */
export const syncDetailSubLinesFromStandard = syncIncomeStatementDetailSubLinesFromStandard

/** Modes de la colonne Liaison (Sommaire / structure). */
export type LiaisonMode = "na" | "single" | "sum" | "difference" | "product" | "quotient"

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
    if (m === "product" || m === "multiplication" || m === "multiply" || m === "×") return "product"
    if (m === "quotient" || m === "division" || m === "divide" || m === "÷") return "quotient"
  }
  if (String(row.linkCode ?? "").trim()) return "single"
  if (normalizeCodeList(row.liaisonSumCodes).length) return "sum"
  const n = normalizeCodeList(row.liaisonNumeratorCodes)
  const d = normalizeCodeList(row.liaisonDenominatorCodes)
  if (n.length || d.length) return "difference"
  return "na"
}

/** Facteur optionnel sur une division : (N ÷ D) × facteur (ex. 365 pour un délai en jours). */
export function normalizeLiaisonFactor(raw: unknown): number {
  if (raw == null || raw === "") return 1
  const n = typeof raw === "number" ? raw : Number(String(raw).trim().replace(",", "."))
  if (!Number.isFinite(n)) return 1
  return n
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

/** Postes calculés du Sommaire (BAIIA, bénéfice brut, …) — sélectionnables dans les graphiques. */
export function collectSummaryRowSourcesFromStructure(
  structure: Record<string, unknown>[]
): Array<{ id: string; label: string }> {
  const out: Array<{ id: string; label: string }> = []
  const seen = new Set<string>()
  for (const row of structure) {
    if (isStructureRowEmptyLabel(row)) continue
    const id = String(row.id ?? row.linkCode ?? row.label ?? "").trim()
    if (!id) continue
    const key = id.toLowerCase()
    if (seen.has(key)) continue
    const isSummaryRow =
      row.isEBITA === true || row.isResult === true || !!row.formula
    if (!isSummaryRow) continue
    seen.add(key)
    out.push({ id, label: String(row.label ?? id).trim() || id })
  }
  return out.sort((a, b) => a.label.localeCompare(b.label, "fr", { numeric: true }))
}

/**
 * Associe chaque code de liaison au libellé du poste qui le **définit** (ligne en
 * mode « Code unique » dont le `linkCode` vaut ce code). Permet d'afficher « 4100 —
 * Ventes nettes » dans les sélecteurs pour savoir à quoi on rattache un compte.
 * Premier libellé rencontré conservé. Les codes n'apparaissant que dans des listes
 * d'addition / soustraction (sans poste propriétaire) sont absents de la table.
 */
export function mapLinkCodesToOwnerLabel(
  structure: Record<string, unknown>[]
): Map<string, string> {
  const map = new Map<string, string>()
  for (const row of structure) {
    if (isStructureRowEmptyLabel(row)) continue
    if (normalizeLiaisonMode(row) !== "single") continue
    const code = String(row.linkCode ?? "").trim()
    if (!code || map.has(code)) continue
    const label = String(row.label ?? "").trim()
    if (label) map.set(code, label)
  }
  return map
}

function rowLabelForLinkCodePicker(
  row: Record<string, unknown>,
  annexToSummary: Map<string, string>,
): string {
  const raw = String(row.label ?? "").trim()
  if (raw) return raw
  const fallback = summaryLabelForLinkedRow(row, annexToSummary)
  return fallback === "—" ? "" : fallback
}

/**
 * Libellés pour les sélecteurs de codes (paramètres des graphiques) : postes de la
 * structure (y compris parents en mode somme, ex. REV-A) puis charte standard en repli.
 * Les libellés « propriétaire » (mode code unique) priment en dernier.
 */
export function buildLinkCodeLabelsForChartPicker(
  structure: Record<string, unknown>[],
  standardLabels?: Map<string, string>,
): Map<string, string> {
  const out = new Map<string, string>()
  const annexToSummary = mapAnnexLetterToSummaryLabel(structure)

  const setLabel = (code: string, label: string, force = false) => {
    const c = code.trim()
    const l = label.trim()
    if (!c || !l) return
    if (force || !out.has(c)) out.set(c, l)
  }

  if (standardLabels) {
    for (const [code, label] of standardLabels) setLabel(code, label)
  }

  for (const row of structure) {
    if (isStructureRowEmptyLabel(row)) continue
    const label = rowLabelForLinkCodePicker(row, annexToSummary)
    if (!label) continue
    const mode = normalizeLiaisonMode(row)
    const add = (code: string) => setLabel(code, label, true)

    if (mode === "single") {
      add(String(row.linkCode ?? ""))
    } else if (mode === "sum") {
      add(String(row.linkCode ?? ""))
      for (const c of normalizeCodeList(row.liaisonSumCodes)) add(c)
    } else if (mode === "difference") {
      add(String(row.linkCode ?? ""))
      for (const c of normalizeCodeList(row.liaisonNumeratorCodes)) add(c)
      for (const c of normalizeCodeList(row.liaisonDenominatorCodes)) add(c)
    }
  }

  for (const [code, label] of mapLinkCodesToOwnerLabel(structure)) {
    setLabel(code, label, true)
  }

  return out
}

/** Au moins un poste du sommaire est marqué « Revenus » (nature). */
export function structureHasRevenuePosteNatureRow(structure: Record<string, unknown>[]): boolean {
  for (const row of structure) {
    if (normalizePosteNature(row.posteNature) === "revenus") return true
  }
  return false
}

/**
 * Le premier poste sommaire (non detailOnly) portant cette lettre d’annexe a-t-il la nature « Revenus » ?
 * Les sous-lignes du Détail héritent du même bloc d’annexe que ce titre.
 */
export function structureAnnexIsRevenueNature(
  structure: Record<string, unknown>[],
  letter: string
): boolean {
  const L = normalizeAnnexLetter(letter)
  if (!L) return false
  for (const row of structure) {
    if (isStructureRowDetailOnly(row)) continue
    if (normalizeAnnexLetter(String(row.annexLetter ?? "")) !== L) continue
    return normalizePosteNature(row.posteNature) === "revenus"
  }
  return false
}

/**
 * Ligne série « Estimation des revenus annuels » : même périmètre que le Détail (annexe + codes actifs),
 * restreint aux postes / annexes dont la nature au sommaire est « Revenus ».
 */
export function seriesRowBelongsToRevenueAnnexDetail(
  sr: { id: string; label: string },
  structure: Record<string, unknown>[]
): boolean {
  const structRow = findStructureRowForStatementLine(sr.id, sr.label, structure)
  if (!structRow) return false
  if (!isCodeMappingEnabled(structRow) || !isShowInDetail(structRow, structure)) return false

  if (normalizePosteNature(structRow.posteNature) === "revenus") return true

  if (isStructureRowDetailOnly(structRow)) {
    return structureAnnexIsRevenueNature(structure, String(structRow.annexLetter ?? ""))
  }

  return false
}

/** Au moins un poste du sommaire est marqué « Dépenses » (nature). */
export function structureHasDepensesPosteNatureRow(structure: Record<string, unknown>[]): boolean {
  for (const row of structure) {
    if (normalizePosteNature(row.posteNature) === "depenses") return true
  }
  return false
}

/**
 * Le premier poste sommaire (non detailOnly) portant cette lettre d’annexe a-t-il la nature « Dépenses » ?
 * Les sous-lignes du Détail héritent du même bloc d’annexe que ce titre.
 */
export function structureAnnexIsDepensesNature(
  structure: Record<string, unknown>[],
  letter: string
): boolean {
  const L = normalizeAnnexLetter(letter)
  if (!L) return false
  for (const row of structure) {
    if (isStructureRowDetailOnly(row)) continue
    if (normalizeAnnexLetter(String(row.annexLetter ?? "")) !== L) continue
    return normalizePosteNature(row.posteNature) === "depenses"
  }
  return false
}

export function seriesRowUsesCapexProjectionLinkCode(
  sr: { id: string; label: string },
  structure: Record<string, unknown>[],
): boolean {
  if (isCapexProjectionLinkCode(sr.id)) return true
  const structRow = findStructureRowForStatementLine(sr.id, sr.label, structure)
  if (!structRow) return false
  return collectLinkCodesFromStructureRow(structRow).some(isCapexProjectionLinkCode)
}

/** Lignes série « Estimation des Capex annuels » : immobilisations ALT-B, location ALT-C, incorporels ALT-D. */
export function filterSeriesRowsForCapexProjection<
  T extends { id: string; label: string; isSection?: boolean },
>(rows: T[], structure: Record<string, unknown>[]): T[] {
  const filtered = rows.filter((sr) => {
    if (sr.label === "") return false
    if (sr.isSection && !isCapexProjectionLinkCode(sr.id)) return false
    if (structure.length === 0) return isCapexProjectionLinkCode(sr.id)
    return seriesRowUsesCapexProjectionLinkCode(sr, structure)
  })
  return filtered.sort((a, b) => compareCapexProjectionLinkCodes(a.id, b.id))
}

export interface CapexProjectionSeriesGroup<
  T extends { id: string; label: string },
> {
  parentCode: (typeof CAPEX_PROJECTION_LINK_CODE_ROOTS)[number]
  parentLabel: string
  parentRow: T | null
  childRows: T[]
}

/** Ligne de structure bilan éligible à « Estimation des Capex annuels ». */
function structureRowQualifiesForCapexProjection(row: Record<string, unknown>): boolean {
  if (isStructureRowEmptyLabel(row) || isStructureRowHidden(row)) return false
  if (!isShowInDetail(row) || !isCodeMappingEnabled(row)) return false
  return collectLinkCodesFromStructureRow(row).some(isCapexProjectionLinkCode)
}

function collectCapexStructureRowsByParent(
  structure: Record<string, unknown>[],
  parentCode: (typeof CAPEX_PROJECTION_LINK_CODE_ROOTS)[number],
): {
  parentStruct: Record<string, unknown> | null
  childStructs: Record<string, unknown>[]
} {
  const qualifying = structure.filter(structureRowQualifiesForCapexProjection)
  const parentStruct =
    qualifying.find((row) => String(row.linkCode ?? "").trim() === parentCode) ?? null
  const childStructs = qualifying
    .filter((row) => {
      const lc = String(row.linkCode ?? "").trim()
      return lc.startsWith(`${parentCode}.`) && lc !== parentCode
    })
    .sort((a, b) =>
      compareCapexProjectionLinkCodes(String(a.linkCode ?? ""), String(b.linkCode ?? "")),
    )
  return { parentStruct, childStructs }
}

function seriesRowForLinkCode<T extends { id: string; label: string }>(
  linkCode: string,
  seriesById: Map<string, T>,
): T | undefined {
  return seriesById.get(linkCode) ?? seriesById.get(linkCode.trim())
}

/** Regroupe les lignes Capex par parent ALT-B / ALT-C / ALT-D (structure bilan, puis série). */
export function groupCapexProjectionSeriesRows<
  T extends { id: string; label: string },
>(rows: T[], structure: Record<string, unknown>[]): CapexProjectionSeriesGroup<T>[] {
  const filtered = filterSeriesRowsForCapexProjection(rows, structure)
  const seriesById = new Map<string, T>()
  for (const row of filtered) {
    seriesById.set(row.id, row)
    const lc = String((row as { linkCode?: string }).linkCode ?? "").trim()
    if (lc) seriesById.set(lc, row)
  }

  const resolveSeriesRow = (linkCode: string, structRow: Record<string, unknown>): T => {
    const existing = seriesRowForLinkCode(linkCode, seriesById)
    if (existing) return existing
    return {
      id: linkCode,
      label: String(structRow.label ?? linkCode).trim() || linkCode,
    } as T
  }

  const groupFromSeriesOnly = (
    parentCode: (typeof CAPEX_PROJECTION_LINK_CODE_ROOTS)[number],
  ): CapexProjectionSeriesGroup<T> | null => {
    const inGroup = filtered.filter((row) => capexProjectionParentRoot(row.id) === parentCode)
    if (inGroup.length === 0) return null

    const parentRow = seriesRowForLinkCode(parentCode, seriesById) ?? null
    const childRows = inGroup
      .filter((row) => row.id !== parentCode)
      .sort((a, b) => compareCapexProjectionLinkCodes(a.id, b.id))

    const structParent = structure.find(
      (row) => String(row.linkCode ?? "").trim() === parentCode,
    )
    const parentLabel =
      parentRow?.label ?? (String(structParent?.label ?? "").trim() || parentCode)

    return { parentCode, parentLabel, parentRow, childRows }
  }

  return CAPEX_PROJECTION_LINK_CODE_ROOTS.map((parentCode) => {
    if (structure.length === 0) {
      return groupFromSeriesOnly(parentCode)
    }

    const { parentStruct, childStructs } = collectCapexStructureRowsByParent(structure, parentCode)
    if (!parentStruct && childStructs.length === 0) {
      return groupFromSeriesOnly(parentCode)
    }

    const parentRow = parentStruct ? resolveSeriesRow(parentCode, parentStruct) : null
    const childRows = childStructs.map((structRow) =>
      resolveSeriesRow(String(structRow.linkCode ?? "").trim(), structRow),
    )
    const parentLabel =
      parentRow?.label ?? (String(parentStruct?.label ?? "").trim() || parentCode)

    return { parentCode, parentLabel, parentRow, childRows }
  }).filter((group): group is CapexProjectionSeriesGroup<T> => group !== null)
}

/** Racines de codes calculés ailleurs en projection (non saisis dans « Estimation des dépenses annuelles »). */
export const PROJECTION_COMPUTED_EXPENSE_LINK_CODE_ROOTS = [
  "IMP",
  "CMV.11",
  "EXP.20",
  "EXP.21",
  "ADM.20",
  "ADM.21",
  "FIN.2",
  "FIN.3",
  "FIN.4",
] as const

export function isExcludedProjectionComputedExpenseLinkCode(code: string): boolean {
  const normalized = code.trim()
  if (!normalized) return false
  return PROJECTION_COMPUTED_EXPENSE_LINK_CODE_ROOTS.some(
    (root) => normalized === root || normalized.startsWith(`${root}.`),
  )
}

/** Tous les codes de liaison référencés par une ligne de structure (unique, somme, soustraction). */
export function collectLinkCodesFromStructureRow(row: Record<string, unknown>): string[] {
  const codes: string[] = []
  const add = (s: string) => {
    const t = s.trim()
    if (t) codes.push(t)
  }
  add(String(row.linkCode ?? ""))
  for (const c of normalizeCodeList(row.liaisonSumCodes)) add(c)
  for (const c of normalizeCodeList(row.liaisonNumeratorCodes)) add(c)
  for (const c of normalizeCodeList(row.liaisonDenominatorCodes)) add(c)
  return codes
}

export function structureRowUsesExcludedProjectionExpenseLinkCode(
  row: Record<string, unknown>,
): boolean {
  return collectLinkCodesFromStructureRow(row).some(isExcludedProjectionComputedExpenseLinkCode)
}

export function seriesRowUsesExcludedProjectionExpenseLinkCode(
  sr: { id: string; label: string },
  structure: Record<string, unknown>[],
): boolean {
  if (isExcludedProjectionComputedExpenseLinkCode(sr.id)) return true
  const structRow = findStructureRowForStatementLine(sr.id, sr.label, structure)
  if (!structRow) return false
  return structureRowUsesExcludedProjectionExpenseLinkCode(structRow)
}

/**
 * Ligne série « Estimation des dépenses annuelles » : même périmètre que le Détail (annexe + codes actifs),
 * restreint aux postes / annexes dont la nature au sommaire est « Dépenses ».
 */
export function seriesRowBelongsToDepensesAnnexDetail(
  sr: { id: string; label: string },
  structure: Record<string, unknown>[]
): boolean {
  const structRow = findStructureRowForStatementLine(sr.id, sr.label, structure)
  if (!structRow) return false
  if (seriesRowUsesExcludedProjectionExpenseLinkCode(sr, structure)) return false
  if (!isCodeMappingEnabled(structRow) || !isShowInDetail(structRow, structure)) return false

  if (normalizePosteNature(structRow.posteNature) === "depenses") return true

  if (isStructureRowDetailOnly(structRow)) {
    return structureAnnexIsDepensesNature(structure, String(structRow.annexLetter ?? ""))
  }

  return false
}

/** Vérifie l’absence de doublons sur `linkCode` (postes visibles avec code renseigné). */
export function validateDuplicatePrimaryLinkCodes(structure: Record<string, unknown>[]): string | null {
  const seen = new Map<string, number>()
  for (let i = 0; i < structure.length; i++) {
    const row = structure[i]!
    if (isStructureRowEmptyLabel(row)) continue
    if (isStructureRowHidden(row)) continue
    const code = String(row.linkCode ?? "").trim()
    if (!code) continue
    if (seen.has(code)) {
      return `Le code de liaison « ${code} » est utilisé par plusieurs postes. Chaque code ne peut être utilisé qu’une seule fois.`
    }
    seen.set(code, i)
  }
  return null
}

/**
 * Champ « Lettre » : désormais toujours en lecture seule. L'identifiant d'annexe
 * (lettre pour Résultats, nombre pour Bilan) est attribué automatiquement selon
 * l'ordre d'apparition de l'annexe dans le rapport — voir
 * {@link renumberAnnexesByAppearance}. Il n'est plus saisissable à la main, y
 * compris pour les sous-lignes détail (`detailOnly`).
 */
export function isAnnexLetterInputEditable(_row: Record<string, unknown>): boolean {
  return false
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
  if (mode === "product") {
    const n = normalizeCodeList(row.liaisonSumCodes).length
    return n ? `Π ${n} code${n > 1 ? "s" : ""}` : "Π …"
  }
  const nn = normalizeCodeList(row.liaisonNumeratorCodes).length
  const nd = normalizeCodeList(row.liaisonDenominatorCodes).length
  if (mode === "quotient") {
    const f = normalizeLiaisonFactor(row.liaisonFactor)
    const base = nn || nd ? `N${nn} ÷ D${nd}` : "N ÷ D …"
    return f !== 1 ? `${base} ×${f}` : base
  }
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

/**
 * Paramètres Détail : DT/CT obligatoire pour les postes affichés dans la grille,
 * sauf les titres d’annexe (ligne sommaire avec lettre, verrouillée au Détail).
 */
export function isDetailParamsDtCtRequired(_row: Record<string, unknown>): boolean {
  return false
}

/** Valeur stockée côté structure pour la colonne DT/CT (Paramètres Détail). */
export function normalizeDtCt(raw: unknown): "DT" | "CT" | undefined {
  const t = String(raw ?? "").trim().toUpperCase()
  if (t === "DT" || t === "CT") return t
  return undefined
}

/**
 * Signe d’affichage des montants (Détail / Sommaire) : **CT** → −1, **DT** ou non défini → 1.
 */
export function dtCtSignMultiplier(structureRow: Record<string, unknown> | undefined): number {
  if (!structureRow) return 1
  return normalizeDtCt(structureRow.dtCt) === "CT" ? -1 : 1
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
 * Pour chaque code de liaison du périmètre Détail (même clés que `mapLinkCodesToDetailLabels`),
 * **DT** ou **CT** tel que défini sur la ligne de structure (Paramètres Détail).
 */
export function mapLinkCodesToDtCt(
  structure: Record<string, unknown>[]
): Map<string, "DT" | "CT"> {
  const map = new Map<string, "DT" | "CT">()

  const addCode = (code: string, row: Record<string, unknown>) => {
    const t = code.trim()
    if (!t || map.has(t)) return
    const dt = normalizeDtCt(row.dtCt)
    if (dt) map.set(t, dt)
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
 * Affichage DT/CT pour le mapping comptable : valeur issue de la structure pour ce code de liaison.
 */
export function dtCtDisplayForAccountLinkCode(
  linkCode: string | undefined,
  dtCtByLinkCode: Map<string, "DT" | "CT">
): string {
  const lc = linkCode?.trim()
  if (!lc) return "—"
  return dtCtByLinkCode.get(lc) ?? "—"
}

/**
 * Affichage du Groupe pour le mapping comptable : uniquement si le code de liaison existe dans la
 * structure du compte de résultat (carte issue de `mapLinkCodesToGroupeLinkCodes`). Aucun préfixe
 * numérique déduit du libellé du code seul — sinon un code absent de la structure (ex. saisi au
 * mapping uniquement) pourrait afficher un groupe trompeur.
 */
export function groupeDisplayForAccountLinkCode(
  linkCode: string | undefined,
  groupeByLinkCode: Map<string, string>
): string {
  const lc = linkCode?.trim()
  if (!lc) return "—"
  return groupeByLinkCode.get(lc) ?? "—"
}

/**
 * Colonne Groupe (page mapping comptable) : si un code est renseigné mais qu’aucun groupe
 * n’est déductible de la structure, message explicite (le mapping n’est pas considéré comme terminé).
 */
export function groupeDisplayForAccountMappingTable(
  linkCode: string | undefined,
  groupeByLinkCode: Map<string, string>
): string {
  const lc = linkCode?.trim()
  if (!lc) return "—"
  const g = groupeDisplayForAccountLinkCode(linkCode, groupeByLinkCode)
  if (g === "—") return "Mapping incomplet"
  return g
}
