"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { CompanyDiagnostic } from "@/lib/api"
import {
  formatDateFr,
  formatReferenceDateEndOfMonth,
} from "@/components/diagnostic/diagnostic-format"
import { DiagnosticReportViewButton } from "@/components/diagnostic/v2/diagnostic-report-pdf-export"
import {
  PORTAL_HERO_CLASS,
  PORTAL_HERO_META_CLASS,
  PORTAL_HERO_TITLE_CLASS,
} from "@/lib/diagnostic-theme"

interface DiagnosticHeroProps {
  companyId: string
  diagnosticId: string
  diagnostic: CompanyDiagnostic | null
  loading?: boolean
}

export function DiagnosticHero({
  companyId,
  diagnosticId,
  diagnostic,
  loading = false,
}: DiagnosticHeroProps) {
  const portalHref = `/modules/diagnostic${companyId ? `?companyId=${companyId}` : ""}`

  const referenceDate = diagnostic
    ? formatReferenceDateEndOfMonth(
        diagnostic.reference_period.calendar_year,
        diagnostic.reference_period.calendar_month,
      )
    : null

  return (
    <div className={PORTAL_HERO_CLASS}>
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-24 -left-28 h-[320px] w-[320px] rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-6 py-6 sm:py-8">
        <Link
          href={portalHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#C9B8A5]/90 transition-colors hover:text-[#E6D6C3]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Mes diagnostics
        </Link>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {loading && !diagnostic ? (
              <h1 className={`mt-2 ${PORTAL_HERO_TITLE_CLASS}`}>Chargement du diagnostic…</h1>
            ) : diagnostic ? (
              <>
                <h1 className={`mt-2 ${PORTAL_HERO_TITLE_CLASS}`}>
                  Diagnostic de {diagnostic.company_name} — {referenceDate}
                </h1>
                <p className={`mt-2 ${PORTAL_HERO_META_CLASS}`}>
                  Mise à jour : {formatDateFr(diagnostic.generated_at)}
                </p>
              </>
            ) : null}
          </div>

          {diagnostic ? (
            <DiagnosticReportViewButton
              diagnosticId={diagnosticId}
              companyId={companyId}
              referenceYear={diagnostic.reference_period.calendar_year}
              referenceMonth={diagnostic.reference_period.calendar_month}
              variant="portal"
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
