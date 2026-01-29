"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Coins, DollarSign, PieChart, BarChart3 } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

const evaluations = [
  {
    id: "ccf",
    title: "CCF",
    description: "Calculez le flux de trésorerie disponible pour l'entreprise (Free Cash Flow to Firm)",
    icon: Coins,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/20",
    href: "/evaluation/ccf",
  },
  {
    id: "dcf",
    title: "DCF",
    description: "Évaluez votre entreprise avec la méthode d'actualisation des flux de trésorerie",
    icon: DollarSign,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
    href: "/evaluation/dcf",
  },
  {
    id: "vca",
    title: "VCA",
    description: "Déterminez la valeur d'entreprise ajustée et la valeur des capitaux propres",
    icon: PieChart,
    color: "text-violet-600",
    bgColor: "bg-violet-50 dark:bg-violet-950/20",
    href: "/evaluation/vca",
  },
  {
    id: "business-model",
    title: "Modèle d'affaires",
    description: "Analysez et validez votre modèle d'affaires avec des indicateurs clés de performance",
    icon: BarChart3,
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
    href: "/evaluation/business-model",
  },
]

export function EvaluationCards() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {evaluations.map((evaluation) => {
        const Icon = evaluation.icon
        const isHovered = hoveredCard === evaluation.id

        return (
          <Link key={evaluation.id} href={evaluation.href}>
            <Card
              className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-2 hover:border-primary/50"
              onMouseEnter={() => setHoveredCard(evaluation.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <CardContent className="p-6">
                <div className="flex flex-col h-full">
                  <div
                    className={`w-14 h-14 rounded-xl ${evaluation.bgColor} flex items-center justify-center mb-4 transition-transform duration-300 ${
                      isHovered ? "scale-110" : ""
                    }`}
                  >
                    <Icon className={`w-7 h-7 ${evaluation.color}`} />
                  </div>

                  <h3 className="text-xl font-semibold text-foreground mb-3 text-balance">{evaluation.title}</h3>

                  <p className="text-muted-foreground text-sm mb-6 flex-grow leading-relaxed text-pretty">
                    {evaluation.description}
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

