"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector } from "@/components/entity-selector"
import { IncomeStatementDetail } from "@/components/income-statement-detail"
import { BaseSeasonalityDetail } from "@/components/base-seasonality-detail"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Filter, Calendar } from "lucide-react"
import { useCompanies } from "@/hooks/use-companies"
import { listCompanies, type Company as ApiCompany } from "@/lib/api"

export default function RevenueProjectionPage() {
  const { companies } = useCompanies()
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null)
  const [selectedSubDivisionId, setSelectedSubDivisionId] = useState<string | null>(null)
  const [projectionYears, setProjectionYears] = useState<3 | 4 | 5>(5)
  const [section, setSection] = useState<"projection" | "seasonality">("projection")

  useEffect(() => {
    if (!selectedCompanyId && companies.length > 0) {
      setSelectedCompanyId(companies[0].id)
    }
  }, [companies, selectedCompanyId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <DashboardHeader title="Projection des revenus" description="Projetez vos revenus futurs par ligne de produit" />
      <main className="w-full py-8 px-6 max-w-[1920px] mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="flex items-center gap-2 text-slate-700">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Paramètres</span>
            </div>
            <div className="flex-1 flex gap-3 flex-wrap items-center">
              <Select value={String(projectionYears)} onValueChange={(v) => setProjectionYears(Number(v) as 3 | 4 | 5)}>
                <SelectTrigger className="w-[160px] bg-slate-50 border-slate-200">
                  <Calendar className="w-4 h-4 mr-2 text-slate-500" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 ans</SelectItem>
                  <SelectItem value="4">4 ans</SelectItem>
                  <SelectItem value="5">5 ans</SelectItem>
                </SelectContent>
              </Select>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  onClick={() => setSection("projection")}
                  className={`h-8 text-xs px-3 rounded-md transition-all ${section === "projection" ? "bg-slate-900 text-white font-medium shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Projection
                </button>
                <button
                  onClick={() => setSection("seasonality")}
                  className={`h-8 text-xs px-3 rounded-md transition-all ${section === "seasonality" ? "bg-slate-900 text-white font-medium shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Saisonnalité
                </button>
              </div>
              <div className="flex-1" />
              <EntitySelector
                companies={companies}
                selectedCompanyId={selectedCompanyId}
                selectedDivisionId={selectedDivisionId}
                selectedSubDivisionId={selectedSubDivisionId}
                onCompanyChange={setSelectedCompanyId}
                onDivisionChange={setSelectedDivisionId}
                onSubDivisionChange={setSelectedSubDivisionId}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200">
          {section === "projection" ? (
            <IncomeStatementDetail
              period="annual"
              view="years"
              columnMode="variations"
              companyId={selectedCompanyId}
              divisionId={selectedDivisionId}
              subDivisionId={selectedSubDivisionId}
              companies={companies}
              title="Estimation des revenus annuels"
              projectionYears={projectionYears}
              projectionMode="gl"
            />
          ) : (
            <BaseSeasonalityDetail
              companyId={selectedCompanyId}
              divisionId={selectedDivisionId}
              subDivisionId={selectedSubDivisionId}
              companies={companies}
            />
          )}
        </div>
      </main>
    </div>
  )
}
