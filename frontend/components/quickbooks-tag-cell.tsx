"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface TagCellProps {
  values: string[]
  /** Known options offered in the picker (union of discovered values). */
  options: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}

export function QuickBooksTagCell({
  values,
  options,
  onChange,
  placeholder = "Add…",
}: TagCellProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const add = (raw: string) => {
    const v = raw.trim()
    if (!v || values.includes(v)) return
    onChange([...values, v].sort())
    setQuery("")
  }
  const remove = (v: string) => onChange(values.filter((x) => x !== v))

  const suggestions = options.filter((o) => !values.includes(o))

  return (
    <div className="flex flex-wrap items-center gap-1">
      {values.map((v) => (
        <Badge key={v} variant="secondary" className="gap-1 text-xs">
          {v}
          <button
            type="button"
            aria-label={`Remove ${v}`}
            onClick={() => remove(v)}
            className="opacity-60 hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-1 text-xs text-muted-foreground"
            aria-label="Add tag"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0">
          <Command>
            <CommandInput
              placeholder={placeholder}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>
                {query.trim() ? (
                  <button
                    type="button"
                    className="w-full px-2 py-1.5 text-left text-xs hover:bg-accent"
                    onClick={() => {
                      add(query)
                      setOpen(false)
                    }}
                  >
                    Add &quot;{query.trim()}&quot;
                  </button>
                ) : (
                  "No options"
                )}
              </CommandEmpty>
              {suggestions.length > 0 && (
                <CommandGroup>
                  {suggestions.map((o) => (
                    <CommandItem
                      key={o}
                      value={o}
                      onSelect={() => {
                        add(o)
                        setOpen(false)
                      }}
                    >
                      {o}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
