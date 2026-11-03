"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
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
    "inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors"

  return (
    <div className="relative mx-auto max-w-[1920px] px-8 sm:px-12 lg:px-16 xl:px-20">
      <div className="mb-8 sm:mb-10">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Articles</p>
          <h2 className="mt-5 text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#2A2F3A] sm:text-[2.2rem]">
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
                ? "border-[#2A2F3A] text-[#2A2F3A]"
                : "border-[#2A2F3A]/15 text-[#5C5F66] hover:border-[#2A2F3A]/40 hover:text-[#2A2F3A]"
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
                  ? "border-[#2A2F3A] text-[#2A2F3A]"
                  : "border-[#2A2F3A]/15 text-[#5C5F66] hover:border-[#2A2F3A]/40 hover:text-[#2A2F3A]"
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
          <article key={p.href} className="flex h-full flex-col border-t border-[#2A2F3A]/15 pt-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold">{p.dateLabel}</span>
              <span aria-hidden className="text-slate-300">
                •
              </span>
              <span>{p.readingTime}</span>
            </div>

            <h3 className="mt-3 text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl">
              <Link href={p.href} className="hover:text-[#E0742D]">
                {p.title}
              </Link>
            </h3>

            <p className="mt-3 text-[15px] leading-relaxed text-[#5C5F66]">{p.excerpt}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {p.tags.map((t) => (
                <span
                  key={`${p.href}:${t}`}
                  className="inline-flex items-center rounded-full border border-[#2A2F3A]/15 px-3 py-1 text-xs text-[#5C5F66]"
                >
                  {t}
                </span>
              ))}
            </div>

            <Link
              href={p.href}
              className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#2A2F3A] transition hover:text-[#E0742D]"
            >
              Lire l’article
              <ArrowRight className="h-4 w-4 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
            </Link>
          </article>
        ))}
      </div>
    </div>
  )
}

