import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Lightbulb, Target } from "lucide-react"
import {
  reportToneClasses,
  type ReportChapterTone,
} from "@/lib/diagnostic-report-chapters"

/** Résumé exécutif court (2–3 lignes) en tête de chapitre */
export function ReportExecutiveBrief({ children }: { children: ReactNode }) {
  return (
    <div className="report-executive-brief">
      <p className="report-label">Résumé exécutif</p>
      <div className="report-executive-brief-body">{children}</div>
    </div>
  )
}

/** Observations automatiques issues des narratifs */
export function ReportObservations({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <div className="report-observations report-avoid-break">
      <p className="report-label">Observations automatiques</p>
      <ul className="report-observations-list">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

/** Encadré « Ce qu'il faut retenir » */
export function ReportKeyTakeaways({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <div className="report-key-takeaways report-avoid-break">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-[#E0742D]" aria-hidden />
        <p className="report-label !mb-0">Ce qu&apos;il faut retenir</p>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-[#2A2F3A]">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E0742D]" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Encadré final « Points clés » */
export function ReportPointsCles({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <div className="report-points-cles report-avoid-break">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-[#2A2F3A]" aria-hidden />
        <p className="report-label !mb-0">Points clés</p>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] leading-relaxed text-slate-700"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Carte de constat avec couleur d'état */
export function ReportInsightCard({
  tone,
  title,
  body,
}: {
  tone: ReportChapterTone
  title: string
  body: string
}) {
  const c = reportToneClasses(tone)
  return (
    <div className={`report-insight-card report-avoid-break border ${c.border} ${c.bg}`}>
      <div className="flex items-start gap-2.5">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${c.dot}`} aria-hidden />
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${c.text}`}>
            {title}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#2A2F3A]">{body}</p>
        </div>
      </div>
    </div>
  )
}

/** Zone graphique agrandie */
export function ReportChartExhibit({
  title,
  children,
}: {
  title?: string
  children: ReactNode
}) {
  return (
    <div className="report-chart-exhibit report-avoid-break">
      {title ? <p className="report-label">{title}</p> : null}
      <div className="report-chart-exhibit-body">{children}</div>
    </div>
  )
}

/** Page d'introduction de chapitre */
export function ReportChapterIntroPage({
  number,
  title,
  subtitle,
  description,
  icon: Icon,
}: {
  number: number
  title: string
  subtitle: string
  description: string
  icon: LucideIcon
}) {
  return (
    <section
      className="print-sheet print-chapter-intro"
      data-testid={`report-chapter-intro-${number}`}
      aria-label={`Introduction — ${title}`}
    >
      <div className="flex min-h-[190mm] flex-col justify-between px-16 py-14">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#E0742D]">
            Chapitre {String(number).padStart(2, "0")}
          </p>
          <div className="mt-8 flex items-start gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#E0742D]/25 bg-[#E0742D]/8">
              <Icon className="h-7 w-7 text-[#E0742D]" strokeWidth={1.5} aria-hidden />
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.02em] text-[#2A2F3A]">{title}</h2>
              <p className="mt-2 text-base text-slate-500">{subtitle}</p>
            </div>
          </div>
          <div className="mt-10 h-px w-24 bg-[#E0742D]" aria-hidden />
          <p className="mt-10 max-w-3xl text-[15px] leading-[1.75] text-slate-600">{description}</p>
        </div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
          Analyse détaillée — page suivante
        </p>
      </div>
    </section>
  )
}

/** Titre de section dans le corps du chapitre */
export function ReportSectionTitle({
  number,
  title,
  icon: Icon,
}: {
  number: number
  title: string
  icon: LucideIcon
}) {
  return (
    <header className="report-section-title report-avoid-break">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-[#E0742D]" strokeWidth={1.5} aria-hidden />
        <span className="text-xs font-semibold tabular-nums text-[#E0742D]">
          {String(number).padStart(2, "0")}
        </span>
        <h2 className="text-xl font-semibold tracking-[-0.01em] text-[#2A2F3A]">{title}</h2>
      </div>
    </header>
  )
}
