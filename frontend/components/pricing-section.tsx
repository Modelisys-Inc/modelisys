"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, HelpCircle, X, Check, TrendingUp, Clock, DollarSign, Shield, Zap, AlertCircle, CheckCircle2, TrendingDown } from "lucide-react"

// Configuration des modules souhaitées (fonctionnalités)
const additionalModules = [
  {
    id: "fonds-roulement-capex",
    label: "Analyse du Fonds de Roulement et des Capex",
    description: "Suivez recevables, payables, inventaire, cycles de conversion et trésorerie. Identifiez instantanément les opportunités d'optimisation à travers toute l'organisation.",
    price: 25,
  },
  {
    id: "previsions-budgets",
    label: "Prévisions Financières et Budgets",
    description: "Créez des budgets annuels ou des projections multi-années. Simulez des scénarios, anticipez les écarts, ajustez votre trajectoire.",
    price: 50,
  },
  {
    id: "analyse-approfondie",
    label: "Analyse Financière Approfondie",
    description: "Marges par produit, analyse de concentration clients et fournisseurs, saisonnalité, ratios financiers, dashboards KPI personnalisés.",
    price: 25,
  },
  {
    id: "valorisation-diagnostic",
    label: "Valorisation et Diagnostic d'Entreprise",
    description: "Suivez l'évolution de la valeur de votre entreprise. Identifiez les facteurs qui influencent votre valorisation, analysez les leviers de valeur et optimisez votre multiple.",
    price: 50,
  },
  {
    id: "portail-comptable",
    label: "Portail Comptable et Consultant",
    description: "Les PME peuvent partager l'accès à leur portail avec leur comptable ou consultant. Accès en temps réel à toutes les analyses pour un conseil optimisé.",
    price: 25,
  },
]

// Fonction pour calculer le multiplicateur selon les revenus
// Entre 1M$ et 19M$ : aucun multiplicateur (1.0)
// À partir de 20M$ : un multiplicateur de 10% s'applique à chaque tranche de 10M$
// 20M$ = 10% (1.1), 30M$ = 20% (1.2), 40M$ = 30% (1.3), 50M$ = 40% (1.4), etc.
const calculateRevenueMultiplier = (revenue: number): number => {
  if (revenue < 20) return 1.0
  // Calculer le nombre de tranches complètes de 10M$ au-dessus de 20M$
  // Exemple : 20M$ = 0 tranches, 30M$ = 1 tranche, 40M$ = 2 tranches, etc.
  const tranches = Math.floor((revenue - 20) / 10)
  // Multiplicateur = 1.0 + (nombre de tranches + 1) * 0.1
  // +1 car la première tranche (20-30M$) donne déjà 10%
  return 1.0 + (tranches + 1) * 0.1
}

// Fonction pour calculer le multiplicateur selon le nombre de sociétés
// Chaque société supplémentaire ajoute 15% au tarif mensuel
const calculateCompanyMultiplier = (companies: number): number => {
  if (companies <= 1) return 1.0
  // Formule : 1 + (nombre de sociétés - 1) × 0.15
  return 1 + (companies - 1) * 0.15
}

// Fonction pour calculer les frais d'intégration ponctuels
const calculateIntegrationFee = (companies: number, modulesCount: number): number => {
  const hourlyRate = 200 // $/h
  const hoursPerCompany = 25 // heures par société/division (module inclus)
  const hoursPerModule = 5 // heures par module souhaité (fixe, pas multiplié par sociétés)
  
  // Calcul : (nombre de sociétés × 25h × 200$/h) + (nombre de modules souhaités × 5h × 200$/h)
  const companyIntegrationCost = companies * hoursPerCompany * hourlyRate
  const modulesIntegrationCost = modulesCount * hoursPerModule * hourlyRate
  
  return companyIntegrationCost + modulesIntegrationCost
}

export function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [revenue, setRevenue] = useState(5) // En millions
  const [companies, setCompanies] = useState(1)
  const [includedModule, setIncludedModule] = useState<string>("manual") // Toujours activé
  const [selectedModules, setSelectedModules] = useState<string[]>(additionalModules.map(m => m.id))
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
  })

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -100px 0px",
      },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current)
      }
    }
  }, [])

  // Calcul du prix total
  // Si aucun module n'est sélectionné, le prix est de 0$
  const includedModulePrice = includedModule === "manual" ? 500 : 0
  const baseModulesPrice = selectedModules.reduce(
    (sum, id) => sum + (additionalModules.find((m) => m.id === id)?.price || 0),
    0,
  )

  let totalPrice = 0
  let minPrice = 0
  let maxPrice = 0
  let minIntegrationFee = 0
  let maxIntegrationFee = 0

  // Si au moins un module est sélectionné (inclus ou souhaité), calculer le prix
  if (selectedModules.length > 0 || includedModule === "manual") {
    const revenueMultiplier = calculateRevenueMultiplier(revenue)
    const companyMultiplier = calculateCompanyMultiplier(companies)
    // Prix = ((module inclus + somme des modules souhaités) * multiplicateur revenus * multiplicateur sociétés)
    const totalModulesPrice = includedModulePrice + baseModulesPrice
    totalPrice = Math.round(totalModulesPrice * revenueMultiplier * companyMultiplier)
    minPrice = Math.round(totalPrice * 0.8)
    maxPrice = Math.round(totalPrice * 1.2)
    
    // Calcul des frais d'intégration ponctuels avec fourchette de ±20%
    // Le module inclus nécessite 25h × 200$/h par société
    // Chaque module souhaité ajoute 5h × 200$/h (fixe, pas multiplié par sociétés)
    const baseIntegrationFee = calculateIntegrationFee(companies, selectedModules.length)
    minIntegrationFee = Math.round(baseIntegrationFee * 0.8)
    maxIntegrationFee = Math.round(baseIntegrationFee * 1.2)
  }

  const toggleModule = (id: string) => {
    setSelectedModules((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]))
  }


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement form submission to backend
    alert("Merci pour votre demande ! Nous vous contacterons sous peu.")
    setShowForm(false)
    setFormData({ name: "", email: "", phone: "", company: "" })
  }

  return (
    <>
      <section ref={sectionRef} id="pricing" className="py-24 sm:py-32 px-4 relative z-10 bg-gradient-to-b from-white via-slate-50 to-white overflow-hidden">
        {/* Subtle Background Effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-slate-200/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-300/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto">
          {/* Header */}
          <div
            className={`text-center mb-16 transition-all duration-1000 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-800 text-white text-sm font-medium mb-8">
              <DollarSign className="w-4 h-4" />
              <span>Tarification</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">
              Tarification{" "}
              <span className="text-slate-700">personnalisée</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Sélectionnez vos modules, obtenez une estimation, puis planifiez une rencontre pour découvrir la plateforme en action avant l'implantation.
            </p>
          </div>

          {/* Value Proposition Section - Compact */}
          <div
            className={`mb-12 transition-all duration-1000 delay-200 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="w-5 h-5 text-slate-700" />
                    <h3 className="text-lg md:text-xl font-bold text-slate-900">
                      Les besoins non comblés vous coûtent chaque jour
                    </h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Temps perdu, décisions sous-optimales et risques opérationnels impactent votre <strong className="text-slate-900">multiple de valorisation</strong> et votre <strong className="text-slate-900">BAIIA</strong>, réduisant la valeur de votre entreprise.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200">
                    <TrendingDown className="w-4 h-4 text-slate-600" />
                    <span className="text-slate-700 font-medium">Coûts quotidiens</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded-lg">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-medium">Transformation</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Processus */}
          <div
            className={`mb-12 transition-all duration-1000 delay-200 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            }`}
          >
            <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-6 text-center">
              Comment ça fonctionne
            </h3>
            <div className="grid md:grid-cols-4 gap-6 relative">
              {/* Ligne de connexion */}
              <div className="hidden md:block absolute top-6 left-[10%] right-[10%] h-0.5 bg-slate-200 -z-10"></div>
              
              {/* Étape 1 */}
              <div className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-lg bg-slate-800 text-white flex items-center justify-center text-lg font-bold mb-4 shadow-sm relative z-10 border border-slate-700">
                    1
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mb-2">
                    Sélection des modules
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Choisissez vos modules et obtenez une estimation personnalisée.
                  </p>
                </div>
              </div>

              {/* Étape 2 */}
              <div className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-lg bg-slate-800 text-white flex items-center justify-center text-lg font-bold mb-4 shadow-sm relative z-10 border border-slate-700">
                    2
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mb-2">
                    Rencontre et démonstration
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Découvrez la plateforme en action lors d'une démonstration personnalisée et d'une analyse de vos besoins.
                  </p>
                </div>
              </div>

              {/* Étape 3 */}
              <div className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-lg bg-slate-800 text-white flex items-center justify-center text-lg font-bold mb-4 shadow-sm relative z-10 border border-slate-700">
                    3
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mb-2">
                    Structure de tarification
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Découvrez notre approche de tarification en 2 volets adaptée à vos besoins.
                  </p>
                </div>
              </div>

              {/* Étape 4 */}
              <div className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-lg bg-slate-800 text-white flex items-center justify-center text-lg font-bold mb-4 shadow-sm relative z-10 border border-slate-700">
                    4
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mb-2">
                    Implantation
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Configuration, migration des données et formation de votre équipe.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Pricing Calculator */}
          <div
            className={`mt-12 grid lg:grid-cols-2 gap-8 transition-all duration-1000 delay-300 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            }`}
          >
            {/* Left Column - Configuration */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-8 lg:p-10">
              {/* Revenus annuels */}
              <div className="mb-10">
                <div className="flex items-center justify-between mb-5">
                  <label className="text-lg font-bold text-slate-900">
                    Revenus annuels de la PME
                  </label>
                  <div className="relative group">
                    <HelpCircle className="w-5 h-5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                    <div className="absolute right-0 top-6 w-64 p-3 bg-slate-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-xl">
                      Les revenus annuels déterminent le plan de base et les fonctionnalités incluses
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <div className="space-y-4">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={revenue}
                      onChange={(e) => setRevenue(Number(e.target.value))}
                      className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-700"
                    />
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">1M$</span>
                      <div className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-lg shadow-md">
                        {revenue}M$
                      </div>
                      <span className="text-slate-500 font-medium">100M$</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nombre de sociétés/divisions */}
              <div className="mb-10">
                <div className="flex items-center justify-between mb-5">
                  <label className="text-lg font-bold text-slate-900">
                    Nombre de sociétés / divisions
                  </label>
                  <div className="relative group">
                    <HelpCircle className="w-5 h-5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                    <div className="absolute right-0 top-6 w-64 p-3 bg-slate-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-xl">
                      Le nombre d'entités impacte le prix de base avec un multiplicateur
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setCompanies(Math.max(1, companies - 1))}
                      className="w-12 h-12 rounded-lg border-2 border-slate-300 bg-white flex items-center justify-center hover:bg-slate-50 hover:border-slate-400 transition-all font-bold text-slate-700 text-lg shadow-sm"
                    >
                      −
                    </button>
                    <div className="bg-slate-800 text-white px-6 py-3 rounded-lg font-bold text-2xl min-w-[80px] text-center shadow-md">
                      {companies}
                    </div>
                    <button
                      onClick={() => setCompanies(companies + 1)}
                      className="w-12 h-12 rounded-lg border-2 border-slate-300 bg-white flex items-center justify-center hover:bg-slate-50 hover:border-slate-400 transition-all font-bold text-slate-700 text-lg shadow-sm"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Modules inclus */}
              <div className="mb-10">
                <div className="flex items-center justify-between mb-5">
                  <label className="text-lg font-bold text-slate-900">Modules inclus</label>
                  <div className="relative group">
                    <HelpCircle className="w-5 h-5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                    <div className="absolute right-0 top-6 w-64 p-3 bg-slate-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-xl">
                      Choisissez le type d'importation pour la consolidation financière
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div
                    className="relative flex items-start gap-4 p-6 rounded-xl border-2 border-slate-300 bg-gradient-to-br from-slate-50 to-white shadow-md cursor-default hover:shadow-lg hover:border-slate-400 transition-all group"
                  >
                    <div className="mt-1 flex-shrink-0">
                      <div className="w-6 h-6 rounded-lg border-2 flex items-center justify-center bg-slate-800 border-slate-800 shadow-sm">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="font-bold text-lg text-slate-900">
                          Consolidation Financière Avancée
                        </span>
                        <div className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap shadow-sm">
                          +500$/mois
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        États des résultats, bilans et flux de trésorerie en temps réel par compagnie, division, sous-division ou en vue consolidée. Intégration directe avec le logiciel comptable.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modules souhaitées */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-5">
                  <label className="text-lg font-bold text-slate-900">Modules souhaitées</label>
                  <div className="relative group">
                    <HelpCircle className="w-5 h-5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                    <div className="absolute right-0 top-6 w-64 p-3 bg-slate-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-xl">
                      Ajoutez des modules pour étendre les fonctionnalités de base
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  {additionalModules.map((module) => {
                    const isSelected = selectedModules.includes(module.id)
                    return (
                      <div 
                        key={module.id} 
                        onClick={() => toggleModule(module.id)}
                        className={`relative flex items-start gap-4 p-6 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected 
                            ? "border-slate-800 bg-gradient-to-br from-slate-50 to-white shadow-lg scale-[1.02]" 
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:bg-slate-50"
                        }`}
                      >
                        <div className="mt-1 flex-shrink-0">
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shadow-sm ${
                            isSelected 
                              ? "bg-slate-800 border-slate-800" 
                              : "border-slate-300 bg-white"
                          }`}>
                            {isSelected && <Check className="w-4 h-4 text-white" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <span className={`font-bold text-base ${isSelected ? "text-slate-900" : "text-slate-900"}`}>
                              {module.label}
                            </span>
                            <div className={`px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap shadow-sm ${
                              isSelected 
                                ? "bg-slate-800 text-white" 
                                : "bg-slate-100 text-slate-700"
                            }`}>
                              +{module.price}$/mois
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed">{module.description}</p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right Column - Résultat dynamique */}
            <div className="lg:sticky lg:top-24">
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-2xl p-8 lg:p-10 text-white relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-700/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-slate-700/20 rounded-full blur-2xl"></div>
                
                <div className="relative z-10">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600/50 mb-6 shadow-sm">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm font-semibold">Votre plan estimé</span>
                    </div>
                    {(selectedModules.length > 0 || includedModule === "manual") ? (
                      <>
                        <div className="bg-white/5 rounded-xl p-6 mb-4 border border-slate-700/50 backdrop-blur-sm">
                          <div className="text-5xl sm:text-6xl font-extrabold mb-2 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                            {minPrice}$ - {maxPrice}$
                          </div>
                          <div className="text-xl text-slate-300 font-medium">/mois</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-white/5 rounded-xl p-6 mb-4 border border-slate-700/50">
                          <div className="text-5xl sm:text-6xl font-extrabold mb-2 text-slate-400">
                            0$
                          </div>
                          <div className="text-xl text-slate-400">/mois</div>
                        </div>
                        <p className="text-sm text-slate-400 mt-2">Sélectionnez au moins un module pour obtenir une estimation</p>
                      </>
                    )}
                  </div>

                {(selectedModules.length > 0 || includedModule === "manual") && (
                  <div className="bg-slate-700/40 rounded-xl p-6 mb-6 border border-slate-600/50 backdrop-blur-sm">
                    <div className="space-y-4 text-sm">
                      {includedModule === "manual" && (
                        <div className="flex justify-between items-center py-2 border-b border-slate-600/30">
                          <span className="text-slate-300">Module inclus</span>
                          <span className="font-bold text-white bg-slate-800/50 px-3 py-1 rounded-lg">{includedModulePrice}$</span>
                        </div>
                      )}
                      {selectedModules.length > 0 && (
                        <div className="flex justify-between items-center py-2 border-b border-slate-600/30">
                          <span className="text-slate-300">Modules souhaitées (base)</span>
                          <span className="font-bold text-white bg-slate-800/50 px-3 py-1 rounded-lg">{baseModulesPrice}$</span>
                        </div>
                      )}
                      {(calculateRevenueMultiplier(revenue) > 1.0 || calculateCompanyMultiplier(companies) > 1.0) && (
                        <>
                          {calculateRevenueMultiplier(revenue) > 1.0 && (
                            <div className="flex justify-between items-center py-2 border-b border-slate-600/30">
                              <span className="text-slate-300">Multiplicateur revenus ({revenue}M$)</span>
                              <span className="font-bold text-slate-200 bg-slate-700/50 px-3 py-1 rounded-lg">x{calculateRevenueMultiplier(revenue).toFixed(1)}</span>
                            </div>
                          )}
                          {calculateCompanyMultiplier(companies) > 1.0 && (
                            <div className="flex justify-between items-center py-2 border-b border-slate-600/30">
                              <span className="text-slate-300">Multiplicateur entités ({companies})</span>
                              <span className="font-bold text-slate-200 bg-slate-700/50 px-3 py-1 rounded-lg">x{calculateCompanyMultiplier(companies).toFixed(1)}</span>
                            </div>
                          )}
                        </>
                      )}
                      <div className="pt-4 mt-2">
                        <div className="flex justify-between items-center bg-slate-800/50 rounded-lg p-4 border border-slate-600/50">
                          <span className="text-base font-bold text-white">Total mensuel estimé</span>
                          <span className="text-xl font-extrabold text-white">{totalPrice}$</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Frais d'intégration ponctuels */}
                {(selectedModules.length > 0 || includedModule === "manual") && (
                  <div className="bg-slate-700/40 rounded-xl p-6 mb-6 border border-slate-600/50 backdrop-blur-sm">
                    <div className="text-center mb-4">
                      <div className="text-sm font-semibold text-slate-300 mb-3 flex items-center justify-center gap-2">
                        <Clock className="w-4 h-4" />
                        Frais d'intégration ponctuels
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/50 mb-3">
                        <div className="text-3xl font-extrabold mb-1">
                          {minIntegrationFee.toLocaleString()}$ - {maxIntegrationFee.toLocaleString()}$
                        </div>
                        <div className="text-sm text-slate-400 font-medium">Montant unique</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 text-center leading-relaxed">
                      Inclut la configuration initiale, la migration des données et la formation de base
                    </div>
                  </div>
                )}

                <Button
                  size="lg"
                  onClick={() => setShowForm(true)}
                  className="w-full bg-white text-slate-900 hover:bg-slate-50 rounded-xl py-6 text-base font-bold transition-all duration-200 shadow-xl group border-2 border-white/20 hover:scale-[1.02] hover:shadow-2xl"
                >
                  Planifier une rencontre et démonstration
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>

                <p className="text-center text-xs text-slate-400 mt-4 leading-relaxed">
                  * Estimation indicative. Prix final selon configuration finale
                </p>
                </div>
              </div>

              {/* Services additionnels */}
              <div className="mt-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-xl p-6 lg:p-8">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Services additionnels
                </h3>
                <div className="space-y-4">
                  <div className="p-5 rounded-xl bg-slate-700/40 hover:bg-slate-700/60 transition-all border border-slate-600/50 hover:border-slate-500/50 hover:shadow-lg cursor-pointer group">
                    <div className="flex items-start gap-4 mb-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-3 h-3 rounded-full bg-white group-hover:scale-125 transition-transform"></div>
                      </div>
                      <h4 className="text-base font-bold text-white flex-1">Développement de modules personnalisés</h4>
                    </div>
                    <p className="text-sm text-slate-300 ml-7 leading-relaxed">
                      Création de fonctionnalités sur mesure adaptées à vos besoins spécifiques. Intégration de processus métier uniques, connecteurs API personnalisés et rapports spécialisés pour optimiser votre workflow.
                    </p>
                  </div>
                  <div className="p-5 rounded-xl bg-slate-700/40 hover:bg-slate-700/60 transition-all border border-slate-600/50 hover:border-slate-500/50 hover:shadow-lg cursor-pointer group">
                    <div className="flex items-start gap-4 mb-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-3 h-3 rounded-full bg-white group-hover:scale-125 transition-transform"></div>
                      </div>
                      <h4 className="text-base font-bold text-white flex-1">Formation Financière</h4>
                    </div>
                    <p className="text-sm text-slate-300 ml-7 leading-relaxed">
                      Formation pour approfondir vos connaissances sur le conseil en finance d'entreprise, les prévisions, le fonds de roulement, les capex, etc. Comprenez parfaitement les modules et optimisez leur utilisation pour maximiser la valeur de votre entreprise.
                    </p>
                  </div>
                  <div className="p-5 rounded-xl bg-slate-700/40 hover:bg-slate-700/60 transition-all border border-slate-600/50 hover:border-slate-500/50 hover:shadow-lg cursor-pointer group">
                    <div className="flex items-start gap-4 mb-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-3 h-3 rounded-full bg-white group-hover:scale-125 transition-transform"></div>
                      </div>
                      <h4 className="text-base font-bold text-white flex-1">Support pour la valorisation et le diagnostic d'Entreprise</h4>
                    </div>
                    <p className="text-sm text-slate-300 ml-7 leading-relaxed">
                      Support initial pour établir la valeur de votre entreprise avec accompagnement personnalisé. Analyse approfondie de votre modèle d'affaires et identification des leviers de valeur. Vous n'êtes pas laissé seul dans ce processus.
                    </p>
                  </div>
                  <div className="p-5 rounded-xl bg-slate-700/40 hover:bg-slate-700/60 transition-all border border-slate-600/50 hover:border-slate-500/50 hover:shadow-lg cursor-pointer group">
                    <div className="flex items-start gap-4 mb-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-3 h-3 rounded-full bg-white group-hover:scale-125 transition-transform"></div>
                      </div>
                      <h4 className="text-base font-bold text-white flex-1">Autres (nous contacter)</h4>
                    </div>
                    <p className="text-sm text-slate-300 ml-7 leading-relaxed">
                      Besoin d'un service spécifique non listé ? Contactez-nous pour discuter de vos besoins particuliers. Nous adaptons nos solutions à votre contexte et vous proposons un accompagnement sur mesure.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modal Formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>

            <h3 className="text-2xl font-bold text-slate-900 mb-2">Planifier une rencontre</h3>
            <p className="text-slate-600 mb-6">Remplissez ce formulaire pour planifier une démonstration personnalisée de la plateforme</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Nom complet</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-slate-700 focus:outline-none transition-colors"
                  placeholder="Jean Dupont"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-slate-700 focus:outline-none transition-colors"
                  placeholder="jean.dupont@exemple.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Téléphone</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-slate-700 focus:outline-none transition-colors"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Société</label>
                <input
                  type="text"
                  required
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-slate-700 focus:outline-none transition-colors"
                  placeholder="Nom de votre entreprise"
                />
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-slate-800 text-white hover:bg-slate-700 rounded-lg py-6 text-base font-semibold transition-colors duration-200"
                >
                  Envoyer la demande
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
