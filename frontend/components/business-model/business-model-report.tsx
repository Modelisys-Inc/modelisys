"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InlineTextArea } from "@/components/cmpc/editable"
import { NetTangibleReportSection } from "@/components/net-tangible/report-section"
import type { BusinessRiskDefinition, BusinessRiskLevel } from "@/lib/business-model-default-risks"
import { cn } from "@/lib/utils"

export type BusinessModelReportProps = {
  companyName: string
  referenceLabel: string
  risks: BusinessRiskDefinition[]
  loading?: boolean
  onLevelChange: (riskId: string, level: BusinessRiskLevel) => void
  onNoteChange: (riskId: string, note: string) => void
}

function categorySectionId(category: string): string {
  return `bm-${category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`
}

function levelLabel(level: BusinessRiskLevel): string {
  if (level === "high") return "Élevé"
  if (level === "medium") return "Modéré"
  if (level === "low") return "Faible"
  return "Non évalué"
}

function levelBadgeClass(level: BusinessRiskLevel): string {
  if (level === "high") return "bg-red-100 text-red-800 ring-1 ring-inset ring-red-200"
  if (level === "medium") return "bg-yellow-100 text-yellow-900 ring-1 ring-inset ring-yellow-300"
  if (level === "low") return "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200"
  return "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200"
}

function levelAccentBarClass(level: BusinessRiskLevel): string {
  if (level === "high") return "bg-red-500"
  if (level === "medium") return "bg-yellow-400"
  if (level === "low") return "bg-emerald-500"
  return "bg-slate-300"
}

function levelSelectClass(level: BusinessRiskLevel): string {
  if (level === "high") return "border-red-300 bg-red-50 text-red-800 focus:ring-red-200"
  if (level === "medium")
    return "border-yellow-300 bg-yellow-50 text-yellow-900 focus:ring-yellow-200"
  if (level === "low")
    return "border-emerald-300 bg-emerald-50 text-emerald-800 focus:ring-emerald-200"
  return "border-slate-200 bg-white text-[#2A2F3A]"
}

function levelChipClass(level: Exclude<BusinessRiskLevel, null> | "pending"): string {
  if (level === "high") return "bg-red-50 text-red-800 ring-1 ring-inset ring-red-200"
  if (level === "medium") return "bg-yellow-50 text-yellow-900 ring-1 ring-inset ring-yellow-300"
  if (level === "low") return "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200"
  return "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200"
}

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
}

function riskAnchorId(riskId: string): string {
  return `bm-risk-${riskId}`
}

function RiskLevelBadge({ level }: { level: BusinessRiskLevel }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        levelBadgeClass(level),
      )}
    >
      {levelLabel(level)}
    </span>
  )
}

function RiskRow({
  risk,
  onLevelChange,
  onNoteChange,
}: {
  risk: BusinessRiskDefinition
  onLevelChange: (riskId: string, level: BusinessRiskLevel) => void
  onNoteChange: (riskId: string, note: string) => void
}) {
  return (
    <div
      id={riskAnchorId(risk.id)}
      className="relative scroll-mt-28 border-b border-slate-200 py-5 pl-4 last:border-b-0"
      data-testid={`business-model-risk-${risk.id}`}
    >
      <div
        className={cn(
          "absolute top-5 bottom-5 left-0 w-1 rounded-full",
          levelAccentBarClass(risk.level),
        )}
        aria-hidden
      />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <h3 className="text-sm font-semibold text-[#2A2F3A]">{risk.name}</h3>
            <RiskLevelBadge level={risk.level} />
          </div>
          <p className="mt-1.5 text-pretty text-sm leading-relaxed text-slate-500">
            {risk.description}
          </p>
        </div>
        <div className="w-full shrink-0 lg:w-48">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Niveau
          </p>
          <Select
            value={risk.level ?? undefined}
            onValueChange={(value) =>
              onLevelChange(risk.id, value as Exclude<BusinessRiskLevel, null>)
            }
          >
            <SelectTrigger
              data-testid={`business-model-level-${risk.id}`}
              className={cn("h-9 text-sm font-medium", levelSelectClass(risk.level))}
            >
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">Élevé</SelectItem>
              <SelectItem value="medium">Modéré</SelectItem>
              <SelectItem value="low">Faible</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Impact sur la valorisation
          </p>
          <p className="mt-1.5 text-pretty text-xs leading-relaxed text-slate-500">{risk.impact}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recommandation
          </p>
          <p className="mt-1.5 text-pretty text-xs leading-relaxed text-slate-500">
            {risk.recommendation}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Source / justification
        </p>
        <InlineTextArea
          value={risk.note ?? ""}
          onChange={(note) => onNoteChange(risk.id, note)}
          ariaLabel={`Note — ${risk.name}`}
          placeholder="Justifiez le niveau de risque retenu…"
          testId={`business-model-note-${risk.id}`}
          rows={2}
        />
      </div>
    </div>
  )
}

export function BusinessModelReport({
  companyName,
  referenceLabel,
  risks,
  loading,
  onLevelChange,
  onNoteChange,
}: BusinessModelReportProps) {
  const highRisks = risks.filter((r) => r.level === "high")
  const mediumCount = risks.filter((r) => r.level === "medium").length
  const lowCount = risks.filter((r) => r.level === "low").length
  const unassessedCount = risks.filter((r) => r.level === null).length
  const assessedCount = risks.length - unassessedCount
  const progressPct =
    risks.length > 0 ? Math.round((assessedCount / risks.length) * 100) : 0

  const risksByCategory = risks.reduce(
    (acc, risk) => {
      if (!acc[risk.category]) acc[risk.category] = []
      acc[risk.category]!.push(risk)
      return acc
    },
    {} as Record<string, BusinessRiskDefinition[]>,
  )
  const categories = Object.keys(risksByCategory)

  const nav = [
    { id: "methode", label: "1. Méthode" },
    { id: "sommaire", label: "2. Sommaire" },
    ...categories.map((category, index) => ({
      id: categorySectionId(category),
      label: `${index + 3}. ${category}`,
    })),
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 shadow-lg">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#E0742D]" />
      </div>
    )
  }

  return (
    <article
      data-testid="business-model-report"
      data-report-sheet
      className="overflow-hidden rounded-xl border border-[#E6D6C3]/35 bg-white shadow-[0_18px_50px_-28px_rgba(34,39,50,0.45)] ring-1 ring-[#222732]/[0.04]"
    >
      <section
        data-testid="business-model-overview-strip"
        data-break-avoid
        className="w-full border-b border-[#E6D6C3]/45 bg-gradient-to-b from-[#222732]/[0.025] to-white"
      >
        <div className="border-b border-[#E6D6C3]/40 bg-[#222732]/[0.02] px-6 py-5 sm:px-12">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/90">
            Sommaire de la conclusion
          </p>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
            Répartition des risques évalués et progression de l&apos;analyse à la date de
            référence.
          </p>
        </div>
        <div className="overflow-x-auto px-6 py-1 sm:px-12">
          <table className="w-full min-w-[420px]">
            <thead>
              <tr className="border-b border-[#E6D6C3]/55 text-left">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Indicateur
                </th>
                <th className="py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Valeur
                </th>
              </tr>
            </thead>
            <tbody>
          {[
            { id: "high", label: "Élevés", value: highRisks.length },
            { id: "medium", label: "Modérés", value: mediumCount },
            { id: "low", label: "Faibles", value: lowCount },
            { id: "pending", label: "Non évalués", value: unassessedCount },
            { id: "progress", label: "Progression", value: `${progressPct} %` },
          ].map((metric) => (
            <tr
              key={metric.id}
              data-testid={`business-model-overview-${metric.id}`}
              className="border-b border-slate-100 align-middle last:border-b-0"
            >
              <td className="py-3 pr-4 text-sm font-medium text-[#222732]">{metric.label}</td>
              <td className="py-3 text-right font-mono text-sm tabular-nums text-[#222732]">
                {metric.value}
              </td>
            </tr>
          ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="px-6 pb-8 pt-10 sm:px-12 sm:pb-12">
        <div className="mb-6" aria-hidden>
          <div className="h-px w-full bg-gradient-to-r from-[#E0742D]/80 via-[#E6D6C3]/50 to-transparent" />
        </div>

        <div className="mb-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/90">
            Détail du rapport
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Parcourez le sommaire et les catégories de risques pour documenter l&apos;analyse.
          </p>
        </div>

        <nav
          data-testid="business-model-section-menu"
          aria-label="Sommaire du rapport"
          className="flex flex-wrap gap-1 border-b border-slate-200 pb-3"
        >
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-[#222732]/[0.03] hover:text-[#222732]"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <NetTangibleReportSection id="methode" number="1." title="Méthode et périmètre">
        <p className="text-pretty text-sm leading-relaxed text-slate-500">
          L&apos;analyse du modèle d&apos;affaires vise à identifier les risques susceptibles
          d&apos;affecter la stabilité des revenus, la résilience opérationnelle et, in fine, le
          multiple de valorisation retenu. Chaque risque est classé selon un niveau (faible,
          modéré ou élevé) et documenté par une note de justification.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-slate-500">
          <li className="flex gap-2">
            <span className="font-mono text-[#E0742D]">01</span>
            <span>
              Évaluez chaque risque en sélectionnant un niveau cohérent avec la situation de
              l&apos;entreprise.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-[#E0742D]">02</span>
            <span>
              Documentez la source / justification ; l&apos;enregistrement est automatique.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-[#E0742D]">03</span>
            <span>
              Priorisez les risques élevés : ils pèsent le plus sur l&apos;attractivité et le
              multiple.
            </span>
          </li>
        </ul>
        </NetTangibleReportSection>

        <NetTangibleReportSection id="sommaire" number="2." title="Sommaire de l'évaluation">
        <p className="text-pretty text-sm leading-relaxed text-slate-500">
          {assessedCount} risque{assessedCount > 1 ? "s" : ""} évalué
          {assessedCount > 1 ? "s" : ""} sur {risks.length} · {unassessedCount} en attente.
        </p>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#E0742D] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {highRisks.length > 0 ? (
          <div className="mt-6">
            <p className="text-sm font-semibold text-[#2A2F3A]">
              Plan d&apos;action prioritaire
            </p>
            <p className="mt-2 text-pretty text-sm leading-relaxed text-slate-500">
              {highRisks.length} risque{highRisks.length > 1 ? "s" : ""} élevé
              {highRisks.length > 1 ? "s" : ""} identifié
              {highRisks.length > 1 ? "s" : ""} — à traiter en priorité pour soutenir le multiple.
            </p>
            <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
              {highRisks.map((risk, idx) => (
                <button
                  key={risk.id}
                  type="button"
                  onClick={() => scrollToSection(riskAnchorId(risk.id))}
                  data-testid={`business-model-action-${risk.id}`}
                  className="group flex w-full gap-3 py-3 text-left transition-colors hover:bg-slate-50"
                >
                  <span className="font-mono text-xs text-[#E0742D]">
                    {(idx + 1).toString().padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#2A2F3A] underline decoration-slate-300 underline-offset-2 group-hover:decoration-[#E0742D]">
                      {risk.name}
                      <span className="ml-2 text-xs font-normal text-slate-400 no-underline">
                        {risk.category} →
                      </span>
                    </p>
                    <p className="mt-1 text-pretty text-xs leading-relaxed text-slate-500">
                      {risk.recommendation}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-pretty text-sm leading-relaxed text-slate-500">
            Aucun risque élevé pour le moment. Poursuivez l&apos;évaluation des catégories
            ci-dessous.
          </p>
        )}
        </NetTangibleReportSection>

        {categories.map((category, index) => {
          const categoryRisks = risksByCategory[category] ?? []
          const high = categoryRisks.filter((r) => r.level === "high").length
          const medium = categoryRisks.filter((r) => r.level === "medium").length
          const low = categoryRisks.filter((r) => r.level === "low").length
          const pending = categoryRisks.filter((r) => r.level === null).length
          const sectionNumber = `${index + 3}.`
          return (
            <NetTangibleReportSection
              key={category}
              id={categorySectionId(category)}
              number={sectionNumber}
              title={category}
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-sm text-slate-500">
                  {categoryRisks.length} risque{categoryRisks.length > 1 ? "s" : ""}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold",
                    levelChipClass("high"),
                  )}
                >
                  {high} élevé{high > 1 ? "s" : ""}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold",
                    levelChipClass("medium"),
                  )}
                >
                  {medium} modéré{medium > 1 ? "s" : ""}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold",
                    levelChipClass("low"),
                  )}
                >
                  {low} faible{low > 1 ? "s" : ""}
                </span>
                {pending > 0 ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold",
                      levelChipClass("pending"),
                    )}
                  >
                    {pending} non évalué{pending > 1 ? "s" : ""}
                  </span>
                ) : null}
              </div>
              <div className="mt-1">
                {categoryRisks.map((risk) => (
                  <RiskRow
                    key={risk.id}
                    risk={risk}
                    onLevelChange={onLevelChange}
                    onNoteChange={onNoteChange}
                  />
                ))}
              </div>
            </NetTangibleReportSection>
          )
        })}

        <footer className="mt-10 border-t border-slate-200 pt-4">
          <p className="text-pretty text-[11px] leading-relaxed text-slate-500">
            Rapport indicatif d&apos;évaluation des risques du modèle d&apos;affaires · {companyName}{" "}
            · {referenceLabel}
          </p>
        </footer>
      </div>
    </article>
  )
}
