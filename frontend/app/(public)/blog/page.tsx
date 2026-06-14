import type { Metadata } from "next"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { Footer } from "@/components/footer"
import { BlogPostsSection } from "./blog-posts-section"
import { blogPosts as posts } from "@/lib/blog-posts"

export const metadata: Metadata = {
  title: "Blog | Modelisys",
  description:
    "Articles sur la valorisation, le reporting et les projections — pour piloter votre trajectoire de valeur avec Modelisys.",
}

export default function BlogPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100">
      <GlassmorphismNav />

      <div className="relative z-10">
        {/* Hero : fond opaque (évite la bande claire du layout main bg-background) + split + cadrillage */}
        <section className="relative w-full overflow-hidden bg-[#2A2F3A]">
          <div className="absolute inset-0">
            <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
              <div className="relative bg-[#2A2F3A]">
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.45]"
                  aria-hidden
                  style={{
                    backgroundImage: `linear-gradient(rgb(255 255 255 / 0.055) 1px, transparent 1px),
                      linear-gradient(90deg, rgb(255 255 255 / 0.055) 1px, transparent 1px)`,
                    backgroundSize: "44px 44px",
                  }}
                />
              </div>
              <div className="relative bg-[#1F2430]">
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.4]"
                  aria-hidden
                  style={{
                    backgroundImage: `linear-gradient(rgb(255 255 255 / 0.05) 1px, transparent 1px),
                      linear-gradient(90deg, rgb(255 255 255 / 0.05) 1px, transparent 1px)`,
                    backgroundSize: "44px 44px",
                  }}
                />
              </div>
            </div>
            <div className="absolute inset-y-0 left-1/2 hidden w-px bg-white/5 lg:block" />
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-28 -top-24 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />
              <div className="absolute -bottom-20 -right-28 h-[480px] w-[480px] rounded-full bg-black/25 blur-3xl" />
              <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E6D6C3]/[0.04] blur-3xl" />
            </div>
          </div>

          <div className="relative z-10 mx-auto max-w-[1920px] px-8 pb-12 pt-28 sm:px-12 sm:pb-14 md:pt-32 lg:px-16 xl:px-20">
            <p className="mb-3 text-sm font-semibold tracking-wide text-slate-200">Ressources</p>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-[#E6D6C3] sm:text-4xl md:text-[2.5rem] md:leading-tight">
              Une bibliothèque pensée pour{" "}
              <span className="text-[#C9B8A5]/95">tous les acteurs</span> autour de la finance d’entreprise
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#C9B8A5]/80 sm:text-lg">
              Entreprises, partenaires conseils et partenaires financiers: des articles concrets pour structurer vos
              données, accélérer vos analyses et fiabiliser vos projections dans Modelisys.
            </p>
            <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/80 via-white/15 to-transparent" />
          </div>
        </section>

        {/* Bande sombre courbe — même motif que la landing */}
        <section aria-hidden className="relative h-20 overflow-hidden bg-[#1F2430] sm:h-24">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-12 left-1/3 h-72 w-72 rounded-full bg-[#E6D6C3]/10 blur-3xl" />
          </div>
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-full w-full">
            <path
              d="M0,30 C180,95 360,95 540,60 C720,25 900,25 1080,60 C1230,90 1335,95 1440,75 L1440,120 L0,120 Z"
              fill="#f8fafc"
            />
          </svg>
        </section>

        {/* Grille d'articles — cohérente avec la section « Pourquoi » */}
        <section className="relative overflow-hidden bg-slate-100/50 py-14 sm:py-18">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-slate-50/95 to-slate-100/80" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_45%_at_50%_-15%,rgba(224,116,45,0.055),transparent_55%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_100%_50%,rgba(148,163,184,0.12),transparent_65%)]" />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgb(148 163 184 / 0.1) 1px, transparent 1px),
                  linear-gradient(to bottom, rgb(148 163 184 / 0.1) 1px, transparent 1px)
                `,
                backgroundSize: "44px 44px",
                maskImage: "radial-gradient(ellipse 75% 65% at 50% 42%, black 15%, transparent 72%)",
                WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 50% 42%, black 15%, transparent 72%)",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-50/30 via-transparent to-slate-100/35" />
            <div className="absolute left-1/2 top-1/2 h-[min(72vh,520px)] w-[min(92vw,880px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-200/20 blur-3xl" />
          </div>

          <div className="relative">
            <BlogPostsSection posts={posts} />
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}

