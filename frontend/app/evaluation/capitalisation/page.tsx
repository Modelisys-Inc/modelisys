"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { ValuationPlanBackButton } from "@/components/valuation-plan-back-button"
import { CmpcReport } from "@/components/cmpc/cmpc-report"
import { useCompanies } from "@/hooks/use-companies"
import { listForecastConfigs, upsertForecastConfig } from "@/lib/api"
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
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <DashboardHeader title="Modelisys" />

      <div className="relative w-full overflow-hidden bg-[#2A2F3A] pb-32">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-24 -left-28 h-[320px] w-[320px] rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1920px] px-6 py-6 sm:py-8">
          <ValuationPlanBackButton />
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#E6D6C3]">Multiplicateur</h1>
          <p className="mt-2 max-w-4xl text-base text-[#C9B8A5]/90">
            Configurez les postes et formules du multiplicateur de capitalisation.
          </p>
          <div
            className="mt-5 h-px w-full bg-gradient-to-r from-[#E0742D]/80 via-white/15 to-transparent"
            aria-hidden
          />
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/70">
            <div className="whitespace-nowrap">
              <span className="text-white/50">Entité</span>{" "}
              <span className="font-medium text-slate-100">{companyName}</span>
            </div>
            <div className="hidden h-4 w-px bg-white/10 md:block" />
            <div className="whitespace-nowrap" data-testid="multiplicateur-reference-date">
              <span className="text-white/50">Date de référence</span>{" "}
              <span className="font-medium text-slate-100">{referenceLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative -mt-32 mb-12 min-w-0">
        <div className="mx-auto max-w-[1920px] px-6">
          {!configLoaded ? (
            <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 shadow-lg">
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
      </div>
    </div>
  )
}
