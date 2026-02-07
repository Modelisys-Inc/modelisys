import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { HeroSection } from "@/components/hero-section"
import { ProblemSolutionSection } from "@/components/problem-solution-section"
import { IntroTransitionSection } from "@/components/intro-transition-section"
import { FeaturesSection } from "@/components/features-section"
import { PostFeaturesSection } from "@/components/post-features-section"
import { AITeamSection } from "@/components/ai-team-section"
import { PricingProcessSection } from "@/components/pricing-process-section"
import { DemoBookingSection } from "@/components/demo-booking-section"
import { EmailSubscriptionSection } from "@/components/email-subscription-section"
import { Footer } from "@/components/footer"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden">
      <main className="min-h-screen relative">
        <div className="relative z-10">
          <GlassmorphismNav />
          <HeroSection />
          <ProblemSolutionSection />
          <IntroTransitionSection />
          <FeaturesSection />
          <PostFeaturesSection />
          <AITeamSection />
          <PricingProcessSection />
          <DemoBookingSection 
            description="Modelisys est actuellement déployé auprès d'un nombre restreint d'entreprises. Les accès sont accordés progressivement selon la liste d'attente."
            showWaitlistProcess={true}
          />
          <EmailSubscriptionSection />
          <Footer />
        </div>
      </main>
    </div>
  )
}
