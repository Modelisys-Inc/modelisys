"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Calendar, DollarSign, ArrowLeft, Folder, FolderTree, ChevronDown, ChevronRight, Plus, Edit2, Trash2, X, Check, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter, usePathname } from "next/navigation"

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
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set())
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

  // Save company to localStorage
  const saveCompany = (updatedCompany: Company) => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("modelisys_companies")
      if (saved) {
        try {
          const companies: Company[] = JSON.parse(saved)
          const updatedCompanies = companies.map((c) => (c.id === companyId ? updatedCompany : c))
          localStorage.setItem("modelisys_companies", JSON.stringify(updatedCompanies))
        } catch (e) {
          console.error("Error saving company:", e)
        }
      }
    }
  }

  // Load company from localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && companyId) {
      const loadCompany = () => {
        const saved = localStorage.getItem("modelisys_companies")
        if (saved) {
          try {
            const companies: Company[] = JSON.parse(saved)
            const foundCompany = companies.find((c) => c.id === companyId)
            if (foundCompany) {
              setCompany(foundCompany)
            } else {
              router.push("/")
            }
          } catch (e) {
            console.error("Error loading company:", e)
            router.push("/")
          }
        } else {
          router.push("/")
        }
      }

      loadCompany()

      // Listen for storage changes
      const handleStorageChange = () => {
        loadCompany()
      }

      window.addEventListener("storage", handleStorageChange)
      const interval = setInterval(handleStorageChange, 1000)

      return () => {
        window.removeEventListener("storage", handleStorageChange)
        clearInterval(interval)
      }
    }
  }, [companyId, router])

  const toggleDivisionExpanded = (divisionId: string) => {
    setExpandedDivisions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(divisionId)) {
        newSet.delete(divisionId)
      } else {
        newSet.add(divisionId)
      }
      return newSet
    })
  }

  const handleAddDivision = () => {
    if (newDivisionName.trim() && company) {
      const newDivision: Division = {
        id: Date.now().toString(),
        name: newDivisionName.trim(),
        subDivisions: [],
      }
      const updatedCompany = {
        ...company,
        divisions: [...company.divisions, newDivision],
      }
      setCompany(updatedCompany)
      saveCompany(updatedCompany)
      setNewDivisionName("")
      setAddingDivisionTo(false)
    }
  }

  const handleStartEditDivision = (division: Division) => {
    setEditingDivisionId(division.id)
    setEditingDivisionName(division.name)
  }

  const handleSaveEditDivision = (divisionId: string) => {
    if (editingDivisionName.trim() && company) {
      const updatedCompany = {
        ...company,
        divisions: company.divisions.map((d) =>
          d.id === divisionId ? { ...d, name: editingDivisionName.trim() } : d
        ),
      }
      setCompany(updatedCompany)
      saveCompany(updatedCompany)
      setEditingDivisionId(null)
      setEditingDivisionName("")
    }
  }

  const handleCancelEditDivision = () => {
    setEditingDivisionId(null)
    setEditingDivisionName("")
  }

  const handleDeleteDivision = (divisionId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette division et toutes ses sous-divisions ?") && company) {
      const updatedCompany = {
        ...company,
        divisions: company.divisions.filter((d) => d.id !== divisionId),
      }
      setCompany(updatedCompany)
      saveCompany(updatedCompany)
      setExpandedDivisions((prev) => {
        const newSet = new Set(prev)
        newSet.delete(divisionId)
        return newSet
      })
    }
  }

  const handleAddSubDivision = (divisionId: string) => {
    if (newSubDivisionName.trim() && company) {
      const newSubDivision: SubDivision = {
        id: Date.now().toString(),
        name: newSubDivisionName.trim(),
      }
      const updatedCompany = {
        ...company,
        divisions: company.divisions.map((d) =>
          d.id === divisionId ? { ...d, subDivisions: [...d.subDivisions, newSubDivision] } : d
        ),
      }
      setCompany(updatedCompany)
      saveCompany(updatedCompany)
      setNewSubDivisionName("")
      setAddingSubDivisionTo(null)
      if (!expandedDivisions.has(divisionId)) {
        setExpandedDivisions((prev) => new Set(prev).add(divisionId))
      }
    }
  }

  const handleStartEditSubDivision = (subDivision: SubDivision) => {
    setEditingSubDivisionId(subDivision.id)
    setEditingSubDivisionName(subDivision.name)
  }

  const handleSaveEditSubDivision = (divisionId: string, subDivisionId: string) => {
    if (editingSubDivisionName.trim() && company) {
      const updatedCompany = {
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
      }
      setCompany(updatedCompany)
      saveCompany(updatedCompany)
      setEditingSubDivisionId(null)
      setEditingSubDivisionName("")
    }
  }

  const handleCancelEditSubDivision = () => {
    setEditingSubDivisionId(null)
    setEditingSubDivisionName("")
  }

  const handleDeleteSubDivision = (divisionId: string, subDivisionId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette sous-division ?") && company) {
      const updatedCompany = {
        ...company,
        divisions: company.divisions.map((d) =>
          d.id === divisionId
            ? { ...d, subDivisions: d.subDivisions.filter((sd) => sd.id !== subDivisionId) }
            : d
        ),
      }
      setCompany(updatedCompany)
      saveCompany(updatedCompany)
    }
  }

  const handleStartEditFiscalYearEnd = () => {
    if (company) {
      setEditingFiscalYearEnd(company.fiscalYearEnd)
    }
  }

  const handleSaveFiscalYearEnd = () => {
    if (editingFiscalYearEnd && company) {
      const updatedCompany = {
        ...company,
        fiscalYearEnd: editingFiscalYearEnd,
      }
      setCompany(updatedCompany)
      saveCompany(updatedCompany)
      setEditingFiscalYearEnd(null)
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

  const handleSaveCurrency = () => {
    if (editingCurrency && company) {
      const updatedCompany = {
        ...company,
        currency: editingCurrency,
      }
      setCompany(updatedCompany)
      saveCompany(updatedCompany)
      setEditingCurrency(null)
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

  const handleSaveCompanyName = () => {
    if (editingName.trim() && company) {
      const updatedCompany = {
        ...company,
        name: editingName.trim(),
      }
      setCompany(updatedCompany)
      saveCompany(updatedCompany)
      setEditingCompanyName(false)
      setEditingName("")
    }
  }

  const handleCancelEditCompanyName = () => {
    setEditingCompanyName(false)
    setEditingName("")
  }

  const handleDeleteCompany = () => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette société et toutes ses divisions ? Cette action est irréversible.")) {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("modelisys_companies")
        if (saved) {
          try {
            const companies: Company[] = JSON.parse(saved)
            const updatedCompanies = companies.filter((c) => c.id !== companyId)
            localStorage.setItem("modelisys_companies", JSON.stringify(updatedCompanies))
            // Redirect to home page
            router.push("/")
          } catch (e) {
            console.error("Error deleting company:", e)
          }
        }
      }
    }
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DashboardHeader title="Modelisys" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-slate-500">Chargement...</p>
        </div>
      </div>
    )
  }

  const fiscalYearEndLabel = fiscalYearEndOptions.find((opt) => opt.value === company.fiscalYearEnd)?.label || "31 décembre"

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />

      {/* Dark Header Section */}
      <div className="w-full bg-slate-900 pt-15 pb-40">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="flex items-start gap-3 mb-8">
            <div className="w-2"></div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <Link
                  href="/"
                  className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                {editingCompanyName ? (
                  <div className="flex items-center gap-3 flex-1">
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
                      className="flex-1 text-4xl font-normal bg-slate-800 border-slate-700 text-white"
                      autoFocus
                    />
                    <Button
                      onClick={handleSaveCompanyName}
                      disabled={!editingName.trim()}
                      size="sm"
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={handleCancelEditCompanyName}
                      size="sm"
                      variant="ghost"
                      className="text-slate-300 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <h2 className="text-4xl font-normal text-white mb-2 tracking-tight">{company.name}</h2>
                    <Button
                      onClick={handleStartEditCompanyName}
                      size="sm"
                      variant="ghost"
                      className="text-slate-300 hover:text-white"
                    >
                      <Edit2 className="w-5 h-5" />
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-base text-slate-300 mb-6">
                Configuration et paramètres de la société
              </p>
              <p className="text-base text-slate-300 mb-6 leading-relaxed max-w-4xl">
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
                        ? "text-white"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Information de base
                  </span>
                  {pathname === `/settings/companies/${companyId}` && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 z-10"></div>
                  )}
                </Link>
                <Link
                  href={`/settings/companies/${companyId}/mapping`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span
                    className={`text-sm font-normal transition-colors ${
                      pathname?.includes("/mapping")
                        ? "text-white"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Mapping comptable
                  </span>
                  {pathname?.includes("/mapping") && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 z-10"></div>
                  )}
                </Link>
                <Link
                  href={`/settings/companies/${companyId}/financial-statements-mapping`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span
                    className={`text-sm font-normal transition-colors ${
                      pathname?.includes("/financial-statements-mapping")
                        ? "text-white"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Mapping états financiers
                  </span>
                  {pathname?.includes("/financial-statements-mapping") && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 z-10"></div>
                  )}
                </Link>
                <Link
                  href={`/settings/companies/${companyId}/trial-balance`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span
                    className={`text-sm font-normal transition-colors ${
                      pathname?.includes("/trial-balance")
                        ? "text-white"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Balance de vérification
                  </span>
                  {pathname?.includes("/trial-balance") && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 z-10"></div>
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
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Informations</h3>
                    <p className="text-sm text-slate-500">Détails de la société</p>
                  </div>
                </div>

                <div className="space-y-4">
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
            <Card className="lg:col-span-2 bg-white border border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <FolderTree className="w-6 h-6 text-blue-600" />
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
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter une division
                    </Button>
                  )}
                </div>

                {/* Add Division Form */}
                {addingDivisionTo && (
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                      <Folder className="w-4 h-4 text-slate-500 flex-shrink-0" />
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
                  <div className="space-y-3">
                    {company.divisions.map((division) => {
                      const isDivisionExpanded = expandedDivisions.has(division.id)
                      const isAddingSubDivision = addingSubDivisionTo === division.id

                      return (
                        <div key={division.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                          {/* Division Header */}
                          <div className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleDivisionExpanded(division.id)}
                              className="h-6 w-6 p-0"
                            >
                              {isDivisionExpanded ? (
                                <ChevronDown className="w-4 h-4 text-slate-600" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-600" />
                              )}
                            </Button>
                            <Folder className="w-5 h-5 text-slate-500 flex-shrink-0" />
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
                                <Button
                                  onClick={handleCancelEditDivision}
                                  size="sm"
                                  variant="ghost"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1 text-slate-900 font-medium">{division.name}</span>
                                <Button
                                  onClick={() => {
                                    setAddingSubDivisionTo(division.id)
                                    if (!isDivisionExpanded) {
                                      setExpandedDivisions((prev) => new Set(prev).add(division.id))
                                    }
                                  }}
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

                          {/* Sub-Divisions Section */}
                          {isDivisionExpanded && (
                            <div className="bg-white border-t border-slate-200">
                              {/* Add Sub-Division Form */}
                              {isAddingSubDivision && (
                                <div className="p-2 bg-slate-50 border-b border-slate-200">
                                  <div className="flex items-center gap-3">
                                    <FolderTree className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 ml-7" />
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
                                </div>
                              )}

                              {/* Sub-Divisions List */}
                              <div className="p-2 space-y-1.5">
                                {division.subDivisions.length === 0 && !isAddingSubDivision ? (
                                  <div className="text-center py-4 text-slate-400">
                                    <FolderTree className="w-6 h-6 mx-auto mb-1 opacity-50" />
                                    <p className="text-xs">Aucune sous-division</p>
                                  </div>
                                ) : (
                                  division.subDivisions.map((subDivision) => (
                                    <div
                                      key={subDivision.id}
                                      className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors ml-7"
                                    >
                                      <FolderTree className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
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
                                          <Button
                                            onClick={handleCancelEditSubDivision}
                                            size="sm"
                                            variant="ghost"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <span className="flex-1 text-slate-600 text-xs">{subDivision.name}</span>
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
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <Folder className="w-12 h-12 mx-auto mb-4 text-slate-400" />
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
