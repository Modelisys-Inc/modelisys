"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, ChevronDown, ChevronRight, Folder, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { getTrialBalance, type TrialBalanceAccount } from "@/lib/api"

interface GLAccount {
  accountNumber: string
  accountName: string
}

interface AccountGroup {
  id: string
  name: string
  accounts: GLAccount[]
}

// Group accounts by first digit of account_number
const GROUP_CONFIG: Record<string, { id: string; name: string }> = {
  "1": { id: "actif-court-terme", name: "Actif - Court terme" },
  "2": { id: "actif-long-terme", name: "Actif - Long terme" },
  "3": { id: "passif-court-terme", name: "Passif - Court terme" },
  "4": { id: "passif-long-terme", name: "Passif - Long terme" },
  "5": { id: "capitaux-propres", name: "Capitaux propres" },
  "6": { id: "revenus", name: "Revenus" },
  "7": { id: "depenses", name: "Dépenses" },
  "8": { id: "autres-depenses", name: "Autres dépenses" },
  "9": { id: "hors-bilan", name: "Hors bilan" },
}

function buildGroups(accounts: TrialBalanceAccount[]): AccountGroup[] {
  const grouped: Record<string, GLAccount[]> = {}

  for (const acct of accounts) {
    const firstDigit = acct.account_number.charAt(0)
    if (!grouped[firstDigit]) grouped[firstDigit] = []
    grouped[firstDigit].push({
      accountNumber: acct.account_number,
      accountName: acct.description,
    })
  }

  // Sort groups by first digit and build
  return Object.keys(grouped)
    .sort()
    .map((digit) => {
      const config = GROUP_CONFIG[digit] || { id: `group-${digit}`, name: `Groupe ${digit}` }
      return {
        id: config.id,
        name: config.name,
        accounts: grouped[digit].sort((a, b) => a.accountNumber.localeCompare(b.accountNumber)),
      }
    })
}

interface TrialBalanceByGroupProps {
  title?: string
  description?: string
  companyId?: string | null
}

export function TrialBalanceByGroup({
  title,
  description,
  companyId,
}: TrialBalanceByGroupProps) {
  const displayTitle = title || "Balance de vérification par groupe"
  const displayDescription = description || "Déposez vos documents comptables par compte GL pour faciliter la clôture annuelle avec votre cabinet."
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [apiAccounts, setApiAccounts] = useState<TrialBalanceAccount[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch accounts from API
  useEffect(() => {
    if (!companyId) {
      setApiAccounts([])
      return
    }

    let cancelled = false
    setLoading(true)

    getTrialBalance(companyId)
      .then((data) => {
        if (!cancelled) {
          setApiAccounts(data.accounts || [])
        }
      })
      .catch(() => {
        if (!cancelled) setApiAccounts([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [companyId])

  const accountGroups = useMemo(() => buildGroups(apiAccounts), [apiAccounts])

  const toggleGroup = (groupId: string) => {
    const newSet = new Set(expandedGroups)
    if (newSet.has(groupId)) {
      newSet.delete(groupId)
    } else {
      newSet.add(groupId)
    }
    setExpandedGroups(newSet)
  }


  return (
    <div className="w-full bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
      {/* Header */}
      <div className="bg-white px-8 py-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">{displayTitle}</h2>
            <p className="text-sm text-slate-600">
              {displayDescription}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            <span className="ml-3 text-slate-500">Chargement des comptes...</span>
          </div>
        ) : !companyId ? (
          <div className="text-center py-12 text-slate-500">
            <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">Sélectionnez une entreprise</p>
            <p className="text-sm mt-1">Choisissez une entreprise pour voir les comptes de la balance de vérification</p>
          </div>
        ) : accountGroups.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">Aucun compte trouvé</p>
            <p className="text-sm mt-1">Importez une balance de vérification dans les paramètres pour voir les comptes</p>
          </div>
        ) : (
          accountGroups.map((group) => {
            const isGroupExpanded = expandedGroups.has(group.id)

            return (
              <Card key={group.id} className="border-slate-200 shadow-sm">
                <CardHeader
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleGroup(group.id)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      {isGroupExpanded ? (
                        <ChevronDown className="w-5 h-5 text-slate-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                      )}
                      <Folder className="w-5 h-5 text-slate-600" />
                      {group.name}
                    </CardTitle>
                    <span className="text-sm text-slate-500">
                      {group.accounts.length} compte{group.accounts.length > 1 ? "s" : ""}
                    </span>
                  </div>
                </CardHeader>

                {isGroupExpanded && (
                  <CardContent className="pt-0">
                    <div className="space-y-1 ml-4">
                      {group.accounts.map((account) => (
                        <div
                          key={account.accountNumber}
                          className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                        >
                          <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="font-mono text-sm font-semibold text-slate-900">
                            {account.accountNumber}
                          </span>
                          <span className="text-sm text-slate-700">{account.accountName}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
