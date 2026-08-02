import type { LucideIcon } from "lucide-react"
import {
  Activity,
  BarChart3,
  Building2,
  Coins,
  LineChart,
  PiggyBank,
  Scale,
  TrendingUp,
  Wallet,
} from "lucide-react"
import type { DiagnosticReportView } from "@/components/diagnostic/v2/diagnostic-nav-rail"

export type ReportChapterTone = "positive" | "watch" | "risk" | "neutral"

export type ReportChapterId =
  | "executive-global"
  | "performance"
  | "revenue"
  | "expenses"
  | "financial-position"
  | "working-capital"
  | "capex"
  | "cashflow"
  | "valuation"

export interface ReportChapterDefinition {
  id: ReportChapterId
  number: number
  title: string
  subtitle: string
  /** Description longue pour le sommaire professionnel */
  description: string
  icon: LucideIcon
  /** Blocs du sommaire exécutif (`buildExecutiveSummary`) associés */
  executiveBlockIds: string[]
  /** Vues graphiques du rapport interactif (si applicable) */
  chartViews: DiagnosticReportView[]
  /** Chapitre avec page d'introduction dédiée */
  introPage: boolean
}

/** Grandes sections du rapport diagnostic — structure cabinet de conseil */
export const DIAGNOSTIC_REPORT_CHAPTERS: ReportChapterDefinition[] = [
  {
    id: "executive-global",
    number: 0,
    title: "Sommaire exécutif",
    subtitle: "Vue d'ensemble et points d'attention",
    description:
      "Synthèse transversale de la performance, de la structure financière et des principaux signaux de vigilance identifiés à la date de référence.",
    icon: LineChart,
    executiveBlockIds: [],
    chartViews: [],
    introPage: false,
  },
  {
    id: "performance",
    number: 1,
    title: "Performance financière",
    subtitle: "Rentabilité et trajectoire opérationnelle",
    description:
      "Analyse de la croissance du chiffre d'affaires, des marges EBITDA et du résultat net sur l'horizon disponible, avec lecture des écarts sectoriels.",
    icon: TrendingUp,
    executiveBlockIds: ["performance"],
    chartViews: ["performance"],
    introPage: true,
  },
  {
    id: "revenue",
    number: 2,
    title: "Revenus",
    subtitle: "Dynamique commerciale et mix de marges",
    description:
      "Évolution des revenus, saisonnalité implicite et contribution par ligne de revenus — identification des moteurs et des lignes à surveiller.",
    icon: BarChart3,
    executiveBlockIds: ["revenue", "margin-by-revenue"],
    chartViews: ["revenue", "margin-by-revenue"],
    introPage: true,
  },
  {
    id: "expenses",
    number: 3,
    title: "Dépenses",
    subtitle: "Structure de coûts et rentabilité par division",
    description:
      "Pont entre marge brute et EBITDA, analyse des charges d'exploitation et performance divisionnelle pour isoler les leviers de marge.",
    icon: Wallet,
    executiveBlockIds: ["expenses", "expenses-by-division"],
    chartViews: ["expenses", "expenses-by-division"],
    introPage: true,
  },
  {
    id: "financial-position",
    number: 4,
    title: "Situation financière",
    subtitle: "Structure du bilan et solidité patrimoniale",
    description:
      "Composition de l'actif et du passif, évolution des capitaux propres et lecture du levier financier par rapport aux repères sectoriels.",
    icon: Building2,
    executiveBlockIds: ["financial-position"],
    chartViews: ["financial-position"],
    introPage: true,
  },
  {
    id: "working-capital",
    number: 5,
    title: "Fonds de roulement",
    subtitle: "Liquidité opérationnelle et cycle de trésorerie",
    description:
      "Fonds de roulement net, délais clients / stocks / fournisseurs et ratios de liquidité — capacité de l'entreprise à financer son cycle d'exploitation.",
    icon: PiggyBank,
    executiveBlockIds: ["working-capital"],
    chartViews: ["working-capital"],
    introPage: true,
  },
  {
    id: "capex",
    number: 6,
    title: "Investissements (CAPEX)",
    subtitle: "Capacité d'investissement et intensité capitalistique",
    description:
      "Évolution des dépenses d'investissement, rapport CAPEX / revenus et cohérence avec la trajectoire de croissance de l'entreprise.",
    icon: Activity,
    executiveBlockIds: [],
    chartViews: [],
    introPage: true,
  },
  {
    id: "cashflow",
    number: 7,
    title: "Flux de trésorerie",
    subtitle: "Génération de cash et conversion économique",
    description:
      "Lecture indicative des flux opérationnels dérivés (EBITDA, amortissement, investissements) en l'absence d'un état des flux détaillé dans ce rapport.",
    icon: Coins,
    executiveBlockIds: [],
    chartViews: [],
    introPage: true,
  },
  {
    id: "valuation",
    number: 8,
    title: "Valorisation",
    subtitle: "Fourchette indicative de valeur d'entreprise",
    description:
      "Approche par multiple d'EBITDA normalisé, fourchette de valeur d'entreprise et rappel des limites méthodologiques.",
    icon: Scale,
    executiveBlockIds: ["valorisation"],
    chartViews: [],
    introPage: true,
  },
]

export function reportChapterAnchorId(chapterId: ReportChapterId): string {
  return `report-chapter-${chapterId}`
}

export function toneFromChip(
  tone?: "positive" | "negative" | "watch" | "neutral",
): ReportChapterTone {
  if (tone === "positive") return "positive"
  if (tone === "negative") return "risk"
  if (tone === "watch") return "watch"
  return "neutral"
}

export function reportToneClasses(tone: ReportChapterTone): {
  border: string
  bg: string
  text: string
  dot: string
} {
  switch (tone) {
    case "positive":
      return {
        border: "border-emerald-200",
        bg: "bg-emerald-50/80",
        text: "text-emerald-900",
        dot: "bg-emerald-500",
      }
    case "watch":
      return {
        border: "border-amber-200",
        bg: "bg-amber-50/80",
        text: "text-amber-900",
        dot: "bg-amber-500",
      }
    case "risk":
      return {
        border: "border-red-200",
        bg: "bg-red-50/80",
        text: "text-red-900",
        dot: "bg-red-500",
      }
    default:
      return {
        border: "border-slate-200",
        bg: "bg-slate-50/80",
        text: "text-slate-700",
        dot: "bg-slate-400",
      }
  }
}
