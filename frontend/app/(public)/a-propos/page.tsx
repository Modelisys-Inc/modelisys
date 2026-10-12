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
    "Modelisys — gestion de la performance et création de valeur pour les PME. Notre histoire, notre approche (comprendre, planifier, exécuter) et notre équipe.",
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

            <section id="equipe" className="scroll-mt-24 relative z-10 border-t border-slate-200/80 py-20 sm:py-28">
              <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16 lg:mx-0 lg:max-w-2xl lg:text-left">
                <p className="mb-3 text-sm font-semibold tracking-wide text-slate-500">Le fondateur</p>
                <h2 className="text-3xl font-semibold tracking-tight text-[#2A2F3A] sm:text-4xl md:text-5xl">
                  Par et pour les{" "}
                  <span className="text-[#5C5F66]">professionnels.</span>
                </h2>
                <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-slate-300/50 to-transparent lg:mx-0 mx-auto" />
              </div>

              <article className="border-t border-slate-200/90">
                <div className="grid items-center gap-10 py-10 sm:gap-12 sm:py-14 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] lg:gap-16 xl:gap-24">
                  <figure className="mx-auto w-full max-w-[20rem] lg:mx-0 lg:max-w-none">
                    <div className="overflow-hidden rounded-2xl bg-[#163056] shadow-[0_28px_70px_-36px_rgba(22,48,86,0.65)] ring-1 ring-slate-900/10">
                      <img
                        src="/equipe/tristan-bellerose.jpg"
                        alt="Portrait de Tristan Bellerose, président de Modelisys"
                        className="block h-auto w-full"
                      />
                    </div>
                    <figcaption className="mt-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <span>Fondateur</span>
                      <span className="h-px flex-1 bg-gradient-to-r from-[#E0742D]/45 via-slate-300/60 to-transparent" aria-hidden />
                      <span className="text-[#E0742D]">PDG</span>
                    </figcaption>
                  </figure>

                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Présidence · approche
                      </p>
                      <span
                        className="h-px flex-1 bg-gradient-to-r from-[#E0742D]/35 via-slate-300/50 to-transparent"
                        aria-hidden
                      />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl md:text-[1.75rem] md:leading-tight">
                      Tristan Bellerose, CPA, CBV
                    </h3>
                    <p className="mt-3 text-sm font-medium text-[#5C5F66] sm:text-[15px]">
                      Président
                    </p>

                    <div className="mt-6 space-y-5 border-t border-slate-200/80 pt-6">
                      <p className="text-[15px] leading-[1.75] text-[#5C5F66] sm:text-base">
                        En dehors du travail, je suis passionné de sport, particulièrement de hockey, de tennis et de
                        golf. Tourné vers l&apos;avenir, je m&apos;intéresse aux nouvelles technologies et à
                        l&apos;intelligence artificielle, et à leur impact sur la transformation du monde des affaires.
                      </p>
                      <p className="text-[15px] leading-[1.75] text-[#5C5F66] sm:text-base">
                        Passionné par la finance et la création de valeur, je me spécialise en finance corporative,
                        notamment en évaluation d&apos;entreprise, analyse de la performance et stratégie. J&apos;y
                        intègre le développement de modèles Excel complexes — programmation, projections détaillées et
                        simulations — pour appuyer cette analyse et relier les décisions à la valeur.
                      </p>
                    </div>

                    <ul className="mt-8 flex flex-wrap gap-2" aria-label="Domaines de pratique">
                      {["Modélisation financière", "Gestion de la performance", "Évaluation d'entreprise"].map((label) => (
                        <li
                          key={label}
                          className="rounded-full border border-slate-200/90 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2A2F3A]"
                        >
                          {label}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
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
                    Une question sur un mandat, un accompagnement ou un partenariat — nous sommes à l&apos;écoute.
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
