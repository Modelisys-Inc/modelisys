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
    <div className="min-h-screen bg-[#F8FAFC]">
      <GlassmorphismNav />
      <main>
        <section className="relative overflow-hidden scroll-mt-24">
          <div className="pointer-events-none absolute inset-0 bg-[#222732]">
            <div
              className="absolute -right-[6%] -top-[22%] h-[70%] w-[55%] rounded-full"
              aria-hidden
              style={{
                background: "radial-gradient(circle, rgba(230,214,195,0.16) 0%, rgba(230,214,195,0) 68%)",
                filter: "blur(36px)",
              }}
            />
            <div
              className="absolute -left-[18%] top-[46%] h-[34%] w-[140%] -rotate-[14deg]"
              aria-hidden
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(230,214,195,0.16) 28%, rgba(224,116,45,0.38) 62%, transparent 88%)",
                filter: "blur(22px)",
              }}
            />
            <div
              className="absolute -left-[10%] bottom-[-6%] h-[16%] w-[120%] -rotate-[12deg]"
              aria-hidden
              style={{
                background:
                  "linear-gradient(90deg, transparent 8%, rgba(224,116,45,0.42) 46%, rgba(230,214,195,0.22) 68%, transparent 88%)",
                filter: "blur(18px)",
              }}
            />
          </div>

          <div className="relative z-10 mx-auto max-w-[1920px] px-5 py-16 sm:px-10 sm:py-24 lg:px-12 lg:py-28 xl:px-16 2xl:px-20">
            <p className="text-sm text-[#C9B8A5]/75">Blog</p>
            <h1 className="mt-6 max-w-[20rem] text-[1.85rem] font-medium leading-[1.22] tracking-[-0.02em] text-balance text-[#E6D6C3] sm:max-w-[36rem] sm:text-[2.15rem] lg:max-w-3xl lg:text-[2.35rem] xl:text-[2.5rem]">
              Une bibliothèque pensée pour tous les acteurs autour de la finance d’entreprise
            </h1>
            <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-[#C9B8A5]/82 sm:text-base">
              Entreprises, partenaires conseils et partenaires financiers: des articles concrets pour structurer vos
              données, accélérer vos analyses et fiabiliser vos projections dans Modelisys.
            </p>
          </div>
        </section>

        <section className="bg-[#F8FAFC] py-16 sm:py-20 lg:py-24">
          <BlogPostsSection posts={posts} />
        </section>
      </main>
      <Footer />
    </div>
  )
}
