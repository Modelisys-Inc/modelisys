"use client"



import type { Company } from "@/components/entity-selector"

import type { CompanyDiagnostic } from "@/lib/api"

import type { ExecutiveSummaryBlock } from "@/lib/diagnostic-executive-summary"

import type { ReportChapterDefinition, ReportChapterTone } from "@/lib/diagnostic-report-chapters"

import { toneFromChip } from "@/lib/diagnostic-report-chapters"

import { DiagnosticReportChartSection } from "@/components/diagnostic/v2/diagnostic-trajectory-statement-chart"

import {

  ReportChartExhibit,

  ReportExecutiveBrief,

  ReportInsightCard,

  ReportKeyTakeaways,

  ReportObservations,

  ReportPointsCles,

  ReportSectionTitle,

} from "@/components/diagnostic/report/report-primitives"

import { ReportTrendTable } from "@/components/diagnostic/report/report-trend-table"

import { ReportExecutiveSummaryPrint } from "@/components/diagnostic/report/report-executive-summary-print"

import { PageBreakAvoid } from "@/components/diagnostic/report/report-layout"

import {

  ReportCapexChapter,

  ReportCashflowChapter,

  ReportDivisionsChapter,

  ReportFinancialPositionChapter,

  ReportPerformanceChapter,

  ReportRevenueChapter,

  ReportValuationChapter,

  ReportWorkingCapitalChapter,

} from "@/components/diagnostic/report/report-chapter-sections"



interface ReportChapterContentProps {

  chapter: ReportChapterDefinition

  diagnostic: CompanyDiagnostic

  companyId: string

  companies: Company[]

  blocks: ExecutiveSummaryBlock[]

}



const PRINT_NATIVE_CHAPTERS = new Set([

  "executive-global",

  "performance",

  "revenue",

  "expenses",

  "financial-position",

  "working-capital",

  "capex",

  "cashflow",

  "valuation",

])



function pickTakeaways(blocks: ExecutiveSummaryBlock[], max = 4): string[] {

  const items: string[] = []

  for (const block of blocks) {

    if (block.highlight?.text) items.push(block.highlight.text)

    for (const p of block.paragraphs) {

      if (items.length >= max) break

      if (p.length > 20) items.push(p)

    }

    if (items.length >= max) break

  }

  return items.slice(0, max)

}



function pickObservations(blocks: ExecutiveSummaryBlock[]): string[] {

  return blocks.flatMap((b) => b.paragraphs).slice(0, 5)

}



function pickBrief(blocks: ExecutiveSummaryBlock[]): string[] {

  if (!blocks.length) return []

  const first = blocks[0]!

  return [first.subtitle, ...first.paragraphs.slice(0, 2)].filter(Boolean)

}



function pickInsightCards(blocks: ExecutiveSummaryBlock[]) {

  const cards: { tone: ReportChapterTone; title: string; body: string }[] = []

  for (const block of blocks) {

    if (block.highlight) {

      cards.push({

        tone: block.highlight.tone === "ok" ? "positive" : block.highlight.tone === "risk" ? "risk" : "watch",

        title: block.title,

        body: block.highlight.text,

      })

    }

    for (const m of block.metrics ?? []) {

      if (cards.length >= 3) break

      cards.push({

        tone: toneFromChip(m.tone),

        title: m.label,

        body: m.value,

      })

    }

  }

  return cards.slice(0, 3)

}



function ReportChapterPrintBody({

  chapter,

  diagnostic,

}: {

  chapter: ReportChapterDefinition

  diagnostic: CompanyDiagnostic

}) {

  switch (chapter.id) {

    case "executive-global":

      return <ReportExecutiveSummaryPrint diagnostic={diagnostic} />

    case "performance":

      return <ReportPerformanceChapter diagnostic={diagnostic} />

    case "revenue":

      return <ReportRevenueChapter diagnostic={diagnostic} />

    case "expenses":

      return <ReportDivisionsChapter diagnostic={diagnostic} />

    case "financial-position":

      return <ReportFinancialPositionChapter diagnostic={diagnostic} />

    case "working-capital":

      return <ReportWorkingCapitalChapter diagnostic={diagnostic} />

    case "capex":

      return <ReportCapexChapter diagnostic={diagnostic} />

    case "cashflow":

      return <ReportCashflowChapter diagnostic={diagnostic} />

    case "valuation":

      return <ReportValuationChapter diagnostic={diagnostic} />

    default:

      return null

  }

}



export function ReportChapterContent({

  chapter,

  diagnostic,

  companyId,

  companies,

  blocks,

}: ReportChapterContentProps) {

  const brief = pickBrief(blocks)

  const observations = pickObservations(blocks)

  const takeaways = pickTakeaways(blocks)

  const pointsCles = takeaways.slice(0, 3)

  const insights = pickInsightCards(blocks)

  const Icon = chapter.icon

  const usePrintNative = PRINT_NATIVE_CHAPTERS.has(chapter.id)



  if (chapter.id === "executive-global") {

    return (

      <div className="report-chapter-body">

        <ReportSectionTitle number={chapter.number} title={chapter.title} icon={Icon} />

        <div className="report-spacer-md" />

        <ReportExecutiveSummaryPrint diagnostic={diagnostic} />

      </div>

    )

  }



  return (

    <div className="report-chapter-body">

      <ReportSectionTitle number={chapter.number} title={chapter.title} icon={Icon} />

      <div className="report-spacer-md" />



      {brief.length > 0 ? (

        <>

          <ReportExecutiveBrief>

            {brief.map((line, i) => (

              <p key={i}>{line}</p>

            ))}

          </ReportExecutiveBrief>

          <div className="report-spacer-lg" />

        </>

      ) : null}



      {insights.length > 0 ? (

        <>

          <div className="report-insight-grid">

            {insights.map((card, i) => (

              <ReportInsightCard key={i} tone={card.tone} title={card.title} body={card.body} />

            ))}

          </div>

          <div className="report-spacer-lg" />

        </>

      ) : null}



      {usePrintNative ? (

        <PageBreakAvoid>

          <ReportChapterPrintBody chapter={chapter} diagnostic={diagnostic} />

        </PageBreakAvoid>

      ) : (

        chapter.chartViews.map((view) => (

          <div key={view} className="report-spacer-lg">

            <ReportChartExhibit>

              <DiagnosticReportChartSection

                reportView={view}

                companyId={companyId}

                companies={companies}

                currency={diagnostic.currency}

                referenceYear={diagnostic.reference_period.calendar_year}

                referenceMonth={diagnostic.reference_period.calendar_month}

              />

            </ReportChartExhibit>

          </div>

        ))

      )}



      {chapter.id === "expenses" && chapter.chartViews.includes("expenses") ? (

        <div className="report-spacer-lg">

          <PageBreakAvoid>

            <ReportChartExhibit title="Structure des dépenses">

              <DiagnosticReportChartSection

                reportView="expenses"

                companyId={companyId}

                companies={companies}

                currency={diagnostic.currency}

                referenceYear={diagnostic.reference_period.calendar_year}

                referenceMonth={diagnostic.reference_period.calendar_month}

              />

            </ReportChartExhibit>

          </PageBreakAvoid>

        </div>

      ) : null}



      <div className="report-spacer-lg" />

      <ReportObservations items={observations} />

      <div className="report-spacer-lg" />

      <PageBreakAvoid>

        <ReportTrendTable diagnostic={diagnostic} chapterId={chapter.id} hideEmptyYears />

      </PageBreakAvoid>

      <div className="report-spacer-lg" />

      <ReportKeyTakeaways items={takeaways} />

      <div className="report-spacer-md" />

      <ReportPointsCles items={pointsCles} />

    </div>

  )

}


