"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { CmpcReport } from "@/components/cmpc/cmpc-report"
import { useCompanies } from "@/hooks/use-companies"
import { listForecastConfigs, upsertForecastConfig } from "@/lib/api"
import { valuationPlanBackHref } from "@/lib/valuation-registry"
import {
  DEFAULT_CMPC_EQUITY_NOTES,
  DEFAULT_CMPC_INPUTS,
  DEFAULT_CMPC_META,
  DEFAULT_CMPC_PARAM_SOURCES,
  parseCmpcWaccConfig,
  type CmpcEquityNotes,
  type CmpcParamSources,
  type CmpcReportMeta,
  type CmpcWaccInputs,
} from "@/lib/cmpc-wacc"

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

const CMPC_CONFIG_TYPE = "cmpc-multiplicateur"

export default function ValuationCapitalisationPage() {
  const searchParams = useSearchParams()
  const { companies } = useCompanies()
  const [heroVisible, setHeroVisible] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const planBackHref = valuationPlanBackHref(searchParams)
  const companyIdFromUrl = searchParams.get("companyId")
  const companyId =
    (companyIdFromUrl && companies.some((c) => c.id === companyIdFromUrl)
      ? companyIdFromUrl
      : null) ||
    companyIdFromUrl ||
    companies[0]?.id ||
    null
  const companyName = companies.find((c) => c.id === companyId)?.name ?? "—"

  const refMonth = useMemo(() => {
    const rawParam = searchParams.get("refMonth")
    const raw = rawParam != null && rawParam !== "" ? Number(rawParam) : NaN
    if (Number.isFinite(raw) && raw >= 1 && raw <= 12) return raw
    return new Date().getMonth() + 1
  }, [searchParams])

  const refYear = useMemo(() => {
    const rawParam = searchParams.get("refYear")
    const raw = rawParam != null && rawParam !== "" ? Number(rawParam) : NaN
    if (Number.isFinite(raw) && raw >= 1900) return raw
    return new Date().getFullYear()
  }, [searchParams])

  const referenceLabel = useMemo(
    () => `${MONTH_NAMES_FR[refMonth - 1]} ${refYear}`,
    [refMonth, refYear],
  )

  const valuationDateLabel = useMemo(() => {
    const month = MONTH_NAMES_FR[refMonth - 1]
    return `31 ${month} ${refYear}`
  }, [refMonth, refYear])

  const [inputs, setInputs] = useState<CmpcWaccInputs>(DEFAULT_CMPC_INPUTS)
  const [meta, setMeta] = useState<CmpcReportMeta>(DEFAULT_CMPC_META)
  const [equityNotes, setEquityNotes] = useState<CmpcEquityNotes>(DEFAULT_CMPC_EQUITY_NOTES)
  const [sources, setSources] = useState<CmpcParamSources>(DEFAULT_CMPC_PARAM_SOURCES)
  const [configLoaded, setConfigLoaded] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seededMetaRef = useRef(false)
  const skipNextSaveRef = useRef(true)

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

  useEffect(() => {
    if (!companyId) {
      setInputs(DEFAULT_CMPC_INPUTS)
      setMeta(DEFAULT_CMPC_META)
      setEquityNotes(DEFAULT_CMPC_EQUITY_NOTES)
      setSources(DEFAULT_CMPC_PARAM_SOURCES)
      setConfigLoaded(false)
      seededMetaRef.current = false
      return
    }
    let cancelled = false
    setConfigLoaded(false)
    seededMetaRef.current = false
    skipNextSaveRef.current = true

    listForecastConfigs(companyId, { config_type: CMPC_CONFIG_TYPE })
      .then((cmpcConfigs) => {
        if (cancelled) return
        if (cmpcConfigs[0]?.data) {
          const parsed = parseCmpcWaccConfig(cmpcConfigs[0].data)
          setInputs(parsed.inputs)
          setMeta(parsed.meta)
          setEquityNotes(parsed.equityNotes)
          setSources(parsed.sources)
          seededMetaRef.current = true
        } else {
          setInputs(DEFAULT_CMPC_INPUTS)
          setEquityNotes(DEFAULT_CMPC_EQUITY_NOTES)
          setSources(DEFAULT_CMPC_PARAM_SOURCES)
          setMeta({
            ...DEFAULT_CMPC_META,
            subject: companyName !== "—" ? companyName : DEFAULT_CMPC_META.subject,
            valuationDate: valuationDateLabel,
          })
          seededMetaRef.current = true
        }
        setConfigLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        setInputs(DEFAULT_CMPC_INPUTS)
        setEquityNotes(DEFAULT_CMPC_EQUITY_NOTES)
        setSources(DEFAULT_CMPC_PARAM_SOURCES)
        setMeta({
          ...DEFAULT_CMPC_META,
          subject: companyName !== "—" ? companyName : DEFAULT_CMPC_META.subject,
          valuationDate: valuationDateLabel,
        })
        seededMetaRef.current = true
        setConfigLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [companyId]) // eslint-disable-line react-hooks/exhaustive-deps -- seed once per company

  useEffect(() => {
    if (!configLoaded || !seededMetaRef.current) return
    setMeta((prev) => {
      let next = prev
      if (companyName !== "—" && (prev.subject === DEFAULT_CMPC_META.subject || !prev.subject.trim())) {
        next = { ...next, subject: companyName }
      }
      if (
        prev.valuationDate === DEFAULT_CMPC_META.valuationDate ||
        !prev.valuationDate.trim()
      ) {
        next = { ...next, valuationDate: valuationDateLabel }
      }
      return next
    })
  }, [companyName, configLoaded, valuationDateLabel])

  const persist = useCallback(
    (
      nextInputs: CmpcWaccInputs,
      nextMeta: CmpcReportMeta,
      nextEquityNotes: CmpcEquityNotes,
      nextSources: CmpcParamSources,
    ) => {
      if (!companyId || !configLoaded) return
      const payload = {
        config_type: CMPC_CONFIG_TYPE,
        data: {
          inputs: nextInputs,
          meta: nextMeta,
          equityNotes: nextEquityNotes,
          sources: nextSources,
        },
        company_id: companyId,
      }
      const save = (attempt: number) => {
        upsertForecastConfig(companyId, payload).catch((err: unknown) => {
          const isNetwork =
            err instanceof TypeError &&
            (String(err.message).includes("fetch") || String(err.message).includes("network"))
          if (isNetwork && attempt < 2) {
            window.setTimeout(() => save(attempt + 1), 1200)
            return
          }
          if (isNetwork) {
            console.warn(
              "[Multiplicateur] Sauvegarde différée — API temporairement injoignable (proxy / redémarrage).",
            )
            return
          }
          console.error(err)
        })
      }
      save(0)
    },
    [companyId, configLoaded],
  )

  useEffect(() => {
    if (!configLoaded || !companyId) return
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      return
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(
      () => persist(inputs, meta, equityNotes, sources),
      800,
    )
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [companyId, configLoaded, inputs, meta, equityNotes, sources, persist])

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
              Multiplicateur
            </h1>

            <p className="mt-7 max-w-[30rem] text-[15px] leading-[1.75] text-[#C9B8A5]/78 sm:mt-8 sm:text-base">
              Configurez le CMPC de {companyName} pour le multiple de capitalisation.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#C9B8A5]/70">
              <div className="whitespace-nowrap">
                <span className="text-[#C9B8A5]/45">Entité</span>{" "}
                <span className="font-medium text-[#E6D6C3]/90">{companyName}</span>
              </div>
              <div className="hidden h-4 w-px bg-[#E6D6C3]/15 md:block" />
              <div className="whitespace-nowrap" data-testid="multiplicateur-reference-date">
                <span className="text-[#C9B8A5]/45">Date de référence</span>{" "}
                <span className="font-medium text-[#E6D6C3]/90">{referenceLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="relative -mt-32 mb-12 min-w-0">
        <div className="mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
          {!configLoaded ? (
            <div className="flex items-center justify-center rounded-xl border border-[#E6D6C3]/35 bg-white py-16 shadow-[0_18px_50px_-28px_rgba(34,39,50,0.45)] ring-1 ring-[#222732]/[0.04]">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#E0742D]" />
            </div>
          ) : (
            <CmpcReport
              inputs={inputs}
              meta={meta}
              equityNotes={equityNotes}
              sources={sources}
              onInputsChange={setInputs}
              onMetaChange={setMeta}
              onEquityNotesChange={setEquityNotes}
              onSourcesChange={setSources}
            />
          )}
        </div>
      </main>
    </div>
  )
}
