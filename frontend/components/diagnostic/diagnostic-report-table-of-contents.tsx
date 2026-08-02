import type { CompanyDiagnostic } from "@/lib/api"
import { formatReferencePeriod } from "@/components/diagnostic/diagnostic-format"
import { ModelisysWordmark } from "@/components/diagnostic/modelisys-wordmark"
import {
  DIAGNOSTIC_REPORT_CHAPTERS,
  reportChapterAnchorId,
} from "@/lib/diagnostic-report-chapters"

interface DiagnosticReportTableOfContentsProps {
  diagnostic: CompanyDiagnostic
}

export function DiagnosticReportTableOfContents({
  diagnostic,
}: DiagnosticReportTableOfContentsProps) {
  const referenceLabel = formatReferencePeriod(
    diagnostic.reference_period.calendar_year,
    diagnostic.reference_period.calendar_month,
  )

  const chapters = DIAGNOSTIC_REPORT_CHAPTERS.filter((c) => c.id !== "executive-global")

  return (
    <section
      data-testid="diagnostic-report-toc"
      className="print-sheet print-sheet-toc bg-white text-[#2A2F3A]"
      aria-label="Table des matières"
    >
      <div className="flex min-h-[190mm] flex-col px-16 py-12 sm:px-20 sm:py-14">
        <header className="border-b border-slate-200 pb-6">
          <ModelisysWordmark variant="dark" size="md" />
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Table des matières
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {diagnostic.company_name} · Réf. {referenceLabel}
          </p>
        </header>

        <nav aria-label="Chapitres du rapport" className="mt-10 flex-1">
          <ol className="space-y-0">
            <li className="report-toc-entry border-b border-slate-100 py-4">
              <a
                href={`#${reportChapterAnchorId("executive-global")}`}
                data-testid="diagnostic-report-toc-link-executive-summary"
                className="group flex gap-5 no-underline"
              >
                <span className="w-8 shrink-0 text-sm font-semibold tabular-nums text-[#E0742D]">
                  —
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-[#2A2F3A] group-hover:text-[#E0742D]">
                    Sommaire exécutif
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                    Synthèse transversale et points d&apos;attention prioritaires.
                  </p>
                </div>
              </a>
            </li>
            {chapters.map((chapter) => {
              const Icon = chapter.icon
              return (
                <li
                  key={chapter.id}
                  className="report-toc-entry border-b border-slate-100 py-5 last:border-b-0"
                >
                  <a
                    href={`#${reportChapterAnchorId(chapter.id)}`}
                    data-testid={`diagnostic-report-toc-link-${chapter.id}`}
                    className="group flex gap-5 no-underline"
                  >
                    <span className="w-8 shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-[#E0742D]">
                      {String(chapter.number).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Icon
                          className="h-4 w-4 text-slate-400 group-hover:text-[#E0742D]"
                          strokeWidth={1.5}
                          aria-hidden
                        />
                        <p className="text-base font-semibold text-[#2A2F3A] group-hover:text-[#E0742D]">
                          {chapter.title}
                        </p>
                      </div>
                      <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500">
                        {chapter.description}
                      </p>
                    </div>
                  </a>
                </li>
              )
            })}
          </ol>
        </nav>
      </div>
    </section>
  )
}
