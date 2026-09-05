"use client"

import { useMemo } from "react"
import { ParamRow } from "@/components/cmpc/editable"
import { NetTangibleReportSection } from "@/components/net-tangible/report-section"
import {
  assessDebtBaiiaLeverage,
  computeRepaymentCapacity,
  formatCmpcCurrency,
  type CmpcDebtCapacityInputs,
  type CmpcDebtCapacityNotes,
  type CmpcRepaymentCapacityInputs,
  type CmpcRepaymentCapacityNotes,
  type DebtBaiiaLeverageStatus,
} from "@/lib/cmpc-wacc"
import { cn } from "@/lib/utils"

export type RepaymentCapacitySectionProps = {
  number?: string
  baiiaLow: number
  baiiaHigh: number
  cashFlowLow: number
  cashFlowHigh: number
  debtCapacity: CmpcDebtCapacityInputs
  debtCapacityNotes: CmpcDebtCapacityNotes
  onDebtCapacityChange: (next: CmpcDebtCapacityInputs) => void
  onDebtCapacityNotesChange: (next: CmpcDebtCapacityNotes) => void
  repaymentCapacity: CmpcRepaymentCapacityInputs
  repaymentCapacityNotes: CmpcRepaymentCapacityNotes
  onRepaymentCapacityChange: (next: CmpcRepaymentCapacityInputs) => void
  onRepaymentCapacityNotesChange: (next: CmpcRepaymentCapacityNotes) => void
}

function AmountCell({ value }: { value: number }) {
  return (
    <td className="py-2 pr-4 text-right font-mono text-sm tabular-nums text-[#2A2F3A] last:pr-0">
      {formatCmpcCurrency(value)}
    </td>
  )
}

function formatDebtBaiiaMultiple(value: number): string {
  if (!Number.isFinite(value)) return "—"
  return `${value.toFixed(2)}×`
}

function leverageStatusLabel(status: DebtBaiiaLeverageStatus): string {
  switch (status) {
    case "over":
      return "Over — au-dessus de la capacité maximale"
    case "within":
      return "Dans la fourchette (entre bas et haut)"
    case "ok":
      return "Dans la capacité (≤ borne basse)"
  }
}

export function RepaymentCapacitySection({
  number = "3.",
  baiiaLow,
  baiiaHigh,
  cashFlowLow,
  cashFlowHigh,
  debtCapacity,
  debtCapacityNotes,
  onDebtCapacityChange,
  onDebtCapacityNotesChange,
  repaymentCapacity,
  repaymentCapacityNotes,
  onRepaymentCapacityChange,
  onRepaymentCapacityNotesChange,
}: RepaymentCapacitySectionProps) {
  const hasBaiia = Number.isFinite(baiiaLow) && Number.isFinite(baiiaHigh)
  const hasCashFlows = Number.isFinite(cashFlowLow) && Number.isFinite(cashFlowHigh)

  const repayment = useMemo(() => {
    if (!hasBaiia || !hasCashFlows) return null
    return computeRepaymentCapacity(
      { low: cashFlowLow, high: cashFlowHigh, mid: (cashFlowLow + cashFlowHigh) / 2 },
      { low: baiiaLow, high: baiiaHigh, mid: (baiiaLow + baiiaHigh) / 2 },
      repaymentCapacity,
    )
  }, [hasBaiia, hasCashFlows, cashFlowLow, cashFlowHigh, baiiaLow, baiiaHigh, repaymentCapacity])

  const leverageStatus = useMemo(
    () =>
      repayment
        ? assessDebtBaiiaLeverage(debtCapacity.debtBaiiaRetained, repayment.debtBaiia)
        : null,
    [debtCapacity.debtBaiiaRetained, repayment],
  )

  const updateMultiple =
    (key: keyof CmpcDebtCapacityInputs) => (value: number) => {
      if (!Number.isFinite(value) || value < 0) return
      onDebtCapacityChange({ ...debtCapacity, [key]: value })
    }

  const updateMultipleNote =
    (key: keyof CmpcDebtCapacityNotes) => (note: string) => {
      onDebtCapacityNotesChange({ ...debtCapacityNotes, [key]: note })
    }

  const updateRepayment =
    (key: keyof CmpcRepaymentCapacityInputs) => (value: number) => {
      if (!Number.isFinite(value) || value < 0) return
      onRepaymentCapacityChange({ ...repaymentCapacity, [key]: value })
    }

  const updateRepaymentNote =
    (key: keyof CmpcRepaymentCapacityNotes) => (note: string) => {
      onRepaymentCapacityNotesChange({ ...repaymentCapacityNotes, [key]: note })
    }

  return (
    <NetTangibleReportSection
      id="remboursement"
      number={number}
      title="Capacité de remboursement"
    >
      <p className="text-pretty text-sm leading-relaxed text-slate-500">
        La capacité de remboursement traduit les flux monétaires caractéristiques en dette
        maximale supportable (VA), puis en Dette / BAIIA. Les hypothèses Dette / BAIIA
        (empiriques, IA, comparables) et le multiple{" "}
        <span className="font-medium text-[#2A2F3A]">retenu</span> permettent de juger si la
        structure cible dépasse cette capacité.
      </p>
      <p className="mt-2 text-pretty text-sm leading-relaxed text-slate-500">
        Capacité d&apos;endettement maximale = VA(taux, durée, flux) ; Dette / BAIIA =
        capacité max ÷ BAIIA ajusté (bas / haut).
      </p>

      <div className="mt-5 grid grid-cols-1 gap-x-10 gap-y-6 lg:grid-cols-2" data-testid="cmpc-repayment-capacity">
        <div>
          {repayment && hasBaiia && hasCashFlows ? (
            <table className="w-full" data-testid="cmpc-repayment-results">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Poste
                  </th>
                  <th className="py-2 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Bas
                  </th>
                  <th className="py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Haut
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-200">
                  <td className="py-2 pr-4 text-sm text-[#2A2F3A]">
                    Flux monétaires caractéristiques
                  </td>
                  <AmountCell value={cashFlowLow} />
                  <td className="py-2 text-right font-mono text-sm tabular-nums text-[#2A2F3A]">
                    {formatCmpcCurrency(cashFlowHigh)}
                  </td>
                </tr>
                <tr className="border-t-2 border-[#2A2F3A]">
                  <td className="py-2 pr-4 text-sm font-semibold text-[#2A2F3A]">
                    Capacité d&apos;endettement maximale
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-sm font-semibold tabular-nums text-[#2A2F3A]">
                    {formatCmpcCurrency(repayment.maxDebt.low)}
                  </td>
                  <td className="py-2 text-right font-mono text-sm font-semibold tabular-nums text-[#E0742D]">
                    {formatCmpcCurrency(repayment.maxDebt.high)}
                  </td>
                </tr>
                <tr className="border-t border-slate-200" data-testid="cmpc-baiia-retained">
                  <td className="py-2 pr-4 text-sm text-[#2A2F3A]">BAIIA ajusté</td>
                  <AmountCell value={baiiaLow} />
                  <td className="py-2 text-right font-mono text-sm tabular-nums text-[#2A2F3A]">
                    {formatCmpcCurrency(baiiaHigh)}
                  </td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="py-2 pr-4 text-sm font-semibold text-[#2A2F3A]">
                    Dette / BAIIA (capacité max)
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-sm font-semibold tabular-nums text-[#2A2F3A]">
                    {formatDebtBaiiaMultiple(repayment.debtBaiia.low)}
                  </td>
                  <td className="py-2 text-right font-mono text-sm font-semibold tabular-nums text-[#2A2F3A]">
                    {formatDebtBaiiaMultiple(repayment.debtBaiia.high)}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p
              className="mt-2 text-pretty text-sm text-slate-500"
              data-testid="cmpc-repayment-empty"
            >
              Les flux monétaires caractéristiques ne sont pas encore disponibles. Complétez
              l&apos;étape{" "}
              <span className="font-medium text-[#2A2F3A]">Flux monétaires</span> pour alimenter
              cette analyse.
            </p>
          )}
        </div>

        <div data-testid="cmpc-repayment-hypotheses">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Hypothèses — remboursement
          </p>
          <ParamRow
            label="Taux d'intérêt annuel"
            hint="Taux annuel appliqué à l’annuité VA (équivalent Excel VA / PV)."
            value={repaymentCapacity.annualInterestRate}
            onChange={updateRepayment("annualInterestRate")}
            unit="%"
            step={0.25}
            min={0}
            max={100}
            width="w-20"
            note={repaymentCapacityNotes.annualInterestRate}
            onNoteChange={updateRepaymentNote("annualInterestRate")}
            testId="cmpc-repayment-rate"
            noteTestId="cmpc-repayment-rate-note"
          />
          <ParamRow
            label="Durée"
            hint="Nombre d’années de remboursement (périodes de l’annuité)."
            value={repaymentCapacity.durationYears}
            onChange={updateRepayment("durationYears")}
            unit="an"
            step={1}
            min={0}
            width="w-20"
            note={repaymentCapacityNotes.durationYears}
            onNoteChange={updateRepaymentNote("durationYears")}
            testId="cmpc-repayment-duration"
            noteTestId="cmpc-repayment-duration-note"
          />
        </div>
      </div>

      <div className="mt-8" data-testid="cmpc-debt-capacity">
        <div className="grid grid-cols-1 gap-x-10 gap-y-6 lg:grid-cols-2">
          <div data-testid="cmpc-debt-baiia-hypotheses">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Hypothèses — Dette / BAIIA ajusté
            </p>
            <ParamRow
              label="Dette / BAIIA — règles empiriques"
              hint="Multiple typique issu des règles empiriques ou covenants bancaires."
              value={debtCapacity.debtBaiiaEmpirical}
              onChange={updateMultiple("debtBaiiaEmpirical")}
              unit="×"
              step={0.25}
              min={0}
              width="w-20"
              note={debtCapacityNotes.debtBaiiaEmpirical}
              onNoteChange={updateMultipleNote("debtBaiiaEmpirical")}
              testId="cmpc-debt-baiia-empirical"
              noteTestId="cmpc-debt-baiia-empirical-note"
            />
            <ParamRow
              label="Dette / BAIIA — selon IA"
              hint="Multiple estimé par modèles / intelligence artificielle."
              value={debtCapacity.debtBaiiaAi}
              onChange={updateMultiple("debtBaiiaAi")}
              unit="×"
              step={0.25}
              min={0}
              width="w-20"
              note={debtCapacityNotes.debtBaiiaAi}
              onNoteChange={updateMultipleNote("debtBaiiaAi")}
              testId="cmpc-debt-baiia-ai"
              noteTestId="cmpc-debt-baiia-ai-note"
            />
            <ParamRow
              label="Dette / BAIIA — comparables"
              hint="Multiple observé chez des sociétés comparables du secteur."
              value={debtCapacity.debtBaiiaComparables}
              onChange={updateMultiple("debtBaiiaComparables")}
              unit="×"
              step={0.25}
              min={0}
              width="w-20"
              note={debtCapacityNotes.debtBaiiaComparables}
              onNoteChange={updateMultipleNote("debtBaiiaComparables")}
              testId="cmpc-debt-baiia-comparables"
              noteTestId="cmpc-debt-baiia-comparables-note"
            />
            <ParamRow
              label="Dette / BAIIA retenu"
              hint="Multiple retenu pour la structure cible, comparé à la Dette / BAIIA issue de la capacité d’endettement maximale."
              value={debtCapacity.debtBaiiaRetained}
              onChange={updateMultiple("debtBaiiaRetained")}
              unit="×"
              step={0.25}
              min={0}
              width="w-20"
              note={debtCapacityNotes.debtBaiiaRetained}
              onNoteChange={updateMultipleNote("debtBaiiaRetained")}
              testId="cmpc-debt-baiia-retained"
              noteTestId="cmpc-debt-baiia-retained-note"
            />
          </div>

          <div data-testid="cmpc-debt-baiia-leverage-status">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Comparaison à la capacité maximale
            </p>
            {leverageStatus && repayment ? (
              <>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-slate-500">Dette / BAIIA retenu</dt>
                    <dd className="font-mono tabular-nums text-[#2A2F3A]">
                      {formatDebtBaiiaMultiple(debtCapacity.debtBaiiaRetained)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-slate-500">Selon capacité max (bas)</dt>
                    <dd className="font-mono tabular-nums text-[#2A2F3A]">
                      {formatDebtBaiiaMultiple(repayment.debtBaiia.low)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-slate-500">Selon capacité max (haut)</dt>
                    <dd className="font-mono tabular-nums text-[#2A2F3A]">
                      {formatDebtBaiiaMultiple(repayment.debtBaiia.high)}
                    </dd>
                  </div>
                </dl>
                <p
                  className={cn(
                    "mt-3 border-t-2 border-[#2A2F3A] pt-2 text-sm font-semibold",
                    leverageStatus === "over"
                      ? "text-red-700"
                      : leverageStatus === "within"
                        ? "text-amber-700"
                        : "text-emerald-700",
                  )}
                  data-testid="cmpc-debt-baiia-leverage-verdict"
                >
                  {leverageStatusLabel(leverageStatus)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-pretty text-sm text-slate-500">
                Complétez la capacité de remboursement pour comparer le multiple retenu à la
                Dette / BAIIA maximale.
              </p>
            )}
          </div>
        </div>
      </div>
    </NetTangibleReportSection>
  )
}
