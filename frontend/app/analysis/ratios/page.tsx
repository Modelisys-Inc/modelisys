"use client"

import { useState, useEffect, useMemo } from "react"
import { FinancialRatiosChart } from "@/components/financial-ratios-chart"
import { FinancialRatios, computeRatios } from "@/components/financial-ratios"
import { Filter, Calendar } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector } from "@/components/entity-selector"
import { useCompanies } from "@/hooks/use-companies"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { listCompanies, type Company as ApiCompany } from "@/lib/api"
import { HORIZON_LABEL } from "@/lib/financial-statement-horizon-labels"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { usePathname } from "next/navigation"

type View = "12months" | "24months" | "years"

export default function RatiosPage() {
  const { companies: companiesData } = useCompanies()
  const [view, setView] = useState<View>("12months")
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null)
  const [selectedSubDivisionId, setSelectedSubDivisionId] = useState<string | null>(null)

  // Auto-select first company
  useEffect(() => {
    if (!selectedCompanyId && companiesData.length > 0) {
      setSelectedCompanyId(companiesData[0].id)
    }
  }, [companiesData, selectedCompanyId])

  // Fetch API companies for fiscal_year_end
  const [apiCompanies, setApiCompanies] = useState<ApiCompany[]>([])
  useEffect(() => {
    listCompanies().then(setApiCompanies).catch(() => {})
  }, [])

  const lastCompleteFY = useMemo(() => {
    const now = new Date()
    const curMonth = now.getMonth() + 1
    const curYear = now.getFullYear()
    if (!selectedCompanyId) return curYear
    const company = apiCompanies.find((c) => c.id === selectedCompanyId)
    const fyEnd = company?.fiscal_year_end || "12-31"
    const fyEndMonth = parseInt(fyEnd.split("-")[0], 10) || 12
    const currentFY = curMonth <= fyEndMonth ? curYear : curYear + 1
    return currentFY - 1
  }, [selectedCompanyId, apiCompanies])

  const monthsNeeded = view === "24months" ? 24 : view === "years" ? 60 : 12

  // Fetch IS data
  const { rows: isRows, periods: isPeriods, loading: isLoading } = useFinancialStatementSeries({
    companyId: selectedCompanyId,
    statementType: "income-statement",
    fiscalYear: lastCompleteFY,
    months: monthsNeeded,
    divisionId: selectedDivisionId,
    subDivisionId: selectedSubDivisionId,
    enabled: !!selectedCompanyId,
  })

  // Fetch BS data
  const { rows: bsRows, loading: bsLoading } = useFinancialStatementSeries({
    companyId: selectedCompanyId,
    statementType: "balance-sheet",
    fiscalYear: lastCompleteFY,
    months: monthsNeeded,
    divisionId: selectedDivisionId,
    subDivisionId: selectedSubDivisionId,
    enabled: !!selectedCompanyId,
  })

  const loading = isLoading || bsLoading

  // Compute ratios from IS + BS series
  const ratioData = useMemo(() => {
    if (isPeriods.length === 0) return []
    return computeRatios(isRows, bsRows, isPeriods)
  }, [isRows, bsRows, isPeriods])

  const getCurrentHorizon = (): string => {
    if (view === "12months") return "12mois"
    if (view === "24months") return "24mois"
    if (view === "years") return "annees"
    return "12mois"
  }

  const handleHorizonChange = (value: string) => {
    switch (value) {
      case "12mois":
        setView("12months")
        break
      case "24mois":
        setView("24months")
        break
      case "annees":
        setView("years")
        break
      default:
        setView("12months")
    }
  }

  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />

      {/* Dark Header Section */}
      <div className="w-full bg-slate-900 pt-15 pb-32">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="flex items-start mb-4">
            <div className="w-2 flex-shrink-0"></div>
            <div className="flex-1">
              <h2 className="text-4xl font-normal text-white mb-2 tracking-tight">Ratios financiers</h2>
              <p className="text-base text-slate-300 mb-6">
                Analysez les ratios de liquidité, rentabilité et levier financier pour évaluer la santé de l'entreprise
              </p>
              {/* Navigation Menu */}
              <div className="flex items-end gap-8 mb-2">
                <Link href="/analysis/working-capital" className="relative pb-4 border-b border-slate-600/30">
                  <span
                    className={`text-sm font-normal transition-colors ${
                      pathname === "/analysis/working-capital" ? "text-white" : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Fonds de roulement
                  </span>
                  {pathname === "/analysis/working-capital" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 z-10"></div>
                  )}
                </Link>
                <Link href="/analysis/capex" className="relative pb-4 border-b border-slate-600/30">
                  <span
                    className={`text-sm font-normal transition-colors ${
                      pathname === "/analysis/capex" ? "text-white" : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Capex
                  </span>
                  {pathname === "/analysis/capex" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 z-10"></div>
                  )}
                </Link>
                <Link href="/analysis/product-margin" className="relative pb-4 border-b border-slate-600/30">
                  <span
                    className={`text-sm font-normal transition-colors ${
                      pathname === "/analysis/product-margin" ? "text-white" : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Marge par produits
                  </span>
                  {pathname === "/analysis/product-margin" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 z-10"></div>
                  )}
                </Link>
                <Link href="/analysis/ratios" className="relative pb-4 border-b border-slate-600/30">
                  <span
                    className={`text-sm font-normal transition-colors ${
                      pathname === "/analysis/ratios" ? "text-white" : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Ratios
                  </span>
                  {pathname === "/analysis/ratios" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 z-10"></div>
                  )}
                </Link>
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="mb-6 p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Filter Icon */}
              <div className="flex items-center gap-2 text-slate-300">
                <Filter className="w-4 h-4" />
              </div>

              <div className="h-6 w-px bg-slate-700" />

              {/* Horizon Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300 whitespace-nowrap">Horizon:</span>
                <Select value={getCurrentHorizon()} onValueChange={handleHorizonChange}>
                  <SelectTrigger className="h-8 w-[140px] bg-slate-800/50 border-slate-700 text-slate-300 text-xs hover:bg-slate-700/50">
                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12mois">{HORIZON_LABEL.mensuel}</SelectItem>
                    <SelectItem value="24mois">24 mois</SelectItem>
                    <SelectItem value="annees">{HORIZON_LABEL.annuel5Ans}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="h-6 w-px bg-slate-700" />

              {/* Entity Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300 whitespace-nowrap">Entité:</span>
                <EntitySelector
                  companies={companiesData}
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
        </div>
      </div>

      <main className="w-full py-8 px-6 max-w-[1920px] mx-auto">
        {/* Chart Section - Overlaps dark section */}
        <div className="relative -mt-32 mb-8">
          <FinancialRatiosChart
            ratioData={ratioData}
            loading={loading}
            companyId={selectedCompanyId}
            divisionId={selectedDivisionId}
            subDivisionId={selectedSubDivisionId}
            companies={companiesData}
          />
        </div>
      </main>

      {/* Dark Section between Chart and Detail */}
      <div className="w-full bg-slate-900 pt-12 pb-32">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="flex items-start gap-3">
            <div className="w-2 flex-shrink-0"></div>
            <div className="flex-1">
              <h3 className="text-2xl font-normal text-white mb-3">Analyse des ratios</h3>
              <p className="text-base text-slate-300 leading-relaxed max-w-4xl">
                Suivez l'évolution des ratios financiers clés pour identifier les tendances et les points d'attention dans la performance de l'entreprise.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Section - Overlaps dark section */}
      <div className="w-full py-8 px-6 max-w-[1920px] mx-auto">
        <div className="relative -mt-32">
          <FinancialRatios ratioData={ratioData} loading={loading} />
        </div>
      </div>
    </div>
  )
}
