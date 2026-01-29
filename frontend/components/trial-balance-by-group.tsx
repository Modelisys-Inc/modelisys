"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, FileText, X, ChevronDown, ChevronRight, Folder, File, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface Document {
  id: string
  name: string
  uploadDate: string
  size: number
  type: string
}

interface GLAccount {
  accountNumber: string
  accountName: string
  documents: Document[]
}

interface AccountCategory {
  id: string
  code: string
  name: string
  accounts: GLAccount[]
}

interface AccountGroup {
  id: string
  name: string
  category: string
  categories: AccountCategory[]
}

const accountGroups: AccountGroup[] = [
  {
    id: "actif-court-terme",
    name: "Actif - Court terme",
    category: "Actif",
    categories: [
      {
        id: "encaisse",
        code: "A",
        name: "Encaisse",
        accounts: [
          {
            accountNumber: "1000",
            accountName: "Comptes bancaires yeti",
            documents: [],
          },
          {
            accountNumber: "1001",
            accountName: "Comptes bancaires teo",
            documents: [],
          },
          {
            accountNumber: "1010",
            accountName: "Caisse",
            documents: [],
          },
        ],
      },
      {
        id: "comptes-clients",
        code: "B",
        name: "Comptes clients",
        accounts: [
          {
            accountNumber: "1200",
            accountName: "Clients - Comptes à recevoir",
            documents: [],
          },
          {
            accountNumber: "1210",
            accountName: "Clients - Factures à recevoir",
            documents: [],
          },
        ],
      },
      {
        id: "stocks",
        code: "C",
        name: "Stocks",
        accounts: [
          {
            accountNumber: "1300",
            accountName: "Stocks - Matières premières",
            documents: [],
          },
          {
            accountNumber: "1310",
            accountName: "Stocks - Produits finis",
            documents: [],
          },
        ],
      },
      {
        id: "frais-payes-avance",
        code: "D",
        name: "Frais payés d'avance",
        accounts: [
          {
            accountNumber: "1400",
            accountName: "Frais payés d'avance",
            documents: [],
          },
        ],
      },
    ],
  },
  {
    id: "actif-long-terme",
    name: "Actif - Long terme",
    category: "Actif",
    categories: [
      {
        id: "immobilisations",
        code: "E",
        name: "Immobilisations",
        accounts: [
          {
            accountNumber: "2000",
            accountName: "Terrains",
            documents: [],
          },
          {
            accountNumber: "2010",
            accountName: "Constructions",
            documents: [],
          },
          {
            accountNumber: "2100",
            accountName: "Machinerie",
            documents: [],
          },
          {
            accountNumber: "2200",
            accountName: "Véhicules",
            documents: [],
          },
        ],
      },
    ],
  },
  {
    id: "passif-court-terme",
    name: "Passif - Court terme",
    category: "Passif",
    categories: [
      {
        id: "comptes-fournisseurs",
        code: "F",
        name: "Comptes fournisseurs",
        accounts: [
          {
            accountNumber: "3000",
            accountName: "Fournisseurs - Comptes à payer",
            documents: [],
          },
        ],
      },
      {
        id: "dettes",
        code: "G",
        name: "Dettes",
        accounts: [
          {
            accountNumber: "3100",
            accountName: "Dettes fiscales",
            documents: [],
          },
          {
            accountNumber: "3200",
            accountName: "Dettes sociales",
            documents: [],
          },
        ],
      },
    ],
  },
  {
    id: "passif-long-terme",
    name: "Passif - Long terme",
    category: "Passif",
    categories: [
      {
        id: "dettes-long-terme",
        code: "H",
        name: "Dettes long terme",
        accounts: [
          {
            accountNumber: "4000",
            accountName: "Emprunts bancaires",
            documents: [],
          },
        ],
      },
    ],
  },
  {
    id: "capitaux-propres",
    name: "Capitaux propres",
    category: "Capitaux propres",
    categories: [
      {
        id: "capital",
        code: "I",
        name: "Capital",
        accounts: [
          {
            accountNumber: "5000",
            accountName: "Capital social",
            documents: [],
          },
        ],
      },
      {
        id: "reserves",
        code: "J",
        name: "Réserves",
        accounts: [
          {
            accountNumber: "5100",
            accountName: "Bénéfices non répartis",
            documents: [],
          },
        ],
      },
    ],
  },
  {
    id: "revenus",
    name: "Revenus",
    category: "Revenus",
    categories: [
      {
        id: "revenus",
        code: "K",
        name: "Revenus",
        accounts: [
          {
            accountNumber: "6000",
            accountName: "Revenus de services",
            documents: [],
          },
          {
            accountNumber: "6010",
            accountName: "Revenus de consultation",
            documents: [],
          },
          {
            accountNumber: "6100",
            accountName: "Revenus de vente de produits",
            documents: [],
          },
        ],
      },
    ],
  },
  {
    id: "depenses",
    name: "Dépenses",
    category: "Dépenses",
    categories: [
      {
        id: "depenses",
        code: "L",
        name: "Dépenses",
        accounts: [
          {
            accountNumber: "7000",
            accountName: "Salaires",
            documents: [],
          },
          {
            accountNumber: "7100",
            accountName: "Loyers",
            documents: [],
          },
          {
            accountNumber: "7200",
            accountName: "Services publics",
            documents: [],
          },
        ],
      },
    ],
  },
]

interface TrialBalanceByGroupProps {
  title?: string
  description?: string
}

export function TrialBalanceByGroup({ 
  title,
  description,
}: TrialBalanceByGroupProps = {}) {
  const displayTitle = title || "Balance de vérification par groupe"
  const displayDescription = description || "Déposez vos documents comptables par compte GL pour faciliter la clôture annuelle avec votre cabinet."
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())
  const [accountsData, setAccountsData] = useState<AccountGroup[]>(accountGroups)

  const toggleGroup = (groupId: string) => {
    const newSet = new Set(expandedGroups)
    if (newSet.has(groupId)) {
      newSet.delete(groupId)
    } else {
      newSet.add(groupId)
    }
    setExpandedGroups(newSet)
  }

  const toggleCategory = (categoryKey: string) => {
    const newSet = new Set(expandedCategories)
    if (newSet.has(categoryKey)) {
      newSet.delete(categoryKey)
    } else {
      newSet.add(categoryKey)
    }
    setExpandedCategories(newSet)
  }

  const toggleAccount = (accountKey: string) => {
    const newSet = new Set(expandedAccounts)
    if (newSet.has(accountKey)) {
      newSet.delete(accountKey)
    } else {
      newSet.add(accountKey)
    }
    setExpandedAccounts(newSet)
  }

  const handleFileUpload = (groupId: string, categoryId: string, accountNumber: string, file: File) => {
    const newDocument: Document = {
      id: Date.now().toString(),
      name: file.name,
      uploadDate: new Date().toLocaleDateString('fr-FR'),
      size: file.size,
      type: file.type,
    }

    setAccountsData(prev => prev.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          categories: group.categories.map(category => {
            if (category.id === categoryId) {
              return {
                ...category,
                accounts: category.accounts.map(account => {
                  if (account.accountNumber === accountNumber) {
                    return {
                      ...account,
                      documents: [...account.documents, newDocument],
                    }
                  }
                  return account
                }),
              }
            }
            return category
          }),
        }
      }
      return group
    }))

    setUploadingAccount(null)
  }

  const deleteDocument = (groupId: string, categoryId: string, accountNumber: string, documentId: string) => {
    setAccountsData(prev => prev.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          categories: group.categories.map(category => {
            if (category.id === categoryId) {
              return {
                ...category,
                accounts: category.accounts.map(account => {
                  if (account.accountNumber === accountNumber) {
                    return {
                      ...account,
                      documents: account.documents.filter(doc => doc.id !== documentId),
                    }
                  }
                  return account
                }),
              }
            }
            return category
          }),
        }
      }
      return group
    }))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
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
        {accountsData.map((group) => {
        const isGroupExpanded = expandedGroups.has(group.id)
        const totalAccounts = group.categories.reduce((sum, cat) => sum + cat.accounts.length, 0)

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
                  {totalAccounts} compte{totalAccounts > 1 ? "s" : ""}
                </span>
              </div>
            </CardHeader>

            {isGroupExpanded && (
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {group.categories.map((category) => {
                    const categoryKey = `${group.id}-${category.id}`
                    const isCategoryExpanded = expandedCategories.has(categoryKey)

                    return (
                      <div key={category.id} className="border-l-2 border-slate-300 pl-4 space-y-2">
                        <div
                          className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                          onClick={() => toggleCategory(categoryKey)}
                        >
                          <div className="flex items-center gap-2">
                            {isCategoryExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-600" />
                            )}
                            <h4 className="font-semibold text-slate-900">
                              {category.code} {category.name}
                            </h4>
                            <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                              {category.accounts.length} compte{category.accounts.length > 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>

                        {isCategoryExpanded && (
                          <div className="ml-6 space-y-2">
                            {category.accounts.map((account) => {
                              const accountKey = `${group.id}-${category.id}-${account.accountNumber}`
                              const isAccountExpanded = expandedAccounts.has(accountKey)
                              const hasDocuments = account.documents.length > 0

                              return (
                                <div key={account.accountNumber} className="space-y-2">
                                  <div
                                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                    onClick={() => toggleAccount(accountKey)}
                                  >
                                    <div className="flex items-center gap-3">
                                      {isAccountExpanded ? (
                                        <ChevronDown className="w-4 h-4 text-slate-600" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-slate-600" />
                                      )}
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono text-sm font-semibold text-slate-900">
                                            {account.accountNumber}
                                          </span>
                                          <span className="text-sm text-slate-700">
                                            {account.accountName}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {hasDocuments && (
                                        <span className="text-xs text-slate-500 bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                          {account.documents.length} document{account.documents.length > 1 ? "s" : ""}
                                        </span>
                                      )}
                                      <FileText className={cn(
                                        "w-4 h-4",
                                        hasDocuments ? "text-blue-600" : "text-slate-400"
                                      )} />
                                    </div>
                                  </div>

                                  {isAccountExpanded && (
                                    <div className="ml-8 space-y-3 p-4 bg-white border border-slate-200 rounded-lg">
                                      {/* Upload Section */}
                                      <div className="flex items-center gap-2">
                                        <label className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer text-sm font-medium">
                                          <Upload className="w-4 h-4" />
                                          Déposer un document
                                          <input
                                            type="file"
                                            className="hidden"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0]
                                              if (file) {
                                                handleFileUpload(group.id, category.id, account.accountNumber, file)
                                              }
                                            }}
                                          />
                                        </label>
                                      </div>

                                      {/* Documents List */}
                                      {account.documents.length > 0 ? (
                                        <div className="space-y-2">
                                          <h5 className="text-sm font-semibold text-slate-700 mb-2">
                                            Documents déposés ({account.documents.length})
                                          </h5>
                                          {account.documents.map((doc) => (
                                            <div
                                              key={doc.id}
                                              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                                            >
                                              <div className="flex items-center gap-3">
                                                <File className="w-4 h-4 text-slate-600" />
                                                <div>
                                                  <p className="text-sm font-medium text-slate-900">{doc.name}</p>
                                                  <p className="text-xs text-slate-500">
                                                    {doc.uploadDate} • {formatFileSize(doc.size)}
                                                  </p>
                                                </div>
                                              </div>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => deleteDocument(group.id, category.id, account.accountNumber, doc.id)}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                              >
                                                <X className="w-4 h-4" />
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-center py-6 text-slate-500 text-sm">
                                          <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                          <p>Aucun document déposé</p>
                                          <p className="text-xs mt-1">
                                            Déposez vos documents pour faciliter la clôture annuelle
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
      </div>
    </div>
  )
}

