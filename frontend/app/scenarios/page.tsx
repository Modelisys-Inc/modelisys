"use client"

import { useState, useEffect, useMemo } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector } from "@/components/entity-selector"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Loader2, Layers, ArrowRight } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCompanies } from "@/hooks/use-companies"
import { useProjections } from "@/hooks/use-projections"
import { listCompanies, computeProjection, type Company as ApiCompany, type ProjectionComputeResult } from "@/lib/api"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

const scenariosNav = [
  { label: "Comparaison", href: "/scenarios" },
  { label: "VAN", href: "/scenarios/van" },
]

const COLORS = ["#10b981", "#3b82f6", "#f59e0b"]

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(0)}k`
  }
  return value.toFixed(0)
}

export default function ScenariosPage() {
  const { companies } = useCompanies()
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null)
  const [selectedSubDivisionId, setSelectedSubDivisionId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [apiCompanies, setApiCompanies] = useState<ApiCompany[]>([])
  const pathname = usePathname()

  // Auto-select first company
  useEffect(() => {
    if (!selectedCompanyId && companies.length > 0) {
      setSelectedCompanyId(companies[0].id)
    }
  }, [companies, selectedCompanyId])

  // Load API companies for name resolution
  useEffect(() => {
    listCompanies()
      .then(setApiCompanies)
      .catch(() => setApiCompanies([]))
  }, [])

  const { projections, loading } = useProjections(selectedCompanyId)
  const [computedResults, setComputedResults] = useState<Record<string, ProjectionComputeResult>>({})
  const [isComputing, setIsComputing] = useState(false)

  // Clear selection when company changes
  useEffect(() => {
    setSelectedIds([])
    setComputedResults({})
  }, [selectedCompanyId])

  // Compute projections when selection changes
  useEffect(() => {
    if (!selectedCompanyId || selectedIds.length === 0) {
      setComputedResults({})
      return
    }
    setIsComputing(true)
    Promise.all(
      selectedIds.map((id) => computeProjection(selectedCompanyId, id))
    )
      .then((results) => {
        const map: Record<string, ProjectionComputeResult> = {}
        results.forEach((r) => { map[r.projection_id] = r })
        setComputedResults(map)
        setIsComputing(false)
      })
      .catch(() => setIsComputing(false))
  }, [selectedIds, selectedCompanyId])

  const companyNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of apiCompanies) {
      map[c.id] = c.name
    }
    return map
  }, [apiCompanies])

  const toggleProjection = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((s) => s !== id)
      }
      if (prev.length >= 3) return prev
      return [...prev, id]
    })
  }

  const selectedProjections = useMemo(() => {
    return projections.filter((p) => selectedIds.includes(p.id))
  }, [projections, selectedIds])

  // Build comparison data from computed projection results
  const comparisonData = useMemo(() => {
    if (selectedProjections.length < 2) return null

    const maxYears = Math.max(...selectedProjections.map((p) => p.projection_years || 5))
    const currentYear = new Date().getFullYear()

    const metrics = [
      { key: "revenue", label: "Revenus", field: "total_revenue" as const },
      { key: "expenses", label: "Depenses", field: "total_expenses" as const },
      { key: "net_income", label: "Resultat net", field: "net_income" as const },
      { key: "ebitda", label: "BAIIA", field: "ebitda" as const },
      { key: "capex", label: "CAPEX", field: "capex" as const },
      { key: "free_cash_flow", label: "Flux de tresorerie libre", field: "free_cash_flow" as const },
    ]

    // Build per-year comparison rows
    const yearRows: Array<Record<string, string | number>> = []
    for (let y = 0; y < maxYears; y++) {
      const row: Record<string, string | number> = {
        year: `Annee ${y + 1} (${currentYear + y + 1})`,
      }
      for (const proj of selectedProjections) {
        const computed = computedResults[proj.id]
        if (computed) {
          const yearResult = computed.years[y]
          if (yearResult) {
            for (const metric of metrics) {
              row[`${proj.name}_${metric.key}`] = yearResult[metric.field]
            }
          }
        }
      }
      yearRows.push(row)
    }

    return { metrics, yearRows, maxYears }
  }, [selectedProjections, computedResults])

  // Build chart data for Recharts comparison
  const chartData = useMemo(() => {
    if (selectedProjections.length < 2) return []

    const maxYears = Math.max(...selectedProjections.map((p) => p.projection_years || 5))
    const currentYear = new Date().getFullYear()

    return Array.from({ length: maxYears }, (_, yearIdx) => {
      const entry: Record<string, string | number> = {
        name: `${currentYear + yearIdx + 1}`,
      }
      for (const proj of selectedProjections) {
        const computed = computedResults[proj.id]
        if (computed) {
          const yearResult = computed.years[yearIdx]
          if (yearResult) {
            entry[proj.name] = yearResult.total_revenue
          }
        }
      }
      return entry
    }).filter((entry) => Object.keys(entry).length > 1)
  }, [selectedProjections, computedResults])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <DashboardHeader title="Modelisys" />
      {/* Dark header section */}
      <div className="w-full bg-slate-900 pt-15 pb-32">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="flex items-start mb-4">
            <div className="w-2 flex-shrink-0"></div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-4xl font-normal text-white tracking-tight">Comparaison de scenarios</h2>
              </div>
              <p className="text-base text-slate-300 mb-6">
                Comparez vos projections financieres pour evaluer differents scenarios et prendre des decisions eclairees
              </p>
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

          {/* Entity selector */}
          <div className="mb-6 p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300 whitespace-nowrap">Entite:</span>
                <EntitySelector
                  companies={companies}
                  selectedCompanyId={selectedCompanyId}
                  selectedDivisionId={selectedDivisionId}
                  selectedSubDivisionId={selectedSubDivisionId}
                  onCompanyChange={(id) => {
                    setSelectedCompanyId(id)
                    setSelectedDivisionId(null)
                    setSelectedSubDivisionId(null)
                  }}
                  onDivisionChange={setSelectedDivisionId}
                  onSubDivisionChange={setSelectedSubDivisionId}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="w-full -mt-20 px-6 pb-12 max-w-[1920px] mx-auto">
        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        )}

        {/* Empty state */}
        {!loading && projections.length === 0 && (
          <Card className="bg-white border-slate-200 shadow-lg">
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="p-4 bg-slate-100 rounded-full mb-6">
                  <Layers className="w-12 h-12 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Aucune donnee disponible
                </h3>
                <p className="text-sm text-slate-500 mb-6 max-w-md">
                  Creez une projection dans Pro Forma pour pouvoir comparer differents scenarios financiers.
                </p>
                <Link href="/projections/pro-forma">
                  <Button className="gap-2">
                    Creer une projection
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Projection cards grid */}
        {!loading && projections.length > 0 && (
          <div className="space-y-8">
            {/* Selection instruction */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">
                  Selectionnez jusqu&apos;a 3 projections pour les comparer.{" "}
                  <span className="font-medium text-slate-900">{selectedIds.length}/3 selectionnees</span>
                </p>
              </div>
              {selectedIds.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds([])}
                  className="text-xs"
                >
                  Reinitialiser la selection
                </Button>
              )}
            </div>

            {/* Projection cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {projections.map((projection) => {
                const isSelected = selectedIds.includes(projection.id)
                const isDisabled = !isSelected && selectedIds.length >= 3
                const companyName = projection.company_id
                  ? companyNameMap[projection.company_id] || "N/A"
                  : "Toutes les societes"

                return (
                  <Card
                    key={projection.id}
                    className={`bg-white border-2 transition-all cursor-pointer hover:shadow-md ${
                      isSelected
                        ? "border-emerald-500 shadow-emerald-100 shadow-md"
                        : isDisabled
                        ? "border-slate-200 opacity-50 cursor-not-allowed"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    onClick={() => {
                      if (!isDisabled) toggleProjection(projection.id)
                    }}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="pt-0.5">
                          <Checkbox
                            checked={isSelected}
                            disabled={isDisabled}
                            onCheckedChange={() => {
                              if (!isDisabled) toggleProjection(projection.id)
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 text-sm truncate mb-2">
                            {projection.name}
                          </h3>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">Societe:</span>
                              <span className="text-xs font-medium text-slate-700 truncate">
                                {companyName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">Duree:</span>
                              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                {projection.projection_years} ans
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">Mode:</span>
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                {projection.projection_mode === "gl" ? "Par GL" : projection.projection_mode === "account" ? "Par Compte" : projection.projection_mode}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">Cree le:</span>
                              <span className="text-xs text-slate-600">
                                {new Date(projection.created_at).toLocaleDateString("fr-FR", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Comparison section - visible when 2+ projections selected */}
            {selectedProjections.length >= 2 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900">
                  Comparaison des projections
                </h3>

                {/* Computing spinner */}
                {isComputing && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400 mr-2" />
                    <span className="text-sm text-slate-500">Calcul des projections en cours...</span>
                  </div>
                )}

                {/* Summary comparison cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selectedProjections.map((proj, idx) => (
                    <Card key={proj.id} className="bg-white border-slate-200 shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[idx] }}
                          />
                          <h4 className="font-semibold text-sm text-slate-900 truncate">
                            {proj.name}
                          </h4>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Duree</span>
                            <span className="font-medium text-slate-700">{proj.projection_years} ans</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Mode</span>
                            <span className="font-medium text-slate-700">
                              {proj.projection_mode === "gl" ? "Par GL" : proj.projection_mode === "account" ? "Par Compte" : proj.projection_mode}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Societe</span>
                            <span className="font-medium text-slate-700 truncate ml-2">
                              {proj.company_id ? companyNameMap[proj.company_id] || "N/A" : "Toutes"}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Comparison chart - only show if chart data exists and not computing */}
                {!isComputing && chartData.length > 0 && (
                  <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="p-6">
                      <h4 className="font-semibold text-sm text-slate-900 mb-4">
                        Comparaison des revenus projetes
                      </h4>
                      <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
                            <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={formatCurrency} />
                            <Tooltip
                              formatter={(value: number) => [
                                new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(value),
                              ]}
                              contentStyle={{
                                backgroundColor: "white",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: "12px" }} />
                            {selectedProjections.map((proj, idx) => (
                              <Bar
                                key={proj.id}
                                dataKey={proj.name}
                                fill={COLORS[idx]}
                                radius={[4, 4, 0, 0]}
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Comparison table */}
                {!isComputing && (
                  <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="p-6">
                      <h4 className="font-semibold text-sm text-slate-900 mb-4">
                        Tableau comparatif par annee
                      </h4>

                      {comparisonData && comparisonData.yearRows.some((row) => Object.keys(row).length > 1) ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-200">
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                  Metrique
                                </th>
                                {Array.from({ length: comparisonData.maxYears }, (_, i) => (
                                  <th
                                    key={i}
                                    className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                                    colSpan={selectedProjections.length}
                                  >
                                    Annee {i + 1}
                                  </th>
                                ))}
                              </tr>
                              <tr className="border-b border-slate-100">
                                <th className="py-2 px-4"></th>
                                {Array.from({ length: comparisonData.maxYears }, (_, yearIdx) =>
                                  selectedProjections.map((proj, projIdx) => (
                                    <th
                                      key={`${yearIdx}-${proj.id}`}
                                      className="text-right py-2 px-3 text-xs font-medium"
                                      style={{ color: COLORS[projIdx] }}
                                    >
                                      {proj.name}
                                    </th>
                                  ))
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {comparisonData.metrics.map((metric) => (
                                <tr key={metric.key} className="border-b border-slate-50 hover:bg-slate-50/50">
                                  <td className="py-3 px-4 font-medium text-slate-700 text-xs">
                                    {metric.label}
                                  </td>
                                  {Array.from({ length: comparisonData.maxYears }, (_, yearIdx) =>
                                    selectedProjections.map((proj) => {
                                      const row = comparisonData.yearRows[yearIdx]
                                      const value = row?.[`${proj.name}_${metric.key}`]
                                      return (
                                        <td
                                          key={`${yearIdx}-${proj.id}-${metric.key}`}
                                          className="text-right py-3 px-3 text-xs text-slate-600 font-mono"
                                        >
                                          {typeof value === "number"
                                            ? new Intl.NumberFormat("fr-CA", {
                                                style: "currency",
                                                currency: "CAD",
                                                maximumFractionDigits: 0,
                                              }).format(value)
                                            : "—"}
                                        </td>
                                      )
                                    })
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-sm text-slate-500">
                            Les projections selectionnees ne contiennent pas encore de donnees detaillees par annee.
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Ajustez vos hypotheses dans Pro Forma pour generer des donnees comparatives.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Prompt to select more */}
            {selectedProjections.length === 1 && (
              <Card className="bg-white border-slate-200 border-dashed shadow-sm">
                <CardContent className="p-8">
                  <div className="text-center">
                    <p className="text-sm text-slate-500">
                      Selectionnez au moins une autre projection pour afficher la comparaison.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
