"use client"

import { Label } from "@/components/ui/label"
import type { PricingComplexityLevel } from "@/lib/pricing-estimate"

const COMPLEXITY_CHOICES: {
  value: PricingComplexityLevel
  title: string
  description: string
}[] = [
  {
    value: "standard",
    title: "Standard",
    description:
      "En général, un périmètre plus simple : peu de blocs ou de divisions à gérer, peu ou pas d’écritures intercos, pas de suivi particulier des devises.",
  },
  {
    value: "modere",
    title: "Modéré",
    description:
      "Complexité intermédiaire : plusieurs divisions ou entités, des intercos à traiter, une devise principale sans enjeu majeur de change.",
  },
  {
    value: "eleve",
    title: "Élevé",
    description:
      "Périmètre plus large ou plus exigeant : nombreuses divisions ou entités à intégrer, volume d’intercos, taux de change et devises à considérer.",
  },
]

export type PricingQuickEstimatePanelProps = {
  revenueM: number
  onRevenueMChange: (value: number) => void
  entityBand: "1" | "2-4" | "5-9" | "10+"
  onEntityBandChange: (value: "1" | "2-4" | "5-9" | "10+") => void
  complexityLevel: PricingComplexityLevel
  onComplexityLevelChange: (value: PricingComplexityLevel) => void
}

export function PricingQuickEstimatePanel({
  revenueM,
  onRevenueMChange,
  entityBand,
  onEntityBandChange,
  complexityLevel,
  onComplexityLevelChange,
}: PricingQuickEstimatePanelProps) {
  const complexityDescription =
    COMPLEXITY_CHOICES.find((c) => c.value === complexityLevel)?.description ?? ""

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
          Nombre d&apos;entités
        </Label>
        <select
          value={entityBand}
          onChange={(e) => onEntityBandChange(e.target.value as "1" | "2-4" | "5-9" | "10+")}
          className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base font-semibold text-[#2A2F3A] shadow-sm transition focus:border-[#E0742D]/70 focus:outline-none"
        >
          <option value="1">1 Entité</option>
          <option value="2-4">2 à 4 Entités</option>
          <option value="5-9">5 à 9 Entités</option>
          <option value="10+">10 Entités +</option>
        </select>
      </div>

      <div>
        <Label htmlFor="quick-complexity" className="mb-3 block text-base font-semibold text-[#2A2F3A]">
          Niveau de complexité
        </Label>
        <select
          id="quick-complexity"
          value={complexityLevel}
          onChange={(e) => onComplexityLevelChange(e.target.value as PricingComplexityLevel)}
          className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base font-semibold text-[#2A2F3A] shadow-sm transition focus:border-[#E0742D]/70 focus:outline-none"
          aria-describedby="quick-complexity-desc quick-complexity-estimate-hint"
        >
          {COMPLEXITY_CHOICES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.title}
            </option>
          ))}
        </select>
        <p id="quick-complexity-desc" className="mt-3 text-sm leading-relaxed text-[#5C5F66]">
          {complexityDescription}
        </p>
        <p id="quick-complexity-estimate-hint" className="mt-2 text-xs leading-relaxed text-[#5C5F66]">
          Repérez le profil qui ressemble le plus à votre situation — chaque cas est unique et nous affinons le périmètre
          avec vous.
        </p>
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
