"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

interface DiagnosticSectionProps {
  title: string
  subtitle?: string
  /** Phrase(s) narratives style mémo, affichées en tête de section. */
  lead?: string | null
  /** Lien discret « Voir l'analyse détaillée → » lorsque la page dédiée existe. */
  detailHref?: string
  children: ReactNode
}

/** Carte de section du rapport Diagnostic : titre h2 + narratif + lien d'analyse détaillée. */
export function DiagnosticSection({
  title,
  subtitle,
  lead,
  detailHref,
  children,
}: DiagnosticSectionProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-8 w-1 flex-shrink-0 rounded-full bg-emerald-500" aria-hidden />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {detailHref && (
          <Link
            href={detailHref}
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 transition-colors hover:text-emerald-800"
          >
            Voir l&apos;analyse détaillée
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>
      <div className="px-6 py-5">
        {lead && (
          <p
            data-testid="section-lead"
            className="mb-5 border-l-2 border-emerald-500/50 pl-3 text-sm italic leading-relaxed text-slate-600"
          >
            {lead}
          </p>
        )}
        {children}
      </div>
    </section>
  )
}
