"use client"

import type { Company } from "@/components/entity-selector"
import type { CompanyDiagnostic } from "@/lib/api"
import { reportAnalysisSectionNumber } from "@/lib/diagnostic-report-chapters"
import { useDiagnosticReportSlotBundles } from "@/hooks/use-diagnostic-report-slot-bundles"
import { ReportLecturePages } from "@/components/diagnostic/report/report-lecture-pages"
import { ReportChartPages } from "@/components/diagnostic/report/report-chart-pages"
import { ReportAnalysisIntroPage } from "@/components/diagnostic/report/report-analysis-intro-page"
import {
  companyReportAnalysisNumberOffset,
  companyReportPrintAnalyses,
  type CompanyReportModuleId,
} from "@/lib/company-report-module"

interface ReportAnalysisPrintProps {
  diagnostic: CompanyDiagnostic
  companyId: string
  companies: Company[]
  referenceLabel: string
  sectionMeta: string
  moduleId?: CompanyReportModuleId
  reportId?: string
}

/** Pages introduction + graphique + lecture pour chaque analyse (Performance → Capex). */
export function ReportAnalysisPrint({
  diagnostic,
  companyId,
  companies,
  referenceLabel,
  sectionMeta,
  moduleId = "diagnostic",
  reportId,
}: ReportAnalysisPrintProps) {
  const { bundleForView } = useDiagnosticReportSlotBundles(companyId)
  const analysisNumberOffset = companyReportAnalysisNumberOffset(moduleId)
  const printAnalyses = companyReportPrintAnalyses(moduleId)

  return (
    <>
      {printAnalyses.map((analysis, analysisIndex) => {
        const slotBundle = bundleForView(analysis.viewId)
        const sectionNumber = reportAnalysisSectionNumber(analysisIndex, analysisNumberOffset)

        return (
          <div key={`${analysis.viewId}-${analysisIndex}`} className="report-analysis-group">
            <ReportAnalysisIntroPage
              analysis={analysis}
              analysisNumber={analysisIndex + analysisNumberOffset}
              companyName={diagnostic.company_name}
              moduleId={moduleId}
            />

            <ReportChartPages
              analysis={analysis}
              sectionNumber={sectionNumber}
              diagnostic={diagnostic}
              companyId={companyId}
              companies={companies}
              sectionMeta={sectionMeta}
              slotBundle={slotBundle}
              isFirstAnalysis={false}
              moduleId={moduleId}
            />

            <ReportLecturePages
              analysis={analysis}
              sectionNumber={sectionNumber}
              diagnostic={diagnostic}
              companyId={companyId}
              companies={companies}
              sectionMeta={sectionMeta}
              slotBundle={slotBundle}
              moduleId={moduleId}
              reportId={reportId}
            />
          </div>
        )
      })}
    </>
  )
}
