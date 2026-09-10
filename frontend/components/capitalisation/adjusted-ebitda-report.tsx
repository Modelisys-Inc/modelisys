"use client"

import { AdjustedEbitdaMethodSection } from "@/components/capitalisation/adjusted-ebitda-method-section"
import { BaiiaSection } from "@/components/capitalisation/baiia-section"
import { FluxMonetairesSection } from "@/components/capitalisation/flux-monetaires-section"
import { FourchetteSection } from "@/components/capitalisation/fourchette-section"
import type { UseEbitdaCapitalisationReturn } from "@/hooks/use-ebitda-capitalisation"
import { formatCurrency } from "@/lib/financial-utils"

export type AdjustedEbitdaReportProps = {
  companyName: string
  referenceLabel: string
  capitalisation: UseEbitdaCapitalisationReturn
}

const REPORT_NAV = [
  { id: "methode", label: "1. Méthode" },
  { id: "baiia", label: "2. BAIIA" },
  { id: "fourchette", label: "3. Fourchette" },
  { id: "flux-monetaires", label: "4. Flux caractéristiques" },
] as const

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
}

export function AdjustedEbitdaReport({
  companyName,
  referenceLabel,
  capitalisation: c,
}: AdjustedEbitdaReportProps) {
  if (!c.configLoaded) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-[#E6D6C3]/35 bg-white py-16 shadow-[0_18px_50px_-28px_rgba(34,39,50,0.45)] ring-1 ring-[#222732]/[0.04]">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#E0742D]" />
      </div>
    )
  }

  const cf = c.characteristicCashFlows

  const overviewMetrics = [
    {
      id: "range-low",
      label: "BAIIA bas",
      value: formatCurrency(c.lowEBITDARange),
    },
    {
      id: "range-mid",
      label: "BAIIA médian",
      value: formatCurrency(c.midEBITDARange),
    },
    {
      id: "range-high",
      label: "BAIIA haut",
      value: formatCurrency(c.highEBITDARange),
    },
    {
      id: "cf-low",
      label: "Flux bas",
      value: formatCurrency(cf.low.characteristicCashFlow),
    },
    {
      id: "cf-mid",
      label: "Flux médian",
      value: formatCurrency(cf.mid.characteristicCashFlow),
    },
    {
      id: "cf-high",
      label: "Flux haut",
      value: formatCurrency(cf.high.characteristicCashFlow),
    },
  ]

  return (
    <article
      data-testid="adjusted-ebitda-report"
      data-report-sheet
      className="overflow-hidden rounded-xl border border-[#E6D6C3]/35 bg-white shadow-[0_18px_50px_-28px_rgba(34,39,50,0.45)] ring-1 ring-[#222732]/[0.04]"
    >
      <section
        data-testid="adjusted-ebitda-overview-strip"
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
                Fourchette de BAIIA ajusté retenu et flux monétaires caractéristiques.
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
                  Valeur
                </th>
              </tr>
            </thead>
            <tbody>
              {overviewMetrics.map((metric) => (
                <tr
                  key={metric.id}
                  data-testid={`adjusted-ebitda-overview-${metric.id}`}
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
            Parcourez la méthode, le BAIIA, la fourchette et les flux caractéristiques.
          </p>
        </div>

        <nav
          data-testid="adjusted-ebitda-section-menu"
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

        <AdjustedEbitdaMethodSection />
        <BaiiaSection capitalisation={c} />
        <FourchetteSection capitalisation={c} />
        <FluxMonetairesSection capitalisation={c} />

        <footer className="mt-10 border-t border-slate-200 pt-4">
          <p className="text-pretty text-[11px] leading-relaxed text-slate-500">
            Rapport indicatif de flux monétaires · {companyName} · {referenceLabel}
          </p>
        </footer>
      </div>
    </article>
  )
}
