"use client"

import type { ReactNode } from "react"
import type {
  DivisionNarrativeBlock,
  PerformanceNarrativeParagraph,
} from "@/lib/income-performance-narrative"
import { cn } from "@/lib/utils"

function renderParagraphBody(
  paragraph: PerformanceNarrativeParagraph,
  renderAfterParagraph?: (paragraph: PerformanceNarrativeParagraph) => ReactNode,
  options?: {
    subsectionClassName?: string
    bodyClassName?: string
    statsClassName?: string
    seasonalityLabelClassName?: string
  },
) {
  return (
    <div key={`${paragraph.subsection ?? "main"}-${paragraph.section ?? "body"}-${paragraph.heading}`}>
      {paragraph.subsection ? (
        <p className={options?.subsectionClassName}>{paragraph.subsection}</p>
      ) : null}
      <p className={options?.bodyClassName}>{paragraph.body}</p>
      {paragraph.secondaryBody ? <p className={options?.bodyClassName}>{paragraph.secondaryBody}</p> : null}
      {paragraph.seasonalityBody ? (
        <p className={options?.bodyClassName}>
          <span className={options?.seasonalityLabelClassName}>Saisonnalité — </span>
          {paragraph.seasonalityBody}
        </p>
      ) : null}
      {paragraph.statsLine ? <p className={options?.statsClassName}>{paragraph.statsLine}</p> : null}
      {renderAfterParagraph?.(paragraph)}
    </div>
  )
}

export function DivisionNarrativeBlockList({
  blocks,
  renderAfterParagraph,
  variant = "screen",
  blockClassName,
}: {
  blocks: DivisionNarrativeBlock[]
  renderAfterParagraph?: (paragraph: PerformanceNarrativeParagraph) => ReactNode
  variant?: "screen" | "print"
  blockClassName?: string
}) {
  const isPrint = variant === "print"

  return (
    <div className={cn(isPrint ? "report-division-narrative-blocks" : "space-y-8", blockClassName)}>
      {blocks.map((block) => (
        <div
          key={block.id}
          className={cn(
            isPrint ? "report-division-narrative-block report-page-break-avoid" : "space-y-4",
          )}
        >
          {isPrint ? (
            <h4 className="report-narrative-heading">{block.title}</h4>
          ) : (
            <p className="text-sm font-semibold text-[#2A2F3A]">{block.title}</p>
          )}
          <div className={cn(isPrint ? "report-division-narrative-sections" : "space-y-5")}>
            {block.paragraphs.map((paragraph, paragraphIdx) =>
              renderParagraphBody(paragraph, renderAfterParagraph, {
                subsectionClassName: isPrint
                  ? cn(
                      "report-narrative-subheading",
                      paragraphIdx === 0 && "report-division-first-subsection",
                    )
                  : cn(
                      "mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500",
                      paragraphIdx === 0 && "mt-3",
                    ),
                bodyClassName: isPrint
                  ? "report-narrative-text"
                  : "mt-2 text-sm leading-relaxed text-[#5C5F66] text-pretty",
                statsClassName: isPrint
                  ? "report-narrative-stats"
                  : "mt-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs font-medium tabular-nums text-slate-600",
                seasonalityLabelClassName: isPrint
                  ? "report-narrative-emphasis"
                  : "font-medium text-slate-600",
              }),
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
