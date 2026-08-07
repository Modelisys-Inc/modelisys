"use client"

import { useState, useEffect } from "react"
import type { Company } from "@/components/entity-selector"
import type { CompanyDiagnostic } from "@/lib/api"
import type { ReportPrintAnalysis } from "@/lib/diagnostic-report-chapters"
import { DiagnosticReportChartSection } from "@/components/diagnostic/v2/diagnostic-trajectory-statement-chart"
import {
  reportAnalysisAnchorId,
  reportAnalysisDisplayTitle,
} from "@/lib/diagnostic-report-chapters"
import { DiagnosticReportSectionPage } from "@/components/diagnostic/diagnostic-report-section-page"
import type { DiagnosticReportSlotBundle } from "@/hooks/use-diagnostic-report-slot-bundles"

import type { CompanyReportModuleId } from "@/lib/company-report-module"

interface ReportLecturePagesProps {
  analysis: ReportPrintAnalysis
  sectionNumber: string
  diagnostic: CompanyDiagnostic
  companyId: string
  companies: Company[]
  sectionMeta: string
  slotBundle: DiagnosticReportSlotBundle | null
  moduleId?: CompanyReportModuleId
}

/** Une ou plusieurs pages « Lecture » (pagination alignée aperçu / impression). */
export function ReportLecturePages({
  analysis,
  sectionNumber,
  diagnostic,
  companyId,
  companies,
  sectionMeta,
  slotBundle,
  moduleId = "diagnostic",
}: ReportLecturePagesProps) {
  const [pageCount, setPageCount] = useState(1)

  useEffect(() => {
    setPageCount(1)
  }, [analysis.viewId])

  const analysisTitle = reportAnalysisDisplayTitle(analysis)

  return (
    <>
      {Array.from({ length: pageCount }, (_, pageIdx) => {
        const isFirstPage = pageIdx === 0
        const pageTitle = analysisTitle
        const pageId = isFirstPage
          ? reportAnalysisAnchorId(analysis.viewId, "lecture")
          : `${reportAnalysisAnchorId(analysis.viewId, "lecture")}-${pageIdx + 1}`

        return (
          <DiagnosticReportSectionPage
            key={`${analysis.viewId}-lecture-${pageIdx}`}
            id={pageId}
            sectionNumber={sectionNumber}
            sectionTitle={pageTitle}
            companyName={diagnostic.company_name}
            sectionMeta={sectionMeta}
            isFirstContentSection={false}
            className="print-chapter-lecture"
          >
            <div
              className="report-lecture-page"
              data-testid={
                isFirstPage
                  ? `report-lecture-page-${analysis.viewId}`
                  : `report-lecture-page-${analysis.viewId}-${pageIdx + 1}`
              }
            >
              <DiagnosticReportChartSection
                moduleId={moduleId}
                reportView={analysis.viewId}
                companyId={companyId}
                companies={companies}
                currency={diagnostic.currency}
                referenceYear={diagnostic.reference_period.calendar_year}
                referenceMonth={diagnostic.reference_period.calendar_month}
                printSegment="narrative"
                slotBundle={slotBundle}
                narrativePageIndex={pageIdx}
                onNarrativePageCount={isFirstPage ? setPageCount : undefined}
              />
            </div>
          </DiagnosticReportSectionPage>
        )
      })}
    </>
  )
}
