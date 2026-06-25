import {
  normalizeChartConfig,
  type ChartSlot,
  type StatementChartConfig,
  type StatementType as ChartStatementType,
} from "@/lib/statement-chart-config"

// Use relative URLs — Next.js rewrites proxy /api/* to the backend, avoiding CORS.
const API_URL = ""

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown
}

class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail)
    this.name = "ApiError"
  }
}

/** FastAPI renvoie souvent `detail` comme chaîne ou liste d’objets de validation. */
function formatApiErrorDetail(data: { detail?: unknown }): string {
  const d = data.detail
  if (typeof d === "string") return d
  if (Array.isArray(d) || (d !== null && typeof d === "object")) {
    try {
      return JSON.stringify(d)
    } catch {
      return "Erreur API"
    }
  }
  return "Erreur API"
}

let refreshPromise: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem("refresh_token")
  if (!refreshToken) return false

  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!res.ok) {
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
      document.cookie = "has_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      return false
    }

    const data = await res.json()
    localStorage.setItem("access_token", data.access_token)
    localStorage.setItem("refresh_token", data.refresh_token)
    return true
  } catch {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    document.cookie = "has_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    return false
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { body, headers: customHeaders, ...rest } = options

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...((customHeaders as Record<string, string>) || {}),
  }

  const accessToken = localStorage.getItem("access_token")
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`
  }

  const fetchBody = isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined

  let res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers,
    body: fetchBody,
  })

  // On 401, try refreshing the token once
  if (res.status === 401 && accessToken) {
    // Deduplicate concurrent refresh attempts — only one promise at a time
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null
      })
    }

    const refreshed = await refreshPromise

    if (refreshed) {
      const newToken = localStorage.getItem("access_token")
      headers["Authorization"] = `Bearer ${newToken}`
      res = await fetch(`${API_URL}${path}`, {
        ...rest,
        headers,
        body: fetchBody,
      })
    }
  }

  if (res.status === 204) {
    return undefined as T
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { detail?: unknown }
    const detail =
      data.detail !== undefined ? formatApiErrorDetail(data) : res.statusText
    throw new ApiError(res.status, detail)
  }

  return res.json() as Promise<T>
}

export { ApiError, API_URL }

// --- Auth API ---

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { detail?: unknown }
    const detail =
      data.detail !== undefined ? formatApiErrorDetail(data) : res.statusText
    throw new ApiError(res.status, detail)
  }

  const data: AuthResponse = await res.json()
  localStorage.setItem("access_token", data.access_token)
  localStorage.setItem("refresh_token", data.refresh_token)
  document.cookie = "has_session=1; path=/"
  return data
}

export async function getMe(): Promise<UserInfo> {
  return apiFetch<UserInfo>("/api/auth/me")
}

export function logout() {
  localStorage.removeItem("access_token")
  localStorage.removeItem("refresh_token")
  document.cookie = "has_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
}

// --- Auth types ---

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface UserInfo {
  user: {
    id: string
    email: string
    full_name: string
    is_active: boolean
    is_superadmin?: boolean
    created_at: string
  }
  organizations: Array<{
    id: string
    name: string
    slug: string
    role: string
    feature_flags?: Record<string, boolean>
  }>
}

// --- Companies API ---

export interface SubDivision {
  id: string
  name: string
}

export interface Division {
  id: string
  name: string
  sub_divisions: SubDivision[]
}

export interface Company {
  id: string
  name: string
  fiscal_year_end: string
  currency: string
  /** Si true, les montants de balance importés sont des totaux cumulés depuis le début d'exercice (YTD) par mois. */
  is_cumulative_tb?: boolean
  divisions: Division[]
  created_at: string
  updated_at: string
}

export async function listCompanies(): Promise<Company[]> {
  const data = await apiFetch<{ companies: Company[] }>("/api/companies")
  return data.companies
}

export async function getCompany(id: string): Promise<Company> {
  return apiFetch<Company>(`/api/companies/${id}`)
}

/** Résumé portail (BV, dernière note, fiche société) — voir GET /api/companies/{id}/portal-summary */
export interface CompanyPortalSummary {
  fiscal_year_end: string
  currency: string
  company_updated_at: string
  trial_balance_last_period: { fiscal_year: number; month: number } | null
  note_last_activity: {
    updated_at: string
    created_by_name: string
    row_label: string
    page: string
  } | null
}

export async function getCompanyPortalSummary(companyId: string): Promise<CompanyPortalSummary> {
  return apiFetch<CompanyPortalSummary>(`/api/companies/${companyId}/portal-summary`)
}

export async function createCompany(data: {
  name: string
  fiscal_year_end?: string
  currency?: string
  divisions?: Array<{ name: string; sub_divisions?: Array<{ name: string }> }>
}): Promise<Company> {
  return apiFetch<Company>("/api/companies", {
    method: "POST",
    body: data,
  })
}

export async function updateCompany(
  id: string,
  data: { name?: string; fiscal_year_end?: string; currency?: string; is_cumulative_tb?: boolean }
): Promise<Company> {
  return apiFetch<Company>(`/api/companies/${id}`, {
    method: "PATCH",
    body: data,
  })
}

export async function deleteCompany(id: string): Promise<void> {
  await apiFetch(`/api/companies/${id}`, { method: "DELETE" })
}

export async function createDivision(
  companyId: string,
  data: { name: string; sub_divisions?: Array<{ name: string }> }
): Promise<Division> {
  return apiFetch<Division>(`/api/companies/${companyId}/divisions`, {
    method: "POST",
    body: data,
  })
}

export async function updateDivision(
  divisionId: string,
  data: { name: string }
): Promise<Division> {
  return apiFetch<Division>(`/api/companies/divisions/${divisionId}`, {
    method: "PATCH",
    body: data,
  })
}

export async function deleteDivision(divisionId: string): Promise<void> {
  await apiFetch(`/api/companies/divisions/${divisionId}`, { method: "DELETE" })
}

export async function createSubDivision(
  divisionId: string,
  data: { name: string }
): Promise<SubDivision> {
  return apiFetch<SubDivision>(
    `/api/companies/divisions/${divisionId}/sub-divisions`,
    { method: "POST", body: data }
  )
}

export async function updateSubDivision(
  subDivisionId: string,
  data: { name: string }
): Promise<SubDivision> {
  return apiFetch<SubDivision>(`/api/companies/sub-divisions/${subDivisionId}`, {
    method: "PATCH",
    body: data,
  })
}

export async function deleteSubDivision(subDivisionId: string): Promise<void> {
  await apiFetch(`/api/companies/sub-divisions/${subDivisionId}`, {
    method: "DELETE",
  })
}

// --- Trial Balance API ---

export interface TrialBalanceAccount {
  account_number: string
  description: string
  monthly_amounts: Record<string, number>
}

export interface TrialBalanceData {
  company_id: string
  fiscal_year: number
  /** Mois (1–12) pour lesquels au moins une écriture existe pour cet exercice. */
  months_with_data: number[]
  accounts: TrialBalanceAccount[]
}

export async function getTrialBalance(
  companyId: string,
  fiscalYear?: number
): Promise<TrialBalanceData> {
  const params = fiscalYear ? `?fiscal_year=${fiscalYear}` : ""
  return apiFetch<TrialBalanceData>(
    `/api/companies/${companyId}/trial-balance${params}`
  )
}

export async function upsertTrialBalance(
  companyId: string,
  entries: Array<{
    account_number: string
    description: string
    monthly_amounts: Record<string, number>
  }>,
  fiscalYear?: number
): Promise<TrialBalanceData> {
  const params = fiscalYear ? `?fiscal_year=${fiscalYear}` : ""
  return apiFetch<TrialBalanceData>(
    `/api/companies/${companyId}/trial-balance${params}`,
    { method: "PUT", body: entries }
  )
}

/** Exercices fiscaux ayant au moins une écriture de balance (du plus récent au plus ancien). */
export async function getTrialBalanceFiscalYears(
  companyId: string
): Promise<number[]> {
  return apiFetch<number[]>(
    `/api/companies/${companyId}/trial-balance/fiscal-years`
  )
}

/** Couples (exercice, mois) pour lesquels une balance a été importée — du plus récent au plus ancien. */
export type TrialBalanceReferencePeriod = {
  fiscal_year: number
  month: number
}

export async function listTrialBalanceReferencePeriods(
  companyId: string
): Promise<TrialBalanceReferencePeriod[]> {
  const MONTHS_FR = [
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
    "Décembre",
  ] as const

  const years = await getTrialBalanceFiscalYears(companyId)
  const out: TrialBalanceReferencePeriod[] = []
  for (const y of years) {
    const tb = await getTrialBalance(companyId, y)
    for (const m of tb.months_with_data ?? []) {
      if (m < 1 || m > 12) continue
      const monthKey = MONTHS_FR[m - 1]
      // Exclude months that exist in the DB only with zero amounts (common when imports upload all months).
      const hasNonZero = (tb.accounts ?? []).some((acc) => {
        const v = acc.monthly_amounts?.[monthKey] ?? 0
        return typeof v === "number" && Number.isFinite(v) && v !== 0
      })
      if (hasNonZero) out.push({ fiscal_year: y, month: m })
    }
  }
  out.sort((a, b) =>
    a.fiscal_year !== b.fiscal_year ? b.fiscal_year - a.fiscal_year : b.month - a.month
  )
  return out
}

/** Supprime toutes les écritures de balance pour un mois donné (exercice + mois). */
export async function deleteTrialBalanceMonth(
  companyId: string,
  fiscalYear: number,
  month: number
): Promise<TrialBalanceData> {
  const params = new URLSearchParams({
    fiscal_year: fiscalYear.toString(),
    month: month.toString(),
  })
  return apiFetch<TrialBalanceData>(
    `/api/companies/${companyId}/trial-balance?${params.toString()}`,
    { method: "DELETE" }
  )
}

// --- Account Mappings API ---

export interface AccountMappingData {
  id: string
  account_number: string
  description: string
  link_code: string | null
  summary_ef: string | null
  detail_ef: string | null
  divisions: string | null
  sub_divisions: string | null
  fdrhc: boolean
  interests: boolean
  amortization: boolean
  variable_costs: boolean
  fixed_costs: boolean
  product: string | null
  customer: string | null
  supplier: string | null
  interco_company_id: string | null
}

export async function listAccountMappings(
  companyId: string
): Promise<AccountMappingData[]> {
  const data = await apiFetch<{ mappings: AccountMappingData[] }>(
    `/api/companies/${companyId}/account-mappings`
  )
  return data.mappings
}

export async function deleteAccountMapping(
  companyId: string,
  mappingId: string
): Promise<void> {
  await apiFetch<void>(
    `/api/companies/${companyId}/account-mappings/${mappingId}`,
    { method: "DELETE" }
  )
}

export async function upsertAccountMappings(
  companyId: string,
  entries: Array<{
    account_number: string
    description?: string
    link_code?: string | null
    summary_ef?: string | null
    detail_ef?: string | null
    divisions?: string | null
    sub_divisions?: string | null
    fdrhc?: boolean
    interests?: boolean
    amortization?: boolean
    variable_costs?: boolean
    fixed_costs?: boolean
    product?: string | null
    customer?: string | null
    supplier?: string | null
    interco_company_id?: string | null
  }>
): Promise<AccountMappingData[]> {
  const data = await apiFetch<{ mappings: AccountMappingData[] }>(
    `/api/companies/${companyId}/account-mappings`,
    { method: "PUT", body: entries }
  )
  return data.mappings
}

export interface ProductData {
  id: string
  name: string
  sort_order: number
}

export async function listProducts(
  companyId: string
): Promise<ProductData[]> {
  const data = await apiFetch<{ products: ProductData[] }>(
    `/api/companies/${companyId}/products`
  )
  return data.products
}

export async function upsertProducts(
  companyId: string,
  names: string[]
): Promise<ProductData[]> {
  const data = await apiFetch<{ products: ProductData[] }>(
    `/api/companies/${companyId}/products`,
    { method: "PUT", body: names }
  )
  return data.products
}

export async function createProduct(
  companyId: string,
  data: { name: string }
): Promise<ProductData> {
  return apiFetch<ProductData>(`/api/companies/${companyId}/products`, {
    method: "POST",
    body: data,
  })
}

// --- Statement Structures API ---

export interface StatementStructureData {
  id: string;
  company_id: string;
  statement_type: string;
  structure: Record<string, unknown>[];
}

export async function listStatementStructures(
  companyId: string
): Promise<StatementStructureData[]> {
  const data = await apiFetch<{ structures: StatementStructureData[] }>(
    `/api/companies/${companyId}/statement-structures`
  );
  return data.structures;
}

export type StatementType = "income-statement" | "balance-sheet" | "cash-flow" | "cash-flow-detail" | "capex" | "baiia";

export async function getStatementStructure(
  companyId: string,
  statementType: StatementType
): Promise<StatementStructureData> {
  return apiFetch<StatementStructureData>(
    `/api/companies/${companyId}/statement-structures/${statementType}`
  );
}

export async function upsertStatementStructure(
  companyId: string,
  statementType: StatementType,
  structure: Record<string, unknown>[]
): Promise<StatementStructureData> {
  return apiFetch<StatementStructureData>(
    `/api/companies/${companyId}/statement-structures/${statementType}`,
    { method: "PUT", body: { structure } }
  );
}

export interface SkippedRow {
  nom: string
  reason: string
}

export interface CSVImportResponse {
  income_statement_rows_added: number
  balance_sheet_rows_added: number
  skipped: number
  skipped_details: SkippedRow[]
  message: string
}

export async function importStatementStructureCSV(
  companyId: string,
  file: File
): Promise<CSVImportResponse> {
  const formData = new FormData()
  formData.append("file", file)
  return apiFetch<CSVImportResponse>(
    `/api/companies/${companyId}/statement-structures/import-csv`,
    { method: "POST", body: formData }
  )
}

// --- Financial Statements API ---

export interface FinancialStatementDetailRow {
  id: string
  label: string
  current: number
  prior: number
  variation: number
  variationAmount: number
  isBold: boolean
  isSection: boolean
  isResult: boolean
}

export interface FinancialStatementRow {
  id: string
  label: string
  current: number
  prior: number
  variation: number
  variationAmount: number
  isBold: boolean
  isSection: boolean
  isResult: boolean
  detailRows: FinancialStatementDetailRow[]
  annexLetter?: string
  /** Présent uniquement côté API : ligne réservée au tableau Détail. */
  detailOnly?: boolean
  /** Présent côté API : ligne activée pour le tableau Détail / Annexe. */
  showInDetail?: boolean
  /** Alignement sommaire (structure enregistrée). */
  indent?: boolean
  /** Trait épais au-dessus de la ligne (structure). */
  separatorAbove?: boolean
  /** Présence d'un code de liaison ou d'une formule de liaison dans la structure. */
  hasLiaisonCode?: boolean
}

export interface FinancialStatementParams {
  fiscal_year: number
  month?: number
  period?: string
  comparison_type?: string
  budget_id?: string
  division_id?: string
  sub_division_id?: string
  customer?: string
  supplier?: string
  /** Client-only: change l’URL après sauvegarde de la structure (évite cache). L’API l’ignore. */
  structure_rev?: number
}

export interface FinancialStatementResponse {
  companyId: string
  statementType: string
  fiscalYear: number
  month: number
  period: string
  comparisonType: string
  rows: FinancialStatementRow[]
}

function buildFinancialStatementQuery(params: FinancialStatementParams): string {
  const query = new URLSearchParams()
  query.set("fiscal_year", params.fiscal_year.toString())
  if (params.month) query.set("month", params.month.toString())
  if (params.period) query.set("period", params.period)
  if (params.comparison_type) query.set("comparison_type", params.comparison_type)
  if (params.budget_id) query.set("budget_id", params.budget_id)
  if (params.division_id) query.set("division_id", params.division_id)
  if (params.sub_division_id) query.set("sub_division_id", params.sub_division_id)
  if (params.customer) query.set("customer", params.customer)
  if (params.supplier) query.set("supplier", params.supplier)
  if (params.structure_rev != null && params.structure_rev > 0) {
    query.set("_sr", params.structure_rev.toString())
  }
  return `?${query.toString()}`
}

export async function getIncomeStatement(
  companyId: string,
  params: FinancialStatementParams
): Promise<FinancialStatementResponse> {
  return apiFetch<FinancialStatementResponse>(
    `/api/companies/${companyId}/financial-statements/income-statement${buildFinancialStatementQuery(params)}`
  )
}

export async function getBalanceSheet(
  companyId: string,
  params: FinancialStatementParams
): Promise<FinancialStatementResponse> {
  return apiFetch<FinancialStatementResponse>(
    `/api/companies/${companyId}/financial-statements/balance-sheet${buildFinancialStatementQuery(params)}`
  )
}

export async function getCashFlow(
  companyId: string,
  params: FinancialStatementParams
): Promise<FinancialStatementResponse> {
  return apiFetch<FinancialStatementResponse>(
    `/api/companies/${companyId}/financial-statements/cash-flow${buildFinancialStatementQuery(params)}`
  )
}

export interface SummaryMetrics {
  fiscalYear: number
  month: number
  revenue: number
  revenueVariation: number
  netIncome: number
  netIncomeVariation: number
  totalAssets: number
  totalAssetsVariation: number
}

export async function getFinancialStatementSummary(
  companyId: string,
  fiscalYear: number,
  month?: number
): Promise<SummaryMetrics> {
  const query = new URLSearchParams()
  query.set("fiscal_year", fiscalYear.toString())
  if (month) query.set("month", month.toString())
  return apiFetch<SummaryMetrics>(
    `/api/companies/${companyId}/financial-statements/summary?${query.toString()}`
  )
}

// --- Exchange Rates API ---

export interface ExchangeRateData {
  id: string
  currency: string
  fiscal_year: number | null
  monthly_rates: Record<string, number>
  notes: Record<string, string>
  created_at: string
  updated_at: string
}

export async function getExchangeRates(
  companyId: string,
  fiscalYear?: number
): Promise<ExchangeRateData[]> {
  const params = fiscalYear ? `?fiscal_year=${fiscalYear}` : ""
  const data = await apiFetch<{ exchange_rates: ExchangeRateData[] }>(
    `/api/companies/${companyId}/exchange-rates${params}`
  )
  return data.exchange_rates
}

export async function upsertExchangeRates(
  companyId: string,
  rates: Array<{
    currency: string
    fiscal_year?: number | null
    monthly_rates: Record<string, number>
    notes?: Record<string, string>
  }>
): Promise<ExchangeRateData[]> {
  const data = await apiFetch<{ exchange_rates: ExchangeRateData[] }>(
    `/api/companies/${companyId}/exchange-rates`,
    { method: "PUT", body: rates }
  )
  return data.exchange_rates
}

// --- Budgets API ---

export interface BudgetData {
  id: string
  name: string
  fiscal_year: number
  created_by_id: string
  created_at: string
  updated_at: string
}

export interface BudgetEntryData {
  id: string
  account_id: string
  month: number
  amount: number
}

export interface BudgetWithEntries extends BudgetData {
  entries: BudgetEntryData[]
}

export async function listBudgets(
  companyId: string
): Promise<BudgetData[]> {
  const data = await apiFetch<{ budgets: BudgetData[] }>(
    `/api/companies/${companyId}/budgets`
  )
  return data.budgets
}

export async function createBudget(
  companyId: string,
  budget: { name: string; fiscal_year: number }
): Promise<BudgetData> {
  return apiFetch<BudgetData>(
    `/api/companies/${companyId}/budgets`,
    { method: "POST", body: budget }
  )
}

export async function getBudget(
  companyId: string,
  budgetId: string
): Promise<BudgetWithEntries> {
  return apiFetch<BudgetWithEntries>(
    `/api/companies/${companyId}/budgets/${budgetId}`
  )
}

export async function upsertBudgetEntries(
  companyId: string,
  budgetId: string,
  entries: Array<{ account_number: string; month: number; amount: number }>
): Promise<BudgetWithEntries> {
  return apiFetch<BudgetWithEntries>(
    `/api/companies/${companyId}/budgets/${budgetId}/entries`,
    { method: "PUT", body: entries }
  )
}

export async function deleteBudget(
  companyId: string,
  budgetId: string
): Promise<void> {
  await apiFetch(
    `/api/companies/${companyId}/budgets/${budgetId}`,
    { method: "DELETE" }
  )
}

// --- Notes API ---

export interface NoteAttachmentData {
  filename: string
  media_type: string
  data: string
}

export interface NoteData {
  id: string
  company_id: string | null
  division_id: string | null
  sub_division_id: string | null
  row_id: string
  row_label: string
  page: string
  period: string
  view: string
  current_amount: number | null
  prior_amount: number | null
  variation_percent: number | null
  variation_amount: number | null
  content: string
  attachments: NoteAttachmentData[]
  reference_month: number | null
  reference_year: number | null
  /** Exercice financier (année de clôture selon la fin d’exercice de la société) */
  fiscal_year: number | null
  created_by_id: string
  /** Nom complet de l’utilisateur qui a créé la note */
  created_by_name: string
  created_at: string
  updated_at: string
}

export interface NoteFilters {
  page?: string
  row_id?: string
  period?: string
  view?: string
  fiscal_year?: number
  reference_month?: number
  reference_year?: number
  created_by_id?: string
}

export async function listNotes(
  companyId: string,
  filters: NoteFilters = {}
): Promise<NoteData[]> {
  const query = new URLSearchParams()
  if (filters.page) query.set("page", filters.page)
  if (filters.row_id) query.set("row_id", filters.row_id)
  if (filters.period) query.set("period", filters.period)
  if (filters.view) query.set("view", filters.view)
  if (filters.fiscal_year != null) query.set("fiscal_year", String(filters.fiscal_year))
  if (filters.reference_month != null) query.set("reference_month", String(filters.reference_month))
  if (filters.reference_year != null) query.set("reference_year", String(filters.reference_year))
  if (filters.created_by_id) query.set("created_by_id", filters.created_by_id)
  const qs = query.toString() ? `?${query.toString()}` : ""
  const data = await apiFetch<{ notes: NoteData[] }>(
    `/api/companies/${companyId}/notes${qs}`
  )
  return data.notes
}

export async function createNote(
  companyId: string,
  note: {
    row_id: string
    row_label: string
    page: string
    period: string
    view: string
    current_amount?: number | null
    prior_amount?: number | null
    variation_percent?: number | null
    variation_amount?: number | null
    content: string
    division_id?: string | null
    sub_division_id?: string | null
    attachments?: NoteAttachmentData[]
    reference_month?: number | null
    reference_year?: number | null
  }
): Promise<NoteData> {
  return apiFetch<NoteData>(
    `/api/companies/${companyId}/notes`,
    { method: "POST", body: note }
  )
}

export async function updateNote(
  companyId: string,
  noteId: string,
  data: {
    content?: string
    current_amount?: number | null
    prior_amount?: number | null
    variation_percent?: number | null
    variation_amount?: number | null
    attachments?: NoteAttachmentData[]
    reference_month?: number | null
    reference_year?: number | null
  }
): Promise<NoteData> {
  return apiFetch<NoteData>(
    `/api/companies/${companyId}/notes/${noteId}`,
    { method: "PATCH", body: data }
  )
}

export async function deleteNote(
  companyId: string,
  noteId: string
): Promise<void> {
  await apiFetch(
    `/api/companies/${companyId}/notes/${noteId}`,
    { method: "DELETE" }
  )
}

// --- Projections API ---

export interface ProjectionData {
  id: string
  name: string
  projection_years: number
  projection_mode: string
  projection_horizon?: string
  start_year?: number | null
  start_month?: number | null
  company_id: string | null
  division_id: string | null
  sub_division_id: string | null
  created_by_id: string
  created_at: string
  updated_at: string
}

export interface ProjectionAdjustmentData {
  id: string
  module: string
  row_id: string
  year_index: number
  type: string
  value: number
  is_recurring: boolean
  note: string | null
}

export interface LoanData {
  id: string
  name: string
  principal: number
  interest_rate: number
  remaining_payments: number
  payment_amount: number | null
  start_month: number
  notes: string | null
}

export interface ProjectionWithDetails extends ProjectionData {
  adjustments: ProjectionAdjustmentData[]
  loans: LoanData[]
}

export async function listProjections(
  companyId: string
): Promise<ProjectionData[]> {
  const data = await apiFetch<{ projections: ProjectionData[] }>(
    `/api/companies/${companyId}/projections`
  )
  return data.projections
}

export async function createProjection(
  companyId: string,
  projection: {
    name: string
    projection_years?: number
    projection_mode?: string
    projection_horizon?: "annual" | "monthly"
    start_year?: number | null
    start_month?: number | null
    division_id?: string | null
    sub_division_id?: string | null
  }
): Promise<ProjectionData> {
  return apiFetch<ProjectionData>(
    `/api/companies/${companyId}/projections`,
    { method: "POST", body: projection }
  )
}

export async function getProjection(
  companyId: string,
  projectionId: string
): Promise<ProjectionWithDetails> {
  return apiFetch<ProjectionWithDetails>(
    `/api/companies/${companyId}/projections/${projectionId}`
  )
}

export async function updateProjection(
  companyId: string,
  projectionId: string,
  data: { name?: string; projection_years?: number; projection_mode?: string }
): Promise<ProjectionData> {
  return apiFetch<ProjectionData>(
    `/api/companies/${companyId}/projections/${projectionId}`,
    { method: "PATCH", body: data }
  )
}

export async function deleteProjection(
  companyId: string,
  projectionId: string
): Promise<void> {
  await apiFetch(
    `/api/companies/${companyId}/projections/${projectionId}`,
    { method: "DELETE" }
  )
}

// --- Projection Adjustments ---

export interface ProjectionAdjustmentCreate {
  module: string
  row_id: string
  year_index: number
  type: string
  value: number
  is_recurring?: boolean
  note?: string | null
}

export async function createProjectionAdjustment(
  companyId: string,
  projectionId: string,
  adjustment: ProjectionAdjustmentCreate
): Promise<ProjectionAdjustmentData> {
  return apiFetch<ProjectionAdjustmentData>(
    `/api/companies/${companyId}/projections/${projectionId}/adjustments`,
    { method: "POST", body: adjustment }
  )
}

export async function bulkUpsertProjectionAdjustments(
  companyId: string,
  projectionId: string,
  adjustments: ProjectionAdjustmentCreate[]
): Promise<ProjectionWithDetails> {
  return apiFetch<ProjectionWithDetails>(
    `/api/companies/${companyId}/projections/${projectionId}/adjustments`,
    { method: "PUT", body: adjustments }
  )
}

export async function deleteProjectionAdjustment(
  companyId: string,
  projectionId: string,
  adjustmentId: string
): Promise<void> {
  await apiFetch(
    `/api/companies/${companyId}/projections/${projectionId}/adjustments/${adjustmentId}`,
    { method: "DELETE" }
  )
}

// --- Projection Loans ---

export interface LoanCreate {
  name: string
  principal: number
  interest_rate: number
  remaining_payments: number
  payment_amount?: number | null
  start_month?: number
  notes?: string | null
}

export async function createProjectionLoan(
  companyId: string,
  projectionId: string,
  loan: LoanCreate
): Promise<LoanData> {
  return apiFetch<LoanData>(
    `/api/companies/${companyId}/projections/${projectionId}/loans`,
    { method: "POST", body: loan }
  )
}

export async function bulkUpsertProjectionLoans(
  companyId: string,
  projectionId: string,
  loans: LoanCreate[]
): Promise<ProjectionWithDetails> {
  return apiFetch<ProjectionWithDetails>(
    `/api/companies/${companyId}/projections/${projectionId}/loans`,
    { method: "PUT", body: loans }
  )
}

export async function deleteProjectionLoan(
  companyId: string,
  projectionId: string,
  loanId: string
): Promise<void> {
  await apiFetch(
    `/api/companies/${companyId}/projections/${projectionId}/loans/${loanId}`,
    { method: "DELETE" }
  )
}

// --- Business Risks API ---

export interface BusinessRiskData {
  id: string
  company_id: string | null
  risk_id: string
  category: string
  name: string
  description: string | null
  impact: string | null
  recommendation: string | null
  level: string | null
  note: string | null
  created_at: string
  updated_at: string
}

export interface BusinessRiskCreate {
  risk_id: string
  category: string
  name: string
  description?: string | null
  impact?: string | null
  recommendation?: string | null
  level?: string | null
  note?: string | null
}

export interface BusinessRiskUpdate {
  level?: string | null
  note?: string | null
  description?: string | null
  impact?: string | null
  recommendation?: string | null
}

export async function listBusinessRisks(
  companyId: string,
  category?: string
): Promise<BusinessRiskData[]> {
  const query = category ? `?category=${encodeURIComponent(category)}` : ""
  const data = await apiFetch<{ risks: BusinessRiskData[] }>(
    `/api/companies/${companyId}/business-risks${query}`
  )
  return data.risks
}

export async function createBusinessRisk(
  companyId: string,
  risk: BusinessRiskCreate
): Promise<BusinessRiskData> {
  return apiFetch<BusinessRiskData>(
    `/api/companies/${companyId}/business-risks`,
    { method: "POST", body: risk }
  )
}

export async function bulkUpsertBusinessRisks(
  companyId: string,
  risks: BusinessRiskCreate[]
): Promise<BusinessRiskData[]> {
  const data = await apiFetch<{ risks: BusinessRiskData[] }>(
    `/api/companies/${companyId}/business-risks`,
    { method: "PUT", body: risks }
  )
  return data.risks
}

export async function updateBusinessRisk(
  companyId: string,
  riskId: string,
  data: BusinessRiskUpdate
): Promise<BusinessRiskData> {
  return apiFetch<BusinessRiskData>(
    `/api/companies/${companyId}/business-risks/${riskId}`,
    { method: "PATCH", body: data }
  )
}

export async function deleteBusinessRisk(
  companyId: string,
  riskId: string
): Promise<void> {
  await apiFetch(
    `/api/companies/${companyId}/business-risks/${riskId}`,
    { method: "DELETE" }
  )
}

// --- Forecast Configs API ---

export interface ForecastConfigData {
  id: string
  config_type: string
  data: Record<string, unknown>
  company_id: string | null
  division_id: string | null
  sub_division_id: string | null
  projection_id: string | null
  created_at: string
  updated_at: string
}

export interface ForecastConfigUpsert {
  config_type: string
  data: Record<string, unknown>
  company_id?: string | null
  division_id?: string | null
  sub_division_id?: string | null
  projection_id?: string | null
}

export async function listForecastConfigs(
  companyId: string,
  filters: {
    config_type?: string
    division_id?: string
    sub_division_id?: string
    projection_id?: string
  } = {}
): Promise<ForecastConfigData[]> {
  const query = new URLSearchParams()
  if (filters.config_type) query.set("config_type", filters.config_type)
  if (filters.division_id) query.set("division_id", filters.division_id)
  if (filters.sub_division_id) query.set("sub_division_id", filters.sub_division_id)
  if (filters.projection_id) query.set("projection_id", filters.projection_id)
  const qs = query.toString() ? `?${query.toString()}` : ""
  const data = await apiFetch<{ configs: ForecastConfigData[] }>(
    `/api/companies/${companyId}/forecast-configs${qs}`
  )
  return data.configs
}

export async function upsertForecastConfig(
  companyId: string,
  config: ForecastConfigUpsert
): Promise<ForecastConfigData> {
  return apiFetch<ForecastConfigData>(
    `/api/companies/${companyId}/forecast-configs`,
    { method: "PUT", body: config }
  )
}

export async function deleteForecastConfig(
  companyId: string,
  configId: string
): Promise<void> {
  await apiFetch(
    `/api/companies/${companyId}/forecast-configs/${configId}`,
    { method: "DELETE" }
  )
}

// --- Projection Compute ---

export interface ProjectionYearResult {
  year_index: number
  fiscal_year: number
  total_revenue: number
  total_expenses: number
  ebitda: number
  ebitda_margin: number
  depreciation: number
  ebit: number
  net_income: number
  capex: number
  debt_service: number
  free_cash_flow: number
}

export interface ProjectionComputeResult {
  projection_id: string
  projection_name: string
  base_fiscal_year: number
  projection_years: number
  computed_at: string
  years: ProjectionYearResult[]
}

export async function computeProjection(
  companyId: string,
  projectionId: string,
  baseFiscalYear?: number,
): Promise<ProjectionComputeResult> {
  const qs = baseFiscalYear ? `?base_fiscal_year=${baseFiscalYear}` : ""
  return apiFetch<ProjectionComputeResult>(
    `/api/companies/${companyId}/projections/${projectionId}/compute${qs}`
  )
}

// --- EBITDA Multiple Notes API ---

export interface EbitdaMultipleNoteData {
  id: string
  note_type: string
  data: Record<string, unknown>
  company_id: string | null
  division_id: string | null
  sub_division_id: string | null
  created_at: string
  updated_at: string
}

export interface EbitdaMultipleNoteUpsert {
  note_type: string
  data: Record<string, unknown>
  company_id?: string | null
  division_id?: string | null
  sub_division_id?: string | null
}

export async function listEbitdaNotes(
  companyId: string,
  filters: {
    note_type?: string
    division_id?: string
    sub_division_id?: string
  } = {}
): Promise<EbitdaMultipleNoteData[]> {
  const query = new URLSearchParams()
  if (filters.note_type) query.set("note_type", filters.note_type)
  if (filters.division_id) query.set("division_id", filters.division_id)
  if (filters.sub_division_id) query.set("sub_division_id", filters.sub_division_id)
  const qs = query.toString() ? `?${query.toString()}` : ""
  const data = await apiFetch<{ notes: EbitdaMultipleNoteData[] }>(
    `/api/companies/${companyId}/ebitda-notes${qs}`
  )
  return data.notes
}

export async function upsertEbitdaNote(
  companyId: string,
  note: EbitdaMultipleNoteUpsert
): Promise<EbitdaMultipleNoteData[]> {
  const data = await apiFetch<{ notes: EbitdaMultipleNoteData[] }>(
    `/api/companies/${companyId}/ebitda-notes`,
    { method: "PUT", body: note }
  )
  return data.notes
}

// --- Financial Statement Series API ---

export interface SeriesPeriod {
  fiscalYear: number
  fiscalMonth: number
  label: string
}

export interface SeriesDetailRow {
  id: string
  label: string
  amounts: Record<string, number>  // key: "YYYY-M" e.g. "2024-1"
}

export interface SeriesRow {
  id: string
  label: string
  /** Code de liaison Sommaire (ex. « 20 »), distinct de l’id technique de ligne. */
  linkCode?: string
  isBold: boolean
  isSection: boolean
  isResult: boolean
  amounts: Record<string, number>  // key: "YYYY-M"
  detailRows: SeriesDetailRow[]
  annexLetter?: string
  detailOnly?: boolean
  showInDetail?: boolean
  indent?: boolean
  separatorAbove?: boolean
  hasLiaisonCode?: boolean
}

export interface FinancialStatementSeriesResponse {
  companyId: string
  statementType: string
  fiscalYear: number
  periods: SeriesPeriod[]
  rows: SeriesRow[]
}

export interface FinancialStatementSeriesParams {
  fiscal_year: number
  month?: number
  months?: number  // default 12
  division_id?: string
  sub_division_id?: string
  customer?: string
  supplier?: string
  /** Client-only: invalidation cache après sauvegarde structure. L’API l’ignore. */
  structure_rev?: number
}

export async function getFinancialStatementSeries(
  companyId: string,
  statementType: string,  // "income-statement" | "balance-sheet" | "cash-flow"
  params: FinancialStatementSeriesParams
): Promise<FinancialStatementSeriesResponse> {
  const query = new URLSearchParams()
  query.set("fiscal_year", params.fiscal_year.toString())
  if (params.month) query.set("month", params.month.toString())
  if (params.months) query.set("months", params.months.toString())
  if (params.division_id) query.set("division_id", params.division_id)
  if (params.sub_division_id) query.set("sub_division_id", params.sub_division_id)
  if (params.customer) query.set("customer", params.customer)
  if (params.supplier) query.set("supplier", params.supplier)
  if (params.structure_rev != null && params.structure_rev > 0) {
    query.set("_sr", params.structure_rev.toString())
  }
  return apiFetch<FinancialStatementSeriesResponse>(
    `/api/companies/${companyId}/financial-statements/${statementType}/series?${query.toString()}`
  )
}

// --- Financial Statement Summary Series API ---

export interface SummarySeriesMonth {
  month: number
  revenue: number
  revenueVariation: number
  netIncome: number
  netIncomeVariation: number
  totalAssets: number
  totalAssetsVariation: number
}

export interface SummarySeriesResponse {
  fiscalYear: number
  months: SummarySeriesMonth[]
}

export async function getFinancialStatementSummarySeries(
  companyId: string,
  fiscalYear: number
): Promise<SummarySeriesResponse> {
  return apiFetch<SummarySeriesResponse>(
    `/api/companies/${companyId}/financial-statements/summary/series?fiscal_year=${fiscalYear}`
  )
}

// --- Upload ---

export interface TrialBalanceUnknownAccountPreview {
  account_number: string
  description: string
  amount: number
}

export interface TrialBalanceUploadPreview {
  company_id: string
  fiscal_year: number
  month: number
  amount_sum: number
  balance_is_valid: boolean
  row_count: number
  unknown_accounts: TrialBalanceUnknownAccountPreview[]
}

export async function previewTrialBalanceUpload(
  companyId: string,
  file: File,
  fiscalYear?: number,
  month?: number
): Promise<TrialBalanceUploadPreview> {
  const formData = new FormData()
  formData.append("file", file)
  const params = new URLSearchParams()
  if (fiscalYear != null) params.set("fiscal_year", fiscalYear.toString())
  if (month != null) params.set("month", month.toString())
  const query = params.toString() ? `?${params.toString()}` : ""

  return apiFetch<TrialBalanceUploadPreview>(
    `/api/companies/${companyId}/trial-balance/upload-preview${query}`,
    { method: "POST", body: formData }
  )
}

export async function uploadTrialBalance(
  companyId: string,
  file: File,
  fiscalYear?: number,
  month?: number,
  ignoredAccounts?: string[]
): Promise<{ accounts_imported: number; message: string }> {
  const formData = new FormData()
  formData.append("file", file)
  const params = new URLSearchParams()
  if (fiscalYear != null) params.set("fiscal_year", fiscalYear.toString())
  if (month != null) params.set("month", month.toString())
  for (const acc of ignoredAccounts ?? []) {
    const v = String(acc || "").trim()
    if (v) params.append("ignored_accounts", v)
  }
  const query = params.toString() ? `?${params.toString()}` : ""

  return apiFetch(
    `/api/companies/${companyId}/trial-balance/upload${query}`,
    { method: "POST", body: formData }
  )
}

// --- Organization Members API ---

export interface OrgMember {
  id: string
  email: string
  full_name: string
  role: string
  all_companies: boolean
  company_ids: string[]
  created_at: string
}

export async function listOrgMembers(orgId: string): Promise<OrgMember[]> {
  const data = await apiFetch<{ members: OrgMember[] }>(
    `/api/organizations/${orgId}/members`
  )
  return data.members
}

export async function inviteMember(
  orgId: string,
  body: { email: string; role: string }
): Promise<OrgMember> {
  return apiFetch<OrgMember>(`/api/organizations/${orgId}/members`, {
    method: "POST",
    body,
  })
}

export async function updateMemberRole(
  orgId: string,
  userId: string,
  role: string
): Promise<OrgMember> {
  return apiFetch<OrgMember>(
    `/api/organizations/${orgId}/members/${userId}`,
    { method: "PATCH", body: { role } }
  )
}

export async function updateMemberAllCompanies(
  orgId: string,
  userId: string,
  allCompanies: boolean
): Promise<OrgMember> {
  return apiFetch<OrgMember>(
    `/api/organizations/${orgId}/members/${userId}`,
    { method: "PATCH", body: { all_companies: allCompanies } }
  )
}

export async function setMemberCompanies(
  orgId: string,
  userId: string,
  companyIds: string[]
): Promise<OrgMember> {
  return apiFetch<OrgMember>(
    `/api/organizations/${orgId}/members/${userId}/companies`,
    { method: "PUT", body: { company_ids: companyIds } }
  )
}

export async function removeMember(
  orgId: string,
  userId: string
): Promise<void> {
  await apiFetch(`/api/organizations/${orgId}/members/${userId}`, {
    method: "DELETE",
  })
}

// --- Customers API ---

export interface CustomerData {
  id: string
  name: string
  sort_order: number
  created_at: string
}

export async function listCustomers(
  companyId: string
): Promise<CustomerData[]> {
  const data = await apiFetch<{ customers: CustomerData[] }>(
    `/api/companies/${companyId}/customers`
  )
  return data.customers
}

export async function createCustomer(
  companyId: string,
  data: { name: string; sort_order?: number }
): Promise<CustomerData> {
  return apiFetch<CustomerData>(`/api/companies/${companyId}/customers`, {
    method: "POST",
    body: data,
  })
}

export async function bulkUpsertCustomers(
  companyId: string,
  customers: Array<{ name: string; sort_order?: number }>
): Promise<CustomerData[]> {
  const data = await apiFetch<{ customers: CustomerData[] }>(
    `/api/companies/${companyId}/customers`,
    { method: "PUT", body: customers }
  )
  return data.customers
}

export async function deleteCustomer(
  companyId: string,
  customerId: string
): Promise<void> {
  await apiFetch(`/api/companies/${companyId}/customers/${customerId}`, {
    method: "DELETE",
  })
}

// --- Suppliers API ---

export interface SupplierData {
  id: string
  name: string
  sort_order: number
  created_at: string
}

export async function listSuppliers(
  companyId: string
): Promise<SupplierData[]> {
  const data = await apiFetch<{ suppliers: SupplierData[] }>(
    `/api/companies/${companyId}/suppliers`
  )
  return data.suppliers
}

export async function createSupplier(
  companyId: string,
  data: { name: string; sort_order?: number }
): Promise<SupplierData> {
  return apiFetch<SupplierData>(`/api/companies/${companyId}/suppliers`, {
    method: "POST",
    body: data,
  })
}

export async function bulkUpsertSuppliers(
  companyId: string,
  suppliers: Array<{ name: string; sort_order?: number }>
): Promise<SupplierData[]> {
  const data = await apiFetch<{ suppliers: SupplierData[] }>(
    `/api/companies/${companyId}/suppliers`,
    { method: "PUT", body: suppliers }
  )
  return data.suppliers
}

export async function deleteSupplier(
  companyId: string,
  supplierId: string
): Promise<void> {
  await apiFetch(`/api/companies/${companyId}/suppliers/${supplierId}`, {
    method: "DELETE",
  })
}

// ============= QuickBooks Online =============

export type QboConnectionStatus = {
  status: "connected" | "revoked" | "not_connected"
  realm_id?: string | null
  connected_at?: string | null
  connected_by_user_id?: string | null
}

export type QboMonthAmount = { debit: number; credit: number }

export type QboTrialBalanceProposalRow = {
  qbo_account_id: string
  account_number: string
  account_name: string
  qbo_account_type: string | null
  qbo_account_sub_type: string | null
  existing_link_code: string | null
  monthly_amounts: Record<string, QboMonthAmount>
  discovered_divisions: string[]
  discovered_sub_divisions: string[]
  divisions: string[]
  sub_divisions: string[]
}

export type QboTrialBalancePreview = {
  fiscal_year: number
  months: number[]
  currency: string
  fetched_at: string
  existing_months: number[]
  rows: QboTrialBalanceProposalRow[]
  observed_pairs: { division: string; sub_division: string }[]
  class_location_tracking: { classes: boolean; locations: boolean }
}

export type QboLinkCode = {
  code: string
  label: string
  statement_type: string
  parent_id: string | null
  parent_label: string | null
}

export type QboCommitRow = {
  account_number: string
  account_name: string
  link_code: string | null
  skip?: boolean
  divisions?: string[]
  sub_divisions?: string[]
}

export async function getQboConnectionStatus(companyId: string): Promise<QboConnectionStatus> {
  return apiFetch<QboConnectionStatus>(`/api/quickbooks/companies/${companyId}/connection`)
}

export async function getQboAuthorizeUrl(companyId: string): Promise<string> {
  const r = await apiFetch<{ authorize_url: string }>(
    `/api/quickbooks/authorize?company_id=${companyId}`,
  )
  return r.authorize_url
}

export async function disconnectQbo(companyId: string): Promise<void> {
  await apiFetch<void>(`/api/quickbooks/companies/${companyId}/connection`, {
    method: "DELETE",
  })
}

export async function previewQboTrialBalance(
  companyId: string,
  fiscalYear: number,
  months: number[],
): Promise<QboTrialBalancePreview> {
  return apiFetch<QboTrialBalancePreview>(
    `/api/quickbooks/companies/${companyId}/trial-balance/preview`,
    { method: "POST", body: { fiscal_year: fiscalYear, months } },
  )
}

export async function commitQboTrialBalance(
  companyId: string,
  fiscalYear: number,
  months: number[],
  rows: QboCommitRow[],
  overwriteExistingTb: boolean,
): Promise<{
  months_imported: number
  accounts_imported: number
  mappings_created: number
  mappings_updated: number
}> {
  return apiFetch(
    `/api/quickbooks/companies/${companyId}/trial-balance/commit`,
    {
      method: "POST",
      body: {
        fiscal_year: fiscalYear,
        months,
        rows,
        overwrite_existing_tb: overwriteExistingTb,
      },
    },
  )
}

export async function listQboLinkCodes(companyId: string): Promise<QboLinkCode[]> {
  return apiFetch<QboLinkCode[]>(`/api/quickbooks/companies/${companyId}/link-codes`)
}


export type StatementStructureNode = {
  id?: string
  label?: string
  isSection?: boolean
  isBold?: boolean
  isResult?: boolean
  indent?: boolean
  linkCode?: string
  link_code?: string
  children?: StatementStructureNode[]
  detailRows?: StatementStructureNode[]
}

export async function getCompanyStatementStructure(
  companyId: string,
  statementType: string,
): Promise<{ structure: StatementStructureNode[] }> {
  return apiFetch<{ structure: StatementStructureNode[] }>(
    `/api/companies/${companyId}/statement-structures/${statementType}`,
  )
}

// --- Statement chart configs ------------------------------------------------

export class StaleVersionError extends Error {
  constructor(
    public currentVersion: number,
    public currentConfig: StatementChartConfig,
    public updatedByUserEmail: string | null,
    public updatedAt: string,
  ) {
    super("stale_version")
    this.name = "StaleVersionError"
  }
}

interface RawChartSlot {
  chart_instance_id: string
  slot_index: number
  version: number
  config: unknown
  updated_by_user_email: string | null
  updated_at: string
}

function rawSlotToChartSlot(raw: RawChartSlot): ChartSlot {
  return {
    chartInstanceId: raw.chart_instance_id,
    slotIndex: raw.slot_index,
    version: raw.version,
    config: normalizeChartConfig(raw.config),
    updatedByUserEmail: raw.updated_by_user_email,
    updatedAt: raw.updated_at,
  }
}

export async function listStatementChartSlots(
  companyId: string,
  statementType: ChartStatementType,
): Promise<ChartSlot[]> {
  const data = await apiFetch<{ slots: RawChartSlot[] }>(
    `/api/companies/${companyId}/statement-chart-configs?statement_type=${statementType}`,
  )
  return data.slots.map(rawSlotToChartSlot)
}

export async function addStatementChartSlot(
  companyId: string,
  statementType: ChartStatementType,
): Promise<ChartSlot> {
  const raw = await apiFetch<RawChartSlot>(
    `/api/companies/${companyId}/statement-chart-configs?statement_type=${statementType}`,
    { method: "POST" },
  )
  return rawSlotToChartSlot(raw)
}

export async function removeStatementChartSlot(
  companyId: string,
  statementType: ChartStatementType,
  chartInstanceId: string,
): Promise<void> {
  await apiFetch<void>(
    `/api/companies/${companyId}/statement-chart-configs/${encodeURIComponent(
      chartInstanceId,
    )}?statement_type=${statementType}`,
    { method: "DELETE" },
  )
}

// ─── Standard Link Codes (global chart of accounts) ──────────────────────────

export type StandardLinkCode = {
  id: string
  code: string
  parent_code: string | null
  family: string
  label_account: string | null
  label_sub_account: string | null
  account_type: string | null
  account_sub_type: string | null
  variable_or_fixed: string | null
  ft_category: string | null
  attached_link_codes: string[]
  ft_line_item: string | null
  projections: string | null
  is_leaf: boolean
  sort_order: number
  is_active?: boolean
  label: string
}

export type StandardLinkCodeFamilyGroup = {
  family: string
  account_type: string | null
  codes: StandardLinkCode[]
}

/** Returns all standard codes grouped by family. Pass leafOnly=true for assignable codes only. */
export async function listStandardLinkCodes(leafOnly = false): Promise<StandardLinkCodeFamilyGroup[]> {
  const qs = leafOnly ? "?leaf_only=true" : ""
  return apiFetch<StandardLinkCodeFamilyGroup[]>(`/api/standard-link-codes${qs}`)
}

/** Flat list — useful for dropdowns. */
export async function listStandardLinkCodesFlat(leafOnly = false, family?: string): Promise<StandardLinkCode[]> {
  const params = new URLSearchParams()
  if (leafOnly) params.set("leaf_only", "true")
  if (family) params.set("family", family)
  const qs = params.toString() ? `?${params.toString()}` : ""
  return apiFetch<StandardLinkCode[]>(`/api/standard-link-codes/flat${qs}`)
}

// ── Tenant-local custom link codes (per-company overlay) ──────────────────────

export type CompanyLinkCode = StandardLinkCode & {
  company_id: string
  promoted_to_standard_code: string | null
  is_custom: true
}

export type CompanyLinkCodeCreate = {
  family: string
  label_account?: string | null
  label_sub_account?: string | null
  code?: string | null
  parent_code?: string | null
  account_type?: string | null
  account_sub_type?: string | null
  variable_or_fixed?: string | null
  ft_category?: string | null
  ft_line_item?: string | null
  projections?: string | null
  statement_type?: string | null
}

/** List a company's tenant-local custom link codes. */
export async function listCompanyLinkCodes(
  companyId: string,
  leafOnly = false,
): Promise<CompanyLinkCode[]> {
  const qs = leafOnly ? "?leaf_only=true" : ""
  return apiFetch<CompanyLinkCode[]>(`/api/companies/${companyId}/custom-link-codes${qs}`)
}

/** Create a tenant-local custom link code (code auto-generated when omitted). */
export async function createCompanyLinkCode(
  companyId: string,
  payload: CompanyLinkCodeCreate,
): Promise<CompanyLinkCode> {
  return apiFetch<CompanyLinkCode>(`/api/companies/${companyId}/custom-link-codes`, {
    method: "POST",
    body: payload,
  })
}

/** Delete a tenant-local custom link code. */
export async function deleteCompanyLinkCode(companyId: string, codeId: string): Promise<void> {
  await apiFetch<void>(`/api/companies/${companyId}/custom-link-codes/${codeId}`, {
    method: "DELETE",
  })
}

// ── Curated promotion (custom code → global registry) ─────────────────────────

export type GlobalMatchSuggestion = {
  code: string
  label: string
  family: string
}

export type PromotionCandidate = {
  id: string
  company_id: string
  company_name: string
  code: string
  family: string
  label: string
  account_type: string | null
  ft_category: string | null
  promotion_status: string
  suggested_match: GlobalMatchSuggestion | null
}

export type PromoteRequest = {
  link_to_existing_code?: string | null
  code?: string | null
  label_account?: string | null
  label_sub_account?: string | null
}

export type PromoteResponse = {
  company_link_code_id: string
  promoted_to_standard_code: string
  created_new_code: boolean
}

/** List pending custom codes awaiting curation across the user's org. */
export async function listPromotionCandidates(): Promise<PromotionCandidate[]> {
  const res = await apiFetch<{ candidates: PromotionCandidate[] }>("/api/coa/promotion-candidates")
  return res.candidates
}

/** Promote a candidate: link to an existing global code, or publish a new one. */
export async function promotePromotionCandidate(
  candidateId: string,
  payload: PromoteRequest,
): Promise<PromoteResponse> {
  return apiFetch<PromoteResponse>(`/api/coa/promotion-candidates/${candidateId}/promote`, {
    method: "POST",
    body: payload,
  })
}

/** Reject a candidate as company-specific (removes it from the queue). */
export async function rejectPromotionCandidate(candidateId: string): Promise<void> {
  await apiFetch<void>(`/api/coa/promotion-candidates/${candidateId}/reject`, {
    method: "POST",
  })
}

// --- Superadmin: global chart-of-accounts administration ---

export type StandardLinkCodeCreate = {
  code: string
  family: string
  parent_code?: string | null
  label_account?: string | null
  label_sub_account?: string | null
  account_type?: string | null
  account_sub_type?: string | null
  variable_or_fixed?: string | null
  ft_category?: string | null
  attached_link_codes?: string[]
  ft_line_item?: string | null
  projections?: string | null
  is_leaf?: boolean
  sort_order?: number | null
}

/** Create a global standard code (superadmin only). */
export async function createStandardLinkCode(payload: StandardLinkCodeCreate): Promise<StandardLinkCode> {
  return apiFetch<StandardLinkCode>("/api/standard-link-codes", {
    method: "POST",
    body: payload,
  })
}

/** Edit a global code's metadata (superadmin only). */
export async function updateStandardLinkCode(
  code: string,
  payload: Partial<StandardLinkCodeCreate>,
): Promise<StandardLinkCode> {
  return apiFetch<StandardLinkCode>(`/api/standard-link-codes/${encodeURIComponent(code)}`, {
    method: "PATCH",
    body: payload,
  })
}

export async function deleteStandardLinkCode(code: string): Promise<void> {
  await apiFetch<void>(`/api/standard-link-codes/${encodeURIComponent(code)}`, {
    method: "DELETE",
  })
}

export async function syncStandardLinkCodesToCompanies(): Promise<{ companies_updated: number }> {
  return apiFetch<{ companies_updated: number }>("/api/standard-link-codes/sync-companies", {
    method: "POST",
  })
}

/** Deprecate (tombstone) or reactivate a global code (superadmin only). */
export async function setStandardLinkCodeActive(code: string, active: boolean): Promise<StandardLinkCode> {
  const qs = active ? "?reactivate=true" : ""
  return apiFetch<StandardLinkCode>(
    `/api/standard-link-codes/${encodeURIComponent(code)}${qs}`,
    { method: "DELETE" },
  )
}

// --- Superadmin: client (organization) management + feature flags ---

export type FeatureFlagDef = { key: string; label: string; default: boolean }

export type AdminOrg = {
  id: string
  name: string
  slug: string
  member_count: number
  company_count: number
  feature_flags: Record<string, boolean>
  created_at: string
}

/** List all clients (organizations) with counts + effective feature flags. */
export async function listClients(): Promise<AdminOrg[]> {
  const res = await apiFetch<{ organizations: AdminOrg[] }>("/api/admin/organizations")
  return res.organizations
}

/** Create a client + first admin user (superadmin only). */
export async function createClient(payload: { name: string; admin_email: string }): Promise<AdminOrg> {
  return apiFetch<AdminOrg>("/api/admin/organizations", {
    method: "POST",
    body: payload,
  })
}

/** The fixed registry of known feature flags. */
export async function listFeatureFlagRegistry(): Promise<FeatureFlagDef[]> {
  return apiFetch<FeatureFlagDef[]>("/api/admin/feature-flags")
}

/** Replace a client's feature-flag overrides (superadmin only). */
export async function setClientFeatureFlags(
  orgId: string,
  flags: Record<string, boolean>,
): Promise<AdminOrg> {
  return apiFetch<AdminOrg>(`/api/admin/organizations/${orgId}/feature-flags`, {
    method: "PATCH",
    body: { flags },
  })
}

export type StandardCodesStatus = {
  total: number
  leaf_count: number
  active_count: number
  current_version: number | null
}

/** Current state of the global standardized chart (superadmin only). */
export async function getStandardCodesStatus(): Promise<StandardCodesStatus> {
  return apiFetch<StandardCodesStatus>("/api/admin/standard-link-codes/status")
}

export type SeedStandardCodesResult = {
  version: number
  upserted: number
  tombstoned: number
  total: number
  leaf_count: number
}

/** One-click import of the global standardized chart from MO.xlsx (superadmin only). */
export async function seedStandardLinkCodes(): Promise<SeedStandardCodesResult> {
  return apiFetch<SeedStandardCodesResult>("/api/admin/standard-link-codes/seed", {
    method: "POST",
  })
}

export async function saveStatementChartSlot(
  companyId: string,
  statementType: ChartStatementType,
  chartInstanceId: string,
  payload: { version: number; config: StatementChartConfig },
): Promise<ChartSlot> {
  try {
    const raw = await apiFetch<RawChartSlot>(
      `/api/companies/${companyId}/statement-chart-configs/${encodeURIComponent(
        chartInstanceId,
      )}?statement_type=${statementType}`,
      { method: "PUT", body: payload },
    )
    return rawSlotToChartSlot(raw)
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      // FastAPI wraps the detail under `detail` when raising HTTPException.
      try {
        const parsed = JSON.parse(err.detail) as {
          detail?: string
          current_version?: number
          current_config?: unknown
          updated_by_user_email?: string | null
          updated_at?: string
        }
        if (
          parsed.detail === "stale_version" &&
          typeof parsed.current_version === "number" &&
          typeof parsed.updated_at === "string"
        ) {
          throw new StaleVersionError(
            parsed.current_version,
            normalizeChartConfig(parsed.current_config),
            parsed.updated_by_user_email ?? null,
            parsed.updated_at,
          )
        }
      } catch (parseErr) {
        if (parseErr instanceof StaleVersionError) throw parseErr
        // fall through to rethrow original ApiError
      }
    }
    throw err
  }
}
