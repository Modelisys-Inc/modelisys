"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Building2 } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCompanies } from "@/hooks/use-companies"
import { useCompanyDiagnostic } from "@/hooks/use-company-diagnostic"
import { DiagnosticSkeleton } from "@/components/diagnostic/diagnostic-skeleton"
import { buildSignals } from "@/lib/diagnostic-derive"
import { DiagnosticHero, type DiagnosticPeriod } from "@/components/diagnostic/v2/diagnostic-hero"
import { DiagnosticKpiStrip } from "@/components/diagnostic/v2/diagnostic-kpi-strip"
import { DiagnosticNavRail } from "@/components/diagnostic/v2/diagnostic-nav-rail"
import { DiagnosticCard, LegendChip } from "@/components/diagnostic/v2/diagnostic-card"
import { DiagnosticTrajectoryChart } from "@/components/diagnostic/v2/diagnostic-trajectory-chart"
import { DiagnosticSeasonalityHeatmap } from "@/components/diagnostic/v2/diagnostic-seasonality-heatmap"
import { DiagnosticDivisionsQuadrant } from "@/components/diagnostic/v2/diagnostic-divisions-quadrant"
import { DiagnosticBenchmarkRadar } from "@/components/diagnostic/v2/diagnostic-benchmark-radar"
import { DiagnosticRatiosGrid } from "@/components/diagnostic/v2/diagnostic-ratios-grid"
import { DiagnosticProductsSection } from "@/components/diagnostic/v2/diagnostic-products-section"
import { DiagnosticValuationSection } from "@/components/diagnostic/v2/diagnostic-valuation-section"
import { DiagnosticDrilldownDrawer } from "@/components/diagnostic/v2/diagnostic-drilldown-drawer"
import type { DrillDownRequest } from "@/components/diagnostic/v2/types"

const SECTIONS = [
  { id: "diag-trajectoire", label: "Trajectoire" },
  { id: "diag-saisonnalite", label: "Saisonnalité" },
  { id: "diag-divisions", label: "Divisions" },
  { id: "diag-profil", label: "Profil vs secteur" },
  { id: "diag-ratios", label: "Ratios financiers" },
  { id: "diag-produits", label: "Offre" },
  { id: "diag-valorisation", label: "Valorisation" },
]

export default function DiagnosticModulePage() {
  const { companies, loading: companiesLoading } = useCompanies()
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [period, setPeriod] = useState<DiagnosticPeriod>("5A")
  const [divisionId, setDivisionId] = useState<string | null>(null)
  const [drillDown, setDrillDown] = useState<DrillDownRequest | null>(null)

  useEffect(() => {
    if (!selectedCompanyId && companies.length > 0) setSelectedCompanyId(companies[0].id)
  }, [companies, selectedCompanyId])

  const { data, loading, error, reload } = useCompanyDiagnostic(selectedCompanyId)

  const signals = useMemo(() => (data ? buildSignals(data) : []), [data])
  const signalFor = (section: string) => {
    const s = signals.find((x) => x.section === section)
    return s ? { tone: s.tone, text: s.text } : null
  }

  const trends = useMemo(() => {
    if (!data) return []
    const sorted = [...data.trends].sort((a, b) => a.fiscal_year - b.fiscal_year)
    return period === "3A" ? sorted.slice(-3) : sorted
  }, [data, period])

  const selectedDivision = data?.divisions.find((d) => d.division_id === divisionId) ?? null
  const divisionScale = selectedDivision ? (selectedDivision.revenue_share_pct ?? 100) / 100 : 1

  const companySelector = companies.length > 0 && (
    <Select
      value={selectedCompanyId || ""}
      onValueChange={(value) => {
        setSelectedCompanyId(value || null)
        setDivisionId(null)
        setDrillDown(null)
      }}
    >
      <SelectTrigger
        aria-label="Société"
        className="h-[30px] w-[220px] rounded-[9px] border-0 bg-black/[.28] text-[11px] font-semibold text-[rgba(201,184,165,.85)] shadow-[inset_0_0_0_1px_rgba(230,214,195,.09)] hover:text-[#E6D6C3] focus:ring-2 focus:ring-[#E0742D]/35"
      >
        <SelectValue placeholder="Sélectionner une société" />
      </SelectTrigger>
      <SelectContent>
        {companies.map((company) => (
          <SelectItem key={company.id} value={company.id}>
            {company.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <div className="min-h-screen bg-[#14171D]">
      <DashboardHeader title="Modelisys" />

      <main className="relative">
        {/* Sélecteur de société toujours accessible tant que le rapport (qui l'intègre) n'est pas rendu. */}
        {!(data && !loading && !error) && companies.length > 0 && (
          <div className="flex justify-end px-7 pt-4">{companySelector}</div>
        )}

        {!companiesLoading && companies.length === 0 && (
          <EmptyState message="Aucune société disponible. Créez d'abord une société dans la configuration pour générer un diagnostic." />
        )}

        {companies.length > 0 && !selectedCompanyId && (
          <EmptyState message="Sélectionnez une société pour générer le diagnostic." />
        )}

        {(companiesLoading || loading) && !error && !data && (
          <div className="px-6 py-10">
            <DiagnosticSkeleton />
          </div>
        )}

        {error && !loading && (
          <div
            data-testid="diagnostic-error"
            className="mx-auto my-16 flex max-w-lg flex-col items-center rounded-2xl bg-[#1A1E26] px-8 py-16 text-center shadow-[inset_0_0_0_1px_rgba(241,106,92,.3)]"
          >
            <AlertCircle className="mb-3 h-10 w-10 text-[#F16A5C]" aria-hidden />
            <p className="text-sm font-medium text-[#E6D6C3]">Impossible de charger le diagnostic.</p>
            <p className="mt-1 max-w-md text-xs text-[rgba(201,184,165,.6)]">{error}</p>
            <Button onClick={reload} className="mt-4 bg-[#E0742D] text-[#14171D] hover:bg-[#F08F4F]">
              Réessayer
            </Button>
          </div>
        )}

        {data && !loading && !error && (
          <div className="relative">
            <DiagnosticHero
              diagnostic={data}
              period={period}
              onPeriodChange={setPeriod}
              divisionId={divisionId}
              onDivisionChange={setDivisionId}
              companySelector={companySelector}
            />

            <DiagnosticKpiStrip diagnostic={data} onDrillDown={setDrillDown} />

            <div className="grid items-start xl:grid-cols-[210px_1fr]">
              <div className="hidden xl:block">
                <DiagnosticNavRail
                  sections={SECTIONS}
                  signalCount={signals.filter((s) => s.tone !== "ok").length}
                  signalSummary={signals
                    .filter((s) => s.tone !== "ok")
                    .map((s) => s.section)
                    .join(", ")}
                />
              </div>

              <div className="flex min-w-0 flex-col gap-4 px-6 pb-10 pt-5">
                <DiagnosticCard
                  id="diag-trajectoire"
                  title="Trajectoire"
                  subtitle={
                    selectedDivision
                      ? `Chiffre d'affaires, EBITDA et marges — ${period === "3A" ? "3" : "5"} derniers exercices · ${selectedDivision.division_name} : approximation par la part du CA du dernier exercice`
                      : `Chiffre d'affaires, EBITDA et marges — ${period === "3A" ? "3" : "5"} derniers exercices`
                  }
                  signal={signalFor("trajectoire")}
                  legend={
                    <span className="hidden items-center gap-3 lg:flex">
                      <LegendChip label="Chiffre d'affaires" color="linear-gradient(#3FE0A8,#0F8F68)" />
                      <LegendChip label="EBITDA" color="#E0742D" />
                      <LegendChip label="Marge EBITDA" color="#F5B544" variant="line" />
                      <LegendChip label="Marge nette" color="#8FA3BF" variant="line" />
                    </span>
                  }
                >
                  <DiagnosticTrajectoryChart
                    trends={trends}
                    currency={data.currency}
                    scale={divisionScale}
                    onDrillDown={setDrillDown}
                  />
                </DiagnosticCard>

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
                    selectedDivisionId={divisionId}
                    onSelectDivision={setDivisionId}
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mx-auto my-16 flex max-w-lg flex-col items-center rounded-2xl bg-[#1A1E26] px-8 py-16 text-center shadow-[inset_0_0_0_1px_rgba(230,214,195,.09)]">
      <Building2 className="mb-3 h-10 w-10 text-[rgba(201,184,165,.35)]" aria-hidden />
      <p className="text-sm text-[rgba(201,184,165,.7)]">{message}</p>
    </div>
  )
}
