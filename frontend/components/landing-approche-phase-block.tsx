"use client"

import { useId } from "react"
import type { ReactElement } from "react"
import type { ApprochePhaseId } from "@/lib/approche-navigation"
import {
  APPROCHE_PHASE_ACCENTS,
  APPROCHE_PHASE_MARKETING_CONTENT,
} from "@/lib/approche-phase-marketing-content"
import { cn } from "@/lib/utils"

function PhaseOrbit({ accentStroke, className }: { accentStroke: string; className?: string }) {
  const uid = useId().replace(/:/g, "")

  return (
    <svg
      viewBox="0 0 420 420"
      className={cn(
        "pointer-events-none absolute left-1/2 top-[42%] h-[min(100%,22rem)] w-[min(100%,22rem)] -translate-x-1/2 -translate-y-1/2 opacity-50",
        className,
      )}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${uid}-orbit`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(42,47,58,0.18)" />
          <stop offset="100%" stopColor={accentStroke} />
        </linearGradient>
      </defs>
      <circle
        cx="210"
        cy="210"
        r="148"
        fill="none"
        stroke={`url(#${uid}-orbit)`}
        strokeWidth="0.75"
        className="hero-orbit-slow"
        style={{ transformOrigin: "210px 210px" }}
      />
      <circle
        cx="210"
        cy="210"
        r="108"
        fill="none"
        stroke="rgba(42,47,58,0.1)"
        strokeWidth="0.6"
        strokeDasharray="2 6"
        className="hero-orbit-reverse"
        style={{ transformOrigin: "210px 210px" }}
      />
      <circle cx="210" cy="210" r="3" fill="rgba(42,47,58,0.35)" />
    </svg>
  )
}

function PhaseHeroFigure({
  eyebrow,
  figure,
  unit,
  meta,
  legend,
  accentStroke,
  accentClass,
}: {
  eyebrow: string
  figure: string
  unit?: string
  meta: Array<{ label: string; value: string }>
  legend: string
  accentStroke: string
  accentClass: string
}) {
  return (
    <div className="relative flex min-h-[18rem] flex-col justify-center sm:min-h-[20rem]">
      <div
        className="pointer-events-none absolute left-1/2 top-[38%] h-[18rem] w-[18rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E0742D]/[0.04] blur-3xl"
        aria-hidden
      />
      <PhaseOrbit accentStroke={accentStroke} />

      <div className="relative z-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">{eyebrow}</p>

        <p className="mt-4 font-mono text-[3.5rem] font-semibold leading-none tracking-tight text-[#2A2F3A] sm:text-[4.25rem]">
          {figure}
          {unit ? (
            <span className="ml-2 text-[1.15rem] font-medium tracking-normal text-slate-500 sm:text-[1.35rem]">
              {unit}
            </span>
          ) : null}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500">
          {meta.map((item, i) => (
            <span key={item.label} className="inline-flex items-center gap-x-4">
              {i > 0 ? <span className="h-3 w-px bg-[#2A2F3A]/15" aria-hidden /> : null}
              <span>
                <span className="font-mono tabular-nums text-[#2A2F3A]/90">{item.value}</span>
                <span className="ml-1.5">{item.label}</span>
              </span>
            </span>
          ))}
        </div>

        <div className={cn("mt-8 h-px w-24 bg-gradient-to-r to-transparent", accentClass)} aria-hidden />

        <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-slate-600">{legend}</p>
      </div>
    </div>
  )
}

function DiagnosticVisual() {
  return (
    <PhaseHeroFigure
      eyebrow="Valeur indicative"
      figure="6,0"
      unit="M$"
      meta={[
        { label: "Revenus", value: "4,2 M$" },
        { label: "BAIIA", value: "18 %" },
      ]}
      legend="Point de départ objectif — performance, risques et lecture de la valeur sur une même base."
      accentStroke="rgba(224,116,45,0.35)"
      accentClass="from-[#E0742D]/80"
    />
  )
}

function PlanificationVisual() {
  return (
    <PhaseHeroFigure
      eyebrow="Objectif de valeur"
      figure="6,8"
      unit="M$"
      meta={[
        { label: "Prudent", value: "5,8 M$" },
        { label: "Ambitieux", value: "8,1 M$" },
      ]}
      legend="Scénario central à 3 ans — comparer les chemins avant de s’engager sur la trajectoire."
      accentStroke="rgba(91,141,239,0.4)"
      accentClass="from-[#5B8DEF]/80"
    />
  )
}

function PilotageVisual() {
  return (
    <PhaseHeroFigure
      eyebrow="Écart · revenus"
      figure="−4"
      unit="pts"
      meta={[
        { label: "Prévu", value: "92 %" },
        { label: "Réel", value: "88 %" },
      ]}
      legend="Le réel confronté au prévu — pour corriger le cap avant que l’écart ne s’installe."
      accentStroke="rgba(74,155,115,0.4)"
      accentClass="from-[#4A9B73]/80"
    />
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
      className={`scroll-mt-28 py-12 sm:py-14 lg:py-16 transition-opacity duration-500 ${
        highlighted ? "opacity-100" : ""
      }`}
    >
      <div
        className={`grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14 xl:gap-20 ${
          reversed ? "lg:[&>*:first-child]:order-2" : ""
        }`}
      >
        <div>
          <div className="flex items-center gap-3">
            <p className={`text-[11px] font-medium uppercase tracking-[0.18em] ${accent.label}`}>
              <span className="font-mono tabular-nums">{content.phaseNumber}</span>
              <span className="mx-2 text-[#2A2F3A]/25" aria-hidden>
                —
              </span>
              {content.shortTitle}
            </p>
          </div>

          <h3 className="mt-5 text-2xl font-semibold tracking-tight text-[#2A2F3A] sm:text-[1.75rem]">
            {content.tagline}
          </h3>

          <div className="mt-8 space-y-6">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                Ce que ça fait
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{content.whatItDoes}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                Pourquoi c&apos;est important
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{content.whyItMatters}</p>
            </div>
          </div>

          <div className="mt-8 border-t border-[#2A2F3A]/10 pt-6">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
              {content.listLabel}
            </p>
            <ul className="mt-4 space-y-3">
              {content.items.map((item) => (
                <li key={item} className="flex gap-3 text-[15px] leading-relaxed text-slate-600">
                  <span className={`mt-[0.65rem] h-px w-3 shrink-0 ${accent.dot}`} aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className={cn(
            "relative",
            highlighted && `rounded-sm ring-1 ${accent.ring} ring-offset-8 ring-offset-[#F8FAFC]`,
          )}
        >
          <Visual />
        </div>
      </div>
    </article>
  )
}
