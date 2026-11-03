"use client"

import Link from "next/link"
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { HeroMarquee } from "@/components/hero-marquee"
import { REPORT_CHAPTERS, RAPPORT_FAQ, RAPPORT_MARQUEE_ITEMS, type ReportChapter } from "@/lib/rapport-livre-content"

function scrollToReport() {
  const report = document.getElementById("sommaire")
  if (!report) return
  const nav = document.querySelector("nav.fixed")
  const offset = nav ? Math.ceil(nav.getBoundingClientRect().height) + 16 : 96
  const top = report.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" })
}

function RapportHero() {
  return (
    <header className="relative overflow-hidden bg-[#222732] text-[#E6D6C3]">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute -right-[6%] -top-[22%] h-[70%] w-[55%] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(230,214,195,0.16) 0%, rgba(230,214,195,0) 68%)",
            filter: "blur(36px)",
          }}
        />
        <div
          className="absolute -left-[18%] top-[46%] h-[34%] w-[140%] -rotate-[14deg]"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(230,214,195,0.16) 28%, rgba(224,116,45,0.38) 62%, transparent 88%)",
            filter: "blur(22px)",
          }}
        />
        <div
          className="absolute -left-[10%] bottom-[-6%] h-[16%] w-[120%] -rotate-[12deg]"
          style={{
            background:
              "linear-gradient(90deg, transparent 8%, rgba(224,116,45,0.42) 46%, rgba(230,214,195,0.22) 68%, transparent 88%)",
            filter: "blur(18px)",
          }}
        />
      </div>
      <div className="relative z-10 mx-auto grid max-w-[1920px] grid-cols-1 items-center gap-10 px-5 pb-16 pt-28 sm:px-10 sm:pb-20 sm:pt-32 lg:min-h-[min(78vh,44rem)] lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:gap-20 lg:px-12 lg:pb-24 lg:pt-36 xl:px-16">
        <div className="max-w-xl lg:max-w-none">
          <p className="text-sm text-[#C9B8A5]/75">Pour les dirigeants de PME</p>
          <h1 className="mt-6 max-w-[20rem] text-[1.85rem] font-medium leading-[1.22] tracking-[-0.02em] text-balance text-[#E6D6C3] sm:max-w-[36rem] sm:text-[2.15rem] lg:max-w-none lg:text-[2.35rem] xl:text-[2.5rem]">
            Pour une lecture claire de la performance, de la trésorerie et de la valeur.
          </h1>
          <div className="mt-7 max-w-xl space-y-3 text-[15px] leading-relaxed text-[#C9B8A5]/82 sm:text-base">
            <p>
              Parcourez un exemple de diagnostic remis à la direction : les résultats, les écarts, les projections et
              les décisions qui en découlent.
            </p>
            <p>
              Chaque chapitre s’ouvre comme une double page. À gauche, une page du rapport. À droite, ce qu’elle
              représente et la discussion qu’on en aurait eue avec les dirigeants.
            </p>
          </div>
          <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link
              href="/#demo"
              className="group inline-flex items-center gap-2 rounded-full border border-[#E6D6C3]/75 px-5 py-2.5 text-sm text-[#E6D6C3] transition hover:border-[#E6D6C3] hover:bg-[#E6D6C3] hover:text-[#222732]"
            >
              <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              Prendre rendez-vous
            </Link>
            <button
              type="button"
              onClick={scrollToReport}
              className="px-1 py-2 text-sm text-[#C9B8A5]/90 transition hover:text-[#E6D6C3]"
            >
              Lire le rapport
            </button>
          </div>
        </div>
        <p
          className="select-none text-center text-[clamp(16rem,34vw,28rem)] font-semibold leading-none tracking-tight text-[#E6D6C3]/35"
          aria-hidden
        >
          m<span className="text-[#E0742D]/70">.</span>
        </p>
      </div>
    </header>
  )
}

function sheetSrc(page: number) {
  return `/images/rapport/pages/page-${String(page).padStart(2, "0")}.jpg`
}

function ChapterBook({ chapter }: { chapter: ReportChapter }) {
  const [index, setIndex] = useState(0)
  const leaf = chapter.leaves[index]
  const count = chapter.leaves.length

  return (
    <section id={chapter.id} className="scroll-mt-32">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold text-[#E0742D]">{chapter.index}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#222732] sm:text-3xl">{chapter.label}</h2>
        </div>
        <p className="shrink-0 font-mono text-[11px] text-slate-500">
          {index + 1} / {count}
        </p>
      </div>

      <div className="flex items-stretch">
        <div className="relative z-0 min-w-0 flex-1">
          <div aria-hidden className="absolute left-1.5 top-1.5 -z-10 h-full w-full rounded-md bg-[#E6D6C3]" />
          <div aria-hidden className="absolute left-3 top-3 -z-20 h-full w-full rounded-md bg-[#C9B8A5]" />
          <div className="relative z-10 grid overflow-hidden rounded-md bg-white shadow-[0_36px_70px_-32px_rgba(34,39,50,0.55)] ring-1 ring-[#2A2F3A]/10 lg:grid-cols-2">
            <div className="flex flex-col border-b border-[#2A2F3A]/10 bg-white lg:border-b-0 lg:border-r lg:border-[#2A2F3A]/10">
              <div key={leaf.page} className="page-turn flex flex-1 flex-col">
                <div className="p-4 sm:p-6">
                  <img
                    src={sheetSrc(leaf.page)}
                    alt={`${leaf.title}, diagnostic financier et planification d’Entreprise Inc.`}
                    className="block h-auto w-full bg-white ring-1 ring-[#2A2F3A]/10"
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#2A2F3A]/10 px-4 py-3 sm:px-6">
                <button
                  type="button"
                  onClick={() => setIndex((current) => Math.max(0, current - 1))}
                  disabled={index === 0}
                  className="inline-flex items-center gap-1 text-sm text-[#222732] transition hover:text-[#E0742D] disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  Précédente
                </button>
                <button
                  type="button"
                  onClick={() => setIndex((current) => Math.min(count - 1, current + 1))}
                  disabled={index === count - 1}
                  className="inline-flex items-center gap-1 text-sm text-[#222732] transition hover:text-[#E0742D] disabled:pointer-events-none disabled:opacity-30"
                >
                  Suivante
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>

            <div
              key={`note-${leaf.page}`}
              className="page-turn flex flex-col bg-[#F4EDE3] px-5 py-6 sm:px-8 sm:py-8 lg:px-10"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, rgba(34,39,50,0.06), transparent 22px), linear-gradient(180deg, rgba(255,255,255,0.55), transparent 72px)",
              }}
              aria-live="polite"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C9B8A5]">Notes de lecture</p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-[#222732]">{leaf.title}</h3>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#3C4048] sm:text-[15px]">{leaf.explanation}</p>
              <div className="mt-6 max-w-xl border-l-2 border-[#E0742D] pl-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E0742D]">
                  En discussion avec la direction
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[#222732] sm:text-[15px]">{leaf.discussion}</p>
              </div>
            </div>
          </div>
        </div>

        <div role="group" className="hidden w-9 flex-col justify-center gap-2 pl-1 lg:flex" aria-label={`Feuillets — ${chapter.label}`}>
          {chapter.leaves.map((item, leafIndex) => (
            <button
              key={item.page}
              type="button"
              aria-current={leafIndex === index ? "page" : undefined}
              aria-label={item.title}
              onClick={() => setIndex(leafIndex)}
              className={`h-16 rounded-r-sm border border-l-0 text-[10px] font-semibold transition ${
                leafIndex === index
                  ? "border-[#E0742D]/40 bg-[#F4EDE3] text-[#E0742D]"
                  : "border-[#2A2F3A]/10 bg-[#E6D6C3] text-[#222732]/50 hover:bg-[#F4EDE3]"
              }`}
            >
              {leafIndex + 1}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

export function RapportAnnuelView() {
  const chapterBarRef = useRef<HTMLElement>(null)
  const bookRef = useRef<HTMLDivElement>(null)
  const skipScroll = useRef(true)
  const [chapterIndex, setChapterIndex] = useState(0)
  const chapter = REPORT_CHAPTERS[chapterIndex]

  useEffect(() => {
    const bar = chapterBarRef.current
    if (!bar) return
    let frame = 0
    let followUntil = 0
    const sync = () => {
      const site = document.querySelector("nav.fixed")
      const offset = Math.max(0, site ? site.getBoundingClientRect().bottom : 0)
      bar.style.top = `${offset}px`
    }
    const track = (now: number) => {
      sync()
      frame = now < followUntil ? requestAnimationFrame(track) : 0
    }
    const onScroll = () => {
      followUntil = performance.now() + 650
      if (!frame) frame = requestAnimationFrame(track)
    }
    sync()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    if (skipScroll.current) {
      skipScroll.current = false
      return
    }
    bookRef.current?.scrollIntoView({ block: "start" })
  }, [chapterIndex])

  return (
    <main className="bg-[#F8FAFC] text-[#222732]">
      <style>{`
        @keyframes pageTurn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: none; }
        }
        .page-turn { animation: pageTurn 320ms ease; }
        @media (prefers-reduced-motion: reduce) {
          .page-turn { animation: none; }
        }
      `}</style>
      <RapportHero />

      <nav
        ref={chapterBarRef}
        aria-label="Sections du rapport"
        className="sticky top-0 z-40 border-b border-[#2A2F3A]/10 bg-[#F8FAFC]/95 px-3 backdrop-blur-md sm:px-5 lg:px-6 xl:px-8"
      >
        <ul className="flex gap-1 overflow-x-auto py-1">
          {REPORT_CHAPTERS.map((item, index) => {
            const selected = index === chapterIndex
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={selected ? "true" : undefined}
                  onClick={() => setChapterIndex(index)}
                  className={`inline-flex items-baseline gap-2 whitespace-nowrap border-b-2 px-2 py-3 text-sm transition ${
                    selected
                      ? "border-[#E0742D] text-[#222732]"
                      : "border-transparent text-slate-500 hover:text-[#222732]"
                  }`}
                >
                  <span className="font-mono text-[11px] text-[#E0742D]">{item.index}</span>
                  {item.label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div ref={bookRef} className="scroll-mt-28 w-full px-3 pt-8 pb-20 sm:px-5 sm:pt-10 sm:pb-28 lg:px-6 lg:pb-36 xl:px-8">
        <ChapterBook key={chapter.id} chapter={chapter} />
      </div>

      <HeroMarquee
        label="Rapport"
        items={RAPPORT_MARQUEE_ITEMS}
        ariaLabel="Rapport — performance, trésorerie et valeur"
        duration="28s"
        tone="light"
      />

      <section id="questions" className="scroll-mt-28 bg-[#F0F4F8] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24 xl:px-16">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Questions fréquentes</p>
          <h2 className="mt-5 text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#2A2F3A] sm:text-[2.2rem]">
            Avant de faire le point
          </h2>
          <Accordion type="single" collapsible className="mt-8">
            {RAPPORT_FAQ.map((item, index) => (
              <AccordionItem key={item.question} value={`rapport-faq-${index}`} className="border-[#2A2F3A]/15">
                <AccordionTrigger className="py-5 text-left text-[15px] font-semibold leading-snug tracking-tight text-[#2A2F3A] hover:no-underline hover:text-[#E0742D] [&[data-state=open]]:text-[#E0742D]">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pb-5 text-[15px] leading-relaxed text-[#5C5F66]">
                  {item.answer.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="border-t border-[#2A2F3A]/10 bg-[#F0F4F8] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24 xl:px-16">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">À votre tour</p>
            <h2 className="mt-5 text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#2A2F3A] sm:text-[2.2rem]">
              Le prochain diagnostic, c’est le vôtre.
            </h2>
            <p className="mt-4 text-[15px] leading-[1.75] text-[#5C5F66]">
              Apportez vos résultats. Nous les lisons avec vous : ce qui porte la performance, ce qui pèse sur la
              trésorerie, et les décisions qui méritent d’être prises.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link
              href="/#demo"
              className="group inline-flex items-center gap-2 rounded-full bg-[#2A2F3A] px-5 py-3 text-sm font-semibold text-[#E6D6C3] transition duration-200 hover:bg-[#E6D6C3] hover:text-[#222732]"
            >
              Discuter de votre projet
              <ArrowRight className="h-4 w-4 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/contact"
              className="px-2 py-3 text-sm font-semibold text-[#2A2F3A] underline decoration-[#E0742D]/70 underline-offset-4 hover:text-[#E0742D]"
            >
              Nous contacter
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
