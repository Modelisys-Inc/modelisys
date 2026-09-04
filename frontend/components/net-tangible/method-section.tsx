"use client"

import { NetTangibleReportSection } from "./report-section"

export function MethodSection() {
  return (
    <NetTangibleReportSection id="methode" number="1." title="Méthode et périmètre">
      <p className="text-pretty text-sm leading-relaxed text-slate-500">
        La valeur comptable ajustée (VCA) vise à déterminer la valeur économique nette de
        l&apos;entreprise à la date de référence en partant de son bilan comptable et en
        apportant les ajustements nécessaires pour refléter la valeur des actifs et passifs
        plutôt que leur seule valeur comptable.
      </p>
      <p className="mt-4 text-pretty text-sm leading-relaxed text-slate-500">
        Chaque poste du bilan peut être analysé selon trois éléments&nbsp;: sa valeur économique,
        les dettes qui lui sont associées et son caractère requis ou excédentaire par rapport aux
        activités de l&apos;entreprise.
      </p>
      <p className="mt-4 text-pretty text-sm leading-relaxed text-slate-500">
        La démarche consiste à&nbsp;:
      </p>
      <ul className="mt-3 space-y-2 text-sm text-slate-500">
        <li className="flex gap-2">
          <span className="font-mono text-[#E0742D]">01</span>
          <span>
            Partir de la valeur comptable des actifs et passifs à la date de référence.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-mono text-[#E0742D]">02</span>
          <span>
            Ajuster les postes à leur valeur économique, lorsque leur valeur comptable ne reflète
            pas leur valeur retenue aux fins de l&apos;évaluation.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-mono text-[#E0742D]">03</span>
          <span>
            Identifier les actifs et passifs excédentaires, c&apos;est-à-dire ceux qui ne sont pas
            nécessaires à l&apos;exploitation normale de l&apos;entreprise.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-mono text-[#E0742D]">04</span>
          <span>
            Déterminer les actifs requis pour les activités, incluant le niveau de fonds de
            roulement nécessaire à l&apos;exploitation.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-mono text-[#E0742D]">05</span>
          <span>
            Déduire les dettes pertinentes afin d&apos;obtenir la valeur nette attribuable aux
            actionnaires.
          </span>
        </li>
      </ul>
      <p className="mt-5 text-pretty text-sm leading-relaxed text-slate-500">
        La relation fondamentale est&nbsp;:
      </p>
      <p className="mt-3 rounded-md bg-slate-100/80 px-4 py-3 text-center font-mono text-sm text-[#2A2F3A]">
        VCA = Valeur comptable + Ajustements de valeur
      </p>
      <p className="mt-4 text-pretty text-sm leading-relaxed text-slate-500">
        Puis, selon la présentation retenue&nbsp;:
      </p>
      <p className="mt-3 rounded-md bg-slate-100/80 px-4 py-3 text-center font-mono text-sm text-[#2A2F3A]">
        ACN = VCA − Dettes − Actifs (passifs) excédentaires ± ajustements de FDR
      </p>

      <p className="mt-8 text-sm font-semibold text-[#2A2F3A]">
        Fonds de roulement représentatif
      </p>
      <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-500">
        Le fonds de roulement ne doit pas simplement refléter le niveau observé à la date
        d&apos;évaluation. Il doit représenter le niveau de fonds de roulement nécessaire au
        fonctionnement normal de l&apos;entreprise.
      </p>
      <p className="mt-4 text-pretty text-sm leading-relaxed text-slate-500">
        Le FDR représentatif est donc déterminé à partir des actifs et passifs courants requis pour
        les activités, puis peut être ajusté lorsque le niveau retenu diffère du FDR déterminé à
        partir des données historiques ou opérationnelles.
      </p>
      <p className="mt-4 text-pretty text-sm leading-relaxed text-slate-500">
        L&apos;écart entre le FDR détenu et le FDR représentatif influence la valeur des actifs nets
        requis et, par conséquent, la portion d&apos;actifs (passifs) considérée comme
        excédentaire.
      </p>
    </NetTangibleReportSection>
  )
}


export function DisclaimerSection() {
  const items = [
    "Les montants reposent sur le bilan de référence, les ajustements saisis et le jugement professionnel à la date d'estimation ; ils n'ont pas valeur de garantie.",
    "Les JVM, actifs excédentaires et dettes à soustraire devraient être appuyés par une analyse documentée (évaluations, inventaires, contrats, etc.).",
    "Le fonds de roulement représentatif est une hypothèse d'évaluation ; un écart par rapport au FDR déterminé modifie l'ACN et les actifs excédentaires du sommaire.",
    "Le présent document ne constitue pas un rapport d'évaluation officiel au sens des normes de l'Institut canadien des experts en évaluation d'entreprises (ICEEC / CICBV).",
    "Toute variation postérieure à la date de référence (marché, structure, qualité des actifs) peut modifier de façon importante les conclusions.",
  ]

  return (
    <NetTangibleReportSection id="restrictions" number="5." title="Restrictions et mise en garde">
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 text-pretty text-xs leading-relaxed text-slate-500">
            <span className="mt-0.5 font-mono text-[#E0742D]" aria-hidden="true">
              {(i + 1).toString().padStart(2, "0")}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </NetTangibleReportSection>
  )
}
