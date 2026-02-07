"use client"

import { useEffect, useRef, useState } from "react"
import { FileBarChart, TrendingUp, Calculator, FileText, Building2, ArrowRight, Users, CheckCircle2, Calendar, DollarSign, BarChart3, LineChart, PieChart, Shield, AlertTriangle, UserCog, Zap, StickyNote } from "lucide-react"

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
    description: "Optimisez votre processus de clôture comptable en organisant systématiquement tous les documents justificatifs. Structurez et classez vos pièces comptables par compte, période et catégorie pour une traçabilité complète et une accessibilité optimale.",
    icon: Calendar,
    benefits: ["Organisation systématique", "Documentation continue", "Traçabilité complète"]
  },
  {
    title: "Notes d'analyse et variations",
    description: "Prenez des notes lors de vos analyses financières pour documenter les variations importantes et faciliter le suivi. Associez des notes explicatives détaillées à vos comptes, périodes et analyses pour conserver le contexte et le raisonnement derrière vos décisions.",
    icon: StickyNote,
    benefits: ["Notes contextuelles", "Suivi des variations", "Documentation du raisonnement"]
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
  const companies = [
    { name: "Société A", revenue: 850, cogs: 380, grossProfit: 470, expenses: 280, netIncome: 190 },
    { name: "Société B", revenue: 1200, cogs: 540, grossProfit: 660, expenses: 420, netIncome: 240 },
    { name: "Société C", revenue: 450, cogs: 180, grossProfit: 270, expenses: 150, netIncome: 120 },
  ]
  const totalRevenue = companies.reduce((sum, c) => sum + c.revenue, 0)
  const totalGrossProfit = companies.reduce((sum, c) => sum + c.grossProfit, 0)
  const totalNetIncome = companies.reduce((sum, c) => sum + c.netIncome, 0)
  const intercompanyEliminations = 45 // Transactions inter-sociétés éliminées

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="text-xs text-slate-500 mb-2">Revenus consolidés</div>
          <div className="text-xl font-bold text-slate-900 mb-1">{totalRevenue}K$</div>
          <div className="text-xs text-slate-500 font-medium">3 sociétés</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="text-xs text-slate-500 mb-2">Résultat net</div>
          <div className="text-xl font-bold text-emerald-700 mb-1">{totalNetIncome}K$</div>
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
            <div className="text-right">Société A</div>
            <div className="text-right">Société B</div>
            <div className="text-right">Société C</div>
          </div>
          {/* Revenus */}
          <div className="grid grid-cols-4 gap-2 px-4 py-2.5">
            <div className="text-xs font-semibold text-slate-900">Revenus</div>
            <div className="text-xs text-right font-mono text-slate-900">{companies[0].revenue}K$</div>
            <div className="text-xs text-right font-mono text-slate-900">{companies[1].revenue}K$</div>
            <div className="text-xs text-right font-mono text-slate-900">{companies[2].revenue}K$</div>
          </div>
          {/* Bénéfice brut */}
          <div className="grid grid-cols-4 gap-2 px-4 py-2.5 border-t border-slate-200">
            <div className="text-xs font-bold text-slate-900">Bénéfice brut</div>
            <div className="text-xs text-right font-mono font-bold text-slate-900">{companies[0].grossProfit}K$</div>
            <div className="text-xs text-right font-mono font-bold text-slate-900">{companies[1].grossProfit}K$</div>
            <div className="text-xs text-right font-mono font-bold text-slate-900">{companies[2].grossProfit}K$</div>
          </div>
          {/* Résultat net */}
          <div className="grid grid-cols-4 gap-2 px-4 py-2.5 border-t-2 border-slate-300 bg-slate-50">
            <div className="text-xs font-bold text-slate-900">Résultat net</div>
            <div className="text-xs text-right font-mono font-bold text-emerald-700">{companies[0].netIncome}K$</div>
            <div className="text-xs text-right font-mono font-bold text-emerald-700">{companies[1].netIncome}K$</div>
            <div className="text-xs text-right font-mono font-bold text-emerald-700">{companies[2].netIncome}K$</div>
          </div>
        </div>
      </div>
      {/* Divisions Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Divisions Société A</div>
          <div className="text-sm font-bold text-slate-900">3 divisions</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Sous-divisions</div>
          <div className="text-sm font-bold text-slate-900">6 sous-div.</div>
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
          <div className="text-xl font-bold text-slate-900 mb-1">42j</div>
          <div className="text-xs text-emerald-600 font-medium">-12.5% vs mois dernier</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="text-xs text-slate-500 mb-2">CCC</div>
          <div className="text-xl font-bold text-slate-900 mb-1">49j</div>
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
              <div className="h-full bg-slate-600 rounded-full" style={{ width: '70%' }}></div>
            </div>
            <span className="text-xs text-slate-600 font-medium w-10">DSO 42j</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
            <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-slate-500 rounded-full" style={{ width: '55%' }}></div>
            </div>
            <span className="text-xs text-slate-600 font-medium w-10">DIO 35j</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-slate-400 rounded-full"></div>
            <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-slate-400 rounded-full" style={{ width: '45%' }}></div>
            </div>
            <span className="text-xs text-slate-600 font-medium w-10">DPO 28j</span>
          </div>
        </div>
      </div>
      {/* Additional Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Fonds de roulement</div>
          <div className="text-sm font-bold text-slate-900">1.2M$</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Capex ce mois</div>
          <div className="text-sm font-bold text-slate-900">85K$</div>
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
          <div className="text-xl font-bold text-slate-900 mb-1">305K$</div>
          <div className="text-xs text-emerald-600 font-medium">+1.7% vs prévu</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="text-xs text-slate-500 mb-2">Écart total</div>
          <div className="text-xl font-bold text-slate-900 mb-1">+7.4%</div>
          <div className="text-xs text-slate-500 font-medium">Favorable</div>
        </div>
      </div>
      {/* Budget Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <div className="text-xs font-semibold text-slate-700">Budget 2024 - Trimestre 3</div>
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
            { label: "Revenus", budget: 300, actual: 305, variance: "+1.7%", isPositive: true },
            { label: "Charges d'exploitation", budget: 180, actual: 175, variance: "-2.8%", isPositive: true },
            { label: "Capex", budget: 25, actual: 28, variance: "+12%", isPositive: false },
          ].map((item, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 px-4 py-2.5 text-xs">
              <div className="text-slate-700 font-medium">{item.label}</div>
              <div className="text-right text-slate-600 font-mono">{item.budget}K$</div>
              <div className="text-right text-slate-900 font-mono font-semibold">{item.actual}K$</div>
              <div className={`text-right font-semibold ${
                item.isPositive ? "text-emerald-700" : "text-amber-700"
              }`}>
                {item.variance}
              </div>
            </div>
          ))}
          {/* Total */}
          <div className="grid grid-cols-4 gap-2 px-4 py-2.5 bg-slate-50 border-t-2 border-slate-300 text-xs">
            <div className="font-bold text-slate-900">Bénéfice net</div>
            <div className="text-right text-slate-600 font-mono font-semibold">95K$</div>
            <div className="text-right text-slate-900 font-mono font-bold">102K$</div>
            <div className="text-right font-bold text-emerald-700">+7.4%</div>
          </div>
        </div>
      </div>
      {/* Scenarios */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Scénario optimiste</div>
          <div className="text-sm font-bold text-slate-900">1.2M$</div>
          <div className="text-xs text-emerald-600 mt-1">+15% vs budget</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Scénario pessimiste</div>
          <div className="text-sm font-bold text-slate-900">0.9M$</div>
          <div className="text-xs text-amber-600 mt-1">-10% vs budget</div>
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
          <div className="text-xl font-bold text-slate-900 mb-1">2.4</div>
          <div className="text-xs text-emerald-600 font-medium">Excellent</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="text-xs text-slate-500 mb-2">ROE</div>
          <div className="text-xl font-bold text-slate-900 mb-1">18.5%</div>
          <div className="text-xs text-emerald-600 font-medium">+2.3%</div>
        </div>
      </div>
      {/* Product Margins */}
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <div className="text-xs font-semibold text-slate-700 mb-3">Marges par produit</div>
        <div className="space-y-3">
          {[
            { product: "Produit A", margin: 52.3, revenue: 35, amount: 87.5 },
            { product: "Produit B", margin: 38.7, revenue: 45, amount: 112.5 },
            { product: "Produit C", margin: 41.2, revenue: 20, amount: 50.0 },
          ].map((item, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700">{item.product}</span>
                <span className="text-xs text-slate-500">{item.revenue}% revenus</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: `${item.margin}%` }}></div>
                </div>
                <span className="text-xs font-bold text-slate-900 w-14 text-right">{item.margin}%</span>
              </div>
              <div className="text-xs text-slate-500 pl-1">{item.amount}K$ revenus</div>
            </div>
          ))}
        </div>
      </div>
      {/* Additional Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Concentration clients</div>
          <div className="text-sm font-bold text-slate-900">45%</div>
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
  // Données historiques sur 5 ans
  const historicalData = [
    { year: "2020", baia: 1.8, adjustments: 0.22, adjustedBaia: 2.02, multiple: 3.2, value: 6.5 },
    { year: "2021", baia: 2.1, adjustments: 0.25, adjustedBaia: 2.35, multiple: 3.4, value: 8.0 },
    { year: "2022", baia: 2.3, adjustments: 0.26, adjustedBaia: 2.56, multiple: 3.5, value: 9.0 },
    { year: "2023", baia: 2.5, adjustments: 0.28, adjustedBaia: 2.78, multiple: 3.7, value: 10.3 },
    { year: "2024", baia: 2.7, adjustments: 0.30, adjustedBaia: 3.00, multiple: 4.0, value: 12.0 },
  ]
  const currentYear = historicalData[4] // 2024
  const valueRange = { min: currentYear.adjustedBaia * currentYear.multiple * 0.95, max: currentYear.adjustedBaia * currentYear.multiple * 1.05 }

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
            <div className="text-right">2020</div>
            <div className="text-right">2021</div>
            <div className="text-right">2022</div>
            <div className="text-right">2023</div>
            <div className="text-right">2024</div>
          </div>
          {/* BAIIA de base */}
          <div className="grid grid-cols-6 gap-2 px-4 py-2.5 text-xs">
            <div className="text-slate-700 font-medium">BAIIA</div>
            {historicalData.map((data, i) => (
              <div key={i} className="text-right text-slate-900 font-mono font-semibold">{data.baia.toFixed(2)}M$</div>
            ))}
          </div>
          {/* Total ajustements */}
          <div className="grid grid-cols-6 gap-2 px-4 py-2.5 text-xs border-t border-slate-200">
            <div className="text-slate-600 font-medium">Total ajustements</div>
            {historicalData.map((data, i) => (
              <div key={i} className="text-right text-slate-700 font-mono font-semibold">+{data.adjustments.toFixed(2)}M$</div>
            ))}
          </div>
          {/* BAIIA ajusté */}
          <div className="grid grid-cols-6 gap-2 px-4 py-2.5 border-t-2 border-slate-300 bg-slate-50 text-xs">
            <div className="font-bold text-slate-900">BAIIA ajusté</div>
            {historicalData.map((data, i) => (
              <div key={i} className="text-right font-mono font-bold text-emerald-700">{data.adjustedBaia.toFixed(2)}M$</div>
            ))}
          </div>
          {/* Multiple */}
          <div className="grid grid-cols-6 gap-2 px-4 py-2.5 text-xs">
            <div className="text-slate-600">Multiple</div>
            {historicalData.map((data, i) => (
              <div key={i} className="text-right text-slate-900 font-mono font-semibold">x{data.multiple.toFixed(1)}</div>
            ))}
          </div>
          {/* Valeur d'entreprise */}
          <div className="grid grid-cols-6 gap-2 px-4 py-2.5 text-xs">
            <div className="text-slate-600">Valeur d'entreprise</div>
            {historicalData.map((data, i) => (
              <div key={i} className="text-right text-emerald-700 font-mono font-semibold">{data.value.toFixed(1)}M$</div>
            ))}
          </div>
        </div>
      </div>
      {/* Explication multiple et valorisation */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Évolution multiple</div>
          <div className="text-sm font-bold text-emerald-700">x3.2 → x4.0</div>
          <div className="text-xs text-slate-600 mt-1">Croissance BAIIA et réduction risques</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Valorisation</div>
          <div className="text-sm font-bold text-emerald-700">+85% en 5 ans</div>
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
          <div className="text-xl font-bold text-slate-900 mb-1">20</div>
          <div className="text-xs text-emerald-600 font-medium">Complet</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="text-xs text-slate-500 mb-2">En attente</div>
          <div className="text-xl font-bold text-slate-900 mb-1">3</div>
          <div className="text-xs text-amber-600 font-medium">À traiter</div>
        </div>
      </div>
      {/* Documents by Category */}
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <div className="text-xs font-semibold text-slate-700 mb-3">Documents par compte GL</div>
        <div className="space-y-2.5">
          {[
            { account: "1000 - Caisse", docs: 3, period: "Q3 2024" },
            { account: "1200 - Comptes clients", docs: 5, period: "Q3 2024" },
            { account: "1500 - Immobilisations", docs: 8, period: "Q3 2024" },
            { account: "2000 - Comptes fournisseurs", docs: 4, period: "Q3 2024" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
              <span className="text-slate-700 font-medium">{item.account}</span>
              <div className="flex items-center gap-4">
                <span className="text-slate-600">{item.docs} docs</span>
                <span className="text-slate-500">{item.period}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Documents by Period */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Documents ce trimestre</div>
          <div className="text-sm font-bold text-slate-900">23</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Dernière mise à jour</div>
          <div className="text-sm font-bold text-slate-900">Q3 2024</div>
        </div>
      </div>
    </div>
  )
}

function NotesDashboard() {
  return (
    <div className="space-y-4">
      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="text-xs text-slate-500 mb-2">Notes actives</div>
          <div className="text-xl font-bold text-slate-900 mb-1">12</div>
          <div className="text-xs text-emerald-600 font-medium">Ce trimestre</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="text-xs text-slate-500 mb-2">Variations notées</div>
          <div className="text-xl font-bold text-slate-900 mb-1">8</div>
          <div className="text-xs text-amber-600 font-medium">Importantes</div>
        </div>
      </div>
      {/* Recent Notes */}
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <div className="text-xs font-semibold text-slate-700 mb-3">Notes récentes</div>
        <div className="space-y-3">
          {[
            { type: "Fonds de roulement", metric: "DSO", variation: "-5 jours", date: "Q3 2024", note: "Réduction de 45 à 40 jours grâce à la mise en place d'un système de relance automatisé et à la renégociation des conditions de paiement avec 3 clients majeurs représentant 40% du CA." },
            { type: "Capex", metric: "Investissements", variation: "+25%", date: "Q3 2024", note: "Acquisition de 2 nouvelles machines de production (450K$) pour augmenter la capacité de 30%. Investissement justifié par la croissance des commandes et prévu pour Q4 2024." },
            { type: "Résultats", metric: "Marge brute", variation: "+3.2%", date: "Q3 2024", note: "Amélioration de 32.5% à 35.7% due à l'augmentation des ventes de produits haut de gamme (+18% vs Q2) et à la réduction des coûts matières premières négociée avec 2 fournisseurs clés." },
          ].map((item, i) => (
            <div key={i} className="border-l-2 border-emerald-500 pl-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-900">{item.type}</span>
                  <span className="text-xs text-slate-500">{item.metric}</span>
                </div>
                <span className="text-xs font-bold text-emerald-700">{item.variation}</span>
              </div>
              <p className="text-xs text-slate-600 mb-1">{item.note}</p>
              <span className="text-xs text-slate-500">{item.date}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Notes by Category */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Dernière note</div>
          <div className="text-sm font-bold text-slate-900">15 oct.</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Notes ce mois</div>
          <div className="text-sm font-bold text-slate-900">5</div>
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
          <div className="text-xl font-bold text-slate-900 mb-1">2</div>
          <div className="text-xs text-emerald-600 font-medium">En ligne</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="text-xs text-slate-500 mb-2">Total accès</div>
          <div className="text-xl font-bold text-slate-900 mb-1">3</div>
          <div className="text-xs text-slate-500 font-medium">Partagés</div>
        </div>
      </div>
      {/* Access List */}
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <div className="text-xs font-semibold text-slate-700 mb-3">Accès partagés</div>
        <div className="space-y-3">
          {[
            { name: "Cabinet Comptable ABC", role: "Comptable", status: "Actif", lastAccess: "Aujourd'hui" },
            { name: "Consultant Finance XYZ", role: "Consultant", status: "Actif", lastAccess: "Hier" },
            { name: "Institution Financière", role: "Banque", status: "En attente", lastAccess: "-" },
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
                Analysez. Projetez. Valorisez.
              </h2>
              <p className="text-lg sm:text-xl text-slate-600 max-w-3xl leading-relaxed">
            Une suite complète de fonctionnalités financières intégrées pour analyser vos chiffres, projeter l'avenir et piloter la valeur de votre entreprise.
          </p>
            </div>
          </div>
        </div>

        {/* Features List with Visualizations */}
        <div className="space-y-24 sm:space-y-32 md:space-y-40">
          {features.map((feature, index) => {
            const Icon = feature.icon
            // Invert order for Documentation (index 5), Notes (index 6), and Portail (index 7)
            const baseIsEven = index % 2 === 0
            const isEven = (index === 5) ? true : (index === 6) ? false : (index === 7) ? true : baseIsEven
            const isHovered = hoveredIndex === index

            // Add title and description before "Documentation comptable structurée" (index 5)
            const showIntroSection = index === 5

            return (
              <div key={index} className={showIntroSection ? "mt-64 sm:mt-80 md:mt-96" : ""}>
                {showIntroSection && (
                  <div
                    className={`mb-16 transition-all duration-1000 ${
                      isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                    }`}
                    style={{ transitionDelay: `${index * 200}ms` }}
                  >
                    <div className="max-w-3xl">
                      <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight tracking-tight">
                        Documentez. Collaborez.
                      </h2>
                      <p className="text-lg sm:text-xl text-slate-600 leading-relaxed">
                        Organisez et documentez vos processus comptables de manière structurée, et collaborez efficacement avec vos partenaires financiers pour optimiser votre gestion et faciliter vos clôtures comptables.
                      </p>
                    </div>
                  </div>
                )}
                <div
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
                      {index === 6 && <NotesDashboard />}
                      {index === 7 && <CollaborationDashboard />}
                    </div>
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
