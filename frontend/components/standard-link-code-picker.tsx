"use client"

import { useMemo, useState } from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { StandardLinkCode } from "@/lib/api"
import {
  sortStandardLinkCodesHierarchically,
  standardLinkCodeDisplayLabel,
} from "@/lib/standard-link-code-utils"
import { cn } from "@/lib/utils"

const FAMILY_LABELS: Record<string, string> = {
  ACT: "Actif à court terme",
  ALT: "Actif à long terme",
  PCT: "Passif à court terme",
  PLT: "Passif à long terme",
  CAP: "Capitaux propres",
  REV: "Revenus",
  CMV: "Coûts des produits vendus",
  EXP: "Frais d'exploitation",
  ADM: "Frais d'administration",
  VNT: "Frais de vente",
  FIN: "Frais financiers",
  AUT: "Autres dépenses (produits)",
  IMP: "Impôts",
  TEX: "Trésorerie — Exploitation",
  TIN: "Trésorerie — Investissement",
  TFI: "Trésorerie — Financement",
}

type StandardLinkCodePickerProps = {
  codes: StandardLinkCode[]
  value: string | undefined
  onChange: (code: string | undefined) => void
  disabled?: boolean
  loading?: boolean
  id?: string
}

export function StandardLinkCodePicker({
  codes,
  value,
  onChange,
  disabled = false,
  loading = false,
  id,
}: StandardLinkCodePickerProps) {
  const [open, setOpen] = useState(false)
  const trimmedValue = value?.trim() ?? ""
  const selected = codes.find((c) => c.code === trimmedValue)
  const isUnknown = trimmedValue.length > 0 && !selected

  const groups = useMemo(() => {
    const byFamily = new Map<string, StandardLinkCode[]>()
    for (const code of codes) {
      const list = byFamily.get(code.family) ?? []
      list.push(code)
      byFamily.set(code.family, list)
    }
    return Array.from(byFamily.entries())
      .sort(([a], [b]) => a.localeCompare(b, "fr", { numeric: true }))
      .map(([family, familyCodes]) => ({
        family,
        label: FAMILY_LABELS[family] ? `${family} — ${FAMILY_LABELS[family]}` : family,
        codes: sortStandardLinkCodesHierarchically(familyCodes),
      }))
  }, [codes])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className="h-10 w-full justify-between font-normal"
        >
          <span className="min-w-0 truncate text-left">
            {loading ? (
              <span className="inline-flex items-center gap-2 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des codes…
              </span>
            ) : selected ? (
              <>
                <span className="font-mono text-slate-900">{selected.code}</span>
                <span className="ml-2 text-slate-500">— {standardLinkCodeDisplayLabel(selected)}</span>
              </>
            ) : isUnknown ? (
              <>
                <span className="font-mono text-amber-800">{trimmedValue}</span>
                <span className="ml-2 text-amber-700">(hors charte)</span>
              </>
            ) : (
              <span className="text-slate-400">Sélectionner un code de liaison…</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(24rem,90vw)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher un code ou libellé…" />
          <CommandList>
            <CommandEmpty>Aucun code trouvé.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__ aucun"
                onSelect={() => {
                  onChange(undefined)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn("mr-2 h-4 w-4", !trimmedValue ? "opacity-100" : "opacity-0")}
                />
                <span className="text-slate-500">Aucun code</span>
              </CommandItem>
            </CommandGroup>
            {isUnknown ? (
              <>
                <CommandSeparator />
                <CommandGroup heading="Valeur actuelle">
                  <CommandItem value={`${trimmedValue} hors charte`} disabled>
                    <span className="font-mono text-xs text-amber-800">{trimmedValue}</span>
                    <span className="ml-2 text-xs text-amber-700">(hors charte)</span>
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
            {groups.map((group) => (
              <CommandGroup key={group.family} heading={group.label}>
                {group.codes.map((code) => {
                  const label = standardLinkCodeDisplayLabel(code)
                  return (
                    <CommandItem
                      key={code.code}
                      value={`${code.code} ${label} ${group.family}`}
                      onSelect={() => {
                        onChange(code.code)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          trimmedValue === code.code ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="flex min-w-0 flex-col">
                        <span className="font-mono text-xs text-slate-900">{code.code}</span>
                        <span className="truncate text-xs text-slate-500">{label}</span>
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
