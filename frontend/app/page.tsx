"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Building2, Calendar, DollarSign, ArrowRight, Plus, Check, X, Network, TrendingUp, Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/financial-utils"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { listCompanies, createCompany, getFinancialStatementSummary, type Company as ApiCompany, type SummaryMetrics } from "@/lib/api"

interface Company {
  id: string
  name: string
  fiscalYearEnd: string
  currency: string
  divisions: { id: string; name: string; subDivisions: { id: string; name: string }[] }[]
}

const fiscalYearEndOptions = [
  { value: "12-31", label: "31 décembre" },
  { value: "01-31", label: "31 janvier" },
  { value: "02-28", label: "28 février" },
  { value: "03-31", label: "31 mars" },
  { value: "04-30", label: "30 avril" },
  { value: "05-31", label: "31 mai" },
  { value: "06-30", label: "30 juin" },
  { value: "07-31", label: "31 juillet" },
  { value: "08-31", label: "31 août" },
  { value: "09-30", label: "30 septembre" },
  { value: "10-31", label: "31 octobre" },
  { value: "11-30", label: "30 novembre" },
]

const currencies = [
  { value: "CAD", label: "CAD - Dollar canadien" },
  { value: "USD", label: "USD - Dollar américain" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - Livre sterling" },
  { value: "CHF", label: "CHF - Franc suisse" },
  { value: "JPY", label: "JPY - Yen japonais" },
  { value: "AUD", label: "AUD - Dollar australien" },
]

function mapApiCompany(c: ApiCompany): Company {
  return {
    id: c.id,
    name: c.name,
    fiscalYearEnd: c.fiscal_year_end,
    currency: c.currency,
    divisions: (c.divisions || []).map((d) => ({
      id: d.id,
      name: d.name,
      subDivisions: (d.sub_divisions || []).map((s) => ({
        id: s.id,
        name: s.name,
      })),
    })),
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredCompany, setHoveredCompany] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState("")
  const [newCompanyFiscalYearEnd, setNewCompanyFiscalYearEnd] = useState("12-31")
  const [newCompanyCurrency, setNewCompanyCurrency] = useState("CAD")
  const [creating, setCreating] = useState(false)

  // Summary metrics per company
  const [summaryMetrics, setSummaryMetrics] = useState<Record<string, SummaryMetrics>>({})

  // Load companies from API
  useEffect(() => {
    listCompanies()
      .then((data) => setCompanies(data.map(mapApiCompany)))
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false))
  }, [])

  // Fetch summary metrics for each company
  useEffect(() => {
    if (companies.length === 0) return
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    companies.forEach((company) => {
      // Compute last complete fiscal year based on the company's fiscal year end
      const fyEndMonth = parseInt(company.fiscalYearEnd.split("-")[0], 10) || 12
      const currentFY = currentMonth <= fyEndMonth ? currentYear : currentYear + 1
      const lastCompleteFY = currentFY - 1

      getFinancialStatementSummary(company.id, lastCompleteFY)
        .then((metrics) => {
          setSummaryMetrics((prev) => ({ ...prev, [company.id]: metrics }))
        })
        .catch(() => {
          // No summary data available for this company
        })
    })
  }, [companies])

  const handleAddCompany = async () => {
    if (newCompanyName.trim() && !creating) {
      setCreating(true)
      try {
        const created = await createCompany({
          name: newCompanyName.trim(),
          fiscal_year_end: newCompanyFiscalYearEnd,
          currency: newCompanyCurrency,
        })
        const mapped = mapApiCompany(created)
        setCompanies((prev) => [...prev, mapped])
        // Reset form and close dialog
        setNewCompanyName("")
        setNewCompanyFiscalYearEnd("12-31")
        setNewCompanyCurrency("CAD")
        setIsDialogOpen(false)
        // Redirect to the new company page
        router.push(`/settings/companies/${created.id}`)
      } catch (e) {
        console.error("Error creating company:", e)
        alert("Erreur lors de la création de la société")
      } finally {
        setCreating(false)
      }
    }
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
              <h2 className="text-4xl font-normal text-white mb-2 tracking-tight">Configuration comptable</h2>
              <p className="text-base text-slate-300 mb-6">
                Gérez vos mappings comptables et importez vos balances de vérification
              </p>
              <p className="text-base text-slate-300 mb-6 leading-relaxed max-w-4xl">
                Configurez votre plateforme pour commencer à utiliser toutes les fonctionnalités. Gérez vos mappings comptables,
                importez vos balances de vérification en toute simplicité et définissez les correspondances entre vos comptes
                comptables et vos états financiers.
              </p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une société
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Companies Section - Overlapping section */}
      <div className="relative -mt-32 mb-12">
        <div className="max-w-[1920px] mx-auto px-6">
          <h3 className="text-lg font-medium text-white mb-4 ml-2">Sociétés</h3>
          {loading ? (
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardContent className="p-8">
                <div className="text-center py-12 text-slate-500">
                  <Loader2 className="w-12 h-12 mx-auto mb-4 text-slate-400 animate-spin" />
                  <p className="text-sm font-medium">Chargement des sociétés...</p>
                </div>
              </CardContent>
            </Card>
          ) : companies.length === 0 ? (
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardContent className="p-8">
                <div className="text-center py-12 text-slate-500">
                  <Building2 className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-sm font-medium mb-2">Aucune société configurée</p>
                  <p className="text-xs text-slate-400 mb-4">
                    Créez votre première société pour commencer
                  </p>
                  <Button
                    onClick={() => setIsDialogOpen(true)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter une société
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map((company) => {
                const isHovered = hoveredCompany === company.id
                const fiscalYearEndLabel = fiscalYearEndOptions.find(opt => opt.value === company.fiscalYearEnd)?.label || "31 décembre"

                return (
                  <Link key={company.id} href={`/settings/companies/${company.id}`}>
                    <Card
                      className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border border-slate-200 hover:border-slate-300 bg-white"
                      onMouseEnter={() => setHoveredCompany(company.id)}
                      onMouseLeave={() => setHoveredCompany(null)}
                    >
                      <CardContent className="p-6">
                        <div className="flex flex-col h-full">
                          <div
                            className={`w-14 h-14 rounded-xl bg-emerald-100 group-hover:bg-emerald-500 flex items-center justify-center mb-4 transition-all duration-300 ${
                              isHovered ? "scale-110 shadow-lg" : ""
                            }`}
                          >
                            <Building2 className={`w-7 h-7 text-emerald-500 group-hover:text-white transition-colors duration-300`} />
                          </div>

                          <h3 className="text-lg font-bold text-slate-900 mb-3 text-balance">{company.name}</h3>

                          <div className="space-y-2 mb-4 flex-grow">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span>Fin d'année: {fiscalYearEndLabel}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <DollarSign className="w-4 h-4 text-slate-400" />
                              <span>Devise: {company.currency || "CAD"}</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-2">
                              {company.divisions && company.divisions.length > 0
                                ? `${company.divisions.length} division${company.divisions.length > 1 ? "s" : ""}`
                                : "Aucune division"}
                            </div>
                          </div>

                          {/* Financial KPIs */}
                          {summaryMetrics[company.id] && (
                            <div className="space-y-1.5 mb-4 pt-3 border-t border-slate-100">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Revenus</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-medium text-slate-700">{formatCurrency(summaryMetrics[company.id].revenue)}</span>
                                  {summaryMetrics[company.id].revenueVariation !== 0 && (
                                    <span className={`text-[10px] font-medium ${summaryMetrics[company.id].revenueVariation >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                      {summaryMetrics[company.id].revenueVariation >= 0 ? "+" : ""}{summaryMetrics[company.id].revenueVariation.toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Revenu net</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-medium text-slate-700">{formatCurrency(summaryMetrics[company.id].netIncome)}</span>
                                  {summaryMetrics[company.id].netIncomeVariation !== 0 && (
                                    <span className={`text-[10px] font-medium ${summaryMetrics[company.id].netIncomeVariation >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                      {summaryMetrics[company.id].netIncomeVariation >= 0 ? "+" : ""}{summaryMetrics[company.id].netIncomeVariation.toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Actif total</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-medium text-slate-700">{formatCurrency(summaryMetrics[company.id].totalAssets)}</span>
                                  {summaryMetrics[company.id].totalAssetsVariation !== 0 && (
                                    <span className={`text-[10px] font-medium ${summaryMetrics[company.id].totalAssetsVariation >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                      {summaryMetrics[company.id].totalAssetsVariation >= 0 ? "+" : ""}{summaryMetrics[company.id].totalAssetsVariation.toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center text-slate-700 group-hover:text-slate-900 font-semibold text-sm group-hover:gap-3 gap-2 transition-all duration-300">
                            <span>Gérer</span>
                            <ArrowRight
                              className={`w-4 h-4 transition-transform duration-300 ${isHovered ? "translate-x-1" : ""}`}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Gestion des particularités */}
      <div className="relative mb-12">
        <div className="max-w-[1920px] mx-auto px-6">
          <h3 className="text-lg font-medium text-slate-900 mb-4 ml-2">Gestion des particularités</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Intercos Card */}
            <Link href="/intercos">
              <Card className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border border-slate-200 hover:border-slate-300 bg-white">
                <CardContent className="p-8">
                  <div className="flex flex-col h-full">
                    <div className="w-16 h-16 rounded-xl bg-emerald-100 group-hover:bg-emerald-500 flex items-center justify-center mb-5 transition-all duration-300">
                      <Network className="w-8 h-8 text-emerald-600 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3 text-balance">Intercos</h3>
                    <p className="text-slate-600 text-sm mb-6 flex-grow leading-relaxed text-pretty">
                      Gérez les transactions intercompagnies et les éliminations
                    </p>
                    <div className="flex items-center text-slate-700 group-hover:text-slate-900 font-semibold text-sm group-hover:gap-3 gap-2 transition-all duration-300">
                      <span>Accéder</span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Taux de change Card */}
            <Link href="/exchange-rates">
              <Card className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border border-slate-200 hover:border-slate-300 bg-white">
                <CardContent className="p-8">
                  <div className="flex flex-col h-full">
                    <div className="w-16 h-16 rounded-xl bg-blue-100 group-hover:bg-blue-500 flex items-center justify-center mb-5 transition-all duration-300">
                      <TrendingUp className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3 text-balance">Taux de change</h3>
                    <p className="text-slate-600 text-sm mb-6 flex-grow leading-relaxed text-pretty">
                      Configurez et gérez les taux de change pour vos devises
                    </p>
                    <div className="flex items-center text-slate-700 group-hover:text-slate-900 font-semibold text-sm group-hover:gap-3 gap-2 transition-all duration-300">
                      <span>Accéder</span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>

      {/* Add Company Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajouter une nouvelle société</DialogTitle>
            <DialogDescription>
              Créez une nouvelle société et configurez ses paramètres de base
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                Nom de la société
              </label>
              <Input
                placeholder="Nom de la société"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddCompany()
                  }
                }}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Fin d'année comptable
                </label>
                <Select value={newCompanyFiscalYearEnd} onValueChange={setNewCompanyFiscalYearEnd}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fiscalYearEndOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Devise
                </label>
                <Select value={newCompanyCurrency} onValueChange={setNewCompanyCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false)
                setNewCompanyName("")
                setNewCompanyFiscalYearEnd("12-31")
                setNewCompanyCurrency("CAD")
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            <Button
              onClick={handleAddCompany}
              disabled={!newCompanyName.trim() || creating}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Créer la société
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
