"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  isCodeMappingEnabled,
  isShowInDetail,
  isStructureRowEmptyLabel,
  isStructureRowHidden,
  normalizeAnnexLetter,
} from "@/lib/income-statement-structure-utils"
import { cn } from "@/lib/utils"
import { Trash2 } from "lucide-react"

interface IncomeStatementStructureStudioColsProps {
  rowIndex: number
  structRow: Record<string, unknown>
  updateRow: (index: number, patch: Record<string, unknown>) => void
  showRemoveButton: boolean
  onRemoveRow?: (index: number) => void
  mappingColumnsReadOnly?: boolean
  annexReadOnly?: boolean
  hideDefineColumn?: boolean
}

export function IncomeStatementStructureStudioCols({
  rowIndex: idx,
  structRow,
  updateRow,
  showRemoveButton,
  onRemoveRow,
  mappingColumnsReadOnly = false,
  annexReadOnly = false,
  hideDefineColumn = false,
}: IncomeStatementStructureStudioColsProps) {
  const readOnly = mappingColumnsReadOnly
  const annexFieldReadOnly = readOnly || annexReadOnly
  const showLinkAnnexCells =
    !isStructureRowEmptyLabel(structRow) &&
    (hideDefineColumn
      ? !isStructureRowHidden(structRow)
      : isCodeMappingEnabled(structRow) && !isStructureRowHidden(structRow))

  return (
    <>
      <td className="box-border w-[7rem] px-2 py-2.5 align-middle text-center">
        {readOnly ? (
          <div className="flex justify-center">
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-xl p-1.5",
                isStructureRowHidden(structRow)
                  ? "bg-slate-200/50 ring-1 ring-slate-300/60"
                  : "bg-slate-50 ring-1 ring-slate-200/80"
              )}
              title="Modifiable dans la vue Sommaire"
            >
              <Checkbox
                checked={isStructureRowHidden(structRow)}
                disabled
                aria-label="Masquer (lecture seule)"
                className="pointer-events-none border-slate-300 opacity-70 data-[state=checked]:border-slate-600 data-[state=checked]:bg-slate-600"
              />
            </span>
          </div>
        ) : (
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
                    updateRow(idx, {
                      hidden: true,
                      defineMapping: false,
                      showInDetail: false,
                      linkCode: undefined,
                      annexLetter: undefined,
                    })
                  } else {
                    updateRow(idx, { hidden: false })
                  }
                }}
                aria-label="Masquer la ligne au sommaire"
                className="border-slate-300 data-[state=checked]:border-slate-700 data-[state=checked]:bg-slate-700"
              />
            </label>
          </div>
        )}
      </td>
      {!hideDefineColumn && (
        <>
          <td className="box-border w-[7rem] px-2 py-2.5 align-middle text-center">
            {isStructureRowEmptyLabel(structRow) ? (
              <span className="text-sm text-slate-300">—</span>
            ) : readOnly ? (
              <div className="flex justify-center">
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-xl p-1.5",
                    isStructureRowHidden(structRow) && "opacity-50",
                    !isStructureRowHidden(structRow) &&
                      isCodeMappingEnabled(structRow) &&
                      "bg-orange-50/60 ring-1 ring-[#E0742D]/25",
                    !isStructureRowHidden(structRow) &&
                      !isCodeMappingEnabled(structRow) &&
                      "bg-slate-50 ring-1 ring-slate-200/80"
                  )}
                  title="Modifiable dans la vue Sommaire"
                >
                  <Checkbox
                    checked={isCodeMappingEnabled(structRow)}
                    disabled
                    aria-label="Code (lecture seule)"
                    className="pointer-events-none border-slate-300 opacity-70 data-[state=checked]:border-[#E0742D] data-[state=checked]:bg-[#E0742D]"
                  />
                </span>
              </div>
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
                        updateRow(idx, { defineMapping: true })
                      } else {
                        updateRow(idx, {
                          defineMapping: false,
                          showInDetail: false,
                          linkCode: undefined,
                          annexLetter: undefined,
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
          <td className="box-border w-[7rem] px-2 py-2.5 align-middle text-center">
            {isStructureRowEmptyLabel(structRow) ? (
              <span className="text-sm text-slate-300">—</span>
            ) : readOnly ? (
              <div className="flex justify-center">
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-xl p-1.5",
                    isStructureRowHidden(structRow) && "opacity-50",
                    !isStructureRowHidden(structRow) &&
                      isShowInDetail(structRow) &&
                      "bg-sky-50/70 ring-1 ring-sky-300/60",
                    !isStructureRowHidden(structRow) &&
                      !isShowInDetail(structRow) &&
                      "bg-slate-50 ring-1 ring-slate-200/80"
                  )}
                  title="Modifiable dans la vue Sommaire"
                >
                  <Checkbox
                    checked={isShowInDetail(structRow)}
                    disabled
                    aria-label="Annexe (lecture seule)"
                    className="pointer-events-none border-slate-300 opacity-70 data-[state=checked]:border-sky-600 data-[state=checked]:bg-sky-600"
                  />
                </span>
              </div>
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
                      updateRow(idx, { showInDetail: v === true })
                    }}
                    aria-label="Annexe : afficher au détail"
                    className="border-slate-300 data-[state=checked]:border-sky-600 data-[state=checked]:bg-sky-600"
                  />
                </label>
              </div>
            )}
          </td>
        </>
      )}
      <td className="box-border w-[7rem] min-w-0 px-2 py-2.5 align-middle">
        {showLinkAnnexCells ? (
          readOnly ? (
            <span
              className="block truncate rounded-lg bg-slate-100/70 px-1.5 py-2 text-center font-mono text-xs text-slate-600"
              title="Modifiable dans la vue Sommaire"
            >
              {String(structRow.linkCode ?? "").trim() || "—"}
            </span>
          ) : (
            <Input
              value={String(structRow.linkCode ?? "")}
              onChange={(e) =>
                updateRow(idx, {
                  linkCode: e.target.value || undefined,
                  ...(hideDefineColumn ? { defineMapping: true } : {}),
                })
              }
              placeholder="REV"
              className="h-9 w-full min-w-0 rounded-xl border-slate-200/90 bg-white px-2 font-mono text-xs shadow-sm focus-visible:border-[#E0742D]/50 focus-visible:ring-2 focus-visible:ring-[#E0742D]/20"
            />
          )
        ) : (
          <span className="block truncate rounded-lg bg-slate-100/50 px-1.5 py-2 text-center text-sm text-slate-300">
            —
          </span>
        )}
      </td>
      <td className="box-border w-[7rem] min-w-0 px-2 py-2.5 align-middle">
        {isStructureRowHidden(structRow) && normalizeAnnexLetter(String(structRow.annexLetter ?? "")) ? (
          <span
            className="block truncate rounded-lg bg-slate-100/80 px-1.5 py-2 text-center text-xs font-bold uppercase tracking-widest text-slate-500"
            title="Annexe conservée tant que la ligne est masquée"
          >
            {normalizeAnnexLetter(String(structRow.annexLetter ?? ""))}
          </span>
        ) : showLinkAnnexCells ? (
          annexFieldReadOnly ? (
            <span
              className="block truncate rounded-lg bg-slate-100/70 px-1.5 py-2 text-center text-xs font-bold uppercase tracking-widest text-slate-600"
              title={
                readOnly ? "Modifiable dans la vue Sommaire" : "Annexe choisie lors de l’ajout de la ligne"
              }
            >
              {normalizeAnnexLetter(String(structRow.annexLetter ?? "")) || "—"}
            </span>
          ) : (
            <Input
              value={String(structRow.annexLetter ?? "")}
              onChange={(e) =>
                updateRow(idx, {
                  annexLetter: normalizeAnnexLetter(e.target.value) || undefined,
                  ...(hideDefineColumn ? { defineMapping: true } : {}),
                })
              }
              placeholder="A"
              className="h-9 w-full min-w-0 rounded-xl border-slate-200/90 bg-white px-2 text-center text-xs font-bold uppercase tracking-widest shadow-sm focus-visible:border-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500/25"
              maxLength={8}
            />
          )
        ) : (
          <span className="block truncate rounded-lg bg-slate-100/50 px-1.5 py-2 text-center text-sm text-slate-300">
            —
          </span>
        )}
      </td>
      <td className="box-border w-11 px-0 py-2.5 align-middle">
        {showRemoveButton && onRemoveRow ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl text-red-500 opacity-70 transition hover:bg-red-50 hover:text-red-600 hover:opacity-100"
            title="Supprimer la ligne"
            onClick={() => onRemoveRow(idx)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </td>
    </>
  )
}
