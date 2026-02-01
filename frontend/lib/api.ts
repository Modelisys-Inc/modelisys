const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

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
