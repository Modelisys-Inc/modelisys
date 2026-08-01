"use client"

import { useMemo } from "react"
import {
  ArrowRight,
  AlertTriangle,
  BarChart3,
  Building2,
  Layers,
  LineChart,
  PieChart,
  Scale,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react"
import type { CompanyDiagnostic } from "@/lib/api"
import {
  buildExecutiveSummary,
  type ExecutiveSummaryBlock,
} from "@/lib/diagnostic-executive-summary"
import type { DiagnosticReportView } from "@/components/diagnostic/v2/diagnostic-nav-rail"
import { CARD_CLASS, MONO_CLASS, signalClass } from "@/lib/diagnostic-theme"
import { cn } from "@/lib/utils"

export const DIAGNOSTIC_SUMMARY_ANCHOR_ID = "diag-sommaire"

const BLOCK_ICONS: Record<string, typeof TrendingUp> = {
  performance: LineChart,
  revenue: TrendingUp,
  "margin-by-revenue": PieChart,
  expenses: BarChart3,
  "expenses-by-division": Layers,
  "financial-position": Building2,
  "working-capital": Wallet,
  saisonnalite: BarChart3,
  profil: Sparkles,
  ratios: Scale,
  produits: Layers,
  valorisation: Wallet,
}

function metricToneClass(tone?: string) {
  if (tone === "positive") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (tone === "negative") return "border-red-200 bg-red-50 text-red-800"
  if (tone === "watch") return "border-amber-200 bg-amber-50 text-amber-900"
  return "border-slate-200 bg-slate-50 text-slate-700"
}

function SummaryBlockCard({
  block,
  onNavigate,
}: {
  block: ExecutiveSummaryBlock
  onNavigate: (view: DiagnosticReportView) => void
}) {
  const Icon = BLOCK_ICONS[block.id] ?? BarChart3
  const isClickable = Boolean(block.reportView || block.scrollTargetId)

  const handleClick = () => {
    if (block.reportView) onNavigate(block.reportView)
    else if (block.scrollTargetId) {
      document.getElementById(block.scrollTargetId)?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all",
        isClickable && "cursor-pointer hover:border-[#E0742D]/40 hover:shadow-md",
      )}
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                handleClick()
              }
            }
          : undefined
      }
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#E0742D]/5 blur-2xl transition-opacity group-hover:opacity-100"
        aria-hidden
      />
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-gradient-to-br from-[#2A2F3A] to-[#3d4554] text-[#E6D6C3] shadow-sm">
          <Icon className="h-4.5 w-4.5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold tracking-tight text-[#2A2F3A]">{block.title}</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">{block.subtitle}</p>
        </div>
        {isClickable ? (
          <ArrowRight
            className="mt-1 h-4 w-4 flex-none text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#E0742D]"
            aria-hidden
          />
        ) : null}
      </div>

      <div className="mt-4 space-y-2.5">
        {block.paragraphs.map((para, i) => (
          <p key={i} className="text-[12.5px] leading-relaxed text-slate-600">
            {para}
          </p>
        ))}
      </div>

      {block.metrics && block.metrics.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {block.metrics.map((m) => (
            <span
              key={m.label}
              className={cn(
                "inline-flex flex-col rounded-lg border px-2.5 py-1.5",
                metricToneClass(m.tone),
              )}
            >
              <span className="text-[9px] font-medium uppercase tracking-wide opacity-80">{m.label}</span>
              <span className={`text-xs font-semibold ${MONO_CLASS}`}>{m.value}</span>
            </span>
          ))}
        </div>
      ) : null}

      {block.highlight ? (
        <p className={cn("mt-3 text-[10.5px] leading-relaxed", signalClass(block.highlight.tone))}>
          {block.highlight.text}
        </p>
      ) : null}
    </article>
  )
}

interface DiagnosticExecutiveSummaryProps {
  diagnostic: CompanyDiagnostic
  onNavigateToView: (view: DiagnosticReportView) => void
}

export function DiagnosticExecutiveSummary({
  diagnostic,
  onNavigateToView,
}: DiagnosticExecutiveSummaryProps) {
  const model = useMemo(() => buildExecutiveSummary(diagnostic), [diagnostic])

  return (
    <section
      id={DIAGNOSTIC_SUMMARY_ANCHOR_ID}
      data-testid="diagnostic-executive-summary"
      className={`${CARD_CLASS} scroll-mt-28 overflow-hidden`}
    >
      <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-[#2A2F3A] via-[#323845] to-[#2A2F3A] px-6 py-8 sm:px-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, #E0742D 0%, transparent 50%), radial-gradient(circle at 80% 20%, #fff 0%, transparent 40%)",
          }}
          aria-hidden
        />
        <div className="relative max-w-4xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E0742D]">
            Briefing analytique · Réf. {model.referenceLabel}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#E6D6C3] sm:text-3xl">
            {model.headline}
          </h2>
          <div className="mt-4 space-y-3">
            {model.introParagraphs.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-[#C9B8A5]/95">
                {p}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-6 sm:p-8 lg:grid-cols-2">
        {model.blocks.map((block) => (
          <SummaryBlockCard key={block.id} block={block} onNavigate={onNavigateToView} />
        ))}
      </div>

      <div className="border-t border-slate-200 bg-gradient-to-b from-slate-50/80 to-white px-6 py-8 sm:px-8">
        {model.attentionPoints.length > 0 ? (
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
              <h3 className="text-sm font-semibold text-[#2A2F3A]">
                Points d&apos;attention ({model.attentionPoints.length})
              </h3>
            </div>
            <ul className="space-y-2">
              {model.attentionPoints.map((s, i) => (
                <li key={i} className={signalClass(s.tone)}>
                  {s.text}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="rounded-xl border border-[#E0742D]/20 bg-gradient-to-r from-orange-50/80 to-white p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#E0742D]">
            En synthèse
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{model.conclusionParagraph}</p>
        </div>
      </div>
    </section>
  )
}
