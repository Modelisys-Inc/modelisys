"use client"

import type { Company } from "@/components/entity-selector"
import type { CompanyDiagnostic } from "@/lib/api"
import { DiagnosticReportCoverPage } from "@/components/diagnostic/diagnostic-report-cover-page"
import { DiagnosticReportTableOfContents } from "@/components/diagnostic/diagnostic-report-table-of-contents"
import { ReportAnalysisPrint } from "@/components/diagnostic/report/report-analysis-print"
import { ReportLayout } from "@/components/diagnostic/report/report-layout"
import { formatReferencePeriod, formatReportSectionMeta } from "@/components/diagnostic/diagnostic-format"
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
  const referenceLabel = formatReferencePeriod(
    diagnostic.reference_period.calendar_year,
    diagnostic.reference_period.calendar_month,
  )
  const sectionMeta = formatReportSectionMeta(
    diagnostic.company_name,
    diagnostic.reference_period.calendar_year,
    diagnostic.reference_period.calendar_month,
    diagnostic.currency,
  )

  return (
    <ReportLayout
      data-testid="diagnostic-report-print"
      className="diagnostic-report-print-root report-consulting report-orientation-landscape"
    >
      <DiagnosticReportCoverPage diagnostic={diagnostic} />
      <DiagnosticReportTableOfContents diagnostic={diagnostic} />

      <div className="print-report-body">
        <ReportAnalysisPrint
          diagnostic={diagnostic}
          companyId={companyId}
          companies={companies}
          referenceLabel={referenceLabel}
          sectionMeta={sectionMeta}
        />
      </div>
    </ReportLayout>
  )
}
