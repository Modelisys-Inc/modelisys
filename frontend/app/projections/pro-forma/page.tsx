"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { TrendingUp, TrendingDown, Calculator, CreditCard, BarChart3, Scale, Waves, Save, FolderOpen, X, Plus, Wallet, Percent } from "lucide-react"
import { cn } from "@/lib/utils"
import { IncomeStatementDetail } from "@/components/income-statement-detail"
import { IncomeStatementSummary } from "@/components/income-statement-summary"
import { BalanceSheetDetail } from "@/components/balance-sheet-detail"
import { CashFlowDetail } from "@/components/cash-flow-detail"
import { CashFlowSummary } from "@/components/cash-flow-summary"
import { CapexForecastDetail } from "@/components/capex-forecast-detail"
import { DebtForecastDetail } from "@/components/debt-forecast-detail"
import { TaxForecastDetail } from "@/components/tax-forecast-detail"
import { BILAN_HYPOTHESIS_TITLE } from "@/lib/bilan-forecast-utils"
import { TAX_FORECAST_TITLE } from "@/lib/tax-forecast-utils"
import { FDRForecastDetail } from "@/components/fdr-forecast-detail"
import { useCompanies } from "@/hooks/use-companies"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  listCompanies,
  listProjections,
  createProjection,
  updateProjection,
  deleteProjection as deleteProjectionApi,
  type ProjectionData,
} from "@/lib/api"

type ModuleType = "income-statement" | "balance-sheet" | "cash-flow" | "revenue" | "expenses" | "capex" | "debt" | "taxes" | "bilan" | "fdr"
type TopNav = "income-statement" | "balance-sheet" | "cash-flow" | "assumptions"
type AssumptionsNav = "revenue" | "expenses" | "capex" | "debt" | "taxes" | "bilan"

interface Module {
  id: ModuleType
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const financialStatementsModules: Module[] = [
  {
    id: "income-statement",
    label: "États des résultats",
    icon: BarChart3,
    description: "États des résultats pro forma",
  },
  {
    id: "balance-sheet",
    label: "Bilan",
    icon: Scale,
    description: "Bilan pro forma",
  },
  {
    id: "cash-flow",
    label: "Flux de trésorerie",
    icon: Waves,
    description: "Flux de trésorerie pro forma",
  },
]

const assumptionsModules: Module[] = [
  {
    id: "revenue",
    label: "Revenus",
    icon: TrendingUp,
    description: "Projections de revenus",
  },
  {
    id: "expenses",
    label: "Dépenses",
    icon: TrendingDown,
    description: "Projections de dépenses",
  },
  {
    id: "capex",
    label: "Capex",
    icon: Calculator,
    description: "Dépenses en capital",
  },
  {
    id: "debt",
    label: "Financement",
    icon: CreditCard,
    description: "Structure de financement",
  },
  {
    id: "taxes",
    label: "Impôts",
    icon: Percent,
    description: "Taux d'impôt applicable",
  },
  {
    id: "bilan",
    label: "Bilan",
    icon: Scale,
    description: "Ajustements du bilan",
  },
  {
    id: "fdr",
    label: "FDR",
    icon: Wallet,
    description: "Fonds de roulement",
  },
]

const allModules = [...financialStatementsModules, ...assumptionsModules]

interface SavedProjection {
  id: string
  name: string
  companyId: string | null
  divisionId: string | null
  subDivisionId: string | null
  projectionYears: 3 | 4 | 5
  projectionMode: "gl" | "account"
  projectionHorizon: "annual" | "monthly"
  startYear: number | null
  startMonth: number | null
  createdAt: string
  updatedAt: string
}

function mapApiProjection(p: ProjectionData): SavedProjection {
  return {
    id: p.id,
    name: p.name,
    companyId: p.company_id,
    divisionId: p.division_id,
    subDivisionId: p.sub_division_id,
    projectionYears: (p.projection_years as 3 | 4 | 5) || 5,
    projectionMode: (p.projection_mode as "gl" | "account") || "gl",
    projectionHorizon: ((p.projection_horizon as "annual" | "monthly") || "annual"),
    startYear: (p.start_year ?? null),
    startMonth: (p.start_month ?? null),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }
}

export default function ProFormaPage() {
  const { companies } = useCompanies()
  const searchParams = useSearchParams()
  const router = useRouter()
  const projectionIdFromUrl = searchParams.get("projectionId")
  const companyIdFromUrl = searchParams.get("companyId")
  const lockedCompanyId =
    companyIdFromUrl && companies.some((c) => c.id === companyIdFromUrl) ? companyIdFromUrl : null
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [divisionId, setDivisionId] = useState<string | null>(null)
  const [subDivisionId, setSubDivisionId] = useState<string | null>(null)
  const [selectedModule, setSelectedModule] = useState<ModuleType>("income-statement")
  const [topNav, setTopNav] = useState<TopNav>("income-statement")
  const [assumptionsNav, setAssumptionsNav] = useState<AssumptionsNav>("revenue")
  const [section, setSection] = useState<"summary" | "detail">("detail")
  const [projectionYears, setProjectionYears] = useState<3 | 4 | 5>(5)
  const [projectionMode, setProjectionMode] = useState<"gl" | "account">("gl")
  const [projectionHorizon, setProjectionHorizon] = useState<"annual" | "monthly">("annual")
  const [projectionStartYear, setProjectionStartYear] = useState<number | null>(null)
  const [projectionStartMonth, setProjectionStartMonth] = useState<number | null>(null)
  const [savedProjections, setSavedProjections] = useState<SavedProjection[]>([])
  const [currentProjectionId, setCurrentProjectionId] = useState<string | null>(null)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [loadModalOpen, setLoadModalOpen] = useState(false)
  const [projectionName, setProjectionName] = useState("")
  const [initialModalOpen, setInitialModalOpen] = useState(false)
  const [initialModalMode, setInitialModalMode] = useState<"choice" | "create" | "load">("choice")
  const [newProjectionName, setNewProjectionName] = useState("")
  const [newProjectionYears, setNewProjectionYears] = useState<3 | 4 | 5>(5)
  const [newProjectionMode, setNewProjectionMode] = useState<"gl" | "account">("gl")
  const [newProjectionStartYear, setNewProjectionStartYear] = useState<number>(() => new Date().getFullYear())
  const [newProjectionStartMonth, setNewProjectionStartMonth] = useState<number>(() => new Date().getMonth() + 1)
  const companyIdForCreate = lockedCompanyId || companies[0]?.id || null
  const startYearOptions = Array.from({ length: 9 }, (_, i) => new Date().getFullYear() - 2 + i)
  const monthOptions = [
    { value: 1, label: "Janvier" },
    { value: 2, label: "Février" },
    { value: 3, label: "Mars" },
    { value: 4, label: "Avril" },
    { value: 5, label: "Mai" },
    { value: 6, label: "Juin" },
    { value: 7, label: "Juillet" },
    { value: 8, label: "Août" },
    { value: 9, label: "Septembre" },
    { value: 10, label: "Octobre" },
    { value: 11, label: "Novembre" },
    { value: 12, label: "Décembre" },
  ]
  // Track which company the projections were loaded for
  const [loadedProjectionsCompanyId, setLoadedProjectionsCompanyId] = useState<string | null>(null)
  const [backDialogOpen, setBackDialogOpen] = useState(false)
  const [backPendingSave, setBackPendingSave] = useState(false)

  const selectedModuleData = allModules.find(m => m.id === selectedModule)
  const Icon = selectedModuleData?.icon || BarChart3

  // Load projections from API when companies are available
  useEffect(() => {
    if (companies.length === 0) return

    const loadAllProjections = async () => {
      try {
        const allProjections: SavedProjection[] = []
        for (const company of companies) {
          const projections = await listProjections(company.id)
          allProjections.push(...projections.map(mapApiProjection))
        }
        setSavedProjections(allProjections)

        // If we were deep-linked to a specific projection, auto-load it and skip the initial modal.
        if (projectionIdFromUrl && !currentProjectionId) {
          const found = allProjections.find((p) => p.id === projectionIdFromUrl)
          if (found) {
            setCompanyId(found.companyId)
            setDivisionId(found.divisionId)
            setSubDivisionId(found.subDivisionId)
            setProjectionYears(found.projectionYears)
            setProjectionMode(found.projectionMode || "gl")
            setProjectionHorizon(found.projectionHorizon || "annual")
            setProjectionStartYear(found.startYear ?? null)
            setProjectionStartMonth(found.startMonth ?? null)
            setCurrentProjectionId(found.id)
            setInitialModalOpen(false)
            setLoadModalOpen(false)
            return
          }
          // If projectionId is invalid, fall back to the normal flow (show initial modal).
        }

        if (allProjections.length > 0 && !currentProjectionId) {
          setInitialModalOpen(true)
        } else if (allProjections.length === 0) {
          setInitialModalOpen(true)
        }
      } catch (e) {
        console.error("Error loading projections:", e)
        setInitialModalOpen(true)
      }
    }

    loadAllProjections()
  }, [companies, projectionIdFromUrl, currentProjectionId])

  const saveProjection = async () => {
    if (!projectionName.trim()) return

    if (currentProjectionId) {
      // Update existing projection via API
      const existing = savedProjections.find(p => p.id === currentProjectionId)
      if (existing && existing.companyId) {
        try {
          const updated = await updateProjection(existing.companyId, currentProjectionId, {
            name: projectionName.trim(),
            projection_years: projectionYears,
            projection_mode: projectionMode,
          })
          const mapped = mapApiProjection(updated)
          setSavedProjections(prev => prev.map(p => p.id === currentProjectionId ? mapped : p))
        } catch (e) {
          console.error("Error updating projection:", e)
        }
      }
    } else if (companyId) {
      // Create new projection via API
      try {
        const created = await createProjection(companyId, {
          name: projectionName.trim(),
          projection_years: projectionYears,
          projection_mode: projectionMode,
          division_id: divisionId || null,
          sub_division_id: subDivisionId || null,
        })
        const mapped = mapApiProjection(created)
        setSavedProjections(prev => [...prev, mapped])
        setCurrentProjectionId(mapped.id)
      } catch (e) {
        console.error("Error creating projection:", e)
      }
    }

    setSaveModalOpen(false)
    setProjectionName("")

    if (backPendingSave) {
      setBackPendingSave(false)
      router.push("/projections")
    }
  }

  const loadProjection = (projection: SavedProjection) => {
    setCompanyId(projection.companyId)
    setDivisionId(projection.divisionId)
    setSubDivisionId(projection.subDivisionId)
    setProjectionYears(projection.projectionYears)
    setProjectionMode(projection.projectionMode || "gl")
    setProjectionHorizon(projection.projectionHorizon || "annual")
    setProjectionStartYear(projection.startYear ?? null)
    setProjectionStartMonth(projection.startMonth ?? null)
    setCurrentProjectionId(projection.id)
    setLoadModalOpen(false)
    setInitialModalOpen(false)
  }

  // Allow deep-linking directly to a saved projection
  useEffect(() => {
    if (!projectionIdFromUrl) return
    if (savedProjections.length === 0) return
    if (currentProjectionId === projectionIdFromUrl) return
    const found = savedProjections.find((p) => p.id === projectionIdFromUrl)
    if (!found) return
    loadProjection(found)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectionIdFromUrl, savedProjections])

  const handleCreateNewProjection = async () => {
    if (!newProjectionName.trim() || !companyIdForCreate) return

    try {
      const created = await createProjection(companyIdForCreate, {
        name: newProjectionName.trim(),
        projection_years: newProjectionYears,
        projection_mode: newProjectionMode,
        projection_horizon: "annual",
        start_year: newProjectionStartYear,
        start_month: newProjectionStartMonth,
        division_id: null,
        sub_division_id: null,
      })
      const mapped = mapApiProjection(created)
      setSavedProjections(prev => [...prev, mapped])
      loadProjection(mapped)
      setNewProjectionName("")
      setNewProjectionYears(5)
      setNewProjectionMode("gl")
      setNewProjectionStartYear(new Date().getFullYear())
      setNewProjectionStartMonth(new Date().getMonth() + 1)
      setInitialModalMode("choice")
    } catch (e) {
      console.error("Error creating projection:", e)
    }
  }

  const handleDeleteProjection = async (id: string) => {
    const projection = savedProjections.find(p => p.id === id)
    if (projection && projection.companyId) {
      try {
        await deleteProjectionApi(projection.companyId, id)
        setSavedProjections(prev => prev.filter(p => p.id !== id))
        if (currentProjectionId === id) {
          setCurrentProjectionId(null)
          setInitialModalOpen(true)
          setInitialModalMode("choice")
        }
      } catch (e) {
        console.error("Error deleting projection:", e)
      }
    }
  }

  const openSaveModal = () => {
    const currentProjection = currentProjectionId
      ? savedProjections.find(p => p.id === currentProjectionId)
      : null
    setProjectionName(currentProjection?.name || "")
    setSaveModalOpen(true)
  }

  const openNewProjectionModal = () => {
    setNewProjectionName("")
    setNewProjectionCompanyId(null)
    setNewProjectionDivisionId(null)
    setNewProjectionSubDivisionId(null)
    setNewProjectionYears(5)
    setInitialModalMode("create")
    setInitialModalOpen(true)
  }

  // Default values for IncomeStatementDetail, BalanceSheetDetail, and CashFlowDetail
  // For revenue, expenses, capex, debt, fdr, income-statement, balance-sheet, and cash-flow, use annual years view
  const period: "monthly" | "quarterly" | "annual" = (selectedModule === "revenue" || selectedModule === "expenses" || selectedModule === "capex" || selectedModule === "debt" || selectedModule === "taxes" || selectedModule === "bilan" || selectedModule === "fdr" || selectedModule === "income-statement" || selectedModule === "balance-sheet" || selectedModule === "cash-flow") ? "annual" : "monthly"
  const view: "current" | "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years" = (selectedModule === "revenue" || selectedModule === "expenses" || selectedModule === "capex" || selectedModule === "debt" || selectedModule === "taxes" || selectedModule === "bilan" || selectedModule === "fdr" || selectedModule === "income-statement" || selectedModule === "balance-sheet" || selectedModule === "cash-flow") ? "years" : "current"
  // In projections, we display amounts (not variations) by default.
  const columnMode = "comparison" as const
  const isFinancialStatementModule =
    selectedModule === "income-statement" || selectedModule === "balance-sheet" || selectedModule === "cash-flow"
  const isAssumptions = topNav === "assumptions"
  const monthLabel = (m: number | null) => {
    if (!m) return null
    const labels = [
      "Janvier",
      "Février",
      "Mars",
      "Avril",
      "Mai",
      "Juin",
      "Juillet",
      "Août",
      "Septembre",
      "Octobre",
      "Novembre",
      "Décembre",
    ]
    return labels[m - 1] ?? null
  }

  const setFinancialStatementModule = (m: Exclude<TopNav, "assumptions">) => {
    setTopNav(m)
    setSelectedModule(m)
    // Bilan pro forma : Sommaire seulement (pas de vue Détail).
    if (m === "balance-sheet") setSection("summary")
  }

  const setAssumptionsModule = (m: AssumptionsNav) => {
    setTopNav("assumptions")
    setAssumptionsNav(m)
    setSelectedModule(m)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <DashboardHeader title="Modelisys" />
      {/* Section sombre (comme income-statement) */}
      <div className="relative w-full pt-15 pb-44 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
            <div className="bg-[#2A2F3A]" />
            <div className="bg-[#2A2F3A]" />
          </div>
          <div className="absolute inset-y-0 left-1/2 hidden lg:block w-px bg-white/5" />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -left-28 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-24 -right-28 h-[480px] w-[480px] rounded-full bg-black/20 blur-3xl" />
          </div>
        </div>
        <div className="relative z-10 max-w-[1920px] mx-auto px-6">
          <div className="flex items-start mb-4">
            {/* Espace équivalent au bouton menu du header pour l'alignement */}
            <div className="w-2 flex-shrink-0" />
            <div className="flex-1">
              <div className="mb-2">
                <h2 className="text-4xl font-semibold tracking-tight text-[#E6D6C3]">Pro Forma</h2>
              </div>
              <p className="text-base text-[#C9B8A5]/90 mb-6">
                Générez vos états financiers pro forma basés sur vos projections et hypothèses
              </p>

              {/* Menu principal (Résultats / Bilan / Trésorerie / Hypothèses) — style income-statement */}
              <div className="flex flex-wrap items-end gap-2 mb-2">
                <div className="flex flex-wrap items-end gap-8">
                  {[
                    { id: "income-statement" as const, label: "Résultats" },
                    { id: "balance-sheet" as const, label: "Bilan" },
                    { id: "cash-flow" as const, label: "Trésorerie" },
                  ].map((item) => {
                    const isActive = topNav === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFinancialStatementModule(item.id)}
                        className={cn(
                          "relative inline-block rounded-md px-3 py-1.5 -mx-1 pb-4 border-b border-slate-600/30 text-sm font-normal text-slate-200 transition-colors",
                          !isActive ? "hover:bg-white/5 hover:text-slate-100" : "hover:bg-white/[0.04]"
                        )}
                      >
                        {item.label}
                        {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E0742D] z-10" />}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => setAssumptionsModule("revenue")}
                    className={cn(
                      "relative inline-block rounded-md px-3 py-1.5 -mx-1 pb-4 border-b border-slate-600/30 text-sm font-normal text-slate-200 transition-colors",
                      topNav !== "assumptions" ? "hover:bg-white/5 hover:text-slate-100" : "hover:bg-white/[0.04]"
                    )}
                  >
                    Hypothèses
                    {topNav === "assumptions" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E0742D] z-10" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Barre de contrôle (Vue + Hypothèses) — style income-statement */}
          <div className="mb-6">
            <div className="rounded-2xl border border-white/10 bg-[#2A2F3A]/45 px-3 py-3 backdrop-blur-sm sm:px-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* États financiers: Vue (Sommaire / Détail) — pas de Détail pour Bilan pro forma */}
                {!isAssumptions && isFinancialStatementModule && selectedModule !== "balance-sheet" && (
                  <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-[10px] border border-white/10 bg-[#2A2F3A]/70 p-1 backdrop-blur-sm">
                      <Button
                        variant="ghost"
                        onClick={() => setSection("summary")}
                        className={cn(
                          "h-8 text-xs px-3 transition-all",
                          section === "summary"
                            ? "bg-[#E0742D] text-white font-medium shadow-sm hover:bg-[#c96526]"
                            : "text-[#C9B8A5]/90 hover:bg-white/5 hover:text-[#E6D6C3]"
                        )}
                      >
                        Sommaire
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setSection("detail")}
                        className={cn(
                          "h-8 text-xs px-3 transition-all",
                          section === "detail"
                            ? "bg-[#E0742D] text-white font-medium shadow-sm hover:bg-[#c96526]"
                            : "text-[#C9B8A5]/90 hover:bg-white/5 hover:text-[#E6D6C3]"
                        )}
                      >
                        Détail
                      </Button>
                    </div>
                  </div>
                )}

                {/* Hypothèses: sous-menu (Revenus / Dépenses / Capex / Financement / Impôts / Bilan) */}
                {isAssumptions && (
                  <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-[10px] border border-white/10 bg-[#2A2F3A]/70 p-1 backdrop-blur-sm">
                      {[
                        { id: "revenue" as const, label: "Revenus" },
                        { id: "expenses" as const, label: "Dépenses" },
                        { id: "capex" as const, label: "Capex" },
                        { id: "debt" as const, label: "Financement" },
                        { id: "taxes" as const, label: "Impôts" },
                        { id: "bilan" as const, label: "Bilan" },
                      ].map((item) => {
                        const isActive = assumptionsNav === item.id
                        return (
                          <Button
                            key={item.id}
                            variant="ghost"
                            onClick={() => setAssumptionsModule(item.id)}
                            className={cn(
                              "h-8 text-xs px-3 transition-all",
                              isActive
                                ? "bg-[#E0742D] text-white font-medium shadow-sm hover:bg-[#c96526]"
                                : "text-[#C9B8A5]/90 hover:bg-white/5 hover:text-[#E6D6C3]"
                            )}
                          >
                            {item.label}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="w-full py-8 px-6 max-w-[1920px] mx-auto">
        <div className="relative -mt-44">
        {/* Séparateur (comme Notes) entre la barre sombre et le scénario */}
        <div className="mb-4 h-px w-full bg-gradient-to-r from-[#E0742D]/80 via-white/15 to-transparent" />
        {/* Projection Details Bar - Only show if projection is active */}
        {currentProjectionId && (
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-3">
              {/* Scénario */}
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-[#E0742D]" aria-hidden />
                <div className="text-sm font-semibold text-[#E6D6C3]">
                  {savedProjections.find((p) => p.id === currentProjectionId)?.name || "Sans nom"}
                </div>
              </div>

              <div className="hidden sm:block h-8 w-px bg-white/10" />

              {/* Métadonnées — sans cartes */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/70">
                <div className="whitespace-nowrap">
                  <span className="text-white/50">Entité</span>{" "}
                  <span className="font-medium text-slate-100">
                    {companyId ? companies.find((c) => c.id === companyId)?.name || "N/A" : "Toutes les sociétés"}
                    {divisionId &&
                      ` - ${companies.flatMap((c) => c.divisions || []).find((d) => d.id === divisionId)?.name || ""}`}
                    {subDivisionId &&
                      ` - ${
                        companies
                          .flatMap((c) => c.divisions || [])
                          .flatMap((d) => d.subDivisions || [])
                          .find((s) => s.id === subDivisionId)?.name || ""
                      }`}
                  </span>
                </div>
                <div className="hidden md:block h-4 w-px bg-white/10" />
                <div className="whitespace-nowrap">
                  <span className="text-white/50">Projection</span>{" "}
                  <span className="font-medium text-slate-100">{projectionYears} ans</span>
                </div>
                <div className="hidden md:block h-4 w-px bg-white/10" />
                <div className="whitespace-nowrap">
                  <span className="text-white/50">Date de référence</span>{" "}
                  <span className="font-medium text-slate-100">
                    {projectionStartYear
                      ? `${monthLabel(projectionStartMonth) ?? "—"} ${projectionStartYear}`
                      : "—"}
                  </span>
                </div>
              </div>

              <div className="flex-1" />

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBackDialogOpen(true)}
                  className="h-9 text-xs border-white/15 bg-transparent text-[#E6D6C3] hover:bg-white/5 hover:text-white"
                >
                  Retour aux scénarios
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Module Content - Only show if projection is active */}
        {currentProjectionId && (
        <div className="space-y-6">
          {selectedModule === "revenue" ? (
            <IncomeStatementDetail
              period={period}
              view={view}
              columnMode={columnMode}
              companyId={companyId}
              divisionId={divisionId}
              subDivisionId={subDivisionId}
              companies={companies}
              title="Estimation des revenus annuels"
              fiscalYear={projectionStartYear ?? undefined}
              referenceMonth={projectionStartMonth ?? undefined}
              forceForecastSection
              forecastBaseYear={projectionStartYear ?? undefined}
              forecastUseSeriesActuals
              forecastActualLayout="nMinusOne-and-ytd"
              projectionYears={projectionYears}
              projectionMode={projectionMode}
              projectionId={currentProjectionId}
            />
          ) : selectedModule === "expenses" ? (
            <IncomeStatementDetail
              period={period}
              view={view}
              columnMode={columnMode}
              companyId={companyId}
              divisionId={divisionId}
              subDivisionId={subDivisionId}
              companies={companies}
              title="Estimation des dépenses annuelles"
              fiscalYear={projectionStartYear ?? undefined}
              referenceMonth={projectionStartMonth ?? undefined}
              forceForecastSection
              forecastBaseYear={projectionStartYear ?? undefined}
              forecastUseSeriesActuals
              forecastActualLayout="nMinusOne-and-ytd"
              projectionYears={projectionYears}
              projectionMode={projectionMode}
              projectionId={currentProjectionId}
            />
          ) : selectedModule === "capex" ? (
            <CapexForecastDetail
              period={period}
              view={view}
              columnMode={columnMode}
              companyId={companyId}
              divisionId={divisionId}
              subDivisionId={subDivisionId}
              companies={companies}
              title="Estimation des Capex annuels"
              fiscalYear={projectionStartYear ?? undefined}
              refMonth={projectionStartMonth ?? new Date().getMonth() + 1}
              forecastBaseYear={projectionStartYear ?? undefined}
              forecastUseSeriesActuals
              forecastActualLayout="nMinusOne-and-ytd"
              projectionYears={projectionYears}
              projectionMode={projectionMode}
              projectionId={currentProjectionId}
            />
          ) : selectedModule === "debt" ? (
            <DebtForecastDetail
              period={period}
              view={view}
              columnMode={columnMode}
              companyId={companyId}
              divisionId={divisionId}
              subDivisionId={subDivisionId}
              companies={companies}
              title="Estimation du Financement annuel"
              projectionYears={projectionYears}
              projectionId={currentProjectionId}
              forecastBaseYear={projectionStartYear ?? undefined}
              fiscalYear={
                projectionHorizon === "annual" && projectionStartYear
                  ? projectionStartYear - 1
                  : projectionStartYear ?? undefined
              }
              referenceMonth={projectionStartMonth ?? undefined}
              projectionHorizon={projectionHorizon}
            />
          ) : selectedModule === "taxes" ? (
            <TaxForecastDetail
              companyId={companyId}
              divisionId={divisionId}
              subDivisionId={subDivisionId}
              companies={companies}
              title={TAX_FORECAST_TITLE}
              projectionId={currentProjectionId}
              projectionYears={projectionYears}
            />
          ) : selectedModule === "bilan" ? (
            <BalanceSheetDetail
              period={period}
              view={view}
              columnMode={columnMode}
              companyId={companyId}
              divisionId={divisionId}
              subDivisionId={subDivisionId}
              companies={companies}
              title={BILAN_HYPOTHESIS_TITLE}
              fiscalYear={projectionStartYear ?? undefined}
              refMonth={projectionStartMonth ?? new Date().getMonth() + 1}
              refYear={projectionStartYear ?? new Date().getFullYear()}
              projectionYears={projectionYears}
              forecastBaseYear={projectionStartYear ?? undefined}
              forecastUseSeriesActuals
              forecastActualLayout="nMinusOne-and-ytd"
              disableRowInteractions
              projectionId={currentProjectionId}
            />
          ) : selectedModule === "fdr" ? (
            <FDRForecastDetail
              period={period}
              view={view}
              columnMode={columnMode}
              companyId={companyId}
              divisionId={divisionId}
              subDivisionId={subDivisionId}
              companies={companies}
              title="Estimation du FDR annuel"
              projectionYears={projectionYears}
              projectionMode={projectionMode}
              projectionId={currentProjectionId}
            />
            ) : selectedModule === "income-statement" ? (
            section === "summary" ? (
              <IncomeStatementSummary
                period={period}
                view={view}
                columnMode={columnMode}
                companyId={companyId}
                divisionId={divisionId}
                subDivisionId={subDivisionId}
                companies={companies}
                title="États des résultats pro forma"
                projectionYears={projectionYears}
                projectionId={currentProjectionId}
                fiscalYear={projectionStartYear ?? undefined}
                referenceMonth={projectionStartMonth ?? undefined}
                forceForecastSection
                forecastBaseYear={projectionStartYear ?? undefined}
                forecastUseSeriesActuals
                forecastActualLayout="nMinusOne-and-ytd"
              />
            ) : (
              <IncomeStatementDetail
                period={period}
                view={view}
                columnMode={columnMode}
                companyId={companyId}
                divisionId={divisionId}
                subDivisionId={subDivisionId}
                companies={companies}
                title="États des résultats pro forma"
                hideHeaderIcon
                disableRowInteractions
                fiscalYear={projectionStartYear ?? undefined}
                referenceMonth={projectionStartMonth ?? undefined}
                forceForecastSection
                forecastBaseYear={projectionStartYear ?? undefined}
                forecastUseSeriesActuals
                forecastActualLayout="nMinusOne-and-ytd"
                projectionYears={projectionYears}
                projectionMode={projectionMode}
                projectionId={currentProjectionId}
              />
            )
          ) : selectedModule === "balance-sheet" ? (
              <BalanceSheetDetail
                period={period}
                view={view}
                columnMode={columnMode}
                companyId={companyId}
                divisionId={divisionId}
                subDivisionId={subDivisionId}
                companies={companies}
                title="Bilan pro forma"
                fiscalYear={projectionStartYear ?? undefined}
                refMonth={projectionStartMonth ?? new Date().getMonth() + 1}
                refYear={projectionStartYear ?? new Date().getFullYear()}
                projectionYears={projectionYears}
                forecastBaseYear={projectionStartYear ?? undefined}
                forecastUseSeriesActuals
                forecastActualLayout="nMinusOne-and-ytd"
                disableRowInteractions
                projectionId={currentProjectionId}
                forceBilanHypothesisAmounts
              />
          ) : selectedModule === "cash-flow" ? (
            section === "summary" ? (
              <CashFlowSummary
                period={period}
                view={view}
                columnMode={columnMode}
                companyId={companyId}
                divisionId={divisionId}
                subDivisionId={subDivisionId}
                companies={companies}
                title="Flux de trésorerie pro forma"
                fiscalYear={projectionStartYear ?? undefined}
                refMonth={projectionStartMonth ?? new Date().getMonth() + 1}
                refYear={projectionStartYear ?? new Date().getFullYear()}
                projectionYears={projectionYears}
                forecastBaseYear={projectionStartYear ?? undefined}
                forecastUseSeriesActuals
                forecastActualLayout="nMinusOne-and-ytd"
                projectionId={currentProjectionId}
                disableRowInteractions
              />
            ) : (
              <CashFlowDetail
                period={period}
                view={view}
                columnMode={columnMode}
                companyId={companyId}
                divisionId={divisionId}
                subDivisionId={subDivisionId}
                companies={companies}
                title="Flux de trésorerie pro forma"
                fiscalYear={projectionStartYear ?? undefined}
                refMonth={projectionStartMonth ?? new Date().getMonth() + 1}
                refYear={projectionStartYear ?? new Date().getFullYear()}
                projectionYears={projectionYears}
                forecastBaseYear={projectionStartYear ?? undefined}
                forecastUseSeriesActuals
                forecastActualLayout="nMinusOne-and-ytd"
                projectionId={currentProjectionId}
                disableRowInteractions
              />
            )
          ) : (
            <Card className="bg-white border-slate-200 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-slate-800">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedModuleData?.label}</h2>
                    <p className="text-sm text-slate-600">{selectedModuleData?.description}</p>
                  </div>
                </div>

                {/* Module-specific content placeholder removed — components render above */}
              </CardContent>
            </Card>
          )}
        </div>
        )}
        </div>

        {/* Initial Modal - Load or Create Projection */}
        <Dialog open={initialModalOpen} onOpenChange={(open) => {
          // Don't allow closing if no projection is active
          if (!open && !currentProjectionId) {
            return
          }
          setInitialModalOpen(open)
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {initialModalMode === "choice" && "Démarrer une projection financière"}
                {initialModalMode === "create" && "Créer une nouvelle projection"}
                {initialModalMode === "load" && "Charger une projection"}
              </DialogTitle>
              <DialogDescription>
                {initialModalMode === "choice" && "Choisissez de charger une projection existante ou de créer une nouvelle projection financière."}
                {initialModalMode === "create" && "Donnez un nom, le nombre d’années et la date de référence. La projection est annuelle, avec une vue mensuelle possible ensuite."}
                {initialModalMode === "load" && "Sélectionnez une projection sauvegardée à charger."}
              </DialogDescription>
            </DialogHeader>

            {initialModalMode === "choice" && (
              <div className="mt-6 space-y-4">
                <Button
                  onClick={() => setInitialModalMode("load")}
                  className="w-full h-16 text-left justify-start"
                  variant="outline"
                >
                  <div className="flex items-center gap-4 w-full">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <FolderOpen className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-slate-900">Charger une projection financière</div>
                      <div className="text-sm text-slate-600">Ouvrir une projection existante</div>
                    </div>
                  </div>
                </Button>
                <Button
                  onClick={() => setInitialModalMode("create")}
                  className="w-full h-16 text-left justify-start"
                  variant="outline"
                >
                  <div className="flex items-center gap-4 w-full">
                    <div className="p-3 bg-emerald-100 rounded-lg">
                      <Save className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-slate-900">Créer une nouvelle projection financière</div>
                      <div className="text-sm text-slate-600">Démarrer une nouvelle projection</div>
                    </div>
                  </div>
                </Button>
              </div>
            )}

            {initialModalMode === "create" && (
              <div className="mt-6 space-y-6">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Nom de la projection
                  </label>
                  <Input
                    value={newProjectionName}
                    onChange={(e) => setNewProjectionName(e.target.value)}
                    placeholder="Ex: Scénario réaliste, Scénario optimiste..."
                    className="w-full"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Nombre d'années de projection
                  </label>
                  <Select
                    value={newProjectionYears.toString()}
                    onValueChange={(value) => setNewProjectionYears(parseInt(value) as 3 | 4 | 5)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 ans</SelectItem>
                      <SelectItem value="4">4 ans</SelectItem>
                      <SelectItem value="5">5 ans</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Mois de référence
                    </label>
                    <Select
                      value={String(newProjectionStartMonth)}
                      onValueChange={(value) => setNewProjectionStartMonth(parseInt(value))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((m) => (
                          <SelectItem key={m.value} value={String(m.value)}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Année de référence
                    </label>
                    <Select
                      value={String(newProjectionStartYear)}
                      onValueChange={(value) => setNewProjectionStartYear(parseInt(value))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {startYearOptions.map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Mode de projection
                  </label>
                  <Select
                    value={newProjectionMode}
                    onValueChange={(value) => setNewProjectionMode(value as "gl" | "account")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gl">Par GL (Grand Livre)</SelectItem>
                      <SelectItem value="account">Par Compte</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    {newProjectionMode === "gl" 
                      ? "Les ajustements se font au niveau des comptes GL individuels (ex: 4000, 4010)"
                      : "Les ajustements se font au niveau des comptes agrégés (ex: Ventes - Services professionnels)"}
                  </p>
                </div>

                <DialogFooter className="mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setInitialModalMode("choice")}
                  >
                    Retour
                  </Button>
                  <Button
                    onClick={handleCreateNewProjection}
                    disabled={!newProjectionName.trim() || !companyIdForCreate}
                  >
                    Créer la projection
                  </Button>
                </DialogFooter>
              </div>
            )}

            {initialModalMode === "load" && (
              <div className="mt-6 max-h-[60vh] overflow-y-auto">
                {savedProjections.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <FolderOpen className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                    <p>Aucune projection sauvegardée</p>
                    <p className="text-sm mt-1">Créez une nouvelle projection pour commencer</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedProjections.map((projection) => (
                      <div
                        key={projection.id}
                        className="p-4 rounded-lg border-2 border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => loadProjection(projection)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 mb-1">{projection.name}</h3>
                            <div className="text-xs text-slate-600 space-y-1">
                              <p>
                                Entité: {projection.companyId 
                                  ? companies.find(c => c.id === projection.companyId)?.name || "N/A"
                                  : "Toutes les sociétés"}
                                {projection.divisionId && ` - ${companies.flatMap(c => c.divisions || []).find(d => d.id === projection.divisionId)?.name || ""}`}
                                {projection.subDivisionId && ` - ${companies.flatMap(c => c.divisions || []).flatMap(d => d.subDivisions || []).find(s => s.id === projection.subDivisionId)?.name || ""}`}
                              </p>
                              <p>Projection: {projection.projectionYears} ans</p>
                              <p className="text-slate-500">
                                Modifié: {new Date(projection.updatedAt).toLocaleDateString("fr-FR", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <DialogFooter className="mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setInitialModalMode("choice")}
                  >
                    Retour
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Save Projection Modal */}
        <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {currentProjectionId ? "Enregistrer la projection" : "Sauvegarder la projection"}
              </DialogTitle>
              <DialogDescription>
                {currentProjectionId 
                  ? "Mettez à jour le nom de votre projection ou enregistrez les modifications."
                  : "Donnez un nom à votre projection pour pouvoir la charger plus tard (ex: Scénario réaliste, Scénario optimiste, etc.)."}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Nom de la projection
              </label>
              <Input
                value={projectionName}
                onChange={(e) => setProjectionName(e.target.value)}
                placeholder="Ex: Scénario réaliste, Scénario optimiste..."
                className="w-full"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && projectionName.trim()) {
                    saveProjection()
                  }
                }}
              />
            </div>
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setSaveModalOpen(false)
                  setProjectionName("")
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={saveProjection}
                disabled={!projectionName.trim()}
              >
                {currentProjectionId ? "Enregistrer" : "Sauvegarder"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Load Projection Modal */}
        <Dialog open={loadModalOpen} onOpenChange={setLoadModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Charger une projection</DialogTitle>
              <DialogDescription>
                Sélectionnez une projection sauvegardée pour charger sa configuration.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 max-h-[60vh] overflow-y-auto">
              {savedProjections.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <FolderOpen className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                  <p>Aucune projection sauvegardée</p>
                  <p className="text-sm mt-1">Créez une nouvelle projection en cliquant sur "Sauvegarder"</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedProjections.map((projection) => (
                    <div
                      key={projection.id}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md",
                        currentProjectionId === projection.id
                          ? "border-slate-900 bg-slate-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                      onClick={() => loadProjection(projection)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 mb-1">{projection.name}</h3>
                          <div className="text-xs text-slate-600 space-y-1">
                            <p>
                              Entité: {projection.companyId 
                                ? companies.find(c => c.id === projection.companyId)?.name || "N/A"
                                : "Toutes les sociétés"}
                            </p>
                            {projection.divisionId && (
                              <p>
                                Division: {companies
                                  .flatMap(c => c.divisions || [])
                                  .find(d => d.id === projection.divisionId)?.name || "N/A"}
                              </p>
                            )}
                            {projection.subDivisionId && (
                              <p>
                                Sous-division: {companies
                                  .flatMap(c => c.divisions || [])
                                  .flatMap(d => d.subDivisions || [])
                                  .find(s => s.id === projection.subDivisionId)?.name || "N/A"}
                              </p>
                            )}
                            <p>Projection: {projection.projectionYears} ans</p>
                            <p className="text-slate-500">
                              Modifié: {new Date(projection.updatedAt).toLocaleDateString("fr-FR", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {currentProjectionId === projection.id && (
                            <span className="text-xs font-medium text-slate-600 bg-slate-200 px-2 py-1 rounded">
                              Actif
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm(`Êtes-vous sûr de vouloir supprimer la projection "${projection.name}" ?`)) {
                                handleDeleteProjection(projection.id)
                              }
                            }}
                            className="p-1.5 rounded-md hover:bg-red-50 text-red-600 transition-colors"
                            title="Supprimer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => setLoadModalOpen(false)}
              >
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={backDialogOpen} onOpenChange={setBackDialogOpen}>
          <AlertDialogContent className="sm:max-w-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Retour aux scénarios</AlertDialogTitle>
              <AlertDialogDescription>
                Voulez-vous enregistrer les modifications avant de retourner à la liste des scénarios ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setBackPendingSave(false)
                }}
              >
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  setBackPendingSave(false)
                  setBackDialogOpen(false)
                  router.push("/projections")
                }}
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                Quitter sans enregistrer
              </AlertDialogAction>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  setBackDialogOpen(false)
                  setBackPendingSave(true)
                  openSaveModal()
                }}
                className="bg-[#E0742D] text-white hover:bg-[#c96526]"
              >
                Enregistrer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}
