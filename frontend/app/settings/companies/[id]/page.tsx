"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Calendar, DollarSign, Plus, Edit2, Trash2, X, Check, Loader2 } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter, usePathname } from "next/navigation"
import {
  getCompany,
  updateCompany,
  deleteCompany as deleteCompanyApi,
  createDivision as createDivisionApi,
  updateDivision as updateDivisionApi,
  deleteDivision as deleteDivisionApi,
  createSubDivision as createSubDivisionApi,
  updateSubDivision as updateSubDivisionApi,
  deleteSubDivision as deleteSubDivisionApi,
  type Company as ApiCompany,
} from "@/lib/api"

interface SubDivision {
  id: string
  name: string
}

interface Division {
  id: string
  name: string
  subDivisions: SubDivision[]
}

interface Company {
  id: string
  name: string
  fiscalYearEnd: string
  currency: string
  divisions: Division[]
}

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

export default function CompanySettingsPage() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const companyId = params.id as string
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [addingDivisionTo, setAddingDivisionTo] = useState(false)
  const [newDivisionName, setNewDivisionName] = useState("")
  const [editingDivisionId, setEditingDivisionId] = useState<string | null>(null)
  const [editingDivisionName, setEditingDivisionName] = useState("")
  const [addingSubDivisionTo, setAddingSubDivisionTo] = useState<string | null>(null)
  const [newSubDivisionName, setNewSubDivisionName] = useState("")
  const [editingSubDivisionId, setEditingSubDivisionId] = useState<string | null>(null)
  const [editingSubDivisionName, setEditingSubDivisionName] = useState("")
  const [editingFiscalYearEnd, setEditingFiscalYearEnd] = useState<string | null>(null)
  const [editingCurrency, setEditingCurrency] = useState<string | null>(null)
  const [editingCompanyName, setEditingCompanyName] = useState(false)
  const [editingName, setEditingName] = useState("")

  // Load company from API
  useEffect(() => {
    if (companyId) {
      setLoading(true)
      getCompany(companyId)
        .then((data) => setCompany(mapApiCompany(data)))
        .catch(() => router.push("/"))
        .finally(() => setLoading(false))
    }
  }, [companyId, router])

  const handleAddDivision = async () => {
    if (newDivisionName.trim() && company) {
      try {
        const created = await createDivisionApi(companyId, { name: newDivisionName.trim() })
        const newDivision: Division = {
          id: created.id,
          name: created.name,
          subDivisions: (created.sub_divisions || []).map((s) => ({ id: s.id, name: s.name })),
        }
        setCompany({ ...company, divisions: [...company.divisions, newDivision] })
        setNewDivisionName("")
        setAddingDivisionTo(false)
      } catch (e) {
        console.error("Error creating division:", e)
      }
    }
  }

  const handleStartEditDivision = (division: Division) => {
    setEditingDivisionId(division.id)
    setEditingDivisionName(division.name)
  }

  const handleSaveEditDivision = async (divisionId: string) => {
    if (editingDivisionName.trim() && company) {
      try {
        await updateDivisionApi(divisionId, { name: editingDivisionName.trim() })
        setCompany({
          ...company,
          divisions: company.divisions.map((d) =>
            d.id === divisionId ? { ...d, name: editingDivisionName.trim() } : d
          ),
        })
        setEditingDivisionId(null)
        setEditingDivisionName("")
      } catch (e) {
        console.error("Error updating division:", e)
      }
    }
  }

  const handleCancelEditDivision = () => {
    setEditingDivisionId(null)
    setEditingDivisionName("")
  }

  const handleDeleteDivision = async (divisionId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette division et toutes ses sous-divisions ?") && company) {
      try {
        await deleteDivisionApi(divisionId)
        setCompany({
          ...company,
          divisions: company.divisions.filter((d) => d.id !== divisionId),
        })
      } catch (e) {
        console.error("Error deleting division:", e)
      }
    }
  }

  const handleAddSubDivision = async (divisionId: string) => {
    if (newSubDivisionName.trim() && company) {
      try {
        const created = await createSubDivisionApi(divisionId, { name: newSubDivisionName.trim() })
        const newSubDivision: SubDivision = { id: created.id, name: created.name }
        setCompany({
          ...company,
          divisions: company.divisions.map((d) =>
            d.id === divisionId ? { ...d, subDivisions: [...d.subDivisions, newSubDivision] } : d
          ),
        })
        setNewSubDivisionName("")
        setAddingSubDivisionTo(null)
      } catch (e) {
        console.error("Error creating sub-division:", e)
      }
    }
  }

  const handleStartEditSubDivision = (subDivision: SubDivision) => {
    setEditingSubDivisionId(subDivision.id)
    setEditingSubDivisionName(subDivision.name)
  }

  const handleSaveEditSubDivision = async (divisionId: string, subDivisionId: string) => {
    if (editingSubDivisionName.trim() && company) {
      try {
        await updateSubDivisionApi(subDivisionId, { name: editingSubDivisionName.trim() })
        setCompany({
          ...company,
          divisions: company.divisions.map((d) =>
            d.id === divisionId
              ? {
                  ...d,
                  subDivisions: d.subDivisions.map((sd) =>
                    sd.id === subDivisionId ? { ...sd, name: editingSubDivisionName.trim() } : sd
                  ),
                }
              : d
          ),
        })
        setEditingSubDivisionId(null)
        setEditingSubDivisionName("")
      } catch (e) {
        console.error("Error updating sub-division:", e)
      }
    }
  }

  const handleCancelEditSubDivision = () => {
    setEditingSubDivisionId(null)
    setEditingSubDivisionName("")
  }

  const handleDeleteSubDivision = async (divisionId: string, subDivisionId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette sous-division ?") && company) {
      try {
        await deleteSubDivisionApi(subDivisionId)
        setCompany({
          ...company,
          divisions: company.divisions.map((d) =>
            d.id === divisionId
              ? { ...d, subDivisions: d.subDivisions.filter((sd) => sd.id !== subDivisionId) }
              : d
          ),
        })
      } catch (e) {
        console.error("Error deleting sub-division:", e)
      }
    }
  }

  const handleStartEditFiscalYearEnd = () => {
    if (company) {
      setEditingFiscalYearEnd(company.fiscalYearEnd)
    }
  }

  const handleSaveFiscalYearEnd = async () => {
    if (editingFiscalYearEnd && company) {
      try {
        await updateCompany(companyId, { fiscal_year_end: editingFiscalYearEnd })
        setCompany({ ...company, fiscalYearEnd: editingFiscalYearEnd })
        setEditingFiscalYearEnd(null)
      } catch (e) {
        console.error("Error updating fiscal year end:", e)
      }
    }
  }

  const handleCancelEditFiscalYearEnd = () => {
    setEditingFiscalYearEnd(null)
  }

  const handleStartEditCurrency = () => {
    if (company) {
      setEditingCurrency(company.currency || "CAD")
    }
  }

  const handleSaveCurrency = async () => {
    if (editingCurrency && company) {
      try {
        await updateCompany(companyId, { currency: editingCurrency })
        setCompany({ ...company, currency: editingCurrency })
        setEditingCurrency(null)
      } catch (e) {
        console.error("Error updating currency:", e)
      }
    }
  }

  const handleCancelEditCurrency = () => {
    setEditingCurrency(null)
  }

  const handleStartEditCompanyName = () => {
    if (company) {
      setEditingName(company.name)
      setEditingCompanyName(true)
    }
  }

  const handleSaveCompanyName = async () => {
    if (editingName.trim() && company) {
      try {
        await updateCompany(companyId, { name: editingName.trim() })
        setCompany({ ...company, name: editingName.trim() })
        setEditingCompanyName(false)
        setEditingName("")
      } catch (e) {
        console.error("Error updating company name:", e)
      }
    }
  }

  const handleCancelEditCompanyName = () => {
    setEditingCompanyName(false)
    setEditingName("")
  }

  const handleDeleteCompany = async () => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette société et toutes ses divisions ? Cette action est irréversible.")) {
      try {
        await deleteCompanyApi(companyId)
        router.push("/")
      } catch (e) {
        console.error("Error deleting company:", e)
      }
    }
  }

  if (loading || !company) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DashboardHeader title="Modelisys" />
        <div className="flex items-center justify-center min-h-[60vh]">
          {loading ? (
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          ) : (
            <p className="text-slate-500">Chargement...</p>
          )}
        </div>
      </div>
    )
  }

  const fiscalYearEndLabel = fiscalYearEndOptions.find((opt) => opt.value === company.fiscalYearEnd)?.label || "31 décembre"

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
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-4xl font-semibold text-[#E6D6C3] mb-2 tracking-tight">Information de base</h2>
              </div>
              <p className="text-base text-[#C9B8A5]/90 mb-6">
                Configuration et paramètres de la société
              </p>
              <p className="text-base text-[#C9B8A5]/90 mb-6 leading-relaxed max-w-4xl">
                Gérez les informations de votre société, ses divisions et sous-divisions. Configurez les paramètres
                comptables et accédez aux différents modules de configuration pour cette entité.
              </p>
              {/* Navigation Menu - Information de base, Mapping comptable et Mapping états financiers */}
              <div className="flex items-end gap-8 mb-2">
                <Link
                  href={`/settings/companies/${companyId}`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span
                    className={`text-sm font-normal transition-colors ${
                      pathname === `/settings/companies/${companyId}`
                        ? "text-slate-200"
                        : "text-slate-200 hover:text-[#E6D6C3]"
                    }`}
                  >
                    Information de base
                  </span>
                  {pathname === `/settings/companies/${companyId}` && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E0742D] z-10"></div>
                  )}
                </Link>
                <Link
                  href={`/settings/companies/${companyId}/mapping`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span
                    className={`text-sm font-normal transition-colors ${
                      pathname === `/settings/companies/${companyId}/mapping`
                        ? "text-slate-200"
                        : "text-slate-200 hover:text-[#E6D6C3]"
                    }`}
                  >
                    Mapping comptable
                  </span>
                  {pathname === `/settings/companies/${companyId}/mapping` && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E0742D] z-10"></div>
                  )}
                </Link>
                <Link
                  href={`/settings/companies/${companyId}/link-codes`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span
                    className={`text-sm font-normal transition-colors ${
                      pathname === `/settings/companies/${companyId}/link-codes`
                        ? "text-slate-200"
                        : "text-slate-200 hover:text-[#E6D6C3]"
                    }`}
                  >
                    Code de liaison
                  </span>
                  {pathname === `/settings/companies/${companyId}/link-codes` && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E0742D] z-10"></div>
                  )}
                </Link>
                <Link
                  href={`/settings/companies/${companyId}/financial-statements-mapping`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span
                    className={`text-sm font-normal transition-colors ${
                      pathname?.includes("/financial-statements-mapping")
                        ? "text-slate-200"
                        : "text-slate-200 hover:text-[#E6D6C3]"
                    }`}
                  >
                    Mapping états financiers
                  </span>
                  {pathname?.includes("/financial-statements-mapping") && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E0742D] z-10"></div>
                  )}
                </Link>
                <Link
                  href={`/settings/companies/${companyId}/trial-balance`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span
                    className={`text-sm font-normal transition-colors ${
                      pathname?.includes("/trial-balance")
                        ? "text-slate-200"
                        : "text-slate-200 hover:text-[#E6D6C3]"
                    }`}
                  >
                    Balance de vérification
                  </span>
                  {pathname?.includes("/trial-balance") && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E0742D] z-10"></div>
                  )}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Overlapping section */}
      <div className="relative -mt-32 mb-12">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Company Info Card */}
            <Card className="group relative overflow-hidden rounded-[28px] border-2 border-slate-700 bg-gradient-to-br from-white to-slate-50 transition-all duration-500 ease-out hover:shadow-xl hover:shadow-slate-900/[0.07]">
              <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-[#E0742D]/[0.12]" />
              <CardContent className="relative p-6 sm:p-7">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-[#2A2F3A] flex items-center justify-center transition-all duration-300">
                    <Building2 className="w-6 h-6 text-black group-hover:text-[#E6D6C3] transition-colors duration-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Informations</h3>
                    <p className="text-sm text-slate-500">Détails de la société</p>
                  </div>
                </div>
                <div className="h-px w-full bg-gradient-to-r from-[#E0742D]/80 via-white/15 to-transparent mb-6" />

                <div className="space-y-4">
                  {/* Nom de la société */}
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <Building2 className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 mb-1">Nom de la société</p>
                        {editingCompanyName ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveCompanyName()
                                } else if (e.key === "Escape") {
                                  handleCancelEditCompanyName()
                                }
                              }}
                              className="flex-1 h-8"
                              autoFocus
                            />
                            <Button
                              onClick={handleSaveCompanyName}
                              disabled={!editingName.trim()}
                              size="sm"
                              className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 w-8 p-0"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={handleCancelEditCompanyName}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-900">{company.name}</p>
                            <Button
                              onClick={handleStartEditCompanyName}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Fin d'année comptable */}
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 mb-1">Fin d'année comptable</p>
                        {editingFiscalYearEnd !== null ? (
                          <div className="flex items-center gap-2">
                            <Select value={editingFiscalYearEnd} onValueChange={setEditingFiscalYearEnd}>
                              <SelectTrigger className="flex-1 h-8">
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
                            <Button
                              onClick={handleSaveFiscalYearEnd}
                              size="sm"
                              className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 w-8 p-0"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={handleCancelEditFiscalYearEnd}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-900">{fiscalYearEndLabel}</p>
                            <Button
                              onClick={handleStartEditFiscalYearEnd}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Devise */}
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <DollarSign className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 mb-1">Devise</p>
                        {editingCurrency !== null ? (
                          <div className="flex items-center gap-2">
                            <Select value={editingCurrency} onValueChange={setEditingCurrency}>
                              <SelectTrigger className="flex-1 h-8">
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
                            <Button
                              onClick={handleSaveCurrency}
                              size="sm"
                              className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 w-8 p-0"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={handleCancelEditCurrency}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-900">{company.currency || "CAD"}</p>
                            <Button
                              onClick={handleStartEditCurrency}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200">
                  <Button
                    onClick={handleDeleteCompany}
                    variant="outline"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer la société
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Structure Card */}
            <Card className="group relative lg:col-span-2 overflow-hidden rounded-[28px] border-2 border-slate-700 bg-gradient-to-br from-white to-slate-50 transition-all duration-500 ease-out hover:shadow-xl hover:shadow-slate-900/[0.07]">
              <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-[#E0742D]/[0.12]" />
              <CardContent className="relative p-6 sm:p-7">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-[#2A2F3A] flex items-center justify-center transition-all duration-300">
                      <Building2 className="w-6 h-6 text-black group-hover:text-[#E6D6C3] transition-colors duration-300" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Structure organisationnelle</h3>
                      <p className="text-sm text-slate-500">Divisions et sous-divisions</p>
                    </div>
                  </div>
                  {!addingDivisionTo && (
                    <Button
                      onClick={() => setAddingDivisionTo(true)}
                      size="sm"
                      className="rounded-lg bg-[#E0742D] hover:bg-[#c96526] text-white shadow-sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter une division
                    </Button>
                  )}
                </div>
                <div className="h-px w-full bg-gradient-to-r from-[#E0742D]/80 via-white/15 to-transparent mb-6" />

                {/* Add Division Form */}
                {addingDivisionTo && (
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <Input
                        placeholder="Nom de la division"
                        value={newDivisionName}
                        onChange={(e) => setNewDivisionName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleAddDivision()
                          } else if (e.key === "Escape") {
                            setAddingDivisionTo(false)
                            setNewDivisionName("")
                          }
                        }}
                        className="flex-1"
                        autoFocus
                      />
                      <Button
                        onClick={handleAddDivision}
                        disabled={!newDivisionName.trim()}
                        size="sm"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => {
                          setAddingDivisionTo(false)
                          setNewDivisionName("")
                        }}
                        size="sm"
                        variant="ghost"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {company.divisions && company.divisions.length > 0 ? (
                  <div className="space-y-6">
                    {company.divisions.map((division) => {
                      const isAddingSubDivision = addingSubDivisionTo === division.id

                      return (
                        <div key={division.id} className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
                          <div className="relative flex items-center gap-3 p-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#E0742D] shrink-0" />
                            {editingDivisionId === division.id ? (
                              <>
                                <Input
                                  value={editingDivisionName}
                                  onChange={(e) => setEditingDivisionName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveEditDivision(division.id)
                                    } else if (e.key === "Escape") {
                                      handleCancelEditDivision()
                                    }
                                  }}
                                  className="flex-1"
                                  autoFocus
                                />
                                <Button
                                  onClick={() => handleSaveEditDivision(division.id)}
                                  disabled={!editingDivisionName.trim()}
                                  size="sm"
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button onClick={handleCancelEditDivision} size="sm" variant="ghost">
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1 text-slate-900 font-semibold">{division.name}</span>
                                <Button
                                  onClick={() => setAddingSubDivisionTo(division.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="text-slate-600 hover:text-slate-900 h-7 px-2"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Sous-div.
                                </Button>
                                <Button
                                  onClick={() => handleStartEditDivision(division)}
                                  size="sm"
                                  variant="ghost"
                                  className="text-slate-600 hover:text-slate-900 h-7 w-7 p-0"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  onClick={() => handleDeleteDivision(division.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                          </div>

                          <div className="px-4 py-4 bg-slate-50/40">
                            <div className="ml-3 border-l-2 border-slate-200 pl-5 space-y-2.5">
                              {isAddingSubDivision && (
                                <div className="relative flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5">
                                  <span className="h-px w-4 bg-slate-300 absolute -left-5 top-1/2" />
                                  <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />
                                  <Input
                                    placeholder="Nom de la sous-division"
                                    value={newSubDivisionName}
                                    onChange={(e) => setNewSubDivisionName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        handleAddSubDivision(division.id)
                                      } else if (e.key === "Escape") {
                                        setAddingSubDivisionTo(null)
                                        setNewSubDivisionName("")
                                      }
                                    }}
                                    className="flex-1"
                                    autoFocus
                                  />
                                  <Button
                                    onClick={() => handleAddSubDivision(division.id)}
                                    disabled={!newSubDivisionName.trim()}
                                    size="sm"
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setAddingSubDivisionTo(null)
                                      setNewSubDivisionName("")
                                    }}
                                    size="sm"
                                    variant="ghost"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              )}

                              {division.subDivisions.length === 0 && !isAddingSubDivision ? (
                                <div className="relative rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-xs text-slate-500">
                                  <span className="h-px w-4 bg-slate-300 absolute -left-5 top-1/2" />
                                  Aucune sous-division
                                </div>
                              ) : (
                                division.subDivisions.map((subDivision) => (
                                  <div
                                    key={subDivision.id}
                                    className="relative flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                                  >
                                    <span className="h-px w-4 bg-slate-300 absolute -left-5 top-1/2" />
                                    <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />
                                    {editingSubDivisionId === subDivision.id ? (
                                      <>
                                        <Input
                                          value={editingSubDivisionName}
                                          onChange={(e) => setEditingSubDivisionName(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              handleSaveEditSubDivision(division.id, subDivision.id)
                                            } else if (e.key === "Escape") {
                                              handleCancelEditSubDivision()
                                            }
                                          }}
                                          className="flex-1"
                                          autoFocus
                                        />
                                        <Button
                                          onClick={() => handleSaveEditSubDivision(division.id, subDivision.id)}
                                          disabled={!editingSubDivisionName.trim()}
                                          size="sm"
                                          className="bg-emerald-500 hover:bg-emerald-600 text-white"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button onClick={handleCancelEditSubDivision} size="sm" variant="ghost">
                                          <X className="w-3.5 h-3.5" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="flex-1 text-slate-700 text-sm">{subDivision.name}</span>
                                        <Button
                                          onClick={() => handleStartEditSubDivision(subDivision)}
                                          size="sm"
                                          variant="ghost"
                                          className="text-slate-600 hover:text-slate-900 h-6 w-6 p-0"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          onClick={() => handleDeleteSubDivision(division.id, subDivision.id)}
                                          size="sm"
                                          variant="ghost"
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <Building2 className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                    <p className="text-sm font-medium">Aucune division configurée</p>
                    <p className="text-xs mt-1 text-slate-400">
                      Cliquez sur "Ajouter une division" pour commencer
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
