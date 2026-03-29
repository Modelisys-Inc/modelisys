"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector } from "@/components/entity-selector"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calculator, Calendar, Loader2, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/financial-utils"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCompanies } from "@/hooks/use-companies"
import { useProjections } from "@/hooks/use-projections"
import {
  listForecastConfigs,
  upsertForecastConfig,
  listCompanies,
  type Company as ApiCompany,
} from "@/lib/api"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { getRowAmounts, aggregateToYears } from "@/lib/series-utils"

const scenariosNav = [
  { label: "Comparaison", href: "/scenarios" },
  { label: "VAN", href: "/scenarios/van" },
]

// ---------------------------------------------------------------------------
// NPV / IRR / Payback helpers
// ---------------------------------------------------------------------------

function computeNPV(rate: number, investment: number, cashFlows: number[]): number {
  let npv = -investment
  for (let t = 0; t < cashFlows.length; t++) {
    npv += cashFlows[t] / Math.pow(1 + rate, t + 1)
  }
  return npv
}

function computeIRR(investment: number, cashFlows: number[]): number | null {
  // Bisection method between -50% and 500%
  let low = -0.5
  let high = 5.0
  const maxIter = 200
  const tolerance = 0.0001

  let fLow = computeNPV(low, investment, cashFlows)
  let fHigh = computeNPV(high, investment, cashFlows)

  // If both same sign, IRR cannot be found in this range
  if (fLow * fHigh > 0) return null

  for (let i = 0; i < maxIter; i++) {
    const mid = (low + high) / 2
    const fMid = computeNPV(mid, investment, cashFlows)

    if (Math.abs(fMid) < tolerance) return mid

    if (fLow * fMid < 0) {
      high = mid
      fHigh = fMid
    } else {
      low = mid
      fLow = fMid
    }
  }

  return (low + high) / 2
}

function computePayback(investment: number, cashFlows: number[]): number | null {
  let cumulative = 0
  for (let t = 0; t < cashFlows.length; t++) {
    cumulative += cashFlows[t]
    if (cumulative >= investment) {
      // Interpolate within the year
      const excess = cumulative - investment
      const fraction = cashFlows[t] > 0 ? excess / cashFlows[t] : 0
      return t + 1 - fraction
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VANPage() {
  const { companies } = useCompanies()
  const pathname = usePathname()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [divisionId, setDivisionId] = useState<string | null>(null)
  const [subDivisionId, setSubDivisionId] = useState<string | null>(null)

  // Auto-select first company
  useEffect(() => {
    if (!companyId && companies.length > 0) {
      setCompanyId(companies[0].id)
    }
  }, [companies, companyId])

  // Load projections for the selected company
  const { projections, loading: projectionsLoading } = useProjections(companyId)

  const [selectedProjectionId, setSelectedProjectionId] = useState<string | null>(null)

  // Auto-select first projection when available
  useEffect(() => {
    if (projections.length > 0 && !selectedProjectionId) {
      setSelectedProjectionId(projections[0].id)
    } else if (projections.length === 0) {
      setSelectedProjectionId(null)
    }
  }, [projections, selectedProjectionId])

  // Fiscal year for historical data — default to previous year in Q1
  const now = new Date()
  const defaultFiscalYear = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear()
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<number>(defaultFiscalYear)

  // VAN assumptions
  const [discountRate, setDiscountRate] = useState<number>(10)
  const [investment, setInvestment] = useState<number>(0)
  const [saving, setSaving] = useState(false)
  const [configLoaded, setConfigLoaded] = useState(false)

  // Load saved VAN assumptions from forecast configs
  useEffect(() => {
    if (!companyId) return
    let cancelled = false

    listForecastConfigs(companyId, { config_type: "van-assumptions" })
      .then((configs) => {
        if (cancelled) return
        if (configs.length > 0) {
          const data = configs[0].data as { discount_rate?: number; investment?: number }
          if (typeof data.discount_rate === "number") setDiscountRate(data.discount_rate)
          if (typeof data.investment === "number") setInvestment(data.investment)
        }
        setConfigLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setConfigLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [companyId])

  // Persist assumptions when they change (debounced via save button)
  const handleSaveAssumptions = useCallback(async () => {
    if (!companyId) return
    setSaving(true)
    try {
      await upsertForecastConfig(companyId, {
        config_type: "van-assumptions",
        data: {
          discount_rate: discountRate,
          investment: investment,
        },
      })
    } catch {
      // Silently fail — the UI will show current local state
    } finally {
      setSaving(false)
    }
  }, [companyId, discountRate, investment])

  // Build cash flows from selected projection
  const selectedProjection = projections.find((p) => p.id === selectedProjectionId)
  const projectionYears = selectedProjection?.projection_years ?? 5

  // Fetch income-statement series to derive EBITDA-based cash flows
  const { rows: isRows, periods: isPeriods } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "income-statement",
    fiscalYear: selectedFiscalYear,
    months: 60, // 5 years of history
    enabled: !!companyId,
  })

  // Derive cash flows from real EBITDA data (annualized historical data projected forward)
  const cashFlows = useMemo<number[]>(() => {
    if (!selectedProjection) return []

    // Find EBITDA or operating income row from income statement
    const ebitdaRow = isRows.find((r) =>
      !r.isSection &&
      (r.label.toLowerCase().includes("baiia") ||
       r.label.toLowerCase().includes("ebitda") ||
       r.label.toLowerCase().includes("bénéfice d'exploitation") ||
       r.label.toLowerCase().includes("résultat d'exploitation") ||
       (r.isBold && r.label.toLowerCase().includes("bénéfice")))
    )

    if (ebitdaRow && isPeriods.length > 0) {
      // Get monthly amounts and annualize
      const monthlyAmounts = getRowAmounts(ebitdaRow, isPeriods)
      const yearAgg = aggregateToYears(monthlyAmounts, isPeriods)
      const annualAmounts = yearAgg.amounts.filter((a) => a !== 0)

      if (annualAmounts.length > 0) {
        // Use the most recent annual EBITDA as base, with observed growth rate
        const lastEBITDA = Math.abs(annualAmounts[annualAmounts.length - 1])
        let growthRate = 0.03 // default 3%
        if (annualAmounts.length >= 2) {
          const prevEBITDA = Math.abs(annualAmounts[annualAmounts.length - 2])
          if (prevEBITDA > 0) {
            growthRate = Math.max(-0.1, Math.min(0.2, (lastEBITDA - prevEBITDA) / prevEBITDA))
          }
        }

        return Array.from({ length: projectionYears }, (_, i) =>
          Math.round(lastEBITDA * Math.pow(1 + growthRate, i + 1))
        )
      }
    }

    // Fallback: if no EBITDA data available, show zeros (no simulated data)
    return Array.from({ length: projectionYears }, () => 0)
  }, [selectedProjection, projectionYears, isRows, isPeriods])

  // Calculations
  const rate = discountRate / 100
  const npv = useMemo(() => computeNPV(rate, investment, cashFlows), [rate, investment, cashFlows])
  const irr = useMemo(() => computeIRR(investment, cashFlows), [investment, cashFlows])
  const payback = useMemo(() => computePayback(investment, cashFlows), [investment, cashFlows])

  // Chart data — waterfall style
  const chartData = useMemo(() => {
    const data: Array<{ name: string; value: number; cumulative: number }> = []
    let cumulative = -investment

    data.push({
      name: "Investissement",
      value: -investment,
      cumulative,
    })

    cashFlows.forEach((cf, i) => {
      const discountedCF = cf / Math.pow(1 + rate, i + 1)
      cumulative += discountedCF
      data.push({
        name: `Année ${i + 1}`,
        value: Math.round(discountedCF),
        cumulative: Math.round(cumulative),
      })
    })

    data.push({
      name: "VAN",
      value: Math.round(npv),
      cumulative: Math.round(npv),
    })

    return data
  }, [investment, cashFlows, rate, npv])

  const isLoading = projectionsLoading || !configLoaded

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="VAN (Valeur Actuelle Nette)"
        description="Analysez la valeur actuelle nette de vos scenarios d'investissement"
      />
      <main className="w-full">
        {/* Dark header section with navigation tabs */}
        <div className="bg-slate-900 border-b border-slate-700 pt-6 pb-0">
          <div className="max-w-[1920px] mx-auto px-6">
            <div className="flex items-start gap-3 mb-8">
              <div className="w-2"></div>
              <div className="flex-1">
                <h2 className="text-4xl font-normal text-white mb-2 tracking-tight">
                  VAN (Valeur Actuelle Nette)
                </h2>
                <p className="text-base text-slate-300 mb-6">
                  Calculez la VAN, le TRI et le delai de recuperation de vos projets d'investissement
                </p>

                {/* Entity Selector + Fiscal Year */}
                <div className="mb-6 flex items-center gap-4">
                  <EntitySelector
                    companies={companies}
                    selectedCompanyId={companyId}
                    selectedDivisionId={divisionId}
                    selectedSubDivisionId={subDivisionId}
                    onCompanyChange={setCompanyId}
                    onDivisionChange={setDivisionId}
                    onSubDivisionChange={setSubDivisionId}
                  />
                  <div className="flex items-center gap-2 bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-1.5">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-medium text-slate-300">Année:</span>
                    <Select
                      value={selectedFiscalYear.toString()}
                      onValueChange={(v) => setSelectedFiscalYear(parseInt(v))}
                    >
                      <SelectTrigger className="h-8 w-[100px] bg-white/10 border-slate-600 text-white text-xs hover:bg-white/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => {
                          const year = now.getFullYear() - 7 + i
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

                {/* Navigation tabs */}
                <div className="flex items-end gap-8 mb-2">
                  {scenariosNav.map((item) => {
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
          </div>
        </div>

        {/* Content */}
        <div className="max-w-[1920px] mx-auto px-6 py-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Chargement...</span>
            </div>
          ) : projections.length === 0 ? (
            /* Empty state */
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-24">
                <Calculator className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">
                  Aucune donnee disponible
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Creez une projection dans Pro Forma pour effectuer l'analyse VAN
                </p>
                <Link href="/projections/pro-forma">
                  <Button>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Aller aux projections Pro Forma
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Projection selector + assumptions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Projection selector */}
                <Card>
                  <CardContent className="pt-6">
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Scenario de projection
                    </label>
                    <Select
                      value={selectedProjectionId ?? ""}
                      onValueChange={(v) => setSelectedProjectionId(v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selectionner une projection" />
                      </SelectTrigger>
                      <SelectContent>
                        {projections.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({p.projection_years} ans)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedProjection && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Mode : {selectedProjection.projection_mode} | Horizon : {selectedProjection.projection_years} ans
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Discount rate slider */}
                <Card>
                  <CardContent className="pt-6">
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Taux d'actualisation
                    </label>
                    <div className="flex items-center gap-4">
                      <Slider
                        min={0}
                        max={30}
                        step={0.5}
                        value={[discountRate]}
                        onValueChange={(v) => setDiscountRate(v[0])}
                        className="flex-1"
                      />
                      <span className="text-lg font-semibold text-foreground min-w-[60px] text-right">
                        {discountRate.toFixed(1)} %
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Cout moyen pondere du capital (CMPC) ou taux de rendement exige
                    </p>
                  </CardContent>
                </Card>

                {/* Investment amount */}
                <Card>
                  <CardContent className="pt-6">
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Investissement initial
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        step={1000}
                        value={investment || ""}
                        onChange={(e) =>
                          setInvestment(e.target.value === "" ? 0 : parseFloat(e.target.value))
                        }
                        placeholder="0"
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground">$</span>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleSaveAssumptions}
                        disabled={saving || !companyId}
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Calculator className="w-4 h-4 mr-1" />
                        )}
                        Enregistrer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Metric cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* NPV */}
                <Card
                  className={cn(
                    "border-l-4",
                    npv >= 0 ? "border-l-emerald-500" : "border-l-red-500"
                  )}
                >
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">
                      Valeur Actuelle Nette (VAN)
                    </p>
                    <p
                      className={cn(
                        "text-2xl font-bold",
                        npv >= 0 ? "text-emerald-600" : "text-red-600"
                      )}
                    >
                      {formatCurrency(Math.round(npv))}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {npv >= 0
                        ? "Projet rentable - VAN positive"
                        : "Projet non rentable - VAN negative"}
                    </p>
                  </CardContent>
                </Card>

                {/* IRR */}
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">
                      Taux de Rendement Interne (TRI)
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {irr !== null
                        ? `${(irr * 100).toFixed(2)} %`
                        : "N/D"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {irr !== null && irr > rate
                        ? "TRI superieur au taux d'actualisation"
                        : irr !== null
                        ? "TRI inferieur au taux d'actualisation"
                        : "Impossible de calculer le TRI"}
                    </p>
                  </CardContent>
                </Card>

                {/* Payback */}
                <Card className="border-l-4 border-l-amber-500">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">
                      Delai de recuperation
                    </p>
                    <p className="text-2xl font-bold text-amber-600">
                      {payback !== null
                        ? `${payback.toFixed(1)} ans`
                        : "N/D"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {payback !== null
                        ? `Investissement recupere en ${payback.toFixed(1)} ans`
                        : "Investissement non recupere sur la periode"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Cash flow waterfall chart */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    Flux de tresorerie actualises
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Visualisation du cumul des flux de tresorerie actualises au taux de {discountRate.toFixed(1)} %
                  </p>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 12 }}
                          stroke="#94a3b8"
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          stroke="#94a3b8"
                          tickFormatter={(v: number) =>
                            new Intl.NumberFormat("fr-CA", {
                              style: "currency",
                              currency: "CAD",
                              notation: "compact",
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 1,
                            }).format(v)
                          }
                        />
                        <Tooltip
                          formatter={(value: number) => [
                            formatCurrency(value),
                            "Montant",
                          ]}
                          labelStyle={{ fontWeight: 600 }}
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                          }}
                        />
                        <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.name === "VAN"
                                  ? entry.value >= 0
                                    ? "#10b981"
                                    : "#ef4444"
                                  : entry.name === "Investissement"
                                  ? "#ef4444"
                                  : "#3b82f6"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Detail table */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Detail des flux de tresorerie
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                            Periode
                          </th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                            Flux nominal
                          </th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                            Facteur d'actualisation
                          </th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                            Flux actualise
                          </th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                            Cumul actualise
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Investment row */}
                        <tr className="border-b bg-red-50">
                          <td className="py-3 px-4 font-medium">Investissement initial</td>
                          <td className="py-3 px-4 text-right text-red-600 font-medium">
                            {formatCurrency(-investment)}
                          </td>
                          <td className="py-3 px-4 text-right text-muted-foreground">
                            1,0000
                          </td>
                          <td className="py-3 px-4 text-right text-red-600 font-medium">
                            {formatCurrency(-investment)}
                          </td>
                          <td className="py-3 px-4 text-right text-red-600 font-medium">
                            {formatCurrency(-investment)}
                          </td>
                        </tr>
                        {/* Cash flow rows */}
                        {cashFlows.map((cf, i) => {
                          const factor = 1 / Math.pow(1 + rate, i + 1)
                          const discountedCF = cf * factor
                          const cumul =
                            -investment +
                            cashFlows
                              .slice(0, i + 1)
                              .reduce(
                                (acc, c, j) =>
                                  acc + c / Math.pow(1 + rate, j + 1),
                                0
                              )
                          return (
                            <tr key={i} className="border-b hover:bg-slate-50">
                              <td className="py-3 px-4 font-medium">
                                Annee {i + 1}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {formatCurrency(cf)}
                              </td>
                              <td className="py-3 px-4 text-right text-muted-foreground">
                                {factor.toFixed(4).replace(".", ",")}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {formatCurrency(Math.round(discountedCF))}
                              </td>
                              <td
                                className={cn(
                                  "py-3 px-4 text-right font-medium",
                                  cumul >= 0
                                    ? "text-emerald-600"
                                    : "text-red-600"
                                )}
                              >
                                {formatCurrency(Math.round(cumul))}
                              </td>
                            </tr>
                          )
                        })}
                        {/* NPV total row */}
                        <tr className="bg-slate-50 font-semibold">
                          <td className="py-3 px-4">VAN Totale</td>
                          <td className="py-3 px-4 text-right">
                            {formatCurrency(
                              Math.round(
                                cashFlows.reduce((a, b) => a + b, 0) - investment
                              )
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-muted-foreground">
                            --
                          </td>
                          <td
                            className={cn(
                              "py-3 px-4 text-right",
                              npv >= 0 ? "text-emerald-600" : "text-red-600"
                            )}
                          >
                            {formatCurrency(Math.round(npv))}
                          </td>
                          <td
                            className={cn(
                              "py-3 px-4 text-right",
                              npv >= 0 ? "text-emerald-600" : "text-red-600"
                            )}
                          >
                            {formatCurrency(Math.round(npv))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
