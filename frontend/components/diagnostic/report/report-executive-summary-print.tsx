"use client"

import type { CompanyDiagnostic } from "@/lib/api"
import { buildExecutiveSummary } from "@/lib/diagnostic-executive-summary"
import { buildReportRadarScores } from "@/lib/report-radar-scores"
import { buildSignals } from "@/lib/diagnostic-derive"
import { DEFAULT_BENCHMARK } from "@/lib/diagnostic-benchmarks"
import { KpiCard, RadarScore } from "@/components/diagnostic/report/report-components"
import { ReportInsightCard } from "@/components/diagnostic/report/report-primitives"
import { PageBreakAvoid } from "@/components/diagnostic/report/report-layout"

function formatMoney(v: number, currency: string): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? "−" : ""
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toLocaleString("fr-CA", { maximumFractionDigits: 1 })} M$`
  }
  return `${sign}${abs.toLocaleString("fr-CA", { maximumFractionDigits: 0 })} $`
}

function formatPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—"
  return `${v.toLocaleString("fr-CA", { maximumFractionDigits: 1 })} %`
}

/** Sommaire exécutif optimisé pour l'impression (KPI + radar + points d'attention). */
export function ReportExecutiveSummaryPrint({ diagnostic }: { diagnostic: CompanyDiagnostic }) {
  const summary = buildExecutiveSummary(diagnostic)
  const { summary: s, currency } = diagnostic
  const radar = buildReportRadarScores(diagnostic)
  const signals = buildSignals(diagnostic, DEFAULT_BENCHMARK).slice(0, 3)

  const synthesis =
    summary.conclusionParagraph ||
    summary.introParagraphs[0] ||
    `Lecture consolidée de ${diagnostic.company_name} à la date de référence ${summary.referenceLabel}.`

  return (
    <PageBreakAvoid className="report-executive-print">
      <div className="report-kpi-strip">
        <KpiCard label="Chiffre d'affaires" value={formatMoney(s.latest_revenue, currency)} />
        <KpiCard
          label="Marge EBITDA"
          value={formatPct(s.latest_ebitda_margin_pct)}
          status={
            s.latest_ebitda_margin_pct >= 15
              ? "positive"
              : s.latest_ebitda_margin_pct < 10
                ? "warning"
                : "neutral"
          }
        />
        <KpiCard label="Résultat net" value={formatMoney(s.latest_net_income, currency)} />
        <KpiCard
          label="TCAC revenus (5 ans)"
          value={formatPct(s.revenue_cagr_5y)}
          status={s.revenue_cagr_5y != null && s.revenue_cagr_5y > 0 ? "positive" : "neutral"}
        />
      </div>

      <div className="report-spacer-md" />

      <div className="report-executive-grid">
        <div className="report-executive-radar">
          <p className="report-label">Profil vs secteur</p>
          <RadarScore axes={radar.axes} overall={radar.overall} />
        </div>
        <div className="report-executive-attention">
          <p className="report-label">Points d&apos;attention prioritaires</p>
          <div className="space-y-3">
            {signals.length > 0 ? (
              signals.map((sig) => (
                <ReportInsightCard
                  key={sig.section}
                  tone={
                    sig.tone === "ok"
                      ? "positive"
                      : sig.tone === "risk"
                        ? "risk"
                        : "watch"
                  }
                  title={sig.section}
                  body={sig.text}
                />
              ))
            ) : (
              <p className="text-sm text-slate-500">Aucun signal prioritaire identifié.</p>
            )}
          </div>
        </div>
      </div>

      <div className="report-spacer-md" />

      <div className="report-synthesis-line">
        <p>{synthesis}</p>
      </div>
    </PageBreakAvoid>
  )
}
