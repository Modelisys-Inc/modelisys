"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector } from "@/components/entity-selector"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Calculator, DollarSign, TrendingUp, Filter, Percent, Activity } from "lucide-react"
import { formatCurrency } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useCompanies } from "@/hooks/use-companies"
import { ValuationPlanBackButton } from "@/components/valuation-plan-back-button"
import { getIncomeStatement, listCompanies, listForecastConfigs, upsertForecastConfig, type Company as ApiCompany } from "@/lib/api"

interface YearData {
  year: number
  revenue: number
  ebitda: number
  depreciation: number
}

interface DcfAssumptions {
  wacc: number
  terminalGrowth: number
  taxRate: number
  capexPercent: number
}

const DEFAULT_ASSUMPTIONS: DcfAssumptions = {
  wacc: 0.10,
  terminalGrowth: 0.02,
  taxRate: 0.25,
  capexPercent: 0.05,
}

export default function DCFPage() {
  const { companies } = useCompanies()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [divisionId, setDivisionId] = useState<string | null>(null)
  const [subDivisionId, setSubDivisionId] = useState<string | null>(null)

  // Auto-select first company
  useEffect(() => {
    if (!companyId && companies.length > 0) {
      setCompanyId(companies[0].id)
    }
  }, [companies, companyId])

  // Store raw API companies to access fiscal_year_end
  const [apiCompanies, setApiCompanies] = useState<ApiCompany[]>([])
  useEffect(() => {
    listCompanies().then(setApiCompanies).catch(() => {})
  }, [])

  // Compute the last complete fiscal year based on the selected company's fiscal year end
  const lastCompleteFY = useMemo(() => {
    const now = new Date()
    const curMonth = now.getMonth() + 1
    const curYear = now.getFullYear()
    if (!companyId) return curYear
    const company = apiCompanies.find(c => c.id === companyId)
    const fyEnd = company?.fiscal_year_end || "12-31"
    const fyEndMonth = parseInt(fyEnd.split("-")[0], 10) || 12
    const currentFY = curMonth <= fyEndMonth ? curYear : curYear + 1
    return currentFY - 1
  }, [companyId, apiCompanies])

  // IS data loading state
  const [incomeDataLoading, setIncomeDataLoading] = useState(false)
  const [yearData, setYearData] = useState<YearData[]>([])

  // Assumptions state
  const [assumptions, setAssumptions] = useState<DcfAssumptions>(DEFAULT_ASSUMPTIONS)
  const [configLoaded, setConfigLoaded] = useState(false)

  // Load persisted assumptions from ForecastConfig
  useEffect(() => {
    if (!companyId) return
    let cancelled = false

    listForecastConfigs(companyId, {
      config_type: "dcf-assumptions",
      ...(divisionId ? { division_id: divisionId } : {}),
      ...(subDivisionId ? { sub_division_id: subDivisionId } : {}),
    })
      .then((configs) => {
        if (cancelled) return
        if (configs.length > 0) {
          const d = configs[0].data as Partial<DcfAssumptions>
          setAssumptions({
            wacc: typeof d.wacc === "number" ? d.wacc : DEFAULT_ASSUMPTIONS.wacc,
            terminalGrowth: typeof d.terminalGrowth === "number" ? d.terminalGrowth : DEFAULT_ASSUMPTIONS.terminalGrowth,
            taxRate: typeof d.taxRate === "number" ? d.taxRate : DEFAULT_ASSUMPTIONS.taxRate,
            capexPercent: typeof d.capexPercent === "number" ? d.capexPercent : DEFAULT_ASSUMPTIONS.capexPercent,
          })
        } else {
          setAssumptions(DEFAULT_ASSUMPTIONS)
        }
        setConfigLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setConfigLoaded(true)
      })

    return () => { cancelled = true }
  }, [companyId, divisionId, subDivisionId])

  // Persist assumptions whenever they change (after initial load)
  const persistAssumptions = useCallback(
    (newAssumptions: DcfAssumptions) => {
      if (!companyId || !configLoaded) return
      upsertForecastConfig(companyId, {
        config_type: "dcf-assumptions",
        data: newAssumptions as unknown as Record<string, unknown>,
        ...(divisionId ? { division_id: divisionId } : {}),
        ...(subDivisionId ? { sub_division_id: subDivisionId } : {}),
      }).catch(console.error)
    },
    [companyId, divisionId, subDivisionId, configLoaded]
  )

  const updateAssumption = useCallback(
    (key: keyof DcfAssumptions, value: number) => {
      setAssumptions((prev) => {
        const next = { ...prev, [key]: value }
        persistAssumptions(next)
        return next
      })
    },
    [persistAssumptions]
  )

  // Fetch income statement data for all 5 years when company changes
  useEffect(() => {
    if (!companyId) {
      setYearData([])
      return
    }

    let cancelled = false
    setIncomeDataLoading(true)

    const fiscalYears = [lastCompleteFY - 4, lastCompleteFY - 3, lastCompleteFY - 2, lastCompleteFY - 1, lastCompleteFY]
    const promises = fiscalYears.map(fy =>
      getIncomeStatement(companyId, {
        fiscal_year: fy,
        period: "annual",
        ...(divisionId ? { division_id: divisionId } : {}),
        ...(subDivisionId ? { sub_division_id: subDivisionId } : {}),
      }).catch(() => null)
    )

    Promise.all(promises).then(results => {
      if (cancelled) return

      const data: YearData[] = results.map((res, idx) => {
        const fy = fiscalYears[idx]
        if (!res || !res.rows) {
          return { year: fy, revenue: 0, ebitda: 0, depreciation: 0 }
        }

        // Find Revenue row
        const revenueRow = res.rows.find(r =>
          r.label.toLowerCase().includes("revenu") && r.isResult
        ) || res.rows.find(r => r.label.toLowerCase().includes("revenu"))

        // Find EBITDA/BAIIA row
        const ebitdaRow = res.rows.find(r =>
          (r.label.toLowerCase().includes("baiia") || r.label.toLowerCase().includes("ebitda")) && r.isResult
        ) || res.rows.find(r =>
          r.label.toLowerCase().includes("baiia") || r.label.toLowerCase().includes("ebitda")
        )

        // Find Depreciation/Amortissement row
        const depreciationRow = res.rows.find(r =>
          (r.label.toLowerCase().includes("amortissement") || r.label.toLowerCase().includes("depreciation")) && r.isResult
        ) || res.rows.find(r =>
          r.label.toLowerCase().includes("amortissement") || r.label.toLowerCase().includes("depreciation")
        )

        return {
          year: fy,
          revenue: revenueRow ? revenueRow.current : 0,
          ebitda: ebitdaRow ? ebitdaRow.current : 0,
          depreciation: depreciationRow ? Math.abs(depreciationRow.current) : 0,
        }
      })

      setYearData(data)
      setIncomeDataLoading(false)
    })

    return () => { cancelled = true }
  }, [companyId, divisionId, subDivisionId, lastCompleteFY])

  // --- DCF calculations ---
  const hasData = yearData.length > 0 && yearData.some(y => y.ebitda !== 0 || y.revenue !== 0)

  const dcfResults = useMemo(() => {
    if (!hasData) return null

    const { wacc, terminalGrowth, taxRate, capexPercent } = assumptions

    // Calculate FCF for each year
    const yearResults = yearData.map((yd, idx) => {
      const capex = yd.revenue * capexPercent
      const fcf = yd.ebitda * (1 - taxRate) + yd.depreciation * taxRate - capex
      const t = idx + 1
      const pvFactor = 1 / Math.pow(1 + wacc, t)
      const pvFcf = fcf * pvFactor

      return {
        year: yd.year,
        revenue: yd.revenue,
        ebitda: yd.ebitda,
        depreciation: yd.depreciation,
        capex,
        fcf,
        pvFactor,
        pvFcf,
      }
    })

    // Terminal value based on last year's FCF
    const lastFcf = yearResults[yearResults.length - 1]?.fcf || 0
    const terminalValue = wacc > terminalGrowth
      ? (lastFcf * (1 + terminalGrowth)) / (wacc - terminalGrowth)
      : 0

    const pvTerminalValue = terminalValue / Math.pow(1 + wacc, yearResults.length)

    const pvOfFcfs = yearResults.reduce((sum, yr) => sum + yr.pvFcf, 0)
    const enterpriseValue = pvOfFcfs + pvTerminalValue
    const tvAsPercentOfEv = enterpriseValue !== 0 ? (pvTerminalValue / enterpriseValue) * 100 : 0

    return {
      yearResults,
      terminalValue,
      pvTerminalValue,
      pvOfFcfs,
      enterpriseValue,
      tvAsPercentOfEv,
    }
  }, [yearData, assumptions, hasData])

  // Chart data
  const chartData = useMemo(() => {
    if (!dcfResults) return []
    return dcfResults.yearResults.map(yr => ({
      name: yr.year.toString(),
      pvFcf: yr.pvFcf,
      fcf: yr.fcf,
    }))
  }, [dcfResults])

  // Sensitivity table: WACC rows x Terminal Growth columns
  const sensitivityData = useMemo(() => {
    if (!dcfResults) return { waccValues: [] as number[], tgValues: [] as number[], matrix: [] as number[][] }

    const baseWacc = assumptions.wacc
    const baseTg = assumptions.terminalGrowth

    const waccValues = [
      Math.max(0.01, baseWacc - 0.04),
      Math.max(0.01, baseWacc - 0.02),
      baseWacc,
      baseWacc + 0.02,
      baseWacc + 0.04,
    ]
    const tgValues = [
      Math.max(0, baseTg - 0.02),
      Math.max(0, baseTg - 0.01),
      baseTg,
      baseTg + 0.01,
      baseTg + 0.02,
    ]

    const { taxRate, capexPercent } = assumptions

    const matrix = waccValues.map(w => {
      return tgValues.map(tg => {
        // Recalculate EV for each WACC/TG combo
        const yrResults = yearData.map((yd, idx) => {
          const capex = yd.revenue * capexPercent
          const fcf = yd.ebitda * (1 - taxRate) + yd.depreciation * taxRate - capex
          const pvFcf = fcf / Math.pow(1 + w, idx + 1)
          return { fcf, pvFcf }
        })

        const lastFcf = yrResults[yrResults.length - 1]?.fcf || 0
        const tv = w > tg ? (lastFcf * (1 + tg)) / (w - tg) : 0
        const pvTv = tv / Math.pow(1 + w, yrResults.length)
        const sumPvFcf = yrResults.reduce((s, r) => s + r.pvFcf, 0)
        return sumPvFcf + pvTv
      })
    })

    return { waccValues, tgValues, matrix }
  }, [dcfResults, yearData, assumptions])

  // Format percentage for display
  const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />

      {/* Dark Header Section */}
      <div className="w-full bg-slate-900 pt-15 pb-40">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="flex items-start gap-3 mb-8">
            <div className="w-2"></div>
            <div className="flex-1">
              <ValuationPlanBackButton className="text-slate-300 hover:bg-white/5 hover:text-white" />
              <h2 className="text-4xl font-normal text-white mb-2 tracking-tight">Actualisation</h2>
              <p className="text-base text-slate-300 mb-6 leading-relaxed max-w-4xl">
                Evaluez la valeur de votre entreprise en actualisant les flux de tresorerie disponibles (Free Cash Flow)
                projetes sur un horizon de 5 ans, puis en ajoutant la valeur terminale actualisee. Ajustez le CMPC,
                le taux de croissance terminal et les hypotheses fiscales pour affiner votre estimation.
              </p>
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

              {/* Entity Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300 whitespace-nowrap">Entite:</span>
                <EntitySelector
                  companies={companies}
                  selectedCompanyId={companyId}
                  selectedDivisionId={divisionId}
                  selectedSubDivisionId={subDivisionId}
                  onCompanyChange={setCompanyId}
                  onDivisionChange={setDivisionId}
                  onSubDivisionChange={setSubDivisionId}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Overlapping section */}
      <div className="relative -mt-32 mb-12">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="space-y-6">

            {/* Metric Cards */}
            {hasData && dcfResults && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-emerald-100">
                      <DollarSign className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div className="text-xs text-slate-500 font-medium">Valeur d{"'"}entreprise</div>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{formatCurrency(dcfResults.enterpriseValue)}</div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <TrendingUp className="w-5 h-5 text-blue-700" />
                    </div>
                    <div className="text-xs text-slate-500 font-medium">VA des FTD</div>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{formatCurrency(dcfResults.pvOfFcfs)}</div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-purple-100">
                      <Calculator className="w-5 h-5 text-purple-700" />
                    </div>
                    <div className="text-xs text-slate-500 font-medium">Valeur terminale (VA)</div>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{formatCurrency(dcfResults.pvTerminalValue)}</div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-amber-100">
                      <Percent className="w-5 h-5 text-amber-700" />
                    </div>
                    <div className="text-xs text-slate-500 font-medium">VT en % de la VE</div>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{dcfResults.tvAsPercentOfEv.toFixed(1)}%</div>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!hasData && !incomeDataLoading && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-12 text-center">
                <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Aucune donnee disponible</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Aucune donnee d{"'"}etats des resultats n{"'"}a ete trouvee pour cette entreprise.
                  Veuillez d{"'"}abord importer une balance de verification et configurer le mappage des comptes.
                </p>
              </div>
            )}

            {incomeDataLoading && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-12 text-center">
                <div className="animate-pulse flex flex-col items-center">
                  <div className="w-12 h-12 bg-slate-200 rounded-full mb-4"></div>
                  <div className="h-4 bg-slate-200 rounded w-48 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-32"></div>
                </div>
              </div>
            )}

            {/* Assumptions / Inputs Section */}
            {hasData && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                <div className="bg-white px-8 py-6 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">
                        Hypotheses et parametres
                      </h2>
                      <p className="text-sm text-slate-600">
                        Ajustez les parametres du modele DCF pour affiner votre estimation de valeur
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* WACC Slider */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold text-slate-700">
                          CMPC (Cout moyen pondere du capital)
                        </Label>
                        <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                          {(assumptions.wacc * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Slider
                        value={[assumptions.wacc * 100]}
                        min={5}
                        max={20}
                        step={0.5}
                        onValueChange={(v) => updateAssumption("wacc", v[0] / 100)}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>5%</span>
                        <span>20%</span>
                      </div>
                    </div>

                    {/* Terminal Growth Slider */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold text-slate-700">
                          Taux de croissance terminal
                        </Label>
                        <span className="text-sm font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                          {(assumptions.terminalGrowth * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Slider
                        value={[assumptions.terminalGrowth * 100]}
                        min={0}
                        max={5}
                        step={0.25}
                        onValueChange={(v) => updateAssumption("terminalGrowth", v[0] / 100)}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>0%</span>
                        <span>5%</span>
                      </div>
                    </div>

                    {/* Tax Rate Input */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-700">
                        Taux d{"'"}imposition
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          max="60"
                          value={(assumptions.taxRate * 100).toFixed(1)}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value)
                            if (!isNaN(val) && val >= 0 && val <= 60) {
                              updateAssumption("taxRate", val / 100)
                            }
                          }}
                          className="w-32 text-center font-mono border-slate-300 focus:border-slate-500"
                        />
                        <span className="text-sm text-slate-500">%</span>
                      </div>
                      <p className="text-xs text-slate-400">Taux d{"'"}imposition effectif de l{"'"}entreprise</p>
                    </div>

                    {/* CapEx % of Revenue Input */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-700">
                        CapEx en % des revenus
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          max="50"
                          value={(assumptions.capexPercent * 100).toFixed(1)}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value)
                            if (!isNaN(val) && val >= 0 && val <= 50) {
                              updateAssumption("capexPercent", val / 100)
                            }
                          }}
                          className="w-32 text-center font-mono border-slate-300 focus:border-slate-500"
                        />
                        <span className="text-sm text-slate-500">%</span>
                      </div>
                      <p className="text-xs text-slate-400">Depenses en capital estimees en pourcentage des revenus</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DCF Table */}
            {hasData && dcfResults && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                <div className="bg-white px-8 py-6 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">
                        Detail des flux de tresorerie actualises
                      </h2>
                      <p className="text-sm text-slate-600">
                        Flux de tresorerie disponibles historiques et leur valeur actualisee
                      </p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm w-1/5">Metrique</th>
                        {dcfResults.yearResults.map((yr) => (
                          <th key={yr.year} className="px-4 py-4 text-center font-semibold text-slate-900 text-sm">
                            {yr.year}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Revenue */}
                      <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-semibold text-slate-900">Revenus</td>
                        {dcfResults.yearResults.map((yr) => (
                          <td key={`rev-${yr.year}`} className="px-4 py-3 text-center">
                            <span className="font-semibold text-slate-900 text-sm">{formatCurrency(yr.revenue)}</span>
                          </td>
                        ))}
                      </tr>

                      {/* EBITDA */}
                      <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-semibold text-slate-900">BAIIA</td>
                        {dcfResults.yearResults.map((yr) => (
                          <td key={`ebitda-${yr.year}`} className="px-4 py-3 text-center">
                            <span className="font-semibold text-slate-900 text-sm">{formatCurrency(yr.ebitda)}</span>
                          </td>
                        ))}
                      </tr>

                      {/* Depreciation */}
                      <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 text-slate-700">Amortissement</td>
                        {dcfResults.yearResults.map((yr) => (
                          <td key={`dep-${yr.year}`} className="px-4 py-3 text-center">
                            <span className="text-slate-700 text-sm">{formatCurrency(yr.depreciation)}</span>
                          </td>
                        ))}
                      </tr>

                      {/* CapEx */}
                      <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 text-slate-700">
                          <div className="flex items-center gap-2">
                            <span>CapEx</span>
                            <span className="text-xs text-slate-400">({(assumptions.capexPercent * 100).toFixed(1)}% rev.)</span>
                          </div>
                        </td>
                        {dcfResults.yearResults.map((yr) => (
                          <td key={`capex-${yr.year}`} className="px-4 py-3 text-center">
                            <span className="text-red-600 text-sm">({formatCurrency(yr.capex)})</span>
                          </td>
                        ))}
                      </tr>

                      {/* Separator */}
                      <tr className="border-b-2 border-slate-300">
                        <td className="px-6 py-1"></td>
                        {dcfResults.yearResults.map((yr) => (
                          <td key={`sep-${yr.year}`} className="px-4 py-1"></td>
                        ))}
                      </tr>

                      {/* FCF */}
                      <tr className="border-b border-slate-200 hover:bg-emerald-50 transition-colors bg-emerald-50/50">
                        <td className="px-6 py-3 font-bold text-slate-900">FTD (Free Cash Flow)</td>
                        {dcfResults.yearResults.map((yr) => (
                          <td key={`fcf-${yr.year}`} className="px-4 py-3 text-center">
                            <span className={cn("font-bold text-sm", yr.fcf >= 0 ? "text-emerald-700" : "text-red-600")}>
                              {formatCurrency(yr.fcf)}
                            </span>
                          </td>
                        ))}
                      </tr>

                      {/* PV Factor */}
                      <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 text-slate-600 italic">Facteur d{"'"}actualisation</td>
                        {dcfResults.yearResults.map((yr) => (
                          <td key={`pvf-${yr.year}`} className="px-4 py-3 text-center">
                            <span className="text-slate-600 text-sm">{yr.pvFactor.toFixed(4)}</span>
                          </td>
                        ))}
                      </tr>

                      {/* PV of FCF */}
                      <tr className="border-b border-slate-200 hover:bg-blue-50 transition-colors bg-blue-50/50">
                        <td className="px-6 py-3 font-bold text-slate-900">VA du FTD</td>
                        {dcfResults.yearResults.map((yr) => (
                          <td key={`pvfcf-${yr.year}`} className="px-4 py-3 text-center">
                            <span className={cn("font-bold text-sm", yr.pvFcf >= 0 ? "text-blue-700" : "text-red-600")}>
                              {formatCurrency(yr.pvFcf)}
                            </span>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Summary footer */}
                <div className="px-8 py-6 bg-slate-50 border-t border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Somme VA des FTD</div>
                      <div className="text-lg font-bold text-slate-900">{formatCurrency(dcfResults.pvOfFcfs)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Valeur terminale (non actualisee)</div>
                      <div className="text-lg font-bold text-slate-900">{formatCurrency(dcfResults.terminalValue)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">VA de la valeur terminale</div>
                      <div className="text-lg font-bold text-purple-700">{formatCurrency(dcfResults.pvTerminalValue)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Valeur d{"'"}entreprise (DCF)</div>
                      <div className="text-lg font-bold text-emerald-700">{formatCurrency(dcfResults.enterpriseValue)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Area Chart - PV of Cash Flows */}
            {hasData && dcfResults && chartData.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                <div className="bg-white px-8 py-6 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800">
                      <DollarSign className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Valeur actualisee des flux de tresorerie</h3>
                      <p className="text-xs text-slate-500">Evolution de la VA des FTD et des FTD nominaux par annee</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorPvFcf" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorFcf" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#64748b" />
                        <YAxis
                          stroke="#64748b"
                          tickFormatter={(value) => {
                            if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                            if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k`
                            return value.toString()
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1e293b",
                            border: "1px solid #334155",
                            borderRadius: "8px",
                            color: "#f1f5f9",
                            fontSize: "12px",
                          }}
                          formatter={(value: number, name: string) => [
                            formatCurrency(value),
                            name === "pvFcf" ? "VA du FTD" : "FTD",
                          ]}
                          labelFormatter={(label) => `Annee ${label}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="fcf"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorFcf)"
                          name="fcf"
                          strokeDasharray="5 5"
                        />
                        <Area
                          type="monotone"
                          dataKey="pvFcf"
                          stroke="#10b981"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorPvFcf)"
                          name="pvFcf"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="text-xs text-slate-600">VA du FTD (Valeur actualisee du flux de tresorerie disponible)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-dashed border-blue-300"></div>
                      <span className="text-xs text-slate-600">FTD nominal (flux de tresorerie disponible non actualise)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sensitivity Analysis Table */}
            {hasData && dcfResults && sensitivityData.waccValues.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                <div className="bg-white px-8 py-6 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">
                        Analyse de sensibilite
                      </h2>
                      <p className="text-sm text-slate-600">
                        Valeur d{"'"}entreprise selon differentes combinaisons de CMPC et taux de croissance terminal
                      </p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto p-6">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b-2 border-slate-300">
                          CMPC \ Croissance
                        </th>
                        {sensitivityData.tgValues.map((tg) => (
                          <th
                            key={`tg-${tg}`}
                            className={cn(
                              "px-4 py-3 text-center text-xs font-bold uppercase tracking-wider border-b-2 border-slate-300",
                              Math.abs(tg - assumptions.terminalGrowth) < 0.001
                                ? "text-emerald-700 bg-emerald-50"
                                : "text-slate-500"
                            )}
                          >
                            {fmtPct(tg)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sensitivityData.waccValues.map((w, wIdx) => (
                        <tr key={`wacc-${w}`} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                          <td
                            className={cn(
                              "px-4 py-3 font-semibold text-sm",
                              Math.abs(w - assumptions.wacc) < 0.001
                                ? "text-emerald-700 bg-emerald-50"
                                : "text-slate-700"
                            )}
                          >
                            {fmtPct(w)}
                          </td>
                          {sensitivityData.matrix[wIdx].map((ev, tgIdx) => {
                            const isCurrentCombo =
                              Math.abs(w - assumptions.wacc) < 0.001 &&
                              Math.abs(sensitivityData.tgValues[tgIdx] - assumptions.terminalGrowth) < 0.001

                            return (
                              <td
                                key={`ev-${w}-${sensitivityData.tgValues[tgIdx]}`}
                                className={cn(
                                  "px-4 py-3 text-center text-sm",
                                  isCurrentCombo
                                    ? "font-bold text-emerald-700 bg-emerald-100 ring-2 ring-emerald-400 ring-inset rounded"
                                    : "text-slate-700"
                                )}
                              >
                                {formatCurrency(ev)}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                    <div className="w-3 h-3 rounded bg-emerald-100 ring-2 ring-emerald-400"></div>
                    <span>Combinaison actuellement selectionnee (CMPC: {fmtPct(assumptions.wacc)}, Croissance: {fmtPct(assumptions.terminalGrowth)})</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
