"use client"

import { useState, useEffect, useMemo } from "react"
import { IncomeStatementSummary } from "@/components/income-statement-summary"
import { IncomeStatementDetail } from "@/components/income-statement-detail"
import { IncomeStatementChart } from "@/components/income-statement-chart"
import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector } from "@/components/entity-selector"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Filter, Calendar, TrendingUp, TrendingDown, ChevronRight } from "lucide-react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useCompanies } from "@/hooks/use-companies"
import { useFinancialStatementReferenceDate } from "@/hooks/use-financial-statement-reference-date"
import {
  listBudgets,
  listCompanies,
  listNotes,
  getIncomeStatement,
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

export default function IncomeStatementPage() {
  const { companies } = useCompanies()
  const [period, setPeriod] = useState<Period>("monthly")
  const [view, setView] = useState<View>("comparison")
  const [section, setSection] = useState<Section>("summary")
  const [columnMode, setColumnMode] = useState<ColumnMode>("variations")
  const [comparisonType, setComparisonType] = useState<ComparisonType>("lastMonth")
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null)
  const [selectedSubDivisionId, setSelectedSubDivisionId] = useState<string | null>(null)
  /**
   * Incrémenté après sauvegarde de la structure (Paramètres) pour relancer le fetch.
   * Déclaré ici avec les autres useState pour éviter « Cannot access before initialization ».
   */
  const [structureVersion, setStructureVersion] = useState(0)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const companyIdFromUrl = searchParams.get("companyId")
  const companyQuery = useMemo(() => {
    const p = new URLSearchParams()
    if (companyIdFromUrl) p.set("companyId", companyIdFromUrl)
    const rm = searchParams.get("refMonth")
    const ry = searchParams.get("refYear")
    if (rm) p.set("refMonth", rm)
    if (ry) p.set("refYear", ry)
    const s = p.toString()
    return s ? `?${s}` : ""
  }, [companyIdFromUrl, searchParams])
  const lockedCompanyId = companyIdFromUrl && companies.some((c) => c.id === companyIdFromUrl) ? companyIdFromUrl : null

  const { selectedMonth, selectedYear } = useFinancialStatementReferenceDate()

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
  // Track the resolved company ID (falls back to first company when none selected)
  const [resolvedCompanyId, setResolvedCompanyId] = useState<string | null>(null)

  useEffect(() => {
    if (lockedCompanyId && selectedCompanyId !== lockedCompanyId) {
      setSelectedCompanyId(lockedCompanyId)
      setSelectedDivisionId(null)
      setSelectedSubDivisionId(null)
    }
  }, [lockedCompanyId, selectedCompanyId])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const apiCompanies = await listCompanies()
        const companyId = lockedCompanyId || selectedCompanyId || apiCompanies[0]?.id
        setResolvedCompanyId(companyId || null)
        if (!companyId) {
          setRows([])
          return
        }

        // Determine the API period parameter based on the view
        // For YTD view, use "ytd" period; for DDM, use "annual" (last 12 months)
        let apiPeriod: string = period
        if (view === "ytd") {
          apiPeriod = "ytd"
        } else if (view === "ddm") {
          apiPeriod = "annual"
        }

        const params: FinancialStatementParams = {
          fiscal_year: selectedYear,
          month: selectedMonth,
          period: apiPeriod,
          comparison_type: comparisonType,
          budget_id: comparisonType === "budget" && selectedBudgetId ? selectedBudgetId : undefined,
          division_id: selectedDivisionId || undefined,
          sub_division_id: selectedSubDivisionId || undefined,
        }

        const response = await getIncomeStatement(companyId, {
          ...params,
          structure_rev: structureVersion,
        })
        setRows(response.rows)
      } catch (err) {
        console.error("Error fetching income statement data:", err)
        setRows([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [lockedCompanyId, selectedCompanyId, selectedYear, selectedMonth, period, view, comparisonType, selectedBudgetId, selectedDivisionId, selectedSubDivisionId, structureVersion])

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

  // --- Count notes from the API ---
  const [notesCount, setNotesCount] = useState(0)
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const apiCompanies = await listCompanies()
        const companyId = selectedCompanyId || apiCompanies[0]?.id
        if (!companyId) { setNotesCount(0); return }
        const notes = await listNotes(companyId, { page: "income-statement" })
        setNotesCount(notes.length)
      } catch {
        setNotesCount(0)
      }
    }
    fetchNotes()
  }, [selectedCompanyId])

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
        break
      case "ddm":
        setView("ddm")
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
      <div className="relative w-full pt-15 pb-32 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
            <div className="bg-[#2A2F3A]" />
            <div className="bg-[#2A2F3A]" />
          </div>
          <div className="absolute inset-y-0 left-1/2 hidden lg:block w-px bg-white/5" />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -left-28 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-24 -right-28 h-[480px] w-[480px] rounded-full bg-black/20 blur-3xl" />
          </div>
        </div>
        <div className="relative z-10 max-w-[1920px] mx-auto px-6">
          <div className="flex items-start mb-4">
            {/* Espace équivalent au bouton menu du header pour l'alignement */}
            <div className="w-2 flex-shrink-0"></div>
            <div className="flex-1">
              <div className="mb-2">
                <h2 className="text-4xl font-semibold tracking-tight text-[#E6D6C3]">Résultats comparatifs</h2>
              </div>
              <p className="text-base text-[#C9B8A5]/90 mb-6">Analysez vos revenus, dépenses et résultats nets avec des comparaisons périodiques détaillées</p>
              {/* Navigation Menu - Style like photo - Below description */}
              <div className="flex items-end gap-8 mb-2">
                {financialStatementsNav.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={`${item.href}${companyQuery}`}
                      className={`relative inline-block rounded-md px-3 py-1.5 -mx-1 pb-4 border-b border-slate-600/30 text-sm font-normal text-slate-200 transition-colors ${
                        !isActive ? "hover:bg-white/5 hover:text-slate-100" : "hover:bg-white/[0.04]"
                      }`}
                    >
                      {item.label}
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E0742D] z-10"></div>
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
              <div className="flex items-center gap-2 text-[#C9B8A5]/90">
                <Filter className="w-4 h-4" />
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#C9B8A5]/90 whitespace-nowrap">Vue:</span>
                <div className="inline-flex rounded-[10px] border border-white/10 bg-[#2A2F3A]/70 p-1 backdrop-blur-sm">
                  <Button
                    variant="ghost"
                    onClick={() => setSection("summary")}
                    className={`h-8 text-xs px-3 transition-all ${
                      section === "summary"
                        ? "bg-[#E0742D] text-white font-medium shadow-sm hover:bg-[#c96526]"
                        : "text-[#C9B8A5]/90 hover:bg-white/5 hover:text-[#E6D6C3]"
                    }`}
                  >
                    Sommaire
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setSection("detail")}
                    className={`h-8 text-xs px-3 transition-all ${
                      section === "detail"
                        ? "bg-[#E0742D] text-white font-medium shadow-sm hover:bg-[#c96526]"
                        : "text-[#C9B8A5]/90 hover:bg-white/5 hover:text-[#E6D6C3]"
                    }`}
                  >
                    Détail
                  </Button>
                </div>
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-white/10" />

              {/* Horizon and Comparison Group */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#C9B8A5]/90 whitespace-nowrap">Horizon:</span>
                <div className="flex gap-2 items-center">
                  <Select value={getCurrentHorizon()} onValueChange={handleHorizonChange}>
                    <SelectTrigger className="h-8 w-[140px] border border-white/10 bg-[#2A2F3A]/55 text-xs text-[#C9B8A5] hover:bg-white/5">
                      <Calendar className="mr-2 h-3.5 w-3.5 text-[#C9B8A5]/70" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="courant">Courant</SelectItem>
                      <SelectItem value="trimestriel">Trimestriel</SelectItem>
                      <SelectItem value="annuel">Annuel</SelectItem>
                      <SelectItem value="ytd">YTD</SelectItem>
                      <SelectItem value="ddm">DDM</SelectItem>
                      <SelectItem value="12mois">12 mois</SelectItem>
                      <SelectItem value="trimestres">Trimestres</SelectItem>
                      <SelectItem value="annees">Années</SelectItem>
                    </SelectContent>
                  </Select>
                  {(view === "comparison" || view === "ytd" || view === "ddm") && (
                    <>
                      <ChevronRight className="h-4 w-4 text-[#C9B8A5]/50" />
                      <Select value={comparisonType} onValueChange={(value) => {
                        setComparisonType(value as ComparisonType)
                        // Reset budget selection when switching away from budget
                        if (value !== "budget") {
                          setSelectedBudgetId(null)
                        }
                      }}>
                        <SelectTrigger className="h-8 w-[140px] border border-white/10 bg-[#2A2F3A]/55 text-xs text-[#C9B8A5] hover:bg-white/5">
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
                          <ChevronRight className="h-4 w-4 text-[#C9B8A5]/50" />
                          <Select 
                            value={selectedBudgetId || budgets[0].id} 
                            onValueChange={setSelectedBudgetId}
                          >
                            <SelectTrigger className="h-8 w-[140px] border border-white/10 bg-[#2A2F3A]/55 text-xs text-[#C9B8A5] hover:bg-white/5">
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
              <div className="h-6 w-px bg-white/10" />

              {/* Display Mode Buttons */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#C9B8A5]/90 whitespace-nowrap">Affichage:</span>
                <div className="inline-flex rounded-[10px] border border-white/10 bg-[#2A2F3A]/70 p-1 backdrop-blur-sm">
                  <Button
                    variant="ghost"
                    onClick={() => setColumnMode("variations")}
                    disabled={getCurrentHorizon() === "12mois" || getCurrentHorizon() === "trimestres" || getCurrentHorizon() === "annees"}
                    className={`h-8 text-xs px-3 transition-all ${
                      columnMode === "variations"
                        ? "bg-[#E0742D] text-white font-medium shadow-sm hover:bg-[#c96526]"
                        : "text-[#C9B8A5]/90 hover:bg-white/5 hover:text-[#E6D6C3]"
                    } disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-300`}
                  >
                    Variations
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setColumnMode("percentage")}
                    disabled={getCurrentHorizon() === "12mois" || getCurrentHorizon() === "trimestres" || getCurrentHorizon() === "annees"}
                    className={`h-8 text-xs px-3 transition-all ${
                      columnMode === "percentage"
                        ? "bg-[#E0742D] text-white font-medium shadow-sm hover:bg-[#c96526]"
                        : "text-[#C9B8A5]/90 hover:bg-white/5 hover:text-[#E6D6C3]"
                    } disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-300`}
                  >
                    % revenus
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setColumnMode("comparison")}
                    disabled={
                      getCurrentHorizon() === "12mois" || 
                      getCurrentHorizon() === "trimestres" || 
                      getCurrentHorizon() === "annees" ||
                      (!selectedCompanyId && !!selectedDivisionId) ||
                      (!selectedCompanyId && !!selectedSubDivisionId) ||
                      (!!selectedCompanyId && !!selectedDivisionId && !!selectedSubDivisionId)
                    }
                    className={`h-8 text-xs px-3 transition-all ${
                      columnMode === "comparison"
                        ? "bg-[#E0742D] text-white font-medium shadow-sm hover:bg-[#c96526]"
                        : "text-[#C9B8A5]/90 hover:bg-white/5 hover:text-[#E6D6C3]"
                    } disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-300`}
                  >
                    Comparaison
                  </Button>
                </div>
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-white/10" />

              {/* Entity Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#C9B8A5]/90 whitespace-nowrap">Entité:</span>
                <EntitySelector
                  companies={companies}
                  selectedCompanyId={selectedCompanyId}
                  selectedDivisionId={selectedDivisionId}
                  selectedSubDivisionId={selectedSubDivisionId}
                  onCompanyChange={(companyId) => {
                    if (lockedCompanyId) return
                    setSelectedCompanyId(companyId)
                  }}
                  onDivisionChange={setSelectedDivisionId}
                  onSubDivisionChange={setSelectedSubDivisionId}
                  disableCompanySelection={!!lockedCompanyId}
                  darkControlBar
                />
              </div>
            </div>
          </div>

        </div>
      </div>
      <main className="w-full py-8 px-6 max-w-[1920px] mx-auto">
        {/* Chart Section - Overlapping 25% in dark section */}
        <div className="relative -mt-32">
          <IncomeStatementChart
            period={period}
            view={view}
            companyId={selectedCompanyId || resolvedCompanyId}
            divisionId={selectedDivisionId}
            subDivisionId={selectedSubDivisionId}
            companies={companies}
            comparisonType={comparisonType}
            selectedBudgetId={comparisonType === "budget" ? selectedBudgetId : null}
            selectedBudgetName={comparisonType === "budget" && selectedBudgetId ? budgets.find(b => b.id === selectedBudgetId)?.name || null : null}
            fiscalYear={selectedYear}
            referenceMonth={selectedMonth}
            structureVersion={structureVersion}
          />
        </div>
      </main>

      {/* Dark Section between Chart and Summary/Detail */}
      <div className="relative w-full pt-12 pb-32 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
            <div className="bg-[#2A2F3A]" />
            <div className="bg-[#2A2F3A]" />
          </div>
          <div className="absolute inset-y-0 left-1/2 hidden lg:block w-px bg-white/5" />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -left-28 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-24 -right-28 h-[480px] w-[480px] rounded-full bg-black/20 blur-3xl" />
          </div>
        </div>
        <div className="relative z-10 max-w-[1920px] mx-auto px-6">
          <div className="flex items-start gap-3">
            <div className="w-2 flex-shrink-0"></div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-[#E6D6C3] mb-3">Documentation comptable continue</h3>
                  <p className="text-base text-[#C9B8A5]/90 leading-relaxed max-w-4xl">
                    Documentez les variations importantes tout au long de l'exercice pour faciliter votre clôture comptable annuelle et optimiser les processus d'évaluation d'entreprise et de transactions stratégiques.
                  </p>
                </div>
                <div className="flex items-center gap-4 ml-8">
                  <div className="text-right">
                    <div className="text-sm text-[#C9B8A5]/80 mb-1">Notes documentées</div>
                    <div className="text-3xl font-semibold text-[#E6D6C3]">{notesCount}</div>
                  </div>
                </div>
              </div>

              {/* Top 3 Variations */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topVariations.length > 0 ? topVariations.map((v, i) => {
                  const isPositive = v.variation >= 0
                  const labels = ["Variation la plus importante", "2e variation importante", "3e variation importante"]
                  return (
                    <div key={i} className="rounded-lg border border-white/10 bg-[#2A2F3A]/50 p-4 backdrop-blur-sm">
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
                      <div key={i} className="rounded-lg border border-white/10 bg-[#2A2F3A]/50 p-4 backdrop-blur-sm">
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
            <IncomeStatementSummary
              period={period}
              view={view}
              columnMode={columnMode}
              companyId={resolvedCompanyId}
              divisionId={selectedDivisionId}
              subDivisionId={selectedSubDivisionId}
              companies={companies}
              comparisonType={comparisonType}
              selectedBudgetId={comparisonType === "budget" ? selectedBudgetId : null}
              selectedBudgetName={comparisonType === "budget" && selectedBudgetId ? budgets.find(b => b.id === selectedBudgetId)?.name || null : null}
              fiscalYear={selectedYear}
              referenceMonth={selectedMonth}
              rows={rows}
              loading={loading}
              showIncomeStatementStructureSettings
              structureVersion={structureVersion}
              onIncomeStatementStructureSaved={() => setStructureVersion((v) => v + 1)}
            />
          ) : (
            <IncomeStatementDetail
              period={period}
              view={view}
              columnMode={columnMode}
              companyId={resolvedCompanyId}
              divisionId={selectedDivisionId}
              subDivisionId={selectedSubDivisionId}
              companies={companies}
              comparisonType={comparisonType}
              selectedBudgetId={comparisonType === "budget" ? selectedBudgetId : null}
              selectedBudgetName={comparisonType === "budget" && selectedBudgetId ? budgets.find(b => b.id === selectedBudgetId)?.name || null : null}
              fiscalYear={selectedYear}
              referenceMonth={selectedMonth}
              rows={rows}
              loading={loading}
              structureVersion={structureVersion}
              showIncomeStatementStructureSettings
              onIncomeStatementStructureSaved={() => setStructureVersion((v) => v + 1)}
            />
          )}
        </div>
      </main>
    </div>
  )
}
