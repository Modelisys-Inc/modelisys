"use client"

import { EstimatedDebtSection } from "@/components/capitalisation/estimated-debt-section"
import { RepaymentCapacitySection } from "@/components/capitalisation/repayment-capacity-section"
import { LabelWithHint } from "@/components/cmpc/editable"
import { NetTangibleReportSection } from "@/components/net-tangible/report-section"
import type { UseEbitdaCapitalisationReturn } from "@/hooks/use-ebitda-capitalisation"
import { formatCmpcPct } from "@/lib/cmpc-wacc"
import { formatCurrency } from "@/lib/financial-utils"

export type CapitalisationReportProps = {
  companyName: string
  referenceLabel: string
  capitalisation: UseEbitdaCapitalisationReturn
}

const REPORT_NAV = [
  { id: "determination", label: "1. Valeur d'entreprise" },
  { id: "endettement", label: "2. Capacité d'endettement" },
  { id: "dette-estimee", label: "3. Dette estimée" },
  { id: "restrictions", label: "4. Restrictions" },
] as const

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
}

function formatMultiple(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return `${value.toFixed(2)}×`
}

function formatRatio(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return `${value.toFixed(2)}×`
}

function formatMoneyOrDash(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return formatCurrency(value)
}

function DisclaimerSection() {
  return (
    <NetTangibleReportSection id="restrictions" number="4." title="Restrictions et limitations">
      <p className="text-pretty text-sm leading-relaxed text-slate-500">
        Le processus de détermination de la valeur d&apos;entreprise présenté dans ce rapport est
        uniquement à des fins de consultation. Il ne constitue pas un rapport d&apos;évaluation
        conforme aux normes de l&apos;Institut canadien des évaluateurs d&apos;entreprises (ICÉÉ)
        ni aux normes CBV.
      </p>
      <ul className="mt-4 space-y-2 text-sm text-slate-500">
        <li className="flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
          <span>
            Les calculs reposent sur les hypothèses et données saisies ; ils peuvent ne pas
            refléter la valeur réelle de l&apos;entreprise.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
          <span>
            Cette analyse ne remplace pas un avis professionnel et ne doit pas être la seule base
            de décisions financières importantes.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
          <span>
            Pour une évaluation conforme aux normes professionnelles, consultez un évaluateur
            d&apos;entreprises certifié (CBV).
          </span>
        </li>
      </ul>
    </NetTangibleReportSection>
  )
}

export function CapitalisationReport({
  companyName,
  referenceLabel,
  capitalisation: c,
}: CapitalisationReportProps) {
  if (!c.configLoaded) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 shadow-lg">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#E0742D]" />
      </div>
    )
  }

  const cap = c.cashFlowCapitalisation
  const gw = c.goodwillAndRatios
  const multipleLabel = formatMultiple(cap.multiple)
  const rateLabel =
    cap.capitalizationRatePct != null && Number.isFinite(cap.capitalizationRatePct)
      ? formatCmpcPct(cap.capitalizationRatePct)
      : "—"
  const cmpcLabel =
    cap.cmpcPct != null && Number.isFinite(cap.cmpcPct) ? formatCmpcPct(cap.cmpcPct) : "—"
  const growthLabel = formatCmpcPct(cap.economicGrowthPct)
  const acnLabel = formatMoneyOrDash(gw.acn)
  const goodwill = gw.goodwill

  return (
    <article
      data-testid="capitalisation-report"
      data-report-sheet
      className="rounded-xl border border-slate-200 bg-white px-6 py-8 shadow-lg sm:px-12 sm:py-12"
    >
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E0742D]">
          Détermination de la valeur
        </p>
        <h2 className="mt-2 text-balance text-2xl font-semibold leading-tight tracking-tight text-[#2A2F3A] sm:text-3xl">
          Capitalisation des flux monétaires
        </h2>
        <p className="mt-3 max-w-3xl text-pretty text-sm leading-relaxed text-slate-500">
          Le présent rapport capitalise les flux monétaires caractéristiques de{" "}
          <span className="font-medium text-[#2A2F3A]">{companyName}</span>, en date du{" "}
          <span className="font-medium text-[#2A2F3A]">{referenceLabel}</span>, à partir du
          CMPC (Multiplicateur) et de la croissance économique (Flux monétaires).
        </p>
      </header>

      <section
        data-testid="capitalisation-overview-strip"
        data-break-avoid
        className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-[#2A2F3A] text-white shadow-sm"
      >
        <div className="border-b border-white/15 px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E0742D]">
            Sommaire de la conclusion
          </p>
          <p className="mt-2 max-w-3xl text-pretty text-sm leading-relaxed text-white/80">
            Flux caractéristiques × multiple retenu (1 ÷ [CMPC − croissance]) = valeur
            d&apos;entreprise.
          </p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-white/10 md:grid-cols-3 xl:grid-cols-6 xl:divide-y-0">
          {[
            {
              id: "cf-mid",
              label: "Flux moyen",
              value: formatCurrency(cap.cashFlow.mid),
            },
            { id: "cmpc", label: "CMPC retenu", value: cmpcLabel },
            { id: "rate", label: "Taux de capitalisation", value: rateLabel },
            { id: "multiple-mid", label: "Multiple retenu", value: multipleLabel },
            {
              id: "ev-mid",
              label: "VE médiane",
              value: formatCurrency(c.midEnterpriseValue),
            },
            {
              id: "ev-range",
              label: "VE (bas – haut)",
              value: `${formatCurrency(c.lowEnterpriseValue)} – ${formatCurrency(c.highEnterpriseValue)}`,
            },
          ].map((metric) => (
            <div
              key={metric.id}
              data-testid={`capitalisation-overview-${metric.id}`}
              className="flex min-w-0 flex-col gap-1.5 px-3.5 py-3.5 text-left"
            >
              <span className="text-[11px] font-medium uppercase tracking-wide text-white/55">
                {metric.label}
              </span>
              <span className="truncate font-mono text-sm font-semibold tabular-nums text-white">
                {metric.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      <nav
        data-testid="capitalisation-section-menu"
        aria-label="Sommaire du rapport"
        className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4"
      >
        {REPORT_NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => scrollToSection(item.id)}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#2A2F3A]"
          >
            {item.label}
          </button>
        ))}
      </nav>

      <p className="mt-6 text-pretty text-sm leading-relaxed text-slate-500">
        Taux de capitalisation&nbsp;={" "}
        <span className="font-mono text-[#2A2F3A]">CMPC − croissance économique</span>
        &nbsp;; multiple&nbsp;={" "}
        <span className="font-mono text-[#2A2F3A]">1 ÷ taux</span>
        &nbsp;; valeur d&apos;entreprise&nbsp;={" "}
        <span className="font-mono text-[#2A2F3A]">
          Flux monétaires caractéristiques × Multiple
        </span>
        .
      </p>

      <NetTangibleReportSection
        id="determination"
        number="1."
        title="Détermination de la valeur d'entreprise"
      >
        <p className="mb-4 text-pretty text-sm leading-relaxed text-slate-500">
          Les flux monétaires caractéristiques proviennent de l&apos;étape{" "}
          <span className="font-medium text-[#2A2F3A]">Flux monétaires</span>. Le multiple retenu
          découle du CMPC (étape{" "}
          <span className="font-medium text-[#2A2F3A]">Multiplicateur</span>) diminué de la
          croissance économique.
        </p>

        <div className="overflow-x-auto" data-testid="capitalisation-determination-table">
          <table className="w-full min-w-[36rem] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[40%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-4 font-medium">Poste</th>
                <th className="pb-2 pr-4 text-right font-medium">Bas</th>
                <th className="pb-2 pr-4 text-right font-medium">Haut</th>
                <th className="pb-2 text-right font-medium">Moyen</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-200" data-testid="capitalisation-cf-row">
                <td className="py-2 pr-4 text-[#2A2F3A]">
                  Flux monétaires caractéristiques
                </td>
                <td className="py-2 pr-4 text-right font-mono tabular-nums text-[#2A2F3A]">
                  {formatCurrency(cap.cashFlow.low)}
                </td>
                <td className="py-2 pr-4 text-right font-mono tabular-nums text-[#2A2F3A]">
                  {formatCurrency(cap.cashFlow.high)}
                </td>
                <td className="py-2 text-right font-mono tabular-nums text-[#E0742D]">
                  {formatCurrency(cap.cashFlow.mid)}
                </td>
              </tr>
              <tr className="border-t border-slate-200" data-testid="capitalisation-multiple-row">
                <td className="py-2 pr-4 text-[#2A2F3A]">Multiple</td>
                <td className="py-2 pr-4 text-right font-mono tabular-nums text-[#2A2F3A]">
                  {multipleLabel}
                </td>
                <td className="py-2 pr-4 text-right font-mono tabular-nums text-[#2A2F3A]">
                  {multipleLabel}
                </td>
                <td className="py-2 text-right font-mono tabular-nums text-[#E0742D]">
                  {multipleLabel}
                </td>
              </tr>
              <tr className="border-t-2 border-[#2A2F3A]" data-testid="capitalisation-ev-row">
                <td className="py-2 pr-4 font-semibold text-[#2A2F3A]">
                  Valeur d&apos;entreprise
                </td>
                <td
                  className="py-2 pr-4 text-right font-mono text-sm font-semibold tabular-nums text-[#2A2F3A]"
                  data-testid="capitalisation-ev-low"
                >
                  {formatCurrency(c.lowEnterpriseValue)}
                </td>
                <td
                  className="py-2 pr-4 text-right font-mono text-sm font-semibold tabular-nums text-[#2A2F3A]"
                  data-testid="capitalisation-ev-high"
                >
                  {formatCurrency(c.highEnterpriseValue)}
                </td>
                <td
                  className="py-2 text-right font-mono text-sm font-semibold tabular-nums text-[#E0742D]"
                  data-testid="capitalisation-ev-mid"
                >
                  {formatCurrency(c.midEnterpriseValue)}
                </td>
              </tr>
              <tr className="border-t border-slate-200" data-testid="capitalisation-acn-row">
                <td className="py-2 pr-4 text-[#2A2F3A]">
                  <LabelWithHint
                    label="(−) Actif corporel net (ACN)"
                    hint="ACN déjà déterminé à l’étape Valeur comptable ajustée."
                  />
                </td>
                <td className="py-2 pr-4 text-right font-mono tabular-nums text-[#2A2F3A]">
                  {acnLabel}
                </td>
                <td className="py-2 pr-4 text-right font-mono tabular-nums text-[#2A2F3A]">
                  {acnLabel}
                </td>
                <td className="py-2 text-right font-mono tabular-nums text-[#E0742D]">
                  {acnLabel}
                </td>
              </tr>
              <tr className="border-t-2 border-[#2A2F3A]" data-testid="capitalisation-goodwill-row">
                <td className="py-2 pr-4 font-semibold text-[#2A2F3A]">
                  <LabelWithHint
                    label="Valeur de l'achalandage"
                    hint="VE − ACN (valeur d’entreprise moins actif corporel net)."
                  />
                </td>
                <td className="py-2 pr-4 text-right font-mono text-sm font-semibold tabular-nums text-[#2A2F3A]">
                  {formatMoneyOrDash(goodwill?.low)}
                </td>
                <td className="py-2 pr-4 text-right font-mono text-sm font-semibold tabular-nums text-[#2A2F3A]">
                  {formatMoneyOrDash(goodwill?.high)}
                </td>
                <td className="py-2 text-right font-mono text-sm font-semibold tabular-nums text-[#E0742D]">
                  {formatMoneyOrDash(goodwill?.mid)}
                </td>
              </tr>
            </tbody>
          </table>
          {gw.acn == null ? (
            <p className="mt-2 text-sm text-amber-700" data-testid="capitalisation-acn-missing">
              Complétez l&apos;étape Valeur comptable ajustée pour reprendre l&apos;ACN et
              calculer l&apos;achalandage.
            </p>
          ) : null}
        </div>

        <div className="mt-6 space-y-3" data-testid="capitalisation-ratios-table">
          <p className="text-sm font-medium text-[#2A2F3A]">Métriques d&apos;évaluation</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[40%]" />
                <col className="w-[20%]" />
                <col className="w-[20%]" />
                <col className="w-[20%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4 font-medium">Métrique</th>
                  <th className="pb-2 pr-4 text-right font-medium">Bas</th>
                  <th className="pb-2 pr-4 text-right font-medium">Haut</th>
                  <th className="pb-2 text-right font-medium">Moyen</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    { id: "ve-rev", label: "VE / Revenus moyens", values: gw.ratios.veOverRevenue },
                    { id: "ve-baiia", label: "VE / BAIIA moyen", values: gw.ratios.veOverBaiia },
                    {
                      id: "ve-cf",
                      label: "VE / Flux monétaires moyens",
                      values: gw.ratios.veOverCashFlow,
                    },
                    {
                      id: "gw-baiia",
                      label: "Achalandage / BAIIA moyen",
                      values: gw.ratios.goodwillOverBaiia,
                    },
                    {
                      id: "gw-cf",
                      label: "Achalandage / Flux monétaires moyens",
                      values: gw.ratios.goodwillOverCashFlow,
                    },
                    {
                      id: "cf-baiia",
                      label: "Flux monétaires / BAIIA moyen",
                      values: gw.ratios.cashFlowOverBaiia,
                    },
                  ] as const
                ).map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-slate-200"
                    data-testid={`capitalisation-ratio-${row.id}`}
                  >
                    <td className="py-2 pr-4 text-[#2A2F3A]">{row.label}</td>
                    <td className="py-2 pr-4 text-right font-mono tabular-nums text-[#2A2F3A]">
                      {formatRatio(row.values.low)}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono tabular-nums text-[#2A2F3A]">
                      {formatRatio(row.values.high)}
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums text-[#E0742D]">
                      {formatRatio(row.values.mid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 space-y-3" data-testid="capitalisation-multiple-bridge">
          <p className="text-sm font-medium text-[#2A2F3A]">Multiple retenu</p>
          <div className="max-w-md overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {(
                  [
                    {
                      id: "cmpc",
                      label: "CMPC (Multiplicateur)",
                      value: cmpcLabel,
                      total: false,
                    },
                    {
                      id: "growth",
                      label: "(−) Croissance économique",
                      value: growthLabel,
                      total: false,
                    },
                    {
                      id: "rate",
                      label: "Taux de capitalisation",
                      value: rateLabel,
                      total: true,
                    },
                    {
                      id: "multiple",
                      label: "Multiple (1 ÷ taux)",
                      value: multipleLabel,
                      total: true,
                    },
                  ] as const
                ).map((row) => (
                  <tr
                    key={row.id}
                    className={
                      row.total ? "border-t-2 border-[#2A2F3A]" : "border-t border-slate-200"
                    }
                    data-testid={
                      row.id === "multiple"
                        ? "capitalisation-multiple-retained"
                        : `capitalisation-${row.id}`
                    }
                  >
                    <td
                      className={
                        row.total
                          ? "py-1.5 pr-4 font-semibold text-[#2A2F3A]"
                          : "py-1.5 pr-4 text-[#2A2F3A]"
                      }
                    >
                      {row.label}
                    </td>
                    <td
                      className={
                        row.total
                          ? "py-1.5 text-right font-mono text-sm font-semibold tabular-nums text-[#E0742D]"
                          : "py-1.5 text-right font-mono text-sm tabular-nums text-[#2A2F3A]"
                      }
                    >
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cap.cmpcPct == null ? (
            <p className="text-sm text-amber-700" data-testid="capitalisation-cmpc-missing">
              Complétez l&apos;étape Multiplicateur pour déterminer le CMPC retenu et le multiple.
            </p>
          ) : null}
          {cap.cmpcPct != null && cap.multiple == null ? (
            <p className="text-sm text-amber-700" data-testid="capitalisation-rate-invalid">
              Le taux de capitalisation doit être strictement positif (CMPC &gt; croissance
              économique).
            </p>
          ) : null}
        </div>
      </NetTangibleReportSection>

      <RepaymentCapacitySection
        number="2."
        baiiaLow={c.lowEBITDARange}
        baiiaHigh={c.highEBITDARange}
        baiiaMid={c.midEBITDARange}
        cashFlowLow={c.characteristicCashFlows.low.characteristicCashFlow}
        cashFlowHigh={c.characteristicCashFlows.high.characteristicCashFlow}
        debtCapacity={c.debtCapacity}
        debtCapacityNotes={c.debtCapacityNotes}
        onDebtCapacityChange={c.setDebtCapacity}
        onDebtCapacityNotesChange={c.setDebtCapacityNotes}
        repaymentCapacity={c.repaymentCapacity}
        repaymentCapacityNotes={c.repaymentCapacityNotes}
        onRepaymentCapacityChange={c.setRepaymentCapacity}
        onRepaymentCapacityNotesChange={c.setRepaymentCapacityNotes}
      />

      <EstimatedDebtSection
        number="3."
        baiiaLow={c.lowEBITDARange}
        baiiaHigh={c.highEBITDARange}
        baiiaMid={c.midEBITDARange}
        cashFlowLow={c.characteristicCashFlows.low.characteristicCashFlow}
        cashFlowHigh={c.characteristicCashFlows.high.characteristicCashFlow}
        enterpriseValueLow={c.lowEnterpriseValue}
        enterpriseValueHigh={c.highEnterpriseValue}
        enterpriseValueMid={c.midEnterpriseValue}
        cmpcDebtWeightPct={c.cmpcDebtWeightPct}
        debtCapacity={c.debtCapacity}
        repaymentCapacity={c.repaymentCapacity}
      />

      <DisclaimerSection />

      <footer className="mt-10 border-t border-slate-200 pt-4">
        <p className="text-pretty text-[11px] leading-relaxed text-slate-500">
          Rapport indicatif de capitalisation des flux · {companyName} · {referenceLabel}
        </p>
      </footer>
    </article>
  )
}
