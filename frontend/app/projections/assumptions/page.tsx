"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector } from "@/components/entity-selector"
import { Filter, Settings2, FileText, TrendingUp, Wallet, BarChart3, Calendar as CalendarIcon, Trash2 } from "lucide-react"
import { useCompanies } from "@/hooks/use-companies"
import { listForecastConfigs, deleteForecastConfig, type ForecastConfigData } from "@/lib/api"
import Link from "next/link"

const CONFIG_TYPE_META: Record<string, { label: string; description: string; icon: React.ReactNode; href: string }> = {
  "income-statement-detail": {
    label: "Projections des revenus et dépenses",
    description: "Ajustements et taux de croissance appliqués aux états des résultats",
    icon: <TrendingUp className="w-5 h-5" />,
    href: "/projections/revenue",
  },
  "capex-forecast": {
    label: "Projections Capex",
    description: "Estimations des dépenses en capital et investissements",
    icon: <BarChart3 className="w-5 h-5" />,
    href: "/projections/capex",
  },
  "debt-forecast": {
    label: "Projections des dettes",
    description: "Structure de financement et remboursements projetés",
    icon: <Wallet className="w-5 h-5" />,
    href: "/projections/debt",
  },
  "fdr-forecast": {
    label: "Projections du fonds de roulement",
    description: "Estimations du fonds de roulement et besoins en liquidités",
    icon: <FileText className="w-5 h-5" />,
    href: "/projections",
  },
  "seasonality": {
    label: "Saisonnalité",
    description: "Répartition mensuelle de la saisonnalité des revenus",
    icon: <CalendarIcon className="w-5 h-5" />,
    href: "/projections/revenue",
  },
  "net-tangible-assets-notes": {
    label: "Notes d'évaluation ACN",
    description: "Notes et ajustements pour l'évaluation de l'actif corporel net",
    icon: <Settings2 className="w-5 h-5" />,
    href: "/evaluation/net-tangible-assets",
  },
}

function getConfigMeta(configType: string) {
  return CONFIG_TYPE_META[configType] || {
    label: configType,
    description: "Configuration de projection",
    icon: <Settings2 className="w-5 h-5" />,
    href: "/projections",
  }
}

export default function AssumptionsPage() {
  const { companies } = useCompanies()
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null)
  const [selectedSubDivisionId, setSelectedSubDivisionId] = useState<string | null>(null)
  const [configs, setConfigs] = useState<ForecastConfigData[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedCompanyId && companies.length > 0) {
      setSelectedCompanyId(companies[0].id)
    }
  }, [companies, selectedCompanyId])

  const loadConfigs = useCallback(async () => {
    if (!selectedCompanyId) return
    setLoading(true)
    try {
      const data = await listForecastConfigs(selectedCompanyId)
      setConfigs(data)
    } catch {
      setConfigs([])
    } finally {
      setLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])

  const handleDelete = async (configId: string) => {
    if (!selectedCompanyId) return
    try {
      await deleteForecastConfig(selectedCompanyId, configId)
      setConfigs((prev) => prev.filter((c) => c.id !== configId))
    } catch {
      // ignore
    }
  }

  // Group configs by type
  const grouped = configs.reduce<Record<string, ForecastConfigData[]>>((acc, config) => {
    if (!acc[config.config_type]) acc[config.config_type] = []
    acc[config.config_type].push(config)
    return acc
  }, {})

  const sortedTypes = Object.keys(grouped).sort((a, b) => {
    const order = ["income-statement-detail", "capex-forecast", "debt-forecast", "fdr-forecast", "seasonality", "net-tangible-assets-notes"]
    return (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b))
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <DashboardHeader title="Hypothèses" description="Consultez et gérez toutes vos hypothèses de projection" />
      <main className="w-full py-8 px-6 max-w-[1920px] mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="flex items-center gap-2 text-slate-700">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Paramètres</span>
            </div>
            <div className="flex-1 flex gap-3 flex-wrap items-center">
              <div className="flex-1" />
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

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
            <p className="text-slate-500">Chargement...</p>
          </div>
        ) : sortedTypes.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
            <Settings2 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 text-lg font-medium">Aucune donnée disponible</p>
            <p className="text-slate-400 text-sm mt-2">
              Les hypothèses seront créées automatiquement lorsque vous configurerez vos projections.
            </p>
            <Link
              href="/projections/pro-forma"
              className="inline-block mt-4 px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition-colors"
            >
              Aller aux projections
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedTypes.map((configType) => {
              const meta = getConfigMeta(configType)
              const items = grouped[configType]
              const lastUpdated = items.reduce((latest, c) => {
                const d = new Date(c.updated_at)
                return d > latest ? d : latest
              }, new Date(0))

              return (
                <div key={configType} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="text-slate-600">{meta.icon}</div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{meta.label}</h3>
                        <p className="text-xs text-slate-500">{meta.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-400">
                        {items.length} config{items.length > 1 ? "s" : ""} — Modifié le{" "}
                        {lastUpdated.toLocaleDateString("fr-CA")}
                      </span>
                      <Link
                        href={meta.href}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Modifier
                      </Link>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {items.map((config) => {
                      const dataKeys = Object.keys(config.data || {})
                      const preview = dataKeys.slice(0, 4).join(", ")

                      return (
                        <div key={config.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50/50">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {config.division_id && (
                                <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-600 rounded">
                                  Division
                                </span>
                              )}
                              {config.sub_division_id && (
                                <span className="px-2 py-0.5 text-[10px] font-medium bg-purple-50 text-purple-600 rounded">
                                  Sous-division
                                </span>
                              )}
                              <span className="text-xs text-slate-500 truncate">
                                {preview ? `Clés: ${preview}${dataKeys.length > 4 ? ` +${dataKeys.length - 4}` : ""}` : "Configuration vide"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <span className="text-[10px] text-slate-400">
                              {new Date(config.updated_at).toLocaleDateString("fr-CA")}
                            </span>
                            <button
                              onClick={() => handleDelete(config.id)}
                              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
