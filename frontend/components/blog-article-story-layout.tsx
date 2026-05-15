import type { ReactNode } from "react"
import Link from "next/link"
import { Info } from "lucide-react"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { Footer } from "@/components/footer"
import { cn } from "@/lib/utils"

function BlogArticleBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-100 via-slate-50/95 to-slate-100" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(224,116,45,0.06),transparent_55%)]" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
                linear-gradient(to right, rgb(148 163 184 / 0.12) 1px, transparent 1px),
                linear-gradient(to bottom, rgb(148 163 184 / 0.12) 1px, transparent 1px)
              `,
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 20%, black 12%, transparent 65%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 20%, black 12%, transparent 65%)",
        }}
      />
    </div>
  )
}

export function BlogArticlePageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100/90">
      <BlogArticleBackground />
      <GlassmorphismNav />
      <main className="relative z-10 pb-16 pt-24 sm:pb-24">{children}</main>
      <Footer />
    </div>
  )
}

export function BlogArticleContainer({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-14 xl:px-20 2xl:px-24">{children}</div>
  )
}

export function BlogArticleIntro({
  backHref = "/blog",
  category,
  title,
  titleAccent,
  date,
  datePublished,
  description,
  slug,
  readTime,
  lead,
}: {
  backHref?: string
  category: string
  title: string
  titleAccent?: string
  date: string
  /** ISO 8601 date for JSON-LD (e.g. "2026-01-29"). Required to emit BlogPosting structured data. */
  datePublished?: string
  /** Used in BlogPosting JSON-LD description field. */
  description?: string
  /** Blog post slug (e.g. "importance-reporting-financier"). */
  slug?: string
  readTime: string
  lead: ReactNode
}) {
  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://modelisys.com"
  const fullTitle = titleAccent ? `${title} ${titleAccent}` : title
  const blogPostingJsonLd = datePublished
    ? {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: fullTitle,
        ...(description ? { description } : {}),
        datePublished,
        dateModified: datePublished,
        author: { "@type": "Organization", name: "Modelisys", url: SITE_URL },
        publisher: {
          "@type": "Organization",
          name: "Modelisys",
          logo: {
            "@type": "ImageObject",
            url: `${SITE_URL}/images/modelisys-logo-noir.svg`,
          },
        },
        ...(slug
          ? {
              mainEntityOfPage: {
                "@type": "WebPage",
                "@id": `${SITE_URL}/blog/${slug}`,
              },
              url: `${SITE_URL}/blog/${slug}`,
            }
          : {}),
        inLanguage: "fr-CA",
      }
    : null

  return (
    <section
      className="relative z-10 border-t border-slate-200/80 bg-transparent py-12 sm:py-16 lg:py-20"
      aria-labelledby="blog-article-title"
    >
      {blogPostingJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingJsonLd) }}
        />
      ) : null}
      <div className="mx-auto mb-10 max-w-3xl text-center lg:mx-0 lg:max-w-2xl lg:text-left sm:mb-12">
        <Link
          href={backHref}
          className="text-sm font-semibold text-[#E0742D] transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/40"
        >
          ← Retour au Blog
        </Link>
        <p className="mb-3 mt-6 text-sm font-semibold tracking-wide text-slate-500">{category}</p>
        <h1
          id="blog-article-title"
          className="text-3xl font-semibold tracking-tight text-[#2A2F3A] sm:text-4xl md:text-5xl md:leading-tight"
        >
          {title}
          {titleAccent ? (
            <>
              {" "}
              <span className="text-[#5C5F66]">{titleAccent}</span>
            </>
          ) : null}
        </h1>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 lg:justify-start">
          <span className="font-semibold">{date}</span>
          <span aria-hidden className="text-slate-300">
            •
          </span>
          <span>{readTime}</span>
        </div>
        <div className="mt-6 max-w-3xl space-y-5 text-[15px] leading-[1.78] text-[#5C5F66] sm:text-base sm:leading-[1.78]">
          {typeof lead === "string" ? <p>{lead}</p> : lead}
        </div>
        <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-slate-300/50 to-transparent lg:mx-0 mx-auto" />
      </div>
    </section>
  )
}

export function BlogStepRail({ n }: { n: string }) {
  return (
    <div className="flex flex-col gap-1 sm:pt-0.5">
      <span className="font-mono text-4xl font-bold leading-none tabular-nums text-[#E0742D]/25 sm:text-5xl">{n}</span>
    </div>
  )
}

export function BlogStorySectionHeader({
  id,
  eyebrow,
  title,
}: {
  id?: string
  eyebrow?: string
  title: ReactNode
}) {
  if (eyebrow) {
    return (
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p>
          <span className="h-px flex-1 bg-gradient-to-r from-[#E0742D]/35 via-slate-300/50 to-transparent" aria-hidden />
        </div>
        <h2
          id={id}
          className="mt-4 scroll-mt-32 text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl md:text-[1.75rem] md:leading-tight"
        >
          {title}
        </h2>
      </div>
    )
  }
  return (
    <h2
      id={id}
      className="mb-6 scroll-mt-32 text-xl font-semibold tracking-tight text-[#2A2F3A] sm:mb-8 sm:text-2xl md:text-[1.75rem] md:leading-tight"
    >
      {title}
    </h2>
  )
}

export function BlogStoryParagraph({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[15px] leading-[1.78] text-[#5C5F66] sm:text-base sm:leading-[1.78]", className)}>{children}</p>
}

export function BlogStoryBulletList({ items, className }: { items: Array<ReactNode>; className?: string }) {
  return (
    <ul className={cn("mt-5 space-y-2.5 border-t border-slate-200/80 pt-5 sm:mt-6 sm:space-y-3 sm:pt-6", className)}>
      {items.map((line, idx) => (
        <li key={idx} className="flex gap-3 text-[14px] leading-[1.68] text-[#5C5F66] sm:text-[15px] sm:leading-[1.72]">
          <span className="mt-[0.5rem] h-px w-3 shrink-0 bg-slate-300" aria-hidden />
          <span className="min-w-0">{line}</span>
        </li>
      ))}
    </ul>
  )
}

export function BlogArticleStepList({ children }: { children: ReactNode }) {
  return (
    <ol className="mx-auto max-w-4xl space-y-0 border-t border-slate-200/90 transition-all duration-1000 lg:max-w-none">
      {children}
    </ol>
  )
}

export function BlogArticleStep({
  id,
  step,
  children,
  isLast = false,
}: {
  id: string
  step: number
  children: ReactNode
  isLast?: boolean
}) {
  const n = String(step).padStart(2, "0")
  return (
    <li
      id={id}
      className={cn(
        "grid scroll-mt-32 gap-6 py-8 sm:grid-cols-[auto_1fr] sm:gap-10 sm:py-10",
        !isLast && "border-b border-slate-200/80",
      )}
    >
      <BlogStepRail n={n} />
      <div className="min-w-0">{children}</div>
    </li>
  )
}

/** Bloc d’accent (ex. statistique régionale) — plat, comme le langage « Notre histoire ». */
export function BlogStoryHighlightBlock({
  id,
  eyebrow,
  title,
  children,
  tone = "amber",
}: {
  id?: string
  eyebrow?: string
  title: ReactNode
  children: ReactNode
  tone?: "amber" | "neutral"
}) {
  return (
    <div
      className={cn(
        "border-l-2 pl-6 md:pl-8",
        tone === "amber" ? "border-amber-400/55 bg-amber-50/35 py-5 pr-4 sm:py-6 sm:pr-6" : "border-[#E0742D]/45 py-2",
      )}
    >
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{eyebrow}</p>
      ) : null}
      <h2
        id={id}
        className={cn(
          "scroll-mt-32 text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl md:text-[1.75rem] md:leading-tight",
          eyebrow ? "mt-3" : undefined,
        )}
      >
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </div>
  )
}

/** Conclusion / « En bref » — même motif que la fin du récit sur À propos. */
export function BlogStoryClosingBlock({ kicker, children }: { kicker: string; children: ReactNode }) {
  return (
    <div className="border-t border-slate-200/90 pt-8 sm:pt-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E0742D]">{kicker}</p>
      <div className="mt-6 max-w-3xl space-y-5 text-[15px] leading-[1.82] text-[#5C5F66] sm:text-[17px] sm:leading-[1.82]">
        {children}
      </div>
    </div>
  )
}

/** Même motif que la section « Mise en place » (icône Info + infobulle). */
export function StatSourceInfoBubble({ ariaLabel, children }: { ariaLabel: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex shrink-0">
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#E0742D]/25 bg-white/80 text-[#E0742D] shadow-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/40"
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
      >
        <Info className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      </span>
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-[min(100vw-2rem,18rem)] -translate-x-1/2 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-[11px] font-medium leading-relaxed text-slate-700 shadow-lg opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
        {children}
      </span>
    </span>
  )
}
