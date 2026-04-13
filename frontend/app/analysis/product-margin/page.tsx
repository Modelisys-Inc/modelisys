"use client"

import { useState, useEffect, useMemo } from "react"
import { ProductMarginChart, type ProductType, type ProductMarginChartDataPoint } from "@/components/product-margin-chart"
import { ProductMarginAnalysis } from "@/components/product-margin-analysis"
import { Filter, Calendar } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector } from "@/components/entity-selector"
import { useCompanies } from "@/hooks/use-companies"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { findRow } from "@/lib/series-utils"
import { HORIZON_LABEL } from "@/lib/financial-statement-horizon-labels"
import { listCompanies, type Company as ApiCompany } from "@/lib/api"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname } from "next/navigation"

type Period = "monthly" | "quarterly" | "annual"
type View = "current" | "comparison" | "ytd" | "ddm" | "12months" | "24months" | "quarters" | "years"
type ColumnMode = "variations" | "percentage" | "comparison"

export default function ProductMarginPage() {
  const { companies: companiesData } = useCompanies()
  const [period, setPeriod] = useState<Period>("monthly")
  const [view, setView] = useState<View>("comparison")
  const [columnMode, setColumnMode] = useState<ColumnMode>("variations")
  const [selectedProduct, setSelectedProduct] = useState<ProductType>("total")
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
    const company = apiCompanies.find(c => c.id === selectedCompanyId)
    const fyEnd = company?.fiscal_year_end || "12-31"
    const fyEndMonth = parseInt(fyEnd.split("-")[0], 10) || 12
    const currentFY = curMonth <= fyEndMonth ? curYear : curYear + 1
    return currentFY - 1
  }, [selectedCompanyId, apiCompanies])

  const monthsNeeded = view === "24months" ? 24 : view === "years" ? 60 : 12

  const { rows: seriesRows, periods, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: selectedCompanyId || null,
    statementType: "income-statement",
    fiscalYear: lastCompleteFY,
    months: monthsNeeded,
    divisionId: selectedDivisionId || null,
    subDivisionId: selectedSubDivisionId || null,
    enabled: !!selectedCompanyId,
  })

  // Build chart data from IS series
  const chartData = useMemo<ProductMarginChartDataPoint[]>(() => {
    if (seriesRows.length === 0 || periods.length === 0) return []
    const revenueRow = findRow(seriesRows, "revenus") || findRow(seriesRows, "revenue")
    const cogsRow = findRow(seriesRows, "coût des ventes") || findRow(seriesRows, "cost of sales")
    const grossProfitRow = findRow(seriesRows, "bénéfice brut") || findRow(seriesRows, "gross profit")
    return periods.map(p => {
      const key = `${p.fiscalYear}-${p.fiscalMonth}`
      const revenue = Math.abs(revenueRow?.amounts[key] || 0)
      const costs = Math.abs(cogsRow?.amounts[key] || 0)
      const grossProfit = grossProfitRow?.amounts[key] || (revenue - costs)
      const grossMargin = revenue !== 0 ? (grossProfit / revenue) * 100 : 0
      return { period: p.label, revenue, costs, grossProfit, grossMargin }
    })
  }, [seriesRows, periods])

  // Fonction pour obtenir la valeur actuelle du sélecteur Horizon
  const getCurrentHorizon = (): string => {
    if (view === "comparison" && period === "monthly") return "courant"
    if (view === "comparison" && period === "quarterly") return "trimestriel"
    if (view === "comparison" && period === "annual") return "annuel"
    if (view === "ytd") return "ytd"
    if (view === "ddm") return "ddm"
    if (view === "12months") return "12mois"
    if (view === "24months") return "24mois"
    if (view === "quarters") return "trimestres"
    if (view === "years") return "annees"
    return "courant"
  }

  // Fonction pour mettre à jour period et view selon la sélection Horizon
  const handleHorizonChange = (value: string) => {
    switch (value) {
      case "courant":
        setPeriod("monthly")
        setView("comparison")
        setColumnMode("variations")
        break
      case "trimestriel":
        setPeriod("quarterly")
        setView("comparison")
        setColumnMode("variations")
        break
      case "annuel":
        setPeriod("annual")
        setView("comparison")
        setColumnMode("variations")
        break
      case "ytd":
        setView("ytd")
        break
      case "ddm":
        setView("ddm")
        break
      case "12mois":
        setView("12months")
        setColumnMode("variations")
        break
      case "24mois":
        setView("24months")
        setColumnMode("variations")
        break
      case "trimestres":
        setView("quarters")
        setColumnMode("variations")
        break
      case "annees":
        setView("years")
        setColumnMode("variations")
        break
      default:
        setPeriod("monthly")
        setView("comparison")
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
            {/* Espace équivalent au bouton menu du header pour l'alignement */}
            <div className="w-2 flex-shrink-0"></div>
            <div className="flex-1">
              <h2 className="text-4xl font-normal text-white mb-2 tracking-tight">Marge par produits</h2>
              <p className="text-base text-slate-300 mb-6">
                Analysez les revenus, charges, bénéfice brut et marge brute par produit pour identifier vos produits les plus performants
              </p>
              {/* Navigation Menu */}
              <div className="flex items-end gap-8 mb-2">
                <Link
                  href="/analysis/working-capital"
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span
                    className={`text-sm font-normal transition-colors ${
                      pathname === "/analysis/working-capital"
                        ? "text-white"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Fonds de roulement
                  </span>
                  {pathname === "/analysis/working-capital" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 z-10"></div>
                  )}
                </Link>
                <Link
                  href="/analysis/capex"
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span
                    className={`text-sm font-normal transition-colors ${
                      pathname === "/analysis/capex"
                        ? "text-white"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Capex
                  </span>
                  {pathname === "/analysis/capex" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 z-10"></div>
                  )}
                </Link>
                <Link
                  href="/analysis/product-margin"
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span
                    className={`text-sm font-normal transition-colors ${
                      pathname === "/analysis/product-margin"
                        ? "text-white"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Marge par produits
                  </span>
                  {pathname === "/analysis/product-margin" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 z-10"></div>
                  )}
                </Link>
                <Link
                  href="/analysis/ratios"
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span
                    className={`text-sm font-normal transition-colors ${
                      pathname === "/analysis/ratios"
                        ? "text-white"
                        : "text-slate-300 hover:text-white"
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

              {/* Separator */}
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
                    <SelectItem value="courant">{HORIZON_LABEL.moisActuel}</SelectItem>
                    <SelectItem value="trimestriel">{HORIZON_LABEL.trimestreActuel}</SelectItem>
                    <SelectItem value="annuel">Annuel</SelectItem>
                    <SelectItem value="ytd">{HORIZON_LABEL.ytd}</SelectItem>
                    <SelectItem value="ddm">{HORIZON_LABEL.ddm}</SelectItem>
                    <SelectItem value="12mois">{HORIZON_LABEL.mensuel}</SelectItem>
                    <SelectItem value="24mois">24 mois</SelectItem>
                    <SelectItem value="trimestres">{HORIZON_LABEL.trimestriel2Ans}</SelectItem>
                    <SelectItem value="annees">{HORIZON_LABEL.annuel5Ans}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-slate-700" />

              {/* Display Mode Buttons */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300 whitespace-nowrap">Affichage:</span>
                <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800/50 p-1">
                  <Button
                    variant="ghost"
                    onClick={() => setColumnMode("variations")}
                    disabled={getCurrentHorizon() === "12mois" || getCurrentHorizon() === "24mois" || getCurrentHorizon() === "trimestres" || getCurrentHorizon() === "annees"}
                    className={`h-8 text-xs px-3 transition-all ${
                      columnMode === "variations"
                        ? "bg-emerald-500 text-white font-medium shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                    } disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-300`}
                  >
                    Variations
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setColumnMode("percentage")}
                    disabled={getCurrentHorizon() === "12mois" || getCurrentHorizon() === "24mois" || getCurrentHorizon() === "trimestres" || getCurrentHorizon() === "annees"}
                    className={`h-8 text-xs px-3 transition-all ${
                      columnMode === "percentage"
                        ? "bg-emerald-500 text-white font-medium shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                    } disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-300`}
                  >
                    % revenus
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setColumnMode("comparison")}
                    disabled={getCurrentHorizon() === "12mois" || getCurrentHorizon() === "24mois" || getCurrentHorizon() === "trimestres" || getCurrentHorizon() === "annees"}
                    className={`h-8 text-xs px-3 transition-all ${
                      columnMode === "comparison"
                        ? "bg-emerald-500 text-white font-medium shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                    } disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-300`}
                  >
                    Comparaison
                  </Button>
                </div>
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-slate-700" />

              {/* Separator */}
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
          <ProductMarginChart
            period={period}
            view={view}
            selectedProduct={selectedProduct}
            companyId={selectedCompanyId}
            divisionId={selectedDivisionId}
            subDivisionId={selectedSubDivisionId}
            companies={companiesData}
            chartData={chartData}
            loading={seriesLoading}
          />
        </div>
      </main>

      {/* Dark Section between Chart and Detail */}
      <div className="w-full bg-slate-900 pt-12 pb-32">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="flex items-start gap-3">
            <div className="w-2 flex-shrink-0"></div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-normal text-white mb-3">Documentation comptable continue</h3>
                  <p className="text-base text-slate-300 leading-relaxed max-w-4xl">
                    Documentez les variations importantes tout au long de l'exercice pour faciliter votre clôture comptable annuelle et optimiser les processus d'évaluation d'entreprise et de transactions stratégiques.
                  </p>
                </div>
                <div className="flex items-center gap-4 ml-8">
                  <div className="text-right">
                    <div className="text-sm text-slate-400 mb-1">Notes documentées</div>
                    <div className="text-3xl font-semibold text-white">8</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Section - Overlaps dark section */}
      <div className="w-full py-8 px-6 max-w-[1920px] mx-auto">
        <div className="relative -mt-32">
          <ProductMarginAnalysis
            period={period}
            view={view}
            columnMode={columnMode}
            selectedProduct={selectedProduct}
            companyId={selectedCompanyId}
            divisionId={selectedDivisionId}
            subDivisionId={selectedSubDivisionId}
            companies={companiesData}
            seriesRows={seriesRows}
            periods={periods}
          />
        </div>
      </div>
    </div>
  )
}
