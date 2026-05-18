"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, X, Loader2, FileSpreadsheet, Trash2 } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  getCompany,
  getTrialBalance,
  getTrialBalanceFiscalYears,
  previewTrialBalanceUpload,
  uploadTrialBalance,
  deleteTrialBalanceMonth,
  upsertAccountMappings,
  listCompanies,
  ApiError,
  type Company as ApiCompany,
  type TrialBalanceData,
  type TrialBalanceUploadPreview,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  dashboardCardFrameStaticClass,
  dashboardCardRingClass,
  dashboardCardHeaderBarClass,
  dashboardCardHeaderIconBoxClass,
  dashboardCardTitleClass,
  dashboardCardBodyMutedClass,
} from "@/lib/dashboard-card-style"

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

/** Brouillon pour ajouter un compte inconnu au mapping avant import définitif. */
interface NewAccountDraft {
  linkCode: string
  divisions: string
  subDivisions: string
  interests: boolean
  amortization: boolean
  variableCosts: boolean
  fixedCosts: boolean
  intercoCompanyId: string
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
  const [monthsWithData, setMonthsWithData] = useState<number[]>([])
  /** Exercice fiscal des données affichées (aligné sur la réponse API). */
  const [trialFiscalYear, setTrialFiscalYear] = useState<number>(() => new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [deleteMonth, setDeleteMonth] = useState<string>("")
  const [deleteYear, setDeleteYear] = useState<string>(new Date().getFullYear().toString())
  const [fiscalYearsWithData, setFiscalYearsWithData] = useState<number[]>([])
  const [fiscalYearsLoading, setFiscalYearsLoading] = useState(false)
  const [deleteAvailableMonths, setDeleteAvailableMonths] = useState<number[]>([])
  const [deleteModalLoading, setDeleteModalLoading] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [deletingPeriod, setDeletingPeriod] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{
    fiscalYear: number
    monthNum: number
    monthKey: string
    label: string
  } | null>(null)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importStep, setImportStep] = useState<"file" | "validate">("file")
  const [previewLoading, setPreviewLoading] = useState(false)
  const [preview, setPreview] = useState<TrialBalanceUploadPreview | null>(null)
  const [newAccountDrafts, setNewAccountDrafts] = useState<Record<string, NewAccountDraft>>({})
  const [ignoredUnknownAccounts, setIgnoredUnknownAccounts] = useState<Set<string>>(new Set())
  const [importOrgCompanies, setImportOrgCompanies] = useState<ApiCompany[]>([])

  // Load company + balance (# et descriptions alignés sur le mapping côté API)
  useEffect(() => {
    if (companyId) {
      setLoading(true)
      getCompany(companyId)
        .then((companyData) => {
          setCompany(mapApiCompany(companyData))
          return getTrialBalance(companyId).catch(
            () =>
              ({
                company_id: companyId,
                fiscal_year: new Date().getFullYear(),
                months_with_data: [],
                accounts: [],
              }) as TrialBalanceData
          )
        })
        .then((tbData) => {
          setAccounts(mapTrialBalanceAccounts(tbData))
          setMonthsWithData(tbData.months_with_data ?? [])
          setTrialFiscalYear(tbData.fiscal_year)
        })
        .catch((e) => {
          if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
            // AuthProvider will redirect; avoid noisy console error.
            return
          }
          console.error("Error loading company:", e)
        })
        .finally(() => setLoading(false))
    }
  }, [companyId, router])

  useEffect(() => {
    if (!companyId) return
    setFiscalYearsLoading(true)
    getTrialBalanceFiscalYears(companyId)
      .then(setFiscalYearsWithData)
      .catch(() => setFiscalYearsWithData([]))
      .finally(() => setFiscalYearsLoading(false))
  }, [companyId])

  /** Libellé d’en-tête « Mars 2025 » + clé API « Mars » pour monthly_amounts. */
  const displayMonthColumns = useMemo(() => {
    return monthsWithData
      .filter((n) => n >= 1 && n <= 12)
      .sort((a, b) => b - a)
      .map((n) => {
        const monthKey = months[n - 1]
        return {
          label: `${monthKey} ${trialFiscalYear}`,
          monthKey,
        }
      })
  }, [monthsWithData, trialFiscalYear])

  /** Noms de mois (FR) pour lesquels des données existent pour la suppression — hook avant tout return. */
  const deleteMonthOptions = useMemo(() => {
    return [...deleteAvailableMonths].sort((a, b) => a - b).map((n) => months[n - 1])
  }, [deleteAvailableMonths])

  useEffect(() => {
    if (!showImportModal || importStep !== "validate") return
    listCompanies()
      .then(setImportOrgCompanies)
      .catch(() => setImportOrgCompanies([]))
  }, [showImportModal, importStep])

  const canFinalizeImport = useMemo(() => {
    if (!preview) return false
    if (!preview.balance_is_valid) return false
    for (const u of preview.unknown_accounts.filter((x) => !ignoredUnknownAccounts.has(x.account_number))) {
      const d = newAccountDrafts[u.account_number]
      if (!d) return false
      if (!d.linkCode.trim() || !d.divisions.trim() || !d.subDivisions.trim()) return false
    }
    return true
  }, [preview, newAccountDrafts, ignoredUnknownAccounts])

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

  const resetImportModal = () => {
    setShowImportModal(false)
    setImportStep("file")
    setPreview(null)
    setNewAccountDrafts({})
    setImportFile(null)
    setSelectedMonth("")
    setPreviewLoading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const formatApiError = (error: unknown): string => {
    if (error instanceof ApiError) {
      const d = error.detail
      if (Array.isArray(d)) return d.map((x) => String(x)).join(" ")
      return String(d)
    }
    return "Une erreur est survenue."
  }

  const handlePreviewStep = async () => {
    if (!importFile || !selectedMonth) {
      alert("Veuillez sélectionner un fichier et un mois.")
      return
    }
    setPreviewLoading(true)
    try {
      const monthIndex = months.indexOf(selectedMonth) + 1
      const fy = parseInt(selectedYear, 10)
      const data = await previewTrialBalanceUpload(companyId, importFile, fy, monthIndex)
      setPreview(data)
      setIgnoredUnknownAccounts(new Set())
      const init: Record<string, NewAccountDraft> = {}
      for (const u of data.unknown_accounts) {
        init[u.account_number] = {
          linkCode: "",
          divisions: "",
          subDivisions: "",
          interests: false,
          amortization: false,
          variableCosts: false,
          fixedCosts: false,
          intercoCompanyId: "none",
        }
      }
      setNewAccountDrafts(init)
      setImportStep("validate")
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return
      console.error("Error previewing file:", error)
      alert(formatApiError(error))
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleFinalImport = async () => {
    if (!importFile || !selectedMonth || !preview || !canFinalizeImport) return
    setImporting(true)
    try {
      const unknownToMap = preview.unknown_accounts.filter((u) => !ignoredUnknownAccounts.has(u.account_number))
      if (unknownToMap.length > 0) {
        await upsertAccountMappings(
          companyId,
          unknownToMap.map((u) => {
            const d = newAccountDrafts[u.account_number]
            return {
              account_number: u.account_number,
              description: u.description,
              link_code: d.linkCode.trim(),
              divisions: d.divisions.trim(),
              sub_divisions: d.subDivisions.trim(),
              interests: d.interests,
              amortization: d.amortization,
              variable_costs: d.variableCosts,
              fixed_costs: d.fixedCosts,
              interco_company_id:
                d.intercoCompanyId && d.intercoCompanyId !== "none" ? d.intercoCompanyId : null,
            }
          })
        )
      }
      const monthIndex = months.indexOf(selectedMonth) + 1
      const result = await uploadTrialBalance(
        companyId,
        importFile,
        parseInt(selectedYear),
        monthIndex,
        Array.from(ignoredUnknownAccounts)
      )
      const tbData = await getTrialBalance(companyId, parseInt(selectedYear))
      setAccounts(mapTrialBalanceAccounts(tbData))
      setMonthsWithData(tbData.months_with_data ?? [])
      setTrialFiscalYear(tbData.fiscal_year)
      getTrialBalanceFiscalYears(companyId).then(setFiscalYearsWithData).catch(() => {})
      resetImportModal()
      alert(`Import réussi ! ${result.accounts_imported} compte(s) importé(s) pour ${selectedMonth} ${selectedYear}.`)
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return
      console.error("Error importing file:", error)
      alert(formatApiError(error))
    } finally {
      setImporting(false)
    }
  }

  const updateNewAccountDraft = (accountNumber: string, patch: Partial<NewAccountDraft>) => {
    setNewAccountDrafts((prev) => {
      const cur = prev[accountNumber]
      if (!cur) return prev
      return { ...prev, [accountNumber]: { ...cur, ...patch } }
    })
  }

  const ignoreUnknownAccount = (accountNumber: string) => {
    setIgnoredUnknownAccounts((prev) => {
      const next = new Set(prev)
      next.add(accountNumber)
      return next
    })
  }

  const restoreAllIgnoredUnknownAccounts = () => {
    setIgnoredUnknownAccounts(new Set())
  }

  const openDeleteModal = () => {
    setShowDeleteModal(true)
    setDeleteMonth("")
    setDeleteModalLoading(true)
    void (async () => {
      try {
        const years = await getTrialBalanceFiscalYears(companyId)
        setFiscalYearsWithData(years)
        if (years.length === 0) {
          setDeleteAvailableMonths([])
          return
        }
        const preferred = years.includes(trialFiscalYear) ? trialFiscalYear : years[0]
        setDeleteYear(String(preferred))
        const tb = await getTrialBalance(companyId, preferred)
        setDeleteAvailableMonths(tb.months_with_data ?? [])
      } catch (error) {
        if (!(error instanceof ApiError && (error.status === 401 || error.status === 403))) {
          console.error("Error loading delete modal data:", error)
        }
        setDeleteAvailableMonths([])
      } finally {
        setDeleteModalLoading(false)
      }
    })()
  }

  const handleDeleteYearChange = (y: string) => {
    setDeleteYear(y)
    setDeleteMonth("")
    const fy = parseInt(y, 10)
    if (Number.isNaN(fy)) return
    setDeleteModalLoading(true)
    getTrialBalance(companyId, fy)
      .then((tb) => setDeleteAvailableMonths(tb.months_with_data ?? []))
      .catch(() => setDeleteAvailableMonths([]))
      .finally(() => setDeleteModalLoading(false))
  }

  const handleConfirmDeletePeriod = async () => {
    if (!deleteMonth) {
      alert("Veuillez sélectionner un mois.")
      return
    }
    const monthNum = months.indexOf(deleteMonth) + 1
    const fy = parseInt(deleteYear, 10)
    if (Number.isNaN(fy)) {
      alert("Année invalide.")
      return
    }
    if (!deleteAvailableMonths.includes(monthNum)) {
      alert("Ce mois ne contient pas de données importées pour cette année.")
      return
    }
    // Step 1: highlight the column in red (and switch the view to that fiscal year if needed),
    // then open a final confirmation modal.
    setDeletingPeriod(true)
    try {
      if (trialFiscalYear !== fy) {
        const tb = await getTrialBalance(companyId, fy)
        setAccounts(mapTrialBalanceAccounts(tb))
        setMonthsWithData(tb.months_with_data ?? [])
        setTrialFiscalYear(tb.fiscal_year)
      }
      const monthKey = months[monthNum - 1]
      setPendingDelete({
        fiscalYear: fy,
        monthNum,
        monthKey,
        label: `${monthKey} ${fy}`,
      })
      setShowDeleteModal(false)
      setShowDeleteConfirmModal(true)
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return
      }
      console.error("Error preparing delete preview:", error)
      alert("Impossible de préparer la suppression.")
    } finally {
      setDeletingPeriod(false)
    }
  }

  const handleFinalizeDelete = async () => {
    if (!pendingDelete) return
    setDeletingPeriod(true)
    try {
      const tbData = await deleteTrialBalanceMonth(companyId, pendingDelete.fiscalYear, pendingDelete.monthNum)
      setAccounts(mapTrialBalanceAccounts(tbData))
      setMonthsWithData(tbData.months_with_data ?? [])
      setTrialFiscalYear(tbData.fiscal_year)
      const years = await getTrialBalanceFiscalYears(companyId)
      setFiscalYearsWithData(years)
      setShowDeleteConfirmModal(false)
      setPendingDelete(null)
      setDeleteMonth("")
      setDeleteAvailableMonths([])
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return
      }
      console.error("Error deleting trial balance month:", error)
      alert("Impossible de supprimer les données.")
    } finally {
      setDeletingPeriod(false)
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
                <h2 className="text-4xl font-semibold text-[#E6D6C3] mb-2 tracking-tight">Balance de vérification</h2>
              </div>
              <p className="text-base text-[#C9B8A5]/90 mb-6">
                Configuration et paramètres de la société
              </p>
              <p className="text-base text-[#C9B8A5]/90 mb-6 leading-relaxed max-w-4xl">
                Gérez les informations de votre société, ses divisions et sous-divisions. Configurez les paramètres
                comptables et accédez aux différents modules de configuration pour cette entité.
              </p>
              {/* Navigation Menu */}
              <div className="flex items-end gap-8 mb-2">
                <Link
                  href={`/settings/companies/${companyId}`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span className="text-sm font-normal transition-colors text-slate-200 hover:text-[#E6D6C3]">
                    Information de base
                  </span>
                </Link>
                <Link
                  href={`/settings/companies/${companyId}/mapping`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span className="text-sm font-normal transition-colors text-slate-200 hover:text-[#E6D6C3]">
                    Mapping comptable
                  </span>
                </Link>
                <Link
                  href={`/settings/companies/${companyId}/link-codes`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span className="text-sm font-normal transition-colors text-slate-200 hover:text-[#E6D6C3]">
                    Code de liaison
                  </span>
                </Link>
                <div className="relative pb-4 border-b border-slate-600/30">
                  <span className="text-sm font-normal transition-colors text-slate-200 hover:text-[#E6D6C3]">
                    Balance de vérification
                  </span>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E0742D] z-10"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Overlapping section */}
      <div className="relative -mt-32 mb-12">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className={cn("w-full overflow-hidden", dashboardCardFrameStaticClass)}>
            <div className={dashboardCardRingClass} aria-hidden />
            <div className="relative w-full min-w-0">
              <div className={cn("px-6 py-5 sm:px-7", dashboardCardHeaderBarClass)}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className={dashboardCardHeaderIconBoxClass}>
                      <FileSpreadsheet className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className={cn("text-xl leading-tight mb-1", dashboardCardTitleClass)}>
                        Balance de vérification
                      </h2>
                      <p className={cn("text-sm leading-relaxed", dashboardCardBodyMutedClass)}>
                        Les # de compte et les descriptions proviennent du mapping comptable. Les colonnes de montants
                        correspondent aux mois importés (ex. Mars 2025).
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-row items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openDeleteModal()}
                      disabled={fiscalYearsLoading || fiscalYearsWithData.length === 0}
                      title={
                        fiscalYearsWithData.length === 0
                          ? "Aucune donnée importée à supprimer"
                          : undefined
                      }
                      className="h-9 gap-2 rounded-xl border-2 border-slate-700/70 bg-white px-3.5 text-sm font-semibold text-[#2A2F3A] shadow-sm transition-all hover:border-red-500/45 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/25 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                      Supprimer
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setImportStep("file")
                        setPreview(null)
                        setNewAccountDrafts({})
                        setShowImportModal(true)
                      }}
                      className="h-9 shrink-0 gap-2 rounded-xl bg-[#E0742D] px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#c96526] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E0742D]/30 focus-visible:ring-offset-2"
                    >
                      <Upload className="w-4 h-4" />
                      Importer Excel
                    </Button>
                  </div>
                </div>
              </div>

            {/* Table */}
            <div className="overflow-x-auto bg-white/80">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm sticky left-0 bg-slate-50 z-10"># de compte</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm sticky left-[120px] bg-slate-50 z-10">Description</th>
                    {displayMonthColumns.map(({ label, monthKey }) => (
                      <th
                        key={`${monthKey}-${trialFiscalYear}`}
                        className={cn(
                          "px-6 py-4 text-right font-semibold text-slate-900 text-sm min-w-[140px]",
                          pendingDelete && pendingDelete.fiscalYear === trialFiscalYear && pendingDelete.monthKey === monthKey
                            ? "bg-red-50 text-red-700"
                            : undefined
                        )}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accounts.length === 0 ? (
                    <tr>
                      <td colSpan={2 + displayMonthColumns.length} className="px-8 py-12 text-center text-sm text-slate-500">
                        <p>
                          Aucun compte dans le mapping comptable. Ajoutez des comptes dans{" "}
                          <Link href={`/settings/companies/${companyId}/mapping`} className="font-medium text-emerald-700 underline underline-offset-2">
                            Mapping comptable
                          </Link>{" "}
                          puis importez les montants ici.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    accounts.map((account) => (
                      <tr key={account.accountNumber} className="group border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-600 font-mono sticky left-0 z-10 bg-white transition-colors group-hover:bg-slate-50">
                          {account.accountNumber}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900 sticky left-[120px] z-10 bg-white transition-colors group-hover:bg-slate-50">
                          {account.description}
                        </td>
                        {displayMonthColumns.map(({ label, monthKey }) => (
                          <td
                            key={label}
                            className={cn(
                              "px-6 py-4 text-sm text-slate-600 text-right font-mono",
                              pendingDelete && pendingDelete.fiscalYear === trialFiscalYear && pendingDelete.monthKey === monthKey
                                ? "bg-red-50"
                                : undefined
                            )}
                          >
                            {formatAmount(account.monthlyAmounts?.[monthKey])}
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
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[3px]">
          <div
            className={cn(
              "flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_20px_60px_-24px_rgba(15,23,42,0.35)]",
              importStep === "validate" ? "max-w-5xl" : "max-w-lg",
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby="trial-balance-import-title"
          >
            {/* En-tête : pas de barre verticale — hiérarchie typographique + étapes */}
            <div className="shrink-0 border-b border-slate-100 bg-white px-6 pb-5 pt-6">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100/90 ring-1 ring-slate-200/80">
                  <FileSpreadsheet className="h-6 w-6 text-slate-600" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                        importStep === "file"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      1 · Fichier
                    </span>
                    <span className="text-slate-300" aria-hidden>
                      →
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                        importStep === "validate"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      2 · Validation
                    </span>
                  </div>
                  <h3
                    id="trial-balance-import-title"
                    className="mt-2 text-lg font-semibold tracking-tight text-slate-900"
                  >
                    {importStep === "file"
                      ? "Importer une balance de vérification"
                      : "Valider l'import"}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">
                    {importStep === "file"
                      ? "Choisissez votre fichier Excel ou CSV, puis la période concernée. Vous pourrez vérifier l’équilibre avant d’importer."
                      : "Contrôlez la somme des montants et complétez le mapping pour les comptes absents, ou ignorez-les s’ils sont à 0 $."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetImportModal}
                  className="h-9 w-9 shrink-0 rounded-xl p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {importStep === "file" ? (
              <>
                <div className="space-y-5 overflow-y-auto bg-gradient-to-b from-slate-50/40 to-white px-6 py-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-800">Fichier</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      className="sr-only"
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setDragging(true)
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault()
                        setDragging(false)
                        const file = e.dataTransfer.files?.[0]
                        if (file) setImportFile(file)
                      }}
                      className={cn(
                        "group relative flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed px-5 py-8 transition-all",
                        dragging
                          ? "border-slate-400 bg-slate-100/80 shadow-inner"
                          : importFile
                            ? "border-slate-300 bg-white shadow-sm ring-1 ring-slate-200/80"
                            : "border-slate-200 bg-white/80 hover:border-slate-300 hover:bg-white hover:shadow-sm",
                      )}
                    >
                      {importFile ? (
                        <>
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                            <FileSpreadsheet className="h-5 w-5 text-slate-600" />
                          </div>
                          <p className="max-w-full truncate px-2 text-center text-sm font-medium text-slate-900">
                            {importFile.name}
                          </p>
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
                            className="text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-red-700"
                          >
                            Retirer le fichier
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors group-hover:bg-slate-200/80 group-hover:text-slate-700">
                            <Upload className="h-5 w-5" />
                          </div>
                          <p className="text-center text-sm text-slate-600">
                            Déposez un fichier ici ou{" "}
                            <span className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-2">
                              parcourez
                            </span>
                          </p>
                          <p className="text-xs text-slate-400">Formats acceptés : .xlsx, .xls, .csv</p>
                        </>
                      )}
                    </div>
                    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
                      <span className="font-medium text-slate-700">Colonnes attendues :</span> # de compte, Description,
                      Montant. La somme des montants doit être égale à <span className="font-mono">0,00 $</span>.
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-800">Mois</label>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-50/80 focus:ring-2 focus:ring-slate-900/10">
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
                      <label className="mb-2 block text-sm font-medium text-slate-800">Année</label>
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-50/80 focus:ring-2 focus:ring-slate-900/10">
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
                </div>
                <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                  <Button
                    variant="outline"
                    onClick={resetImportModal}
                    className="h-11 rounded-xl border-slate-200 bg-white px-5 text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handlePreviewStep()}
                    disabled={!importFile || !selectedMonth || previewLoading}
                    className="h-11 rounded-xl bg-[#E0742D] px-6 font-semibold text-white shadow-sm transition-colors hover:bg-[#c96526] disabled:pointer-events-none disabled:opacity-40"
                  >
                    {previewLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Continuer
                  </Button>
                </div>
              </>
            ) : (
              preview && (
                <>
                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-slate-50/40 to-white px-6 py-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                      <p className="text-sm text-slate-600">
                        <span className="font-medium text-slate-900">
                          {selectedMonth} {selectedYear}
                        </span>
                        <span className="text-slate-400"> · </span>
                        {preview.row_count} ligne(s) lue(s)
                      </p>
                    </div>
                    <div
                      className={cn(
                        "rounded-2xl border px-4 py-4 text-sm shadow-sm",
                        preview.balance_is_valid
                          ? "border-emerald-200/80 bg-emerald-50/90 text-emerald-950"
                          : "border-red-200/80 bg-red-50/90 text-red-950",
                      )}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600/90">
                        Somme des montants (fichier)
                      </p>
                      <p className="mt-2 font-mono text-lg font-semibold tabular-nums">
                        {formatAmount(preview.amount_sum)} $
                      </p>
                      {!preview.balance_is_valid && (
                        <p className="mt-3 border-t border-red-200/60 pt-3 text-xs leading-relaxed">
                          La balance n&apos;est pas équilibrée (la somme doit être 0,00 $). Corrigez le fichier avant
                          import.
                        </p>
                      )}
                    </div>

                    {preview.unknown_accounts.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-900">
                            Comptes absents du mapping comptable (
                            {preview.unknown_accounts.filter((u) => !ignoredUnknownAccounts.has(u.account_number)).length}
                            )
                          </p>
                          {ignoredUnknownAccounts.size > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={restoreAllIgnoredUnknownAccounts}
                              className="h-8 rounded-xl border-slate-200/80 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                            >
                              Restaurer tout ({ignoredUnknownAccounts.size})
                            </Button>
                          )}
                        </div>
                        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white to-slate-50/70 px-4 py-3">
                          <p className="text-xs leading-relaxed text-slate-600">
                            Renseignez le code de liaison, les divisions et sous-divisions pour les ajouter au mapping.
                            Si un compte est à 0$, vous pouvez aussi{" "}
                            <span className="font-semibold text-slate-900">l’ignorer</span> : il ne sera pas ajouté au
                            mapping et n’empêchera pas l’import.
                          </p>
                        </div>
                        <div className="max-h-[min(50vh,28rem)] overflow-auto rounded-2xl border border-slate-200/80 bg-white">
                          <table className="w-full min-w-[880px] text-left text-xs">
                            <thead className="sticky top-0 bg-slate-50">
                              <tr className="border-b border-slate-200">
                                <th className="px-2 py-2 font-semibold text-slate-700"># compte</th>
                                <th className="px-2 py-2 font-semibold text-slate-700">Description</th>
                                <th className="px-2 py-2 text-right font-semibold text-slate-700">Montant</th>
                                <th className="px-2 py-2 font-semibold text-slate-700">Code de liaison</th>
                                <th className="px-2 py-2 font-semibold text-slate-700">Divisions</th>
                                <th className="px-2 py-2 font-semibold text-slate-700">Sous-divisions</th>
                                <th className="px-1 py-2 text-center font-semibold text-slate-700">Int.</th>
                                <th className="px-1 py-2 text-center font-semibold text-slate-700">Amort.</th>
                                <th className="px-1 py-2 text-center font-semibold text-slate-700">Var.</th>
                                <th className="px-1 py-2 text-center font-semibold text-slate-700">Fix.</th>
                                <th className="px-2 py-2 font-semibold text-slate-700">Interco</th>
                                <th className="px-2 py-2 text-right font-semibold text-slate-700">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {preview.unknown_accounts
                                .filter((u) => !ignoredUnknownAccounts.has(u.account_number))
                                .map((u) => {
                                const d = newAccountDrafts[u.account_number]
                                if (!d) return null
                                return (
                                  <tr key={u.account_number} className="border-b border-slate-100 hover:bg-slate-50/80">
                                    <td className="px-2 py-1.5 font-mono text-slate-700">{u.account_number}</td>
                                    <td className="max-w-[140px] px-2 py-1.5 text-slate-700">{u.description || "—"}</td>
                                    <td className="px-2 py-1.5 text-right font-mono text-slate-700">{formatAmount(u.amount)}</td>
                                    <td className="px-1 py-1">
                                      <Input
                                        className="h-9 rounded-xl border-slate-200/80 bg-white text-xs shadow-sm placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#E0742D]/25"
                                        value={d.linkCode}
                                        onChange={(e) =>
                                          updateNewAccountDraft(u.account_number, { linkCode: e.target.value })
                                        }
                                        placeholder="Code"
                                      />
                                    </td>
                                    <td className="px-1 py-1">
                                      <Input
                                        className="h-9 rounded-xl border-slate-200/80 bg-white text-xs shadow-sm placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#E0742D]/25"
                                        value={d.divisions}
                                        onChange={(e) =>
                                          updateNewAccountDraft(u.account_number, { divisions: e.target.value })
                                        }
                                      />
                                    </td>
                                    <td className="px-1 py-1">
                                      <Input
                                        className="h-9 rounded-xl border-slate-200/80 bg-white text-xs shadow-sm placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#E0742D]/25"
                                        value={d.subDivisions}
                                        onChange={(e) =>
                                          updateNewAccountDraft(u.account_number, { subDivisions: e.target.value })
                                        }
                                      />
                                    </td>
                                    <td className="px-1 py-1 text-center">
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-slate-300 text-[#E0742D] focus:ring-[#E0742D]/30"
                                        checked={d.interests}
                                        onChange={(e) =>
                                          updateNewAccountDraft(u.account_number, { interests: e.target.checked })
                                        }
                                      />
                                    </td>
                                    <td className="px-1 py-1 text-center">
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-slate-300 text-[#E0742D] focus:ring-[#E0742D]/30"
                                        checked={d.amortization}
                                        onChange={(e) =>
                                          updateNewAccountDraft(u.account_number, { amortization: e.target.checked })
                                        }
                                      />
                                    </td>
                                    <td className="px-1 py-1 text-center">
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-slate-300 text-[#E0742D] focus:ring-[#E0742D]/30"
                                        checked={d.variableCosts}
                                        onChange={(e) =>
                                          updateNewAccountDraft(u.account_number, { variableCosts: e.target.checked })
                                        }
                                      />
                                    </td>
                                    <td className="px-1 py-1 text-center">
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-slate-300 text-[#E0742D] focus:ring-[#E0742D]/30"
                                        checked={d.fixedCosts}
                                        onChange={(e) =>
                                          updateNewAccountDraft(u.account_number, { fixedCosts: e.target.checked })
                                        }
                                      />
                                    </td>
                                    <td className="px-1 py-1">
                                      <Select
                                        value={d.intercoCompanyId || "none"}
                                        onValueChange={(v) =>
                                          updateNewAccountDraft(u.account_number, { intercoCompanyId: v })
                                        }
                                      >
                                        <SelectTrigger className="h-9 w-[7.5rem] rounded-xl border-slate-200/80 bg-white text-xs shadow-sm hover:bg-slate-50 focus:ring-2 focus:ring-[#E0742D]/25">
                                          <SelectValue placeholder="—" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">Aucune</SelectItem>
                                          {importOrgCompanies.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                              {c.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </td>
                                    <td className="px-2 py-1 text-right">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => ignoreUnknownAccount(u.account_number)}
                                        className="h-8 rounded-xl px-2 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-700"
                                        title="Ignorer ce compte (n’empêchera pas l’import)"
                                      >
                                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                                        Ignorer
                                      </Button>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setImportStep("file")
                        setPreview(null)
                        setNewAccountDrafts({})
                      }}
                      className="h-11 rounded-xl border-slate-200 bg-white px-5 text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      Retour
                    </Button>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={resetImportModal}
                        className="h-11 rounded-xl border-slate-200 bg-white px-5 text-slate-700 shadow-sm hover:bg-slate-50"
                      >
                        Annuler
                      </Button>
                      <Button
                        type="button"
                        onClick={() => void handleFinalImport()}
                        disabled={!canFinalizeImport || importing}
                        className="h-11 rounded-xl bg-[#E0742D] px-6 font-semibold text-white shadow-sm transition-colors hover:bg-[#c96526] disabled:pointer-events-none disabled:opacity-40"
                      >
                        {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Importer
                      </Button>
                    </div>
                  </div>
                </>
              )
            )}
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Supprimer une période</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteMonth("")
                  setDeleteAvailableMonths([])
                }}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative space-y-4 px-6 py-6">
              {deleteModalLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              )}
              <p className="text-sm leading-relaxed text-slate-600">
                Toutes les données importées pour le mois et l&apos;année choisis seront supprimées. Cette action est
                irréversible.
              </p>
              {fiscalYearsWithData.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Aucune donnée importée. Importez d&apos;abord une balance pour un mois donné.
                </p>
              ) : (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Année</label>
                    <Select value={deleteYear} onValueChange={handleDeleteYearChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fiscalYearsWithData.map((year) => (
                          <SelectItem key={year} value={String(year)}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Mois</label>
                    {deleteMonthOptions.length === 0 ? (
                      <p className="text-sm text-slate-500">Aucun mois importé pour cette année.</p>
                    ) : (
                      <Select value={deleteMonth || undefined} onValueChange={setDeleteMonth}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un mois" />
                        </SelectTrigger>
                        <SelectContent>
                          {deleteMonthOptions.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteMonth("")
                  setDeleteAvailableMonths([])
                }}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={() => void handleConfirmDeletePeriod()}
                disabled={
                  fiscalYearsWithData.length === 0 ||
                  deleteMonthOptions.length === 0 ||
                  !deleteMonth ||
                  deletingPeriod ||
                  deleteModalLoading
                }
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {deletingPeriod ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Continuer
              </Button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirmModal && pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Confirmer la suppression</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowDeleteConfirmModal(false)
                  setPendingDelete(null)
                }}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3 px-6 py-6">
              <p className="text-sm text-slate-700">
                Vous êtes sur le point de supprimer définitivement la colonne{" "}
                <span className="font-semibold text-red-700">{pendingDelete.label}</span>.
              </p>
              <p className="text-sm text-slate-600">
                La colonne correspondante est maintenant surlignée en rouge dans le tableau pour validation visuelle.
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirmModal(false)
                  setPendingDelete(null)
                }}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={() => void handleFinalizeDelete()}
                disabled={deletingPeriod}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {deletingPeriod ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Supprimer définitivement
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
