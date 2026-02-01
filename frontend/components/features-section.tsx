"use client"

import { useEffect, useRef, useState } from "react"
import { FileBarChart, TrendingUp, Calculator, FileText, Building2, ArrowRight, Users, CheckCircle2, Calendar, DollarSign, BarChart3, LineChart, PieChart, Shield, AlertTriangle, UserCog, Zap } from "lucide-react"

const features = [
  {
    title: "Consolidation financière avancée",
    description: "Consolidez automatiquement toutes vos entités avec élimination des transactions inter-sociétés. Visualisez vos états financiers consolidés en temps réel par société, division ou sous-division avec intégration API simplifiée.",
    icon: FileBarChart,
    benefits: ["Consolidation multi-niveaux", "Élimination automatique", "Vue en temps réel"]
  },
  {
    title: "Analyse du fonds de roulement et des capex",
    description: "Suivez en détail vos cycles de conversion (DSO, DIO, DPO, CCC) et analysez votre fonds de roulement net. Optimisez vos investissements en capital avec des analyses de rentabilité et une planification budgétaire précise.",
    icon: TrendingUp,
    benefits: ["Cycles de conversion", "Optimisation Capex", "Planification budgétaire"]
  },
  {
    title: "Prévisions financières et budgets",
    description: "Créez des projections financières annuelles et mensuelles avec modélisation multi-scénarios sur 5 ans. Établissez vos budgets par entité avec suivi des écarts et ajustements dynamiques en temps réel.",
    icon: Calculator,
    benefits: ["Multi-scénarios", "Suivi des écarts", "Ajustements dynamiques"]
  },
  {
    title: "Analyse financière approfondie",
    description: "Analysez votre rentabilité de manière granulaire par produit, client, division ou projet. Calculez automatiquement vos ratios financiers et identifiez les tendances de saisonnalité pour optimiser votre performance.",
    icon: FileText,
    benefits: ["Rentabilité granulaire", "Ratios automatiques", "Tableaux de bord KPI"]
  },
  {
    title: "Valorisation et diagnostic d'entreprise",
    description: "Suivez l'évolution de votre valeur d'entreprise en temps réel avec calcul automatique des multiples. Effectuez un diagnostic approfondi de votre modèle d'affaires et identifiez les facteurs de risque influençant votre valorisation.",
    icon: Building2,
    benefits: ["Suivi en temps réel", "Diagnostic approfondi", "Optimisation de la valeur"]
  },
  {
    title: "Documentation comptable structurée",
    description: "Optimisez votre processus de clôture comptable en organisant systématiquement tous les documents justificatifs. Documentez en continu les variations significatives et les ajustements comptables avec notes explicatives détaillées.",
    icon: Calendar,
    benefits: ["Organisation systématique", "Documentation continue", "Traçabilité complète"]
  },
  {
    title: "Portail collaboratif sécurisé",
    description: "Partagez l'accès à votre plateforme avec vos partenaires financiers de confiance via un portail sécurisé. Contrôlez les permissions de manière granulaire et suivez tous les accès pour une collaboration transparente.",
    icon: Users,
    benefits: ["Accès sécurisé", "Permissions granulaires", "Collaboration en temps réel"]
  },
]

// Dashboard Visualization Components
function ConsolidationDashboard() {
  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="text-xs text-slate-500 mb-2">Revenus consolidés</div>
          <div className="text-xl font-bold text-slate-900 mb-1">—</div>
          <div className="text-xs text-slate-500 font-medium">— sociétés</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="text-xs text-slate-500 mb-2">Résultat net</div>
          <div className="text-xl font-bold text-emerald-700 mb-1">—</div>
          <div className="text-xs text-emerald-600 font-medium">Consolidé</div>
        </div>
      </div>
      {/* Income Statement Table - Simplified */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <div className="text-xs font-semibold text-slate-700">États financiers consolidés</div>
        </div>
        <div className="divide-y divide-slate-100">
          {/* Header */}
          <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-slate-50/50 text-xs font-semibold text-slate-600 border-b border-slate-200">
            <div>Poste</div>
            <div className="text-right">Société 1</div>
            <div className="text-right">Société 2</div>
            <div className="text-right">Société 3</div>
          </div>
          {/* Revenus */}
          <div className="grid grid-cols-4 gap-2 px-4 py-2.5">
            <div className="text-xs font-semibold text-slate-900">Revenus</div>
            <div className="text-xs text-right font-mono text-slate-900">—</div>
            <div className="text-xs text-right font-mono text-slate-900">—</div>
            <div className="text-xs text-right font-mono text-slate-900">—</div>
          </div>
          {/* Bénéfice brut */}
          <div className="grid grid-cols-4 gap-2 px-4 py-2.5 border-t border-slate-200">
            <div className="text-xs font-bold text-slate-900">Bénéfice brut</div>
            <div className="text-xs text-right font-mono font-bold text-slate-900">—</div>
            <div className="text-xs text-right font-mono font-bold text-slate-900">—</div>
            <div className="text-xs text-right font-mono font-bold text-slate-900">—</div>
          </div>
          {/* Résultat net */}
          <div className="grid grid-cols-4 gap-2 px-4 py-2.5 border-t-2 border-slate-300 bg-slate-50">
            <div className="text-xs font-bold text-slate-900">Résultat net</div>
            <div className="text-xs text-right font-mono font-bold text-emerald-700">—</div>
            <div className="text-xs text-right font-mono font-bold text-emerald-700">—</div>
            <div className="text-xs text-right font-mono font-bold text-emerald-700">—</div>
          </div>
        </div>
      </div>
      {/* Divisions Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Divisions Société 1</div>
          <div className="text-sm font-bold text-slate-900">— divisions</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Sous-divisions</div>
          <div className="text-sm font-bold text-slate-900">— sous-div.</div>
        </div>
      </div>
    </div>
  )
}

function WorkingCapitalDashboard() {
  return (
    <div className="space-y-4">
      {/* Cycles */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="text-xs text-slate-500 mb-2">DSO</div>
          <div className="text-xl font-bold text-slate-900 mb-1">—</div>
          <div className="text-xs text-emerald-600 font-medium">— vs mois dernier</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="text-xs text-slate-500 mb-2">CCC</div>
          <div className="text-xl font-bold text-slate-900 mb-1">—</div>
          <div className="text-xs text-slate-500 font-medium">Optimisé</div>
        </div>
      </div>
      {/* Chart */}
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <div className="text-xs font-semibold text-slate-700 mb-3">Cycles de conversion</div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-slate-600 rounded-full"></div>
            <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-slate-600 rounded-full" style={{ width: '0%' }}></div>
            </div>
            <span className="text-xs text-slate-600 font-medium w-10">DSO —</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
            <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-slate-500 rounded-full" style={{ width: '0%' }}></div>
            </div>
            <span className="text-xs text-slate-600 font-medium w-10">DIO —</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-slate-400 rounded-full"></div>
            <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-slate-400 rounded-full" style={{ width: '0%' }}></div>
            </div>
            <span className="text-xs text-slate-600 font-medium w-10">DPO —</span>
          </div>
        </div>
      </div>
      {/* Additional Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Fonds de roulement</div>
          <div className="text-sm font-bold text-slate-900">—</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Capex ce mois</div>
          <div className="text-sm font-bold text-slate-900">—</div>
        </div>
      </div>
    </div>
  )
}

function ForecastDashboard() {
  return (
    <div className="space-y-4">
      {/* Budget Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="text-xs text-slate-500 mb-2">Budget Q3</div>
          <div className="text-xl font-bold text-slate-900 mb-1">—</div>
          <div className="text-xs text-emerald-600 font-medium">— vs prévu</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="text-xs text-slate-500 mb-2">Écart total</div>
          <div className="text-xl font-bold text-slate-900 mb-1">—</div>
          <div className="text-xs text-slate-500 font-medium">Favorable</div>
        </div>
      </div>
      {/* Budget Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <div className="text-xs font-semibold text-slate-700">Budget — Trimestre —</div>
        </div>
        <div className="divide-y divide-slate-100">
          {/* Header */}
          <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-slate-50/50 text-xs font-semibold text-slate-600 border-b border-slate-200">
            <div>Poste</div>
            <div className="text-right">Budget</div>
            <div className="text-right">Réel</div>
            <div className="text-right">Écart</div>
          </div>
          {/* Rows */}
          {[
            { label: "Revenus" },
            { label: "Charges d'exploitation" },
            { label: "Capex" },
          ].map((item, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 px-4 py-2.5 text-xs">
              <div className="text-slate-700 font-medium">{item.label}</div>
              <div className="text-right text-slate-600 font-mono">—</div>
              <div className="text-right text-slate-900 font-mono font-semibold">—</div>
              <div className="text-right font-semibold text-slate-600">—</div>
            </div>
          ))}
          {/* Total */}
          <div className="grid grid-cols-4 gap-2 px-4 py-2.5 bg-slate-50 border-t-2 border-slate-300 text-xs">
            <div className="font-bold text-slate-900">Bénéfice net</div>
            <div className="text-right text-slate-600 font-mono font-semibold">—</div>
            <div className="text-right text-slate-900 font-mono font-bold">—</div>
            <div className="text-right font-bold text-emerald-700">—</div>
          </div>
        </div>
      </div>
      {/* Scenarios */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Scénario optimiste</div>
          <div className="text-sm font-bold text-slate-900">—</div>
          <div className="text-xs text-emerald-600 mt-1">— vs budget</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Scénario pessimiste</div>
          <div className="text-sm font-bold text-slate-900">—</div>
          <div className="text-xs text-amber-600 mt-1">— vs budget</div>
        </div>
      </div>
    </div>
  )
}

function AnalysisDashboard() {
  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="text-xs text-slate-500 mb-2">Ratio liquidité</div>
          <div className="text-xl font-bold text-slate-900 mb-1">—</div>
          <div className="text-xs text-emerald-600 font-medium">—</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="text-xs text-slate-500 mb-2">ROE</div>
          <div className="text-xl font-bold text-slate-900 mb-1">—</div>
          <div className="text-xs text-emerald-600 font-medium">—</div>
        </div>
      </div>
      {/* Product Margins */}
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <div className="text-xs font-semibold text-slate-700 mb-3">Marges par produit</div>
        <div className="space-y-3">
          {[
            { product: "Produit A" },
            { product: "Produit B" },
            { product: "Produit C" },
          ].map((item, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700">{item.product}</span>
                <span className="text-xs text-slate-500">— revenus</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: '0%' }}></div>
                </div>
                <span className="text-xs font-bold text-slate-900 w-14 text-right">—</span>
              </div>
              <div className="text-xs text-slate-500 pl-1">— revenus</div>
            </div>
          ))}
        </div>
      </div>
      {/* Additional Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Concentration clients</div>
          <div className="text-sm font-bold text-slate-900">—</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Top 3 clients</div>
          <div className="text-sm font-bold text-slate-900">Principaux</div>
        </div>
      </div>
    </div>
  )
}

function ValuationDashboard() {
  const years = ["A-4", "A-3", "A-2", "A-1", "A"]

  return (
    <div className="space-y-4">
      {/* BAIIA Calculation - 5 ans d'historique */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <div className="text-xs font-semibold text-slate-700">BAIIA représentatif moyen annuellement</div>
        </div>
        <div className="divide-y divide-slate-100">
          {/* Header */}
          <div className="grid grid-cols-6 gap-2 px-4 py-2 bg-slate-50/50 text-xs font-semibold text-slate-600 border-b border-slate-200">
            <div>Poste</div>
            {years.map((y, i) => (
              <div key={i} className="text-right">{y}</div>
            ))}
          </div>
          {/* BAIIA de base */}
          <div className="grid grid-cols-6 gap-2 px-4 py-2.5 text-xs">
            <div className="text-slate-700 font-medium">BAIIA</div>
            {years.map((_, i) => (
              <div key={i} className="text-right text-slate-900 font-mono font-semibold">—</div>
            ))}
          </div>
          {/* Total ajustements */}
          <div className="grid grid-cols-6 gap-2 px-4 py-2.5 text-xs border-t border-slate-200">
            <div className="text-slate-600 font-medium">Total ajustements</div>
            {years.map((_, i) => (
              <div key={i} className="text-right text-slate-700 font-mono font-semibold">—</div>
            ))}
          </div>
          {/* BAIIA ajusté */}
          <div className="grid grid-cols-6 gap-2 px-4 py-2.5 border-t-2 border-slate-300 bg-slate-50 text-xs">
            <div className="font-bold text-slate-900">BAIIA ajusté</div>
            {years.map((_, i) => (
              <div key={i} className="text-right font-mono font-bold text-emerald-700">—</div>
            ))}
          </div>
          {/* Multiple */}
          <div className="grid grid-cols-6 gap-2 px-4 py-2.5 text-xs">
            <div className="text-slate-600">Multiple</div>
            {years.map((_, i) => (
              <div key={i} className="text-right text-slate-900 font-mono font-semibold">—</div>
            ))}
          </div>
          {/* Valeur d'entreprise */}
          <div className="grid grid-cols-6 gap-2 px-4 py-2.5 text-xs">
            <div className="text-slate-600">Valeur d&apos;entreprise</div>
            {years.map((_, i) => (
              <div key={i} className="text-right text-emerald-700 font-mono font-semibold">—</div>
            ))}
          </div>
        </div>
      </div>
      {/* Explication multiple et valorisation */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Évolution multiple</div>
          <div className="text-sm font-bold text-emerald-700">—</div>
          <div className="text-xs text-slate-600 mt-1">Croissance BAIIA et réduction risques</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Valorisation</div>
          <div className="text-sm font-bold text-emerald-700">—</div>
          <div className="text-xs text-slate-600 mt-1">Amélioration performance continue</div>
        </div>
      </div>
    </div>
  )
}

function DocumentationDashboard() {
  return (
    <div className="space-y-4">
      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="text-xs text-slate-500 mb-2">Documents classés</div>
          <div className="text-xl font-bold text-slate-900 mb-1">—</div>
          <div className="text-xs text-emerald-600 font-medium">Complet</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="text-xs text-slate-500 mb-2">En attente</div>
          <div className="text-xl font-bold text-slate-900 mb-1">—</div>
          <div className="text-xs text-amber-600 font-medium">À traiter</div>
        </div>
      </div>
      {/* Documents by Category */}
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <div className="text-xs font-semibold text-slate-700 mb-3">Documents par compte GL</div>
        <div className="space-y-2.5">
          {[
            { account: "Compte GL 1" },
            { account: "Compte GL 2" },
            { account: "Compte GL 3" },
            { account: "Compte GL 4" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
              <span className="text-slate-700 font-medium">{item.account}</span>
              <div className="flex items-center gap-4">
                <span className="text-slate-600">— docs</span>
                <span className="text-slate-600">— notes</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Notes sur variations importantes */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Variations notées</div>
          <div className="text-sm font-bold text-slate-900">—</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Dernière note</div>
          <div className="text-sm font-bold text-slate-900">—</div>
        </div>
      </div>
    </div>
  )
}

function CollaborationDashboard() {
  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="text-xs text-slate-500 mb-2">Accès actifs</div>
          <div className="text-xl font-bold text-slate-900 mb-1">—</div>
          <div className="text-xs text-emerald-600 font-medium">En ligne</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="text-xs text-slate-500 mb-2">Total accès</div>
          <div className="text-xl font-bold text-slate-900 mb-1">—</div>
          <div className="text-xs text-slate-500 font-medium">Partagés</div>
        </div>
      </div>
      {/* Access List */}
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <div className="text-xs font-semibold text-slate-700 mb-3">Accès partagés</div>
        <div className="space-y-3">
          {[
            { name: "Utilisateur 1", role: "Comptable", status: "Actif", lastAccess: "—" },
            { name: "Utilisateur 2", role: "Consultant", status: "Actif", lastAccess: "—" },
            { name: "Utilisateur 3", role: "Banque", status: "En attente", lastAccess: "—" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-2 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                  <Users className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <div className="font-medium text-slate-700">{item.name}</div>
                  <div className="text-slate-500 text-xs">{item.role} • {item.lastAccess}</div>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                item.status === "Actif"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}>
                {item.status}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Permissions */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-slate-200 text-center">
          <Shield className="w-5 h-5 mx-auto mb-2 text-slate-600" />
          <div className="text-xs text-slate-500 font-medium">Sécurisé</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-200 text-center">
          <CheckCircle2 className="w-5 h-5 mx-auto mb-2 text-emerald-600" />
          <div className="text-xs text-slate-500 font-medium">Temps réel</div>
        </div>
      </div>
    </div>
  )
}

export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

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

  return (
    <section id="features" ref={sectionRef} className="py-24 sm:py-32 relative z-10 bg-gradient-to-b from-white via-slate-50 to-white overflow-hidden">
      {/* Subtle Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-slate-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-300/10 rounded-full blur-3xl"></div>
      </div>
      <div className="relative max-w-[1920px] mx-auto px-8 sm:px-12 lg:px-16 xl:px-20">
        {/* Header */}
        <div
          className={`mb-12 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="flex items-start justify-between gap-8 mb-6">
            <div className="flex-1">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight tracking-tight">
            Des outils conçus pour les{" "}
                <span className="text-slate-600">PME</span>
          </h2>
              <p className="text-lg sm:text-xl text-slate-600 max-w-3xl leading-relaxed">
            Une suite complète de fonctionnalités financières intégrées, conçue pour répondre aux besoins spécifiques des PME et optimiser la collaboration avec leurs partenaires financiers.
          </p>
            </div>
          </div>
        </div>

        {/* Features List with Visualizations */}
        <div className="space-y-24 sm:space-y-32 md:space-y-40">
          {features.map((feature, index) => {
            const Icon = feature.icon
            const isEven = index % 2 === 0
            const isHovered = hoveredIndex === index

            return (
              <div
                key={index}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center transition-all duration-1000 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                }`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                {/* Content Column */}
                <div className={`space-y-5 ${isEven ? "order-1" : "order-2"}`}>
                  {/* Icon */}
                  <div className={`
                    w-12 h-12 rounded-xl mb-2 flex items-center justify-center inline-flex
                    transition-all duration-300
                    ${isHovered ? "bg-slate-900 text-white scale-110" : "bg-slate-100 text-slate-700"}
                  `}>
                    <Icon className="w-6 h-6" />
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-3 leading-tight tracking-tight">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-6">
                    {feature.description}
                  </p>

                  {/* Benefits Section */}
                  <div className="space-y-2">
                    {feature.benefits.map((benefit, bIndex) => (
                      <div key={bIndex} className="flex items-center gap-2">
                        <div className={`
                          w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0
                          transition-all duration-300
                          ${isHovered ? "bg-emerald-500" : "bg-emerald-100"}
                        `}>
                          <CheckCircle2 className={`w-2.5 h-2.5 ${isHovered ? "text-white" : "text-emerald-600"}`} />
                        </div>
                        <span className="text-sm text-slate-700 leading-relaxed">
                          {benefit}
                        </span>
                      </div>
                    ))}
                    </div>
                </div>

                {/* Visualization Column */}
                <div className={`relative ${isEven ? "order-2" : "order-1"}`}>
                  <div className="relative bg-slate-50 rounded-xl border-2 border-slate-200 shadow-lg overflow-hidden">
                    {/* Dashboard Header */}
                    <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                        <span className="text-xs font-semibold text-slate-700">{feature.title}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                        <span className="text-xs font-medium">Temps réel</span>
                      </div>
                    </div>

                    {/* Dashboard Content - Different visualization for each feature */}
                    <div className="p-4 bg-slate-50 min-h-[320px]">
                      {index === 0 && <ConsolidationDashboard />}
                      {index === 1 && <WorkingCapitalDashboard />}
                      {index === 2 && <ForecastDashboard />}
                      {index === 3 && <AnalysisDashboard />}
                      {index === 4 && <ValuationDashboard />}
                      {index === 5 && <DocumentationDashboard />}
                      {index === 6 && <CollaborationDashboard />}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
