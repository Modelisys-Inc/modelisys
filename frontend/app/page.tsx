import type { Metadata } from "next"
import { LandingHashScroll } from "@/components/landing-hash-scroll"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { HeroSection } from "@/components/hero-section"
import { HeroMarquee } from "@/components/hero-marquee"
import { LandingBusinessReturnSection } from "@/components/landing-business-return-section"
import { LandingObjectifSection } from "@/components/landing-objectif-section"
import { LandingQuotidienMarquee } from "@/components/landing-quotidien-marquee"
import { LandingApprocheSection } from "@/components/landing-approche-section"
import { LandingBlogTeaserSection } from "@/components/landing-blog-teaser-section"
import { PostFeaturesSection } from "@/components/post-features-section"
import { DemoBookingSection } from "@/components/demo-booking-section"
import { EmailSubscriptionSection } from "@/components/email-subscription-section"
import { Footer } from "@/components/footer"
import {
  LandingEmbedBreakout,
  LandingMobileDesktopFrame,
} from "@/components/landing-mobile-desktop-frame"

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
    <div className="min-h-screen bg-slate-50 overflow-hidden">
      <main className="min-h-screen relative">
        <div className="relative z-10">
          <LandingEmbedBreakout />
          <LandingHashScroll />
          <GlassmorphismNav />
          <HeroSection />
          <HeroMarquee />
          <section aria-hidden className="relative h-20 sm:h-24 overflow-hidden bg-[#222732]">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-12 left-1/3 w-72 h-72 bg-[#E6D6C3]/10 rounded-full blur-3xl" />
            </div>
            <svg
              viewBox="0 0 1440 120"
              preserveAspectRatio="none"
              className="absolute inset-x-0 bottom-0 h-full w-full"
            >
              <path
                d="M0,30 C180,95 360,95 540,60 C720,25 900,25 1080,60 C1230,90 1335,95 1440,75 L1440,120 L0,120 Z"
                fill="#222732"
              />
            </svg>
          </section>
          <LandingBusinessReturnSection />
          <LandingObjectifSection />
          <LandingQuotidienMarquee />
          <LandingApprocheSection />
          <LandingBlogTeaserSection />
          <PostFeaturesSection />
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
