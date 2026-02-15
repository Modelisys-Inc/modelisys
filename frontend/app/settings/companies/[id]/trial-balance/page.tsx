"use client"

import { useState, useEffect, useRef } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Upload, X, Loader2, FileSpreadsheet } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  getCompany,
  getTrialBalance,
  uploadTrialBalance,
  type Company as ApiCompany,
  type TrialBalanceData,
} from "@/lib/api"

interface Company {
  id: string
  name: string
  fiscalYearEnd: string
  currency: string
}

interface TrialBalanceAccount {
  accountNumber: string
  description: string
  monthlyAmounts: { [month: string]: number }
}

const months = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre"
]

function mapApiCompany(c: ApiCompany): Company {
  return {
    id: c.id,
    name: c.name,
    fiscalYearEnd: c.fiscal_year_end,
    currency: c.currency,
  }
}

function mapTrialBalanceAccounts(data: TrialBalanceData): TrialBalanceAccount[] {
  return data.accounts.map((a) => ({
    accountNumber: a.account_number,
    description: a.description,
    monthlyAmounts: a.monthly_amounts,
  }))
}

export default function TrialBalancePage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string
  const [company, setCompany] = useState<Company | null>(null)
  const [accounts, setAccounts] = useState<TrialBalanceAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load company and accounts from API
  useEffect(() => {
    if (companyId) {
      setLoading(true)
      Promise.all([
        getCompany(companyId),
        getTrialBalance(companyId),
      ])
        .then(([companyData, tbData]) => {
          setCompany(mapApiCompany(companyData))
          setAccounts(mapTrialBalanceAccounts(tbData))
        })
        .catch((e) => {
          console.error("Error loading data:", e)
          router.push(`/settings/companies/${companyId}`)
        })
        .finally(() => setLoading(false))
    }
  }, [companyId, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DashboardHeader title="Modelisys" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
        </div>
      </div>
    )
  }

  if (!company) {
    return null
  }

  // Format number for display
  const formatAmount = (amount: number | undefined): string => {
    if (amount === undefined || amount === null) return "-"
    return new Intl.NumberFormat("fr-CA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setImportFile(file)
    }
  }

  // Handle Excel import via backend API
  const handleImport = async () => {
    if (!importFile || !selectedMonth) {
      alert("Veuillez sélectionner un fichier et un mois")
      return
    }

    setImporting(true)
    try {
      const monthIndex = months.indexOf(selectedMonth) + 1
      const result = await uploadTrialBalance(
        companyId,
        importFile,
        parseInt(selectedYear),
        monthIndex,
      )

      // Reload trial balance data from API
      const tbData = await getTrialBalance(companyId, parseInt(selectedYear))
      setAccounts(mapTrialBalanceAccounts(tbData))

      // Reset import state
      setShowImportModal(false)
      setImportFile(null)
      setSelectedMonth("")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      alert(`Import réussi ! ${result.accounts_imported} compte(s) importé(s) pour ${selectedMonth} ${selectedYear}.`)
    } catch (error) {
      console.error("Error importing file:", error)
      alert("Erreur lors de l'importation du fichier. Veuillez vérifier le format du fichier.")
    } finally {
      setImporting(false)
    }
  }

  // Generate years list (current year +/- 5 years)
  const generateYears = () => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i.toString())
    }
    return years
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
              <div className="flex items-center gap-3 mb-4">
                <Link
                  href={`/settings/companies/${companyId}`}
                  className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <h2 className="text-4xl font-normal text-white mb-2 tracking-tight">{company.name}</h2>
              </div>
              <p className="text-base text-slate-300 mb-6">
                Configuration et paramètres de la société
              </p>
              <p className="text-base text-slate-300 mb-6 leading-relaxed max-w-4xl">
                Gérez les informations de votre société, ses divisions et sous-divisions. Configurez les paramètres
                comptables et accédez aux différents modules de configuration pour cette entité.
              </p>
              {/* Navigation Menu */}
              <div className="flex items-end gap-8 mb-2">
                <Link
                  href={`/settings/companies/${companyId}`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span className="text-sm font-normal transition-colors text-slate-300 hover:text-white">
                    Information de base
                  </span>
                </Link>
                <Link
                  href={`/settings/companies/${companyId}/mapping`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span className="text-sm font-normal transition-colors text-slate-300 hover:text-white">
                    Mapping comptable
                  </span>
                </Link>
                <Link
                  href={`/settings/companies/${companyId}/financial-statements-mapping`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span className="text-sm font-normal transition-colors text-slate-300 hover:text-white">
                    Mapping états financiers
                  </span>
                </Link>
                <div className="relative pb-4 border-b border-slate-600/30">
                  <span className="text-sm font-normal transition-colors text-white">
                    Balance de vérification
                  </span>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 z-10"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Overlapping section */}
      <div className="relative -mt-32 mb-12">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="w-full bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
            {/* Header */}
            <div className="bg-white px-8 py-5 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">Balance de vérification</h2>
                    <p className="text-sm text-slate-700">
                      Consultez les montants mensuels de vos comptes comptables
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowImportModal(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importer Excel
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-white">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm sticky left-0 bg-slate-50 z-10"># de compte</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm sticky left-[120px] bg-slate-50 z-10">Description</th>
                    {months.map((month) => (
                      <th key={month} className="px-6 py-4 text-center font-semibold text-slate-900 text-sm min-w-[120px]">
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accounts.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="px-8 py-12 text-center text-sm text-slate-500">
                        <p>Aucun compte configuré. Importez votre balance de vérification pour commencer.</p>
                      </td>
                    </tr>
                  ) : (
                    accounts.map((account, index) => (
                      <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-600 font-mono sticky left-0 bg-white z-10">{account.accountNumber}</td>
                        <td className="px-6 py-4 text-sm text-slate-900 sticky left-[120px] bg-white z-10">{account.description}</td>
                        {months.map((month) => (
                          <td key={month} className="px-6 py-4 text-sm text-slate-600 text-right font-mono">
                            {formatAmount(account.monthlyAmounts?.[month])}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Importer une balance de vérification</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowImportModal(false)
                  setImportFile(null)
                  setSelectedMonth("")
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ""
                  }
                }}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Fichier Excel
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="sr-only"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragging(false)
                    const file = e.dataTransfer.files?.[0]
                    if (file) setImportFile(file)
                  }}
                  className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 cursor-pointer transition-colors ${
                    dragging
                      ? "border-emerald-400 bg-emerald-50"
                      : importFile
                      ? "border-emerald-300 bg-emerald-50/50"
                      : "border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/30"
                  }`}
                >
                  {importFile ? (
                    <>
                      <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                      <p className="text-sm font-medium text-slate-900">{importFile.name}</p>
                      <p className="text-xs text-slate-500">{(importFile.size / 1024).toFixed(1)} Ko</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setImportFile(null)
                          if (fileInputRef.current) fileInputRef.current.value = ""
                        }}
                        className="text-xs text-slate-500 hover:text-red-600"
                      >
                        Retirer le fichier
                      </Button>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400" />
                      <p className="text-sm text-slate-600">
                        Glissez un fichier ici ou{" "}
                        <span className="font-semibold text-emerald-600 underline underline-offset-2">
                          parcourez
                        </span>
                      </p>
                      <p className="text-xs text-slate-400">.xlsx, .xls ou .csv</p>
                    </>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Format attendu : # de compte, Description, Montant
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Mois
                </label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un mois" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Année
                </label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {generateYears().map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowImportModal(false)
                  setImportFile(null)
                  setSelectedMonth("")
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ""
                  }
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={handleImport}
                disabled={!importFile || !selectedMonth || importing}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {importing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Importer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
