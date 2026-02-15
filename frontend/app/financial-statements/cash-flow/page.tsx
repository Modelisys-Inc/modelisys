"use client"

import { useState, useEffect, useMemo } from "react"
import { CashFlowSummary } from "@/components/cash-flow-summary"
import { CashFlowDetail } from "@/components/cash-flow-detail"
import { CashFlowChart } from "@/components/cash-flow-chart"
import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector } from "@/components/entity-selector"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Filter, Calendar, TrendingUp, TrendingDown, ChevronRight } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCompanies } from "@/hooks/use-companies"
import {
  listBudgets,
  listCompanies,
  getCashFlow,
  type BudgetData,
  type FinancialStatementRow,
  type FinancialStatementParams,
} from "@/lib/api"

type Period = "monthly" | "quarterly" | "annual"
type View = "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years"
type Section = "summary" | "detail"
type ColumnMode = "variations" | "percentage" | "comparison"
type ComparisonType = "lastMonth" | "pastMonth" | "budget"

const financialStatementsNav = [
  { label: "Résultats", href: "/financial-statements/income-statement" },
  { label: "Bilan", href: "/financial-statements/balance-sheet" },
  { label: "Trésorerie", href: "/financial-statements/cash-flow" },
]

export default function CashFlowPage() {
  const { companies } = useCompanies()
  const [period, setPeriod] = useState<Period>("monthly")
  const [view, setView] = useState<View>("comparison")
  const [section, setSection] = useState<Section>("summary")
  const [columnMode, setColumnMode] = useState<ColumnMode>("variations")
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null)
  const [selectedSubDivisionId, setSelectedSubDivisionId] = useState<string | null>(null)
  const [comparisonType, setComparisonType] = useState<ComparisonType>("lastMonth")
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null)
  const pathname = usePathname()

  // Date reference state (month and year)
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1) // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear())

  // Load budgets from API
  const [budgets, setBudgets] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    // Load budgets for the first company
    listCompanies()
      .then((apiCompanies) => {
        if (apiCompanies.length > 0) {
          return listBudgets(apiCompanies[0].id)
        }
        return []
      })
      .then((loadedBudgets: BudgetData[]) => {
        const mapped = loadedBudgets.map((b) => ({ id: b.id, name: b.name }))
        setBudgets(mapped)
        if (mapped.length > 0 && !selectedBudgetId) {
          setSelectedBudgetId(mapped[0].id)
        }
      })
      .catch((e) => {
        console.error("Error loading budgets:", e)
        setBudgets([])
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-switch comparison type when horizon doesn't support "lastMonth"
  useEffect(() => {
    const isAnnualYTDorDDM = view === "ytd" || view === "ddm" || (view === "comparison" && period === "annual")
    if (isAnnualYTDorDDM && comparisonType === "lastMonth") {
      setComparisonType("pastMonth")
    }
  }, [view, period, comparisonType])

  // --- Fetch financial statement data from the API ---
  const [rows, setRows] = useState<FinancialStatementRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const apiCompanies = await listCompanies()
        const companyId = selectedCompanyId || apiCompanies[0]?.id
        if (!companyId) {
          setRows([])
          return
        }

        const params: FinancialStatementParams = {
          fiscal_year: selectedYear,
          month: selectedMonth,
          period: period,
          comparison_type: comparisonType,
          budget_id: comparisonType === "budget" && selectedBudgetId ? selectedBudgetId : undefined,
          division_id: selectedDivisionId || undefined,
          sub_division_id: selectedSubDivisionId || undefined,
        }

        const response = await getCashFlow(companyId, params)
        setRows(response.rows)
      } catch (err) {
        console.error("Error fetching cash flow data:", err)
        setRows([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [selectedCompanyId, selectedYear, selectedMonth, period, view, comparisonType, selectedBudgetId, selectedDivisionId, selectedSubDivisionId])

  // --- Compute top 3 variations from fetched rows ---
  const topVariations = useMemo(() => {
    if (rows.length === 0) return []
    // Filter rows that have meaningful variation and are not empty/section-only
    const withVariation = rows
      .filter((r) => r.label && r.current !== 0 && r.prior !== 0 && !r.isSection)
      .map((r) => ({
        label: r.label,
        variation: r.variation,
        variationAmount: r.variationAmount,
      }))
      .sort((a, b) => Math.abs(b.variation) - Math.abs(a.variation))
    return withVariation.slice(0, 3)
  }, [rows])

  // Fonction pour obtenir la valeur actuelle du sélecteur Horizon
  const getCurrentHorizon = (): string => {
    if (view === "comparison" && period === "monthly") return "courant"
    if (view === "comparison" && period === "quarterly") return "trimestriel"
    if (view === "comparison" && period === "annual") return "annuel"
    if (view === "ytd") return "ytd"
    if (view === "ddm") return "ddm"
    if (view === "12months") return "12mois"
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
        setColumnMode("variations")
        break
      case "ddm":
        setView("ddm")
        setColumnMode("variations")
        break
      case "12mois":
        setView("12months")
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <DashboardHeader title="Modelisys" />
      {/* New Section between Header and Cards - Black Background - Full Width */}
      <div className="w-full bg-slate-900 pt-15 pb-32">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="flex items-start mb-4">
            {/* Espace équivalent au bouton menu du header pour l'alignement */}
            <div className="w-2 flex-shrink-0"></div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-4xl font-normal text-white tracking-tight">Trésorerie comparatifs</h2>
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
              <p className="text-base text-slate-300 mb-6">Suivez vos flux de trésorerie d'exploitation, d'investissement et de financement avec des analyses comparatives</p>
              {/* Navigation Menu - Style like photo - Below description */}
              <div className="flex items-end gap-8 mb-2">
                {financialStatementsNav.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="relative pb-4 border-b border-slate-600/30"
                    >
                      <span
                        className={`text-sm font-normal transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        {item.label}
                      </span>
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 z-10"></div>
                      )}
                    </Link>
                  )
                })}
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

              {/* View Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300 whitespace-nowrap">Vue:</span>
                <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800/50 p-1">
                  <Button
                    variant="ghost"
                    onClick={() => setSection("summary")}
                    className={`h-8 text-xs px-3 transition-all ${
                      section === "summary"
                        ? "bg-emerald-500 text-white font-medium shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    Sommaire
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setSection("detail")}
                    className={`h-8 text-xs px-3 transition-all ${
                      section === "detail"
                        ? "bg-emerald-500 text-white font-medium shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    Détail
                  </Button>
                </div>
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-slate-700" />

              {/* Horizon and Comparison Group */}
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
                      <SelectItem value="trimestres">Trimestres</SelectItem>
                      <SelectItem value="annees">Années</SelectItem>
                    </SelectContent>
                  </Select>
                  {(view === "comparison" || view === "ytd" || view === "ddm") && (
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
                          {/* Hide "Mois dernier" for Annuel, YTD, and DDM horizons */}
                          {!(view === "ytd" || view === "ddm" || (view === "comparison" && period === "annual")) && (
                            <SelectItem value="lastMonth">Mois dernier</SelectItem>
                          )}
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

              {/* Display Mode Buttons */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300 whitespace-nowrap">Affichage:</span>
                <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800/50 p-1">
                  <Button
                    variant="ghost"
                    onClick={() => setColumnMode("variations")}
                    disabled={getCurrentHorizon() !== "courant"}
                    className={`h-8 text-xs px-3 transition-all ${
                      columnMode === "variations"
                        ? "bg-emerald-500 text-white font-medium shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-800"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Variations
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setColumnMode("percentage")}
                    disabled={getCurrentHorizon() !== "courant"}
                    className={`h-8 text-xs px-3 transition-all ${
                      columnMode === "percentage"
                        ? "bg-emerald-500 text-white font-medium shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-800"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    % des flux totaux
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setColumnMode("comparison")}
                    disabled={
                      getCurrentHorizon() !== "courant" ||
                      (!selectedCompanyId && !!selectedDivisionId) ||
                      (!selectedCompanyId && !!selectedSubDivisionId) ||
                      (!!selectedCompanyId && !!selectedDivisionId && !!selectedSubDivisionId)
                    }
                    className={`h-8 text-xs px-3 transition-all ${
                      columnMode === "comparison"
                        ? "bg-emerald-500 text-white font-medium shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-800"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Comparaison
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
        {/* Chart Section - Overlap with dark section */}
        <div className="relative -mt-32">

          <CashFlowChart
            period={period}
            view={view}
            companyId={selectedCompanyId}
            divisionId={selectedDivisionId}
            subDivisionId={selectedSubDivisionId}
            companies={companies}
            fiscalYear={selectedYear}
          />
        </div>
      </main>

      {/* Dark Section between Chart and Summary/Detail */}
      <div className="w-full bg-slate-900 pt-12 pb-32">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="flex items-start gap-3">
            <div className="w-2 flex-shrink-0"></div>
            <div className="flex-1">
              <div className="mb-6">
                <h3 className="text-2xl font-normal text-white mb-3">Compréhension des flux de trésorerie</h3>
                <p className="text-base text-slate-300 leading-relaxed max-w-4xl">
                  Les flux de trésorerie sont l'indicateur clé pour l'évaluation d'entreprise. Analysez ce qui impacte votre trésorerie et identifiez les opportunités d'optimisation de vos flux opérationnels, d'investissement et de financement.
                </p>
              </div>
              
              {/* Top 3 Variations */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topVariations.length > 0 ? topVariations.map((v, i) => {
                  const isPositive = v.variation >= 0
                  const labels = ["Variation la plus importante", "2e variation importante", "3e variation importante"]
                  return (
                    <div key={i} className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                      <div className="text-xs text-slate-400 mb-1">{labels[i]}</div>
                      <div className="text-lg font-semibold text-white mb-1">{v.label}</div>
                      <div className="flex items-center gap-2">
                        {isPositive ? (
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`text-sm font-medium ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
                          {isPositive ? "+" : ""}{v.variation.toFixed(1)}%
                        </span>
                        <span className="text-xs text-slate-400">vs période précédente</span>
                      </div>
                    </div>
                  )
                }) : (
                  <>
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                        <div className="text-xs text-slate-400 mb-1">{["Variation la plus importante", "2e variation importante", "3e variation importante"][i]}</div>
                        <div className="text-lg font-semibold text-white mb-1">--</div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-500">Aucune donnée</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="w-full py-8 px-6 max-w-[1920px] mx-auto">
        {/* Summary or Detail Section - Overlapping with dark section */}
        <div className="relative -mt-32">
          {section === "summary" ? (
            <CashFlowSummary
              period={period}
              view={view}
              columnMode={columnMode}
              companyId={selectedCompanyId}
              divisionId={selectedDivisionId}
              subDivisionId={selectedSubDivisionId}
              companies={companies}
              comparisonType={comparisonType}
              selectedBudgetId={comparisonType === "budget" ? selectedBudgetId : null}
              selectedBudgetName={comparisonType === "budget" && selectedBudgetId ? budgets.find(b => b.id === selectedBudgetId)?.name || null : null}
              fiscalYear={selectedYear}
              rows={rows}
              loading={loading}
            />
          ) : (
            <CashFlowDetail
              period={period}
              view={view}
              columnMode={columnMode}
              companyId={selectedCompanyId}
              divisionId={selectedDivisionId}
              subDivisionId={selectedSubDivisionId}
              companies={companies}
              comparisonType={comparisonType}
              selectedBudgetId={comparisonType === "budget" ? selectedBudgetId : null}
              selectedBudgetName={comparisonType === "budget" && selectedBudgetId ? budgets.find(b => b.id === selectedBudgetId)?.name || null : null}
              fiscalYear={selectedYear}
              rows={rows}
              loading={loading}
            />
          )}
        </div>
      </main>
    </div>
  )
}
