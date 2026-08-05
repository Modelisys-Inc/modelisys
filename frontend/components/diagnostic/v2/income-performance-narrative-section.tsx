"use client"

import type { ReactNode } from "react"
import { FileText } from "lucide-react"
import type { PerformanceNarrativeResult } from "@/lib/income-performance-narrative"
type PerformanceNarrativeResultNonNull = NonNullable<PerformanceNarrativeResult>

const NARRATIVE_SECTION_META: Record<
  string,
  { title?: string; description?: string; className?: string; showHeader?: boolean }
> = {
  "revenue-performance": {
    showHeader: false,
  },
  "revenue-mix": {
    showHeader: false,
  },
  "contributive-margin": {
    showHeader: false,
  },
  "division-profitability": {
    showHeader: false,
  },
  "financial-position": {
    showHeader: false,
  },
  "working-capital": {
    showHeader: false,
  },
  capex: {
    title: "Investissements",
    description: "Évolution des dépenses d'investissement et ratios d'intensité capitalistique.",
  },
}

function groupNarrativeParagraphs(paragraphs: PerformanceNarrativeResultNonNull["paragraphs"]) {
  const hasSections = paragraphs.some((p) => p.section)
  if (!hasSections) {
    return [
      {
        id: "default",
        title: null as string | null,
        description: null as string | null,
        className: undefined,
        paragraphs,
      },
    ]
  }

  const order = [
    "revenue-performance",
    "contributive-margin",
    "division-profitability",
    "financial-position",
    "working-capital",
    "capex",
    "revenue-mix",
  ] as const
  const groups: Array<{
    id: string
    title: string | null
    description: string | null
    className?: string
    paragraphs: typeof paragraphs
  }> = []

  for (const sectionId of order) {
    const items = paragraphs.filter((p) => p.section === sectionId)
    if (!items.length) continue
    const meta = NARRATIVE_SECTION_META[sectionId]
    groups.push({
      id: sectionId,
      title: meta?.showHeader === false ? null : (meta?.title ?? sectionId),
      description: meta?.showHeader === false ? null : (meta?.description ?? null),
      className: meta?.className,
      paragraphs: items,
    })
  }

  const uncategorized = paragraphs.filter((p) => !p.section)
  if (uncategorized.length) {
    groups.push({ id: "other", title: null, description: null, paragraphs: uncategorized })
  }

  return groups
}

export function IncomePerformanceNarrativeSection({
  narrative,
  renderAfterParagraph,
  testId,
  headerActions,
  settingsPanel,
}: {
  narrative: PerformanceNarrativeResultNonNull
  renderAfterParagraph?: (paragraph: PerformanceNarrativeResultNonNull["paragraphs"][number]) => ReactNode
  testId?: string
  /** Actions à droite du titre (ex. Paramètres). */
  headerActions?: ReactNode
  /** Remplace le corps narratif (ex. éditeur de structure). */
  settingsPanel?: ReactNode | null
}) {
  const groups = groupNarrativeParagraphs(narrative.paragraphs)

  return (
    <div
      className="w-full border-t border-slate-200 bg-gradient-to-b from-slate-50/80 to-white px-[18px] pb-8 pt-10 sm:px-7 sm:pb-9 sm:pt-12"
      data-testid={testId}
    >
      <div className="flex w-full max-w-none items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white shadow-sm">
          <FileText className="h-4 w-4 text-slate-600" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0 w-full flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                {narrative.title}
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {narrative.mode === "annual" || narrative.mode === "monthly"
                  ? narrative.subtitle
                  : "Synthèse factuelle à partir des séries affichées (variations séquentielles et lecture de fenêtre)."}
              </p>
            </div>
            {headerActions ? <div className="shrink-0">{headerActions}</div> : null}
          </div>
          {settingsPanel ? (
            <div className="mt-5">{settingsPanel}</div>
          ) : (
            <div className="mt-5 space-y-8">
              {groups.map((group) => (
              <div key={group.id}>
                <div className={group.className}>
                  {group.title ? (
                    <div className="mb-4">
                      <h5 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                        {group.title}
                      </h5>
                      {group.description ? (
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">{group.description}</p>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="space-y-6">
                    {group.paragraphs.map((p, paragraphIdx) => (
                      <div key={`${group.id}-${paragraphIdx}-${p.heading}`}>
                        <p className="text-sm font-semibold text-[#2A2F3A]">{p.heading}</p>
                        <p className="mt-2 text-sm leading-relaxed text-[#5C5F66] text-pretty">{p.body}</p>
                        {p.secondaryBody ? (
                          <p className="mt-3 text-sm leading-relaxed text-[#5C5F66] text-pretty">
                            {p.secondaryBody}
                          </p>
                        ) : null}
                        {p.seasonalityBody ? (
                          <p className="mt-3 text-sm leading-relaxed text-[#5C5F66] text-pretty">
                            <span className="font-medium text-slate-600">Saisonnalité — </span>
                            {p.seasonalityBody}
                          </p>
                        ) : null}
                        {p.statsLine ? (
                          <p className="mt-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs font-medium tabular-nums text-slate-600">
                            {p.statsLine}
                          </p>
                        ) : null}
                        {renderAfterParagraph?.(p)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
