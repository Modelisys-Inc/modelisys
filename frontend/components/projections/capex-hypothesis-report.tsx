"use client"

import { NetTangibleReportSection } from "@/components/net-tangible/report-section"
import { CapexForecastDetail } from "@/components/capex-forecast-detail"
import { CapexHypothesisAssumptionsSection } from "@/components/projections/capex-hypothesis-assumptions-section"
import { formatCurrency } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import type { Company } from "@/components/entity-selector"

export type CapexHypothesisOverviewMetric = {
  id: string
  label: string
  value: number | null
  hint?: string
}

const REPORT_NAV = [
  { id: "methode", label: "1. Méthode", testId: "capex-hypothesis-section-methode" },
  { id: "estimation", label: "2. Estimation", testId: "capex-hypothesis-section-estimation" },
  { id: "hypotheses", label: "3. Hypothèses", testId: "capex-hypothesis-section-hypotheses" },
] as const

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
}

function CapexMethodSection() {
  return (
    <NetTangibleReportSection id="methode" number="1." title="Méthode et périmètre">
      <p className="text-pretty text-sm leading-relaxed text-slate-500">
        Les hypothèses Capex projettent la valeur comptable des immobilisations (ALT-B, ALT-C,
        ALT-D) à partir des soldes historiques (exercice N-1 et YTD si la date de référence n&apos;est
        pas une clôture), puis appliquent ajouts, amortissement et financement pour chaque année
        projetée.
      </p>
      <p className="mt-4 text-pretty text-sm leading-relaxed text-slate-500">
        La démarche consiste à&nbsp;:
      </p>
      <ul className="mt-3 space-y-2 text-sm text-slate-500">
        <li className="flex gap-2">
          <span className="font-mono text-[#E0742D]">01</span>
          <span>
            Partir des soldes de clôture N-1 (coût et amortissement cumulé) pour ouvrir la première
            année projetée.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-mono text-[#E0742D]">02</span>
          <span>
            Définir le taux et la méthode d&apos;amortissement, puis les ajouts Capex (montant, %
            ou croissance) avec leur saisonnalité.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-mono text-[#E0742D]">03</span>
          <span>
            Choisir le financement de chaque ajustement (comptant, dette ou mixte) et le calendrier
            de décaissement.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-mono text-[#E0742D]">04</span>
          <span>
            Aligner VNC, dotation et dettes Capex sur le Pro Forma Bilan / Résultats et le panneau
            d&apos;impact.
          </span>
        </li>
      </ul>
      <p className="mt-5 text-pretty text-sm leading-relaxed text-slate-500">
        Relation fondamentale&nbsp;:
      </p>
      <p className="mt-3 rounded-md bg-slate-100/80 px-4 py-3 text-center font-mono text-sm text-[#2A2F3A]">
        VNC = Coût − Amort. cumulé · Coût += ajouts · Dotation = f(taux, méthode)
      </p>
    </NetTangibleReportSection>
  )
}

function CapexOverviewStrip({ metrics }: { metrics: CapexHypothesisOverviewMetric[] }) {
  return (
    <section
      data-testid="capex-hypothesis-overview-strip"
      data-break-avoid
      className="w-full border-b border-[#E6D6C3]/45 bg-gradient-to-b from-[#222732]/[0.025] to-white"
    >
      <div className="border-b border-[#E6D6C3]/40 bg-[#222732]/[0.02] px-6 py-5 sm:px-12">
        <div className="flex items-start gap-3">
          <div className="mt-1 h-10 w-1 shrink-0 rounded-full bg-[#E6D6C3]" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/90">
              Sommaire de la conclusion
            </p>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
              Synthèse de la VNC de référence et des ajouts Capex des premières années projetées.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto px-6 py-1 sm:px-12">
        <table className="w-full min-w-[420px]">
          <thead>
            <tr className="border-b border-[#E6D6C3]/55 text-left">
              <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Indicateur
              </th>
              <th className="py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Montant
              </th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => {
              const display =
                metric.value == null || !Number.isFinite(metric.value)
                  ? "—"
                  : formatCurrency(metric.value)
              return (
                <tr
                  key={metric.id}
                  data-testid={`capex-hypothesis-overview-${metric.id}`}
                  className="border-b border-slate-100 align-middle last:border-b-0"
                >
                  <td className="py-3 pr-4 text-sm font-medium text-[#222732]">{metric.label}</td>
                  <td className="py-3 text-right font-mono text-sm tabular-nums text-[#222732]">
                    {display}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export type CapexHypothesisReportProps = {
  companyName: string
  referenceLabel: string
  projectionName: string
  overviewMetrics: CapexHypothesisOverviewMetric[]
  companyId: string | null
  divisionId: string | null
  subDivisionId: string | null
  companies: Company[]
  projectionYears: 3 | 4 | 5
  projectionMode: "gl" | "account"
  projectionId: string
  forecastBaseYear: number
  referenceMonth: number
}

export function CapexHypothesisReport({
  companyName,
  referenceLabel,
  projectionName,
  overviewMetrics,
  companyId,
  divisionId,
  subDivisionId,
  companies,
  projectionYears,
  projectionMode,
  projectionId,
  forecastBaseYear,
  referenceMonth,
}: CapexHypothesisReportProps) {
  return (
    <article
      data-testid="capex-hypothesis-report"
      data-report-sheet
      className="overflow-hidden rounded-xl border border-[#E6D6C3]/35 bg-white shadow-[0_18px_50px_-28px_rgba(34,39,50,0.45)] ring-1 ring-[#222732]/[0.04]"
    >
      <CapexOverviewStrip metrics={overviewMetrics} />

      <div className="px-6 pb-8 pt-10 sm:px-12 sm:pb-12">
        <div className="mb-6" aria-hidden>
          <div className="h-px w-full bg-gradient-to-r from-[#E0742D]/80 via-[#E6D6C3]/50 to-transparent" />
        </div>

        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/90">
              Détail du rapport
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Documentez la méthode, projetez les Capex, puis relisez le sommaire des hypothèses.
            </p>
          </div>
        </div>

        <nav
          data-testid="capex-hypothesis-section-menu"
          aria-label="Sommaire du rapport"
          className="flex flex-wrap gap-1 border-b border-slate-200 pb-3"
        >
          {REPORT_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              data-testid={item.testId}
              onClick={() => scrollToSection(item.id)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-[#222732]/[0.03] hover:text-[#222732]",
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <CapexMethodSection />

        <NetTangibleReportSection
          id="estimation"
          number="2."
          title="Estimation des Capex annuels"
        >
          <p className="text-pretty text-sm leading-relaxed text-slate-500">
            Chaque poste d&apos;immobilisation peut faire l&apos;objet d&apos;un taux
            d&apos;amortissement, d&apos;ajouts Capex et d&apos;un financement. Cliquez une cellule
            d&apos;année projetée pour ouvrir le panneau. Les modifications sont enregistrées
            automatiquement.
          </p>
          <div className="mt-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Capex projetés
            </p>
            <CapexForecastDetail
              period="annual"
              view="years"
              columnMode="comparison"
              companyId={companyId}
              divisionId={divisionId}
              subDivisionId={subDivisionId}
              companies={companies}
              title="Estimation des Capex annuels"
              embedInReport
              hideHeaderIcon
              fiscalYear={forecastBaseYear}
              refMonth={referenceMonth}
              forecastBaseYear={forecastBaseYear}
              forecastUseSeriesActuals
              forecastActualLayout="nMinusOne-and-ytd"
              projectionYears={projectionYears}
              projectionMode={projectionMode}
              projectionId={projectionId}
            />
          </div>
        </NetTangibleReportSection>

        <CapexHypothesisAssumptionsSection
          companyId={companyId}
          projectionId={projectionId}
          projectionYears={projectionYears}
          forecastBaseYear={forecastBaseYear}
          referenceMonth={referenceMonth}
          divisionId={divisionId}
          subDivisionId={subDivisionId}
        />

        <footer className="mt-10 border-t border-slate-200 pt-4">
          <p className="text-pretty text-[11px] leading-relaxed text-slate-500">
            Hypothèses Capex · {projectionName} · {companyName} · {referenceLabel}
          </p>
        </footer>
      </div>
    </article>
  )
}
