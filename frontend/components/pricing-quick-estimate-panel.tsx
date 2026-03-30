"use client"

import { Minus, Plus } from "lucide-react"
import { Label } from "@/components/ui/label"

export type PricingQuickEstimatePanelProps = {
  revenueM: number
  onRevenueMChange: (value: number) => void
  companies: number
  onCompaniesChange: (value: number) => void
}

export function PricingQuickEstimatePanel({
  revenueM,
  onRevenueMChange,
  companies,
  onCompaniesChange,
}: PricingQuickEstimatePanelProps) {
  return (
    <div className="space-y-8">
      <p className="text-sm leading-relaxed text-[#5C5F66]">
        Ajustez les paramètres : les fourchettes correspondantes s&apos;affichent à droite, à côté des{" "}
        <span className="font-medium text-[#2A2F3A]">frais d&apos;implantation</span> et de l&apos;
        <span className="font-medium text-[#2A2F3A]">abonnement</span>. L&apos;estimation inclut l&apos;ensemble des
        fonctionnalités utiles au pilotage et à la{" "}
        <span className="font-medium text-[#2A2F3A]">valorisation de l&apos;entreprise</span>, dont les prévisions et
        l&apos;évaluation.
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
        <p className="text-sm font-semibold text-[#2A2F3A]">Offre reflétée dans l&apos;estimation</p>
        <p className="mt-2 text-xs leading-relaxed text-[#5C5F66]">
          Prévisions financières et budgets, ainsi que valorisation et diagnostic d&apos;entreprise, sont intégrés à
          l&apos;offre prise en compte ici — au même titre que le reste de la plateforme — pour soutenir la création de
          valeur.
        </p>
      </div>
    </div>
  )
}
