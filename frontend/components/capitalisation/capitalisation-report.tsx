"use client"

import { AnalysesComparablesSection } from "@/components/capitalisation/analyses-comparables-section"
import { CapitalisationMethodSection } from "@/components/capitalisation/capitalisation-method-section"
import { EstimatedDebtSection } from "@/components/capitalisation/estimated-debt-section"
import { RepaymentCapacitySection } from "@/components/capitalisation/repayment-capacity-section"
import { CapitalisationSourcesSection } from "@/components/capitalisation/sources-section"
import { LabelWithHint } from "@/components/cmpc/editable"
import { NetTangibleReportSection } from "@/components/net-tangible/report-section"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import type { UseEbitdaCapitalisationReturn } from "@/hooks/use-ebitda-capitalisation"
import { formatCmpcPct } from "@/lib/cmpc-wacc"
import { formatCurrency } from "@/lib/financial-utils"
import { Info } from "lucide-react"

export type CapitalisationReportProps = {
  companyName: string
  referenceLabel: string
  capitalisation: UseEbitdaCapitalisationReturn
}

const REPORT_NAV = [
  { id: "methode", label: "1. Méthode" },
  { id: "determination", label: "2. Valeur d'entreprise" },
  { id: "comparables", label: "3. Comparables" },
  { id: "endettement", label: "4. Capacité d'endettement" },
  { id: "dette-estimee", label: "5. Structure de financement" },
  { id: "sources", label: "6. Hypothèses et sources" },
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

function MultipleRetainedInfoBubble({
  cmpcLabel,
  growthLabel,
  rateLabel,
  multipleLabel,
}: {
  cmpcLabel: string
  growthLabel: string
  rateLabel: string
  multipleLabel: string
}) {
  const rows = [
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

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#2A2F3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E0742D]/40"
          aria-label="Détail du multiple retenu"
          data-testid="capitalisation-multiple-bridge-trigger"
          data-print-hide
        >
          <Info className="size-3.5" aria-hidden="true" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        side="top"
        className="w-80 border-slate-200 bg-white p-3 shadow-lg"
        data-testid="capitalisation-multiple-bridge"
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Multiple retenu
        </p>
        <table className="w-full border-collapse text-sm">
          <tbody>
            {rows.map((row) => (
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
                      ? "py-1.5 pr-3 font-semibold text-[#2A2F3A]"
                      : "py-1.5 pr-3 text-[#2A2F3A]"
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
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          Multiple = 1 ÷ (CMPC − croissance économique).
        </p>
      </HoverCardContent>
    </HoverCard>
  )
}

export function CapitalisationReport({
  companyName,
  referenceLabel,
  capitalisation: c,
}: CapitalisationReportProps) {
  if (!c.configLoaded) {
    return (
      <div className="flex items-center justify-center overflow-hidden rounded-xl border border-[#E6D6C3]/35 bg-white py-16 shadow-[0_18px_50px_-28px_rgba(34,39,50,0.45)] ring-1 ring-[#222732]/[0.04]">
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
      className="overflow-hidden rounded-xl border border-[#E6D6C3]/35 bg-white shadow-[0_18px_50px_-28px_rgba(34,39,50,0.45)] ring-1 ring-[#222732]/[0.04]"
    >
      <section
        data-testid="capitalisation-overview-strip"
        data-break-avoid
        className="w-full border-b border-[#E6D6C3]/45 bg-gradient-to-b from-[#222732]/[0.025] to-white"
      >
        <div className="border-b border-[#E6D6C3]/40 bg-[#222732]/[0.02] px-6 py-5 sm:px-12">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/90">
            Sommaire de la conclusion
          </p>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
            Flux caractéristiques × multiple retenu (1 ÷ [CMPC − croissance]) = valeur
            d&apos;entreprise.
          </p>
        </div>
        <div className="overflow-x-auto px-6 py-1 sm:px-12">
          <table className="w-full min-w-[420px]">
            <thead>
              <tr className="border-b border-[#E6D6C3]/55 text-left">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Indicateur
                </th>
                <th className="py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Valeur
                </th>
              </tr>
            </thead>
            <tbody>
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
                <tr
                  key={metric.id}
                  data-testid={`capitalisation-overview-${metric.id}`}
                  className="border-b border-slate-100 align-middle last:border-b-0"
                >
                  <td className="py-3 pr-4 text-sm font-medium text-[#222732]">{metric.label}</td>
                  <td className="py-3 text-right font-mono text-sm tabular-nums text-[#222732]">
                    {metric.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="px-6 pb-8 pt-10 sm:px-12 sm:pb-12">
        <div className="mb-6" aria-hidden>
          <div className="h-px w-full bg-gradient-to-r from-[#E0742D]/80 via-[#E6D6C3]/50 to-transparent" />
        </div>

        <div className="mb-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/90">
            Détail du rapport
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Parcourez le sommaire et les sections pour documenter la capitalisation des flux
            monétaires.
          </p>
        </div>

        <nav
          data-testid="capitalisation-section-menu"
          aria-label="Sommaire du rapport"
          className="flex flex-wrap gap-1 border-b border-slate-200 pb-3"
        >
          {REPORT_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-[#222732]/[0.03] hover:text-[#222732]"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <CapitalisationMethodSection />

      <NetTangibleReportSection
        id="determination"
        number="2."
        title="Détermination de la valeur d'entreprise"
      >
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
                <td className="py-2 pr-4 text-[#2A2F3A]">
                  <span className="inline-flex items-center gap-1.5">
                    Multiple
                    <MultipleRetainedInfoBubble
                      cmpcLabel={cmpcLabel}
                      growthLabel={growthLabel}
                      rateLabel={rateLabel}
                      multipleLabel={multipleLabel}
                    />
                  </span>
                </td>
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
          {cap.cmpcPct == null ? (
            <p className="mt-2 text-sm text-amber-700" data-testid="capitalisation-cmpc-missing">
              Complétez l&apos;étape Multiplicateur pour déterminer le CMPC retenu et le multiple.
            </p>
          ) : null}
          {cap.cmpcPct != null && cap.multiple == null ? (
            <p className="mt-2 text-sm text-amber-700" data-testid="capitalisation-rate-invalid">
              Le taux de capitalisation doit être strictement positif (CMPC &gt; croissance
              économique).
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
      </NetTangibleReportSection>

      <AnalysesComparablesSection
        number="3."
        comparableMultiples={c.comparableMultiples}
        onComparableMultiplesChange={c.setComparableMultiples}
        veOverRevenue={gw.ratios.veOverRevenue}
        veOverBaiia={gw.ratios.veOverBaiia}
      />

      <RepaymentCapacitySection
        number="4."
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
        number="5."
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

      <CapitalisationSourcesSection
        number="6."
        sources={c.analysisSources}
        onChange={c.setAnalysisSources}
        comparableMultiples={c.comparableMultiples}
        repaymentCapacity={c.repaymentCapacity}
        debtCapacity={c.debtCapacity}
      />

        <footer className="mt-10 border-t border-slate-200 pt-4">
          <p className="text-pretty text-[11px] leading-relaxed text-slate-500">
            Rapport indicatif de capitalisation des flux · {companyName} · {referenceLabel}
          </p>
        </footer>
      </div>
    </article>
  )
}
