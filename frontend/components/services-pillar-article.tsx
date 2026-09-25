"use client"

import { useEffect, useState } from "react"
import type { ServicesPageCase, ServicesPagePillar } from "@/lib/services-page-content"
import { cn } from "@/lib/utils"

type ServicesPillarArticleProps = {
  pillar: ServicesPagePillar
  /** When true, render as page-level section (h1 for tagline). */
  asPage?: boolean
}

function PillarCaseCard({
  study,
  TitleTag,
  eyebrow,
}: {
  study: ServicesPageCase
  TitleTag: "h2" | "h3"
  eyebrow: string
}) {
  const hasNarrative = Boolean(study.situation || study.problem)

  return (
    <aside
      className="rounded-2xl border border-[#2A2F3A]/[0.08] bg-[#2A2F3A]/[0.03] p-5 sm:p-7"
      aria-label={`Cas — ${study.title}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E0742D]">
          Cas · {eyebrow}
        </p>
        {study.profile ? (
          <p className="text-[11px] font-medium text-slate-500">{study.profile}</p>
        ) : null}
      </div>
      <TitleTag className="mt-3 max-w-2xl text-lg font-semibold tracking-tight text-[#2A2F3A] sm:text-xl">
        {study.title}
      </TitleTag>

      {study.figures && study.figures.length > 0 ? (
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
      ) : null}

      {hasNarrative ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-3 sm:gap-6">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
              Situation
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600 sm:text-[14px]">
              {study.situation ?? study.problem}
            </p>
          </div>
          {study.intervention || study.analysis ? (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                Intervention
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600 sm:text-[14px]">
                {study.intervention ?? study.analysis}
              </p>
            </div>
          ) : null}
          {study.result ? (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                Résultat
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600 sm:text-[14px]">
                {study.result}
              </p>
            </div>
          ) : null}
        </div>
      ) : study.body ? (
        <p className="mt-4 text-[15px] leading-relaxed text-slate-600">{study.body}</p>
      ) : null}

      {study.allowed ? (
        <div className="mt-5 border-t border-[#2A2F3A]/10 pt-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
            Ce que Modelisys a permis de faire
          </p>
          <p className="mt-2 text-[15px] font-semibold tracking-tight text-[#2A2F3A]">
            {study.allowed}
          </p>
        </div>
      ) : null}
    </aside>
  )
}

export function ServicesPillarArticle({ pillar, asPage = false }: ServicesPillarArticleProps) {
  const TitleTag = asPage ? "h1" : "h2"
  const SubTitleTag = asPage ? "h2" : "h3"
  const CaseTitleTag = asPage ? "h2" : "h3"
  const useCaseTabs = pillar.cases.length > 1 && pillar.cases.every((study) => study.tabLabel)
  const [tabsReady, setTabsReady] = useState(false)
  const [activeCaseId, setActiveCaseId] = useState(pillar.cases[0]?.id ?? pillar.cases[0]?.title ?? "")

  useEffect(() => {
    setTabsReady(true)
  }, [])

  const activeCase =
    pillar.cases.find((study) => (study.id ?? study.title) === activeCaseId) ?? pillar.cases[0]

  return (
    <article
      id={`services-${pillar.id}`}
      className={asPage ? "scroll-mt-28" : "scroll-mt-28 py-14 sm:py-16 lg:py-20"}
    >
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#9A4A1A]">
            <span className="font-mono tabular-nums">{pillar.number}</span>
            <span className="mx-2 text-[#2A2F3A]/25" aria-hidden>
              —
            </span>
            {pillar.label}
          </p>
          <TitleTag className="mt-5 text-2xl font-semibold tracking-tight text-[#2A2F3A] sm:text-[1.75rem]">
            {pillar.tagline}
          </TitleTag>
          <p className="mt-5 text-[15px] leading-relaxed text-slate-600">{pillar.intro}</p>
          {pillar.afterIntro ? (
            <p className="mt-4 text-[15px] leading-relaxed text-slate-600">{pillar.afterIntro}</p>
          ) : null}
          {pillar.idealFor ? (
            <div className="mt-6 border-t border-[#2A2F3A]/10 pt-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                Idéal pour
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{pillar.idealFor}</p>
            </div>
          ) : null}
        </div>

        <div className="space-y-12 lg:col-span-8">
          {pillar.whenItems && pillar.whenItems.length > 0 ? (
            <div>
              <SubTitleTag className="text-lg font-semibold tracking-tight text-[#2A2F3A]">
                {pillar.whenHeading ?? "Quand le sur-mesure s’impose"}
              </SubTitleTag>
              <ul className="mt-5 space-y-2.5">
                {pillar.whenItems.map((item) => (
                  <li key={item} className="flex gap-3 text-[15px] leading-relaxed text-slate-600">
                    <span className="mt-[0.65rem] h-px w-3 shrink-0 bg-[#E0742D]" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {pillar.offerings && pillar.offerings.length > 0 ? (
            <div>
              {pillar.offeringsLead ? (
                <p className="mb-8 text-[15px] leading-relaxed text-slate-600">
                  {pillar.offeringsLead}
                </p>
              ) : null}
              <div className="space-y-12">
              {pillar.offerings.map((offering) => (
                <div key={offering.title}>
                  <SubTitleTag className="text-lg font-semibold tracking-tight text-[#2A2F3A]">
                    {offering.title}
                  </SubTitleTag>
                  <p className="mt-2 text-[15px] font-medium leading-relaxed text-[#2A2F3A]/90">
                    {offering.lead}
                  </p>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{offering.body}</p>
                  {offering.examples ? (
                    <div className="mt-4">
                      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                        Exemples
                      </p>
                      <ul className="mt-3 space-y-2">
                        {offering.examples.map((ex) => (
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
                  ) : null}
                </div>
              ))}
              </div>
            </div>
          ) : null}

          {pillar.structureItems ? (
            <div>
              <SubTitleTag className="text-lg font-semibold tracking-tight text-[#2A2F3A]">
                Ce que le moteur permet de structurer
              </SubTitleTag>
              <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {pillar.structureItems.map((item) => (
                  <li key={item} className="flex gap-3 text-[15px] leading-relaxed text-slate-600">
                    <span className="mt-[0.65rem] h-px w-3 shrink-0 bg-[#E0742D]" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {pillar.steps ? (
            <div>
              <SubTitleTag className="text-lg font-semibold tracking-tight text-[#2A2F3A]">
                Comment ça fonctionne
              </SubTitleTag>
              <ol className="mt-5 space-y-5">
                {pillar.steps.map((step, index) => (
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
          ) : null}

          {pillar.categories ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {pillar.categories.map((cat) => (
                <div
                  key={cat.title}
                  className="rounded-2xl border border-[#2A2F3A]/10 bg-white/70 p-5"
                >
                  <p className="text-sm font-semibold text-[#2A2F3A]">{cat.title}</p>
                  <p className="mt-2 text-[14px] leading-relaxed text-slate-600">{cat.body}</p>
                </div>
              ))}
            </div>
          ) : null}

          {pillar.cases.length > 0 ? (
            <div className="border-t border-[#2A2F3A]/10 pt-10">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                Études de cas
              </p>
              {useCaseTabs && activeCase ? (
                <>
                  <nav
                    className="mt-5 flex flex-wrap gap-x-1 gap-y-2 border-b border-[#2A2F3A]/10 pb-px"
                    aria-label={`Cas — ${pillar.label}`}
                    role="tablist"
                    data-ready={tabsReady ? "true" : "false"}
                  >
                    {pillar.cases.map((study) => {
                      const caseId = study.id ?? study.title
                      const isActive = activeCaseId === caseId
                      return (
                        <button
                          key={caseId}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          data-testid={`${pillar.id}-cas-${caseId}`}
                          onClick={() => setActiveCaseId(caseId)}
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
                  <div className="mt-6">
                    <PillarCaseCard
                      key={activeCase.id ?? activeCase.title}
                      study={activeCase}
                      TitleTag={CaseTitleTag}
                      eyebrow={pillar.label}
                    />
                  </div>
                </>
              ) : (
                <div className="mt-6 space-y-6">
                  {pillar.cases.map((study) => (
                    <PillarCaseCard
                      key={study.title}
                      study={study}
                      TitleTag={CaseTitleTag}
                      eyebrow={pillar.label}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}
