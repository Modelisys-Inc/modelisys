"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function normalizeHexForColorInput(color: string | undefined, fallback: string): string {
  const s = (color ?? fallback).trim()
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    const r = s[1]!,
      g = s[2]!,
      b = s[3]!
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return /^#[0-9a-fA-F]{6}$/.test(fallback) ? fallback : "#3b82f6"
}

export interface ChartSeriesColorPickerProps {
  value: string | undefined
  onChange: (next: string | undefined) => void
  fallbackPreview?: string
  className?: string
  /** Une ligne horizontale discrète (ex. à côté du format). */
  compact?: boolean
}

export function ChartSeriesColorPicker({
  value,
  onChange,
  fallbackPreview = "#3b82f6",
  className,
  compact = false,
}: ChartSeriesColorPickerProps) {
  const preview = normalizeHexForColorInput(value, fallbackPreview)

  const controls = (
    <>
      <div
        className={cn(
          "shrink-0 rounded-md border border-slate-200/80 shadow-inner ring-1 ring-black/[0.04]",
          compact ? "h-8 w-8" : "h-9 w-9"
        )}
        style={{ backgroundColor: preview }}
        title="Aperçu"
        aria-hidden
      />
      <label className="inline-flex cursor-pointer items-center gap-0">
        <span className="sr-only">Ouvrir le nuancier système</span>
        <input
          type="color"
          value={preview}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "cursor-pointer rounded border border-slate-200 bg-white p-0.5 shadow-sm",
            compact ? "h-8 w-10" : "h-9 w-[4.5rem]"
          )}
        />
      </label>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("h-8 shrink-0 px-2 text-xs font-normal text-slate-500 hover:text-slate-800", compact && "h-7 px-1.5")}
        onClick={() => onChange(undefined)}
      >
        Défaut
      </Button>
    </>
  )

  if (compact) {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <span className="text-xs font-medium text-slate-500">Nuancier</span>
        {controls}
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-xs font-medium text-slate-500">Nuancier</span>
      <div className="flex flex-wrap items-center gap-3">{controls}</div>
    </div>
  )
}
