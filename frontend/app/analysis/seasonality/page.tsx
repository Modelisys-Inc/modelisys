"use client"

import { useState } from "react"
import { SeasonalityDetail } from "@/components/seasonality-detail"
import { SeasonalitySummary } from "@/components/seasonality-summary"
import { SeasonalityChart } from "@/components/seasonality-chart"
import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector } from "@/components/entity-selector"
import { useCompanies } from "@/hooks/use-companies"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Calendar, Filter } from "lucide-react"
import { formatCurrency } from "@/lib/financial-utils"

type Period = "monthly" | "quarterly" | "annual"
type View = "12months" | "24months" | "years"
type ColumnMode = "variations" | "percentage"
type AnalysisType = "revenue" | "expenses"
type ProductType = "total" | "product_a" | "product_b" | "service_c"

export default function SeasonalityPage() {
  const { companies: companiesData } = useCompanies()
  const [period, setPeriod] = useState<Period>("monthly")
  const [view, setView] = useState<View>("12months")
  const [columnMode, setColumnMode] = useState<ColumnMode>("variations")
  const [analysisType, setAnalysisType] = useState<AnalysisType>("revenue")
  const [section, setSection] = useState<"summary" | "detail">("summary")
  const [selectedProduct, setSelectedProduct] = useState<ProductType>("total")
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null)
  const [selectedSubDivisionId, setSelectedSubDivisionId] = useState<string | null>(null)

  // Fonction pour obtenir la valeur actuelle du sélecteur Horizon
  const getCurrentHorizon = (): string => {
    if (view === "12months") return "12mois"
    if (view === "24months") return "24mois"
    if (view === "years") return "annees"
    return "12mois"
  }

  // Fonction pour mettre à jour period et view selon la sélection Horizon
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

  // Compute summary metrics for the cards
  const metrics = (() => {
    const baseRevenue = 275000
    const basePrior = 250000
    const currentValue = analysisType === "revenue" ? baseRevenue : 165000
    const priorValue = analysisType === "revenue" ? basePrior : 150000
    const averageValue = Math.round((currentValue + priorValue) / 2)
    const variation = ((currentValue - priorValue) / priorValue) * 100
    return { currentValue, priorValue, averageValue, variation }
  })()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <DashboardHeader title="Saisonnalité" description="Analysez la saisonnalité de vos revenus et dépenses" />
      <main className="w-full py-8 px-6 max-w-[1920px] mx-auto">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue/Expenses Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-lg ${analysisType === "revenue" ? "bg-emerald-100" : "bg-red-100"}`}>
                <DollarSign className={`w-5 h-5 ${analysisType === "revenue" ? "text-emerald-600" : "text-red-600"}`} />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {analysisType === "revenue" ? "Revenus Total" : "Dépenses Total"}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.currentValue)}</p>
              <div className="flex items-center gap-2">
                {(() => {
                  const variationInDollars = metrics.currentValue - metrics.priorValue
                  const isPositive = variationInDollars >= 0
                  return (
                    <>
                      {isPositive ? (
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`text-sm font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : ''}{formatCurrency(Math.abs(variationInDollars))}
                      </span>
                      <span className="text-xs text-slate-500">vs période précédente</span>
                    </>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Average Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-blue-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Moyenne</span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.averageValue)}</p>
              <p className="text-sm text-slate-600">sur la période</p>
            </div>
          </div>

          {/* Variation Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-lg ${metrics.variation >= 0 ? "bg-emerald-100" : "bg-red-100"}`}>
                {metrics.variation >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Variation</span>
            </div>
            <div className="space-y-1">
              <p className={`text-2xl font-bold ${metrics.variation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {metrics.variation >= 0 ? '+' : ''}{metrics.variation.toFixed(1)}%
              </p>
              <p className="text-sm text-slate-600">vs période précédente</p>
            </div>
          </div>

          {/* Period Info */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-amber-100 rounded-lg">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Période</span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-slate-900 capitalize">
                {view === "12months" ? "12 mois" : view === "24months" ? "24 mois" : "5 ans"}
              </p>
              <p className="text-sm text-slate-600">{period === "monthly" ? "Mensuel" : period === "quarterly" ? "Trimestriel" : "Annuel"}</p>
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="flex items-center gap-2 text-slate-700">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filtres</span>
            </div>
            <div className="flex-1 flex gap-3 flex-wrap items-center">
              <Select value={getCurrentHorizon()} onValueChange={handleHorizonChange}>
                <SelectTrigger className="w-[180px] bg-slate-50 border-slate-200">
                  <Calendar className="w-4 h-4 mr-2 text-slate-500" />
                  <SelectValue placeholder="Horizon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12mois">12 mois</SelectItem>
                  <SelectItem value="24mois">24 mois</SelectItem>
                  <SelectItem value="annees">5 ans</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Type:</span>
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                  <Button
                    variant="ghost"
                    onClick={() => setAnalysisType("revenue")}
                    className={`h-8 text-xs px-3 transition-all ${
                      analysisType === "revenue"
                        ? "bg-slate-900 text-white font-medium shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Marge
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setAnalysisType("expenses")}
                    className={`h-8 text-xs px-3 transition-all ${
                      analysisType === "expenses"
                        ? "bg-slate-900 text-white font-medium shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Charges
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Affichage:</span>
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                  <Button
                    variant="ghost"
                    onClick={() => setColumnMode("variations")}
                    className={`h-8 text-xs px-3 transition-all ${
                      columnMode === "variations"
                        ? "bg-slate-900 text-white font-medium shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Aperçu en $
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setColumnMode("percentage")}
                    className={`h-8 text-xs px-3 transition-all ${
                      columnMode === "percentage"
                        ? "bg-slate-900 text-white font-medium shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Aperçu en %
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Vue:</span>
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                  <Button
                    variant="ghost"
                    onClick={() => setSection("summary")}
                    className={`h-8 text-xs px-3 transition-all ${
                      section === "summary"
                        ? "bg-slate-900 text-white font-medium shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Sommaire
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setSection("detail")}
                    className={`h-8 text-xs px-3 transition-all ${
                      section === "detail"
                        ? "bg-slate-900 text-white font-medium shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Détail
                  </Button>
                </div>
              </div>
              <div className="flex-1" />
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

        {/* Chart Section */}
        <SeasonalityChart
          period={period}
          view={view}
          analysisType={analysisType}
          selectedProduct={selectedProduct}
          onProductChange={setSelectedProduct}
          companyId={selectedCompanyId}
          divisionId={selectedDivisionId}
          subDivisionId={selectedSubDivisionId}
          companies={companiesData}
        />

        {/* Summary/Detail Section */}
        <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200">
          {section === "summary" ? (
            <SeasonalitySummary
              period={period}
              view={view}
              columnMode={columnMode}
              analysisType={analysisType}
              selectedProduct={selectedProduct}
              companyId={selectedCompanyId}
              divisionId={selectedDivisionId}
              subDivisionId={selectedSubDivisionId}
              companies={companiesData}
            />
          ) : (
            <SeasonalityDetail
              period={period}
              view={view}
              columnMode={columnMode}
              analysisType={analysisType}
              selectedProduct={selectedProduct}
              companyId={selectedCompanyId}
              divisionId={selectedDivisionId}
              subDivisionId={selectedSubDivisionId}
              companies={companiesData}
            />
          )}
        </div>
      </main>
    </div>
  )
}
