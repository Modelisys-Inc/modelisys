"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { X, ArrowRight } from "lucide-react"
import type { DrillDownRequest } from "@/components/diagnostic/v2/types"
import { DIAG } from "@/lib/diagnostic-theme"

interface DiagnosticDrilldownDrawerProps {
  request: DrillDownRequest | null
  onClose: () => void
}

const TONE_COLOR: Record<string, string> = {
  neutral: DIAG.text,
  positive: DIAG.positive,
  negative: DIAG.negative,
}

/**
 * Tiroir de détail ouvert au clic sur n'importe quel élément cliquable du
 * rapport (carte KPI, barre d'exercice, bulle de division, ligne de produit).
 *
 * Il évite la navigation : l'utilisateur reste dans le fil du diagnostic et
 * garde le lien « Ouvrir l'analyse complète » s'il veut vraiment changer de page.
 */
export function DiagnosticDrilldownDrawer({ request, onClose }: DiagnosticDrilldownDrawerProps) {
  const panelRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!request) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [request, onClose])

  // Focus initial sur le panneau à l'ouverture, retour au déclencheur à la fermeture.
  useEffect(() => {
    if (!request) return
    const previous = document.activeElement as HTMLElement | null
    panelRef.current?.querySelector<HTMLElement>("button")?.focus()
    return () => previous?.focus()
  }, [request])

  // Piège de focus : Tab reste dans le tiroir tant qu'il est ouvert (aria-modal).
  const trapFocus = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !panelRef.current) return
    const focusables = panelRef.current.querySelectorAll<HTMLElement>(
      'button, a[href], [tabindex]:not([tabindex="-1"])'
    )
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  if (!request) return null

  const max = Math.max(...request.series.map((s) => Math.abs(s.value))) || 1
  const barW = 44
  const gap = 30

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[rgba(8,10,14,.55)]"
        onClick={onClose}
        aria-hidden
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={request.title}
        onKeyDown={trapFocus}
        className="fixed inset-y-0 right-0 z-50 flex w-[440px] max-w-full flex-col overflow-auto border-l border-slate-200 bg-white shadow-2xl shadow-slate-900/10"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-[18px]">
          <div>
            <div className="text-[9.5px] font-semibold uppercase tracking-[.14em] text-[#E0742D]">
              {request.kicker}
            </div>
            <div className="mt-1.5 text-[19px] font-semibold leading-tight tracking-[-.01em] text-[#2A2F3A]">
              {request.title}
            </div>
            {request.subtitle && (
              <div className="mt-1 text-[11.5px] leading-snug text-slate-500">
                {request.subtitle}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le détail"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:text-[#2A2F3A]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="flex flex-col gap-4 px-5 py-4">
          <div className="grid grid-cols-2 gap-2.5">
            {request.stats.map((s) => (
              <div
                key={s.label}
                className="rounded-[9px] border border-slate-200 bg-slate-50 px-3 py-2.5"
              >
                <div className="text-[9px] font-semibold uppercase tracking-[.1em] text-slate-400">
                  {s.label}
                </div>
                <div
                  className="mt-1 font-mono text-base font-semibold tabular-nums"
                  style={{ color: TONE_COLOR[s.tone ?? "neutral"] }}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {request.series.length > 0 && (
            <div>
              <div className="mb-2.5 text-[9.5px] font-semibold uppercase tracking-[.12em] text-slate-400">
                Évolution
              </div>
              <svg
                viewBox={`0 0 ${request.series.length * (barW + gap)} 134`}
                className="block h-auto w-full overflow-visible"
              >
                {request.series.map((s, i) => {
                  const h = Math.max(3, (Math.abs(s.value) / max) * 80)
                  const x = i * (barW + gap) + gap / 2
                  return (
                    <g key={s.label}>
                      <rect
                        x={x}
                        y={106 - h}
                        width={barW}
                        height={h}
                        rx={3}
                        fill={s.value < 0 ? "#F16A5C" : "rgba(52,211,153,.7)"}
                      />
                      <text
                        x={x + barW / 2}
                        y={102 - h}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={600}
                        fontFamily="ui-monospace,Menlo,monospace"
                        fill="#2A2F3A"
                      >
                        {request.formatValue(s.value)}
                      </text>
                      <text
                        x={x + barW / 2}
                        y={126}
                        textAnchor="middle"
                        fontSize={10}
                        fill="#94a3b8"
                      >
                        {s.label}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
          )}

          {request.notes && request.notes.length > 0 && (
            <div>
              <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[.12em] text-slate-400">
                Lecture
              </div>
              <ul className="flex list-disc flex-col gap-1.5 pl-4">
                {request.notes.map((n, i) => (
                  <li key={i} className="text-[11.5px] leading-relaxed text-slate-600">
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {request.detailHref && (
            <Link
              href={request.detailHref}
              className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-[#E0742D] px-3.5 py-2.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-[#c96526]"
            >
              Ouvrir l&apos;analyse complète
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          )}
        </div>
      </aside>
    </>
  )
}
