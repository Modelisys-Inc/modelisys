"use client"

import { useState, useEffect } from "react"
import { CapexDetail } from "@/components/capex-detail"
import { CapexChart } from "@/components/capex-chart"
import { CapexAnalysis } from "@/components/capex-analysis"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector, Company } from "@/components/entity-selector"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Building2, Calculator, Calendar, Filter, Target, Zap, ChevronRight } from "lucide-react"
import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import Link from "next/link"
import { usePathname } from "next/navigation"

type Period = "monthly" | "quarterly" | "annual"
type View = "current" | "12months" | "24months" | "years"
type ColumnMode = "variations" | "percentage" | "comparison"
type DisplayMode = "cost" | "book_value" | "capex"
type ComparisonType = "lastMonth" | "pastMonth" | "budget"

// Données d'exemple pour les sociétés, divisions et sous-divisions
const companiesData: Company[] = [
  {
    id: "company-1",
    name: "Modelisys Inc.",
    divisions: [
      {
        id: "div-1",
        name: "Division Technologie",
        subDivisions: [
          { id: "sub-1", name: "Développement Logiciel" },
          { id: "sub-2", name: "Infrastructure IT" },
          { id: "sub-3", name: "Support Technique" },
        ],
      },
      {
        id: "div-2",
        name: "Division Conseil",
        subDivisions: [
          { id: "sub-4", name: "Conseil Stratégique" },
          { id: "sub-5", name: "Conseil Opérationnel" },
        ],
      },
      {
        id: "div-3",
        name: "Division Ventes",
        subDivisions: [
          { id: "sub-6", name: "Ventes B2B" },
          { id: "sub-7", name: "Ventes B2C" },
        ],
      },
    ],
  },
  {
    id: "company-2",
    name: "TechSolutions SA",
    divisions: [
      {
        id: "div-4",
        name: "Division Produits",
        subDivisions: [
          { id: "sub-8", name: "Produits Cloud" },
          { id: "sub-9", name: "Produits On-Premise" },
        ],
      },
      {
        id: "div-5",
        name: "Division Services",
        subDivisions: [
          { id: "sub-10", name: "Services Professionnels" },
          { id: "sub-11", name: "Services Gérés" },
        ],
      },
    ],
  },
  {
    id: "company-3",
    name: "InnovateCorp",
    divisions: [
      {
        id: "div-6",
        name: "Division R&D",
        subDivisions: [
          { id: "sub-12", name: "Recherche" },
          { id: "sub-13", name: "Développement" },
        ],
      },
    ],
  },
]

export default function CapexPage() {
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

  // Date reference state (month and year)
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1) // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear())

  // Load budgets from localStorage
  const [budgets, setBudgets] = useState<Array<{ id: string; name: string }>>([])
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const loadBudgets = () => {
        const saved = localStorage.getItem("modelisys_budgets")
        if (saved) {
          try {
            const loadedBudgets = JSON.parse(saved)
            setBudgets(loadedBudgets)
            // Set first budget as default if none selected
            if (!selectedBudgetId && loadedBudgets.length > 0) {
              setSelectedBudgetId(loadedBudgets[0].id)
            }
          } catch (e) {
            console.error("Error loading budgets:", e)
            setBudgets([])
          }
        } else {
          // Create default budgets if none exist
          const defaultBudgets = [
            { id: "budget-optimiste", name: "Optimiste" },
            { id: "budget-realiste", name: "Réaliste" },
            { id: "budget-pessimiste", name: "Pessimiste" },
          ]
          localStorage.setItem("modelisys_budgets", JSON.stringify(defaultBudgets))
          setBudgets(defaultBudgets)
          setSelectedBudgetId(defaultBudgets[0].id)
        }
      }
      loadBudgets()
      
      // Listen for storage changes
      const handleStorageChange = () => {
        loadBudgets()
      }
      window.addEventListener("storage", handleStorageChange)
      return () => window.removeEventListener("storage", handleStorageChange)
    }
  }, [selectedBudgetId])

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

  // Calculate summary metrics (mock data for now)
  const calculateMetrics = () => {
    const totalCapex = 144000
    const priorCapex = 120000
    const variation = calculateVariation(totalCapex, priorCapex)
    const totalAssets = 1440000
    const capexPercentage = (totalCapex / totalAssets) * 100
    
    // Calculate average Capex for trend views
    let averageCapex = 0
    if (view === "12months") {
      // Mock: average of 12 months
      averageCapex = (totalCapex + priorCapex) / 2 + (totalCapex - priorCapex) / 12 * 6
    } else if (view === "24months") {
      // Mock: average of 24 months
      averageCapex = (totalCapex + priorCapex) / 2 + (totalCapex - priorCapex) / 24 * 12
    } else if (view === "years") {
      // Mock: average of 6 years
      averageCapex = (totalCapex + priorCapex) / 2 + (totalCapex - priorCapex) / 6 * 3
    } else {
      averageCapex = (totalCapex + priorCapex) / 2
    }
    
    return {
      totalCapex,
      priorCapex,
      variation,
      capexPercentage,
      totalAssets,
      averageCapex
    }
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
        {/* Chart Section - Overlapping with dark section */}
        <div className="relative -mt-32">
          <CapexChart
            period={period}
            view={view}
            displayMode={displayMode}
            companyId={selectedCompanyId}
            divisionId={selectedDivisionId}
            subDivisionId={selectedSubDivisionId}
            companies={companiesData}
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
            companies={companiesData}
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
              companies={companiesData}
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

