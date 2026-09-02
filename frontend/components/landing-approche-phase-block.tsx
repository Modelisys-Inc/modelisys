"use client"

import type { ReactElement } from "react"
import type { ApprochePhaseId } from "@/lib/approche-navigation"
import {
  APPROCHE_PHASE_ACCENTS,
  APPROCHE_PHASE_MARKETING_CONTENT,
} from "@/lib/approche-phase-marketing-content"

const visualCardClass =
  "relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-200/70"

function DiagnosticVisual() {
  const kpis = [
    { label: "Revenus", value: "4,2 M$" },
    { label: "BAIIA", value: "18 %" },
    { label: "Valeur", value: "6,0 M$" },
  ]

  return (
    <div className={visualCardClass}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Lecture financière</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-slate-200/80 bg-slate-50/90 px-2.5 py-2.5">
            <p className="text-[9px] uppercase tracking-wide text-slate-500">{kpi.label}</p>
            <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-[#2A2F3A]">{kpi.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex h-24 items-end gap-1.5">
        {[42, 58, 51, 67, 74, 69, 82].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-gradient-to-t from-[#E0742D] to-[#FDBA74]"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <p className="mt-3 text-[10px] text-slate-500">Tendance · performance · risques</p>
    </div>
  )
}

function PlanificationVisual() {
  const scenarios = [
    { label: "Prudent", value: "5,8 M$", pct: 58 },
    { label: "Central", value: "6,8 M$", pct: 74 },
    { label: "Ambitieux", value: "8,1 M$", pct: 92 },
  ]

  return (
    <div className={visualCardClass}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Scénarios · 3 ans</p>
      <div className="mt-4 space-y-3">
        {scenarios.map((scenario) => (
          <div key={scenario.label}>
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="text-slate-600">{scenario.label}</span>
              <span className="font-mono tabular-nums text-[#2A2F3A]">{scenario.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#5B8DEF] to-[#93C5FD]"
                style={{ width: `${scenario.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[10px] text-slate-500">Objectif de valeur · trésorerie · financement</p>
    </div>
  )
}

function PilotageVisual() {
  const rows = [
    { label: "Revenus", plan: 92, actual: 88 },
    { label: "Marge", plan: 76, actual: 71 },
    { label: "Trésorerie", plan: 84, actual: 79 },
  ]

  return (
    <div className={visualCardClass}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Réel vs prévu</p>
      <div className="mt-4 space-y-3.5">
        {rows.map((row) => (
          <div key={row.label}>
            <p className="mb-1.5 text-[11px] text-slate-600">{row.label}</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-10 text-[9px] uppercase text-slate-400">Prévu</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200/80">
                  <div className="h-full rounded-full bg-slate-400/60" style={{ width: `${row.plan}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-10 text-[9px] uppercase text-[#2F7A58]">Réel</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200/80">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#4A9B73] to-[#6EE7B7]"
                    style={{ width: `${row.actual}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[10px] text-slate-500">Écarts · actions · ajustements</p>
    </div>
  )
}

const PHASE_VISUALS: Record<ApprochePhaseId, () => ReactElement> = {
  diagnostic: DiagnosticVisual,
  planification: PlanificationVisual,
  pilotage: PilotageVisual,
}

type Props = {
  phaseId: ApprochePhaseId
  reversed?: boolean
  highlighted?: boolean
}

export function LandingApprochePhaseBlock({ phaseId, reversed = false, highlighted = false }: Props) {
  const content = APPROCHE_PHASE_MARKETING_CONTENT[phaseId]
  const accent = APPROCHE_PHASE_ACCENTS[phaseId]
  const Visual = PHASE_VISUALS[phaseId]

  return (
    <article
      id={`phase-${phaseId}`}
      className={`scroll-mt-28 rounded-[28px] transition-shadow duration-500 ${
        highlighted ? `ring-2 ${accent.ring} ring-offset-2 ring-offset-[#F8FAFC]` : ""
      }`}
    >
      <div
        className={`relative overflow-hidden rounded-[28px] border border-slate-200/90 bg-gradient-to-br shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-200/70 ${accent.gradient}`}
      >
        <div className={`pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full blur-3xl ${accent.glow}`} />
        <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-[#E0742D]/[0.08]" />

        <div
          className={`relative grid gap-8 p-6 sm:p-8 lg:grid-cols-2 lg:items-center lg:gap-10 xl:gap-14 ${
            reversed ? "lg:[&>*:first-child]:order-2" : ""
          }`}
        >
          <div>
            <div className="flex items-center gap-3">
              <span className={`h-2 w-2 rounded-full ${accent.dot}`} aria-hidden />
              <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${accent.label}`}>
                {content.phaseTitle}
              </p>
            </div>

            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[#2A2F3A] sm:text-3xl">{content.tagline}</h3>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Ce que ça fait</p>
                <p className="mt-2 text-sm leading-relaxed text-[#5C5F66] sm:text-[15px]">{content.whatItDoes}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Pourquoi c&apos;est important
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#4A4F5C] sm:text-[15px]">{content.whyItMatters}</p>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-200/80 pt-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {content.listLabel}
              </p>
              <ul className="mt-3 space-y-2.5">
                {content.items.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-[#5C5F66] sm:text-[15px]">
                    <span className={`mt-2 h-px w-3 shrink-0 ${accent.dot}`} aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:px-2">
            <Visual />
          </div>
        </div>
      </div>
    </article>
  )
}
