"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { IncomeStatementLiaisonCell } from "@/components/income-statement-liaison-cell"
import {
  BookMarked,
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Hash,
  Link2,
  Pencil,
  PanelTop,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  isAnnexLetterInputEditable,
  isCodeMappingEnabled,
  isShowInDetail,
  isStructureRowEmptyLabel,
  isStructureRowHidden,
  normalizeAnnexLetter,
  normalizeLiaisonMode,
} from "@/lib/income-statement-structure-utils"

export type StatementSummaryStructureEditApi = {
  updateRow: (index: number, patch: Record<string, unknown>) => void
  /** Bascule « Annexe » et attribue automatiquement le prochain identifiant d'annexe. */
  setShowInDetail: (index: number, checked: boolean) => void
  canRemoveRowAt: (index: number) => boolean
  removeStructureRowAt: (index: number) => void
  moveStructureRow?: (index: number, direction: -1 | 1) => void
}

export function StatementSummaryStructureColgroup({
  hideAnnexColumns = false,
}: {
  hideAnnexColumns?: boolean
}) {
  return (
    <colgroup>
      <col className="min-w-0" />
      <col style={{ width: "7rem" }} />
      <col style={{ width: "7rem" }} />
      <col style={{ width: "7rem" }} />
      <col style={{ width: "7rem" }} />
      {!hideAnnexColumns ? (
        <>
          <col style={{ width: "7rem" }} />
          <col style={{ width: "7rem" }} />
        </>
      ) : null}
      <col style={{ width: "9.5rem" }} />
    </colgroup>
  )
}

export function StatementSummaryStructureThead({
  posteHeader = "Poste",
  hideAnnexColumns = false,
}: {
  posteHeader?: string
  hideAnnexColumns?: boolean
}) {
  return (
    <>
      <th
        className={cn(
          "px-6 py-4 text-left text-sm font-semibold text-slate-900",
          "min-w-0 pl-4 pr-3"
        )}
      >
        <span className="flex items-center gap-2">
          <span className="rounded-lg bg-white/80 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 ring-1 ring-slate-200/80">
            Libellé
          </span>
          <span className="font-semibold text-slate-800">{posteHeader}</span>
        </span>
      </th>
      <th className="box-border w-[7rem] px-2 py-4 text-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-help flex-col items-center gap-1.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
                <PanelTop className="h-4 w-4 text-slate-700" />
              </span>
              <span className="text-[11px] font-semibold leading-tight text-slate-800">Séparation</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px] text-balance">
            Affiche une ligne de séparation au-dessus de cette ligne au sommaire.
          </TooltipContent>
        </Tooltip>
      </th>
      <th className="box-border w-[7rem] px-2 py-4 text-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-help flex-col items-center gap-1.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-300/80">
                <EyeOff className="h-4 w-4 text-slate-600" />
              </span>
              <span className="text-[11px] font-semibold leading-tight text-slate-800">Masquer</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px] text-balance">
            Masque la ligne au sommaire et au détail. Désactive Code et Annexe pour cette ligne.
          </TooltipContent>
        </Tooltip>
      </th>
      <th className="box-border w-[7rem] px-2 py-4 text-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-help flex-col items-center gap-1.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                <Hash className="h-4 w-4 text-[#E0742D]" />
              </span>
              <span className="text-[11px] font-semibold leading-tight text-slate-800">Code</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px] text-balance">
            Active la modification du code de liaison et de la lettre d’annexe. Indisponible si la ligne est masquée.
          </TooltipContent>
        </Tooltip>
      </th>
      <th className="box-border w-[7rem] px-2 py-4 text-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-help flex-col items-center gap-1.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
                <Link2 className="h-4 w-4 text-slate-600" />
              </span>
              <span className="text-[11px] font-semibold leading-tight text-slate-800">Liaison</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px] text-balance">
            Liaison : n/a, code unique, somme de codes (addition) ou différence (numérateur − dénominateur) lorsque « Code »
            est coché.
          </TooltipContent>
        </Tooltip>
      </th>
      {!hideAnnexColumns ? (
        <>
          <th className="box-border w-[7rem] px-2 py-4 text-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-help flex-col items-center gap-1.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                    <Eye className="h-4 w-4 text-sky-600" />
                  </span>
                  <span className="text-[11px] font-semibold leading-tight text-slate-800">Annexe</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-balance">
                Affiche cette ligne au détail (avec liaison et lettre). Nécessite « Code » et une ligne visible.
              </TooltipContent>
            </Tooltip>
          </th>
          <th className="box-border w-[7rem] px-2 py-4 text-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-help flex-col items-center gap-1.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
                    <BookMarked className="h-4 w-4 text-slate-600" />
                  </span>
                  <span className="text-[11px] font-semibold leading-tight text-slate-800">Lettre</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-balance">
                Lettre d’annexe (ex. A, B) pour le détail et les exports.
              </TooltipContent>
            </Tooltip>
          </th>
        </>
      ) : null}
      <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900 min-w-[9.5rem]">
        Actions
      </th>
    </>
  )
}

type StructureRowCellsProps = {
  structRow: Record<string, unknown>
  globalIdx: number
  structEdit: StatementSummaryStructureEditApi
  allLiaisonCodes: string[]
  /** Code de liaison → libellé du poste, pour afficher « code — nom » dans les sélecteurs. */
  linkCodeLabels?: Map<string, string>
  /** Codes parents du plan standard (Compte de résultat ou Bilan) pour le mode « Code unique ». */
  singleModeLinkCodes?: string[]
  singleModeLinkCodeLabels?: Map<string, string>
  showSeparatorAbove: boolean
  onEditPresentation?: (globalIdx: number) => void
  /** Bilan : numéros d'annexe attribués automatiquement (1, 2, 3…) — champ en lecture seule. */
  annexIdentifierAutoAssigned?: boolean
  /** Masque les colonnes Annexe et Lettre (ex. Trésorerie Détail). */
  hideAnnexColumns?: boolean
}

export function StatementSummaryStructureRowCells({
  structRow,
  globalIdx,
  structEdit,
  allLiaisonCodes,
  linkCodeLabels,
  singleModeLinkCodes,
  singleModeLinkCodeLabels,
  showSeparatorAbove,
  onEditPresentation,
  annexIdentifierAutoAssigned = false,
  hideAnnexColumns = false,
}: StructureRowCellsProps) {
  return (
    <>
      <td className="box-border w-[7rem] px-2 py-2.5 align-middle text-center">
        {isStructureRowEmptyLabel(structRow) ? (
          <span className="text-sm text-slate-300">—</span>
        ) : (
          <div className="flex justify-center">
            <label
              className={cn(
                "flex cursor-pointer items-center justify-center rounded-xl p-1.5 transition-colors",
                isStructureRowHidden(structRow)
                  ? "cursor-not-allowed opacity-40"
                  : "cursor-pointer",
                !isStructureRowHidden(structRow) &&
                  showSeparatorAbove &&
                  "bg-slate-800/90 ring-2 ring-slate-900/40",
                !isStructureRowHidden(structRow) &&
                  !showSeparatorAbove &&
                  "bg-slate-100/60 hover:bg-slate-200/60"
              )}
            >
              <Checkbox
                checked={showSeparatorAbove}
                disabled={isStructureRowHidden(structRow)}
                onCheckedChange={(v) => {
                  if (isStructureRowHidden(structRow)) return
                  structEdit.updateRow(globalIdx, { separatorAbove: v === true })
                }}
                aria-label="Séparation : trait au-dessus"
                className="border-slate-300 data-[state=checked]:border-slate-900 data-[state=checked]:bg-slate-900"
              />
            </label>
          </div>
        )}
      </td>
      <td className="box-border w-[7rem] px-2 py-2.5 align-middle text-center">
        <div className="flex justify-center">
          <label
            className={cn(
              "flex cursor-pointer items-center justify-center rounded-xl p-1.5 transition-colors",
              isStructureRowHidden(structRow)
                ? "bg-slate-200/80 ring-2 ring-slate-400/35"
                : "bg-slate-100/60 hover:bg-slate-200/60"
            )}
          >
            <Checkbox
              checked={isStructureRowHidden(structRow)}
              onCheckedChange={(v) => {
                if (v === true) {
                  structEdit.updateRow(globalIdx, {
                    hidden: true,
                    defineMapping: false,
                    showInDetail: false,
                    linkCode: undefined,
                    annexLetter: undefined,
                    liaisonMode: undefined,
                    liaisonSumCodes: undefined,
                    liaisonNumeratorCodes: undefined,
                    liaisonDenominatorCodes: undefined,
                    separatorAbove: undefined,
                  })
                } else {
                  structEdit.updateRow(globalIdx, { hidden: false })
                }
              }}
              aria-label="Masquer la ligne au sommaire"
              className="border-slate-300 data-[state=checked]:border-slate-700 data-[state=checked]:bg-slate-700"
            />
          </label>
        </div>
      </td>
      <td className="box-border w-[7rem] px-2 py-2.5 align-middle text-center">
        {isStructureRowEmptyLabel(structRow) ? (
          <span className="text-sm text-slate-300">—</span>
        ) : (
          <div className="flex justify-center">
            <label
              className={cn(
                "flex items-center justify-center rounded-xl p-1.5 transition-colors",
                isStructureRowHidden(structRow)
                  ? "cursor-not-allowed opacity-40"
                  : "cursor-pointer",
                !isStructureRowHidden(structRow) &&
                  isCodeMappingEnabled(structRow) &&
                  "bg-orange-50/90 ring-2 ring-[#E0742D]/35",
                !isStructureRowHidden(structRow) &&
                  !isCodeMappingEnabled(structRow) &&
                  "bg-slate-100/60 hover:bg-slate-200/60"
              )}
            >
              <Checkbox
                checked={isCodeMappingEnabled(structRow)}
                disabled={isStructureRowHidden(structRow)}
                onCheckedChange={(v) => {
                  if (isStructureRowHidden(structRow)) return
                  if (v === true) {
                    structEdit.updateRow(globalIdx, {
                      defineMapping: true,
                      ...(normalizeLiaisonMode(structRow) === "na" ? { liaisonMode: "single" } : {}),
                    })
                  } else {
                    structEdit.updateRow(globalIdx, {
                      defineMapping: false,
                      showInDetail: false,
                      linkCode: undefined,
                      annexLetter: undefined,
                      liaisonMode: undefined,
                      liaisonSumCodes: undefined,
                      liaisonNumeratorCodes: undefined,
                      liaisonDenominatorCodes: undefined,
                    })
                  }
                }}
                aria-label="Code : liaison et lettre modifiables"
                className="border-slate-300 data-[state=checked]:border-[#E0742D] data-[state=checked]:bg-[#E0742D]"
              />
            </label>
          </div>
        )}
      </td>
      <td className="box-border min-w-[8.5rem] max-w-[10rem] px-2 py-2.5 align-middle">
        {isCodeMappingEnabled(structRow) && !isStructureRowHidden(structRow) ? (
          <IncomeStatementLiaisonCell
            structRow={structRow}
            rowIndex={globalIdx}
            allLinkCodes={allLiaisonCodes}
            linkCodeLabels={linkCodeLabels}
            singleModeLinkCodes={singleModeLinkCodes}
            singleModeLinkCodeLabels={singleModeLinkCodeLabels}
            updateRow={structEdit.updateRow}
          />
        ) : (
          <span className="block truncate rounded-lg bg-slate-100/50 px-1.5 py-2 text-center text-sm text-slate-300">
            —
          </span>
        )}
      </td>
      {!hideAnnexColumns ? (
        <>
          <td className="box-border w-[7rem] px-2 py-2.5 align-middle text-center">
            {isStructureRowEmptyLabel(structRow) ? (
              <span className="text-sm text-slate-300">—</span>
            ) : (
              <div className="flex justify-center">
                <label
                  className={cn(
                    "flex items-center justify-center rounded-xl p-1.5 transition-colors",
                    isStructureRowHidden(structRow) || !isCodeMappingEnabled(structRow)
                      ? "cursor-not-allowed opacity-40"
                      : "cursor-pointer",
                    !isStructureRowHidden(structRow) &&
                      isCodeMappingEnabled(structRow) &&
                      isShowInDetail(structRow) &&
                      "bg-sky-50/90 ring-2 ring-sky-400/40",
                    !isStructureRowHidden(structRow) &&
                      isCodeMappingEnabled(structRow) &&
                      !isShowInDetail(structRow) &&
                      "bg-slate-100/60 hover:bg-slate-200/60"
                  )}
                >
                  <Checkbox
                    checked={isShowInDetail(structRow)}
                    disabled={isStructureRowHidden(structRow) || !isCodeMappingEnabled(structRow)}
                    onCheckedChange={(v) => {
                      if (isStructureRowHidden(structRow) || !isCodeMappingEnabled(structRow)) return
                      structEdit.setShowInDetail(globalIdx, v === true)
                    }}
                    aria-label="Annexe : afficher au détail"
                    className="border-slate-300 data-[state=checked]:border-sky-600 data-[state=checked]:bg-sky-600"
                  />
                </label>
              </div>
            )}
          </td>
          <td className="box-border w-[7rem] min-w-0 px-2 py-2.5 align-middle">
            {isCodeMappingEnabled(structRow) && !isStructureRowHidden(structRow) ? (
              <Input
                value={String(structRow.annexLetter ?? "")}
                disabled={!isAnnexLetterInputEditable(structRow) || annexIdentifierAutoAssigned}
                onChange={(e) =>
                  structEdit.updateRow(globalIdx, {
                    annexLetter: normalizeAnnexLetter(e.target.value) || undefined,
                  })
                }
                placeholder={annexIdentifierAutoAssigned ? "1" : "A"}
                title={
                  annexIdentifierAutoAssigned
                    ? "Numéro d'annexe attribué automatiquement selon l'ordre des postes cochés « Annexe »."
                    : !isAnnexLetterInputEditable(structRow)
                      ? "Activez « Annexe » pour saisir une lettre (inutile pour addition / soustraction)."
                      : undefined
                }
                className={cn(
                  "h-9 w-full min-w-0 rounded-xl border-slate-200/90 px-2 text-center text-xs font-bold uppercase tracking-widest shadow-sm focus-visible:border-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500/25",
                  isAnnexLetterInputEditable(structRow) ? "bg-white" : "cursor-not-allowed bg-slate-100/80 text-slate-400"
                )}
                maxLength={8}
              />
            ) : (
              <span className="block truncate rounded-lg bg-slate-100/50 px-1.5 py-2 text-center text-sm text-slate-300">
                —
              </span>
            )}
          </td>
        </>
      ) : null}
      <td className="px-2 py-2 text-center align-middle">
        <div className="flex items-center justify-center gap-0.5">
          {structEdit.moveStructureRow ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-400 hover:text-[#E0742D]"
                title="Monter la ligne"
                onClick={() => structEdit.moveStructureRow?.(globalIdx, -1)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-400 hover:text-[#E0742D]"
                title="Descendre la ligne"
                onClick={() => structEdit.moveStructureRow?.(globalIdx, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </>
          ) : null}
          {onEditPresentation && !isStructureRowEmptyLabel(structRow) ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-400 hover:text-[#E0742D]"
              title="Modifier le poste (niveau, gras)"
              onClick={() => onEditPresentation(globalIdx)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          ) : null}
          {structEdit.canRemoveRowAt(globalIdx) ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
              title="Supprimer la ligne"
              onClick={() => structEdit.removeStructureRowAt(globalIdx)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </td>
    </>
  )
}
