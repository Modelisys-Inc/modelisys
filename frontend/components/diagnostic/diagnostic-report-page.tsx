"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { AlertCircle, Building2 } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { useCompanies } from "@/hooks/use-companies"
import { useCompanyDiagnostic } from "@/hooks/use-company-diagnostic"
import { DiagnosticSkeleton } from "@/components/diagnostic/diagnostic-skeleton"
import { DiagnosticHero } from "@/components/diagnostic/v2/diagnostic-hero"
import { DiagnosticKpiStrip } from "@/components/diagnostic/v2/diagnostic-kpi-strip"
import {
  DiagnosticNavRail,
  type DiagnosticReportView,
} from "@/components/diagnostic/v2/diagnostic-nav-rail"
import {
  DiagnosticReportChartSection,
  DIAGNOSTIC_REPORT_ANCHOR_ID,
} from "@/components/diagnostic/v2/diagnostic-trajectory-statement-chart"
import { DiagnosticCompanyOverviewSection } from "@/components/diagnostic/v2/diagnostic-company-overview-section"
import { DiagnosticDrilldownDrawer } from "@/components/diagnostic/v2/diagnostic-drilldown-drawer"
import type { DrillDownRequest } from "@/components/diagnostic/v2/types"
import { PAGE_CLASS } from "@/lib/diagnostic-theme"
import { touchCompanyReport } from "@/lib/company-report-registry"
import {
  companyReportExcludedViewIds,
  type CompanyReportModuleId,
} from "@/lib/company-report-module"
import { diagnosticReportViewLabel } from "@/lib/diagnostic-report-chapters"

const REPORT_VIEW_IDS = [
  "company-overview",
  "performance",
  "revenue",
  "margin-by-revenue",
  "expenses",
  "expenses-by-division",
  "financial-position",
  "working-capital",
  "capex",
] as const satisfies readonly DiagnosticReportView[]

function buildReportViews(moduleId: CompanyReportModuleId) {
  const excluded = new Set(companyReportExcludedViewIds(moduleId))
  return REPORT_VIEW_IDS.filter((id) => !excluded.has(id)).map((id) => ({
    id,
    label: diagnosticReportViewLabel(id),
  }))
}

interface DiagnosticReportPageProps {
  reportId: string
  companyId: string
  referenceYear: number
  referenceMonth: number
  moduleId?: CompanyReportModuleId
}

export function DiagnosticReportPage({
  reportId,
  companyId,
  referenceYear,
  referenceMonth,
  moduleId = "diagnostic",
}: DiagnosticReportPageProps) {
  const { companies, loading: companiesLoading } = useCompanies()
  const [drillDown, setDrillDown] = useState<DrillDownRequest | null>(null)
  const [reportView, setReportView] = useState<DiagnosticReportView>("performance")

  const { data, loading, error, reload } = useCompanyDiagnostic(companyId, {
    referenceYear,
    referenceMonth,
  })
  const reportViews = useMemo(() => buildReportViews(moduleId), [moduleId])

  useEffect(() => {
    touchCompanyReport(moduleId, reportId)
  }, [moduleId, reportId])

  return (
    <div className={PAGE_CLASS}>
      <DashboardHeader title="Modelisys" />

      <main className="relative">
        <DiagnosticHero
          companyId={companyId}
          reportId={reportId}
          moduleId={moduleId}
          diagnostic={data}
          loading={companiesLoading || loading}
        />

        {!companiesLoading && companies.length === 0 && (
          <EmptyState message="Aucune société disponible. Créez d'abord une société dans la configuration pour générer un diagnostic." />
        )}

        {(companiesLoading || loading) && !error && !data && (
          <div className="px-6 py-10">
            <DiagnosticSkeleton />
          </div>
        )}

        {error && !loading && (
          <div
            data-testid="diagnostic-error"
            className="mx-auto my-16 flex max-w-lg flex-col items-center rounded-2xl border border-red-200 bg-white px-8 py-16 text-center shadow-sm"
          >
            <AlertCircle className="mb-3 h-10 w-10 text-red-600" aria-hidden />
            <p className="text-sm font-medium text-[#2A2F3A]">Impossible de charger le diagnostic.</p>
            <p className="mt-1 max-w-md text-xs text-slate-500">{error}</p>
            <Button onClick={reload} className="mt-4 bg-[#E0742D] text-white hover:bg-[#c96526]">
              Réessayer
            </Button>
          </div>
        )}

        {data && !loading && !error && (
          <div className="relative">
            <DiagnosticKpiStrip diagnostic={data} onDrillDown={setDrillDown} />

            <div className="grid items-start xl:grid-cols-[210px_1fr]">
              <div className="hidden xl:block">
                <DiagnosticNavRail
                  reportViews={reportViews}
                  activeReportView={reportView}
                  onReportViewChange={setReportView}
                  reportAnchorId={DIAGNOSTIC_REPORT_ANCHOR_ID}
                  sections={[]}
                />
              </div>

              <div className="flex min-w-0 flex-col gap-4 px-6 pb-10 pt-5">
                {reportView === "company-overview" ? (
                  <DiagnosticCompanyOverviewSection
                    diagnosticId={reportId}
                    companyName={data.company_name}
                  />
                ) : (
                  <DiagnosticReportChartSection
                    moduleId={moduleId}
                    reportView={reportView}
                    companyId={companyId}
                    companies={companies}
                    currency={data.currency}
                    referenceYear={data.reference_period.calendar_year}
                    referenceMonth={data.reference_period.calendar_month}
                  />
                )}
              </div>
            </div>

            <DiagnosticDrilldownDrawer request={drillDown} onClose={() => setDrillDown(null)} />
          </div>
        )}
      </main>
    </div>
  )
}

function EmptyState({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <div className="mx-auto my-16 flex max-w-lg flex-col items-center rounded-2xl border border-slate-200 bg-white px-8 py-16 text-center shadow-sm">
      <Building2 className="mb-3 h-10 w-10 text-slate-300" aria-hidden />
      <p className="text-sm text-slate-600">{message}</p>
      {children}
    </div>
  )
}
