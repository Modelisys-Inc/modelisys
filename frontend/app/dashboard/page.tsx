"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, LineChart, Target, Building2, ArrowRight, Calendar } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { useCompanies } from "@/hooks/use-companies"

const quickLinks = [
  {
    id: "financial-statements",
    title: "Reporting financier",
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
    href: "/projections",
  },
  {
    id: "evaluation",
    title: "Valorisation",
    description: "Valorisez votre entreprise avec différentes méthodes",
    icon: Building2,
    href: "/evaluation/business-model",
  },
  {
    id: "year-end-cpa",
    title: "Documentation",
    description: "Organisez et documentez votre clôture comptable de fin d'année",
    icon: Calendar,
    href: "/year-end-cpa",
  },
]

export default function DashboardPage() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const { companies } = useCompanies()
  const searchParams = useSearchParams()
  const companyIdFromUrl = searchParams.get("companyId")
  const effectiveCompanyId = companyIdFromUrl && companies.some((c) => c.id === companyIdFromUrl)
    ? companyIdFromUrl
    : companies[0]?.id
  const companyQuery = effectiveCompanyId ? `?companyId=${effectiveCompanyId}` : ""

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />
      
      {/* Dark Header Section */}
      <div className="relative w-full pt-15 pb-40 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
            <div className="bg-[#2A2F3A]" />
            <div className="bg-[#2A2F3A]" />
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
              <h2 className="text-4xl font-semibold text-[#E6D6C3] mb-2 tracking-tight">Outils financiers</h2>
              <p className="text-base text-[#C9B8A5]/90 mb-6">
                Vue d'ensemble de votre plateforme d'intelligence financière
              </p>
              <p className="text-base text-[#C9B8A5]/80 mb-6 leading-relaxed max-w-4xl">
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
                <Link key={link.id} href={`${link.href}${companyQuery}`}>
                  <Card
                    className={`group relative cursor-pointer overflow-hidden rounded-[28px] border-2 border-slate-700 bg-gradient-to-br from-white to-slate-50 transition-all duration-500 ease-out hover:shadow-xl hover:shadow-slate-900/[0.07] ${
                      isHovered ? "scale-[1.015] shadow-2xl" : ""
                    }`}
                    onMouseEnter={() => setHoveredCard(link.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-[#E0742D]/[0.12]" />
                    <CardContent className="relative p-6 sm:p-7">
                      <div className="flex flex-col h-full">
                        <div
                          className={`w-14 h-14 rounded-xl bg-slate-100 group-hover:bg-[#2A2F3A] flex items-center justify-center mb-5 transition-all duration-300 ${
                            isHovered ? "scale-105" : ""
                          }`}
                        >
                          <Icon className="w-7 h-7 text-black group-hover:text-[#E6D6C3] transition-colors duration-300" />
                        </div>

                        <h3 className="text-xl font-semibold leading-tight tracking-tight text-[#2A2F3A] mb-3 text-balance">
                          {link.title}
                        </h3>

                        <p className="text-[#5C5F66] text-sm mb-6 flex-grow leading-relaxed text-pretty">
                          {link.description}
                        </p>

                        <div className="flex items-center text-[#5C5F66] font-semibold text-sm group-hover:gap-3 gap-2 transition-all duration-300">
                          <span>Accéder</span>
                          <ArrowRight
                            className={`w-4 h-4 text-[#E0742D] transition-transform duration-300 ${isHovered ? "translate-x-1" : ""}`}
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
    </div>
  )
}
