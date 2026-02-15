"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector } from "@/components/entity-selector"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DollarSign, AlertTriangle, Filter, Settings, Save } from "lucide-react"
import { formatCurrency } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCompanies } from "@/hooks/use-companies"
import { getBalanceSheet, listCompanies, listForecastConfigs, upsertForecastConfig, type Company as ApiCompany } from "@/lib/api"

const evaluationNav = [
  { label: "Modèle d'affaires", href: "/evaluation/business-model" },
  { label: "Multiple du BAIIA", href: "/evaluation/ebitda-multiple" },
  { label: "Actif Corporel Net", href: "/evaluation/net-tangible-assets" },
  { label: "DCF", href: "/evaluation/dcf" },
  { label: "CCF", href: "/evaluation/ccf" },
  { label: "VCA", href: "/evaluation/vca" },
]

interface VCARow {
  label: string
  bookValue: number
  adjustment: number
  note: string
  indent?: boolean
  isBold?: boolean
  isSection?: boolean
  isResult?: boolean
  rowId?: string
}

interface VCAAdjustments {
  [rowId: string]: { adjustment: number; note: string }
}

export default function VCAPage() {
  const { companies } = useCompanies()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [divisionId, setDivisionId] = useState<string | null>(null)
  const [subDivisionId, setSubDivisionId] = useState<string | null>(null)
  const pathname = usePathname()

  // Auto-select first company
  useEffect(() => {
    if (!companyId && companies.length > 0) {
      setCompanyId(companies[0].id)
    }
  }, [companies, companyId])

  // Fetch API companies for fiscal_year_end
  const [apiCompanies, setApiCompanies] = useState<ApiCompany[]>([])
  useEffect(() => {
    listCompanies().then(setApiCompanies).catch(() => {})
  }, [])

  const currentYear = useMemo(() => {
    const now = new Date()
    const curMonth = now.getMonth() + 1
    const curYear = now.getFullYear()
    if (!companyId) return curYear
    const company = apiCompanies.find(c => c.id === companyId)
    const fyEnd = company?.fiscal_year_end || "12-31"
    const fyEndMonth = parseInt(fyEnd.split("-")[0], 10) || 12
    const currentFY = curMonth <= fyEndMonth ? curYear : curYear + 1
    return currentFY - 1
  }, [companyId, apiCompanies])

  // Disclaimer modal
  const [disclaimerOpen, setDisclaimerOpen] = useState(false)
  useEffect(() => {
    const accepted = sessionStorage.getItem("vca-disclaimer-accepted")
    if (!accepted) {
      setDisclaimerOpen(true)
    }
  }, [])

  const acceptDisclaimer = () => {
    sessionStorage.setItem("vca-disclaimer-accepted", "true")
    setDisclaimerOpen(false)
  }

  // Balance sheet data
  const [rows, setRows] = useState<VCARow[]>([])
  const [loading, setLoading] = useState(false)

  // Adjustments loaded from API
  const [savedAdjustments, setSavedAdjustments] = useState<VCAAdjustments>({})

  // Saving state
  const [saving, setSaving] = useState(false)

  // Track if there are unsaved changes
  const [dirty, setDirty] = useState(false)

  // Fetch balance sheet data
  useEffect(() => {
    if (!companyId) {
      setRows([])
      return
    }

    let cancelled = false
    setLoading(true)

    getBalanceSheet(companyId, {
      fiscal_year: currentYear,
      period: "annual",
      ...(divisionId ? { division_id: divisionId } : {}),
      ...(subDivisionId ? { sub_division_id: subDivisionId } : {}),
    })
      .then(response => {
        if (cancelled) return

        if (!response.rows || response.rows.length === 0) {
          setRows([])
          return
        }

        const mapped: VCARow[] = response.rows.map(row => {
          const isSection = row.isSection
          const isResult = row.isResult
          const isBold = row.isBold
          const isSpacer = !row.label || row.label.trim() === ""
          const indent = !isBold && !isSection && !isResult && !isSpacer

          let rowId: string | undefined
          if (!isSection && !isResult && !isSpacer && row.label) {
            rowId = row.id
          }

          return {
            label: row.label,
            bookValue: row.current,
            adjustment: 0,
            note: "",
            isBold,
            isSection,
            isResult,
            indent,
            rowId,
          }
        })

        setRows(mapped)
      })
      .catch(err => {
        if (!cancelled) {
          console.error("Error loading balance sheet:", err)
          setRows([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [companyId, divisionId, subDivisionId, currentYear])

  // Load saved adjustments from ForecastConfig
  useEffect(() => {
    if (!companyId) {
      setSavedAdjustments({})
      return
    }

    listForecastConfigs(companyId, {
      config_type: "vca-adjustments",
      ...(divisionId ? { division_id: divisionId } : {}),
      ...(subDivisionId ? { sub_division_id: subDivisionId } : {}),
    })
      .then(configs => {
        if (configs.length > 0) {
          const data = (configs[0].data as { adjustments?: VCAAdjustments })?.adjustments || {}
          setSavedAdjustments(data)
        } else {
          setSavedAdjustments({})
        }
      })
      .catch(err => {
        console.error("Error loading VCA adjustments:", err)
        setSavedAdjustments({})
      })
  }, [companyId, divisionId, subDivisionId])

  // Apply saved adjustments to rows when both are loaded
  useEffect(() => {
    if (rows.length === 0 || Object.keys(savedAdjustments).length === 0) return

    setRows(prev => prev.map(row => {
      if (row.rowId && savedAdjustments[row.rowId]) {
        return {
          ...row,
          adjustment: savedAdjustments[row.rowId].adjustment || 0,
          note: savedAdjustments[row.rowId].note || "",
        }
      }
      return row
    }))
    setDirty(false)
  }, [savedAdjustments]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update adjustment for a row
  const updateAdjustment = useCallback((rowId: string, value: number) => {
    setRows(prev => prev.map(row => {
      if (row.rowId === rowId) {
        return { ...row, adjustment: value }
      }
      return row
    }))
    setDirty(true)
  }, [])

  // Update note for a row
  const updateNote = useCallback((rowId: string, value: string) => {
    setRows(prev => prev.map(row => {
      if (row.rowId === rowId) {
        return { ...row, note: value }
      }
      return row
    }))
    setDirty(true)
  }, [])

  // Save adjustments to API
  const saveAdjustments = useCallback(async () => {
    if (!companyId) return

    setSaving(true)
    try {
      const adjustments: VCAAdjustments = {}
      rows.forEach(row => {
        if (row.rowId && (row.adjustment !== 0 || row.note.trim() !== "")) {
          adjustments[row.rowId] = {
            adjustment: row.adjustment,
            note: row.note,
          }
        }
      })

      await upsertForecastConfig(companyId, {
        config_type: "vca-adjustments",
        data: { adjustments } as Record<string, unknown>,
        division_id: divisionId || null,
        sub_division_id: subDivisionId || null,
      })

      setSavedAdjustments(adjustments)
      setDirty(false)
    } catch (err) {
      console.error("Error saving VCA adjustments:", err)
    } finally {
      setSaving(false)
    }
  }, [companyId, divisionId, subDivisionId, rows])

  // Computed metrics
  const metrics = useMemo(() => {
    const editableRows = rows.filter(r => r.rowId && !r.isSection && !r.isResult)

    const bookValueEquity = rows
      .filter(r => r.isResult && r.label)
      .reduce((sum, r) => sum + r.bookValue, 0)

    const totalAdjustments = editableRows.reduce((sum, r) => sum + r.adjustment, 0)

    const adjustedEquity = bookValueEquity + totalAdjustments

    const adjustedItemCount = editableRows.filter(r => r.adjustment !== 0).length

    return {
      bookValueEquity,
      adjustedEquity,
      totalAdjustments,
      adjustedItemCount,
    }
  }, [rows])

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />

      {/* Dark Header Section */}
      <div className="w-full bg-slate-900 pt-15 pb-40">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="flex items-start gap-3 mb-8">
            <div className="w-2"></div>
            <div className="flex-1">
              <h2 className="text-4xl font-normal text-white mb-2 tracking-tight">Valeur Comptable Ajustée (VCA)</h2>
              <p className="text-base text-slate-300 mb-6">
                Réévaluez les postes du bilan à leur juste valeur marchande (JVM)
              </p>
              <p className="text-base text-slate-300 mb-6 leading-relaxed max-w-4xl">
                La méthode VCA consiste à ajuster chaque poste du bilan à sa juste valeur marchande
                afin d'obtenir une image plus fidèle de la valeur réelle de l'entreprise. Chaque ajustement
                devrait être documenté avec une note justificative.
              </p>
              {/* Navigation Menu */}
              <div className="flex items-center gap-1 overflow-x-auto">
                {evaluationNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors",
                      pathname === item.href
                        ? "bg-white/10 text-white"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="mb-6 p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Filter Icon */}
              <div className="flex items-center gap-2 text-slate-300">
                <Filter className="w-4 h-4" />
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-slate-700" />

              {/* Entity Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300 whitespace-nowrap">Entité:</span>
                <EntitySelector
                  companies={companies}
                  selectedCompanyId={companyId}
                  selectedDivisionId={divisionId}
                  selectedSubDivisionId={subDivisionId}
                  onCompanyChange={setCompanyId}
                  onDivisionChange={setDivisionId}
                  onSubDivisionChange={setSubDivisionId}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Overlapping section */}
      <div className="relative -mt-32 mb-12">
        <div className="max-w-[1920px] mx-auto px-6">

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-slate-600" />
                </div>
                <span className="text-sm font-medium text-slate-500">Avoir comptable</span>
              </div>
              <p className="text-2xl font-semibold text-slate-900">{formatCurrency(metrics.bookValueEquity)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-slate-500">Avoir ajusté</span>
              </div>
              <p className="text-2xl font-semibold text-emerald-700">{formatCurrency(metrics.adjustedEquity)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-slate-500">Total ajustements</span>
              </div>
              <p className={cn(
                "text-2xl font-semibold",
                metrics.totalAdjustments >= 0 ? "text-blue-700" : "text-red-700"
              )}>
                {formatCurrency(metrics.totalAdjustments)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-sm font-medium text-slate-500">Postes ajustés</span>
              </div>
              <p className="text-2xl font-semibold text-slate-900">{metrics.adjustedItemCount}</p>
            </div>
          </div>

          {/* Table Card */}
          <div className="w-full bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
            {/* Header */}
            <div className="bg-white px-8 py-5 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">Bilan - Juste Valeur Marchande</h2>
                    <p className="text-sm text-slate-600">Ajustez chaque poste du bilan pour refléter sa juste valeur marchande</p>
                  </div>
                </div>
                <Button
                  onClick={saveAdjustments}
                  disabled={saving || !dirty}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center h-64 bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            ) : rows.length === 0 ? (
              <div className="flex items-center justify-center h-64 bg-white">
                <p className="text-slate-400">
                  {companyId ? "Aucune donnée disponible" : "Sélectionnez une entreprise pour afficher le bilan"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm w-2/6">Compte</th>
                      <th className="px-4 py-4 text-right font-semibold text-slate-900 text-sm">Valeur comptable</th>
                      <th className="px-4 py-4 text-right font-semibold text-slate-900 text-sm">Ajustement</th>
                      <th className="px-4 py-4 text-right font-semibold text-slate-900 text-sm">JVM</th>
                      <th className="px-4 py-4 text-left font-semibold text-slate-900 text-sm w-1/4">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const isSpacer = row.label === ""
                      const shouldHideAmounts = isSpacer || !!row.isSection
                      const fmv = row.bookValue + row.adjustment
                      const nextRowIsResult = idx < rows.length - 1 && rows[idx + 1].isResult

                      if (isSpacer) {
                        return (
                          <tr key={idx} className="h-2 border-b border-slate-200">
                            <td colSpan={5}></td>
                          </tr>
                        )
                      }

                      if (row.isSection) {
                        return (
                          <tr key={idx} className="border-b border-slate-200 bg-slate-50">
                            <td colSpan={5} className="px-6 py-3 font-semibold text-slate-800 text-sm">
                              {row.label}
                            </td>
                          </tr>
                        )
                      }

                      return (
                        <tr
                          key={idx}
                          className={cn(
                            "border-b",
                            nextRowIsResult ? "border-slate-900 border-b-2" : "border-slate-200",
                            row.isResult ? "bg-slate-50" : "hover:bg-slate-50"
                          )}
                        >
                          {/* Account */}
                          <td
                            className={cn(
                              "px-6 py-3",
                              row.isBold || row.isResult ? "font-bold text-slate-900" : "text-slate-700",
                              row.indent ? "pl-12" : ""
                            )}
                          >
                            {row.label}
                          </td>

                          {/* Book Value */}
                          <td className="px-4 py-3 text-right">
                            <span className={cn("text-sm", (row.isBold || row.isResult) && "font-semibold text-slate-900")}>
                              {formatCurrency(row.bookValue)}
                            </span>
                          </td>

                          {/* Adjustment (editable) */}
                          <td className="px-4 py-3 text-right">
                            {row.rowId ? (
                              <Input
                                type="text"
                                value={row.adjustment === 0 ? "" : row.adjustment.toString()}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/[^\d\-]/g, "")
                                  const num = raw === "" || raw === "-" ? 0 : Number(raw)
                                  if (!isNaN(num)) {
                                    updateAdjustment(row.rowId!, num)
                                  }
                                }}
                                className="w-32 text-right text-sm font-mono ml-auto h-8 border-slate-300 focus:border-emerald-500"
                                placeholder="0"
                              />
                            ) : (
                              <span className={cn("text-sm", row.isResult && "font-semibold text-slate-900")}>
                                -
                              </span>
                            )}
                          </td>

                          {/* FMV */}
                          <td className="px-4 py-3 text-right">
                            <span className={cn(
                              "text-sm",
                              (row.isBold || row.isResult) && "font-semibold text-slate-900",
                              row.rowId && row.adjustment !== 0 && "text-emerald-700 font-medium"
                            )}>
                              {row.rowId ? formatCurrency(fmv) : formatCurrency(row.bookValue)}
                            </span>
                          </td>

                          {/* Notes (editable) */}
                          <td className="px-4 py-3">
                            {row.rowId ? (
                              <Input
                                type="text"
                                value={row.note}
                                onChange={(e) => updateNote(row.rowId!, e.target.value)}
                                className="w-full text-sm h-8 border-slate-300 focus:border-emerald-500"
                                placeholder="Note justificative..."
                              />
                            ) : (
                              <span className="text-sm text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}

                    {/* Totals Row */}
                    <tr className="border-t-2 border-slate-900 bg-slate-100">
                      <td className="px-6 py-4 font-bold text-slate-900">
                        Avoir ajusté total
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-bold text-slate-900">
                          {formatCurrency(metrics.bookValueEquity)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={cn(
                          "text-sm font-bold",
                          metrics.totalAdjustments >= 0 ? "text-emerald-700" : "text-red-700"
                        )}>
                          {formatCurrency(metrics.totalAdjustments)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-bold text-emerald-700">
                          {formatCurrency(metrics.adjustedEquity)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-500">
                          {metrics.adjustedItemCount} poste{metrics.adjustedItemCount !== 1 ? "s" : ""} ajusté{metrics.adjustedItemCount !== 1 ? "s" : ""}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Disclaimer Modal */}
      <Dialog open={disclaimerOpen} onOpenChange={setDisclaimerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Avertissement - Valeur Comptable Ajustée
            </DialogTitle>
            <DialogDescription className="pt-4 text-sm leading-relaxed text-slate-600">
              La méthode de la Valeur Comptable Ajustée (VCA) repose sur des ajustements subjectifs
              de la juste valeur marchande (JVM) de chaque poste du bilan. Les résultats obtenus
              dépendent directement de la qualité et de la rigueur des évaluations effectuées.
              <br /><br />
              Il est fortement recommandé de documenter chaque ajustement avec une note justificative
              et de faire valider les évaluations par un professionnel qualifié (EEE, CPA, CBV).
              <br /><br />
              Cet outil est fourni à titre indicatif seulement et ne constitue pas un avis professionnel
              d'évaluation d'entreprise.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={acceptDisclaimer}>
              J'ai compris
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
