import type { CompanyDiagnostic } from "@/lib/api"
import { formatReportSectionMeta } from "@/components/diagnostic/diagnostic-format"
import { ModelisysWordmark } from "@/components/diagnostic/modelisys-wordmark"
import {
  DIAGNOSTIC_PRINT_ANALYSES,
  reportAnalysisAnchorId,
  reportAnalysisDisplayTitle,
  type ReportPrintAnalysis,
} from "@/lib/diagnostic-report-chapters"
import { COMPANY_OVERVIEW_PRINT_INTRO_ID } from "@/lib/diagnostic-company-overview"

interface DiagnosticReportTableOfContentsProps {
  diagnostic: CompanyDiagnostic
}

function tocEntryTitle(analysis: ReportPrintAnalysis): string {
  return reportAnalysisDisplayTitle(analysis)
}

function TocEntry({
  href,
  number,
  title,
  subtitle,
  testId,
}: {
  href: string
  number: string
  title: string
  subtitle?: string
  testId?: string
}) {
  return (
    <li className="report-toc-entry">
      <a href={href} data-testid={testId} className="report-toc-link group">
        <span className="report-toc-number">{number}</span>
        <span className="report-toc-title-wrap">
          <span className="report-toc-title">{title}</span>
          {subtitle ? <span className="report-toc-desc">{subtitle}</span> : null}
        </span>
      </a>
    </li>
  )
}

export function DiagnosticReportTableOfContents({
  diagnostic,
}: DiagnosticReportTableOfContentsProps) {
  const sectionMeta = formatReportSectionMeta(
    diagnostic.company_name,
    diagnostic.reference_period.calendar_year,
    diagnostic.reference_period.calendar_month,
    diagnostic.currency,
  )

  const analysisEntries = DIAGNOSTIC_PRINT_ANALYSES.map((analysis, index) => ({
    key: analysis.viewId,
    href: `#${reportAnalysisAnchorId(analysis.viewId, "intro")}`,
    number: String(index + 2),
    title: tocEntryTitle(analysis),
    subtitle: analysis.intro.subtitle,
    testId: `diagnostic-report-toc-link-${analysis.viewId}`,
  }))

  const entries = [
    {
      key: "company-overview",
      href: `#${COMPANY_OVERVIEW_PRINT_INTRO_ID}`,
      number: "1",
      title: "Aperçu de l'entreprise",
      subtitle: "Informations générales et structure organisationnelle",
      testId: "diagnostic-report-toc-link-company-overview",
    },
    ...analysisEntries,
  ]

  const splitAt = Math.ceil(entries.length / 2)
  const leftColumn = entries.slice(0, splitAt)
  const rightColumn = entries.slice(splitAt)

  return (
    <section
      data-testid="diagnostic-report-toc"
      className="print-sheet print-sheet-toc bg-white text-[#2A2F3A]"
      aria-label="Table des matières"
    >
      <div className="print-page-inner flex flex-col">
        <header className="border-b border-slate-200 pb-6">
          <ModelisysWordmark variant="dark" size="md" />
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Table des matières
          </p>
          <p className="mt-2 text-sm text-slate-500">{sectionMeta}</p>
        </header>

        <nav aria-label="Analyses du rapport" className="report-toc-nav mt-6 flex-1">
          <div className="report-toc-columns">
            <ol className="report-toc-column">
              {leftColumn.map((entry) => (
                <TocEntry
                  key={entry.key}
                  href={entry.href}
                  number={entry.number}
                  title={entry.title}
                  subtitle={entry.subtitle}
                  testId={entry.testId}
                />
              ))}
            </ol>
            <ol className="report-toc-column">
              {rightColumn.map((entry) => (
                <TocEntry
                  key={entry.key}
                  href={entry.href}
                  number={entry.number}
                  title={entry.title}
                  subtitle={entry.subtitle}
                  testId={entry.testId}
                />
              ))}
            </ol>
          </div>
        </nav>
      </div>
    </section>
  )
}
