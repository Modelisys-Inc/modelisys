"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, DollarSign, Calculator, Calendar, BarChart2, Package, Users, ShoppingCart } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

const analyses = [
  {
    id: "working-capital",
    title: "Fonds de roulement",
    description: "Analysez votre fonds de roulement et votre besoin en fonds de roulement pour optimiser votre trésorerie",
    icon: DollarSign,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
    href: "/analysis/working-capital",
  },
  {
    id: "capex",
    title: "Capex",
    description: "Suivez vos dépenses en capital et analysez vos investissements en immobilisations",
    icon: Calculator,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    href: "/analysis/capex",
  },
  {
    id: "seasonality",
    title: "Saisonnalité",
    description: "Identifiez les tendances saisonnières dans vos revenus et dépenses pour mieux planifier",
    icon: Calendar,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
    href: "/analysis/seasonality",
  },
  {
    id: "ratios",
    title: "Ratios",
    description: "Calculez et analysez les ratios financiers clés pour évaluer la performance de votre entreprise",
    icon: BarChart2,
    color: "text-rose-600",
    bgColor: "bg-rose-50 dark:bg-rose-950/20",
    href: "/analysis/ratios",
  },
  {
    id: "product-margin",
    title: "Marge par produits",
    description: "Analysez la rentabilité de chaque produit et identifiez vos produits les plus performants",
    icon: Package,
    color: "text-teal-600",
    bgColor: "bg-teal-50 dark:bg-teal-950/20",
    href: "/analysis/product-margin",
  },
  {
    id: "revenue-by-customer",
    title: "Revenus par clients",
    description: "Visualisez la contribution de chaque client à vos revenus et identifiez vos clients clés",
    icon: Users,
    color: "text-sky-600",
    bgColor: "bg-sky-50 dark:bg-sky-950/20",
    href: "/analysis/revenue-by-customer",
  },
  {
    id: "purchases-by-supplier",
    title: "Achats par fournisseur",
    description: "Analysez vos dépenses par fournisseur et optimisez votre chaîne d'approvisionnement",
    icon: ShoppingCart,
    color: "text-pink-600",
    bgColor: "bg-pink-50 dark:bg-pink-950/20",
    href: "/analysis/purchases-by-supplier",
  },
]

export function AnalysisCards() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {analyses.map((analysis) => {
        const Icon = analysis.icon
        const isHovered = hoveredCard === analysis.id

        return (
          <Link key={analysis.id} href={analysis.href}>
            <Card
              className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-2 hover:border-primary/50"
              onMouseEnter={() => setHoveredCard(analysis.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <CardContent className="p-6">
                <div className="flex flex-col h-full">
                  <div
                    className={`w-14 h-14 rounded-xl ${analysis.bgColor} flex items-center justify-center mb-4 transition-transform duration-300 ${
                      isHovered ? "scale-110" : ""
                    }`}
                  >
                    <Icon className={`w-7 h-7 ${analysis.color}`} />
                  </div>

                  <h3 className="text-xl font-semibold text-foreground mb-3 text-balance">{analysis.title}</h3>

                  <p className="text-muted-foreground text-sm mb-6 flex-grow leading-relaxed text-pretty">
                    {analysis.description}
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

