"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { AlertTriangle } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { ValuationPlanBackButton } from "@/components/valuation-plan-back-button"
import { CapitalisationReport } from "@/components/capitalisation/capitalisation-report"
import { Button } from "@/components/ui/button"
import { useCompanies } from "@/hooks/use-companies"
import { useEbitdaCapitalisation } from "@/hooks/use-ebitda-capitalisation"

const MONTH_NAMES_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
]

export default function EBITDAMultiplePage() {
  const { companies } = useCompanies()
  const searchParams = useSearchParams()
  const companyIdFromUrl = searchParams.get("companyId")
  const lockedCompanyId =
    companyIdFromUrl && companies.some((c) => c.id === companyIdFromUrl)
      ? companyIdFromUrl
      : null
  const companyId = lockedCompanyId || companies[0]?.id || null
  const companyName = companies.find((c) => c.id === companyId)?.name ?? "—"

  const refMonth = useMemo(() => {
    const fromUrl = Number(searchParams.get("refMonth"))
    if (Number.isFinite(fromUrl) && fromUrl >= 1 && fromUrl <= 12) return fromUrl
    return new Date().getMonth() + 1
  }, [searchParams])

  const refYear = useMemo(() => {
    const fromUrl = Number(searchParams.get("refYear"))
    if (Number.isFinite(fromUrl) && fromUrl >= 1900) return fromUrl
    return new Date().getFullYear()
  }, [searchParams])

  const referenceLabel = useMemo(
    () => `${MONTH_NAMES_FR[refMonth - 1]} ${refYear}`,
    [refMonth, refYear],
  )

  const capitalisation = useEbitdaCapitalisation({
    companyId,
    companies,
    refMonth,
    refYear,
  })

  if (!capitalisation.hasAcceptedDisclaimer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white via-slate-50 to-white p-6">
        <div
          className="w-full max-w-3xl rounded-xl border border-amber-200 bg-white p-8 shadow-xl"
          data-testid="capitalisation-disclaimer"
        >
          <div className="mb-6 flex items-start gap-4">
            <div className="flex shrink-0 rounded-full bg-amber-100 p-3">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Avertissement important</h2>
              <p className="mt-1 text-sm text-slate-600">
                Veuillez lire attentivement les informations suivantes avant de continuer
              </p>
            </div>
          </div>

          <div className="mb-8 space-y-4">
            <div className="rounded-r-lg border-l-4 border-amber-400 bg-amber-50 p-4">
              <p className="mb-2 text-sm font-semibold text-amber-900">
                Avis de non-responsabilité
              </p>
              <p className="text-sm leading-relaxed text-amber-800">
                Le processus de détermination de la valeur d&apos;entreprise présenté dans cette
                section est <strong>uniquement à des fins de consultation</strong> et ne
                représente en aucun cas un rapport d&apos;évaluation d&apos;entreprise conforme
                aux normes professionnelles établies par l&apos;Institut canadien des
                évaluateurs d&apos;entreprises (ICÉÉ) et les normes CBV (Chartered Business
                Valuator).
              </p>
            </div>

            <ul className="space-y-3 text-sm text-slate-700">
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                <span>
                  Les calculs et estimations fournis sont basés sur des données et hypothèses
                  que vous avez saisies et peuvent ne pas refléter la valeur réelle de votre
                  entreprise.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                <span>
                  Cette fonctionnalité ne constitue pas un avis professionnel en matière
                  d&apos;évaluation d&apos;entreprise et ne doit pas être utilisée comme seule
                  base pour prendre des décisions financières importantes.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                <span>
                  Pour obtenir une évaluation d&apos;entreprise conforme aux normes
                  professionnelles, vous devez consulter un évaluateur d&apos;entreprises
                  certifié (CBV) ou un professionnel qualifié.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                <span>
                  Les résultats présentés sont fournis « tels quels » sans garantie
                  d&apos;exactitude, d&apos;exhaustivité ou de pertinence pour votre situation
                  particulière.
                </span>
              </li>
            </ul>

            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs leading-relaxed text-slate-600">
                <strong>Note :</strong> En continuant, vous reconnaissez avoir lu et compris cet
                avertissement et acceptez que les informations fournies sont à des fins de
                consultation uniquement et ne remplacent pas un avis professionnel en matière
                d&apos;évaluation d&apos;entreprise.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Retour
            </Button>
            <Button
              onClick={capitalisation.acceptDisclaimer}
              className="bg-[#E0742D] px-8 text-white hover:bg-[#c96526]"
            >
              J&apos;ai compris, continuer
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <DashboardHeader title="Modelisys" />

      <div className="relative w-full overflow-hidden bg-[#2A2F3A] pb-32">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-24 -left-28 h-[320px] w-[320px] rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1920px] px-6 py-6 sm:py-8">
          <ValuationPlanBackButton />
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#E6D6C3]">
            Capitalisation
          </h1>
          <p className="mt-2 max-w-4xl text-base text-[#C9B8A5]/90">
            Appliquez le multiple au BAIIA représentatif pour estimer la fourchette de valeur
            d&apos;entreprise.
          </p>
          <div
            className="mt-5 h-px w-full bg-gradient-to-r from-[#E0742D]/80 via-white/15 to-transparent"
            aria-hidden
          />
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/70">
            <div className="whitespace-nowrap">
              <span className="text-white/50">Entité</span>{" "}
              <span className="font-medium text-slate-100">{companyName}</span>
            </div>
            <div className="hidden h-4 w-px bg-white/10 md:block" />
            <div
              className="whitespace-nowrap"
              data-testid="capitalisation-reference-date"
            >
              <span className="text-white/50">Date de référence</span>{" "}
              <span className="font-medium text-slate-100">{referenceLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative -mt-32 mb-12 min-w-0">
        <div className="mx-auto max-w-[1920px] px-6">
          <CapitalisationReport
            companyName={companyName}
            referenceLabel={referenceLabel}
            capitalisation={capitalisation}
          />
        </div>
      </div>
    </div>
  )
}
