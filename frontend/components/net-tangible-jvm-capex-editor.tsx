"use client"

import { Fragment, useState } from "react"
import { ChevronDown, FileText, Paperclip } from "lucide-react"
import {
  fileToAttachment,
  MAX_NOTE_ATTACHMENTS,
  MAX_NOTE_FILE_BYTES,
  NoteAttachmentsBlock,
} from "@/components/income-statement-note-panel"
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

/** Champ JVM discret style ParamRow / buildup (édition au focus). */
function JvmInlineInput({
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
    <input
      type="text"
      inputMode="numeric"
      data-testid={testId}
      aria-label="JVM"
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
        "w-full min-w-[6.5rem] bg-transparent py-0.5 text-right font-mono text-sm tabular-nums text-[#2A2F3A] outline-none",
        "rounded-sm border-0 border-b border-transparent transition-[border-color,background-color,padding]",
        "placeholder:text-slate-300 focus:border-dashed focus:border-[#E0742D] focus:bg-slate-50 focus:px-1.5",
      )}
    />
  )
}

function updatePost(
  posts: NetTangibleJvmCapexPost[],
  code: string,
  patch: Partial<NetTangibleJvmCapexPost>,
): NetTangibleJvmCapexPost[] {
  return posts.map((post) => (post.code === code ? { ...post, ...patch } : post))
}

/**
 * Annexe JVM Capex en tableau buildup (même langage que « Calcul du poste »).
 */
export function NetTangibleJvmCapexEditor({
  posts,
  onChange,
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
    <div className="mt-1" data-testid="net-tangible-jvm-capex-table">
      {posts.length === 0 ? (
        <p className="border-t border-dashed border-slate-200 py-6 text-center text-sm text-slate-500">
          Aucun poste d&apos;annexe trouvé pour ce compte.
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Poste
              </th>
              <th className="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                VC
              </th>
              <th className="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                JVM
              </th>
              <th className="py-2 pl-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Écart
              </th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => {
              const delta = post.jvm - post.vc
              const expanded = expandedCodes.has(post.code)
              const hasMeta = !!post.note.trim() || post.attachments.length > 0

              return (
                <Fragment key={post.code}>
                  <tr
                    className="border-t border-slate-200"
                    data-testid={`net-tangible-jvm-row-${post.code}`}
                  >
                    <td className="py-2 pr-3 align-middle">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[10px] text-slate-500">{post.code}</span>
                          {hasMeta ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                              {post.note.trim() ? (
                                <FileText className="h-3 w-3" aria-hidden />
                              ) : null}
                              {post.attachments.length > 0 ? (
                                <>
                                  <Paperclip className="h-3 w-3" aria-hidden />
                                  {post.attachments.length}
                                </>
                              ) : null}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-[#2A2F3A]">{post.label}</p>
                        <button
                          type="button"
                          className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 transition-colors hover:text-[#2A2F3A]"
                          onClick={() => toggleExpanded(post.code)}
                          aria-expanded={expanded}
                          data-testid={`net-tangible-jvm-toggle-meta-${post.code}`}
                        >
                          Note / pièces
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 transition-transform",
                              expanded && "rotate-180",
                            )}
                            aria-hidden
                          />
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right align-middle font-mono text-sm tabular-nums text-[#2A2F3A]">
                      {formatCurrency(post.vc)}
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <JvmInlineInput
                        value={post.jvm}
                        testId={`net-tangible-jvm-input-${post.code}`}
                        onChange={(jvm) => onChange(updatePost(posts, post.code, { jvm }))}
                      />
                    </td>
                    <td
                      className={cn(
                        "py-2 pl-2 text-right align-middle font-mono text-sm tabular-nums",
                        delta > 0
                          ? "text-[#E0742D]"
                          : delta < 0
                            ? "text-amber-700"
                            : "text-slate-400",
                      )}
                    >
                      {delta === 0
                        ? "—"
                        : `${delta > 0 ? "+" : "−"}${formatCurrency(Math.abs(delta))}`}
                    </td>
                  </tr>
                  {expanded ? (
                    <tr className="border-t border-slate-100 bg-slate-50/40">
                      <td colSpan={4} className="px-0 py-3">
                        <div className="space-y-3 px-1 sm:px-2">
                          <textarea
                            value={post.note}
                            onChange={(event) =>
                              onChange(updatePost(posts, post.code, { note: event.target.value }))
                            }
                            placeholder="Justification de la JVM, méthode d’évaluation, source…"
                            className={cn(
                              "min-h-[72px] w-full resize-none rounded-sm border-0 border-b border-transparent bg-transparent",
                              "px-0 py-0 text-pretty text-xs leading-relaxed text-slate-500 outline-none",
                              "placeholder:text-slate-400 focus:border-dashed focus:border-[#E0742D] focus:bg-white focus:px-1.5 focus:py-1",
                            )}
                            data-testid={`net-tangible-jvm-note-${post.code}`}
                          />
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
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              )
            })}
            <tr className="border-t-2 border-[#2A2F3A]">
              <td className="py-2.5 pr-3 text-sm font-semibold text-[#2A2F3A]">
                Total / ajustement
              </td>
              <td className="px-2 py-2.5 text-right font-mono text-sm font-semibold tabular-nums text-[#2A2F3A]">
                {formatCurrency(jvmVcTotal)}
              </td>
              <td className="px-2 py-2.5 text-right font-mono text-sm font-semibold tabular-nums text-[#2A2F3A]">
                {formatCurrency(jvmTotal)}
              </td>
              <td
                className="py-2.5 pl-2 text-right font-mono text-sm font-semibold tabular-nums text-[#E0742D]"
                data-testid="net-tangible-jvm-adjustment"
              >
                {formatCurrency(jvmAdjustment)}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  )
}
