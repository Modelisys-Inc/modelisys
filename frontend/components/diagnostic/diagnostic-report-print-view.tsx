"use client"

import type { Company } from "@/components/entity-selector"
import type { CompanyDiagnostic } from "@/lib/api"
import { buildExecutiveSummary } from "@/lib/diagnostic-executive-summary"
import {
  DIAGNOSTIC_REPORT_CHAPTERS,
  reportChapterAnchorId,
} from "@/lib/diagnostic-report-chapters"
import { DiagnosticReportCoverPage } from "@/components/diagnostic/diagnostic-report-cover-page"
import { DiagnosticReportTableOfContents } from "@/components/diagnostic/diagnostic-report-table-of-contents"
import { DiagnosticReportSectionPage } from "@/components/diagnostic/diagnostic-report-section-page"
import { ReportChapterIntroPage } from "@/components/diagnostic/report/report-primitives"
import { ReportChapterContent } from "@/components/diagnostic/report/report-chapter-content"
import { formatReferencePeriod } from "@/components/diagnostic/diagnostic-format"
import "@/components/diagnostic/diagnostic-report-print.css"

interface DiagnosticReportPrintViewProps {
  diagnostic: CompanyDiagnostic
  companyId: string
  companies: Company[]
}

export function DiagnosticReportPrintView({
  diagnostic,
  companyId,
  companies,
}: DiagnosticReportPrintViewProps) {
  const summary = buildExecutiveSummary(diagnostic)
  const referenceLabel = formatReferencePeriod(
    diagnostic.reference_period.calendar_year,
    diagnostic.reference_period.calendar_month,
  )

  const blockById = Object.fromEntries(summary.blocks.map((b) => [b.id, b]))

  return (
    <div
      data-testid="diagnostic-report-print"
      className="diagnostic-report-print-root report-consulting report-orientation-landscape"
    >
      <DiagnosticReportCoverPage diagnostic={diagnostic} />
      <DiagnosticReportTableOfContents diagnostic={diagnostic} />

      <div className="print-report-body">
        {DIAGNOSTIC_REPORT_CHAPTERS.map((chapter) => {
          const blocks = chapter.executiveBlockIds
            .map((id) => blockById[id])
            .filter(Boolean)
          const anchorId = reportChapterAnchorId(chapter.id)
          const sectionNumber =
            chapter.id === "executive-global"
              ? "—"
              : String(chapter.number).padStart(2, "0")

          return (
            <div key={chapter.id} className="report-chapter-group">
              {chapter.introPage ? (
                <ReportChapterIntroPage
                  number={chapter.number}
                  title={chapter.title}
                  subtitle={chapter.subtitle}
                  description={chapter.description}
                  icon={chapter.icon}
                />
              ) : null}

              <DiagnosticReportSectionPage
                id={anchorId}
                sectionNumber={sectionNumber}
                sectionTitle={chapter.title}
                companyName={diagnostic.company_name}
                referenceLabel={referenceLabel}
                fiscalYear={diagnostic.latest_fiscal_year}
                currency={diagnostic.currency}
                isFirstContentSection={chapter.id === "executive-global"}
                className="print-chapter-content"
              >
                <ReportChapterContent
                  chapter={chapter}
                  diagnostic={diagnostic}
                  companyId={companyId}
                  companies={companies}
                  blocks={blocks}
                />
              </DiagnosticReportSectionPage>
            </div>
          )
        })}
      </div>
    </div>
  )
}
