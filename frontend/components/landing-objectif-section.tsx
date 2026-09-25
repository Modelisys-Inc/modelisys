"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowRight, Check, Search } from "lucide-react"
import { scrollToApprocheSection } from "@/lib/approche-navigation"
import { cn } from "@/lib/utils"

const SEARCH_PROMPTS = [
  {
    question: "Combien vaut mon entreprise ?",
    insightLabel: "Valeur indicative",
    insightValue: "6,0 M$",
    insightMeta: "BAIIA 18 % · multiple 4,5×",
  },
  {
    question: "Quelles divisions performent moins bien ?",
    insightLabel: "Division sous pression",
    insightValue: "Technique",
    insightMeta: "Marge −4 % · Services +18 %",
  },
  {
    question: "Est-ce que mon modèle d’affaires comporte des risques importants ?",
    insightLabel: "Concentration client",
    insightValue: "45 %",
    insightMeta: "3 clients · saisonnalité T2–T4",
  },
  {
    question: "Sommes-nous sur la bonne trajectoire pour atteindre le rendement souhaité ?",
    insightLabel: "Rendement projeté",
    insightValue: "+32,8 %",
    insightMeta: "Horizon 3 ans · vs objectif",
  },
  {
    question: "Quel sera l’impact sur notre trésorerie et notre valeur si l’on investit ?",
    insightLabel: "Impact trésorerie",
    insightValue: "−180 k$",
    insightMeta: "An 1 · valeur +0,4 M$ à 3 ans",
  },
] as const

const HIGHLIGHTS = [
  "Comprendre ce qui crée ou détruit de la valeur.",
  "Planifier les décisions et leur impact financier.",
  "Exécuter avec une vision financière complète.",
] as const

function FinancialQuestionSearch() {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [displayed, setDisplayed] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [showInsight, setShowInsight] = useState(false)

  const active = SEARCH_PROMPTS[questionIndex]

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => setReduceMotion(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  useEffect(() => {
    if (reduceMotion) {
      setDisplayed(SEARCH_PROMPTS[0].question)
      setShowInsight(true)
      return
    }

    const full = SEARCH_PROMPTS[questionIndex].question
    const typingMs = isDeleting ? 24 : 38
    const pauseAtEndMs = 2600
    const pauseAtStartMs = 350

    if (!isDeleting && displayed === full) {
      setShowInsight(true)
      const t = window.setTimeout(() => {
        setShowInsight(false)
        setIsDeleting(true)
      }, pauseAtEndMs)
      return () => window.clearTimeout(t)
    }

    if (isDeleting && displayed === "") {
      const t = window.setTimeout(() => {
        setIsDeleting(false)
        setQuestionIndex((i) => (i + 1) % SEARCH_PROMPTS.length)
      }, pauseAtStartMs)
      return () => window.clearTimeout(t)
    }

    setShowInsight(false)
    const t = window.setTimeout(() => {
      const next = isDeleting
        ? full.slice(0, Math.max(0, displayed.length - 1))
        : full.slice(0, displayed.length + 1)
      setDisplayed(next)
    }, typingMs)

    return () => window.clearTimeout(t)
  }, [displayed, isDeleting, questionIndex, reduceMotion])

  return (
    <div className="relative w-full">
      <div
        className="absolute -inset-3 rounded-[2rem] bg-[#2A2F3A]/[0.04] blur-2xl sm:-inset-4"
        aria-hidden
      />

      <div className="relative overflow-hidden rounded-[1.75rem] border border-[#2A2F3A]/10 bg-[#1F2430] shadow-[0_28px_80px_-36px_rgba(31,36,48,0.85)] sm:rounded-[2rem]">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{
            backgroundImage: `
              linear-gradient(rgb(255 255 255 / 0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgb(255 255 255 / 0.04) 1px, transparent 1px)
            `,
            backgroundSize: "36px 36px",
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 0%, black 20%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 70% at 50% 0%, black 20%, transparent 75%)",
          }}
        />
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#E0742D]/15 blur-3xl"
          aria-hidden
        />

        <div className="relative flex min-h-[28rem] flex-col p-6 sm:min-h-[32rem] sm:p-8 lg:p-9">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/70">
                Questions financières
              </p>
              <p className="mt-2 max-w-sm text-lg font-semibold tracking-tight text-[#E6D6C3] sm:text-xl">
                Ce que les dirigeants nous demandent
              </p>
            </div>
            <span className="hidden font-mono text-xs tabular-nums text-[#C9B8A5]/45 sm:inline">
              {String(questionIndex + 1).padStart(2, "0")} /{" "}
              {String(SEARCH_PROMPTS.length).padStart(2, "0")}
            </span>
          </div>

          <div
            className="mt-8 rounded-2xl border border-white/10 bg-white/[0.06] p-1.5 backdrop-blur-sm sm:mt-10 sm:p-2"
            role="presentation"
          >
            <div
              className="flex min-h-[4.5rem] items-start gap-3 rounded-[0.9rem] bg-[#F8FAFC] px-4 py-4 sm:min-h-[5.25rem] sm:items-center sm:gap-4 sm:px-5 sm:py-5"
              aria-live="polite"
              aria-label="Exemples de questions financières"
            >
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2A2F3A] text-[#E6D6C3] sm:mt-0 sm:h-11 sm:w-11">
                <Search className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </span>
              <p className="flex-1 pt-1.5 text-[1.05rem] leading-snug font-medium text-[#2A2F3A] sm:pt-0 sm:text-xl sm:leading-snug">
                <span>{displayed || "\u00a0"}</span>
                <span
                  className="ml-0.5 inline-block h-[1.1em] w-[2.5px] translate-y-[0.15em] bg-[#E0742D] align-baseline animate-pulse"
                  aria-hidden
                />
              </p>
            </div>
          </div>

          <div
            className={cn(
              "mt-5 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-5 transition-all duration-500 sm:mt-6 sm:px-6 sm:py-6",
              showInsight ? "translate-y-0 opacity-100" : "translate-y-1 opacity-55",
            )}
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#C9B8A5]/55">
              Lecture Modelisys
            </p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-[#C9B8A5]/75">{active.insightLabel}</p>
                <p className="mt-1 font-mono text-3xl font-semibold tracking-tight text-[#E6D6C3] sm:text-4xl">
                  {active.insightValue}
                </p>
              </div>
              <p className="max-w-[14rem] text-right text-sm leading-snug text-[#C9B8A5]/65">
                {active.insightMeta}
              </p>
            </div>
          </div>

          <div className="mt-auto border-t border-white/10 pt-6">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#C9B8A5]/50">
              Autres questions
            </p>
            <ul className="mt-4 space-y-2.5" aria-label="Suggestions">
              {SEARCH_PROMPTS.map((item, index) => {
                const isActive = index === questionIndex
                return (
                  <li key={item.question}>
                    <button
                      type="button"
                      onClick={() => {
                        setQuestionIndex(index)
                        setDisplayed(item.question)
                        setIsDeleting(false)
                        setShowInsight(true)
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition",
                        isActive
                          ? "bg-white/[0.08] text-[#E6D6C3]"
                          : "text-[#C9B8A5]/70 hover:bg-white/[0.04] hover:text-[#E6D6C3]",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-2 h-1.5 w-1.5 shrink-0 rounded-full",
                          isActive ? "bg-[#E0742D]" : "bg-[#C9B8A5]/35",
                        )}
                        aria-hidden
                      />
                      <span className="text-[14px] leading-snug sm:text-[15px]">{item.question}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LandingObjectifSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" },
    )
    observer.observe(el)
    return () => observer.unobserve(el)
  }, [])

  return (
    <section
      id="notre-objectif"
      ref={sectionRef}
      className="relative z-10 scroll-mt-24 overflow-hidden bg-[#F0F4F8] py-20 sm:py-28"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(42 47 58 / 0.04) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(42 47 58 / 0.04) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 70% 60% at 20% 30%, black 10%, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 60% at 20% 30%, black 10%, transparent 70%)",
          }}
        />
        <div className="absolute -right-20 top-1/4 h-72 w-72 rounded-full bg-[#E0742D]/[0.04] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-8 sm:px-12 lg:px-16 xl:px-20">
        <div className="grid items-stretch gap-12 lg:grid-cols-2 lg:gap-14 xl:gap-20">
          <div
            className={`flex flex-col justify-center transition-all duration-1000 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Notre objectif
            </p>

            <h2 className="mt-5 max-w-xl text-3xl font-semibold leading-[1.15] tracking-tight text-[#2A2F3A] sm:text-4xl md:text-[2.35rem] md:leading-tight">
              Transformer les chiffres en décisions qui créent de la valeur
            </h2>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-[#5C5F66] sm:text-lg">
              La valeur d&apos;une entreprise ne se crée pas uniquement au moment de la vendre. Elle
              se construit dans les décisions prises chaque mois : investir, embaucher, financer la
              croissance, améliorer la rentabilité, gérer la trésorerie ou préparer la prochaine
              étape.
            </p>

            <p className="mt-4 max-w-lg text-base leading-relaxed text-[#5C5F66] sm:text-lg">
              Modelisys aide les dirigeants à comprendre leur situation, à mesurer l&apos;impact de
              leurs décisions et à agir sur les leviers qui influencent réellement la valeur de leur
              entreprise.
            </p>

            <ul className="mt-8 space-y-4">
              {HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E0742D]/15 text-[#E0742D]">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                  </span>
                  <span className="text-[15px] leading-relaxed text-[#2A2F3A] sm:text-base">{item}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => scrollToApprocheSection()}
              className="group mt-10 inline-flex w-fit items-center gap-2.5 rounded-lg bg-[#E0742D]/12 px-5 py-3 text-sm font-semibold text-[#9A4A1A] transition hover:bg-[#E0742D]/18 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
            >
              Découvrir notre approche
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          <div
            className={`transition-all delay-150 duration-1000 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            }`}
          >
            <FinancialQuestionSearch />
          </div>
        </div>
      </div>
    </section>
  )
}
