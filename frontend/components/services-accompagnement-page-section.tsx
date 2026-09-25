"use client"

import { useEffect, useState } from "react"
import { ServicesOtherServicesSection } from "@/components/services-other-services-section"
import {
  SERVICES_ACCOMPAGNEMENT_CASES,
  SERVICES_ACCOMPAGNEMENT_OFFERINGS,
  SERVICES_ACCOMPAGNEMENT_PAGE,
  SERVICES_ACCOMPAGNEMENT_STEPS,
  type ServicesAccompagnementCase,
} from "@/lib/services-accompagnement-content"
import { cn } from "@/lib/utils"

function AccompagnementCaseCard({ study }: { study: ServicesAccompagnementCase }) {
  return (
    <aside
      className="rounded-2xl border border-[#2A2F3A]/[0.08] bg-[#2A2F3A]/[0.03] p-5 sm:p-7"
      aria-label={`Cas — ${study.title}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E0742D]">
          Cas · Accompagnement
        </p>
        <p className="text-[11px] font-medium text-slate-500">{study.profile}</p>
      </div>
      <h3 className="mt-3 max-w-2xl text-lg font-semibold tracking-tight text-[#2A2F3A] sm:text-xl">
        {study.title}
      </h3>
      <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-3 border-b border-[#2A2F3A]/10 pb-5">
        {study.figures.map((fig) => (
          <div key={fig.label}>
            <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
              {fig.label}
            </dt>
            <dd className="mt-1 font-mono text-sm font-semibold tabular-nums tracking-tight text-[#2A2F3A] sm:text-base">
              {fig.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 grid gap-5 sm:grid-cols-3 sm:gap-6">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
            Situation
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-600 sm:text-[14px]">
            {study.situation}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
            Intervention
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-600 sm:text-[14px]">
            {study.intervention}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
            Résultat
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-600 sm:text-[14px]">
            {study.result}
          </p>
        </div>
      </div>
    </aside>
  )
}

export function ServicesAccompagnementPageSection() {
  const [tabsReady, setTabsReady] = useState(false)
  const [activeCaseId, setActiveCaseId] = useState(SERVICES_ACCOMPAGNEMENT_CASES[0].id)

  useEffect(() => {
    setTabsReady(true)
  }, [])

  const activeCase =
    SERVICES_ACCOMPAGNEMENT_CASES.find((study) => study.id === activeCaseId) ??
    SERVICES_ACCOMPAGNEMENT_CASES[0]

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F8FAFC]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[#F8FAFC]" />
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(42 47 58 / 0.045) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(42 47 58 / 0.045) 1px, transparent 1px)
            `,
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 70% 65% at 28% 18%, black 12%, transparent 72%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 65% at 28% 18%, black 12%, transparent 72%)",
          }}
        />
        <div className="absolute -top-24 right-[-8%] h-[28rem] w-[28rem] rounded-full bg-[#E0742D]/[0.05] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-5 pb-20 pt-28 sm:px-10 sm:pb-28 sm:pt-32 lg:px-12 xl:px-16 2xl:px-20">
        <header className="max-w-3xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
            {SERVICES_ACCOMPAGNEMENT_PAGE.eyebrow}
          </p>
          <h1 className="mt-6 text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#2A2F3A] sm:text-[2.35rem] sm:leading-[1.12] xl:text-[2.55rem]">
            {SERVICES_ACCOMPAGNEMENT_PAGE.title}
          </h1>
          <p className="mt-6 text-[15px] leading-[1.75] text-slate-600 sm:text-base">
            {SERVICES_ACCOMPAGNEMENT_PAGE.intro}
          </p>
        </header>

        <section className="mt-14" aria-labelledby="accompagnement-permet">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-4">
              <p
                id="accompagnement-permet"
                className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#9A4A1A]"
              >
                Ce que ça permet
              </p>
              <p className="mt-5 text-[15px] leading-relaxed text-slate-600">
                {SERVICES_ACCOMPAGNEMENT_PAGE.allowsLead}
              </p>
            </div>
            <div className="divide-y divide-[#2A2F3A]/10 lg:col-span-8">
              {SERVICES_ACCOMPAGNEMENT_OFFERINGS.map((item) => (
                <div key={item.id} id={`accompagnement-${item.id}`} className="py-8 first:pt-0 last:pb-0">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#9A4A1A]">
                    <span className="font-mono tabular-nums">{item.number}</span>
                    <span className="mx-2 text-[#2A2F3A]/25" aria-hidden>
                      —
                    </span>
                    {item.title}
                  </p>
                  <h2 className="mt-4 text-lg font-semibold tracking-tight text-[#2A2F3A]">
                    {item.lead}
                  </h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{item.body}</p>
                  <p className="mt-3 text-[14px] leading-relaxed text-[#2A2F3A]/80">{item.feeds}</p>
                  <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                    Exemples
                  </p>
                  <ul className="mt-3 space-y-2">
                    {item.examples.map((ex) => (
                      <li
                        key={ex}
                        className="flex gap-3 text-[15px] leading-relaxed text-slate-600"
                      >
                        <span
                          className="mt-[0.65rem] h-px w-3 shrink-0 bg-[#E0742D]"
                          aria-hidden
                        />
                        <span>{ex}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-16 grid gap-10 border-t border-[#2A2F3A]/10 pt-14 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#9A4A1A]">
              Comment ça fonctionne
            </p>
          </div>
          <ol className="space-y-6 lg:col-span-8">
            {SERVICES_ACCOMPAGNEMENT_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="font-mono text-sm font-semibold tabular-nums text-[#E0742D]">
                  {index + 1}.
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-[#2A2F3A]">{step.title}</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <section className="mt-16 border-t border-[#2A2F3A]/10 pt-14" aria-label="Cas — Accompagnement">
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#9A4A1A]">
                Cas
              </p>
            </div>
            <div className="lg:col-span-8">
              <nav
                className="flex flex-wrap gap-x-1 gap-y-2 border-b border-[#2A2F3A]/10 pb-px"
                aria-label="Cas d’accompagnement"
                role="tablist"
                data-ready={tabsReady ? "true" : "false"}
              >
                {SERVICES_ACCOMPAGNEMENT_CASES.map((study) => {
                  const isActive = activeCaseId === study.id
                  return (
                    <button
                      key={study.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      data-testid={`accompagnement-cas-${study.id}`}
                      onClick={() => setActiveCaseId(study.id)}
                      className={cn(
                        "relative px-3 py-3 text-[11px] font-semibold tracking-[0.08em] transition-colors duration-300 sm:px-4 sm:text-xs",
                        isActive ? "text-[#2A2F3A]" : "text-slate-400 hover:text-slate-600",
                      )}
                    >
                      {study.tabLabel}
                      <span
                        className={cn(
                          "absolute inset-x-3 -bottom-px h-px transition-colors duration-300 sm:inset-x-4",
                          isActive ? "bg-[#E0742D]" : "bg-transparent",
                        )}
                        aria-hidden
                      />
                    </button>
                  )
                })}
              </nav>
              <div className="mt-8">
                <AccompagnementCaseCard key={activeCase.id} study={activeCase} />
              </div>
            </div>
          </div>
        </section>

        <div className="mt-16 sm:mt-20">
          <ServicesOtherServicesSection currentId="accompagnement" />
        </div>
      </div>
    </div>
  )
}
