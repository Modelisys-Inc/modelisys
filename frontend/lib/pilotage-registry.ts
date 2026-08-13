import {
  createCompanyReport,
  findLatestCompanyReportForCompany,
  getCompanyReport,
  listCompanyReports,
  listCompanyReportsForCompany,
  removeCompanyReport,
  syncCompanyReportCompanyName,
  touchCompanyReport,
  type CompanyReportRecord,
} from "@/lib/company-report-registry"

export type PilotageRecord = CompanyReportRecord

const MODULE = "pilotage" as const

export function listPilotageReports(): PilotageRecord[] {
  return listCompanyReports(MODULE)
}

export function listPilotageReportsForCompany(companyId?: string | null): PilotageRecord[] {
  return listCompanyReportsForCompany(MODULE, companyId)
}

export function getPilotageReport(id: string): PilotageRecord | null {
  return getCompanyReport(MODULE, id)
}

export function findLatestPilotageReportForCompany(companyId: string): PilotageRecord | null {
  return findLatestCompanyReportForCompany(MODULE, companyId)
}

export function createPilotageReport(params: {
  companyId: string
  companyName: string
  title?: string
  referenceYear: number
  referenceMonth: number
}): PilotageRecord {
  return createCompanyReport(MODULE, params)
}

export function touchPilotageReport(id: string): PilotageRecord | null {
  return touchCompanyReport(MODULE, id)
}

export function removePilotageReport(id: string): void {
  removeCompanyReport(MODULE, id)
}

export function syncPilotageCompanyName(companyId: string, companyName: string): void {
  syncCompanyReportCompanyName(MODULE, companyId, companyName)
}
