"use client"

import type { CompanyDiagnostic } from "@/lib/api"
import type { ReportPrintAnalysis } from "@/lib/diagnostic-report-chapters"
import {
  reportAnalysisAnchorId,
  reportAnalysisIcon,
} from "@/lib/diagnostic-report-chapters"
import { ReportChapterIntroPage } from "@/components/diagnostic/report/report-primitives"

interface ReportAnalysisIntroPageProps {
  analysis: ReportPrintAnalysis
  diagnostic: CompanyDiagnostic
  referenceLabel: string
}

/** Page d'introduction avant le graphique et la lecture d'une analyse. */
export function ReportAnalysisIntroPage({
  analysis,
  diagnostic,
  referenceLabel,
}: ReportAnalysisIntroPageProps) {
  const Icon = reportAnalysisIcon(analysis.viewId)

  return (
    <ReportChapterIntroPage
      id={reportAnalysisAnchorId(analysis.viewId, "intro")}
      number={analysis.sectionNumber}
      title={analysis.intro.title}
      subtitle={analysis.intro.subtitle}
      description={analysis.intro.description}
      icon={Icon}
      testId={`report-analysis-intro-${analysis.viewId}`}
      footerMeta={`${diagnostic.company_name} · Réf. ${referenceLabel} · Exercice ${diagnostic.latest_fiscal_year}`}
    />
  )
}
