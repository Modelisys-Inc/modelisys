"use client"

import type { CmpcReportMeta } from "@/lib/cmpc-wacc"
import { InlineText } from "./editable"

type ReportHeaderProps = {
  meta: CmpcReportMeta
  update: (key: keyof CmpcReportMeta) => (value: string) => void
}

function MetaRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="grid grid-cols-[130px_1fr] items-center gap-3 py-1.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-sm text-[#2A2F3A]">
        <InlineText value={value} onChange={onChange} ariaLabel={label} />
      </dd>
    </div>
  )
}

export function ReportHeader({ meta, update }: ReportHeaderProps) {
  return (
    <header>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E0742D]">
        Détermination du taux d&apos;actualisation
      </p>
      <h1 className="mt-2 text-balance text-2xl font-semibold leading-tight tracking-tight text-[#2A2F3A] sm:text-3xl">
        Coût moyen pondéré du capital d&apos;une société privée
      </h1>
      <p className="mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-slate-500">
        Le présent rapport établit le coût moyen pondéré du capital (CMPC) applicable à
        l&apos;actualisation des flux de trésorerie nets d&apos;impôt de la société visée. La
        démarche suit les conventions généralement reconnues en évaluation d&apos;entreprises :
        estimation du coût des capitaux propres selon le modèle d&apos;équilibre des actifs
        financiers (MÉDAF / CAPM) majoré des primes propres aux sociétés fermées, estimation du
        coût de la dette, puis pondération selon la structure de capital.
      </p>

      <dl className="mt-6 grid grid-cols-1 gap-x-10 rounded-lg border border-slate-200 bg-slate-100/80 px-5 py-4 sm:grid-cols-2">
        <MetaRow label="Société" value={meta.subject} onChange={update("subject")} />
        <MetaRow label="Objet" value={meta.mandate} onChange={update("mandate")} />
        <MetaRow
          label="Date de l'estimation"
          value={meta.valuationDate}
          onChange={update("valuationDate")}
        />
        <MetaRow label="Devise" value={meta.currency} onChange={update("currency")} />
        <MetaRow label="Préparé par" value={meta.preparedBy} onChange={update("preparedBy")} />
        <MetaRow
          label="À l'intention de"
          value={meta.preparedFor}
          onChange={update("preparedFor")}
        />
      </dl>
    </header>
  )
}
