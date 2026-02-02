"use client"

import { useState } from "react"
import { WorkingCapitalDetail } from "@/components/working-capital-detail"
import { WorkingCapitalChart } from "@/components/working-capital-chart"
import { WorkingCapitalAnalysis } from "@/components/working-capital-analysis"
import { CashConversionChart } from "@/components/cash-conversion-chart"
import { CashConversionAnalysis } from "@/components/cash-conversion-analysis"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector } from "@/components/entity-selector"
import { useCompanies } from "@/hooks/use-companies"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Calendar, Filter } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

type Period = "monthly" | "quarterly" | "annual"
type View = "current" | "12months" | "24months" | "years"
type ColumnMode = "variations" | "percentage" | "comparison"
type AnalysisType = "fonds-de-roulement" | "conversion-encaisse"

export default function WorkingCapitalPage() {
  const { companies: companiesData } = useCompanies()
  const [period, setPeriod] = useState<Period>("monthly")
  const [view, setView] = useState<View>("current")
  const [columnMode, setColumnMode] = useState<ColumnMode>("variations")
  const [analysisType, setAnalysisType] = useState<AnalysisType>("fonds-de-roulement")
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null)
  const [selectedSubDivisionId, setSelectedSubDivisionId] = useState<string | null>(null)

  // Date reference state (month and year)
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1) // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear())

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

  // Determine card title and content based on view
  const getWorkingCapitalCardTitle = () => {
    if (view === "current") {
      return "Fonds de roulement"
    } else {
      return "Fonds de roulement actuel vs Moyen"
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
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-4xl font-normal text-white tracking-tight">Analyse du fonds de roulement</h2>
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
                Analysez votre fonds de roulement et votre besoin en fonds de roulement avec des indicateurs détaillés
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
                    <SelectItem value="courant">Courant</SelectItem>
                    <SelectItem value="12mois">12 mois</SelectItem>
                    <SelectItem value="24mois">24 mois</SelectItem>
                    <SelectItem value="annees">5 ans</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-slate-700" />

              {/* Analysis Type Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300 whitespace-nowrap">Type d'analyse:</span>
                <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800/50 p-1">
                  <Button
                    variant="ghost"
                    onClick={() => setAnalysisType("fonds-de-roulement")}
                    className={`h-8 text-xs px-3 transition-all ${
                      analysisType === "fonds-de-roulement"
                        ? "bg-emerald-500 text-white font-medium shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                    }`}
                  >
                    Fonds de roulement
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setAnalysisType("conversion-encaisse")}
                    className={`h-8 text-xs px-3 transition-all ${
                      analysisType === "conversion-encaisse"
                        ? "bg-emerald-500 text-white font-medium shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                    }`}
                  >
                    Conversion de l'encaisse
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
        {/* Conditional rendering based on analysisType */}
        {analysisType === "fonds-de-roulement" ? (
          <>
            {/* Chart Section - Overlapping with dark section */}
            <div className="relative -mt-32">
              <WorkingCapitalChart
                period={period}
                view={view}
                companyId={selectedCompanyId}
                divisionId={selectedDivisionId}
                subDivisionId={selectedSubDivisionId}
                companies={companiesData}
              />
            </div>
          </>
        ) : (
          <>
            {/* Cash Conversion Chart Section - Overlapping with dark section */}
            <div className="relative -mt-32">
              <CashConversionChart
                period={period}
                view={view}
                companyId={selectedCompanyId}
                divisionId={selectedDivisionId}
                subDivisionId={selectedSubDivisionId}
                companies={companiesData}
              />
            </div>
          </>
        )}
      </main>

      {/* Dark Section between Chart and Analysis - Only for fonds-de-roulement */}
      {analysisType === "fonds-de-roulement" && (
        <div className="w-full bg-slate-900 pt-12 pb-32">
          <div className="max-w-[1920px] mx-auto px-6">
            <div className="flex items-start gap-3">
              <div className="w-2 flex-shrink-0"></div>
              <div className="flex-1">
                <div>
                  <h3 className="text-2xl font-normal text-white mb-3">Optimisation du fonds de roulement</h3>
                  <p className="text-base text-slate-300 leading-relaxed max-w-4xl mb-6">
                    Le fonds de roulement est un indicateur clé de la santé financière de votre entreprise. Analysez les variations de vos actifs et passifs courants pour identifier les opportunités d'optimisation et améliorer votre liquidité opérationnelle.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dark Section between Chart and Analysis - Only for conversion-encaisse */}
      {analysisType === "conversion-encaisse" && (
        <div className="w-full bg-slate-900 pt-12 pb-32">
          <div className="max-w-[1920px] mx-auto px-6">
            <div className="flex items-start gap-3">
              <div className="w-2 flex-shrink-0"></div>
              <div className="flex-1">
                <div>
                  <h3 className="text-2xl font-normal text-white mb-3">Optimisation du cycle de conversion de l'encaisse</h3>
                  <p className="text-base text-slate-300 leading-relaxed max-w-4xl mb-6">
                    Le cycle de conversion de l'encaisse (CCC) mesure le temps nécessaire pour convertir vos investissements en stocks et créances en liquidités. Un CCC optimisé améliore votre trésorerie et votre capacité à financer vos opérations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="w-full py-8 px-6 max-w-[1920px] mx-auto">
        {analysisType === "fonds-de-roulement" ? (
          <>
            {/* Analysis Section - Overlapping with dark section */}
            <div className="relative -mt-32">
              <WorkingCapitalAnalysis
                period={period}
                view={view}
                companyId={selectedCompanyId}
                divisionId={selectedDivisionId}
                subDivisionId={selectedSubDivisionId}
                companies={companiesData}
              />

              {/* Detail Section */}
              <div className="mt-16 rounded-xl overflow-hidden shadow-sm border border-slate-200">
                <WorkingCapitalDetail
                  period={period}
                  view={view}
                  columnMode={columnMode}
                  companyId={selectedCompanyId}
                  divisionId={selectedDivisionId}
                  subDivisionId={selectedSubDivisionId}
                  companies={companiesData}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Cash Conversion Analysis Section - Overlapping with dark section */}
            <div className="relative -mt-32">
              <CashConversionAnalysis
                period={period}
                view={view}
                companyId={selectedCompanyId}
                divisionId={selectedDivisionId}
                subDivisionId={selectedSubDivisionId}
                companies={companiesData}
              />
            </div>
          </>
        )}
      </main>
    </div>
  )
}

