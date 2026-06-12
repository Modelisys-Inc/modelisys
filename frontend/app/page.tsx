import type { Metadata } from "next"
import { LandingHashScroll } from "@/components/landing-hash-scroll"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { HeroSection } from "@/components/hero-section"
import { HeroMarquee } from "@/components/hero-marquee"
import { LandingClientJourneySection } from "@/components/landing-client-journey-section"
import { LandingAudiencesSection } from "@/components/landing-audiences-section"
import { ProblemSolutionSection } from "@/components/problem-solution-section"
import { ExcelFrustrationsMarquee } from "@/components/excel-frustrations-marquee"
import { CaseStudiesSection } from "@/components/case-studies-section"
import { LandingBlogTeaserSection } from "@/components/landing-blog-teaser-section"
import { PlatformSetupSection } from "@/components/platform-setup-section"
import { PricingProcessSection } from "@/components/pricing-process-section"
import { PostFeaturesSection } from "@/components/post-features-section"
import { DemoBookingSection } from "@/components/demo-booking-section"
import { EmailSubscriptionSection } from "@/components/email-subscription-section"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  robots: { index: true, follow: true },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden">
      <main className="min-h-screen relative">
        <div className="relative z-10">
          <LandingHashScroll />
          <GlassmorphismNav />
          <HeroSection />
          <HeroMarquee />
          <section aria-hidden className="relative h-20 sm:h-24 overflow-hidden bg-[#1F2430]">
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
                fill="#1F2430"
              />
            </svg>
          </section>
          <LandingClientJourneySection />
          <section aria-hidden className="relative h-20 sm:h-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#1F2430] to-[#2A2F3A]" />
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-12 left-1/3 h-72 w-72 rounded-full bg-[#E6D6C3]/10 blur-3xl" />
            </div>
            <svg
              viewBox="0 0 1440 120"
              preserveAspectRatio="none"
              className="absolute inset-x-0 bottom-0 h-full w-full"
            >
              <defs>
                <linearGradient id="approche-pour-qui-wave" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#2A2F3A" />
                  <stop offset="100%" stopColor="#1F2430" />
                </linearGradient>
              </defs>
              <path
                d="M0,30 C180,95 360,95 540,60 C720,25 900,25 1080,60 C1230,90 1335,95 1440,75 L1440,120 L0,120 Z"
                fill="url(#approche-pour-qui-wave)"
              />
            </svg>
          </section>
          <LandingAudiencesSection />
          <ProblemSolutionSection />
          <ExcelFrustrationsMarquee />
          <CaseStudiesSection />
          <LandingBlogTeaserSection />
          <PlatformSetupSection />
          <PostFeaturesSection />
          <PricingProcessSection />
          <DemoBookingSection />
          <EmailSubscriptionSection />
          <Footer />
        </div>
      </main>
    </div>
  )
}
