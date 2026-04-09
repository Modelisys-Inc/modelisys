import type { Metadata } from "next"
import Link from "next/link"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Reporting financier depuis la balance | Blog Modelisys",
  description:
    "Bonnes pratiques pour partir d’une balance de vérification et fiabiliser le reporting dans Modelisys (import, contrôles, cohérence et traçabilité).",
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

export default function ArticleImportBalance() {
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
            <p className="mt-4 text-sm font-semibold tracking-wide text-slate-500">Comptabilité · Qualité des données</p>
            <h1 className="mt-3 text-3xl sm:text-4xl md:text-[42px] font-semibold leading-tight tracking-tight text-[#2A2F3A]">
              Reporting financier: partir de la balance de vérification pour produire des états fiables (et actionnables)
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold">29 janv. 2026</span>
              <span aria-hidden className="text-slate-300">
                •
              </span>
              <span>7 min</span>
            </div>
            <p className="mt-6 text-lg text-[#5C5F66] leading-relaxed">
              Un reporting financier utile commence avant les graphiques: il commence à la source. Une balance de
              vérification (TB) “à peu près correcte” entraîne vite des états non comparables, des écarts mal expliqués
              et des cycles de clôture plus lents. L’objectif n’est pas d’avoir un fichier parfait; c’est d’avoir un
              flux d’import qui rend les anomalies visibles, maintient une traçabilité, et vous permet de produire des
              états fiables pour piloter (et communiquer) plus rapidement.
            </p>
            <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-slate-300/50 to-transparent" />
          </section>

          <article className={cardShell}>
            <div className="p-7 sm:p-9 space-y-10">
              <div>
                <H2 id="ce-que-modelisys-fait">Ce que Modelisys fait (et ne fait pas)</H2>
                <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                  Modelisys est une plateforme d’analyse et de modélisation. Elle vous aide à structurer et exploiter
                  des données importées (ex. fichiers Excel) pour alimenter des états, des analyses, des ratios et des
                  projections. Elle ne remplace pas un audit, une mission d’examen ou une validation indépendante.
                </p>
              </div>

              <div>
                <H2 id="preparer">1) Préparer l’import: standardiser le minimum utile</H2>
                <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                  Avant même de parler d’outil, une TB exploitable respecte quelques invariants. Dans Modelisys, tu
                  gagnes du temps si tu standardises:
                </p>
                <BulletList
                  items={[
                    "Un identifiant de compte stable (numéro de compte) et une description lisible.",
                    "Des conventions de signe (débit/crédit) cohérentes selon le format utilisé.",
                    "Une granularité claire (mensuelle vs annuelle) et une période de référence explicite.",
                    "L’unicité des comptes: éviter les doublons “même compte / libellés différents”.",
                  ]}
                />
              </div>

              <div>
                <H2 id="charger">2) Charger la TB et détecter les anomalies tôt</H2>
                <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                  Le bon workflow consiste à importer, puis valider les points qui font dérailler l’analyse:
                  comptes manquants, descriptions vides, incohérences de classification, variations extrêmes ou postes
                  non mappés.
                </p>
                <BulletList
                  items={[
                    "Importer la TB (Excel) dans la société concernée.",
                    "Comparer rapidement “nombre de comptes”, “comptes nouveaux” et “comptes non classés”.",
                    "Identifier les postes atypiques: mouvements importants, comptes inhabituels, libellés ambigus.",
                  ]}
                />
              </div>

              <div>
                <H2 id="mapping">3) Relier la TB aux analyses: mapping comptable et codes de liaison</H2>
                <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                  Une TB brute est rarement comparable d’une période à l’autre (ou d’une société à l’autre). Dans
                  Modelisys, l’étape clé est de relier tes comptes à une structure d’états financiers via le mapping
                  comptable et les codes de liaison. C’est ce qui rend les ratios, les graphiques et les analyses
                  fiables.
                </p>
              </div>

              <div>
                <H2 id="bonnes-pratiques">4) Bonnes pratiques de contrôle pour rester “audit-ready”</H2>
                <BulletList
                  items={[
                    "Réconcilier les totaux (si applicable) et documenter les écarts dès qu’ils apparaissent.",
                    "Conserver une trace de la source et de la date d’import (version du fichier, période).",
                    "Éviter les corrections silencieuses: corriger à la source ou documenter l’ajustement.",
                    "Valider la cohérence multi-périodes avant de tirer des conclusions (effets saisonniers, reclassements).",
                  ]}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/70 p-5">
                <p className="text-sm font-semibold text-[#2A2F3A]">En bref</p>
                <p className="mt-2 text-[15px] leading-relaxed text-[#5C5F66]">
                  Le meilleur import n’est pas celui qui “passe”, c’est celui qui rend visibles les zones à risque.
                  Modelisys vous aide à passer rapidement de l’Excel à une base structurée, puis à verrouiller la
                  comparabilité via le mapping.
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

