import type { Metadata } from "next"
import Link from "next/link"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "L’importance d’un budget | Blog Modelisys",
  description:
    "Pourquoi un budget (et son suivi) est essentiel: pilotage, arbitrages, discipline, responsabilisation et exécution.",
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

export default function ArticleImportanceBudget() {
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
            <p className="mt-4 text-sm font-semibold tracking-wide text-slate-500">Finance · Budget</p>
            <h1 className="mt-3 text-3xl sm:text-4xl md:text-[42px] font-semibold leading-tight tracking-tight text-[#2A2F3A]">
              L’importance d’un budget (et de son suivi)
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold">29 janv. 2026</span>
              <span aria-hidden className="text-slate-300">
                •
              </span>
              <span>7 min</span>
            </div>
            <p className="mt-6 text-lg text-[#5C5F66] leading-relaxed">
              Un budget n’est pas un “document annuel”. C’est un système de pilotage: il explicite les priorités, fixe
              des repères, et permet de mesurer l’exécution. Sans suivi, il devient vite un fichier oublié. Avec un
              suivi simple et régulier, il devient un outil de gestion puissant.
            </p>
            <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-slate-300/50 to-transparent" />
          </section>

          <article className={cardShell}>
            <div className="p-7 sm:p-9 space-y-10">
              <div>
                <H2 id="pourquoi">1) À quoi sert un budget, concrètement?</H2>
                <BulletList
                  items={[
                    "Traduire une stratégie en objectifs mesurables.",
                    "Arbitrer les ressources (capex, effectifs, dépenses) avec une logique explicite.",
                    "Créer un langage commun pour les responsables (responsabilisation).",
                    "Réduire l’incertitude en testant des hypothèses de façon structurée.",
                  ]}
                />
              </div>

              <div>
                <H2 id="suivi">2) Le suivi: là où la valeur se crée</H2>
                <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                  Le budget devient utile quand on suit les écarts, qu’on explique les causes et qu’on décide d’actions.
                  Une cadence simple (mensuelle) et des écarts “expliqués” sont souvent plus puissants qu’un budget
                  ultra-détaillé non suivi.
                </p>
              </div>

              <div>
                <H2 id="modelisys">3) Comment Modelisys aide</H2>
                <BulletList
                  items={[
                    "Conserver une base unique et éviter les versions concurrentes.",
                    "Suivre les écarts dans le temps et clarifier les causes.",
                    "Comparer des scénarios (prudent, réaliste, ambitieux) et leurs impacts.",
                  ]}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/70 p-5">
                <p className="text-sm font-semibold text-[#2A2F3A]">En bref</p>
                <p className="mt-2 text-[15px] leading-relaxed text-[#5C5F66]">
                  Un budget sans suivi est une intention. Un budget suivi devient un système de pilotage.
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

