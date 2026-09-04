/**
 * Ajustements VCA pour Immobilisations corporelles / Biens loués / Actifs incorporels
 * (ALT-B / ALT-C / ALT-D) : tableau d’annexe avec VC (référence) et JVM saisissable.
 * Ajustement parent = Σ (JVM − VC).
 */

import type { NoteAttachmentData } from "@/lib/api"
import { CAPEX_PROJECTION_LINK_CODE_ROOTS } from "@/lib/standard-link-code-utils"
import { normalizeBalanceSheetLabel } from "@/lib/balance-sheet-validation"

export type NetTangibleJvmCapexPost = {
  code: string
  label: string
  /** Valeur comptable à la date de référence. */
  vc: number
  /** Juste valeur marchande (saisie) ; défaut = VC. */
  jvm: number
  /** Note / explication propre au poste. */
  note: string
  /** Pièces justificatives (PDF, Excel, etc.). */
  attachments: NoteAttachmentData[]
}

const JVM_CAPEX_ROOT_LABELS = new Set([
  "immobilisations corporelles",
  "biens loues",
  "actifs incorporels",
])

/** Racine Capex exacte ALT-B / ALT-C / ALT-D (pas les feuilles ALT-B.1…). */
export function isNetTangibleJvmCapexRootLinkCode(code: string | null | undefined): boolean {
  const normalized = String(code ?? "").trim().toUpperCase()
  if (!normalized) return false
  return (CAPEX_PROJECTION_LINK_CODE_ROOTS as readonly string[]).includes(normalized)
}

/** Repli libellé quand le code de liaison n’est pas résolu. */
export function isNetTangibleJvmCapexRootLabel(label: string | null | undefined): boolean {
  return JVM_CAPEX_ROOT_LABELS.has(normalizeBalanceSheetLabel(label ?? ""))
}

/** ALT-B / ALT-C / ALT-D depuis le libellé parent (quand le code structure est absent). */
export function netTangibleJvmCapexRootLinkCodeFromLabel(
  label: string | null | undefined,
): (typeof CAPEX_PROJECTION_LINK_CODE_ROOTS)[number] | null {
  const normalized = normalizeBalanceSheetLabel(label ?? "")
  if (normalized === "immobilisations corporelles") return "ALT-B"
  if (normalized === "biens loues") return "ALT-C"
  if (normalized === "actifs incorporels") return "ALT-D"
  return null
}

export function isNetTangibleJvmCapexRootRow(params: {
  linkCode?: string | null
  rowId?: string | null
  label?: string | null
}): boolean {
  if (isNetTangibleJvmCapexRootLinkCode(params.linkCode)) return true
  if (isNetTangibleJvmCapexRootLinkCode(params.rowId)) return true
  return isNetTangibleJvmCapexRootLabel(params.label)
}

/** Clé de persistance flat : `{parentRowId}-jvm-{code}`. */
export function netTangibleJvmStorageKey(parentRowId: string, code: string): string {
  return `${parentRowId}-jvm-${String(code ?? "").trim()}`
}

export function netTangibleJvmNoteStorageKey(parentRowId: string, code: string): string {
  return `${parentRowId}-jvm-note-${String(code ?? "").trim()}`
}

export function netTangibleJvmAttachmentStorageKey(parentRowId: string, code: string): string {
  return `${parentRowId}::${String(code ?? "").trim()}`
}

export function parseNetTangibleJvmStorageKey(
  key: string,
): { parentRowId: string; code: string } | null {
  const marker = "-jvm-"
  const idx = key.indexOf(marker)
  if (idx <= 0) return null
  // Ignorer les clés note (`-jvm-note-`)
  if (key.slice(idx).startsWith("-jvm-note-")) return null
  const parentRowId = key.slice(0, idx)
  const code = key.slice(idx + marker.length).trim()
  if (!parentRowId || !code) return null
  return { parentRowId, code }
}

export function parseNetTangibleJvmNoteStorageKey(
  key: string,
): { parentRowId: string; code: string } | null {
  const marker = "-jvm-note-"
  const idx = key.indexOf(marker)
  if (idx <= 0) return null
  const parentRowId = key.slice(0, idx)
  const code = key.slice(idx + marker.length).trim()
  if (!parentRowId || !code) return null
  return { parentRowId, code }
}

/**
 * Construit les postes d’annexe : JVM enregistrée, sinon VC (pas d’ajustement implicite).
 * Les postes à VC nulle (ou sans chiffre) sont exclus pour alléger le tableau.
 */
export function buildNetTangibleJvmCapexPosts(
  annexChildren: Array<{ code: string; label: string; amount: number }>,
  jvmByCode: Record<string, number> | undefined,
  extras?: {
    notesByCode?: Record<string, string>
    attachmentsByCode?: Record<string, NoteAttachmentData[]>
  },
): NetTangibleJvmCapexPost[] {
  return annexChildren
    .map((child) => {
      const code = String(child.code ?? "").trim()
      const vc = Number(child.amount) || 0
      const raw = jvmByCode?.[code]
      const jvm = raw == null || !Number.isFinite(raw) ? vc : raw
      return {
        code,
        label: String(child.label ?? code).trim() || code,
        vc,
        jvm,
        note: extras?.notesByCode?.[code] ?? "",
        attachments: extras?.attachmentsByCode?.[code] ?? [],
      }
    })
    .filter(isNetTangibleJvmCapexPostMaterial)
}

/** Visible seulement si la VC est non nulle. */
export function isNetTangibleJvmCapexPostMaterial(post: { vc?: number }): boolean {
  return Math.abs(post.vc ?? 0) >= 1e-9
}

/** Ajustement VCA du parent = Σ (JVM − VC). */
export function computeNetTangibleJvmCapexAdjustment(posts: NetTangibleJvmCapexPost[]): number {
  return posts.reduce((sum, post) => sum + (post.jvm - post.vc), 0)
}

export function parseCurrencyInputDraft(raw: string): number {
  const cleaned = raw.replace(/[^\d-]/g, "")
  if (cleaned === "" || cleaned === "-") return 0
  return Number(cleaned)
}
