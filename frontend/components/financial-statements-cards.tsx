"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, TrendingUp, BarChart2, Wallet } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

const statements = [
  {
    id: "income-statement",
    title: "État des résultats",
    description: "Consultez vos revenus, dépenses et votre résultat net pour la période",
    icon: TrendingUp,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    href: "/financial-statements/income-statement",
  },
  {
    id: "balance-sheet",
    title: "Bilan",
    description: "Analysez vos actifs, passifs et capitaux propres à une date donnée",
    icon: BarChart2,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
    href: "/financial-statements/balance-sheet",
  },
  {
    id: "cash-flow",
    title: "Flux de trésorerie",
    description:
      "Suivez les mouvements de trésorerie de vos activités d'exploitation, d'investissement et de financement",
    icon: Wallet,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    href: "/financial-statements/cash-flow",
  },
]

export function FinancialStatementsCards() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {statements.map((statement) => {
        const Icon = statement.icon
        const isHovered = hoveredCard === statement.id

        return (
          <Link key={statement.id} href={statement.href}>
            <Card
              className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-2 hover:border-primary/50"
              onMouseEnter={() => setHoveredCard(statement.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <CardContent className="p-6">
                <div className="flex flex-col h-full">
                  <div
                    className={`w-14 h-14 rounded-xl ${statement.bgColor} flex items-center justify-center mb-4 transition-transform duration-300 ${
                      isHovered ? "scale-110" : ""
                    }`}
                  >
                    <Icon className={`w-7 h-7 ${statement.color}`} />
                  </div>

                  <h3 className="text-xl font-semibold text-foreground mb-3 text-balance">{statement.title}</h3>

                  <p className="text-muted-foreground text-sm mb-6 flex-grow leading-relaxed text-pretty">
                    {statement.description}
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
