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
import { Input } from "@/components/ui/input"
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
  normalizeLiaisonFactor,
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
  /** Fonds de roulement : autorise aussi multiplication et division. */
  allowProductQuotient?: boolean
  /**
   * Multiplicateur : pas de « Code unique » — uniquement Hypothèse (saisie) ou formule
   * (addition / soustraction / multiplication / division).
   */
  hideSingleLiaisonMode?: boolean
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
  allowProductQuotient = false,
  hideSingleLiaisonMode = false,
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
  const liaisonFactor = normalizeLiaisonFactor(structRow.liaisonFactor)

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
    const standard = (singleModeLinkCodes ?? []).filter(Boolean)
    const fromStruct = codeOptions
    // Inclure les codes de structure (ex. résultats de formules WC « FDR ») même quand
    // singleModeLinkCodes (plan standard) est fourni.
    const base =
      singleModeLinkCodes !== undefined
        ? [...new Set([...standard, ...fromStruct])]
        : fromStruct
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
    if (extras.size === 0) {
      return [...base].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }))
    }
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
  const liaisonLabels = useMemo(() => {
    const merged = new Map(singleModeLinkCodeLabels ? singleLabels : linkCodeLabels)
    if (linkCodeLabels) {
      for (const [code, label] of linkCodeLabels) {
        if (!merged.has(code)) merged.set(code, label)
      }
    }
    return merged
  }, [singleModeLinkCodeLabels, singleLabels, linkCodeLabels])

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
  /** Multiplicateur : Hypothèse (n/a ou ancien code unique) ; sinon repli « Code unique » pour n/a. */
  const selectValue = hideSingleLiaisonMode
    ? mode === "single" || mode === "na"
      ? "na"
      : mode
    : mode === "na"
      ? "single"
      : mode
  const displayHint =
    hideSingleLiaisonMode && (mode === "na" || mode === "single") ? "Hypothèse" : hint
  const emptyOperandMessage = hideSingleLiaisonMode
    ? "Aucun poste référencé pour l’instant. Activez le Code et choisissez Hypothèse ou une formule sur d’autres postes."
    : useStandardSingleMode
      ? "Aucun code de liaison disponible dans le plan standard."
      : "Aucun code de liaison dans la structure pour l'instant. Définissez d'abord des codes sur d'autres postes (mode « Code unique »)."

  const setMode = (next: "na" | "single" | "sum" | "difference" | "product" | "quotient") => {
    if (next === "na") {
      updateRow(
        rowIndex,
        patchWithDefine(hideDefineColumn, {
          liaisonMode: "na",
          linkCode: undefined,
          liaisonSumCodes: undefined,
          liaisonNumeratorCodes: undefined,
          liaisonDenominatorCodes: undefined,
          liaisonFactor: undefined,
          annexLetter: undefined,
          showInDetail: false,
        }),
      )
      return
    }
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
    if (next === "sum" || next === "product") {
      updateRow(
        rowIndex,
        patchWithDefine(hideDefineColumn, {
          liaisonMode: next,
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
        liaisonMode: next,
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

  if (
    singleLiaisonModeOnly &&
    (mode === "sum" || mode === "difference" || mode === "product" || mode === "quotient")
  ) {
    return (
      <span
        className="block max-w-[7rem] truncate rounded-lg bg-amber-50/90 px-1.5 py-2 text-center font-mono text-[11px] text-amber-950"
        title="Le mode addition, soustraction, multiplication ou division des liaisons se configure dans la vue Sommaire."
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
          <span className="truncate">{displayHint}</span>
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
                onValueChange={(v) =>
                  setMode(v as "na" | "single" | "sum" | "difference" | "product" | "quotient")
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choix" />
                </SelectTrigger>
                <SelectContent>
                  {hideSingleLiaisonMode ? (
                    <SelectItem value="na">Hypothèse</SelectItem>
                  ) : (
                    <SelectItem value="single">Code unique</SelectItem>
                  )}
                  <SelectItem value="sum">Addition (somme de codes)</SelectItem>
                  <SelectItem value="difference">Soustraction (num. − dénom.)</SelectItem>
                  {allowProductQuotient && (
                    <>
                      <SelectItem value="product">Multiplication (produit de codes)</SelectItem>
                      <SelectItem value="quotient">Division (num. ÷ dénom.)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {!hideSingleLiaisonMode &&
            (singleLiaisonModeOnly || mode === "single" || mode === "na") && (
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

          {hideSingleLiaisonMode && (mode === "na" || mode === "single") && (
            <p className="text-[11px] leading-snug text-slate-600">
              Saisissez le chiffre directement dans la carte Multiplicateur (colonne Valeur).
            </p>
          )}

          {(mode === "sum" || mode === "product") && (
            <div className="space-y-2">
              <Label className="text-xs text-slate-600">
                {mode === "product" ? "Codes à multiplier" : "Codes à additionner"}
              </Label>
              {liaisonCodeOptions.length === 0 ? (
                <p className="text-[11px] leading-snug text-amber-700">{emptyOperandMessage}</p>
              ) : (
                <ul className="max-h-40 space-y-1.5 overflow-y-auto rounded-md border border-slate-200/80 bg-slate-50/50 p-2">
                  {liaisonCodeOptions.map((code) => (
                    <li key={code} className="flex items-center gap-2">
                      <Checkbox
                        id={`${mode}-${rowIndex}-${code}`}
                        checked={sumCodes.includes(code)}
                        onCheckedChange={(v) =>
                          updateRow(
                            rowIndex,
                            patchWithDefine(hideDefineColumn, {
                              liaisonSumCodes: toggleCodeInList(sumCodes, code, v === true),
                              liaisonMode: mode,
                            })
                          )
                        }
                      />
                      <label
                        htmlFor={`${mode}-${rowIndex}-${code}`}
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

          {!singleLiaisonModeOnly && (mode === "difference" || mode === "quotient") && (
            <div className="space-y-3">
              <p className="text-[11px] leading-snug text-slate-600">
                {mode === "quotient"
                  ? "Montant = (somme numérateur ÷ somme dénominateur) × facteur."
                  : "Montant = somme (numérateur) − somme (dénominateur)."}
              </p>
              <div className="space-y-2">
                <Label className="text-xs text-slate-600">Numérateur</Label>
                {liaisonCodeOptions.length === 0 ? (
                  <p className="text-[11px] text-amber-700">
                    {hideSingleLiaisonMode ? emptyOperandMessage : "Aucun code disponible."}
                  </p>
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
                                liaisonMode: mode,
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
                                liaisonMode: mode,
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
              {mode === "quotient" && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <Label htmlFor={`factor-${rowIndex}`} className="text-xs text-slate-600">
                    Facteur (ex. 365 pour un délai en jours)
                  </Label>
                  <Input
                    id={`factor-${rowIndex}`}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    className="h-9 text-xs"
                    value={Number.isFinite(liaisonFactor) ? liaisonFactor : 1}
                    onChange={(e) => {
                      const raw = e.target.value
                      const next = raw === "" ? 1 : Number(raw)
                      updateRow(
                        rowIndex,
                        patchWithDefine(hideDefineColumn, {
                          liaisonMode: "quotient",
                          liaisonFactor: Number.isFinite(next) ? next : 1,
                        })
                      )
                    }}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[1, 12, 100, 365].map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        size="sm"
                        variant={liaisonFactor === preset ? "default" : "outline"}
                        className={cn(
                          "h-7 rounded-lg px-2 text-[11px]",
                          liaisonFactor === preset && "bg-[#2A2F3A] hover:bg-[#2A2F3A]/90"
                        )}
                        onClick={() =>
                          updateRow(
                            rowIndex,
                            patchWithDefine(hideDefineColumn, {
                              liaisonMode: "quotient",
                              liaisonFactor: preset,
                            })
                          )
                        }
                      >
                        ×{preset}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
