import type { CompanyDiagnostic } from "@/lib/api"
import { computeHealthIndex } from "@/lib/diagnostic-derive"
import { DEFAULT_BENCHMARK } from "@/lib/diagnostic-benchmarks"
import {
  formatDateFr,
  formatReferencePeriod,
  lifecycleLabel,
} from "@/components/diagnostic/diagnostic-format"
import { ModelisysWordmark } from "@/components/diagnostic/modelisys-wordmark"

interface DiagnosticReportCoverPageProps {
  diagnostic: CompanyDiagnostic
}

export function DiagnosticReportCoverPage({ diagnostic }: DiagnosticReportCoverPageProps) {
  const referenceLabel = formatReferencePeriod(
    diagnostic.reference_period.calendar_year,
    diagnostic.reference_period.calendar_month,
  )
  const health = computeHealthIndex(diagnostic, DEFAULT_BENCHMARK)

  return (
    <section
      data-testid="diagnostic-report-cover"
      className="print-sheet print-sheet-cover relative overflow-hidden bg-[#1F2430] text-[#E6D6C3]"
      aria-label="Page de couverture"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(224,116,45,0.14),_transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#E0742D] to-transparent"
      />

      <div className="relative flex min-h-[190mm] flex-col px-16 py-12 sm:px-20 sm:py-14">
        <header className="flex items-start justify-between gap-8">
          <div>
            <ModelisysWordmark variant="light" size="xl" />
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.34em] text-[#C9B8A5]/70">
              Diagnostic financier · Phase 1
            </p>
          </div>
          <div className="rounded-lg border border-[#E0742D]/30 bg-[#E0742D]/10 px-4 py-3 text-right">
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#E0742D]">
              Strictement confidentiel
            </p>
            <p className="mt-1 text-[10px] text-[#C9B8A5]/80">
              Usage interne et conseillers autorisés
            </p>
          </div>
        </header>

        <div className="my-10 h-px w-full bg-gradient-to-r from-[#E0742D] via-[#E0742D]/30 to-transparent" />

        <div className="flex flex-1 flex-col justify-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-[#E0742D]">
            Rapport de diagnostic financier
          </p>
          <h1 className="mt-6 max-w-4xl text-[42px] font-semibold leading-[1.02] tracking-[-0.03em] text-[#E6D6C3] sm:text-5xl">
            {diagnostic.company_name}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#C9B8A5]/90">
            Analyse intégrée de performance, structure financière, investissements et valeur —
            préparée selon les standards de reporting professionnel CPA · CBV · EEE.
          </p>

          <dl className="mt-12 grid max-w-4xl grid-cols-2 gap-x-12 gap-y-6 sm:grid-cols-4">
            <div>
              <dt className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#C9B8A5]/50">
                Préparé pour
              </dt>
              <dd className="mt-2 text-sm font-medium text-[#E6D6C3]">{diagnostic.company_name}</dd>
            </div>
            <div>
              <dt className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#C9B8A5]/50">
                Période de référence
              </dt>
              <dd className="mt-2 text-sm font-medium text-[#E6D6C3]">{referenceLabel}</dd>
            </div>
            <div>
              <dt className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#C9B8A5]/50">
                Exercice · Devise
              </dt>
              <dd className="mt-2 text-sm font-medium text-[#E6D6C3]">
                {diagnostic.latest_fiscal_year} · {diagnostic.currency}
              </dd>
            </div>
            <div>
              <dt className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#C9B8A5]/50">
                Indice de santé
              </dt>
              <dd className="mt-2 text-sm font-medium text-[#E6D6C3]">{health.score}/100</dd>
            </div>
          </dl>

          <p className="mt-8 text-sm text-[#C9B8A5]/75">
            Cycle de vie : {lifecycleLabel(diagnostic.summary.lifecycle_stage)}
          </p>
        </div>

        <footer className="mt-auto border-t border-white/10 pt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <p className="max-w-3xl text-[10px] leading-relaxed text-[#C9B8A5]/60">
              Document généré automatiquement par Modelisys à partir des données financières
              consolidées. À titre informatif uniquement — ne constitue pas une opinion
              professionnelle ni une évaluation formelle.
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
