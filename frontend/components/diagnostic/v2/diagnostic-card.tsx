"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { CARD_CLASS, signalClass, type SignalTone } from "@/lib/diagnostic-theme"

interface DiagnosticCardProps {
  id: string
  title: string
  subtitle?: string
  detailHref?: string
  /** Légende affichée à droite de l'en-tête (pastilles de série). */
  legend?: ReactNode
  /** Bandeau « Signal » sous le contenu. Remplace l'ancien `lead` narratif. */
  signal?: { tone: SignalTone; text: string } | null
  className?: string
  bodyClassName?: string
  testId?: string
  children: ReactNode
}

/**
 * Carte de section du rapport Diagnostic (thème clair).
 *
 * Remplace `components/diagnostic/diagnostic-section.tsx` : même contrat
 * (titre, sous-titre, lien d'analyse détaillée) mais le paragraphe narratif
 * en italique devient un bandeau « Signal » coloré placé APRÈS le graphique,
 * pour que la conclusion suive la preuve.
 */
export function DiagnosticCard({
  id,
  title,
  subtitle,
  detailHref,
  legend,
  signal,
  className = "",
  bodyClassName = "",
  testId,
  children,
}: DiagnosticCardProps) {
  return (
    <section id={id} data-testid={testId} className={`${CARD_CLASS} ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-[18px] py-[15px]">
        <div className="flex min-w-0 gap-[11px]">
          <span className="w-[3px] flex-none rounded-full bg-[#E0742D]" aria-hidden />
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold leading-tight tracking-tight text-[#2A2F3A]">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-[3px] text-[11.5px] leading-tight text-slate-500">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {legend}
          {detailHref && (
            <Link
              href={detailHref}
              className="inline-flex flex-none items-center gap-1 text-[11px] font-medium text-[#E0742D] transition-colors hover:text-[#F08F4F]"
            >
              Voir l&apos;analyse détaillée
              <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          )}
        </div>
      </div>

      <div className={bodyClassName || "px-4 pb-3 pt-2"}>{children}</div>

      {signal && (
        <div className="px-[18px] pb-[14px]">
          <p data-testid="diagnostic-signal" className={signalClass(signal.tone)}>
            <span className="font-semibold">Signal</span> — {signal.text}
          </p>
        </div>
      )}
    </section>
  )
}

/** Pastille de légende (carré plein pour une aire, trait pour une ligne). */
export function LegendChip({
  label,
  color,
  variant = "square",
}: {
  label: string
  color: string
  variant?: "square" | "line"
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-slate-500">
      <span
        aria-hidden
        style={{ background: color }}
        className={variant === "line" ? "h-[2.5px] w-4 rounded-full" : "h-2.5 w-2.5 rounded-sm"}
      />
      {label}
    </span>
  )
}
