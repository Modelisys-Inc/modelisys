"use client"

import { useEffect, useState } from "react"
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
import { DiagnosticHeader } from "@/components/diagnostic/diagnostic-header"
import { DiagnosticKpiCards } from "@/components/diagnostic/diagnostic-kpi-cards"
import { DiagnosticTrendsChart } from "@/components/diagnostic/diagnostic-trends-chart"
import { DiagnosticSeasonalityChart } from "@/components/diagnostic/diagnostic-seasonality-chart"
import { DiagnosticDivisionsSection } from "@/components/diagnostic/diagnostic-divisions-section"
import { DiagnosticProductsSection } from "@/components/diagnostic/diagnostic-products-section"
import { DiagnosticRatiosTable } from "@/components/diagnostic/diagnostic-ratios-table"
import { DiagnosticCapexChart } from "@/components/diagnostic/diagnostic-capex-chart"
import { DiagnosticValuationSection } from "@/components/diagnostic/diagnostic-valuation-section"
import { DiagnosticSkeleton } from "@/components/diagnostic/diagnostic-skeleton"
import { DiagnosticSection } from "@/components/diagnostic/diagnostic-section"
import {
  capexNarrative,
  divisionsNarrative,
  ratiosNarrative,
  seasonalityNarrative,
  trendsNarrative,
  valuationNarrative,
} from "@/components/diagnostic/diagnostic-narrative"

export default function DiagnosticModulePage() {
  const { companies, loading: companiesLoading } = useCompanies()
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)

  // Pré-sélectionner la première société disponible.
  useEffect(() => {
    if (!selectedCompanyId && companies.length > 0) {
      setSelectedCompanyId(companies[0].id)
    }
  }, [companies, selectedCompanyId])

  const { data, loading, error, reload } = useCompanyDiagnostic(selectedCompanyId)

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />

      {/* Bandeau du module (même style que les pages modules) */}
      <div className="relative w-full overflow-hidden pt-15 pb-32">
        <div className="absolute inset-0 bg-[#2A2F3A]" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-28 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9B8A5]/80">
            Phase 1
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-4xl font-semibold tracking-tight text-[#E6D6C3]">Diagnostic</h1>
            <Select
              value={selectedCompanyId || ""}
              onValueChange={(value) => setSelectedCompanyId(value || null)}
            >
              <SelectTrigger
                aria-label="Société"
                className="h-9 w-[240px] border border-white/10 bg-[#2A2F3A]/55 text-xs text-[#C9B8A5] hover:bg-white/5 focus:ring-2 focus:ring-[#E0742D]/35"
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
          </div>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#C9B8A5]/90">
            Portrait complet de la société : tendances 5 ans, saisonnalité, marges, rentabilité par
            division, ratios financiers et valeur indicative — pour savoir en quelques secondes si
            elle est en croissance, à maturité ou en décroissance.
          </p>
        </div>
      </div>

      <main className="relative -mt-16 mb-12">
        <div className="mx-auto max-w-7xl space-y-6 px-6">
          {/* État : aucune société */}
          {!companiesLoading && companies.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 py-16 text-center shadow-sm">
              <Building2 className="mb-3 h-10 w-10 text-slate-300" aria-hidden />
              <p className="text-sm text-slate-600">
                Aucune société disponible. Créez d&apos;abord une société dans la configuration pour
                générer un diagnostic.
              </p>
            </div>
          )}

          {/* État : sélection en attente */}
          {companies.length > 0 && !selectedCompanyId && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 py-16 text-center shadow-sm">
              <Building2 className="mb-3 h-10 w-10 text-slate-300" aria-hidden />
              <p className="text-sm text-slate-600">
                Sélectionnez une société pour générer le diagnostic.
              </p>
            </div>
          )}

          {/* État : chargement */}
          {(companiesLoading || loading) && selectedCompanyId !== null && !error && !data && (
            <DiagnosticSkeleton />
          )}
          {companiesLoading && selectedCompanyId === null && <DiagnosticSkeleton />}

          {/* État : erreur */}
          {error && !loading && (
            <div
              data-testid="diagnostic-error"
              className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-white px-8 py-16 text-center shadow-sm"
            >
              <AlertCircle className="mb-3 h-10 w-10 text-red-400" aria-hidden />
              <p className="text-sm font-medium text-slate-900">
                Impossible de charger le diagnostic.
              </p>
              <p className="mt-1 max-w-md text-xs text-slate-500">{error}</p>
              <Button
                onClick={reload}
                className="mt-4 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Réessayer
              </Button>
            </div>
          )}

          {/* Rapport */}
          {data && !loading && !error && (
            <>
              <DiagnosticHeader diagnostic={data} />

              <DiagnosticKpiCards diagnostic={data} />

              <DiagnosticSection
                title="Tendances sur 5 ans"
                subtitle="Chiffre d'affaires et évolution des marges"
                lead={trendsNarrative(data)}
              >
                <DiagnosticTrendsChart trends={data.trends} currency={data.currency} />
              </DiagnosticSection>

              <DiagnosticSection
                title="Saisonnalité"
                subtitle="Revenu mensuel moyen et part du chiffre d'affaires annuel"
                lead={seasonalityNarrative(data)}
                detailHref="/analysis/seasonality"
              >
                <DiagnosticSeasonalityChart
                  seasonality={data.seasonality}
                  currency={data.currency}
                />
              </DiagnosticSection>

              <DiagnosticSection
                title="Rentabilité par division"
                subtitle="Contribution et performance de chaque division"
                lead={divisionsNarrative(data)}
              >
                <DiagnosticDivisionsSection
                  divisions={data.divisions}
                  currency={data.currency}
                />
              </DiagnosticSection>

              <DiagnosticSection
                title="Revenus et marges par produits/services"
                subtitle="Performance de l'offre"
                detailHref="/analysis/product-margin"
              >
                <DiagnosticProductsSection
                  products={data.products}
                  divisionProducts={data.division_products}
                  currency={data.currency}
                />
              </DiagnosticSection>

              <DiagnosticSection
                title="Ratios financiers (5 ans)"
                subtitle="Liquidité, endettement, efficacité et rentabilité"
                lead={ratiosNarrative(data)}
                detailHref="/analysis/ratios"
              >
                <DiagnosticRatiosTable trends={data.trends} />
              </DiagnosticSection>

              <DiagnosticSection
                title="Investissements (Capex)"
                subtitle="Capex vs amortissement et intensité capitalistique"
                lead={capexNarrative(data)}
                detailHref="/analysis/capex"
              >
                <DiagnosticCapexChart trends={data.trends} currency={data.currency} />
              </DiagnosticSection>

              <DiagnosticSection
                title="Valorisation indicative"
                subtitle="Approche par multiple d'EBITDA"
                lead={valuationNarrative(data)}
                detailHref="/evaluation/ebitda-multiple"
              >
                <DiagnosticValuationSection
                  valuation={data.valuation}
                  notes={data.notes}
                  currency={data.currency}
                />
              </DiagnosticSection>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
