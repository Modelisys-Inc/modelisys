import type { CompanyDiagnostic } from "@/lib/api"
import { formatReportSectionMeta } from "@/components/diagnostic/diagnostic-format"
import { ModelisysWordmark } from "@/components/diagnostic/modelisys-wordmark"
import {
  DIAGNOSTIC_PRINT_ANALYSES,
  reportAnalysisAnchorId,
} from "@/lib/diagnostic-report-chapters"

interface DiagnosticReportTableOfContentsProps {
  diagnostic: CompanyDiagnostic
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
          <ol className="report-toc-grid">
            {DIAGNOSTIC_PRINT_ANALYSES.map((analysis) => {
              const label =
                analysis.viewSubtitle != null
                  ? `${analysis.sectionTitle} — ${analysis.viewSubtitle}`
                  : analysis.sectionTitle

              return (
                <TocEntry
                  key={analysis.viewId}
                  href={`#${reportAnalysisAnchorId(analysis.viewId, "intro")}`}
                  number={String(analysis.sectionNumber).padStart(2, "0")}
                  title={label}
                  subtitle={analysis.intro.subtitle}
                  testId={`diagnostic-report-toc-link-${analysis.viewId}`}
                />
              )
            })}
          </ol>
        </nav>
      </div>
    </section>
  )
}
