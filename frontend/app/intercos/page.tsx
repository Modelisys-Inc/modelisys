"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Company {
  id: string
  name: string
  fiscalYearEnd: string
  currency: string
}

interface IntercoAccount {
  accountNumber: string
  description: string
  linkCode?: string
  summaryEF?: string
  detailEF?: string
  companyId: string // Société source
  intercoCompanyId?: string // Société interco (destination)
}

export default function IntercosPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [intercoAccounts, setIntercoAccounts] = useState<IntercoAccount[]>([])

  // Reload interco accounts
  const reloadIntercoAccounts = () => {
    const savedCompanies = localStorage.getItem("modelisys_companies")
    if (savedCompanies) {
      try {
        const loadedCompanies: Company[] = JSON.parse(savedCompanies)
        setCompanies(loadedCompanies)
        
        const allIntercoAccounts: IntercoAccount[] = []
        loadedCompanies.forEach(company => {
          const savedAccounts = localStorage.getItem(`modelisys_account_mapping_${company.id}`)
          if (savedAccounts) {
            try {
              const accounts: any[] = JSON.parse(savedAccounts)
              accounts.forEach(account => {
                // Only include accounts that have an interco defined
                if (account.interco) {
                  allIntercoAccounts.push({
                    accountNumber: account.accountNumber,
                    description: account.description,
                    linkCode: account.linkCode,
                    summaryEF: account.summaryEF,
                    detailEF: account.detailEF,
                    companyId: company.id,
                    intercoCompanyId: account.interco
                  })
                }
              })
            } catch (e) {
              console.error(`Error loading accounts for company ${company.id}:`, e)
            }
          }
        })
        setIntercoAccounts(allIntercoAccounts)
      } catch (e) {
        console.error("Error loading companies:", e)
      }
    }
  }

  // Load all companies and interco accounts
  useEffect(() => {
    if (typeof window !== "undefined") {
      reloadIntercoAccounts()

      // Listen for storage changes
      const handleStorageChange = () => {
        reloadIntercoAccounts()
      }

      window.addEventListener("storage", handleStorageChange)
      const interval = setInterval(handleStorageChange, 1000)

      return () => {
        window.removeEventListener("storage", handleStorageChange)
        clearInterval(interval)
      }
    }
  }, [])

  // Save interco account changes
  const saveIntercoAccount = (accountNumber: string, currentCompanyId: string, field: "companyId" | "intercoCompanyId", value: string) => {
    if (typeof window !== "undefined") {
      if (field === "intercoCompanyId") {
        // Update interco for the account
        const savedAccounts = localStorage.getItem(`modelisys_account_mapping_${currentCompanyId}`)
        if (savedAccounts) {
          try {
            const accounts: any[] = JSON.parse(savedAccounts)
            const updatedAccounts = accounts.map(acc => {
              if (acc.accountNumber === accountNumber) {
                return { ...acc, interco: value === "none" ? undefined : value }
              }
              return acc
            })
            localStorage.setItem(`modelisys_account_mapping_${currentCompanyId}`, JSON.stringify(updatedAccounts))
            reloadIntercoAccounts()
          } catch (e) {
            console.error("Error saving interco account:", e)
          }
        }
      } else if (field === "companyId") {
        // Move account to another company
        // First, get the account from current company
        const savedAccounts = localStorage.getItem(`modelisys_account_mapping_${currentCompanyId}`)
        if (savedAccounts) {
          try {
            const accounts: any[] = JSON.parse(savedAccounts)
            const accountToMove = accounts.find(acc => acc.accountNumber === accountNumber)
            
            if (accountToMove) {
              // Remove from current company
              const updatedAccounts = accounts.filter(acc => acc.accountNumber !== accountNumber)
              localStorage.setItem(`modelisys_account_mapping_${currentCompanyId}`, JSON.stringify(updatedAccounts))
              
              // Add to new company
              const newCompanyAccounts = localStorage.getItem(`modelisys_account_mapping_${value}`)
              if (newCompanyAccounts) {
                const accounts: any[] = JSON.parse(newCompanyAccounts)
                // Check if account already exists in new company
                const existingIndex = accounts.findIndex(acc => acc.accountNumber === accountNumber)
                if (existingIndex >= 0) {
                  // Update existing account
                  accounts[existingIndex] = { ...accounts[existingIndex], ...accountToMove, interco: accountToMove.interco }
                } else {
                  // Add new account
                  accounts.push(accountToMove)
                }
                localStorage.setItem(`modelisys_account_mapping_${value}`, JSON.stringify(accounts))
              } else {
                // Create new accounts array for the company
                localStorage.setItem(`modelisys_account_mapping_${value}`, JSON.stringify([accountToMove]))
              }
              
              reloadIntercoAccounts()
            }
          } catch (e) {
            console.error("Error moving account:", e)
          }
        }
      }
    }
  }

  // Get company name by ID
  const getCompanyName = (companyId: string): string => {
    const company = companies.find(c => c.id === companyId)
    return company?.name || "Inconnue"
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
                          Configurez des intercos dans le mapping comptable de vos sociétés pour qu'ils apparaissent ici.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    intercoAccounts.map((account, index) => (
                      <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-600 font-mono">{account.accountNumber}</td>
                        <td className="px-6 py-4 text-sm text-slate-900">{account.description}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{account.linkCode || "-"}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{account.summaryEF || "-"}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{account.detailEF || "-"}</td>
                        <td className="px-6 py-4 text-center">
                          <Select
                            value={account.companyId}
                            onValueChange={(value) => saveIntercoAccount(account.accountNumber, account.companyId, "companyId", value)}
                          >
                            <SelectTrigger className="w-40 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {companies.map((comp) => (
                                <SelectItem key={comp.id} value={comp.id}>
                                  {comp.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

