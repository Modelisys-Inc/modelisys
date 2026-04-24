import Link from "next/link"
import { ArrowRight, ChevronRight, Newspaper } from "lucide-react"
import { blogFeaturedPost, blogLandingSecondaryPosts } from "@/lib/blog-posts"

/**
 * Bandeau entre « Études de cas » et « Mise en place » : vedette + trois articles piliers, sans alourdir la page.
 */
export function LandingBlogTeaserSection() {
  const featured = blogFeaturedPost

  return (
    <section
      id="blog-vedette"
      aria-labelledby="landing-blog-teaser-heading"
      className="scroll-mt-24 relative z-10 border-t border-slate-200/80 bg-gradient-to-b from-white via-slate-50/40 to-slate-50/90 py-8 sm:py-10"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(224,116,45,0.04),transparent_55%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-8 sm:px-12 lg:px-16 xl:px-20">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 sm:mb-5">Blog</p>

        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white/85 px-5 py-5 shadow-sm shadow-slate-900/[0.03] ring-1 ring-slate-200/60 sm:px-6 sm:py-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50 text-[#E0742D] shadow-sm">
              <Newspaper className="h-5 w-5" strokeWidth={2} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#E0742D]/90">À la une</p>
              <h2
                id="landing-blog-teaser-heading"
                className="mt-1 text-lg font-semibold leading-snug tracking-tight text-[#2A2F3A] sm:text-xl"
              >
                <Link
                  href={featured.href}
                  className="hover:text-[#E0742D] hover:underline decoration-[#E0742D]/60 underline-offset-4"
                >
                  {featured.title}
                </Link>
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#5C5F66] line-clamp-3">{featured.excerpt}</p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3 lg:justify-end">
            <Link
              href={featured.href}
              className="inline-flex items-center gap-2 rounded-xl bg-[#E0742D] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#c96526]"
            >
              Lire l’article
              <ArrowRight className="h-4 w-4 opacity-90" aria-hidden />
            </Link>
            <Link
              href="/blog"
              className="inline-flex items-center rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-[#2A2F3A] shadow-sm transition-colors hover:bg-slate-50"
            >
              Tous les articles
            </Link>
          </div>
        </div>

        <div className="mt-9 sm:mt-11">
          <p className="mb-5 text-xs font-semibold tracking-wide text-slate-500 sm:mb-6">
            Pilotage financier dans Modelisys
          </p>
          <ul className="grid gap-4 sm:grid-cols-3 sm:gap-5" role="list">
            {blogLandingSecondaryPosts.map((post) => (
              <li key={post.href} className="min-w-0">
                <Link
                  href={post.href}
                  className="group flex h-full flex-col rounded-xl border border-slate-200/90 bg-white/90 px-4 py-3.5 shadow-sm shadow-slate-900/[0.02] ring-1 ring-slate-200/50 transition-colors hover:border-[#E0742D]/35 hover:ring-[#E0742D]/15"
                >
                  <span className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-[#2A2F3A] group-hover:text-[#E0742D]">
                    {post.title}
                  </span>
                  <span className="mt-2 line-clamp-2 flex-1 text-xs leading-relaxed text-[#5C5F66]">{post.excerpt}</span>
                  <span className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px] font-medium text-slate-500">
                    <span>{post.readingTime}</span>
                    <span className="inline-flex items-center gap-0.5 text-[#E0742D] transition group-hover:gap-1">
                      Lire
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
