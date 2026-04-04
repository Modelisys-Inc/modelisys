"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2 } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import {
  getCompany,
  listCompanies,
  listAccountMappings,
  upsertAccountMappings,
  listProducts,
  createProduct,
  type Company as ApiCompany,
  type AccountMappingData,
  type ProductData,
} from "@/lib/api"

interface Company {
  id: string
  name: string
  fiscalYearEnd: string
  currency: string
}

interface AccountMapping {
  accountNumber: string
  description: string
  linkCode?: string
  summaryEF?: string
  detailEF?: string
  divisions?: string
  subDivisions?: string
  fdrhc?: boolean
  interests?: boolean
  amortization?: boolean
  variableCosts?: boolean
  fixedCosts?: boolean
  product?: string
  customer?: string
  supplier?: string
  interco?: string
}

function mapApiCompany(c: ApiCompany): Company {
  return {
    id: c.id,
    name: c.name,
    fiscalYearEnd: c.fiscal_year_end,
    currency: c.currency,
  }
}

function mapApiMapping(m: AccountMappingData): AccountMapping {
  return {
    accountNumber: m.account_number,
    description: m.description,
    linkCode: m.link_code || undefined,
    summaryEF: m.summary_ef || undefined,
    detailEF: m.detail_ef || undefined,
    divisions: m.divisions || undefined,
    subDivisions: m.sub_divisions || undefined,
    fdrhc: m.fdrhc,
    interests: m.interests,
    amortization: m.amortization,
    variableCosts: m.variable_costs,
    fixedCosts: m.fixed_costs,
    product: m.product || undefined,
    customer: m.customer || undefined,
    supplier: m.supplier || undefined,
    interco: m.interco_company_id || undefined,
  }
}

function toApiMappingEntry(m: AccountMapping) {
  return {
    account_number: m.accountNumber,
    description: m.description,
    link_code: m.linkCode || null,
    summary_ef: m.summaryEF || null,
    detail_ef: m.detailEF || null,
    divisions: m.divisions || null,
    sub_divisions: m.subDivisions || null,
    fdrhc: m.fdrhc || false,
    interests: m.interests || false,
    amortization: m.amortization || false,
    variable_costs: m.variableCosts || false,
    fixed_costs: m.fixedCosts || false,
    product: m.product || null,
    customer: m.customer || null,
    supplier: m.supplier || null,
    interco_company_id: m.interco || null,
  }
}

export default function CompanyMappingPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string
  const [company, setCompany] = useState<Company | null>(null)
  const [accounts, setAccounts] = useState<AccountMapping[]>([])
  const [products, setProducts] = useState<string[]>([])
  const [newProductName, setNewProductName] = useState("")
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [allCompanies, setAllCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  // Load all data from API
  useEffect(() => {
    if (companyId) {
      setLoading(true)
      getCompany(companyId)
        .then((companyData) => {
          setCompany(mapApiCompany(companyData))
          return Promise.all([
            listAccountMappings(companyId).catch(() => []),
            listProducts(companyId).catch(() => []),
            listCompanies().catch(() => []),
          ])
        })
        .then(([mappingsData, productsData, companiesData]) => {
          setAccounts(mappingsData.map(mapApiMapping))
          setProducts(productsData.map((p: ProductData) => p.name))
          setAllCompanies(
            companiesData
              .filter((c: ApiCompany) => c.id !== companyId)
              .map(mapApiCompany)
          )
        })
        .catch((e) => {
          console.error("Error loading company:", e)
        })
        .finally(() => setLoading(false))
    }
  }, [companyId, router])

  // Save account mappings to API
  const saveAccounts = useCallback(async (updatedAccounts: AccountMapping[]) => {
    try {
      await upsertAccountMappings(companyId, updatedAccounts.map(toApiMappingEntry))
    } catch (e) {
      console.error("Error saving account mappings:", e)
    }
  }, [companyId])

  // Handle product change for an account
  const handleProductChange = (accountNumber: string, product: string) => {
    const updatedAccounts = accounts.map(acc =>
      acc.accountNumber === accountNumber
        ? { ...acc, product: product === "none" ? undefined : product }
        : acc
    )
    setAccounts(updatedAccounts)
    saveAccounts(updatedAccounts)
  }

  // Handle interco change for an account
  const handleIntercoChange = (accountNumber: string, interco: string) => {
    const updatedAccounts = accounts.map(acc =>
      acc.accountNumber === accountNumber
        ? { ...acc, interco: interco === "none" ? undefined : interco }
        : acc
    )
    setAccounts(updatedAccounts)
    saveAccounts(updatedAccounts)
  }

  // Handle add new product
  const handleAddProduct = async () => {
    if (newProductName.trim() && !products.includes(newProductName.trim())) {
      try {
        await createProduct(companyId, { name: newProductName.trim() })
        setProducts((prev) => [...prev, newProductName.trim()])
        setNewProductName("")
        setShowAddProduct(false)
      } catch (e) {
        console.error("Error creating product:", e)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DashboardHeader title="Modelisys" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
        </div>
      </div>
    )
  }

  if (!company) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />

      {/* Dark Header Section */}
      <div className="relative w-full pt-15 pb-40 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
            <div className="bg-[#2A2F3A]" />
            <div className="bg-[#1F2430]" />
          </div>
          <div className="absolute inset-y-0 left-1/2 hidden lg:block w-px bg-white/5" />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -left-28 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-24 -right-28 h-[480px] w-[480px] rounded-full bg-black/20 blur-3xl" />
          </div>
        </div>
        <div className="relative z-10 max-w-[1920px] mx-auto px-6">
          <div className="flex items-start gap-3 mb-8">
            <div className="w-2"></div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-4xl font-semibold text-[#E6D6C3] mb-2 tracking-tight">{company.name}</h2>
              </div>
              <p className="text-base text-[#C9B8A5]/90 mb-6">
                Configuration et paramètres de la société
              </p>
              <p className="text-base text-[#C9B8A5]/90 mb-6 leading-relaxed max-w-4xl">
                Gérez les informations de votre société, ses divisions et sous-divisions. Configurez les paramètres
                comptables et accédez aux différents modules de configuration pour cette entité.
              </p>
              {/* Navigation Menu */}
              <div className="flex items-end gap-8 mb-2">
                <Link
                  href={`/settings/companies/${companyId}`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span className="text-sm font-normal transition-colors text-slate-200 hover:text-[#E6D6C3]">
                    Information de base
                  </span>
                </Link>
                <div className="relative pb-4 border-b border-slate-600/30">
                  <span className="text-sm font-normal transition-colors text-slate-200 hover:text-[#E6D6C3]">
                    Mapping comptable
                  </span>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E0742D] z-10"></div>
                </div>
                <Link
                  href={`/settings/companies/${companyId}/financial-statements-mapping`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span className="text-sm font-normal transition-colors text-slate-200 hover:text-[#E6D6C3]">
                    Mapping états financiers
                  </span>
                </Link>
                <Link
                  href={`/settings/companies/${companyId}/trial-balance`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span className="text-sm font-normal transition-colors text-slate-200 hover:text-[#E6D6C3]">
                    Balance de vérification
                  </span>
                </Link>
              </div>
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
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">Mapping comptable</h2>
                    <p className="text-sm text-slate-700">
                      Configurez le mapping de vos comptes comptables
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
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Divisions</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Sous-divisions</th>
                    <th className="px-6 py-4 text-center font-semibold text-slate-900 text-sm">FdRHC</th>
                    <th className="px-6 py-4 text-center font-semibold text-slate-900 text-sm">Intérêts</th>
                    <th className="px-6 py-4 text-center font-semibold text-slate-900 text-sm">Amortissement</th>
                    <th className="px-6 py-4 text-center font-semibold text-slate-900 text-sm">Coûts variables</th>
                    <th className="px-6 py-4 text-center font-semibold text-slate-900 text-sm">Coûts fixes</th>
                    <th className="px-6 py-4 text-center font-semibold text-slate-900 text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <span>Produits</span>
                        {!showAddProduct && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAddProduct(true)}
                            className="h-6 w-6 p-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Client</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Fournisseur</th>
                    <th className="px-6 py-4 text-center font-semibold text-slate-900 text-sm">Interco</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.length === 0 ? (
                    <tr>
                      <td colSpan={16} className="px-8 py-12 text-center text-sm text-slate-500">
                        <p>Aucun compte configuré. Importez votre balance de vérification pour commencer.</p>
                      </td>
                    </tr>
                  ) : (
                    accounts.map((account, index) => (
                      <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-600 font-mono">{account.accountNumber}</td>
                        <td className="px-6 py-4 text-sm text-slate-900">{account.description}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{account.linkCode || "-"}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{account.summaryEF || "-"}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{account.detailEF || "-"}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{account.divisions || "-"}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{account.subDivisions || "-"}</td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-emerald-500 rounded border-slate-300"
                            checked={account.fdrhc || false}
                            onChange={(e) => {
                              const updatedAccounts = [...accounts]
                              updatedAccounts[index] = { ...updatedAccounts[index], fdrhc: e.target.checked }
                              setAccounts(updatedAccounts)
                              saveAccounts(updatedAccounts)
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-emerald-500 rounded border-slate-300"
                            checked={account.interests || false}
                            onChange={(e) => {
                              const updatedAccounts = [...accounts]
                              updatedAccounts[index] = { ...updatedAccounts[index], interests: e.target.checked }
                              setAccounts(updatedAccounts)
                              saveAccounts(updatedAccounts)
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-emerald-500 rounded border-slate-300"
                            checked={account.amortization || false}
                            onChange={(e) => {
                              const updatedAccounts = [...accounts]
                              updatedAccounts[index] = { ...updatedAccounts[index], amortization: e.target.checked }
                              setAccounts(updatedAccounts)
                              saveAccounts(updatedAccounts)
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-emerald-500 rounded border-slate-300"
                            checked={account.variableCosts || false}
                            onChange={(e) => {
                              const updatedAccounts = [...accounts]
                              updatedAccounts[index] = { ...updatedAccounts[index], variableCosts: e.target.checked }
                              setAccounts(updatedAccounts)
                              saveAccounts(updatedAccounts)
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-emerald-500 rounded border-slate-300"
                            checked={account.fixedCosts || false}
                            onChange={(e) => {
                              const updatedAccounts = [...accounts]
                              updatedAccounts[index] = { ...updatedAccounts[index], fixedCosts: e.target.checked }
                              setAccounts(updatedAccounts)
                              saveAccounts(updatedAccounts)
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Select
                            value={account.product || "none"}
                            onValueChange={(value) => handleProductChange(account.accountNumber, value)}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue placeholder="Aucun" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Aucun</SelectItem>
                              {products.map((product) => (
                                <SelectItem key={product} value={product}>
                                  {product}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-6 py-4">
                          <Input
                            className="w-28 h-8 text-xs"
                            value={account.customer || ""}
                            placeholder="-"
                            onChange={(e) => {
                              const updatedAccounts = [...accounts]
                              updatedAccounts[index] = { ...updatedAccounts[index], customer: e.target.value || undefined }
                              setAccounts(updatedAccounts)
                            }}
                            onBlur={() => saveAccounts(accounts)}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <Input
                            className="w-28 h-8 text-xs"
                            value={account.supplier || ""}
                            placeholder="-"
                            onChange={(e) => {
                              const updatedAccounts = [...accounts]
                              updatedAccounts[index] = { ...updatedAccounts[index], supplier: e.target.value || undefined }
                              setAccounts(updatedAccounts)
                            }}
                            onBlur={() => saveAccounts(accounts)}
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Select
                            value={account.interco || "none"}
                            onValueChange={(value) => handleIntercoChange(account.accountNumber, value)}
                          >
                            <SelectTrigger className="w-40 h-8 text-xs" disabled={allCompanies.length === 0}>
                              <SelectValue placeholder={allCompanies.length === 0 ? "Aucune société" : "Aucune"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Aucune</SelectItem>
                              {allCompanies.map((comp) => (
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
                  {showAddProduct && (
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <td colSpan={13} className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <Input
                            value={newProductName}
                            onChange={(e) => setNewProductName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleAddProduct()
                              } else if (e.key === "Escape") {
                                setShowAddProduct(false)
                                setNewProductName("")
                              }
                            }}
                            placeholder="Nom du nouveau produit"
                            className="h-8"
                            autoFocus
                          />
                          <Button
                            onClick={handleAddProduct}
                            disabled={!newProductName.trim() || products.includes(newProductName.trim())}
                            size="sm"
                            className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white"
                          >
                            Ajouter
                          </Button>
                          <Button
                            onClick={() => {
                              setShowAddProduct(false)
                              setNewProductName("")
                            }}
                            size="sm"
                            variant="outline"
                            className="h-8"
                          >
                            Annuler
                          </Button>
                        </div>
                      </td>
                    </tr>
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
