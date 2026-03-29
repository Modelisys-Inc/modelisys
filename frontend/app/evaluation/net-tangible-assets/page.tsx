"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector } from "@/components/entity-selector"
import { Filter, Settings } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { formatCurrency } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useCompanies } from "@/hooks/use-companies"
import {
  listCompanies,
  listForecastConfigs,
  upsertForecastConfig,
  getBalanceSheet,
  type Company as ApiCompany,
} from "@/lib/api"

const evaluationNav = [
  { label: "Modèle d'affaires", href: "/evaluation/business-model" },
  { label: "Multiple du BAIIA", href: "/evaluation/ebitda-multiple" },
  { label: "Actif Corporel Net", href: "/evaluation/net-tangible-assets" },
  { label: "DCF", href: "/evaluation/dcf" },
  { label: "CCF", href: "/evaluation/ccf" },
  { label: "VCA", href: "/evaluation/vca" },
]

interface BalanceRow {
  label: string
  year2026: number
  adjustments: number
  debts: number
  assets: number
  indent?: boolean
  isBold?: boolean
  isSection?: boolean
  isSubtotal?: boolean
  rowId?: string
}

export default function NetTangibleAssetsPage() {
  const { companies } = useCompanies()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [divisionId, setDivisionId] = useState<string | null>(null)
  const [subDivisionId, setSubDivisionId] = useState<string | null>(null)
  const [notesConfigId, setNotesConfigId] = useState<string | null>(null)
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

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editingColumn, setEditingColumn] = useState<"adjustments" | "debts" | "assets" | null>(null)
  const [modalValue, setModalValue] = useState<number>(0)
  const [modalNote, setModalNote] = useState<string>("")

  // Notes storage: key = rowId-column -> note
  const [notes, setNotes] = useState<Record<string, string>>({})
  // Values storage: key = rowId-column -> number
  const [savedValues, setSavedValues] = useState<Record<string, number>>({})
  const [valuesConfigId, setValuesConfigId] = useState<string | null>(null)

  // Balance sheet data - populated from API
  const [balanceData, setBalanceData] = useState<BalanceRow[]>([])
  const [balanceLoading, setBalanceLoading] = useState(false)

  // Fetch balance sheet data from API when company changes
  useEffect(() => {
    if (!companyId) {
      setBalanceData([])
      return
    }

    let cancelled = false
    setBalanceLoading(true)

    getBalanceSheet(companyId, {
      fiscal_year: currentYear,
      period: "annual",
      ...(divisionId ? { division_id: divisionId } : {}),
      ...(subDivisionId ? { sub_division_id: subDivisionId } : {}),
    })
      .then(response => {
        if (cancelled) return

        if (!response.rows || response.rows.length === 0) {
          setBalanceData([])
          return
        }

        // Convert FinancialStatementRow[] to BalanceRow[]
        const rows: BalanceRow[] = response.rows.map(row => {
          // Generate a stable rowId for editable rows (non-section, non-spacer rows with a label)
          const isSection = row.isSection
          const isSubtotal = row.isResult
          const isBold = row.isBold
          const isSpacer = !row.label || row.label.trim() === ""
          const indent = !isBold && !isSection && !isSubtotal && !isSpacer

          // Create a rowId for rows that should be editable
          let rowId: string | undefined
          if (!isSection && !isSubtotal && !isSpacer && row.label) {
            rowId = row.id
          }

          return {
            label: row.label,
            year2026: row.current,
            adjustments: 0,
            debts: 0,
            assets: 0,
            isBold,
            isSection,
            isSubtotal,
            indent,
            rowId,
          }
        })

        // Merge saved numeric values into rows
        setSavedValues(prev => {
          const merged = rows.map(row =>
            row.rowId
              ? {
                  ...row,
                  adjustments: prev[`${row.rowId}-adjustments`] ?? 0,
                  debts: prev[`${row.rowId}-debts`] ?? 0,
                  assets: prev[`${row.rowId}-assets`] ?? 0,
                }
              : row
          )
          setBalanceData(merged)
          return prev
        })
      })
      .catch(err => {
        if (!cancelled) {
          console.error("Error loading balance sheet:", err)
          setBalanceData([])
        }
      })
      .finally(() => {
        if (!cancelled) setBalanceLoading(false)
      })

    return () => { cancelled = true }
  }, [companyId, divisionId, subDivisionId, currentYear])

  // Calculate VCA and ACN for each row
  const calculateVCA = (row: BalanceRow): number => {
    return row.year2026 + row.adjustments
  }

  const calculateACN = (row: BalanceRow): number => {
    const vca = calculateVCA(row)
    return vca - row.debts - row.assets
  }

  // Calculate totals for Debts and Assets columns
  const totalDebts = balanceData
    .filter(row => row.rowId && !row.isSection && !row.isSubtotal && row.label !== "")
    .reduce((sum, row) => sum + row.debts, 0)

  const totalAssets = balanceData
    .filter(row => row.rowId && !row.isSection && !row.isSubtotal && row.label !== "")
    .reduce((sum, row) => sum + row.assets, 0)

  // Load notes and values from API
  useEffect(() => {
    if (!companyId) {
      setNotes({})
      setNotesConfigId(null)
      setSavedValues({})
      setValuesConfigId(null)
      return
    }

    listForecastConfigs(companyId, {
      config_type: "net-tangible-assets-notes",
      ...(divisionId ? { division_id: divisionId } : {}),
      ...(subDivisionId ? { sub_division_id: subDivisionId } : {}),
    })
      .then((configs) => {
        if (configs.length > 0) {
          setNotes((configs[0].data as Record<string, string>) || {})
          setNotesConfigId(configs[0].id)
        } else {
          setNotes({})
          setNotesConfigId(null)
        }
      })
      .catch(() => {
        setNotes({})
        setNotesConfigId(null)
      })

    listForecastConfigs(companyId, {
      config_type: "net-tangible-assets-values",
      ...(divisionId ? { division_id: divisionId } : {}),
      ...(subDivisionId ? { sub_division_id: subDivisionId } : {}),
    })
      .then((configs) => {
        const vals = configs.length > 0 ? (configs[0].data as Record<string, number>) || {} : {}
        setValuesConfigId(configs.length > 0 ? configs[0].id : null)
        setSavedValues(vals)
        // Apply to any already-loaded balance data
        setBalanceData(prev => prev.map(row =>
          row.rowId
            ? {
                ...row,
                adjustments: vals[`${row.rowId}-adjustments`] ?? row.adjustments,
                debts: vals[`${row.rowId}-debts`] ?? row.debts,
                assets: vals[`${row.rowId}-assets`] ?? row.assets,
              }
            : row
        ))
      })
      .catch(() => {
        setSavedValues({})
        setValuesConfigId(null)
      })
  }, [companyId, divisionId, subDivisionId])

  // Save notes to API
  const saveNotesToApi = useCallback(async (updatedNotes: Record<string, string>) => {
    if (!companyId) return
    try {
      const result = await upsertForecastConfig(companyId, {
        config_type: "net-tangible-assets-notes",
        data: updatedNotes as Record<string, unknown>,
        division_id: divisionId || null,
        sub_division_id: subDivisionId || null,
      })
      setNotesConfigId(result.id)
    } catch (err) {
      console.error("Error saving notes:", err)
    }
  }, [companyId, divisionId, subDivisionId])

  // Save numeric values to API
  const saveValuesToApi = useCallback(async (updatedValues: Record<string, number>) => {
    if (!companyId) return
    try {
      const result = await upsertForecastConfig(companyId, {
        config_type: "net-tangible-assets-values",
        data: updatedValues as Record<string, unknown>,
        division_id: divisionId || null,
        sub_division_id: subDivisionId || null,
      })
      setValuesConfigId(result.id)
    } catch (err) {
      console.error("Error saving values:", err)
    }
  }, [companyId, divisionId, subDivisionId])

  // Open modal to edit value
  const openEditModal = (rowId: string, column: "adjustments" | "debts" | "assets") => {
    const row = balanceData.find(r => r.rowId === rowId)
    if (row) {
      setEditingRowId(rowId)
      setEditingColumn(column)
      setModalValue(row[column])
      const noteKey = `${rowId}-${column}`
      setModalNote(notes[noteKey] || "")
      setModalOpen(true)
    }
  }

  // Save edited value and note
  const saveValue = () => {
    if (!editingRowId || !editingColumn) return

    // Update balance data
    setBalanceData(prev => prev.map(row =>
      row.rowId === editingRowId ? { ...row, [editingColumn]: modalValue } : row
    ))

    // Update and persist notes
    const noteKey = `${editingRowId}-${editingColumn}`
    const updatedNotes = { ...notes, [noteKey]: modalNote }
    setNotes(updatedNotes)
    saveNotesToApi(updatedNotes)

    // Update and persist numeric values
    const valueKey = `${editingRowId}-${editingColumn}`
    const updatedValues = { ...savedValues, [valueKey]: modalValue }
    setSavedValues(updatedValues)
    saveValuesToApi(updatedValues)

    setModalOpen(false)
    setEditingRowId(null)
    setEditingColumn(null)
    setModalValue(0)
    setModalNote("")
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />
      
      {/* Dark Header Section */}
      <div className="w-full bg-slate-900 pt-15 pb-40">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="flex items-start gap-3 mb-8">
            <div className="w-2"></div>
            <div className="flex-1">
              <h2 className="text-4xl font-normal text-white mb-2 tracking-tight">Actif Corporel Net</h2>
              <p className="text-base text-slate-300 mb-6">
                Évaluez votre entreprise en fonction de la valeur de ses actifs corporels nets
              </p>
              <p className="text-base text-slate-300 mb-6 leading-relaxed max-w-4xl">
                Calculez la valeur de votre entreprise en soustrayant les passifs de la valeur des actifs corporels. 
                Cette méthode d'évaluation est particulièrement utile pour les entreprises avec des actifs tangibles importants.
              </p>
              {/* Navigation Menu */}
              <div className="flex items-end gap-8 mb-2">
                {evaluationNav.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="relative pb-4 border-b border-slate-600/30"
                    >
                      <span
                        className={`text-sm font-normal transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        {item.label}
                      </span>
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 z-10"></div>
                      )}
                    </Link>
                  )
                })}
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
          <div className="w-full bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
            {/* Header */}
            <div className="bg-white px-8 py-5 border-b border-slate-200">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">Bilan Détail</h2>
                  <p className="text-sm text-slate-600">Analysez les actifs corporels nets de votre entreprise</p>
                </div>
              </div>
            </div>

            {/* Table */}
            {balanceLoading ? (
              <div className="flex items-center justify-center h-64 bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            ) : balanceData.length === 0 ? (
              <div className="flex items-center justify-center h-64 bg-white">
                <p className="text-slate-400">
                  {companyId ? "Aucune donnée de bilan disponible" : "Sélectionnez une entreprise pour afficher le bilan"}
                </p>
              </div>
            ) : (
            <div className="overflow-x-auto bg-white">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm w-2/5">Compte</th>
                    <th className="px-4 py-4 text-right font-semibold text-slate-900 text-sm">{currentYear}</th>
                    <th className="px-4 py-4 text-right font-semibold text-slate-900 text-sm">Ajustements</th>
                    <th className="px-4 py-4 text-right font-semibold text-slate-900 text-sm">VCA</th>
                    <th className="px-4 py-4 text-right font-semibold text-slate-900 text-sm">Dettes</th>
                    <th className="px-4 py-4 text-right font-semibold text-slate-900 text-sm">Actifs</th>
                    <th className="px-4 py-4 text-right font-semibold text-slate-900 text-sm">ACN</th>
                  </tr>
                </thead>
                <tbody>
                  {balanceData.map((row, idx) => {
                    const isSpacer = row.label === ""
                    const shouldHideAmounts = isSpacer || !!row.isSection
                    const vca = calculateVCA(row)
                    const acn = calculateACN(row)
                    const nextRowIsSubtotal = idx < balanceData.length - 1 && balanceData[idx + 1].isSubtotal

                    return (
                      <tr
                        key={idx}
                        className={cn(
                          "border-b",
                          isSpacer ? "h-2 border-slate-200" : "",
                          nextRowIsSubtotal ? "border-slate-900 border-b-2" : "border-slate-200",
                          !isSpacer && !row.isSection && "hover:bg-slate-50"
                        )}
                      >
                        <td
                          className={cn(
                            "px-6 py-3",
                            row.isBold ? "font-bold text-slate-900" : "text-slate-700",
                            row.indent ? "pl-12" : ""
                          )}
                        >
                          {row.label}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {shouldHideAmounts ? (
                            <span className="text-slate-700">-</span>
                          ) : (
                            <span className={cn("text-sm", row.isBold && "font-semibold text-slate-900")}>
                              {formatCurrency(row.year2026)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {shouldHideAmounts ? (
                            <span className="text-slate-700">-</span>
                          ) : row.rowId ? (
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-sm text-slate-900">
                                {formatCurrency(row.adjustments)}
                              </span>
                              <button
                                onClick={() => openEditModal(row.rowId!, "adjustments")}
                                className={cn(
                                  "p-1 rounded hover:bg-slate-200 transition-colors relative",
                                  notes[`${row.rowId}-adjustments`] && notes[`${row.rowId}-adjustments`].trim().length > 0 && "text-blue-600"
                                )}
                                title={notes[`${row.rowId}-adjustments`] && notes[`${row.rowId}-adjustments`].trim().length > 0 ? "Modifier les ajustements et la note" : "Modifier les ajustements et ajouter une note"}
                              >
                                <Settings className="w-3.5 h-3.5" />
                                {notes[`${row.rowId}-adjustments`] && notes[`${row.rowId}-adjustments`].trim().length > 0 && (
                                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                    !
                                  </span>
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-900">
                              {formatCurrency(row.adjustments)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {shouldHideAmounts ? (
                            <span className="text-slate-700">-</span>
                          ) : (
                            <span className={cn("text-sm", row.isBold && "font-semibold text-slate-900")}>
                              {formatCurrency(vca)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {shouldHideAmounts ? (
                            <span className="text-slate-700">-</span>
                          ) : row.rowId ? (
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-sm text-slate-900">
                                {formatCurrency(row.debts)}
                              </span>
                              <button
                                onClick={() => openEditModal(row.rowId!, "debts")}
                                className={cn(
                                  "p-1 rounded hover:bg-slate-200 transition-colors relative",
                                  notes[`${row.rowId}-debts`] && notes[`${row.rowId}-debts`].trim().length > 0 && "text-blue-600"
                                )}
                                title={notes[`${row.rowId}-debts`] && notes[`${row.rowId}-debts`].trim().length > 0 ? "Modifier les dettes et la note" : "Modifier les dettes et ajouter une note"}
                              >
                                <Settings className="w-3.5 h-3.5" />
                                {notes[`${row.rowId}-debts`] && notes[`${row.rowId}-debts`].trim().length > 0 && (
                                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                    !
                                  </span>
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-900">
                              {formatCurrency(row.debts)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {shouldHideAmounts ? (
                            <span className="text-slate-700">-</span>
                          ) : row.rowId ? (
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-sm text-slate-900">
                                {formatCurrency(row.assets)}
                              </span>
                              <button
                                onClick={() => openEditModal(row.rowId!, "assets")}
                                className={cn(
                                  "p-1 rounded hover:bg-slate-200 transition-colors relative",
                                  notes[`${row.rowId}-assets`] && notes[`${row.rowId}-assets`].trim().length > 0 && "text-blue-600"
                                )}
                                title={notes[`${row.rowId}-assets`] && notes[`${row.rowId}-assets`].trim().length > 0 ? "Modifier les actifs et la note" : "Modifier les actifs et ajouter une note"}
                              >
                                <Settings className="w-3.5 h-3.5" />
                                {notes[`${row.rowId}-assets`] && notes[`${row.rowId}-assets`].trim().length > 0 && (
                                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                    !
                                  </span>
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-900">
                              {formatCurrency(row.assets)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {shouldHideAmounts ? (
                            <span className="text-slate-700">-</span>
                          ) : (
                            <span className={cn("text-sm", row.isBold && "font-semibold text-slate-900")}>
                              {formatCurrency(acn)}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {/* Totals Row */}
                  <tr className="border-t-2 border-slate-900 bg-slate-50">
                    <td className="px-6 py-3 font-bold text-slate-900">
                      Total
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-slate-900">-</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-slate-900">-</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-slate-900">-</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-slate-900">
                        {formatCurrency(totalDebts)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-slate-900">
                        {formatCurrency(totalAssets)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-slate-900">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Modifier {editingColumn === "adjustments" ? "les ajustements" : editingColumn === "debts" ? "les dettes" : "les actifs"}
            </DialogTitle>
            <DialogDescription>
              Modifiez la valeur pour {balanceData.find(r => r.rowId === editingRowId)?.label || ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                Valeur
              </label>
              <Input
                type="text"
                value={
                  modalValue === 0 ? "" : formatCurrency(modalValue).replace(/[^\d-]/g, "")
                }
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/[^\d-]/g, "")
                  const numValue = rawValue === "" || rawValue === "-" ? 0 : Number(rawValue)
                  setModalValue(numValue)
                }}
                onFocus={(e) => {
                  e.target.value = modalValue.toString()
                }}
                className="w-full text-center font-mono border-slate-300 focus:border-slate-500"
                placeholder="$0"
              />
              <p className="text-xs text-slate-500 mt-1">
                {editingColumn === "adjustments" 
                  ? "Définissez le montant des ajustements à appliquer."
                  : editingColumn === "debts"
                  ? "Définissez le montant des dettes à soustraire."
                  : "Définissez le montant des actifs à soustraire."}
              </p>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                Note
              </label>
              <Textarea
                value={modalNote}
                onChange={(e) => setModalNote(e.target.value)}
                placeholder="Ajoutez une note pour expliquer cette valeur..."
                className="min-h-[100px] border-slate-300 focus:border-slate-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Documentez votre raisonnement pour cette valeur.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModalOpen(false)
                setEditingRowId(null)
                setEditingColumn(null)
                setModalValue(0)
                setModalNote("")
              }}
            >
              Annuler
            </Button>
            <Button onClick={saveValue}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

