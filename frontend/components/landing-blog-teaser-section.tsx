"use client"

import Link from "next/link"
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { blogPosts, type BlogPostCard } from "@/lib/blog-posts"
import { cn } from "@/lib/utils"

const COVER_TONES = [
  "from-[#2A2F3A] via-[#3A4252] to-[#E0742D]/70",
  "from-[#1F2430] via-[#4A5568] to-[#E6B08C]/60",
  "from-[#2A2F3A] via-[#5B8DEF]/40 to-[#C9B8A5]/50",
  "from-[#222732] via-[#4A9B73]/35 to-[#E6D6C3]/45",
  "from-[#2A2F3A] via-[#9A4A1A]/50 to-[#E0742D]/55",
] as const

function BlogCardCover({ post, index }: { post: BlogPostCard; index: number }) {
  const tone = COVER_TONES[index % COVER_TONES.length]
  return (
    <div
      className={cn(
        "relative aspect-[16/10] overflow-hidden bg-gradient-to-br",
        tone,
      )}
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgb(255 255 255 / 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgb(255 255 255 / 0.06) 1px, transparent 1px)
          `,
          backgroundSize: "28px 28px",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
      {post.tags[0] ? (
        <span className="absolute bottom-3 left-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#E6D6C3]/90">
          {post.tags[0]}
        </span>
      ) : null}
    </div>
  )
}

export function LandingBlogTeaserSection() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(true)

  const updateArrows = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setCanPrev(el.scrollLeft > 8)
    setCanNext(el.scrollLeft < max - 8)
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    updateArrows()
    el.addEventListener("scroll", updateArrows, { passive: true })
    const ro = new ResizeObserver(updateArrows)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", updateArrows)
      ro.disconnect()
    }
  }, [updateArrows])

  const scrollByCard = (dir: -1 | 1) => {
    const el = trackRef.current
    if (!el) return
    const card = el.querySelector<HTMLElement>("[data-blog-card]")
    const step = card ? card.offsetWidth + 20 : el.clientWidth * 0.7
    el.scrollBy({ left: dir * step, behavior: "smooth" })
  }

  return (
    <section
      id="blog-vedette"
      aria-labelledby="landing-blog-teaser-heading"
      className="relative z-10 scroll-mt-24 overflow-hidden bg-[#F8FAFC]"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0 opacity-45"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(42 47 58 / 0.04) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(42 47 58 / 0.04) 1px, transparent 1px)
            `,
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 70% 60% at 75% 40%, black 15%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 60% at 75% 40%, black 15%, transparent 75%)",
          }}
        />
        <div className="absolute -top-20 left-[-5%] h-72 w-72 rounded-full bg-[#E0742D]/[0.04] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-5 py-16 sm:px-10 sm:py-20 lg:px-12 lg:py-24 xl:px-16 2xl:px-20">
        <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.55fr)] lg:gap-12 xl:gap-16">
          {/* Colonne gauche — éditorial + CTA + flèches */}
          <div className="flex flex-col justify-between lg:min-h-[28rem] xl:min-h-[30rem]">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
                Blog
              </p>
              <h2
                id="landing-blog-teaser-heading"
                className="mt-6 max-w-md text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#2A2F3A] sm:mt-7 sm:text-[2.25rem] sm:leading-[1.12]"
              >
                Les conseils Modelisys
              </h2>
              <p className="mt-5 max-w-md text-[15px] leading-[1.75] text-slate-600 sm:text-base">
                Articles pour approfondir la valorisation, le reporting et les projections — et
                relier vos chiffres à la trajectoire de valeur.
              </p>

              <div className="mt-8 flex flex-col items-start gap-3">
                <Link
                  href="/blog"
                  className="group inline-flex items-center gap-2 rounded-md bg-[#E6D6C3] px-4 py-2.5 text-xs font-semibold tracking-[0.06em] text-[#1F2430] transition hover:bg-[#f0e6d8]"
                >
                  Voir les articles
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/#demo"
                  className="group inline-flex items-center gap-2 px-1 py-2 text-xs font-semibold tracking-[0.06em] text-slate-600 transition hover:text-[#2A2F3A]"
                >
                  Prendre rendez-vous
                  <span className="inline-block h-px w-8 bg-[#E0742D]/80" />
                </Link>
              </div>
            </div>

            <div className="mt-10 flex items-center gap-2 lg:mt-12">
              <button
                type="button"
                onClick={() => scrollByCard(-1)}
                disabled={!canPrev}
                aria-label="Articles précédents"
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full border transition",
                  canPrev
                    ? "border-[#2A2F3A] bg-[#2A2F3A] text-[#E6D6C3] hover:bg-[#353b48]"
                    : "cursor-not-allowed border-slate-200 bg-white text-slate-300",
                )}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => scrollByCard(1)}
                disabled={!canNext}
                aria-label="Articles suivants"
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full border transition",
                  canNext
                    ? "border-[#2A2F3A] bg-[#2A2F3A] text-[#E6D6C3] hover:bg-[#353b48]"
                    : "cursor-not-allowed border-slate-200 bg-white text-slate-300",
                )}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Carrousel */}
          <div className="min-w-0">
            <div
              ref={trackRef}
              className="flex gap-5 overflow-x-auto pb-2 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label="Articles du blog"
            >
              {blogPosts.map((post, index) => (
                <article
                  key={post.href}
                  data-blog-card
                  className="flex w-[min(100%,18.5rem)] shrink-0 flex-col overflow-hidden border border-[#2A2F3A]/10 bg-white sm:w-[20rem]"
                >
                  <Link href={post.href} className="group flex h-full flex-col">
                    <BlogCardCover post={post} index={index} />
                    <div className="flex flex-1 flex-col px-4 py-4 sm:px-5 sm:py-5">
                      <p className="text-[11px] text-slate-500">{post.dateLabel}</p>
                      <h3 className="mt-2 line-clamp-3 text-[15px] font-semibold leading-snug tracking-tight text-[#2A2F3A] transition group-hover:text-[#9A4A1A] sm:text-base">
                        {post.title}
                      </h3>
                      <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-xs font-semibold tracking-wide text-[#E0742D]">
                        Lire cet article
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
