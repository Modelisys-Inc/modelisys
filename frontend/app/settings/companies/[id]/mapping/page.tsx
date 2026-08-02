"use client"

import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { MappingColumnFilter } from "@/components/mapping-column-filter"
import { AccountMappingSettingsPanel, type AccountMappingDraft } from "@/components/account-mapping-settings-panel"
import { StandardLinkCodePicker } from "@/components/standard-link-code-picker"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, FileSpreadsheet, Upload, X, Settings, CheckCircle2, AlertTriangle } from "lucide-react"
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
  listCompanyLinkCodes,
  type Company as ApiCompany,
  type AccountMappingData,
  type Division,
  type StandardLinkCode,
} from "@/lib/api"
import {
  filterAssignableMappingLinkCodes,
  isMappingAltAssetTypeUnset,
  isMappingCostTypeUnset,
  isMappingLinkCodeIncomplete,
  mappingAccountTypeDisplayLabel,
  mappingAltAssetTypeLabel,
  mappingCostTypeDisplayLabel,
  mappingCostTypeLabel,
  mappingDetailFromLinkCode,
  mappingGroupeFromLinkCode,
  mappingParentCodeFromLinkCode,
  mappingPosteFromLinkCode,
  sanitizeMappingAltAssetFields,
  sanitizeMappingCostTypeFields,
  sanitizeMappingLiabilityTermFields,
  showsMappingAltAssetTypeOptions,
  showsMappingCostTypeOptions,
  type StandardLinkCodeLookup,
} from "@/lib/standard-link-code-utils"
import { useStandardLinkCodesFlat } from "@/hooks/use-standard-link-codes"
import { buildLinkCodeReferenceFromStructures } from "@/lib/link-code-reference"
import { usePermissions } from "@/hooks/use-permissions"
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
  variableCostRevenueLinkCode?: string
  altAssetCost?: boolean
  altAccumulatedAmortization?: boolean
  liabilityRemainingYears?: number
  liabilityInterestRate?: number
  /** Conservé côté API, non affiché dans le tableau. */
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
    variableCostRevenueLinkCode: m.variable_cost_revenue_link_code || undefined,
    altAssetCost: m.alt_asset_cost,
    altAccumulatedAmortization: m.alt_accumulated_amortization,
    liabilityRemainingYears:
      m.liability_remaining_years != null ? Number(m.liability_remaining_years) : undefined,
    liabilityInterestRate:
      m.liability_interest_rate != null ? Number(m.liability_interest_rate) : undefined,
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

function isAccountUnassigned(account: AccountMapping): boolean {
  return !account.linkCode?.trim()
}

function isAccountCostTypeUnset(account: AccountMapping, linkCodeByCode: StandardLinkCodeLookup): boolean {
  if (!account.linkCode?.trim()) return false
  if (isMappingLinkCodeIncomplete(account.linkCode, linkCodeByCode)) return false
  return isMappingCostTypeUnset(account, linkCodeByCode)
}

function isAccountAltAssetTypeUnset(account: AccountMapping): boolean {
  if (!account.linkCode?.trim()) return false
  return isMappingAltAssetTypeUnset(account)
}

type BulkActionMode = "linkCode" | "costType"

type MappingDiagnosticFilter = "none" | "unassigned" | "invalid" | "costTypeUnset" | "altAssetTypeUnset"

type MappingColumnKey =
  | "accountNumber"
  | "description"
  | "parentCode"
  | "groupe"
  | "linkCode"
  | "costType"
  | "poste"
  | "detail"

const MAPPING_TABLE_COLUMNS: { key: MappingColumnKey; label: string }[] = [
  { key: "accountNumber", label: "Compte" },
  { key: "description", label: "Description" },
  { key: "parentCode", label: "Parent" },
  { key: "linkCode", label: "Code" },
  { key: "groupe", label: "Groupe" },
  { key: "costType", label: "Type" },
  { key: "poste", label: "Poste" },
  { key: "detail", label: "Détail" },
]

function displayCellValue(value: string | undefined | null): string {
  const trimmed = String(value ?? "").trim()
  return trimmed || "—"
}

function MappingCostTypeSticker({
  account,
  linkCodeByCode,
}: {
  account: AccountMapping
  linkCodeByCode: StandardLinkCodeLookup
}) {
  const altKind = mappingAltAssetTypeLabel(account)
  if (altKind !== "na") {
    if (altKind === "cost") {
      return (
        <span className="inline-flex rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-900 ring-1 ring-emerald-200/80">
          Coût
        </span>
      )
    }
    if (altKind === "accumulated") {
      return (
        <span className="inline-flex rounded-md bg-orange-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-orange-900 ring-1 ring-orange-200/80">
          Amort. cumulé
        </span>
      )
    }
    return (
      <span
        className="inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200/80"
        title="Indiquez Coût ou Amortissement cumulé dans les paramètres du compte"
      >
        À définir
      </span>
    )
  }

  const kind = mappingCostTypeLabel(account, linkCodeByCode)
  if (kind === "na") return <span className="text-slate-300">—</span>
  if (kind === "variable") {
    return (
      <span className="inline-flex rounded-md bg-sky-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sky-800 ring-1 ring-sky-200/80">
        Variable
      </span>
    )
  }
  if (kind === "fixed") {
    return (
      <span className="inline-flex rounded-md bg-violet-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-800 ring-1 ring-violet-200/80">
        Fixe
      </span>
    )
  }
  return (
    <span
      className="inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200/80"
      title="Indiquez Variable ou Fixe dans les paramètres du compte"
    >
      À définir
    </span>
  )
}

type MappingColumnContext = {
  linkCodeByCode: StandardLinkCodeLookup
}

function getAccountColumnValue(
  account: AccountMapping,
  column: MappingColumnKey,
  ctx: MappingColumnContext,
): string {
  switch (column) {
    case "accountNumber":
      return displayCellValue(account.accountNumber)
    case "description":
      return displayCellValue(account.description)
    case "groupe":
      return displayCellValue(mappingGroupeFromLinkCode(account.linkCode, ctx.linkCodeByCode))
    case "parentCode":
      return displayCellValue(mappingParentCodeFromLinkCode(account.linkCode, ctx.linkCodeByCode))
    case "linkCode":
      return displayCellValue(account.linkCode)
    case "costType":
      return mappingAccountTypeDisplayLabel(account, ctx.linkCodeByCode)
    case "poste":
      return displayCellValue(mappingPosteFromLinkCode(account.linkCode, ctx.linkCodeByCode))
    case "detail":
      return displayCellValue(mappingDetailFromLinkCode(account.linkCode, ctx.linkCodeByCode))
  }
}

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
    variable_cost_revenue_link_code: m.variableCostRevenueLinkCode ?? null,
    alt_asset_cost: m.altAssetCost || false,
    alt_accumulated_amortization: m.altAccumulatedAmortization || false,
    liability_remaining_years: m.liabilityRemainingYears ?? null,
    liability_interest_rate: m.liabilityInterestRate ?? null,
    product: m.product ?? null,
    customer: m.customer ?? null,
    supplier: m.supplier || null,
    interco_company_id: m.interco || null,
  }
}

export default function CompanyMappingPage() {
  const params = useParams()
  const router = useRouter()
  const { canEdit } = usePermissions()
  const companyId = params.id as string
  const { codes: standardLinkCodes, loading: linkCodesLoading } = useStandardLinkCodesFlat(false)
  const [companyLinkCodes, setCompanyLinkCodes] = useState<StandardLinkCode[]>([])
  const allLinkCodes = useMemo(
    () => [...standardLinkCodes, ...companyLinkCodes],
    [standardLinkCodes, companyLinkCodes],
  )
  const linkCodeByCode = useMemo<StandardLinkCodeLookup>(
    () => new Map(allLinkCodes.map((c) => [c.code, c])),
    [allLinkCodes],
  )
  const assignableLinkCodes = useMemo(
    () => filterAssignableMappingLinkCodes(allLinkCodes),
    [allLinkCodes],
  )
  const [company, setCompany] = useState<Company | null>(null)
  const [companyDivisions, setCompanyDivisions] = useState<Division[]>([])
  const [accounts, setAccounts] = useState<AccountMapping[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [allCompanies, setAllCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [incomeStatementStructure, setIncomeStatementStructure] = useState<
    Record<string, unknown>[] | null
  >(null)
  const [balanceSheetStructure, setBalanceSheetStructure] = useState<Record<string, unknown>[] | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importModalStep, setImportModalStep] = useState<"file" | "confirm">("file")
  const [pendingImportEntries, setPendingImportEntries] = useState<
    Array<{ account_number: string; description: string }>
  >([])
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [columnFilters, setColumnFilters] = useState<Partial<Record<MappingColumnKey, Set<string>>>>({})
  const [diagnosticFilter, setDiagnosticFilter] = useState<MappingDiagnosticFilter>("none")
  const [settingsAccountNumber, setSettingsAccountNumber] = useState<string | null>(null)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [selectedAccountNumbers, setSelectedAccountNumbers] = useState<string[]>([])
  const [bulkActionMode, setBulkActionMode] = useState<BulkActionMode | null>(null)
  const [bulkLinkCode, setBulkLinkCode] = useState<string | undefined>(undefined)
  const [bulkCostType, setBulkCostType] = useState<"" | "variable" | "fixed">("")
  const [bulkSaving, setBulkSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseMappingExcel = async (file: File) => {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: "array" })
    const sheetName = wb.SheetNames[0]
    if (!sheetName) return { entries: [], invalidFormat: true }
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" })

    const normalize = (v: unknown) => String(v ?? "").trim()
    const normalizeHeaderKey = (k: string) =>
      k
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\./g, "")
        .replace(/\s+/g, " ")
        .trim()

    const valueForHeader = (row: Record<string, unknown>, headerKey: string) => {
      for (const [k, v] of Object.entries(row)) {
        if (normalizeHeaderKey(k) === headerKey) return normalize(v)
      }
      return ""
    }

    if (rows.length > 0) {
      const headerKeys = Object.keys(rows[0]).map(normalizeHeaderKey)
      const hasGl = headerKeys.includes("no gl")
      const hasDescription = headerKeys.includes("description")
      if (!hasGl || !hasDescription) {
        return { entries: [], invalidFormat: true }
      }
    }

    const entries = rows
      .map((r) => ({
        accountNumber: valueForHeader(r, "no gl"),
        description: valueForHeader(r, "description"),
      }))
      .filter((r) => r.accountNumber.length > 0)

    return { entries, invalidFormat: false }
  }

  // Load all data from API
  useEffect(() => {
    if (companyId) {
      setLoading(true)
      setLoadError(null)
      getCompany(companyId)
        .then((companyData) => {
          setCompany(mapApiCompany(companyData))
          setCompanyDivisions(companyData.divisions ?? [])
          return Promise.all([
            listAccountMappings(companyId),
            listCompanies().catch(() => []),
            listCompanyLinkCodes(companyId, true).catch(() => []),
          ])
        })
        .then(([mappingsData, companiesData, companyCodesData]) => {
          setAccounts(mappingsData.map(mapApiMapping))
          setCompanyLinkCodes(companyCodesData)
          setAllCompanies(
            companiesData
              .filter((c: ApiCompany) => c.id !== companyId)
              .map(mapApiCompany),
          )
        })
        .catch((e) => {
          console.error("Error loading company:", e)
          setLoadError(
            "Impossible de charger le mapping comptable. Vérifiez que le serveur est à jour (migration base de données) puis réessayez.",
          )
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

  const { summaryEfByLinkCode, detailEfByLinkCode } = linkCodeReference

  const columnContext = useMemo<MappingColumnContext>(
    () => ({
      linkCodeByCode,
    }),
    [linkCodeByCode],
  )

  const uniqueValuesByColumn = useMemo(() => {
    const result = {} as Record<MappingColumnKey, string[]>
    for (const col of MAPPING_TABLE_COLUMNS) {
      const values = new Set<string>()
      for (const account of accounts) {
        values.add(getAccountColumnValue(account, col.key, columnContext))
      }
      result[col.key] = Array.from(values).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }))
    }
    return result
  }, [accounts, columnContext])

  const hasActiveColumnFilters = useMemo(
    () =>
      MAPPING_TABLE_COLUMNS.some((col) => {
        const selected = columnFilters[col.key]
        const all = uniqueValuesByColumn[col.key]
        return selected !== undefined && selected.size < all.length
      }),
    [columnFilters, uniqueValuesByColumn],
  )

  const setColumnFilter = useCallback((key: MappingColumnKey, next: Set<string> | undefined) => {
    setColumnFilters((prev) => {
      if (next === undefined) {
        const { [key]: _removed, ...rest } = prev
        return rest
      }
      return { ...prev, [key]: next }
    })
  }, [])

  const mappingDiagnostic = useMemo(() => {
    const total = accounts.length
    const unassigned = accounts.filter(isAccountUnassigned)
    const invalid = accounts.filter(
      (a) => a.linkCode?.trim() && isMappingLinkCodeIncomplete(a.linkCode, linkCodeByCode),
    )
    const costTypeEligible = accounts.filter(
      (a) =>
        a.linkCode?.trim() &&
        !isMappingLinkCodeIncomplete(a.linkCode, linkCodeByCode) &&
        showsMappingCostTypeOptions(a.linkCode, linkCodeByCode),
    )
    const costTypeUnset = costTypeEligible.filter((a) => isMappingCostTypeUnset(a, linkCodeByCode))
    const altAssetEligible = accounts.filter(
      (a) =>
        a.linkCode?.trim() &&
        !isMappingLinkCodeIncomplete(a.linkCode, linkCodeByCode) &&
        showsMappingAltAssetTypeOptions(a.linkCode),
    )
    const altAssetTypeUnset = altAssetEligible.filter((a) => isAccountAltAssetTypeUnset(a))
    const assignedCount = total - unassigned.length
    const validCount = total - unassigned.length - invalid.length
    const costTypeAssignedCount = costTypeEligible.length - costTypeUnset.length
    const altAssetAssignedCount = altAssetEligible.length - altAssetTypeUnset.length
    const assignmentPercent = total === 0 ? 100 : Math.round((assignedCount / total) * 100)
    const validityPercent = total === 0 ? 100 : Math.round((validCount / total) * 100)
    const costTypePercent =
      costTypeEligible.length === 0
        ? 100
        : Math.round((costTypeAssignedCount / costTypeEligible.length) * 100)
    const altAssetTypePercent =
      altAssetEligible.length === 0
        ? 100
        : Math.round((altAssetAssignedCount / altAssetEligible.length) * 100)
    return {
      total,
      unassignedCount: unassigned.length,
      invalidCount: invalid.length,
      costTypeEligibleCount: costTypeEligible.length,
      costTypeUnsetCount: costTypeUnset.length,
      altAssetEligibleCount: altAssetEligible.length,
      altAssetTypeUnsetCount: altAssetTypeUnset.length,
      assignedCount,
      validCount,
      costTypeAssignedCount,
      altAssetAssignedCount,
      assignmentPercent,
      validityPercent,
      costTypePercent,
      altAssetTypePercent,
      isFullyAssigned: total > 0 && unassigned.length === 0,
      isFullyValid: total > 0 && unassigned.length === 0 && invalid.length === 0,
      isFullyCostTyped: costTypeEligible.length === 0 || costTypeUnset.length === 0,
      isFullyAltAssetTyped: altAssetEligible.length === 0 || altAssetTypeUnset.length === 0,
    }
  }, [accounts, linkCodeByCode])

  const mappingIncompleteGroupeCount = mappingDiagnostic.invalidCount

  const filteredAccounts = useMemo(() => {
    const activeColumns = MAPPING_TABLE_COLUMNS.filter((col) => {
      const selected = columnFilters[col.key]
      const all = uniqueValuesByColumn[col.key]
      return selected !== undefined && selected.size < all.length
    })
    if (activeColumns.length === 0) return accounts

    return accounts.filter((account) =>
      activeColumns.every((col) => {
        const selected = columnFilters[col.key]
        if (!selected) return true
        const value = getAccountColumnValue(account, col.key, columnContext)
        return selected.has(value)
      }),
    )
  }, [accounts, columnFilters, uniqueValuesByColumn, columnContext])

  const tableAccounts = useMemo(() => {
    if (diagnosticFilter === "unassigned") {
      return filteredAccounts.filter(isAccountUnassigned)
    }
    if (diagnosticFilter === "invalid") {
      return filteredAccounts.filter(
        (a) => a.linkCode?.trim() && isMappingLinkCodeIncomplete(a.linkCode, linkCodeByCode),
      )
    }
    if (diagnosticFilter === "costTypeUnset") {
      return filteredAccounts.filter((a) => isAccountCostTypeUnset(a, linkCodeByCode))
    }
    if (diagnosticFilter === "altAssetTypeUnset") {
      return filteredAccounts.filter((a) => isAccountAltAssetTypeUnset(a))
    }
    return filteredAccounts
  }, [diagnosticFilter, filteredAccounts, linkCodeByCode])

  const toggleDiagnosticFilter = useCallback((filter: Exclude<MappingDiagnosticFilter, "none">) => {
    setDiagnosticFilter((current) => (current === filter ? "none" : filter))
  }, [])

  useEffect(() => {
    if (showImportModal) {
      setImportModalStep("file")
      setPendingImportEntries([])
    }
  }, [showImportModal])

  const tableColSpan = MAPPING_TABLE_COLUMNS.length + (canEdit ? 2 : 0)

  const selectedAccountSet = useMemo(
    () => new Set(selectedAccountNumbers),
    [selectedAccountNumbers],
  )

  const visibleAccountNumbers = useMemo(
    () => tableAccounts.map((a) => a.accountNumber),
    [tableAccounts],
  )

  const allVisibleSelected =
    visibleAccountNumbers.length > 0 &&
    visibleAccountNumbers.every((n) => selectedAccountSet.has(n))

  const someVisibleSelected = visibleAccountNumbers.some((n) => selectedAccountSet.has(n))

  const toggleRowSelection = useCallback((accountNumber: string, checked: boolean) => {
    setSelectedAccountNumbers((prev) => {
      if (checked) {
        if (prev.includes(accountNumber)) return prev
        return [...prev, accountNumber]
      }
      return prev.filter((n) => n !== accountNumber)
    })
  }, [])

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedAccountNumbers((prev) => {
      const prevSet = new Set(prev)
      if (allVisibleSelected) {
        for (const n of visibleAccountNumbers) prevSet.delete(n)
      } else {
        for (const n of visibleAccountNumbers) prevSet.add(n)
      }
      return Array.from(prevSet)
    })
  }, [allVisibleSelected, visibleAccountNumbers])

  const clearRowSelection = useCallback(() => {
    setSelectedAccountNumbers([])
    setBulkActionMode(null)
    setBulkLinkCode(undefined)
    setBulkCostType("")
  }, [])

  const selectBulkActionMode = useCallback((mode: BulkActionMode) => {
    setBulkActionMode(mode)
    if (mode === "linkCode") {
      setBulkCostType("")
    } else {
      setBulkLinkCode(undefined)
    }
  }, [])

  const bulkEligibleCostTypeCount = useMemo(() => {
    return accounts.filter(
      (a) =>
        selectedAccountSet.has(a.accountNumber) &&
        showsMappingCostTypeOptions(a.linkCode, linkCodeByCode),
    ).length
  }, [accounts, selectedAccountSet, linkCodeByCode])

  const settingsAccount = useMemo(
    () => (settingsAccountNumber ? accounts.find((a) => a.accountNumber === settingsAccountNumber) ?? null : null),
    [accounts, settingsAccountNumber],
  )

  const openAccountSettings = useCallback((accountNumber: string) => {
    setSettingsAccountNumber((current) => (current === accountNumber ? null : accountNumber))
  }, [])

  const closeAccountSettings = useCallback(() => {
    setSettingsAccountNumber(null)
  }, [])

  const buildAccountWithDerivedEf = useCallback(
    (account: AccountMapping): AccountMapping => {
      const derived = derivedEfFieldsFromLinkCode(
        account.linkCode,
        summaryEfByLinkCode,
        detailEfByLinkCode,
      )
      return { ...account, ...derived }
    },
    [summaryEfByLinkCode, detailEfByLinkCode],
  )

  const handleSaveAccountSettings = useCallback(
    async (draft: AccountMappingDraft) => {
      const sanitized = sanitizeMappingAltAssetFields(
        sanitizeMappingLiabilityTermFields(
          sanitizeMappingCostTypeFields(draft, linkCodeByCode),
        ),
      )
      const merged = buildAccountWithDerivedEf(sanitized as AccountMapping)
      setSettingsSaving(true)
      try {
        const savedList = await upsertAccountMappings(companyId, [toApiMappingEntry(merged)])
        const savedRow = savedList.find((m) => m.account_number === merged.accountNumber)
        const updated = savedRow ? mapApiMapping(savedRow) : merged
        setAccounts((prev) =>
          prev.map((a) => (a.accountNumber === updated.accountNumber ? updated : a)),
        )
        closeAccountSettings()
      } catch (e) {
        console.error(e)
        alert("Impossible d'enregistrer les paramètres de ce compte.")
      } finally {
        setSettingsSaving(false)
      }
    },
    [buildAccountWithDerivedEf, closeAccountSettings, companyId, linkCodeByCode],
  )

  const handleBulkAssignLinkCode = useCallback(async () => {
    const linkCode = bulkLinkCode?.trim()
    if (!linkCode || selectedAccountNumbers.length === 0) return

    const selectedSet = new Set(selectedAccountNumbers)
    const entries = accounts
      .filter((a) => selectedSet.has(a.accountNumber))
      .map((a) => {
        const withCode = sanitizeMappingAltAssetFields(
          sanitizeMappingLiabilityTermFields(
            sanitizeMappingCostTypeFields({ ...a, linkCode }, linkCodeByCode),
          ),
        )
        return toApiMappingEntry(buildAccountWithDerivedEf(withCode as AccountMapping))
      })

    setBulkSaving(true)
    try {
      const savedList = await upsertAccountMappings(companyId, entries)
      const savedByAccount = new Map(savedList.map((m) => [m.account_number, mapApiMapping(m)]))
      setAccounts((prev) => prev.map((a) => savedByAccount.get(a.accountNumber) ?? a))
      clearRowSelection()
      closeAccountSettings()
    } catch (e) {
      console.error(e)
      alert("Impossible d'affecter le code de liaison aux comptes sélectionnés.")
    } finally {
      setBulkSaving(false)
    }
  }, [
    accounts,
    bulkLinkCode,
    buildAccountWithDerivedEf,
    clearRowSelection,
    closeAccountSettings,
    companyId,
    linkCodeByCode,
    selectedAccountNumbers,
  ])

  const handleBulkAssignCostType = useCallback(async () => {
    if (bulkCostType !== "variable" && bulkCostType !== "fixed") return
    if (selectedAccountNumbers.length === 0) return

    const selectedSet = new Set(selectedAccountNumbers)
    const entries = accounts
      .filter((a) => selectedSet.has(a.accountNumber))
      .filter((a) => showsMappingCostTypeOptions(a.linkCode, linkCodeByCode))
      .map((a) => {
        const patch =
          bulkCostType === "variable"
            ? { variableCosts: true, fixedCosts: false }
            : { variableCosts: false, fixedCosts: true }
        const withType = sanitizeMappingLiabilityTermFields(
          sanitizeMappingCostTypeFields({ ...a, ...patch }, linkCodeByCode),
        )
        return toApiMappingEntry(buildAccountWithDerivedEf(withType as AccountMapping))
      })

    if (entries.length === 0) {
      alert(
        "Aucun des comptes sélectionnés n'est éligible au type Variable / Fixe (hors REV, IMP ; FIN.1 seul parmi FIN).",
      )
      return
    }

    const skipped = selectedAccountNumbers.length - entries.length
    setBulkSaving(true)
    try {
      const savedList = await upsertAccountMappings(companyId, entries)
      const savedByAccount = new Map(savedList.map((m) => [m.account_number, mapApiMapping(m)]))
      setAccounts((prev) => prev.map((a) => savedByAccount.get(a.accountNumber) ?? a))
      if (skipped > 0) {
        alert(
          `Type appliqué à ${entries.length} compte${entries.length > 1 ? "s" : ""}. ${skipped} compte${skipped > 1 ? "s" : ""} ignoré${skipped > 1 ? "s" : ""} (non éligible).`,
        )
      }
      clearRowSelection()
      closeAccountSettings()
    } catch (e) {
      console.error(e)
      alert("Impossible d'affecter le type Variable / Fixe aux comptes sélectionnés.")
    } finally {
      setBulkSaving(false)
    }
  }, [
    accounts,
    bulkCostType,
    buildAccountWithDerivedEf,
    clearRowSelection,
    closeAccountSettings,
    companyId,
    linkCodeByCode,
    selectedAccountNumbers,
  ])

  const handleDeleteAccountSettings = useCallback(async () => {
    if (!settingsAccount) return
    if (
      !window.confirm(
        `Supprimer le compte ${settingsAccount.accountNumber} du mapping ? Cette action est irréversible.`,
      )
    ) {
      return
    }
    setSettingsSaving(true)
    try {
      await deleteAccountMapping(companyId, settingsAccount.mappingId)
      setAccounts((prev) => prev.filter((a) => a.accountNumber !== settingsAccount.accountNumber))
      closeAccountSettings()
    } catch (e) {
      console.error(e)
      alert("Impossible de supprimer ce compte.")
    } finally {
      setSettingsSaving(false)
    }
  }, [closeAccountSettings, companyId, settingsAccount])

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
                        Importez un fichier Excel (No. GL, Description) ou complétez le tableau.
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {canEdit && (
                      <Button
                        type="button"
                        onClick={() => setShowImportModal(true)}
                        className="h-9 shrink-0 gap-2 rounded-xl bg-[#E0742D] px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#c96526] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E0742D]/30 focus-visible:ring-offset-2"
                      >
                        <Upload className="h-4 w-4" />
                        Importer Excel
                      </Button>
                    )}
                  </div>
                </div>
              </div>

            {loadError ? (
              <div className="border-b border-red-200/90 bg-red-50 px-4 py-4 text-sm text-red-950 sm:px-6">
                <p className="font-semibold">Erreur de chargement</p>
                <p className="mt-1">{loadError}</p>
              </div>
            ) : null}

            {accounts.length > 0 ? (
              <div
                className={cn(
                  "border-b px-4 py-4 sm:px-6",
                  mappingDiagnostic.isFullyValid &&
                  mappingDiagnostic.isFullyCostTyped &&
                  mappingDiagnostic.isFullyAltAssetTyped
                    ? "border-emerald-200/90 bg-emerald-50/70"
                    : "border-amber-200/90 bg-amber-50/70",
                )}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      {mappingDiagnostic.isFullyValid &&
                      mappingDiagnostic.isFullyCostTyped &&
                      mappingDiagnostic.isFullyAltAssetTyped ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
                      ) : (
                        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-800" aria-hidden />
                      )}
                      <p className="text-sm font-semibold text-slate-900">Diagnostic du mapping</p>
                    </div>
                    <p className="text-sm text-slate-700">
                      {mappingDiagnostic.isFullyValid &&
                      mappingDiagnostic.isFullyCostTyped &&
                      mappingDiagnostic.isFullyAltAssetTyped ? (
                        <>
                          Tous les comptes ({mappingDiagnostic.total}) ont un code de liaison valide, un type
                          Variable ou Fixe lorsque requis, et Coût ou Amortissement cumulé pour les immobilisations
                          capex.
                        </>
                      ) : mappingDiagnostic.isFullyValid &&
                        (mappingDiagnostic.costTypeUnsetCount > 0 ||
                          mappingDiagnostic.altAssetTypeUnsetCount > 0) ? (
                        <>
                          Tous les codes de liaison sont valides, mais{" "}
                          {mappingDiagnostic.costTypeUnsetCount > 0 ? (
                            <>
                              <span className="font-semibold text-amber-950">
                                {mappingDiagnostic.costTypeUnsetCount}
                              </span>{" "}
                              compte
                              {mappingDiagnostic.costTypeUnsetCount > 1 ? "s" : ""} sans type Variable ou Fixe
                            </>
                          ) : null}
                          {mappingDiagnostic.costTypeUnsetCount > 0 &&
                          mappingDiagnostic.altAssetTypeUnsetCount > 0
                            ? " et "
                            : null}
                          {mappingDiagnostic.altAssetTypeUnsetCount > 0 ? (
                            <>
                              <span className="font-semibold text-amber-950">
                                {mappingDiagnostic.altAssetTypeUnsetCount}
                              </span>{" "}
                              compte
                              {mappingDiagnostic.altAssetTypeUnsetCount > 1 ? "s" : ""} sans Coût ou
                              Amortissement cumulé (ALT-B/C/D)
                            </>
                          ) : null}
                          .
                        </>
                      ) : mappingDiagnostic.unassignedCount > 0 ? (
                        <>
                          <span className="font-semibold text-amber-950">
                            {mappingDiagnostic.unassignedCount}
                          </span>{" "}
                          compte{mappingDiagnostic.unassignedCount > 1 ? "s" : ""} sur{" "}
                          {mappingDiagnostic.total} sans code de liaison.
                        </>
                      ) : (
                        <>
                          Tous les comptes ont un code, mais{" "}
                          <span className="font-semibold text-amber-950">
                            {mappingDiagnostic.invalidCount}
                          </span>{" "}
                          code{mappingDiagnostic.invalidCount > 1 ? "s" : ""}{" "}
                          {mappingDiagnostic.invalidCount > 1 ? "invalides ou incomplets" : "invalide ou incomplet"}.
                        </>
                      )}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-xs text-slate-600">
                        <span>Affectation aux codes de liaison</span>
                        <span className="font-mono font-medium text-slate-800">
                          {mappingDiagnostic.assignedCount}/{mappingDiagnostic.total} ({mappingDiagnostic.assignmentPercent}
                          %)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/80">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            mappingDiagnostic.isFullyAssigned ? "bg-emerald-500" : "bg-amber-500",
                          )}
                          style={{ width: `${mappingDiagnostic.assignmentPercent}%` }}
                        />
                      </div>
                      {mappingDiagnostic.invalidCount > 0 ? (
                        <>
                          <div className="flex items-center justify-between gap-3 text-xs text-slate-600">
                            <span>Codes valides (Bilan / Résultats)</span>
                            <span className="font-mono font-medium text-slate-800">
                              {mappingDiagnostic.validCount}/{mappingDiagnostic.total} ({mappingDiagnostic.validityPercent}
                              %)
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/80">
                            <div
                              className="h-full rounded-full bg-amber-500 transition-all"
                              style={{ width: `${mappingDiagnostic.validityPercent}%` }}
                            />
                          </div>
                        </>
                      ) : null}
                      {mappingDiagnostic.costTypeEligibleCount > 0 ? (
                        <>
                          <div className="flex items-center justify-between gap-3 text-xs text-slate-600">
                            <span>Type Variable / Fixe (hors REV, IMP ; FIN.1 uniquement parmi FIN)</span>
                            <span className="font-mono font-medium text-slate-800">
                              {mappingDiagnostic.costTypeAssignedCount}/
                              {mappingDiagnostic.costTypeEligibleCount} ({mappingDiagnostic.costTypePercent}
                              %)
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/80">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                mappingDiagnostic.isFullyCostTyped ? "bg-emerald-500" : "bg-amber-500",
                              )}
                              style={{ width: `${mappingDiagnostic.costTypePercent}%` }}
                            />
                          </div>
                        </>
                      ) : null}
                      {mappingDiagnostic.altAssetEligibleCount > 0 ? (
                        <>
                          <div className="flex items-center justify-between gap-3 text-xs text-slate-600">
                            <span>Coût / Amortissement cumulé (ALT-B, ALT-C, ALT-D)</span>
                            <span className="font-mono font-medium text-slate-800">
                              {mappingDiagnostic.altAssetAssignedCount}/
                              {mappingDiagnostic.altAssetEligibleCount} ({mappingDiagnostic.altAssetTypePercent}
                              %)
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/80">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                mappingDiagnostic.isFullyAltAssetTyped ? "bg-emerald-500" : "bg-amber-500",
                              )}
                              style={{ width: `${mappingDiagnostic.altAssetTypePercent}%` }}
                            />
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                  {(mappingDiagnostic.unassignedCount > 0 ||
                    mappingDiagnostic.invalidCount > 0 ||
                    mappingDiagnostic.costTypeUnsetCount > 0 ||
                    mappingDiagnostic.altAssetTypeUnsetCount > 0) && (
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {mappingDiagnostic.unassignedCount > 0 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-8 border-amber-300/90 bg-white text-xs font-medium text-amber-950 hover:bg-amber-50",
                            diagnosticFilter === "unassigned" && "border-amber-500 bg-amber-100",
                          )}
                          onClick={() => toggleDiagnosticFilter("unassigned")}
                        >
                          {diagnosticFilter === "unassigned" ? "Tout afficher" : "Sans code de liaison"}
                        </Button>
                      ) : null}
                      {mappingDiagnostic.invalidCount > 0 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-8 border-amber-300/90 bg-white text-xs font-medium text-amber-950 hover:bg-amber-50",
                            diagnosticFilter === "invalid" && "border-amber-500 bg-amber-100",
                          )}
                          onClick={() => toggleDiagnosticFilter("invalid")}
                        >
                          {diagnosticFilter === "invalid" ? "Tout afficher" : "Codes invalides"}
                        </Button>
                      ) : null}
                      {mappingDiagnostic.costTypeUnsetCount > 0 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-8 border-amber-300/90 bg-white text-xs font-medium text-amber-950 hover:bg-amber-50",
                            diagnosticFilter === "costTypeUnset" && "border-amber-500 bg-amber-100",
                          )}
                          onClick={() => toggleDiagnosticFilter("costTypeUnset")}
                        >
                          {diagnosticFilter === "costTypeUnset"
                            ? "Tout afficher"
                            : "Sans type Variable / Fixe"}
                        </Button>
                      ) : null}
                      {mappingDiagnostic.altAssetTypeUnsetCount > 0 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-8 border-amber-300/90 bg-white text-xs font-medium text-amber-950 hover:bg-amber-50",
                            diagnosticFilter === "altAssetTypeUnset" && "border-amber-500 bg-amber-100",
                          )}
                          onClick={() => toggleDiagnosticFilter("altAssetTypeUnset")}
                        >
                          {diagnosticFilter === "altAssetTypeUnset"
                            ? "Tout afficher"
                            : "Sans Coût / Amort. cumulé"}
                        </Button>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {accounts.length > 0 && mappingIncompleteGroupeCount > 0 && diagnosticFilter !== "invalid" && (
                <p className="rounded-lg border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 sm:px-6">
                  <span className="font-semibold">Mapping comptable non terminé.</span>{" "}
                  {mappingIncompleteGroupeCount === 1
                    ? "Un compte a un code de liaison inconnu ou sans état financier identifiable"
                    : `${mappingIncompleteGroupeCount} comptes ont un code de liaison inconnu ou sans état financier identifiable`}
                  {" "}
                  (colonne Groupe : Bilan ou Résultats). Vérifiez que ces codes existent dans la charte
                  standard.
                </p>
              )}
            {accounts.length > 0 &&
              mappingDiagnostic.costTypeUnsetCount > 0 &&
              diagnosticFilter !== "costTypeUnset" && (
                <p className="rounded-lg border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 sm:px-6">
                  <span className="font-semibold">Types de coûts incomplets.</span>{" "}
                  {mappingDiagnostic.costTypeUnsetCount === 1
                    ? "Un compte éligible (hors REV/IMP, ou FIN.1) n’a pas de type Variable ou Fixe."
                    : `${mappingDiagnostic.costTypeUnsetCount} comptes éligibles n’ont pas de type Variable ou Fixe.`}{" "}
                  Ouvrez les paramètres du compte (icône engrenage) pour cocher CV ou CF.
                </p>
              )}
            {accounts.length > 0 &&
              mappingDiagnostic.altAssetTypeUnsetCount > 0 &&
              diagnosticFilter !== "altAssetTypeUnset" && (
                <p className="rounded-lg border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 sm:px-6">
                  <span className="font-semibold">Immobilisations capex incomplètes.</span>{" "}
                  {mappingDiagnostic.altAssetTypeUnsetCount === 1
                    ? "Un compte ALT-B, ALT-C ou ALT-D n’a pas de type Coût ou Amortissement cumulé."
                    : `${mappingDiagnostic.altAssetTypeUnsetCount} comptes ALT-B/C/D n’ont pas de type Coût ou Amortissement cumulé.`}{" "}
                  Ouvrez les paramètres du compte (icône engrenage) pour cocher Coût ou Amortissement cumulé.
                </p>
              )}
              {diagnosticFilter !== "none" && accounts.length > 0 && (
                <p className="border-b border-slate-200 bg-white/90 px-4 py-2 text-xs text-slate-600 sm:px-6">
                  Filtre diagnostic actif :{" "}
                  {diagnosticFilter === "unassigned"
                    ? "comptes sans code de liaison"
                    : diagnosticFilter === "invalid"
                      ? "comptes avec code invalide ou incomplet"
                      : "comptes sans type Variable / Fixe"}
                  .{" "}
                  <button
                    type="button"
                    className="font-medium text-[#E0742D] underline-offset-2 hover:underline"
                    onClick={() => setDiagnosticFilter("none")}
                  >
                    Réinitialiser
                  </button>
                </p>
              )}
              {hasActiveColumnFilters && accounts.length > 0 && (
                <p className="border-b border-slate-200 bg-white/90 px-4 py-2 text-xs text-slate-500 sm:px-6">
                  {filteredAccounts.length === 0
                    ? "Aucun compte ne correspond aux filtres sélectionnés."
                    : filteredAccounts.length === accounts.length
                      ? `Tous les comptes (${accounts.length}) correspondent aux filtres.`
                      : `Affichage de ${filteredAccounts.length} compte${filteredAccounts.length > 1 ? "s" : ""} sur ${accounts.length}.`}
                </p>
              )}

            {canEdit && selectedAccountNumbers.length > 0 && (
              <div className="border-b border-blue-200/80 bg-blue-50/70 px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Affectation groupée</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {selectedAccountNumbers.length} compte
                      {selectedAccountNumbers.length > 1 ? "s" : ""} sélectionné
                      {selectedAccountNumbers.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 shrink-0 text-slate-600 hover:text-slate-900"
                    disabled={bulkSaving}
                    onClick={clearRowSelection}
                  >
                    Désélectionner
                  </Button>
                </div>

                <div className="mt-4 rounded-xl border border-blue-200/70 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    1. Choisir l&apos;action
                  </p>
                  <div
                    className="mt-2 grid gap-2 sm:grid-cols-2"
                    role="group"
                    aria-label="Type d'affectation groupée"
                  >
                    <button
                      type="button"
                      disabled={bulkSaving}
                      onClick={() => selectBulkActionMode("linkCode")}
                      className={cn(
                        "rounded-lg border px-4 py-3 text-left transition-colors",
                        bulkActionMode === "linkCode"
                          ? "border-[#E0742D] bg-[#E0742D]/5 ring-2 ring-[#E0742D]/25"
                          : "border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-white",
                      )}
                    >
                      <span className="block text-sm font-semibold text-slate-900">Code de liaison</span>
                      <span className="mt-0.5 block text-xs text-slate-600">
                        Affecter le même code à tous les comptes sélectionnés
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={bulkSaving || bulkEligibleCostTypeCount === 0}
                      title={
                        bulkEligibleCostTypeCount === 0
                          ? "Aucun compte sélectionné n'est éligible au type Variable / Fixe"
                          : undefined
                      }
                      onClick={() => selectBulkActionMode("costType")}
                      className={cn(
                        "rounded-lg border px-4 py-3 text-left transition-colors",
                        bulkEligibleCostTypeCount === 0 && "cursor-not-allowed opacity-50",
                        bulkActionMode === "costType"
                          ? "border-[#E0742D] bg-[#E0742D]/5 ring-2 ring-[#E0742D]/25"
                          : "border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-white",
                      )}
                    >
                      <span className="block text-sm font-semibold text-slate-900">Type Variable / Fixe</span>
                      <span className="mt-0.5 block text-xs text-slate-600">
                        {bulkEligibleCostTypeCount > 0
                          ? `${bulkEligibleCostTypeCount} compte${bulkEligibleCostTypeCount > 1 ? "s" : ""} éligible${bulkEligibleCostTypeCount > 1 ? "s" : ""}`
                          : "Aucun compte éligible dans la sélection"}
                      </span>
                    </button>
                  </div>

                  {bulkActionMode === "linkCode" ? (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        2. Sélectionner le code
                      </p>
                      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                          <StandardLinkCodePicker
                            id="bulk-link-code"
                            codes={assignableLinkCodes}
                            value={bulkLinkCode}
                            loading={linkCodesLoading}
                            onChange={setBulkLinkCode}
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="h-9 shrink-0 bg-[#E0742D] px-5 text-white hover:bg-[#c96526]"
                          disabled={!bulkLinkCode?.trim() || bulkSaving}
                          onClick={() => void handleBulkAssignLinkCode()}
                        >
                          {bulkSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Appliquer
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {bulkActionMode === "costType" ? (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        2. Choisir le type
                      </p>
                      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                          <Select
                            value={bulkCostType || undefined}
                            onValueChange={(v) => setBulkCostType(v as "variable" | "fixed")}
                          >
                            <SelectTrigger id="bulk-cost-type" className="h-9 w-full">
                              <SelectValue placeholder="Variable ou Fixe…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="variable">Variable (CV)</SelectItem>
                              <SelectItem value="fixed">Fixe (CF)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="h-9 shrink-0 bg-[#E0742D] px-5 text-white hover:bg-[#c96526]"
                          disabled={bulkSaving || bulkCostType === ""}
                          onClick={() => void handleBulkAssignCostType()}
                        >
                          {bulkSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Appliquer
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {!bulkActionMode ? (
                    <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
                      Choisissez une action ci-dessus pour afficher les options d&apos;affectation.
                    </p>
                  ) : null}
                </div>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto bg-white/80">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {canEdit ? (
                      <th className="w-12 px-3 py-4 text-center">
                        <Checkbox
                          checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                          disabled={tableAccounts.length === 0}
                          aria-label="Sélectionner tous les comptes affichés"
                          onCheckedChange={() => toggleSelectAllVisible()}
                        />
                      </th>
                    ) : null}
                    {MAPPING_TABLE_COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className="px-6 py-4 text-left font-semibold text-slate-900 text-sm"
                      >
                        <div className="flex items-center gap-1">
                          <span>{col.label}</span>
                          {accounts.length > 0 ? (
                            <MappingColumnFilter
                              label={col.label}
                              values={uniqueValuesByColumn[col.key]}
                              selected={columnFilters[col.key]}
                              onSelectedChange={(next) => setColumnFilter(col.key, next)}
                            />
                          ) : null}
                        </div>
                      </th>
                    ))}
                    {canEdit ? (
                      <th className="px-4 py-4 text-center font-semibold text-slate-900 text-sm w-[4.5rem]">
                        Actions
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {accounts.length === 0 ? (
                    <tr>
                      <td colSpan={tableColSpan} className="px-8 py-12 text-center text-sm text-slate-500">
                        <p>Aucun compte configuré. Importez votre balance de vérification pour commencer.</p>
                      </td>
                    </tr>
                  ) : filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={tableColSpan} className="px-8 py-12 text-center text-sm text-slate-500">
                        <p>Aucun compte ne correspond aux filtres sélectionnés.</p>
                      </td>
                    </tr>
                  ) : tableAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={tableColSpan} className="px-8 py-12 text-center text-sm text-slate-500">
                        <p>Aucun compte ne correspond au filtre diagnostic.</p>
                      </td>
                    </tr>
                  ) : (
                    tableAccounts.map((account) => (
                      <Fragment key={account.accountNumber}>
                        <tr
                          className={cn(
                            "border-b border-slate-100 hover:bg-slate-50",
                            isAccountUnassigned(account) && "bg-amber-50/50",
                            isAccountCostTypeUnset(account, linkCodeByCode) && "bg-orange-50/35",
                            selectedAccountSet.has(account.accountNumber) && "bg-blue-50/40",
                            settingsAccountNumber === account.accountNumber &&
                              "bg-blue-50/40 shadow-[inset_0_0_0_1px_rgb(59,130,246,0.35)]",
                          )}
                        >
                          {canEdit ? (
                            <td className="px-3 py-4 text-center">
                              <Checkbox
                                checked={selectedAccountSet.has(account.accountNumber)}
                                aria-label={`Sélectionner le compte ${account.accountNumber}`}
                                onCheckedChange={(checked) =>
                                  toggleRowSelection(account.accountNumber, checked === true)
                                }
                              />
                            </td>
                          ) : null}
                          <td className="px-6 py-4 text-sm text-slate-600 font-mono">{account.accountNumber}</td>
                          <td className="px-6 py-4 text-sm text-slate-900">{account.description}</td>
                          <td className="px-6 py-4 text-sm font-mono text-slate-700">
                            {mappingParentCodeFromLinkCode(account.linkCode, linkCodeByCode)}
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-slate-700">
                            {account.linkCode?.trim() ? account.linkCode : "—"}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {(() => {
                              const g = mappingGroupeFromLinkCode(account.linkCode, linkCodeByCode)
                              if (isMappingLinkCodeIncomplete(account.linkCode, linkCodeByCode)) {
                                return (
                                  <span
                                    className="font-medium text-amber-800"
                                    title="Code absent de la charte ou sans famille bilan / résultats."
                                  >
                                    Mapping incomplet
                                  </span>
                                )
                              }
                              return <span>{g}</span>
                            })()}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <MappingCostTypeSticker account={account} linkCodeByCode={linkCodeByCode} />
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {mappingPosteFromLinkCode(account.linkCode, linkCodeByCode)}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {mappingDetailFromLinkCode(account.linkCode, linkCodeByCode)}
                          </td>
                          {canEdit ? (
                            <td className="px-2 py-2 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "h-8 w-8 p-0 text-slate-400 hover:text-[#E0742D]",
                                  settingsAccountNumber === account.accountNumber &&
                                    "text-[#E0742D] hover:text-[#c96526]",
                                )}
                                onClick={() => openAccountSettings(account.accountNumber)}
                                title="Paramètres du compte"
                                aria-label={`Paramètres du compte ${account.accountNumber}`}
                                aria-expanded={settingsAccountNumber === account.accountNumber}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </td>
                          ) : null}
                        </tr>
                        {settingsAccountNumber === account.accountNumber && settingsAccount ? (
                          <tr className="border-b-2 border-blue-200/90 bg-slate-50/95">
                            <td colSpan={tableColSpan} className="min-w-0 p-0 align-top">
                              <div className="min-w-0 max-w-full overflow-x-auto px-3 py-3 sm:px-5 sm:py-4">
                                <AccountMappingSettingsPanel
                                  account={settingsAccount}
                                  linkCodeByCode={linkCodeByCode}
                                  companyDivisions={companyDivisions}
                                  intercoCompanies={allCompanies}
                                  linkCodes={assignableLinkCodes}
                                  linkCodesLoading={linkCodesLoading}
                                  canEdit={canEdit}
                                  saving={settingsSaving}
                                  onClose={closeAccountSettings}
                                  onSave={handleSaveAccountSettings}
                                  onDelete={handleDeleteAccountSettings}
                                />
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
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
                      Colonnes attendues : No. GL, Description
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
                        const { entries: parsed, invalidFormat } = await parseMappingExcel(importFile)
                        if (invalidFormat) {
                          alert(
                            "Format invalide. Le fichier doit contenir exactement les colonnes « No. GL » et « Description ».",
                          )
                          return
                        }
                        if (parsed.length === 0) {
                          alert("Aucune ligne valide trouvée dans le fichier.")
                          return
                        }
                        const entries = parsed.map((r) => ({
                          account_number: r.accountNumber,
                          description: r.description,
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
                    <span className="font-semibold">No. GL</span> valide.
                  </p>
                  <p className="text-sm text-slate-600">
                    Comptes distincts (No. GL) :{" "}
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
                          `Import terminé : ${n} ligne(s) traitée(s), ${distinct} No. GL distinct(s).`
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
