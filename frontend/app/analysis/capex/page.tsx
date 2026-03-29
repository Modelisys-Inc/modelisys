"use client"

import { useState, useEffect } from "react"
import { CapexDetail } from "@/components/capex-detail"
import { CapexChart, type CapexChartDataPoint } from "@/components/capex-chart"
import { CapexAnalysis } from "@/components/capex-analysis"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector } from "@/components/entity-selector"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Building2, Calculator, Calendar, Filter, Target, Zap, ChevronRight } from "lucide-react"
import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCompanies } from "@/hooks/use-companies"
import { listBudgets, type BudgetData } from "@/lib/api"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { getRowAmounts, getPeriodLabels, aggregateToQuarters, aggregateToYears, findRow } from "@/lib/series-utils"

type Period = "monthly" | "quarterly" | "annual"
type View = "current" | "12months" | "24months" | "years"
type ColumnMode = "variations" | "percentage" | "comparison"
type DisplayMode = "cost" | "book_value" | "capex"
type ComparisonType = "lastMonth" | "pastMonth" | "budget"

export default function CapexPage() {
  const { companies } = useCompanies()
  const [period, setPeriod] = useState<Period>("monthly")
  const [view, setView] = useState<View>("current")
  const [columnMode, setColumnMode] = useState<ColumnMode>("variations")
  const [displayMode, setDisplayMode] = useState<DisplayMode>("cost")
  const [comparisonType, setComparisonType] = useState<ComparisonType>("lastMonth")
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null)
  const [selectedSubDivisionId, setSelectedSubDivisionId] = useState<string | null>(null)
  const pathname = usePathname()

  // Auto-select first company
  useEffect(() => {
    if (!selectedCompanyId && companies.length > 0) {
      setSelectedCompanyId(companies[0].id)
    }
  }, [companies, selectedCompanyId])

  // Date reference state (month and year)
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1) // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear())

  // Load budgets from API
  const [budgets, setBudgets] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    if (!selectedCompanyId) {
      setBudgets([])
      return
    }

    listBudgets(selectedCompanyId)
      .then((data) => {
        const mapped = data.map((b: BudgetData) => ({ id: b.id, name: b.name }))
        setBudgets(mapped)
        if (!selectedBudgetId && mapped.length > 0) {
          setSelectedBudgetId(mapped[0].id)
        }
      })
      .catch((e) => {
        console.error("Error loading budgets:", e)
        setBudgets([])
      })
  }, [selectedCompanyId])

  // Reset budget selection when switching away from budget
  useEffect(() => {
    if (comparisonType !== "budget") {
      setSelectedBudgetId(null)
    } else if (comparisonType === "budget" && !selectedBudgetId && budgets.length > 0) {
      setSelectedBudgetId(budgets[0].id)
    }
  }, [comparisonType, budgets.length])

  // Fonction pour obtenir la valeur actuelle du sélecteur Horizon
  const getCurrentHorizon = (): string => {
    if (view === "current") return "courant"
    if (view === "12months") return "12mois"
    if (view === "24months") return "24mois"
    if (view === "years") return "annees"
    return "courant"
  }

  // Fonction pour mettre à jour period et view selon la sélection Horizon
  const handleHorizonChange = (value: string) => {
    switch (value) {
      case "courant":
        setPeriod("monthly")
        setView("current")
        break
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
        setPeriod("monthly")
        setView("current")
    }
  }

  // Fetch balance-sheet series for chart data
  const isMultiPeriod = view === "12months" || view === "24months" || view === "years"
  const monthsNeeded = view === "24months" ? 24 : view === "years" ? 60 : 12

  const { rows: seriesRows, periods, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: selectedCompanyId || null,
    statementType: "balance-sheet",
    fiscalYear: selectedYear,
    months: monthsNeeded,
    divisionId: selectedDivisionId || null,
    subDivisionId: selectedSubDivisionId || null,
    enabled: !!selectedCompanyId,
  })

  // Fetch income-statement series to get real depreciation/amortization data
  const { rows: isRows, periods: isPeriods, loading: isLoading } = useFinancialStatementSeries({
    companyId: selectedCompanyId || null,
    statementType: "income-statement",
    fiscalYear: selectedYear,
    months: monthsNeeded,
    divisionId: selectedDivisionId || null,
    subDivisionId: selectedSubDivisionId || null,
    enabled: !!selectedCompanyId,
  })

  // Build chart data from series
  const buildChartData = (): CapexChartDataPoint[] => {
    if (!isMultiPeriod || seriesRows.length === 0 || periods.length === 0) return []

    // Find total non-current assets row (for capex)
    const totalRow = seriesRows.find((r) => r.isBold && !r.isSection && r.label.toLowerCase().includes("total"))
    if (!totalRow) return []

    const amounts = getRowAmounts(totalRow, periods)

    // Find depreciation/amortization row from income statement
    const depRow = isRows.find((r) =>
      !r.isSection &&
      (r.label.toLowerCase().includes("amortissement") || r.label.toLowerCase().includes("depreciation") || r.label.toLowerCase().includes("dépréciation"))
    )
    const depAmounts = depRow && isPeriods.length > 0 ? getRowAmounts(depRow, isPeriods) : null

    let labels: string[]
    let values: number[]
    let depValues: number[] | null = null

    if (view === "years") {
      const agg = aggregateToYears(amounts, periods)
      labels = agg.labels
      values = agg.amounts
      if (depAmounts) {
        const depAgg = aggregateToYears(depAmounts, isPeriods)
        depValues = depAgg.amounts
      }
    } else {
      labels = getPeriodLabels(periods)
      values = amounts
      depValues = depAmounts
    }

    return labels.map((label, idx) => {
      const capex = idx > 0 ? values[idx] - values[idx - 1] : 0
      const depreciation = depValues ? Math.abs(depValues[idx] || 0) : 0
      const ratio = depreciation > 0 ? (capex / depreciation) * 100 : 0
      return {
        period: label,
        capex: Math.abs(capex),
        denominator: depreciation,
        ratio: Math.abs(ratio),
      }
    })
  }

  const chartData = buildChartData()

  // Calculate summary metrics from series data or fallback to defaults
  const calculateMetrics = () => {
    if (seriesRows.length > 0 && periods.length > 1) {
      const totalRow = seriesRows.find((r) => r.isBold && !r.isSection && r.label.toLowerCase().includes("total"))
      if (totalRow) {
        const amounts = getRowAmounts(totalRow, periods)
        const currentVal = amounts[amounts.length - 1]
        const priorVal = amounts[amounts.length - 2]
        const totalCapex = Math.abs(currentVal - priorVal)
        const totalAssets = currentVal
        const variation = priorVal !== 0 ? calculateVariation(currentVal, priorVal) : 0
        const capexPercentage = totalAssets !== 0 ? (totalCapex / totalAssets) * 100 : 0
        const averageCapex = amounts.length > 1
          ? amounts.slice(1).reduce((sum, v, i) => sum + Math.abs(v - amounts[i]), 0) / (amounts.length - 1)
          : totalCapex

        return { totalCapex, priorCapex: 0, variation, capexPercentage, totalAssets, averageCapex }
      }
    }

    return { totalCapex: 0, priorCapex: 0, variation: 0, capexPercentage: 0, totalAssets: 0, averageCapex: 0 }
  }

  const metrics = calculateMetrics()
  
  // Determine card title and content based on view
  const getCapexCardTitle = () => {
    if (view === "current") {
      return "Capex Total"
    } else {
      return "Capex actuel vs Capex Moyen"
    }
  }

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
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-4xl font-normal text-white tracking-tight">Analyse des Capex</h2>
                {/* Date Reference Selector */}
                <div className="flex items-center gap-3 bg-slate-800/70 border border-slate-700 rounded-lg px-4 py-2.5 shadow-lg">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-white whitespace-nowrap">Référence:</span>
                  <Select 
                    value={selectedMonth.toString()} 
                    onValueChange={(value) => setSelectedMonth(parseInt(value))}
                  >
                    <SelectTrigger className="h-9 w-[140px] bg-white/10 border-slate-600 text-white text-sm font-medium hover:bg-white/20 focus:ring-2 focus:ring-emerald-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Janvier</SelectItem>
                      <SelectItem value="2">Février</SelectItem>
                      <SelectItem value="3">Mars</SelectItem>
                      <SelectItem value="4">Avril</SelectItem>
                      <SelectItem value="5">Mai</SelectItem>
                      <SelectItem value="6">Juin</SelectItem>
                      <SelectItem value="7">Juillet</SelectItem>
                      <SelectItem value="8">Août</SelectItem>
                      <SelectItem value="9">Septembre</SelectItem>
                      <SelectItem value="10">Octobre</SelectItem>
                      <SelectItem value="11">Novembre</SelectItem>
                      <SelectItem value="12">Décembre</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select 
                    value={selectedYear.toString()} 
                    onValueChange={(value) => setSelectedYear(parseInt(value))}
                  >
                    <SelectTrigger className="h-9 w-[110px] bg-white/10 border-slate-600 text-white text-sm font-medium hover:bg-white/20 focus:ring-2 focus:ring-emerald-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 15 }, (_, i) => {
                        const year = currentDate.getFullYear() - 5 + i
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-base text-slate-300 mb-6">
                Analysez vos immobilisations et vos dépenses en capital avec des indicateurs détaillés
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
                <div className="flex gap-2 items-center">
                  <Select value={getCurrentHorizon()} onValueChange={handleHorizonChange}>
                    <SelectTrigger className="h-8 w-[140px] bg-slate-800/50 border-slate-700 text-slate-300 text-xs hover:bg-slate-700/50">
                      <Calendar className="w-3.5 h-3.5 mr-2 text-slate-400" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="courant">Courant</SelectItem>
                      <SelectItem value="12mois">12 mois</SelectItem>
                      <SelectItem value="24mois">24 mois</SelectItem>
                      <SelectItem value="annees">5 ans</SelectItem>
                    </SelectContent>
                  </Select>
                  {view === "current" && (
                    <>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                      <Select value={comparisonType} onValueChange={(value) => {
                        setComparisonType(value as ComparisonType)
                        // Reset budget selection when switching away from budget
                        if (value !== "budget") {
                          setSelectedBudgetId(null)
                        }
                      }}>
                        <SelectTrigger className="h-8 w-[140px] bg-slate-800/50 border-slate-700 text-slate-300 text-xs hover:bg-slate-700/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lastMonth">Mois dernier</SelectItem>
                          <SelectItem value="pastMonth">Mois passé</SelectItem>
                          <SelectItem value="budget">Budget</SelectItem>
                        </SelectContent>
                      </Select>
                      {comparisonType === "budget" && budgets.length > 0 && (
                        <>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                          <Select 
                            value={selectedBudgetId || budgets[0].id} 
                            onValueChange={setSelectedBudgetId}
                          >
                            <SelectTrigger className="h-8 w-[140px] bg-slate-800/50 border-slate-700 text-slate-300 text-xs hover:bg-slate-700/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {budgets.map((budget) => (
                                <SelectItem key={budget.id} value={budget.id}>
                                  {budget.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-slate-700" />

              {/* Display Mode Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300 whitespace-nowrap">Mode d'affichage:</span>
                <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800/50 p-1">
                  <Button
                    variant="ghost"
                    onClick={() => setDisplayMode("cost")}
                    className={`h-8 text-xs px-3 transition-all ${
                      displayMode === "cost"
                        ? "bg-emerald-500 text-white font-medium shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                    }`}
                  >
                    Coût
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setDisplayMode("book_value")}
                    className={`h-8 text-xs px-3 transition-all ${
                      displayMode === "book_value"
                        ? "bg-emerald-500 text-white font-medium shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                    }`}
                  >
                    Valeur comptable
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setDisplayMode("capex")}
                    className={`h-8 text-xs px-3 transition-all ${
                      displayMode === "capex"
                        ? "bg-emerald-500 text-white font-medium shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                    }`}
                  >
                    Capex (Variations)
                  </Button>
                </div>
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-slate-700" />

              {/* Entity Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300 whitespace-nowrap">Entité:</span>
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
        </div>
      </div>

      <main className="w-full py-8 px-6 max-w-[1920px] mx-auto">
        {/* Chart Section - Overlapping with dark section */}
        <div className="relative -mt-32">
          <CapexChart
            period={period}
            view={view}
            displayMode={displayMode}
            companyId={selectedCompanyId}
            divisionId={selectedDivisionId}
            subDivisionId={selectedSubDivisionId}
            companies={companies}
            chartData={chartData.length > 0 ? chartData : undefined}
            loading={seriesLoading}
          />
        </div>
      </main>

      {/* Dark Section between Chart and Analysis */}
      <div className="w-full bg-slate-900 pt-12 pb-32">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="flex items-start gap-3">
            <div className="w-2 flex-shrink-0"></div>
            <div className="flex-1">
              <div>
                <h3 className="text-2xl font-normal text-white mb-3">Optimisation des investissements en capital</h3>
                <p className="text-base text-slate-300 leading-relaxed max-w-4xl mb-6">
                  Les investissements en capital (Capex) sont essentiels pour la croissance et la compétitivité de votre entreprise. Analysez vos dépenses en immobilisations pour optimiser vos investissements et maximiser votre retour sur investissement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="w-full py-8 px-6 max-w-[1920px] mx-auto">
        {/* Analysis Section - Overlapping with dark section */}
        <div className="relative -mt-32">
          <CapexAnalysis
            period={period}
            view={view}
            displayMode={displayMode}
            companyId={selectedCompanyId}
            divisionId={selectedDivisionId}
            subDivisionId={selectedSubDivisionId}
            companies={companies}
          />

          {/* Detail Section */}
          <div className="mt-16 rounded-xl overflow-hidden shadow-sm border border-slate-200">
            <CapexDetail
              period={period}
              view={view}
              columnMode={columnMode}
              displayMode={displayMode}
              companyId={selectedCompanyId}
              divisionId={selectedDivisionId}
              subDivisionId={selectedSubDivisionId}
              companies={companies}
              comparisonType={comparisonType}
              selectedBudgetId={comparisonType === "budget" ? selectedBudgetId : null}
              selectedBudgetName={comparisonType === "budget" && selectedBudgetId ? budgets.find(b => b.id === selectedBudgetId)?.name || null : null}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

