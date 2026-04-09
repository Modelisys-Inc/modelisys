import type { Metadata } from "next"
import Link from "next/link"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Budget, suivi & valorisation | Blog Modelisys",
  description:
    "Pourquoi structurer un mapping comptable (codes de liaison) pour fiabiliser budget & suivi, comparabilité des états et valorisation dans Modelisys.",
}

function H2({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="scroll-mt-28 text-xl sm:text-2xl font-semibold text-[#2A2F3A] tracking-tight">
      {children}
    </h2>
  )
}

function BulletList({ items }: { items: Array<string | JSX.Element> }) {
  return (
    <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-[#5C5F66]">
      {items.map((it, idx) => (
        <li key={idx} className="flex gap-3">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E0742D]" aria-hidden />
          <div className="min-w-0">{it}</div>
        </li>
      ))}
    </ul>
  )
}

export default function ArticleMappingCodes() {
  const cardShell =
    "rounded-[28px] border border-slate-200 bg-white/80 shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-200/70"

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100/50">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-slate-50/95 to-slate-100/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_45%_at_50%_-15%,rgba(224,116,45,0.055),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_100%_50%,rgba(148,163,184,0.12),transparent_65%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/30 via-transparent to-slate-100/35" />
      </div>

      <GlassmorphismNav />

      <main className="relative z-10 pt-24 pb-16 sm:pb-24">
        <div className="max-w-[900px] mx-auto px-8 sm:px-12 lg:px-16">
          <section className="relative py-10 lg:py-14">
            <Link href="/blog" className="text-sm font-semibold text-[#E0742D] hover:underline">
              ← Retour au Blog
            </Link>
            <p className="mt-4 text-sm font-semibold tracking-wide text-slate-500">États financiers · Mapping</p>
            <h1 className="mt-3 text-3xl sm:text-4xl md:text-[42px] font-semibold leading-tight tracking-tight text-[#2A2F3A]">
              Budget & suivi, puis valorisation: pourquoi le mapping (codes de liaison) est votre point d’ancrage
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold">29 janv. 2026</span>
              <span aria-hidden className="text-slate-300">
                •
              </span>
              <span>8 min</span>
            </div>
            <p className="mt-6 text-lg text-[#5C5F66] leading-relaxed">
              Un budget n’est utile que si les écarts sont lisibles (réel vs budget, période vs période). Et une
              valorisation n’est crédible que si les postes (revenus, marges, dépenses, éléments non récurrents) sont
              cohérents d’une période à l’autre. Le problème est souvent le même: votre plan comptable ne “parle” pas
              la langue des états financiers et des KPI. Un mapping comptable bien pensé, via des codes de liaison,
              transforme la comptabilité en structure stable pour le suivi budgétaire, le reporting et l’évaluation.
            </p>
            <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-slate-300/50 to-transparent" />
          </section>

          <article className={cardShell}>
            <div className="p-7 sm:p-9 space-y-10">
              <div>
                <H2 id="pourquoi">1) Pourquoi le mapping est la clé de la comparabilité</H2>
                <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                  Les états financiers “de gestion” ont besoin de cohérence: mêmes définitions de postes, mêmes règles
                  de classement, même logique multi-périodes. Sinon, les ratios (marge, EBITDA, BFR, levier) deviennent
                  des artefacts de classification plutôt que des signaux économiques.
                </p>
              </div>

              <div>
                <H2 id="codes">2) Les codes de liaison: une convention simple, un impact massif</H2>
                <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                  Dans Modelisys, les codes de liaison servent de pont entre les comptes (TB) et la structure d’états
                  financiers. L’objectif est de:
                </p>
                <BulletList
                  items={[
                    "réduire la variance de classement d’un dossier à l’autre;",
                    "accélérer l’actualisation mensuelle (moins de recodage);",
                    "maintenir une traçabilité: on sait “pourquoi” un compte se retrouve dans un poste.",
                  ]}
                />
              </div>

              <div>
                <H2 id="workflow">3) Workflow recommandé dans Modelisys</H2>
                <BulletList
                  items={[
                    "Importer la balance de vérification de la société.",
                    "Compléter le mapping comptable (compte → code de liaison → poste d’état).",
                    "Valider les postes agrégés et les ratios de base sur quelques périodes.",
                    "Stabiliser les exceptions (comptes ambigus, reclassements récurrents) et documenter la logique.",
                  ]}
                />
              </div>

              <div>
                <H2 id="anti-patterns">4) Les erreurs classiques (et comment les éviter)</H2>
                <BulletList
                  items={[
                    "Mapper “trop vite”: un poste mal défini se réplique partout.",
                    "Mélanger des natures économiques différentes (ex. charges récurrentes vs non récurrentes) sans règle explicite.",
                    "Changer les définitions en cours de route sans rétrospective: on casse les comparatifs.",
                    "Ne pas traiter les comptes “fourre-tout”: ils masquent l’histoire réelle des marges.",
                  ]}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/70 p-5">
                <p className="text-sm font-semibold text-[#2A2F3A]">En bref</p>
                <p className="mt-2 text-[15px] leading-relaxed text-[#5C5F66]">
                  Le mapping n’est pas un “détail technique”: c’est le dictionnaire qui rend vos états lisibles. Dans
                  Modelisys, le couple mapping + codes de liaison transforme une TB hétérogène en structure stable
                  pour l’analyse, la projection et la discussion avec des tiers.
                </p>
              </div>
            </div>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  )
}

