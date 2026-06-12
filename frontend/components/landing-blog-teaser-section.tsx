import Link from "next/link"
import { ArrowRight, ChevronRight } from "lucide-react"
import { blogFeaturedPost, blogLandingSecondaryPosts } from "@/lib/blog-posts"

/**
 * Bandeau entre « Études de cas » et « Mise en place » : vedette + trois articles piliers.
 */
export function LandingBlogTeaserSection() {
  const featured = blogFeaturedPost

  return (
    <section
      id="blog-vedette"
      aria-labelledby="landing-blog-teaser-heading"
      className="relative z-10 scroll-mt-24 overflow-hidden border-t border-slate-200/80 bg-gradient-to-b from-white via-slate-50/40 to-slate-50/90 py-16 sm:py-20 lg:py-24"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(224,116,45,0.045),transparent_55%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-14 xl:px-20 2xl:px-24">
        <div className="mb-10 sm:mb-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Blog</p>
          <h2
            id="landing-blog-teaser-heading"
            className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight text-[#2A2F3A] sm:text-4xl md:text-[2.5rem] md:leading-tight"
          >
            Ressources pour piloter votre{" "}
            <span className="text-[#5C5F66]">trajectoire de valeur</span>
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#5C5F66] sm:text-lg">
            Articles concrets sur la valorisation, le reporting et les projections — pour approfondir les thématiques
            de la plateforme et alimenter votre parcours.
          </p>
        </div>

        {/* À la une */}
        <article className="relative overflow-hidden rounded-[28px] border-2 border-slate-700 bg-gradient-to-br from-white to-slate-50 shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-200/70">
          <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-[#E0742D]/[0.12]" />
          <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E0742D]/90">À la une</p>
              <h3 className="mt-3 text-xl font-semibold leading-snug tracking-tight text-[#2A2F3A] sm:text-2xl">
                <Link
                  href={featured.href}
                  className="hover:text-[#E0742D] hover:underline decoration-[#E0742D]/60 underline-offset-4"
                >
                  {featured.title}
                </Link>
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#5C5F66] sm:text-[15px]">{featured.excerpt}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-500">{featured.readingTime}</span>
                {featured.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full border border-slate-200/90 bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3 lg:flex-col lg:items-stretch xl:flex-row xl:items-center">
              <Link
                href={featured.href}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#2A2F3A] bg-[#2A2F3A] px-5 py-2.5 text-sm font-semibold text-[#E6D6C3] shadow-sm transition hover:bg-[#353b48]"
              >
                Lire l&apos;article
                <ArrowRight className="h-4 w-4 text-[#E0742D]" aria-hidden />
              </Link>
              <Link
                href="/blog"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200/90 bg-white px-5 py-2.5 text-sm font-semibold text-[#2A2F3A] shadow-sm transition hover:bg-slate-50"
              >
                Tous les articles
              </Link>
            </div>
          </div>
        </article>

        {/* Articles par thématique */}
        <div className="mt-12 sm:mt-14">
          <div className="mb-6 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Valorisation · Reporting · Projections
            </p>
            <span
              className="hidden h-px flex-1 bg-gradient-to-r from-[#E0742D]/35 via-slate-300/50 to-transparent sm:block"
              aria-hidden
            />
          </div>
          <ul className="grid gap-5 sm:grid-cols-3 sm:gap-6" role="list">
            {blogLandingSecondaryPosts.map((post) => (
              <li key={post.href} className="min-w-0">
                <Link
                  href={post.href}
                  className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border-2 border-slate-700 bg-gradient-to-br from-white to-slate-50 px-5 py-5 shadow-sm shadow-slate-900/[0.03] ring-1 ring-slate-200/70 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-slate-900/[0.06] sm:px-6 sm:py-6"
                >
                  <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-[#E0742D]/[0.1]" />
                  {post.tags[0] ? (
                    <span className="relative text-[10px] font-semibold uppercase tracking-[0.14em] text-[#E0742D]/90">
                      {post.tags[0]}
                    </span>
                  ) : null}
                  <span className="relative mt-2 line-clamp-2 text-base font-semibold leading-snug tracking-tight text-[#2A2F3A] group-hover:text-[#E0742D]">
                    {post.title}
                  </span>
                  <span className="relative mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-[#5C5F66]">
                    {post.excerpt}
                  </span>
                  <span className="relative mt-4 flex items-center justify-between gap-2 border-t border-slate-200/80 pt-3 text-xs font-medium text-slate-500">
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
