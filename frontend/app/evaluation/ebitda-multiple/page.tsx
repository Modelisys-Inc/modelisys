"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { CapitalisationReport } from "@/components/capitalisation/capitalisation-report"
import { useCompanies } from "@/hooks/use-companies"
import { useEbitdaCapitalisation } from "@/hooks/use-ebitda-capitalisation"
import { valuationPlanBackHref } from "@/lib/valuation-registry"

const MONTH_NAMES_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
]

export default function EBITDAMultiplePage() {
  const { companies } = useCompanies()
  const searchParams = useSearchParams()
  const [heroVisible, setHeroVisible] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const planBackHref = valuationPlanBackHref(searchParams)
  const companyIdFromUrl = searchParams.get("companyId")
  const lockedCompanyId =
    companyIdFromUrl && companies.some((c) => c.id === companyIdFromUrl)
      ? companyIdFromUrl
      : null
  const companyId = lockedCompanyId || companies[0]?.id || null
  const companyName = companies.find((c) => c.id === companyId)?.name ?? "—"

  const refMonth = useMemo(() => {
    const fromUrl = Number(searchParams.get("refMonth"))
    if (Number.isFinite(fromUrl) && fromUrl >= 1 && fromUrl <= 12) return fromUrl
    return new Date().getMonth() + 1
  }, [searchParams])

  const refYear = useMemo(() => {
    const fromUrl = Number(searchParams.get("refYear"))
    if (Number.isFinite(fromUrl) && fromUrl >= 1900) return fromUrl
    return new Date().getFullYear()
  }, [searchParams])

  const referenceLabel = useMemo(
    () => `${MONTH_NAMES_FR[refMonth - 1]} ${refYear}`,
    [refMonth, refYear],
  )

  const capitalisation = useEbitdaCapitalisation({
    companyId,
    companies,
    refMonth,
    refYear,
  })

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setHeroVisible(true)
      },
      { threshold: 0.1, rootMargin: "0px 0px -80px 0px" },
    )
    if (heroRef.current) observer.observe(heroRef.current)
    return () => {
      if (heroRef.current) observer.unobserve(heroRef.current)
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />

      <section ref={heroRef} className="relative overflow-hidden pb-40 pt-16 sm:pb-44 sm:pt-20">
        <div className="pointer-events-none absolute inset-0 bg-[#222732]">
          <div
            className="absolute inset-0 opacity-[0.4]"
            aria-hidden
            style={{
              backgroundImage: `linear-gradient(rgb(255 255 255 / 0.035) 1px, transparent 1px),
                linear-gradient(90deg, rgb(255 255 255 / 0.035) 1px, transparent 1px)`,
              backgroundSize: "56px 56px",
              maskImage:
                "radial-gradient(ellipse 70% 75% at 22% 45%, black 10%, transparent 72%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 70% 75% at 22% 45%, black 10%, transparent 72%)",
            }}
          />
          <div className="absolute -top-32 left-[-10%] h-[34rem] w-[34rem] rounded-full bg-[#E6D6C3]/[0.04] blur-3xl" />
          <div className="absolute right-[-5%] top-1/3 h-[28rem] w-[28rem] rounded-full bg-[#E0742D]/[0.05] blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#1a1f2a] to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
          <div
            className={`max-w-xl transition-all duration-1000 lg:max-w-[34rem] xl:max-w-[38rem] ${
              heroVisible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
            }`}
          >
            <Link
              href={planBackHref}
              data-testid="valuation-plan-back-button"
              className="group inline-flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-[#C9B8A5]/90 transition hover:text-[#E6D6C3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
            >
              <ArrowLeft
                className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5"
                aria-hidden
              />
              RETOUR AUX ÉTAPES
            </Link>

            <p className="mt-7 text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/70 sm:mt-8">
              Plan de valorisation
            </p>

            <h1 className="mt-7 text-[2rem] font-semibold leading-[1.15] tracking-tight text-[#E6D6C3] sm:mt-8 sm:text-[2.45rem] sm:leading-[1.12] xl:text-[2.85rem]">
              Capitalisation
            </h1>

            <p className="mt-7 max-w-[30rem] text-[15px] leading-[1.75] text-[#C9B8A5]/78 sm:mt-8 sm:text-base">
              Capitalisez les flux monétaires de {companyName} pour déterminer la valeur
              d&apos;entreprise.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#C9B8A5]/70">
              <div className="whitespace-nowrap">
                <span className="text-[#C9B8A5]/45">Entité</span>{" "}
                <span className="font-medium text-[#E6D6C3]/90">{companyName}</span>
              </div>
              <div className="hidden h-4 w-px bg-[#E6D6C3]/15 md:block" />
              <div className="whitespace-nowrap" data-testid="capitalisation-reference-date">
                <span className="text-[#C9B8A5]/45">Date de référence</span>{" "}
                <span className="font-medium text-[#E6D6C3]/90">{referenceLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="relative -mt-32 mb-12 min-w-0">
        <div className="mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
          <CapitalisationReport
            companyName={companyName}
            referenceLabel={referenceLabel}
            capitalisation={capitalisation}
          />
        </div>
      </main>
    </div>
  )
}
