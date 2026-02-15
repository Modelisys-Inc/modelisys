"use client"

import { useState, useEffect, useMemo } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector } from "@/components/entity-selector"
import { useCompanies } from "@/hooks/use-companies"
import { useSuppliers } from "@/hooks/use-suppliers"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { findRow } from "@/lib/series-utils"
import { listCompanies, type Company as ApiCompany } from "@/lib/api"
import { ArrowLeft, Truck, Loader2, BarChart3 } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"

const analysisNav = [
  { label: "Marge par produit", href: "/analysis/product-margin" },
  { label: "Revenus par clients", href: "/analysis/revenue-by-customer" },
  { label: "Achats par fournisseur", href: "/analysis/purchases-by-supplier" },
]

const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"]

export default function PurchasesBySupplierPage() {
  const { companies: companiesData } = useCompanies()
  const pathname = usePathname()
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null)
  const [selectedSubDivisionId, setSelectedSubDivisionId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedCompanyId && companiesData.length > 0) {
      setSelectedCompanyId(companiesData[0].id)
    }
  }, [companiesData, selectedCompanyId])

  const { suppliers, loading: suppliersLoading } = useSuppliers(selectedCompanyId)

  const [apiCompanies, setApiCompanies] = useState<ApiCompany[]>([])
  useEffect(() => {
    listCompanies().then(setApiCompanies).catch(() => {})
  }, [])

  const lastCompleteFY = useMemo(() => {
    const now = new Date()
    const curMonth = now.getMonth() + 1
    const curYear = now.getFullYear()
    if (!selectedCompanyId) return curYear
    const company = apiCompanies.find(c => c.id === selectedCompanyId)
    const fyEnd = company?.fiscal_year_end || "12-31"
    const fyEndMonth = parseInt(fyEnd.split("-")[0], 10) || 12
    const currentFY = curMonth <= fyEndMonth ? curYear : curYear + 1
    return currentFY - 1
  }, [selectedCompanyId, apiCompanies])

  const { rows: totalRows, periods, loading: totalLoading } = useFinancialStatementSeries({
    companyId: selectedCompanyId,
    statementType: "income-statement",
    fiscalYear: lastCompleteFY,
    months: 12,
    divisionId: selectedDivisionId,
    subDivisionId: selectedSubDivisionId,
    enabled: !!selectedCompanyId,
  })

  const totalCOGS = useMemo(() => {
    if (totalRows.length === 0 || periods.length === 0) return 0
    const cogsRow = findRow(totalRows, "coût des ventes") || findRow(totalRows, "cost of sales") || findRow(totalRows, "achats")
    if (!cogsRow) return 0
    return periods.reduce((sum, p) => {
      const key = `${p.fiscalYear}-${p.fiscalMonth}`
      return sum + Math.abs(cogsRow.amounts[key] || 0)
    }, 0)
  }, [totalRows, periods])

  const monthlyChartData = useMemo(() => {
    if (totalRows.length === 0 || periods.length === 0) return []
    const cogsRow = findRow(totalRows, "coût des ventes") || findRow(totalRows, "cost of sales") || findRow(totalRows, "achats")
    if (!cogsRow) return []
    return periods.map(p => {
      const key = `${p.fiscalYear}-${p.fiscalMonth}`
      return { name: p.label, achats: Math.abs(cogsRow.amounts[key] || 0) }
    })
  }, [totalRows, periods])

  const loading = totalLoading || suppliersLoading

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Achats par fournisseur" description="Analysez vos dépenses par fournisseur" />
      <main className="w-full py-6">
        <div className="px-6">
          <div className="flex items-center gap-2 mb-6">
            <Link href="/analysis" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Retour</span>
            </Link>
            <div className="flex gap-1 ml-4">
              {analysisNav.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <EntitySelector
              companies={companiesData}
              selectedCompanyId={selectedCompanyId}
              selectedDivisionId={selectedDivisionId}
              selectedSubDivisionId={selectedSubDivisionId}
              onCompanyChange={(id) => { setSelectedCompanyId(id); setSelectedDivisionId(null); setSelectedSubDivisionId(null) }}
              onDivisionChange={setSelectedDivisionId}
              onSubDivisionChange={setSelectedSubDivisionId}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <Truck className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium text-muted-foreground mb-2">Aucun fournisseur configuré</p>
              <p className="text-sm text-muted-foreground">
                Ajoutez des fournisseurs dans les paramètres de l&apos;entreprise pour analyser les achats par fournisseur.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold mb-1">Achats totaux</h3>
                <p className="text-sm text-muted-foreground mb-4">Année fiscale {lastCompleteFY}</p>
                <div className="text-3xl font-bold text-red-600">
                  {totalCOGS.toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold mb-4">Fournisseurs ({suppliers.length})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {suppliers.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-3 py-1.5">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-sm font-medium">{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {monthlyChartData.length > 0 ? (
                <div className="bg-white rounded-lg border border-slate-200 p-6 lg:col-span-2">
                  <h3 className="text-lg font-semibold mb-4">Achats mensuels</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value: number) => [value.toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }), "Achats"]} />
                        <Bar dataKey="achats" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-slate-200 p-12 text-center lg:col-span-2">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Aucune donnée disponible</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
