import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { Footer } from "@/components/footer"
import { FinanceQuizPlayer } from "@/components/finance-quiz-player"
import { FINANCE_QUIZZES, getFinanceQuiz } from "@/lib/finance-quizzes"

type PageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return FINANCE_QUIZZES.map((quiz) => ({ slug: quiz.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const quiz = getFinanceQuiz(slug)
  if (!quiz) return { title: "Quiz | Modelisys" }
  return {
    title: `${quiz.title} | Modelisys`,
    description: quiz.description,
  }
}

export default async function FinanceQuizPage({ params }: PageProps) {
  const { slug } = await params
  const quiz = getFinanceQuiz(slug)
  if (!quiz) notFound()

  return (
    <div className="relative min-h-screen bg-[#F8FAFC]">
      <GlassmorphismNav />

      <section className="relative overflow-hidden bg-[#222732]">
        <div className="relative z-10 mx-auto max-w-[1920px] px-5 pb-12 pt-28 sm:px-10 sm:pb-14 sm:pt-32 lg:px-16 xl:px-20">
          <Link
            href="/ressources"
            className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C9B8A5]/80 transition hover:text-[#E6D6C3]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Ressources
          </Link>
          <h1 className="mt-6 max-w-3xl text-3xl font-semibold tracking-tight text-[#E6D6C3] sm:text-4xl">
            {quiz.title}
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-[#C9B8A5]/78 sm:text-base">
            {quiz.description}
          </p>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-[1920px] px-5 py-12 sm:px-10 sm:py-16 lg:px-16 xl:px-20">
        <FinanceQuizPlayer quiz={quiz} />
      </main>

      <Footer />
    </div>
  )
}
