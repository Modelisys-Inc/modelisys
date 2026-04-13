"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Loader2, Link2 } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { getCompany, getStatementStructure, type Company as ApiCompany } from "@/lib/api"
import { buildLinkCodeTableRows } from "@/lib/link-code-reference"
import { cn } from "@/lib/utils"
import {
  dashboardCardFrameStaticClass,
  dashboardCardRingClass,
  dashboardCardHeaderBarClass,
  dashboardCardHeaderIconBoxClass,
  dashboardCardTitleClass,
  dashboardCardBodyMutedClass,
} from "@/lib/dashboard-card-style"

function mapApiCompany(c: ApiCompany) {
  return {
    id: c.id,
    name: c.name,
  }
}

export default function CompanyLinkCodesPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [incomeStructure, setIncomeStructure] = useState<Record<string, unknown>[] | null>(null)
  const [balanceSheetStructure, setBalanceSheetStructure] = useState<Record<string, unknown>[] | null>(null)

  useEffect(() => {
    if (!companyId) return
    setLoading(true)
    Promise.all([
      getCompany(companyId)
        .then((c) => mapApiCompany(c))
        .catch(() => null),
      getStatementStructure(companyId, "income-statement")
        .then((d) => d.structure)
        .catch(() => [] as Record<string, unknown>[]),
      getStatementStructure(companyId, "balance-sheet")
        .then((d) => d.structure)
        .catch(() => [] as Record<string, unknown>[]),
    ])
      .then(([co, structIs, structBs]) => {
        if (!co) {
          router.push("/")
          return
        }
        setCompanyName(co.name)
        setIncomeStructure(structIs)
        setBalanceSheetStructure(structBs)
      })
      .finally(() => setLoading(false))
  }, [companyId, router])

  const rows = useMemo(
    () => buildLinkCodeTableRows(incomeStructure, balanceSheetStructure),
    [incomeStructure, balanceSheetStructure]
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DashboardHeader title="Modelisys" />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    )
  }

  if (!companyName) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />

      <div className="relative w-full overflow-hidden pt-15 pb-40">
        <div className="absolute inset-0">
          <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
            <div className="bg-[#2A2F3A]" />
            <div className="bg-[#1F2430]" />
          </div>
          <div className="absolute inset-y-0 left-1/2 hidden w-px bg-white/5 lg:block" />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-28 -top-24 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-24 -right-28 h-[480px] w-[480px] rounded-full bg-black/20 blur-3xl" />
          </div>
        </div>
        <div className="relative z-10 mx-auto max-w-[1920px] px-6">
          <div className="mb-8 flex items-start gap-3">
            <div className="w-2" />
            <div className="flex-1">
              <div className="mb-4 flex items-center gap-3">
                <h2 className="mb-2 text-4xl font-semibold tracking-tight text-[#E6D6C3]">Code de liaison</h2>
              </div>
              <p className="mb-6 text-base text-[#C9B8A5]/90">Configuration et paramètres de la société</p>
              <p className="mb-6 max-w-4xl text-base leading-relaxed text-[#C9B8A5]/90">
                Consultez les codes de liaison définis dans les structures du compte de résultat et du bilan (vues
                Sommaire et Détail) pour cette société. La colonne Provenance indique l’état financier concerné.
              </p>
              <div className="mb-2 flex flex-wrap items-end gap-6 sm:gap-8">
                <Link
                  href={`/settings/companies/${companyId}`}
                  className="relative border-b border-slate-600/30 pb-4"
                >
                  <span className="text-sm font-normal text-slate-200 transition-colors hover:text-[#E6D6C3]">
                    Information de base
                  </span>
                </Link>
                <Link
                  href={`/settings/companies/${companyId}/mapping`}
                  className="relative border-b border-slate-600/30 pb-4"
                >
                  <span className="text-sm font-normal text-slate-200 transition-colors hover:text-[#E6D6C3]">
                    Mapping comptable
                  </span>
                </Link>
                <div className="relative border-b border-slate-600/30 pb-4">
                  <span className="text-sm font-normal text-slate-200 hover:text-[#E6D6C3]">Code de liaison</span>
                  <div className="absolute bottom-0 left-0 right-0 z-10 h-0.5 bg-[#E0742D]" />
                </div>
                <Link
                  href={`/settings/companies/${companyId}/financial-statements-mapping`}
                  className="relative border-b border-slate-600/30 pb-4"
                >
                  <span className="text-sm font-normal text-slate-200 transition-colors hover:text-[#E6D6C3]">
                    Mapping états financiers
                  </span>
                </Link>
                <Link
                  href={`/settings/companies/${companyId}/trial-balance`}
                  className="relative border-b border-slate-600/30 pb-4"
                >
                  <span className="text-sm font-normal text-slate-200 transition-colors hover:text-[#E6D6C3]">
                    Balance de vérification
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative -mt-32 mb-12">
        <div className="mx-auto max-w-[1920px] px-6">
          <div className={cn("w-full overflow-hidden", dashboardCardFrameStaticClass)}>
            <div className={dashboardCardRingClass} aria-hidden />
            <div className="relative w-full min-w-0">
              <div className={cn("px-6 py-5 sm:px-7", dashboardCardHeaderBarClass)}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className={dashboardCardHeaderIconBoxClass}>
                      <Link2 className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className={cn("text-xl leading-tight mb-1", dashboardCardTitleClass)}>
                        Codes du compte de résultat
                      </h2>
                      <p className={cn("text-sm leading-relaxed", dashboardCardBodyMutedClass)}>
                        Ces codes proviennent de la structure « Compte de résultat » (Income statement — liaisons
                        simples, additions et différences). La colonne Provenance indique l’état concerné (ici
                        Résultats). Colonne Sommaire : titre du bloc d’annexe (ex. A → Revenus). Colonne Détail : libellé
                        du poste (sans préfixe « Annexe »). Pour modifier la structure, utilisez Mapping états financiers.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto bg-white/80">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Code de liaison</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Provenance</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                        Libellé (vue Sommaire)
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                        Libellé (vue Détail)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-8 py-12 text-center text-sm text-slate-500">
                          Aucun code de liaison trouvé dans les structures du compte de résultat ou du bilan. Définissez
                          ou importez une structure depuis Mapping états financiers.
                        </td>
                      </tr>
                    ) : (
                      rows.map((r) => (
                        <tr
                          key={`${r.code}-${r.provenance}`}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="px-6 py-4 font-mono text-sm text-slate-800">{r.code}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">{r.provenance}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">{r.labelSummary}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">{r.labelDetail}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
