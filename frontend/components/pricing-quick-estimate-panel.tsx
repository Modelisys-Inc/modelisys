"use client"

import type { PricingComplexityLevel } from "@/lib/pricing-estimate"
import { cn } from "@/lib/utils"

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

const ENTITY_BANDS = [
  { value: "1", label: "1 entité", hint: "Société unique" },
  { value: "2-4", label: "2 à 4", hint: "Petit groupe" },
  { value: "5-9", label: "5 à 9", hint: "Groupe en croissance" },
  { value: "10+", label: "10 +", hint: "Structure étendue" },
] as const

export type PricingQuickEstimatePanelProps = {
  revenueM: number
  onRevenueMChange: (value: number) => void
  entityBand: "1" | "2-4" | "5-9" | "10+"
  onEntityBandChange: (value: "1" | "2-4" | "5-9" | "10+") => void
  complexityLevel: PricingComplexityLevel
  onComplexityLevelChange: (value: PricingComplexityLevel) => void
}

function FieldCard({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-full flex-col rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <div className="mt-4 flex flex-1 flex-col">{children}</div>
    </div>
  )
}

function OptionButton({
  selected,
  onClick,
  label,
  hint,
}: {
  selected: boolean
  onClick: () => void
  label: string
  hint?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left transition",
        selected ? "bg-[#E0742D]/[0.07] ring-1 ring-[#E0742D]/35" : "hover:bg-slate-50",
      )}
    >
      <span className="text-sm font-semibold text-[#2A2F3A]">{label}</span>
      {hint ? <span className="text-[10px] font-medium text-[#5C5F66]">{hint}</span> : null}
    </button>
  )
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
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-[#5C5F66]">
        Ajustez les paramètres : les fourchettes se mettent à jour dans les cartes{" "}
        <span className="font-medium text-[#2A2F3A]">01 et 02</span>. L&apos;
        <span className="font-medium text-[#2A2F3A]">accompagnement stratégique</span> reste sur devis.
      </p>

      <div className="grid gap-4 md:grid-cols-3 lg:gap-5">
        <FieldCard title="Revenus">
          <div className="flex items-end justify-between gap-3">
            <p className="font-mono text-3xl font-semibold leading-none tabular-nums tracking-tight text-[#2A2F3A]">
              {revenueM}
              <span className="ml-1 text-lg font-semibold text-[#E0742D]">M$</span>
            </p>
            <span className="pb-0.5 text-[11px] font-medium text-[#5C5F66]">/ an</span>
          </div>
          <p className="mt-2 text-xs text-[#5C5F66]">Revenus annuels consolidés</p>
          <div className="mt-auto pt-5">
            <input
              id="quick-revenue"
              type="range"
              min={1}
              max={100}
              value={revenueM}
              onChange={(e) => onRevenueMChange(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[#E0742D]"
              aria-valuemin={1}
              aria-valuemax={100}
              aria-valuenow={revenueM}
              aria-label="Revenus annuels consolidés en millions de dollars"
            />
            <div className="mt-2 flex justify-between text-[10px] font-medium tabular-nums text-[#5C5F66]">
              <span>1 M$</span>
              <span>100 M$</span>
            </div>
          </div>
        </FieldCard>

        <FieldCard title="Nombre d'entités">
          <div className="space-y-1 rounded-xl border border-slate-200/90 bg-slate-50/70 p-1">
            {ENTITY_BANDS.map((band) => (
              <OptionButton
                key={band.value}
                selected={entityBand === band.value}
                onClick={() => onEntityBandChange(band.value)}
                label={band.label}
                hint={band.hint}
              />
            ))}
          </div>
        </FieldCard>

        <FieldCard title="Complexité">
          <div className="space-y-1 rounded-xl border border-slate-200/90 bg-slate-50/70 p-1">
            {COMPLEXITY_CHOICES.map((choice) => (
              <OptionButton
                key={choice.value}
                selected={complexityLevel === choice.value}
                onClick={() => onComplexityLevelChange(choice.value)}
                label={choice.title}
              />
            ))}
          </div>
        </FieldCard>
      </div>

      {complexityDescription ? (
        <p
          id="quick-complexity-desc"
          className="border-l-2 border-[#E0742D]/35 pl-4 text-sm leading-relaxed text-[#5C5F66]"
        >
          {complexityDescription}
        </p>
      ) : null}
    </div>
  )
}
