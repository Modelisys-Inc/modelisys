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
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 shadow-lg">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#E0742D]" />
      </div>
    )
  }

  const cf = c.characteristicCashFlows

  return (
    <article
      data-testid="adjusted-ebitda-report"
      data-report-sheet
      className="rounded-xl border border-slate-200 bg-white px-6 py-8 shadow-lg sm:px-12 sm:py-12"
    >
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E0742D]">
          Détermination de la valeur
        </p>
        <h2 className="mt-2 text-balance text-2xl font-semibold leading-tight tracking-tight text-[#2A2F3A] sm:text-3xl">
          Flux monétaires
        </h2>
        <p className="mt-3 max-w-3xl text-pretty text-sm leading-relaxed text-slate-500">
          Le présent rapport normalise le BAIIA de{" "}
          <span className="font-medium text-[#2A2F3A]">{companyName}</span>, en date du{" "}
          <span className="font-medium text-[#2A2F3A]">{referenceLabel}</span>, puis en déduit
          l&apos;impôt, l&apos;ajustement de fonds de roulement et les capex de maintien pour
          retenir des flux monétaires caractéristiques.
        </p>
      </header>

      <section
        data-testid="adjusted-ebitda-overview-strip"
        data-break-avoid
        className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-[#2A2F3A] text-white shadow-sm"
      >
        <div className="border-b border-white/15 px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E0742D]">
            Sommaire de la conclusion
          </p>
          <p className="mt-2 max-w-3xl text-pretty text-sm leading-relaxed text-white/80">
            Fourchette de BAIIA ajusté retenu et flux monétaires caractéristiques à la date de
            référence.
          </p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-white/10 md:grid-cols-3 xl:grid-cols-6 xl:divide-y-0">
          {[
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
          ].map((metric) => (
            <div
              key={metric.id}
              data-testid={`adjusted-ebitda-overview-${metric.id}`}
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
        data-testid="adjusted-ebitda-section-menu"
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

      <AdjustedEbitdaMethodSection />
      <BaiiaSection capitalisation={c} />
      <FourchetteSection capitalisation={c} />
      <FluxMonetairesSection capitalisation={c} />

      <footer className="mt-10 border-t border-slate-200 pt-4">
        <p className="text-pretty text-[11px] leading-relaxed text-slate-500">
          Rapport indicatif de flux monétaires · {companyName} · {referenceLabel}
        </p>
      </footer>
    </article>
  )
}
