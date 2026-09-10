import { ReportSection } from "./report-section"

export function Disclaimer() {
  const items = [
    "Le taux établi constitue une estimation fondée sur des hypothèses et sur le jugement professionnel à la date de l'estimation ; il n'a pas valeur de garantie et est sensible aux paramètres retenus.",
    "Les primes de taille et de risque spécifique reposent en partie sur le jugement de l'évaluateur et devraient être appuyées par une analyse documentée de l'entreprise et de son secteur.",
    "Le bêta et les comparables doivent être validés à partir de sociétés ouvertes présentant un profil de risque et d'activité semblable à celui de la société visée.",
    "Le présent document ne constitue pas un rapport d'évaluation officiel au sens des normes de l'Institut canadien des experts en évaluation d'entreprises (ICEEC / CICBV) et ne devrait pas être utilisé de façon isolée pour une transaction, un litige ou une fin fiscale.",
    "Toute variation des conditions de marché, de la structure de capital ou du profil de risque postérieure à la date de l'estimation peut modifier de façon importante le taux obtenu.",
  ]

  return (
    <ReportSection number="6." title="Restrictions et mise en garde">
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
    </ReportSection>
  )
}
