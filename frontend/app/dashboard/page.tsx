"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, BarChart3, LineChart, Target, Building2, Settings, BookOpen, FileSpreadsheet, ArrowRight, CheckCircle2, Clock, Calendar, Plus } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useCompanies } from "@/hooks/use-companies"
import { listAccountMappings, listStatementStructures } from "@/lib/api"

const quickLinks = [
  {
    id: "financial-statements",
    title: "États financiers",
    description: "Consultez vos états des résultats, bilans et flux de trésorerie",
    icon: TrendingUp,
    href: "/financial-statements/income-statement",
  },
  {
    id: "analysis",
    title: "Analyse",
    description: "Analysez vos fonds de roulement, capex, saisonnalité et ratios",
    icon: LineChart,
    href: "/analysis/working-capital",
  },
  {
    id: "projections",
    title: "Projections",
    description: "Créez des projections financières et des scénarios",
    icon: Target,
    href: "/projections/pro-forma",
  },
  {
    id: "evaluation",
    title: "Évaluation",
    description: "Évaluez votre entreprise avec différentes méthodes",
    icon: Building2,
    href: "/evaluation/business-model",
  },
  {
    id: "year-end-cpa",
    title: "Fin d'année CPA",
    description: "Organisez et documentez votre clôture comptable de fin d'année",
    icon: Calendar,
    href: "/year-end-cpa",
  },
]

export default function DashboardPage() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const { companies, loading: companiesLoading } = useCompanies()
  const [setupTasks, setSetupTasks] = useState([
    {
      id: "accounting-mapping",
      title: "Mapping de la comptabilité",
      description: "Configurez les correspondances entre vos comptes comptables",
      icon: FileSpreadsheet,
      href: "/settings/accounting-mapping",
      completed: false,
    },
    {
      id: "financial-statements-mapping",
      title: "Mapping des états financiers",
      description: "Définissez les mappings pour vos états financiers",
      icon: BarChart3,
      href: "/financial-statements",
      completed: false,
    },
  ])

  useEffect(() => {
    if (companies.length === 0) return
    const companyId = companies[0].id

    listAccountMappings(companyId)
      .then((mappings) => {
        setSetupTasks((prev) =>
          prev.map((t) =>
            t.id === "accounting-mapping" ? { ...t, completed: mappings.length > 0 } : t
          )
        )
      })
      .catch(() => {})

    listStatementStructures(companyId)
      .then((structures) => {
        setSetupTasks((prev) =>
          prev.map((t) =>
            t.id === "financial-statements-mapping" ? { ...t, completed: structures.length > 0 } : t
          )
        )
      })
      .catch(() => {})
  }, [companies])

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />
      
      {/* Dark Header Section */}
      <div className="w-full bg-slate-900 pt-15 pb-40">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="flex items-start gap-3 mb-8">
            <div className="w-2"></div>
            <div className="flex-1">
              <h2 className="text-4xl font-normal text-white mb-2 tracking-tight">Tableau de bord</h2>
              <p className="text-base text-slate-300 mb-6">
                Vue d'ensemble de votre plateforme d'intelligence financière
              </p>
              <p className="text-base text-slate-300 mb-6 leading-relaxed max-w-4xl">
                Accédez à vos états financiers consolidés en temps réel, analysez vos performances avec des ratios avancés, 
                créez des projections financières précises, évaluez votre entreprise selon différentes méthodes, 
                et optimisez votre processus de clôture comptable avec une documentation structurée. 
                Tous vos outils d'analyse financière en un seul endroit.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links Grid - Overlapping section */}
      <div className="relative -mt-32 mb-12">
        <div className="max-w-[1920px] mx-auto px-6">
          <h3 className="text-lg font-medium text-white mb-4 ml-2">Accès Rapide</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {quickLinks.map((link) => {
              const Icon = link.icon
              const isHovered = hoveredCard === link.id

              return (
                <Link key={link.id} href={link.href}>
                  <Card
                    className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border border-slate-200 hover:border-slate-300 bg-white"
                    onMouseEnter={() => setHoveredCard(link.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <CardContent className="p-8">
                      <div className="flex flex-col h-full">
                        <div
                          className={`w-16 h-16 rounded-xl bg-slate-100 group-hover:bg-slate-800 flex items-center justify-center mb-5 transition-all duration-300 ${
                            isHovered ? "scale-110 shadow-lg" : ""
                          }`}
                        >
                          <Icon className="w-8 h-8 text-slate-700 group-hover:text-white transition-colors duration-300" />
                        </div>

                        <h3 className="text-xl font-bold text-slate-900 mb-3 text-balance">{link.title}</h3>

                        <p className="text-slate-600 text-sm mb-6 flex-grow leading-relaxed text-pretty">
                          {link.description}
                        </p>

                        <div className="flex items-center text-slate-700 group-hover:text-slate-900 font-semibold text-sm group-hover:gap-3 gap-2 transition-all duration-300">
                          <span>Accéder</span>
                          <ArrowRight
                            className={`w-4 h-4 transition-transform duration-300 ${isHovered ? "translate-x-1" : ""}`}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      <main className="w-full pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">

          {/* Setup Tasks Section */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Configuration initiale</h2>
              <Link
                href="/settings"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                <span>Gérer la configuration</span>
              </Link>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-6">
              <p className="text-slate-600 mb-6">
                Complétez ces étapes pour configurer votre plateforme et commencer à utiliser toutes les fonctionnalités.
              </p>
              <div className="space-y-4">
                {!companiesLoading && companies.length === 0 && (
                  <Link
                    href="/settings/companies"
                    className="flex items-start gap-4 p-4 rounded-lg border-2 border-amber-300 bg-amber-50 hover:bg-amber-100 transition-all duration-200 group"
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center">
                        <Plus className="w-4 h-4 text-amber-700" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <Building2 className="w-5 h-5 text-amber-700 flex-shrink-0" />
                        <h3 className="font-semibold text-amber-900">Créer votre première entreprise</h3>
                      </div>
                      <p className="text-sm text-amber-800 leading-relaxed">
                        Toutes les fonctionnalités nécessitent une entreprise. Commencez par en créer une.
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-amber-500 group-hover:text-amber-700 transition-colors flex-shrink-0 mt-1" />
                  </Link>
                )}
                {setupTasks.map((task) => {
                  const Icon = task.icon
                  const locked = !companiesLoading && companies.length === 0
                  return (
                    <Link
                      key={task.id}
                      href={locked ? "/settings/companies" : task.href}
                      className={`flex items-start gap-4 p-4 rounded-lg border transition-all duration-200 group ${
                        locked
                          ? "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed pointer-events-none"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex-shrink-0 mt-1">
                        {task.completed ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center group-hover:bg-slate-300 transition-colors">
                            <Clock className="w-4 h-4 text-slate-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <Icon className="w-5 h-5 text-slate-600 flex-shrink-0" />
                          <h3 className="font-semibold text-slate-900">{task.title}</h3>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{task.description}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors flex-shrink-0 mt-1" />
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Help & Resources Section */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-slate-700" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Ressources</h3>
              </div>
              <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                Accédez à la documentation, aux guides et aux ressources pour maximiser l'utilisation de la plateforme.
              </p>
              <Link
                href="/resources"
                className="inline-flex items-center gap-2 text-slate-700 font-semibold text-sm hover:text-slate-900 transition-colors"
              >
                <span>Consulter les ressources</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Settings className="w-6 h-6 text-slate-700" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Paramètres</h3>
              </div>
              <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                Gérez les paramètres de votre compte, configurez vos préférences et personnalisez votre expérience.
              </p>
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 text-slate-700 font-semibold text-sm hover:text-slate-900 transition-colors"
              >
                <span>Accéder aux paramètres</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
