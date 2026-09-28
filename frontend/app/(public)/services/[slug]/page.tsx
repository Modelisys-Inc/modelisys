import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { ServicesAccompagnementPageSection } from "@/components/services-accompagnement-page-section"
import { ServicesPillarPageSection } from "@/components/services-pillar-page-section"
import { Footer } from "@/components/footer"
import { SERVICES_ACCOMPAGNEMENT_PAGE } from "@/lib/services-accompagnement-content"
import {
  getAllServicePageSlugs,
  getServicesPillarBySlug,
  SERVICES_PAGE_SLUGS,
} from "@/lib/services-page-content"

type PageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getAllServicePageSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  if (slug === SERVICES_PAGE_SLUGS.accompagnement) {
    return {
      title: `${SERVICES_ACCOMPAGNEMENT_PAGE.eyebrow} | Services | Modelisys`,
      description: SERVICES_ACCOMPAGNEMENT_PAGE.intro,
      alternates: { canonical: `/services/${slug}` },
      openGraph: {
        title: `${SERVICES_ACCOMPAGNEMENT_PAGE.eyebrow} | Modelisys`,
        description: SERVICES_ACCOMPAGNEMENT_PAGE.title,
        url: `/services/${slug}`,
      },
    }
  }
  const pillar = getServicesPillarBySlug(slug)
  if (!pillar) {
    return { title: "Services | Modelisys" }
  }
  return {
    title: `${pillar.label} | Services | Modelisys`,
    description: pillar.intro,
    alternates: { canonical: `/services/${slug}` },
    openGraph: {
      title: `${pillar.label} | Modelisys`,
      description: pillar.tagline,
      url: `/services/${slug}`,
    },
  }
}

export default async function ServicePillarPage({ params }: PageProps) {
  const { slug } = await params
  const pillar = getServicesPillarBySlug(slug)
  if (!pillar) notFound()

  return (
    <div className="min-h-screen overflow-hidden bg-slate-50">
      <div className="relative z-10">
        <GlassmorphismNav />
        {slug === SERVICES_PAGE_SLUGS.accompagnement ? (
          <ServicesAccompagnementPageSection />
        ) : (
          <ServicesPillarPageSection pillar={pillar} />
        )}
        <Footer />
      </div>
    </div>
  )
}
