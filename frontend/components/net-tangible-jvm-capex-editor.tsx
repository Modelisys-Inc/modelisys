"use client"

import { useState } from "react"
import { ChevronDown, FileText, Paperclip } from "lucide-react"
import {
  fileToAttachment,
  MAX_NOTE_ATTACHMENTS,
  MAX_NOTE_FILE_BYTES,
  NoteAttachmentsBlock,
} from "@/components/income-statement-note-panel"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency } from "@/lib/financial-utils"
import {
  computeNetTangibleJvmCapexAdjustment,
  parseCurrencyInputDraft,
  type NetTangibleJvmCapexPost,
} from "@/lib/net-tangible-jvm-capex"
import { cn } from "@/lib/utils"

type NetTangibleJvmCapexEditorProps = {
  posts: NetTangibleJvmCapexPost[]
  onChange: (posts: NetTangibleJvmCapexPost[]) => void
  referenceLabel?: string
}

/**
 * Saisie JVM élégante : montant formaté comme la carte VCA (tabular-nums),
 * focus → édition, note + pièces par poste.
 */
function JvmCurrencyField({
  value,
  onChange,
  testId,
}: {
  value: number
  onChange: (next: number) => void
  testId: string
}) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState("")

  return (
    <div
      className={cn(
        "relative rounded-lg px-3 py-2 transition-colors",
        focused
          ? "bg-white shadow-[inset_0_0_0_1.5px_#E0742D]"
          : "bg-slate-50/80 hover:bg-slate-50",
      )}
    >
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">JVM</p>
      <input
        type="text"
        inputMode="numeric"
        data-testid={testId}
        value={focused ? draft : value === 0 ? "" : formatCurrency(value)}
        placeholder={formatCurrency(0)}
        onFocus={() => {
          setFocused(true)
          setDraft(value === 0 ? "" : String(value))
        }}
        onBlur={() => {
          setFocused(false)
          onChange(parseCurrencyInputDraft(draft))
        }}
        onChange={(event) => {
          const next = event.target.value
          setDraft(next)
          onChange(parseCurrencyInputDraft(next))
        }}
        className={cn(
          "mt-0.5 w-full min-w-[7.5rem] bg-transparent text-right text-sm font-semibold tabular-nums tracking-tight text-[#2A2F3A]",
          "outline-none placeholder:text-slate-300",
        )}
      />
    </div>
  )
}

function updatePost(
  posts: NetTangibleJvmCapexPost[],
  code: string,
  patch: Partial<NetTangibleJvmCapexPost>,
): NetTangibleJvmCapexPost[] {
  return posts.map((post) => (post.code === code ? { ...post, ...patch } : post))
}

export function NetTangibleJvmCapexEditor({
  posts,
  onChange,
  referenceLabel,
}: NetTangibleJvmCapexEditorProps) {
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(() => new Set())
  const [attachmentErrorByCode, setAttachmentErrorByCode] = useState<Record<string, string | null>>(
    {},
  )

  const jvmAdjustment = computeNetTangibleJvmCapexAdjustment(posts)
  const jvmVcTotal = posts.reduce((sum, post) => sum + post.vc, 0)
  const jvmTotal = posts.reduce((sum, post) => sum + post.jvm, 0)

  const toggleExpanded = (code: string) => {
    setExpandedCodes((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const handleFiles = async (code: string, fileList: FileList | null) => {
    if (!fileList?.length) return
    const post = posts.find((p) => p.code === code)
    if (!post) return
    const nextAttachments = [...post.attachments]
    let error: string | null = null
    for (const file of Array.from(fileList)) {
      if (nextAttachments.length >= MAX_NOTE_ATTACHMENTS) {
        error = `Maximum ${MAX_NOTE_ATTACHMENTS} fichiers par poste.`
        break
      }
      if (file.size > MAX_NOTE_FILE_BYTES) {
        error = `${file.name} dépasse 4 Mo.`
        continue
      }
      try {
        nextAttachments.push(await fileToAttachment(file))
      } catch {
        error = `Impossible de lire ${file.name}.`
      }
    }
    setAttachmentErrorByCode((prev) => ({ ...prev, [code]: error }))
    onChange(updatePost(posts, code, { attachments: nextAttachments }))
  }

  return (
    <div className="mt-5 space-y-3" data-testid="net-tangible-jvm-capex-table">
      {referenceLabel ? (
        <p className="text-[11px] text-slate-500">
          VC à la date de référence ·{" "}
          <span className="font-medium text-slate-700">{referenceLabel}</span>
        </p>
      ) : null}

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
          Aucun poste d’annexe trouvé pour ce compte.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {posts.map((post) => {
            const delta = post.jvm - post.vc
            const expanded = expandedCodes.has(post.code)
            const hasMeta = !!post.note.trim() || post.attachments.length > 0

            return (
              <li
                key={post.code}
                className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                data-testid={`net-tangible-jvm-row-${post.code}`}
              >
                <div className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1.4fr)_auto] sm:items-center sm:px-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                        {post.code}
                      </span>
                      {hasMeta ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                          {post.note.trim() ? <FileText className="h-3 w-3" aria-hidden /> : null}
                          {post.attachments.length > 0 ? (
                            <>
                              <Paperclip className="h-3 w-3" aria-hidden />
                              {post.attachments.length}
                            </>
                          ) : null}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 truncate text-sm font-semibold tracking-tight text-[#2A2F3A]">
                      {post.label}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-end justify-end gap-3">
                    <div className="min-w-[7rem] text-right">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        VC
                      </p>
                      <p className="mt-0.5 text-sm tabular-nums tracking-tight text-slate-600">
                        {formatCurrency(post.vc)}
                      </p>
                    </div>
                    <JvmCurrencyField
                      value={post.jvm}
                      testId={`net-tangible-jvm-input-${post.code}`}
                      onChange={(jvm) => onChange(updatePost(posts, post.code, { jvm }))}
                    />
                    <div className="min-w-[5.5rem] text-right">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Écart
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 text-sm font-semibold tabular-nums tracking-tight",
                          delta > 0
                            ? "text-emerald-700"
                            : delta < 0
                              ? "text-amber-700"
                              : "text-slate-400",
                        )}
                      >
                        {delta === 0
                          ? "—"
                          : `${delta > 0 ? "+" : "−"}${formatCurrency(Math.abs(delta))}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-2 sm:px-5">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 text-left text-xs font-medium text-slate-600 transition-colors hover:text-[#2A2F3A]"
                    onClick={() => toggleExpanded(post.code)}
                    aria-expanded={expanded}
                    data-testid={`net-tangible-jvm-toggle-meta-${post.code}`}
                  >
                    <span>Note et pièces justificatives</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-slate-400 transition-transform",
                        expanded && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </button>

                  {expanded ? (
                    <div className="mt-3 space-y-4 pb-2">
                      <div>
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Note / explication
                        </Label>
                        <Textarea
                          value={post.note}
                          onChange={(event) =>
                            onChange(updatePost(posts, post.code, { note: event.target.value }))
                          }
                          placeholder="Justification de la JVM, méthode d’évaluation, source…"
                          className="mt-1.5 min-h-[84px] border-slate-200 bg-white text-sm"
                          data-testid={`net-tangible-jvm-note-${post.code}`}
                        />
                      </div>
                      <NoteAttachmentsBlock
                        attachments={post.attachments}
                        attachmentError={attachmentErrorByCode[post.code] ?? null}
                        inputId={`net-tangible-jvm-file-${post.code}`}
                        onFileChange={(event) => {
                          void handleFiles(post.code, event.target.files)
                          event.target.value = ""
                        }}
                        onRemove={(index) => {
                          onChange(
                            updatePost(posts, post.code, {
                              attachments: post.attachments.filter((_, i) => i !== index),
                            }),
                          )
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {posts.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-5 py-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Synthèse
              </p>
              <p className="mt-1 text-sm tabular-nums tracking-tight text-slate-600">
                VC {formatCurrency(jvmVcTotal)}
                <span className="mx-2 text-slate-300">·</span>
                JVM {formatCurrency(jvmTotal)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Ajustement
              </p>
              <p
                className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-[#2A2F3A]"
                data-testid="net-tangible-jvm-adjustment"
              >
                {formatCurrency(jvmAdjustment)}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
