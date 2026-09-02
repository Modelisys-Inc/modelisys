/**
 * Actifs excédentaires VCA pour ALT-B / ALT-C / ALT-D :
 * tableau d’annexe avec JVM (déterminée dans Ajustements) et Excédent saisissable.
 * Total parent Actifs = Σ Excédent.
 */

import type { NoteAttachmentData } from "@/lib/api"
import type { NetTangibleJvmCapexPost } from "@/lib/net-tangible-jvm-capex"

export type NetTangibleSurplusPost = {
  code: string
  label: string
  /** JVM issue du panneau Ajustements (lecture seule). */
  jvm: number
  /** Actif excédentaire saisi pour l’ACN. */
  excedent: number
  note: string
  attachments: NoteAttachmentData[]
}

/** Clé de persistance flat : `{parentRowId}-excedent-{code}`. */
export function netTangibleExcedentStorageKey(parentRowId: string, code: string): string {
  return `${parentRowId}-excedent-${String(code ?? "").trim()}`
}

export function netTangibleExcedentNoteStorageKey(parentRowId: string, code: string): string {
  return `${parentRowId}-excedent-note-${String(code ?? "").trim()}`
}

export function netTangibleExcedentAttachmentStorageKey(parentRowId: string, code: string): string {
  return `${parentRowId}::excedent::${String(code ?? "").trim()}`
}

export function parseNetTangibleExcedentStorageKey(
  key: string,
): { parentRowId: string; code: string } | null {
  const marker = "-excedent-"
  const idx = key.indexOf(marker)
  if (idx <= 0) return null
  if (key.slice(idx).startsWith("-excedent-note-")) return null
  const parentRowId = key.slice(0, idx)
  const code = key.slice(idx + marker.length).trim()
  if (!parentRowId || !code) return null
  return { parentRowId, code }
}

export function parseNetTangibleExcedentNoteStorageKey(
  key: string,
): { parentRowId: string; code: string } | null {
  const marker = "-excedent-note-"
  const idx = key.indexOf(marker)
  if (idx <= 0) return null
  const parentRowId = key.slice(0, idx)
  const code = key.slice(idx + marker.length).trim()
  if (!parentRowId || !code) return null
  return { parentRowId, code }
}

/**
 * Construit les postes d’annexe Actifs : JVM résolue (Ajustements), excédent enregistré ou 0 $.
 */
export function buildNetTangibleSurplusPosts(
  jvmPosts: NetTangibleJvmCapexPost[],
  excedentByCode: Record<string, number> | undefined,
  extras?: {
    notesByCode?: Record<string, string>
    attachmentsByCode?: Record<string, NoteAttachmentData[]>
  },
): NetTangibleSurplusPost[] {
  return jvmPosts.map((post) => {
    const code = String(post.code ?? "").trim()
    const raw = excedentByCode?.[code]
    const excedent = raw == null || !Number.isFinite(raw) ? 0 : raw
    return {
      code,
      label: post.label,
      jvm: post.jvm,
      excedent,
      note: extras?.notesByCode?.[code] ?? "",
      attachments: extras?.attachmentsByCode?.[code] ?? [],
    }
  })
}

/** Total Actifs du parent = Σ Excédent. */
export function computeNetTangibleSurplusAssetsTotal(posts: NetTangibleSurplusPost[]): number {
  return posts.reduce((sum, post) => sum + post.excedent, 0)
}
