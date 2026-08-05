import type { LucideIcon } from "lucide-react"

import {

  Activity,

  BarChart3,

  Building2,

  PiggyBank,

  TrendingUp,

  Wallet,

} from "lucide-react"

import type { DiagnosticReportView } from "@/components/diagnostic/v2/diagnostic-nav-rail"



export type ReportChapterTone = "positive" | "watch" | "risk" | "neutral"



export type ReportChapterId =

  | "performance"

  | "revenue"

  | "expenses"

  | "financial-position"

  | "working-capital"

  | "capex"



export interface ReportChapterDefinition {

  id: ReportChapterId

  number: number

  title: string

  subtitle: string

  description: string

  icon: LucideIcon

  executiveBlockIds: string[]

  chartViews: DiagnosticReportView[]

  introPage: boolean

}



/** Chapitres du rapport imprimé (Performance financière → Capex uniquement). */

export const DIAGNOSTIC_REPORT_CHAPTERS: ReportChapterDefinition[] = [

  {

    id: "performance",

    number: 1,

    title: "Performance financière",

    subtitle: "Rentabilité et trajectoire opérationnelle",

    description:

      "Analyse de la croissance du chiffre d'affaires, des marges EBITDA et du résultat net sur l'horizon disponible.",

    icon: TrendingUp,

    executiveBlockIds: ["performance"],

    chartViews: ["performance"],

    introPage: false,

  },

  {

    id: "revenue",

    number: 2,

    title: "Revenus",

    subtitle: "Dynamique commerciale et mix de marges",

    description:

      "Évolution des revenus et contribution par ligne de revenus — identification des moteurs et des lignes à surveiller.",

    icon: BarChart3,

    executiveBlockIds: ["revenue", "margin-by-revenue"],

    chartViews: ["revenue", "margin-by-revenue"],

    introPage: false,

  },

  {

    id: "expenses",

    number: 3,

    title: "Dépenses",

    subtitle: "Structure de coûts et rentabilité par division",

    description:

      "Pont entre marge brute et EBITDA, analyse des charges d'exploitation et performance divisionnelle.",

    icon: Wallet,

    executiveBlockIds: ["expenses", "expenses-by-division"],

    chartViews: ["expenses", "expenses-by-division"],

    introPage: false,

  },

  {

    id: "financial-position",

    number: 4,

    title: "Situation financière",

    subtitle: "Structure du bilan et solidité patrimoniale",

    description: "Composition de l'actif et du passif et évolution des capitaux propres.",

    icon: Building2,

    executiveBlockIds: ["financial-position"],

    chartViews: ["financial-position"],

    introPage: false,

  },

  {

    id: "working-capital",

    number: 5,

    title: "Fonds de roulement",

    subtitle: "Liquidité opérationnelle et cycle de trésorerie",

    description:

      "Fonds de roulement net, délais et ratios de liquidité — capacité à financer le cycle d'exploitation.",

    icon: PiggyBank,

    executiveBlockIds: ["working-capital"],

    chartViews: ["working-capital"],

    introPage: false,

  },

  {

    id: "capex",

    number: 6,

    title: "Investissements (CAPEX)",

    subtitle: "Capacité d'investissement et intensité capitalistique",

    description:

      "Évolution des dépenses d'investissement et rapport CAPEX / revenus.",

    icon: Activity,

    executiveBlockIds: ["capex"],

    chartViews: ["capex"],

    introPage: false,

  },

]



export type ReportPrintAnalysisView = Exclude<
  DiagnosticReportView,
  "sommaire" | "company-overview"
>



export interface ReportPrintAnalysis {
  viewId: ReportPrintAnalysisView
  sectionNumber: number
  sectionTitle: string
  /** Sous-vue (ex. Marge par revenus sous Revenus). */
  viewSubtitle?: string
  intro: {
    title: string
    subtitle: string
    description: string
  }
}



/** Une entrée = une paire de pages (graphique + lecture) dans le rapport imprimé. */

export const DIAGNOSTIC_PRINT_ANALYSES: ReportPrintAnalysis[] = [
  {
    viewId: "performance",
    sectionNumber: 1,
    sectionTitle: "Performance financière",
    intro: {
      title: "Performance financière",
      subtitle: "Rentabilité et trajectoire opérationnelle",
      description:
        "Cette analyse présente l'évolution du chiffre d'affaires, des marges EBITDA et du résultat net sur l'horizon disponible. Les graphiques et la lecture commentent la trajectoire globale de la société.",
    },
  },
  {
    viewId: "revenue",
    sectionNumber: 2,
    sectionTitle: "Revenus",
    intro: {
      title: "Revenus",
      subtitle: "Dynamique commerciale et niveau d'activité",
      description:
        "Cette section examine la croissance du chiffre d'affaires, la composition des sources de revenus et leur évolution dans le temps. Elle pose le contexte avant l'analyse de marge par ligne de revenus.",
    },
  },
  {
    viewId: "margin-by-revenue",
    sectionNumber: 2,
    sectionTitle: "Revenus",
    viewSubtitle: "Marge par revenus",
    intro: {
      title: "Marge par revenus",
      subtitle: "Revenus — Contribution marginale et coûts variables",
      description:
        "Analyse de la marge contributive par source de revenus : coûts variables, part dans le chiffre d'affaires et positionnement relatif de chaque ligne. Complète la lecture des revenus par une vue rentabilité à la source.",
    },
  },
  {
    viewId: "expenses",
    sectionNumber: 3,
    sectionTitle: "Dépenses",
    intro: {
      title: "Dépenses",
      subtitle: "Structure de coûts et pont de rentabilité",
      description:
        "Pont entre marge brute et EBITDA, ventilation des coûts variables et fixes, et seuil de rentabilité. Cette analyse éclaire la structure des charges d'exploitation de la société.",
    },
  },
  {
    viewId: "expenses-by-division",
    sectionNumber: 3,
    sectionTitle: "Dépenses",
    viewSubtitle: "Rentabilité par division",
    intro: {
      title: "Rentabilité par division",
      subtitle: "Dépenses — Performance par centre d'activité",
      description:
        "Revenus, coûts variables et fixes, marge contributive et bénéfice d'exploitation par division. Permet de comparer la rentabilité relative des centres d'activité de la société.",
    },
  },
  {
    viewId: "financial-position",
    sectionNumber: 4,
    sectionTitle: "Situation financière",
    intro: {
      title: "Situation financière",
      subtitle: "Structure du bilan et solidité patrimoniale",
      description:
        "Composition de l'actif et du passif, évolution des capitaux propres et lecture détaillée par poste de bilan sur cinq exercices.",
    },
  },
  {
    viewId: "working-capital",
    sectionNumber: 5,
    sectionTitle: "Fonds de roulement",
    intro: {
      title: "Fonds de roulement",
      subtitle: "Liquidité opérationnelle et cycle de trésorerie",
      description:
        "Fonds de roulement net, délais clients et fournisseurs, ratios de liquidité et structure en pourcentage des revenus — capacité à financer le cycle d'exploitation.",
    },
  },
  {
    viewId: "capex",
    sectionNumber: 6,
    sectionTitle: "Investissements (CAPEX)",
    intro: {
      title: "Investissements (CAPEX)",
      subtitle: "Capacité d'investissement et intensité capitalistique",
      description:
        "Évolution des dépenses d'investissement, ratios d'intensité capitalistique et rapport CAPEX / revenus sur l'horizon analysé.",
    },
  },
]



const LECTURE_TITLES: Record<ReportPrintAnalysisView, string> = {

  performance: "Lecture de la performance",

  revenue: "Lecture de la performance",

  "margin-by-revenue": "Lecture de la contribution marginale par revenus",

  expenses: "Lecture de la performance",

  "expenses-by-division": "Lecture de la rentabilité par division",

  "financial-position": "Lecture de la situation financière",

  "working-capital": "Lecture du fonds de roulement",

  capex: "Lecture des Capex",

}



export function reportAnalysisLectureTitle(viewId: ReportPrintAnalysisView): string {

  return LECTURE_TITLES[viewId]

}



/** Titre affiché dans la TdM et les pages d'introduction (Section - Sous-titre). */

export function reportAnalysisDisplayTitle(analysis: ReportPrintAnalysis): string {

  if (analysis.viewSubtitle) {

    return `${analysis.sectionTitle} - ${analysis.viewSubtitle}`

  }

  return analysis.intro.title

}



/** Numéro de section aligné sur la table des matières (01…n). */

export function reportAnalysisSectionNumber(analysisIndex: number): string {
  return String(analysisIndex + 2).padStart(2, "0")
}



export function reportAnalysisAnchorId(
  viewId: ReportPrintAnalysisView,
  part: "intro" | "chart" | "lecture",
): string {
  return `report-${viewId}-${part}`
}

export function reportAnalysisIcon(viewId: ReportPrintAnalysisView): LucideIcon {
  switch (viewId) {
    case "performance":
      return TrendingUp
    case "revenue":
    case "margin-by-revenue":
      return BarChart3
    case "expenses":
    case "expenses-by-division":
      return Wallet
    case "financial-position":
      return Building2
    case "working-capital":
      return PiggyBank
    case "capex":
      return Activity
    default:
      return TrendingUp
  }
}



/** @deprecated Utiliser reportAnalysisAnchorId */

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


