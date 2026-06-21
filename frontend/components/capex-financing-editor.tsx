"use client"

import { formatCurrency } from "@/lib/financial-utils"
import {
  computeCashDisbursementAmount,
  computeCapexDebtPaymentPreview,
  computeFinancedAmount,
  type CapexFinancingConfig,
  type CapexFinancingMode,
  type CapexProjectDate,
} from "@/lib/capex-financing-utils"
import {
  CAPEX_DEBT_REPAYMENT_MODES,
  DEBT_REPAYMENT_MODE_LABELS,
} from "@/lib/debt-forecast-types"
import { cn } from "@/lib/utils"
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

function MonthOnlySelect({
  label,
  month,
  yearLabel,
  onMonthChange,
  id,
}: {
  label: string
  month: number
  yearLabel: string
  onMonthChange: (month: number) => void
  id: string
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </Label>
      <p className="mb-2 text-xs text-slate-500">
        Année de l&apos;ajustement : <span className="font-medium text-slate-700">{yearLabel}</span>
      </p>
      <Select value={String(month)} onValueChange={(v) => onMonthChange(parseInt(v, 10))}>
        <SelectTrigger id={id} className="w-full max-w-xs">
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
    </div>
  )
}

function ProjectDateSelects({
  label,
  value,
  onChange,
  yearOptions,
  idPrefix,
}: {
  label: string
  value: CapexProjectDate
  onChange: (d: CapexProjectDate) => void
  yearOptions: number[]
  idPrefix: string
}) {
  return (
    <div>
      <Label htmlFor={`${idPrefix}-month`} className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </Label>
      <div className="flex gap-2">
        <Select
          value={String(value.month)}
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

function DebtParamsFields({
  debt,
  onChange,
  yearOptions,
  idPrefix,
  financedAmount = 0,
}: {
  debt: NonNullable<CapexFinancingConfig["debt"]>
  onChange: (debt: NonNullable<CapexFinancingConfig["debt"]>) => void
  yearOptions: number[]
  idPrefix: string
  financedAmount?: number
}) {
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
            onChange={(e) => onChange({ ...debt, interestRate: parseFloat(e.target.value) || 0 })}
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
            onChange={(e) => onChange({ ...debt, termMonths: parseInt(e.target.value, 10) || 1 })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="mb-2 block text-sm font-medium text-slate-700">Mode de remboursement</Label>
          <div className="grid gap-2">
            {CAPEX_DEBT_REPAYMENT_MODES.map((mode) => (
              <label
                key={mode}
                className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:border-slate-300 has-[:checked]:border-blue-300 has-[:checked]:bg-blue-50/50"
              >
                <input
                  type="radio"
                  name={`${idPrefix}-repayment-mode`}
                  checked={debt.repaymentMode === mode}
                  onChange={() => {
                    const next = { ...debt, repaymentMode: mode }
                    if (mode === "interest_only_balloon") {
                      if (!next.balloonAmount || next.balloonAmount <= 0) {
                        next.balloonAmount = financedAmount > 0 ? financedAmount : next.balloonAmount
                      }
                      if (!next.balloonPaymentDate) {
                        next.balloonPaymentDate = { ...debt.firstPaymentDate }
                      }
                    }
                    onChange(next)
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
        {debt.repaymentMode === "interest_only_balloon" ? (
          <>
            <div>
              <Label htmlFor={`${idPrefix}-balloon`} className="mb-2 block text-sm font-medium text-slate-700">
                Montant du paiement résiduel ($)
              </Label>
              <Input
                id={`${idPrefix}-balloon`}
                type="number"
                min={0}
                value={debt.balloonAmount ?? 0}
                onChange={(e) => onChange({ ...debt, balloonAmount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <ProjectDateSelects
              label="Date du paiement résiduel"
              value={debt.balloonPaymentDate ?? debt.firstPaymentDate}
              onChange={(balloonPaymentDate) => onChange({ ...debt, balloonPaymentDate })}
              yearOptions={yearOptions}
              idPrefix={`${idPrefix}-balloon-date`}
            />
          </>
        ) : null}
        <div className={debt.repaymentMode === "interest_only_balloon" ? "sm:col-span-2" : ""}>
          <ProjectDateSelects
            label={
              debt.repaymentMode === "capital_and_interest"
                ? "Date du premier paiement"
                : "Date du premier paiement d'intérêts"
            }
            value={debt.firstPaymentDate}
            onChange={(firstPaymentDate) => onChange({ ...debt, firstPaymentDate })}
            yearOptions={yearOptions}
            idPrefix={`${idPrefix}-first-payment`}
          />
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
}: CapexFinancingEditorProps) {
  const yearOptions = Array.from({ length: projectionYears + 2 }, (_, i) => forecastBaseYear - 1 + i)
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

  const patchServiceMonth = (month: number) => {
    patch({ serviceDate: { year: adjustmentCalendarYear, month } })
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
            year: adjustmentCalendarYear,
            month: config.serviceDate.month,
          },
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
      <div className="min-w-0 space-y-4 rounded-2xl border border-slate-200/90 bg-white/85 p-4 shadow-sm sm:p-5">
        <h3 className="border-b border-slate-200/70 pb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Projet Capex
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="capex-project-name" className="mb-2 block text-sm font-medium text-slate-700">
              Nom du projet
            </Label>
            <Input
              id="capex-project-name"
              value={config.projectName}
              onChange={(e) => patch({ projectName: e.target.value })}
              placeholder="Ex. : Achat équipement production"
            />
          </div>
          <MonthOnlySelect
            label="Mois de mise en service"
            month={config.serviceDate.month}
            yearLabel={yearLabel}
            onMonthChange={patchServiceMonth}
            id="capex-service-month"
          />
        </div>
        {adjustmentAmount <= 0 ? (
          <p className="rounded-md border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-900">
            Aucun montant capex pour cette année. Définissez un ajustement dans l&apos;onglet Ajustement avant
            d&apos;enregistrer le financement.
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            Montant capex annuel (onglet Ajustement) :{" "}
            <span className="font-semibold tabular-nums text-slate-800">{formatCurrency(adjustmentAmount)}</span>
          </p>
        )}
      </div>

      <div className="min-w-0 space-y-3 rounded-2xl border border-slate-200/90 bg-white/85 p-4 shadow-sm sm:p-5">
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
            canReplicateToFollowingYears={canReplicateCalendar}
            replicateToFollowingYears={replicateCalendar}
            onReplicateChange={onReplicateCalendarChange}
            replicateCheckboxId="capex-disbursement-calendar-replicate"
            monthPercents={disbursementSeasonalityMonthPercents}
            onMonthPercentsChange={onDisbursementSeasonalityChange}
          />
        </div>
      ) : null}
    </div>
  )
}
