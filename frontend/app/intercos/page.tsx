"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import {
  listCompanies,
  listAccountMappings,
  upsertAccountMappings,
  type Company as ApiCompany,
  type AccountMappingData,
} from "@/lib/api"

interface IntercoAccount {
  accountNumber: string
  description: string
  linkCode: string | null
  summaryEF: string | null
  detailEF: string | null
  companyId: string
  intercoCompanyId: string | null
}

export default function IntercosPage() {
  const [companies, setCompanies] = useState<ApiCompany[]>([])
  const [intercoAccounts, setIntercoAccounts] = useState<IntercoAccount[]>([])
  const [loading, setLoading] = useState(true)

  const loadIntercoAccounts = useCallback(async () => {
    try {
      const loadedCompanies = await listCompanies()
      setCompanies(loadedCompanies)

      const allIntercoAccounts: IntercoAccount[] = []

      await Promise.all(
        loadedCompanies.map(async (company) => {
          try {
            const mappings = await listAccountMappings(company.id)
            mappings.forEach((mapping) => {
              if (mapping.interco_company_id) {
                allIntercoAccounts.push({
                  accountNumber: mapping.account_number,
                  description: mapping.description,
                  linkCode: mapping.link_code,
                  summaryEF: mapping.summary_ef,
                  detailEF: mapping.detail_ef,
                  companyId: company.id,
                  intercoCompanyId: mapping.interco_company_id,
                })
              }
            })
          } catch (e) {
            console.error(`Error loading account mappings for company ${company.id}:`, e)
          }
        })
      )

      setIntercoAccounts(allIntercoAccounts)
    } catch (e) {
      console.error("Error loading companies:", e)
      setCompanies([])
      setIntercoAccounts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadIntercoAccounts()
  }, [loadIntercoAccounts])

  const saveIntercoAccount = async (
    accountNumber: string,
    currentCompanyId: string,
    field: "companyId" | "intercoCompanyId",
    value: string
  ) => {
    if (field === "intercoCompanyId") {
      try {
        // Find the existing account to preserve all mapping fields
        const existing = intercoAccounts.find(
          (a) => a.accountNumber === accountNumber && a.companyId === currentCompanyId
        )
        await upsertAccountMappings(currentCompanyId, [
          {
            account_number: accountNumber,
            description: existing?.description ?? "",
            link_code: existing?.linkCode ?? null,
            summary_ef: existing?.summaryEF ?? null,
            detail_ef: existing?.detailEF ?? null,
            interco_company_id: value === "none" ? null : value,
          },
        ])
        await loadIntercoAccounts()
      } catch (e) {
        console.error("Error saving interco account:", e)
      }
    }
    // Note: "companyId" field (moving an account between companies) is not supported
    // via the current API — account mappings are scoped per company.
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />

      {/* Dark Header Section */}
      <div className="w-full bg-slate-900 pt-15 pb-40">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="flex items-start gap-3 mb-8">
            <div className="w-2"></div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <Link
                  href="/"
                  className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <h2 className="text-4xl font-normal text-white mb-2 tracking-tight">Intercos</h2>
              </div>
              <p className="text-base text-slate-300 mb-6">
                Gérez les transactions intercompagnies et les éliminations
              </p>
              <p className="text-base text-slate-300 mb-6 leading-relaxed max-w-4xl">
                Configurez et suivez les comptes intercompagnies entre vos différentes sociétés.
                Identifiez la société source et la société de destination pour chaque transaction intercompagnie.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Overlapping section */}
      <div className="relative -mt-32 mb-12">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="w-full bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
            {/* Header */}
            <div className="bg-white px-8 py-5 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">Gestion des Intercos</h2>
                    <p className="text-sm text-slate-700">
                      Configurez les comptes intercompagnies entre vos sociétés
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-white">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  <span className="ml-2 text-sm text-slate-500">Chargement...</span>
                </div>
              ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm"># de compte</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Description</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Code de liaison</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Sommaire EF</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Détail EF</th>
                    <th className="px-6 py-4 text-center font-semibold text-slate-900 text-sm">Société</th>
                    <th className="px-6 py-4 text-center font-semibold text-slate-900 text-sm">Interco</th>
                  </tr>
                </thead>
                <tbody>
                  {intercoAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-8 py-12 text-center text-sm text-slate-500">
                        <p>Aucun compte intercompagnie configuré.</p>
                        <p className="text-xs text-slate-400 mt-2">
                          Configurez des intercos dans le mapping comptable de vos sociétés pour qu&apos;ils apparaissent ici.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    intercoAccounts.map((account) => (
                      <tr key={`${account.companyId}-${account.accountNumber}`} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-600 font-mono">{account.accountNumber}</td>
                        <td className="px-6 py-4 text-sm text-slate-900">{account.description}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{account.linkCode || "-"}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{account.summaryEF || "-"}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{account.detailEF || "-"}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-xs text-slate-700">
                            {companies.find(c => c.id === account.companyId)?.name || account.companyId}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Select
                            value={account.intercoCompanyId || "none"}
                            onValueChange={(value) => saveIntercoAccount(account.accountNumber, account.companyId, "intercoCompanyId", value)}
                            disabled={companies.length === 0}
                          >
                            <SelectTrigger className="w-40 h-8 text-xs">
                              <SelectValue placeholder={companies.length === 0 ? "Aucune société" : "Aucune"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Aucune</SelectItem>
                              {companies.filter(c => c.id !== account.companyId).map((comp) => (
                                <SelectItem key={comp.id} value={comp.id}>
                                  {comp.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
