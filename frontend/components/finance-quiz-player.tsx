"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import {
  getFinanceQuizBand,
  type FinanceQuiz,
} from "@/lib/finance-quizzes"
import { cn } from "@/lib/utils"

export function FinanceQuizPlayer({ quiz }: { quiz: FinanceQuiz }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [finished, setFinished] = useState(false)

  const total = quiz.questions.length
  const question = quiz.questions[step]
  const selected = question ? answers[question.id] : undefined

  function choose(choiceId: string) {
    if (!question) return
    setAnswers((current) => ({ ...current, [question.id]: choiceId }))
  }

  function restart() {
    setAnswers({})
    setStep(0)
    setFinished(false)
  }

  if (finished) {
    const score = quiz.questions.filter((item) => answers[item.id] === item.correctId).length
    const band = getFinanceQuizBand(quiz, score)

    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-slate-200/90 bg-white px-6 py-8 shadow-[0_24px_60px_-40px_rgba(42,47,58,0.45)] sm:px-10 sm:py-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E0742D]">Votre score</p>
          <p className="mt-4 font-semibold tracking-tight text-[#2A2F3A]">
            <span data-testid="quiz-score" className="sr-only">
              {score} sur {total}
            </span>
            <span className="text-5xl sm:text-6xl" aria-hidden>
              {score}
            </span>
            <span className="ml-2 text-2xl text-slate-400 sm:text-3xl" aria-hidden>
              / {total}
            </span>
          </p>
          <h2 className="mt-6 text-2xl font-semibold tracking-tight text-[#2A2F3A] sm:text-3xl">{band.title}</h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-[#5C5F66] sm:text-base">{band.body}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#2A2F3A] px-5 py-3 text-xs font-semibold tracking-[0.08em] text-[#E6D6C3] transition hover:bg-[#353b48]"
            >
              DISCUTER DE VOTRE LECTURE
              <ArrowRight className="h-4 w-4 text-[#E0742D]" />
            </Link>
            <button
              type="button"
              onClick={restart}
              className="inline-flex items-center justify-center px-3 py-3 text-xs font-semibold tracking-[0.08em] text-[#5C5F66] transition hover:text-[#2A2F3A]"
            >
              RECOMMENCER
            </button>
          </div>
        </div>

        <ol className="mt-8 space-y-4">
          {quiz.questions.map((item, index) => {
            const picked = item.choices.find((choice) => choice.id === answers[item.id])
            const correct = item.choices.find((choice) => choice.id === item.correctId)
            const isRight = answers[item.id] === item.correctId
            return (
              <li key={item.id} className="rounded-xl border border-slate-200/90 bg-white px-5 py-5 sm:px-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Question {index + 1}
                  <span className={cn("ml-3", isRight ? "text-emerald-700" : "text-[#E0742D]")}>
                    {isRight ? "Juste" : "À revoir"}
                  </span>
                </p>
                <p className="mt-2 font-medium text-[#2A2F3A]">{item.prompt}</p>
                <p className="mt-3 text-sm leading-relaxed text-[#5C5F66]">
                  Votre réponse : {picked?.label ?? "—"}
                </p>
                {!isRight && correct ? (
                  <p className="mt-1 text-sm leading-relaxed text-[#5C5F66]">Lecture retenue : {correct.label}</p>
                ) : null}
                <p className="mt-3 text-sm leading-relaxed text-[#5C5F66]">{item.explanation}</p>
              </li>
            )
          })}
        </ol>
      </div>
    )
  }

  if (!question) return null

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Question {step + 1} sur {total}
        </p>
        <p className="text-[11px] font-medium text-slate-400">{quiz.duration}</p>
      </div>
      <div className="mb-8 h-1 rounded-full bg-slate-200">
        <div
          className="h-1 rounded-full bg-[#E0742D] transition-[width]"
          style={{ width: `${((step + (selected ? 1 : 0)) / total) * 100}%` }}
        />
      </div>

      <h2 id={`quiz-question-${question.id}`} className="text-2xl font-semibold tracking-tight text-[#2A2F3A] sm:text-3xl">
        {question.prompt}
      </h2>

      <div
        role="radiogroup"
        aria-labelledby={`quiz-question-${question.id}`}
        className="mt-8 space-y-3"
      >
        {question.choices.map((choice) => {
          const isSelected = selected === choice.id
          return (
            <button
              key={choice.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => choose(choice.id)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border px-4 py-4 text-left text-[15px] leading-relaxed transition sm:px-5",
                isSelected
                  ? "border-[#E0742D] bg-[#E0742D]/[0.06] text-[#2A2F3A]"
                  : "border-slate-200 bg-white text-[#5C5F66] hover:border-slate-300 hover:text-[#2A2F3A]",
              )}
            >
              <span
                className={cn(
                  "mt-1 h-3.5 w-3.5 shrink-0 rounded-full border",
                  isSelected ? "border-[#E0742D] bg-[#E0742D]" : "border-slate-300 bg-white",
                )}
                aria-hidden
              />
              <span>{choice.label}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          disabled={step === 0}
          className="inline-flex items-center gap-2 px-1 py-3 text-xs font-semibold tracking-[0.08em] text-[#5C5F66] transition hover:text-[#2A2F3A] disabled:pointer-events-none disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
          RETOUR
        </button>
        <button
          type="button"
          disabled={!selected}
          onClick={() => {
            if (step === total - 1) {
              setFinished(true)
              return
            }
            setStep((current) => current + 1)
          }}
          className="inline-flex items-center gap-2 rounded-md bg-[#2A2F3A] px-5 py-3 text-xs font-semibold tracking-[0.08em] text-[#E6D6C3] transition hover:bg-[#353b48] disabled:pointer-events-none disabled:opacity-40"
        >
          {step === total - 1 ? "VOIR MON SCORE" : "SUIVANT"}
          <ArrowRight className="h-4 w-4 text-[#E0742D]" />
        </button>
      </div>
    </div>
  )
}
