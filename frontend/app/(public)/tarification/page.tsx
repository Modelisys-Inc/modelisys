import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Footer } from "@/components/footer"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { HeroMarquee } from "@/components/hero-marquee"
import { TarificationFaq } from "@/components/tarification-faq"
import { APPROCHE_FAQ } from "@/lib/approche-faq"
import { TARIFICATION_MARQUEE_ITEMS, TARIFICATION_OFFERS } from "@/lib/tarification-content"

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: APPROCHE_FAQ.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
}

export const metadata: Metadata = {
  title: "Tarification | Modelisys",
  description:
    "Diagnostic financier à partir de 3 500 $, accompagnement financier fractionnaire à partir de 750 $ par mois, et solutions sur devis.",
}

export default function TarificationPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#222732]">
      <GlassmorphismNav />
      <main>
        <section className="relative overflow-hidden scroll-mt-24">
          <div className="pointer-events-none absolute inset-0 bg-[#222732]">
            <div
              className="absolute -right-[6%] -top-[22%] h-[70%] w-[55%] rounded-full"
              aria-hidden
              style={{
                background: "radial-gradient(circle, rgba(230,214,195,0.16) 0%, rgba(230,214,195,0) 68%)",
                filter: "blur(36px)",
              }}
            />
            <div
              className="absolute -left-[18%] top-[46%] h-[34%] w-[140%] -rotate-[14deg]"
              aria-hidden
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(230,214,195,0.16) 28%, rgba(224,116,45,0.38) 62%, transparent 88%)",
                filter: "blur(22px)",
              }}
            />
            <div
              className="absolute -left-[10%] bottom-[-6%] h-[16%] w-[120%] -rotate-[12deg]"
              aria-hidden
              style={{
                background:
                  "linear-gradient(90deg, transparent 8%, rgba(224,116,45,0.42) 46%, rgba(230,214,195,0.22) 68%, transparent 88%)",
                filter: "blur(18px)",
              }}
            />
          </div>

          <div className="relative z-10 mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
            <div className="grid grid-cols-1 items-center gap-14 py-16 sm:gap-16 sm:py-24 lg:min-h-[min(78vh,44rem)] lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:gap-20 lg:py-28 xl:py-32">
              <div className="max-w-xl lg:max-w-none">
                <p className="text-sm text-[#C9B8A5]/75">Tarification</p>
                <h1 className="mt-6 max-w-[20rem] text-[1.85rem] font-medium leading-[1.22] tracking-[-0.02em] text-balance text-[#E6D6C3] sm:max-w-[36rem] sm:text-[2.15rem] lg:max-w-none lg:text-[2.35rem] xl:text-[2.5rem]">
                  Des solutions financières adaptées à vos ambitions
                </h1>
                <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-[#C9B8A5]/82 sm:text-base">
                  Que vous souhaitiez mieux comprendre votre performance, planifier votre croissance ou
                  bénéficier d’un accompagnement financier continu, Modelisys vous aide à transformer vos
                  données en décisions concrètes.
                </p>
                <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <Link
                    href="/#demo"
                    className="group inline-flex items-center gap-2 rounded-full border border-[#E6D6C3]/75 px-5 py-2.5 text-sm text-[#E6D6C3] transition hover:border-[#E6D6C3] hover:bg-[#E6D6C3] hover:text-[#222732] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6D6C3]/60"
                  >
                    <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    Discuter de vos besoins financiers
                  </Link>
                  <Link
                    href="/contact"
                    className="px-1 py-2 text-sm text-[#C9B8A5]/90 transition hover:text-[#E6D6C3]"
                  >
                    Nous contacter
                  </Link>
                </div>
              </div>

              <ul className="min-w-0 divide-y divide-[#E6D6C3]/15 border-y border-[#E6D6C3]/15">
                {TARIFICATION_OFFERS.map((offer) => (
                  <li key={offer.title} className="py-6">
                    <p className="text-sm text-[#C9B8A5]/75">{offer.title}</p>
                    <p className="mt-2 text-[1.65rem] font-medium tracking-[-0.02em] text-[#E0742D] sm:text-[1.85rem]">
                      {offer.price}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <HeroMarquee
          label="Pourquoi Modelisys"
          items={TARIFICATION_MARQUEE_ITEMS}
          ariaLabel="Pourquoi Modelisys — ce que l’accompagnement rend utile"
          duration="32s"
          tone="light"
          coverClassName="md:w-[min(18.5rem,55vw)]"
        />

        <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24 xl:px-16">
          <div className="mx-auto grid max-w-[1920px] gap-12 lg:grid-cols-3 lg:gap-10">
            {TARIFICATION_OFFERS.map((offer) => (
              <article key={offer.title} className="flex flex-col border-t border-[#2A2F3A]/15 pt-6">
                <h2 className="text-xl font-semibold tracking-tight text-[#2A2F3A]">{offer.title}</h2>
                <p className="mt-4 text-2xl font-semibold tracking-tight text-[#E0742D]">{offer.price}</p>
                <p className="mt-4 text-sm leading-relaxed text-[#5C5F66]">{offer.intro}</p>
                <ul className="mt-6 space-y-3">
                  {offer.points.map((point) => (
                    <li key={point} className="flex gap-3 text-sm leading-relaxed text-[#2A2F3A]">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E0742D]" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
                {offer.note && (
                  <p className="mt-6 text-sm leading-relaxed text-[#5C5F66]">{offer.note}</p>
                )}
                <p className="mt-6 text-sm leading-relaxed text-[#2A2F3A]">
                  <span className="font-semibold">Idéal pour : </span>
                  {offer.ideal}
                </p>
                {offer.footnote && (
                  <p className="mt-4 text-sm italic leading-relaxed text-slate-500">{offer.footnote}</p>
                )}
              </article>
            ))}
          </div>
        </section>

        <section
          id="questions-frequentes"
          className="scroll-mt-28 bg-[#F0F4F8] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24 xl:px-16"
          aria-labelledby="tarification-faq-heading"
        >
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Questions fréquentes
            </p>
            <h2
              id="tarification-faq-heading"
              className="mt-5 text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#2A2F3A] sm:text-[2.2rem]"
            >
              Avant de démarrer
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
              Ce que les dirigeants clarifient avant de démarrer l’accompagnement.
            </p>
            <TarificationFaq />
          </div>
        </section>

        <section className="border-t border-[#2A2F3A]/10 bg-[#F0F4F8] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24 xl:px-16">
          <div className="mx-auto flex max-w-[1920px] flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Prochaine étape
              </p>
              <h2 className="mt-5 text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#2A2F3A] sm:text-[2.2rem]">
                Une approche adaptée à votre entreprise
              </h2>
              <p className="mt-4 text-[15px] leading-[1.75] text-[#5C5F66]">
                Le coût d’un mandat dépend notamment de la complexité de vos données, du nombre de
                divisions, de la profondeur des analyses et de la fréquence du suivi.
              </p>
              <p className="mt-3 text-[15px] leading-[1.75] text-[#5C5F66]">
                Chaque collaboration commence par une discussion sur votre situation, vos objectifs
                et les résultats recherchés.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Link
                href="/#demo"
                className="group inline-flex items-center gap-2 rounded-full bg-[#2A2F3A] px-5 py-3 text-sm font-semibold text-[#E6D6C3] transition duration-200 hover:bg-[#E6D6C3] hover:text-[#222732]"
              >
                Discuter de votre projet
                <ArrowRight className="h-4 w-4 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/contact"
                className="px-2 py-3 text-sm font-semibold text-[#2A2F3A] underline decoration-[#E0742D]/70 underline-offset-4 hover:text-[#E0742D]"
              >
                Nous contacter
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
