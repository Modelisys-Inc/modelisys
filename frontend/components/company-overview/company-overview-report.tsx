"use client"

import { Plus, RotateCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InlineText, InlineTextArea } from "@/components/cmpc/editable"
import { NetTangibleReportSection } from "@/components/net-tangible/report-section"
import { COMPANY_OVERVIEW_GENERAL_INFO_FIELDS } from "@/lib/diagnostic-company-overview"
import { useDiagnosticCompanyOverview } from "@/hooks/use-diagnostic-company-overview"
import { cn } from "@/lib/utils"

export type CompanyOverviewReportProps = {
  diagnosticId: string
  companyName: string
  referenceLabel: string
}

const REPORT_NAV = [
  { id: "methode", label: "1. Méthode" },
  { id: "generales", label: "2. Générales" },
  { id: "historique", label: "3. Historique" },
  { id: "actionnariat", label: "4. Actionnariat" },
  { id: "direction", label: "5. Direction" },
] as const

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
}

function ReportTable({
  headers,
  children,
  className,
}: {
  headers: string[]
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[480px] table-fixed border-collapse">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            {headers.map((header) => (
              <th
                key={header}
                className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {header}
              </th>
            ))}
            <th className="w-10 py-2" aria-hidden />
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function CompanyOverviewReport({
  diagnosticId,
  companyName,
  referenceLabel,
}: CompanyOverviewReportProps) {
  const {
    overview,
    updateGeneralInfo,
    updateMainActivities,
    updateHistory,
    updateParticipatingShareholders,
    updateVotingShareholders,
    updateManagement,
    resetOverview,
    addHistoryEntry,
    removeHistoryEntry,
    addShareholder,
    removeShareholder,
    addVotingShareholder,
    removeVotingShareholder,
    addManagementRow,
    removeManagementRow,
  } = useDiagnosticCompanyOverview(diagnosticId, companyName)

  const stripMetrics = [
    {
      id: "sector",
      label: "Secteur",
      value: overview.generalInfo.sector.trim() || "—",
    },
    {
      id: "incorporation",
      label: "Incorporation",
      value: overview.generalInfo.incorporationYear.trim() || "—",
    },
    {
      id: "employees",
      label: "Employés",
      value: overview.generalInfo.employeeCount.trim() || "—",
    },
    {
      id: "legal",
      label: "Structure",
      value: overview.generalInfo.legalStructure.trim() || "—",
    },
  ]

  return (
    <article
      data-testid="company-overview-section"
      data-report-sheet
      className="rounded-xl border border-slate-200 bg-white px-6 py-8 shadow-lg sm:px-12 sm:py-12"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E0742D]">
            Détermination de la valeur
          </p>
          <h2 className="mt-2 text-balance text-2xl font-semibold leading-tight tracking-tight text-[#2A2F3A] sm:text-3xl">
            Aperçu de l&apos;entreprise
          </h2>
          <p className="mt-3 max-w-3xl text-pretty text-sm leading-relaxed text-slate-500">
            Le présent rapport documente le profil qualitatif de{" "}
            <span className="font-medium text-[#2A2F3A]">{companyName}</span>, en date du{" "}
            <span className="font-medium text-[#2A2F3A]">{referenceLabel}</span>, afin de cadrer
            la valorisation (contexte, historique, actionnariat et direction).
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 border-slate-200 text-slate-600"
          onClick={resetOverview}
          data-testid="company-overview-reset"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Réinitialiser
        </Button>
      </header>

      <section
        data-testid="company-overview-strip"
        data-break-avoid
        className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-[#2A2F3A] text-white shadow-sm"
      >
        <div className="border-b border-white/15 px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E0742D]">
            Sommaire du profil
          </p>
          <p className="mt-2 max-w-3xl text-pretty text-sm leading-relaxed text-white/80">
            Synthèse des informations générales renseignées à la date de référence.
          </p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-white/10 md:grid-cols-4 md:divide-y-0">
          {stripMetrics.map((metric) => (
            <div
              key={metric.id}
              data-testid={`company-overview-strip-${metric.id}`}
              className="flex min-w-0 flex-col gap-1.5 px-3.5 py-3.5 text-left"
            >
              <span className="text-[11px] font-medium uppercase tracking-wide text-white/55">
                {metric.label}
              </span>
              <span className="truncate text-sm font-medium text-white">{metric.value}</span>
            </div>
          ))}
        </div>
      </section>

      <nav
        data-testid="company-overview-section-menu"
        aria-label="Sommaire du rapport"
        className="mt-8 flex flex-wrap gap-1 border-b border-slate-200 pb-3"
      >
        {REPORT_NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => scrollToSection(item.id)}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-[#2A2F3A]"
          >
            {item.label}
          </button>
        ))}
      </nav>

      <NetTangibleReportSection id="methode" number="1." title="Méthode et périmètre">
        <p className="text-pretty text-sm leading-relaxed text-slate-500">
          L&apos;aperçu de l&apos;entreprise regroupe les informations qualitatives utiles à la
          compréhension du contexte d&apos;évaluation : profil sectoriel, jalons historiques,
          structure actionnariale, équipe de direction et description des activités. Ces éléments
          complètent l&apos;analyse financière et le modèle d&apos;affaires.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-slate-500">
          <li className="flex gap-2">
            <span className="font-mono text-[#E0742D]">01</span>
            <span>Renseignez les informations générales et les principales activités.</span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-[#E0742D]">02</span>
            <span>Documentez l&apos;historique, l&apos;actionnariat et la direction.</span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-[#E0742D]">03</span>
            <span>Les saisies sont enregistrées automatiquement pour cette valorisation.</span>
          </li>
        </ul>
      </NetTangibleReportSection>

      <NetTangibleReportSection id="generales" number="2." title="Informations générales">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] table-fixed border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="w-[34%] py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Élément
                </th>
                <th className="py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Information
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPANY_OVERVIEW_GENERAL_INFO_FIELDS.map(({ key, label }) => (
                <tr key={key} className="border-b border-slate-200 align-top">
                  <td className="py-2.5 pr-4 text-sm font-medium text-[#2A2F3A]">{label}</td>
                  <td className="py-2">
                    <InlineText
                      value={overview.generalInfo[key]}
                      onChange={(value) => updateGeneralInfo(key, value)}
                      ariaLabel={label}
                      placeholder="—"
                      testId={`company-overview-general-${key}`}
                      className="text-sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Principales activités
        </p>
        <InlineTextArea
          value={overview.mainActivities}
          onChange={updateMainActivities}
          ariaLabel="Principales activités"
          placeholder="Décrivez les principales activités…"
          testId="company-overview-main-activities"
          rows={5}
          className="mt-2 min-h-[6rem] text-sm text-[#2A2F3A]"
        />
      </NetTangibleReportSection>

      <NetTangibleReportSection id="historique" number="3." title="Historique de l'entreprise">
        <div className="mb-3 flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addHistoryEntry}
            data-testid="company-overview-add-history"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Ajouter
          </Button>
        </div>
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {overview.history.map((entry) => (
            <div
              key={entry.id}
              className="grid gap-3 py-4 md:grid-cols-[7rem_1fr_auto]"
              data-testid={`company-overview-history-${entry.id}`}
            >
              <InlineText
                value={entry.year}
                onChange={(value) =>
                  updateHistory(
                    overview.history.map((row) =>
                      row.id === entry.id ? { ...row, year: value } : row,
                    ),
                  )
                }
                ariaLabel="Année"
                placeholder="Année"
                className="text-sm font-semibold"
              />
              <InlineTextArea
                value={entry.description}
                onChange={(value) =>
                  updateHistory(
                    overview.history.map((row) =>
                      row.id === entry.id ? { ...row, description: value } : row,
                    ),
                  )
                }
                ariaLabel="Description de l'événement"
                placeholder="Description…"
                rows={3}
                className="min-h-[4rem] text-sm text-[#2A2F3A]"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-slate-400 hover:text-red-600"
                onClick={() => removeHistoryEntry(entry.id)}
                aria-label="Supprimer cette entrée"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </NetTangibleReportSection>

      <NetTangibleReportSection id="actionnariat" number="4." title="Actionnariat">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[#2A2F3A]">Actions participantes</p>
          <Button type="button" variant="outline" size="sm" onClick={addShareholder}>
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Ajouter
          </Button>
        </div>
        <ReportTable headers={["Actionnaire", "Pourcentage"]}>
          {overview.participatingShareholders.map((row) => (
            <tr key={row.id} className="border-b border-slate-200">
              <td className="py-2 pr-4">
                <InlineText
                  value={row.name}
                  onChange={(value) =>
                    updateParticipatingShareholders(
                      overview.participatingShareholders.map((item) =>
                        item.id === row.id ? { ...item, name: value } : item,
                      ),
                    )
                  }
                  ariaLabel="Actionnaire"
                  placeholder="Nom"
                  className="text-sm"
                />
              </td>
              <td className="py-2 pr-4">
                <InlineText
                  value={row.percentage}
                  onChange={(value) =>
                    updateParticipatingShareholders(
                      overview.participatingShareholders.map((item) =>
                        item.id === row.id ? { ...item, percentage: value } : item,
                      ),
                    )
                  }
                  ariaLabel="Pourcentage"
                  placeholder="%"
                  className="text-sm"
                />
              </td>
              <td className="py-2 text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-red-600"
                  onClick={() => removeShareholder(row.id)}
                  aria-label="Supprimer l'actionnaire"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </ReportTable>

        <div className="mb-2 mt-8 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[#2A2F3A]">Actions votantes</p>
          <Button type="button" variant="outline" size="sm" onClick={addVotingShareholder}>
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Ajouter
          </Button>
        </div>
        <ReportTable headers={["Actionnaire", "Pourcentage"]}>
          {overview.votingShareholders.map((row) => (
            <tr key={row.id} className="border-b border-slate-200">
              <td className="py-2 pr-4">
                <InlineText
                  value={row.name}
                  onChange={(value) =>
                    updateVotingShareholders(
                      overview.votingShareholders.map((item) =>
                        item.id === row.id ? { ...item, name: value } : item,
                      ),
                    )
                  }
                  ariaLabel="Actionnaire"
                  placeholder="Nom"
                  className="text-sm"
                />
              </td>
              <td className="py-2 pr-4">
                <InlineText
                  value={row.percentage}
                  onChange={(value) =>
                    updateVotingShareholders(
                      overview.votingShareholders.map((item) =>
                        item.id === row.id ? { ...item, percentage: value } : item,
                      ),
                    )
                  }
                  ariaLabel="Pourcentage"
                  placeholder="%"
                  className="text-sm"
                />
              </td>
              <td className="py-2 text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-red-600"
                  onClick={() => removeVotingShareholder(row.id)}
                  aria-label="Supprimer l'actionnaire"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </ReportTable>
      </NetTangibleReportSection>

      <NetTangibleReportSection id="direction" number="5." title="Direction">
        <div className="mb-3 flex items-center justify-end">
          <Button type="button" variant="outline" size="sm" onClick={addManagementRow}>
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Ajouter
          </Button>
        </div>
        <ReportTable headers={["Poste", "Responsable"]}>
          {overview.management.map((row) => (
            <tr key={row.id} className="border-b border-slate-200">
              <td className="py-2 pr-4">
                <InlineText
                  value={row.role}
                  onChange={(value) =>
                    updateManagement(
                      overview.management.map((item) =>
                        item.id === row.id ? { ...item, role: value } : item,
                      ),
                    )
                  }
                  ariaLabel="Poste"
                  placeholder="Poste"
                  className="text-sm"
                />
              </td>
              <td className="py-2 pr-4">
                <InlineText
                  value={row.name}
                  onChange={(value) =>
                    updateManagement(
                      overview.management.map((item) =>
                        item.id === row.id ? { ...item, name: value } : item,
                      ),
                    )
                  }
                  ariaLabel="Responsable"
                  placeholder="Nom"
                  className="text-sm"
                />
              </td>
              <td className="py-2 text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-red-600"
                  onClick={() => removeManagementRow(row.id)}
                  aria-label="Supprimer le poste"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </ReportTable>
      </NetTangibleReportSection>

      <footer className="mt-10 border-t border-slate-200 pt-4">
        <p className="text-pretty text-[11px] leading-relaxed text-slate-500">
          Rapport indicatif d&apos;aperçu qualitatif de l&apos;entreprise · {companyName} ·{" "}
          {referenceLabel}
        </p>
      </footer>
    </article>
  )
}
