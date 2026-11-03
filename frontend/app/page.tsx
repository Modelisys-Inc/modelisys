import type { Metadata } from "next"
import { LandingHashScroll } from "@/components/landing-hash-scroll"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { HeroSection } from "@/components/hero-section"
import { HeroMarquee } from "@/components/hero-marquee"
import { LandingHomeObjectifSection } from "@/components/landing-home-objectif-section"
import { LandingServicesPairSection } from "@/components/landing-services-pair-section"
import { LandingHomeApprocheSection } from "@/components/landing-home-approche-section"
import { LandingHomeCloseSection } from "@/components/landing-home-close-section"
import { LandingHomeRail } from "@/components/landing-home-rail"
import { LandingBlogTeaserSection } from "@/components/landing-blog-teaser-section"
import { PostFeaturesSection } from "@/components/post-features-section"
import { DemoBookingSection } from "@/components/demo-booking-section"
import { EmailSubscriptionSection } from "@/components/email-subscription-section"
import { Footer } from "@/components/footer"
import {
  LandingEmbedBreakout,
  LandingMobileDesktopFrame,
} from "@/components/landing-mobile-desktop-frame"
import { LANDING_SERVICE_MARQUEE_ITEMS } from "@/lib/landing-services-content"

type LandingSearchParams = Promise<{ embed?: string | string[] }>

function isDesktopEmbed(embed: string | string[] | undefined) {
  return embed === "desktop" || (Array.isArray(embed) && embed.includes("desktop"))
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: LandingSearchParams
}): Promise<Metadata> {
  const { embed } = await searchParams
  if (isDesktopEmbed(embed)) {
    return { robots: { index: false, follow: false } }
  }
  return { robots: { index: true, follow: true } }
}

function LandingPageBody() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <main className="min-h-screen relative">
        <div className="relative z-10">
          <LandingEmbedBreakout />
          <LandingHashScroll />
          <GlassmorphismNav />
          <HeroSection variant="services" />
          <HeroMarquee
            items={LANDING_SERVICE_MARQUEE_ITEMS}
            ariaLabel="Insights — performance, trésorerie et valeur"
          />
          <LandingHomeRail>
            <LandingHomeObjectifSection />
            <LandingServicesPairSection />
            <LandingHomeApprocheSection />
            <LandingHomeCloseSection />
            <LandingBlogTeaserSection />
            <PostFeaturesSection />
          </LandingHomeRail>
          <DemoBookingSection />
          <EmailSubscriptionSection />
          <Footer />
        </div>
      </main>
    </div>
  )
}

export default async function LandingPage({
  searchParams,
}: {
  searchParams: LandingSearchParams
}) {
  const { embed } = await searchParams
  if (isDesktopEmbed(embed)) return <LandingPageBody />

  return (
    <>
      <div className="landing-frame">
        <iframe id="landing-desktop-frame" title="Modelisys" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){if(!window.matchMedia("(max-width: 767px)").matches)return;var frame=document.getElementById("landing-desktop-frame");if(!frame||frame.getAttribute("src"))return;frame.setAttribute("src","/?embed=desktop"+window.location.hash);})();`,
          }}
        />
      </div>
      <LandingMobileDesktopFrame />
      <div className="landing-direct">
        <LandingPageBody />
      </div>
    </>
  )
}
