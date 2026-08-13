"use client"

import { Textarea } from "@/components/ui/textarea"
import type { PilotageSectionCommentBlockId } from "@/lib/pilotage-section-comments"
import { cn } from "@/lib/utils"

interface PilotageSectionCommentFieldProps {
  blockId: PilotageSectionCommentBlockId
  value: string
  onChange: (text: string) => void
  variant?: "screen" | "print"
  readOnly?: boolean
}

export function PilotageSectionCommentField({
  blockId,
  value,
  onChange,
  variant = "screen",
  readOnly = false,
}: PilotageSectionCommentFieldProps) {
  if (variant === "print") {
    if (!value.trim()) return null
    return (
      <article
        className="report-mandate-section report-avoid-break report-page-break-avoid mt-6"
        data-testid={`pilotage-section-comment-${blockId}`}
      >
        <h2 className="report-mandate-section-title">Commentaires</h2>
        <p className="report-mandate-section-body whitespace-pre-wrap">{value}</p>
      </article>
    )
  }

  return (
    <div
      className="mt-6 border-l-2 border-[#e0742d] bg-gradient-to-r from-[#fffaf5] to-white py-4 pl-3 pr-4"
      data-testid={`pilotage-section-comment-${blockId}`}
    >
      <label
        htmlFor={`pilotage-comment-${blockId}`}
        className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#e0742d]"
      >
        Commentaires
      </label>
      <Textarea
        id={`pilotage-comment-${blockId}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        readOnly={readOnly}
        disabled={readOnly}
        placeholder="Ajoutez des précisions ou des éléments de contexte pour cette section…"
        className={cn(
          "mt-2 min-h-[88px] resize-y rounded-lg border-slate-200 bg-white text-sm leading-relaxed text-[#2A2F3A]",
          readOnly && "cursor-default bg-slate-50/80 text-slate-600",
        )}
      />
    </div>
  )
}
