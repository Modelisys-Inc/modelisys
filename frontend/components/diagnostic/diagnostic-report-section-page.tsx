import type { ReactNode } from "react"
import { ModelisysWordmark } from "@/components/diagnostic/modelisys-wordmark"

interface DiagnosticReportSectionPageProps {
  id: string
  sectionNumber: string
  sectionTitle: string
  companyName: string
  sectionMeta: string
  isFirstContentSection: boolean
  className?: string
  children: ReactNode
}

export function DiagnosticReportSectionPage({
  id,
  sectionNumber,
  sectionTitle,
  companyName,
  sectionMeta,
  isFirstContentSection,
  className = "",
  children,
}: DiagnosticReportSectionPageProps) {
  const testIdSuffix = id.replace("report-chapter-", "").replace("report-section-", "")

  return (
    <section
      id={id}
      data-report-section
      data-testid={`diagnostic-report-section-${testIdSuffix}`}
      className={`print-content-section print-chapter-content flex flex-col ${isFirstContentSection ? "" : "print-content-section-break"} ${className}`.trim()}
    >
      <header className="print-section-header report-avoid-break">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold tabular-nums text-[#E0742D]">
                {sectionNumber}
              </span>
              <span className="h-3.5 w-px bg-slate-200" aria-hidden />
              <p className="text-[13px] font-semibold text-[#2A2F3A]">{sectionTitle}</p>
            </div>
            <p className="mt-1 text-[10px] text-slate-500">{sectionMeta}</p>
          </div>
          <ModelisysWordmark variant="dark" size="sm" className="shrink-0 opacity-75" />
        </div>
        <div className="mt-2.5 h-0.5 w-14 bg-[#E0742D]" aria-hidden />
      </header>

      <div className="print-section-body min-h-0 flex-1">{children}</div>

      <footer className="print-section-footer report-avoid-break shrink-0">
        <ModelisysWordmark variant="dark" size="sm" className="!text-[9px] opacity-70" />
        <span className="text-center">
          {companyName} · Confidentiel · {sectionTitle}
        </span>
        <span className="print-section-footer-page tabular-nums" aria-hidden />
      </footer>
    </section>
  )
}
