import type { Metadata } from "next"
import Link from "next/link"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "L’importance du reporting financier | Blog Modelisys",
  description:
    "Pourquoi le reporting financier est essentiel: décision, alignement, discipline de gestion et relation avec les partenaires (Québec/Canada).",
}

function H2({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="scroll-mt-28 text-xl sm:text-2xl font-semibold text-[#2A2F3A] tracking-tight">
      {children}
    </h2>
  )
}

function BulletList({ items }: { items: Array<string> }) {
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

export default function ArticleImportanceReporting() {
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
            <p className="mt-4 text-sm font-semibold tracking-wide text-slate-500">Finance · Reporting</p>
            <h1 className="mt-3 text-3xl sm:text-4xl md:text-[42px] font-semibold leading-tight tracking-tight text-[#2A2F3A]">
              L’importance du reporting financier
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold">29 janv. 2026</span>
              <span aria-hidden className="text-slate-300">
                •
              </span>
              <span>7 min</span>
            </div>
            <p className="mt-6 text-lg text-[#5C5F66] leading-relaxed">
              Un reporting financier n’est pas “un rapport de plus”: c’est un rythme de gestion. Quand les chiffres
              sont disponibles, lisibles et comparables, les décisions s’accélèrent, les surprises diminuent, et la
              collaboration avec les partenaires (banquiers, investisseurs, conseils) devient plus simple.
            </p>
            <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-slate-300/50 to-transparent" />
          </section>

          <article className={cardShell}>
            <div className="p-7 sm:p-9 space-y-10">
              <div>
                <H2 id="pourquoi">1) Pourquoi le reporting est un levier stratégique</H2>
                <BulletList
                  items={[
                    "Accélérer la prise de décision (moins d’intuition, plus de signaux).",
                    "Aligner direction, finance et opérations sur les mêmes priorités.",
                    "Détecter tôt les écarts (marge, coûts, trésorerie) et corriger vite.",
                    "Renforcer la crédibilité des échanges externes (p. ex. financement, diligence).",
                  ]}
                />
              </div>

              <div>
                <H2 id="bon-rythme">2) Le bon rythme: régularité, cohérence, simplicité</H2>
                <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                  Le meilleur reporting n’est pas le plus long; c’est celui qui arrive à temps et qui est compris.
                  Privilégiez une structure stable, des définitions constantes et quelques KPI suivis dans le temps.
                </p>
              </div>

              <div>
                <H2 id="modelisys">3) Comment Modelisys aide</H2>
                <BulletList
                  items={[
                    "Centraliser les informations et éviter la fragmentation des versions.",
                    "Rendre la lecture des résultats cohérente pour tous les acteurs.",
                    "Soutenir les comparaisons (périodes, scénarios) et la production de vues prêtes à partager.",
                  ]}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/70 p-5">
                <p className="text-sm font-semibold text-[#2A2F3A]">En bref</p>
                <p className="mt-2 text-[15px] leading-relaxed text-[#5C5F66]">
                  Le reporting financier est une discipline de pilotage. Il transforme des chiffres en décisions, et
                  des décisions en trajectoire.
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

