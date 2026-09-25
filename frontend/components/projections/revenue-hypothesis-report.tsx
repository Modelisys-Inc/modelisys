"use client"

import { NetTangibleReportSection } from "@/components/net-tangible/report-section"
import { IncomeStatementDetail } from "@/components/income-statement-detail"
import { RevenueHypothesisAssumptionsSection } from "@/components/projections/revenue-hypothesis-assumptions-section"
import { formatCurrency } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import type { Company } from "@/components/entity-selector"

export type RevenueHypothesisOverviewMetric = {
  id: string
  label: string
  value: number | null
  hint?: string
}

const REPORT_NAV = [
  { id: "methode", label: "1. Méthode", testId: "revenue-hypothesis-section-methode" },
  { id: "estimation", label: "2. Estimation", testId: "revenue-hypothesis-section-estimation" },
  { id: "hypotheses", label: "3. Hypothèses", testId: "revenue-hypothesis-section-hypotheses" },
] as const

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
}

function RevenueMethodSection() {
  return (
    <NetTangibleReportSection id="methode" number="1." title="Méthode et périmètre">
      <p className="text-pretty text-sm leading-relaxed text-slate-500">
        Les hypothèses de revenus projettent le chiffre d&apos;affaires par poste d&apos;annexe à
        partir des montants historiques (exercice N-1 et cumul YTD lorsque la date de référence
        n&apos;est pas une clôture), puis appliquent croissance, saisonnalité et ajustements pour
        chaque année projetée.
      </p>
      <p className="mt-4 text-pretty text-sm leading-relaxed text-slate-500">
        La démarche consiste à&nbsp;:
      </p>
      <ul className="mt-3 space-y-2 text-sm text-slate-500">
        <li className="flex gap-2">
          <span className="font-mono text-[#E0742D]">01</span>
          <span>
            Partir des revenus réels des postes d&apos;annexe (même périmètre que le Détail des
            résultats).
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-mono text-[#E0742D]">02</span>
          <span>
            Définir la croissance de la première année projetée sur le dernier exercice complet
            (N-1), puis composer les années suivantes.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-mono text-[#E0742D]">03</span>
          <span>
            Ajuster la courbe de saisonnalité et, au besoin, ajouter des montants ou pourcentages
            récurrents / non récurrents.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-mono text-[#E0742D]">04</span>
          <span>
            Aligner les totaux projetés sur le Pro Forma Résultats et le panneau d&apos;impact
            financier.
          </span>
        </li>
      </ul>
      <p className="mt-5 text-pretty text-sm leading-relaxed text-slate-500">
        La relation fondamentale pour un poste est&nbsp;:
      </p>
      <p className="mt-3 rounded-md bg-slate-100/80 px-4 py-3 text-center font-mono text-sm text-[#2A2F3A]">
        Revenu projeté = Base × (1 + croissance) ± ajustements
      </p>
    </NetTangibleReportSection>
  )
}

function RevenueOverviewStrip({ metrics }: { metrics: RevenueHypothesisOverviewMetric[] }) {
  return (
    <section
      data-testid="revenue-hypothesis-overview-strip"
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
              Synthèse des revenus de référence et de la première année projetée.
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
                  data-testid={`revenue-hypothesis-overview-${metric.id}`}
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

export type RevenueHypothesisReportProps = {
  companyName: string
  referenceLabel: string
  projectionName: string
  overviewMetrics: RevenueHypothesisOverviewMetric[]
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

export function RevenueHypothesisReport({
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
}: RevenueHypothesisReportProps) {
  return (
    <article
      data-testid="revenue-hypothesis-report"
      data-report-sheet
      className="overflow-hidden rounded-xl border border-[#E6D6C3]/35 bg-white shadow-[0_18px_50px_-28px_rgba(34,39,50,0.45)] ring-1 ring-[#222732]/[0.04]"
    >
      <RevenueOverviewStrip metrics={overviewMetrics} />

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
              Documentez la méthode, projetez les revenus, puis relisez le sommaire des hypothèses.
            </p>
          </div>
        </div>

        <nav
          data-testid="revenue-hypothesis-section-menu"
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

        <RevenueMethodSection />

        <NetTangibleReportSection
          id="estimation"
          number="2."
          title="Estimation des revenus annuels"
        >
          <p className="text-pretty text-sm leading-relaxed text-slate-500">
            Chaque poste de revenus peut faire l&apos;objet d&apos;une hypothèse de croissance
            et de saisonnalité. Cliquez une cellule d&apos;année projetée pour ouvrir le panneau
            d&apos;hypothèse. Les modifications sont enregistrées automatiquement.
          </p>
          <div className="mt-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Revenus projetés
            </p>
            <IncomeStatementDetail
              period="annual"
              view="years"
              columnMode="comparison"
              companyId={companyId}
              divisionId={divisionId}
              subDivisionId={subDivisionId}
              companies={companies}
              title="Estimation des revenus annuels"
              embedInReport
              hideHeaderIcon
              fiscalYear={forecastBaseYear}
              referenceMonth={referenceMonth}
              forceForecastSection
              forecastBaseYear={forecastBaseYear}
              forecastUseSeriesActuals
              forecastActualLayout="nMinusOne-and-ytd"
              projectionYears={projectionYears}
              projectionMode={projectionMode}
              projectionId={projectionId}
            />
          </div>
        </NetTangibleReportSection>

        <RevenueHypothesisAssumptionsSection
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
            Hypothèses de revenus · {projectionName} · {companyName} · {referenceLabel}
          </p>
        </footer>
      </div>
    </article>
  )
}
