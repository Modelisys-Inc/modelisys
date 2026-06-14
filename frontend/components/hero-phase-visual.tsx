import type { ReactNode } from "react"
import { Check, AlertTriangle } from "lucide-react"
import type { HeroPerformancePhase } from "@/lib/hero-performance-phases"
import {
  NARRATIVE_BASELINE,
  NARRATIVE_COMPARISON,
  NARRATIVE_DIVISIONS,
  NARRATIVE_PILOTAGE,
  NARRATIVE_PROJECTION,
} from "@/lib/hero-narrative-metrics"

type Props = { phase: HeroPerformancePhase }

function DashboardSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#C9B8A5]/65">{children}</p>
  )
}

function HierarchyPerimeterNav({ active = "Divisions" }: { active: "Groupe" | "Sociétés" | "Divisions" }) {
  const levels = ["Groupe", "Sociétés", "Divisions"] as const
  return (
    <div
      className="flex flex-wrap items-center gap-x-1.5 text-[9px] font-semibold uppercase tracking-[0.12em]"
      aria-label={`Périmètre : ${levels.join(", ")} — ${active} sélectionné`}
    >
      {levels.map((level, index) => (
        <span key={level} className="inline-flex items-center gap-x-1.5">
          {index > 0 ? <span className="text-[#C9B8A5]/30">|</span> : null}
          <span className={level === active ? "text-[#E0742D]" : "text-[#C9B8A5]/55"}>{level}</span>
        </span>
      ))}
    </div>
  )
}

function DiagnosticVisual() {
  const products = [
    { name: "Produit A", margin: "32 %" },
    { name: "Produit B", margin: "24 %" },
  ]

  return (
    <div
      className="overflow-hidden rounded-xl border border-white/[0.09] bg-white/[0.025] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
      role="img"
      aria-label="Tableau de bord diagnostic : groupe, sociétés, divisions, marges, valeur et risques"
    >
      <div className="border-b border-white/[0.07] px-3 py-2.5">
        <HierarchyPerimeterNav active="Divisions" />
        <table className="mt-2 w-full table-fixed border-separate border-spacing-y-1">
          <colgroup>
            <col />
            <col className="w-[4.75rem]" />
            <col className="w-[4.75rem]" />
            <col className="w-[4.75rem]" />
          </colgroup>
          <thead>
            <tr className="text-[9px] font-medium uppercase tracking-wide text-[#C9B8A5]/50">
              <th className="pb-1.5 pr-2 text-left font-medium" scope="col" />
              <th className="px-1 pb-1.5 text-right font-medium" scope="col">
                Revenus
              </th>
              <th className="px-1 pb-1.5 text-right font-medium" scope="col">
                Marge brute
              </th>
              <th className="pl-1 pb-1.5 text-right font-medium" scope="col">
                BAIIA
              </th>
            </tr>
          </thead>
          <tbody>
            {NARRATIVE_DIVISIONS.map((division) => (
              <tr key={division.name}>
                <th
                  className="rounded-l-lg bg-white/[0.03] py-1.5 pr-2 pl-2 text-left text-[11px] font-medium text-[#E6D6C3]/92"
                  scope="row"
                >
                  {division.name}
                </th>
                <td className="bg-white/[0.03] px-1 py-1.5 text-right font-mono text-[11px] tabular-nums text-[#E6D6C3]/88">
                  {division.revenue}
                </td>
                <td className="bg-white/[0.03] px-1 py-1.5 text-right font-mono text-[11px] tabular-nums text-[#E0742D]/90">
                  {division.grossMargin}
                </td>
                <td className="rounded-r-lg bg-white/[0.03] py-1.5 pr-2 pl-1 text-right font-mono text-[11px] tabular-nums text-[#E6B08C]/90">
                  {division.baiia}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 border-b border-white/[0.07]">
        {/* Marges produits */}
        <div className="border-r border-white/[0.07] px-3 py-2.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#C9B8A5]/65">Marges</p>
          <ul className="mt-2 space-y-1.5">
            {products.map((product) => (
              <li key={product.name} className="flex items-center justify-between gap-2">
                <span className="truncate text-[11px] text-[#E6D6C3]/88">{product.name}</span>
                <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-[#E0742D]">
                  {product.margin}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Valeur */}
        <div className="px-3 py-2.5">
          <DashboardSectionLabel>Valeur d&apos;entreprise</DashboardSectionLabel>
          <p className="mt-2 font-mono text-xl font-semibold tabular-nums tracking-tight text-[#E6D6C3]">
            {NARRATIVE_BASELINE.valeur}
          </p>
          <p className="mt-1 text-[10px] text-[#C9B8A5]/65">
            {NARRATIVE_BASELINE.multiple} BAIIA norm. · {NARRATIVE_BASELINE.revenus} revenus
          </p>
        </div>
      </div>

      {/* Risques */}
      <div className="px-3 py-2.5">
        <DashboardSectionLabel>Risques opérationnels</DashboardSectionLabel>
        <ul className="mt-2 space-y-1.5">
          <li className="flex items-start gap-2 rounded-lg border border-[#E0742D]/20 bg-[#E0742D]/[0.06] px-2 py-1.5">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-[#E0742D]" strokeWidth={2} />
            <span className="text-[10px] leading-snug text-[#E6D6C3]/90">
              <span className="font-medium text-[#E0742D]/90">Risque · </span>
              Concentration client — 45 % chez 3 clients
            </span>
          </li>
          <li className="flex items-start gap-2 rounded-lg border border-[#E6B08C]/20 bg-[#E6B08C]/[0.06] px-2 py-1.5">
            <Check className="mt-0.5 h-3 w-3 shrink-0 text-[#E6B08C]" strokeWidth={2.5} />
            <span className="text-[10px] leading-snug text-[#E6D6C3]/90">
              <span className="font-medium text-[#E6B08C]/90">Force · </span>
              Marge brute stable — {NARRATIVE_BASELINE.margeBrute} consolidée · BAIIA {NARRATIVE_BASELINE.baiia}
            </span>
          </li>
        </ul>
      </div>
    </div>
  )
}

function PlanificationVisual() {
  const { an1, an2, an3 } = NARRATIVE_PROJECTION

  const projectionRows: {
    label: string
    an1: string
    an2: string
    an3: string
    valueTone?: "default" | "accent" | "gold"
    groupStart?: boolean
  }[] = [
    { label: "Revenus", an1: an1.revenus, an2: an2.revenus, an3: an3.revenus },
    { label: "Marge BAIIA", an1: an1.margeBaiia, an2: an2.margeBaiia, an3: an3.margeBaiia, valueTone: "accent" },
    { label: "BAIIA", an1: an1.baiia, an2: an2.baiia, an3: an3.baiia, valueTone: "gold" },
    {
      label: "Valeur d'entreprise",
      an1: an1.valeur,
      an2: an2.valeur,
      an3: an3.valeur,
      valueTone: "gold",
      groupStart: true,
    },
    { label: "Fonds de roulement", an1: an1.fondsRoulement, an2: an2.fondsRoulement, an3: an3.fondsRoulement },
    { label: "Capex", an1: an1.capex, an2: an2.capex, an3: an3.capex },
    { label: "Dette", an1: an1.dette, an2: an2.dette, an3: an3.dette },
    { label: "Cash flow", an1: an1.cashFlow, an2: an2.cashFlow, an3: an3.cashFlow, valueTone: "gold" },
  ]

  const valueClass = (tone: "default" | "accent" | "gold" = "default") => {
    if (tone === "accent") return "text-[#E0742D]/90"
    if (tone === "gold") return "text-[#E6B08C]/90"
    return "text-[#E6D6C3]/90"
  }

  return (
    <div
      className="overflow-hidden rounded-xl border border-white/[0.09] bg-white/[0.025] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
      role="img"
      aria-label="Tableau de bord planification : projections sur trois ans"
    >
      <div className="border-b border-white/[0.07] px-3 py-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#E0742D]/85">
          Scénario projeté · horizon 36 mois
        </p>
      </div>

      <div className="px-3 py-2">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col />
            <col className="w-[3.25rem] sm:w-[3.75rem]" />
            <col className="w-[3.25rem] sm:w-[3.75rem]" />
            <col className="w-[3.25rem] sm:w-[3.75rem]" />
          </colgroup>
          <thead>
            <tr className="border-b border-white/[0.07] text-[9px] font-medium uppercase tracking-wide text-[#C9B8A5]/50">
              <th className="pb-2 pr-2 text-left font-medium" scope="col" />
              <th className="px-0.5 pb-2 text-right font-medium" scope="col">
                An 1
              </th>
              <th className="px-0.5 pb-2 text-right font-medium" scope="col">
                An 2
              </th>
              <th className="pl-0.5 pb-2 text-right font-medium" scope="col">
                An 3
              </th>
            </tr>
          </thead>
          <tbody>
            {projectionRows.map((row) => (
              <tr
                key={row.label}
                className={row.groupStart ? "border-t border-white/[0.07]" : undefined}
              >
                <th
                  className="py-[0.4rem] pr-2 text-left text-[10px] font-medium text-[#C9B8A5]/75 sm:text-[11px]"
                  scope="row"
                >
                  {row.label}
                </th>
                <td
                  className={`px-0.5 py-[0.4rem] text-right font-mono text-[10px] tabular-nums sm:text-[11px] ${valueClass(row.valueTone)}`}
                >
                  {row.an1}
                </td>
                <td
                  className={`px-0.5 py-[0.4rem] text-right font-mono text-[10px] tabular-nums sm:text-[11px] ${valueClass(row.valueTone)}`}
                >
                  {row.an2}
                </td>
                <td
                  className={`py-[0.4rem] pr-0 pl-0.5 text-right font-mono text-[10px] tabular-nums sm:text-[11px] ${valueClass(row.valueTone)}`}
                >
                  {row.an3}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PilotageVisual() {
  const { periode, rows, note } = NARRATIVE_PILOTAGE

  const ecartClass = (tone: "positive" | "negative" | "neutral") => {
    if (tone === "positive") return "text-[#E6B08C]/90"
    if (tone === "negative") return "text-[#E0742D]/90"
    return "text-[#C9B8A5]/70"
  }

  return (
    <div
      className="overflow-hidden rounded-xl border border-white/[0.09] bg-white/[0.025] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
      role="img"
      aria-label="Tableau de bord pilotage : comparaison réel, prévu et passé avec notes d'explication des écarts"
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-3 py-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#E0742D]/85">
          Analyse des écarts
        </p>
        <span className="shrink-0 font-mono text-[9px] tabular-nums text-[#C9B8A5]/55">{periode}</span>
      </div>

      <div className="px-3 py-2">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col />
            <col className="w-[2.5rem] sm:w-[2.85rem]" />
            <col className="w-[2.5rem] sm:w-[2.85rem]" />
            <col className="w-[2.5rem] sm:w-[2.85rem]" />
            <col className="w-[2.35rem] sm:w-[2.65rem]" />
          </colgroup>
          <thead>
            <tr className="border-b border-white/[0.07] text-[9px] font-medium uppercase tracking-wide text-[#C9B8A5]/50">
              <th className="pb-2 pr-2 text-left font-medium" scope="col" />
              <th className="px-0.5 pb-2 text-right font-medium" scope="col">
                Passé
              </th>
              <th className="px-0.5 pb-2 text-right font-medium" scope="col">
                Prévu
              </th>
              <th className="px-0.5 pb-2 text-right font-medium" scope="col">
                Réel
              </th>
              <th className="pb-2 pl-0.5 text-right font-medium" scope="col">
                Écart
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th
                  className="py-[0.35rem] pr-2 text-left text-[10px] font-medium text-[#C9B8A5]/75 sm:text-[11px]"
                  scope="row"
                >
                  {row.label}
                </th>
                <td className="px-0.5 py-[0.35rem] text-right font-mono text-[10px] tabular-nums text-[#C9B8A5]/55 sm:text-[11px]">
                  {row.passe}
                </td>
                <td className="px-0.5 py-[0.35rem] text-right font-mono text-[10px] tabular-nums text-[#E6D6C3]/75 sm:text-[11px]">
                  {row.prevu}
                </td>
                <td className="px-0.5 py-[0.35rem] text-right font-mono text-[10px] font-medium tabular-nums text-[#E6D6C3]/92 sm:text-[11px]">
                  {row.reel}
                </td>
                <td
                  className={`py-[0.35rem] pl-0.5 text-right font-mono text-[10px] font-medium tabular-nums sm:text-[11px] ${ecartClass(row.ecartTone)}`}
                >
                  {row.ecart}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-white/[0.07] px-3 py-2.5">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#C9B8A5]/60">
          Notes · explication des écarts
        </p>
        <ul className="mt-2 space-y-1.5">
          <li className="flex gap-2 text-[10px] leading-snug text-[#E6D6C3]/85 sm:text-[11px]">
            <span className="mt-1.5 h-px w-2 shrink-0 bg-[#E6B08C]/60" aria-hidden />
            <span>
              <span className="font-medium text-[#E6B08C]/90">Revenus · </span>
              {note.revenus}
            </span>
          </li>
          <li className="flex gap-2 text-[10px] leading-snug text-[#E6D6C3]/85 sm:text-[11px]">
            <span className="mt-1.5 h-px w-2 shrink-0 bg-[#E0742D]/60" aria-hidden />
            <span>
              <span className="font-medium text-[#E0742D]/90">Marge · </span>
              {note.marge}
            </span>
          </li>
          <li className="flex gap-2 text-[10px] leading-snug text-[#E6D6C3]/85 sm:text-[11px]">
            <span className="mt-1.5 h-px w-2 shrink-0 bg-[#E0742D]/60" aria-hidden />
            <span>
              <span className="font-medium text-[#E0742D]/90">Capex · </span>
              {note.capex}
            </span>
          </li>
        </ul>
      </div>
    </div>
  )
}

const visuals: Record<HeroPerformancePhase, () => ReactNode> = {
  Diagnostic: DiagnosticVisual,
  Planification: PlanificationVisual,
  Pilotage: PilotageVisual,
}

export function HeroPerformanceMetrics() {
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-x-4">
      {NARRATIVE_COMPARISON.map(({ label, today, target }, index) => (
        <div key={label} className="flex items-center gap-3">
          {index > 0 ? <span className="hidden h-3 w-px bg-white/10 sm:block" aria-hidden /> : null}
          <p className="text-[10px] leading-none text-[#C9B8A5]/65">
            <span className="text-[#C9B8A5]/50">{label}</span>{" "}
            <span className="font-mono tabular-nums text-[#E6D6C3]/85">{today}</span>
            <span className="mx-1 text-[#E0742D]/55">→</span>
            <span className="font-mono tabular-nums text-[#E6B08C]/85">{target}</span>
          </p>
        </div>
      ))}
    </div>
  )
}

export function HeroPhaseVisual({ phase }: Props) {
  const Visual = visuals[phase]
  return (
    <div key={phase} className="animate-in fade-in-0 w-full min-w-0 duration-300">
      <Visual />
    </div>
  )
}
