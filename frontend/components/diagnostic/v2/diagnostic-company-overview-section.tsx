"use client"

import { Building2, Plus, RotateCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CARD_CLASS } from "@/lib/diagnostic-theme"
import { COMPANY_OVERVIEW_GENERAL_INFO_FIELDS } from "@/lib/diagnostic-company-overview"
import { useDiagnosticCompanyOverview } from "@/hooks/use-diagnostic-company-overview"
import { cn } from "@/lib/utils"

interface DiagnosticCompanyOverviewSectionProps {
  diagnosticId: string
  companyName: string
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
      {children}
    </h3>
  )
}

function EditableTable({
  headers,
  children,
}: {
  headers: string[]
  children: React.ReactNode
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[28rem] border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="bg-slate-50">
            {headers.map((header) => (
              <th
                key={header}
                className="border-b border-slate-200 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500"
              >
                {header}
              </th>
            ))}
            <th className="w-10 border-b border-slate-200" aria-hidden />
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function DiagnosticCompanyOverviewSection({
  diagnosticId,
  companyName,
}: DiagnosticCompanyOverviewSectionProps) {
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

  return (
    <section
      id="diag-rapport"
      data-testid="company-overview-section"
      className={cn(CARD_CLASS, "scroll-mt-28")}
    >
      <div className="relative border-b border-slate-200 bg-white/90 px-6 py-5 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100">
              <Building2 className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="mb-1 text-xl font-semibold leading-tight tracking-tight text-[#2A2F3A]">
                Aperçu de l&apos;entreprise
              </h2>
              <p className="text-sm text-slate-500">
                Informations qualitatives — tous les champs sont modifiables et enregistrés
                localement pour ce diagnostic.
              </p>
            </div>
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
        </div>
      </div>

      <div className="space-y-8 px-6 py-6 sm:px-7">
        <div className="space-y-4">
          <SectionHeading>Informations générales</SectionHeading>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="w-[34%] border-b border-slate-200 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Élément
                  </th>
                  <th className="border-b border-slate-200 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Information
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPANY_OVERVIEW_GENERAL_INFO_FIELDS.map(({ key, label }) => (
                  <tr key={key} className="border-t border-slate-100">
                    <td className="bg-slate-50/60 px-4 py-2.5 align-top font-medium text-[#2A2F3A]">
                      {label}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={overview.generalInfo[key]}
                        onChange={(event) => updateGeneralInfo(key, event.target.value)}
                        className="h-9 border-slate-200 bg-white text-sm"
                        data-testid={`company-overview-general-${key}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <SectionHeading>Historique de l&apos;entreprise</SectionHeading>
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
          <div className="space-y-3">
            {overview.history.map((entry) => (
              <div
                key={entry.id}
                className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/40 p-4 md:grid-cols-[7rem_1fr_auto]"
                data-testid={`company-overview-history-${entry.id}`}
              >
                <Input
                  value={entry.year}
                  onChange={(event) =>
                    updateHistory(
                      overview.history.map((row) =>
                        row.id === entry.id ? { ...row, year: event.target.value } : row,
                      ),
                    )
                  }
                  placeholder="Année"
                  className="h-9 border-slate-200 bg-white font-semibold"
                />
                <Textarea
                  value={entry.description}
                  onChange={(event) =>
                    updateHistory(
                      overview.history.map((row) =>
                        row.id === entry.id ? { ...row, description: event.target.value } : row,
                      ),
                    )
                  }
                  rows={3}
                  className="min-h-[4.5rem] border-slate-200 bg-white text-sm"
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
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <SectionHeading>Actionnariat — Actions participantes</SectionHeading>
            <Button type="button" variant="outline" size="sm" onClick={addShareholder}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Ajouter
            </Button>
          </div>
          <EditableTable headers={["Actionnaire", "Pourcentage"]}>
            {overview.participatingShareholders.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  <Input
                    value={row.name}
                    onChange={(event) =>
                      updateParticipatingShareholders(
                        overview.participatingShareholders.map((item) =>
                          item.id === row.id ? { ...item, name: event.target.value } : item,
                        ),
                      )
                    }
                    className="h-9 border-slate-200 bg-white"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    value={row.percentage}
                    onChange={(event) =>
                      updateParticipatingShareholders(
                        overview.participatingShareholders.map((item) =>
                          item.id === row.id ? { ...item, percentage: event.target.value } : item,
                        ),
                      )
                    }
                    className="h-9 border-slate-200 bg-white"
                  />
                </td>
                <td className="px-2 py-2 text-center">
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
          </EditableTable>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <SectionHeading>Actionnariat — Actions votantes</SectionHeading>
            <Button type="button" variant="outline" size="sm" onClick={addVotingShareholder}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Ajouter
            </Button>
          </div>
          <EditableTable headers={["Actionnaire", "Pourcentage"]}>
            {overview.votingShareholders.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  <Input
                    value={row.name}
                    onChange={(event) =>
                      updateVotingShareholders(
                        overview.votingShareholders.map((item) =>
                          item.id === row.id ? { ...item, name: event.target.value } : item,
                        ),
                      )
                    }
                    className="h-9 border-slate-200 bg-white"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    value={row.percentage}
                    onChange={(event) =>
                      updateVotingShareholders(
                        overview.votingShareholders.map((item) =>
                          item.id === row.id ? { ...item, percentage: event.target.value } : item,
                        ),
                      )
                    }
                    className="h-9 border-slate-200 bg-white"
                  />
                </td>
                <td className="px-2 py-2 text-center">
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
          </EditableTable>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <SectionHeading>Direction</SectionHeading>
            <Button type="button" variant="outline" size="sm" onClick={addManagementRow}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Ajouter
            </Button>
          </div>
          <EditableTable headers={["Poste", "Responsable"]}>
            {overview.management.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  <Input
                    value={row.role}
                    onChange={(event) =>
                      updateManagement(
                        overview.management.map((item) =>
                          item.id === row.id ? { ...item, role: event.target.value } : item,
                        ),
                      )
                    }
                    className="h-9 border-slate-200 bg-white"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    value={row.name}
                    onChange={(event) =>
                      updateManagement(
                        overview.management.map((item) =>
                          item.id === row.id ? { ...item, name: event.target.value } : item,
                        ),
                      )
                    }
                    className="h-9 border-slate-200 bg-white"
                  />
                </td>
                <td className="px-2 py-2 text-center">
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
          </EditableTable>
        </div>

        <div className="space-y-3">
          <SectionHeading>Principales activités</SectionHeading>
          <Textarea
            value={overview.mainActivities}
            onChange={(event) => updateMainActivities(event.target.value)}
            rows={5}
            className="min-h-[7rem] border-slate-200 bg-white text-sm leading-relaxed"
            data-testid="company-overview-main-activities"
          />
        </div>
      </div>
    </section>
  )
}
