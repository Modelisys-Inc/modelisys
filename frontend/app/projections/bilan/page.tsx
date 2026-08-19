"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector } from "@/components/entity-selector"
import { BalanceSheetDetail } from "@/components/balance-sheet-detail"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Filter, Calendar } from "lucide-react"
import { useCompanies } from "@/hooks/use-companies"
import { BILAN_HYPOTHESIS_TITLE } from "@/lib/bilan-forecast-utils"

export default function BilanProjectionsPage() {
  const { companies } = useCompanies()
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null)
  const [selectedSubDivisionId, setSelectedSubDivisionId] = useState<string | null>(null)
  const [projectionYears, setProjectionYears] = useState<3 | 4 | 5>(5)

  useEffect(() => {
    if (!selectedCompanyId && companies.length > 0) {
      setSelectedCompanyId(companies[0].id)
    }
  }, [companies, selectedCompanyId])

  const forecastBaseYear = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <DashboardHeader
        title="Projection du bilan"
        description="Ajustez les postes du bilan pour les années projetées"
      />
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

        <BalanceSheetDetail
          period="annual"
          view="years"
          columnMode="comparison"
          companyId={selectedCompanyId}
          divisionId={selectedDivisionId}
          subDivisionId={selectedSubDivisionId}
          companies={companies}
          title={BILAN_HYPOTHESIS_TITLE}
          fiscalYear={forecastBaseYear - 1}
          refMonth={12}
          refYear={forecastBaseYear - 1}
          projectionYears={projectionYears}
          forecastBaseYear={forecastBaseYear}
          forecastUseSeriesActuals
          disableRowInteractions
        />
      </main>
    </div>
  )
}
