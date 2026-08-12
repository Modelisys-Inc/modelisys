"use client"

import { Fragment, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, PanelTop, Sparkles, Trash2, Type } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCashFlowDetailStructureEdit } from "@/hooks/use-income-statement-structure-edit"
import {
  isCashFlowSummaryAnnexSpacerTarget,
  useStatementSummaryStructureDialogs,
} from "@/hooks/use-statement-summary-structure-dialogs"
import { StatementSummaryStructureDialogs } from "@/components/statement-summary-structure-dialogs"
import {
  isCashFlowSummaryOnlySpacer,
  isShowInSummary,
  isStructureRowEmptyLabel,
  resolveCashFlowSummaryRowPresentation,
} from "@/lib/income-statement-structure-utils"
import {
  dashboardCardBodyMutedClass,
} from "@/lib/dashboard-card-style"

interface CashFlowSummaryStructureStudioProps {
  companyId: string
  onSaved?: () => void
  onClose: () => void
  embedded?: boolean
}

/**
 * Paramètres Sommaire trésorerie : présentation seule (espace, gras, séparation)
 * sur les postes Annexe — n’altère pas l’affichage Détail.
 */
export function CashFlowSummaryStructureStudio({
  companyId,
  onSaved,
  onClose,
  embedded = false,
}: CashFlowSummaryStructureStudioProps) {
  const structEdit = useCashFlowDetailStructureEdit(companyId, true)
  const dialogs = useStatementSummaryStructureDialogs(structEdit, {
    isSpacerTarget: isCashFlowSummaryAnnexSpacerTarget,
    summaryOnlySpacers: true,
    cashFlowSummaryPresentationOverlay: true,
  })

  const displayIndices = useMemo(
    () =>
      structEdit.structure
        .map((r, i) =>
          isCashFlowSummaryOnlySpacer(r) || isShowInSummary(r) ? i : -1,
        )
        .filter((i) => i >= 0),
    [structEdit.structure],
  )

  return (
    <div
      className={cn(
        embedded ? "min-w-0" : "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
      )}
    >
      <div className="flex flex-wrap items-center justify-end gap-2 border-b border-slate-200 bg-slate-50/80 p-2">
        <div className="flex w-full flex-wrap items-center justify-end gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 rounded-xl text-[#2A2F3A] hover:bg-slate-100"
            disabled={structEdit.loading}
            title="Insérer une ligne vide au-dessus ou en dessous d’une annexe"
            onClick={dialogs.openAddSpaceDialog}
          >
            <PanelTop className="h-4 w-4 text-[#E0742D]" />
            Ajouter un espace
          </Button>
          <CashFlowSummaryStructureStudioSaveBar
            companyId={companyId}
            structEdit={structEdit}
            onSaved={onSaved}
            onClose={onClose}
          />
        </div>
      </div>

      {structEdit.loading && (
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-3 text-center text-sm text-slate-600">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin text-[#E0742D]" />
          Chargement de la structure…
        </div>
      )}
      {structEdit.error && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-center text-sm text-red-700">
          {structEdit.error}
        </div>
      )}

      <div className="border-b border-slate-100 bg-sky-50/40 px-6 py-3">
        <p className={cn("text-sm leading-relaxed", dashboardCardBodyMutedClass)}>
          <span className="inline-flex items-center gap-1.5 font-medium text-[#2A2F3A]">
            <Sparkles className="h-3.5 w-3.5 text-[#E0742D]" />
            Présentation Sommaire
          </span>
          {" — "}
          Gras, indentation, séparation et espaces s’appliquent uniquement ici. Les postes Annexe
          se gèrent dans <span className="font-medium text-[#2A2F3A]">Détail → Paramètres</span>.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="min-w-0" />
            <col style={{ width: "7rem" }} />
            <col style={{ width: "9.5rem" }} />
            <col style={{ width: "5rem" }} />
          </colgroup>
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Poste</th>
              <th className="box-border w-[7rem] px-2 py-4 text-center text-[11px] font-semibold text-slate-800">
                Séparation
              </th>
              <th className="box-border w-[9.5rem] px-2 py-4 text-center text-[11px] font-semibold text-slate-800">
                Présentation
              </th>
              <th className="box-border w-[5rem] px-2 py-4 text-center text-[11px] font-semibold text-slate-800">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {displayIndices.length === 0 && !structEdit.loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500">
                  Aucune ligne en annexe. Cochez <span className="font-medium">Annexe</span> dans
                  Détail → Paramètres, puis revenez ici pour l’espacement et le gras.
                </td>
              </tr>
            ) : null}
            {displayIndices.map((globalIdx, idx) => {
              const structRow = structEdit.structure[globalIdx]!
              const rowKey = String(structRow.id ?? `row-${globalIdx}`)
              const isEmpty = isStructureRowEmptyLabel(structRow)
              const isSummarySpacer = isCashFlowSummaryOnlySpacer(structRow)
              const pres = resolveCashFlowSummaryRowPresentation(structRow)
              return (
                <Fragment key={rowKey}>
                  {pres.separatorAbove && !isEmpty ? (
                    <tr aria-hidden>
                      <td
                        colSpan={4}
                        className="border-0 border-t border-t-slate-600 p-0 align-top leading-none"
                      />
                    </tr>
                  ) : null}
                  <tr
                    className={cn(
                      "border-b border-b-slate-200 hover:bg-slate-100/70",
                      isEmpty && "h-2",
                      idx % 2 === 1 && !isEmpty && "bg-slate-50/50",
                    )}
                  >
                    <td className="min-w-0 px-3 py-3 pl-4">
                      {isEmpty ? (
                        <span className="inline-flex items-center rounded-lg border border-dashed border-sky-200 bg-sky-50/80 px-3 py-2 text-xs font-medium text-sky-700/80">
                          Espace Sommaire
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "block truncate text-sm text-[#2A2F3A]",
                            pres.isBold ? "font-semibold" : "font-normal",
                            pres.indent ? "pl-6" : "",
                          )}
                        >
                          {String(structRow.label ?? "")}
                        </span>
                      )}
                    </td>
                    <td className="box-border w-[7rem] px-2 py-2.5 align-middle text-center">
                      {isEmpty ? (
                        <span className="text-sm text-slate-300">—</span>
                      ) : (
                        <div className="flex justify-center">
                          <label
                            className={cn(
                              "flex cursor-pointer items-center justify-center rounded-xl p-1.5 transition-colors",
                              pres.separatorAbove
                                ? "bg-slate-800/90 ring-2 ring-slate-900/40"
                                : "bg-slate-100/60 hover:bg-slate-200/60",
                            )}
                          >
                            <Checkbox
                              checked={pres.separatorAbove}
                              onCheckedChange={(v) => {
                                structEdit.updateRow(globalIdx, {
                                  summarySeparatorAbove: v === true,
                                })
                              }}
                              aria-label="Séparation Sommaire : trait au-dessus"
                              className="border-slate-300 data-[state=checked]:border-slate-900 data-[state=checked]:bg-slate-900"
                            />
                          </label>
                        </div>
                      )}
                    </td>
                    <td className="box-border w-[9.5rem] px-2 py-2.5 align-middle text-center">
                      {isEmpty ? (
                        <span className="text-sm text-slate-300">—</span>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 rounded-xl border-slate-200 text-xs font-medium text-[#2A2F3A]"
                          onClick={() => dialogs.beginEditPostPresentation(globalIdx)}
                        >
                          <Type className="h-3.5 w-3.5 text-[#E0742D]" />
                          Présentation
                        </Button>
                      )}
                    </td>
                    <td className="box-border w-[5rem] px-2 py-2.5 align-middle text-center">
                      {isSummarySpacer ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 rounded-xl p-0 text-slate-500 hover:bg-red-50 hover:text-red-700"
                          title="Supprimer l’espace Sommaire"
                          onClick={() => structEdit.removeStructureRowAt(globalIdx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-sm text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <StatementSummaryStructureDialogs
        structEdit={structEdit}
        dialogs={dialogs}
        idPrefix="cf-summary"
      />
    </div>
  )
}

function CashFlowSummaryStructureStudioSaveBar({
  companyId,
  structEdit,
  onSaved,
  onClose,
}: {
  companyId: string
  structEdit: ReturnType<typeof useCashFlowDetailStructureEdit>
  onSaved?: () => void
  onClose: () => void
}) {
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="rounded-xl text-[#5C5F66] hover:bg-slate-100"
        disabled={structEdit.saving}
        onClick={() => {
          structEdit.discard()
          void structEdit.reload()
          onClose()
        }}
      >
        Annuler
      </Button>
      <Button
        type="button"
        size="sm"
        className="rounded-xl bg-[#E0742D] px-4 font-semibold text-white shadow-sm hover:bg-[#c96526] disabled:opacity-60"
        disabled={structEdit.saving || structEdit.loading || !companyId}
        onClick={async () => {
          const ok = await structEdit.save()
          if (ok) {
            onSaved?.()
            structEdit.discard()
            void structEdit.reload()
            onClose()
          }
        }}
      >
        {structEdit.saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enregistrement…
          </>
        ) : (
          "Enregistrer"
        )}
      </Button>
    </>
  )
}
