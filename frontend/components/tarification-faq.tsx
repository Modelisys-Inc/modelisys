"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { APPROCHE_FAQ } from "@/lib/approche-faq"

export function TarificationFaq() {
  return (
    <Accordion type="single" collapsible className="mt-8 max-w-3xl">
      {APPROCHE_FAQ.map((item, index) => (
        <AccordionItem key={item.question} value={`tarification-faq-${index}`} className="border-slate-200">
          <AccordionTrigger className="py-5 text-left text-[15px] font-semibold leading-snug tracking-tight text-[#2A2F3A] hover:no-underline hover:text-[#E0742D] [&[data-state=open]]:text-[#E0742D]">
            {item.question}
          </AccordionTrigger>
          <AccordionContent className="pb-5 text-[15px] leading-relaxed text-[#5C5F66]">
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
