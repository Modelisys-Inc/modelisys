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
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute -right-[6%] -top-[22%] h-[70%] w-[55%] rounded-full"
            aria-hidden
            style={{
              background: "radial-gradient(circle, rgba(230,214,195,0.16) 0%, rgba(230,214,195,0) 68%)",
              filter: "blur(36px)",
            }}
          />
          <div
            className="absolute -left-[18%] top-[46%] h-[34%] w-[140%] -rotate-[14deg]"
            aria-hidden
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(230,214,195,0.16) 28%, rgba(224,116,45,0.38) 62%, transparent 88%)",
              filter: "blur(22px)",
            }}
          />
          <div
            className="absolute -left-[10%] bottom-[-6%] h-[16%] w-[120%] -rotate-[12deg]"
            aria-hidden
            style={{
              background:
                "linear-gradient(90deg, transparent 8%, rgba(224,116,45,0.42) 46%, rgba(230,214,195,0.22) 68%, transparent 88%)",
              filter: "blur(18px)",
            }}
          />
        </div>
        <div className="relative z-10 mx-auto max-w-[1920px] px-5 py-16 sm:px-10 sm:py-24 lg:px-12 lg:py-28 xl:px-16">
          <Link
            href="/ressources"
            className="inline-flex items-center gap-2 text-sm text-[#C9B8A5]/90 transition hover:text-[#E6D6C3]"
          >
            <ArrowLeft className="h-4 w-4" />
            Quiz
          </Link>
          <h1 className="mt-6 max-w-[20rem] text-[1.85rem] font-medium leading-[1.22] tracking-[-0.02em] text-balance text-[#E6D6C3] sm:max-w-[36rem] sm:text-[2.15rem] lg:max-w-3xl lg:text-[2.35rem] xl:text-[2.5rem]">
            {quiz.title}
          </h1>
          <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-[#C9B8A5]/82 sm:text-base">
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
