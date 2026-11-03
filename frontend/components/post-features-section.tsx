"use client"

import { ArrowRight } from "lucide-react"

const QUOTE =
  "« Modelisys accompagne les propriétaires de PME dans l'optimisation de leur performance, de leur rendement et de la valeur de leur entreprise grâce à une approche intégrée de gestion de la performance et de création de valeur. »"

export function PostFeaturesSection() {
  return (
    <section id="features" className="relative isolate scroll-mt-24 overflow-hidden bg-[#222732]">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute -right-[8%] -top-[25%] h-[75%] w-[48%] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(230,214,195,0.14) 0%, rgba(230,214,195,0) 68%)",
            filter: "blur(36px)",
          }}
        />
        <div
          className="absolute -left-[12%] bottom-[8%] h-[22%] w-[130%] -rotate-[12deg]"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(230,214,195,0.12) 32%, rgba(224,116,45,0.28) 66%, transparent 90%)",
            filter: "blur(20px)",
          }}
        />
      </div>

      <span
        aria-hidden
        className="pointer-events-none absolute right-[3%] top-1/2 hidden -translate-y-1/2 select-none text-[clamp(12rem,18vw,20rem)] font-semibold leading-none tracking-tight text-[#E6D6C3]/12 xl:block"
      >
        m<span className="text-[#E0742D]/65">.</span>
      </span>

      <div className="relative z-10 mx-auto max-w-[1920px] px-5 py-20 sm:px-10 sm:py-24 lg:px-16 lg:py-28 xl:px-20">
        <div className="max-w-3xl">
          <p className="text-sm text-[#C9B8A5]/75">Valeur</p>
          <h2 className="mt-5 text-3xl font-medium leading-[1.18] tracking-[-0.02em] text-balance text-[#E6D6C3] sm:text-4xl lg:text-[2.65rem]">
            Comprenez ce qui impacte la{" "}
            <span className="text-[#C9B8A5]">valeur de votre entreprise</span>.
          </h2>
          <p className="mt-6 text-sm text-[#C9B8A5]/82 sm:text-base">
            Comprendre <span className="text-[#E0742D]">→</span> Planifier{" "}
            <span className="text-[#E0742D]">→</span> Exécuter
          </p>
        </div>

        <div className="mt-12 max-w-3xl border-t border-[#E6D6C3]/15 pt-8 lg:mt-16">
          <span className="block h-px w-10 bg-[#E0742D]" aria-hidden />
          <blockquote className="mt-5 text-base leading-relaxed text-[#E6D6C3]/90 sm:text-lg sm:leading-[1.6]">
            {QUOTE}
          </blockquote>
          <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[#E6D6C3]">Tristan Bellerose, CPA, CBV</p>
              <p className="mt-1 text-sm text-[#C9B8A5]/70">Président et fondateur</p>
            </div>
            <button
              type="button"
              onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
              className="group inline-flex w-fit items-center gap-2 rounded-full border border-[#E6D6C3]/75 px-4 py-2 text-sm text-[#E6D6C3] transition hover:border-[#E6D6C3] hover:bg-[#E6D6C3] hover:text-[#222732]"
            >
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              Échanger sur votre cas
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
