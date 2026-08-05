"use client"

import type { ReportPrintAnalysis } from "@/lib/diagnostic-report-chapters"
import {
  reportAnalysisAnchorId,
  reportAnalysisDisplayTitle,
} from "@/lib/diagnostic-report-chapters"
import { ReportChapterIntroPage } from "@/components/diagnostic/report/report-primitives"

interface ReportAnalysisIntroPageProps {
  analysis: ReportPrintAnalysis
  analysisNumber: number
  companyName: string
}

/** Page d'introduction avant le graphique et la lecture d'une analyse. */
export function ReportAnalysisIntroPage({
  analysis,
  analysisNumber,
  companyName,
}: ReportAnalysisIntroPageProps) {
  return (
    <ReportChapterIntroPage
      id={reportAnalysisAnchorId(analysis.viewId, "intro")}
      analysisNumber={analysisNumber}
      title={reportAnalysisDisplayTitle(analysis)}
      subtitle={analysis.intro.subtitle}
      description={analysis.intro.description}
      companyName={companyName}
      testId={`report-analysis-intro-${analysis.viewId}`}
    />
  )
}
