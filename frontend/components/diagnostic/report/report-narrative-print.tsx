"use client"

import type { ReactNode } from "react"
import type { PerformanceNarrativeResult } from "@/lib/income-performance-narrative"
import { groupDivisionNarrativeBlocks } from "@/lib/income-performance-narrative"
import { DivisionNarrativeBlockList } from "@/components/diagnostic/division-narrative-block-list"

type Narrative = NonNullable<PerformanceNarrativeResult>

const NARRATIVE_SECTION_META: Record<string, { title?: string; description?: string; showHeader?: boolean }> = {
  "revenue-performance": {
    showHeader: false,
  },
  "revenue-mix": {
    showHeader: false,
  },
  "contributive-margin": {
    showHeader: false,
  },
  "division-revenue": {
    showHeader: false,
  },
  "division-rentability": {
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

function groupParagraphs(paragraphs: Narrative["paragraphs"]) {
  const hasSections = paragraphs.some((p) => p.section)
  if (!hasSections) {
    return [{ id: "default", title: null as string | null, description: null as string | null, paragraphs }]
  }

  const order = [
    "revenue-performance",
    "contributive-margin",
    "division-revenue",
    "division-rentability",
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
      paragraphs: items,
    })
  }

  const uncategorized = paragraphs.filter((p) => !p.section)
  if (uncategorized.length) {
    groups.push({ id: "other", title: null, description: null, paragraphs: uncategorized })
  }

  return groups
}

/** Lecture narrative — style rapport CPA/CBV (sans carte ni fond gris). */
export function ReportNarrativePrint({
  narrative,
  renderAfterParagraph,
  testId,
  showHeader = true,
}: {
  narrative: Narrative
  renderAfterParagraph?: (paragraph: Narrative["paragraphs"][number]) => ReactNode
  testId?: string
  /** Faux sur les pages de suite (pagination). */
  showHeader?: boolean
}) {
  const divisionBlocks = groupDivisionNarrativeBlocks(narrative.paragraphs)
  const standardParagraphs = divisionBlocks
    ? narrative.paragraphs.filter((paragraph) => !paragraph.divisionBlockId)
    : narrative.paragraphs
  const groups = groupParagraphs(standardParagraphs)
  const subtitle =
    narrative.mode === "annual" || narrative.mode === "monthly"
      ? narrative.subtitle
      : "Synthèse factuelle à partir des séries affichées."

  return (
    <article className="report-narrative-print" data-testid={testId ?? "report-narrative-print"}>
      {showHeader ? (
        <header className="report-narrative-header">
          <p className="report-narrative-kicker">Analyse</p>
          <h2 className="report-narrative-title">{narrative.title}</h2>
          <p className="report-narrative-subtitle">{subtitle}</p>
          {"referencePeriod" in narrative && narrative.referencePeriod ? (
            <p className="report-narrative-ref">Période de référence : {narrative.referencePeriod}</p>
          ) : null}
        </header>
      ) : null}

      <div className="report-narrative-body">
        {divisionBlocks?.length ? (
          <DivisionNarrativeBlockList
            blocks={divisionBlocks}
            renderAfterParagraph={renderAfterParagraph}
            variant="print"
          />
        ) : null}
        {standardParagraphs.length > 0
          ? groups?.map((group) => (
          <section key={group.id} className="report-narrative-group">
            {group.title ? (
              <div className="report-narrative-group-head">
                <h3 className="report-narrative-group-title">{group.title}</h3>
                {group.description ? (
                  <p className="report-narrative-group-desc">{group.description}</p>
                ) : null}
              </div>
            ) : null}
            {group.paragraphs.map((p, paragraphIdx) => (
              <div
                key={`${group.id}-${paragraphIdx}-${p.heading}-${p.subsection ?? "main"}`}
                className="report-narrative-paragraph report-page-break-avoid"
              >
                {!p.hideMainHeading ? (
                  <h4 className="report-narrative-heading">{p.heading}</h4>
                ) : null}
                {p.subsection ? (
                  <p className="report-narrative-subheading">{p.subsection}</p>
                ) : null}
                <p className="report-narrative-text">{p.body}</p>
                {p.secondaryBody ? <p className="report-narrative-text">{p.secondaryBody}</p> : null}
                {p.seasonalityBody ? (
                  <p className="report-narrative-text">
                    <span className="report-narrative-emphasis">Saisonnalité — </span>
                    {p.seasonalityBody}
                  </p>
                ) : null}
                {p.statsLine ? <p className="report-narrative-stats">{p.statsLine}</p> : null}
                {renderAfterParagraph?.(p)}
              </div>
            ))}
          </section>
        ))
          : null}
      </div>
    </article>
  )
}
