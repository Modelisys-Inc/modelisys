"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { ValuationPlanBackButton } from "@/components/valuation-plan-back-button"
import { BusinessModelReport } from "@/components/business-model/business-model-report"
import { useCompanies } from "@/hooks/use-companies"
import {
  listBusinessRisks,
  bulkUpsertBusinessRisks,
  updateBusinessRisk,
} from "@/lib/api"
import {
  DEFAULT_BUSINESS_RISKS,
  type BusinessRiskDefinition,
  type BusinessRiskLevel,
} from "@/lib/business-model-default-risks"

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

export default function BusinessModelPage() {
  const { companies } = useCompanies()
  const searchParams = useSearchParams()
  const companyIdFromUrl = searchParams.get("companyId")
  const lockedCompanyId =
    companyIdFromUrl && companies.some((c) => c.id === companyIdFromUrl) ? companyIdFromUrl : null
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

  const [risks, setRisks] = useState<BusinessRiskDefinition[]>(DEFAULT_BUSINESS_RISKS)
  /** UUID PK serveur (`BusinessRisk.id`) indexé par slug stable (`risk_id`). */
  const [recordIdByRiskId, setRecordIdByRiskId] = useState<Record<string, string>>({})
  const [risksLoading, setRisksLoading] = useState(false)
  const noteSaveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const updateRiskLevel = useCallback(
    (riskId: string, level: BusinessRiskLevel) => {
      setRisks((prev) => prev.map((risk) => (risk.id === riskId ? { ...risk, level } : risk)))
      const recordId = recordIdByRiskId[riskId]
      if (companyId && recordId) {
        updateBusinessRisk(companyId, recordId, { level }).catch(console.error)
      }
    },
    [companyId, recordIdByRiskId],
  )

  const updateRiskNote = useCallback(
    (riskId: string, note: string) => {
      // Ne pas trimmer ici : sinon les espaces en cours de saisie disparaissent.
      setRisks((prev) =>
        prev.map((risk) => (risk.id === riskId ? { ...risk, note } : risk)),
      )
      const recordId = recordIdByRiskId[riskId]
      if (!companyId || !recordId) return
      const prevTimer = noteSaveTimersRef.current[riskId]
      if (prevTimer) clearTimeout(prevTimer)
      noteSaveTimersRef.current[riskId] = setTimeout(() => {
        const trimmed = note.trim()
        updateBusinessRisk(companyId, recordId, { note: trimmed || null }).catch(console.error)
      }, 450)
    },
    [companyId, recordIdByRiskId],
  )

  useEffect(() => {
    return () => {
      for (const timer of Object.values(noteSaveTimersRef.current)) {
        clearTimeout(timer)
      }
    }
  }, [])

  useEffect(() => {
    if (!companyId) {
      setRisks(DEFAULT_BUSINESS_RISKS.map((r) => ({ ...r, level: null, note: undefined })))
      setRecordIdByRiskId({})
      return
    }

    let cancelled = false
    setRisksLoading(true)

    listBusinessRisks(companyId)
      .then(async (serverRisks) => {
        if (cancelled) return

        const applyServerRows = (rows: typeof serverRisks) => {
          const serverMap = new Map(rows.map((r) => [r.risk_id, r]))
          const idMap: Record<string, string> = {}
          for (const row of rows) {
            if (row.risk_id && row.id) idMap[row.risk_id] = row.id
          }
          setRecordIdByRiskId(idMap)
          setRisks(
            DEFAULT_BUSINESS_RISKS.map((risk) => {
              const sr = serverMap.get(risk.id)
              if (sr) {
                return {
                  ...risk,
                  level: (sr.level as BusinessRiskLevel) ?? null,
                  note: sr.note || undefined,
                }
              }
              return { ...risk, level: null, note: undefined }
            }),
          )
        }

        if (serverRisks.length > 0) {
          applyServerRows(serverRisks)
        } else {
          const defaults = DEFAULT_BUSINESS_RISKS.map((r) => ({
            risk_id: r.id,
            category: r.category,
            name: r.name,
            description: r.description,
            impact: r.impact,
            recommendation: r.recommendation,
            level: null,
            note: null,
          }))
          const created = await bulkUpsertBusinessRisks(companyId, defaults)
          if (!cancelled) applyServerRows(created)
        }
      })
      .catch((err) => {
        if (!cancelled) console.error("Failed to load business risks:", err)
      })
      .finally(() => {
        if (!cancelled) setRisksLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [companyId])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <DashboardHeader title="Modelisys" />

      <div className="relative w-full overflow-hidden bg-[#2A2F3A] pb-32">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-24 -left-28 h-[320px] w-[320px] rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1920px] px-6 py-6 sm:py-8">
          <ValuationPlanBackButton />
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#E6D6C3]">
            Modèle d&apos;affaires
          </h1>
          <p className="mt-2 max-w-4xl text-base text-[#C9B8A5]/90">
            Évaluez les risques du modèle d&apos;affaires et documentez leur impact sur le multiple
            de valorisation.
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
            <div className="whitespace-nowrap" data-testid="business-model-reference-date">
              <span className="text-white/50">Date de référence</span>{" "}
              <span className="font-medium text-slate-100">{referenceLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative -mt-32 mb-12 min-w-0">
        <div className="mx-auto max-w-[1920px] px-6">
          <BusinessModelReport
            companyName={companyName}
            referenceLabel={referenceLabel}
            risks={risks}
            loading={risksLoading}
            onLevelChange={updateRiskLevel}
            onNoteChange={updateRiskNote}
          />
        </div>
      </div>
    </div>
  )
}
