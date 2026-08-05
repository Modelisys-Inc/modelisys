import type { CompanyDiagnostic } from "@/lib/api"
import {
  formatDateFr,
  formatReferenceDateEndOfMonth,
  lifecycleLabel,
} from "@/components/diagnostic/diagnostic-format"
import { ModelisysWordmark } from "@/components/diagnostic/modelisys-wordmark"

interface DiagnosticReportCoverPageProps {
  diagnostic: CompanyDiagnostic
}

export function DiagnosticReportCoverPage({ diagnostic }: DiagnosticReportCoverPageProps) {
  const referenceDateLabel = formatReferenceDateEndOfMonth(
    diagnostic.reference_period.calendar_year,
    diagnostic.reference_period.calendar_month,
  )

  const metaCards = [
    { label: "Préparé pour", value: diagnostic.company_name },
    { label: "Date de référence", value: referenceDateLabel },
    {
      label: "Devise",
      value: diagnostic.currency,
    },
  ]

  return (
    <section
      data-testid="diagnostic-report-cover"
      className="print-sheet print-sheet-cover relative overflow-hidden bg-[#2A2F3A] text-[#E6D6C3]"
      aria-label="Page de couverture"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-28 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(224,116,45,0.14),_transparent_58%)]"
      />

      <div className="print-page-inner relative flex flex-col">
        <header className="flex items-start justify-between gap-6">
          <div>
            <ModelisysWordmark variant="light" size="xl" />
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.34em] text-[#C9B8A5]/70">
              Système d&apos;exploitation financier
            </p>
          </div>
          <div className="rounded border border-[#E0742D]/35 bg-[#E0742D]/10 px-4 py-2.5 text-right">
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#E0742D]">
              Strictement confidentiel
            </p>
            <p className="mt-1 text-[9px] text-[#C9B8A5]/55">Usage exclusif du mandataire</p>
          </div>
        </header>

        <div className="my-8 h-px w-full bg-gradient-to-r from-[#E0742D] via-[#E0742D]/25 to-transparent" />

        <div className="flex flex-1 flex-col justify-center py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-[#E0742D]">
            Rapport de diagnostic financier
          </p>
          <h1 className="report-cover-title mt-5 max-w-3xl font-semibold leading-[1.05] tracking-[-0.03em] text-[#E6D6C3]">
            {diagnostic.company_name}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#C9B8A5]/90">
            Diagnostic stratégique offrant une analyse intégrée de la performance financière, de la
            rentabilité, de la structure financière, de la capacité de création de liquidités et de la
            valeur de l&apos;entreprise.
          </p>
          <p className="mt-4 text-sm text-[#C9B8A5]/70">
            Cycle de vie : {lifecycleLabel(diagnostic.summary.lifecycle_stage)}
          </p>
        </div>

        <div className="report-cover-meta-row mt-auto grid grid-cols-1 gap-3 sm:grid-cols-3">
          {metaCards.map((card) => (
            <div
              key={card.label}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3.5 backdrop-blur-sm"
            >
              <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-[#C9B8A5]/55">
                {card.label}
              </p>
              <p className="mt-1.5 text-sm font-medium leading-snug text-[#E6D6C3]">{card.value}</p>
            </div>
          ))}
        </div>

        <footer className="mt-8 border-t border-white/10 pt-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="max-w-2xl text-[10px] leading-relaxed text-[#C9B8A5]/60">
              Document généré par Modelisys — à titre informatif uniquement. Ce rapport ne constitue
              pas un avis d&apos;audit, de certification ou de valorisation formelle.
            </p>
            <p className="text-[10px] font-medium text-[#C9B8A5]/50">
              {formatDateFr(diagnostic.generated_at)}
            </p>
          </div>
        </footer>
      </div>
    </section>
  )
}
