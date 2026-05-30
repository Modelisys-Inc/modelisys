"use client"

import { useState, useEffect, useMemo } from "react"
import { BalanceSheetSummary } from "@/components/balance-sheet-summary"
import { BalanceSheetDetail } from "@/components/balance-sheet-detail"
import { StatementChart } from "@/components/statement-chart"
import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector } from "@/components/entity-selector"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, ChevronRight, Plus } from "lucide-react"
import { useStatementChartSlots } from "@/hooks/use-statement-chart-slots"
import { defaultChartCardTitle } from "@/lib/statement-chart-config"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useCompanies } from "@/hooks/use-companies"
import { useFinancialStatementReferenceDate } from "@/hooks/use-financial-statement-reference-date"
import {
  listBudgets,
  listCompanies,
  getBalanceSheet,
  type BudgetData,
  type FinancialStatementRow,
  type FinancialStatementParams,
} from "@/lib/api"
import { HORIZON_LABEL } from "@/lib/financial-statement-horizon-labels"

type Period = "monthly" | "quarterly" | "annual"
type View = "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years"
type Section = "dashboard" | "summary" | "detail"
type ColumnMode = "variationAmount" | "variationPercent" | "percentage" | "comparison"
type ComparisonType = "lastMonth" | "pastMonth" | "budget"

const financialStatementsNav = [
  { label: "Résultats", href: "/financial-statements/income-statement" },
  { label: "Bilan", href: "/financial-statements/balance-sheet" },
  { label: "Trésorerie", href: "/financial-statements/cash-flow" },
]

export default function BalanceSheetPage() {
  const { companies } = useCompanies()
  const [period, setPeriod] = useState<Period>("monthly")
  const [view, setView] = useState<View>("comparison")
  const [section, setSection] = useState<Section>("dashboard")
  const [columnMode, setColumnMode] = useState<ColumnMode>("variationAmount")
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null)
  const [selectedSubDivisionId, setSelectedSubDivisionId] = useState<string | null>(null)
  const [comparisonType, setComparisonType] = useState<ComparisonType>("lastMonth")
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null)
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

  const { selectedMonth, selectedYear } = useFinancialStatementReferenceDate({ skipUrlSync: true })

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

  // Guard against removed horizons lingering in state/URL.
  useEffect(() => {
    if (view === "ytd" || view === "ddm" || (view === "comparison" && period === "annual")) {
      setPeriod("monthly")
      setView("comparison")
      setColumnMode("variationAmount")
    }
  }, [view, period])

  // Tableau de bord : limiter aux horizons Mensuel (12 mois), Trimestriel 2 ans, Annuel 5 ans.
  useEffect(() => {
    if (section !== "dashboard") return
    const allowed = view === "12months" || view === "quarters" || view === "years"
    if (!allowed) {
      setView("12months")
      setColumnMode("variationAmount")
    }
  }, [section, view])

  // --- Fetch financial statement data from the API ---
  const [rows, setRows] = useState<FinancialStatementRow[]>([])
  const [loading, setLoading] = useState(false)
  const [resolvedCompanyId, setResolvedCompanyId] = useState<string | null>(null)
  /** Incrémenté après sauvegarde de la structure (Paramètres) pour relancer le fetch. */
  const [structureVersion, setStructureVersion] = useState(0)

  const effectiveCompanyId = selectedCompanyId || resolvedCompanyId

  const {
    slots: chartSlots,
    activeSlotId,
    setActiveSlotId,
    addSlot: addChartSlot,
    removeSlot: removeChartSlot,
    refresh: refreshChartSlots,
  } = useStatementChartSlots(effectiveCompanyId, "balance-sheet")

  const chartInstanceOptions = useMemo(() => {
    return chartSlots.map((s, i) => {
      const title = s.config.chartTitle.trim()
      const label = title || defaultChartCardTitle("balance-sheet") || `Graphique ${i + 1}`
      return { id: s.chartInstanceId, label }
    })
  }, [chartSlots])

  const activeSlot = chartSlots.find((s) => s.chartInstanceId === activeSlotId) ?? chartSlots[0]

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
          structure_rev: structureVersion > 0 ? structureVersion : undefined,
        }

        const response = await getBalanceSheet(companyId, params)
        setRows(response.rows)
      } catch (err) {
        console.error("Error fetching balance sheet data:", err)
        setRows([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [
    lockedCompanyId,
    selectedCompanyId,
    selectedYear,
    selectedMonth,
    period,
    view,
    comparisonType,
    selectedBudgetId,
    selectedDivisionId,
    selectedSubDivisionId,
    structureVersion,
  ])

  // Fonction pour obtenir la valeur actuelle du sélecteur Horizon
  const getCurrentHorizon = (): string => {
    if (view === "comparison" && period === "monthly") return "courant"
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
        setColumnMode("variationAmount")
        break
      case "12mois":
        setView("12months")
        setColumnMode("variationAmount")
        break
      case "trimestres":
        setView("quarters")
        setColumnMode("variationAmount")
        break
      case "annees":
        setView("years")
        setColumnMode("variationAmount")
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
                <h2 className="text-4xl font-semibold tracking-tight text-[#E6D6C3]">Bilans comparatifs</h2>
              </div>
              <p className="text-base text-[#C9B8A5]/90 mb-6">Visualisez la structure de vos actifs, passifs et capitaux propres avec des analyses comparatives</p>
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
          <div className="mb-6">
            <div className="rounded-2xl border border-white/10 bg-[#2A2F3A]/45 px-3 py-3 backdrop-blur-sm sm:px-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* View Toggle */}
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-[10px] border border-white/10 bg-[#2A2F3A]/70 p-1 backdrop-blur-sm">
                    <Button
                      variant="ghost"
                      onClick={() => setSection("dashboard")}
                      className={`h-8 text-xs px-3 transition-all ${
                        section === "dashboard"
                          ? "bg-[#E0742D] text-white font-medium shadow-sm hover:bg-[#c96526]"
                          : "text-[#C9B8A5]/90 hover:bg-white/5 hover:text-[#E6D6C3]"
                      }`}
                    >
                      Tableau de bord
                    </Button>
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

                {/* Horizon and Comparison Group */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-200 whitespace-nowrap">Horizon</span>
                  <div className="flex gap-2 items-center">
                    <Select value={getCurrentHorizon()} onValueChange={handleHorizonChange}>
                      <SelectTrigger className="h-8 w-[140px] border border-white/10 bg-[#2A2F3A]/55 text-xs text-[#C9B8A5] hover:bg-white/5">
                        <Calendar className="mr-2 h-3.5 w-3.5 text-[#C9B8A5]/70" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {section === "dashboard" ? (
                          <>
                            <SelectItem value="12mois">{HORIZON_LABEL.mensuel}</SelectItem>
                            <SelectItem value="trimestres">{HORIZON_LABEL.trimestriel2Ans}</SelectItem>
                            <SelectItem value="annees">{HORIZON_LABEL.annuel5Ans}</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="courant">{HORIZON_LABEL.moisActuel}</SelectItem>
                            <SelectItem value="12mois">{HORIZON_LABEL.mensuel}</SelectItem>
                            <SelectItem value="trimestres">{HORIZON_LABEL.trimestriel2Ans}</SelectItem>
                            <SelectItem value="annees">{HORIZON_LABEL.annuel5Ans}</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    {view === "comparison" && (
                      <>
                        <ChevronRight className="h-4 w-4 text-[#C9B8A5]/50" />
                        <Select
                          value={comparisonType}
                          onValueChange={(value) => {
                            setComparisonType(value as ComparisonType)
                            if (value !== "budget") setSelectedBudgetId(null)
                          }}
                        >
                          <SelectTrigger className="h-8 w-[140px] border border-white/10 bg-[#2A2F3A]/55 text-xs text-[#C9B8A5] hover:bg-white/5">
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
                            <ChevronRight className="h-4 w-4 text-[#C9B8A5]/50" />
                            <Select value={selectedBudgetId || budgets[0].id} onValueChange={setSelectedBudgetId}>
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

                {(section === "summary" || section === "detail") && (
                  <>
                    <span className="text-xs font-medium text-slate-200 whitespace-nowrap">Affichage</span>
                    <Select value={columnMode} onValueChange={(v) => setColumnMode(v as ColumnMode)}>
                      <SelectTrigger
                        className="h-8 w-[170px] border border-white/10 bg-[#2A2F3A]/55 text-xs text-[#C9B8A5] hover:bg-white/5"
                        aria-label="Affichage"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value="comparison"
                          disabled={
                            (!selectedCompanyId && !!selectedDivisionId) ||
                            (!selectedCompanyId && !!selectedSubDivisionId) ||
                            (!!selectedCompanyId && !!selectedDivisionId && !!selectedSubDivisionId)
                          }
                        >
                          {getCurrentHorizon() === "12mois" ||
                          getCurrentHorizon() === "trimestres" ||
                          getCurrentHorizon() === "annees"
                            ? "Réel"
                            : "Comparaison"}
                        </SelectItem>
                        <SelectItem value="variationAmount">Variation $</SelectItem>
                        <SelectItem value="variationPercent">Variation %</SelectItem>
                        <SelectItem value="percentage">
                          % actif
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}

                {/* Entity Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-200 whitespace-nowrap">Entités</span>
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
      </div>

      {section === "dashboard" && (
        <main className="w-full py-8 px-6 max-w-[1920px] mx-auto">
          <div className="relative -mt-32 space-y-6">
            {effectiveCompanyId ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addChartSlot()}
                  className="gap-1.5 border-slate-200 bg-white/90 text-slate-800 shadow-sm hover:bg-white"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Ajouter un graphique
                </Button>
              </div>
            ) : null}
            {activeSlot ? (
              <StatementChart
                statementType="balance-sheet"
                key={activeSlot.chartInstanceId}
                slot={activeSlot}
                chartSlotNumber={chartSlots.findIndex((s) => s.chartInstanceId === activeSlotId) + 1}
                chartSlotCount={chartSlots.length}
                chartInstanceOptions={chartInstanceOptions}
                onChartInstanceChange={setActiveSlotId}
                onChartConfigSaved={refreshChartSlots}
                onRemoveChart={
                  activeSlot.chartInstanceId !== "default" && chartSlots.length > 1
                    ? () => removeChartSlot(activeSlot.chartInstanceId)
                    : undefined
                }
                period={period}
                view={view}
                companyId={effectiveCompanyId}
                divisionId={selectedDivisionId}
                subDivisionId={selectedSubDivisionId}
                companies={companies}
                fiscalYear={selectedYear}
                structureVersion={structureVersion}
              />
            ) : null}
          </div>
        </main>
      )}

      {section === "summary" && (
        <main className="w-full py-8 px-6 max-w-[1920px] mx-auto">
          <div className="relative -mt-32">
            <BalanceSheetSummary
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
              refMonth={selectedMonth}
              refYear={selectedYear}
              rows={rows}
              loading={loading}
              showBalanceSheetStructureSettings
              showBalanceWarning
              structureVersion={structureVersion}
              onBalanceSheetStructureSaved={() => setStructureVersion((v) => v + 1)}
            />
          </div>
        </main>
      )}

      {section === "detail" && (
        <main className="w-full py-8 px-6 max-w-[1920px] mx-auto">
          <div className="relative -mt-32">
            <BalanceSheetDetail
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
              refMonth={selectedMonth}
              refYear={selectedYear}
              rows={rows}
              loading={loading}
            showBalanceSheetStructureSettings
            structureVersion={structureVersion}
            onBalanceSheetStructureSaved={() => setStructureVersion((v) => v + 1)}
            />
          </div>
        </main>
      )}
    </div>
  )
}

