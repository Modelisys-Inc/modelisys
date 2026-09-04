"use client"

import { Info } from "lucide-react"
import { useId, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/** Texte au repos ; chrome d’édition uniquement au focus (clic). */
const editableRestClass =
  "rounded-sm border-0 border-b border-transparent bg-transparent outline-none transition-[border-color,background-color,padding] focus:border-dashed focus:border-[#E0742D] focus:bg-slate-50"

/* Champ numérique éditable au style « document » : texte figé jusqu’au focus. */
export function InlineNumber({
  value,
  onChange,
  unit = "%",
  step = 0.1,
  min,
  max,
  width = "w-20",
  ariaLabel,
  testId,
  className,
  unitClassName,
}: {
  value: number
  onChange: (value: number) => void
  unit?: string
  step?: number
  min?: number
  max?: number
  width?: string
  ariaLabel?: string
  testId?: string
  className?: string
  unitClassName?: string
}) {
  return (
    <span className="inline-flex items-baseline justify-end gap-1">
      <input
        data-editable
        data-testid={testId}
        type="number"
        inputMode="decimal"
        aria-label={ariaLabel}
        value={Number.isFinite(value) ? value : ""}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        className={cn(
          editableRestClass,
          width,
          "px-0 py-0.5 text-right font-mono text-sm tabular-nums text-[#2A2F3A] focus:px-1.5",
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          className,
        )}
      />
      {unit ? (
        <span className={cn("font-mono text-xs text-slate-500", unitClassName)}>{unit}</span>
      ) : null}
    </span>
  )
}

/** Montant $ : format monétaire (espaces milliers) au repos, saisie au focus. */
export function InlineCurrency({
  value,
  onChange,
  width = "w-32",
  ariaLabel,
  testId,
}: {
  value: number
  onChange: (value: number) => void
  width?: string
  ariaLabel?: string
  testId?: string
}) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const beginEdit = () => {
    setDraft(Number.isFinite(value) ? String(value) : "")
    setFocused(true)
    requestAnimationFrame(() => inputRef.current?.select())
  }

  const display =
    !Number.isFinite(value) || Math.abs(value) < 1e-9
      ? "—"
      : new Intl.NumberFormat("fr-CA", {
          style: "currency",
          currency: "CAD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value)

  return (
    <span className="inline-flex items-baseline justify-end gap-1">
      {focused ? (
        <>
          <input
            ref={inputRef}
            data-editable
            data-testid={testId}
            type="text"
            inputMode="decimal"
            aria-label={ariaLabel}
            value={draft}
            onChange={(e) => {
              const raw = e.target.value
              setDraft(raw)
              const normalized = raw.replace(/\s/g, "").replace(",", ".")
              if (normalized === "" || normalized === "-" || normalized === ".") return
              const next = Number(normalized)
              if (!Number.isFinite(next)) return
              onChange(next)
            }}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                e.preventDefault()
                ;(e.target as HTMLInputElement).blur()
              }
            }}
            className={cn(
              editableRestClass,
              width,
              "px-1.5 py-0.5 text-right font-mono text-sm tabular-nums text-[#2A2F3A]",
            )}
          />
          <span className="font-mono text-xs text-slate-500">$</span>
        </>
      ) : (
        <button
          type="button"
          data-testid={testId}
          aria-label={ariaLabel}
          onClick={beginEdit}
          className={cn(
            editableRestClass,
            width,
            "cursor-text px-0 py-0.5 text-right font-mono text-sm tabular-nums text-[#2A2F3A] hover:bg-slate-50/80",
          )}
        >
          {display}
        </button>
      )}
    </span>
  )
}

/* Texte éditable en ligne : rendu rapport jusqu’au focus. */
export function InlineText({
  value,
  onChange,
  ariaLabel,
  className = "",
  placeholder,
  testId,
}: {
  value: string
  onChange: (value: string) => void
  ariaLabel?: string
  className?: string
  placeholder?: string
  testId?: string
}) {
  return (
    <input
      data-editable
      data-testid={testId}
      type="text"
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        editableRestClass,
        "w-full px-0 py-0.5 text-[#2A2F3A] placeholder:text-slate-400 focus:px-1.5",
        className,
      )}
    />
  )
}

/* Zone multiligne : même rendu figé jusqu’au focus (sources section 5). */
export function InlineTextArea({
  value,
  onChange,
  ariaLabel,
  className = "",
  placeholder,
  testId,
  rows = 2,
}: {
  value: string
  onChange: (value: string) => void
  ariaLabel?: string
  className?: string
  placeholder?: string
  testId?: string
  rows?: number
}) {
  return (
    <textarea
      data-editable
      data-testid={testId}
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        editableRestClass,
        "w-full resize-none px-0 py-0 text-pretty text-xs leading-relaxed text-slate-500 placeholder:text-slate-400 focus:px-1.5 focus:py-1",
        className,
      )}
    />
  )
}

/* Ligne de paramètre : libellé + note + valeur éditable, style tableau. */
export function ParamRow({
  label,
  hint,
  note,
  onNoteChange,
  value,
  onChange,
  unit = "%",
  step = 0.1,
  min,
  max,
  width,
  testId,
  noteTestId,
  currency,
}: {
  label: string
  hint?: string
  note?: string
  onNoteChange?: (value: string) => void
  value: number
  onChange: (value: number) => void
  unit?: string
  step?: number
  min?: number
  max?: number
  width?: string
  testId?: string
  noteTestId?: string
  /** Affiche un montant $ formaté (fr-CA) au repos. */
  currency?: boolean
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-slate-200 py-2.5 last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-medium text-[#2A2F3A]">
          <LabelWithHint label={label} hint={hint} />
        </div>
        {onNoteChange != null ? (
          <div className="mt-0.5">
            <InlineText
              value={note ?? ""}
              onChange={onNoteChange}
              ariaLabel={`Note — ${label}`}
              placeholder="Note / source"
              className="text-pretty text-xs text-slate-500"
              testId={noteTestId}
            />
          </div>
        ) : note ? (
          <p className="mt-0.5 text-pretty text-xs text-slate-500">{note}</p>
        ) : null}
      </div>
      {currency ? (
        <InlineCurrency
          value={value}
          onChange={onChange}
          width={width ?? "w-32"}
          ariaLabel={label}
          testId={testId}
        />
      ) : (
        <InlineNumber
          value={value}
          onChange={onChange}
          unit={unit}
          step={step}
          min={min}
          max={max}
          width={width}
          ariaLabel={label}
          testId={testId}
        />
      )}
    </div>
  )
}

/* Libellé avec infobulle en lecture seule (survol). */
export function LabelWithHint({ label, hint }: { label: string; hint?: string }) {
  const id = useId()
  if (!hint) return <span>{label}</span>
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      <span className="group relative inline-flex" data-print-hide>
        <Info className="size-3.5 shrink-0 text-slate-500" aria-hidden="true" />
        <span className="sr-only" id={id}>
          {hint}
        </span>
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-60 -translate-x-1/2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-normal leading-relaxed text-slate-700 opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
        >
          {hint}
        </span>
      </span>
    </span>
  )
}
