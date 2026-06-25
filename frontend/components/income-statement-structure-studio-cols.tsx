"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { IncomeStatementLiaisonCell } from "@/components/income-statement-liaison-cell"
import {
  isAnnexLetterInputEditable,
  isCodeMappingEnabled,
  isShowInDetail,
  isStructureRowEmptyLabel,
  isStructureRowHidden,
  isSummaryAnnexRowLockedInDetailEdit,
  normalizeAnnexLetter,
  normalizeDtCt,
} from "@/lib/income-statement-structure-utils"
import { cn } from "@/lib/utils"
import { Trash2 } from "lucide-react"

interface IncomeStatementStructureStudioColsProps {
  rowIndex: number
  structRow: Record<string, unknown>
  /** Codes de liaison collectés dans la structure (Sommaire) pour les listes multi-sélection. */
  allLinkCodes: string[]
  /** Code de liaison → libellé du poste, pour afficher « code — nom » dans les sélecteurs. */
  linkCodeLabels?: Map<string, string>
  updateRow: (index: number, patch: Record<string, unknown>) => void
  /** Bascule « Annexe » puis renumérote les identifiants selon l'ordre du rapport. */
  setShowInDetail: (index: number, checked: boolean) => void
  showRemoveButton: boolean
  onRemoveRow?: (index: number) => void
  mappingColumnsReadOnly?: boolean
  annexReadOnly?: boolean
  hideDefineColumn?: boolean
  /** Paramètres Détail : masquer la colonne DT/CT. */
  hideDtCtColumn?: boolean
  /** Paramètres Détail : afficher le code de liaison en lecture seule (plan standard). */
  readOnlyLinkCode?: boolean
}

export function IncomeStatementStructureStudioCols({
  rowIndex: idx,
  structRow,
  allLinkCodes,
  linkCodeLabels,
  updateRow,
  setShowInDetail,
  showRemoveButton,
  onRemoveRow,
  mappingColumnsReadOnly = false,
  annexReadOnly = false,
  hideDefineColumn = false,
  hideDtCtColumn = false,
  readOnlyLinkCode = false,
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
      <td className="box-border min-w-0 px-2 py-2.5 align-middle text-center">
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
                      ...(hideDefineColumn ? { dtCt: undefined } : {}),
                      // Détail Paramètres : conserver la lettre d’annexe (réglée au Sommaire ou pour le bloc).
                      ...(hideDefineColumn ? {} : { annexLetter: undefined }),
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
        <td className="box-border w-[7rem] min-w-0 px-2 py-2.5 align-middle">
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
      )}
      <td className="box-border min-w-0 px-2 py-2.5 align-middle">
        {showLinkAnnexCells ? (
          readOnlyLinkCode ? (
            <span
              className="block min-w-0 rounded-lg bg-slate-100/70 px-2 py-2 text-left font-mono text-[11px] leading-snug text-slate-700"
              title="Code de liaison défini par le plan standard"
            >
              {(() => {
                const code = String(structRow.linkCode ?? "").trim()
                return code || "—"
              })()}
            </span>
          ) : (
            <IncomeStatementLiaisonCell
              structRow={structRow}
              rowIndex={idx}
              allLinkCodes={allLinkCodes}
              linkCodeLabels={linkCodeLabels}
              updateRow={updateRow}
              readOnly={readOnly}
              hideDefineColumn={hideDefineColumn}
              singleLiaisonModeOnly={hideDefineColumn}
            />
          )
        ) : (
          <span className="block truncate rounded-lg bg-slate-100/50 px-1.5 py-2 text-center text-sm text-slate-300">
            —
          </span>
        )}
      </td>
      {hideDefineColumn && !hideDtCtColumn && (
        <td className="box-border w-[7rem] min-w-0 px-2 py-2.5 align-middle">
          {isStructureRowEmptyLabel(structRow) ? (
            <span className="block text-center text-sm text-slate-300">—</span>
          ) : !showLinkAnnexCells ? (
            <span className="block text-center text-sm text-slate-300">—</span>
          ) : isSummaryAnnexRowLockedInDetailEdit(structRow) ? (
            <span className="block text-center text-sm text-slate-300">—</span>
          ) : (
            <Select
              value={(() => {
                const d = normalizeDtCt(structRow.dtCt)
                return d === "DT" || d === "CT" ? d : undefined
              })()}
              onValueChange={(v) => updateRow(idx, { dtCt: v })}
            >
              <SelectTrigger
                className="h-9 w-full min-w-0 rounded-xl border-slate-200/90 px-2 text-xs font-semibold uppercase shadow-sm focus-visible:ring-[#E0742D]/25 data-[placeholder]:text-slate-400"
                aria-label="DT ou CT"
              >
                <SelectValue placeholder="Choisir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DT">DT</SelectItem>
                <SelectItem value="CT">CT</SelectItem>
              </SelectContent>
            </Select>
          )}
        </td>
      )}
      {!hideDefineColumn && (
        <td className="box-border w-[7rem] min-w-0 px-2 py-2.5 align-middle">
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
                    setShowInDetail(idx, v === true)
                  }}
                  aria-label="Annexe : afficher au détail"
                  className="border-slate-300 data-[state=checked]:border-sky-600 data-[state=checked]:bg-sky-600"
                />
              </label>
            </div>
          )}
        </td>
      )}
      <td className="box-border min-w-0 px-2 py-2.5 align-middle text-center">
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
                readOnly
                  ? "Modifiable dans la vue Sommaire"
                  : "Identifiant attribué automatiquement selon l’ordre d’apparition de l’annexe dans le rapport."
              }
            >
              {normalizeAnnexLetter(String(structRow.annexLetter ?? "")) || "—"}
            </span>
          ) : (
            <Input
              value={String(structRow.annexLetter ?? "")}
              disabled={!isAnnexLetterInputEditable(structRow)}
              onChange={(e) =>
                updateRow(idx, {
                  annexLetter: normalizeAnnexLetter(e.target.value) || undefined,
                  ...(hideDefineColumn ? { defineMapping: true } : {}),
                })
              }
              placeholder="A"
              title={
                !isAnnexLetterInputEditable(structRow)
                  ? "Identifiant attribué automatiquement selon l’ordre d’apparition de l’annexe dans le rapport."
                  : undefined
              }
              className={cn(
                "h-9 w-full min-w-0 rounded-xl border-slate-200/90 px-2 text-center text-xs font-bold uppercase tracking-widest shadow-sm focus-visible:border-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500/25",
                isAnnexLetterInputEditable(structRow)
                  ? "bg-white"
                  : "cursor-not-allowed bg-slate-100/80 text-slate-400"
              )}
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
