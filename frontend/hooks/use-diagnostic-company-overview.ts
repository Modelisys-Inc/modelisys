"use client"

import { useCallback, useEffect, useState } from "react"
import {
  createDefaultCompanyOverview,
  getCompanyOverview,
  saveCompanyOverview,
  type CompanyOverviewGeneralInfo,
  type CompanyOverviewHistoryEntry,
  type CompanyOverviewManagementRow,
  type CompanyOverviewShareholderRow,
  type CompanyOverviewVotingShareholderRow,
  type DiagnosticCompanyOverview,
} from "@/lib/diagnostic-company-overview"

function newId(): string {
  return globalThis.crypto.randomUUID()
}

export function useDiagnosticCompanyOverview(diagnosticId: string, companyName: string) {
  // Ne pas lire localStorage au 1er render (SSR) : IDs / données différeraient du client.
  const [overview, setOverview] = useState<DiagnosticCompanyOverview>(() =>
    createDefaultCompanyOverview(diagnosticId, companyName),
  )

  useEffect(() => {
    setOverview(getCompanyOverview(diagnosticId, companyName))
  }, [diagnosticId, companyName])

  const persist = useCallback((next: DiagnosticCompanyOverview) => {
    const saved = saveCompanyOverview(next)
    setOverview(saved)
    return saved
  }, [])

  const updateGeneralInfo = useCallback(
    (key: keyof CompanyOverviewGeneralInfo, value: string) => {
      setOverview((prev) => {
        const next = {
          ...prev,
          generalInfo: { ...prev.generalInfo, [key]: value },
        }
        return saveCompanyOverview(next)
      })
    },
    [],
  )

  const updateMainActivities = useCallback((value: string) => {
    setOverview((prev) => saveCompanyOverview({ ...prev, mainActivities: value }))
  }, [])

  const updateHistory = useCallback((entries: CompanyOverviewHistoryEntry[]) => {
    setOverview((prev) => saveCompanyOverview({ ...prev, history: entries }))
  }, [])

  const updateParticipatingShareholders = useCallback((rows: CompanyOverviewShareholderRow[]) => {
    setOverview((prev) => saveCompanyOverview({ ...prev, participatingShareholders: rows }))
  }, [])

  const updateVotingShareholders = useCallback((rows: CompanyOverviewVotingShareholderRow[]) => {
    setOverview((prev) => saveCompanyOverview({ ...prev, votingShareholders: rows }))
  }, [])

  const updateManagement = useCallback((rows: CompanyOverviewManagementRow[]) => {
    setOverview((prev) => saveCompanyOverview({ ...prev, management: rows }))
  }, [])

  const resetOverview = useCallback(() => {
    persist(createDefaultCompanyOverview(diagnosticId, companyName))
  }, [companyName, diagnosticId, persist])

  return {
    overview,
    updateGeneralInfo,
    updateMainActivities,
    updateHistory,
    updateParticipatingShareholders,
    updateVotingShareholders,
    updateManagement,
    resetOverview,
    addHistoryEntry: () =>
      updateHistory([...overview.history, { id: newId(), year: "", description: "" }]),
    removeHistoryEntry: (id: string) =>
      updateHistory(
        overview.history.length > 1
          ? overview.history.filter((entry) => entry.id !== id)
          : overview.history,
      ),
    addShareholder: () =>
      updateParticipatingShareholders([
        ...overview.participatingShareholders,
        { id: newId(), name: "", percentage: "" },
      ]),
    removeShareholder: (id: string) =>
      updateParticipatingShareholders(
        overview.participatingShareholders.length > 1
          ? overview.participatingShareholders.filter((row) => row.id !== id)
          : overview.participatingShareholders,
      ),
    addVotingShareholder: () =>
      updateVotingShareholders([
        ...overview.votingShareholders,
        { id: newId(), name: "", percentage: "" },
      ]),
    removeVotingShareholder: (id: string) =>
      updateVotingShareholders(
        overview.votingShareholders.length > 1
          ? overview.votingShareholders.filter((row) => row.id !== id)
          : overview.votingShareholders,
      ),
    addManagementRow: () =>
      updateManagement([...overview.management, { id: newId(), role: "", name: "" }]),
    removeManagementRow: (id: string) =>
      updateManagement(
        overview.management.length > 1
          ? overview.management.filter((row) => row.id !== id)
          : overview.management,
      ),
  }
}
