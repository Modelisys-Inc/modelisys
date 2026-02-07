"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector, Company } from "@/components/entity-selector"
import { Filter, Settings } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { formatCurrency } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const companiesData: Company[] = [
  {
    id: "company-1",
    name: "Société Principale",
    divisions: [
      {
        id: "div-1",
        name: "Division A",
        subDivisions: [
          { id: "subdiv-1", name: "Sous-division 1" },
          { id: "subdiv-2", name: "Sous-division 2" },
        ],
      },
    ],
  },
]

const evaluationNav = [
  { label: "Modèle d'affaires", href: "/evaluation/business-model" },
  { label: "Multiple du BAIIA", href: "/evaluation/ebitda-multiple" },
  { label: "Actif Corporel Net", href: "/evaluation/net-tangible-assets" },
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
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [divisionId, setDivisionId] = useState<string | null>(null)
  const [subDivisionId, setSubDivisionId] = useState<string | null>(null)
  const pathname = usePathname()

  // Get current year
  const currentYear = new Date().getFullYear()

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editingColumn, setEditingColumn] = useState<"adjustments" | "debts" | "assets" | null>(null)
  const [modalValue, setModalValue] = useState<number>(0)
  const [modalNote, setModalNote] = useState<string>("")

  // Notes storage: key = rowId-column -> note
  const [notes, setNotes] = useState<Record<string, string>>({})

  // Balance sheet data - using years view data structure
  const [balanceData, setBalanceData] = useState<BalanceRow[]>([
    { label: "ACTIFS", year2026: 0, adjustments: 0, debts: 0, assets: 0, isBold: true, isSection: true },
    { label: "ACTIFS COURANTS", year2026: 0, adjustments: 0, debts: 0, assets: 0, isBold: true, isSection: true },
    { label: "Trésorerie et équivalents", year2026: 2400000, adjustments: 0, debts: 0, assets: 0, indent: true, rowId: "cash" },
    { label: "Comptes clients", year2026: 4200000, adjustments: 0, debts: 0, assets: 0, indent: true, rowId: "receivables" },
    { label: "Stocks", year2026: 1800000, adjustments: 0, debts: 0, assets: 0, indent: true, rowId: "inventory" },
    { label: "Autres actifs courants", year2026: 1800000, adjustments: 0, debts: 0, assets: 0, indent: true, rowId: "other-current-assets" },
    { label: "Total Actifs courants", year2026: 10200000, adjustments: 0, debts: 0, assets: 0, isBold: true, isSubtotal: true },
    { label: "", year2026: 0, adjustments: 0, debts: 0, assets: 0 },
    { label: "Immobilisations corporelles", year2026: 9600000, adjustments: 0, debts: 0, assets: 0, rowId: "fixed-assets" },
    { label: "Immobilisations incorporelles", year2026: 3000000, adjustments: 0, debts: 0, assets: 0, rowId: "intangible-assets" },
    { label: "Autres actifs non courants", year2026: 1800000, adjustments: 0, debts: 0, assets: 0 },
    { label: "Total Actifs", year2026: 24600000, adjustments: 0, debts: 0, assets: 0, isBold: true, isSubtotal: true },
    { label: "", year2026: 0, adjustments: 0, debts: 0, assets: 0 },
    { label: "PASSIFS", year2026: 0, adjustments: 0, debts: 0, assets: 0, isBold: true, isSection: true },
    { label: "PASSIFS COURANTS", year2026: 0, adjustments: 0, debts: 0, assets: 0, isBold: true, isSection: true },
    { label: "Comptes fournisseurs", year2026: 2400000, adjustments: 0, debts: 0, assets: 0, indent: true, rowId: "payables" },
    { label: "Dettes à court terme", year2026: 1800000, adjustments: 0, debts: 0, assets: 0, indent: true, rowId: "short-term-debt" },
    { label: "Autres passifs courants", year2026: 1200000, adjustments: 0, debts: 0, assets: 0, indent: true },
    { label: "Total Passifs courants", year2026: 5400000, adjustments: 0, debts: 0, assets: 0, isBold: true, isSubtotal: true },
    { label: "", year2026: 0, adjustments: 0, debts: 0, assets: 0 },
    { label: "Dettes à long terme", year2026: 5400000, adjustments: 0, debts: 0, assets: 0, rowId: "long-term-debt" },
    { label: "Autres passifs non courants", year2026: 1800000, adjustments: 0, debts: 0, assets: 0 },
    { label: "Total Passifs", year2026: 12600000, adjustments: 0, debts: 0, assets: 0, isBold: true, isSubtotal: true },
    { label: "", year2026: 0, adjustments: 0, debts: 0, assets: 0 },
    { label: "Actif net", year2026: 12000000, adjustments: 0, debts: 0, assets: 0, isBold: true, isSubtotal: true, rowId: "net-assets" },
    { label: "", year2026: 0, adjustments: 0, debts: 0, assets: 0 },
    { label: "Total passifs et actif net", year2026: 24600000, adjustments: 0, debts: 0, assets: 0, isBold: true, isSubtotal: true },
  ])

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

  // Load notes from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storageKey = `net-tangible-assets-notes-${companyId || "all"}-${divisionId || "all"}-${subDivisionId || "all"}`
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          setNotes(JSON.parse(stored))
        }
      } catch (error) {
        console.error("Error loading notes:", error)
      }
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

    // Update value
    setBalanceData(prev => prev.map(row => {
      if (row.rowId === editingRowId) {
        return { ...row, [editingColumn]: modalValue }
      }
      return row
    }))

    // Update note
    const noteKey = `${editingRowId}-${editingColumn}`
    const updatedNotes = { ...notes, [noteKey]: modalNote }
    setNotes(updatedNotes)

    // Save to localStorage
    if (typeof window !== "undefined") {
      try {
        const storageKey = `net-tangible-assets-notes-${companyId || "all"}-${divisionId || "all"}-${subDivisionId || "all"}`
        localStorage.setItem(storageKey, JSON.stringify(updatedNotes))
      } catch (error) {
        console.error("Error saving notes:", error)
      }
    }

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
                  companies={companiesData}
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

