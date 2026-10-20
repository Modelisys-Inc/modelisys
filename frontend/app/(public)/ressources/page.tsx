import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { Footer } from "@/components/footer"
import { getFinanceQuizzesByFamily } from "@/lib/finance-quizzes"

export const metadata: Metadata = {
  title: "Tester vos connaissances en finance corporative | Modelisys",
  description:
    "Quiz interactifs pour les dirigeants de PME : situez votre lecture de la valeur, puis découvrez votre score.",
}

export default function RessourcesPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100">
      <GlassmorphismNav />

      <div className="relative z-10">
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
              Tester vos connaissances en{" "}
              <span className="text-[#C9B8A5]/95">finance corporative</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#C9B8A5]/80 sm:text-lg">
              De courts quiz pour les dirigeants. Répondez, puis découvrez votre score — une lecture de votre
              situation, pas un examen.
            </p>
            <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/80 via-white/15 to-transparent" />
          </div>
        </section>

        <section aria-hidden className="relative h-20 overflow-hidden bg-[#1F2430] sm:h-24">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-12 left-1/3 h-72 w-72 rounded-full bg-[#E6D6C3]/10 blur-3xl" />
          </div>
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-full w-full">
            <path
              d="M0,30 C180,95 360,95 540,60 C720,25 900,25 1080,60 C1230,90 1335,95 1440,75 L1440,120 L0,120 Z"
              fill="#f1f5f9"
            />
          </svg>
        </section>

      <main className="relative z-10 bg-slate-100">
        <div className="mx-auto max-w-[1920px] space-y-16 px-8 py-14 sm:px-12 sm:py-18 lg:px-16 xl:px-20">
        {getFinanceQuizzesByFamily().map((family) => (
          <section key={family.id} aria-labelledby={`famille-${family.id}`}>
            <div className="mb-8 max-w-2xl">
              <h2
                id={`famille-${family.id}`}
                className="text-2xl font-semibold tracking-tight text-[#2A2F3A] sm:text-3xl"
              >
                {family.title}
              </h2>
              {family.description ? (
                <p className="mt-3 text-[15px] leading-[1.75] text-[#5C5F66]">{family.description}</p>
              ) : null}
            </div>
            <ul className="grid max-w-5xl gap-6 lg:max-w-none lg:grid-cols-2">
              {family.quizzes.map((quiz) => (
                <li key={quiz.slug}>
                  <article className="h-full rounded-2xl border border-slate-200/90 bg-white px-6 py-7 sm:px-8 sm:py-8">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {quiz.questions.length} questions · {quiz.duration}
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#2A2F3A]">{quiz.title}</h3>
                    <p className="mt-3 max-w-2xl text-[15px] leading-[1.75] text-[#5C5F66]">{quiz.description}</p>
                    <Link
                      href={`/ressources/${quiz.slug}`}
                      className="mt-6 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-[#2A2F3A] transition hover:text-[#E0742D]"
                    >
                      COMMENCER
                      <ArrowRight className="h-4 w-4 text-[#E0742D]" />
                    </Link>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        ))}
        </div>
      </main>
      </div>

      <Footer />
    </div>
  )
}
