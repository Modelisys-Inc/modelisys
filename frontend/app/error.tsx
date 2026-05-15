"use client"

import Link from "next/link"
import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error)
    }
  }, [error])

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100/90">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-100 via-slate-50/95 to-slate-100" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(224,116,45,0.08),transparent_55%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-24 text-center">
        <p className="text-sm font-semibold tracking-[0.18em] text-[#E0742D]">ERREUR INATTENDUE</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#2A2F3A] sm:text-5xl md:text-6xl">
          Une erreur est survenue
        </h1>
        <p className="mt-6 max-w-xl text-[15px] leading-[1.78] text-[#5C5F66] sm:text-base">
          Nous n’avons pas pu charger cette page. Vous pouvez réessayer ou revenir à l’accueil.
          {error.digest ? (
            <span className="mt-3 block text-xs text-slate-400">Référence : {error.digest}</span>
          ) : null}
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full bg-[#2A2F3A] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f232c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2A2F3A]/40"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="rounded-full border border-slate-300/80 bg-white/80 px-6 py-3 text-sm font-semibold text-[#2A2F3A] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2A2F3A]/30"
          >
            Retour à l’accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
