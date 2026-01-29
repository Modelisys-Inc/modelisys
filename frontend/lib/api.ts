const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface TokenPair {
  access_token: string;
  refresh_token: string;
}

function getTokens(): TokenPair | null {
  if (typeof window === "undefined") return null;
  const access = localStorage.getItem("access_token");
  const refresh = localStorage.getItem("refresh_token");
  if (!access || !refresh) return null;
  return { access_token: access, refresh_token: refresh };
}

function setTokens(tokens: TokenPair) {
  localStorage.setItem("access_token", tokens.access_token);
  localStorage.setItem("refresh_token", tokens.refresh_token);
  // Keep legacy "token" key for backward compatibility during migration
  localStorage.setItem("token", "authenticated");
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("token");
}

export function isAuthenticated(): boolean {
  return !!getTokens()?.access_token;
}

async function refreshAccessToken(): Promise<string | null> {
  const tokens = getTokens();
  if (!tokens?.refresh_token) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: tokens.refresh_token }),
    });

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const data = await res.json();
    setTokens(data);
    return data.access_token;
  } catch {
    clearTokens();
    return null;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const tokens = getTokens();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Don't set Content-Type for FormData (file uploads)
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  if (tokens?.access_token) {
    headers["Authorization"] = `Bearer ${tokens.access_token}`;
  }

  let res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  // If 401, try refreshing the token
  if (res.status === 401 && tokens?.refresh_token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    }
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// --- Auth API ---

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  organization_name: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserInfo {
  user: {
    id: string;
    email: string;
    full_name: string;
    is_active: boolean;
    created_at: string;
  };
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
  }>;
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Login failed" }));
    throw new Error(error.detail || "Login failed");
  }

  const tokens: AuthResponse = await res.json();
  setTokens(tokens);
  return tokens;
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Registration failed" }));
    throw new Error(error.detail || "Registration failed");
  }

  const tokens: AuthResponse = await res.json();
  setTokens(tokens);
  return tokens;
}

export async function getMe(): Promise<UserInfo> {
  return apiFetch<UserInfo>("/api/auth/me");
}

// --- Companies API ---

export interface SubDivision {
  id: string;
  name: string;
}

export interface Division {
  id: string;
  name: string;
  sub_divisions: SubDivision[];
}

export interface Company {
  id: string;
  name: string;
  fiscal_year_end: string;
  currency: string;
  divisions: Division[];
  created_at: string;
  updated_at: string;
}

export async function listCompanies(): Promise<Company[]> {
  const data = await apiFetch<{ companies: Company[] }>("/api/companies");
  return data.companies;
}

export async function getCompany(id: string): Promise<Company> {
  return apiFetch<Company>(`/api/companies/${id}`);
}

export async function createCompany(data: {
  name: string;
  fiscal_year_end?: string;
  currency?: string;
  divisions?: Array<{ name: string; sub_divisions?: Array<{ name: string }> }>;
}): Promise<Company> {
  return apiFetch<Company>("/api/companies", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCompany(
  id: string,
  data: { name?: string; fiscal_year_end?: string; currency?: string }
): Promise<Company> {
  return apiFetch<Company>(`/api/companies/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteCompany(id: string): Promise<void> {
  await apiFetch(`/api/companies/${id}`, { method: "DELETE" });
}

export async function createDivision(
  companyId: string,
  data: { name: string; sub_divisions?: Array<{ name: string }> }
): Promise<Division> {
  return apiFetch<Division>(`/api/companies/${companyId}/divisions`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateDivision(
  divisionId: string,
  data: { name: string }
): Promise<Division> {
  return apiFetch<Division>(`/api/companies/divisions/${divisionId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteDivision(divisionId: string): Promise<void> {
  await apiFetch(`/api/companies/divisions/${divisionId}`, { method: "DELETE" });
}

export async function createSubDivision(
  divisionId: string,
  data: { name: string }
): Promise<SubDivision> {
  return apiFetch<SubDivision>(
    `/api/companies/divisions/${divisionId}/sub-divisions`,
    { method: "POST", body: JSON.stringify(data) }
  );
}

export async function updateSubDivision(
  subDivisionId: string,
  data: { name: string }
): Promise<SubDivision> {
  return apiFetch<SubDivision>(`/api/companies/sub-divisions/${subDivisionId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteSubDivision(subDivisionId: string): Promise<void> {
  await apiFetch(`/api/companies/sub-divisions/${subDivisionId}`, {
    method: "DELETE",
  });
}

// --- Trial Balance API ---

export interface TrialBalanceAccount {
  account_number: string;
  description: string;
  monthly_amounts: Record<string, number>;
}

export interface TrialBalanceData {
  company_id: string;
  fiscal_year: number;
  accounts: TrialBalanceAccount[];
}

export async function getTrialBalance(
  companyId: string,
  fiscalYear?: number
): Promise<TrialBalanceData> {
  const params = fiscalYear ? `?fiscal_year=${fiscalYear}` : "";
  return apiFetch<TrialBalanceData>(
    `/api/companies/${companyId}/trial-balance${params}`
  );
}

export async function upsertTrialBalance(
  companyId: string,
  entries: Array<{
    account_number: string;
    description: string;
    monthly_amounts: Record<string, number>;
  }>,
  fiscalYear?: number
): Promise<TrialBalanceData> {
  const params = fiscalYear ? `?fiscal_year=${fiscalYear}` : "";
  return apiFetch<TrialBalanceData>(
    `/api/companies/${companyId}/trial-balance${params}`,
    { method: "PUT", body: JSON.stringify(entries) }
  );
}

// --- Account Mappings API ---

export interface AccountMappingData {
  id: string;
  account_number: string;
  description: string;
  link_code: string | null;
  summary_ef: string | null;
  detail_ef: string | null;
  divisions: string | null;
  sub_divisions: string | null;
  fdrhc: boolean;
  interests: boolean;
  amortization: boolean;
  variable_costs: boolean;
  fixed_costs: boolean;
  product: string | null;
  interco_company_id: string | null;
}

export async function listAccountMappings(
  companyId: string
): Promise<AccountMappingData[]> {
  const data = await apiFetch<{ mappings: AccountMappingData[] }>(
    `/api/companies/${companyId}/account-mappings`
  );
  return data.mappings;
}

export async function upsertAccountMappings(
  companyId: string,
  entries: Array<{
    account_number: string;
    description?: string;
    link_code?: string | null;
    summary_ef?: string | null;
    detail_ef?: string | null;
    divisions?: string | null;
    sub_divisions?: string | null;
    fdrhc?: boolean;
    interests?: boolean;
    amortization?: boolean;
    variable_costs?: boolean;
    fixed_costs?: boolean;
    product?: string | null;
    interco_company_id?: string | null;
  }>
): Promise<AccountMappingData[]> {
  const data = await apiFetch<{ mappings: AccountMappingData[] }>(
    `/api/companies/${companyId}/account-mappings`,
    { method: "PUT", body: JSON.stringify(entries) }
  );
  return data.mappings;
}

export interface ProductData {
  id: string;
  name: string;
  sort_order: number;
}

export async function listProducts(
  companyId: string
): Promise<ProductData[]> {
  const data = await apiFetch<{ products: ProductData[] }>(
    `/api/companies/${companyId}/products`
  );
  return data.products;
}

export async function upsertProducts(
  companyId: string,
  names: string[]
): Promise<ProductData[]> {
  const data = await apiFetch<{ products: ProductData[] }>(
    `/api/companies/${companyId}/products`,
    { method: "PUT", body: JSON.stringify(names) }
  );
  return data.products;
}

export async function createProduct(
  companyId: string,
  data: { name: string }
): Promise<ProductData> {
  return apiFetch<ProductData>(`/api/companies/${companyId}/products`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function uploadTrialBalance(
  companyId: string,
  file: File,
  fiscalYear?: number,
  month?: number
): Promise<{ accounts_imported: number; message: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const params = new URLSearchParams();
  if (fiscalYear) params.set("fiscal_year", fiscalYear.toString());
  if (month) params.set("month", month.toString());
  const query = params.toString() ? `?${params.toString()}` : "";

  return apiFetch(
    `/api/companies/${companyId}/trial-balance/upload${query}`,
    { method: "POST", body: formData }
  );
}
