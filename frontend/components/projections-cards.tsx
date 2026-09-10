"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, FileText, Calculator, TrendingUp, TrendingDown, CreditCard, Percent, Scale } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

const projections = [
  {
    id: "pro-forma",
    title: "Pro Forma",
    description: "Générez vos états financiers pro forma basés sur vos projections et hypothèses",
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    href: "/projections",
  },
  {
    id: "assumptions",
    title: "Hypothèse",
    description: "Définissez et gérez vos hypothèses de projection pour vos modèles financiers",
    icon: Calculator,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
    href: "/projections/assumptions",
  },
  {
    id: "revenue",
    title: "Revenus",
    description: "Projetez vos revenus futurs avec différents scénarios et modèles de croissance",
    icon: TrendingUp,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    href: "/projections/revenue",
  },
  {
    id: "expenses",
    title: "Dépenses",
    description: "Planifiez et projetez vos dépenses opérationnelles et non-opérationnelles",
    icon: TrendingDown,
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-950/20",
    href: "/projections/expenses",
  },
  {
    id: "capex",
    title: "Capex",
    description: "Estimez vos dépenses en capital et investissements en immobilisations futurs",
    icon: Calculator,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    href: "/projections/capex",
  },
  {
    id: "debt",
    title: "Financement",
    description: "Projetez vos emprunts, remboursements et structure de financement",
    icon: CreditCard,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
    href: "/projections/debt",
  },
  {
    id: "taxes",
    title: "Impôts",
    description: "Définissez le taux d'impôt applicable aux années projetées",
    icon: Percent,
    color: "text-rose-600",
    bgColor: "bg-rose-50 dark:bg-rose-950/20",
    href: "/projections/taxes",
  },
  {
    id: "bilan",
    title: "Bilan",
    description: "Ajustez les postes du bilan pour les années projetées",
    icon: Scale,
    color: "text-teal-600",
    bgColor: "bg-teal-50 dark:bg-teal-950/20",
    href: "/projections/bilan",
  },
]

export function ProjectionsCards() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projections.map((projection) => {
        const Icon = projection.icon
        const isHovered = hoveredCard === projection.id

        return (
          <Link key={projection.id} href={projection.href}>
            <Card
              className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-2 hover:border-primary/50"
              onMouseEnter={() => setHoveredCard(projection.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <CardContent className="p-6">
                <div className="flex flex-col h-full">
                  <div
                    className={`w-14 h-14 rounded-xl ${projection.bgColor} flex items-center justify-center mb-4 transition-transform duration-300 ${
                      isHovered ? "scale-110" : ""
                    }`}
                  >
                    <Icon className={`w-7 h-7 ${projection.color}`} />
                  </div>

                  <h3 className="text-xl font-semibold text-foreground mb-3 text-balance">{projection.title}</h3>

                  <p className="text-muted-foreground text-sm mb-6 flex-grow leading-relaxed text-pretty">
                    {projection.description}
                  </p>

                  <div className="flex items-center text-primary font-medium text-sm group-hover:gap-3 gap-2 transition-all duration-300">
                    <span>Consulter</span>
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
  )
}

