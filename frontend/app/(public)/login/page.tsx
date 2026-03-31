"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight, LogIn } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await login(email, password)
      router.push("/mon-portail")
    } catch {
      setError("Email ou mot de passe incorrect")
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center overflow-hidden">
      {/* Fond identique au hero : split + séparateur + halos */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
          <div className="bg-[#2A2F3A]" />
          <div className="bg-[#1F2430]" />
        </div>
        <div className="absolute inset-y-0 left-1/2 hidden w-px bg-white/5 lg:block" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-28 -top-24 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-24 -right-28 h-[480px] w-[480px] rounded-full bg-black/20 blur-3xl" />
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-8 py-16 sm:px-12 sm:py-20 lg:px-16 xl:px-20">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Colonne marque — tons hero + cadrillage léger (comme section Pourquoi) */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `
              linear-gradient(to right, rgb(255 255 255 / 0.07) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(255 255 255 / 0.07) 1px, transparent 1px)
            `,
                  backgroundSize: "44px 44px",
                  maskImage: "radial-gradient(ellipse 75% 65% at 50% 42%, black 18%, transparent 72%)",
                  WebkitMaskImage:
                    "radial-gradient(ellipse 75% 65% at 50% 42%, black 18%, transparent 72%)",
                }}
              />
            </div>

            <div className="relative z-10 space-y-8">
            <div className="relative isolate">
              {/* Hauteur = celle du h1 : le bas du filigrane m. est aligné sur le bas de « modelisys » */}
              <div className="relative">
                <div
                  aria-hidden
                  className="pointer-events-none absolute bottom-0 -left-3 select-none text-[clamp(7rem,32vw,13.75rem)] font-semibold leading-none tracking-tight text-white/[0.055] sm:-left-4 sm:text-[clamp(8.5rem,28vw,14rem)]"
                >
                  m<span className="text-[#E0742D]/35">.</span>
                </div>
                <h1 className="relative z-10 text-5xl font-semibold leading-[0.95] tracking-tight text-[#E6D6C3] sm:text-6xl">
                  modelisys<span className="text-[#E0742D]">.</span>
                </h1>
              </div>
              <p className="relative z-10 mt-4 text-base font-medium text-[#C9B8A5]/85 sm:text-lg">
                Mon Portail
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-5 py-3 text-base font-medium text-slate-200">
              <LogIn className="h-5 w-5 text-[#E0742D]" />
              <span>Accès sécurisé à votre espace</span>
            </div>

            <p className="max-w-md text-sm leading-relaxed text-[#C9B8A5]/80 sm:text-base">
              Dirigeants, équipes financières, opérationnel ou partenaires : un même espace pour suivre analyses,
              indicateurs et tableaux de bord, tous calés sur une base unique et fidèle à vos données comptables.
            </p>

            <div className="h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-white/15 to-transparent" />
            </div>
          </div>

          {/* Formulaire — même langage visuel que la carte « Fonctionnalités » du hero */}
          <div className="w-full max-w-md lg:ml-auto lg:mr-0">
            <div className="relative mx-auto w-full">
              <div className="absolute inset-0 -z-20 rounded-[44px] bg-black/45 blur-2xl" />

              <div className="absolute inset-0 -z-10 rounded-[44px] p-[1px] wow-border">
                <div className="h-full min-h-full w-full rounded-[43px] bg-[#141823]" />
              </div>

              <div className="relative overflow-hidden rounded-[42px] border-2 border-[#E6D6C3]/55 bg-[#141823] shadow-2xl">
                <div className="pointer-events-none absolute inset-0 opacity-70 wow-shimmer" />
                <div className="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-overlay wow-noise" />

                <div className="pointer-events-none absolute inset-0 rounded-[42px] ring-1 ring-[#E6D6C3]/30" />
                <div className="pointer-events-none absolute inset-0 rounded-[42px] ring-1 ring-[#E6B08C]/15" />
                <div className="pointer-events-none absolute inset-0 rounded-[42px] bg-gradient-to-br from-[#E6D6C3]/10 via-transparent to-[#E6B08C]/12" />

                <div className="relative px-5 py-6 sm:px-6 sm:py-7">
                  <div className="text-center">
                    <p className="text-xs font-semibold tracking-wide text-[#E6D6C3]/95">Connexion</p>
                    <p className="mt-1 text-[10px] text-[#C9B8A5]/70">Identifiants professionnels</p>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-3 sm:p-4">
                    <div className="relative">
                      <div className="pointer-events-none absolute left-[18px] top-2 bottom-2 w-px bg-gradient-to-b from-[#E6D6C3]/35 via-white/10 to-[#E6B08C]/30" />

                      <form onSubmit={handleSubmit} className="space-y-5 pl-7">
                        {error && (
                          <div className="rounded-xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                            {error}
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-[11px] font-medium tracking-wide text-[#E6D6C3]/90">
                            Email
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="vous@entreprise.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="h-11 border-white/10 bg-white/[0.06] text-[13px] text-[#E6D6C3] placeholder:text-[#C9B8A5]/45 focus-visible:border-[#E0742D]/55 focus-visible:ring-[#E0742D]/25"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password" className="text-[11px] font-medium tracking-wide text-[#E6D6C3]/90">
                            Mot de passe
                          </Label>
                          <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="h-11 border-white/10 bg-white/[0.06] text-[13px] text-[#E6D6C3] placeholder:text-[#C9B8A5]/45 focus-visible:border-[#E0742D]/55 focus-visible:ring-[#E0742D]/25"
                          />
                        </div>
                        <div className="flex flex-col gap-3 text-[11px] sm:flex-row sm:items-center sm:justify-between">
                          <label className="flex cursor-pointer items-center gap-2 text-[#C9B8A5]/80">
                            <input
                              type="checkbox"
                              className="rounded border-white/20 bg-white/[0.04] text-[#E0742D] focus:ring-[#E0742D]/40"
                            />
                            <span>Se souvenir de moi</span>
                          </label>
                          <Link
                            href="/forgot-password"
                            className="text-xs font-semibold tracking-wide text-slate-200 transition hover:text-slate-100"
                          >
                            Mot de passe oublié ?
                          </Link>
                        </div>
                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="h-11 w-full bg-[#E0742D] text-[13px] font-semibold text-white shadow-lg shadow-[#E0742D]/20 transition hover:bg-[#c96526] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isLoading ? "Connexion…" : "Se connecter"}
                        </Button>
                      </form>
                    </div>
                  </div>

                  <p className="mt-5 text-center text-[11px] text-[#C9B8A5]/75">
                    Pas encore de compte ?{" "}
                    <Link
                      href="/"
                      className="text-xs font-semibold tracking-wide text-slate-200 transition hover:text-slate-100"
                    >
                      Contactez-nous
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-200 transition hover:text-slate-100"
              >
                <ArrowRight className="h-4 w-4 rotate-180 text-[#E0742D]" />
                Retour à l&apos;accueil
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .wow-border {
          background: conic-gradient(
            from 120deg,
            rgba(230, 214, 195, 0.9),
            rgba(230, 176, 140, 0.9),
            rgba(255, 255, 255, 0.25),
            rgba(230, 214, 195, 0.9)
          );
          filter: drop-shadow(0 18px 55px rgba(0, 0, 0, 0.45));
          animation: loginWowSpin 10s linear infinite;
        }

        .wow-shimmer {
          background: radial-gradient(700px 300px at 20% 15%, rgba(230, 214, 195, 0.16), transparent 60%),
            radial-gradient(500px 240px at 85% 40%, rgba(230, 176, 140, 0.12), transparent 55%),
            linear-gradient(115deg, transparent 0%, rgba(255, 255, 255, 0.06) 35%, transparent 70%);
          transform: translateX(-22%);
          animation: loginWowShimmer 6s ease-in-out infinite;
        }

        .wow-noise {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E");
          background-size: 160px 160px;
        }

        @keyframes loginWowSpin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes loginWowShimmer {
          0% {
            transform: translateX(-24%);
            opacity: 0.55;
          }
          50% {
            transform: translateX(12%);
            opacity: 0.85;
          }
          100% {
            transform: translateX(-24%);
            opacity: 0.55;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .wow-border,
          .wow-shimmer {
            animation: none !important;
            transform: none !important;
          }
          .wow-shimmer {
            opacity: 0.65;
          }
        }
      `}</style>
    </div>
  )
}
