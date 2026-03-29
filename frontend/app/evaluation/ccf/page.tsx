"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector } from "@/components/entity-selector"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calculator, DollarSign, TrendingUp, AlertTriangle, Plus, Minus, Filter } from "lucide-react"
import { formatCurrency } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCompanies } from "@/hooks/use-companies"
import { getIncomeStatement, listCompanies, listForecastConfigs, upsertForecastConfig, type Company as ApiCompany } from "@/lib/api"
import { generateId } from "@/lib/seeded-random"

const evaluationNav = [
  { label: "Modèle d'affaires", href: "/evaluation/business-model" },
  { label: "Multiple du BAIIA", href: "/evaluation/ebitda-multiple" },
  { label: "Actif Corporel Net", href: "/evaluation/net-tangible-assets" },
  { label: "DCF", href: "/evaluation/dcf" },
  { label: "CCF", href: "/evaluation/ccf" },
  { label: "VCA", href: "/evaluation/vca" },
]

interface NormalizationAdjustment {
  id: string
  name: string
  amount: number
}

interface EBITDAYear {
  year: number
  ebitda: number
  weight: number
}

export default function CCFPage() {
  const { companies } = useCompanies()
  const pathname = usePathname()
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState<boolean>(false)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [divisionId, setDivisionId] = useState<string | null>(null)
  const [subDivisionId, setSubDivisionId] = useState<string | null>(null)

  // Auto-select first company
  useEffect(() => {
    if (!companyId && companies.length > 0) {
      setCompanyId(companies[0].id)
    }
  }, [companies, companyId])

  // Check if disclaimer was accepted in session storage
  useEffect(() => {
    const accepted = localStorage.getItem("ccf-disclaimer-accepted")
    if (accepted === "true") {
      setHasAcceptedDisclaimer(true)
    }
  }, [])

  const handleAcceptDisclaimer = () => {
    localStorage.setItem("ccf-disclaimer-accepted", "true")
    setHasAcceptedDisclaimer(true)
  }

  // Loading state for income statement data
  const [incomeDataLoading, setIncomeDataLoading] = useState(false)

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

  // Initialize with 5 years of data
  const [years, setYears] = useState<EBITDAYear[]>(() => {
    const yr = new Date().getFullYear()
    return [
      { year: yr - 4, ebitda: 0, weight: 1 },
      { year: yr - 3, ebitda: 0, weight: 2 },
      { year: yr - 2, ebitda: 0, weight: 3 },
      { year: yr - 1, ebitda: 0, weight: 4 },
      { year: yr, ebitda: 0, weight: 5 },
    ]
  })

  // CCF assumptions
  const [capitalizationRate, setCapitalizationRate] = useState<number>(15)
  const [taxRate, setTaxRate] = useState<number>(25)
  const [maintenanceCapex, setMaintenanceCapex] = useState<number>(0)
  const [adjustments, setAdjustments] = useState<NormalizationAdjustment[]>([])

  // Persist/load flag
  const [configLoaded, setConfigLoaded] = useState(false)

  // Fetch income statement data for all 5 years when company changes
  useEffect(() => {
    if (!companyId) {
      setYears(prev => prev.map(y => ({ ...y, ebitda: 0 })))
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

      const ebitdaByYear: Record<number, number> = {}

      results.forEach((res, idx) => {
        const fy = fiscalYears[idx]
        if (!res || !res.rows) {
          ebitdaByYear[fy] = 0
          return
        }

        // Find EBITDA/BAIIA row
        const ebitdaRow = res.rows.find(r =>
          (r.label.toLowerCase().includes("baiia") || r.label.toLowerCase().includes("ebitda")) && r.isResult
        ) || res.rows.find(r =>
          r.label.toLowerCase().includes("baiia") || r.label.toLowerCase().includes("ebitda")
        )
        ebitdaByYear[fy] = ebitdaRow ? ebitdaRow.current : 0
      })

      // Update years with correct FY labels and EBITDA data, keep weights
      setYears(prev => fiscalYears.map((fy, i) => ({
        year: fy,
        ebitda: ebitdaByYear[fy] || 0,
        weight: prev[i]?.weight ?? (i + 1),
      })))
      setIncomeDataLoading(false)
    })

    return () => { cancelled = true }
  }, [companyId, divisionId, subDivisionId, lastCompleteFY])

  // Load CCF assumptions from ForecastConfig
  useEffect(() => {
    if (!companyId) return
    let cancelled = false

    listForecastConfigs(companyId, {
      config_type: "ccf-assumptions",
      ...(divisionId ? { division_id: divisionId } : {}),
      ...(subDivisionId ? { sub_division_id: subDivisionId } : {}),
    })
      .then((configs) => {
        if (cancelled || configs.length === 0) {
          setConfigLoaded(true)
          return
        }
        const cfg = configs[0]
        const d = cfg.data as Record<string, unknown>
        if (typeof d.capitalizationRate === "number") setCapitalizationRate(d.capitalizationRate)
        if (typeof d.taxRate === "number") setTaxRate(d.taxRate)
        if (typeof d.maintenanceCapex === "number") setMaintenanceCapex(d.maintenanceCapex)
        if (Array.isArray(d.adjustments)) {
          setAdjustments(d.adjustments as NormalizationAdjustment[])
        }
        if (Array.isArray(d.weights)) {
          setYears(prev => prev.map((y, i) => ({
            ...y,
            weight: (d.weights as number[])[i] ?? y.weight,
          })))
        }
        setConfigLoaded(true)
      })
      .catch(() => {
        setConfigLoaded(true)
      })

    return () => { cancelled = true }
  }, [companyId, divisionId, subDivisionId])

  // Persist CCF assumptions to backend
  const persistConfig = useCallback(() => {
    if (!companyId || !configLoaded) return
    upsertForecastConfig(companyId, {
      config_type: "ccf-assumptions",
      data: {
        capitalizationRate,
        taxRate,
        maintenanceCapex,
        adjustments,
        weights: years.map(y => y.weight),
      } as Record<string, unknown>,
      ...(divisionId ? { division_id: divisionId } : {}),
      ...(subDivisionId ? { sub_division_id: subDivisionId } : {}),
    }).catch(console.error)
  }, [companyId, divisionId, subDivisionId, capitalizationRate, taxRate, maintenanceCapex, adjustments, years, configLoaded])

  // Debounced auto-save
  useEffect(() => {
    if (!configLoaded) return
    const timer = setTimeout(persistConfig, 800)
    return () => clearTimeout(timer)
  }, [persistConfig, configLoaded])

  // Calculations
  const totalWeight = useMemo(() => years.reduce((sum, y) => sum + y.weight, 0), [years])

  const weightedAverageEBITDA = useMemo(() => {
    if (totalWeight === 0) return 0
    return years.reduce((sum, y) => sum + y.ebitda * y.weight, 0) / totalWeight
  }, [years, totalWeight])

  const totalAdjustments = useMemo(() => {
    return adjustments.reduce((sum, adj) => sum + adj.amount, 0)
  }, [adjustments])

  const taxes = useMemo(() => {
    return weightedAverageEBITDA * (taxRate / 100)
  }, [weightedAverageEBITDA, taxRate])

  const normalizedCF = useMemo(() => {
    return weightedAverageEBITDA + totalAdjustments - taxes - maintenanceCapex
  }, [weightedAverageEBITDA, totalAdjustments, taxes, maintenanceCapex])

  const enterpriseValue = useMemo(() => {
    if (capitalizationRate === 0) return 0
    return normalizedCF / (capitalizationRate / 100)
  }, [normalizedCF, capitalizationRate])

  // Sensitivity analysis: cap rates from 5% to 30% in 2.5% steps
  const sensitivityRows = useMemo(() => {
    const rows: { rate: number; ev: number }[] = []
    for (let rate = 5; rate <= 30; rate += 2.5) {
      const ev = rate === 0 ? 0 : normalizedCF / (rate / 100)
      rows.push({ rate, ev })
    }
    return rows
  }, [normalizedCF])

  // Add/remove adjustments
  const addAdjustment = () => {
    setAdjustments(prev => [
      ...prev,
      { id: generateId("ccf-adj"), name: `Ajustement ${prev.length + 1}`, amount: 0 },
    ])
  }

  const removeAdjustment = (id: string) => {
    setAdjustments(prev => prev.filter(a => a.id !== id))
  }

  const updateAdjustmentName = (id: string, name: string) => {
    setAdjustments(prev => prev.map(a => a.id === id ? { ...a, name } : a))
  }

  const updateAdjustmentAmount = (id: string, amount: number) => {
    setAdjustments(prev => prev.map(a => a.id === id ? { ...a, amount } : a))
  }

  const updateWeight = (index: number, weight: number) => {
    setYears(prev => prev.map((y, i) => i === index ? { ...y, weight } : y))
  }

  // Track editing input for formatting
  const [editingInput, setEditingInput] = useState<string | null>(null)

  // Check if any year has data
  const hasData = years.some(y => y.ebitda !== 0)

  // Show disclaimer if not accepted
  if (!hasAcceptedDisclaimer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white flex items-center justify-center p-6">
        <div className="max-w-3xl w-full border-2 border-amber-200 shadow-xl rounded-xl bg-white">
          <div className="p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 rounded-full bg-amber-100 flex-shrink-0">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Avertissement important</h2>
                <p className="text-sm text-slate-600">Veuillez lire attentivement les informations suivantes avant de continuer</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                <p className="text-sm font-semibold text-amber-900 mb-2">Avis de non-responsabilité</p>
                <p className="text-sm text-amber-800 leading-relaxed">
                  Le processus de détermination de la valeur d&apos;entreprise présenté dans cette section est <strong>uniquement à des fins de consultation</strong> et ne représente en aucun cas un rapport d&apos;évaluation d&apos;entreprise conforme aux normes professionnelles établies par l&apos;Institut canadien des évaluateurs d&apos;entreprises (ICÉÉ) et les normes CBV (Chartered Business Valuator).
                </p>
              </div>

              <div className="space-y-3 text-sm text-slate-700">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0"></div>
                  <p>
                    Les calculs et estimations fournis sont basés sur des données et hypothèses que vous avez saisies et peuvent ne pas refléter la valeur réelle de votre entreprise.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0"></div>
                  <p>
                    Cette fonctionnalité ne constitue pas un avis professionnel en matière d&apos;évaluation d&apos;entreprise et ne doit pas être utilisée comme seule base pour prendre des décisions financières importantes.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0"></div>
                  <p>
                    Pour obtenir une évaluation d&apos;entreprise conforme aux normes professionnelles, vous devez consulter un évaluateur d&apos;entreprises certifié (CBV) ou un professionnel qualifié.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0"></div>
                  <p>
                    Les résultats présentés sont fournis &quot;tels quels&quot; sans garantie d&apos;exactitude, d&apos;exhaustivité ou de pertinence pour votre situation particulière.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-6">
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>Note :</strong> En continuant, vous reconnaissez avoir lu et compris cet avertissement et acceptez que les informations fournies sont à des fins de consultation uniquement et ne remplacent pas un avis professionnel en matière d&apos;évaluation d&apos;entreprise.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Retour
              </Button>
              <Button
                onClick={handleAcceptDisclaimer}
                className="bg-slate-900 hover:bg-slate-800 text-white px-8"
              >
                J&apos;ai compris, continuer
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />

      {/* Dark Header Section */}
      <div className="w-full bg-slate-900 pt-15 pb-40">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="flex items-start gap-3 mb-8">
            <div className="w-2"></div>
            <div className="flex-1">
              <h2 className="text-4xl font-normal text-white mb-2 tracking-tight">Flux de trésorerie capitalisé (CCF)</h2>
              <p className="text-base text-slate-300 mb-6 leading-relaxed max-w-4xl">
                Évaluez votre entreprise en capitalisant le flux de trésorerie normalisé. Cette méthode divise le flux de trésorerie
                normalisé par un taux de capitalisation pour estimer la valeur d&apos;entreprise.
              </p>
              {/* Navigation Menu */}
              <div className="flex items-end gap-8 mb-2">
                {evaluationNav.map((item) => {
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

              {/* Separator */}
              <div className="h-6 w-px bg-slate-700" />

              {/* Entity Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300 whitespace-nowrap">Entité:</span>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Enterprise Value */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-emerald-100">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">Valeur d&apos;entreprise</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(enterpriseValue)}</div>
                <p className="text-xs text-slate-500 mt-1">FT normalisé / Taux de capitalisation</p>
              </div>

              {/* Normalized CF */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">Flux de trésorerie normalisé</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(normalizedCF)}</div>
                <p className="text-xs text-slate-500 mt-1">Après ajustements, impôts et CapEx</p>
              </div>

              {/* Capitalization Rate */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-amber-100">
                    <Calculator className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">Taux de capitalisation</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">{capitalizationRate.toFixed(1)}%</div>
                <p className="text-xs text-slate-500 mt-1">Taux de rendement exigé</p>
              </div>

              {/* Weighted Average EBITDA */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-slate-100">
                    <Calculator className="w-5 h-5 text-slate-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">BAIIA moyen pondéré</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(weightedAverageEBITDA)}</div>
                <p className="text-xs text-slate-500 mt-1">Moyenne pondérée sur 5 ans</p>
              </div>
            </div>

            {/* EBITDA Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
              {/* Header */}
              <div className="bg-white px-8 py-6 border-b border-slate-200">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">
                      BAIIA historique - 5 derniers exercices
                    </h2>
                    <p className="text-sm text-slate-600">
                      BAIIA extrait des états des résultats avec pondération ajustable
                    </p>
                  </div>
                </div>
              </div>

              {!hasData && !incomeDataLoading ? (
                <div className="p-12 text-center">
                  <p className="text-slate-500 text-sm">Aucune donnée disponible</p>
                </div>
              ) : (
                <div className="overflow-x-auto bg-white">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm w-2/5">Métrique</th>
                        {years.map((year) => (
                          <th key={year.year} className="px-4 py-4 text-center font-semibold text-slate-900 text-sm">
                            {year.year}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* BAIIA Row */}
                      <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>BAIIA</span>
                            <span className="text-xs font-normal text-slate-500">(États des résultats)</span>
                          </div>
                        </td>
                        {years.map((year) => (
                          <td key={`ebitda-${year.year}`} className="px-4 py-3 text-center">
                            <span className="font-semibold text-slate-900 text-sm">
                              {formatCurrency(year.ebitda)}
                            </span>
                          </td>
                        ))}
                      </tr>

                      {/* Weight Row */}
                      <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-semibold text-slate-900">Pondération</td>
                        {years.map((year, index) => (
                          <td key={`weight-${year.year}`} className="px-4 py-3 text-center">
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={year.weight}
                              onChange={(e) => updateWeight(index, Math.max(0, Number(e.target.value)))}
                              className="w-20 mx-auto text-center text-sm font-semibold border-slate-300 focus:border-slate-500"
                            />
                          </td>
                        ))}
                      </tr>

                      {/* Weighted Value Row */}
                      <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors bg-slate-50">
                        <td className="px-6 py-3 font-semibold text-slate-900">Valeur pondérée</td>
                        {years.map((year) => (
                          <td key={`wval-${year.year}`} className="px-4 py-3 text-center">
                            <span className="font-semibold text-slate-900 text-sm">
                              {formatCurrency(year.ebitda * year.weight)}
                            </span>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Weighted average summary */}
              {hasData && (
                <div className="px-8 py-4 bg-slate-50 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">BAIIA moyen pondéré</span>
                    <span className="text-lg font-bold text-slate-900">{formatCurrency(weightedAverageEBITDA)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Somme des (BAIIA x Pondération) / Somme des pondérations = {formatCurrency(years.reduce((s, y) => s + y.ebitda * y.weight, 0))} / {totalWeight}
                  </p>
                </div>
              )}
            </div>

            {/* Normalization Adjustments */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
              {/* Header */}
              <div className="bg-white px-8 py-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-1 h-12 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">
                        Ajustements de normalisation
                      </h2>
                      <p className="text-sm text-slate-600">
                        Ajoutez des ajustements pour normaliser le flux de trésorerie (ex: salaire excédentaire du propriétaire, loyer hors marché)
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={addAdjustment}
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Ajouter un ajustement
                  </Button>
                </div>
              </div>

              <div className="p-6">
                {adjustments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-500 text-sm mb-3">Aucun ajustement de normalisation</p>
                    <Button
                      onClick={addAdjustment}
                      size="sm"
                      variant="outline"
                      className="text-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Ajouter un ajustement
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {adjustments.map((adj) => (
                      <div key={adj.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <Input
                          type="text"
                          value={adj.name}
                          onChange={(e) => updateAdjustmentName(adj.id, e.target.value)}
                          className="flex-1 text-sm border-slate-300 focus:border-slate-500"
                          placeholder="Nom de l'ajustement"
                        />
                        <Input
                          type="text"
                          value={
                            editingInput === `adj-${adj.id}`
                              ? adj.amount.toString()
                              : formatCurrency(adj.amount)
                          }
                          onChange={(e) => {
                            const rawValue = e.target.value.replace(/[^\d.-]/g, "")
                            const numValue = rawValue === "" || rawValue === "-" ? 0 : Number(rawValue)
                            updateAdjustmentAmount(adj.id, numValue)
                          }}
                          onFocus={(e) => {
                            setEditingInput(`adj-${adj.id}`)
                            e.target.value = adj.amount.toString()
                          }}
                          onBlur={() => setEditingInput(null)}
                          className="w-40 text-right text-sm font-mono border-slate-300 focus:border-slate-500"
                          placeholder="$0"
                        />
                        <Button
                          onClick={() => removeAdjustment(adj.id)}
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                      <span className="text-sm font-semibold text-slate-700">Total des ajustements</span>
                      <span className={cn("text-sm font-bold", totalAdjustments >= 0 ? "text-emerald-600" : "text-red-600")}>
                        {formatCurrency(totalAdjustments)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Assumptions */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
              {/* Header */}
              <div className="bg-white px-8 py-6 border-b border-slate-200">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-1 h-12 bg-amber-500 rounded-full flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">
                      Hypothèses
                    </h2>
                    <p className="text-sm text-slate-600">
                      Ajustez le taux de capitalisation, le taux d&apos;imposition et le CapEx de maintien
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Capitalization Rate */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-700">Taux de capitalisation</label>
                    <span className="text-sm font-bold text-slate-900">{capitalizationRate.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="0.5"
                    value={capitalizationRate}
                    onChange={(e) => setCapitalizationRate(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-slate-400">5%</span>
                    <span className="text-xs text-slate-400">30%</span>
                  </div>
                </div>

                {/* Tax Rate */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-700">Taux d&apos;imposition</label>
                    <span className="text-sm font-bold text-slate-900">{taxRate.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="0.5"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-slate-400">0%</span>
                    <span className="text-xs text-slate-400">50%</span>
                  </div>
                </div>

                {/* Maintenance CapEx */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-700">CapEx de maintien</label>
                  </div>
                  <Input
                    type="text"
                    value={
                      editingInput === "capex"
                        ? maintenanceCapex.toString()
                        : formatCurrency(maintenanceCapex)
                    }
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/[^\d.-]/g, "")
                      const numValue = rawValue === "" || rawValue === "-" ? 0 : Number(rawValue)
                      setMaintenanceCapex(numValue)
                    }}
                    onFocus={(e) => {
                      setEditingInput("capex")
                      e.target.value = maintenanceCapex.toString()
                    }}
                    onBlur={() => setEditingInput(null)}
                    className="w-48 text-right text-sm font-mono border-slate-300 focus:border-slate-500"
                    placeholder="$0"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Dépenses en capital nécessaires pour maintenir les opérations courantes
                  </p>
                </div>
              </div>
            </div>

            {/* Summary Calculation */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
              {/* Header */}
              <div className="bg-white px-8 py-6 border-b border-slate-200">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">
                      Calcul sommaire
                    </h2>
                    <p className="text-sm text-slate-600">
                      Du BAIIA pondéré à la valeur d&apos;entreprise
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto bg-white">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Étape</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Weighted EBITDA */}
                    <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-900 font-medium">BAIIA moyen pondéré</td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-900">{formatCurrency(weightedAverageEBITDA)}</td>
                    </tr>

                    {/* Adjustments */}
                    <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-900 font-medium">
                        <div className="flex items-center gap-2">
                          <span>+/- Ajustements de normalisation</span>
                          <span className="text-xs text-slate-500">({adjustments.length} élément{adjustments.length !== 1 ? "s" : ""})</span>
                        </div>
                      </td>
                      <td className={cn("px-6 py-4 text-right font-semibold", totalAdjustments >= 0 ? "text-emerald-600" : "text-red-600")}>
                        {totalAdjustments >= 0 ? "+" : ""}{formatCurrency(totalAdjustments)}
                      </td>
                    </tr>

                    {/* Taxes */}
                    <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-900 font-medium">
                        <div className="flex items-center gap-2">
                          <span>- Impôts</span>
                          <span className="text-xs text-slate-500">({taxRate.toFixed(1)}% du BAIIA pondéré)</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-red-600">-{formatCurrency(taxes)}</td>
                    </tr>

                    {/* Maintenance CapEx */}
                    <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-900 font-medium">- CapEx de maintien</td>
                      <td className="px-6 py-4 text-right font-semibold text-red-600">-{formatCurrency(maintenanceCapex)}</td>
                    </tr>

                    {/* Separator */}
                    <tr className="border-b-2 border-slate-300">
                      <td colSpan={2} className="py-0"></td>
                    </tr>

                    {/* Normalized CF */}
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <td className="px-6 py-4 text-slate-900 font-bold text-base">Flux de trésorerie normalisé</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900 text-base">{formatCurrency(normalizedCF)}</td>
                    </tr>

                    {/* Cap Rate */}
                    <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-900 font-medium">
                        <div className="flex items-center gap-2">
                          <span>/ Taux de capitalisation</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-900">{capitalizationRate.toFixed(1)}%</td>
                    </tr>

                    {/* Separator */}
                    <tr className="border-b-2 border-slate-300">
                      <td colSpan={2} className="py-0"></td>
                    </tr>

                    {/* Enterprise Value */}
                    <tr className="bg-emerald-50">
                      <td className="px-6 py-5 text-slate-900 font-bold text-lg">Valeur d&apos;entreprise</td>
                      <td className="px-6 py-5 text-right font-bold text-emerald-700 text-lg">{formatCurrency(enterpriseValue)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sensitivity Analysis */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
              {/* Header */}
              <div className="bg-white px-8 py-6 border-b border-slate-200">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-1 h-12 bg-slate-500 rounded-full flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">
                      Analyse de sensibilité
                    </h2>
                    <p className="text-sm text-slate-600">
                      Impact du taux de capitalisation sur la valeur d&apos;entreprise
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto bg-white">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Taux de capitalisation</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Valeur d&apos;entreprise</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensitivityRows.map((row) => {
                      const isSelected = Math.abs(row.rate - capitalizationRate) < 0.01
                      return (
                        <tr
                          key={row.rate}
                          className={cn(
                            "border-b border-slate-200 transition-colors cursor-pointer",
                            isSelected ? "bg-emerald-50 font-bold" : "hover:bg-slate-50"
                          )}
                          onClick={() => setCapitalizationRate(row.rate)}
                        >
                          <td className={cn("px-6 py-3 text-sm", isSelected ? "text-emerald-700 font-bold" : "text-slate-900")}>
                            {row.rate.toFixed(1)}%
                            {isSelected && <span className="ml-2 text-xs text-emerald-600">(sélectionné)</span>}
                          </td>
                          <td className={cn("px-6 py-3 text-right text-sm", isSelected ? "text-emerald-700 font-bold" : "text-slate-900 font-semibold")}>
                            {formatCurrency(row.ev)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
