"use client"

import { Minus, Plus } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { PRICING_ADDITIONAL_MODULES } from "@/lib/pricing-estimate"

const PROJECTIONS_ID = "previsions-budgets" as const
const EVALUATION_ID = "valorisation-diagnostic" as const

export type PricingQuickEstimatePanelProps = {
  revenueM: number
  onRevenueMChange: (value: number) => void
  companies: number
  onCompaniesChange: (value: number) => void
  addProjections: boolean
  onAddProjectionsChange: (value: boolean) => void
  addEvaluation: boolean
  onAddEvaluationChange: (value: boolean) => void
}

export function PricingQuickEstimatePanel({
  revenueM,
  onRevenueMChange,
  companies,
  onCompaniesChange,
  addProjections,
  onAddProjectionsChange,
  addEvaluation,
  onAddEvaluationChange,
}: PricingQuickEstimatePanelProps) {
  const projectionsMeta = PRICING_ADDITIONAL_MODULES.find((m) => m.id === PROJECTIONS_ID)
  const evaluationMeta = PRICING_ADDITIONAL_MODULES.find((m) => m.id === EVALUATION_ID)

  return (
    <div className="space-y-8">
      <p className="text-sm leading-relaxed text-[#5C5F66]">
        Ajustez les paramètres : les fourchettes correspondantes s&apos;affichent à droite, à côté des{" "}
        <span className="font-medium text-[#2A2F3A]">frais d&apos;implantation</span> et de l&apos;
        <span className="font-medium text-[#2A2F3A]">abonnement</span>.
      </p>

      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <Label htmlFor="quick-revenue" className="text-base font-semibold text-[#2A2F3A]">
            Revenus annuels (consolidés)
          </Label>
          <span className="rounded-lg bg-[#2A2F3A] px-3 py-1 text-sm font-bold text-white tabular-nums">
            {revenueM}&nbsp;M$
          </span>
        </div>
        <input
          id="quick-revenue"
          type="range"
          min={1}
          max={100}
          value={revenueM}
          onChange={(e) => onRevenueMChange(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#E0742D]"
        />
        <div className="mt-2 flex justify-between text-xs text-[#5C5F66]">
          <span>1&nbsp;M$</span>
          <span>100&nbsp;M$</span>
        </div>
      </div>

      <div>
        <Label className="mb-3 block text-base font-semibold text-[#2A2F3A]">
          Sociétés / divisions rattachées
        </Label>
        <div className="flex items-center justify-center gap-4 sm:justify-start">
          <button
            type="button"
            onClick={() => onCompaniesChange(Math.max(1, companies - 1))}
            className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-[#2A2F3A] shadow-sm transition hover:bg-slate-50"
            aria-label="Diminuer"
          >
            <Minus className="h-5 w-5" />
          </button>
          <div className="min-w-[4rem] rounded-xl border border-slate-200/90 bg-slate-50 py-2 text-center text-2xl font-bold tabular-nums text-[#2A2F3A]">
            {companies}
          </div>
          <button
            type="button"
            onClick={() => onCompaniesChange(companies + 1)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-[#2A2F3A] shadow-sm transition hover:bg-slate-50"
            aria-label="Augmenter"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-4">
        <p className="text-sm font-semibold text-[#2A2F3A]">Modules</p>
        <p className="mt-2 text-xs leading-relaxed text-[#5C5F66]">
          En base, nous incluons l&apos;ensemble de nos fonctionnalités,{" "}
          <span className="font-medium text-[#2A2F3A]">sauf Projections et Évaluation</span>, qui constituent un choix
          distinct. Cochez les options que vous souhaitez ajouter à votre estimation.
        </p>

        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3 rounded-lg border border-slate-200/90 bg-white p-3">
            <Checkbox
              id="quick-projections"
              checked={addProjections}
              onCheckedChange={(v) => onAddProjectionsChange(v === true)}
              className="mt-0.5 border-slate-400 data-[state=checked]:border-[#E0742D] data-[state=checked]:bg-[#E0742D]"
            />
            <div className="min-w-0">
              <Label htmlFor="quick-projections" className="cursor-pointer text-sm font-semibold text-[#2A2F3A]">
                Projections
              </Label>
              <p className="mt-0.5 text-xs text-[#5C5F66]">
                {projectionsMeta?.label} (+{projectionsMeta?.price}$/mois)
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-slate-200/90 bg-white p-3">
            <Checkbox
              id="quick-evaluation"
              checked={addEvaluation}
              onCheckedChange={(v) => onAddEvaluationChange(v === true)}
              className="mt-0.5 border-slate-400 data-[state=checked]:border-[#E0742D] data-[state=checked]:bg-[#E0742D]"
            />
            <div className="min-w-0">
              <Label htmlFor="quick-evaluation" className="cursor-pointer text-sm font-semibold text-[#2A2F3A]">
                Évaluation
              </Label>
              <p className="mt-0.5 text-xs text-[#5C5F66]">
                {evaluationMeta?.label} (+{evaluationMeta?.price}$/mois)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
