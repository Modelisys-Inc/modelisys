import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Page introuvable",
  description: "La page que vous cherchez n’existe pas ou a été déplacée.",
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100/90">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-100 via-slate-50/95 to-slate-100" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(224,116,45,0.08),transparent_55%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-24 text-center">
        <p className="text-sm font-semibold tracking-[0.18em] text-[#E0742D]">ERREUR 404</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#2A2F3A] sm:text-5xl md:text-6xl">
          Page introuvable
        </h1>
        <p className="mt-6 max-w-xl text-[15px] leading-[1.78] text-[#5C5F66] sm:text-base">
          La page que vous cherchez n’existe pas, a été déplacée, ou n’est pas accessible.
          Vous pouvez revenir à l’accueil ou explorer nos pages publiques.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-[#2A2F3A] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f232c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2A2F3A]/40"
          >
            Retour à l’accueil
          </Link>
          <Link
            href="/contact"
            className="rounded-full border border-slate-300/80 bg-white/80 px-6 py-3 text-sm font-semibold text-[#2A2F3A] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2A2F3A]/30"
          >
            Nous contacter
          </Link>
        </div>
      </div>
    </div>
  )
}
