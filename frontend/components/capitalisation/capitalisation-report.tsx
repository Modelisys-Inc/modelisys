"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { InlineNumber, InlineTextArea } from "@/components/cmpc/editable"
import { NetTangibleReportSection } from "@/components/net-tangible/report-section"
import type { UseEbitdaCapitalisationReturn } from "@/hooks/use-ebitda-capitalisation"
import { formatCurrency } from "@/lib/financial-utils"

export type CapitalisationReportProps = {
  companyName: string
  referenceLabel: string
  capitalisation: UseEbitdaCapitalisationReturn
}

const REPORT_NAV = [
  { id: "multiple", label: "1. Multiple" },
  { id: "valeur", label: "2. Valeur" },
  { id: "restrictions", label: "3. Restrictions" },
] as const

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
}

function DisclaimerSection() {
  return (
    <NetTangibleReportSection id="restrictions" number="3." title="Restrictions et limitations">
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
          Capitalisation du BAIIA
        </h2>
        <p className="mt-3 max-w-3xl text-pretty text-sm leading-relaxed text-slate-500">
          Le présent rapport applique une fourchette de multiples au BAIIA représentatif de{" "}
          <span className="font-medium text-[#2A2F3A]">{companyName}</span>, en date du{" "}
          <span className="font-medium text-[#2A2F3A]">{referenceLabel}</span>, pour estimer la
          valeur d&apos;entreprise.
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
            BAIIA représentatif (étape BAIIA ajusté), multiple retenu et fourchette de valeur
            d&apos;entreprise.
          </p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-white/10 md:grid-cols-3 xl:grid-cols-6 xl:divide-y-0">
          {[
            { id: "baiia-mid", label: "BAIIA médian", value: formatCurrency(c.midEBITDARange) },
            {
              id: "multiple-mid",
              label: "Multiple médian",
              value: `${c.midMultiple.toFixed(2)}×`,
            },
            {
              id: "ev-low",
              label: "VE basse",
              value: formatCurrency(c.lowEnterpriseValue),
            },
            {
              id: "ev-mid",
              label: "VE médiane",
              value: formatCurrency(c.midEnterpriseValue),
            },
            {
              id: "ev-high",
              label: "VE haute",
              value: formatCurrency(c.highEnterpriseValue),
            },
            {
              id: "weighted",
              label: "BAIIA pondéré",
              value: formatCurrency(c.weightedAverageEBITDA),
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
        La capitalisation applique une fourchette de multiples au BAIIA représentatif déterminé
        à l&apos;étape <span className="font-medium text-[#2A2F3A]">BAIIA ajusté</span>
        &nbsp;:{" "}
        <span className="font-mono text-[#2A2F3A]">
          Valeur d&apos;entreprise = BAIIA représentatif × Multiple
        </span>
        .
      </p>

      <NetTangibleReportSection id="multiple" number="1." title="Fourchette de multiples">
        <p className="mb-4 text-pretty text-sm leading-relaxed text-slate-500">
          Retenez un multiple bas et un multiple haut cohérents avec le profil de risque de
          l&apos;entreprise.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              {
                side: "low" as const,
                label: "Multiple bas",
                value: c.lowMultiple,
                onChange: c.setLowMultiple,
                note: c.multipleNotes.low || "",
              },
              {
                side: "high" as const,
                label: "Multiple haut",
                value: c.highMultiple,
                onChange: c.setHighMultiple,
                note: c.multipleNotes.high || "",
              },
            ]
          ).map((row) => (
            <div
              key={row.side}
              className="rounded-md border border-slate-200 px-4 py-3"
              data-testid={`capitalisation-multiple-${row.side}`}
            >
              <p className="text-sm font-medium text-[#2A2F3A]">{row.label}</p>
              <div className="mt-2">
                <InlineNumber
                  value={row.value}
                  onChange={(v) => {
                    if (!Number.isFinite(v)) return
                    row.onChange(v)
                  }}
                  unit="×"
                  step={0.1}
                  min={0}
                  width="w-20"
                  ariaLabel={row.label}
                  testId={`capitalisation-multiple-value-${row.side}`}
                />
              </div>
              <div className="mt-2">
                <InlineTextArea
                  value={row.note}
                  onChange={(note) => c.updateMultipleNote(row.side, note)}
                  placeholder="Note / justification"
                  ariaLabel={`Note ${row.label}`}
                  testId={`capitalisation-multiple-note-${row.side}`}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Médiane&nbsp;:{" "}
          <span className="font-mono font-medium text-[#2A2F3A]">
            {c.midMultiple.toFixed(2)}×
          </span>
        </p>
      </NetTangibleReportSection>

      <NetTangibleReportSection id="valeur" number="2." title="Valeur d'entreprise">
        <p className="mb-4 text-pretty text-sm leading-relaxed text-slate-500">
          Application des bornes de BAIIA (étape BAIIA ajusté) et de multiples. La zone ombrée
          illustre la fourchette de valeur selon le multiple.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-slate-200 px-3 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              VE basse
            </p>
            <p
              className="mt-1 font-mono text-base font-semibold tabular-nums text-[#2A2F3A]"
              data-testid="capitalisation-ev-low"
            >
              {formatCurrency(c.lowEnterpriseValue)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatCurrency(c.lowEBITDARange)} × {c.lowMultiple.toFixed(2)}
            </p>
          </div>
          <div className="rounded-md border border-[#E0742D]/40 bg-[#E0742D]/5 px-3 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#E0742D]">
              VE médiane
            </p>
            <p
              className="mt-1 font-mono text-base font-semibold tabular-nums text-[#2A2F3A]"
              data-testid="capitalisation-ev-mid"
            >
              {formatCurrency(c.midEnterpriseValue)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatCurrency(c.midEBITDARange)} × {c.midMultiple.toFixed(2)}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 px-3 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              VE haute
            </p>
            <p
              className="mt-1 font-mono text-base font-semibold tabular-nums text-[#2A2F3A]"
              data-testid="capitalisation-ev-high"
            >
              {formatCurrency(c.highEnterpriseValue)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatCurrency(c.highEBITDARange)} × {c.highMultiple.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="mt-6 h-64 w-full" data-testid="capitalisation-ev-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={c.enterpriseValueChartData}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="capEvBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E0742D" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#E0742D" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="multiple"
                tick={{ fontSize: 11, fill: "#64748b" }}
                label={{
                  value: "Multiple",
                  position: "insideBottom",
                  offset: -2,
                  fontSize: 11,
                }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickFormatter={(v) =>
                  typeof v === "number" ? `${Math.round(v / 1000)}k` : String(v)
                }
              />
              <Tooltip
                formatter={(value) =>
                  typeof value === "number" ? formatCurrency(value) : String(value ?? "")
                }
                labelFormatter={(label) => `Multiple ${label}×`}
              />
              <Area
                type="monotone"
                dataKey="highEV"
                stroke="transparent"
                fill="url(#capEvBand)"
                name="VE haute"
              />
              <Area
                type="monotone"
                dataKey="lowEV"
                stroke="transparent"
                fill="#fff"
                name="VE basse"
              />
              <Area
                type="monotone"
                dataKey="enterpriseValue"
                stroke="#E0742D"
                fill="transparent"
                strokeWidth={2}
                name="VE médiane"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </NetTangibleReportSection>

      <DisclaimerSection />

      <footer className="mt-10 border-t border-slate-200 pt-4">
        <p className="text-pretty text-[11px] leading-relaxed text-slate-500">
          Rapport indicatif de capitalisation du BAIIA · {companyName} · {referenceLabel}
        </p>
      </footer>
    </article>
  )
}
