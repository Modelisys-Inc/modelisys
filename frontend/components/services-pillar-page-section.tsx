"use client"

import { ServicesOtherServicesSection } from "@/components/services-other-services-section"
import { ServicesPillarArticle } from "@/components/services-pillar-article"
import { type ServicesPagePillar } from "@/lib/services-page-content"

type ServicesPillarPageSectionProps = {
  pillar: ServicesPagePillar
}

export function ServicesPillarPageSection({ pillar }: ServicesPillarPageSectionProps) {

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F8FAFC]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[#F8FAFC]" />
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
        <div className="absolute -top-24 right-[-8%] h-[28rem] w-[28rem] rounded-full bg-[#E0742D]/[0.05] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-5 pb-20 pt-28 sm:px-10 sm:pb-28 sm:pt-32 lg:px-12 xl:px-16 2xl:px-20">
        <ServicesPillarArticle pillar={pillar} asPage />

        <div className="mt-16 sm:mt-20">
          <ServicesOtherServicesSection currentId={pillar.id} />
        </div>
      </div>
    </div>
  )
}
