"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { AlertCircle, Building2 } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { useCompanies } from "@/hooks/use-companies"
import { useCompanyDiagnostic } from "@/hooks/use-company-diagnostic"
import { DiagnosticSkeleton } from "@/components/diagnostic/diagnostic-skeleton"
import { buildSignals } from "@/lib/diagnostic-derive"
import { DiagnosticHero } from "@/components/diagnostic/v2/diagnostic-hero"
import { DiagnosticKpiStrip } from "@/components/diagnostic/v2/diagnostic-kpi-strip"
import {
  DiagnosticNavRail,
  type DiagnosticReportView,
} from "@/components/diagnostic/v2/diagnostic-nav-rail"
import { DiagnosticCard } from "@/components/diagnostic/v2/diagnostic-card"
import {
  DiagnosticReportChartSection,
  DIAGNOSTIC_REPORT_ANCHOR_ID,
} from "@/components/diagnostic/v2/diagnostic-trajectory-statement-chart"
import {
  DiagnosticExecutiveSummary,
  DIAGNOSTIC_SUMMARY_ANCHOR_ID,
} from "@/components/diagnostic/v2/diagnostic-executive-summary"
import { DiagnosticSeasonalityHeatmap } from "@/components/diagnostic/v2/diagnostic-seasonality-heatmap"
import { DiagnosticDivisionsQuadrant } from "@/components/diagnostic/v2/diagnostic-divisions-quadrant"
import { DiagnosticBenchmarkRadar } from "@/components/diagnostic/v2/diagnostic-benchmark-radar"
import { DiagnosticRatiosGrid } from "@/components/diagnostic/v2/diagnostic-ratios-grid"
import { DiagnosticProductsSection } from "@/components/diagnostic/v2/diagnostic-products-section"
import { DiagnosticValuationSection } from "@/components/diagnostic/v2/diagnostic-valuation-section"
import { DiagnosticDrilldownDrawer } from "@/components/diagnostic/v2/diagnostic-drilldown-drawer"
import type { DrillDownRequest } from "@/components/diagnostic/v2/types"
import { PAGE_CLASS } from "@/lib/diagnostic-theme"
import { touchDiagnostic } from "@/lib/diagnostic-registry"

const REPORT_VIEWS = [
  { id: "sommaire" as const, label: "Sommaire" },
  { id: "performance" as const, label: "Performance financière" },
  { id: "revenue" as const, label: "Revenus" },
  { id: "margin-by-revenue" as const, label: "Marge par Revenus" },
  { id: "expenses" as const, label: "Dépenses" },
  { id: "expenses-by-division" as const, label: "Divisions" },
  { id: "financial-position" as const, label: "Situation financière" },
  { id: "working-capital" as const, label: "Fonds de roulement" },
  { id: "capex" as const, label: "Capex" },
]

const SCROLL_SECTIONS = [
  { id: "diag-saisonnalite", label: "Saisonnalité" },
  { id: "diag-divisions", label: "Divisions" },
  { id: "diag-profil", label: "Profil vs secteur" },
  { id: "diag-ratios", label: "Ratios financiers" },
  { id: "diag-produits", label: "Offre" },
  { id: "diag-valorisation", label: "Valorisation" },
]

interface DiagnosticReportPageProps {
  diagnosticId: string
  companyId: string
  referenceYear: number
  referenceMonth: number
}

export function DiagnosticReportPage({
  diagnosticId,
  companyId,
  referenceYear,
  referenceMonth,
}: DiagnosticReportPageProps) {
  const { companies, loading: companiesLoading } = useCompanies()
  const [drillDown, setDrillDown] = useState<DrillDownRequest | null>(null)
  const [reportView, setReportView] = useState<DiagnosticReportView>("sommaire")

  const { data, loading, error, reload } = useCompanyDiagnostic(companyId, {
    referenceYear,
    referenceMonth,
  })

  useEffect(() => {
    touchDiagnostic(diagnosticId)
  }, [diagnosticId])

  const signals = useMemo(() => (data ? buildSignals(data) : []), [data])
  const signalFor = (section: string) => {
    const s = signals.find((x) => x.section === section)
    return s ? { tone: s.tone, text: s.text } : null
  }

  const trends = useMemo(() => {
    if (!data) return []
    return [...data.trends].sort((a, b) => a.fiscal_year - b.fiscal_year)
  }, [data])

  return (
    <div className={PAGE_CLASS}>
      <DashboardHeader title="Modelisys" />

      <main className="relative">
        <DiagnosticHero
          companyId={companyId}
          diagnosticId={diagnosticId}
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
                  reportViews={REPORT_VIEWS}
                  activeReportView={reportView}
                  onReportViewChange={setReportView}
                  reportAnchorId={DIAGNOSTIC_REPORT_ANCHOR_ID}
                  summaryAnchorId={DIAGNOSTIC_SUMMARY_ANCHOR_ID}
                  sections={SCROLL_SECTIONS}
                  signalCount={signals.filter((s) => s.tone !== "ok").length}
                  signalSummary={signals
                    .filter((s) => s.tone !== "ok")
                    .map((s) => s.section)
                    .join(", ")}
                />
              </div>

              <div className="flex min-w-0 flex-col gap-4 px-6 pb-10 pt-5">
                {reportView === "sommaire" ? (
                  <DiagnosticExecutiveSummary
                    diagnostic={data}
                    onNavigateToView={(view) => {
                      setReportView(view)
                      requestAnimationFrame(() => {
                        document
                          .getElementById(DIAGNOSTIC_REPORT_ANCHOR_ID)
                          ?.scrollIntoView({ behavior: "smooth", block: "start" })
                      })
                    }}
                  />
                ) : (
                  <DiagnosticReportChartSection
                    reportView={reportView}
                    companyId={companyId}
                    companies={companies}
                    currency={data.currency}
                    referenceYear={data.reference_period.calendar_year}
                    referenceMonth={data.reference_period.calendar_month}
                    signal={signalFor("trajectoire")}
                  />
                )}

                <div className="grid gap-4 xl:grid-cols-2">
                  <DiagnosticCard
                    id="diag-saisonnalite"
                    title="Saisonnalité"
                    subtitle="Part du chiffre d'affaires annuel par mois"
                    detailHref="/analysis/seasonality"
                    signal={signalFor("saisonnalite")}
                    bodyClassName="px-[18px] py-4"
                  >
                    <DiagnosticSeasonalityHeatmap
                      seasonality={data.seasonality}
                      currency={data.currency}
                    />
                  </DiagnosticCard>

                  <DiagnosticCard
                    id="diag-profil"
                    title="Profil vs secteur"
                    subtitle="Les cinq piliers de l'indice de santé, comparés à la médiane"
                    bodyClassName="p-0"
                  >
                    <DiagnosticBenchmarkRadar diagnostic={data} />
                  </DiagnosticCard>
                </div>

                <DiagnosticCard
                  id="diag-divisions"
                  title="Rentabilité par division"
                  subtitle="Croissance × marge × poids — cliquez une bulle ou une ligne pour ouvrir le détail"
                  signal={signalFor("divisions")}
                  bodyClassName="p-0"
                >
                  <DiagnosticDivisionsQuadrant
                    divisions={data.divisions}
                    currency={data.currency}
                    onDrillDown={setDrillDown}
                  />
                </DiagnosticCard>

                <DiagnosticCard
                  id="diag-ratios"
                  title="Ratios financiers"
                  subtitle="Pastille verte = au-dessus du repère sectoriel"
                  detailHref="/analysis/ratios"
                  signal={signalFor("ratios")}
                  bodyClassName="p-0 pt-1"
                >
                  <DiagnosticRatiosGrid trends={trends} />
                </DiagnosticCard>

                <DiagnosticCard
                  id="diag-produits"
                  title="Revenus et marges par produits / services"
                  subtitle="Mix de revenus — les lignes rouges détruisent de la marge"
                  detailHref="/analysis/product-margin"
                  signal={signalFor("produits")}
                  bodyClassName="p-0"
                >
                  <DiagnosticProductsSection
                    products={data.products}
                    currency={data.currency}
                    onDrillDown={setDrillDown}
                  />
                </DiagnosticCard>

                <DiagnosticCard
                  id="diag-valorisation"
                  title="Valorisation indicative"
                  subtitle="Approche par multiple d'EBITDA"
                  detailHref="/evaluation/ebitda-multiple"
                  bodyClassName="p-0"
                >
                  <DiagnosticValuationSection
                    valuation={data.valuation}
                    notes={data.notes}
                    currency={data.currency}
                  />
                </DiagnosticCard>
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
