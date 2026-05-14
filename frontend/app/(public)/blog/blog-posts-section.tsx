"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import type { BlogPostCard } from "@/lib/blog-posts"

export type { BlogPostCard }

function normalizeTag(t: string) {
  return t.trim()
}

export function BlogPostsSection({ posts }: { posts: BlogPostCard[] }) {
  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const p of posts) for (const t of p.tags) set.add(normalizeTag(t))
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"))
  }, [posts])

  const [activeTag, setActiveTag] = useState<string>("__all__")

  const filteredPosts = useMemo(() => {
    if (activeTag === "__all__") return posts
    return posts.filter((p) => p.tags.map(normalizeTag).includes(activeTag))
  }, [posts, activeTag])

  const tagChipBase =
    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition-colors"

  return (
    <div className="relative mx-auto max-w-[1920px] px-8 sm:px-12 lg:px-16 xl:px-20">
      <div className="mb-8 sm:mb-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold tracking-wide text-slate-500">Articles</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-[#2A2F3A]">
            À lire pour structurer vos analyses
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[#5C5F66]">
            Filtrez par thème pour trouver rapidement ce qui s’applique à votre contexte.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            {filteredPosts.length} article{filteredPosts.length > 1 ? "s" : ""} affiché
            {filteredPosts.length > 1 ? "s" : ""} sur {posts.length}.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTag("__all__")}
            className={`${tagChipBase} ${
              activeTag === "__all__"
                ? "border-slate-300/90 bg-white text-[#2A2F3A]"
                : "border-transparent bg-white/60 text-slate-600 hover:bg-white/80"
            }`}
            aria-pressed={activeTag === "__all__"}
          >
            Tous
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTag(t)}
              className={`${tagChipBase} ${
                activeTag === t
                  ? "border-slate-300/90 bg-white text-[#2A2F3A]"
                  : "border-transparent bg-white/60 text-slate-600 hover:bg-white/80"
              }`}
              aria-pressed={activeTag === t}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {filteredPosts.map((p) => (
          <article
            key={p.href}
            className="relative flex h-full flex-col overflow-hidden rounded-[28px] border-2 border-slate-700 bg-gradient-to-br from-white to-slate-50 shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-200/70 transition-all duration-500 ease-out hover:shadow-xl hover:shadow-slate-900/[0.07] hover:scale-[1.01]"
          >
            <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-[#E0742D]/[0.12]" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.03]">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, rgb(42 47 58) 1px, transparent 0)`,
                  backgroundSize: "24px 24px",
                }}
              />
            </div>

            <div className="relative flex flex-1 flex-col p-7 sm:p-9">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold">{p.dateLabel}</span>
                <span aria-hidden className="text-slate-300">
                  •
                </span>
                <span>{p.readingTime}</span>
              </div>

              <h3 className="mt-3 text-xl sm:text-2xl font-semibold tracking-tight text-[#2A2F3A]">
                <Link href={p.href} className="hover:underline decoration-[#E0742D]/70 underline-offset-4">
                  {p.title}
                </Link>
              </h3>

              <p className="mt-3 text-[15px] leading-relaxed text-[#5C5F66]">{p.excerpt}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                {p.tags.map((t) => (
                  <span
                    key={`${p.href}:${t}`}
                    className="inline-flex items-center rounded-full border border-slate-200/90 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm"
                  >
                    {t}
                  </span>
                ))}
                <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2A2F3A] ring-1 ring-slate-200/90">
                  Modelisys
                </span>
              </div>

              <div className="mt-6">
                <Link
                  href={p.href}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#E0742D] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#c96526]"
                >
                  Lire l’article
                  <span aria-hidden className="text-white/90">
                    →
                  </span>
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

