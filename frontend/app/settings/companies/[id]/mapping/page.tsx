"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, ArrowLeft, Plus } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"

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
  interco?: string
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

  // Load company from localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && companyId) {
      const loadCompany = () => {
        const saved = localStorage.getItem("modelisys_companies")
        if (saved) {
          try {
            const companies: Company[] = JSON.parse(saved)
            const foundCompany = companies.find((c) => c.id === companyId)
            if (foundCompany) {
              setCompany(foundCompany)
              // Set all companies except current one
              const otherCompanies = companies.filter((c) => c.id !== companyId)
              setAllCompanies(otherCompanies)
            } else {
              router.push(`/settings/companies/${companyId}`)
            }
          } catch (e) {
            console.error("Error loading company:", e)
            router.push(`/settings/companies/${companyId}`)
          }
        } else {
          router.push(`/settings/companies/${companyId}`)
        }
      }

      const loadAccounts = () => {
        const saved = localStorage.getItem(`modelisys_account_mapping_${companyId}`)
        if (saved) {
          try {
            const loadedAccounts: AccountMapping[] = JSON.parse(saved)
            setAccounts(loadedAccounts)
          } catch (e) {
            console.error("Error loading accounts:", e)
            // Initialize with default accounts
            setAccounts([
              { accountNumber: "1000", description: "Comptes bancaires" },
              { accountNumber: "1200", description: "Comptes clients" },
              { accountNumber: "6000", description: "Revenus de services", product: "Produit 1" },
            ])
          }
        } else {
          // Initialize with default accounts
          setAccounts([
            { accountNumber: "1000", description: "Comptes bancaires" },
            { accountNumber: "1200", description: "Comptes clients" },
            { accountNumber: "6000", description: "Revenus de services", product: "Produit 1" },
          ])
        }
      }

      const loadProducts = () => {
        const saved = localStorage.getItem(`modelisys_products_${companyId}`)
        if (saved) {
          try {
            const loadedProducts: string[] = JSON.parse(saved)
            setProducts(loadedProducts)
          } catch (e) {
            console.error("Error loading products:", e)
            setProducts(["Produit 1", "Produit 2", "Produit 3"])
          }
        } else {
          setProducts(["Produit 1", "Produit 2", "Produit 3"])
        }
      }

      loadCompany()
      loadAccounts()
      loadProducts()

      // Listen for storage changes
      const handleStorageChange = () => {
        loadCompany()
        loadAccounts()
        loadProducts()
        // Reload all companies
        const saved = localStorage.getItem("modelisys_companies")
        if (saved) {
          try {
            const companies: Company[] = JSON.parse(saved)
            setAllCompanies(companies.filter((c) => c.id !== companyId))
          } catch (e) {
            console.error("Error loading companies:", e)
          }
        }
      }

      window.addEventListener("storage", handleStorageChange)
      const interval = setInterval(handleStorageChange, 1000)

      return () => {
        window.removeEventListener("storage", handleStorageChange)
        clearInterval(interval)
      }
    }
  }, [companyId, router])

  // Save accounts to localStorage
  const saveAccounts = (updatedAccounts: AccountMapping[]) => {
    if (typeof window !== "undefined" && companyId) {
      localStorage.setItem(`modelisys_account_mapping_${companyId}`, JSON.stringify(updatedAccounts))
    }
  }

  // Save products to localStorage
  const saveProducts = (updatedProducts: string[]) => {
    if (typeof window !== "undefined" && companyId) {
      localStorage.setItem(`modelisys_products_${companyId}`, JSON.stringify(updatedProducts))
    }
  }

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
  const handleAddProduct = () => {
    if (newProductName.trim() && !products.includes(newProductName.trim())) {
      const updatedProducts = [...products, newProductName.trim()]
      setProducts(updatedProducts)
      saveProducts(updatedProducts)
      setNewProductName("")
      setShowAddProduct(false)
    }
  }

  if (!company) {
    return null
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
                  href={`/settings/companies/${companyId}`}
                  className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <h2 className="text-4xl font-normal text-white mb-2 tracking-tight">{company.name}</h2>
              </div>
              <p className="text-base text-slate-300 mb-6">
                Configuration et paramètres de la société
              </p>
              <p className="text-base text-slate-300 mb-6 leading-relaxed max-w-4xl">
                Gérez les informations de votre société, ses divisions et sous-divisions. Configurez les paramètres 
                comptables et accédez aux différents modules de configuration pour cette entité.
              </p>
              {/* Navigation Menu */}
              <div className="flex items-end gap-8 mb-2">
                <Link
                  href={`/settings/companies/${companyId}`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span className="text-sm font-normal transition-colors text-slate-300 hover:text-white">
                    Information de base
                  </span>
                </Link>
                <div className="relative pb-4 border-b border-slate-600/30">
                  <span className="text-sm font-normal transition-colors text-white">
                    Mapping comptable
                  </span>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 z-10"></div>
                </div>
                <Link
                  href={`/settings/companies/${companyId}/financial-statements-mapping`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span className="text-sm font-normal transition-colors text-slate-300 hover:text-white">
                    Mapping états financiers
                  </span>
                </Link>
                <Link
                  href={`/settings/companies/${companyId}/trial-balance`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span className="text-sm font-normal transition-colors text-slate-300 hover:text-white">
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
                    <th className="px-6 py-4 text-center font-semibold text-slate-900 text-sm">Interco</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="px-8 py-12 text-center text-sm text-slate-500">
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
                              updatedAccounts[index].fdrhc = e.target.checked
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
                              updatedAccounts[index].interests = e.target.checked
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
                              updatedAccounts[index].amortization = e.target.checked
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
                              updatedAccounts[index].variableCosts = e.target.checked
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
                              updatedAccounts[index].fixedCosts = e.target.checked
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

