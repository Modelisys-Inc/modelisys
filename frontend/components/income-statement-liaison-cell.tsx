"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  formatLiaisonCellHint,
  normalizeLiaisonMode,
  normalizeCodeList,
} from "@/lib/income-statement-structure-utils"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown, Link2, Plus } from "lucide-react"

/** Libellé du poste (« nom du compte ») associé à un code de liaison, ou chaîne vide. */
function labelFor(labels: Map<string, string> | undefined, code: string): string {
  return labels?.get(code.trim()) ?? ""
}

/** Code en chasse fixe suivi, si connu, du libellé du poste en gris. */
function CodeWithLabel({
  code,
  labels,
  className,
}: {
  code: string
  labels?: Map<string, string>
  className?: string
}) {
  const label = labelFor(labels, code)
  return (
    <span className={cn("min-w-0", className)}>
      <span className="font-mono">{code}</span>
      {label && <span className="ml-1.5 text-slate-500"> — {label}</span>}
    </span>
  )
}

function LinkCodeCombobox({
  value,
  onChange,
  suggestions,
  labels,
  allowCreate = true,
}: {
  value: string
  onChange: (next: string) => void
  suggestions: string[]
  labels?: Map<string, string>
  allowCreate?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const trimmed = query.trim()
  const exactMatch = suggestions.includes(trimmed)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery("")
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between font-mono text-xs"
        >
          <span className="truncate">
            {value ? (
              <CodeWithLabel code={value} labels={labels} />
            ) : (
              <span className="text-slate-400">Sélectionner ou créer…</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={allowCreate ? "Rechercher ou saisir…" : "Rechercher…"}
            value={query}
            onValueChange={setQuery}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty className="px-3 py-2 text-xs text-slate-500">
              {allowCreate
                ? "Saisissez un code et appuyez sur Entrée pour le créer."
                : "Aucun code correspondant."}
            </CommandEmpty>
            {allowCreate && trimmed && !exactMatch && (
              <CommandGroup heading="Nouveau">
                <CommandItem
                  value={trimmed}
                  onSelect={() => {
                    onChange(trimmed)
                    setOpen(false)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Créer « {trimmed} »
                </CommandItem>
              </CommandGroup>
            )}
            {suggestions.length > 0 && (
              <CommandGroup heading="Codes existants">
                {suggestions.map((s) => (
                  <CommandItem
                    key={s}
                    value={`${s} ${labelFor(labels, s)}`.trim()}
                    onSelect={() => {
                      onChange(s)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === s ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <CodeWithLabel code={s} labels={labels} className="text-xs" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export interface IncomeStatementLiaisonCellProps {
  structRow: Record<string, unknown>
  rowIndex: number
  /** Tous les codes de liaison présents dans la structure (sauf cette ligne si besoin). */
  allLinkCodes: string[]
  /** Code de liaison → libellé du poste (« nom du compte ») affiché dans les sélecteurs. */
  linkCodeLabels?: Map<string, string>
  updateRow: (index: number, patch: Record<string, unknown>) => void
  readOnly?: boolean
  /** Détail : forcer defineMapping sur changements sensibles */
  hideDefineColumn?: boolean
  /** Paramètres Détail : liaison uniquement en « Code unique », pas addition / soustraction. */
  singleLiaisonModeOnly?: boolean
  /** Codes parents du plan standard (Compte de résultat ou Bilan) pour le mode « Code unique ». */
  singleModeLinkCodes?: string[]
  singleModeLinkCodeLabels?: Map<string, string>
}

function patchWithDefine(
  hideDefineColumn: boolean | undefined,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...patch }
  if (hideDefineColumn) out.defineMapping = true
  return out
}

function toggleCodeInList(list: string[], code: string, checked: boolean): string[] {
  const set = new Set(list)
  if (checked) set.add(code)
  else set.delete(code)
  return Array.from(set).sort((a, b) => a.localeCompare(b, "fr", { numeric: true }))
}

export function IncomeStatementLiaisonCell({
  structRow,
  rowIndex,
  allLinkCodes,
  linkCodeLabels,
  updateRow,
  readOnly = false,
  hideDefineColumn,
  singleLiaisonModeOnly = false,
  singleModeLinkCodes,
  singleModeLinkCodeLabels,
}: IncomeStatementLiaisonCellProps) {
  const [open, setOpen] = useState(false)
  const mode = normalizeLiaisonMode(structRow)
  const sumCodes = useMemo(
    () => normalizeCodeList(structRow.liaisonSumCodes),
    [structRow.liaisonSumCodes]
  )
  const numCodes = useMemo(
    () => normalizeCodeList(structRow.liaisonNumeratorCodes),
    [structRow.liaisonNumeratorCodes]
  )
  const denCodes = useMemo(
    () => normalizeCodeList(structRow.liaisonDenominatorCodes),
    [structRow.liaisonDenominatorCodes]
  )

  const codeOptions = useMemo(
    () => allLinkCodes.filter(Boolean),
    [allLinkCodes]
  )
  const useStandardSingleMode = singleModeLinkCodes !== undefined
  const singleSuggestions = useMemo(() => {
    const base = (singleModeLinkCodes ?? codeOptions).filter(Boolean)
    const current = String(structRow.linkCode ?? "").trim()
    if (current && !base.includes(current)) {
      return [current, ...base].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }))
    }
    return base
  }, [singleModeLinkCodes, codeOptions, structRow.linkCode])
  const liaisonCodeOptions = useMemo(() => {
    const base = (singleModeLinkCodes ?? codeOptions).filter(Boolean)
    if (!singleModeLinkCodes) return base
    const extras = new Set<string>()
    for (const code of [
      String(structRow.linkCode ?? ""),
      ...sumCodes,
      ...numCodes,
      ...denCodes,
    ]) {
      const trimmed = code.trim()
      if (trimmed && !base.includes(trimmed)) extras.add(trimmed)
    }
    if (extras.size === 0) return base
    return [...extras, ...base].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }))
  }, [
    singleModeLinkCodes,
    codeOptions,
    structRow.linkCode,
    sumCodes,
    numCodes,
    denCodes,
  ])
  const singleLabels = useMemo(() => {
    if (!singleModeLinkCodeLabels) return linkCodeLabels
    const merged = new Map(singleModeLinkCodeLabels)
    if (linkCodeLabels) {
      for (const [code, label] of linkCodeLabels) {
        if (!merged.has(code)) merged.set(code, label)
      }
    }
    return merged
  }, [singleModeLinkCodeLabels, linkCodeLabels])
  const liaisonLabels = singleModeLinkCodeLabels ? singleLabels : linkCodeLabels

  const applySingleLinkCode = (next: string) => {
    const patch: Record<string, unknown> = {
      linkCode: next || undefined,
      liaisonMode: "single",
    }
    if (next && useStandardSingleMode) {
      const stdLabel = singleLabels?.get(next.trim())
      if (stdLabel) patch.label = stdLabel
    }
    updateRow(rowIndex, patchWithDefine(hideDefineColumn, patch))
  }

  const hint = formatLiaisonCellHint(structRow)
  /** Anciennes lignes « n/a » : affichage du sélecteur sur « Code unique » sans forcer l’enregistrement. */
  const selectValue = mode === "na" ? "single" : mode

  const setMode = (next: "single" | "sum" | "difference") => {
    if (next === "single") {
      updateRow(
        rowIndex,
        patchWithDefine(hideDefineColumn, {
          liaisonMode: "single",
          liaisonSumCodes: undefined,
          liaisonNumeratorCodes: undefined,
          liaisonDenominatorCodes: undefined,
        })
      )
      return
    }
    if (next === "sum") {
      updateRow(
        rowIndex,
        patchWithDefine(hideDefineColumn, {
          liaisonMode: "sum",
          linkCode: undefined,
          liaisonNumeratorCodes: undefined,
          liaisonDenominatorCodes: undefined,
          annexLetter: undefined,
          showInDetail: false,
        })
      )
      return
    }
    updateRow(
      rowIndex,
      patchWithDefine(hideDefineColumn, {
        liaisonMode: "difference",
        linkCode: undefined,
        liaisonSumCodes: undefined,
        annexLetter: undefined,
        showInDetail: false,
      })
    )
  }

  if (readOnly) {
    return (
      <span
        className="block max-w-[7rem] truncate rounded-lg bg-slate-100/70 px-1.5 py-2 text-center font-mono text-[11px] text-slate-600"
        title="Modifiable dans la vue Sommaire"
      >
        {hint}
      </span>
    )
  }

  if (singleLiaisonModeOnly && (mode === "sum" || mode === "difference")) {
    return (
      <span
        className="block max-w-[7rem] truncate rounded-lg bg-amber-50/90 px-1.5 py-2 text-center font-mono text-[11px] text-amber-950"
        title="Le mode addition ou soustraction des liaisons se configure dans la vue Sommaire."
      >
        {hint}
      </span>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-9 w-full max-w-full justify-start gap-1.5 rounded-xl border-slate-200/90 px-2 font-mono text-[11px] shadow-sm",
            "focus-visible:border-[#E0742D]/50 focus-visible:ring-2 focus-visible:ring-[#E0742D]/20"
          )}
        >
          <Link2 className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <span className="truncate">{hint}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(100vw-1.5rem,22rem)] max-h-[min(70vh,32rem)] overflow-y-auto p-3"
        align="start"
      >
        <div className="space-y-3">
          {!singleLiaisonModeOnly && (
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600">Type de liaison</Label>
              <Select
                value={selectValue}
                onValueChange={(v) => setMode(v as "single" | "sum" | "difference")}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choix" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Code unique</SelectItem>
                  <SelectItem value="sum">Addition (somme de codes)</SelectItem>
                  <SelectItem value="difference">Soustraction (num. − dénom.)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {(singleLiaisonModeOnly || mode === "single" || mode === "na") && (
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600">Code de liaison</Label>
              <LinkCodeCombobox
                value={String(structRow.linkCode ?? "")}
                onChange={applySingleLinkCode}
                suggestions={singleSuggestions.filter(
                  (c) => c !== String(structRow.linkCode ?? "")
                )}
                labels={singleLabels}
                allowCreate={!useStandardSingleMode}
              />
            </div>
          )}

          {mode === "sum" && (
            <div className="space-y-2">
              <Label className="text-xs text-slate-600">Codes à additionner</Label>
              {liaisonCodeOptions.length === 0 ? (
                <p className="text-[11px] leading-snug text-amber-700">
                  {useStandardSingleMode
                    ? "Aucun code de liaison disponible dans le plan standard."
                    : "Aucun code de liaison dans la structure pour l'instant. Définissez d'abord des codes sur d'autres postes (mode « Code unique »)."}
                </p>
              ) : (
                <ul className="max-h-40 space-y-1.5 overflow-y-auto rounded-md border border-slate-200/80 bg-slate-50/50 p-2">
                  {liaisonCodeOptions.map((code) => (
                    <li key={code} className="flex items-center gap-2">
                      <Checkbox
                        id={`sum-${rowIndex}-${code}`}
                        checked={sumCodes.includes(code)}
                        onCheckedChange={(v) =>
                          updateRow(
                            rowIndex,
                            patchWithDefine(hideDefineColumn, {
                              liaisonSumCodes: toggleCodeInList(sumCodes, code, v === true),
                              liaisonMode: "sum",
                            })
                          )
                        }
                      />
                      <label
                        htmlFor={`sum-${rowIndex}-${code}`}
                        className="cursor-pointer text-xs"
                      >
                        <CodeWithLabel code={code} labels={liaisonLabels} />
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {!singleLiaisonModeOnly && mode === "difference" && (
            <div className="space-y-3">
              <p className="text-[11px] leading-snug text-slate-600">
                Montant = somme (numérateur) − somme (dénominateur).
              </p>
              <div className="space-y-2">
                <Label className="text-xs text-slate-600">Numérateur</Label>
                {liaisonCodeOptions.length === 0 ? (
                  <p className="text-[11px] text-amber-700">Aucun code disponible.</p>
                ) : (
                  <ul className="max-h-32 space-y-1.5 overflow-y-auto rounded-md border border-slate-200/80 bg-slate-50/50 p-2">
                    {liaisonCodeOptions.map((code) => (
                      <li key={`n-${code}`} className="flex items-center gap-2">
                        <Checkbox
                          id={`num-${rowIndex}-${code}`}
                          checked={numCodes.includes(code)}
                          onCheckedChange={(v) =>
                            updateRow(
                              rowIndex,
                              patchWithDefine(hideDefineColumn, {
                                liaisonNumeratorCodes: toggleCodeInList(numCodes, code, v === true),
                                liaisonMode: "difference",
                              })
                            )
                          }
                        />
                        <label
                          htmlFor={`num-${rowIndex}-${code}`}
                          className="cursor-pointer text-xs"
                        >
                          <CodeWithLabel code={code} labels={liaisonLabels} />
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-600">Dénominateur</Label>
                {liaisonCodeOptions.length === 0 ? null : (
                  <ul className="max-h-32 space-y-1.5 overflow-y-auto rounded-md border border-slate-200/80 bg-slate-50/50 p-2">
                    {liaisonCodeOptions.map((code) => (
                      <li key={`d-${code}`} className="flex items-center gap-2">
                        <Checkbox
                          id={`den-${rowIndex}-${code}`}
                          checked={denCodes.includes(code)}
                          onCheckedChange={(v) =>
                            updateRow(
                              rowIndex,
                              patchWithDefine(hideDefineColumn, {
                                liaisonDenominatorCodes: toggleCodeInList(denCodes, code, v === true),
                                liaisonMode: "difference",
                              })
                            )
                          }
                        />
                        <label
                          htmlFor={`den-${rowIndex}-${code}`}
                          className="cursor-pointer text-xs"
                        >
                          <CodeWithLabel code={code} labels={liaisonLabels} />
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
