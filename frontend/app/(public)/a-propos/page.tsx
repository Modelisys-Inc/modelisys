import type { Metadata } from "next"
import Link from "next/link"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { Footer } from "@/components/footer"
import { AboutQuebecHeroSection } from "@/components/about-quebec-hero-section"
import { AboutOurStorySection } from "@/components/about-our-story-section"
import { ArrowUpRight } from "lucide-react"

export const metadata: Metadata = {
  title: "À propos | Modelisys",
  description:
    "Modelisys — plateforme de pilotage financier et de trajectoire de valeur pour PME et groupes multi-entités. Notre histoire, notre approche en trois phases et notre équipe fondatrice.",
}

export default function AProposPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#222732]">
      <GlassmorphismNav />

      <AboutQuebecHeroSection />

      <div className="relative z-10 bg-[#F8FAFC]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[#F8FAFC]" />
          <div className="absolute -top-24 right-[-8%] h-[28rem] w-[28rem] rounded-full bg-[#E0742D]/[0.05] blur-3xl" />
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgb(42 47 58 / 0.045) 1px, transparent 1px),
                linear-gradient(to bottom, rgb(42 47 58 / 0.045) 1px, transparent 1px)
              `,
              backgroundSize: "56px 56px",
              maskImage: "radial-gradient(ellipse 70% 65% at 28% 18%, black 12%, transparent 72%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 70% 65% at 28% 18%, black 12%, transparent 72%)",
            }}
          />
        </div>

        <main className="relative z-10 pb-20 pt-4 sm:pb-28 sm:pt-8">
          <div className="mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-14 xl:px-20 2xl:px-24">
            <AboutOurStorySection />

            {/* Équipe fondatrice — même langage que « Notre histoire » (timeline, rails, hiérarchie) */}
            <section id="equipe" className="scroll-mt-24 relative z-10 border-t border-slate-200/80 py-20 sm:py-28">
              <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16 lg:mx-0 lg:max-w-2xl lg:text-left">
                <p className="mb-3 text-sm font-semibold tracking-wide text-slate-500">L&apos;équipe fondatrice</p>
                <h2 className="text-3xl font-semibold tracking-tight text-[#2A2F3A] sm:text-4xl md:text-5xl">
                  Par et pour les{" "}
                  <span className="text-[#5C5F66]">professionnels.</span>
                </h2>
                <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-slate-300/50 to-transparent lg:mx-0 mx-auto" />
              </div>

              <ol className="mx-auto max-w-4xl space-y-0 border-t border-slate-200/90 lg:max-w-none">
                <li className="grid scroll-mt-32 gap-6 border-b border-slate-200/80 py-8 sm:grid-cols-[auto_1fr] sm:gap-10 sm:py-10">
                  <div className="flex flex-col gap-1 sm:pt-0.5">
                    <span className="font-mono text-4xl font-bold leading-none tabular-nums text-[#E0742D]/25 sm:text-5xl">
                      01
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="mb-6 sm:mb-8">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Présidence · produit
                        </p>
                        <span
                          className="h-px flex-1 bg-gradient-to-r from-[#E0742D]/35 via-slate-300/50 to-transparent"
                          aria-hidden
                        />
                      </div>
                      <h3 className="mt-4 text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl md:text-[1.75rem] md:leading-tight">
                        Tristan Bellerose, CPA, CBV
                      </h3>
                    </div>

                    <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
                      <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row lg:flex-col lg:items-start">
                        <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2A2F3A] to-[#1a1f28] text-lg font-semibold tracking-tight text-[#E6D6C3] ring-1 ring-slate-200/25">
                          TB
                          <span className="absolute -right-1 -top-1 rounded-full bg-[#E0742D] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                            PDG
                          </span>
                        </div>
                        <div className="text-center sm:text-left lg:max-w-[14rem]">
                          <p className="text-sm font-medium text-[#5C5F66]">
                            Président-directeur général (PDG) · Cofondateur
                          </p>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 space-y-5">
                        <p className="text-[15px] leading-[1.75] text-[#5C5F66] sm:text-base">
                          Avant de cofonder Modelisys, Tristan a évolué au sein de plusieurs cabinets comptables, aux
                          côtés d&apos;associés en certification, en fiscalité et en services-conseils. Un même constat
                          revenait systématiquement : aucune base commune entre les CPA et leurs clients PME. Des questions
                          légitimes restaient sans réponse immédiate — parce qu&apos;il fallait d&apos;abord attendre les
                          documents, puis construire une analyse dans Excel. Des dirigeants qui ne savaient pas ce qui
                          influençait la valeur de leur entreprise. Des PME incapables d&apos;analyser leur rentabilité par
                          produit, par division ou par société, de préparer des budgets, de bâtir des projections et de
                          suivre l&apos;évolution de leurs résultats réels comparativement à ces repères — simplement parce
                          qu&apos;aucun outil ne le permettait facilement. C&apos;est de ce constat que Modelisys est né.
                          Aujourd&apos;hui, en tant que cofondateur et PDG, Tristan porte la vision du produit et de
                          l&apos;approche Modelisys, définit et priorise les fonctionnalités, et conduit
                          l&apos;accompagnement stratégique lorsque les clients le choisissent — en lien direct avec les
                          équipes et les partenaires, il ancre ces responsabilités dans une connaissance concrète de
                          l&apos;analyse financière, de la consolidation, de la valorisation et des échanges avec les
                          cabinets, afin que Modelisys reste alignée sur les attentes des professionnels et la réalité des
                          entreprises qu&apos;elle sert.
                        </p>
                      </div>
                    </div>
                  </div>
                </li>

                <li className="grid scroll-mt-32 gap-6 border-b border-slate-200/80 py-8 sm:grid-cols-[auto_1fr] sm:gap-10 sm:py-10">
                  <div className="flex flex-col gap-1 sm:pt-0.5">
                    <span className="font-mono text-4xl font-bold leading-none tabular-nums text-[#E0742D]/25 sm:text-5xl">
                      02
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="mb-6 sm:mb-8">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Technologie · plateforme
                        </p>
                        <span
                          className="h-px flex-1 bg-gradient-to-r from-[#E0742D]/35 via-slate-300/50 to-transparent"
                          aria-hidden
                        />
                      </div>
                      <h3 className="mt-4 text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl md:text-[1.75rem] md:leading-tight">
                        Alexandre Moreau, M. Sc
                      </h3>
                    </div>

                    <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
                      <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row lg:flex-col lg:items-start">
                        <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2A2F3A] to-[#1a1f28] text-lg font-semibold tracking-tight text-[#E6D6C3] ring-1 ring-slate-200/25">
                          AM
                          <span className="absolute -right-1 -top-1 rounded-full bg-slate-700 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#E6D6C3] ring-1 ring-white/10">
                            CTO
                          </span>
                        </div>
                        <div className="text-center sm:text-left lg:max-w-[14rem]">
                          <p className="text-sm font-medium text-[#5C5F66]">Directeur technique (CTO) · Cofondateur</p>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 space-y-5">
                        <p className="text-[15px] leading-[1.75] text-[#5C5F66] sm:text-base">
                          Cofondateur et directeur technique, Alexandre porte chez Modelisys l&apos;architecture de la
                          plateforme de A à Z : il arbitre les choix d&apos;ingénierie, priorise les chantiers
                          d&apos;architecture et pilote la feuille de route de développement, et veille à ce qu&apos;elle
                          demeure fiable, sécurisée et
                          scalable à mesure que la clientèle grandit — en lien étroit avec la vision produit et les équipes.
                          Son rôle ne se limite pas à « coder des spécifications » : il est le relais entre les enjeux
                          métier et la réalité des systèmes, là où la consolidation multi-entités devient un problème
                          d&apos;architecture de données, où la détection d&apos;anomalies financières appelle
                          l&apos;apprentissage automatique, et où chaque release doit tenir la charge. Développeur logiciel
                          et titulaire d&apos;une maîtrise en intelligence artificielle, il met cette double expertise
                          au service des priorités produit : ce socle technique est ce qui permettra à Modelisys
                          d&apos;innover durablement dans les années à venir.
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              </ol>
            </section>

            {/* CTA — même langage visuel que « Notre histoire » / équipe : plat, traits, pas de carte */}
            <section className="scroll-mt-24 border-t border-slate-200/90 pt-12 sm:pt-14 pb-10 sm:pb-14">
              <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
                <div className="min-w-0 max-w-2xl">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Contact</p>
                    <span
                      className="h-px flex-1 bg-gradient-to-r from-[#E0742D]/35 via-slate-300/50 to-transparent"
                      aria-hidden
                    />
                  </div>
                  <h2 className="mt-4 text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl md:text-[1.75rem] md:leading-tight">
                    Parlons de votre organisation
                  </h2>
                  <p className="mt-3 text-[15px] leading-[1.75] text-[#5C5F66] sm:text-base">
                    Une question sur la plateforme, une démo ou un partenariat — nous sommes à l&apos;écoute.
                  </p>
                </div>
                <Link
                  href="/contact"
                  className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-[#2A2F3A] bg-[#2A2F3A] px-6 py-3 text-sm font-semibold text-[#E6D6C3] shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset] transition hover:bg-[#353b48] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50 lg:self-center"
                >
                  Nous contacter
                  <ArrowUpRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                </Link>
              </div>
            </section>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  )
}
