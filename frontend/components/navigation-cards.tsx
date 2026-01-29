"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, FileSpreadsheet, BarChart3, Upload } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

const categories = [
  {
    id: "accounting-mapping",
    title: "Mapping de la comptabilité",
    description: "Configurez et gérez les correspondances entre vos comptes comptables",
    icon: FileSpreadsheet,
    color: "text-primary",
    bgColor: "bg-primary/10",
    href: "/settings/accounting-mapping",
  },
  {
    id: "financial-statements",
    title: "Mapping de l'états financiers",
    description: "Définissez les mappings pour vos états financiers et rapports",
    icon: BarChart3,
    color: "text-accent",
    bgColor: "bg-accent/10",
    href: "/financial-statements",
  },
  {
    id: "trial-balance",
    title: "Importation de la balance de vérification",
    description: "Importez et validez vos balances de vérification rapidement",
    icon: Upload,
    color: "text-primary",
    bgColor: "bg-primary/10",
    href: "#",
  },
]

export function NavigationCards() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {categories.map((category) => {
        const Icon = category.icon
        const isHovered = hoveredCard === category.id

        return (
          <Link key={category.id} href={category.href}>
            <Card
              className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border border-slate-200 hover:border-slate-300 bg-white"
              onMouseEnter={() => setHoveredCard(category.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <CardContent className="p-8">
                <div className="flex flex-col h-full">
                  <div
                    className={`w-16 h-16 rounded-xl bg-slate-100 group-hover:bg-slate-800 flex items-center justify-center mb-5 transition-all duration-300 ${
                      isHovered ? "scale-110 shadow-lg" : ""
                    }`}
                  >
                    <Icon className={`w-8 h-8 text-slate-700 group-hover:text-white transition-colors duration-300`} />
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-3 text-balance">{category.title}</h3>

                  <p className="text-slate-600 text-sm mb-6 flex-grow leading-relaxed text-pretty">
                    {category.description}
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
  )
}
