/**
 * Registre local des diagnostics (wrapper rétrocompatible).
 * Voir `company-report-registry.ts` pour l'implémentation partagée avec le pilotage.
 */

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

export type DiagnosticRecord = CompanyReportRecord

const MODULE = "diagnostic" as const

export function listDiagnostics(): DiagnosticRecord[] {
  return listCompanyReports(MODULE)
}

export function listDiagnosticsForCompany(companyId?: string | null): DiagnosticRecord[] {
  return listCompanyReportsForCompany(MODULE, companyId)
}

export function getDiagnostic(id: string): DiagnosticRecord | null {
  return getCompanyReport(MODULE, id)
}

export function findLatestDiagnosticForCompany(companyId: string): DiagnosticRecord | null {
  return findLatestCompanyReportForCompany(MODULE, companyId)
}

export function createDiagnostic(params: {
  companyId: string
  companyName: string
  title?: string
  referenceYear: number
  referenceMonth: number
}): DiagnosticRecord {
  return createCompanyReport(MODULE, params)
}

export function touchDiagnostic(id: string): DiagnosticRecord | null {
  return touchCompanyReport(MODULE, id)
}

export function removeDiagnostic(id: string): void {
  removeCompanyReport(MODULE, id)
}

export function syncDiagnosticCompanyName(companyId: string, companyName: string): void {
  syncCompanyReportCompanyName(MODULE, companyId, companyName)
}
