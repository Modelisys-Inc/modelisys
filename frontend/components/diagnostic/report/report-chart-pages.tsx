"use client"

import { useEffect, useState } from "react"
import type { Company } from "@/components/entity-selector"
import type { CompanyDiagnostic } from "@/lib/api"
import type { ReportPrintAnalysis } from "@/lib/diagnostic-report-chapters"
import { reportAnalysisAnchorId, reportAnalysisDisplayTitle } from "@/lib/diagnostic-report-chapters"
import { DiagnosticReportChartSection } from "@/components/diagnostic/v2/diagnostic-trajectory-statement-chart"
import { DiagnosticReportSectionPage } from "@/components/diagnostic/diagnostic-report-section-page"
import type { DiagnosticReportSlotBundle } from "@/hooks/use-diagnostic-report-slot-bundles"
import {
  chartPartTitleSuffix,
  chartPartsForAnalysis,
  type ReportPrintChartPart,
} from "@/lib/report-narrative-pagination"
import { cn } from "@/lib/utils"

interface ReportChartPagesProps {
  analysis: ReportPrintAnalysis
  sectionNumber: string
  diagnostic: CompanyDiagnostic
  companyId: string
  companies: Company[]
  sectionMeta: string
  slotBundle: DiagnosticReportSlotBundle | null
  isFirstAnalysis: boolean
}

function chartPartAnchorId(viewId: string, part: ReportPrintChartPart, partIndex: number): string {
  if (partIndex === 0) return reportAnalysisAnchorId(viewId, "chart")
  return `${reportAnalysisAnchorId(viewId, "chart")}-${part}`
}

/** Une ou plusieurs pages graphiques par analyse (ex. Dépenses + seuil de rentabilité). */
export function ReportChartPages({
  analysis,
  sectionNumber,
  diagnostic,
  companyId,
  companies,
  sectionMeta,
  slotBundle,
  isFirstAnalysis,
}: ReportChartPagesProps) {
  const configuredParts = chartPartsForAnalysis(analysis.viewId)
  const [pageCount, setPageCount] = useState(configuredParts.length)

  useEffect(() => {
    setPageCount(configuredParts.length)
  }, [analysis.viewId, configuredParts.length])

  const analysisTitle = reportAnalysisDisplayTitle(analysis)

  return (
    <>
      {configuredParts.slice(0, pageCount).map((part, partIndex) => {
        const chartTitle = `${analysisTitle}${chartPartTitleSuffix(part)}`
        const pageId = chartPartAnchorId(analysis.viewId, part, partIndex)

        return (
          <DiagnosticReportSectionPage
            key={`${analysis.viewId}-chart-${part}`}
            id={pageId}
            sectionNumber={sectionNumber}
            sectionTitle={analysisTitle}
            companyName={diagnostic.company_name}
            sectionMeta={sectionMeta}
            isFirstContentSection={isFirstAnalysis && partIndex === 0}
            className={cn(
              "print-chapter-chart",
              part === "breakeven" && "print-chapter-chart-breakeven",
            )}
          >
            <div
              className={cn(
                "report-chart-page",
              )}
              data-testid={
                partIndex === 0
                  ? `report-chart-page-${analysis.viewId}`
                  : `report-chart-page-${analysis.viewId}-${part}`
              }
            >
              <div className="report-chart-intro report-avoid-break">
                <p className="report-chart-intro-kicker">Graphique</p>
                <h2 className="report-chart-intro-title">{chartTitle}</h2>
                <p className="report-chart-intro-desc">{analysis.intro.subtitle}</p>
              </div>
              <div className="report-chart-content">
                <DiagnosticReportChartSection
                reportView={analysis.viewId}
                companyId={companyId}
                companies={companies}
                currency={diagnostic.currency}
                referenceYear={diagnostic.reference_period.calendar_year}
                referenceMonth={diagnostic.reference_period.calendar_month}
                printSegment="chart"
                printChartPart={part}
                slotBundle={slotBundle}
                onPrintChartPageCount={partIndex === 0 ? setPageCount : undefined}
              />
              </div>
            </div>
          </DiagnosticReportSectionPage>
        )
      })}
    </>
  )
}
