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
    const data = await res.json().catch(() => ({ detail: res.statusText }))
    throw new ApiError(res.status, data.detail || res.statusText)
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
    const data = await res.json().catch(() => ({ detail: res.statusText }))
    throw new ApiError(res.status, data.detail || res.statusText)
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
    created_at: string
  }
  organizations: Array<{
    id: string
    name: string
    slug: string
    role: string
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
  data: { name?: string; fiscal_year_end?: string; currency?: string }
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

export type StatementType = "income-statement" | "balance-sheet" | "capex" | "baiia";

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
  created_by_id: string
  created_at: string
  updated_at: string
}

export interface NoteFilters {
  page?: string
  row_id?: string
  period?: string
  view?: string
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
  isBold: boolean
  isSection: boolean
  isResult: boolean
  amounts: Record<string, number>  // key: "YYYY-M"
  detailRows: SeriesDetailRow[]
  annexLetter?: string
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

export async function uploadTrialBalance(
  companyId: string,
  file: File,
  fiscalYear?: number,
  month?: number
): Promise<{ accounts_imported: number; message: string }> {
  const formData = new FormData()
  formData.append("file", file)
  const params = new URLSearchParams()
  if (fiscalYear) params.set("fiscal_year", fiscalYear.toString())
  if (month) params.set("month", month.toString())
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
