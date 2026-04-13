"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, FileSpreadsheet, Upload, X, Search, Trash2, Pencil } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import * as XLSX from "xlsx"
import {
  getCompany,
  listCompanies,
  listAccountMappings,
  upsertAccountMappings,
  deleteAccountMapping,
  getStatementStructure,
  type Company as ApiCompany,
  type AccountMappingData,
  type Division,
  type SubDivision,
} from "@/lib/api"
import {
  dtCtDisplayForAccountLinkCode,
  groupeDisplayForAccountMappingTable,
} from "@/lib/income-statement-structure-utils"
import {
  buildLinkCodeReferenceFromStructures,
  provenanceLabelFromLinkCodes,
} from "@/lib/link-code-reference"
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

interface AccountMapping {
  /** Id API pour suppression */
  mappingId: string
  accountNumber: string
  description: string
  linkCode?: string
  summaryEF?: string
  detailEF?: string
  divisions?: string
  subDivisions?: string
  /** Conservé côté API, non affiché dans le tableau. */
  fdrhc?: boolean
  interests?: boolean
  amortization?: boolean
  variableCosts?: boolean
  fixedCosts?: boolean
  /** Conservés côté API, non affichés dans le tableau. */
  product?: string
  customer?: string
  supplier?: string
  interco?: string
}

function mapApiCompany(c: ApiCompany): Company {
  return {
    id: c.id,
    name: c.name,
    fiscalYearEnd: c.fiscal_year_end,
    currency: c.currency,
  }
}

function mapApiMapping(m: AccountMappingData): AccountMapping {
  return {
    mappingId: m.id,
    accountNumber: m.account_number,
    description: m.description,
    linkCode: m.link_code || undefined,
    summaryEF: m.summary_ef || undefined,
    detailEF: m.detail_ef || undefined,
    divisions: m.divisions || undefined,
    subDivisions: m.sub_divisions || undefined,
    fdrhc: m.fdrhc,
    interests: m.interests,
    amortization: m.amortization,
    variableCosts: m.variable_costs,
    fixedCosts: m.fixed_costs,
    product: m.product || undefined,
    customer: m.customer || undefined,
    supplier: m.supplier || undefined,
    interco: m.interco_company_id || undefined,
  }
}

/** Libellé EF depuis la table code → libellé (Sommaire ou Détail) ; « 0 » si pas de correspondance. */
function efLabelFromLinkCode(linkCode: string | undefined, labelByLinkCode: Map<string, string>): string {
  const lc = linkCode?.trim()
  if (!lc) return "0"
  const v = labelByLinkCode.get(lc)
  if (v === undefined || v === null || v === "" || v === "—") return "0"
  return v
}

/** Met à jour summary_ef / detail_ef stockés selon le code de liaison (structure états financiers). */
function derivedEfFieldsFromLinkCode(
  linkCode: string | undefined,
  summaryEfByLinkCode: Map<string, string>,
  detailEfByLinkCode: Map<string, string>,
): { summaryEF?: string; detailEF?: string } {
  const s = efLabelFromLinkCode(linkCode, summaryEfByLinkCode)
  const d = efLabelFromLinkCode(linkCode, detailEfByLinkCode)
  return {
    summaryEF: s === "0" ? undefined : s,
    detailEF: d === "0" ? undefined : d,
  }
}

function boolSearchText(v: boolean | undefined): string {
  return v ? "oui coché" : "non décoché"
}

/** Valeur du Select division : nom en base, ou entrée « hors liste » pour anciennes données. */
function divisionSelectValue(stored: string | undefined, divisions: Division[]): string {
  const t = stored?.trim()
  if (!t) return "none"
  if (divisions.some((d) => d.name === t)) return t
  return "__legacy__"
}

function subDivisionSelectValue(stored: string | undefined, subOptions: SubDivision[]): string {
  const t = stored?.trim()
  if (!t) return "none"
  if (subOptions.some((s) => s.name === t)) return t
  return "__legacy__"
}

type MappingSearchScope =
  | "all"
  | "accountNumber"
  | "description"
  | "provenance"
  | "dtCt"
  | "groupe"
  | "linkCode"
  | "sommaireEf"
  | "detailEf"
  | "divisions"
  | "subDivisions"
  | "variableCosts"
  | "fixedCosts"
  | "interco"

const MAPPING_SEARCH_SCOPE_OPTIONS: { value: MappingSearchScope; label: string }[] = [
  { value: "all", label: "Toutes les colonnes" },
  { value: "accountNumber", label: "Compte" },
  { value: "description", label: "Description" },
  { value: "dtCt", label: "DT/CT" },
  { value: "groupe", label: "Groupe" },
  { value: "linkCode", label: "Code" },
  { value: "provenance", label: "Type" },
  { value: "sommaireEf", label: "Poste" },
  { value: "detailEf", label: "Détail" },
  { value: "divisions", label: "Divisions" },
  { value: "subDivisions", label: "S-division" },
  { value: "variableCosts", label: "CV" },
  { value: "fixedCosts", label: "CF" },
  { value: "interco", label: "Interco" },
]

function toApiMappingEntry(m: AccountMapping) {
  return {
    account_number: m.accountNumber,
    description: m.description,
    link_code: m.linkCode || null,
    summary_ef: m.summaryEF || null,
    detail_ef: m.detailEF || null,
    divisions: m.divisions || null,
    sub_divisions: m.subDivisions || null,
    fdrhc: m.fdrhc || false,
    interests: m.interests || false,
    amortization: m.amortization || false,
    variable_costs: m.variableCosts || false,
    fixed_costs: m.fixedCosts || false,
    product: m.product ?? null,
    customer: m.customer ?? null,
    supplier: m.supplier || null,
    interco_company_id: m.interco || null,
  }
}

export default function CompanyMappingPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string
  const [company, setCompany] = useState<Company | null>(null)
  /** Divisions / S-divisions de la société (Information de base), même principe que le sélecteur Entité (états financiers). */
  const [companyDivisions, setCompanyDivisions] = useState<Division[]>([])
  const [accounts, setAccounts] = useState<AccountMapping[]>([])
  const accountsRef = useRef(accounts)
  accountsRef.current = accounts
  const [allCompanies, setAllCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [incomeStatementStructure, setIncomeStatementStructure] = useState<
    Record<string, unknown>[] | null
  >(null)
  const [balanceSheetStructure, setBalanceSheetStructure] = useState<Record<string, unknown>[] | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importModalStep, setImportModalStep] = useState<"file" | "confirm">("file")
  const [pendingImportEntries, setPendingImportEntries] = useState<
    Array<{ account_number: string; description: string; link_code: string | null }>
  >([])
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [mappingSearch, setMappingSearch] = useState("")
  const [mappingSearchScope, setMappingSearchScope] = useState<MappingSearchScope>("all")
  const fileInputRef = useRef<HTMLInputElement>(null)
  /** Ligne dont le code de liaison est en cours d’édition (après clic sur le crayon). */
  const [editingLinkCodeAccountNumber, setEditingLinkCodeAccountNumber] = useState<string | null>(null)
  const linkCodeEditInputRef = useRef<HTMLInputElement>(null)

  const parseMappingExcel = async (file: File) => {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: "array" })
    const sheetName = wb.SheetNames[0]
    if (!sheetName) return []
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" })

    const normalize = (v: unknown) => String(v ?? "").trim()
    const normalizeKey = (k: string) =>
      k
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()

    return rows
      .map((r) => {
        const normalized: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(r)) normalized[normalizeKey(k)] = v

        const accountNumber =
          normalize(normalized["# de compte"]) ||
          normalize(normalized["# de compte "]) ||
          normalize(normalized["no de compte"]) ||
          normalize(normalized["numero de compte"]) ||
          normalize(normalized["account"]) ||
          normalize(normalized["account number"])

        const description =
          normalize(normalized["description"]) ||
          normalize(normalized["desc"]) ||
          normalize(normalized["nom"]) ||
          normalize(normalized["account name"])

        const linkCode =
          normalize(normalized["code de liaison"]) ||
          normalize(normalized["code liaison"]) ||
          normalize(normalized["liaison"]) ||
          normalize(normalized["link code"]) ||
          normalize(normalized["link_code"])

        return { accountNumber, description, linkCode }
      })
      .filter((r) => r.accountNumber.length > 0)
  }

  // Load all data from API
  useEffect(() => {
    if (companyId) {
      setLoading(true)
      getCompany(companyId)
        .then((companyData) => {
          setCompany(mapApiCompany(companyData))
          setCompanyDivisions(companyData.divisions ?? [])
          return Promise.all([
            listAccountMappings(companyId).catch(() => []),
            listCompanies().catch(() => []),
          ])
        })
        .then(([mappingsData, companiesData]) => {
          setAccounts(mappingsData.map(mapApiMapping))
          setAllCompanies(
            companiesData
              .filter((c: ApiCompany) => c.id !== companyId)
              .map(mapApiCompany)
          )
        })
        .catch((e) => {
          console.error("Error loading company:", e)
        })
        .finally(() => setLoading(false))
    }
  }, [companyId, router])

  useEffect(() => {
    if (!companyId) return
    Promise.all([
      getStatementStructure(companyId, "income-statement")
        .then((d) => d.structure)
        .catch(() => [] as Record<string, unknown>[]),
      getStatementStructure(companyId, "balance-sheet")
        .then((d) => d.structure)
        .catch(() => [] as Record<string, unknown>[]),
    ]).then(([is, bs]) => {
      setIncomeStatementStructure(is)
      setBalanceSheetStructure(bs)
    })
  }, [companyId])

  const linkCodeReference = useMemo(
    () =>
      buildLinkCodeReferenceFromStructures(
        incomeStatementStructure ?? [],
        balanceSheetStructure ?? []
      ),
    [incomeStatementStructure, balanceSheetStructure]
  )

  const {
    incomeStatementCodes,
    balanceSheetCodes,
    summaryEfByLinkCode,
    detailEfByLinkCode,
    groupeByLinkCode,
    dtCtByLinkCode,
  } = linkCodeReference

  const mappingIncompleteGroupeCount = useMemo(() => {
    return accounts.filter(
      (a) =>
        groupeDisplayForAccountMappingTable(a.linkCode, groupeByLinkCode) === "Mapping incomplet",
    ).length
  }, [accounts, groupeByLinkCode])

  const filteredAccounts = useMemo(() => {
    const q = mappingSearch.trim().toLowerCase()
    if (!q) return accounts
    const scope = mappingSearchScope

    return accounts.filter((account) => {
      const provenance = provenanceLabelFromLinkCodes(account.linkCode, incomeStatementCodes, balanceSheetCodes)
      const sum = efLabelFromLinkCode(account.linkCode, summaryEfByLinkCode)
      const det = efLabelFromLinkCode(account.linkCode, detailEfByLinkCode)
      const groupeLabel = groupeDisplayForAccountMappingTable(account.linkCode, groupeByLinkCode)
      const dtCtLabel = dtCtDisplayForAccountLinkCode(account.linkCode, dtCtByLinkCode)
      const intercoLabel = account.interco
        ? allCompanies.find((c) => c.id === account.interco)?.name ?? account.interco
        : ""

      if (scope === "all") {
        const blob = [
          account.accountNumber,
          account.description,
          groupeLabel,
          account.linkCode,
          provenance,
          sum,
          det,
          account.divisions,
          account.subDivisions,
          boolSearchText(account.variableCosts),
          boolSearchText(account.fixedCosts),
          intercoLabel,
        ]
          .map((x) => String(x ?? "").toLowerCase())
          .join(" ")
        return blob.includes(q)
      }

      const fieldText = ((): string => {
        switch (scope) {
          case "accountNumber":
            return String(account.accountNumber ?? "")
          case "description":
            return String(account.description ?? "")
          case "provenance":
            return provenance
          case "dtCt":
            return dtCtLabel
          case "groupe":
            return groupeLabel
          case "linkCode":
            return String(account.linkCode ?? "")
          case "sommaireEf":
            return sum
          case "detailEf":
            return det
          case "divisions":
            return String(account.divisions ?? "")
          case "subDivisions":
            return String(account.subDivisions ?? "")
          case "interests":
            return boolSearchText(account.interests)
          case "amortization":
            return boolSearchText(account.amortization)
          case "variableCosts":
            return boolSearchText(account.variableCosts)
          case "fixedCosts":
            return boolSearchText(account.fixedCosts)
          case "interco":
            return intercoLabel
          default:
            return ""
        }
      })()

      return String(fieldText ?? "").toLowerCase().includes(q)
    })
  }, [
    accounts,
    mappingSearch,
    mappingSearchScope,
    incomeStatementCodes,
    balanceSheetCodes,
    groupeByLinkCode,
    dtCtByLinkCode,
    summaryEfByLinkCode,
    detailEfByLinkCode,
    allCompanies,
  ])

  const mappingSearchPlaceholder = useMemo(() => {
    if (mappingSearchScope === "all") {
      return "Rechercher dans tout le tableau…"
    }
    const col =
      MAPPING_SEARCH_SCOPE_OPTIONS.find((o) => o.value === mappingSearchScope)?.label ?? ""
    return `Rechercher dans : ${col}…`
  }, [mappingSearchScope])

  useEffect(() => {
    if (showImportModal) {
      setImportModalStep("file")
      setPendingImportEntries([])
    }
  }, [showImportModal])

  // Save account mappings to API
  const saveAccounts = useCallback(async (updatedAccounts: AccountMapping[]) => {
    try {
      await upsertAccountMappings(companyId, updatedAccounts.map(toApiMappingEntry))
    } catch (e) {
      console.error("Error saving account mappings:", e)
    }
  }, [companyId])

  // Handle interco change for an account
  const handleIntercoChange = (accountNumber: string, interco: string) => {
    const updatedAccounts = accounts.map(acc =>
      acc.accountNumber === accountNumber
        ? { ...acc, interco: interco === "none" ? undefined : interco }
        : acc
    )
    setAccounts(updatedAccounts)
    saveAccounts(updatedAccounts)
  }

  const handleDivisionChange = (accountNumber: string, value: string) => {
    const divisionName = value === "none" ? undefined : value
    const updatedAccounts = accounts.map((acc) =>
      acc.accountNumber === accountNumber
        ? { ...acc, divisions: divisionName, subDivisions: undefined }
        : acc,
    )
    setAccounts(updatedAccounts)
    saveAccounts(updatedAccounts)
  }

  const handleSubDivisionChange = (accountNumber: string, value: string) => {
    const subName = value === "none" ? undefined : value
    const updatedAccounts = accounts.map((acc) =>
      acc.accountNumber === accountNumber ? { ...acc, subDivisions: subName } : acc,
    )
    setAccounts(updatedAccounts)
    saveAccounts(updatedAccounts)
  }

  const handleLinkCodeChange = useCallback(
    (accountNumber: string, raw: string) => {
      const trimmed = raw.trim()
      const linkCode = trimmed || undefined
      setAccounts((prev) => {
        const i = prev.findIndex((a) => a.accountNumber === accountNumber)
        if (i < 0) return prev
        const derived = derivedEfFieldsFromLinkCode(linkCode, summaryEfByLinkCode, detailEfByLinkCode)
        const next = [...prev]
        next[i] = { ...next[i], linkCode, ...derived }
        return next
      })
    },
    [summaryEfByLinkCode, detailEfByLinkCode],
  )

  const persistLinkCodeRow = useCallback(
    (accountNumber: string) => {
      const acc = accountsRef.current.find((a) => a.accountNumber === accountNumber)
      if (acc) {
        void upsertAccountMappings(companyId, [toApiMappingEntry(acc)])
      }
    },
    [companyId],
  )

  const handleStartEditLinkCode = useCallback(
    (accountNumber: string) => {
      if (editingLinkCodeAccountNumber && editingLinkCodeAccountNumber !== accountNumber) {
        persistLinkCodeRow(editingLinkCodeAccountNumber)
      }
      setEditingLinkCodeAccountNumber(accountNumber)
    },
    [editingLinkCodeAccountNumber, persistLinkCodeRow],
  )

  useEffect(() => {
    if (!editingLinkCodeAccountNumber) return
    const id = requestAnimationFrame(() => {
      linkCodeEditInputRef.current?.focus()
      linkCodeEditInputRef.current?.select()
    })
    return () => cancelAnimationFrame(id)
  }, [editingLinkCodeAccountNumber])

  const handleDeleteMappingRow = useCallback(
    async (account: AccountMapping) => {
      if (
        !window.confirm(
          `Supprimer le compte ${account.accountNumber} du mapping ? Cette action est irréversible.`,
        )
      ) {
        return
      }
      try {
        await deleteAccountMapping(companyId, account.mappingId)
        setAccounts((prev) => prev.filter((a) => a.accountNumber !== account.accountNumber))
        setEditingLinkCodeAccountNumber((cur) => (cur === account.accountNumber ? null : cur))
      } catch (e) {
        console.error(e)
        alert("Impossible de supprimer cette ligne.")
      }
    },
    [companyId],
  )

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
                <h2 className="text-4xl font-semibold text-[#E6D6C3] mb-2 tracking-tight">Mapping comptable</h2>
              </div>
              <p className="text-base text-[#C9B8A5]/90 mb-6">
                Configuration et paramètres de la société
              </p>
              <p className="text-base text-[#C9B8A5]/90 mb-6 leading-relaxed max-w-4xl">
                Gérez les informations de votre société, ses divisions et S-divisions. Configurez les paramètres
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
                <div className="relative pb-4 border-b border-slate-600/30">
                  <span className="text-sm font-normal transition-colors text-slate-200 hover:text-[#E6D6C3]">
                    Mapping comptable
                  </span>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E0742D] z-10"></div>
                </div>
                <Link
                  href={`/settings/companies/${companyId}/link-codes`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span className="text-sm font-normal transition-colors text-slate-200 hover:text-[#E6D6C3]">
                    Code de liaison
                  </span>
                </Link>
                <Link
                  href={`/settings/companies/${companyId}/financial-statements-mapping`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span className="text-sm font-normal transition-colors text-slate-200 hover:text-[#E6D6C3]">
                    Mapping états financiers
                  </span>
                </Link>
                <Link
                  href={`/settings/companies/${companyId}/trial-balance`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span className="text-sm font-normal transition-colors text-slate-200 hover:text-[#E6D6C3]">
                    Balance de vérification
                  </span>
                </Link>
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
                      <h2 className={cn("text-xl leading-tight mb-1", dashboardCardTitleClass)}>Mapping comptable</h2>
                      <p className={cn("text-sm leading-relaxed", dashboardCardBodyMutedClass)}>
                        Importez un fichier Excel (# de compte, Description, code de liaison) ou complétez le tableau.
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => setShowImportModal(true)}
                      className="h-9 shrink-0 gap-2 rounded-xl bg-[#E0742D] px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#c96526] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E0742D]/30 focus-visible:ring-offset-2"
                    >
                      <Upload className="h-4 w-4" />
                      Importer Excel
                    </Button>
                  </div>
                </div>
              </div>

            <div className="border-b border-slate-200 bg-white/90 px-4 py-3 sm:px-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
                <div className="relative min-w-0 flex-1 lg:max-w-xl">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <Input
                    type="search"
                    value={mappingSearch}
                    onChange={(e) => setMappingSearch(e.target.value)}
                    placeholder={mappingSearchPlaceholder}
                    className="h-10 rounded-lg border-slate-200 bg-white pl-9 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus-visible:ring-[#E0742D]/30"
                    aria-label={
                      mappingSearchScope === "all"
                        ? "Rechercher dans tout le mapping comptable"
                        : `Rechercher dans la colonne ${
                            MAPPING_SEARCH_SCOPE_OPTIONS.find((o) => o.value === mappingSearchScope)?.label ?? ""
                          }`
                    }
                  />
                </div>
                <div className="flex w-full shrink-0 sm:w-auto sm:min-w-[14rem]">
                  <Select
                    value={mappingSearchScope}
                    onValueChange={(v) => setMappingSearchScope(v as MappingSearchScope)}
                  >
                    <SelectTrigger
                      className="h-10 w-full rounded-lg border-slate-200 bg-white text-sm shadow-sm sm:min-w-[14rem]"
                      aria-label="Filtrer la recherche par colonne"
                    >
                      <SelectValue placeholder="Toutes les colonnes" />
                    </SelectTrigger>
                    <SelectContent align="end" className="max-h-[min(24rem,70vh)]">
                      {MAPPING_SEARCH_SCOPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {accounts.length > 0 && mappingIncompleteGroupeCount > 0 && (
                <p className="mt-3 rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-sm text-amber-950">
                  <span className="font-semibold">Mapping comptable non terminé.</span>{" "}
                  {mappingIncompleteGroupeCount === 1
                    ? "Un compte a un code de liaison sans groupe identifiable"
                    : `${mappingIncompleteGroupeCount} comptes ont un code de liaison sans groupe identifiable`}
                  {" "}
                  (colonne Groupe). Complétez les structures compte de résultat et bilan (Sommaire / liaisons) dans
                  Mapping états financiers pour affecter un groupe à ces codes.
                </p>
              )}
              {mappingSearch.trim() && accounts.length > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  {mappingSearchScope !== "all" && (
                    <span className="font-medium text-slate-600">
                      {
                        MAPPING_SEARCH_SCOPE_OPTIONS.find((o) => o.value === mappingSearchScope)
                          ?.label
                      }
                      {" · "}
                    </span>
                  )}
                  {filteredAccounts.length === 0
                    ? "Aucun résultat."
                    : filteredAccounts.length === accounts.length
                      ? `Tous les comptes (${accounts.length}) correspondent.`
                      : `Affichage de ${filteredAccounts.length} compte${filteredAccounts.length > 1 ? "s" : ""} sur ${accounts.length}.`}
                </p>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-white/80">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Compte</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Description</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">DT/CT</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Groupe</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Code</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Type</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Poste</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Détail</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Divisions</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">S-division</th>
                    <th className="px-6 py-4 text-center font-semibold text-slate-900 text-sm">CV</th>
                    <th className="px-6 py-4 text-center font-semibold text-slate-900 text-sm">CF</th>
                    <th className="px-3 py-4 text-center font-semibold text-slate-900 text-sm w-[7rem] max-w-[7rem]">
                      Interco
                    </th>
                    <th className="px-6 py-4 text-center font-semibold text-slate-900 text-sm min-w-[5.5rem]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="px-8 py-12 text-center text-sm text-slate-500">
                        <p>Aucun compte configuré. Importez votre balance de vérification pour commencer.</p>
                      </td>
                    </tr>
                  ) : filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="px-8 py-12 text-center text-sm text-slate-500">
                        <p>Aucun compte ne correspond à votre recherche.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((account) => (
                      <tr key={account.accountNumber} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-600 font-mono">{account.accountNumber}</td>
                        <td className="px-6 py-4 text-sm text-slate-900">{account.description}</td>
                        <td className="px-6 py-4 text-sm font-mono text-slate-600">
                          {dtCtDisplayForAccountLinkCode(account.linkCode, dtCtByLinkCode)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {(() => {
                            const g = groupeDisplayForAccountMappingTable(
                              account.linkCode,
                              groupeByLinkCode,
                            )
                            if (g === "Mapping incomplet") {
                              return (
                                <span
                                  className="font-medium text-amber-800"
                                  title="Aucun groupe n’est déductible pour ce code : le mapping comptable n’est pas terminé."
                                >
                                  Mapping incomplet
                                </span>
                              )
                            }
                            return <span className="font-mono">{g}</span>
                          })()}
                        </td>
                        <td className="px-6 py-2 align-middle">
                          {editingLinkCodeAccountNumber === account.accountNumber ? (
                            <Input
                              ref={linkCodeEditInputRef}
                              className="h-8 min-w-[7rem] font-mono text-sm"
                              value={account.linkCode ?? ""}
                              onChange={(e) => handleLinkCodeChange(account.accountNumber, e.target.value)}
                              onBlur={() => {
                                persistLinkCodeRow(account.accountNumber)
                                setEditingLinkCodeAccountNumber((cur) =>
                                  cur === account.accountNumber ? null : cur,
                                )
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.currentTarget.blur()
                                }
                              }}
                              placeholder="Code"
                              aria-label={`Code pour ${account.accountNumber}`}
                            />
                          ) : (
                            <span className="block truncate font-mono text-sm text-slate-700">
                              {account.linkCode?.trim() ? account.linkCode : "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {provenanceLabelFromLinkCodes(account.linkCode, incomeStatementCodes, balanceSheetCodes)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {efLabelFromLinkCode(account.linkCode, summaryEfByLinkCode)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {efLabelFromLinkCode(account.linkCode, detailEfByLinkCode)}
                        </td>
                        <td className="px-6 py-2 align-middle">
                          <Select
                            value={divisionSelectValue(account.divisions, companyDivisions)}
                            onValueChange={(v) => {
                              if (v === "__legacy__") return
                              handleDivisionChange(account.accountNumber, v)
                            }}
                          >
                            <SelectTrigger
                              className="h-8 w-[min(12rem,100%)] max-w-[12rem] text-xs"
                              aria-label={`Division pour ${account.accountNumber}`}
                            >
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Aucune</SelectItem>
                              {companyDivisions.map((div) => (
                                <SelectItem key={div.id} value={div.name}>
                                  {div.name}
                                </SelectItem>
                              ))}
                              {account.divisions?.trim() &&
                                !companyDivisions.some((d) => d.name === account.divisions?.trim()) && (
                                  <SelectItem value="__legacy__">
                                    {account.divisions} (hors liste)
                                  </SelectItem>
                                )}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-6 py-2 align-middle">
                          {(() => {
                            const selectedDivision = companyDivisions.find(
                              (d) => d.name === account.divisions?.trim(),
                            )
                            const subOptions = selectedDivision?.sub_divisions ?? []
                            const hasLegacySub =
                              !!account.subDivisions?.trim() &&
                              !subOptions.some((s) => s.name === account.subDivisions?.trim())
                            const subDisabled = !account.divisions?.trim()
                            return (
                              <Select
                                value={subDivisionSelectValue(account.subDivisions, subOptions)}
                                onValueChange={(v) => {
                                  if (v === "__legacy__") return
                                  handleSubDivisionChange(account.accountNumber, v)
                                }}
                                disabled={subDisabled}
                              >
                                <SelectTrigger
                                  className="h-8 w-[min(12rem,100%)] max-w-[12rem] text-xs disabled:opacity-50"
                                  aria-label={`S-division pour ${account.accountNumber}`}
                                >
                                  <SelectValue placeholder="—" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Aucune</SelectItem>
                                  {subOptions.map((sub) => (
                                    <SelectItem key={sub.id} value={sub.name}>
                                      {sub.name}
                                    </SelectItem>
                                  ))}
                                  {hasLegacySub && (
                                    <SelectItem value="__legacy__">
                                      {account.subDivisions} (hors liste)
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            )
                          })()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-emerald-500 rounded border-slate-300"
                            checked={account.variableCosts || false}
                            onChange={(e) => {
                              const i = accounts.findIndex((a) => a.accountNumber === account.accountNumber)
                              if (i < 0) return
                              const updatedAccounts = [...accounts]
                              updatedAccounts[i] = { ...updatedAccounts[i], variableCosts: e.target.checked }
                              setAccounts(updatedAccounts)
                              saveAccounts(updatedAccounts)
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-emerald-500 rounded border-slate-300"
                            checked={account.fixedCosts || false}
                            onChange={(e) => {
                              const i = accounts.findIndex((a) => a.accountNumber === account.accountNumber)
                              if (i < 0) return
                              const updatedAccounts = [...accounts]
                              updatedAccounts[i] = { ...updatedAccounts[i], fixedCosts: e.target.checked }
                              setAccounts(updatedAccounts)
                              saveAccounts(updatedAccounts)
                            }}
                          />
                        </td>
                        <td className="px-3 py-4 text-center align-middle w-[7rem] max-w-[7rem]">
                          <Select
                            value={account.interco || "none"}
                            onValueChange={(value) => handleIntercoChange(account.accountNumber, value)}
                          >
                            <SelectTrigger
                              className="h-8 w-full max-w-[6.5rem] text-xs"
                              disabled={allCompanies.length === 0}
                            >
                              <SelectValue placeholder={allCompanies.length === 0 ? "Aucune société" : "Aucune"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Aucune</SelectItem>
                              {allCompanies.map((comp) => (
                                <SelectItem key={comp.id} value={comp.id}>
                                  {comp.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-8 w-8 p-0 text-slate-400 hover:text-[#E0742D]",
                                editingLinkCodeAccountNumber === account.accountNumber &&
                                  "text-[#E0742D] hover:text-[#c96526]",
                              )}
                              onClick={() => handleStartEditLinkCode(account.accountNumber)}
                              title="Modifier le code de liaison"
                              aria-label={`Modifier le code de liaison pour ${account.accountNumber}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                              onClick={() => void handleDeleteMappingRow(account)}
                              title="Supprimer cette ligne"
                              aria-label={`Supprimer le compte ${account.accountNumber}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
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

      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {importModalStep === "file" ? "Importer un mapping comptable" : "Confirmer l'import"}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowImportModal(false)
                  setImportFile(null)
                  setDragging(false)
                  setImportModalStep("file")
                  setPendingImportEntries([])
                  if (fileInputRef.current) fileInputRef.current.value = ""
                }}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            {importModalStep === "file" ? (
              <>
                <div className="px-6 py-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Fichier Excel</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
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
                        "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 cursor-pointer transition-colors",
                        dragging
                          ? "border-[#E0742D]/60 bg-[#E0742D]/[0.06]"
                          : importFile
                            ? "border-[#E0742D]/40 bg-[#E0742D]/[0.04]"
                            : "border-slate-300 bg-slate-50 hover:border-[#E0742D]/60 hover:bg-[#E0742D]/[0.04]"
                      )}
                    >
                      {importFile ? (
                        <>
                          <FileSpreadsheet className="w-8 h-8 text-[#E0742D]" />
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
                            <span className="font-semibold text-[#E0742D] underline underline-offset-2">parcourez</span>
                          </p>
                          <p className="text-xs text-slate-400">.xlsx ou .xls</p>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Colonnes attendues : # de compte, Description, code de liaison
                    </p>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowImportModal(false)
                      setImportFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ""
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    onClick={async () => {
                      if (!importFile) return
                      setImporting(true)
                      try {
                        const parsed = await parseMappingExcel(importFile)
                        if (parsed.length === 0) {
                          alert("Aucune ligne valide trouvée dans le fichier.")
                          return
                        }
                        const entries = parsed.map((r) => ({
                          account_number: r.accountNumber,
                          description: r.description,
                          link_code: r.linkCode || null,
                        }))
                        setPendingImportEntries(entries)
                        setImportModalStep("confirm")
                      } catch (e) {
                        console.error("Error reading mapping excel:", e)
                        alert("Erreur lors de la lecture du fichier. Vérifiez le format.")
                      } finally {
                        setImporting(false)
                      }
                    }}
                    disabled={!importFile || importing}
                    className="bg-[#E0742D] hover:bg-[#c96526] text-white"
                  >
                    {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Continuer
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="px-6 py-6 space-y-4">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Le fichier contient{" "}
                    <span className="font-semibold text-[#2A2F3A]">{pendingImportEntries.length}</span> ligne
                    {pendingImportEntries.length > 1 ? "s" : ""} avec un{" "}
                    <span className="font-semibold"># de compte</span> valide.
                  </p>
                  <p className="text-sm text-slate-600">
                    Comptes distincts (# de compte) :{" "}
                    <span className="font-semibold text-[#2A2F3A]">
                      {new Set(pendingImportEntries.map((e) => e.account_number)).size}
                    </span>
                  </p>
                  <p className="text-sm text-slate-600">
                    Confirmez pour enregistrer ces données dans le mapping comptable.
                  </p>
                </div>
                <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImportModalStep("file")
                    }}
                  >
                    Retour
                  </Button>
                  <Button
                    type="button"
                    onClick={async () => {
                      if (pendingImportEntries.length === 0) return
                      setImporting(true)
                      try {
                        const saved = await upsertAccountMappings(companyId, pendingImportEntries)
                        setAccounts(saved.map(mapApiMapping))
                        const n = pendingImportEntries.length
                        const distinct = new Set(pendingImportEntries.map((e) => e.account_number)).size
                        setShowImportModal(false)
                        setImportFile(null)
                        setPendingImportEntries([])
                        setImportModalStep("file")
                        if (fileInputRef.current) fileInputRef.current.value = ""
                        alert(
                          `Import terminé : ${n} ligne(s) traitée(s), ${distinct} # de compte distinct(s).`
                        )
                      } catch (e) {
                        console.error("Error importing mapping excel:", e)
                        alert("Erreur lors de l'enregistrement. Réessayez.")
                      } finally {
                        setImporting(false)
                      }
                    }}
                    disabled={importing || pendingImportEntries.length === 0}
                    className="bg-[#E0742D] hover:bg-[#c96526] text-white"
                  >
                    {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Confirmer l&apos;import
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
