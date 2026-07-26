"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { CapexChart, type CapexChartDataPoint } from "@/components/capex-chart"
import { CapexAnalysis } from "@/components/capex-analysis"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector } from "@/components/entity-selector"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Calendar } from "lucide-react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useCompanies } from "@/hooks/use-companies"
import { useFinancialStatementReferenceDate } from "@/hooks/use-financial-statement-reference-date"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { getRowAmounts, getPeriodLabels, aggregateToYears } from "@/lib/series-utils"
import { HORIZON_LABEL } from "@/lib/financial-statement-horizon-labels"

type Period = "monthly" | "quarterly" | "annual"
type View = "current" | "12months" | "24months" | "years"
type Section = "dashboard" | "summary"

const analysisNav = [
  { label: "Fonds de roulement", href: "/analysis/working-capital" },
  { label: "Capex", href: "/analysis/capex" },
  { label: "Marge par produits", href: "/analysis/product-margin" },
  { label: "Ratios", href: "/analysis/ratios" },
]

export default function CapexPage() {
  const { companies: companiesData } = useCompanies()
  const [period, setPeriod] = useState<Period>("monthly")
  const [view, setView] = useState<View>("12months")
  const [section, setSection] = useState<Section>("dashboard")
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null)
  const [selectedSubDivisionId, setSelectedSubDivisionId] = useState<string | null>(null)
  const [structureVersion, setStructureVersion] = useState(0)
  const summaryViewInitializedRef = useRef(false)

  const pathname = usePathname()
  const searchParams = useSearchParams()
  const companyIdFromUrl = searchParams.get("companyId")
  const lockedCompanyId =
    companyIdFromUrl && companiesData.some((c) => c.id === companyIdFromUrl) ? companyIdFromUrl : null

  const { selectedYear, selectedMonth } = useFinancialStatementReferenceDate({ skipUrlSync: true })

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

  useEffect(() => {
    if (lockedCompanyId && selectedCompanyId !== lockedCompanyId) {
      setSelectedCompanyId(lockedCompanyId)
      setSelectedDivisionId(null)
      setSelectedSubDivisionId(null)
    }
  }, [lockedCompanyId, selectedCompanyId])

  useEffect(() => {
    if (!selectedCompanyId && !lockedCompanyId && companiesData.length > 0) {
      setSelectedCompanyId(companiesData[0].id)
    }
  }, [companiesData, selectedCompanyId, lockedCompanyId])

  useEffect(() => {
    if (section !== "dashboard") return
    const allowed = view === "12months" || view === "24months" || view === "years"
    if (!allowed) setView("12months")
  }, [section, view])

  const applySummaryViewDefaults = useCallback(() => {
    setPeriod("monthly")
    setView("current")
  }, [])

  const selectSection = useCallback(
    (next: Section) => {
      if (next === "summary" && !summaryViewInitializedRef.current) {
        applySummaryViewDefaults()
        summaryViewInitializedRef.current = true
      }
      if (next === "dashboard" && view === "current") {
        setView("12months")
      }
      setSection(next)
    },
    [applySummaryViewDefaults, view],
  )

  const isMultiPeriod = view === "12months" || view === "24months" || view === "years"
  const monthsNeeded = view === "24months" ? 24 : view === "years" ? 60 : 12

  const { rows: seriesRows, periods, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: selectedCompanyId || null,
    statementType: "balance-sheet",
    fiscalYear: selectedYear,
    month: selectedMonth,
    months: monthsNeeded,
    divisionId: selectedDivisionId || null,
    subDivisionId: selectedSubDivisionId || null,
    enabled: !!selectedCompanyId,
  })

  const { rows: isRows, periods: isPeriods, loading: isLoading } = useFinancialStatementSeries({
    companyId: selectedCompanyId || null,
    statementType: "income-statement",
    fiscalYear: selectedYear,
    month: selectedMonth,
    months: monthsNeeded,
    divisionId: selectedDivisionId || null,
    subDivisionId: selectedSubDivisionId || null,
    enabled: !!selectedCompanyId,
  })

  const buildChartData = (): CapexChartDataPoint[] => {
    if (!isMultiPeriod || seriesRows.length === 0 || periods.length === 0) return []

    const totalRow = seriesRows.find(
      (r) => r.isBold && !r.isSection && r.label.toLowerCase().includes("total"),
    )
    if (!totalRow) return []

    const amounts = getRowAmounts(totalRow, periods)

    const depRow = isRows.find(
      (r) =>
        !r.isSection &&
        (r.label.toLowerCase().includes("amortissement") ||
          r.label.toLowerCase().includes("depreciation") ||
          r.label.toLowerCase().includes("dépréciation")),
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

  const getCurrentHorizon = (): string => {
    if (view === "current") return "courant"
    if (view === "12months") return "12mois"
    if (view === "24months") return "24mois"
    if (view === "years") return "annees"
    return "courant"
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <DashboardHeader title="Modelisys" />

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
            <div className="w-2 flex-shrink-0" />
            <div className="flex-1">
              <div className="mb-2">
                <h2 className="text-4xl font-semibold tracking-tight text-[#E6D6C3]">
                  Analyse des Capex
                </h2>
              </div>
              <p className="text-base text-[#C9B8A5]/90 mb-6">
                Analysez vos immobilisations et vos dépenses en capital avec des indicateurs détaillés
              </p>
              <div className="flex items-end gap-8 mb-2">
                {analysisNav.map((item) => {
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
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E0742D] z-10" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="rounded-2xl border border-white/10 bg-[#2A2F3A]/45 px-3 py-3 backdrop-blur-sm sm:px-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-[10px] border border-white/10 bg-[#2A2F3A]/70 p-1 backdrop-blur-sm">
                    <Button
                      variant="ghost"
                      onClick={() => selectSection("dashboard")}
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
                      onClick={() => selectSection("summary")}
                      className={`h-8 text-xs px-3 transition-all ${
                        section === "summary"
                          ? "bg-[#E0742D] text-white font-medium shadow-sm hover:bg-[#c96526]"
                          : "text-[#C9B8A5]/90 hover:bg-white/5 hover:text-[#E6D6C3]"
                      }`}
                    >
                      Sommaire
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-200 whitespace-nowrap">Horizon</span>
                  <Select value={getCurrentHorizon()} onValueChange={handleHorizonChange}>
                    <SelectTrigger className="h-8 w-[140px] border border-white/10 bg-[#2A2F3A]/55 text-xs text-[#C9B8A5] hover:bg-white/5">
                      <Calendar className="mr-2 h-3.5 w-3.5 text-[#C9B8A5]/70" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {section === "dashboard" ? (
                        <>
                          <SelectItem value="12mois">{HORIZON_LABEL.mensuel}</SelectItem>
                          <SelectItem value="24mois">24 mois</SelectItem>
                          <SelectItem value="annees">{HORIZON_LABEL.annuel5Ans}</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="courant">{HORIZON_LABEL.moisActuel}</SelectItem>
                          <SelectItem value="12mois">{HORIZON_LABEL.mensuel}</SelectItem>
                          <SelectItem value="24mois">24 mois</SelectItem>
                          <SelectItem value="annees">{HORIZON_LABEL.annuel5Ans}</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-200 whitespace-nowrap">Entités</span>
                  <EntitySelector
                    companies={companiesData}
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
          <div className="relative -mt-32">
            <CapexChart
              period={period}
              view={view}
              companyId={selectedCompanyId}
              divisionId={selectedDivisionId}
              subDivisionId={selectedSubDivisionId}
              companies={companiesData}
              chartData={chartData.length > 0 ? chartData : undefined}
              loading={seriesLoading || isLoading}
            />
          </div>
        </main>
      )}

      {section === "summary" && (
        <main className="w-full py-8 px-6 max-w-[1920px] mx-auto">
          <div className="relative -mt-32">
            <CapexAnalysis
              period={period}
              view={view}
              companyId={selectedCompanyId}
              divisionId={selectedDivisionId}
              subDivisionId={selectedSubDivisionId}
              companies={companiesData}
              fiscalYear={selectedYear}
              referenceMonth={selectedMonth}
              structureVersion={structureVersion}
              showStructureSettings
              onStructureSaved={() => setStructureVersion((v) => v + 1)}
            />
          </div>
        </main>
      )}
    </div>
  )
}
