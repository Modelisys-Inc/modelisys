"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Loader2, Link2, ChevronDown, ChevronRight } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { CompanyCustomLinkCodes } from "@/components/company-custom-link-codes"
import { useStandardLinkCodes } from "@/hooks/use-standard-link-codes"
import { cn } from "@/lib/utils"
import {
  dashboardCardFrameStaticClass,
  dashboardCardRingClass,
  dashboardCardHeaderBarClass,
  dashboardCardHeaderIconBoxClass,
  dashboardCardTitleClass,
  dashboardCardBodyMutedClass,
} from "@/lib/dashboard-card-style"
import type { StandardLinkCode } from "@/lib/api"

const FAMILY_LABELS: Record<string, string> = {
  ACT: "Actif à court terme",
  ALT: "Actif à long terme",
  PCT: "Passif à court terme",
  PLT: "Passif à long terme",
  CAP: "Capitaux propres",
  REV: "Revenus",
  CMV: "Coûts des produits vendus",
  EXP: "Frais d'exploitation",
  ADM: "Frais d'administration",
  VNT: "Frais de vente",
  FIN: "Frais financiers",
  AUT: "Autres dépenses (produits)",
  IMP: "Impôts",
}

const SECTION_TYPE_LABELS: Record<string, string> = {
  ACT: "Bilan",
  ALT: "Bilan",
  PCT: "Bilan",
  PLT: "Bilan",
  CAP: "Bilan",
  REV: "Compte de résultat",
  CMV: "Compte de résultat",
  EXP: "Compte de résultat",
  ADM: "Compte de résultat",
  VNT: "Compte de résultat",
  FIN: "Compte de résultat",
  AUT: "Compte de résultat",
  IMP: "Compte de résultat",
}

function CodeRow({ code }: { code: StandardLinkCode }) {
  const hasParent = code.parent_code !== null
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className={cn("px-6 py-3 font-mono text-sm text-slate-800", hasParent && "pl-10")}>
        {code.code}
      </td>
      <td className="px-6 py-3 text-sm text-slate-700">
        {code.label_sub_account || code.label_account || "—"}
      </td>
      <td className="px-6 py-3 text-sm text-slate-500">
        {code.variable_or_fixed || "—"}
      </td>
      <td className="px-6 py-3 text-sm text-slate-500">
        {code.ft_category ? (
          <span>
            {code.ft_category}
            {code.ft_line_item ? <span className="text-slate-400"> · {code.ft_line_item}</span> : null}
          </span>
        ) : "—"}
      </td>
      <td className="px-6 py-3 text-center">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            code.is_leaf
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500",
          )}
        >
          {code.is_leaf ? "Feuille" : "Parent"}
        </span>
      </td>
    </tr>
  )
}

function FamilySection({
  family,
  accountType,
  codes,
}: {
  family: string
  accountType: string | null
  codes: StandardLinkCode[]
}) {
  const [expanded, setExpanded] = useState(true)
  const leafCount = codes.filter((c) => c.is_leaf).length

  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
          )}
          <div>
            <span className="font-mono text-sm font-semibold text-slate-800">{family}</span>
            <span className="ml-3 text-sm text-slate-600">
              {FAMILY_LABELS[family] || accountType || family}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>{codes.length} codes</span>
          <span>{leafCount} assignables</span>
          <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
            {SECTION_TYPE_LABELS[family] || "—"}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-t border-slate-100 bg-slate-50/60">
                <th className="px-6 py-2 text-left text-xs font-semibold text-slate-500">Code</th>
                <th className="px-6 py-2 text-left text-xs font-semibold text-slate-500">Libellé</th>
                <th className="px-6 py-2 text-left text-xs font-semibold text-slate-500">Variables/Fixes</th>
                <th className="px-6 py-2 text-left text-xs font-semibold text-slate-500">Flux de trésorerie</th>
                <th className="px-6 py-2 text-center text-xs font-semibold text-slate-500">Type</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <CodeRow key={c.id} code={c} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function CompanyLinkCodesPage() {
  const params = useParams()
  const companyId = params.id as string
  const { groups, loading, error } = useStandardLinkCodes(false)
  const [search, setSearch] = useState("")

  const filteredGroups = search.trim()
    ? groups.map((g) => ({
        ...g,
        codes: g.codes.filter(
          (c) =>
            c.code.toLowerCase().includes(search.toLowerCase()) ||
            (c.label_account || "").toLowerCase().includes(search.toLowerCase()) ||
            (c.label_sub_account || "").toLowerCase().includes(search.toLowerCase()),
        ),
      })).filter((g) => g.codes.length > 0)
    : groups

  const totalCodes = groups.reduce((sum, g) => sum + g.codes.length, 0)
  const totalLeaf = groups.reduce((sum, g) => sum + g.codes.filter((c) => c.is_leaf).length, 0)

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
                <h2 className="mb-2 text-4xl font-semibold tracking-tight text-[#E6D6C3]">
                  Codes de liaison
                </h2>
              </div>
              <p className="mb-4 text-base text-[#C9B8A5]/90">
                Charte de comptes standardisée — {totalCodes} codes au total, {totalLeaf} assignables (feuilles)
              </p>
              <p className="mb-6 max-w-4xl text-base leading-relaxed text-[#C9B8A5]/90">
                Ces codes sont communs à toutes les sociétés. Lors du mapping comptable, seuls les codes
                de type <strong className="text-[#E6D6C3]">Feuille</strong> peuvent être assignés aux comptes du grand livre.
                Les codes Parents servent uniquement à l'organisation visuelle des états financiers.
              </p>
              <div className="mb-2 flex flex-wrap items-end gap-6 sm:gap-8">
                <Link href={`/settings/companies/${companyId}`} className="relative border-b border-slate-600/30 pb-4">
                  <span className="text-sm font-normal text-slate-200 transition-colors hover:text-[#E6D6C3]">
                    Information de base
                  </span>
                </Link>
                <Link href={`/settings/companies/${companyId}/mapping`} className="relative border-b border-slate-600/30 pb-4">
                  <span className="text-sm font-normal text-slate-200 transition-colors hover:text-[#E6D6C3]">
                    Mapping comptable
                  </span>
                </Link>
                <div className="relative border-b border-slate-600/30 pb-4">
                  <span className="text-sm font-normal text-slate-200 hover:text-[#E6D6C3]">Code de liaison</span>
                  <div className="absolute bottom-0 left-0 right-0 z-10 h-0.5 bg-[#E0742D]" />
                </div>
                <Link href={`/settings/companies/${companyId}/trial-balance`} className="relative border-b border-slate-600/30 pb-4">
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
        <div className="mx-auto max-w-[1920px] space-y-6 px-6">
          <CompanyCustomLinkCodes companyId={companyId} />
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
                        Charte de comptes standardisée
                      </h2>
                      <p className={cn("text-sm leading-relaxed", dashboardCardBodyMutedClass)}>
                        Codes partagés par toutes les sociétés · seuls les codes Feuilles peuvent être mappés à des comptes GL
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <input
                      type="search"
                      placeholder="Rechercher un code ou libellé…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-64 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E0742D]/40"
                    />
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex min-h-[200px] items-center justify-center bg-white/80">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : error ? (
                <div className="flex min-h-[200px] items-center justify-center bg-white/80">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="flex min-h-[200px] items-center justify-center bg-white/80">
                  <p className="text-sm text-slate-500">
                    {search ? "Aucun code ne correspond à votre recherche." : "Aucun code de liaison trouvé."}
                  </p>
                </div>
              ) : (
                <div className="bg-white/80">
                  {filteredGroups.map((g) => (
                    <FamilySection
                      key={g.family}
                      family={g.family}
                      accountType={g.account_type}
                      codes={g.codes}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
