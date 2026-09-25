import type { ComponentType } from "react"
import { Compass, Map, Rocket } from "lucide-react"

export type MiseEnPlaceStep = {
  step: number
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  approachPhase: string
  description: string
}

/** Phases Comprendre → Planifier → Exécuter (Mise en place + aperçu Nos services). */
export const MISE_EN_PLACE_STEPS: readonly MiseEnPlaceStep[] = [
  {
    step: 1,
    icon: Compass,
    title: "Lire ce qui crée — ou érode — la valeur",
    approachPhase: "Comprendre",
    description:
      "Nous partons de vos états financiers et de votre réalité opérationnelle pour isoler les dynamiques qui façonnent la valeur : performance, trésorerie, structure du capital et risques. L’objectif : une lecture claire avant toute décision.",
  },
  {
    step: 2,
    icon: Map,
    title: "Tracer la trajectoire et les leviers",
    approachPhase: "Planifier",
    description:
      "À partir de cette lecture, nous structurons les scénarios, les priorités et le plan d’action : quoi mesurer, quoi projeter, quoi ajuster. La planification relie le diagnostic aux décisions qui impactent réellement la valeur.",
  },
  {
    step: 3,
    icon: Rocket,
    title: "Mettre en œuvre et suivre les résultats",
    approachPhase: "Exécuter",
    description:
      "Nous déployons l’environnement, formons vos équipes et accompagnons l’exécution : suivi des indicateurs, écarts vs plan, et ajustements au fil du temps — pour que comprendre et planifier se traduisent en résultats.",
  },
]
