"use client"

import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import { ChevronRight, ChevronDown, StickyNote, Plus, X } from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import { listForecastConfigs, upsertForecastConfig } from "@/lib/api"
import { NoteModal } from "@/components/note-modal"
import { getNoteByRowId, useNotesCache } from "@/lib/notes-storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
}

interface Loan {
  id: string
  name: string
  principal: number // Montant initial de la dette
  interestRate: number // Taux d'intérêt annuel (%)
  remainingPayments: number // Nombre de paiements restants
  paymentAmount?: number // Montant du paiement (calculé ou manuel)
  startMonth: number // Mois de début (0 = janvier 2026, 1 = février 2026, etc.)
}

interface LoanYearData {
  beginningBalance: number
  totalPayment: number
  principalPayment: number
  interestPayment: number
  endingBalance: number
}

const isForecastSection = (title?: string) => title === "Estimation des Dettes annuelles"

export function DebtForecastDetail({
  period,
  view,
  columnMode = "variations",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  title = "Estimation des Dettes annuelles",
  projectionYears = 5,
  projectionId,
}: DebtForecastDetailProps) {
  useNotesCache(companyId ?? null)
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [selectedRowLabel, setSelectedRowLabel] = useState<string>("")
  const [selectedRowFinancialData, setSelectedRowFinancialData] = useState<{
    currentAmount?: number | null
    priorAmount?: number | null
    variationPercent?: number | null
    variationAmount?: number | null
  }>({})
  const [notesUpdated, setNotesUpdated] = useState(0)
  
  // State for loans
  const [loans, setLoans] = useState<Loan[]>([])
  const [editingLoan, setEditingLoan] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<{ loanId: string; field: string } | null>(null)

  const isForecast = isForecastSection(title)

  // Debounced save to API
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

  // Load loans from API on mount
  useEffect(() => {
    if (!companyId || !isForecast) return

    const loadConfig = async () => {
      try {
        const configs = await listForecastConfigs(companyId, { config_type: "debt-forecast", projection_id: projectionId ?? undefined })
        if (configs.length > 0) {
          const data = configs[0].data as Record<string, unknown>
          if (data.loans && Array.isArray(data.loans)) {
            // Ensure all loans have startMonth (default to 0 for existing loans)
            const loansWithStartMonth = (data.loans as Loan[]).map((loan: Loan) => ({
              ...loan,
              startMonth: loan.startMonth !== undefined ? loan.startMonth : 0
            }))
            setLoans(loansWithStartMonth)
          } else {
            // No loans configured - start with empty state
            setLoans([])
          }
        } else {
          // No config found - start with empty state
          setLoans([])
        }
      } catch (err) {
        console.error("Error loading debt forecast config:", err)
        // Error loading - start with empty state
        setLoans([])
      }
    }
    loadConfig()
  }, [companyId, isForecast, projectionId])

  // Save loans whenever they change
  useEffect(() => {
    if (!isForecast || loans.length === 0) return
    saveConfig({ loans })
  }, [loans, saveConfig, isForecast])

  // Calculate monthly payment (PMT formula) based on current balance and remaining payments
  const calculateMonthlyPayment = (balance: number, annualRate: number, numPayments: number): number => {
    if (numPayments === 0) return 0
    if (annualRate === 0) return balance / numPayments
    const monthlyRate = annualRate / 100 / 12
    if (monthlyRate === 0) return balance / numPayments
    const payment = balance * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
    return payment
  }

  // Calculate loan amortization for a year
  const calculateLoanYearData = (loan: Loan, yearIndex: number): LoanYearData | null => {
    // Check if loan has started by this year
    // yearIndex 0 = 2026, yearIndex 1 = 2027, etc.
    // startMonth is 0-based from January 2026
    const yearStartMonth = yearIndex * 12 // First month of this year (0, 12, 24, 36, 48, 60)
    const yearEndMonth = (yearIndex + 1) * 12 - 1 // Last month of this year (11, 23, 35, 47, 59, 71)
    
    // If loan hasn't started yet, return null
    if (loan.startMonth > yearEndMonth) {
      return null
    }
    
    const annualRate = loan.interestRate / 100
    const monthlyRate = annualRate / 12
    const monthsInYear = 12
    
    // Calculate beginning balance - need to track balance through all previous months
    let beginningBalance = loan.principal
    let remainingPaymentsAtStart = loan.remainingPayments
    
    // If loan started before this year, calculate balance at start of this year
    if (loan.startMonth < yearStartMonth) {
      let currentBalance = loan.principal
      let remainingPayments = loan.remainingPayments
      
      // Process all months from loan start to the start of this year
      const monthsToProcess = yearStartMonth - loan.startMonth
      for (let month = 0; month < Math.min(monthsToProcess, loan.remainingPayments); month++) {
        if (currentBalance <= 0 || remainingPayments <= 0) break
        
        // Recalculate monthly payment based on current balance and remaining payments
        const monthlyPayment = calculateMonthlyPayment(currentBalance, loan.interestRate, remainingPayments)
        const interest = currentBalance * monthlyRate
        const principal = Math.min(monthlyPayment - interest, currentBalance)
        
        currentBalance = Math.max(0, currentBalance - principal)
        remainingPayments--
      }
      beginningBalance = currentBalance
      remainingPaymentsAtStart = remainingPayments
    }
    
    // Calculate for the year
    let currentBalance = beginningBalance
    let remainingPayments = remainingPaymentsAtStart
    let totalPrincipal = 0
    let totalInterest = 0
    
    // Calculate months to process this year
    // If loan starts during this year, only process months from start to end of year
    // If loan started before this year, process all 12 months (or remaining payments)
    let monthsToProcessThisYear: number
    if (loan.startMonth >= yearStartMonth) {
      // Loan starts during this year
      const monthsFromStartToEndOfYear = yearEndMonth - loan.startMonth + 1
      monthsToProcessThisYear = Math.min(monthsFromStartToEndOfYear, remainingPayments)
    } else {
      // Loan started before this year, process all months of this year
      monthsToProcessThisYear = Math.min(monthsInYear, remainingPayments)
    }
    
    for (let month = 0; month < monthsToProcessThisYear; month++) {
      if (currentBalance <= 0 || remainingPayments <= 0) break
      
      // Recalculate monthly payment based on current balance and remaining payments
      const monthlyPayment = calculateMonthlyPayment(currentBalance, loan.interestRate, remainingPayments)
      const interest = currentBalance * monthlyRate
      const principal = Math.min(monthlyPayment - interest, currentBalance)
      
      totalInterest += interest
      totalPrincipal += principal
      currentBalance = Math.max(0, currentBalance - principal)
      remainingPayments--
    }
    
    return {
      beginningBalance: Math.round(beginningBalance),
      totalPayment: Math.round(totalPrincipal + totalInterest),
      principalPayment: Math.round(totalPrincipal),
      interestPayment: Math.round(totalInterest),
      endingBalance: Math.round(currentBalance),
    }
  }

  // Generate month options for start month selector (72 months = 6 years)
  const getStartMonthOptions = (): Array<{ value: number; label: string }> => {
    const currentYear = new Date().getFullYear()
    const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
    const options: Array<{ value: number; label: string }> = []
    
    // Generate 72 months (6 years) starting from January of next year (2026)
    for (let i = 0; i < 72; i++) {
      const year = currentYear + 1 + Math.floor(i / 12)
      const month = i % 12
      options.push({
        value: i,
        label: `${months[month]} ${year}`
      })
    }
    
    return options
  }

  // Add new loan
  const addLoan = () => {
    const newLoan: Loan = {
      id: `loan-${Date.now()}`,
      name: `Emprunt ${loans.length + 1}`,
      principal: 1000000,
      interestRate: 5.0,
      remainingPayments: 10,
      startMonth: 0, // Default: start in January 2026
    }
    setLoans([...loans, newLoan])
  }

  // Delete loan
  const deleteLoan = (loanId: string) => {
    setLoans(loans.filter(loan => loan.id !== loanId))
  }

  // Update loan field
  const updateLoanField = (loanId: string, field: keyof Loan, value: string | number) => {
    setLoans(loans.map(loan => {
      if (loan.id === loanId) {
        return {
          ...loan,
          [field]: field === "name" ? value : (typeof value === "number" ? value : parseFloat(value) || 0)
        }
      }
      return loan
    }))
  }

  const getYearLabels = (): string[] => {
    const currentYear = new Date().getFullYear()
    const labels: string[] = []
    if (isForecast) {
      // Start from next year instead of current year, generate projectionYears years
      for (let i = 1; i <= projectionYears; i++) {
        labels.push(`${currentYear + i}`)
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        labels.push(`${currentYear - i}`)
      }
    }
    return labels
  }

  const getHorizonText = (): string => {
    if (view === "years") return "Années"
    return "Courant"
  }

  // Calculate totals for a year
  const getYearTotals = (yearIndex: number) => {
    let totalBeginning = 0
    let totalPayment = 0
    let totalPrincipal = 0
    let totalInterest = 0
    let totalEnding = 0

    loans.forEach(loan => {
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

  return (
    <div className="w-full bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-8 py-5 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-1 h-12 bg-blue-400 rounded-full flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white tracking-tight mb-1">{title}</h2>
              <div className="flex items-center gap-3 text-sm text-slate-300 flex-wrap">
                <span className="font-medium">{getHorizonText()}</span>
                <span className="text-slate-500">•</span>
                {subDivisionId && divisionId && companyId ? (
                  <>
                    <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                    <span className="text-slate-500">•</span>
                    <span>{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name || "Division"}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-blue-400 font-semibold">{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.subDivisions.find((sd) => sd.id === subDivisionId)?.name || "Sous-division"}</span>
                  </>
                ) : divisionId && companyId ? (
                  <>
                    <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-blue-400 font-semibold">{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name || "Division"}</span>
                  </>
                ) : companyId ? (
                  <span className="text-blue-400 font-semibold">{companies.find((c) => c.id === companyId)?.name || "Société sélectionnée"}</span>
                ) : (
                  <span className="truncate">Toutes les sociétés</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Loan Button */}
      {isForecast && (
        <div className="bg-slate-50 border-b border-slate-200 px-8 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={addLoan}
            className="h-8 text-xs px-3"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Ajouter un emprunt
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-white">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm w-1/6">Emprunt</th>
              {isForecast && view === "years" && (
                <>
                  <th className="px-4 py-4 text-center font-semibold text-slate-900 text-sm whitespace-nowrap">Mois de début</th>
                  <th className="px-4 py-4 text-center font-semibold text-slate-900 text-sm whitespace-nowrap">Taux d'intérêt</th>
                  <th className="px-4 py-4 text-center font-semibold text-slate-900 text-sm whitespace-nowrap">Paiements restants</th>
                  <th className="px-4 py-4 text-center font-semibold text-slate-900 text-sm whitespace-nowrap">Montant initial</th>
                </>
              )}
              {view === "years" && (
                <>
                  {getYearLabels().map((label, idx) => (
                    <th 
                      key={idx} 
                      className="px-4 py-4 text-center font-semibold text-slate-900 text-sm whitespace-nowrap"
                    >
                      {label}
                    </th>
                  ))}
                </>
              )}
              {isForecast && <th className="px-4 py-4 text-center font-semibold text-slate-900 text-sm w-12"></th>}
            </tr>
            {isForecast && view === "years" && (
              <tr className="border-b border-slate-200">
                <th className="px-6 py-2 text-left font-semibold text-slate-900 text-xs"></th>
                <th className="px-4 py-2 text-center font-semibold text-slate-900 text-xs"></th>
                <th className="px-4 py-2 text-center font-semibold text-slate-900 text-xs"></th>
                <th className="px-4 py-2 text-center font-semibold text-slate-900 text-xs"></th>
                <th className="px-4 py-2 text-center font-semibold text-slate-900 text-xs"></th>
                {getYearLabels().map((_, idx) => (
                  <th 
                    key={idx} 
                    className="px-4 py-2 text-center font-semibold text-slate-900 text-xs"
                  >
                    Solde début
                  </th>
                ))}
                {isForecast && <th className="px-4 py-2 text-center font-semibold text-slate-900 text-xs"></th>}
              </tr>
            )}
          </thead>
          <tbody>
            {loans.map((loan, loanIdx) => {
              const isEditing = editingLoan === loan.id
              
              return (
                <>
                  {/* Loan Header Row */}
                  <tr key={loan.id} className="bg-slate-50 border-b border-slate-200">
                    <td className="px-6 py-3 font-semibold text-slate-900">
                      {isEditing && editingField?.field === "name" ? (
                        <Input
                          value={loan.name}
                          onChange={(e) => updateLoanField(loan.id, "name", e.target.value)}
                          onBlur={() => {
                            setEditingField(null)
                            setEditingLoan(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === "Escape") {
                              setEditingField(null)
                              setEditingLoan(null)
                            }
                          }}
                          className="w-32 text-sm font-semibold"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => {
                            setEditingLoan(loan.id)
                            setEditingField({ loanId: loan.id, field: "name" })
                          }}
                          className="hover:bg-slate-50 px-2 py-1 rounded transition-colors"
                        >
                          {loan.name}
                        </button>
                      )}
                    </td>
                    {isForecast && view === "years" && (
                      <>
                        <td className="px-4 py-3 text-center">
                          {editingField?.loanId === loan.id && editingField?.field === "startMonth" ? (
                            <Select
                              value={loan.startMonth.toString()}
                              onValueChange={(value) => {
                                updateLoanField(loan.id, "startMonth", parseInt(value))
                                setEditingField(null)
                              }}
                            >
                              <SelectTrigger className="w-40 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {getStartMonthOptions().map((option) => (
                                  <SelectItem key={option.value} value={option.value.toString()}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <button
                              onClick={() => setEditingField({ loanId: loan.id, field: "startMonth" })}
                              className="px-3 py-1 rounded-md text-xs font-medium transition-colors hover:bg-slate-100 cursor-pointer"
                            >
                              {getStartMonthOptions().find(opt => opt.value === loan.startMonth)?.label || "Sélectionner"}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editingField?.loanId === loan.id && editingField?.field === "interestRate" ? (
                            <Input
                              type="number"
                              step="0.1"
                              value={loan.interestRate.toFixed(1)}
                              onChange={(e) => updateLoanField(loan.id, "interestRate", parseFloat(e.target.value) || 0)}
                              onBlur={() => setEditingField(null)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === "Escape") {
                                  setEditingField(null)
                                }
                              }}
                              className="w-20 text-center font-mono text-sm"
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() => setEditingField({ loanId: loan.id, field: "interestRate" })}
                              className="px-3 py-1 rounded-md text-xs font-medium transition-colors hover:bg-slate-100 cursor-pointer"
                            >
                              {loan.interestRate.toFixed(1)}%
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editingField?.loanId === loan.id && editingField?.field === "remainingPayments" ? (
                            <Input
                              type="number"
                              value={loan.remainingPayments}
                              onChange={(e) => updateLoanField(loan.id, "remainingPayments", parseInt(e.target.value) || 0)}
                              onBlur={() => setEditingField(null)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === "Escape") {
                                  setEditingField(null)
                                }
                              }}
                              className="w-20 text-center font-mono text-sm"
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() => setEditingField({ loanId: loan.id, field: "remainingPayments" })}
                              className="px-3 py-1 rounded-md text-xs font-medium transition-colors hover:bg-slate-100 cursor-pointer"
                            >
                              {loan.remainingPayments}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editingField?.loanId === loan.id && editingField?.field === "principal" ? (
                            <Input
                              type="number"
                              value={loan.principal}
                              onChange={(e) => updateLoanField(loan.id, "principal", parseInt(e.target.value) || 0)}
                              onBlur={() => setEditingField(null)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === "Escape") {
                                  setEditingField(null)
                                }
                              }}
                              className="w-32 text-center font-mono text-sm"
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() => setEditingField({ loanId: loan.id, field: "principal" })}
                              className="px-3 py-1 rounded-md text-xs font-medium transition-colors hover:bg-slate-100 cursor-pointer"
                            >
                              {formatCurrency(loan.principal)}
                            </button>
                          )}
                        </td>
                      </>
                    )}
                    {view === "years" && (
                      <>
                        {getYearLabels().map((_, yearIdx) => {
                          const yearData = calculateLoanYearData(loan, yearIdx)
                          if (yearData === null) {
                            return (
                              <td
                                key={yearIdx}
                                className="px-4 py-3 text-right font-mono text-sm text-slate-400"
                              >
                                -
                              </td>
                            )
                          }
                          return (
                            <td
                              key={yearIdx}
                              className="px-4 py-3 text-right font-mono text-sm"
                            >
                              {formatCurrency(yearData.beginningBalance)}
                            </td>
                          )
                        })}
                      </>
                    )}
                    {isForecast && (
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteLoan(loan.id)}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                  
                  {/* Payment Row */}
                  {isForecast && view === "years" && (
                    <tr className="border-b border-slate-200">
                      <td className="px-6 py-2 text-slate-600 pl-12 text-sm">Versement global</td>
                      <td colSpan={4}></td>
                      {getYearLabels().map((_, yearIdx) => {
                        const yearData = calculateLoanYearData(loan, yearIdx)
                        if (yearData === null) {
                          return (
                            <td
                              key={yearIdx}
                              className="px-4 py-2 text-right font-mono text-sm text-slate-400"
                            >
                              -
                            </td>
                          )
                        }
                        return (
                          <td
                            key={yearIdx}
                            className="px-4 py-2 text-right font-mono text-sm text-slate-700"
                          >
                            {formatCurrency(yearData.totalPayment)}
                          </td>
                        )
                      })}
                      <td></td>
                    </tr>
                  )}
                  
                  {/* Principal Payment Row */}
                  {isForecast && view === "years" && (
                    <tr className="border-b border-slate-200">
                      <td className="px-6 py-2 text-slate-600 pl-12 text-sm">Capital</td>
                      <td colSpan={4}></td>
                      {getYearLabels().map((_, yearIdx) => {
                        const yearData = calculateLoanYearData(loan, yearIdx)
                        if (yearData === null) {
                          return (
                            <td
                              key={yearIdx}
                              className="px-4 py-2 text-right font-mono text-sm text-slate-400"
                            >
                              -
                            </td>
                          )
                        }
                        return (
                          <td
                            key={yearIdx}
                            className="px-4 py-2 text-right font-mono text-sm text-slate-700"
                          >
                            {formatCurrency(yearData.principalPayment)}
                          </td>
                        )
                      })}
                      <td></td>
                    </tr>
                  )}
                  
                  {/* Interest Payment Row */}
                  {isForecast && view === "years" && (
                    <tr className="border-b border-slate-200">
                      <td className="px-6 py-2 text-slate-600 pl-12 text-sm">Intérêts</td>
                      <td colSpan={4}></td>
                      {getYearLabels().map((_, yearIdx) => {
                        const yearData = calculateLoanYearData(loan, yearIdx)
                        if (yearData === null) {
                          return (
                            <td
                              key={yearIdx}
                              className="px-4 py-2 text-right font-mono text-sm text-slate-400"
                            >
                              -
                            </td>
                          )
                        }
                        return (
                          <td
                            key={yearIdx}
                            className="px-4 py-2 text-right font-mono text-sm text-slate-700"
                          >
                            {formatCurrency(yearData.interestPayment)}
                          </td>
                        )
                      })}
                      <td></td>
                    </tr>
                  )}
                  
                  {/* Ending Balance Row */}
                  {isForecast && view === "years" && (
                    <tr className="border-b-2 border-slate-300">
                      <td className="px-6 py-2 text-slate-900 pl-12 text-sm font-semibold">Solde fin</td>
                      <td colSpan={4}></td>
                      {getYearLabels().map((_, yearIdx) => {
                        const yearData = calculateLoanYearData(loan, yearIdx)
                        if (yearData === null) {
                          return (
                            <td
                              key={yearIdx}
                              className="px-4 py-2 text-right font-mono text-sm text-slate-400"
                            >
                              -
                            </td>
                          )
                        }
                        return (
                          <td
                            key={yearIdx}
                            className="px-4 py-2 text-right font-mono text-sm font-semibold text-slate-900"
                          >
                            {formatCurrency(yearData.endingBalance)}
                          </td>
                        )
                      })}
                      <td></td>
                    </tr>
                  )}
                </>
              )
            })}
            
            {/* Totals Row */}
            {isForecast && view === "years" && loans.length > 0 && (
              <>
                <tr className="bg-slate-50 border-t-2 border-slate-300 border-b-2 border-slate-300">
                  <td className="px-6 py-3 font-bold text-slate-900">Total</td>
                  <td colSpan={4}></td>
                  {getYearLabels().map((_, yearIdx) => {
                    const totals = getYearTotals(yearIdx)
                    return (
                      <td
                        key={yearIdx}
                        className="px-4 py-3 text-right font-mono text-sm font-bold text-slate-900"
                      >
                        {formatCurrency(totals.beginningBalance)}
                      </td>
                    )
                  })}
                  <td></td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="px-6 py-2 text-slate-600 pl-12 text-sm font-semibold">Versement global</td>
                  <td colSpan={4}></td>
                  {getYearLabels().map((_, yearIdx) => {
                    const totals = getYearTotals(yearIdx)
                    return (
                      <td
                        key={yearIdx}
                        className="px-4 py-2 text-right font-mono text-sm font-semibold text-slate-700"
                      >
                        {formatCurrency(totals.totalPayment)}
                      </td>
                    )
                  })}
                  <td></td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="px-6 py-2 text-slate-600 pl-12 text-sm font-semibold">Capital</td>
                  <td colSpan={4}></td>
                  {getYearLabels().map((_, yearIdx) => {
                    const totals = getYearTotals(yearIdx)
                    return (
                      <td
                        key={yearIdx}
                        className="px-4 py-2 text-right font-mono text-sm font-semibold text-slate-700"
                      >
                        {formatCurrency(totals.principalPayment)}
                      </td>
                    )
                  })}
                  <td></td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="px-6 py-2 text-slate-600 pl-12 text-sm font-semibold">Intérêts</td>
                  <td colSpan={4}></td>
                  {getYearLabels().map((_, yearIdx) => {
                    const totals = getYearTotals(yearIdx)
                    return (
                      <td
                        key={yearIdx}
                        className="px-4 py-2 text-right font-mono text-sm font-semibold text-slate-700"
                      >
                        {formatCurrency(totals.interestPayment)}
                      </td>
                    )
                  })}
                  <td></td>
                </tr>
                <tr className="border-b-2 border-slate-300">
                  <td className="px-6 py-2 text-slate-900 pl-12 text-sm font-bold">Solde fin</td>
                  <td colSpan={4}></td>
                  {getYearLabels().map((_, yearIdx) => {
                    const totals = getYearTotals(yearIdx)
                    return (
                      <td
                        key={yearIdx}
                        className="px-4 py-2 text-right font-mono text-sm font-bold text-slate-900"
                      >
                        {formatCurrency(totals.endingBalance)}
                      </td>
                    )
                  })}
                  <td></td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Note Modal */}
      <NoteModal
        open={noteModalOpen}
        onOpenChange={setNoteModalOpen}
        rowId={selectedRowId || ""}
        rowLabel={selectedRowLabel}
        page="debt"
        period={period}
        view={view}
        companyId={companyId}
        divisionId={divisionId}
        subDivisionId={subDivisionId}
        financialData={selectedRowFinancialData}
        onNoteSaved={() => {
          setNotesUpdated((prev) => prev + 1)
        }}
      />
    </div>
  )
}

