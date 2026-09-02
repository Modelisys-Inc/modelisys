"use client"

import { formatCurrency } from "@/lib/financial-utils"
import {
  computeCashDisbursementAmount,
  computeCapexDebtPaymentPreview,
  computeFinancedAmount,
  type CapexDebtParams,
  type CapexFinancingConfig,
  type CapexFinancingMode,
  type CapexProjectDate,
} from "@/lib/capex-financing-utils"
import {
  CAPEX_DEBT_REPAYMENT_MODES,
  DEBT_MORATORIUM_SCOPE_HINTS,
  DEBT_MORATORIUM_SCOPE_LABELS,
  DEBT_REPAYMENT_MODE_LABELS,
  type DebtMoratoriumScope,
} from "@/lib/debt-forecast-types"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ForecastSeasonalityEditor } from "@/components/forecast-seasonality-editor"

const MONTH_LABELS = [
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

function ProjectDateSelects({
  label,
  value,
  onChange,
  yearOptions,
  idPrefix,
  disabled = false,
}: {
  label: string
  value: CapexProjectDate
  onChange: (d: CapexProjectDate) => void
  yearOptions: number[]
  idPrefix: string
  disabled?: boolean
}) {
  return (
    <div>
      <Label htmlFor={`${idPrefix}-month`} className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </Label>
      <div className="flex gap-2">
        <Select
          value={String(value.month)}
          disabled={disabled}
          onValueChange={(v) => onChange({ ...value, month: parseInt(v, 10) })}
        >
          <SelectTrigger id={`${idPrefix}-month`} className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_LABELS.map((m, i) => (
              <SelectItem key={m} value={String(i + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(value.year)}
          disabled={disabled}
          onValueChange={(v) => onChange({ ...value, year: parseInt(v, 10) })}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function ModeRadio({
  mode,
  current,
  label,
  onSelect,
}: {
  mode: CapexFinancingMode
  current: CapexFinancingMode
  label: string
  onSelect: (m: CapexFinancingMode) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:border-slate-300 has-[:checked]:border-blue-300 has-[:checked]:bg-blue-50/50">
      <input
        type="radio"
        name="capex-financing-mode"
        checked={current === mode}
        onChange={() => onSelect(mode)}
        className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      <span className="text-sm font-medium text-slate-800">{label}</span>
    </label>
  )
}

function clampProjectDateToYears(
  date: CapexProjectDate,
  yearOptions: number[],
): CapexProjectDate {
  if (yearOptions.length === 0) return date
  const minY = yearOptions[0]!
  const maxY = yearOptions[yearOptions.length - 1]!
  if (date.year < minY) return { year: minY, month: date.month }
  if (date.year > maxY) return { year: maxY, month: date.month }
  return date
}

export function DebtParamsFields({
  debt,
  onChange,
  yearOptions,
  idPrefix,
  financedAmount = 0,
  readOnly = false,
}: {
  debt: NonNullable<CapexFinancingConfig["debt"]>
  onChange: (debt: NonNullable<CapexFinancingConfig["debt"]>) => void
  yearOptions: number[]
  idPrefix: string
  financedAmount?: number
  /** Aperçu Hypothèses Financement (emprunts Capex) — champs non modifiables. */
  readOnly?: boolean
}) {
  const isInterestOnly =
    debt.repaymentMode === "interest_only" || debt.repaymentMode === "interest_only_balloon"
  const withResidual =
    isInterestOnly &&
    ((debt.balloonAmount ?? 0) > 0 || debt.balloonPaymentDate != null || debt.repaymentMode === "interest_only_balloon")
  const moratoriumMonths = Math.max(0, Math.round(debt.moratoriumMonths ?? 0))
  const withMoratorium = moratoriumMonths > 0
  const moratoriumScope: DebtMoratoriumScope = debt.moratoriumScope ?? "both"

  const patchDebt = (partial: Partial<CapexDebtParams>) => {
    if (readOnly) return
    const next = { ...debt, ...partial }
    if (next.firstPaymentDate) {
      next.firstPaymentDate = clampProjectDateToYears(next.firstPaymentDate, yearOptions)
    }
    if (next.balloonPaymentDate) {
      next.balloonPaymentDate = clampProjectDateToYears(next.balloonPaymentDate, yearOptions)
    }
    onChange(next)
  }

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-slate-200/90 bg-slate-50/60 p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Paramètres de la dette</h4>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${idPrefix}-rate`} className="mb-2 block text-sm font-medium text-slate-700">
            Taux (%)
          </Label>
          <Input
            id={`${idPrefix}-rate`}
            type="number"
            step="0.01"
            min={0}
            value={debt.interestRate}
            disabled={readOnly}
            onChange={(e) => patchDebt({ interestRate: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-term`} className="mb-2 block text-sm font-medium text-slate-700">
            Durée (mois)
          </Label>
          <Input
            id={`${idPrefix}-term`}
            type="number"
            min={1}
            step={1}
            value={debt.termMonths}
            disabled={readOnly}
            onChange={(e) => patchDebt({ termMonths: parseInt(e.target.value, 10) || 1 })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="mb-2 block text-sm font-medium text-slate-700">Mode de remboursement</Label>
          <div className="grid gap-2">
            {CAPEX_DEBT_REPAYMENT_MODES.map((mode) => (
              <label
                key={mode}
                className={cn(
                  "flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition-colors",
                  readOnly
                    ? "cursor-default opacity-90"
                    : "cursor-pointer hover:border-slate-300 has-[:checked]:border-blue-300 has-[:checked]:bg-blue-50/50",
                )}
              >
                <input
                  type="radio"
                  name={`${idPrefix}-repayment-mode`}
                  checked={
                    mode === "interest_only"
                      ? isInterestOnly
                      : debt.repaymentMode === mode
                  }
                  disabled={readOnly}
                  onChange={() => {
                    if (mode === "interest_only") {
                      patchDebt({
                        repaymentMode: "interest_only",
                        moratoriumScope: "interest",
                      })
                    } else {
                      patchDebt({
                        repaymentMode: mode,
                        balloonAmount: undefined,
                        balloonPaymentDate: undefined,
                        moratoriumScope: debt.moratoriumScope ?? "both",
                      })
                    }
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium leading-snug text-slate-800">
                  {DEBT_REPAYMENT_MODE_LABELS[mode]}
                </span>
              </label>
            ))}
          </div>
        </div>

        {isInterestOnly ? (
          <div className="sm:col-span-2 space-y-3 rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-start gap-2.5">
              <Checkbox
                id={`${idPrefix}-residual`}
                checked={withResidual}
                disabled={readOnly}
                onCheckedChange={(v) => {
                  const on = v === true
                  if (on) {
                    patchDebt({
                      repaymentMode: "interest_only",
                      balloonAmount: financedAmount > 0 ? financedAmount : debt.balloonAmount ?? 0,
                      balloonPaymentDate: debt.balloonPaymentDate ?? { ...debt.firstPaymentDate },
                    })
                  } else {
                    patchDebt({
                      repaymentMode: "interest_only",
                      balloonAmount: undefined,
                      balloonPaymentDate: undefined,
                    })
                  }
                }}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <Label
                  htmlFor={`${idPrefix}-residual`}
                  className={cn(
                    "text-sm font-medium leading-snug text-slate-800",
                    readOnly ? "cursor-default" : "cursor-pointer",
                  )}
                >
                  Paiement résiduel
                </Label>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Option des intérêts seulement : un remboursement de capital à une date donnée
                  (paiement ballon).
                </p>
              </div>
            </div>
            {withResidual ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor={`${idPrefix}-balloon`} className="mb-2 block text-sm font-medium text-slate-700">
                    Montant du paiement résiduel ($)
                  </Label>
                  <Input
                    id={`${idPrefix}-balloon`}
                    type="number"
                    min={0}
                    value={debt.balloonAmount ?? 0}
                    disabled={readOnly}
                    onChange={(e) => patchDebt({ balloonAmount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <ProjectDateSelects
                  label="Date du paiement résiduel"
                  value={clampProjectDateToYears(
                    debt.balloonPaymentDate ?? debt.firstPaymentDate,
                    yearOptions,
                  )}
                  onChange={(balloonPaymentDate) => patchDebt({ balloonPaymentDate })}
                  yearOptions={yearOptions}
                  idPrefix={`${idPrefix}-balloon-date`}
                  disabled={readOnly}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="sm:col-span-2">
          <ProjectDateSelects
            label={
              debt.repaymentMode === "capital_and_interest"
                ? "Date du premier paiement"
                : "Date du premier paiement d'intérêts"
            }
            value={clampProjectDateToYears(debt.firstPaymentDate, yearOptions)}
            onChange={(firstPaymentDate) => patchDebt({ firstPaymentDate })}
            yearOptions={yearOptions}
            idPrefix={`${idPrefix}-first-payment`}
            disabled={readOnly}
          />
          <p className="mt-1 text-[11px] text-slate-500">
            À partir de {yearOptions[0] ?? "—"} (première année de projection).
          </p>
        </div>

        <div className="sm:col-span-2 space-y-3 rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-start gap-2.5">
            <Checkbox
              id={`${idPrefix}-moratorium-enabled`}
              checked={withMoratorium}
              disabled={readOnly}
              onCheckedChange={(v) => {
                const on = v === true
                if (on) {
                  patchDebt({
                    moratoriumMonths: moratoriumMonths > 0 ? moratoriumMonths : 12,
                    moratoriumScope: isInterestOnly ? "interest" : (debt.moratoriumScope ?? "both"),
                  })
                } else {
                  patchDebt({ moratoriumMonths: 0 })
                }
              }}
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <Label
                htmlFor={`${idPrefix}-moratorium-enabled`}
                className={cn(
                  "text-sm font-medium leading-snug text-slate-800",
                  readOnly ? "cursor-default" : "cursor-pointer",
                )}
              >
                Moratoire
              </Label>
              <p className="text-[11px] leading-relaxed text-slate-500">
                {isInterestOnly
                  ? "Période sans paiement d'intérêts avant le début des versements."
                  : "Suspendre temporairement les intérêts, le capital, ou les deux."}
              </p>
            </div>
          </div>

          {withMoratorium ? (
            isInterestOnly ? (
              <div>
                <Label htmlFor={`${idPrefix}-moratorium`} className="mb-2 block text-sm font-medium text-slate-700">
                  Durée du moratoire (mois)
                </Label>
                <Input
                  id={`${idPrefix}-moratorium`}
                  type="number"
                  min={1}
                  step={1}
                  value={moratoriumMonths}
                  disabled={readOnly}
                  onChange={(e) =>
                    patchDebt({ moratoriumMonths: Math.max(1, parseInt(e.target.value, 10) || 1) })
                  }
                  className="max-w-[10rem]"
                />
              </div>
            ) : (
              <>
                <div>
                  <Label className="mb-2 block text-sm font-medium text-slate-700">Type de moratoire</Label>
                  <p className="mb-2 text-[11px] leading-relaxed text-slate-500">
                    Choisissez ce qui est suspendu pendant la période de moratoire.
                  </p>
                  <div className="grid gap-2">
                    {(["interest", "capital", "both"] as DebtMoratoriumScope[]).map((scope) => (
                      <label
                        key={scope}
                        className={cn(
                          "flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 transition-colors",
                          readOnly
                            ? "cursor-default opacity-90"
                            : "cursor-pointer hover:border-slate-300 has-[:checked]:border-blue-300 has-[:checked]:bg-blue-50/50",
                        )}
                      >
                        <input
                          type="radio"
                          name={`${idPrefix}-moratorium-scope`}
                          checked={moratoriumScope === scope}
                          disabled={readOnly}
                          onChange={() => patchDebt({ moratoriumScope: scope })}
                          className="mt-0.5 h-4 w-4 shrink-0 border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium leading-snug text-slate-800">
                            {DEBT_MORATORIUM_SCOPE_LABELS[scope]}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
                            {DEBT_MORATORIUM_SCOPE_HINTS[scope]}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor={`${idPrefix}-moratorium`} className="mb-2 block text-sm font-medium text-slate-700">
                    Durée du moratoire (mois)
                  </Label>
                  <Input
                    id={`${idPrefix}-moratorium`}
                    type="number"
                    min={1}
                    step={1}
                    value={moratoriumMonths}
                    disabled={readOnly}
                    onChange={(e) =>
                      patchDebt({ moratoriumMonths: Math.max(1, parseInt(e.target.value, 10) || 1) })
                    }
                    className="max-w-[10rem]"
                  />
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                    À compter de la date du premier paiement.
                  </p>
                </div>
              </>
            )
          ) : null}
        </div>
      </div>
    </div>
  )
}

function CapexDebtPaymentPreview({
  config,
  forecastBaseYear,
  calendarYear,
  yearLabel,
  financedAmount,
}: {
  config: CapexFinancingConfig
  forecastBaseYear: number
  calendarYear: number
  yearLabel: string
  financedAmount: number
}) {
  const preview = computeCapexDebtPaymentPreview(
    { ...config, totalAmount: config.totalAmount || financedAmount },
    forecastBaseYear,
    calendarYear,
  )

  return (
    <div className="mt-4 rounded-xl border border-blue-200/80 bg-blue-50/40 p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-800">
        Paiements de capital et d&apos;intérêts
      </h4>
      <p className="mt-2 text-xs leading-relaxed text-blue-900/80">
        Emprunt de {formatCurrency(financedAmount)} — le prêt sera synchronisé avec le menu Dette.
      </p>
          {preview?.monthlyPayment != null && preview.monthlyPayment > 0 ? (
        <p className="mt-3 text-sm text-blue-950">
          {preview.repaymentMode === "capital_and_interest"
            ? "Paiement mensuel (capital et intérêts)"
            : "Paiement mensuel d'intérêts"}
          :{" "}
          <span className="font-semibold tabular-nums">{formatCurrency(preview.monthlyPayment)}</span>
        </p>
      ) : preview && (config.debt?.moratoriumMonths ?? 0) > 0 ? (
        <p className="mt-3 text-sm text-blue-950">
          Moratoire ({DEBT_MORATORIUM_SCOPE_LABELS[config.debt?.moratoriumScope ?? "both"].toLowerCase()}
          ) : {config.debt?.moratoriumMonths ?? 0} mois à compter du premier paiement.
        </p>
      ) : null}
      {preview?.yearData ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-blue-200/60 bg-white/80 p-3">
            <p className="text-[11px] font-medium uppercase text-blue-700">Capital — {yearLabel}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-blue-950">
              {formatCurrency(preview.yearData.principalPayment)}
            </p>
          </div>
          <div className="rounded-lg border border-blue-200/60 bg-white/80 p-3">
            <p className="text-[11px] font-medium uppercase text-blue-700">Intérêts — {yearLabel}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-blue-950">
              {formatCurrency(preview.yearData.interestPayment)}
            </p>
          </div>
          <div className="rounded-lg border border-blue-200/60 bg-white/80 p-3">
            <p className="text-[11px] font-medium uppercase text-blue-700">Total — {yearLabel}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-blue-950">
              {formatCurrency(preview.yearData.totalPayment)}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-blue-200/60 bg-white/70 px-3 py-2 text-xs text-blue-900">
          Aucun paiement prévu pour {yearLabel} (le prêt débute après cette année ou est déjà remboursé).
        </p>
      )}
    </div>
  )
}

export type CapexFinancingEditorProps = {
  embedded?: boolean
  forecastBaseYear: number
  projectionYears: number
  config: CapexFinancingConfig
  /** Montant capex annuel défini dans l'onglet Ajustement. */
  adjustmentAmount: number
  /** Année civile de la colonne d'ajustement sélectionnée. */
  adjustmentCalendarYear: number
  onChange: (config: CapexFinancingConfig) => void
  disbursementSeasonalityMonthPercents: number[]
  onDisbursementSeasonalityChange: (monthPercents: number[]) => void
  canReplicateCalendar: boolean
  replicateCalendar: boolean
  onReplicateCalendarChange: (on: boolean) => void
  followingYearsLabel: string
  yearLabel: string
  linkedLoanId?: string
  /** Masquer la case « appliquer aux années suivantes » (déjà gérée par l’ajustement parent). */
  hideReplicateCalendar?: boolean
}

export function CapexFinancingEditor({
  embedded = false,
  forecastBaseYear,
  projectionYears,
  config,
  adjustmentAmount,
  adjustmentCalendarYear,
  onChange,
  disbursementSeasonalityMonthPercents,
  onDisbursementSeasonalityChange,
  canReplicateCalendar,
  replicateCalendar,
  onReplicateCalendarChange,
  followingYearsLabel,
  yearLabel,
  linkedLoanId,
  hideReplicateCalendar = false,
}: CapexFinancingEditorProps) {
  const yearOptions = Array.from({ length: projectionYears }, (_, i) => forecastBaseYear + i)
  const effectiveConfig: CapexFinancingConfig = { ...config, totalAmount: adjustmentAmount }
  const cashOut = computeCashDisbursementAmount(effectiveConfig)
  const financed = computeFinancedAmount(effectiveConfig)
  const debtParams = config.debt
  const showDisbursementCalendar = config.mode === "cash" || config.mode === "mixed"
  const showDebtPaymentPreview =
    (config.mode === "financed" || config.mode === "mixed") && financed > 0 && debtParams != null

  const patch = (partial: Partial<CapexFinancingConfig>) => {
    onChange({ ...config, ...partial })
  }

  const setMode = (mode: CapexFinancingMode) => {
    const next: CapexFinancingConfig = { ...config, mode }
    if (mode === "financed" || mode === "mixed") {
      if (!next.debt) {
        next.debt = {
          interestRate: 5,
          termMonths: 60,
          repaymentMode: "interest_only",
          firstPaymentDate: {
            year: Math.max(adjustmentCalendarYear, forecastBaseYear),
            month: 1,
          },
          moratoriumMonths: 0,
          moratoriumScope: "interest",
        }
      }
    }
    if (mode === "mixed" && next.downPayment == null) {
      next.downPayment = Math.round(adjustmentAmount * 0.2)
    }
    onChange(next)
  }

  return (
    <div className={cn("space-y-5", embedded && "min-w-0 max-w-full")}>
      {adjustmentAmount <= 0 ? (
        <p className="rounded-md border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-900">
          Saisissez d&apos;abord le montant de cet ajustement pour configurer le financement et le
          décaissement.
        </p>
      ) : null}

      <div className="space-y-3">
        <h3 className="border-b border-slate-200/70 pb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Mode de financement
        </h3>
        <div className="grid gap-2 sm:grid-cols-3">
          <ModeRadio mode="cash" current={config.mode} label="Comptant" onSelect={setMode} />
          <ModeRadio mode="financed" current={config.mode} label="Financement" onSelect={setMode} />
          <ModeRadio mode="mixed" current={config.mode} label="Mixte" onSelect={setMode} />
        </div>

        {config.mode === "financed" && debtParams ? (
          <DebtParamsFields
            debt={debtParams}
            onChange={(debt) => patch({ debt })}
            yearOptions={yearOptions}
            idPrefix="capex-financed"
            financedAmount={financed}
          />
        ) : null}

        {config.mode === "mixed" ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-medium uppercase text-slate-500">Montant total CAPEX</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(adjustmentAmount)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <Label htmlFor="capex-down-payment" className="text-[11px] font-medium uppercase text-slate-500">
                  Mise de fonds
                </Label>
                <Input
                  id="capex-down-payment"
                  type="number"
                  min={0}
                  max={adjustmentAmount}
                  className="mt-1"
                  value={config.downPayment ?? 0}
                  onChange={(e) => patch({ downPayment: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="rounded-lg border border-blue-200/80 bg-blue-50/50 p-3">
                <p className="text-[11px] font-medium uppercase text-blue-700">Montant financé</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-blue-950">
                  {formatCurrency(financed)}
                </p>
              </div>
            </div>
            {debtParams && financed > 0 ? (
              <DebtParamsFields
                debt={debtParams}
                onChange={(debt) => patch({ debt })}
                yearOptions={yearOptions}
                idPrefix="capex-mixed"
                financedAmount={financed}
              />
            ) : null}
          </div>
        ) : null}

        {linkedLoanId ? (
          <p className="rounded-md border border-blue-200 bg-blue-50/90 px-3 py-2 text-xs text-blue-900">
            Prêt lié enregistré dans le menu Dette. Les modifications seront synchronisées à l&apos;enregistrement.
          </p>
        ) : null}

        {showDebtPaymentPreview ? (
          <CapexDebtPaymentPreview
            config={effectiveConfig}
            forecastBaseYear={forecastBaseYear}
            calendarYear={adjustmentCalendarYear}
            yearLabel={yearLabel}
            financedAmount={financed}
          />
        ) : null}
      </div>

      {adjustmentAmount > 0 && showDisbursementCalendar ? (
        <div className="min-w-0 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Calendrier de décaissement
            {cashOut > 0 && cashOut < adjustmentAmount
              ? ` (${formatCurrency(cashOut)} comptant)`
              : cashOut > 0
                ? ` (${formatCurrency(cashOut)})`
                : ""}
          </h3>
          <p className="text-xs text-slate-500">
            Répartition mensuelle (%) du décaissement pour {yearLabel}.
            {config.mode === "mixed" ? " En mode mixte, le calendrier s’applique à la mise de fonds comptant." : ""}
          </p>
          <ForecastSeasonalityEditor
            variant="decaissement"
            embedded={embedded}
            yearLabel={yearLabel}
            followingYearsLabel={followingYearsLabel}
            canReplicateToFollowingYears={!hideReplicateCalendar && canReplicateCalendar}
            replicateToFollowingYears={replicateCalendar}
            onReplicateChange={onReplicateCalendarChange}
            replicateCheckboxId="capex-disbursement-calendar-replicate"
            monthPercents={disbursementSeasonalityMonthPercents}
            onMonthPercentsChange={onDisbursementSeasonalityChange}
            allowZeroMonthPercents
          />
        </div>
      ) : null}
    </div>
  )
}
