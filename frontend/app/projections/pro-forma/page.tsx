"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector, Company } from "@/components/entity-selector"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Filter, TrendingUp, TrendingDown, Calculator, CreditCard, BarChart3, Scale, Waves, Save, FolderOpen, X, Plus, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"
import { IncomeStatementDetail } from "@/components/income-statement-detail"
import { IncomeStatementSummary } from "@/components/income-statement-summary"
import { BalanceSheetDetail } from "@/components/balance-sheet-detail"
import { BalanceSheetSummary } from "@/components/balance-sheet-summary"
import { CashFlowDetail } from "@/components/cash-flow-detail"
import { CashFlowSummary } from "@/components/cash-flow-summary"
import { BaseSeasonalityDetail } from "@/components/base-seasonality-detail"
import { CapexForecastDetail } from "@/components/capex-forecast-detail"
import { DebtForecastDetail } from "@/components/debt-forecast-detail"
import { FDRForecastDetail } from "@/components/fdr-forecast-detail"

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

type ModuleType = "income-statement" | "balance-sheet" | "cash-flow" | "revenue" | "expenses" | "capex" | "debt" | "fdr"

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
    label: "Dettes",
    icon: CreditCard,
    description: "Structure de la dette",
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
  createdAt: string
  updatedAt: string
}

export default function ProFormaPage() {
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [divisionId, setDivisionId] = useState<string | null>(null)
  const [subDivisionId, setSubDivisionId] = useState<string | null>(null)
  const [selectedModule, setSelectedModule] = useState<ModuleType>("income-statement")
  const [section, setSection] = useState<"summary" | "detail">("detail")
  const [projectionYears, setProjectionYears] = useState<3 | 4 | 5>(5)
  const [projectionMode, setProjectionMode] = useState<"gl" | "account">("gl")
  const [savedProjections, setSavedProjections] = useState<SavedProjection[]>([])
  const [currentProjectionId, setCurrentProjectionId] = useState<string | null>(null)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [loadModalOpen, setLoadModalOpen] = useState(false)
  const [projectionName, setProjectionName] = useState("")
  const [initialModalOpen, setInitialModalOpen] = useState(false)
  const [initialModalMode, setInitialModalMode] = useState<"choice" | "create" | "load">("choice")
  const [newProjectionName, setNewProjectionName] = useState("")
  const [newProjectionCompanyId, setNewProjectionCompanyId] = useState<string | null>(null)
  const [newProjectionDivisionId, setNewProjectionDivisionId] = useState<string | null>(null)
  const [newProjectionSubDivisionId, setNewProjectionSubDivisionId] = useState<string | null>(null)
  const [newProjectionYears, setNewProjectionYears] = useState<3 | 4 | 5>(5)
  const [newProjectionMode, setNewProjectionMode] = useState<"gl" | "account">("gl")

  const selectedModuleData = allModules.find(m => m.id === selectedModule)
  const Icon = selectedModuleData?.icon || BarChart3

  // Load saved projections from localStorage and check for active projection
  useEffect(() => {
    const saved = localStorage.getItem("proFormaProjections")
    if (saved) {
      try {
        const projections = JSON.parse(saved) as SavedProjection[]
        setSavedProjections(projections)
        
        // Check if there's a current projection in localStorage
        const currentId = localStorage.getItem("currentProFormaProjectionId")
        if (currentId) {
          const projection = projections.find(p => p.id === currentId)
          if (projection) {
            // Load the projection
            setCompanyId(projection.companyId)
            setDivisionId(projection.divisionId)
            setSubDivisionId(projection.subDivisionId)
            setProjectionYears(projection.projectionYears)
            setProjectionMode(projection.projectionMode || "gl")
            setCurrentProjectionId(projection.id)
            // Don't show initial modal if projection is loaded
            setInitialModalOpen(false)
            return
          }
        }
      } catch (e) {
        console.error("Error loading saved projections:", e)
      }
    }
    
    // If no active projection, show initial modal
    setInitialModalOpen(true)
  }, [])

  // Save projections to localStorage whenever they change
  useEffect(() => {
    if (savedProjections.length > 0) {
      localStorage.setItem("proFormaProjections", JSON.stringify(savedProjections))
    }
  }, [savedProjections])

  const saveProjection = () => {
    if (!projectionName.trim()) return

    const projection: SavedProjection = {
      id: currentProjectionId || `projection-${Date.now()}`,
      name: projectionName.trim(),
      companyId,
      divisionId,
      subDivisionId,
      projectionYears,
      projectionMode: projectionMode,
      createdAt: currentProjectionId 
        ? savedProjections.find(p => p.id === currentProjectionId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (currentProjectionId) {
      // Update existing projection
      setSavedProjections(prev => prev.map(p => p.id === currentProjectionId ? projection : p))
    } else {
      // Add new projection
      setSavedProjections(prev => [...prev, projection])
      setCurrentProjectionId(projection.id)
      localStorage.setItem("currentProFormaProjectionId", projection.id)
    }

    setSaveModalOpen(false)
    setProjectionName("")
  }

  const loadProjection = (projection: SavedProjection) => {
    setCompanyId(projection.companyId)
    setDivisionId(projection.divisionId)
    setSubDivisionId(projection.subDivisionId)
    setProjectionYears(projection.projectionYears)
    setProjectionMode(projection.projectionMode || "gl")
    setCurrentProjectionId(projection.id)
    setLoadModalOpen(false)
    setInitialModalOpen(false)
    localStorage.setItem("currentProFormaProjectionId", projection.id)
  }

  const createNewProjection = () => {
    if (!newProjectionName.trim()) return

    const projection: SavedProjection = {
      id: `projection-${Date.now()}`,
      name: newProjectionName.trim(),
      companyId: newProjectionCompanyId,
      divisionId: newProjectionDivisionId,
      subDivisionId: newProjectionSubDivisionId,
      projectionYears: newProjectionYears,
      projectionMode: newProjectionMode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setSavedProjections(prev => [...prev, projection])
    loadProjection(projection)
    setNewProjectionName("")
    setNewProjectionCompanyId(null)
    setNewProjectionDivisionId(null)
    setNewProjectionSubDivisionId(null)
    setNewProjectionYears(5)
    setNewProjectionMode("gl")
    setInitialModalMode("choice")
  }

  const deleteProjection = (id: string) => {
    setSavedProjections(prev => prev.filter(p => p.id !== id))
    if (currentProjectionId === id) {
      setCurrentProjectionId(null)
      localStorage.removeItem("currentProFormaProjectionId")
      setInitialModalOpen(true)
      setInitialModalMode("choice")
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
  const period: "monthly" | "quarterly" | "annual" = (selectedModule === "revenue" || selectedModule === "expenses" || selectedModule === "capex" || selectedModule === "debt" || selectedModule === "fdr" || selectedModule === "income-statement" || selectedModule === "balance-sheet" || selectedModule === "cash-flow") ? "annual" : "monthly"
  const view: "current" | "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years" = (selectedModule === "revenue" || selectedModule === "expenses" || selectedModule === "capex" || selectedModule === "debt" || selectedModule === "fdr" || selectedModule === "income-statement" || selectedModule === "balance-sheet" || selectedModule === "cash-flow") ? "years" : "current"
  const columnMode: "variations" | "percentage" | "comparison" = "variations"

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <DashboardHeader
        title="Pro Forma"
        description="Générez vos états financiers pro forma basés sur vos projections et hypothèses"
        userName="Tristan Bellerose"
      />
      <main className="w-full py-8 px-6 max-w-[1920px] mx-auto">
        {/* Projection Details Bar - Only show if projection is active */}
        {currentProjectionId && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg mb-6 p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  {savedProjections.find(p => p.id === currentProjectionId)?.name || "Sans nom"}
                </span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">
                  Entité: <span className="font-medium text-slate-900">
                    {companyId 
                      ? companiesData.find(c => c.id === companyId)?.name || "N/A"
                      : "Toutes les sociétés"}
                    {divisionId && ` - ${companiesData.flatMap(c => c.divisions || []).find(d => d.id === divisionId)?.name || ""}`}
                    {subDivisionId && ` - ${companiesData.flatMap(c => c.divisions || []).flatMap(d => d.subDivisions || []).find(s => s.id === subDivisionId)?.name || ""}`}
                  </span>
                </span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">
                  Projection: <span className="font-medium text-slate-900">{projectionYears} ans</span>
                </span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">
                  Mode: <span className="font-medium text-slate-900">{projectionMode === "gl" ? "Par GL" : "Par Compte"}</span>
                </span>
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openNewProjectionModal}
                  className="h-8 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Nouveau scénario
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLoadModalOpen(true)}
                  className="h-8 text-xs"
                >
                  <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                  Charger
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openSaveModal}
                  className="h-8 text-xs"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Module Selector */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg mb-6 p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Filter Icon */}
            <div className="flex items-center gap-2 text-slate-600">
              <Filter className="w-4 h-4" />
            </div>

            {/* Separator */}
            <div className="h-6 w-px bg-slate-200" />

            {/* États financiers Section */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">États financiers:</span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                {financialStatementsModules.map((module) => {
                  const ModuleIcon = module.icon
                  const isActive = selectedModule === module.id
                  return (
                    <Button
                      key={module.id}
                      variant="ghost"
                      onClick={() => setSelectedModule(module.id)}
                      className={cn(
                        "h-8 text-xs px-3 transition-all",
                        isActive
                          ? "bg-slate-900 text-white font-medium shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <ModuleIcon className="w-3.5 h-3.5 mr-1.5" />
                      {module.label}
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Separator */}
            <div className="h-6 w-px bg-slate-200" />

             {/* View Toggle - only show for income-statement, balance-sheet, and cash-flow */}
             {(selectedModule === "income-statement" || selectedModule === "balance-sheet" || selectedModule === "cash-flow") && (
               <>
                 <div className="flex items-center gap-2">
                   <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Vue:</span>
                   <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                     <Button
                       variant="ghost"
                       onClick={() => setSection("summary")}
                       className={cn(
                         "h-8 text-xs px-3 transition-all",
                         section === "summary"
                           ? "bg-slate-900 text-white font-medium shadow-sm"
                           : "text-slate-600 hover:text-slate-900"
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
                           ? "bg-slate-900 text-white font-medium shadow-sm"
                           : "text-slate-600 hover:text-slate-900"
                       )}
                     >
                       Détail
                     </Button>
                   </div>
                 </div>
                 <div className="h-6 w-px bg-slate-200" />
               </>
             )}

            {/* Hypothèses Section */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Hypothèses:</span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                {assumptionsModules.map((module) => {
                  const ModuleIcon = module.icon
                  const isActive = selectedModule === module.id
                  return (
                    <Button
                      key={module.id}
                      variant="ghost"
                      onClick={() => setSelectedModule(module.id)}
                      className={cn(
                        "h-8 text-xs px-3 transition-all",
                        isActive
                          ? "bg-slate-900 text-white font-medium shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <ModuleIcon className="w-3.5 h-3.5 mr-1.5" />
                      {module.label}
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Module Content - Only show if projection is active */}
        {currentProjectionId && (
        <div className="space-y-6">
          {selectedModule === "revenue" ? (
            <div className="space-y-6">
              <IncomeStatementDetail
                period={period}
                view={view}
                columnMode={columnMode}
                companyId={companyId}
                divisionId={divisionId}
                subDivisionId={subDivisionId}
                companies={companiesData}
                title="Estimation des revenus annuels"
                projectionYears={projectionYears}
                projectionMode={projectionMode}
              />
              <BaseSeasonalityDetail
                companyId={companyId}
                divisionId={divisionId}
                subDivisionId={subDivisionId}
                companies={companiesData}
                title="Saisonnalité des revenus"
                projectionMode={projectionMode}
              />
            </div>
          ) : selectedModule === "expenses" ? (
            <IncomeStatementDetail
              period={period}
              view={view}
              columnMode={columnMode}
              companyId={companyId}
              divisionId={divisionId}
              subDivisionId={subDivisionId}
              companies={companiesData}
              title="Estimation des dépenses annuelles"
              projectionYears={projectionYears}
              projectionMode={projectionMode}
            />
          ) : selectedModule === "capex" ? (
            <CapexForecastDetail
              period={period}
              view={view}
              columnMode={columnMode}
              companyId={companyId}
              divisionId={divisionId}
              subDivisionId={subDivisionId}
              companies={companiesData}
              title="Estimation des Capex annuels"
              projectionYears={projectionYears}
              projectionMode={projectionMode}
            />
          ) : selectedModule === "debt" ? (
            <DebtForecastDetail
              period={period}
              view={view}
              columnMode={columnMode}
              companyId={companyId}
              divisionId={divisionId}
              subDivisionId={subDivisionId}
              companies={companiesData}
              title="Estimation des Dettes annuelles"
              projectionYears={projectionYears}
            />
          ) : selectedModule === "fdr" ? (
            <FDRForecastDetail
              period={period}
              view={view}
              columnMode={columnMode}
              companyId={companyId}
              divisionId={divisionId}
              subDivisionId={subDivisionId}
              companies={companiesData}
              title="Estimation du FDR annuel"
              projectionYears={projectionYears}
              projectionMode={projectionMode}
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
                companies={companiesData}
                title="États des résultats pro forma"
                projectionYears={projectionYears}
              />
            ) : (
              <IncomeStatementDetail
                period={period}
                view={view}
                columnMode={columnMode}
                companyId={companyId}
                divisionId={divisionId}
                subDivisionId={subDivisionId}
                companies={companiesData}
                title="États des résultats pro forma"
                projectionYears={projectionYears}
                projectionMode={projectionMode}
              />
            )
          ) : selectedModule === "balance-sheet" ? (
            section === "summary" ? (
              <BalanceSheetSummary
                period={period}
                view={view}
                columnMode={columnMode}
                companyId={companyId}
                divisionId={divisionId}
                subDivisionId={subDivisionId}
                companies={companiesData}
                title="Bilan pro forma"
              />
            ) : (
              <BalanceSheetDetail
                period={period}
                view={view}
                columnMode={columnMode}
                companyId={companyId}
                divisionId={divisionId}
                subDivisionId={subDivisionId}
                companies={companiesData}
                title="Bilan pro forma"
              />
            )
          ) : selectedModule === "cash-flow" ? (
            section === "summary" ? (
              <CashFlowSummary
                period={period}
                view={view}
                columnMode={columnMode}
                companyId={companyId}
                divisionId={divisionId}
                subDivisionId={subDivisionId}
                companies={companiesData}
                title="Flux de trésorerie pro forma"
              />
            ) : (
              <CashFlowDetail
                period={period}
                view={view}
                columnMode={columnMode}
                companyId={companyId}
                divisionId={divisionId}
                subDivisionId={subDivisionId}
                companies={companiesData}
                title="Flux de trésorerie pro forma"
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

                {/* Module-specific content */}
                <div className="mt-6">


                  {selectedModule === "capex" && (
                    <div className="p-8 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-center text-slate-600">
                        Contenu des projections de Capex à venir...
                      </p>
                    </div>
                  )}

                  {selectedModule === "debt" && (
                    <div className="p-8 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-center text-slate-600">
                        Contenu de la structure de la dette à venir...
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        )}

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
                {initialModalMode === "create" && "Configurez votre nouvelle projection financière en sélectionnant l'entité, le nombre d'années et en donnant un nom à votre projection."}
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
                    Entité
                  </label>
                  <EntitySelector
                    companies={companiesData}
                    selectedCompanyId={newProjectionCompanyId}
                    selectedDivisionId={newProjectionDivisionId}
                    selectedSubDivisionId={newProjectionSubDivisionId}
                    onCompanyChange={setNewProjectionCompanyId}
                    onDivisionChange={setNewProjectionDivisionId}
                    onSubDivisionChange={setNewProjectionSubDivisionId}
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
                    onClick={createNewProjection}
                    disabled={!newProjectionName.trim()}
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
                                  ? companiesData.find(c => c.id === projection.companyId)?.name || "N/A"
                                  : "Toutes les sociétés"}
                                {projection.divisionId && ` - ${companiesData.flatMap(c => c.divisions || []).find(d => d.id === projection.divisionId)?.name || ""}`}
                                {projection.subDivisionId && ` - ${companiesData.flatMap(c => c.divisions || []).flatMap(d => d.subDivisions || []).find(s => s.id === projection.subDivisionId)?.name || ""}`}
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
                                ? companiesData.find(c => c.id === projection.companyId)?.name || "N/A"
                                : "Toutes les sociétés"}
                            </p>
                            {projection.divisionId && (
                              <p>
                                Division: {companiesData
                                  .flatMap(c => c.divisions || [])
                                  .find(d => d.id === projection.divisionId)?.name || "N/A"}
                              </p>
                            )}
                            {projection.subDivisionId && (
                              <p>
                                Sous-division: {companiesData
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
                                deleteProjection(projection.id)
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
      </main>
    </div>
  )
}
