import type { CompanyDiagnostic } from "@/lib/api"
import {
  formatReferenceDateEndOfMonth,
  formatReferencePeriod,
  formatReportSectionMeta,
} from "@/components/diagnostic/diagnostic-format"
import { ModelisysWordmark } from "@/components/diagnostic/modelisys-wordmark"

export const DIAGNOSTIC_REPORT_MANDATE_SCOPE_ID = "diagnostic-report-mandate-scope"

interface MandateSection {
  title: string
  body: string
}

interface DiagnosticReportMandateScopePageProps {
  diagnostic: CompanyDiagnostic
}

export function DiagnosticReportMandateScopePage({ diagnostic }: DiagnosticReportMandateScopePageProps) {
  const referencePeriodLabel = formatReferencePeriod(
    diagnostic.reference_period.calendar_year,
    diagnostic.reference_period.calendar_month,
  )
  const referenceDateLabel = formatReferenceDateEndOfMonth(
    diagnostic.reference_period.calendar_year,
    diagnostic.reference_period.calendar_month,
  )
  const sectionMeta = formatReportSectionMeta(
    diagnostic.company_name,
    diagnostic.reference_period.calendar_year,
    diagnostic.reference_period.calendar_month,
    diagnostic.currency,
  )

  const sections: MandateSection[] = [
    {
      title: "Objet du rapport",
      body: `Présenter un diagnostic stratégique de la situation financière de ${diagnostic.company_name}, en synthétisant la performance, la rentabilité, la structure financière, la capacité de création de liquidités, les investissements et une lecture indicative de la valeur de l'entreprise, à partir des données comptables disponibles à la date de référence.`,
    },
    {
      title: "Destinataires visés",
      body: `Document destiné à la direction, aux actionnaires et aux conseillers professionnels de ${diagnostic.company_name} (CPA, CBV, avocats, banquiers) pour éclairer la prise de décision interne. Sa diffusion demeure strictement confidentielle et limitée aux personnes autorisées par le mandant.`,
    },
    {
      title: "Période couverte",
      body: `Analyse ancrée à la date de référence du ${referenceDateLabel} (${referencePeriodLabel}). Les tendances historiques et les comparaisons s'appuient sur les exercices et périodes disponibles dans les données sources, avec une fenêtre d'analyse alignée sur le mois de référence lorsque applicable.`,
    },
    {
      title: "Sources utilisées",
      body: `Balances de vérification, mappings comptables, plan de codes de liaison, structures d'états financiers et paramètres de la société (exercice, devise, divisions) tels qu'enregistrés dans Modelisys. Les états financiers et indicateurs sont calculés à partir de ces sources ; aucune vérification indépendante des pièces justificatives sous-jacentes n'est effectuée.`,
    },
    {
      title: "Limites du travail",
      body: `Ce rapport ne constitue pas un examen, un audit, une mission d'acquisition ni une diligence raisonnable. Il repose sur l'exhaustivité et l'exactitude des données fournies par le client. Sont exclus les éléments non reflétés dans les balances ou le mapping, ainsi que toute information extra-comptable non communiquée au moment de la préparation.`,
    },
    {
      title: "Hypothèses clés",
      body: `Les données sources sont considérées complètes et correctement mappées ; la continuité d'exploitation est présumée ; les tendances passées ne garantissent pas les résultats futurs. Les benchmarks sectoriels ou paramètres de valorisation par défaut, lorsqu'utilisés, sont indicatifs et peuvent différer des réalités du marché ou des transactions comparables.`,
    },
    {
      title: "Absence d'opinion d'audit ou d'évaluation formelle",
      body: `Aucune opinion d'audit, de certification comptable, d'attestation d'audit externe ni évaluation formelle au sens des normes CBV ou d'une expertise en valeurs mobilières n'est exprimée. Ce document ne saurait être invoqué comme substitut à une mission d'audit, de revue ou d'évaluation réalisée selon les normes professionnelles applicables.`,
    },
    {
      title: "Caractère indicatif des résultats",
      body: `Chiffres, ratios, graphiques, lectures narratives et fourchettes de valeur sont fournis à titre strictement indicatif pour faciliter la discussion et la planification. Ils ne constituent pas une recommandation d'investissement, de financement ou de transaction et doivent être interprétés avec le jugement professionnel des destinataires.`,
    },
  ]

  return (
    <section
      id={DIAGNOSTIC_REPORT_MANDATE_SCOPE_ID}
      data-testid="diagnostic-report-mandate-scope"
      className="print-sheet print-sheet-mandate bg-white text-[#2A2F3A]"
      aria-label="Mandat et portée"
    >
      <div className="print-page-inner flex flex-col">
        <header className="border-b border-slate-200 pb-5">
          <ModelisysWordmark variant="dark" size="md" />
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Mandat et portée
          </p>
          <p className="mt-2 text-sm text-slate-500">{sectionMeta}</p>
        </header>

        <p className="report-mandate-lead mt-5 max-w-4xl text-[13px] leading-relaxed text-slate-600">
          Le présent document encadre la portée, les sources et les limites du diagnostic financier
          préparé pour {diagnostic.company_name}. Sa lecture doit précéder toute interprétation des
          analyses et tableaux qui suivent.
        </p>

        <div className="report-mandate-grid mt-5 flex-1">
          {sections.map((section) => (
            <article key={section.title} className="report-mandate-section report-avoid-break">
              <h2 className="report-mandate-section-title">{section.title}</h2>
              <p className="report-mandate-section-body">{section.body}</p>
            </article>
          ))}
        </div>

        <footer className="report-mandate-footer mt-auto border-t border-slate-200 pt-3">
          <p className="text-[9px] leading-relaxed text-slate-400">
            Document préparé dans le cadre du système d&apos;exploitation financier Modelisys — usage
            confidentiel du mandant.
          </p>
        </footer>
      </div>
    </section>
  )
}
