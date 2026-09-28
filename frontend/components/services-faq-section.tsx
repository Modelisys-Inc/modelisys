"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { ServiceFaqItem } from "@/lib/services-faq"

type ServicesFaqSectionProps = {
  items: readonly ServiceFaqItem[]
}

export function ServicesFaqSection({ items }: ServicesFaqSectionProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  }

  return (
    <section
      className="mt-16 border-t border-[#2A2F3A]/10 pt-14 sm:mt-20"
      aria-labelledby="services-faq-heading"
      data-testid="services-faq"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-4">
          <p
            id="services-faq-heading"
            className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#9A4A1A]"
          >
            Questions fréquentes
          </p>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-slate-600">
            Les questions que les dirigeants posent avant de choisir le bon niveau d’intervention.
          </p>
        </div>
        <Accordion type="single" collapsible className="lg:col-span-8">
          {items.map((item, index) => (
            <AccordionItem
              key={item.question}
              value={`faq-${index}`}
              className="border-[#2A2F3A]/10"
            >
              <AccordionTrigger className="py-5 text-left text-[15px] font-semibold leading-snug tracking-tight text-[#2A2F3A] hover:no-underline hover:text-[#9A4A1A] [&[data-state=open]]:text-[#9A4A1A]">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-[15px] leading-relaxed text-slate-600">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
