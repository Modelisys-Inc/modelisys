"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Loader2, PanelTop, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  useStatementStructureEdit,
  type StatementStructureEditKind,
} from "@/hooks/use-income-statement-structure-edit"
import {
  StatementSummaryStructureColgroup,
  StatementSummaryStructureThead,
  StatementSummaryStructureRowCells,
} from "@/components/statement-summary-structure-shared"
import {
  collectDistinctLinkCodesFromStructure,
  isStructureRowEmptyLabel,
  mapLinkCodesToOwnerLabel,
} from "@/lib/income-statement-structure-utils"

interface StatementStructureStudioProps {
  companyId: string
  statementType: StatementStructureEditKind
  /** Called after a successful save (parent bumps its structureVersion). */
  onSaved?: () => void
  /** Called to leave edit mode (Annuler, or after a successful save). */
  onClose: () => void
}

export function StatementStructureStudio({
  companyId,
  statementType,
  onSaved,
  onClose,
}: StatementStructureStudioProps) {
  // active=true: this component only mounts while editing.
  const structEdit = useStatementStructureEdit(companyId, true, statementType)
  const [presentationRowIdx, setPresentationRowIdx] = useState<number | null>(null)

  const displayIndices = structEdit.summaryStructureDisplayIndices
  const allLiaisonCodes = useMemo(
    () => collectDistinctLinkCodesFromStructure(structEdit.structure),
    [structEdit.structure]
  )
  const linkCodeLabels = useMemo(
    () => mapLinkCodesToOwnerLabel(structEdit.structure),
    [structEdit.structure]
  )

  const lastGlobalIdx =
    displayIndices.length > 0 ? displayIndices[displayIndices.length - 1]! : -1

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-end gap-2 border-b border-slate-200 bg-slate-50/80 p-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 rounded-xl text-[#2A2F3A] hover:bg-slate-100"
          disabled={structEdit.loading}
          onClick={() => structEdit.insertEmptySpacerBelow(Math.max(lastGlobalIdx, 0))}
        >
          <PanelTop className="h-4 w-4 text-[#E0742D]" />
          Ajouter un espace
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 rounded-xl text-[#2A2F3A] hover:bg-slate-100"
          disabled={structEdit.loading}
          onClick={() => structEdit.insertPostBelow(Math.max(lastGlobalIdx, 0), { indent: true })}
        >
          <Plus className="h-4 w-4 text-[#E0742D]" />
          Ajouter un poste
        </Button>
        <Separator orientation="vertical" className="hidden h-7 sm:block" />
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
      {presentationRowIdx != null && structEdit.structure[presentationRowIdx] ? (
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-white px-4 py-3 text-sm">
          <span className="max-w-[18rem] truncate font-semibold text-slate-800">
            {String(structEdit.structure[presentationRowIdx]?.label ?? "Poste")}
          </span>
          <label className="inline-flex items-center gap-2 text-slate-700">
            <Checkbox
              checked={structEdit.structure[presentationRowIdx]?.isBold === true}
              onCheckedChange={(v) => structEdit.updateRow(presentationRowIdx, { isBold: v === true })}
            />
            Gras
          </label>
          <label className="inline-flex items-center gap-2 text-slate-700">
            <Checkbox
              checked={structEdit.structure[presentationRowIdx]?.isSection === true}
              onCheckedChange={(v) => structEdit.updateRow(presentationRowIdx, { isSection: v === true })}
            />
            Section
          </label>
          <label className="inline-flex items-center gap-2 text-slate-700">
            <Checkbox
              checked={structEdit.structure[presentationRowIdx]?.indent === true}
              onCheckedChange={(v) => structEdit.updateRow(presentationRowIdx, { indent: v === true })}
            />
            Indenté
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto text-slate-500"
            onClick={() => setPresentationRowIdx(null)}
          >
            Fermer
          </Button>
        </div>
      ) : null}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse">
          <StatementSummaryStructureColgroup />
          <thead className="bg-slate-50/70">
            <tr>
              <StatementSummaryStructureThead posteHeader="Poste" />
            </tr>
          </thead>
          <tbody>
            {displayIndices.map((globalIdx, idx) => {
              const structRow = structEdit.structure[globalIdx]!
              const isEmpty = isStructureRowEmptyLabel(structRow)
              const isBoldRow = structRow.isBold === true
              return (
                <tr
                  key={globalIdx}
                  className={cn(
                    "border-b border-b-slate-200 hover:bg-slate-100/70",
                    idx % 2 === 1 && "bg-slate-50/50"
                  )}
                >
                  <td className="min-w-0 px-3 py-3 pl-4">
                    {isEmpty ? (
                      <span className="inline-flex items-center rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-medium text-slate-400">
                        Ligne vide — renommez ou supprimez
                      </span>
                    ) : (
                      <Input
                        value={String(structRow.label ?? "")}
                        onChange={(e) => structEdit.updateRow(globalIdx, { label: e.target.value })}
                        className={cn(
                          "h-9 w-full max-w-full rounded-xl border-slate-200/90 bg-white text-sm shadow-sm focus-visible:border-[#E0742D]/50 focus-visible:ring-2 focus-visible:ring-[#E0742D]/20",
                          isBoldRow ? "font-semibold" : "font-normal"
                        )}
                      />
                    )}
                  </td>
                  <StatementSummaryStructureRowCells
                    structRow={structRow}
                    globalIdx={globalIdx}
                    structEdit={structEdit}
                    allLiaisonCodes={allLiaisonCodes}
                    linkCodeLabels={linkCodeLabels}
                    showSeparatorAbove={structRow.separatorAbove === true}
                    onEditPresentation={setPresentationRowIdx}
                  />
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
