"use client"

import { useState } from "react"
import { ProductMarginChart, type ProductType } from "@/components/product-margin-chart"
import { ProductMarginAnalysis } from "@/components/product-margin-analysis"
import { Filter, Calendar } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector, Company } from "@/components/entity-selector"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname } from "next/navigation"

type Period = "monthly" | "quarterly" | "annual"
type View = "current" | "comparison" | "ytd" | "ddm" | "12months" | "24months" | "quarters" | "years"
type ColumnMode = "variations" | "percentage" | "comparison"

// Données d'exemple pour les sociétés, divisions et sous-divisions
const companiesData: Company[] = [
  {
    id: "company-1",
    name: "Modelisys Inc.",
    divisions: [
      {
        id: "div-1",
        name: "Division Technologie",
        subDivisions: [
          { id: "sub-1", name: "Développement Logiciel" },
          { id: "sub-2", name: "Infrastructure IT" },
          { id: "sub-3", name: "Support Technique" },
        ],
      },
      {
        id: "div-2",
        name: "Division Conseil",
        subDivisions: [
          { id: "sub-4", name: "Conseil Stratégique" },
          { id: "sub-5", name: "Conseil Opérationnel" },
        ],
      },
      {
        id: "div-3",
        name: "Division Ventes",
        subDivisions: [
          { id: "sub-6", name: "Ventes B2B" },
          { id: "sub-7", name: "Ventes B2C" },
        ],
      },
    ],
  },
  {
    id: "company-2",
    name: "TechSolutions SA",
    divisions: [
      {
        id: "div-4",
        name: "Division Produits",
        subDivisions: [
          { id: "sub-8", name: "Produits Cloud" },
          { id: "sub-9", name: "Produits On-Premise" },
        ],
      },
      {
        id: "div-5",
        name: "Division Services",
        subDivisions: [
          { id: "sub-10", name: "Services Professionnels" },
          { id: "sub-11", name: "Services Gérés" },
        ],
      },
    ],
  },
  {
    id: "company-3",
    name: "InnovateCorp",
    divisions: [
      {
        id: "div-6",
        name: "Division R&D",
        subDivisions: [
          { id: "sub-12", name: "Recherche" },
          { id: "sub-13", name: "Développement" },
        ],
      },
    ],
  },
]

export default function ProductMarginPage() {
  const [period, setPeriod] = useState<Period>("monthly")
  const [view, setView] = useState<View>("comparison")
  const [columnMode, setColumnMode] = useState<ColumnMode>("variations")
  const [selectedProduct, setSelectedProduct] = useState<ProductType>("total")
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null)
  const [selectedSubDivisionId, setSelectedSubDivisionId] = useState<string | null>(null)

  // Fonction pour obtenir la valeur actuelle du sélecteur Horizon
  const getCurrentHorizon = (): string => {
    if (view === "comparison" && period === "monthly") return "courant"
    if (view === "comparison" && period === "quarterly") return "trimestriel"
    if (view === "comparison" && period === "annual") return "annuel"
    if (view === "ytd") return "ytd"
    if (view === "ddm") return "ddm"
    if (view === "12months") return "12mois"
    if (view === "24months") return "24mois"
    if (view === "quarters") return "trimestres"
    if (view === "years") return "annees"
    return "courant"
  }

  // Fonction pour mettre à jour period et view selon la sélection Horizon
  const handleHorizonChange = (value: string) => {
    switch (value) {
      case "courant":
        setPeriod("monthly")
        setView("comparison")
        setColumnMode("variations")
        break
      case "trimestriel":
        setPeriod("quarterly")
        setView("comparison")
        setColumnMode("variations")
        break
      case "annuel":
        setPeriod("annual")
        setView("comparison")
        setColumnMode("variations")
        break
      case "ytd":
        setView("ytd")
        break
      case "ddm":
        setView("ddm")
        break
      case "12mois":
        setView("12months")
        setColumnMode("variations")
        break
      case "24mois":
        setView("24months")
        setColumnMode("variations")
        break
      case "trimestres":
        setView("quarters")
        setColumnMode("variations")
        break
      case "annees":
        setView("years")
        setColumnMode("variations")
        break
      default:
        setPeriod("monthly")
        setView("comparison")
    }
  }

  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />
      
      {/* Dark Header Section */}
      <div className="w-full bg-slate-900 pt-15 pb-32">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="flex items-start mb-4">
            {/* Espace équivalent au bouton menu du header pour l'alignement */}
            <div className="w-2 flex-shrink-0"></div>
            <div className="flex-1">
              <h2 className="text-4xl font-normal text-white mb-2 tracking-tight">Marge par produits</h2>
              <p className="text-base text-slate-300 mb-6">
                Analysez les revenus, charges, bénéfice brut et marge brute par produit pour identifier vos produits les plus performants
              </p>
              {/* Navigation Menu */}
              <div className="flex items-end gap-8 mb-2">
                <Link
                  href="/analysis/working-capital"
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span
                    className={`text-sm font-normal transition-colors ${
                      pathname === "/analysis/working-capital"
                        ? "text-white"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Fonds de roulement
                  </span>
                  {pathname === "/analysis/working-capital" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 z-10"></div>
                  )}
                </Link>
                <Link
                  href="/analysis/capex"
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span
                    className={`text-sm font-normal transition-colors ${
                      pathname === "/analysis/capex"
                        ? "text-white"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Capex
                  </span>
                  {pathname === "/analysis/capex" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 z-10"></div>
                  )}
                </Link>
                <Link
                  href="/analysis/product-margin"
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span
                    className={`text-sm font-normal transition-colors ${
                      pathname === "/analysis/product-margin"
                        ? "text-white"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Marge par produits
                  </span>
                  {pathname === "/analysis/product-margin" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 z-10"></div>
                  )}
                </Link>
                <Link
                  href="/analysis/ratios"
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span
                    className={`text-sm font-normal transition-colors ${
                      pathname === "/analysis/ratios"
                        ? "text-white"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Ratios
                  </span>
                  {pathname === "/analysis/ratios" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 z-10"></div>
                  )}
                </Link>
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="mb-6 p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Filter Icon */}
              <div className="flex items-center gap-2 text-slate-300">
                <Filter className="w-4 h-4" />
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-slate-700" />

              {/* Horizon Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300 whitespace-nowrap">Horizon:</span>
                <Select value={getCurrentHorizon()} onValueChange={handleHorizonChange}>
                  <SelectTrigger className="h-8 w-[140px] bg-slate-800/50 border-slate-700 text-slate-300 text-xs hover:bg-slate-700/50">
                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="courant">Courant</SelectItem>
                    <SelectItem value="trimestriel">Trimestriel</SelectItem>
                    <SelectItem value="annuel">Annuel</SelectItem>
                    <SelectItem value="ytd">YTD</SelectItem>
                    <SelectItem value="ddm">DDM</SelectItem>
                    <SelectItem value="12mois">12 mois</SelectItem>
                    <SelectItem value="24mois">24 mois</SelectItem>
                    <SelectItem value="trimestres">Trimestres</SelectItem>
                    <SelectItem value="annees">Années</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-slate-700" />

              {/* Display Mode Buttons */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300 whitespace-nowrap">Affichage:</span>
                <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800/50 p-1">
                  <Button
                    variant="ghost"
                    onClick={() => setColumnMode("variations")}
                    disabled={getCurrentHorizon() === "12mois" || getCurrentHorizon() === "24mois" || getCurrentHorizon() === "trimestres" || getCurrentHorizon() === "annees"}
                    className={`h-8 text-xs px-3 transition-all ${
                      columnMode === "variations"
                        ? "bg-emerald-500 text-white font-medium shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                    } disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-300`}
                  >
                    Variations
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setColumnMode("percentage")}
                    disabled={getCurrentHorizon() === "12mois" || getCurrentHorizon() === "24mois" || getCurrentHorizon() === "trimestres" || getCurrentHorizon() === "annees"}
                    className={`h-8 text-xs px-3 transition-all ${
                      columnMode === "percentage"
                        ? "bg-emerald-500 text-white font-medium shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                    } disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-300`}
                  >
                    % revenus
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setColumnMode("comparison")}
                    disabled={getCurrentHorizon() === "12mois" || getCurrentHorizon() === "24mois" || getCurrentHorizon() === "trimestres" || getCurrentHorizon() === "annees"}
                    className={`h-8 text-xs px-3 transition-all ${
                      columnMode === "comparison"
                        ? "bg-emerald-500 text-white font-medium shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                    } disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-300`}
                  >
                    Comparaison
                  </Button>
                </div>
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-slate-700" />

              {/* Product Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300 whitespace-nowrap">Produit:</span>
                <Select value={selectedProduct} onValueChange={(value) => setSelectedProduct(value as ProductType)}>
                  <SelectTrigger className="h-8 w-[160px] bg-slate-800/50 border-slate-700 text-slate-300 text-xs hover:bg-slate-700/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total">Tous les produits</SelectItem>
                    <SelectItem value="product_a">Produit A</SelectItem>
                    <SelectItem value="product_b">Produit B</SelectItem>
                    <SelectItem value="service_c">Service C</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-slate-700" />

              {/* Entity Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300 whitespace-nowrap">Entité:</span>
                <EntitySelector
                  companies={companiesData}
                  selectedCompanyId={selectedCompanyId}
                  selectedDivisionId={selectedDivisionId}
                  selectedSubDivisionId={selectedSubDivisionId}
                  onCompanyChange={setSelectedCompanyId}
                  onDivisionChange={setSelectedDivisionId}
                  onSubDivisionChange={setSelectedSubDivisionId}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="w-full py-8 px-6 max-w-[1920px] mx-auto">
        {/* Chart Section - Overlaps dark section */}
        <div className="relative -mt-32 mb-8">
          <ProductMarginChart
            period={period}
            view={view}
            selectedProduct={selectedProduct}
            companyId={selectedCompanyId}
            divisionId={selectedDivisionId}
            subDivisionId={selectedSubDivisionId}
            companies={companiesData}
          />
        </div>
      </main>

      {/* Dark Section between Chart and Detail */}
      <div className="w-full bg-slate-900 pt-12 pb-32">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="flex items-start gap-3">
            <div className="w-2 flex-shrink-0"></div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-normal text-white mb-3">Documentation comptable continue</h3>
                  <p className="text-base text-slate-300 leading-relaxed max-w-4xl">
                    Documentez les variations importantes tout au long de l'exercice pour faciliter votre clôture comptable annuelle et optimiser les processus d'évaluation d'entreprise et de transactions stratégiques.
                  </p>
                </div>
                <div className="flex items-center gap-4 ml-8">
                  <div className="text-right">
                    <div className="text-sm text-slate-400 mb-1">Notes documentées</div>
                    <div className="text-3xl font-semibold text-white">8</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Section - Overlaps dark section */}
      <div className="w-full py-8 px-6 max-w-[1920px] mx-auto">
        <div className="relative -mt-32">
          <ProductMarginAnalysis
            period={period}
            view={view}
            columnMode={columnMode}
            selectedProduct={selectedProduct}
            companyId={selectedCompanyId}
            divisionId={selectedDivisionId}
            subDivisionId={selectedSubDivisionId}
            companies={companiesData}
          />
        </div>
      </div>
    </div>
  )
}
