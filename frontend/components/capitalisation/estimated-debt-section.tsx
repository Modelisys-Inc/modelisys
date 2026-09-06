"use client"

import { useMemo } from "react"
import { LabelWithHint } from "@/components/cmpc/editable"
import { NetTangibleReportSection } from "@/components/net-tangible/report-section"
import {
  computeEstimatedDebtFromCmpcWeight,
  computeRepaymentCapacity,
  formatCmpcCurrency,
  formatCmpcPct,
  type CmpcDebtCapacityInputs,
  type CmpcRepaymentCapacityInputs,
} from "@/lib/cmpc-wacc"
import { cn } from "@/lib/utils"

export type EstimatedDebtSectionProps = {
  number?: string
  baiiaLow: number
  baiiaHigh: number
  baiiaMid: number
  cashFlowLow: number
  cashFlowHigh: number
  enterpriseValueLow: number
  enterpriseValueHigh: number
  enterpriseValueMid: number
  cmpcDebtWeightPct: number | null
  debtCapacity: CmpcDebtCapacityInputs
  repaymentCapacity: CmpcRepaymentCapacityInputs
}

function formatDebtBaiiaMultiple(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return `${value.toFixed(2)}×`
}

function respectTone(ok: boolean | null): string {
  if (ok == null) return "text-slate-500"
  return ok ? "text-emerald-700" : "text-red-700"
}

function RespectStatus({
  ok,
  okHint,
  failHint,
  testId,
}: {
  ok: boolean | null
  okHint: string
  failHint: string
  testId?: string
}) {
  if (ok == null) {
    return <span className="text-slate-300">—</span>
  }
  return (
    <span
      className={cn("inline-flex justify-end text-xs font-medium", respectTone(ok))}
      data-testid={testId}
    >
      <LabelWithHint label={ok ? "Respecté" : "Non respecté"} hint={ok ? okHint : failHint} />
    </span>
  )
}

export function EstimatedDebtSection({
  number = "3.",
  baiiaLow,
  baiiaHigh,
  baiiaMid,
  cashFlowLow,
  cashFlowHigh,
  enterpriseValueLow,
  enterpriseValueHigh,
  enterpriseValueMid,
  cmpcDebtWeightPct,
  debtCapacity,
  repaymentCapacity,
}: EstimatedDebtSectionProps) {
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

  const estimatedDebt = useMemo(
    () =>
      computeEstimatedDebtFromCmpcWeight({
        enterpriseValue: {
          low: enterpriseValueLow,
          high: enterpriseValueHigh,
          mid: enterpriseValueMid,
        },
        debtWeightPct: cmpcDebtWeightPct,
        baiiaMid,
        annualInterestRate: repaymentCapacity.annualInterestRate,
        durationYears: repaymentCapacity.durationYears,
        cashFlowLow,
        cashFlowHigh,
      }),
    [
      enterpriseValueLow,
      enterpriseValueHigh,
      enterpriseValueMid,
      cmpcDebtWeightPct,
      baiiaMid,
      repaymentCapacity.annualInterestRate,
      repaymentCapacity.durationYears,
      cashFlowLow,
      cashFlowHigh,
    ],
  )

  const comparison = useMemo(() => {
    const estimated = estimatedDebt?.debtBaiia.mid ?? null
    const hypValues = [
      debtCapacity.debtBaiiaEmpirical,
      debtCapacity.debtBaiiaAi,
      debtCapacity.debtBaiiaComparables,
    ].filter((v) => Number.isFinite(v))
    const hypothesisMid =
      hypValues.length > 0
        ? hypValues.reduce((sum, v) => sum + v, 0) / hypValues.length
        : null
    const capacityMid =
      repayment &&
      Number.isFinite(repayment.debtBaiia.low) &&
      Number.isFinite(repayment.debtBaiia.high)
        ? (repayment.debtBaiia.low + repayment.debtBaiia.high) / 2
        : null

    const respectsCapacity =
      estimated != null && capacityMid != null ? estimated <= capacityMid + 1e-9 : null
    const respectsHypothesis =
      estimated != null && hypothesisMid != null ? estimated <= hypothesisMid + 1e-9 : null

    return {
      estimated,
      capacityMid,
      hypothesisMid,
      respectsCapacity,
      respectsHypothesis,
    }
  }, [estimatedDebt, debtCapacity, repayment])

  const weightLabel =
    estimatedDebt != null ? formatCmpcPct(estimatedDebt.debtWeightPct, 1) : "—"

  return (
    <NetTangibleReportSection
      id="dette-estimee"
      number={number}
      title="Dette estimée selon pondération CMPC"
    >
      <p className="text-pretty text-sm leading-relaxed text-slate-500">
        La dette estimée applique la pondération de dette retenue (Multiplicateur — structure
        CMPC) à la valeur d&apos;entreprise. Le Dette / BAIIA estimé et le VPM de remboursement
        sont ensuite comparés aux hypothèses et à la capacité maximale (§2).
      </p>
      <p className="mt-2 text-pretty text-sm leading-relaxed text-slate-500">
        Dette estimée = VE × pondération dette CMPC ; Dette / BAIIA estimé = dette ÷ BAIIA
        moyen. Capacité de remboursement = VPM(taux, durée, −dette estimée) ; flux disponibles
        après remboursement = flux caractéristiques − VPM.
      </p>

      <div className="mt-5" data-testid="cmpc-estimated-debt">
        {estimatedDebt ? (
          <>
            <div className="overflow-x-auto">
              <table
                className="w-full min-w-[42rem] table-fixed border-collapse text-sm"
                data-testid="cmpc-estimated-debt-table"
              >
              <colgroup>
                <col className="w-[34%]" />
                <col className="w-[14%]" />
                <col className="w-[17%]" />
                <col className="w-[17%]" />
                <col className="w-[18%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4 font-medium">Poste</th>
                  <th className="pb-2 pr-4 text-right font-medium">Validation</th>
                  <th className="pb-2 pr-4 text-right font-medium">Bas</th>
                  <th className="pb-2 pr-4 text-right font-medium">Haut</th>
                  <th className="pb-2 text-right font-medium">Moyen</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-200" data-testid="cmpc-estimated-debt-ev">
                  <td className="py-2 pr-4 text-[#2A2F3A]">Valeur d&apos;entreprise</td>
                  <td className="py-2 pr-4 text-right text-slate-300">—</td>
                  <td className="py-2 pr-4 text-right font-mono tabular-nums text-[#2A2F3A]">
                    {formatCmpcCurrency(enterpriseValueLow)}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono tabular-nums text-[#2A2F3A]">
                    {formatCmpcCurrency(enterpriseValueHigh)}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums text-[#E0742D]">
                    {formatCmpcCurrency(enterpriseValueMid)}
                  </td>
                </tr>
                <tr className="border-t border-slate-200" data-testid="cmpc-estimated-debt-weight">
                  <td className="py-2 pr-4 text-[#2A2F3A]">
                    <LabelWithHint
                      label="Pondération de dette retenue"
                      hint="Poids de la dette (Wd) de l’étape Multiplicateur — Structure de capital CMPC."
                    />
                  </td>
                  <td className="py-2 pr-4 text-right text-slate-300">—</td>
                  <td className="py-2 pr-4 text-right font-mono tabular-nums text-[#2A2F3A]">
                    {weightLabel}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono tabular-nums text-[#2A2F3A]">
                    {weightLabel}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums text-[#E0742D]">
                    {weightLabel}
                  </td>
                </tr>
                <tr
                  className="border-t-2 border-[#2A2F3A]"
                  data-testid="cmpc-estimated-debt-amount"
                >
                  <td className="py-2 pr-4 font-semibold text-[#2A2F3A]">
                    Montant de la dette estimé
                  </td>
                  <td className="py-2 pr-4 text-right text-slate-300">—</td>
                  <td className="py-2 pr-4 text-right font-mono text-sm font-semibold tabular-nums text-[#2A2F3A]">
                    {formatCmpcCurrency(estimatedDebt.estimatedDebt.low)}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-sm font-semibold tabular-nums text-[#2A2F3A]">
                    {formatCmpcCurrency(estimatedDebt.estimatedDebt.high)}
                  </td>
                  <td className="py-2 text-right font-mono text-sm font-semibold tabular-nums text-[#E0742D]">
                    {formatCmpcCurrency(estimatedDebt.estimatedDebt.mid)}
                  </td>
                </tr>
                <tr className="border-t border-slate-200" data-testid="cmpc-estimated-debt-baiia">
                  <td className="py-2 pr-4 font-semibold text-[#2A2F3A]">
                    <LabelWithHint
                      label="Dette / BAIIA (estimé)"
                      hint="Dette estimée ÷ BAIIA moyen (étape Flux monétaires)."
                    />
                  </td>
                  <td className="py-2 pr-4 text-right text-slate-300">—</td>
                  <td className="py-2 pr-4 text-right font-mono text-sm font-semibold tabular-nums text-[#2A2F3A]">
                    {formatDebtBaiiaMultiple(estimatedDebt.debtBaiia.low)}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-sm font-semibold tabular-nums text-[#2A2F3A]">
                    {formatDebtBaiiaMultiple(estimatedDebt.debtBaiia.high)}
                  </td>
                  <td className="py-2 text-right font-mono text-sm font-semibold tabular-nums text-[#E0742D]">
                    {formatDebtBaiiaMultiple(estimatedDebt.debtBaiia.mid)}
                  </td>
                </tr>
                <tr className="border-t border-slate-200" data-testid="cmpc-debt-baiia-capacity-mid">
                  <td className="py-2 pr-4 text-[#2A2F3A]">
                    <LabelWithHint
                      label="Capacité max moyenne"
                      hint="Moyenne de Dette / BAIIA (capacité max) bas et haut — §2 Capacité d’endettement."
                    />
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <RespectStatus
                      ok={comparison.respectsCapacity}
                      okHint="Dette / BAIIA estimé (moyen) ≤ capacité max moyenne."
                      failHint="Dette / BAIIA estimé (moyen) dépasse la capacité max moyenne."
                      testId="cmpc-debt-baiia-capacity-respect"
                    />
                  </td>
                  <td className="py-2 pr-4 text-right font-mono tabular-nums text-[#2A2F3A]">
                    {formatDebtBaiiaMultiple(comparison.capacityMid)}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono tabular-nums text-[#2A2F3A]">
                    {formatDebtBaiiaMultiple(comparison.capacityMid)}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums text-[#E0742D]">
                    {formatDebtBaiiaMultiple(comparison.capacityMid)}
                  </td>
                </tr>
                <tr className="border-t border-slate-200" data-testid="cmpc-debt-baiia-hypothesis-mid">
                  <td className="py-2 pr-4 text-[#2A2F3A]">
                    <LabelWithHint
                      label="Hypothèses moyenne"
                      hint="Moyenne des multiples Dette / BAIIA empiriques, IA et comparables — §2."
                    />
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <RespectStatus
                      ok={comparison.respectsHypothesis}
                      okHint="Dette / BAIIA estimé (moyen) ≤ hypothèses moyenne."
                      failHint="Dette / BAIIA estimé (moyen) dépasse l’hypothèse moyenne."
                      testId="cmpc-debt-baiia-hypothesis-respect"
                    />
                  </td>
                  <td className="py-2 pr-4 text-right font-mono tabular-nums text-[#2A2F3A]">
                    {formatDebtBaiiaMultiple(comparison.hypothesisMid)}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono tabular-nums text-[#2A2F3A]">
                    {formatDebtBaiiaMultiple(comparison.hypothesisMid)}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums text-[#E0742D]">
                    {formatDebtBaiiaMultiple(comparison.hypothesisMid)}
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
            {comparison.estimated != null && comparison.capacityMid == null ? (
              <p className="mt-3 text-pretty text-sm text-slate-500">
                Complétez la capacité d&apos;endettement (§2) pour valider la capacité max
                moyenne.
              </p>
            ) : null}
          </>
        ) : (
          <p
            className="mt-2 text-pretty text-sm text-amber-700"
            data-testid="cmpc-estimated-debt-missing"
          >
            Complétez l&apos;étape Multiplicateur (structure de capital) pour reprendre la
            pondération de dette et estimer le montant.
          </p>
        )}
      </div>

      {estimatedDebt ? (
        <div className="mt-8" data-testid="cmpc-estimated-debt-vpm-block">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Capacité de remboursement
          </p>
          <div className="overflow-x-auto">
            <table
              className="w-full min-w-[42rem] table-fixed border-collapse text-sm"
              data-testid="cmpc-estimated-debt-vpm-table"
            >
              <colgroup>
                <col className="w-[34%]" />
                <col className="w-[14%]" />
                <col className="w-[17%]" />
                <col className="w-[17%]" />
                <col className="w-[18%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4 font-medium">Poste</th>
                  <th className="pb-2 pr-4 text-right font-medium">Validation</th>
                  <th className="pb-2 pr-4 text-right font-medium">Bas</th>
                  <th className="pb-2 pr-4 text-right font-medium">Haut</th>
                  <th className="pb-2 text-right font-medium">Moyen</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-200" data-testid="cmpc-estimated-debt-cf">
                  <td className="py-2 pr-4 text-[#2A2F3A]">
                    Flux monétaires caractéristiques
                  </td>
                  <td className="py-2 pr-4 text-right text-slate-300">—</td>
                  <td className="py-2 pr-4 text-right font-mono tabular-nums text-[#2A2F3A]">
                    {formatCmpcCurrency(cashFlowLow)}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono tabular-nums text-[#2A2F3A]">
                    {formatCmpcCurrency(cashFlowHigh)}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums text-[#E0742D]">
                    {formatCmpcCurrency((cashFlowLow + cashFlowHigh) / 2)}
                  </td>
                </tr>
                <tr className="border-t border-slate-200" data-testid="cmpc-estimated-debt-vpm">
                  <td className="py-2 pr-4 text-[#2A2F3A]">
                    <LabelWithHint
                      label="(−) Remboursement de la dette (VPM)"
                      hint="VPM(taux d’intérêt annuel, durée, −montant de la dette estimé) — hypothèses de remboursement (§2)."
                    />
                  </td>
                  <td className="py-2 pr-4 text-right text-slate-300">—</td>
                  <td className="py-2 pr-4 text-right font-mono tabular-nums text-[#2A2F3A]">
                    {formatCmpcCurrency(estimatedDebt.repaymentCapacityPayment.low)}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono tabular-nums text-[#2A2F3A]">
                    {formatCmpcCurrency(estimatedDebt.repaymentCapacityPayment.high)}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums text-[#E0742D]">
                    {formatCmpcCurrency(estimatedDebt.repaymentCapacityPayment.mid)}
                  </td>
                </tr>
                <tr
                  className="border-t-2 border-[#2A2F3A]"
                  data-testid="cmpc-estimated-debt-cf-after"
                >
                  <td className="py-2 pr-4 font-semibold text-[#2A2F3A]">
                    Flux monétaires disponibles après remboursement de la dette
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <RespectStatus
                      ok={
                        estimatedDebt.cashFlowAfterDebtService.low > 0 &&
                        estimatedDebt.cashFlowAfterDebtService.high > 0 &&
                        estimatedDebt.cashFlowAfterDebtService.mid > 0
                      }
                      okHint="Bas, haut et moyen sont tous strictement supérieurs à 0 $."
                      failHint="Au moins un montant (bas, haut ou moyen) est inférieur ou égal à 0 $."
                      testId="cmpc-estimated-debt-cf-after-respect"
                    />
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-sm font-semibold tabular-nums text-[#2A2F3A]">
                    {formatCmpcCurrency(estimatedDebt.cashFlowAfterDebtService.low)}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-sm font-semibold tabular-nums text-[#2A2F3A]">
                    {formatCmpcCurrency(estimatedDebt.cashFlowAfterDebtService.high)}
                  </td>
                  <td className="py-2 text-right font-mono text-sm font-semibold tabular-nums text-[#E0742D]">
                    {formatCmpcCurrency(estimatedDebt.cashFlowAfterDebtService.mid)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </NetTangibleReportSection>
  )
}
