"use client"

import { Company } from "@/components/entity-selector"

interface CashConversionAnalysisProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "12months" | "24months" | "years"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
}

// Helper functions to get data
const getDetailData = (period: "monthly" | "quarterly" | "annual", view: "current" | "12months" | "24months" | "years") => {
  if (view === "12months") {
    return {
      receivables: 350000,
      priorReceivables: 300000,
      inventory: 150000,
      priorInventory: 130000,
      payables: 200000,
      priorPayables: 180000,
      revenue: 275000,
      priorRevenue: 242000,
      trendValues: Array.from({ length: 12 }, (_, i) => ({
        receivables: 300000 + (i * 4167),
        inventory: 130000 + (i * 1667),
        payables: 180000 + (i * 1667),
        revenue: 242000 + (i * 2750)
      }))
    }
  }
  if (view === "24months") {
    return {
      receivables: 350000,
      priorReceivables: 300000,
      inventory: 150000,
      priorInventory: 130000,
      payables: 200000,
      priorPayables: 180000,
      revenue: 275000,
      priorRevenue: 242000,
      trendValues: Array.from({ length: 24 }, (_, i) => ({
        receivables: 300000 + (i * 2083),
        inventory: 130000 + (i * 833),
        payables: 180000 + (i * 833),
        revenue: 242000 + (i * 1375)
      }))
    }
  }
  if (view === "years") {
    return {
      receivables: 4200000,
      priorReceivables: 3600000,
      inventory: 1800000,
      priorInventory: 1560000,
      payables: 2400000,
      priorPayables: 2160000,
      revenue: 3300000,
      priorRevenue: 2864000,
      trendValues: Array.from({ length: 6 }, (_, i) => ({
        receivables: 3600000 + (i * 120000),
        inventory: 1560000 + (i * 48000),
        payables: 2160000 + (i * 48000),
        revenue: 2864000 + (i * 72800)
      }))
    }
  }
  return {
    receivables: period === "monthly" ? 350000 : period === "quarterly" ? 1050000 : 4200000,
    priorReceivables: period === "monthly" ? 300000 : period === "quarterly" ? 900000 : 3600000,
    inventory: period === "monthly" ? 150000 : period === "quarterly" ? 450000 : 1800000,
    priorInventory: period === "monthly" ? 130000 : period === "quarterly" ? 390000 : 1560000,
    payables: period === "monthly" ? 200000 : period === "quarterly" ? 600000 : 2400000,
    priorPayables: period === "monthly" ? 180000 : period === "quarterly" ? 540000 : 2160000,
    revenue: period === "monthly" ? 275000 : period === "quarterly" ? 825000 : 3300000,
    priorRevenue: period === "monthly" ? 242000 : period === "quarterly" ? 716000 : 2864000,
    trendValues: undefined
  }
}

export function CashConversionAnalysis({
  period,
  view,
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
}: CashConversionAnalysisProps) {
  const data = getDetailData(period, view)

  // Helper to get days in period
  const getDaysInPeriod = (): number => {
    if (period === "monthly") return 30
    if (period === "quarterly") return 90
    return 365
  }

  // Calculate Days Sales Outstanding (DSO) - Délai de couvrement des clients
  const calculateDSO = (isPrior: boolean, trendIndex?: number): number => {
    if (trendIndex !== undefined && data.trendValues) {
      const receivables = data.trendValues[trendIndex]?.receivables || 0
      const revenue = data.trendValues[trendIndex]?.revenue || 0
      if (revenue === 0) return 0
      const days = getDaysInPeriod()
      return (receivables / revenue) * days
    }
    const receivables = isPrior ? data.priorReceivables : data.receivables
    const revenue = isPrior ? data.priorRevenue : data.revenue
    if (revenue === 0) return 0
    const days = getDaysInPeriod()
    return (receivables / revenue) * days
  }

  // Calculate Days Inventory Outstanding (DIO) - Délai de rotation des stocks
  const calculateDIO = (isPrior: boolean, trendIndex?: number): number => {
    if (trendIndex !== undefined && data.trendValues) {
      const inventory = data.trendValues[trendIndex]?.inventory || 0
      const revenue = data.trendValues[trendIndex]?.revenue || 0
      // Estimate cost of goods sold as 60% of revenue
      const cogs = revenue * 0.6
      if (cogs === 0) return 0
      const days = getDaysInPeriod()
      return (inventory / cogs) * days
    }
    const inventory = isPrior ? data.priorInventory : data.inventory
    const revenue = isPrior ? data.priorRevenue : data.revenue
    // Estimate cost of goods sold as 60% of revenue
    const cogs = revenue * 0.6
    if (cogs === 0) return 0
    const days = getDaysInPeriod()
    return (inventory / cogs) * days
  }

  // Calculate Days Payable Outstanding (DPO) - Délai de paiement des fournisseurs
  const calculateDPO = (isPrior: boolean, trendIndex?: number): number => {
    if (trendIndex !== undefined && data.trendValues) {
      const payables = data.trendValues[trendIndex]?.payables || 0
      const revenue = data.trendValues[trendIndex]?.revenue || 0
      // Estimate cost of goods sold as 60% of revenue
      const cogs = revenue * 0.6
      if (cogs === 0) return 0
      const days = getDaysInPeriod()
      return (payables / cogs) * days
    }
    const payables = isPrior ? data.priorPayables : data.payables
    const revenue = isPrior ? data.priorRevenue : data.revenue
    // Estimate cost of goods sold as 60% of revenue
    const cogs = revenue * 0.6
    if (cogs === 0) return 0
    const days = getDaysInPeriod()
    return (payables / cogs) * days
  }

  // Calculate Cash Conversion Cycle (CCC) - Cycle de conversion de l'encaisse
  const calculateCCC = (isPrior: boolean, trendIndex?: number): number => {
    const dso = calculateDSO(isPrior, trendIndex)
    const dio = calculateDIO(isPrior, trendIndex)
    const dpo = calculateDPO(isPrior, trendIndex)
    return dso + dio - dpo
  }

  // Helper to get month labels
  const getMonthLabels = (count: number): string[] => {
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
    const labels: string[] = []
    const currentDate = new Date()
    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      labels.push(`${months[date.getMonth()]} ${date.getFullYear()}`)
    }
    return labels
  }

  // Helper to get year labels
  const getYearLabels = (): string[] => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, i) => `${currentYear - 5 + i}`)
  }

  // Helper function to get horizon text
  const getHorizonText = (): string => {
    if (view === "current" && period === "monthly") return "Courant"
    if (view === "current" && period === "quarterly") return "Trimestriel"
    if (view === "current" && period === "annual") return "Annuel"
    if (view === "12months") return "12 mois"
    if (view === "24months") return "24 mois"
    if (view === "years") return "5 ans"
    return "Courant"
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
      {/* Header */}
      <div className="bg-white px-8 py-5 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">Analyse de la conversion de l'encaisse</h3>
              <div className="flex items-center gap-3 text-sm text-slate-700 flex-wrap">
                <span className="font-medium">{getHorizonText()}</span>
                <span className="text-slate-500">•</span>
                {subDivisionId && divisionId && companyId ? (
                  <>
                    <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                    <span className="text-slate-500">•</span>
                    <span>{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name || "Division"}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-emerald-600 font-semibold">{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.subDivisions.find((sd) => sd.id === subDivisionId)?.name || "Sous-division"}</span>
                  </>
                ) : divisionId && companyId ? (
                  <>
                    <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-emerald-600 font-semibold">{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name || "Division"}</span>
                  </>
                ) : companyId ? (
                  <span className="text-emerald-600 font-semibold">{companies.find((c) => c.id === companyId)?.name || "Société sélectionnée"}</span>
                ) : (
                  <span className="truncate">Toutes les sociétés</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-b from-slate-50 to-slate-100/50 border-b-2 border-slate-200">
              <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm w-2/5">Métrique</th>
              <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Moyenne</th>
              {view === "current" && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Courant</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Passé</th>
                </>
              )}
              {view === "12months" && (
                <>
                  {getMonthLabels(12).map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {view === "24months" && (
                <>
                  {getMonthLabels(24).map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {view === "years" && (
                <>
                  {getYearLabels().map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {/* DSO - Délai de couvrement des clients */}
            <tr className="border-b border-slate-100 hover:bg-emerald-50/30 transition-colors">
              <td className="px-6 py-3.5 text-slate-900">Délai de couvrement des clients</td>
              
              {/* Colonne Moyenne */}
              {view === "current" && (() => {
                const dsoCurrent = calculateDSO(false)
                const dsoPrior = calculateDSO(true)
                const average = (dsoCurrent + dsoPrior) / 2
                return (
                  <td className="px-6 py-3.5 text-right font-mono text-sm font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)} j
                  </td>
                )
              })()}
              {view === "12months" && (() => {
                const values = Array.from({ length: 12 }).map((_, idx) => calculateDSO(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-mono text-sm font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)} j
                  </td>
                )
              })()}
              {view === "24months" && (() => {
                const values = Array.from({ length: 24 }).map((_, idx) => calculateDSO(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-mono text-sm font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)} j
                  </td>
                )
              })()}
              {view === "years" && (() => {
                const values = Array.from({ length: 6 }).map((_, idx) => calculateDSO(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-mono text-sm font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)} j
                  </td>
                )
              })()}
              
              {/* Colonnes de données */}
              {view === "current" && (
                <>
                  <td className="px-6 py-3.5 text-right font-mono text-sm text-slate-900">
                    {calculateDSO(false).toFixed(1)} j
                  </td>
                  <td className="px-6 py-3.5 text-right font-mono text-sm text-slate-900">
                    {calculateDSO(true).toFixed(1)} j
                  </td>
                </>
              )}
              
              {view === "12months" && (
                <>
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const dso = calculateDSO(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right font-mono text-sm text-slate-900">
                        {dso.toFixed(1)} j
                      </td>
                    )
                  })}
                </>
              )}
              {view === "24months" && (
                <>
                  {Array.from({ length: 24 }).map((_, idx) => {
                    const dso = calculateDSO(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right font-mono text-sm text-slate-900">
                        {dso.toFixed(1)} j
                      </td>
                    )
                  })}
                </>
              )}
              {view === "years" && (
                <>
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const dso = calculateDSO(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right font-mono text-sm text-slate-900">
                        {dso.toFixed(1)} j
                      </td>
                    )
                  })}
                </>
              )}
            </tr>
            
            {/* DIO - Délai de rotation des stocks */}
            <tr className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors">
              <td className="px-6 py-3.5 text-slate-900">Délai de rotation des stocks</td>
              
              {/* Colonne Moyenne */}
              {view === "current" && (() => {
                const dioCurrent = calculateDIO(false)
                const dioPrior = calculateDIO(true)
                const average = (dioCurrent + dioPrior) / 2
                return (
                  <td className="px-6 py-3.5 text-right font-mono text-sm font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)} j
                  </td>
                )
              })()}
              {view === "12months" && (() => {
                const values = Array.from({ length: 12 }).map((_, idx) => calculateDIO(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-mono text-sm font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)} j
                  </td>
                )
              })()}
              {view === "24months" && (() => {
                const values = Array.from({ length: 24 }).map((_, idx) => calculateDIO(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-mono text-sm font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)} j
                  </td>
                )
              })()}
              {view === "years" && (() => {
                const values = Array.from({ length: 6 }).map((_, idx) => calculateDIO(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-mono text-sm font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)} j
                  </td>
                )
              })()}
              
              {/* Colonnes de données */}
              {view === "current" && (
                <>
                  <td className="px-6 py-3.5 text-right font-mono text-sm text-slate-900">
                    {calculateDIO(false).toFixed(1)} j
                  </td>
                  <td className="px-6 py-3.5 text-right font-mono text-sm text-slate-900">
                    {calculateDIO(true).toFixed(1)} j
                  </td>
                </>
              )}
              
              {view === "12months" && (
                <>
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const dio = calculateDIO(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right font-mono text-sm text-slate-900">
                        {dio.toFixed(1)} j
                      </td>
                    )
                  })}
                </>
              )}
              {view === "24months" && (
                <>
                  {Array.from({ length: 24 }).map((_, idx) => {
                    const dio = calculateDIO(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right font-mono text-sm text-slate-900">
                        {dio.toFixed(1)} j
                      </td>
                    )
                  })}
                </>
              )}
              {view === "years" && (
                <>
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const dio = calculateDIO(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right font-mono text-sm text-slate-900">
                        {dio.toFixed(1)} j
                      </td>
                    )
                  })}
                </>
              )}
            </tr>
            
            {/* DPO - Délai de paiement des fournisseurs */}
            <tr className="border-b border-slate-100 hover:bg-purple-50/30 transition-colors">
              <td className="px-6 py-3.5 text-slate-900">Délai de paiement des fournisseurs</td>
              
              {/* Colonne Moyenne */}
              {view === "current" && (() => {
                const dpoCurrent = calculateDPO(false)
                const dpoPrior = calculateDPO(true)
                const average = (dpoCurrent + dpoPrior) / 2
                return (
                  <td className="px-6 py-3.5 text-right font-mono text-sm font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)} j
                  </td>
                )
              })()}
              {view === "12months" && (() => {
                const values = Array.from({ length: 12 }).map((_, idx) => calculateDPO(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-mono text-sm font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)} j
                  </td>
                )
              })()}
              {view === "24months" && (() => {
                const values = Array.from({ length: 24 }).map((_, idx) => calculateDPO(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-mono text-sm font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)} j
                  </td>
                )
              })()}
              {view === "years" && (() => {
                const values = Array.from({ length: 6 }).map((_, idx) => calculateDPO(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-mono text-sm font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)} j
                  </td>
                )
              })()}
              
              {/* Colonnes de données */}
              {view === "current" && (
                <>
                  <td className="px-6 py-3.5 text-right font-mono text-sm text-slate-900">
                    {calculateDPO(false).toFixed(1)} j
                  </td>
                  <td className="px-6 py-3.5 text-right font-mono text-sm text-slate-900">
                    {calculateDPO(true).toFixed(1)} j
                  </td>
                </>
              )}
              
              {view === "12months" && (
                <>
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const dpo = calculateDPO(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right font-mono text-sm text-slate-900">
                        {dpo.toFixed(1)} j
                      </td>
                    )
                  })}
                </>
              )}
              {view === "24months" && (
                <>
                  {Array.from({ length: 24 }).map((_, idx) => {
                    const dpo = calculateDPO(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right font-mono text-sm text-slate-900">
                        {dpo.toFixed(1)} j
                      </td>
                    )
                  })}
                </>
              )}
              {view === "years" && (
                <>
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const dpo = calculateDPO(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right font-mono text-sm text-slate-900">
                        {dpo.toFixed(1)} j
                      </td>
                    )
                  })}
                </>
              )}
            </tr>
            
            {/* CCC - Cycle de conversion de l'encaisse */}
            <tr className="border-b border-slate-100 hover:bg-amber-50/30 transition-colors">
              <td className="px-6 py-3.5 text-slate-900">Cycle de conversion de l'encaisse</td>
              
              {/* Colonne Moyenne */}
              {view === "current" && (() => {
                const cccCurrent = calculateCCC(false)
                const cccPrior = calculateCCC(true)
                const average = (cccCurrent + cccPrior) / 2
                return (
                  <td className="px-6 py-3.5 text-right font-mono text-sm font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)} j
                  </td>
                )
              })()}
              {view === "12months" && (() => {
                const values = Array.from({ length: 12 }).map((_, idx) => calculateCCC(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-mono text-sm font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)} j
                  </td>
                )
              })()}
              {view === "24months" && (() => {
                const values = Array.from({ length: 24 }).map((_, idx) => calculateCCC(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-mono text-sm font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)} j
                  </td>
                )
              })()}
              {view === "years" && (() => {
                const values = Array.from({ length: 6 }).map((_, idx) => calculateCCC(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-mono text-sm font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)} j
                  </td>
                )
              })()}
              
              {/* Colonnes de données */}
              {view === "current" && (
                <>
                  <td className="px-6 py-3.5 text-right font-mono text-sm text-slate-900">
                    {calculateCCC(false).toFixed(1)} j
                  </td>
                  <td className="px-6 py-3.5 text-right font-mono text-sm text-slate-900">
                    {calculateCCC(true).toFixed(1)} j
                  </td>
                </>
              )}
              
              {view === "12months" && (
                <>
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const ccc = calculateCCC(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right font-mono text-sm text-slate-900">
                        {ccc.toFixed(1)} j
                      </td>
                    )
                  })}
                </>
              )}
              {view === "24months" && (
                <>
                  {Array.from({ length: 24 }).map((_, idx) => {
                    const ccc = calculateCCC(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right font-mono text-sm text-slate-900">
                        {ccc.toFixed(1)} j
                      </td>
                    )
                  })}
                </>
              )}
              {view === "years" && (
                <>
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const ccc = calculateCCC(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right font-mono text-sm text-slate-900">
                        {ccc.toFixed(1)} j
                      </td>
                    )
                  })}
                </>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

