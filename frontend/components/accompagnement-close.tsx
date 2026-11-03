"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ACCOMPAGNEMENT_FAQ, ACCOMPAGNEMENT_REASONS } from "@/lib/accompagnement-content"
import { cn } from "@/lib/utils"

function Eyebrow({ children, light = false }: { children: string; light?: boolean }) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.22em]",
        light ? "text-slate-500" : "text-[#E0742D]",
      )}
    >
      {children}
    </p>
  )
}

export function AccompagnementClose() {
  return (
    <>
      <section id="pourquoi" className="scroll-mt-28 border-t border-white/10 bg-[#222732] px-5 py-16 text-[#E6D6C3] sm:px-8 sm:py-20 lg:px-12 lg:py-24 xl:px-16">
        <Eyebrow>Pourquoi Modelisys</Eyebrow>
        <h2 className="mt-5 max-w-3xl text-[1.85rem] font-semibold leading-[1.15] tracking-tight sm:text-[2.2rem]">
          Une lecture financière, au rythme de votre entreprise.
        </h2>
        <p className="mt-5 max-w-2xl text-[15px] leading-[1.75] text-[#C9B8A5]/80">
          Modelisys accompagne les dirigeants de PME pour comprendre la performance,
          anticiper la trésorerie et relier les décisions à la valeur.
        </p>
        <div className="mt-12 grid gap-10 lg:grid-cols-3">
          {ACCOMPAGNEMENT_REASONS.map((reason) => (
            <article key={reason.title} className="border-t border-white/15 pt-5">
              <h3 className="text-lg font-semibold tracking-tight">{reason.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#C9B8A5]/80">{reason.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="questions" className="scroll-mt-28 bg-[#F0F4F8] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24 xl:px-16">
        <div className="max-w-3xl">
          <Eyebrow light>Questions fréquentes</Eyebrow>
          <h2 className="mt-5 text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#2A2F3A] sm:text-[2.2rem]">
            Avant de commencer
          </h2>
          <Accordion type="single" collapsible className="mt-8">
            {ACCOMPAGNEMENT_FAQ.map((item, index) => (
              <AccordionItem key={item.question} value={`accompagnement-faq-${index}`} className="border-[#2A2F3A]/15">
                <AccordionTrigger className="py-5 text-left text-[15px] font-semibold leading-snug tracking-tight text-[#2A2F3A] hover:no-underline hover:text-[#E0742D] [&[data-state=open]]:text-[#E0742D]">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pb-5 text-[15px] leading-relaxed text-[#5C5F66]">
                  {item.answer.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="border-t border-[#2A2F3A]/10 bg-[#F0F4F8] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24 xl:px-16">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Eyebrow light>Prochaine étape</Eyebrow>
            <h2 className="mt-5 text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#2A2F3A] sm:text-[2.2rem]">
              Parlez-nous de ce que vous voulez suivre.
            </h2>
            <p className="mt-4 text-[15px] leading-[1.75] text-[#5C5F66]">
              Nous regardons avec vous la performance, la trésorerie et les décisions en cours.
              L’accompagnement est adapté à votre entreprise.
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
    </>
  )
}
