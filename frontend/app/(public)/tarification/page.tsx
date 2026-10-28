import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Footer } from "@/components/footer"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { TarificationFaq } from "@/components/tarification-faq"
import { APPROCHE_FAQ } from "@/lib/approche-faq"
import { TARIFICATION_OFFERS } from "@/lib/tarification-content"

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
      <main className="relative px-5 pb-20 pt-28 sm:px-8 sm:pb-28 sm:pt-32">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div
            className="absolute inset-x-0 top-0 h-[920px] sm:h-[1080px]"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgb(148 163 184 / 0.1) 1px, transparent 1px),
                linear-gradient(to bottom, rgb(148 163 184 / 0.1) 1px, transparent 1px)
              `,
              backgroundSize: "44px 44px",
              maskImage: "radial-gradient(ellipse 75% 65% at 50% 42%, black 15%, transparent 72%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 75% 65% at 50% 42%, black 15%, transparent 72%)",
            }}
          />
          <div className="absolute inset-x-0 top-0 h-[920px] bg-gradient-to-b from-slate-50/30 via-transparent to-[#F8FAFC] sm:h-[1080px]" />
        </div>
        <div className="relative mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-[#E0742D]">Tarification</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-[#2A2F3A] sm:text-4xl md:text-5xl md:leading-tight">
            Des solutions financières adaptées à vos ambitions
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#5C5F66] sm:text-lg">
            Que vous souhaitiez mieux comprendre votre performance, planifier votre croissance ou
            bénéficier d’un accompagnement financier continu, Modelisys vous aide à transformer vos
            données en décisions concrètes.
          </p>

          <div className="mt-14 grid gap-10 lg:grid-cols-3 lg:gap-8">
            {TARIFICATION_OFFERS.map((offer) => (
              <article key={offer.title} className="flex flex-col border-t-2 border-[#222732] pt-6">
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

          <section className="mt-16 border-t border-slate-200 pt-12 sm:mt-20">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-semibold tracking-tight text-[#2A2F3A] sm:text-3xl">
                  Une approche adaptée à votre entreprise
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-[#5C5F66] sm:text-base">
                  Le coût d’un mandat dépend notamment de la complexité de vos données, du nombre de
                  divisions, de la profondeur des analyses et de la fréquence du suivi.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[#5C5F66] sm:text-base">
                  Chaque collaboration commence par une discussion sur votre situation, vos objectifs
                  et les résultats recherchés.
                </p>
              </div>
              <Link
                href="/#demo"
                className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-[#2A2F3A] bg-[#2A2F3A] px-6 py-3 text-sm font-semibold text-[#E6D6C3] transition hover:bg-[#353b48] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50 lg:self-end"
              >
                Discuter de vos besoins financiers
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </section>

          <section
            id="questions-frequentes"
            className="mt-16 scroll-mt-28 border-t border-slate-200 pt-12 sm:mt-20 sm:pt-16"
            aria-labelledby="tarification-faq-heading"
          >
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
            <h2
              id="tarification-faq-heading"
              className="text-2xl font-semibold tracking-tight text-[#2A2F3A] sm:text-3xl"
            >
              Questions fréquentes
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#5C5F66] sm:text-base">
              Ce que les dirigeants clarifient avant de démarrer l’accompagnement.
            </p>
            <TarificationFaq />
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
