"use client"

import { ArrowRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { scrollToApprocheSection } from "@/lib/approche-navigation"
import {
  FEATURE_CATEGORY_LABELS,
  FEATURE_CATEGORY_NAVIGATE_EVENT,
  FEATURE_SECTION_ID,
  getFeatureCategoryHash,
  navigateToFeatureCategory,
  parseFeatureCategoryFromHash,
  type FeatureCategoryId,
} from "@/lib/feature-category-navigation"
import {
  FEATURE_CATEGORY_MARKETING_CONTENT,
  FEATURE_CATEGORY_MARKETING_ORDER,
} from "@/lib/feature-category-marketing-content"
import { cn } from "@/lib/utils"

export function ProblemSolutionSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [activeCategory, setActiveCategory] = useState<FeatureCategoryId>("valorisation")
  const [highlightedCategory, setHighlightedCategory] = useState<FeatureCategoryId | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.08, rootMargin: "0px 0px -80px 0px" },
    )
    const el = sectionRef.current
    if (el) observer.observe(el)
    return () => {
      if (el) observer.unobserve(el)
    }
  }, [])

  useEffect(() => {
    const applyCategory = (id: FeatureCategoryId) => {
      setActiveCategory(id)
      setHighlightedCategory(id)
      window.setTimeout(() => setHighlightedCategory(null), 2200)
    }

    const onNavigate = (event: Event) => {
      const { categoryId } = (event as CustomEvent<{ categoryId: FeatureCategoryId }>).detail
      if (categoryId) applyCategory(categoryId)
    }

    const onHashChange = () => {
      const categoryId = parseFeatureCategoryFromHash(window.location.hash)
      if (categoryId) applyCategory(categoryId)
    }

    onHashChange()
    window.addEventListener(FEATURE_CATEGORY_NAVIGATE_EVENT, onNavigate)
    window.addEventListener("hashchange", onHashChange)
    return () => {
      window.removeEventListener(FEATURE_CATEGORY_NAVIGATE_EVENT, onNavigate)
      window.removeEventListener("hashchange", onHashChange)
    }
  }, [])

  const selectCategory = (id: FeatureCategoryId) => {
    navigateToFeatureCategory(id)
  }

  return (
    <section
      id={FEATURE_SECTION_ID}
      ref={sectionRef}
      className="relative z-10 scroll-mt-24 overflow-hidden bg-[#F8FAFC]"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
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

      <div className="relative z-10 mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
        <div
          className={`pt-16 sm:pt-20 lg:pt-24 xl:pt-28 transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
            Fonctionnalités
          </p>

          <h2 className="mt-6 max-w-2xl text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#2A2F3A] sm:mt-7 sm:text-[2.35rem] sm:leading-[1.12] xl:text-[2.55rem]">
            Les outils qui servent la valeur — pas un catalogue de modules
          </h2>

          <p className="mt-6 max-w-2xl text-[15px] leading-[1.75] text-slate-600 sm:mt-7 sm:text-base">
            L&apos;approche Modelisys dit{" "}
            <span className="text-[#2A2F3A]">comment avancer</span> (diagnostic, planification,
            pilotage). Les fonctionnalités disent{" "}
            <span className="text-[#2A2F3A]">avec quoi</span> : mesurer le prix, projeter le
            rendement, analyser les leviers, reporter le réel et documenter ce qui est défendable.
          </p>

          <nav
            className="mt-10 flex flex-wrap gap-x-1 gap-y-2 border-b border-[#2A2F3A]/10 pb-px"
            aria-label="Catégories de fonctionnalités"
          >
            {FEATURE_CATEGORY_MARKETING_ORDER.map((id) => {
              const isActive = activeCategory === id
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => selectCategory(id)}
                  className={cn(
                    "relative px-3 py-3 text-[11px] font-semibold tracking-[0.08em] transition-colors duration-300 sm:px-4 sm:text-xs",
                    isActive ? "text-[#2A2F3A]" : "text-slate-400 hover:text-slate-600",
                  )}
                >
                  {FEATURE_CATEGORY_LABELS[id]}
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
        </div>

        <div className="divide-y divide-[#2A2F3A]/10 pb-16 sm:pb-20 lg:pb-24">
          {FEATURE_CATEGORY_MARKETING_ORDER.map((id) => {
            const content = FEATURE_CATEGORY_MARKETING_CONTENT[id]
            const isHighlighted = highlightedCategory === id

            return (
              <article
                key={id}
                id={getFeatureCategoryHash(id)}
                data-feature-block={id}
                className={cn(
                  "scroll-mt-28 py-12 sm:py-14 lg:py-16 transition-opacity duration-500",
                  isHighlighted && "opacity-100",
                )}
              >
                <div id={`feature-block-${id}`} className="grid gap-10 lg:grid-cols-12 lg:gap-14">
                  <div className="lg:col-span-4">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#9A4A1A]">
                      <span className="font-mono tabular-nums">{content.number}</span>
                      <span className="mx-2 text-[#2A2F3A]/25" aria-hidden>
                        —
                      </span>
                      {content.label}
                    </p>
                    <h3 className="mt-5 text-2xl font-semibold tracking-tight text-[#2A2F3A] sm:text-[1.75rem]">
                      {content.tagline}
                    </h3>
                  </div>

                  <div className="space-y-8 lg:col-span-8">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                        Ce que ça permet
                      </p>
                      <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                        {content.whatItDoes}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                        Pourquoi pour la valeur
                      </p>
                      <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                        {content.whyForValue}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                        Pourquoi dans Modelisys
                      </p>
                      <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                        {content.whyInModelisys}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#2A2F3A]/10 pb-16 pt-8 sm:pb-20 lg:pb-24">
          <button
            type="button"
            onClick={() => scrollToApprocheSection()}
            className="group inline-flex items-center gap-2.5 text-xs font-semibold tracking-[0.08em] text-[#2A2F3A] transition hover:text-[#9A4A1A]"
          >
            REVOIR L&apos;APPROCHE
            <ArrowRight className="h-4 w-4 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
          </button>
          <span className="hidden h-px w-10 bg-[#2A2F3A]/15 sm:block" aria-hidden />
          <button
            type="button"
            onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
            className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-slate-500 transition hover:text-[#2A2F3A]"
          >
            RÉSERVER UNE DÉMO
            <span className="inline-block h-px w-8 bg-[#E0742D]/80" />
          </button>
        </div>
      </div>
    </section>
  )
}
