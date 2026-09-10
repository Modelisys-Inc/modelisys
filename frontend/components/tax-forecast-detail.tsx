"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Percent } from "lucide-react"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import { listForecastConfigs, upsertForecastConfig } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  dashboardCardAccentClass,
  dashboardCardBodyMutedClass,
  dashboardCardFrameStaticClass,
  dashboardCardHeaderBarClass,
  dashboardCardHeaderIconBoxClass,
  dashboardCardRingClass,
  dashboardCardTitleClass,
} from "@/lib/dashboard-card-style"
import {
  DEFAULT_TAX_PAYMENT_FREQUENCY,
  DEFAULT_TAX_RATE,
  TAX_FORECAST_CONFIG_TYPE,
  TAX_FORECAST_TITLE,
  TAX_PAYMENT_FREQUENCIES,
  TAX_PAYMENT_FREQUENCY_LABELS,
  parseTaxForecastData,
  parseTaxPaymentFrequency,
  parseTaxRate,
  type TaxPaymentFrequency,
} from "@/lib/tax-forecast-utils"

interface TaxForecastDetailProps {
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  title?: string
  projectionId?: string | null
  projectionYears?: 3 | 4 | 5
}

export function TaxForecastDetail({
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  title = TAX_FORECAST_TITLE,
  projectionId,
  projectionYears = 5,
}: TaxForecastDetailProps) {
  const [taxRate, setTaxRate] = useState(DEFAULT_TAX_RATE)
  const [taxPaymentFrequency, setTaxPaymentFrequency] = useState<TaxPaymentFrequency>(
    DEFAULT_TAX_PAYMENT_FREQUENCY,
  )
  const [loaded, setLoaded] = useState(false)
  const saveConfigRef = useRef<ReturnType<typeof setTimeout>>()

  const saveConfig = useCallback(
    (rate: number, frequency: TaxPaymentFrequency) => {
      if (!companyId) return
      clearTimeout(saveConfigRef.current)
      saveConfigRef.current = setTimeout(async () => {
        try {
          await upsertForecastConfig(companyId, {
            config_type: TAX_FORECAST_CONFIG_TYPE,
            data: { taxRate: rate, taxPaymentFrequency: frequency },
            projection_id: projectionId ?? undefined,
          })
        } catch (err) {
          console.error("Error saving tax forecast config:", err)
        }
      }, 400)
    },
    [companyId, projectionId],
  )

  useEffect(() => {
    if (!companyId) {
      setTaxRate(DEFAULT_TAX_RATE)
      setTaxPaymentFrequency(DEFAULT_TAX_PAYMENT_FREQUENCY)
      setLoaded(false)
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        const configs = await listForecastConfigs(companyId, {
          config_type: TAX_FORECAST_CONFIG_TYPE,
          projection_id: projectionId ?? undefined,
        })
        if (cancelled) return
        const parsed = parseTaxForecastData(configs[0]?.data)
        setTaxRate(parsed.taxRate)
        setTaxPaymentFrequency(parsed.taxPaymentFrequency)
        setLoaded(true)
      } catch (err) {
        console.error("Error loading tax forecast config:", err)
        if (!cancelled) {
          setTaxRate(DEFAULT_TAX_RATE)
          setTaxPaymentFrequency(DEFAULT_TAX_PAYMENT_FREQUENCY)
          setLoaded(true)
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [companyId, projectionId])

  const updateRate = (raw: number) => {
    const next = parseTaxRate(raw)
    setTaxRate(next)
    saveConfig(next, taxPaymentFrequency)
  }

  const updatePaymentFrequency = (raw: string) => {
    const next = parseTaxPaymentFrequency(raw)
    setTaxPaymentFrequency(next)
    saveConfig(taxRate, next)
  }

  return (
    <div className={cn("w-full", dashboardCardFrameStaticClass)}>
      <div className={dashboardCardRingClass} aria-hidden />
      <div className="relative w-full min-w-0">
        <div className={cn("px-6 py-5 sm:px-7", dashboardCardHeaderBarClass)}>
          <div className="flex min-w-0 items-start gap-4">
            <div className={dashboardCardHeaderIconBoxClass}>
              <Percent className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className={cn("text-xl leading-tight", dashboardCardTitleClass)}>{title}</h2>
              <div className={cn("mt-1 flex flex-wrap items-center gap-3 text-sm", dashboardCardBodyMutedClass)}>
                <span className="font-medium text-[#2A2F3A]">Annuel — {projectionYears} ans</span>
                <span className="text-slate-400">•</span>
                {companyId ? (
                  <span className={cn("font-semibold", dashboardCardAccentClass)}>
                    {companies.find((c) => c.id === companyId)?.name || "Société sélectionnée"}
                  </span>
                ) : (
                  <span>Toutes les sociétés</span>
                )}
                {divisionId ? (
                  <>
                    <span className="text-slate-400">•</span>
                    <span>
                      {companies
                        .find((c) => c.id === companyId)
                        ?.divisions.find((d) => d.id === divisionId)?.name || "Division"}
                    </span>
                  </>
                ) : null}
                {subDivisionId ? (
                  <>
                    <span className="text-slate-400">•</span>
                    <span>
                      {companies
                        .find((c) => c.id === companyId)
                        ?.divisions.find((d) => d.id === divisionId)
                        ?.subDivisions.find((sd) => sd.id === subDivisionId)?.name || "Sous-division"}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {!companyId ? (
          <div className="flex flex-col items-center justify-center px-8 py-16 text-slate-500">
            <p className={cn("text-sm", dashboardCardBodyMutedClass)}>
              Veuillez sélectionner une société pour définir le taux d&apos;impôt.
            </p>
          </div>
        ) : (
          <div className="space-y-6 bg-white px-6 py-6 sm:px-7">
            <p className="max-w-2xl text-sm text-slate-600">
              Choisissez le taux d&apos;impôt applicable aux années projetées et la fréquence de paiement.
              Le taux s&apos;applique au bénéfice avant impôts (poste IMP), distinct des montants historiques
              issus de la balance.
            </p>
            <div className="max-w-md space-y-5 rounded-2xl border border-slate-200/90 bg-slate-50/60 p-5">
              <div className="flex items-end justify-between gap-4">
                <div className="flex-1">
                  <Label htmlFor="tax-forecast-rate" className="mb-2 block text-sm font-medium text-slate-700">
                    Taux d&apos;impôt (%)
                  </Label>
                  <Input
                    id="tax-forecast-rate"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    disabled={!loaded}
                    value={taxRate}
                    onChange={(e) => updateRate(parseFloat(e.target.value) || 0)}
                    data-testid="tax-forecast-rate"
                  />
                </div>
                <p className="pb-2 text-lg font-semibold tabular-nums text-[#2A2F3A]">{taxRate.toFixed(1)} %</p>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={0.5}
                disabled={!loaded}
                value={Math.min(50, taxRate)}
                onChange={(e) => updateRate(Number(e.target.value))}
                className="w-full accent-[#E0742D]"
                aria-label="Taux d'impôt"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>0 %</span>
                <span>50 %</span>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Paiement des impôts</p>
                <Tabs
                  value={taxPaymentFrequency}
                  onValueChange={updatePaymentFrequency}
                >
                  <TabsList
                    className="flex h-auto w-full flex-wrap gap-1 rounded-lg border border-slate-200/90 bg-white p-0.5"
                    data-testid="tax-forecast-payment-frequency"
                  >
                    {TAX_PAYMENT_FREQUENCIES.map((frequency) => (
                      <TabsTrigger
                        key={frequency}
                        value={frequency}
                        disabled={!loaded}
                        className="h-8 flex-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 data-[state=active]:bg-[#E0742D] data-[state=active]:text-white data-[state=active]:shadow-sm sm:px-3"
                        data-testid={`tax-forecast-payment-${frequency}`}
                      >
                        {TAX_PAYMENT_FREQUENCY_LABELS[frequency]}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
