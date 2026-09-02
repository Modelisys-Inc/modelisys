"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Construction } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { ValuationPlanBackButton } from "@/components/valuation-plan-back-button"
import {
  BalanceSheetSummary,
  type NetTangibleValuationColumnValues,
  type NetTangibleValuationNotes,
} from "@/components/balance-sheet-summary"
import { NetTangibleOverviewStrip } from "@/components/net-tangible-overview-strip"
import { Button } from "@/components/ui/button"
import { useCompanies } from "@/hooks/use-companies"
import { formatCalendarMonthYearShort } from "@/lib/financial-period-labels"
import {
  getBalanceSheet,
  getStatementStructure,
  listForecastConfigs,
  upsertForecastConfig,
  type FinancialStatementRow,
  type NoteAttachmentData,
} from "@/lib/api"
import { findSummaryStructureRow } from "@/lib/balance-sheet-summary-expand"
import { buildNetTangibleOverviewMetrics } from "@/lib/net-tangible-overview"
import {
  isNetTangibleJvmCapexRootRow,
  netTangibleJvmAttachmentStorageKey,
  netTangibleJvmNoteStorageKey,
  netTangibleJvmStorageKey,
  parseNetTangibleJvmNoteStorageKey,
  parseNetTangibleJvmStorageKey,
} from "@/lib/net-tangible-jvm-capex"
import {
  netTangibleExcedentAttachmentStorageKey,
  netTangibleExcedentNoteStorageKey,
  netTangibleExcedentStorageKey,
  parseNetTangibleExcedentNoteStorageKey,
  parseNetTangibleExcedentStorageKey,
} from "@/lib/net-tangible-surplus-assets"
import { cn } from "@/lib/utils"
import {
  dashboardCardBodyMutedClass,
  dashboardCardFrameStaticClass,
  dashboardCardHeaderBarClass,
  dashboardCardRingClass,
  dashboardCardTitleClass,
} from "@/lib/dashboard-card-style"

const NET_TANGIBLE_SECTIONS = [
  { id: "vca", label: "VCA" },
  { id: "jvm-capex", label: "JVM Capex" },
  { id: "fdr-representatif", label: "FDR représentatif" },
] as const

type NetTangibleSectionId = (typeof NET_TANGIBLE_SECTIONS)[number]["id"]

export default function NetTangibleAssetsPage() {
  const searchParams = useSearchParams()
  const { companies } = useCompanies()
  const [activeSection, setActiveSection] = useState<NetTangibleSectionId>("vca")

  const companyIdFromUrl = searchParams.get("companyId")
  const lockedCompanyId =
    companyIdFromUrl && companies.some((c) => c.id === companyIdFromUrl) ? companyIdFromUrl : null
  const companyId = lockedCompanyId || companies[0]?.id || null

  const refMonth = useMemo(() => {
    const fromUrl = Number(searchParams.get("refMonth"))
    if (Number.isFinite(fromUrl) && fromUrl >= 1 && fromUrl <= 12) return fromUrl
    return new Date().getMonth() + 1
  }, [searchParams])

  const refYear = useMemo(() => {
    const fromUrl = Number(searchParams.get("refYear"))
    if (Number.isFinite(fromUrl)) return fromUrl
    return new Date().getFullYear()
  }, [searchParams])

  const referenceColumnLabel = useMemo(
    () => formatCalendarMonthYearShort(refMonth, refYear),
    [refMonth, refYear],
  )

  const referenceLabel = useMemo(() => {
    const monthNames = [
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
    return `${monthNames[refMonth - 1]} ${refYear}`
  }, [refMonth, refYear])

  const [rows, setRows] = useState<FinancialStatementRow[]>([])
  const [structure, setStructure] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [savedValues, setSavedValues] = useState<Record<string, number>>({})
  const [jvmAttachments, setJvmAttachments] = useState<
    Record<string, NoteAttachmentData[]>
  >({})

  useEffect(() => {
    if (!companyId) {
      setRows([])
      setStructure([])
      return
    }

    let cancelled = false
    setLoading(true)

    Promise.all([
      getBalanceSheet(companyId, {
        fiscal_year: refYear,
        month: refMonth,
        period: "monthly",
      }),
      getStatementStructure(companyId, "balance-sheet"),
    ])
      .then(([response, structureResponse]) => {
        if (cancelled) return
        setRows(response.rows ?? [])
        setStructure((structureResponse.structure as Record<string, unknown>[]) ?? [])
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Error loading balance sheet:", err)
          setRows([])
          setStructure([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [companyId, refMonth, refYear])

  useEffect(() => {
    if (!companyId) {
      setNotes({})
      setSavedValues({})
      setJvmAttachments({})
      return
    }

    listForecastConfigs(companyId, { config_type: "net-tangible-assets-notes" })
      .then((configs) => {
        if (configs.length > 0) {
          setNotes((configs[0].data as Record<string, string>) || {})
        } else {
          setNotes({})
        }
      })
      .catch(() => {
        setNotes({})
      })

    listForecastConfigs(companyId, { config_type: "net-tangible-assets-values" })
      .then((configs) => {
        const vals = configs.length > 0 ? (configs[0].data as Record<string, number>) || {} : {}
        setSavedValues(vals)
      })
      .catch(() => {
        setSavedValues({})
      })

    listForecastConfigs(companyId, { config_type: "net-tangible-jvm-attachments" })
      .then((configs) => {
        const data =
          configs.length > 0
            ? (configs[0].data as Record<string, NoteAttachmentData[]>) || {}
            : {}
        setJvmAttachments(data)
      })
      .catch(() => {
        setJvmAttachments({})
      })
  }, [companyId])

  const saveNotesToApi = useCallback(
    async (updatedNotes: Record<string, string>) => {
      if (!companyId) return
      try {
        await upsertForecastConfig(companyId, {
          config_type: "net-tangible-assets-notes",
          data: updatedNotes as Record<string, unknown>,
          division_id: null,
          sub_division_id: null,
        })
      } catch (err) {
        console.error("Error saving notes:", err)
      }
    },
    [companyId],
  )

  const saveValuesToApi = useCallback(
    async (updatedValues: Record<string, number>) => {
      if (!companyId) return
      try {
        await upsertForecastConfig(companyId, {
          config_type: "net-tangible-assets-values",
          data: updatedValues as Record<string, unknown>,
          division_id: null,
          sub_division_id: null,
        })
      } catch (err) {
        console.error("Error saving values:", err)
      }
    },
    [companyId],
  )

  const saveJvmAttachmentsToApi = useCallback(
    async (updated: Record<string, NoteAttachmentData[]>) => {
      if (!companyId) return
      try {
        await upsertForecastConfig(companyId, {
          config_type: "net-tangible-jvm-attachments",
          data: updated as Record<string, unknown>,
          division_id: null,
          sub_division_id: null,
        })
      } catch (err) {
        console.error("Error saving JVM attachments:", err)
      }
    },
    [companyId],
  )

  const valuesByRowId = useMemo(() => {
    const map: Record<string, NetTangibleValuationColumnValues> = {}
    for (const row of rows) {
      if (!row.id || row.isSection || !row.label?.trim()) continue
      const structRow = findSummaryStructureRow(row.id, row.label, structure)
      const linkCode = structRow ? String(structRow.linkCode ?? "").trim() : ""
      const isJvmRoot = isNetTangibleJvmCapexRootRow({
        linkCode,
        rowId: row.id,
        label: row.label,
      })
      // Les totaux / résultats ne sont pas éditables, sauf ALT-B/C/D (JVM Capex).
      if (row.isResult && !isJvmRoot) continue
      map[row.id] = {
        adjustments: savedValues[`${row.id}-adjustments`] ?? 0,
        debts: savedValues[`${row.id}-debts`] ?? 0,
        assets: savedValues[`${row.id}-assets`] ?? 0,
      }
    }
    return map
  }, [rows, savedValues, structure])

  const jvmByCodeByRowId = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    for (const [key, value] of Object.entries(savedValues)) {
      const parsed = parseNetTangibleJvmStorageKey(key)
      if (!parsed) continue
      map[parsed.parentRowId] ??= {}
      map[parsed.parentRowId]![parsed.code] = value
    }
    return map
  }, [savedValues])

  const jvmNotesByCodeByRowId = useMemo(() => {
    const map: Record<string, Record<string, string>> = {}
    for (const [key, value] of Object.entries(notes)) {
      const parsed = parseNetTangibleJvmNoteStorageKey(key)
      if (!parsed) continue
      map[parsed.parentRowId] ??= {}
      map[parsed.parentRowId]![parsed.code] = value
    }
    return map
  }, [notes])

  const jvmAttachmentsByCodeByRowId = useMemo(() => {
    const map: Record<string, Record<string, NoteAttachmentData[]>> = {}
    for (const [key, attachments] of Object.entries(jvmAttachments)) {
      const excedentSep = key.indexOf("::excedent::")
      if (excedentSep > 0) continue
      const sep = key.indexOf("::")
      if (sep <= 0) continue
      const parentRowId = key.slice(0, sep)
      const code = key.slice(sep + 2)
      if (!parentRowId || !code) continue
      map[parentRowId] ??= {}
      map[parentRowId]![code] = attachments
    }
    return map
  }, [jvmAttachments])

  const excedentByCodeByRowId = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    for (const [key, value] of Object.entries(savedValues)) {
      const parsed = parseNetTangibleExcedentStorageKey(key)
      if (!parsed) continue
      map[parsed.parentRowId] ??= {}
      map[parsed.parentRowId]![parsed.code] = value
    }
    return map
  }, [savedValues])

  const excedentNotesByCodeByRowId = useMemo(() => {
    const map: Record<string, Record<string, string>> = {}
    for (const [key, value] of Object.entries(notes)) {
      const parsed = parseNetTangibleExcedentNoteStorageKey(key)
      if (!parsed) continue
      map[parsed.parentRowId] ??= {}
      map[parsed.parentRowId]![parsed.code] = value
    }
    return map
  }, [notes])

  const excedentAttachmentsByCodeByRowId = useMemo(() => {
    const map: Record<string, Record<string, NoteAttachmentData[]>> = {}
    for (const [key, attachments] of Object.entries(jvmAttachments)) {
      const marker = "::excedent::"
      const idx = key.indexOf(marker)
      if (idx <= 0) continue
      const parentRowId = key.slice(0, idx)
      const code = key.slice(idx + marker.length)
      if (!parentRowId || !code) continue
      map[parentRowId] ??= {}
      map[parentRowId]![code] = attachments
    }
    return map
  }, [jvmAttachments])

  const notesByRowId = useMemo(() => {
    const map: Record<string, NetTangibleValuationNotes> = {}
    for (const row of rows) {
      if (!row.id || row.isSection || !row.label?.trim()) continue
      const structRow = findSummaryStructureRow(row.id, row.label, structure)
      const linkCode = structRow ? String(structRow.linkCode ?? "").trim() : ""
      const isJvmRoot = isNetTangibleJvmCapexRootRow({
        linkCode,
        rowId: row.id,
        label: row.label,
      })
      if (row.isResult && !isJvmRoot) continue
      map[row.id] = {
        adjustments: notes[`${row.id}-adjustments`] ?? "",
        debts: notes[`${row.id}-debts`] ?? "",
        assets: notes[`${row.id}-assets`] ?? "",
      }
    }
    return map
  }, [notes, rows, structure])

  const overviewMetrics = useMemo(
    () =>
      buildNetTangibleOverviewMetrics(rows, valuesByRowId, {
        structure,
      }),
    [rows, structure, valuesByRowId],
  )

  const handleSaveHypothesis = useCallback(
    (
      rowId: string,
      values: NetTangibleValuationColumnValues,
      rowNotes: NetTangibleValuationNotes,
      extras?: {
        jvmByCode?: Record<string, number>
        jvmNotesByCode?: Record<string, string>
        jvmAttachmentsByCode?: Record<string, NoteAttachmentData[]>
        excedentByCode?: Record<string, number>
        excedentNotesByCode?: Record<string, string>
        excedentAttachmentsByCode?: Record<string, NoteAttachmentData[]>
      },
    ) => {
      const updatedValues: Record<string, number> = {
        ...savedValues,
        [`${rowId}-adjustments`]: values.adjustments,
        [`${rowId}-debts`]: values.debts,
        [`${rowId}-assets`]: values.assets,
      }
      const updatedNotes: Record<string, string> = {
        ...notes,
        [`${rowId}-adjustments`]: rowNotes.adjustments,
        [`${rowId}-debts`]: rowNotes.debts,
        [`${rowId}-assets`]: rowNotes.assets,
      }
      let updatedAttachments = jvmAttachments

      if (extras?.jvmByCode) {
        for (const [code, jvm] of Object.entries(extras.jvmByCode)) {
          updatedValues[netTangibleJvmStorageKey(rowId, code)] = jvm
        }
      }
      if (extras?.jvmNotesByCode) {
        for (const [code, note] of Object.entries(extras.jvmNotesByCode)) {
          updatedNotes[netTangibleJvmNoteStorageKey(rowId, code)] = note
        }
      }
      if (extras?.jvmAttachmentsByCode) {
        updatedAttachments = { ...jvmAttachments }
        for (const [code, attachments] of Object.entries(extras.jvmAttachmentsByCode)) {
          updatedAttachments[netTangibleJvmAttachmentStorageKey(rowId, code)] = attachments
        }
      }
      if (extras?.excedentByCode) {
        for (const [code, excedent] of Object.entries(extras.excedentByCode)) {
          updatedValues[netTangibleExcedentStorageKey(rowId, code)] = excedent
        }
      }
      if (extras?.excedentNotesByCode) {
        for (const [code, note] of Object.entries(extras.excedentNotesByCode)) {
          updatedNotes[netTangibleExcedentNoteStorageKey(rowId, code)] = note
        }
      }
      if (extras?.excedentAttachmentsByCode) {
        updatedAttachments = { ...updatedAttachments }
        for (const [code, attachments] of Object.entries(extras.excedentAttachmentsByCode)) {
          updatedAttachments[netTangibleExcedentAttachmentStorageKey(rowId, code)] = attachments
        }
      }

      setSavedValues(updatedValues)
      setNotes(updatedNotes)
      setJvmAttachments(updatedAttachments)
      void saveValuesToApi(updatedValues)
      void saveNotesToApi(updatedNotes)
      if (extras?.jvmAttachmentsByCode || extras?.excedentAttachmentsByCode) {
        void saveJvmAttachmentsToApi(updatedAttachments)
      }
    },
    [
      jvmAttachments,
      notes,
      saveJvmAttachmentsToApi,
      saveNotesToApi,
      saveValuesToApi,
      savedValues,
    ],
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <DashboardHeader title="Modelisys" />

      <div className="relative w-full overflow-hidden bg-[#2A2F3A]">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-24 -left-28 h-[320px] w-[320px] rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1920px] px-6 py-6 sm:py-8">
          <ValuationPlanBackButton />
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#E6D6C3]">
            Valeur comptable ajusté
          </h1>
          <p className="mt-2 max-w-4xl text-base text-[#C9B8A5]/90">
            Analysez le bilan au {referenceLabel} et ajustez les montants pour estimer la valeur comptable
            ajustée de l&apos;entreprise.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="whitespace-nowrap text-xs font-medium text-slate-200">Vue</span>
            <div
              className="inline-flex flex-wrap rounded-[10px] border border-white/10 bg-[#2A2F3A]/70 p-1 backdrop-blur-sm"
              data-testid="net-tangible-section-menu"
              role="tablist"
              aria-label="Sections valeur comptable ajusté"
            >
              {NET_TANGIBLE_SECTIONS.map((section) => {
                const isActive = activeSection === section.id
                return (
                  <Button
                    key={section.id}
                    type="button"
                    variant="ghost"
                    role="tab"
                    aria-selected={isActive}
                    data-testid={`net-tangible-section-${section.id}`}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "h-8 px-3 text-xs transition-all",
                      isActive
                        ? "bg-[#E0742D] font-medium text-white shadow-sm hover:bg-[#c96526]"
                        : "text-[#C9B8A5]/90 hover:bg-white/5 hover:text-[#E6D6C3]",
                    )}
                  >
                    {section.label}
                  </Button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <NetTangibleOverviewStrip metrics={overviewMetrics} />

      <div className="relative mb-12 mt-6">
        {activeSection === "vca" ? (
          <BalanceSheetSummary
            title="VCA"
            period="monthly"
            view="current"
            companyId={companyId}
            companies={companies}
            fiscalYear={refYear}
            refMonth={refMonth}
            refYear={refYear}
            rows={rows}
            loading={loading}
            disableRowInteractions
            showBalanceWarning
            netTangibleValuationColumns={{
              referenceColumnLabel,
              valuesByRowId,
              notesByRowId,
              jvmByCodeByRowId,
              jvmNotesByCodeByRowId,
              jvmAttachmentsByCodeByRowId,
              excedentByCodeByRowId,
              excedentNotesByCodeByRowId,
              excedentAttachmentsByCodeByRowId,
              onSaveHypothesis: handleSaveHypothesis,
            }}
          />
        ) : (
          <div className="mx-auto max-w-[1920px] px-6">
            <div className={cn(dashboardCardFrameStaticClass)} data-testid={`net-tangible-placeholder-${activeSection}`}>
              <div className={dashboardCardRingClass} aria-hidden />
              <div className={cn(dashboardCardHeaderBarClass, "px-8 py-8")}>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
                    <Construction className="h-6 w-6 text-[#E0742D]" aria-hidden />
                  </div>
                  <div>
                    <h2 className={cn(dashboardCardTitleClass, "text-2xl")}>
                      {NET_TANGIBLE_SECTIONS.find((s) => s.id === activeSection)?.label}
                    </h2>
                    <p className={cn(dashboardCardBodyMutedClass, "mt-2 max-w-2xl text-sm leading-relaxed")}>
                      Cette section sera disponible prochainement dans le module Valeur comptable ajusté.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
