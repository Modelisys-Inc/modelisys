import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { ArrowRight, Lightbulb, Target } from "lucide-react"
import { ModelisysWordmark } from "@/components/diagnostic/modelisys-wordmark"
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

/** Page d'introduction de chapitre — alignée sur la couverture du rapport. */
export function ReportChapterIntroPage({
  id,
  analysisNumber,
  title,
  subtitle,
  description,
  companyName,
  testId,
}: {
  id?: string
  analysisNumber: number
  title: string
  subtitle: string
  description: string
  companyName: string
  testId?: string
}) {
  const analysisLabel = String(analysisNumber).padStart(2, "0")

  return (
    <section
      id={id}
      className="print-sheet print-chapter-intro print-sheet-analysis-intro relative overflow-hidden bg-[#2A2F3A] text-[#E6D6C3]"
      data-testid={testId ?? `report-chapter-intro-${analysisLabel}`}
      aria-label={`Introduction — ${title}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-24 h-[360px] w-[360px] rounded-full bg-white/5 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(224,116,45,0.12),_transparent_55%)]"
      />

      <div className="print-page-inner relative flex flex-col">
        <header>
          <p className="report-analysis-intro-company text-xl font-semibold tracking-tight text-[#E6D6C3] md:text-2xl">
            {companyName}
          </p>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.34em] text-[#C9B8A5]/70">
            Diagnostic financier
          </p>
        </header>

        <div
          className="my-6 h-px w-full bg-gradient-to-r from-[#E0742D] via-[#E0742D]/25 to-transparent"
          aria-hidden
        />

        <div className="flex flex-1 flex-col justify-center py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-[#E0742D]">
            Analyse {analysisLabel}
          </p>
          <h2 className="report-analysis-intro-title mt-5 max-w-3xl font-semibold leading-[1.08] tracking-[-0.03em] text-[#E6D6C3]">
            {title}
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[#C9B8A5]/90">{subtitle}</p>
          <p className="report-analysis-intro-description mt-8 max-w-3xl text-[15px] leading-[1.8] text-[#C9B8A5]/75">
            {description}
          </p>
        </div>

        <footer className="report-analysis-intro-footer mt-auto border-t border-white/10 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[#C9B8A5]/55">
              <ArrowRight className="h-3.5 w-3.5 text-[#E0742D]" strokeWidth={2} aria-hidden />
              Graphiques et lecture détaillée — pages suivantes
            </p>
            <ModelisysWordmark variant="light" size="sm" className="shrink-0" />
          </div>
        </footer>
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
