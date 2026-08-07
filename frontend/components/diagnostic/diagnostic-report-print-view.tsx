"use client"

import type { Company } from "@/components/entity-selector"
import type { CompanyDiagnostic } from "@/lib/api"
import { DiagnosticReportCoverPage } from "@/components/diagnostic/diagnostic-report-cover-page"
import { DiagnosticReportMandateScopePage } from "@/components/diagnostic/diagnostic-report-mandate-scope-page"
import { DiagnosticReportCompanyOverviewPage } from "@/components/diagnostic/diagnostic-report-company-overview-page"
import { DiagnosticReportTableOfContents } from "@/components/diagnostic/diagnostic-report-table-of-contents"
import { ReportAnalysisPrint } from "@/components/diagnostic/report/report-analysis-print"
import { ReportLayout } from "@/components/diagnostic/report/report-layout"
import { formatReferencePeriod, formatReportSectionMeta } from "@/components/diagnostic/diagnostic-format"
import { getCompanyOverview } from "@/lib/diagnostic-company-overview"
import {
  companyReportIncludesCompanyOverview,
  type CompanyReportModuleId,
} from "@/lib/company-report-module"
import "@/components/diagnostic/diagnostic-report-print.css"

interface DiagnosticReportPrintViewProps {
  diagnostic: CompanyDiagnostic
  companyId: string
  companies: Company[]
  diagnosticId: string
  moduleId?: CompanyReportModuleId
}

export function DiagnosticReportPrintView({
  diagnostic,
  companyId,
  companies,
  diagnosticId,
  moduleId = "diagnostic",
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
    moduleId,
  )
  const companyOverview = getCompanyOverview(diagnosticId, diagnostic.company_name)
  const showCompanyOverview = companyReportIncludesCompanyOverview(moduleId)

  return (
    <ReportLayout
      data-testid="diagnostic-report-print"
      className="diagnostic-report-print-root report-consulting report-orientation-landscape"
    >
      <DiagnosticReportCoverPage diagnostic={diagnostic} moduleId={moduleId} />
      <DiagnosticReportMandateScopePage diagnostic={diagnostic} moduleId={moduleId} />
      <DiagnosticReportTableOfContents diagnostic={diagnostic} moduleId={moduleId} />

      <div className="print-report-body">
        {showCompanyOverview ? (
          <DiagnosticReportCompanyOverviewPage
            diagnostic={diagnostic}
            overview={companyOverview}
          />
        ) : null}
        <ReportAnalysisPrint
          diagnostic={diagnostic}
          companyId={companyId}
          companies={companies}
          referenceLabel={referenceLabel}
          sectionMeta={sectionMeta}
          moduleId={moduleId}
        />
      </div>
    </ReportLayout>
  )
}
