"use client"

import type { CompanyDiagnostic } from "@/lib/api"
import {
  EmptyState,
  ValuationRangeChart,
  WaterfallChart,
  ReportDisclaimerBox,
  KpiCard,
} from "@/components/diagnostic/report/report-components"
import { PageBreakAvoid } from "@/components/diagnostic/report/report-layout"
import {
  AssetsRevenueDualChart,
  BalanceSheetStackedChart,
  PerformanceComboChart,
  RevenueShareChart,
  Sparkline,
} from "@/components/diagnostic/report/report-charts-print"

function sortedTrends(diagnostic: CompanyDiagnostic) {
  return [...diagnostic.trends].sort((a, b) => a.fiscal_year - b.fiscal_year)
}

function fmtMoney(v: number, currency: string): string {
  return v.toLocaleString("fr-CA", { style: "currency", currency, maximumFractionDigits: 0 })
}

export function ReportPerformanceChapter({ diagnostic }: { diagnostic: CompanyDiagnostic }) {
  const years = sortedTrends(diagnostic)
  const latest = years[years.length - 1]
  const { summary, currency } = diagnostic

  const opex = latest ? latest.gross_profit - latest.ebitda : 0
  const finTax = latest ? latest.ebitda - latest.net_income : 0

  const waterfallSteps = latest
    ? [
        { label: "Marge brute", value: latest.gross_profit, type: "subtotal" as const },
        { label: "Charges d'exploitation", value: -Math.abs(opex) },
        { label: "EBITDA", value: latest.ebitda, type: "subtotal" as const },
        { label: "Charges fin. / fiscales", value: -Math.abs(finTax) },
        { label: "Résultat net", value: latest.net_income, type: "total" as const },
      ]
    : []

  return (
    <PageBreakAvoid>
      <div className="report-kpi-strip report-kpi-strip-compact">
        <KpiCard label="CA" value={fmtMoney(summary.latest_revenue, currency)} />
        <KpiCard label="EBITDA" value={fmtMoney(summary.latest_ebitda, currency)} />
        <KpiCard
          label="Marge EBITDA"
          value={
            summary.latest_ebitda_margin_pct != null
              ? `${summary.latest_ebitda_margin_pct.toFixed(1)} %`
              : "—"
          }
        />
      </div>
      <div className="report-spacer-sm" />
      <p className="report-label">Trajectoire revenus et marges</p>
      <PerformanceComboChart years={years} />
      <div className="report-spacer-md" />
      <p className="report-label">Pont de résultat</p>
      <WaterfallChart steps={waterfallSteps} currency={currency} />
    </PageBreakAvoid>
  )
}

export function ReportRevenueChapter({ diagnostic }: { diagnostic: CompanyDiagnostic }) {
  const years = sortedTrends(diagnostic)
  const latestYear = diagnostic.latest_fiscal_year
  const currency = diagnostic.currency
  const products = [...diagnostic.products].filter((p) => p.revenue > 0)

  return (
    <PageBreakAvoid>
      <p className="report-label">Part du chiffre d&apos;affaires par source</p>
      <RevenueShareChart diagnostic={diagnostic} />
      {products.length > 0 ? (
        <>
          <div className="report-spacer-md" />
          <div className="report-data-table-wrap report-avoid-break">
            <table className="report-data-table">
              <thead>
                <tr>
                  <th className="report-data-th">Source</th>
                  <th className="report-data-th report-data-th-right report-data-th-highlight">
                    {latestYear}
                  </th>
                  <th className="report-data-th report-data-th-right">Part CA</th>
                  <th className="report-data-th report-data-th-right">Marge brute</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr
                    key={p.product_name}
                    className={i % 2 === 0 ? "report-data-row-even" : "report-data-row-odd"}
                  >
                    <td className="report-data-td">{p.product_name}</td>
                    <td className="report-data-td report-data-td-right report-data-td-highlight tabular-nums">
                      {fmtMoney(p.revenue, currency)}
                    </td>
                    <td className="report-data-td report-data-td-right tabular-nums">
                      {p.revenue_share_pct != null ? `${p.revenue_share_pct.toFixed(1)} %` : "—"}
                    </td>
                    <td className="report-data-td report-data-td-right tabular-nums">
                      {p.gross_margin_pct != null ? `${p.gross_margin_pct.toFixed(1)} %` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      <div className="report-spacer-sm" />
      <p className="report-caption-note">
        CA consolidé : {fmtMoney(years[years.length - 1]?.revenue ?? diagnostic.summary.latest_revenue, currency)}
      </p>
    </PageBreakAvoid>
  )
}

export function ReportDivisionsChapter({ diagnostic }: { diagnostic: CompanyDiagnostic }) {
  const divisions = [...diagnostic.divisions].sort((a, b) => b.revenue - a.revenue)
  const currency = diagnostic.currency
  const totalRevenue = diagnostic.summary.latest_revenue

  if (!divisions.length) {
    return <EmptyState message="Données non disponibles pour cette période" />
  }

  return (
    <PageBreakAvoid>
      <div className="report-data-table-wrap report-avoid-break">
        <table className="report-data-table">
          <thead>
            <tr>
              <th className="report-data-th">Division</th>
              <th className="report-data-th report-data-th-right">Revenus</th>
              <th className="report-data-th report-data-th-right">EBITDA</th>
              <th className="report-data-th report-data-th-right">Marge EBITDA</th>
              <th className="report-data-th">Statut</th>
            </tr>
          </thead>
          <tbody>
            {divisions.map((d, i) => (
              <tr
                key={d.division_id}
                className={i % 2 === 0 ? "report-data-row-even" : "report-data-row-odd"}
              >
                <td className="report-data-td">{d.division_name}</td>
                <td className="report-data-td report-data-td-right tabular-nums">
                  {fmtMoney(d.revenue, currency)}
                </td>
                <td className="report-data-td report-data-td-right tabular-nums">
                  {fmtMoney(d.ebitda, currency)}
                </td>
                <td className="report-data-td report-data-td-right tabular-nums">
                  {d.ebitda_margin_pct != null ? `${d.ebitda_margin_pct.toFixed(1)} %` : "—"}
                </td>
                <td className="report-data-td">
                  <span
                    className={`report-status-badge ${d.profitable ? "report-status-positive" : "report-status-warning"}`}
                  >
                    {d.profitable ? "Rentable" : "À surveiller"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="report-spacer-md" />
      {divisions.slice(0, 4).map((d) => (
        <div key={d.division_id} className="report-division-waterfall-block">
          <p className="report-label">{d.division_name}</p>
          <WaterfallChart
            steps={[
              { label: "Revenus", value: d.revenue, type: "subtotal" },
              { label: "CV", value: -(d.revenue - d.gross_profit) },
              { label: "Contribution", value: d.gross_profit, type: "subtotal" },
              { label: "CF", value: -(d.gross_profit - d.ebitda) },
              { label: "Bénéfice", value: d.net_income, type: "total" },
            ]}
            currency={currency}
          />
          <div className="report-spacer-sm" />
        </div>
      ))}
      <p className="report-caption-note">Total revenus consolidé : {fmtMoney(totalRevenue, currency)}</p>
    </PageBreakAvoid>
  )
}

export function ReportFinancialPositionChapter({ diagnostic }: { diagnostic: CompanyDiagnostic }) {
  const years = sortedTrends(diagnostic)
  const latest = years[years.length - 1] ?? null

  return (
    <PageBreakAvoid>
      <p className="report-label">Structure du bilan</p>
      <BalanceSheetStackedChart latest={latest} />
      <div className="report-spacer-md" />
      <p className="report-label">Actif total vs chiffre d&apos;affaires</p>
      <AssetsRevenueDualChart years={years} />
    </PageBreakAvoid>
  )
}

export function ReportWorkingCapitalChapter({ diagnostic }: { diagnostic: CompanyDiagnostic }) {
  const years = sortedTrends(diagnostic)
  const latest = years[years.length - 1]
  const currency = diagnostic.currency
  const wcSeries = years.map((y) => y.current_assets - y.current_liabilities)
  const inventoryPct =
    latest && latest.current_assets > 0
      ? (latest.inventory / latest.current_assets) * 100
      : null

  if (!latest) {
    return <EmptyState message="Données non disponibles pour cette période" />
  }

  const fdr = latest.current_assets - latest.current_liabilities

  return (
    <PageBreakAvoid>
      <div className="report-kpi-strip">
        <KpiCard label="FDR net" value={fmtMoney(fdr, currency)} />
        <KpiCard
          label="Current ratio"
          value={latest.current_ratio != null ? latest.current_ratio.toFixed(2) : "—"}
          status={
            latest.current_ratio != null && latest.current_ratio >= 1.5
              ? "positive"
              : latest.current_ratio != null && latest.current_ratio < 1
                ? "warning"
                : "neutral"
          }
        />
        <KpiCard
          label="Quick ratio"
          value={latest.quick_ratio != null ? latest.quick_ratio.toFixed(2) : "—"}
        />
        <KpiCard
          label="Stocks / Actifs CT"
          value={inventoryPct != null ? `${inventoryPct.toFixed(1)} %` : "—"}
        />
      </div>
      <div className="report-spacer-sm" />
      <div className="report-wc-sparkline-row">
        <p className="report-label">Évolution du FDR net</p>
        <Sparkline values={wcSeries} />
      </div>
    </PageBreakAvoid>
  )
}

export function ReportCashflowChapter({ diagnostic }: { diagnostic: CompanyDiagnostic }) {
  const years = [...diagnostic.trends].sort((a, b) => a.fiscal_year - b.fiscal_year)
  const latest = years[years.length - 1]
  if (!latest) {
    return <EmptyState message="Données non disponibles pour cette période" />
  }

  const ebitda = latest.ebitda
  const depreciation = latest.depreciation ?? 0
  const capex = diagnostic.summary.capex_latest
  const wcDelta =
    latest.current_assets -
    latest.current_liabilities -
    ((years[years.length - 2]?.current_assets ?? 0) -
      (years[years.length - 2]?.current_liabilities ?? 0))
  const freeCash = ebitda - Math.abs(wcDelta) - capex

  const steps = [
    { label: "EBITDA", value: ebitda, type: "subtotal" as const },
    { label: "Δ BFR", value: -Math.abs(wcDelta) },
    { label: "CAPEX", value: -Math.abs(capex) },
    { label: "Cash libre indicatif", value: freeCash, type: "total" as const },
  ]

  return (
    <PageBreakAvoid>
      <WaterfallChart steps={steps} currency={diagnostic.currency} />
      <div className="report-spacer-md" />
      <ReportDisclaimerBox title="Lecture indicative">
        <p>
          Flux dérivés des tendances EBITDA, variation du fonds de roulement et CAPEX. Un état des
          flux de trésorerie détaillé est disponible dans le module États financiers de Modelisys.
        </p>
      </ReportDisclaimerBox>
    </PageBreakAvoid>
  )
}

export function ReportValuationChapter({ diagnostic }: { diagnostic: CompanyDiagnostic }) {
  const { valuation, currency } = diagnostic
  const years = [...diagnostic.trends].sort((a, b) => a.fiscal_year - b.fiscal_year)
  const latest = years[years.length - 1]
  const netDebtEstimate =
    latest != null ? Math.max(0, latest.total_liabilities - valuation.book_equity) : null
  const equityValue =
    netDebtEstimate != null ? valuation.enterprise_value_mid - netDebtEstimate : null

  return (
    <PageBreakAvoid>
      <ValuationRangeChart
        low={valuation.enterprise_value_low}
        mid={valuation.enterprise_value_mid}
        high={valuation.enterprise_value_high}
        equityValue={equityValue}
        currency={currency}
      />
      <div className="report-spacer-sm" />
      <div className="report-kpi-strip report-kpi-strip-compact">
        <KpiCard
          label="VE médiane"
          value={valuation.enterprise_value_mid.toLocaleString("fr-CA", {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
          })}
        />
        <KpiCard
          label="Equity Value (VE − Dette nette)"
          value={
            equityValue != null
              ? equityValue.toLocaleString("fr-CA", {
                  style: "currency",
                  currency,
                  maximumFractionDigits: 0,
                })
              : "—"
          }
        />
        <KpiCard
          label="EBITDA normalisé"
          value={valuation.normalized_ebitda.toLocaleString("fr-CA", {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
          })}
        />
      </div>
      <div className="report-spacer-md" />
      <ReportDisclaimerBox title="Limites méthodologiques">
        <p>
          Fourchette indicative basée sur un multiple d&apos;EBITDA normalisé. Une valorisation
          formelle intégrerait ajustements, actifs non opérationnels, risques spécifiques et due
          diligence complète.
        </p>
      </ReportDisclaimerBox>
    </PageBreakAvoid>
  )
}

export function ReportCapexChapter({ diagnostic }: { diagnostic: CompanyDiagnostic }) {
  const years = [...diagnostic.trends].sort((a, b) => a.fiscal_year - b.fiscal_year)
  const latest = years[years.length - 1]
  const capex = diagnostic.summary.capex_latest
  const depreciation = latest?.depreciation ?? 0
  const capexRevPct = diagnostic.summary.capex_revenue_pct
  const currency = diagnostic.currency

  const fmt = (v: number) =>
    v.toLocaleString("fr-CA", { style: "currency", currency, maximumFractionDigits: 0 })

  const underInvest =
    depreciation > 0 && capex < depreciation
      ? "Le CAPEX est inférieur à l'amortissement — signal potentiel de sous-investissement ou d'actifs en fin de vie comptable."
      : null

  return (
    <PageBreakAvoid>
      <div className="report-kpi-strip">
        <KpiCard label="CAPEX" value={fmt(capex)} />
        <KpiCard label="Amortissement" value={fmt(depreciation)} />
        <KpiCard
          label="CAPEX / Revenus"
          value={capexRevPct != null ? `${capexRevPct.toFixed(1)} %` : "—"}
        />
      </div>
      <div className="report-spacer-md" />
      <WaterfallChart
        steps={[
          { label: "CAPEX", value: capex, type: "subtotal" },
          { label: "Amortissement", value: depreciation },
        ]}
        currency={currency}
      />
      {underInvest ? (
        <>
          <div className="report-spacer-sm" />
          <p className="report-caption-note">{underInvest}</p>
        </>
      ) : null}
    </PageBreakAvoid>
  )
}
