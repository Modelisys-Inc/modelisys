"use client"

import type { Company } from "@/components/entity-selector"
import type { CompanyDiagnostic } from "@/lib/api"
import { DIAGNOSTIC_PRINT_ANALYSES } from "@/lib/diagnostic-report-chapters"
import { useDiagnosticReportSlotBundles } from "@/hooks/use-diagnostic-report-slot-bundles"
import { ReportLecturePages } from "@/components/diagnostic/report/report-lecture-pages"
import { ReportChartPages } from "@/components/diagnostic/report/report-chart-pages"
import { ReportAnalysisIntroPage } from "@/components/diagnostic/report/report-analysis-intro-page"

interface ReportAnalysisPrintProps {
  diagnostic: CompanyDiagnostic
  companyId: string
  companies: Company[]
  referenceLabel: string
  sectionMeta: string
}

/** Pages introduction + graphique + lecture pour chaque analyse (Performance → Capex). */
export function ReportAnalysisPrint({
  diagnostic,
  companyId,
  companies,
  referenceLabel,
  sectionMeta,
}: ReportAnalysisPrintProps) {
  const { bundleForView } = useDiagnosticReportSlotBundles(companyId)

  return (
    <>
      {DIAGNOSTIC_PRINT_ANALYSES.map((analysis, analysisIndex) => {
        const slotBundle = bundleForView(analysis.viewId)
        const sectionNumber = String(analysis.sectionNumber).padStart(2, "0")

        return (
          <div key={`${analysis.viewId}-${analysisIndex}`} className="report-analysis-group">
            <ReportAnalysisIntroPage
              analysis={analysis}
              diagnostic={diagnostic}
              referenceLabel={referenceLabel}
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
            />

            <ReportLecturePages
              analysis={analysis}
              sectionNumber={sectionNumber}
              diagnostic={diagnostic}
              companyId={companyId}
              companies={companies}
              sectionMeta={sectionMeta}
              slotBundle={slotBundle}
            />
          </div>
        )
      })}
    </>
  )
}
