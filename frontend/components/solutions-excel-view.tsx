"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, FileSpreadsheet } from "lucide-react"
import { HeroMarquee } from "@/components/hero-marquee"
import { Footer } from "@/components/footer"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  EXCEL_FAQ,
  EXCEL_MARQUEE_ITEMS,
  EXCEL_PAGE_NAV,
  EXCEL_PROBLEMS,
  EXCEL_REASONS,
  EXCEL_SOLUTIONS,
  EXCEL_STEPS,
} from "@/lib/solutions-excel-content"
import { cn } from "@/lib/utils"

function Eyebrow({ children, light = false }: { children: string; light?: boolean }) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.22em]",
        light ? "text-slate-500" : "text-[#E0742D]",
      )}
    >
      {children}
    </p>
  )
}

const REPORT_PAGES = [
  {
    src: "/images/solutions-excel/couverture.png",
    alt: "Page couverture du rapport de gestion, décembre 2025.",
  },
  {
    src: "/images/solutions-excel/sommaire-executif.png",
    alt: "Sommaire exécutif : indicateurs financiers et tableau de bord.",
  },
  {
    src: "/images/solutions-excel/plan-action.png",
    alt: "Plan d’action : feuille de route et suivi des indicateurs.",
  },
  {
    src: "/images/solutions-excel/trajectoire.png",
    alt: "Trajectoire de croissance et de rentabilité sur cinq exercices.",
  },
] as const

function ReportPage({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-[#2A2F3A]/10 bg-white shadow-[0_28px_70px_-32px_rgba(34,39,50,0.45)]">
      <img src={src} alt={alt} className="block h-auto w-full" />
    </figure>
  )
}

const EXCEL_HERO_FAMILIES = [
  {
    id: "automatisation",
    shortLabel: "Automatisation",
    comment: EXCEL_SOLUTIONS[0].lead,
    eyebrow: "Gain d’efficacité",
    figure: "+6",
    unit: "h",
  },
  {
    id: "tableaux-de-bord",
    shortLabel: "Tableaux de bord",
    comment: EXCEL_SOLUTIONS[1].lead,
    eyebrow: "Lecture du mois",
    figure: "1",
    unit: "lecture",
  },
  {
    id: "outils-de-gestion",
    shortLabel: "Outils de gestion",
    comment: EXCEL_SOLUTIONS[2].lead,
    eyebrow: "Avant l’envoi",
    figure: "Marge",
    unit: "",
  },
  {
    id: "modelisation",
    shortLabel: "Modélisation",
    comment: EXCEL_SOLUTIONS[3].lead,
    eyebrow: "Hypothèses",
    figure: "3",
    unit: "scénarios",
  },
] as const

/** Point du rayon actif, sur l’arc dégagé. Coordonnées figées. */
const EXCEL_SPOKE_POINTS = [
  { x: "197", y: "63" },
  { x: "288", y: "85" },
  { x: "341", y: "141" },
  { x: "357", y: "189" },
] as const

const EXCEL_HERO_ROTATE_MS = 5000

function ExcelHeroSystem() {
  const uid = useId().replace(/:/g, "")
  const [activeIndex, setActiveIndex] = useState(0)
  const [autoRotate, setAutoRotate] = useState(true)
  const active = EXCEL_HERO_FAMILIES[activeIndex]

  const selectFamily = useCallback((index: number) => {
    setActiveIndex(index)
    setAutoRotate(false)
  }, [])

  useEffect(() => {
    if (!autoRotate) return
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % EXCEL_HERO_FAMILIES.length)
    }, EXCEL_HERO_ROTATE_MS)
    return () => window.clearInterval(timer)
  }, [autoRotate])

  return (
    <div
      className="relative mx-auto flex w-full max-w-lg flex-col justify-center lg:mx-0 lg:max-w-none lg:min-h-[28rem] xl:min-h-[32rem]"
      aria-live="polite"
    >
      <div
        className="pointer-events-none absolute left-1/2 top-[38%] h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E6D6C3]/[0.06] blur-3xl sm:h-[26rem] sm:w-[26rem]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-0 top-1/4 h-48 w-48 rounded-full bg-[#E0742D]/[0.07] blur-3xl"
        aria-hidden
      />

      <svg
        viewBox="0 0 420 420"
        className="pointer-events-none absolute left-1/2 top-[42%] hidden h-[min(100%,28rem)] w-[min(100%,28rem)] -translate-x-1/2 -translate-y-1/2 opacity-80 md:block"
        aria-hidden
      >
        <defs>
          <linearGradient id={`${uid}-orbit`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(230,214,195,0.5)" />
            <stop offset="100%" stopColor="rgba(224,116,45,0.38)" />
          </linearGradient>
          <filter id={`${uid}-spoke-glow`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx="210"
          cy="210"
          r="148"
          fill="none"
          stroke={`url(#${uid}-orbit)`}
          strokeWidth="1.15"
          className="hero-orbit-slow"
          style={{ transformOrigin: "210px 210px" }}
        />
        <circle
          cx="210"
          cy="210"
          r="108"
          fill="none"
          stroke="rgba(230,214,195,0.22)"
          strokeWidth="0.8"
          strokeDasharray="2 6"
          className="hero-orbit-reverse"
          style={{ transformOrigin: "210px 210px" }}
        />
        <line
          x1="210"
          y1="210"
          x2={EXCEL_SPOKE_POINTS[activeIndex].x}
          y2={EXCEL_SPOKE_POINTS[activeIndex].y}
          stroke="rgba(224,116,45,0.95)"
          strokeWidth="2.25"
          strokeLinecap="round"
          filter={`url(#${uid}-spoke-glow)`}
          className="transition-all duration-700"
        />
        <circle
          cx={EXCEL_SPOKE_POINTS[activeIndex].x}
          cy={EXCEL_SPOKE_POINTS[activeIndex].y}
          r="6.5"
          fill="#E0742D"
          stroke="rgba(230,214,195,0.55)"
          strokeWidth="1.4"
          className="transition-all duration-700"
        />
        <circle cx="210" cy="210" r="5" fill="#E0742D" stroke="rgba(230,214,195,0.45)" strokeWidth="1.2" />
      </svg>

      <div className="relative z-10 px-1 sm:px-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/65">{active.eyebrow}</p>
        <p
          key={active.id}
          className={cn(
            "mt-4 animate-in fade-in-0 font-semibold leading-none tracking-tight text-[#E6D6C3] duration-500",
            active.figure.length > 2
              ? "text-[2.6rem] sm:text-[3.15rem] xl:text-[3.4rem]"
              : "font-mono text-[4.25rem] sm:text-[5rem] xl:text-[5.5rem]",
          )}
        >
          {active.figure}
          {active.unit ? (
            <span className="ml-2 text-[1.35rem] font-medium tracking-normal text-[#C9B8A5]/70 sm:text-[1.5rem]">
              {active.unit}
            </span>
          ) : null}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#C9B8A5]/70">
          <span className="font-mono tabular-nums text-[#E6D6C3]/90">Excel</span>
          <span className="h-3 w-px bg-white/15" aria-hidden />
          <span>Sur mesure</span>
          <span className="h-3 w-px bg-white/15" aria-hidden />
          <span>Sur devis</span>
        </div>
        <div className="mt-10 h-px w-24 bg-gradient-to-r from-[#E0742D]/80 to-transparent" aria-hidden />
        <nav className="mt-8" aria-label="Familles d’outils">
          <ul className="flex flex-wrap gap-x-1 gap-y-2">
            {EXCEL_HERO_FAMILIES.map((family, index) => {
              const isActive = index === activeIndex
              return (
                <li key={family.id} className="flex items-center">
                  {index > 0 ? (
                    <span className="mx-2.5 text-[#C9B8A5]/25" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => selectFamily(index)}
                    className={cn(
                      "relative pb-1 text-[13px] tracking-wide transition-colors duration-500",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E0742D]/45",
                      isActive
                        ? "font-semibold text-[#E6D6C3]"
                        : "font-medium text-[#C9B8A5]/55 hover:text-[#C9B8A5]/90",
                    )}
                    aria-pressed={isActive}
                  >
                    {family.shortLabel}
                    <span
                      className={cn(
                        "absolute inset-x-0 -bottom-0.5 h-[2px] origin-left bg-[#E0742D] shadow-[0_0_8px_rgba(224,116,45,0.55)] transition-transform duration-500",
                        isActive ? "scale-x-100" : "scale-x-0",
                      )}
                      aria-hidden
                    />
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="mt-7 min-h-[4.5rem] max-w-md">
          <p
            key={active.id}
            className="animate-in fade-in-0 slide-in-from-bottom-1 text-[15px] leading-relaxed text-[#C9B8A5]/88 duration-500 sm:text-base"
          >
            {active.comment}
          </p>
          <p className="mt-3 font-mono text-[10px] tabular-nums tracking-[0.14em] text-[#E0742D]/75">
            {String(activeIndex + 1).padStart(2, "0")} — 04
          </p>
        </div>
      </div>
    </div>
  )
}

function SolutionsExcelHero({ onSelect }: { onSelect: (id: string) => void }) {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const node = sectionRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.1, rootMargin: "0px 0px -100px 0px" },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="relative scroll-mt-24 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[#222732]">
        <div
          className="absolute -right-[6%] -top-[22%] h-[70%] w-[55%] rounded-full"
          aria-hidden
          style={{
            background: "radial-gradient(circle, rgba(230,214,195,0.16) 0%, rgba(230,214,195,0) 68%)",
            filter: "blur(36px)",
          }}
        />
        <div
          className="absolute -left-[18%] top-[46%] h-[34%] w-[140%] -rotate-[14deg]"
          aria-hidden
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(230,214,195,0.16) 28%, rgba(224,116,45,0.38) 62%, transparent 88%)",
            filter: "blur(22px)",
          }}
        />
        <div
          className="absolute -left-[10%] bottom-[-6%] h-[16%] w-[120%] -rotate-[12deg]"
          aria-hidden
          style={{
            background:
              "linear-gradient(90deg, transparent 8%, rgba(224,116,45,0.42) 46%, rgba(230,214,195,0.22) 68%, transparent 88%)",
            filter: "blur(18px)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
        <div className="grid grid-cols-1 items-start gap-12 py-16 sm:gap-16 sm:py-24 lg:min-h-[min(88vh,52rem)] lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-28 xl:gap-20 xl:py-32">
          <div
            className={`max-w-xl transition-all duration-1000 lg:max-w-[34rem] xl:max-w-[38rem] ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
            }`}
          >
            <p className="text-sm text-[#C9B8A5]/75">Solutions Excel</p>
            <h1 className="mt-6 max-w-[20rem] text-[1.85rem] font-medium leading-[1.22] tracking-[-0.02em] text-balance text-[#E6D6C3] sm:max-w-[36rem] sm:text-[2.15rem] lg:max-w-none lg:text-[2.35rem] xl:text-[2.5rem]">
              Des outils Excel conçus autour de votre réalité d’affaires.
            </h1>
            <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-[#C9B8A5]/82 sm:text-base">
              Nous concevons des solutions Excel personnalisées pour automatiser vos processus,
              centraliser vos données et améliorer votre efficacité opérationnelle.
            </p>
            <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Link
                href="/#demo"
                className="group inline-flex items-center gap-2 rounded-full border border-[#E6D6C3]/75 px-5 py-2.5 text-sm text-[#E6D6C3] transition hover:border-[#E6D6C3] hover:bg-[#E6D6C3] hover:text-[#222732] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6D6C3]/60"
              >
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                Discuter de votre projet
              </Link>
              <a
                href="#situations"
                onClick={() => onSelect("situations")}
                className="px-1 py-2 text-sm text-[#C9B8A5]/90 transition hover:text-[#E6D6C3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
              >
                En savoir plus
              </a>
            </div>
          </div>
          <div
            className={`min-w-0 transition-all delay-150 duration-1000 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            <ExcelHeroSystem />
          </div>
        </div>
      </div>
    </section>
  )
}

function PageLinks({
  active,
  onSelect,
  className,
  linkClassName,
}: {
  active: string
  onSelect: (id: string) => void
  className?: string
  linkClassName?: string
}) {
  return (
    <ul className={className}>
      {EXCEL_PAGE_NAV.map((item) => {
        const isActive = item.id === active
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={() => onSelect(item.id)}
              className={cn(
                "block border-l-2 py-1.5 pl-3 text-sm transition-colors",
                isActive
                  ? "border-[#E0742D] font-semibold text-[#2A2F3A]"
                  : "border-transparent text-[#5C5F66] hover:text-[#2A2F3A]",
                linkClassName,
              )}
              aria-current={isActive ? "location" : undefined}
            >
              {item.label}
            </a>
          </li>
        )
      })}
    </ul>
  )
}

export function SolutionsExcelView() {
  const [active, setActive] = useState<string>(EXCEL_PAGE_NAV[0].id)

  useEffect(() => {
    const nodes = EXCEL_PAGE_NAV.map((item) => document.getElementById(item.id)).filter(
      (node): node is HTMLElement => node !== null,
    )
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible?.target.id) setActive(visible.target.id)
      },
      { rootMargin: "-25% 0px -55% 0px", threshold: [0.15, 0.35, 0.6] },
    )
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#222732]">
      <GlassmorphismNav />
      <main>
        <SolutionsExcelHero onSelect={setActive} />
        <HeroMarquee
          label="Solutions"
          items={EXCEL_MARQUEE_ITEMS}
          ariaLabel="Solutions Excel — familles d’outils"
          icon={<FileSpreadsheet className="h-5 w-5 text-[#E6B08C]" />}
          duration="70s"
        />

        <nav
          aria-label="Sections de la page"
          className="sticky top-16 z-30 border-b border-[#2A2F3A]/10 bg-[#F8FAFC]/95 backdrop-blur lg:hidden"
        >
          <PageLinks
            active={active}
            onSelect={setActive}
            className="flex gap-1 overflow-x-auto px-3 py-2"
            linkClassName="whitespace-nowrap border-l-0 border-b-2 px-3 py-2"
          />
        </nav>

        <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)]">
          <nav
            aria-label="Sections de la page"
            className="sticky top-28 hidden h-fit self-start px-6 py-16 lg:block xl:px-8"
          >
            <PageLinks active={active} onSelect={setActive} className="space-y-0.5" />
          </nav>

          <div className="min-w-0">
            <section id="situations" className="scroll-mt-28 px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24 xl:px-16">
              <Eyebrow light>Ce que vos fichiers ralentissent</Eyebrow>
              <h2 className="mt-5 max-w-3xl text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#2A2F3A] sm:text-[2.2rem]">
                Votre entreprise utilise Excel, mais vos processus pourraient être beaucoup plus efficaces.
              </h2>
              <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2">
                {EXCEL_PROBLEMS.map((problem, index) => (
                  <article key={problem.title} className="border-t border-[#2A2F3A]/15 pt-5">
                    <p className="font-mono text-[11px] font-semibold text-[#E0742D]">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-3 text-lg font-semibold tracking-tight text-[#2A2F3A]">{problem.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#5C5F66]">{problem.body}</p>
                  </article>
                ))}
              </div>
            </section>

            <div className="border-t border-[#2A2F3A]/10 bg-white px-5 pt-16 pb-12 sm:px-8 sm:pb-14 lg:px-12 lg:pt-20 lg:pb-20 xl:px-16">
              <Eyebrow light>Ce que nous développons</Eyebrow>
              <h2 className="mt-5 max-w-3xl text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#2A2F3A] sm:text-[2.2rem]">
                Quatre familles d’outils, selon le travail à accomplir.
              </h2>
            </div>

            {EXCEL_SOLUTIONS.map((solution, index) => {
              const page = REPORT_PAGES[index]
              return (
                <section
                  key={solution.id}
                  id={solution.id}
                  className="scroll-mt-28 border-t border-[#2A2F3A]/10 bg-white px-5 py-14 sm:px-8 sm:py-16 lg:px-12 lg:py-20 xl:px-16"
                >
                  <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
                    <div>
                      <p className="font-mono text-[11px] font-semibold text-[#E0742D]">{solution.number}</p>
                      <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#2A2F3A] sm:text-[1.75rem]">
                        {solution.title}
                      </h3>
                      <p className="mt-4 text-base font-medium leading-relaxed text-[#2A2F3A]">{solution.lead}</p>
                      <p className="mt-4 text-[15px] leading-[1.75] text-[#5C5F66]">{solution.body}</p>
                      <ul className="mt-6 space-y-2.5">
                        {solution.points.map((point) => (
                          <li key={point} className="flex gap-3 text-sm leading-relaxed text-[#2A2F3A]">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E0742D]" aria-hidden />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <ReportPage src={page.src} alt={page.alt} />
                  </div>
                </section>
              )
            })}

            <section
              id="mandat"
              className="scroll-mt-28 border-t border-[#2A2F3A]/10 px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24 xl:px-16"
            >
              <Eyebrow light>Le déroulement d’un mandat</Eyebrow>
              <h2 className="mt-5 max-w-2xl text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#2A2F3A] sm:text-[2.2rem]">
                Quatre étapes, du fichier actuel à l’outil livré.
              </h2>
              <ol className="mt-12 grid gap-10 md:grid-cols-2">
                {EXCEL_STEPS.map((step) => (
                  <li key={step.number} className="border-t border-[#2A2F3A]/15 pt-5">
                    <p className="font-mono text-[11px] font-semibold text-[#E0742D]">{step.number}</p>
                    <h3 className="mt-3 text-lg font-semibold tracking-tight text-[#2A2F3A]">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#5C5F66]">{step.body}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section id="pourquoi" className="scroll-mt-28 bg-[#222732] px-5 py-16 text-[#E6D6C3] sm:px-8 sm:py-20 lg:px-12 lg:py-24 xl:px-16">
              <Eyebrow>Pourquoi Modelisys</Eyebrow>
              <h2 className="mt-5 max-w-3xl text-[1.85rem] font-semibold leading-[1.15] tracking-tight sm:text-[2.2rem]">
                Notre équipe conçoit l’outil, puis lit les chiffres avec vous.
              </h2>
              <div className="mt-5 max-w-2xl space-y-4 text-[15px] leading-[1.75] text-[#C9B8A5]/80">
                <p>
                  L’accompagnement est mené par une équipe composée de CPA et de CBV. Ces
                  professionnels développent les modèles Excel pour l’analyse de la performance, les
                  projections et l’évaluation, puis restent avec la direction pour en tirer les
                  décisions.
                </p>
                <p>
                  Ces outils ont servi des entreprises dont les revenus vont de 1&nbsp;M$ à
                  100&nbsp;M$. À 1&nbsp;M$, le fichier doit fiabiliser le suivi sans alourdir
                  l’équipe. Vers 100&nbsp;M$, il doit tenir plusieurs divisions ou entités, les
                  éliminations et les taux de change. Le mandat est adapté à cette échelle.
                </p>
              </div>
              <div className="mt-12 grid gap-10 lg:grid-cols-3">
                {EXCEL_REASONS.map((reason) => (
                  <article key={reason.title} className="border-t border-white/15 pt-5">
                    <h3 className="text-lg font-semibold tracking-tight">{reason.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-[#C9B8A5]/80">{reason.body}</p>
                  </article>
                ))}
              </div>
            </section>

            <section id="questions" className="scroll-mt-28 px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24 xl:px-16">
              <div className="max-w-3xl">
                <Eyebrow light>Questions fréquentes</Eyebrow>
                <h2 className="mt-5 text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#2A2F3A] sm:text-[2.2rem]">
                  Avant de lancer un mandat
                </h2>
                <Accordion type="single" collapsible className="mt-8">
                  {EXCEL_FAQ.map((item, index) => (
                    <AccordionItem key={item.question} value={`excel-faq-${index}`} className="border-[#2A2F3A]/15">
                      <AccordionTrigger className="py-5 text-left text-[15px] font-semibold leading-snug tracking-tight text-[#2A2F3A] hover:no-underline hover:text-[#E0742D] [&[data-state=open]]:text-[#E0742D]">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 pb-5 text-[15px] leading-relaxed text-[#5C5F66]">
                        {item.answer.map((paragraph) => (
                          <p key={paragraph}>{paragraph}</p>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </section>

            <section className="border-t border-[#2A2F3A]/10 px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24 xl:px-16">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <Eyebrow light>Prochaine étape</Eyebrow>
                  <h2 className="mt-5 text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#2A2F3A] sm:text-[2.2rem]">
                    Décrivez le fichier que vous utilisez aujourd’hui.
                  </h2>
                  <p className="mt-4 text-[15px] leading-[1.75] text-[#5C5F66]">
                    Nous regardons avec vous le processus, les sources et le résultat attendu. Chaque
                    mandat est sur devis.
                  </p>
                </div>
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  <Link
                    href="/#demo"
                    className="group inline-flex items-center gap-2 rounded-full bg-[#2A2F3A] px-5 py-3 text-sm font-semibold text-[#E6D6C3] transition duration-200 hover:bg-[#E6D6C3] hover:text-[#222732]"
                  >
                    Discuter de votre projet
                    <ArrowRight className="h-4 w-4 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/contact"
                    className="px-2 py-3 text-sm font-semibold text-[#2A2F3A] underline decoration-[#E0742D]/70 underline-offset-4 hover:text-[#E0742D]"
                  >
                    Nous contacter
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
