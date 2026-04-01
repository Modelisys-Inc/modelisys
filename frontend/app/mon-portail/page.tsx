"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Check, FolderOpen, Plus, X } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCompanies } from "@/hooks/use-companies"
import { createCompany, type Company as ApiCompany } from "@/lib/api"

type ConsolidatedGroup = {
  id: string
  name: string
  companyIds: string[]
}

export default function MonPortailPage() {
  const { companies: fetchedCompanies, loading } = useCompanies()
  const [companies, setCompanies] = useState(fetchedCompanies)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState("")
  const [newCompanyFiscalYearEnd, setNewCompanyFiscalYearEnd] = useState("12-31")
  const [newCompanyCurrency, setNewCompanyCurrency] = useState("CAD")
  const [creating, setCreating] = useState(false)
  const [groups, setGroups] = useState<ConsolidatedGroup[]>([])
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([])

  useEffect(() => {
    setCompanies(fetchedCompanies)
  }, [fetchedCompanies])

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

  function mapApiCompany(c: ApiCompany) {
    return {
      id: c.id,
      name: c.name,
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

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim() || creating) return
    setCreating(true)
    try {
      const created = await createCompany({
        name: newCompanyName.trim(),
        fiscal_year_end: newCompanyFiscalYearEnd,
        currency: newCompanyCurrency,
      })
      setCompanies((prev) => [...prev, mapApiCompany(created)])
      setNewCompanyName("")
      setNewCompanyFiscalYearEnd("12-31")
      setNewCompanyCurrency("CAD")
      setIsDialogOpen(false)
    } catch {
      alert("Erreur lors de la création de la société")
    } finally {
      setCreating(false)
    }
  }

  const toggleCompanyForGroup = (companyId: string, checked: boolean) => {
    setSelectedCompanyIds((prev) => {
      if (checked) {
        if (prev.includes(companyId)) return prev
        return [...prev, companyId]
      }
      return prev.filter((id) => id !== companyId)
    })
  }

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || selectedCompanyIds.length < 2) return
    const newGroup: ConsolidatedGroup = {
      id: crypto.randomUUID(),
      name: newGroupName.trim(),
      companyIds: selectedCompanyIds,
    }
    setGroups((prev) => [...prev, newGroup])
    setNewGroupName("")
    setSelectedCompanyIds([])
    setIsGroupDialogOpen(false)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />

      {/* Dark Header Section */}
      <div className="relative w-full pt-15 pb-40 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
            <div className="bg-[#2A2F3A]" />
            <div className="bg-[#1F2430]" />
          </div>
          <div className="absolute inset-y-0 left-1/2 hidden lg:block w-px bg-white/5" />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -left-28 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-24 -right-28 h-[480px] w-[480px] rounded-full bg-black/20 blur-3xl" />
          </div>
        </div>

        <div className="relative z-10 max-w-[1920px] mx-auto px-6">
          <div className="flex items-start gap-3 mb-8">
            <div className="w-2"></div>
            <div className="flex-1">
              <h2 className="text-4xl font-semibold text-[#E6D6C3] mb-2 tracking-tight">Mon portail</h2>
              <p className="text-base text-[#C9B8A5]/90 mb-6">
                Retrouvez toutes vos sociétés créées en un seul endroit.
              </p>
              <p className="text-base text-[#C9B8A5]/80 mb-6 leading-relaxed max-w-4xl">
                Cette vue vous permet de retrouver rapidement les sociétés de votre espace et d'accéder à leur fiche
                de configuration.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-[#E0742D] hover:bg-[#c96526] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle société
                </Button>
                <Button
                  onClick={() => setIsGroupDialogOpen(true)}
                  className="bg-[#E0742D] hover:bg-[#c96526] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau groupe consolidé
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Overlapping section */}
      <main className="relative -mt-32 mb-12">
        <div className="max-w-[1920px] mx-auto px-6">
          {loading ? (
            <div className="group relative overflow-hidden rounded-[28px] border-2 border-slate-700 bg-gradient-to-br from-white to-slate-50 shadow-lg mb-6">
              <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-[#E0742D]/[0.12]" />
              <div className="relative bg-white/90 px-8 py-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-[#2A2F3A] flex items-center justify-center transition-all duration-300">
                    <FolderOpen className="w-6 h-6 text-black group-hover:text-[#E6D6C3] transition-colors duration-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">Mes sociétés</h2>
                    <p className="text-sm text-slate-600">Liste des sociétés créées dans votre portail.</p>
                  </div>
                </div>
              </div>
              </div>
              <div className="relative p-6 bg-white">
                <p className="text-sm text-slate-500">Chargement des sociétés...</p>
              </div>
            </div>
          ) : companies.length === 0 ? (
            <div className="group relative overflow-hidden rounded-[28px] border-2 border-slate-700 bg-gradient-to-br from-white to-slate-50 shadow-lg mb-6">
              <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-[#E0742D]/[0.12]" />
              <div className="relative bg-white/90 px-8 py-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-[#2A2F3A] flex items-center justify-center transition-all duration-300">
                    <FolderOpen className="w-6 h-6 text-black group-hover:text-[#E6D6C3] transition-colors duration-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">Mes sociétés</h2>
                    <p className="text-sm text-slate-600">Liste des sociétés créées dans votre portail.</p>
                  </div>
                </div>
              </div>
              </div>
              <div className="relative p-10 text-center bg-white">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                <p className="text-base font-medium text-slate-700 mb-2">Aucune société créée</p>
                <p className="text-sm text-slate-500 mb-6">
                  Créez votre première société pour commencer.
                </p>
                <Link href="/settings/companies">
                  <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">Ajouter une société</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="group relative overflow-hidden rounded-[28px] border-2 border-slate-700 bg-gradient-to-br from-white to-slate-50 shadow-lg mb-6">
              <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-[#E0742D]/[0.12]" />
              <div className="relative bg-white/90 px-8 py-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-[#2A2F3A] flex items-center justify-center transition-all duration-300">
                    <FolderOpen className="w-6 h-6 text-black group-hover:text-[#E6D6C3] transition-colors duration-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">Mes sociétés</h2>
                    <p className="text-sm text-slate-600">Liste des sociétés créées dans votre portail.</p>
                  </div>
                </div>
              </div>
              </div>
              <div className="relative overflow-x-auto bg-white">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Société</th>
                        <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.map((company) => (
                        <tr key={company.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 font-semibold text-slate-900">{company.name}</td>
                          <td className="px-6 py-3 text-right">
                            <Link href={`/dashboard?companyId=${company.id}`}>
                              <span className="group inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-[#E0742D] transition hover:text-[#c96526]">
                                Voir
                                <ArrowRight className="w-4 h-4 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
                              </span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </div>
          )}

          {groups.length > 0 && (
          <div className="group relative overflow-hidden rounded-[28px] border-2 border-slate-700 bg-gradient-to-br from-white to-slate-50 shadow-lg mb-6">
            <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-[#E0742D]/[0.12]" />
            <div className="relative bg-white/90 px-8 py-6 border-b border-slate-200">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-[#2A2F3A] flex items-center justify-center transition-all duration-300">
                    <FolderOpen className="w-6 h-6 text-black group-hover:text-[#E6D6C3] transition-colors duration-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">Sommaire des groupes consolidés</h2>
                    <p className="text-sm text-slate-600">
                      Liste des groupes de sociétés consolidés configurés dans votre espace.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative overflow-x-auto bg-white">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm w-20">No.</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Nom du groupe</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Sociétés incluses</th>
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group, idx) => (
                    <tr key={group.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 text-sm text-slate-700">{idx + 1}</td>
                      <td className="px-6 py-3 font-semibold text-slate-900">{group.name}</td>
                      <td className="px-6 py-3 text-sm text-slate-700">
                        {group.companyIds
                          .map((id) => companies.find((c) => c.id === id)?.name)
                          .filter(Boolean)
                          .join(", ")}
                      </td>
                      <td className="px-6 py-3 text-right text-sm text-slate-500">-</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouvelle société</DialogTitle>
            <DialogDescription>Créez une nouvelle société et configurez ses paramètres de base</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Nom de la société</label>
              <Input
                placeholder="Nom de la société"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateCompany()
                }}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Fin d'année comptable</label>
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
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Devise</label>
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
              onClick={handleCreateCompany}
              disabled={!newCompanyName.trim() || creating}
              className="bg-[#E0742D] hover:bg-[#c96526] text-white"
            >
              <Check className="w-4 h-4 mr-2" />
              Créer la société
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouveau groupe consolidé</DialogTitle>
            <DialogDescription>
              Sélectionnez les sociétés actives à inclure dans le groupe consolidé.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Nom du groupe consolidé</label>
              <Input
                placeholder="Ex. Groupe ABC Inc. - Consolidé"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Sociétés à inclure</label>
              <div className="rounded-md border border-slate-200 p-4 space-y-3 max-h-52 overflow-y-auto">
                {companies.length === 0 ? (
                  <p className="text-sm text-slate-500">Aucune société disponible.</p>
                ) : (
                  companies.map((company) => {
                    const checked = selectedCompanyIds.includes(company.id)
                    return (
                      <label key={company.id} className="flex items-center gap-3 text-sm text-slate-700">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => toggleCompanyForGroup(company.id, Boolean(value))}
                        />
                        <span>{company.name}</span>
                      </label>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsGroupDialogOpen(false)
                setNewGroupName("")
                setSelectedCompanyIds([])
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim() || selectedCompanyIds.length < 2}
              className="bg-[#E0742D] hover:bg-[#c96526] text-white"
            >
              Créer le groupe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
