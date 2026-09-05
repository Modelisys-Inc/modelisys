"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { ValuationPlanBackButton } from "@/components/valuation-plan-back-button"
import {
  type NetTangibleValuationColumnValues,
  type NetTangibleValuationNotes,
} from "@/components/balance-sheet-summary"
import {
  NetTangibleReport,
  buildNetTangibleSourceRows,
  type FdrAdjustmentMode,
} from "@/components/net-tangible/net-tangible-report"
import { useCompanies } from "@/hooks/use-companies"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { formatCalendarMonthYearShort } from "@/lib/financial-period-labels"
import {
  getBalanceSheet,
  getStatementStructure,
  listForecastConfigs,
  listStandardLinkCodesFlat,
  upsertForecastConfig,
  type FinancialStatementRow,
  type NoteAttachmentData,
  type StandardLinkCode,
} from "@/lib/api"
import { findSummaryStructureRow, collectAnnexChildExpandRows } from "@/lib/balance-sheet-summary-expand"
import { buildNetTangibleOverviewMetrics, applyNetTangibleFdrOverviewAdjustment } from "@/lib/net-tangible-overview"
import {
  computeRevenueTtmFromIncomeStatementSeries,
  NET_TANGIBLE_REVENUE_TTM_MONTHS,
} from "@/lib/net-tangible-fdr-revenue"
import {
  isNetTangibleJvmCapexRootLinkCode,
  isNetTangibleJvmCapexRootRow,
  netTangibleJvmAttachmentStorageKey,
  netTangibleJvmCapexRootLinkCodeFromLabel,
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

export default function NetTangibleAssetsPage() {
  const searchParams = useSearchParams()
  const { companies } = useCompanies()

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
  const [standardCodes, setStandardCodes] = useState<StandardLinkCode[]>([])
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [savedValues, setSavedValues] = useState<Record<string, number>>({})
  const [jvmAttachments, setJvmAttachments] = useState<
    Record<string, NoteAttachmentData[]>
  >({})

  // --- FDR représentatif adjustment ---
  const [fdrAdjMode, setFdrAdjMode] = useState<FdrAdjustmentMode>("dollar")
  const [fdrAdjValue, setFdrAdjValue] = useState<number>(0)
  const [fdrAdjNote, setFdrAdjNote] = useState("")

  const { rows: incomeSeriesRows, periods: incomeSeriesPeriods } = useFinancialStatementSeries({
    companyId,
    statementType: "income-statement",
    fiscalYear: refYear,
    month: refMonth,
    months: NET_TANGIBLE_REVENUE_TTM_MONTHS,
    enabled: Boolean(companyId),
  })
  const revenueTotal = computeRevenueTtmFromIncomeStatementSeries(
    incomeSeriesRows,
    incomeSeriesPeriods,
    refMonth,
    refYear,
  )

  useEffect(() => {
    if (!companyId) {
      setRows([])
      setStructure([])
      setStandardCodes([])
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
      listStandardLinkCodesFlat(false).catch(() => [] as StandardLinkCode[]),
    ])
      .then(([response, structureResponse, codes]) => {
        if (cancelled) return
        setRows(response.rows ?? [])
        setStructure((structureResponse.structure as Record<string, unknown>[]) ?? [])
        setStandardCodes(codes ?? [])
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Error loading balance sheet:", err)
          setRows([])
          setStructure([])
          setStandardCodes([])
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

    listForecastConfigs(companyId, { config_type: "net-tangible-fdr-adjustment" })
      .then((configs) => {
        if (configs.length > 0) {
          const d = configs[0].data as Record<string, unknown>
          setFdrAdjMode((d.mode as FdrAdjustmentMode) ?? "dollar")
          setFdrAdjValue((d.value as number) ?? 0)
          setFdrAdjNote((d.note as string) ?? "")
        } else {
          setFdrAdjMode("dollar")
          setFdrAdjValue(0)
          setFdrAdjNote("")
        }
      })
      .catch(() => {
        setFdrAdjMode("dollar")
        setFdrAdjValue(0)
        setFdrAdjNote("")
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
      const num = typeof value === "number" ? value : Number(value)
      if (!Number.isFinite(num)) continue
      map[parsed.parentRowId] ??= {}
      map[parsed.parentRowId]![parsed.code] = num
    }
    return map
  }, [savedValues])

  /** JVM indexées aussi sous id structure / ALT-B… → rattachées à l’id API du parent. */
  const jvmByCodeByApiRowId = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    for (const row of rows) {
      if (!row.id || row.isSection) continue
      const structRow = findSummaryStructureRow(row.id, row.label, structure)
      const linkCode = structRow ? String(structRow.linkCode ?? "").trim() : ""
      if (
        !isNetTangibleJvmCapexRootRow({
          linkCode,
          rowId: row.id,
          label: row.label,
        })
      ) {
        continue
      }
      const inferred = netTangibleJvmCapexRootLinkCodeFromLabel(row.label)
      const aliases = [
        row.id,
        linkCode,
        inferred ?? "",
        structRow ? String(structRow.id ?? "").trim() : "",
      ].filter(Boolean)
      const merged: Record<string, number> = {}
      for (const alias of aliases) {
        const slice = jvmByCodeByRowId[alias]
        if (!slice) continue
        Object.assign(merged, slice)
      }
      if (Object.keys(merged).length > 0) map[row.id] = merged
    }
    // Conserver aussi les clés brutes (feuilles non Capex n’utilisent pas ce remap).
    for (const [parentId, byCode] of Object.entries(jvmByCodeByRowId)) {
      map[parentId] ??= byCode
    }
    return map
  }, [jvmByCodeByRowId, rows, structure])

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
      const num = typeof value === "number" ? value : Number(value)
      if (!Number.isFinite(num)) continue
      map[parsed.parentRowId] ??= {}
      map[parsed.parentRowId]![parsed.code] = num
    }
    return map
  }, [savedValues])

  const excedentByCodeByApiRowId = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    for (const row of rows) {
      if (!row.id || row.isSection) continue
      const structRow = findSummaryStructureRow(row.id, row.label, structure)
      const linkCode = structRow ? String(structRow.linkCode ?? "").trim() : ""
      if (
        !isNetTangibleJvmCapexRootRow({
          linkCode,
          rowId: row.id,
          label: row.label,
        })
      ) {
        continue
      }
      const inferred = netTangibleJvmCapexRootLinkCodeFromLabel(row.label)
      const aliases = [
        row.id,
        linkCode,
        inferred ?? "",
        structRow ? String(structRow.id ?? "").trim() : "",
      ].filter(Boolean)
      const merged: Record<string, number> = {}
      for (const alias of aliases) {
        const slice = excedentByCodeByRowId[alias]
        if (!slice) continue
        Object.assign(merged, slice)
      }
      if (Object.keys(merged).length > 0) map[row.id] = merged
    }
    for (const [parentId, byCode] of Object.entries(excedentByCodeByRowId)) {
      map[parentId] ??= byCode
    }
    return map
  }, [excedentByCodeByRowId, rows, structure])

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

  /** Annexes ALT-B/C/D : postes avec VC pour libellés spécifiques au sommaire sources. */
  const annexPostsByParentRowId = useMemo(() => {
    const map: Record<string, { code: string; label: string; vc: number }[]> = {}
    for (const row of rows) {
      if (!row.id || row.isSection) continue
      const structRow = findSummaryStructureRow(row.id, row.label, structure)
      const linkCode = structRow ? String(structRow.linkCode ?? "").trim() : ""
      const inferred = netTangibleJvmCapexRootLinkCodeFromLabel(row.label)
      if (
        !isNetTangibleJvmCapexRootRow({
          linkCode,
          rowId: row.id,
          label: row.label,
        })
      ) {
        continue
      }
      const rootCode =
        (isNetTangibleJvmCapexRootLinkCode(linkCode) ? linkCode.trim().toUpperCase() : null) ??
        inferred
      const parentStructRow: Record<string, unknown> =
        structRow ??
        (rootCode
          ? { id: rootCode, linkCode: rootCode, label: row.label, annexLetter: "" }
          : { id: row.id, linkCode: "", label: row.label, annexLetter: "" })

      const children = collectAnnexChildExpandRows({
        parentStructRow,
        structure,
        apiRows: rows,
        standardCodes,
      })
      const byCode = new Map(
        children.map((child) => [
          child.code,
          { code: child.code, label: child.label, vc: child.amount },
        ]),
      )

      // Compléter avec les codes JVM / Excédent déjà persistés (libellé / VC via structure).
      const persistedCodes = new Set([
        ...Object.keys(jvmByCodeByApiRowId[row.id] ?? {}),
        ...Object.keys(excedentByCodeByApiRowId[row.id] ?? {}),
      ])
      for (const code of persistedCodes) {
        if (byCode.has(code)) continue
        const fromStruct = structure.find((sr) => {
          const c = String(sr.linkCode ?? sr.id ?? "").trim()
          return c === code
        })
        const label = String(fromStruct?.label ?? code).trim() || code
        const api = rows.find(
          (r) =>
            r.id === code ||
            r.label.trim().toLowerCase() === label.toLowerCase(),
        )
        byCode.set(code, {
          code,
          label: String(api?.label ?? label).trim() || code,
          vc: api?.current ?? 0,
        })
      }

      map[row.id] = [...byCode.values()]
    }
    return map
  }, [rows, structure, standardCodes, jvmByCodeByApiRowId, excedentByCodeByApiRowId])

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

  const overviewBaseMetrics = useMemo(
    () =>
      buildNetTangibleOverviewMetrics(rows, valuesByRowId, {
        structure,
      }),
    [rows, structure, valuesByRowId],
  )

  const fdrBaseLine = useMemo(() => {
    const metric = overviewBaseMetrics.find((m) => m.id === "fdr-representatif")
    return metric?.value ?? null
  }, [overviewBaseMetrics])

  const fdrAdjustedValue = useMemo(() => {
    if (fdrAdjMode === "representative-amount") return fdrAdjValue
    if (fdrBaseLine == null) return null
    if (fdrAdjMode === "dollar") return fdrBaseLine + fdrAdjValue
    // percent-revenue: adjusted = revenus TTM × %
    if (revenueTotal == null || !Number.isFinite(revenueTotal)) return fdrBaseLine
    return revenueTotal * (fdrAdjValue / 100)
  }, [fdrBaseLine, fdrAdjMode, fdrAdjValue, revenueTotal])

  /** Écart $ entre FDR ajusté et FDR déterminé (VCA). */
  const fdrAdjustmentDollarDelta =
    fdrBaseLine != null && fdrAdjustedValue != null && Number.isFinite(fdrAdjustedValue)
      ? fdrAdjustedValue - fdrBaseLine
      : null

  /**
   * Bandeau : sans saisie (% / montant représentatif à 0), conserver le FDR déterminé
   * pour ne pas écraser ACN / surplus.
   */
  const overviewFdrAdjustedValue =
    fdrAdjMode !== "dollar" && fdrAdjValue === 0 ? fdrBaseLine : fdrAdjustedValue
  const overviewFdrAdjustmentDelta =
    fdrAdjMode !== "dollar" && fdrAdjValue === 0 ? 0 : fdrAdjustmentDollarDelta

  const overviewMetrics = useMemo(
    () =>
      applyNetTangibleFdrOverviewAdjustment(overviewBaseMetrics, {
        fdrAdjustedValue: overviewFdrAdjustedValue,
        fdrAdjustmentDollarDelta: overviewFdrAdjustmentDelta,
      }),
    [overviewBaseMetrics, overviewFdrAdjustedValue, overviewFdrAdjustmentDelta],
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

  const saveFdrAdjustment = useCallback(
    async (mode: FdrAdjustmentMode, value: number, note: string, pctOfRevenue?: number | null) => {
      setFdrAdjMode(mode)
      setFdrAdjValue(value)
      setFdrAdjNote(note)
      if (!companyId) return
      try {
        await upsertForecastConfig(companyId, {
          config_type: "net-tangible-fdr-adjustment",
          data: {
            mode,
            value,
            note,
            ...(pctOfRevenue != null && Number.isFinite(pctOfRevenue)
              ? { pctOfRevenue }
              : {}),
          },
          division_id: null,
          sub_division_id: null,
        })
      } catch (err) {
        console.error("Error saving FDR adjustment:", err)
      }
    },
    [companyId],
  )

  /** FDR déterminé ÷ revenus TTM — affiché sous la carte de base. */
  const fdrBasePctOfRevenue =
    fdrBaseLine != null &&
    revenueTotal != null &&
    Number.isFinite(fdrBaseLine) &&
    Number.isFinite(revenueTotal) &&
    Math.abs(revenueTotal) >= 1e-9
      ? (fdrBaseLine / Math.abs(revenueTotal)) * 100
      : null

  /** Écart d’ajustement ÷ revenus TTM — sous-texte de la carte Ajustement. */
  const fdrAdjustmentPctOfRevenue =
    fdrAdjustmentDollarDelta != null &&
    revenueTotal != null &&
    Number.isFinite(revenueTotal) &&
    Math.abs(revenueTotal) >= 1e-9
      ? (fdrAdjustmentDollarDelta / Math.abs(revenueTotal)) * 100
      : null

  /** FDR ajusté ÷ revenus TTM — même principe que la carte FDR déterminé. */
  const fdrAdjustedPctOfRevenue =
    fdrAdjustedValue != null &&
    revenueTotal != null &&
    Number.isFinite(fdrAdjustedValue) &&
    Number.isFinite(revenueTotal) &&
    Math.abs(revenueTotal) >= 1e-9
      ? (fdrAdjustedValue / Math.abs(revenueTotal)) * 100
      : null

  /** % FDR représentatif (bandeau / après repli sur le déterminé) — exporté vers BAIIA ajusté. */
  const fdrRepresentativePctOfRevenue =
    overviewFdrAdjustedValue != null &&
    revenueTotal != null &&
    Number.isFinite(overviewFdrAdjustedValue) &&
    Number.isFinite(revenueTotal) &&
    Math.abs(revenueTotal) >= 1e-9
      ? (overviewFdrAdjustedValue / Math.abs(revenueTotal)) * 100
      : fdrAdjustedPctOfRevenue

  /** Publie le % FDR représentatif dès qu’il est calculable (consommation BAIIA ajusté). */
  useEffect(() => {
    if (!companyId || fdrRepresentativePctOfRevenue == null) return
    const timer = setTimeout(() => {
      void upsertForecastConfig(companyId, {
        config_type: "net-tangible-fdr-adjustment",
        data: {
          mode: fdrAdjMode,
          value: fdrAdjValue,
          note: fdrAdjNote,
          pctOfRevenue: fdrRepresentativePctOfRevenue,
        },
        division_id: null,
        sub_division_id: null,
      }).catch(console.error)
    }, 600)
    return () => clearTimeout(timer)
  }, [
    companyId,
    fdrRepresentativePctOfRevenue,
    fdrAdjMode,
    fdrAdjValue,
    fdrAdjNote,
  ])

  const fdrAdjModeLabel =
    fdrAdjMode === "dollar"
      ? "Ajustement $"
      : fdrAdjMode === "percent-revenue"
        ? "% des revenus"
        : "Montant représentatif"

  const sourceRows = useMemo(
    () =>
      buildNetTangibleSourceRows({
        rows,
        valuesByRowId,
        notesByRowId,
        jvmByCodeByRowId: jvmByCodeByApiRowId,
        jvmNotesByCodeByRowId,
        excedentByCodeByRowId: excedentByCodeByApiRowId,
        excedentNotesByCodeByRowId,
        annexPostsByParentRowId,
        fdrAdjNote,
        fdrAdjustedValue: overviewFdrAdjustedValue,
        fdrAdjModeLabel,
        fdrAdjustmentDollarDelta,
      }),
    [
      rows,
      valuesByRowId,
      notesByRowId,
      jvmByCodeByApiRowId,
      jvmNotesByCodeByRowId,
      excedentByCodeByApiRowId,
      excedentNotesByCodeByRowId,
      annexPostsByParentRowId,
      fdrAdjNote,
      overviewFdrAdjustedValue,
      fdrAdjModeLabel,
      fdrAdjustmentDollarDelta,
    ],
  )

  const handleSourceNoteChange = useCallback(
    (id: string, note: string) => {
      if (id === "fdr-adjustment") {
        setFdrAdjNote(note)
        void saveFdrAdjustment(fdrAdjMode, fdrAdjValue, note, fdrRepresentativePctOfRevenue)
        return
      }
      const jvmMatch = id.match(/^(.+)-jvm-(.+)$/)
      if (jvmMatch) {
        const [, rowId, code] = jvmMatch
        const key = netTangibleJvmNoteStorageKey(rowId!, code!)
        const updated = { ...notes, [key]: note }
        setNotes(updated)
        void saveNotesToApi(updated)
        return
      }
      const exMatch = id.match(/^(.+)-excedent-(.+)$/)
      if (exMatch) {
        const [, rowId, code] = exMatch
        const key = netTangibleExcedentNoteStorageKey(rowId!, code!)
        const updated = { ...notes, [key]: note }
        setNotes(updated)
        void saveNotesToApi(updated)
        return
      }
      const fieldMatch = id.match(/^(.+)-(adjustments|debts|assets)$/)
      if (fieldMatch) {
        const [, , field] = fieldMatch
        const key = id
        const updated = { ...notes, [key]: note }
        setNotes(updated)
        void saveNotesToApi(updated)
        void field
        return
      }
    },
    [fdrAdjMode, fdrAdjValue, fdrRepresentativePctOfRevenue, notes, saveFdrAdjustment, saveNotesToApi],
  )

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
            Valeur comptable ajustée
          </h1>
          <p className="mt-2 max-w-4xl text-base text-[#C9B8A5]/90">
            Ajustez les actifs et passifs pour estimer la valeur comptable ajustée de
            l&apos;entreprise.
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
            <div className="whitespace-nowrap" data-testid="net-tangible-reference-date">
              <span className="text-white/50">Date de référence</span>{" "}
              <span className="font-medium text-slate-100">{referenceLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative -mt-32 mb-12 min-w-0">
        <div className="mx-auto max-w-[1920px] px-6">
          <NetTangibleReport
            companyName={companyName}
            referenceLabel={referenceLabel}
            referenceColumnLabel={referenceColumnLabel}
            companyId={companyId}
            companies={companies}
            fiscalYear={refYear}
            refMonth={refMonth}
            refYear={refYear}
            rows={rows}
            loading={loading}
            overviewMetrics={overviewMetrics}
            valuesByRowId={valuesByRowId}
            notesByRowId={notesByRowId}
            jvmByCodeByRowId={jvmByCodeByApiRowId}
            jvmNotesByCodeByRowId={jvmNotesByCodeByRowId}
            jvmAttachmentsByCodeByRowId={jvmAttachmentsByCodeByRowId}
            excedentByCodeByRowId={excedentByCodeByApiRowId}
            excedentNotesByCodeByRowId={excedentNotesByCodeByRowId}
            excedentAttachmentsByCodeByRowId={excedentAttachmentsByCodeByRowId}
            onSaveHypothesis={handleSaveHypothesis}
            fdr={{
              fdrBaseLine,
              fdrBasePctOfRevenue,
              revenueTotal,
              fdrAdjMode,
              fdrAdjValue,
              fdrAdjNote,
              fdrAdjustmentDollarDelta,
              fdrAdjustmentPctOfRevenue,
              fdrAdjustedValue: overviewFdrAdjustedValue,
              fdrAdjustedPctOfRevenue,
              onAdjValueChange: setFdrAdjValue,
              onAdjNoteChange: setFdrAdjNote,
              onModeChange: (mode) => {
                if (mode !== fdrAdjMode)
                  void saveFdrAdjustment(mode, 0, fdrAdjNote, fdrRepresentativePctOfRevenue)
              },
              onSave: () =>
                void saveFdrAdjustment(
                  fdrAdjMode,
                  fdrAdjValue,
                  fdrAdjNote,
                  fdrRepresentativePctOfRevenue,
                ),
            }}
            sourceRows={sourceRows}
            onSourceNoteChange={handleSourceNoteChange}
          />
        </div>
      </div>
    </div>
  )
}
