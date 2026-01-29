"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Plus, X, Settings } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface ExchangeRate {
  currency: string
  monthlyRates: { [month: string]: number }
  notes?: { [month: string]: string }
}

const months = [
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
  "Décembre"
]

const currencies = [
  { value: "USD", label: "USD - Dollar américain" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - Livre sterling" },
  { value: "CHF", label: "CHF - Franc suisse" },
  { value: "JPY", label: "JPY - Yen japonais" },
  { value: "AUD", label: "AUD - Dollar australien" },
]

export default function ExchangeRatesPage() {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([])
  const [newCurrency, setNewCurrency] = useState<string>("")
  const [rateModalOpen, setRateModalOpen] = useState(false)
  const [editingCurrency, setEditingCurrency] = useState<string>("")
  const [editingMonth, setEditingMonth] = useState<string>("")
  const [editingRate, setEditingRate] = useState<string>("")
  const [editingNote, setEditingNote] = useState<string>("")

  // Load exchange rates from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const loadExchangeRates = () => {
        const saved = localStorage.getItem("modelisys_exchange_rates")
        if (saved) {
          try {
            const loadedRates: ExchangeRate[] = JSON.parse(saved)
            setExchangeRates(loadedRates)
          } catch (e) {
            console.error("Error loading exchange rates:", e)
            setExchangeRates([])
          }
        } else {
          setExchangeRates([])
        }
      }

      loadExchangeRates()

      // Listen for storage changes
      const handleStorageChange = () => {
        loadExchangeRates()
      }

      window.addEventListener("storage", handleStorageChange)
      const interval = setInterval(handleStorageChange, 1000)

      return () => {
        window.removeEventListener("storage", handleStorageChange)
        clearInterval(interval)
      }
    }
  }, [])

  // Save exchange rates to localStorage
  const saveExchangeRates = (rates: ExchangeRate[]) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("modelisys_exchange_rates", JSON.stringify(rates))
      setExchangeRates(rates)
    }
  }

  // Add new currency
  const handleAddCurrency = () => {
    if (newCurrency && !exchangeRates.find(er => er.currency === newCurrency)) {
      const newRate: ExchangeRate = {
        currency: newCurrency,
        monthlyRates: {}
      }
      const updatedRates = [...exchangeRates, newRate]
      saveExchangeRates(updatedRates)
      setNewCurrency("")
    }
  }

  // Remove currency
  const handleRemoveCurrency = (currency: string) => {
    const updatedRates = exchangeRates.filter(er => er.currency !== currency)
    saveExchangeRates(updatedRates)
  }

  // Open rate modal for editing
  const openRateModal = (currency: string, month: string) => {
    const rate = exchangeRates.find(er => er.currency === currency)
    const currentRate = rate?.monthlyRates[month] || 0
    const currentNote = rate?.notes?.[month] || ""
    
    setEditingCurrency(currency)
    setEditingMonth(month)
    setEditingRate(currentRate === 0 ? "" : currentRate.toFixed(4))
    setEditingNote(currentNote)
    setRateModalOpen(true)
  }

  // Save rate and note from modal
  const saveRateAndNote = () => {
    const numValue = editingRate === "" ? 0 : parseFloat(editingRate) || 0
    const updatedRates = exchangeRates.map(er => {
      if (er.currency === editingCurrency) {
        const updatedMonthlyRates = {
          ...er.monthlyRates,
          [editingMonth]: numValue
        }
        const updatedNotes = {
          ...(er.notes || {}),
          [editingMonth]: editingNote.trim()
        }
        return {
          ...er,
          monthlyRates: updatedMonthlyRates,
          notes: updatedNotes
        }
      }
      return er
    })
    saveExchangeRates(updatedRates)
    setRateModalOpen(false)
    setEditingCurrency("")
    setEditingMonth("")
    setEditingRate("")
    setEditingNote("")
  }

  // Format number for display
  const formatRate = (rate: number | undefined): string => {
    if (rate === undefined || rate === 0) return ""
    return rate.toFixed(4)
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
              <div className="flex items-center gap-3 mb-4">
                <Link
                  href="/"
                  className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <h2 className="text-4xl font-normal text-white mb-2 tracking-tight">Taux de change</h2>
              </div>
              <p className="text-base text-slate-300 mb-6">
                Configurez les taux de change pour convertir vos devises en CAD
              </p>
              <p className="text-base text-slate-300 mb-6 leading-relaxed max-w-4xl">
                Entrez les taux de change mensuels pour chaque devise. Ces taux seront utilisés pour convertir 
                automatiquement les montants des sociétés en devise étrangère vers le dollar canadien (CAD).
              </p>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-1 h-12 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">Taux de change</h2>
                    <p className="text-sm text-slate-700">
                      Gérez les taux de change mensuels pour chaque devise
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={newCurrency} onValueChange={setNewCurrency}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Ajouter une devise" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies
                        .filter(c => !exchangeRates.find(er => er.currency === c.value))
                        .map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAddCurrency}
                    disabled={!newCurrency}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-white">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm sticky left-0 bg-slate-50 z-10 min-w-[200px]">
                      Devises
                    </th>
                    {months.map((month) => (
                      <th key={month} className="px-6 py-4 text-center font-semibold text-slate-900 text-sm min-w-[140px]">
                        {month}
                      </th>
                    ))}
                    <th className="px-6 py-4 text-center font-semibold text-slate-900 text-sm min-w-[80px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {exchangeRates.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="px-8 py-12 text-center text-sm text-slate-500">
                        <p>Aucune devise configurée. Ajoutez une devise pour commencer.</p>
                      </td>
                    </tr>
                  ) : (
                    exchangeRates.map((rate, index) => (
                      <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900 sticky left-0 bg-white z-10">
                          {currencies.find(c => c.value === rate.currency)?.label || rate.currency}
                        </td>
                        {months.map((month) => {
                          const hasNote = rate.notes?.[month] && rate.notes[month].trim() !== ""
                          const rateValue = rate.monthlyRates[month] || 0
                          return (
                            <td key={month} className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <span className={cn(
                                  "text-sm font-mono text-right",
                                  rateValue === 0 ? "text-slate-400" : "text-slate-900"
                                )}>
                                  {rateValue === 0 ? "-" : formatRate(rateValue)}
                                </span>
                                <button
                                  onClick={() => openRateModal(rate.currency, month)}
                                  className={cn(
                                    "p-1.5 rounded hover:bg-slate-200 transition-colors relative",
                                    hasNote && "text-blue-600"
                                  )}
                                  title={hasNote ? "Modifier le taux et la note" : "Modifier le taux"}
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                  {hasNote && (
                                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                      !
                                    </span>
                                  )}
                                </button>
                              </div>
                            </td>
                          )
                        })}
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleRemoveCurrency(rate.currency)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer cette devise"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Rate Modal */}
      <Dialog open={rateModalOpen} onOpenChange={setRateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le taux de change</DialogTitle>
            <DialogDescription>
              {editingCurrency && editingMonth && (
                <>
                  {currencies.find(c => c.value === editingCurrency)?.label || editingCurrency} - {editingMonth}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Taux de change
              </label>
              <Input
                type="number"
                step="0.0001"
                value={editingRate}
                onChange={(e) => setEditingRate(e.target.value)}
                placeholder="0.0000"
                className="w-full text-sm text-right font-mono"
              />
              <p className="text-xs text-slate-500 mt-1">
                Taux de conversion de {editingCurrency} vers CAD
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Note explicative
              </label>
              <Textarea
                value={editingNote}
                onChange={(e) => setEditingNote(e.target.value)}
                placeholder="Ajoutez une note pour expliquer ce taux de change..."
                className="w-full min-h-[100px] text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRateModalOpen(false)
                setEditingCurrency("")
                setEditingMonth("")
                setEditingRate("")
                setEditingNote("")
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={saveRateAndNote}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

