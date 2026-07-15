"use client"

import { useMemo, useState } from "react"
import { Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type MappingColumnFilterProps = {
  label: string
  values: string[]
  selected: Set<string> | undefined
  onSelectedChange: (next: Set<string> | undefined) => void
}

export function MappingColumnFilter({
  label,
  values,
  selected,
  onSelectedChange,
}: MappingColumnFilterProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const effectiveSelected = selected ?? new Set(values)
  const isActive = selected !== undefined && selected.size < values.length

  const filteredValues = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return values
    return values.filter((v) => v.toLowerCase().includes(q))
  }, [values, query])

  const toggleValue = (value: string, checked: boolean) => {
    const base = selected ? new Set(selected) : new Set(values)
    if (checked) base.add(value)
    else base.delete(value)
    if (base.size >= values.length) {
      onSelectedChange(undefined)
    } else {
      onSelectedChange(base)
    }
  }

  const selectAll = () => {
    onSelectedChange(undefined)
  }

  const clearAll = () => {
    onSelectedChange(new Set())
  }

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
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 w-7 shrink-0 p-0 text-slate-400 hover:text-slate-700",
            isActive && "text-[#E0742D] hover:text-[#c96526]",
          )}
          aria-label={`Filtrer la colonne ${label}`}
        >
          <Filter className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="border-b border-slate-100 px-3 py-2">
          <p className="text-xs font-semibold text-slate-700">Filtrer : {label}</p>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher…"
            className="mt-2 h-8 text-xs"
            aria-label={`Rechercher dans ${label}`}
          />
        </div>
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
          <button
            type="button"
            className="text-xs font-medium text-[#E0742D] hover:underline"
            onClick={selectAll}
          >
            Tout sélectionner
          </button>
          <button
            type="button"
            className="text-xs font-medium text-slate-500 hover:underline"
            onClick={clearAll}
          >
            Tout désélectionner
          </button>
        </div>
        <div className="max-h-60 overflow-y-auto px-3 py-2">
          {filteredValues.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">Aucune valeur.</p>
          ) : (
            <ul className="space-y-1">
              {filteredValues.map((value) => {
                const checked = effectiveSelected.has(value)
                const id = `${label}-${value}`.replace(/\s+/g, "-")
                return (
                  <li key={value}>
                    <label
                      htmlFor={id}
                      className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1.5 hover:bg-slate-50"
                    >
                      <Checkbox
                        id={id}
                        checked={checked}
                        onCheckedChange={(state) => toggleValue(value, state === true)}
                        className="mt-0.5"
                      />
                      <span className="min-w-0 flex-1 break-words text-xs text-slate-700">{value}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
