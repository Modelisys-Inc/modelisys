"use client"

import { formatCurrency } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import { AlertTriangle, Landmark, Plus, Trash2 } from "lucide-react"
import { Fragment, useState, useEffect, useRef, useCallback } from "react"
import { listForecastConfigs, upsertForecastConfig, listAccountMappings, getTrialBalance } from "@/lib/api"
import type { CapexDebtParams } from "@/lib/capex-financing-utils"
import {
  applyCapexDebtParamsToLoan,
  loanToCapexDebtParams,
} from "@/lib/capex-financing-utils"
import type { DebtForecastLoan } from "@/lib/debt-forecast-types"
import { isDebtHypothesisDefined } from "@/lib/debt-forecast-types"
import { calculateLoanYearAmortization } from "@/lib/debt-amortization-utils"
import {
  buildDebtLoansFromPltMappings,
  formatDebtOpeningReferenceLabel,
  mergeDebtForecastLoans,
  pltMappingDebtSkipLabel,
  resolveDebtOpeningReferencePeriod,
  type PltMappingDebtSkip,
} from "@/lib/debt-mapping-utils"
import { DebtParamsFields } from "@/components/capex-financing-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  dashboardCardAccentClass,
  dashboardCardBodyMutedClass,
  dashboardCardFrameStaticClass,
  dashboardCardHeaderBarClass,
  dashboardCardHeaderIconBoxClass,
  dashboardCardRingClass,
  dashboardCardTitleClass,
} from "@/lib/dashboard-card-style"

interface DebtForecastDetailProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years"
  columnMode?: "variations" | "percentage" | "comparison"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  title?: string
  projectionYears?: 3 | 4 | 5
  projectionId?: string | null
  forecastBaseYear?: number
  fiscalYear?: number
  referenceMonth?: number
  projectionHorizon?: "annual" | "monthly"
}

type Loan = DebtForecastLoan

interface LoanYearData {
  beginningBalance: number
  totalPayment: number
  principalPayment: number
  interestPayment: number
  endingBalance: number
}

const isForecastSection = (title?: string) => title === "Estimation du Financement annuel"

export function DebtForecastDetail({
  period: _period,
  view,
  columnMode: _columnMode = "variations",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  title = "Estimation du Financement annuel",
  projectionYears = 5,
  projectionId,
  forecastBaseYear,
  fiscalYear,
  referenceMonth,
  projectionHorizon = "annual",
}: DebtForecastDetailProps) {
  const [loans, setLoans] = useState<Loan[]>([])
  const [mappingSkipped, setMappingSkipped] = useState<PltMappingDebtSkip[]>([])
  const [openingReferenceLabel, setOpeningReferenceLabel] = useState<string>("")
  const [hypothesisLoanId, setHypothesisLoanId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState("")
  const [draftPrincipal, setDraftPrincipal] = useState(0)
  const [draftDebt, setDraftDebt] = useState<CapexDebtParams | null>(null)

  const isForecast = isForecastSection(title)

  const effectiveForecastBaseYear =
    forecastBaseYear ?? (fiscalYear != null ? fiscalYear + 1 : new Date().getFullYear() + 1)

  const openingReferencePeriod = resolveDebtOpeningReferencePeriod({
    projectionHorizon,
    forecastBaseYear: effectiveForecastBaseYear,
    referenceMonth,
  })

  const saveConfigRef = useRef<NodeJS.Timeout>()

  const saveConfig = useCallback((data: Record<string, unknown>) => {
    if (!companyId || !isForecast) return
    clearTimeout(saveConfigRef.current)
    saveConfigRef.current = setTimeout(async () => {
      try {
        await upsertForecastConfig(companyId, {
          config_type: "debt-forecast",
          data,
          projection_id: projectionId ?? undefined,
        })
      } catch (err) {
        console.error("Error saving debt forecast config:", err)
      }
    }, 500)
  }, [companyId, isForecast, projectionId])

  useEffect(() => {
    if (!companyId || !isForecast) return

    let cancelled = false

    const loadConfig = async () => {
      try {
        const refLabel = formatDebtOpeningReferenceLabel(openingReferencePeriod)
        const [configs, mappings, trialBalance] = await Promise.all([
          listForecastConfigs(companyId, {
            config_type: "debt-forecast",
            projection_id: projectionId ?? undefined,
          }),
          listAccountMappings(companyId),
          getTrialBalance(companyId, openingReferencePeriod.fiscalYear),
        ])

        let existing: Loan[] = []
        if (configs.length > 0) {
          const data = configs[0].data as Record<string, unknown>
          if (data.loans && Array.isArray(data.loans)) {
            existing = (data.loans as Loan[]).map((loan: Loan) => ({
              ...loan,
              startMonth: loan.startMonth !== undefined ? loan.startMonth : 0,
            }))
          }
        }

        const { loans: mappingLoans, skipped } = buildDebtLoansFromPltMappings({
          mappings,
          trialBalance,
          referencePeriod: openingReferencePeriod,
        })
        const merged = mergeDebtForecastLoans(existing, mappingLoans)

        if (!cancelled) {
          setOpeningReferenceLabel(refLabel)
          setMappingSkipped(skipped)
          setLoans(merged)
        }
      } catch (err) {
        console.error("Error loading debt forecast config:", err)
        if (!cancelled) {
          setLoans([])
          setMappingSkipped([])
        }
      }
    }
    void loadConfig()

    return () => {
      cancelled = true
    }
  }, [
    companyId,
    isForecast,
    projectionId,
    openingReferencePeriod.fiscalYear,
    openingReferencePeriod.month,
    effectiveForecastBaseYear,
    projectionHorizon,
    referenceMonth,
  ])

  useEffect(() => {
    if (!isForecast || loans.length === 0) return
    saveConfig({ loans })
  }, [loans, saveConfig, isForecast])

  const calculateLoanYearData = (loan: Loan, yearIndex: number): LoanYearData | null => {
    const result = calculateLoanYearAmortization(loan, yearIndex)
    if (!result) return null
    return {
      beginningBalance: result.beginningBalance,
      totalPayment: result.totalPayment,
      principalPayment: result.principalPayment,
      interestPayment: result.interestPayment,
      endingBalance: result.endingBalance,
    }
  }

  const yearOptions = Array.from({ length: projectionYears }, (_, i) => effectiveForecastBaseYear + i)

  const closeHypothesisPanel = () => {
    setHypothesisLoanId(null)
    setDraftDebt(null)
  }

  const openHypothesisPanel = (loan: Loan) => {
    setHypothesisLoanId(loan.id)
    setDraftName(loan.name)
    setDraftPrincipal(loan.principal)
    if (!isDebtHypothesisDefined(loan)) {
      setDraftDebt({
        interestRate: 5,
        termMonths: 60,
        repaymentMode: "capital_and_interest",
        firstPaymentDate: { year: effectiveForecastBaseYear, month: 1 },
      })
      return
    }
    setDraftDebt(loanToCapexDebtParams(loan, effectiveForecastBaseYear))
  }

  const saveHypothesis = () => {
    if (!hypothesisLoanId || !draftDebt) return
    setLoans((prev) =>
      prev.map((loan) => {
        if (loan.id !== hypothesisLoanId) return loan
        return {
          ...applyCapexDebtParamsToLoan(
            { ...loan, name: draftName.trim() || loan.name, principal: Math.max(0, draftPrincipal) },
            draftDebt,
            effectiveForecastBaseYear,
          ),
          hypothesisDefined: true,
        }
      }),
    )
    closeHypothesisPanel()
  }

  const addLoan = () => {
    const newLoan: Loan = {
      id: `loan-${Date.now()}`,
      name: `Emprunt ${loans.length + 1}`,
      principal: 1000000,
      interestRate: 5.0,
      remainingPayments: 60,
      startMonth: 0,
      repaymentMode: "interest_only",
      sourceType: "manual",
    }
    setLoans([...loans, newLoan])
    openHypothesisPanel(newLoan)
  }

  const deleteLoan = (loanId: string) => {
    setLoans((prev) => prev.filter((loan) => loan.id !== loanId))
    if (hypothesisLoanId === loanId) closeHypothesisPanel()
  }

  const getYearLabels = (): string[] => {
    const labels: string[] = []
    if (isForecast) {
      for (let i = 0; i < projectionYears; i++) {
        labels.push(String(effectiveForecastBaseYear + i))
      }
    } else {
      const currentYear = new Date().getFullYear()
      for (let i = 5; i >= 0; i--) {
        labels.push(`${currentYear - i}`)
      }
    }
    return labels
  }

  const getHorizonText = (): string => {
    if (view === "years") return "Annuel — " + projectionYears + " ans"
    return "Courant"
  }

  const getYearTotals = (yearIndex: number) => {
    let totalBeginning = 0
    let totalPayment = 0
    let totalPrincipal = 0
    let totalInterest = 0
    let totalEnding = 0

    loans.forEach((loan) => {
      if (!isDebtHypothesisDefined(loan)) {
        totalBeginning += loan.principal
        totalEnding += loan.principal
        return
      }
      const yearData = calculateLoanYearData(loan, yearIndex)
      if (yearData !== null) {
        totalBeginning += yearData.beginningBalance
        totalPayment += yearData.totalPayment
        totalPrincipal += yearData.principalPayment
        totalInterest += yearData.interestPayment
        totalEnding += yearData.endingBalance
      }
    })

    return {
      beginningBalance: totalBeginning,
      totalPayment,
      principalPayment: totalPrincipal,
      interestPayment: totalInterest,
      endingBalance: totalEnding,
    }
  }

  const yearLabels = getYearLabels()
  const yearColumnCount = yearLabels.length
  const tableColumnCount = 2 + yearColumnCount
  const hypothesisInlineActive = isForecast && hypothesisLoanId != null && draftDebt != null
  const rankedLoans = [...loans].sort((a, b) => {
    const aDefined = isDebtHypothesisDefined(a) ? 1 : 0
    const bDefined = isDebtHypothesisDefined(b) ? 1 : 0
    return aDefined - bDefined
  })
  const incompleteHypothesisLoans = rankedLoans.filter((loan) => !isDebtHypothesisDefined(loan))
  const visibleLoans =
    hypothesisInlineActive && hypothesisLoanId
      ? rankedLoans.filter((loan) => loan.id === hypothesisLoanId)
      : rankedLoans

  const renderYearCells = (
    loan: Loan,
    pick: (data: LoanYearData) => number,
    className: string,
    onCellClick?: () => void,
  ) =>
    yearLabels.map((_, yearIdx) => {
      const yearData = calculateLoanYearData(loan, yearIdx)
      const value = yearData ? pick(yearData) : null
      return (
        <td
          key={yearIdx}
          className={cn(
            "min-w-[8rem] px-4 py-2 text-right font-mono text-sm",
            value == null || value === 0 ? "text-slate-400" : className,
            onCellClick && "cursor-pointer hover:bg-slate-50/90",
          )}
          onClick={onCellClick}
        >
          {value != null && value !== 0 ? formatCurrency(value) : "-"}
        </td>
      )
    })

  const renderHypothesisPanel = () => {
    if (!hypothesisLoanId || !draftDebt) return null
    const loan = loans.find((item) => item.id === hypothesisLoanId)
    if (!loan) return null

    return (
      <div className="min-w-0 max-w-full">
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Hypothèse</p>
            <h3 className="mt-3 text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl">
              {loan.name}
            </h3>
            <p className="mt-3 text-xs font-medium leading-relaxed text-blue-800">
              {isDebtHypothesisDefined(loan)
                ? "Paramètres de l'emprunt — mêmes options que le financement Capex."
                : "Taux, durée et mode de remboursement à définir ici (plus dans le mapping comptable)."}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 border-slate-200 text-xs font-medium text-slate-800 hover:bg-slate-50"
              onClick={saveHypothesis}
            >
              Enregistrer
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5 border-blue-200/90 text-xs font-medium text-blue-900 hover:bg-blue-50/90"
              onClick={closeHypothesisPanel}
            >
              Fermer
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-4 rounded-2xl border border-slate-200/90 bg-white/85 p-4 shadow-sm sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="debt-hypothesis-name" className="mb-2 block text-sm font-medium text-slate-700">
                Nom de l&apos;emprunt
              </Label>
              <Input
                id="debt-hypothesis-name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="debt-hypothesis-principal" className="mb-2 block text-sm font-medium text-slate-700">
                Montant initial ($)
              </Label>
              <Input
                id="debt-hypothesis-principal"
                type="number"
                min={0}
                value={draftPrincipal}
                onChange={(e) => setDraftPrincipal(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <DebtParamsFields
            debt={draftDebt}
            onChange={setDraftDebt}
            yearOptions={yearOptions}
            idPrefix="debt-hypothesis"
            financedAmount={draftPrincipal}
          />

          {loan.sourceType === "manual" || !loan.sourceType ? (
            <div className="flex justify-end border-t border-slate-200/70 pt-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 text-xs text-red-700 hover:bg-red-50 hover:text-red-800"
                onClick={() => deleteLoan(loan.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer l&apos;emprunt
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("w-full", dashboardCardFrameStaticClass)}>
      <div className={dashboardCardRingClass} aria-hidden />
      <div className="relative w-full min-w-0">
        <div className={cn("px-6 py-5 sm:px-7", dashboardCardHeaderBarClass)}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className={dashboardCardHeaderIconBoxClass}>
                <Landmark className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className={cn("text-xl leading-tight", dashboardCardTitleClass)}>{title}</h2>
                <div className={cn("mt-1 flex flex-wrap items-center gap-3 text-sm", dashboardCardBodyMutedClass)}>
                  <span className="font-medium text-[#2A2F3A]">{getHorizonText()}</span>
                  <span className="text-slate-400">•</span>
                  {subDivisionId && divisionId && companyId ? (
                    <>
                      <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                      <span className="text-slate-400">•</span>
                      <span>
                        {companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name ||
                          "Division"}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className={cn("font-semibold", dashboardCardAccentClass)}>
                        {companies
                          .find((c) => c.id === companyId)
                          ?.divisions.find((d) => d.id === divisionId)
                          ?.subDivisions.find((sd) => sd.id === subDivisionId)?.name || "Sous-division"}
                      </span>
                    </>
                  ) : divisionId && companyId ? (
                    <>
                      <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                      <span className="text-slate-400">•</span>
                      <span className={cn("font-semibold", dashboardCardAccentClass)}>
                        {companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name ||
                          "Division"}
                      </span>
                    </>
                  ) : companyId ? (
                    <span className={cn("font-semibold", dashboardCardAccentClass)}>
                      {companies.find((c) => c.id === companyId)?.name || "Société sélectionnée"}
                    </span>
                  ) : (
                    <span className="truncate">Toutes les sociétés</span>
                  )}
                </div>
              </div>
            </div>
            {isForecast ? (
              <Button
                variant="outline"
                size="sm"
                onClick={addLoan}
                className="h-9 shrink-0 gap-1.5 border-slate-200 text-xs font-medium text-slate-800 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter un emprunt
              </Button>
            ) : null}
          </div>
        </div>

        {isForecast ? (
          <div className="border-b border-slate-200 bg-white px-6 py-3 sm:px-7">
            <p className="text-xs text-slate-600">
              Soldes d&apos;ouverture issus du mapping comptable (codes PLT-B, PLT-G, PLT-C, PLT-D) à la
              date de référence{" "}
              <span className="font-semibold text-slate-800">{openingReferenceLabel || "—"}</span>
              {loans.some((l) => l.sourceType === "mapping") ? (
                <>
                  {" "}
                  — {loans.filter((l) => l.sourceType === "mapping").length} emprunt
                  {loans.filter((l) => l.sourceType === "mapping").length > 1 ? "s" : ""} importé
                  {loans.filter((l) => l.sourceType === "mapping").length > 1 ? "s" : ""}
                </>
              ) : null}
            </p>
            {mappingSkipped.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs text-amber-800">
                {mappingSkipped.map((skip) => (
                  <li key={`${skip.accountNumber}-${skip.reason}`}>
                    {skip.accountNumber} ({skip.linkCode}) : {pltMappingDebtSkipLabel(skip.reason)}
                  </li>
                ))}
              </ul>
            ) : null}
            {incompleteHypothesisLoans.length > 0 ? (
              <div
                className="mt-3 flex flex-wrap items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-950"
                data-testid="debt-incomplete-hypotheses"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {incompleteHypothesisLoans.length} emprunt
                    {incompleteHypothesisLoans.length > 1 ? "s" : ""} sans hypothèse
                  </p>
                  <p className="mt-0.5 text-amber-800">
                    Taux, durée et mode de remboursement se définissent ici — plus dans le mapping
                    comptable.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 border-amber-300 bg-white text-xs font-medium text-amber-950 hover:bg-amber-100"
                  onClick={() => openHypothesisPanel(incompleteHypothesisLoans[0])}
                >
                  Définir
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {!companyId ? (
          <div className="flex flex-col items-center justify-center px-8 py-16 text-slate-500">
            <p className={cn("text-sm", dashboardCardBodyMutedClass)}>
              Veuillez sélectionner une société pour afficher les données.
            </p>
          </div>
        ) : (
          <div className="min-w-0 overflow-x-auto bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="min-w-[20rem] px-6 py-4 text-left text-sm font-semibold text-slate-900">
                    Emprunt
                  </th>
                  {isForecast && view === "years" ? (
                    <th className="min-w-[6.5rem] px-4 py-4 text-center text-sm font-semibold whitespace-nowrap text-slate-900">
                      Taux
                    </th>
                  ) : null}
                  {view === "years"
                    ? yearLabels.map((label, idx) => (
                        <th
                          key={idx}
                          className="min-w-[8rem] px-4 py-4 text-right text-sm font-semibold whitespace-nowrap text-slate-900"
                        >
                          {label}
                        </th>
                      ))
                    : null}
                </tr>
              </thead>
              <tbody>
                {visibleLoans.map((loan) => {
                  const isSelected = hypothesisLoanId === loan.id
                  const hypothesisDefined = isDebtHypothesisDefined(loan)

                  return (
                    <Fragment key={loan.id}>
                      <tr
                        className={cn(
                          "border-b border-slate-200 transition-colors duration-150 hover:bg-slate-50/90",
                          isSelected &&
                            "bg-blue-50/35 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.28)]",
                          !hypothesisDefined && !isSelected && "bg-amber-50/50",
                        )}
                      >
                        <td className="min-w-[20rem] px-6 py-3 font-semibold text-slate-900">
                          <button
                            type="button"
                            onClick={() => openHypothesisPanel(loan)}
                            className="flex flex-wrap items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-slate-50"
                          >
                            <span>{loan.name}</span>
                            {!hypothesisDefined ? (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                                À définir
                              </span>
                            ) : null}
                            {loan.sourceType === "capex" ? (
                              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-800">
                                Capex
                              </span>
                            ) : null}
                            {loan.sourceType === "mapping" ? (
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-800">
                                Mapping
                              </span>
                            ) : null}
                          </button>
                        </td>
                        {isForecast && view === "years" ? (
                          <td
                            className={cn(
                              "min-w-[6.5rem] cursor-pointer px-4 py-3 text-center",
                              hypothesisDefined ? "text-purple-600" : "text-amber-700",
                            )}
                            onClick={() => openHypothesisPanel(loan)}
                          >
                            {hypothesisDefined ? (
                              <span className="font-medium">{loan.interestRate.toFixed(1)}%</span>
                            ) : (
                              <span className="font-medium">À définir</span>
                            )}
                          </td>
                        ) : null}
                        {view === "years"
                          ? hypothesisDefined
                            ? renderYearCells(
                                loan,
                                (d) => d.beginningBalance,
                                "text-slate-900",
                                () => openHypothesisPanel(loan),
                              )
                            : yearLabels.map((_, yearIdx) => (
                                <td
                                  key={yearIdx}
                                  className="min-w-[8rem] cursor-pointer px-4 py-2 text-right font-mono text-sm text-slate-400"
                                  onClick={() => openHypothesisPanel(loan)}
                                >
                                  {formatCurrency(loan.principal)}
                                </td>
                              ))
                          : null}
                      </tr>

                      {hypothesisInlineActive && isSelected ? (
                        <tr className="border-b-2 border-blue-200/90 bg-slate-50/95">
                          <td colSpan={tableColumnCount} className="min-w-0 p-0 align-top">
                            <div className="min-w-0 max-w-full overflow-x-auto px-3 py-3 sm:px-5 sm:py-4">
                              {renderHypothesisPanel()}
                            </div>
                          </td>
                        </tr>
                      ) : null}

                      {isForecast && view === "years" && !hypothesisInlineActive && hypothesisDefined ? (
                        <>
                          <tr className="border-b border-slate-200">
                            <td className="px-6 py-2 pl-12 text-sm text-slate-600">Versement global</td>
                            <td className="px-4 py-2" />
                            {renderYearCells(loan, (d) => d.totalPayment, "text-slate-700")}
                          </tr>
                          <tr className="border-b border-slate-200">
                            <td className="px-6 py-2 pl-12 text-sm text-slate-600">Capital</td>
                            <td className="px-4 py-2" />
                            {renderYearCells(loan, (d) => d.principalPayment, "text-slate-700")}
                          </tr>
                          <tr className="border-b border-slate-200">
                            <td className="px-6 py-2 pl-12 text-sm text-slate-600">Intérêts</td>
                            <td className="px-4 py-2" />
                            {renderYearCells(loan, (d) => d.interestPayment, "text-slate-700")}
                          </tr>
                          <tr className="border-b-2 border-slate-300">
                            <td className="px-6 py-2 pl-12 text-sm font-semibold text-slate-900">Solde fin</td>
                            <td className="px-4 py-2" />
                            {renderYearCells(loan, (d) => d.endingBalance, "font-semibold text-slate-900")}
                          </tr>
                        </>
                      ) : null}
                    </Fragment>
                  )
                })}

                {isForecast && view === "years" && loans.length > 0 && !hypothesisInlineActive ? (
                  <>
                    <tr className="border-t-2 border-b-2 border-slate-300 bg-slate-50">
                      <td className="px-6 py-3 font-bold text-slate-900">Total</td>
                      <td className="px-4 py-3" />
                      {yearLabels.map((_, yearIdx) => (
                        <td
                          key={yearIdx}
                          className="min-w-[8rem] px-4 py-3 text-right font-mono text-sm font-bold text-slate-900"
                        >
                          {formatCurrency(getYearTotals(yearIdx).beginningBalance)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="px-6 py-2 pl-12 text-sm font-semibold text-slate-600">Versement global</td>
                      <td className="px-4 py-2" />
                      {yearLabels.map((_, yearIdx) => (
                        <td
                          key={yearIdx}
                          className="min-w-[8rem] px-4 py-2 text-right font-mono text-sm font-semibold text-slate-700"
                        >
                          {formatCurrency(getYearTotals(yearIdx).totalPayment)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="px-6 py-2 pl-12 text-sm font-semibold text-slate-600">Capital</td>
                      <td className="px-4 py-2" />
                      {yearLabels.map((_, yearIdx) => (
                        <td
                          key={yearIdx}
                          className="min-w-[8rem] px-4 py-2 text-right font-mono text-sm font-semibold text-slate-700"
                        >
                          {formatCurrency(getYearTotals(yearIdx).principalPayment)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="px-6 py-2 pl-12 text-sm font-semibold text-slate-600">Intérêts</td>
                      <td className="px-4 py-2" />
                      {yearLabels.map((_, yearIdx) => (
                        <td
                          key={yearIdx}
                          className="min-w-[8rem] px-4 py-2 text-right font-mono text-sm font-semibold text-slate-700"
                        >
                          {formatCurrency(getYearTotals(yearIdx).interestPayment)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b-2 border-slate-300">
                      <td className="px-6 py-2 pl-12 text-sm font-bold text-slate-900">Solde fin</td>
                      <td className="px-4 py-2" />
                      {yearLabels.map((_, yearIdx) => (
                        <td
                          key={yearIdx}
                          className="min-w-[8rem] px-4 py-2 text-right font-mono text-sm font-bold text-slate-900"
                        >
                          {formatCurrency(getYearTotals(yearIdx).endingBalance)}
                        </td>
                      ))}
                    </tr>
                  </>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
