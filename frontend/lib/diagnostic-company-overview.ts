/**
 * Contenu qualitatif « Aperçu de l'entreprise » — stocké par diagnostic (localStorage).
 */

export type CompanyOverviewGeneralInfo = {
  sector: string
  scianCode: string
  incorporationYear: string
  headquarters: string
  employeeCount: string
  mainMarkets: string
  mainClients: string
  legalStructure: string
}

export type CompanyOverviewHistoryEntry = {
  id: string
  year: string
  description: string
}

export type CompanyOverviewShareholderRow = {
  id: string
  name: string
  percentage: string
}

export type CompanyOverviewVotingShareholderRow = {
  id: string
  name: string
  percentage: string
}

export type CompanyOverviewManagementRow = {
  id: string
  role: string
  name: string
}

export type DiagnosticCompanyOverview = {
  diagnosticId: string
  generalInfo: CompanyOverviewGeneralInfo
  history: CompanyOverviewHistoryEntry[]
  participatingShareholders: CompanyOverviewShareholderRow[]
  votingShareholders: CompanyOverviewVotingShareholderRow[]
  management: CompanyOverviewManagementRow[]
  mainActivities: string
  updatedAt: string
}

export const COMPANY_OVERVIEW_GENERAL_INFO_FIELDS: {
  key: keyof CompanyOverviewGeneralInfo
  label: string
}[] = [
  { key: "sector", label: "Secteur d'activité" },
  { key: "scianCode", label: "Code SCIAN" },
  { key: "incorporationYear", label: "Année d'incorporation" },
  { key: "headquarters", label: "Siège social" },
  { key: "employeeCount", label: "Nombre d'employés" },
  { key: "mainMarkets", label: "Principaux marchés" },
  { key: "mainClients", label: "Clientèle cible" },
  { key: "legalStructure", label: "Structure juridique" },
]

export const DIAGNOSTIC_COMPANY_OVERVIEW_ANCHOR_ID = "diagnostic-report-company-overview"

/** Ancre de la page d'introduction (alignée sur les autres analyses du rapport). */
export const COMPANY_OVERVIEW_PRINT_INTRO_ID = "report-company-overview-intro"

export const COMPANY_OVERVIEW_PRINT_INTRO = {
  title: "Aperçu de l'entreprise",
  subtitle: "Informations générales et structure organisationnelle",
  description:
    "Cette section présente le contexte qualitatif de l'entreprise : profil sectoriel, historique, structure actionnariale, équipe de direction et description des activités. Ces informations sont documentées manuellement et complètent l'analyse financière qui suit.",
} as const

const STORAGE_KEY = "modelisys-diagnostic-company-overview"

function newId(): string {
  return globalThis.crypto.randomUUID()
}

function readAll(): DiagnosticCompanyOverview[] {
  if (typeof globalThis.localStorage === "undefined") return []
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isCompanyOverview).map(normalizeOverview)
  } catch {
    return []
  }
}

function writeAll(records: DiagnosticCompanyOverview[]) {
  if (typeof globalThis.localStorage === "undefined") return
  globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

function isCompanyOverview(value: unknown): value is DiagnosticCompanyOverview {
  if (!value || typeof value !== "object") return false
  const row = value as Record<string, unknown>
  return (
    typeof row.diagnosticId === "string" &&
    row.generalInfo != null &&
    typeof row.generalInfo === "object" &&
    Array.isArray(row.history) &&
    Array.isArray(row.participatingShareholders) &&
    (Array.isArray(row.votingShareholders) || Array.isArray(row.votingCategories)) &&
    Array.isArray(row.management) &&
    typeof row.mainActivities === "string"
  )
}

function normalizeVotingShareholderRow(
  entry: Record<string, unknown>,
): CompanyOverviewVotingShareholderRow {
  return {
    id: typeof entry.id === "string" ? entry.id : newId(),
    name:
      (typeof entry.name === "string" ? entry.name : "") ||
      (typeof entry.category === "string" ? entry.category : ""),
    percentage:
      (typeof entry.percentage === "string" ? entry.percentage : "") ||
      (typeof entry.description === "string" ? entry.description : ""),
  }
}

function normalizeOverview(row: DiagnosticCompanyOverview & { votingCategories?: unknown[] }): DiagnosticCompanyOverview {
  const legacyGeneral = row.generalInfo as CompanyOverviewGeneralInfo & {
    companyName?: string
    annualRevenue?: string
    normalizedEbitda?: string
  }
  const { companyName: _c, annualRevenue: _r, normalizedEbitda: _e, ...generalInfo } = {
    ...createDefaultGeneralInfo(),
    ...legacyGeneral,
  }

  const votingSource = row.votingShareholders ?? row.votingCategories ?? []

  return {
    ...row,
    generalInfo,
    history: row.history.map((entry) => ({
      id: entry.id || newId(),
      year: entry.year ?? "",
      description: entry.description ?? "",
    })),
    participatingShareholders: row.participatingShareholders.map((entry) => ({
      id: entry.id || newId(),
      name: entry.name ?? "",
      percentage: entry.percentage ?? "",
    })),
    votingShareholders: votingSource.map((entry) =>
      normalizeVotingShareholderRow(entry as Record<string, unknown>),
    ),
    management: row.management.map((entry) => ({
      id: entry.id || newId(),
      role: entry.role ?? "",
      name: entry.name ?? "",
    })),
    mainActivities: row.mainActivities ?? "",
    updatedAt: row.updatedAt || new Date().toISOString(),
  }
}

export function createDefaultGeneralInfo(): CompanyOverviewGeneralInfo {
  return {
    sector: "",
    scianCode: "",
    incorporationYear: "",
    headquarters: "",
    employeeCount: "",
    mainMarkets: "",
    mainClients: "",
    legalStructure: "",
  }
}

export function createDefaultCompanyOverview(
  diagnosticId: string,
  _companyName = "",
): DiagnosticCompanyOverview {
  // IDs stables : évite un mismatch d’hydratation SSR/client (randomUUID diffère).
  return {
    diagnosticId,
    generalInfo: createDefaultGeneralInfo(),
    history: [{ id: "co-default-history", year: "", description: "" }],
    participatingShareholders: [{ id: "co-default-participating", name: "", percentage: "" }],
    votingShareholders: [{ id: "co-default-voting", name: "", percentage: "" }],
    management: [{ id: "co-default-management", role: "", name: "" }],
    mainActivities: "",
    updatedAt: "",
  }
}

export function getCompanyOverview(
  diagnosticId: string,
  companyName = "",
): DiagnosticCompanyOverview {
  const existing = readAll().find((row) => row.diagnosticId === diagnosticId)
  if (existing) {
    return normalizeOverview(existing)
  }
  return createDefaultCompanyOverview(diagnosticId, companyName)
}

export function saveCompanyOverview(overview: DiagnosticCompanyOverview): DiagnosticCompanyOverview {
  const next: DiagnosticCompanyOverview = {
    ...normalizeOverview(overview),
    updatedAt: new Date().toISOString(),
  }
  const all = readAll().filter((row) => row.diagnosticId !== next.diagnosticId)
  writeAll([next, ...all])
  return next
}

export function removeCompanyOverview(diagnosticId: string): void {
  writeAll(readAll().filter((row) => row.diagnosticId !== diagnosticId))
}
